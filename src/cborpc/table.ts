import { isLeft, isRight, left, right, asUnit } from "fp-ts/Either"
import uFuzzy from "@leeoniya/ufuzzy"
import { E, ListAllMethod, isErrorCode } from "./errors"
import { extractMsg, extractStackTrace, hasCode, hasMessage, isEither, isOption } from "./utils"
import type { RpcError, Result } from "./errors"
import pino from "pino"
import { isSome } from "fp-ts/lib/Option"


export interface RegisterOptions {
  overwriteStringIndex: boolean
  overwriteNumberIndex: boolean
}

export class FnTable {
  private strMap: Record<string, Function> = {}
  private numStrMap: Record<number, string> = {}
  private uf: uFuzzy
  private logger: pino.Logger
  constructor(logger: pino.Logger | null = null) {
    this.strMap = {}
    this.numStrMap = {}
    this.uf = new uFuzzy({ intraMode: 1, intraSub: 1, intraTrn: 1, intraDel: 1, intraIns: 2 })
    this.logger = logger ?? pino()

    this.register("listFns", ListAllMethod, () => this.listFns())
  }

  public register(
    fnStringIndex: string,
    fnNumberIndex: number,
    fn: Function, option: Partial<RegisterOptions> = {}): Result<void> {
    let defaultOption: RegisterOptions = {
      overwriteStringIndex: false,
      overwriteNumberIndex: false,
    }
    let opt = { ...defaultOption, ...option }
    if (this.strMap[fnStringIndex] !== undefined && !opt.overwriteStringIndex) {
      const err: RpcError = {
        code: E.DuplicateStringIndex
      }
      return left(err)
    }
    this.strMap[fnStringIndex] = fn

    if (this.numStrMap[fnNumberIndex] !== undefined && !opt.overwriteNumberIndex) {
      const err: RpcError = {
        code: E.DuplicateNumberIndex
      }
      return left(err)
    }

    this.numStrMap[fnNumberIndex] = fnStringIndex

    return asUnit(right(null))
  }

  public unregister(fnIndex: string | number): Result<void> {
    if (typeof fnIndex === "number") {
      const fnStrIndex = this.numStrMap[fnIndex]
      if (fnStrIndex === undefined) {
        const err: RpcError = {
          code: E.InvalidMethod
        }
        return left(err)
      }
      delete this.numStrMap[fnIndex]
      delete this.strMap[fnStrIndex]
    } else if (typeof fnIndex === "string") {
      const fn = this.strMap[fnIndex]
      if (fn === undefined) {
        const err: RpcError = {
          code: E.InvalidMethod
        }
        return left(err)
      }
      delete this.strMap[fnIndex]
    } else {
      throw new Error("invalid fnIndex type")
    }
    return asUnit(right(null))
  }

  public async call(fnIndex: string | number, args: any[]): Promise<Result<any>> {
    let fn: Function | undefined
    let fnStrIndex: string | undefined

    if (typeof fnIndex === 'number') {
      fnStrIndex = this.numStrMap[fnIndex]
      fn = fnStrIndex !== undefined ? this.strMap[fnStrIndex] : undefined
    } else if (typeof fnIndex === 'string') {
      fn = this.strMap[fnIndex]
      if (fn === undefined) {
        const haystack = Object.keys(this.strMap)
        const [idxs, info, order] = this.uf.search(haystack, fnIndex, 5, 1e3)
        if (idxs != null && idxs.length > 0) {
          const name = haystack[idxs[0]]
          return left({
            code: E.InvalidMethod,
            message: `function "${fnIndex}" not found, did you mean "${name}"?`,
          })
        }
      }
    } else {
      return left({
        code: E.InvalidMethod,
        message: "bad method index type",
      })
    }

    if (fn === undefined) {
      return left({ code: E.InvalidMethod })
    }

    try {
      const result = await Promise.resolve(fn(...args))
      if (isEither(result)) {
        return isRight(result) ? right(result.right) : left({
          code: hasCode(result.left) && isErrorCode(result.left.code) ? result.left.code : E.RuntimeErrors,
          message: hasMessage(result.left) ? result.left.message : null,
          extra: result.left,
        })
      } else if (isOption(result)) {
        return isSome(result) ? right(result.value) : left({
          code: E.OptionalNull,
          message: null,
        })
      }
      return right(result)
    } catch (e) {
      const err: RpcError = {
        code: E.RuntimeErrors,
        message: extractMsg(e),
        extra: e,
      }
      return left(err)
    }
  }

  /**
   * @todo memoize it as long as the table is not changed
   */
  public listFns(): Record<string, number> {
    const result: Record<string, number> = {}
    Object.keys(this.numStrMap).forEach((key) => {
      const k = parseInt(key)
      const v = this.numStrMap[k]
      result[v] = k
    })
    return result
  }
}
