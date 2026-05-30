describe('csvToNodes', function() {
    let graphEl;

    beforeEach(function() {
        graphEl = document.createElement('a-entity');
        document.querySelector('a-scene').appendChild(graphEl);
    });

    afterEach(function() {
        document.querySelector('a-scene').removeChild(graphEl);
    });

    it('should parse a simple Noda CSV with one node', async function() {
        const csvData = 'Uuid,Title,PositionX,PositionY,PositionZ,Color,Size,Shape\n' +
                        'node1,Test Node,1,2,3,ff0000,5,Ball';
        const blob = new Blob([csvData], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);

        const result = await csvToNodes(url, 'NODA', graphEl);

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

        const graphNodeAttr = nodeEl.getAttribute('graph-node');
        expect(graphNodeAttr.title).to.equal('Test Node');
        expect(graphNodeAttr.notes).to.equal('');
        expect(graphNodeAttr.color).to.equal('ff0000');
        expect(graphNodeAttr.opacity).to.equal(1.0);
        expect(graphNodeAttr.shape).to.equal('Ball');
        expect(graphNodeAttr.imageUrl).to.equal('');
        expect(graphNodeAttr.linkUrl).to.equal('');
    });

    it('should parse a Noda CSV with nodes and edges', async function() {
        const csvData = 'Uuid,Title,PositionX,PositionY,PositionZ,FromUuid,ToUuid\n' +
                        'n1,Node 1,1,1,1,,\n' +
                        'n2,Node 2,2,2,2,,\n' +
                        'e1,Edge 1,,,,n1,n2';
        const blob = new Blob([csvData], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);

        const result = await csvToNodes(url, 'NODA', graphEl);

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
        const url = URL.createObjectURL(blob);

        const result = await csvToNodes(url, 'NODA', graphEl);

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
        const url = URL.createObjectURL(blob);

        const result = await csvToNodes(url, 'NODA', graphEl);

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
        const url = URL.createObjectURL(blob);

        const result = await csvToNodes(url, 'NODA', graphEl);

        expect(result.errors).to.be.empty;
        expect(result.warnings.length).to.be.greaterThan(0);
        expect(result.warnings.some(w => w.includes('can\'t find “from” node'))).to.be.true;
        expect(result.info.length).to.equal(1);

        const graph = graphEl.object3D;
        const edges = graph.children.filter(child => child.type === 'Line');
        expect(edges.length).to.equal(0);
    });
});
