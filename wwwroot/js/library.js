(function () {
    'use strict';

    var VIEW_STORAGE_KEY = 'dualread_library_view';
    var SORT_STORAGE_KEY = 'dualread_library_sort';
    var LANG_STORAGE_KEY = 'dualread_language';
    var DEBOUNCE_MS = 150;

    var libraryTranslations = {
        en: {
            library: 'Library',
            upload: '+ Upload',
            vocabNotebook: 'Vocabulary Bank',
            vocabNotebookTitle: 'View all saved vocabulary',
            copyRecoveryKeyTitle: 'Click to copy recovery key',
            noBooks: 'No books yet. Upload your first EPUB, PDF, or DOCX to get started.',
            searchPlaceholder: 'Search by title or author…',
            sortRecentDesc: 'Newest',
            sortRecentAsc: 'Oldest',
            sortTitleAsc: 'A-Z',
            sortTitleDesc: 'Z-A',
            noResults: 'No books match your search.',
            format_epub: 'EPUB Books',
            format_pdf: 'PDF Documents',
            format_docx: 'Word Documents (.docx)',
            delete: 'Delete',
            confirmDelete: 'Are you sure you want to delete this book?',
            vocabModalTitle: 'Vocabulary Bank',
            vocabSearchPlaceholder: 'Search words, meanings...',
            allBooks: 'All Books',
            vocabEmptyTitle: 'No vocabulary saved',
            vocabEmptyDesc: 'While reading, select any word or sentence and click ⭐ Save Vocabulary to review here.',
            vocabEmptyFiltered: 'No vocabulary matches your search/filter.',
            copied: '✓ Copied',
            copy: '📋 Copy',
            wordsCountSuffix: ' words'
        },
        vi: {
            library: 'Thư viện',
            upload: '+ Tải sách lên',
            vocabNotebook: 'Sổ từ vựng',
            vocabNotebookTitle: 'Xem tất cả từ vựng đã lưu',
            copyRecoveryKeyTitle: 'Click để sao chép mã khôi phục',
            noBooks: 'Chưa có sách nào. Hãy tải lên tệp EPUB, PDF hoặc DOCX đầu tiên để bắt đầu.',
            searchPlaceholder: 'Tìm theo tên sách hoặc tác giả…',
            sortRecentDesc: 'Mới nhất',
            sortRecentAsc: 'Cũ nhất',
            sortTitleAsc: 'Tên A-Z',
            sortTitleDesc: 'Tên Z-A',
            noResults: 'Không tìm thấy cuốn sách nào khớp với tìm kiếm.',
            format_epub: 'Sách EPUB',
            format_pdf: 'Tài liệu PDF',
            format_docx: 'Tài liệu Word (.docx)',
            delete: 'Xóa',
            confirmDelete: 'Bạn có chắc chắn muốn xóa cuốn sách này không?',
            vocabModalTitle: 'Kho Từ Vựng Toàn Thư Viện',
            vocabSearchPlaceholder: 'Tìm từ vựng, nghĩa tiếng Việt...',
            allBooks: 'Tất cả sách',
            vocabEmptyTitle: 'Chưa có từ vựng nào',
            vocabEmptyDesc: 'Trong khi đọc sách, hãy bôi đen bất kỳ từ hoặc câu nào và bấm nút ⭐ Lưu từ vựng để ôn tập tại đây.',
            vocabEmptyFiltered: 'Không tìm thấy từ vựng nào khớp với bộ lọc.',
            copied: '✓ Đã chép',
            copy: '📋 Sao chép',
            wordsCountSuffix: ' từ'
        }
    };

    document.addEventListener('DOMContentLoaded', function () {
        var container = document.getElementById('library-sections-container');
        var searchInput = document.getElementById('library-search-input');
        var searchClearBtn = document.getElementById('library-search-clear');
        var sortSelect = document.getElementById('library-sort-select');
        var viewGridBtn = document.getElementById('library-view-grid');
        var viewListBtn = document.getElementById('library-view-list');
        var noResultsMsg = document.getElementById('library-no-results');
        var langSelect = document.getElementById('library-language-select');

        // Language Management
        function applyLanguage(lang) {
            var dict = libraryTranslations[lang] || libraryTranslations.en;
            document.documentElement.lang = lang;
            document.body.classList.toggle('lang-vi', lang === 'vi');

            document.querySelectorAll('[data-i18n]').forEach(function (el) {
                var key = el.getAttribute('data-i18n');
                if (dict[key]) el.textContent = dict[key];
            });

            document.querySelectorAll('[data-i18n-aria]').forEach(function (el) {
                var key = el.getAttribute('data-i18n-aria');
                if (dict[key]) {
                    el.setAttribute('aria-label', dict[key]);
                    el.title = dict[key];
                }
            });

            document.querySelectorAll('[data-i18n-title]').forEach(function (el) {
                var key = el.getAttribute('data-i18n-title');
                if (dict[key]) el.title = dict[key];
            });

            document.querySelectorAll('[data-i18n-placeholder]').forEach(function (el) {
                var key = el.getAttribute('data-i18n-placeholder');
                if (dict[key]) el.placeholder = dict[key];
            });

            document.querySelectorAll('[data-i18n-format]').forEach(function (el) {
                var format = el.getAttribute('data-i18n-format');
                var key = 'format_' + format;
                if (dict[key]) el.textContent = dict[key];
            });

            document.querySelectorAll('.lang-seg-btn').forEach(function (btn) {
                var btnLang = btn.getAttribute('data-lang');
                btn.classList.toggle('active', btnLang === lang);
            });

            if (langSelect && langSelect.value !== lang) {
                langSelect.value = lang;
            }

            try {
                localStorage.setItem(LANG_STORAGE_KEY, lang);
            } catch (e) { }

            updateVocabHeaderCount();
        }

        var savedLang = null;
        try {
            savedLang = localStorage.getItem(LANG_STORAGE_KEY);
        } catch (e) { }

        if (!savedLang) {
            var activeBtn = document.querySelector('.lang-seg-btn.active');
            savedLang = activeBtn ? activeBtn.getAttribute('data-lang') : (langSelect ? langSelect.value : 'en');
        }
        applyLanguage(savedLang || 'en');

        document.querySelectorAll('.lang-seg-btn').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var newLang = btn.getAttribute('data-lang');
                if (!newLang || newLang === document.documentElement.lang) return;

                applyLanguage(newLang);

                // Sync with server DB
                fetch('/api/settings/language', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ language: newLang })
                }).catch(function (err) {
                    console.warn('Could not sync language setting with server:', err);
                });
            });
        });

        if (langSelect) {
            langSelect.addEventListener('change', function (e) {
                var newLang = e.target.value;
                applyLanguage(newLang);

                // Sync with server DB
                fetch('/api/settings/language', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ language: newLang })
                }).catch(function (err) {
                    console.warn('Could not sync language setting with server:', err);
                });
            });
        }

        if (container) {
            var sections = Array.prototype.slice.call(container.querySelectorAll('.library-format-section'));
            var grids = Array.prototype.slice.call(container.querySelectorAll('.book-grid'));
            var cards = Array.prototype.slice.call(container.querySelectorAll('.book-card'));

            var debounceTimer = null;

            function applyFilter() {
                var query = (searchInput.value || '').trim().toLowerCase();
                if (searchClearBtn) searchClearBtn.hidden = query.length === 0;

                var totalVisible = 0;

                sections.forEach(function (sec) {
                    var secCards = Array.prototype.slice.call(sec.querySelectorAll('.book-card'));
                    var secVisible = 0;

                    secCards.forEach(function (card) {
                        var title = card.getAttribute('data-title') || '';
                        var author = card.getAttribute('data-author') || '';
                        var matches = query === '' || title.indexOf(query) !== -1 || author.indexOf(query) !== -1;
                        card.hidden = !matches;
                        if (matches) {
                            secVisible++;
                            totalVisible++;
                        }
                    });

                    sec.hidden = secVisible === 0;
                });

                if (noResultsMsg) {
                    noResultsMsg.hidden = totalVisible !== 0;
                }
            }

            function applySort() {
                var mode = sortSelect ? sortSelect.value : 'recent-desc';

                sections.forEach(function (sec) {
                    var grid = sec.querySelector('.book-grid');
                    if (!grid) return;

                    var secCards = Array.prototype.slice.call(grid.querySelectorAll('.book-card'));
                    var sorted = secCards.sort(function (a, b) {
                        switch (mode) {
                            case 'title-asc':
                                return (a.getAttribute('data-title') || '').localeCompare(b.getAttribute('data-title') || '');
                            case 'title-desc':
                                return (b.getAttribute('data-title') || '').localeCompare(a.getAttribute('data-title') || '');
                            case 'recent-asc':
                                return Number(a.getAttribute('data-uploaded') || 0) - Number(b.getAttribute('data-uploaded') || 0);
                            case 'recent-desc':
                            default:
                                return Number(b.getAttribute('data-uploaded') || 0) - Number(a.getAttribute('data-uploaded') || 0);
                        }
                    });

                    sorted.forEach(function (card) {
                        grid.appendChild(card);
                    });
                });

                try {
                    localStorage.setItem(SORT_STORAGE_KEY, mode);
                } catch (e) { }
            }

            function setView(view) {
                grids.forEach(function (grid) {
                    grid.classList.toggle('book-grid-list', view === 'list');
                });

                if (viewGridBtn) {
                    viewGridBtn.classList.toggle('active', view === 'grid');
                    viewGridBtn.setAttribute('aria-pressed', String(view === 'grid'));
                }
                if (viewListBtn) {
                    viewListBtn.classList.toggle('active', view === 'list');
                    viewListBtn.setAttribute('aria-pressed', String(view === 'list'));
                }

                try {
                    localStorage.setItem(VIEW_STORAGE_KEY, view);
                } catch (e) { }
            }

            if (searchInput) {
                searchInput.addEventListener('input', function () {
                    clearTimeout(debounceTimer);
                    debounceTimer = setTimeout(applyFilter, DEBOUNCE_MS);
                });
            }

            if (searchClearBtn) {
                searchClearBtn.addEventListener('click', function () {
                    searchInput.value = '';
                    applyFilter();
                    searchInput.focus();
                });
            }

            if (sortSelect) {
                sortSelect.addEventListener('change', applySort);
            }

            if (viewGridBtn) {
                viewGridBtn.addEventListener('click', function () { setView('grid'); });
            }
            if (viewListBtn) {
                viewListBtn.addEventListener('click', function () { setView('list'); });
            }

            var savedView = null;
            var savedSort = null;
            try {
                savedView = localStorage.getItem(VIEW_STORAGE_KEY);
                savedSort = localStorage.getItem(SORT_STORAGE_KEY);
            } catch (e) { }

            if (savedView === 'list' || savedView === 'grid') {
                setView(savedView);
            }
            if (savedSort && sortSelect) {
                var optionExists = Array.prototype.some.call(sortSelect.options, function (opt) {
                    return opt.value === savedSort;
                });
                if (optionExists) sortSelect.value = savedSort;
            }

            applySort();
            applyFilter();
        }

        // ==========================================
        // Library Vocabulary Modal Management
        // ==========================================
        var vocabList = [];
        var openVocabModalBtn = document.getElementById('open-vocab-modal-btn');
        var vocabBackdrop = document.getElementById('vocab-modal-backdrop');
        var closeVocabModalBtn = document.getElementById('close-vocab-modal-btn');
        var vocabSearchInput = document.getElementById('vocab-modal-search');
        var vocabBookFilter = document.getElementById('vocab-modal-book-filter');
        var vocabGrid = document.getElementById('vocab-modal-list');
        var vocabEmpty = document.getElementById('vocab-modal-empty');
        var vocabCountBadge = document.getElementById('vocab-modal-count-badge');
        var headerTotalBadge = document.getElementById('library-vocab-total-count');

        function fetchVocabulary() {
            fetch('/api/vocabulary')
                .then(function (res) { return res.ok ? res.json() : []; })
                .then(function (data) {
                    vocabList = data || [];
                    updateVocabHeaderCount();
                    populateBookFilter();
                    renderVocabList();
                })
                .catch(function (err) {
                    console.error('Error fetching library vocabulary:', err);
                });
        }

        function updateVocabHeaderCount() {
            var currentL = document.documentElement.lang || 'en';
            var suffix = (libraryTranslations[currentL] || libraryTranslations.en).wordsCountSuffix;
            if (headerTotalBadge) {
                headerTotalBadge.textContent = vocabList.length;
                headerTotalBadge.style.display = vocabList.length > 0 ? 'inline-block' : 'none';
            }
            if (vocabCountBadge) {
                vocabCountBadge.textContent = vocabList.length + suffix;
            }
        }

        function populateBookFilter() {
            if (!vocabBookFilter) return;
            var currentVal = vocabBookFilter.value;
            var currentL = document.documentElement.lang || 'en';
            var allLabel = (libraryTranslations[currentL] || libraryTranslations.en).allBooks;
            vocabBookFilter.innerHTML = '<option value="">' + allLabel + '</option>';

            var booksMap = {};
            vocabList.forEach(function (v) {
                if (v.bookId && v.bookTitle) {
                    booksMap[v.bookId] = v.bookTitle;
                }
            });

            Object.keys(booksMap).forEach(function (bookId) {
                var opt = document.createElement('option');
                opt.value = bookId;
                opt.textContent = booksMap[bookId];
                if (bookId === currentVal) opt.selected = true;
                vocabBookFilter.appendChild(opt);
            });
        }

        function openModal() {
            if (!vocabBackdrop) return;
            vocabBackdrop.style.display = 'flex';
            document.body.style.overflow = 'hidden';
            if (vocabSearchInput) {
                vocabSearchInput.value = '';
                vocabSearchInput.focus();
            }
            renderVocabList();
        }

        function closeModal() {
            if (!vocabBackdrop) return;
            vocabBackdrop.style.display = 'none';
            document.body.style.overflow = '';
        }

        function renderVocabList() {
            if (!vocabGrid) return;

            var currentL = document.documentElement.lang || 'en';
            var dict = libraryTranslations[currentL] || libraryTranslations.en;

            var query = (vocabSearchInput ? vocabSearchInput.value : '').toLowerCase().trim();
            var selectedBook = vocabBookFilter ? vocabBookFilter.value : '';

            var filtered = vocabList.filter(function (v) {
                var matchesBook = !selectedBook || v.bookId === selectedBook;
                var matchesQuery = !query ||
                    (v.originalText && v.originalText.toLowerCase().indexOf(query) !== -1) ||
                    (v.translatedText && v.translatedText.toLowerCase().indexOf(query) !== -1) ||
                    (v.bookTitle && v.bookTitle.toLowerCase().indexOf(query) !== -1);

                return matchesBook && matchesQuery;
            });

            if (filtered.length === 0) {
                vocabGrid.innerHTML = '';
                if (vocabEmpty) {
                    vocabEmpty.style.display = 'block';
                    var emptyDesc = vocabEmpty.querySelector('.vocab-empty-desc');
                    if (emptyDesc) {
                        emptyDesc.textContent = query || selectedBook
                            ? dict.vocabEmptyFiltered
                            : dict.vocabEmptyDesc;
                    }
                }
                return;
            }

            if (vocabEmpty) vocabEmpty.style.display = 'none';

            vocabGrid.innerHTML = filtered.map(function (item) {
                var dateStr = '';
                try {
                    if (item.createdAtUtc) {
                        var d = new Date(item.createdAtUtc);
                        dateStr = d.toLocaleDateString(currentL === 'vi' ? 'vi-VN' : 'en-US', { day: '2-digit', month: '2-digit', year: 'numeric' });
                    }
                } catch (e) { }

                var bookInfo = item.bookTitle || (currentL === 'vi' ? 'Không rõ sách' : 'Unknown Book');
                if (item.chapterTitle) bookInfo += ' • ' + item.chapterTitle;

                return `
                    <div class="vocab-card" data-id="${item.id}">
                        <div class="vocab-card-header">
                            <span class="vocab-card-book-tag" title="${escapeHtml(bookInfo)}">${escapeHtml(bookInfo)}</span>
                            <button type="button" class="vocab-card-delete-btn" data-del-id="${item.id}" title="${dict.delete}" aria-label="${dict.delete}">
                                &times;
                            </button>
                        </div>
                        <div class="vocab-card-body">
                            <div class="vocab-card-orig">${escapeHtml(item.originalText)}</div>
                            <div class="vocab-card-trans">${escapeHtml(item.translatedText)}</div>
                        </div>
                        <div class="vocab-card-footer">
                            <span class="vocab-card-date">${dateStr}</span>
                            <button type="button" class="vocab-card-copy-btn" data-copy-text="${escapeHtml(item.originalText + ' - ' + item.translatedText)}" title="${dict.copy}">
                                ${dict.copy}
                            </button>
                        </div>
                    </div>
                `;
            }).join('');

            // Delete buttons
            vocabGrid.querySelectorAll('.vocab-card-delete-btn').forEach(function (btn) {
                btn.addEventListener('click', function (e) {
                    e.stopPropagation();
                    var id = btn.getAttribute('data-del-id');
                    if (!id) return;

                    fetch('/api/vocabulary/' + id, { method: 'DELETE' })
                        .then(function (res) {
                            if (res.ok) {
                                vocabList = vocabList.filter(function (x) { return x.id !== id; });
                                updateVocabHeaderCount();
                                populateBookFilter();
                                renderVocabList();
                            }
                        })
                        .catch(function (err) {
                            console.error('Error deleting vocabulary:', err);
                        });
                });
            });

            // Copy buttons
            vocabGrid.querySelectorAll('.vocab-card-copy-btn').forEach(function (btn) {
                btn.addEventListener('click', function (e) {
                    e.stopPropagation();
                    var text = btn.getAttribute('data-copy-text') || '';
                    navigator.clipboard.writeText(text).then(function () {
                        var prev = btn.textContent;
                        btn.textContent = dict.copied;
                        setTimeout(function () { btn.textContent = prev; }, 1200);
                    }).catch(function () { });
                });
            });
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

        if (openVocabModalBtn) {
            openVocabModalBtn.addEventListener('click', openModal);
        }
        if (closeVocabModalBtn) {
            closeVocabModalBtn.addEventListener('click', closeModal);
        }
        if (vocabBackdrop) {
            vocabBackdrop.addEventListener('click', function (e) {
                if (e.target === vocabBackdrop) {
                    closeModal();
                }
            });
        }

        if (vocabSearchInput) {
            vocabSearchInput.addEventListener('input', renderVocabList);
        }
        if (vocabBookFilter) {
            vocabBookFilter.addEventListener('change', renderVocabList);
        }

        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && vocabBackdrop && vocabBackdrop.style.display === 'flex') {
                closeModal();
            }
        });

        // Fetch initial vocabulary list for library
        fetchVocabulary();
    });
})();
