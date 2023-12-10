import { isLeft, isRight, left, right } from "fp-ts/Either"
import type { Either, Left, Right } from "fp-ts/Either"

export type RpcError = {
  code: number
  message?: string | null | undefined
  /**
   * an extra field for upstream to check and
   * won't actually be serialized
   */
  extra?: unknown | null | undefined
}

export type Result<T> = Either<RpcError, T>
export type Unit = {}

export const MagicNumbers = {
  request: 0x00,
  response: 0x01,
  notification: 0x02,
} as const

export type MagicLiterals = typeof MagicNumbers[keyof typeof MagicNumbers]

export const RuntimeErrors = 0x10

export const BadMagicNumber = 0x20
export const BadType = 0x21
export const BadLength = 0x22
export const BadCBOR = 0x23

export const InvalidMethod = 0x40

export const DuplicateStringIndex = 0x31
export const DuplicateNumberIndex = 0x32

// a magic map for void return
export const VoidOk = { 0: 1 } as const
