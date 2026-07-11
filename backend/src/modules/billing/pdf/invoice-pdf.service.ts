import * as path from 'path';
import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Response } from 'express';
import PDFDocument from 'pdfkit';
import { PrismaService } from '../../../prisma/prisma.service';
import { NotificationService, wrapEmailHtml } from '../../notifications/notification.service';
import { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';

const FONT_PATH = path.join(process.cwd(), 'src/assets/fonts/DejaVuSans.ttf');

function rtl(text: string): string {
  if (!text) return '';
  return text.split('\n').map(line => line.split(' ').reverse().join(' ')).join('\n');
}

type InvoiceWithRelations = Awaited<ReturnType<InvoicePdfService['fetchInvoice']>>;

@Injectable()
export class InvoicePdfService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationService,
  ) {}

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

  private assertAccess(invoice: { branchId: string }, requester: JwtPayload | null, options?: { guestPortal?: boolean }) {
    if (options?.guestPortal) return;
    if (!requester) throw new ForbiddenException('BRANCH_ACCESS_DENIED');
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

  async stream(invoiceId: string, requester: JwtPayload | null, res: Response, options?: { guestPortal?: boolean }): Promise<void> {
    const invoice = await this.fetchInvoice(invoiceId);
    this.assertAccess(invoice, requester, options);

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
    const pdfBuffer = await this.generateBuffer(invoice);
    const base64Pdf = pdfBuffer.toString('base64');

    const origTotal = Number(invoice.subtotal) + Number(invoice.tax);
    const discountAmt = origTotal - Number(invoice.total);
    const shortId = invoiceId.slice(0, 8).toUpperCase();

    const discountRow = discountAmt > 0.009 ? `
      <tr>
        <td bgcolor="#FFFFFF" style="padding:10px 16px;font-size:13px;color:#DC2626;border-bottom:1px solid #E2E8F0">הנחה / זיכוי</td>
        <td bgcolor="#FFFFFF" style="padding:10px 16px;font-size:13px;color:#DC2626;font-weight:bold;border-bottom:1px solid #E2E8F0">−&#8362;${discountAmt.toFixed(2)}</td>
      </tr>` : '';

    const origRow = discountAmt > 0.009 ? `
      <tr>
        <td bgcolor="#F8FAFC" style="padding:10px 16px;font-size:13px;color:#475569;border-bottom:1px solid #E2E8F0">סכום לפני הנחה</td>
        <td bgcolor="#F8FAFC" style="padding:10px 16px;font-size:13px;color:#475569;border-bottom:1px solid #E2E8F0">&#8362;${origTotal.toFixed(2)}</td>
      </tr>` : '';

    await this.notifications.sendEmail({
      to: guestEmail ?? 'malka.develop3949@gmail.com',
      subject: `חשבונית מספר ${shortId} — ${invoice.branch.name}`,
      text: `שלום ${invoice.reservation.guest.fullName},\n\nמצורפת חשבונית מספר ${shortId} עבור שהותך ב-${invoice.branch.name}.\n\nסכום לפני מע"מ: ₪${Number(invoice.subtotal).toFixed(2)}\nמע"מ (17%): ₪${Number(invoice.tax).toFixed(2)}${discountAmt > 0.009 ? `\nהנחה: −₪${discountAmt.toFixed(2)}` : ''}\nסה"כ: ₪${Number(invoice.total).toFixed(2)}\n\nתודה!\nמערכת ניהול מלון`,
      body: wrapEmailHtml(`
        <h2 style="color:#1E3A8A;font-size:22px;margin:0 0 6px 0;font-family:Arial,sans-serif">חשבונית מספר ${shortId}</h2>
        <div style="width:40px;height:3px;background-color:#CA8A04;border-radius:2px;margin-bottom:28px"></div>
        <p style="color:#475569;font-size:15px;margin:0 0 16px 0;font-family:Arial,sans-serif">שלום ${invoice.reservation.guest.fullName},</p>
        <p style="color:#0F172A;font-size:15px;line-height:1.7;margin:0 0 24px 0;font-family:Arial,sans-serif">
          מצורפת חשבונית עבור שהותך ב-${invoice.branch.name}. ניתן למצוא את הפירוט המלא בקובץ ה-PDF המצורף.
        </p>
        <table cellpadding="0" cellspacing="0" border="0" width="100%" style="border:1px solid #E2E8F0;border-radius:8px;margin-bottom:28px;font-family:Arial,sans-serif;border-collapse:collapse">
          <tr>
            <td bgcolor="#F8FAFC" style="padding:10px 16px;font-size:13px;color:#475569;width:55%;border-bottom:1px solid #E2E8F0">סכום לפני מע&quot;מ</td>
            <td bgcolor="#F8FAFC" style="padding:10px 16px;font-size:13px;color:#0F172A;border-bottom:1px solid #E2E8F0">&#8362;${Number(invoice.subtotal).toFixed(2)}</td>
          </tr>
          <tr>
            <td bgcolor="#FFFFFF" style="padding:10px 16px;font-size:13px;color:#475569;border-bottom:1px solid #E2E8F0">מע&quot;מ (17%)</td>
            <td bgcolor="#FFFFFF" style="padding:10px 16px;font-size:13px;color:#0F172A;border-bottom:1px solid #E2E8F0">&#8362;${Number(invoice.tax).toFixed(2)}</td>
          </tr>
          ${origRow}
          ${discountRow}
          <tr>
            <td bgcolor="#1E3A8A" style="padding:13px 16px;font-size:14px;color:#FFFFFF;font-weight:bold">סה&quot;כ לתשלום</td>
            <td bgcolor="#1E3A8A" style="padding:13px 16px;font-size:14px;color:#FFFFFF;font-weight:bold">&#8362;${Number(invoice.total).toFixed(2)}</td>
          </tr>
        </table>
        <p style="color:#475569;font-size:14px;margin:0 0 20px 0;font-family:Arial,sans-serif">
          קובץ ה-PDF המלא מצורף למייל זה.
        </p>
        <hr style="border:none;border-top:1px solid #E2E8F0;margin:0 0 20px 0">
        <p style="color:#94A3B8;font-size:12px;margin:0;font-family:Arial,sans-serif">תודה על שהותך!</p>
      `),
      attachments: [{ filename: `invoice-${shortId}.pdf`, content: base64Pdf }],
    });

    return { sent: true, to: guestEmail ?? 'malka.develop3949@gmail.com' };
  }
}
