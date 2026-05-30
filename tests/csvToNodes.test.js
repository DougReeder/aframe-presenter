describe('csvToNodes', function() {
    let graphEl, blobUrl;

    beforeEach(function() {
        graphEl = document.createElement('a-entity');
        document.querySelector('a-scene').appendChild(graphEl);
    });

    afterEach(function() {
        URL.revokeObjectURL(blobUrl);
        document.querySelector('a-scene').removeChild(graphEl);
    });

    it('should parse a simple Noda CSV with one Ball node', async function() {
        const csvData = 'Uuid,Title,PositionX,PositionY,PositionZ,Color,Size,Shape\n' +
                        'node1,Test Node,1,2,3,ff0000,5,Ball';
        const blob = new Blob([csvData], { type: 'text/csv' });
        blobUrl = URL.createObjectURL(blob);

        const result = await csvToNodes(blobUrl, 'NODA', graphEl);

        expect(result.errors).to.be.empty;
        expect(result.warnings).to.be.empty;
        expect(result.info.length).to.equal(1);
        expect(graphEl.children.length).to.equal(1);

        const nodeEl = graphEl.children[0];
        expect(nodeEl.getAttribute('id')).to.equal('node1');
        expect(nodeEl.object3D.position.x).to.equal(1);
        expect(nodeEl.object3D.position.y).to.equal(2);
        expect(nodeEl.object3D.position.z).to.equal(3);
        expect(nodeEl.object3D.scale.x).to.equal(0.1);   // default
        expect(nodeEl.object3D.userData?.id).to.equal('node1');
        expect(nodeEl.getObject3D('mesh').geometry).to.have.property('type', 'SphereGeometry');
        expect(nodeEl.getObject3D('mesh').geometry.parameters).to.have.property('radius', 1);

        const graphNodeAttr = nodeEl.getAttribute('graph-node');
        expect(graphNodeAttr.title).to.equal('Test Node');
        expect(graphNodeAttr.notes).to.equal('');
        expect(graphNodeAttr.color).to.equal('ff0000');
        expect(graphNodeAttr.opacity).to.equal(1.0);
        expect(graphNodeAttr.shape).to.equal('Ball');
        expect(graphNodeAttr.imageUrl).to.equal('');
        expect(graphNodeAttr.linkUrl).to.equal('');
    });

    it('should parse a simple Noda CSV with one Diamond node w/ notes, ImageURL & PageURL', async function() {
        const csvData = 'Uuid,Title,Notes,ImageURL,PageURL,PositionX,PositionY,PositionZ,Color,Size,Shape\n' +
            'diamondNode,Diamond Node,some pig,https://example.com/pic,https://example.org/page,10,20,30,808080,6,Diamond';
        const blob = new Blob([csvData], { type: 'text/csv' });
        blobUrl = URL.createObjectURL(blob);

        const result = await csvToNodes(blobUrl, 'NODA', graphEl);

        expect(result.errors).to.be.empty;
        expect(result.warnings).to.be.empty;
        expect(result.info.length).to.equal(1);

        const nodeEl = graphEl.children[0];
        expect(nodeEl.getAttribute('id')).to.equal('diamondNode');
        expect(nodeEl.object3D.position.x).to.equal(10);
        expect(nodeEl.object3D.position.y).to.equal(20);
        expect(nodeEl.object3D.position.z).to.equal(30);
        expect(nodeEl.object3D.scale.x).to.equal(0.12);
        expect(nodeEl.object3D.userData?.id).to.equal('diamondNode');
        expect(nodeEl.getObject3D('mesh').geometry).to.have.property('type', 'OctahedronGeometry');
        expect(nodeEl.getObject3D('mesh').geometry.parameters).to.have.property('radius', 1.1);

        const graphNodeAttr = nodeEl.getAttribute('graph-node');
        expect(graphNodeAttr.title).to.equal('Diamond Node');
        expect(graphNodeAttr.notes).to.equal('some pig');
        expect(graphNodeAttr.color).to.equal('808080');
        expect(graphNodeAttr.opacity).to.equal(1.0);
        expect(graphNodeAttr.shape).to.equal('Diamond');
        expect(graphNodeAttr.imageUrl).to.equal('https://example.com/pic');
        expect(graphNodeAttr.linkUrl).to.equal('https://example.org/page');

        expect(graphEl.children.length).to.equal(1);
    });

    it('should parse a simple Noda CSV with one Flat node w/ undefined X & Y', async function() {
        const csvData = 'Uuid,Title,Notes,ImageURL,PageURL,PositionX,PositionY,PositionZ,Color,Size,Shape\n' +
            'flatNode,Flat Node,,,,,,69,,,Flat';
        const blob = new Blob([csvData], { type: 'text/csv' });
        blobUrl = URL.createObjectURL(blob);

        const result = await csvToNodes(blobUrl, 'NODA', graphEl);

        expect(result.errors).to.be.empty;
        expect(result.warnings).to.be.empty;
        expect(result.info.length).to.equal(1);

        const nodeEl = graphEl.children[0];
        expect(nodeEl.getAttribute('id')).to.equal('flatNode');
        expect(nodeEl.object3D.position.x).to.be.NaN;
        expect(nodeEl.object3D.position.y).to.be.NaN;
        expect(nodeEl.object3D.position.z).to.equal(69);
        expect(nodeEl.object3D.scale.x).to.equal(0.10);   // default
        expect(nodeEl.object3D.userData?.id).to.equal('flatNode');
        expect(nodeEl.getObject3D('mesh').geometry).to.have.property('type', 'PlaneGeometry');
        expect(nodeEl.getObject3D('mesh').geometry.parameters).to.have.property('width', 0);
        expect(nodeEl.getObject3D('mesh').geometry.parameters).to.have.property('height', 0);

        const graphNodeAttr = nodeEl.getAttribute('graph-node');
        expect(graphNodeAttr.title).to.equal('Flat Node');
        expect(graphNodeAttr.notes).to.equal('');
        expect(graphNodeAttr.color).to.equal('#FFF');
        expect(graphNodeAttr.opacity).to.equal(1.0);
        expect(graphNodeAttr.shape).to.equal('Flat');
        expect(graphNodeAttr.imageUrl).to.equal('');
        expect(graphNodeAttr.linkUrl).to.equal('');

        expect(graphEl.children.length).to.equal(1);
    });

    it('should parse a Noda CSV with nodes and edges', async function() {
        const csvData = 'Uuid,Title,PositionX,PositionY,PositionZ,FromUuid,ToUuid\n' +
                        'n1,Node 1,1,1,1,,\n' +
                        'n2,Node 2,2,2,2,,\n' +
                        'e1,Edge 1,,,,n1,n2';
        const blob = new Blob([csvData], { type: 'text/csv' });
        blobUrl = URL.createObjectURL(blob);

        const result = await csvToNodes(blobUrl, 'NODA', graphEl);

        expect(result.errors).to.be.empty;
        expect(result.warnings).to.be.empty;
        expect(result.info.length).to.equal(1);
        const nodes = Array.from(graphEl.children).filter(el => el.hasAttribute('graph-node') && el.getAttribute('id') && el.getAttribute('id').startsWith('n'));
        expect(nodes.length).to.equal(2);

        // Edges are added to graphEl.object3D (the 'graph')
        const graph = graphEl.object3D;
        const edges = graph.children.filter(child => child.type === 'Line');
        expect(edges.length).to.equal(1);
        expect(edges[0].name).to.equal('Edge 1');
        const geometry = edges[0].geometry;
        const positions = geometry.attributes.position.array;

        // Check start point (n1 at 1,1,1)
        expect(positions[0]).to.equal(1);
        expect(positions[1]).to.equal(1);
        expect(positions[2]).to.equal(1);

        // Check end point (n2 at 2,2,2)
        expect(positions[3]).to.equal(2);
        expect(positions[4]).to.equal(2);
        expect(positions[5]).to.equal(2);
    });

    it('should not create edge missing "from" node, and warn', async function() {
        const csvData = 'Uuid,Title,PositionX,PositionY,PositionZ,FromUuid,ToUuid\n' +
            'n1,Node 1,1,1,1,,\n' +
            'n2,Node 2,2,2,2,,\n' +
            'e1,Edge 1,,,,nonexistent1,n2';
        const blob = new Blob([csvData], { type: 'text/csv' });
        blobUrl = URL.createObjectURL(blob);

        const result = await csvToNodes(blobUrl, 'NODA', graphEl);

        expect(result.errors).to.be.empty;
        expect(result.warnings.length).to.be.greaterThan(0);
        expect(result.warnings.some(w => w.includes('can\'t find “from” node'))).to.be.true;
        expect(result.info.length).to.equal(1);

        const graph = graphEl.object3D;
        const edges = graph.children.filter(child => child.type === 'Line');
        expect(edges.length).to.equal(0);
    });

    it('should not create edge missing "to" node, and warn', async function() {
        const csvData = 'Uuid,Title,PositionX,PositionY,PositionZ,FromUuid,ToUuid\n' +
            'n1,Node 1,1,1,1,,\n' +
            'n2,Node 2,2,2,2,,\n' +
            'e1,Edge 1,,,,n1,nonexistent2';
        const blob = new Blob([csvData], { type: 'text/csv' });
        blobUrl = URL.createObjectURL(blob);

        const result = await csvToNodes(blobUrl, 'NODA', graphEl);

        expect(result.errors).to.be.empty;
        expect(result.warnings.length).to.be.greaterThan(0);
        expect(result.warnings.some(w => w.includes('can\'t find “to” node'))).to.be.true;
        expect(result.info.length).to.equal(1);

        const graph = graphEl.object3D;
        const edges = graph.children.filter(child => child.type === 'Line');
        expect(edges.length).to.equal(0);
    });

    it('should not create edge missing both nodes, and warn', async function() {
        const csvData = 'Uuid,Title,PositionX,PositionY,PositionZ,FromUuid,ToUuid\n' +
            'e1,Edge 1,,,,nonexistent1,nonexistent2';
        const blob = new Blob([csvData], { type: 'text/csv' });
        blobUrl = URL.createObjectURL(blob);

        const result = await csvToNodes(blobUrl, 'NODA', graphEl);

        expect(result.errors).to.be.empty;
        expect(result.warnings.length).to.be.greaterThan(0);
        expect(result.warnings.some(w => w.includes('can\'t find “from” node'))).to.be.true;
        expect(result.info.length).to.equal(1);

        const graph = graphEl.object3D;
        const edges = graph.children.filter(child => child.type === 'Line');
        expect(edges.length).to.equal(0);
    });
});
