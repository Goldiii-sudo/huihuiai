(() => {
  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

  // --- preloader ---
  const preloader = document.getElementById("preloader");
  const count = document.querySelector(".preloader-count");
  const bar = document.querySelector(".preloader-bar span");
  const start = performance.now();
  const DURATION = 1400;

  const tick = (now) => {
    const p = clamp((now - start) / DURATION, 0, 1);
    count.textContent = Math.round(p * 100);
    bar.style.transform = `scaleX(${p})`;
    if (p < 1) {
      requestAnimationFrame(tick);
    } else {
      preloader.classList.add("done");
      document.body.classList.add("loaded");
      heroIntro();
      setTimeout(() => preloader.remove(), 1000);
    }
  };
  requestAnimationFrame(tick);

  // --- hero title split ---
  const TYPED_WORDS = ["типографика", "скролл-эффекты", "WebGL", "интерактив"];
  const splitNode = document.querySelector("[data-split]");

  splitNode.innerHTML = splitNode.textContent
    .split("")
    .map((ch, i) => `<span style="transform:translateY(110%);transition:transform .7s cubic-bezier(.22,1,.36,1) ${0.05 * i + 0.4}s">${ch}</span>`)
    .join("");

  const heroIntro = () => {
    splitNode.querySelectorAll("span").forEach((s) => {
      s.style.transform = "translateY(0)";
    });
  };

  // --- typewriter ---
  const typed = document.getElementById("typed");
  let wordIdx = 0;
  let charIdx = 0;
  let deleting = false;

  const typeName = () => {
    const word = TYPED_WORDS[wordIdx];
    if (!deleting) {
      charIdx++;
      typed.textContent = word.slice(0, charIdx);
      if (charIdx === word.length) {
        deleting = true;
        setTimeout(typeName, 1600);
        return;
      }
    } else {
      charIdx--;
      typed.textContent = word.slice(0, charIdx);
      if (charIdx === 0) {
        deleting = false;
        wordIdx = (wordIdx + 1) % TYPED_WORDS.length;
      }
    }
    setTimeout(typeName, deleting ? 45 : 90);
  };
  setTimeout(typeName, 2500);

  // --- custom cursor ---
  const cursor = document.querySelector(".cursor");
  const follow = document.querySelector(".cursor-follow");
  let mx = -100;
  let my = -100;
  let fx = -100;
  let fy = -100;

  window.addEventListener("mousemove", (e) => {
    mx = e.clientX;
    my = e.clientY;
    cursor.style.transform = `translate(${mx}px, ${my}px) translate(-50%, -50%)`;
  });

  const followLoop = () => {
    fx += (mx - fx) * 0.16;
    fy += (my - fy) * 0.16;
    follow.style.transform = `translate(${fx}px, ${fy}px) translate(-50%, -50%)`;
    requestAnimationFrame(followLoop);
  };
  followLoop();

  document.querySelectorAll("a, button, [data-magnetic]").forEach((el) => {
    el.addEventListener("mouseenter", () => follow.classList.add("hover"));
    el.addEventListener("mouseleave", () => follow.classList.remove("hover"));
  });

  // --- magnetic elements ---
  document.querySelectorAll("[data-magnetic]").forEach((el) => {
    el.addEventListener("mousemove", (e) => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left - r.width / 2) * 0.3;
      const y = (e.clientY - r.top - r.height / 2) * 0.3;
      el.style.transform = `translate(${x}px, ${y}px)`;
    });
    el.addEventListener("mouseleave", () => {
      el.style.transition = "transform .4s cubic-bezier(.22,1,.36,1)";
      el.style.transform = "translate(0,0)";
      setTimeout(() => (el.style.transition = ""), 400);
    });
  });

  // --- scroll reveal ---
  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          revealObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15 }
  );
  document.querySelectorAll("[data-reveal]").forEach((el) => revealObserver.observe(el));

  // --- counters ---
  const counterObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        const target = parseInt(el.dataset.count, 10);
        const t0 = performance.now();
        const step = (now) => {
          const p = clamp((now - t0) / 1200, 0, 1);
          el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3)));
          if (p < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
        counterObserver.unobserve(el);
      });
    },
    { threshold: 0.5 }
  );
  document.querySelectorAll("[data-count]").forEach((el) => counterObserver.observe(el));

  // --- tilt cards ---
  if (!prefersReduced && window.matchMedia("(hover: hover)").matches) {
    document.querySelectorAll("[data-tilt]").forEach((card) => {
      card.addEventListener("mousemove", (e) => {
        const r = card.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        card.style.transform = `perspective(900px) rotateY(${px * 8}deg) rotateX(${-py * 8}deg) translateY(-4px)`;
      });
      card.addEventListener("mouseleave", () => {
        card.style.transition = "transform .5s cubic-bezier(.22,1,.36,1)";
        card.style.transform = "";
        setTimeout(() => (card.style.transition = "transform .1s"), 500);
      });
    });
  }

  // --- scroll progress ---
  const progress = document.querySelector(".progress-bar span");
  window.addEventListener(
    "scroll",
    () => {
      const p = window.scrollY / (document.documentElement.scrollHeight - window.innerHeight);
      progress.style.transform = `scaleX(${clamp(p, 0, 1)})`;
    },
    { passive: true }
  );
})();
