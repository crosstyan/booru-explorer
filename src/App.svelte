<script lang="ts">
// https://github.com/comfyanonymous/ComfyUI/blob/master/web/scripts/app.js
// https://github.com/jagenjo/litegraph.js/blob/master/guides/README.md
// https://observablehq.com/@jerdak/litegraph-example
// https://github.com/jagenjo/litegraph.js/tree/master/guides#integration
import { onMount, onDestroy } from "svelte"
import { assertDefined } from "./utils/assert"
import { LGraph, LGraphCanvas, LiteGraph, LGraphNode } from "litegraph.js"
import pino from "pino"
import CborRpcActor from "./cborpc"
import ExampleNode from "./node/example"
import Menu from "./lib/menu.svelte"
import { right } from "fp-ts/lib/Either"
import { ImageFrame } from "./node/graph"

const logger = pino()
let rpc: CborRpcActor | null = null

// https://github.com/comfyanonymous/ComfyUI/blob/97015b6b383718bdc65cb617e3050069a156679d/web/scripts/app.js#L1325-L1333
function resizeCanvas(canvas_el: HTMLCanvasElement, lg_canvas: LGraphCanvas) {
  const { width, height } = canvas_el.getBoundingClientRect()
  const scale = Math.max(window.devicePixelRatio, 1)
  // trick to avoid blurriness
  canvas_el.width = Math.round(width * scale)
  canvas_el.height = Math.round(height * scale)
  canvas_el.getContext("2d")?.scale(scale, scale)
  lg_canvas.draw(true, true)
}

function configureLG() {
  LiteGraph.debug = true
  LiteGraph.catch_exceptions = true
  LiteGraph.throw_errors = true
  LiteGraph.allow_scripts = true
}

onMount(() => {
  configureLG()
  const main = document.getElementById("main-main")
  assertDefined(main)
  const canvasEl = document.createElement("canvas")
  canvasEl.style.touchAction = "none"
  canvasEl.id = "main-canvas"
  canvasEl.tabIndex = 1
  canvasEl.style.width = "100%"
  canvasEl.style.height = "100%"
  main.prepend(canvasEl)
  const graph = new LGraph()
  const lg_canvas = new LGraphCanvas(canvasEl, graph)
  graph.start()
  // @ts-ignore assert such a property exists
  LiteGraph.release_link_on_empty_shows_menu = true
  // @ts-ignore assert such a property exists
  LiteGraph.alt_drag_do_clone_nodes = true
  resizeCanvas(canvasEl, lg_canvas)
  window.addEventListener("resize", () => resizeCanvas(canvasEl, lg_canvas))

  function renderInfo(
    this: LGraphCanvas,
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
  ) {
    x = x || 10
    y = y || this.canvas.offsetHeight - 80

    ctx.save()
    ctx.translate(x, y)

    ctx.font = "10px Arial"
    ctx.fillStyle = "#888"
    ctx.textAlign = "left"
    if (graph) {
      ctx.fillText("T: " + this.graph.globaltime.toFixed(2) + "s", 5, 13 * 1)
      ctx.fillText("I: " + this.graph.iteration, 5, 13 * 2)
      ctx.fillText("FPS:" + this.fps.toFixed(2), 5, 13 * 5)
    } else {
      ctx.fillText("No graph selected", 5, 13 * 1)
    }
    ctx.restore()
  }

  lg_canvas.renderInfo = renderInfo

  ImageFrame.register()
  const node = LiteGraph.createNode(ImageFrame.type) as ImageFrame
  node.pos = [200, 200]
  node.url = "https://picsum.photos/200/300"
  graph.add(node)

  // https://github.com/jagenjo/litegraph.js/blob/master/src/nodes/base.js
  // some basic nodes implementation
  const url = import.meta.env.VITE_WS_ENDPOINT
  logger.info("Connecting to", url)
  rpc = new CborRpcActor(url)
  rpc.table.register("log", 0x01, (...args: any[]) => console.log(...args))
  rpc.table.register("createNode", 0x02, (type: string) => {
    const node = LiteGraph.createNode(type)
    graph.add(node)
    return node.id
  })
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
  <main id="main-main">
    <Menu savePos={true} />
  </main>
</div>

<style>
#wrapper {
  width: 100%;
  height: 100%;
  overflow: hidden;
}

#main-main {
  width: 100%;
  height: 100%;
  overflow-y: hidden;
}
</style>
