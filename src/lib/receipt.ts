import jsPDF from "jspdf";
import { inr } from "./format";
import { format } from "date-fns";

export interface ReceiptData {
  business: { name: string; address: string; phone: string; gstin: string };
  txId: string;
  createdAt: string;
  customer: { name: string; phone: string };
  staffName: string;
  items: { name: string; price: number; quantity: number }[];
  subtotal: number;
  discount: number;
  cgst: number;
  sgst: number;
  total: number;
  cash: number;
  upi: number;
  wallet: number;
  upiTxnId?: string | null;
  walletAfter?: number | null;
}

export function generateReceiptPdf(d: ReceiptData) {
  const doc = new jsPDF({ unit: "mm", format: [80, 200 + d.items.length * 6] });
  const w = 80;
  let y = 8;
  doc.setFont("helvetica", "bold").setFontSize(13).text(d.business.name, w / 2, y, { align: "center" });
  y += 5;
  doc.setFont("helvetica", "normal").setFontSize(8);
  doc.text(d.business.address, w / 2, y, { align: "center", maxWidth: 70 }); y += 4;
  doc.text(`Ph: ${d.business.phone}`, w / 2, y, { align: "center" }); y += 4;
  doc.text(`GSTIN: ${d.business.gstin}`, w / 2, y, { align: "center" }); y += 5;
  doc.line(4, y, w - 4, y); y += 4;

  doc.setFontSize(8);
  doc.text(`Bill: ${d.txId.slice(0, 8)}`, 4, y);
  doc.text(format(new Date(d.createdAt), "dd MMM yy HH:mm"), w - 4, y, { align: "right" }); y += 4;
  doc.text(`Customer: ${d.customer.name}`, 4, y); y += 4;
  doc.text(`Phone: ${d.customer.phone}`, 4, y); y += 4;
  doc.text(`Staff: ${d.staffName}`, 4, y); y += 4;
  doc.line(4, y, w - 4, y); y += 4;

  doc.setFont("helvetica", "bold");
  doc.text("Item", 4, y); doc.text("Qty", 50, y, { align: "right" }); doc.text("Amount", w - 4, y, { align: "right" });
  y += 3; doc.line(4, y, w - 4, y); y += 4;
  doc.setFont("helvetica", "normal");
  d.items.forEach((it) => {
    const lineTotal = it.price * it.quantity;
    doc.text(it.name.slice(0, 24), 4, y);
    doc.text(String(it.quantity), 50, y, { align: "right" });
    doc.text(inr(lineTotal).replace("₹", "Rs."), w - 4, y, { align: "right" });
    y += 4;
  });
  doc.line(4, y, w - 4, y); y += 4;

  const row = (label: string, val: string, bold = false) => {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.text(label, 4, y); doc.text(val, w - 4, y, { align: "right" }); y += 4;
  };
  row("Subtotal", inr(d.subtotal).replace("₹", "Rs."));
  if (d.discount > 0) row("Discount", "- " + inr(d.discount).replace("₹", "Rs."));
  if (d.cgst > 0) row("CGST (9%)", inr(d.cgst).replace("₹", "Rs."));
  if (d.sgst > 0) row("SGST (9%)", inr(d.sgst).replace("₹", "Rs."));
  doc.line(4, y, w - 4, y); y += 4;
  row("TOTAL", inr(d.total).replace("₹", "Rs."), true);
  y += 2; doc.line(4, y, w - 4, y); y += 4;

  doc.setFont("helvetica", "bold").text("Payment", 4, y); y += 4;
  doc.setFont("helvetica", "normal");
  if (d.cash > 0) row("  Cash", inr(d.cash).replace("₹", "Rs."));
  if (d.upi > 0) {
    row("  UPI", inr(d.upi).replace("₹", "Rs."));
    if (d.upiTxnId) { doc.setFontSize(7).text(`  Txn: ${d.upiTxnId}`, 4, y); y += 3.5; doc.setFontSize(8); }
  }
  if (d.wallet > 0) row("  Wallet", inr(d.wallet).replace("₹", "Rs."));
  if (d.walletAfter != null) { y += 2; row("Wallet balance", inr(d.walletAfter).replace("₹", "Rs."), true); }

  y += 4; doc.line(4, y, w - 4, y); y += 5;
  doc.setFontSize(8).text("Thank you for visiting!", w / 2, y, { align: "center" }); y += 4;
  doc.setFontSize(7).setTextColor(120).text("S M Glamz Unisex Salon", w / 2, y, { align: "center" });

  return doc;
}
