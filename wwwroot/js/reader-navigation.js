import { translations } from './reader-core.js';

export function initNavigation(ctx) {
    function updateChapterScrollbar() {
        if (!ctx.panelChapters || !ctx.chapterScrollbar || !ctx.chapterScrollbarThumb) return;
        const { scrollHeight, clientHeight, scrollTop } = ctx.panelChapters;
        if (scrollHeight <= clientHeight + 1) {
            ctx.chapterScrollbar.classList.remove('visible');
            return;
        }
        ctx.chapterScrollbar.classList.add('visible');
        const trackHeight = ctx.chapterScrollbar.clientHeight;
        const thumbHeight = Math.max(24, (clientHeight / scrollHeight) * trackHeight);
        const maxThumbTop = trackHeight - thumbHeight;
        const scrollableHeight = scrollHeight - clientHeight;
        const scrollRatio = scrollableHeight > 0 ? scrollTop / scrollableHeight : 0;
        ctx.chapterScrollbarThumb.style.height = `${thumbHeight}px`;
        ctx.chapterScrollbarThumb.style.top = `${scrollRatio * maxThumbTop}px`;
    }

    // Lấy toạ độ Y từ cả sự kiện chuột (MouseEvent) lẫn cảm ứng (TouchEvent), vì trên điện
    // thoại không có "clientY" trực tiếp trên event - nó nằm trong e.touches[0]/e.changedTouches[0].
    function getPointerY(e) {
        if (e.touches && e.touches.length > 0) return e.touches[0].clientY;
        if (e.changedTouches && e.changedTouches.length > 0) return e.changedTouches[0].clientY;
        return e.clientY;
    }

    function setupChapterScrollbar() {
        if (!ctx.panelChapters || !ctx.chapterScrollbar || !ctx.chapterScrollbarThumb) return;
        ctx.panelChapters.addEventListener('scroll', updateChapterScrollbar);
        window.addEventListener('resize', updateChapterScrollbar);
        let dragging = false;
        let dragStartY = 0;
        let dragStartScrollTop = 0;

        function startDrag(e) {
            e.preventDefault();
            dragging = true;
            dragStartY = getPointerY(e);
            dragStartScrollTop = ctx.panelChapters.scrollTop;
        }

        function jumpToTrackPosition(e) {
            if (e.target === ctx.chapterScrollbarThumb) return;
            const rect = ctx.chapterScrollbar.getBoundingClientRect();
            const clickRatio = (getPointerY(e) - rect.top) / rect.height;
            const { scrollHeight, clientHeight } = ctx.panelChapters;
            ctx.panelChapters.scrollTop = clickRatio * (scrollHeight - clientHeight);
        }

        function onDragMove(e) {
            if (!dragging) return;
            const { scrollHeight, clientHeight } = ctx.panelChapters;
            const trackHeight = ctx.chapterScrollbar.clientHeight;
            const thumbHeight = ctx.chapterScrollbarThumb.offsetHeight;
            const maxThumbTop = trackHeight - thumbHeight;
            const scrollableHeight = scrollHeight - clientHeight;
            const deltaY = getPointerY(e) - dragStartY;
            const deltaScroll = maxThumbTop > 0 ? (deltaY / maxThumbTop) * scrollableHeight : 0;
            ctx.panelChapters.scrollTop = Math.min(scrollableHeight, Math.max(0, dragStartScrollTop + deltaScroll));
        }

        function endDrag() { dragging = false; }

        // Chuột (desktop)
        ctx.chapterScrollbarThumb.addEventListener('mousedown', startDrag);
        ctx.chapterScrollbar.addEventListener('mousedown', jumpToTrackPosition);
        document.addEventListener('mousemove', onDragMove);
        document.addEventListener('mouseup', endDrag);

        // Cảm ứng (điện thoại/tablet) - passive: false vì cần preventDefault để tránh cuộn
        // cả trang khi đang kéo thanh scrollbar.
        ctx.chapterScrollbarThumb.addEventListener('touchstart', startDrag, { passive: false });
        ctx.chapterScrollbar.addEventListener('touchstart', jumpToTrackPosition, { passive: false });
        document.addEventListener('touchmove', onDragMove, { passive: false });
        document.addEventListener('touchend', endDrag);
        document.addEventListener('touchcancel', endDrag);
    }

    function renderNavList() {
        if (!ctx.panelChapters) return;
        ctx.panelChapters.innerHTML = '';
        ctx.chapters.forEach((ch, idx) => {
            const li = document.createElement('li');
            li.className = `sidebar-list-item ${idx === ctx.currentChapterIndex ? 'active' : ''}`;
            li.textContent = ch.title || `Chương ${idx + 1}`;
            li.addEventListener('click', () => loadChapter(idx));
            ctx.panelChapters.appendChild(li);
        });
        requestAnimationFrame(updateChapterScrollbar);
    }

    function renderBookmarksList() {
        if (!ctx.panelBookmarks) return;
        ctx.panelBookmarks.innerHTML = '';
        const currentLang = ctx.settingLanguage ? ctx.settingLanguage.value : 'en';
        const dict = translations[currentLang] || translations.en;
        const addLi = document.createElement('li');
        addLi.className = 'sidebar-list-item';
        addLi.style.cssText = 'font-weight:600; color:#00c9a7; border:1px dashed var(--eb-border); margin-bottom:8px;';
        addLi.textContent = dict.addBookmark;
        addLi.addEventListener('click', addCurrentBookmark);
        ctx.panelBookmarks.appendChild(addLi);
        if (ctx.bookmarks.length === 0) {
            const emptyLi = document.createElement('li');
            emptyLi.className = 'sidebar-list-item sidebar-list-empty';
            emptyLi.textContent = dict.noBookmarks;
            ctx.panelBookmarks.appendChild(emptyLi);
            return;
        }
        ctx.bookmarks.forEach((bm) => {
            const li = document.createElement('li');
            li.className = 'sidebar-list-item';
            const label = bm.chapterTitle || 'Chapter';
            const span = document.createElement('span');
            span.textContent = label;
            span.style.cssText = 'overflow:hidden; text-overflow:ellipsis; white-space:nowrap; flex:1;';
            span.addEventListener('click', () => goToBookmark(bm));
            const delBtn = document.createElement('button');
            delBtn.className = 'bookmark-delete';
            delBtn.innerHTML = '&times;';
            delBtn.addEventListener('click', async (e) => {
                e.stopPropagation();
                ctx.bookmarks = ctx.bookmarks.filter(b => b.id !== bm.id);
                renderBookmarksList();
                await postDeleteBookmark(bm.id);
            });
            li.appendChild(span);
            li.appendChild(delBtn);
            ctx.panelBookmarks.appendChild(li);
        });
    }

    async function postDeleteBookmark(bookmarkId) {
        if (!ctx.bookId) return;
        try {
            await fetch(`/Reader/${ctx.bookId}/Bookmarks/${bookmarkId}/Delete`, { method: 'POST' });
        } catch (err) {
            console.error('Lỗi xoá bookmark:', err);
        }
    }

    function goToBookmark(bm) {
        const idx = ctx.chapters.findIndex(c => c.id === bm.chapterId);
        if (idx >= 0) loadChapter(idx, bm.pageNumber || 0);
    }

    async function addCurrentBookmark() {
        if (!ctx.bookId) return;
        const chapter = ctx.chapters[ctx.currentChapterIndex];
        if (!chapter) return;
        const previewText = chapter.title || `Chương ${ctx.currentChapterIndex + 1}`;
        const dto = {
            chapterId: chapter.id,
            pageNumber: ctx.readerViewport ? ctx.readerViewport.scrollTop : 0,
            linesPerPage: ctx.readerData.settings ? ctx.readerData.settings.linesPerPage : 25,
            previewText
        };
        try {
            const res = await fetch(`/Reader/${ctx.bookId}/Bookmarks`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dto)
            });
            if (res.ok) {
                const created = await res.json();
                ctx.bookmarks.push(created);
                renderBookmarksList();
            }
        } catch (err) {
            console.error('Lỗi thêm bookmark:', err);
        }
    }

    function resolveRelativeEpubPath(basePath, relative) {
        if (relative.startsWith('/')) return relative.replace(/^\/+/, '');
        const baseDir = basePath.includes('/') ? basePath.slice(0, basePath.lastIndexOf('/')) : '';
        const segments = baseDir ? baseDir.split('/') : [];
        relative.split('/').forEach((segment) => {
            if (segment === '' || segment === '.') return;
            if (segment === '..') {
                if (segments.length > 0) segments.pop();
            } else {
                segments.push(segment);
            }
        });
        return segments.join('/');
    }

    function epubHrefMatches(chapterHref, targetPath) {
        if (!chapterHref || !targetPath) return false;
        const a = chapterHref.toLowerCase();
        const b = targetPath.toLowerCase();
        return a === b || a.endsWith('/' + b) || b.endsWith('/' + a);
    }

    function setupInternalLinkInterception() {
        const handleClick = async (e) => {
            const link = e.target.closest('a[href]');
            if (!link) return;
            const href = link.getAttribute('href');
            if (!href) return;
            if (/^([a-z][a-z0-9+.-]*:)?\/\//i.test(href) || /^(mailto|tel):/i.test(href)) return;
            e.preventDefault();
            const currentChapter = ctx.chapters[ctx.currentChapterIndex];
            if (!currentChapter) return;
            const [rawPath, fragment] = href.split('#');
            const targetHref = rawPath
                ? resolveRelativeEpubPath(currentChapter.epubItemHref || '', rawPath)
                : (currentChapter.epubItemHref || '');
            const targetIndex = ctx.chapters.findIndex(c => epubHrefMatches(c.epubItemHref, targetHref));
            if (targetIndex === -1) return;
            if (targetIndex === ctx.currentChapterIndex && fragment) {
                const target = ctx.readerColumns ? ctx.readerColumns.querySelector(`#${CSS.escape(fragment)}`) : null;
                if (target) target.scrollIntoView({ block: 'start' });
                return;
            }
            await loadChapter(targetIndex, fragment ? { anchor: fragment } : 0);
        };
        if (ctx.readerColumns) ctx.readerColumns.addEventListener('click', handleClick);
        if (ctx.translationColumn) ctx.translationColumn.addEventListener('click', handleClick);
    }

    async function loadChapter(index, targetScroll = 0) {
        if (index < 0 || index >= ctx.chapters.length) return;
        ctx.currentChapterIndex = index;
        if (ctx.readerApp) ctx.readerApp.classList.add('reader-loading');
        const chapter = ctx.chapters[index];
        if (ctx.bookTitleEl) ctx.bookTitleEl.textContent = `${ctx.readerData.title} — ${chapter.title || ''}`;
        let htmlContent = chapter.html || '';
        if (!htmlContent && chapter.id && ctx.bookId) {
            try {
                const res = await fetch(`/Reader/${ctx.bookId}/Chapter/${chapter.id}`);
                if (res.ok) {
                    const data = await res.json();
                    htmlContent = data.html || '';
                    chapter.html = htmlContent;
                    chapter.translations = data.translations || [];
                }
            } catch (err) {
                console.error('Lỗi fetch chương:', err);
            }
        }
        const currentLang = ctx.settingLanguage ? ctx.settingLanguage.value : 'en';
        const noContentText = translations[currentLang]?.noContent || translations.en.noContent;
        if (ctx.readerColumns) {
            ctx.readerColumns.innerHTML = htmlContent || `<div class="text-center p-4">${noContentText}</div>`;
            ctx.translationGridBuiltForChapterId = null;
            if (ctx.translationModeOn) ctx.api.renderTranslationGrid?.();
        }
        setTimeout(() => {
            if (ctx.readerViewport) {
                if (targetScroll && typeof targetScroll === 'object' && targetScroll.anchor) {
                    const target = ctx.readerColumns ? ctx.readerColumns.querySelector(`#${CSS.escape(targetScroll.anchor)}`) : null;
                    if (target) target.scrollIntoView({ block: 'start' });
                    else ctx.readerViewport.scrollTop = 0;
                } else {
                    ctx.readerViewport.scrollTop = targetScroll === 'bottom'
                        ? ctx.readerViewport.scrollHeight - ctx.readerViewport.clientHeight
                        : targetScroll;
                }
            }
            if (ctx.readerApp) ctx.readerApp.classList.remove('reader-loading');
            ctx.api.saveReadingProgress?.();
        }, 80);
        if (ctx.panelChapters) {
            const items = ctx.panelChapters.querySelectorAll('.sidebar-list-item');
            items.forEach((item, i) => item.classList.toggle('active', i === index));
        }
    }

    ctx.api.updateChapterScrollbar = updateChapterScrollbar;
    ctx.api.setupChapterScrollbar = setupChapterScrollbar;
    ctx.api.renderNavList = renderNavList;
    ctx.api.renderBookmarksList = renderBookmarksList;
    ctx.api.addCurrentBookmark = addCurrentBookmark;
    ctx.api.goToBookmark = goToBookmark;
    ctx.api.loadChapter = loadChapter;
    ctx.api.setupInternalLinkInterception = setupInternalLinkInterception;
}