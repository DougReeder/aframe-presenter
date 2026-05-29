// csvToNodes.js — converts Noda .CSV data to Three.js objects
// Copyright © 2026 by Doug Reeder under the MIT License

const SPIKY_FUDGE_FACTOR = 1.3;

async function csvToNodes(url, graphEl) {
  console.debug('csvToNodes: url = ' + url);

  for (const child of Array.from(graphEl.children)) {
    child.remove();
  }
  const graph = graphEl.object3D;
  graph.name = 'graph';
  disposeTree(graph);

  const errors = [];
  const warnings = [];
  const info = [];
  const elMap = new Map();

  await new Promise((resolve, reject) => {
    const data = Papa.parse(url, {
      download: true,
      header: true,
      // dynamicTyping: {PositionX: true, PositionY: true, PositionZ: true, Opacity: true, Size: true},
      worker: true,
      skipEmptyLines: 'greedy',
      complete: function(result) {
        if (!result || typeof result !== "object" ) {
          reject(new Error('Papa Parse result not object'));   // can't be certain it's already rejected
          return;
        }
        const {data = [], errors: parseErrors = [], meta = {}} = result;

        if (meta.aborted) {
          errors.push('Parsing aborted');
        }

        for (let row of data) {
          if (row.PositionX || row.PositionY || row.PositionZ) {   // node
            if (!row.Uuid) continue;

            const el = document.createElement('a-entity');
            el.setAttribute('id', row.Uuid);
            el.setAttribute('graph-node', {uuid: row.Uuid, title: row.Title, notes: row.Notes, imageUrl: row.ImageURL, linkUrl: row.PageURL, color: row.Color, opacity: row.Opacity, shape: row.Shape, collapsed: row.Collapsed});
            el.object3D.position.set(parseNumber(row.PositionX), parseNumber(row.PositionY), parseNumber(row.PositionZ));
            // el.setAttribute('rotation', '0 45 0');
            const size = parseInt(row.Size || "5") / 50;
            el.object3D.scale.set(size, size, size);
            // el.setAttribute('link', 'href:../island/; title:Elfland; image:../island/screenshot.png; on:hitstart; visualAspectEnabled:true');
            el.object3D.userData.uuid = row.Uuid;
            el.classList.add(PRESENTATION_CLASS);
            graphEl.appendChild(el);

            if (elMap.has(row.Uuid)) {
              warnings.push(`duplicate node UUID "${row.Uuid}"`);
            }
            elMap.set(row.Uuid, el);
          } else if (row.FromUuid || row.ToUuid) {   // edge
            const fromPosition = elMap.get(row.FromUuid)?.object3D?.position;
            if (!fromPosition) {
              warnings.push(`can't find “from” node for edge “${row.Title || row.Notes || row.Uuid}”`);
              continue;
            }
            const toPosition = elMap.get(row.ToUuid)?.object3D?.position;
            if (!toPosition) {
              warnings.push(`can't find “to” node for edge “${row.Title || row.Notes || row.Uuid}”`);
              continue;
            }
            const points = [fromPosition, toPosition];
            const geometry = new THREE.BufferGeometry().setFromPoints(points);
            const material = new THREE.LineBasicMaterial({color: threeJsColor(row.Color)});
            const object = new THREE.Line(geometry, material);
            if (row.Title) {object.name = row.Title}
            graph.add(object);
          } else {
            warnings.push(`unknown thing “${row.Title || row.Shape || row.ImageURL}”`);
          }
        }
        for (let error of parseErrors) {
          switch (error.code) {
            case 'TooManyFields':
              break;   // Noda adds a comma at the end of the row
            default:
              console.warn('Papa Parse row error:', error);
              warnings.push(papaErrorToString(error));
          }
        }
        resolve();
      },
      error: function(err, file) {
        console.error('Papa Parse file error:', err, file);
        reject(err);
      }
    });
  });

  console.debug("nodes:", graph.children);
  return {errors, warnings, info};
}

function createNodeGeometry(row) {
  const size = parseInt(row.Size || "5") / 50;

  switch (row.Shape) {
    case 'Ball':
      return new THREE.SphereGeometry(size);
    case 'Box':
      const boxLength = (Math.sin(Math.PI / 4) + 1) * size;
      return new THREE.BoxGeometry(boxLength, boxLength, boxLength);
    case 'Tetra':
      return new THREE.TetrahedronGeometry(size * SPIKY_FUDGE_FACTOR);
    case 'Cylinder':
      const cylinderSize = (Math.sin(Math.PI / 4) + 1) / 2 * size;
      return new THREE.CylinderGeometry(cylinderSize, cylinderSize, cylinderSize * 2);
    case 'Diamond':   // octahedron
      return new THREE.OctahedronGeometry(size * 1.1);
    case 'Hourglass': // hourglass
      const hourglassCoordinate = (Math.sin(Math.PI / 4) + 1) / 2 * size;
      const hourglassPoints = [new THREE.Vector2(0, -hourglassCoordinate), new THREE.Vector2(hourglassCoordinate, -hourglassCoordinate), new THREE.Vector2(0, 0), new THREE.Vector2(hourglassCoordinate, hourglassCoordinate), new THREE.Vector2(0, hourglassCoordinate)];
      return new THREE.LatheGeometry(hourglassPoints);
    case 'Plus':   // 3D plus sign (7 cubes)
      const plusDim = (Math.sin(Math.PI * 5 / 12) + 1) / 2 * size;
      const plusPoints = [new THREE.Vector2(0, -plusDim), new THREE.Vector2(plusDim / 3, -plusDim), new THREE.Vector2(plusDim / 3, -plusDim / 3), new THREE.Vector2(plusDim, -plusDim / 3), new THREE.Vector2(plusDim, plusDim / 3), new THREE.Vector2(plusDim / 3, plusDim / 3), new THREE.Vector2(plusDim / 3, plusDim), new THREE.Vector2(0, plusDim)];
      return new THREE.LatheGeometry(plusPoints, 4);
    case 'Star':   // stellated dodecahedron
      const starPoints = [
        new THREE.Vector2(0, -size),
        new THREE.Vector2(Math.sin(Math.PI / 6) * size / 2, -Math.cos(Math.PI / 6) * size / 2),
        new THREE.Vector2(Math.sin(Math.PI / 3) * size, -Math.cos(Math.PI / 3) * size),
        new THREE.Vector2(size / 2, 0),
        new THREE.Vector2(Math.sin(Math.PI / 3) * size, Math.cos(Math.PI / 3) * size),
        new THREE.Vector2(Math.sin(Math.PI / 6) * size / 2, Math.cos(Math.PI / 6) * size / 2),
        new THREE.Vector2(0, size)];
      return new THREE.LatheGeometry(starPoints, 3);
    default:
      return new THREE.PlaneGeometry(size, size);
  }
}


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


function parseNumber(value) {
  if (typeof value === 'string') {
    value = value.trim();
    if (/-?\d+,\d+/.test(value)) {   // single comma => European format
      return parseFloat(value.replaceAll('.', '', 'g').replace(',', '.') || "0");
    } else {
      return parseFloat(value);
    }
  } else {
    return value || 0;
  }
}

function threeJsColor(color) {
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
}

function papaErrorToString(error) {
  if (error instanceof Error) {
    return error.message || error.name || error.toString();
  } else {
    let msg = '';
    if (error.row > -1) {
      msg = `row ${error.row}: `;
    }
    msg += error.message || error.code || error.type || error?.toString();
    return msg;
  }
}
