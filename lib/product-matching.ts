export function exactProductMatches<
  T extends { code: string; barcodes: string[] },
>(products: T[], input: string): T[] {
  const code = input.trim().toLowerCase();
  return code
    ? products.filter(
        (p) =>
          p.code.toLowerCase() === code ||
          p.barcodes.some((b) => b.toLowerCase() === code),
      )
    : [];
}
