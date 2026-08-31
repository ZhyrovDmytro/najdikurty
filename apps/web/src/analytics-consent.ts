export type AnalyticsConsent = "granted" | "denied";

export const ANALYTICS_CONSENT_STORAGE_KEY = "mamekurt-analytics-consent-v1";
export const ANALYTICS_CONSENT_MAX_AGE_MS = 365 * 24 * 60 * 60 * 1_000;

export function readAnalyticsConsent(
  storage: Pick<Storage, "getItem"> | undefined = browserStorage(),
  now = Date.now()
): AnalyticsConsent | null {
  if (!storage) return null;

  try {
    const rawValue = storage.getItem(ANALYTICS_CONSENT_STORAGE_KEY);
    if (!rawValue) return null;
    const value = JSON.parse(rawValue) as { choice?: unknown; savedAt?: unknown };
    const age = typeof value.savedAt === "number" ? now - value.savedAt : Number.NaN;
    if (age < 0 || age > ANALYTICS_CONSENT_MAX_AGE_MS) return null;
    return value.choice === "granted" || value.choice === "denied" ? value.choice : null;
  } catch {
    return null;
  }
}

export function writeAnalyticsConsent(
  consent: AnalyticsConsent,
  storage: Pick<Storage, "setItem"> | undefined = browserStorage(),
  now = Date.now()
): void {
  if (!storage) return;

  try {
    storage.setItem(ANALYTICS_CONSENT_STORAGE_KEY, JSON.stringify({ choice: consent, savedAt: now }));
  } catch {
    // Analytics remains disabled if browser storage is unavailable.
  }
}

export function clearLegacyPosthogStorage(
  storage: Pick<Storage, "key" | "length" | "removeItem"> | undefined = browserStorage()
): void {
  if (!storage) return;

  try {
    const legacyKeys = Array.from({ length: storage.length }, (_, index) => storage.key(index)).filter(
      (key): key is string => Boolean(key && /^ph_.*_posthog$/.test(key))
    );
    legacyKeys.forEach((key) => storage.removeItem(key));
  } catch {
    // Legacy analytics data can also be removed through browser settings.
  }
}

function browserStorage(): Storage | undefined {
  if (typeof window === "undefined") return undefined;

  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}
