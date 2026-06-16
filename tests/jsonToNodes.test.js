describe('jsonToNodes', function() {
  this.timeout(10_000);
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
    expect(graphNodeAttr.numChildren).to.equal(0);
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
    expect(expressNodeAttr.numChildren).to.equal(0);

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
    expect(barNodeAttr.numChildren).to.equal(1);

    // Edges are added as a-entities w/ graph-edge components
    const edgeEl = graphEl.children[2];
    expect(Number.isNaN(edgeEl.object3D.position.x)).to.be.false;
    expect(Number.isNaN(edgeEl.object3D.position.y)).to.be.false;
    expect(Number.isNaN(edgeEl.object3D.position.z)).to.be.false;
    expect(edgeEl.object3D.scale).to.deep.equal(new THREE.Vector3(1, 1, 1));

    const edgeAttr = edgeEl.getAttribute('graph-edge');
    expect(edgeAttr.title).to.equal('');   // too common to have a title
    expect(edgeAttr.color).to.equal('#ffffff');
    expect(edgeAttr.opacity).to.equal(1.0);
    // Check start point
    expect(edgeAttr.fromId).to.equal('SPDXRef-github-owner-bar-app-main-229496');
    expect(edgeAttr.start.x).to.be.closeTo(barEl.object3D.position.x, 0.06); // TODO: why?
    expect(edgeAttr.start.y).to.be.closeTo(barEl.object3D.position.y, 0.15);
    expect(edgeAttr.start.z).to.be.closeTo(barEl.object3D.position.z, 0.04);
    // Check end point
    expect(edgeAttr.toId).to.equal('SPDXRef-package-npm-express-4.18.2');
    expect(edgeAttr.end.x).to.be.closeTo(expressEl.object3D.position.x, 0.06);
    // expect(edgeAttr.end.y).to.be.closeTo(expressEl.object3D.position.y, 0.001);
    expect(edgeAttr.end.z).to.be.closeTo(expressEl.object3D.position.z, 0.04);
    expect(edgeAttr.preferredLength).to.equal(0.30);

    expect(graphEl.children.length).to.equal(3);
  });

  it('should parse a SPDX JSON with file & package nodes and relationship edges', async function() {
    const jsonObj = {
      "SPDXID": "SPDXRef-DOCUMENT",
      "files": [
        {
          "SPDXID": "SPDXRef-File-bin-busybox-1ac501c94e2f9f81",
          "checksums": [
            {
              "algorithm": "SHA256",
              "checksumValue": "01a989eb4d1d04b0d146c790ac536abd88f374ec74a2e110c58910b840d42045"
            }
          ],
          "copyrightText": "NOASSERTION",
          "fileName": "bin/busybox",
          "fileTypes": [
            "APPLICATION",
            "BINARY"
          ],
          "licenseConcluded": "NOASSERTION",
          "licenseInfoInFiles": [
            "NOASSERTION"
          ]
        },
        {
          "SPDXID": "SPDXRef-File-etc-logrotate.d-acpid-fafc40287909057d",
          "checksums": [
            {
              "algorithm": "SHA256",
              "checksumValue": "d608a3b7715886b5735def0cc50a6359fd364fac2e0e0a459c588c04be471031"
            }
          ],
          "copyrightText": "NOASSERTION",
          "fileName": "etc/logrotate.d/acpid",
          "fileTypes": [
            "TEXT"
          ],
          "licenseConcluded": "NOASSERTION",
          "licenseInfoInFiles": [
            "NOASSERTION"
          ]
        },
        {
          "SPDXID": "SPDXRef-File-lib-apk-db-installed-9f5aca292136191a",
          "checksums": [
            {
              "algorithm": "SHA256",
              "checksumValue": "41d6df4ca45b333c9aac61c60d4a7cf684a3884856770fd19b3fa2202821a163"
            }
          ],
          "copyrightText": "NOASSERTION",
          "fileName": "lib/apk/db/installed",
          "fileTypes": [
            "TEXT"
          ],
          "licenseConcluded": "NOASSERTION",
          "licenseInfoInFiles": [
            "NOASSERTION"
          ]
        },
      ],
      "packages": [
        {
          "SPDXID": "SPDXRef-Package-apk-busybox-fef07e9c95ea2bda",
          "copyrightText": "NOASSERTION",
          "description": "Size optimized toolbox of many common UNIX utilities",
          "downloadLocation": "https://busybox.net/",
          "externalRefs": [
            {
              "referenceCategory": "SECURITY",
              "referenceLocator": "cpe:2.3:a:busybox:busybox:1.37.0-r31:*:*:*:*:*:*:*",
              "referenceType": "cpe23Type"
            },
            {
              "referenceCategory": "PACKAGE-MANAGER",
              "referenceLocator": "pkg:apk/alpine/busybox@1.37.0-r31?arch=x86_64&distro=alpine-3.24.0",
              "referenceType": "purl"
            }
          ],
          "filesAnalyzed": true,
          "licenseConcluded": "NOASSERTION",
          "licenseDeclared": "GPL-2.0-only",
          "name": "busybox",
          "packageVerificationCode": {
            "packageVerificationCodeValue": "da39a3ee5e6b4b0d3255bfef95601890afd80709"
          },
          "sourceInfo": "acquired package info from APK DB: /lib/apk/db/installed",
          "supplier": "NOASSERTION",
          "versionInfo": "1.37.0-r31"
        },
        {
          "SPDXID": "SPDXRef-Package-apk-musl-f7ad0ee8f1c27cb0",
          "copyrightText": "NOASSERTION",
          "description": "the musl c library (libc) implementation",
          "downloadLocation": "https://musl.libc.org/",
          "externalRefs": [
            {
              "referenceCategory": "SECURITY",
              "referenceLocator": "cpe:2.3:a:musl-libc:musl:1.2.6-r2:*:*:*:*:*:*:*",
              "referenceType": "cpe23Type"
            },
            {
              "referenceCategory": "SECURITY",
              "referenceLocator": "cpe:2.3:a:musl_libc:musl:1.2.6-r2:*:*:*:*:*:*:*",
              "referenceType": "cpe23Type"
            },
            {
              "referenceCategory": "SECURITY",
              "referenceLocator": "cpe:2.3:a:musl:musl:1.2.6-r2:*:*:*:*:*:*:*",
              "referenceType": "cpe23Type"
            },
            {
              "referenceCategory": "PACKAGE-MANAGER",
              "referenceLocator": "pkg:apk/alpine/musl@1.2.6-r2?arch=x86_64&distro=alpine-3.24.0",
              "referenceType": "purl"
            }
          ],
          "filesAnalyzed": true,
          "licenseConcluded": "NOASSERTION",
          "licenseDeclared": "MIT",
          "name": "musl",
          "originator": "Person: Natanael Copa (ncopa@alpinelinux.org)",
          "packageVerificationCode": {
            "packageVerificationCodeValue": "da39a3ee5e6b4b0d3255bfef95601890afd80709"
          },
          "sourceInfo": "acquired package info from APK DB: /lib/apk/db/installed",
          "supplier": "Person: Natanael Copa (ncopa@alpinelinux.org)",
          "versionInfo": "1.2.6-r2"
        },
        {
          "SPDXID": "SPDXRef-DocumentRoot-Directory-sbom",
          "homepage": "https://example.com/sbom.zip",
          "copyrightText": "NOASSERTION",
          "downloadLocation": "NOASSERTION",
          "filesAnalyzed": false,
          "licenseConcluded": "NOASSERTION",
          "licenseDeclared": "NOASSERTION",
          "name": "sbom",
          "primaryPackagePurpose": "FILE",
          "supplier": "NOASSERTION"
        }
      ],
      "relationships": [
        {
          "relatedSpdxElement": "SPDXRef-File-bin-busybox-1ac501c94e2f9f81",
          "relationshipType": "CONTAINS",
          "spdxElementId": "SPDXRef-Package-apk-busybox-fef07e9c95ea2bda"
        },
        {
          "relatedSpdxElement": "SPDXRef-File-etc-logrotate.d-acpid-fafc40287909057d",
          "relationshipType": "CONTAINS",
          "spdxElementId": "SPDXRef-Package-apk-busybox-fef07e9c95ea2bda"
        },
        {
          "relatedSpdxElement": "SPDXRef-Package-apk-busybox-fef07e9c95ea2bda",
          "relationshipType": "DEPENDENCY_OF",
          "spdxElementId": "SPDXRef-Package-apk-musl-f7ad0ee8f1c27cb0"
        },
        {
          "comment": "evident-by: indicates the package's existence is evident by the given file",
          "relatedSpdxElement": "SPDXRef-File-lib-apk-db-installed-9f5aca292136191a",
          "relationshipType": "OTHER",
          "spdxElementId": "SPDXRef-Package-apk-musl-f7ad0ee8f1c27cb0"
        },
        {
          "comment": "evident-by: indicates the package's existence is evident by the given file",
          "relatedSpdxElement": "SPDXRef-File-lib-apk-db-installed-9f5aca292136191a",
          "relationshipType": "OTHER",
          "spdxElementId": "SPDXRef-Package-apk-busybox-fef07e9c95ea2bda"
        },
        {
          "relatedSpdxElement": "SPDXRef-Package-apk-musl-f7ad0ee8f1c27cb0",
          "relationshipType": "CONTAINS",
          "spdxElementId": "SPDXRef-DocumentRoot-Directory-sbom"
        },
        {
          "relatedSpdxElement": "SPDXRef-Package-apk-busybox-fef07e9c95ea2bda",
          "relationshipType": "CONTAINS",
          "spdxElementId": "SPDXRef-DocumentRoot-Directory-sbom"
        },
        {
          "relatedSpdxElement": "SPDXRef-DocumentRoot-Directory-sbom",
          "relationshipType": "DESCRIBES",
          "spdxElementId": "SPDXRef-DOCUMENT"
        }
      ]
    };

    const blob = new Blob([JSON.stringify(jsonObj)], { type: 'application/json' });
    blobUrl = URL.createObjectURL(blob);

    const result = await jsonToNodes(blobUrl, graphEl);

    expect(result.errors).to.be.empty;
    expect(result.warnings).to.be.empty;
    expect(result.info.length).to.equal(1);

    const fileBusyboxEl = graphEl.children[0];
    expect(fileBusyboxEl.getAttribute('id')).to.equal('SPDXRef-File-bin-busybox-1ac501c94e2f9f81');
    expect(fileBusyboxEl.object3D.position.x).to.be.greaterThanOrEqual(-1);
    expect(fileBusyboxEl.object3D.position.y).to.equal(0);
    expect(fileBusyboxEl.object3D.position.z).to.be.greaterThanOrEqual(-1);
    expect(fileBusyboxEl.object3D.scale.x).to.equal(1.0);
    expect(fileBusyboxEl.object3D.userData?.id).to.equal('SPDXRef-File-bin-busybox-1ac501c94e2f9f81');
    expect(fileBusyboxEl.getObject3D('mesh').geometry).to.have.property('type', 'OctahedronGeometry');

    const fileBusyboxAttr = fileBusyboxEl.getAttribute('graph-node');
    expect(fileBusyboxAttr.title).to.equal('bin/busybox');
    expect(fileBusyboxAttr.notes).to.equal('APPLICATION, BINARY\nlicense: NOASSERTION');
    expect(fileBusyboxAttr.color).to.equal('#808080');
    expect(fileBusyboxAttr.opacity).to.equal(1.0);
    expect(fileBusyboxAttr.primitive).to.equal('octahedron');
    expect(fileBusyboxAttr.imageUrl).to.equal('');
    expect(fileBusyboxAttr.linkUrl).to.equal('');
    expect(fileBusyboxAttr.collapsed).to.be.false;
    expect(fileBusyboxAttr.numChildren).to.equal(0);

    const pkgBusyboxEl = graphEl.children[3];
    expect(pkgBusyboxEl.getAttribute('id')).to.equal('SPDXRef-Package-apk-busybox-fef07e9c95ea2bda');
    expect(pkgBusyboxEl.object3D.position.x).to.be.greaterThanOrEqual(-1);
    expect(pkgBusyboxEl.object3D.position.y).to.equal(0);
    expect(pkgBusyboxEl.object3D.position.z).to.be.greaterThanOrEqual(-1);
    expect(pkgBusyboxEl.object3D.scale.x).to.equal(1.0);
    expect(pkgBusyboxEl.object3D.userData?.id).to.equal('SPDXRef-Package-apk-busybox-fef07e9c95ea2bda');
    expect(pkgBusyboxEl.getObject3D('mesh').geometry).to.have.property('type', 'IcosahedronGeometry');

    const pkgBusyboxAttr = pkgBusyboxEl.getAttribute('graph-node');
    expect(pkgBusyboxAttr.title).to.equal('busybox');
    expect(pkgBusyboxAttr.notes).to.equal('Size optimized toolbox of many common UNIX utilities\nv1.37.0-r31\nlicense: NOASSERTION\nlicense declared: GPL-2.0-only');
    expect(pkgBusyboxAttr.color).to.equal('#ff0000');
    expect(pkgBusyboxAttr.opacity).to.equal(1.0);
    expect(pkgBusyboxAttr.primitive).to.equal('icosahedron');
    expect(pkgBusyboxAttr.imageUrl).to.equal('');
    expect(pkgBusyboxAttr.linkUrl).to.equal('https://busybox.net/');
    expect(pkgBusyboxAttr.collapsed).to.be.false;
    expect(pkgBusyboxAttr.numChildren).to.equal(3);

    const docRootEl = graphEl.children[5];
    expect(docRootEl.getAttribute('id')).to.equal('SPDXRef-DocumentRoot-Directory-sbom');
    expect(docRootEl.object3D.position.x).to.equal(0);
    expect(docRootEl.object3D.position.y).to.equal(1.0);
    expect(docRootEl.object3D.position.z).to.equal(0);
    expect(docRootEl.object3D.scale.x).to.equal(2.0);    // document describes this
    expect(docRootEl.object3D.userData?.id).to.equal('SPDXRef-DocumentRoot-Directory-sbom');
    expect(docRootEl.getObject3D('mesh').geometry).to.have.property('type', 'TorusKnotGeometry');

    const docRootAttr = docRootEl.getAttribute('graph-node');
    expect(docRootAttr.title).to.equal('sbom');
    expect(docRootAttr.notes).to.equal('license: NOASSERTION');
    expect(docRootAttr.color).to.equal('#808080');
    expect(docRootAttr.opacity).to.equal(1.0);
    expect(docRootAttr.primitive).to.equal('torusKnot');
    expect(docRootAttr.imageUrl).to.equal('');
    expect(docRootAttr.linkUrl).to.equal('https://example.com/sbom.zip');
    expect(docRootAttr.collapsed).to.be.false;
    expect(docRootAttr.numChildren).to.equal(2);

    // contained files are added as a-entities w/ graph-edge components
    const edgeEl = graphEl.children[6];
    expect(edgeEl.object3D.position.x).to.be.greaterThanOrEqual(-1);
    expect(edgeEl.object3D.position.y).to.equal(0);
    expect(edgeEl.object3D.position.z).to.be.greaterThanOrEqual(-1);
    expect(edgeEl.object3D.scale).to.deep.equal(new THREE.Vector3(1, 1, 1));

    const fileEdgeAttr = edgeEl.getAttribute('graph-edge');
    expect(fileEdgeAttr.title).to.equal('');
    expect(fileEdgeAttr.color).to.equal('#00ff00');
    expect(fileEdgeAttr.opacity).to.equal(1.0);
    expect(fileEdgeAttr.fromId).to.equal('SPDXRef-Package-apk-busybox-fef07e9c95ea2bda');
    expect(fileEdgeAttr.toId).to.equal('SPDXRef-File-bin-busybox-1ac501c94e2f9f81');
    expect(fileEdgeAttr.preferredLength).to.equal(0.08);

    // package-dependency edges are added as a-entities w/ graph-edge components
    const packageDependencyEdgeEl = graphEl.children[8];
    expect(packageDependencyEdgeEl.object3D.position.x).to.equal(0);
    expect(packageDependencyEdgeEl.object3D.position.y).to.equal(0);
    expect(packageDependencyEdgeEl.object3D.position.z).to.equal(0);
    expect(packageDependencyEdgeEl.object3D.scale).to.deep.equal(new THREE.Vector3(1, 1, 1));

    const packageDependencyEdgeAttr = packageDependencyEdgeEl.getAttribute('graph-edge');
    expect(packageDependencyEdgeAttr.title).to.equal('');
    expect(packageDependencyEdgeAttr.color).to.equal('#ffffff');
    expect(packageDependencyEdgeAttr.opacity).to.equal(1.0);
    expect(packageDependencyEdgeAttr.fromId).to.equal('SPDXRef-Package-apk-musl-f7ad0ee8f1c27cb0');
    expect(packageDependencyEdgeAttr.toId).to.equal('SPDXRef-Package-apk-busybox-fef07e9c95ea2bda');
    expect(packageDependencyEdgeAttr.preferredLength).to.equal(0.30);

    // other file edges are added as a-entities w/ graph-edge components
    const otherEdgeEl = graphEl.children[10];
    expect(otherEdgeEl.object3D.position.x).to.equal(0);
    expect(otherEdgeEl.object3D.position.y).to.equal(0);
    expect(otherEdgeEl.object3D.position.z).to.equal(0);
    expect(otherEdgeEl.object3D.scale).to.deep.equal(new THREE.Vector3(1, 1, 1));

    const otherEdgeAttr = otherEdgeEl.getAttribute('graph-edge');
    expect(otherEdgeAttr.title).to.equal('');
    expect(otherEdgeAttr.color).to.equal('#000000');
    expect(otherEdgeAttr.opacity).to.equal(1.0);
    expect(otherEdgeAttr.fromId).to.equal('SPDXRef-Package-apk-busybox-fef07e9c95ea2bda');
    expect(otherEdgeAttr.toId).to.equal('SPDXRef-File-lib-apk-db-installed-9f5aca292136191a');
    expect(otherEdgeAttr.preferredLength).to.equal(0.30);

    // contained package edge
    const containedPackageEdgeEl = graphEl.children[12];
    expect(containedPackageEdgeEl.object3D.position.x).to.equal(0);
    expect(containedPackageEdgeEl.object3D.position.y).to.equal(0);
    expect(containedPackageEdgeEl.object3D.position.z).to.equal(0);
    expect(containedPackageEdgeEl.object3D.scale).to.deep.equal(new THREE.Vector3(1, 1, 1));

    const containedPackageEdgeAttr = containedPackageEdgeEl.getAttribute('graph-edge');
    expect(containedPackageEdgeAttr.title).to.equal('');
    expect(containedPackageEdgeAttr.color).to.equal('#00ff00');
    expect(containedPackageEdgeAttr.opacity).to.equal(1.0);
    expect(containedPackageEdgeAttr.fromId).to.equal('SPDXRef-DocumentRoot-Directory-sbom');
    expect(containedPackageEdgeAttr.toId).to.equal('SPDXRef-Package-apk-busybox-fef07e9c95ea2bda');
    expect(containedPackageEdgeAttr.preferredLength).to.equal(0.60);

    expect(graphEl.children.length).to.equal(13); // no edge for SPDXRef-DOCUMENT DESCRIBES
  });

});
