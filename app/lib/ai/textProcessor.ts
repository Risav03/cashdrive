import mammoth from 'mammoth';

// Constants
const TEXT_PROCESSING_CONFIG = {
  CHUNK_SIZE: {
    DEFAULT: 1000,
    MIN_LENGTH: 50
  },
  TOPIC_EXTRACTION: {
    MIN_WORD_LENGTH: 4,
    MAX_TOPICS: 5
  },
  PDF_PROCESSING: {
    ENCODING: 'utf-8' as const,
    FALLBACK_MESSAGE: '[PDF Document] This PDF was successfully parsed but contains no extractable text. It may be an image-based PDF or contain only graphics and forms. The document is available for download and manual review.'
  }
} as const;

const SUPPORTED_MIME_TYPES = {
  PDF: 'application/pdf',
  DOCX: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  TEXT: 'text/plain'
} as const;

const ERROR_MESSAGES = {
  PDF_PARSE_FAILED: 'PDF parsing failed',
  PDF_PROCESSING_FAILED: 'Failed to process PDF content',
  PDF_EXTRACTION_FAILED: 'PDF extraction failed',
  TEXT_EXTRACTION_FAILED: 'Failed to extract text from file type',
  UNKNOWN_ERROR: 'Unknown error'
} as const;

const LOG_MESSAGES = {
  PDF_PARSE_ERROR: 'PDF parsing error:',
  PDF_PROCESSING_ERROR: 'Error processing PDF data:',
  PDF_EXTRACTION_SETUP_ERROR: 'PDF extraction setup error:',
  PDF_PARSED_SUCCESS: 'PDF parsed successfully. Pages:',
  TEXT_LENGTH: 'Total extracted text length:',
  TEXT_CHARACTERS: 'characters',
  NO_TEXT_FOUND: 'No text content found in PDF',
  TEXT_EXTRACTION_ERROR: 'Error extracting text:',
  PROCESSING_ERROR: 'Error processing text file:',
  UNSUPPORTED_MIME_WARNING: 'Unsupported MIME type:',
  ATTEMPTING_PLAIN_TEXT: 'attempting plain text extraction',
} as const;

// Types
export interface ProcessedText {
  content: string;
  chunks: string[];
  wordCount: number;
  topics: string[];
}

interface PDFPage {
  Texts?: PDFTextBlock[];
}

interface PDFTextBlock {
  R?: PDFTextRun[];
}

interface PDFTextRun {
  T?: string;
}

interface PDFData {
  Pages?: PDFPage[];
}

interface ChunkingOptions {
  maxChunkSize?: number;
  minChunkLength?: number;
}

interface TopicExtractionOptions {
  minWordLength?: number;
  maxTopics?: number;
}

type SupportedMimeType = typeof SUPPORTED_MIME_TYPES[keyof typeof SUPPORTED_MIME_TYPES];

// Helper Functions
function createPDFError(message: string, originalError?: any): Error {
  const errorMessage = originalError instanceof Error 
    ? originalError.message 
    : String(originalError);
  return new Error(`${message}: ${errorMessage}`);
}

function decodeAndExtractText(textRun: PDFTextRun): string {
  if (!textRun.T) return '';
  
  try {
    return decodeURIComponent(textRun.T) + ' ';
  } catch {
    // Fallback for malformed URI components
    return textRun.T + ' ';
  }
}

function extractPageText(page: PDFPage, pageIndex: number): string {
  if (!page.Texts || !Array.isArray(page.Texts)) {
    return '';
  }

  let pageText = '';
  
  for (const textBlock of page.Texts) {
    if (!textBlock.R || !Array.isArray(textBlock.R)) continue;
    
    for (const textRun of textBlock.R) {
      pageText += decodeAndExtractText(textRun);
    }
  }

  return pageText.trim() 
    ? `Page ${pageIndex + 1}:\n${pageText.trim()}\n\n`
    : '';
}

