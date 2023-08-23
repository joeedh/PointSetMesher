import {
  simple, nstructjs, util, math, Vector2, UIBase, Icons, KeyMap, haveModal, ToolOp, ToolClasses, HotKey, createMenu,
  startMenu
} from '../path.ux/pathux.js';
import {getElemColor} from './mesh.js';
import {ToolMode, ToolModeClasses} from '../toolmodes/toolmode.js';
import '../toolmodes/all_tools.js';

export class LoadDefaultsOp extends ToolOp {
  static tooldef() {
    return {
      uiname  : "Load Defaults",
      toolpath: "app.load_defaults",
      inputs  : {},
      outputs : {}
    }
  }

  exec(ctx) {
    ctx.state.createNewFile(true);
    window.redraw_all();
  }
}

ToolOp.register(LoadDefaultsOp);

export class Workspace extends simple.Editor {
  constructor() {
    super();

    this.editMenu = [];
    this.canvas = document.createElement("canvas");
    this.g = this.canvas.getContext("2d");

    this.mpos = new Vector2();

    this.toolmode = undefined;

    this.shadow.appendChild(this.canvas);

    this.keymap = new KeyMap();
    this.keymap.add(new HotKey("Space", [], () => {
      let menu = [];

      for (let cls of ToolClasses) {
        let def = cls.tooldef();

        menu.push(def.toolpath);
      }

      menu = createMenu(this.ctx, "Find Tool", menu);

      let mpos = this.ctx.screen.mpos;
      startMenu(menu, mpos[0], mpos[1], true);

      console.log(menu);
    }));

    this.switchToolMode("split_edge");

    let eventBad = (e) => {
      if (haveModal()) {
        return true;
      }

      let elem = this.ctx.screen.pickElement(e.x, e.y);
      return elem && elem !== this && elem !== this.canvas;
    }

    this.addEventListener("pointerover", (e) => {
      let mpos = this.getLocalMouse(e.x, e.y);
      this.mpos.load(mpos);
    });

    this.addEventListener("pointerdown", (e) => {
      let mpos = this.getLocalMouse(e.x, e.y);
      this.mpos.load(mpos);

      if (eventBad(e)) {
        return;
      }

      this.toolmode.on_mousedown(mpos[0], mpos[1], e);
    });

    this.addEventListener("pointermove", (e) => {
      let mpos = this.getLocalMouse(e.x, e.y);
      this.mpos.load(mpos);

      if (eventBad(e)) {
        return;
      }

      this.toolmode.on_mousemove(mpos[0], mpos[1], e);
    });

    this.addEventListener("pointerup", (e) => {
      let mpos = this.getLocalMouse(e.x, e.y);
      this.mpos.load(mpos);

      if (eventBad(e)) {
        return;
      }

      this.toolmode.on_mouseup(mpos[0], mpos[1], e);
    });
  }

  static defineAPI(api, st) {

  }

  static define() {
    return {
      tagname : "workspace-editor-x",
      areaname: "workspace-editor-x",
      uiname  : "Workspace",
    }
  }

  switchToolMode(name) {
    let cls = ToolMode.getClass(name);

    if (cls === undefined) {
      throw new Error("Unknown tool mode " + name);
    }

    if (this.toolmode && this.toolmode instanceof cls) {
      return;
    }

    if (this.toolmode) {
      this.toolmode.on_inactivate();
    }

    this.toolmode = new cls(this.ctx);
    this.toolmode_i = ToolMode.getClassIndex(name);

    this.toolmode.on_activate();
    this.regenEditMenu();
  }

  getGlobalMouse(x, y) {
    let mpos = new Vector2();
    let r = this.canvas.getBoundingClientRect();

    let dpi = UIBase.getDPI();

    mpos[0] = x/dpi + r.x;
    mpos[1] = y/dpi + r.y;

    return mpos;
  }

  getLocalMouse(x, y) {
    let mpos = new Vector2();
    let r = this.canvas.getBoundingClientRect();

    let dpi = UIBase.getDPI();

    mpos[0] = (x - r.x)*dpi;
    mpos[1] = (y - r.y)*dpi;

    return mpos;
  }

  getKeyMaps() {
    return [this.keymap, this.toolmode.keymap];
  }


  regenEditMenu() {
    let menu = this.editMenu;

    menu.length = 0;

    menu.push(["Undo", () => {
      this.ctx.toolstack.undo();
    }, new HotKey("Z", ["CTRL"], "").buildString()]);

    menu.push(["Redo", () => {
      this.ctx.toolstack.redo();
    }, new HotKey("Z", ["CTRL", "SHIFT"], "").buildString()]);

    let doKeyMap = (keymap) => {
      for (let hk of keymap) {
        if (typeof hk.action !== "string") {
          continue;
        }

        let key = hk.action;
        if (hk.uiname) {
          key += "|" + hk.uiname;
        }
        key += "::" + hk.buildString();

        menu.push(key);
      }
    };

    for (let keymap of this.getKeyMaps()) {
      doKeyMap(keymap);
    }
  }

  init() {
    super.init();

    this.toolmode.ctx = this.ctx;

    let sidebar = this.makeSideBar();

    let header = this.header;
    let row;

    header.dynamicMenu("Edit", this.editMenu);

    row = header.row();
    row.iconbutton(Icons.UNDO, "Undo", () => {
      this.ctx.toolstack.undo();
    });
    row.iconbutton(Icons.REDO, "Redo", () => {
      this.ctx.toolstack.redo();
    });

    row.button("Save Defaults", () => {
      _appstate.saveStartupFile();
    })

    row.tool("app.load_defaults()");

    let tab;
    tab = sidebar.tab("Options");

    let props = UIBase.createElement("props-bag-editor-x");
    props.setAttribute("datapath", "properties");

    tab.add(props);
  }

  draw() {
    if (!this.ctx) {
      return;
    }

    let canvas = this.canvas;

    let dpi = UIBase.getDPI();
    let w = ~~(this.size[0]*dpi);
    let h = ~~(this.size[1]*dpi) - 50*dpi;

    if (w !== canvas.width || h !== canvas.height) {
      canvas.width = w;
      canvas.height = h;

      canvas.style["width"] = "" + (w/dpi) + "px";
      canvas.style["height"] = "" + (h/dpi) + "px";
    }

    this.g.clearRect(0, 0, canvas.width, canvas.height);
    this.toolmode.draw(this.ctx, this.canvas, this.g);
  }

  setCSS() {
    this.canvas.style["position"] = "absolute";
  }
}

Workspace.STRUCT = nstructjs.inherit(Workspace, simple.Editor, "Workspace") + `
}`;
simple.Editor.register(Workspace);

