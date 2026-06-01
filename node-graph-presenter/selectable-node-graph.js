// selectable-node-graph.js — a component and primitive with UI to load a node graph from a Noda .CSV or SPDX .JSON URL or file
// Copyright © 2026 by Doug Reeder under the MIT License

const SPREADING_FACTOR = 1.1;
const FILE_INPT_ID = 'fileInput';
// maximum size of base64-encoded data url w/ 13 required chars + MIME type
const BASE64_CROQUET_MAX = 16384/4*3 - 13 - 255;
const SPINNER_ID = 'spinner';
const SPINNER_URL = `data:application/octet-stream;base64,Z2xURgIAAACAEwAAZAgAAEpTT057ImFzc2V0Ijp7ImdlbmVyYXRvciI6Iktocm9ub3MgZ2xURiBCbGVuZGVyIEkvTyB2NC4yLjYwIiwidmVyc2lvbiI6IjIuMCJ9LCJzY2VuZSI6MCwic2NlbmVzIjpbeyJuYW1lIjoiU2NlbmUiLCJub2RlcyI6WzBdfV0sIm5vZGVzIjpbeyJtZXNoIjowLCJuYW1lIjoiQ3ViZSIsInJvdGF0aW9uIjpbMC4zNjU1NDU0NTE2NDEwODI3NiwtMC4xNzU4MTkyOTI2NjQ1Mjc5LC0wLjM0MTE0MDAzMTgxNDU3NTIsMC44NDc5OTAzMzQwMzM5NjYxXX1dLCJhbmltYXRpb25zIjpbeyJjaGFubmVscyI6W3sic2FtcGxlciI6MCwidGFyZ2V0Ijp7Im5vZGUiOjAsInBhdGgiOiJ0cmFuc2xhdGlvbiJ9fSx7InNhbXBsZXIiOjEsInRhcmdldCI6eyJub2RlIjowLCJwYXRoIjoicm90YXRpb24ifX0seyJzYW1wbGVyIjoyLCJ0YXJnZXQiOnsibm9kZSI6MCwicGF0aCI6InNjYWxlIn19XSwibmFtZSI6IkN1YmVBY3Rpb24iLCJzYW1wbGVycyI6W3siaW5wdXQiOjQsImludGVycG9sYXRpb24iOiJTVEVQIiwib3V0cHV0Ijo1fSx7ImlucHV0Ijo2LCJpbnRlcnBvbGF0aW9uIjoiTElORUFSIiwib3V0cHV0Ijo3fSx7ImlucHV0Ijo0LCJpbnRlcnBvbGF0aW9uIjoiU1RFUCIsIm91dHB1dCI6OH1dfV0sIm1hdGVyaWFscyI6W3siZG91YmxlU2lkZWQiOnRydWUsIm5hbWUiOiJNYXRlcmlhbCIsInBick1ldGFsbGljUm91Z2huZXNzIjp7ImJhc2VDb2xvckZhY3RvciI6WzAuODAwMDAwMDExOTIwOTI5LDAuODAwMDAwMDExOTIwOTI5LDAuODAwMDAwMDExOTIwOTI5LDFdLCJtZXRhbGxpY0ZhY3RvciI6MCwicm91Z2huZXNzRmFjdG9yIjowLjV9fV0sIm1lc2hlcyI6W3sibmFtZSI6IkN1YmUiLCJwcmltaXRpdmVzIjpbeyJhdHRyaWJ1dGVzIjp7IlBPU0lUSU9OIjowLCJOT1JNQUwiOjEsIlRFWENPT1JEXzAiOjJ9LCJpbmRpY2VzIjozLCJtYXRlcmlhbCI6MH1dfV0sImFjY2Vzc29ycyI6W3siYnVmZmVyVmlldyI6MCwiY29tcG9uZW50VHlwZSI6NTEyNiwiY291bnQiOjI0LCJtYXgiOlsxLDEsMV0sIm1pbiI6Wy0xLC0xLC0xXSwidHlwZSI6IlZFQzMifSx7ImJ1ZmZlclZpZXciOjEsImNvbXBvbmVudFR5cGUiOjUxMjYsImNvdW50IjoyNCwidHlwZSI6IlZFQzMifSx7ImJ1ZmZlclZpZXciOjIsImNvbXBvbmVudFR5cGUiOjUxMjYsImNvdW50IjoyNCwidHlwZSI6IlZFQzIifSx7ImJ1ZmZlclZpZXciOjMsImNvbXBvbmVudFR5cGUiOjUxMjMsImNvdW50IjozNiwidHlwZSI6IlNDQUxBUiJ9LHsiYnVmZmVyVmlldyI6NCwiY29tcG9uZW50VHlwZSI6NTEyNiwiY291bnQiOjIsIm1heCI6WzRdLCJtaW4iOlswLjA0MTY2NjY2NjY2NjY2NjY2NF0sInR5cGUiOiJTQ0FMQVIifSx7ImJ1ZmZlclZpZXciOjUsImNvbXBvbmVudFR5cGUiOjUxMjYsImNvdW50IjoyLCJ0eXBlIjoiVkVDMyJ9LHsiYnVmZmVyVmlldyI6NiwiY29tcG9uZW50VHlwZSI6NTEyNiwiY291bnQiOjk2LCJtYXgiOls0XSwibWluIjpbMC4wNDE2NjY2NjY2NjY2NjY2NjRdLCJ0eXBlIjoiU0NBTEFSIn0seyJidWZmZXJWaWV3Ijo3LCJjb21wb25lbnRUeXBlIjo1MTI2LCJjb3VudCI6OTYsInR5cGUiOiJWRUM0In0seyJidWZmZXJWaWV3Ijo4LCJjb21wb25lbnRUeXBlIjo1MTI2LCJjb3VudCI6MiwidHlwZSI6IlZFQzMifV0sImJ1ZmZlclZpZXdzIjpbeyJidWZmZXIiOjAsImJ5dGVMZW5ndGgiOjI4OCwiYnl0ZU9mZnNldCI6MCwidGFyZ2V0IjozNDk2Mn0seyJidWZmZXIiOjAsImJ5dGVMZW5ndGgiOjI4OCwiYnl0ZU9mZnNldCI6Mjg4LCJ0YXJnZXQiOjM0OTYyfSx7ImJ1ZmZlciI6MCwiYnl0ZUxlbmd0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`;
const STATE_SPINNING = 'spinning';

