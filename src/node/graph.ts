import { LGraph, LGraphCanvas, LiteGraph, LGraphNode, type IWidget, type IButtonWidget, type INumberWidget, type ISliderWidget, type IComboWidget } from "litegraph.js"

export type IWidgetType = IButtonWidget | INumberWidget | ISliderWidget | INumberWidget | IComboWidget

export class ImageFrame extends LGraphNode {
  public static readonly nodeClass = "Graph"
  public static readonly subNodeClass = "ImageFrame"
  public static readonly type = `${ImageFrame.nodeClass}/${ImageFrame.subNodeClass}`

  _url: string = ""
  url: string = ""
  title: string = "Image Frame"
  img: null | HTMLImageElement = null
  dirty: boolean = false

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
  override onDrawBackground(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement): void {
    if (this.flags.collapsed) {
      return
    }
    if (this.img && this.size[0] > 5 && this.size[1] > 5 && this.img.width) {
      ctx.drawImage(this.img, 0, 0, this.size[0], this.size[1])
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
      this.img = document.createElement("img")
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
        this.setDirtyCanvas(true, true)
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

  // this should be overriden but the type declaration is wrong
  onDropFile(file: Blob | MediaSource): void {
    if (this._url) {
      URL.revokeObjectURL(this._url)
    }
    this._url = URL.createObjectURL(file)
    this.url = this._url
    this.loadImage(this._url, (img) => this.resize(img))
  }
}
