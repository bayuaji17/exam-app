"use client"

import { PaletteIcon } from "lucide-react"
import { useTheme } from "next-themes"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { isAppFont, useFont } from "@/components/font-provider"

function AppearanceDropdown() {
  const { theme, setTheme } = useTheme()
  const { font, setFont } = useFont()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          <PaletteIcon data-icon="inline-start" />
          Appearance
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Theme</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={theme ?? "current"}
          onValueChange={setTheme}
        >
          <DropdownMenuRadioItem value="current">Current</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="dark">Dark</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="warm">Warm</DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>

        <DropdownMenuSeparator />

        <DropdownMenuLabel>Font</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={font}
          onValueChange={(value) => {
            if (isAppFont(value)) {
              setFont(value)
            }
          }}
        >
          <DropdownMenuRadioItem value="open-sans">Open Sans</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="lexend">Lexend</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="open-dyslexic">
            OpenDyslexic
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export { AppearanceDropdown }
