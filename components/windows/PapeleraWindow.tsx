export function PapeleraContent() {
  const songs = [
    "reino.wav",
    "siempre_estamos_igual.mp3",
    "el_momento.wav",
  ]

  return (
    <div style={{ fontFamily: "Tahoma, sans-serif", fontSize: 12, padding: 8 }}>
      <div style={{ padding: "4px 8px", borderBottom: "1px solid #ccc", marginBottom: 8, color: "#666", fontStyle: "italic" }}>
        Aquí están las canciones que nunca escucharéis
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {songs.map((s, i) => (
          <div key={i} style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "3px 8px", cursor: "default",
            borderRadius: 2,
          }}
            onMouseEnter={e => (e.currentTarget.style.background = "#e8e8e8")}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
          >
            <span style={{ fontSize: 14 }}>🎵</span>
            <span>{s}</span>
            <span style={{ marginLeft: "auto", color: "#999", fontSize: 10 }}>
              {Math.floor(Math.random() * 4 + 1)}:{String(Math.floor(Math.random() * 60)).padStart(2, "0")}
            </span>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 12, padding: "4px 8px", borderTop: "1px solid #ccc", color: "#888", fontSize: 10 }}>
        {songs.length} elementos
      </div>
    </div>
  )
}
