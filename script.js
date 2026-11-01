import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

// --- CONFIGURATION & STATE ---
let config = {};
let scene, camera, renderer, composer;
let characterGroup, portalMesh, groundMesh;
let scrollPos = 0;
let targetScrollPos = 0;

// Pre-allocated THREE.Color objects for animate loop (avoids per-frame allocation)
const COLOR_BG_START   = new THREE.Color(0x0f0c29);
const COLOR_BG_END     = new THREE.Color(0x00ffff);
const COLOR_FOG_START  = new THREE.Color(0x1a1a2e);
const COLOR_FOG_END    = new THREE.Color(0x00ffff);

// Total journey length in world units
const totalLength = 390;

let mouse = new THREE.Vector2();
let windowHalfX = window.innerWidth / 2;
let windowHalfY = window.innerHeight / 2;
let isGameActive = false;
let speechBubble;

// ZONES — each zone occupies a range of world-Z positions
const zones = [
    { id: 'intro',          start: 0,    end: -25,  title: 'INTRO' },
    { id: 'about',          start: -25,  end: -65,  title: 'ABOUT ME' },
    { id: 'experience',     start: -65,  end: -90,  title: 'EXPERIENCE' },
    { id: 'community',      start: -90,  end: -115, title: 'WORK & COMMUNITY' },
    { id: 'projects',       start: -115, end: -175, title: 'PROJECTS' },
    { id: 'skills',         start: -175, end: -225, title: 'SKILLS' },
    { id: 'education',      start: -225, end: -265, title: 'EDUCATION' },
    { id: 'certifications', start: -265, end: -330, title: 'CERTIFICATIONS' },
    // Contact zone starts immediately when certifications end
    { id: 'contact',        start: -330, end: -500, title: 'CONTACT' }
];

// --- MATH & UTILS ---
const getPathX = (z) => Math.sin(z * 0.05) * 12 + Math.sin(z * 0.02) * 5;

function createAnimeMaterial(color) {
    const format = THREE.RGBAFormat;
    const colors = new Uint8Array([
        60, 60, 60, 255,
        128, 128, 128, 255,
        230, 230, 230, 255
    ]);
    const gradientMap = new THREE.DataTexture(colors, 3, 1, format);
    gradientMap.needsUpdate = true;
    gradientMap.minFilter = THREE.NearestFilter;
    gradientMap.magFilter = THREE.NearestFilter;
    return new THREE.MeshToonMaterial({ color: color, gradientMap: gradientMap });
}

function addOutline(mesh, thickness = 0.02, color = 0x000000) {
    const outlineMaterial = new THREE.MeshBasicMaterial({ color: color, side: THREE.BackSide });
    const outlineMesh = new THREE.Mesh(mesh.geometry, outlineMaterial);
    outlineMesh.scale.multiplyScalar(1 + thickness);
    mesh.add(outlineMesh);
    return outlineMesh;
}

// --- INITIALIZATION ---
async function init() {
    try {
        const response = await fetch('config.json');
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        config = await response.json();
    } catch (e) {
        console.error("Failed to load config.json:", e);
        // Provide a minimal fallback so the app doesn't crash
        config = {
            personal: { name: 'Sagar Gupta', title: 'Full Stack Developer', bio: [''], stats: [], intro_text: ['SYSTEM READY'] },
            experience: [], projects: [], skills: [], education: [], certifications: [],
            contact: { greeting: "Let's Connect", message: '', links: [] }
        };
    }

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0f0c29);
    scene.fog = new THREE.FogExp2(0x1a1a2e, 0.008);

    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 2000);
    camera.position.set(0, 4, 10);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    document.getElementById('canvas-container').appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(50, 100, 50);
    scene.add(dirLight);

    createEnvironment();
    createCharacter();
    populateZones();
    createParticles();

    const renderScene = new RenderPass(scene, camera);
    const bloomPass = new UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight), 1.5, 0.4, 0.85
    );
    bloomPass.threshold = 0.2;
    bloomPass.strength  = 1.2;
    bloomPass.radius    = 0.5;

    composer = new EffectComposer(renderer);
    composer.addPass(renderScene);
    composer.addPass(bloomPass);

    window.addEventListener('resize', onWindowResize);
    window.addEventListener('wheel', onScroll);
    // FIX: touchstart sets the initial Y so the first touchmove delta is correct
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    document.addEventListener('mousemove', onMouseMove);

    initUI();
    document.getElementById('loader').style.opacity = 0;
    setTimeout(() => document.getElementById('loader').style.display = 'none', 500);

    playIntro();
    animate();
}

