/* ============================================================
   CRESTPOINT GLOBAL — Group of companies

   Renders the CEO's other companies as cards, each with its own
   small animated Three.js scene (built from primitives):

     academy      → books + graduation cap + floating sparks
     construction → building rising + slewing tower crane
     transport    → Pakistani-style intercity coach, wheels turning
     marketing    → growth bars + rising arrow + megaphone + orbit

   Each scene renders only while on screen and only ~30fps, so the
   four extra WebGL contexts stay cheap next to the main world.
   ============================================================ */
(function () {
  "use strict";

  var CP = window.CP || {};
  if (!CP.companies || !CP.companies.length) return;

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var esc = function (v) {
    return String(v == null ? "" : v).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  };

  /* ---------------- logo marks (inline SVG) ---------------- */
  var MARKS = {
    "al-ameer-academy":
      '<svg viewBox="0 0 24 24" role="img" aria-hidden="true"><path d="M2.6 9.1 12 4.5l9.4 4.6L12 13.7 2.6 9.1Z"/><path d="M6.3 11.2v4.3c0 1.5 2.6 2.9 5.7 2.9s5.7-1.4 5.7-2.9v-4.3"/><path d="M21.4 9.1v5.3"/></svg>',
    "jeejal-enterprises":
      '<svg viewBox="0 0 24 24" role="img" aria-hidden="true"><path d="M3 20.6V7.4l6.6-2.8v16"/><path d="M9.6 20.6H21"/><path d="M13.4 20.6v-7.2h5v7.2"/><path d="M26 3.4h-5"/><path d="M5.4 10.6h1.6M5.4 13.6h1.6M5.4 16.6h1.6"/></svg>',
    "al-naseeb-transport":
      '<svg viewBox="0 0 24 24" role="img" aria-hidden="true"><rect x="2.5" y="4.6" width="19" height="10.6" rx="2.6"/><path d="M2.5 10.9h19"/><path d="M8.2 4.6v6.3M13 4.6v6.3"/><circle cx="7" cy="17.4" r="1.9"/><circle cx="17" cy="17.4" r="1.9"/></svg>',
    "werben":
      '<svg viewBox="0 0 24 24" role="img" aria-hidden="true"><path d="M3.4 10.3v3.4a1.4 1.4 0 0 0 1.4 1.4h1.7l6.6 3.5V5.4L6.5 8.9H4.8a1.4 1.4 0 0 0-1.4 1.4Z"/><path d="M16.4 9.1a3.7 3.7 0 0 1 0 5.8"/><path d="M18.9 6.6a7.3 7.3 0 0 1 0 10.8"/><path d="m7.4 15.1 1.4 5.1"/></svg>'
  };

  /* ---------------- render the cards ---------------- */
  var grid = $("#coGrid");
  if (grid) {
    grid.innerHTML = CP.companies.map(function (c, i) {
      var mark = MARKS[c.id] || MARKS.werben;
      return (
        '<article class="co-card" data-reveal style="--d:' + (i * 0.06).toFixed(2) +
          "s;--accent:" + esc(c.accent) + ";--accent2:" + esc(c.accent2) + '">' +
          '<div class="co-stage">' +
            '<canvas class="co-canvas" data-model="' + esc(c.model) + '" data-accent="' + esc(c.accent) +
              '" data-accent2="' + esc(c.accent2) + '" aria-hidden="true"></canvas>' +
            '<div class="co-mark" aria-hidden="true">' + mark + "</div>" +
            '<span class="co-index">' + ("0" + (i + 1)).slice(-2) + "</span>" +
            '<span class="co-chip">' + esc(c.kind) + "</span>" +
          "</div>" +
          '<div class="co-body">' +
            '<div class="co-head">' +
              '<span class="co-logo" aria-hidden="true">' + mark + "</span>" +
              "<div><h3>" + esc(c.name) + "</h3>" +
              '<p class="co-kind">' + esc(c.kind) + "</p></div>" +
            "</div>" +
            '<p class="co-tag">' + esc(c.tag) + "</p>" +
            '<p class="co-desc">' + esc(c.desc) + "</p>" +
            '<ul class="co-features">' + c.features.map(function (f) {
              return "<li>" + esc(f) + "</li>";
            }).join("") + "</ul>" +
            '<div class="co-foot">' +
              '<p class="co-addr"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 10c0 6-9 12-9 12s-9-6-9-12a9 9 0 0 1 18 0Z"/><circle cx="12" cy="10" r="3"/></svg>' +
              "<span>" + esc(c.address) + "</span></p>" +
              '<span class="co-reg"><i></i>FBR Registered</span>' +
            "</div>" +
          "</div>" +
        "</article>"
      );
    }).join("");
  }

  if (!window.THREE) {
    $$(".co-card").forEach(function (c) { c.classList.add("co-card--flat"); });
    return;
  }

  /* ---------------- tiny material helper ---------------- */
  function std(color, o) {
    o = o || {};
    return new THREE.MeshStandardMaterial({
      color: color,
      roughness: o.roughness == null ? 0.5 : o.roughness,
      metalness: o.metalness == null ? 0.25 : o.metalness,
      emissive: o.emissive == null ? 0x000000 : o.emissive,
      emissiveIntensity: o.emissiveIntensity == null ? 1 : o.emissiveIntensity,
      flatShading: !!o.flat,
      transparent: !!o.transparent,
      opacity: o.opacity == null ? 1 : o.opacity
    });
  }
  function clamp(n) { return n < 0 ? 0 : n > 1 ? 1 : n; }

  /* ============================================================
     MODEL — Al Ameer Academy : books + graduation cap
     ============================================================ */
  function buildAcademy(accent, accent2) {
    var g = new THREE.Group();
    var books = [];
    var cols = [accent, 0x2f7dff, accent2];
    for (var i = 0; i < 3; i++) {
      var b = new THREE.Mesh(
        new THREE.BoxGeometry(2.0 - i * 0.12, 0.28, 1.34 - i * 0.08),
        std(cols[i], { roughness: 0.55, metalness: 0.18 })
      );
      b.position.set(i % 2 ? 0.08 : -0.06, 0.15 + i * 0.29, 0);
      b.rotation.y = (i - 1) * 0.1;
      g.add(b); books.push(b);
      var pages = new THREE.Mesh(
        new THREE.BoxGeometry(1.88 - i * 0.12, 0.15, 1.24 - i * 0.08),
        std(0xf6f1e4, { roughness: 0.9, metalness: 0.05 })
      );
      pages.position.set(b.position.x, b.position.y, 0.09);
      pages.rotation.y = b.rotation.y;
      g.add(pages);
    }

    var cap = new THREE.Group();
    cap.position.y = 1.18;
    g.add(cap);
    var skull = new THREE.Mesh(
      new THREE.CylinderGeometry(0.44, 0.5, 0.34, 26),
      std(0x18263f, { roughness: 0.42, metalness: 0.3, emissive: 0x0b1730, emissiveIntensity: 0.5 })
    );
    skull.position.y = 0.17; cap.add(skull);
    var board = new THREE.Mesh(
      new THREE.BoxGeometry(1.62, 0.1, 1.62),
      std(0x101d33, { roughness: 0.35, metalness: 0.4, emissive: 0x0d1c36, emissiveIntensity: 0.6 })
    );
    board.position.y = 0.38; board.rotation.y = Math.PI / 4; cap.add(board);
    var edge = new THREE.Mesh(
      new THREE.BoxGeometry(1.68, 0.035, 1.68),
      std(accent, { metalness: 0.85, roughness: 0.25, emissive: 0x6b4a06, emissiveIntensity: 0.85 })
    );
    edge.position.y = 0.335; edge.rotation.y = Math.PI / 4; cap.add(edge);
    var button = new THREE.Mesh(
      new THREE.SphereGeometry(0.075, 14, 14),
      std(accent, { metalness: 0.85, roughness: 0.25, emissive: 0x6b4a06, emissiveIntensity: 0.7 })
    );
    button.position.y = 0.45; cap.add(button);

    var tassel = new THREE.Group();
    tassel.position.set(0.63, 0.4, 0.63);
    cap.add(tassel);
    var cord = new THREE.Mesh(
      new THREE.CylinderGeometry(0.018, 0.018, 0.5, 8),
      std(accent, { metalness: 0.6, roughness: 0.35, emissive: 0x4a3200, emissiveIntensity: 0.5 })
    );
    cord.position.y = -0.25; tassel.add(cord);
    var knot = new THREE.Mesh(
      new THREE.CylinderGeometry(0.09, 0.05, 0.22, 12),
      std(accent, { metalness: 0.6, roughness: 0.35, emissive: 0x4a3200, emissiveIntensity: 0.5 })
    );
    knot.position.y = -0.6; tassel.add(knot);

    var sparks = [];
    for (var p = 0; p < 14; p++) {
      var pt = new THREE.Mesh(
        new THREE.SphereGeometry(0.032 + Math.random() * 0.03, 8, 8),
        std(Math.random() > 0.5 ? accent : accent2, { emissive: 0x39391a, emissiveIntensity: 1.3, metalness: 0.5, roughness: 0.3 })
      );
      var ang = Math.random() * Math.PI * 2, rad = 1.25 + Math.random() * 1.15;
      var yy = 0.3 + Math.random() * 1.9;
      pt.position.set(Math.cos(ang) * rad, yy, Math.sin(ang) * rad);
      g.add(pt);
      sparks.push({ m: pt, ang: ang, rad: rad, y: yy, spd: 0.18 + Math.random() * 0.3 });
    }

    return {
      group: g,
      view: { y: 1.95, z: 6.7, ty: 1.0 },
      update: function (t) {
        cap.position.y = 1.18 + Math.sin(t * 1.3) * 0.06;
        cap.rotation.y = Math.sin(t * 0.45) * 0.36;
        tassel.rotation.z = Math.sin(t * 1.7) * 0.3;
        tassel.rotation.x = Math.cos(t * 1.4) * 0.22;
        for (var i = 0; i < books.length; i++) {
          books[i].rotation.y = (i - 1) * 0.1 + Math.sin(t * 0.6 + i * 1.3) * 0.05;
        }
        for (var s = 0; s < sparks.length; s++) {
          var o = sparks[s], a = o.ang + t * o.spd;
          o.m.position.set(Math.cos(a) * o.rad, o.y + Math.sin(t * 1.1 + o.ang) * 0.13, Math.sin(a) * o.rad);
        }
      }
    };
  }

  /* ============================================================
     MODEL — Jeejal Enterprises : rising building + tower crane
     ============================================================ */
  function buildConstruction(accent, accent2) {
    var g = new THREE.Group();
    var ground = new THREE.Mesh(
      new THREE.BoxGeometry(5.4, 0.24, 3.7),
      std(0x2b323d, { roughness: 0.92, metalness: 0.1 })
    );
    ground.position.y = 0.12; g.add(ground);

    var steel = 0xb7c0cd, conc = 0x9aa6b4, FH = 0.62, floors = [];
    for (var i = 0; i < 4; i++) {
      var fg = new THREE.Group();
      fg.position.set(-1.15, 0.24 + i * FH, 0);
      g.add(fg);
      var plate = new THREE.Mesh(new THREE.BoxGeometry(2.05, 0.14, 1.6), std(conc, { roughness: 0.72, metalness: 0.14 }));
      plate.position.y = 0.09; fg.add(plate);
      [[-0.86, -0.64], [-0.86, 0.64], [0.86, -0.64], [0.86, 0.64]].forEach(function (p) {
        var col = new THREE.Mesh(new THREE.BoxGeometry(0.13, FH, 0.13), std(steel, { roughness: 0.5, metalness: 0.5 }));
        col.position.set(p[0], FH / 2, p[1]); fg.add(col);
      });
      floors.push(fg);
    }

    var crane = new THREE.Group();
    crane.position.set(1.75, 0.24, 0);
    g.add(crane);
    var mast = new THREE.Mesh(
      new THREE.BoxGeometry(0.2, 4.7, 0.2),
      std(accent, { roughness: 0.4, metalness: 0.65, emissive: 0x2a1c00, emissiveIntensity: 0.4 })
    );
    mast.position.y = 2.35; crane.add(mast);

    var jib = new THREE.Group();
    jib.position.y = 4.6;
    crane.add(jib);
    var arm = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.13, 0.13), std(accent, { roughness: 0.4, metalness: 0.65 }));
    arm.position.x = 1.15; jib.add(arm);
    var tip = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.95, 0.13), std(accent, { metalness: 0.65, roughness: 0.4 }));
    tip.position.set(2.62, 0.44, 0); jib.add(tip);
    var counter = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.52, 0.62), std(0x59616e, { roughness: 0.75 }));
    counter.position.set(-0.9, -0.06, 0); jib.add(counter);
    var cab = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.42, 0.5),
      std(0x1d2531, { roughness: 0.4, metalness: 0.4, emissive: 0x0a1626, emissiveIntensity: 0.6 })
    );
    cab.position.set(-0.34, -0.3, 0); jib.add(cab);

    var trolley = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.16, 0.3), std(0x3a424f, { metalness: 0.6, roughness: 0.45 }));
    jib.add(trolley);
    var cable = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1, 6), std(0x9aa3b2, { metalness: 0.7, roughness: 0.4 }));
    jib.add(cable);
    var hook = new THREE.Mesh(
      new THREE.BoxGeometry(0.34, 0.26, 0.34),
      std(accent2, { roughness: 0.5, metalness: 0.45, emissive: 0x5a2400, emissiveIntensity: 0.5 })
    );
    jib.add(hook);
    var load = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.42, 0.62), std(0xd9b26a, { roughness: 0.85, metalness: 0.05 }));
    jib.add(load);

    var beacon = new THREE.Mesh(
      new THREE.SphereGeometry(0.095, 12, 12),
      std(0xff5a3c, { emissive: 0xff4a2a, emissiveIntensity: 2, roughness: 0.4 })
    );
    beacon.position.y = 4.78; crane.add(beacon);

    return {
      group: g,
      view: { y: 3.15, z: 10.4, ty: 2.0 },
      update: function (t) {
        var cyc = (t / 11) % 1;
        for (var i = 0; i < floors.length; i++) {
          var s = clamp((cyc - i * 0.13) / 0.2) - clamp((cyc - 0.86) / 0.1);
          s = Math.max(0, Math.min(1, s));
          floors[i].scale.y = Math.max(0.001, s);
          floors[i].scale.x = floors[i].scale.z = 0.85 + 0.15 * s;
        }
        jib.rotation.y = t * 0.42;
        var tx = 1.0 + Math.sin(t * 0.6) * 1.0;
        var drop = 1.5 + Math.sin(t * 0.85) * 0.95;
        trolley.position.set(tx, -0.06, 0);
        cable.position.set(tx, -drop / 2, 0);
        cable.scale.y = drop;
        hook.position.set(tx, -drop, 0);
        load.position.set(tx, -drop - 0.34, 0);
        beacon.material.emissiveIntensity = 0.5 + 1.7 * (0.5 + 0.5 * Math.sin(t * 6));
      }
    };
  }

  /* ============================================================
     MODEL — Al Naseeb Transport : Pakistani intercity coach
     ============================================================ */
  function buildTransport(accent, accent2) {
    var g = new THREE.Group();
    var green = 0x1f9e57, cream = 0xf4f6f1;

    var body = new THREE.Mesh(new THREE.BoxGeometry(4.6, 1.5, 1.95), std(cream, { roughness: 0.34, metalness: 0.42 }));
    body.position.y = 1.5; g.add(body);

    var roof = new THREE.Mesh(new THREE.BoxGeometry(4.72, 0.18, 2.06), std(green, { roughness: 0.4, metalness: 0.3 }));
    roof.position.y = 2.34; g.add(roof);
    var skirt = new THREE.Mesh(new THREE.BoxGeometry(4.72, 0.55, 2.02), std(green, { roughness: 0.4, metalness: 0.3 }));
    skirt.position.y = 0.82; g.add(skirt);

    var band = new THREE.Mesh(
      new THREE.BoxGeometry(4.16, 0.62, 2.0),
      std(0x0c1b2c, { roughness: 0.16, metalness: 0.62, emissive: 0x0f2c46, emissiveIntensity: 0.6 })
    );
    band.position.y = 1.72; g.add(band);
    var screen = new THREE.Mesh(
      new THREE.BoxGeometry(0.14, 0.92, 1.86),
      std(0x10314e, { roughness: 0.12, metalness: 0.7, emissive: 0x123a5a, emissiveIntensity: 0.55 })
    );
    screen.position.set(2.28, 1.62, 0); g.add(screen);

    [-0.72, 0.72].forEach(function (z) {
      var lamp = new THREE.Mesh(
        new THREE.CylinderGeometry(0.13, 0.13, 0.1, 14),
        std(0xfff3c8, { emissive: 0xffe08a, emissiveIntensity: 1.5, roughness: 0.3 })
      );
      lamp.rotation.z = Math.PI / 2;
      lamp.position.set(2.32, 0.95, z); g.add(lamp);
    });

    var studs = [];
    for (var i = 0; i < 11; i++) {
      [1.02, -1.02].forEach(function (z) {
        var s = new THREE.Mesh(
          new THREE.SphereGeometry(0.075, 10, 10),
          std(i % 2 ? accent : accent2, { emissive: i % 2 ? 0x6b4a06 : 0x001a1a, emissiveIntensity: 0.8, metalness: 0.65, roughness: 0.3 })
        );
        s.position.set(-2.1 + i * 0.42, 0.82, z);
        g.add(s);
        studs.push(s);
      });
    }

    var wheels = [];
    function wheel(x, z) {
      var wg = new THREE.Group();
      wg.position.set(x, 0.5, z);
      g.add(wg);
      var tyre = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.36, 22), std(0x111318, { roughness: 0.88, metalness: 0.1 }));
      tyre.rotation.x = Math.PI / 2; wg.add(tyre);
      var hub = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.38, 14), std(0xcfd6de, { metalness: 0.85, roughness: 0.28 }));
      hub.rotation.x = Math.PI / 2; wg.add(hub);
      for (var k = 0; k < 2; k++) {
        var spoke = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.08, 0.4), std(0x2b313b, { metalness: 0.5, roughness: 0.45 }));
        spoke.rotation.z = k * Math.PI / 2;
        wg.add(spoke);
      }
      wheels.push(wg);
    }
    wheel(1.55, 0.92); wheel(1.55, -0.92); wheel(-1.5, 0.92); wheel(-1.5, -0.92);

    var baseY = 0;
    return {
      group: g,
      view: { y: 2.35, z: 8.9, ty: 1.15 },
      update: function (t, dt) {
        for (var i = 0; i < wheels.length; i++) wheels[i].rotation.z -= dt * 7.5;
        g.position.y = baseY + Math.sin(t * 5.5) * 0.022;
        g.rotation.y = Math.sin(t * 0.32) * 0.42;
        for (var s = 0; s < studs.length; s++) {
          var blink = 0.6 + 0.9 * (0.5 + 0.5 * Math.sin(t * 3 + s * 0.5));
          studs[s].material.emissiveIntensity = blink;
        }
      }
    };
  }

  /* ============================================================
     MODEL — Werben : growth bars + rising arrow + megaphone
     ============================================================ */
  function buildMarketing(accent, accent2) {
    var g = new THREE.Group();
    var bars = [], n = 5;
    for (var i = 0; i < n; i++) {
      var h = 0.7 + i * 0.42;
      var b = new THREE.Mesh(
        new THREE.BoxGeometry(0.42, h, 0.42),
        std(accent, { roughness: 0.36, metalness: 0.45, emissive: 0x4a0a3d, emissiveIntensity: 0.42 })
      );
      b.position.set((i - (n - 1) / 2) * 0.66, h / 2, 0);
      g.add(b);
      var cap = new THREE.Mesh(
        new THREE.BoxGeometry(0.46, 0.05, 0.46),
        std(accent2, { metalness: 0.7, roughness: 0.3, emissive: 0x2a1050, emissiveIntensity: 0.75 })
      );
      cap.position.set(b.position.x, h + 0.03, 0);
      g.add(cap);
      bars.push({ m: b, cap: cap, h: h, base: b.position.x });
    }

    // rising arrow (built along +Y, then tilted to the right)
    var arrow = new THREE.Group();
    var shaftLen = 1.5;
    var shaft = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.05, shaftLen, 10),
      std(accent2, { metalness: 0.75, roughness: 0.28, emissive: 0x2a1050, emissiveIntensity: 0.85 })
    );
    shaft.position.y = shaftLen / 2; arrow.add(shaft);
    var head = new THREE.Mesh(
      new THREE.ConeGeometry(0.18, 0.38, 18),
      std(accent2, { metalness: 0.75, roughness: 0.28, emissive: 0x2a1050, emissiveIntensity: 0.85 })
    );
    head.position.y = shaftLen + 0.19; arrow.add(head);
    arrow.position.set(-0.15, 0.45, 0.5);
    arrow.rotation.z = -0.6;
    g.add(arrow);

    // megaphone, top-left, broadcasting at the bars
    var mega = new THREE.Group();
    mega.position.set(-2.35, 2.15, 0.15);
    mega.rotation.z = -0.3;
    var horn = new THREE.Mesh(
      new THREE.CylinderGeometry(0.5, 0.2, 0.7, 24, 1, true),
      std(accent2, { metalness: 0.6, roughness: 0.3, emissive: 0x2a1050, emissiveIntensity: 0.5, flat: true })
    );
    horn.rotation.z = -Math.PI / 2; horn.position.x = 0.22; mega.add(horn);
    var back = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.24, 20), std(0x2a2f3a, { roughness: 0.5, metalness: 0.45 }));
    back.rotation.z = -Math.PI / 2; back.position.x = -0.24; mega.add(back);
    var handle = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.44, 0.1), std(0x1c2029, { roughness: 0.6 }));
    handle.position.set(-0.24, -0.32, 0); mega.add(handle);
    var rings = [];
    for (var r = 0; r < 3; r++) {
      var ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.3, 0.028, 8, 44),
        new THREE.MeshBasicMaterial({ color: accent2, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false })
      );
      ring.rotation.y = Math.PI / 2;
      ring.position.set(0.62, 0, 0);
      mega.add(ring);
      rings.push(ring);
    }
    g.add(mega);

    // orbiting channel nodes
    var orbit = new THREE.Group();
    g.add(orbit);
    for (var o = 0; o < 6; o++) {
      var node = new THREE.Mesh(
        new THREE.IcosahedronGeometry(0.09, 0),
        std(o % 2 ? accent : accent2, { metalness: 0.6, roughness: 0.3, emissive: 0x2a1050, emissiveIntensity: 1.1 })
      );
      var a = (o / 6) * Math.PI * 2;
      node.position.set(Math.cos(a) * 2.15, 1.5 + Math.sin(a * 2) * 0.35, Math.sin(a) * 2.15);
      orbit.add(node);
    }

    return {
      group: g,
      view: { y: 2.25, z: 7.6, ty: 1.25 },
      update: function (t) {
        for (var i = 0; i < bars.length; i++) {
          var s = 0.72 + Math.sin(t * 2 + i * 0.8) * 0.28;
          bars[i].m.scale.y = s;
          bars[i].m.position.y = (bars[i].h * s) / 2;
          bars[i].cap.position.y = bars[i].h * s + 0.03;
        }
        arrow.position.y = 0.45 + Math.sin(t * 1.4) * 0.07;
        for (var r = 0; r < rings.length; r++) {
          var p = (t * 0.7 + r * 0.33) % 1;
          rings[r].scale.setScalar(0.55 + p * 1.9);
          rings[r].material.opacity = (1 - p) * 0.6;
        }
        orbit.rotation.y = t * 0.42;
        mega.rotation.z = -0.3 + Math.sin(t * 1.1) * 0.07;
      }
    };
  }

  var BUILDERS = {
    academy: buildAcademy,
    construction: buildConstruction,
    transport: buildTransport,
    marketing: buildMarketing
  };

  /* ============================================================
     Scenes, sizing and the shared render loop
     ============================================================ */
  var scenes = [];

  function init() {
    $$(".co-canvas").forEach(function (cv) {
      var card = cv.closest(".co-card");
      var kind = cv.getAttribute("data-model");
      var builder = BUILDERS[kind];
      if (!builder) { if (card) card.classList.add("co-card--flat"); return; }

      var accent = new THREE.Color(cv.getAttribute("data-accent") || "#f2b93c").getHex();
      var accent2 = new THREE.Color(cv.getAttribute("data-accent2") || "#35d6ff").getHex();

      var renderer;
      try {
        renderer = new THREE.WebGLRenderer({ canvas: cv, alpha: true, antialias: true, powerPreference: "low-power" });
      } catch (e) {
        if (card) card.classList.add("co-card--flat");
        return;
      }
      renderer.setClearAlpha(0);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
      renderer.outputEncoding = THREE.sRGBEncoding;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.18;

      var scene = new THREE.Scene();
      var camera = new THREE.PerspectiveCamera(34, 1.6, 0.1, 120);
      scene.add(new THREE.AmbientLight(0x9db4d6, 0.85));
      var key = new THREE.DirectionalLight(0xfff0d2, 1.7); key.position.set(5, 8, 6); scene.add(key);
      var fill = new THREE.DirectionalLight(0x6fa8ff, 0.7); fill.position.set(-6, 3, -4); scene.add(fill);
      var rim = new THREE.PointLight(accent, 24, 44, 2); rim.position.set(-3.6, 4.6, -3); scene.add(rim);
      var glow = new THREE.PointLight(accent2, 14, 32, 2); glow.position.set(3.6, 1.4, 3); scene.add(glow);

      var model = builder(accent, accent2);
      scene.add(model.group);
      if (model.view) {
        camera.position.set(0, model.view.y, model.view.z);
        camera.lookAt(0, model.view.ty, 0);
      }

      scenes.push({ canvas: cv, card: card, renderer: renderer, scene: scene, camera: camera, model: model, visible: false });
    });

    if (!scenes.length) return;

    function sizeOne(s) {
      var w = s.canvas.clientWidth || 320;
      var h = s.canvas.clientHeight || 200;
      s.renderer.setSize(w, h, false);
      s.camera.aspect = w / h;
      s.camera.updateProjectionMatrix();
    }
    scenes.forEach(sizeOne);

    if ("ResizeObserver" in window) {
      var ro = new ResizeObserver(function () { scenes.forEach(sizeOne); });
      scenes.forEach(function (s) { ro.observe(s.canvas); });
    } else {
      window.addEventListener("resize", function () { scenes.forEach(sizeOne); });
    }

    if ("IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          for (var i = 0; i < scenes.length; i++) {
            if (scenes[i].canvas === e.target) scenes[i].visible = e.isIntersecting;
          }
        });
      }, { rootMargin: "90px 0px" });
      scenes.forEach(function (s) { io.observe(s.canvas); });
    } else {
      scenes.forEach(function (s) { s.visible = true; });
    }

    if (reduced) {
      scenes.forEach(function (s) { s.model.update(0, 0); s.renderer.render(s.scene, s.camera); });
      return;
    }

    var clock = new THREE.Clock();
    var frame = 0;
    var pageVisible = true;
    document.addEventListener("visibilitychange", function () {
      pageVisible = !document.hidden;
      if (pageVisible) clock.getDelta();
    });

    (function loop() {
      requestAnimationFrame(loop);
      if ((frame++ & 1) || !pageVisible) return;   // ~30fps
      var dt = Math.min(clock.getDelta(), 0.08);
      var t = clock.elapsedTime;
      for (var i = 0; i < scenes.length; i++) {
        var s = scenes[i];
        if (!s.visible) continue;
        s.model.update(t, dt);
        s.renderer.render(s.scene, s.camera);
      }
    })();
  }

  if (document.readyState === "complete") init();
  else window.addEventListener("load", init);
})();
