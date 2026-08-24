import { describe, expect, it } from "vitest"
import { CACHE_TAGS } from "@/lib/cache-tags"

describe("CACHE_TAGS constants", () => {
  it("defines unique tag strings for all domains", () => {
    const tags = Object.values(CACHE_TAGS)
    const uniqueTags = new Set(tags)

    expect(tags.length).toBe(uniqueTags.size)
    expect(CACHE_TAGS.CATEGORIES).toBe("categories")
    expect(CACHE_TAGS.EXAM_PACKAGES).toBe("exam-packages")
    expect(CACHE_TAGS.QUESTION_BANKS).toBe("question-banks")
    expect(CACHE_TAGS.EXAM_SCHEDULES).toBe("exam-schedules")
    expect(CACHE_TAGS.INTRODUCTIONS).toBe("introductions")
    expect(CACHE_TAGS.DASHBOARD_STATS).toBe("dashboard-stats")
    expect(CACHE_TAGS.USERS).toBe("users")
  })
})
