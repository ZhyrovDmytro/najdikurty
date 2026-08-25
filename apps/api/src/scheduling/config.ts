import { z } from "zod";

const positiveInteger = z.coerce.number().int().positive();

export interface JobConfig {
  workerConcurrency: number;
  providerConcurrency: number;
  providerConcurrencyOverrides: Record<string, number>;
  pollIntervalMs: number;
  scrapeTimeoutMs: number;
  lockTimeoutMs: number;
  maxAttempts: number;
  retryBaseMs: number;
  retryMaxMs: number;
  schedulerIntervalMs: number;
  horizonDays: number;
  timezone: string;
  scheduleStart: string;
  scheduleEnd: string;
}

export function jobConfig(environment: NodeJS.ProcessEnv = process.env): JobConfig {
  return {
    workerConcurrency: envInteger(environment, "WORKER_CONCURRENCY", 4, 1, 20),
    providerConcurrency: envInteger(environment, "WORKER_PROVIDER_CONCURRENCY", 1, 1, 10),
    providerConcurrencyOverrides: concurrencyOverrides(environment.WORKER_PROVIDER_CONCURRENCY_OVERRIDES),
    pollIntervalMs: envInteger(environment, "WORKER_POLL_INTERVAL_MS", 5_000, 500, 300_000),
    scrapeTimeoutMs: envInteger(environment, "WORKER_SCRAPE_TIMEOUT_MS", 150_000, 1_000, 600_000),
    lockTimeoutMs: envInteger(environment, "WORKER_LOCK_TIMEOUT_MS", 5 * 60_000, 10_000, 60 * 60_000),
    maxAttempts: envInteger(environment, "WORKER_MAX_ATTEMPTS", 3, 1, 10),
    retryBaseMs: envInteger(environment, "WORKER_RETRY_BASE_MS", 60_000, 1_000, 60 * 60_000),
    retryMaxMs: envInteger(environment, "WORKER_RETRY_MAX_MS", 15 * 60_000, 1_000, 24 * 60 * 60_000),
    schedulerIntervalMs: envInteger(environment, "SCHEDULER_INTERVAL_MS", 15 * 60_000, 10_000, 24 * 60 * 60_000),
    horizonDays: envInteger(environment, "SCRAPE_TARGET_HORIZON_DAYS", 7, 1, 31),
    timezone: environment.SCRAPE_SCHEDULE_TIMEZONE?.trim() || "Europe/Prague",
    scheduleStart: scheduleTime(environment.SCRAPE_SCHEDULE_START, "08:00"),
    scheduleEnd: scheduleTime(environment.SCRAPE_SCHEDULE_END, "22:00")
  };
}

function concurrencyOverrides(value: string | undefined): Record<string, number> {
  if (!value?.trim()) return {};
  const parsed = z.record(z.string(), z.coerce.number().int().min(1).max(10)).parse(JSON.parse(value));
  return parsed;
}

function envInteger(environment: NodeJS.ProcessEnv, key: string, fallback: number, min: number, max: number): number {
  const value = environment[key] === undefined ? fallback : positiveInteger.parse(environment[key]);
  if (value < min || value > max) throw new Error(`${key} must be between ${min} and ${max}`);
  return value;
}

function scheduleTime(value: string | undefined, fallback: string): string {
  const result = value?.trim() || fallback;
  if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(result)) throw new Error(`Invalid schedule time: ${result}`);
  return result;
}
