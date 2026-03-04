import { Ok, Err } from "./results/index.ts";
import type { Result } from "./types.ts";

/**
 * Create an `Ok` result wrapping `value`.
 *
 * @typeParam T - success value type
 * @typeParam E - error type (defaults to `never`)
 * @param value - the successful value to wrap
 * @returns an `Ok<T, E>` instance
 */
export function ok<T, E extends { kind: number } = never>(value: T): Ok<T, E> {
	return new Ok<T, E>(value);
}

/**
 * Create an `Err` result wrapping `error`.
 *
 * @typeParam T - success type (defaults to `never`)
 * @typeParam E - error type
 * @param error - the error value to wrap
 * @returns an `Err<T, E>` instance
 */
export function err<const K extends number,T = never, const E extends { kind: K } = never>(
	error: E,
): Err<T, E> {
	return new Err<T, E>(error);
}

/**
 * Convert a `Promise<T>` into a `Promise<Result<T, E>>`.
 *
 * Resolves to `Ok<T, E>` when the promise fulfills, or to `Err<T, E>`
 * when it rejects after mapping the rejection with `onErr`.
 *
 * @param promise - the promise to observe
 * @param onErr - maps a thrown value to an error object of type `E`
 * @returns a `Promise<Result<T, E>>`
 */
export async function fromPromise<T, E extends { kind: number }>(
	promise: Promise<T>,
	onErr: (error: unknown) => E,
): Promise<Result<T, E>> {
	try {
		return ok<T, E>(await promise);
	} catch (error) {
		return err<T, E>(onErr(error));
	}
}

/**
 * Helper to run an async function and capture errors as a `Result`.
 *
 * Equivalent to `fromPromise(fn(), onErr)` but convenient for passing
 * a function instead of a promise value.
 *
 * @param fn - async function producing `T`
 * @param onErr - maps thrown values to an error of type `E`
 * @returns a `Promise<Result<T, E>>`
 */
export async function fromAsync<T, E extends { kind: number }>(
	fn: () => Promise<T>,
	onErr: (error: unknown) => E,
): Promise<Result<T, E>> {
	return fromPromise(fn(), onErr);
}

/**
 * Safely call a value, function, or promise and capture exceptions as `Result`.
 *
 * Overloads:
 * - `safeCall(promise, onErr)` -> `Promise<Result<T, E>>`
 * - `safeCall(fn, onErr)` -> `Result<T, E>` or `Promise<Result<T, E>>` (if `fn` returns a promise)
 *
 * `onErr` is used to map thrown or rejected values into a typed error `E`.
 *
 * @param fn - a value, sync function, async function, or a promise
 * @param onErr - maps thrown/rejected values into `E`
 * @returns a `Result<T, E>` or `Promise<Result<T, E>>` depending on the input
 */
export function safeCall<T, E extends { kind: number }>(
	fn: Promise<T>,
	onErr: (error: unknown) => E,
): Promise<Result<T, E>>;
export function safeCall<T, E extends { kind: number }>(
	fn: () => T,
	onErr: (error: unknown) => E,
): Result<T, E>;
export function safeCall<T, E extends { kind: number }>(
	fn: () => Promise<T>,
	onErr: (error: unknown) => E,
): Promise<Result<T, E>>;
export function safeCall<T, E extends { kind: number }>(
	fn: (() => T) | (() => Promise<T>) | Promise<T>,
	onErr: (error: unknown) => E,
): Result<T, E> | Promise<Result<T, E>> {
	if (fn instanceof Promise) {
		return fromPromise(fn, onErr);
	}

	try {
		const result = fn();
		if (result instanceof Promise) {
			return fromPromise(result, onErr);
		}

		return ok<T, E>(result);
	} catch (error) {
		return err<T, E>(onErr(error));
	}
}


export * from "./results/index.ts";
export * from './types.ts';