// graph-node.js — A-Frame component for nodes of a graph
// Copyright © 2026 by Doug Reeder under the MIT License

AFRAME.registerComponent('graph-node', {
  schema: {
    uuid: {default: ''},
    title: {default: ''},
    notes: {default: ''},
    imageUrl: {type: 'asset'},
    pageUrl: {type: 'asset'},
    color: {type: 'color'},
    opacity: {default: 1.0},
    shape: {default: 'Box'},
    collapsed: {default: false},
  },

  event: {
  },

  init: function () {
    console.debug(`graph-node init `, this.data);

    this.setNodeGeometry(this.data.shape);
    this.setNodeMaterial(this.data.color);
    this.setNodeTitle(this.data.title);
  },

  handlers: {},

  update: function (oldData) {
    let geometry, material;
    if (this.data.shape !== oldData.shape) {
      this.setNodeGeometry(this.data.shape);
    }
    if (this.data.color !== oldData.color) {
      this.setNodeMaterial(this.data.color);
    }
    if (this.data.title !== oldData.title) {
      this.setNodeTitle(this.data.title);
    }
  },

  setNodeGeometry: function (shape) {
    switch (shape) {
      case 'Ball':
        this.el.setAttribute('geometry', {primitive: 'sphere'});
        return;
      case 'Box':
        const boxLength = (Math.sin(Math.PI / 4) + 1);
        this.el.setAttribute('geometry', {primitive: 'box', width: boxLength, height: boxLength, depth: boxLength});
        return;
      case 'Tetra':
        this.el.setAttribute('geometry', {primitive: 'tetrahedron', radius: 1.3});   // fudge factor
        return;
      case 'Cylinder':
        const cylinderSize = (Math.sin(Math.PI / 4) + 1) / 2;
        this.el.setAttribute('geometry', {primitive: 'cylinder', radius: cylinderSize, height: cylinderSize * 2});
        return;
      case 'Diamond':   // octahedron
        this.el.setAttribute('geometry', {primitive: 'octahedron', radius: 1.1});   // fudge factor
        return;
      case 'Hourglass': // hourglass
        const hourglassCoordinate = (Math.sin(Math.PI / 4) + 1) / 2;
        this.el.setAttribute('geometry', {primitive: 'cone', radiusTop: 0});
        return;
      // case 'Plus':   // 3D plus sign (7 cubes)
      //   const plusDim = (Math.sin(Math.PI * 5 / 12) + 1) / 2;
      //   const plusPoints = [new THREE.Vector2(0, -plusDim), new THREE.Vector2(plusDim / 3, -plusDim), new THREE.Vector2(plusDim / 3, -plusDim / 3), new THREE.Vector2(plusDim, -plusDim / 3), new THREE.Vector2(plusDim, plusDim / 3), new THREE.Vector2(plusDim / 3, plusDim / 3), new THREE.Vector2(plusDim / 3, plusDim), new THREE.Vector2(0, plusDim)];
      //   return new THREE.LatheGeometry(plusPoints, 4);
      // case 'Star':   // stellated dodecahedron
      //   const starPoints = [
      //     new THREE.Vector2(0, -size),
      //     new THREE.Vector2(Math.sin(Math.PI / 6) * size / 2, -Math.cos(Math.PI / 6) * size / 2),
      //     new THREE.Vector2(Math.sin(Math.PI / 3) * size, -Math.cos(Math.PI / 3) * size),
      //     new THREE.Vector2(size / 2, 0),
      //     new THREE.Vector2(Math.sin(Math.PI / 3) * size, Math.cos(Math.PI / 3) * size),
      //     new THREE.Vector2(Math.sin(Math.PI / 6) * size / 2, Math.cos(Math.PI / 6) * size / 2),
      //     new THREE.Vector2(0, size)];
      //   return new THREE.LatheGeometry(starPoints, 3);
      default:
        this.el.setAttribute('geometry', {primitive: 'torusKnot' /*, radius: size, radiusTubular: 0.3*size*/});
        return;
    }
  },

  setNodeMaterial: function (color) {
    const opacity = this.data.opacity ?? 1.0;
    this.el.setAttribute('material', {color: this.threeJsColor(color), opacity, transparent: (opacity < 1)});
  },

  threeJsColor: function (color) {
    color = new String(color).trim();

    if (/^[0-9A-Fa-f]{3}$/.test(color)) {
      return '#'+color;
    }
    if (/^[0-9A-Fa-f]{6}$/.test(color)) {
      return '#'+color;
    }

    if (/^\w+$/.test(color)) {
      return color;
    }

    const digits = '0123456789ABCDEF';
    let randomColor = '0x';
    for (let i = 0; i < 6; i++) {
      randomColor += digits[Math.floor(Math.random() * 16)];
    }
    return parseInt(randomColor);
  },

  setNodeTitle: function (title) {
    const wrapCount = 50;
    this.el.setAttribute('text', {value: title /*+ '\\n\\n\\n\\n\\n\\n\\n\\n\\n\\n '*/, zOffset: 1, align: 'center', width: 6, /*height: 1,*/ wrapCount, side: 'double'});
  },

  // play: function () {},
  // pause: function () {},
  // tick: function (time, timeDelta) {},

  remove: function () {

  },

});
