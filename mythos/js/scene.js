/* ============================================================
   MYTHOS — cyberpunk 3D world
   Tunnel rings + scrolling grid floor + particle field +
   wireframe core. Camera flies through the tunnel on scroll,
   with mouse parallax. Static frame when motion is reduced.
   Runs on the vendored Three.js UMD build (r144).
   ============================================================ */
(function () {
  "use strict";

  var canvas = document.getElementById("bg");
  if (!canvas || !window.THREE) return;

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var narrow = window.matchMedia("(max-width: 760px)").matches;
  var DPR = Math.min(window.devicePixelRatio || 1, narrow ? 1.4 : 1.8);

  /* ---------- renderer ---------- */
  var renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      antialias: !narrow,
      alpha: false,
      powerPreference: "high-performance"
    });
  } catch (e) {
    canvas.style.display = "none";
    return;
  }
  renderer.setPixelRatio(DPR);
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  if (THREE.sRGBEncoding !== undefined) renderer.outputEncoding = THREE.sRGBEncoding;
  if (THREE.ACESFilmicToneMapping !== undefined) {
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
  }

  var CYAN = 0x00f0ff, MAGENTA = 0xff2bd6, VIOLET = 0x7b5cff, ACID = 0xb6ff00;
  var BG = 0x05060a;

  /* ---------- scene / camera ---------- */
  var scene = new THREE.Scene();
  scene.background = new THREE.Color(BG);
  scene.fog = new THREE.FogExp2(BG, 0.019);

  var camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 400);
  camera.position.set(0, 0, 16);

  /* ---------- lights ---------- */
  scene.add(new THREE.AmbientLight(0x2a3550, 0.9));
  var hemi = new THREE.HemisphereLight(0x1f6fff, 0x05060a, 0.7);
  scene.add(hemi);

  var cyanLight = new THREE.PointLight(CYAN, 2.2, 120, 2);
  cyanLight.position.set(-9, 4, 6);
  scene.add(cyanLight);

  var magentaLight = new THREE.PointLight(MAGENTA, 2.0, 120, 2);
  magentaLight.position.set(9, -3, 2);
  scene.add(magentaLight);

  var violetLight = new THREE.PointLight(VIOLET, 1.4, 140, 2);
  violetLight.position.set(0, 0, -18);
  scene.add(violetLight);

  /* ---------- tunnel rings ---------- */
  var TUNNEL_DEPTH = 340;
  var RING_GAP = 9;
  var TUNNEL_RADIUS = 15;
  var ringCount = Math.ceil(TUNNEL_DEPTH / RING_GAP);
  var rings = [];
  var ringGeo = new THREE.TorusGeometry(TUNNEL_RADIUS, 0.045, 6, narrow ? 40 : 64);
  var ringGeoOct = new THREE.EdgesGeometry(
    new THREE.IcosahedronGeometry(TUNNEL_RADIUS * 0.72, 1)
  );

  var ringGroup = new THREE.Group();
  scene.add(ringGroup);

  for (var i = 0; i < ringCount; i++) {
    var big = i % 5 === 0;
    var tint = i % 3 === 0 ? MAGENTA : (i % 3 === 1 ? CYAN : VIOLET);

    var mat = new THREE.MeshBasicMaterial({
      color: tint,
      transparent: true,
      opacity: big ? 0.5 : 0.22,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    var ring = new THREE.Mesh(ringGeo, mat);
    ring.position.z = -i * RING_GAP;
    ring.rotation.z = (i % 2 ? 1 : -1) * (i * 0.06);
    ring.userData.spin = (i % 2 ? 1 : -1) * (0.035 + (i % 4) * 0.012);
    ring.userData.base = mat.opacity;
    ringGroup.add(ring);
    rings.push(ring);

    /* sparse facet cages for depth texture */
    if (i % 5 === 2) {
      var cage = new THREE.LineSegments(
        ringGeoOct,
        new THREE.LineBasicMaterial({
          color: tint, transparent: true, opacity: 0.16,
          blending: THREE.AdditiveBlending, depthWrite: false
        })
      );
      cage.position.z = ring.position.z;
      cage.rotation.set(i * 0.21, i * 0.33, 0);
      cage.userData.spin = (i % 2 ? -1 : 1) * 0.02;
      ringGroup.add(cage);
      rings.push(cage);
    }
  }

  /* ---------- grid floor + ceiling ---------- */
  function makeGrid(y, opacity, tint) {
    var g = new THREE.GridHelper(TUNNEL_RADIUS * 6, narrow ? 44 : 76, tint, tint);
    g.material.transparent = true;
    g.material.opacity = opacity;
    g.material.depthWrite = false;
    g.material.blending = THREE.AdditiveBlending;
    g.position.set(0, y, -TUNNEL_DEPTH * 0.45);
    g.rotation.x = Math.PI / 2;
    return g;
  }
  var floorGrid = makeGrid(-TUNNEL_RADIUS * 0.72, 0.16, CYAN);
  var ceilGrid = makeGrid(TUNNEL_RADIUS * 0.78, 0.09, MAGENTA);
  scene.add(floorGrid, ceilGrid);

  /* ---------- wireframe core ---------- */
  var coreGeo = new THREE.IcosahedronGeometry(3.4, 1);
  var coreWire = new THREE.LineSegments(
    new THREE.EdgesGeometry(coreGeo),
    new THREE.LineBasicMaterial({
      color: CYAN, transparent: true, opacity: 0.85,
      blending: THREE.AdditiveBlending, depthWrite: false
    })
  );
  var coreInner = new THREE.Mesh(
    new THREE.IcosahedronGeometry(1.9, 0),
    new THREE.MeshBasicMaterial({
      color: VIOLET, wireframe: true, transparent: true, opacity: 0.7,
      blending: THREE.AdditiveBlending, depthWrite: false
    })
  );
  var core = new THREE.Group();
  core.add(coreWire, coreInner);
  core.position.set(0, 0, -26);
  scene.add(core);

  /* ---------- particle field ---------- */
  var PARTICLE_COUNT = narrow ? 520 : 1400;
  var positions = new Float32Array(PARTICLE_COUNT * 3);
  var colors = new Float32Array(PARTICLE_COUNT * 3);
  var palette = [new THREE.Color(CYAN), new THREE.Color(MAGENTA), new THREE.Color(VIOLET), new THREE.Color(ACID)];
  var c = new THREE.Color();

  for (var p = 0; p < PARTICLE_COUNT; p++) {
    var ang = Math.random() * Math.PI * 2;
    var rad = TUNNEL_RADIUS * (0.35 + Math.random() * 0.95);
    positions[p * 3] = Math.cos(ang) * rad;
    positions[p * 3 + 1] = Math.sin(ang) * rad * 0.85;
    positions[p * 3 + 2] = -Math.random() * TUNNEL_DEPTH;

    c.copy(palette[(Math.random() * palette.length) | 0]);
    colors[p * 3] = c.r;
    colors[p * 3 + 1] = c.g;
    colors[p * 3 + 2] = c.b;
  }

  var particleGeo = new THREE.BufferGeometry();
  particleGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  particleGeo.setAttribute("color", new THREE.BufferAttribute(colors, 3));

  var particles = new THREE.Points(
    particleGeo,
    new THREE.PointsMaterial({
      size: 0.14,
      sizeAttenuation: true,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
  );
  scene.add(particles);

  /* ---------- scroll + pointer state ---------- */
  var scrollTarget = 0, scrollNow = 0;
  var pointer = { x: 0, y: 0 };
  var pointerTarget = { x: 0, y: 0 };

  function readScroll() {
    var max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    scrollTarget = Math.min(1, Math.max(0, window.scrollY / max));
  }
  readScroll();
  window.addEventListener("scroll", readScroll, { passive: true });

  if (!reduced) {
    window.addEventListener("pointermove", function (e) {
      pointerTarget.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointerTarget.y = (e.clientY / window.innerHeight) * 2 - 1;
    }, { passive: true });
  }

  /* ---------- resize ---------- */
  function onResize() {
    var w = window.innerWidth, h = window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, narrow ? 1.4 : 1.8));
    renderer.setSize(w, h, false);
    readScroll();
    if (reduced) render(0);
  }
  var resizeTimer;
  window.addEventListener("resize", function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(onResize, 120);
  });

  /* ---------- visibility gate ---------- */
  var running = true;
  document.addEventListener("visibilitychange", function () {
    running = !document.hidden;
    if (running && !reduced) clock.getDelta(); else if (running && reduced) render(0);
  });

  /* ---------- render loop ---------- */
  var clock = new THREE.Clock();
  var frames = 0;

  function render(dt) {
    frames++;
    /* gentle easing toward scroll + pointer */
    scrollNow += (scrollTarget - scrollNow) * (reduced ? 1 : 0.06);
    pointer.x += (pointerTarget.x - pointer.x) * 0.05;
    pointer.y += (pointerTarget.y - pointer.y) * 0.05;

    var travel = scrollNow * (TUNNEL_DEPTH - 40);

    /* fly the tunnel past the camera */
    ringGroup.position.z = travel;
    particles.position.z = (travel * 0.92) % TUNNEL_DEPTH;
    floorGrid.position.z = -TUNNEL_DEPTH * 0.45 + ((travel * 0.5) % (RING_GAP * 6));
    ceilGrid.position.z = -TUNNEL_DEPTH * 0.45 + ((travel * 0.5) % (RING_GAP * 6));

    /* camera sway */
    var sway = reduced ? 0 : 1;
    camera.position.x = pointer.x * 1.6 * sway + Math.sin(scrollNow * 3.1) * 0.5 * sway;
    camera.position.y = -pointer.y * 1.1 * sway + Math.cos(scrollNow * 2.4) * 0.35 * sway;
    camera.position.z = 16 - scrollNow * 3;
    camera.lookAt(0, 0, -30);

    /* ring animation */
    for (var k = 0; k < rings.length; k++) {
      var obj = rings[k];
      obj.rotation.z += obj.userData.spin * dt * 0.6;
      if (obj.userData.base !== undefined) {
        /* fade rings as they approach the camera, so nothing hard-cuts */
        var worldZ = obj.position.z + ringGroup.position.z;
        var d = Math.abs(worldZ - 0);
        obj.material.opacity = obj.userData.base * Math.min(1, d / 26);
      }
    }

    /* core */
    core.rotation.y += dt * 0.32;
    core.rotation.x += dt * 0.16;
    coreInner.rotation.y -= dt * 0.55;
    coreInner.rotation.z += dt * 0.3;
    var pulse = 1 + Math.sin(clock.elapsedTime * 1.6) * (reduced ? 0 : 0.05);
    core.scale.setScalar(pulse);
    core.position.z = -26 + scrollNow * 34;

    /* particles drift + twinkle */
    particles.rotation.z += dt * 0.02;
    particles.material.opacity = 0.72 + Math.sin(clock.elapsedTime * 0.9) * 0.18;

    /* lights follow the camera a little */
    cyanLight.position.x = -9 + pointer.x * 4;
    magentaLight.position.x = 9 + pointer.x * 4;

    renderer.render(scene, camera);
  }

  function frame() {
    if (running) {
      render(clock.getDelta());
    } else {
      clock.getDelta();
    }
    requestAnimationFrame(frame);
  }

  if (reduced) {
    render(0);
  } else {
    requestAnimationFrame(frame);
  }

  /* expose a tiny hook for QA / debugging */
  window.__mythos = {
    renderer: renderer,
    scene: scene,
    camera: camera,
    frames: function () { return frames; }
  };
})();
