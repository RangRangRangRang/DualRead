export function initUI(ctx) {
    const MOBILE_BREAKPOINT = 900;
    const isMobileViewport = () => window.innerWidth <= MOBILE_BREAKPOINT;

    function closeMobileSidebars() {
        const left = ctx.readerApp ? ctx.readerApp.querySelector('.sidebar-left') : null;
        const right = ctx.readerApp ? ctx.readerApp.querySelector('.sidebar-right') : null;
        if (left) {
            left.classList.remove('mobile-open');
            left.querySelector('.sidebar-open-btn')?.setAttribute('aria-expanded', 'false');
        }
        if (right) right.classList.remove('mobile-open');
        if (ctx.readerApp) ctx.readerApp.classList.remove('mobile-sidebar-active');
        document.getElementById('sidebar-left-toggle')?.setAttribute('aria-expanded', 'false');
        document.getElementById('sidebar-right-toggle')?.setAttribute('aria-expanded', 'false');
    }

    function openMobileSidebar(sidebarEl, toggleBtn) {
        if (!sidebarEl) return;
        closeMobileSidebars();
        sidebarEl.classList.add('mobile-open');
        if (ctx.readerApp) ctx.readerApp.classList.add('mobile-sidebar-active');
        if (toggleBtn) toggleBtn.setAttribute('aria-expanded', 'true');
    }

    function setupMobileSidebars() {
        const sidebarLeft = document.getElementById('sidebar-left');
        const sidebarRight = document.getElementById('sidebar-right');
        const leftToggle = document.getElementById('sidebar-left-toggle');
        const rightToggle = document.getElementById('sidebar-right-toggle');
        const backdrop = document.getElementById('sidebar-backdrop');

        leftToggle?.addEventListener('click', () => {
            if (sidebarLeft && sidebarLeft.classList.contains('mobile-open')) closeMobileSidebars();
            else openMobileSidebar(sidebarLeft, leftToggle);
        });
        rightToggle?.addEventListener('click', () => {
            if (sidebarRight && sidebarRight.classList.contains('mobile-open')) closeMobileSidebars();
            else openMobileSidebar(sidebarRight, rightToggle);
        });
        backdrop?.addEventListener('click', closeMobileSidebars);
        document.querySelectorAll('[data-close-sidebar]').forEach(btn => {
            btn.addEventListener('click', closeMobileSidebars);
        });

        [ctx.panelChapters, ctx.panelBookmarks].forEach((panel) => {
            panel?.addEventListener('click', () => {
                if (isMobileViewport()) closeMobileSidebars();
            });
        });

        window.addEventListener('resize', () => {
            if (!isMobileViewport()) closeMobileSidebars();
        });
    }

    function setupFocusMode() {
        const showUI = () => {
            if (ctx.readerApp) ctx.readerApp.classList.remove('focus-mode');
            clearTimeout(ctx.focusModeTimer);
            ctx.focusModeTimer = setTimeout(() => {
                if (ctx.readerApp) ctx.readerApp.classList.add('focus-mode');
            }, ctx.FOCUS_TIMEOUT);
        };
        document.addEventListener('mousemove', showUI);
        document.addEventListener('mousedown', showUI);
        document.addEventListener('touchstart', showUI, { passive: true });
        ctx.focusModeTimer = setTimeout(() => {
            if (ctx.readerApp) ctx.readerApp.classList.add('focus-mode');
        }, ctx.FOCUS_TIMEOUT);
    }

    function setupEventListeners() {
        if (ctx.readerViewport) ctx.readerViewport.addEventListener('scroll', ctx.api.saveReadingProgress);

        document.addEventListener('keydown', (e) => {
            const target = e.target;
            const isTypingTarget = target && (
                target.tagName === 'INPUT' ||
                target.tagName === 'TEXTAREA' ||
                target.tagName === 'SELECT' ||
                target.tagName === 'BUTTON' ||
                target.isContentEditable
            );
            if (isTypingTarget || e.ctrlKey || e.altKey || e.metaKey) return;

            if (e.code === 'KeyT') {
                e.preventDefault();
                ctx.api.setTranslationMode(!ctx.translationModeOn);
                return;
            }
            if (e.code === 'KeyB') {
                e.preventDefault();
                ctx.api.addCurrentBookmark();
                return;
            }
            if (e.code === 'KeyF') {
                e.preventDefault();
                toggleFullscreen();
                return;
            }
            if (e.code === 'Escape') {
                if (ctx.readerApp) ctx.readerApp.classList.add('focus-mode');
                closeMobileSidebars();
                return;
            }
            if (!ctx.readerViewport) return;

            const isAtTop = ctx.readerViewport.scrollTop <= 5;
            const isAtBottom = (ctx.readerViewport.scrollTop + ctx.readerViewport.clientHeight) >= (ctx.readerViewport.scrollHeight - 10);
            let isNavKey = false;

            if (e.code === 'ArrowDown') {
                e.preventDefault();
                ctx.readerViewport.scrollTop += 40;
                isNavKey = true;
            } else if (e.code === 'ArrowUp') {
                e.preventDefault();
                if (isAtTop && ctx.currentChapterIndex > 0) ctx.api.loadChapter(ctx.currentChapterIndex - 1, 'bottom');
                else ctx.readerViewport.scrollTop -= 40;
                isNavKey = true;
            } else if (['ArrowRight', 'Space', 'PageDown'].includes(e.code)) {
                e.preventDefault();
                if (isAtBottom && ctx.currentChapterIndex < ctx.chapters.length - 1) ctx.api.loadChapter(ctx.currentChapterIndex + 1, 0);
                else ctx.readerViewport.scrollTop += (ctx.readerViewport.clientHeight - 60);
                isNavKey = true;
            } else if (['ArrowLeft', 'PageUp'].includes(e.code)) {
                e.preventDefault();
                if (isAtTop && ctx.currentChapterIndex > 0) ctx.api.loadChapter(ctx.currentChapterIndex - 1, 'bottom');
                else ctx.readerViewport.scrollTop -= (ctx.readerViewport.clientHeight - 60);
                isNavKey = true;
            }

            if (isNavKey && ctx.readerApp && ctx.readerApp.classList.contains('focus-mode')) {
                clearTimeout(ctx.focusModeTimer);
                ctx.focusModeTimer = setTimeout(() => {
                    if (ctx.readerApp) ctx.readerApp.classList.add('focus-mode');
                }, ctx.FOCUS_TIMEOUT);
            }
        });

        function toggleFullscreen() {
            if (!document.fullscreenElement) {
                (ctx.readerApp || document.documentElement).requestFullscreen?.().catch(() => { });
            } else {
                document.exitFullscreen?.();
            }
        }

        if (ctx.settingDarkMode) {
            ctx.settingDarkMode.addEventListener('change', (e) => {
                document.body.classList.toggle('theme-light', !e.target.checked);
                ctx.readerData.settings.darkMode = e.target.checked;
                ctx.api.saveSettings();
                e.target.blur();
            });
        }
        if (ctx.settingEyeComfort) {
            ctx.settingEyeComfort.addEventListener('change', (e) => {
                document.body.classList.toggle('theme-sepia', e.target.checked);
                localStorage.setItem(ctx.api.EYE_COMFORT_KEY, e.target.checked ? '1' : '0');
                e.target.blur();
            });
        }
        if (ctx.settingLanguage) {
            ctx.settingLanguage.addEventListener('change', (e) => {
                const lang = e.target.value;
                ctx.api.applyLanguage(lang);
                ctx.readerData.settings.language = lang;

                if (lang === 'vi' && (!ctx.readerData.settings.font || ctx.readerData.settings.font === 'Georgia, serif')) {
                    ctx.readerData.settings.font = "'Times New Roman', serif";
                    if (ctx.settingFont) ctx.settingFont.value = "'Times New Roman', serif";
                    if (ctx.readerColumns) ctx.readerColumns.style.fontFamily = "'Times New Roman', serif";
                }

                ctx.api.saveSettings();
                try {
                    localStorage.setItem('dualread_language', lang);
                } catch (err) { }
                e.target.blur();
            });
        }
        document.querySelectorAll('.sidebar-toggle').forEach(btn => {
            btn.addEventListener('click', () => {
                const targetId = btn.getAttribute('data-panel');
                const panel = document.getElementById(targetId);
                if (panel) panel.classList.toggle('open');
                requestAnimationFrame(ctx.api.updateChapterScrollbar);
            });
        });
        if (ctx.settingFontSize) {
            ctx.settingFontSize.addEventListener('input', (e) => {
                const val = e.target.value;
                if (ctx.settingFontSizeVal) ctx.settingFontSizeVal.textContent = `${val}px`;
                if (ctx.readerColumns) ctx.readerColumns.style.fontSize = `${val}px`;
                ctx.readerData.settings.fontSize = Number(val);
                ctx.api.saveSettings();
            });
        }
        if (ctx.settingLineHeight) {
            ctx.settingLineHeight.addEventListener('input', (e) => {
                const val = e.target.value;
                if (ctx.settingLineHeightVal) ctx.settingLineHeightVal.textContent = val;
                if (ctx.readerColumns) ctx.readerColumns.style.lineHeight = val;
                ctx.readerData.settings.lineHeight = Number(val);
                ctx.api.saveSettings();
            });
        }
        if (ctx.settingLetterSpacing) {
            ctx.settingLetterSpacing.addEventListener('input', (e) => {
                const val = e.target.value;
                if (ctx.settingLetterSpacingVal) ctx.settingLetterSpacingVal.textContent = `${val}em`;
                if (ctx.readerColumns) ctx.readerColumns.style.letterSpacing = `${val}em`;
                ctx.readerData.settings.letterSpacing = Number(val);
                ctx.api.saveSettings();
            });
        }
        if (ctx.settingFont) {
            ctx.settingFont.addEventListener('change', (e) => {
                if (ctx.readerColumns) ctx.readerColumns.style.fontFamily = e.target.value;
                ctx.readerData.settings.font = e.target.value;
                ctx.api.saveSettings();
                e.target.blur();
            });
        }
    }

    ctx.api.setupFocusMode = setupFocusMode;
    ctx.api.setupEventListeners = setupEventListeners;
    ctx.api.setupMobileSidebars = setupMobileSidebars;
}