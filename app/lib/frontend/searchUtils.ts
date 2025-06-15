export function highlightSearchTerm(text: string, searchTerm: string): string {
  if (!searchTerm || !searchTerm.trim()) {
    return text;
  }
  
  const regex = new RegExp(`(${searchTerm.trim()})`, 'gi');
  return text.replace(regex, '<mark class="bg-yellow-200 px-1 rounded">$1</mark>');
}

export function createHighlightedElement(text: string, searchTerm: string) {
  const highlightedText = highlightSearchTerm(text, searchTerm);
  return { __html: highlightedText };
} 