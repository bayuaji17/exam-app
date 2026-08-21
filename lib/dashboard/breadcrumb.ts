export interface BreadcrumbSegment {
  label: string
  href: string
  isCurrentPage: boolean
}

const SECTION_LABELS: Record<string, string> = {
  "question-banks": "Bank Soal",
  exams: "Paket Ujian",
  "exam-schedules": "Jadwal Ujian",
  "exam-introductions": "Introduction Ujian",
  "exam-results": "Hasil Ujian",
  "manual-grading": "Penilaian Manual",
  "user-groups": "Grup Peserta",
  users: "Peserta",
  admins: "Admin",
  roles: "Role & Hak Akses",
  "exam-sessions": "Sesi Ujian",
  "exam-access-rules": "Aturan Akses",
  "scoring-rules": "Aturan Penilaian",
  "activity-tracking": "Activity Tracking",
  "anti-cheat": "Anti-cheat",
  "attempt-history": "Riwayat Pengerjaan",
  reports: "Laporan",
  settings: "Pengaturan",
  profile: "Profile",
  forbidden: "Akses Ditolak",
}

const ACTION_LABELS: Record<string, string> = {
  new: "Tambah",
  create: "Tambah",
  edit: "Edit",
  import: "Import",
  categories: "Kategori",
  eligibility: "Kelayakan Peserta",
  questions: "Kelola Soal",
  security: "Security",
  sessions: "Sesi Aktif",
  system: "Konfigurasi Global",
}

function formatSlugToTitle(slug: string): string {
  if (!slug) return ""
  return slug
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}

/**
 * Parses any dashboard pathname and produces a structured list of breadcrumb items
 * with localized labels, clickable intermediate routes, and current page indication.
 */
