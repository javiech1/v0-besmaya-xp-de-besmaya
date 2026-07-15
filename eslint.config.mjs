import nextCoreWebVitals from "eslint-config-next/core-web-vitals"

// Primera adopcion de ESLint sobre codigo existente. Las reglas nuevas y muy
// estrictas del React Compiler que Next 16 activa por defecto (set-state-in-effect,
// purity, refs, immutability...) disparan en patrones que ya funcionan en
// produccion; las dejamos como warning (visibles, no bloquean el lint) para
// ir limpiandolas sin frenar el desarrollo. El codigo nuevo si deberia evitarlas.
const config = [
  { ignores: [".next/**", "node_modules/**", "supabase/**", "**/* 2.*"] },
  ...nextCoreWebVitals,
  {
    rules: {
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/purity": "warn",
      "react-hooks/refs": "warn",
      "react-hooks/immutability": "warn",
      "react-hooks/exhaustive-deps": "warn",
    },
  },
]

export default config
