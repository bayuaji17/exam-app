import { Lexend, Open_Sans } from "next/font/google"
import localFont from "next/font/local"

import "./globals.css"
import { FontProvider } from "@/components/font-provider"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

const openSans = Open_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-open-sans",
})

const lexend = Lexend({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-lexend",
})

const openDyslexic = localFont({
  src: [
    {
      path: "../lib/fonts/OpenDyslexic-Regular.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../lib/fonts/OpenDyslexic-Bold.woff2",
      weight: "700",
      style: "normal",
    },
  ],
  display: "swap",
  variable: "--font-open-dyslexic",
})

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(
        "font-sans antialiased",
        openSans.variable,
        lexend.variable,
        openDyslexic.variable
      )}
    >
      <body>
        <ThemeProvider>
          <TooltipProvider>
            <FontProvider>
              {children}
              <Toaster
                richColors={true}
                position="top-center"
                swipeDirections={["top", "right", "bottom", "left"]}
              />
            </FontProvider>
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
