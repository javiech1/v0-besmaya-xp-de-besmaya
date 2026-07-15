import { describe, it, expect } from "vitest"
import { isImpersonationName, normalizeName } from "./nameFilter"

describe("normalizeName", () => {
  it("quita tildes, separadores y mayusculas", () => {
    expect(normalizeName("OJÁN")).toBe("ojan")
    expect(normalizeName("O.j.a.n")).toBe("ojan")
    expect(normalizeName("j a v i  o j a n")).toBe("javiojan")
    expect(normalizeName("Carmen Vaquero")).toBe("carmenvaquero")
  })
})

describe("isImpersonationName", () => {
  it("bloquea variantes de los Javis", () => {
    for (const n of ["Ojan", "Javi ojan", "O.j.a.n", "OJÁN", "javi echavarri", "Echa", "el echa", "j a v i ojan", "ojan_falso", "ECHAVARRI"]) {
      expect(isImpersonationName(n), n).toBe(true)
    }
  })

  it("bloquea 'nadie' solo como coincidencia exacta", () => {
    expect(isImpersonationName("Nadie")).toBe(true)
    expect(isImpersonationName("N A D I E")).toBe(true)
    expect(isImpersonationName("nadié")).toBe(true)
    // fandom, no suplantacion
    expect(isImpersonationName("fandenadie")).toBe(false)
    expect(isImpersonationName("nadiemola")).toBe(false)
  })

  it("respeta nombres normales", () => {
    for (const n of ["Carmen Vaquero", "Pedro Porro", "Kuku", "MDDC", "laura23", "fandebesmaya", "Juan", "María", "javi"]) {
      expect(isImpersonationName(n), n).toBe(false)
    }
  })
})
