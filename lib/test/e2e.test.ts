import request from "supertest";
import { describe, it, before, after } from "node:test";
import { equal } from "node:assert/strict";
import { Test } from "@nestjs/testing";
import { TestService } from "./service";
import { HttpServer, INestApplication } from "@nestjs/common";
import { sleep } from "./util";
import { CacheModule } from "../cache.module";
import { TestController } from "./controller";

const lessThan = (a: number, b: number) => equal(a < b, true);
const biggerThan = (a: number, b: number) => equal(a > b, true);

describe("e2e test of cache decorator", () => {
  let httpServer: HttpServer;
  let app: INestApplication;
  before(async () => {
    // start server
    const moduleRef = await Test.createTestingModule({
      imports: [CacheModule],
      controllers: [TestController],
      providers: [TestService],
    }).compile();

    const app = moduleRef.createNestApplication();

    await app.init();
    httpServer = app.getHttpServer();
  });

  it("should return immediately(set on start). test1 route", async () => {
    // give time to server execute and set cache...
    await sleep(1000);

    const start = Date.now();
    const response = await request(httpServer).get("/test1");
    const diff = Date.now() - start;

    equal(response.status, 200);
    equal(response.text, "test1");
    lessThan(diff, 50);
  });

  it("should return immediately(set on start) modified value. test2 route", async () => {
    // give time to server refresh cache...
    await sleep(3000);

    const start = Date.now();
    const response = await request(httpServer).get("/test2");
    const diff = Date.now() - start;

    equal(response.status, 200);
    equal(response.text, "modified test2");
    lessThan(diff, 50);
  });

  it("should return deferred value. because persistent cache busted", async () => {
    await request(httpServer).get("/test2/bust");
    const start = Date.now();
    const response = await request(httpServer).get("/test2");
    const diff = Date.now() - start;

    biggerThan(diff, 1000);
    equal(response.text, "modified test2");
  });

  it("even if cache value busted, it will automatically invoked internally, so request can get cached value", async () => {
    await request(httpServer).get("/test2/bust");
    await sleep(1050); // execution time 1 second + invoking time 50ms

    const start = Date.now();
    const response = await request(httpServer).get("/test2");
    const diff = Date.now() - start;

    lessThan(diff, 50);
    equal(response.text, "modified test2");
  });

  it("should return deferred value at first, then return cached value immediately", async () => {
    const start = Date.now();
    const response = await request(httpServer).get(
      "/test3/paramValue?query=queryValue"
    );
    const diff = Date.now() - start;

    biggerThan(diff, 1000);
    equal(response.text, "test3paramValuequeryValue");

    const start2 = Date.now();
    const response2 = await request(httpServer).get(
      "/test3/paramValue?query=queryValue"
    );
    const diff2 = Date.now() - start2;

    lessThan(diff2, 50);
    equal(response2.text, "test3paramValuequeryValue");
  });

  it("should return both deferred value if referenced value is different(parameter combined cache)", async () => {
    const start = Date.now();
    const response = await request(httpServer).get(
      "/test3/param1?query=query1"
    );
    const diff = Date.now() - start;

    biggerThan(diff, 1000);
    equal(response.text, "test3param1query1");

    const start2 = Date.now();
    const response2 = await request(httpServer).get(
      "/test3/param2?query=query1"
    );
    const diff2 = Date.now() - start2;

    biggerThan(diff2, 1000);
    equal(response2.text, "test3param2query1");
  });

  it("should cache injectable partially so whole Request-Response cycle can divided into optimizable sections", async () => {
    const rawStart = Date.now();
    const response = await request(httpServer).get("/test4");
    const diff = Date.now() - rawStart;

    biggerThan(diff, 3000);
    equal(response.text, "test4");

    const start = Date.now();
    const response2 = await request(httpServer).get("/test4");
    const diff2 = Date.now() - start;

    biggerThan(diff2, 1000);
    lessThan(diff2, 1100);
    equal(response2.text, "test4");
  });

  after(() => {
    app.close();
    httpServer.close();
  });
});
