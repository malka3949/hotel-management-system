import * as path from 'path';
import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Response } from 'express';
import PDFDocument from 'pdfkit';
import { PrismaService } from '../../../prisma/prisma.service';
import { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';

const FONT_PATH = path.join(process.cwd(), 'src/assets/fonts/DejaVuSans.ttf');

function rtl(text: string): string {
  if (!text) return '';
  return text.split('\n').map(line => line.split(' ').reverse().join(' ')).join('\n');
}

type InvoiceWithRelations = Awaited<ReturnType<InvoicePdfService['fetchInvoice']>>;

@Injectable()
export class InvoicePdfService {
  constructor(private prisma: PrismaService) {}

  private async fetchInvoice(invoiceId: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        lineItems: true,
        charges: true,
        payments: { where: { status: 'succeeded' } },
        reservation: {
          include: { guest: { select: { fullName: true, email: true, phone: true } } },
        },
        branch: { select: { name: true, address: true } },
      },
    });
    if (!invoice) throw new NotFoundException('INVOICE_NOT_FOUND');
    return invoice;
  }

  private assertAccess(invoice: { branchId: string }, requester: JwtPayload) {
    if (requester.role !== 'chain_admin' && invoice.branchId !== requester.branchId) {
      throw new ForbiddenException('BRANCH_ACCESS_DENIED');
    }
  }

  private buildDoc(invoice: InvoiceWithRelations): PDFKit.PDFDocument {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const H = FONT_PATH;
    const col = { desc: 50, qty: 310, unit: 370, total: 460 };

    doc.font(H).fontSize(18).text(rtl(invoice.branch.name), { align: 'right' });
    doc.font(H).fontSize(10).text(rtl(invoice.branch.address ?? ''), { align: 'right' });
    doc.moveDown();

    doc.font(H).fontSize(14).text('חשבונית', { align: 'right' });
    doc.font(H).fontSize(10)
      .text(`מספר: ${invoice.id.slice(0, 8).toUpperCase()}`, { align: 'right' })
      .text(`תאריך: ${(invoice.issuedAt ?? invoice.createdAt).toISOString().slice(0, 10)}`, { align: 'right' })
      .text(`סטטוס: ${invoice.status}`, { align: 'right' });
    doc.moveDown();

    const guest = invoice.reservation.guest;
    doc.font(H).fontSize(11).text('פרטי אורח:', { align: 'right' });
    doc.font(H).fontSize(10)
      .text(rtl(guest.fullName), { align: 'right' })
      .text(guest.email ?? '', { align: 'right' })
      .text(guest.phone ?? '', { align: 'right' });
    doc.moveDown();

    doc.font(H).fontSize(10);
    const headerY = doc.y;
    doc.text('תיאור', col.desc, headerY, { width: 240, align: 'right' });
    doc.text('כמות', col.qty, headerY, { width: 50, align: 'right' });
    doc.text('מחיר יחידה', col.unit, headerY, { width: 80, align: 'right' });
    doc.text('סה"כ', col.total, headerY, { width: 70, align: 'right' });
    doc.moveDown(0.3);
    doc.moveTo(50, doc.y).lineTo(540, doc.y).stroke();
    doc.moveDown(0.3);

    for (const item of invoice.lineItems) {
      const y = doc.y;
      doc.font(H).fontSize(10);
      doc.text(rtl(item.description), col.desc, y, { width: 240, align: 'right' });
      doc.text(String(item.quantity), col.qty, y, { width: 50, align: 'right' });
      doc.text(`₪${Number(item.unitPrice).toFixed(2)}`, col.unit, y, { width: 80, align: 'right' });
      doc.text(`₪${Number(item.total).toFixed(2)}`, col.total, y, { width: 70, align: 'right' });
      doc.moveDown(0.6);
    }

    if (invoice.charges.length > 0) {
      doc.moveDown(0.3);
      doc.font(H).fontSize(10).text('חיובים נוספים:', { align: 'right' });
      for (const c of invoice.charges) {
        const y = doc.y;
        doc.text(rtl(c.description), col.desc, y, { width: 380, align: 'right' });
        doc.text(`₪${Number(c.amount).toFixed(2)}`, col.total, y, { width: 70, align: 'right' });
        doc.moveDown(0.5);
      }
    }

    doc.moveDown();
    doc.moveTo(50, doc.y).lineTo(540, doc.y).stroke();
    doc.moveDown(0.3);

    const originalTotal = Number(invoice.subtotal) + Number(invoice.tax);
    const discountAmount = originalTotal - Number(invoice.total);

    doc.font(H).fontSize(10);
    const ty = doc.y;
    doc.text('סכום ביניים:', 360, ty, { width: 90, align: 'right' });
    doc.text(`₪${Number(invoice.subtotal).toFixed(2)}`, 460, ty, { width: 70, align: 'right' });
    doc.moveDown(0.4);
    const ty2 = doc.y;
    doc.text('מע"מ (17%):', 360, ty2, { width: 90, align: 'right' });
    doc.text(`₪${Number(invoice.tax).toFixed(2)}`, 460, ty2, { width: 70, align: 'right' });

    if (discountAmount > 0.009) {
      doc.moveDown(0.4);
      const tyd = doc.y;
      doc.text('לפני הנחה:', 360, tyd, { width: 90, align: 'right' });
      doc.text(`₪${originalTotal.toFixed(2)}`, 460, tyd, { width: 70, align: 'right' });
      doc.moveDown(0.4);
      const tyd2 = doc.y;
      doc.text('הנחה / זיכוי:', 360, tyd2, { width: 90, align: 'right' });
      doc.text(`-₪${discountAmount.toFixed(2)}`, 460, tyd2, { width: 70, align: 'right' });
    }

    doc.moveDown(0.4);
    doc.fontSize(12);
    const ty3 = doc.y;
    doc.text('סה"כ לתשלום:', 360, ty3, { width: 90, align: 'right' });
    doc.text(`₪${Number(invoice.total).toFixed(2)}`, 460, ty3, { width: 70, align: 'right' });

    if (invoice.payments.length > 0) {
      doc.moveDown(1.5);
      doc.font(H).fontSize(11).text('שולם במלואו', { align: 'center' });
    }

    return doc;
  }

  private generateBuffer(invoice: InvoiceWithRelations): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = this.buildDoc(invoice);
      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
      doc.end();
    });
  }

  async stream(invoiceId: string, requester: JwtPayload, res: Response): Promise<void> {
    const invoice = await this.fetchInvoice(invoiceId);
    this.assertAccess(invoice, requester);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=invoice-${invoiceId.slice(0, 8)}.pdf`);

    const doc = this.buildDoc(invoice);
    doc.pipe(res);
    doc.end();
  }

  async sendByEmail(invoiceId: string, requester: JwtPayload): Promise<{ sent: boolean; to: string }> {
    const invoice = await this.fetchInvoice(invoiceId);
    this.assertAccess(invoice, requester);

    const guestEmail = invoice.reservation.guest.email;
    const resendKey = process.env.RESEND_API_KEY;
    if (!resendKey) throw new Error('RESEND_API_KEY not configured');

    const pdfBuffer = await this.generateBuffer(invoice);
    const base64Pdf = pdfBuffer.toString('base64');

    const origTotal = Number(invoice.subtotal) + Number(invoice.tax);
    const discountAmt = origTotal - Number(invoice.total);
    const discountRow = discountAmt > 0.009
      ? `<tr><td style="padding:4px 8px;color:#dc2626;">הנחה / זיכוי</td><td style="padding:4px 8px;color:#dc2626;">−₪${discountAmt.toFixed(2)}</td></tr>`
      : '';

    const body = {
      from: 'onboarding@resend.dev',
      to: 'malka.develop3949@gmail.com',
      subject: `חשבונית מספר ${invoiceId.slice(0, 8).toUpperCase()}`,
      html: `<div dir="rtl" style="font-family:Arial,sans-serif;max-width:500px">
        <h2>חשבונית מספר ${invoiceId.slice(0, 8).toUpperCase()}</h2>
        <p>שלום ${invoice.reservation.guest.fullName},</p>
        <p>מצורפת חשבונית עבור שהותך.</p>
        <table style="border-collapse:collapse;width:100%">
          <tr><td style="padding:4px 8px;">סכום לפני מע"מ</td><td style="padding:4px 8px;">₪${Number(invoice.subtotal).toFixed(2)}</td></tr>
          <tr><td style="padding:4px 8px;">מע"מ (17%)</td><td style="padding:4px 8px;">₪${Number(invoice.tax).toFixed(2)}</td></tr>
          ${discountAmt > 0.009 ? `<tr><td style="padding:4px 8px;">לפני הנחה</td><td style="padding:4px 8px;">₪${origTotal.toFixed(2)}</td></tr>` : ''}
          ${discountRow}
          <tr style="font-weight:bold;border-top:2px solid #000"><td style="padding:8px;">סה"כ לתשלום</td><td style="padding:8px;">₪${Number(invoice.total).toFixed(2)}</td></tr>
        </table>
        <p>תודה!</p>
      </div>`,
      attachments: [{
        filename: `invoice-${invoiceId.slice(0, 8)}.pdf`,
        content: base64Pdf,
      }],
    };

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.json() as { message?: string };
      throw new Error(err.message ?? 'Failed to send email');
    }

    return { sent: true, to: guestEmail ?? 'malka.develop3949@gmail.com' };
  }
}
