/* ============================================================
   CRESTPOINT GLOBAL — interface logic
   ============================================================ */
(function () {
  "use strict";

  var CP = window.CP || {};
  // Office WhatsApp number (international format, no "+" or spaces).
  // Change this one value to redirect every enquiry from the admissions form.
  var WHATSAPP = "923422132724";
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  var esc = function (v) {
    return String(v == null ? "" : v).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  };

  function intlPhone(p) {
    return "92" + String(p || "").replace(/\D/g, "").replace(/^0/, "");
  }

  /* ---------------- icons ---------------- */
  var ICONS = {
    forex: '<path d="M4 4v16M10 7v10M16 4v13M22 9v7"/>',
    crypto: '<circle cx="12" cy="12" r="9"/><path d="M9.5 7.5h4a2.5 2.5 0 0 1 0 5h-4h4.2a2.5 2.5 0 0 1 0 5H9.5M11 5v2M11 18v2M13 5v2M13 18v2"/>',
    "ai-marketing": '<path d="M3 11v2a1 1 0 0 0 1 1h2l5 4V6L6 10H4a1 1 0 0 0-1 1Z"/><path d="M15.5 9.5a4 4 0 0 1 0 5M18.5 6.5a8 8 0 0 1 0 11"/>',
    "ai-design": '<path d="m12 19 7-7-4-4-7 7-1 5 5-1Z"/><path d="m15 8 4 4"/><path d="M4 4h2.5M5.2 2.8v2.5"/>',
    web: '<path d="m8 8-5 4 5 4M16 8l5 4-5 4M14 4l-4 16"/>',
    digital: '<path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/>',
    graphic: '<path d="M12 3a9 9 0 1 0 0 18h1.5a2 2 0 0 0 0-4H12a2 2 0 0 1 0-4h5a4 4 0 0 0 4-4 6 6 0 0 0-9-6Z"/><circle cx="8.5" cy="9" r=".9"/><circle cx="12" cy="7" r=".9"/><circle cx="7.5" cy="13.5" r=".9"/>'
  };

  /* ============================================================
     RENDER — programs
     ============================================================ */
  var grid = $("#programGrid");
  if (grid && CP.programs) {
    grid.innerHTML = CP.programs.map(function (p, i) {
      return (
        '<article class="pcard" data-reveal style="--d:' + (i * 0.05).toFixed(2) + 's">' +
          '<div class="pcard__top">' +
            '<span class="pcard__ico"><svg viewBox="0 0 24 24" aria-hidden="true">' + (ICONS[p.icon] || ICONS.web) + "</svg></span>" +
            '<span class="pcard__meta">' + esc(p.meta) + "</span>" +
          "</div>" +
          "<h3>" + esc(p.name) + "</h3>" +
          '<p class="pcard__tag">' + esc(p.tag) + "</p>" +
          "<p>" + esc(p.desc) + "</p>" +
          '<ul class="pcard__tags">' + p.tags.map(function (t) { return "<li>" + esc(t) + "</li>"; }).join("") + "</ul>" +
        "</article>"
      );
    }).join("");

    // populating the form select as well
    var sel = $("#fProgram");
    if (sel) {
      CP.programs.forEach(function (p) {
        var o = document.createElement("option");
        o.value = p.name;
        o.textContent = p.name;
        sel.appendChild(o);
      });
      var other = document.createElement("option");
      other.value = "Not sure yet";
      other.textContent = "Not sure yet — help me choose";
      sel.appendChild(other);
    }
  }

  /* ============================================================
     RENDER — team
     ============================================================ */
  var teamGrid = $("#teamGrid");
  if (teamGrid && CP.team) {
    teamGrid.innerHTML = CP.team.map(function (m, i) {
      return (
        '<article class="mentor" data-reveal style="--d:' + (i * 0.07).toFixed(2) + 's">' +
          '<div class="mentor__photo">' +
            '<span class="mentor__badge">Mentor</span>' +
            '<img src="' + esc(m.photo) + '" alt="Portrait of ' + esc(m.name) + ', ' + esc(m.role) + '" loading="lazy" width="320" height="360">' +
          "</div>" +
          '<div class="mentor__body">' +
            '<h3 class="mentor__name">' + esc(m.name) + "</h3>" +
            '<p class="mentor__role">' + esc(m.role) + "</p>" +
            '<p class="mentor__line">' + esc(m.line) + "</p>" +
            '<ul class="mentor__skills">' + m.cardSkills.map(function (s) { return "<li>" + esc(s) + "</li>"; }).join("") + "</ul>" +
            '<button class="mentor__btn" data-cv="' + esc(m.slug) + '">' +
              "View full CV" +
              '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>' +
            "</button>" +
          "</div>" +
        "</article>"
      );
    }).join("");
  }

  /* ============================================================
     RENDER — founder / CEO (sits above the team, with a string
     dropped down to the mentor grid — drawn further below)
     ============================================================ */
  var ceoSlot = $("#ceoSlot");
  if (ceoSlot && CP.ceo) {
    var ceo = CP.ceo;
    ceoSlot.innerHTML =
      '<article class="ceo" data-reveal>' +
        '<div class="ceo__glow" aria-hidden="true"></div>' +
        '<div class="ceo__photo">' +
          '<img src="' + esc(ceo.photo) + '" alt="Portrait of ' + esc(ceo.name) + ', ' + esc(ceo.role) + '" width="548" height="685">' +
          '<span class="ceo__badge">Founder &amp; CEO</span>' +
        "</div>" +
        '<div class="ceo__body">' +
          '<p class="ceo__eyebrow"><span></span>Leadership — the institute</p>' +
          '<h3 class="ceo__name">' + esc(ceo.name) + "</h3>" +
          '<p class="ceo__role">' + esc(ceo.role) + " · <span>" + esc(ceo.org) + "</span></p>" +
          '<p class="ceo__lead">' + esc(ceo.lead) + "</p>" +
          '<p class="ceo__summary">' + esc(ceo.summary) + "</p>" +
          '<ul class="ceo__creds">' + ceo.credentials.map(function (c) {
            return "<li><b>" + esc(c.k) + "</b><span>" + esc(c.v) + "</span></li>";
          }).join("") + "</ul>" +
          '<ul class="ceo__group">' + ceo.group.map(function (n) {
            return "<li>" + esc(n) + "</li>";
          }).join("") + "</ul>" +
          '<div class="ceo__actions">' +
            '<a class="btn btn--gold btn--sm" href="#group">Meet the group' +
              '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg></a>' +
            '<button class="btn btn--ghost btn--sm" data-cv="' + esc(ceo.slug) + '">View full profile</button>' +
          "</div>" +
        "</div>" +
      "</article>";
  }

  /* ============================================================
     REVEAL ON SCROLL
     ============================================================ */
  var revealItems = $$("[data-reveal]");
  if ("IntersectionObserver" in window && !reduced) {
    var revealIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add("is-in");
          revealIO.unobserve(e.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
    revealItems.forEach(function (el) { revealIO.observe(el); });
  } else {
    revealItems.forEach(function (el) { el.classList.add("is-in"); });
  }

  /* ============================================================
     ORG CONNECTOR — one string from the founder down to the
     mentors: a spine, a bus per card row, and a drop per card.
     Redrawn while the section is on screen so it tracks the
     reveal transitions.
     ============================================================ */
  var orgWrap = $("#orgWrap");
  var orgLines = $("#orgLines");
  if (orgWrap && orgLines && $$(".mentor", orgWrap).length) {
    var SVGNS = "http://www.w3.org/2000/svg";
    var orgRaf = 0;
    var orgLastT = 0;
    var orgSig = "";

    function svgEl(tag, attrs) {
      var n = document.createElementNS(SVGNS, tag);
      for (var k in attrs) if (attrs.hasOwnProperty(k)) n.setAttribute(k, attrs[k]);
      return n;
    }

    function drawOrg() {
      var ceoEl = $(".ceo", orgWrap);
      var mentors = $$(".mentor", orgWrap);
      if (!ceoEl || !mentors.length) return;

      var wRect = orgWrap.getBoundingClientRect();
      var W = Math.round(wRect.width);
      var H = Math.round(wRect.height);
      if (W < 2 || H < 2) return;

      var cRect = ceoEl.getBoundingClientRect();
      var cx = Math.round(cRect.left - wRect.left + cRect.width / 2);
      var cy = Math.round(cRect.bottom - wRect.top);

      var rows = [];
      mentors.forEach(function (m) {
        var r = m.getBoundingClientRect();
        var top = Math.round(r.top - wRect.top);
        var mid = Math.round(r.left - wRect.left + r.width / 2);
        var row = null;
        for (var i = 0; i < rows.length; i++) {
          if (Math.abs(rows[i].top - top) < 26) { row = rows[i]; break; }
        }
        if (!row) { row = { top: top, items: [] }; rows.push(row); }
        row.items.push(mid);
      });
      if (!rows.length) return;
      rows.sort(function (a, b) { return a.top - b.top; });
      rows.forEach(function (row) { row.items.sort(function (a, b) { return a - b; }); });

      var sig = cx + "," + cy + "|" + rows.map(function (r) {
        return r.top + ":" + r.items.join(".");
      }).join(";");
      if (sig === orgSig) return;
      orgSig = sig;

      var spine = "M" + cx + " " + cy;
      var bus = "";
      var drops = "";
      var nodes = [];

      rows.forEach(function (row, ri) {
        var busY = row.top - (ri === 0 ? 40 : 34);
        var leftX = Math.min(row.items[0], cx);
        var rightX = Math.max(row.items[row.items.length - 1], cx);

        spine += " L" + cx + " " + busY;
        bus += (bus ? " " : "") + "M" + leftX + " " + busY + " L" + rightX + " " + busY;
        row.items.forEach(function (x) {
          drops += "M" + x + " " + busY + " L" + x + " " + row.top;
          nodes.push([x, row.top]);
        });
      });

      orgLines.setAttribute("viewBox", "0 0 " + W + " " + H);
      while (orgLines.firstChild) orgLines.removeChild(orgLines.firstChild);

      ["org__glow", "org__draw"].forEach(function (cls) {
        var g = svgEl("g", { "class": cls, "fill": "none" });
        g.appendChild(svgEl("path", { "class": "org__spine", d: spine }));
        g.appendChild(svgEl("path", { "class": "org__bus", d: bus }));
        g.appendChild(svgEl("path", { "class": "org__drops", d: drops }));
        orgLines.appendChild(g);
      });

      var nodeG = svgEl("g", { "class": "org__nodes" });
      nodeG.appendChild(svgEl("circle", { cx: cx, cy: cy, r: 4 }));
      nodes.forEach(function (p) {
        nodeG.appendChild(svgEl("circle", { cx: p[0], cy: p[1], r: 3 }));
      });
      orgLines.appendChild(nodeG);
    }

    function orgLoop() {
      orgRaf = requestAnimationFrame(orgLoop);
      var now = Date.now();
      if (now - orgLastT < 40) return;   // ~25fps is plenty for layout tracking
      orgLastT = now;
      drawOrg();
    }

    if ("IntersectionObserver" in window) {
      var orgIO = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting && !orgRaf) orgLoop();
          else if (!e.isIntersecting && orgRaf) { cancelAnimationFrame(orgRaf); orgRaf = 0; }
        });
      }, { rootMargin: "0px 0px -8% 0px" });
      orgIO.observe(orgWrap);
    } else {
      drawOrg();
    }

    window.addEventListener("resize", function () { orgSig = ""; drawOrg(); });
    window.addEventListener("load", drawOrg);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(drawOrg);
  }

  /* ============================================================
     HEADER — stuck state, active link, mobile menu
     ============================================================ */
  var head = $("#siteHead");
  var nav = $("#nav");
  var burger = $("#burger");

  function onScrollChrome() {
    var y = window.scrollY;
    if (head) head.classList.toggle("is-stuck", y > 24);

    var bar = $("#scrollBar");
    if (bar) {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      bar.style.width = (max > 0 ? (y / max) * 100 : 0) + "%";
    }
    var top = $("#toTop");
    if (top) top.classList.toggle("is-on", y > 640);

    var hint = $("#worldHint");
    if (hint && y > 120) hint.classList.remove("is-on");
  }
  window.addEventListener("scroll", onScrollChrome, { passive: true });
  onScrollChrome();

  if (burger && nav) {
    burger.addEventListener("click", function () {
      var open = burger.getAttribute("aria-expanded") === "true";
      burger.setAttribute("aria-expanded", String(!open));
      burger.setAttribute("aria-label", open ? "Open menu" : "Close menu");
      nav.classList.toggle("is-open", !open);
    });
    nav.addEventListener("click", function (e) {
      if (e.target.closest("a")) {
        burger.setAttribute("aria-expanded", "false");
        burger.setAttribute("aria-label", "Open menu");
        nav.classList.remove("is-open");
      }
    });
  }

  var sections = ["programs", "trading", "mentors", "group", "why", "contact"];
  if ("IntersectionObserver" in window) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        $$(".nav a").forEach(function (a) {
          a.classList.toggle("is-active", a.getAttribute("href") === "#" + e.target.id);
        });
      });
    }, { rootMargin: "-42% 0px -52% 0px", threshold: 0 });
    sections.forEach(function (id) {
      var s = document.getElementById(id);
      if (s) spy.observe(s);
    });
  }

  /* ============================================================
     CARD SPOTLIGHT + TILT
     ============================================================ */
  $$(".pcard").forEach(function (card) {
    card.addEventListener("pointermove", function (e) {
      var r = card.getBoundingClientRect();
      card.style.setProperty("--mx", ((e.clientX - r.left) / r.width) * 100 + "%");
      card.style.setProperty("--my", ((e.clientY - r.top) / r.height) * 100 + "%");
    });
  });

  var finePointer = window.matchMedia("(hover:hover) and (pointer:fine)").matches;
  if (finePointer && !reduced) {
    $$("[data-tilt]").forEach(function (card) {
      card.addEventListener("pointermove", function (e) {
        var r = card.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width - 0.5;
        var py = (e.clientY - r.top) / r.height - 0.5;
        card.style.transform =
          "perspective(900px) rotateY(" + (px * 5).toFixed(2) + "deg) rotateX(" + (-py * 5).toFixed(2) + "deg) translateY(-4px)";
      });
      card.addEventListener("pointerleave", function () {
        card.style.transform = "";
      });
    });
  }

  /* ============================================================
     CUSTOM CURSOR
     ============================================================ */
  if (finePointer && !reduced) {
    var ring = document.createElement("div");
    ring.className = "cursor";
    var dot = document.createElement("div");
    dot.className = "cursor-dot";
    document.body.appendChild(ring);
    document.body.appendChild(dot);

    var cx = window.innerWidth / 2, cy = window.innerHeight / 2;
    var rx = cx, ry = cy;

    window.addEventListener("pointermove", function (e) {
      cx = e.clientX; cy = e.clientY;
      dot.style.transform = "translate(" + cx + "px," + cy + "px)";
      var hot = e.target.closest("a,button,[data-tilt],input,select,textarea");
      ring.classList.toggle("is-hover", !!hot);
    }, { passive: true });

    (function follow() {
      rx += (cx - rx) * 0.16;
      ry += (cy - ry) * 0.16;
      ring.style.transform = "translate(" + rx + "px," + ry + "px)";
      requestAnimationFrame(follow);
    })();
  }

  /* ============================================================
     CV MODAL
     ============================================================ */
  var modal = $("#cvModal");
  var modalBody = $("#cvBody");
  var lastFocus = null;

  function cvTemplate(m) {
    var tel = intlPhone(m.phone);
    function expBlock(x) {
      return (
        '<div class="cv-exp">' +
          "<h4>" + esc(x.role) + "</h4>" +
          (x.org || x.year
            ? '<p class="org">' + esc(x.org || "") + (x.org && x.year ? " · " : "") + esc(x.year || "") + "</p>"
            : "") +
          (x.points ? "<ul>" + x.points.map(function (p) { return "<li>" + esc(p) + "</li>"; }).join("") + "</ul>" : "") +
        "</div>"
      );
    }
    function listBlock(title, arr, cls) {
      if (!arr || !arr.length) return "";
      return '<div class="cv-block"><h3>' + esc(title) + '</h3><ul class="' + (cls || "cv-list") + '">' +
        arr.map(function (e) { return "<li>" + esc(e) + "</li>"; }).join("") + "</ul></div>";
    }

    var isGroup = !!(m.group && m.group.length);

    var left = "";
    left += '<div class="cv-block"><h3>Professional summary</h3><p>' + esc(m.summary) + "</p></div>";
    if (m.experience && m.experience.length) {
      left += '<div class="cv-block"><h3>Experience</h3>' + m.experience.map(expBlock).join("") + "</div>";
    }
    if (m.internships && m.internships.length) {
      left += '<div class="cv-block"><h3>Internships</h3>' + m.internships.map(expBlock).join("") + "</div>";
    }
    if (m.credentials && m.credentials.length) {
      left += '<div class="cv-block"><h3>FBR credentials</h3><ul class="cv-creds">' +
        m.credentials.map(function (c) {
          return "<li><b>" + esc(c.k) + "</b><span>" + esc(c.v) + "</span></li>";
        }).join("") + "</ul></div>";
    }
    if (m.projects && m.projects.length) {
      left += '<div class="cv-block"><h3>' + (isGroup ? "Group companies" : "Selected work") + '</h3><div class="cv-projects">' +
        m.projects.map(function (p) {
          return "<div><h4>" + esc(p.name) + "</h4>" + (p.desc ? "<p>" + esc(p.desc) + "</p>" : "") + "</div>";
        }).join("") + "</div></div>";
    }
    if (m.achievements && m.achievements.length) {
      left += '<div class="cv-block"><h3>Achievements</h3><ul class="cv-list">' +
        m.achievements.map(function (a) { return "<li>" + esc(a) + "</li>"; }).join("") + "</ul></div>";
    }

    var right = "";
    if (m.skills && m.skills.length) {
      right += '<div class="cv-block"><h3>Skills</h3><ul class="cv-tags">' +
        m.skills.map(function (s) { return "<li>" + esc(s) + "</li>"; }).join("") + "</ul></div>";
    }
    if (m.education && m.education.length) {
      right += '<div class="cv-block"><h3>Education</h3><ul class="cv-list">' +
        m.education.map(function (e) { return "<li>" + esc(e) + "</li>"; }).join("") + "</ul></div>";
    }
    right += listBlock("Languages", m.languages);
    right += listBlock("Key highlights", m.highlights);

    var contact = [];
    if (m.email) contact.push(esc(m.email));
    if (m.phone) contact.push(esc(m.phone));
    if (m.address || m.location) contact.push(esc(m.address || m.location));
    if (contact.length) {
      right += '<div class="cv-block"><h3>Contact</h3><ul class="cv-list">' +
        contact.map(function (c) { return "<li>" + c + "</li>"; }).join("") + "</ul></div>";
    }

    var meta =
      '<span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 10c0 6-9 12-9 12s-9-6-9-12a9 9 0 0 1 18 0Z"/><circle cx="12" cy="10" r="3"/></svg>' + esc(m.location) + "</span>";
    if (m.email) {
      meta += '<span><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2" y="4" width="20" height="16" rx="3"/><path d="m3 6 9 7 9-7"/></svg>' + esc(m.email) + "</span>";
    }

    var actions = "";
    if (m.email) actions += '<a class="btn btn--gold" href="mailto:' + esc(m.email) + '">Email</a>';
    if (m.phone) actions += '<a class="btn btn--ghost" href="https://wa.me/' + tel + '" target="_blank" rel="noopener">WhatsApp</a>';
    actions += '<button class="btn btn--ghost" id="cvPrint">Print / Save PDF</button>';

    return (
      '<header class="cv-head">' +
        '<img src="' + esc(m.photo) + '" alt="Portrait of ' + esc(m.name) + '">' +
        "<div>" +
          '<p class="cv-head__role">' + esc(m.role) + "</p>" +
          '<h2 id="cvName">' + esc(m.name) + "</h2>" +
          '<div class="cv-head__meta">' + meta + "</div>" +
          '<div class="cv-actions">' + actions + "</div>" +
        "</div>" +
      "</header>" +
      '<div class="cv-grid"><div class="cv-col">' + left + '</div><div class="cv-col">' + right + "</div></div>"
    );
  }

  function openCV(slug) {
    var m = (CP.team || []).filter(function (x) { return x.slug === slug; })[0];
    if (!m && CP.ceo && CP.ceo.slug === slug) m = CP.ceo;
    if (!m || !modal) return;
    lastFocus = document.activeElement;
    modalBody.innerHTML = cvTemplate(m);
    modal.hidden = false;
    document.body.classList.add("is-locked");
    document.body.style.paddingRight = window.innerWidth - document.documentElement.clientWidth + "px";
    modalBody.scrollTop = 0;
    modal.querySelector(".modal__close").focus();
    var pr = $("#cvPrint");
    if (pr) pr.addEventListener("click", function () { window.print(); });
  }

  function closeCV() {
    if (!modal || modal.hidden) return;
    modal.hidden = true;
    document.body.classList.remove("is-locked");
    document.body.style.paddingRight = "";
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  document.addEventListener("click", function (e) {
    var trigger = e.target.closest("[data-cv]");
    if (trigger) { openCV(trigger.getAttribute("data-cv")); return; }
    if (e.target.closest("[data-close]")) closeCV();
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      closeCV();
      if (nav && nav.classList.contains("is-open") && burger) {
        nav.classList.remove("is-open");
        burger.setAttribute("aria-expanded", "false");
      }
    }
    if (e.key === "Tab" && modal && !modal.hidden) {
      var f = $$('a[href],button:not([disabled]),input,select,textarea,[tabindex]:not([tabindex="-1"])', modal);
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  /* ============================================================
     FORM → WhatsApp
     ============================================================ */
  var form = $("#enrollForm");
  function setError(id, msg) {
    var input = document.getElementById(id);
    var slot = document.querySelector('[data-err="' + id + '"]');
    if (!input || !slot) return;
    var field = input.closest(".field");
    if (field) field.classList.toggle("has-error", !!msg);
    input.setAttribute("aria-invalid", msg ? "true" : "false");
    slot.textContent = msg || "";
  }

  function validate() {
    var ok = true;
    var name = $("#fName");
    var phone = $("#fPhone");
    var program = $("#fProgram");

    if (!name.value.trim() || name.value.trim().length < 2) {
      setError("fName", "Please enter your name."); ok = false;
    } else setError("fName", "");

    var digits = phone.value.replace(/\D/g, "");
    if (digits.length < 10) {
      setError("fPhone", "Enter a valid phone number."); ok = false;
    } else setError("fPhone", "");

    if (!program.value) {
      setError("fProgram", "Choose a program."); ok = false;
    } else setError("fProgram", "");

    return ok;
  }

  if (form) {
    ["fName", "fPhone", "fProgram"].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.addEventListener("input", function () { setError(id, ""); });
    });

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!validate()) {
        var bad = form.querySelector(".has-error input, .has-error select");
        if (bad) bad.focus();
        return;
      }
      var name = $("#fName").value.trim();
      var phone = $("#fPhone").value.trim();
      var program = $("#fProgram").value;
      var msg = $("#fMsg").value.trim();

      var text =
        "Assalam-o-Alaikum Crestpoint Global!\n\n" +
        "I'd like to enroll.\n" +
        "Name: " + name + "\n" +
        "Phone: " + phone + "\n" +
        "Program: " + program +
        (msg ? "\nNote: " + msg : "");

      window.open("https://wa.me/" + WHATSAPP + "?text=" + encodeURIComponent(text), "_blank", "noopener");
      toast("Opening WhatsApp — your details are ready to send.");
      form.reset();
      setError("fName", ""); setError("fPhone", ""); setError("fProgram", "");
    });
  }

  /* ============================================================
     TOAST
     ============================================================ */
  var toastEl = $("#toast");
  var toastTimer;
  function toast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add("is-on");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove("is-on"); }, 4200);
  }

  /* ============================================================
     BACK TO TOP
     ============================================================ */
  var toTop = $("#toTop");
  if (toTop) {
    toTop.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
    });
  }

  /* ============================================================
     LOADER
     ============================================================ */
  var loader = $("#loader");
  function finishLoad() {
    if (!loader) return;
    loader.classList.add("is-done");
    setTimeout(function () {
      loader.setAttribute("aria-hidden", "true");
      var hint = $("#worldHint");
      if (hint) hint.classList.add("is-on");
    }, 700);
  }
  var loaded = false;
  function once() { if (!loaded) { loaded = true; finishLoad(); } }
  window.addEventListener("load", function () { setTimeout(once, 450); });
  setTimeout(once, 3200);

  /* ============================================================
     MISC
     ============================================================ */
  var year = $("#year");
  if (year) year.textContent = new Date().getFullYear();

  // anchor scrolling that respects the fixed header
  document.addEventListener("click", function (e) {
    var a = e.target.closest('a[href^="#"]');
    if (!a) return;
    var id = a.getAttribute("href");
    if (id === "#" || id.length < 2) return;
    var target = document.querySelector(id);
    if (!target) return;
    e.preventDefault();
    var top = target.getBoundingClientRect().top + window.scrollY - 74;
    window.scrollTo({ top: top, behavior: reduced ? "auto" : "smooth" });
    history.replaceState(null, "", id);
  });
})();