describe('selectable-node-graph component', function() {
    let el, blobUrl;

    beforeEach(function(done) {
        el = document.createElement('a-entity');
        el.setAttribute('selectable-node-graph', '');
        const scene = document.querySelector('a-scene');
        scene.appendChild(el);
        // waits for component to initialize
        if (el.hasLoaded) {
            done();
        } else {
            el.addEventListener('loaded', () => done());
        }
    });

    afterEach(function() {
        if (blobUrl) {
            URL.revokeObjectURL(blobUrl);
            blobUrl = null;
        }
        if (el && el.parentNode) {
            el.parentNode.removeChild(el);
        }
    });

    it('should initialize with default properties and create UI elements', function() {
        const component = el.components['selectable-node-graph'];
        expect(component).to.exist;
        expect(component.data.spreadHoriz).to.equal(1);
        expect(component.data.spreadVert).to.equal(1);

        // Check if UI elements were created and added to body
        expect(component.controlStrip).to.exist;
        expect(component.controlStrip.parentNode).to.equal(document.body);
        expect(component.fileInpt).to.exist;
        expect(component.fileInpt.parentNode).to.equal(document.body);
    });

    it('should load nodes when URL input changes', async function() {
        const csvData = 'Uuid,Title,PositionX,PositionY,PositionZ,Color,Size,Shape,Collapsed\n' +
                        'node1,Test Node,11,22,33,ff0000,5,Ball,No';
        const blob = new Blob([csvData], { type: 'text/csv' });
        blobUrl = URL.createObjectURL(blob);

        const component = el.components['selectable-node-graph'];
        component.urlInput.value = blobUrl;
        component.openUrl();

        await waitForEvent(el, 'graph-loaded');

        // with one node, spread should be 1
        expect(el.getAttribute('selectable-node-graph').spreadHoriz).to.equal(1);
        expect(el.getAttribute('selectable-node-graph').spreadVert).to.equal(1);

        expect(el.children.length).to.equal(1);
        const nodeEl = el.children[0];
        expect(nodeEl.getAttribute('id')).to.equal('node1');
        expect(nodeEl.object3D.position.x).to.equal(11);   // 1 node -> spread 1
        expect(nodeEl.object3D.position.y).to.equal(22);
        expect(nodeEl.object3D.position.z).to.equal(33);

        // graph should be centered on the only node
        expect(el.object3D.position.x).to.equal(-11);
        expect(el.object3D.position.y).to.equal(1.25 - 22);
        expect(el.object3D.position.z).to.be.closeTo(-33, 0.003);
    });

    it('should update node positions when spread changes', async function() {
        const csvData = 'Uuid,Title,PositionX,PositionY,PositionZ,Color,Size,Shape,Collapsed\n' +
                        'node1,Test Node,1,2,3,ff0000,5,Ball,No';
        const blob = new Blob([csvData], { type: 'text/csv' });
        blobUrl = URL.createObjectURL(blob);

        const component = el.components['selectable-node-graph'];
        component.urlInput.value = blobUrl;
        component.openUrl();

        await waitForEvent(el, 'graph-loaded');

        const nodeEl = el.children[0];
        expect(nodeEl.object3D.position.x).to.equal(1);
        expect(nodeEl.object3D.position.y).to.equal(2);
        expect(nodeEl.object3D.position.z).to.equal(3);

        // Change spread
        el.setAttribute('selectable-node-graph', 'spreadHoriz', 2);
        el.setAttribute('selectable-node-graph', 'spreadVert', 3);

        // spread update is sync for positions
        expect(nodeEl.object3D.position.x).to.equal(2); // 1 * 2
        expect(nodeEl.object3D.position.y).to.equal(6); // 2 * 3
        expect(nodeEl.object3D.position.z).to.equal(6); // 3 * 2 (spread.x is used for z)
    });

    it('should adjust spread of multiple nodes', async function() {
        const csvData = 'Uuid,Title,PositionX,PositionY,PositionZ,Color,Size,Shape,Collapsed\n' +
            'nodeErste,Node Erste,6,0.1,8,ff0000,5,Ball,No\n' +
            'nodeZwitte,Node Zwitte,-2, -0.2, -4,ff0000,5,Ball,No\n';
        const blob = new Blob([csvData], { type: 'text/csv' });
        blobUrl = URL.createObjectURL(blob);

        const component = el.components['selectable-node-graph'];
        component.urlInput.value = blobUrl;
        component.openUrl();

        await waitForEvent(el, 'graph-loaded');

        // with multiple nodes, spread should ensure they fit
        const attr = el.getAttribute('selectable-node-graph');
        const expectedSpread = {x: 5/(8-(-4)+0.05), y: 0.5/(0.1-(-0.2)+0.05)}; // z width is bigger
        // TODO: why must the delta be so small?
        expect(attr.spreadHoriz).to.be.closeTo(expectedSpread.x, 0.001);
        expect(attr.spreadVert).to.be.closeTo(expectedSpread.y, 0.000001);

        expect(el.children.length).to.equal(2);
        const nodeErsteEl = el.children[0];
        expect(nodeErsteEl.getAttribute('id')).to.equal('nodeErste');
        expect(nodeErsteEl.object3D.position.x).to.equal(6 * attr.spreadHoriz);
        expect(nodeErsteEl.object3D.position.y).to.equal(0.1 * attr.spreadVert);
        expect(nodeErsteEl.object3D.position.z).to.equal(8 * attr.spreadHoriz);
        const nodeZwitteEl = el.children[1];
        expect(nodeZwitteEl.getAttribute('id')).to.equal('nodeZwitte');
        expect(nodeZwitteEl.object3D.position.x).to.equal(-2 * attr.spreadHoriz);
        expect(nodeZwitteEl.object3D.position.y).to.equal(-0.2 * attr.spreadVert);
        expect(nodeZwitteEl.object3D.position.z).to.equal(-4 * attr.spreadHoriz);

        // graph should be centered on the centerpoint of the nodes
        expect(el.object3D.position.x).to.be.closeTo((6+(-2))/2 * -attr.spreadHoriz, 0.002);
        expect(el.object3D.position.y).to.equal((0.1+(-0.2))/2 * -attr.spreadVert + 1.25);
        expect(el.object3D.position.z).to.be.closeTo((8+(-4))/2 * -attr.spreadHoriz, 0.002);
    });

    it('should handle file input change', async function() {
        // monkey patches scene to prevent warning about Multisynq API
        const scene = document.querySelector('a-scene');
        scene.croquetSession = {data: { store: () => {} } };

        const component = el.components['selectable-node-graph'];
        const fileInpt = component.fileInpt;

        const csvData = 'Uuid,Title,PositionX,PositionY,PositionZ,Color,Size,Shape,Collapsed\n' +
                        'fileNode,File Node,4,5,6,00ff00,5,Ball,No';
        const file = new File([csvData], "test.csv", { type: "text/csv" });

        // Manually trigger fileInptChange with a mocked event or by setting files
        // Note: setting files on input is tricky in JS, but we can call the handler

        // Mock fileInpt.files
        Object.defineProperty(fileInpt, 'files', {
            value: [file],
            writable: false
        });

        await component.fileInptChange();

        await waitForEvent(el, 'graph-loaded');

        expect(el.children.length).to.be.at.least(1);
        const nodeEl = Array.from(el.children).find(child => child.getAttribute('id') === 'fileNode');
        expect(nodeEl).to.exist;
        expect(nodeEl.object3D.position.x).to.equal(4);
    });

    it('should hide children when an expanded node is clicked', async function() {
        const csvData = 'Uuid,Title,PositionX,PositionY,PositionZ,Color,Size,Shape,Collapsed,FromUuid,ToUuid\n' +
            'parentA,Parent Node A,0,0,0,ff0000,5,Ball,No,,\n' +
            'parentB,Parent Node B,0,0,0,ff0000,5,Box,No,,\n' +
            'child1,Child 1,1,1,1,00ff00,5,Ball,No,,\n' +
            'child2,Child 2,-1,-1,-1,0000ff,5,Ball,No,,\n' +
            ',Edge A1,NaN,NaN,NaN,808080,5,Ball,No,parentA,child1\n' +
            ',Edge A2,NaN,NaN,NaN,808080,5,Ball,No,parentA,child2\n' +
            ',Edge B1,NaN,NaN,NaN,808080,5,Ball,No,parentB,child1\n';
        const blob = new Blob([csvData], { type: 'text/csv' });
        blobUrl = URL.createObjectURL(blob);

        const component = el.components['selectable-node-graph'];
        component.urlInput.value = blobUrl;
        component.openUrl();

        await waitForEvent(el, 'graph-loaded');

        const parentAEl = Array.from(el.children).find(c => c.id === 'parentA');
        const parentBEl = Array.from(el.children).find(c => c.id === 'parentB');
        const child1El = Array.from(el.children).find(c => c.id === 'child1');
        const child2El = Array.from(el.children).find(c => c.id === 'child2');
        const edgeA1El = Array.from(el.children).find(c => c.components['graph-edge']?.data.fromId === 'parentA' && c.components['graph-edge']?.data.toId === 'child1');
        const edgeA2El = Array.from(el.children).find(c => c.components['graph-edge']?.data.toId === 'child2');
        const edgeB1El = Array.from(el.children).find(c => c.components['graph-edge']?.data.fromId === 'parentB' && c.components['graph-edge']?.data.toId === 'child1');

        expect(parentAEl).to.exist;
        expect(parentBEl).to.exist;
        expect(child1El).to.exist;
        expect(child2El).to.exist;
        expect(edgeA1El).to.exist;
        expect(edgeA2El).to.exist;
        expect(edgeB1El).to.exist;

        // Ensures children & edges are visible for testing
        child1El.setAttribute('visible', true);
        child2El.setAttribute('visible', true);
        edgeA1El.setAttribute('visible', true);
        edgeA2El.setAttribute('visible', false);
        edgeB1El.setAttribute('visible', true);

        // Trigger click on parentA
        parentAEl.emit('click', { target: parentAEl });

        await waitForEvent(el, 'graph-updated');
        await waitForEvent(el, 'graph-updated');

        // Verify children and edges are now visible
        expect(child1El.getAttribute('visible')).to.be.true;   // has visible un-clicked parentB
        expect(child2El.getAttribute('visible')).to.be.false;
        expect(edgeA1El.getAttribute('visible')).to.be.true;   // child1 is visible
        expect(edgeA2El.getAttribute('visible')).to.be.false;
        expect(edgeB1El.getAttribute('visible')).to.be.true;   // from visible un-clicked parent
    });

    it('should make all children visible when a collapsed node is clicked', async function() {
        const csvData = 'Uuid,Title,PositionX,PositionY,PositionZ,Color,Size,Shape,Collapsed,FromUuid,ToUuid\n' +
            'parentA,Parent Node A,0,0,0,ff0000,5,Ball,Yes,,\n' +
            'parentB,Parent Node B,0,0,0,ff0000,5,Diamond,No,,\n' +
            'child1,Child 1,1,1,1,00ff00,5,Ball,No,,\n' +
            'child2,Child 2,-1,-1,-1,0000ff,5,Ball,No,,\n' +
            'eA1,Edge A1,NaN,NaN,NaN,808080,5,Ball,No,parentA,child1\n' +
            'eA2,Edge A2,NaN,NaN,NaN,808080,5,Ball,No,parentA,child2\n' +
            'eB1,Edge B2,NaN,NaN,NaN,808080,5,Ball,No,parentB,child1';
        const blob = new Blob([csvData], { type: 'text/csv' });
        blobUrl = URL.createObjectURL(blob);

        const component = el.components['selectable-node-graph'];
        component.urlInput.value = blobUrl;
        component.openUrl();

        await waitForEvent(el, 'graph-loaded');

        const parentAEl = Array.from(el.children).find(c => c.id === 'parentA');
        const child1El = Array.from(el.children).find(c => c.id === 'child1');
        const child2El = Array.from(el.children).find(c => c.id === 'child2');
        const edgeA1El = Array.from(el.children).find(c => c.id === 'eA1');
        const edgeA2El = Array.from(el.children).find(c => c.id === 'eA2');
        const edgeB1El = Array.from(el.children).find(c => c.id === 'eB1');

        expect(parentAEl).to.exist;
        expect(child1El).to.exist;
        expect(child2El).to.exist;
        expect(edgeA1El).to.exist;
        expect(edgeA2El).to.exist;
        expect(edgeB1El).to.exist;

        expect(child1El.getAttribute('visible')).to.be.true;   // un-collapsed parentB
        expect(edgeA1El.getAttribute('visible')).to.be.true;
        expect(edgeB1El.getAttribute('visible')).to.be.true;
        expect(child2El.getAttribute('visible')).to.be.false;   // sole parent is collapsed
        expect(edgeA2El.getAttribute('visible')).to.be.false;

        // Trigger click on parentA
        parentAEl.emit('click', { target: parentAEl });

        await waitForEvent(el, 'graph-updated');   // parentA
        await waitForEvent(el, 'graph-updated');   // child1
        await waitForEvent(el, 'graph-updated');   // child2

        // Verify children and edges are now visible
        expect(child1El.getAttribute('visible')).to.be.true;
        expect(edgeA1El.getAttribute('visible')).to.be.true;
        expect(edgeB1El.getAttribute('visible')).to.be.true;
        expect(child2El.getAttribute('visible')).to.be.true;
        expect(edgeA2El.getAttribute('visible')).to.be.true;
    });
});

async function waitForEvent(el, eventName) {
    await new Promise(resolve => {
        const handler = () => {
            el.removeEventListener(eventName, handler);
            resolve();
        };
        el.addEventListener(eventName, handler);
    });
}
