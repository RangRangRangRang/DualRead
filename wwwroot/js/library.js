(function () {
    'use strict';

    var VIEW_STORAGE_KEY = 'dualread_library_view';
    var SORT_STORAGE_KEY = 'dualread_library_sort';
    var DEBOUNCE_MS = 150;

    document.addEventListener('DOMContentLoaded', function () {
        var container = document.getElementById('library-sections-container');
        if (!container) return;

        var searchInput = document.getElementById('library-search-input');
        var searchClearBtn = document.getElementById('library-search-clear');
        var sortSelect = document.getElementById('library-sort-select');
        var viewGridBtn = document.getElementById('library-view-grid');
        var viewListBtn = document.getElementById('library-view-list');
        var noResultsMsg = document.getElementById('library-no-results');

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
    });
})();
