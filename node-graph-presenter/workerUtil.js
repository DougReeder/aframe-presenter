// workerUtil.js — utilities for web worker for Node Graph Presenter
// Copyright © 2026 by Doug Reeder under the MIT License

export const SIM_SCALE = 100;

const CSS_ILLEGAL_CHARS = /[^-_A-Za-z0-9\u00A0-\uFFFF]/g;

export function cssSafeId(id) {
  if (id) {
    return ('' + id).replace(CSS_ILLEGAL_CHARS, '').replace(/^-+/, '').replace(/^(\d)/, 'z$1');
  } else {
    return 'a' + Math.floor(Math.random()*Number.MAX_SAFE_INTEGER);
  }
}

export function threeJsColor(color) {
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

/**
 * Sets visible on descendants which don't have (another) visible ancestor
 * @param {boolean} isExpand — expand or collapse
 * @param {Object} toggledNode — the node which just had collapsed set
 */
export function showHideDescendants(isExpand, toggledNode) {
  const family = new Set().add(toggledNode);
  collectDescendants(toggledNode, family);

  for (const descendant of family) {
    if (descendant === toggledNode) { continue; }

    let anyParentVisible = false;
    for (const inLink of descendant.in) {
      if (inLink.source.visible && !inLink.source.collapsed && (isExpand || !family.has(inLink.source))) {
        anyParentVisible = true;
        break;
      }
    }

    if (isExpand ? anyParentVisible : !anyParentVisible) {
      descendant.visible = isExpand;
      const nodes = [descendant];
      const links = [];
      for (const inLink of descendant.in) {
        inLink.visible = isExpand;
        links.push(inLink);
      }
      for (const outLink of descendant.out) {
        outLink.visible = isExpand;
        links.push(outLink);
      }
      postMessage({kind: 'UPDATE', nodes, links, msg: (isExpand ? "expanding" : "collapsing") + ` ${nodes.length} nodes & ${links.length} edges`});
    }
  }
}

function collectDescendants(node, family) {
  for (const outLink of node.out) {
    const child = outLink.target;
    if (family.has(child)) { continue; }   // deals w/ cycles
    family.add(child);
    collectDescendants(child, family);
  }
}
