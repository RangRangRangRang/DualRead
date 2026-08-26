import { createReaderContext } from './reader-core.js';
import { initProgress } from './reader-progress.js';
import { initTranslation } from './reader-translation.js';
import { initNavigation } from './reader-navigation.js';
import { initSettings } from './reader-settings.js';
import { initUI } from './reader-ui.js';

document.addEventListener('DOMContentLoaded', () => {
    const ctx = createReaderContext();
    if (!ctx) return;

    if (ctx.readerData.title && ctx.bookTitleEl) {
        ctx.bookTitleEl.textContent = ctx.readerData.title;
    }

    // Initialize modules first so their public functions are available through ctx.api.
    initProgress(ctx);
    initTranslation(ctx);
    initNavigation(ctx);
    initSettings(ctx);
    initUI(ctx);

    ctx.api.renderNavList();
    ctx.api.renderBookmarksList();
    ctx.api.loadSettings();
    ctx.api.loadEyeComfort();

    const progress = ctx.readerData.progress || {};
    if (ctx.chapters.length > 0) {
        const restoredIndex = progress.currentChapterId
            ? ctx.chapters.findIndex(c => c.id === progress.currentChapterId)
            : 0;
        ctx.api.loadChapter(restoredIndex >= 0 ? restoredIndex : 0, progress.currentScrollOffset || 0);
    }

    // Restore translation mode without triggering an extra save.
    ctx.api.setTranslationMode(!!progress.translationModeOn, true);

    ctx.api.setupEventListeners();
    ctx.api.setupTranslateToggle();
    ctx.api.setupChapterScrollbar();
    ctx.api.setupChapterNavButtons();
    ctx.api.setupFocusMode();
    ctx.api.setupInternalLinkInterception();
    ctx.api.setupMobileSidebars();
});
