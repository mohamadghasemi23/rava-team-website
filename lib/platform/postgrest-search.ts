const SAFE_SEARCH_CHARS = /[^\p{L}\p{N} _.:@+\-]/gu

export function sanitizePostgrestSearchTerm(value: string, maxLength = 120) {
  return value
    .normalize('NFKC')
    .replace(SAFE_SEARCH_CHARS, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength)
}

export function oneOf<T extends string>(value: string, allowed: readonly T[]): T | '' {
  return (allowed as readonly string[]).includes(value) ? value as T : ''
}
