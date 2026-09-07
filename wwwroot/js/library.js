(function () {
    'use strict';

    var VIEW_STORAGE_KEY = 'dualread_library_view';
    var SORT_STORAGE_KEY = 'dualread_library_sort';
    var LANG_STORAGE_KEY = 'dualread_language';
    var TAB_STORAGE_KEY = 'dualread_library_tab';
    var DEBOUNCE_MS = 150;

    var libraryTranslations = {
        en: {
            library: 'Library',
            allBooks: 'All Books',
            albums: 'Albums',
            newAlbum: 'New Album',
            upload: 'Upload',
            vocabNotebook: 'Vocabulary Bank',
            vocabNotebookTitle: 'View all saved vocabulary',
            joinCode: 'Join code',
            copyRecoveryKeyTitle: 'Click to copy recovery key',
            noBooks: 'No books yet. Upload your first EPUB, PDF, or DOCX to get started.',
            searchPlaceholder: 'Search by title or author…',
            searchAlbumsPlaceholder: 'Search albums or books in albums…',
            sortRecentDesc: 'Newest',
            sortRecentAsc: 'Oldest',
            sortTitleAsc: 'A-Z',
            sortTitleDesc: 'Z-A',
            noResults: 'No books match your search.',
            noAlbumsMatch: 'No albums match your search.',
            format_epub: 'EPUB Books',
            format_pdf: 'PDF Documents',
            format_docx: 'Word Documents (.docx)',
            delete: 'Delete',
            deleteBookConfirm: 'Are you sure you want to delete this book from your library?',
            rename: 'Rename',
            renameBook: 'Rename book',
            album: 'Album',
            addToAlbum: 'Add to album',
            addToAlbumTitle: 'Add to Album',
            renameBookTitle: 'Rename Book',
            bookTitleLabel: 'Title *',
            bookAuthorLabel: 'Author (optional)',
            createAlbumTitle: 'Create New Album',
            renameAlbumTitle: 'Rename Album',
            albumNameLabel: 'Album Name *',
            albumNamePlaceholder: 'e.g. Favorites, Science Fiction, Research...',
            albumDescLabel: 'Description (optional)',
            albumDescPlaceholder: 'Short note about this collection...',
            newAlbumNamePlaceholder: 'Create new album...',
            create: 'Create',
            done: 'Done',
            save: 'Save',
            cancel: 'Cancel',
            noAlbumsTitle: 'No Albums Yet',
            noAlbumsDesc: 'Create albums to organize your books into collections like Favorites, Sci-Fi, History, or Reading Lists.',
            createFirstAlbum: 'Create Your First Album',
            noAlbumsYet: 'No albums created yet.',
            addBooksToAlbumTitle: 'Add Books to Album',
            filterBooksPlaceholder: 'Filter books by title or author...',
            noBooksToSelect: 'All books from your library are already in this album.',
            addSelected: 'Add Selected',
            selectedCountSuffix: ' selected',
            booksCountSuffix: ' books',
            emptyAlbumAddBtn: 'Add books to this album',
            removeBookFromAlbumConfirm: 'Remove this book from this album?',
            deleteAlbumConfirm: 'Are you sure you want to delete this album? Books inside will NOT be deleted.',
            removeFromAlbum: 'Remove',
            removeFromAlbumTitle: 'Remove from album',
            addBooksBtn: 'Add Books',
            // Vocab translations
            vocabModalTitle: 'Vocabulary Bank',
            vocabSearchPlaceholder: 'Search words, meanings...',
            vocabEmptyTitle: 'No vocabulary saved',
            vocabEmptyDesc: 'While reading, select any word or sentence and click Save Vocabulary to review here.',
            vocabEmptyFiltered: 'No vocabulary matches your search/filter.',
            copied: 'Copied',
            copy: 'Copy',
            wordsCountSuffix: ' words'
        },
        vi: {
            library: 'Thư viện',
            allBooks: 'Tất cả sách',
            albums: 'Albums',
            newAlbum: 'Tạo Album',
            upload: 'Tải sách lên',
            vocabNotebook: 'Sổ từ vựng',
            vocabNotebookTitle: 'Xem tất cả từ vựng đã lưu',
            joinCode: 'Mã tham gia',
            copyRecoveryKeyTitle: 'Click để sao chép mã khôi phục',
            noBooks: 'Chưa có sách nào. Hãy tải lên tệp EPUB, PDF hoặc DOCX đầu tiên để bắt đầu.',
            searchPlaceholder: 'Tìm theo tên sách hoặc tác giả…',
            searchAlbumsPlaceholder: 'Tìm album hoặc sách trong album…',
            sortRecentDesc: 'Mới nhất',
            sortRecentAsc: 'Cũ nhất',
            sortTitleAsc: 'Tên A-Z',
            sortTitleDesc: 'Tên Z-A',
            noResults: 'Không tìm thấy cuốn sách nào khớp với tìm kiếm.',
            noAlbumsMatch: 'Không tìm thấy album nào khớp với tìm kiếm.',
            format_epub: 'Sách EPUB',
            format_pdf: 'Tài liệu PDF',
            format_docx: 'Tài liệu Word (.docx)',
            delete: 'Xóa',
            deleteBookConfirm: 'Bạn có chắc chắn muốn xóa cuốn sách này khỏi thư viện?',
            rename: 'Đổi tên',
            renameBook: 'Đổi tên sách',
            album: 'Album',
            addToAlbum: 'Thêm vào album',
            addToAlbumTitle: 'Thêm vào Album',
            renameBookTitle: 'Đổi tên sách',
            bookTitleLabel: 'Tên sách *',
            bookAuthorLabel: 'Tác giả (tùy chọn)',
            createAlbumTitle: 'Tạo Album Mới',
            renameAlbumTitle: 'Đổi Tên Album',
            albumNameLabel: 'Tên Album *',
            albumNamePlaceholder: 'Ví dụ: Yêu thích, Khoa học viễn tưởng, Đang đọc...',
            albumDescLabel: 'Mô tả (tùy chọn)',
            albumDescPlaceholder: 'Ghi chú ngắn về bộ sưu tập này...',
            newAlbumNamePlaceholder: 'Tạo album mới...',
            create: 'Tạo',
            done: 'Xong',
            save: 'Lưu',
            cancel: 'Hủy',
            noAlbumsTitle: 'Chưa có Album nào',
            noAlbumsDesc: 'Tạo các album để sắp xếp sách thành các bộ sưu tập như Sách yêu thích, Khoa học, Lịch sử hoặc Danh sách đọc.',
            createFirstAlbum: 'Tạo Album đầu tiên',
            noAlbumsYet: 'Chưa có album nào được tạo.',
            addBooksToAlbumTitle: 'Thêm sách vào Album',
            filterBooksPlaceholder: 'Lọc sách theo tên hoặc tác giả...',
            noBooksToSelect: 'Tất cả sách trong thư viện đều đã có trong album này.',
            addSelected: 'Thêm sách đã chọn',
            selectedCountSuffix: ' sách đã chọn',
            booksCountSuffix: ' cuốn',
            emptyAlbumAddBtn: 'Thêm sách vào album này',
            removeBookFromAlbumConfirm: 'Gỡ cuốn sách này ra khỏi album?',
            deleteAlbumConfirm: 'Bạn có chắc chắn muốn xóa album này không? Sách gốc trong thư viện sẽ KHÔNG bị mất.',
            removeFromAlbum: 'Gỡ',
            removeFromAlbumTitle: 'Gỡ khỏi album',
            addBooksBtn: 'Thêm sách',
            // Vocab translations
            vocabModalTitle: 'Kho Từ Vựng Toàn Thư Viện',
            vocabSearchPlaceholder: 'Tìm từ vựng, nghĩa tiếng Việt...',
            vocabEmptyTitle: 'Chưa có từ vựng nào',
            vocabEmptyDesc: 'Trong khi đọc sách, hãy bôi đen bất kỳ từ hoặc câu nào và bấm nút Lưu từ vựng để ôn tập tại đây.',
            vocabEmptyFiltered: 'Không tìm thấy từ vựng nào khớp với bộ lọc.',
            copied: 'Đã chép',
            copy: 'Sao chép',
            wordsCountSuffix: ' từ'
        }
    };

    document.addEventListener('DOMContentLoaded', function () {
        // ==========================================
        // Common DOM references
        // ==========================================
        var tabBtnBooks = document.getElementById('tab-btn-books');
        var tabBtnAlbums = document.getElementById('tab-btn-albums');
        var currentTabLabel = document.getElementById('library-current-tab-label');
        var viewBooksContainer = document.getElementById('library-books-view');
        var viewAlbumsContainer = document.getElementById('library-albums-view');
        var btnUploadHeader = document.getElementById('btn-upload-header');
        var btnCreateAlbumHeader = document.getElementById('btn-create-album-header');
        var headerAlbumsCount = document.getElementById('header-albums-count');

        // All Books DOM
        var sectionsContainer = document.getElementById('library-sections-container');
        var searchInput = document.getElementById('library-search-input');
        var searchClearBtn = document.getElementById('library-search-clear');
        var sortSelect = document.getElementById('library-sort-select');
        var viewGridBtn = document.getElementById('library-view-grid');
        var viewListBtn = document.getElementById('library-view-list');
        var noResultsMsg = document.getElementById('library-no-results');

        // Albums DOM
        var albumsSearchInput = document.getElementById('albums-search-input');
        var albumsSearchClear = document.getElementById('albums-search-clear');
        var albumsBannerStack = document.getElementById('albums-banner-stack');
        var albumsEmptyState = document.getElementById('albums-empty-state');
        var albumsNoResults = document.getElementById('albums-no-results');
        var btnCreateAlbumMain = document.getElementById('btn-create-album-main');
        var btnCreateFirstAlbum = document.getElementById('btn-create-first-album');

        // Modals DOM
        var albumModalBackdrop = document.getElementById('album-modal-backdrop');
        var albumForm = document.getElementById('album-form');
        var albumEditIdInput = document.getElementById('album-edit-id');
        var albumNameInput = document.getElementById('album-name-input');
        var albumModalTitle = document.getElementById('album-modal-title');

        var bookRenameModalBackdrop = document.getElementById('book-rename-modal-backdrop');
        var bookRenameForm = document.getElementById('book-rename-form');
        var renameBookIdInput = document.getElementById('rename-book-id');
        var renameBookTitleInput = document.getElementById('rename-book-title-input');
        var renameBookAuthorInput = document.getElementById('rename-book-author-input');

        var bookAlbumsModalBackdrop = document.getElementById('book-albums-modal-backdrop');
        var bookAlbumsTargetName = document.getElementById('book-albums-target-name');
        var bookAlbumsCheckboxList = document.getElementById('book-albums-checkbox-list');
        var bookAlbumsNoAlbums = document.getElementById('book-albums-no-albums');
        var quickCreateAlbumInput = document.getElementById('quick-create-album-input');
        var quickCreateAlbumBtn = document.getElementById('quick-create-album-btn');
        var bookAlbumsSaveBtn = document.getElementById('book-albums-save-btn');

        var albumAddBooksModalBackdrop = document.getElementById('album-add-books-modal-backdrop');
        var albumAddBooksTitle = document.getElementById('album-add-books-title');
        var modalBooksSearchInput = document.getElementById('modal-books-search-input');
        var albumAddBooksGrid = document.getElementById('album-add-books-grid');
        var albumAddBooksEmpty = document.getElementById('album-add-books-empty');
        var albumAddBooksSelectedCount = document.getElementById('album-add-books-selected-count');
        var albumAddBooksSubmitBtn = document.getElementById('album-add-books-submit-btn');

        // State variables
        var currentActiveTab = 'books';
        var albumsData = [];
        var activeTargetBookId = null;
        var activeTargetAlbumId = null;
        var allLibraryBooks = [];

        // Collect all library books from DOM on load
        function collectLibraryBooks() {
            var cards = document.querySelectorAll('#library-books-view .book-card');
            allLibraryBooks = [];
            cards.forEach(function (card) {
                var id = card.getAttribute('data-book-id');
                var title = card.getAttribute('data-raw-title') || card.getAttribute('data-title') || '';
                var author = card.getAttribute('data-raw-author') || card.getAttribute('data-author') || '';
                var cover = card.getAttribute('data-cover') || '';
                var type = card.getAttribute('data-type') || 'Epub';
                if (id) {
                    allLibraryBooks.push({
                        id: id,
                        title: title,
                        author: author,
                        coverImagePath: cover,
                        type: type
                    });
                }
            });
        }
        collectLibraryBooks();

        // ==========================================
        // Language Management
        // ==========================================
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

            try {
                localStorage.setItem(LANG_STORAGE_KEY, lang);
            } catch (e) { }

            updateTabLabel();
            renderAlbumsStack();
            updateVocabHeaderCount();
        }

        function updateTabLabel() {
            var currentL = document.documentElement.lang || 'en';
            var dict = libraryTranslations[currentL] || libraryTranslations.en;
            if (currentTabLabel) {
                currentTabLabel.textContent = currentActiveTab === 'albums' ? dict.albums : dict.allBooks;
            }
        }

        var savedLang = null;
        try {
            savedLang = localStorage.getItem(LANG_STORAGE_KEY);
        } catch (e) { }

        if (!savedLang) {
            var activeLangBtn = document.querySelector('.lang-seg-btn.active');
            savedLang = activeLangBtn ? activeLangBtn.getAttribute('data-lang') : 'en';
        }
        applyLanguage(savedLang || 'en');

        document.querySelectorAll('.lang-seg-btn').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var newLang = btn.getAttribute('data-lang');
                if (!newLang || newLang === document.documentElement.lang) return;

                applyLanguage(newLang);

                fetch('/api/settings/language', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ language: newLang })
                }).catch(function (err) {
                    console.warn('Could not sync language setting with server:', err);
                });
            });
        });

        // ==========================================
        // Tab Navigation (All Books <-> Albums)
        // ==========================================
        function setActiveTab(tab) {
            currentActiveTab = tab;

            if (tabBtnBooks) {
                tabBtnBooks.classList.toggle('active', tab === 'books');
                tabBtnBooks.setAttribute('aria-selected', String(tab === 'books'));
            }
            if (tabBtnAlbums) {
                tabBtnAlbums.classList.toggle('active', tab === 'albums');
                tabBtnAlbums.setAttribute('aria-selected', String(tab === 'albums'));
            }

            if (viewBooksContainer) {
                viewBooksContainer.style.display = tab === 'books' ? 'block' : 'none';
            }
            if (viewAlbumsContainer) {
                viewAlbumsContainer.style.display = tab === 'albums' ? 'block' : 'none';
            }

            if (btnUploadHeader) {
                btnUploadHeader.style.display = 'inline-flex';
            }

            updateTabLabel();

            try {
                localStorage.setItem(TAB_STORAGE_KEY, tab);
            } catch (e) { }

            if (tab === 'albums') {
                fetchAlbums();
            }
        }

        if (tabBtnBooks) {
            tabBtnBooks.addEventListener('click', function () { setActiveTab('books'); });
        }
        if (tabBtnAlbums) {
            tabBtnAlbums.addEventListener('click', function () { setActiveTab('albums'); });
        }

        var savedTab = null;
        try {
            savedTab = localStorage.getItem(TAB_STORAGE_KEY);
        } catch (e) { }
        if (window.location.hash === '#albums') {
            savedTab = 'albums';
        }

        if (savedTab === 'albums') {
            setActiveTab('albums');
        } else {
            setActiveTab('books');
        }

        // ==========================================
        // All Books: Filtering, Sorting & View Toggles
        // ==========================================
        if (sectionsContainer) {
            var sections = Array.prototype.slice.call(sectionsContainer.querySelectorAll('.library-format-section'));
            var grids = Array.prototype.slice.call(sectionsContainer.querySelectorAll('.book-grid'));
            var cards = Array.prototype.slice.call(sectionsContainer.querySelectorAll('.book-card'));

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
        // Modal Helper Functions
        // ==========================================
        function openModal(modalEl) {
            if (!modalEl) return;
            modalEl.style.display = 'flex';
            document.body.style.overflow = 'hidden';
        }

        function closeModal(modalEl) {
            if (!modalEl) return;
            modalEl.style.display = 'none';
            document.body.style.overflow = '';
        }

        document.querySelectorAll('[data-close-modal]').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var modalId = btn.getAttribute('data-close-modal');
                var modal = document.getElementById(modalId);
                if (modal) closeModal(modal);
            });
        });

        document.querySelectorAll('.lib-modal-backdrop').forEach(function (backdrop) {
            backdrop.addEventListener('click', function (e) {
                if (e.target === backdrop) {
                    closeModal(backdrop);
                }
            });
        });

        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') {
                document.querySelectorAll('.lib-modal-backdrop, .vocab-modal-backdrop').forEach(function (m) {
                    if (m.style.display === 'flex') closeModal(m);
                });
            }
        });

        // ==========================================
        // Rename Book Modal Logic
        // ==========================================
        function openRenameBookModal(bookId, currentTitle, currentAuthor) {
            renameBookIdInput.value = bookId || '';
            renameBookTitleInput.value = currentTitle || '';
            renameBookAuthorInput.value = currentAuthor || '';
            openModal(bookRenameModalBackdrop);
            renameBookTitleInput.focus();
        }

        // Delegate rename buttons on book cards (in both All Books and inside Albums)
        document.addEventListener('click', function (e) {
            var btn = e.target.closest('.book-rename-btn');
            if (btn) {
                e.preventDefault();
                e.stopPropagation();
                var bookId = btn.getAttribute('data-book-id');
                var title = btn.getAttribute('data-book-title') || '';
                var author = btn.getAttribute('data-book-author') || '';
                openRenameBookModal(bookId, title, author);
            }
        });

        if (bookRenameForm) {
            bookRenameForm.addEventListener('submit', function (e) {
                e.preventDefault();
                var bookId = renameBookIdInput.value;
                var newTitle = (renameBookTitleInput.value || '').trim();
                var newAuthor = (renameBookAuthorInput.value || '').trim();

                if (!bookId || !newTitle) return;

                fetch('/api/books/' + bookId + '/rename', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ title: newTitle, author: newAuthor })
                })
                .then(function (res) {
                    if (!res.ok) throw new Error('Failed to rename book');
                    return res.json();
                })
                .then(function (data) {
                    // Update DOM cards in All Books
                    var cards = document.querySelectorAll('.book-card[data-book-id="' + bookId + '"]');
                    cards.forEach(function (card) {
                        card.setAttribute('data-title', newTitle.toLowerCase());
                        card.setAttribute('data-raw-title', newTitle);
                        card.setAttribute('data-author', newAuthor.toLowerCase());
                        card.setAttribute('data-raw-author', newAuthor);

                        var titleEl = card.querySelector('.book-title');
                        if (titleEl) {
                            titleEl.textContent = newTitle;
                            titleEl.title = newTitle;
                        }

                        var authorEl = card.querySelector('.book-author');
                        if (newAuthor) {
                            if (!authorEl) {
                                authorEl = document.createElement('div');
                                authorEl.className = 'book-author';
                                var link = card.querySelector('.book-cover-link');
                                if (link) link.appendChild(authorEl);
                            }
                            authorEl.textContent = newAuthor;
                        } else if (authorEl) {
                            authorEl.remove();
                        }

                        var renameBtn = card.querySelector('.book-rename-btn');
                        if (renameBtn) {
                            renameBtn.setAttribute('data-book-title', newTitle);
                            renameBtn.setAttribute('data-book-author', newAuthor);
                        }
                    });

                    // Update memory array
                    var match = allLibraryBooks.find(function (b) { return b.id === bookId; });
                    if (match) {
                        match.title = newTitle;
                        match.author = newAuthor;
                    }

                    // Re-render albums to reflect updated title
                    albumsData.forEach(function (alb) {
                        alb.books.forEach(function (bk) {
                            if (bk.id === bookId) {
                                bk.title = newTitle;
                                bk.author = newAuthor;
                            }
                        });
                    });
                    renderAlbumsStack();

                    closeModal(bookRenameModalBackdrop);
                })
                .catch(function (err) {
                    console.error('Rename error:', err);
                    alert(document.documentElement.lang === 'vi' ? 'Không thể đổi tên sách. Vui lòng thử lại.' : 'Could not rename book. Please try again.');
                });
            });
        }

        // ==========================================
        // Add to Album Modal (From single Book Card)
        // ==========================================
        document.addEventListener('click', function (e) {
            var btn = e.target.closest('.book-add-to-album-btn');
            if (btn) {
                e.preventDefault();
                e.stopPropagation();
                var bookId = btn.getAttribute('data-book-id');
                var bookTitle = btn.getAttribute('data-book-title') || '';
                openAddToAlbumModal(bookId, bookTitle);
            }
        });

        function openAddToAlbumModal(bookId, bookTitle) {
            activeTargetBookId = bookId;
            if (bookAlbumsTargetName) {
                bookAlbumsTargetName.textContent = bookTitle;
            }
            if (quickCreateAlbumInput) quickCreateAlbumInput.value = '';

            openModal(bookAlbumsModalBackdrop);
            loadBookAlbumsData(bookId);
        }

        function loadBookAlbumsData(bookId) {
            Promise.all([
                fetch('/api/albums').then(function (r) { return r.json(); }),
                fetch('/api/albums/book/' + bookId).then(function (r) { return r.json(); })
            ])
            .then(function (results) {
                albumsData = results[0] || [];
                var bookAlbumIds = new Set(results[1] || []);
                renderBookAlbumsCheckboxes(bookAlbumIds);
                updateHeaderAlbumsCount();
            })
            .catch(function (err) {
                console.error('Error loading book albums data:', err);
            });
        }

        function renderBookAlbumsCheckboxes(selectedAlbumIds) {
            if (!bookAlbumsCheckboxList) return;

            if (albumsData.length === 0) {
                bookAlbumsCheckboxList.innerHTML = '';
                if (bookAlbumsNoAlbums) bookAlbumsNoAlbums.style.display = 'block';
                return;
            }

            if (bookAlbumsNoAlbums) bookAlbumsNoAlbums.style.display = 'none';

            bookAlbumsCheckboxList.innerHTML = albumsData.map(function (album) {
                var isChecked = selectedAlbumIds.has(album.id);
                return `
                    <label class="lib-checkbox-item">
                        <input type="checkbox" value="${album.id}" ${isChecked ? 'checked' : ''} class="album-check-input" />
                        <span class="lib-checkbox-custom"></span>
                        <div class="lib-checkbox-text">
                            <span class="lib-checkbox-title">${escapeHtml(album.name)}</span>
                            <span class="lib-checkbox-badge">${album.bookCount || 0}</span>
                        </div>
                    </label>
                `;
            }).join('');
        }

        if (quickCreateAlbumBtn) {
            quickCreateAlbumBtn.addEventListener('click', function () {
                var name = (quickCreateAlbumInput ? quickCreateAlbumInput.value : '').trim();
                if (!name) return;

                fetch('/api/albums', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name: name })
                })
                .then(function (res) {
                    if (!res.ok) throw new Error('Create album failed');
                    return res.json();
                })
                .then(function (newAlbum) {
                    quickCreateAlbumInput.value = '';
                    albumsData.unshift(newAlbum);

                    // Re-render checkboxes with currently checked state + new album checked
                    var currentChecked = new Set();
                    if (bookAlbumsCheckboxList) {
                        bookAlbumsCheckboxList.querySelectorAll('.album-check-input:checked').forEach(function (inp) {
                            currentChecked.add(inp.value);
                        });
                    }
                    currentChecked.add(newAlbum.id);
                    renderBookAlbumsCheckboxes(currentChecked);
                    updateHeaderAlbumsCount();
                })
                .catch(function (err) {
                    console.error('Error quick creating album:', err);
                });
            });
        }

        if (bookAlbumsSaveBtn) {
            bookAlbumsSaveBtn.addEventListener('click', function () {
                if (!activeTargetBookId) {
                    closeModal(bookAlbumsModalBackdrop);
                    return;
                }

                var selectedIds = [];
                if (bookAlbumsCheckboxList) {
                    bookAlbumsCheckboxList.querySelectorAll('.album-check-input:checked').forEach(function (inp) {
                        selectedIds.push(inp.value);
                    });
                }

                fetch('/api/albums/book/' + activeTargetBookId, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ albumIds: selectedIds })
                })
                .then(function () {
                    closeModal(bookAlbumsModalBackdrop);
                    fetchAlbums(); // refresh album stack
                })
                .catch(function (err) {
                    console.error('Error saving book albums:', err);
                    closeModal(bookAlbumsModalBackdrop);
                });
            });
        }

        // ==========================================
        // Album CRUD (Create / Rename / Delete)
        // ==========================================
        function openCreateAlbumModal() {
            albumEditIdInput.value = '';
            albumNameInput.value = '';

            var currentL = document.documentElement.lang || 'en';
            var dict = libraryTranslations[currentL] || libraryTranslations.en;
            if (albumModalTitle) albumModalTitle.textContent = dict.createAlbumTitle;

            openModal(albumModalBackdrop);
            albumNameInput.focus();
        }

        function openRenameAlbumModal(albumId, currentName) {
            albumEditIdInput.value = albumId;
            albumNameInput.value = currentName || '';

            var currentL = document.documentElement.lang || 'en';
            var dict = libraryTranslations[currentL] || libraryTranslations.en;
            if (albumModalTitle) albumModalTitle.textContent = dict.renameAlbumTitle;

            openModal(albumModalBackdrop);
            albumNameInput.focus();
        }

        if (btnCreateAlbumHeader) {
            btnCreateAlbumHeader.addEventListener('click', openCreateAlbumModal);
        }
        if (btnCreateAlbumMain) {
            btnCreateAlbumMain.addEventListener('click', openCreateAlbumModal);
        }
        if (btnCreateFirstAlbum) {
            btnCreateFirstAlbum.addEventListener('click', openCreateAlbumModal);
        }

        if (albumForm) {
            albumForm.addEventListener('submit', function (e) {
                e.preventDefault();
                var albumId = albumEditIdInput.value;
                var name = (albumNameInput.value || '').trim();

                if (!name) return;

                var isEditing = Boolean(albumId);
                var url = isEditing ? '/api/albums/' + albumId : '/api/albums';
                var method = isEditing ? 'PUT' : 'POST';

                fetch(url, {
                    method: method,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name: name })
                })
                .then(function (res) {
                    if (!res.ok) throw new Error('Failed to save album');
                    return res.json();
                })
                .then(function () {
                    closeModal(albumModalBackdrop);
                    fetchAlbums();
                })
                .catch(function (err) {
                    console.error('Save album error:', err);
                    alert(document.documentElement.lang === 'vi' ? 'Không thể lưu album. Vui lòng thử lại.' : 'Could not save album. Please try again.');
                });
            });
        }

        // ==========================================
        // Albums Banner Stack Rendering & Slide Logic
        // ==========================================
        function fetchAlbums() {
            fetch('/api/albums')
                .then(function (res) { return res.ok ? res.json() : []; })
                .then(function (data) {
                    albumsData = data || [];
                    updateHeaderAlbumsCount();
                    renderAlbumsStack();
                })
                .catch(function (err) {
                    console.error('Error fetching albums:', err);
                });
        }

        function updateHeaderAlbumsCount() {
            if (headerAlbumsCount) {
                headerAlbumsCount.textContent = albumsData.length;
                headerAlbumsCount.style.display = albumsData.length > 0 ? 'inline-block' : 'none';
            }
        }

        function renderAlbumsStack() {
            if (!albumsBannerStack) return;

            var currentL = document.documentElement.lang || 'en';
            var dict = libraryTranslations[currentL] || libraryTranslations.en;
            var query = (albumsSearchInput ? albumsSearchInput.value : '').toLowerCase().trim();

            if (albumsSearchClear) albumsSearchClear.hidden = query.length === 0;

            if (albumsData.length === 0) {
                albumsBannerStack.innerHTML = '';
                if (albumsEmptyState) albumsEmptyState.style.display = 'block';
                if (albumsNoResults) albumsNoResults.style.display = 'none';
                return;
            }

            if (albumsEmptyState) albumsEmptyState.style.display = 'none';

            var visibleCount = 0;

            var html = albumsData.map(function (album) {
                var matchesAlbumName = !query || album.name.toLowerCase().indexOf(query) !== -1;
                var filteredBooks = album.books || [];

                if (query) {
                    filteredBooks = filteredBooks.filter(function (b) {
                        return matchesAlbumName ||
                            (b.title && b.title.toLowerCase().indexOf(query) !== -1) ||
                            (b.author && b.author.toLowerCase().indexOf(query) !== -1);
                    });
                }

                var hasMatchingBooks = filteredBooks.length > 0;
                var isAlbumVisible = matchesAlbumName || hasMatchingBooks;

                if (isAlbumVisible) visibleCount++;

                var displayStyle = isAlbumVisible ? 'block' : 'none';
                var bookCountLabel = (album.books ? album.books.length : 0) + dict.booksCountSuffix;

                var booksSlideHtml = '';
                if (!album.books || album.books.length === 0) {
                    booksSlideHtml = `
                        <div class="album-slide-empty">
                            <button type="button" class="album-empty-add-btn" data-album-id="${album.id}" data-album-name="${escapeHtml(album.name)}">
                                ${dict.emptyAlbumAddBtn}
                            </button>
                        </div>
                    `;
                } else {
                    booksSlideHtml = (album.books || []).map(function (book) {
                        var coverHtml = book.coverImagePath
                            ? `<img src="${escapeHtml(book.coverImagePath)}" alt="${escapeHtml(book.title)}" loading="lazy" />`
                            : `<div class="book-cover-placeholder"></div>`;

                        var authorHtml = `<div class="album-book-author" title="${escapeHtml(book.author || '')}">${escapeHtml(book.author || '') || '&nbsp;'}</div>`;

                        return `
                            <div class="album-book-card" data-book-id="${book.id}">
                                <a class="album-book-cover-link" href="/Reader/${book.id}">
                                    <div class="album-book-cover">
                                        ${coverHtml}
                                    </div>
                                    <div class="album-book-title" title="${escapeHtml(book.title)}">${escapeHtml(book.title)}</div>
                                    ${authorHtml}
                                </a>
                                <div class="album-book-actions">
                                    <button type="button" class="album-action-btn book-rename-btn"
                                            data-book-id="${book.id}"
                                            data-book-title="${escapeHtml(book.title)}"
                                            data-book-author="${escapeHtml(book.author || '')}"
                                            title="${dict.renameBook}">
                                        <span class="btn-text">${dict.rename}</span>
                                    </button>
                                    <button type="button" class="album-action-btn album-book-remove-btn"
                                            data-album-id="${album.id}"
                                            data-book-id="${book.id}"
                                            title="${dict.removeFromAlbumTitle}">
                                        <span class="btn-text">${dict.removeFromAlbum}</span>
                                    </button>
                                </div>
                            </div>
                        `;
                    }).join('');
                }

                return `
                    <div class="album-banner-container" data-album-id="${album.id}" style="display:${displayStyle};">
                        <div class="album-banner-header">
                            <div class="album-banner-title-group">
                                <h2 class="album-banner-title" title="${escapeHtml(album.name)}">${escapeHtml(album.name)}</h2>
                                <span class="album-banner-count-badge">${bookCountLabel}</span>
                            </div>
                            <div class="album-banner-controls">
                                <button type="button" class="lib-btn lib-btn-sm lib-btn-secondary album-rename-btn"
                                        data-album-id="${album.id}"
                                        data-album-name="${escapeHtml(album.name)}"
                                        title="${dict.rename}">
                                    ${dict.rename}
                                </button>
                                <button type="button" class="lib-btn lib-btn-sm lib-btn-danger album-delete-btn"
                                        data-album-id="${album.id}"
                                        title="${dict.delete}">
                                    ${dict.delete}
                                </button>
                                <button type="button" class="lib-btn lib-btn-sm lib-btn-accent album-add-books-btn"
                                        data-album-id="${album.id}"
                                        data-album-name="${escapeHtml(album.name)}"
                                        title="${dict.addBooksBtn}">
                                    ${dict.addBooksBtn}
                                </button>
                            </div>
                        </div>

                        <div class="album-carousel-wrapper">
                            <button type="button" class="album-carousel-arrow arrow-left" data-slide-dir="-1" aria-label="Slide Left">&lsaquo;</button>
                            <div class="album-carousel-track" data-album-id="${album.id}">
                                ${booksSlideHtml}
                            </div>
                            <button type="button" class="album-carousel-arrow arrow-right" data-slide-dir="1" aria-label="Slide Right">&rsaquo;</button>
                        </div>
                    </div>
                `;
            }).join('');

            albumsBannerStack.innerHTML = html;

            if (albumsNoResults) {
                albumsNoResults.style.display = visibleCount === 0 && albumsData.length > 0 ? 'block' : 'none';
            }

            attachAlbumContainerEvents();
        }

        function attachAlbumContainerEvents() {
            // Mouse wheel horizontal scrolling on carousel track
            document.querySelectorAll('.album-carousel-track').forEach(function (track) {
                track.addEventListener('wheel', function (e) {
                    if (e.deltaY !== 0) {
                        e.preventDefault();
                        track.scrollBy({
                            left: e.deltaY * 1.5,
                            behavior: 'auto'
                        });
                    }
                }, { passive: false });
            });

            // Carousel arrows scroll
            document.querySelectorAll('.album-carousel-arrow').forEach(function (btn) {
                btn.addEventListener('click', function () {
                    var dir = Number(btn.getAttribute('data-slide-dir') || 1);
                    var wrapper = btn.closest('.album-carousel-wrapper');
                    if (!wrapper) return;
                    var track = wrapper.querySelector('.album-carousel-track');
                    if (!track) return;

                    var scrollAmount = Math.max(320, track.clientWidth * 0.7);
                    track.scrollBy({ left: dir * scrollAmount, behavior: 'smooth' });
                });
            });


            // Album Rename
            document.querySelectorAll('.album-rename-btn').forEach(function (btn) {
                btn.addEventListener('click', function () {
                    var albumId = btn.getAttribute('data-album-id');
                    var name = btn.getAttribute('data-album-name');
                    openRenameAlbumModal(albumId, name);
                });
            });

            // Album Delete
            document.querySelectorAll('.album-delete-btn').forEach(function (btn) {
                btn.addEventListener('click', function () {
                    var albumId = btn.getAttribute('data-album-id');
                    if (!albumId) return;

                    var currentL = document.documentElement.lang || 'en';
                    var dict = libraryTranslations[currentL] || libraryTranslations.en;

                    if (!confirm(dict.deleteAlbumConfirm)) return;

                    fetch('/api/albums/' + albumId, { method: 'DELETE' })
                        .then(function (res) {
                            if (!res.ok) throw new Error('Delete album failed');
                            albumsData = albumsData.filter(function (a) { return a.id !== albumId; });
                            updateHeaderAlbumsCount();
                            renderAlbumsStack();
                        })
                        .catch(function (err) {
                            console.error('Delete album error:', err);
                        });
                });
            });

            // Album Add Books button (+ Add Books / Empty state button)
            document.querySelectorAll('.album-add-books-btn, .album-empty-add-btn').forEach(function (btn) {
                btn.addEventListener('click', function () {
                    var albumId = btn.getAttribute('data-album-id');
                    var albumName = btn.getAttribute('data-album-name');
                    openAddBooksToAlbumModal(albumId, albumName);
                });
            });

            // Remove book from album
            document.querySelectorAll('.album-book-remove-btn').forEach(function (btn) {
                btn.addEventListener('click', function (e) {
                    e.preventDefault();
                    e.stopPropagation();

                    var albumId = btn.getAttribute('data-album-id');
                    var bookId = btn.getAttribute('data-book-id');
                    if (!albumId || !bookId) return;

                    var currentL = document.documentElement.lang || 'en';
                    var dict = libraryTranslations[currentL] || libraryTranslations.en;

                    if (!confirm(dict.removeBookFromAlbumConfirm)) return;

                    fetch('/api/albums/' + albumId + '/books/' + bookId, { method: 'DELETE' })
                        .then(function (res) {
                            if (!res.ok) throw new Error('Remove book failed');
                            var album = albumsData.find(function (a) { return a.id === albumId; });
                            if (album) {
                                album.books = album.books.filter(function (b) { return b.id !== bookId; });
                                album.bookCount = album.books.length;
                            }
                            renderAlbumsStack();
                        })
                        .catch(function (err) {
                            console.error('Remove book error:', err);
                        });
                });
            });
        }

        if (albumsSearchInput) {
            albumsSearchInput.addEventListener('input', function () {
                renderAlbumsStack();
            });
        }
        if (albumsSearchClear) {
            albumsSearchClear.addEventListener('click', function () {
                albumsSearchInput.value = '';
                renderAlbumsStack();
                albumsSearchInput.focus();
            });
        }

        // ==========================================
        // Modal 4: Add Multiple Books to an Album
        // ==========================================
        function openAddBooksToAlbumModal(albumId, albumName) {
            activeTargetAlbumId = albumId;
            if (albumAddBooksTitle) {
                var currentL = document.documentElement.lang || 'en';
                var dict = libraryTranslations[currentL] || libraryTranslations.en;
                albumAddBooksTitle.textContent = `${dict.addBooksToAlbumTitle}: ${albumName}`;
            }

            if (modalBooksSearchInput) modalBooksSearchInput.value = '';
            collectLibraryBooks();
            renderAddBooksModalList();
            openModal(albumAddBooksModalBackdrop);
        }

        function renderAddBooksModalList() {
            if (!albumAddBooksGrid) return;

            var targetAlbum = albumsData.find(function (a) { return a.id === activeTargetAlbumId; });
            var existingBookIds = new Set((targetAlbum && targetAlbum.books ? targetAlbum.books : []).map(function (b) { return b.id; }));

            var query = (modalBooksSearchInput ? modalBooksSearchInput.value : '').toLowerCase().trim();

            var availableBooks = allLibraryBooks.filter(function (b) {
                var isAlreadyInAlbum = existingBookIds.has(b.id);
                var matchesQuery = !query ||
                    (b.title && b.title.toLowerCase().indexOf(query) !== -1) ||
                    (b.author && b.author.toLowerCase().indexOf(query) !== -1);
                return !isAlreadyInAlbum && matchesQuery;
            });

            if (availableBooks.length === 0) {
                albumAddBooksGrid.innerHTML = '';
                if (albumAddBooksEmpty) albumAddBooksEmpty.style.display = 'block';
                updateAddBooksModalSelectedCount();
                return;
            }

            if (albumAddBooksEmpty) albumAddBooksEmpty.style.display = 'none';

            albumAddBooksGrid.innerHTML = availableBooks.map(function (book) {
                var coverHtml = book.coverImagePath
                    ? `<img src="${escapeHtml(book.coverImagePath)}" alt="${escapeHtml(book.title)}" loading="lazy" />`
                    : `<div class="book-cover-placeholder"></div>`;

                return `
                    <label class="album-picker-book-card">
                        <input type="checkbox" value="${book.id}" class="album-picker-check" />
                        <div class="album-picker-cover-box">
                            ${coverHtml}
                            <div class="album-picker-check-badge">✓</div>
                        </div>
                        <div class="album-picker-title" title="${escapeHtml(book.title)}">${escapeHtml(book.title)}</div>
                    </label>
                `;
            }).join('');

            albumAddBooksGrid.querySelectorAll('.album-picker-check').forEach(function (inp) {
                inp.addEventListener('change', updateAddBooksModalSelectedCount);
            });

            updateAddBooksModalSelectedCount();
        }

        function updateAddBooksModalSelectedCount() {
            var checkedCount = 0;
            if (albumAddBooksGrid) {
                checkedCount = albumAddBooksGrid.querySelectorAll('.album-picker-check:checked').length;
            }

            var currentL = document.documentElement.lang || 'en';
            var dict = libraryTranslations[currentL] || libraryTranslations.en;

            if (albumAddBooksSelectedCount) {
                albumAddBooksSelectedCount.textContent = checkedCount + dict.selectedCountSuffix;
            }
            if (albumAddBooksSubmitBtn) {
                albumAddBooksSubmitBtn.disabled = checkedCount === 0;
            }
        }

        if (modalBooksSearchInput) {
            modalBooksSearchInput.addEventListener('input', renderAddBooksModalList);
        }

        if (albumAddBooksSubmitBtn) {
            albumAddBooksSubmitBtn.addEventListener('click', function () {
                if (!activeTargetAlbumId) return;

                var selectedBookIds = [];
                if (albumAddBooksGrid) {
                    albumAddBooksGrid.querySelectorAll('.album-picker-check:checked').forEach(function (inp) {
                        selectedBookIds.push(inp.value);
                    });
                }

                if (selectedBookIds.length === 0) return;

                fetch('/api/albums/' + activeTargetAlbumId + '/books', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ bookIds: selectedBookIds })
                })
                .then(function (res) {
                    if (!res.ok) throw new Error('Add books failed');
                    closeModal(albumAddBooksModalBackdrop);
                    fetchAlbums();
                })
                .catch(function (err) {
                    console.error('Error adding books to album:', err);
                    alert(document.documentElement.lang === 'vi' ? 'Không thể thêm sách vào album.' : 'Could not add books to album.');
                });
            });
        }

        // ==========================================
        // Vocabulary Modal Management
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

        function openVocabModal() {
            if (!vocabBackdrop) return;
            vocabBackdrop.style.display = 'flex';
            document.body.style.overflow = 'hidden';
            if (vocabSearchInput) {
                vocabSearchInput.value = '';
                vocabSearchInput.focus();
            }
            renderVocabList();
        }

        function closeVocabModal() {
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
            return String(str)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#039;');
        }

        if (openVocabModalBtn) {
            openVocabModalBtn.addEventListener('click', openVocabModal);
        }
        if (closeVocabModalBtn) {
            closeVocabModalBtn.addEventListener('click', closeVocabModal);
        }
        if (vocabBackdrop) {
            vocabBackdrop.addEventListener('click', function (e) {
                if (e.target === vocabBackdrop) {
                    closeVocabModal();
                }
            });
        }

        if (vocabSearchInput) {
            vocabSearchInput.addEventListener('input', renderVocabList);
        }
        if (vocabBookFilter) {
            vocabBookFilter.addEventListener('change', renderVocabList);
        }

        // Initialize Vocabulary
        fetchVocabulary();
    });
})();