export function getBreadcrumbSegments(pathname: string): BreadcrumbSegment[] {
  const normalizedPath = pathname.split("?")[0].replace(/\/+$/, "")
  const rawParts = normalizedPath.split("/").filter(Boolean)

  // If at root /dashboard or top-level /
  if (rawParts.length <= 1) {
    return [
      {
        label: "Dashboard",
        href: "/dashboard",
        isCurrentPage: true,
      },
    ]
  }

  // Always start with Dashboard as root item
  const segments: BreadcrumbSegment[] = [
    {
      label: "Dashboard",
      href: "/dashboard",
      isCurrentPage: false,
    },
  ]

  // Dashboard sections begin at index 1: /dashboard/<section>/...
  const section = rawParts[1]
  const sectionLabel = SECTION_LABELS[section] ?? formatSlugToTitle(section)
  const sectionHref = `/dashboard/${section}`

  // Check custom route patterns
  if (section === "question-banks") {
    segments.push({
      label: sectionLabel,
      href: sectionHref,
      isCurrentPage: rawParts.length === 2,
    })

    if (rawParts.length >= 3) {
      const part2 = rawParts[2]
      if (part2 === "new") {
        segments.push({
          label: "Tambah Bank Soal",
          href: `${sectionHref}/new`,
          isCurrentPage: true,
        })
      } else if (part2 === "categories") {
        segments.push({
          label: "Kategori Soal",
          href: `${sectionHref}/categories`,
          isCurrentPage: true,
        })
      } else {
        // [bankId]
        const bankHref = `${sectionHref}/${part2}`
        const isBankDetail = rawParts.length === 3
        segments.push({
          label: "Detail Bank",
          href: bankHref,
          isCurrentPage: isBankDetail,
        })

        if (rawParts.length >= 4) {
          const part3 = rawParts[3]
          if (part3 === "edit") {
            segments.push({
              label: "Edit Bank",
              href: `${bankHref}/edit`,
              isCurrentPage: true,
            })
          } else if (part3 === "questions" && rawParts.length >= 5) {
            const part4 = rawParts[4]
            if (part4 === "new") {
              segments.push({
                label: "Tambah Soal",
                href: `${bankHref}/questions/new`,
                isCurrentPage: true,
              })
            } else if (rawParts.length >= 6 && rawParts[5] === "edit") {
              segments.push({
                label: "Edit Soal",
                href: `${bankHref}/questions/${part4}/edit`,
                isCurrentPage: true,
              })
            }
          }
        }
      }
    }
  } else if (section === "exams") {
    segments.push({
      label: sectionLabel,
      href: sectionHref,
      isCurrentPage: rawParts.length === 2,
    })

    if (rawParts.length >= 3) {
      const part2 = rawParts[2]
      if (part2 === "new") {
        segments.push({
          label: "Buat Paket",
          href: `${sectionHref}/new`,
          isCurrentPage: true,
        })
      } else {
        const examHref = `${sectionHref}/${part2}`
        segments.push({
          label: "Detail Paket",
          href: examHref,
          isCurrentPage: rawParts.length === 3,
        })

        if (rawParts.length >= 4) {
          const part3 = rawParts[3]
          if (part3 === "edit") {
            segments.push({
              label: "Edit Paket",
              href: `${examHref}/edit`,
              isCurrentPage: true,
            })
          } else if (part3 === "questions") {
            segments.push({
              label: "Kelola Soal",
              href: `${examHref}/questions`,
              isCurrentPage: true,
            })
          }
        }
      }
    }
  } else if (section === "exam-schedules") {
    segments.push({
      label: sectionLabel,
      href: sectionHref,
      isCurrentPage: rawParts.length === 2,
    })

    if (rawParts.length >= 3) {
      const part2 = rawParts[2]
      if (part2 === "new") {
        segments.push({
          label: "Buat Jadwal",
          href: `${sectionHref}/new`,
          isCurrentPage: true,
        })
      } else if (rawParts.length >= 4 && rawParts[3] === "edit") {
        segments.push({
          label: "Edit Jadwal",
          href: `${sectionHref}/${part2}/edit`,
          isCurrentPage: true,
        })
      } else if (rawParts.length >= 4 && rawParts[3] === "eligibility") {
        segments.push({
          label: "Kelayakan Peserta",
          href: `${sectionHref}/${part2}/eligibility`,
          isCurrentPage: true,
        })
      }
    }
  } else if (section === "user-groups") {
    segments.push({
      label: sectionLabel,
      href: sectionHref,
      isCurrentPage: rawParts.length === 2,
    })

    if (rawParts.length >= 3) {
      const part2 = rawParts[2]
      if (part2 === "new") {
        segments.push({
          label: "Buat Grup",
          href: `${sectionHref}/new`,
          isCurrentPage: true,
        })
      } else {
        const groupHref = `${sectionHref}/${part2}`
        segments.push({
          label: "Anggota Grup",
          href: groupHref,
          isCurrentPage: rawParts.length === 3,
        })

        if (rawParts.length >= 4 && rawParts[3] === "edit") {
          segments.push({
            label: "Edit Grup",
            href: `${groupHref}/edit`,
            isCurrentPage: true,
          })
        }
      }
    }
  } else if (section === "users") {
    segments.push({
      label: sectionLabel,
      href: sectionHref,
      isCurrentPage: rawParts.length === 2,
    })

    if (rawParts.length >= 3) {
      const part2 = rawParts[2]
      if (part2 === "create") {
        segments.push({
          label: "Tambah Peserta",
          href: `${sectionHref}/create`,
          isCurrentPage: true,
        })
      } else if (part2 === "import") {
        segments.push({
          label: "Import Peserta",
          href: `${sectionHref}/import`,
          isCurrentPage: true,
        })
      } else if (rawParts.length >= 4 && rawParts[3] === "edit") {
        segments.push({
          label: "Edit Peserta",
          href: `${sectionHref}/${part2}/edit`,
          isCurrentPage: true,
        })
      }
    }
  } else if (section === "settings") {
    segments.push({
      label: sectionLabel,
      href: sectionHref,
      isCurrentPage: rawParts.length === 2,
    })

    if (rawParts.length >= 3) {
      const part2 = rawParts[2]
      const part2Label = ACTION_LABELS[part2] ?? formatSlugToTitle(part2)
      const part2Href = `${sectionHref}/${part2}`

      segments.push({
        label: part2Label,
        href: part2Href,
        isCurrentPage: rawParts.length === 3,
      })

      if (rawParts.length >= 4) {
        const part3 = rawParts[3]
        const part3Label = ACTION_LABELS[part3] ?? formatSlugToTitle(part3)
        segments.push({
          label: part3Label,
          href: `${part2Href}/${part3}`,
          isCurrentPage: true,
        })
      }
    }
  } else if (section === "exam-introductions") {
    segments.push({
      label: sectionLabel,
      href: sectionHref,
      isCurrentPage: rawParts.length === 2,
    })

    if (rawParts.length >= 3) {
      segments.push({
        label: "Edit Petunjuk",
        href: `${sectionHref}/${rawParts[2]}`,
        isCurrentPage: true,
      })
    }
  } else if (section === "exam-results") {
    segments.push({
      label: sectionLabel,
      href: sectionHref,
      isCurrentPage: rawParts.length === 2,
    })

    if (rawParts.length >= 3) {
      segments.push({
        label: "Detail Hasil",
        href: `${sectionHref}/${rawParts[2]}`,
        isCurrentPage: true,
      })
    }
  } else if (section === "manual-grading") {
    segments.push({
      label: sectionLabel,
      href: sectionHref,
      isCurrentPage: rawParts.length === 2,
    })

    if (rawParts.length >= 3) {
      segments.push({
        label: "Form Penilaian",
        href: `${sectionHref}/${rawParts[2]}`,
        isCurrentPage: true,
      })
    }
  } else {
    // Generic fallback for any other sections and sub-paths
    let accumulatedPath = "/dashboard"
    for (let i = 1; i < rawParts.length; i++) {
      const part = rawParts[i]
      accumulatedPath += `/${part}`
      const isLast = i === rawParts.length - 1
      const label =
        i === 1
          ? (SECTION_LABELS[part] ?? formatSlugToTitle(part))
          : (ACTION_LABELS[part] ?? formatSlugToTitle(part))

      segments.push({
        label,
        href: accumulatedPath,
        isCurrentPage: isLast,
      })
    }
  }

  // Ensure last element is marked as isCurrentPage
  if (segments.length > 0) {
    segments[segments.length - 1].isCurrentPage = true
  }

  return segments
}
