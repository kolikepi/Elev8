import { prisma } from './db';

export interface SiteSettings {
  businessName: string;
  publicEmail: string | null;
  adminEmail: string | null;
  phone: string | null;
  whatsapp: string | null;
  addressLine: string | null;
  country: string | null;
  currency: string;
  instagram: string | null;
  tiktok: string | null;
  websiteUrl: string | null;
  returnWindowDays: number | null;
  exchangeAllowed: boolean;
  returnConditions: string | null;
  returnShippingPaidBy: string | null;
  nonReturnableItems: string | null;
  returnProcedure: string | null;
  codEnabled: boolean;
  bankTransferEnabled: boolean;
  bankName: string | null;
  bankAccountHolder: string | null;
  bankIban: string | null;
  bankSwift: string | null;
  bankInstructions: string | null;
  cardPaymentsEnabled: boolean;
  orderStatusEmailsEnabled: boolean;
}

export const DEFAULT_SETTINGS: SiteSettings = {
  businessName: 'ELEV8',
  publicEmail: null,
  adminEmail: null,
  phone: null,
  whatsapp: null,
  addressLine: null,
  country: 'Albania',
  currency: 'EUR',
  instagram: null,
  tiktok: null,
  websiteUrl: null,
  returnWindowDays: null,
  exchangeAllowed: false,
  returnConditions: null,
  returnShippingPaidBy: null,
  nonReturnableItems: null,
  returnProcedure: null,
  codEnabled: true,
  bankTransferEnabled: true,
  bankName: null,
  bankAccountHolder: null,
  bankIban: null,
  bankSwift: null,
  bankInstructions: null,
  cardPaymentsEnabled: false,
  orderStatusEmailsEnabled: true,
};

/**
 * Reads the singleton site settings from the database, falling back to
 * safe defaults when the record is missing. This is the single source of
 * truth for all real business information — nothing is hard-coded in UI.
 */
export async function getSiteSettings(): Promise<SiteSettings> {
  try {
    const s = await prisma.siteSetting.findUnique({ where: { id: 'singleton' } });
    if (!s) return DEFAULT_SETTINGS;
    return {
      businessName: s.businessName || 'ELEV8',
      publicEmail: s.publicEmail,
      adminEmail: s.adminEmail,
      phone: s.phone,
      whatsapp: s.whatsapp,
      addressLine: s.addressLine,
      country: s.country,
      currency: s.currency || 'EUR',
      instagram: s.instagram,
      tiktok: s.tiktok,
      websiteUrl: s.websiteUrl,
      returnWindowDays: s.returnWindowDays,
      exchangeAllowed: s.exchangeAllowed,
      returnConditions: s.returnConditions,
      returnShippingPaidBy: s.returnShippingPaidBy,
      nonReturnableItems: s.nonReturnableItems,
      returnProcedure: s.returnProcedure,
      codEnabled: s.codEnabled,
      bankTransferEnabled: s.bankTransferEnabled,
      bankName: s.bankName,
      bankAccountHolder: s.bankAccountHolder,
      bankIban: s.bankIban,
      bankSwift: s.bankSwift,
      bankInstructions: s.bankInstructions,
      cardPaymentsEnabled: s.cardPaymentsEnabled,
      orderStatusEmailsEnabled: s.orderStatusEmailsEnabled,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

/**
 * Public-safe subset: never exposes the internal admin notification email.
 * Bank details are only included when Bank Transfer is enabled (customers
 * need them to pay). Everything that is empty stays null so the UI can hide
 * the related claim instead of showing a placeholder as fact.
 */
export type PublicSettings = Omit<SiteSettings, 'adminEmail'> & { adminEmail?: never };

export function toPublicSettings(s: SiteSettings): PublicSettings {
  const {
    adminEmail: _adminEmail,
    bankName,
    bankAccountHolder,
    bankIban,
    bankSwift,
    bankInstructions,
    bankTransferEnabled,
    ...rest
  } = s;
  return {
    ...rest,
    bankTransferEnabled,
    // Only reveal bank details when the method is enabled.
    bankName: bankTransferEnabled ? bankName : null,
    bankAccountHolder: bankTransferEnabled ? bankAccountHolder : null,
    bankIban: bankTransferEnabled ? bankIban : null,
    bankSwift: bankTransferEnabled ? bankSwift : null,
    bankInstructions: bankTransferEnabled ? bankInstructions : null,
  } as PublicSettings;
}

/**
 * Resolves the recipient email for internal admin notifications.
 * Priority: configured adminEmail setting > ADMIN_NOTIFICATION_EMAIL env.
 * Returns null when nothing is configured (caller should skip sending).
 */
export async function getAdminNotificationEmail(): Promise<string | null> {
  const s = await getSiteSettings();
  return s.adminEmail || process.env.ADMIN_NOTIFICATION_EMAIL || null;
}
