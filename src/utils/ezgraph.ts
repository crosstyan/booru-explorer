import { LGraphNode, LiteGraph, LGraphCanvas } from "litegraph.js"
import type { IWidget, ContextMenuItem, INodeInputSlot, INodeOutputSlot, LGraph } from "litegraph.js"

type LGNode = InstanceType<typeof LGraphNode> & { widgets?: Array<IWidget> }
type EzNodeFactory = (...args: EzOutput[] | [...EzOutput[], Record<string, unknown>]) => EzNode
type LLink = InstanceType<typeof LiteGraph.LLink>

// https://github.com/comfyanonymous/ComfyUI/blob/57926635e8d84ae9eea4a0416cc75e363f5ede45/tests-ui/utils/ezgraph.js
// a typescript version of this cursed code
interface App {
	graph: LGraph
	canvas: LGraphCanvas
	canvasElement: HTMLCanvasElement
	loadGraphData: (data: unknown) => Promise<void>
}

interface EzNodeCtor {
	new(node: EzNode, index: number, obj: any): any
}

export class EzConnection {
	/** @type { app } */
	app
	/** @type { InstanceType<LG["LLink"]> } */
	link

	get originNode() {
		const node = this.app.graph.getNodeById(this.link.origin_id)
		if (!node) {
			throw new Error(`Unable to find node with ID ${this.link.origin_id}.`)
		}
		return new EzNode(this.app, node)
	}

	get originOutput() {
		return this.originNode.outputs[this.link.origin_slot]
	}

	get targetNode() {
		const node = this.app.graph.getNodeById(this.link.target_id)
		if (!node) {
			throw new Error(`Unable to find node with ID ${this.link.target_id}.`)
		}
		return new EzNode(this.app, node)
	}

	get targetInput() {
		return this.targetNode.inputs[this.link.target_slot]
	}

	constructor(app: App, link: LLink) {
		this.app = app
		this.link = link
	}

	disconnect() {
		this.targetInput.disconnect()
	}
}

export class EzSlot {
	/** @type { EzNode } */
	node
	/** @type { number } */
	index

	/**
	 * @param { EzNode } node
	 * @param { number } index
	 */
	constructor(node: EzNode, index: number) {
		this.node = node
		this.index = index
	}
}

export class EzInput extends EzSlot {
	/** @type { INodeInputSlot } */
	input

	/**
	 * @param { EzNode } node
	 * @param { number } index
	 * @param { INodeInputSlot } input
	 */
	constructor(node: EzNode, index: number, input: INodeInputSlot) {
		super(node, index)
		this.input = input
	}

	disconnect() {
		this.node.node.disconnectInput(this.index)
	}
}

export class EzOutput extends EzSlot {
	/** @type { INodeOutputSlot } */
	output

	/**
	 * @param { EzNode } node
	 * @param { number } index
	 * @param { INodeOutputSlot } output
	 */
	constructor(node: EzNode, index: number, output: INodeOutputSlot) {
		super(node, index)
		this.output = output
	}

	get connections() {
		return (this.node.node.outputs?.[this.index]?.links ?? []).map(
			(l) => new EzConnection(this.node.app, this.node.app.graph.links[l])
		)
	}

	/**
	 * @param { EzInput } input
	 */
	connectTo(input: EzInput) {
		if (!input) throw new Error("Invalid input")

		/**
		 * @type { LG["LLink"] | null }
		 */
		const link = this.node.node.connect(this.index, input.node.node, input.index)
		if (!link) {
			const inp = input.input
			const inName = inp.name || inp.label || inp.type
			throw new Error(
				`Connecting from ${input.node.node.type}#${input.node.id}[${inName}#${input.index}] -> ${this.node.node.type}#${this.node.id}[${this.output.name ?? this.output.type
				}#${this.index}] failed.`
			)
		}
		return link
	}
}

export class EzNodeMenuItem {
	/** @type { EzNode } */
	node
	/** @type { number } */
	index
	/** @type { ContextMenuItem } */
	item

	/**
	 * @param { EzNode } node
	 * @param { number } index
	 * @param { ContextMenuItem } item
	 */
	constructor(node: EzNode, index: number, item: ContextMenuItem) {
		this.node = node
		this.index = index
		this.item = item
	}

	call(selectNode = true) {
		if (!this.item?.callback) throw new Error(`Menu Item ${this.item?.content ?? "[null]"} has no callback.`)
		if (selectNode) {
			this.node.select()
		}
		// @ts-ignore too lazy to create event, just pass undefined
		return this.item.callback.call(this.node.node, null, {}, undefined, undefined, this.node.node)
	}
}

export class EzWidget {
	/** @type { EzNode } */
	node
	/** @type { number } */
	index
	/** @type { IWidget } */
	widget

	/**
	 * @param { EzNode } node
	 * @param { number } index
	 * @param { IWidget } widget
	 */
	constructor(node: EzNode, index: number, widget: IWidget) {
		this.node = node
		this.index = index
		this.widget = widget
	}

	get value() {
		return this.widget.value
	}

	set value(v) {
		this.widget.value = v
		// @ts-ignore fewer parameters
		this.widget.callback?.call?.(this.widget, v)
	}

	get isConvertedToInput() {
		// @ts-ignore : this type is valid for converted widgets
		return this.widget.type === "converted-widget"
	}

	getConvertedInput() {
		if (!this.isConvertedToInput) {
			throw new Error(`Widget ${this.widget.name} is not converted to input.`)
		}

		const name = this.widget.name
		// @ts-ignore widget should exist
		return this.node.inputs.find((inp) => inp.input["widget"]?.name === this.widget.name)
	}

