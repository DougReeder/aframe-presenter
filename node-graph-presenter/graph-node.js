// graph-node.js — A-Frame component for nodes of a graph
// Copyright © 2026 by Doug Reeder under the MIT License

AFRAME.registerComponent('graph-node', {
  schema: {
    id: {default: ''},
    title: {default: ''},
    notes: {default: ''},
    imageUrl: {type: 'asset'},
    linkUrl: {type: 'asset'},
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
    this.setNodeMaterial(this.data.color, this.data.opacity, this.data.shape === 'Flat');
  },

  handlers: {},

  update: function (oldData) {
    if (this.data.shape !== oldData.shape) {
      if (this.el.components.geometry) {
        this.el.getObject3D('mesh')?.geometry?.dispose?.();
      }
      this.setNodeGeometry(this.data.shape);
    }
    if (this.data.color !== oldData.color || this.data.opacity !== oldData.opacity) {
      if (this.el.components.material) {
        const mesh = this.el.getObject3D('mesh');
        if (mesh?.material) {
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach(material => material.dispose());
          } else {
            mesh.material.dispose();
          }
        }
      }
      this.setNodeMaterial(this.data.color, this.data.opacity, this.data.shape === 'Flat');
    }
    if ((this.data.title || oldData.title) && this.data.title !== oldData.title) {
      this.setNodeTitle(this.data.title, this.data.shape === 'Flat');
    }
    if ((this.data.notes || oldData.notes) && this.data.notes !== oldData.notes ) {
      this.setNotesChild(this.data.notes);
    }
    if ((this.data.linkUrl || oldData.linkUrl) && this.data.linkUrl !== oldData.linkUrl) {
      this.setLinkChild(this.data.linkUrl);
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
      case 'Flat':
        const planeLength = (Math.sin(Math.PI / 4) + 1);
        this.el.setAttribute('geometry', {primitive: 'plane', width: 0, height: 0});   // adaps to title
        return;
      default:
        this.el.setAttribute('geometry', {primitive: 'torusKnot' /*, radius: size, radiusTubular: 0.3*size*/});
        return;
    }
  },

  setNodeMaterial: function (color, opacity = 1.0, isDoubleSide = false) {
    this.el.setAttribute('material', {
      color: this.threeJsColor(color),
      opacity, transparent: (opacity < 1),
      side: isDoubleSide ? 'double' : 'front'   // A-Frame constants, not Three.js constants
    });
  },

  threeJsColor: function (color) {
    if (typeof color !== 'string') {
      return color;
    }

    color = color.trim();

    if (/^[0-9A-Fa-f]{1,6}$/.test(color)) {
      color = ("00000" + color).slice(-6);
      return '#'+color;
    }

    if (/^\w+$/.test(color)) {
      return color;
    }

    const digits = '0123456789ABCDEF';
    let randomColor = '#';
    for (let i = 0; i < 6; i++) {
      randomColor += digits[Math.floor(Math.random() * 16)];
    }
    return randomColor;
  },

  setNodeTitle: function (title, isFlat = false) {
    const wrapCount = 50;
    this.el.setAttribute('text', {
      value: title /*+ '\\n\\n\\n\\n\\n\\n\\n\\n\\n\\n '*/,
      zOffset: isFlat ? 0.001 : 1.010,
      align: 'center',
      width: 6, /*height: 1,*/
      wrapCount: isFlat ? 20 : 50,
      side: 'double'});
  },

  setNotesChild: function (notes) {
    this.el.querySelector('a-text')?.remove();
    if (!notes) return;

    const textEl = document.createElement('a-text');
    textEl.object3D.position.set(0, 1.5, 0);
    textEl.setAttribute('value', notes);
    textEl.setAttribute('width', 3);
    textEl.setAttribute('anchor', 'center');
    textEl.setAttribute('baseline', 'center');

    textEl.setAttribute('geometry', 'primitive: plane; width: 0; height: 0');
    textEl.setAttribute('material', 'color: black; opacity: 0.667');

    this.el.appendChild(textEl);
  },

  setLinkChild: function (linkUrl) {
    this.el.querySelector('a-link')?.remove();
    if (!linkUrl) return;

    const linkEl = document.createElement('a-link');
    linkEl.object3D.position.set(0, -2.2, 0);
    linkEl.setAttribute('href', linkUrl);
    linkEl.setAttribute('title', ".");
    linkEl.setAttribute('image', "https://dougreeder.github.io/elfland-glider/city/screenshot.png");
    linkEl.setAttribute('on', 'raycaster-intersected');
    linkEl.classList.add(PRESENTATION_CLASS);
    this.el.appendChild(linkEl);
  },

  // play: function () {},
  // pause: function () {},
  // tick: function (time, timeDelta) {},

  remove: function () {
    for (const child of Array.from(this.el.children)) {
      child.remove();
    }

    const mesh = this.el.getObject3D('mesh');
    mesh?.geometry?.dispose();
    if (mesh?.material) {
      if (Array.isArray(mesh.material)) {
        mesh.material.forEach(material => material.dispose());
      } else {
        mesh.material.dispose();
      }
    }
  },

});