function processPDFData(pdfData: PDFData): string {
  if (!pdfData.Pages || !Array.isArray(pdfData.Pages)) {
    return TEXT_PROCESSING_CONFIG.PDF_PROCESSING.FALLBACK_MESSAGE;
  }

  let extractedText = '';
  
  for (let i = 0; i < pdfData.Pages.length; i++) {
    extractedText += extractPageText(pdfData.Pages[i], i);
  }

  return extractedText.trim() || TEXT_PROCESSING_CONFIG.PDF_PROCESSING.FALLBACK_MESSAGE;
}

function setupPDFParser(): Promise<any> {
  return new Promise((resolve, reject) => {
    try {
      const PDFParser = require('pdf2json');
      const pdfParser = new PDFParser();
      
      // Just return the parser instance, don't set up event handlers here
      resolve(pdfParser);
    } catch (error) {
      console.error(LOG_MESSAGES.PDF_EXTRACTION_SETUP_ERROR, error);
      reject(createPDFError(ERROR_MESSAGES.PDF_EXTRACTION_FAILED, error));
    }
  });
}

// Core Functions
async function extractPDFText(fileBuffer: Buffer): Promise<string> {
  const pdfParser = await setupPDFParser();
  
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error('PDF parsing timeout'));
    }, 30000); // 30 second timeout

    pdfParser.on('pdfParser_dataReady', (pdfData: PDFData) => {
      clearTimeout(timeoutId);
      try {
        console.log(`${LOG_MESSAGES.PDF_PARSED_SUCCESS} ${pdfData.Pages?.length || 0}`);
        const extractedText = processPDFData(pdfData);
        console.log(`${LOG_MESSAGES.TEXT_LENGTH} ${extractedText.length} ${LOG_MESSAGES.TEXT_CHARACTERS}`);
        resolve(extractedText);
      } catch (processingError) {
        console.error(LOG_MESSAGES.PDF_PROCESSING_ERROR, processingError);
        reject(createPDFError(ERROR_MESSAGES.PDF_PROCESSING_FAILED, processingError));
      }
    });

    pdfParser.on('pdfParser_dataError', (error: any) => {
      clearTimeout(timeoutId);
      reject(error);
    });

    try {
      pdfParser.parseBuffer(fileBuffer);
    } catch (error) {
      clearTimeout(timeoutId);
      reject(createPDFError(ERROR_MESSAGES.PDF_EXTRACTION_FAILED, error));
    }
  });
}

async function extractDOCXText(fileBuffer: Buffer): Promise<string> {
  try {
    const result = await mammoth.extractRawText({ buffer: fileBuffer });
    return result.value;
  } catch (error) {
    throw new Error(`DOCX extraction failed: ${error instanceof Error ? error.message : ERROR_MESSAGES.UNKNOWN_ERROR}`);
  }
}

function extractPlainText(fileBuffer: Buffer): string {
  try {
    return fileBuffer.toString(TEXT_PROCESSING_CONFIG.PDF_PROCESSING.ENCODING);
  } catch (error) {
    throw new Error(`Plain text extraction failed: ${error instanceof Error ? error.message : ERROR_MESSAGES.UNKNOWN_ERROR}`);
  }
}

export async function extractTextFromFile(fileBuffer: Buffer, mimeType: string): Promise<string> {
  try {
    const normalizedMimeType = mimeType.toLowerCase().trim() as SupportedMimeType;

    switch (normalizedMimeType) {
      case SUPPORTED_MIME_TYPES.PDF:
        return await extractPDFText(fileBuffer);
      
      case SUPPORTED_MIME_TYPES.DOCX:
        return await extractDOCXText(fileBuffer);
      
      case SUPPORTED_MIME_TYPES.TEXT:
        return extractPlainText(fileBuffer);
      
      default:
        console.warn(`${LOG_MESSAGES.UNSUPPORTED_MIME_WARNING} ${mimeType}, ${LOG_MESSAGES.ATTEMPTING_PLAIN_TEXT}`);
        return extractPlainText(fileBuffer);
    }
  } catch (error) {
    console.error(LOG_MESSAGES.TEXT_EXTRACTION_ERROR, error);
    const errorMessage = error instanceof Error ? error.message : ERROR_MESSAGES.UNKNOWN_ERROR;
    throw new Error(`${ERROR_MESSAGES.TEXT_EXTRACTION_FAILED}: ${mimeType} - ${errorMessage}`);
  }
}