// --- INTRO ---
function playIntro() {
    const textContainer = document.getElementById('terminal-text');
    const startBtn = document.getElementById('start-btn');
    const lines = config.personal?.intro_text || ['SYSTEM READY'];
    let lineIndex = 0;
    let charIndex = 0;

    function typeLine() {
        if (lineIndex < lines.length) {
            if (charIndex < lines[lineIndex].length) {
                if (charIndex === 0) textContainer.innerHTML += `<div></div>`;
                textContainer.lastElementChild.innerHTML += lines[lineIndex].charAt(charIndex);
                charIndex++;
                setTimeout(typeLine, 30);
            } else {
                lineIndex++;
                charIndex = 0;
                setTimeout(typeLine, 300);
            }
        } else {
            startBtn.classList.remove('hidden');
            startBtn.classList.add('visible');
        }
    }
    typeLine();

    startBtn.addEventListener('click', () => {
        document.getElementById('intro-overlay').style.display = 'none';
        document.getElementById('ui-layer').classList.remove('hidden');
        isGameActive = true;
        camera.position.set(0, 6, 15);
    });
}

// --- WORLD ---
function createEnvironment() {
    const skyGeo = new THREE.SphereGeometry(400, 32, 15);
    const skyMat = new THREE.MeshBasicMaterial({ color: 0x0f0c29, side: THREE.BackSide });
    const sky = new THREE.Mesh(skyGeo, skyMat);
    scene.add(sky);

    // Reduced Z subdivisions (500 instead of 2000) for significantly better init performance
    const groundGeo = new THREE.PlaneGeometry(60, 2000, 50, 500);
    groundGeo.rotateX(-Math.PI / 2);
    const posAttribute = groundGeo.attributes.position;
    for (let i = 0; i < posAttribute.count; i++) {
        const x = posAttribute.getX(i);
        const z = posAttribute.getZ(i);
        const pathX = getPathX(z);
        posAttribute.setX(i, x + pathX);
        posAttribute.setY(i, Math.sin(x * 0.2) * 0.5 + Math.cos(z * 0.1) * 0.5);
    }
    const groundMat = createAnimeMaterial(0x636e72);
    groundMesh = new THREE.Mesh(groundGeo, groundMat);
    groundMesh.position.z = -500;
    addOutline(groundMesh, 0.005, 0x5555ff);
    scene.add(groundMesh);
}

