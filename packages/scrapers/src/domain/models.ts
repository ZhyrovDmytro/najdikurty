export interface Club {
  id: string;
  slug: string;
  name: string;
  providerId: string;
  providerExternalId?: string | null;
  providerConfig: Readonly<Record<string, unknown>>;
  bookingUrl: string;
  timezone: string;
  active: boolean;
}

export interface Court {
  id: string;
  clubId: string;
  externalId: string;
  name: string;
  indoor?: boolean | null;
  surface?: string | null;
  active: boolean;
}

export interface NormalizedAvailabilitySlot {
  clubId: string;
  courtId: string;
  startsAt: Date;
  endsAt: Date;
  available: boolean;
  price?: number | null;
  currency?: string | null;
  bookingUrl?: string | null;
  fetchedAt: Date;
}
