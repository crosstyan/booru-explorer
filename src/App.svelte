<script lang="ts">
  // https://github.com/comfyanonymous/ComfyUI/blob/master/web/scripts/app.js
  // https://github.com/jagenjo/litegraph.js/blob/master/guides/README.md
  // https://observablehq.com/@jerdak/litegraph-example
  // https://github.com/jagenjo/litegraph.js/tree/master/guides#integration
  import { onMount } from "svelte"
  import { assertDefined } from "./utils/assert"
  import { LGraph, LGraphCanvas, LiteGraph } from "litegraph.js"

  // https://github.com/comfyanonymous/ComfyUI/blob/97015b6b383718bdc65cb617e3050069a156679d/web/scripts/app.js#L1325-L1333
  function resizeCanvas(el:HTMLCanvasElement, LGCanvas: LGraphCanvas){
    const { width, height } = el.getBoundingClientRect()
    el.width = width
    el.height = height
    LGCanvas.resize(width, height)
    LGCanvas.draw(true, true)
  }

  onMount(() => {
    const main = document.getElementById("main-main")
    assertDefined(main)
    const canvasEl = document.createElement("canvas")
    canvasEl.style.touchAction = "none"
    canvasEl.id = "main-canvas"
    canvasEl.tabIndex = 1
    canvasEl.style.width = "100%"
    canvasEl.style.height = "100%"
    main.appendChild(canvasEl)
    const graph = new LGraph()
    const canvas = new LGraphCanvas(canvasEl as HTMLCanvasElement, graph)
    graph.start()
    // @ts-ignore assert such a property exists
		LiteGraph.release_link_on_empty_shows_menu = true 
    // @ts-ignore assert such a property exists
		LiteGraph.alt_drag_do_clone_nodes = true
    resizeCanvas(canvasEl as HTMLCanvasElement, canvas)
    window.addEventListener("resize", () => resizeCanvas(canvasEl as HTMLCanvasElement, canvas))
  })
</script>

<main id="main-main">
</main>

<style>
  #main-main {
    width: 100%;
    height: 100%;
    overflow-y: hidden;
  }
</style>
