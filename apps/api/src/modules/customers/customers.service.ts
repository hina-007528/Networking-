import { Inject, Injectable, Logger } from '@nestjs/common';
import { hash } from 'bcryptjs';
import { CustomerStatus, type Prisma } from '@prisma/client';
import type { CustomerDto, Paginated } from '@stormfiber/types';
import { RoleName as Role } from '@stormfiber/types';
import { SERVICE_CITY, SERVICE_CITY_SLUG } from '@stormfiber/config';
import type {
  adminCustomerListQuerySchema,
  createCustomerSchema,
  updateCustomerSchema,
  updateOwnProfileSchema,
} from '@stormfiber/validation';
import type { z } from 'zod';
import { AuditAction, AuditService } from '../../common/audit/audit.service';
import { APP_CONFIG, type AppConfig } from '../../config/configuration';
import type { RequestContext } from '../../common/decorators/auth.decorators';
import { AppException } from '../../common/errors/app.exception';
import { type Db, PrismaService } from '../../common/prisma/prisma.service';
import { SequenceService } from '../../common/sequence/sequence.service';
import { buildOrderBy, buildPaginationMeta, toPrismaPagination } from '../../common/utils/pagination';
import { accountNumber } from '../../common/utils/references';
import { toNumber } from '../../common/utils/money';
import { AuthService } from '../auth/auth.service';

export type AdminCustomerListQuery = z.output<typeof adminCustomerListQuerySchema>;

export type CreateCustomerPayload = z.output<typeof createCustomerSchema>;
export type UpdateCustomerPayload = z.output<typeof updateCustomerSchema>;
export type UpdateOwnProfilePayload = z.output<typeof updateOwnProfileSchema>;

export const customerInclude = {
  city: { select: { name: true } },
  area: { select: { name: true } },
} satisfies Prisma.CustomerInclude;

export type CustomerRow = Prisma.CustomerGetPayload<{ include: typeof customerInclude }>;

const ACCOUNT_SEQUENCE_KEY = 'customer.account_sequence';

/** Everything the caller needs to invite a newly provisioned account, sent after the commit. */
export interface CustomerProvisionResult {
  id: string;
  userId: string;
  accountNumber: string;
  invite: { email: string; firstName: string; inviteUrl: string } | null;
}

/**
 * Customer records.
 *
 * A customer is created the moment an application is approved, which is what gives the applicant
 * something to sign into before the engineer has visited. The `User` login is provisioned by the
 * auth module; the two are linked by `Customer.userId`.
 */
