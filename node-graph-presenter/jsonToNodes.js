// jsonToNodes.js — converts SPDX JSON data to d3-force-3d nodes and links
// Copyright © 2026 by Doug Reeder under the MIT License

import {showHideDescendants, cssSafeId} from "./workerUtil";

const FILE_PRIMITIVE = 'octahedron';

const spdxPrefix = /^SPDXRef-(?:([PpFfSs])(ackage|ile|nippet)-)?(npm-|apk-|github(?:actions)?-|maven-|gem-|pypi-|docker-|golang-|composer-)?/;
function usableId(spdxId) {
  return cssSafeId((spdxId ?? '').replace(spdxPrefix,'$1-'));
}

export async function jsonToNodes(file, url) {
  console.debug(`jsonToNodes file: ${file} url: ${url}`);
  const nodeMap = new Map();
  const linkMap = new Map();
  const errors = [];
  const warnings = [];
  const info = [];
  let json;

  if (file) {
    const text = await file.text();
    json = JSON.parse(text);
  } else if (url) {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`failed to fetch JSON: ${response.status} ${response.statusText}`);
    }
    json = await response.json();
  } else {
    throw new Error('no file nor URL provided');
  }
  console.debug('json:', json);

  let numBadRelationships = 0;
  let rootId = null;
  for (const file of json?.files ?? []) {
    const node = mapSpdxFile(file);

    if (nodeMap.has(node.id)) {
      warnings.push(`file ${node.title} duplicates ID "${node.id}"`);
    }
    // Node IDs _should be_ unique, but if not, refer to the _most recently_ defined node with the given ID
    nodeMap.set(node.id, node);
  }
  for (const pkg of json?.packages ?? []) {
    const node = mapSpdxPackage(pkg);

    if (nodeMap.has(node.id)) {
      warnings.push(`package ${node.title} duplicates ID "${node.id}"`);
    }
    // Node IDs _should be_ unique, but if not, refer to the _most recently_ defined node with the given ID
    nodeMap.set(node.id, node);
  }

  // starts the main package at the center of the graph
  const documentDescribes = (json?.relationships ?? []).find(r => r.relationshipType.toUpperCase() === "DESCRIBES" && r.spdxElementId === "SPDXRef-DOCUMENT");
  if (documentDescribes) {
    const mainId = usableId(documentDescribes.relatedSpdxElement);
    const mainPkgNode = nodeMap.get(mainId);
    if (mainPkgNode) {
      mainPkgNode.x = 0;
      mainPkgNode.y = 0;
      mainPkgNode.z = 0;
      // TODO: set the scale to 2,2,2; but how?
    } else {
      warnings.push(`can't find package described by document: "${mainId}"`);
    }
  }

  for (const relationship of json?.relationships ?? []) {
    let {action, link} = mapSpdxRelationship(relationship);

    if ('ROOT_ID' === action) {
      rootId = link.title;
      continue;
    } else if ('SKIP' === action) {
      continue;
    } else if ('BAD' === action) {
      ++numBadRelationships;
      continue;
    }

    linkMap.set(link.id, link);
  }

  // TODO: should we just calculate based on the number of child nodes?
  for (const link of linkMap.values()) {
    if (link.source.id === rootId) {
      link.preferredLength = 0.60;
    }
  }
  const rootNode = nodeMap.get(rootId);
  if (rootNode) { rootNode.size *= 2; }

  let msg = `Created ${nodeMap.size} nodes and ${linkMap.size} edges`;
  if (numBadRelationships) { msg += `; ignored ${numBadRelationships} bad edges`;}
  info.push(msg);

  for (const node of nodeMap.values()) {
    let allChildrenAreFiles = true;
    for (const outLink of node.out) {
      if (outLink.target?.primitive !== FILE_PRIMITIVE) {
        allChildrenAreFiles = false;
        break;
      }
    }
    if (node.out.size > 0 && allChildrenAreFiles) {
      node.collapsed = true;
      showHideDescendants(false, node, false);
    }
  }

  return {nodes: Array.from(nodeMap.values()), links: Array.from(linkMap.values()), errors, warnings, info};

  function mapSpdxRelationship(relationship) {
    let relType, sourceId, targetId;
    if (relationship.relationshipType.toUpperCase().endsWith('DEPENDENCY_OF')) {
      relType = 'DEPENDS_ON';
      sourceId = usableId(relationship.relatedSpdxElement);
      targetId = usableId(relationship.spdxElementId);
    } else if ('CONTAINED_BY' === relationship.relationshipType.toUpperCase()) {
      relType = 'CONTAINS';
      sourceId = usableId(relationship.relatedSpdxElement);
      targetId = usableId(relationship.spdxElementId);
    } else if ('DESCRIBED_BY' === relationship.relationshipType.toUpperCase()) {
      relType = 'DESCRIBES';
      sourceId = usableId(relationship.relatedSpdxElement);
      targetId = usableId(relationship.spdxElementId);
    } else if ('GENERATED_FROM' === relationship.relationshipType.toUpperCase()) {
      relType = 'GENERATES';
      sourceId = usableId(relationship.relatedSpdxElement);
      targetId = usableId(relationship.spdxElementId);
    } else if ('ANCESTOR_OF' === relationship.relationshipType.toUpperCase()) {
      relType = 'DESCENDANT_OF';
      sourceId = usableId(relationship.relatedSpdxElement);
      targetId = usableId(relationship.spdxElementId);
    } else {   // normal
      relType = relationship.relationshipType.toUpperCase();
      sourceId = usableId(relationship.spdxElementId);
      targetId = usableId(relationship.relatedSpdxElement);
    }

    const id = sourceId + '_' + (relType ?? '').slice(0,3) + '_' + targetId;
    if (linkMap.has(id)) {
      // doesn't inform user, because we assume the relationship and its inverse were both listed
      console.info(`relationship ${relationship.spdxElementId + ' ' + relationship.relationshipType + ' ' + relationship.relatedSpdxElement} is duplicate of ${id}`);
      return {action: 'SKIP'};
    }

    let title;
    if ([].includes(relType)) {   // TODO: where is a titled edge useful?
      title = relType;
    }

    if (relationship.spdxElementId === "SPDXRef-DOCUMENT" && relationship.relationshipType.toUpperCase() === "DESCRIBES") {
      return {action: 'ROOT_ID', link: {title: usableId(relationship.relatedSpdxElement)}};
    }

    const color = RELATIONSHIP_TO_COLOR[relType] || '#808080';

    if (targetId === sourceId) {
      const msg = `“to” node can't be distinguished from “from” node for edge ${title || relationship.spdxElementId + ' ' + relationship.relationshipType + ' ' + relationship.relatedSpdxElement}`;
      console.warn(msg);
      warnings.push(msg);
      return {action: 'BAD'};
    }
    const target = nodeMap.get(targetId);
    if (!target) {
      warnings.push(`can't find “to” node for edge ${title || sourceId + ' ' + relType + ' ' + targetId}`);
      return {action: 'BAD'};
    }
    const targetVisible = target.visible;

    const source = nodeMap.get(sourceId);
    if (!source) {
      warnings.push(`can't find “from” node for edge ${title || sourceId + ' ' + relType + ' ' + targetId}`);
      return {action: 'BAD'};
    }
    const sourceVisible = source.visible;
    // This makes the function impure, but is there a better way?
    const sourceCount = source.numChildren || 0;
    source.numChildren = sourceCount + 1;

    // files should be closer to their packages
    // TODO: It's fragile to depend on the primitive type, but it's confined to this source file.
    const isContainsFile = relType === 'CONTAINS' && target?.primitive === FILE_PRIMITIVE;
    const preferredLength = isContainsFile ? 0.08 : 0.30;

    const link = {id, title, color, source, target, preferredLength, visible: sourceVisible && targetVisible};
    source.out.add(link);
    target.in.add(link);
    return {action: 'EDGE', link};
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
  // 'pkg:swift': ''
  // pkg:oci: ''
};

