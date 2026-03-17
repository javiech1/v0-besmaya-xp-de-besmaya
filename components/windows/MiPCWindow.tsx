export function MiPCContent() {
  const drives = [
    { icon: "💾", name: "Disco Local (C:)", detail: "100% ocupado por canciones de Besmaya", used: 100 },
    { icon: "💿", name: "Disco Local (D:)", detail: "Solo caben los recuerdos de los directos", used: 87 },
    { icon: "📀", name: "Unidad de CD (E:)", detail: "La vida de Nadie (reproduciendo en bucle)", used: 100 },
    { icon: "💾", name: "Disco Extraíble (F:)", detail: "Backup de muletillas de Nadie", used: 42 },
  ]

  return (
    <div style={{ fontFamily: "Tahoma, sans-serif", fontSize: 12, padding: 8 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 8px", borderBottom: "1px solid #ccc", marginBottom: 8, color: "#666" }}>
        <span>📂</span>
        <span>Dirección: <b style={{ color: "#000" }}>Mi PC</b></span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {drives.map((d) => (
          <div key={d.name} style={{
            border: "1px solid #ddd", borderRadius: 2, padding: 8,
            display: "flex", alignItems: "center", gap: 10,
            cursor: "default",
          }}>
            <span style={{ fontSize: 28 }}>{d.icon}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: "bold", marginBottom: 2 }}>{d.name}</div>
              <div style={{ color: "#666", marginBottom: 4 }}>{d.detail}</div>
              <div style={{ background: "#ddd", height: 12, borderRadius: 2, overflow: "hidden" }}>
                <div style={{
                  background: d.used >= 90 ? "#c00" : "#3366cc",
                  height: "100%",
                  width: `${d.used}%`,
                  transition: "width 0.5s",
                }} />
              </div>
              <div style={{ fontSize: 10, color: "#888", marginTop: 2 }}>
                {d.used}% utilizado
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
