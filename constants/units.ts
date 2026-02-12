export const PRODUCT_UNITS = [
  { value: 'pieza', label: 'Pieza' },
  { value: 'kg', label: 'Kilogramo (kg)' },
  { value: 'g', label: 'Gramo (g)' },
  { value: 'litro', label: 'Litro (L)' },
  { value: 'ml', label: 'Mililitro (ml)' },
  { value: 'paquete', label: 'Paquete' },
  { value: 'docena', label: 'Docena' },
  { value: 'orden', label: 'Orden/Plato' },
  { value: 'vaso', label: 'Vaso' },
  { value: 'otro', label: 'Otra...' },
] as const;

export type ProductUnit = typeof PRODUCT_UNITS[number]['value'];

export function getUnitLabel(value: string): string {
  const unit = PRODUCT_UNITS.find(u => u.value === value);
  return unit ? unit.label : value;
}

export function getUnitShortLabel(value: string): string {
  const shortLabels: Record<string, string> = {
    pieza: 'pza',
    kg: 'kg',
    g: 'g',
    litro: 'L',
    ml: 'ml',
    paquete: 'paq',
    docena: 'doc',
    orden: 'orden',
    vaso: 'vaso',
  };
  return shortLabels[value] || value;
}

export function formatPriceWithUnit(price: number, unit: string): string {
  const priceStr = `$${price.toFixed(2)}`;
  if (unit === 'pieza' || unit === 'orden') return priceStr;
  return `${priceStr}/${getUnitShortLabel(unit)}`;
}
