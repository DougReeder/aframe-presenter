// forceGraphWorker.js — loads and runs the force-directed graph simulation
// Copyright © 2026 by Doug Reeder under the MIT License

import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCenter,
  forceY
} from 'd3-force-3d';
import {csvToNodes} from "./csvToNodes";
import {jsonToNodes} from "./jsonToNodes";
import {showHideDescendants, SIM_SCALE} from "./workerUtil";

const FRONTEND_UPDATE_INTERVAL = 10_000;   // ms (0.1Hz)
const FRONTEND_MESSAGE_INTERVAL = 15;
// Quest 3 & Croquet can't handle frequent updates from web worker

onmessage = async function(event) {
  console.debug('forceGraphWorker.js: onmessage:', event.data);
  switch (event.data.command) {
    case 'LOAD':
      await load(event.data);
      break;
    case 'EXPAND_COLLAPSE':
      collapseExpand(event.data.isExpand, event.data.toggledNode);   // references connected links and nodes
      break;
    default:
      postMessage({kind: 'TRANSIENT_MSG', msg: `unknown command ${event.data.command}`});
  }
}

async function load(data) {
  try {
    let nodes, links, errors, warnings, info;
    if (data.files) {
      let isUserNotified = false;
      for (const file of data.files) {
        try {
          if (file.type?.startsWith?.('text/csv')) {
            ({nodes, links, errors, warnings, info} = await csvToNodes(file));
            console.log('csvToNodes:', nodes, links, errors, warnings, info);
            postMessage({kind: 'TRANSIENT_MSG', msg: [...errors, ...warnings, ...info].join('\n')});

            cancelUpdates();
            postMessage({kind: 'RESET'});
            postMessage({kind: 'UPDATE', nodes, links, msg: `all ${nodes.length} nodes, all ${links.length} edges`});
            postMessage({kind: 'LOAD_SUCCESS'});
            return;   // no need to continue with other files
          } else if (file.type?.startsWith?.('application/json')) {
            ({nodes, links, errors, warnings, info} = await jsonToNodes(file, null));
            console.log('jsonToNodes:', nodes, links, errors, warnings, info);
            postMessage({kind: 'TRANSIENT_MSG', msg: [...errors, ...warnings, ...info].join('\n')});

            simulate(nodes, links);
            return;   // no need to continue with other files
          }
        } catch (err) {
          console.error('error loading from file:', err);
          postMessage({kind: 'PERSISTENT_MSG', msg: `Is there another file with the data in “${file.name}”?`});
          isUserNotified = true;
        }
      }
      if (!isUserNotified) {
        postMessage({
          kind: 'PERSISTENT_MSG',
          msg: 'No usable data:\n' + Array.from(data.files).map(f => `${f.name} ${f.type}`).join('\n')
        });
      }
      postMessage({kind: 'LOAD_FAIL', msg: 'No usable data: ' + Array.from(data.files).map(f => `${f.name} ${f.type}`).join(', ')});
    } else if (data.url) {
      const contentType = await getContentType(data.url);
      if (contentType?.startsWith?.('text/csv')) {
        ({nodes, links, errors, warnings, info} = await csvToNodes(data.url));
        console.log('csvToNodes:', nodes, links, errors, warnings, info);
        postMessage({kind: 'TRANSIENT_MSG', msg: [...errors, ...warnings, ...info].join('\n')});

        cancelUpdates();
        postMessage({kind: 'RESET'});
        postMessage({kind: 'UPDATE', nodes, links, msg: `all ${nodes.length} nodes, all ${links.length} edges`});
        postMessage({kind: 'LOAD_SUCCESS'});
      } else if (contentType?.startsWith?.('application/json')) {
        ({nodes, links, errors, warnings, info} = await jsonToNodes(null, data.url));
        console.log('jsonToNodes:', nodes, links, errors, warnings, info);
        postMessage({kind: 'TRANSIENT_MSG', msg: [...errors, ...warnings, ...info].join('\n')});

        simulate(nodes, links);
      } else {
        console.error('Unsupported content type:', contentType);
        const mainType = contentType?.split(';')[0];
        postMessage({kind: 'PERSISTENT_MSG', msg: `Not a node graph: ${mainType}`});
        postMessage({kind: 'LOAD_FAIL', msg: `Not a node graph: ${mainType}`});
      }
    } else {
      postMessage({kind: 'PERSISTENT_MSG', msg: 'no URL to load'});
      postMessage({kind: 'LOAD_FAIL', msg: 'no URL to load'});
    }
  } catch (err) {
    console.error('forceGraphWorker.js: onmessage error:', err);
    postMessage({kind: 'PERSISTENT_MSG', msg: err});
    postMessage({kind: 'LOAD_FAIL', msg: err});
  }
}