function splitTextIntoParagraphs(text: string): string[] {
  return text
    .split('\n\n')
    .map(p => p.trim())
    .filter(p => p.length > 0);
}

function shouldStartNewChunk(currentChunk: string, paragraph: string, maxChunkSize: number): boolean {
  return (currentChunk + paragraph).length > maxChunkSize && currentChunk.length > 0;
}

function combineTextSegments(currentChunk: string, paragraph: string): string {
  return currentChunk + (currentChunk ? '\n\n' : '') + paragraph;
}

export function chunkText(text: string, options: ChunkingOptions = {}): string[] {
  const {
    maxChunkSize = TEXT_PROCESSING_CONFIG.CHUNK_SIZE.DEFAULT,
    minChunkLength = TEXT_PROCESSING_CONFIG.CHUNK_SIZE.MIN_LENGTH
  } = options;

  // Safety check: ensure text is a string
  if (typeof text !== 'string') {
    console.error('chunkText received non-string input:', typeof text, text);
    return [];
  }

  if (!text.trim()) return [];

  const paragraphs = splitTextIntoParagraphs(text);
  const chunks: string[] = [];
  let currentChunk = '';

  for (const paragraph of paragraphs) {
    if (shouldStartNewChunk(currentChunk, paragraph, maxChunkSize)) {
      chunks.push(currentChunk.trim());
      currentChunk = paragraph;
    } else {
      currentChunk = combineTextSegments(currentChunk, paragraph);
    }
  }

  if (currentChunk.trim().length > 0) {
    chunks.push(currentChunk.trim());
  }

  // Filter out chunks that are too short
  return chunks.filter(chunk => chunk.length >= minChunkLength);
}

function extractWordsFromText(text: string, minWordLength: number): string[] {
  const pattern = new RegExp(`\\b\\w{${minWordLength},}\\b`, 'g');
  return text.toLowerCase().match(pattern) || [];
}

function countWordFrequencies(words: string[]): Record<string, number> {
  return words.reduce((wordCount, word) => {
    wordCount[word] = (wordCount[word] || 0) + 1;
    return wordCount;
  }, {} as Record<string, number>);
}

function getTopFrequentWords(wordCount: Record<string, number>, maxTopics: number): string[] {
  return Object.entries(wordCount)
    .sort(([, a], [, b]) => b - a)
    .slice(0, maxTopics)
    .map(([word]) => word);
}

export function extractTopics(text: string, options: TopicExtractionOptions = {}): string[] {
  const {
    minWordLength = TEXT_PROCESSING_CONFIG.TOPIC_EXTRACTION.MIN_WORD_LENGTH,
    maxTopics = TEXT_PROCESSING_CONFIG.TOPIC_EXTRACTION.MAX_TOPICS
  } = options;

  // Safety check: ensure text is a string
  if (typeof text !== 'string') {
    console.error('extractTopics received non-string input:', typeof text, text);
    return [];
  }

  if (!text.trim()) return [];

  const words = extractWordsFromText(text, minWordLength);
  const wordCount = countWordFrequencies(words);
  return getTopFrequentWords(wordCount, maxTopics);
}

function calculateWordCount(text: string): number {
  // Safety check: ensure text is a string
  if (typeof text !== 'string') {
    console.error('calculateWordCount received non-string input:', typeof text, text);
    return 0;
  }
  
  if (!text.trim()) return 0;
  return text.trim().split(/\s+/).length;
}

export async function processTextFile(
  fileBuffer: Buffer, 
  mimeType: string,
  options: {
    chunking?: ChunkingOptions;
    topicExtraction?: TopicExtractionOptions;
  } = {}
): Promise<ProcessedText> {
  try {
    const content = await extractTextFromFile(fileBuffer, mimeType);
    
    const [chunks, topics, wordCount] = await Promise.all([
      Promise.resolve(chunkText(content, options.chunking)),
      Promise.resolve(extractTopics(content, options.topicExtraction)),
      Promise.resolve(calculateWordCount(content))
    ]);

    return {
      content,
      chunks,
      wordCount,
      topics
    };
  } catch (error) {
    console.error(LOG_MESSAGES.PROCESSING_ERROR, error);
    throw error;
  }
} 