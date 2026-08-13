import type { PostHog, Properties } from "posthog-js/dist/module.slim.no-external";

const ANALYTICS_LOAD_DELAY_MS = 8_000;
const posthogKey = import.meta.env.VITE_POSTHOG_KEY;
const posthogHost = import.meta.env.VITE_POSTHOG_HOST ?? "https://eu.i.posthog.com";
const isConfigured = typeof posthogKey === "string" && posthogKey.length > 0 && !shouldSkipAnalytics();
let posthogClientPromise: Promise<PostHog> | undefined;

function getPosthogClient(): Promise<PostHog> | undefined {
  if (!isConfigured) return undefined;

  posthogClientPromise ??= deferAnalyticsStartup()
    .then(() => import("posthog-js/dist/module.slim.no-external"))
    .then(({ default: posthog }) => {
      posthog.init(posthogKey, {
        advanced_disable_feature_flags: true,
        advanced_disable_feature_flags_on_first_load: true,
        advanced_disable_flags: true,
        api_host: posthogHost,
        autocapture: false,
        capture_dead_clicks: false,
        capture_exceptions: false,
        capture_heatmaps: false,
        capture_pageview: false,
        capture_performance: false,
        disable_external_dependency_loading: true,
        disable_session_recording: true,
        disable_surveys: true,
        disable_surveys_automatic_display: true,
        mask_all_element_attributes: true,
        mask_all_text: true,
        persistence: "localStorage",
        respect_dnt: true
      });

      return posthog;
    });

  return posthogClientPromise;
}

function shouldSkipAnalytics(): boolean {
  if (typeof navigator === "undefined") return true;

  const userAgent = navigator.userAgent.toLowerCase();
  const legacyDoNotTrack = (window as Window & { doNotTrack?: string }).doNotTrack;
  const doNotTrack = navigator.doNotTrack === "1" || legacyDoNotTrack === "1";
  const isBotOrAudit =
    /chrome-lighthouse|lighthouse|pagespeed|headlesschrome|googlebot|bingbot|duckduckbot|yandexbot|ahrefsbot|semrushbot|siteauditbot/.test(
      userAgent
    );

  return doNotTrack || isBotOrAudit;
}

async function deferAnalyticsStartup(): Promise<void> {
  await waitForWindowLoad();
  await delay(ANALYTICS_LOAD_DELAY_MS);
  await runWhenIdle();
}

function waitForWindowLoad(): Promise<void> {
  if (document.readyState === "complete") return Promise.resolve();

  return new Promise((resolve) => {
    window.addEventListener("load", () => resolve(), { once: true });
  });
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

function runWhenIdle(): Promise<void> {
  return new Promise((resolve) => {
    const browserWindow = window as Window & {
      requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
    };

    if (browserWindow.requestIdleCallback) {
      browserWindow.requestIdleCallback(() => resolve(), { timeout: 2_000 });
      return;
    }

    window.setTimeout(resolve, 250);
  });
}

if (!isConfigured && import.meta.env.DEV) {
  console.info("PostHog is disabled. Set VITE_POSTHOG_KEY to enable analytics.");
}

export function captureEvent(name: string, properties?: Properties): void {
  if (!isConfigured) return;
  void getPosthogClient()?.then((posthog) => posthog.capture(name, properties));
}

export function capturePageView(properties?: Properties): void {
  captureEvent("$pageview", properties);
}

export function isAnalyticsEnabled(): boolean {
  return isConfigured;
}
