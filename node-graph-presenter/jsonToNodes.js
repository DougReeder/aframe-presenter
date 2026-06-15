// jsonToNodes.js — converts SPDX JSON data to Three.js objects
// Copyright © 2026 by Doug Reeder under the MIT License

async function jsonToNodes(url, graphEl) {
  console.debug('jsonToNodes: url = ' + url);

  const errors = [];
  const warnings = [];
  const info = [];

  const response = await fetch(url);
  if (!response.ok) {
    errors.push(`failed to fetch JSON: ${response.status} ${response.statusText}`);
    return {errors, warnings, info};
  }

  let json;
  try {
    json = await response.json();
  } catch (err) {
    errors.push(`failed to parse JSON: ${err.message}`);
    return {errors, warnings, info};
  }
  console.debug('json:', json);

  for (const child of Array.from(graphEl.children)) {
    child.remove();
  }
  const graph = graphEl.object3D;
  graph.name = 'graph';
  disposeTree(graph);

  let numObj = 0, numNodes = 0, numEdges = 0;
  const elMap = new Map();
  let rootId = null;
  for (const file of json?.files ?? []) {
    let {id, title, notes, imageUrl, linkUrl, color, opacity, primitive, details, collapsed, position, size} = mapSpdxFile(file);

    createNodeEl(id, title, notes, imageUrl, linkUrl, color, opacity, primitive, details, collapsed, position, size, false);
  }
  for (const pkg of json?.packages ?? []) {
    let {id, title, notes, imageUrl, linkUrl, color, opacity, primitive, details, collapsed, position, size} = mapSpdxPackage(pkg);

    createNodeEl(id, title, notes, imageUrl, linkUrl, color, opacity, primitive, details, collapsed, position, size, true);
  }

  // moves the main package to the center of the graph
  const documentDescribes = (json?.relationships ?? []).find(r => r.relationshipType === "DESCRIBES" && r.spdxElementId === "SPDXRef-DOCUMENT");
  if (documentDescribes) {
    const mainPkgEl = elMap.get(documentDescribes.relatedSpdxElement);
    if (mainPkgEl) {
      mainPkgEl.setAttribute('graph-node', {naturalPosition: {x: 0, y: 1, z: 0}});
      mainPkgEl.object3D?.position?.set(0, 1, 0);
      mainPkgEl.object3D?.scale?.set(2, 2, 2);
    } else {
      warnings.push(`can't find package described by document: "${documentDescribes.relatedSpdxElement}"`);
    }
  }

  const edges = [];
  for (const relationship of json?.relationships ?? []) {
    ++numObj;
    let {action, title, color, fromId, toId, preferredLength, visible} = mapSpdxRelationship(relationship);

    if ('ROOT_ID' === action) {
      rootId = title;
      continue;
    }

    const start = elMap.get(fromId)?.object3D?.position;
    if (!start) {
      console.warn(`can't find “from” node for edge “${title}”`);
      warnings.push(`can't find “from” node for edge “${title}”`);
      continue;
    }
    const end = elMap.get(toId)?.object3D?.position;
    if (!end) {
      console.warn(`can't find “to” node for edge “${title}”`);
      warnings.push(`can't find “to” node for edge “${title}”`);
      continue;
    }
    const edgeEl = document.createElement('a-entity');
    edgeEl.setAttribute('graph-edge', {
      title,
      color,
      fromId, start,
      toId, end,
      preferredLength,
    });
    edgeEl.setAttribute('visible', visible);
    graphEl.appendChild(edgeEl);
    edges.push(edgeEl);
    ++numEdges;
  }

  // TODO: should we just calculate based on the number of child nodes?
  for (const edge of edges) {
    if (edge.components['graph-edge']?.data?.fromId === rootId) {
      edge.setAttribute('graph-edge', {preferredLength: 0.60});
    }
  }

  info.push(`Parsed ${numObj} objects; added ${numNodes} nodes and ${numEdges} edges`);

  console.debug("nodes & edges:", graph.children);
  return {errors, warnings, info};

  function createNodeEl(id, title, notes, imageUrl, linkUrl, color, opacity, primitive, details, collapsed, position, size, visible = true) {
    ++numObj;

    // edges refer to the _most recently_ defined node with the given ID
    if (elMap.has(id)) {
      warnings.push(`duplicate node ID "${id}"`);
    }
    if (id === null || id === undefined || id === '') {
      id = '' + Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
      info.push(`node “${title || notes}” has no ID, assigning ${id}`);
    }

    const el = document.createElement('a-entity');
    el.setAttribute('id', id);
    elMap.set(id, el);

    if (!Number.isFinite(position.x)) { position.x = Math.random() * 2 - 1; }
    position.y ||= 0;
    if (!Number.isFinite(position.z)) { position.z = Math.random() * 2 - 1; }

    el.setAttribute('graph-node', {id, title, notes, imageUrl, linkUrl, color, opacity, primitive, size, details, collapsed, naturalPosition: position});
    el.object3D.position.copy(position);
    // el.setAttribute('rotation', '0 45 0');
    // el.object3D.scale.set(size, size, size);
    el.setAttribute('visible', visible);
    el.object3D.visible = visible;
    el.object3D.userData.id = id;
    if (visible) { el.classList.add(PRESENTATION_CLASS); }
    graphEl.appendChild(el);

    ++numNodes;
  }

  function mapSpdxRelationship(relationship) {
    let title;
    if ([].includes(relationship.relationshipType)) {   // TODO: where is a titled edge useful?
      title = relationship.relationshipType;
    }

    if (relationship.spdxElementId === "SPDXRef-DOCUMENT" && relationship.relationshipType === "DESCRIBES") {
      return {action: 'ROOT_ID', title: relationship.relatedSpdxElement};
    }

    const color = RELATIONSHIP_TO_COLOR[relationship.relationshipType] || '#808080';

    const fromId = relationship.spdxElementId;
    const fromVisible = elMap.get(fromId)?.getAttribute('visible');

    const toId = relationship.relatedSpdxElement;
    const toVisible = elMap.get(toId)?.getAttribute('visible');
    const toData = elMap.get(toId)?.components['graph-node']?.data;

    // files should be closer to their packages
    // TODO: It's fragile to depend on the primitive type, but it's confined to this source file.
    const isContainsFile = relationship.relationshipType === 'CONTAINS' && toData?.primitive === 'octahedron';
    const preferredLength = isContainsFile ? 0.08 : 0.30;

    return {action: 'EDGE', title, color, fromId, toId, preferredLength, visible: fromVisible && toVisible};
  }
}

