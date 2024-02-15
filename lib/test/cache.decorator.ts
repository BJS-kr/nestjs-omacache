import { Cache } from "../cache";
import { createClient } from "redis";
import {ICacheStorage} from "../types";

export const InMemCache = Cache({ storage: new Map() });

export class RedisCacheStorage implements ICacheStorage {
    private client

    constructor() {
        this.client = createClient({ url: 'redis://localhost:6379' });
        this.client.connect();
    }

    async get(key: string): Promise<any> {
        const value = await this.client.get(key);
        try {
            return JSON.parse(value);
        } catch (error) {
            // 파싱에 실패한 경우, 원래의 문자열 값 반환
            return value;
        }
    }

    async set(key: string, value: any, ttl?: number): Promise<void> {
        const stringValue = JSON.stringify(value);
        if (ttl) {
            await this.client.setEx(key, ttl, stringValue);
        } else {
            await this.client.set(key, stringValue);
        }
    }

    async delete(key: string): Promise<boolean> {
        const result = await this.client.del(key);
        return result === 1;
    }

    async has(key: string): Promise<boolean> {
        const result = await this.client.exists(key);
        return result === 1;
    }
}


export const RedisCache = Cache({ storage: new RedisCacheStorage() });
