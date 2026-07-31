import type { Ok, Err } from "./results/index.ts";

export type ErrorKind<E extends { kind: number }> = E["kind"];

export type ErrorOfKind<E extends { kind: number }, Kind extends ErrorKind<E>> = E extends unknown
  ? Kind extends E["kind"]
    ? E & { kind: Kind }
    : never
  : never;

export type Result<T, E extends { kind: number }> = Ok<T> | Err<E>;
