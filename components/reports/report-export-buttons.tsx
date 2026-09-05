import Link from "next/link"
import { FileSpreadsheetIcon, FileTextIcon } from "lucide-react"

import { Button } from "@/components/ui/button"

export interface ReportExportButtonsProps {
  scheduleId: string
  className?: string
}

export function ReportExportButtons({
  scheduleId,
  className,
}: ReportExportButtonsProps) {
  return (
    <div className={`flex flex-wrap items-center gap-2 ${className || ""}`}>
      <Button variant="outline" size="sm" asChild>
        <Link
          href={`/api/reports/exam-results/${scheduleId}?format=xlsx`}
          download
        >
          <FileSpreadsheetIcon className="mr-1.5 h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          Unduh Excel (.xlsx)
        </Link>
      </Button>
      <Button variant="outline" size="sm" asChild>
        <Link
          href={`/api/reports/exam-results/${scheduleId}?format=csv`}
          download
        >
          <FileTextIcon className="mr-1.5 h-4 w-4 text-blue-600 dark:text-blue-400" />
          Unduh CSV (.csv)
        </Link>
      </Button>
    </div>
  )
}
