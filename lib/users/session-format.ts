const BROWSER_PATTERNS: { label: string; pattern: RegExp }[] = [
  { label: "Edge", pattern: /Edg\// },
  { label: "Chrome", pattern: /Chrome\// },
  { label: "Firefox", pattern: /Firefox\// },
  { label: "Safari", pattern: /Safari\// },
  { label: "Opera", pattern: /OPR\// },
]

const PLATFORM_PATTERNS: { label: string; pattern: RegExp }[] = [
  { label: "Windows", pattern: /Windows/ },
  // iOS must precede macOS: its UA says "like Mac OS X".
  { label: "iOS", pattern: /iPhone|iPad|iPod/ },
  { label: "macOS", pattern: /Mac OS X|Macintosh/ },
  { label: "Android", pattern: /Android/ },
  { label: "Linux", pattern: /Linux/ },
]

/**
 * A short human-readable description of a user agent, when one can be
 * guessed: "Chrome · Windows", "Safari · iOS", or just "Chrome".
 *
 * Edge must be checked before Chrome — its UA string contains both.
 * Safari must be checked after Chrome and Firefox for the same reason.
 */
export function describeUserAgent(userAgent: string | null): string | null {
  if (!userAgent) {
    return null
  }

  const browser = BROWSER_PATTERNS.find((entry) =>
    entry.pattern.test(userAgent)
  )?.label
  const platform = PLATFORM_PATTERNS.find((entry) =>
    entry.pattern.test(userAgent)
  )?.label

  if (!browser && !platform) {
    return null
  }

  return [browser, platform].filter(Boolean).join(" · ")
}
