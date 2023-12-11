import { LGraph, LGraphCanvas, LiteGraph, LGraphNode } from "litegraph.js"

export default class Example extends LGraphNode {
  public static readonly nodeClass = "basic"
  public static readonly subNodeClass = "Example"
  public static readonly type = `${Example.nodeClass}/${Example.subNodeClass}`

  static register() {
    LiteGraph.registerNodeType(this.type, Example)
  }

  constructor() {
    super()
    this.title = "Example Node"
    this.addInput("in", "number")
    this.addOutput("out", "number")
    this.properties = { a: 1 }
  }
  onExecute() {
    const input = this.getInputData(0)
    this.setOutputData(0, input)
  }
}
