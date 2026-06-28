// csvToNodes.js — converts Noda .CSV data to d3-force-3d nodes and links
// Copyright © 2026 by Doug Reeder under the MIT License

import Papa from 'papaparse';
import {showHideDescendants, cssSafeId, threeJsColor} from "./workerUtil";

export async function csvToNodes(fileOrUrl) {
  console.debug('csvToNodes: fileOrUrl = ' + fileOrUrl);

  const nodeMap = new Map();
  const links = [];
  const errors = [];
  const warnings = [];
  const info = [];

  await new Promise((resolve, reject) => {
    Papa.parse(fileOrUrl, {
      download: true,
      header: true,
      // dynamicTyping: {PositionX: true, PositionY: true, PositionZ: true, Opacity: true, Size: true},
      skipEmptyLines: 'greedy',
      complete: async function(result) {
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

        for (let row of data) {
          let id, title, notes, imageUrl, linkUrl, color, opacity, primitive, collapsed, x, y, z, size, fromId, toId;
          // switch (flavorCsv) {   // the flavorCsv determines what fields of row to read
          //   case 'NODA':
              ({id, title, notes, imageUrl, linkUrl, color, opacity, primitive, collapsed, x, y, z, size, fromId, toId} = mapNodaValues(row));
          //     break;
          // }
          if (Number.isFinite(x) || Number.isFinite(y) || Number.isFinite(z)) {   // node
            if (!id) {
              info.push(`node “${title || notes}” has no ID`);
            }
            x ??= Math.random() * 2 - 1;
            y ??= Math.random() * 2;
            z ??= Math.random() * 2 - 1

            const node = {id, title, notes, imageUrl, linkUrl, color, opacity, primitive, size, collapsed, x, y, z, visible: true, out: new Set(), in: new Set()};

            if (nodeMap.has(id)) {
              warnings.push(`duplicate node ID "${id}"`);
            }
            // links _should be_ unique, but if not, refer to the _most recently_ defined node with the given ID
            nodeMap.set(id, node);
          } else if (fromId || toId) {   // edge
            const source = nodeMap.get(fromId)
            if (!source) {
              console.warn(`can't find “from” node for edge “${title || notes || id}”`);
              warnings.push(`can't find “from” node for edge “${title || notes || id}”`);
              continue;
            }
            source.numChildren = (source.numChildren || 0) + 1;
            const target = nodeMap.get(toId);
            if (!target) {
              console.warn(`can't find “to” node for edge “${title || notes || id}”`);
              warnings.push(`can't find “to” node for edge “${title || notes || id}”`);
              continue;
            }
            if (target === source) {
              console.warn(`“to” node is same as “from” node for edge “${title || notes || id}”`);
              warnings.push(`“to” node is same as “from” node for edge “${title || notes || id}”`);
              continue;
            }
            links.push({id, title, color, opacity, source, target, visible: true});
            source.out.add(links.at(-1));
            target.in.add(links.at(-1));
          } else {
            console.warn(`unknown thing “${title || notes?.slice(0, 20) || primitive || imageUrl}”`);
            warnings.push(`unknown thing “${title || notes?.slice(0, 20) || primitive || imageUrl}”`);
          }
        }
        info.push(`Parsed ${data.length} rows; added ${nodeMap.size} nodes and ${links.length} edges`);
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
        if (fileOrUrl?.startsWith?.('data:') && (!err.message || /network/i.test(err.message))) {
          console.log('Papa Parse file error:', err, file, fileOrUrl);
        } else {
          console.error('Papa Parse file error:', err, file, fileOrUrl);
          reject(err);
        }
      }
    });
  });

  for (const node of nodeMap.values()) {
    if (node.collapsed) {
      showHideDescendants(false, node, false);
    }
  }

  return {nodes: Array.from(nodeMap.values()), links, errors, warnings, info};
}

function mapNodaValues(row) {
  const id = cssSafeId(row.Uuid);

  const title = row.Title;

  const notes = row.Notes;

  const imageUrl = row.ImageURL;

  const linkUrl = row.PageURL;

  const color = threeJsColor(row.Color);

  const opacity = Math.min(Math.max(parseNumber(row.Opacity ?? 1.0), 0), 1.0);

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

  const x = parseNumber(row.PositionX);
  const y = parseNumber(row.PositionY);
  const z = parseNumber(row.PositionZ);

  const size = parseFloat(row.Size || "5") / 100;

  const fromId = cssSafeId(row.FromUuid);
  const toId = cssSafeId(row.ToUuid);

  return {id, title, notes, imageUrl, linkUrl, color, opacity, primitive, collapsed, x, y, z, size, fromId, toId};
}

function parseNumber(value) {
  if (typeof value === 'string') {
    value = value.trim();
    if (/-?\d+,\d+/.test(value)) {   // single internal comma => European format
      return parseFloat(value.replaceAll('.', '', 'g').replace(',', '.') || "0");
    } else {
      return parseFloat(value);
    }
  } else {
    return value;
  }
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
