(() => {
  const ID = "pinyinctrlf-box";
  const STYLE_ID = "pinyinctrlf-style";
  const HIT_CLASS = "pinyinctrlf-hit";
  const MAX_RESULTS = 8;
  const MAX_HIGHLIGHTS = 200;
  let indexCache = null;

  function ensureStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      .${HIT_CLASS} {
        background: #ffeb3b;
        color: #000;
        padding: 0 2px;
        border-radius: 3px;
      }
    `;
    document.head.appendChild(style);
  }

  function ensureBox() {
    let box = document.getElementById(ID);
    if (box) return box;

    box = document.createElement("div");
    box.id = ID;
    box.style.cssText = [
      "position: fixed",
      "top: 16px",
      "right: 16px",
      "z-index: 2147483647",
      "background: white",
      "border: 1px solid rgba(0,0,0,0.15)",
      "border-radius: 12px",
      "padding: 10px 12px",
      "box-shadow: 0 10px 30px rgba(0,0,0,0.12)",
      "font: 14px/1.4 -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif",
      "width: 360px"
    ].join(";");

    box.innerHTML = `
      <div style="display:flex;gap:8px;align-items:center;">
        <span title="PinyinCtrlF">\uD83D\uDD0E</span>
        <input id="${ID}-input" placeholder="拼音或首字母，例如 zhangsan / zs"
          style="flex:1;border:1px solid rgba(0,0,0,0.15);border-radius:10px;padding:8px 10px;outline:none;" />
        <button id="${ID}-refresh"
          style="border:none;background:transparent;cursor:pointer;font-size:16px;line-height:1;" title="重新扫描">\u21bb</button>
        <button id="${ID}-close"
          style="border:none;background:transparent;cursor:pointer;font-size:16px;line-height:1;">\u2715</button>
      </div>
      <div id="${ID}-status" style="margin-top:8px;color:rgba(0,0,0,0.6);">
        正在扫描页面名字候选...
      </div>
      <div id="${ID}-results" style="margin-top:8px;display:flex;flex-direction:column;gap:6px;"></div>
    `;

    document.documentElement.appendChild(box);

    box.querySelector(`#${ID}-close`).addEventListener("click", () => box.remove());
    box.querySelector(`#${ID}-refresh`).addEventListener("click", () => rebuildIndex(true));
    return box;
  }

  function openBox() {
    const box = ensureBox();
    const input = box.querySelector(`#${ID}-input`);
    input.focus();
    input.select();
    rebuildIndex(false);
  }

  function normalizeQuery(query) {
    return query
      .toLowerCase()
      .replace(/\s+/g, "")
      .replace(/-/g, "")
      .replace(/ü/g, "v")
      .replace(/[^a-zv]/g, "");
  }

  function expandUmlaut(key) {
    const keys = new Set([key]);
    if (key.includes("ü")) {
      keys.add(key.replace(/ü/g, "v"));
      keys.add(key.replace(/ü/g, "u"));
    }
    if (key.includes("v")) {
      keys.add(key.replace(/v/g, "ü"));
      keys.add(key.replace(/v/g, "u"));
    }
    return Array.from(keys);
  }

  function getGroupContainer(node) {
    const el = node.parentElement;
    if (!el) return null;
    const textLayer = el.closest(".textLayer");
    if (textLayer) return textLayer;
    return el.closest("p,div,li,td,th,section,article,table,tbody,tr") || el;
  }

  function buildGroups() {
    const groups = new Map();
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode(node) {
          if (!node.nodeValue || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
          const parent = node.parentElement;
          if (!parent) return NodeFilter.FILTER_REJECT;
          const tag = parent.tagName;
          if (tag === "SCRIPT" || tag === "STYLE" || tag === "NOSCRIPT") {
            return NodeFilter.FILTER_REJECT;
          }
          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );

    while (walker.nextNode()) {
      const node = walker.currentNode;
      const container = getGroupContainer(node);
      if (!container) continue;
      if (!groups.has(container)) {
        groups.set(container, { container, text: "", nodes: [] });
      }
      const group = groups.get(container);
      const start = group.text.length;
      const text = node.nodeValue;
      group.text += text;
      group.nodes.push({ node, start, text });
    }

    return Array.from(groups.values());
  }

  function extractCandidates(groups) {
    const nameCounts = new Map();
    const nameRegex = /[\u4e00-\u9fff]{2,4}/g;

    groups.forEach((group) => {
      let match;
      while ((match = nameRegex.exec(group.text))) {
        const name = match[0];
        nameCounts.set(name, (nameCounts.get(name) || 0) + 1);
      }
    });

    return nameCounts;
  }

  function buildIndex(nameCounts) {
    const items = [];
    nameCounts.forEach((count, name) => {
      const pinyinArray = window.pinyinPro
        ? window.pinyinPro.pinyin(name, { toneType: "none", type: "array" })
        : [];
      const full = pinyinArray.join("");
      const spaced = pinyinArray.join(" ");
      const initials = pinyinArray.map((p) => p[0] || "").join("");
      const spacedInitials = pinyinArray.map((p) => p[0] || "").join(" ");

      const rawKeys = [full, spaced, initials, spacedInitials].filter(Boolean);
      const keySet = new Set();
      rawKeys.forEach((key) => {
        expandUmlaut(key).forEach((item) => keySet.add(item.toLowerCase()));
      });

      items.push({
        name,
        count,
        pinyin: spaced,
        keys: Array.from(keySet)
      });
    });

    return items;
  }

  function levenshtein(a, b) {
    if (a === b) return 0;
    const alen = a.length;
    const blen = b.length;
    if (alen === 0) return blen;
    if (blen === 0) return alen;
    const dp = Array.from({ length: alen + 1 }, () => new Array(blen + 1));
    for (let i = 0; i <= alen; i++) dp[i][0] = i;
    for (let j = 0; j <= blen; j++) dp[0][j] = j;
    for (let i = 1; i <= alen; i++) {
      for (let j = 1; j <= blen; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,
          dp[i][j - 1] + 1,
          dp[i - 1][j - 1] + cost
        );
      }
    }
    return dp[alen][blen];
  }

  function scoreKey(query, key) {
    if (!query || !key) return 0;
    if (key === query) return 100;
    if (key.startsWith(query)) return 90 + (query.length / key.length) * 10;
    if (key.includes(query)) return 70 + (query.length / key.length) * 10;
    const dist = levenshtein(query, key);
    const maxLen = Math.max(query.length, key.length);
    const similarity = 1 - dist / maxLen;
    return similarity * 50;
  }

  function search(query, items) {
    const normalized = normalizeQuery(query);
    if (!normalized) return [];
    const results = [];

    items.forEach((item) => {
      let best = 0;
      item.keys.forEach((key) => {
        const keyNorm = normalizeQuery(key);
        const score = scoreKey(normalized, keyNorm);
        if (score > best) best = score;
      });
      if (normalized.length <= 3) {
        best += Math.min(10, item.count);
      } else {
        best += Math.min(5, item.count);
      }
      if (best > 0) results.push({ item, score: best });
    });

    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_RESULTS);
  }

  function clearHighlights() {
    document.querySelectorAll(`.${HIT_CLASS}`).forEach((el) => {
      const textNode = document.createTextNode(el.textContent);
      el.replaceWith(textNode);
    });
  }

  function locateNodeAt(nodes, index) {
    for (let i = nodes.length - 1; i >= 0; i--) {
      const chunk = nodes[i];
      if (index >= chunk.start) {
        return { node: chunk.node, offset: index - chunk.start };
      }
    }
    return null;
  }

  function findMatchesInGroup(group, name) {
    const matches = [];
    let startIndex = 0;
    while (true) {
      const idx = group.text.indexOf(name, startIndex);
      if (idx === -1) break;
      const startPos = locateNodeAt(group.nodes, idx);
      const endPos = locateNodeAt(group.nodes, idx + name.length);
      if (startPos && endPos) {
        const range = document.createRange();
        range.setStart(startPos.node, startPos.offset);
        range.setEnd(endPos.node, endPos.offset);
        matches.push({ range, startIndex: idx });
      }
      startIndex = idx + name.length;
      if (matches.length >= MAX_HIGHLIGHTS) break;
    }
    return matches;
  }

  function highlightName(name) {
    clearHighlights();
    const groups = buildGroups();
    const matches = [];
    groups.forEach((group) => {
      matches.push(...findMatchesInGroup(group, name));
    });
    matches
      .sort((a, b) => b.startIndex - a.startIndex)
      .forEach((match) => {
        const span = document.createElement("span");
        span.className = HIT_CLASS;
        try {
          match.range.surroundContents(span);
        } catch {
          // Some complex DOM ranges may fail; skip those.
        }
      });
    const first = matches[0];
    if (first) {
      first.range.startContainer.parentElement?.scrollIntoView({
        behavior: "smooth",
        block: "center"
      });
    }
  }

  function renderResults(query) {
    const box = ensureBox();
    const resultsEl = box.querySelector(`#${ID}-results`);
    resultsEl.innerHTML = "";
    if (!indexCache) return;
    const results = search(query, indexCache.items);
    results.forEach(({ item }) => {
      const row = document.createElement("button");
      row.type = "button";
      row.style.cssText = [
        "text-align:left",
        "border:1px solid rgba(0,0,0,0.08)",
        "background:#fafafa",
        "border-radius:8px",
        "padding:8px 10px",
        "cursor:pointer"
      ].join(";");
      row.innerHTML = `
        <div style="font-size:15px;font-weight:600;">${item.name}</div>
        <div style="font-size:12px;color:rgba(0,0,0,0.6);">${item.pinyin}</div>
      `;
      row.addEventListener("click", () => highlightName(item.name));
      resultsEl.appendChild(row);
    });
  }

  function rebuildIndex(force) {
    if (indexCache && !force) return;
    const box = ensureBox();
    const status = box.querySelector(`#${ID}-status`);
    status.textContent = "正在扫描页面名字候选...";
    ensureStyle();

    setTimeout(() => {
      const started = Date.now();
      const groups = buildGroups();
      const counts = extractCandidates(groups);
      const items = buildIndex(counts);
      const elapsed = Date.now() - started;
      indexCache = { items, count: counts.size, elapsed };
      status.textContent = `已索引 ${counts.size} 个候选名字（${elapsed}ms）`;
    }, 10);
  }

  function bindInput() {
    const box = ensureBox();
    const input = box.querySelector(`#${ID}-input`);
    let timer = null;
    input.addEventListener("input", () => {
      clearTimeout(timer);
      timer = setTimeout(() => renderResults(input.value), 120);
    });
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        const first = box.querySelector(`#${ID}-results button`);
        if (first) first.click();
      }
    });
  }

  window.addEventListener(
    "keydown",
    (e) => {
      const isMac = /Mac|iPhone|iPad|iPod/.test(navigator.platform);
      const ctrlOrCmd = isMac ? e.metaKey : e.ctrlKey;

      if (ctrlOrCmd && e.shiftKey && e.key.toLowerCase() === "f") {
        e.preventDefault();
        openBox();
        bindInput();
      }

      if (e.key === "Escape") {
        const box = document.getElementById(ID);
        if (box) box.remove();
      }
    },
    true
  );
})();
