import { jsonToNodes } from '../node-graph-presenter/jsonToNodes.js';

describe('jsonToNodes', function() {
  let blobUrl;

  afterEach(function() {
    URL.revokeObjectURL(blobUrl);
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

    const result = await jsonToNodes(null, blobUrl);

    expect(result.errors).to.be.empty;
    expect(result.warnings).to.be.empty;
    expect(result.info.length).to.equal(1);

    const node = result.nodes[0];
    expect(node.id).to.equal('owner-foo-app-main-229496');
    expect(node.title).to.equal('com.github.owner/foo-app');
    expect(node.notes).to.equal('vmain\nlicense declared: GPL-2.0');
    expect(node.imageUrl).toBeFalsy();
    expect(node.linkUrl).to.equal('https://github.com/owner/foo-app');
    expect(node.color).to.equal('#ff0000');
    expect(node.opacity).to.equal(1.0);
    expect(node.primitive).to.equal('tetrahedron');
    expect(node.collapsed).to.be.false;   // no file children
    expect(node.x).to.be.NaN;
    expect(node.y).to.be.NaN;
    expect(node.z).to.be.NaN;
    expect(node.size).to.equal(0.05);

    expect(node.numChildren).to.equal(0);
    expect(node.out.size).to.equal(0);
    expect(node.in.size).to.equal(0);
    expect(node.visible).to.be.true;

    expect(result.nodes).to.have.lengthOf(1);
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

    const result = await jsonToNodes(null, blobUrl);

    expect(result.errors).to.be.empty;
    expect(result.warnings).to.be.empty;
    expect(result.info.length).to.equal(1);

    const express = result.nodes[0];
    const bar = result.nodes[1];

    expect(express.id).to.equal('p-express-4182');
    expect(express.title).to.equal('express');
    expect(express.notes).to.equal('v4.18.2\nlicense: MIT');
    expect(express.imageUrl).toBeFalsy();
    expect(express.linkUrl).to.equal('https://npmjs.org');
    expect(express.color).to.equal('#000080');
    expect(express.opacity).to.equal(1.0);
    expect(express.primitive).to.equal('box');
    expect(typeof express.collapsed).to.equal('boolean');
    expect(express.x).to.equal(0.0);
    expect(express.y).to.equal(0.0);
    expect(express.z).to.equal(0.0);

    expect(express.collapsed).to.be.false;   // packages w/ no files aren't collapsed
    expect(express.numChildren).to.equal(0);
    expect(express.out.size).to.equal(0);
    expect(Array.from(express.in)[0].target).to.equal(express);
    expect(Array.from(express.in)[0].source).to.equal(bar);
    expect(express.in.size).to.equal(1);
    expect(express.visible).to.be.true;

    expect(bar.id).to.equal('owner-bar-app-main-229496');
    expect(bar.title).to.equal('com.github.owner/bar-app');
    expect(bar.notes).to.equal('vmain\nlicense declared: LGPL-2.0');
    expect(bar.imageUrl).toBeFalsy();
    expect(bar.linkUrl).to.equal('https://github.com/owner/bar-app');
    expect(bar.color).to.equal('#008000');
    expect(bar.opacity).to.equal(1.0);
    expect(bar.primitive).to.equal('tetrahedron');
    expect(bar.collapsed).to.be.false;
    expect(bar.x).to.be.NaN;
    expect(bar.x).to.be.NaN;
    expect(bar.x).to.be.NaN;
    expect(bar.collapsed).to.be.false;   // packages w/ no files aren't collapsed
    expect(bar.numChildren).to.equal(1);
    expect(bar.out.size).to.equal(1);
    expect(bar.in.size).to.equal(0);
    expect(bar.visible).to.be.true;

    // No node created for SPDXRef-DOCUMENT DESCRIBES — it's only used to identify root node

    // Relationships are added as links
    const link = result.links[0];
    expect(link.title).toBeFalsy();  // DEPENDS_ON is too common to have a title
    expect(link.color.toLowerCase()).to.equal('#ffffff');

    // Check start point
    expect(link.source.id).to.equal('owner-bar-app-main-229496');

    // Check end point
    expect(link.target.id).to.equal('p-express-4182');   // drops prefix & CSS-unfriendly chars
    expect(link.preferredLength).to.equal(0.30);

    expect(result.links).to.have.lengthOf(1);
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

    const result = await jsonToNodes(null, blobUrl);

    expect(result.errors).to.be.empty;
    expect(result.warnings).to.be.empty;
    expect(result.info.length).to.equal(1);

    const fileBusybox = result.nodes[0];
    expect(fileBusybox.id).to.equal('F-bin-busybox-1ac501c94e2f9f81');
    expect(fileBusybox.title).to.equal('bin/busybox');
    expect(fileBusybox.notes).to.equal('APPLICATION, BINARY\nlicense: NOASSERTION');
    expect(fileBusybox.imageUrl).toBeFalsy();
    expect(fileBusybox.linkUrl).toBeFalsy();
    expect(fileBusybox.color).to.equal('#808080');
    expect(fileBusybox.opacity).to.equal(1.0);
    expect(fileBusybox.primitive).to.equal('octahedron');
    expect(fileBusybox.collapsed).to.be.false;
    expect(fileBusybox.x).to.be.NaN;
    expect(fileBusybox.y).to.be.NaN;
    expect(fileBusybox.z).to.be.NaN;
    expect(fileBusybox.collapsed).to.be.false;   // files aren't collapsed
    expect(fileBusybox.out.size).to.equal(0);
    expect(fileBusybox.in.size).to.equal(1);
    expect(fileBusybox.visible).to.be.false;

    const fileApkDb = result.nodes[2];
    expect(fileApkDb.id).to.equal('F-lib-apk-db-installed-9f5aca292136191a');
    expect(fileApkDb.title).to.equal('lib/apk/db/installed');
    expect(fileApkDb.notes).to.equal('TEXT\nlicense: NOASSERTION');
    expect(fileApkDb.collapsed).to.be.false;
    expect(fileApkDb.out.size + fileApkDb.in.size).to.equal(2);   // rel. are OTHER
    expect(fileApkDb.visible).to.be.true;   // parent "musl" has non-file child

    const pkgBusybox = result.nodes[3];
    expect(pkgBusybox.id).to.equal('P-busybox-fef07e9c95ea2bda');
    expect(pkgBusybox.title).to.equal('busybox');
    expect(pkgBusybox.notes).to.equal('Size optimized toolbox of many common UNIX utilities\nv1.37.0-r31\nlicense: NOASSERTION\nlicense declared: GPL-2.0-only');
    expect(pkgBusybox.imageUrl).toBeFalsy();
    expect(pkgBusybox.linkUrl).to.equal('https://busybox.net/');
    expect(pkgBusybox.color).to.equal('#ff0000');
    expect(pkgBusybox.opacity).to.equal(1.0);
    expect(pkgBusybox.primitive).to.equal('icosahedron');
    expect(pkgBusybox.collapsed).to.be.true;   // contains file
    expect(pkgBusybox.x).to.be.NaN;
    expect(pkgBusybox.y).to.be.NaN;
    expect(pkgBusybox.z).to.be.NaN;
    expect(pkgBusybox.out.size).to.equal(3);
    expect(pkgBusybox.in.size).to.equal(2);
    expect(pkgBusybox.visible).to.be.true;

    expect(pkgBusybox.numChildren).to.equal(3);

    const docRoot = result.nodes[5];
    expect(docRoot.id).to.equal('DocumentRoot-Directory-sbom');
    expect(docRoot.title).to.equal('sbom');
    expect(docRoot.notes).to.equal('license: NOASSERTION');
    expect(docRoot.imageUrl).toBeFalsy();
    expect(docRoot.linkUrl).to.equal('https://example.com/sbom.zip');
    expect(docRoot.color).to.equal('#808080');
    expect(docRoot.opacity).to.equal(1.0);
    expect(docRoot.primitive).to.equal('torusKnot');
    expect(docRoot.collapsed).to.be.false;
    expect(docRoot.x).to.equal(0);
    expect(docRoot.y).to.equal(0);
    expect(docRoot.z).to.equal(0);
    expect(docRoot.out.size).to.equal(2);
    expect(docRoot.in.size).to.equal(0);
    expect(docRoot.visible).to.be.true;

    expect(docRoot.numChildren).to.equal(2);

    // contained files are added as links
    const fileBBEdge = result.links[0];
    expect(fileBBEdge.id).to.equal('P-busybox-fef07e9c95ea2bda_CON_F-bin-busybox-1ac501c94e2f9f81');
    expect(fileBBEdge.title).toBeUndefined();
    expect(fileBBEdge.color).to.equal('#00ff00');
    // expect(fileBBEdge.opacity).to.equal(1.0);
    expect(fileBBEdge.source.id).to.equal('P-busybox-fef07e9c95ea2bda');
    expect(fileBBEdge.target.id).to.equal('F-bin-busybox-1ac501c94e2f9f81');
    expect(fileBBEdge.x).toBeNaN;
    expect(fileBBEdge.y).toBeNaN;
    expect(fileBBEdge.z).toBeNaN;
    expect(fileBBEdge.preferredLength).to.equal(0.08);
    expect(fileBBEdge.visible).to.be.false;

    // package-dependency relationships are added as links
    const packageDependencyEdge = result.links[2];
    expect(packageDependencyEdge.id).to.equal('P-musl-f7ad0ee8f1c27cb0_DEP_P-busybox-fef07e9c95ea2bda');
    expect(packageDependencyEdge.title).toBeFalsy();
    expect(packageDependencyEdge.color.toLowerCase()).to.equal('#ffffff');
    // expect(packageDependencyEdge.opacity).to.equal(1.0);
    expect(packageDependencyEdge.source.id).to.equal('P-musl-f7ad0ee8f1c27cb0');
    expect(packageDependencyEdge.target.id).to.equal('P-busybox-fef07e9c95ea2bda');
    expect(packageDependencyEdge.preferredLength).to.equal(0.30);
    expect(packageDependencyEdge.visible).to.be.true;

    // other file dependencies are added as links
    const otherRelationship = result.links[4];
    expect(otherRelationship.id).to.equal('P-busybox-fef07e9c95ea2bda_OTH_F-lib-apk-db-installed-9f5aca292136191a');
    expect(otherRelationship.title).toBeFalsy();
    expect(otherRelationship.color).to.equal('#000000');
    // expect(otherRelationship.opacity).to.equal(1.0);
    expect(otherRelationship.source.id).to.equal('P-busybox-fef07e9c95ea2bda');
    expect(otherRelationship.target.id).to.equal('F-lib-apk-db-installed-9f5aca292136191a');
    expect(otherRelationship.preferredLength).to.equal(0.30);
    expect(otherRelationship.visible).to.be.true; // parent "musl" has non-file child

    // contained package edge
    const containedPackage = result.links[6];
    expect(containedPackage.id).to.equal('DocumentRoot-Directory-sbom_CON_P-busybox-fef07e9c95ea2bda');
    expect(containedPackage.title).toBeFalsy();
    expect(containedPackage.color).to.equal('#00ff00');
    // expect(containedPackage.opacity).to.equal(1.0);
    expect(containedPackage.source.id).to.equal('DocumentRoot-Directory-sbom');
    expect(containedPackage.target.id).to.equal('P-busybox-fef07e9c95ea2bda');
    expect(containedPackage.preferredLength).to.equal(0.60);

    expect(result.links).to.have.lengthOf(7); // no edge for SPDXRef-DOCUMENT DESCRIBES
  });

});
