import request from "supertest";
import { after, before, describe, it } from "node:test";
import { equal } from "node:assert/strict";
import { Test } from "@nestjs/testing";
import { AnotherRedisTestService, RedisTestService } from "./service";
import { HttpServer, INestApplication } from "@nestjs/common";
import { biggerThan, lessThan, sleep } from "./util";
import { CacheModule } from "../cache.module";
import { AnotherRedisTestController, RedisTestController } from "./controller";
import { createClient } from "redis";

describe("e2e-external-storage", () => {
  let app: INestApplication;
  let httpServer: HttpServer;
  let anotherApp: INestApplication;
  let anotherHttpServer: HttpServer;

  const redisClient = createClient({
    url: "redis://localhost:6379",
    name: "test",
  });
  redisClient.connect();

  before(async () => {
    await redisClient.flushDb();

    const moduleRef = await Test.createTestingModule({
      imports: [CacheModule],
      controllers: [RedisTestController],
      providers: [RedisTestService],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
    httpServer = app.getHttpServer();

    const moduleRef2 = await Test.createTestingModule({
      imports: [CacheModule],
      controllers: [AnotherRedisTestController],
      providers: [AnotherRedisTestService],
    }).compile();
    anotherApp = moduleRef2.createNestApplication();
    await anotherApp.init();
    anotherHttpServer = anotherApp.getHttpServer();
  });

  after(async () => {
    await redisClient.flushDb();
    await app.close();
    await anotherApp.close();
  });

  describe("RedisCache", () => {
    it("should return immediately(set on start). RedisTest1 route", async () => {
      // give time to server execute and set cache...
      await sleep(1000);

      const start = Date.now();
      const response = await request(httpServer).get("/RedisTest1");
      const diff = Date.now() - start;

      equal(response.status, 200);
      equal(response.text, "RedisTest1");
      lessThan(diff, 50);
    });

    it("should return immediately(set on start) modified value. RedisTest2 route", async () => {
      // give time to server refresh cache...
      await sleep(3000);

      const start = Date.now();
      const response = await request(httpServer).get("/RedisTest2");
      const diff = Date.now() - start;

      equal(response.status, 200);
      equal(response.text, "modified RedisTest2");
      lessThan(diff, 50);
    });

    it("should return deferred value. because persistent cache busted", async () => {
      await request(httpServer).get("/RedisTest2/bust");
      const start = Date.now();
      const response = await request(httpServer).get("/RedisTest2");
      const diff = Date.now() - start;

      biggerThan(diff, 1000);
      equal(response.text, "modified RedisTest2");
    });

    it("even if cache value busted, it will automatically invoked internally, so request can get cached value", async () => {
      await request(httpServer).get("/RedisTest2/bust");
      await sleep(1050); // execution time 1 second + invoking time 50ms

      const start = Date.now();
      const response = await request(httpServer).get("/RedisTest2");
      const diff = Date.now() - start;

      lessThan(diff, 50);
      equal(response.text, "modified RedisTest2");
    });

    it("should return deferred value at first, then return cached value immediately", async () => {
      const start = Date.now();
      const response = await request(httpServer).get(
        "/RedisTest3/paramValue?query=queryValue"
      );
      const diff = Date.now() - start;

      biggerThan(diff, 1000);
      equal(response.text, "RedisTest3paramValuequeryValue");

      const start2 = Date.now();
      const response2 = await request(httpServer).get(
        "/RedisTest3/paramValue?query=queryValue"
      );
      const diff2 = Date.now() - start2;

      lessThan(diff2, 50);
      equal(response2.text, "RedisTest3paramValuequeryValue");
    });

    it("should return both deferred value if referenced value is different(parameter combined cache)", async () => {
      const start = Date.now();
      const response = await request(httpServer).get(
        "/RedisTest3/param1?query=query1"
      );
      const diff = Date.now() - start;

      biggerThan(diff, 1000);
      equal(response.text, "RedisTest3param1query1");

      const start2 = Date.now();
      const response2 = await request(httpServer).get(
        "/RedisTest3/param2?query=query1"
      );
      const diff2 = Date.now() - start2;

      biggerThan(diff2, 1000);
      equal(response2.text, "RedisTest3param2query1");
    });

    it("should cache injectable partially so whole Request-Response cycle can divided into optimizable sections", async () => {
      const rawStart = Date.now();
      const response = await request(httpServer).get("/RedisTest4");
      const diff = Date.now() - rawStart;

      biggerThan(diff, 3000);
      equal(response.text, "RedisTest4");

      const start = Date.now();
      const response2 = await request(httpServer).get("/RedisTest4");
      const diff2 = Date.now() - start;

      biggerThan(diff2, 1000);
      lessThan(diff2, 1100);
      equal(response2.text, "RedisTest4");
    });
  });

  describe("RedisCache shared by two different servers", () => {
    before(async () => {
      await redisClient.flushDb();
      // mock set on start
      await Promise.all([
        request(httpServer).get("/RedisTest1"),
        request(httpServer).get("/RedisTest2"),
      ]);
    });

    it("should return cached value for the same cache key, even if request is sent by another server", async () => {
      const start = Date.now();
      const response = await request(anotherHttpServer).get(
        "/AnotherRedisTest1"
      );
      const diff = Date.now() - start;

      lessThan(diff, 50);
      equal(response.text, "RedisTest1");
    });

    it("should bust cache for the same cache key, even if request is sent by another server", async () => {
      const start = Date.now();
      const response = await request(anotherHttpServer).get(
        "/AnotherRedisTest3-1"
      );
      const diff = Date.now() - start;
      biggerThan(diff, 1000);
      equal(response.text, "RedisTest3-1");

      const start2 = Date.now();
      const response2 = await request(httpServer).get("/RedisTest3-1");
      const diff2 = Date.now() - start2;
      lessThan(diff2, 50);
      equal(response2.text, "RedisTest3-1");

      await request(httpServer).get("/RedisTest3-1/bust");

      const start3 = Date.now();
      const response3 = await request(httpServer).get("/RedisTest3-1");
      const diff3 = Date.now() - start3;
      biggerThan(diff3, 1000);
      equal(response3.text, "RedisTest3-1");
    });

    it("should should bust all param based cache with a key if bustAllChildren is true", async () => {
      const startAB1 = Date.now();
      const responseAB1 = await request(httpServer).get(
        "/RedisTest3/A?query=B"
      );
      biggerThan(Date.now() - startAB1, 1000);
      equal(responseAB1.text, "RedisTest3AB");

      const startCD1 = Date.now();
      const responseCD1 = await request(anotherHttpServer).get(
        "/AnotherRedisTest3/C?query=D"
      );
      biggerThan(Date.now() - startCD1, 1000);
      equal(responseCD1.text, "RedisTest3CD");

      const startAB2 = Date.now();
      const responseAB2 = await request(anotherHttpServer).get(
        "/AnotherRedisTest3/A?query=B"
      );
      lessThan(Date.now() - startAB2, 50);
      equal(responseAB2.text, "RedisTest3AB");

      const startCD2 = Date.now();
      const responseCD2 = await request(httpServer).get(
        "/RedisTest3/C?query=D"
      );
      lessThan(Date.now() - startCD2, 50);
      equal(responseCD2.text, "RedisTest3CD");

      /* bust all cache */
      await request(httpServer).get("/RedisTest3bust");
      await sleep(2000);

      const startAB3 = Date.now();
      const responseAB3 = await request(httpServer).get(
        "/RedisTest3/A?query=B"
      );
      biggerThan(Date.now() - startAB3, 1000);
      equal(responseAB3.text, "RedisTest3AB");

      const startCD3 = Date.now();
      const responseCD3 = await request(anotherHttpServer).get(
        "/AnotherRedisTest3/C?query=D"
      );
      biggerThan(Date.now() - startCD3, 1000);
      equal(responseCD3.text, "RedisTest3CD");
    });

    it("should cache injectable partially so whole Request-Response cycle can divided into optimizable sections", async () => {
      const rawStart = Date.now();
      const response = await request(httpServer).get("/RedisTest4");
      const diff = Date.now() - rawStart;

      biggerThan(diff, 3000);
      equal(response.text, "RedisTest4");

      const start = Date.now();
      const response2 = await request(anotherHttpServer).get(
        "/AnotherRedisTest4"
      );
      const diff2 = Date.now() - start;

      biggerThan(diff2, 1000);
      lessThan(diff2, 1100);
      equal(response2.text, "RedisTest4");
    });
  });
});
