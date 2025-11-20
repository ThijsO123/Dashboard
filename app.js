"use strict";

    const MS_PER_DAY = 86400000;

    // --- Time / week display ---------------------------------------------
    function computeIsoWeek(date) {
      const tmp = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
      const dayNum = tmp.getUTCDay() || 7; // 1..7 (ma=1)
      tmp.setUTCDate(tmp.getUTCDate() + 4 - dayNum);
      const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
      const weekNo = Math.ceil(((tmp - yearStart) / 86400000 + 1) / 7);
      return weekNo;
    }

    function updateTimeHeader() {
      const now = new Date();
      const week = computeIsoWeek(now);
      const dayIndex = ((now.getDay() + 6) % 7) + 1; // maandag = 1
      const weekDisplay = document.getElementById("weekDisplay");
      weekDisplay.innerHTML =
        "Week " + week + '<span class="small-dot">.</span>' + dayIndex;

      const dateOptions = {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      };
      const dateStr = now
        .toLocaleDateString("nl-NL", dateOptions)
        .replace(/^./, (c) => c.toLowerCase());
      document.getElementById("dateDisplay").textContent = dateStr;
    }

    updateTimeHeader();

    // --- Helpers ----------------------------------------------------------
    function escapeHtml(str) {
      return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
    }

    function isSameDay(d1, d2) {
      return d1.getFullYear() === d2.getFullYear() &&
             d1.getMonth() === d2.getMonth() &&
             d1.getDate() === d2.getDate();
    }

    function isWithinLastDays(d, days) {
      const now = new Date();
      const diff = now - d;
      return diff >= 0 && diff <= days * MS_PER_DAY;
    }

    function normalizeUrl(url) {
      if (!url) return "";
      if (/^https?:\/\//i.test(url)) return url;
      return "https://" + url;
    }

    function formatShortDate(d) {
      return d.toLocaleDateString("nl-NL", { day: "2-digit", month: "2-digit" });
    }

    function startOfDay(date) {
      const d = new Date(date);
      d.setHours(0, 0, 0, 0);
      return d;
    }

    // --- LINKS DATA -------------------------------------------------------
    const LINK_STORAGE_KEY = "workLinksDataV1";
    const LAST_MODIFIED_KEY = "workLinksLastModified";
    const PINNED_CATEGORIES = ["Inbox", "Today"];

    let links = [];
    let lastModified = null;
    let currentCategoriesCount = 0;
    let categoryPulseName = null;

    function loadLinksFromStorage() {
      try {
        const raw = localStorage.getItem(LINK_STORAGE_KEY);
        if (!raw) return;
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          links = parsed.map((item) => ({
            ...item,
            project: normalizeProject(item.project),
          }));
        }
      } catch (err) {
        console.error("Kon links niet laden:", err);
      }
    }

    function saveLinksToStorage() {
      try {
        localStorage.setItem(LINK_STORAGE_KEY, JSON.stringify(links));
      } catch (err) {
        console.error("Kon links niet opslaan:", err);
      }
    }

    function loadLastModified() {
      try {
        const raw = localStorage.getItem(LAST_MODIFIED_KEY);
        if (raw) {
          const d = new Date(raw);
          if (!isNaN(d)) lastModified = d;
        }
      } catch {
        // ignore
      }
    }

    function touchLastModified() {
      lastModified = new Date();
      try {
        localStorage.setItem(LAST_MODIFIED_KEY, lastModified.toISOString());
      } catch {
        // ignore
      }
      updateFooterMeta();
    }

    function getAllCategories() {
      const set = new Set();
      links.forEach((l) => {
        const c = (l.category || "Algemeen").trim() || "Algemeen";
        set.add(c);
      });
      return Array.from(set).sort((a, b) =>
        a.localeCompare(b, "nl", { sensitivity: "base" })
      );
    }

    function normalizeProject(value) {
      return String(value || "").trim();
    }

    function getAllProjects() {
      const set = new Set();
      links.forEach((l) => {
        const p = normalizeProject(l.project);
        if (p) set.add(p);
      });
      tasks.forEach((t) => {
        const p = normalizeProject(t.project);
        if (p) set.add(p);
      });
      return Array.from(set).sort((a, b) =>
        a.localeCompare(b, "nl", { sensitivity: "base" })
      );
    }

    function matchesProject(item) {
      if (!currentProjectFilter) return true;
      const p = normalizeProject(item && item.project);
      if (!p) return false;
      return p.toLowerCase() === currentProjectFilter.toLowerCase();
    }

    function updateProjectSuggestions() {
      if (!projectSuggestions) return;
      projectSuggestions.innerHTML = "";
      getAllProjects().forEach((p) => {
        const opt = document.createElement("option");
        opt.value = p;
        projectSuggestions.appendChild(opt);
      });
    }

    function updateProjectFilterOptions() {
      if (!projectFilterSelect) return;
      const prev = currentProjectFilter;
      projectFilterSelect.innerHTML = "";
      const defaultOpt = document.createElement("option");
      defaultOpt.value = "";
      defaultOpt.textContent = "Alle projecten";
      projectFilterSelect.appendChild(defaultOpt);

      getAllProjects().forEach((p) => {
        const opt = document.createElement("option");
        opt.value = p;
        opt.textContent = p;
        projectFilterSelect.appendChild(opt);
      });

      projectFilterSelect.value = prev;
      if (projectFilterSelect.value !== prev) {
        currentProjectFilter = "";
        projectFilterSelect.value = "";
      }
    }

    function updateCategorySuggestions() {
      const datalist = document.getElementById("categorySuggestions");
      if (!datalist) return;
      datalist.innerHTML = "";
      getAllCategories().forEach((cat) => {
        const opt = document.createElement("option");
        opt.value = cat;
        datalist.appendChild(opt);
      });
    }

    function updateFooterMeta() {
      const categoriesCountEl = document.getElementById("categoriesCount");
      const lastModifiedDisplay = document.getElementById("lastModifiedDisplay");
      if (categoriesCountEl) {
        categoriesCountEl.textContent = String(currentCategoriesCount);
      }
      if (lastModifiedDisplay) {
        if (lastModified instanceof Date && !isNaN(lastModified)) {
          const opts = {
            day: "2-digit",
            month: "2-digit",
            year: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
          };
          lastModifiedDisplay.textContent = lastModified.toLocaleString("nl-NL", opts);
        } else {
          lastModifiedDisplay.textContent = "-";
        }
      }
    }

    // --- LINKS Rendering --------------------------------------------------
    const emptyStateEl = document.getElementById("emptyState");
    const categoriesRoot = document.getElementById("categoriesRoot");
    const linksCount = document.getElementById("linksCount");
    const searchInput = document.getElementById("searchInput");
    const projectFilterSelect = document.getElementById("projectFilterSelect");
    const projectSuggestions = document.getElementById("projectSuggestions");

    let currentQuickFilter = "all"; // all | inbox | today | week | category
    let currentCategoryFilterName = "";
    let currentProjectFilter = "";

    function renderLinks() {
      const query = searchInput.value.trim().toLowerCase();

      const allCatSet = new Set();
      links.forEach((l) => {
        const name = (l.category || "Algemeen").trim() || "Algemeen";
        allCatSet.add(name);
      });
      currentCategoriesCount = allCatSet.size;

      const filtered = links.filter((link) => {
        const catRaw = (link.category || "").trim();
        const cat = catRaw || "Algemeen";
        const projectName = normalizeProject(link.project);

        let matchesSearch =
          !query ||
          (link.title || "").toLowerCase().includes(query) ||
          (link.url || "").toLowerCase().includes(query) ||
          (link.category || "").toLowerCase().includes(query) ||
          projectName.toLowerCase().includes(query);

        let matchesQuick = true;
        const created = link.createdAt ? new Date(link.createdAt) : null;

        switch (currentQuickFilter) {
          case "inbox":
            matchesQuick = cat === "Inbox";
            break;
          case "today":
            matchesQuick = created && isSameDay(created, new Date());
            break;
          case "week":
            matchesQuick = created && isWithinLastDays(created, 7);
            break;
          case "category":
            matchesQuick =
              catRaw.toLowerCase() === currentCategoryFilterName.toLowerCase();
            break;
          default:
            matchesQuick = true;
        }

        const matchesProjectFilter = matchesProject(link);

        return matchesSearch && matchesQuick && matchesProjectFilter;
      });

      categoriesRoot.innerHTML = "";

      if (filtered.length === 0) {
        emptyStateEl.style.display = "block";
        categoriesRoot.style.display = "none";
      } else {
        emptyStateEl.style.display = "none";
        categoriesRoot.style.display = "block";

        const groupMap = new Map();
        filtered.forEach((link) => {
          const key = (link.category && link.category.trim()) || "Algemeen";
          if (!groupMap.has(key)) groupMap.set(key, []);
          groupMap.get(key).push(link);
        });

        const categoryNames = Array.from(groupMap.keys()).sort((a, b) => {
          const aPinned = PINNED_CATEGORIES.includes(a);
          const bPinned = PINNED_CATEGORIES.includes(b);
          if (aPinned && !bPinned) return -1;
          if (bPinned && !aPinned) return 1;
          return a.localeCompare(b, "nl", { sensitivity: "base" });
        });

        categoryNames.forEach((catName) => {
          const block = document.createElement("section");
          block.className = "category-block";
          if (categoryPulseName && catName === categoryPulseName) {
            block.classList.add("category-pulse");
          }

          const h = document.createElement("h2");
          h.className = "category-title";
          h.textContent = catName;
          block.appendChild(h);

          const container = document.createElement("div");
          container.className = "links-container";

          const items = groupMap.get(catName);
          items.forEach((link) => {
            container.appendChild(renderLinkCard(link));
          });

          block.appendChild(container);
          categoriesRoot.appendChild(block);
        });
      }

      categoryPulseName = null;

      linksCount.textContent = String(links.length);
      updateCategorySuggestions();
      updateProjectFilterOptions();
      updateProjectSuggestions();
      updateFooterMeta();
    }

    let dragSourceId = null;

    function clearDragClasses() {
      document
        .querySelectorAll(".link-card.dragging, .link-card.drag-over")
        .forEach((el) => {
          el.classList.remove("dragging", "drag-over");
        });
    }

    function renderLinkCard(link) {
      const card = document.createElement("div");
      card.className = "link-card";
      card.setAttribute("draggable", "true");
      card.dataset.id = link.id;

      const left = document.createElement("div");
      left.className = "link-left";

      const dragBtn = document.createElement("button");
      dragBtn.type = "button";
      dragBtn.className = "icon-button drag-handle";
      dragBtn.title = "Verslepen";
      dragBtn.textContent = "⋮⋮";

      const main = document.createElement("div");
      main.className = "link-main";

      const titleEl = document.createElement("div");
      titleEl.className = "link-title";
      titleEl.textContent = link.title || "Zonder titel";

      const urlRow = document.createElement("div");
      urlRow.className = "link-url-row";

      const urlEl = document.createElement("a");
      urlEl.className = "link-url";
      urlEl.href = link.url;
      urlEl.target = "_blank";
      urlEl.rel = "noopener noreferrer";
      urlEl.textContent = link.url;

      const extIcon = document.createElement("span");
      extIcon.style.fontSize = "11px";
      extIcon.textContent = "↗";

      urlRow.appendChild(urlEl);
      urlRow.appendChild(extIcon);

      main.appendChild(titleEl);
      main.appendChild(urlRow);

      const metaRow = document.createElement("div");
      metaRow.className = "link-meta";

      const catPill = document.createElement("span");
      catPill.className = "link-pill category";
      catPill.textContent = (link.category || "Algemeen").trim() || "Algemeen";
      metaRow.appendChild(catPill);

      const projectName = normalizeProject(link.project);
      if (projectName) {
        const projectPill = document.createElement("span");
        projectPill.className = "link-pill project";
        projectPill.textContent = projectName;
        metaRow.appendChild(projectPill);
      }

      if (metaRow.childNodes.length) {
        main.appendChild(metaRow);
      }

      left.appendChild(dragBtn);
      left.appendChild(main);

      const actions = document.createElement("div");
      actions.className = "link-actions";

      const upBtn = document.createElement("button");
      upBtn.type = "button";
      upBtn.className = "icon-button";
      upBtn.title = "Omhoog binnen categorie";
      upBtn.textContent = "↑";
      upBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        handleMoveUp(link.id);
      });

      const downBtn = document.createElement("button");
      downBtn.type = "button";
      downBtn.className = "icon-button";
      downBtn.title = "Omlaag binnen categorie";
      downBtn.textContent = "↓";
      downBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        handleMoveDown(link.id);
      });

      const editBtn = document.createElement("button");
      editBtn.type = "button";
      editBtn.className = "icon-button";
      editBtn.title = "Bewerken";
      editBtn.textContent = "✏";
      editBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        handleEdit(link);
      });

      const delBtn = document.createElement("button");
      delBtn.type = "button";
      delBtn.className = "icon-button delete";
      delBtn.title = "Verwijderen";
      delBtn.textContent = "🗑";
      delBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        handleDelete(link.id);
      });

      actions.appendChild(upBtn);
      actions.appendChild(downBtn);
      actions.appendChild(editBtn);
      actions.appendChild(delBtn);

      card.appendChild(left);
      card.appendChild(actions);

      card.addEventListener("dragstart", (e) => {
        dragSourceId = link.id;
        card.classList.add("dragging");
        if (e.dataTransfer) e.dataTransfer.effectAllowed = "move";
      });

      card.addEventListener("dragend", () => {
        clearDragClasses();
        dragSourceId = null;
      });

      card.addEventListener("dragover", (e) => {
        if (!dragSourceId || dragSourceId === link.id) return;
        e.preventDefault();
        card.classList.add("drag-over");
        if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
      });

      card.addEventListener("dragleave", () => {
        card.classList.remove("drag-over");
      });

      card.addEventListener("drop", (e) => {
        e.preventDefault();
        card.classList.remove("drag-over");
        if (!dragSourceId || dragSourceId === link.id) return;
        handleDrop(link.id);
      });

      return card;
    }

    function handleDrop(destId) {
      const sourceIndex = links.findIndex((l) => l.id === dragSourceId);
      const destIndex = links.findIndex((l) => l.id === destId);
      if (sourceIndex === -1 || destIndex === -1) return;

      const source = links[sourceIndex];
      const dest = links[destIndex];

      source.category = dest.category;

      links.splice(sourceIndex, 1);
      let insertIndex = destIndex;
      if (sourceIndex < destIndex) insertIndex--;
      links.splice(insertIndex, 0, source);

      saveLinksToStorage();
      touchLastModified();
      renderLinks();
    }

    function moveLinkWithinCategory(id, direction) {
      const index = links.findIndex((l) => l.id === id);
      if (index === -1) return;
      const cat = (links[index].category || "").trim();
      const step = direction === "up" ? -1 : 1;
      let j = index + step;

      while (j >= 0 && j < links.length) {
        const otherCat = (links[j].category || "").trim();
        if (otherCat === cat) {
          const tmp = links[index];
          links[index] = links[j];
          links[j] = tmp;
          break;
        }
        j += step;
      }
    }

    function handleMoveUp(id) {
      moveLinkWithinCategory(id, "up");
      saveLinksToStorage();
      touchLastModified();
      renderLinks();
    }

    function handleMoveDown(id) {
      moveLinkWithinCategory(id, "down");
      saveLinksToStorage();
      touchLastModified();
      renderLinks();
    }

    function handleDelete(id) {
      const link = links.find((l) => l.id === id);
      const title = link ? link.title : "";
      if (!confirm(`Weet je zeker dat je deze link wilt verwijderen?\n\n${title}`)) {
        return;
      }
      links = links.filter((l) => l.id !== id);
      saveLinksToStorage();
      touchLastModified();
      renderLinks();
    }

    function handleEdit(link) {
      const newTitle = prompt("Titel aanpassen:", link.title || "");
      if (newTitle === null) return;

      const newUrl = prompt("URL aanpassen:", link.url || "");
      if (newUrl === null) return;

      const newCategory = prompt(
        "Categorie aanpassen (bestaand of nieuw, leeg = Algemeen):",
        link.category || ""
      );
      if (newCategory === null) return;

      const newProject = prompt(
        "Project aanpassen (optioneel):",
        link.project || ""
      );
      if (newProject === null) return;

      const t = newTitle.trim();
      const u = newUrl.trim();
      const c = newCategory.trim();
      const p = normalizeProject(newProject);

      if (t) link.title = t;
      if (u) link.url = normalizeUrl(u);
      link.category = c;
      link.project = p;

      saveLinksToStorage();
      touchLastModified();
      categoryPulseName = c || "Algemeen";
      renderLinks();
    }

    const linkForm = document.getElementById("linkForm");
    const titleInput = document.getElementById("titleInput");
    const urlInput = document.getElementById("urlInput");
    const categoryInput = document.getElementById("categoryInput");
    const projectInput = document.getElementById("projectInput");
    const fabAdd = document.getElementById("fabAdd");

    linkForm.addEventListener("submit", (ev) => {
      ev.preventDefault();

      const title = titleInput.value.trim();
      const url = urlInput.value.trim();
      let category = categoryInput.value.trim();
      const projectName = normalizeProject(projectInput.value);

      if (!title || !url) return;

      if (!category) category = "Inbox";

      const normalizedUrl = normalizeUrl(url);

      const newLink = {
        id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
        title,
        url: normalizedUrl,
        category,
        createdAt: new Date().toISOString(),
        project: projectName,
      };

      links.push(newLink);
      saveLinksToStorage();
      touchLastModified();
      categoryPulseName = category || "Algemeen";
      renderLinks();

      linkForm.reset();
      titleInput.focus();
    });

    searchInput.addEventListener("input", () => {
      if (currentQuickFilter === "category") {
        currentQuickFilter = "all";
        currentCategoryFilterName = "";
      }
      renderLinks();
    });

    fabAdd.addEventListener("click", () => {
      const section = document.getElementById("newLinkSection");
      if (section && section.scrollIntoView) {
        section.scrollIntoView({ behavior: "smooth", block: "start" });
      }
      setTimeout(() => { titleInput.focus(); }, 250);
    });

    const quickFilterButtons = document.querySelectorAll(".chip[data-filter]");

    function setQuickFilter(filter) {
      currentQuickFilter = filter;
      if (filter === "all") {
        currentCategoryFilterName = "";
      } else if (filter === "inbox") {
        currentCategoryFilterName = "Inbox";
      }
      quickFilterButtons.forEach((btn) => {
        btn.classList.toggle("active", btn.dataset.filter === filter);
      });
      renderLinks();
    }

    quickFilterButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        const filter = btn.dataset.filter || "all";
        setQuickFilter(filter);
      });
    });

    if (projectFilterSelect) {
      projectFilterSelect.addEventListener("change", () => {
        currentProjectFilter = projectFilterSelect.value.trim();
        renderLinks();
        renderTasks();
      });
    }

    // --- TASKLIST DATA ----------------------------------------------------
    const TASKS_STORAGE_KEY = "workTasksDataV1";

    /**
     * @typedef {{
     *  id: string,
     *  title: string,
     *  done: boolean,
     *  createdAt: string,
     *  startDate: string | null,
     *  endDate: string | null,
     *  dueDate: string | null,
     *  priority: "high"|"normal"|"low"|null,
     *  linkUrl: string | null,
     *  project: string | null
     * }} TaskItem
     */

    /** @type {TaskItem[]} */
    let tasks = [];

    const taskForm = document.getElementById("taskForm");
    const taskTitleInput = document.getElementById("taskTitleInput");
    const taskStartInput = document.getElementById("taskStartInput");
    const taskEndInput = document.getElementById("taskEndInput");
    const taskPriorityInput = document.getElementById("taskPriorityInput");
    const taskProjectInput = document.getElementById("taskProjectInput");
    const taskLinkInput = document.getElementById("taskLinkInput");
    const taskListOpen = document.getElementById("taskListOpen");
    const taskListDone = document.getElementById("taskListDone");
    const taskCountOpen = document.getElementById("taskCountOpen");
    const taskCountDone = document.getElementById("taskCountDone");
    const ganttGrid = document.getElementById("ganttGrid");
    const ganttBars = document.getElementById("ganttBars");
    const ganttTrack = document.getElementById("ganttTrack");
    const ganttEmpty = document.getElementById("ganttEmpty");
    const ganttRangeLabel = document.getElementById("ganttRangeLabel");

    const GANTT_WINDOW_DAYS = 21;
    const GANTT_DAY_WIDTH = 70;

    function loadTasksFromStorage() {
      try {
        const raw = localStorage.getItem(TASKS_STORAGE_KEY);
        if (!raw) return;
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          tasks = parsed.map((t) => ({
            id: t.id || String(Date.now() + Math.random()),
            title: String(t.title || "").trim() || "Zonder titel",
            done: !!t.done,
            createdAt: t.createdAt || new Date().toISOString(),
            startDate: t.startDate || null,
            endDate: t.endDate || t.dueDate || null,
            dueDate: t.dueDate || t.endDate || null,
            priority: t.priority || null,
            linkUrl: t.linkUrl || null,
            project: normalizeProject(t.project) || null,
          }));
        }
      } catch (e) {
        console.error("Kon tasks niet laden:", e);
      }
    }

    function saveTasksToStorage() {
      try {
        localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(tasks));
      } catch (e) {
        console.error("Kon tasks niet opslaan:", e);
      }
    }

    function renderTasks() {
      taskListOpen.innerHTML = "";
      taskListDone.innerHTML = "";

      const toDate = (value) => {
        if (!value) return null;
        const d = new Date(value + "T00:00:00");
        return isNaN(d) ? null : d;
      };

      const openTasks = tasks.filter((t) => !t.done && matchesProject(t));
      const doneTasks = tasks.filter((t) => t.done && matchesProject(t));

      if (!openTasks.length) {
        const span = document.createElement("div");
        span.className = "task-empty";
        span.textContent = "Geen open taken.";
        taskListOpen.appendChild(span);
      } else {
        openTasks
          .sort((a, b) => {
            const da = toDate(a.endDate || a.dueDate);
            const db = toDate(b.endDate || b.dueDate);
            if (da && db) return da - db;
            if (da) return -1;
            if (db) return 1;
            return 0;
          })
          .forEach((t) => taskListOpen.appendChild(renderTaskCard(t)));
      }

      if (!doneTasks.length) {
        const span = document.createElement("div");
        span.className = "task-empty";
        span.textContent = "Nog niets afgevinkt.";
        taskListDone.appendChild(span);
      } else {
        doneTasks
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
          .forEach((t) => taskListDone.appendChild(renderTaskCard(t)));
      }

      taskCountOpen.textContent = openTasks.length + " open";
      taskCountDone.textContent = doneTasks.length + " gedaan";

      updateProjectFilterOptions();
      updateProjectSuggestions();

      renderGantt();
    }

    function renderGantt() {
      if (
        !ganttGrid ||
        !ganttBars ||
        !ganttTrack ||
        !ganttEmpty ||
        !ganttRangeLabel
      ) {
        return;
      }

      const ganttTasks = tasks.filter(
        (t) => !t.done && matchesProject(t) && (t.endDate || t.dueDate)
      );

      if (!ganttTasks.length) {
        ganttTrack.style.display = "none";
        ganttEmpty.style.display = "block";
        ganttRangeLabel.textContent = currentProjectFilter
          ? "Geen planning voor project '" + currentProjectFilter + "'"
          : "Geen planning beschikbaar";
        return;
      }

      ganttTrack.style.display = "block";
      ganttEmpty.style.display = "none";

      const todayStart = startOfDay(new Date());
      const minStart = new Date(todayStart);
      minStart.setDate(minStart.getDate() - 14);
      let startDate = new Date(todayStart);
      startDate.setDate(startDate.getDate() - 1);

      let earliestStart = null;
      let earliestEnd = null;
      ganttTasks.forEach((task) => {
        const end = startOfDay(new Date(task.endDate || task.dueDate));
        const start = startOfDay(
          new Date(task.startDate || task.createdAt || task.endDate || task.dueDate)
        );
        if (!isNaN(start) && (!earliestStart || start < earliestStart)) {
          earliestStart = start;
        }
        if (!isNaN(end) && (!earliestEnd || end < earliestEnd)) {
          earliestEnd = end;
        }
      });

      if (earliestStart) {
        const candidate = new Date(earliestStart);
        candidate.setDate(candidate.getDate() - 1);
        if (candidate < startDate) {
          startDate = candidate;
        }
      } else if (earliestEnd) {
        const candidate = new Date(earliestEnd);
        candidate.setDate(candidate.getDate() - 3);
        if (candidate < startDate) startDate = candidate;
      }

      if (startDate < minStart) {
        startDate = minStart;
      }

      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + GANTT_WINDOW_DAYS - 1);

      const labelOpts = { day: "2-digit", month: "2-digit" };
      ganttRangeLabel.textContent =
        "Planning " +
        startDate.toLocaleDateString("nl-NL", labelOpts) +
        " → " +
        endDate.toLocaleDateString("nl-NL", labelOpts) +
        (currentProjectFilter ? " · Project: " + currentProjectFilter : "");

      const totalWidth = GANTT_WINDOW_DAYS * GANTT_DAY_WIDTH;
      ganttGrid.style.width = totalWidth + "px";
      ganttBars.style.width = totalWidth + "px";
      ganttGrid.innerHTML = "";
      ganttBars.innerHTML = "";

      for (let i = 0; i < GANTT_WINDOW_DAYS; i++) {
        const day = new Date(startDate);
        day.setDate(day.getDate() + i);
        const div = document.createElement("div");
        div.className = "gantt-day";
        const weekday = day
          .toLocaleDateString("nl-NL", { weekday: "short" })
          .replace(/\.$/, "");
        const isWeekend = day.getDay() === 0 || day.getDay() === 6;
        const isToday = isSameDay(day, todayStart);
        if (isWeekend) div.classList.add("is-weekend");
        if (isToday) div.classList.add("is-today");
        div.title = formatShortDate(day) + " (" + weekday.toLowerCase() + ")";
        div.innerHTML =
          "<strong>" +
          formatShortDate(day) +
          "</strong><span class=\"gantt-weekday\">" +
          weekday.toLowerCase() +
          "</span>";
        ganttGrid.appendChild(div);
      }

      const rangeStartMs = startDate.getTime();
      const rangeEndMs = endDate.getTime() + MS_PER_DAY;
      const minWidthPx = Math.max(24, GANTT_DAY_WIDTH * 0.6);

      const sortedTasks = ganttTasks.slice().sort((a, b) => {
        return new Date(a.endDate || a.dueDate) - new Date(b.endDate || b.dueDate);
      });

      sortedTasks.forEach((task, index) => {
        const end = startOfDay(new Date(task.endDate || task.dueDate));
        if (isNaN(end)) return;
        const start = startOfDay(
          new Date(task.startDate || task.createdAt || task.endDate || task.dueDate)
        );

        const startMs = !isNaN(start) ? start.getTime() : todayStart.getTime();
        let barStartMs = Math.max(rangeStartMs, startMs);
        let barEndMs = Math.min(rangeEndMs, end.getTime() + MS_PER_DAY);

        if (barEndMs <= rangeStartMs) {
          return;
        }

        if (barEndMs <= barStartMs) {
          barEndMs = barStartMs + MS_PER_DAY * 0.4;
        }

        const leftPx = ((barStartMs - rangeStartMs) / MS_PER_DAY) * GANTT_DAY_WIDTH;
        const widthPx = Math.max(
          minWidthPx,
          ((barEndMs - barStartMs) / MS_PER_DAY) * GANTT_DAY_WIDTH
        );

        const bar = document.createElement("div");
        bar.className =
          "gantt-bar priority-" + (task.priority || "normal");
        bar.style.left = leftPx + "px";
        bar.style.top = index * 38 + "px";
        bar.style.width = widthPx + "px";
        bar.title =
          task.title +
          " — " +
          formatShortDate(start) +
          " → " +
          formatShortDate(end);
        bar.innerHTML =
          '<span class="gantt-title">' +
          escapeHtml(task.title) +
          '</span><span class="gantt-date">' +
          formatShortDate(start) +
          " → " +
          formatShortDate(end) +
          "</span>";
        ganttBars.appendChild(bar);
      });

      const height = sortedTasks.length * 38 + 20;
      ganttBars.style.height = height + "px";
      const inner = ganttTrack.querySelector(".gantt-track-inner");
      if (inner) {
        inner.style.minHeight = Math.max(160, height + 80) + "px";

        let todayLine = inner.querySelector(".gantt-today-line");
        if (!todayLine) {
          todayLine = document.createElement("div");
          todayLine.className = "gantt-today-line";
          inner.appendChild(todayLine);
        }

        const todayMs = todayStart.getTime();
        const inRange = todayMs >= rangeStartMs && todayMs <= rangeEndMs;
        if (inRange) {
          const leftPx = ((todayMs - rangeStartMs) / MS_PER_DAY) * GANTT_DAY_WIDTH;
          todayLine.style.left = leftPx + "px";
          todayLine.style.display = "block";
          todayLine.title = "Vandaag";
        } else {
          todayLine.style.display = "none";
        }
      }
    }

    function renderTaskCard(task) {
      const card = document.createElement("div");
      card.className = "task-card";

      const main = document.createElement("div");
      main.className = "task-main";

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.className = "task-check";
      checkbox.checked = task.done;
      checkbox.addEventListener("change", () => {
        toggleTaskDone(task.id);
      });

      const textBlock = document.createElement("div");

      const titleEl = document.createElement("div");
      titleEl.className = "task-title";
      if (task.done) titleEl.classList.add("done");
      titleEl.textContent = task.title;

      const metaRow = document.createElement("div");
      metaRow.className = "task-meta-row";

      const startVal = task.startDate || null;
      const endVal = task.endDate || task.dueDate || null;

      if (startVal) {
        const s = new Date(startVal + "T00:00:00");
        if (!isNaN(s)) {
          const startPill = document.createElement("span");
          startPill.className = "task-pill";
          startPill.textContent = "▶ start " + formatShortDate(s);
          metaRow.appendChild(startPill);
        }
      }

      if (endVal) {
        const d = new Date(endVal + "T00:00:00");
        if (!isNaN(d)) {
          const today = new Date();
          const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
          const diffDays = Math.round((d - todayStart) / 86400000);

          const pill = document.createElement("span");
          pill.className = "task-pill task-pill--due";

          if (isSameDay(d, today)) {
            pill.textContent = "🕒 eind vandaag";
          } else if (diffDays === 1) {
            pill.textContent = "🕒 eind morgen";
          } else if (diffDays < 0) {
            pill.textContent = "🕒 te laat (" + formatShortDate(d) + ")";
            pill.classList.add("task-pill--due-overdue");
          } else {
            pill.textContent = "🕒 eind " + formatShortDate(d);
          }
          metaRow.appendChild(pill);
        }
      }

      if (task.priority) {
        const prio = document.createElement("span");
        prio.className = "task-pill";
        if (task.priority === "high") {
          prio.classList.add("task-pill--prio-high");
          prio.textContent = "prio: hoog";
        } else if (task.priority === "normal") {
          prio.classList.add("task-pill--prio-normal");
          prio.textContent = "prio: normaal";
        } else if (task.priority === "low") {
          prio.classList.add("task-pill--prio-low");
          prio.textContent = "prio: laag";
        }
        metaRow.appendChild(prio);
      }

      const projectName = normalizeProject(task.project);
      if (projectName) {
        const projectPill = document.createElement("span");
        projectPill.className = "task-pill task-pill--project";
        projectPill.textContent = projectName;
        metaRow.appendChild(projectPill);
      }

      if (task.linkUrl) {
        const linkPill = document.createElement("a");
        linkPill.href = task.linkUrl;
        linkPill.target = "_blank";
        linkPill.rel = "noopener noreferrer";
        linkPill.className = "task-pill task-pill--link";
        linkPill.textContent = "↗ link";
        metaRow.appendChild(linkPill);
      }

      textBlock.appendChild(titleEl);
      if (metaRow.childNodes.length > 0) textBlock.appendChild(metaRow);

      main.appendChild(checkbox);
      main.appendChild(textBlock);

      const actions = document.createElement("div");
      actions.className = "task-actions";

      const delBtn = document.createElement("button");
      delBtn.type = "button";
      delBtn.className = "icon-button delete";
      delBtn.title = "Taak verwijderen";
      delBtn.textContent = "🗑";
      delBtn.addEventListener("click", () => deleteTask(task.id));

      actions.appendChild(delBtn);

      card.appendChild(main);
      card.appendChild(actions);

      return card;
    }

    function toggleTaskDone(id) {
      const t = tasks.find((task) => task.id === id);
      if (!t) return;
      t.done = !t.done;
      saveTasksToStorage();
      renderTasks();
    }

    function deleteTask(id) {
      const t = tasks.find((task) => task.id === id);
      const title = t ? t.title : "";
      if (!confirm(`Taak verwijderen?\n\n${title}`)) return;
      tasks = tasks.filter((task) => task.id !== id);
      saveTasksToStorage();
      renderTasks();
    }

    if (taskForm) {
      taskForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const title = taskTitleInput.value.trim();
        const start = taskStartInput.value.trim();
        const end = taskEndInput.value.trim();
        const prio = taskPriorityInput.value || "";
        const projectName = normalizeProject(taskProjectInput.value);
        const linkRaw = taskLinkInput.value.trim();

        if (!title) return;

        const newTask = {
          id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
          title,
          done: false,
          createdAt: new Date().toISOString(),
          startDate: start || null,
          endDate: end || null,
          dueDate: end || null,
          priority: prio || null,
          linkUrl: linkRaw ? normalizeUrl(linkRaw) : null,
          project: projectName || null,
        };

        tasks.push(newTask);
        saveTasksToStorage();
        renderTasks();

        taskForm.reset();
        taskTitleInput.focus();
      });
    }

    // --- TERMINAL ---------------------------------------------------------
    const terminalInput = document.getElementById("terminalInput");
    const terminalOutput = document.getElementById("terminalOutput");

    const COMMANDS = [
      // link commands
      "help","search","stats","list","random","clear","cats",
      "open","openr","add","mv","recent","reset","cat",
      // task commands
      "t-help","t-list","t-add","t-done","t-del","t-clear-done"
    ];

    const terminalHistory = [];
    let terminalHistoryIndex = -1;

    function termPrint(lineHtml) {
      const div = document.createElement("div");
      div.className = "terminal-line";
      div.innerHTML = lineHtml;
      terminalOutput.appendChild(div);
      terminalOutput.scrollTop = terminalOutput.scrollHeight;
    }

    function termPrintError(msg) {
      termPrint('<span class="error">Error:</span> ' + escapeHtml(msg));
    }

    // Link commands via terminal
    function handleLinkCommand(name, argStr) {
      switch (name) {
        case "help":
          termPrint("Link-commando's:");
          termPrint("  help              - toon dit overzicht (links)");
          termPrint("  search <term>     - filter links op term");
          termPrint("  stats             - aantal links per categorie");
          termPrint("  list              - toon alle links (titel + categorie)");
          termPrint("  cats              - toon categorieën + aantallen");
          termPrint("  recent [n]        - toon laatste n links (default 5)");
          termPrint("  random            - kies willekeurige link");
          termPrint("  openr             - random link & open in tab");
          termPrint("  open <index>      - open link met index uit 'list'");
          termPrint("  add t|url|cat     - voeg link toe");
          termPrint("  mv <index> <cat>  - verplaats link naar categorie");
          termPrint("  cat <naam>        - filter op categorie");
          termPrint("  clear             - wis terminal output");
          termPrint("  reset YES         - wis ALLE links");
          termPrint("");
          termPrint("Taken-commando's: typ 't-help'.");
          break;

        case "search":
          if (!argStr) return termPrintError("Gebruik: search <term>");
          searchInput.value = argStr;
          currentQuickFilter = "all";
          currentCategoryFilterName = "";
          setQuickFilter("all");
          renderLinks();
          termPrint("Filter gezet op: " + escapeHtml(argStr));
          break;

        case "stats":
          if (!links.length) return termPrint("Geen links opgeslagen.");
          const counts = new Map();
          links.forEach((l) => {
            const c = (l.category || "Algemeen").trim() || "Algemeen";
            counts.set(c, (counts.get(c) || 0) + 1);
          });
          termPrint("Totaal links: " + links.length);
          counts.forEach((value, key) => {
            termPrint("  " + escapeHtml(key) + ": " + value);
          });
          break;

        case "cats": {
          if (!links.length) return termPrint("Geen links opgeslagen.");
          const catsMap = new Map();
          links.forEach((l) => {
            const c = (l.category || "Algemeen").trim() || "Algemeen";
            catsMap.set(c, (catsMap.get(c) || 0) + 1);
          });
          termPrint("Categorieën:");
          Array.from(catsMap.entries())
            .sort((a, b) => a[0].localeCompare(b[0], "nl", { sensitivity: "base" }))
            .forEach(([name, count]) => {
              termPrint("  " + escapeHtml(name) + ": " + count);
            });
          break;
        }

        case "list":
          if (!links.length) return termPrint("Geen links.");
          links.forEach((l, idx) => {
            const cat = (l.category || "Algemeen").trim() || "Algemeen";
            termPrint(
              "[" + idx + "] " +
              escapeHtml(l.title || "Zonder titel") +
              ' <span class="cmd">(' + escapeHtml(cat) + ")</span>"
            );
          });
          break;

        case "recent": {
          if (!links.length) return termPrint("Geen links.");
          let n = 5;
          if (argStr) {
            const parsed = parseInt(argStr, 10);
            if (!isNaN(parsed) && parsed > 0) n = parsed;
          }
          const sorted = [...links].sort((a, b) => {
            const da = a.createdAt ? new Date(a.createdAt) : new Date(0);
            const db = b.createdAt ? new Date(b.createdAt) : new Date(0);
            return db - da;
          });
          termPrint("Laatste " + n + " links:");
          sorted.slice(0, n).forEach((l) => {
            const cat = (l.category || "Algemeen").trim() || "Algemeen";
            termPrint(
              "- " +
              escapeHtml(l.title || "Zonder titel") +
              " (" + escapeHtml(cat) + ")"
            );
          });
          break;
        }

        case "random":
          if (!links.length) return termPrint("Geen links om uit te kiezen.");
          const rIndex = Math.floor(Math.random() * links.length);
          const item = links[rIndex];
          termPrint(
            "Random [" + rIndex + "]: " +
            escapeHtml(item.title || "Zonder titel") +
            " → " +
            '<a href="' + escapeHtml(item.url) +
            '" target="_blank" rel="noopener noreferrer">' +
            escapeHtml(item.url) + "</a>"
          );
          break;

        case "openr":
          if (!links.length) return termPrint("Geen links om uit te kiezen.");
          const rIndex2 = Math.floor(Math.random() * links.length);
          const item2 = links[rIndex2];
          termPrint(
            "Random open [" + rIndex2 + "]: " +
            escapeHtml(item2.title || "Zonder titel")
          );
          window.open(item2.url, "_blank", "noopener");
          break;

        case "open": {
          if (!argStr) return termPrintError("Gebruik: open <index>");
          const idx = parseInt(argStr, 10);
          if (isNaN(idx) || idx < 0 || idx >= links.length) {
            return termPrintError("Ongeldige index.");
          }
          const l = links[idx];
          termPrint("Openen [" + idx + "]: " + escapeHtml(l.title || "Zonder titel"));
          window.open(l.url, "_blank", "noopener");
          break;
        }

        case "add": {
          if (!argStr) return termPrintError("Gebruik: add titel|url|categorie");
          const parts = argStr.split("|");
          if (parts.length < 2) {
            return termPrintError("Gebruik: add titel|url|categorie (categorie optioneel)");
          }
          const title = parts[0].trim();
          const url = parts[1].trim();
          let cat = (parts[2] || "").trim();
          if (!title || !url) {
            return termPrintError("Titel en URL zijn verplicht.");
          }
          if (!cat) cat = "Inbox";

          const newLink = {
            id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
            title,
            url: normalizeUrl(url),
            category: cat,
            createdAt: new Date().toISOString(),
          };
          links.push(newLink);
          saveLinksToStorage();
          touchLastModified();
          categoryPulseName = cat || "Algemeen";
          renderLinks();
          termPrint("Link toegevoegd: " + escapeHtml(title));
          break;
        }

        case "mv": {
          if (!argStr) {
            termPrintError("Gebruik: mv <index> <categorie>");
            break;
          }
          const [idxStr, ...catParts] = argStr.split(" ");
          const idx = parseInt(idxStr, 10);
          const cat = catParts.join(" ").trim();
          if (
            isNaN(idx) ||
            idx < 0 ||
            idx >= links.length ||
            !cat
          ) {
            termPrintError("Gebruik: mv <index> <categorie>");
            break;
          }
          links[idx].category = cat;
          saveLinksToStorage();
          touchLastModified();
          categoryPulseName = cat || "Algemeen";
          renderLinks();
          termPrint(
            "Link [" + idx + "] verplaatst naar categorie: " +
            escapeHtml(cat)
          );
          break;
        }

        case "cat":
          if (!argStr) return termPrintError("Gebruik: cat <categorie-naam>");
          currentQuickFilter = "category";
          currentCategoryFilterName = argStr;
          quickFilterButtons.forEach((btn) => btn.classList.remove("active"));
          renderLinks();
          termPrint("Gefilterd op categorie: " + escapeHtml(argStr));
          break;

        case "clear":
          terminalOutput.innerHTML = "";
          break;

        case "reset":
          if (argStr !== "YES") {
            termPrint("Bevestig met: reset YES");
            break;
          }
          links = [];
          saveLinksToStorage();
          touchLastModified();
          renderLinks();
          termPrint("Alle links zijn verwijderd.");
          break;

        default:
          termPrintError("Onbekend link-commando. Typ 'help'.");
      }
    }

    // Task commands via terminal
    function handleTaskCommand(name, argStr) {
      switch (name) {
        case "t-help":
          termPrint("Tasklist-commando's:");
          termPrint("  t-help                 - toon dit overzicht");
          termPrint("  t-list [open|done|all] - toon taken (default: open)");
          termPrint("  t-add t|[start]|[end]|[prio]|[url]|[project]");
          termPrint("       start   = YYYY-MM-DD (optioneel)");
          termPrint("       end     = YYYY-MM-DD (optioneel)");
          termPrint("       prio    = high | normal | low (optioneel)");
          termPrint("       url     = gerelateerde link (optioneel)");
          termPrint("       project = naam van project (optioneel)");
          termPrint("  t-done <index>         - markeer open taak als gedaan");
          termPrint("  t-del <index>          - verwijder open taak");
          termPrint("  t-clear-done           - verwijder alle afgeronde taken");
          break;

        case "t-list": {
          const mode = (argStr || "open").toLowerCase();
          const openTasks = tasks.filter((t) => !t.done && matchesProject(t));
          const doneTasks = tasks.filter((t) => t.done && matchesProject(t));

          const formatRange = (task) => {
            const start = task.startDate || "";
            const end = task.endDate || task.dueDate || "";
            if (!start && !end) return "";
            if (start && end) return " [" + start + "→" + end + "]";
            return " [" + (start || end) + "]";
          };

          if (mode === "open") {
            if (!openTasks.length) return termPrint("Geen open taken.");
            termPrint("Open taken:");
            openTasks.forEach((t, idx) => {
              const rangeStr = formatRange(t);
              const prioStr = t.priority ? (" (" + t.priority + ")") : "";
              const projectStr = t.project
                ? " {" + escapeHtml(t.project) + "}"
                : "";
              termPrint(
                "[" + idx + "] " +
                escapeHtml(t.title) +
                rangeStr + prioStr + projectStr
              );
            });
            termPrint("Index hierboven gebruik je met t-done en t-del.");
          } else if (mode === "done") {
            if (!doneTasks.length) return termPrint("Geen afgeronde taken.");
            termPrint("Afgeronde taken:");
            doneTasks.forEach((t, idx) => {
              const rangeStr = formatRange(t);
              const prioStr = t.priority ? (" (" + t.priority + ")") : "";
              const projectStr = t.project
                ? " {" + escapeHtml(t.project) + "}"
                : "";
              termPrint(
                "[" + idx + "] " +
                escapeHtml(t.title) +
                rangeStr + prioStr + projectStr
              );
            });
          } else if (mode === "all") {
            if (!tasks.length) return termPrint("Geen taken.");
            termPrint("Open taken:");
            openTasks.forEach((t, idx) => {
              const rangeStr = formatRange(t);
              const prioStr = t.priority ? (" (" + t.priority + ")") : "";
              const projectStr = t.project
                ? " {" + escapeHtml(t.project) + "}"
                : "";
              termPrint(
                "[O" + idx + "] " +
                escapeHtml(t.title) +
                rangeStr + prioStr + projectStr
              );
            });
            termPrint("");
            termPrint("Afgeronde taken:");
            doneTasks.forEach((t, idx) => {
              const rangeStr = formatRange(t);
              const prioStr = t.priority ? (" (" + t.priority + ")") : "";
              const projectStr = t.project
                ? " {" + escapeHtml(t.project) + "}"
                : "";
              termPrint(
                "[D" + idx + "] " +
                escapeHtml(t.title) +
                rangeStr + prioStr + projectStr
              );
            });
          } else {
            termPrintError("Gebruik: t-list [open|done|all]");
          }
          break;
        }

        case "t-add": {
          if (!argStr) {
            termPrintError("Gebruik: t-add titel|[start]|[end]|[prio]|[url]|[project]");
            break;
          }
          const parts = argStr.split("|");
          const title = (parts[0] || "").trim();
          const startRaw = (parts[1] || "").trim();
          const endRaw = (parts[2] || "").trim();
          const prioRaw = (parts[3] || "").trim().toLowerCase();
          const urlRaw = (parts[4] || "").trim();
          const projectRaw = normalizeProject(parts[5] || "");

          if (!title) {
            termPrintError("Titel is verplicht.");
            break;
          }

          let start = null;
          if (startRaw && /^\d{4}-\d{2}-\d{2}$/.test(startRaw)) {
            start = startRaw;
          } else if (startRaw) {
            termPrint("Waarschuwing: startdatum niet herkend, overslagen.");
          }

          let end = null;
          if (endRaw && /^\d{4}-\d{2}-\d{2}$/.test(endRaw)) {
            end = endRaw;
          } else if (endRaw) {
            termPrint("Waarschuwing: einddatum niet herkend, overslagen.");
          }

          let prio = null;
          if (prioRaw === "high" || prioRaw === "normal" || prioRaw === "low") {
            prio = prioRaw;
          } else if (prioRaw) {
            termPrint("Waarschuwing: onbekende prioriteit, overslagen.");
          }

          const newTask = {
            id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
            title,
            done: false,
            createdAt: new Date().toISOString(),
            startDate: start,
            endDate: end,
            dueDate: end,
            priority: prio,
            linkUrl: urlRaw ? normalizeUrl(urlRaw) : null,
            project: projectRaw || null,
          };

          tasks.push(newTask);
          saveTasksToStorage();
          renderTasks();
          termPrint("Taak toegevoegd: " + escapeHtml(title));
          break;
        }

        case "t-done": {
          if (!argStr) {
            termPrintError("Gebruik: t-done <index>");
            break;
          }
          const idx = parseInt(argStr, 10);
          const openTasks = tasks.filter((t) => !t.done && matchesProject(t));
          if (isNaN(idx) || idx < 0 || idx >= openTasks.length) {
            termPrintError("Ongeldige index (gebruik index uit t-list).");
            break;
          }
          const target = openTasks[idx];
          const realIndex = tasks.findIndex((t) => t.id === target.id);
          if (realIndex === -1) break;
          tasks[realIndex].done = true;
          saveTasksToStorage();
          renderTasks();
          termPrint("Taak afgevinkt: " + escapeHtml(target.title));
          break;
        }

        case "t-del": {
          if (!argStr) {
            termPrintError("Gebruik: t-del <index>");
            break;
          }
          const idx = parseInt(argStr, 10);
          const openTasks = tasks.filter((t) => !t.done && matchesProject(t));
          if (isNaN(idx) || idx < 0 || idx >= openTasks.length) {
            termPrintError("Ongeldige index (alleen open taken).");
            break;
          }
          const target = openTasks[idx];
          if (!confirm(`Taak verwijderen?\n\n${target.title}`)) break;
          tasks = tasks.filter((t) => t.id !== target.id);
          saveTasksToStorage();
          renderTasks();
          termPrint("Taak verwijderd.");
          break;
        }

        case "t-clear-done": {
          const hadDone = tasks.some((t) => t.done && matchesProject(t));
          tasks = tasks.filter((t) => !(t.done && matchesProject(t)));
          saveTasksToStorage();
          renderTasks();
          termPrint(hadDone ? "Alle afgeronde taken verwijderd." : "Geen afgeronde taken.");
          break;
        }

        default:
          termPrintError("Onbekend task-commando. Typ 't-help'.");
      }
    }

    function handleTerminalCommand(cmdRaw) {
      const cmd = cmdRaw.trim();
      if (!cmd) return;

      termPrint('&gt; <span class="cmd">' + escapeHtml(cmd) + "</span>");

      const [first, ...rest] = cmd.split(" ");
      const argStr = rest.join(" ").trim();
      const name = first.toLowerCase();

      if (name.startsWith("t-")) {
        handleTaskCommand(name, argStr);
      } else {
        handleLinkCommand(name, argStr);
      }
    }

    if (terminalInput) {
      terminalInput.addEventListener("keydown", (e) => {
        if (e.key === "ArrowUp") {
          if (!terminalHistory.length) return;
          if (terminalHistoryIndex === -1) {
            terminalHistoryIndex = terminalHistory.length - 1;
          } else if (terminalHistoryIndex > 0) {
            terminalHistoryIndex--;
          }
          terminalInput.value = terminalHistory[terminalHistoryIndex] || "";
          e.preventDefault();
          return;
        }

        if (e.key === "ArrowDown") {
          if (!terminalHistory.length) return;
          if (terminalHistoryIndex === -1) return;
          if (terminalHistoryIndex < terminalHistory.length - 1) {
            terminalHistoryIndex++;
            terminalInput.value = terminalHistory[terminalHistoryIndex] || "";
          } else {
            terminalHistoryIndex = -1;
            terminalInput.value = "";
          }
          e.preventDefault();
          return;
        }

        if (e.key === "Tab") {
          e.preventDefault();
          const value = terminalInput.value.trim();
          if (!value) return;
          const parts = value.split(/\s+/);
          if (parts.length === 1) {
            const partial = parts[0].toLowerCase();
            const match = COMMANDS.find((c) => c.startsWith(partial));
            if (match) terminalInput.value = match + " ";
          }
          return;
        }

        if (e.key === "Enter") {
          e.preventDefault();
          const value = terminalInput.value;
          if (value.trim()) {
            terminalHistory.push(value);
            terminalHistoryIndex = -1;
          }
          terminalInput.value = "";
          handleTerminalCommand(value);
        }
      });
    }

    function printMotd() {
      const messages = [
        "stay hydrated. je links zijn dat niet.",
        "small steps → big systems. één link tegelijk.",
        "pro tip: druk '/' om direct te zoeken.",
        "pro tip: typ 'help' voor links, 't-help' voor taken.",
      ];
      const msg = messages[Math.floor(Math.random() * messages.length)];
      termPrint("MOTD: " + msg);
      if (links.length) {
        termPrint("Je hebt momenteel " + links.length + " links opgeslagen.");
      }
      if (tasks.length) {
        termPrint("Je hebt momenteel " + tasks.length + " taken in TASKLIST.APP.");
      }
    }

    // --- Keyboard shortcuts -----------------------------------------------
    function isTypingInInput(el) {
      if (!el) return false;
      const tag = el.tagName;
      return tag === "INPUT" || tag === "TEXTAREA" || el.isContentEditable;
    }

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        if (document.activeElement === searchInput) {
          searchInput.value = "";
          renderLinks();
        }
        if (document.activeElement === terminalInput) {
          terminalInput.value = "";
        }
        return;
      }

      if (isTypingInInput(e.target)) return;

      if (e.key === "/") {
        e.preventDefault();
        searchInput.focus();
        searchInput.select();
      } else if (e.key === "n" || e.key === "N") {
        e.preventDefault();
        titleInput.focus();
        titleInput.select();
      } else if (e.key === "t" || e.key === "T") {
        e.preventDefault();
        terminalInput.focus();
      }
    });

    // --- Export / import (links) -----------------------------------------
    const exportBtn = document.getElementById("exportBtn");
    const importBtn = document.getElementById("importBtn");
    const importFile = document.getElementById("importFile");

    exportBtn.addEventListener("click", () => {
      const blob = new Blob([JSON.stringify(links, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const today = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `work-links-export-${today}.json`;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 0);
    });

    importBtn.addEventListener("click", () => {
      importFile.value = "";
      importFile.click();
    });

    importFile.addEventListener("change", () => {
      const file = importFile.files && importFile.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const text = String(evt.target.result);
          const parsed = JSON.parse(text);
          if (!Array.isArray(parsed)) {
            alert("Bestand bevat geen geldige lijst met links.");
            return;
          }
          const cleaned = parsed
            .filter((item) => item && typeof item === "object")
            .map((item) => ({
              id: item.id || String(Date.now() + Math.random()),
              title: String(item.title || "").trim() || "Zonder titel",
              url: String(item.url || "").trim(),
              category: String(item.category || "").trim(),
              createdAt: item.createdAt || new Date().toISOString(),
              project: normalizeProject(item.project),
            }))
            .filter((item) => item.url);

          links = cleaned;
          saveLinksToStorage();
          touchLastModified();
          categoryPulseName = null;
          renderLinks();
        } catch (err) {
          console.error(err);
          alert("Kon dit JSON-bestand niet lezen.");
        }
      };
      reader.readAsText(file);
    });

    // --- Init -------------------------------------------------------------
    loadLinksFromStorage();
    loadLastModified();
    renderLinks();

    loadTasksFromStorage();
    renderTasks();

    printMotd();
