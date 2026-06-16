/**
 * Redis client with in-memory fallback.
 * If REDIS_URL is set, uses real Redis. Otherwise uses a Map-based
 * store suitable for single-process dev / fallback. Production MUST
 * set REDIS_URL.
 */

type Store = {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, mode?: "EX", seconds?: number): Promise<void>;
  del(key: string): Promise<void>;
  incr(key: string): Promise<number>;
  expire(key: string, seconds: number): Promise<void>;
  sadd(key: string, member: string): Promise<number>;
  smembers(key: string): Promise<string[]>;
  srem(key: string, member: string): Promise<void>;
};

class MemoryStore implements Store {
  private map = new Map<string, { v: string; exp?: number }>();

  private clean(key: string): string | null {
    const e = this.map.get(key);
    if (!e) return null;
    if (e.exp && Date.now() > e.exp) {
      this.map.delete(key);
      return null;
    }
    return e.v;
  }

  async get(key: string) {
    return this.clean(key);
  }

  async set(key: string, value: string, mode?: "EX", seconds?: number) {
    this.map.set(key, { v: value, exp: mode === "EX" && seconds ? Date.now() + seconds * 1000 : undefined });
  }

  async del(key: string) {
    this.map.delete(key);
  }

  async incr(key: string) {
    const v = this.clean(key);
    const n = (v ? parseInt(v, 10) : 0) + 1;
    this.map.set(key, { v: String(n) });
    return n;
  }

  async expire(key: string, seconds: number) {
    const e = this.map.get(key);
    if (e) this.map.set(key, { v: e.v, exp: Date.now() + seconds * 1000 });
  }

  async sadd(key: string, member: string) {
    const raw = (this.clean(key) ?? "").split("|").filter(Boolean);
    if (raw.includes(member)) return 0;
    raw.push(member);
    this.map.set(key, { v: raw.join("|") });
    return 1;
  }

  async smembers(key: string) {
    const v = this.clean(key);
    return v ? v.split("|").filter(Boolean) : [];
  }

  async srem(key: string, member: string) {
    const raw = (this.clean(key) ?? "").split("|").filter(Boolean);
    const next = raw.filter((m) => m !== member);
    this.map.set(key, { v: next.join("|") });
  }
}

class RealRedisStore implements Store {
  private url: string;
  private client: any = null;
  private connected = false;

  constructor(url: string) {
    this.url = url;
  }

  private async ensure(): Promise<any> {
    if (this.client) return this.client;
    // Use eval-require to bypass webpack static analysis (ioredis is optional)
    let mod: any = null;
    try {
      const req = eval("require") as NodeRequire;
      mod = req("ioredis");
    } catch {
      mod = null;
    }
    if (!mod) {
      console.warn("[redis] ioredis not installed, falling back to memory store");
      this.client = null;
      return null;
    }
    try {
      this.client = new mod(this.url, { maxRetriesPerRequest: 2, lazyConnect: false });
      this.connected = true;
      return this.client;
    } catch (err) {
      console.warn("[redis] connection failed, falling back to memory store", err);
      this.client = null;
      return null;
    }
  }

  async get(key: string) {
    const c = await this.ensure();
    if (!c) return memory.get(key);
    return c.get(key);
  }

  async set(key: string, value: string, mode?: "EX", seconds?: number) {
    const c = await this.ensure();
    if (!c) return memory.set(key, value, mode, seconds);
    if (mode === "EX" && seconds) return c.set(key, value, "EX", seconds);
    return c.set(key, value);
  }

  async del(key: string) {
    const c = await this.ensure();
    if (!c) return memory.del(key);
    return c.del(key);
  }

  async incr(key: string) {
    const c = await this.ensure();
    if (!c) return memory.incr(key);
    return c.incr(key);
  }

  async expire(key: string, seconds: number) {
    const c = await this.ensure();
    if (!c) return memory.expire(key, seconds);
    return c.expire(key, seconds);
  }

  async sadd(key: string, member: string) {
    const c = await this.ensure();
    if (!c) return memory.sadd(key, member);
    return c.sadd(key, member);
  }

  async smembers(key: string) {
    const c = await this.ensure();
    if (!c) return memory.smembers(key);
    return c.smembers(key);
  }

  async srem(key: string, member: string) {
    const c = await this.ensure();
    if (!c) return memory.srem(key, member);
    return c.srem(key, member);
  }
}

const memory = new MemoryStore();
const real = process.env.REDIS_URL ? new RealRedisStore(process.env.REDIS_URL) : null;

export const store: Store = real ?? memory;
export const redisMode: "memory" | "redis" = real ? "redis" : "memory";
