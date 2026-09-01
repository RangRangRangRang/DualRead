export function initTranslation(ctx) {
    function setTranslationMode(on, skipSave) {
        ctx.translationModeOn = on;
        if (ctx.translationColumn) ctx.translationColumn.hidden = !on;
        if (ctx.readerApp) ctx.readerApp.classList.toggle('translation-mode', on);
        if (ctx.translateToggleBtn) ctx.translateToggleBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
        if (ctx.readerColumns) ctx.readerColumns.hidden = on;
        if (ctx.translationColumn) ctx.translationColumn.classList.toggle('full-width', on);
        if (on) renderTranslationGrid();
        if (!skipSave) ctx.api.saveReadingProgress?.();
    }

    function setupTranslateToggle() {
        if (!ctx.translateToggleBtn) return;
        ctx.translateToggleBtn.addEventListener('click', () => setTranslationMode(!ctx.translationModeOn));
    }

    function renderTranslationGrid() {
        const chapter = ctx.chapters[ctx.currentChapterIndex];
        if (!chapter || !ctx.translationColumn) return;
        if (ctx.translationGridBuiltForChapterId === chapter.id) return;

        const parser = document.createElement('div');
        parser.innerHTML = chapter.html || '';
        const paragraphNodes = Array.from(parser.querySelectorAll('[data-p-index]'));
        const savedByIndex = {};
        (chapter.translations || []).forEach(t => { savedByIndex[t.paragraphIndex] = t.translatedText; });

        const grid = document.createElement('div');
        grid.className = 'translation-grid';
        if (paragraphNodes.length === 0) {
            ctx.translationColumn.innerHTML = '';
            ctx.translationColumn.appendChild(grid);
            ctx.translationGridBuiltForChapterId = chapter.id;
            return;
        }

        paragraphNodes.forEach((node) => {
            const pIndex = node.getAttribute('data-p-index');
            const leftCell = document.createElement('div');
            leftCell.className = 'tr-original';
            leftCell.setAttribute('data-p-index', pIndex);
            leftCell.innerHTML = node.innerHTML;
            leftCell.addEventListener('click', () => {
                const sel = window.getSelection();
                // Nếu người dùng đang bôi đen văn bản (để tra từ điển/dùng extension dịch),
                // không cướp focus sang textarea vì việc focus sẽ xoá vùng bôi đen ngay lập tức.
                if (sel && sel.toString().trim().length > 0) return;
                focusTranslationParagraph(pIndex);
            });

            const rightCell = document.createElement('textarea');
            rightCell.className = 'tr-textarea';
            rightCell.setAttribute('data-p-index', pIndex);
            rightCell.rows = 1;
            rightCell.value = savedByIndex[pIndex] || '';
            rightCell.addEventListener('focus', () => highlightTranslationParagraph(pIndex));
            rightCell.addEventListener('input', () => {
                autoResizeTextarea(rightCell);
                queueTranslationSave(chapter.id, pIndex, rightCell.value);
            });
            grid.appendChild(leftCell);
            grid.appendChild(rightCell);
        });

        ctx.translationColumn.innerHTML = '';
        ctx.translationColumn.appendChild(grid);
        ctx.translationGridBuiltForChapterId = chapter.id;
        grid.querySelectorAll('.tr-textarea').forEach(autoResizeTextarea);
    }

    function autoResizeTextarea(el) {
        el.style.height = 'auto';
        el.style.height = `${el.scrollHeight}px`;
    }

    function focusTranslationParagraph(pIndex) {
        if (!ctx.translationColumn) return;
        const textarea = ctx.translationColumn.querySelector(`.tr-textarea[data-p-index="${pIndex}"]`);
        if (textarea) textarea.focus();
        highlightTranslationParagraph(pIndex);
    }

    function highlightTranslationParagraph(pIndex) {
        if (!ctx.translationColumn) return;
        ctx.translationColumn.querySelectorAll('.tr-original').forEach(el => {
            el.classList.toggle('active', el.getAttribute('data-p-index') === String(pIndex));
        });
        const original = ctx.translationColumn.querySelector(`.tr-original[data-p-index="${pIndex}"]`);
        if (original) original.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }

    function queueTranslationSave(chapterId, pIndex, text) {
        const key = `${chapterId}:${pIndex}`;
        clearTimeout(ctx.translationSaveTimers[key]);
        ctx.translationSaveTimers[key] = setTimeout(async () => {
            try {
                await fetch(`/Reader/${ctx.bookId}/Chapter/${chapterId}/Translations`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ paragraphIndex: Number(pIndex), translatedText: text })
                });
            } catch (err) {
                console.error('Lỗi lưu bản dịch:', err);
            }
        }, 500);
    }

    ctx.api.setTranslationMode = setTranslationMode;
    ctx.api.renderTranslationGrid = renderTranslationGrid;
    ctx.api.setupTranslateToggle = setupTranslateToggle;
}