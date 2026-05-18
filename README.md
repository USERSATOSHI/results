# @usersatoshi/results

A lightweight TypeScript Result type for safe error handling. Write predictable, composable code without throwing exceptions.

## Features

- ✅ **Lightweight** - Zero dependencies, minimal bundle size
- ✅ **Type-safe** - Full TypeScript support with discriminated unions
- ✅ **Runtime-agnostic** - Works with Node.js, Bun, Deno, and browsers
- ✅ **Composable** - Chain operations with `map`, `andThen`, and more
- ✅ **Async support** - Convert promises to Results with `fromPromise`

## Installation

```bash
npm install @usersatoshi/results
```

Or with your preferred package manager:

```bash
bun add @usersatoshi/results
yarn add @usersatoshi/results
pnpm add @usersatoshi/results
```

## Quick Start

```typescript
import { ok, err, type Result } from '@usersatoshi/results';

const enum ErrorKind { NotFound = 0, Unauthorized = 1 }
type AppError = { kind: ErrorKind };

// Create an Ok result
const success: Result<number, AppError> = ok(42);

// Create an Err result
const failure: Result<number, AppError> = err({ kind: ErrorKind.NotFound });

// Use type guards (methods, not properties)
if (success.isOk()) {
  console.log(success.value); // 42
}

if (failure.isErr()) {
  console.log(failure.error); // { kind: 0 }
}
```

## API

### `ok<T>(value: T): Ok<T>`

Creates an `Ok` result wrapping a successful value.

```typescript
const result = ok(100);
```

### `err<E extends { kind: number }>(error: E): Err<E>`

Creates an `Err` result wrapping an error.

```typescript
const result = err({ kind: 1 as const, message: "Something went wrong" });
```

### `fromPromise<T, E>(promise: Promise<T>, onErr: (error: unknown) => E): Promise<Result<T, E>>`

Converts a Promise into a Result, mapping rejections with your error handler.

```typescript
const result = await fromPromise(
  fetch('/api/data'),
  (error) => ({ kind: 0 as const, message: String(error) })
);
```

## Result Methods

Both `Ok` and `Err` implement the `Result` interface with methods for chaining operations:

- `isOk()` - Type guard: narrows to `Ok<T>`
- `isErr()` - Type guard: narrows to `Err<E>`
- `map(fn)` - Transform the success value; propagates `Err` unchanged
- `mapErr(fn)` - Transform the error value; propagates `Ok` unchanged
- `andThen(fn)` - Chain Result-returning operations (flatMap)
- `orElse(fn)` - Recover from an error with a new Result
- `match(onOk, onErr)` - Exhaustively handle both variants
- `unwrap()` - Extract the value, throws `ResultError` if `Err`
- `unwrapOr(default)` - Extract the value or return a default
- `BaseResult.all(results)` - Collect array of Results; returns first `Err` or `Ok<T[]>`
- `BaseResult.any(results)` - Return first `Ok`, or last `Err` if all fail

## Examples

### Error Handling

```typescript
const enum ErrorKind { DivisionByZero = 0 }
type MathError = { kind: ErrorKind };

function divide(a: number, b: number): Result<number, MathError> {
  if (b === 0) {
    return err({ kind: ErrorKind.DivisionByZero });
  }
  return ok(a / b);
}

const result = divide(10, 2);

if (result.isOk()) {
  console.log(`Result: ${result.value}`); // Result: 5
}
```

### Chaining Operations

```typescript
ok(5)
  .map(x => x * 2)
  .andThen(x => x > 5 ? ok(x) : err({ kind: 0 as const }))
  .match(
    (value) => console.log(`Success: ${value}`),
    (error) => console.log(`Error: ${error.kind}`)
  );
```

### Async Operations

```typescript
const result = await fromPromise(
  fetch('/api/users'),
  (error) => ({ kind: 1 as const, message: String(error) })
);

if (result.isOk()) {
  const users = await result.value.json();
  console.log(users);
}
```

### Collecting Multiple Results

```typescript
const results = [ok(1), ok(2), ok(3)];
const combined = BaseResult.all(results);

if (combined.isOk()) {
  console.log(combined.value); // [1, 2, 3]
}
```

## Browser Compatibility

Works in all modern browsers that support ES2020+.

## License

Apache-2.0

## Repository

- Main: https://git.usersatoshi.com/usersatoshi/results.git
- Mirror: https://github.com/usersatoshi/results
