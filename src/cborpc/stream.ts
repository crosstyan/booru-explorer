import RWebSocket, { type UrlProvider } from "reconnecting-websocket"
import { isLeft, isRight, left, right } from 'fp-ts/Either'
import { Subject } from "rxjs"
import * as OP from "rxjs/operators"
import type { Either, Left, Right } from 'fp-ts/Either'
import CBOR from "cbor-redux"
import { VoidOk, type Result, StringError } from "./errors"
import { E, MagicNumbers } from "./errors"
import type { RpcError } from "./errors"
import { Logger, type ILogObj } from "tslog"

export type WsData = string | Blob | ArrayBuffer

type CallMessage = {
  msg_id: number
  method: string | number
  params: any[]
}



function decodeRaw(data: ArrayBuffer): Result<CallMessage> {
  const res = CBOR.decode(data)

  if (res.length < 4) {
    const err: RpcError = {
      code: E.BadLength,
    }
    return left(err)
  }

  const [magic, msg_id, method, params] = res
  if (typeof magic !== "number") {
    const err: RpcError = {
      code: E.BadType,
    }
    return left(err)
  }
  const values: number[] = Object.values(MagicNumbers)
  if (!values.includes(magic)) {
    const err: RpcError = {
      code: E.BadMagicNumber,
    }
    return left(err)
  }

  if (typeof msg_id !== "number") {
    const err: RpcError = {
      code: E.BadType,
    }
    return left(err)
  }


  if (!(typeof method === "string" || typeof method === "number")) {
    const err: RpcError = {
      code: E.BadType,
    }
    return left(err)
  }

  if (!Array.isArray(params)) {
    const err: RpcError = {
      code: E.BadType,
    }
    return left(err)
  }

  return right({
    msg_id,
    method,
    params,
  })
}

type ResultMessage<T> = {
  msg_id: number
  error?: RpcError
  result?: T
}

/**
 * `T` should be something could be serialized by CBOR
 * @param result
 * @param throwBothNull if both error and result are null, throw an error. Otherwise, use an Ok magic number
 */
function encodeResult<T>(result: ResultMessage<T>, throwBothNull: boolean = false): ArrayBuffer {
  const magic = MagicNumbers.response
  const msg_id = result.msg_id
  let error: RpcError | undefined | null = result.error
  let res: T | undefined | null | typeof VoidOk = result.result

  if (error === undefined) {
    error = null
  }

  if (res === undefined) {
    res = null
  }

  if (error === null && res === null) {
    if (throwBothNull) {
      throw new Error("both error and result are null")
    }
    res = VoidOk
  }

  const data = CBOR.encode([magic, msg_id, error, res])
  return data
}

class CborRpc {
  private ws: RWebSocket
  private subject: Subject<WsData>
  private logger: Logger<ILogObj>

  constructor(url: UrlProvider) {
    this.ws = new RWebSocket(url)
    this.ws.binaryType = "arraybuffer"
    this.subject = new Subject()
    this.logger = new Logger({ name: "CborRpc" })

    // https://developer.mozilla.org/en-US/docs/Web/API/WebSocket/message_event
    // If the message type is "text", then this field is a string.
    // If the message type is "binary" type, then the type of this property can
    // be inferred from the binaryType of this socket
    // (either "blob" or "arraybuffer").
    this.ws.onmessage = (event: MessageEvent<any>) => {
      const isValid = event.data instanceof ArrayBuffer || event.data instanceof Blob || typeof event.data === "string"
      if (isValid) {
        this.subject.next(event.data)
      }
    }

    const arrayBufferOnly = this.subject.pipe(
      OP.filter((data: WsData): data is ArrayBuffer => data instanceof ArrayBuffer),
      OP.map((data: ArrayBuffer) => decodeRaw(data)),
      OP.map((result: Result<CallMessage>) => {
        if (isLeft(result)) {
          const errorStr = StringError[result.left.code]
          this.logger.error("decodeRaw error", result.left)
          return null
        }
        return result.right
      }),
      OP.filter((result: CallMessage | null): result is CallMessage => result !== null),
    )
  }

}

