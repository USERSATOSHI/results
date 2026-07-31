import { describe, it, expect } from "bun:test";
import { Ok, Err, BaseResult, ResultError } from "../src/results/index.ts";
import { ok, err, fromPromise, fromAsync, safeCall } from "../src/index.ts";

enum TestError {
  ErrorA,
  ErrorB,
  ErrorC,
}

describe("Ok/Err basic", () => {
  it("Ok stores value and unwrap works", () => {
    const o = new Ok(1);
    expect(o.isOk()).toBe(true);
    expect(o.isErr()).toBe(false);
    expect(o.unwrap()).toBe(1);
  });

  it("Err stores error and unwrap throws", () => {
    const e = new Err({ kind: TestError.ErrorA, msg: "no" });
    expect(e.isErr()).toBe(true);
    expect(e.isOk()).toBe(false);
    expect(() => e.unwrap()).toThrow(ResultError);
    expect(e.unwrapOr(42)).toBe(42);
  });
});

describe("map / mapErr / match", () => {
  it("map transforms Ok synchronously and asynchronously", async () => {
    const o = new Ok(2);
    const m = o.map((v) => v + 1);
    expect(m.isOk()).toBe(true);
    expect(m.unwrap()).toBe(3);

    const ma = await o.map(async (v) => v + 2);
    expect(ma.isOk()).toBe(true);
    expect(ma.unwrap()).toBe(4);
  });

  it("map on Err propagates error", () => {
    const e = new Err({ kind: TestError.ErrorB });
    const m = e.map((v) => (v as number) + 1);
    expect(m.isErr()).toBe(true);
  });

  it("mapErr transforms Err", async () => {
    const e = new Err({ kind: 3, msg: "bad" });
    const me = e.mapErr((err) => {
      return {
        kind: 99,
        msg: err.msg,
      };
    });
    expect(me.isErr()).toBe(true);
    expect(me.error!.kind).toBe(99);

    const mea = await e.mapErr(async (err) => ({
      kind: 100,
      info: err.msg,
    }));
    expect(mea.isErr()).toBe(true);
    expect(mea.error!.kind).toBe(100);
  });

  it("match picks correct branch", () => {
    const o = new Ok(5);
    const r1 = o.match(
      (v) => v * 2,
      () => 0,
    );
    expect(r1).toBe(10);

    const e = new Err({ kind: 7 });
    const r2 = e.match(
      () => 1,
      (err) => err.kind,
    );
    expect(r2).toBe(7);
  });

  it("match handles an Ok containing undefined", () => {
    const result = new Ok(undefined);
    const matched = result.match(
      () => "ok",
      () => "err",
    );

    expect(matched).toBe("ok");
    expect(result.unwrap()).toBeUndefined();
    expect(result.unwrapOr("fallback")).toBeUndefined();
    expect(result.map(() => "mapped").unwrap()).toBe("mapped");
    expect(result.andThen(() => new Ok("chained")).unwrap()).toBe("chained");
  });
});

describe("andThen / orElse chaining", () => {
  it("andThen chains synchronous functions", () => {
    const o = new Ok(1);
    const chained = o.andThen((v) => new Ok(v + 3));
    expect(chained.isOk()).toBe(true);
    expect(chained.unwrap()).toBe(4);
  });

  it("andThen handles async functions", async () => {
    const o = new Ok(2);
    const chained = await o.andThen(async (v) => new Ok(v + 4));
    expect(chained.isOk()).toBe(true);
    expect(chained.unwrap()).toBe(6);
  });

  it("orElse recovers from Err", () => {
    const e = new Err({ kind: 8 });
    const recovered = e.orElse((err) => {
      console.log("Recovering from error:", err);
      const ok = new Ok(99);
      return ok;
    });
    expect(recovered.isOk()).toBe(true);
    expect(recovered.unwrap()).toBe(99);
  });
});

describe("static helpers all / any", () => {
  it("all collects multiple Ok results", () => {
    const res = BaseResult.all([new Ok(1), new Ok(2)] as any);
    expect(res.isOk()).toBe(true);
    expect(res.unwrap()).toEqual([1, 2]);
  });

  it("all returns first Err", () => {
    const res = BaseResult.all([new Ok(1), new Err({ kind: 5 })] as any);
    expect(res.isErr()).toBe(true);
  });

  it("all handles promises", async () => {
    const res = await BaseResult.all([Promise.resolve(new Ok(3)), Promise.resolve(new Ok(4))]);
    expect(res.isOk()).toBe(true);
    expect(res.unwrap()).toEqual([3, 4]);
  });

  it("any returns first Ok or last Err", () => {
    const any1 = BaseResult.any([new Err({ kind: 1 }), new Ok(10)] as any);
    expect(any1.isOk()).toBe(true);
    expect(any1.unwrap()).toBe(10);

    const any2 = BaseResult.any([new Err({ kind: 1 }), new Err({ kind: 2 })] as any);
    expect(any2.isErr()).toBe(true);
    expect(any2.error!.kind).toBe(2);
  });
});

describe("helpers in src/index.ts", () => {
  it("ok() and err() constructors", () => {
    const o = ok(12);
    expect(o.isOk()).toBe(true);
    expect(o.unwrap()).toBe(12);

    const e = err({ kind: 9 });
    expect(e.isErr()).toBe(true);
    expect(e.error!.kind).toBe(9);
  });

  it("fromPromise resolves and rejects into Results", async () => {
    const good = await fromPromise(Promise.resolve(2), () => ({ kind: 1 }));
    expect(good.isOk()).toBe(true);

    const bad = await fromPromise(Promise.reject("nope"), (e) => ({
      kind: 2,
      why: String(e),
    }));
    expect(bad.isErr()).toBe(true);
  });

  it("fromAsync captures thrown errors", async () => {
    const r = await fromAsync(
      async () => {
        throw "boom";
      },
      () => ({ kind: 7 }),
    );
    expect(r.isErr()).toBe(true);
  });

  it("safeCall handles sync value, sync throw, promise, and promise-returning fn", async () => {
    const s1 = safeCall(
      () => 3,
      () => ({ kind: 1 }),
    );
    expect((s1 as any).isOk()).toBe(true);

    const s2 = safeCall(
      () => {
        throw "err";
      },
      (e) => ({ kind: 2, msg: String(e) }),
    );
    expect((s2 as any).isErr()).toBe(true);

    const s3 = await safeCall(Promise.resolve(5), () => ({ kind: 1 }));
    expect(s3.isOk()).toBe(true);

    const s4 = await safeCall(
      async () => 6,
      () => ({ kind: 1 }),
    );
    expect(s4.isOk()).toBe(true);
  });
});
