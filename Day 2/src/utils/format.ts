/**
 * Format Utilities
 * Common formatting functions for query strings, dates, text, and data
 */

// ============================================================================
// QUERY STRING HELPERS
// ============================================================================

/**
 * Parse query string from URL into an object
 * @param queryString - Query string (with or without ?)
 * @returns Object with parsed key-value pairs
 */
export function parseQueryString(queryString: string): Record<string, string> {
  if (!queryString) return {};

  const cleaned = queryString.startsWith('?') ? queryString.slice(1) : queryString;
  const params = new URLSearchParams(cleaned);
  const result: Record<string, string> = {};

  params.forEach((value, key) => {
    result[key] = value;
  });

  return result;
}

/**
 * Convert object to query string
 * @param params - Object with parameters
 * @returns Query string (without ?)
 */
export function stringifyQueryString(params: Record<string, any>): string {
  return Object.entries(params)
    .filter(([, value]) => value !== null && value !== undefined)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join('&');
}

/**
 * Build complete URL with query parameters
 * @param baseUrl - Base URL
 * @param params - Query parameters
 * @returns Complete URL with query string
 */
export function buildUrl(baseUrl: string, params: Record<string, any>): string {
  const queryString = stringifyQueryString(params);
  return queryString ? `${baseUrl}?${queryString}` : baseUrl;
}

// ============================================================================
// TEXT FORMATTING
// ============================================================================

/**
 * Format enum-like strings to readable text
 * Converts "pending-review" to "Pending Review"
 * @param text - Text to format
 * @returns Formatted text
 */
export function formatEnumValue(text: string): string {
  return text
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Convert camelCase to Title Case
 * @param text - camelCase text
 * @returns Title Case text
 */
export function camelToTitleCase(text: string): string {
  return text
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim();
}

/**
 * Convert text to kebab-case
 * @param text - Text to convert
 * @returns kebab-case text
 */
export function toKebabCase(text: string): string {
  return text
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/\s+/g, '-')
    .toLowerCase();
}

/**
 * Truncate text with ellipsis
 * @param text - Text to truncate
 * @param maxLength - Maximum length
 * @param ellipsis - Ellipsis string (default: "...")
 * @returns Truncated text
 */
export function truncateText(text: string, maxLength: number, ellipsis = '...'): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - ellipsis.length) + ellipsis;
}

// ============================================================================
// NUMBER FORMATTING
// ============================================================================

/**
 * Format number with thousands separator
 * @param value - Number to format
 * @param locale - Locale string (default: 'en-US')
 * @returns Formatted number string
 */
export function formatNumber(value: number, locale = 'en-US'): string {
  return new Intl.NumberFormat(locale).format(value);
}

/**
 * Format bytes to human readable size
 * @param bytes - Number of bytes
 * @param decimals - Decimal places (default: 2)
 * @returns Formatted size string
 */
export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * Math.pow(10, dm)) / Math.pow(10, dm) + ' ' + sizes[i];
}

/**
 * Format percentage
 * @param value - Decimal value (0-1)
 * @param decimals - Decimal places (default: 1)
 * @returns Formatted percentage string
 */
export function formatPercentage(value: number, decimals = 1): string {
  return (value * 100).toFixed(decimals) + '%';
}

// ============================================================================
// JSON/DATA FORMATTING
// ============================================================================

/**
 * Pretty print JSON
 * @param data - Data to format
 * @param spaces - Number of spaces for indentation (default: 2)
 * @returns Formatted JSON string
 */
export function formatJSON(data: any, spaces = 2): string {
  try {
    return JSON.stringify(data, null, spaces);
  } catch (error) {
    return '[Invalid JSON]';
  }
}

/**
 * Safe JSON parse with fallback
 * @param jsonString - JSON string to parse
 * @param fallback - Fallback value if parse fails
 * @returns Parsed object or fallback
 */
export function safeJSONParse<T>(jsonString: string, fallback: T): T {
  try {
    return JSON.parse(jsonString);
  } catch {
    return fallback;
  }
}

/**
 * Flatten nested object keys
 * @param obj - Object to flatten
 * @param prefix - Key prefix (internal use)
 * @returns Flattened object
 */
export function flattenObject(obj: any, prefix = ''): Record<string, any> {
  const result: Record<string, any> = {};

  Object.entries(obj).forEach(([key, value]) => {
    const newKey = prefix ? `${prefix}.${key}` : key;

    if (value && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(result, flattenObject(value, newKey));
    } else {
      result[newKey] = value;
    }
  });

  return result;
}

// ============================================================================
// RECORD/ARRAY FORMATTING
// ============================================================================

/**
 * Group array by property
 * @param array - Array to group
 * @param key - Property to group by
 * @returns Grouped object
 */
export function groupBy<T>(array: T[], key: keyof T): Record<string, T[]> {
  return array.reduce(
    (result, item) => {
      const groupKey = String(item[key]);
      if (!result[groupKey]) {
        result[groupKey] = [];
      }
      result[groupKey].push(item);
      return result;
    },
    {} as Record<string, T[]>,
  );
}

/**
 * Count occurrences in array
 * @param array - Array to count
 * @param key - Property to count by
 * @returns Count object
 */
export function countBy<T>(array: T[], key: keyof T): Record<string, number> {
  return array.reduce(
    (result, item) => {
      const countKey = String(item[key]);
      result[countKey] = (result[countKey] || 0) + 1;
      return result;
    },
    {} as Record<string, number>,
  );
}

/**
 * Remove duplicates from array
 * @param array - Array to deduplicate
 * @param key - Optional property to check for uniqueness
 * @returns Array with duplicates removed
 */
export function unique<T>(array: T[], key?: keyof T): T[] {
  if (!key) {
    return [...new Set(array)];
  }

  const seen = new Set();
  return array.filter(item => {
    const value = item[key];
    if (seen.has(value)) {
      return false;
    }
    seen.add(value);
    return true;
  });
}

// ============================================================================
// VALIDATION FORMATTING
// ============================================================================

/**
 * Validate and format email
 * @param email - Email to validate and format
 * @returns Formatted email or null if invalid
 */
export function formatEmail(email: string): string | null {
  const trimmed = email.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  return emailRegex.test(trimmed) ? trimmed : null;
}

/**
 * Validate URL
 * @param url - URL to validate
 * @returns true if valid, false otherwise
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Format phone number (simple)
 * @param phone - Phone number (digits only)
 * @returns Formatted phone number
 */
export function formatPhoneNumber(phone: string): string {
  const digits = phone.replace(/\D/g, '');

  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  if (digits.length === 11) {
    return `+${digits.slice(0, 1)} (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }

  return phone;
}

// ============================================================================
// EXPORTS FOR EASY ACCESS
// ============================================================================

export default {
  // Query String
  parseQueryString,
  stringifyQueryString,
  buildUrl,

  // Text
  formatEnumValue,
  camelToTitleCase,
  toKebabCase,
  truncateText,

  // Numbers
  formatNumber,
  formatBytes,
  formatPercentage,

  // JSON/Data
  formatJSON,
  safeJSONParse,
  flattenObject,

  // Records/Arrays
  groupBy,
  countBy,
  unique,

  // Validation
  formatEmail,
  isValidUrl,
  formatPhoneNumber,
};
