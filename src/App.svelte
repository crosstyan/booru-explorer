<script lang="ts">
// https://github.com/comfyanonymous/ComfyUI/blob/master/web/scripts/app.js
// https://github.com/jagenjo/litegraph.js/blob/master/guides/README.md
// https://observablehq.com/@jerdak/litegraph-example
// https://github.com/jagenjo/litegraph.js/tree/master/guides#integration
import { onMount, onDestroy } from "svelte"
import { assertDefined } from "./utils/assert"
import pino from "pino"
import CborRpcActor from "./cborpc"
import { right } from "fp-ts/lib/Either"
import { writable } from "svelte/store"
import {
  SvelteFlow,
  Controls,
  Background,
  BackgroundVariant,
  Position,
  MiniMap,
  Panel,
  type ColorMode,
  type Node,
  type Edge,
} from "@xyflow/svelte"

import Gallery from "./lib/Gallery.svelte"
import ReconnectingWebSocket from "reconnecting-websocket"

// https://svelte.dev/blog/runes
const logger = pino()
let rpc: CborRpcActor | null = null

const initNodes = writable<Node[]>([
  (() => {
    const node:Node = {
      id: "1",
      type: "gallery",
      data: {
        color: writable("#ff4000"),
      },
      position: { x: 0, y: 0 },
    }
    return node
  })(),
])
const initEdges = writable<Edge[]>([])

const nodeTypes = {
  gallery: Gallery,
}
let colorMode: ColorMode = "system"


onMount(() => {
  // https://github.com/jagenjo/litegraph.js/blob/master/src/nodes/base.js
  // some basic nodes implementation
  const url = import.meta.env.VITE_WS_ENDPOINT
  logger.info("Connecting to", url)
  rpc = new CborRpcActor(url)
  rpc.table.register("log", 0x01, (...args: any[]) => console.log(...args))
  rpc.table.register("eval", 0x99, (code: string) => {
    return eval(code)
  })
})

onDestroy(() => {
  if (rpc) {
    rpc.close()
  } else {
    logger.warn("can't find rpc")
  }
})
</script>

<div id="wrapper">
  <SvelteFlow
    nodes={initNodes}
    edges={initEdges}
    {nodeTypes}
    {colorMode}
    maxZoom={6}
    minZoom={0.5}
    fitView
    attributionPosition="bottom-right"
  >
    <Background />
  </SvelteFlow>
</div>

<style>
#wrapper {
  width: 100%;
  height: 100%;
  overflow: hidden;
}
</style>
