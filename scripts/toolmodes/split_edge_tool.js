import {MeshToolBase, ToolMode} from './toolmode.js';
import {MeshTypes, MeshFlags} from '../core/mesh_base.js';
import {Mesh} from '../core/mesh.js';
import {Icons} from '../../assets/icon_enum.js';
import {UIBase, util, math, Vector2, Vector3} from '../path.ux/pathux.js';

export class SplitEdgeTool extends MeshToolBase {
  constructor(ctx) {
    super(ctx);

    this.highMask = this.selMask | MeshTypes.EDGE;
  }

  on_mousemove(localX, localY, e) {
    let ret = super.on_mousemove(localX, localY, e);
    this.#check_edge_highlight();
    return ret;
  }

  getSplitEdge() {
    let e = this.ctx.mesh.edges.highlight;
    if (!e) {
      return undefined;
    }

    let {p, t} = e.closestPoint(this.mpos);

    /* Ensure mouse is "reasonably" close to edge. */
    const limit = 200*UIBase.getDPI();

    if (p.vectorDistance(this.mpos) > limit) {
      return undefined;
    }

    return {e, p, t};
  }

  draw(ctx, canvas, g) {
    super.draw(ctx, canvas, g);

    let mesh = this.ctx.mesh;
    if (!mesh || !mesh.edges.highlight) {
      return;
    }

    let ep = this.getSplitEdge();
    if (!ep) {
      return;
    }

    let p = ep.p;

    g.save();

    g.strokeColor = "rgb(255, 200, 25)";
    g.lineWidth *= 4;

    let r = 5*UIBase.getDPI();

    g.beginPath();
    g.arc(p[0], p[1], r, -Math.PI, Math.PI);
    g.stroke();

    g.restore();
  }

  #check_edge_highlight() {
    if (this.getSplitEdge()) {
      window.redraw_all();
    }
  }

  on_mousedown(localX, localY, event) {
    if (super.on_mousedown(localX, localY, event)) {
      this.#check_edge_highlight();
      return;
    }

    let ep = this.getSplitEdge();
    if (!ep) {
      return;
    }

    console.log("ep", ep);
    this.ctx.api.execTool(this.ctx, "mesh.split_edge", {
      edgeEid: ep.e.eid,
      t      : ep.t
    });

  }

  static toolDefine = {
    typeName: "split_edge",
    uiName  : "Split Edge",
    icon    : Icons.SPLIT_EDGE,
    selMask : MeshTypes.VERTEX
  };
}

ToolMode.register(SplitEdgeTool);
