import ExcelJS from "exceljs"

import type { ScheduleReportSummary } from "./types"

/**
 * Escapes a single CSV value following RFC 4180 rules.
 */
function escapeCsvValue(val: string | number | null | undefined): string {
  if (val === null || val === undefined) {
    return ""
  }
  const str = String(val)
  if (
    str.includes(",") ||
    str.includes('"') ||
    str.includes("\n") ||
    str.includes("\r")
  ) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

/**
 * Generates an ExcelJS Workbook with two formatted sheets:
 * 1. "Ringkasan": Overview, Exam Metadata, and Statistical Metrics
 * 2. "Daftar Nilai Peserta": Full participant roster with identifiers and final grades
 */
export async function generateExamResultsWorkbook(
  report: ScheduleReportSummary
): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = "Exam App System"
  workbook.created = new Date()

  // ----------------------------------------------------
  // Sheet 1: Ringkasan
  // ----------------------------------------------------
  const summarySheet = workbook.addWorksheet("Ringkasan", {
    views: [{ showGridLines: true }],
  })

  summarySheet.columns = [
    { width: 30 },
    { width: 28 },
    { width: 18 },
    { width: 18 },
  ]

  // Title Banner
  summarySheet.mergeCells("A1:D1")
  const titleCell = summarySheet.getCell("A1")
  titleCell.value = "REKAPITULASI LAPORAN HASIL UJIAN"
  titleCell.font = { name: "Arial", size: 14, bold: true, color: { argb: "FFFFFFFF" } }
  titleCell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF1E293B" }, // Slate-800
  }
  titleCell.alignment = { vertical: "middle", horizontal: "center" }
  summarySheet.getRow(1).height = 36

  // Metadata Section
  summarySheet.getCell("A3").value = "Nama Jadwal Ujian"
  summarySheet.getCell("B3").value = report.scheduleTitle
  summarySheet.getCell("A4").value = "Paket Soal"
  summarySheet.getCell("B4").value = report.packageTitle
  summarySheet.getCell("A5").value = "Standar Kelulusan (KKM)"
  summarySheet.getCell("B5").value =
    report.passScore !== null ? report.passScore : "Tidak Ditentukan"
  summarySheet.getCell("A6").value = "Total Poin Tersedia"
  summarySheet.getCell("B6").value = report.totalPoints

  for (let r = 3; r <= 6; r++) {
    const cellA = summarySheet.getCell(`A${r}`)
    cellA.font = { bold: true }
    cellA.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFF1F5F9" }, // Slate-100
    }
  }

  // Aggregate Statistics Section Header
  summarySheet.getCell("A8").value = "Statistik Hasil Ujian"
  summarySheet.getCell("A8").font = { bold: true, size: 12 }

  const statHeaders = ["Metrik", "Nilai"]
  const statHeaderRow = summarySheet.getRow(9)
  statHeaderRow.values = statHeaders
  statHeaderRow.font = { bold: true, color: { argb: "FFFFFFFF" } }
  statHeaderRow.eachCell((cell) => {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF334155" }, // Slate-700
    }
  })

  const statItems: Array<[string, string | number]> = [
    ["Total Peserta Berhak", report.stats.totalParticipantsEligible],
    ["Total Peserta Memulai", report.stats.totalAttemptsStarted],
    ["Total Peserta Submit", report.stats.totalAttemptsSubmitted],
    ["Selesai Dinilai", report.stats.totalFullyGraded],
    ["Jumlah Lulus", report.stats.passingCount],
    ["Jumlah Tidak Lulus", report.stats.failingCount],
    ["Persentase Kelulusan", `${report.stats.passingRate}%`],
    ["Rata-rata Nilai", report.stats.averageScore],
    ["Median Nilai", report.stats.medianScore],
    ["Nilai Tertinggi", report.stats.highestScore],
    ["Nilai Terendah", report.stats.lowestScore],
    ["Standar Deviasi", report.stats.standardDeviation],
  ]

  let currentRow = 10
  for (const [metric, value] of statItems) {
    const row = summarySheet.getRow(currentRow)
    row.values = [metric, value]
    currentRow++
  }

  // Distribution Table Section
  currentRow += 1
  summarySheet.getCell(`A${currentRow}`).value = "Distribusi Rentang Nilai"
  summarySheet.getCell(`A${currentRow}`).font = { bold: true, size: 12 }
  currentRow += 1

  const distHeaderRow = summarySheet.getRow(currentRow)
  distHeaderRow.values = ["Rentang Nilai", "Jumlah Peserta", "Persentase"]
  distHeaderRow.font = { bold: true, color: { argb: "FFFFFFFF" } }
  distHeaderRow.eachCell((cell) => {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF334155" },
    }
  })
  currentRow += 1

  for (const bucket of report.stats.distribution) {
    const row = summarySheet.getRow(currentRow)
    row.values = [bucket.range, bucket.count, `${bucket.percentage}%`]
    currentRow++
  }

  // ----------------------------------------------------
  // Sheet 2: Daftar Nilai Peserta
  // ----------------------------------------------------
  const rosterSheet = workbook.addWorksheet("Daftar Nilai Peserta", {
    views: [{ showGridLines: true }],
  })

  rosterSheet.columns = [
    { header: "No", key: "no", width: 6 },
    { header: "Nama Peserta", key: "name", width: 30 },
    { header: "Email", key: "email", width: 32 },
    { header: "NISN", key: "nisn", width: 18 },
    { header: "NIS", key: "nis", width: 16 },
    { header: "NIP", key: "nip", width: 22 },
    { header: "Waktu Submit", key: "submittedAt", width: 22 },
    { header: "Nilai Akhir", key: "score", width: 14 },
    { header: "Status Koreksi", key: "gradingStatus", width: 24 },
    { header: "Status Kelulusan", key: "passingStatus", width: 20 },
  ]

  // Style Header Row
  const headerRow = rosterSheet.getRow(1)
  headerRow.height = 28
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } }
  headerRow.eachCell((cell) => {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF1E293B" }, // Slate-800
    }
    cell.alignment = { vertical: "middle", horizontal: "center" }
  })

  // Insert Participant Rows
  report.participants.forEach((p, idx) => {
    const gradingStatus = p.fullyGraded
      ? "Selesai Dinilai"
      : "Perlu Koreksi Manual"

    let passingStatus = "-"
    if (!p.fullyGraded) {
      passingStatus = "Menunggu Penilaian"
    } else if (p.passing === true) {
      passingStatus = "Lulus"
    } else if (p.passing === false) {
      passingStatus = "Tidak Lulus"
    }

    const row = rosterSheet.addRow({
      no: idx + 1,
      name: p.participantName,
      email: p.participantEmail,
      nisn: p.identifierNisn || "-",
      nis: p.identifierNis || "-",
      nip: p.identifierNip || "-",
      submittedAt: p.submittedAt
        ? new Date(p.submittedAt).toISOString().replace("T", " ").substring(0, 19)
        : "-",
      score: p.score !== null ? p.score : "-",
      gradingStatus,
      passingStatus,
    })

    row.getCell("no").alignment = { horizontal: "center" }
    row.getCell("nisn").alignment = { horizontal: "center" }
    row.getCell("nis").alignment = { horizontal: "center" }
    row.getCell("nip").alignment = { horizontal: "center" }
    row.getCell("submittedAt").alignment = { horizontal: "center" }
    row.getCell("score").alignment = { horizontal: "right" }
    row.getCell("gradingStatus").alignment = { horizontal: "center" }
    row.getCell("passingStatus").alignment = { horizontal: "center" }
  })

  return workbook
}