function createCharacter() {
    characterGroup = new THREE.Group();
    const s = 1.5;
    const grayMat = createAnimeMaterial(0x34495e);  
    const blackMat = createAnimeMaterial(0x111111); 
    const skinMat = createAnimeMaterial(0xffdcb6);  
    const yellowMat = createAnimeMaterial(0xf1c40f); 

    const headGroup = new THREE.Group();
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.5*s, 0.4*s, 0.5*s), blackMat);
    addOutline(head); headGroup.add(head);
    const earL = new THREE.Mesh(new THREE.ConeGeometry(0.08*s, 0.2*s, 4), blackMat);
    earL.position.set(-0.15*s, 0.25*s, 0); earL.rotation.y = Math.PI/4; addOutline(earL);
    const earR = new THREE.Mesh(new THREE.ConeGeometry(0.08*s, 0.2*s, 4), blackMat);
    earR.position.set(0.15*s, 0.25*s, 0); earR.rotation.y = Math.PI/4; addOutline(earR);
    headGroup.add(earL, earR);
    const chin = new THREE.Mesh(new THREE.BoxGeometry(0.3*s, 0.15*s, 0.05*s), skinMat);
    chin.position.set(0, -0.12*s, 0.23*s); headGroup.add(chin);
    headGroup.position.y = 1.6*s; characterGroup.add(headGroup);

    const bodyGroup = new THREE.Group();
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.6*s, 0.8*s, 0.4*s), grayMat);
    addOutline(torso); bodyGroup.add(torso);
    const logo = new THREE.Mesh(new THREE.BoxGeometry(0.3*s, 0.15*s, 0.05*s), yellowMat);
    logo.position.set(0, 0.15*s, 0.2*s); bodyGroup.add(logo);
    const belt = new THREE.Mesh(new THREE.BoxGeometry(0.62*s, 0.1*s, 0.42*s), yellowMat);
    belt.position.y = -0.35*s; addOutline(belt); bodyGroup.add(belt);
    const cape = new THREE.Mesh(new THREE.BoxGeometry(0.7*s, 1.2*s, 0.1*s), blackMat);
    cape.position.set(0, -0.2*s, -0.25*s); cape.rotation.x = 0.1; addOutline(cape); bodyGroup.add(cape);
    bodyGroup.position.y = 0.9*s; characterGroup.add(bodyGroup);

    const createLimb = (w, h, d, mainMat, accentMat, x, y, z) => {
        const group = new THREE.Group();
        const upper = new THREE.Mesh(new THREE.BoxGeometry(w*s, h/2*s, d*s), mainMat);
        upper.position.y = -h/4*s; addOutline(upper); group.add(upper);
        const lower = new THREE.Mesh(new THREE.BoxGeometry(w*s, h/2*s, d*s), accentMat);
        lower.position.y = -h*0.75*s; addOutline(lower); group.add(lower);
        group.position.set(x*s, y*s, z*s); characterGroup.add(group);
        return group;
    };
    const armL = createLimb(0.2, 0.7, 0.2, grayMat, blackMat, -0.45, 1.2, 0);
    const armR = createLimb(0.2, 0.7, 0.2, grayMat, blackMat, 0.45, 1.2, 0);
    const legL = createLimb(0.25, 0.8, 0.25, grayMat, blackMat, -0.2, 0.5, 0);
    const legR = createLimb(0.25, 0.8, 0.25, grayMat, blackMat, 0.2, 0.5, 0);
    characterGroup.userData.limbs = { armL, armR, legL, legR };
    characterGroup.position.y = 50; 
    scene.add(characterGroup);

    // Expose for runtime inspection & QA validation
    window.characterGroup = characterGroup;
    window.camera = camera;
    window.scene = scene;
    window.setScrollTarget = (p) => { targetScrollPos = p; };
    window.getScrollTarget = () => targetScrollPos;

    const origUpdate = characterGroup.updateMatrixWorld.bind(characterGroup);
    characterGroup.updateMatrixWorld = function(force) {
        if (window._charRotY !== undefined && window._charRotY !== null) {
            this.rotation.y = window._charRotY;
        }
        origUpdate(force);
    };

    if (camera) {
        const origCamUpdate = camera.updateMatrixWorld.bind(camera);
        camera.updateMatrixWorld = function(force) {
            if (window._camOverride) {
                window._camOverride(this);
            }
            origCamUpdate(force);
        };
    }
}

