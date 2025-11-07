const priceRx = /^\d{1,3}(?:\.\d{3})*,\d{2}$/;     // 2,50  1.250,00 …

export default function formatProductPrices(rows: string[][]): [string,string][] {
  const items: [string, string][] = [];

  for (const tokens of rows) {
    const priceIdx = tokens.findIndex(t => priceRx.test(t));
    if (priceIdx === -1) continue;                 // linha sem preço

    const prodIdx  = tokens.findIndex(t => /PRODUTOS?/i.test(t));
    const nameEnd  = prodIdx > -1 && prodIdx < priceIdx ? prodIdx : priceIdx;
    const name     = tokens.slice(0, nameEnd).join(' ').trim();

    if (name) {
      items.push([name, tokens[priceIdx]]);
    }
  }

  return items;
}
