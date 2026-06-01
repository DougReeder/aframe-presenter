describe('jsonToNodes', () => {
  let graphEl, blobUrl;

  beforeEach(function() {
    graphEl = document.createElement('a-entity');
    document.querySelector('a-scene').appendChild(graphEl);
  });

  afterEach(function() {
    URL.revokeObjectURL(blobUrl);
    document.querySelector('a-scene').removeChild(graphEl);
  });

  it('should parse a simple SPDX JSON with one package node', async function() {
    const jsonObj = {
      "spdxVersion": "SPDX-2.3",
      "dataLicense": "CC0-1.0",
      "SPDXID": "SPDXRef-DOCUMENT",
      "name": "com.example/foo-app",
      "documentNamespace": "https://spdx.org/spdxdocs/protobom/072899b2-3119-4570-9b25-463c4269b8cb",
      "creationInfo": {
        "creators": [
          "Tool: protobom-v0.0.0-20260522202315-1e74d6c58b14+dirty",
          "Tool: GitHub.com-Dependency-Graph"
        ],
        "created": "2026-05-30T02:42:38Z"
      },
      "packages": [
        {
          "name": "com.github.owner/foo-app",
          "SPDXID": "SPDXRef-github-owner-foo-app-main-229496",
          "versionInfo": "main",
          "downloadLocation": "git+https://github.com/owner/foo-app",
          "filesAnalyzed": false,
          "licenseDeclared": "GPL-2.0",
          "externalRefs": [
            {
              "referenceCategory": "PACKAGE-MANAGER",
              "referenceType": "purl",
              "referenceLocator": "pkg:github/owner/foo-app@main"
            }
          ]
        },
      ],
      "relationships": [
      ]
    };

    const blob = new Blob([JSON.stringify(jsonObj)], { type: 'application/json' });
    blobUrl = URL.createObjectURL(blob);

    const result = await jsonToNodes(blobUrl, graphEl);

    expect(result.errors).to.be.empty;
    expect(result.warnings).to.be.empty;
    expect(result.info.length).to.equal(1);
    expect(graphEl.children.length).to.equal(1);

    const nodeEl = graphEl.children[0];
    expect(nodeEl.getAttribute('id')).to.equal('SPDXRef-github-owner-foo-app-main-229496');
    expect(Number.isNaN(nodeEl.object3D.position.x)).to.be.false;
    expect(Number.isNaN(nodeEl.object3D.position.y)).to.be.false;
    expect(Number.isNaN(nodeEl.object3D.position.z)).to.be.false;
    expect(nodeEl.object3D.scale.x).to.equal(1.0);
    expect(nodeEl.object3D.userData?.id).to.equal('SPDXRef-github-owner-foo-app-main-229496');
    expect(nodeEl.getObject3D('mesh').geometry).to.have.property('type', 'TetrahedronGeometry');
    // expect(nodeEl.getObject3D('mesh').geometry.parameters).to.have.property('radius', 1);

    const graphNodeAttr = nodeEl.getAttribute('graph-node');
    expect(graphNodeAttr.title).to.equal('com.github.owner/foo-app');
    expect(graphNodeAttr.notes).to.equal('vmain\nlicense declared: GPL-2.0');
    expect(graphNodeAttr.color).to.equal('#ff0000');
    expect(graphNodeAttr.opacity).to.equal(1.0);
    expect(graphNodeAttr.primitive).to.equal('tetrahedron');
    expect(graphNodeAttr.imageUrl).to.equal('');
    expect(graphNodeAttr.linkUrl).to.equal('https://github.com/owner/foo-app');
    expect(graphNodeAttr.collapsed).to.be.false;
  });

  it('should parse a SPDX JSON with package nodes and relationship edges', async function() {
    const jsonObj = {
      "SPDXID": "SPDXRef-DOCUMENT",
      "packages": [
        {
          "SPDXID": "SPDXRef-package-npm-express-4.18.2",
          "name": "express",
          "versionInfo": "4.18.2",
          "downloadLocation": "https://npmjs.org",
          "licenseConcluded": "MIT",
          "licenseDeclared": "MIT",
          "externalRefs": [
            {
              "referenceCategory": "PACKAGE-MANAGER",
              "referenceLocator": "pkg:npm/express@4.18.2",
              "referenceType": "purl"
            }
          ]
        },
        {
          "name": "com.github.owner/bar-app",
          "SPDXID": "SPDXRef-github-owner-bar-app-main-229496",
          "versionInfo": "main",
          "downloadLocation": "git+https://github.com/owner/bar-app",
          "filesAnalyzed": false,
          "licenseDeclared": "LGPL-2.0",
          "externalRefs": [
            {
              "referenceCategory": "PACKAGE-MANAGER",
              "referenceType": "purl",
              "referenceLocator": "pkg:github/owner/bar-app@main"
            }
          ]
        },
      ],
      "relationships": [
        {
          "spdxElementId": "SPDXRef-DOCUMENT",
          "relationshipType": "DESCRIBES",
          "relatedSpdxElement": "SPDXRef-package-npm-express-4.18.2"
        },
        {
          "spdxElementId": "SPDXRef-github-owner-bar-app-main-229496",
          "relatedSpdxElement": "SPDXRef-package-npm-express-4.18.2",
          "relationshipType": "DEPENDS_ON"
        },
      ]
    };

    const blob = new Blob([JSON.stringify(jsonObj)], { type: 'application/json' });
    blobUrl = URL.createObjectURL(blob);

    const result = await jsonToNodes(blobUrl, graphEl);

    expect(result.errors).to.be.empty;
    expect(result.warnings).to.be.empty;
    expect(result.info.length).to.equal(1);

    const expressEl = graphEl.children[0];
    expect(expressEl.getAttribute('id')).to.equal('SPDXRef-package-npm-express-4.18.2');
    expect(Number.isNaN(expressEl.object3D.position.x)).to.be.false;
    expect(Number.isNaN(expressEl.object3D.position.y)).to.be.false;
    expect(Number.isNaN(expressEl.object3D.position.z)).to.be.false;
    expect(expressEl.object3D.scale.x).to.equal(2.0);    // document describes this
    expect(expressEl.object3D.userData?.id).to.equal('SPDXRef-package-npm-express-4.18.2');
    expect(expressEl.getObject3D('mesh').geometry).to.have.property('type', 'BoxGeometry');

    const expressNodeAttr = expressEl.getAttribute('graph-node');
    expect(expressNodeAttr.title).to.equal('express');
    expect(expressNodeAttr.notes).to.equal('v4.18.2\nlicense: MIT');
    expect(expressNodeAttr.color).to.equal('#000080');
    expect(expressNodeAttr.opacity).to.equal(1.0);
    expect(expressNodeAttr.primitive).to.equal('box');
    expect(expressNodeAttr.imageUrl).to.equal('');
    expect(expressNodeAttr.linkUrl).to.equal('https://npmjs.org');
    expect(expressNodeAttr.collapsed).to.be.false;

    const barEl = graphEl.children[1];
    expect(barEl.getAttribute('id')).to.equal('SPDXRef-github-owner-bar-app-main-229496');
    expect(Number.isNaN(barEl.object3D.position.x)).to.be.false;
    expect(Number.isNaN(barEl.object3D.position.y)).to.be.false;
    expect(Number.isNaN(barEl.object3D.position.z)).to.be.false;
    expect(barEl.object3D.scale.x).to.equal(1.0);   // default
    expect(barEl.object3D.userData?.id).to.equal('SPDXRef-github-owner-bar-app-main-229496');
    expect(barEl.getObject3D('mesh').geometry).to.have.property('type', 'TetrahedronGeometry');

    const barNodeAttr = barEl.getAttribute('graph-node');
    expect(barNodeAttr.title).to.equal('com.github.owner/bar-app');
    expect(barNodeAttr.notes).to.equal('vmain\nlicense declared: LGPL-2.0');
    expect(barNodeAttr.color).to.equal('#008000');
    expect(barNodeAttr.opacity).to.equal(1.0);
    expect(barNodeAttr.primitive).to.equal('tetrahedron');
    expect(barNodeAttr.imageUrl).to.equal('');
    expect(barNodeAttr.linkUrl).to.equal('https://github.com/owner/bar-app');
    expect(barNodeAttr.collapsed).to.be.false;

    // Edges are added as a-entities w/ graph-edge components
    const edgeEl = graphEl.children[2];
    expect(Number.isNaN(edgeEl.object3D.position.x)).to.be.false;
    expect(Number.isNaN(edgeEl.object3D.position.y)).to.be.false;
    expect(Number.isNaN(edgeEl.object3D.position.z)).to.be.false;
    expect(edgeEl.object3D.scale).to.deep.equal(new THREE.Vector3(1, 1, 1));

    const edgeAttr = edgeEl.getAttribute('graph-edge');
    expect(edgeAttr.title).to.equal('');   // DEPENDS_ON is suppressed
    // expect(edgeAttr.color).to.equal('#FFF');
    expect(edgeAttr.opacity).to.equal(1.0);
    // Check start point
    expect(edgeAttr.fromId).to.equal('SPDXRef-github-owner-bar-app-main-229496');
    expect(edgeAttr.start.x).to.equal(barEl.object3D.position.x);
    expect(edgeAttr.start.y).to.equal(barEl.object3D.position.y);
    expect(edgeAttr.start.z).to.equal(barEl.object3D.position.z);
    // Check end point
    expect(edgeAttr.toId).to.equal('SPDXRef-package-npm-express-4.18.2');
    expect(edgeAttr.end.x).to.equal(expressEl.object3D.position.x);
    expect(edgeAttr.end.y).to.equal(expressEl.object3D.position.y);
    expect(edgeAttr.end.z).to.equal(expressEl.object3D.position.z);

    expect(graphEl.children.length).to.equal(3);
  });

});
