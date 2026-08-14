import { describe, expect, it } from "vitest"

import {
  buildTableUrl,
  parseTableParams,
} from "@/lib/question-banks/question-table-params"

describe("parseTableParams", () => {
  it("returns defaults for an empty search", () => {
    expect(parseTableParams(new URLSearchParams())).toEqual({
      q: "",
      sort: "createdAt",
      order: "desc",
      page: 1,
      size: 10,
      categoryId: undefined,
      type: undefined,
      status: undefined,
    })
  })

  it("parses filters, search, and pagination", () => {
    const params = parseTableParams(
      new URLSearchParams(
        "q=aljabar&category=cat-1&type=scored&status=archived&order=asc&page=2&size=50"
      )
    )

    expect(params).toEqual({
      q: "aljabar",
      sort: "createdAt",
      order: "asc",
      page: 2,
      size: 50,
      categoryId: "cat-1",
      type: "scored",
      status: "archived",
    })
  })

  it("ignores unknown type and status values", () => {
    const params = parseTableParams(new URLSearchParams("type=essay&status=deleted"))

    expect(params.type).toBeUndefined()
    expect(params.status).toBeUndefined()
  })

  it("clamps invalid page and size", () => {
    const params = parseTableParams(new URLSearchParams("page=0&size=999"))

    expect(params.page).toBe(1)
    expect(params.size).toBe(10)
  })
})

describe("buildTableUrl", () => {
  it("returns the bare path for the default view", () => {
    expect(
      buildTableUrl("/dashboard/question-banks/b1", {
        q: "",
        sort: "createdAt",
        order: "desc",
        page: 1,
        size: 10,
        categoryId: undefined,
        type: undefined,
        status: undefined,
      })
    ).toBe("/dashboard/question-banks/b1")
  })

  it("omits defaults but keeps filters", () => {
    const url = buildTableUrl("/dashboard/question-banks/b1", {
      q: "fisika",
      sort: "createdAt",
      order: "desc",
      page: 1,
      size: 10,
      categoryId: "cat-2",
      type: "manual",
      status: "active",
    })

    expect(url).toBe(
      "/dashboard/question-banks/b1?q=fisika&category=cat-2&type=manual&status=active"
    )
  })

  it("round-trips with parseTableParams", () => {
    const params = parseTableParams(
      new URLSearchParams("q=x&category=c&type=single&status=archived&order=asc&page=3&size=25")
    )
    const url = buildTableUrl("/base", params)

    expect(parseTableParams(new URL(url, "http://localhost").searchParams)).toEqual(params)
  })
})
