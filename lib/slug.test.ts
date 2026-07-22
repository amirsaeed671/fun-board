import { describe, it, expect } from "vitest"
import { makeSlug, slugifyUsername } from "./slug"

describe("makeSlug", () => {
  it("produces the requested length", () => {
    expect(makeSlug(10)).toHaveLength(10)
    expect(makeSlug(4)).toHaveLength(4)
  })

  it("is deterministic under a fixed rng", () => {
    const rng = () => 0 // always first char
    expect(makeSlug(5, rng)).toBe("aaaaa")
  })

  it("only uses the allowed alphabet", () => {
    const slug = makeSlug(50)
    expect(slug).toMatch(/^[a-z0-9]+$/)
  })

  it("maps rng values across the alphabet (letters then digits)", () => {
    let i = 0
    const seq = [0, 26 / 36, 35 / 36] // index 0='a', 26='0', 35='9'
    const rng = () => seq[i++]
    expect(makeSlug(3, rng)).toBe("a09")
    expect(makeSlug(3, () => 0)).toBe("aaa")
  })
})

describe("slugifyUsername", () => {
  it("lowercases and dashes non-alphanumerics", () => {
    expect(slugifyUsername("Cool User_99")).toBe("cool-user-99")
  })

  it("falls back to a random slug for too-short input", () => {
    expect(slugifyUsername("!")).toMatch(/^[a-z0-9]+$/)
  })
})
