import { equal } from "node:assert/strict";

export const startTime = Date.now();
export const sleep = (ms: number) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
export const lessThan = (a: number, b: number) => equal(a < b, true);
export const biggerThan = (a: number, b: number) => equal(a > b, true);