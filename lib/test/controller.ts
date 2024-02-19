import {Body, Controller, Get, Param, Post, Query} from "@nestjs/common";
import { sleep, startTime } from "./util";
import { InMemCache } from "./cache.decorator";
import { TestService } from "./service";

@Controller()
export class TestController {
  constructor(private readonly testService: TestService) {}
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

  @Get("test3/:param")
  @InMemCache({
    key: "test3",
    kind: "temporal",
    ttl: 3,
    paramIndex: [0, 1],
  })
  async test3(@Param("param") param: string, @Query("query") query: string) {
    await sleep(1000);

    return "test3" + param + query;
  }

  @Post("test3")
  @InMemCache({
      key: "test3",
      kind: "temporal",
      ttl: 3,
      paramIndex: [0],
  })
  async test3post(@Body() body: {[key: string]: any}) {
    await sleep(1000);

    return "test3" + Object.keys(body).join("");
  }

  @Get("test3/bust")
  @InMemCache({
    key: "test3",
    kind: "bust",
  })
  async test3bust() {}

  @Get("test4")
  async partiallyCached() {
    await this.testService.cacheableTask1();
    await this.testService.notCacheableTask();
    await this.testService.cacheableTask2();

    return "test4";
  }
}
