// graph-edge.js — A-Frame component for edges of a graph
// Copyright © 2026 by Doug Reeder under the MIT License

AFRAME.registerComponent('graph-edge', {
  schema: {
    // id: {default: ''},
    title: {default: ''},
    color: {type: 'color'},
    opacity: {default: 1.0},
    fromId: {default: ''},
    // naturalStart: {type: 'vec3'},
    start: {type: 'vec3'},
    toId: {default: ''},
    // naturalEnd: {type: 'vec3'},
    end: {type: 'vec3'},
  },

  event: {
  },

  init: function () {
    // console.debug(`graph-edge init `, this.data);

    // this.el.setAttribute('id', this.data.id);
    this.el.setAttribute('line', {start: this.data.start, end: this.data.end, color: this.data.color, opacity: this.data.opacity});
    this.setEdgeTitle(this.data.title, this.data.start, this.data.end);
  },

  handlers: {},

  update: function (oldData) {
    this.el.setAttribute('line', {start: this.data.start, end: this.data.end, color: this.data.color, opacity: this.data.opacity});

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

  // play: function () {},
  // pause: function () {},
  // tick: function (time, timeDelta) {},

  remove: function () {
    for (const child of Array.from(this.el.children)) {
      child.remove();
    }
  },
});
