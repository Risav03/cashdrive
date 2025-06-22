import { PDFDocument, rgb, StandardFonts, PDFFont, PDFPage } from 'pdf-lib';

// Constants
const PAGE_DIMENSIONS = {
  A4_WIDTH: 595.28,
  A4_HEIGHT: 841.89,
  MARGIN: 50,
} as const;

const FONT_SIZES = {
  TITLE: 20,
  HEADER_BASE: 14,
  HEADER_INCREMENT: 4,
  CONTENT: 12,
  METADATA: 10,
  PAGE_NUMBER: 8,
} as const;

const SPACING = {
  LINE_HEIGHT: 1.4,
  TITLE_BOTTOM: 20,
  METADATA_LINE: 2,
  METADATA_BOTTOM: 20,
  HEADER_TOP: 10,
  HEADER_BOTTOM: 10,
  PARAGRAPH_BOTTOM: 12,
  PAGE_NUMBER_OFFSET: 20,
} as const;

const COLORS = {
  BLACK: rgb(0, 0, 0),
  GRAY: rgb(0.4, 0.4, 0.4),
  LIGHT_GRAY: rgb(0.5, 0.5, 0.5),
} as const;

const DEFAULTS = {
  AUTHOR: 'AI Assistant',
  FONT_SIZE: 12,
  LINE_HEIGHT: 1.4,
  CREATOR: 'AI Content Generator',
  PRODUCER: 'Cash Drive Platform',
} as const;

const PRICING = {
  WORDS_PER_DOLLAR: 500,
  MINIMUM_PRICE: 1,
} as const;

const TEXT_PROCESSING = {
  PRINTABLE_CHARS: /[^\x20-\x7E\u00A0-\u00FF]/g,
  NON_ASCII: /[^\x20-\x7E]/g,
} as const;



const LOG_MESSAGES = {
  PDF_ENCODING_ERROR: 'PDF encoding error for word:',
  SKIPPING_PROBLEMATIC_WORD: 'Skipping problematic word:',
} as const;

// Types
export interface PDFOptions {
  title: string;
  content: string;
  author?: string;
  fontSize?: number;
  lineHeight?: number;
}

interface PDFContext {
  document: PDFDocument;
  currentPage: PDFPage;
  yPosition: number;
  fonts: {
    regular: PDFFont;
    bold: PDFFont;
  };
  dimensions: {
    pageWidth: number;
    pageHeight: number;
    margin: number;
    maxWidth: number;
  };
  options: Required<PDFOptions>;
}

interface TextRenderOptions {
  font: PDFFont;
  fontSize: number;
  color: typeof COLORS[keyof typeof COLORS];
  spacing?: number;
}

// Helper functions
const calculateMaxWidth = (): number => 
  PAGE_DIMENSIONS.A4_WIDTH - (PAGE_DIMENSIONS.MARGIN * 2);

const calculateHeaderFontSize = (headerLevel: number, baseFontSize: number): number => 
  Math.max(FONT_SIZES.HEADER_BASE, baseFontSize + (FONT_SIZES.HEADER_INCREMENT - headerLevel));

const calculateWordCount = (content: string): number => 
  content.split(/\s+/).length;

const cleanTextForPDF = (text: string): string => 
  text.replace(TEXT_PROCESSING.PRINTABLE_CHARS, '').trim();

const cleanWordForPDF = (word: string): string => 
  word.replace(TEXT_PROCESSING.NON_ASCII, '');

