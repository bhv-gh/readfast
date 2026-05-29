import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import './RsvpReader.css';

const POSITION_KEY = 'readfast_positions';

function getPositions() {
  try {
    return JSON.parse(localStorage.getItem(POSITION_KEY)) || {};
  } catch { return {}; }
}

function savePosition(pdfId, index) {
  if (!pdfId) return;
  const positions = getPositions();
  positions[pdfId] = index;
  localStorage.setItem(POSITION_KEY, JSON.stringify(positions));
}

function getSavedPosition(pdfId) {
  if (!pdfId) return 0;
  return getPositions()[pdfId] || 0;
}

function RsvpReader({ text, pdfId, chapters = [], onClose }) {
  const [words, setWords] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [wpm, setWpm] = useState(300);
  const [speedChangeIndicator, setSpeedChangeIndicator] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const [showChapters, setShowChapters] = useState(false);
  const [contextMode, setContextMode] = useState(() => {
    try { return localStorage.getItem('readfast_contextMode') === 'true'; } catch { return false; }
  });
  const containerRef = useRef(null);
  const intervalRef = useRef(null);
  const holdIntervalRef = useRef(null);
  const touchStartRef = useRef(null);
  const holdTimerRef = useRef(null);
  const lastTapRef = useRef(0);

  const currentChapter = useMemo(() => {
    if (!chapters.length) return null;
    let active = null;
    for (const ch of chapters) {
      if (ch.wordIndex <= currentIndex) active = ch;
      else break;
    }
    return active;
  }, [chapters, currentIndex]);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile('ontouchstart' in window || window.innerWidth <= 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (text) {
      const wordArray = text.split(/\s+/).filter(word => word.length > 0);
      setWords(wordArray);
      const saved = getSavedPosition(pdfId);
      setCurrentIndex(Math.min(saved, wordArray.length - 1));
      setIsPlaying(false);
    }
  }, [text, pdfId]);

  useEffect(() => {
    savePosition(pdfId, currentIndex);
  }, [pdfId, currentIndex]);

  const getInterval = useCallback(() => (60 / wpm) * 1000, [wpm]);

  const nextWord = useCallback(() => {
    setCurrentIndex(prev => {
      if (prev < words.length - 1) return prev + 1;
      setIsPlaying(false);
      return prev;
    });
  }, [words.length]);

  const prevWord = useCallback(() => {
    setCurrentIndex(prev => Math.max(0, prev - 1));
  }, []);

  const toggleContextMode = useCallback(() => {
    setContextMode(prev => {
      const next = !prev;
      try { localStorage.setItem('readfast_contextMode', String(next)); } catch {}
      return next;
    });
  }, []);

  const jumpToChapter = useCallback((wordIndex) => {
    setIsPlaying(false);
    setCurrentIndex(wordIndex);
    setShowChapters(false);
  }, []);

  // Centralized cleanup for hold state
  const clearHold = useCallback(() => {
    if (holdTimerRef.current) { clearTimeout(holdTimerRef.current); holdTimerRef.current = null; }
    if (holdIntervalRef.current) { clearInterval(holdIntervalRef.current); holdIntervalRef.current = null; }
  }, []);

  // Auto-advance when playing
  useEffect(() => {
    if (isPlaying && words.length > 0) {
      intervalRef.current = setInterval(nextWord, getInterval());
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isPlaying, words.length, getInterval, nextWord]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (showChapters && e.code === 'Escape') {
        e.preventDefault();
        setShowChapters(false);
        return;
      }
      if (e.code === 'Space' || e.code === 'ArrowRight') {
        e.preventDefault();
        if (isPlaying) setIsPlaying(false);
        else nextWord();
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        prevWord();
      } else if (e.code === 'ArrowUp') {
        e.preventDefault();
        setWpm(prev => Math.min(1000, prev + 10));
      } else if (e.code === 'ArrowDown') {
        e.preventDefault();
        setWpm(prev => Math.max(50, prev - 10));
      } else if (e.code === 'Escape') {
        onClose();
      } else if (e.code === 'KeyC' && chapters.length > 0) {
        setShowChapters(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isPlaying, nextWord, prevWord, onClose, showChapters, chapters.length]);

  const showSpeedIndicator = (change) => {
    setSpeedChangeIndicator(change);
    setTimeout(() => setSpeedChangeIndicator(null), 800);
  };

  // --- Mobile touch handling ---
  // Tap right half: next word | Tap left half: prev word
  // Double-tap: toggle play/pause
  // Hold (400ms+): advance continuously while finger is down
  // Swipe up/down: change speed (works while playing without stopping)

  const handleTouchStart = useCallback((e) => {
    if (e.target.closest('button') || e.target.closest('.chapter-panel')) return;
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY, time: Date.now(), moved: false };

    holdTimerRef.current = setTimeout(() => {
      if (!touchStartRef.current || touchStartRef.current.moved) return;
      holdIntervalRef.current = setInterval(nextWord, getInterval());
    }, 400);
  }, [nextWord, getInterval]);

  const handleTouchMove = useCallback((e) => {
    if (!touchStartRef.current) return;
    const touch = e.touches[0];
    const diffY = Math.abs(touch.clientY - touchStartRef.current.y);
    const diffX = Math.abs(touch.clientX - touchStartRef.current.x);
    if (diffY > 20 || diffX > 20) {
      touchStartRef.current.moved = true;
      clearHold();
    }
  }, [clearHold]);

  const handleTouchEnd = useCallback((e) => {
    clearHold();
    if (!touchStartRef.current) return;

    const touch = e.changedTouches[0];
    const { x: startX, y: startY, time: startTime, moved } = touchStartRef.current;
    const elapsed = Date.now() - startTime;
    const diffY = startY - touch.clientY;
    const diffX = startX - touch.clientX;
    touchStartRef.current = null;

    // Was holding (long press) — just stop advancing, nothing else
    if (!moved && elapsed >= 400) return;

    // Vertical swipe — change speed (doesn't affect play state)
    if (moved && Math.abs(diffY) > 40 && Math.abs(diffY) > Math.abs(diffX)) {
      if (diffY > 0) {
        setWpm(prev => { const n = Math.min(1000, prev + 10); if (n !== prev) showSpeedIndicator('up'); return n; });
      } else {
        setWpm(prev => { const n = Math.max(50, prev - 10); if (n !== prev) showSpeedIndicator('down'); return n; });
      }
      return;
    }

    // Ignore if finger moved (incomplete swipe)
    if (moved) return;

    // Quick tap — check for double-tap first
    const now = Date.now();
    if (now - lastTapRef.current < 350) {
      // Double-tap: toggle play/pause
      lastTapRef.current = 0;
      setIsPlaying(prev => !prev);
      return;
    }
    lastTapRef.current = now;

    // Single tap (after a short delay to rule out double-tap)
    // But we act immediately for responsiveness — double-tap will override
    if (isPlaying) {
      setIsPlaying(false);
    } else {
      const tapX = touch.clientX;
      if (tapX < window.innerWidth / 2) prevWord();
      else nextWord();
    }
  }, [clearHold, isPlaying, nextWord, prevWord]);

  // touchcancel: iOS fires this instead of touchend on system gestures
  const handleTouchCancel = useCallback(() => {
    clearHold();
    touchStartRef.current = null;
  }, [clearHold]);

  // Safety: clear hold on unmount
  useEffect(() => {
    return () => clearHold();
  }, [clearHold]);

  const handleWheel = (e) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      setWpm(prev => { const n = Math.min(1000, prev + 10); if (n !== prev) showSpeedIndicator('up'); return n; });
    } else {
      setWpm(prev => { const n = Math.max(50, prev - 10); if (n !== prev) showSpeedIndicator('down'); return n; });
    }
  };

  const handleContainerClick = (e) => {
    if (isMobile) return;
    if (e.target.closest('button') || e.target.closest('.chapter-panel')) return;
    if (showChapters) { setShowChapters(false); return; }
    if (isPlaying) {
      setIsPlaying(false);
    } else {
      if (e.clientX < window.innerWidth / 2) prevWord();
      else nextWord();
    }
  };

  const getAnchorIndex = (word) => {
    const len = word.length;
    if (len <= 1) return 0;
    if (len <= 5) return 1;
    if (len <= 9) return 2;
    if (len <= 13) return 3;
    return Math.min(4, len - 1);
  };

  const renderWordWithAnchor = (word) => {
    if (!word) return null;
    const ai = getAnchorIndex(word);
    return (
      <div className="word-container">
        <span className="word-before">{word.slice(0, ai)}</span>
        <span className="word-anchor">{word[ai]}</span>
        <span className="word-after">{word.slice(ai + 1)}</span>
      </div>
    );
  };

  const renderContextView = () => {
    const RADIUS = isMobile ? 6 : 10;
    const w = words[currentIndex];
    const ai = getAnchorIndex(w);

    const beforeWords = [];
    for (let i = Math.max(0, currentIndex - RADIUS); i < currentIndex; i++) {
      const dist = currentIndex - i;
      beforeWords.push(
        <span key={i} className="context-word" style={{ opacity: Math.max(0.04, 0.35 - dist * 0.04) }}>
          {words[i]}
        </span>
      );
    }

    const afterWords = [];
    for (let i = currentIndex + 1; i <= Math.min(words.length - 1, currentIndex + RADIUS); i++) {
      const dist = i - currentIndex;
      afterWords.push(
        <span key={i} className="context-word" style={{ opacity: Math.max(0.04, 0.35 - dist * 0.04) }}>
          {words[i]}
        </span>
      );
    }

    return (
      <div className="context-container">
        <span className="context-before">
          {beforeWords}
          <span className="context-current-before">{w.slice(0, ai)}</span>
        </span>
        <span className="context-anchor">{w[ai]}</span>
        <span className="context-after">
          <span className="context-current-after">{w.slice(ai + 1)}</span>
          {afterWords}
        </span>
      </div>
    );
  };

  if (words.length === 0) {
    return <div className="rsvp-reader">No text to display</div>;
  }

  const currentWord = words[currentIndex];
  const progress = ((currentIndex + 1) / words.length) * 100;

  return (
    <div
      className={`rsvp-reader ${isMobile ? 'mobile-fullscreen' : ''}`}
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchCancel}
      onWheel={handleWheel}
      onClick={handleContainerClick}
    >
      {!isMobile && (
        <>
          <div className="rsvp-header">
            <button className="close-button" onClick={onClose}>×</button>
            {chapters.length > 0 && (
              <button
                className="chapter-toggle-btn"
                onClick={() => setShowChapters(prev => !prev)}
              >
                {currentChapter ? currentChapter.title : 'Chapters'}
              </button>
            )}
            <button className="mode-toggle-btn" onClick={toggleContextMode}>
              {contextMode ? 'Focus' : 'Context'}
            </button>
            <div className="progress-info">
              <span>{currentIndex + 1} / {words.length}</span>
              <span>{wpm} WPM</span>
            </div>
          </div>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
        </>
      )}

      <div className={`word-display ${contextMode ? 'context-mode' : ''}`}>
        <div className="anchor-line" />
        {contextMode ? renderContextView() : renderWordWithAnchor(currentWord)}
        {speedChangeIndicator && (
          <div className={`speed-indicator ${speedChangeIndicator}`}>
            {speedChangeIndicator === 'up' ? '↑ Faster' : '↓ Slower'}
          </div>
        )}
      </div>

      {isMobile && (
        <div className="mobile-overlay-info">
          <div className="mobile-progress-bar">
            <div className="mobile-progress-fill" style={{ width: `${progress}%` }} />
          </div>
          {chapters.length > 0 && (
            <button
              className="mobile-chapter-btn"
              onClick={() => setShowChapters(prev => !prev)}
            >
              Ch
            </button>
          )}
          <button className="mobile-mode-btn" onClick={toggleContextMode}>
            {contextMode ? 'F' : 'C'}
          </button>
          <span className="mobile-wpm">{wpm} WPM</span>
          {isPlaying && <span className="mobile-playing">▶</span>}
          <button className="mobile-close" onClick={onClose}>×</button>
        </div>
      )}

      {showChapters && chapters.length > 0 && (
        <div className="chapter-panel">
          <div className="chapter-panel-header">
            <h3>Chapters</h3>
            <button onClick={() => setShowChapters(false)}>×</button>
          </div>
          <div className="chapter-list">
            {chapters.map((ch, i) => (
              <button
                key={i}
                className={`chapter-item ${currentChapter === ch ? 'active' : ''} chapter-level-${ch.level || 0}`}
                onClick={() => jumpToChapter(ch.wordIndex)}
              >
                {ch.title}
              </button>
            ))}
          </div>
        </div>
      )}

      {!isMobile && (
        <>
          <div className="rsvp-controls">
            <button onClick={prevWord} disabled={currentIndex === 0}>← Prev</button>
            <button onClick={() => setIsPlaying(p => !p)} className="play-pause">
              {isPlaying ? '⏸ Pause' : '▶ Play'}
            </button>
            <button onClick={nextWord} disabled={currentIndex >= words.length - 1}>Next →</button>
          </div>
          <div className="speed-control">
            <label>Speed: {wpm} WPM</label>
            <input
              type="range" min="50" max="1000" step="10"
              value={wpm}
              onChange={(e) => setWpm(Number(e.target.value))}
              className="speed-slider"
            />
          </div>
        </>
      )}
    </div>
  );
}

export default RsvpReader;
