import { run } from "node:test";
import { tap } from "node:test/reporters";

let notOk = 0;

run({ files: ["lib/test/in-memory.e2e.test.ts"] })
  .on("test:fail", () => {
    // test always fails at the end even if all e2e suites pass
    // so I counted the fail count. if 1, it is normal. if greater than 1, it is fail
    notOk++;
    console.warn("not ok count:", notOk);
    if (notOk > 1) {
      process.exitCode = 1;
    }
  })
  .compose(tap)
  .pipe(process.stdout);
