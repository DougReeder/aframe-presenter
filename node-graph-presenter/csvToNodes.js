// csvToNodes.js — converts Noda .CSV data to Three.js objects
// Copyright © 2026 by Doug Reeder under the MIT License

async function csvToNodes(url, flavorCsv, graphEl) {
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
    Papa.parse(url, {
      download: true,
      header: true,
      // dynamicTyping: {PositionX: true, PositionY: true, PositionZ: true, Opacity: true, Size: true},
      worker: true,
      skipEmptyLines: 'greedy',
      complete: function(result) {
        if (!result || typeof result !== "object" ) {
          console.error('Papa Parse result not object:', result);
          // reject(new Error('Papa Parse result not object'));   // can't be certain it's already rejected
          return;
        }
        const {data = [], errors: parseErrors = [], meta = {}} = result;

        if (meta.aborted) {
          console.error('Papa Parse aborted');
          errors.push('Parsing aborted');
        }
        console.log('Papa Parse result:', result);

        let numNodes = 0, numEdges = 0;
        for (let row of data) {
          let id, title, notes, imageUrl, linkUrl, color, opacity, primitive, collapsed, position, size, fromId, toId;
          switch (flavorCsv) {   // the flavorCsv determines what fields of row to read
            case 'NODA':
              ({id, title, notes, imageUrl, linkUrl, color, opacity, primitive, collapsed, position, size, fromId, toId} = mapNodaValues(row));
              break;
          }
          if (!Number.isNaN(position.x) || !Number.isNaN(position.y) || !Number.isNaN(position.z)) {   // node
            if (!id) {
              info.push(`node “${title || notes}” has no ID`);
            }

            const el = document.createElement('a-entity');
            el.setAttribute('id', id);
            el.setAttribute('graph-node', {id, title, notes, imageUrl, linkUrl, color, opacity, primitive, collapsed});
            position.x ||= 0;
            position.y ||= 0;
            position.z ||= 0;
            el.object3D.position.copy(position);
            // el.setAttribute('rotation', '0 45 0');
            el.object3D.scale.set(size, size, size);
            el.object3D.userData.id = id;
            el.classList.add(PRESENTATION_CLASS);
            graphEl.appendChild(el);

            if (elMap.has(id)) {
              warnings.push(`duplicate node ID "${id}"`);
            }
            // edges refer to the _most recently_ defined node with the given ID
            elMap.set(id, el);
            ++numNodes;
          } else if (fromId || toId) {   // edge
            const fromPosition = elMap.get(fromId)?.object3D?.position;
            if (!fromPosition) {
              console.warn(`can't find “from” node for edge “${title || notes || id}”`);
              warnings.push(`can't find “from” node for edge “${title || notes || id}”`);
              continue;
            }
            const toPosition = elMap.get(toId)?.object3D?.position;
            if (!toPosition) {
              console.warn(`can't find “to” node for edge “${title || notes || id}”`);
              warnings.push(`can't find “to” node for edge “${title || notes || id}”`);
              continue;
            }
            const points = [fromPosition, toPosition];
            const geometry = new THREE.BufferGeometry().setFromPoints(points);
            const material = new THREE.LineBasicMaterial({color});
            const object = new THREE.Line(geometry, material);
            if (title) {object.name = title}
            graph.add(object);
            ++numEdges;
          } else {
            console.warn(`unknown thing “${title || notes?.slice(0, 20) || primitive || imageUrl}”`);
            warnings.push(`unknown thing “${title || notes?.slice(0, 20) || primitive || imageUrl}”`);
          }
        }
        info.push(`Parsed ${data.length} rows; added ${numNodes} nodes and ${numEdges} edges`);
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
        if (url?.startsWith('data:') && (!err.message || /network/i.test(err.message))) {
          console.log('Papa Parse file error:', err, file, url);
        } else {
          console.error('Papa Parse file error:', err, file, url);
          reject(err);
        }
      }
    });
  });

  console.debug("nodes:", graph.children);
  return {errors, warnings, info};
}

function mapNodaValues(row) {
  const id = row.Uuid;

  const title = row.Title;

  const notes = row.Notes;

  const imageUrl = row.ImageURL;

  const linkUrl = row.PageURL;

  const color = threeJsColor(row.Color);

  const opacity = parseNumber(row.Opacity);

  let primitive;
  switch (row.Shape) {
    case 'Ball':
      primitive = 'sphere';
      break;
    case 'Box':
      primitive = 'box';
      break;
    case 'Tetra':
      primitive = 'tetrahedron';
      break;
    case 'Cylinder':
      primitive = 'cylinder';
      break;
    case 'Diamond':   // octahedron
      primitive = 'octahedron';
      break;
    case 'Hourglass': // hourglass
      primitive = 'cone';
      break;
    case 'Flat':
      primitive = 'plane';
      break;
    case 'Plus':   // 3D plus sign (7 cubes)
    case 'Star':   // stellated dodecahedron
    default:
      primitive = 'torusKnot';
      break;
  }

  const collapsed = ['yes','y','true','t','1'].includes(row.Collapsed?.toLowerCase());

  const position = new THREE.Vector3(parseNumber(row.PositionX), parseNumber(row.PositionY), parseNumber(row.PositionZ));

  const size = parseInt(row.Size || "5") / 50;

  const fromId = row.FromUuid;
  const toId = row.ToUuid;

  return {id, title, notes, imageUrl, linkUrl, color, opacity, primitive, collapsed, position, size, fromId, toId};
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
    return value;
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
