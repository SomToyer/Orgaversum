// Orgaversum - Todo Planeten Abenteuer

class Orgaversum {
    constructor() {
        this.canvas = document.getElementById('universe');
        this.ctx = this.canvas.getContext('2d');

        // Data
        this.planets = [];
        this.moons = [];
        this.connections = [];
        this.nextId = 1;

        // Interaction state
        this.dragging = null;
        this.hovering = null;
        this.connectMode = false;
        this.connectFirst = null;
        this.mousePos = { x: 0, y: 0 };

        // Animation
        this.time = 0;
        this.particles = [];

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

        // Touch events
        this.canvas.addEventListener('touchstart', (e) => this.onTouchStart(e));
        this.canvas.addEventListener('touchmove', (e) => this.onTouchMove(e));
        this.canvas.addEventListener('touchend', () => this.onMouseUp());

        // Buttons
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
    }

    // Mouse/Touch Handlers
    onMouseDown(e) {
        const pos = this.getMousePos(e);
        const obj = this.getObjectAt(pos.x, pos.y);

        if (this.connectMode && obj) {
            this.handleConnect(obj);
        } else if (obj) {
            this.dragging = obj;
            this.dragging.offsetX = pos.x - obj.x;
            this.dragging.offsetY = pos.y - obj.y;
        }
    }

    onMouseMove(e) {
        const pos = this.getMousePos(e);
        this.mousePos = pos;

        if (this.dragging) {
            this.dragging.x = pos.x - this.dragging.offsetX;
            this.dragging.y = pos.y - this.dragging.offsetY;
            this.saveData();
        } else {
            this.hovering = this.getObjectAt(pos.x, pos.y);
            this.canvas.style.cursor = this.hovering ? 'pointer' : 'grab';
        }
    }

    onMouseUp() {
        this.dragging = null;
    }

    onDoubleClick(e) {
        const pos = this.getMousePos(e);
        const obj = this.getObjectAt(pos.x, pos.y);

        if (obj) {
            this.showEditModal(obj);
        }
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
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
    }

    getObjectAt(x, y) {
        // Check moons first (smaller, on top)
        for (const moon of this.moons) {
            const dist = Math.hypot(x - moon.x, y - moon.y);
            if (dist <= moon.radius) return moon;
        }

        // Then planets
        for (const planet of this.planets) {
            const dist = Math.hypot(x - planet.x, y - planet.y);
            if (dist <= planet.radius) return planet;
        }

        return null;
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

        title.textContent = type === 'planet' ? 'Neuer Planet' : 'Neuer Mond';
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

        if (this.modalType === 'planet') {
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

        input.value = obj.name;
        modal.classList.remove('hidden');
        input.focus();
        input.select();
    }

    hideEditModal() {
        document.getElementById('editModal').classList.add('hidden');
        this.editingObj = null;
    }

    confirmEdit() {
        if (!this.editingObj) return;

        const name = document.getElementById('editNameInput').value.trim();
        if (name) {
            this.editingObj.name = name;
            this.saveData();
        }

        this.hideEditModal();
    }

    deleteSelected() {
        if (!this.editingObj) return;

        const id = this.editingObj.id;

        // Remove from planets or moons
        this.planets = this.planets.filter(p => p.id !== id);
        this.moons = this.moons.filter(m => m.id !== id);

        // Remove connections
        this.connections = this.connections.filter(c => c.from !== id && c.to !== id);

        this.createParticles(this.editingObj.x, this.editingObj.y, 30);
        this.hideEditModal();
        this.saveData();
    }

    // Create objects
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
            phase: Math.random() * Math.PI * 2
        };

        this.moons.push(moon);
        this.createParticles(moon.x, moon.y, 20);
        this.saveData();
    }

    clearAll() {
        if (this.planets.length === 0 && this.moons.length === 0) return;

        if (confirm('Wirklich alles löschen?')) {
            // Create particles for all objects
            [...this.planets, ...this.moons].forEach(obj => {
                this.createParticles(obj.x, obj.y, 15);
            });

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
        this.draw();
        requestAnimationFrame(() => this.animate());
    }

    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw connections
        this.drawConnections();

        // Draw connect preview line
        if (this.connectMode && this.connectFirst) {
            this.ctx.beginPath();
            this.ctx.moveTo(this.connectFirst.x, this.connectFirst.y);
            this.ctx.lineTo(this.mousePos.x, this.mousePos.y);
            this.ctx.strokeStyle = 'rgba(245, 158, 11, 0.5)';
            this.ctx.lineWidth = 2;
            this.ctx.setLineDash([5, 5]);
            this.ctx.stroke();
            this.ctx.setLineDash([]);
        }

        // Draw planets
        this.planets.forEach(planet => this.drawPlanet(planet));

        // Draw moons
        this.moons.forEach(moon => this.drawMoon(moon));

        // Draw particles
        this.drawParticles();
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

        // Name
        this.drawLabel(moon);
    }

    drawLabel(obj) {
        const ctx = this.ctx;
        const fontSize = obj.type === 'planet' ? 12 : 10;

        ctx.font = `${fontSize}px 'Segoe UI', sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';

        const y = obj.y + obj.radius + 8;

        // Background
        const metrics = ctx.measureText(obj.name);
        const padding = 4;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(
            obj.x - metrics.width / 2 - padding,
            y - 2,
            metrics.width + padding * 2,
            fontSize + padding
        );

        // Text
        ctx.fillStyle = '#fff';
        ctx.fillText(obj.name, obj.x, y);
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
        return this.planets.find(p => p.id === id) || this.moons.find(m => m.id === id);
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

    // Data persistence
    saveData() {
        const data = {
            planets: this.planets,
            moons: this.moons,
            connections: this.connections,
            nextId: this.nextId
        };
        localStorage.setItem('orgaversum', JSON.stringify(data));
    }

    loadData() {
        const saved = localStorage.getItem('orgaversum');
        if (saved) {
            try {
                const data = JSON.parse(saved);
                this.planets = data.planets || [];
                this.moons = data.moons || [];
                this.connections = data.connections || [];
                this.nextId = data.nextId || 1;
            } catch (e) {
                console.error('Failed to load data:', e);
            }
        }
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    new Orgaversum();
});
