import { Inject, Injectable, Logger, type OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';
import { APP_CONFIG, type AppConfig } from '../../config/configuration';

/**
 * Read-through cache for public catalogue data.
 *
 * Redis is treated as optional infrastructure: if the connection is unavailable the service falls
 * back to a bounded in-process map so local development and tests never require a running Redis.
 * Customer, billing and payment data is deliberately never routed through here.
 */
@Injectable()
export class CacheService implements OnModuleDestroy {
  private readonly logger = new Logger(CacheService.name);
  private readonly client: Redis | null;
  private readonly fallback = new Map<string, { value: string; expiresAt: number }>();
  private readonly fallbackLimit = 500;
  private redisHealthy = false;

  constructor(@Inject(APP_CONFIG) private readonly config: AppConfig) {
    this.client = this.createClient();
  }

  private createClient(): Redis | null {
    try {
      const client = new Redis(this.config.redis.url, {
        lazyConnect: true,
        maxRetriesPerRequest: 1,
        enableOfflineQueue: false,
        retryStrategy: (attempt) => (attempt > 3 ? null : Math.min(attempt * 500, 2000)),
      });

      client.on('ready', () => {
        this.redisHealthy = true;
        this.logger.log('Cache backed by Redis');
      });
      client.on('error', () => {
        if (this.redisHealthy) {
          this.logger.warn('Redis unavailable — falling back to the in-process cache');
        }
        this.redisHealthy = false;
      });

      void client.connect().catch(() => {
        this.logger.warn('Redis unreachable at startup — using the in-process cache');
      });

      return client;
    } catch {
      return null;
    }
  }

  get isRedisHealthy(): boolean {
    return this.redisHealthy;
  }

  async get<T>(key: string): Promise<T | null> {
    const raw = await this.read(key);
    if (raw === null) return null;

    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    const ttl = ttlSeconds ?? this.config.cache.ttlSeconds;
    if (ttl <= 0) return;

    const serialised = JSON.stringify(value);

    if (this.client && this.redisHealthy) {
      try {
        await this.client.set(key, serialised, 'EX', ttl);
        return;
      } catch {
        this.redisHealthy = false;
      }
    }

    this.writeFallback(key, serialised, ttl);
  }

  /** Fetches from cache, or runs the loader and stores its result. */
  async remember<T>(key: string, ttlSeconds: number, loader: () => Promise<T>): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) return cached;

    const value = await loader();
    await this.set(key, value, ttlSeconds);
    return value;
  }

  async del(...keys: string[]): Promise<void> {
    if (keys.length === 0) return;

    for (const key of keys) {
      this.fallback.delete(key);
    }

    if (this.client && this.redisHealthy) {
      try {
        await this.client.del(...keys);
      } catch {
        this.redisHealthy = false;
      }
    }
  }

  /**
   * Invalidates a whole namespace, e.g. `plans:*` after an admin publishes a price change.
   * Uses SCAN rather than KEYS so a large keyspace does not block Redis.
   */
  async invalidateNamespace(prefix: string): Promise<void> {
    for (const key of this.fallback.keys()) {
      if (key.startsWith(prefix)) {
        this.fallback.delete(key);
      }
    }

    if (!this.client || !this.redisHealthy) return;

    try {
      let cursor = '0';
      do {
        const [next, keys] = await this.client.scan(cursor, 'MATCH', `${prefix}*`, 'COUNT', 200);
        cursor = next;
        if (keys.length > 0) {
          await this.client.del(...keys);
        }
      } while (cursor !== '0');
    } catch {
      this.redisHealthy = false;
    }
  }

  private async read(key: string): Promise<string | null> {
    if (this.client && this.redisHealthy) {
      try {
        return await this.client.get(key);
      } catch {
        this.redisHealthy = false;
      }
    }

    const entry = this.fallback.get(key);
    if (!entry) return null;
    if (entry.expiresAt < Date.now()) {
      this.fallback.delete(key);
      return null;
    }

    return entry.value;
  }

  private writeFallback(key: string, value: string, ttlSeconds: number): void {
    if (this.fallback.size >= this.fallbackLimit) {
      const oldest = this.fallback.keys().next();
      if (!oldest.done) {
        this.fallback.delete(oldest.value);
      }
    }

    this.fallback.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
  }

  async onModuleDestroy(): Promise<void> {
    this.fallback.clear();
    if (this.client) {
      this.client.disconnect();
    }
  }
}

/** Cache key namespaces. Centralised so invalidation and reads cannot drift apart. */
export const CacheKeys = {
  cities: 'catalog:cities',
  cityAreas: (slug: string) => `catalog:cities:${slug}:areas`,
  areaSubAreas: (areaId: string) => `catalog:areas:${areaId}:subareas`,
  plans: (query: string) => `catalog:plans:${query}`,
  planBySlug: (slug: string, citySlug: string) => `catalog:plan:${slug}:${citySlug}`,
  planCategories: 'catalog:plan-categories',
  addons: 'catalog:addons',
  products: 'catalog:products',
  productBySlug: (slug: string) => `catalog:product:${slug}`,
  promotions: 'catalog:promotions',
  faqs: (query: string) => `support:faqs:${query}`,
  faqCategories: 'support:faq-categories',
  supportCategories: 'support:categories',
  cmsPage: (slug: string) => `cms:page:${slug}`,
  cmsSections: 'cms:sections',
  heroSlides: 'cms:hero-slides',
  siteSettings: 'cms:site-settings',
  coverageSummary: 'coverage:summary',
} as const;

export const CacheNamespaces = {
  catalog: 'catalog:',
  support: 'support:',
  cms: 'cms:',
  coverage: 'coverage:',
} as const;
