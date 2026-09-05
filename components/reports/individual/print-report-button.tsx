"use client"

import { PrinterIcon } from "lucide-react"

import { Button } from "@/components/ui/button"

export interface PrintReportButtonProps {
  className?: string
}

export function PrintReportButton({ className }: PrintReportButtonProps) {
  return (
    <Button
      variant="outline"
      size="sm"
      className={`print:hidden ${className || ""}`}
      onClick={() => window.print()}
    >
      <PrinterIcon className="mr-1.5 h-4 w-4" />
      Cetak Rapor / Simpan PDF
    </Button>
  )
}
