import mammoth from 'mammoth';

export interface ProcessedText {
  content: string;
  chunks: string[];
  wordCount: number;
  topics: string[];
}

async function extractPDFText(fileBuffer: Buffer): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      // Import pdf2json
      const PDFParser = require('pdf2json');
      
      // Create a new PDF parser instance
      const pdfParser = new PDFParser();
      
      // Set up event handlers
      pdfParser.on('pdfParser_dataError', (errData: any) => {
        console.error('PDF parsing error:', errData.parserError);
        reject(new Error(`PDF parsing failed: ${errData.parserError}`));
      });
      
      pdfParser.on('pdfParser_dataReady', (pdfData: any) => {
        try {
          console.log(`PDF parsed successfully. Pages: ${pdfData.Pages?.length || 0}`);
          
          // Extract text from all pages
          let extractedText = '';
          
          if (pdfData.Pages && Array.isArray(pdfData.Pages)) {
            pdfData.Pages.forEach((page: any, pageIndex: number) => {
              if (page.Texts && Array.isArray(page.Texts)) {
                let pageText = '';
                page.Texts.forEach((textBlock: any) => {
                  if (textBlock.R && Array.isArray(textBlock.R)) {
                    textBlock.R.forEach((textRun: any) => {
                      if (textRun.T) {
                        // Decode URI component to handle special characters
                        const decodedText = decodeURIComponent(textRun.T);
                        pageText += decodedText + ' ';
                      }
                    });
                  }
                });
                
                if (pageText.trim()) {
                  extractedText += `Page ${pageIndex + 1}:\n${pageText.trim()}\n\n`;
                }
              }
            });
          }
          
          if (extractedText.trim()) {
            console.log(`Total extracted text length: ${extractedText.length} characters`);
            resolve(extractedText.trim());
          } else {
            console.log('No text content found in PDF');
            resolve(`[PDF Document] This PDF was successfully parsed but contains no extractable text. It may be an image-based PDF or contain only graphics and forms. The document is available for download and manual review.`);
          }
          
        } catch (processingError) {
          console.error('Error processing PDF data:', processingError);
          reject(new Error(`Failed to process PDF content: ${processingError instanceof Error ? processingError.message : 'Unknown error'}`));
        }
      });
      
      // Parse the PDF buffer
      pdfParser.parseBuffer(fileBuffer);
      
    } catch (error) {
      console.error('PDF extraction setup error:', error);
      reject(new Error(`PDF extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`));
    }
  });
}

export async function extractTextFromFile(fileBuffer: Buffer, mimeType: string): Promise<string> {
  try {
    switch (mimeType) {
      case 'application/pdf':
        return await extractPDFText(fileBuffer);
      
      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        const docxResult = await mammoth.extractRawText({ buffer: fileBuffer });
        return docxResult.value;
      
      case 'text/plain':
        return fileBuffer.toString('utf-8');
      
      default:
        // Try to parse as text for other formats
        return fileBuffer.toString('utf-8');
    }
  } catch (error) {
    console.error('Error extracting text:', error);
    throw new Error(`Failed to extract text from file type: ${mimeType}`);
  }
}

export function chunkText(text: string, maxChunkSize: number = 1000): string[] {
  // Split by paragraphs first
  const paragraphs = text.split('\n\n').filter(p => p.trim().length > 0);
  const chunks: string[] = [];
  let currentChunk = '';

  for (const paragraph of paragraphs) {
    if ((currentChunk + paragraph).length > maxChunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      currentChunk = paragraph;
    } else {
      currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
    }
  }

  if (currentChunk.trim().length > 0) {
    chunks.push(currentChunk.trim());
  }

  // Filter out very short chunks
  return chunks.filter(chunk => chunk.length > 50);
}

export function extractTopics(text: string): string[] {
  // Simple topic extraction - can be enhanced later
  const words = text.toLowerCase().match(/\b\w{4,}\b/g) || [];
  const wordCount: { [key: string]: number } = {};
  
  words.forEach(word => {
    wordCount[word] = (wordCount[word] || 0) + 1;
  });

  // Get most frequent words as topics
  const topics = Object.entries(wordCount)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)
    .map(([word]) => word);

  return topics;
}

export async function processTextFile(fileBuffer: Buffer, mimeType: string): Promise<ProcessedText> {
  const content = await extractTextFromFile(fileBuffer, mimeType);
  const chunks = chunkText(content);
  const wordCount = content.split(/\s+/).length;
  const topics = extractTopics(content);

  return {
    content,
    chunks,
    wordCount,
    topics
  };
} 