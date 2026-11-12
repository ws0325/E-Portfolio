// ChoraNomad room prototype: rainy-night add-on.
//
// The room itself ships as a built bundle (assets/index-*.js). That bundle exposes a small hook,
// window.__CHORA__ = { THREE, scene, camera, renderer, room, state, onFrame }, and this file builds
// on top of it:
//
//   1. Rain        falling streaks, splash rings, drops running down the glass, optional sound
//   2. Wet street  darker, glossier ground with puddles that mirror the scene (planar reflection)
//   3. Light       shadow-casting street lamps and soft light cones that show up in the rain
//   4. Detail      roof kit, door canopy, sign, furniture, a person with an umbrella, fuller trees,
//                  bollards, richer building facades
//
// Everything here is additive. If the hook is missing the page still works without this file.

const ctx = window.__CHORA__;
if (ctx) init(ctx);

function init({ THREE: T, scene, camera, renderer, room, state }) {
    // three.js r170 constants (the bundle does not export them by name)
    const REPEAT = 1000;
    const SRGB = 'srgb';
    const DOUBLE_SIDE = 2;
    const ADDITIVE = 2;
    const HALF_FLOAT = 1016;
    const LINEAR_MIPMAP_LINEAR = 1008;

    const M = room.M; // the room's own materials (shell, glass, alu, wood, lime ...)
    const smallScreen = window.matchMedia('(max-width: 760px)').matches;

    // ---------------------------------------------------------------- helpers

    // Small seeded random generator, so the scene looks the same on every visit
    const seeded = (seed) => () => {
        seed |= 0;
        seed = (seed + 0x6d2b79f5) | 0;
        let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };

    const canvasTexture = (w, h, draw, { repeat = [1, 1], srgb = true } = {}) => {
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        draw(canvas.getContext('2d'), w, h);
        const tex = new T.CanvasTexture(canvas);
        tex.wrapS = tex.wrapT = REPEAT;
        tex.repeat.set(...repeat);
        if (srgb) tex.colorSpace = SRGB;
        tex.anisotropy = 8;
        return tex;
    };

    const shadows = (mesh, cast = true, receive = true) => {
        mesh.castShadow = cast;
        mesh.receiveShadow = receive;
        return mesh;
    };

    const box = (w, h, d, mat, x, y, z) => {
        const mesh = new T.Mesh(new T.BoxGeometry(w, h, d), mat);
        mesh.position.set(x, y, z);
        return shadows(mesh);
    };

    const roundedBox = (w, h, d, mat, x, y, z, radius = 0.01) => {
        const mesh = new T.Mesh(new T.RoundedBoxGeometry(w, h, d, 2, radius), mat);
        mesh.position.set(x, y, z);
        return shadows(mesh);
    };

    const cylinder = (rTop, rBottom, h, mat, x, y, z, segments = 20) => {
        const mesh = new T.Mesh(new T.CylinderGeometry(rTop, rBottom, h, segments), mat);
        mesh.position.set(x, y, z);
        return shadows(mesh);
    };

    // Rounded rectangle outline, lying in the ground plane once extruded by slab()
    const roundedRect = (hw, hl, r, path = new T.Shape()) => {
        path.moveTo(-hw + r, -hl);
        path.lineTo(hw - r, -hl);
        path.absarc(hw - r, -hl + r, r, -Math.PI / 2, 0, false);
        path.lineTo(hw, hl - r);
        path.absarc(hw - r, hl - r, r, 0, Math.PI / 2, false);
        path.lineTo(-hw + r, hl);
        path.absarc(-hw + r, hl - r, r, Math.PI / 2, Math.PI, false);
        path.lineTo(-hw, -hl + r);
        path.absarc(-hw + r, -hl + r, r, Math.PI, 1.5 * Math.PI, false);
        return path;
    };

    const slab = (shape, depth, mat, y) => {
        const geo = new T.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 24 });
        geo.rotateX(-Math.PI / 2);
        const mesh = new T.Mesh(geo, mat);
        mesh.position.y = y;
        return shadows(mesh);
    };

    const std = (params) => new T.MeshStandardMaterial(params);

    // GLSL noise shared by the ground, glass and rain shaders
    const GLSL_NOISE = /* glsl */ `
        float hash21(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
        vec2 hash22(vec2 p) {
            p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
            return fract(sin(p) * 43758.5453);
        }
        float vnoise(vec2 p) {
            vec2 i = floor(p), f = fract(p);
            vec2 u = f * f * (3.0 - 2.0 * f);
            return mix(mix(hash21(i), hash21(i + vec2(1.0, 0.0)), u.x),
                       mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), u.x), u.y);
        }
        float fbm(vec2 p) {
            float v = 0.0, a = 0.5;
            for (int i = 0; i < 4; i++) { v += a * vnoise(p); p = p * 2.03 + 17.1; a *= 0.5; }
            return v;
        }
    `;

    // Values the frame loop animates. `rain` eases between 0 (dry spell) and 1 (raining).
    const weather = { rain: 1, target: 1 };
    const uTime = { value: 0 };
    const uRain = { value: 1 };

    // Pod footprint (metres): streaks and splashes stay out of it
    const POD = { hw: 1.3, hl: 1.6, roofY: 2.83 };
    const PERSON = { x: 2.2, z: 0.5 };

    // ================================================================ 1. details

    const pod = new T.Group(); // everything fixed to the room
    const street = new T.Group(); // everything standing on the pavement
    scene.add(pod, street);

    const mats = {
        rubber: std({ color: 0x17181a, roughness: 0.85 }),
        steel: std({ color: 0x8a9096, metalness: 0.85, roughness: 0.3 }),
        darkSteel: std({ color: 0x24282c, metalness: 0.7, roughness: 0.38 }),
        cushion: std({ color: 0x7c8a6a, roughness: 0.95, bumpMap: M.fabric.bumpMap, bumpScale: 0.6 }),
        ceramic: std({ color: 0xf2efe6, roughness: 0.25 }),
        coffee: std({ color: 0x2a1a10, roughness: 0.2 }),
        terracotta: std({ color: 0xa8643f, roughness: 0.8 }),
        soil: std({ color: 0x2a211a, roughness: 1 }),
        leaf: std({ color: 0x4f7a3a, roughness: 0.6, side: DOUBLE_SIDE }),
        paper: std({ color: 0xe9e4d6, roughness: 0.9 }),
        notebook: std({ color: 0x3f6528, roughness: 0.7 })
    };

    // --- Roof kit: drip edge, solar array, ventilation unit, vent stack, antenna
    (function roofKit() {
        const top = POD.roofY;
        // Drip edge wrapping the roof plate
        const ring = roundedRect(1.325, 1.625, 0.425);
        ring.holes.push(roundedRect(1.288, 1.588, 0.388, new T.Path()));
        pod.add(slab(ring, 0.05, M.alu, 2.795));

        // Solar array on the front half, tilted slightly towards the street
        const cells = canvasTexture(512, 512, (c, w, h) => {
            c.fillStyle = '#0c1424';
            c.fillRect(0, 0, w, h);
            const cols = 6, rows = 8;
            for (let i = 0; i < cols; i++) {
                for (let j = 0; j < rows; j++) {
                    const x = (i * w) / cols, y = (j * h) / rows;
                    const g = c.createLinearGradient(x, y, x + w / cols, y + h / rows);
                    g.addColorStop(0, '#16284a');
                    g.addColorStop(1, '#0d1830');
                    c.fillStyle = g;
                    c.fillRect(x + 3, y + 3, w / cols - 6, h / rows - 6);
                }
            }
            c.strokeStyle = 'rgba(190,200,215,0.55)';
            c.lineWidth = 1;
            for (let i = 1; i < cols * 3; i++) {
                const x = (i * w) / (cols * 3);
                c.beginPath();
                c.moveTo(x, 0);
                c.lineTo(x, h);
                c.stroke();
            }
        });
        const solar = new T.Group();
        const frame = roundedBox(2.0, 0.035, 1.25, mats.darkSteel, 0, 0, 0, 0.008);
        const glass = new T.Mesh(
            new T.PlaneGeometry(1.94, 1.19),
            std({ map: cells, roughness: 0.12, metalness: 0.55 })
        );
        glass.rotation.x = -Math.PI / 2;
        glass.position.y = 0.019;
        glass.receiveShadow = true;
        solar.add(frame, glass);
        solar.position.set(0, top + 0.1, 0.72);
        solar.rotation.x = 0.07;
        pod.add(solar);
        for (const x of [-0.85, 0.85]) {
            pod.add(box(0.04, 0.12, 0.04, mats.darkSteel, x, top + 0.03, 0.2));
            pod.add(box(0.04, 0.05, 0.04, mats.darkSteel, x, top + 0.025, 1.24));
        }

        // Ventilation unit at the back, with a fan grille on top
        const grille = canvasTexture(256, 256, (c, w) => {
            c.fillStyle = '#2b2f33';
            c.fillRect(0, 0, w, w);
            c.strokeStyle = '#0c0d0e';
            c.lineWidth = 5;
            for (let r = 14; r < w / 2; r += 14) {
                c.beginPath();
                c.arc(w / 2, w / 2, r, 0, Math.PI * 2);
                c.stroke();
            }
            c.lineWidth = 4;
            for (let a = 0; a < 6; a++) {
                c.beginPath();
                c.moveTo(w / 2, w / 2);
                c.lineTo(w / 2 + Math.cos(a) * w, w / 2 + Math.sin(a) * w);
                c.stroke();
            }
            c.fillStyle = '#16181a';
            c.beginPath();
            c.arc(w / 2, w / 2, 16, 0, Math.PI * 2);
            c.fill();
        });
        const louvres = canvasTexture(128, 128, (c, w, h) => {
            c.fillStyle = '#c7c9c4';
            c.fillRect(0, 0, w, h);
            for (let y = 6; y < h; y += 12) {
                c.fillStyle = '#3a3d40';
                c.fillRect(8, y, w - 16, 5);
                c.fillStyle = 'rgba(255,255,255,0.35)';
                c.fillRect(8, y + 5, w - 16, 1);
            }
        });
        const unitBody = std({ color: 0xc7c9c4, roughness: 0.55, metalness: 0.2 });
        pod.add(roundedBox(0.86, 0.26, 0.56, unitBody, 0.42, top + 0.17, -0.98, 0.02));
        const fan = new T.Mesh(new T.CircleGeometry(0.2, 32), std({ map: grille, roughness: 0.5, metalness: 0.5 }));
        fan.rotation.x = -Math.PI / 2;
        fan.position.set(0.25, top + 0.302, -0.98);
        pod.add(fan);
        const side = new T.Mesh(new T.PlaneGeometry(0.7, 0.18), std({ map: louvres, roughness: 0.6 }));
        side.position.set(0.42, top + 0.17, -0.698);
        pod.add(side);
        for (const x of [0.06, 0.78]) pod.add(box(0.06, 0.04, 0.5, mats.darkSteel, x, top + 0.02, -0.98));

        // Vent stack with a rain cap, and a small antenna with a status light
        pod.add(cylinder(0.05, 0.05, 0.3, mats.steel, -0.82, top + 0.15, -1.05));
        pod.add(cylinder(0.1, 0.1, 0.012, mats.steel, -0.82, top + 0.34, -1.05));
        pod.add(cylinder(0.008, 0.008, 0.06, mats.steel, -0.82, top + 0.31, -1.05, 8));
        pod.add(cylinder(0.07, 0.08, 0.035, mats.rubber, -0.3, top + 0.018, -1.1));
        pod.add(cylinder(0.006, 0.006, 0.3, mats.steel, -0.3, top + 0.18, -1.1, 8));
        const beacon = new T.Mesh(
            new T.SphereGeometry(0.014, 12, 8),
            std({ color: 0xff5544, emissive: 0xff3322, emissiveIntensity: 3 })
        );
        beacon.position.set(-0.3, top + 0.34, -1.1);
        pod.add(beacon);
    })();

    // --- Door canopy, doormat and threshold light
    (function entrance() {
        const canopy = new T.Group();
        const plate = new T.Mesh(new T.BoxGeometry(1.24, 0.012, 0.62), M.glass);
        plate.renderOrder = 2;
        plate.userData.noDrops = true;
        canopy.add(plate);
        canopy.add(box(1.28, 0.03, 0.03, M.alu, 0, 0, 0.31));
        canopy.add(box(1.28, 0.03, 0.03, M.alu, 0, 0, -0.31));
        for (const x of [-0.63, 0.63]) canopy.add(box(0.03, 0.03, 0.62, M.alu, x, 0, 0));
        canopy.position.set(0, 2.45, 1.92);
        canopy.rotation.x = 0.1;
        pod.add(canopy);
        // Tie rods from the fascia down to the front corners of the canopy
        for (const x of [-0.6, 0.6]) {
            const rod = cylinder(0.006, 0.006, 0.68, mats.steel, x, 2.6, 1.9, 8);
            rod.rotation.x = -1.07;
            pod.add(rod);
        }
        // Soft downlight strip under the canopy edge
        const strip = box(0.9, 0.008, 0.02, std({ color: 0xfff1d6, emissive: 0xffe2b0, emissiveIntensity: 1.6 }), 0, 2.418, 1.66);
        strip.castShadow = false;
        pod.add(strip);

        const ridges = canvasTexture(128, 64, (c, w, h) => {
            c.fillStyle = '#808080';
            c.fillRect(0, 0, w, h);
            for (let x = 0; x < w; x += 8) {
                c.fillStyle = '#ffffff';
                c.fillRect(x, 0, 4, h);
            }
        }, { repeat: [6, 1], srgb: false });
        const mat = roundedBox(0.84, 0.014, 0.3, std({ color: 0x1c1f1c, roughness: 0.95, bumpMap: ridges, bumpScale: 1.2 }), 0, 0.107, 1.84, 0.005);
        mat.castShadow = false;
        pod.add(mat);
    })();

    // --- Back wall: service cabinet with conduit, louvre vent, panel seams
    (function backWall() {
        const z = -1.6;
        const cabinet = std({ color: 0xb9bcb6, roughness: 0.5, metalness: 0.3 });
        pod.add(roundedBox(0.44, 0.62, 0.14, cabinet, 0.72, 0.78, z - 0.07, 0.012));
        pod.add(box(0.012, 0.5, 0.004, mats.darkSteel, 0.72, 0.78, z - 0.142));
        pod.add(box(0.03, 0.06, 0.012, mats.steel, 0.66, 0.78, z - 0.146));
        const sticker = new T.Mesh(new T.PlaneGeometry(0.07, 0.07), std({ color: 0xf2c230, roughness: 0.6 }));
        sticker.rotation.y = Math.PI;
        sticker.position.set(0.84, 0.95, z - 0.1412);
        pod.add(sticker);
        pod.add(cylinder(0.018, 0.018, 0.47, mats.steel, 0.86, 0.235, z - 0.05, 10));
        pod.add(cylinder(0.018, 0.018, 0.47, mats.steel, 0.8, 0.235, z - 0.05, 10));

        for (let i = 0; i < 8; i++) {
            const slat = box(0.56, 0.008, 0.04, M.alu, -0.5, 1.95 + i * 0.045, z - 0.016);
            slat.rotation.x = -0.6;
            pod.add(slat);
        }
        pod.add(box(0.6, 0.4, 0.008, mats.darkSteel, -0.5, 2.107, z - 0.002));
        for (const x of [-0.3, 0.3]) {
            const seam = box(0.006, 2.56, 0.004, mats.darkSteel, x, 1.48, z - 0.001);
            seam.castShadow = false;
            pod.add(seam);
        }
    })();

    // --- Inside the room: cushions, laptop, mug, notebook, plant
    (function interior() {
        const floorY = 0.2;
        const tableY = floorY + 0.74;
        for (const side of [-1, 1]) {
            for (const [zc, len] of [[-0.53, 0.64], [0.195, 0.6]]) {
                pod.add(roundedBox(0.27, 0.05, len, mats.cushion, side * 0.916, floorY + 0.475, zc, 0.02));
            }
        }

        // Laptop, open towards the left bench
        const screenTex = canvasTexture(512, 320, (c, w, h) => {
            c.fillStyle = '#f5f6f1';
            c.fillRect(0, 0, w, h);
            c.fillStyle = '#252e26';
            c.fillRect(0, 0, w, 34);
            c.fillStyle = '#c4e58d';
            c.beginPath();
            c.arc(22, 17, 7, 0, Math.PI * 2);
            c.fill();
            c.fillStyle = '#252e26';
            c.font = '600 26px system-ui, sans-serif';
            c.fillText('Pilot plan · Q1', 28, 84);
            c.fillStyle = '#566153';
            c.font = '400 15px system-ui, sans-serif';
            c.fillText('Bookings per week, 3 pilot locations', 28, 110);
            [38, 52, 61, 74, 88, 97].forEach((v, i) => {
                c.fillStyle = i === 5 ? '#3f6528' : '#c4e58d';
                c.fillRect(34 + i * 62, h - 34 - v * 1.6, 42, v * 1.6);
            });
            c.fillStyle = '#e2e4dc';
            c.fillRect(w - 110, 64, 84, 10);
            c.fillRect(w - 110, 84, 64, 10);
            c.fillRect(w - 110, 104, 74, 10);
        });
        const keysTex = canvasTexture(256, 128, (c, w, h) => {
            c.fillStyle = '#b3b6b8';
            c.fillRect(0, 0, w, h);
            c.fillStyle = '#1d1f21';
            for (let r = 0; r < 5; r++) {
                for (let k = 0; k < 13; k++) c.fillRect(10 + k * 18.4, 8 + r * 15, 15, 12);
            }
            c.fillStyle = '#9da0a3';
            c.fillRect(88, 88, 80, 34);
        });
        const laptop = new T.Group();
        const alu = std({ color: 0xb3b6b8, metalness: 0.8, roughness: 0.35 });
        laptop.add(roundedBox(0.31, 0.012, 0.215, alu, 0, 0.006, 0, 0.004));
        const keys = new T.Mesh(new T.PlaneGeometry(0.29, 0.195), std({ map: keysTex, roughness: 0.5, metalness: 0.4 }));
        keys.rotation.x = -Math.PI / 2;
        keys.position.y = 0.0125;
        laptop.add(keys);
        const lid = new T.Group();
        lid.add(roundedBox(0.31, 0.2, 0.006, alu, 0, 0.1, 0, 0.003));
        const display = new T.Mesh(
            new T.PlaneGeometry(0.292, 0.182),
            std({ color: 0x101010, roughness: 0.2, emissive: 0xffffff, emissiveMap: screenTex, emissiveIntensity: 0.55 })
        );
        display.position.set(0, 0.1, 0.0035);
        lid.add(display);
        lid.position.set(0, 0.012, -0.105);
        lid.rotation.x = -0.32;
        laptop.add(lid);
        laptop.position.set(-0.16, tableY, 0.12);
        laptop.rotation.y = -Math.PI / 2 + 0.12;
        pod.add(laptop);

        // Mug with coffee
        const mug = new T.Group();
        mug.add(cylinder(0.04, 0.034, 0.09, mats.ceramic, 0, 0.045, 0, 24));
        const surface = new T.Mesh(new T.CircleGeometry(0.034, 24), mats.coffee);
        surface.rotation.x = -Math.PI / 2;
        surface.position.y = 0.084;
        mug.add(surface);
        mug.add(box(0.012, 0.05, 0.03, mats.ceramic, 0, 0.047, 0.05));
        mug.position.set(0.2, tableY, -0.52);
        mug.rotation.y = 0.6;
        pod.add(mug);

        // Notebook and pen on the right side of the table
        const note = roundedBox(0.15, 0.014, 0.21, mats.notebook, 0.2, tableY + 0.007, 0.18, 0.004);
        note.rotation.y = 0.18;
        pod.add(note);
        const page = box(0.14, 0.004, 0.2, mats.paper, 0.2, tableY + 0.002, 0.18);
        page.rotation.y = 0.18;
        pod.add(page);
        const pen = cylinder(0.004, 0.004, 0.14, mats.darkSteel, 0.31, tableY + 0.004, 0.12, 8);
        pen.rotation.set(Math.PI / 2, 0, 0.5);
        pod.add(pen);

        // Plant on the side cabinet
        const plant = new T.Group();
        plant.add(cylinder(0.075, 0.055, 0.12, mats.terracotta, 0, 0.06, 0, 20));
        plant.add(cylinder(0.068, 0.068, 0.01, mats.soil, 0, 0.116, 0, 20));
        const blade = new T.SphereGeometry(1, 10, 8);
        const rand = seeded(77);
        for (let i = 0; i < 11; i++) {
            const leaf = new T.Mesh(blade, mats.leaf);
            const a = (i / 11) * Math.PI * 2 + rand() * 0.5;
            const lean = 0.25 + rand() * 0.55;
            const len = 0.1 + rand() * 0.07;
            leaf.scale.set(0.028, len, 0.008);
            leaf.position.set(Math.cos(a) * lean * 0.07, 0.12 + len * 0.85, Math.sin(a) * lean * 0.07);
            leaf.rotation.set(Math.sin(a) * lean, -a, -Math.cos(a) * lean);
            leaf.castShadow = true;
            plant.add(leaf);
        }
        plant.position.set(-1.04, floorY + 0.92, 0.9);
        pod.add(plant);
    })();

    // --- Free-standing sign by the door
    (function totem() {
        const face = canvasTexture(360, 1500, (c, w, h) => {
            c.fillStyle = '#20271f';
            c.fillRect(0, 0, w, h);
            c.fillStyle = '#c4e58d';
            c.beginPath();
            c.arc(w / 2, 150, 46, 0, Math.PI * 2);
            c.fill();
            c.fillStyle = '#f2f0e9';
            c.textAlign = 'center';
            c.font = '600 50px system-ui, sans-serif';
            c.fillText('ChoraNomad', w / 2, 290);
            c.fillStyle = '#b9c2b3';
            c.font = '400 30px system-ui, sans-serif';
            c.fillText('Private room', w / 2, 350);
            c.fillText('by the hour', w / 2, 390);
            c.fillStyle = '#c4e58d';
            c.fillRect(60, 470, w - 120, 4);
            ['Book', 'Pay', 'Enter'].forEach((label, i) => {
                const y = 600 + i * 190;
                c.strokeStyle = '#c4e58d';
                c.lineWidth = 6;
                c.beginPath();
                c.arc(w / 2, y, 52, 0, Math.PI * 2);
                c.stroke();
                c.fillStyle = '#c4e58d';
                c.font = '600 46px system-ui, sans-serif';
                c.fillText(String(i + 1), w / 2, y + 16);
                c.fillStyle = '#f2f0e9';
                c.font = '500 34px system-ui, sans-serif';
                c.fillText(label, w / 2, y + 104);
            });
            c.fillStyle = '#8f9a8a';
            c.font = '400 26px system-ui, sans-serif';
            c.fillText('Room 01', w / 2, h - 70);
        });
        face.wrapS = face.wrapT = 1001; // clamp
        const faceMat = std({ map: face, roughness: 0.4, emissive: 0xffffff, emissiveMap: face, emissiveIntensity: 0.55 });
        const sign = new T.Group();
        sign.add(roundedBox(0.44, 0.03, 0.26, mats.darkSteel, 0, 0.015, 0, 0.008));
        sign.add(roundedBox(0.38, 1.56, 0.07, mats.darkSteel, 0, 0.81, 0, 0.015));
        for (const dir of [1, -1]) {
            const panel = new T.Mesh(new T.PlaneGeometry(0.34, 1.42), faceMat);
            panel.position.set(0, 0.83, dir * 0.0356);
            if (dir < 0) panel.rotation.y = Math.PI;
            sign.add(panel);
        }
        sign.add(box(0.4, 0.012, 0.08, M.limeGlow, 0, 1.596, 0));
        sign.position.set(-1.78, 0, 2.3);
        sign.rotation.y = 0.35;
        street.add(sign);
    })();

    // --- Person: replace the capsule mannequin with a figure holding an umbrella
    (function person() {
        const old = scene.children.find(
            (o) => o.isGroup && o.children.length === 2 && o.children.every((c) => c.material === M.human)
        );
        if (!old) return;
        old.children.slice().forEach((c) => {
            old.remove(c);
            c.geometry.dispose();
        });

        const coat = std({ color: 0x6a7164, roughness: 0.9, bumpMap: M.fabric.bumpMap, bumpScale: 0.5 });
        const trousers = std({ color: 0x2b2f33, roughness: 0.9 });
        const skin = std({ color: 0xd9b392, roughness: 0.7 });
        const hair = std({ color: 0x1d1a18, roughness: 0.85 });
        const shoe = std({ color: 0x111214, roughness: 0.5 });
        const canopyMat = std({ color: 0xc4e58d, roughness: 0.55, side: DOUBLE_SIDE });
        const g = old;

        for (const x of [-0.085, 0.085]) {
            const leg = new T.Mesh(new T.CapsuleGeometry(0.062, 0.68, 4, 12), trousers);
            leg.position.set(x, 0.46, 0);
            g.add(shadows(leg));
            g.add(roundedBox(0.09, 0.07, 0.25, shoe, x, 0.036, 0.04, 0.025));
        }
        // Coat: a lathe profile from hem to collar, flattened front to back
        const profile = [
            [0.0, 0.74], [0.215, 0.74], [0.205, 0.95], [0.175, 1.12], [0.195, 1.3],
            [0.205, 1.4], [0.15, 1.47], [0.065, 1.5], [0.0, 1.5]
        ].map(([r, y]) => new T.Vector2(r, y));
        const body = new T.Mesh(new T.LatheGeometry(profile, 24), coat);
        body.scale.set(1, 1, 0.66);
        g.add(shadows(body));
        g.add(cylinder(0.085, 0.1, 0.07, std({ color: 0xc4e58d, roughness: 0.9 }), 0, 1.5, 0.005, 16)); // scarf

        const head = new T.Mesh(new T.SphereGeometry(0.105, 24, 16), skin);
        head.position.set(0, 1.63, 0.005);
        head.scale.set(0.94, 1.08, 1);
        g.add(shadows(head));
        const hairCap = new T.Mesh(new T.SphereGeometry(0.112, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.52), hair);
        hairCap.position.set(0, 1.645, -0.012);
        hairCap.rotation.x = -0.25;
        g.add(shadows(hairCap));

        // Left arm hangs with a tote bag; right arm is bent and holds the umbrella
        const limb = (len) => shadows(new T.Mesh(new T.CapsuleGeometry(0.047, len, 4, 10), coat));
        const left = limb(0.5);
        left.position.set(-0.235, 1.13, 0);
        left.rotation.z = -0.1;
        g.add(left);
        g.add(roundedBox(0.05, 0.3, 0.26, std({ color: 0x3a3f36, roughness: 0.9 }), -0.29, 0.68, 0.02, 0.015));
        const upper = limb(0.24);
        upper.position.set(0.24, 1.28, 0.03);
        upper.rotation.set(0.25, 0, 0.12);
        g.add(upper);
        const fore = limb(0.22);
        fore.position.set(0.25, 1.2, 0.17);
        fore.rotation.set(-1.15, 0, 0);
        g.add(fore);
        const hand = new T.Mesh(new T.SphereGeometry(0.045, 12, 10), skin);
        hand.position.set(0.25, 1.27, 0.28);
        g.add(hand);

        const umbrella = new T.Group();
        umbrella.add(cylinder(0.008, 0.008, 1.0, mats.steel, 0, 0.45, 0, 8));
        const handle = cylinder(0.014, 0.014, 0.12, mats.rubber, 0, -0.06, 0, 10);
        umbrella.add(handle);
        const canopy = new T.Mesh(new T.SphereGeometry(0.66, 16, 6, 0, Math.PI * 2, 0, Math.PI * 0.36), canopyMat);
        canopy.scale.y = 0.62;
        canopy.position.y = 0.56;
        umbrella.add(shadows(canopy));
        umbrella.add(cylinder(0.004, 0.012, 0.07, mats.steel, 0, 1.0, 0, 8));
        umbrella.position.set(0.25, 1.27, 0.28);
        umbrella.rotation.set(-0.08, 0, -0.14);
        g.add(umbrella);
    })();

    // --- Trees: fuller crowns, branches and soil in the planters
    (function trees() {
        const leafTex = canvasTexture(256, 256, (c, w, h) => {
            const rand = seeded(9);
            c.fillStyle = '#243b22';
            c.fillRect(0, 0, w, h);
            for (let i = 0; i < 2600; i++) {
                const l = 16 + rand() * 22;
                c.fillStyle = `hsl(${98 + rand() * 30}, ${30 + rand() * 25}%, ${l}%)`;
                c.beginPath();
                c.ellipse(rand() * w, rand() * h, 3 + rand() * 5, 1.5 + rand() * 2.5, rand() * Math.PI, 0, Math.PI * 2);
                c.fill();
            }
        }, { repeat: [3, 2] });
        const leafBump = canvasTexture(128, 128, (c, w, h) => {
            const rand = seeded(4);
            c.fillStyle = '#777';
            c.fillRect(0, 0, w, h);
            for (let i = 0; i < 900; i++) {
                c.fillStyle = rand() < 0.5 ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.5)';
                c.beginPath();
                c.arc(rand() * w, rand() * h, 1.5 + rand() * 3, 0, Math.PI * 2);
                c.fill();
            }
        }, { repeat: [5, 4], srgb: false });
        const foliage = std({ map: leafTex, bumpMap: leafBump, bumpScale: 2.5, roughness: 0.75 });
        const bark = std({ color: 0x3b2c22, roughness: 0.95 });
        const blob = new T.IcosahedronGeometry(1, 3);

        const crowns = scene.children.filter((o) => o.isMesh && o.geometry.type === 'IcosahedronGeometry');
        crowns.forEach((crown, index) => {
            const rand = seeded(31 + index * 7);
            const { x, z } = crown.position;
            crown.visible = false;
            const tree = new T.Group();
            const parts = [[0, 3.05, 0, 0.95]];
            for (let i = 0; i < 7; i++) {
                const a = (i / 7) * Math.PI * 2 + rand();
                const d = 0.5 + rand() * 0.35;
                parts.push([Math.cos(a) * d, 2.65 + rand() * 0.75, Math.sin(a) * d, 0.5 + rand() * 0.3]);
            }
            parts.push([0.1, 3.75, -0.1, 0.55]);
            for (const [px, py, pz, r] of parts) {
                const m = new T.Mesh(blob, foliage);
                m.position.set(px, py, pz);
                m.scale.set(r, r * (0.82 + rand() * 0.2), r);
                m.rotation.set(rand() * 3, rand() * 3, rand() * 3);
                tree.add(shadows(m));
            }
            for (let i = 0; i < 4; i++) {
                const a = (i / 4) * Math.PI * 2 + rand();
                const branch = cylinder(0.025, 0.05, 0.9, bark, Math.cos(a) * 0.28, 2.45, Math.sin(a) * 0.28, 8);
                branch.rotation.set(Math.sin(a) * 0.75, 0, -Math.cos(a) * 0.75);
                tree.add(branch);
            }
            tree.add(box(1.16, 0.02, 1.16, mats.soil, 0, 0.452, 0));
            tree.position.set(x, 0, z);
            street.add(tree);
        });
    })();

    // --- Street furniture: bollards along the kerb, manhole cover, drain grate
    (function streetFurniture() {
        const xs = [];
        for (let x = -9.5; x <= 12; x += 2.4) xs.push(x);
        const dummy = new T.Object3D();
        const place = (geo, mat, y) => {
            const inst = new T.InstancedMesh(geo, mat, xs.length);
            xs.forEach((x, i) => {
                dummy.position.set(x, y, 3.9);
                dummy.updateMatrix();
                inst.setMatrixAt(i, dummy.matrix);
            });
            street.add(shadows(inst));
        };
        place(new T.CylinderGeometry(0.06, 0.07, 0.86, 16), mats.darkSteel, 0.43);
        place(new T.CylinderGeometry(0.064, 0.064, 0.03, 16), M.limeGlow, 0.76);
        place(new T.SphereGeometry(0.06, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), mats.darkSteel, 0.86);

        const cover = canvasTexture(256, 256, (c, w) => {
            c.fillStyle = '#3a3c3e';
            c.fillRect(0, 0, w, w);
            c.strokeStyle = '#1b1c1d';
            c.lineWidth = 7;
            for (let r = 20; r < w / 2; r += 22) {
                c.beginPath();
                c.arc(w / 2, w / 2, r, 0, Math.PI * 2);
                c.stroke();
            }
            c.lineWidth = 5;
            for (let a = 0; a < 12; a++) {
                const ang = (a / 12) * Math.PI * 2;
                c.beginPath();
                c.moveTo(w / 2 + Math.cos(ang) * 24, w / 2 + Math.sin(ang) * 24);
                c.lineTo(w / 2 + Math.cos(ang) * 118, w / 2 + Math.sin(ang) * 118);
                c.stroke();
            }
        });
        const manhole = new T.Mesh(new T.CircleGeometry(0.34, 40), std({ map: cover, metalness: 0.7, roughness: 0.45 }));
        manhole.rotation.x = -Math.PI / 2;
        manhole.position.set(2.1, 0.006, 3.0);
        manhole.receiveShadow = true;
        street.add(manhole);

        const grate = canvasTexture(128, 64, (c, w, h) => {
            c.fillStyle = '#2f3133';
            c.fillRect(0, 0, w, h);
            c.fillStyle = '#060606';
            for (let x = 8; x < w - 8; x += 12) c.fillRect(x, 8, 6, h - 16);
        });
        const drain = new T.Mesh(new T.PlaneGeometry(0.6, 0.3), std({ map: grate, metalness: 0.6, roughness: 0.5 }));
        drain.rotation.x = -Math.PI / 2;
        drain.position.set(-5.2, -0.054, 4.62);
        street.add(drain);
    })();

    // --- Building facades: framed windows, blinds and shopfronts instead of flat blocks of colour
    (function facades() {
        const facade = (seed) => canvasTexture(512, 1024, (c, w, h) => {
            const rand = seeded(seed);
            c.fillStyle = '#0d1016';
            c.fillRect(0, 0, w, h);
            const cols = 6, rows = 14;
            const cw = w / cols, top = h * 0.88, ch = top / rows;
            for (let j = 0; j < rows; j++) {
                c.fillStyle = 'rgba(255,255,255,0.035)'; // floor slab line
                c.fillRect(0, j * ch, w, 3);
                for (let i = 0; i < cols; i++) {
                    const x = i * cw + 12, y = j * ch + 12, ww = cw - 24, wh = ch - 22;
                    const roll = rand();
                    c.fillStyle = '#05070a';
                    c.fillRect(x - 3, y - 3, ww + 6, wh + 6); // frame
                    if (roll > 0.6) {
                        const warm = rand() < 0.72;
                        const g = c.createLinearGradient(0, y, 0, y + wh);
                        g.addColorStop(0, warm ? '#ffe2ae' : '#d3e4ff');
                        g.addColorStop(1, warm ? '#c98f4c' : '#7f9ccc');
                        c.fillStyle = g;
                        c.fillRect(x, y, ww, wh);
                        if (rand() < 0.5) { // blind pulled part of the way down
                            c.fillStyle = warm ? 'rgba(120,80,40,0.55)' : 'rgba(60,80,110,0.55)';
                            c.fillRect(x, y, ww, wh * (0.25 + rand() * 0.5));
                        }
                        if (rand() < 0.3) { // something standing in the window
                            c.fillStyle = 'rgba(20,14,10,0.6)';
                            c.fillRect(x + ww * (0.15 + rand() * 0.5), y + wh * 0.45, ww * 0.2, wh * 0.55);
                        }
                    } else if (roll > 0.5) {
                        c.fillStyle = '#3a2f24'; // dim lamp somewhere inside
                        c.fillRect(x, y, ww, wh);
                    } else {
                        const g = c.createLinearGradient(x, y, x + ww, y + wh);
                        g.addColorStop(0, '#1a2230');
                        g.addColorStop(1, '#0e131b');
                        c.fillStyle = g;
                        c.fillRect(x, y, ww, wh);
                    }
                    c.fillStyle = '#05070a';
                    c.fillRect(x + ww / 2 - 1.5, y, 3, wh); // mullion
                    c.fillStyle = 'rgba(255,255,255,0.06)';
                    c.fillRect(x - 5, y + wh + 3, ww + 10, 3); // sill
                }
            }
            // Shopfront along the ground floor
            const g = c.createLinearGradient(0, top, 0, h);
            g.addColorStop(0, '#ffe3b4');
            g.addColorStop(1, '#e89a4c');
            c.fillStyle = g;
            c.fillRect(8, top + 26, w - 16, h - top - 26);
            c.fillStyle = '#1a2a20';
            c.fillRect(0, top + 4, w, 22); // fascia
            c.fillStyle = '#0d1016';
            for (let x = 0; x < w; x += w / 4) c.fillRect(x, top + 26, 8, h - top);
            c.fillStyle = 'rgba(20,14,10,0.45)';
            for (let i = 0; i < 5; i++) c.fillRect(30 + rand() * (w - 80), h - 44, 26 + rand() * 30, 44);
        });

        let seed = 300;
        scene.children.forEach((o) => {
            if (!o.isMesh || !o.material.emissiveMap || o.geometry.type !== 'BoxGeometry') return;
            const oldMap = o.material.map;
            const tex = facade(seed++);
            tex.repeat.copy(oldMap.repeat);
            o.material.map = tex;
            o.material.emissiveMap = tex;
            o.material.color.set(0x2a2f3a);
            o.material.emissiveIntensity = 0.85;
            o.material.roughness = 0.55;
            o.material.needsUpdate = true;
            oldMap.dispose();
        });
    })();

    // ================================================================ 2. light and shadow

    const lamps = room.lights.lamps;
    const shadowLamps = smallScreen ? [] : lamps.slice(0, 2);
    shadowLamps.forEach((lamp) => {
        lamp.castShadow = true;
        lamp.shadow.mapSize.set(1024, 1024);
        lamp.shadow.bias = -5e-4;
        lamp.shadow.normalBias = 0.02;
        // Everything the lamps light is static except the door, so their shadow maps are only
        // redrawn while the door moves (see the frame loop).
        lamp.shadow.autoUpdate = false;
        lamp.shadow.needsUpdate = true;
    });

    // A soft cone under each lamp, so the light reads as shining through wet air
    const coneMat = new T.ShaderMaterial({
        uniforms: { uTime, uRain },
        transparent: true,
        depthWrite: false,
        side: DOUBLE_SIDE,
        blending: ADDITIVE,
        vertexShader: /* glsl */ `
            varying vec2 vUv;
            varying vec3 vNormalV;
            varying vec3 vViewPos;
            void main() {
                vUv = uv;
                vNormalV = normalize(normalMatrix * normal);
                vec4 mv = modelViewMatrix * vec4(position, 1.0);
                vViewPos = mv.xyz;
                gl_Position = projectionMatrix * mv;
            }
        `,
        fragmentShader: /* glsl */ `
            uniform float uTime;
            uniform float uRain;
            varying vec2 vUv;
            varying vec3 vNormalV;
            varying vec3 vViewPos;
            ${GLSL_NOISE}
            void main() {
                // Fade towards the silhouette and towards the ground
                float facing = abs(dot(normalize(vNormalV), normalize(-vViewPos)));
                float edge = pow(facing, 2.2);
                float fall = pow(vUv.y, 1.6);
                float streaks = 0.75 + 0.25 * vnoise(vec2(vUv.x * 90.0, vUv.y * 5.0 + uTime * 4.0));
                float a = edge * fall * mix(0.05, 0.11 * streaks, uRain);
                gl_FragColor = vec4(vec3(1.0, 0.84, 0.58) * a, 1.0);
            }
        `
    });
    lamps.forEach((lamp) => {
        const cone = new T.Mesh(new T.CylinderGeometry(0.1, 2.6, 4.55, 40, 1, true), coneMat);
        cone.position.set(0, 2.3, -1.3);
        cone.rotation.x = -0.13;
        cone.renderOrder = 4;
        lamp.parent.add(cone);
        // Glass lens under the lamp head, and a flange at the foot of the post
        const lens = new T.Mesh(
            new T.SphereGeometry(0.11, 16, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2),
            std({ color: 0xfff3d6, emissive: 0xffd9a0, emissiveIntensity: 5, roughness: 0.3 })
        );
        lens.scale.y = 0.45;
        lens.position.set(0, 4.66, -1);
        lamp.parent.add(lens);
        lamp.parent.add(cylinder(0.13, 0.15, 0.08, mats.darkSteel, 0, 0.04, 0, 16));
    });

    // Moonlight and fog tuned for a wet night
    scene.fog.near = 9;
    scene.fog.far = 44;
    M.roof.roughness = 0.28;
    M.roof.metalness = 0.15;

    // ================================================================ 3. wet ground with reflections

    const grounds = scene.children.filter(
        (o) => o.isMesh && o.geometry.type === 'PlaneGeometry' && o.geometry.parameters.width === 80
    );
    const reflection = {
        enabled: !smallScreen,
        target: new T.WebGLRenderTarget(512, 512, { type: HALF_FLOAT }),
        camera: new T.PerspectiveCamera(),
        matrix: new T.Matrix4(),
        sky: new T.Color(0x0a0f1c),
        size: new T.Vector2()
    };
    reflection.target.texture.generateMipmaps = true;
    reflection.target.texture.minFilter = LINEAR_MIPMAP_LINEAR;

    const groundUniforms = {
        uTime,
        uRain,
        uReflect: { value: reflection.enabled ? 1 : 0 },
        tReflect: { value: reflection.target.texture },
        uReflectMatrix: { value: reflection.matrix }
    };

    grounds.forEach((ground) => {
        const mat = ground.material;
        mat.customProgramCacheKey = () => 'wet-ground';
        mat.onBeforeCompile = (shader) => {
            Object.assign(shader.uniforms, groundUniforms);
            shader.vertexShader = shader.vertexShader
                .replace('#include <common>', /* glsl */ `#include <common>
                    uniform mat4 uReflectMatrix;
                    varying vec3 vWetPos;
                    varying vec4 vReflectUv;`)
                .replace('#include <fog_vertex>', /* glsl */ `#include <fog_vertex>
                    vec4 wetWorld = modelMatrix * vec4(transformed, 1.0);
                    vWetPos = wetWorld.xyz;
                    vReflectUv = uReflectMatrix * wetWorld;`);
            shader.fragmentShader = shader.fragmentShader
                .replace('#include <common>', /* glsl */ `#include <common>
                    uniform float uTime;
                    uniform float uRain;
                    uniform float uReflect;
                    uniform sampler2D tReflect;
                    varying vec3 vWetPos;
                    varying vec4 vReflectUv;
                    ${GLSL_NOISE}
                    // Expanding rings where drops hit standing water; returns a surface tilt
                    vec2 rippleTilt(vec2 p, float t) {
                        vec2 tilt = vec2(0.0);
                        vec2 cell = floor(p), f = fract(p);
                        for (int j = -1; j <= 1; j++) {
                            for (int i = -1; i <= 1; i++) {
                                vec2 o = vec2(float(i), float(j));
                                vec2 h = hash22(cell + o);
                                float life = fract(t * (0.7 + 0.5 * h.x) + h.y * 9.0);
                                vec2 c = o + 0.15 + 0.7 * h - f;
                                float d = length(c);
                                float ring = sin((d - life * 0.5) * 42.0)
                                    * smoothstep(0.07, 0.0, abs(d - life * 0.5)) * (1.0 - life);
                                tilt += normalize(c + 1e-5) * ring;
                            }
                        }
                        return tilt;
                    }
                    float wetPuddle;
                    float wetDamp;
                    vec2 wetTilt;`)
                .replace('#include <map_fragment>', /* glsl */ `#include <map_fragment>
                    {
                        float pools = fbm(vWetPos.xz * 0.33 + 4.0);
                        float level = mix(0.66, 0.5, uRain); // puddles grow while it rains
                        wetPuddle = smoothstep(level, level + 0.07, pools);
                        wetDamp = mix(0.45, 1.0, uRain) * (0.6 + 0.4 * fbm(vWetPos.xz * 1.9));
                        wetTilt = rippleTilt(vWetPos.xz * 2.6, uTime) * wetPuddle * uRain;
                        diffuseColor.rgb *= mix(1.0, 0.5, wetDamp * 0.85);
                        diffuseColor.rgb *= mix(1.0, 0.55, wetPuddle);
                    }`)
                .replace('#include <roughnessmap_fragment>', /* glsl */ `#include <roughnessmap_fragment>
                    roughnessFactor = mix(roughnessFactor, 0.34, wetDamp);
                    roughnessFactor = mix(roughnessFactor, 0.05, wetPuddle);`)
                .replace('#include <normal_fragment_maps>', /* glsl */ `#include <normal_fragment_maps>
                    normal = normalize(mix(normal, nonPerturbedNormal, wetPuddle)
                        + mat3(viewMatrix) * vec3(wetTilt.x, 0.0, wetTilt.y) * 0.35);`)
                .replace('#include <opaque_fragment>', /* glsl */ `
                    if (uReflect > 0.5) {
                        vec3 toEye = normalize(cameraPosition - vWetPos);
                        float fresnel = 0.06 + 0.94 * pow(1.0 - clamp(toEye.y, 0.0, 1.0), 3.0);
                        vec4 ruv = vReflectUv;
                        ruv.xy += wetTilt * 0.035 * ruv.w;
                        // Sharp mirror in the puddles, a soft blurred sheen on merely damp ground
                        vec3 sharp = texture2DProj(tReflect, ruv, 0.6).rgb;
                        vec3 soft = texture2DProj(tReflect, ruv, 4.5).rgb;
                        vec3 mirrored = mix(soft * 0.38 * wetDamp, sharp, wetPuddle);
                        outgoingLight += mirrored * fresnel;
                    }
                    #include <opaque_fragment>`);
        };
        mat.needsUpdate = true;
    });

    const reflectHidden = []; // objects left out of the mirror image (filled in below)
    const v1 = new T.Vector3();
    const v2 = new T.Vector3();
    const v3 = new T.Vector3();
    const biasMatrix = new T.Matrix4().set(0.5, 0, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0, 0.5, 0.5, 0, 0, 0, 1);

    // Draw the scene as seen from below the ground plane (y = 0); the ground shader projects that
    // picture back onto itself.
    function renderReflection() {
        const mirror = reflection.camera;
        camera.updateMatrixWorld();
        v1.setFromMatrixPosition(camera.matrixWorld); // eye
        camera.getWorldDirection(v2).add(v1); // a point straight ahead
        v3.set(0, 1, 0).transformDirection(camera.matrixWorld); // up
        mirror.position.set(v1.x, -v1.y, v1.z);
        mirror.up.set(v3.x, -v3.y, v3.z);
        mirror.lookAt(v2.x, -v2.y, v2.z);
        mirror.projectionMatrix.copy(camera.projectionMatrix);
        mirror.projectionMatrixInverse.copy(camera.projectionMatrixInverse);
        mirror.updateMatrixWorld();
        mirror.matrixWorldInverse.copy(mirror.matrixWorld).invert();
        reflection.matrix.copy(biasMatrix).multiply(mirror.projectionMatrix).multiply(mirror.matrixWorldInverse);

        renderer.getDrawingBufferSize(reflection.size);
        const w = Math.max(64, Math.round(reflection.size.x / 2));
        const h = Math.max(64, Math.round(reflection.size.y / 2));
        if (reflection.target.width !== w || reflection.target.height !== h) reflection.target.setSize(w, h);

        const visible = reflectHidden.map((o) => o.visible);
        reflectHidden.forEach((o) => (o.visible = false));
        const background = scene.background;
        const shadowAuto = renderer.shadowMap.autoUpdate;
        const previousTarget = renderer.getRenderTarget();
        scene.background = reflection.sky;
        renderer.shadowMap.autoUpdate = false; // reuse the shadow maps from the main view
        renderer.setRenderTarget(reflection.target);
        renderer.clear();
        renderer.render(scene, mirror);
        renderer.setRenderTarget(previousTarget);
        renderer.shadowMap.autoUpdate = shadowAuto;
        scene.background = background;
        reflectHidden.forEach((o, i) => (o.visible = visible[i]));
    }
    reflectHidden.push(...grounds);

    // ================================================================ 4. rain

    // --- Falling streaks: camera-facing slivers, animated entirely in the vertex shader
    const STREAKS = smallScreen ? 2200 : 5200;
    const rainBox = { min: new T.Vector3(-17, 0, -13), size: new T.Vector3(34, 13, 28) };
    const streaks = (function buildStreaks() {
        const rand = seeded(2024);
        const positions = [];
        const info = [];
        const index = [];
        for (let i = 0; i < STREAKS; i++) {
            const x = rand(), phase = rand(), z = rand();
            const speed = 0.8 + rand() * 0.4, length = 0.6 + rand() * 0.8;
            for (const [side, end] of [[-1, 0], [1, 0], [1, 1], [-1, 1]]) {
                positions.push(x, phase, z);
                info.push(speed, length, side, end);
            }
            const v = i * 4;
            index.push(v, v + 1, v + 2, v, v + 2, v + 3);
        }
        const geo = new T.BufferGeometry();
        geo.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
        geo.setAttribute('aInfo', new T.Float32BufferAttribute(info, 4));
        geo.setIndex(index);
        const mat = new T.ShaderMaterial({
            uniforms: {
                uTime,
                uRain,
                uBoxMin: { value: rainBox.min },
                uBoxSize: { value: rainBox.size },
                uWind: { value: new T.Vector2(1.5, 0.5) },
                uLamps: { value: lamps.map((l) => l.getWorldPosition(new T.Vector3())) },
                uPod: { value: new T.Vector3(POD.hw + 0.05, POD.roofY, POD.hl + 0.05) },
                uUmbrella: { value: new T.Vector3(PERSON.x, 1.95, PERSON.z) }
            },
            transparent: true,
            depthWrite: false,
            side: DOUBLE_SIDE, // the slivers turn to face the camera, so either side may show
            vertexShader: /* glsl */ `
                uniform float uTime;
                uniform vec3 uBoxMin;
                uniform vec3 uBoxSize;
                uniform vec2 uWind;
                uniform vec3 uLamps[${lamps.length}];
                uniform vec3 uPod;
                uniform vec3 uUmbrella;
                attribute vec4 aInfo;
                varying float vSide;
                varying float vEnd;
                varying float vFade;
                varying float vLit;
                void main() {
                    float speed = 9.5 * aInfo.x;
                    float fallen = mod(position.y * uBoxSize.y + uTime * speed, uBoxSize.y); // metres below the top
                    vec3 p = uBoxMin + position * uBoxSize;
                    p.y = uBoxMin.y + uBoxSize.y - fallen;
                    p.xz += uWind * (fallen / speed);
                    p.xz = uBoxMin.xz + mod(p.xz - uBoxMin.xz, uBoxSize.xz);

                    vec3 dir = normalize(vec3(uWind.x, -speed, uWind.y));
                    vec3 head = p;
                    p -= dir * (0.5 * aInfo.y) * aInfo.w; // the tail trails behind the head
                    float dist = distance(cameraPosition, p);
                    vec3 sideways = normalize(cross(dir, cameraPosition - p));
                    p += sideways * aInfo.z * max(0.004, dist * 0.0009);

                    // Nothing falls through the roof or the umbrella
                    float blocked = 0.0;
                    if (abs(head.x) < uPod.x && abs(head.z) < uPod.z && head.y < uPod.y) blocked = 1.0;
                    if (distance(head.xz, uUmbrella.xz) < 0.62 && head.y < uUmbrella.y) blocked = 1.0;
                    if (head.y < 0.05) blocked = 1.0;

                    // Streaks catch the light near a street lamp
                    float lit = 0.0;
                    for (int i = 0; i < ${lamps.length}; i++) {
                        vec2 d = head.xz - (uLamps[i].xz + vec2(0.0, -0.3));
                        float reach = 0.6 + (uLamps[i].y - head.y) * 0.55;
                        lit += exp(-dot(d, d) / (reach * reach)) * step(head.y, uLamps[i].y);
                    }
                    vLit = lit;
                    vSide = aInfo.z;
                    vEnd = aInfo.w;
                    vFade = (1.0 - blocked) * smoothstep(0.8, 3.0, dist) * (1.0 - smoothstep(22.0, 34.0, dist));
                    gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
                }
            `,
            fragmentShader: /* glsl */ `
                uniform float uRain;
                varying float vSide;
                varying float vEnd;
                varying float vFade;
                varying float vLit;
                void main() {
                    float across = 1.0 - vSide * vSide;
                    float along = smoothstep(1.0, 0.25, vEnd);
                    vec3 cool = vec3(0.55, 0.62, 0.75);
                    vec3 warm = vec3(1.0, 0.82, 0.55);
                    vec3 color = mix(cool * 0.7, warm * 1.5, clamp(vLit, 0.0, 1.0));
                    float alpha = across * along * vFade * uRain * (0.3 + 0.45 * clamp(vLit, 0.0, 1.0));
                    gl_FragColor = vec4(color, alpha);
                }
            `
        });
        const mesh = new T.Mesh(geo, mat);
        mesh.frustumCulled = false;
        mesh.renderOrder = 5;
        scene.add(mesh);
        return mesh;
    })();

    // --- Splash rings where drops land: on the pavement, the road and the pod roof
    const splashes = (function buildSplashes() {
        const COUNT = smallScreen ? 260 : 620;
        const rand = seeded(88);
        const positions = [];
        const info = [];
        const index = [];
        for (let i = 0; i < COUNT; i++) {
            const seed = rand() * 100, period = 0.45 + rand() * 0.5;
            for (const [cx, cz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
                positions.push(cx, 0, cz);
                info.push(seed, period);
            }
            const v = i * 4;
            index.push(v, v + 2, v + 1, v, v + 3, v + 2);
        }
        const geo = new T.BufferGeometry();
        geo.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
        geo.setAttribute('aInfo', new T.Float32BufferAttribute(info, 2));
        geo.setIndex(index);
        const mat = new T.ShaderMaterial({
            uniforms: { uTime, uRain, uPod: { value: new T.Vector3(POD.hw, POD.roofY, POD.hl) } },
            transparent: true,
            depthWrite: false,
            side: DOUBLE_SIDE,
            vertexShader: /* glsl */ `
                uniform float uTime;
                uniform vec3 uPod;
                attribute vec2 aInfo;
                varying vec2 vCorner;
                varying float vLife;
                ${GLSL_NOISE}
                void main() {
                    float t = uTime / aInfo.y + aInfo.x;
                    float life = fract(t);
                    vec2 r = hash22(vec2(aInfo.x * 7.31, floor(t)));
                    vec3 centre = vec3(mix(-9.0, 12.0, r.x), 0.006, mix(-7.5, 12.5, r.y));
                    if (centre.z > 4.4) centre.y = -0.052;                        // road
                    if (abs(centre.x) < uPod.x - 0.1 && abs(centre.z) < uPod.z - 0.1) centre.y = uPod.y + 0.004; // roof
                    float size = mix(0.012, 0.065, sqrt(life));
                    vec3 p = centre + vec3(position.x, 0.0, position.z) * size;
                    vCorner = position.xz;
                    vLife = life;
                    gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
                }
            `,
            fragmentShader: /* glsl */ `
                uniform float uRain;
                varying vec2 vCorner;
                varying float vLife;
                void main() {
                    float d = length(vCorner);
                    float ring = smoothstep(0.12, 0.0, abs(d - 0.82));
                    float core = smoothstep(0.35, 0.0, d) * (1.0 - smoothstep(0.0, 0.25, vLife));
                    float alpha = (ring * (1.0 - vLife) * 0.2 + core * 0.4) * uRain;
                    gl_FragColor = vec4(vec3(0.62, 0.7, 0.82), alpha);
                }
            `
        });
        const mesh = new T.Mesh(geo, mat);
        mesh.frustumCulled = false;
        mesh.renderOrder = 3;
        scene.add(mesh);
        return mesh;
    })();

    // --- Drops on the glass: beads that sit and fade, and heavier drops that run down
    const dropsMat = new T.ShaderMaterial({
        uniforms: { uTime, uRain },
        transparent: true,
        depthWrite: false,
        side: DOUBLE_SIDE,
        vertexShader: /* glsl */ `
            varying vec3 vWorld;
            varying vec3 vWorldNormal;
            void main() {
                vec4 world = modelMatrix * vec4(position, 1.0);
                vWorld = world.xyz;
                vWorldNormal = normalize(mat3(modelMatrix) * normal);
                gl_Position = projectionMatrix * viewMatrix * world;
            }
        `,
        fragmentShader: /* glsl */ `
            uniform float uTime;
            uniform float uRain;
            varying vec3 vWorld;
            varying vec3 vWorldNormal;
            ${GLSL_NOISE}
            // One layer of beads on a grid; returns coverage and the offset inside the bead
            vec3 beads(vec2 uv, float cell, float density) {
                vec2 g = uv / cell, id = floor(g), f = fract(g);
                vec2 r = hash22(id);
                float life = fract(uTime * 0.06 * (0.5 + r.x) + r.y * 7.0);
                float on = step(1.0 - density, hash21(id + 3.7));
                float radius = mix(0.12, 0.3, hash21(id + 9.1)) * (1.0 - life * 0.5);
                vec2 d = f - (0.3 + 0.4 * r);
                d.y *= 0.85;
                return vec3(smoothstep(radius, radius * 0.5, length(d)) * on, d / radius);
            }
            void main() {
                vec3 n = normalize(vWorldNormal);
                // Only the face of the pane that looks out at the rain gets wet
                if (dot(n.xz, normalize(vWorld.xz)) < 0.25 || abs(n.y) > 0.5) discard;
                vec2 uv = vec2(dot(vWorld.xz, vec2(-n.z, n.x)), vWorld.y);

                vec3 small = beads(uv, 0.02, 0.32);
                vec3 big = beads(uv + 3.1, 0.045, 0.18);

                // Runners: one drop per column, sliding down with a thin trail above it
                float col = uv.x / 0.07, id = floor(col);
                float r = hash21(vec2(id, 1.0));
                float on = step(0.6, hash21(vec2(id, 5.0)));
                float wobble = sin(uv.y * 16.0 + r * 40.0) * 0.012;
                float dx = (fract(col) - 0.5) * 0.07 - wobble;
                float cycle = fract((uv.y * 0.5 + uTime * (0.1 + 0.16 * r) + r * 9.0));
                float dy = (cycle - 0.1) * 2.0; // metres above the drop's head
                float head = smoothstep(0.011, 0.005, length(vec2(dx, dy * 0.8))) * on;
                float trail = smoothstep(0.0035, 0.0012, abs(dx)) * smoothstep(0.0, 0.03, dy)
                    * (1.0 - smoothstep(0.05, 0.7, dy)) * on;

                float mask = max(max(small.x, big.x), head);
                vec2 inside = mix(small.yz, big.yz, step(small.x, big.x));
                float highlight = smoothstep(0.1, 0.9, dot(inside, normalize(vec2(-0.6, 0.8))));
                vec3 color = mix(vec3(0.05, 0.07, 0.09), vec3(0.34, 0.38, 0.44), highlight * 0.8 + head * 0.4);
                float alpha = (mask * 0.42 + trail * 0.16) * uRain;
                if (alpha < 0.01) discard;
                gl_FragColor = vec4(color, alpha);
            }
        `
    });
    const dropLayers = [];
    scene.traverse((o) => {
        if (o.isMesh && o.material === M.glass && !o.userData.noDrops) dropLayers.push(o);
    });
    const dropMeshes = dropLayers.map((pane) => {
        const layer = new T.Mesh(pane.geometry, dropsMat);
        layer.position.copy(pane.position);
        layer.rotation.copy(pane.rotation);
        layer.scale.copy(pane.scale);
        layer.renderOrder = 3;
        pane.parent.add(layer);
        return layer;
    });

    reflectHidden.push(streaks, splashes, ...dropMeshes);

    // --- Rain sound: filtered noise made in the browser, so there is no audio file to download
    const sound = { ctx: null, gain: null, on: false };
    function setSound(on) {
        sound.on = on;
        if (on && !sound.ctx) {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (!AudioCtx) return;
            const ac = new AudioCtx();
            const buffer = ac.createBuffer(1, ac.sampleRate * 4, ac.sampleRate);
            const data = buffer.getChannelData(0);
            let last = 0;
            for (let i = 0; i < data.length; i++) {
                const white = Math.random() * 2 - 1;
                last = (last + 0.02 * white) / 1.02; // brownish rumble under the hiss
                data[i] = white * 0.55 + last * 6;
            }
            const source = ac.createBufferSource();
            source.buffer = buffer;
            source.loop = true;
            const high = ac.createBiquadFilter();
            high.type = 'highpass';
            high.frequency.value = 500;
            const low = ac.createBiquadFilter();
            low.type = 'lowpass';
            low.frequency.value = 6500;
            sound.gain = ac.createGain();
            sound.gain.gain.value = 0;
            source.connect(high).connect(low).connect(sound.gain).connect(ac.destination);
            source.start();
            sound.ctx = ac;
        }
        if (!sound.ctx) return;
        if (on) sound.ctx.resume();
        updateSoundLevel();
    }
    function updateSoundLevel() {
        if (!sound.ctx) return;
        // Quieter once you are inside the room
        const inside = ['inside', 'panel', 'call'].includes(state.stage);
        const level = sound.on ? weather.target * (inside ? 0.035 : 0.11) : 0;
        sound.gain.gain.setTargetAtTime(level, sound.ctx.currentTime, 0.4);
    }

    // ================================================================ 5. controls and frame loop

    const tools = document.querySelector('.demo-tools');
    let rainBtn, soundBtn;
    if (tools) {
        rainBtn = document.createElement('button');
        soundBtn = document.createElement('button');
        const label = () => {
            rainBtn.textContent = `Rain: ${weather.target ? 'On' : 'Off'}`;
            soundBtn.textContent = `Rain sound: ${sound.on ? 'On' : 'Off'}`;
        };
        rainBtn.addEventListener('click', () => {
            weather.target = weather.target ? 0 : 1;
            updateSoundLevel();
            label();
        });
        soundBtn.addEventListener('click', () => {
            setSound(!sound.on);
            label();
        });
        label();
        tools.prepend(rainBtn, soundBtn);
    }

    let frame = 0;
    let lastDoorAngle = room.doorPivot.rotation.y;
    let lastStage = state.stage;

    ctx.onFrame = (dt, time) => {
        frame++;
        uTime.value = time;

        // Ease the rain in and out
        const step = Math.min(1, dt * 0.8);
        weather.rain += (weather.target - weather.rain) * step;
        uRain.value = weather.rain;
        const raining = weather.rain > 0.01;
        streaks.visible = raining;
        splashes.visible = raining;
        dropMeshes.forEach((m) => (m.visible = raining));

        // "Standard" quality draws fewer streaks and skips the mirror pass
        const high = state.quality === 'high';
        streaks.geometry.setDrawRange(0, (high ? STREAKS : Math.round(STREAKS * 0.5)) * 6);
        const reflect = reflection.enabled && high;
        groundUniforms.uReflect.value = reflect ? 1 : 0;

        // Lamp shadows only change while the door swings
        const doorAngle = room.doorPivot.rotation.y;
        if (doorAngle !== lastDoorAngle) {
            lastDoorAngle = doorAngle;
            shadowLamps.forEach((lamp) => (lamp.shadow.needsUpdate = true));
        }
        if (state.stage !== lastStage) {
            lastStage = state.stage;
            updateSoundLevel();
        }

        if (reflect && frame > 2) renderReflection();
    };
}
