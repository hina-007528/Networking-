import { HttpStatus, Injectable } from '@nestjs/common';
import { DiscountKind, type Prisma, TaxKind, TaxTarget } from '@prisma/client';
import type { PriceBreakdownLine, PriceQuoteDto } from '@stormfiber/types';
import { AppException } from '../../common/errors/app.exception';
import { PrismaService } from '../../common/prisma/prisma.service';
import { money, percentOf, roundMoney, sum, toNumber, ZERO, type Money } from '../../common/utils/money';

export interface QuoteRequest {
  planId: string;
  cityId: string;
  addonIds: string[];
  promotionCode?: string;
  includeInstallation: boolean;
}

interface EffectiveTax {
  code: string;
  label: string;
  kind: TaxKind;
  /** Percentage points, already resolved against any city override. */
  rate: Money;
  fixedAmount: Money;
  appliesTo: TaxTarget[];
}

interface ResolvedPromotion {
  id: string;
  name: string;
  discountKind: DiscountKind;
  discountValue: Money;
}

interface AppliedTax {
  code: string;
  label: string;
  rate: Money;
  amount: Money;
}

/**
 * The single place a price is computed.
 *
 * Nothing in the browser adds, discounts or taxes an amount — the client renders the `lines` this
 * service returns. Every intermediate value is a `Prisma.Decimal`, so totals are exact and match
 * what the invoice will later say.
 *
 * The order of operations is fixed and matches the customer-facing breakdown:
 *
 *   1. base monthly price, resolved for the city
 *   2. plus recurring add-ons
 *   3. minus the promotional discount, applied to the monthly subtotal
 *   4. plus tax, applied per tax rule to the targets that rule covers
 *   5. plus one-off installation and add-on setup charges, for the amount due today
 */
@Injectable()
export class PricingService {
  constructor(private readonly prisma: PrismaService) {}

  async quote(request: QuoteRequest): Promise<PriceQuoteDto> {
    const plan = await this.prisma.plan.findFirst({
      where: { id: request.planId, status: 'PUBLISHED', deletedAt: null },
      select: {
        id: true,
        name: true,
        currency: true,
        monthlyPrice: true,
        installationPrice: true,
        promotionId: true,
      },
    });

    if (!plan) {
      throw AppException.notFound('Plan');
    }

    const city = await this.prisma.city.findFirst({
      where: { id: request.cityId, isActive: true, deletedAt: null },
      select: { id: true, name: true },
    });

    if (!city) {
      throw AppException.notFound('City');
    }

    const cityPrice = await this.prisma.planPrice.findFirst({
      where: { planId: plan.id, cityId: city.id, isActive: true },
      select: { monthlyPrice: true, installationPrice: true, currency: true },
    });

    if (!cityPrice) {
      throw AppException.of(
        'PLAN_UNAVAILABLE_IN_CITY',
        `${plan.name} is not currently sold in ${city.name}`,
        HttpStatus.CONFLICT,
      );
    }

    const currency = cityPrice.currency ?? plan.currency;
    const basePrice = money(cityPrice.monthlyPrice);
    const installationPrice = request.includeInstallation
      ? money(cityPrice.installationPrice)
      : ZERO();

    const addons = await this.resolveAddons(plan.id, request.addonIds);
    const addonsMonthly = sum(addons.map((addon) => money(addon.monthlyPrice)));
    const addonsOneTime = sum(addons.map((addon) => money(addon.oneTimePrice)));

    const monthlySubtotal = roundMoney(basePrice.plus(addonsMonthly));

    const promotion = await this.resolvePromotion(plan.promotionId, request.promotionCode);
    const discountTotal = this.computeDiscount(monthlySubtotal, promotion);

    const taxableAmount = roundMoney(monthlySubtotal.minus(discountTotal));
    const taxes = await this.loadEffectiveTaxes(city.id);

    // Recurring tax is charged on the discounted subscription and add-on amounts.
    const recurringTaxes = this.applyTaxes(taxes, [
      { target: TaxTarget.SUBSCRIPTION, amount: this.shareOf(taxableAmount, basePrice, monthlySubtotal) },
      { target: TaxTarget.ADDON, amount: this.shareOf(taxableAmount, addonsMonthly, monthlySubtotal) },
    ]);

    const oneTimeBase = roundMoney(installationPrice.plus(addonsOneTime));
    const installationTaxes = this.applyTaxes(
      taxes,
      [{ target: TaxTarget.INSTALLATION, amount: oneTimeBase }],
      { suffix: 'INSTALL', labelSuffix: 'on installation', skipFixed: true },
    );

    const taxTotal = sum(recurringTaxes.map((tax) => tax.amount));
    const installationTaxTotal = sum(installationTaxes.map((tax) => tax.amount));

    const monthlyTotal = roundMoney(taxableAmount.plus(taxTotal));
    const dueNowTotal = roundMoney(monthlyTotal.plus(oneTimeBase).plus(installationTaxTotal));

    const lines = this.buildLines({
      planName: plan.name,
      basePrice,
      addons,
      discountTotal,
      promotion,
      recurringTaxes,
      installationPrice,
      installationTaxes,
    });

    return {
      planId: plan.id,
      planName: plan.name,
      cityId: city.id,
      cityName: city.name,
      currency,
      basePrice: toNumber(basePrice),
      addonsTotal: toNumber(addonsMonthly),
      discountTotal: toNumber(discountTotal),
      taxableAmount: toNumber(taxableAmount),
      taxTotal: toNumber(taxTotal),
      installationPrice: toNumber(installationPrice),
      monthlyTotal: toNumber(monthlyTotal),
      dueNowTotal: toNumber(dueNowTotal),
      lines,
      appliedPromotion: promotion
        ? {
            id: promotion.id,
            name: promotion.name,
            discountKind: promotion.discountKind,
            discountValue: toNumber(promotion.discountValue),
          }
        : null,
      appliedTaxes: [...recurringTaxes, ...installationTaxes].map((tax) => ({
        code: tax.code,
        label: tax.label,
        rate: toNumber(tax.rate),
        amount: toNumber(tax.amount),
      })),
      quotedAt: new Date().toISOString(),
    };
  }

