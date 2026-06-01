// graphUtil.js — utilities for Node Graph Presenter
// Copyright © 2026 by Doug Reeder under the MIT License

function disposeTree(tree) {
  if (!tree) return;
  tree.traverse(object => {
    if (object.geometry) {
      object.geometry.dispose();
    }
    if (object.material) {
      if (Array.isArray(object.material)) {
        object.material.forEach(material => material.dispose());
      } else {
        object.material.dispose();
      }
    }
  });
  for (let i=tree.children.length-1; i>=0; i--) {
    tree.remove(tree.children[i]);
  }
}

function threeJsColor(color) {
  if (typeof color === 'number') {
    return color;
  }

  if (typeof color === 'string') {
    color = color.trim();

    if (/^[0-9A-Fa-f]{1,6}$/.test(color)) {   // hex color
      color = ("00000" + color).slice(-6);
      return '#' + color;
    }

    if (/^[a-zA-Z]+$/.test(color)) {   // named color
      return color;
    }
  }

  return '#FFFFFF';
}
