# ReadFast - RSVP Reader Implementation

## Overview
A React application that implements Rapid Serial Visual Presentation (RSVP) reading technique. Users upload a PDF, and the app displays one word at a time with a red anchor letter for optimal focus. Speed can be controlled via swipe gestures.

## Features Implemented

### 1. PDF Upload & Text Extraction (`PdfUploader.js`)
- File input accepting PDF files only
- Uses `pdfjs-dist/webpack` for PDF text extraction (CRA compatible)
- Extracts text from all pages of the PDF
- Loading state and error handling
- Clean UI with upload button

### 2. RSVP Reader (`RsvpReader.js`)
- **Word Display**: Shows one word at a time in large, readable font
- **Red Anchor Letter**: Implements Optimal Recognition Point (ORP) algorithm:
  - 1 letter: position 0
  - 2-5 letters: position 1
  - 6-9 letters: position 2
  - 10-13 letters: position 3
  - 14+ letters: position 4
- **Visual Guide**: Vertical anchor line shows where the red letter aligns
- **Progress Tracking**: Shows current word position and progress bar

### 3. Navigation Controls
- **Tap/Click**: Advance to next word (pauses if playing)
- **Space Bar / Right Arrow**: Next word
- **Left Arrow**: Previous word
- **Play/Pause Button**: Auto-advance through words
- **Prev/Next Buttons**: Manual navigation

### 4. Speed Control
- **Swipe Up**: Increase speed (+50 WPM, max 1000)
- **Swipe Down**: Decrease speed (-50 WPM, min 50)
- **Mouse Wheel**: Up/down for speed control (desktop)
- **Arrow Up/Down Keys**: Keyboard speed control
- **Slider**: Visual speed control (50-1000 WPM)
- **Visual Feedback**: Speed change indicator shows "↑ Faster" or "↓ Slower"

### 5. User Interface
- Dark theme optimized for reading
- Responsive design (mobile, tablet, desktop)
- Clean, distraction-free reading mode
- Progress bar and word counter
- Instructions and hints

## Technical Implementation

### Components
1. **App.js**: Main container, manages state between uploader and reader
2. **PdfUploader.js**: Handles PDF file input and text extraction
3. **RsvpReader.js**: Main RSVP display and interaction logic
4. **RsvpReader.css**: Styling for reader and uploader

### Key Libraries
- **React**: UI framework (already in CRA)
- **pdfjs-dist**: PDF text extraction (installed via npm)

### File Structure
```
src/
├── App.js              # Main app component
├── App.css             # App styling
├── PdfUploader.js      # PDF upload and extraction
├── RsvpReader.js       # RSVP reader component
├── RsvpReader.css      # Reader styling
└── index.js            # React entry point
```

## Usage

1. **Upload PDF**: Click "Upload PDF" button and select a PDF file
2. **Reading**: 
   - Tap/click anywhere or press Space to advance to next word
   - Use Prev/Next buttons for manual navigation
   - Click Play to auto-advance
3. **Speed Control**:
   - Swipe up on the word area to increase speed
   - Swipe down to decrease speed
   - Use mouse wheel on desktop
   - Adjust slider at bottom
   - Use ↑↓ arrow keys
4. **Close**: Click X button to return to upload screen

## Speed Range
- Minimum: 50 WPM (words per minute)
- Maximum: 1000 WPM
- Default: 300 WPM
- Step: 50 WPM increments

## Browser Compatibility
- Modern browsers with ES6+ support
- Touch events for mobile swipe
- Works on desktop and mobile devices
