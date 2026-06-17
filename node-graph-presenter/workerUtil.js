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
