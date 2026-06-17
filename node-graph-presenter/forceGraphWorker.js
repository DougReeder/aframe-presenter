// forceGraphWorker.js — loads and runs the force-directed graph simulation
// Copyright © 2026 by Doug Reeder under the MIT License

import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCenter,
  forceY
} from 'd3-force-3d';

const SIM_SCALE = 100;
const FRONTEND_UPDATE_INTERVAL = 1000;   // ms (1Hz)
// Quest 3 can't handle frequent updates from web worker

onmessage = function(event) {
  const nodes = event.data.nodes,
      links = event.data.links;

  const simulation = forceSimulation(nodes, 3)
      .force("link", forceLink(links).id(d => d.id).distance(linkDistance))
      .force("charge", forceManyBody().strength(-100).distanceMax(133) )
      .force("center", forceCenter(0, 1, 0))
      .force("y", forceY(1))
      .stop();
  postMessage({kind: 'UPDATE', isReplace: true, nodes: nodes, links: links}); // initial arrangement

  let updateAvailable = false, lastFrontendUpdate = Date.now();
  for (let i = 0, n = Math.ceil(Math.log(simulation.alphaMin()) / Math.log(1 - simulation.alphaDecay())); i < n; ++i) {
    simulation.tick();
    updateAvailable = true;
    if (Date.now() - lastFrontendUpdate > FRONTEND_UPDATE_INTERVAL) {
      lastFrontendUpdate = Date.now();
      postMessage({kind: 'UPDATE', nodes: nodes, links: links});
      updateAvailable = false;
    }
  }

  if (updateAvailable) {
    postMessage({kind: 'UPDATE', nodes: nodes, links: links});
  }
  postMessage({kind: 'DONE'});
  close();   // releases Web Worker resources
};

function linkDistance(link, _ind, _links) {
  return link.preferredLength * SIM_SCALE ?? 30;
}
