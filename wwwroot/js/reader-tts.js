import { translations } from './reader-core.js';

export function initTTS(ctx) {
    const synth = window.speechSynthesis;
    if (!synth) {
        console.warn('Web Speech Synthesis API is not supported in this browser.');
        if (ctx.ttsToggleBtn) ctx.ttsToggleBtn.style.display = 'none';
        return;
    }

    let isPlaying = false;
    let isPaused = false;
    let paragraphs = [];
    let currentIndex = -1;
    let currentSpeed = 1.0;
    let selectedVoiceURI = 'auto';
    let availableVoices = [];
    let keepAliveTimer = null;

    // Load saved preferences
    try {
        const savedSpeed = localStorage.getItem('dualread_tts_speed');
        if (savedSpeed) currentSpeed = parseFloat(savedSpeed) || 1.0;
        const savedVoice = localStorage.getItem('dualread_tts_voice');
        if (savedVoice) selectedVoiceURI = savedVoice;
    } catch (e) { }

    function getDict() {
        const lang = ctx?.readerData?.settings?.language || (ctx?.settingLanguage ? ctx.settingLanguage.value : (document.documentElement.lang || 'en'));
        return translations[lang] || translations.en;
    }

    // Voice management
    function loadVoices() {
        availableVoices = synth.getVoices() || [];
        populateVoiceSelect();
    }

    if (synth.onvoiceschanged !== undefined) {
        synth.onvoiceschanged = loadVoices;
    }
    loadVoices();

    function formatVoiceName(voice) {
        let raw = voice.name || '';
        let clean = raw
            .replace(/Online\s*\(Natural\)/gi, '')
            .replace(/Multilingual/gi, '')
            .replace(/\b(Microsoft|Google|Apple)\b/gi, '')
            .replace(/\s*-\s*[^-()]+(?=\s*\()/gi, '')
            .trim();

        const lang = (voice.lang || '').trim();
        let region = '';
        if (lang.includes('-') || lang.includes('_')) {
            const parts = lang.split(/[-_]/);
            region = parts[1].toUpperCase();
            if (region === 'GB') region = 'UK';
        } else if (lang) {
            region = lang.toUpperCase();
        }

        clean = clean.replace(/^[-–—:\s]+|[-–—:\s]+$/g, '').trim();
        if (!clean) clean = voice.name;

        return region ? `${clean} (${region})` : clean;
    }

    function populateVoiceSelect() {
        if (!ctx.settingTtsVoice) return;
        const dict = getDict();
        const currentVal = selectedVoiceURI;

        ctx.settingTtsVoice.innerHTML = '';

        const autoOpt = document.createElement('option');
        autoOpt.value = 'auto';
        autoOpt.textContent = dict.ttsVoiceAuto || 'Auto (Recommended)';
        ctx.settingTtsVoice.appendChild(autoOpt);

        if (availableVoices.length === 0) return;

        const viVoices = [];
        const enPriorityVoices = [];
        const enOtherVoices = [];
        const otherVoices = [];
        const primaryEnRegions = ['US', 'GB', 'UK', 'AU', 'CA'];

        availableVoices.forEach(v => {
            const lang = (v.lang || '').toLowerCase();
            if (lang.startsWith('vi')) {
                viVoices.push(v);
            } else if (lang.startsWith('en')) {
                const isPrimary = primaryEnRegions.some(reg => lang.includes(reg.toLowerCase()));
                if (isPrimary) enPriorityVoices.push(v);
                else enOtherVoices.push(v);
            } else {
                otherVoices.push(v);
            }
        });

        function appendGroup(label, list) {
            if (list.length === 0) return;
            const group = document.createElement('optgroup');
            group.label = label;
            list.sort((a, b) => formatVoiceName(a).localeCompare(formatVoiceName(b)));

            list.forEach(v => {
                const opt = document.createElement('option');
                opt.value = v.voiceURI || v.name;
                opt.textContent = formatVoiceName(v);
                group.appendChild(opt);
            });
            ctx.settingTtsVoice.appendChild(group);
        }

        appendGroup('Tiếng Việt', viVoices);
        appendGroup('English (US / UK / AU / CA)', enPriorityVoices);
        if (enOtherVoices.length > 0) {
            appendGroup('English (Other Regions)', enOtherVoices);
        }
        if (otherVoices.length > 0) {
            appendGroup('Other Languages', otherVoices);
        }

        ctx.settingTtsVoice.value = currentVal || 'auto';
    }

    function isVietnameseText(text) {
        return /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(text);
    }

    function pickVoiceForText(text) {
        if (selectedVoiceURI && selectedVoiceURI !== 'auto') {
            const matched = availableVoices.find(v => (v.voiceURI || v.name) === selectedVoiceURI);
            if (matched) return matched;
        }

        const isVi = isVietnameseText(text);
        if (isVi) {
            const viVoice = availableVoices.find(v => v.lang.toLowerCase().startsWith('vi'));
            if (viVoice) return viVoice;
        } else {
            const enVoice = availableVoices.find(v => v.lang.toLowerCase().startsWith('en'));
            if (enVoice) return enVoice;
        }

        return availableVoices[0] || null;
    }

    // Paragraph collection
    function scanParagraphs() {
        paragraphs = [];
        const container = ctx.readerColumns;
        if (!container) return;

        // Find candidate block elements: p, h1-h6, li, blockquote, .tr-original-box, .reader-paragraph
        const candidates = container.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li, blockquote, [data-p-index]');
        
        if (candidates.length > 0) {
            candidates.forEach(el => {
                // Ignore nested candidates if parent already scanned
                if (el.closest('p') && el.tagName.toLowerCase() !== 'p') return;
                const text = (el.innerText || el.textContent || '').trim();
                if (text && text.length > 1) {
                    paragraphs.push({ element: el, text });
                }
            });
        }

        // Fallback: If no block tags, collect child elements with non-empty text
        if (paragraphs.length === 0) {
            const children = container.children;
            for (let i = 0; i < children.length; i++) {
                const el = children[i];
                const text = (el.innerText || el.textContent || '').trim();
                if (text && text.length > 1) {
                    paragraphs.push({ element: el, text });
                }
            }
        }
    }

    function getFirstVisibleParagraphIndex() {
        if (paragraphs.length === 0) return 0;
        const viewport = ctx.readerViewport || document.documentElement;
        const viewportTop = viewport.scrollTop;
        const viewportHeight = viewport.clientHeight;

        for (let i = 0; i < paragraphs.length; i++) {
            const rect = paragraphs[i].element.getBoundingClientRect();
            // If element is in viewport
            if (rect.top >= 60 && rect.top <= viewportHeight - 100) {
                return i;
            }
        }
        return 0;
    }

    function clearHighlight() {
        document.querySelectorAll('.tts-highlight-active').forEach(el => {
            el.classList.remove('tts-highlight-active');
        });
    }

    function startKeepAlive() {
        stopKeepAlive();
        keepAliveTimer = setInterval(() => {
            if (synth.speaking && !synth.paused) {
                synth.pause();
                synth.resume();
            }
        }, 10000);
    }

    function stopKeepAlive() {
        if (keepAliveTimer) {
            clearInterval(keepAliveTimer);
            keepAliveTimer = null;
        }
    }

    // Core TTS playback
    function playParagraph(index) {
        if (index < 0 || index >= paragraphs.length) {
            // End of chapter
            if (index >= paragraphs.length && ctx.currentChapterIndex < ctx.chapters.length - 1) {
                // Load next chapter and continue
                ctx.api.loadChapter(ctx.currentChapterIndex + 1, 0).then(() => {
                    setTimeout(() => {
                        scanParagraphs();
                        currentIndex = 0;
                        playParagraph(0);
                    }, 500);
                });
                return;
            }
            stop();
            return;
        }

        currentIndex = index;
        const item = paragraphs[index];
        if (!item || !item.element) {
            stop();
            return;
        }

        clearHighlight();
        item.element.classList.add('tts-highlight-active');
        item.element.scrollIntoView({ behavior: 'smooth', block: 'center' });

        synth.cancel();

        const utterance = new SpeechSynthesisUtterance(item.text);
        utterance.rate = currentSpeed;
        const voice = pickVoiceForText(item.text);
        if (voice) {
            utterance.voice = voice;
            utterance.lang = voice.lang;
        }

        utterance.onstart = () => {
            isPlaying = true;
            isPaused = false;
            updatePlayerUI();
            startKeepAlive();
        };

        utterance.onend = () => {
            if (isPlaying && !isPaused) {
                playParagraph(currentIndex + 1);
            }
        };

        utterance.onerror = (e) => {
            if (e.error === 'interrupted' || e.error === 'canceled') return;
            console.warn('TTS error on paragraph:', e);
            if (isPlaying && !isPaused) {
                playParagraph(currentIndex + 1);
            }
        };

        synth.speak(utterance);
    }

    function play() {
        if (isPaused) {
            isPaused = false;
            isPlaying = true;
            synth.resume();
            updatePlayerUI();
            startKeepAlive();
            return;
        }

        scanParagraphs();
        if (paragraphs.length === 0) return;

        showPlayer();
        if (currentIndex < 0 || currentIndex >= paragraphs.length) {
            currentIndex = getFirstVisibleParagraphIndex();
        }

        isPlaying = true;
        isPaused = false;
        playParagraph(currentIndex);
    }

    function pause() {
        if (!isPlaying) return;
        isPaused = true;
        synth.pause();
        stopKeepAlive();
        updatePlayerUI();
    }

    function stop() {
        isPlaying = false;
        isPaused = false;
        stopKeepAlive();
        synth.cancel();
        clearHighlight();
        hidePlayer();
        updatePlayerUI();
    }

    function next() {
        if (paragraphs.length === 0) scanParagraphs();
        if (currentIndex + 1 < paragraphs.length) {
            playParagraph(currentIndex + 1);
        } else if (ctx.currentChapterIndex < ctx.chapters.length - 1) {
            ctx.api.loadChapter(ctx.currentChapterIndex + 1, 0).then(() => {
                setTimeout(() => {
                    scanParagraphs();
                    currentIndex = 0;
                    playParagraph(0);
                }, 500);
            });
        }
    }

    function prev() {
        if (paragraphs.length === 0) scanParagraphs();
        if (currentIndex > 0) {
            playParagraph(currentIndex - 1);
        } else {
            playParagraph(0);
        }
    }

    function setSpeed(speed) {
        currentSpeed = speed;
        try {
            localStorage.setItem('dualread_tts_speed', speed.toString());
        } catch (e) { }

        if (ctx.ttsSpeedLabel) {
            ctx.ttsSpeedLabel.textContent = `${speed}x`;
        }

        if (ctx.ttsSpeedMenu) {
            ctx.ttsSpeedMenu.querySelectorAll('.tts-speed-option').forEach(opt => {
                const s = parseFloat(opt.getAttribute('data-speed'));
                opt.classList.toggle('active', s === speed);
            });
        }

        // If speaking, restart current paragraph with new rate
        if (isPlaying && !isPaused && currentIndex >= 0) {
            playParagraph(currentIndex);
        }
    }

    function showPlayer() {
        if (ctx.ttsPlayer) {
            ctx.ttsPlayer.hidden = false;
            ctx.ttsPlayer.classList.add('show');
        }
        if (ctx.ttsToggleBtn) {
            ctx.ttsToggleBtn.setAttribute('aria-pressed', 'true');
            ctx.ttsToggleBtn.classList.add('active');
        }
    }

    function hidePlayer() {
        if (ctx.ttsPlayer) {
            ctx.ttsPlayer.classList.remove('show');
            setTimeout(() => {
                if (!isPlaying && ctx.ttsPlayer) ctx.ttsPlayer.hidden = true;
            }, 200);
        }
        if (ctx.ttsToggleBtn) {
            ctx.ttsToggleBtn.setAttribute('aria-pressed', 'false');
            ctx.ttsToggleBtn.classList.remove('active');
        }
        closeSpeedMenu();
    }

    function updatePlayerUI() {
        const dict = getDict();
        if (ctx.ttsPlayPauseBtn) {
            const playIcon = ctx.ttsPlayPauseBtn.querySelector('.tts-icon-play');
            const pauseIcon = ctx.ttsPlayPauseBtn.querySelector('.tts-icon-pause');
            if (isPlaying && !isPaused) {
                if (playIcon) playIcon.style.display = 'none';
                if (pauseIcon) pauseIcon.style.display = 'inline-block';
                ctx.ttsPlayPauseBtn.setAttribute('title', dict.ttsPause || 'Pause');
                ctx.ttsPlayPauseBtn.setAttribute('aria-label', dict.ttsPause || 'Pause');
            } else {
                if (playIcon) playIcon.style.display = 'inline-block';
                if (pauseIcon) pauseIcon.style.display = 'none';
                ctx.ttsPlayPauseBtn.setAttribute('title', dict.ttsPlay || 'Play');
                ctx.ttsPlayPauseBtn.setAttribute('aria-label', dict.ttsPlay || 'Play');
            }
        }
    }

    function toggleSpeedMenu() {
        if (!ctx.ttsSpeedMenu) return;
        const isHidden = ctx.ttsSpeedMenu.hidden;
        ctx.ttsSpeedMenu.hidden = !isHidden;
    }

    function closeSpeedMenu() {
        if (ctx.ttsSpeedMenu) ctx.ttsSpeedMenu.hidden = true;
    }

    // Event listeners
    if (ctx.ttsToggleBtn) {
        ctx.ttsToggleBtn.addEventListener('click', () => {
            if (isPlaying) {
                stop();
            } else {
                play();
            }
        });
    }

    if (ctx.ttsPlayPauseBtn) {
        ctx.ttsPlayPauseBtn.addEventListener('click', () => {
            if (isPlaying && !isPaused) {
                pause();
            } else {
                play();
            }
        });
    }

    if (ctx.ttsPrevBtn) {
        ctx.ttsPrevBtn.addEventListener('click', prev);
    }

    if (ctx.ttsNextBtn) {
        ctx.ttsNextBtn.addEventListener('click', next);
    }

    if (ctx.ttsStopBtn) {
        ctx.ttsStopBtn.addEventListener('click', stop);
    }

    if (ctx.ttsSpeedBtn) {
        ctx.ttsSpeedBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleSpeedMenu();
        });
    }

    if (ctx.ttsSpeedMenu) {
        ctx.ttsSpeedMenu.addEventListener('click', (e) => {
            const opt = e.target.closest('.tts-speed-option');
            if (!opt) return;
            const speed = parseFloat(opt.getAttribute('data-speed'));
            if (!isNaN(speed)) {
                setSpeed(speed);
                closeSpeedMenu();
            }
        });
    }

    document.addEventListener('click', (e) => {
        if (ctx.ttsSpeedMenu && !ctx.ttsSpeedMenu.contains(e.target) && !ctx.ttsSpeedBtn?.contains(e.target)) {
            closeSpeedMenu();
        }
    });

    // Settings listeners
    if (ctx.settingTtsVoice) {
        ctx.settingTtsVoice.addEventListener('change', (e) => {
            selectedVoiceURI = e.target.value;
            try {
                localStorage.setItem('dualread_tts_voice', selectedVoiceURI);
            } catch (err) { }
            if (isPlaying && !isPaused && currentIndex >= 0) {
                playParagraph(currentIndex);
            }
        });
    }

    // Apply initial speed UI
    setSpeed(currentSpeed);

    // Stop speaking when user unloads page
    window.addEventListener('beforeunload', () => {
        synth.cancel();
    });

    // Expose API on ctx
    ctx.api.tts = {
        play,
        pause,
        stop,
        next,
        prev,
        setSpeed,
        scanParagraphs,
        populateVoiceSelect
    };
}
