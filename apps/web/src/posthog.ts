import type { PostHog, Properties } from "posthog-js/dist/module.slim.no-external";

const posthogKey = import.meta.env.VITE_POSTHOG_KEY;
const posthogHost = import.meta.env.VITE_POSTHOG_HOST ?? "https://eu.i.posthog.com";
const isConfigured = typeof posthogKey === "string" && posthogKey.length > 0;
let posthogClientPromise: Promise<PostHog> | undefined;

function getPosthogClient(): Promise<PostHog> | undefined {
  if (!isConfigured) return undefined;

  posthogClientPromise ??= runWhenIdle()
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
