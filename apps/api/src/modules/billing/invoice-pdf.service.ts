import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import {
  billingPolicy,
  brand,
  formatCurrency,
  formatDate,
  invoiceStatusMeta,
} from '@stormfiber/config';
import { toNumber } from '../../common/utils/money';
import type { InvoiceRow } from './invoices.service';

const PAGE_MARGIN = 48;
const INK = '#18181b';
const MUTED = '#71717a';
const RULE = '#e4e4e7';
const ACCENT = '#0f172a';

/** Column x-offsets for the line-item table, measured from the page margin. */
const COLUMNS = { description: 0, quantity: 300, unitPrice: 350, tax: 430, amount: 500 };

/**
 * Renders an invoice as a PDF.
 *
 * The document is drawn from the persisted invoice rows, never recomputed, so a downloaded PDF is
 * always the bill that was issued even if the tariff has since changed. Rendering happens on
 * demand rather than at generation time — there is no stored copy that can go stale, and no file
 * to clean up if an invoice is later cancelled.
 */
@Injectable()
export class InvoicePdfService {
  async render(invoice: InvoiceRow): Promise<Buffer> {
    const doc = new PDFDocument({
      size: 'A4',
      margin: PAGE_MARGIN,
      info: {
        Title: `Invoice ${invoice.invoiceNumber}`,
        Author: brand.legalName,
        Subject: `${brand.name} invoice for ${formatDate(invoice.billingPeriodStart, 'long')}`,
      },
    });

    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));

    const completed = new Promise<Buffer>((resolve, reject) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
    });

    this.drawHeader(doc, invoice);
    this.drawParties(doc, invoice);
    this.drawItems(doc, invoice);
    this.drawTotals(doc, invoice);
    this.drawFooter(doc, invoice);

    doc.end();

    return completed;
  }

  private get width(): number {
    // A4 width in points, less both margins.
    return 595.28 - PAGE_MARGIN * 2;
  }

  private drawHeader(doc: PDFKit.PDFDocument, invoice: InvoiceRow): void {
    doc
      .fillColor(ACCENT)
      .fontSize(20)
      .font('Helvetica-Bold')
      .text(brand.name, PAGE_MARGIN, PAGE_MARGIN);

    doc
      .fillColor(MUTED)
      .fontSize(9)
      .font('Helvetica')
      .text(brand.legalName)
      .text(`${brand.supportPhoneDisplay} · ${brand.supportEmail}`);

    const right = PAGE_MARGIN + this.width - 200;

    doc
      .fillColor(INK)
      .fontSize(16)
      .font('Helvetica-Bold')
      .text('INVOICE', right, PAGE_MARGIN, { width: 200, align: 'right' });

    doc
      .fontSize(10)
      .font('Helvetica')
      .text(invoice.invoiceNumber, right, doc.y, { width: 200, align: 'right' })
      .fillColor(MUTED)
      .fontSize(9)
      .text(invoiceStatusMeta[invoice.status].label.toUpperCase(), right, doc.y, {
        width: 200,
        align: 'right',
      });

    doc.moveDown(1.5);
    this.rule(doc);
  }

  private drawParties(doc: PDFKit.PDFDocument, invoice: InvoiceRow): void {
    const top = doc.y + 16;
    const columnWidth = this.width / 2 - 12;

    doc
      .fillColor(MUTED)
      .fontSize(8)
      .font('Helvetica-Bold')
      .text('BILLED TO', PAGE_MARGIN, top);

    doc
      .fillColor(INK)
      .fontSize(11)
      .font('Helvetica-Bold')
      .text(`${invoice.customer.firstName} ${invoice.customer.lastName}`, {
        width: columnWidth,
      });

    const right = PAGE_MARGIN + this.width / 2 + 12;

    doc
      .fillColor(MUTED)
      .fontSize(8)
      .font('Helvetica-Bold')
      .text('BILLING PERIOD', right, top);

    doc
      .fillColor(INK)
      .fontSize(10)
      .font('Helvetica')
      .text(
        `${formatDate(invoice.billingPeriodStart, 'medium')} — ${formatDate(invoice.billingPeriodEnd, 'medium')}`,
        right,
        doc.y,
        { width: columnWidth },
      );

    doc
      .fillColor(MUTED)
      .fontSize(8)
      .font('Helvetica-Bold')
      .text('PAYMENT DUE', right, doc.y + 8);

    doc
      .fillColor(INK)
      .fontSize(10)
      .font('Helvetica')
      .text(formatDate(invoice.dueDate, 'long'), right, doc.y, { width: columnWidth });

    doc.moveDown(2);
  }

  private drawItems(doc: PDFKit.PDFDocument, invoice: InvoiceRow): void {
    const headerY = doc.y + 8;

    doc.fillColor(MUTED).fontSize(8).font('Helvetica-Bold');
    doc.text('DESCRIPTION', PAGE_MARGIN + COLUMNS.description, headerY);
    doc.text('QTY', PAGE_MARGIN + COLUMNS.quantity, headerY, { width: 40, align: 'right' });
    doc.text('RATE', PAGE_MARGIN + COLUMNS.unitPrice, headerY, { width: 70, align: 'right' });
    doc.text('TAX', PAGE_MARGIN + COLUMNS.tax, headerY, { width: 60, align: 'right' });
    doc.text('AMOUNT', PAGE_MARGIN + COLUMNS.amount, headerY, { width: 60, align: 'right' });

    doc.y = headerY + 14;
    this.rule(doc);

    for (const item of invoice.items) {
      const y = doc.y + 8;

      // Keeps a long invoice readable rather than letting rows run off the page.
      if (y > 700) {
        doc.addPage();
        doc.y = PAGE_MARGIN;
      }

      const rowY = doc.y + 8;

      doc.fillColor(INK).fontSize(10).font('Helvetica');
      doc.text(item.description, PAGE_MARGIN + COLUMNS.description, rowY, { width: 280 });

      const lineHeight = doc.y;

      doc.text(String(item.quantity), PAGE_MARGIN + COLUMNS.quantity, rowY, {
        width: 40,
        align: 'right',
      });
      doc.text(this.amount(item.unitPrice, invoice.currency), PAGE_MARGIN + COLUMNS.unitPrice, rowY, {
        width: 70,
        align: 'right',
      });
      doc.text(this.amount(item.taxAmount, invoice.currency), PAGE_MARGIN + COLUMNS.tax, rowY, {
        width: 60,
        align: 'right',
      });
      doc.text(this.amount(item.amount, invoice.currency), PAGE_MARGIN + COLUMNS.amount, rowY, {
        width: 60,
        align: 'right',
      });

      doc.y = Math.max(lineHeight, rowY + 14);
      this.rule(doc);
    }
  }

  private drawTotals(doc: PDFKit.PDFDocument, invoice: InvoiceRow): void {
    const labelX = PAGE_MARGIN + COLUMNS.tax - 60;
    const valueX = PAGE_MARGIN + COLUMNS.amount;
    const amountDue = toNumber(invoice.total) - toNumber(invoice.amountPaid);

    const rows: { label: string; value: string; strong?: boolean }[] = [
      { label: 'Subtotal', value: this.amount(invoice.subtotal, invoice.currency) },
      ...(toNumber(invoice.discountTotal) > 0
        ? [
            {
              label: 'Discount',
              value: `-${this.amount(invoice.discountTotal, invoice.currency)}`,
            },
          ]
        : []),
      { label: 'Tax', value: this.amount(invoice.taxTotal, invoice.currency) },
      { label: 'Total', value: this.amount(invoice.total, invoice.currency), strong: true },
      ...(toNumber(invoice.amountPaid) > 0
        ? [{ label: 'Paid', value: this.amount(invoice.amountPaid, invoice.currency) }]
        : []),
      {
        label: 'Amount due',
        value: formatCurrency(Math.max(amountDue, 0), {
          currency: invoice.currency,
          withDecimals: true,
        }),
        strong: true,
      },
    ];

    doc.moveDown(0.5);

    for (const row of rows) {
      const y = doc.y + 6;

      doc
        .fillColor(row.strong ? INK : MUTED)
        .fontSize(row.strong ? 11 : 10)
        .font(row.strong ? 'Helvetica-Bold' : 'Helvetica')
        .text(row.label, labelX, y, { width: 120, align: 'right' })
        .text(row.value, valueX, y, { width: 60, align: 'right' });

      doc.y = y + (row.strong ? 16 : 14);
    }
  }

  private drawFooter(doc: PDFKit.PDFDocument, invoice: InvoiceRow): void {
    doc.y = Math.max(doc.y + 24, 700);
    this.rule(doc);

    doc
      .fillColor(MUTED)
      .fontSize(8.5)
      .font('Helvetica')
      .text(
        `Payment is due by the ${this.ordinal(billingPolicy.dueDayOfMonth)} of the month. Services may be suspended ${billingPolicy.suspensionAfterDays} days after the due date if the balance remains unpaid.`,
        PAGE_MARGIN,
        doc.y + 10,
        { width: this.width },
      )
      .moveDown(0.5)
      .text(
        `Questions about this invoice? Call ${brand.supportPhoneDisplay} or email ${brand.supportEmail} quoting ${invoice.invoiceNumber}.`,
        { width: this.width },
      );

    if (invoice.notes) {
      doc.moveDown(0.5).fillColor(INK).text(invoice.notes, { width: this.width });
    }
  }

  private rule(doc: PDFKit.PDFDocument): void {
    doc
      .strokeColor(RULE)
      .lineWidth(0.75)
      .moveTo(PAGE_MARGIN, doc.y)
      .lineTo(PAGE_MARGIN + this.width, doc.y)
      .stroke();
  }

  private amount(value: Parameters<typeof toNumber>[0], currency: string): string {
    return formatCurrency(toNumber(value), { currency, withDecimals: true });
  }

  private ordinal(day: number): string {
    const suffix =
      day % 10 === 1 && day !== 11
        ? 'st'
        : day % 10 === 2 && day !== 12
          ? 'nd'
          : day % 10 === 3 && day !== 13
            ? 'rd'
            : 'th';
    return `${day}${suffix}`;
  }
}
