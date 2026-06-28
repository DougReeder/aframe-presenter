import { csvToNodes } from '../node-graph-presenter/csvToNodes.js';
import {showHideDescendants} from "../node-graph-presenter/workerUtil";

describe('csvToNodes', function() {
    let blobUrl;

    afterEach(function() {
        URL.revokeObjectURL(blobUrl);
    });

    it('should parse a simple Noda CSV with one Ball node', async function() {
        const csvData = 'Uuid,Title,PositionX,PositionY,PositionZ,Color,Size,Shape,Collapsed\n' +
                        'node1,Test Node,1,2,3,ff0000,5,Ball,No';
        const blob = new Blob([csvData], { type: 'text/csv' });
        blobUrl = URL.createObjectURL(blob);

        const {nodes, links, errors, warnings, info} = await csvToNodes(blobUrl);

        expect(errors).to.be.empty;
        expect(warnings).to.be.empty;
        expect(info.length).to.equal(1);
        expect(nodes.length).to.equal(1);

        const node = nodes[0];
        expect(node.id).to.equal('node1');
        expect(node.title).to.equal('Test Node');
        expect(node.notes).to.not.be;
        expect(node.imageUrl).to.not.be;
        expect(node.linkUrl).to.not.be;
        expect(node.color).to.equal('#ff0000');
        expect(node.opacity).to.equal(1.0);
        expect(node.primitive).to.equal('sphere');
        expect(node.size).to.equal(0.05);
        expect(node.collapsed).to.be.false;
        expect(node.x).to.equal(1);
        expect(node.y).to.equal(2);
        expect(node.z).to.equal(3);
        expect(node.visible).to.be;
        expect(node.out).toHaveLength(0);
        expect(node.in.size).to.equal(0);
    });

    it('should parse a simple Noda CSV with one Diamond node w/ notes, ImageURL & PageURL', async function() {
        const csvData = 'Uuid,Title,Notes,ImageURL,PageURL,PositionX,PositionY,PositionZ,Color,Size,Shape,Collapsed\n' +
            'diamondNode,Diamond Node,some pig,https://example.com/pic,https://example.org/page,10,20,30,808080,6,Diamond,Yes';
        const blob = new Blob([csvData], { type: 'text/csv' });
        blobUrl = URL.createObjectURL(blob);

        const result = await csvToNodes(blobUrl);

        expect(result.errors).to.be.empty;
        expect(result.warnings).to.be.empty;
        expect(result.info.length).to.equal(1);

        const node = result.nodes[0];
        expect(node.id).to.equal('diamondNode');
        expect(node.title).to.equal('Diamond Node');
        expect(node.notes).to.equal('some pig');
        expect(node.imageUrl).to.equal('https://example.com/pic');
        expect(node.linkUrl).to.equal('https://example.org/page');
        expect(node.color).to.equal('#808080');
        expect(node.opacity).to.equal(1.0);
        expect(node.primitive).to.equal('octahedron');
        expect(node.size).to.equal(0.06);
        expect(node.collapsed).to.be.true;
        expect(node.x).to.equal(10);
        expect(node.y).to.equal(20);
        expect(node.z).to.equal(30);
        expect(node.visible).to.be.true;
        expect(node.out).toHaveLength(0);
        expect(node.in.size).to.equal(0);
    });

    it('should parse a simple Noda CSV with one Flat node w/ undefined X, Y, scale & color', async function() {
        const csvData = 'Uuid,Title,Notes,ImageURL,PageURL,PositionX,PositionY,PositionZ,Color,Size,Shape\n' +
            'flatNode,Flat Node,,,,,,69,,,Flat';
        const blob = new Blob([csvData], { type: 'text/csv' });
        blobUrl = URL.createObjectURL(blob);

        const result = await csvToNodes(blobUrl);

        expect(result.errors).to.be.empty;
        expect(result.warnings).to.be.empty;
        expect(result.info.length).to.equal(1);

        const node = result.nodes[0];
        expect(node.id).to.equal('flatNode');
        expect(node.title).to.equal('Flat Node');
        expect(node.notes).to.be.toBeFalsy();
        expect(node.imageUrl).to.be.toBeFalsy();
        expect(node.linkUrl).to.be.toBeFalsy();
        expect(node.color.toLowerCase()).to.equal('#ffffff');
        expect(node.opacity).to.equal(1.0);
        expect(node.primitive).to.equal('plane');
        expect(node.size).to.equal(0.05);
        expect(node.collapsed).to.be.false;
        expect(node.x).to.be.NaN;
        expect(node.y).to.be.NaN;
        expect(node.z).to.equal(69);
        expect(node.visible).to.be.true;
        expect(node.out).toHaveLength(0);
        expect(node.in.size).to.equal(0);

        expect(result.nodes.length).to.equal(1);
    });


    it('should parse a Noda CSV with nodes and edges', async function() {
        const csvData = 'Uuid,Title,PositionX,PositionY,PositionZ,Collapsed,FromUuid,ToUuid\n' +
                        'n1,Node 1,11,12,13,No,,\n' +
                        'n2,Node 2,21,22,23,Yes,,\n' +
                        'n3,Node 3,31,32,33,No,,\n' +
                        'n4,Node 4,41,42,43,Yes,,\n' +
                        'n5,Node 5,51,52,53,No,,\n' +
                        'e1,Edge 1,,,,,n1,n2\n' +
                        'e2,Edge 2,,,,,n2,n3\n' +
                        'e3,Edge 3,,,,,n3,n4\n' +
                        'e4,Edge 4,,,,,n4,n5';
        const blob = new Blob([csvData], { type: 'text/csv' });
        blobUrl = URL.createObjectURL(blob);

        const result = await csvToNodes(blobUrl);

        expect(result.errors).to.be.empty;
        expect(result.warnings).to.be.empty;
        expect(result.info.length).to.equal(1);

        const nodes = result.nodes;
        expect(nodes[0].id).to.equal('n1');
        expect(nodes[0].x).to.equal(11);
        expect(nodes[0].collapsed).to.be.false;
        expect(Array.from(nodes[0].out)[0].source).to.equal(nodes[0]);
        expect(Array.from(nodes[0].out)[0].target).to.equal(nodes[1]);
        expect(nodes[0].out.size).to.equal(1);
        expect(nodes[0].in.size).to.equal(0);
        expect(nodes[0].visible).to.be.true;

        expect(nodes[1].id).to.equal('n2');
        expect(nodes[1].collapsed).to.be.true;
        expect(nodes[1].out.size).to.equal(1);
        expect(Array.from(nodes[1].in)[0]).to.equal(Array.from(nodes[0].out)[0]);
        expect(nodes[1].in.size).to.equal(1);
        expect(nodes[1].visible).to.be.true;

        expect(nodes[2].id).to.equal('n3');
        expect(nodes[2].collapsed).to.be.false;
        expect(nodes[2].out.size).to.equal(1);
        expect(nodes[2].in.size).to.equal(1);
        expect(nodes[2].visible).to.be.false;

        expect(nodes[3].id).to.equal('n4');
        expect(nodes[3].collapsed).to.be.true;
        expect(nodes[3].out.size).to.equal(1);
        expect(nodes[3].in.size).to.equal(1);
        expect(nodes[3].visible).to.be.false;

        expect(nodes[4].id).to.equal('n5');
        expect(nodes[4].collapsed).to.be.false;
        expect(nodes[4].out.size).to.equal(0);
        expect(nodes[4].in.size).to.equal(1);
        expect(nodes[4].visible).to.be.false;

        expect(nodes.length).to.equal(5);

        const edge1 = result.links[0];
        expect(edge1.id).to.equal('e1');
        expect(edge1.title).to.equal('Edge 1');
        expect(typeof edge1.source).to.equal('object');
        expect(edge1.source.id).to.equal('n1');
        expect(edge1.source.x).to.equal(11);
        expect(edge1.source.y).to.equal(12);
        expect(edge1.source.z).to.equal(13);
        expect(edge1.target.id).to.equal('n2');
        expect(edge1.target.x).to.equal(21);
        expect(edge1.target.y).to.equal(22);
        expect(edge1.target.z).to.equal(23);

        expect(edge1.visible).to.be.true;

        const edge2 = result.links[1];
        expect(edge2.id).to.equal('e2');
        expect(edge2.title).to.equal('Edge 2');
        expect(typeof edge2.source).to.equal('object');
        expect(edge2.source.id).to.equal('n2');
        expect(edge2.source.x).to.equal(21);
        expect(edge2.source.y).to.equal(22);
        expect(edge2.source.z).to.equal(23);
        expect(edge2.target.id).to.equal('n3');
        expect(edge2.target.x).to.equal(31);
        expect(edge2.target.y).to.equal(32);
        expect(edge2.target.z).to.equal(33);
        expect(edge2.visible).to.be.false;

        const edge3 = result.links[2];
        expect(edge3.id).to.equal('e3');
        expect(edge3.visible).to.be.false;

        const edge4 = result.links[3];
        expect(edge4.id).to.equal('e4');
        expect(edge4.visible).to.be.false;

        expect(result.links.length).to.equal(4);


        nodes[1].collapsed = false;
        showHideDescendants(true, nodes[1], false);
        expect(nodes[1].collapsed).to.be.false;
        expect(nodes[1].visible).to.be.true;
        expect(nodes[2].collapsed).to.be.false;
        expect(nodes[2].visible).to.be.true;
        expect(nodes[3].collapsed).to.be.true;
        expect(nodes[3].visible).to.be.true;
        expect(nodes[4].collapsed).to.be.false;
        expect(nodes[4].visible).to.be.false;
    });

    it('should not create edge missing "from" node, and warn', async function() {
        const csvData = 'Uuid,Title,PositionX,PositionY,PositionZ,FromUuid,ToUuid\n' +
            'n1,Node 1,1,1,1,,\n' +
            'n2,Node 2,2,2,2,,\n' +
            'e1,Edge 1,,,,nonexistent1,n2';
        const blob = new Blob([csvData], { type: 'text/csv' });
        blobUrl = URL.createObjectURL(blob);

        const result = await csvToNodes(blobUrl);

        expect(result.errors).to.be.empty;
        expect(result.warnings.length).to.be.greaterThan(0);
        expect(result.warnings.some(w => w.includes('can\'t find “from” node'))).to.be.true;
        expect(result.info.length).to.equal(1);

        expect(result.links).to.have.lengthOf(0);
    });

    it('should not create edge missing "to" node, and warn', async function() {
        const csvData = 'Uuid,Title,PositionX,PositionY,PositionZ,FromUuid,ToUuid\n' +
            'n1,Node 1,1,1,1,,\n' +
            'n2,Node 2,2,2,2,,\n' +
            'e1,Edge 1,,,,n1,nonexistent2';
        const blob = new Blob([csvData], { type: 'text/csv' });
        blobUrl = URL.createObjectURL(blob);

        const result = await csvToNodes(blobUrl);

        expect(result.errors).to.be.empty;
        expect(result.warnings.length).to.be.greaterThan(0);
        expect(result.warnings.some(w => w.includes('can\'t find “to” node'))).to.be.true;
        expect(result.info.length).to.equal(1);

        expect(result.links.length).to.equal(0);
    });

    it('should not create edge missing both nodes, and warn', async function() {
        const csvData = 'Uuid,Title,PositionX,PositionY,PositionZ,FromUuid,ToUuid\n' +
            'e1,Edge 1,,,,nonexistent1,nonexistent2';
        const blob = new Blob([csvData], { type: 'text/csv' });
        blobUrl = URL.createObjectURL(blob);

        const result = await csvToNodes(blobUrl);

        expect(result.errors).to.be.empty;
        expect(result.warnings.length).to.be.greaterThan(0);
        expect(result.warnings.some(w => w.includes('can\'t find “from” node'))).to.be.true;
        expect(result.info.length).to.equal(1);

        expect(result.links.length).to.equal(0);
    });
});
