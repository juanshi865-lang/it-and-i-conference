(function () {
  const STORAGE_KEY = "iti2024_local_papers";
  const body = document.body;
  const navToggle = document.querySelector("[data-nav-toggle]");
  const nav = document.querySelector("[data-nav]");

  if (navToggle && nav) {
    navToggle.addEventListener("click", () => {
      const isOpen = nav.classList.toggle("is-open");
      navToggle.setAttribute("aria-expanded", String(isOpen));
    });
  }

  const path = location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll("[data-nav] a").forEach((link) => {
    const href = link.getAttribute("href");
    if (href === path || (path === "" && href === "index.html")) {
      link.setAttribute("aria-current", "page");
    }
  });

  function readLocalPapers() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    } catch (_error) {
      return [];
    }
  }

  function writeLocalPapers(papers) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(papers, null, 2));
  }

  function getPapers() {
    const source = Array.isArray(window.ITIPapers) ? window.ITIPapers : [];
    const local = readLocalPapers();
    const byId = new Map();

    [...source, ...local].forEach((paper) => {
      if (!paper || !paper.id || !paper.title) return;
      byId.set(paper.id, {
        track: "General",
        status: "Published",
        year: "2024",
        ...paper,
      });
    });

    return [...byId.values()].sort((a, b) => {
      const dateA = a.publicationDate || "";
      const dateB = b.publicationDate || "";
      return dateB.localeCompare(dateA) || a.title.localeCompare(b.title);
    });
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function slugify(value) {
    return String(value || "paper")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "paper";
  }

  function splitList(value) {
    return String(value || "")
      .split(/[,;\n]/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  function normalizeArray(value) {
    if (Array.isArray(value)) return value.filter(Boolean);
    return splitList(value);
  }

  function renderPaperCount() {
    const papers = getPapers();
    document.querySelectorAll("[data-paper-count]").forEach((node) => {
      node.textContent = String(papers.length);
    });
  }

  function paperCard(paper) {
    const authors = Array.isArray(paper.authors) ? paper.authors.join(", ") : paper.authors;
    const keywords = Array.isArray(paper.keywords) ? paper.keywords : splitList(paper.keywords);
    const keywordHtml = keywords.slice(0, 5).map((keyword) => `<span>${escapeHtml(keyword)}</span>`).join("");
    const paperUrl = `paper.html?id=${encodeURIComponent(paper.id)}`;

    return `
      <article class="paper-card">
        <div class="paper-card__meta">
          <span>${escapeHtml(paper.track || "General")}</span>
          <span>${escapeHtml(paper.publicationDate || paper.year || "2024")}</span>
        </div>
        <h3><a href="${paperUrl}">${escapeHtml(paper.title)}</a></h3>
        <p class="authors">${escapeHtml(authors || "Author information pending")}</p>
        <p>${escapeHtml(paper.abstract || "Abstract pending editorial publication.")}</p>
        <div class="keyword-row">${keywordHtml}</div>
        <div class="paper-actions">
          <a class="button button--ghost" href="${paperUrl}">Read Article</a>
        </div>
      </article>
    `;
  }

  function renderProceedings() {
    const container = document.querySelector("[data-proceedings]");
    if (!container) return;

    const searchInput = document.querySelector("[data-paper-search]");
    const trackSelect = document.querySelector("[data-paper-track]");

    function draw() {
      const papers = getPapers();
      const query = (searchInput?.value || "").trim().toLowerCase();
      const track = trackSelect?.value || "";
      const filtered = papers.filter((paper) => {
        const haystack = [
          paper.title,
          normalizeArray(paper.authors).join(" "),
          paper.abstract,
          paper.track,
          paper.secondaryTrack,
          paper.proceedings,
          paper.sourceBasis,
          normalizeArray(paper.keywords).join(" "),
          Array.isArray(paper.sections) ? paper.sections.map((section) => `${section.heading} ${normalizeArray(section.body).join(" ")}`).join(" ") : "",
        ].join(" ").toLowerCase();
        const matchesQuery = !query || haystack.includes(query);
        const matchesTrack = !track || paper.track === track;
        return matchesQuery && matchesTrack;
      });

      if (!papers.length) {
        container.innerHTML = `
          <div class="empty-state">
            <p class="eyebrow">Digital Proceedings</p>
            <h2>No papers published yet</h2>
            <p>Accepted manuscripts can be added through the Publication Desk and then appear here as citable article records.</p>
            <a class="button" href="publisher.html">Open Publication Desk</a>
          </div>
        `;
        return;
      }

      if (!filtered.length) {
        container.innerHTML = `
          <div class="empty-state">
            <p class="eyebrow">Search Results</p>
            <h2>No matching papers</h2>
            <p>Try another keyword or track filter.</p>
          </div>
        `;
        return;
      }

      container.innerHTML = filtered.map(paperCard).join("");
    }

    const tracks = [...new Set(getPapers().map((paper) => paper.track).filter(Boolean))].sort();
    if (trackSelect && tracks.length) {
      trackSelect.innerHTML = `<option value="">All tracks</option>` + tracks.map((track) => `<option>${escapeHtml(track)}</option>`).join("");
    }

    searchInput?.addEventListener("input", draw);
    trackSelect?.addEventListener("change", draw);
    draw();
  }

  function renderPaperDetail() {
    const detail = document.querySelector("[data-paper-detail]");
    if (!detail) return;

    const id = new URLSearchParams(location.search).get("id");
    const paper = getPapers().find((item) => item.id === id);

    if (!paper) {
      detail.innerHTML = `
        <div class="empty-state">
          <p class="eyebrow">Paper Record</p>
          <h1>Paper not found</h1>
          <p>This record is not available in the current proceedings data.</p>
          <a class="button" href="proceedings.html">Back to Proceedings</a>
        </div>
      `;
      return;
    }

    const authors = normalizeArray(paper.authors);
    const affiliations = normalizeArray(paper.affiliations);
    const keywords = normalizeArray(paper.keywords);
    const sections = Array.isArray(paper.sections) ? paper.sections : [];
    const citation = paper.citation || `${authors.join(", ")}. "${paper.title}." IT&I 2024 - XI International Scientific Conference "Information Technology and Implementation", ${paper.year || "2024"}.`;
    const metaItems = [
      ["Status", paper.status || "Published"],
      ["Track", paper.track || "General"],
      ["Secondary Track", paper.secondaryTrack],
      ["Date", paper.publicationDate || paper.year || "2024"],
      ["Proceedings", paper.proceedings],
      ["Article Type", paper.articleType],
    ].filter(([, value]) => value);
    const metaHtml = metaItems.map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`).join("");
    const fullTextHtml = sections.map((section) => `
      <section class="article-section">
        <h2>${escapeHtml(section.heading)}</h2>
        ${normalizeArray(section.body).map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join("")}
      </section>
    `).join("");

    detail.innerHTML = `
      <div class="paper-detail__layout">
        <aside class="paper-detail__aside">
          <a class="text-link" href="proceedings.html">Back to Proceedings</a>
          <dl>${metaHtml}</dl>
          ${paper.fullTextUrl ? `<a class="button" href="${escapeHtml(paper.fullTextUrl)}" target="_blank" rel="noreferrer">Open Web Article</a>` : ""}
        </aside>
        <article class="paper-detail__main">
          <p class="eyebrow">${escapeHtml(paper.track || "General")}</p>
          <h1>${escapeHtml(paper.title)}</h1>
          <p class="authors">${authors.map(escapeHtml).join(", ")}</p>
          ${affiliations.length ? `<p class="affiliations">${affiliations.map(escapeHtml).join("; ")}</p>` : ""}
          ${paper.sourceBasis ? `<div class="source-note"><strong>Research basis:</strong> ${escapeHtml(paper.sourceBasis)}</div>` : ""}
          <h2>Abstract</h2>
          <p>${escapeHtml(paper.abstract || "Abstract pending editorial publication.")}</p>
          <h2>Keywords</h2>
          <div class="keyword-row">${keywords.map((keyword) => `<span>${escapeHtml(keyword)}</span>`).join("")}</div>
          <h2>Citation</h2>
          <p class="citation">${escapeHtml(citation)}</p>
          ${fullTextHtml ? `<h2>Full Article Text</h2>${fullTextHtml}` : ""}
        </article>
      </div>
    `;
  }

  function bindSubmissionForm() {
    const form = document.querySelector("[data-submission-form]");
    if (!form) return;
    const output = document.querySelector("[data-submission-output]");

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const data = new FormData(form);
      const email = String(data.get("editorialEmail") || "").trim();
      const title = data.get("title") || "";
      const authors = data.get("authors") || "";
      const track = data.get("track") || "";
      const abstract = data.get("abstract") || "";
      const bodyText = [
        "IT&I 2024 manuscript submission",
        "",
        `Title: ${title}`,
        `Authors: ${authors}`,
        `Track: ${track}`,
        "",
        "Abstract:",
        abstract,
      ].join("\n");
      const href = `mailto:${encodeURI(email)}?subject=${encodeURIComponent(`IT&I 2024 Submission: ${title}`)}&body=${encodeURIComponent(bodyText)}`;

      if (output) {
        output.innerHTML = `
          <div class="notice">
            <p>Submission draft prepared for ${escapeHtml(email || "the editorial office")}.</p>
            <a class="button" href="${href}">Open Email Draft</a>
          </div>
        `;
      }
    });
  }

  function bindPublisher() {
    const form = document.querySelector("[data-publisher-form]");
    if (!form) return;
    const list = document.querySelector("[data-local-paper-list]");
    const exportButton = document.querySelector("[data-export-papers]");
    const clearButton = document.querySelector("[data-clear-papers]");

    function drawLocalList() {
      const local = readLocalPapers();
      if (!list) return;
      if (!local.length) {
        list.innerHTML = `<p class="muted">No local publication records yet.</p>`;
        return;
      }
      list.innerHTML = local.map((paper) => `
        <article class="mini-record">
          <strong>${escapeHtml(paper.title)}</strong>
          <span>${escapeHtml((paper.authors || []).join(", "))}</span>
        </article>
      `).join("");
    }

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const data = new FormData(form);
      const title = String(data.get("title") || "").trim();
      if (!title) return;

      const paper = {
        id: `${slugify(title)}-${Date.now().toString(36)}`,
        title,
        authors: splitList(data.get("authors")),
        affiliations: splitList(data.get("affiliations")),
        track: String(data.get("track") || "General"),
        abstract: String(data.get("abstract") || "").trim(),
        keywords: splitList(data.get("keywords")),
        fullTextUrl: String(data.get("fullTextUrl") || "").trim(),
        year: String(data.get("year") || "2024"),
        publicationDate: String(data.get("publicationDate") || "").trim(),
        status: "Published",
      };

      const local = readLocalPapers();
      local.push(paper);
      writeLocalPapers(local);
      form.reset();
      drawLocalList();
      renderPaperCount();
      body.classList.add("publication-saved");
      setTimeout(() => body.classList.remove("publication-saved"), 900);
    });

    exportButton?.addEventListener("click", () => {
      const all = getPapers();
      const content = `window.ITIPapers = ${JSON.stringify(all, null, 2)};\n`;
      const blob = new Blob([content], { type: "text/javascript" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "papers.js";
      anchor.click();
      URL.revokeObjectURL(url);
    });

    clearButton?.addEventListener("click", () => {
      if (!confirm("Clear local publication records?")) return;
      writeLocalPapers([]);
      drawLocalList();
      renderPaperCount();
    });

    drawLocalList();
  }

  renderPaperCount();
  renderProceedings();
  renderPaperDetail();
  bindSubmissionForm();
  bindPublisher();
})();