	convertToWidget() {
		if (!this.isConvertedToInput)
			throw new Error(`Widget ${this.widget.name} cannot be converted as it is already a widget.`)
		this.node.menu[`Convert ${this.widget.name} to widget`].call()
	}

	convertToInput() {
		if (this.isConvertedToInput)
			throw new Error(`Widget ${this.widget.name} cannot be converted as it is already an input.`)
		this.node.menu[`Convert ${this.widget.name} to input`].call()
	}
}

export class EzNode {
	/** @type { app } */
	app
	/** @type { LGNode } */
	node

	/**
	 * @param { app } app
	 * @param { LGNode } node
	 */
	constructor(app: App, node: LGNode) {
		this.app = app
		this.node = node
	}

	get id() {
		return this.node.id
	}

	get inputs() {
		return this.#makeLookupArray("inputs", "name", EzInput)
	}

	get outputs() {
		return this.#makeLookupArray("outputs", "name", EzOutput)
	}

	get widgets() {
		return this.#makeLookupArray("widgets", "name", EzWidget)
	}

	get menu() {
		return this.#makeLookupArray(() => this.app.canvas.getNodeMenuOptions(this.node), "content", EzNodeMenuItem)
	}

	get isRemoved() {
		return !this.app.graph.getNodeById(this.id)
	}

	select(addToSelection = false) {
		this.app.canvas.selectNode(this.node, addToSelection)
	}


	#makeLookupArray<T extends EzNodeCtor>(
		nodeProperty: "inputs" | "outputs" | "widgets" | (() => Array<unknown>),
		nameProperty: string,
		ctor: T): Record<string, InstanceType<T>> & Array<InstanceType<T>> {
		const items = typeof nodeProperty === "function" ? nodeProperty() : this.node[nodeProperty]
		// @ts-expect-error cursed code
		return (items ?? []).reduce((p, s, i) => {
			if (!s) {
				return p
			}
			// @ts-expect-error
			const name: any = s[nameProperty]
			const item = new ctor(this, i, s)
			// @ts-expect-error
			p.push(item)
			if (name) {
				// @ts-expect-error
				if (name in p) {
					throw new Error(`Unable to store ${nodeProperty} ${name} on array as name conflicts.`)
				}
			}
			// @ts-expect-error
			p[name] = item
			return p
		}, Object.assign([], { $: this }))
	}
}

export class EzGraph {
	/** @type { app } */
	app

	/**
	 * @param { app } app
	 */
	constructor(app: App) {
		this.app = app
	}

	get nodes() {
		// @ts-ignore: access private property
		return this.app.graph._nodes.map((n) => new EzNode(this.app, n))
	}

	clear() {
		this.app.graph.clear()
	}

	arrange() {
		this.app.graph.arrange()
	}

	stringify() {
		return JSON.stringify(this.app.graph.serialize(), undefined)
	}

	/**
	 * @param { number | LGNode | EzNode } obj
	 * @returns { EzNode }
	 */
	find(obj: number | LGNode | EzNode) {
		let match
		let id
		if (typeof obj === "number") {
			id = obj
		} else {
			id = obj.id
		}

		match = this.app.graph.getNodeById(id)

		if (!match) {
			throw new Error(`Unable to find node with ID ${id}.`)
		}

		return new EzNode(this.app, match)
	}

	/**
	 * @returns { Promise<void> }
	 */
	reload() {
		const graph = JSON.parse(JSON.stringify(this.app.graph.serialize()))
		return new Promise((r) => {
			this.app.graph.clear()
			setTimeout(async () => {
				await this.app.loadGraphData(graph)
				// @ts-ignore
				r()
			}, 10)
		})
	}
}

export const Ez = {
	/**
	 * Quickly build and interact with a ComfyUI graph
	 * @example
	 * const { ez, graph } = Ez.graph(app);
	 * graph.clear();
	 * const [model, clip, vae] = ez.CheckpointLoaderSimple().outputs;
	 * const [pos] = ez.CLIPTextEncode(clip, { text: "positive" }).outputs;
	 * const [neg] = ez.CLIPTextEncode(clip, { text: "negative" }).outputs;
	 * const [latent] = ez.KSampler(model, pos, neg, ...ez.EmptyLatentImage().outputs).outputs;
	 * const [image] = ez.VAEDecode(latent, vae).outputs;
	 * const saveNode = ez.SaveImage(image);
	 * console.log(saveNode);
	 * graph.arrange();
	 * @param { app } app
	 * @param { LG["LiteGraph"] } LG
	 * @param { LG["LGraphCanvas"] } canvas
	 * @param { boolean } clearGraph
	 * @returns { { graph: EzGraph, ez: Record<string, EzNodeFactory> } }
	 */
	graph(app: App, LG: typeof LiteGraph = LiteGraph, clearGraph = true) {
		// Always set the active canvas so things work
		LGraphCanvas.active_canvas = app.canvasElement

		if (clearGraph) {
			app.graph.clear()
		}

		// @ts-ignore : this proxy handles utility methods & node creation
		const factory = new Proxy(
			{},
			{
				get(_, p) {
					if (typeof p !== "string") throw new Error("Invalid node")
					const node = LG.createNode(p)
					if (!node) throw new Error(`Unknown node "${p}"`)
					app.graph.add(node)

					/**
					 * @param {Parameters<EzNodeFactory>} args
					 */
					return function (...args: Parameters<EzNodeFactory>) {
						const ezNode = new EzNode(app, node)
						const inputs = ezNode.inputs

						let slot = 0
						for (const arg of args) {
							if (arg instanceof EzOutput) {
								arg.connectTo(inputs[slot++])
							} else {
								for (const k in arg) {
									ezNode.widgets[k].value = arg[k]
								}
							}
						}

						return ezNode
					}
				},
			}
		)

		return { graph: new EzGraph(app), ez: factory }
	},
}
