import type { Result } from "../types.ts";

/**
 * Error thrown when attempting to extract a value from an `Err` result.
 */
export class ResultError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "ResultError";
	}
}

/**
 * Base implementation of a Rust-like `Result` type.
 *
 * `success === true` represents `Ok<T>` and `success === false` represents
 * `Err<E>`. Concrete variants are implemented by {@link Ok} and {@link Err}.
 */
export abstract class BaseResult<T, E extends { kind: number }> {
	/** `true` when this instance is an {@link Ok}. */
	abstract readonly success: boolean;
	/** The success value when present. */
	abstract readonly value?: T;
	/** The error value when present. */
	abstract readonly error?: E;

	/**
	 * Collects an array of results into a single result.
	 *
	 * Returns the first `Err` encountered, or `Ok<T[]>` when all succeed.
	 */
	static all<T, E extends { kind: number }>(
		results: Result<T, E>[],
	): Result<T[], E>;
	/**
	 * Async overload of {@link BaseResult.all}.
	 */
	static all<T, E extends { kind: number }>(
		promises: Promise<Result<T, E>>[],
	): Promise<Result<T[], E>>;
	static all<T, E extends { kind: number }>(
		results: Result<T, E>[] | Promise<Result<T, E>>[],
	): Result<T[], E> | Promise<Result<T[], E>> {
		if (results.length > 0 && results[0] instanceof Promise) {
			return Promise.all(results as Promise<Result<T, E>>[]).then(
				(resolved) => BaseResult.all<T, E>(resolved),
			);
		}
		const values: T[] = [];
		for (const result of results as Result<T, E>[]) {
			if (result.isErr()) return new Err<E>(result.error!);
			values.push(result.value!);
		}
		return new Ok<T[]>(values);
	}

	/**
	 * Returns the first successful result.
	 *
	 * If all results are errors, returns the last encountered `Err`.
	 */
	static any<T, E extends { kind: number }>(
		results: Result<T, E>[],
	): Result<T, E>;
	/**
	 * Async overload of {@link BaseResult.any}.
	 */
	static any<T, E extends { kind: number }>(
		promises: Promise<Result<T, E>>[],
	): Promise<Result<T, E>>;
	static any<T, E extends { kind: number }>(
		results: Result<T, E>[] | Promise<Result<T, E>>[],
	): Result<T, E> | Promise<Result<T, E>> {
		if (results.length > 0 && results[0] instanceof Promise) {
			return Promise.all(results as Promise<Result<T, E>>[]).then(
				(resolved) => BaseResult.any<T, E>(resolved),
			);
		}
		let lastErr: E | undefined;
		for (const result of results as Result<T, E>[]) {
			if (result.isOk()) return result;
			lastErr = result.error;
		}
		return new Err<E>(lastErr!);
	}

	/**
	 * Chains computations that may fail.
	 *
	 * If this is `Ok`, calls `fn` with the current value. If this is `Err`,
	 * propagates the error unchanged.
	 */
	andThen<U>(fn: (value: T) => Result<U, E>): Result<U, E>;
	andThen<U>(fn: (value: T) => Promise<Result<U, E>>): Promise<Result<U, E>>;
	andThen<U>(
		fn: (value: T) => Result<U, E> | Promise<Result<U, E>>,
	): Result<U, E> | Promise<Result<U, E>> {
		if (this.success) {
			return fn(this.value as T);
		}
		return new Err<E>(this.error!);
	}

	/**
	 * Recovers from an error by mapping `Err<E>` to `Result<T, F>`.
	 *
	 * If this is `Ok`, the value is preserved.
	 */
	orElse<U, F extends { kind: number }>(
		fn: (error: E) => Result<U, F>
	): Result<U, F>;
	orElse<U, F extends { kind: number }>(
		fn: (error: E) => Promise<Result<U, F>>,
	): Promise<Result<U, F>>;
	orElse<U, F extends { kind: number }>(
		fn: (error: E) => Result<U, F> | Promise<Result<U, F>>,
	): Result<U, F> | Promise<Result<U, F>> {
		if (!this.success) {
			return fn(this.error!);
		}
		return new Ok<U>(this.value! as unknown as U);
	}

	/**
	 * Transforms the success value while preserving the error type.
	 *
	 * If this is `Err`, the error is propagated unchanged.
	 */
	map<U>(fn: (value: T) => Promise<U>): Promise<Result<U, E>>;
	map<U>(fn: (value: T) => U): Result<U, E>;
	map<U>(
		fn: (value: T) => U | Promise<U>,
	): Result<U, E> | Promise<Result<U, E>> {
		if (this.success) {
			const result = fn(this.value as T);
			if (result instanceof Promise) {
				return result.then((v) => new Ok<U>(v));
			}
			return new Ok<U>(result);
		}
		return new Err<E>(this.error!);
	}

	/**
	 * Transforms the error value while preserving the success type.
	 *
	 * If this is `Ok`, the value is propagated unchanged.
	 */
	mapErr<F extends { kind: number }>(
		fn: (error: E) => Promise<F>,
	): Promise<Result<T, F>>;
	mapErr<F extends { kind: number }>(fn: (error: E) => F): Result<T, F>;
	mapErr<F extends { kind: number }>(
		fn: (error: E) => F | Promise<F>,
	): Result<T, F> | Promise<Result<T, F>> {
		if (!this.success) {
			const result = fn(this.error!);
			if (result instanceof Promise) {
				return result.then((e) => new Err<F>(e));
			}

			return new Err<F>(result);
		}

		return new Ok<T>(this.value!);
	}

	/**
	 * Exhaustively handles both variants and returns a shared result type.
	 */
	match<U>(onOk: (value: T) => U, onErr: (error: E) => U): U {
		if (this.success) {
			return onOk(this.value as T);
		}
		return onErr(this.error!);
	}

	/**
	 * Returns the success value.
	 *
	 * @throws {@link ResultError} if called on an `Err`.
	 */
	unwrap(): T {
		if (this.success) {
			return this.value as T;
		}
		throw new ResultError(
			`Called unwrap on an Err: ${JSON.stringify(this.error)}`,
		);
	}

	/**
	 * Returns the success value, or `defaultValue` if this is an `Err`.
	 */
	unwrapOr<U>(defaultValue: U): T | U {
		if (this.success) {
			return this.value as T;
		}
		return defaultValue;
	}

	/**
	 * Type guard for narrowing to {@link Ok}.
	 */
	isOk(): this is Ok<T> {
		return this.success;
	}

	/**
	 * Type guard for narrowing to {@link Err}.
	 */
	isErr(): this is Err<E> {
		return !this.success;
	}
}

/**
 * Successful `Result` variant.
 */
export class Ok<T> extends BaseResult<
	T,
	never
> {
	readonly success = true as const;
	override readonly error?: never;
	/**
	 * Creates a successful result holding `value`.
	 */
	constructor(readonly value: T) {
		super();
	}
}

/**
 * Failed `Result` variant.
 */
export class Err<E extends { kind: number }> extends BaseResult<never, E> {
	readonly success = false as const;
	override readonly value?: never;
	/**
	 * Creates an error result holding `error`.
	 */
	constructor(readonly error: E) {
		super();
	}
}
