export function createReaderContext() {
    const bootstrapElement = document.getElementById('reader-bootstrap-data');
    if (!bootstrapElement) return null;

    let readerData = {};
    try {
        readerData = JSON.parse(bootstrapElement.textContent);
    } catch (e) {
        console.error('Lỗi parse bootstrap data:', e);
        return null;
    }

    const get = (id) => document.getElementById(id);

    return {
        readerData,
        readerApp: get('reader-app'),
        readerViewport: get('reader-viewport'),
        readerColumns: get('reader-columns'),
        translationColumn: get('translation-column'),
        translateToggleBtn: get('translate-toggle'),
        bookTitleEl: get('reader-book-title'),
        panelChapters: get('panel-chapters'),
        panelBookmarks: get('panel-bookmarks'),
        prevChapterBtn: get('prev-chapter-btn'),
        nextChapterBtn: get('next-chapter-btn'),
        chapterScrollbar: get('chapter-scrollbar'),
        chapterScrollbarThumb: get('chapter-scrollbar-thumb'),
        settingFontSize: get('setting-font-size'),
        settingFontSizeVal: get('setting-font-size-val'),
        settingLineHeight: get('setting-line-height'),
        settingLineHeightVal: get('setting-line-height-val'),
        settingLetterSpacing: get('setting-letter-spacing'),
        settingLetterSpacingVal: get('setting-letter-spacing-val'),
        settingFont: get('setting-font'),
        settingLanguage: get('setting-language'),
        settingDarkMode: get('setting-dark-mode'),
        settingEyeComfort: get('setting-eye-comfort'),
        chapters: readerData.chapters || [],
        bookId: readerData.bookId,
        currentChapterIndex: 0,
        translationModeOn: false,
        bookmarks: readerData.bookmarks || [],
        focusModeTimer: null,
        FOCUS_TIMEOUT: 2500,
        translationGridBuiltForChapterId: null,
        translationSaveTimers: {},
        lastSavedProgressKey: null,
        progressRequestInFlight: false,
        pendingProgressPayload: null,
        api: {}
    };
}

export const translations = {
    en: {
        backToLibrary: '← Library',
        chapters: 'Chapters',
        bookmarks: 'Bookmarks',
        addBookmark: '+ Bookmark Current Position',
        noBookmarks: 'No bookmarks saved.',
        darkMode: 'Dark Mode',
        eyeComfort: 'Eye Comfort (Sepia)',
        language: 'Language',
        font: 'Font',
        fontSize: 'Font Size',
        lineHeight: 'Line Height',
        letterSpacing: 'Letter Spacing',
        noContent: 'This chapter has no content.',
        translateToggle: 'Translate this page',
        exportTranslation: 'Export translation (.docx)',
        previousChapter: 'Previous',
        nextChapter: 'Next'
    },
    vi: {
        backToLibrary: '← Thư viện',
        chapters: 'Mục lục',
        bookmarks: 'Dấu trang',
        addBookmark: '+ Đánh dấu vị trí này',
        noBookmarks: 'Chưa có dấu trang nào.',
        darkMode: 'Chế độ tối',
        eyeComfort: 'Chống mỏi mắt (Sepia)',
        language: 'Ngôn ngữ',
        font: 'Phông chữ',
        fontSize: 'Cỡ chữ',
        lineHeight: 'Khoảng cách dòng',
        letterSpacing: 'Khoảng cách chữ',
        noContent: 'Chương này không có nội dung.',
        translateToggle: 'Dịch trang này',
        exportTranslation: 'Xuất bản dịch (.docx)',
        previousChapter: 'Trước',
        nextChapter: 'Sau'
    }
};
