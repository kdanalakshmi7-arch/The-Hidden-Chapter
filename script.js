
/* ============================================================
   THE HIDDEN CHAPTER
   JavaScript — Part 1
   Core state, local storage, navigation and library
   ============================================================ */

"use strict";

/* ------------------------------------------------------------
   1. APP CONFIGURATION
   ------------------------------------------------------------ */

const APP_CONFIG = {
    name: "The Hidden Chapter",
    version: "1.0.0",
    storageKey: "hiddenChapterData",
    autosaveDelay: 500,
    maxRecentEntries: 6
};

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) =>
    Array.from(root.querySelectorAll(selector));

const escapeHTML = (value = "") =>
    String(value).replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    })[character]);

const makeId = () =>
    `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

const todayISO = () => {
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;
    return new Date(now.getTime() - offset).toISOString().slice(0, 10);
};

const formatDate = (dateString, options = {}) => {
    if (!dateString) return "Undated memory";

    const date = new Date(`${dateString}T12:00:00`);

    if (Number.isNaN(date.getTime())) return "Undated memory";

    return date.toLocaleDateString(undefined, {
        day: "numeric",
        month: "short",
        year: "numeric",
        ...options
    });
};

const formatLongDate = dateString =>
    formatDate(dateString, {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric"
    });

const truncate = (text, length = 150) => {
    const clean = String(text || "").replace(/\s+/g, " ").trim();
    return clean.length > length
        ? `${clean.slice(0, length).trim()}…`
        : clean;
};

/* ------------------------------------------------------------
   2. DEFAULT APP DATA
   ------------------------------------------------------------ */

function createDefaultData() {
    return {
        version: APP_CONFIG.version,

        settings: {
            theme: "academia",
            accentColor: "#c9a96d",
            animationMode: "enchanted",
            soundEnabled: false,
            reducedMotion: false,
            readingWidth: "comfortable",
            defaultWritingMode: "classic"
        },

        entries: [],

        reflections: [],

        capsules: [],

        scrapbookPages: [],

        customThemes: [],

        shopFavorites: [],

        activeEntryId: null,

        lastOpenedView: "home"
    };
}

function normalizeData(data) {
    const defaults = createDefaultData();

    if (!data || typeof data !== "object" || Array.isArray(data)) {
        return defaults;
    }

    return {
        ...defaults,
        ...data,

        settings: {
            ...defaults.settings,
            ...(data.settings || {})
        },

        entries: Array.isArray(data.entries) ? data.entries : [],

        reflections: Array.isArray(data.reflections)
            ? data.reflections
            : [],

        capsules: Array.isArray(data.capsules)
            ? data.capsules
            : [],

        scrapbookPages: Array.isArray(data.scrapbookPages)
            ? data.scrapbookPages
            : [],

        customThemes: Array.isArray(data.customThemes)
            ? data.customThemes
            : [],

        shopFavorites: Array.isArray(data.shopFavorites)
            ? data.shopFavorites
            : []
    };
}

/* ------------------------------------------------------------
   3. LOAD AND SAVE DATA
   ------------------------------------------------------------ */

function loadData() {
    try {
        const raw = localStorage.getItem(APP_CONFIG.storageKey);

        if (!raw) return createDefaultData();

        return normalizeData(JSON.parse(raw));
    } catch (error) {
        console.error("Could not load journal data:", error);

        showToast(
            "Your saved data could not be read. Avoid clearing browser data until you've checked for a backup.",
            "error"
        );

        return createDefaultData();
    }
}

let appData = loadData();

let currentView = "home";
let currentTag = "all";
let searchQuery = "";
let calendarDate = new Date();
let selectedCalendarDate = todayISO();
let activeSettingsSection = "appearance";
let currentEditorMode = "classic";
let editorEntryId = null;
let saveTimer = null;
let hasUnsavedChanges = false;

function saveData(options = {}) {
    try {
        appData.version = APP_CONFIG.version;

        localStorage.setItem(
            APP_CONFIG.storageKey,
            JSON.stringify(appData)
        );

        hasUnsavedChanges = false;
        updateStorageLabel();

        if (options.notify) {
            showToast("Your chapter has been saved. ✦", "success");
        }

        return true;
    } catch (error) {
        console.error("Could not save journal data:", error);

        hasUnsavedChanges = true;

        showToast(
            "Your browser couldn't save this change. Export a backup and check available storage.",
            "error"
        );

        return false;
    }
}

function scheduleSave() {
    hasUnsavedChanges = true;

    clearTimeout(saveTimer);

    saveTimer = setTimeout(() => {
        saveData();
    }, APP_CONFIG.autosaveDelay);
}

function updateStorageLabel() {
    const label = $("#storage-label");

    if (label) {
        label.textContent = hasUnsavedChanges
            ? "Saving your chapter…"
            : "Saved privately in this browser";
    }
}

/* ------------------------------------------------------------
   4. TOAST NOTIFICATIONS
   ------------------------------------------------------------ */

function showToast(message, type = "info") {
    const region = $("#toast-region");

    if (!region) {
        console.log(`[${type}] ${message}`);
        return;
    }

    const toast = document.createElement("div");

    toast.className = `toast ${type}`;
    toast.setAttribute("role", "status");
    toast.textContent = message;

    region.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 3600);
}

/* ------------------------------------------------------------
   5. BASIC UI HELPERS
   ------------------------------------------------------------ */

function setBreadcrumb(label) {
    const breadcrumb = $("#breadcrumb");

    if (breadcrumb) {
        breadcrumb.innerHTML =
            `${escapeHTML(label)} <span>✦</span>`;
    }
}

function setActiveNavigation(view) {
    $$(".nav-item[data-view]").forEach(button => {
        button.classList.toggle(
            "active",
            button.dataset.view === view
        );
    });
}

function updateCounts() {
    const allCount = $("#all-count");
    const favoriteCount = $("#favorite-count");

    if (allCount) {
        allCount.textContent = appData.entries.length;
    }

    if (favoriteCount) {
        favoriteCount.textContent =
            appData.entries.filter(entry => entry.favorite).length;
    }
}

function applySettings() {
    document.body.dataset.theme = appData.settings.theme || "academia";

    document.body.classList.toggle(
        "quiet-mode",
        appData.settings.animationMode === "quiet" ||
        appData.settings.reducedMotion
    );

    document.documentElement.style.setProperty(
        "--accent",
        appData.settings.accentColor || "#c9a96d"
    );
}

/* ------------------------------------------------------------
   6. ENTRY HELPERS
   ------------------------------------------------------------ */

function getEntryById(id) {
    return appData.entries.find(entry => entry.id === id) || null;
}

function sortEntriesNewestFirst(entries = appData.entries) {
    return [...entries].sort((a, b) => {
        const dateA = new Date(a.updatedAt || a.date || 0).getTime();
        const dateB = new Date(b.updatedAt || b.date || 0).getTime();

        return dateB - dateA;
    });
}

function getEntryPlainText(entry) {
    const temporary = document.createElement("div");
    temporary.innerHTML = entry.content || "";

    return temporary.textContent || temporary.innerText || "";
}

function getEntryExcerpt(entry, length = 150) {
    return truncate(getEntryPlainText(entry), length) ||
        "A little space in your story, waiting to be filled.";
}

function createEntry(options = {}) {
    const now = new Date().toISOString();

    const entry = {
        id: makeId(),
        title: options.title || "A new chapter",
        date: options.date || todayISO(),
        createdAt: now,
        updatedAt: now,
        content: "",
        mode: options.mode || appData.settings.defaultWritingMode,
        mood: "",
        tags: [],
        favorite: false,
        photos: [],
        stickers: [],
        paperStyle: "classic",
        background: "paper-cream",
        textColor: "#403448",
        fontFamily: "Caveat",
        fontSize: 21,
        alignment: "left",
        templateId: null
    };

    appData.entries.unshift(entry);
    appData.activeEntryId = entry.id;

    saveData();

    return entry;
}

function deleteEntry(id) {
    const entry = getEntryById(id);

    if (!entry) return;

    const confirmed = window.confirm(
        `Move "${entry.title}" out of your journal? This action cannot be undone unless you have a backup.`
    );

    if (!confirmed) return;

    appData.entries = appData.entries.filter(item => item.id !== id);

    if (appData.activeEntryId === id) {
        appData.activeEntryId = null;
    }

    saveData();
    updateCounts();
    renderView();

    showToast("Chapter deleted.", "info");
}

function toggleFavorite(id) {
    const entry = getEntryById(id);

    if (!entry) return;

    entry.favorite = !entry.favorite;
    entry.updatedAt = new Date().toISOString();

    saveData();
    updateCounts();
    renderView();

    showToast(
        entry.favorite
            ? "Saved among your little treasures. ✦"
            : "Removed from your little treasures.",
        "success"
    );
}

/* ------------------------------------------------------------
   7. REUSABLE EMPTY STATE
   ------------------------------------------------------------ */

function emptyState(icon, title, description, actionLabel = "") {
    return `
        <div class="empty-state">
            <div class="empty-state-icon">${icon}</div>
            <h3>${escapeHTML(title)}</h3>
            <p>${escapeHTML(description)}</p>
            ${actionLabel
            ? `<button class="btn btn-primary" data-action="new">
                           ${escapeHTML(actionLabel)}
                       </button>`
            : ""
        }
        </div>
    `;
}

/* ------------------------------------------------------------
   8. LIBRARY HOME SCREEN
   ------------------------------------------------------------ */

function renderHome() {
    const entries = sortEntriesNewestFirst();

    const recentEntries = entries.slice(
        0,
        APP_CONFIG.maxRecentEntries
    );

    const favoriteCount = entries.filter(
        entry => entry.favorite
    ).length;

    const todayCount = entries.filter(
        entry => entry.date === todayISO()
    ).length;

    return `
        <section class="hero reveal">
            <div class="hero-content">
                <span class="eyebrow">WELCOME TO YOUR LITTLE UNIVERSE</span>

                <h1>Every life has<br>a hidden chapter.</h1>

                <p>
                    A quiet corner of the world where your thoughts,
                    little wonders and becoming-self can find a home.
                </p>

                <div class="hero-actions">
                    <button class="btn btn-primary" data-action="new">
                        ✎ &nbsp; Write a chapter
                    </button>

                    <button class="btn btn-secondary" data-view="memories">
                        Explore memories &nbsp; →
                    </button>
                </div>
            </div>

            <div class="hero-sigil" aria-hidden="true">✧</div>
            <div class="hero-orb" aria-hidden="true">☾</div>
        </section>

        <section class="section reveal">
            <div class="section-header">
                <div>
                    <span class="eyebrow">YOUR WORLD, IN WORDS</span>
                    <h2 class="section-title">A little look inside</h2>
                </div>
            </div>

            <div class="grid-3">
                <article class="card stat-card">
                    <span class="stat-icon">📖</span>
                    <strong>${entries.length}</strong>
                    <span>Chapters written</span>
                </article>

                <article class="card stat-card">
                    <span class="stat-icon">♡</span>
                    <strong>${favoriteCount}</strong>
                    <span>Little treasures</span>
                </article>

                <article class="card stat-card">
                    <span class="stat-icon">☀</span>
                    <strong>${todayCount}</strong>
                    <span>Chapters dated today</span>
                </article>
            </div>
        </section>

        <section class="section reveal">
            <div class="section-header">
                <div>
                    <span class="eyebrow">FRESH FROM YOUR PAGES</span>
                    <h2 class="section-title">Recently remembered</h2>
                </div>

                <button class="text-button" data-tag="all">
                    All chapters →
                </button>
            </div>

            ${recentEntries.length
            ? `<div class="chapter-grid">
                        ${recentEntries.map(renderChapterCard).join("")}
                       </div>`
            : emptyState(
                "✧",
                "Your library is waiting for its first story",
                "A tiny thought, a wonderful day or an ordinary moment — it all belongs here.",
                "Write your first chapter"
            )
        }
        </section>

        <section class="section reveal">
            <div class="section-header">
                <div>
                    <span class="eyebrow">A MOMENT JUST FOR YOU</span>
                    <h2 class="section-title">A gentle invitation</h2>
                </div>
            </div>

            <article class="prompt-card">
                <span class="prompt-label">TODAY'S JOURNAL PROMPT</span>
                <p>
                    What is one little thing from today that you would
                    like your future self to remember?
                </p>

                <button class="btn btn-secondary" data-action="new-prompt">
                    Write about it →
                </button>
            </article>
        </section>

        <section class="section reveal">
            <div class="section-header">
                <div>
                    <span class="eyebrow">FOLLOW YOUR CURIOSITY</span>
                    <h2 class="section-title">Where shall we wander?</h2>
                </div>
            </div>

            <div class="grid-3">
                <button class="feature-card" data-view="memories">
                    <span class="feature-icon">☾</span>
                    <strong>The Observatory</strong>
                    <span>Revisit moments across time.</span>
                </button>

                <button class="feature-card" data-view="garden">
                    <span class="feature-icon">❀</span>
                    <strong>Reflection Garden</strong>
                    <span>Make space for gratitude and growth.</span>
                </button>

                <button class="feature-card" data-view="studio">
                    <span class="feature-icon">✧</span>
                    <strong>Curiosity Shop</strong>
                    <span>Discover ways to decorate your pages.</span>
                </button>
            </div>
        </section>
    `;
}

/* ------------------------------------------------------------
   9. JOURNAL ENTRY CARDS
   ------------------------------------------------------------ */

function renderChapterCard(entry) {
    const mood = entry.mood || "✧";

    const tags = Array.isArray(entry.tags)
        ? entry.tags.slice(0, 3)
        : [];

    return `
        <article class="chapter-card" data-entry-card="${escapeHTML(entry.id)}">
            <div class="chapter-card-top">
                <span class="chapter-date">
                    ${escapeHTML(formatDate(entry.date))}
                </span>

                <button
                    class="chapter-favorite ${entry.favorite ? "active" : ""}"
                    data-action="favorite"
                    data-id="${escapeHTML(entry.id)}"
                    aria-label="${entry.favorite ? "Remove favorite" : "Add favorite"}"
                    title="${entry.favorite ? "Remove favorite" : "Save as a favorite"}"
                >
                    ${entry.favorite ? "♥" : "♡"}
                </button>
            </div>

            <button
                class="chapter-card-open"
                data-action="edit"
                data-id="${escapeHTML(entry.id)}"
                aria-label="Open ${escapeHTML(entry.title)}"
            >
                <h3>${escapeHTML(entry.title || "Untitled chapter")}</h3>
                <p class="chapter-excerpt">
                    ${escapeHTML(getEntryExcerpt(entry))}
                </p>
            </button>

            <div class="chapter-card-bottom">
                <span class="mood-emoji">${escapeHTML(mood)}</span>

                ${tags.map(tag => `
                    <span class="tag-chip">${escapeHTML(tag)}</span>
                `).join("")}

                <button
                    class="icon-button chapter-more"
                    data-action="entry-menu"
                    data-id="${escapeHTML(entry.id)}"
                    aria-label="More options"
                    title="More options"
                >···</button>
            </div>
        </article>
    `;
}

/* ------------------------------------------------------------
   10. ALL CHAPTERS AND COLLECTIONS
   ------------------------------------------------------------ */

function renderAllEntries() {
    let entries = sortEntriesNewestFirst();

    if (currentTag === "favorites") {
        entries = entries.filter(entry => entry.favorite);
    } else if (currentTag !== "all") {
        entries = entries.filter(entry =>
            Array.isArray(entry.tags) &&
            entry.tags.includes(currentTag)
        );
    }

    if (searchQuery) {
        const query = searchQuery.toLowerCase();

        entries = entries.filter(entry => {
            const searchable = [
                entry.title,
                getEntryPlainText(entry),
                ...(entry.tags || []),
                entry.mood,
                entry.date
            ].join(" ").toLowerCase();

            return searchable.includes(query);
        });
    }

    const heading = currentTag === "favorites"
        ? "Little treasures"
        : currentTag === "all"
            ? "All chapters"
            : currentTag;

    return `
        <section class="page-heading-block reveal">
            <span class="eyebrow">YOUR PERSONAL ARCHIVE</span>
            <h1 class="page-heading">${escapeHTML(heading)}</h1>
            <p class="page-description">
                Every page is a small piece of your story.
                Return whenever you like.
            </p>
        </section>

        <div class="content-toolbar">
            <span class="result-count">
                ${entries.length} ${entries.length === 1 ? "chapter" : "chapters"}
            </span>

            <button class="btn btn-primary" data-action="new">
                + Write a chapter
            </button>
        </div>

        ${entries.length
            ? `<div class="chapter-grid">
                    ${entries.map(renderChapterCard).join("")}
                   </div>`
            : emptyState(
                "☾",
                searchQuery
                    ? "No memories found"
                    : "This shelf is waiting",
                searchQuery
                    ? "Try another search phrase."
                    : "Your next chapter can begin whenever you're ready.",
                "Write a chapter"
            )
        }
    `;
}

/* ------------------------------------------------------------
   11. MAIN VIEW RENDERER
   ------------------------------------------------------------ */

function renderView() {
    const root = $("#view-root");

    if (!root) return;

    const viewNames = {
        home: "THE GRAND LIBRARY",
        memories: "THE MEMORY OBSERVATORY",
        garden: "THE REFLECTION GARDEN",
        studio: "THE CURIOSITY SHOP",
        settings: "THE KEEPER'S DESK",
        entries: "YOUR COLLECTIONS",
        editor: "A NEW CHAPTER"
    };

    setBreadcrumb(viewNames[currentView] || "THE GRAND LIBRARY");
    setActiveNavigation(currentView);

    switch (currentView) {
        case "settings":
            renderSettings();
            return;
        case "memories":
            renderObservatory();
            return;

        case "garden":
            renderGarden();
            return;

        case "studio":
            renderStudio();
            return;
        case "home":
            root.innerHTML = renderHome();
            break;

        case "entries":
            root.innerHTML = renderAllEntries();
            break;

        default:
            root.innerHTML = `
                <section class="page-heading-block reveal">
                    <span class="eyebrow">A LITTLE MAGIC IN PROGRESS</span>
                    <h1 class="page-heading">One moment, please.</h1>
                    <p class="page-description">
                        This part of the library will be connected in the
                        following sections of the JavaScript.
                    </p>
                </section>

                <button class="btn btn-secondary" data-view="home">
                    ← Return to the library
                </button>
            `;
    }

    updateCounts();
}

/* ------------------------------------------------------------
   12. NAVIGATION
   ------------------------------------------------------------ */

function navigateTo(view) {
    const validViews = [
        "home",
        "entries",
        "memories",
        "garden",
        "studio",
        "settings"
    ];

    if (!validViews.includes(view)) {
        showToast("That section isn't available yet.", "info");
        return;
    }

    currentView = view;
    appData.lastOpenedView = view;

    saveData();
    renderView();

    const sidebar = $("#sidebar");

    if (sidebar) {
        sidebar.classList.remove("open");
    }

    window.scrollTo({
        top: 0,
        behavior: appData.settings.reducedMotion ? "auto" : "smooth"
    });
}

/* ------------------------------------------------------------
   13. GLOBAL CLICK HANDLER
   ------------------------------------------------------------ */

document.addEventListener("click", event => {
    const viewButton = event.target.closest("[data-view]");

    if (viewButton) {
        event.preventDefault();
        navigateTo(viewButton.dataset.view);
        return;
    }

    const tagButton = event.target.closest("[data-tag]");

    if (
        tagButton &&
        !tagButton.matches("[data-action]")
    ) {
        event.preventDefault();

        currentTag = tagButton.dataset.tag || "all";
        currentView = "entries";

        renderView();
        return;
    }

    const actionButton = event.target.closest("[data-action]");

    if (!actionButton) return;

    const { action, id } = actionButton.dataset;

    switch (action) {
        case "new":
            openEditor();
            break;

        case "edit":
            openEditor(id);
            break;

        case "favorite":
            toggleFavorite(id);
            break;

        case "new-prompt":
            openEditor(undefined, {
                prompt: "What is one little thing from today that you would like your future self to remember?"
            });
            break;

        case "entry-menu":
            showEntryMenu(id);
            break;

        default:
            break;
    }
});

/* ------------------------------------------------------------
   14. GLOBAL SEARCH
   ------------------------------------------------------------ */

const globalSearch = $("#global-search");

if (globalSearch) {
    globalSearch.addEventListener("input", event => {
        searchQuery = event.target.value.trim();

        currentView = "entries";
        renderView();

        const newSearch = $("#global-search");

        if (newSearch) {
            newSearch.value = searchQuery;
            newSearch.focus();

            const end = newSearch.value.length;
            newSearch.setSelectionRange(end, end);
        }
    });
}

/* ------------------------------------------------------------
   15. MOBILE NAVIGATION
   ------------------------------------------------------------ */

const menuToggle = $("#menu-toggle");

if (menuToggle) {
    menuToggle.addEventListener("click", () => {
        $("#sidebar")?.classList.toggle("open");
    });
}

document.addEventListener("click", event => {
    const sidebar = $("#sidebar");

    if (!sidebar || !sidebar.classList.contains("open")) return;

    if (
        !sidebar.contains(event.target) &&
        !event.target.closest("#menu-toggle")
    ) {
        sidebar.classList.remove("open");
    }
});

/* ------------------------------------------------------------
   16. QUICK THEME BUTTON
   ------------------------------------------------------------ */

const themeQuick = $("#theme-quick");

if (themeQuick) {
    themeQuick.addEventListener("click", () => {
        const themes = [
            "academia",
            "coquette",
            "celestial",
            "cottagecore"
        ];

        const currentIndex = themes.indexOf(appData.settings.theme);

        appData.settings.theme =
            themes[(currentIndex + 1) % themes.length];

        applySettings();
        saveData();

        showToast(
            `Your library now wears the ${appData.settings.theme} theme. ✧`,
            "success"
        );

        if (currentView === "settings") {
            renderView();
        }
    });
}

/* ------------------------------------------------------------
   17. SETTINGS SHORTCUTS
   ------------------------------------------------------------ */

const openSettingsButton = $("#open-settings");

if (openSettingsButton) {
    openSettingsButton.addEventListener("click", () => {
        navigateTo("settings");
    });
}

/* ------------------------------------------------------------
   18. ENTRY OPTIONS
   ------------------------------------------------------------ */

function showEntryMenu(id) {
    const entry = getEntryById(id);

    if (!entry) return;

    const dialog = $("#modal");
    const inner = $("#modal-inner");

    if (!dialog || !inner) {
        const shouldDelete = window.confirm(
            `Delete "${entry.title}"? Choose Cancel to keep it.`
        );

        if (shouldDelete) deleteEntry(id);

        return;
    }

    inner.innerHTML = `
        <div class="modal-header">
            <div>
                <h2>${escapeHTML(entry.title)}</h2>
                <p>${escapeHTML(formatDate(entry.date))}</p>
            </div>

            <button class="modal-close" data-action="close-modal"
                aria-label="Close dialog">×</button>
        </div>

        <div class="modal-actions">
            <button class="btn btn-secondary"
                data-action="edit" data-id="${escapeHTML(id)}">
                Open chapter
            </button>

            <button class="btn btn-secondary"
                data-action="favorite" data-id="${escapeHTML(id)}">
                ${entry.favorite ? "Remove favorite" : "Save favorite"}
            </button>

            <button class="btn btn-danger"
                data-action="delete-entry" data-id="${escapeHTML(id)}">
                Delete chapter
            </button>
        </div>
    `;

    if (typeof dialog.showModal === "function") {
        dialog.showModal();
    } else {
        dialog.setAttribute("open", "");
    }
}

/* ------------------------------------------------------------
   19. DIALOG ACTIONS
   ------------------------------------------------------------ */

document.addEventListener("click", event => {
    const actionButton = event.target.closest("[data-action]");

    if (!actionButton) return;

    const action = actionButton.dataset.action;
    const id = actionButton.dataset.id;

    if (action === "close-modal") {
        const dialog = $("#modal");

        if (dialog?.open && typeof dialog.close === "function") {
            dialog.close();
        } else {
            dialog?.removeAttribute("open");
        }
    }

    if (action === "delete-entry") {
        const dialog = $("#modal");

        if (dialog?.open && typeof dialog.close === "function") {
            dialog.close();
        } else {
            dialog?.removeAttribute("open");
        }

        deleteEntry(id);
    }
});

/* ------------------------------------------------------------
   20. KEYBOARD SHORTCUTS
   ------------------------------------------------------------ */

document.addEventListener("keydown", event => {
    const target = event.target;

    const typing = target instanceof HTMLElement &&
        (
            target.isContentEditable ||
            ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)
        );

    if (
        (event.metaKey || event.ctrlKey) &&
        event.key.toLowerCase() === "k"
    ) {
        event.preventDefault();
        $("#global-search")?.focus();
    }

    if (
        !typing &&
        !event.metaKey &&
        !event.ctrlKey &&
        event.key.toLowerCase() === "n"
    ) {
        event.preventDefault();
        openEditor();
    }

    if (event.key === "Escape") {
        $("#sidebar")?.classList.remove("open");
    }
});

/* ------------------------------------------------------------
   21. INITIALIZE APP
   ------------------------------------------------------------ */

function initializeApp() {
    applySettings();
    updateCounts();

    const savedView = appData.lastOpenedView;

    currentView = [
        "home",
        "entries",
        "memories",
        "garden",
        "studio",
        "settings"
    ].includes(savedView)
        ? savedView
        : "home";

    renderView();

    console.info(
        `${APP_CONFIG.name} initialized successfully.`
    );
}

initializeApp();

/* ============================================================
   END OF PART 1
   ============================================================ */

/* ============================================================
   THE HIDDEN CHAPTER
   JavaScript — Part 2
   Journal editor, writing tools and scrapbook foundations
   ============================================================ */

/* ------------------------------------------------------------
   22. EDITOR CONFIGURATION
   ------------------------------------------------------------ */

const JOURNAL_MOODS = [
    { emoji: "😊", label: "Happy" },
    { emoji: "🥰", label: "Loved" },
    { emoji: "🌿", label: "Peaceful" },
    { emoji: "✨", label: "Inspired" },
    { emoji: "🥹", label: "Emotional" },
    { emoji: "😔", label: "Low" },
    { emoji: "😴", label: "Tired" },
    { emoji: "🌧️", label: "Reflective" },
    { emoji: "🔥", label: "Motivated" },
    { emoji: "🌸", label: "Hopeful" }
];

const PAPER_STYLES = [
    { id: "paper-cream", label: "Cream", className: "paper-cream" },
    { id: "paper-rose", label: "Rose", className: "paper-rose" },
    { id: "paper-sage", label: "Sage", className: "paper-sage" },
    { id: "paper-lavender", label: "Lavender", className: "paper-lavender" },
    { id: "paper-night", label: "Midnight", className: "paper-night" }
];

const JOURNAL_FONTS = [
    { value: "Caveat", label: "Handwritten" },
    { value: "Georgia", label: "Classic serif" },
    { value: "DM Sans", label: "Clean sans" },
    { value: "Playfair Display", label: "Elegant serif" }
];

const SCRAPBOOK_STICKERS = [
    "✦", "✧", "☾", "☼", "♡", "❀", "✿",
    "🦋", "🌷", "🍓", "🌙", "⭐", "🕯️",
    "🎀", "🪻", "🍄", "🌿", "🪞", "📖",
    "☁️", "🪐", "🧸", "🪷", "💌", "🕊️",
    "🪄", "🌼", "🍃", "🫧", "💫", "🪽"
];

/* ------------------------------------------------------------
   23. EDITOR STATE
   ------------------------------------------------------------ */

let editorDraft = null;
let editorSaveTimer = null;
let selectedMood = "";
let selectedTags = [];
let selectedPaperStyle = "paper-cream";
let selectedFont = "Caveat";
let selectedFontSize = 21;
let selectedTextColor = "#403448";
let selectedAlignment = "left";
let selectedSticker = null;
let scrapbookObjects = [];
let selectedScrapbookObjectId = null;
let scrapbookHistory = [];
let scrapbookFuture = [];
let lastEditorFocus = null;

/* ------------------------------------------------------------
   24. CREATE OR OPEN A JOURNAL ENTRY
   ------------------------------------------------------------ */

function openEditor(id, options = {}) {
    let entry = id ? getEntryById(id) : null;

    if (!entry) {
        entry = createEntry({
            title: options.title || "",
            mode: appData.settings.defaultWritingMode || "classic"
        });
    }

    editorEntryId = entry.id;
    appData.activeEntryId = entry.id;

    editorDraft = JSON.parse(JSON.stringify(entry));
    editorDraft.photos = Array.isArray(editorDraft.photos)
    ? editorDraft.photos
    : [];

    selectedMood = editorDraft.mood || "";
    selectedTags = Array.isArray(editorDraft.tags)
        ? [...editorDraft.tags]
        : [];

    selectedPaperStyle = editorDraft.paperStyle || "paper-cream";
    selectedFont = editorDraft.fontFamily || "Caveat";
    selectedFontSize = Number(editorDraft.fontSize) || 21;
    selectedTextColor = editorDraft.textColor || "#403448";
    selectedAlignment = editorDraft.alignment || "left";

    currentEditorMode = editorDraft.mode || "classic";

    scrapbookObjects = Array.isArray(editorDraft.scrapbookObjects)
        ? JSON.parse(JSON.stringify(editorDraft.scrapbookObjects))
        : [];

    scrapbookHistory = [];
    scrapbookFuture = [];
    selectedScrapbookObjectId = null;

    currentView = "editor";
    renderEditor();

    if (options.prompt) {
        const editor = $("#journal-content");

        if (editor) {
            editor.innerHTML =
                `<p><em>${escapeHTML(options.prompt)}</em></p><p><br></p>`;
            editor.focus();
            updateEditorDraft();
        }
    }

    if (options.focusContent) {
        $("#journal-content")?.focus();
    }

    window.scrollTo({ top: 0, behavior: "auto" });
}

/* ------------------------------------------------------------
   25. EDITOR TEMPLATE
   ------------------------------------------------------------ */

function renderEditor() {
    const root = $("#view-root");

    if (!root || !editorDraft) return;

    setBreadcrumb("A NEW CHAPTER");

    root.innerHTML = `
        <section class="editor-page reveal">

            <div class="editor-header">
                <div>
                    <span class="eyebrow">YOUR PRIVATE LITTLE UNIVERSE</span>
                    <h1 class="page-heading">A page of your own.</h1>
                    <p class="page-description">
                        There is no right way to tell your story.
                    </p>
                </div>

                <div class="editor-header-actions">
                    <button class="btn btn-secondary" data-editor-action="back">
                        ← Library
                    </button>

                    <button class="btn btn-secondary" data-editor-action="favorite">
                        ${editorDraft.favorite ? "♥ Saved" : "♡ Favorite"}
                    </button>

                    <button class="btn btn-primary" data-editor-action="save">
                        Save chapter ✦
                    </button>
                </div>
            </div>

            <div class="editor-meta-grid">

                <label class="field">
                    <span>Chapter title</span>
                    <input
                        id="journal-title"
                        type="text"
                        maxlength="160"
                        placeholder="A little moment worth keeping…"
                        value="${escapeHTML(editorDraft.title || "")}"
                    >
                </label>

                <label class="field">
                    <span>Date of this memory</span>
                    <input
                        id="journal-date"
                        type="date"
                        value="${escapeHTML(editorDraft.date || todayISO())}"
                    >
                </label>

            </div>

            <section class="editor-section">
                <div class="editor-section-heading">
                    <h2>How are you feeling?</h2>
                    <span class="optional-label">Entirely optional</span>
                </div>

                <div class="mood-picker">
                    ${JOURNAL_MOODS.map(mood => `
                        <button
                            class="mood-option ${selectedMood === mood.emoji ? "active" : ""}"
                            data-mood="${escapeHTML(mood.emoji)}"
                            title="${escapeHTML(mood.label)}"
                            aria-label="${escapeHTML(mood.label)}"
                            aria-pressed="${selectedMood === mood.emoji}"
                        >
                            <span>${mood.emoji}</span>
                            <small>${escapeHTML(mood.label)}</small>
                        </button>
                    `).join("")}
                </div>
            </section>

            <section class="editor-section">
                <div class="editor-section-heading">
                    <h2>Choose your writing world</h2>
                </div>

                <div class="mode-switcher">
                    <button
                        class="mode-option ${currentEditorMode === "classic" ? "active" : ""}"
                        data-editor-mode="classic"
                    >
                        <span>📖</span>
                        <span>
                            <strong>Classic journal</strong>
                            <small>A peaceful page for your words.</small>
                        </span>
                    </button>

                    <button
                        class="mode-option ${currentEditorMode === "scrapbook" ? "active" : ""}"
                        data-editor-mode="scrapbook"
                    >
                        <span>🎀</span>
                        <span>
                            <strong>Scrapbook studio</strong>
                            <small>Arrange memories like a collage.</small>
                        </span>
                    </button>
                </div>
            </section>

            <section class="editor-section">
                <div class="editor-section-heading">
                    <h2>Give this memory a few little labels</h2>
                </div>

                <div class="tag-editor">
                    <div class="tag-list" id="journal-tags">
                        ${selectedTags.map(tag => `
                            <button class="tag-chip removable"
                                data-remove-tag="${escapeHTML(tag)}">
                                ${escapeHTML(tag)} <span>×</span>
                            </button>
                        `).join("")}
                    </div>

                    <form id="tag-form" class="tag-form">
                        <input
                            id="tag-input"
                            type="text"
                            maxlength="35"
                            placeholder="Add a tag and press Enter…"
                        >
                        <button class="btn btn-secondary" type="submit">
                            Add tag
                        </button>
                    </form>
                </div>
            </section>

            <div id="classic-editor" class="${currentEditorMode === "classic" ? "" : "hidden"}">
                ${renderClassicEditor()}
            </div>

            <div id="scrapbook-editor" class="${currentEditorMode === "scrapbook" ? "" : "hidden"}">
                ${renderScrapbookEditor()}
            </div>

            <div class="editor-bottom-actions">
                <span id="editor-save-status" aria-live="polite">
                    Changes save automatically.
                </span>

                <button class="btn btn-primary" data-editor-action="save">
                    Save chapter ✦
                </button>
            </div>

        </section>
    `;

    setBreadcrumb("YOUR JOURNAL");

    bindEditorEvents();
    applyEditorFormatting();
}

/* ------------------------------------------------------------
   26. CLASSIC JOURNAL EDITOR
   ------------------------------------------------------------ */

function renderClassicEditor() {
    const content = editorDraft?.content || "";

    return `
        <section class="classic-editor-panel">

            <div class="editor-section-heading">
                <h2>Your notebook</h2>
                <span class="optional-label">This page belongs to you.</span>
            </div>

            <div class="editor-toolbar" role="toolbar" aria-label="Text formatting">

                <button type="button" data-format="bold"
                    title="Bold (Ctrl/Cmd+B)" aria-label="Bold">
                    <strong>B</strong>
                </button>

                <button type="button" data-format="italic"
                    title="Italic (Ctrl/Cmd+I)" aria-label="Italic">
                    <em>I</em>
                </button>

                <button type="button" data-format="underline"
                    title="Underline (Ctrl/Cmd+U)" aria-label="Underline">
                    <u>U</u>
                </button>

                <span class="toolbar-divider"></span>

                <button type="button" data-format="insertUnorderedList"
                    title="Bullet list" aria-label="Bullet list">☷</button>

                <button type="button" data-format="insertOrderedList"
                    title="Numbered list" aria-label="Numbered list">1.</button>

                <button type="button" data-format="formatBlock"
                    data-value="h2" title="Heading">H</button>

                <span class="toolbar-divider"></span>

                <button type="button" data-format="justifyLeft"
                    title="Align left">≡</button>

                <button type="button" data-format="justifyCenter"
                    title="Align center">☰</button>

                <button type="button" data-format="justifyRight"
                    title="Align right">≡</button>

                <span class="toolbar-divider"></span>

                <label class="toolbar-select-label">
                    <span class="sr-only">Writing font</span>
                    <select id="editor-font">
                        ${JOURNAL_FONTS.map(font => `
                            <option value="${escapeHTML(font.value)}"
                                ${selectedFont === font.value ? "selected" : ""}>
                                ${escapeHTML(font.label)}
                            </option>
                        `).join("")}
                    </select>
                </label>

                <label class="toolbar-select-label">
                    <span class="sr-only">Writing size</span>
                    <select id="editor-font-size">
                        ${[16, 18, 20, 21, 24, 28, 32].map(size => `
                            <option value="${size}"
                                ${selectedFontSize === size ? "selected" : ""}>
                                ${size}px
                            </option>
                        `).join("")}
                    </select>
                </label>

                <label class="color-tool" title="Text color">
                    A
                    <input id="editor-text-color" type="color"
                        value="${escapeHTML(selectedTextColor)}"
                        aria-label="Text color">
                </label>

                <button type="button" data-format="undo"
                    title="Undo">↶</button>

                <button type="button" data-format="redo"
                    title="Redo">↷</button>

            </div>

            <div class="paper-style-picker">
                <span>Paper</span>

                ${PAPER_STYLES.map(paper => `
                    <button
                        class="paper-style-option ${selectedPaperStyle === paper.id ? "active" : ""}"
                        data-paper-style="${paper.id}"
                        title="${escapeHTML(paper.label)}"
                        aria-label="${escapeHTML(paper.label)}"
                    >
                        ${escapeHTML(paper.label)}
                    </button>
                `).join("")}
            </div>

            <div class="notebook-stage">
                <article class="notebook-page ${escapeHTML(selectedPaperStyle)}"
                    id="notebook-page">

                    <div class="notebook-date">
                        ${escapeHTML(formatLongDate(editorDraft.date))}
                    </div>

                    <div
                        id="journal-content"
                        class="writing-area"
                        contenteditable="true"
                        role="textbox"
                        aria-label="Journal content"
                        aria-multiline="true"
                        data-placeholder="Begin anywhere… Write a thought, a memory, a dream, or absolutely nothing at all."
                        spellcheck="true"
                    >${content}</div>

                    <div class="notebook-footer">
                        <span>✧ The Hidden Chapter</span>
                        <span id="word-count">0 words</span>
                    </div>

                </article>
            </div>

            <section class="editor-section">
                <div class="editor-section-heading">
                    <h2>Little treasures to tuck inside</h2>
                </div>

                <div class="editor-insert-actions">
                    <button class="btn btn-secondary" data-editor-action="add-photo">
                        ＋ Add photos
                    </button>

                    <button class="btn btn-secondary" data-editor-action="add-sticker">
                        ✧ Add a sticker
                    </button>

                    <button class="btn btn-secondary" data-editor-action="insert-prompt">
                        ☾ Add a writing prompt
                    </button>
                </div>

                <div class="photo-gallery" id="journal-photo-gallery">
                    ${renderJournalPhotos()}
                </div>

                <div class="sticker-picker hidden" id="journal-sticker-picker">
                    ${SCRAPBOOK_STICKERS.map(sticker => `
                        <button type="button" data-insert-sticker="${escapeHTML(sticker)}">
                            ${sticker}
                        </button>
                    `).join("")}
                </div>
            </section>

        </section>
    `;
}

/* ------------------------------------------------------------
   27. SCRAPBOOK EDITOR
   ------------------------------------------------------------ */

function renderScrapbookEditor() {
    return `
        <section class="scrapbook-studio">

            <div class="editor-section-heading">
                <h2>Your memory collage</h2>
                <span class="optional-label">
                    Add objects, then arrange them on your page.
                </span>
            </div>

            <div class="scrapbook-tools">
                <button class="btn btn-secondary" data-scrap-action="add-text">
                    ＋ Text
                </button>

                <button class="btn btn-secondary" data-scrap-action="add-sticker">
                    ✧ Sticker
                </button>

                <button class="btn btn-secondary" data-scrap-action="add-photo">
                    ＋ Photo
                </button>

                <button class="btn btn-secondary" data-scrap-action="add-tape">
                    ▰ Washi tape
                </button>

                <button class="btn btn-secondary" data-scrap-action="undo">
                    ↶ Undo
                </button>

                <button class="btn btn-secondary" data-scrap-action="redo">
                    ↷ Redo
                </button>
            </div>

            <div class="scrapbook-workspace">

                <div class="scrapbook-stage">
                    <div class="scrapbook-page"
                        id="scrapbook-page"
                        tabindex="0"
                        aria-label="Scrapbook canvas">

                        ${scrapbookObjects.map(renderScrapbookObject).join("")}

                        ${scrapbookObjects.length === 0
            ? `<div class="scrapbook-empty-hint" id="scrapbook-empty-hint">
                                    <span>✧</span>
                                    <strong>Your page, your little universe</strong>
                                    <p>Add a piece of text, a sticker or a photo to begin.</p>
                                   </div>`
            : ""
        }

                    </div>
                </div>

                <aside class="scrapbook-sidebar">
                    <div class="card">
                        <h3>Sticker collection</h3>
                        <div class="scrapbook-sticker-grid">
                            ${SCRAPBOOK_STICKERS.map(sticker => `
                                <button type="button"
                                    data-scrap-sticker="${escapeHTML(sticker)}"
                                    aria-label="Add sticker ${escapeHTML(sticker)}">
                                    ${sticker}
                                </button>
                            `).join("")}
                        </div>
                    </div>

                    <div class="card" id="scrapbook-object-controls">
                        <h3>Selected object</h3>
                        <p class="muted-text">
                            Select an object on the page to edit or remove it.
                        </p>

                        <button class="btn btn-secondary"
                            data-scrap-action="duplicate">
                            Duplicate
                        </button>

                        <button class="btn btn-secondary"
                            data-scrap-action="forward">
                            Bring forward
                        </button>

                        <button class="btn btn-secondary"
                            data-scrap-action="backward">
                            Send backward
                        </button>

                        <button class="btn btn-danger"
                            data-scrap-action="delete">
                            Remove object
                        </button>
                    </div>
                </aside>

            </div>
        </section>
    `;
}

/* ------------------------------------------------------------
   28. SCRAPBOOK OBJECT RENDERING
   ------------------------------------------------------------ */

function renderScrapbookObject(object) {
    const selected = object.id === selectedScrapbookObjectId;

    const style = [
        `left:${Number(object.x) || 0}%`,
        `top:${Number(object.y) || 0}%`,
        `width:${Math.max(5, Math.min(100, Number(object.width) || 20))}%`,
        `z-index:${Number(object.zIndex) || 1}`,
        `transform:rotate(${Number(object.rotation) || 0}deg)`,
        `color:${escapeHTML(object.color || "#403448")}`,
        `font-size:${Math.max(10, Math.min(90, Number(object.fontSize) || 24))}px`
    ].join(";");

    let content = "";

    if (object.type === "sticker") {
        content = escapeHTML(object.text || "✧");
    } else if (object.type === "text") {
        content = escapeHTML(object.text || "Write something…");
    } else if (object.type === "tape") {
        content = `<span>${escapeHTML(object.text || "✦ ✧ ✦")}</span>`;
    } else if (object.type === "photo") {
        content = object.dataUrl
            ? `<img src="${object.dataUrl}" alt="${escapeHTML(object.alt || "Scrapbook photograph")}" draggable="false">`
            : `<span class="scrapbook-photo-placeholder">📷</span>`;
    }

    return `
        <div
            class="scrapbook-object scrapbook-object-${escapeHTML(object.type)} ${selected ? "selected" : ""}"
            data-scrap-object="${escapeHTML(object.id)}"
            style="${style}"
            tabindex="0"
            role="button"
            aria-label="${escapeHTML(object.type)} object"
        >
            ${content}
        </div>
    `;
}

/* ------------------------------------------------------------
   29. PHOTO GALLERY
   ------------------------------------------------------------ */

function renderJournalPhotos() {
    const photos = editorDraft?.photos || [];

    if (!photos.length) {
        return `<p class="muted-text photo-empty-message">
            Your photographs will appear here after you add them.
        </p>`;
    }

    return photos.map((photo, index) => `
        <figure class="journal-photo" data-photo-index="${index}">
            <img src="${photo.dataUrl}"
                alt="${escapeHTML(photo.caption || `Journal photograph ${index + 1}`)}">

            <figcaption>
                <input
                    type="text"
                    maxlength="180"
                    placeholder="A little caption…"
                    value="${escapeHTML(photo.caption || "")}"
                    data-photo-caption="${index}"
                >

                <button type="button"
                    class="icon-button"
                    data-remove-photo="${index}"
                    aria-label="Remove photo">×</button>
            </figcaption>
        </figure>
    `).join("");
}

/* ------------------------------------------------------------
   30. BIND EDITOR EVENTS
   ------------------------------------------------------------ */

function bindEditorEvents() {
    $("#journal-title")?.addEventListener("input", () => {
        editorDraft.title = $("#journal-title").value;
        scheduleEditorSave();
    });

    $("#journal-date")?.addEventListener("change", () => {
        editorDraft.date = $("#journal-date").value || todayISO();

        const dateLabel = $(".notebook-date");

        if (dateLabel) {
            dateLabel.textContent = formatLongDate(editorDraft.date);
        }

        scheduleEditorSave();
    });

    $("#journal-content")?.addEventListener("input", () => {
        updateEditorDraft();
        updateWordCount();
        scheduleEditorSave();
    });

    $("#journal-content")?.addEventListener("blur", () => {
        updateEditorDraft();
    });

    $("#tag-form")?.addEventListener("submit", event => {
        event.preventDefault();
        addEditorTag($("#tag-input")?.value || "");
    });

    $("#editor-font")?.addEventListener("change", event => {
        selectedFont = event.target.value;
        applyEditorFormatting();
        scheduleEditorSave();
    });

    $("#editor-font-size")?.addEventListener("change", event => {
        selectedFontSize = Number(event.target.value) || 21;
        applyEditorFormatting();
        scheduleEditorSave();
    });

    $("#editor-text-color")?.addEventListener("input", event => {
        selectedTextColor = event.target.value;
        applyEditorFormatting();
        scheduleEditorSave();
    });

    $("#journal-photo-gallery")?.addEventListener("input", event => {
        const captionIndex = event.target.dataset.photoCaption;

        if (captionIndex === undefined) return;

        const photo = editorDraft.photos[Number(captionIndex)];

        if (!photo) return;

        photo.caption = event.target.value;
        scheduleEditorSave();
    });

    $("#journal-photo-gallery")?.addEventListener("click", event => {
        const button = event.target.closest("[data-remove-photo]");

        if (!button) return;

        const index = Number(button.dataset.removePhoto);

        editorDraft.photos.splice(index, 1);

        renderPhotoGalleryOnly();
        scheduleEditorSave();
    });

    $("#view-root")?.querySelectorAll("[data-mood]").forEach(button => {
        button.addEventListener("click", () => {
            const mood = button.dataset.mood;

            selectedMood = selectedMood === mood ? "" : mood;

            editorDraft.mood = selectedMood;

            $$("#view-root [data-mood]").forEach(item => {
                const active = item.dataset.mood === selectedMood;

                item.classList.toggle("active", active);
                item.setAttribute("aria-pressed", String(active));
            });

            scheduleEditorSave();
        });
    });

    $("#view-root")?.querySelectorAll("[data-editor-mode]").forEach(button => {
        button.addEventListener("click", () => {
            updateEditorDraft();

            currentEditorMode = button.dataset.editorMode;
            editorDraft.mode = currentEditorMode;

            renderEditor();
            scheduleEditorSave();
        });
    });

    $("#view-root")?.querySelectorAll("[data-paper-style]").forEach(button => {
        button.addEventListener("click", () => {
            selectedPaperStyle = button.dataset.paperStyle;

            editorDraft.paperStyle = selectedPaperStyle;

            const page = $("#notebook-page");

            if (page) {
                page.classList.remove(...PAPER_STYLES.map(paper => paper.className));
                page.classList.add(selectedPaperStyle);
            }

            $$("#view-root [data-paper-style]").forEach(item => {
                item.classList.toggle(
                    "active",
                    item.dataset.paperStyle === selectedPaperStyle
                );
            });

            scheduleEditorSave();
        });
    });

    $("#view-root")?.querySelectorAll("[data-format]").forEach(button => {
        button.addEventListener("mousedown", event => {
            event.preventDefault();
        });

        button.addEventListener("click", () => {
            applyTextCommand(button.dataset.format, button.dataset.value);
        });
    });

    $("#view-root")?.querySelectorAll("[data-editor-action]").forEach(button => {
        button.addEventListener("click", () => {
            handleEditorAction(button.dataset.editorAction);
        });
    });

    $("#view-root")?.querySelectorAll("[data-remove-tag]").forEach(button => {
        button.addEventListener("click", () => {
            removeEditorTag(button.dataset.removeTag);
        });
    });

    $("#view-root")?.querySelectorAll("[data-insert-sticker]").forEach(button => {
        button.addEventListener("click", () => {
            insertStickerIntoJournal(button.dataset.insertSticker);
        });
    });

    $("#view-root")?.querySelectorAll("[data-scrap-action]").forEach(button => {
        button.addEventListener("click", () => {
            handleScrapbookAction(button.dataset.scrapAction);
        });
    });

    $("#view-root")?.querySelectorAll("[data-scrap-sticker]").forEach(button => {
        button.addEventListener("click", () => {
            addScrapbookObject({
                type: "sticker",
                text: button.dataset.scrapSticker
            });
        });
    });

    bindScrapbookCanvas();
    updateWordCount();
}

/* ------------------------------------------------------------
   31. UPDATE DRAFT AND AUTOSAVE
   ------------------------------------------------------------ */

function updateEditorDraft() {
    if (!editorDraft) return;

    const titleInput = $("#journal-title");
    const dateInput = $("#journal-date");
    const content = $("#journal-content");

    if (titleInput) editorDraft.title = titleInput.value;
    if (dateInput) editorDraft.date = dateInput.value || todayISO();
    if (content) editorDraft.content = content.innerHTML;

    editorDraft.mood = selectedMood;
    editorDraft.tags = [...selectedTags];
    editorDraft.paperStyle = selectedPaperStyle;
    editorDraft.fontFamily = selectedFont;
    editorDraft.fontSize = selectedFontSize;
    editorDraft.textColor = selectedTextColor;
    editorDraft.alignment = selectedAlignment;
    editorDraft.mode = currentEditorMode;

    if (currentEditorMode === "scrapbook") {
        editorDraft.scrapbookObjects =
            JSON.parse(JSON.stringify(scrapbookObjects));
    }
}

function scheduleEditorSave() {
    if (!editorDraft) return;

    updateEditorDraft();

    const status = $("#editor-save-status");

    if (status) status.textContent = "Saving your changes…";

    clearTimeout(editorSaveTimer);

    editorSaveTimer = setTimeout(() => {
        updateEditorDraft();

        const index = appData.entries.findIndex(
            entry => entry.id === editorEntryId
        );

        if (index !== -1) {
            appData.entries[index] = {
                ...appData.entries[index],
                ...JSON.parse(JSON.stringify(editorDraft)),
                updatedAt: new Date().toISOString()
            };
        }

        const saved = saveData();

        if (status) {
            status.textContent = saved
                ? "All changes saved privately ✦"
                : "Save failed — please export a backup.";
        }

        updateCounts();
    }, APP_CONFIG.autosaveDelay);
}

function saveCurrentEntry(showNotification = true) {
    if (!editorDraft) return false;

    clearTimeout(editorSaveTimer);

    updateEditorDraft();

    const index = appData.entries.findIndex(
        entry => entry.id === editorEntryId
    );

    if (index === -1) {
        appData.entries.unshift(editorDraft);
    } else {
        appData.entries[index] = {
            ...appData.entries[index],
            ...JSON.parse(JSON.stringify(editorDraft)),
            updatedAt: new Date().toISOString()
        };
    }

    const saved = saveData({ notify: showNotification });

    updateCounts();

    const status = $("#editor-save-status");

    if (status) {
        status.textContent = saved
            ? "All changes saved privately ✦"
            : "Save failed — please export a backup.";
    }

    return saved;
}

/* ------------------------------------------------------------
   32. TEXT FORMATTING
   ------------------------------------------------------------ */

function applyTextCommand(command, value) {
    const editor = $("#journal-content");

    if (!editor) return;

    editor.focus();

    const supportedCommands = [
        "bold",
        "italic",
        "underline",
        "insertUnorderedList",
        "insertOrderedList",
        "justifyLeft",
        "justifyCenter",
        "justifyRight",
        "undo",
        "redo",
        "formatBlock"
    ];

    if (!supportedCommands.includes(command)) return;

    try {
        document.execCommand(command, false, value || null);
    } catch (error) {
        console.warn("Formatting command unavailable:", command, error);
    }

    updateEditorDraft();
    scheduleEditorSave();
}

function applyEditorFormatting() {
    const editor = $("#journal-content");

    if (!editor) return;

    editor.style.fontFamily = `"${selectedFont}", serif`;
    editor.style.fontSize = `${selectedFontSize}px`;
    editor.style.color = selectedTextColor;
    editor.style.textAlign = selectedAlignment;
}

function updateWordCount() {
    const editor = $("#journal-content");
    const counter = $("#word-count");

    if (!editor || !counter) return;

    const text = editor.innerText.trim();

    const words = text
        ? text.split(/\s+/).filter(Boolean).length
        : 0;

    counter.textContent = `${words} ${words === 1 ? "word" : "words"}`;
}

/* ------------------------------------------------------------
   33. TAG MANAGEMENT
   ------------------------------------------------------------ */

function addEditorTag(rawTag) {
    const tag = String(rawTag || "").trim().replace(/\s+/g, " ");

    if (!tag) return;

    if (selectedTags.some(existing =>
        existing.toLowerCase() === tag.toLowerCase()
    )) {
        showToast("That tag is already on this chapter.", "info");
        return;
    }

    if (selectedTags.length >= 12) {
        showToast("This chapter can have up to 12 tags.", "info");
        return;
    }

    selectedTags.push(tag);
    editorDraft.tags = [...selectedTags];

    renderTagList();
    scheduleEditorSave();

    const input = $("#tag-input");

    if (input) {
        input.value = "";
        input.focus();
    }
}

function removeEditorTag(tag) {
    selectedTags = selectedTags.filter(item => item !== tag);

    if (editorDraft) editorDraft.tags = [...selectedTags];

    renderTagList();
    scheduleEditorSave();
}

function renderTagList() {
    const list = $("#journal-tags");

    if (!list) return;

    list.innerHTML = selectedTags.map(tag => `
        <button class="tag-chip removable"
            data-remove-tag="${escapeHTML(tag)}">
            ${escapeHTML(tag)} <span>×</span>
        </button>
    `).join("");

    $$("[data-remove-tag]", list).forEach(button => {
        button.addEventListener("click", () => {
            removeEditorTag(button.dataset.removeTag);
        });
    });
}

/* ------------------------------------------------------------
   34. EDITOR ACTIONS
   ------------------------------------------------------------ */

function handleEditorAction(action) {
    switch (action) {
        case "back":
            saveCurrentEntry(false);
            currentView = "home";
            renderView();
            break;

        case "save":
            if (saveCurrentEntry(true)) {
                currentView = "editor";
            }
            break;

        case "favorite":
            if (editorDraft) {
                editorDraft.favorite = !editorDraft.favorite;

                saveCurrentEntry(false);
                renderEditor();

                showToast(
                    editorDraft.favorite
                        ? "Saved among your little treasures. ♥"
                        : "Removed from your little treasures.",
                    "success"
                );
            }
            break;

        case "add-photo":
            $("#photo-input")?.click();
            break;

        case "add-sticker":
            $("#journal-sticker-picker")?.classList.toggle("hidden");
            break;

        case "insert-prompt":
            insertWritingPrompt();
            break;

        default:
            break;
    }
}

/* ------------------------------------------------------------
   35. PHOTO UPLOADS
   ------------------------------------------------------------ */

const photoInput = $("#photo-input");

if (photoInput) {
    photoInput.addEventListener("change", async event => {
        if (!editorDraft) return;

        const files = Array.from(event.target.files || []);

        if (!files.length) return;

        const remaining = Math.max(0, 8 - editorDraft.photos.length);

        if (remaining === 0) {
            showToast("This chapter already has eight photos.", "info");
            photoInput.value = "";
            return;
        }

        for (const file of files.slice(0, remaining)) {
            if (!file.type.startsWith("image/")) continue;

            if (file.size > 3 * 1024 * 1024) {
                showToast(
                    `${file.name} is larger than 3 MB. Choose a smaller image.`,
                    "info"
                );
                continue;
            }

            try {
                const dataUrl = await readFileAsDataURL(file);

                editorDraft.photos.push({
                    id: makeId(),
                    name: file.name,
                    dataUrl,
                    caption: ""
                });
            } catch (error) {
                console.error("Could not read photo:", error);
                showToast("One photo could not be added.", "error");
            }
        }

        renderPhotoGalleryOnly();
        scheduleEditorSave();

        photoInput.value = "";
    });
}

function readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(reader.error);

        reader.readAsDataURL(file);
    });
}

function renderPhotoGalleryOnly() {
    const gallery = $("#journal-photo-gallery");

    if (gallery) {
        gallery.innerHTML = renderJournalPhotos();
    }
}

/* ------------------------------------------------------------
   36. JOURNAL STICKERS
   ------------------------------------------------------------ */

function insertStickerIntoJournal(sticker) {
    const editor = $("#journal-content");

    if (!editor) return;

    editor.focus();

    const selection = window.getSelection();

    if (!selection || !selection.rangeCount) {
        editor.append(document.createTextNode(` ${sticker} `));
    } else {
        const range = selection.getRangeAt(0);

        if (!editor.contains(range.commonAncestorContainer)) {
            editor.append(document.createTextNode(` ${sticker} `));
        } else {
            range.deleteContents();

            const node = document.createTextNode(` ${sticker} `);

            range.insertNode(node);
            range.setStartAfter(node);
            range.collapse(true);

            selection.removeAllRanges();
            selection.addRange(range);
        }
    }

    updateEditorDraft();
    updateWordCount();
    scheduleEditorSave();
}

/* ------------------------------------------------------------
   37. WRITING PROMPTS
   ------------------------------------------------------------ */

const WRITING_PROMPTS = [
    "What ordinary moment felt a little magical today?",
    "What would you like your future self to remember?",
    "What is something small that made you smile recently?",
    "Describe a place where you feel completely at ease.",
    "What are you curious about right now?",
    "What is something you have learned about yourself lately?",
    "If today had a colour, what would it be and why?",
    "What is one thing you would like to make more room for?",
    "Write about a sound, scent or detail you never want to forget.",
    "What would a gentle day look like for you?"
];

function insertWritingPrompt() {
    const editor = $("#journal-content");

    if (!editor) return;

    const prompt = WRITING_PROMPTS[
        Math.floor(Math.random() * WRITING_PROMPTS.length)
    ];

    editor.focus();

    const paragraph = document.createElement("p");
    const emphasis = document.createElement("em");

    emphasis.textContent = prompt;
    paragraph.appendChild(emphasis);

    editor.appendChild(paragraph);
    editor.appendChild(document.createElement("p"));

    updateEditorDraft();
    updateWordCount();
    scheduleEditorSave();

    showToast("A little writing inspiration has arrived. ✧", "success");
}

/* ------------------------------------------------------------
   38. SCRAPBOOK HISTORY
   ------------------------------------------------------------ */

function recordScrapbookHistory() {
    scrapbookHistory.push(
        JSON.stringify(scrapbookObjects)
    );

    if (scrapbookHistory.length > 40) {
        scrapbookHistory.shift();
    }

    scrapbookFuture = [];
}

function undoScrapbook() {
    if (!scrapbookHistory.length) {
        showToast("Nothing to undo just yet.", "info");
        return;
    }

    scrapbookFuture.push(JSON.stringify(scrapbookObjects));

    scrapbookObjects = JSON.parse(scrapbookHistory.pop());

    selectedScrapbookObjectId = null;

    renderScrapbookCanvasOnly();
    scheduleEditorSave();
}

function redoScrapbook() {
    if (!scrapbookFuture.length) {
        showToast("Nothing to redo just yet.", "info");
        return;
    }

    scrapbookHistory.push(JSON.stringify(scrapbookObjects));

    scrapbookObjects = JSON.parse(scrapbookFuture.pop());

    selectedScrapbookObjectId = null;

    renderScrapbookCanvasOnly();
    scheduleEditorSave();
}

/* ------------------------------------------------------------
   39. ADD SCRAPBOOK OBJECTS
   ------------------------------------------------------------ */

function addScrapbookObject(options = {}) {
    if (scrapbookObjects.length >= 100) {
        showToast("This scrapbook page has reached its object limit.", "info");
        return;
    }

    recordScrapbookHistory();

    const defaults = {
        id: makeId(),
        type: "sticker",
        text: "✧",
        x: 35 + Math.random() * 10,
        y: 30 + Math.random() * 10,
        width: 20,
        rotation: Math.round(Math.random() * 12 - 6),
        zIndex: scrapbookObjects.length + 1,
        color: "#403448",
        fontSize: 30,
        dataUrl: "",
        alt: ""
    };

    const object = {
        ...defaults,
        ...options,
        id: makeId()
    };

    scrapbookObjects.push(object);
    selectedScrapbookObjectId = object.id;

    renderScrapbookCanvasOnly();
    scheduleEditorSave();
}

function handleScrapbookAction(action) {
    const selected = scrapbookObjects.find(
        object => object.id === selectedScrapbookObjectId
    );

    switch (action) {
        case "add-text":
            addScrapbookObject({
                type: "text",
                text: "Write your little thought here…",
                width: 40,
                fontSize: 22
            });
            break;

        case "add-sticker":
            addScrapbookObject({
                type: "sticker",
                text: "✧"
            });
            break;

        case "add-photo":
            showToast("Choose Add photos from the classic editor to attach images.", "info");
            break;

        case "add-tape":
            addScrapbookObject({
                type: "tape",
                text: "✦ ✧ ✦",
                width: 35,
                rotation: -3,
                color: "#c88ea8",
                fontSize: 18
            });
            break;

        case "undo":
            undoScrapbook();
            break;

        case "redo":
            redoScrapbook();
            break;

        case "duplicate":
            if (selected) {
                addScrapbookObject({
                    ...selected,
                    id: undefined,
                    x: Math.min(85, Number(selected.x) + 5),
                    y: Math.min(85, Number(selected.y) + 5),
                    zIndex: scrapbookObjects.length + 1
                });
            }
            break;

        case "delete":
            if (selected) {
                recordScrapbookHistory();

                scrapbookObjects = scrapbookObjects.filter(
                    object => object.id !== selected.id
                );

                selectedScrapbookObjectId = null;

                renderScrapbookCanvasOnly();
                scheduleEditorSave();
            }
            break;

        case "forward":
            if (selected) {
                recordScrapbookHistory();

                selected.zIndex =
                    Math.max(...scrapbookObjects.map(object => Number(object.zIndex) || 1)) + 1;

                renderScrapbookCanvasOnly();
                scheduleEditorSave();
            }
            break;

        case "backward":
            if (selected) {
                recordScrapbookHistory();

                selected.zIndex = Math.max(
                    1,
                    (Number(selected.zIndex) || 1) - 1
                );

                renderScrapbookCanvasOnly();
                scheduleEditorSave();
            }
            break;

        default:
            break;
    }
}

/* ------------------------------------------------------------
   40. SCRAPBOOK CANVAS INTERACTIONS
   ------------------------------------------------------------ */

function bindScrapbookCanvas() {
    const canvas = $("#scrapbook-page");

    if (!canvas) return;

    canvas.addEventListener("click", event => {
        const objectElement = event.target.closest("[data-scrap-object]");

        if (!objectElement) return;

        selectedScrapbookObjectId = objectElement.dataset.scrapObject;

        $$(".scrapbook-object", canvas).forEach(element => {
            element.classList.toggle(
                "selected",
                element.dataset.scrapObject === selectedScrapbookObjectId
            );
        });
    });

    canvas.addEventListener("dblclick", event => {
        const objectElement = event.target.closest("[data-scrap-object]");

        if (!objectElement) return;

        const object = scrapbookObjects.find(
            item => item.id === objectElement.dataset.scrapObject
        );

        if (!object || !["text", "sticker"].includes(object.type)) return;

        const replacement = window.prompt(
            "Edit this scrapbook item:",
            object.text || ""
        );

        if (replacement === null) return;

        recordScrapbookHistory();

        object.text = replacement;

        renderScrapbookCanvasOnly();
        scheduleEditorSave();
    });

    canvas.addEventListener("keydown", event => {
        const objectElement = event.target.closest("[data-scrap-object]");

        if (!objectElement) return;

        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();

            selectedScrapbookObjectId = objectElement.dataset.scrapObject;

            $$(".scrapbook-object", canvas).forEach(element => {
                element.classList.toggle(
                    "selected",
                    element.dataset.scrapObject === selectedScrapbookObjectId
                );
            });
        }
    });

    let dragState = null;

    canvas.addEventListener("pointerdown", event => {
        const element = event.target.closest("[data-scrap-object]");

        if (!element || event.button !== 0) return;

        const object = scrapbookObjects.find(
            item => item.id === element.dataset.scrapObject
        );

        if (!object) return;

        selectedScrapbookObjectId = object.id;

        recordScrapbookHistory();

        dragState = {
            pointerId: event.pointerId,
            startX: event.clientX,
            startY: event.clientY,
            originalX: Number(object.x) || 0,
            originalY: Number(object.y) || 0,
            object
        };

        element.setPointerCapture?.(event.pointerId);
    });

    canvas.addEventListener("pointermove", event => {
        if (!dragState || dragState.pointerId !== event.pointerId) return;

        const rect = canvas.getBoundingClientRect();

        if (!rect.width || !rect.height) return;

        const dx = ((event.clientX - dragState.startX) / rect.width) * 100;
        const dy = ((event.clientY - dragState.startY) / rect.height) * 100;

        dragState.object.x = Math.max(
            0,
            Math.min(95, dragState.originalX + dx)
        );

        dragState.object.y = Math.max(
            0,
            Math.min(95, dragState.originalY + dy)
        );

        const element = canvas.querySelector(
            `[data-scrap-object="${CSS.escape(dragState.object.id)}"]`
        );

        if (element) {
            element.style.left = `${dragState.object.x}%`;
            element.style.top = `${dragState.object.y}%`;
        }
    });

    const finishDrag = event => {
        if (!dragState || dragState.pointerId !== event.pointerId) return;

        dragState = null;

        renderScrapbookCanvasOnly();
        scheduleEditorSave();
    };

    canvas.addEventListener("pointerup", finishDrag);
    canvas.addEventListener("pointercancel", finishDrag);
}

function renderScrapbookCanvasOnly() {
    const canvas = $("#scrapbook-page");

    if (!canvas) {
        renderEditor();
        return;
    }

    canvas.innerHTML = `
        ${scrapbookObjects.map(renderScrapbookObject).join("")}

        ${scrapbookObjects.length === 0
            ? `<div class="scrapbook-empty-hint">
                    <span>✧</span>
                    <strong>Your page, your little universe</strong>
                    <p>Add a piece of text, a sticker or a photo to begin.</p>
                   </div>`
            : ""
        }
    `;

    bindScrapbookCanvas();
}

/* ------------------------------------------------------------
   41. FINISH PART 2
   ------------------------------------------------------------ */

console.info("The Hidden Chapter — editor module loaded.");

/* ============================================================
   THE HIDDEN CHAPTER
   JavaScript — Part 3
   Observatory • Memory Calendar • Time Capsules
   Reflection Garden • Curiosity Shop
   ============================================================ */

/* ------------------------------------------------------------
   42. SHARED UTILITIES
   ------------------------------------------------------------ */

function hcEnsureCollections() {
    if (!Array.isArray(appData.entries)) appData.entries = [];

    if (!Array.isArray(appData.reflections)) {
        appData.reflections = [];
    }

    if (!Array.isArray(appData.timeCapsules)) {
        appData.timeCapsules = [];
    }

    if (!Array.isArray(appData.savedTemplates)) {
        appData.savedTemplates = [];
    }

    if (!appData.settings || typeof appData.settings !== "object") {
        appData.settings = {};
    }
}

function hcText(value) {
    if (typeof escapeHTML === "function") {
        return escapeHTML(String(value ?? ""));
    }

    return String(value ?? "").replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[character]);
}

function hcDate(value) {
    if (!value) return null;

    const date = new Date(`${value}T12:00:00`);

    return Number.isNaN(date.getTime()) ? null : date;
}

function hcDateKey(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function hcMonthLabel(date) {
    return date.toLocaleDateString(undefined, {
        month: "long",
        year: "numeric"
    });
}

function hcEntryText(entry) {
    const wrapper = document.createElement("div");
    wrapper.innerHTML = entry.content || "";

    return (wrapper.innerText || wrapper.textContent || "")
        .replace(/\s+/g, " ")
        .trim();
}

function hcEntryExcerpt(entry, limit = 180) {
    const text = hcEntryText(entry);

    if (text.length <= limit) return text;

    return `${text.slice(0, limit).trimEnd()}…`;
}

function hcEntriesNewestFirst() {
    return [...appData.entries].sort((a, b) => {
        const dateA = new Date(a.updatedAt || a.date || 0).getTime();
        const dateB = new Date(b.updatedAt || b.date || 0).getTime();

        return dateB - dateA;
    });
}

function hcPersist(message = "") {
    try {
        const result = saveData();

        if (result === false) {
            showToast(
                "Your changes could not be saved. Please export a backup.",
                "error"
            );

            return false;
        }

        if (message) showToast(message, "success");

        return true;
    } catch (error) {
        console.error("The Hidden Chapter could not save data:", error);

        showToast(
            "Saving failed. Please export a backup before leaving.",
            "error"
        );

        return false;
    }
}

function hcCard(entry) {
    const mood = entry.mood || "✧";
    const title = entry.title || "An untitled chapter";
    const date = hcDate(entry.date);
    const dateText = date
        ? date.toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
            year: "numeric"
        })
        : "Undated memory";

    return `
        <article class="card memory-card">
            <div class="memory-card-top">
                <span class="memory-mood">${hcText(mood)}</span>
                <span class="muted-text">${hcText(dateText)}</span>
            </div>

            <h3>${hcText(title)}</h3>

            <p>${hcText(hcEntryExcerpt(entry) || "A blank page, waiting for your words.")}</p>

            <div class="memory-card-bottom">
                <span>${entry.favorite ? "♥ Little treasure" : "✧ A chapter"}</span>

                <button
                    class="btn btn-secondary"
                    data-hc-open-entry="${hcText(entry.id)}"
                >
                    Open chapter →
                </button>
            </div>
        </article>
    `;
}

function hcPageHeader(eyebrow, title, description) {
    return `
        <div class="page-header">
            <span class="eyebrow">${hcText(eyebrow)}</span>
            <h1 class="page-heading">${hcText(title)}</h1>
            <p class="page-description">${hcText(description)}</p>
        </div>
    `;
}

function hcEmptyState(symbol, title, description, action = "") {
    return `
        <div class="empty-state">
            <span class="empty-state-symbol">${hcText(symbol)}</span>
            <h3>${hcText(title)}</h3>
            <p>${hcText(description)}</p>
            ${action}
        </div>
    `;
}

/* ------------------------------------------------------------
   43. OBSERVATORY STATE
   ------------------------------------------------------------ */

let hcCalendarMonth = new Date();
let hcCalendarSelectedDate = todayISO();
let hcObservatoryFilter = "all";

function hcSetView(view, breadcrumb) {
    currentView = view;

    if (typeof setBreadcrumb === "function") {
        setBreadcrumb(breadcrumb);
    }

    renderView();
}

/* ------------------------------------------------------------
   44. OBSERVATORY: MEMORY CALENDAR
   ------------------------------------------------------------ */

function renderObservatory() {
    hcEnsureCollections();

    const root = $("#view-root");

    if (!root) return;

    currentView = "memories";

    const entries = hcEntriesNewestFirst();

    const selectedEntries = appData.entries.filter(
        entry => entry.date === hcCalendarSelectedDate
    );

    const year = hcCalendarMonth.getFullYear();
    const month = hcCalendarMonth.getMonth();

    const firstDay = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // Convert Sunday-first weekdays to a Monday-first calendar.
    const leadingBlanks = (firstDay.getDay() + 6) % 7;

    const entryDates = new Set(
        appData.entries.map(entry => entry.date).filter(Boolean)
    );

    const today = todayISO();

    let calendarCells = "";

    for (let i = 0; i < leadingBlanks; i++) {
        calendarCells += `<span class="calendar-day calendar-day-empty" aria-hidden="true"></span>`;
    }

    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day);
        const key = hcDateKey(date);
        const hasMemory = entryDates.has(key);
        const isToday = key === today;
        const isSelected = key === hcCalendarSelectedDate;

        calendarCells += `
            <button
                class="calendar-day ${hasMemory ? "has-memory" : ""} ${isToday ? "is-today" : ""} ${isSelected ? "is-selected" : ""}"
                data-hc-calendar-date="${key}"
                aria-pressed="${isSelected}"
                aria-label="${hcText(date.toLocaleDateString(undefined, {
            month: "long",
            day: "numeric",
            year: "numeric"
        }))}${hasMemory ? ", has journal entries" : ""}"
            >
                <span>${day}</span>
                ${hasMemory ? `<i aria-hidden="true">✦</i>` : ""}
            </button>
        `;
    }

    const selectedDate = hcDate(hcCalendarSelectedDate);
    const selectedDateLabel = selectedDate
        ? selectedDate.toLocaleDateString(undefined, {
            weekday: "long",
            month: "long",
            day: "numeric",
            year: "numeric"
        })
        : hcCalendarSelectedDate;

    root.innerHTML = `
        <section class="view-page observatory-page reveal">
            ${hcPageHeader(
        "THE OBSERVATORY",
        "A sky full of memories.",
        "Return to the moments that made your story yours."
    )}

            <div class="observatory-overview grid grid-3">
                <article class="card stat-card">
                    <span class="stat-symbol">📖</span>
                    <span class="stat-value">${appData.entries.length}</span>
                    <span class="stat-label">Chapters written</span>
                </article>

                <article class="card stat-card">
                    <span class="stat-symbol">♥</span>
                    <span class="stat-value">${appData.entries.filter(entry => entry.favorite).length}</span>
                    <span class="stat-label">Little treasures</span>
                </article>

                <article class="card stat-card">
                    <span class="stat-symbol">☾</span>
                    <span class="stat-value">${new Set(appData.entries.map(entry => entry.date).filter(Boolean)).size}</span>
                    <span class="stat-label">Days remembered</span>
                </article>
            </div>

            <div class="observatory-layout">
                <section class="card calendar-card">
                    <div class="calendar-heading">
                        <button class="icon-button"
                            data-hc-calendar-move="-1"
                            aria-label="Previous month">←</button>

                        <h2>${hcText(hcMonthLabel(hcCalendarMonth))}</h2>

                        <button class="icon-button"
                            data-hc-calendar-move="1"
                            aria-label="Next month">→</button>
                    </div>

                    <div class="calendar-weekdays" aria-hidden="true">
                        <span>Mon</span><span>Tue</span><span>Wed</span>
                        <span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span>
                    </div>

                    <div class="calendar-grid">
                        ${calendarCells}
                    </div>

                    <div class="calendar-legend">
                        <span><i class="calendar-legend-dot"></i> A day with a memory</span>
                        <button class="btn btn-secondary"
                            data-hc-calendar-today="true">Today</button>
                    </div>
                </section>

                <section class="card calendar-day-details">
                    <span class="eyebrow">A PAGE IN TIME</span>
                    <h2>${hcText(selectedDateLabel)}</h2>

                    ${selectedEntries.length
            ? selectedEntries.map(entry => `
                                <button class="timeline-entry"
                                    data-hc-open-entry="${hcText(entry.id)}">
                                    <span class="timeline-entry-mood">${hcText(entry.mood || "✧")}</span>
                                    <span>
                                        <strong>${hcText(entry.title || "An untitled chapter")}</strong>
                                        <small>${hcText(hcEntryExcerpt(entry, 95) || "Open to revisit this page.")}</small>
                                    </span>
                                    <span>→</span>
                                </button>
                            `).join("")
            : hcEmptyState(
                "✧",
                "A quiet page",
                "There are no chapters saved for this date yet.",
                `<button class="btn btn-primary" data-hc-new-entry="${hcCalendarSelectedDate}">Write for this day</button>`
            )
        }
                </section>
            </div>

            <section class="observatory-timeline">
                <div class="section-heading">
                    <div>
                        <span class="eyebrow">YOUR STORY SO FAR</span>
                        <h2>The memory timeline</h2>
                    </div>

                    <select id="hc-timeline-filter" aria-label="Filter timeline">
                        <option value="all" ${hcObservatoryFilter === "all" ? "selected" : ""}>All chapters</option>
                        <option value="favorites" ${hcObservatoryFilter === "favorites" ? "selected" : ""}>Little treasures</option>
                    </select>
                </div>

                <div class="memory-grid grid grid-2">
                    ${entries
            .filter(entry => hcObservatoryFilter !== "favorites" || entry.favorite)
            .slice(0, 20)
            .map(hcCard)
            .join("")
        ||
        hcEmptyState(
            "☾",
            "Your timeline is waiting",
            "Write a chapter and it will find its place here.",
            `<button class="btn btn-primary" data-hc-new-entry="">Write your first chapter</button>`
        )
        }
                </div>

                ${entries.length > 20
            ? `<p class="muted-text">Showing the 20 most recent chapters. Use search to find an older memory.</p>`
            : ""
        }
            </section>

            ${renderTimeCapsulesSection()}
        </section>
    `;

    bindPart3Events();
}

/* ------------------------------------------------------------
   45. TIME CAPSULES
   ------------------------------------------------------------ */

function renderTimeCapsulesSection() {
    const capsules = appData.timeCapsules || [];
    const today = todayISO();

    const ready = capsules.filter(capsule => capsule.revealDate <= today);
    const waiting = capsules.filter(capsule => capsule.revealDate > today);

    return `
        <section class="time-capsules-section">
            <div class="section-heading">
                <div>
                    <span class="eyebrow">A LETTER THROUGH TIME</span>
                    <h2>Time capsules</h2>
                    <p class="page-description">
                        Leave a note for a future version of yourself.
                    </p>
                </div>

                <button class="btn btn-primary" data-hc-capsule-create="true">
                    ＋ Write a time capsule
                </button>
            </div>

            ${ready.length
            ? `
                        <div class="capsule-grid grid grid-2">
                            ${ready.map(capsule => `
                                <article class="card capsule-card">
                                    <span class="capsule-symbol">💌</span>
                                    <span class="eyebrow">READY TO OPEN</span>
                                    <h3>${hcText(capsule.title || "A letter to myself")}</h3>
                                    <p>${hcText(capsule.message)}</p>
                                    <small>Written ${hcText(capsule.createdDate || "")}</small>
                                    <button class="btn btn-secondary"
                                        data-hc-capsule-delete="${hcText(capsule.id)}">
                                        Archive letter
                                    </button>
                                </article>
                            `).join("")}
                        </div>
                    `
            : hcEmptyState(
                "💌",
                "No letters to open just yet",
                "When a time capsule reaches its reveal date, its message will appear here."
            )
        }

            ${waiting.length
            ? `
                        <h3 class="capsule-subheading">Still tucked away</h3>
                        <div class="capsule-waiting-list">
                            ${waiting.map(capsule => `
                                <div class="capsule-waiting-row">
                                    <span>🔒</span>
                                    <span>
                                        <strong>${hcText(capsule.title || "A letter to myself")}</strong>
                                        <small>Opens on ${hcText(capsule.revealDate)}</small>
                                    </span>
                                    <button class="btn btn-secondary"
                                        data-hc-capsule-delete="${hcText(capsule.id)}">
                                        Delete
                                    </button>
                                </div>
                            `).join("")}
                        </div>
                    `
            : ""
        }

            <p class="muted-text">
                Time capsules are stored in this browser, not sent to the future automatically.
                They become visible here when you open the app on or after the reveal date.
            </p>
        </section>
    `;
}

function createTimeCapsule() {
    const title = window.prompt(
        "Give your future letter a title:",
        "Dear future me…"
    );

    if (title === null) return;

    const message = window.prompt(
        "What would you like your future self to read?"
    );

    if (message === null || !message.trim()) {
        showToast("A time capsule needs a message.", "info");
        return;
    }

    const revealDate = window.prompt(
        "When should it become available? Use YYYY-MM-DD.",
        `${new Date().getFullYear() + 1}-${String(new Date().getMonth() + 1).padStart(2, "0")}-${String(new Date().getDate()).padStart(2, "0")}`
    );

    if (revealDate === null) return;

    if (!/^\d{4}-\d{2}-\d{2}$/.test(revealDate) || !hcDate(revealDate)) {
        showToast("Please enter a valid date in YYYY-MM-DD format.", "error");
        return;
    }

    if (revealDate < todayISO()) {
        showToast("Choose today or a future date.", "info");
        return;
    }

    appData.timeCapsules.push({
        id: makeId(),
        title: title.trim() || "Dear future me…",
        message: message.trim(),
        createdDate: todayISO(),
        revealDate
    });

    if (hcPersist("Your letter has been tucked away. 💌")) {
        renderObservatory();
    }
}

/* ------------------------------------------------------------
   46. REFLECTION GARDEN
   ------------------------------------------------------------ */

function renderGarden() {
    hcEnsureCollections();

    const root = $("#view-root");

    if (!root) return;

    currentView = "garden";

    const reflections = [...appData.reflections].sort(
        (a, b) => String(b.date).localeCompare(String(a.date))
    );

    const todayReflection = reflections.find(
        reflection => reflection.date === todayISO()
    );

    const gratitudePrompts = [
        "Something small that made today brighter…",
        "A person, place or thing I appreciate…",
        "A moment I would like to remember…",
        "Something kind I did for myself…",
        "Something I am looking forward to…"
    ];

    const promptIndex = new Date().getDate() % gratitudePrompts.length;

    root.innerHTML = `
        <section class="view-page garden-page reveal">
            ${hcPageHeader(
        "THE REFLECTION GARDEN",
        "A softer place to land.",
        "Pause, notice, and make a little room for yourself."
    )}

            <div class="garden-welcome card">
                <div class="garden-welcome-art" aria-hidden="true">
                    <span>✿</span><span>☾</span><span>✧</span>
                </div>

                <div>
                    <span class="eyebrow">A GENTLE CHECK-IN</span>
                    <h2>You do not have to have it all figured out.</h2>
                    <p>
                        This garden is for noticing how life feels, without
                        judging yourself or turning every day into a task.
                    </p>
                </div>
            </div>

            <div class="garden-layout">
                <section class="card reflection-form-card">
                    <div class="section-heading">
                        <div>
                            <span class="eyebrow">TODAY'S PAGE</span>
                            <h2>${hcText(formatLongDate(todayISO()))}</h2>
                        </div>
                        <span class="garden-flower">🌷</span>
                    </div>

                    <form id="hc-reflection-form">
                        <label class="field">
                            <span>How does today feel to you?</span>

                            <div class="reflection-mood-options">
                                ${JOURNAL_MOODS.map(mood => `
                                    <label class="reflection-mood">
                                        <input type="radio"
                                            name="reflection-mood"
                                            value="${hcText(mood.emoji)}"
                                            ${todayReflection?.mood === mood.emoji ? "checked" : ""}>
                                        <span>${mood.emoji}</span>
                                        <small>${hcText(mood.label)}</small>
                                    </label>
                                `).join("")}
                            </div>
                        </label>

                        <label class="field">
                            <span>${hcText(gratitudePrompts[promptIndex])}</span>
                            <textarea
                                id="hc-gratitude"
                                name="gratitude"
                                rows="3"
                                maxlength="3000"
                                placeholder="Even the tiniest things count…"
                            >${hcText(todayReflection?.gratitude || "")}</textarea>
                        </label>

                        <label class="field">
                            <span>Something on my mind (optional)</span>
                            <textarea
                                id="hc-reflection-note"
                                name="note"
                                rows="4"
                                maxlength="5000"
                                placeholder="Write freely. There is no right answer."
                            >${hcText(todayReflection?.note || "")}</textarea>
                        </label>

                        <label class="field">
                            <span>One thing I would like to make space for (optional)</span>
                            <input
                                id="hc-intention"
                                name="intention"
                                maxlength="240"
                                value="${hcText(todayReflection?.intention || "")}"
                                placeholder="Rest, creativity, friendship…"
                            >
                        </label>

                        <button class="btn btn-primary" type="submit">
                            Save today's reflection ✦
                        </button>
                    </form>

                    <p class="muted-text">
                        Reflection is optional. You can leave a field blank
                        or skip a day whenever you wish.
                    </p>
                </section>

                <aside class="garden-side-column">
                    <article class="card garden-prompt-card">
                        <span class="eyebrow">A LITTLE QUESTION</span>
                        <span class="prompt-flower">✧</span>
                        <h3>${hcText(WRITING_PROMPTS[promptIndex])}</h3>
                        <p>Let the question sit with you. You can answer it here or in a journal chapter.</p>
                        <button class="btn btn-secondary"
                            data-hc-garden-prompt="${hcText(WRITING_PROMPTS[promptIndex])}">
                            Write about this →
                        </button>
                    </article>

                    <article class="card garden-stat-card">
                        <span class="eyebrow">YOUR GARDEN</span>
                        <h3>${reflections.length} ${reflections.length === 1 ? "reflection" : "reflections"} planted</h3>
                        <p>Each saved note is a small record of where you have been.</p>
                    </article>
                </aside>
            </div>

            <section class="garden-history">
                <div class="section-heading">
                    <div>
                        <span class="eyebrow">LOOKING BACK GENTLY</span>
                        <h2>Notes from your garden</h2>
                    </div>
                </div>

                ${reflections.length
            ? `
                            <div class="reflection-history-list">
                                ${reflections.slice(0, 15).map(reflection => `
                                    <article class="card reflection-history-card">
                                        <div class="reflection-history-top">
                                            <span>${hcText(reflection.mood || "✧")}</span>
                                            <time>${hcText(reflection.date)}</time>
                                        </div>

                                        ${reflection.gratitude
                    ? `<h3>A little gratitude</h3><p>${hcText(reflection.gratitude)}</p>`
                    : ""
                }

                                        ${reflection.note
                    ? `<h3>A note to myself</h3><p>${hcText(reflection.note)}</p>`
                    : ""
                }

                                        ${reflection.intention
                    ? `<p><strong>Making room for:</strong> ${hcText(reflection.intention)}</p>`
                    : ""
                }

                                        <button class="btn btn-secondary"
                                            data-hc-reflection-delete="${hcText(reflection.id)}">
                                            Delete reflection
                                        </button>
                                    </article>
                                `).join("")}
                            </div>
                        `
            : hcEmptyState(
                "🌱",
                "Your garden is just beginning",
                "When you feel ready, save a reflection and it will grow here."
            )
        }
            </section>
        </section>
    `;

    bindPart3Events();
}

function saveGardenReflection(form) {
    hcEnsureCollections();

    const formData = new FormData(form);

    const mood = formData.get("reflection-mood") || "";
    const gratitude = String(formData.get("gratitude") || "").trim();
    const note = String(formData.get("note") || "").trim();
    const intention = String(formData.get("intention") || "").trim();

    const existingIndex = appData.reflections.findIndex(
        reflection => reflection.date === todayISO()
    );

    if (!mood && !gratitude && !note && !intention) {
        showToast("Write something or choose a mood before saving.", "info");
        return;
    }

    const reflection = {
        id: existingIndex >= 0
            ? appData.reflections[existingIndex].id
            : makeId(),
        date: todayISO(),
        mood,
        gratitude,
        note,
        intention,
        updatedAt: new Date().toISOString()
    };

    if (existingIndex >= 0) {
        appData.reflections[existingIndex] = reflection;
    } else {
        appData.reflections.unshift(reflection);
    }

    if (hcPersist("Your reflection has been saved. 🌷")) {
        renderGarden();
    }
}

/* ------------------------------------------------------------
   47. CURIOSITY SHOP
   ------------------------------------------------------------ */

const HC_THEMES = [
    {
        id: "academia",
        name: "Magical Academia",
        symbol: "📚",
        description: "Ink, candlelight and old-library charm.",
        colors: ["#2b2340", "#c5a4d8", "#f0d8a6"]
    },
    {
        id: "coquette",
        name: "Coquette",
        symbol: "🎀",
        description: "Soft ribbons, blush tones and delicate details.",
        colors: ["#f6e2e8", "#c987a7", "#fff8f5"]
    },
    {
        id: "celestial",
        name: "Celestial",
        symbol: "🌙",
        description: "Moonlit skies and quiet starlight.",
        colors: ["#171c3b", "#8c8cce", "#d9d5ff"]
    },
    {
        id: "cottagecore",
        name: "Cottagecore",
        symbol: "🌿",
        description: "Pressed flowers, moss and sunlit pages.",
        colors: ["#dce5d0", "#839b76", "#f7edd5"]
    }
];

const HC_PAGE_TEMPLATES = [
    {
        id: "daily",
        name: "A Day in My Life",
        category: "Daily",
        symbol: "☀️",
        description: "A simple page for everyday moments.",
        title: "A day in my life",
        prompt: "What happened today, and what would I like to remember?"
    },
    {
        id: "dreams",
        name: "Dream Journal",
        category: "Dreams",
        symbol: "☾",
        description: "Catch the fragments that linger after sleep.",
        title: "A dream I remember",
        prompt: "Where did the dream take me? What details stayed with me?"
    },
    {
        id: "gratitude",
        name: "Little Gratitudes",
        category: "Reflection",
        symbol: "🌷",
        description: "Make space for the small good things.",
        title: "Little things I appreciate",
        prompt: "Three little things I appreciate today are…"
    },
    {
        id: "travel",
        name: "A Place I Went",
        category: "Memories",
        symbol: "🗺️",
        description: "Save the feeling of a place, not just its name.",
        title: "A place worth remembering",
        prompt: "What did I see, hear, taste or feel there?"
    },
    {
        id: "letter",
        name: "Letter to My Future Self",
        category: "Letters",
        symbol: "💌",
        description: "Leave a note for the person you are becoming.",
        title: "Dear future me",
        prompt: "Here is what I hope you remember about this season of life…"
    },
    {
        id: "ideas",
        name: "A Pocketful of Ideas",
        category: "Creativity",
        symbol: "💡",
        description: "Collect thoughts before they wander away.",
        title: "Ideas I want to keep",
        prompt: "An idea I would love to explore is…"
    },
    {
        id: "week",
        name: "Weekly Reflection",
        category: "Reflection",
        symbol: "✧",
        description: "Look back without grading yourself.",
        title: "This week, in little moments",
        prompt: "What felt meaningful, surprising, difficult or new this week?"
    },
    {
        id: "people",
        name: "A Person I Appreciate",
        category: "People",
        symbol: "♡",
        description: "Remember a person who made a difference.",
        title: "Someone who matters to me",
        prompt: "What do I appreciate about this person, and what moment comes to mind?"
    },
    {
        id: "milestone",
        name: "A Milestone",
        category: "Memories",
        symbol: "⭐",
        description: "Mark something meaningful in your own way.",
        title: "A moment of growth",
        prompt: "What happened, and what does it mean to me?"
    },
    {
        id: "comfort",
        name: "My Comfort Page",
        category: "Self-care",
        symbol: "☁️",
        description: "Collect little things that help you feel grounded.",
        title: "Things that comfort me",
        prompt: "Places, sounds, routines or small comforts I can return to…"
    },
    {
        id: "music",
        name: "Songs & Feelings",
        category: "Creativity",
        symbol: "♫",
        description: "Remember the music that belonged to a moment.",
        title: "The soundtrack of this moment",
        prompt: "What song fits this season of life, and why?"
    },
    {
        id: "season",
        name: "A Season of Life",
        category: "Reflection",
        symbol: "🍃",
        description: "Capture what this chapter of life feels like.",
        title: "The season I am in",
        prompt: "What is changing, what is staying, and what am I learning?"
    }
];

let hcShopFilter = "all";
let hcShopSearch = "";

/* ------------------------------------------------------------
   48. RENDER THE CURIOSITY SHOP
   ------------------------------------------------------------ */

function renderStudio() {
    hcEnsureCollections();

    const root = $("#view-root");

    if (!root) return;

    currentView = "studio";

    const query = hcShopSearch.trim().toLowerCase();

    const templates = HC_PAGE_TEMPLATES.filter(template => {
        const matchesCategory =
            hcShopFilter === "all" ||
            template.category.toLowerCase() === hcShopFilter.toLowerCase();

        const matchesSearch =
            !query ||
            template.name.toLowerCase().includes(query) ||
            template.description.toLowerCase().includes(query) ||
            template.category.toLowerCase().includes(query);

        return matchesCategory && matchesSearch;
    });

    const activeTheme = appData.settings.theme || "academia";

    root.innerHTML = `
        <section class="view-page curiosity-shop-page reveal">
            ${hcPageHeader(
        "THE CURIOSITY SHOP",
        "A little magic for your pages.",
        "Choose a world, find a prompt, and make this journal feel like yours."
    )}

            <section class="shop-theme-section">
                <div class="section-heading">
                    <div>
                        <span class="eyebrow">YOUR LIBRARY'S ATMOSPHERE</span>
                        <h2>Choose a library theme</h2>
                    </div>
                </div>

                <div class="theme-gallery grid grid-2">
                    ${HC_THEMES.map(theme => `
                        <article class="card theme-card ${activeTheme === theme.id ? "active" : ""}">
                            <div class="theme-art theme-art-${theme.id}">
                                <span>${theme.symbol}</span>
                                <div class="theme-color-swatches">
                                    ${theme.colors.map(color => `
                                        <i style="background:${color}"></i>
                                    `).join("")}
                                </div>
                            </div>

                            <div class="theme-card-content">
                                <h3>${hcText(theme.name)}</h3>
                                <p>${hcText(theme.description)}</p>

                                <button class="btn ${activeTheme === theme.id ? "btn-secondary" : "btn-primary"}"
                                    data-hc-theme="${hcText(theme.id)}">
                                    ${activeTheme === theme.id ? "Currently selected ✓" : "Choose this theme"}
                                </button>
                            </div>
                        </article>
                    `).join("")}
                </div>
            </section>

            <section class="shop-templates-section">
                <div class="section-heading">
                    <div>
                        <span class="eyebrow">A PAGE TO BEGIN WITH</span>
                        <h2>Chapter templates</h2>
                        <p class="page-description">
                            A little structure when you want inspiration.
                        </p>
                    </div>
                </div>

                <label class="shop-search">
                    <span>⌕</span>
                    <input
                        id="hc-shop-search"
                        type="search"
                        placeholder="Search templates…"
                        value="${hcText(hcShopSearch)}"
                    >
                </label>

                <div class="shop-category-filters">
                    ${[
            ["all", "Everything"],
            ["Daily", "Daily"],
            ["Reflection", "Reflection"],
            ["Memories", "Memories"],
            ["Creativity", "Creativity"],
            ["Letters", "Letters"],
            ["Dreams", "Dreams"],
            ["People", "People"],
            ["Self-care", "Self-care"]
        ].map(([id, label]) => `
                        <button
                            class="filter-chip ${hcShopFilter === id ? "active" : ""}"
                            data-hc-shop-filter="${hcText(id)}"
                        >
                            ${hcText(label)}
                        </button>
                    `).join("")}
                </div>

                <div class="template-grid grid grid-3">
                    ${templates.map(template => {
            const isSaved = appData.savedTemplates.includes(template.id);

            return `
                                <article class="card template-card">
                                    <div class="template-symbol">${template.symbol}</div>
                                    <span class="eyebrow">${hcText(template.category)}</span>
                                    <h3>${hcText(template.name)}</h3>
                                    <p>${hcText(template.description)}</p>

                                    <div class="template-actions">
                                        <button class="btn btn-primary"
                                            data-hc-use-template="${hcText(template.id)}">
                                            Use template →
                                        </button>

                                        <button class="icon-button"
                                            data-hc-save-template="${hcText(template.id)}"
                                            aria-label="${isSaved ? "Unsave" : "Save"} ${hcText(template.name)}"
                                            title="${isSaved ? "Remove from saved templates" : "Save template"}">
                                            ${isSaved ? "♥" : "♡"}
                                        </button>
                                    </div>
                                </article>
                            `;
        }).join("")
        ||
        hcEmptyState(
            "⌕",
            "No matching templates",
            "Try another search or choose a different category."
        )
        }
                </div>
            </section>

            <section class="shop-sticker-section">
                <div class="section-heading">
                    <div>
                        <span class="eyebrow">TINY DETAILS, BIG FEELINGS</span>
                        <h2>Sticker collection</h2>
                        <p class="page-description">
                            Pick a symbol to add to your next chapter.
                        </p>
                    </div>
                </div>

                <div class="shop-sticker-wall card">
                    ${SCRAPBOOK_STICKERS.map(sticker => `
                        <button class="shop-sticker"
                            data-hc-shop-sticker="${hcText(sticker)}"
                            aria-label="Write a new chapter with sticker ${hcText(sticker)}">
                            ${sticker}
                        </button>
                    `).join("")}
                </div>

                <p class="muted-text">
                    These are built-in symbols and emoji, not a downloaded sticker pack.
                </p>
            </section>
        </section>
    `;

    bindPart3Events();
}

/* ------------------------------------------------------------
   49. APPLY AND SAVE THEME
   ------------------------------------------------------------ */

function applyLibraryTheme(themeId) {
    const theme = HC_THEMES.find(item => item.id === themeId);

    if (!theme) return;

    appData.settings.theme = theme.id;

    // Keep this theme on the app shell, not on individual notebook pages.
    document.documentElement.dataset.libraryTheme = theme.id;

    if (typeof hcPersist === "function") {
        if (!hcPersist(`${theme.name} is now your library theme. ✧`)) {
            return;
        }
    }

    renderStudio();
}

function hcLoadLibraryTheme() {
    hcEnsureCollections();

    const themeId = appData.settings.theme || "academia";

    document.documentElement.dataset.libraryTheme =
        HC_THEMES.some(theme => theme.id === themeId)
            ? themeId
            : "academia";
}

/* ------------------------------------------------------------
   50. USE AND SAVE TEMPLATES
   ------------------------------------------------------------ */

function useChapterTemplate(templateId) {
    const template = HC_PAGE_TEMPLATES.find(
        item => item.id === templateId
    );

    if (!template) return;

    if (typeof openEditor !== "function") {
        showToast("The journal editor is not available yet.", "error");
        return;
    }

    openEditor(null, {
        title: template.title,
        prompt: template.prompt,
        focusContent: true
    });
}

function toggleSavedTemplate(templateId) {
    hcEnsureCollections();

    const index = appData.savedTemplates.indexOf(templateId);

    if (index >= 0) {
        appData.savedTemplates.splice(index, 1);
    } else {
        appData.savedTemplates.push(templateId);
    }

    if (hcPersist(index >= 0
        ? "Template removed from your saved collection."
        : "Template saved for later. ♥"
    )) {
        renderStudio();
    }
}

/* ------------------------------------------------------------
   51. PART 3 EVENT HANDLERS
   ------------------------------------------------------------ */

function bindPart3Events() {
    const root = $("#view-root");

    if (!root) return;

    root.querySelectorAll("[data-hc-open-entry]").forEach(button => {
        button.addEventListener("click", () => {
            const id = button.dataset.hcOpenEntry;

            if (typeof openEditor === "function") {
                openEditor(id);
            }
        });
    });

    root.querySelectorAll("[data-hc-new-entry]").forEach(button => {
        button.addEventListener("click", () => {
            const date = button.dataset.hcNewEntry || todayISO();

            if (typeof openEditor === "function") {
                openEditor(null, { focusContent: true });

                if ($("#journal-date")) {
                    $("#journal-date").value = date;
                    $("#journal-date").dispatchEvent(new Event("change"));
                }
            }
        });
    });

    root.querySelectorAll("[data-hc-calendar-move]").forEach(button => {
        button.addEventListener("click", () => {
            hcCalendarMonth.setMonth(
                hcCalendarMonth.getMonth() + Number(button.dataset.hcCalendarMove)
            );

            renderObservatory();
        });
    });

    root.querySelectorAll("[data-hc-calendar-date]").forEach(button => {
        button.addEventListener("click", () => {
            hcCalendarSelectedDate = button.dataset.hcCalendarDate;
            renderObservatory();
        });
    });

    root.querySelector("[data-hc-calendar-today]")?.addEventListener("click", () => {
        hcCalendarMonth = new Date();
        hcCalendarSelectedDate = todayISO();

        renderObservatory();
    });

    $("#hc-timeline-filter")?.addEventListener("change", event => {
        hcObservatoryFilter = event.target.value;
        renderObservatory();
    });

    root.querySelector("[data-hc-capsule-create]")?.addEventListener("click", () => {
        createTimeCapsule();
    });

    root.querySelectorAll("[data-hc-capsule-delete]").forEach(button => {
        button.addEventListener("click", () => {
            const id = button.dataset.hcCapsuleDelete;

            const confirmed = window.confirm(
                "Delete this time capsule? This cannot be undone."
            );

            if (!confirmed) return;

            appData.timeCapsules = appData.timeCapsules.filter(
                capsule => capsule.id !== id
            );

            if (hcPersist("Time capsule deleted.")) {
                renderObservatory();
            }
        });
    });

    $("#hc-reflection-form")?.addEventListener("submit", event => {
        event.preventDefault();
        saveGardenReflection(event.currentTarget);
    });

    root.querySelectorAll("[data-hc-reflection-delete]").forEach(button => {
        button.addEventListener("click", () => {
            const confirmed = window.confirm(
                "Delete this reflection? This cannot be undone."
            );

            if (!confirmed) return;

            appData.reflections = appData.reflections.filter(
                reflection => reflection.id !== button.dataset.hcReflectionDelete
            );

            if (hcPersist("Reflection deleted.")) {
                renderGarden();
            }
        });
    });

    root.querySelectorAll("[data-hc-garden-prompt]").forEach(button => {
        button.addEventListener("click", () => {
            const prompt = button.dataset.hcGardenPrompt;

            if (typeof openEditor === "function") {
                openEditor(null, { prompt, focusContent: true });
            }
        });
    });

    root.querySelectorAll("[data-hc-theme]").forEach(button => {
        button.addEventListener("click", () => {
            applyLibraryTheme(button.dataset.hcTheme);
        });
    });

    root.querySelectorAll("[data-hc-shop-filter]").forEach(button => {
        button.addEventListener("click", () => {
            hcShopFilter = button.dataset.hcShopFilter;
            renderStudio();
        });
    });

    $("#hc-shop-search")?.addEventListener("input", event => {
        hcShopSearch = event.target.value;

        // Keep the cursor in the search field while refreshing results.
        const start = event.target.selectionStart;

        renderStudio();

        const newSearch = $("#hc-shop-search");

        if (newSearch) {
            newSearch.focus();
            newSearch.setSelectionRange(start, start);
        }
    });

    root.querySelectorAll("[data-hc-use-template]").forEach(button => {
        button.addEventListener("click", () => {
            useChapterTemplate(button.dataset.hcUseTemplate);
        });
    });

    root.querySelectorAll("[data-hc-save-template]").forEach(button => {
        button.addEventListener("click", () => {
            toggleSavedTemplate(button.dataset.hcSaveTemplate);
        });
    });

    root.querySelectorAll("[data-hc-shop-sticker]").forEach(button => {
        button.addEventListener("click", () => {
            const sticker = button.dataset.hcShopSticker;

            if (typeof openEditor === "function") {
                openEditor(null, {
                    title: "A little page of magic",
                    prompt: `${sticker} A little detail I want to remember…`,
                    focusContent: true
                });
            }
        });
    });
}

/* ------------------------------------------------------------
   52. NAVIGATION INTEGRATION
   ------------------------------------------------------------ */

/*
   Connect these cases inside your EXISTING renderView() function.

   Add the cases to its current switch statement. Do not replace
   your whole renderView() function with this snippet.

   case "memories":
       renderObservatory();
       return;

   case "garden":
       renderGarden();
       return;

   case "studio":
       renderStudio();
       return;
*/

/* ------------------------------------------------------------
   53. INITIALISE THEME
   ------------------------------------------------------------ */

try {
    hcEnsureCollections();
    hcLoadLibraryTheme();
} catch (error) {
    console.warn("Library theme could not be initialised:", error);
}

console.info(
    "The Hidden Chapter — Part 3 modules loaded."
);

/* ============================================================
   THE HIDDEN CHAPTER
   JavaScript — Part 4
   Keeper's Desk • Privacy • Settings • Backup & Restore
   ============================================================ */

/* ------------------------------------------------------------
   54. SETTINGS DEFAULTS
   ------------------------------------------------------------ */

const HC_SETTINGS_DEFAULTS = {
    theme: "academia",
    animationMode: "enchanted",
    reducedMotion: false,
    soundEnabled: false,
    defaultWritingMode: "classic",
    confirmBeforeDelete: true,
    readingWidth: "comfortable",
    autosaveEnabled: true
};

function hcEnsureSettings() {
    hcEnsureCollections();

    for (const [key, value] of Object.entries(HC_SETTINGS_DEFAULTS)) {
        if (appData.settings[key] === undefined) {
            appData.settings[key] = value;
        }
    }
}

/* ------------------------------------------------------------
   55. SETTINGS SCREEN
   ------------------------------------------------------------ */

function renderSettings() {
    hcEnsureSettings();

    const root = $("#view-root");

    if (!root) return;

    currentView = "settings";

    const settings = appData.settings;

    const storageBytes = new Blob([
        JSON.stringify(appData)
    ]).size;

    const storageLabel = storageBytes < 1024 * 1024
        ? `${(storageBytes / 1024).toFixed(1)} KB`
        : `${(storageBytes / (1024 * 1024)).toFixed(2)} MB`;

    root.innerHTML = `
        <section class="view-page keeper-desk-page reveal">
            ${hcPageHeader(
        "THE KEEPER'S DESK",
        "Your journal, your rules.",
        "Shape your writing space, manage your memories, and keep a backup of your story."
    )}

            <section class="card settings-intro-card">
                <span class="settings-intro-symbol">🗝️</span>
                <div>
                    <span class="eyebrow">A NOTE ABOUT PRIVACY</span>
                    <h2>Your memories stay in this browser by default.</h2>
                    <p>
                        This app uses browser-side storage. Clearing browser
                        data, changing browsers, or using another device may
                        make your entries unavailable. Export backups regularly.
                    </p>
                </div>
            </section>

            <div class="settings-layout">
                <section class="card settings-panel">
                    <div class="settings-panel-heading">
                        <span class="settings-panel-icon">✧</span>
                        <div>
                            <h2>Personalize your library</h2>
                            <p>Choose the atmosphere that feels like you.</p>
                        </div>
                    </div>

                    <label class="settings-field">
                        <span>
                            <strong>Library theme</strong>
                            <small>Changes the app's overall atmosphere.</small>
                        </span>

                        <select id="hc-setting-theme">
                            ${HC_THEMES.map(theme => `
                                <option value="${theme.id}"
                                    ${settings.theme === theme.id ? "selected" : ""}>
                                    ${hcText(theme.name)}
                                </option>
                            `).join("")}
                        </select>
                    </label>

                    <label class="settings-field">
                        <span>
                            <strong>Animation atmosphere</strong>
                            <small>Choose how animated the experience feels.</small>
                        </span>

                        <select id="hc-setting-animation">
                            <option value="enchanted"
                                ${settings.animationMode === "enchanted" ? "selected" : ""}>
                                Enchanted
                            </option>
                            <option value="cozy"
                                ${settings.animationMode === "cozy" ? "selected" : ""}>
                                Cozy
                            </option>
                            <option value="quiet"
                                ${settings.animationMode === "quiet" ? "selected" : ""}>
                                Quiet
                            </option>
                        </select>
                    </label>

                    <label class="settings-field">
                        <span>
                            <strong>Default writing mode</strong>
                            <small>Choose the mode to start with when creating a chapter.</small>
                        </span>

                        <select id="hc-setting-writing-mode">
                            <option value="classic"
                                ${settings.defaultWritingMode === "classic" ? "selected" : ""}>
                                Classic writing
                            </option>
                            <option value="scrapbook"
                                ${settings.defaultWritingMode === "scrapbook" ? "selected" : ""}>
                                Scrapbook
                            </option>
                        </select>
                    </label>

                    <label class="settings-field">
                        <span>
                            <strong>Reading width</strong>
                            <small>Choose a comfortable text width.</small>
                        </span>

                        <select id="hc-setting-reading-width">
                            <option value="narrow"
                                ${settings.readingWidth === "narrow" ? "selected" : ""}>
                                Narrow
                            </option>
                            <option value="comfortable"
                                ${settings.readingWidth === "comfortable" ? "selected" : ""}>
                                Comfortable
                            </option>
                            <option value="wide"
                                ${settings.readingWidth === "wide" ? "selected" : ""}>
                                Wide
                            </option>
                        </select>
                    </label>
                </section>

                <section class="card settings-panel">
                    <div class="settings-panel-heading">
                        <span class="settings-panel-icon">☼</span>
                        <div>
                            <h2>Comfort & accessibility</h2>
                            <p>Make the experience gentler when you need it.</p>
                        </div>
                    </div>

                    <label class="settings-toggle-row">
                        <span>
                            <strong>Reduced motion</strong>
                            <small>Reduce decorative movement and transitions.</small>
                        </span>

                        <input type="checkbox"
                            id="hc-setting-reduced-motion"
                            ${settings.reducedMotion ? "checked" : ""}>
                    </label>

                    <label class="settings-toggle-row">
                        <span>
                            <strong>Ambient sound</strong>
                            <small>Preference for optional sounds, if supported by the app.</small>
                        </span>

                        <input type="checkbox"
                            id="hc-setting-sound"
                            ${settings.soundEnabled ? "checked" : ""}>
                    </label>

                    <label class="settings-toggle-row">
                        <span>
                            <strong>Autosave preference</strong>
                            <small>Preference for automatic saving in supported editor code.</small>
                        </span>

                        <input type="checkbox"
                            id="hc-setting-autosave"
                            ${settings.autosaveEnabled ? "checked" : ""}>
                    </label>

                    <label class="settings-toggle-row">
                        <span>
                            <strong>Confirm before deleting</strong>
                            <small>Ask before supported delete actions.</small>
                        </span>

                        <input type="checkbox"
                            id="hc-setting-confirm-delete"
                            ${settings.confirmBeforeDelete ? "checked" : ""}>
                    </label>

                    <p class="muted-text">
                        These are saved preferences. Existing editor code must
                        read the relevant setting for every preference to affect
                        all interactions.
                    </p>
                </section>

                <section class="card settings-panel settings-backup-panel">
                    <div class="settings-panel-heading">
                        <span class="settings-panel-icon">📦</span>
                        <div>
                            <h2>Back up your memories</h2>
                            <p>Take your journal with you or restore a previous backup.</p>
                        </div>
                    </div>

                    <div class="backup-summary">
                        <div>
                            <strong>${appData.entries.length}</strong>
                            <small>Chapters</small>
                        </div>
                        <div>
                            <strong>${(appData.reflections || []).length}</strong>
                            <small>Reflections</small>
                        </div>
                        <div>
                            <strong>${(appData.timeCapsules || []).length}</strong>
                            <small>Time capsules</small>
                        </div>
                        <div>
                            <strong>${storageLabel}</strong>
                            <small>Estimated data size</small>
                        </div>
                    </div>

                    <div class="settings-action-buttons">
                        <button class="btn btn-primary" id="hc-export-backup">
                            ↓ Export full backup
                        </button>

                        <button class="btn btn-secondary" id="hc-import-backup">
                            ↑ Restore from backup
                        </button>
                    </div>

                    <p class="muted-text">
                        Your JSON backup can include private writing and
                        embedded photos. Store it somewhere safe and do not
                        share it unless you intend to.
                    </p>
                </section>

                <section class="card settings-panel settings-danger-panel">
                    <div class="settings-panel-heading">
                        <span class="settings-panel-icon">⚠</span>
                        <div>
                            <h2>Care for your data</h2>
                            <p>Review the options before making permanent changes.</p>
                        </div>
                    </div>

                    <div class="settings-danger-row">
                        <div>
                            <strong>Delete all journal data</strong>
                            <small>
                                Removes chapters, reflections, time capsules,
                                and saved template choices from this app's data.
                            </small>
                        </div>

                        <button class="btn btn-danger" id="hc-delete-all-data">
                            Delete all data
                        </button>
                    </div>

                    <p class="muted-text">
                        Export a backup first if there is anything you may want
                        to keep. Deleting app data does not erase any backup
                        files you previously exported.
                    </p>
                </section>
            </div>
        </section>
    `;

    hcApplyPreferences();
    bindSettingsEvents();
}

/* ------------------------------------------------------------
   56. SAVE SETTINGS
   ------------------------------------------------------------ */

function hcSaveSetting(key, value, message = "Preference saved.") {
    hcEnsureSettings();

    if (!Object.prototype.hasOwnProperty.call(HC_SETTINGS_DEFAULTS, key)) {
        console.warn("Unknown journal setting:", key);
        return;
    }

    appData.settings[key] = value;

    if (hcPersist(message)) {
        hcApplyPreferences();
    }
}

function hcApplyPreferences() {
    hcEnsureSettings();

    const settings = appData.settings;
    const theme = HC_THEMES.some(item => item.id === settings.theme)
        ? settings.theme
        : "academia";

    document.documentElement.dataset.libraryTheme = theme;
    document.documentElement.dataset.animationMode = settings.animationMode;
    document.documentElement.dataset.readingWidth = settings.readingWidth;

    const prefersReducedMotion =
        typeof window.matchMedia === "function" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    document.documentElement.classList.toggle(
        "hc-reduced-motion",
        Boolean(settings.reducedMotion || prefersReducedMotion || settings.animationMode === "quiet")
    );
}

function bindSettingsEvents() {
    $("#hc-setting-theme")?.addEventListener("change", event => {
        hcSaveSetting("theme", event.target.value, "Library theme saved.");
    });

    $("#hc-setting-animation")?.addEventListener("change", event => {
        hcSaveSetting("animationMode", event.target.value, "Animation preference saved.");
    });

    $("#hc-setting-writing-mode")?.addEventListener("change", event => {
        hcSaveSetting("defaultWritingMode", event.target.value, "Writing mode preference saved.");
    });

    $("#hc-setting-reading-width")?.addEventListener("change", event => {
        hcSaveSetting("readingWidth", event.target.value, "Reading width saved.");
    });

    $("#hc-setting-reduced-motion")?.addEventListener("change", event => {
        hcSaveSetting("reducedMotion", event.target.checked, "Accessibility preference saved.");
    });

    $("#hc-setting-sound")?.addEventListener("change", event => {
        hcSaveSetting("soundEnabled", event.target.checked, "Sound preference saved.");
    });

    $("#hc-setting-autosave")?.addEventListener("change", event => {
        hcSaveSetting("autosaveEnabled", event.target.checked, "Autosave preference saved.");
    });

    $("#hc-setting-confirm-delete")?.addEventListener("change", event => {
        hcSaveSetting("confirmBeforeDelete", event.target.checked, "Delete confirmation preference saved.");
    });

    $("#hc-export-backup")?.addEventListener("click", hcExportBackup);

    $("#hc-import-backup")?.addEventListener("click", () => {
        const input = $("#import-input");

        if (!input) {
            showToast("The import file input is missing from your HTML.", "error");
            return;
        }

        input.value = "";
        input.click();
    });

    $("#hc-delete-all-data")?.addEventListener("click", hcDeleteAllData);
}

/* ------------------------------------------------------------
   57. EXPORT A FULL BACKUP
   ------------------------------------------------------------ */

function hcExportBackup() {
    try {
        const backup = {
            application: "The Hidden Chapter",
            backupVersion: 1,
            exportedAt: new Date().toISOString(),
            data: appData
        };

        const json = JSON.stringify(backup, null, 2);
        const blob = new Blob([json], {
            type: "application/json;charset=utf-8"
        });

        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");

        link.href = url;
        link.download = `the-hidden-chapter-backup-${todayISO()}.json`;

        document.body.appendChild(link);
        link.click();
        link.remove();

        setTimeout(() => URL.revokeObjectURL(url), 1000);

        showToast("Your backup export has started.", "success");
    } catch (error) {
        console.error("Backup export failed:", error);
        showToast("Could not export your backup.", "error");
    }
}

/* ------------------------------------------------------------
   58. VALIDATE AND RESTORE A BACKUP
   ------------------------------------------------------------ */

function hcValidateBackup(parsed) {
    const candidate =
        parsed &&
            parsed.application === "The Hidden Chapter" &&
            parsed.data &&
            typeof parsed.data === "object"
            ? parsed.data
            : parsed;

    if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) {
        throw new Error("This file does not contain a valid journal backup.");
    }

    if (!Array.isArray(candidate.entries)) {
        throw new Error("The backup does not contain a valid chapters list.");
    }

    for (const entry of candidate.entries) {
        if (!entry || typeof entry !== "object" || entry.id == null) {
            throw new Error("One or more chapters in this backup are invalid.");
        }
    }

    const restored = {
        ...candidate,
        entries: candidate.entries,
        settings: {
            ...HC_SETTINGS_DEFAULTS,
            ...(candidate.settings && typeof candidate.settings === "object"
                ? candidate.settings
                : {})
        },
        reflections: Array.isArray(candidate.reflections)
            ? candidate.reflections
            : [],
        timeCapsules: Array.isArray(candidate.timeCapsules)
            ? candidate.timeCapsules
            : [],
        savedTemplates: Array.isArray(candidate.savedTemplates)
            ? candidate.savedTemplates
            : []
    };

    return restored;
}

function hcReplaceAppData(restored) {
    // Preserve the existing appData object reference in case Part 1
    // declares it with const or other functions retain its reference.
    for (const key of Object.keys(appData)) {
        delete appData[key];
    }

    Object.assign(appData, restored);
}

async function hcImportBackupFile(file) {
    if (!file) return;

    if (file.size > 25 * 1024 * 1024) {
        showToast("This backup is larger than the 25 MB import limit.", "error");
        return;
    }

    try {
        const text = await file.text();
        const parsed = JSON.parse(text);
        const restored = hcValidateBackup(parsed);

        const confirmed = window.confirm(
            "Restoring this backup will replace the journal data currently in this browser. Export your current data first if you want to keep it. Continue?"
        );

        if (!confirmed) return;

        // Retain the current state so a failed save can be rolled back.
        const previousData = JSON.parse(JSON.stringify(appData));

        hcReplaceAppData(restored);

        let saved = false;

        try {
            saved = saveData() !== false;
        } catch (error) {
            console.error("Restored data could not be saved:", error);
        }

        if (!saved) {
            hcReplaceAppData(previousData);

            try {
                saveData();
            } catch (rollbackError) {
                console.error("Could not restore the previous data:", rollbackError);
            }

            showToast(
                "Restore failed while saving. Your previous data was restored in memory where possible.",
                "error"
            );

            return;
        }

        hcEnsureSettings();
        hcApplyPreferences();

        showToast("Backup restored successfully.", "success");

        if (typeof updateCounts === "function") {
            updateCounts();
        }

        renderSettings();
    } catch (error) {
        console.error("Backup import failed:", error);

        showToast(
            error instanceof SyntaxError
                ? "That file is not valid JSON."
                : error.message || "Could not restore this backup.",
            "error"
        );
    }
}

function hcBindImportInput() {
    const input = $("#import-input");

    if (!input || input.dataset.hcBound === "true") return;

    input.dataset.hcBound = "true";

    input.addEventListener("change", async event => {
        const file = event.target.files?.[0];

        if (file) {
            await hcImportBackupFile(file);
        }

        event.target.value = "";
    });
}

/* ------------------------------------------------------------
   59. DELETE JOURNAL DATA
   ------------------------------------------------------------ */

function hcDeleteAllData() {
    hcEnsureSettings();

    const message = appData.settings.confirmBeforeDelete
        ? "This will permanently remove your chapters, reflections, time capsules, and saved template choices from this app's current data. Export a backup first if needed. Continue?"
        : "Delete all journal data from this app? This cannot be undone unless you have a backup.";

    if (!window.confirm(message)) return;

    const previousData = JSON.parse(JSON.stringify(appData));

    // Keep the settings object and reset the journal's content.
    appData.entries = [];
    appData.reflections = [];
    appData.timeCapsules = [];
    appData.savedTemplates = [];

    const saved = (() => {
        try {
            return saveData() !== false;
        } catch (error) {
            console.error("Could not save the deletion:", error);
            return false;
        }
    })();

    if (!saved) {
        hcReplaceAppData(previousData);

        try {
            saveData();
        } catch (error) {
            console.error("Could not roll back the deletion:", error);
        }

        showToast(
            "The deletion could not be saved. Your previous data was restored in memory where possible.",
            "error"
        );

        return;
    }

    if (typeof updateCounts === "function") {
        updateCounts();
    }

    showToast("Journal data deleted.", "success");
    renderSettings();
}

/* ------------------------------------------------------------
   60. SETTINGS NAVIGATION INTEGRATION
   ------------------------------------------------------------ */

/*
   Add this case to your EXISTING renderView() switch statement:

   case "settings":
       renderSettings();
       return;

   Do not create a second renderView() function.
*/

/* ------------------------------------------------------------
   61. STARTUP
   ------------------------------------------------------------ */

try {
    hcEnsureSettings();
    hcApplyPreferences();
    hcBindImportInput();
} catch (error) {
    console.warn("The Keeper's Desk could not initialise:", error);
}

console.info("The Hidden Chapter — Part 4 modules loaded.");
