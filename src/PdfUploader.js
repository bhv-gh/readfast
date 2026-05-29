import React, { useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist/webpack';
import PdfLibrary from './PdfLibrary';

// pdfjs-dist/webpack automatically handles the worker for webpack-based builds like CRA

function PdfUploader({ onTextExtracted, onPdfSaved }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (!file || file.type !== 'application/pdf') {
      setError('Please select a valid PDF file');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ 
        data: arrayBuffer
      }).promise;
      
      let fullText = '';
      
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map(item => item.str).join(' ');
        fullText += pageText + ' ';
      }
      
      const trimmedText = fullText.trim();
      
      // Save to library
      try {
        const pdfData = {
          name: file.name,
          size: file.size,
          text: trimmedText,
          uploadDate: new Date().toISOString()
        };
        const savedPdf = PdfLibrary.save(pdfData);
        if (onPdfSaved) {
          onPdfSaved(savedPdf);
        }
      } catch (saveError) {
        console.warn('Failed to save PDF to library:', saveError);
        // Continue even if save fails - still allow reading
      }
      
      onTextExtracted(trimmedText);
    } catch (err) {
      setError('Failed to extract text from PDF: ' + err.message);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pdf-uploader">
      <input
        type="file"
        accept=".pdf,application/pdf"
        onChange={handleFileChange}
        disabled={loading}
        id="pdf-input"
        style={{ display: 'none' }}
      />
      <label htmlFor="pdf-input" className="upload-button">
        {loading ? 'Processing PDF...' : 'Upload PDF'}
      </label>
      {error && <div className="error-message">{error}</div>}
    </div>
  );
}

export default PdfUploader;
