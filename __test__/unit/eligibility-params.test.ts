import { describe, expect, it } from "vitest"

import {
  ALLOWED_PAGE_SIZES,
  buildTableUrl,
  parseTableParams,
} from "@/lib/eligibility/table-params"

describe("eligible participant table params", () => {
  it("parses defaults from an empty input", () => {
    expect(parseTableParams({})).toEqual({
      q: "",
      sort: "name",
      order: "asc",
      page: 1,
      size: 10,
    })
  })

  it("parses a full parameter set", () => {
    expect(
      parseTableParams(
        new URLSearchParams("q=budi&sort=createdAt&order=desc&page=2&size=50")
      )
    ).toEqual({
      q: "budi",
      sort: "createdAt",
      order: "desc",
      page: 2,
      size: 50,
    })
  })

  it("falls back to defaults for unknown sort columns and orders", () => {
    expect(parseTableParams({ sort: "bogus", order: "sideways" })).toEqual({
      q: "",
      sort: "name",
      order: "asc",
      page: 1,
      size: 10,
    })
  })

  it("clamps page and size", () => {
    const params = parseTableParams(new URLSearchParams("page=0&size=99"))

    expect(params.page).toBe(1)
    expect(params.size).toBe(10)
  })

  it("builds a bare URL for the default view", () => {
    expect(
      buildTableUrl("/dashboard/exam-schedules/s1/eligibility", {
        q: "",
        sort: "name",
        order: "asc",
        page: 1,
        size: 10,
      })
    ).toBe("/dashboard/exam-schedules/s1/eligibility")
  })

  it("serializes only non-default parameters", () => {
    expect(
      buildTableUrl("/dashboard/exam-schedules/s1/eligibility", {
        q: "budi",
        sort: "createdAt",
        order: "desc",
        page: 2,
        size: 25,
      })
    ).toBe(
      "/dashboard/exam-schedules/s1/eligibility?q=budi&sort=createdAt&order=desc&page=2&size=25"
    )
  })

  it("round-trips a parsed parameter set", () => {
    const params = parseTableParams(
      new URLSearchParams("q=budi&sort=createdAt&order=desc&page=3&size=25")
    )
    const url = buildTableUrl("/x", params)
    const query = url.includes("?") ? url.slice(url.indexOf("?") + 1) : ""

    expect(parseTableParams(new URLSearchParams(query))).toEqual(params)
  })

  it("exposes the shared page-size allowlist", () => {
    expect(ALLOWED_PAGE_SIZES).toEqual([10, 25, 50])
  })
})
