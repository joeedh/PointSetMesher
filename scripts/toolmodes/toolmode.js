import config from '../config/config.js';

import {
  KeyMap, color2css, css2color,
  Vector3, Matrix4, Quat, util, nstructjs, math,
  Vector4, UIBase, HotKey, haveModal, Vector2,
  EnumProperty
} from '../path.ux/scripts/pathux.js';

import {getElemColor, MeshTypes, MeshFlags, MeshFeatures} from '../core/mesh.js';
import '../core/mesh_ops.js';
import '../core/transform_ops.js';
import '../core/mesh_selectops.js';

import {SelToolModes} from '../core/mesh_ops.js';

export const ToolModeClasses = [];

export let toolModeEnumProp;

export function getToolEnumProp() {
  if (toolModeEnumProp) {
    return toolModeEnumProp;
  }

  let enumdef = {};
  let uinames = {};
  let descr = {};
  let icons = {};
  let i = 0;

  for (let cls of ToolModeClasses) {
    let def = cls.toolDefine;

    enumdef[def.typeName] = i++;
    uinames[def.typeName] = def.uiName;
    icons[def.typeName] = def.icon ?? -1;
    descr[def.typeName] = def.description ?? "";
  }


  toolModeEnumProp = new EnumProperty(undefined, enumdef)
    .addIcons(icons)
    .addUINames(uinames)
    .addDescriptions(descr);

  return toolModeEnumProp;
}

export class ToolMode {
  constructor(ctx) {
    this.ctx = ctx;
    this.keymap = new KeyMap()
    this.selMask = this.constructor.toolDefine.selMask;
    this.highMask = this.selMask; /* Highlight mask. */
  }

  getEditMenu() {
    return [];
  }

  on_activate() {
    window.redraw_all();
  }

  on_inactivate() {
  }

  static getClass(name) {
    for (let cls of ToolModeClasses) {
      if (cls.toolDefine.typeName === name) {
        return cls;
      }
    }
  }

  static getClassIndex(name) {
    let i = 0;

    for (let cls of ToolModeClasses) {
      if (cls.toolDefine.typeName === name) {
        return i;
      }

      i++;
    }
  }

  static register(cls) {
    if (!cls.hasOwnProperty("toolDefine")) {
      throw new Error(cls.name + " lacks a toolDefine static property");
    }

    let def = cls.toolDefine;

    if (!def.typeName) {
      throw new Error("toolDefine lacks typeName");
    }
    if (!def.uiName) {
      throw new Error("toolDefine lacks uiName");
    }
    if (def.selMask === undefined) {
      throw new Error("toolDefine lacks selMask");
    }

    ToolModeClasses.push(cls);
  }

  static toolDefine = {
    typeName   : "",
    uiName     : "",
    icon       : undefined, /* Optional icon, e.g. `Icons.XXX` */
    selMask    : 0, /* e.g. `MeshTypes.VERTEX | MeshTypes.HANDLE` */
    description: undefined, /* Tooltip string */
  };

  on_mousedown(localX, localY, e) {

  }

  on_mousemove(localX, localY, e) {

  }

  on_mouseup(localX, localY, e) {

  }

  draw() {

  }

  getKeymap() {
    return this.keymap;
  }
}

export class PickData {
  constructor(elem, type, dist) {
    this.elem = elem;
    this.type = type;
    this.dist = dist;
  }

  load(elem, type, dist) {
    this.elem = elem;
    this.type = type;
    this.dist = dist;

    return this;
  }
}

let pick_cachering = util.cachering.fromConstructor(PickData, 32);

export class MeshToolBase extends ToolMode {
  constructor(ctx) {
    super(ctx);

    this.startMpos = new Vector2();
    this.mpos = new Vector2();

    this.keymap = new KeyMap([
      new HotKey("A", ["CTRL"], "mesh.toggle_select_all(mode='ADD')|Select All"),
      new HotKey("A", [], "mesh.toggle_select_all(mode='ADD')|Select All"),
      new HotKey("A", ["ALT"], "mesh.toggle_select_all(mode='SUB')|Deselect All"),
      new HotKey("A", ["CTRL", "SHIFT"], "mesh.toggle_select_all(mode='SUB')|Deselect All"),
      new HotKey("G", [], "transform.translate()|Move"),
      new HotKey("S", [], "transform.scale()|Scale"),
      new HotKey("R", [], "transform.rotate()|Rotate"),
      new HotKey("E", [], "mesh.split_selected_edges()"),
      new HotKey("X", [], "mesh.dissolve_vertex()"),
      new HotKey("Delete", [], "mesh.dissolve_vertex()"),
      new HotKey("L", [], "mesh.select_linked(pick=true mode='ADD')|Select Linked"),
      new HotKey("L", ["SHIFT"], "mesh.select_linked(pick=true mode='SUB')|Deselect Linked"),
      new HotKey("F", [], "mesh.make_face"),
    ])

    this.mdown = false;
  }


