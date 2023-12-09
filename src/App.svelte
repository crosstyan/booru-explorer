<script lang="ts">
  import { Node, Svelvet, Minimap, Controls } from 'svelvet'
</script>

<main id="main">
<Svelvet id="canvas" minimap >
  <Node />
  <Node id="alpha" bgColor="red" label="Default Node" />
</Svelvet>
</main>

<style>
  #main {
    width: 100%;
    height: 100%;
    position: absolute;
    top: 0;
    left: 0;
  }
</style>
