import { isLeft, isRight, left, right } from "fp-ts/Either"
import type { Either, Left, Right } from "fp-ts/Either"

export type RpcError = {
  code: number
  message?: string | null | undefined
}

export type Result<T> = Either<RpcError, T>
export type Unit = {}

export const RuntimeErrors = 0x10
export const InvalidMethod = 0x40

export const DuplicateStringIndex = 0x31
export const DuplicateNumberIndex = 0x32
