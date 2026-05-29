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
  const containerRef = useRef(null);
  const intervalRef = useRef(null);
  const holdIntervalRef = useRef(null);
  const touchStartRef = useRef(null);
  const isHoldingRef = useRef(false);
  const holdTimerRef = useRef(null);

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

  const jumpToChapter = useCallback((wordIndex) => {
    setIsPlaying(false);
    setCurrentIndex(wordIndex);
    setShowChapters(false);
  }, []);

  useEffect(() => {
    if (isPlaying && words.length > 0) {
      intervalRef.current = setInterval(nextWord, getInterval());
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isPlaying, words.length, getInterval, nextWord]);

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
        setWpm(prev => Math.min(1000, prev + 50));
      } else if (e.code === 'ArrowDown') {
        e.preventDefault();
        setWpm(prev => Math.max(50, prev - 50));
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

  const handleTouchStart = useCallback((e) => {
    if (e.target.closest('button') || e.target.closest('.chapter-panel')) return;
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY, time: Date.now() };
    isHoldingRef.current = false;

    holdTimerRef.current = setTimeout(() => {
      isHoldingRef.current = true;
      setIsPlaying(false);
      holdIntervalRef.current = setInterval(nextWord, getInterval());
    }, 200);
  }, [nextWord, getInterval]);

  const handleTouchMove = useCallback((e) => {
    if (!touchStartRef.current) return;
    const touch = e.touches[0];
    const diffY = Math.abs(touch.clientY - touchStartRef.current.y);
    const diffX = Math.abs(touch.clientX - touchStartRef.current.x);
    if (diffY > 30 || diffX > 30) {
      if (holdTimerRef.current) { clearTimeout(holdTimerRef.current); holdTimerRef.current = null; }
      if (holdIntervalRef.current) { clearInterval(holdIntervalRef.current); holdIntervalRef.current = null; }
      isHoldingRef.current = false;
    }
  }, []);

  const handleTouchEnd = useCallback((e) => {
    if (holdTimerRef.current) { clearTimeout(holdTimerRef.current); holdTimerRef.current = null; }
    if (holdIntervalRef.current) { clearInterval(holdIntervalRef.current); holdIntervalRef.current = null; }

    if (!touchStartRef.current) return;
    const touch = e.changedTouches[0];
    const diffY = touchStartRef.current.y - touch.clientY;
    const diffX = touchStartRef.current.x - touch.clientX;
    const elapsed = Date.now() - touchStartRef.current.time;

    if (isHoldingRef.current) {
      isHoldingRef.current = false;
      touchStartRef.current = null;
      return;
    }

    if (Math.abs(diffY) > 50 && Math.abs(diffY) > Math.abs(diffX)) {
      if (diffY > 0) {
        setWpm(prev => { const n = Math.min(1000, prev + 50); if (n !== prev) showSpeedIndicator('up'); return n; });
      } else {
        setWpm(prev => { const n = Math.max(50, prev - 50); if (n !== prev) showSpeedIndicator('down'); return n; });
      }
    } else if (elapsed < 300 && Math.abs(diffX) < 30 && Math.abs(diffY) < 30) {
      if (isPlaying) {
        setIsPlaying(false);
      } else {
        const tapX = touch.clientX;
        if (tapX < window.innerWidth / 2) prevWord();
        else nextWord();
      }
    }

    touchStartRef.current = null;
  }, [isPlaying, nextWord, prevWord]);

  useEffect(() => {
    return () => {
      if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
      if (holdIntervalRef.current) clearInterval(holdIntervalRef.current);
    };
  }, []);

  const handleWheel = (e) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      setWpm(prev => { const n = Math.min(1000, prev + 50); if (n !== prev) showSpeedIndicator('up'); return n; });
    } else {
      setWpm(prev => { const n = Math.max(50, prev - 50); if (n !== prev) showSpeedIndicator('down'); return n; });
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

  const renderWordWithAnchor = (word) => {
    if (!word) return null;
    const len = word.length;
    let anchorIndex;
    if (len <= 1) anchorIndex = 0;
    else if (len <= 5) anchorIndex = 1;
    else if (len <= 9) anchorIndex = 2;
    else if (len <= 13) anchorIndex = 3;
    else anchorIndex = 4;
    anchorIndex = Math.min(anchorIndex, len - 1);

    const before = word.slice(0, anchorIndex);
    const anchor = word[anchorIndex];
    const after = word.slice(anchorIndex + 1);

    return (
      <div className="word-container">
        <span className="word-before">{before}</span>
        <span className="word-anchor">{anchor}</span>
        <span className="word-after">{after}</span>
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

      <div className="word-display">
        <div className="anchor-line" />
        {renderWordWithAnchor(currentWord)}
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
          <span className="mobile-wpm">{wpm} WPM</span>
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
              type="range" min="50" max="1000" step="50"
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
