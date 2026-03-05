// Format number as Indian Rupee with lakh/crore shorthand
export function formatInr(value: number, short = false): string {
  if (!Number.isFinite(value) || Number.isNaN(value)) return "₹0";

  if (short) {
    const absVal = Math.abs(value);
    const sign = value < 0 ? "-" : "";
    if (absVal >= 1e7) return `${sign}₹${(absVal / 1e7).toFixed(2)} Cr`;
    if (absVal >= 1e5) return `${sign}₹${(absVal / 1e5).toFixed(2)} L`;
    if (absVal >= 1e3) return `${sign}₹${(absVal / 1e3).toFixed(1)}K`;
    return `${sign}₹${absVal.toFixed(0)}`;
  }

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

// Format as Indian number (no currency symbol, with commas)
export function formatIndianNumber(value: number): string {
  if (!Number.isFinite(value) || Number.isNaN(value)) return "0";
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(
    value,
  );
}

// Parse Indian formatted string to number
export function parseInrInput(val: string): number {
  const cleaned = val.replace(/[₹,\s]/g, "");
  const num = Number.parseFloat(cleaned);
  return Number.isNaN(num) ? 0 : num;
}
