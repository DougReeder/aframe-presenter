// csvToNodes.js — converts Noda .CSV data to Three.js objects
// Copyright © 2026 by Doug Reeder under the MIT License

const SPIKY_FUDGE_FACTOR = 1.3;

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
          const size = parseInt(datum.Size || "5") / 50;
          if (datum.PositionX || datum.PositionY || datum.PositionZ) {
            let geometry, material, object;
            let side = THREE.FrontSide;
            switch (datum.Shape) {
              case 'Ball':
                geometry = new THREE.SphereGeometry( size );
                break;
              case 'Box':
                const boxLength = (Math.sin(Math.PI/4)+1)*size;
                geometry = new THREE.BoxGeometry( boxLength, boxLength, boxLength );
                break;
              case 'Tetra':
                geometry = new THREE.TetrahedronGeometry( size * SPIKY_FUDGE_FACTOR );
                break;
              case 'Cylinder':
                const cylinderSize = (Math.sin(Math.PI/4)+1)/2*size;
                geometry = new THREE.CylinderGeometry( cylinderSize, cylinderSize, cylinderSize*2 );
                break;
              case 'Diamond':   // octahedron
                geometry = new THREE.OctahedronGeometry( size * 1.1 );
                break;
              case 'Hourglass': // hourglass
                const hourglassCoordinate = (Math.sin(Math.PI/4)+1)/2*size;
                const hourglassPoints = [new THREE.Vector2( 0, -hourglassCoordinate ), new THREE.Vector2( hourglassCoordinate, -hourglassCoordinate ), new THREE.Vector2( 0, 0 ), new THREE.Vector2( hourglassCoordinate, hourglassCoordinate ), new THREE.Vector2( 0, hourglassCoordinate )];
                geometry = new THREE.LatheGeometry( hourglassPoints );
                break;
              case 'Plus':   // 3D plus sign (7 cubes)
                const plusDim = (Math.sin(Math.PI*5/12)+1)/2*size;
                const plusPoints = [new THREE.Vector2( 0, -plusDim ), new THREE.Vector2( plusDim/3, -plusDim ), new THREE.Vector2( plusDim/3, -plusDim/3 ), new THREE.Vector2( plusDim, -plusDim/3 ), new THREE.Vector2( plusDim, plusDim/3 ), new THREE.Vector2( plusDim/3, plusDim/3 ), new THREE.Vector2( plusDim/3, plusDim ), new THREE.Vector2( 0, plusDim )];
                geometry = new THREE.LatheGeometry( plusPoints, 4 );
                break;
              case 'Star':   // stellated dodecahedron
                const starPoints = [
                  new THREE.Vector2( 0, -size ),
                  new THREE.Vector2( Math.sin(Math.PI/6)*size/2, -Math.cos(Math.PI/6)*size/2 ),
                  new THREE.Vector2( Math.sin(Math.PI/3)*size, -Math.cos(Math.PI/3)*size ),
                  new THREE.Vector2( size/2, 0 ),
                  new THREE.Vector2( Math.sin(Math.PI/3)*size, Math.cos(Math.PI/3)*size ),
                  new THREE.Vector2( Math.sin(Math.PI/6)*size/2, Math.cos(Math.PI/6)*size/2 ),
                  new THREE.Vector2( 0, size )];
                geometry = new THREE.LatheGeometry( starPoints, 3 );
                break;
              default:
                geometry = new THREE.PlaneGeometry(size, size);
            }
            material = new THREE.MeshLambertMaterial( { color: threeJsColor(datum.Color), side } );
            object = new THREE.Mesh( geometry, material );
            object.position.set(parseNumber(datum.PositionX), parseNumber(datum.PositionY), parseNumber(datum.PositionZ));
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
