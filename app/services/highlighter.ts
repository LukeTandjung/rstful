import { useMemo } from "react"

// Highlighter colors from Kanagawa palette
const HIGHLIGHTERS = [
  "#E6C384", // carpYellow
  "#D27E99", // sakuraPink
  "#A3D4D5", // lightBlue
  "#938AA9", // springViolet1
  "#7AA89F", // waveAqua2
  "#7FB4CA", // springBlue
]

// Text color options for WCAG contrast
const LIGHT_TEXT = "#f2eede" // default background
const DARK_TEXT = "#555555" // default text

function parseHex(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!result) return { r: 0, g: 0, b: 0 }
  return {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  }
}

function getLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs
}

function getContrastRatio(
  c1: { r: number; g: number; b: number },
  c2: { r: number; g: number; b: number }
): number {
  const l1 = getLuminance(c1.r, c1.g, c1.b)
  const l2 = getLuminance(c2.r, c2.g, c2.b)
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)
}

function getBestTextColor(bgHex: string): string {
  const bg = parseHex(bgHex)
  const light = parseHex(LIGHT_TEXT)
  const dark = parseHex(DARK_TEXT)
  return getContrastRatio(bg, dark) >= getContrastRatio(bg, light) ? DARK_TEXT : LIGHT_TEXT
}

/**
 * React hook that returns a random highlighter background color and its WCAG-compliant text color.
 * The color is memoized so it remains stable across re-renders.
 * @returns { bg: string, text: string }
 */
export function useHighlighter(): { bg: string; text: string } {
  return useMemo(() => {
    const bg = HIGHLIGHTERS[Math.floor(Math.random() * HIGHLIGHTERS.length)]
    const text = getBestTextColor(bg)
    return { bg, text }
  }, [])
}