const extractHeaderLevel = (paragraph: string): number => 
  (paragraph.match(/^#+/) || [''])[0].length;

const extractHeaderText = (paragraph: string): string => 
  paragraph.replace(/^#+\s*/, '');

const isHeader = (paragraph: string): boolean => 
  paragraph.startsWith('#');

const isHeading = (line: string): boolean => /^#{1,3}\s/.test(line.trim());

const getHeadingLevel = (line: string): number => {
  const match = line.match(/^(#{1,3})\s/);
  return match ? match[1].length : 0;
};

const stripMarkdown = (text: string): string => text.replace(/^#{1,3}\s/, '').trim();



// PDF setup functions
async function createPDFDocument(options: Required<PDFOptions>): Promise<PDFDocument> {
  const pdfDoc = await PDFDocument.create();
  
  pdfDoc.setTitle(options.title);
  pdfDoc.setAuthor(options.author);
  pdfDoc.setCreator(DEFAULTS.CREATOR);
  pdfDoc.setProducer(DEFAULTS.PRODUCER);
  pdfDoc.setCreationDate(new Date());
  
  return pdfDoc;
}

async function embedFonts(pdfDoc: PDFDocument): Promise<{ regular: PDFFont; bold: PDFFont }> {
  const [regular, bold] = await Promise.all([
    pdfDoc.embedFont(StandardFonts.Helvetica),
    pdfDoc.embedFont(StandardFonts.HelveticaBold)
  ]);
  
  return { regular, bold };
}

function createInitialPage(pdfDoc: PDFDocument): PDFPage {
  return pdfDoc.addPage([PAGE_DIMENSIONS.A4_WIDTH, PAGE_DIMENSIONS.A4_HEIGHT]);
}

function createPDFContext(
  pdfDoc: PDFDocument, 
  fonts: { regular: PDFFont; bold: PDFFont }, 
  options: Required<PDFOptions>
): PDFContext {
  return {
    document: pdfDoc,
    currentPage: createInitialPage(pdfDoc),
    yPosition: PAGE_DIMENSIONS.A4_HEIGHT - PAGE_DIMENSIONS.MARGIN,
    fonts,
    dimensions: {
      pageWidth: PAGE_DIMENSIONS.A4_WIDTH,
      pageHeight: PAGE_DIMENSIONS.A4_HEIGHT,
      margin: PAGE_DIMENSIONS.MARGIN,
      maxWidth: calculateMaxWidth(),
    },
    options,
  };
}

// Text wrapping functions
function wrapTextLine(
  line: string, 
  font: PDFFont, 
  fontSize: number, 
  maxWidth: number
): string[] {
  if (line.trim() === '') return [''];

  const cleanLine = cleanTextForPDF(line);
  if (!cleanLine) return [''];

  const words = cleanLine.split(' ');
  const outputLines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    
    try {
      const testWidth = font.widthOfTextAtSize(testLine, fontSize);
      
      if (testWidth <= maxWidth) {
        currentLine = testLine;
      } else {
        if (currentLine) {
          outputLines.push(currentLine);
          currentLine = word;
        } else {
          outputLines.push(word);
        }
      }
    } catch (error) {
      console.warn(LOG_MESSAGES.PDF_ENCODING_ERROR, word, error);
      handleWordEncodingError(word, currentLine, outputLines, font, fontSize, maxWidth);
    }
  }
  
  if (currentLine) {
    outputLines.push(currentLine);
  }
  
  return outputLines;
}

function handleWordEncodingError(
  word: string,
  currentLine: string,
  outputLines: string[],
  font: PDFFont,
  fontSize: number,
  maxWidth: number
): void {
  const cleanWord = cleanWordForPDF(word);
  if (!cleanWord) return;

  const testCleanLine = currentLine ? `${currentLine} ${cleanWord}` : cleanWord;
  
  try {
    const testWidth = font.widthOfTextAtSize(testCleanLine, fontSize);
    if (testWidth <= maxWidth) {
      // This would need to update currentLine in the calling function
      // For now, just push the clean word
      outputLines.push(cleanWord);
    } else {
      if (currentLine) {
        outputLines.push(currentLine);
      }
      outputLines.push(cleanWord);
    }
  } catch (cleanError) {
            console.warn(LOG_MESSAGES.SKIPPING_PROBLEMATIC_WORD, word);
  }
}

function wrapText(
  text: string, 
  font: PDFFont, 
  fontSize: number, 
  maxWidth: number
): string[] {
  const inputLines = text.split('\n');
  const outputLines: string[] = [];

  for (const inputLine of inputLines) {
    const wrappedLines = wrapTextLine(inputLine, font, fontSize, maxWidth);
    outputLines.push(...wrappedLines);
  }
  
  return outputLines;
}

// Page management functions
function addNewPage(context: PDFContext): void {
  context.currentPage = createInitialPage(context.document);
  context.yPosition = context.dimensions.pageHeight - context.dimensions.margin;
}

function checkPageBreak(context: PDFContext, requiredHeight: number): void {
  if (context.yPosition - requiredHeight < context.dimensions.margin) {
    addNewPage(context);
  }
}

// Text rendering functions
function renderTextLines(
  context: PDFContext,
  lines: string[],
  renderOptions: TextRenderOptions
): void {
  const { font, fontSize, color } = renderOptions;
  const lineHeight = fontSize * context.options.lineHeight;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim()) {
      context.currentPage.drawText(line, {
        x: context.dimensions.margin,
        y: context.yPosition - (i * lineHeight),
        size: fontSize,
        font,
        color,
      });
    }
  }
}

function renderTitle(context: PDFContext): void {
  const titleLines = wrapText(
    context.options.title, 
    context.fonts.bold, 
    FONT_SIZES.TITLE, 
    context.dimensions.maxWidth
  );
  
  const titleHeight = titleLines.length * FONT_SIZES.TITLE * context.options.lineHeight;
  checkPageBreak(context, titleHeight + SPACING.TITLE_BOTTOM);
  
  renderTextLines(context, titleLines, {
    font: context.fonts.bold,
    fontSize: FONT_SIZES.TITLE,
    color: COLORS.BLACK,
  });
  
  context.yPosition -= titleHeight + SPACING.TITLE_BOTTOM;
}

function renderMetadata(context: PDFContext): void {
  const metaText = [
    `Generated by: ${context.options.author}`,
    `Date: ${new Date().toLocaleDateString()}`,
    `Generated with AI Content Creator`
  ];

  const lineHeight = FONT_SIZES.METADATA * context.options.lineHeight;

  for (const meta of metaText) {
    checkPageBreak(context, lineHeight);
    
    context.currentPage.drawText(meta, {
      x: context.dimensions.margin,
      y: context.yPosition,
      size: FONT_SIZES.METADATA,
      font: context.fonts.regular,
      color: COLORS.GRAY,
    });
    
    context.yPosition -= lineHeight + SPACING.METADATA_LINE;
  }

  context.yPosition -= SPACING.METADATA_BOTTOM;
}

function renderHeader(context: PDFContext, paragraph: string): void {
  const headerLevel = extractHeaderLevel(paragraph);
  const headerText = extractHeaderText(paragraph);
  const headerFontSize = calculateHeaderFontSize(headerLevel, context.options.fontSize);
  
  const headerLines = wrapText(
    headerText, 
    context.fonts.bold, 
    headerFontSize, 
    context.dimensions.maxWidth
  );
  
  const headerHeight = headerLines.length * headerFontSize * context.options.lineHeight;
  checkPageBreak(context, headerHeight + SPACING.HEADER_TOP + SPACING.HEADER_BOTTOM);
  
  context.yPosition -= SPACING.HEADER_TOP;
  
  renderTextLines(context, headerLines, {
    font: context.fonts.bold,
    fontSize: headerFontSize,
    color: COLORS.BLACK,
  });
  
  context.yPosition -= headerHeight + SPACING.HEADER_BOTTOM;
}

function renderParagraph(context: PDFContext, paragraph: string): void {
  const paragraphLines = wrapText(
    paragraph, 
    context.fonts.regular, 
    context.options.fontSize, 
    context.dimensions.maxWidth
  );
  
  const paragraphHeight = paragraphLines.length * context.options.fontSize * context.options.lineHeight;
  checkPageBreak(context, paragraphHeight + SPACING.PARAGRAPH_BOTTOM);
  
  renderTextLines(context, paragraphLines, {
    font: context.fonts.regular,
    fontSize: context.options.fontSize,
    color: COLORS.BLACK,
  });
  
  context.yPosition -= paragraphHeight + SPACING.PARAGRAPH_BOTTOM;
}

function renderContent(context: PDFContext): void {
  const paragraphs = context.options.content.split('\n\n');

  for (const paragraph of paragraphs) {
    if (paragraph.trim()) {
      if (isHeader(paragraph)) {
        renderHeader(context, paragraph);
      } else {
        renderParagraph(context, paragraph);
      }
    }
  }
}

function addPageNumbers(context: PDFContext): void {
  const pages = context.document.getPages();
  const totalPages = pages.length;
  
  for (let i = 0; i < totalPages; i++) {
    const page = pages[i];
    const pageNumber = `Page ${i + 1} of ${totalPages}`;
    const pageNumberWidth = context.fonts.regular.widthOfTextAtSize(pageNumber, FONT_SIZES.PAGE_NUMBER);
    
    page.drawText(pageNumber, {
      x: context.dimensions.pageWidth - context.dimensions.margin - pageNumberWidth,
      y: context.dimensions.margin - SPACING.PAGE_NUMBER_OFFSET,
      size: FONT_SIZES.PAGE_NUMBER,
      font: context.fonts.regular,
      color: COLORS.LIGHT_GRAY,
    });
  }
}

// Main functions
export async function generatePDF(options: PDFOptions): Promise<Buffer> {
  const normalizedOptions: Required<PDFOptions> = {
    title: options.title,
    content: options.content,
    author: options.author || DEFAULTS.AUTHOR,
    fontSize: options.fontSize || DEFAULTS.FONT_SIZE,
    lineHeight: options.lineHeight || DEFAULTS.LINE_HEIGHT,
  };

  const pdfDoc = await createPDFDocument(normalizedOptions);
  const fonts = await embedFonts(pdfDoc);
  const context = createPDFContext(pdfDoc, fonts, normalizedOptions);

  // Render PDF content
  renderTitle(context);
  renderMetadata(context);
  renderContent(context);
  addPageNumbers(context);

  // Generate PDF buffer
  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

export function calculateEstimatedPrice(content: string): number {
  const wordCount = calculateWordCount(content);
  const basePrice = Math.max(
    PRICING.MINIMUM_PRICE, 
    Math.ceil(wordCount / PRICING.WORDS_PER_DOLLAR)
  );
  return basePrice;
} 