function populateZones() {
    // Intro zone ring
    const ring = new THREE.Mesh(
        new THREE.TorusGeometry(8, 0.5, 16, 100),
        new THREE.MeshBasicMaterial({ color: 0x00ffff })
    );
    ring.position.set(getPathX(-10), 2, -10);
    scene.add(ring);

    // About zone: trees
    for (let z = -30; z > -60; z -= 3) {
        const x = getPathX(z) + (Math.random() > 0.5 ? 1 : -1) * (5 + Math.random() * 10);
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.4, 2), createAnimeMaterial(0x8B4513));
        const leaves = new THREE.Mesh(new THREE.ConeGeometry(2, 4, 8), createAnimeMaterial(0x2ecc71));
        trunk.position.set(x, 1, z);
        leaves.position.set(x, 4, z);
        addOutline(leaves, 0.05);
        scene.add(trunk, leaves);
    }

    // Experience zone: city buildings
    for (let z = -70; z > -110; z -= 5) {
        const h = 10 + Math.random() * 20;
        const b = new THREE.Mesh(new THREE.BoxGeometry(6, h, 6), createAnimeMaterial(0x7f8c8d));
        b.position.set(getPathX(z) + (Math.random() > 0.5 ? 1 : -1) * 12, h / 2, z);
        addOutline(b, 0.03);
        b.add(new THREE.Mesh(
            new THREE.BoxGeometry(6.1, h - 2, 6.1),
            new THREE.MeshBasicMaterial({ color: 0x000000, wireframe: true })
        ));
        scene.add(b);
    }

    // Projects zone: glowing floor + pillars
    const floor = new THREE.Mesh(
        new THREE.PlaneGeometry(20, 60),
        new THREE.MeshBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.2, side: THREE.DoubleSide })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(getPathX(-145), 0.1, -145);
    scene.add(floor);
    for (let i = 0; i < 6; i++) {
        const z = -125 - i * 8;
        const p = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 10, 6), createAnimeMaterial(0x3498db));
        p.position.set(getPathX(z) + (i % 2 === 0 ? 8 : -8), 5, z);
        addOutline(p, 0.02, 0x00ffff);
        scene.add(p);
    }

    // Skills zone: orbiting icosahedron
    const core = new THREE.Mesh(
        new THREE.IcosahedronGeometry(6, 1),
        new THREE.MeshBasicMaterial({ color: 0xff00ff, wireframe: true })
    );
    core.position.set(getPathX(-200), 8, -200);
    scene.add(core);
    for (let i = 0; i < 10; i++) {
        const orb = new THREE.Mesh(new THREE.SphereGeometry(1), new THREE.MeshBasicMaterial({ color: 0xff00ff }));
        const angle = (i / 10) * Math.PI * 2;
        orb.position.set(getPathX(-200) + Math.cos(angle) * 10, 8, -200 + Math.sin(angle) * 10);
        scene.add(orb);
    }

    // Education zone: monolith
    const mon = new THREE.Mesh(new THREE.BoxGeometry(4, 15, 4), createAnimeMaterial(0xf1c40f));
    mon.position.set(getPathX(-245), 7.5, -245);
    addOutline(mon, 0.03, 0xB8860B);
    scene.add(mon);

    // Certifications zone: wireframe panels
    for (let i = 0; i < 9; i++) {
        const z = -275 - i * 10;
        const panelGeo = new THREE.BoxGeometry(6, 4, 0.2);
        const panelMat = new THREE.MeshBasicMaterial({ color: 0x2ecc71, wireframe: true });
        const panel = new THREE.Mesh(panelGeo, panelMat);
        const xSide = (i % 2 === 0 ? 1 : -1) * 8;
        panel.position.set(getPathX(z) + xSide, 4, z);
        panel.lookAt(getPathX(z), 4, z);
        scene.add(panel);
        const beam = new THREE.Mesh(
            new THREE.CylinderGeometry(0.1, 0.1, 4),
            new THREE.MeshBasicMaterial({ color: 0x2ecc71 })
        );
        beam.position.set(getPathX(z) + xSide, 2, z);
        scene.add(beam);
    }

    // Portal (FIX: transparent: true enabled so opacity animation works)
    portalMesh = new THREE.Mesh(
        new THREE.CircleGeometry(8, 32),
        new THREE.MeshBasicMaterial({ color: 0x0984e3, side: THREE.DoubleSide, transparent: true, opacity: 0.8 })
    );
    portalMesh.position.set(getPathX(-385), 8, -385);
    scene.add(portalMesh);
}

function createParticles() {
    const geometry = new THREE.BufferGeometry();
    const vertices = [];
    for (let i = 0; i < 2000; i++) {
        vertices.push(
            THREE.MathUtils.randFloatSpread(400),
            THREE.MathUtils.randFloatSpread(200),
            THREE.MathUtils.randFloatSpread(600) - 300
        );
    }
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    scene.add(new THREE.Points(geometry, new THREE.PointsMaterial({ color: 0xffffff, size: 0.5 })));
}

// --- INTERACTION ---
function onScroll(event) {
    if (!isGameActive) return;
    if (targetScrollPos >= totalLength && event.deltaY > 0) {
        targetScrollPos = totalLength;
        return;
    }
    targetScrollPos += event.deltaY * 0.05;
    targetScrollPos = Math.max(0, Math.min(targetScrollPos, totalLength));
}

let touchStartY = 0;

// FIX 1: Ignore touches originating inside #content-panel so panel scrolls natively
function onTouchStart(e) {
    if (e.target && e.target.closest && e.target.closest('#content-panel')) return;
    touchStartY = e.touches[0].clientY;
}

function onTouchMove(e) {
    if (e.target && e.target.closest && e.target.closest('#content-panel')) return;
    if (!isGameActive) { e.preventDefault(); return; }
    const y = e.touches[0].clientY;
    const diff = touchStartY - y;
    if (targetScrollPos >= totalLength && diff > 0) {
        targetScrollPos = totalLength;
        touchStartY = y;
        return;
    }
    targetScrollPos += diff * 0.12;
    targetScrollPos = Math.max(0, Math.min(targetScrollPos, totalLength));
    touchStartY = y;
}

function onMouseMove(event) {
    mouse.x = (event.clientX - windowHalfX) * 0.001;
    mouse.y = (event.clientY - windowHalfY) * 0.001;
}

function onWindowResize() {
    windowHalfX = window.innerWidth / 2;
    windowHalfY = window.innerHeight / 2;
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
}

