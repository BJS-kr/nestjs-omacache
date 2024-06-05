import { Controller, Get, Param, Query } from "@nestjs/common";
import { AnotherRedisCache, RedisCache } from "./redis.dcorator";
import { sleep, startTime } from "./util";
import { SECOND } from "../time.constants";
import { AnotherRedisTestService, RedisTestService } from "./redis.service";

@Controller()
export class RedisTestController {
  constructor(private readonly testService: RedisTestService) {}

  @Get("RedisTest1")
  @RedisCache({
    key: "RedisTest1",
    kind: "persistent",
  })
  async RedisTest1() {
    await sleep(1000);

    return "RedisTest1";
  }

  @Get("RedisTest2")
  @RedisCache({
    key: "RedisTest2",
    kind: "persistent",
    refreshIntervalSec: 2,
  })
  async RedisTest2() {
    await sleep(1000);

    if (Date.now() - startTime > 3000) {
      return "modified RedisTest2";
    } else {
      return "RedisTest2";
    }
  }

  @Get("RedisTest2/bust")
  @RedisCache({
    key: "RedisTest2",
    kind: "bust",
  })
  async RedisTest2bust() {}

  @Get("RedisTest3/:param")
  @RedisCache({
    key: "RedisTest3",
    kind: "temporal",
    ttl: 300 * SECOND,
    paramIndex: [0, 1],
  })
  async RedisTest3(
    @Param("param") param: string,
    @Query("query") query: string
  ) {
    await sleep(1000);

    return "RedisTest3" + param + query;
  }

  @Get("RedisTest3bust")
  @RedisCache({
    key: "RedisTest3",
    kind: "bust",
    bustAllChildren: true,
  })
  async RedisTest3bust() {}

  @Get("RedisTest3-1")
  @AnotherRedisCache({
    key: "RedisTest3-1",
    kind: "temporal",
    ttl: 300 * SECOND,
  })
  async RedisTest3_1() {
    await sleep(1000);
    return "RedisTest3-1";
  }

  @Get("RedisTest3-1/bust")
  @AnotherRedisCache({
    key: "RedisTest3-1",
    kind: "bust",
  })
  async RedisTest3_1bust() {}

  @Get("RedisTest4")
  async partiallyCached() {
    await this.testService.cacheableTask1();
    await this.testService.notCacheableTask();
    await this.testService.cacheableTask2();

    return "RedisTest4";
  }
}

@Controller()
export class AnotherRedisTestController {
  constructor(private readonly testService: AnotherRedisTestService) {}

  @Get("AnotherRedisTest1")
  @AnotherRedisCache({
    key: "RedisTest1",
    kind: "persistent",
  })
  async RedisTest1() {
    await sleep(1000);

    return "RedisTest1";
  }

  @Get("AnotherRedisTest2")
  @AnotherRedisCache({
    key: "RedisTest2",
    kind: "persistent",
    refreshIntervalSec: 2,
  })
  async RedisTest2() {
    await sleep(1000);

    if (Date.now() - startTime > 3000) {
      return "modified RedisTest2";
    } else {
      return "RedisTest2";
    }
  }

  @Get("AnotherRedisTest2/bust")
  @AnotherRedisCache({
    key: "RedisTest2",
    kind: "bust",
  })
  async RedisTest2bust() {}

  @Get("AnotherRedisTest3/:param")
  @AnotherRedisCache({
    key: "RedisTest3",
    kind: "temporal",
    ttl: 300 * SECOND,
    paramIndex: [0, 1],
  })
  async RedisTest3(
    @Param("param") param: string,
    @Query("query") query: string
  ) {
    await sleep(1000);

    return "RedisTest3" + param + query;
  }

  @Get("AnotherRedisTest3bust")
  @AnotherRedisCache({
    key: "RedisTest3",
    kind: "bust",
    bustAllChildren: true,
  })
  async RedisTest3bust() {}

  @Get("AnotherRedisTest3-1")
  @AnotherRedisCache({
    key: "RedisTest3-1",
    kind: "temporal",
    ttl: 300 * SECOND,
  })
  async RedisTest3_1() {
    await sleep(1000);
    return "RedisTest3-1";
  }

  @Get("AnotherRedisTest3-1/bust")
  @AnotherRedisCache({
    key: "RedisTest3-1",
    kind: "bust",
  })
  async RedisTest3_1bust() {}

  @Get("AnotherRedisTest4")
  async partiallyCached() {
    await this.testService.cacheableTask1();
    await this.testService.notCacheableTask();
    await this.testService.cacheableTask2();

    return "RedisTest4";
  }
}
