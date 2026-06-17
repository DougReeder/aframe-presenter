// graphUtil.js — node graph utilities for Node Graph Presenter
// Copyright © 2026 by Doug Reeder under the MIT License

async function removeAllChildren(parentEl) {
  // captures old children before new children are added
  const oldChildren = Array.from(parentEl.children);
  for (const childEl of oldChildren) {
    parentEl.removeChild(childEl);
    disposeTree(childEl.object3D);
    // await new Promise(resolve => setTimeout(resolve, 200));
  }
}

function disposeTree(tree) {
  if (!tree) return;
  tree?.traverse?.(object => {
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
