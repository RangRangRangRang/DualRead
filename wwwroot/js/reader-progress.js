export function initProgress(ctx) {
    function debounce(fn, delayMs) {
        let handle = null;
        return (...args) => {
            clearTimeout(handle);
            handle = setTimeout(() => fn(...args), delayMs);
        };
    }

    async function postJson(url, body) {
        if (body === null || body === undefined) {
            console.warn(`Skipped POST ${url}: empty payload.`);
            return false;
        }
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json; charset=utf-8',
                    'Accept': 'application/json, text/plain, */*'
                },
                body: JSON.stringify(body)
            });
            if (!response.ok) {
                const detail = await response.text().catch(() => '');
                console.warn(`POST ${url} failed with HTTP ${response.status}.`, detail || 'No response body.');
                return false;
            }
            return true;
        } catch (err) {
            console.warn(`POST ${url} failed:`, err);
            return false;
        }
    }

    function buildProgressPayload() {
        if (!ctx.bookId || !ctx.readerViewport) return null;
        const chapter = ctx.chapters[ctx.currentChapterIndex];
        if (!chapter?.id) return null;
        return {
            currentChapterId: chapter.id,
            currentPage: 0,
            currentScrollOffset: Math.max(0, Math.round(ctx.readerViewport.scrollTop)),
            linesPerPage: Math.max(1, Number(ctx.readerData.settings?.linesPerPage) || 25),
            translationModeOn: Boolean(ctx.translationModeOn)
        };
    }

    async function saveProgressNow() {
        const payload = buildProgressPayload();
        if (!payload) return;
        const key = JSON.stringify(payload);
        if (key === ctx.lastSavedProgressKey) return;
        if (ctx.progressRequestInFlight) {
            ctx.pendingProgressPayload = payload;
            return;
        }
        ctx.progressRequestInFlight = true;
        const saved = await postJson(`/Reader/${ctx.bookId}/Progress`, payload);
        ctx.progressRequestInFlight = false;
        if (saved) ctx.lastSavedProgressKey = key;

        if (ctx.pendingProgressPayload) {
            const nextPayload = ctx.pendingProgressPayload;
            ctx.pendingProgressPayload = null;
            const nextKey = JSON.stringify(nextPayload);
            if (nextKey !== ctx.lastSavedProgressKey) {
                ctx.progressRequestInFlight = true;
                const nextSaved = await postJson(`/Reader/${ctx.bookId}/Progress`, nextPayload);
                ctx.progressRequestInFlight = false;
                if (nextSaved) ctx.lastSavedProgressKey = nextKey;
            }
        }
    }

    const saveReadingProgress = debounce(saveProgressNow, 500);

    const saveSettingsNow = () => {
        if (!ctx.readerData.settings) return;
        postJson(`/Reader/${ctx.bookId}/Settings`, ctx.readerData.settings);
    };
    const saveSettings = debounce(saveSettingsNow, 400);

    ctx.api.postJson = postJson;
    ctx.api.saveReadingProgress = saveReadingProgress;
    ctx.api.saveSettings = saveSettings;
    ctx.api.saveProgressNow = saveProgressNow;
}
