import { LRUCache } from "lru-cache";
import { ICacheStorage } from "./types";
import { DAY } from "./time.constants";

export class DefaultStorage implements ICacheStorage {
  constructor(size: number = 1000, ttl: number = DAY) {
    this.#storage = new LRUCache({
      max: size,
      ttl,
    });
  }
  #storage: LRUCache<any, any>;

  get(key: string) {
    return this.#storage.get(key);
  }

  set(key: string, value: any, ttl?: number) {
    this.#storage.set(key, value, {
      ttl,
    });
  }

  delete(key: string) {
    return this.#storage.delete(key);
  }

  has(key: string) {
    return this.#storage.has(key);
  }

  clear() {
    this.#storage.clear();
  }
}