function initUI() {
    // Inject name and title from config (prevents hardcoded wrong-owner bug)
    document.getElementById('ui-name').innerText  = config.personal?.name  || 'Sagar Gupta';
    document.getElementById('ui-role').innerText  = config.personal?.title || 'Software Developer & Open Source Contributor';

    // Build progress dots with interactive click-to-navigate
    const container = document.getElementById('dots-container');
    zones.forEach((zone, index) => {
        const dot = document.createElement('div');
        dot.className = 'dot';
        dot.dataset.id = index;
        dot.style.cursor = 'pointer';
        dot.style.pointerEvents = 'auto';
        dot.title = zone.title;
        dot.addEventListener('click', () => {
            targetScrollPos = Math.abs((zone.start + zone.end) / 2);
        });
        container.appendChild(dot);
    });

    // End-of-journey speech bubble
    speechBubble = document.createElement('div');
    Object.assign(speechBubble.style, {
        position: 'absolute',
        top: '20%',
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'white',
        color: 'black',
        padding: '10px 20px',
        borderRadius: '15px',
        fontFamily: "'Space Grotesk', sans-serif",
        fontWeight: 'bold',
        fontSize: '1rem',
        opacity: '0',
        transition: 'opacity 0.3s',
        pointerEvents: 'none',
        zIndex: '100',
        textAlign: 'center'
    });
    speechBubble.innerHTML = "Thanks for visiting!<br>Let's build something amazing.";

    const arrow = document.createElement('div');
    Object.assign(arrow.style, {
        position: 'absolute',
        bottom: '-8px',
        left: '50%',
        marginLeft: '-8px',
        width: '0',
        height: '0',
        borderLeft: '8px solid transparent',
        borderRight: '8px solid transparent',
        borderTop: '8px solid white'
    });
    speechBubble.appendChild(arrow);
    document.body.appendChild(speechBubble);
}

