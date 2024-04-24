import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import { sleep, startTime } from "./util";
import { InMemCache, RedisCache, AnotherRedisCache } from "./cache.decorator";
import {
  AnotherRedisTestService,
  InMemTestService,
  RedisTestService,
} from "./service";
import { SECOND } from "../time.constants";
@Controller()
export class InMemTestController {
  constructor(private readonly testService: InMemTestService) {}
  @Get("test1")
  @InMemCache({
    key: "test1",
    kind: "persistent",
  })
  async test1() {
    await sleep(1000);

    return "test1";
  }

  @Get("test2")
  @InMemCache({
    key: "test2",
    kind: "persistent",
    refreshIntervalSec: 2,
  })
  async test2() {
    await sleep(1000);

    if (Date.now() - startTime > 3000) {
      return "modified test2";
    } else {
      return "test2";
    }
  }

  @Get("test2/bust")
  @InMemCache({
    key: "test2",
    kind: "bust",
  })
  async test2bust() {}

  @Get("test3/noParam")
  @InMemCache({
    key: "test3",
    kind: "temporal",
    ttl: 300 * SECOND,
  })
  async test3() {
    await sleep(1000);

    return "test3";
  }

  @Get("test3/withParam/:param")
  @InMemCache({
    key: "test3",
    kind: "temporal",
    ttl: 300 * SECOND,
    paramIndex: [0, 1],
  })
  async test3param(
    @Param("param") param: string,
    @Query("query") query: string
  ) {
    await sleep(1000);

    return "test3" + param + query;
  }

  @Post("test3")
  @InMemCache({
    key: "test3",
    kind: "temporal",
    ttl: 300 * SECOND,
    paramIndex: [0],
  })
  async test3post(@Body() body: { [key: string]: any }) {
    await sleep(1000);

    return "test3" + Object.keys(body).join("");
  }

  @Get("test3/bust")
  @InMemCache({
    key: "test3",
    kind: "bust",
  })
  async test3bust() {}

  @Get("test3/rootKeyBust")
  @InMemCache({
    key: "test3",
    kind: "bust",
    bustAllChildren: true,
  })
  async test3RootKeyBust() {}

  @Get("test4")
  async partiallyCached() {
    await this.testService.cacheableTask1();
    await this.testService.notCacheableTask();
    await this.testService.cacheableTask2();

    return "test4";
  }

  @InMemCache({
    key: "test5",
    kind: "persistent",
  })
  @Get("test5")
  async reverseOrderDecorator() {
    await sleep(1000);

    return "test5";
  }

  @InMemCache({
    key: "test6",
    kind: "temporal",
    ttl: 300 * SECOND,
  })
  @Get("test6")
  async test6() {
    await sleep(1000);

    return "test6";
  }

  @InMemCache({
    key: "under_test6",
    kind: "temporal",
    ttl: 300 * SECOND,
  })
  @Get("under_test6")
  async underTest6() {
    await sleep(1000);

    return "under_test6";
  }

  @Patch("test6/bust")
  @InMemCache({
    key: "test6",
    kind: "bust",
    addition: [
      {
        key: "under_test6",
      },
    ],
  })
  async test6bust() {}
}

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
