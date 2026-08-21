export class ProviderConcurrencyLimiter {
  private readonly active = new Map<string, number>();
  private readonly waiting = new Map<string, Array<() => void>>();

  constructor(
    private readonly defaultLimit: number,
    private readonly overrides: Readonly<Record<string, number>> = {}
  ) {}

  async run<T>(providerKey: string, operation: () => Promise<T>): Promise<T> {
    await this.acquire(providerKey);
    try {
      return await operation();
    } finally {
      this.release(providerKey);
    }
  }

  private async acquire(providerKey: string): Promise<void> {
    const limit = this.overrides[providerKey] ?? this.defaultLimit;
    if ((this.active.get(providerKey) ?? 0) < limit) {
      this.active.set(providerKey, (this.active.get(providerKey) ?? 0) + 1);
      return;
    }
    await new Promise<void>((resolve) => {
      const queue = this.waiting.get(providerKey) ?? [];
      queue.push(resolve);
      this.waiting.set(providerKey, queue);
    });
    this.active.set(providerKey, (this.active.get(providerKey) ?? 0) + 1);
  }

  private release(providerKey: string): void {
    this.active.set(providerKey, Math.max(0, (this.active.get(providerKey) ?? 1) - 1));
    const queue = this.waiting.get(providerKey);
    const next = queue?.shift();
    if (queue?.length === 0) this.waiting.delete(providerKey);
    next?.();
  }
}
