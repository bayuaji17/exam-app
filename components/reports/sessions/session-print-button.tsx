"use client"

import { PrinterIcon } from "lucide-react"

import { Button } from "@/components/ui/button"

export interface SessionPrintButtonProps {
  className?: string
}

export function SessionPrintButton({ className }: SessionPrintButtonProps) {
  return (
    <Button
      variant="outline"
      size="sm"
      className={`print:hidden ${className || ""}`}
      onClick={() => window.print()}
    >
      <PrinterIcon className="mr-1.5 h-4 w-4" />
      Cetak Berita Acara & Presensi
    </Button>
  )
}
