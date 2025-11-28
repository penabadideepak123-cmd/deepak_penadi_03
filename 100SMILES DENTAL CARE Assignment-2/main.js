// main.js — unified site script for 100SMILES (FULL file)
// Features: footer year, header/nav, scroll reveal, smooth anchors,
// services auto-scroll, marquee technologies carousel, staff carousel,
// announcements, about parallax, annual interactions, premium UX (tilt only for services).

(function () {
  // ---------- Utilities ----------
  const supportsIntersection = "IntersectionObserver" in window;
  const prefersReducedMotion =
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ---------- Scroll reveal ----------
  function setupScrollReveal() {
    if (!supportsIntersection) return;
    const observer = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("reveal-visible");
            obs.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 }
    );

    document.querySelectorAll(".reveal").forEach((el) => observer.observe(el));
  }

  // ---------- Services auto-scroll ----------
  function setupServicesAutoScroll() {
    const track = document.querySelector(".services-track");
    if (!track) return;
    if (prefersReducedMotion) return;

    const cards = Array.from(track.querySelectorAll(".service-card"));
    let rafId = null;
    let paused = false;
    let autoSpeed = 0.25;

    function contentOverflows() {
      return track.scrollWidth > track.clientWidth + 2;
    }

    function step() {
      if (!track || paused) return;
      if (!contentOverflows()) {
        cancelAnimationFrame(rafId);
        rafId = null;
        return;
      }
      track.scrollLeft += autoSpeed;
      if (track.scrollLeft >= track.scrollWidth - track.clientWidth - 1) {
        track.scrollTo({ left: 0, behavior: "smooth" });
        setTimeout(() => {
          if (!paused) rafId = requestAnimationFrame(step);
        }, 700);
        return;
      }
      rafId = requestAnimationFrame(step);
    }

    let observer = null;
    if (supportsIntersection) {
      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((e) => {
            if (e.isIntersecting && !paused && contentOverflows()) {
              if (!rafId) rafId = requestAnimationFrame(step);
            } else {
              if (rafId) {
                cancelAnimationFrame(rafId);
                rafId = null;
              }
            }
          });
        },
        { threshold: 0.45 }
      );
      observer.observe(track);
    } else {
      if (contentOverflows()) rafId = requestAnimationFrame(step);
    }

    const pause = () => {
      paused = true;
      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
    };
    const resume = () => {
      if (prefersReducedMotion) return;
      paused = false;
      if (!rafId && contentOverflows()) rafId = requestAnimationFrame(step);
    };

    track.addEventListener("mouseenter", pause);
    track.addEventListener("mouseleave", resume);
    track.addEventListener("touchstart", pause, { passive: true });
    track.addEventListener("touchend", resume, { passive: true });
    track.addEventListener("focusin", pause);
    track.addEventListener("focusout", resume);

    const prevBtn = document.querySelector(".services-prev");
    const nextBtn = document.querySelector(".services-next");

    let currentIndex = 0;

    function findNearestIndex() {
      let best = 0;
      let bestDist = Infinity;
      const trackRect = track.getBoundingClientRect();
      cards.forEach((card, i) => {
        const r = card.getBoundingClientRect();
        const dist = Math.abs(r.left - trackRect.left);
        if (dist < bestDist) {
          bestDist = dist;
          best = i;
        }
      });
      return best;
    }

    currentIndex = findNearestIndex();

    function showIndex(i) {
      if (!cards[i]) return;
      currentIndex = i;
      cards[i].scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });
      pause();
      setTimeout(resume, 900);
    }

    if (prevBtn) {
      prevBtn.addEventListener("click", () => {
        currentIndex = Math.max(0, currentIndex - 1);
        showIndex(currentIndex);
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener("click", () => {
        currentIndex = Math.min(cards.length - 1, currentIndex + 1);
        showIndex(currentIndex);
      });
    }

    let scrollTimeout = null;
    track.addEventListener(
      "scroll",
      () => {
        if (scrollTimeout) clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
          currentIndex = findNearestIndex();
        }, 150);
      },
      { passive: true }
    );

    window.addEventListener(
      "pagehide",
      () => {
        if (rafId) cancelAnimationFrame(rafId);
        if (observer) observer.disconnect();
      },
      { passive: true }
    );
  }

  // ---------- Technologies carousel (robust: clones until overflow, seamless loop) ----------
  function setupTechnologiesCarousel() {
    try {
      const track = document.querySelector(".tech-track");
      if (!track) { console.warn('Tech carousel: .tech-track not found'); return; }
      const wrapper = track.closest('.tech-carousel-wrapper') || track.parentElement;
      const prevBtn = document.querySelector(".tech-prev");
      const nextBtn = document.querySelector(".tech-next");

      const prefersReduced = (typeof prefersReducedMotion !== 'undefined') ? prefersReducedMotion :
        (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

      // initial node list (live)
      let cards = Array.from(track.querySelectorAll('.tech-card'));
      if (!cards.length) { console.warn('Tech carousel: no .tech-card items found'); return; }

      // ensure there is overflow: clone minimal times until scrollWidth > clientWidth
      const ensureOverflow = () => {
        // protect from infinite loops
        const maxClones = 4;
        let clones = 0;
        while (track.scrollWidth <= track.clientWidth && clones < maxClones) {
          const frag = document.createDocumentFragment();
          cards.forEach(n => frag.appendChild(n.cloneNode(true)));
          track.appendChild(frag);
          clones++;
          cards = Array.from(track.querySelectorAll('.tech-card'));
        }
        return clones;
      };

      const cloneCount = ensureOverflow();
      // refresh cards after cloning
      cards = Array.from(track.querySelectorAll('.tech-card'));

      console.info('Tech carousel: cards=', cards.length, 'cloned=', cloneCount, 'scrollWidth=', track.scrollWidth, 'clientWidth=', track.clientWidth, 'prefersReduced=', prefersReduced);

      // if still no overflow, do not auto-scroll (but allow manual scroll)
      const loopLimit = () => Math.max(0, track.scrollWidth - track.clientWidth);
      if (loopLimit() <= 2) {
        console.info('Tech carousel: not enough overflow for auto-scroll; user can manually scroll.');
        return;
      }

      // RAF continuous scrolling
      let rafId = null;
      let last = null;
      let speedPxPerSec = prefersReduced ? 0 : 90; // px/second; tweak as needed
      let paused = false;

      function step(ts) {
        if (!last) last = ts;
        const dt = ts - last;
        last = ts;
        if (!paused && speedPxPerSec > 0) {
          const px = (speedPxPerSec * dt) / 1000;
          track.scrollLeft += px;
          const limit = loopLimit();
          if (track.scrollLeft >= limit) {
            // wrap seamlessly
            track.scrollLeft = track.scrollLeft - limit;
          }
        }
        rafId = requestAnimationFrame(step);
      }

      function start() { if (!rafId && speedPxPerSec > 0) { last = null; rafId = requestAnimationFrame(step); console.info('Tech carousel: started'); } }
      function stop() { if (rafId) { cancelAnimationFrame(rafId); rafId = null; last = null; console.info('Tech carousel: stopped'); } }

      const pause = () => { paused = true; };
      const resume = () => { paused = false; };

      // interactions
      track.addEventListener('mouseenter', pause);
      track.addEventListener('mouseleave', resume);
      track.addEventListener('focusin', pause);
      track.addEventListener('focusout', resume);
      track.addEventListener('touchstart', pause, { passive: true });
      track.addEventListener('touchend', resume, { passive: true });

      // Prev/Next: scroll by one card width (approx)
      function firstCardWidth() {
        const c = cards[0];
        if (!c) return 360;
        const style = getComputedStyle(track);
        const gap = parseFloat(style.gap || 20);
        return c.getBoundingClientRect().width + gap;
      }
      function scrollBy(px) {
        pause();
        track.scrollTo({ left: track.scrollLeft + px, behavior: 'smooth' });
        setTimeout(resume, 900);
      }
      if (prevBtn) prevBtn.addEventListener('click', () => scrollBy(-firstCardWidth()));
      if (nextBtn) nextBtn.addEventListener('click', () => scrollBy(firstCardWidth()));

      // manual scroll handler: normalize and resume
      let userTO = null;
      track.addEventListener('scroll', () => {
        pause();
        if (userTO) clearTimeout(userTO);
        userTO = setTimeout(() => {
          const limit = loopLimit();
          if (limit > 2) {
            if (track.scrollLeft >= limit) track.scrollLeft = track.scrollLeft - limit;
            if (track.scrollLeft < 0) track.scrollLeft = track.scrollLeft + limit;
          }
          resume();
        }, 200);
      }, { passive: true });

      // intersection observer start/stop with fallback start
      if ('IntersectionObserver' in window) {
        const obs = new IntersectionObserver(entries => {
          entries.forEach(e => {
            if (e.isIntersecting && !paused && speedPxPerSec > 0) start();
            else stop();
          });
        }, { threshold: 0.25 });
        obs.observe(wrapper);
        setTimeout(() => { if (!rafId && !prefersReduced) start(); }, 300);
        window.addEventListener('pagehide', () => { stop(); obs.disconnect(); }, { passive: true });
      } else {
        if (!prefersReduced) start();
      }

      // recompute when resize (maybe more clones needed)
      let rTO = null;
      window.addEventListener('resize', () => {
        if (rTO) clearTimeout(rTO);
        rTO = setTimeout(() => {
          // try to ensure overflow again if lost (safe small clones)
          ensureOverflow();
          if (loopLimit() <= 2) { stop(); console.info('Tech carousel: stopped (no overflow after resize)'); }
          else if (!prefersReduced) start();
        }, 180);
      });

    } catch (err) {
      console.error('Tech carousel error:', err);
    }
  }

  // ---------- Announcements premium interactions ----------
  function setupAnnouncements() {
    const ann = document.getElementById('announcements');
    if (!ann) return;

    // Add a small badge element (if not present)
    let badge = ann.querySelector('.announcement-badge');
    if (!badge) {
      badge = document.createElement('span');
      badge.className = 'announcement-badge';
      badge.textContent = 'Notice';
      const h3 = ann.querySelector('h3');
      if (h3) h3.prepend(badge);
    }

    // Make the promo line visually emphasized: wrap the 25% text in span.promo-highlight
    ann.querySelectorAll('p, li').forEach(node => {
      const txt = node.innerHTML;
      const updated = txt.replace(/(25% discount)/i, '<span class="promo-highlight">$1</span>');
      if (updated !== txt) node.innerHTML = updated;
    });

    // Add CTA button in image panel if not present (for quick booking)
    const imgPanel = ann.querySelector('.announcements-image');
    if (imgPanel && !imgPanel.querySelector('.announce-cta')) {
      const cta = document.createElement('a');
      cta.className = 'announce-cta';
      cta.href = 'contact.html#appointment';
      cta.textContent = 'Book Now';
      cta.setAttribute('aria-label', 'Book appointment now');
      imgPanel.appendChild(cta);
    }

    // Optional: temporary dismiss control (small 'x' in corner)
    if (!ann.querySelector('.announce-close')) {
      const close = document.createElement('button');
      close.className = 'announce-close';
      close.title = 'Dismiss announcement';
      close.style.cssText = 'position:absolute; right:12px; top:12px; background:transparent; border:none; font-size:18px; cursor:pointer; color:rgba(15,23,42,0.6);';
      close.innerHTML = '&times;';
      ann.style.position = 'relative';
      ann.appendChild(close);
      close.addEventListener('click', () => {
        ann.style.transition = 'opacity .35s ease, transform .35s ease';
        ann.style.opacity = '0';
        ann.style.transform = 'translateY(-8px)';
        setTimeout(() => { ann.style.display = 'none'; }, 360);
      });
    }

    // Accessibility
    ann.setAttribute('role', 'region');
    ann.setAttribute('aria-live', 'polite');
    ann.setAttribute('aria-label', 'Clinic announcements and offers');
  }

  // ---------- Staff carousel (premium, autoplay ON) ----------
  function setupStaffCarousel() {
    const track = document.querySelector(".staff-track");
    if (!track) return;

    const slides = Array.from(track.querySelectorAll(".staff-slide"));
    if (!slides.length) return;

    const paginationWrap = document.querySelector(".staff-pagination");
    if (paginationWrap) {
      paginationWrap.innerHTML = "";
      slides.forEach((_, i) => {
        const dot = document.createElement("button");
        dot.className = "staff-dot";
        dot.setAttribute("aria-label", `Go to team member ${i + 1}`);
        dot.type = "button";
        dot.addEventListener("click", () => {
          goToIndex(i);
          pauseAuto();
        });
        paginationWrap.appendChild(dot);
      });
    }

    let currentIndex = 0;
    let autoId = null;
    let paused = false;
    const autoDelay = 4600;
    const autoResumeDelay = 900;

    function setActive(index) {
      currentIndex = Math.max(0, Math.min(slides.length - 1, index));
      const dots = paginationWrap ? Array.from(paginationWrap.children) : [];
      dots.forEach((d, i) => d.classList.toggle("active", i === currentIndex));
    }

    function goToIndex(index) {
      if (index < 0) index = 0;
      if (index >= slides.length) index = slides.length - 1;

      const slide = slides[index];
      if (!slide) return;

      slide.scrollIntoView({
        behavior: prefersReducedMotion ? "auto" : "smooth",
        inline: "center",
        block: "nearest",
      });

      slides.forEach((s) => s.classList.remove("active"));
      slides[index].classList.add("active");

      setActive(index);
    }

    const prevBtn = document.querySelector(".staff-prev");
    const nextBtn = document.querySelector(".staff-next");

    if (prevBtn) {
      prevBtn.addEventListener("click", () => {
        goToIndex(currentIndex - 1);
        pauseAuto();
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener("click", () => {
        goToIndex(currentIndex + 1);
        pauseAuto();
      });
    }

    function findNearestIndex() {
      const trackRect = track.getBoundingClientRect();
      let best = 0, bestDist = Infinity;
      slides.forEach((s, i) => {
        const r = s.getBoundingClientRect();
        const dist = Math.abs(r.left - trackRect.left);
        if (dist < bestDist) { bestDist = dist; best = i; }
      });
      return best;
    }

    let scrollTO = null;
    track.addEventListener("scroll", () => {
      if (scrollTO) clearTimeout(scrollTO);
      scrollTO = setTimeout(() => {
        currentIndex = findNearestIndex();
        setActive(currentIndex);
        slides.forEach((s) => s.classList.remove("active"));
        const nearest = slides[currentIndex];
        if (nearest) nearest.classList.add("active");
      }, 120);
    }, { passive: true });

    function startAuto() {
      if (prefersReducedMotion) return;
      stopAuto();
      autoId = setInterval(() => {
        let next = currentIndex + 1;
        if (next >= slides.length) next = 0;
        goToIndex(next);
      }, autoDelay);
    }

    function stopAuto() {
      if (autoId) {
        clearInterval(autoId);
        autoId = null;
      }
    }

    function pauseAuto() {
      paused = true;
      stopAuto();
      setTimeout(() => {
        paused = false;
        if (!prefersReducedMotion) startAuto();
      }, autoResumeDelay);
    }

    track.addEventListener("mouseenter", () => {
      paused = true;
      stopAuto();
    });
    track.addEventListener("mouseleave", () => {
      paused = false;
      if (!prefersReducedMotion) startAuto();
    });
    track.addEventListener("touchstart", () => {
      paused = true;
      stopAuto();
    }, { passive: true });
    track.addEventListener("touchend", () => {
      paused = false;
      if (!prefersReducedMotion) startAuto();
    }, { passive: true });
    track.addEventListener("focusin", () => {
      paused = true;
      stopAuto();
    });
    track.addEventListener("focusout", () => {
      paused = false;
      if (!prefersReducedMotion) startAuto();
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "ArrowRight") {
        goToIndex(currentIndex + 1);
        pauseAuto();
      }
      if (e.key === "ArrowLeft") {
        goToIndex(currentIndex - 1);
        pauseAuto();
      }
    });

    // initialize active state & pagination
    setActive(0);
    slides.forEach((s) => s.classList.remove("active"));
    slides[0].classList.add("active");

    // start autoplay when visible (or immediately if no IntersectionObserver)
    if (supportsIntersection) {
      const obs = new IntersectionObserver((entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting && !paused && !prefersReducedMotion) startAuto();
          else stopAuto();
        });
      }, { threshold: 0.5 });
      obs.observe(track);
      window.addEventListener("pagehide", () => {
        stopAuto();
        obs.disconnect();
      });
    } else {
      if (!prefersReducedMotion) startAuto();
    }

    // keep currentIndex accurate after resize
    window.addEventListener("resize", () => {
      currentIndex = findNearestIndex();
      setActive(currentIndex);
    });
  }

  // ---------- Header + mobile nav ----------
  function setupHeaderAndNav() {
    const header = document.getElementById("siteHeader");
    const toggle = document.getElementById("navToggle");
    const nav = document.getElementById("mainNav");

    if (header) {
      const onScroll = () => {
        header.classList.toggle("scrolled", window.scrollY > 20);
      };
      window.addEventListener("scroll", onScroll, { passive: true });
      onScroll();
    }

    if (toggle && nav) {
      toggle.addEventListener("click", () => {
        const isOpen = toggle.getAttribute("aria-expanded") === "true";
        toggle.setAttribute("aria-expanded", String(!isOpen));
        nav.classList.toggle("open");
        document.body.style.overflow = !isOpen ? "hidden" : "";
      });

      nav.querySelectorAll(".nav-link").forEach((a) => {
        a.addEventListener("click", () => {
          if (window.innerWidth <= 900) {
            toggle.setAttribute("aria-expanded", "false");
            nav.classList.remove("open");
            document.body.style.overflow = "";
          }
        });
      });
    }
  }

  // ---------- Smooth anchors ----------
  function setupSmoothAnchors() {
    document.querySelectorAll('a[href^="#"]').forEach((a) => {
      a.addEventListener("click", (e) => {
        const id = a.getAttribute("href").slice(1);
        const target = document.getElementById(id);
        if (target) {
          e.preventDefault();
          target.scrollIntoView({ behavior: "smooth" });
          // close mobile nav if open
          const nav = document.getElementById('mainNav');
          const toggle = document.getElementById('navToggle');
          if (nav && nav.classList.contains('open')) {
            nav.classList.remove('open');
            toggle && toggle.setAttribute('aria-expanded','false');
            document.body.style.overflow = '';
          }
        }
      });
    });
  }

  // ---------- Footer year ----------
  function setFooterYear() {
    // try several ids used across pages
    ['year','year2','year3','year4'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = new Date().getFullYear();
    });
  }

  // ---------- ABOUT PAGE PARALLAX HERO ----------
  function setupAboutParallax() {
    const heroBg = document.querySelector(".about-hero-image");
    if (!heroBg) return;

    window.addEventListener("scroll", () => {
      const scrollY = window.scrollY || window.pageYOffset;
      const factor = scrollY / 500;
      heroBg.style.setProperty("--scrollFactor", factor.toString());
      heroBg.classList.add("parallax");
    });
  }

  // ---------- Annual Checkup interactions ----------
  function setupAnnualInteractions() {
    const printBtn = document.getElementById('printCheckup');
    const annualSection = document.getElementById('annual-checkup');
    if (printBtn) {
      printBtn.addEventListener('click', () => {
        const w = window.open('', '_blank');
        if (!w) {
          alert('Popups blocked — please use your browser print option.');
          return;
        }
        const html = `
          <html><head>
            <title>Annual Dental Check-Up — 100SMILES</title>
            <style>
              body{font-family:Arial, Helvetica, sans-serif; padding:28px; color:#111}
              h1{font-size:20px;margin-bottom:8px}
              ul{line-height:1.6}
            </style>
          </head>
          <body>
            <h1>Annual Dental Check-Up — 100SMILES</h1>
            ${annualSection ? annualSection.innerHTML : ''}
          </body></html>`;
        w.document.open();
        w.document.write(html);
        w.document.close();
        setTimeout(() => { w.print(); }, 250);
      });
    }

    if (window.location.hash === '#annual-checkup') {
      const el = document.getElementById('annual-checkup');
      if (el) {
        el.setAttribute('tabindex', '-1');
        el.focus();
      }
    }
  }

  /* ---------- Premium UX: accordion, tilt (services only), misc ---------- */

  function setupPremiumUX() {
    setupAnnualAccordion();
    // Keep tilt only for service cards to avoid interfering with tech marquee
    setupCardTilt('.service-card');
    document.querySelectorAll('.acc-btn').forEach(b => b.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); b.click(); }
    }));
  }

  // Accordion for annual list
  function setupAnnualAccordion() {
    const items = Array.from(document.querySelectorAll('.annual-list li'));
    if (!items.length) return;

    items.forEach(li => {
      const btn = li.querySelector('.acc-btn');
      const content = li.querySelector('.acc-content');
      if (!btn || !content) return;

      btn.addEventListener('click', () => {
        const open = li.classList.contains('open');
        items.forEach(i => {
          i.classList.remove('open');
          const c = i.querySelector('.acc-content');
          if (c) c.style.maxHeight = null;
        });
        if (!open) {
          li.classList.add('open');
          content.style.maxHeight = content.scrollHeight + 'px';
          content.setAttribute('tabindex', '-1');
          content.focus({ preventScroll: true });
        } else {
          li.classList.remove('open');
          content.style.maxHeight = null;
        }
      });
    });
  }

  // Simple tilt effect (pointermove) - applied only to selector passed (services)
  function setupCardTilt(selector) {
    if (!selector) return;
    const nodes = document.querySelectorAll(selector);
    nodes.forEach(node => {
      node.classList.add('tilt-card');
      let rect = null;
      function updateRect() { rect = node.getBoundingClientRect(); }
      updateRect();
      window.addEventListener('resize', updateRect);

      node.addEventListener('pointermove', (e) => {
        const x = e.clientX - (rect.left + rect.width/2);
        const y = e.clientY - (rect.top + rect.height/2);
        const rx = (y / rect.height) * -4; // smaller tilt
        const ry = (x / rect.width) * 5;
        node.style.transform = `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg) translateZ(6px)`;
      }, { passive: true });

      node.addEventListener('pointerleave', () => {
        node.style.transform = '';
      });

      node.addEventListener('pointerdown', () => {
        node.style.transform += ' scale(.995)';
      });
      node.addEventListener('pointerup', () => {
        node.style.transform = '';
      });
    });
  }

