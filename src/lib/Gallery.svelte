<script lang="ts">
import type { Writable } from "svelte/store"
import { Handle, Position } from "@xyflow/svelte"
import type { NodeProps } from "@xyflow/svelte"
import { onMount, onDestroy, getContext } from "svelte"
import pino from "pino"

// https://github.com/sveltejs/svelte/issues/192#issuecomment-1288198489
// https://svelteflow.dev/examples/styling/tailwind
// https://github.com/xyflow/xyflow/blob/58ad111ec3c35477d67c4e3ea97045b71f2baa2e/packages/svelte/src/lib/components/Handle/Handle.svelte#L33
type $$Props = NodeProps
export let data: {
  color: Writable<string>
}
const { color } = data

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

const node_id_key = "svelteflow__node_id"
const nodeId = getContext<string>(node_id_key)

let selfModule: HTMLDivElement | null = null
const logger = pino({ name: "Gallery" })

const fetchNewImg = async () => {
  const promise = new Promise<Blob>(async (resolve, reject) => {
    const url = "https://picsum.photos/200/300"
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

let imgs: HTMLImageElement[] = []

onMount(() => {
  const img = new Image()
  ;(async () => {
    const blob = await fetchNewImg()
    const url = URL.createObjectURL(blob)
    img.src = url
    imgs.push(img)
    img.onload = (ev) => {
      selfModule?.prepend(img)
      // data.change_size(50, 50)
    }
  })()
})

const removeImg = () => {
  const img = imgs.pop()
  if (img) {
    selfModule?.removeChild(img)
  }
}

const addImg = () => {
  const img = new Image()
  ;(async () => {
    const blob = await fetchNewImg()
    const url = URL.createObjectURL(blob)
    img.src = url
    imgs.push(img)
    img.onload = (ev) => {
      selfModule?.prepend(img)
    }
  })()
}
// https://www.npmjs.com/package/moveable
// https://reactflow.dev/api-reference/components/node-resizer
// https://github.com/xyflow/xyflow/blob/v11/packages/node-resizer/src/ResizeControl.tsx/#L27
</script>

<div class="gallery-frame">
  <div class="gallery" bind:this={selfModule}></div>
  <span>
    <button on:click={addImg}>+</button>
    <button on:click={removeImg}>-</button>
  </span>
</div>

<style>
.gallery {
  display: flex;
}
.gallery-frame {
  padding: 1rem;
  background: var(--node-background-color-default);
  color: var(--node-color-default);
  border-radius: 0.125rem;
  cursor: crosshair;
  overflow: hidden;
}
</style>
