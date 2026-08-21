import { prisma } from './db';

export interface ShippingConfig {
  freeShippingEnabled: boolean;
  freeShippingThreshold: number;
  tiranaEnabled: boolean;
  tiranaRate: number;
  tiranaDeliveryText: string | null;
  albaniaEnabled: boolean;
  standardRate: number;
  albaniaDeliveryText: string | null;
  internationalEnabled: boolean;
  internationalRate: number;
  internationalDeliveryText: string | null;
}

export const DEFAULT_SHIPPING: ShippingConfig = {
  freeShippingEnabled: true,
  freeShippingThreshold: 50,
  tiranaEnabled: true,
  tiranaRate: 3,
  tiranaDeliveryText: null,
  albaniaEnabled: true,
  standardRate: 5,
  albaniaDeliveryText: null,
  internationalEnabled: false,
  internationalRate: 0,
  internationalDeliveryText: null,
};

/**
 * Reads the singleton shipping settings from the database.
 * Falls back to sensible defaults if the record is missing.
 */
export async function getShippingConfig(): Promise<ShippingConfig> {
  try {
    const s = await prisma.shippingSetting.findUnique({ where: { id: 'singleton' } });
    if (!s) return DEFAULT_SHIPPING;
    return {
      freeShippingEnabled: s.freeShippingEnabled,
      freeShippingThreshold: s.freeShippingThreshold,
      tiranaEnabled: s.tiranaEnabled,
      tiranaRate: s.tiranaRate,
      tiranaDeliveryText: s.tiranaDeliveryText,
      albaniaEnabled: s.albaniaEnabled,
      standardRate: s.standardRate,
      albaniaDeliveryText: s.albaniaDeliveryText,
      internationalEnabled: s.internationalEnabled,
      internationalRate: s.internationalRate,
      internationalDeliveryText: s.internationalDeliveryText,
    };
  } catch {
    return DEFAULT_SHIPPING;
  }
}

/**
 * Computes the shipping cost given a subtotal, destination city and config.
 * - Free shipping when enabled and subtotal >= freeShippingThreshold
 * - Tirana gets the tiranaRate, everywhere else in Albania the standardRate
 */
export function computeShipping(
  subtotal: number,
  city: string,
  config: ShippingConfig
): number {
  if (config.freeShippingEnabled && subtotal >= config.freeShippingThreshold) return 0;
  const isTirana = (city || '').toLowerCase().includes('tiran');
  return isTirana ? config.tiranaRate : config.standardRate;
}