  /**
   * Only add-ons explicitly linked to the plan are priceable. A caller passing an unrelated
   * add-on id gets a validation error rather than a silently cheaper quote.
   */
  private async resolveAddons(
    planId: string,
    addonIds: string[],
  ): Promise<{ id: string; name: string; monthlyPrice: Prisma.Decimal; oneTimePrice: Prisma.Decimal }[]> {
    const unique = [...new Set(addonIds)];
    if (unique.length === 0) return [];

    const links = await this.prisma.planAddonLink.findMany({
      where: { planId, addonId: { in: unique }, addon: { isActive: true, deletedAt: null } },
      select: {
        addon: { select: { id: true, name: true, monthlyPrice: true, oneTimePrice: true } },
      },
    });

    if (links.length !== unique.length) {
      const found = new Set(links.map((link) => link.addon.id));
      const missing = unique.filter((id) => !found.has(id));
      throw AppException.badRequest(
        'One or more selected add-ons are not available with this plan',
        missing.map((id) => ({ field: 'addonIds', code: 'UNAVAILABLE', message: id })),
      );
    }

    return links.map((link) => link.addon);
  }

  /**
   * A promotion applies when it is published and inside its window. An explicit code always wins
   * over the plan's default promotion, which is how a campaign code can beat the standing offer.
   */
  private async resolvePromotion(
    planPromotionId: string | null,
    code: string | undefined,
  ): Promise<ResolvedPromotion | null> {
    const now = new Date();
    const activeWindow: Prisma.PromotionWhereInput = {
      status: 'PUBLISHED',
      deletedAt: null,
      AND: [
        { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
        { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
      ],
    };

    if (code) {
      const byCode = await this.prisma.promotion.findFirst({
        where: { ...activeWindow, code: code.toUpperCase() },
        select: { id: true, name: true, discountKind: true, discountValue: true },
      });

      if (!byCode) {
        throw AppException.badRequest('That promotion code is not valid or has expired', [
          { field: 'promotionCode', code: 'INVALID', message: 'Promotion code not recognised' },
        ]);
      }

      return { ...byCode, discountValue: money(byCode.discountValue) };
    }

    if (!planPromotionId) return null;

    const byPlan = await this.prisma.promotion.findFirst({
      where: { ...activeWindow, id: planPromotionId },
      select: { id: true, name: true, discountKind: true, discountValue: true },
    });

    return byPlan ? { ...byPlan, discountValue: money(byPlan.discountValue) } : null;
  }

  /** A discount can reduce the subtotal to zero but never below it. */
  private computeDiscount(subtotal: Money, promotion: ResolvedPromotion | null): Money {
    if (!promotion) return ZERO();

    const raw =
      promotion.discountKind === DiscountKind.PERCENTAGE
        ? percentOf(subtotal, promotion.discountValue)
        : roundMoney(promotion.discountValue);

    return raw.greaterThan(subtotal) ? subtotal : raw;
  }

  /**
   * Splits a discounted total back across its components in proportion to their pre-discount
   * share, so a tax rule that covers only subscriptions is applied to the right slice.
   */
  private shareOf(discountedTotal: Money, component: Money, total: Money): Money {
    if (total.isZero()) return ZERO();
    return roundMoney(discountedTotal.times(component).dividedBy(total));
  }

  private async loadEffectiveTaxes(cityId: string): Promise<EffectiveTax[]> {
    const now = new Date();

    const rules = await this.prisma.taxRule.findMany({
      where: {
        isActive: true,
        AND: [
          { OR: [{ effectiveFrom: null }, { effectiveFrom: { lte: now } }] },
          { OR: [{ effectiveTo: null }, { effectiveTo: { gte: now } }] },
        ],
      },
      select: {
        id: true,
        code: true,
        label: true,
        kind: true,
        rate: true,
        fixedAmount: true,
        appliesTo: true,
        cityRules: { where: { cityId }, select: { rateOverride: true, isActive: true } },
      },
      orderBy: { code: 'asc' },
    });

    const effective: EffectiveTax[] = [];

    for (const rule of rules) {
      const cityRule = rule.cityRules.at(0);

      // A city row that is switched off exempts the city from an otherwise national rule.
      if (cityRule && !cityRule.isActive) continue;

      effective.push({
        code: rule.code,
        label: rule.label,
        kind: rule.kind,
        rate: money(cityRule?.rateOverride ?? rule.rate),
        fixedAmount: money(rule.fixedAmount),
        appliesTo: rule.appliesTo,
      });
    }

    return effective;
  }

  /**
   * Applies each tax rule to the sum of the bases it covers.
   *
   * The installation pass carries a suffix so a rule that covers both recurring and one-off
   * charges produces two distinguishable lines instead of one ambiguous duplicate. `skipFixed`
   * keeps a flat-amount tax from being levied twice in the same quote.
   */
  private applyTaxes(
    taxes: EffectiveTax[],
    bases: { target: TaxTarget; amount: Money }[],
    options: { suffix?: string; labelSuffix?: string; skipFixed?: boolean } = {},
  ): AppliedTax[] {
    const applied: AppliedTax[] = [];

    for (const tax of taxes) {
      if (options.skipFixed && tax.kind === TaxKind.FIXED) continue;

      const applicable = bases.filter((base) => tax.appliesTo.includes(base.target));
      if (applicable.length === 0) continue;

      const base = sum(applicable.map((entry) => entry.amount));
      if (base.isZero()) continue;

      const amount =
        tax.kind === TaxKind.PERCENTAGE ? percentOf(base, tax.rate) : roundMoney(tax.fixedAmount);

      if (amount.isZero()) continue;

      applied.push({
        code: options.suffix ? `${tax.code}_${options.suffix}` : tax.code,
        label: options.labelSuffix ? `${tax.label} (${options.labelSuffix})` : tax.label,
        rate: tax.rate,
        amount,
      });
    }

    return applied;
  }

  private buildLines(input: {
    planName: string;
    basePrice: Money;
    addons: { id: string; name: string; monthlyPrice: Prisma.Decimal; oneTimePrice: Prisma.Decimal }[];
    discountTotal: Money;
    promotion: ResolvedPromotion | null;
    recurringTaxes: AppliedTax[];
    installationPrice: Money;
    installationTaxes: AppliedTax[];
  }): PriceBreakdownLine[] {
    const lines: PriceBreakdownLine[] = [
      {
        label: `${input.planName} monthly`,
        code: 'BASE',
        amount: toNumber(input.basePrice),
        kind: 'BASE',
      },
    ];

    for (const addon of input.addons) {
      const monthly = money(addon.monthlyPrice);
      if (!monthly.isZero()) {
        lines.push({
          label: addon.name,
          code: `ADDON_${addon.id}`,
          amount: toNumber(monthly),
          kind: 'ADDON',
          meta: { addonId: addon.id, recurring: true },
        });
      }

      const oneTime = money(addon.oneTimePrice);
      if (!oneTime.isZero()) {
        lines.push({
          label: `${addon.name} — one-off setup`,
          code: `ADDON_SETUP_${addon.id}`,
          amount: toNumber(oneTime),
          kind: 'ADDON',
          meta: { addonId: addon.id, recurring: false },
        });
      }
    }

    if (!input.discountTotal.isZero()) {
      lines.push({
        label: input.promotion ? `${input.promotion.name} discount` : 'Discount',
        code: 'DISCOUNT',
        // Reductions are negative so a client can sum `lines` and reach the total.
        amount: -toNumber(input.discountTotal),
        kind: 'DISCOUNT',
        meta: input.promotion ? { promotionId: input.promotion.id } : undefined,
      });
    }

    for (const tax of [...input.recurringTaxes, ...input.installationTaxes]) {
      lines.push({
        label: tax.label,
        code: tax.code,
        amount: toNumber(tax.amount),
        kind: 'TAX',
      });
    }

    if (!input.installationPrice.isZero()) {
      lines.push({
        label: 'One-time installation',
        code: 'INSTALLATION',
        amount: toNumber(input.installationPrice),
        kind: 'INSTALLATION',
      });
    }

    return lines;
  }
}
