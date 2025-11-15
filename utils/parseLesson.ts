/**
 * Clean and format lesson text for better processing
 */
export function cleanLessonText(text: string): string {
  return text
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .replace(/\n\s*\n/g, '\n\n') // Normalize paragraph breaks
    .replace(/[^\S\n]+/g, ' ') // Remove extra whitespace but keep newlines
    .trim();
}

/**
 * Validate lesson text length
 */
export function validateLessonText(text: string): { isValid: boolean; error?: string } {
  if (!text || text.trim().length === 0) {
    return { isValid: false, error: 'Text is empty' };
  }

  if (text.length < 50) {
    return { isValid: false, error: 'Text is too short (minimum 50 characters)' };
  }

  return { isValid: true };
}

/**
 * Extract a summary of the lesson text
 */
export function extractSummary(text: string, maxLength: number = 200): string {
  const cleaned = cleanLessonText(text);
  if (cleaned.length <= maxLength) {
    return cleaned;
  }
  return cleaned.substring(0, maxLength) + '...';
}

/**
 * Count words in text
 */
export function countWords(text: string): number {
  return text.trim().split(/\s+/).length;
}

/**
 * Estimate reading time in minutes
 */
export function estimateReadingTime(text: string): number {
  const wordsPerMinute = 200;
  const wordCount = countWords(text);
  return Math.ceil(wordCount / wordsPerMinute);
}
