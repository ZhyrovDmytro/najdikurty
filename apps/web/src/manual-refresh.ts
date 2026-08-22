export interface ManualRefreshStatus {
  clubSlug: string;
  lastRefreshAt: string | null;
  status: "pending" | "running" | "failed" | "paused";
}

export interface ManualRefreshStatusResponse {
  date: string;
  results: ManualRefreshStatus[];
}

export function hasManualRefreshCompleted(
  results: ManualRefreshStatus[],
  requestedClubSlugs: string[],
  requestedAt: string
): boolean {
  const requestTime = new Date(requestedAt).getTime();
  if (Number.isNaN(requestTime)) return false;
  const statusByClub = new Map(results.map((result) => [result.clubSlug, result]));
  return requestedClubSlugs.every((clubSlug) => {
    const lastRefreshAt = statusByClub.get(clubSlug)?.lastRefreshAt;
    return lastRefreshAt !== null && lastRefreshAt !== undefined && new Date(lastRefreshAt).getTime() >= requestTime;
  });
}
