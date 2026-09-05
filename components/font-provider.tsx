"use client"

import * as React from "react"

type AppFont = "open-sans" | "lexend" | "open-dyslexic"

type FontContextValue = {
  font: AppFont
  setFont: (font: AppFont) => void
}

const FONT_STORAGE_KEY = "exam-app-font"

const FONT_CLASS: Record<AppFont, string> = {
  "open-sans": "font-sans",
  lexend: "font-heading",
  "open-dyslexic": "font-dyslexic",
}

const FONT_CLASSES = Object.values(FONT_CLASS)

const FontContext = React.createContext<FontContextValue | null>(null)

function isAppFont(value: string): value is AppFont {
  return (
    value === "open-sans" || value === "lexend" || value === "open-dyslexic"
  )
}

function getInitialFont(): AppFont {
  if (typeof window === "undefined") {
    return "open-sans"
  }

  const storedFont = window.localStorage.getItem(FONT_STORAGE_KEY)

  return storedFont && isAppFont(storedFont) ? storedFont : "open-sans"
}

function FontProvider({ children }: { children: React.ReactNode }) {
  const [font, setFontState] = React.useState<AppFont>(getInitialFont)

  React.useEffect(() => {
    document.body.classList.remove(...FONT_CLASSES)
    document.body.classList.add(FONT_CLASS[font])
  }, [font])

  const setFont = React.useCallback((nextFont: AppFont) => {
    setFontState(nextFont)
    window.localStorage.setItem(FONT_STORAGE_KEY, nextFont)
  }, [])

  const value = React.useMemo(
    () => ({
      font,
      setFont,
    }),
    [font, setFont]
  )

  return <FontContext.Provider value={value}>{children}</FontContext.Provider>
}

function useFont() {
  const context = React.useContext(FontContext)

  if (!context) {
    throw new Error("useFont must be used within FontProvider")
  }

  return context
}

export { FontProvider, isAppFont, useFont, type AppFont }