/**
 * Generates RFC 4180 standard CSV string for participant exam results.
 */
export function generateExamResultsCsv(report: ScheduleReportSummary): string {
  const headers = [
    "No",
    "Nama Peserta",
    "Email",
    "NISN",
    "NIS",
    "NIP",
    "Waktu Submit",
    "Nilai Akhir",
    "Status Koreksi",
    "Status Kelulusan",
  ]

  const lines = [headers.join(",")]

  report.participants.forEach((p, idx) => {
    const gradingStatus = p.fullyGraded
      ? "Selesai Dinilai"
      : "Perlu Koreksi Manual"

    let passingStatus = "-"
    if (!p.fullyGraded) {
      passingStatus = "Menunggu Penilaian"
    } else if (p.passing === true) {
      passingStatus = "Lulus"
    } else if (p.passing === false) {
      passingStatus = "Tidak Lulus"
    }

    const values = [
      idx + 1,
      p.participantName,
      p.participantEmail,
      p.identifierNisn || "",
      p.identifierNis || "",
      p.identifierNip || "",
      p.submittedAt
        ? new Date(p.submittedAt).toISOString().replace("T", " ").substring(0, 19)
        : "",
      p.score !== null ? p.score : "",
      gradingStatus,
      passingStatus,
    ]

    lines.push(values.map(escapeCsvValue).join(","))
  })

  return lines.join("\r\n")
}

/**
 * Prepares raw export buffer, filename, and appropriate MIME content type.
 */
export async function exportReportBuffer(
  report: ScheduleReportSummary,
  format: "xlsx" | "csv" = "xlsx"
): Promise<{
  buffer: Buffer
  contentType: string
  filename: string
}> {
  const timestamp = Date.now()
  const slug = report.scheduleSlug || "exam-schedule"

  if (format === "csv") {
    const csvContent = generateExamResultsCsv(report)
    return {
      buffer: Buffer.from(csvContent, "utf-8"),
      contentType: "text/csv; charset=utf-8",
      filename: `laporan-hasil-${slug}-${timestamp}.csv`,
    }
  }

  const workbook = await generateExamResultsWorkbook(report)
  const xlsxBuffer = await workbook.xlsx.writeBuffer()

  return {
    buffer: Buffer.from(xlsxBuffer),
    contentType:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    filename: `laporan-hasil-${slug}-${timestamp}.xlsx`,
  }
}
