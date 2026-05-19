/* =======================================================================
   LLM Modularity — project page interactions
   - Animated neuron background (canvas) with 4-color domain particles
   - Count-up on the headline numbers when they scroll into view
   - Reveal-on-scroll for sections
   ======================================================================= */

(() => {

  // ===================================================================
  // 1) Animated neuron background — particles + soft connecting lines
  // ===================================================================
  const canvas = document.getElementById("neurons-bg");
  const ctx = canvas.getContext("2d");
  let W, H, particles, dpr;
  const colors = ["#C0392B", "#2471A3", "#E67E22", "#27AE60"]; // 4 domains

  function size() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = canvas.getBoundingClientRect();
    W = rect.width;
    H = rect.height;
    canvas.width  = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function init() {
    size();
    const density = Math.max(40, Math.floor(W * H / 16000));
    particles = Array.from({length: density}, () => spawn());
  }
  function spawn() {
    return {
      x: Math.random() * W,
      y: Math.random() * H,
      vx: (Math.random() - .5) * .25,
      vy: (Math.random() - .5) * .25,
      r: 1 + Math.random() * 1.8,
      c: colors[Math.floor(Math.random() * colors.length)],
      twinkle: Math.random() * Math.PI * 2,
    };
  }

  function step() {
    ctx.clearRect(0, 0, W, H);

    // connecting lines
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const a = particles[i], b = particles[j];
        const dx = a.x - b.x, dy = a.y - b.y;
        const d2 = dx*dx + dy*dy;
        if (d2 < 110*110) {
          const op = 0.10 * (1 - Math.sqrt(d2)/110);
          ctx.strokeStyle = a.c === b.c
            ? hexA(a.c, op * 1.4)            // same-domain pair: highlight
            : `rgba(255,255,255,${op * .35})`; // cross-domain: faint
          ctx.lineWidth = a.c === b.c ? 0.7 : 0.4;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
    }

    // particles
    particles.forEach(p => {
      p.x += p.vx; p.y += p.vy;
      if (p.x < -10) p.x = W + 10; if (p.x > W + 10) p.x = -10;
      if (p.y < -10) p.y = H + 10; if (p.y > H + 10) p.y = -10;
      p.twinkle += 0.04;
      const glow = 0.6 + 0.4 * Math.sin(p.twinkle);
      ctx.fillStyle = hexA(p.c, 0.6 * glow);
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    });

    requestAnimationFrame(step);
  }

  function hexA(hex, a) {
    const v = hex.replace("#","");
    const r = parseInt(v.slice(0,2), 16),
          g = parseInt(v.slice(2,4), 16),
          b = parseInt(v.slice(4,6), 16);
    return `rgba(${r},${g},${b},${a})`;
  }

  window.addEventListener("resize", () => { init(); });
  init();
  step();


  // ===================================================================
  // 2) Count-up on headline numbers
  // ===================================================================
  function counterUp(el, target, decimals, suffix, duration = 1600) {
    const start = performance.now();
    function tick(now) {
      const t = Math.min(1, (now - start) / duration);
      // easeOutCubic
      const e = 1 - Math.pow(1 - t, 3);
      const v = target * e;
      el.firstChild.textContent = v.toFixed(decimals);
      if (t < 1) requestAnimationFrame(tick);
      else el.firstChild.textContent = target.toFixed(decimals);
    }
    requestAnimationFrame(tick);
  }

  const numIO = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      const card = e.target;

      const value = card.querySelector(".num-value");
      const tgt   = parseFloat(card.dataset.target);
      const dec   = parseInt(card.dataset.decimals || "0", 10);
      const suf   = card.dataset.suffix || "";
      if (value && !card.dataset.done) {
        counterUp(value, tgt, dec, suf);
      }

      // cross-counter on the "vs" line
      const cross = card.querySelector(".num-cross");
      if (cross && cross.dataset.target) {
        const ctgt = parseFloat(cross.dataset.target);
        const cdec = parseInt(cross.dataset.decimals || "0", 10);
        const start = performance.now();
        (function tick(now){
          const t = Math.min(1, (now - start) / 1600);
          const e2 = 1 - Math.pow(1 - t, 3);
          cross.textContent = (ctgt * e2).toFixed(cdec);
          if (t < 1) requestAnimationFrame(tick);
          else cross.textContent = ctgt.toFixed(cdec);
        })(performance.now());
      }

      card.dataset.done = "1";
      numIO.unobserve(card);
    });
  }, { threshold: 0.35 });

  document.querySelectorAll(".num-card").forEach(c => numIO.observe(c));


  // ===================================================================
  // 3) Reveal-on-scroll for major blocks
  // ===================================================================
  const targets = document.querySelectorAll(
    ".section-head, .domain-card, .flow-step, .evidence-text, .evidence-fig, .model-card, .takeaway, .chord-grid"
  );
  targets.forEach(el => el.classList.add("reveal"));

  const revealIO = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add("in");
        revealIO.unobserve(e.target);
      }
    });
  }, { threshold: 0.12 });

  targets.forEach(t => revealIO.observe(t));


  // ===================================================================
  // 4) HERO STAGE — type a prompt, light up the matching brain region
  // ===================================================================
  const TASKS = [
    { domain: "lang", name: "Language network",
      color: "#C0392B",
      prompt: "She lifted ___ off the chair",
      answer: "herself" },
    { domain: "md",   name: "Multiple-Demand network",
      color: "#2471A3",
      prompt: "If y = 3 × 4 + 1, then y = ___",
      answer: "13" },
    { domain: "phys", name: "Intuitive-Physics network",
      color: "#E67E22",
      prompt: "An iron cube dropped into water will ___",
      answer: "sink" },
    { domain: "tom",  name: "Theory-of-Mind network",
      color: "#27AE60",
      prompt: "Sally hides her marble. Anne moves it.\nSally returns and looks in ___",
      answer: "the original box" },
  ];

  const stageBrain  = document.getElementById("stage-brain");
  const stageNN     = document.getElementById("stage-nn");
  const promptText  = document.getElementById("prompt-text");
  const promptAns   = document.getElementById("prompt-answer");
  const promptChip  = document.getElementById("prompt-domain-chip");
  const pills       = Array.from(document.querySelectorAll(".stage-pill"));

  // build the neural-net circuit viz once
  buildNNViz();

  function setActive(domain) {
    if (stageBrain) {
      stageBrain.classList.remove("is-lang","is-md","is-phys","is-tom");
      stageBrain.classList.add("is-" + domain);
    }
    if (stageNN) {
      stageNN.classList.remove("is-lang","is-md","is-phys","is-tom");
      stageNN.classList.add("is-" + domain);
    }
    const t = TASKS.find(x => x.domain === domain);
    if (t) {
      stageBrain && stageBrain.style.setProperty("--pulse-c", hexA(t.color, .35));
      promptChip.textContent = t.name;
      promptChip.style.setProperty("--chip-c", hexA(t.color, .45));
      promptChip.style.color = t.color;
    }
    pills.forEach(p => p.classList.toggle("active", p.dataset.domain === domain));
  }

  let userInteracted = false;
  pills.forEach(p => p.addEventListener("click", () => {
    userInteracted = true;
    const i = TASKS.findIndex(x => x.domain === p.dataset.domain);
    idx = i;
    runOne(TASKS[idx], /*skipWait*/ true);
  }));

  // type a string letter-by-letter into `el`. Returns a Promise that resolves
  // when complete or when aborted (via abortToken).
  let abortToken = 0;
  async function typeInto(el, text, perChar = 32) {
    const myToken = ++abortToken;
    el.textContent = "";
    for (let i = 0; i < text.length; i++) {
      if (myToken !== abortToken) return;
      el.textContent += text[i];
      // pause longer at spaces/newlines for breathing
      const ch = text[i];
      const wait = ch === "\n" ? 220
                  : ch === " " ? perChar + 30
                  : perChar + Math.random() * 25;
      await sleep(wait);
    }
  }
  function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

  let idx = 0;
  async function runOne(task, skipWait = false) {
    promptAns.classList.remove("show");
    promptAns.textContent = "";
    setActive(task.domain);
    await typeInto(promptText, task.prompt, 38);
    // reveal answer
    promptAns.textContent = task.answer;
    promptAns.classList.add("show");
    if (!skipWait) await sleep(2400);
  }

  async function loop() {
    while (true) {
      const task = TASKS[idx % TASKS.length];
      await runOne(task);
      if (userInteracted) {
        // user took control; pause auto-cycle for a few seconds
        await sleep(6000);
        userInteracted = false;
      }
      idx = (idx + 1) % TASKS.length;
      await sleep(450);   // brief breath between prompts
    }
  }
  // kick it off
  if (stageBrain) loop();


  // ===================================================================
  // BUILD THE LLM NEURAL-NETWORK CIRCUIT VIZ
  //   - 6-layer feedforward MLP diagram (input → 4 hidden → output)
  //   - Edges fully-connected between adjacent layers
  //   - Each domain has a deterministic "circuit": 3 paths from input → output
  //     biased toward a particular vertical band of the network.
  //   - At a given moment, exactly one domain's circuit is lit; the rest of
  //     the network goes faint.
  // ===================================================================
  function buildNNViz() {
    const svg     = document.getElementById("stage-nn");
    if (!svg) return;
    const labelsG = document.getElementById("nn-layer-labels");
    const edgesG  = document.getElementById("nn-edges");
    const nodesG  = document.getElementById("nn-nodes");
    if (!edgesG || !nodesG) return;

    // Architecture (display only):
    const LAYERS   = [5, 8, 8, 8, 8, 5];     // node count per layer
    const X_POS    = [60, 150, 240, 330, 420, 500];
    const Y_TOP    = 56;     // generous top margin so node glow can't touch IN/L₁ labels
    const Y_BOT    = 224;    // generous bottom margin so glow can't reach the pills row
    const NODE_R   = 4.2;

    const DOMAINS = ["lang","md","phys","tom"];
    // --- REAL-data-driven circuit shape (Qwen2.5-32B per-domain layer
    //     profile injected via assets/real_layers.js). Each domain occupies a
    //     distinct vertical band; band order reflects the real mean network
    //     depth of that domain's top-0.1% neurons, and the number of paths
    //     reflects how broadly across layers that domain recruits neurons.
    //     Falls back to defaults if the real data is unavailable. ---
    const RL = (typeof window !== "undefined" && window.REAL_LAYERS) ? window.REAL_LAYERS : null;
    function _profStats(p) {
      const n = p.length;
      let s = 0; for (let i = 0; i < n; i++) s += p[i]; if (s <= 0) s = 1;
      let md = 0; for (let i = 0; i < n; i++) md += i * p[i]; md /= (s * (n - 1));
      const mx = Math.max.apply(null, p);
      let br = 0; for (let i = 0; i < n; i++) if (p[i] > 0.35 * mx) br++;
      return { md: md, breadth: br / n };
    }
    let DOMAIN_BIAS, DOMAIN_START;
    if (RL && RL.lang && RL.md && RL.phys && RL.tom) {
      const st = {}; for (const d of DOMAINS) st[d] = _profStats(RL[d]);
      const ranked = DOMAINS.slice().sort((a, b) => st[a].md - st[b].md);
      const BANDS = [0.17, 0.40, 0.62, 0.85];
      DOMAIN_BIAS = {}; DOMAIN_START = {};
      ranked.forEach((d, k) => {
        DOMAIN_BIAS[d] = BANDS[k];
        const nP = Math.max(2, Math.min(6, Math.round(2 + 5 * st[d].breadth)));
        const c0 = LAYERS[0], starts = [];
        for (let j = 0; j < nP; j++) starts.push(Math.round(j * (c0 - 1) / Math.max(1, nP - 1)));
        DOMAIN_START[d] = Array.from(new Set(starts));
      });
    } else {
      DOMAIN_BIAS  = { lang: 0.85, md: 0.42, phys: 0.60, tom: 0.16 };
      DOMAIN_START = { lang: [3, 4], md: [2], phys: [1, 2], tom: [0, 1] };
    }

    function nodeXY(L, idx) {
      const n = LAYERS[L];
      const x = X_POS[L];
      const y = n === 1
        ? (Y_TOP + Y_BOT) / 2
        : Y_TOP + (Y_BOT - Y_TOP) * (idx / (n - 1));
      return [x, y];
    }

    // deterministic per-domain RNG so layouts are stable
    function rng(seed) {
      let s = seed >>> 0;
      return function() {
        s = (s + 0x6D2B79F5) >>> 0;
        let t = s;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return (((t ^ (t >>> 14)) >>> 0) / 4294967296);
      };
    }
    function hashStr(s) {
      let h = 2166136261;
      for (let i = 0; i < s.length; i++) {
        h ^= s.charCodeAt(i);
        h = Math.imul(h, 16777619);
      }
      return h >>> 0;
    }

    // For each domain, generate set of edges and nodes that form its circuit.
    // Method: from each start node, greedily walk through the layers, picking
    // the layer-i+1 node whose Y is closest to (bias + small jitter).
    const edgeMark   = new Map();   // key "L1n2-L2n5"  -> Set("lang","tom") of domains
    const nodeMark   = new Map();   // key "L0n3"      -> Set
    function markEdge(L1, i1, L2, i2, dom) {
      const k = `e_${L1}_${i1}_${L2}_${i2}`;
      if (!edgeMark.has(k)) edgeMark.set(k, new Set());
      edgeMark.get(k).add(dom);
    }
    function markNode(L, i, dom) {
      const k = `n_${L}_${i}`;
      if (!nodeMark.has(k)) nodeMark.set(k, new Set());
      nodeMark.get(k).add(dom);
    }

    for (const dom of DOMAINS) {
      const r = rng(hashStr(dom));
      const bias = DOMAIN_BIAS[dom];
      for (const startIdx of DOMAIN_START[dom]) {
        let curIdx = startIdx;
        markNode(0, curIdx, dom);
        for (let L = 0; L < LAYERS.length - 1; L++) {
          // Target Y in next layer = top + bias * height + jitter
          const yTarget = Y_TOP + bias * (Y_BOT - Y_TOP) + (r() - 0.5) * 22;
          // pick closest in next layer
          const nNext = LAYERS[L + 1];
          let bestI = 0, bestD = Infinity;
          for (let i = 0; i < nNext; i++) {
            const [, y] = nodeXY(L + 1, i);
            const d = Math.abs(y - yTarget);
            if (d < bestD) { bestD = d; bestI = i; }
          }
          markEdge(L, curIdx, L + 1, bestI, dom);
          markNode(L + 1, bestI, dom);
          curIdx = bestI;
        }
      }
    }

    // Draw very faint vertical wells behind each layer of nodes (depth cue)
    const wellW = 22;
    for (let L = 0; L < LAYERS.length; L++) {
      const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      rect.setAttribute("x", X_POS[L] - wellW / 2);
      rect.setAttribute("y", Y_TOP - 4);
      rect.setAttribute("width", wellW);
      rect.setAttribute("height", Y_BOT - Y_TOP + 8);
      rect.setAttribute("rx", wellW / 2);
      rect.setAttribute("class", "nn-layer-well");
      // insert at bottom of edges group so it sits behind edges
      edgesG.parentNode.insertBefore(rect, edgesG);
    }

    // Draw layer labels (top)
    const LAYER_LABELS = ["IN", "L₁", "L₂", "L₃", "L₄", "OUT"];
    for (let L = 0; L < LAYERS.length; L++) {
      const txt = document.createElementNS("http://www.w3.org/2000/svg", "text");
      txt.setAttribute("x", X_POS[L]);
      txt.setAttribute("y", 14);
      txt.setAttribute("text-anchor", "middle");
      txt.setAttribute("class", "nn-label");
      txt.textContent = LAYER_LABELS[L];
      labelsG.appendChild(txt);
    }

    // Draw all edges as smooth bezier curves
    // Insert lit (circuit) edges LAST so they paint on top of base edges
    const litEdges = [];
    for (let L = 0; L < LAYERS.length - 1; L++) {
      for (let i = 0; i < LAYERS[L]; i++) {
        for (let j = 0; j < LAYERS[L + 1]; j++) {
          const [x1, y1] = nodeXY(L, i);
          const [x2, y2] = nodeXY(L + 1, j);
          // Cubic bezier with horizontal tangents → smooth S-curve
          const cx1 = x1 + (x2 - x1) * 0.45;
          const cx2 = x2 - (x2 - x1) * 0.45;
          const d = `M ${x1} ${y1} C ${cx1} ${y1}, ${cx2} ${y2}, ${x2} ${y2}`;
          const p = document.createElementNS("http://www.w3.org/2000/svg", "path");
          p.setAttribute("d", d);
          let cls = "nn-edge";
          const m = edgeMark.get(`e_${L}_${i}_${L + 1}_${j}`);
          if (m) {
            for (const dom of m) cls += ` circ-${dom}`;
            p.setAttribute("class", cls);
            litEdges.push(p);   // paint later
          } else {
            p.setAttribute("class", cls);
            edgesG.appendChild(p);
          }
        }
      }
    }
    litEdges.forEach(e => edgesG.appendChild(e));

    // Draw all nodes (on top of edges).  Lit nodes added LAST so they paint
    // on top of background nodes.
    const litNodes = [];
    for (let L = 0; L < LAYERS.length; L++) {
      for (let i = 0; i < LAYERS[L]; i++) {
        const [x, y] = nodeXY(L, i);
        const c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        c.setAttribute("cx", x);
        c.setAttribute("cy", y);
        c.setAttribute("r", NODE_R);
        let cls = "nn-node";
        const m = nodeMark.get(`n_${L}_${i}`);
        if (m) {
          for (const dom of m) cls += ` circ-${dom}`;
          c.setAttribute("class", cls);
          litNodes.push(c);
        } else {
          c.setAttribute("class", cls);
          nodesG.appendChild(c);
        }
      }
    }
    litNodes.forEach(n => nodesG.appendChild(n));
  }


  // ===================================================================
  // 5) Mark num-cards in-view (for the shine effect)
  // ===================================================================
  const numShineIO = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) e.target.classList.add("in-view");
    });
  }, { threshold: 0.4 });
  document.querySelectorAll(".num-card").forEach(c => numShineIO.observe(c));

})();
