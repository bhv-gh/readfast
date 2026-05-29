# PDF Library Feature

## Overview
The ReadFast app now includes a PDF library that stores uploaded PDFs in the browser's localStorage for quick access later. Users can build a personal library of documents to read with the RSVP technique.

## Features

### 1. PDF Storage (`PdfLibrary.js`)
- Stores PDF metadata and extracted text in browser localStorage
- Each PDF entry includes:
  - Unique ID
  - File name
  - File size
  - Upload date
  - Extracted text content
  - Word count
  - Preview text (first 200 characters)
- 50MB storage limit (browser localStorage constraint)
- Automatic duplicate detection (updates existing PDF with same name)

### 2. Library View (`PdfLibraryView.js`)
- Grid layout showing all saved PDFs
- Search functionality (by name or content preview)
- Displays for each PDF:
  - File name
  - Preview text
  - File size
  - Word count
  - Upload date/time
  - Delete button
  - "Read Now" button
- Library statistics (total PDFs, total size, total words)
- Empty state with helpful message
- Responsive design (single column on mobile)

### 3. Integration (`App.js`)
- **First-time users**: See upload screen directly
- **Returning users**: See library view with saved PDFs
- **Navigation flow**:
  - Library → Select PDF → Reader → Close → Back to Library
  - Library → Upload New → Uploader → After upload → Reader
  - Uploader → Back to Library (if library has items)
- Automatic library refresh after upload/delete

## User Workflow

### Uploading a New PDF
1. Click "Upload New PDF" from library view
2. Select PDF file
3. Text is extracted and PDF is saved to library
4. Reader opens automatically with the PDF

### Reading from Library
1. Library view shows all saved PDFs
2. Click on any PDF card to start reading
3. Reader opens with the saved text (no re-extraction needed)
4. Close reader to return to library

### Managing Library
1. **Search**: Use search box to find PDFs by name or content
2. **Delete**: Click × button on PDF card (with confirmation)
3. **View Stats**: See total PDFs, storage used, and word count at top

## Technical Details

### Storage
- Uses browser localStorage (persistent across sessions)
- Data is stored as JSON string
- Key: `readfast_pdf_library`
- Each PDF stores extracted text (not binary), making it efficient

### Performance
- Text extraction happens once during upload
- Subsequent reads load instantly from localStorage
- Search is client-side and fast for typical library sizes
- 50MB limit prevents browser storage issues

### Data Structure
```javascript
{
  id: "unique-timestamp",
  name: "document.pdf",
  size: 1024000,
  uploadDate: "2024-01-15T10:30:00.000Z",
  text: "Full extracted text content...",
  wordCount: 5000,
  preview: "First 200 characters..."
}
```

## Benefits
1. **No re-upload needed**: Access PDFs instantly from library
2. **Offline access**: PDFs stored locally, works without internet (after initial load)
3. **Organization**: Keep track of reading materials in one place
4. **Quick start**: Returning users see their library immediately
5. **Privacy**: All data stays in user's browser, no server upload
