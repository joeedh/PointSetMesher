import {Vector3, Vector2, util, math, point_in_aabb_2d} from '../path.ux/scripts/pathux.js';

export class QuadNode {
  min = new Vector3([-2, -2, -2]);
  max = new Vector3([2, 2, 2]);

  constructor() {
    this.childs = [];
    this.verts = [];
    this.depth = 0;
    this.flag = 0;
    this.leaf = true;
  }

  addPoint(p, tree) {
    if (!this.leaf) {
      for (let n of this.childs) {
        if (math.point_in_aabb_2d(p, n.min, n.max)) {
          n.addPoint(p, tree);
          break;
        }
      }

      return;
    }

    this.verts.push(p);

    if (this.verts.length >= tree.leafLimit) {
      this.subdivide(tree);
    }
  }

  subdivide(tree) {
    this.leaf = false;

    console.log("Subdivide!", this);

    let dimen = this.max.copy().sub(this.min).mulScalar(0.5);

    for (let x = 0; x < 2; x++) {
      for (let y = 0; y < 2; y++) {
        let n = new QuadNode();
        n.min.load(this.min);
        n.min[0] += dimen[0]*x;
        n.min[1] += dimen[1]*y;

        n.max.load(n.min).add(dimen);
        this.childs.push(n);
      }
    }

    for (let v of this.verts) {
      this.addPoint(v, tree);
    }

    this.verts = [];
  }

  draw(canvas, g) {
    if (!this.leaf) {
      for (let n of this.childs) {
        n.draw(canvas, g);
      }

      return;
    }

    g.strokeStyle = "black";
    g.beginPath();
    g.rect(this.min[0], this.min[1], this.max[0] - this.min[0], this.max[1] - this.min[1]);
    g.stroke();
  }
}

export class QuadTree {
  constructor(min, max) {
    this.root = new QuadNode();
    this.leafLimit = 4;

    if (min) {
      this.root.min.load(min);
    }
    if (max) {
      this.root.max.load(max);
    }
  }

  addPoint(p) {
    this.root.addPoint(p, this);
  }

  draw(canvas, g) {
    this.root.draw(canvas, g);
  }
}
