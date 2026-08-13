import { describe, expect, it } from "vitest"

import {
  buildTableUrl,
  nextSortOrder,
  parseTableParams,
} from "@/lib/question-banks/table-params"

describe("parseTableParams", () => {
  it("returns defaults for an empty search", () => {
    const params = parseTableParams(new URLSearchParams())

    expect(params).toEqual({
      q: "",
      sort: "createdAt",
      order: "desc",
      page: 1,
      size: 10,
    })
  })

  it("parses a full search string", () => {
    const params = parseTableParams(
      new URLSearchParams("q=matematika&sort=name&order=asc&page=2&size=25")
    )

    expect(params).toEqual({
      q: "matematika",
      sort: "name",
      order: "asc",
      page: 2,
      size: 25,
    })
  })

  it("falls back to the default sort for an unknown column", () => {
    const params = parseTableParams(new URLSearchParams("sort=description"))

    expect(params.sort).toBe("createdAt")
    expect(params.order).toBe("desc")
  })

  it("ignores an unknown sort order", () => {
    const params = parseTableParams(new URLSearchParams("order=sideways"))

    expect(params.order).toBe("desc")
  })

  it("clamps negative and non-numeric pages to the first page", () => {
    expect(parseTableParams(new URLSearchParams("page=0")).page).toBe(1)
    expect(parseTableParams(new URLSearchParams("page=abc")).page).toBe(1)
  })

  it("falls back to the default size for a size the UI does not offer", () => {
    expect(parseTableParams(new URLSearchParams("size=100")).size).toBe(10)
    expect(parseTableParams(new URLSearchParams("size=25")).size).toBe(25)
  })

  it("reads the first value of a repeated parameter", () => {
    const params = parseTableParams(
      new URLSearchParams("q=matematika&q=fisika")
    )

    expect(params.q).toBe("matematika")
  })
})

describe("buildTableUrl", () => {
  it("returns the bare path for the default view", () => {
    const url = buildTableUrl("/dashboard/question-banks", {
      q: "",
      sort: "createdAt",
      order: "desc",
      page: 1,
      size: 10,
    })

    expect(url).toBe("/dashboard/question-banks")
  })

  it("omits defaults but keeps everything non-default", () => {
    const url = buildTableUrl("/dashboard/question-banks", {
      q: "fisika",
      sort: "name",
      order: "asc",
      page: 2,
      size: 50,
    })

    expect(url).toBe(
      "/dashboard/question-banks?q=fisika&sort=name&order=asc&page=2&size=50"
    )
  })

  it("drops the sort pair when both match the defaults", () => {
    const url = buildTableUrl("/dashboard/question-banks", {
      q: "",
      sort: "createdAt",
      order: "desc",
      page: 3,
      size: 10,
    })

    expect(url).toBe("/dashboard/question-banks?page=3")
  })
})

describe("nextSortOrder", () => {
  it("starts a new column at ascending", () => {
    expect(nextSortOrder("createdAt", "desc", "name")).toBe("asc")
  })

  it("flips the active column", () => {
    expect(nextSortOrder("name", "asc", "name")).toBe("desc")
    expect(nextSortOrder("name", "desc", "name")).toBe("asc")
  })
})