function updateUI(z) {
    if (!isGameActive) return;
    const pct = Math.abs(z) / totalLength;
    document.getElementById('progress-bar').style.setProperty('--prog', `${pct * 100}%`);

    let currentZone = zones[0];
    zones.forEach((zone, index) => {
        if (z <= zone.start && z > zone.end) {
            currentZone = zone;
            document.querySelectorAll('.dot').forEach((d, i) => d.classList.toggle('active', i === index));
        }
    });

    document.getElementById('zone-indicator').innerText = `ZONE: ${currentZone.title}`;
    const panel = document.getElementById('content-panel');

    if (panel.dataset.zone !== currentZone.id) {
        panel.dataset.zone = currentZone.id;
        let html = `<h2>${currentZone.title}</h2>`;

        if (currentZone.id === 'intro') {
            const p = config.personal || {};
            html = `
            <h2>${p.name || 'Sagar Gupta'}</h2>
            <div style="font-size:0.95rem; font-weight:600; color:var(--cyan-primary); margin-bottom:4px; letter-spacing:0.5px;">${p.title || 'Software Developer & Open Source Contributor'}</div>
            <div style="font-size:0.88rem; font-style:italic; color:var(--mint-accent); margin-bottom:12px;">"${p.tagline || 'Building ideas into digital experiences.'}"</div>
            <p style="font-size:0.92rem; line-height:1.65; color:var(--text-secondary); margin-bottom:16px;">${(p.description || '').replace(/\n\n/g, '<br><br>')}</p>
            <div style="font-size:0.8rem; font-weight:600; color:#fff; text-transform:uppercase; letter-spacing:1px; margin-bottom:8px;">Highlights</div>
            <div style="display:flex; flex-direction:column; gap:6px;">
                ${(p.highlights || []).map(h => `<div style="font-size:0.84rem; color:var(--text-secondary); display:flex; align-items:center; gap:8px;"><span style="color:var(--cyan-primary);">▹</span> ${h}</div>`).join('')}
            </div>`;
        } else if (currentZone.id === 'about') {
            const ab = config.about || {};
            html = `<h2>${ab.heading || 'More than just writing code.'}</h2>`;
            const paragraphs = ab.paragraphs || config.personal?.bio || [];
            html += `<div style="font-size:0.92rem; line-height:1.65; color:var(--text-secondary); margin-bottom:16px;">`;
            paragraphs.forEach(p => {
                html += `<p style="margin-bottom:10px;">${p}</p>`;
            });
            html += `</div>`;
            const highlights = ab.highlights || [];
            if (highlights.length > 0) {
                html += `<div style="font-size:0.8rem; font-weight:600; color:#fff; text-transform:uppercase; letter-spacing:1px; margin-bottom:8px;">Personal Highlights</div>`;
                html += `<div style="display:flex; flex-direction:column; gap:6px;">`;
                highlights.forEach(h => {
                    html += `<div style="font-size:0.84rem; color:var(--text-secondary); display:flex; align-items:center; gap:8px;"><span style="color:var(--mint-accent);">▹</span> ${h}</div>`;
                });
                html += `</div>`;
            }
        } else if (currentZone.id === 'experience') {
            (config.experience || []).forEach(exp => {
                const highlightsHtml = (exp.highlights || []).map(h => `<li style="margin-bottom:4px; font-size:0.84rem; color:var(--text-secondary);">${h}</li>`).join('');
                const linkHtml = exp.link
                    ? `<div style="margin-top:8px;"><a href="${exp.link.url}" target="_blank" rel="noopener noreferrer" class="project-link" style="font-size:0.75rem; padding:4px 10px; display:inline-block;">${exp.link.label} →</a></div>`
                    : '';
                html += `
                <div class="panel-item">
                    <h3>${exp.title}</h3>
                    <span class="meta">${exp.company} &bull; ${exp.period || ''}</span>
                    <p style="margin-bottom:8px;">${exp.description}</p>
                    ${highlightsHtml ? `<ul style="padding-left:18px; margin-bottom:6px;">${highlightsHtml}</ul>` : ''}
                    ${linkHtml}
                </div>`;
            });
        } else if (currentZone.id === 'community') {
            const comm = config.community || {};
            html = `<h2>${comm.heading || 'Building beyond the classroom.'}</h2>`;
            if (comm.description) {
                html += `<p style="font-size:0.92rem; line-height:1.65; color:var(--text-secondary); margin-bottom:16px;">${comm.description}</p>`;
            }
            (comm.sections || []).forEach(sec => {
                const secLinks = (sec.links || []).map(l => `<a href="${l.url}" target="_blank" rel="noopener noreferrer" class="project-link" style="font-size:0.75rem; padding:4px 10px; margin-right:6px; margin-top:6px; display:inline-block;">${l.label} →</a>`).join('');
                html += `
                <div class="panel-item">
                    <h3>${sec.title}</h3>
                    <p style="margin-bottom:6px;">${sec.content}</p>
                    ${secLinks ? `<div style="margin-top:6px;">${secLinks}</div>` : ''}
                </div>`;
            });
        } else if (currentZone.id === 'projects') {
            (config.projects || []).forEach(proj => {
                const tagsHtml = (proj.tags || []).map(t => `<span class="project-tag">${t}</span>`).join('');
                const featuresHtml = (proj.features || []).map(f => `<li style="font-size:0.8rem; color:#bbb; margin-bottom:3px;">${f}</li>`).join('');
                const linkHtml = proj.url
                    ? `<a href="${proj.url}" target="_blank" rel="noopener noreferrer" class="project-link">Live Demo →</a>`
                    : '';
                const githubHtml = proj.github
                    ? `<a href="${proj.github}" target="_blank" rel="noopener noreferrer" class="project-link project-link--secondary">GitHub →</a>`
                    : '';
                html += `
                <div class="project-card" style="background:${proj.gradient || ''}">
                    <img src="${proj.image}" class="project-img" alt="${proj.name}" loading="lazy">
                    <div class="project-info">
                        <h3>${proj.name}</h3>
                        ${proj.subtitle ? `<div style="font-size:0.8rem; color:var(--cyan-primary); margin-bottom:6px; font-weight:500;">${proj.subtitle}</div>` : ''}
                        <p style="font-size:0.88rem; margin:5px 0 8px 0; color:#ddd; line-height:1.5;">${proj.description}</p>
                        ${featuresHtml ? `<div style="margin:8px 0;"><div style="font-size:0.75rem; font-weight:600; color:#aaa; text-transform:uppercase; margin-bottom:4px; letter-spacing:0.5px;">Key Features</div><ul style="padding-left:16px; margin-bottom:6px;">${featuresHtml}</ul></div>` : ''}
                        <div class="tags-container" style="margin-bottom:10px;">${tagsHtml}</div>
                        <div class="project-links">${linkHtml}${githubHtml}</div>
                    </div>
                </div>`;
            });
        } else if (currentZone.id === 'skills') {
            html = `<h2>${config.skills_heading || 'Tools I use. Technologies I explore.'}</h2>`;
            (config.skills || []).forEach(cat => {
                html += `<h3 style="margin-top:16px; margin-bottom:8px;">${cat.category}</h3>`;
                (cat.items || []).forEach(skill => html += `<span class="skill-tag">${skill.name || skill}</span>`);
            });
        } else if (currentZone.id === 'education') {
            (config.education || []).forEach(edu => {
                const detailsHtml = (edu.details || []).map(d => `<div style="font-size:0.84rem; color:var(--text-secondary); margin-top:3px;"><span style="color:var(--cyan-primary);">▹</span> ${d}</div>`).join('');
                html += `
                <div class="panel-item">
                    <h3>${edu.icon || '🎓'} ${edu.degree}</h3>
                    <span class="meta">${edu.institution} &bull; ${edu.period || ''}</span>
                    ${edu.location ? `<div style="font-size:0.78rem; color:#888; margin-bottom:6px;">📍 ${edu.location}</div>` : ''}
                    <p>${edu.description}</p>
                    ${detailsHtml ? `<div style="margin-top:8px;">${detailsHtml}</div>` : ''}
                </div>`;
            });
        } else if (currentZone.id === 'certifications') {
            if (!config.certifications || config.certifications.length === 0) {
                html += `
                <div style="text-align:center; padding:30px 0; color:#aaa;">
                    <div style="font-size:2rem; margin-bottom:10px;">🚀</div>
                    <p style="color:#ccc;">Certifications coming soon.</p>
                </div>`;
            } else {
                config.certifications.forEach(cert => {
                    const verifyBtn = cert.url
                        ? `<a href="${cert.url}" target="_blank" rel="noopener noreferrer" style="display:inline-block; margin-top:8px; padding: 5px 12px; background:rgba(0, 210, 255, 0.12); color:var(--cyan-primary); text-decoration:none; font-size:0.8rem; font-weight:600; border:1px solid var(--cyan-border); border-radius:var(--radius-sm); transition:0.25s; pointer-events: auto;">
                            🔗 View Credential / Verification
                           </a>`
                        : '';
                    html += `
                    <div class="cert-card">
                        <h4 style="margin:0; color:var(--text-primary); font-size:1.05rem; font-weight:600;">${cert.name}</h4>
                        <div style="font-size:0.82rem; color:var(--cyan-primary); margin: 4px 0 6px 0; font-weight:500;">
                            <span class="issuer">${cert.issuer}</span> &bull; <span class="date">${cert.date}</span>
                        </div>
                        <p style="font-size:0.88rem; color:var(--text-secondary); margin-bottom:4px; line-height:1.5;">${cert.desc}</p>
                        ${verifyBtn}
                    </div>`;
                });
            }
        } else if (currentZone.id === 'contact') {
            const c = config.contact || {};
            html = `<h2>${c.heading || "Have an idea? Let's build something meaningful."}</h2>`;
            html += `<p style="color:var(--text-secondary); font-size:0.92rem; margin-bottom:18px; line-height:1.65;">${(c.message || '').replace(/\n\n/g, '<br><br>')}</p>`;
            if (c.location) {
                html += `<div style="margin-bottom:14px; font-size:0.85rem; color:#bbb;">📍 <strong>Location:</strong> ${c.location}</div>`;
            }
            if (!c.links || c.links.length === 0) {
                html += `<p style="color:#888; font-size:0.85rem;">Social links coming soon.</p>`;
            } else {
                html += `<div style="display:flex; flex-direction:column; gap:8px;">`;
                c.links.forEach(link =>
                    html += `<a href="${link.url}" target="_blank" rel="noopener noreferrer" class="contact-link" style="pointer-events:auto;"><span class="contact-icon">${link.icon}</span> ${link.text}</a>`
                );
                html += `</div>`;
            }
            if (c.footer) {
                html += `
                <div class="panel-footer" style="margin-top:24px; padding-top:16px; border-top:1px solid rgba(255,255,255,0.08); text-align:center;">
                    <p style="font-size:0.8rem; color:#94a3b8; margin-bottom:4px;">${c.footer.quote || ''}</p>
                    <p style="font-size:0.75rem; color:#64748b;">${c.footer.copyright || ''}</p>
                </div>`;
            }
        }

        if (html === '') {
            panel.classList.add('hidden');
        } else {
            panel.innerHTML = `<div class="panel-content">${html}</div>`;
            panel.classList.remove('hidden');
        }
    }
}

