// Nombres que suplantan a la banda o al bot, para el muro.
// Se normaliza (sin tildes, sin separadores, minusculas) para pillar trucos
// tipo "O.j.a.n", "OJÁN" o "j a v i ojan".

export function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]/g, "")
}

export function isImpersonationName(name: string): boolean {
  const n = normalizeName(name)
  // "echa"/"ojan" como subcadena (Javi Echavarri / Javi Ojanguren);
  // "nadie" solo exacto para no bloquear fandom ("fandenadie")
  return n.includes("echa") || n.includes("ojan") || n === "nadie"
}
