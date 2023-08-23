import {MeshTypes} from '../core/mesh_base.js';
import {Vector3} from '../path.ux/scripts/pathux.js';
import {MeshToolBase, ToolMode} from './toolmode.js';

export class ExtrudeTool extends MeshToolBase {
  constructor(ctx) {
    super(ctx);
  }

  static toolDefine = {
    typeName: "extrude",
    uiName  : "Extrude",
    icon    : undefined,
    selMask : MeshTypes.VERTEX | MeshTypes.HANDLE,
  };

  on_mousedown(localX, localY, e) {
    if (super.on_mousedown(localX, localY, e)) {
      return;
    }

    if (e.button === 0) {
      let co = new Vector3([localX, localY, 0]);

      this.ctx.api.execTool(this.ctx, "mesh.extrude_vertex", {
        co
      });

      this.updateHighlight(localX, localY);
    }
  }
}

ToolMode.register(ExtrudeTool);
