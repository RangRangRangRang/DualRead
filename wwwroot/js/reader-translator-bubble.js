export function initBubbleTranslator(ctx) {
    let currentSelectionText = '';
    let currentContextText = '';
    let currentTranslatedText = '';
    let currentVocabList = [];
    let isBubbleVisible = false;
    let isPopoverVisible = false;

    // Create DOM elements if not already present
    let bubble = document.getElementById('quick-trans-bubble');
    if (!bubble) {
        bubble = document.createElement('button');
        bubble.id = 'quick-trans-bubble';
        bubble.className = 'quick-trans-bubble';
        bubble.setAttribute('type', 'button');
        bubble.setAttribute('title', 'Dịch');
        bubble.setAttribute('aria-label', 'Dịch vùng chọn');
        bubble.innerHTML = `
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                <line x1="11" y1="8" x2="11" y2="14"></line>
                <line x1="8" y1="11" x2="14" y2="11"></line>
            </svg>
        `;
        document.body.appendChild(bubble);
    }

    let popover = document.getElementById('quick-trans-popover');
    if (!popover) {
        popover = document.createElement('div');
        popover.id = 'quick-trans-popover';
        popover.className = 'quick-trans-popover';
        popover.setAttribute('role', 'dialog');
        popover.setAttribute('aria-label', 'Bản dịch nhanh');
        document.body.appendChild(popover);
    }

    // Helper to hide both
    function hideAll() {
        if (bubble) {
            bubble.classList.remove('show');
            bubble.style.display = 'none';
            isBubbleVisible = false;
        }
        if (popover) {
            popover.classList.remove('show');
            popover.style.display = 'none';
            isPopoverVisible = false;
        }
    }

    function hideBubble() {
        if (bubble) {
            bubble.classList.remove('show');
            bubble.style.display = 'none';
            isBubbleVisible = false;
        }
    }

    // Text selection listener
    function handleSelection(e) {
        // If clicking inside the popover or bubble, do not close or re-evaluate
        if (popover && popover.contains(e.target)) return;
        if (bubble && bubble.contains(e.target)) return;

        // Give browser time to finalize selection
        setTimeout(() => {
            const sel = window.getSelection();
            if (!sel || sel.isCollapsed) {
                if (isBubbleVisible && !isPopoverVisible) {
                    hideBubble();
                }
                return;
            }

            const text = sel.toString().trim();
            if (!text || text.length < 1) {
                if (isBubbleVisible && !isPopoverVisible) {
                    hideBubble();
                }
                return;
            }

            // Make sure selection is inside the reader content or translation grid
            const range = sel.getRangeAt(0);
            const container = range.commonAncestorContainer;
            const element = container.nodeType === Node.ELEMENT_NODE ? container : container.parentElement;

            if (!element) return;
            const isInReader = element.closest('#reader-viewport, #reader-columns, .tr-original, #reader-split');
            if (!isInReader) {
                return;
            }

            currentSelectionText = text;

            // Extract surrounding context sentence/paragraph
            currentContextText = extractContext(element, text);

            // Get coordinates
            const rect = range.getBoundingClientRect();
            if (rect.width === 0 && rect.height === 0) return;

            // Calculate bubble position centered horizontally above the selection
            const bubbleWidth = 36;
            const bubbleHeight = 36;
            let bubbleLeft = rect.left + (rect.width / 2) - (bubbleWidth / 2);
            let bubbleTop = rect.top - bubbleHeight - 8;

            // Boundary check: if too close to top edge, show below selection
            if (bubbleTop < 10) {
                bubbleTop = rect.bottom + 8;
            }
            if (bubbleLeft < 10) bubbleLeft = 10;
            if (bubbleLeft + bubbleWidth > window.innerWidth - 10) {
                bubbleLeft = window.innerWidth - bubbleWidth - 10;
            }

            bubble.style.left = `${bubbleLeft + window.scrollX}px`;
            bubble.style.top = `${bubbleTop + window.scrollY}px`;
            bubble.style.display = 'flex';
            bubble.classList.add('show');
            isBubbleVisible = true;
        }, 30);
    }

    function extractContext(element, selectedText) {
        const blockEl = element.closest('p, [data-p-index], div, li, blockquote') || element;
        const fullText = blockEl.textContent || '';
        if (!fullText) return selectedText;

        const idx = fullText.indexOf(selectedText);
        if (idx === -1) return fullText.trim().substring(0, 300);

        // Find sentence boundaries around the selected text
        let start = Math.max(0, idx - 100);
        let end = Math.min(fullText.length, idx + selectedText.length + 100);

        let snippet = fullText.substring(start, end).trim();
        if (start > 0) snippet = '...' + snippet;
        if (end < fullText.length) snippet = snippet + '...';

        return snippet;
    }

    // Click Bubble to open Popover
    bubble.addEventListener('click', async (e) => {
        e.stopPropagation();
        e.preventDefault();

        if (!currentSelectionText) return;

        const bubbleRect = bubble.getBoundingClientRect();
        hideBubble();

        // Calculate popover position
        const popoverWidth = Math.min(380, window.innerWidth - 24);
        let popoverLeft = bubbleRect.left + (bubbleRect.width / 2) - (popoverWidth / 2);
        let popoverTop = bubbleRect.bottom + 10;

        if (popoverLeft < 12) popoverLeft = 12;
        if (popoverLeft + popoverWidth > window.innerWidth - 12) {
            popoverLeft = window.innerWidth - popoverWidth - 12;
        }

        // If popover goes off bottom of screen, show above selection
        if (popoverTop + 240 > window.innerHeight) {
            popoverTop = Math.max(12, bubbleRect.top - 240);
        }

        popover.style.width = `${popoverWidth}px`;
        popover.style.left = `${popoverLeft + window.scrollX}px`;
        popover.style.top = `${popoverTop + window.scrollY}px`;
        popover.style.display = 'block';
        popover.classList.add('show');
        isPopoverVisible = true;

        // Render loading state
        renderPopoverLoading(currentSelectionText);

        try {
            let data = null;

            // Step 1: Call Backend Translation API (via POST for robustness on long text)
            try {
                const res = await fetch('/api/translate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ text: currentSelectionText })
                });
                if (res.ok) {
                    data = await res.json();
                }
            } catch (backendErr) {
                console.warn('Backend translate failed, trying fallback...', backendErr);
            }

            // Step 2: Client-side direct fallback if backend didn't return valid data
            if (!data || !data.translatedText) {
                const fallbackUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=vi&dt=t&q=${encodeURIComponent(currentSelectionText)}`;
                const fallbackRes = await fetch(fallbackUrl);
                if (fallbackRes.ok) {
                    const raw = await fallbackRes.json();
                    let translatedParts = '';
                    if (Array.isArray(raw) && Array.isArray(raw[0])) {
                        raw[0].forEach(p => { if (p && p[0]) translatedParts += p[0]; });
                    }
                    if (translatedParts) {
                        data = {
                            originalText: currentSelectionText,
                            translatedText: translatedParts.trim(),
                            dict: []
                        };
                    }
                }
            }

            if (!data || !data.translatedText) {
                throw new Error('Không nhận được dữ liệu dịch');
            }

            currentTranslatedText = data.translatedText || currentSelectionText;

            // Check if this text is already in saved vocabulary
            const isSaved = currentVocabList.some(v => v.originalText.toLowerCase() === currentSelectionText.toLowerCase());

            renderPopoverContent(data, isSaved);
        } catch (err) {
            console.error('Translation error:', err);
            renderPopoverError();
        }
    });

    function renderPopoverLoading(original) {
        const displayTitle = original.length > 35 ? original.substring(0, 35) + '...' : original;
        popover.innerHTML = `
            <div class="quick-trans-header">
                <div class="quick-trans-title" title="${escapeHtml(original)}">${escapeHtml(displayTitle)}</div>
                <button type="button" class="quick-trans-close-btn" aria-label="Đóng">&times;</button>
            </div>
            <div class="quick-trans-body">
                <div class="quick-trans-skeleton">
                    <div class="skeleton-line skeleton-line-title"></div>
                    <div class="skeleton-line skeleton-line-sub"></div>
                </div>
            </div>
        `;

        popover.querySelector('.quick-trans-close-btn')?.addEventListener('click', hideAll);
    }

    function renderPopoverContent(data, isSaved) {
        const original = data.originalText;
        const displayTitle = original.length > 35 ? original.substring(0, 35) + '...' : original;
        const translated = data.translatedText;

        let dictHtml = '';
        if (data.dict && data.dict.length > 0) {
            dictHtml = `
                <div class="quick-trans-dict">
                    ${data.dict.map(d => `
                        <div class="quick-trans-dict-row">
                            <span class="dict-pos">${escapeHtml(d.pos)}</span>
                            <span class="dict-terms">${escapeHtml(d.terms.join(', '))}</span>
                        </div>
                    `).join('')}
                </div>
            `;
        }

        popover.innerHTML = `
            <div class="quick-trans-header">
                <div class="quick-trans-title" title="${escapeHtml(original)}">${escapeHtml(displayTitle)}</div>
                <div class="quick-trans-header-actions">
                    <button type="button" class="quick-trans-btn quick-trans-copy-btn" title="Sao chép bản dịch" aria-label="Copy">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                        </svg>
                    </button>
                    <button type="button" class="quick-trans-close-btn" aria-label="Đóng">&times;</button>
                </div>
            </div>
            <div class="quick-trans-body">
                <div class="quick-trans-result">${escapeHtml(translated)}</div>
                ${dictHtml}
            </div>
            <div class="quick-trans-footer">
                <button type="button" class="quick-trans-save-btn ${isSaved ? 'saved' : ''}" id="popover-save-vocab-btn">
                    <span class="save-icon">${isSaved ? '★' : '⭐'}</span>
                    <span class="save-label">${isSaved ? 'Đã lưu vào sổ' : 'Lưu từ vựng'}</span>
                </button>
            </div>
        `;

        // Bind events inside popover
        popover.querySelector('.quick-trans-close-btn')?.addEventListener('click', hideAll);

        const copyBtn = popover.querySelector('.quick-trans-copy-btn');
        copyBtn?.addEventListener('click', () => {
            navigator.clipboard.writeText(translated).then(() => {
                copyBtn.classList.add('copied');
                copyBtn.innerHTML = `
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                `;
                setTimeout(() => {
                    copyBtn.classList.remove('copied');
                    copyBtn.innerHTML = `
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                        </svg>
                    `;
                }, 1500);
            }).catch(() => {});
        });

        const saveBtn = popover.querySelector('#popover-save-vocab-btn');
        saveBtn?.addEventListener('click', async () => {
            if (saveBtn.classList.contains('saved')) return;

            saveBtn.disabled = true;
            try {
                const currentChapter = ctx.chapters[ctx.currentChapterIndex];
                const payload = {
                    bookId: ctx.bookId,
                    bookTitle: ctx.readerData?.title || 'Sách',
                    chapterId: currentChapter?.id,
                    chapterTitle: currentChapter?.title || '',
                    originalText: original,
                    translatedText: translated,
                    contextText: currentContextText
                };

                const res = await fetch('/api/vocabulary', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (res.ok) {
                    const savedItem = await res.json();
                    currentVocabList.unshift(savedItem);
                    saveBtn.classList.add('saved');
                    saveBtn.innerHTML = `<span class="save-icon">★</span> <span class="save-label">Đã lưu vào sổ</span>`;
                    
                    // Refresh reader sidebar vocabulary
                    renderSidebarVocabularyList(ctx, currentVocabList);
                    window.dispatchEvent(new CustomEvent('dualread:vocabularyUpdated', { detail: savedItem }));
                }
            } catch (err) {
                console.error('Failed to save vocabulary:', err);
            } finally {
                saveBtn.disabled = false;
            }
        });
    }

    function renderPopoverError() {
        popover.innerHTML = `
            <div class="quick-trans-header">
                <div class="quick-trans-title">Lỗi dịch thuật</div>
                <button type="button" class="quick-trans-close-btn" aria-label="Đóng">&times;</button>
            </div>
            <div class="quick-trans-body">
                <p class="text-danger" style="margin:0; font-size:13px;">Không thể kết nối đến máy chủ dịch thuật. Vui lòng thử lại sau.</p>
            </div>
        `;
        popover.querySelector('.quick-trans-close-btn')?.addEventListener('click', hideAll);
    }

    // Click outside to dismiss popover and bubble
    document.addEventListener('mousedown', (e) => {
        if (isPopoverVisible && popover && !popover.contains(e.target) && !bubble.contains(e.target)) {
            hideAll();
        } else if (isBubbleVisible && !isPopoverVisible && bubble && !bubble.contains(e.target)) {
            hideBubble();
        }
    });

    document.addEventListener('touchstart', (e) => {
        if (isPopoverVisible && popover && !popover.contains(e.target) && !bubble.contains(e.target)) {
            hideAll();
        }
    }, { passive: true });

    // Keyboard ESC to close
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            hideAll();
        }
    });

    // Selection listeners
    document.addEventListener('mouseup', handleSelection);
    document.addEventListener('touchend', handleSelection);

    // Sidebar Vocabulary Management
    async function loadSidebarVocabulary() {
        try {
            const res = await fetch(`/api/vocabulary/book/${ctx.bookId}`);
            if (res.ok) {
                currentVocabList = await res.json();
                renderSidebarVocabularyList(ctx, currentVocabList);
            }
        } catch (err) {
            console.error('Failed to load book vocabulary:', err);
        }
    }

    function setupSidebarVocabulary() {
        const searchInput = document.getElementById('vocab-sidebar-search');
        if (searchInput) {
            searchInput.addEventListener('input', () => {
                const query = searchInput.value.toLowerCase().trim();
                const filtered = query
                    ? currentVocabList.filter(v => 
                        (v.originalText && v.originalText.toLowerCase().includes(query)) ||
                        (v.translatedText && v.translatedText.toLowerCase().includes(query)) ||
                        (v.contextText && v.contextText.toLowerCase().includes(query)))
                    : currentVocabList;
                renderSidebarVocabularyList(ctx, filtered, true);
            });
        }
    }

    window.addEventListener('dualread:vocabularyUpdated', () => {
        loadSidebarVocabulary();
    });

    // Initial load
    loadSidebarVocabulary();
    setupSidebarVocabulary();
}

function renderSidebarVocabularyList(ctx, list, isSearching = false) {
    const listEl = document.getElementById('vocab-sidebar-list');
    const emptyEl = document.getElementById('vocab-sidebar-empty');
    const countBadge = document.getElementById('vocab-sidebar-count');

    if (countBadge) {
        countBadge.textContent = list.length;
    }

    if (!listEl) return;

    if (list.length === 0) {
        listEl.innerHTML = '';
        if (emptyEl) {
            emptyEl.style.display = 'block';
            emptyEl.textContent = isSearching ? 'Không tìm thấy từ vựng khớp với tìm kiếm.' : 'Chưa có từ vựng nào được lưu trong sách này.';
        }
        return;
    }

    if (emptyEl) emptyEl.style.display = 'none';

    listEl.innerHTML = list.map(item => `
        <li class="vocab-sidebar-item" data-id="${item.id}" data-chapter-id="${item.chapterId || ''}">
            <div class="vocab-item-main">
                <div class="vocab-item-words">
                    <span class="vocab-item-orig">${escapeHtml(item.originalText)}</span>
                    <span class="vocab-item-trans">${escapeHtml(item.translatedText)}</span>
                </div>
            </div>
            <button type="button" class="vocab-item-del-btn" data-del-id="${item.id}" title="Xóa từ này" aria-label="Xóa">
                &times;
            </button>
        </li>
    `).join('');

    // Bind delete buttons
    listEl.querySelectorAll('.vocab-item-del-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const id = btn.getAttribute('data-del-id');
            if (!id) return;

            try {
                const res = await fetch(`/api/vocabulary/${id}`, { method: 'DELETE' });
                if (res.ok) {
                    btn.closest('.vocab-sidebar-item')?.remove();
                    window.dispatchEvent(new CustomEvent('dualread:vocabularyUpdated'));
                }
            } catch (err) {
                console.error('Lỗi xóa từ vựng:', err);
            }
        });
    });

    // Bind click to locate word in chapter
    listEl.querySelectorAll('.vocab-sidebar-item').forEach(itemEl => {
        itemEl.addEventListener('click', () => {
            const orig = itemEl.querySelector('.vocab-item-orig')?.textContent?.trim();
            if (!orig) return;

            // Highlight and scroll to the text in reader
            findAndHighlightTextInReader(orig);
        });
    });
}

function findAndHighlightTextInReader(text) {
    if (!text) return;
    const readerViewport = document.getElementById('reader-viewport');
    if (!readerViewport) return;

    // Search for elements containing the text
    const walker = document.createTreeWalker(readerViewport, NodeFilter.SHOW_TEXT, null, false);
    let node;
    while ((node = walker.nextNode())) {
        if (node.nodeValue && node.nodeValue.toLowerCase().includes(text.toLowerCase())) {
            const parent = node.parentElement;
            if (parent) {
                parent.scrollIntoView({ behavior: 'smooth', block: 'center' });
                parent.classList.add('vocab-highlight-flash');
                setTimeout(() => parent.classList.remove('vocab-highlight-flash'), 2500);
                break;
            }
        }
    }
}

function escapeHtml(str) {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
