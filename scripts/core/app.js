import {
  simple, util, Vector2, Vector3, Matrix4, math, ToolOp, PropTypes, NumberConstraints, TextBoxBase
} from '../path.ux/pathux.js';

import './editor.js';
import {Mesh, MeshTypes} from './mesh.js';
import {Workspace} from './editor.js';
import {FileArgs} from '../path.ux/scripts/simple/file.js';
import {PropertiesBag} from './property_templ.js';
import {Context} from './context.js';

export const STARTUP_FILE_KEY = "_startup_file_apss";

export const Properties = {
  dimen      : {type: "int", value: 1, min: 32, max: 1024, slideSpeed: 15, baseUnit: "none", displayUnit: "none"},
  drawTree   : {type: "bool", value: true},
  drawSpheres: {type: "bool", value: true},
  dist       : {type: "float", value: 0.5, baseUnit: "meter", displayUnit: "meter"},
  percent    : {
    type: "float", value: 0.5, displayUnit: "percent", baseUnit: "none", min: 0.0, max: 1.0, decimalPlaces: 0
  },
};

window.addEventListener("contextmenu", (e) => {
  console.log(e);

  if (window._appstate && _appstate.screen) {
    let elem = _appstate.screen.pickElement(e.x, e.y);

    if (elem instanceof TextBoxBase || elem.tagName === "INPUT") {
      return;
    }
  }
  e.preventDefault();
});


export class App extends simple.AppState {
  constructor() {
    super(Context);

    this.doAutoSave = true;

    this.mesh = undefined;
    this.properties = undefined;

    this.createNewFile(true);

    this.saveFilesInJSON = true;
  }

  createNewFile(noReset = false) {
    if (!noReset) {
      this.reset();
      this.makeScreen();
    }

    this.properties = new PropertiesBag(Properties);

    this.mesh = new Mesh();
    let s = 50;
    let d = 200;
    let v1 = this.mesh.makeVertex([s, s, 0]);
    let v2 = this.mesh.makeVertex([s, s + d, 0]);
    let v3 = this.mesh.makeVertex([s + d, s + d, 0]);
    let v4 = this.mesh.makeVertex([s + d, s, 0]);

    this.mesh.makeFace([v1, v2, v3, v4]);
  }

  saveStartupFile() {
    this.saveFile().then((json) => {
      json = JSON.stringify(json);

      localStorage[STARTUP_FILE_KEY] = json;
      console.log("Saved startup file", (json.length/1024.0).toFixed(2) + "kb");
    });
  }

  loadStartupFile() {
    if (!(STARTUP_FILE_KEY in localStorage)) {
      return;
    }

    try {
      let json = JSON.parse(localStorage[STARTUP_FILE_KEY]);
      this.loadFile(json);
    } catch (error) {
      util.print_stack(error);
      this.doAutoSave = false;
      console.warn("Failed to load startup file; disabling save timer");

      this.createNewFile();

      if (this.ctx) {
        this.ctx.error("Load error; disabling autosave");
      }
    }
  }

  saveFileSync(objects, args = {}) {
    if (args.useJSON === undefined) {
      args.useJSON = true;
    }

    return super.saveFileSync([
      this.mesh, this.properties
    ], args);
  }

  saveFile(args = {}) {
    return new Promise((accept, reject) => {
      accept(this.saveFileSync([this.mesh, this.properties], args));
    });
  }

  loadFileSync(data, args = {}) {
    if (args.useJSON === undefined) {
      args.useJSON = true;
    }

    let file = super.loadFileSync(data, args);
    console.log(file.objects);

    this.mesh = file.objects[0];
    this.properties = file.objects[1] ?? this.properties;

    this.properties.patchTemplate(Properties);

    window.redraw_all();

    return file;
  }

  loadFile(data, args = {}) {
    return new Promise((accept, reject) => {
      accept(this.loadFileSync(data, args));
    });
  }

  draw() {
    for (let sarea of this.screen.sareas) {
      if (sarea.area && sarea.area.draw) {
        sarea.area.draw();
      }
    }
  }

  on_tick() {
    if (this.doAutoSave && util.pollTimer("save", 1000)) {
      this.saveStartupFile();
    }
  }

  start() {
    try {
      super.start({
        iconsheet: document.getElementById("iconsheet"),
        DEBUG    : {
          modalEvents: true
        }
      });
    } catch (error) {
      this.doAutoSave = false;
      util.print_stack(error);
      throw error;
    }

    this.loadStartupFile();
  }
}

export function start() {
  console.log("start!");

  window.setInterval(() => {
    if (window._appstate) {
      window._appstate.on_tick();
    }
  }, 55);

  let animreq = undefined;

  function f() {
    animreq = undefined;

    _appstate.draw();
  }

  let ignore_lvl = 0;
  window.draw_ignore_push = function () {
    ignore_lvl++;
  }
  window.draw_ignore_pop = function () {
    ignore_lvl = Math.max(ignore_lvl - 1, 0);
  }

  window.redraw_all = function () {
    if (animreq || ignore_lvl) {
      return;
    }

    console.warn("redraw_all");
    animreq = requestAnimationFrame(f);
  }

  window._appstate = new App();
  _appstate.start();

  window.redraw_all();
}