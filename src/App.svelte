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
} from "@xyflow/svelte"
import ColorPickerNode from "./lib/ColorPickerNode.svelte"

const logger = pino()
let rpc: CborRpcActor | null = null

const nodes = writable([
  {
    id: "1",
    type: "colorPicker",
    data: { color: writable("#ff4000") },
    position: { x: 0, y: 0 },
  },
])

const edges = writable([])

const nodeTypes = {
  colorPicker: ColorPickerNode,
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
    {nodes}
    {edges}
    {nodeTypes}
    {colorMode}
    fitView
    attributionPosition="bottom-right"
  >
    <Controls />
    <Background />
    <Panel>
      <select bind:value={colorMode} data-testid="colormode-select">
        <option value="light">light</option>
        <option value="dark">dark</option>
        <option value="system">system</option>
      </select>
    </Panel>
  </SvelteFlow>
</div>

<style>
#wrapper {
  width: 100%;
  height: 100%;
  overflow: hidden;
}
</style>
