import type { Ok, Err } from "./results/index.ts";

export type Result<T, E extends { kind: number }> = Ok<T> | Err<E>;
