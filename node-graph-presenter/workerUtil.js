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
  showHideChildren(isExpand, toggledNode, family);
}

function showHideChildren(isExpand, node, family) {
  for (const outLink of node.out) {
    const child = outLink.target;
    if (family.has(child)) { continue; }   // deals w/ cycles
    family.add(child);

    const isVisible = fullyExpandedLineageFromRoot(child, new Set());
    if (isExpand ? isVisible : !isVisible) {
      child.visible = isExpand;
      const nodes = [child];
      const links = [];
      for (const inLink of child.in) {
        inLink.visible = isExpand;
        links.push(inLink);
      }
      for (const outLink of child.out) {
        outLink.visible = isExpand;
        links.push(outLink);
      }
      postMessage({kind: 'UPDATE', nodes, links, msg: (isExpand ? "expanding" : "collapsing") + ` ${nodes.length} nodes & ${links.length} edges`});
    }

    showHideChildren(isExpand, child, family);
  }
}

function fullyExpandedLineageFromRoot(node, nodesChecked) {
  if (0 === node.in.size) { return !node.collapsed; }   // no ancestors; is root

  for (const inLink of node.in) {
    const parent = inLink.source;
    if (nodesChecked.has(parent)) { continue; }
    nodesChecked.add(parent);

    if (parent.collapsed) { continue; }
    if (fullyExpandedLineageFromRoot(parent, nodesChecked)) { return true; }
  }
  return false;
}
