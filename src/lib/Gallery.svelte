<script lang="ts">
import type { Writable } from "svelte/store"
import { Handle, Position } from "@xyflow/svelte"
import type { NodeProps } from "@xyflow/svelte"
import { onMount, onDestroy, getContext } from "svelte"
import pino from "pino"
import { List } from "immutable"
import Masonry from "svelte-bricks"
import { cons } from "fp-ts/lib/ReadonlyNonEmptyArray"
import RWebSocket from "reconnecting-websocket"
import { randomIntRange } from "../utils"
import { decode_response, encode_request, type FileRequest } from "../file"

// https://github.com/sveltejs/svelte/issues/192#issuecomment-1288198489
// https://svelteflow.dev/examples/styling/tailwind
// https://github.com/xyflow/xyflow/blob/58ad111ec3c35477d67c4e3ea97045b71f2baa2e/packages/svelte/src/lib/components/Handle/Handle.svelte#L33
type $$Props = NodeProps

export let id: $$Props["id"] = ""
export let type: $$Props["type"] = ""
export let isConnectable: $$Props["isConnectable"] = false
export let width: $$Props["width"] = 0
export let height: $$Props["height"] = 0
export let selected: $$Props["selected"] = false
export let sourcePosition: $$Props["sourcePosition"] = Position.Top
export let targetPosition: $$Props["targetPosition"] = Position.Bottom
export let zIndex: $$Props["zIndex"] = 0
export let dragging: $$Props["dragging"] = false
export let dragHandle: $$Props["dragHandle"] = ""
export let positionAbsolute: $$Props["positionAbsolute"] = { x: 0, y: 0 }

interface UrlEntry {
  url: string
  id: number
}

const node_id_key = "svelteflow__node_id"
const nodeId = getContext<string>(node_id_key)
const logger = pino({ name: "Gallery" })

const fetchNewImg = async () => {
  const promise = new Promise<Blob>(async (resolve, reject) => {
    const w = randomIntRange(200, 800)
    const h = randomIntRange(200, 800)
    const url = `https://picsum.photos/${w}/${h}`
    const im = await fetch(url)
    if (im.ok) {
      const isImage = im.headers.get("content-type")?.includes("image") ?? false
      if (isImage) {
        resolve(im.blob())
      } else {
        reject("not an image")
      }
    }
  })
  return promise
}

interface SimpleImage {
  id: number
  url: string
}

interface Post {
  post_id: number
  artist_tags: string[]
  score: number
  fav_count: number
  general_tags: string[]
  copyright_tags: string[]
  characters_tags: string[]
  created_at: string
  file_url: string
  preview_file_url: string
}

interface RawResponse {
  names: string[]
  rows: any[]
}

const fetchRandomPosts = async () => {
  const api = import.meta.env.VITE_QUERY_API_ENDPOINT
  const query = `--sql
  WITH artist AS (SELECT *
                FROM booru.artists_with_n_posts
                ORDER BY random()
                LIMIT 1),
     artist_posts_with_tags_id AS (SELECT ap.post_id,
                                          ap.score,
                                          ap.fav_count,
                                          ap.tag_ids,
                                          ap.created_at,
                                          ap.file_url,
                                          ap.preview_file_url
                                   FROM booru.view_modern_posts_illustration_only_extra ap
                                   WHERE ap.tag_ids && ARRAY(SELECT tag_id FROM artist)),
     artist_posts_with_tags AS (SELECT ap.post_id,
                                       (SELECT array_agg(name)
                                        FROM booru.tags
                                        WHERE id = ANY (tag_ids)
                                          AND category = 1) as artist_tags,
                                       ap.score,
                                       ap.fav_count,
                                       (SELECT array_agg(name)
                                        FROM booru.tags
                                        WHERE id = ANY (tag_ids)
                                          AND category = 0) as general_tags,
                                       (SELECT array_agg(name)
                                        FROM booru.tags
                                        WHERE id = ANY (tag_ids)
                                          AND category = 3) as copyright_tags,
                                       (SELECT array_agg(name)
                                        FROM booru.tags
                                        WHERE id = ANY (tag_ids)
                                          AND category = 4) as characters_tags,
                                       ap.created_at,
                                       ap.file_url,
                                       ap.preview_file_url
                                FROM artist_posts_with_tags_id as ap)
  SELECT *
  FROM artist_posts_with_tags
  LIMIT 50;`
  const req = fetch(api, {
    method: "POST",
    headers: {
      "Content-Type": "text/plain",
    },
    body: query,
  })
  const res = await req
  const json = await res.json()
  return json
}

