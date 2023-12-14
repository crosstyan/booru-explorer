<script lang="ts">
import type { Writable } from "svelte/store"
import { Handle, Position } from "@xyflow/svelte"
import type { NodeProps } from "@xyflow/svelte"
import { onMount, onDestroy, getContext } from "svelte"
import pino from "pino"
import { List } from "immutable"
import Masonry from "svelte-bricks"

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

const randomIntRange = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1) + min)

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

const [minColWidth, maxColWidth, gap] = [200, 1200, 10]
let imgs: List<UrlEntry> = List()
$: items = [...imgs]

onMount(() => {
  ;(async () => {
    const blob = await fetchNewImg()
    const url = URL.createObjectURL(blob)
    const id = (imgs.last()?.id ?? 0) + 1
    imgs = imgs.push({
      url,
      id,
    })
  })()
})

const removeImg = () => {
  imgs = imgs.pop()
}

const addImg = () => {
  ;(async () => {
    const blob = await fetchNewImg()
    const url = URL.createObjectURL(blob)
    // https://www.reddit.com/r/sveltejs/comments/15baev9/why_is_updating_arrays_and_objects_designed_this/
    const id = (imgs.last()?.id ?? 0) + 1
    imgs = imgs.push({
      url,
      id,
    })
  })()
}
// https://www.npmjs.com/package/moveable
// https://reactflow.dev/api-reference/components/node-resizer
// https://github.com/xyflow/xyflow/blob/v11/packages/node-resizer/src/ResizeControl.tsx/#L27
</script>

<div class="gallery-frame">
  <Masonry let:item animate={false} {items} {minColWidth} {maxColWidth} {gap}>
    <div class="flex">
      <img src={item.url} class="flex-auto" />
    </div>
  </Masonry>
  <span class="tools absolute top-2 left-2 flex align-middle">
    <button class="float-btn" on:click={addImg}>+</button>
    <button class="float-btn" on:click={removeImg}>-</button>
  </span>
</div>

<style>
.gallery-frame {
  min-width: 8rem;
  min-height: 4rem;
  max-width: 100rem;
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
  background-color: color-mix(in srgb,var(--node-background-color-default) 90%, white);
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
  background-color: color-mix(in srgb,var(--node-background-color-default) 95%, white);
}

.float-btn:not(:last-child) {
  border-right: 1px solid var(--node-color-default);
}
</style>
