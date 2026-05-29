import React, { useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist/webpack';
import PdfLibrary from './PdfLibrary';

const CHAPTER_PATTERN = /^(chapter|part|section|prologue|epilogue|introduction|conclusion|appendix|preface|foreword)\b/i;
const CHAPTER_NUM_PATTERN = /^(chapter|part|section)\s+(\d+|[IVXLC]+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty)/i;

function detectChaptersFromText(words) {
  const chapters = [];
  for (let i = 0; i < words.length; i++) {
    const slice = words.slice(i, i + 6).join(' ');
    if (CHAPTER_NUM_PATTERN.test(slice) || (i === 0 || CHAPTER_PATTERN.test(slice))) {
      const match = slice.match(CHAPTER_NUM_PATTERN) || slice.match(CHAPTER_PATTERN);
      if (match) {
        const titleWords = words.slice(i, Math.min(i + 6, words.length));
        let title = titleWords.join(' ');
        if (title.length > 50) title = title.substring(0, 50) + '...';
        if (chapters.length === 0 || i - chapters[chapters.length - 1].wordIndex > 20) {
          chapters.push({ title, wordIndex: i });
        }
      }
    }
  }
  return chapters;
}

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

      const pageWordCounts = [];
      let fullText = '';

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map(item => item.str).join(' ');
        const wordsBefore = fullText.split(/\s+/).filter(w => w.length > 0).length;
        pageWordCounts.push(wordsBefore);
        fullText += pageText + ' ';
      }

      const trimmedText = fullText.trim();
      const allWords = trimmedText.split(/\s+/).filter(w => w.length > 0);

      // Try PDF outline first, fall back to text heuristics
      let chapters = [];
      try {
        const outline = await pdf.getOutline();
        if (outline && outline.length > 0) {
          const extractOutline = async (items, level) => {
            for (const item of items) {
              try {
                let dest = item.dest;
                if (typeof dest === 'string') {
                  dest = await pdf.getDestination(dest);
                }
                if (dest) {
                  const ref = dest[0];
                  const pageIndex = await pdf.getPageIndex(ref);
                  const wordIndex = pageWordCounts[pageIndex] || 0;
                  chapters.push({ title: item.title, wordIndex, level });
                }
              } catch {
                // skip unresolvable outline entries
              }
              if (item.items && item.items.length > 0) {
                await extractOutline(item.items, level + 1);
              }
            }
          };
          await extractOutline(outline, 0);
        }
      } catch {
        // outline not available
      }

      if (chapters.length === 0) {
        chapters = detectChaptersFromText(allWords);
      }

      let savedPdf;
      try {
        const pdfData = {
          name: file.name,
          size: file.size,
          text: trimmedText,
          chapters,
          uploadDate: new Date().toISOString()
        };
        savedPdf = PdfLibrary.save(pdfData);
        if (onPdfSaved) {
          onPdfSaved(savedPdf);
        }
      } catch (saveError) {
        console.warn('Failed to save PDF to library:', saveError);
      }

      onTextExtracted(trimmedText, savedPdf?.id);
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
