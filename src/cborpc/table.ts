import { isLeft, isRight, left, right } from "fp-ts/Either"
import type { Either, Left, Right } from "fp-ts/Either"
import uFuzzy from "@leeoniya/ufuzzy"
import * as E from "./errors"
import { extractMsg } from "./utils"
import type { RpcError, Result, Unit } from "./errors"


interface RegisterOptions {
  overwriteStringIndex: boolean
  overwriteNumberIndex: boolean
}

class FnTable {
  private strMap: Record<string, Function> = {}
  private numStrMap: Record<number, string> = {}
  private uf: uFuzzy
  constructor() {
    this.strMap = {}
    this.numStrMap = {}
    this.uf = new uFuzzy()
  }

  public register(
    fnStringIndex: string,
    fnNumberIndex: number,
    fn: Function, option: Partial<RegisterOptions>): Result<Unit> {
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

    return right({})
  }

  public unregister(fnIndex: string | number): Result<Unit> {
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
    return right({})
  }

  public call(fnIndex: string | number, args: any[]): Result<any> {
    let fn: Function | undefined
    if (typeof fnIndex === "number") {
      const fnStrIndex = this.numStrMap[fnIndex]
      if (fnStrIndex === undefined) {
        const err: RpcError = {
          code: E.InvalidMethod
        }
        return left(err)
      }
      fn = this.strMap[fnStrIndex]
    } else if (typeof fnIndex === "string") {
      fn = this.strMap[fnIndex]
      if (fn === undefined) {
        const [idxs, info, order] = this.uf.search(Object.keys(this.strMap), fnIndex)
        if (idxs != null && idxs.length > 0) {
          const err = {
            code: E.InvalidMethod,
            message: `function ${fnIndex} not found, did you mean ${idxs[0]}?`,
          }
          return left(err)
        } else {
          const err: RpcError = {
            code: E.InvalidMethod
          }
          return left(err)
        }
      }
    } else {
      throw new Error("invalid fnIndex type")
    }

    try {
      const result = fn(...args)
      return right(result)
    } catch (e) {
      const err: RpcError = {
        code: E.RuntimeErrors,
        message: extractMsg(e),
      }
      return left(err)
    }
  }
}
