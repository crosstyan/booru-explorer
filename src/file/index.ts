import { CBOR } from "cbor-redux"

export interface FileResponse {
  sid: number
  request_path: string
  file_path: string
  // error code, error message (optional)
  error: [number, string | null] | null
  // filenames, is_dir
  filenames: Array<[string, boolean]> | null
  content: Uint8Array | null
}

export interface FileRequest {
  sid: number
  path: string
  implicit_read: boolean
}

export const encode_request = (request:FileRequest) => {
  const arr: [number, string, boolean] = [request.sid, request.path, request.implicit_read]
  const buf = CBOR.encode(arr)
  return buf
}

export const decode_response = (buf: ArrayBuffer): FileResponse => {
  const arr = CBOR.decode(buf)
  const response: FileResponse = {
    sid: arr[0],
    request_path: arr[1],
    file_path: arr[2],
    error: arr[3],
    filenames: arr[4],
    content: arr[5],
  }
  return response
}
