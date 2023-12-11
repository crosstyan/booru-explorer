import {
  LGraph,
  LGraphCanvas,
  LiteGraph,
  LGraphNode,
} from "litegraph.js"

export class ImageFrame extends LGraphNode {
  public static readonly nodeClass = "Graph"
  public static readonly subNodeClass = "ImageFrame"
  public static readonly type = `${ImageFrame.nodeClass}/${ImageFrame.subNodeClass}`

  private _url: string = ""
  private dirty: boolean = false
  url: string = ""
  title: string = "Image Frame"
  img: null | HTMLImageElement = null

  /**
   * if true, the aspect ratio of the image is maintained when resizing the node
   * otherwise, a black background is used to pad the image
   */
  isFixedAspectRatio: boolean = true

  static register() {
    LiteGraph.registerNodeType(this.type, ImageFrame)
  }

  constructor() {
    super()
    this.addWidget("button", "load", null, () => {
      this.loadImage(this.url, (img) => this.resize(img))
    })
  }

  resize(img: HTMLImageElement) {
    this.size[1] = (img.height / img.width) * this.size[0]
  }

  override onAdded() {
    if (this.properties["url"] != "" && this.img == null) {
      this.loadImage(this.url, (img) => this.resize(img))
    }
  }

  override onExecute(): void {
    if (!this.img) {
      this.boxcolor = "#000"
    }
    if (this.img && this.img.width) {
      this.setOutputData(0, this.img)
    } else {
      this.setOutputData(0, null)
    }
    if (this.img && this.dirty) {
      this.dirty = false
    }
  }

  /**
   * Here's where the magic happens
   */
  override onDrawBackground(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement): void {
    if (this.flags.collapsed) {
      return
    }
    if (!this.img) {
      return
    }
    const [iw, ih] = [this.img.width, this.img.height]
    const [cw, ch] = this.size
    if (this.isFixedAspectRatio) {
      if (cw > 5 && ch > 5) {
        ctx.drawImage(this.img, 0, 0, cw, ch)
      }
    } else {
      // try to maintain aspect ratio
      // padding with black
      // Calculate the aspect ratios of the image and the canvas
      const imageAspectRatio = iw / ih
      const canvasAspectRatio = cw / ch

      let renderWidth, renderHeight, offsetX, offsetY

      // If image's aspect ratio is less than the canvas's aspect ratio
      if (imageAspectRatio < canvasAspectRatio) {
        // Fit to height and maintain aspect ratio
        renderHeight = ch
        renderWidth = renderHeight * imageAspectRatio
        offsetX = (cw - renderWidth) / 2 // center horizontally
        offsetY = 0 // align top
      } else {
        // Fit to width and maintain aspect ratio
        renderWidth = cw
        renderHeight = renderWidth / imageAspectRatio
        offsetX = 0 // align left
        offsetY = (ch - renderHeight) / 2 // center vertically
      }

      // Fill canvas with black to pad the image
      ctx.fillStyle = "black"
      ctx.fillRect(0, 0, cw, ch)

      // Draw the image on the canvas, centered and maintaining aspect ratio
      ctx.drawImage(this.img, offsetX, offsetY, renderWidth, renderHeight)
    }
  }

  override loadImage(url: string, callback?: (img: HTMLImageElement) => void): void {
    if (url == "") {
      this.img = null
      return
    }

    const promise = new Promise<void>(async (resolve, reject) => {
      const result = await fetch(this.url)
      if (result.headers.get("content-type")?.indexOf("image") == -1) {
        reject("URL does not point to an image")
      }
      const blob = await result.blob()
      const url = URL.createObjectURL(blob)
      // https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Using_images
      this.img = new Image()
      this.img.src = url
      this.boxcolor = "#F95"
      this.img.onload = (ev: Event) => {
        if (callback) {
          if (this.img) {
            callback(this.img)
          }
        }
        this.dirty = true
        this.boxcolor = "#9F9"
        this.setDirtyCanvas(true, false)
        resolve()
      }
      this.img.onerror = function () {
        reject("error loading the image:" + url)
      }
    })

    promise.catch((err) => {
      console.log(err)
    })
  }

  /**
   * @override
   */
  onDropFile(file: Blob | MediaSource): void {
    if (this._url) {
      URL.revokeObjectURL(this._url)
    }
    this._url = URL.createObjectURL(file)
    this.url = this._url
    this.loadImage(this._url, (img) => this.resize(img))
  }

  /**
   * @override
   * @sa https://github.com/jagenjo/litegraph.js/issues/129
   */
  onResize(size: [number, number]): void {
    if (this.isFixedAspectRatio) {
      if (this.img) {
        const ar = this.img.height / this.img.width
        const [w, h] = size
        this.size = [w, w * ar]
      }
    } else {
      // do nothing
    }
  }

  /**
   * @override
   */
  onDblClick(e: MouseEvent, pos: [number, number]): void { }
}
