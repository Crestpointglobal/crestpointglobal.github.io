/* ============================================================
   CRESTPOINT GLOBAL — procedural 3D scroll world
   A single continuous camera flight through six zones:
   Hero → Programs → Trading → AI → Mentors → Portal.
   Runs on the vendored Three.js r149 UMD build.
   ============================================================ */
(function () {
  "use strict";

  var canvas = document.getElementById("gl");
  if (!canvas || !window.THREE) return;

  var muted = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var mobile = window.matchMedia("(max-width: 760px)").matches;
  var DPR = Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 1.8);
  var baseDPR = DPR;   // adaptive resolution never exceeds this

  /* ---------- renderer / scene / camera ---------- */
  var renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      antialias: !mobile,
      alpha: false,
      powerPreference: "high-performance"
    });
  } catch (e) {
    canvas.style.display = "none";
    return;
  }
  renderer.setPixelRatio(DPR);
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  var scene = new THREE.Scene();
  var INK = new THREE.Color(0x04070f);
  scene.background = INK;
  scene.fog = new THREE.FogExp2(0x04070f, 0.0092);

  var camera = new THREE.PerspectiveCamera(56, window.innerWidth / window.innerHeight, 0.1, 700);
  camera.position.set(0, 0.6, 15);

  /* ---------- lights ---------- */
  scene.add(new THREE.AmbientLight(0x6f8fbe, 0.62));
  var hemi = new THREE.HemisphereLight(0x2b6fa8, 0x050a12, 0.7);
  scene.add(hemi);

  var keyLight = new THREE.DirectionalLight(0xffe0a8, 1.15);
  keyLight.position.set(8, 14, 8);
  scene.add(keyLight);

  var goldLight = new THREE.PointLight(0xf2b93c, 1.5, 90, 2);
  goldLight.position.set(0, 4, 8);
  scene.add(goldLight);

  var cyanLight = new THREE.PointLight(0x35d6ff, 1.15, 110, 2);
  cyanLight.position.set(-7, -2, -8);
  scene.add(cyanLight);

  /* ---------- procedural studio environment (PBR reflections) ---------- */
  (function buildEnvironment() {
    try {
      var envScene = new THREE.Scene();
      envScene.add(new THREE.Mesh(
        new THREE.BoxGeometry(20, 20, 20),
        new THREE.MeshBasicMaterial({ color: 0x050b16, side: THREE.BackSide })
      ));
      function softbox(color, intensity, x, y, z, w, h) {
        var mat = new THREE.MeshBasicMaterial({ color: color, side: THREE.DoubleSide });
        mat.color.multiplyScalar(intensity);
        var m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
        m.position.set(x, y, z);
        m.lookAt(0, 0, 0);
        envScene.add(m);
      }
      softbox(0xffc861, 5, 6, 6, 4, 6, 3);   // warm gold key
      softbox(0x35d6ff, 3.2, -7, 1, -3, 4, 7); // cyan rim
      softbox(0xffffff, 2.2, 0, 9, 0, 9, 2);  // top strip
      softbox(0x2f7dff, 2, 3, -6, -6, 8, 2);  // blue floor bounce
      var pmrem = new THREE.PMREMGenerator(renderer);
      scene.environment = pmrem.fromScene(envScene, 0.035).texture;
      pmrem.dispose();
    } catch (e) { /* environment is a nice-to-have */ }
  })();

  /* ---------- shared helpers ---------- */
  function glowTexture() {
    var c = document.createElement("canvas");
    c.width = c.height = 128;
    var g = c.getContext("2d");
    var grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grd.addColorStop(0, "rgba(255,255,255,1)");
    grd.addColorStop(0.18, "rgba(255,255,255,.8)");
    grd.addColorStop(0.42, "rgba(255,255,255,.24)");
    grd.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = grd;
    g.fillRect(0, 0, 128, 128);
    var t = new THREE.CanvasTexture(c);
    t.needsUpdate = true;
    return t;
  }
  var GLOW = glowTexture();

  function glow(color, size, opacity) {
    var s = new THREE.Sprite(new THREE.SpriteMaterial({
      map: GLOW,
      color: color,
      transparent: true,
      opacity: opacity == null ? 0.8 : opacity,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    }));
    s.scale.set(size, size, 1);
    return s;
  }

  function roundRect(g, x, y, w, h, r) {
    g.beginPath();
    g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r);
    g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r);
    g.arcTo(x, y, x + w, y, r);
    g.closePath();
  }

  function canvasTexture(w, h, draw) {
    var c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    var g = c.getContext("2d");
    draw(g, w, h);
    var t = new THREE.CanvasTexture(c);
    t.encoding = THREE.sRGBEncoding;
    t.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
    t.needsUpdate = true;
    return t;
  }

  var animated = [];   // { obj, fn }
  var spinners = [];

  /* ============================================================
     ZONE 0 — HERO GLOBE
     ============================================================ */
  var hero = new THREE.Group();
  scene.add(hero);

  var globe = new THREE.Group();
  hero.add(globe);

  var globeCore = new THREE.Mesh(
    new THREE.SphereGeometry(3.05, 48, 40),
    new THREE.MeshStandardMaterial({
      color: 0x061626,
      emissive: 0x07213c,
      emissiveIntensity: 0.38,
      roughness: 0.5,
      metalness: 0.72
    })
  );
  globe.add(globeCore);

  var globeWire = new THREE.Mesh(
    new THREE.SphereGeometry(3.1, 26, 18),
    new THREE.MeshBasicMaterial({
      color: 0x2f9bff,
      wireframe: true,
      transparent: true,
      opacity: 0.14
    })
  );
  globe.add(globeWire);

  // latitude bands
  for (var li = 0; li < 5; li++) {
    var band = new THREE.Mesh(
      new THREE.TorusGeometry(3.08 * Math.cos((li - 2) * 0.33), 0.008, 4, 96),
      new THREE.MeshBasicMaterial({ color: 0x63c8ff, transparent: true, opacity: 0.28 })
    );
    band.rotation.x = Math.PI / 2;
    band.position.y = 3.08 * Math.sin((li - 2) * 0.33);
    globe.add(band);
  }

  // shared time uniform for every custom shader in the world
  var uTime = { value: 0 };
  var uVel = { value: 0 };

  // procedural "continents": fibonacci-sphere dots masked by layered noise,
  // rendered with a shader so they twinkle and light up under a scan beam
  function continentMask(x, y, z) {
    var n = Math.sin(x * 1.9 + 1.3) * Math.cos(y * 2.2 - 0.4) * Math.sin(z * 1.7 + 2.1) +
      0.55 * Math.sin(x * 3.7 - y * 2.9 + 0.6) * Math.cos(z * 3.3 + x * 1.1) +
      0.25 * Math.sin(x * 7.1 + z * 6.3) * Math.cos(y * 6.7);
    return n;
  }
  var fibCount = mobile ? 2600 : 5200;
  var landList = [];
  var golden = Math.PI * (3 - Math.sqrt(5));
  for (var fi = 0; fi < fibCount; fi++) {
    var fy = 1 - (fi / (fibCount - 1)) * 2;
    var fr = Math.sqrt(1 - fy * fy);
    var fth = golden * fi;
    var fx = Math.cos(fth) * fr, fz = Math.sin(fth) * fr;
    if (continentMask(fx, fy, fz) > 0.12) landList.push(fx * 3.11, fy * 3.11, fz * 3.11, Math.random());
  }
  var landN = landList.length / 4;
  var landPos = new Float32Array(landN * 3);
  var landSeed = new Float32Array(landN);
  for (var pi = 0; pi < landN; pi++) {
    landPos[pi * 3] = landList[pi * 4];
    landPos[pi * 3 + 1] = landList[pi * 4 + 1];
    landPos[pi * 3 + 2] = landList[pi * 4 + 2];
    landSeed[pi] = landList[pi * 4 + 3];
  }
  var landGeo = new THREE.BufferGeometry();
  landGeo.setAttribute("position", new THREE.BufferAttribute(landPos, 3));
  landGeo.setAttribute("aSeed", new THREE.BufferAttribute(landSeed, 1));
  globe.add(new THREE.Points(landGeo, new THREE.ShaderMaterial({
    uniforms: { uTime: uTime, uPx: { value: DPR } },
    vertexShader: [
      "attribute float aSeed;",
      "uniform float uTime; uniform float uPx;",
      "varying float vA; varying float vScan;",
      "void main(){",
      "  vec4 mv = modelViewMatrix * vec4(position,1.0);",
      "  float facing = dot(normalize((modelViewMatrix*vec4(position,0.0)).xyz), vec3(0.,0.,1.));",
      "  vA = smoothstep(-0.15, 0.55, facing) * (0.55 + 0.45*sin(uTime*2.0 + aSeed*40.0));",
      "  float band = fract(position.y*0.16 - uTime*0.12);",
      "  vScan = smoothstep(0.0,0.04,band)*smoothstep(0.1,0.04,band);",
      "  gl_PointSize = (2.2 + aSeed*1.4 + vScan*3.0) * uPx * (16.0 / -mv.z);",
      "  gl_Position = projectionMatrix * mv;",
      "}"
    ].join("\n"),
    fragmentShader: [
      "varying float vA; varying float vScan;",
      "void main(){",
      "  float d = length(gl_PointCoord-0.5);",
      "  if(d>0.5) discard;",
      "  vec3 gold = vec3(1.0,0.78,0.36);",
      "  vec3 cyan = vec3(0.4,0.95,1.4);",
      "  vec3 c = mix(gold, cyan*1.6, vScan);",
      "  gl_FragColor = vec4(c*(1.2+vScan*2.0), smoothstep(0.5,0.1,d)*vA);",
      "}"
    ].join("\n"),
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  })));

  // fresnel atmosphere halo
  var atmosphere = new THREE.Mesh(
    new THREE.SphereGeometry(3.55, 48, 40),
    new THREE.ShaderMaterial({
      uniforms: { uTime: uTime },
      vertexShader: [
        "varying vec3 vN; varying vec3 vV;",
        "void main(){",
        "  vec4 mv = modelViewMatrix*vec4(position,1.0);",
        "  vN = normalize(normalMatrix*normal); vV = normalize(-mv.xyz);",
        "  gl_Position = projectionMatrix*mv;",
        "}"
      ].join("\n"),
      fragmentShader: [
        "uniform float uTime; varying vec3 vN; varying vec3 vV;",
        "void main(){",
        "  float f = pow(1.0 - abs(dot(vN, vV)), 3.2);",
        "  vec3 c = mix(vec3(0.18,0.6,1.4), vec3(1.4,0.95,0.35), 0.5+0.5*sin(uTime*0.35 + vN.y*2.0));",
        "  gl_FragColor = vec4(c*f*1.6, f);",
        "}"
      ].join("\n"),
      side: THREE.BackSide,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    })
  );
  atmosphere.scale.setScalar(1.0);
  globe.add(atmosphere);

  // flying data arcs between points on the globe, with travelling light pulses
  var arcMat = new THREE.ShaderMaterial({
    uniforms: { uTime: uTime },
    vertexShader: [
      "attribute float aT; attribute float aOff; attribute float aSpd;",
      "varying float vT; varying float vOff; varying float vSpd;",
      "void main(){ vT=aT; vOff=aOff; vSpd=aSpd;",
      "  gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }"
    ].join("\n"),
    fragmentShader: [
      "uniform float uTime; varying float vT; varying float vOff; varying float vSpd;",
      "void main(){",
      "  float head = fract(uTime*vSpd + vOff) * 1.6 - 0.3;",
      "  float tail = smoothstep(head-0.28, head, vT) * step(vT, head);",
      "  float base = 0.08;",
      "  vec3 c = mix(vec3(0.35,0.85,1.5), vec3(1.6,1.1,0.4), vT);",
      "  gl_FragColor = vec4(c*(1.0+tail*2.5), base + tail);",
      "}"
    ].join("\n"),
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });
  function randomOnSphere(r) {
    var th = Math.acos(2 * Math.random() - 1), ph = Math.random() * Math.PI * 2;
    return new THREE.Vector3(r * Math.sin(th) * Math.cos(ph), r * Math.cos(th), r * Math.sin(th) * Math.sin(ph));
  }
  var arcCount = mobile ? 10 : 18;
  for (var ai0 = 0; ai0 < arcCount; ai0++) {
    var aS = randomOnSphere(3.12), aE = randomOnSphere(3.12);
    if (aS.angleTo(aE) < 0.6) aE = aS.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), 1.4);
    var mid = aS.clone().add(aE).multiplyScalar(0.5);
    mid.setLength(3.12 + aS.distanceTo(aE) * 0.42);
    var curvePts = new THREE.QuadraticBezierCurve3(aS, mid, aE).getPoints(64);
    var aGeo = new THREE.BufferGeometry().setFromPoints(curvePts);
    var tArr = new Float32Array(curvePts.length), oArr = new Float32Array(curvePts.length), sArr = new Float32Array(curvePts.length);
    var off = Math.random(), spd = 0.18 + Math.random() * 0.22;
    for (var k = 0; k < curvePts.length; k++) { tArr[k] = k / (curvePts.length - 1); oArr[k] = off; sArr[k] = spd; }
    aGeo.setAttribute("aT", new THREE.BufferAttribute(tArr, 1));
    aGeo.setAttribute("aOff", new THREE.BufferAttribute(oArr, 1));
    aGeo.setAttribute("aSpd", new THREE.BufferAttribute(sArr, 1));
    globe.add(new THREE.Line(aGeo, arcMat));
    var ping = glow(0xffd36a, 0.34, 0.85);
    ping.position.copy(aE);
    globe.add(ping);
  }

  // instanced orbital data ring — a belt of tiny glowing satellites
  var beltCount = mobile ? 120 : 260;
  var belt = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.06, 0.06, 0.18),
    new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.9, roughness: 0.2, emissive: 0x1a3a66, emissiveIntensity: 0.6 }),
    beltCount
  );
  var beltDummy = new THREE.Object3D();
  var beltColor = new THREE.Color();
  for (var bi = 0; bi < beltCount; bi++) {
    var ba = (bi / beltCount) * Math.PI * 2 + Math.random() * 0.03;
    var br = 5.6 + (Math.random() - 0.5) * 0.55;
    beltDummy.position.set(Math.cos(ba) * br, (Math.random() - 0.5) * 0.18, Math.sin(ba) * br);
    beltDummy.rotation.set(0, -ba, 0);
    var bs = 0.5 + Math.random() * 1.2;
    beltDummy.scale.set(bs, bs, bs);
    beltDummy.updateMatrix();
    belt.setMatrixAt(bi, beltDummy.matrix);
    belt.setColorAt(bi, beltColor.set(Math.random() > 0.72 ? 0xffc861 : (Math.random() > 0.5 ? 0x7fe6ff : 0xdfe9f7)));
  }
  belt.rotation.set(1.22, 0, 0.32);
  hero.add(belt);

  // orbital arcs (echo of the logo)
  function orbitArc(radius, color, arcStart, arcLen, tube, opacity) {
    var m = new THREE.Mesh(
      new THREE.TorusGeometry(radius, tube, 8, 140, arcLen),
      new THREE.MeshStandardMaterial({
        color: color,
        emissive: color,
        emissiveIntensity: 0.85,
        metalness: 0.7,
        roughness: 0.28,
        transparent: true,
        opacity: opacity
      })
    );
    m.rotation.z = arcStart;
    return m;
  }
  var arcA = orbitArc(4.15, 0x2f9bff, 0.6, 4.4, 0.045, 0.95);
  arcA.rotation.x = 0.55;
  var arcB = orbitArc(4.55, 0xdfe9f7, 2.5, 3.2, 0.03, 0.55);
  arcB.rotation.x = -0.42;
  var arcC = orbitArc(5.1, 0xf2b93c, 0.1, 2.2, 0.022, 0.7);
  arcC.rotation.x = 1.15;
  var arcD = orbitArc(4.85, 0xf2b93c, 3.6, 2.0, 0.018, 0.5);
  arcD.rotation.x = -1.0;
  hero.add(arcA, arcB, arcC, arcD);

  var heroGlow = glow(0xf2b93c, 17, 0.12);
  heroGlow.position.set(0.6, 0.4, -2.2);
  hero.add(heroGlow);
  var heroGlow2 = glow(0x2f9bff, 12, 0.16);
  heroGlow2.position.set(-3.4, -1.2, -1);
  hero.add(heroGlow2);

  function layoutHero() {
    var wide = window.innerWidth > 1024;
    hero.position.x = wide ? 2.55 : 0;
    hero.position.y = wide ? 0.1 : -0.2;
    hero.scale.setScalar(wide ? 1 : 0.86);
  }
  layoutHero();

  // distant financial skyline of candlesticks
  var skyline = new THREE.Group();
  var candles = [];
  var candleGeo = new THREE.BoxGeometry(1, 1, 1);
  var greenMat = new THREE.MeshStandardMaterial({ color: 0x1a7a54, emissive: 0x0a3f2b, emissiveIntensity: 0.55, roughness: 0.55, metalness: 0.25 });
  var redMat = new THREE.MeshStandardMaterial({ color: 0xb03a46, emissive: 0x5e1822, emissiveIntensity: 0.5, roughness: 0.55, metalness: 0.25 });
  // Kept to the far left/right of the flight path so the camera never passes
  // through them — they read as a distant financial skyline on either side.
  for (var ci = 0; ci < (mobile ? 18 : 34); ci++) {
    var side = Math.random() > 0.5 ? 1 : -1;
    var bx = side * (24 + Math.random() * 22);
    var bz = -8 - Math.random() * 120;
    var bh = 3 + Math.random() * 11;
    var bw = 0.2 + Math.random() * 0.2;
    var mesh = new THREE.Mesh(candleGeo, Math.random() > 0.45 ? greenMat : redMat);
    mesh.scale.set(bw, bh, bw * 0.8);
    mesh.position.set(bx, -10 + bh / 2, bz);
    skyline.add(mesh);
    candles.push({ mesh: mesh, base: mesh.position.y, seed: Math.random() * Math.PI * 2 });
  }
  scene.add(skyline);

  /* ============================================================
     ZONE 1 — PROGRAMS (arc of light panels)
     ============================================================ */
  var programTitles = [
    ["01", "FOREX", "Trading"],
    ["02", "CRYPTO", "Trading"],
    ["03", "AI", "Marketing"],
    ["04", "AI", "Creative Design"],
    ["05", "WEB", "Development"],
    ["06", "DIGITAL", "Marketing"],
    ["07", "GRAPHIC", "Design"]
  ];

  var programs = new THREE.Group();
  programs.position.set(0, 0, -74);
  scene.add(programs);

  var programPanels = [];
  for (var pj = 0; pj < programTitles.length; pj++) {
    var a = (-1 + (2 * pj) / (programTitles.length - 1)) * 0.92;
    var radius = 12;
    var px = Math.sin(a) * radius;
    var pz = -Math.cos(a) * radius + 7.5;
    var py = Math.sin(pj * 1.9) * 0.42 - 0.1;

    var tex = canvasTexture(512, 330, (function (t) {
      return function (g, w, h) {
        g.clearRect(0, 0, w, h);
        var grd = g.createLinearGradient(0, 0, w, h);
        grd.addColorStop(0, "rgba(11,29,52,0.97)");
        grd.addColorStop(1, "rgba(4,10,20,0.97)");
        g.fillStyle = grd;
        roundRect(g, 6, 6, w - 12, h - 12, 26);
        g.fill();
        g.strokeStyle = "rgba(242,185,60,0.55)";
        g.lineWidth = 3;
        g.stroke();

        // faint grid
        g.strokeStyle = "rgba(120,170,220,0.07)";
        g.lineWidth = 1;
        for (var x = 40; x < w; x += 46) { g.beginPath(); g.moveTo(x, 20); g.lineTo(x, h - 20); g.stroke(); }
        for (var y = 40; y < h; y += 46) { g.beginPath(); g.moveTo(20, y); g.lineTo(w - 20, y); g.stroke(); }

        g.fillStyle = "rgba(242,185,60,0.16)";
        g.font = "800 120px Sora, Arial, sans-serif";
        g.textBaseline = "top";
        g.fillText(t[0], 34, 24);

        g.strokeStyle = "rgba(242,185,60,0.9)";
        g.lineWidth = 3;
        g.beginPath();
        g.moveTo(36, h - 108);
        g.lineTo(120, h - 108);
        g.stroke();

        g.fillStyle = "#ffffff";
        g.font = "700 48px Sora, Arial, sans-serif";
        g.fillText(t[1], 34, h - 96);
        g.fillStyle = "#f2b93c";
        g.font = "600 40px Sora, Arial, sans-serif";
        g.fillText(t[2], 34, h - 54);

        // corner ticks
        g.strokeStyle = "rgba(53,214,255,0.5)";
        g.lineWidth = 2;
        g.beginPath();
        g.moveTo(w - 58, 26); g.lineTo(w - 26, 26); g.lineTo(w - 26, 58);
        g.stroke();
      };
    })(programTitles[pj]));

    var panel = new THREE.Mesh(
      new THREE.PlaneGeometry(4.2, 2.65),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.92, side: THREE.DoubleSide })
    );
    panel.position.set(px, py, pz);
    panel.lookAt(0, 0.3, -56);
    programs.add(panel);

    var halo = glow(0xf2b93c, 4.2, 0.18);
    halo.position.copy(panel.position);
    programs.add(halo);

    programPanels.push({ mesh: panel, halo: halo, baseY: py, seed: pj });
  }

  /* ============================================================
     ZONE 2 — TRADING FLOOR
     ============================================================ */
  var trading = new THREE.Group();
  trading.position.set(0, 0, -142);
  scene.add(trading);

  // 3D candlestick chart
  var chart = new THREE.Group();
  chart.position.set(0, -1.2, -2);
  trading.add(chart);
  var chartCandles = [];
  var chartCount = mobile ? 18 : 28;
  for (var cc = 0; cc < chartCount; cc++) {
    var ch = 0.7 + Math.abs(Math.sin(cc * 0.7) + Math.sin(cc * 0.31)) * 2.4;
    var up = Math.sin(cc * 0.9) > -0.25;
    var cw = 0.34;
    var body = new THREE.Mesh(
      new THREE.BoxGeometry(cw, ch, cw),
      new THREE.MeshStandardMaterial({
        color: up ? 0x2ee08a : 0xff5d6c,
        emissive: up ? 0x0f7a4c : 0x8c2029,
        emissiveIntensity: 0.85,
        metalness: 0.45,
        roughness: 0.35
      })
    );
    var cx = (cc - (chartCount - 1) / 2) * 0.72;
    body.position.set(cx, -4 + ch / 2, 0);
    chart.add(body);

    var wick = new THREE.Mesh(
      new THREE.BoxGeometry(0.05, ch + 0.7, 0.05),
      new THREE.MeshBasicMaterial({ color: up ? 0x2ee08a : 0xff5d6c, transparent: true, opacity: 0.6 })
    );
    wick.position.set(cx, -4 + ch / 2, 0);
    chart.add(wick);
    chartCandles.push({ mesh: body, seed: cc * 0.6 });
  }

  // rising trend line through the candles
  (function buildTrend() {
    var pts = [];
    for (var i = 0; i < chartCandles.length; i++) {
      var m = chartCandles[i].mesh;
      pts.push(new THREE.Vector3(
        (i - (chartCandles.length - 1) / 2) * 0.72,
        m.position.y + m.geometry.parameters.height / 2 + 0.35,
        0
      ));
    }
    var curve = new THREE.CatmullRomCurve3(pts);
    var tube = new THREE.Mesh(
      new THREE.TubeGeometry(curve, 120, 0.028, 6, false),
      new THREE.MeshBasicMaterial({
        color: 0xffd36a,
        transparent: true,
        opacity: 0.85,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      })
    );
    chart.add(tube);
  })();

  // grid floor
  var floorGrid = new THREE.GridHelper(900, 220, 0x1e4b73, 0x11263d);
  floorGrid.position.set(0, -7, -180);
  floorGrid.material.transparent = true;
  floorGrid.material.opacity = 0.32;
  scene.add(floorGrid);

  // trading halo
  trading.add(glow(0x2ee08a, 10, 0.12).translateY(-2));

  /* ============================================================
     ZONE 3 — AI NETWORK
     ============================================================ */
  var ai = new THREE.Group();
  ai.position.set(0, 0, -212);
  scene.add(ai);

  var core = new THREE.Mesh(
    new THREE.IcosahedronGeometry(2.5, 1),
    new THREE.MeshBasicMaterial({
      color: 0x35d6ff,
      wireframe: true,
      transparent: true,
      opacity: 0.3
    })
  );
  ai.add(core);
  var coreInner = new THREE.Mesh(
    new THREE.IcosahedronGeometry(1.35, 0),
    new THREE.MeshStandardMaterial({
      color: 0x0a2540,
      emissive: 0x35d6ff,
      emissiveIntensity: 0.7,
      metalness: 0.8,
      roughness: 0.25
    })
  );
  ai.add(coreInner);
  ai.add(glow(0x35d6ff, 12, 0.26));

  // neural layers
  var layerSizes = mobile ? [3, 4, 3] : [4, 6, 5, 3];
  var nodeGroups = [];
  var nodePositions = [];
  for (var lyr = 0; lyr < layerSizes.length; lyr++) {
    var nodes = [];
    var n = layerSizes[lyr];
    for (var nd = 0; nd < n; nd++) {
      var nx = (nd - (n - 1) / 2) * 1.5;
      var ny = Math.sin(nd * 1.3 + lyr) * 1.2;
      var nz = (lyr - (layerSizes.length - 1) / 2) * 2.4;
      var node = new THREE.Mesh(
        new THREE.SphereGeometry(0.13, 12, 12),
        new THREE.MeshBasicMaterial({ color: lyr % 2 ? 0xffd36a : 0x6fe0ff })
      );
      node.position.set(nx, ny, nz);
      node.scale.setScalar(1);
      ai.add(node);
      var ng = glow(lyr % 2 ? 0xffd36a : 0x6fe0ff, 0.72, 0.32);
      ng.position.copy(node.position);
      ai.add(ng);
      nodes.push({ mesh: node, glow: ng, seed: Math.random() * 6.28 });
    }
    nodeGroups.push(nodes);
    nodePositions.push(nodes.map(function (o) { return o.mesh.position.clone(); }));
  }

  // connections
  var lineGeo = new THREE.BufferGeometry();
  var verts = [];
  var aiLinks = [];
  for (var L = 0; L < nodePositions.length - 1; L++) {
    for (var A = 0; A < nodePositions[L].length; A++) {
      for (var B = 0; B < nodePositions[L + 1].length; B++) {
        if (Math.random() > 0.62) continue;
        var p1 = nodePositions[L][A], p2 = nodePositions[L + 1][B];
        verts.push(p1.x, p1.y, p1.z, p2.x, p2.y, p2.z);
        aiLinks.push([p1, p2]);
      }
    }
  }
  lineGeo.setAttribute("position", new THREE.Float32BufferAttribute(verts, 3));
  ai.add(new THREE.LineSegments(lineGeo, new THREE.LineBasicMaterial({
    color: 0x35d6ff,
    transparent: true,
    opacity: 0.075,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  })));
  // signals firing through the network
  var aiSignals = [];
  for (var sg = 0; sg < Math.min(aiLinks.length, mobile ? 16 : 34); sg++) {
    var link = aiLinks[Math.floor(Math.random() * aiLinks.length)];
    var sp = glow(Math.random() > 0.5 ? 0xffd36a : 0x8ff0ff, 0.42, 0.95);
    ai.add(sp);
    aiSignals.push({ s: sp, a: link[0], b: link[1], off: Math.random(), spd: 0.35 + Math.random() * 0.5 });
  }
  // orbiting shells around the AI core
  var aiShells = [];
  [3.2, 3.8].forEach(function (r, i) {
    var shell = new THREE.Mesh(
      new THREE.TorusGeometry(r, 0.012, 6, 180),
      new THREE.MeshBasicMaterial({ color: i ? 0xffd36a : 0x35d6ff, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    shell.rotation.set(Math.PI / 2 + i * 0.6, i * 0.8, 0);
    ai.add(shell);
    aiShells.push(shell);
  });
  ai.scale.setScalar(0.85);

  /* ============================================================
     ZONE 4 — MENTOR MONOLITHS
     ============================================================ */
  var mentors = new THREE.Group();
  mentors.position.set(0, 0, -282);
  scene.add(mentors);

  var mentorMeta = [
    ["TK", "TALHA KHAN", "SOFTWARE / TECH"],
    ["AM", "ABDULLAH M.", "GROWTH / SALES"],
    ["AA", "ANAS ASIF", "PROJECTS / TRAINING"],
    ["AB", "ABDULLAH B. I.", "FOREX / TRADING"]
  ];

  var mentorSlabs = [];
  for (var mi = 0; mi < mentorMeta.length; mi++) {
    var mm = mentorMeta[mi];
    var mtex = canvasTexture(420, 560, function (g, w, h) {
      var grd = g.createLinearGradient(0, 0, w, h);
      grd.addColorStop(0, "rgba(14,34,58,0.98)");
      grd.addColorStop(1, "rgba(4,10,20,0.98)");
      g.fillStyle = grd;
      roundRect(g, 4, 4, w - 8, h - 8, 22);
      g.fill();
      g.strokeStyle = "rgba(242,185,60,0.6)";
      g.lineWidth = 3;
      g.stroke();

      g.strokeStyle = "rgba(120,170,220,0.1)";
      g.lineWidth = 1;
      for (var y2 = 40; y2 < h; y2 += 48) { g.beginPath(); g.moveTo(16, y2); g.lineTo(w - 16, y2); g.stroke(); }

      g.fillStyle = "rgba(242,185,60,0.14)";
      g.font = "800 170px Sora, Arial, sans-serif";
      g.textAlign = "center";
      g.fillText(mm[0], w / 2, 268);

      g.strokeStyle = "rgba(242,185,60,0.8)";
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(w / 2 - 52, 310);
      g.lineTo(w / 2 + 52, 310);
      g.stroke();

      g.fillStyle = "#ffffff";
      g.font = "700 34px Sora, Arial, sans-serif";
      g.fillText(mm[1], w / 2, 366);

      g.fillStyle = "#93a7c0";
      g.font = "500 21px Sora, Arial, sans-serif";
      g.fillText(mm[2], w / 2, 406);

      g.fillStyle = "rgba(53,214,255,0.6)";
      g.font = "600 17px Sora, Arial, sans-serif";
      g.fillText("CRESTPOINT GLOBAL", w / 2, h - 52);
    });
    mtex.needsUpdate = true;

    var ang = (-1 + (2 * mi) / (mentorMeta.length - 1)) * 0.85;
    var mr = 7.6;
    var slab = new THREE.Mesh(
      new THREE.PlaneGeometry(2.5, 3.33),
      new THREE.MeshBasicMaterial({ map: mtex, transparent: true, opacity: 0.9, side: THREE.DoubleSide })
    );
    slab.position.set(Math.sin(ang) * mr, Math.sin(mi * 1.4) * 0.45, -Math.cos(ang) * mr + 5);
    slab.lookAt(0, 0, 18);
    mentors.add(slab);
    var mglow = glow(0x35d6ff, 3.4, 0.09);
    mglow.position.copy(slab.position);
    mentors.add(mglow);
    mentorSlabs.push({ mesh: slab, baseY: slab.position.y, seed: mi * 1.3 });
  }

  /* ============================================================
     ZONE 5 — PORTAL
     ============================================================ */
  var portal = new THREE.Group();
  portal.position.set(0, 0, -352);
  scene.add(portal);

  var portalRings = [];
  var ringDefs = [
    [5.0, 0.075, 0xffd36a, 1],
    [5.9, 0.05, 0x35d6ff, 0.85],
    [6.9, 0.032, 0xf2b93c, 0.6]
  ];
  ringDefs.forEach(function (d, i) {
    var ring = new THREE.Mesh(
      new THREE.TorusGeometry(d[0], d[1], 10, 160),
      new THREE.MeshBasicMaterial({
        color: d[2],
        transparent: true,
        opacity: d[3],
        blending: THREE.AdditiveBlending,
        depthWrite: false
      })
    );
    ring.rotation.set(i * 0.4, i * 0.55, i * 0.2);
    portal.add(ring);
    portalRings.push({ mesh: ring, speed: 0.05 + i * 0.035 });
  });

  portal.add(glow(0xf2b93c, 26, 0.34));
  var portalInner = glow(0x2f9bff, 15, 0.42);
  portal.add(portalInner);
  var portalCore = glow(0xfff0c4, 7, 0.5);
  portal.add(portalCore);

  // swirling particle vortex pulled into the portal
  var vxCount = mobile ? 1400 : 3600;
  var vxPos = new Float32Array(vxCount * 3);
  var vxData = new Float32Array(vxCount * 3);
  for (var vi = 0; vi < vxCount; vi++) {
    vxData[vi * 3] = Math.random() * Math.PI * 2;      // angle
    vxData[vi * 3 + 1] = 1.2 + Math.pow(Math.random(), 0.7) * 9; // radius
    vxData[vi * 3 + 2] = Math.random();                // phase
  }
  var vxGeo = new THREE.BufferGeometry();
  vxGeo.setAttribute("position", new THREE.BufferAttribute(vxPos, 3));
  vxGeo.setAttribute("aData", new THREE.BufferAttribute(vxData, 3));
  var vortex = new THREE.Points(vxGeo, new THREE.ShaderMaterial({
    uniforms: { uTime: uTime, uPx: { value: DPR } },
    vertexShader: [
      "attribute vec3 aData; uniform float uTime; uniform float uPx; varying float vA; varying float vMix;",
      "void main(){",
      "  float life = fract(aData.z + uTime*0.07);",
      "  float r = aData.y * (1.0 - life*0.85);",
      "  float a = aData.x + uTime*(0.6/ (0.4 + r*0.25)) + life*6.0;",
      "  vec3 p = vec3(cos(a)*r, sin(a)*r, -life*14.0 + 6.0);",
      "  vec4 mv = modelViewMatrix*vec4(p,1.0);",
      "  vA = smoothstep(0.0,0.15,life)*smoothstep(1.0,0.7,life);",
      "  vMix = clamp(r/9.0,0.0,1.0);",
      "  gl_PointSize = (1.5 + (1.0-vMix)*2.5) * uPx * (22.0 / -mv.z);",
      "  gl_Position = projectionMatrix*mv;",
      "}"
    ].join("\n"),
    fragmentShader: [
      "varying float vA; varying float vMix;",
      "void main(){ float d=length(gl_PointCoord-0.5); if(d>0.5) discard;",
      "  vec3 c = mix(vec3(1.7,1.25,0.6), vec3(0.3,0.8,1.6), vMix);",
      "  gl_FragColor = vec4(c, smoothstep(0.5,0.0,d)*vA*0.9); }"
    ].join("\n"),
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  }));
  vortex.frustumCulled = false;
  portal.add(vortex);

  /* ============================================================
     Global dust
     ============================================================ */
  function dustField(count, spreadZ, size, color, opacity) {
    var pos = new Float32Array(count * 3);
    for (var i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 60;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 34;
      pos[i * 3 + 2] = 20 - Math.random() * spreadZ;
    }
    var geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    var pts = new THREE.Points(geo, new THREE.PointsMaterial({
      color: color,
      size: size,
      transparent: true,
      opacity: opacity,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true
    }));
    scene.add(pts);
    return pts;
  }
  var dustA = dustField(mobile ? 500 : 1200, 420, 0.055, 0xffd36a, 0.6);
  var dustB = dustField(mobile ? 300 : 750, 420, 0.04, 0x6fe0ff, 0.45);

  /* ============================================================
     Warp streaks — stretch with scroll velocity
     ============================================================ */
  var warpCount = mobile ? 260 : 620;
  var warpPos = new Float32Array(warpCount * 6);
  var warpEnd = new Float32Array(warpCount * 2);
  for (var wi = 0; wi < warpCount; wi++) {
    var wa = Math.random() * Math.PI * 2;
    var wr = 5 + Math.random() * 20;
    var wx = Math.cos(wa) * wr, wy = Math.sin(wa) * wr * 0.7, wz = 20 - Math.random() * 400;
    warpPos.set([wx, wy, wz, wx, wy, wz], wi * 6);
    warpEnd[wi * 2] = 0;
    warpEnd[wi * 2 + 1] = 1;
  }
  var warpGeo = new THREE.BufferGeometry();
  warpGeo.setAttribute("position", new THREE.BufferAttribute(warpPos, 3));
  warpGeo.setAttribute("aEnd", new THREE.BufferAttribute(warpEnd, 1));
  var warp = new THREE.LineSegments(warpGeo, new THREE.ShaderMaterial({
    uniforms: { uVel: uVel },
    vertexShader: [
      "attribute float aEnd; uniform float uVel; varying float vEnd;",
      "void main(){ vEnd=aEnd; vec3 p=position; p.z += aEnd * (0.2 + uVel*26.0);",
      "  gl_Position = projectionMatrix*modelViewMatrix*vec4(p,1.0); }"
    ].join("\n"),
    fragmentShader: [
      "uniform float uVel; varying float vEnd;",
      "void main(){ vec3 c = mix(vec3(1.5,1.1,0.5), vec3(0.4,0.9,1.6), vEnd);",
      "  gl_FragColor = vec4(c, clamp(uVel*3.0,0.0,0.85)*(1.0-vEnd*0.8)); }"
    ].join("\n"),
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  }));
  warp.frustumCulled = false;
  scene.add(warp);

  /* ============================================================
     Post-processing — HDR bloom, chromatic aberration, motion warp
     ============================================================ */
  var post = null;
  (function buildPost() {
    var isGL2 = renderer.capabilities.isWebGL2;
    var hdrType = isGL2 ? THREE.HalfFloatType : THREE.UnsignedByteType;
    function rt(w, h, samples, depth) {
      var t = new THREE.WebGLRenderTarget(w, h, {
        type: hdrType,
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        depthBuffer: !!depth
      });
      if (samples && isGL2) t.samples = samples;
      return t;
    }
    var quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    var quadScene = new THREE.Scene();
    var quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
    quad.frustumCulled = false;
    quadScene.add(quad);

    var VERT = "varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.0,1.0); }";

    var brightMat = new THREE.ShaderMaterial({
      uniforms: { tMap: { value: null }, uThreshold: { value: 0.62 } },
      vertexShader: VERT,
      fragmentShader: [
        "uniform sampler2D tMap; uniform float uThreshold; varying vec2 vUv;",
        "void main(){ vec3 c = texture2D(tMap,vUv).rgb;",
        "  float l = dot(c, vec3(0.2126,0.7152,0.0722));",
        "  gl_FragColor = vec4(c * smoothstep(uThreshold, uThreshold+0.45, l), 1.0); }"
      ].join("\n"),
      depthTest: false, depthWrite: false, toneMapped: false
    });

    var blurMat = new THREE.ShaderMaterial({
      uniforms: { tMap: { value: null }, uDir: { value: new THREE.Vector2() } },
      vertexShader: VERT,
      fragmentShader: [
        "uniform sampler2D tMap; uniform vec2 uDir; varying vec2 vUv;",
        "void main(){",
        "  vec3 c = texture2D(tMap,vUv).rgb*0.227027;",
        "  c += texture2D(tMap,vUv+uDir*1.3846).rgb*0.3162162;",
        "  c += texture2D(tMap,vUv-uDir*1.3846).rgb*0.3162162;",
        "  c += texture2D(tMap,vUv+uDir*3.2308).rgb*0.0702703;",
        "  c += texture2D(tMap,vUv-uDir*3.2308).rgb*0.0702703;",
        "  gl_FragColor = vec4(c,1.0); }"
      ].join("\n"),
      depthTest: false, depthWrite: false, toneMapped: false
    });

    var compMat = new THREE.ShaderMaterial({
      uniforms: {
        tScene: { value: null }, tB1: { value: null }, tB2: { value: null }, tB3: { value: null },
        uBloom: { value: mobile ? 0.8 : 1.0 }, uVel: uVel, uTime: uTime, uAspect: { value: 1 }
      },
      vertexShader: VERT,
      fragmentShader: [
        "uniform sampler2D tScene, tB1, tB2, tB3; uniform float uBloom, uVel, uTime, uAspect; varying vec2 vUv;",
        "void main(){",
        "  vec2 c = vUv - 0.5;",
        "  float r2 = dot(c*vec2(uAspect,1.0), c*vec2(uAspect,1.0));",
        "  vec2 uv = vUv - c * r2 * uVel * 0.35;",          // velocity lens warp
        "  float ca = 0.0018 + uVel*0.012;",
        "  vec2 off = c * ca * (0.4 + r2*2.0);",
        "  vec3 col;",
        "  col.r = texture2D(tScene, uv + off).r;",
        "  col.g = texture2D(tScene, uv).g;",
        "  col.b = texture2D(tScene, uv - off).b;",
        "  vec3 bloom = texture2D(tB1, uv).rgb*0.55 + texture2D(tB2, uv).rgb*0.8 + texture2D(tB3, uv).rgb*1.1;",
        "  col += bloom * uBloom;",
        "  col *= 1.0 - r2*0.55;",                          // lens vignette
        "  gl_FragColor = vec4(col, 1.0);",
        "  #include <tonemapping_fragment>",
        "  #include <encodings_fragment>",
        "  float n = fract(sin(dot(vUv*vec2(1123.0,617.0) + uTime, vec2(12.9898,78.233)))*43758.5453);",
        "  gl_FragColor.rgb += (n-0.5)*0.025;",            // film grain
        "}"
      ].join("\n"),
      depthTest: false, depthWrite: false
    });

    var sceneRT, bright, levels = [];
    function size() {
      var w = Math.floor(window.innerWidth * DPR), h = Math.floor(window.innerHeight * DPR);
      if (sceneRT) { sceneRT.dispose(); bright.dispose(); levels.forEach(function (l) { l[0].dispose(); l[1].dispose(); }); }
      sceneRT = rt(w, h, mobile ? 0 : 4, true);
      var bw = Math.max(2, w >> 1), bh = Math.max(2, h >> 1);
      bright = rt(bw, bh);
      levels = [];
      for (var i = 0; i < 3; i++) {
        var lw = Math.max(2, bw >> i), lh = Math.max(2, bh >> i);
        levels.push([rt(lw, lh), rt(lw, lh), lw, lh]);
      }
      compMat.uniforms.uAspect.value = w / h;
    }
    size();

    function pass(mat, target) {
      quad.material = mat;
      renderer.setRenderTarget(target);
      renderer.render(quadScene, quadCam);
    }

    post = {
      resize: size,
      render: function () {
        renderer.setRenderTarget(sceneRT);
        renderer.render(scene, camera);

        brightMat.uniforms.tMap.value = sceneRT.texture;
        pass(brightMat, bright);

        var src = bright.texture;
        for (var i = 0; i < levels.length; i++) {
          var L = levels[i];
          blurMat.uniforms.tMap.value = src;
          blurMat.uniforms.uDir.value.set(1 / L[2], 0);
          pass(blurMat, L[0]);
          blurMat.uniforms.tMap.value = L[0].texture;
          blurMat.uniforms.uDir.value.set(0, 1 / L[3]);
          pass(blurMat, L[1]);
          src = L[1].texture;
        }

        compMat.uniforms.tScene.value = sceneRT.texture;
        compMat.uniforms.tB1.value = levels[0][1].texture;
        compMat.uniforms.tB2.value = levels[1][1].texture;
        compMat.uniforms.tB3.value = levels[2][1].texture;
        pass(compMat, null);
      }
    };
  })();

  // render through the post stack; fall back to a plain render if a GPU
  // rejects any of the passes
  var postOK = true;
  function draw() {
    if (post && postOK) {
      try { post.render(); return; } catch (e) { postOK = false; renderer.setRenderTarget(null); }
    }
    renderer.render(scene, camera);
  }

  /* ============================================================
     Camera path
     ============================================================ */
  var camKeys = [];

  function buildKeys() {
    var vh = window.innerHeight;
    var total = Math.max(1, document.documentElement.scrollHeight - vh);
    function at(sel, bias) {
      var el = document.querySelector(sel);
      if (!el) return 0.5;
      var v = (el.offsetTop - vh * (bias == null ? 0.45 : bias)) / total;
      return Math.max(0, Math.min(1, v));
    }
    var aProg = at("#programs");
    var aTrade = Math.max(at("#trading"), aProg + 0.06);
    var aWhy = Math.max(at("#why"), aTrade + 0.06);
    var aMent = Math.max(at("#mentors"), aWhy + 0.06);
    var aAdm = Math.max(at("#admissions"), aMent + 0.06);
    var aContact = Math.max(at("#contact"), aAdm + 0.05);

    camKeys = [
      { p: 0.0, pos: [0, 0.55, 15.5], look: [0, 0.1, 0] },
      { p: Math.max(0.012, aProg * 0.3), pos: [0.9, 0.8, 9.5], look: [0, 0.1, -7] },
      { p: aProg, pos: [0, 0.45, -56], look: [0, 0.1, -74] },
      { p: aTrade, pos: [-1.4, 0.9, -120], look: [0, -0.5, -142] },
      { p: aWhy, pos: [1.2, 0.6, -190], look: [0, 0.1, -212] },
      { p: aMent, pos: [0, 0.8, -258], look: [0, 0.3, -282] },
      { p: aAdm, pos: [0, 0.75, -316], look: [0, 0.1, -352] },
      { p: aContact, pos: [0, 0.5, -330], look: [0, 0.05, -352] },
      { p: 1.0, pos: [0, 0.4, -336], look: [0, 0, -352] }
    ];
  }
  buildKeys();

  function samplePath(p) {
    p = Math.max(0, Math.min(1, p));
    var a = camKeys[0], b = camKeys[camKeys.length - 1];
    for (var i = 0; i < camKeys.length - 1; i++) {
      if (p >= camKeys[i].p && p <= camKeys[i + 1].p) {
        a = camKeys[i];
        b = camKeys[i + 1];
        break;
      }
    }
    var span = b.p - a.p || 1;
    var t = (p - a.p) / span;
    t = t * t * (3 - 2 * t); // smoothstep
    return {
      pos: [
        a.pos[0] + (b.pos[0] - a.pos[0]) * t,
        a.pos[1] + (b.pos[1] - a.pos[1]) * t,
        a.pos[2] + (b.pos[2] - a.pos[2]) * t
      ],
      look: [
        a.look[0] + (b.look[0] - a.look[0]) * t,
        a.look[1] + (b.look[1] - a.look[1]) * t,
        a.look[2] + (b.look[2] - a.look[2]) * t
      ]
    };
  }

  /* ---------- state ---------- */
  var targetProgress = 0;
  var easedProgress = 0;
  var mouseX = 0, mouseY = 0;
  var pointerX = 0, pointerY = 0;
  var scrollY = 0;

  function readScroll() {
    var doc = document.documentElement;
    var max = doc.scrollHeight - window.innerHeight;
    targetProgress = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
    scrollY = window.scrollY;
  }

  window.addEventListener("scroll", readScroll, { passive: true });

  var relayoutTimer = null;
  function relayout() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    if (post) post.resize();
    layoutHero();
    buildKeys();
    readScroll();
  }
  window.addEventListener("resize", function () {
    clearTimeout(relayoutTimer);
    relayoutTimer = setTimeout(relayout, 160);
  }, { passive: true });

  // layout settles once fonts and photos arrive
  window.addEventListener("load", function () { setTimeout(relayout, 400); });
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () { setTimeout(relayout, 120); });
  }
  setTimeout(relayout, 1600);

  window.addEventListener("pointermove", function (e) {
    mouseX = (e.clientX / window.innerWidth) * 2 - 1;
    mouseY = (e.clientY / window.innerHeight) * 2 - 1;
  }, { passive: true });

  readScroll();

  var raycaster = new THREE.Raycaster();
  var ndc = new THREE.Vector2();
  var panelMeshes = programPanels.map(function (p) { return p.mesh; });
  var hovered = null;
  var lastScrollY = window.scrollY;
  var scrollSpeed = 0;

  /* ---------- animation ---------- */
  var clock = new THREE.Clock();
  var rafId = null;
  var visible = true;

  /* ---------- adaptive resolution ----------
     Keep the flight fluid on weaker GPUs: if the frame rate dips we render
     at a lower internal resolution (all the post-processing passes shrink
     with it), then climb back toward full sharpness when there is headroom. */
  var qAcc = 0, qFrames = 0;
  function setDPR(v) {
    v = Math.max(1, Math.min(baseDPR, v));
    if (Math.abs(v - DPR) < 0.02) return;
    DPR = v;
    renderer.setPixelRatio(DPR);
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    if (post) post.resize();
  }
  function sampleQuality(dt, t) {
    if (t < 3) return;                       // ignore warm-up jank
    qAcc += dt; qFrames++;
    if (qAcc < 1) return;
    var fps = qFrames / qAcc;
    qAcc = 0; qFrames = 0;
    if (fps < 48 && DPR > 1) setDPR(DPR - 0.2);
    else if (fps > 58 && DPR < baseDPR) setDPR(DPR + 0.15);
  }

  document.addEventListener("visibilitychange", function () {
    visible = !document.hidden;
    if (visible) clock.getDelta();
  });

  function tick() {
    rafId = requestAnimationFrame(tick);
    if (!visible) return;

    var dt = Math.min(clock.getDelta(), 0.05);
    var t = clock.elapsedTime;
    uTime.value = t;

    // scroll velocity (screens per second), smoothed — drives warp streaks,
    // lens distortion and chromatic aberration
    var dy = Math.abs(window.scrollY - lastScrollY);
    lastScrollY = window.scrollY;
    var inst = Math.min(1.4, (dy / Math.max(1, window.innerHeight)) / Math.max(dt, 0.001) * 0.35);
    scrollSpeed += (inst - scrollSpeed) * Math.min(1, dt * (inst > scrollSpeed ? 6 : 2.5));
    uVel.value = scrollSpeed;
    camera.fov = 56 + scrollSpeed * 10;
    camera.updateProjectionMatrix();

    easedProgress += (targetProgress - easedProgress) * Math.min(1, dt * 4.2);
    pointerX += (mouseX - pointerX) * Math.min(1, dt * 3);
    pointerY += (mouseY - pointerY) * Math.min(1, dt * 3);

    var path = samplePath(easedProgress);
    var driftX = Math.sin(t * 0.24) * 0.16;
    var driftY = Math.cos(t * 0.19) * 0.12;

    camera.position.x += (path.pos[0] + pointerX * 0.7 + driftX - camera.position.x) * Math.min(1, dt * 5);
    camera.position.y += (path.pos[1] - pointerY * 0.45 + driftY - camera.position.y) * Math.min(1, dt * 5);
    camera.position.z += (path.pos[2] - camera.position.z) * Math.min(1, dt * 5);

    var lookAt = new THREE.Vector3(
      path.look[0] + pointerX * 0.35,
      path.look[1] - pointerY * 0.25,
      path.look[2]
    );
    camera.lookAt(lookAt);

    // gentle parallax on the hero composition
    hero.rotation.y = pointerX * 0.08 + Math.sin(t * 0.3) * 0.03;
    hero.rotation.x = -pointerY * 0.05;

    globe.rotation.y += dt * 0.09;
    globe.rotation.x = Math.sin(t * 0.18) * 0.06;
    arcA.rotation.z += dt * 0.12;
    arcB.rotation.z -= dt * 0.08;
    arcC.rotation.z += dt * 0.05;
    arcD.rotation.z -= dt * 0.06;

    // hover-reactive program panels
    ndc.set(pointerX, -pointerY);
    raycaster.setFromCamera(ndc, camera);
    var hit = raycaster.intersectObjects(panelMeshes, false)[0];
    hovered = hit && hit.distance < 40 ? hit.object : null;

    for (var i = 0; i < programPanels.length; i++) {
      var pp = programPanels[i];
      var target = pp.mesh === hovered ? 1.14 : 1;
      var sc = pp.mesh.scale.x + (target - pp.mesh.scale.x) * Math.min(1, dt * 8);
      pp.mesh.scale.setScalar(sc);
      pp.halo.scale.setScalar(4.2 * sc * (pp.mesh === hovered ? 1.35 : 1));
      pp.mesh.position.y = pp.baseY + Math.sin(t * 0.7 + pp.seed) * 0.14;
      // billboard around Y so the panels always read the right way round
      // as the camera flies past them
      pp.mesh.lookAt(camera.position.x, pp.mesh.position.y, camera.position.z);
      pp.halo.position.y = pp.mesh.position.y;
      pp.halo.material.opacity = (pp.mesh === hovered ? 0.42 : 0.16) + Math.sin(t * 1.2 + pp.seed) * 0.05;
    }

    for (var c = 0; c < chartCandles.length; c++) {
      var cb = chartCandles[c];
      cb.mesh.position.y = cb.mesh.position.y + Math.sin(t * 1.1 + cb.seed) * 0.0004;
    }

    for (var m = 0; m < mentorSlabs.length; m++) {
      var ms = mentorSlabs[m];
      ms.mesh.position.y = ms.baseY + Math.sin(t * 0.6 + ms.seed) * 0.13;
    }

    core.rotation.y += dt * 0.16;
    core.rotation.x += dt * 0.05;
    coreInner.rotation.y -= dt * 0.24;

    for (var n = 0; n < nodeGroups.length; n++) {
      var group = nodeGroups[n];
      for (var q = 0; q < group.length; q++) {
        var nd = group[q];
        var s = 0.85 + Math.sin(t * 1.8 + nd.seed + n) * 0.22;
        nd.mesh.scale.setScalar(s);
        nd.glow.scale.setScalar(0.9 * s);
        nd.glow.material.opacity = 0.25 + s * 0.3;
      }
    }

    for (var sgi = 0; sgi < aiSignals.length; sgi++) {
      var sig = aiSignals[sgi];
      var f = (t * sig.spd + sig.off) % 1;
      sig.s.position.lerpVectors(sig.a, sig.b, f);
      sig.s.material.opacity = Math.sin(f * Math.PI) * 0.95;
    }
    aiShells[0].rotation.z += dt * 0.3;
    aiShells[1].rotation.z -= dt * 0.22;
    aiShells[1].rotation.x += dt * 0.05;

    belt.rotation.y += dt * 0.06;

    portalRings.forEach(function (r) {
      r.mesh.rotation.z += dt * r.speed;
      r.mesh.rotation.y += dt * r.speed * 0.6;
    });
    portalInner.material.opacity = 0.3 + Math.sin(t * 1.4) * 0.12;

    dustA.rotation.y += dt * 0.008;
    dustB.rotation.y -= dt * 0.006;

    goldLight.position.set(Math.sin(t * 0.4) * 6, 4 + Math.sin(t * 0.7) * 1.5, 8);
    cyanLight.position.set(Math.sin(t * 0.3 + 2) * 8, -2 + Math.cos(t * 0.5) * 1.5, -8);

    sampleQuality(dt, t);
    draw();
  }

  if (muted) {
    // static, fully-lit single frame
    var still = samplePath(0);
    camera.position.set(still.pos[0], still.pos[1], still.pos[2]);
    camera.lookAt(still.look[0], still.look[1], still.look[2]);
    draw();
    window.addEventListener("resize", function () { setTimeout(draw, 200); }, { passive: true });
  } else {
    tick();
  }

  window.CrestScene = {
    renderer: renderer,
    pause: function () { if (rafId) cancelAnimationFrame(rafId); rafId = null; }
  };
})();