  draw(ctx, canvas, g) {
    this.ctx = ctx;

    let mesh = this.ctx.mesh;
    let dpi = UIBase.getDPI();

    let w = 8;

    for (let e of mesh.edges.visible) {
      g.strokeStyle = color2css(getElemColor(mesh.edges, e));
      g.beginPath();
      g.moveTo(e.v1[0], e.v1[1]);
      g.lineTo(e.v2[0], e.v2[1]);
      g.stroke();
    }

    if (mesh.haveHandles) {
      for (let h of mesh.handles.visible) {
        g.strokeStyle = color2css(getElemColor(mesh.handles, h));
        let v = h.owner.vertex(h);

        g.beginPath();
        g.moveTo(v[0], v[1]);
        g.lineTo(h[0], h[1]);
        g.stroke();
      }
    }

    let vlists = [mesh.verts]
    if (mesh.haveHandles) {
      vlists.push(mesh.handles);
    }

    g.strokeStyle = "rgba(10, 10, 10, 0.2)"

    for (let list of vlists) {
      for (let v of list.visible) {
        if (v.type === MeshTypes.VERTEX) {
          let scale = 45.0;

          v.checkNormal();

          g.beginPath();
          g.moveTo(v[0], v[1]);
          g.lineTo(v[0] + v.no[0]*scale, v[1] + v.no[1]*scale);
          g.stroke();
        }

        g.fillStyle = color2css(getElemColor(list, v));
        g.beginPath();
        g.rect(v[0] - w*0.5, v[1] - w*0.5, w, w);
        g.fill();
      }
    }

    for (let f of mesh.faces.visible) {
      g.beginPath();
      let color = new Vector4(getElemColor(mesh.faces, f));
      color[3] = 0.15;

      g.fillStyle = color2css(color);
      for (let list of f.lists) {
        let first = true;
        for (let l of list) {
          if (first) {
            first = false;
            g.moveTo(l.v[0], l.v[1]);
          } else {
            g.lineTo(l.v[0], l.v[1]);
          }
        }

        g.closePath();
      }

      g.fill();
    }

    if (this.ctx.properties.drawTree) {
      mesh.checkSpatialTree();
      mesh.spatialTree.draw(canvas, g);
    }

    if (this.ctx.properties.drawSpheres) {
      for (let v of mesh.verts.visible) {
        v.sphere.draw(canvas, g);
      }
    }
  }

  getEditMenu() {
    let ret = [];

    for (let hk in this.keymap) {
      if (typeof hk === "string") {
        ret.push(hk.action);
      }
    }

    return ret;
  }

  pick(localX, localY, highMask = this.highMask, limit = 25) {
    let mesh = this.ctx.mesh;

    let mpos = new Vector3();
    mpos[0] = localX;
    mpos[1] = localY;
    mpos[2] = 0.0;

    let dpi = UIBase.getDPI();
    limit *= dpi;

    let mindis, minret;
    const do_point = highMask & (MeshTypes.VERTEX | MeshTypes.EDGE);

    let vlist = (list) => {
      for (let v of list) {
        if (v.flag & MeshFlags.HIDE) {
          continue;
        }

        mpos[2] = v.length > 2 ? v[2] : 0.0;

        let dis = v.vectorDistance(mpos);
        if (dis >= limit) {
          continue;
        }

        if (!minret || dis < mindis) {
          mindis = dis;
          minret = pick_cachering.next().load(v, v.type, dis);
        }
      }
    }

    const point_pad_min = config.POINT_EDGE_PAD.min;
    const point_pad_max = config.POINT_EDGE_PAD.max;
    const point_pad_perc = config.POINT_EDGE_PAD.percent;

    if (highMask & MeshTypes.EDGE) {
      let mine, mindis_e;

      for (let e of mesh.edges) {
        let dis = math.dist_to_line_2d(mpos, e.v1, e.v2);

        let point_pad = e.v1.vectorDistance(e.v2)*point_pad_perc;
        point_pad = Math.min(Math.max(point_pad, point_pad_min), point_pad_max);

        if (dis < limit && (mindis === undefined || dis < mindis_e)) {
          mindis_e = dis;
          mindis = dis + point_pad;
          mine = e;
        }
      }

      if (mine) {
        minret = pick_cachering.next().load(mine, MeshTypes.EDGE, mindis_e);
      }
    }

    if (highMask & MeshTypes.VERTEX) {
      vlist(mesh.verts);
    }

    if (highMask & MeshTypes.HANDLE) {
      vlist(mesh.handles);
    }

    return minret ? minret.elem : undefined;
  }

  on_mousedown(localX, localY, e) {
    this.mdown = e.button === 0;
    this.startMpos.loadXY(localX, localY);
    this.mpos.load(this.startMpos);

    this.updateHighlight(localX, localY);

    let mesh = this.ctx.mesh;

    if (mesh.hasHighlight) {
      let type, elem;

      for (let k in mesh.elists) {
        let elist = mesh.elists[k];

        if (elist.highlight) {
          type = elist.type;
          elem = elist.highlight;
        }
      }

      if (!(this.selMask & type)) {
        return false;
      }

      let mode;
      if (e.shiftKey) {
        mode = elem.flag & MeshFlags.SELECT ? SelToolModes.SUB : SelToolModes.ADD;
      } else {
        mode = SelToolModes.ADD;
      }

      this.ctx.api.execTool(this.ctx, "mesh.select_one", {
        mode,
        unique : !e.shiftKey,
        elemEid: elem.eid,
      });

      return true;
    }
  }

  updateHighlight(localX, localY) {
    let elem = this.pick(localX, localY);
    let mesh = this.ctx.mesh;

    let update = false;

    /* Clear all other highlight. */
    update = mesh.setHighlight(elem, true);
    //console.log("set highlight", update);

    if (update) {
      window.redraw_all();
    }
    return update;
  }

  on_mousemove(localX, localY, e) {
    this.mpos.loadXY(localX, localY);

    if (haveModal()) {
      this.mdown = false;
      return;
    }

    this.updateHighlight(localX, localY);

    if (this.mdown) {
      let mesh = this.ctx.mesh;

      let act = false;
      let selmask = this.selMask;

      for (let elist of mesh.getElists()) {
        if (!(elist.type & selmask)) {
          continue;
        }

        act = act || elist.selected.length > 0;
      }

      if (act && this.mpos.vectorDistance(this.startMpos) > 10) {
        this.mdown = false;
        this.ctx.api.execTool(this.ctx, "transform.translate()");
      }
    }
  }

  on_mouseup(localX, localY, e) {
    this.mdown = false;
  }
}
