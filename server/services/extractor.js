import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import { createWorker } from 'tesseract.js';
import { config } from '../config.js';
import { GoogleGenerativeAI } from '@google/generative-ai';

let tesseractWorker = null;

async function getTesseractWorker() {
  if (!tesseractWorker) {
    try {
      tesseractWorker = await createWorker('eng');
    } catch (err) {
      console.warn('⚠️ Tesseract OCR worker initialization notice:', err.message);
      return null;
    }
  }
  return tesseractWorker;
}

export const extractorService = {
  /**
   * Main text extraction dispatcher
   */
  async extractText({ buffer, mimeType, originalName }) {
    let extractedText = '';
    let summary = '';
    let tags = [];

    try {
      if (mimeType === 'application/pdf') {
        extractedText = await this.extractFromPdf(buffer);
      } else if (
        mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        originalName.endsWith('.docx')
      ) {
        extractedText = await this.extractFromDocx(buffer);
      } else if (
        mimeType.startsWith('text/') ||
        mimeType === 'application/json' ||
        mimeType === 'application/csv' ||
        originalName.endsWith('.txt') ||
        originalName.endsWith('.md') ||
        originalName.endsWith('.json') ||
        originalName.endsWith('.csv')
      ) {
        extractedText = buffer.toString('utf-8');
      } else if (mimeType.startsWith('image/')) {
        const imageResult = await this.extractFromImage(buffer, mimeType, originalName);
        extractedText = imageResult.text;
        summary = imageResult.summary;
        tags = imageResult.tags;
      }

      // Generate basic summary / tags if text is extracted
      if (extractedText && !summary) {
        const clean = extractedText.replace(/\s+/g, ' ').trim();
        summary = clean.slice(0, 200) + (clean.length > 200 ? '...' : '');
      }

      // Auto-tag common keywords
      if (tags.length === 0) {
        tags = this.generateBasicTags(originalName, mimeType, extractedText);
      }

    } catch (error) {
      console.error(`⚠️ Extraction warning for file "${originalName}":`, error.message);
      extractedText = `[Extracted metadata only]: ${originalName}`;
      summary = `File: ${originalName} (${mimeType})`;
    }

    return {
      extractedText: extractedText.trim(),
      summary: summary.trim(),
      tags
    };
  },

  async extractFromPdf(buffer) {
    const data = await pdfParse(buffer);
    return data.text || '';
  },

  async extractFromDocx(buffer) {
    const result = await mammoth.extractRawText({ buffer });
    return result.value || '';
  },

  async extractFromImage(buffer, mimeType, originalName) {
    let text = '';
    let summary = '';
    let tags = ['image'];

    // 1. Try Gemini Vision if Gemini API Key is configured
    if (config.ai.geminiApiKey) {
      try {
        const genAI = new GoogleGenerativeAI(config.ai.geminiApiKey);
        const model = genAI.getGenerativeModel({ model: config.ai.geminiModel });
        
        const prompt = "Transcribe any text found in this image, certificate, receipt, or document verbatim. Then provide a 1-sentence summary of what this image shows and list 3-5 relevant keywords separated by commas.";
        const imagePart = {
          inlineData: {
            data: buffer.toString('base64'),
            mimeType: mimeType
          }
        };

        const result = await model.generateContent([prompt, imagePart]);
        const responseText = result.response.text();
        
        text = responseText;
        summary = `Image analyzed: ${originalName}`;
        return { text, summary, tags };
      } catch (geminiErr) {
        console.warn('⚠️ Gemini image analysis fallback to OCR:', geminiErr.message);
      }
    }

    // 2. Fallback to Tesseract.js OCR
    try {
      const worker = await getTesseractWorker();
      if (worker) {
        const ret = await worker.recognize(buffer);
        text = ret.data.text || '';
        summary = text ? `Scanned text from ${originalName}` : `Image: ${originalName}`;
      }
    } catch (ocrErr) {
      console.warn('⚠️ Tesseract OCR recognition notice:', ocrErr.message);
    }

    if (!text) {
      text = `Image file: ${originalName}`;
      summary = `Image: ${originalName}`;
    }

    return { text, summary, tags };
  },

  generateBasicTags(filename, mimeType, text) {
    const tags = new Set();
    const lowerName = filename.toLowerCase();
    const lowerText = (text || '').toLowerCase();

    // Document types
    if (mimeType.includes('pdf')) tags.add('pdf');
    if (mimeType.includes('image')) tags.add('image');
    if (mimeType.includes('word') || lowerName.endsWith('.docx')) tags.add('document');
    if (lowerName.endsWith('.txt') || lowerName.endsWith('.md')) tags.add('notes');

    // Content keywords
    const keywords = [
      'certificate', 'diploma', 'degree',
      'resume', 'cv', 'internship', 'job', 'offer',
      'invoice', 'receipt', 'bill', 'tax', 'salary', 'payslip',
      'passport', 'id', 'license', 'contract', 'agreement',
      'report', 'presentation', 'project', 'thesis', 'assignment'
    ];

    for (const kw of keywords) {
      if (lowerName.includes(kw) || lowerText.includes(kw)) {
        tags.add(kw);
      }
    }

    return Array.from(tags);
  }
};
