export default {
  MESH_HANDLES: true,

  /** When picking verts/handles and edges at the same time
   *  controls how much verts/handles should be favored
   *  over edges
   */
  POINT_EDGE_PAD: {
    percent: 0.2, /* Margin is a percentage of edge length. */
    min    : 5, /* Margin will always be at least this much. */
    max    : 35, /* Maximum margin. */
  },
};
