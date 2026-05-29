import React, { useState, useEffect } from 'react';
import './App.css';
import PdfUploader from './PdfUploader';
import RsvpReader from './RsvpReader';
import PdfLibraryView from './PdfLibraryView';
import PdfLibrary from './PdfLibrary';

function App() {
  const [extractedText, setExtractedText] = useState(null);
  const [showReader, setShowReader] = useState(false);
  const [showLibrary, setShowLibrary] = useState(true);
  const [showUploader, setShowUploader] = useState(false);

  useEffect(() => {
    // Check if library has items, if not show uploader first
    const library = PdfLibrary.getAll();
    if (library.length === 0) {
      setShowLibrary(false);
      setShowUploader(true);
    }
  }, []);

  const handleTextExtracted = (text) => {
    setExtractedText(text);
    setShowReader(true);
    setShowLibrary(false);
    setShowUploader(false);
  };

  const handlePdfFromLibrary = (pdf) => {
    setExtractedText(pdf.text);
    setShowReader(true);
    setShowLibrary(false);
    setShowUploader(false);
  };

  const handleCloseReader = () => {
    setShowReader(false);
    setExtractedText(null);
    // Return to library if it has items, otherwise show uploader
    const library = PdfLibrary.getAll();
    if (library.length > 0) {
      setShowLibrary(true);
      setShowUploader(false);
    } else {
      setShowLibrary(false);
      setShowUploader(true);
    }
  };

  const handleUploadNew = () => {
    setShowLibrary(false);
    setShowUploader(true);
  };

  const handleBackToLibrary = () => {
    setShowUploader(false);
    setShowLibrary(true);
  };

  const handlePdfSaved = () => {
    // PDF was saved to library, we can refresh library view if needed
  };

  return (
    <div className="App">
      <header className="App-header">
        {!showReader && (
          <>
            <h1>ReadFast - RSVP Reader</h1>
            <p className="subtitle">
              Upload a PDF and read it one word at a time with optimal focus
            </p>
          </>
        )}
        
        {showReader ? (
          <RsvpReader text={extractedText} onClose={handleCloseReader} />
        ) : showLibrary ? (
          <PdfLibraryView 
            onSelectPdf={handlePdfFromLibrary}
            onUploadNew={handleUploadNew}
          />
        ) : showUploader ? (
          <div className="upload-section">
            <PdfUploader 
              onTextExtracted={handleTextExtracted}
              onPdfSaved={handlePdfSaved}
            />
            {PdfLibrary.getAll().length > 0 && (
              <button className="back-to-library-btn" onClick={handleBackToLibrary}>
                ← Back to Library
              </button>
            )}
            <div className="features">
              <h3>How it works:</h3>
              <ul>
                <li>📄 Upload any PDF document</li>
                <li>💾 PDFs are saved to your library for later</li>
                <li>👁️ Words displayed one at a time with red anchor letter</li>
                <li>👆 Tap/click or press Space to advance</li>
                <li>⬆️⬇️ Swipe up/down to control reading speed</li>
                <li>⚡ Adjust speed from 50 to 1000 WPM</li>
                <li>📱 Mobile landscape: Full-screen gesture controls</li>
              </ul>
            </div>
          </div>
        ) : null}
      </header>
    </div>
  );
}

export default App;
