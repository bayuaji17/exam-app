import { describe, expect, it } from "vitest"

import { APP_ROLES } from "@/lib/auth-roles"
import {
  buildTableUrl,
  nextSortOrder,
  parseTableParams,
} from "@/lib/users/table-params"

describe("parseTableParams", () => {
  it("returns defaults for an empty search", () => {
    const params = parseTableParams(new URLSearchParams())

    expect(params).toEqual({
      q: "",
      role: undefined,
      status: undefined,
      sort: "createdAt",
      order: "desc",
      page: 1,
      size: 10,
    })
  })

  it("parses a full search string", () => {
    const params = parseTableParams(
      new URLSearchParams(
        "q=budi&role=admin&status=banned&sort=email&order=asc&page=2&size=25"
      )
    )

    expect(params).toEqual({
      q: "budi",
      role: APP_ROLES.ADMIN,
      status: "banned",
      sort: "email",
      order: "asc",
      page: 2,
      size: 25,
    })
  })

  it("ignores an unknown role instead of filtering on it", () => {
    const params = parseTableParams(new URLSearchParams("role=owner"))

    expect(params.role).toBeUndefined()
  })

  it("ignores an unknown status", () => {
    const params = parseTableParams(new URLSearchParams("status=suspended"))

    expect(params.status).toBeUndefined()
  })

  it("falls back to the default sort for an unknown column", () => {
    const params = parseTableParams(new URLSearchParams("sort=password"))

    expect(params.sort).toBe("createdAt")
    expect(params.order).toBe("desc")
  })

  it("falls back for a malformed order", () => {
    const params = parseTableParams(new URLSearchParams("order=sideways"))

    expect(params.order).toBe("desc")
  })

  it("preserves ascending order for the default joined-date column", () => {
    const params = parseTableParams(
      new URLSearchParams("sort=createdAt&order=asc")
    )

    expect(params.sort).toBe("createdAt")
    expect(params.order).toBe("asc")
  })

  it("clamps a negative or non-numeric page to 1", () => {
    expect(parseTableParams(new URLSearchParams("page=-3")).page).toBe(1)
    expect(parseTableParams(new URLSearchParams("page=abc")).page).toBe(1)
    expect(parseTableParams(new URLSearchParams("page=0")).page).toBe(1)
  })

  it("falls back to the default size for an out-of-range size", () => {
    expect(parseTableParams(new URLSearchParams("size=999")).size).toBe(10)
    expect(parseTableParams(new URLSearchParams("size=0")).size).toBe(10)
    expect(parseTableParams(new URLSearchParams("size=50")).size).toBe(50)
  })

  it("trims search whitespace", () => {
    const params = parseTableParams(new URLSearchParams("q=  budi  "))

    expect(params.q).toBe("budi")
  })
})

describe("buildTableUrl", () => {
  it("round-trips a parameter set through the URL", () => {
    const params = {
      q: "budi",
      role: APP_ROLES.ADMIN,
      status: "banned" as const,
      sort: "email" as const,
      order: "asc" as const,
      page: 3,
      size: 25,
    }

    const url = buildTableUrl("/dashboard/users", params)
    const parsed = parseTableParams(new URLSearchParams(url.split("?")[1]))

    expect(parsed).toEqual(params)
  })

  it("omits defaults and empty values so links stay short", () => {
    const url = buildTableUrl("/dashboard/users", {
      q: "",
      role: undefined,
      status: undefined,
      sort: "createdAt",
      order: "desc",
      page: 1,
      size: 10,
    })

    expect(url).toBe("/dashboard/users")
  })

  it("keeps only the values that differ from defaults", () => {
    const url = buildTableUrl("/dashboard/users", {
      q: "",
      role: undefined,
      status: undefined,
      sort: "createdAt",
      order: "desc",
      page: 2,
      size: 10,
    })

    expect(url).toBe("/dashboard/users?page=2")
  })
})

describe("nextSortOrder", () => {
  it("starts a new column at ascending", () => {
    expect(nextSortOrder("createdAt", "desc", "name")).toBe("asc")
  })

  it("flips the direction on the same column", () => {
    expect(nextSortOrder("name", "asc", "name")).toBe("desc")
    expect(nextSortOrder("name", "desc", "name")).toBe("asc")
  })
})