const URL_REGEXP = /\b(https?:\/\/[^\s'"]+)/;
const VCS_URL_REGEXP = /\b(?:(?:git|svn)\+)?((https?|ssh|git|svn):\/\/[^\s'"]+)/;
const LICENSE_TO_COLOR = {
  // public domain
  'CC0': '#000000',
  'CC0-1.0 AND MIT': '#000040',
  'LicenseRef-scancode-json-pd': '#004000',
  // permissive
  'MIT': '#000080',
  'MIT-Style-1': '#000080',
  'MIT OR WTFPL OR (MIT AND WTFPL)': '#004080',
  'FTL AND MIT': '#004080',
  'ISC': '#000080',   // functionally equivalent to MIT
  'ISC AND MIT': '#000080',
  'Apache-2.0': '#006080',
  'Apache-2.0+': '#006080',
  'Apache-2.0 AND MIT': '#006080',
  'Apache-2.0 AND BSD-2-Clause': '#0040c0',
  'BSD-0-Clause': '#0040c0',
  'BSD-1-Clause': '#0040c0',
  'BSD-2-Clause': '#0040c0',
  'BSD-3-Clause': '#0040c0',
  'BSD-2-Clause AND BSD-2-Clause-Views': '#0040c0',
  '0BSD AND MIT': '#0040c0',
  'MPL-2.0': '#0080a0',
  'LicenseRef-scancode-unicode AND MIT': '#4000a0',
  'BlueOak-1.0.0': '#4000a0',
  // weak copyleft
  'LGPL-2.0-only': '#008000',
  'LGPL-2.0': '#008000',
  'LGPL-2.1': '#008000',
  'LGPL-3.0': '#008000',
  'CDDL-1.0': '#008000',
  'CDDL-1.0+': '#008000',
  // copyleft
  'GPL': '#ff0000',
  'GPL-2.0': '#ff0000',
  'GPL-2.0-only': '#ff0000',
  'GPL-3.0': '#ff0000',
  'CC-BY-SA': '#c00000',
  'EPL-2.0': '#ff8000',
  // ???
};
const PKGMGR_TO_PRIMITIVE = {
  'pkg:github': 'tetrahedron',
  'pkg:githubactions': 'sphere',
  'pkg:npm': 'box',
  'pkg:maven': 'dodecahedron',
  'pkg:apk': 'icosahedron',
  'pkg:gem': 'cone',   // Ruby
  'pkg:pypi': 'cylinder',
  'pkg:docker': 'torus',
  'pkg:golang': 'triangle',
  'pkg:composer': 'ring',   // PHP
};

function mapSpdxFile(file) {
  const id = file.SPDXID;

  const title = file.fileName;

  const noteArr = [];
  if (file.fileTypes?.length > 0) {
    noteArr.push(file.fileTypes.join(', '));
  }
  if (file.description) {
    noteArr.push(file.description);
  }
  if (file.fileComment) {
    noteArr.push(file.fileComment);
  }
  if (file.licenseConcluded) {
    noteArr.push("license: " + file.licenseConcluded);
  }
  for (const licenseInfo of file.licenseInfoInFiles) {
    if (licenseInfo && licenseInfo !== file.licenseConcluded) {
      noteArr.push("license info: " + licenseInfo);
    }
  }
  if (file.copyrightText && file.copyrightText !== file.licenseConcluded) {
    noteArr.push("copyright text: " + file.copyrightText);
  }
  if (file.licenseComments) {
    noteArr.push(file.licenseComments);
  }
  const notes = noteArr.join('\n');

  const imageUrl = null;

  const linkUrl = null;

  let color = LICENSE_TO_COLOR[file.licenseConcluded];
  for (const licenseInfo of file.licenseInfoInFiles) {
    if (!color && licenseInfo) {
      color = LICENSE_TO_COLOR[file.copyrightText];
    }
  }
  color ||= '#808080';
  const opacity = 1.0;

  const primitive = 'octahedron';

  const details = false;

  const collapsed = false;

  const position = new THREE.Vector3(NaN, NaN, NaN);

  const size = 0.05;   // we could encode something as size

  return {id, title, notes, imageUrl, linkUrl, color, opacity, primitive, details, collapsed, position, size};
}

function mapSpdxPackage(pkg) {
  const id = pkg.SPDXID;

  const title = pkg.name;

  const noteArr = [];
  if (pkg.summary) {
    noteArr.push(pkg.summary);
  }
  if (pkg.description) {
    noteArr.push(pkg.description);
  }
  if (pkg.versionInfo) {
    noteArr.push("v" + pkg.versionInfo);
  }
  if (pkg.licenseConcluded) {
    noteArr.push("license: " + pkg.licenseConcluded);
  }
  if (pkg.licenseDeclared && pkg.licenseConcluded !== pkg.licenseDeclared) {
    noteArr.push("license declared: " + pkg.licenseDeclared);
  }
  // if (pkg.sourceInfo) {
  //   noteArr.push("source info: " + pkg.sourceInfo);
  // }
  const notes = noteArr.join('\n');

  const imageUrl = null;

  let linkUrl, match;
  match = URL_REGEXP.exec(pkg.homepage);
  if (match) {
    linkUrl = match[1];
  }
  if (!linkUrl && pkg.downloadLocation) {
    match = VCS_URL_REGEXP.exec(pkg.downloadLocation);
    if (match) {
      linkUrl = match[1];
    }
  }

  let color = LICENSE_TO_COLOR[pkg.licenseConcluded];
  if (!color) {
    color = LICENSE_TO_COLOR[pkg.licenseDeclared] || '#808080';
  }
  const opacity = 1.0;

  let primitive;
  for (const ref of pkg.externalRefs ?? []) {
    if (['PACKAGE-MANAGER', 'PACKAGE_MANAGER'].includes(ref?.referenceCategory)) {
      const refLocator = ref?.referenceLocator ?? '';
      const slashInd = refLocator.indexOf('/');
      const pkgmgr = refLocator.slice(0, slashInd);
      primitive = PKGMGR_TO_PRIMITIVE[pkgmgr];
      if (primitive) { break; }
    }
  }
  primitive ??= 'torusKnot';

  const details = false;

  const collapsed = false;

  const position = new THREE.Vector3(NaN, NaN, NaN);

  const size = 0.05;   // we could encode something as size

  return {id, title, notes, imageUrl, linkUrl, color, opacity, primitive, details, collapsed, position, size};
}

const RELATIONSHIP_TO_COLOR = {
  'DESCRIBES': '#000000',
  // package relationships
  'DEPENDS_ON': '#ffffff',
  'DEPENDENCY_OF': '#ffffff', // buildkit-syft-scanner but not in v3.0.1 standard?
  // file relationships
  'CONTAINS': '#00ff00',
  'OTHER': '#000000',
  // vulnerabilities
  'AFFECTS': '#ff0000',
  'DOES_NOT_AFFECT': '#0000ff',
  'EXPLOIT_CREATED_BY': '#ffff00',
  'FIXED_BY': '#ff00ff',
  'FIXED_IN': '#ff00ff',
  'FOUND_BY': '#808080',
  'HAS_ASSESSMENT_FOR': '#808080',
  'HAS_ASSOCIATED_VULNERABILITY': '#ffff00',

  // other relationships
  'AMENDED_BY': '#000080',
  'ANCESTOR_OF': '#000080',
  'AVAILABLE_FROM': '#000080',
  'CONFIGURES': '#000080',
  'COORDINATED_BY': '#000080',
  'COPIED_TO': '#000080',
  'DELEGATED_TO': '#000080',
  'DESCENDANT_OF': '#000080',
  'EXPANDS_TO': '#000080',
  'GENERATES': '#000080',
  'HAS_ADDED_FILE': '#000080',
  'HAS_CONCLUEDED_LICENSE': '#000080',
  'HAS_DATA_FILE': '#000080',
  'HAS_DECLARED_LICENSE': '#000080',
  'HAS_DELETED_FILE': '#000080',
  //...
}
