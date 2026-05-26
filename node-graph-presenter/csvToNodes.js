// csvToNodes.js — converts CSV data to Three.js objects
// Copyright © 2026 by Doug Reeder under the MIT License

async function csvToNodes(url) {
  console.debug('csvToNodes: url = ' + url);

  const graph = new THREE.Group();
  graph.name = 'graph';
  const errors = [];
  const warnings = [];
  const info = [];
  const nodeMap = new Map();

  await new Promise((resolve, reject) => {
    const data = Papa.parse(url, {
      download: true,
      header: true,
      complete: function({data, errors, meta}) {
        if (meta.aborted) {
          errors.push('Parsing aborted');
        }
        for (datum of data) {
          if (!datum.Uuid) continue;
          if (datum.PositionX || datum.PositionY || datum.PositionZ) {
            let geometry, material, object;
            switch (datum.Shape) {
              case 'Ball':
                geometry = new THREE.SphereGeometry(datum.Size || 1);
                break;
              default:
                geometry = new THREE.PlaneGeometry(datum.Size || 1, datum.Size || 1);
            }
            material = new THREE.MeshBasicMaterial( { color: threeJsColor(datum.Color) } );
            object = new THREE.Mesh( geometry, material );
            object.position.set(parseNumber(datum.PositionX), parseNumber(datum.PositionY), parseNumber(datum.PositionZ)).multiplyScalar(33);
            if (datum.Title) { object.name = datum.Title };
            graph.add( object );
            if (datum.Uuid) {
              nodeMap.set(datum.Uuid, object);
              object.userData.uuid = datum.Uuid;
            }
          } else if (datum.FromUuid || datum.ToUuid) {
            const fromPosition = nodeMap.get(datum.FromUuid)?.position;
            if (!fromPosition) {
              warnings.push(`can't find "from" node for edge “${datum.Title || datum.Shape || datum.ImageURL}”`);
            }
            const toPosition = nodeMap.get(datum.ToUuid)?.position;
            if (!toPosition) {
              warnings.push(`can't find "to" node for edge “${datum.Title || datum.Shape || datum.ImageURL}”`);
            }
            const points = [fromPosition, toPosition];
            const geometry = new THREE.BufferGeometry().setFromPoints( points );
            const material = new THREE.LineBasicMaterial( { color: threeJsColor(datum.Color) } );
            const object = new THREE.Line( geometry, material );
            if (datum.Title) { object.name = datum.Title };
            graph.add( object );
          } else {
            warnings.push(`unknown thing “${datum.Title || datum.Shape || datum.ImageURL}”`);
          }
        }
        for ({code, message, row, type} of errors) {
          switch (type) {
            case 'FieldMismatch':
              break;   // TODO: tag node with warning
            default:
              errors.push(message);
          }
        }
        resolve();
      }
    });
  });

  console.debug("nodes:", graph.children);
  return {graph, errors, warnings, info};
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
}


function parseNumber(value) {
  if (typeof value === 'string') {
    return parseFloat(value.replaceAll('.', '', 'g').replace(',', '.') || "0");
  } else {
    return value || 0;
  }
}

function threeJsColor(color) {
  color = new String(color).trim();

  if (/^[0-9A-Fa-f]{3}$/.test(color)) {
    return parseInt('0x'+color);
  }
  if (/^[0-9A-Fa-f]{6}$/.test(color)) {
    return parseInt('0x'+color);
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
}
