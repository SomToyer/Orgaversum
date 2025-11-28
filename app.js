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
        this.connectMode = false;
        this.connectFirst = null;
        this.mousePos = { x: 0, y: 0 };

        // Zoom and pan state
        this.scale = 1;
        this.offsetX = 0;
        this.offsetY = 0;
        this.isPanning = false;
        this.lastPanPos = { x: 0, y: 0 };

        // Station state
        this.currentStationType = null;
        this.currentStationFile = null;
        this.previewingStation = null;
        this.previewingMoon = null;

        // Animation
        this.time = 0;
        this.particles = [];

        // Rocket state
        this.selectedRocket = null;
        this.flyingRocket = null;
        this.rocketTarget = null;

        // Drag and drop state
        this.draggedFile = null;
        this.dropTarget = null;

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
        this.loadData();
        this.setupEventListeners();
        this.animate();
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

        // Buttons
        document.getElementById('addSun').addEventListener('click', () => this.showModal('sun'));
        document.getElementById('addPlanet').addEventListener('click', () => this.showModal('planet'));
        document.getElementById('addMoon').addEventListener('click', () => this.showModal('moon'));
        document.getElementById('toggleConnect').addEventListener('click', () => this.toggleConnectMode());
        document.getElementById('clearAll').addEventListener('click', () => this.clearAll());

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

        // Check for station click first
        const stationClick = this.getStationAt(pos.x, pos.y);
        if (stationClick) {
            this.showPreviewModal(stationClick.moon, stationClick.station);
            return;
        }

        const obj = this.getObjectAt(pos.x, pos.y);

        if (this.connectMode && obj) {
            this.handleConnect(obj);
        } else if (obj) {
            this.dragging = obj;
            this.dragging.offsetX = pos.x - obj.x;
            this.dragging.offsetY = pos.y - obj.y;
        } else {
            // Pan when clicking on empty space
            this.isPanning = true;
            this.lastPanPos = { x: screenX, y: screenY };
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

        if (this.dragging) {
            this.dragging.x = pos.x - this.dragging.offsetX;
            this.dragging.y = pos.y - this.dragging.offsetY;
            this.saveData();
        } else {
            // Check for station hover
            const stationHover = this.getStationAt(pos.x, pos.y);
            this.hoveringStation = stationHover;

            this.hovering = this.getObjectAt(pos.x, pos.y);
            this.canvas.style.cursor = (this.hovering || this.hoveringStation) ? 'pointer' : 'grab';
        }
    }

    onMouseUp() {
        this.dragging = null;
        this.isPanning = false;
    }

    onDoubleClick(e) {
        const pos = this.getMousePos(e);
        const obj = this.getObjectAt(pos.x, pos.y);

        if (obj) {
            this.showEditModal(obj);
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

        // Zoom factor
        const zoomIntensity = 0.1;
        const delta = e.deltaY > 0 ? -zoomIntensity : zoomIntensity;
        const newScale = Math.max(0.1, Math.min(5, this.scale * (1 + delta)));

        // Zoom towards mouse position
        const worldX = (mouseX - this.offsetX) / this.scale;
        const worldY = (mouseY - this.offsetY) / this.scale;

        this.scale = newScale;

        this.offsetX = mouseX - worldX * this.scale;
        this.offsetY = mouseY - worldY * this.scale;
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
        const angleOffset = (Math.PI * 2 / total) * index;
        const angle = this.time * 0.5 + angleOffset;

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
            }

            this.createParticles(obj.x, obj.y, 20);
            this.connectFirst = null;
            this.saveData();
        }
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

        input.value = obj.name;
        colorPicker.value = obj.color.main;

        modal.classList.remove('hidden');
        input.focus();
        input.select();

        // Show station controls only for moons
        if (obj.type === 'moon') {
            stationControls.classList.remove('hidden');
        } else {
            stationControls.classList.add('hidden');
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
        this.editingObj.color = {
            main: colorValue,
            glow: this.hexToRgba(colorValue, 0.3)
        };

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

    // Create objects
    addSun(name) {
        const sunColors = [
            { main: '#fbbf24', glow: 'rgba(251, 191, 36, 0.4)' },
            { main: '#f59e0b', glow: 'rgba(245, 158, 11, 0.4)' },
            { main: '#fb923c', glow: 'rgba(251, 146, 60, 0.4)' },
        ];
        const color = sunColors[Math.floor(Math.random() * sunColors.length)];
        const sun = {
            id: this.nextId++,
            type: 'sun',
            name: name,
            x: 150 + Math.random() * (this.canvas.width - 300),
            y: 150 + Math.random() * (this.canvas.height - 300),
            radius: 60 + Math.random() * 30,
            color: color,
            pulsePhase: Math.random() * Math.PI * 2
        };

        this.suns.push(sun);
        this.createParticles(sun.x, sun.y, 40);
        this.saveData();
    }

    addPlanet(name) {
        const color = this.planetColors[Math.floor(Math.random() * this.planetColors.length)];
        const planet = {
            id: this.nextId++,
            type: 'planet',
            name: name,
            x: 150 + Math.random() * (this.canvas.width - 300),
            y: 150 + Math.random() * (this.canvas.height - 300),
            radius: 40 + Math.random() * 20,
            color: color,
            rotation: Math.random() * Math.PI * 2,
            rotationSpeed: 0.001 + Math.random() * 0.002
        };

        this.planets.push(planet);
        this.createParticles(planet.x, planet.y, 30);
        this.saveData();
    }

    addMoon(name) {
        const color = this.moonColors[Math.floor(Math.random() * this.moonColors.length)];
        const moon = {
            id: this.nextId++,
            type: 'moon',
            name: name,
            x: 150 + Math.random() * (this.canvas.width - 300),
            y: 150 + Math.random() * (this.canvas.height - 300),
            radius: 15 + Math.random() * 10,
            color: color,
            phase: Math.random() * Math.PI * 2,
            stations: []
        };

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
        this.updateFlyingRocket();
        this.draw();
        requestAnimationFrame(() => this.animate());
    }

    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Apply zoom transformation
        this.ctx.save();
        this.ctx.translate(this.offsetX, this.offsetY);
        this.ctx.scale(this.scale, this.scale);

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

        // Restore transformation
        this.ctx.restore();

        // Draw flying rocket (in screen space)
        this.drawFlyingRocket();

        // Draw zoom indicator (in screen space)
        this.drawZoomIndicator();
    }

    drawZoomIndicator() {
        if (this.scale === 1) return;

        const ctx = this.ctx;
        const text = `${Math.round(this.scale * 100)}%`;

        ctx.font = '12px "Segoe UI", sans-serif';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'bottom';

        const padding = 8;
        const x = this.canvas.width - 20;
        const y = this.canvas.height - 20;

        // Background
        const metrics = ctx.measureText(text);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
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

    drawSun(sun) {
        const ctx = this.ctx;
        const isHovered = this.hovering === sun;
        const isConnecting = this.connectFirst === sun;

        // Pulsing effect
        const pulse = Math.sin(this.time * 2 + sun.pulsePhase) * 0.1 + 1;

        // Outer glow (corona)
        const coronaSize = sun.radius * 0.8;
        for (let i = 3; i >= 0; i--) {
            const gradient = ctx.createRadialGradient(
                sun.x, sun.y, sun.radius * 0.5,
                sun.x, sun.y, sun.radius + coronaSize * (i + 1) * 0.3 * pulse
            );
            gradient.addColorStop(0, `rgba(255, 200, 50, ${0.3 - i * 0.07})`);
            gradient.addColorStop(1, 'transparent');

            ctx.beginPath();
            ctx.arc(sun.x, sun.y, sun.radius + coronaSize * (i + 1) * 0.3 * pulse, 0, Math.PI * 2);
            ctx.fillStyle = gradient;
            ctx.fill();
        }

        // Sun body
        const bodyGradient = ctx.createRadialGradient(
            sun.x - sun.radius * 0.2, sun.y - sun.radius * 0.2, 0,
            sun.x, sun.y, sun.radius
        );
        bodyGradient.addColorStop(0, '#fff5e0');
        bodyGradient.addColorStop(0.3, sun.color.main);
        bodyGradient.addColorStop(0.7, this.darkenColor(sun.color.main, 10));
        bodyGradient.addColorStop(1, this.darkenColor(sun.color.main, 30));

        ctx.beginPath();
        ctx.arc(sun.x, sun.y, sun.radius, 0, Math.PI * 2);
        ctx.fillStyle = bodyGradient;
        ctx.fill();

        // Solar flares
        ctx.save();
        ctx.translate(sun.x, sun.y);
        for (let i = 0; i < 8; i++) {
            const angle = (Math.PI * 2 / 8) * i + this.time * 0.2;
            const flareLength = sun.radius * 0.3 * (Math.sin(this.time * 3 + i) * 0.3 + 0.7);

            ctx.beginPath();
            ctx.moveTo(
                Math.cos(angle) * sun.radius * 0.9,
                Math.sin(angle) * sun.radius * 0.9
            );
            ctx.lineTo(
                Math.cos(angle) * (sun.radius + flareLength),
                Math.sin(angle) * (sun.radius + flareLength)
            );
            ctx.strokeStyle = `rgba(255, 200, 100, ${0.5 + Math.sin(this.time * 3 + i) * 0.3})`;
            ctx.lineWidth = 3;
            ctx.stroke();
        }
        ctx.restore();

        // Highlight if hovered or connecting
        if (isHovered || isConnecting) {
            ctx.beginPath();
            ctx.arc(sun.x, sun.y, sun.radius + 8, 0, Math.PI * 2);
            ctx.strokeStyle = isConnecting ? '#f59e0b' : '#fff';
            ctx.lineWidth = 3;
            ctx.stroke();
        }

        // Name
        this.drawLabel(sun);
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
                const progress = (this.time * 0.5) % 1;
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
    }

    drawMoon(moon) {
        const ctx = this.ctx;
        const isHovered = this.hovering === moon;
        const isConnecting = this.connectFirst === moon;

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
        const fontSize = fontSizes[obj.type] || 18;

        ctx.font = `bold ${fontSize}px 'Segoe UI', sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Draw name in the CENTER/MIDDLE of the object
        const y = obj.y;

        // Background
        const metrics = ctx.measureText(obj.name);
        const padding = 8;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(
            obj.x - metrics.width / 2 - padding,
            y - fontSize / 2 - padding / 2,
            metrics.width + padding * 2,
            fontSize + padding
        );

        // Text with glow
        ctx.shadowColor = obj.color.main;
        ctx.shadowBlur = 10;
        ctx.fillStyle = '#fff';
        ctx.fillText(obj.name, obj.x, y);
        ctx.shadowBlur = 0;
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

        // Render suns
        this.suns.forEach(sun => {
            html += this.renderRetroItem(sun, 'sun', '☀');
        });

        // Render planets
        this.planets.forEach(planet => {
            html += this.renderRetroItem(planet, 'planet', '●');
        });

        // Render moons with their stations
        this.moons.forEach(moon => {
            html += this.renderRetroMoon(moon);
        });

        container.innerHTML = html;

        // Attach event listeners
        this.attachRetroListeners();
    }

    renderRetroItem(obj, type, icon) {
        return `
            <div class="retro-item retro-${type}" data-id="${obj.id}" data-type="${type}">
                <div class="retro-item-header">
                    <span class="retro-item-icon">${icon}</span>
                    <span class="retro-item-name">${obj.name}</span>
                    <div class="retro-item-actions">
                        <button class="retro-action retro-focus" title="Fokus">◎</button>
                        <button class="retro-action retro-edit" title="Bearbeiten">✎</button>
                        <button class="retro-action retro-delete" title="Löschen">×</button>
                    </div>
                </div>
            </div>
        `;
    }

    renderRetroMoon(moon) {
        let html = `
            <div class="retro-item retro-moon" data-id="${moon.id}" data-type="moon">
                <div class="retro-item-header">
                    <span class="retro-item-icon">◐</span>
                    <span class="retro-item-name">${moon.name}</span>
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

    // Rocket Methods
    selectRocket(rocketElement) {
        // Remove active class from all rockets
        document.querySelectorAll('.rocket-item').forEach(r => r.classList.remove('active'));

        // Add active class to selected rocket
        rocketElement.classList.add('active');

        this.selectedRocket = {
            element: rocketElement,
            color: rocketElement.dataset.color
        };
    }

    flyRocketTo(target) {
        this.flyingRocket = {
            startX: 20,
            startY: window.innerHeight / 2,
            endX: target.x,
            endY: target.y,
            progress: 0,
            target: target,
            color: this.selectedRocket.color
        };

        // Deselect rocket
        this.selectedRocket.element.classList.remove('active');
        this.selectedRocket = null;
    }

    updateFlyingRocket() {
        if (!this.flyingRocket) return;

        this.flyingRocket.progress += 0.02;

        if (this.flyingRocket.progress >= 1) {
            // Rocket arrived, open edit modal
            this.showEditModal(this.flyingRocket.target);
            this.flyingRocket = null;
        }
    }

    drawFlyingRocket() {
        if (!this.flyingRocket) return;

        const { startX, startY, endX, endY, progress, color } = this.flyingRocket;

        // Convert to screen coordinates
        const screenStart = this.getScreenPos(startX / this.scale - this.offsetX / this.scale, startY / this.scale - this.offsetY / this.scale);
        const screenEnd = this.getScreenPos(endX, endY);

        // Interpolate position with parabolic arc
        const currentX = screenStart.x + (screenEnd.x - screenStart.x) * progress;
        const currentY = screenStart.y + (screenEnd.y - screenStart.y) * progress - Math.sin(progress * Math.PI) * 100;

        // Draw rocket
        this.ctx.save();
        this.ctx.font = '30px Arial';
        this.ctx.fillText('🚀', currentX - 15, currentY + 15);

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

        this.ctx.restore();
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

    // Data persistence methods
    async saveData() {
        try {
            const data = {
                suns: this.suns,
                planets: this.planets,
                moons: this.moons,
                connections: this.connections,
                nextId: this.nextId
            };

            const response = await fetch('http://localhost:3000/api/state', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (!result.success) {
                console.error('Fehler beim Speichern:', result.error);
            }

            // Auch im localStorage speichern als Fallback
            localStorage.setItem('orgaversum', JSON.stringify(data));

            // Update retro list
            this.updateRetroList();
        } catch (error) {
            console.error('Fehler beim Speichern:', error);
            // Fallback zu localStorage wenn Server nicht erreichbar
            try {
                const data = {
                    suns: this.suns,
                    planets: this.planets,
                    moons: this.moons,
                    connections: this.connections,
                    nextId: this.nextId
                };
                localStorage.setItem('orgaversum', JSON.stringify(data));
                this.updateRetroList();
            } catch (e) {
                console.error('Fehler beim localStorage-Fallback:', e);
            }
        }
    }

    async loadData() {
        try {
            // Versuche zuerst vom Server zu laden
            const response = await fetch('http://localhost:3000/api/state');
            const result = await response.json();

            if (result.success && result.data) {
                const data = result.data;
                this.suns = data.suns || [];
                this.planets = data.planets || [];
                this.moons = data.moons || [];
                this.connections = data.connections || [];
                this.nextId = data.nextId || 1;

                console.log('✓ Daten vom Server geladen');
                this.updateRetroList();
                return;
            }
        } catch (error) {
            console.log('Server nicht erreichbar, lade aus localStorage...');
        }

        // Fallback zu localStorage
        try {
            const saved = localStorage.getItem('orgaversum');
            if (saved) {
                const data = JSON.parse(saved);
                this.suns = data.suns || [];
                this.planets = data.planets || [];
                this.moons = data.moons || [];
                this.connections = data.connections || [];
                this.nextId = data.nextId || 1;

                console.log('✓ Daten aus localStorage geladen');
                this.updateRetroList();
            }
        } catch (error) {
            console.error('Fehler beim Laden aus localStorage:', error);
        }
    }
}

// Initialize the app
window.addEventListener('DOMContentLoaded', () => {
    new Orgaversum();
});

