import * as THREE from './vendor/three.module.js';

/** Four scroll-connected worlds. Portfolio copy and accessible navigation remain in the DOM. */
export function createPortfolioScene({ canvas, onSelect, onReady, onError } = {}) {
  const noop = () => {};
  const empty = { setScroll: noop, setChapter: noop, setMotion: noop, setLocked: noop, resetView: noop, dispose: noop };
  let renderer;
  try {
    if (!(canvas instanceof HTMLCanvasElement)) throw new Error('A canvas is required for the 3D view.');
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: window.innerWidth >= 760, powerPreference: 'high-performance' });
  } catch (error) {
    onError?.(error);
    return empty;
  }

  renderer.setClearColor(0x040c1c, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.22;

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x040c1c, 0.019);
  const camera = new THREE.PerspectiveCamera(43, 1, 0.1, 100);
  const gallery = new THREE.Group();
  const stars = new THREE.Group();
  scene.add(gallery, stars);
  const worlds = [];
  const palette = [0x8bc6ff, 0xa1d6ff, 0x58e2ff, 0xb8b0ff].map(hex => new THREE.Color(hex));
  const backgrounds = [0x040c1c, 0x050e20, 0x02141e, 0x080c24].map(hex => new THREE.Color(hex));
  const accent = palette[0].clone();
  const backdrop = backgrounds[0].clone();
  const lookTarget = new THREE.Vector3();
  const pointer = new THREE.Vector2();
  const raycaster = new THREE.Raycaster();
  const drag = new THREE.Vector2();
  const renderedDrag = new THREE.Vector2();
  const cards = [];
  const pickMeshes = [];
  const textures = new Set();
  const originalTouchAction = canvas.style.touchAction;
  canvas.style.touchAction = 'pan-y';
  let environmentTarget;
  let observer;
  let raf = 0;
  let lastFrame = 0;
  let time = 0;
  let targetScroll = 0;
  let currentScroll = 0;
  let motion = true;
  let locked = false;
  let disposed = false;
  let failed = false;
  let ready = false;
  let hovered = null;
  let gesture = null;
  let mobile = window.innerWidth < 760;
  let width = 1;
  let height = 1;
  let pixelRatio = 0;
  let baseDistance = 8;
  let anchor = 0;
  let resolutionScale = 1;
  let slowFrames = 0;
  const spacing = 9;
  const smoothstep = (start, end, value) => THREE.MathUtils.smoothstep(value, start, end);
  const clampScroll = value => THREE.MathUtils.clamp(Number.isFinite(value) ? value : 0, 0, 3);

  scene.add(new THREE.HemisphereLight(0xd6e8ff, 0x061127, 2.2));
  const key = new THREE.DirectionalLight(0xf0f7ff, 4.1);
  key.position.set(-4, 6, 7);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x7babff, 5.6);
  rim.position.set(6, 2, -4);
  scene.add(rim);
  const fill = new THREE.DirectionalLight(0x63b5ff, 1.8);
  fill.position.set(-0.6, 0.2, 3.1);
  scene.add(fill);

  function canvasTexture(draw, w = 512, h = 512) {
    const source = document.createElement('canvas');
    source.width = w;
    source.height = h;
    const context = source.getContext('2d');
    if (!context) throw new Error('The browser could not draw the 3D artwork.');
    draw(context, w, h);
    const texture = new THREE.CanvasTexture(source);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
    textures.add(texture);
    return texture;
  }

  function makeEnvironment() {
    const texture = canvasTexture((context, w, h) => {
      const gradient = context.createLinearGradient(0, 0, 0, h);
      gradient.addColorStop(0, '#031126');
      gradient.addColorStop(0.31, '#254369');
      gradient.addColorStop(0.43, '#eff6ff');
      gradient.addColorStop(0.50, '#6883ab');
      gradient.addColorStop(0.66, '#0b1c37');
      gradient.addColorStop(1, '#010309');
      context.fillStyle = gradient;
      context.fillRect(0, 0, w, h);
      for (const [x, color, stripWidth] of [[w * 0.18, '#f8fcff', 65], [w * 0.56, '#b2dcff', 115], [w * 0.79, '#6692e9', 50]]) {
        const strip = context.createLinearGradient(x - stripWidth, 0, x + stripWidth, 0);
        strip.addColorStop(0, 'rgba(170,210,255,0)');
        strip.addColorStop(0.5, color);
        strip.addColorStop(1, 'rgba(170,210,255,0)');
        context.fillStyle = strip;
        context.fillRect(x - stripWidth, h * 0.10, stripWidth * 2, h * 0.66);
      }
    }, 512, 256);
    texture.mapping = THREE.EquirectangularReflectionMapping;
    const generator = new THREE.PMREMGenerator(renderer);
    environmentTarget = generator.fromEquirectangular(texture);
    scene.environment = environmentTarget.texture;
    generator.dispose();
  }

  // The studio environment supplies the chrome highlights without the extra
  // clearcoat and iridescence passes of a physical material.
  const chrome = () => new THREE.MeshStandardMaterial({ color: 0xcbdff2, metalness: 1, roughness: 0.19, transparent: true });
  const ice = () => new THREE.MeshStandardMaterial({ color: 0x9cc6ff, metalness: 0.74, roughness: 0.18, emissive: 0x092548, emissiveIntensity: 0.5, transparent: true });
  const lightMaterial = (color, opacity = 0.6) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending });

  function makeWorld(index) {
    const group = new THREE.Group();
    group.position.z = -index * spacing;
    gallery.add(group);
    const world = { group, materials: [], weight: -1 };
    worlds.push(world);
    return world;
  }

  function collectMaterials(world) {
    const collected = new Set();
    world.group.traverse(object => {
      if (!object.material) return;
      for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
        if (collected.has(material)) continue;
        collected.add(material);
        material.transparent = true;
        material.userData.baseOpacity = material.opacity;
        material.userData.solid = Boolean(material.isMeshPhysicalMaterial || material.isMeshStandardMaterial);
        // Crossfades must not leave an invisible surface masking the next world.
        material.depthWrite = false;
        world.materials.push(material);
      }
    });
  }

  function torus(parent, radius, thickness, material, rotation = [0, 0, 0], segments = mobile ? 56 : 80) {
    const mesh = new THREE.Mesh(new THREE.TorusGeometry(radius, thickness, 6, segments), material);
    mesh.rotation.set(...rotation);
    parent.add(mesh);
    return mesh;
  }

  function pathTube(parent, points, thickness, material, closed = false) {
    const curve = new THREE.CatmullRomCurve3(points, closed);
    const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, mobile ? 56 : 80, thickness, 5, closed), material);
    parent.add(mesh);
    return mesh;
  }

  let glowMap;
  function makeGlowMap() {
    return canvasTexture((context, w, h) => {
      const gradient = context.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
      gradient.addColorStop(0, 'rgba(255,255,255,1)');
      gradient.addColorStop(0.11, 'rgba(204,229,255,0.65)');
      gradient.addColorStop(0.35, 'rgba(114,155,255,0.13)');
      gradient.addColorStop(1, 'rgba(114,155,255,0)');
      context.fillStyle = gradient;
      context.fillRect(0, 0, w, h);
    }, 128, 128);
  }

  function halo(parent, color, size, opacity, position) {
    const material = new THREE.SpriteMaterial({ map: glowMap, color, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(size, size, 1);
    if (position) sprite.position.copy(position);
    parent.add(sprite);
    return sprite;
  }

  function ribbonPoint(t) {
    const radius = 1.04 + 0.25 * Math.cos(t * 3);
    return new THREE.Vector3(radius * Math.cos(t * 2), radius * Math.sin(t * 2), 0.39 * Math.sin(t * 3));
  }

  function makeRibbon(parent) {
    const segments = mobile ? 112 : 160;
    const crossSection = [[-0.24, -0.022], [-0.225, -0.043], [0.225, -0.043], [0.24, -0.022], [0.24, 0.022], [0.225, 0.043], [-0.225, 0.043], [-0.24, 0.022]];
    const positions = [];
    const indices = [];
    const trim = [];
    for (let i = 0; i <= segments; i++) {
      const t = i / segments * Math.PI * 2;
      const center = ribbonPoint(t);
      const tangent = ribbonPoint(t + 0.001).sub(ribbonPoint(t - 0.001)).normalize();
      const normal = center.clone().add(new THREE.Vector3(0, 0, 0.48));
      normal.addScaledVector(tangent, -normal.dot(tangent)).normalize();
      const binormal = new THREE.Vector3().crossVectors(tangent, normal).normalize();
      const twist = Math.sin(t * 3) * 0.64;
      const across = normal.clone().multiplyScalar(Math.cos(twist)).addScaledVector(binormal, Math.sin(twist));
      const up = new THREE.Vector3().crossVectors(tangent, across).normalize();
      for (const [x, y] of crossSection) {
        const point = center.clone().addScaledVector(across, x).addScaledVector(up, y);
        positions.push(point.x, point.y, point.z);
      }
      trim.push(center.clone().addScaledVector(across, 0.241));
      if (i < segments) for (let j = 0; j < 8; j++) {
        const a = i * 8 + j;
        const b = i * 8 + (j + 1) % 8;
        indices.push(a, b, a + 8, b, b + 8, a + 8);
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    const group = new THREE.Group();
    group.rotation.set(0.50, 0.08, -0.35);
    group.add(new THREE.Mesh(geometry, chrome()));
    pathTube(group, trim, 0.007, lightMaterial(0xb3e5ff, 0.50));
    parent.add(group);
    return group;
  }

  let introKnot;
  const orbiters = [];
  function makeIntro() {
    const world = makeWorld(0);
    introKnot = makeRibbon(world.group);
    const heart = new THREE.Mesh(new THREE.IcosahedronGeometry(0.37, 2), ice());
    world.group.add(heart);
    halo(world.group, 0x4a8fff, 6.6, 0.36, new THREE.Vector3(0, 0, -1.5));
    for (let i = 0; i < 3; i++) {
      const orbit = new THREE.Group();
      orbit.rotation.set(0.6 + i * 0.54, 0.31 + i * 0.44, -0.36 + i * 0.6);
      const radius = 1.68 + i * 0.32;
      torus(orbit, radius, 0.009, lightMaterial(i === 1 ? 0x6d9ecc : 0x9dcfff, i === 1 ? 0.21 : 0.48));
      const moon = new THREE.Mesh(new THREE.SphereGeometry(i ? 0.060 : 0.12, 16, 10), chrome());
      orbit.add(moon);
      world.group.add(orbit);
      orbiters.push({ orbit, moon, radius, phase: i * 2.1 });
    }
    const flecks = new THREE.Group();
    const fleckGeometry = new THREE.OctahedronGeometry(0.055, 0);
    for (let i = 0; i < 9; i++) {
      const angle = i * 2.399;
      const mesh = new THREE.Mesh(fleckGeometry, ice());
      mesh.position.set(Math.cos(angle) * (2.4 + i * 0.045), Math.sin(angle) * 1.9, -0.6 - i * 0.13);
      mesh.rotation.set(angle, angle * 0.8, 0);
      flecks.add(mesh);
    }
    world.group.add(flecks);
    world.flecks = flecks;
  }

  const crystals = [];
  let achievementCrown;
  function makeAchievements() {
    const world = makeWorld(1);
    achievementCrown = new THREE.Group();
    world.group.add(achievementCrown);
    const center = new THREE.Mesh(new THREE.OctahedronGeometry(1.02, 0), chrome());
    center.scale.set(0.72, 1.7, 0.72);
    center.rotation.y = Math.PI / 4;
    achievementCrown.add(center);
    const shell = new THREE.Mesh(new THREE.OctahedronGeometry(1.09, 0), new THREE.MeshBasicMaterial({ color: 0xc4e8ff, wireframe: true, transparent: true, opacity: 0.30, depthWrite: false }));
    shell.scale.copy(center.scale);
    shell.rotation.copy(center.rotation);
    achievementCrown.add(shell);
    halo(world.group, 0x6ca5ff, 7.8, 0.28, new THREE.Vector3(0, 0.1, -2.2));
    for (let i = 0; i < 12; i++) {
      const angle = i / 12 * Math.PI * 2;
      const radius = 1.60 + Math.sin(i * 3.1) * 0.15;
      const shard = new THREE.Mesh(new THREE.OctahedronGeometry(0.28, 0), i % 3 ? ice() : chrome());
      shard.scale.set(0.63, 1.40 + (i % 3) * 0.3, 0.63);
      shard.position.set(Math.cos(angle) * radius, Math.sin(angle) * radius * 1.04, Math.sin(angle * 2) * 0.45);
      shard.rotation.set(0.25, angle, -angle + Math.PI / 2);
      achievementCrown.add(shard);
      crystals.push({ shard, angle, radius });
    }
    const ring1 = torus(world.group, 2.12, 0.016, lightMaterial(0x9bddff, 0.7), [0.9, 0.25, -0.3]);
    const ring2 = torus(world.group, 2.64, 0.006, lightMaterial(0x699bdf, 0.42), [0.54, -0.3, 0.38]);
    world.rings = [ring1, ring2];
    const points = [];
    const nodes = [];
    for (let i = 0; i < 14; i++) {
      const angle = i / 14 * Math.PI * 2;
      nodes.push(new THREE.Vector3(Math.cos(angle) * (2.45 + i % 2 * 0.32), Math.sin(angle) * 2.0, -1.1 - Math.sin(angle * 3) * 0.42));
    }
    for (let i = 0; i < nodes.length; i++) {
      points.push(nodes[i], nodes[(i + 1) % nodes.length]);
      if (i % 2 === 0) points.push(nodes[i], nodes[(i + 4) % nodes.length]);
      const moon = new THREE.Mesh(new THREE.SphereGeometry(i % 3 === 0 ? 0.046 : 0.024, 8, 6), lightMaterial(0xc0e9ff, 0.9));
      moon.position.copy(nodes[i]);
      world.group.add(moon);
    }
    world.group.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(points), new THREE.LineBasicMaterial({ color: 0x7cbdff, transparent: true, opacity: 0.24, depthWrite: false, blending: THREE.AdditiveBlending })));
  }

  let waveGeometry;
  let wavePointGeometry;
  const wavePhase = { value: 0 };
  const portals = [];
  let hobbyCube;

  function animateWave(material) {
    material.onBeforeCompile = shader => {
      shader.uniforms.uWavePhase = wavePhase;
      shader.vertexShader = `uniform float uWavePhase;\n${shader.vertexShader}`.replace('#include <begin_vertex>', `#include <begin_vertex>
        transformed.y += sin(position.x * 0.75 + position.z * 0.54 + uWavePhase) * 0.29
          + cos(position.z * 0.78 - uWavePhase * 0.55) * 0.19;`);
    };
    material.customProgramCacheKey = () => 'portfolio-wave-v2';
    return material;
  }

  function waveBounds(geometry) {
    geometry.computeBoundingSphere();
    geometry.boundingSphere.radius += 0.6;
  }

  function makeHobbies() {
    const world = makeWorld(2);
    const columns = mobile ? 20 : 30;
    const rows = mobile ? 14 : 20;
    const positions = [];
    const vertices = [];
    function point(column, row) {
      const x = (column / columns - 0.5) * 10;
      const z = (row / rows - 0.5) * 8 - 1.2;
      return [x, -1.9, z];
    }
    for (let row = 0; row <= rows; row++) for (let col = 0; col <= columns; col++) {
      const p = point(col, row);
      vertices.push(...p);
      if (col < columns) positions.push(...p, ...point(col + 1, row));
      if (row < rows) positions.push(...p, ...point(col, row + 1));
    }
    waveGeometry = new THREE.BufferGeometry();
    waveGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    waveBounds(waveGeometry);
    const grid = new THREE.LineSegments(waveGeometry, animateWave(new THREE.LineBasicMaterial({ color: 0x31c5ed, transparent: true, opacity: 0.28, depthWrite: false, blending: THREE.AdditiveBlending })));
    world.group.add(grid);
    wavePointGeometry = new THREE.BufferGeometry();
    wavePointGeometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    waveBounds(wavePointGeometry);
    world.group.add(new THREE.Points(wavePointGeometry, animateWave(new THREE.PointsMaterial({ color: 0x8cf4ff, map: glowMap, size: 0.048, transparent: true, opacity: 0.56, blending: THREE.AdditiveBlending, depthWrite: false }))));
    halo(world.group, 0x00d5ff, 8.5, 0.27, new THREE.Vector3(0.3, 0.0, -3.5));
    for (let i = 0; i < 4; i++) {
      const portal = new THREE.Group();
      portal.position.set(i * 0.25, 0.10 + i * 0.10, -i * 1.65);
      portal.rotation.set(0.08, -0.10, 0.16 - i * 0.06);
      const material = lightMaterial(i ? 0x287ea8 : 0x81edff, i ? 0.42 : 0.8);
      torus(portal, 1.63 + i * 0.17, i ? 0.013 : 0.024, material);
      torus(portal, 1.77 + i * 0.17, 0.004, lightMaterial(0x47d3f4, 0.30));
      const ticks = new THREE.InstancedMesh(new THREE.BoxGeometry(0.027, 0.07, 0.025), lightMaterial(0xafefff, i ? 0.5 : 0.8), 12);
      const tickPose = new THREE.Object3D();
      for (let j = 0; j < 12; j++) {
        const a = j / 12 * Math.PI * 2;
        tickPose.position.set(Math.sin(a) * (1.73 + i * 0.17), Math.cos(a) * (1.73 + i * 0.17), 0);
        tickPose.rotation.z = -a;
        tickPose.scale.set(1, j % 3 ? 1 : 0.15 / 0.07, 1);
        tickPose.updateMatrix();
        ticks.setMatrixAt(j, tickPose.matrix);
      }
      portal.add(ticks);
      world.group.add(portal);
      portals.push(portal);
    }
    hobbyCube = new THREE.Group();
    hobbyCube.position.set(0.10, 0.16, 0.18);
    const cube = new THREE.Mesh(new THREE.BoxGeometry(0.93, 0.93, 0.93), chrome());
    hobbyCube.add(cube);
    hobbyCube.add(new THREE.LineSegments(new THREE.EdgesGeometry(cube.geometry), new THREE.LineBasicMaterial({ color: 0x9cf6ff, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false })));
    world.group.add(hobbyCube);
    const paths = new THREE.Group();
    for (let i = 0; i < 3; i++) {
      const points = [];
      for (let j = 0; j <= 45; j++) {
        const t = j / 45 * Math.PI * 2;
        points.push(new THREE.Vector3(Math.cos(t) * (2.4 + i * 0.3), Math.sin(t * 2 + i) * 0.28 - 1.2 + i * 0.32, Math.sin(t) * 1.5));
      }
      pathTube(paths, points, 0.010, lightMaterial(0x6fdef4, 0.50), true);
    }
    world.group.add(paths);
    world.paths = paths;
  }

  const tunnelRings = [];
  let factCore;
  let nebula;
  function makeFacts() {
    const world = makeWorld(3);
    nebula = new THREE.Group();
    world.group.add(nebula);
    halo(nebula, 0x535cc7, 9.4, 0.20, new THREE.Vector3(-0.6, 0.6, -7));
    halo(nebula, 0x9470dc, 6.3, 0.22, new THREE.Vector3(1.7, -0.7, -5));
    halo(nebula, 0x739ef1, 3.5, 0.17, new THREE.Vector3(0.2, 0.3, -2));
    for (let i = 0; i < 11; i++) {
      const ring = new THREE.Group();
      const z = 3.0 - i * 1.6;
      const x = Math.sin(i * 0.47) * 0.38;
      const y = Math.cos(i * 0.43) * 0.23;
      ring.position.set(x, y, z);
      const points = [];
      for (let j = 0; j < 64; j++) {
        const t = j / 64 * Math.PI * 2;
        const radius = 2.37 + Math.sin(t * 5 + i * 0.38) * 0.075;
        points.push(new THREE.Vector3(Math.cos(t) * radius, Math.sin(t) * radius * 0.87, Math.sin(t * 3 + i * 0.42) * 0.05));
      }
      pathTube(ring, points, i < 2 ? 0.013 : 0.009, lightMaterial(i % 3 ? 0x848adb : 0xb8a7ef, Math.max(0.18, 0.62 - i * 0.035)), true);
      ring.rotation.z = i * 0.16;
      world.group.add(ring);
      tunnelRings.push(ring);
    }
    for (let i = 0; i < 8; i++) {
      const points = [];
      const a = i / 8 * Math.PI * 2;
      for (let j = 0; j < 11; j++) {
        const twist = a + j * 0.16;
        points.push(new THREE.Vector3(Math.cos(twist) * 2.37 + Math.sin(j * 0.47) * 0.38, Math.sin(twist) * 2.06 + Math.cos(j * 0.43) * 0.23, 3 - j * 1.6));
      }
      pathTube(world.group, points, 0.004, lightMaterial(0x7e7fb8, 0.17));
    }
    factCore = new THREE.Group();
    factCore.position.set(0.04, 0.1, -0.8);
    const gem = new THREE.Mesh(new THREE.IcosahedronGeometry(0.60, 0), chrome());
    gem.scale.set(0.87, 1.35, 0.87);
    factCore.add(gem);
    const outer = new THREE.Mesh(new THREE.IcosahedronGeometry(0.85, 1), new THREE.MeshBasicMaterial({ color: 0xc5bfff, transparent: true, opacity: 0.18, wireframe: true, depthWrite: false }));
    outer.scale.set(0.93, 1.15, 0.93);
    factCore.add(outer);
    world.group.add(factCore);
    const positions = [];
    const colors = [];
    let seed = 4351;
    const random = () => { seed = seed * 16807 % 2147483647; return (seed - 1) / 2147483646; };
    for (let i = 0; i < (mobile ? 120 : 240); i++) {
      const a = random() * Math.PI * 2;
      const radius = 0.4 + Math.pow(random(), 0.5) * 2.0;
      positions.push(Math.cos(a) * radius, Math.sin(a) * radius * 0.85, -1 - random() * 14);
      const brightness = 0.35 + random() * 0.65;
      colors.push(brightness * 0.76, brightness * 0.79, brightness);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    world.group.add(new THREE.Points(geometry, new THREE.PointsMaterial({ map: glowMap, size: 0.050, vertexColors: true, transparent: true, opacity: 0.78, depthWrite: false, blending: THREE.AdditiveBlending })));
  }

  function makeStars() {
    let seed = 90371;
    const random = () => { seed = seed * 16807 % 2147483647; return (seed - 1) / 2147483646; };
    const positions = [];
    const colors = [];
    const count = mobile ? 180 : 360;
    for (let i = 0; i < count; i++) {
      positions.push((random() - 0.5) * 32, (random() - 0.5) * 24, 4 - random() * 77);
      const brightness = 0.22 + random() * 0.7;
      colors.push(brightness * 0.67, brightness * 0.80, brightness);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    stars.add(new THREE.Points(geometry, new THREE.PointsMaterial({ map: glowMap, size: 0.055, vertexColors: true, transparent: true, opacity: 0.87, depthWrite: false, blending: THREE.AdditiveBlending })));
    // Sparse longer streaks make the camera travel legible without flashing lights.
    const streaks = [];
    for (let i = 0; i < 42; i++) {
      const x = (random() - 0.5) * 26;
      const y = (random() - 0.5) * 20;
      const z = -random() * 65;
      streaks.push(x, y, z, x + 0.025, y + 0.08, z - 0.5 - random() * 0.6);
    }
    const lines = new THREE.BufferGeometry();
    lines.setAttribute('position', new THREE.Float32BufferAttribute(streaks, 3));
    stars.add(new THREE.LineSegments(lines, new THREE.LineBasicMaterial({ color: 0x6c8ebc, transparent: true, opacity: 0.17, blending: THREE.AdditiveBlending, depthWrite: false })));
  }

  function roundedRect(context, x, y, w, h, radius) {
    context.beginPath();
    context.moveTo(x + radius, y);
    context.lineTo(x + w - radius, y);
    context.quadraticCurveTo(x + w, y, x + w, y + radius);
    context.lineTo(x + w, y + h - radius);
    context.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
    context.lineTo(x + radius, y + h);
    context.quadraticCurveTo(x, y + h, x, y + h - radius);
    context.lineTo(x, y + radius);
    context.quadraticCurveTo(x, y, x + radius, y);
    context.closePath();
  }

  function makeCard(index, title, label) {
    const texture = canvasTexture((context, w, h) => {
      roundedRect(context, 5, 5, w - 10, h - 10, 36);
      const gradient = context.createLinearGradient(0, 0, w, h);
      gradient.addColorStop(0, '#12365a');
      gradient.addColorStop(0.7, '#071526');
      gradient.addColorStop(1, '#112846');
      context.fillStyle = gradient;
      context.fill();
      context.strokeStyle = '#80b8e9';
      context.lineWidth = 3;
      context.stroke();
      context.fillStyle = '#b7dcff';
      context.font = '600 34px Arial, sans-serif';
      context.fillText(`0${index + 1} / ${label}`, 54, 86);
      context.fillStyle = '#ffffff';
      context.font = '600 88px Arial, sans-serif';
      context.fillText(title, 51, 232);
      context.fillStyle = '#c7e4ff';
      context.font = '600 34px Arial, sans-serif';
      context.fillText('EXPLORE', 55, 342);
      context.strokeStyle = '#d2eeff';
      context.lineWidth = 4;
      context.beginPath();
      context.moveTo(w - 105, 345);
      context.lineTo(w - 60, 300);
      context.moveTo(w - 95, 300);
      context.lineTo(w - 60, 300);
      context.lineTo(w - 60, 335);
      context.stroke();
    }, 1024, 416);
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = false;
    const group = new THREE.Group();
    const geometry = new THREE.PlaneGeometry(2.08, 0.845);
    const face = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ map: texture, transparent: true, opacity: 1, depthWrite: false, depthTest: false, toneMapped: false, fog: false }));
    face.renderOrder = 10;
    face.userData.chapter = index;
    face.userData.card = group;
    group.add(face);
    const outline = new THREE.LineSegments(new THREE.EdgesGeometry(geometry), new THREE.LineBasicMaterial({ color: 0xa1d9ff, transparent: true, opacity: 0.5, depthWrite: false, depthTest: false, fog: false }));
    outline.renderOrder = 11;
    outline.position.z = -0.006;
    group.add(outline);
    gallery.add(group);
    cards.push({ index, group, face, outline, scale: 1, phase: index * 2.1 });
    pickMeshes.push(face);
  }

  function updateWorldWeight(world, weight) {
    if (weight <= 0.02) {
      world.weight = 0;
      world.group.visible = false;
      return;
    }
    if (world.group.visible && Math.abs(world.weight - weight) < 0.0003) return;
    world.weight = weight;
    world.group.visible = true;
    for (const material of world.materials) {
      material.opacity = material.userData.baseOpacity * weight;
      material.depthWrite = material.userData.solid && weight > 0.985;
    }
  }

  function applyFrame(delta = 0, animate = false) {
    if (disposed || failed) return;
    if (animate) time += delta;
    const smoothing = animate ? 1 - Math.exp(-delta * 8) : 1;
    currentScroll += (targetScroll - currentScroll) * smoothing;
    renderedDrag.lerp(drag, smoothing);
    const section = Math.min(2, Math.floor(currentScroll));
    const blend = smoothstep(0, 1, currentScroll - section);
    accent.copy(palette[section]).lerp(palette[section + 1], blend);
    backdrop.copy(backgrounds[section]).lerp(backgrounds[section + 1], blend);
    renderer.setClearColor(backdrop, 0);
    scene.fog.color.copy(backdrop);
    rim.color.copy(accent);
    fill.color.copy(accent);

    const flight = -currentScroll * spacing;
    const pathX = Math.sin(currentScroll * Math.PI * 0.75) * 0.32;
    const pathY = Math.sin(currentScroll * Math.PI) * 0.28;
    const distance = baseDistance * (1 - Math.sin(currentScroll * Math.PI) * 0.035);
    camera.position.set(pathX, pathY + 0.10, flight + distance);
    lookTarget.set(pathX, pathY * 0.38, flight - 0.4);
    camera.lookAt(lookTarget);
    const side = THREE.MathUtils.lerp(section % 2 ? -1 : 1, (section + 1) % 2 ? -1 : 1, blend);
    gallery.position.x = anchor * side;
    gallery.position.y = mobile ? -2.15 : 0;
    // Independent worlds keep the path continuous while their silhouettes change completely.
    for (let i = 0; i < worlds.length; i++) {
      const world = worlds[i];
      const difference = currentScroll - i;
      const weight = 1 - smoothstep(0.08, 0.96, Math.abs(difference));
      updateWorldWeight(world, weight);
      if (!world.group.visible) continue;
      world.group.rotation.x = renderedDrag.x + Math.sin(time * 0.15 + i) * 0.020;
      world.group.rotation.y = renderedDrag.y + Math.sin(time * 0.12 + i * 1.5) * 0.025;
      world.group.position.y = difference * 0.14;
      world.group.scale.setScalar(mobile ? 0.86 : 1);
    }
    if (worlds[0].group.visible) {
      introKnot.rotation.y = 0.08 + time * 0.095 + currentScroll * 0.38;
      introKnot.rotation.z = -0.35 + Math.sin(time * 0.15) * 0.04;
      worlds[0].flecks.rotation.z = time * 0.014;
      for (const [i, orbiter] of orbiters.entries()) {
        const angle = time * (0.13 + i * 0.025) + orbiter.phase;
        orbiter.moon.position.set(Math.cos(angle) * orbiter.radius, Math.sin(angle) * orbiter.radius, 0);
      }
    }
    if (worlds[1].group.visible) {
      achievementCrown.rotation.y = time * 0.13 + (currentScroll - 1) * 0.58;
      achievementCrown.rotation.z = Math.sin(time * 0.16) * 0.035;
      for (const crystal of crystals) crystal.shard.position.z = Math.sin(time * 0.4 + crystal.angle * 2) * 0.36;
      worlds[1].rings[0].rotation.z = -0.3 + time * 0.06;
      worlds[1].rings[1].rotation.y = -0.3 + time * 0.035;
    }
    if (worlds[2].group.visible) {
      wavePhase.value = time * 0.47 + currentScroll * 0.8;
      for (const [i, portal] of portals.entries()) portal.rotation.z = 0.16 - i * 0.06 + Math.sin(time * 0.2 + i * 0.8) * 0.03;
      hobbyCube.rotation.set(time * 0.14 + 0.35, time * 0.2 + 0.65, 0.16);
      hobbyCube.position.y = 0.16 + Math.sin(time * 0.45) * 0.1;
      worlds[2].paths.rotation.y = time * 0.026;
    }
    if (worlds[3].group.visible) {
      for (const [i, ring] of tunnelRings.entries()) ring.rotation.z = i * 0.16 + time * 0.022;
      factCore.rotation.set(Math.sin(time * 0.13) * 0.12, time * 0.16, 0.13);
      nebula.rotation.z = Math.sin(time * 0.045) * 0.08;
    }
    stars.rotation.z = Math.sin(time * 0.025) * 0.012;
    stars.position.x = -pathX * 0.2;

    // Floating links inhabit the first orbit; the active chapter retains a smaller token.
    for (const card of cards) {
      const initial = 1 - smoothstep(0.05, 0.88, currentScroll);
      const active = 1 - smoothstep(0.15, 0.63, Math.abs(currentScroll - card.index));
      const opacity = Math.max(initial, active * 0.96);
      // On a phone these tiny canvas labels become unreadable. The equivalent
      // chapter links remain available in the normal, accessible navigation.
      card.group.visible = !mobile && opacity > 0.04;
      if (!card.group.visible) continue;
      card.face.material.opacity = opacity;
      card.outline.material.opacity = opacity * (hovered === card.group ? 0.82 : 0.32);
      const goalScale = (mobile ? 0.72 : 0.94) * (hovered === card.group ? 1.065 : 1) * (1 - active * (1 - initial) * 0.12);
      card.scale += (goalScale - card.scale) * smoothing;
      card.group.scale.setScalar(card.scale);
      const positions = mobile ? [[-0.83, 1.43], [1.05, -0.1], [-0.22, -1.55]] : [[-0.97, 1.15], [0.42, 0.10], [0.10, -0.95]];
      const [x, y] = positions[card.index - 1];
      const live = active * (1 - initial);
      card.group.position.set(x * (1 - live) + (mobile ? 0 : 0.35) * live, y * (1 - live) + (mobile ? -1.92 : -1.72) * live + Math.sin(time * 0.55 + card.phase) * 0.035, flight + 0.85);
      // Navigation should stay readable while the sculpture rotates freely.
      card.group.quaternion.copy(camera.quaternion);
    }
    renderer.render(scene, camera);
    if (!ready) {
      ready = true;
      queueMicrotask(() => { if (!disposed && !failed) onReady?.(); });
    }
  }

  function fail(error) {
    if (failed || disposed) return;
    failed = true;
    cancelAnimationFrame(raf);
    raf = 0;
    releaseGesture();
    canvas.style.cursor = '';
    onError?.(error instanceof Error ? error : new Error(String(error)));
  }

  function renderOnce() {
    if (document.hidden || disposed || failed) return;
    try { applyFrame(0, false); } catch (error) { fail(error); }
  }

  function frame(timestamp) {
    raf = 0;
    if (!motion || disposed || failed || document.hidden) return;
    const interacting = gesture?.dragging || Math.abs(targetScroll - currentScroll) > 0.01 || renderedDrag.distanceToSquared(drag) > 0.0001;
    const frameInterval = 1000 / (interacting ? 60 : 30);
    if (lastFrame && timestamp - lastFrame < frameInterval - 0.6) {
      raf = requestAnimationFrame(frame);
      return;
    }
    const delta = lastFrame ? Math.min(0.08, (timestamp - lastFrame) / 1000) : 0;
    lastFrame = timestamp;
    const start = performance.now();
    try { applyFrame(delta, true); } catch (error) { fail(error); return; }
    slowFrames = performance.now() - start > 24 ? slowFrames + 1 : Math.max(0, slowFrames - 1);
    if (slowFrames >= 24 && resolutionScale > 0.77) {
      resolutionScale = Math.max(0.77, resolutionScale - 0.12);
      slowFrames = 0;
      resize();
    }
    raf = requestAnimationFrame(frame);
  }

  function resume() {
    if (motion && !document.hidden && !disposed && !failed && !raf) {
      lastFrame = 0;
      raf = requestAnimationFrame(frame);
    }
  }

  function resize() {
    if (disposed || failed) return;
    const bounds = canvas.getBoundingClientRect();
    const nextWidth = Math.max(1, bounds.width);
    const nextHeight = Math.max(1, bounds.height);
    const nextMobile = nextWidth < 760 || nextWidth / nextHeight < 0.95;
    const nextPixelRatio = Math.min(window.devicePixelRatio || 1, Math.max(0.9, (nextMobile ? 1.1 : 1.35) * resolutionScale));
    if (nextWidth === width && nextHeight === height && nextPixelRatio === pixelRatio && ready) return;
    width = nextWidth;
    height = nextHeight;
    mobile = nextMobile;
    pixelRatio = nextPixelRatio;
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    const tangent = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    // Portrait views retain the entire central silhouette instead of cutting off its orbits.
    baseDistance = mobile ? Math.max(8.3, 5.25 / (2 * tangent * camera.aspect)) : Math.max(7.8, 5.7 / (2 * tangent * camera.aspect));
    const viewWidth = 2 * tangent * baseDistance * camera.aspect;
    anchor = mobile ? 0 : viewWidth * 0.225;
    renderOnce();
  }

  function raycast(event) {
    const bounds = canvas.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return null;
    pointer.set((event.clientX - bounds.left) / bounds.width * 2 - 1, 1 - (event.clientY - bounds.top) / bounds.height * 2);
    scene.updateMatrixWorld();
    camera.updateMatrixWorld();
    raycaster.setFromCamera(pointer, camera);
    const available = pickMeshes.filter(mesh => mesh.parent.visible && mesh.material.opacity > 0.15);
    return raycaster.intersectObjects(available, false)[0]?.object || null;
  }

  function hover(event) {
    if (locked || gesture || failed || event.pointerType === 'touch') return;
    const next = raycast(event)?.userData.card || null;
    if (next === hovered) return;
    hovered = next;
    canvas.style.cursor = next ? 'pointer' : 'grab';
    if (!motion) renderOnce();
  }

  function releaseGesture() {
    if (!gesture) return;
    const id = gesture.id;
    gesture = null;
    if (canvas.hasPointerCapture?.(id)) canvas.releasePointerCapture(id);
    canvas.style.cursor = locked ? '' : hovered ? 'pointer' : 'grab';
  }

  function pointerDown(event) {
    if (locked || failed || disposed || gesture || event.isPrimary === false || (event.pointerType === 'mouse' && event.button !== 0)) return;
    gesture = { id: event.pointerId, startX: event.clientX, startY: event.clientY, lastX: event.clientX, lastY: event.clientY, travel: 0, dragging: false, type: event.pointerType };
    // Touch capture is delayed until a horizontal drag, so vertical page scrolling stays native.
    if (event.pointerType !== 'touch') canvas.setPointerCapture?.(event.pointerId);
    canvas.style.cursor = 'grabbing';
  }

  function pointerMove(event) {
    if (!gesture || gesture.id !== event.pointerId) { hover(event); return; }
    if (locked) { releaseGesture(); return; }
    const totalX = event.clientX - gesture.startX;
    const totalY = event.clientY - gesture.startY;
    gesture.travel = Math.max(gesture.travel, Math.hypot(totalX, totalY));
    if (!gesture.dragging && gesture.travel >= 8) {
      if (gesture.type === 'touch' && Math.abs(totalY) > Math.abs(totalX) * 1.08) { releaseGesture(); return; }
      gesture.dragging = true;
      hovered = null;
      canvas.setPointerCapture?.(event.pointerId);
    }
    if (gesture.dragging) {
      if (event.cancelable) event.preventDefault();
      const yawSensitivity = Math.PI * 2 / Math.max(360, Math.min(width, 900));
      // Yaw is intentionally unbounded: repeated drags can orbit every side.
      drag.y += (event.clientX - gesture.lastX) * yawSensitivity;
      drag.x = THREE.MathUtils.clamp(drag.x + (event.clientY - gesture.lastY) * 0.0055, -1.15, 1.15);
      if (!motion) renderOnce();
    }
    gesture.lastX = event.clientX;
    gesture.lastY = event.clientY;
  }

  function pointerUp(event) {
    if (!gesture || gesture.id !== event.pointerId) return;
    const eligible = !locked && !gesture.dragging && Math.max(gesture.travel, Math.hypot(event.clientX - gesture.startX, event.clientY - gesture.startY)) < 8;
    const selected = eligible ? raycast(event) : null;
    releaseGesture();
    if (selected) onSelect?.(selected.userData.chapter);
    if (event.pointerType !== 'touch') hover(event);
  }

  function pointerCancel(event) {
    if (gesture?.id === event.pointerId) releaseGesture();
  }

  function pointerLeave() {
    if (gesture) return;
    hovered = null;
    canvas.style.cursor = locked ? '' : 'grab';
    if (!motion) renderOnce();
  }

  function visibilityChange() {
    cancelAnimationFrame(raf);
    raf = 0;
    lastFrame = 0;
    releaseGesture();
    if (!document.hidden) { renderOnce(); resume(); }
  }

  function contextLost(event) {
    event.preventDefault();
    fail(new Error('The 3D view paused because the browser released its graphics context.'));
  }

  try {
    makeEnvironment();
    glowMap = makeGlowMap();
    makeIntro();
    makeAchievements();
    makeHobbies();
    makeFacts();
    for (const world of worlds) collectMaterials(world);
    makeStars();
    makeCard(1, 'Milestones.', 'ACHIEVEMENTS');
    makeCard(2, 'Side quests.', 'HOBBIES');
    makeCard(3, 'Little secrets.', 'RANDOM FACTS');
    canvas.addEventListener('pointerdown', pointerDown);
    canvas.addEventListener('pointermove', pointerMove, { passive: false });
    canvas.addEventListener('pointerup', pointerUp);
    canvas.addEventListener('pointercancel', pointerCancel);
    canvas.addEventListener('lostpointercapture', pointerCancel);
    canvas.addEventListener('pointerleave', pointerLeave);
    canvas.addEventListener('webglcontextlost', contextLost);
    document.addEventListener('visibilitychange', visibilityChange);
    window.addEventListener('resize', resize);
    if ('ResizeObserver' in window) { observer = new ResizeObserver(resize); observer.observe(canvas); }
    canvas.style.cursor = 'grab';
    resize();
    resume();
  } catch (error) {
    fail(error);
  }

  return {
    setScroll(value) {
      if (disposed || failed) return;
      targetScroll = clampScroll(value);
      if (!motion) renderOnce();
      else resume();
    },
    setChapter(index) {
      if (disposed || failed) return;
      targetScroll = THREE.MathUtils.clamp(Number.isFinite(index) ? Math.round(index) : 0, 0, 3);
      if (!motion) renderOnce();
      else resume();
    },
    setMotion(enabled) {
      if (disposed || failed) return;
      motion = Boolean(enabled);
      cancelAnimationFrame(raf);
      raf = 0;
      lastFrame = 0;
      renderOnce();
      resume();
    },
    setLocked(value) {
      if (disposed || failed) return;
      locked = Boolean(value);
      releaseGesture();
      hovered = null;
      canvas.style.cursor = locked ? '' : 'grab';
      if (!motion) renderOnce();
    },
    resetView() {
      if (disposed || failed) return;
      drag.set(0, 0);
      hovered = null;
      if (!motion) renderOnce();
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      cancelAnimationFrame(raf);
      releaseGesture();
      observer?.disconnect();
      canvas.removeEventListener('pointerdown', pointerDown);
      canvas.removeEventListener('pointermove', pointerMove);
      canvas.removeEventListener('pointerup', pointerUp);
      canvas.removeEventListener('pointercancel', pointerCancel);
      canvas.removeEventListener('lostpointercapture', pointerCancel);
      canvas.removeEventListener('pointerleave', pointerLeave);
      canvas.removeEventListener('webglcontextlost', contextLost);
      document.removeEventListener('visibilitychange', visibilityChange);
      window.removeEventListener('resize', resize);
      const geometries = new Set();
      const materials = new Set();
      scene.traverse(object => {
        if (object.geometry) geometries.add(object.geometry);
        if (object.material) for (const material of Array.isArray(object.material) ? object.material : [object.material]) materials.add(material);
        if (object.isInstancedMesh) object.dispose();
      });
      for (const geometry of geometries) geometry.dispose();
      for (const material of materials) material.dispose();
      for (const texture of textures) texture.dispose();
      environmentTarget?.dispose();
      renderer.dispose();
      canvas.style.cursor = '';
      canvas.style.touchAction = originalTouchAction;
    }
  };
}