const rawRows2post = (raw: any[]) => {
  const [
    post_id,
    artist_tags,
    score,
    fav_count,
    general_tags,
    copyright_tags,
    characters_tags,
    created_at,
    file_url,
    preview_file_url,
  ] = raw
  return {
    id: post_id,
    post_id,
    artist_tags,
    score,
    fav_count,
    general_tags,
    copyright_tags,
    characters_tags,
    created_at,
    file_url,
    preview_file_url,
  } as Post
}

let artist_name:string = ""
const [minColWidth, maxColWidth, gap] = [50, 200, 5]
let imgs: List<SimpleImage> = List()
$: items = [...imgs]

const UINT16_MAX = 65535
onMount(() => {
  ;(async () => {
    const ws = new RWebSocket(import.meta.env.VITE_FILE_WS_ENDPOINT)
    let msg_map = new Map<number, ArrayBuffer>()
    logger.info("Connecting to", import.meta.env.VITE_FILE_WS_ENDPOINT)
    ws.binaryType = "arraybuffer"
    ws.addEventListener("open", () => {
      const req: FileRequest = {
        sid: randomIntRange(0, UINT16_MAX),
        path: ".",
        implicit_read: false,
      }
      ws.send(encode_request(req))
    })
    const listenImg = (ev:MessageEvent<any>) => {
      const data = ev.data as ArrayBuffer
      const resp = decode_response(data)
      if (resp.content instanceof Uint8Array) {
        if (resp.file_path.includes("webp")) {
          const mime_type = "image/webp"
          const blob = new Blob([resp.content], { type: mime_type })
          const url = URL.createObjectURL(blob)
          const last = imgs.last()
          const last_id = last?.id ?? 0
          imgs = imgs.push({ id: last_id + 1, url })
        }
      }
    }
    const listenDirs = (ev:MessageEvent<any>) => {
      const data = ev.data as ArrayBuffer
      const resp = decode_response(data)
      if (resp.filenames !== undefined){
        const folders = resp.filenames?.filter(([_, is_dir]) => is_dir).map(([name, _]) => name)
        if (folders !== undefined) {
          const folder = folders[randomIntRange(0, folders.length)]
          artist_name = folder
          logger.info("requesting", folder)
          const req: FileRequest = {
            sid: randomIntRange(0, UINT16_MAX),
            path: folder,
            implicit_read: true,
          }
          ws.send(encode_request(req))
          ws.removeEventListener("message", listenDirs)
          ws.addEventListener("message", listenImg)
        }
      }
    }
    ws.addEventListener("message", listenDirs)
  })()
})

const removeImg = () => {
  imgs = imgs.pop()
}

// https://www.npmjs.com/package/moveable
// https://reactflow.dev/api-reference/components/node-resizer
// https://github.com/xyflow/xyflow/blob/v11/packages/node-resizer/src/ResizeControl.tsx/#L27
</script>

<div class="gallery-frame">
  <h1>{artist_name}</h1>
  <Masonry let:item animate={false} {items} {minColWidth} {maxColWidth} {gap}>
    <div class="flex-auto">
      <img src={item.url} />
    </div>
  </Masonry>
  <span class="tools absolute top-2 right-2 flex align-middle">
    <button class="float-btn" on:click={() => {}}>+</button>
    <button class="float-btn" on:click={removeImg}>-</button>
  </span>
</div>

<style>
.gallery-frame {
  min-width: 8rem;
  min-height: 4rem;
  max-width: 40rem;
  padding: 1rem;
  background-color: var(--node-background-color-default);
  color: var(--node-color-default);
  border-radius: 0.125rem;
  cursor: crosshair;
  overflow: hidden;
}
.tools {
  width: 3.5rem;
}
.float-btn {
  padding-left: 0.5rem;
  padding-right: 0.5rem;
  padding-bottom: 0.1rem;
  width: 1rem;
  text-align: center;
  flex: auto;
  font-size: 0.75rem;
  background-color: color-mix(
    in srgb,
    var(--node-background-color-default) 90%,
    white
  );
}

.float-btn:first-child {
  border-top-left-radius: 0.5rem;
  border-bottom-left-radius: 0.5rem;
}

.float-btn:last-child {
  border-top-right-radius: 0.5rem;
  border-bottom-right-radius: 0.5rem;
}

.float-btn:hover {
  background-color: color-mix(
    in srgb,
    var(--node-background-color-default) 95%,
    white
  );
}

.float-btn:not(:last-child) {
  border-right: 1px solid var(--node-color-default);
}
</style>
