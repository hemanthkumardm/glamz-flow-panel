export const inr = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(n || 0);

export const computeTotals = (
  items: { price: number; quantity: number }[],
  discountPct: number,
  discountFlat: number,
  gstApplied: boolean
) => {
  const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const pctAmt = (subtotal * (discountPct || 0)) / 100;
  const discount_amount = Math.min(subtotal, pctAmt + (discountFlat || 0));
  const taxable = Math.max(0, subtotal - discount_amount);
  const cgst = gstApplied ? +(taxable * 0.025).toFixed(2) : 0;
  const sgst = gstApplied ? +(taxable * 0.025).toFixed(2) : 0;
  const total = +(taxable + cgst + sgst).toFixed(2);
  return { subtotal: +subtotal.toFixed(2), discount_amount: +discount_amount.toFixed(2), cgst, sgst, total };
};
