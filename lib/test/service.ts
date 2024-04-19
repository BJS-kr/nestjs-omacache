import { Injectable } from "@nestjs/common";
import { sleep } from "./util";
import { InMemCache, RedisCache, AnotherRedisCache } from "./cache.decorator";

@Injectable()
export class InMemTestService {
  @InMemCache({
    key: "cacheableTask1",
    kind: "temporal",
    ttl: 3,
  })
  async cacheableTask1() {
    await sleep(1000);
    return true;
  }

  async cacheableTask2() {
    await sleep(1000);
    return true;
  }

  @InMemCache({
    key: "cacheableTask3",
    kind: "temporal",
    ttl: 3,
  })
  async notCacheableTask() {
    await sleep(1000);
    return true;
  }

  @InMemCache({
    key: "test3",
    kind: "temporal",
    ttl: 3,
    paramIndex: [0],
  })
  async cacheableTaskWithArrayParam(param: any[]) {
    await sleep(1000);
    return param.join("");
  }
}

@Injectable()
export class RedisTestService {
  @RedisCache({
    key: "cacheableTask1",
    kind: "temporal",
    ttl: 300,
  })
  async cacheableTask1() {
    await sleep(1000);
    return true;
  }

  async cacheableTask2() {
    await sleep(1000);
    return true;
  }

  @RedisCache({
    key: "cacheableTask3",
    kind: "temporal",
    ttl: 300,
  })
  async notCacheableTask() {
    await sleep(1000);
    return true;
  }
}

@Injectable()
export class AnotherRedisTestService {
  @AnotherRedisCache({
    key: "cacheableTask1",
    kind: "temporal",
    ttl: 300,
  })
  async cacheableTask1() {
    await sleep(1000);
    return true;
  }

  async cacheableTask2() {
    await sleep(1000);
    return true;
  }

  @AnotherRedisCache({
    key: "cacheableTask3",
    kind: "temporal",
    ttl: 300,
  })
  async notCacheableTask() {
    await sleep(1000);
    return true;
  }
}
