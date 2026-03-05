// ZENKAI  Animated Hex-Grid Background
// No comets, no stars, no embers.
// Pulsing hexagonal grid with gold / red energy waves.

let canvas, ctx, animId;
let hexes = [];
let W, H;

const HEX_SIZE = 38;
const SQRT3 = Math.sqrt(3);

class Hex {
    constructor(x, y, col, row) {
        this.cx = x;
        this.cy = y;
        this.col = col;
        this.row = row;
        this.phase = Math.random() * Math.PI * 2;
        this.speed = 0.18 + Math.random() * 0.22;
        this.baseAlpha = 0.028 + Math.random() * 0.03;
        this.isRed = Math.random() < 0.15;
        // occasional brighter feature hex
        this.bright = Math.random() < 0.04;
    }

    draw(t) {
        const pulse = Math.sin(t * this.speed + this.phase) * 0.5 + 0.5;
        let alpha;
        let r, g, b;

        if (this.bright) {
            alpha = 0.06 + pulse * 0.12;
            if (this.isRed) { r = 255; g = 20; b = 20; }
            else { r = 255; g = 210; b = 0; }
        } else {
            alpha = this.baseAlpha + pulse * 0.04;
            if (this.isRed) { r = 200; g = 10; b = 10; }
            else { r = 220; g = 170; b = 0; }
        }

        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const angle = (Math.PI / 3) * i - Math.PI / 6;
            const px = this.cx + HEX_SIZE * Math.cos(angle);
            const py = this.cy + HEX_SIZE * Math.sin(angle);
            i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.strokeStyle = `rgba(${r},${g},${b},${alpha})`;
        ctx.lineWidth = this.bright ? 1 : 0.6;
        ctx.stroke();

        // fill bright ones faintly
        if (this.bright) {
            ctx.fillStyle = `rgba(${r},${g},${b},${alpha * 0.12})`;
            ctx.fill();
        }
    }
}

// Wave scanline
class ScanLine {
    constructor() { this.reset(); }
    reset() {
        this.y = -30;
        this.speed = 0.4 + Math.random() * 0.5;
        this.alpha = 0.03 + Math.random() * 0.04;
        this.isRed = Math.random() < 0.3;
    }
    update() {
        this.y += this.speed;
        if (this.y > H + 30) this.reset();
    }
    draw() {
        if (!W) return;
        const color = this.isRed ? `rgba(200,20,0,${this.alpha})` : `rgba(255,200,0,${this.alpha})`;
        ctx.beginPath();
        ctx.moveTo(0, this.y);
        ctx.lineTo(W, this.y);
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.stroke();
    }
}

let scanLines = [];

function buildGrid() {
    hexes = [];
    const cols = Math.ceil(W / (HEX_SIZE * SQRT3)) + 2;
    const rows = Math.ceil(H / (HEX_SIZE * 1.5)) + 2;

    for (let row = -1; row < rows; row++) {
        for (let col = -1; col < cols; col++) {
            const offset = (col % 2 === 0) ? 0 : HEX_SIZE * 0.87;
            const x = col * HEX_SIZE * SQRT3 * 0.95;
            const y = row * HEX_SIZE * 1.52 + offset;
            hexes.push(new Hex(x, y, col, row));
        }
    }
}

export function initScene() {
    canvas = document.getElementById('bg-canvas');
    ctx = canvas.getContext('2d');

    function resize() {
        W = canvas.width = window.innerWidth;
        H = canvas.height = window.innerHeight;
        buildGrid();
    }
    resize();
    window.addEventListener('resize', resize);

    // create a handful of scan lines
    for (let i = 0; i < 4; i++) {
        const sl = new ScanLine();
        sl.y = Math.random() * H;
        scanLines.push(sl);
    }

    animate();
}

function animate() {
    animId = requestAnimationFrame(animate);
    const t = performance.now() / 1000;

    // Dark base
    ctx.fillStyle = '#080808';
    ctx.fillRect(0, 0, W, H);

    // Center radial vignette  very subtle red warmth
    const grd = ctx.createRadialGradient(W * 0.5, H * 0.5, 0, W * 0.5, H * 0.5, W * 0.7);
    grd.addColorStop(0, 'rgba(40, 3, 0, 0.18)');
    grd.addColorStop(0.6, 'rgba(20, 0, 0, 0.1)');
    grd.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, W, H);

    // Hex grid
    for (const h of hexes) h.draw(t);

    // Scan lines
    for (const sl of scanLines) { sl.update(); sl.draw(); }
}

export function destroyScene() {
    if (animId) cancelAnimationFrame(animId);
}