AFRAME.registerComponent('selectable-node-graph', {
	dependencies: [],

	schema: {
		src: {type: 'asset'},
		minInitialWidth: {default: 0.5},   // if more than one node
		minInitialHeight: {default: 0.5},   // if more than one node
		maxInitialWidth: {default: 5},
		maxInitialHeight: {default: 2},
		frameCenter: {type: 'vec3', default: {x: 0, y: 1.25, z: 0}},
		spreadHoriz: {type: 'number', default: 1},
		spreadVert: {type: 'number', default: 1},
		flavorCsv: {default: 'NODA'},
		log: {default: false},
	},

	/** Called once when component is attached. Generally for initial setup. */
	init: function () {
		this.handlers = {};
		this.handlers.openUrl = this.openUrl.bind(this);
		this.handlers.openGraphFile = this.openGraphFile.bind(this);
		this.handlers.fileInptChange = this.fileInptChange.bind(this);
		this.handlers.preventDefault = evt => { evt.preventDefault(); evt.stopPropagation(); };
		this.handlers.drop = this.drop.bind(this);
		this.handlers.spinnerStateAdded = this.spinnerStateAdded.bind(this);
		this.handlers.spinnerStateRemoved = this.spinnerStateRemoved.bind(this);
		this.handlers.horizontalLarger = this.incrementSpread.bind(this, SPREADING_FACTOR, 1);
		this.handlers.horizontalSmaller = this.incrementSpread.bind(this, 1/SPREADING_FACTOR, 1);
		this.handlers.verticalLarger = this.incrementSpread.bind(this, 1, SPREADING_FACTOR);
		this.handlers.verticalSmaller = this.incrementSpread.bind(this, 1, 1/SPREADING_FACTOR);

		const controlStrip = document.createElement('div');
		controlStrip.style.width = 'calc(100% - 1em - 65px)';
		controlStrip.style.position = 'absolute';
		controlStrip.style.left = '1em';
		controlStrip.style.bottom = '1em';
		controlStrip.style.display = 'flex';
		controlStrip.style.flexWrap = 'wrap';
		controlStrip.style.justifyContent = 'flex-start';
		controlStrip.style.alignItems = 'stretch';
		controlStrip.style.gap = '0.5em';
		controlStrip.style.rowGap = '1em';
		document.body.appendChild(controlStrip);
		this.controlStrip = controlStrip;

		const openFileBtn = document.createElement('button');
		openFileBtn.style.minHeight = '40px';
		openFileBtn.style.marginRight = '2em';
		openFileBtn.style.zIndex = '10';
		openFileBtn.innerText = "Select Noda .csv or SPDX .json file";
		controlStrip.appendChild(openFileBtn);
		openFileBtn.addEventListener('click', this.handlers.openGraphFile);

		const fileInpt = document.createElement('input');
		fileInpt.setAttribute('id', FILE_INPT_ID);
		fileInpt.setAttribute('type', 'file');
		fileInpt.setAttribute('accept', 'text/csv,.csv,application/json,.json');
		document.body.appendChild(fileInpt);
		fileInpt.addEventListener("change", this.handlers.fileInptChange);
		this.fileInpt = fileInpt;

		const urlControls = document.createElement('div');
		urlControls.style.display = 'flex';
		urlControls.style.gap = '0.5em';
		controlStrip.appendChild(urlControls);

		const urlInput = document.createElement('input');
		urlInput.setAttribute('id', 'urlInput');
		urlInput.setAttribute('type', 'url');
		urlInput.setAttribute('placeholder', "Paste a URL to a Noda .csv or SPDX .json");
		urlInput.style.height = '40px';
		urlInput.style.width = '20em';
		urlInput.style.paddingLeft = '1em';
		urlInput.style.zIndex = '10';
		urlControls.appendChild(urlInput);
		urlInput.addEventListener('change', this.handlers.openUrl);
		this.urlInput = urlInput;

		const openUrlBtn = document.createElement('button');
		openUrlBtn.style.minHeight = '40px';
		openUrlBtn.style.zIndex = '10';
		openUrlBtn.innerText = "Fetch Noda .csv or SPDX .json from URL";
		urlControls.appendChild(openUrlBtn);
		openUrlBtn.addEventListener('click', this.handlers.openUrl);

		document.addEventListener('paste', this.handlers.drop, { capture: true });
		this.el.sceneEl.addEventListener('dragover', this.handlers.preventDefault);   // prevents default to allow drop
		this.el.sceneEl.addEventListener('drop', this.handlers.drop);

		const spinner = document.createElement('a-gltf-model');
		spinner.setAttribute('id', SPINNER_ID);
		spinner.setAttribute('src', SPINNER_URL);
		spinner.setAttribute('animation-mixer', 'timeScale: 1');
		spinner.setAttribute('scale', {x: 0.25, y: 0.25, z: 0.25});
		spinner.setAttribute('position', {x: 0, y: 2.5, z: 0});
		spinner.setAttribute('animation__beginspin',
			{startEvents: 'beginspin', property: 'scale', from: '0.05 0.05 0.05', to: '0.25 0.25 0.25', dur: 125});
		spinner.setAttribute('animation__endspin',
			{startEvents: 'endspin', property: 'scale', to: '0.05 0.05 0.05', dur: 125});
		spinner.setAttribute('animation__endspinhide',
			{startEvents: 'animationcomplete__endspin', property: 'visible', to: false, dur: 0});
		this.el.sceneEl.appendChild(spinner);

		spinner.addEventListener('stateadded', this.handlers.spinnerStateAdded);
		spinner.addEventListener('stateremoved', this.handlers.spinnerStateRemoved);

		spinner?.addState(STATE_SPINNING);   // marks where node graph will be placed

		this.el.addEventListener('horizontal-larger', this.handlers.horizontalLarger);
		this.el.addEventListener('horizontal-smaller', this.handlers.horizontalSmaller);
		this.el.addEventListener('vertical-larger', this.handlers.verticalLarger);
		this.el.addEventListener('vertical-smaller', this.handlers.verticalSmaller);
	},

	openUrl: function (evt) {
		const value = this.urlInput?.value?.trim();
		console.debug(`openUrl`, evt, `“${value}”`);
		const url = URL.parse(value);
		if (['https:', 'http:', 'ftp:', 'ftps:', 'sftp:', 'file:', 'data:', 'blob:'].includes(url?.protocol)) {
			this.el.setAttribute('selectable-node-graph', 'src', value);
		} else if (value?.length > 0) {
			this.urlInput.value = '';
			console.warn(`“${value}” is not a URL`);
			this.showTransientMsg(`“${value}” is not a URL`);
		}
	},

	openGraphFile: function (evt) {
		console.log(`openGraphFile`, evt.detail);
		this.fileInpt.click();
		this.clearPersistentMsg();
	},

	fileInptChange: async function (_evt) {
		console.log(`fileInptChange`, Array.from(this.fileInpt.files).map(file => `${file.name} ${file.size}`).join(', '));
		try {
			if (0 === this.fileInpt.files.length) { return; }

			let spinner = document.getElementById(SPINNER_ID);
			spinner?.addState(STATE_SPINNING);

			await this.graphFileToUrl(this.fileInpt.files[0]);
		} catch (err) {
			console.error(`fileInptChange:`, err);
			this.showPersistentMsg(err);
		}
	},

	drop: async function (evt) {
		try {
			const files = evt.clipboardData?.files ?? evt.dataTransfer?.files ?? [];
			console.debug(`selectable-node-graph ${evt.type}:`, evt.target, files);

			let i = 0;
			do {
				if (['text/csv', 'application/json', ''].includes(files[i]?.type)) {
					evt.stopPropagation();
					evt.preventDefault();
					const spinner = document.getElementById(SPINNER_ID);
					spinner?.addState(STATE_SPINNING);

					await this.graphFileToUrl(files[i]);
					return;
				} else {
					++i;
				}
			} while (i < files.length);
			// TODO: if text or URL is pasted, use that
			if ('drop' === evt.type || 'INPUT' !== evt.target.tagName) {
				evt.stopPropagation();
				evt.preventDefault();
				console.info(`Only a Noda .csv or SPDX .json file can be ${'paste' === evt.type ? "pasted" : "dropped"} here`);
				this.showTransientMsg(`Only a Noda .csv or SPDX .json file can be ${'paste' === evt.type ? "pasted" : "dropped"} here`);
			}
		} catch (err) {
			console.error(`drop:`, err);
			this.showPersistentMsg(err);
		}
	},

	graphFileToUrl: async function (file) {
		const dataIF = this.el.sceneEl.croquetSession?.data;
		let graphUrl;
		if (typeof dataIF?.store === 'function' && file.size > BASE64_CROQUET_MAX) {
			try {
				const buffer = await file.arrayBuffer();
				const handle = await dataIF.store(buffer, {});
				const croquetId = dataIF.toId(handle);
				graphUrl = `croquet:` + file.type + ',' + croquetId;
			} catch (err) {
				console.error(`graphFileToUrl:`, err);
				this.showPersistentMsg(err);
			}
		} else if (typeof dataIF?.store !== 'function') {
			console.warn(`graphFileToUrl typeof dataIF?.store:`, typeof dataIF?.store, file.size);
			this.showPersistentMsg(`The Multisynq API for syncing files has changed`);
		}
		if (!graphUrl) {
			graphUrl = await fileToDataUrl(file);
			if (graphUrl.length > 16384) {
				console.warn(`${file.name} csvUrl.length ${graphUrl.length} > 16384`);
				this.showPersistentMsg(`“${file.name}” is too big to sync to other users; upload it somewhere and paste the URL below`);
				graphUrl = URL.createObjectURL(file);
				console.debug(`created object URL:`, graphUrl);
			}
		}
		this.el.setAttribute('selectable-node-graph', 'src', graphUrl);
		this.urlInput.value = '';   // we're definitely loading a file

		function fileToDataUrl(file) {
			return new Promise((resolve, reject) => {
				const reader = new FileReader();
				reader.onload = function (evt) {
					const dataUrl = evt.target.result;
					resolve(dataUrl);
				};
				reader.onerror = evt => {
					console.error("fileToDataUrl:", reader.error);
					reject(evt.target.error);
				}
				reader.readAsDataURL(file);
			});
		}
	},

	/** Called when properties are changed, incl. right after init
	 * A-Frame **WILL NOT WAIT FOR THE RETURNED PROMISE**,
	 * so any code after an await may be out-of-date.
	 */
	update: async function (oldData = {}) {
		let graphUrl = this.data.src;
		const spinner = document.getElementById(SPINNER_ID);

		try {
			console.debug(`selectable-node-graph update:`, this.data, oldData);
			this.fileInpt.value = '';

			if (this.data.spreadHoriz > 0 && this.data.spreadHoriz < Infinity &&
					this.data.spreadVert > 0 && this.data.spreadVert < Infinity &&
					(this.data.spreadHoriz !== oldData.spreadHoriz || this.data.spreadVert !== oldData.spreadVert)) {
				for (const child of Array.from(this.el.children)) {
					const childNodeAttr = child.getAttribute('graph-node');
					if (childNodeAttr) {
						child.object3D.position.x = childNodeAttr.naturalPosition.x * this.data.spreadHoriz;
						child.object3D.position.z = childNodeAttr.naturalPosition.z * this.data.spreadHoriz;
						child.object3D.position.y = childNodeAttr.naturalPosition.y * this.data.spreadVert;
						continue;
					}
					const childEdgeAttr = child.getAttribute('graph-edge');
					if (childEdgeAttr) {
						const fromNode = document.getElementById(childEdgeAttr.fromId);
						if (fromNode) {
							child.setAttribute('graph-edge', 'start', fromNode.object3D.position);
						}
						const toNode = document.getElementById(childEdgeAttr.toId);
						if (toNode) {
							child.setAttribute('graph-edge', 'end', toNode.object3D.position);
						}
						continue;
					}
				}
			}

			if (!this.data.src && !oldData.src || this.data.src === oldData.src) { return; }
			// deal with weirdness from A-Frame Croquet Component
			if (/data:/.test(this.data.src) && this.data.src?.indexOf(',') === -1) {
				console.warn(`ignoring bad data URL:`, this.data.src);
				return;
			}

			const loadToken = this.currentLoadToken = Symbol(graphUrl);
			spinner?.addState(STATE_SPINNING);

			if (oldData.src?.startsWith?.('blob:')) {
				URL.revokeObjectURL(oldData.src);
				console.debug(`revoked object URL:`, oldData.src);
			}

			const croquetMatch = /^croquet:([^,]+),(.+)$/.exec(graphUrl);
			if (croquetMatch) {
				const dataIF = this.el.sceneEl.croquetSession?.data;
				const handle = dataIF.fromId(croquetMatch[2]);
				const byteArray = await dataIF.fetch(handle);
				if (this.currentLoadToken !== loadToken) {
					console.warn(`abandoned slow load of ${graphUrl}`);
					return;
				}
				const blob = new Blob([byteArray], {type: croquetMatch[1]});
				graphUrl = URL.createObjectURL(blob);
			}

			console.log(`selectable-node-graph update graph src: "${graphUrl}"`);
			this.clearPersistentMsg();

			let contentType;
			const url = URL.parse(graphUrl);
			switch (url?.protocol) {
				case 'https:':
				case 'http:':
					const headResponse = await fetch(graphUrl, {method: 'HEAD'});
					contentType = headResponse.headers.get('content-type');
					if (headResponse.ok && !contentType || [401, 403, 405, 407, 408].includes(headResponse.status)) {
						const getResponse = await fetch(graphUrl, {method: 'GET'});
						contentType = getResponse.headers.get('content-type');
						if (! getResponse.ok) {
							throw new Error(`Unable to read URL: ${getResponse.statusText || getResponse.status}`);
						}
					} else if (! headResponse.ok) {
						throw new Error(`Unable to read URL metadata: ${headResponse.statusText || headResponse.status}`);
					}
					break;
				case 'data:':
					const match = /^data:([^;,]*)[;,]/.exec(graphUrl);
					contentType = match?.[1] || 'text/plain';
					break;
				case 'blob:':
					const blobResponse = await fetch(graphUrl);
					if (!blobResponse.ok) {
						throw new Error(`Unable to read blob URL: HTTP ${blobResponse.status}`);
					}
					const blob = await blobResponse.blob();
					contentType =  blob.type; // Returns the content-type string
					break;
				default:
					throw new Error(`Unsupported URL protocol: ${url?.protocol}`);
			}
			if (this.currentLoadToken !== loadToken) {
				console.warn(`abandoned slow type check for ${graphUrl}`);
				return;
			}

			let errors = [], warnings = [], info = [];
			if (contentType?.startsWith?.('text/csv')) {
				({errors, warnings, info} = await csvToNodes(graphUrl, this.data.flavorCsv, this.el));
			} else if (contentType?.startsWith?.('application/json')) {
				({errors, warnings, info} = await jsonToNodes(graphUrl, this.el));
			} else {
				throw new Error(`Unsupported content type: ${contentType || 'unknown'}`);
			}
			if (this.currentLoadToken !== loadToken) {
				console.warn(`abandoned slow load of ${graphUrl}`);
				return;
			}

			console.log(`selectable-node-graph new elements:`, this.el.children);
			if (errors?.length > 0 || warnings?.length > 0 || info?.length > 0) {
				this.showTransientMsg([...errors, ...warnings, ...info].join('\n'));
			}

			setTimeout(() => {
				try {
					if (this.currentLoadToken !== loadToken) {
						console.warn(`abandoned slow load of ${graphUrl}`);
						return;
					}
					this.adjustSpread();
					this.el.emit('graph-loaded');
				} catch (err) {
					console.error(`selectable-node-graph update spread:`, err);
					this.showTransientMsg("spread not adjusted");
				}
			}, 0);
		} catch (err) {
			console.error(`selectable-node-graph update error:`, err);
			this.showPersistentMsg(err);
		} finally {
			// presumes URL content has been completely read
			URL.revokeObjectURL(graphUrl); // ok if not ObjectURL
			spinner?.removeState(STATE_SPINNING);
		}
	},

	adjustSpread: function () {
		const data = this.data;
		const graphObj = this.el.object3D;
		graphObj.position.x = graphObj.position.y = graphObj.position.z = 0;
		const boundingBox = new THREE.Box3();
		boundingBox.setFromObject(graphObj);
		const bbSize = new THREE.Vector3();
		boundingBox.getSize(bbSize);

		let spreadHoriz = 1, spreadVert = 1;
		if (this.el.children.length > 1) {
			const horizontalSize = Math.max(bbSize.x, bbSize.z);
			if (horizontalSize < data.minInitialWidth) {
				spreadHoriz = Math.min(data.minInitialWidth / horizontalSize, 1_000_000);
			} else if (horizontalSize > data.maxInitialWidth) {
				spreadHoriz = Math.max(data.maxInitialWidth / horizontalSize, 0.000001);
			}
			if (bbSize.y < data.minInitialHeight) {
				spreadVert = Math.min(data.minInitialHeight / bbSize.y, 1_000_000);
			} else if (bbSize.y > data.maxInitialHeight) {
				spreadVert = Math.max(data.maxInitialHeight / bbSize.y, 0.000001);
			}
		}
		console.log(`adjustSpread spread:`, spreadHoriz, spreadVert, bbSize, boundingBox);

		const offset = new THREE.Vector3();
		boundingBox.getCenter(offset);
		offset.x *= -spreadHoriz;
		offset.z *= -spreadHoriz;
		offset.y *= -spreadVert;
		offset.add(data.frameCenter);

		this.el.setAttribute('selectable-node-graph', {spreadHoriz, spreadVert});
		if (! offset.equals(graphObj.position)) {
			this.el.setAttribute('position', offset);
		}

		if (this.boxHelper) {
			this.el.sceneEl.object3D?.remove?.(this.boxHelper);
		}
		if (data.log) {
			boundingBox.setFromObject(graphObj);
			if (!boundingBox.isEmpty()) {
				this.boxHelper = new THREE.Box3Helper( boundingBox, 0xffff00 );
				this.el.sceneEl.object3D?.add?.(this.boxHelper);
			}
		}
	},

	spinnerStateAdded: function(evt) {
		if (STATE_SPINNING === evt.detail) {
			const spinner = document.getElementById(SPINNER_ID);
			spinner?.setAttribute('visible', 'true');
			spinner?.emit('beginspin');
		}
	},

	spinnerStateRemoved: function (evt) {
		if (STATE_SPINNING === evt.detail) {
			const spinner = document.getElementById(SPINNER_ID);
			spinner?.emit('endspin');
		}
	},

	incrementSpread: function (horizontal, vertical, _evt) {
		const spreadHoriz = this.data.spreadHoriz * horizontal;
		const spreadVert = this.data.spreadVert * vertical;

		const position = this.el.object3D.position;
		const offset = new THREE.Vector3();
		offset.copy(position).sub(this.data.frameCenter);
		offset.x *= horizontal;
		offset.z *= horizontal;
		offset.y *= vertical;
		offset.add(this.data.frameCenter);

		this.el.setAttribute('selectable-node-graph', {spreadHoriz, spreadVert});
		if (! offset.equals(position)) {
			this.el.setAttribute('position', offset);
		}
	},

	pause: function () {
	},

	play: function () {
	},

	/** Called when a component is removed (e.g., via removeAttribute). */
	remove: function () {
		this.controlStrip?.remove();
		this.fileInpt?.remove();
		this.urlInput?.remove();
		this.transientDialog?.remove();
		this.persistentDialog?.remove();

		document.removeEventListener('paste', this.handlers.drop, { capture: true });
		this.el.sceneEl.removeEventListener('dragover', this.handlers.preventDefault);
		this.el.sceneEl.removeEventListener('drop', this.handlers.drop);

		this.el.removeEventListener('horizontal-larger', this.handlers.horizontalLarger);
		this.el.removeEventListener('horizontal-smaller', this.handlers.horizontalSmaller);
		this.el.removeEventListener('vertical-larger', this.handlers.verticalLarger);
		this.el.removeEventListener('vertical-smaller', this.handlers.verticalSmaller);

		const spinner = document.getElementById(SPINNER_ID);
		if (spinner) {
			spinner.removeEventListener('stateadded', this.handlers.spinnerStateAdded);
			spinner.removeEventListener('stateremoved', this.handlers.spinnerStateRemoved);
			spinner.remove();
		}
	},

	showTransientMsg: function (msg) {
		if (msg instanceof Error) {
			msg = msg.message || msg.name || msg?.toString();
		}

		setTimeout( () => {
			if (!this.transientDialog) {
				this.transientDialog = document.createElement('dialog');
				this.transientDialog.style.top = '1em';
				this.transientDialog.style.right = '1em';
				this.transientDialog.style.marginRight = '0';
				this.transientDialog.style.left = '1em';
				this.transientDialog.style.zIndex = '30';
				document.body.appendChild(this.transientDialog);
				const div = document.createElement('div');
				this.transientDialog.appendChild(div);
			}
			const msgElmt = this.transientDialog.firstElementChild ?? this.transientDialog;
			msgElmt.innerText = msg;
			this.transientDialog.show();

			setTimeout(this.transientDialog.close.bind(this.transientDialog),7000);
		}, 100);
	},

	showPersistentMsg: function (msg) {
		if (msg instanceof Error) {
			msg = msg.message || msg.name || msg?.toString();
		}

		setTimeout( () => {
			if (!this.persistentDialog) {
				this.persistentDialog = document.createElement('dialog');
				this.persistentDialog.style.top = '1em';
				this.persistentDialog.style.right = '1em';
				this.persistentDialog.style.marginRight = '0';
				this.persistentDialog.style.left = '1em';
				this.persistentDialog.style.zIndex = '20';
				document.body.appendChild(this.persistentDialog);
				const div = document.createElement('div');
				this.persistentDialog.appendChild(div);
				const form = document.createElement('form');
				form.setAttribute('method', 'dialog');
				this.persistentDialog.appendChild(form);
				const button = document.createElement('button');
				button.innerText = 'OK';
				button.autofocus = true;
				button.style.marginBlockStart = '1em';
				form.appendChild(button);
			}
			const msgElmt = this.persistentDialog.firstElementChild ?? this.persistentDialog;
			msgElmt.innerText = msg;
			this.persistentDialog.show();
		}, 100);
	},

	clearPersistentMsg: function () {
		this.persistentDialog?.close();
	}
});
