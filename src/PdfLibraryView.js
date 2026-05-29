import React, { useState, useEffect } from 'react';
import PdfLibrary from './PdfLibrary';
import './PdfLibraryView.css';

function PdfLibraryView({ onSelectPdf, onUploadNew }) {
  const [library, setLibrary] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [stats, setStats] = useState({ count: 0, totalSize: 0, totalWords: 0 });

  useEffect(() => {
    loadLibrary();
  }, []);

  const loadLibrary = () => {
    const items = PdfLibrary.getAll();
    setLibrary(items);
    setStats(PdfLibrary.getStats());
  };

  const handleDelete = (id, e) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this PDF from your library?')) {
      PdfLibrary.delete(id);
      loadLibrary();
    }
  };

  const handleSelect = (pdf) => {
    onSelectPdf(pdf);
  };

  const filteredLibrary = searchQuery 
    ? PdfLibrary.search(searchQuery)
    : library;

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="pdf-library-view">
      <div className="library-header">
        <h2>📚 My Library</h2>
        <div className="library-stats">
          <span>{stats.count} PDFs</span>
          <span>•</span>
          <span>{formatFileSize(stats.totalSize)}</span>
          <span>•</span>
          <span>{stats.totalWords.toLocaleString()} words</span>
        </div>
      </div>

      <div className="library-actions">
        <button className="upload-new-btn" onClick={onUploadNew}>
          + Upload New PDF
        </button>
        <input
          type="text"
          placeholder="Search library..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="search-input"
        />
      </div>

      {filteredLibrary.length === 0 ? (
        <div className="empty-library">
          {searchQuery ? (
            <p>No PDFs found matching "{searchQuery}"</p>
          ) : (
            <>
              <p>Your library is empty</p>
              <p className="empty-hint">Upload a PDF to get started with speed reading!</p>
            </>
          )}
        </div>
      ) : (
        <div className="library-grid">
          {filteredLibrary.map((pdf) => (
            <div 
              key={pdf.id} 
              className="library-item"
              onClick={() => handleSelect(pdf)}
            >
              <div className="library-item-header">
                <h3 className="pdf-name" title={pdf.name}>
                  {pdf.name}
                </h3>
                <button 
                  className="delete-btn"
                  onClick={(e) => handleDelete(pdf.id, e)}
                  title="Delete from library"
                >
                  ×
                </button>
              </div>
              
              <div className="pdf-preview">
                {pdf.preview}
              </div>
              
              <div className="pdf-meta">
                <span className="meta-item">
                  📄 {formatFileSize(pdf.size)}
                </span>
                <span className="meta-item">
                  📝 {pdf.wordCount.toLocaleString()} words
                </span>
                <span className="meta-item">
                  🕒 {formatDate(pdf.uploadDate)}
                </span>
              </div>
              
              <div className="read-btn">
                Read Now →
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default PdfLibraryView;
