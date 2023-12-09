<script lang="ts">
  // https://github.com/comfyanonymous/ComfyUI/blob/master/web/scripts/app.js
  // https://github.com/jagenjo/litegraph.js/blob/master/guides/README.md
  // https://observablehq.com/@jerdak/litegraph-example
  import { onMount } from "svelte"
  import { assertDefined } from "./utils/assert"
  import { LGraph } from "litegraph.js"

  onMount(() => {
    const main = document.getElementById("main")
    assertDefined(main)
    const graph = new LGraph()
  })
</script>

<main id="main"></main>

<style>
</style>
