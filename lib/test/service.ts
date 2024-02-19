import { Injectable } from "@nestjs/common";
import { sleep } from "./util";
import { InMemCache } from "./cache.decorator";

@Injectable()
export class TestService {
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
  async cacheableTaskwithArrayParam(param: any[]) {
    await sleep(1000);
    return param.join("");
  }
}