@Injectable()
export class CustomersService {
  private readonly logger = new Logger(CustomersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auth: AuthService,
    private readonly sequence: SequenceService,
    private readonly audit: AuditService,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  /** Reserves the next sequential account number. */
  async nextAccountNumber(db: Db = this.prisma): Promise<string> {
    const next = await this.sequence.next(ACCOUNT_SEQUENCE_KEY, {
      start: 1000,
      description: 'Monotonic counter behind customer account numbers',
      db,
    });

    return accountNumber(next);
  }

  /**
   * Creates the customer record for an approved application, or returns the existing one.
   *
   * Runs inside the caller's transaction so provisioning a subscription and creating the customer
   * either both happen or neither does. When the applicant has no login yet one is created with an
   * invite link, which the caller sends once the transaction has committed.
   */
  async ensureFromApplication(db: Db, applicationId: string): Promise<CustomerProvisionResult> {
    const application = await db.application.findUnique({
      where: { id: applicationId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        mobile: true,
        cnicLast4: true,
        cityId: true,
        areaId: true,
        subAreaId: true,
        addressLine: true,
        customerId: true,
      },
    });

    if (!application) {
      throw AppException.notFound('Application');
    }

    if (application.customerId) {
      const existing = await db.customer.findUnique({
        where: { id: application.customerId },
        select: { id: true, userId: true, accountNumber: true },
      });
      if (existing) return { ...existing, invite: null };
    }

    // An applicant who already has a customer record is matched on mobile number.
    const byMobile = await db.customer.findFirst({
      where: { mobile: application.mobile },
      select: { id: true, userId: true, accountNumber: true },
    });

    if (byMobile) {
      await db.application.update({
        where: { id: application.id },
        data: { customerId: byMobile.id },
      });
      return { ...byMobile, invite: null };
    }

    const account = await this.auth.ensureApplicantAccount(db, {
      firstName: application.firstName,
      lastName: application.lastName,
      email: application.email,
      mobile: application.mobile,
    });

    const created = await db.customer.create({
      data: {
        userId: account.userId,
        accountNumber: await this.nextAccountNumber(db),
        firstName: application.firstName,
        lastName: application.lastName,
        email: application.email,
        mobile: application.mobile,
        cnicLast4: application.cnicLast4,
        status: CustomerStatus.PROSPECT,
        cityId: application.cityId,
        areaId: application.areaId,
        subAreaId: application.subAreaId,
        addressLine: application.addressLine,
      },
      select: { id: true, userId: true, accountNumber: true },
    });

    await db.customerAddress.create({
      data: {
        customerId: created.id,
        label: 'Installation address',
        addressLine: application.addressLine,
        cityId: application.cityId,
        areaId: application.areaId,
        subAreaId: application.subAreaId,
        isPrimary: true,
        isBilling: true,
      },
    });

    await db.application.update({
      where: { id: application.id },
      data: { customerId: created.id },
    });

    this.logger.log(`Created customer ${created.accountNumber} from application ${application.id}`);

    return {
      id: created.id,
      userId: created.userId,
      accountNumber: created.accountNumber,
      invite: account.inviteUrl
        ? {
            email: application.email,
            firstName: application.firstName,
            inviteUrl: account.inviteUrl,
          }
        : null,
    };
  }

  async findById(id: string): Promise<CustomerDto> {
    const row = await this.prisma.customer.findUnique({ where: { id }, include: customerInclude });

    if (!row) {
      throw AppException.notFound('Customer');
    }

    return this.toDto(row);
  }

  async list(query: AdminCustomerListQuery): Promise<Paginated<CustomerDto>> {
    const { skip, take } = toPrismaPagination(query);
    const search = query.search?.trim();
    const where: Prisma.CustomerWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.cityId ? { cityId: query.cityId } : {}),
      ...(query.planId ? { subscriptions: { some: { planId: query.planId } } } : {}),
      ...(query.hasOutstanding ? { balance: { gt: 0 } } : {}),
      ...(search
        ? {
            OR: [
              { firstName: { contains: search, mode: 'insensitive' } },
              { lastName: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
              { mobile: { contains: search } },
              { accountNumber: { contains: search } },
            ],
          }
        : {}),
    };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.customer.findMany({
        where,
        include: customerInclude,
        orderBy: buildOrderBy(query.sort, query.order, ['createdAt', 'updatedAt', 'lastName', 'balance'], 'createdAt'),
        skip,
        take,
      }),
      this.prisma.customer.count({ where }),
    ]);

    return {
      items: rows.map((row) => this.toDto(row)),
      pagination: buildPaginationMeta(query, total),
    };
  }

  /**
   * Self-service profile update.
   *
   * Deliberately narrower than the admin update: a customer may correct their contact details but
   * cannot change their own status, city or service address, because those drive billing and
   * installation.
   */
  async updateOwnProfile(
    customerId: string,
    input: UpdateOwnProfilePayload,
    context: RequestContext,
  ): Promise<CustomerDto> {
    const before = await this.prisma.customer.findUnique({
      where: { id: customerId },
      select: { email: true, alternatePhone: true, addressLine: true, userId: true },
    });

    if (!before) {
      throw AppException.notFound('Customer');
    }

    const updated = await this.prisma.customer.update({
      where: { id: customerId },
      data: {
        ...(input.email === undefined ? {} : { email: input.email }),
        ...(input.alternatePhone === undefined ? {} : { alternatePhone: input.alternatePhone }),
        ...(input.addressLine === undefined ? {} : { addressLine: input.addressLine }),
      },
      include: customerInclude,
    });

    await this.audit.record({
      userId: before.userId,
      action: AuditAction.CUSTOMER_UPDATED,
      entity: 'Customer',
      entityId: customerId,
      oldValue: before,
      newValue: input,
      context,
    });

    return this.toDto(updated);
  }

  async adminCreate(
    input: CreateCustomerPayload,
    actorId: string,
    context: RequestContext,
  ): Promise<CustomerDto> {
    const email = input.email.toLowerCase();
    const clash = await this.prisma.user.findFirst({
      where: { OR: [{ email }, { mobile: input.mobile }], deletedAt: null },
      select: { email: true, mobile: true },
    });
    if (clash) {
      throw AppException.validation([
        clash.email === email
          ? { field: 'email', code: 'taken', message: 'An account already uses this email address' }
          : { field: 'mobile', code: 'taken', message: 'An account already uses this mobile number' },
      ]);
    }

    const city = await this.prisma.city.findFirst({
      where: { slug: SERVICE_CITY_SLUG, deletedAt: null },
      select: { id: true },
    });
    if (!city) {
      throw AppException.of('OUTSIDE_SERVICE_CITY', `${SERVICE_CITY} is not configured`, 422);
    }

    const customerRole = await this.prisma.role.findUnique({
      where: { name: Role.CUSTOMER },
      select: { id: true },
    });
    if (!customerRole) {
      throw AppException.of('INTERNAL_ERROR', 'Customer role is not provisioned', 503);
    }

    const user = await this.prisma.user.create({
      data: {
        email,
        mobile: input.mobile,
        passwordHash: await hash(input.password, this.config.auth.bcryptRounds),
        firstName: input.firstName,
        lastName: input.lastName,
        status: 'ACTIVE',
        mobileVerifiedAt: new Date(),
        roles: { create: { roleId: customerRole.id } },
      },
      select: { id: true },
    });

    const account = await this.nextAccountNumber();
    const created = await this.prisma.customer.create({
      data: {
        userId: user.id,
        accountNumber: account,
        firstName: input.firstName,
        lastName: input.lastName,
        email,
        mobile: input.mobile,
        status: input.status,
        cityId: city.id,
        addressLine: input.addressLine,
        ...(input.status === CustomerStatus.ACTIVE ? { activatedAt: new Date() } : {}),
      },
      include: customerInclude,
    });

    await this.audit.record({
      userId: actorId,
      action: AuditAction.USER_CREATED,
      entity: 'Customer',
      entityId: created.id,
      newValue: { email, mobile: input.mobile, source: 'admin' },
      context,
    });

    return this.toDto(created);
  }

  async adminDelete(customerId: string, actorId: string, context: RequestContext): Promise<void> {
    const existing = await this.prisma.customer.findUnique({
      where: { id: customerId },
      select: { id: true, userId: true, email: true },
    });
    if (!existing) {
      throw AppException.notFound('Customer');
    }

    await this.prisma.user.delete({ where: { id: existing.userId } });
    await this.audit.record({
      userId: actorId,
      action: AuditAction.CUSTOMER_UPDATED,
      entity: 'Customer',
      entityId: customerId,
      oldValue: { email: existing.email },
      newValue: { deleted: true },
      context,
    });
  }

  /** Admin update. Status changes are recorded with their own audit action. */
  async adminUpdate(
    customerId: string,
    input: UpdateCustomerPayload,
    actorId: string,
    context: RequestContext,
  ): Promise<CustomerDto> {
    const before = await this.prisma.customer.findUnique({
      where: { id: customerId },
      include: customerInclude,
    });

    if (!before) {
      throw AppException.notFound('Customer');
    }

    const updated = await this.prisma.customer.update({
      where: { id: customerId },
      data: {
        ...(input.firstName === undefined ? {} : { firstName: input.firstName }),
        ...(input.lastName === undefined ? {} : { lastName: input.lastName }),
        ...(input.email === undefined ? {} : { email: input.email }),
        ...(input.mobile === undefined ? {} : { mobile: input.mobile }),
        ...(input.alternatePhone === undefined ? {} : { alternatePhone: input.alternatePhone }),
        ...(input.cityId === undefined ? {} : { cityId: input.cityId }),
        ...(input.areaId === undefined ? {} : { areaId: input.areaId }),
        ...(input.subAreaId === undefined ? {} : { subAreaId: input.subAreaId }),
        ...(input.addressLine === undefined ? {} : { addressLine: input.addressLine }),
        ...(input.status === undefined
          ? {}
          : {
              status: input.status,
              ...(input.status === CustomerStatus.ACTIVE && !before.activatedAt
                ? { activatedAt: new Date() }
                : {}),
              ...(input.status === CustomerStatus.CHURNED ? { churnedAt: new Date() } : {}),
            }),
      },
      include: customerInclude,
    });

    const statusChanged = input.status !== undefined && input.status !== before.status;

    await this.audit.record({
      userId: actorId,
      action: statusChanged
        ? input.status === CustomerStatus.SUSPENDED
          ? AuditAction.CUSTOMER_SUSPENDED
          : input.status === CustomerStatus.ACTIVE
            ? AuditAction.CUSTOMER_ACTIVATED
            : AuditAction.CUSTOMER_UPDATED
        : AuditAction.CUSTOMER_UPDATED,
      entity: 'Customer',
      entityId: customerId,
      oldValue: { status: before.status, email: before.email, mobile: before.mobile },
      newValue: input,
      context,
    });

    return this.toDto(updated);
  }

  /**
   * Records the customer's auto-pay preference. Acting on it belongs to the billing run, which
   * reads this flag when an invoice is generated.
   */
  async setAutoPay(customerId: string, enabled: boolean): Promise<CustomerDto> {
    const updated = await this.prisma.customer.update({
      where: { id: customerId },
      data: { autoPayEnabled: enabled },
      include: customerInclude,
    });

    return this.toDto(updated);
  }

  /**
   * Marks a customer active on successful installation. `activatedAt` records the first
   * activation only, so a reactivation after suspension does not rewrite the tenure date.
   */
  async activate(db: Db, customerId: string): Promise<void> {
    const current = await db.customer.findUnique({
      where: { id: customerId },
      select: { activatedAt: true },
    });

    await db.customer.update({
      where: { id: customerId },
      data: {
        status: CustomerStatus.ACTIVE,
        ...(current?.activatedAt ? {} : { activatedAt: new Date() }),
      },
    });
  }

  toDto(row: CustomerRow): CustomerDto {
    return {
      id: row.id,
      accountNumber: row.accountNumber,
      firstName: row.firstName,
      lastName: row.lastName,
      fullName: `${row.firstName} ${row.lastName}`,
      email: row.email,
      mobile: row.mobile,
      alternatePhone: row.alternatePhone,
      status: row.status,
      cityId: row.cityId,
      cityName: row.city.name,
      areaId: row.areaId,
      areaName: row.area?.name ?? null,
      subAreaId: row.subAreaId,
      addressLine: row.addressLine,
      balance: toNumber(row.balance),
      currency: row.currency,
      activatedAt: row.activatedAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
