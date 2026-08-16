import { describe, expect, it } from "vitest"

import {
  ALLOWED_PAGE_SIZES,
  buildTableUrl,
  nextSortOrder,
  parseTableParams,
} from "@/lib/participants/table-params"

describe("participant group table params", () => {
  it("parses defaults from an empty input", () => {
    expect(parseTableParams({})).toEqual({
      q: "",
      sort: "createdAt",
      order: "desc",
      page: 1,
      size: 10,
    })
  })

  it("parses a full parameter set", () => {
    expect(
      parseTableParams(
        new URLSearchParams("q=ipa&sort=name&order=asc&page=3&size=25")
      )
    ).toEqual({
      q: "ipa",
      sort: "name",
      order: "asc",
      page: 3,
      size: 25,
    })
  })

  it("trims the search query", () => {
    expect(parseTableParams({ q: "  ipa  " }).q).toBe("ipa")
  })

  it("falls back to defaults for unknown sort columns and orders", () => {
    expect(parseTableParams({ sort: "bogus", order: "sideways" })).toEqual({
      q: "",
      sort: "createdAt",
      order: "desc",
      page: 1,
      size: 10,
    })
  })

  it("clamps page and size", () => {
    const params = parseTableParams(
      new URLSearchParams("page=0&size=99")
    )

    expect(params.page).toBe(1)
    expect(params.size).toBe(10)
  })

  it("reads the first value of repeated parameters", () => {
    expect(parseTableParams({ q: ["ipa", "saintek"] }).q).toBe("ipa")
  })

  it("builds a bare URL for the default view", () => {
    expect(
      buildTableUrl("/dashboard/user-groups", {
        q: "",
        sort: "createdAt",
        order: "desc",
        page: 1,
        size: 10,
      })
    ).toBe("/dashboard/user-groups")
  })

  it("serializes only non-default parameters", () => {
    expect(
      buildTableUrl("/dashboard/user-groups", {
        q: "ipa",
        sort: "name",
        order: "asc",
        page: 2,
        size: 25,
      })
    ).toBe(
      "/dashboard/user-groups?q=ipa&sort=name&order=asc&page=2&size=25"
    )
  })

  it("round-trips a parsed parameter set", () => {
    const params = parseTableParams(
      new URLSearchParams("q=ipa&sort=name&order=asc&page=3&size=25")
    )
    const url = buildTableUrl("/x", params)
    const query = url.includes("?") ? url.slice(url.indexOf("?") + 1) : ""

    expect(parseTableParams(new URLSearchParams(query))).toEqual(params)
  })

  it("exposes the shared page-size allowlist", () => {
    expect(ALLOWED_PAGE_SIZES).toEqual([10, 25, 50])
  })

  it("nextSortOrder starts a new column asc and flips the active column", () => {
    expect(nextSortOrder("name", "desc", "createdAt")).toBe("asc")
    expect(nextSortOrder("name", "asc", "name")).toBe("desc")
    expect(nextSortOrder("name", "desc", "name")).toBe("asc")
  })
})
