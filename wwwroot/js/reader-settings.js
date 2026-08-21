import { translations } from './reader-core.js';

export function initSettings(ctx) {
    function applyLanguage(lang) {
        const dict = translations[lang] || translations.en;
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (dict[key]) el.textContent = dict[key];
        });
        document.querySelectorAll('[data-i18n-aria]').forEach(el => {
            const key = el.getAttribute('data-i18n-aria');
            if (dict[key]) {
                el.setAttribute('aria-label', dict[key]);
                el.title = dict[key];
            }
        });
        ctx.api.renderBookmarksList?.();
    }

    function loadSettings() {
        const s = ctx.readerData.settings || {};
        const fontSize = s.fontSize || 18;
        const lineHeight = s.lineHeight || 1.7;
        const letterSpacing = (s.letterSpacing !== undefined && s.letterSpacing !== null) ? s.letterSpacing : 0.05;
        const font = s.font || 'Georgia, serif';
        const darkMode = s.darkMode !== undefined ? s.darkMode : true;
        const language = s.language || 'en';
        ctx.readerData.settings = { darkMode, language, font, fontSize, lineHeight, letterSpacing, linesPerPage: s.linesPerPage || 25 };

        if (ctx.settingFontSize) {
            ctx.settingFontSize.value = fontSize;
            if (ctx.settingFontSizeVal) ctx.settingFontSizeVal.textContent = `${fontSize}px`;
            if (ctx.readerColumns) ctx.readerColumns.style.fontSize = `${fontSize}px`;
        }
        if (ctx.settingLineHeight) {
            ctx.settingLineHeight.value = lineHeight;
            if (ctx.settingLineHeightVal) ctx.settingLineHeightVal.textContent = lineHeight;
            if (ctx.readerColumns) ctx.readerColumns.style.lineHeight = lineHeight;
        }
        if (ctx.settingLetterSpacing) {
            ctx.settingLetterSpacing.value = letterSpacing;
            if (ctx.settingLetterSpacingVal) ctx.settingLetterSpacingVal.textContent = `${letterSpacing}em`;
            if (ctx.readerColumns) ctx.readerColumns.style.letterSpacing = `${letterSpacing}em`;
        }
        if (ctx.settingFont) {
            ctx.settingFont.value = font;
            if (ctx.readerColumns) ctx.readerColumns.style.fontFamily = font;
        }
        if (ctx.settingDarkMode) {
            ctx.settingDarkMode.checked = darkMode;
            document.body.classList.toggle('theme-light', !darkMode);
        }
        if (ctx.settingLanguage) {
            ctx.settingLanguage.value = language;
            applyLanguage(language);
        }
    }

    const EYE_COMFORT_KEY = 'dualread-eye-comfort';

    function loadEyeComfort() {
        const enabled = localStorage.getItem(EYE_COMFORT_KEY) === '1';
        if (ctx.settingEyeComfort) ctx.settingEyeComfort.checked = enabled;
        document.body.classList.toggle('theme-sepia', enabled);
    }

    ctx.api.applyLanguage = applyLanguage;
    ctx.api.loadSettings = loadSettings;
    ctx.api.loadEyeComfort = loadEyeComfort;
    ctx.api.EYE_COMFORT_KEY = EYE_COMFORT_KEY;
}
