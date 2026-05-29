import React, { useState, useEffect, useRef, useCallback } from 'react';
import './RsvpReader.css';

function RsvpReader({ text, onClose }) {
  const [words, setWords] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [wpm, setWpm] = useState(300); // Words per minute
  const [touchStartY, setTouchStartY] = useState(null);
  const [touchStartX, setTouchStartX] = useState(null);
  const [speedChangeIndicator, setSpeedChangeIndicator] = useState(null);
  const [isMobileLandscape, setIsMobileLandscape] = useState(false);
  const [lastTapTime, setLastTapTime] = useState(0);
  const containerRef = useRef(null);
  const intervalRef = useRef(null);

  // Detect mobile landscape mode
  useEffect(() => {
    const checkMobileLandscape = () => {
      const isMobile = window.innerWidth <= 768 || 'ontouchstart' in window;
      const isLandscape = window.innerWidth > window.innerHeight;
      setIsMobileLandscape(isMobile && isLandscape);
    };

    checkMobileLandscape();
    window.addEventListener('resize', checkMobileLandscape);
    window.addEventListener('orientationchange', checkMobileLandscape);
    
    return () => {
      window.removeEventListener('resize', checkMobileLandscape);
      window.removeEventListener('orientationchange', checkMobileLandscape);
    };
  }, []);

  // Split text into words
  useEffect(() => {
    if (text) {
      const wordArray = text.split(/\s+/).filter(word => word.length > 0);
      setWords(wordArray);
      setCurrentIndex(0);
      setIsPlaying(false);
    }
  }, [text]);

  // Calculate interval in milliseconds from WPM
  const getInterval = useCallback(() => {
    return (60 / wpm) * 1000;
  }, [wpm]);

  // Advance to next word
  const nextWord = useCallback(() => {
    setCurrentIndex(prev => {
      if (prev < words.length - 1) {
        return prev + 1;
      } else {
        setIsPlaying(false);
        return prev;
      }
    });
  }, [words.length]);

  // Go to previous word
  const prevWord = useCallback(() => {
    setCurrentIndex(prev => Math.max(0, prev - 1));
  }, []);

  // Handle play/pause
  const togglePlayPause = useCallback(() => {
    setIsPlaying(prev => !prev);
  }, []);

  // Auto-advance when playing
  useEffect(() => {
    if (isPlaying && words.length > 0) {
      intervalRef.current = setInterval(() => {
        nextWord();
      }, getInterval());
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPlaying, words.length, getInterval, nextWord]);

  // Handle keyboard events
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.code === 'Space' || e.code === 'ArrowRight') {
        e.preventDefault();
        if (isPlaying) {
          setIsPlaying(false);
        } else {
          nextWord();
        }
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        prevWord();
      } else if (e.code === 'ArrowUp') {
        e.preventDefault();
        setWpm(prev => Math.min(1000, prev + 50));
      } else if (e.code === 'ArrowDown') {
        e.preventDefault();
        setWpm(prev => Math.max(50, prev - 50));
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isPlaying, nextWord, prevWord]);

  // Show speed change indicator
  const showSpeedIndicator = (change) => {
    setSpeedChangeIndicator(change);
    setTimeout(() => setSpeedChangeIndicator(null), 1000);
  };

  // Handle touch events for swipe
  const handleTouchStart = (e) => {
    setTouchStartY(e.touches[0].clientY);
    setTouchStartX(e.touches[0].clientX);
  };

  const handleTouchEnd = (e) => {
    if (touchStartY === null || touchStartX === null) return;
    
    const touchEndY = e.changedTouches[0].clientY;
    const touchEndX = e.changedTouches[0].clientX;
    const diffY = touchStartY - touchEndY;
    const diffX = touchStartX - touchEndX;
    
    // Determine if horizontal or vertical swipe
    if (Math.abs(diffX) > Math.abs(diffY)) {
      // Horizontal swipe - toggle play/pause or navigate
      if (Math.abs(diffX) > 50) {
        if (diffX > 0) {
          // Swipe left - next word
          if (isPlaying) {
            setIsPlaying(false);
          } else {
            nextWord();
          }
        } else {
          // Swipe right - previous word or toggle play
          if (isPlaying) {
            setIsPlaying(false);
          } else {
            prevWord();
          }
        }
      }
    } else {
      // Vertical swipe - speed control
      if (Math.abs(diffY) > 50) {
        if (diffY > 0) {
          // Swipe up - increase speed
          setWpm(prev => {
            const newWpm = Math.min(1000, prev + 50);
            if (newWpm !== prev) showSpeedIndicator('up');
            return newWpm;
          });
        } else {
          // Swipe down - decrease speed
          setWpm(prev => {
            const newWpm = Math.max(50, prev - 50);
            if (newWpm !== prev) showSpeedIndicator('down');
            return newWpm;
          });
        }
      }
    }
    
    setTouchStartY(null);
    setTouchStartX(null);
  };

  // Handle mouse wheel for speed control (desktop swipe equivalent)
  const handleWheel = (e) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      // Scroll up - increase speed
      setWpm(prev => {
        const newWpm = Math.min(1000, prev + 50);
        if (newWpm !== prev) showSpeedIndicator('up');
        return newWpm;
      });
    } else {
      // Scroll down - decrease speed
      setWpm(prev => {
        const newWpm = Math.max(50, prev - 50);
        if (newWpm !== prev) showSpeedIndicator('down');
        return newWpm;
      });
    }
  };

  // Handle click/tap to advance
  const handleContainerClick = (e) => {
    // Don't trigger if clicking on buttons
    if (e.target.closest('button')) return;
    
    if (isMobileLandscape) {
      // In mobile landscape, check for double-tap to exit
      const currentTime = new Date().getTime();
      const tapLength = currentTime - lastTapTime;
      
      if (tapLength < 500 && tapLength > 0) {
        // Double-tap detected - exit
        onClose();
        return;
      }
      
      setLastTapTime(currentTime);
      
      // Single tap toggles play/pause
      setIsPlaying(prev => !prev);
    } else {
      // In normal mode, tap advances or pauses
      if (isPlaying) {
        setIsPlaying(false);
      } else {
        nextWord();
      }
    }
  };

  // Get word with red anchor letter
  // Uses Optimal Recognition Point (ORP) for better reading focus
  // The anchor letter stays fixed at the center line
  const renderWordWithAnchor = (word) => {
    if (!word) return null;
    
    // Calculate ORP based on word length (standard RSVP positioning)
    let anchorIndex;
    const len = word.length;
    if (len <= 1) anchorIndex = 0;
    else if (len <= 5) anchorIndex = 1;
    else if (len <= 9) anchorIndex = 2;
    else if (len <= 13) anchorIndex = 3;
    else anchorIndex = 4;
    
    // Ensure anchorIndex is within bounds
    anchorIndex = Math.min(anchorIndex, len - 1);
    
    const beforeAnchor = word.slice(0, anchorIndex);
    const anchorChar = word[anchorIndex];
    const afterAnchor = word.slice(anchorIndex + 1);
    
    return (
      <div className="word-container">
        <span className="word-before">{beforeAnchor}</span>
        <span className="word-anchor">{anchorChar}</span>
        <span className="word-after">{afterAnchor}</span>
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
      className={`rsvp-reader ${isMobileLandscape ? 'mobile-landscape' : ''}`}
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onWheel={handleWheel}
      onClick={handleContainerClick}
    >
      {!isMobileLandscape && (
        <>
          <div className="rsvp-header">
            <button className="close-button" onClick={onClose}>×</button>
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
            {speedChangeIndicator === 'up' ? '↑ Faster' : 
             speedChangeIndicator === 'down' ? '↓ Slower' : 
             speedChangeIndicator}
          </div>
        )}
        {isMobileLandscape && (
          <div className="mobile-hint">
            <span className="wpm-display">{wpm} WPM</span>
            {isPlaying && <span className="playing-indicator">▶</span>}
            <span className="exit-hint">Double-tap to exit</span>
          </div>
        )}
      </div>
      
      {!isMobileLandscape && (
        <>
          <div className="rsvp-controls">
            <button onClick={prevWord} disabled={currentIndex === 0}>
              ← Prev
            </button>
            <button onClick={togglePlayPause} className="play-pause">
              {isPlaying ? '⏸ Pause' : '▶ Play'}
            </button>
            <button onClick={nextWord} disabled={currentIndex >= words.length - 1}>
              Next →
            </button>
          </div>
          
          <div className="speed-control">
            <label>Speed: {wpm} WPM</label>
            <input
              type="range"
              min="50"
              max="1000"
              step="50"
              value={wpm}
              onChange={(e) => setWpm(Number(e.target.value))}
              className="speed-slider"
            />
            <div className="speed-hint">
              Swipe up/down or use ↑↓ keys to adjust speed
            </div>
          </div>
          
          <div className="instructions">
            <p>Tap/click or press Space to advance • Swipe up/down for speed</p>
          </div>
        </>
      )}
    </div>
  );
}

export default RsvpReader;
