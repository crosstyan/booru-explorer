import RWebSocket, { type UrlProvider } from "reconnecting-websocket"
import { isLeft, isRight, left, right } from 'fp-ts/Either'
import { Observable, Subject, Subscription } from "rxjs"
import * as OP from "rxjs/operators"
import type { Either, Left, Right } from 'fp-ts/Either'
import { CBOR } from "cbor-redux"
import { VoidOk, type Result, StringError } from "./errors"
import { E, MagicNumbers } from "./errors"
import type { RpcError } from "./errors"
import pino from "pino"
import { FnTable } from "./table"

export type WsData = string | Blob | ArrayBuffer

type CallMessage = {
  msg_id: number
  method: string | number
  params: any[]
}

function decodeCallMessage(data: ArrayBuffer): Result<CallMessage> {
  const res = CBOR.decode(data)

  if (res.length < 4) {
    const err: RpcError = {
      code: E.BadLength,
      extra: {
        data,
      }
    }
    return left(err)
  }

  const extra = {
    data,
    res
  }

  const [magic, msg_id, method, params] = res
  if (typeof magic !== "number") {
    const err: RpcError = {
      code: E.BadType,
      message: "magic number is not a number",
      extra,
    }
    return left(err)
  }

  if (magic !== MagicNumbers.request) {
    const err: RpcError = {
      code: E.BadMagicNumber,
      message: `magic number ${magic} is not ${MagicNumbers.request}`,
      extra,
    }
    return left(err)
  }

  const values: number[] = Object.values(MagicNumbers)
  if (!values.includes(magic)) {
    const err: RpcError = {
      code: E.BadMagicNumber,
      message: `magic number ${magic} is not in ${MagicNumbers}`,
      extra,
    }
    return left(err)
  }

  if (typeof msg_id !== "number") {
    const err: RpcError = {
      code: E.BadType,
      message: "msg_id is not a number",
      extra,
    }
    return left(err)
  }


  if (!(typeof method === "string" || typeof method === "number")) {
    const err: RpcError = {
      code: E.BadType,
      message: "method is not a string or number",
      extra,
    }
    return left(err)
  }

  if (!Array.isArray(params)) {
    const err: RpcError = {
      code: E.BadType,
      message: "params is not an array",
      extra,
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

  let cleanError = error !== null ? {
    code: error.code,
    message: error.message ?? null,
  } : null

  if (res === undefined) {
    res = null
  }

  if (cleanError === null && res === null) {
    if (throwBothNull) {
      throw new Error("both error and result are null")
    }
    res = VoidOk
  }

  const data = CBOR.encode([magic, msg_id, cleanError, res])
  return data
}

export class CborRpcActor {
  private ws: RWebSocket
  private subject: Subject<WsData>
  private callObs: Observable<CallMessage>
  private sub: Subscription | undefined
  private logger: ReturnType<typeof pino>
  public table: FnTable

  constructor(url: UrlProvider, logger: pino.Logger | null = null) {
    this.ws = new RWebSocket(url)
    this.ws.binaryType = "arraybuffer"
    this.subject = new Subject()
    this.logger = logger ?? pino({ level: "debug" })
    this.table = new FnTable(this.logger)

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

    this.callObs = this.subject.pipe(
      OP.filter((data: WsData): data is ArrayBuffer => data instanceof ArrayBuffer),
      OP.map((data: ArrayBuffer) => decodeCallMessage(data)),
      OP.map((result: Result<CallMessage>) => {
        if (isLeft(result)) {
          this.logger.error(`decode error`, {
            error: result.left,
            codeStr: StringError[result.left.code],
          })
          return null
        }
        return result.right
      }),
      OP.filter((result: CallMessage | null): result is CallMessage => result !== null),
    )

    this.sub = this.callObs.subscribe((msg: CallMessage) => {
      this.logger.debug(`CallMessage`, msg)
      this.table.call(msg.method, msg.params)
        .then((result) => {
          if (isLeft(result)) {
            if (result.left.extra) {
              this.logger.error(result.left.extra)
            } else {
              this.logger.error(`call error`, result.left)
            }
            const data = encodeResult({
              msg_id: msg.msg_id,
              error: result.left,
            })
            this.ws.send(data)
          } else {
            const data = encodeResult({
              msg_id: msg.msg_id,
              result: result.right,
            })
            this.ws.send(data)
          }
        })
    })
  }

  public close() {
    this.sub?.unsubscribe()
    this.ws.close()
  }

  // https://www.totaltypescript.com/typescript-5-2-new-keyword-using
  public [Symbol.dispose]() {
    this.close()
  }
}

