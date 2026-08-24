export const CACHE_TAGS = {
  CATEGORIES: "categories",
  EXAM_PACKAGES: "exam-packages",
  QUESTION_BANKS: "question-banks",
  EXAM_SCHEDULES: "exam-schedules",
  INTRODUCTIONS: "introductions",
  DASHBOARD_STATS: "dashboard-stats",
  USERS: "users",
} as const

export type CacheTag = (typeof CACHE_TAGS)[keyof typeof CACHE_TAGS]
