import * as THREE from './vendor/three.module.js';

/** A persistent, content-independent 3D gallery. All public text stays in the DOM. */
export function createPortfolioScene({ canvas, onSelect, onReady, onError } = {}) {
  const noop = () => {};
  const empty = { setChapter: noop, setMotion: noop, setLocked: noop, resetView: noop, dispose: noop };
  let renderer;
  try {
    if (!(canvas instanceof HTMLCanvasElement)) throw new Error('A canvas is required for the 3D gallery.');
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
  } catch (error) {
    onError?.(error);
    return empty;
  }

  renderer.setClearColor(0x071222, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x071222, 0.021);
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 55);
  const gallery = new THREE.Group();
  const sculpture = new THREE.Group();
  const stars = new THREE.Group();
  scene.add(gallery, stars);
  gallery.add(sculpture);

  const palettes = ['#8ccaff', '#7ddcff', '#8aafff', '#a4adff'].map(value => new THREE.Color(value));
  const accent = palettes[0].clone();
  const targetAccent = palettes[0].clone();
  const white = new THREE.Color(0xffffff);
  const targetRotation = new THREE.Vector2();
  const dragRotation = new THREE.Vector2();
  const renderedRotation = new THREE.Vector2();
  const pointer = new THREE.Vector2();
  const raycaster = new THREE.Raycaster();
  const cards = [];
  const pickMeshes = [];
  const orbiters = [];
  const trails = [];
  const disposableTextures = new Set();
  let environmentTarget;
  let raf = 0;
  let lastFrame = 0;
  let time = 0;
  let motion = true;
  let locked = false;
  let disposed = false;
  let failed = false;
  let ready = false;
  let chapter = 0;
  let hovered = null;
  let gesture = null;
  let width = 1;
  let height = 1;
  let mobile = false;
  let baseDistance = 8.7;
  let targetDistance = baseDistance;
  let cameraDistance = targetDistance;
  let targetAnchor = 0;
  let currentAnchor = 0;
  const originalTouchAction = canvas.style.touchAction;
  canvas.style.touchAction = 'pan-y';

  scene.add(new THREE.HemisphereLight(0xc6dcff, 0x0b1528, 2.2));
  const key = new THREE.DirectionalLight(0xf5f8ff, 4.2);
  key.position.set(-3, 5, 5);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x78baff, 4.5);
  rim.position.set(4, 2, -3);
  scene.add(rim);
  const blueLight = new THREE.PointLight(0x60a9ff, 15, 13, 2);
  blueLight.position.set(-1.1, -0.4, 2.5);
  gallery.add(blueLight);

  function canvasTexture(draw, textureWidth = 1024, textureHeight = 600) {
    const source = document.createElement('canvas');
    source.width = textureWidth;
    source.height = textureHeight;
    const context = source.getContext('2d');
    if (!context) throw new Error('This browser could not draw the 3D gallery artwork.');
    draw(context, textureWidth, textureHeight);
    const texture = new THREE.CanvasTexture(source);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
    disposableTextures.add(texture);
    return texture;
  }

  function roundedRect(context, x, y, w, h, r) {
    context.beginPath();
    context.moveTo(x + r, y);
    context.lineTo(x + w - r, y);
    context.quadraticCurveTo(x + w, y, x + w, y + r);
    context.lineTo(x + w, y + h - r);
    context.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    context.lineTo(x + r, y + h);
    context.quadraticCurveTo(x, y + h, x, y + h - r);
    context.lineTo(x, y + r);
    context.quadraticCurveTo(x, y, x + r, y);
    context.closePath();
  }

  function makeEnvironment() {
    const texture = canvasTexture((context, w, h) => {
      const sky = context.createLinearGradient(0, 0, 0, h);
      sky.addColorStop(0, '#07172f');
      sky.addColorStop(0.39, '#142b48');
      sky.addColorStop(0.50, '#c7def3');
      sky.addColorStop(0.60, '#162b4e');
      sky.addColorStop(1, '#030810');
      context.fillStyle = sky;
      context.fillRect(0, 0, w, h);
      for (const [x, color] of [[w * 0.16, '#f1f7ff'], [w * 0.64, '#b8d6ff'], [w * 0.82, '#6a96da']]) {
        const wash = context.createLinearGradient(x - 50, 0, x + 50, 0);
        wash.addColorStop(0, 'rgba(100,160,255,0)');
        wash.addColorStop(0.5, color);
        wash.addColorStop(1, 'rgba(100,160,255,0)');
        context.fillStyle = wash;
        context.fillRect(x - 50, h * 0.08, 100, h * 0.70);
      }
    }, 1024, 512);
    texture.mapping = THREE.EquirectangularReflectionMapping;
    const generator = new THREE.PMREMGenerator(renderer);
    environmentTarget = generator.fromEquirectangular(texture);
    scene.environment = environmentTarget.texture;
    generator.dispose();
  }

  function ribbonPoint(t) {
    const radius = 0.86 + 0.24 * Math.cos(3 * t);
    return new THREE.Vector3(radius * Math.cos(2 * t), radius * Math.sin(2 * t), 0.32 * Math.sin(3 * t));
  }

  function makeRibbon() {
    const segments = 260;
    const crossSection = [[-0.205, -0.012], [-0.188, -0.03], [0.188, -0.03], [0.205, -0.012], [0.205, 0.012], [0.188, 0.03], [-0.188, 0.03], [-0.205, 0.012]];
    const positions = [];
    const indices = [];
    const trimPaths = [[], []];
    for (let i = 0; i <= segments; i++) {
      const t = i / segments * Math.PI * 2;
      const center = ribbonPoint(t);
      const tangent = ribbonPoint(t + 0.001).sub(ribbonPoint(t - 0.001)).normalize();
      const normal = center.clone().add(new THREE.Vector3(0, 0, 0.35));
      normal.addScaledVector(tangent, -normal.dot(tangent)).normalize();
      const binormal = new THREE.Vector3().crossVectors(tangent, normal).normalize();
      const twist = 0.65 * Math.sin(t * 3);
      const twistedNormal = normal.clone().multiplyScalar(Math.cos(twist)).addScaledVector(binormal, Math.sin(twist));
      const twistedBinormal = new THREE.Vector3().crossVectors(tangent, twistedNormal).normalize();
      for (const [x, y] of crossSection) {
        const point = center.clone().addScaledVector(twistedNormal, x).addScaledVector(twistedBinormal, y);
        positions.push(point.x, point.y, point.z);
      }
      trimPaths[0].push(center.clone().addScaledVector(twistedNormal, 0.207));
      trimPaths[1].push(center.clone().addScaledVector(twistedNormal, -0.207));
      if (i === segments) continue;
      for (let j = 0; j < crossSection.length; j++) {
        const a = i * 8 + j;
        const b = i * 8 + (j + 1) % 8;
        indices.push(a, b, a + 8, b, b + 8, a + 8);
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    const material = new THREE.MeshPhysicalMaterial({ color: 0xc6daef, metalness: 1, roughness: 0.19, clearcoat: 1, clearcoatRoughness: 0.09, iridescence: 0.85, iridescenceIOR: 1.35, iridescenceThicknessRange: [180, 520], side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.set(0.48, 0.06, -0.30);
    sculpture.add(mesh);
    for (const path of trimPaths) {
      const edge = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(path), 220, 0.007, 5, false), new THREE.MeshBasicMaterial({ color: 0xb5dfff, transparent: true, opacity: 0.45 }));
      edge.rotation.copy(mesh.rotation);
      sculpture.add(edge);
    }
    return mesh;
  }

  let coreMaterial;
  let haloMaterial;
  let ribbon;
  function makeSculpture() {
    ribbon = makeRibbon();
    coreMaterial = new THREE.MeshPhysicalMaterial({ color: 0x3a78bc, metalness: 0.95, roughness: 0.12, clearcoat: 1, emissive: 0x0e254c, emissiveIntensity: 0.55 });
    const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.36, 3), coreMaterial);
    sculpture.add(core);
    const wire = new THREE.Mesh(new THREE.IcosahedronGeometry(0.366, 1), new THREE.MeshBasicMaterial({ color: 0xb1dcff, wireframe: true, transparent: true, opacity: 0.20 }));
    sculpture.add(wire);
    const glow = canvasTexture((context, w, h) => {
      const gradient = context.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
      gradient.addColorStop(0, 'rgba(111,180,255,0.48)');
      gradient.addColorStop(0.20, 'rgba(66,129,236,0.20)');
      gradient.addColorStop(0.53, 'rgba(44,91,178,0.07)');
      gradient.addColorStop(1, 'rgba(8,23,52,0)');
      context.fillStyle = gradient;
      context.fillRect(0, 0, w, h);
    }, 256, 256);
    haloMaterial = new THREE.SpriteMaterial({ map: glow, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.60 });
    const halo = new THREE.Sprite(haloMaterial);
    halo.scale.set(4.7, 4.7, 1);
    halo.position.z = -1;
    sculpture.add(halo);
    for (let i = 0; i < 3; i++) {
      const radius = 1.47 + i * 0.30;
      const orbit = new THREE.Group();
      orbit.rotation.set(0.52 + i * 0.36, 0.35 + i * 0.47, -0.3 + i * 0.50);
      const material = new THREE.MeshBasicMaterial({ color: i === 1 ? 0x527eaa : 0x8dcaff, transparent: true, opacity: i === 1 ? 0.19 : 0.29, depthWrite: false });
      orbit.add(new THREE.Mesh(new THREE.TorusGeometry(radius, 0.005, 5, 160), material));
      const satellite = new THREE.Mesh(new THREE.SphereGeometry(i === 0 ? 0.049 : 0.029, 12, 8), new THREE.MeshStandardMaterial({ color: 0xc0e6ff, metalness: 0.6, roughness: 0.12, emissive: 0x699bd4, emissiveIntensity: 1.1 }));
      orbit.add(satellite);
      orbiters.push({ group: orbit, satellite, radius, offset: i * 2.2, speed: 0.20 + i * 0.04 });
      gallery.add(orbit);
    }
  }

  function makeStars() {
    let seed = 90371;
    const random = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
    const positions = [];
    const colors = [];
    for (let i = 0; i < 390; i++) {
      positions.push((random() - 0.5) * 21, (random() - 0.5) * 12, -1.6 - random() * 11);
      const brightness = 0.30 + random() * 0.60;
      colors.push(brightness * 0.63, brightness * 0.82, brightness);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    stars.add(new THREE.Points(geometry, new THREE.PointsMaterial({ size: 0.021, vertexColors: true, transparent: true, opacity: 0.83, depthWrite: false, sizeAttenuation: true })));
  }

  function drawBadge(context, kind) {
    context.save();
    context.translate(844, 335);
    context.strokeStyle = '#a5d9ff';
    context.fillStyle = 'rgba(141,200,255,0.06)';
    context.lineWidth = 3.3;
    context.lineJoin = 'round';
    if (kind === 1) {
      context.beginPath();
      for (let i = 0; i < 12; i++) {
        const angle = -Math.PI / 2 + i / 12 * Math.PI * 2;
        const radius = i % 2 ? 53 : 68;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        i ? context.lineTo(x, y) : context.moveTo(x, y);
      }
      context.closePath(); context.fill(); context.stroke();
      context.beginPath(); context.arc(0, 0, 31, 0, Math.PI * 2); context.stroke();
      context.beginPath(); context.moveTo(-34, 54); context.lineTo(-41, 103); context.lineTo(-12, 84); context.moveTo(34, 54); context.lineTo(41, 103); context.lineTo(12, 84); context.stroke();
    } else if (kind === 2) {
      context.beginPath(); context.moveTo(0, -62); context.lineTo(62, -27); context.lineTo(62, 43); context.lineTo(0, 78); context.lineTo(-62, 43); context.lineTo(-62, -27); context.closePath(); context.fill(); context.stroke();
      context.beginPath(); context.moveTo(0, 8); context.lineTo(0, 78); context.moveTo(-62, -27); context.lineTo(0, 8); context.lineTo(62, -27); context.moveTo(-31, -45); context.lineTo(31, -10); context.lineTo(31, 60); context.moveTo(31, -45); context.lineTo(-31, -10); context.lineTo(-31, 60); context.moveTo(-62, 7); context.lineTo(0, 42); context.lineTo(62, 7); context.stroke();
    } else {
      context.font = '300 106px Arial, sans-serif';
      context.fillStyle = '#a5d9ff';
      context.fillText(':D', -60, 43);
      context.beginPath(); context.moveTo(-81, -51); context.lineTo(-81, -76); context.lineTo(-56, -76); context.moveTo(55, 76); context.lineTo(81, 76); context.lineTo(81, 51); context.stroke();
    }
    context.restore();
  }

  function cardTexture(index, title, caption) {
    return canvasTexture((context, w, h) => {
      roundedRect(context, 6, 6, w - 12, h - 12, 43);
      context.save(); context.clip();
      const gradient = context.createLinearGradient(0, 0, w, h);
      gradient.addColorStop(0, 'rgba(22,48,76,0.94)');
      gradient.addColorStop(0.55, 'rgba(10,25,45,0.95)');
      gradient.addColorStop(1, 'rgba(22,42,72,0.95)');
      context.fillStyle = gradient; context.fillRect(0, 0, w, h);
      const wash = context.createRadialGradient(w, 0, 0, w, 0, w * 0.8);
      wash.addColorStop(0, 'rgba(99,173,255,0.18)'); wash.addColorStop(1, 'rgba(99,173,255,0)');
      context.fillStyle = wash; context.fillRect(0, 0, w, h);
      context.strokeStyle = 'rgba(138,194,242,0.08)'; context.lineWidth = 1;
      for (let x = 0; x < w; x += 51) { context.beginPath(); context.moveTo(x, 0); context.lineTo(x, h); context.stroke(); }
      for (let y = 0; y < h; y += 51) { context.beginPath(); context.moveTo(0, y); context.lineTo(w, y); context.stroke(); }
      context.restore();
      roundedRect(context, 8, 8, w - 16, h - 16, 41); context.strokeStyle = 'rgba(165,215,255,0.5)'; context.lineWidth = 2; context.stroke();
      context.fillStyle = '#82b8e2'; context.font = '500 23px Arial, sans-serif'; context.fillText(`0${index + 1}  /  ${['', 'ACHIEVEMENTS', 'HOBBIES', 'RANDOM FACTS'][index]}`, 59, 86);
      context.strokeStyle = 'rgba(154,199,236,0.21)'; context.lineWidth = 1.5; context.beginPath(); context.moveTo(59, 120); context.lineTo(w - 59, 120); context.stroke();
      context.fillStyle = '#eef7ff'; context.font = '400 81px Georgia, serif'; context.fillText(title, 59, 271);
      context.fillStyle = '#93aec9'; context.font = '400 24px Arial, sans-serif'; context.fillText(caption, 62, 331);
      context.fillStyle = '#b1d6f3'; context.font = '500 21px Arial, sans-serif'; context.fillText('OPEN CHAPTER', 62, 523);
      context.beginPath(); context.moveTo(257, 516); context.lineTo(283, 490); context.moveTo(265, 490); context.lineTo(283, 490); context.lineTo(283, 508); context.strokeStyle = '#b1d6f3'; context.lineWidth = 2; context.stroke();
      drawBadge(context, index);
      context.fillStyle = '#659ac8'; context.beginPath(); context.arc(w - 62, 523, 5, 0, Math.PI * 2); context.fill();
    });
  }

  function makeCard(index, title, caption, position, rotation) {
    const group = new THREE.Group();
    const cardWidth = 1.67;
    const cardHeight = 0.98;
    const radius = 0.068;
    const shape = new THREE.Shape();
    shape.moveTo(-cardWidth / 2 + radius, -cardHeight / 2);
    shape.lineTo(cardWidth / 2 - radius, -cardHeight / 2);
    shape.quadraticCurveTo(cardWidth / 2, -cardHeight / 2, cardWidth / 2, -cardHeight / 2 + radius);
    shape.lineTo(cardWidth / 2, cardHeight / 2 - radius);
    shape.quadraticCurveTo(cardWidth / 2, cardHeight / 2, cardWidth / 2 - radius, cardHeight / 2);
    shape.lineTo(-cardWidth / 2 + radius, cardHeight / 2);
    shape.quadraticCurveTo(-cardWidth / 2, cardHeight / 2, -cardWidth / 2, cardHeight / 2 - radius);
    shape.lineTo(-cardWidth / 2, -cardHeight / 2 + radius);
    shape.quadraticCurveTo(-cardWidth / 2, -cardHeight / 2, -cardWidth / 2 + radius, -cardHeight / 2);
    const glass = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.052, bevelEnabled: false, curveSegments: 6 }), new THREE.MeshPhysicalMaterial({ color: 0x102a47, metalness: 0.15, roughness: 0.25, transmission: 0.14, transparent: true, opacity: 0.83, clearcoat: 1, depthWrite: false }));
    glass.position.z = -0.03;
    group.add(glass);
    const face = new THREE.Mesh(new THREE.PlaneGeometry(cardWidth, cardHeight), new THREE.MeshBasicMaterial({ map: cardTexture(index, title, caption), transparent: true, depthWrite: false, toneMapped: false }));
    face.position.z = 0.035;
    face.userData.chapter = index;
    face.userData.card = group;
    group.add(face);
    const linePoints = shape.getPoints(40).map(point => new THREE.Vector3(point.x, point.y, 0.042));
    const edgeMaterial = new THREE.LineBasicMaterial({ color: 0x9fdaff, transparent: true, opacity: 0.48 });
    group.add(new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(linePoints), edgeMaterial));
    group.position.copy(position);
    group.rotation.set(...rotation);
    gallery.add(group);
    const card = { index, group, face, edgeMaterial, basePosition: position.clone(), phase: index * 2.1, scale: 1 };
    cards.push(card);
    pickMeshes.push(face);

    const end = position.clone();
    const start = position.clone().multiplyScalar(0.46);
    const curve = new THREE.CubicBezierCurve3(start, new THREE.Vector3(end.x * 0.30, end.y * 0.72, -0.65), new THREE.Vector3(end.x * 0.83, end.y * 0.66, -0.30), end);
    const trailMaterial = new THREE.MeshBasicMaterial({ color: 0x6db6f1, transparent: true, opacity: 0.26, blending: THREE.AdditiveBlending, depthWrite: false });
    const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 45, 0.008, 5, false), trailMaterial);
    gallery.add(tube);
    const traveler = new THREE.Mesh(new THREE.SphereGeometry(0.019, 8, 6), new THREE.MeshBasicMaterial({ color: 0xc3e9ff, transparent: true, opacity: 0.87 }));
    gallery.add(traveler);
    trails.push({ curve, traveler, tube, index, material: trailMaterial, offset: index * 0.30 });
  }

  function applyFrame(delta = 0, animate = false) {
    if (disposed || failed) return;
    if (animate) time += delta;
    const smoothing = animate ? 1 - Math.exp(-delta * 5.5) : 1;
    accent.lerp(targetAccent, smoothing);
    renderedRotation.x += (targetRotation.x + dragRotation.x - renderedRotation.x) * smoothing;
    renderedRotation.y += (targetRotation.y + dragRotation.y - renderedRotation.y) * smoothing;
    cameraDistance += (targetDistance - cameraDistance) * smoothing;
    currentAnchor += (targetAnchor - currentAnchor) * smoothing;
    camera.position.set(0, 0.04, cameraDistance);
    camera.lookAt(0, 0, 0);
    gallery.position.x = currentAnchor;
    gallery.rotation.x = renderedRotation.x + (motion ? Math.sin(time * 0.27) * 0.018 : 0);
    gallery.rotation.y = renderedRotation.y + (motion ? Math.sin(time * 0.20) * 0.022 : 0);
    sculpture.rotation.y = motion ? time * 0.10 : 0;
    sculpture.rotation.z = motion ? Math.sin(time * 0.16) * 0.025 : 0;
    ribbon.material.color.copy(accent).lerp(white, 0.63);
    coreMaterial.color.copy(accent).multiplyScalar(0.55);
    coreMaterial.emissive.copy(accent).multiplyScalar(0.10);
    blueLight.color.copy(accent);
    haloMaterial.color.copy(accent);
    for (const orbiter of orbiters) {
      const angle = (motion ? time * orbiter.speed : 0) + orbiter.offset;
      orbiter.satellite.position.set(Math.cos(angle) * orbiter.radius, Math.sin(angle) * orbiter.radius, 0);
    }
    for (const card of cards) {
      const selected = card.index === chapter;
      const goalScale = hovered === card.group ? 1.065 : selected ? 1.035 : 1;
      card.scale += (goalScale - card.scale) * smoothing;
      card.group.scale.setScalar(card.scale);
      card.group.position.copy(card.basePosition);
      if (motion) {
        card.group.position.y += Math.sin(time * 0.65 + card.phase) * 0.065;
        card.group.position.z += Math.cos(time * 0.43 + card.phase) * 0.065;
      }
      card.edgeMaterial.opacity = hovered === card.group ? 0.97 : selected ? 0.83 : 0.39;
    }
    for (const trail of trails) {
      trail.material.color.copy(accent);
      const progress = ((motion ? time * 0.12 : 0.18) + trail.offset) % 1;
      trail.traveler.position.copy(trail.curve.getPoint(progress));
    }
    stars.rotation.z = motion ? Math.sin(time * 0.03) * 0.025 : 0;
    scene.updateMatrixWorld();
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
    const delta = lastFrame ? Math.min(0.04, (timestamp - lastFrame) / 1000) : 0;
    lastFrame = timestamp;
    try { applyFrame(delta, true); } catch (error) { fail(error); return; }
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
    width = Math.max(1, bounds.width);
    height = Math.max(1, bounds.height);
    mobile = width < 760 || width / height < 0.95;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, width < 760 ? 1.5 : 2));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    const tangent = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    baseDistance = Math.max(8.7, (mobile ? 5.1 : 6.9) / (2 * tangent * camera.aspect));
    targetDistance = baseDistance * [1, 1.035, 1.015, 1.04][chapter];
    const viewWidth = 2 * tangent * targetDistance * camera.aspect;
    targetAnchor = mobile ? 0 : viewWidth * 0.15;
    for (const card of cards) {
      if (card.index === 1) card.basePosition.set(mobile ? -0.91 : -1.12, 1.36, 0.25);
      if (card.index === 2) card.basePosition.set(mobile ? 1.11 : 1.63, 0.30, 0.12);
      if (card.index === 3) card.basePosition.set(mobile ? 0.20 : 0.74, -1.54, 0.52);
    }
    for (const trail of trails) {
      const end = cards.find(card => card.index === trail.index).basePosition;
      if (trail.curve.v3.equals(end)) continue;
      trail.curve.v0.copy(end).multiplyScalar(0.46);
      trail.curve.v1.set(end.x * 0.30, end.y * 0.72, -0.65);
      trail.curve.v2.set(end.x * 0.83, end.y * 0.66, -0.30);
      trail.curve.v3.copy(end);
      trail.tube.geometry.dispose();
      trail.tube.geometry = new THREE.TubeGeometry(trail.curve, 45, 0.008, 5, false);
    }
    // Resize snaps directly: a large desktop-to-mobile transition never flies across the viewport.
    cameraDistance = targetDistance;
    currentAnchor = targetAnchor;
    renderOnce();
  }

  function raycast(event) {
    const bounds = canvas.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return null;
    pointer.set((event.clientX - bounds.left) / bounds.width * 2 - 1, 1 - (event.clientY - bounds.top) / bounds.height * 2);
    scene.updateMatrixWorld();
    camera.updateMatrixWorld();
    raycaster.setFromCamera(pointer, camera);
    return raycaster.intersectObjects(pickMeshes, false)[0]?.object || null;
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
    const pointerId = gesture.id;
    gesture = null;
    if (canvas.hasPointerCapture?.(pointerId)) canvas.releasePointerCapture(pointerId);
    canvas.style.cursor = locked ? '' : hovered ? 'pointer' : 'grab';
  }

  function pointerDown(event) {
    if (locked || failed || disposed || gesture || event.isPrimary === false || (event.pointerType === 'mouse' && event.button !== 0)) return;
    gesture = { id: event.pointerId, startX: event.clientX, startY: event.clientY, lastX: event.clientX, lastY: event.clientY, travel: 0, dragging: false, scrolling: false, type: event.pointerType };
    canvas.setPointerCapture?.(event.pointerId);
    canvas.style.cursor = 'grabbing';
  }

  function pointerMove(event) {
    if (!gesture || gesture.id !== event.pointerId) { hover(event); return; }
    if (locked) { releaseGesture(); return; }
    const totalX = event.clientX - gesture.startX;
    const totalY = event.clientY - gesture.startY;
    gesture.travel = Math.max(gesture.travel, Math.hypot(totalX, totalY));
    if (!gesture.dragging && gesture.travel >= 8) {
      // Horizontal touch gestures rotate; vertical gestures remain native page scrolling.
      if (gesture.type === 'touch' && Math.abs(totalY) > Math.abs(totalX) * 1.15) {
        gesture.scrolling = true;
        releaseGesture();
        return;
      }
      gesture.dragging = true;
      hovered = null;
    }
    if (gesture.dragging) {
      if (event.cancelable) event.preventDefault();
      dragRotation.y = THREE.MathUtils.clamp(dragRotation.y + (event.clientX - gesture.lastX) * 0.0048, -0.85, 0.85);
      dragRotation.x = THREE.MathUtils.clamp(dragRotation.x + (event.clientY - gesture.lastY) * 0.0035, -0.48, 0.48);
      if (!motion) renderOnce();
    }
    gesture.lastX = event.clientX;
    gesture.lastY = event.clientY;
  }

  function pointerUp(event) {
    if (!gesture || gesture.id !== event.pointerId) return;
    const eligible = !locked && !gesture.dragging && !gesture.scrolling && Math.max(gesture.travel, Math.hypot(event.clientX - gesture.startX, event.clientY - gesture.startY)) < 8;
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

  let observer;
  try {
    makeEnvironment();
    makeSculpture();
    makeStars();
    makeCard(1, 'Milestones.', 'Little wins. Bigger possibilities.', new THREE.Vector3(-1.12, 1.36, 0.25), [-0.06, 0.17, 0.035]);
    makeCard(2, 'Side quests.', 'Things I love getting lost in.', new THREE.Vector3(1.63, 0.30, 0.12), [0.08, -0.20, -0.055]);
    makeCard(3, 'Little secrets.', 'A few unexpected things about me.', new THREE.Vector3(0.74, -1.54, 0.52), [0.045, -0.08, 0.045]);
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
    setChapter(index) {
      if (disposed || failed) return;
      chapter = THREE.MathUtils.clamp(Number.isFinite(index) ? Math.round(index) : 0, 0, 3);
      targetAccent.copy(palettes[chapter]);
      targetDistance = baseDistance * [1, 1.035, 1.015, 1.04][chapter];
      const rotations = [[0, 0], [-0.08, -0.12], [0.05, 0.16], [0.075, -0.075]];
      targetRotation.set(...rotations[chapter]);
      if (!motion) renderOnce();
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
      dragRotation.set(0, 0);
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
      });
      for (const geometry of geometries) geometry.dispose();
      for (const material of materials) material.dispose();
      for (const texture of disposableTextures) texture.dispose();
      environmentTarget?.dispose();
      renderer.dispose();
      canvas.style.cursor = '';
      canvas.style.touchAction = originalTouchAction;
    }
  };
}
