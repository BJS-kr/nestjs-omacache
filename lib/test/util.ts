import { equal } from "node:assert/strict";

export const startTime = Date.now();
export const sleep = (ms: number) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
export const lessThan = (input: number, expected: number) => {
  console.log("input: ", input, "expected: ", expected);
  equal(input < expected, true);
};
export const biggerThan = (input: number, expected: number) => {
  console.log("input: ", input, "expected: ", expected);
  equal(input > expected, true);
};