function animate() {
    requestAnimationFrame(animate);
    scrollPos += (targetScrollPos - scrollPos) * 0.05;
    const z = -scrollPos;
    const charX = getPathX(z);

    // --- PORTAL & BACKGROUND ANIMATION ---
    if (portalMesh) {
        portalMesh.rotation.z += 0.01;
        // Opacity animation works now that transparent: true is set on the material
        portalMesh.material.opacity = 0.8 + Math.sin(Date.now() * 0.005) * 0.2;

        if (Math.abs(totalLength - scrollPos) < 20) {
            const progress = 1 - (Math.abs(totalLength - scrollPos) / 20);
            const scale = 1 + progress * 80;
            portalMesh.scale.set(scale, scale, 1);

            // Use pre-allocated Color objects to avoid per-frame garbage
            scene.background.lerpColors(COLOR_BG_START,  COLOR_BG_END,  progress * 0.5);
            scene.fog.color.lerpColors(COLOR_FOG_START, COLOR_FOG_END, progress * 0.5);
            scene.fog.density = 0.008 + progress * 0.02;
        } else {
            portalMesh.scale.set(1, 1, 1);
            scene.background.set(0x0f0c29);
            scene.fog.color.set(0x1a1a2e);
            scene.fog.density = 0.008;
        }
    }

    // --- GROUND ELEVATION (OPTIMIZED) ---
    // Mathematically equivalent to groundMesh surface (groundMesh.position.z = -500)
    // Direct O(1) evaluation eliminates per-frame raycasting against 50,000 triangles
    const zLocal = z + 500;
    const xOrig = charX - getPathX(zLocal);
    const groundY = Math.sin(xOrig * 0.2) * 0.5 + Math.cos(zLocal * 0.1) * 0.5;
    characterGroup.position.y = groundY + 0.45;

    characterGroup.position.z = z;
    characterGroup.position.x = charX;

    const nextX = getPathX(z - 1);
    characterGroup.rotation.y = Math.atan2(charX - nextX, 1) + Math.PI;

    // --- CHARACTER ANIMATION (WALK / IDLE) ---
    if (Math.abs(scrollPos - totalLength) < 1) {
        if (speechBubble) speechBubble.style.opacity = '1';
        characterGroup.userData.limbs.legL.rotation.x = THREE.MathUtils.lerp(characterGroup.userData.limbs.legL.rotation.x, 0, 0.1);
        characterGroup.userData.limbs.legR.rotation.x = THREE.MathUtils.lerp(characterGroup.userData.limbs.legR.rotation.x, 0, 0.1);
        characterGroup.userData.limbs.armL.rotation.x = THREE.MathUtils.lerp(characterGroup.userData.limbs.armL.rotation.x, 0, 0.1);
        characterGroup.userData.limbs.armR.rotation.x = THREE.MathUtils.lerp(characterGroup.userData.limbs.armR.rotation.x, 0, 0.1);
    } else {
        if (speechBubble) speechBubble.style.opacity = '0';

        if (Math.abs(targetScrollPos - scrollPos) > 0.1) {
            const t = Date.now() * 0.01;
            characterGroup.userData.limbs.legL.rotation.x = Math.sin(t) * 0.6;
            characterGroup.userData.limbs.legR.rotation.x = Math.sin(t + Math.PI) * 0.6;
            characterGroup.userData.limbs.armL.rotation.x = Math.sin(t + Math.PI) * 0.3;
            characterGroup.userData.limbs.armR.rotation.x = Math.sin(t) * 0.3;
        } else {
            characterGroup.userData.limbs.legL.rotation.x = THREE.MathUtils.lerp(characterGroup.userData.limbs.legL.rotation.x, 0, 0.1);
            characterGroup.userData.limbs.legR.rotation.x = THREE.MathUtils.lerp(characterGroup.userData.limbs.legR.rotation.x, 0, 0.1);
            characterGroup.userData.limbs.armL.rotation.x = THREE.MathUtils.lerp(characterGroup.userData.limbs.armL.rotation.x, 0, 0.1);
            characterGroup.userData.limbs.armR.rotation.x = THREE.MathUtils.lerp(characterGroup.userData.limbs.armR.rotation.x, 0, 0.1);
        }
    }

    // --- CAMERA FOLLOW ---
    const camTargetZ = z + 15;
    camera.position.z += (camTargetZ - camera.position.z) * 0.05;
    camera.position.x += (getPathX(camTargetZ) - camera.position.x) * 0.05;

    const lookAtY = window.innerWidth < 768 ? 3 : (2 + mouse.y * 5);
    camera.lookAt(charX + mouse.x * 5, lookAtY, z - 10);

    updateUI(z);
    composer.render();
}

init();