async function getContentType(graphUrl) {
  let contentType;
  const url = URL.parse(graphUrl);
  console.debug(`extracting content-type of ${url?.protocol} URL`);
  switch (url?.protocol) {
    case 'https:':
    case 'http:':
      const headResponse = await fetch(graphUrl, {method: 'HEAD'});
      // Firefox incorrectly returns a comma-separated list of content-types.
      contentType = headResponse.headers.get('content-type')?.split(',')?.pop()?.trim();
      if (headResponse.ok && !contentType || [401, 403, 405, 407, 408].includes(headResponse.status)) {
        // Some servers incorrectly return different status or headers for GET and HEAD.
        const getResponse = await fetch(graphUrl, {method: 'GET'});
        contentType = getResponse.headers.get('content-type')?.split(',')?.pop()?.trim();
        if (! getResponse.ok) {
          throw new Error(`Unable to read URL: ${getResponse.statusText || getResponse.status}`);
        }
      } else if (! headResponse.ok) {
        throw new Error(`Can't determine type: ${headResponse.statusText || headResponse.status}`);
      }
      break;
    case 'data:':
      const match = /^data:([^;,]*)[;,]/.exec(graphUrl);
      contentType = match?.[1] || 'text/plain';
      break;
    case 'blob:':
      const blobResponse = await fetch(graphUrl);
      if (!blobResponse.ok) {
        throw new Error(`Unable to read blob URL: HTTP ${blobResponse.status}`);
      }
      const blob = await blobResponse.blob();
      contentType =  blob.type; // Returns the content-type string
      break;
    default:
      throw new Error(`Unsupported URL protocol: ${url?.protocol}`);
  }
  console.log(`${graphUrl} is ${contentType}`);
  return contentType;
}

function simulate(nodes, links) {
  const simulation = forceSimulation(nodes, 3)
      .force("link", forceLink(links).id(d => d.id).distance(linkDistance))
      .force("charge", forceManyBody().strength(-100).distanceMax(133) )
      .force("center", forceCenter(0, 1, 0))
      .force("y", forceY(1))
      .stop();
  // x, y & z were NaNs, so the simulation arranged them around the origin.
  for (const node of nodes) {
    node.y += 1.0;   // unclear why forceCenter(0, 1, 0) doesn't work
  }
  cancelUpdates();
  postMessage({kind: 'RESET'});
  sendUpdates(nodes, links); // initial arrangement

  let updateAvailable = false, lastFrontendUpdate = Date.now();
  for (let i = 0, n = Math.ceil(Math.log(simulation.alphaMin()) / Math.log(1 - simulation.alphaDecay())); i < n; ++i) {
    simulation.tick();
    updateAvailable = true;
    if (Date.now() - lastFrontendUpdate > FRONTEND_UPDATE_INTERVAL) {
      lastFrontendUpdate = Date.now();
      sendUpdates(nodes, links);
      updateAvailable = false;
    }
  }

  if (updateAvailable) {
    sendUpdates(nodes, links);
  }
}

function linkDistance(link, _ind, _links) {
  return link.preferredLength * SIM_SCALE ?? 30;
}

/**
 * depends on the arrays not changing length and elements keeping their identities,
 * only the element properties changing
 * @param {Object[]} nodes
 * @param {Object[]} links
 */
function sendUpdates(nodes, links) {
  if (self.messageTimeoutId) { // continues, ensuring all nodes & links are sent again
    self.nodesOffset = (self.i ?? 0);
    self.i = 0;
    self.linksOffset = (self.j ?? 0);
    self.j = 0;
  } else {   // starts new
    self.nodesOffset = 0
    self.i = 0;
    self.linksOffset = 0;
    self.j = 0;
    postSome();
  }

  function postSome(){
    if (self.i < nodes.length) {
      const ind = (nodesOffset + self.i) % nodes.length;
      const scaledNode = structuredClone(nodes[ind]);
      scaledNode.x /= SIM_SCALE;
      scaledNode.y /= SIM_SCALE;
      scaledNode.z /= SIM_SCALE;
      postMessage({kind: 'UPDATE', nodes: [scaledNode], links: [], msg: `node ${ind} of ${nodes.length}`});
      ++self.i;
    } else if (self.j < links.length) {
      const ind = (linksOffset + self.j) % links.length;
      const scaledSource = structuredClone(links[ind].source);
      scaledSource.x /= SIM_SCALE;
      scaledSource.y /= SIM_SCALE;
      scaledSource.z /= SIM_SCALE;
      const scaledTarget = structuredClone(links[ind].target);
      scaledTarget.x /= SIM_SCALE;
      scaledTarget.y /= SIM_SCALE;
      scaledTarget.z /= SIM_SCALE;
      const scaledLink = Object.assign({}, links[ind], {source: scaledSource, target: scaledTarget});
      postMessage({kind: 'UPDATE', nodes: [], links: [scaledLink], msg: `edge ${ind} of ${links.length}`});
      ++self.j;
    }
    if (self.j < links.length) {
      self.messageTimeoutId = setTimeout(postSome, FRONTEND_MESSAGE_INTERVAL, false);
    } else {
      self.messageTimeoutId = null;
      postMessage({kind: 'LOAD_SUCCESS', msg: `${nodes.length} nodes, ${links.length} edges`});
    }
  }
}

function cancelUpdates() {
  clearTimeout(self.messageTimeoutId);
}


function collapseExpand(isExpand, toggledNode) {
  toggledNode.collapsed = !isExpand;
  postMessage({kind: 'UPDATE', nodes: [toggledNode], links: [], msg: `node ${toggledNode.id} ` + (isExpand ? "expanded" : "collapsed")});
  showHideDescendants(isExpand, toggledNode);
}
