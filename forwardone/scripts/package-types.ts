// Standard shipping package types. Reused across quote/booking piece entry.
export interface SeedPackageType { code: string; name: string; description: string }
export const PACKAGE_TYPES: SeedPackageType[] = [
  { code: 'BOX', name: 'Box / Carton', description: 'Standard corrugated box or carton.' },
  { code: 'PALLET', name: 'Pallet', description: 'Goods stacked on a pallet.' },
  { code: 'ENVELOPE', name: 'Envelope', description: 'Document or flyer envelope.' },
  { code: 'PARCEL', name: 'Parcel', description: 'General small parcel.' },
  { code: 'CRATE', name: 'Crate', description: 'Wooden or plastic crate.' },
  { code: 'DRUM', name: 'Drum', description: 'Cylindrical drum container.' },
  { code: 'BAG', name: 'Bag / Sack', description: 'Flexible bag or sack.' },
  { code: 'TUBE', name: 'Tube', description: 'Cylindrical tube for rolled items.' },
  { code: 'ROLL', name: 'Roll', description: 'Rolled goods (fabric, carpet, etc.).' },
  { code: 'OTHER', name: 'Other', description: 'Non-standard packaging.' },
]
