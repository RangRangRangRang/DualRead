// Library page: client-side search, sort, and grid/list view toggle.
// Everything here operates on the book cards already rendered by the server - no extra
// requests are made, since the full library for a recovery key is small and already in the DOM.
(function () {
    'use strict';

    var VIEW_STORAGE_KEY = 'dualread_library_view';
    var SORT_STORAGE_KEY = 'dualread_library_sort';
    var DEBOUNCE_MS = 150;

    document.addEventListener('DOMContentLoaded', function () {
        var grid = document.getElementById('library-book-grid');
        if (!grid) return; // Empty-library state has no toolbar/grid to wire up.

        var searchInput = document.getElementById('library-search-input');
        var searchClearBtn = document.getElementById('library-search-clear');
        var sortSelect = document.getElementById('library-sort-select');
        var viewGridBtn = document.getElementById('library-view-grid');
        var viewListBtn = document.getElementById('library-view-list');
        var noResultsMsg = document.getElementById('library-no-results');
        var cards = Array.prototype.slice.call(grid.querySelectorAll('.book-card'));

        var debounceTimer = null;

        function applyFilter() {
            var query = (searchInput.value || '').trim().toLowerCase();
            searchClearBtn.hidden = query.length === 0;

            var visibleCount = 0;
            cards.forEach(function (card) {
                var title = card.getAttribute('data-title') || '';
                var author = card.getAttribute('data-author') || '';
                var matches = query === '' || title.indexOf(query) !== -1 || author.indexOf(query) !== -1;
                card.hidden = !matches;
                if (matches) visibleCount++;
            });

            noResultsMsg.hidden = visibleCount !== 0;
        }

        function applySort() {
            var mode = sortSelect.value;

            var sorted = cards.slice().sort(function (a, b) {
                switch (mode) {
                    case 'title-asc':
                        return a.getAttribute('data-title').localeCompare(b.getAttribute('data-title'));
                    case 'title-desc':
                        return b.getAttribute('data-title').localeCompare(a.getAttribute('data-title'));
                    case 'recent-asc':
                        return Number(a.getAttribute('data-uploaded')) - Number(b.getAttribute('data-uploaded'));
                    case 'recent-desc':
                    default:
                        return Number(b.getAttribute('data-uploaded')) - Number(a.getAttribute('data-uploaded'));
                }
            });

            // Re-append in the new order; hidden/visible state (from applyFilter) is untouched
            // since we're moving existing nodes, not recreating them.
            sorted.forEach(function (card) {
                grid.appendChild(card);
            });

            try {
                localStorage.setItem(SORT_STORAGE_KEY, mode);
            } catch (e) { /* localStorage unavailable (private mode, quota) - not critical */ }
        }

        function setView(view) {
            grid.classList.toggle('book-grid-list', view === 'list');
            viewGridBtn.classList.toggle('active', view === 'grid');
            viewListBtn.classList.toggle('active', view === 'list');
            viewGridBtn.setAttribute('aria-pressed', String(view === 'grid'));
            viewListBtn.setAttribute('aria-pressed', String(view === 'list'));

            try {
                localStorage.setItem(VIEW_STORAGE_KEY, view);
            } catch (e) { /* localStorage unavailable - default view is fine */ }
        }

        searchInput.addEventListener('input', function () {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(applyFilter, DEBOUNCE_MS);
        });

        searchClearBtn.addEventListener('click', function () {
            searchInput.value = '';
            applyFilter();
            searchInput.focus();
        });

        sortSelect.addEventListener('change', applySort);

        viewGridBtn.addEventListener('click', function () { setView('grid'); });
        viewListBtn.addEventListener('click', function () { setView('list'); });

        // Restore saved preferences (view mode + sort order) from the last visit.
        var savedView = null;
        var savedSort = null;
        try {
            savedView = localStorage.getItem(VIEW_STORAGE_KEY);
            savedSort = localStorage.getItem(SORT_STORAGE_KEY);
        } catch (e) { /* localStorage unavailable - fall back to defaults below */ }

        if (savedView === 'list' || savedView === 'grid') {
            setView(savedView);
        }
        if (savedSort) {
            var optionExists = Array.prototype.some.call(sortSelect.options, function (opt) {
                return opt.value === savedSort;
            });
            if (optionExists) sortSelect.value = savedSort;
        }

        applySort();
        applyFilter();
    });
})();
