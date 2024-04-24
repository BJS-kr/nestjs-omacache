import { ICacheStorage } from "../dist";

export class DefaultStorage implements ICacheStorage {
  #storage: Map<string, any> = new Map();
  #timeouts: Map<string, NodeJS.Timeout> = new Map();

  get(key: string) {
    return this.#storage.get(key);
  }

  set(key: string, value: any, ttl?: number) {
    if (ttl && ttl > 0) {
      const timeout = setTimeout(() => {
        this.delete(key);
      }, ttl);

      this.#timeouts.set(key, timeout);
    }

    this.#storage.set(key, value);
  }

  delete(key: string) {
    const timer = this.#timeouts.get(key);

    if (timer) {
      clearTimeout(timer);
    }

    return this.#storage.delete(key);
  }

  has(key: string) {
    return this.#storage.has(key);
  }

  clear() {
    for (const timeout of this.#timeouts.values()) {
      clearTimeout(timeout);
    }

    this.#storage.clear();
  }
}
