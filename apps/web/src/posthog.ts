import type { PostHog, Properties } from "posthog-js";

const posthogKey = import.meta.env.VITE_POSTHOG_KEY;
const posthogHost = import.meta.env.VITE_POSTHOG_HOST ?? "https://eu.i.posthog.com";
const isConfigured = typeof posthogKey === "string" && posthogKey.length > 0;
let posthogClientPromise: Promise<PostHog> | undefined;

if (isConfigured) {
  posthogClientPromise = import("posthog-js").then(({ default: posthog }) => {
    posthog.init(posthogKey, {
      api_host: posthogHost,
      autocapture: false,
      capture_exceptions: {
        capture_unhandled_errors: true,
        capture_unhandled_rejections: true,
        capture_console_errors: false
      },
      capture_pageview: false,
      disable_session_recording: true,
      mask_all_element_attributes: true,
      mask_all_text: true,
      persistence: "localStorage",
      respect_dnt: true
    });

    return posthog;
  });
} else if (import.meta.env.DEV) {
  console.info("PostHog is disabled. Set VITE_POSTHOG_KEY to enable analytics.");
}

export function captureEvent(name: string, properties?: Properties): void {
  if (!isConfigured) return;
  void posthogClientPromise?.then((posthog) => posthog.capture(name, properties));
}

export function capturePageView(properties?: Properties): void {
  captureEvent("$pageview", properties);
}

export function isAnalyticsEnabled(): boolean {
  return isConfigured;
}
