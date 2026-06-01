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
    primitive: {default: 'box'},
    size: {default: 0.05},
    collapsed: {default: false},
    naturalPosition: {type: 'vec3'},
  },

  event: {
  },

  init: function () {
    console.debug(`graph-node init `, this.data);

    this.setNodeGeometry(this.data.primitive, this.data.size);
    this.setNodeMaterial(this.data.color, this.data.opacity, this.data.primitive === 'plane');
  },

  handlers: {},

  update: function (oldData) {
    if (this.data.primitive !== oldData.primitive) {
      if (this.el.components.geometry) {
        this.el.getObject3D('mesh')?.geometry?.dispose?.();
      }
      this.setNodeGeometry(this.data.primitive, this.data.size);
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
      this.setNodeMaterial(this.data.color, this.data.opacity, this.data.primitive === 'plane');
    }
    if ((this.data.title || oldData.title) && this.data.title !== oldData.title) {
      this.setNodeTitle(this.data.title, this.data.size, this.data.primitive === 'plane');
    }
    if ((this.data.notes || oldData.notes) && this.data.notes !== oldData.notes ) {
      this.setNotesChild(this.data.notes, this.data.size);
    }
    if ((this.data.linkUrl || oldData.linkUrl) && this.data.linkUrl !== oldData.linkUrl) {
      this.setLinkChild(this.data.linkUrl, this.data.size);
    }
  },

  setNodeGeometry: function (primitive, size) {
    switch (primitive) {
      case 'sphere':
        this.el.setAttribute('geometry', {primitive: 'sphere', radius: size/2});
        return;
      case 'box':
        const boxLength =  size * (Math.sin(Math.PI / 4) + 1) / 2;
        this.el.setAttribute('geometry', {primitive: 'box', width: boxLength, height: boxLength, depth: boxLength});
        return;
      case 'tetrahedron':
        this.el.setAttribute('geometry', {primitive: 'tetrahedron', radius: size * 1.3 / 2});   // fudge factor
        return;
      case 'cylinder':
        const cylinderHeight = size * (Math.sin(Math.PI / 4) + 1) / 2;
        this.el.setAttribute('geometry', {primitive: 'cylinder', radius: cylinderHeight / 2, height: cylinderHeight});
        return;
      case 'octahedron':   // octahedron
        this.el.setAttribute('geometry', {primitive: 'octahedron', radius: size * 1.1 / 2});   // fudge factor
        return;
      case 'cone':
        this.el.setAttribute('geometry', {primitive: 'cone', height: size,  radiusTop: 0, radiusBottom: size / 2});
        return;
      // case 'Hourglass': // hourglass
      //   const hourglassCoordinate = (Math.sin(Math.PI / 4) + 1) / 2;
      //   const hourglassPoints = [new THREE.Vector2(0, -hourglassCoordinate), new THREE.Vector2(hourglassCoordinate, -hourglassCoordinate), new THREE.Vector2(0, 0), new THREE.Vector2(hourglassCoordinate, hourglassCoordinate), new THREE.Vector2(0, hourglassCoordinate)];
      //   return new THREE.LatheGeometry(hourglassPoints);
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
      case 'plane':
        this.el.setAttribute('geometry', {primitive: 'plane', width: 0, height: 0});   // adapts to title
        return;
      default:
        this.el.setAttribute('geometry', {primitive: 'torusKnot' , radius: size / 2, radiusTubular: 0.3 * size / 2});
        return;
    }
  },

  setNodeMaterial: function (color, opacity = 1.0, isDoubleSide = false) {
    this.el.setAttribute('material', {
      // shader: 'flat',
      color: color,
      opacity, transparent: (opacity < 1),
      side: isDoubleSide ? 'double' : 'front'   // A-Frame constants, not Three.js constants
    });
  },

  setNodeTitle: function (title, size, isFlat = false) {
    this.el.setAttribute('text', {
      value: title /*+ '\\n\\n\\n\\n\\n\\n\\n\\n\\n\\n '*/,
      zOffset: isFlat ? 0.001 : size / 2 + 0.005,
      align: 'center',
      width: size * 6, /*height: 1,*/
      wrapCount: 25,
      side: 'double'});
  },

  setNotesChild: function (notes, size) {
    this.el.querySelector('a-text')?.remove();
    if (!notes) return;

    const textEl = document.createElement('a-text');
    textEl.object3D.position.set(0, size, 0);
    textEl.setAttribute('value', notes);
    textEl.setAttribute('width', size * 4);
    textEl.setAttribute('wrap-count', 25);
    textEl.setAttribute('anchor', 'center');
    textEl.setAttribute('baseline', 'center');

    textEl.setAttribute('geometry', 'primitive: plane; width: 0; height: 0');
    textEl.setAttribute('material', 'color: black; opacity: 0.667');

    this.el.appendChild(textEl);
  },

  setLinkChild: function (linkUrl, size) {
    this.el.querySelector('a-link')?.remove();
    if (!linkUrl) return;

    const linkEl = document.createElement('a-link');
    linkEl.object3D.position.set(0, -(size/2 + 0.04), 0);
    linkEl.object3D.scale.set(0.025, 0.025, 0.025);
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
