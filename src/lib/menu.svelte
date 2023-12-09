<script lang="ts">
// https://github.com/comfyanonymous/ComfyUI/blob/eccc9e64a631bb7ec02d61dbc6bf6c3ffefe96e4/web/scripts/ui.js#L610-L793
// I could certainly improve this
import { onMount } from "svelte"

interface Position {
  x: number
  y: number
}

function enableDragElement(dragEl: HTMLElement) {
  let posDiffX = 0
  let posDiffY = 0
  let posStartX = 0
  let posStartY = 0
  let newPosX = 0
  let newPosY = 0

  const handle = dragEl.getElementsByClassName("drag-handle")[0] as HTMLElement
  if (handle) {
    // if present, the handle is where you move the DIV from:
    handle.onmousedown = dragMouseDown
  } else {
    // otherwise, move the DIV from anywhere inside the DIV:
    dragEl.onmousedown = dragMouseDown
  }

  // When the element resizes (e.g. view queue) ensure it is still in the windows bounds
  const resizeObserver = new ResizeObserver(() => {
    ensureInBounds()
  }).observe(dragEl)

  function ensureInBounds() {
    newPosX = Math.min(
      document.body.clientWidth - dragEl.clientWidth,
      Math.max(0, dragEl.offsetLeft),
    )
    newPosY = Math.min(
      document.body.clientHeight - dragEl.clientHeight,
      Math.max(0, dragEl.offsetTop),
    )

    positionElement()
  }

  function positionElement() {
    const halfWidth = document.body.clientWidth / 2
    const anchorRight = newPosX + dragEl.clientWidth / 2 > halfWidth

    // set the element's new position:
    if (anchorRight) {
      dragEl.style.left = "unset"
      dragEl.style.right =
        document.body.clientWidth - newPosX - dragEl.clientWidth + "px"
    } else {
      dragEl.style.left = newPosX + "px"
      dragEl.style.right = "unset"
    }

    dragEl.style.top = newPosY + "px"
    dragEl.style.bottom = "unset"

    if (savePos) {
      localStorage.setItem(
        "Comfy.MenuPosition",
        JSON.stringify({
          x: dragEl.offsetLeft,
          y: dragEl.offsetTop,
        }),
      )
    }
  }

  function restorePos() {
    let rawPos = localStorage.getItem("Comfy.MenuPosition")
    if (rawPos) {
      const pos = JSON.parse(rawPos) as Position
      newPosX = pos.x
      newPosY = pos.y
      positionElement()
      ensureInBounds()
    }
  }

  let savePos = true

  function dragMouseDown(e: MouseEvent) {
    e.preventDefault()
    // get the mouse cursor position at startup:
    posStartX = e.clientX
    posStartY = e.clientY
    document.onmouseup = closeDragElement
    // call a function whenever the cursor moves:
    document.onmousemove = elementDrag
  }

  function elementDrag(e: MouseEvent) {
    e.preventDefault()

    dragEl.classList.add("comfy-menu-manual-pos")

    // calculate the new cursor position:
    posDiffX = e.clientX - posStartX
    posDiffY = e.clientY - posStartY
    posStartX = e.clientX
    posStartY = e.clientY

    newPosX = Math.min(
      document.body.clientWidth - dragEl.clientWidth,
      Math.max(0, dragEl.offsetLeft + posDiffX),
    )
    newPosY = Math.min(
      document.body.clientHeight - dragEl.clientHeight,
      Math.max(0, dragEl.offsetTop + posDiffY),
    )

    positionElement()
  }

  window.addEventListener("resize", () => {
    ensureInBounds()
  })

  function closeDragElement() {
    document.onmouseup = null
    document.onmousemove = null
  }
}
let moduleSelf: HTMLElement | null = null
onMount(() => {
  if (moduleSelf) {
    enableDragElement(moduleSelf)
  }
})
</script>

<div class="menu" bind:this={moduleSelf}>
  <div class="drag-handle">
    <p>drag me</p>
  </div>
</div>

<style>
.drag-handle {
  overflow: hidden;
  position: relative;
  width: 100%;
  cursor: grab;
}

.menu {
  width: 10rem;
  height: 20rem;
  position: absolute;
  top: 0;
  left: 0;
  z-index: 10;
  color: white;
  background-color: rgba(0, 0, 0, 0.5);
}
</style>
