/* ============================================================
   MYTHOS — UI layer
   Boot sequence, content rendering from window.MYTHOS,
   navigation, scroll reveal, marquee and progress bar.
   ============================================================ */
(function () {
  "use strict";

  var D = window.MYTHOS || {};
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var $ = function (id) { return document.getElementById(id); };

  /* ---------- safe link helpers ---------- */
  function wa(number, message) {
    return "https://wa.me/" + number + "?text=" + encodeURIComponent(message);
  }
  function contact() { return D.contact || {}; }

  /* ---------- boot sequence ---------- */
  (function boot() {
    var screen = $("boot");
    var log = $("bootLog");
    if (!screen || !log) return;

    var lines = [
      "> myt: cold boot",
      "> loading scene kernel ............ ok",
      "> mounting interface .............. ok",
      "> handshake: crestpoint ............ linked",
      "> ready."
    ];

    var done = false;
    function finish() {
      if (done) return;
      done = true;
      screen.classList.add("is-done");
    }

    /* Hard ceiling: no matter how slow the device, never trap the visitor. */
    setTimeout(finish, 1800);

    if (reduced) { log.textContent = lines.join("\n"); finish(); return; }

    var flat = lines.join("\n");
    var shown = 0;
    (function type() {
      if (shown >= flat.length) { setTimeout(finish, 240); return; }
      shown = Math.min(flat.length, shown + 3);
      log.textContent = flat.slice(0, shown);
      setTimeout(type, 16);
    })();
  })();

  /* ---------- render: stats ---------- */
  var statsEl = $("stats");
  if (statsEl && D.stats) {
    statsEl.innerHTML = D.stats.map(function (s) {
      return '<div><dt>' + esc(s.value) + '</dt><dd>' + esc(s.label) + '</dd></div>';
    }).join("");
  }

  /* ---------- render: marquee ---------- */
  var mq = $("marquee");
  if (mq && D.marquee) {
    var run = D.marquee.map(function (m) { return "<span>" + esc(m) + "</span>"; }).join("");
    mq.innerHTML = run + run; /* duplicated for the seamless -50% slide */
  }

  /* ---------- render: services ---------- */
  var svc = $("servicesGrid");
  if (svc && D.services) {
    svc.innerHTML = D.services.map(function (s) {
      var tags = (s.tags || []).map(function (t) { return "<li>" + esc(t) + "</li>"; }).join("");
      return '' +
        '<article class="card" data-reveal>' +
          '<span class="card__num">[' + esc(s.num) + ']</span>' +
          '<h3>' + esc(s.title) + '</h3>' +
          '<p>' + esc(s.desc) + '</p>' +
          (tags ? '<ul class="card__tags">' + tags + '</ul>' : '') +
        '</article>';
    }).join("");
  }

  /* ---------- render: work ---------- */
  var work = $("workGrid");
  if (work && D.work) {
    work.innerHTML = D.work.map(function (w) {
      var topics = (w.topics || []).join(" · ");
      return '' +
        '<a class="card wcard" data-reveal href="' + esc(w.url) + '" target="_blank" rel="noopener">' +
          '<span class="wcard__top"><h3>' + esc(w.name) + '</h3><span class="wcard__lang">' + esc(w.lang) + '</span></span>' +
          '<p>' + esc(w.desc) + '</p>' +
          (topics ? '<ul class="card__tags">' + '<li>' + esc(topics) + '</li>' + '</ul>' : '') +
          '<span class="wcard__go">View repository <span aria-hidden="true">↗</span></span>' +
        '</a>';
    }).join("");
  }

  var gh = $("ghLink");
  if (gh && D.brand) gh.href = D.brand.github;

  /* ---------- render: case study ---------- */
  var caseCard = $("caseCard");
  if (caseCard && D.caseStudy) {
    var cs = D.caseStudy;
    caseCard.innerHTML = '' +
      '<div>' +
        '<p class="case__kicker">' + esc(cs.kicker) + '</p>' +
        '<h2>' + esc(cs.name) + '</h2>' +
        '<p>' + esc(cs.desc) + '</p>' +
        '<div class="case__stats">' +
          (cs.stats || []).map(function (s) {
            return '<div><b>' + esc(s.k) + '</b><span>' + esc(s.v) + '</span></div>';
          }).join("") +
        '</div>' +
        '<a class="btn btn--neon" href="' + esc(cs.url) + '" target="_blank" rel="noopener">Open the live site <span aria-hidden="true">→</span></a>' +
      '</div>' +
      '<div class="case__art" aria-hidden="true"></div>';
  }

  /* ---------- render: process ---------- */
  var proc = $("processGrid");
  if (proc && D.process) {
    proc.innerHTML = D.process.map(function (p) {
      return '' +
        '<article class="pstep" data-reveal>' +
          '<span class="pstep__num">' + esc(p.num) + '</span>' +
          '<h3>' + esc(p.title) + '</h3>' +
          '<p>' + esc(p.desc) + '</p>' +
        '</article>';
    }).join("");
  }

  /* ---------- render: internship / the lab ---------- */
  var labSub = $("labSub");
  if (labSub && D.internship) labSub.textContent = D.internship.sub;

  var labTracks = $("labTracks");
  if (labTracks && D.internship) {
    labTracks.innerHTML = D.internship.tracks.map(function (t) {
      return '<article class="ltrack"><h4>' + esc(t.name) + '</h4><p>' + esc(t.desc) + '</p></article>';
    }).join("");
  }

  var labPerks = $("labPerks");
  if (labPerks && D.internship) {
    labPerks.innerHTML = D.internship.perks.map(function (p) {
      return "<li>" + esc(p) + "</li>";
    }).join("");
  }

  /* ---------- wire the CTAs ---------- */
  var phone = (D.brand && D.brand.phone) || "923237649278";
  var clientMsg = contact().clientMsg || "Hi Mythos! I have a project.";
  var internMsg = contact().internMsg || "Hi Mythos! I'd like to apply for the internship.";

  setHref("labCta", wa(phone, internMsg));
  setHref("hireCard", wa(phone, clientMsg));
  setHref("joinCard", wa(phone, internMsg));
  setHref("footWa", wa(phone, "Hi Mythos!"));
  if (D.brand) setHref("footGh", D.brand.github);
  if (D.brand && D.brand.sister) setHref("footSister", D.brand.sister.url);
  if (D.brand && D.brand.sister) setHref("crestNode", D.brand.sister.url);

  function setHref(id, href) {
    var el = $(id);
    if (el && href) el.href = href;
  }

  /* ---------- footer meta ---------- */
  if ($("year")) $("year").textContent = new Date().getFullYear();
  if ($("footLoc") && D.brand) $("footLoc").textContent = D.brand.location;
  if ($("footTag") && D.brand) $("footTag").textContent = D.brand.tagline;

  /* ---------- nav ---------- */
  var burger = $("burger");
  var nav = $("nav");
  if (burger && nav) {
    burger.addEventListener("click", function () {
      var open = nav.classList.toggle("is-open");
      burger.setAttribute("aria-expanded", open ? "true" : "false");
      burger.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    });
    nav.addEventListener("click", function (e) {
      if (e.target.tagName === "A") {
        nav.classList.remove("is-open");
        burger.setAttribute("aria-expanded", "false");
      }
    });
  }

  /* ---------- header stuck + progress ---------- */
  var head = $("head");
  var progress = $("progress");
  var ticking = false;

  function onScroll() {
    var y = window.scrollY || document.documentElement.scrollTop;
    if (head) head.classList.toggle("is-stuck", y > 24);
    if (progress) {
      var max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      progress.style.transform = "scaleX(" + Math.min(1, y / max) + ")";
    }
    ticking = false;
  }
  window.addEventListener("scroll", function () {
    if (!ticking) { ticking = true; requestAnimationFrame(onScroll); }
  }, { passive: true });
  onScroll();

  /* ---------- scroll reveal ---------- */
  /* Deterministic pass: reveals anything already scrolled into (or past) the
     viewport. Robust against anchor jumps and fast scrolling, and it can never
     leave an element invisible. */
  var revealables = Array.prototype.slice.call(document.querySelectorAll("[data-reveal]"));

  function revealPass() {
    if (!revealables.length) return;
    var limit = window.innerHeight * 0.92;
    for (var i = revealables.length - 1; i >= 0; i--) {
      var el = revealables[i];
      var top = el.getBoundingClientRect().top;
      if (top < limit) {
        el.classList.add("is-in");
        revealables.splice(i, 1);
      }
    }
  }

  if (reduced) {
    revealables.forEach(function (el) { el.classList.add("is-in"); });
    revealables = [];
  } else {
    var revealTick = false;
    window.addEventListener("scroll", function () {
      if (revealTick) return;
      revealTick = true;
      requestAnimationFrame(function () { revealPass(); revealTick = false; });
    }, { passive: true });
    window.addEventListener("resize", revealPass, { passive: true });
    revealPass();
  }

  /* ---------- escape helpers ---------- */
  function esc(str) {
    return String(str == null ? "" : str)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
})();
