<script lang="ts">
// https://github.com/comfyanonymous/ComfyUI/blob/eccc9e64a631bb7ec02d61dbc6bf6c3ffefe96e4/web/scripts/ui.js#L610-L793
// I could certainly improve this
import { onMount } from "svelte"
import { assertDefined } from "../utils/assert"

interface Position {
  x: number
  y: number
}

const MenuPositionStorageKey = "App.MenuPosition"
const MenuPositionDragClassName = "app-menu-manual-pos"

export let themeColorBg: string = "#353535"
export let themeColorText: string = "#ffffff"
export let savePos: boolean = true
let moduleSelf: HTMLElement | null = null
let posDiffX = 0
let posDiffY = 0
let posStartX = 0
let posStartY = 0
let newPosX = 0
let newPosY = 0

function ensureInBounds() {
  assertDefined(moduleSelf)
  newPosX = Math.min(
    document.body.clientWidth - moduleSelf.clientWidth,
    Math.max(0, moduleSelf.offsetLeft),
  )
  newPosY = Math.min(
    document.body.clientHeight - moduleSelf.clientHeight,
    Math.max(0, moduleSelf.offsetTop),
  )
  positionElement()
}

function positionElement() {
  assertDefined(moduleSelf)
  const halfWidth = document.body.clientWidth / 2
  const anchorRight = newPosX + moduleSelf.clientWidth / 2 > halfWidth

  // set the element's new position:
  if (anchorRight) {
    moduleSelf.style.left = "unset"
    moduleSelf.style.right =
      document.body.clientWidth - newPosX - moduleSelf.clientWidth + "px"
  } else {
    moduleSelf.style.left = newPosX + "px"
    moduleSelf.style.right = "unset"
  }

  moduleSelf.style.top = newPosY + "px"
  moduleSelf.style.bottom = "unset"

  if (savePos) {
    localStorage.setItem(
      MenuPositionStorageKey,
      JSON.stringify({
        x: moduleSelf.offsetLeft,
        y: moduleSelf.offsetTop,
      }),
    )
  }
}

function restorePos() {
  let rawPos = localStorage.getItem(MenuPositionStorageKey)
  if (rawPos) {
    const pos = JSON.parse(rawPos) as Position
    newPosX = pos.x
    newPosY = pos.y
    positionElement()
    ensureInBounds()
  }
}

function enableDragElement(dragEl: HTMLElement) {
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

    dragEl.classList.add(MenuPositionDragClassName)

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

onMount(() => {
  if (moduleSelf) {
    enableDragElement(moduleSelf)
    if (savePos) {
      restorePos()
    }
  }
})
</script>

<div class="menu" bind:this={moduleSelf} style="--theme-bg: {themeColorBg}; --theme-text: {themeColorText}">
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

/**
should be placed in the right middle of the window
*/
.menu {
  width: 10rem;
  height: 20rem;
  position: absolute;
  top: 35%;
  right: 0;
  font-size: 15px;
  text-align: center;
  z-index: 999;
  display: flex;
  flex-direction: column;
  align-items: center;
  color: var(--theme-text);
  background-color: var(--theme-bg);
  font-family: sans-serif;
  padding: 10px;
  border-radius: 0 8px 8px 8px;
  box-shadow: 3px 3px 8px rgba(0, 0, 0, 0.4);
}
</style>