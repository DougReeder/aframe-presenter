// graph-edge.js — A-Frame component for edges of a graph
// Copyright © 2026 by Doug Reeder under the MIT License

AFRAME.registerComponent('graph-edge', {
  schema: {
    id: {default: ''},
    title: {default: ''},
    color: {type: 'color'},
    opacity: {default: 1.0},
    fromId: {default: ''},
    start: {type: 'vec3'},
    toId: {default: ''},
    end: {type: 'vec3'},
    preferredLength: {default: 0.30}, // in meters; used when adjusting node positions
  },

  event: {
  },

  init: function () {
    // console.debug(`graph-edge init `, this.data);
    this.el.setAttribute('id', this.data.id);
    this.el.setAttribute('line', {start: this.data.start, end: this.data.end, color: this.data.color, opacity: this.data.opacity});
    this.el.setAttribute('geometry', {primitive: 'cone', height: 0.04, radiusBottom: 0.0075, radiusTop: 0, segmentsRadial: 3, segmentsHeight: 1});
    this.el.setAttribute('material', {color: this.data.color});
    this.setEdgeTitle(this.data.title, this.data.start, this.data.end);
  },

  handlers: {},

  update: function (oldData) {
    this.setObject3Ds(this.data.start, this.data.end);

    if ((this.data.title || oldData.title) &&
        (this.data.title !== oldData.title || this.data.start !== oldData.start || this.data.end !== oldData.end)) {
      this.setEdgeTitle(this.data.title, this.data.start, this.data.end);
    }
  },

  setEdgeTitle: function (title, start, end) {
    this.el.querySelector('a-text')?.remove();
    title = title?.trim();
    if (!title) { return; }

    const titleEl = document.createElement('a-text');
    titleEl.object3D.position.set((start.x + end.x) / 2, (start.y + end.y) / 2 + 0.001, (start.z + end.z) / 2);
    titleEl.setAttribute('value', title);
    titleEl.setAttribute('width', 0.25);
    titleEl.setAttribute('wrap-count', 25);
    titleEl.setAttribute('baseline', 'bottom');
    titleEl.setAttribute('anchor', 'center');
    titleEl.setAttribute('align', 'center');
    titleEl.setAttribute('side', 'double');

    // titleEl.setAttribute('geometry', 'primitive: plane; width: 0; height: 0');
    // titleEl.setAttribute('material', 'color: black; opacity: 0.667');

    this.el.appendChild(titleEl);
  },

  /**
   * avoids setAttribute, which calls Croquet
   * @param {THREE.Vec3} start
   * @param {THREE.Vec3} end
   */
  setObject3Ds: function (start, end) {
    if (Number.isFinite(start?.x) && Number.isFinite(start?.y) && Number.isFinite(start?.z) &&
        Number.isFinite(end?.x) && Number.isFinite(end?.y) && Number.isFinite(end?.z)) {
      for (const child of this.el.object3D.children) {
        if (child.isLine) {
          child?.geometry?.setFromPoints?.([start, end]);
        } else if (child.isMesh) {   // arrowhead
          child?.position.set((start.x + 2 * end.x) / 3, (start.y + 2 * end.y) / 3, (start.z + 2 * end.z) / 3);
          const direction = new THREE.Vector3(end.x - start.x, end.y - start.y, end.z - start.z);
          if (direction.length() === 0) { continue; }   // The line isn't visible when it has zero length.
          direction.normalize();
          child?.quaternion.setFromUnitVectors(THREE.Object3D.DEFAULT_UP, direction);
        } else if (child.isGroup) {   // text
          child.position.set((2 * start.x + end.x) / 3, (2 * start.y + end.y) / 3 + 0.001, (2 * start.z + end.z) / 3);
        }
      }
    }
  },

  // play: function () {},
  // pause: function () {},
  // tick: function (time, timeDelta) {},

  remove: function () {
    for (const child of Array.from(this.el.children)) {
      child.remove();
    }
  },
});
