import { describe, expect, it } from "vitest"

import { describeUserAgent } from "@/lib/users/session-format"

describe("describeUserAgent", () => {
  it("identifies Chrome on Windows", () => {
    expect(
      describeUserAgent(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"
      )
    ).toBe("Chrome · Windows")
  })

  it("identifies Safari on macOS", () => {
    expect(
      describeUserAgent(
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15"
      )
    ).toBe("Safari · macOS")
  })

  it("identifies Chrome on Android", () => {
    expect(
      describeUserAgent(
        "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Mobile Safari/537.36"
      )
    ).toBe("Chrome · Android")
  })

  it("identifies Firefox on Linux", () => {
    expect(
      describeUserAgent(
        "Mozilla/5.0 (X11; Linux x86_64; rv:127.0) Gecko/20100101 Firefox/127.0"
      )
    ).toBe("Firefox · Linux")
  })

  it("identifies Edge on Windows", () => {
    expect(
      describeUserAgent(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36 Edg/126.0.0.0"
      )
    ).toBe("Edge · Windows")
  })

  it("identifies Safari on iOS", () => {
    expect(
      describeUserAgent(
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1"
      )
    ).toBe("Safari · iOS")
  })

  it("returns null for an empty user agent", () => {
    expect(describeUserAgent(null)).toBeNull()
    expect(describeUserAgent("")).toBeNull()
  })

  it("returns null for an unrecognisable user agent", () => {
    expect(describeUserAgent("curl/8.5.0")).toBeNull()
    expect(describeUserAgent("random-garbage")).toBeNull()
  })

  it("returns the platform alone when the browser is unknown", () => {
    expect(
      describeUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) foo/1.0")
    ).toBe("Windows")
  })

  it("returns the browser alone when the platform is unknown", () => {
    expect(describeUserAgent("Chrome/126.0.0.0")).toBe("Chrome")
  })
})
