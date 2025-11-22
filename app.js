// Orgaversum - Todo Planeten Abenteuer

class Orgaversum {
    constructor() {
        this.canvas = document.getElementById('universe');
        this.ctx = this.canvas.getContext('2d');

        // Data
        this.suns = [];
        this.planets = [];
        this.moons = [];
        this.connections = [];
        this.nextId = 1;

        // Image cache for thumbnails
        this.imageCache = new Map();

        // Interaction state
        this.dragging = null;
        this.hovering = null;
        this.hoveringStation = null;
        this.selectedObject = null;
        this.selectedObjects = [];
        this.connectMode = false;
        this.connectFirst = null;
        this.mousePos = { x: 0, y: 0 };

        // Box selection state
        this.isBoxSelecting = false;
        this.boxStart = null;
        this.boxEnd = null;

        // Zoom and pan state
        this.scale = 1;
        this.offsetX = 0;
        this.offsetY = 0;
        this.isPanning = false;
        this.lastPanPos = { x: 0, y: 0 };
        this.galaxyView = false;

        // Station state
        this.currentStationType = null;
        this.currentStationFile = null;
        this.previewingStation = null;
        this.previewingMoon = null;

        // Add button state
        this.hoveringAddButton = null;

        // Animation
        this.time = 0;
        this.particles = [];

        // Rocket state
        this.selectedRocket = null;
        this.flyingRockets = [];
        this.rocketTarget = null;
        this.statusModalMoon = null;

        // Drag and drop state
        this.draggedFile = null;
        this.dropTarget = null;

        // Undo/Redo state
        this.history = [];
        this.currentHistoryIndex = -1;
        this.maxHistory = 50;
        this.isRestoringState = false;

        // Collapse/Expand state for list view
        this.collapsedItems = new Set();

        // Colors
        this.planetColors = [
            { main: '#6366f1', glow: 'rgba(99, 102, 241, 0.3)' },
            { main: '#8b5cf6', glow: 'rgba(139, 92, 246, 0.3)' },
            { main: '#ec4899', glow: 'rgba(236, 72, 153, 0.3)' },
            { main: '#f59e0b', glow: 'rgba(245, 158, 11, 0.3)' },
            { main: '#10b981', glow: 'rgba(16, 185, 129, 0.3)' },
            { main: '#06b6d4', glow: 'rgba(6, 182, 212, 0.3)' },
        ];

        this.moonColors = [
            { main: '#a78bfa', glow: 'rgba(167, 139, 250, 0.3)' },
            { main: '#f472b6', glow: 'rgba(244, 114, 182, 0.3)' },
            { main: '#34d399', glow: 'rgba(52, 211, 153, 0.3)' },
            { main: '#fbbf24', glow: 'rgba(251, 191, 36, 0.3)' },
            { main: '#60a5fa', glow: 'rgba(96, 165, 250, 0.3)' },
        ];

        this.init();
    }

    init() {
        this.resize();
        this.loadRocketImages();
        this.loadData();
        this.setupEventListeners();
        this.animate();
    }

    loadRocketImages() {
        // Preload rocket images
        const rocketImages = {
            'images/rocket-red.png': new Image(),
            'images/rocket-blue.png': new Image(),
            'images/rocket-green.png': new Image()
        };

        Object.keys(rocketImages).forEach(path => {
            rocketImages[path].src = path;
            this.imageCache.set(path, rocketImages[path]);
        });
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    setupEventListeners() {
        // Resize
        window.addEventListener('resize', () => this.resize());

        // Mouse events
        this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
        this.canvas.addEventListener('mouseup', () => this.onMouseUp());
        this.canvas.addEventListener('dblclick', (e) => this.onDoubleClick(e));
        this.canvas.addEventListener('contextmenu', (e) => this.onRightClick(e));
        this.canvas.addEventListener('wheel', (e) => this.onWheel(e));

        // Touch events
        this.canvas.addEventListener('touchstart', (e) => this.onTouchStart(e));
        this.canvas.addEventListener('touchmove', (e) => this.onTouchMove(e));
        this.canvas.addEventListener('touchend', () => this.onMouseUp());

        // Paste event for screenshots
        document.addEventListener('paste', (e) => this.onPaste(e));

        // Keyboard events
        document.addEventListener('keydown', (e) => this.onKeyDown(e));

        // Buttons
        document.getElementById('addSun').addEventListener('click', () => this.showModal('sun'));
        document.getElementById('addPlanet').addEventListener('click', () => this.showModal('planet'));
        document.getElementById('addMoon').addEventListener('click', () => this.showModal('moon'));
        document.getElementById('toggleConnect').addEventListener('click', () => this.toggleConnectMode());
        document.getElementById('undoBtn').addEventListener('click', () => this.undo());
        document.getElementById('redoBtn').addEventListener('click', () => this.redo());

        // Modal
        document.getElementById('modalCancel').addEventListener('click', () => this.hideModal());
        document.getElementById('modalConfirm').addEventListener('click', () => this.confirmModal());
        document.getElementById('nameInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.confirmModal();
        });

        // Edit Modal
        document.getElementById('editCancel').addEventListener('click', () => this.hideEditModal());
        document.getElementById('editConfirm').addEventListener('click', () => this.confirmEdit());
        document.getElementById('editDelete').addEventListener('click', () => this.deleteSelected());
        document.getElementById('editNameInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.confirmEdit();
        });

        // Station buttons
        document.querySelectorAll('.btn-station').forEach(btn => {
            btn.addEventListener('click', () => this.showStationModal(btn.dataset.type));
        });

        // Station Modal
        document.getElementById('stationCancel').addEventListener('click', () => this.hideStationModal());
        document.getElementById('stationConfirm').addEventListener('click', () => this.confirmStation());

        // File upload
        const fileInput = document.getElementById('fileInput');
        const uploadArea = document.getElementById('fileUploadArea');

        fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('dragover');
        });
        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('dragover');
        });
        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
            if (e.dataTransfer.files.length) {
                fileInput.files = e.dataTransfer.files;
                this.handleFileSelect({ target: fileInput });
            }
        });

        // Preview Modal
        document.getElementById('previewClose').addEventListener('click', () => this.hidePreviewModal());
        document.getElementById('previewDelete').addEventListener('click', () => this.deleteStation());

        // Retro Computer Toggle
        document.getElementById('toggleRetro').addEventListener('click', () => {
            document.getElementById('retroComputer').classList.toggle('minimized');
        });

        // Rocket selection
        document.querySelectorAll('.rocket-item').forEach(rocket => {
            rocket.addEventListener('click', () => this.selectRocket(rocket));
        });

        // Rocket Status Modal
        document.getElementById('statusTerraformed').addEventListener('click', () => this.setRocketStatus('terraformed'));
        document.getElementById('statusWaiting').addEventListener('click', () => this.setRocketStatus('waiting'));
        document.getElementById('statusRemove').addEventListener('click', () => this.setRocketStatus('remove'));
        document.getElementById('statusCancel').addEventListener('click', () => this.hideRocketStatusModal());

        // Multi-Edit Modal
        document.getElementById('multiApplyColor').addEventListener('click', () => this.applyMultiColor());
        document.getElementById('multiApplyDeadline').addEventListener('click', () => this.applyMultiDeadline());
        document.getElementById('multiDeleteAll').addEventListener('click', () => this.deleteMultiSelected());
        document.getElementById('multiEditCancel').addEventListener('click', () => this.hideMultiEditModal());

        // Canvas drag and drop for files
        this.canvas.addEventListener('dragover', (e) => {
            e.preventDefault();
            const pos = this.getMousePos(e);
            this.dropTarget = this.getMoonAt(pos.x, pos.y);
        });

        this.canvas.addEventListener('dragleave', () => {
            this.dropTarget = null;
        });

        this.canvas.addEventListener('drop', (e) => {
            e.preventDefault();
            this.handleCanvasDrop(e);
        });
    }

    // Mouse/Touch Handlers
    onMouseDown(e) {
        const rect = this.canvas.getBoundingClientRect();
        const screenX = e.clientX - rect.left;
        const screenY = e.clientY - rect.top;

        // Middle mouse button for panning
        if (e.button === 1) {
            e.preventDefault();
            this.isPanning = true;
            this.lastPanPos = { x: screenX, y: screenY };
            return;
        }

        // Only handle left click from here
        if (e.button !== 0) return;

        const pos = this.getMousePos(e);

        // Check if clicked with a selected rocket
        if (this.selectedRocket) {
            const obj = this.getObjectAt(pos.x, pos.y);
            if (obj) {
                this.flyRocketTo(obj);
                return;
            }
        }

        // Check if clicking on add button
        const addButtonClick = this.getAddButtonAt(pos.x, pos.y);
        if (addButtonClick) {
            this.handleAddButtonClick(addButtonClick.parent, addButtonClick.type);
            return;
        }

        // Check if clicking on object with orbiting rocket
        let obj = this.getObjectAt(pos.x, pos.y);
        if (obj) {
            const rocketIndex = this.flyingRockets.findIndex(r => r.orbiting && r.target.id === obj.id);
            if (rocketIndex !== -1) {
                // For moons, show status modal
                if (obj.type === 'moon') {
                    this.showRocketStatusModal(obj);
                    return;
                } else {
                    // For planets and suns, remove the rocket
                    this.createParticles(this.flyingRockets[rocketIndex].target.x, this.flyingRockets[rocketIndex].target.y, 15);
                    this.flyingRockets.splice(rocketIndex, 1);
                    return;
                }
            }
        }

        // Check for station click first
        const stationClick = this.getStationAt(pos.x, pos.y);
        if (stationClick) {
            this.showPreviewModal(stationClick.moon, stationClick.station);
            return;
        }

        // Reuse obj variable (already declared above)
        if (!obj) obj = this.getObjectAt(pos.x, pos.y);

        if (this.connectMode && obj) {
            this.handleConnect(obj);
        } else if (obj) {
            // Clicking on an object
            if (e.shiftKey) {
                // Shift+Click: toggle selection
                const index = this.selectedObjects.indexOf(obj);
                if (index > -1) {
                    this.selectedObjects.splice(index, 1);
                } else {
                    this.selectedObjects.push(obj);
                }
            } else {
                // Normal click: select only this object (unless already in multi-selection)
                if (!this.selectedObjects.includes(obj)) {
                    this.selectedObjects = [obj];
                }
            }

            // Start dragging selected objects
            this.dragging = obj;
            this.dragging.offsetX = pos.x - obj.x;
            this.dragging.offsetY = pos.y - obj.y;

            // Store initial positions for all selected objects
            this.selectedObjects.forEach(selectedObj => {
                selectedObj.dragStartX = selectedObj.x;
                selectedObj.dragStartY = selectedObj.y;
            });

            this.selectedObject = obj; // For backward compatibility
        } else {
            // Clicking on empty space
            if (e.shiftKey) {
                // Shift+Click on empty: start box selection
                this.isBoxSelecting = true;
                this.boxStart = { x: pos.x, y: pos.y };
                this.boxEnd = { x: pos.x, y: pos.y };
            } else {
                // Normal click on empty: pan and deselect
                this.isPanning = true;
                this.lastPanPos = { x: screenX, y: screenY };
                this.selectedObjects = [];
                this.selectedObject = null;
            }
        }
    }

    onMouseMove(e) {
        const rect = this.canvas.getBoundingClientRect();
        const screenX = e.clientX - rect.left;
        const screenY = e.clientY - rect.top;

        if (this.isPanning) {
            this.offsetX += screenX - this.lastPanPos.x;
            this.offsetY += screenY - this.lastPanPos.y;
            this.lastPanPos = { x: screenX, y: screenY };
            this.canvas.style.cursor = 'grabbing';
            return;
        }

        const pos = this.getMousePos(e);
        this.mousePos = pos;

        if (this.isBoxSelecting) {
            // Update box selection end point
            this.boxEnd = { x: pos.x, y: pos.y };
            this.canvas.style.cursor = 'crosshair';
            return;
        }

        if (this.dragging) {
            // Calculate the delta movement
            const deltaX = (pos.x - this.dragging.offsetX) - this.dragging.x;
            const deltaY = (pos.y - this.dragging.offsetY) - this.dragging.y;

            // Move all selected objects
            this.selectedObjects.forEach(obj => {
                const newX = obj.dragStartX + deltaX;
                const newY = obj.dragStartY + deltaY;

                // Check collision and adjust position if needed
                const adjustedPos = this.resolveCollision(obj, newX, newY);
                obj.x = adjustedPos.x;
                obj.y = adjustedPos.y;
            });

            this.saveData();
        } else {
            // Check for add button hover first
            const addButtonHover = this.getAddButtonAt(pos.x, pos.y);
            this.hoveringAddButton = addButtonHover;

            // Check for station hover
            const stationHover = this.getStationAt(pos.x, pos.y);
            this.hoveringStation = stationHover;

            this.hovering = this.getObjectAt(pos.x, pos.y);
            this.canvas.style.cursor = (this.hovering || this.hoveringStation || this.hoveringAddButton) ? 'pointer' : 'grab';
        }
    }

    onMouseUp() {
        if (this.isBoxSelecting) {
            // Finalize box selection
            this.selectObjectsInBox();
            this.isBoxSelecting = false;
            this.boxStart = null;
            this.boxEnd = null;
        }

        this.dragging = null;
        this.isPanning = false;
    }

    selectObjectsInBox() {
        if (!this.boxStart || !this.boxEnd) return;

        const minX = Math.min(this.boxStart.x, this.boxEnd.x);
        const maxX = Math.max(this.boxStart.x, this.boxEnd.x);
        const minY = Math.min(this.boxStart.y, this.boxEnd.y);
        const maxY = Math.max(this.boxStart.y, this.boxEnd.y);

        const allObjects = [...this.suns, ...this.planets, ...this.moons];
        this.selectedObjects = allObjects.filter(obj => {
            return obj.x >= minX && obj.x <= maxX && obj.y >= minY && obj.y <= maxY;
        });

        // Set selectedObject to first one for backward compatibility
        this.selectedObject = this.selectedObjects.length > 0 ? this.selectedObjects[0] : null;
    }

    onDoubleClick(e) {
        const pos = this.getMousePos(e);
        const obj = this.getObjectAt(pos.x, pos.y);

        if (obj) {
            // If multiple objects selected, show multi-edit modal
            if (this.selectedObjects.length > 1) {
                this.showMultiEditModal();
            } else {
                this.showEditModal(obj);
            }
        }
    }

    onRightClick(e) {
        e.preventDefault();
        const pos = this.getMousePos(e);

        // Check if clicking on a connection to delete it
        const connection = this.getConnectionAt(pos.x, pos.y);
        if (connection) {
            this.connections = this.connections.filter(c => c !== connection);
            this.createParticles(pos.x, pos.y, 15);
            this.saveData();
        }
    }

    onPaste(e) {
        // Only handle paste when station modal is open for images
        const stationModal = document.getElementById('stationModal');
        if (stationModal.classList.contains('hidden')) return;
        if (this.currentStationType !== 'image') return;

        const items = e.clipboardData.items;
        for (const item of items) {
            if (item.type.startsWith('image/')) {
                const file = item.getAsFile();
                const reader = new FileReader();
                reader.onload = (event) => {
                    this.currentStationFile = event.target.result;
                    const uploadArea = document.getElementById('fileUploadArea');
                    uploadArea.classList.add('has-file');
                    uploadArea.querySelector('p').textContent = 'Screenshot eingefügt';
                };
                reader.readAsDataURL(file);
                break;
            }
        }
    }

    onKeyDown(e) {
        // Check if input is focused
        const activeElement = document.activeElement;
        const isInputFocused = activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA');

        // Undo with Ctrl+Z
        if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !isInputFocused) {
            e.preventDefault();
            this.undo();
            return;
        }

        // Redo with Ctrl+Y
        if ((e.ctrlKey || e.metaKey) && e.key === 'y' && !isInputFocused) {
            e.preventDefault();
            this.redo();
            return;
        }

        // Delete selected object when Delete or Backspace is pressed
        if ((e.key === 'Delete' || e.key === 'Backspace') && this.selectedObject) {
            // Prevent default backspace behavior (going back in browser)
            e.preventDefault();

            // Don't delete if a modal is open
            const modals = ['modal', 'editModal', 'stationModal', 'previewModal', 'rocketStatusModal'];
            const anyModalOpen = modals.some(id => !document.getElementById(id).classList.contains('hidden'));
            if (anyModalOpen) return;

            // Don't delete if an input is focused
            const activeElement = document.activeElement;
            if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
                return;
            }

            // Delete the selected object
            const id = this.selectedObject.id;

            // Remove from arrays
            this.suns = this.suns.filter(s => s.id !== id);
            this.planets = this.planets.filter(p => p.id !== id);
            this.moons = this.moons.filter(m => m.id !== id);

            // Remove connections
            this.connections = this.connections.filter(c => c.from !== id && c.to !== id);

            // Create particles for visual feedback
            this.createParticles(this.selectedObject.x, this.selectedObject.y, 30);

            // Clear selection
            this.selectedObject = null;
            this.dragging = null;

            this.saveData();
        }
    }

    getConnectionAt(x, y) {
        const threshold = 10;
        for (const conn of this.connections) {
            const from = this.getObjectById(conn.from);
            const to = this.getObjectById(conn.to);
            if (!from || !to) continue;

            // Calculate distance from point to line segment
            const dx = to.x - from.x;
            const dy = to.y - from.y;
            const len = Math.hypot(dx, dy);
            if (len === 0) continue;

            const t = Math.max(0, Math.min(1, ((x - from.x) * dx + (y - from.y) * dy) / (len * len)));
            const nearestX = from.x + t * dx;
            const nearestY = from.y + t * dy;
            const dist = Math.hypot(x - nearestX, y - nearestY);

            if (dist <= threshold) {
                return conn;
            }
        }
        return null;
    }

    onTouchStart(e) {
        e.preventDefault();
        const touch = e.touches[0];
        const mouseEvent = { clientX: touch.clientX, clientY: touch.clientY };
        this.onMouseDown(mouseEvent);
    }

    onTouchMove(e) {
        e.preventDefault();
        const touch = e.touches[0];
        const mouseEvent = { clientX: touch.clientX, clientY: touch.clientY };
        this.onMouseMove(mouseEvent);
    }

    getMousePos(e) {
        const rect = this.canvas.getBoundingClientRect();
        const screenX = e.clientX - rect.left;
        const screenY = e.clientY - rect.top;

        // Transform screen coordinates to world coordinates
        return {
            x: (screenX - this.offsetX) / this.scale,
            y: (screenY - this.offsetY) / this.scale
        };
    }

    getScreenPos(worldX, worldY) {
        return {
            x: worldX * this.scale + this.offsetX,
            y: worldY * this.scale + this.offsetY
        };
    }

    onWheel(e) {
        e.preventDefault();

        const rect = this.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        // Zoom factor - reduced sensitivity for touchpad
        const zoomIntensity = 0.05;
        const delta = e.deltaY > 0 ? -zoomIntensity : zoomIntensity;
        const newScale = Math.max(0.05, Math.min(5, this.scale * (1 + delta)));

        // Zoom towards mouse position
        const worldX = (mouseX - this.offsetX) / this.scale;
        const worldY = (mouseY - this.offsetY) / this.scale;

        this.scale = newScale;

        this.offsetX = mouseX - worldX * this.scale;
        this.offsetY = mouseY - worldY * this.scale;

        // Activate galaxy view when zoomed out far enough
        this.galaxyView = this.scale < 0.15;
    }

    getObjectAt(x, y) {
        // Check moons first (smallest, on top)
        for (const moon of this.moons) {
            const dist = Math.hypot(x - moon.x, y - moon.y);
            if (dist <= moon.radius) return moon;
        }

        // Then planets
        for (const planet of this.planets) {
            const dist = Math.hypot(x - planet.x, y - planet.y);
            if (dist <= planet.radius) return planet;
        }

        // Then suns (largest, on bottom)
        for (const sun of this.suns) {
            const dist = Math.hypot(x - sun.x, y - sun.y);
            if (dist <= sun.radius) return sun;
        }

        return null;
    }

    checkCollision(obj, x, y) {
        // Minimum distance between object edges (buffer)
        const minBuffer = 20;

        // Get all objects except the one being moved
        const allObjects = [...this.suns, ...this.planets, ...this.moons];

        for (const other of allObjects) {
            if (other === obj) continue;

            const dist = Math.hypot(x - other.x, y - other.y);
            const minDist = obj.radius + other.radius + minBuffer;

            if (dist < minDist) {
                return { collision: true, other: other, dist: dist, minDist: minDist };
            }
        }

        return { collision: false };
    }

    resolveCollision(obj, x, y) {
        const collision = this.checkCollision(obj, x, y);

        if (!collision.collision) {
            return { x: x, y: y };
        }

        // Push object away from collision
        const other = collision.other;
        const angle = Math.atan2(y - other.y, x - other.x);
        const minDist = obj.radius + other.radius + 20;

        return {
            x: other.x + Math.cos(angle) * minDist,
            y: other.y + Math.sin(angle) * minDist
        };
    }

    findNonCollidingPosition(obj, preferredX, preferredY) {
        // Try the preferred position first
        if (!this.checkCollision(obj, preferredX, preferredY).collision) {
            return { x: preferredX, y: preferredY };
        }

        // Try positions in a spiral pattern
        const step = 30;
        const maxAttempts = 50;

        for (let attempt = 1; attempt < maxAttempts; attempt++) {
            const angle = attempt * 0.5; // Spiral angle
            const distance = attempt * step;

            const x = preferredX + Math.cos(angle) * distance;
            const y = preferredY + Math.sin(angle) * distance;

            if (!this.checkCollision(obj, x, y).collision) {
                return { x: x, y: y };
            }
        }

        // If all else fails, return preferred position (will be pushed away)
        return this.resolveCollision(obj, preferredX, preferredY);
    }

    getAddButtonPosition(obj) {
        // Position: oben rechts vom Objekt
        const offset = obj.radius + 15;
        const angle = -Math.PI / 4; // 45 Grad oben rechts
        return {
            x: obj.x + Math.cos(angle) * offset,
            y: obj.y + Math.sin(angle) * offset
        };
    }

    getAddButtonAt(x, y) {
        if (this.galaxyView) return null;

        // Check add buttons for planets (erscheinen bei Sonnen)
        for (const sun of this.suns) {
            const buttonPos = this.getAddButtonPosition(sun);
            const dist = Math.hypot(x - buttonPos.x, y - buttonPos.y);
            if (dist <= 12) {
                return { parent: sun, type: 'planet' };
            }
        }

        // Check add buttons for moons (erscheinen bei Planeten)
        for (const planet of this.planets) {
            const buttonPos = this.getAddButtonPosition(planet);
            const dist = Math.hypot(x - buttonPos.x, y - buttonPos.y);
            if (dist <= 10) {
                return { parent: planet, type: 'moon' };
            }
        }

        return null;
    }

    drawAddButton(obj, type) {
        if (this.galaxyView) return;

        const ctx = this.ctx;
        const buttonPos = this.getAddButtonPosition(obj);
        const radius = type === 'planet' ? 12 : 10;
        const isHovered = this.hoveringAddButton &&
                         this.hoveringAddButton.parent === obj &&
                         this.hoveringAddButton.type === type;

        ctx.save();

        // Weißer Kreis mit Schatten
        ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
        ctx.shadowBlur = 8;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;

        ctx.beginPath();
        ctx.arc(buttonPos.x, buttonPos.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = isHovered ? '#ffffff' : 'rgba(255, 255, 255, 0.9)';
        ctx.fill();

        if (isHovered) {
            ctx.strokeStyle = '#6366f1';
            ctx.lineWidth = 2;
            ctx.stroke();
        }

        // Reset shadow
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;

        // Plus-Symbol (+)
        const lineLength = radius * 0.6;
        ctx.strokeStyle = isHovered ? '#6366f1' : '#333';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';

        // Horizontale Linie
        ctx.beginPath();
        ctx.moveTo(buttonPos.x - lineLength, buttonPos.y);
        ctx.lineTo(buttonPos.x + lineLength, buttonPos.y);
        ctx.stroke();

        // Vertikale Linie
        ctx.beginPath();
        ctx.moveTo(buttonPos.x, buttonPos.y - lineLength);
        ctx.lineTo(buttonPos.x, buttonPos.y + lineLength);
        ctx.stroke();

        ctx.restore();
    }

    getStationAt(x, y) {
        for (const moon of this.moons) {
            if (!moon.stations) continue;

            for (let i = 0; i < moon.stations.length; i++) {
                const station = moon.stations[i];
                const pos = this.getStationPosition(moon, i, moon.stations.length);
                const dist = Math.hypot(x - pos.x, y - pos.y);

                if (dist <= 8) {
                    return { moon, station, index: i };
                }
            }
        }
        return null;
    }

    getStationPosition(moon, index, total) {
        const orbitRadius = moon.radius + 20;
        const angle = (Math.PI * 2 / total) * index;

        return {
            x: moon.x + Math.cos(angle) * orbitRadius,
            y: moon.y + Math.sin(angle) * orbitRadius
        };
    }

    // Connect Mode
    toggleConnectMode() {
        this.connectMode = !this.connectMode;
        this.connectFirst = null;

        const btn = document.getElementById('toggleConnect');
        const indicator = document.getElementById('connectMode');

        if (this.connectMode) {
            btn.classList.add('active');
            indicator.classList.remove('hidden');
        } else {
            btn.classList.remove('active');
            indicator.classList.add('hidden');
        }
    }

    handleConnect(obj) {
        if (!this.connectFirst) {
            this.connectFirst = obj;
            this.createParticles(obj.x, obj.y, 10);
        } else if (this.connectFirst !== obj) {
            // Check if connection exists
            const exists = this.connections.some(c =>
                (c.from === this.connectFirst.id && c.to === obj.id) ||
                (c.from === obj.id && c.to === this.connectFirst.id)
            );

            if (exists) {
                // Remove connection
                this.connections = this.connections.filter(c =>
                    !((c.from === this.connectFirst.id && c.to === obj.id) ||
                      (c.from === obj.id && c.to === this.connectFirst.id))
                );
            } else {
                // Add connection
                this.connections.push({
                    from: this.connectFirst.id,
                    to: obj.id
                });

                // If connecting moon to planet, set moon's color to planet's color
                let moon = null;
                let planet = null;
                let sun = null;

                if (this.connectFirst.type === 'moon' && obj.type === 'planet') {
                    moon = this.connectFirst;
                    planet = obj;
                } else if (this.connectFirst.type === 'planet' && obj.type === 'moon') {
                    planet = this.connectFirst;
                    moon = obj;
                } else if (this.connectFirst.type === 'planet' && obj.type === 'sun') {
                    planet = this.connectFirst;
                    sun = obj;
                } else if (this.connectFirst.type === 'sun' && obj.type === 'planet') {
                    sun = this.connectFirst;
                    planet = obj;
                }

                // Set moon color to planet color
                if (moon && planet && !moon.colorManuallySet) {
                    moon.color = { ...planet.color };
                }

                // Set planet color to sun color
                if (planet && sun && !planet.colorManuallySet) {
                    planet.color = { ...sun.color };

                    // Update all connected moons to match planet's new color
                    this.connections.forEach(conn => {
                        let connectedMoon = null;
                        if (conn.from === planet.id) {
                            const obj = this.getObjectById(conn.to);
                            if (obj && obj.type === 'moon') connectedMoon = obj;
                        } else if (conn.to === planet.id) {
                            const obj = this.getObjectById(conn.from);
                            if (obj && obj.type === 'moon') connectedMoon = obj;
                        }
                        if (connectedMoon && !connectedMoon.colorManuallySet) {
                            connectedMoon.color = { ...planet.color };
                        }
                    });
                }
            }

            this.createParticles(obj.x, obj.y, 20);
            this.connectFirst = null;
            this.updatePlanetStatuses();
            this.saveData();
        }
    }

    handleAddButtonClick(parent, type) {
        // Prompt for name
        const typeName = type === 'planet' ? 'Planet' : 'Mond';
        const defaultName = `${typeName} ${this.nextId}`;
        const name = prompt(`Name für neuen ${typeName}:`, defaultName);

        if (!name || !name.trim()) return;

        // Preferred position near parent (rechts unten)
        const angle = Math.PI / 4; // 45 Grad
        const distance = parent.radius + 150 + Math.random() * 50;
        const preferredX = parent.x + Math.cos(angle) * distance;
        const preferredY = parent.y + Math.sin(angle) * distance;

        let newObj = null;

        if (type === 'planet') {
            // Create planet with temporary position
            const color = this.planetColors[Math.floor(Math.random() * this.planetColors.length)];
            const radius = 40 + Math.random() * 20;
            newObj = {
                id: this.nextId++,
                type: 'planet',
                name: name.trim(),
                x: 0,
                y: 0,
                radius: radius,
                color: color,
                rotation: Math.random() * Math.PI * 2,
                rotationSpeed: 0.001 + Math.random() * 0.002
            };

            // Find non-colliding position
            const pos = this.findNonCollidingPosition(newObj, preferredX, preferredY);
            newObj.x = pos.x;
            newObj.y = pos.y;

            this.planets.push(newObj);
        } else {
            // Create moon with temporary position
            const radius = 15 + Math.random() * 10;
            const moon = {
                id: this.nextId++,
                type: 'moon',
                name: name.trim(),
                x: 0,
                y: 0,
                radius: radius,
                color: parent.color, // Use parent planet's color
                phase: Math.random() * Math.PI * 2,
                stations: [],
                deadline: null
            };

            // Find non-colliding position
            const pos = this.findNonCollidingPosition(moon, preferredX, preferredY);
            moon.x = pos.x;
            moon.y = pos.y;

            this.moons.push(moon);
            newObj = moon;
        }

        // Create connection to parent
        this.connections.push({
            from: parent.id,
            to: newObj.id
        });

        // Particle effects
        this.createParticles(newObj.x, newObj.y, 30);
        this.createParticles(parent.x, parent.y, 15);

        this.saveData();
    }

    // Modal
    showModal(type) {
        this.modalType = type;
        const modal = document.getElementById('modal');
        const title = document.getElementById('modalTitle');
        const input = document.getElementById('nameInput');

        const titles = {
            sun: 'Neue Sonne',
            planet: 'Neuer Planet',
            moon: 'Neuer Mond'
        };
        title.textContent = titles[type] || 'Neu';
        input.value = '';
        modal.classList.remove('hidden');
        input.focus();
    }

    hideModal() {
        document.getElementById('modal').classList.add('hidden');
    }

    confirmModal() {
        const name = document.getElementById('nameInput').value.trim();
        if (!name) return;

        if (this.modalType === 'sun') {
            this.addSun(name);
        } else if (this.modalType === 'planet') {
            this.addPlanet(name);
        } else {
            this.addMoon(name);
        }

        this.hideModal();
    }

    showEditModal(obj) {
        this.editingObj = obj;
        const modal = document.getElementById('editModal');
        const input = document.getElementById('editNameInput');
        const colorPicker = document.getElementById('colorPicker');
        const stationControls = document.getElementById('stationControls');
        const deadlineControls = document.getElementById('deadlineControls');
        const deadlinePicker = document.getElementById('deadlinePicker');

        input.value = obj.name;
        colorPicker.value = obj.color.main;

        modal.classList.remove('hidden');
        input.focus();
        input.select();

        // Show station controls and deadline picker only for moons
        if (obj.type === 'moon') {
            stationControls.classList.remove('hidden');
            deadlineControls.classList.remove('hidden');

            // Set deadline value if it exists
            if (obj.deadline) {
                deadlinePicker.value = obj.deadline;
            } else {
                deadlinePicker.value = '';
            }
        } else {
            stationControls.classList.add('hidden');
            deadlineControls.classList.add('hidden');
        }
    }

    hideEditModal() {
        document.getElementById('editModal').classList.add('hidden');
        this.editingObj = null;
    }

    confirmEdit() {
        if (!this.editingObj) return;

        const name = document.getElementById('editNameInput').value.trim();
        const colorValue = document.getElementById('colorPicker').value;

        if (name) {
            this.editingObj.name = name;
        }

        // Update color
        const oldColor = this.editingObj.color.main;
        this.editingObj.color = {
            main: colorValue,
            glow: this.hexToRgba(colorValue, 0.3)
        };

        // Mark color as manually set if changed (for moons and planets)
        if (oldColor !== colorValue && (this.editingObj.type === 'moon' || this.editingObj.type === 'planet')) {
            this.editingObj.colorManuallySet = true;
        }

        // Update deadline for moons
        if (this.editingObj.type === 'moon') {
            const deadlineValue = document.getElementById('deadlinePicker').value;
            this.editingObj.deadline = deadlineValue || null;
        }

        this.saveData();
        this.hideEditModal();
    }

    hexToRgba(hex, alpha) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    deleteSelected() {
        if (!this.editingObj) return;

        const id = this.editingObj.id;

        // Remove from suns, planets or moons
        this.suns = this.suns.filter(s => s.id !== id);
        this.planets = this.planets.filter(p => p.id !== id);
        this.moons = this.moons.filter(m => m.id !== id);

        // Remove connections
        this.connections = this.connections.filter(c => c.from !== id && c.to !== id);

        this.createParticles(this.editingObj.x, this.editingObj.y, 30);
        this.hideEditModal();
        this.saveData();
    }

    // Multi-Edit Modal
    showMultiEditModal() {
        const modal = document.getElementById('multiEditModal');
        const count = document.getElementById('multiEditCount');

        count.textContent = `${this.selectedObjects.length} Objekte ausgewählt`;

        modal.classList.remove('hidden');
    }

    hideMultiEditModal() {
        document.getElementById('multiEditModal').classList.add('hidden');
    }

    applyMultiColor() {
        const colorValue = document.getElementById('multiColorPicker').value;

        this.selectedObjects.forEach(obj => {
            const oldColor = obj.color.main;
            obj.color = {
                main: colorValue,
                glow: this.hexToRgba(colorValue, 0.3)
            };

            // Mark color as manually set if changed (for moons and planets)
            if (oldColor !== colorValue && (obj.type === 'moon' || obj.type === 'planet')) {
                obj.colorManuallySet = true;
            }
        });

        this.saveData();
    }

    applyMultiDeadline() {
        const deadlineValue = document.getElementById('multiDeadlinePicker').value;

        // Apply deadline only to moons
        this.selectedObjects.forEach(obj => {
            if (obj.type === 'moon') {
                obj.deadline = deadlineValue || null;
            }
        });

        this.saveData();
    }

    deleteMultiSelected() {
        if (this.selectedObjects.length === 0) return;

        // Collect IDs to delete
        const idsToDelete = this.selectedObjects.map(obj => obj.id);

        // Create particles at each object's position
        this.selectedObjects.forEach(obj => {
            this.createParticles(obj.x, obj.y, 30);
        });

        // Remove from suns, planets and moons
        this.suns = this.suns.filter(s => !idsToDelete.includes(s.id));
        this.planets = this.planets.filter(p => !idsToDelete.includes(p.id));
        this.moons = this.moons.filter(m => !idsToDelete.includes(m.id));

        // Remove connections
        this.connections = this.connections.filter(c =>
            !idsToDelete.includes(c.from) && !idsToDelete.includes(c.to)
        );

        // Clear selection
        this.selectedObjects = [];

        this.hideMultiEditModal();
        this.saveData();
    }

    // Create objects
    addSun(name) {
        const sunColors = [
            { main: '#fbbf24', glow: 'rgba(251, 191, 36, 0.4)' },
            { main: '#f59e0b', glow: 'rgba(245, 158, 11, 0.4)' },
            { main: '#fb923c', glow: 'rgba(251, 146, 60, 0.4)' },
        ];
        const color = sunColors[Math.floor(Math.random() * sunColors.length)];
        const radius = 60 + Math.random() * 30;

        // Preferred position
        const preferredX = 150 + Math.random() * (this.canvas.width - 300);
        const preferredY = 150 + Math.random() * (this.canvas.height - 300);

        const sun = {
            id: this.nextId++,
            type: 'sun',
            name: name,
            x: 0,
            y: 0,
            radius: radius,
            color: color,
            pulsePhase: Math.random() * Math.PI * 2
        };

        // Find non-colliding position
        const pos = this.findNonCollidingPosition(sun, preferredX, preferredY);
        sun.x = pos.x;
        sun.y = pos.y;

        this.suns.push(sun);
        this.createParticles(sun.x, sun.y, 40);
        this.saveData();
    }

    addPlanet(name) {
        const color = this.planetColors[Math.floor(Math.random() * this.planetColors.length)];
        const radius = 40 + Math.random() * 20;

        // Preferred position
        const preferredX = 150 + Math.random() * (this.canvas.width - 300);
        const preferredY = 150 + Math.random() * (this.canvas.height - 300);

        const planet = {
            id: this.nextId++,
            type: 'planet',
            name: name,
            x: 0,
            y: 0,
            radius: radius,
            color: color,
            rotation: Math.random() * Math.PI * 2,
            rotationSpeed: 0.001 + Math.random() * 0.002
        };

        // Find non-colliding position
        const pos = this.findNonCollidingPosition(planet, preferredX, preferredY);
        planet.x = pos.x;
        planet.y = pos.y;

        this.planets.push(planet);
        this.createParticles(planet.x, planet.y, 30);
        this.saveData();
    }

    addMoon(name) {
        const color = this.moonColors[Math.floor(Math.random() * this.moonColors.length)];
        const radius = 15 + Math.random() * 10;

        // Preferred position
        const preferredX = 150 + Math.random() * (this.canvas.width - 300);
        const preferredY = 150 + Math.random() * (this.canvas.height - 300);

        const moon = {
            id: this.nextId++,
            type: 'moon',
            name: name,
            x: 0,
            y: 0,
            radius: radius,
            color: color,
            phase: Math.random() * Math.PI * 2,
            stations: [],
            deadline: null  // Deadline für Mond
        };

        // Find non-colliding position
        const pos = this.findNonCollidingPosition(moon, preferredX, preferredY);
        moon.x = pos.x;
        moon.y = pos.y;

        this.moons.push(moon);
        this.createParticles(moon.x, moon.y, 20);
        this.saveData();
    }

    // Station methods
    showStationModal(type) {
        this.currentStationType = type;
        this.currentStationFile = null;

        const modal = document.getElementById('stationModal');
        const title = document.getElementById('stationModalTitle');
        const fileArea = document.getElementById('fileUploadArea');
        const noteInput = document.getElementById('noteInput');
        const nameInput = document.getElementById('stationName');

        const typeNames = {
            image: 'Bild',
            video: 'Video',
            audio: 'Audio',
            note: 'Notiz'
        };

        title.textContent = `${typeNames[type]} hinzufügen`;
        nameInput.value = '';

        if (type === 'note') {
            fileArea.classList.add('hidden');
            noteInput.classList.remove('hidden');
            noteInput.value = '';
        } else {
            fileArea.classList.remove('hidden');
            noteInput.classList.add('hidden');

            const fileInput = document.getElementById('fileInput');
            fileInput.value = '';
            fileArea.classList.remove('has-file');
            fileArea.querySelector('p').textContent = 'Datei hierher ziehen oder klicken';

            // Set accept attribute based on type
            const accepts = {
                image: 'image/*',
                video: 'video/*',
                audio: 'audio/*'
            };
            fileInput.accept = accepts[type];
        }

        modal.classList.remove('hidden');
        nameInput.focus();
    }

    hideStationModal() {
        document.getElementById('stationModal').classList.add('hidden');
        this.currentStationType = null;
        this.currentStationFile = null;
    }

    handleFileSelect(e) {
        const file = e.target.files[0];
        if (!file) return;

        const uploadArea = document.getElementById('fileUploadArea');
        uploadArea.classList.add('has-file');
        uploadArea.querySelector('p').textContent = file.name;

        // Read file as base64
        const reader = new FileReader();
        reader.onload = (event) => {
            this.currentStationFile = event.target.result;
        };
        reader.readAsDataURL(file);
    }

    confirmStation() {
        if (!this.editingObj || this.editingObj.type !== 'moon') return;

        const name = document.getElementById('stationName').value.trim() || 'Station';
        let data;

        if (this.currentStationType === 'note') {
            data = document.getElementById('noteInput').value;
            if (!data.trim()) return;
        } else {
            if (!this.currentStationFile) return;
            data = this.currentStationFile;
        }

        // Initialize stations array if needed
        if (!this.editingObj.stations) {
            this.editingObj.stations = [];
        }

        this.editingObj.stations.push({
            id: this.nextId++,
            type: this.currentStationType,
            name: name,
            data: data
        });

        this.createParticles(this.editingObj.x, this.editingObj.y, 15);
        this.hideStationModal();
        this.saveData();
    }

    showPreviewModal(moon, station) {
        this.previewingMoon = moon;
        this.previewingStation = station;

        const modal = document.getElementById('previewModal');
        const title = document.getElementById('previewTitle');
        const container = document.getElementById('previewContainer');

        title.textContent = station.name;
        container.innerHTML = '';

        switch (station.type) {
            case 'image':
                const img = document.createElement('img');
                img.src = station.data;
                container.appendChild(img);
                break;

            case 'video':
                const video = document.createElement('video');
                video.src = station.data;
                video.controls = true;
                container.appendChild(video);
                break;

            case 'audio':
                const audio = document.createElement('audio');
                audio.src = station.data;
                audio.controls = true;
                container.appendChild(audio);
                break;

            case 'note':
                const note = document.createElement('div');
                note.className = 'note-preview';
                note.textContent = station.data;
                container.appendChild(note);
                break;
        }

        modal.classList.remove('hidden');
    }

    hidePreviewModal() {
        document.getElementById('previewModal').classList.add('hidden');
        this.previewingMoon = null;
        this.previewingStation = null;
    }

    showRocketStatusModal(moon) {
        this.statusModalMoon = moon;
        const modal = document.getElementById('rocketStatusModal');
        modal.classList.remove('hidden');
    }

    hideRocketStatusModal() {
        document.getElementById('rocketStatusModal').classList.add('hidden');
        this.statusModalMoon = null;
    }

    setRocketStatus(status) {
        if (!this.statusModalMoon) return;

        const moon = this.statusModalMoon;

        if (status === 'terraformed') {
            moon.rocketStatus = 'terraformed';
            this.createParticles(moon.x, moon.y, 30);

            // Send ALL rockets at this moon back to base
            const rocketIndices = [];
            this.flyingRockets.forEach((r, index) => {
                if (r.target.id === moon.id && r.orbiting) {
                    rocketIndices.push(index);
                }
            });

            // Return all rockets (in reverse order to avoid index shifting)
            for (let i = rocketIndices.length - 1; i >= 0; i--) {
                this.returnRocketToBase(rocketIndices[i]);
            }
        } else if (status === 'waiting') {
            moon.rocketStatus = 'waiting';
            this.createParticles(moon.x, moon.y, 20);

            // Send ALL rockets at this moon back to base
            const rocketIndices = [];
            this.flyingRockets.forEach((r, index) => {
                if (r.target.id === moon.id && r.orbiting) {
                    rocketIndices.push(index);
                }
            });

            // Return all rockets (in reverse order to avoid index shifting)
            for (let i = rocketIndices.length - 1; i >= 0; i--) {
                this.returnRocketToBase(rocketIndices[i]);
            }
        } else if (status === 'remove') {
            // Remove ALL rockets at this moon immediately
            this.flyingRockets = this.flyingRockets.filter(r => r.target.id !== moon.id);
            moon.rocketStatus = null;
            this.createParticles(moon.x, moon.y, 15);
        }

        this.updatePlanetStatuses();
        this.saveData();
        this.hideRocketStatusModal();
    }

    updatePlanetStatuses() {
        // Update status for all planets based on their moons
        this.planets.forEach(planet => {
            // Find all moons connected to this planet
            const connectedMoonIds = [];

            this.connections.forEach(conn => {
                if (conn.from === planet.id) {
                    const obj = this.getObjectById(conn.to);
                    if (obj && obj.type === 'moon') {
                        connectedMoonIds.push(obj.id);
                    }
                } else if (conn.to === planet.id) {
                    const obj = this.getObjectById(conn.from);
                    if (obj && obj.type === 'moon') {
                        connectedMoonIds.push(obj.id);
                    }
                }
            });

            // If planet has moons
            if (connectedMoonIds.length > 0) {
                // Check if ALL moons are terraformed
                const allTerraformed = connectedMoonIds.every(moonId => {
                    const moon = this.moons.find(m => m.id === moonId);
                    return moon && moon.rocketStatus === 'terraformed';
                });

                planet.rocketStatus = allTerraformed ? 'terraformed' : null;
            } else {
                // No moons, no status
                planet.rocketStatus = null;
            }
        });
    }

    returnRocketToBase(rocketIndex) {
        const rocket = this.flyingRockets[rocketIndex];

        // Set rocket to return mode - return to rocket selector (top right)
        rocket.returning = true;
        rocket.returnProgress = 0;
        rocket.returnStartX = rocket.target.x;
        rocket.returnStartY = rocket.target.y;
        rocket.returnEndX = window.innerWidth - 100;
        rocket.returnEndY = 70;
    }

    deleteStation() {
        if (!this.previewingMoon || !this.previewingStation) return;

        const index = this.previewingMoon.stations.findIndex(s => s.id === this.previewingStation.id);
        if (index !== -1) {
            this.previewingMoon.stations.splice(index, 1);
            this.createParticles(this.previewingMoon.x, this.previewingMoon.y, 10);
            this.saveData();
        }

        this.hidePreviewModal();
    }

    clearAll() {
        if (this.suns.length === 0 && this.planets.length === 0 && this.moons.length === 0) return;

        if (confirm('Wirklich alles löschen?')) {
            // Create particles for all objects
            [...this.suns, ...this.planets, ...this.moons].forEach(obj => {
                this.createParticles(obj.x, obj.y, 15);
            });

            this.suns = [];
            this.planets = [];
            this.moons = [];
            this.connections = [];
            this.saveData();
        }
    }

    // Particles
    createParticles(x, y, count) {
        for (let i = 0; i < count; i++) {
            this.particles.push({
                x: x,
                y: y,
                vx: (Math.random() - 0.5) * 8,
                vy: (Math.random() - 0.5) * 8,
                life: 1,
                decay: 0.02 + Math.random() * 0.02,
                size: 2 + Math.random() * 3,
                color: `hsl(${Math.random() * 60 + 200}, 70%, 60%)`
            });
        }
    }

    updateParticles() {
        this.particles = this.particles.filter(p => {
            p.x += p.vx;
            p.y += p.vy;
            p.vx *= 0.98;
            p.vy *= 0.98;
            p.life -= p.decay;
            return p.life > 0;
        });
    }

    // Drawing
    animate() {
        this.time += 0.016;
        this.updateParticles();
        this.updateFlyingRockets();
        this.draw();
        requestAnimationFrame(() => this.animate());
    }

    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Apply zoom transformation
        this.ctx.save();
        this.ctx.translate(this.offsetX, this.offsetY);
        this.ctx.scale(this.scale, this.scale);

        if (this.galaxyView) {
            // Galaxy view: only draw suns
            this.suns.forEach(sun => this.drawSun(sun));
        } else {
            // Normal view: draw everything
            // Draw connections
            this.drawConnections();

            // Draw connect preview line
            if (this.connectMode && this.connectFirst) {
                this.ctx.beginPath();
                this.ctx.moveTo(this.connectFirst.x, this.connectFirst.y);
                this.ctx.lineTo(this.mousePos.x, this.mousePos.y);
                this.ctx.strokeStyle = 'rgba(245, 158, 11, 0.5)';
                this.ctx.lineWidth = 2 / this.scale;
                this.ctx.setLineDash([5 / this.scale, 5 / this.scale]);
                this.ctx.stroke();
                this.ctx.setLineDash([]);
            }

            // Draw suns (largest, background)
            this.suns.forEach(sun => this.drawSun(sun));

            // Draw planets
            this.planets.forEach(planet => this.drawPlanet(planet));

            // Draw moons
            this.moons.forEach(moon => this.drawMoon(moon));

            // Draw particles
            this.drawParticles();

            // Draw selection highlights
            this.drawSelectionHighlights();

            // Draw box selection
            if (this.isBoxSelecting && this.boxStart && this.boxEnd) {
                this.drawSelectionBox();
            }
        }

        // Restore transformation
        this.ctx.restore();

        if (!this.galaxyView) {
            // Draw flying rockets (in screen space) - only in normal view
            this.drawFlyingRockets();
        }

        // Draw zoom indicator (in screen space)
        this.drawZoomIndicator();
    }

    drawZoomIndicator() {
        if (this.scale === 1 && !this.galaxyView) return;

        const ctx = this.ctx;
        const text = this.galaxyView ? '🌌 Galaxyansicht' : `${Math.round(this.scale * 100)}%`;

        ctx.font = this.galaxyView ? 'bold 14px "Segoe UI", sans-serif' : '12px "Segoe UI", sans-serif';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'bottom';

        const padding = 8;
        const x = this.canvas.width - 20;
        const y = this.canvas.height - 20;

        // Background
        const metrics = ctx.measureText(text);
        ctx.fillStyle = this.galaxyView ? 'rgba(99, 102, 241, 0.8)' : 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(
            x - metrics.width - padding,
            y - 14 - padding / 2,
            metrics.width + padding * 2,
            14 + padding
        );

        // Text
        ctx.fillStyle = '#fff';
        ctx.fillText(text, x, y);
    }

    drawSelectionHighlights() {
        const ctx = this.ctx;

        this.selectedObjects.forEach(obj => {
            ctx.save();

            // Draw highlight ring around selected object
            ctx.beginPath();
            ctx.arc(obj.x, obj.y, obj.radius + 8, 0, Math.PI * 2);
            ctx.strokeStyle = '#6366f1';
            ctx.lineWidth = 3;
            ctx.setLineDash([5, 5]);
            ctx.stroke();
            ctx.setLineDash([]);

            // Draw corner markers
            const markerSize = 6;
            const distance = obj.radius + 12;
            const angles = [0, Math.PI / 2, Math.PI, Math.PI * 1.5];

            angles.forEach(angle => {
                const x = obj.x + Math.cos(angle) * distance;
                const y = obj.y + Math.sin(angle) * distance;

                ctx.fillStyle = '#6366f1';
                ctx.fillRect(x - markerSize / 2, y - markerSize / 2, markerSize, markerSize);
            });

            ctx.restore();
        });
    }

    drawSelectionBox() {
        const ctx = this.ctx;
        const minX = Math.min(this.boxStart.x, this.boxEnd.x);
        const maxX = Math.max(this.boxStart.x, this.boxEnd.x);
        const minY = Math.min(this.boxStart.y, this.boxEnd.y);
        const maxY = Math.max(this.boxStart.y, this.boxEnd.y);

        ctx.save();

        // Fill
        ctx.fillStyle = 'rgba(99, 102, 241, 0.1)';
        ctx.fillRect(minX, minY, maxX - minX, maxY - minY);

        // Border
        ctx.strokeStyle = '#6366f1';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.strokeRect(minX, minY, maxX - minX, maxY - minY);
        ctx.setLineDash([]);

        ctx.restore();
    }

    drawSun(sun) {
        const ctx = this.ctx;
        const isHovered = this.hovering === sun;
        const isConnecting = this.connectFirst === sun;

        // In galaxy view, make suns larger for visibility but not too big
        const galaxyScale = this.galaxyView ? 4 : 1;
        const displayRadius = sun.radius * galaxyScale;

        // Pulsing effect
        const pulse = Math.sin(this.time * 2 + sun.pulsePhase) * 0.1 + 1;

        // Outer glow (corona)
        const coronaSize = displayRadius * 0.8;
        for (let i = 3; i >= 0; i--) {
            const gradient = ctx.createRadialGradient(
                sun.x, sun.y, displayRadius * 0.5,
                sun.x, sun.y, displayRadius + coronaSize * (i + 1) * 0.3 * pulse
            );
            gradient.addColorStop(0, `rgba(255, 200, 50, ${0.3 - i * 0.07})`);
            gradient.addColorStop(1, 'transparent');

            ctx.beginPath();
            ctx.arc(sun.x, sun.y, displayRadius + coronaSize * (i + 1) * 0.3 * pulse, 0, Math.PI * 2);
            ctx.fillStyle = gradient;
            ctx.fill();
        }

        // Sun body
        const bodyGradient = ctx.createRadialGradient(
            sun.x - displayRadius * 0.2, sun.y - displayRadius * 0.2, 0,
            sun.x, sun.y, displayRadius
        );
        bodyGradient.addColorStop(0, '#fff5e0');
        bodyGradient.addColorStop(0.3, sun.color.main);
        bodyGradient.addColorStop(0.7, this.darkenColor(sun.color.main, 10));
        bodyGradient.addColorStop(1, this.darkenColor(sun.color.main, 30));

        ctx.beginPath();
        ctx.arc(sun.x, sun.y, displayRadius, 0, Math.PI * 2);
        ctx.fillStyle = bodyGradient;
        ctx.fill();

        // Solar flares (only in normal view)
        if (!this.galaxyView) {
            ctx.save();
            ctx.translate(sun.x, sun.y);
            for (let i = 0; i < 8; i++) {
                const angle = (Math.PI * 2 / 8) * i + this.time * 0.2;
                const flareLength = displayRadius * 0.3 * (Math.sin(this.time * 3 + i) * 0.3 + 0.7);

                ctx.beginPath();
                ctx.moveTo(
                    Math.cos(angle) * displayRadius * 0.9,
                    Math.sin(angle) * displayRadius * 0.9
                );
                ctx.lineTo(
                    Math.cos(angle) * (displayRadius + flareLength),
                    Math.sin(angle) * (displayRadius + flareLength)
                );
                ctx.strokeStyle = `rgba(255, 200, 100, ${0.5 + Math.sin(this.time * 3 + i) * 0.3})`;
                ctx.lineWidth = 3;
                ctx.stroke();
            }
            ctx.restore();
        }

        // Highlight if hovered or connecting (only in normal view)
        if (!this.galaxyView && (isHovered || isConnecting)) {
            ctx.beginPath();
            ctx.arc(sun.x, sun.y, displayRadius + 8, 0, Math.PI * 2);
            ctx.strokeStyle = isConnecting ? '#f59e0b' : '#fff';
            ctx.lineWidth = 3;
            ctx.stroke();
        }

        // Name
        this.drawLabel(sun);

        // Add button (Plus-Symbol zum Hinzufügen von Planeten)
        this.drawAddButton(sun, 'planet');
    }

    drawConnections() {
        this.connections.forEach(conn => {
            const from = this.getObjectById(conn.from);
            const to = this.getObjectById(conn.to);

            if (from && to) {
                // Animated connection line
                const gradient = this.ctx.createLinearGradient(from.x, from.y, to.x, to.y);
                const pulse = (Math.sin(this.time * 3) + 1) / 2;

                gradient.addColorStop(0, from.color.main);
                gradient.addColorStop(0.5, `rgba(255, 255, 255, ${0.3 + pulse * 0.3})`);
                gradient.addColorStop(1, to.color.main);

                this.ctx.beginPath();
                this.ctx.moveTo(from.x, from.y);
                this.ctx.lineTo(to.x, to.y);
                this.ctx.strokeStyle = gradient;
                this.ctx.lineWidth = 2;
                this.ctx.stroke();

                // Flowing particles along connection
                const progress = (this.time * 0.2) % 1;
                const px = from.x + (to.x - from.x) * progress;
                const py = from.y + (to.y - from.y) * progress;

                this.ctx.beginPath();
                this.ctx.arc(px, py, 3, 0, Math.PI * 2);
                this.ctx.fillStyle = '#fff';
                this.ctx.fill();
            }
        });
    }

    drawPlanet(planet) {
        const ctx = this.ctx;
        const isHovered = this.hovering === planet;
        const isConnecting = this.connectFirst === planet;

        // Update rotation
        planet.rotation += planet.rotationSpeed;

        // Glow effect
        const glowSize = isHovered || isConnecting ? 30 : 20;
        const gradient = ctx.createRadialGradient(
            planet.x, planet.y, planet.radius * 0.5,
            planet.x, planet.y, planet.radius + glowSize
        );
        gradient.addColorStop(0, planet.color.glow);
        gradient.addColorStop(1, 'transparent');

        ctx.beginPath();
        ctx.arc(planet.x, planet.y, planet.radius + glowSize, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();

        // Planet body
        const bodyGradient = ctx.createRadialGradient(
            planet.x - planet.radius * 0.3, planet.y - planet.radius * 0.3, 0,
            planet.x, planet.y, planet.radius
        );
        bodyGradient.addColorStop(0, this.lightenColor(planet.color.main, 30));
        bodyGradient.addColorStop(0.7, planet.color.main);
        bodyGradient.addColorStop(1, this.darkenColor(planet.color.main, 30));

        ctx.beginPath();
        ctx.arc(planet.x, planet.y, planet.radius, 0, Math.PI * 2);
        ctx.fillStyle = bodyGradient;
        ctx.fill();

        // Surface details (stripes)
        ctx.save();
        ctx.clip();

        for (let i = 0; i < 3; i++) {
            const offset = Math.sin(planet.rotation + i) * planet.radius * 0.3;
            ctx.beginPath();
            ctx.ellipse(
                planet.x + offset, planet.y,
                planet.radius * 0.9, planet.radius * 0.15,
                0, 0, Math.PI * 2
            );
            ctx.strokeStyle = `rgba(255, 255, 255, ${0.1 - i * 0.03})`;
            ctx.lineWidth = 3;
            ctx.stroke();
        }

        ctx.restore();

        // Ring for some planets
        if (planet.id % 3 === 0) {
            ctx.beginPath();
            ctx.ellipse(
                planet.x, planet.y,
                planet.radius * 1.5, planet.radius * 0.3,
                planet.rotation * 0.5, 0, Math.PI * 2
            );
            ctx.strokeStyle = `rgba(255, 255, 255, 0.3)`;
            ctx.lineWidth = 3;
            ctx.stroke();
        }

        // Rocket status indicator (terraformed planet)
        if (planet.rocketStatus === 'terraformed') {
            ctx.beginPath();
            ctx.arc(planet.x, planet.y, planet.radius + 8, 0, Math.PI * 2);
            ctx.strokeStyle = '#10b981'; // Green
            ctx.lineWidth = 4;
            ctx.stroke();
        }

        // Highlight if hovered or connecting
        if (isHovered || isConnecting) {
            ctx.beginPath();
            ctx.arc(planet.x, planet.y, planet.radius + 5, 0, Math.PI * 2);
            ctx.strokeStyle = isConnecting ? '#f59e0b' : '#fff';
            ctx.lineWidth = 2;
            ctx.stroke();
        }

        // Name
        this.drawLabel(planet);

        // Add button (Plus-Symbol zum Hinzufügen von Monden)
        this.drawAddButton(planet, 'moon');
    }

    drawMoon(moon) {
        const ctx = this.ctx;
        const isHovered = this.hovering === moon;
        const isConnecting = this.connectFirst === moon;

        // Deadline visual effects FIRST (before anything else, so they appear as background)
        if (moon.deadline && !moon.rocketStatus && !this.galaxyView) {
            const daysUntil = this.getDaysUntilDeadline(moon.deadline);

            if (daysUntil !== null) {
                ctx.save();

                if (daysUntil < 0) {
                    // Überschritten - Roter Blitz-Nebel
                    const blinkIntensity = Math.sin(this.time * 10) * 0.5 + 0.5;

                    // Mehrere pulsierende Nebel-Schichten
                    for (let layer = 0; layer < 4; layer++) {
                        const nebelRadius = moon.radius + 40 + layer * 20;
                        const gradient = ctx.createRadialGradient(
                            moon.x, moon.y, moon.radius,
                            moon.x, moon.y, nebelRadius
                        );
                        gradient.addColorStop(0, `rgba(239, 68, 68, ${0.7 * blinkIntensity})`);
                        gradient.addColorStop(0.4, `rgba(239, 68, 68, ${0.5 * blinkIntensity})`);
                        gradient.addColorStop(1, 'transparent');

                        ctx.beginPath();
                        ctx.arc(moon.x, moon.y, nebelRadius, 0, Math.PI * 2);
                        ctx.fillStyle = gradient;
                        ctx.fill();
                    }

                    // Energieblitze
                    const lightningCount = 8;
                    for (let i = 0; i < lightningCount; i++) {
                        const angle = (Math.PI * 2 / lightningCount) * i + this.time * 3;
                        const length = 30 + Math.sin(this.time * 5 + i) * 12;

                        const gradient = ctx.createLinearGradient(
                            moon.x + Math.cos(angle) * moon.radius,
                            moon.y + Math.sin(angle) * moon.radius,
                            moon.x + Math.cos(angle) * (moon.radius + length),
                            moon.y + Math.sin(angle) * (moon.radius + length)
                        );
                        gradient.addColorStop(0, `rgba(255, 80, 80, ${blinkIntensity * 0.9})`);
                        gradient.addColorStop(1, 'transparent');

                        ctx.beginPath();
                        ctx.moveTo(
                            moon.x + Math.cos(angle) * moon.radius,
                            moon.y + Math.sin(angle) * moon.radius
                        );
                        ctx.lineTo(
                            moon.x + Math.cos(angle) * (moon.radius + length),
                            moon.y + Math.sin(angle) * (moon.radius + length)
                        );
                        ctx.strokeStyle = gradient;
                        ctx.lineWidth = 5;
                        ctx.stroke();
                    }
                } else if (daysUntil < 1) {
                    // <24h - Rot blinkender Nebel
                    const blinkIntensity = Math.sin(this.time * 8) * 0.5 + 0.5;

                    // Roter Nebel (verstärkt)
                    for (let layer = 0; layer < 3; layer++) {
                        const nebelRadius = moon.radius + 35 + layer * 15;
                        const gradient = ctx.createRadialGradient(
                            moon.x, moon.y, moon.radius,
                            moon.x, moon.y, nebelRadius
                        );
                        gradient.addColorStop(0, `rgba(239, 68, 68, ${0.8 * blinkIntensity})`);
                        gradient.addColorStop(0.5, `rgba(220, 38, 38, ${0.5 * blinkIntensity})`);
                        gradient.addColorStop(1, 'transparent');

                        ctx.beginPath();
                        ctx.arc(moon.x, moon.y, nebelRadius, 0, Math.PI * 2);
                        ctx.fillStyle = gradient;
                        ctx.fill();
                    }
                } else if (daysUntil < 3) {
                    // 1-3 Tage - Orange pulsierender Nebel
                    const pulseIntensity = Math.sin(this.time * 3) * 0.4 + 0.6;
                    const pulseSize = 10 + pulseIntensity * 15;

                    // Orange Nebel mit Pulsieren (verstärkt)
                    for (let layer = 0; layer < 3; layer++) {
                        const nebelRadius = moon.radius + 30 + pulseSize + layer * 12;
                        const gradient = ctx.createRadialGradient(
                            moon.x, moon.y, moon.radius,
                            moon.x, moon.y, nebelRadius
                        );
                        gradient.addColorStop(0, `rgba(245, 158, 11, ${0.8 * pulseIntensity})`);
                        gradient.addColorStop(0.4, `rgba(251, 146, 60, ${0.6 * pulseIntensity})`);
                        gradient.addColorStop(1, 'transparent');

                        ctx.beginPath();
                        ctx.arc(moon.x, moon.y, nebelRadius, 0, Math.PI * 2);
                        ctx.fillStyle = gradient;
                        ctx.fill();
                    }
                } else if (daysUntil < 7) {
                    // 3-7 Tage - Gelber Schimmer-Nebel
                    const shimmerIntensity = Math.sin(this.time * 2) * 0.2 + 0.8;

                    // Gelber Nebel (verstärkt)
                    for (let layer = 0; layer < 3; layer++) {
                        const nebelRadius = moon.radius + 25 + layer * 12;
                        const gradient = ctx.createRadialGradient(
                            moon.x, moon.y, moon.radius,
                            moon.x, moon.y, nebelRadius
                        );
                        gradient.addColorStop(0, `rgba(251, 191, 36, ${0.7 * shimmerIntensity})`);
                        gradient.addColorStop(0.5, `rgba(250, 204, 21, ${0.5 * shimmerIntensity})`);
                        gradient.addColorStop(1, 'transparent');

                        ctx.beginPath();
                        ctx.arc(moon.x, moon.y, nebelRadius, 0, Math.PI * 2);
                        ctx.fillStyle = gradient;
                        ctx.fill();
                    }
                }

                ctx.restore();
            }
        }

        // Glow effect
        const glowSize = isHovered || isConnecting ? 20 : 12;
        const gradient = ctx.createRadialGradient(
            moon.x, moon.y, moon.radius * 0.5,
            moon.x, moon.y, moon.radius + glowSize
        );
        gradient.addColorStop(0, moon.color.glow);
        gradient.addColorStop(1, 'transparent');

        ctx.beginPath();
        ctx.arc(moon.x, moon.y, moon.radius + glowSize, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();

        // Moon body with crater effect
        const bodyGradient = ctx.createRadialGradient(
            moon.x - moon.radius * 0.3, moon.y - moon.radius * 0.3, 0,
            moon.x, moon.y, moon.radius
        );
        bodyGradient.addColorStop(0, this.lightenColor(moon.color.main, 40));
        bodyGradient.addColorStop(0.6, moon.color.main);
        bodyGradient.addColorStop(1, this.darkenColor(moon.color.main, 20));

        ctx.beginPath();
        ctx.arc(moon.x, moon.y, moon.radius, 0, Math.PI * 2);
        ctx.fillStyle = bodyGradient;
        ctx.fill();

        // Craters
        ctx.save();
        ctx.beginPath();
        ctx.arc(moon.x, moon.y, moon.radius, 0, Math.PI * 2);
        ctx.clip();

        const craterPos = [
            { x: 0.3, y: -0.2, r: 0.25 },
            { x: -0.2, y: 0.3, r: 0.2 },
            { x: 0.1, y: 0.1, r: 0.15 }
        ];

        craterPos.forEach(c => {
            ctx.beginPath();
            ctx.arc(
                moon.x + c.x * moon.radius,
                moon.y + c.y * moon.radius,
                c.r * moon.radius,
                0, Math.PI * 2
            );
            ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
            ctx.fill();
        });

        ctx.restore();

        // Rocket status indicator
        if (moon.rocketStatus) {
            ctx.beginPath();
            ctx.arc(moon.x, moon.y, moon.radius + 8, 0, Math.PI * 2);

            if (moon.rocketStatus === 'terraformed') {
                ctx.strokeStyle = '#10b981'; // Green
                ctx.lineWidth = 4;
            } else if (moon.rocketStatus === 'waiting') {
                ctx.strokeStyle = '#ffffff'; // White
                ctx.lineWidth = 4;
            }

            ctx.stroke();
        }

        // Highlight if hovered or connecting
        if (isHovered || isConnecting) {
            ctx.beginPath();
            ctx.arc(moon.x, moon.y, moon.radius + 4, 0, Math.PI * 2);
            ctx.strokeStyle = isConnecting ? '#f59e0b' : '#fff';
            ctx.lineWidth = 2;
            ctx.stroke();
        }

        // Draw stations
        this.drawStations(moon);

        // Name
        this.drawLabel(moon);
    }

    drawStations(moon) {
        if (!moon.stations || moon.stations.length === 0) return;

        const ctx = this.ctx;
        const total = moon.stations.length;

        // Draw orbit path
        ctx.beginPath();
        ctx.arc(moon.x, moon.y, moon.radius + 20, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.stroke();
        ctx.setLineDash([]);

        // Draw each station
        moon.stations.forEach((station, i) => {
            const pos = this.getStationPosition(moon, i, total);
            const isHovered = this.hoveringStation &&
                              this.hoveringStation.station.id === station.id;

            // Station glow
            const gradient = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, 12);
            gradient.addColorStop(0, 'rgba(255, 255, 255, 0.3)');
            gradient.addColorStop(1, 'transparent');
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, 12, 0, Math.PI * 2);
            ctx.fillStyle = gradient;
            ctx.fill();

            // Draw connecting line to moon
            ctx.beginPath();
            ctx.moveTo(moon.x, moon.y);
            ctx.lineTo(pos.x, pos.y);
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
            ctx.lineWidth = 1;
            ctx.stroke();

            // Station body
            ctx.save();
            ctx.translate(pos.x, pos.y);

            if (station.type === 'image') {
                // Draw image thumbnail
                const size = 16;
                let img = this.imageCache.get(station.id);

                if (!img) {
                    img = new Image();
                    img.src = station.data;
                    this.imageCache.set(station.id, img);
                }

                if (img.complete && img.naturalWidth > 0) {
                    // Clip to circle
                    ctx.beginPath();
                    ctx.arc(0, 0, size / 2, 0, Math.PI * 2);
                    ctx.clip();
                    ctx.drawImage(img, -size / 2, -size / 2, size, size);
                    ctx.restore();
                    ctx.save();
                    ctx.translate(pos.x, pos.y);
                } else {
                    // Fallback while loading
                    ctx.beginPath();
                    ctx.arc(0, 0, size / 2, 0, Math.PI * 2);
                    ctx.fillStyle = '#10b981';
                    ctx.fill();
                }

                // Border
                ctx.beginPath();
                ctx.arc(0, 0, size / 2, 0, Math.PI * 2);
                ctx.strokeStyle = isHovered ? '#fff' : 'rgba(255, 255, 255, 0.5)';
                ctx.lineWidth = isHovered ? 2 : 1;
                ctx.stroke();
            } else {
                // Color based on type
                const colors = {
                    video: '#f59e0b',
                    audio: '#6366f1',
                    note: '#ec4899'
                };
                const color = colors[station.type] || '#fff';

                // Draw station shape
                ctx.beginPath();
                if (station.type === 'video') {
                    // Triangle for video
                    ctx.moveTo(0, -6);
                    ctx.lineTo(6, 4);
                    ctx.lineTo(-6, 4);
                    ctx.closePath();
                } else if (station.type === 'audio') {
                    // Circle for audio
                    ctx.arc(0, 0, 5, 0, Math.PI * 2);
                } else {
                    // Diamond for notes
                    ctx.moveTo(0, -6);
                    ctx.lineTo(6, 0);
                    ctx.lineTo(0, 6);
                    ctx.lineTo(-6, 0);
                    ctx.closePath();
                }

                ctx.fillStyle = color;
                ctx.fill();

                // Hover effect
                if (isHovered) {
                    ctx.strokeStyle = '#fff';
                    ctx.lineWidth = 2;
                    ctx.stroke();
                }
            }

            ctx.restore();
        });
    }

    drawLabel(obj) {
        const ctx = this.ctx;
        const fontSizes = { sun: 28, planet: 24, moon: 18 };
        let fontSize = fontSizes[obj.type] || 18;

        // In galaxy view, make sun labels larger but proportional
        if (this.galaxyView && obj.type === 'sun') {
            fontSize = fontSize * 3.5; // Scale up for galaxy view (smaller than before)
        }

        ctx.font = `bold ${fontSize}px 'Segoe UI', sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Draw name in the CENTER/MIDDLE of the object
        let y = obj.y;

        // Text with black shadow for better readability
        ctx.shadowColor = '#000000';
        ctx.shadowBlur = this.galaxyView ? 12 : 8;
        ctx.shadowOffsetX = this.galaxyView ? 3 : 2;
        ctx.shadowOffsetY = this.galaxyView ? 3 : 2;
        ctx.fillStyle = '#ffffff';
        ctx.fillText(obj.name, obj.x, y);

        // For moons with deadline, draw the date below the name
        if (obj.type === 'moon' && obj.deadline && !this.galaxyView) {
            const dateFont = 12;
            ctx.font = `${dateFont}px 'Segoe UI', sans-serif`;
            const formattedDate = this.formatDeadlineShort(obj.deadline);
            const dateY = y + fontSize / 2 + dateFont + 4;
            ctx.fillStyle = this.getDeadlineColor(obj.deadline);
            ctx.fillText(formattedDate, obj.x, dateY);
        }

        // Reset shadow
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
    }

    formatDeadlineShort(deadline) {
        if (!deadline) return '';
        const date = new Date(deadline);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        return `${day}.${month}.`;
    }

    getDeadlineColor(deadline) {
        const daysUntil = this.getDaysUntilDeadline(deadline);

        if (daysUntil < 0) return '#ef4444'; // Überschritten - Rot
        if (daysUntil < 1) return '#ef4444'; // <24h - Rot
        if (daysUntil < 3) return '#f59e0b'; // 1-3 Tage - Orange
        if (daysUntil < 7) return '#fbbf24'; // 3-7 Tage - Gelb
        return '#ffffff'; // >7 Tage - Weiß (Normal)
    }

    getDeadlineColorClass(deadline) {
        const daysUntil = this.getDaysUntilDeadline(deadline);

        if (daysUntil < 0) return 'deadline-overdue'; // Überschritten
        if (daysUntil < 1) return 'deadline-urgent'; // <24h
        if (daysUntil < 3) return 'deadline-soon'; // 1-3 Tage
        if (daysUntil < 7) return 'deadline-warning'; // 3-7 Tage
        return 'deadline-normal'; // >7 Tage
    }

    getDaysUntilDeadline(deadline) {
        if (!deadline) return null;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const deadlineDate = new Date(deadline);
        deadlineDate.setHours(0, 0, 0, 0);
        const diffTime = deadlineDate - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    }

    drawParticles() {
        this.particles.forEach(p => {
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
            this.ctx.fillStyle = p.color;
            this.ctx.globalAlpha = p.life;
            this.ctx.fill();
            this.ctx.globalAlpha = 1;
        });
    }

    // Helpers
    getObjectById(id) {
        return this.suns.find(s => s.id === id) ||
               this.planets.find(p => p.id === id) ||
               this.moons.find(m => m.id === id);
    }

    lightenColor(hex, percent) {
        const num = parseInt(hex.slice(1), 16);
        const amt = Math.round(2.55 * percent);
        const R = Math.min(255, (num >> 16) + amt);
        const G = Math.min(255, ((num >> 8) & 0x00FF) + amt);
        const B = Math.min(255, (num & 0x0000FF) + amt);
        return `rgb(${R}, ${G}, ${B})`;
    }

    darkenColor(hex, percent) {
        const num = parseInt(hex.slice(1), 16);
        const amt = Math.round(2.55 * percent);
        const R = Math.max(0, (num >> 16) - amt);
        const G = Math.max(0, ((num >> 8) & 0x00FF) - amt);
        const B = Math.max(0, (num & 0x0000FF) - amt);
        return `rgb(${R}, ${G}, ${B})`;
    }

    // Retro List View
    updateRetroList() {
        const container = document.getElementById('retroList');
        if (!container) return;

        // Check if there are any objects
        if (this.suns.length === 0 && this.planets.length === 0 && this.moons.length === 0) {
            container.innerHTML = '<div class="retro-empty">Keine Objekte vorhanden</div>';
            return;
        }

        let html = '';

        // Build hierarchical structure based on connections
        // First, render suns with their connected planets
        this.suns.forEach(sun => {
            // Find planets connected to this sun
            const connectedPlanets = this.getChildrenOf(sun.id, 'planet');
            const hasChildren = connectedPlanets.length > 0;
            const isCollapsed = this.collapsedItems.has(sun.id);

            html += this.renderRetroItem(sun, 'sun', '☀', hasChildren);

            if (hasChildren) {
                html += `<div class="retro-children ${isCollapsed ? 'collapsed' : ''}" data-parent="${sun.id}">`;
                connectedPlanets.forEach(planet => {
                    // Find moons connected to this planet
                    const connectedMoons = this.getChildrenOf(planet.id, 'moon');
                    const planetHasChildren = connectedMoons.length > 0;
                    const isPlanetCollapsed = this.collapsedItems.has(planet.id);

                    html += this.renderRetroItem(planet, 'planet', '●', planetHasChildren);

                    if (planetHasChildren) {
                        html += `<div class="retro-children ${isPlanetCollapsed ? 'collapsed' : ''}" data-parent="${planet.id}">`;
                        connectedMoons.forEach(moon => {
                            html += this.renderRetroMoon(moon);
                        });
                        html += '</div>';
                    }
                });
                html += '</div>';
            }
        });

        // Render orphaned planets (not connected to any sun)
        const orphanedPlanets = this.planets.filter(planet =>
            !this.connections.some(c => c.to === planet.id && this.getObjectById(c.from)?.type === 'sun')
        );
        orphanedPlanets.forEach(planet => {
            // Find moons connected to this orphaned planet
            const connectedMoons = this.getChildrenOf(planet.id, 'moon');
            const hasChildren = connectedMoons.length > 0;
            const isCollapsed = this.collapsedItems.has(planet.id);

            html += this.renderRetroItem(planet, 'planet', '●', hasChildren);

            if (hasChildren) {
                html += `<div class="retro-children ${isCollapsed ? 'collapsed' : ''}" data-parent="${planet.id}">`;
                connectedMoons.forEach(moon => {
                    html += this.renderRetroMoon(moon);
                });
                html += '</div>';
            }
        });

        // Render orphaned moons (not connected to any planet)
        const orphanedMoons = this.moons.filter(moon =>
            !this.connections.some(c => c.to === moon.id && this.getObjectById(c.from)?.type === 'planet')
        );
        orphanedMoons.forEach(moon => {
            html += this.renderRetroMoon(moon);
        });

        container.innerHTML = html;

        // Attach event listeners
        this.attachRetroListeners();
    }

    getChildrenOf(parentId, childType) {
        const children = [];
        this.connections.forEach(conn => {
            if (conn.from === parentId) {
                const child = this.getObjectById(conn.to);
                if (child && child.type === childType) {
                    children.push(child);
                }
            }
        });
        return children;
    }

    isConnectedToSun(planetId) {
        return this.connections.some(conn =>
            (conn.from === planetId || conn.to === planetId) &&
            (this.suns.find(s => s.id === conn.from) || this.suns.find(s => s.id === conn.to))
        );
    }

    isConnectedToPlanet(moonId) {
        return this.connections.some(conn =>
            (conn.from === moonId || conn.to === moonId) &&
            (this.planets.find(p => p.id === conn.from) || this.planets.find(p => p.id === conn.to))
        );
    }

    getConnectedPlanets(sunId) {
        const planetIds = [];
        this.connections.forEach(conn => {
            if (conn.from === sunId) {
                const planet = this.planets.find(p => p.id === conn.to);
                if (planet) planetIds.push(planet.id);
            } else if (conn.to === sunId) {
                const planet = this.planets.find(p => p.id === conn.from);
                if (planet) planetIds.push(planet.id);
            }
        });
        return planetIds.map(id => this.planets.find(p => p.id === id));
    }

    getConnectedMoons(planetId) {
        const moonIds = [];
        this.connections.forEach(conn => {
            if (conn.from === planetId) {
                const moon = this.moons.find(m => m.id === conn.to);
                if (moon) moonIds.push(moon.id);
            } else if (conn.to === planetId) {
                const moon = this.moons.find(m => m.id === conn.from);
                if (moon) moonIds.push(moon.id);
            }
        });
        return moonIds.map(id => this.moons.find(m => m.id === id));
    }

    renderRetroItem(obj, type, icon, hasChildren = false) {
        // Determine what child can be added (sun -> planet, planet -> moon)
        const canAddChild = type === 'sun' || type === 'planet';
        const isCollapsed = this.collapsedItems.has(obj.id);
        const toggleIcon = hasChildren ? (isCollapsed ? '►' : '▼') : '';

        return `
            <div class="retro-item retro-${type}" data-id="${obj.id}" data-type="${type}">
                <div class="retro-item-header">
                    ${hasChildren ? `<span class="retro-toggle-icon" data-id="${obj.id}">${toggleIcon}</span>` : '<span class="retro-toggle-placeholder"></span>'}
                    <span class="retro-item-icon">${icon}</span>
                    <span class="retro-item-name">${obj.name}</span>
                    <div class="retro-item-actions">
                        ${canAddChild ? '<button class="retro-action retro-add-child" title="Hinzufügen">+</button>' : ''}
                        <button class="retro-action retro-focus" title="Fokus">◎</button>
                        <button class="retro-action retro-edit" title="Bearbeiten">✎</button>
                        <button class="retro-action retro-delete" title="Löschen">×</button>
                    </div>
                </div>
            </div>
        `;
    }

    renderRetroMoon(moon) {
        // Format deadline if exists
        const deadlineText = moon.deadline ? this.formatDeadlineShort(moon.deadline) : '';
        const deadlineClass = moon.deadline ? this.getDeadlineColorClass(moon.deadline) : '';

        let html = `
            <div class="retro-item retro-moon" data-id="${moon.id}" data-type="moon">
                <div class="retro-item-header">
                    <span class="retro-item-icon">◐</span>
                    <span class="retro-item-name">
                        ${moon.name}
                        ${deadlineText ? `<span class="retro-deadline ${deadlineClass}">${deadlineText}</span>` : ''}
                    </span>
                    <div class="retro-item-actions">
                        <button class="retro-action retro-focus" title="Fokus">◎</button>
                        <button class="retro-action retro-edit" title="Bearbeiten">✎</button>
                        <button class="retro-action retro-delete" title="Löschen">×</button>
                    </div>
                </div>
        `;

        // Render stations if any
        if (moon.stations && moon.stations.length > 0) {
            html += '<div class="retro-children">';
            moon.stations.forEach(station => {
                const stationIcons = { image: '▣', video: '▶', audio: '♪', note: '✉' };
                html += `
                    <div class="retro-item retro-station" data-id="${station.id}" data-moon-id="${moon.id}" data-type="station">
                        <div class="retro-item-header">
                            <span class="retro-item-icon">${stationIcons[station.type] || '◆'}</span>
                            <span class="retro-item-name">${station.name}</span>
                            <div class="retro-item-actions">
                                <button class="retro-action retro-view" title="Ansehen">👁</button>
                                <button class="retro-action retro-delete" title="Löschen">×</button>
                            </div>
                        </div>
                    </div>
                `;
            });
            html += '</div>';
        }

        html += '</div>';
        return html;
    }

    attachRetroListeners() {
        const container = document.getElementById('retroList');
        if (!container) return;

        // Toggle collapse/expand buttons
        container.querySelectorAll('.retro-toggle-icon').forEach(toggle => {
            toggle.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = parseInt(toggle.dataset.id);
                this.toggleCollapseItem(id);
            });
        });

        // Add child buttons
        container.querySelectorAll('.retro-add-child').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const item = btn.closest('.retro-item');
                const id = parseInt(item.dataset.id);
                const type = item.dataset.type;
                this.addChildToObject(id, type);
            });
        });

        // Focus buttons
        container.querySelectorAll('.retro-focus').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const item = btn.closest('.retro-item');
                const id = parseInt(item.dataset.id);
                this.focusOnObject(id);
            });
        });

        // Edit buttons
        container.querySelectorAll('.retro-edit').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const item = btn.closest('.retro-item');
                const id = parseInt(item.dataset.id);
                const obj = this.getObjectById(id);
                if (obj) this.showEditModal(obj);
            });
        });

        // Delete buttons
        container.querySelectorAll('.retro-delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const item = btn.closest('.retro-item');
                const id = parseInt(item.dataset.id);
                const type = item.dataset.type;

                if (type === 'station') {
                    const moonId = parseInt(item.dataset.moonId);
                    const moon = this.moons.find(m => m.id === moonId);
                    if (moon) {
                        moon.stations = moon.stations.filter(s => s.id !== id);
                        this.saveData();
                    }
                } else {
                    this.suns = this.suns.filter(s => s.id !== id);
                    this.planets = this.planets.filter(p => p.id !== id);
                    this.moons = this.moons.filter(m => m.id !== id);
                    this.connections = this.connections.filter(c => c.from !== id && c.to !== id);
                    this.saveData();
                }
            });
        });

        // View station buttons
        container.querySelectorAll('.retro-view').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const item = btn.closest('.retro-item');
                const id = parseInt(item.dataset.id);
                const moonId = parseInt(item.dataset.moonId);
                const moon = this.moons.find(m => m.id === moonId);
                if (moon) {
                    const station = moon.stations.find(s => s.id === id);
                    if (station) this.showPreviewModal(moon, station);
                }
            });
        });

        // Click on item header to focus
        container.querySelectorAll('.retro-item-header').forEach(header => {
            header.addEventListener('click', () => {
                const item = header.closest('.retro-item');
                const type = item.dataset.type;
                if (type !== 'station') {
                    const id = parseInt(item.dataset.id);
                    this.focusOnObject(id);
                }
            });
        });
    }

    focusOnObject(id) {
        const obj = this.getObjectById(id);
        if (!obj) return;

        // Center view on object
        this.offsetX = this.canvas.width / 2 - obj.x * this.scale;
        this.offsetY = this.canvas.height / 2 - obj.y * this.scale;

        // Highlight effect
        this.createParticles(obj.x, obj.y, 20);
    }

    toggleCollapseItem(id) {
        if (this.collapsedItems.has(id)) {
            this.collapsedItems.delete(id);
        } else {
            this.collapsedItems.add(id);
        }
        this.updateRetroList();
    }

    addChildToObject(parentId, parentType) {
        const parent = this.getObjectById(parentId);
        if (!parent) return;

        let childName = '';
        let childType = '';

        // Determine child type based on parent
        if (parentType === 'sun') {
            childName = prompt('Name des neuen Planeten:');
            childType = 'planet';
        } else if (parentType === 'planet') {
            childName = prompt('Name des neuen Mondes:');
            childType = 'moon';
        } else {
            return; // Moons can't have children
        }

        if (!childName || !childName.trim()) return;
        childName = childName.trim();

        // Create child object near parent
        const angle = Math.random() * Math.PI * 2;
        const distance = parent.radius + 100 + Math.random() * 50;
        const childX = parent.x + Math.cos(angle) * distance;
        const childY = parent.y + Math.sin(angle) * distance;

        let childObj;

        if (childType === 'planet') {
            const color = this.planetColors[Math.floor(Math.random() * this.planetColors.length)];
            childObj = {
                id: this.nextId++,
                type: 'planet',
                name: childName,
                x: childX,
                y: childY,
                radius: 40 + Math.random() * 20,
                color: color,
                rotation: Math.random() * Math.PI * 2,
                rotationSpeed: 0.001 + Math.random() * 0.002,
                status: 'normal'
            };
            this.planets.push(childObj);
        } else if (childType === 'moon') {
            // Use parent planet's color for new moon
            const color = parent.color;
            childObj = {
                id: this.nextId++,
                type: 'moon',
                name: childName,
                x: childX,
                y: childY,
                radius: 15 + Math.random() * 10,
                color: color,
                phase: Math.random() * Math.PI * 2,
                stations: [],
                rocketStatus: 'none',
                deadline: null  // Deadline für Mond
            };
            this.moons.push(childObj);
        }

        // Create connection between parent and child
        this.connections.push({
            from: parent.id,
            to: childObj.id
        });

        // Visual effects
        this.createParticles(childObj.x, childObj.y, 30);
        this.createParticles(parent.x, parent.y, 20);

        // Save and update
        this.saveData();
    }

    // Rocket Methods
    selectRocket(rocketElement) {
        // Remove active class from all rockets
        document.querySelectorAll('.rocket-item').forEach(r => r.classList.remove('active'));

        // Add active class to selected rocket
        rocketElement.classList.add('active');

        this.selectedRocket = {
            element: rocketElement,
            color: rocketElement.dataset.color,
            name: rocketElement.dataset.name,
            image: rocketElement.dataset.image
        };
    }

    flyRocketTo(target) {
        // If target is a moon with completed terraforming, remove the status
        if (target.type === 'moon' && target.rocketStatus === 'terraformed') {
            target.rocketStatus = null;
            this.createParticles(target.x, target.y, 20);
            this.updatePlanetStatuses();
            this.saveData();
        }

        // Add new rocket to the array - start from rocket selector (top right)
        this.flyingRockets.push({
            startX: window.innerWidth - 100,
            startY: 70,
            endX: target.x,
            endY: target.y,
            progress: 0,
            target: target,
            color: this.selectedRocket.color,
            name: this.selectedRocket.name,
            image: this.selectedRocket.image,
            orbiting: false,
            orbitAngle: 0
        });

        // Deselect rocket
        this.selectedRocket.element.classList.remove('active');
        this.selectedRocket = null;
    }

    updateFlyingRockets() {
        // Update all flying rockets
        this.flyingRockets = this.flyingRockets.filter(rocket => {
            if (rocket.returning) {
                // Returning to base
                rocket.returnProgress += 0.01;

                if (rocket.returnProgress >= 1) {
                    // Rocket arrived at base, remove it
                    this.createParticles(20, window.innerHeight / 2, 15);
                    return false; // Remove from array
                }
            } else if (!rocket.orbiting) {
                // Flying to target - slower speed (0.01 instead of 0.02)
                rocket.progress += 0.01;

                if (rocket.progress >= 1) {
                    // Rocket arrived, start orbiting
                    rocket.orbiting = true;
                    rocket.orbitAngle = 0;
                    this.createParticles(rocket.target.x, rocket.target.y, 20);
                }
            } else {
                // Orbiting around target - slower speed (0.015 instead of 0.03)
                rocket.orbitAngle += 0.015;
            }
            return true; // Keep in array
        });
    }

    drawFlyingRockets() {
        // Draw all flying rockets
        this.flyingRockets.forEach(rocket => {
            this.ctx.save();

            if (rocket.returning) {
                // Returning to base
                const { returnStartX, returnStartY, returnEndX, returnEndY, returnProgress, color } = rocket;

                // Convert to screen coordinates
                const screenStart = this.getScreenPos(returnStartX, returnStartY);
                const screenEnd = { x: returnEndX, y: returnEndY };

                // Interpolate position with parabolic arc
                const currentX = screenStart.x + (screenEnd.x - screenStart.x) * returnProgress;
                const currentY = screenStart.y + (screenEnd.y - screenStart.y) * returnProgress - Math.sin(returnProgress * Math.PI) * 100;

                // Calculate rotation angle for flight direction
                const dx = screenEnd.x - screenStart.x;
                const dy = screenEnd.y - screenStart.y;
                const angle = Math.atan2(dy, dx) + Math.PI / 2; // +90° to point right

                // Draw rocket image with rotation
                const img = this.imageCache.get(rocket.image);
                if (img && img.complete) {
                    this.ctx.save();
                    this.ctx.translate(currentX, currentY);
                    this.ctx.rotate(angle);
                    this.ctx.drawImage(img, -20, -20, 40, 40);
                    this.ctx.restore();
                } else {
                    // Fallback to emoji if image not loaded
                    this.ctx.font = '30px Arial';
                    this.ctx.fillText('🚀', currentX - 15, currentY + 15);
                }

                // Draw trail
                for (let i = 0; i < 5; i++) {
                    const trailProgress = Math.max(0, returnProgress - i * 0.05);
                    const trailX = screenStart.x + (screenEnd.x - screenStart.x) * trailProgress;
                    const trailY = screenStart.y + (screenEnd.y - screenStart.y) * trailProgress - Math.sin(trailProgress * Math.PI) * 100;

                    this.ctx.beginPath();
                    this.ctx.arc(trailX, trailY, 3, 0, Math.PI * 2);
                    this.ctx.fillStyle = color + Math.floor((1 - i * 0.2) * 255).toString(16).padStart(2, '0');
                    this.ctx.fill();
                }
            } else if (!rocket.orbiting) {
                // Flying to target
                const { startX, startY, endX, endY, progress, color } = rocket;

                // Convert to screen coordinates
                const screenStart = this.getScreenPos(startX / this.scale - this.offsetX / this.scale, startY / this.scale - this.offsetY / this.scale);
                const screenEnd = this.getScreenPos(endX, endY);

                // Interpolate position with parabolic arc
                const currentX = screenStart.x + (screenEnd.x - screenStart.x) * progress;
                const currentY = screenStart.y + (screenEnd.y - screenStart.y) * progress - Math.sin(progress * Math.PI) * 100;

                // Draw rocket image with rotation pointing in flight direction
                const img = this.imageCache.get(rocket.image);
                if (img && img.complete) {
                    // Calculate angle from start to end for rotation
                    const dx = screenEnd.x - screenStart.x;
                    const dy = screenEnd.y - screenStart.y;
                    const angle = Math.atan2(dy, dx) + Math.PI / 2; // +90° to point right

                    this.ctx.save();
                    this.ctx.translate(currentX, currentY);
                    this.ctx.rotate(angle);
                    this.ctx.drawImage(img, -20, -20, 40, 40);
                    this.ctx.restore();
                } else {
                    // Fallback to emoji if image not loaded
                    this.ctx.font = '30px Arial';
                    this.ctx.fillText('🚀', currentX - 15, currentY + 15);
                }

                // Draw trail
                for (let i = 0; i < 5; i++) {
                    const trailProgress = Math.max(0, progress - i * 0.05);
                    const trailX = screenStart.x + (screenEnd.x - screenStart.x) * trailProgress;
                    const trailY = screenStart.y + (screenEnd.y - screenStart.y) * trailProgress - Math.sin(trailProgress * Math.PI) * 100;

                    this.ctx.beginPath();
                    this.ctx.arc(trailX, trailY, 3, 0, Math.PI * 2);
                    this.ctx.fillStyle = color + Math.floor((1 - i * 0.2) * 255).toString(16).padStart(2, '0');
                    this.ctx.fill();
                }
            } else {
                // Orbiting around target - draw in world coordinates
                const { target, orbitAngle, color } = rocket;

                // Apply transformation
                this.ctx.translate(this.offsetX, this.offsetY);
                this.ctx.scale(this.scale, this.scale);

                // Calculate orbit position
                const orbitRadius = target.radius + 40;
                const rocketX = target.x + Math.cos(orbitAngle) * orbitRadius;
                const rocketY = target.y + Math.sin(orbitAngle) * orbitRadius;

                // Draw orbit path
                this.ctx.beginPath();
                this.ctx.arc(target.x, target.y, orbitRadius, 0, Math.PI * 2);
                this.ctx.strokeStyle = color + '40';
                this.ctx.lineWidth = 2 / this.scale;
                this.ctx.setLineDash([5 / this.scale, 5 / this.scale]);
                this.ctx.stroke();
                this.ctx.setLineDash([]);

                // Draw rocket with rotation
                this.ctx.save();
                this.ctx.translate(rocketX, rocketY);
                this.ctx.rotate(orbitAngle + Math.PI / 2);
                this.ctx.scale(1 / this.scale, 1 / this.scale);

                // Draw rocket image
                const img = this.imageCache.get(rocket.image);
                if (img && img.complete) {
                    this.ctx.drawImage(img, -20, -20, 40, 40);
                } else {
                    // Fallback to emoji if image not loaded
                    this.ctx.font = '30px Arial';
                    this.ctx.fillText('🚀', -15, 15);
                }

                this.ctx.restore();

                // Draw trail particles
                for (let i = 0; i < 3; i++) {
                    const trailAngle = orbitAngle - (i + 1) * 0.3;
                    const trailX = target.x + Math.cos(trailAngle) * orbitRadius;
                    const trailY = target.y + Math.sin(trailAngle) * orbitRadius;

                    this.ctx.beginPath();
                    this.ctx.arc(trailX, trailY, 3 / this.scale, 0, Math.PI * 2);
                    this.ctx.fillStyle = color + Math.floor((1 - i * 0.3) * 255).toString(16).padStart(2, '0');
                    this.ctx.fill();
                }
            }

            this.ctx.restore();
        });
    }

    // Canvas Drag and Drop
    handleCanvasDrop(e) {
        if (!e.dataTransfer.files.length) return;

        const pos = this.getMousePos(e);
        const moon = this.getMoonAt(pos.x, pos.y);

        if (!moon) {
            alert('Bitte ziehe die Datei auf einen Mond');
            return;
        }

        const file = e.dataTransfer.files[0];
        const reader = new FileReader();

        reader.onload = (event) => {
            const fileData = event.target.result;
            let stationType = 'note';

            if (file.type.startsWith('image/')) {
                stationType = 'image';
            } else if (file.type.startsWith('video/')) {
                stationType = 'video';
            } else if (file.type.startsWith('audio/')) {
                stationType = 'audio';
            }

            if (!moon.stations) {
                moon.stations = [];
            }

            moon.stations.push({
                id: this.nextId++,
                type: stationType,
                name: file.name,
                data: fileData
            });

            this.createParticles(moon.x, moon.y, 15);
            this.saveData();
        };

        reader.readAsDataURL(file);
        this.dropTarget = null;
    }

    getMoonAt(x, y) {
        for (const moon of this.moons) {
            const dist = Math.hypot(x - moon.x, y - moon.y);
            if (dist <= moon.radius) return moon;
        }
        return null;
    }

    // Undo/Redo functionality
    getCurrentState() {
        return {
            suns: JSON.parse(JSON.stringify(this.suns)),
            planets: JSON.parse(JSON.stringify(this.planets)),
            moons: JSON.parse(JSON.stringify(this.moons)),
            connections: JSON.parse(JSON.stringify(this.connections)),
            nextId: this.nextId
        };
    }

    pushHistory() {
        if (this.isRestoringState) return;

        // Remove any redo history when making a new change
        if (this.currentHistoryIndex < this.history.length - 1) {
            this.history = this.history.slice(0, this.currentHistoryIndex + 1);
        }

        // Add current state to history
        this.history.push(this.getCurrentState());

        // Limit history size
        if (this.history.length > this.maxHistory) {
            this.history.shift();
        } else {
            this.currentHistoryIndex++;
        }

        this.updateUndoRedoButtons();
    }

    restoreState(state) {
        this.isRestoringState = true;

        this.suns = JSON.parse(JSON.stringify(state.suns));
        this.planets = JSON.parse(JSON.stringify(state.planets));
        this.moons = JSON.parse(JSON.stringify(state.moons));
        this.connections = JSON.parse(JSON.stringify(state.connections));
        this.nextId = state.nextId;

        // Save to localStorage without creating history
        const data = {
            suns: this.suns,
            planets: this.planets,
            moons: this.moons,
            connections: this.connections,
            nextId: this.nextId
        };
        localStorage.setItem('orgaversum', JSON.stringify(data));
        this.updateRetroList();

        this.isRestoringState = false;
    }

    undo() {
        if (this.currentHistoryIndex > 0) {
            this.currentHistoryIndex--;
            this.restoreState(this.history[this.currentHistoryIndex]);
            this.updateUndoRedoButtons();
        }
    }

    redo() {
        if (this.currentHistoryIndex < this.history.length - 1) {
            this.currentHistoryIndex++;
            this.restoreState(this.history[this.currentHistoryIndex]);
            this.updateUndoRedoButtons();
        }
    }

    updateUndoRedoButtons() {
        const undoBtn = document.getElementById('undoBtn');
        const redoBtn = document.getElementById('redoBtn');

        undoBtn.disabled = this.currentHistoryIndex <= 0;
        redoBtn.disabled = this.currentHistoryIndex >= this.history.length - 1;
    }

    // Data persistence
    saveData() {
        // Push to history before saving
        if (!this.isRestoringState) {
            this.pushHistory();
        }

        const data = {
            suns: this.suns,
            planets: this.planets,
            moons: this.moons,
            connections: this.connections,
            nextId: this.nextId
        };
        localStorage.setItem('orgaversum', JSON.stringify(data));
        this.updateRetroList();
    }

    loadData() {
        const saved = localStorage.getItem('orgaversum');
        if (saved) {
            try {
                const data = JSON.parse(saved);
                this.suns = data.suns || [];
                this.planets = data.planets || [];
                this.moons = data.moons || [];
                this.connections = data.connections || [];
                this.nextId = data.nextId || 1;
            } catch (e) {
                console.error('Failed to load data:', e);
            }
        }
        this.updateRetroList();

        // Initialize history with current state
        this.history = [this.getCurrentState()];
        this.currentHistoryIndex = 0;
        this.updateUndoRedoButtons();
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    new Orgaversum();
});
