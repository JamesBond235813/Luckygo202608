import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

const CACHE_CODE_PREFIX = 'sms_code_';
const CACHE_COOLDOWN_PREFIX = 'sms_cooldown_';
const CACHE_WINDOW_PREFIX = 'sms_window_';

type MemoryEntry = { value: string; expiresAt: number };

@Injectable()
export class GhanaSmsOtpStore implements OnModuleDestroy {
  private readonly logger = new Logger(GhanaSmsOtpStore.name);
  private redis: Redis | null = null;
  private redisFailed = false;
  private readonly memory = new Map<string, MemoryEntry>();

  constructor(private readonly config: ConfigService) {}

  codeKey(canonicalPhone: string): string {
    return `${CACHE_CODE_PREFIX}${canonicalPhone}`;
  }

  cooldownKey(canonicalPhone: string): string {
    return `${CACHE_COOLDOWN_PREFIX}${canonicalPhone}`;
  }

  windowKey(canonicalPhone: string): string {
    return `${CACHE_WINDOW_PREFIX}${canonicalPhone}`;
  }

  private getRedis(): Redis | null {
    if (this.redisFailed) return null;
    if (this.redis) return this.redis;
    try {
      this.redis = new Redis({
        host: this.config.get<string>('REDIS_HOST', '127.0.0.1'),
        port: Number(this.config.get<string>('REDIS_PORT', '6379')),
        password: this.config.get<string>('REDIS_PASSWORD') || undefined,
        db: Number(this.config.get<string>('REDIS_DB', '0')),
        maxRetriesPerRequest: 1,
        lazyConnect: true,
      });
      return this.redis;
    } catch {
      this.redisFailed = true;
      return null;
    }
  }

  private memoryGet(key: string): string | null {
    const row = this.memory.get(key);
    if (!row) return null;
    if (Date.now() > row.expiresAt) {
      this.memory.delete(key);
      return null;
    }
    return row.value;
  }

  private memorySet(key: string, value: string, ttlSec: number): void {
    this.memory.set(key, { value, expiresAt: Date.now() + ttlSec * 1000 });
  }

  private memoryDel(key: string): void {
    this.memory.delete(key);
  }

  private memoryHas(key: string): boolean {
    return this.memoryGet(key) !== null;
  }

  async has(key: string): Promise<boolean> {
    const r = this.getRedis();
    if (r) {
      try {
        if (!r.status || r.status === 'wait') await r.connect();
        return (await r.exists(key)) === 1;
      } catch (e) {
        this.logger.warn(`Redis exists failed, fallback memory: ${e instanceof Error ? e.message : e}`);
        this.redisFailed = true;
      }
    }
    return this.memoryHas(key);
  }

  async get(key: string): Promise<string | null> {
    const r = this.getRedis();
    if (r) {
      try {
        if (!r.status || r.status === 'wait') await r.connect();
        const v = await r.get(key);
        return v ?? null;
      } catch (e) {
        this.logger.warn(`Redis get failed, fallback memory: ${e instanceof Error ? e.message : e}`);
        this.redisFailed = true;
      }
    }
    return this.memoryGet(key);
  }

  async set(key: string, value: string, ttlSec: number): Promise<'redis' | 'memory'> {
    const r = this.getRedis();
    if (r) {
      try {
        if (!r.status || r.status === 'wait') await r.connect();
        await r.set(key, value, 'EX', ttlSec);
        return 'redis';
      } catch (e) {
        this.logger.warn(`Redis set failed, fallback memory: ${e instanceof Error ? e.message : e}`);
        this.redisFailed = true;
      }
    }
    this.memorySet(key, value, ttlSec);
    return 'memory';
  }

  async incr(key: string): Promise<number> {
    const r = this.getRedis();
    if (r) {
      try {
        if (!r.status || r.status === 'wait') await r.connect();
        return await r.incr(key);
      } catch (e) {
        this.logger.warn(`Redis incr failed, fallback memory: ${e instanceof Error ? e.message : e}`);
        this.redisFailed = true;
      }
    }
    const row = this.memory.get(key);
    const now = Date.now();
    if (!row || (row.expiresAt > 0 && now > row.expiresAt)) {
      this.memory.set(key, { value: '1', expiresAt: 0 });
      return 1;
    }
    const next = (Number.parseInt(row.value, 10) || 0) + 1;
    this.memory.set(key, { value: String(next), expiresAt: row.expiresAt });
    return next;
  }

  async decr(key: string): Promise<number> {
    const r = this.getRedis();
    if (r) {
      try {
        if (!r.status || r.status === 'wait') await r.connect();
        const next = await r.decr(key);
        if (next <= 0) await r.del(key);
        return Math.max(next, 0);
      } catch (e) {
        this.logger.warn(`Redis decr failed, fallback memory: ${e instanceof Error ? e.message : e}`);
        this.redisFailed = true;
      }
    }
    const row = this.memory.get(key);
    if (!row) return 0;
    const next = Math.max((Number.parseInt(row.value, 10) || 0) - 1, 0);
    if (next === 0) {
      this.memory.delete(key);
      return 0;
    }
    this.memory.set(key, { value: String(next), expiresAt: row.expiresAt });
    return next;
  }

  async expire(key: string, ttlSec: number): Promise<void> {
    const r = this.getRedis();
    if (r) {
      try {
        if (!r.status || r.status === 'wait') await r.connect();
        await r.expire(key, ttlSec);
        return;
      } catch (e) {
        this.logger.warn(`Redis expire failed, fallback memory: ${e instanceof Error ? e.message : e}`);
        this.redisFailed = true;
      }
    }
    const row = this.memory.get(key);
    if (row) {
      this.memory.set(key, { ...row, expiresAt: Date.now() + ttlSec * 1000 });
    }
  }

  async delete(key: string): Promise<void> {
    const r = this.getRedis();
    if (r) {
      try {
        if (!r.status || r.status === 'wait') await r.connect();
        await r.del(key);
      } catch {
        /* ignore */
      }
    }
    this.memoryDel(key);
  }

  async onModuleDestroy(): Promise<void> {
    if (this.redis) {
      await this.redis.quit().catch(() => undefined);
    }
  }
}
