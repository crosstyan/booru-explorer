import * as O from "fp-ts/Option"
import { match } from "fp-ts/Option"
import type { Option, None, Some } from "fp-ts/Option"

/**
 * Asserts that the given option is Some
 */
export function assertSome<T>(o: O.Option<T>): asserts o is O.Some<T> {
    if (O.isNone(o)) {
        throw new Error("is none")
    }
}

/**
 * assert that the variable is not null or undefined
 */
export function assertDefined<T>(o: T | null | undefined): asserts o is T {
    if (o === null || o === undefined) {
        throw new Error("not defined")
    }
}

/**
 * Unwraps the given option.
 */
export const unwrap = <T>(o: O.Option<T>): T => {
    if (O.isNone(o)) {
        throw new Error("bad unwrap")
    }
    return o.value
}