function mapSpdxFile(file) {
  const id = usableId(file.SPDXID);

  const title = file.fileName;

  const noteArr = [];
  if (file.fileTypes?.length > 0) {
    noteArr.push(file.fileTypes.join(', '));
  }
  if (file.description) {
    noteArr.push(file.description);
  }
  if (file.comment) {
    noteArr.push(file.comment);
  }
  if (file.licenseConcluded) {
    noteArr.push("license: " + file.licenseConcluded);
  }
  for (const licenseInfo of file.licenseInfoInFiles ?? []) {
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
  for (const licenseInfo of file.licenseInfoInFiles ?? []) {
    if (!color && licenseInfo) {
      color = LICENSE_TO_COLOR[file.copyrightText];
    }
  }
  color ||= '#808080';
  const opacity = 1.0;

  const primitive = FILE_PRIMITIVE;

  const details = false;

  const collapsed = false;

  const x = NaN;
  const y = NaN;
  const z = NaN;

  const size = 0.06;   // we could encode something as size

  const visible = true;

  return {id, title, notes, imageUrl, linkUrl, color, opacity, primitive, details, collapsed, x, y, z, size, out: new Set(), in: new Set(), visible};
}

function mapSpdxPackage(pkg) {
  const id = usableId(pkg.SPDXID);

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
  if (pkg.originator && 'NOASSERTION' !== pkg.originator) {
    noteArr.push("originator: " + pkg.originator);
  }
  if (pkg.supplier && 'NOASSERTION' !== pkg.supplier) {
    noteArr.push("supplier: " + pkg.supplier);
  }
  if (pkg.licenseConcluded && 'NOASSERTION' !== pkg.licenseConcluded) {
    noteArr.push("license: " + pkg.licenseConcluded);
  }
  if (pkg.licenseDeclared && pkg.licenseConcluded !== pkg.licenseDeclared && 'NOASSERTION' !== pkg.licenseDeclared) {
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

  const x = NaN;
  const y = NaN;
  const z = NaN;

  const size = 0.06;   // we could encode something as size

  const numChildren = 0;

  const visible = true;

  return {id, title, notes, imageUrl, linkUrl, color, opacity, primitive, details, collapsed, x, y, z, size, out: new Set(), in: new Set(), numChildren, visible};
}

const RELATIONSHIP_TO_COLOR = {
  'DESCRIBES': '#f6f600',   // DESCRIBED_BY is reversed to this
  // package relationships
  'DEPENDS_ON': '#ffffff',   // *_DEPENDENCY_OF are reversed to this
  // file relationships
  'CONTAINS': '#00ff00',   // CONTAINED_BY is reversed to this
  //
  'GENERATES': '#0000d0',   // GENERATED_FROM is reversed to this
  'DESCENDANT_OF': '#c000c0',   // ANCESTOR_OF is reversed to this
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

  // LLM
  'TRAINED_ON': '#800000',
  'TRAINEDON': '#800000',
  'TESTED_ON': '#008080',
  'TESTEDON': '#008080',

  // other relationships
  'AMENDED_BY': '#ff0000',
  'ANCESTOR_OF': '#ff0000',
  'AVAILABLE_FROM': '#ff0000',
  'CONFIGURES': '#ff0000',
  'COORDINATED_BY': '#ff0000',
  'COPIED_TO': '#ff0000',
  'DELEGATED_TO': '#ff0000',
  'EXPANDS_TO': '#ff0000',
  'HAS_ADDED_FILE': '#ff0000',
  'HAS_CONCLUDED_LICENSE': '#0000ff',
  'HAS_DATA_FILE': '#ff0000',
  'HAS_DECLARED_LICENSE': '#0000a0',
  'HAS_DELETED_FILE': '#ff0000',
  //...
}
