// PDF Library - Manages storing and retrieving PDFs from localStorage
const STORAGE_KEY = 'readfast_pdf_library';
const MAX_STORAGE_SIZE = 50 * 1024 * 1024; // 50MB limit for localStorage

class PdfLibrary {
  // Get all PDFs from library
  static getAll() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to load PDF library:', error);
      return [];
    }
  }

  // Save a PDF to library
  static save(pdfData) {
    try {
      const library = this.getAll();
      
      // Check if PDF with same name already exists
      const existingIndex = library.findIndex(item => item.name === pdfData.name);
      
      const pdfEntry = {
        id: pdfData.id || Date.now().toString(),
        name: pdfData.name,
        size: pdfData.size,
        uploadDate: pdfData.uploadDate || new Date().toISOString(),
        text: pdfData.text,
        chapters: pdfData.chapters || [],
        wordCount: pdfData.text ? pdfData.text.split(/\s+/).length : 0,
        preview: pdfData.text ? pdfData.text.substring(0, 200) + '...' : ''
      };

      if (existingIndex >= 0) {
        // Update existing
        library[existingIndex] = pdfEntry;
      } else {
        // Add new
        library.unshift(pdfEntry); // Add to beginning
      }

      // Check storage size
      const serialized = JSON.stringify(library);
      if (serialized.length > MAX_STORAGE_SIZE) {
        throw new Error('Library storage limit exceeded. Please delete some PDFs.');
      }

      localStorage.setItem(STORAGE_KEY, serialized);
      return pdfEntry;
    } catch (error) {
      console.error('Failed to save PDF to library:', error);
      throw error;
    }
  }

  // Get a specific PDF by ID
  static getById(id) {
    const library = this.getAll();
    return library.find(item => item.id === id);
  }

  // Delete a PDF from library
  static delete(id) {
    try {
      const library = this.getAll();
      const filtered = library.filter(item => item.id !== id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
      return true;
    } catch (error) {
      console.error('Failed to delete PDF from library:', error);
      return false;
    }
  }

  // Clear entire library
  static clear() {
    try {
      localStorage.removeItem(STORAGE_KEY);
      return true;
    } catch (error) {
      console.error('Failed to clear library:', error);
      return false;
    }
  }

  // Get library stats
  static getStats() {
    const library = this.getAll();
    const totalSize = library.reduce((sum, item) => sum + (item.size || 0), 0);
    const totalWords = library.reduce((sum, item) => sum + (item.wordCount || 0), 0);
    
    return {
      count: library.length,
      totalSize,
      totalWords,
      storageUsed: JSON.stringify(library).length
    };
  }

  // Search PDFs by name
  static search(query) {
    const library = this.getAll();
    const lowerQuery = query.toLowerCase();
    return library.filter(item => 
      item.name.toLowerCase().includes(lowerQuery) ||
      item.preview.toLowerCase().includes(lowerQuery)
    );
  }
}

export default PdfLibrary;