// ---------- Header + mobile nav (improved, accessible) ----------
function setupHeaderAndNav() {
  const header = document.getElementById("siteHeader");
  const toggle = document.getElementById("navToggle");
  const nav = document.getElementById("mainNav");

  if (header) {
    const onScroll = () => {
      header.classList.toggle('scrolled', window.scrollY > 20);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  if (!toggle || !nav) return;

  // create inner structure helpers for overlay menu (only on small screens)
  // Ensure nav contains a links wrapper for easier styling (doesn't change content)
  if (!nav.querySelector('.links')) {
    const linksWrap = document.createElement('div');
    linksWrap.className = 'links';
    // move all nav-link and .nav-cta into .links, preserving order
    const items = Array.from(nav.children);
    items.forEach(ch => linksWrap.appendChild(ch));
    nav.appendChild(linksWrap);
  }

  // Accessibility: elements to trap focus
  function getFocusable(menu) {
    return Array.from(menu.querySelectorAll('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'))
      .filter(el => el.offsetParent !== null);
  }

  let isOpen = false;

  function openMenu() {
    nav.classList.add('open');
    toggle.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
    isOpen = true;

    // focus first focusable item inside menu
    const focusables = getFocusable(nav);
    if (focusables.length) focusables[0].focus();

    // outside click handler
    setTimeout(() => { // delay to avoid immediate trigger from toggle click
      document.addEventListener('pointerdown', onOutsidePointer);
    }, 10);

    document.addEventListener('keydown', onKeyDown);
  }

  function closeMenu() {
    nav.classList.remove('open');
    toggle.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
    isOpen = false;
    toggle.focus();
    document.removeEventListener('pointerdown', onOutsidePointer);
    document.removeEventListener('keydown', onKeyDown);
  }

  function onOutsidePointer(e) {
    if (!nav.contains(e.target) && !toggle.contains(e.target)) {
      closeMenu();
    }
  }

  function onKeyDown(e) {
    if (e.key === 'Escape') {
      closeMenu();
      return;
    }
    if (e.key === 'Tab' && isOpen) {
      // simple focus trap: keep focus inside menu
      const focusables = getFocusable(nav);
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }

  // toggle button click
  toggle.addEventListener('click', (e) => {
    const expanded = toggle.getAttribute('aria-expanded') === 'true';
    if (expanded) closeMenu(); else openMenu();
  });

  // close menu when any nav link clicked (mobile)
  nav.addEventListener('click', (e) => {
    const a = e.target.closest('a');
    if (!a) return;
    // keep external links from closing? We'll close on internal nav links
    if (window.innerWidth <= 900) {
      closeMenu();
    }
  });

  // adapt if window resized from mobile to desktop while menu open
  window.addEventListener('resize', () => {
    if (window.innerWidth > 900 && nav.classList.contains('open')) {
      closeMenu();
    }
  }, { passive: true });
}



  // ---------- Init ----------
  function init() {
    setFooterYear();
    setupHeaderAndNav();
    setupScrollReveal();
    setupTechnologiesCarousel();
    setupServicesAutoScroll();
    setupSmoothAnchors();
    setupStaffCarousel();
    setupAboutParallax();
    setupAnnualInteractions();
    setupPremiumUX();
    setupAnnouncements();

    if (prefersReducedMotion) {
      document
        .querySelectorAll(".reveal")
        .forEach((el) => el.classList.add("reveal-visible"));
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
