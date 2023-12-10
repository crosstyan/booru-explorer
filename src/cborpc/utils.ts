import type { Either, Left, Right } from "fp-ts/Either"
import type { Option, Some, None } from "fp-ts/lib/Option"

export function extractMsg(err: unknown): string | null {
  if (typeof err === 'object' && err !== null && 'message' in err && typeof err.message === 'string') {
    return err.message
  }
  return null
}

export function extractStackTrace(err: unknown): string | null {
  if (typeof err === 'object' && err !== null && 'stack' in err && typeof err.stack === 'string') {
    return err.stack
  }
  return null
}

export function isEither(obj: unknown): obj is Either<any, any> {
  if (typeof obj === 'object' && obj !== null && '_tag' in obj) {
    const taggedObj = obj as { _tag: unknown }
    return taggedObj._tag === 'Left' || taggedObj._tag === 'Right'
  }
  return false
}

export function isOption(obj: unknown): obj is Option<any> {
  if (typeof obj === 'object' && obj !== null && '_tag' in obj) {
    const taggedObj = obj as { _tag: unknown }
    return taggedObj._tag === 'Some' || taggedObj._tag === 'None'
  }
  return false
}


export function hasMessage(o: unknown): o is { message: string } {
  return typeof o === 'object' && o !== null && 'message' in o && typeof o.message === 'string'
}

export function hasCode(o: unknown): o is { code: number } {
  return typeof o === 'object' && o !== null && 'code' in o && typeof o.code === 'number'
}
