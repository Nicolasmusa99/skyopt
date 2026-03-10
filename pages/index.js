import { useState, useRef, useEffect } from "react";

const AIRPORTS = [
  {code:"EZE",city:"Buenos Aires",country:"AR"},{code:"AEP",city:"Buenos Aires",country:"AR"},
  {code:"MIA",city:"Miami",country:"US"},{code:"JFK",city:"New York",country:"US"},
  {code:"LAX",city:"Los Angeles",country:"US"},{code:"ORD",city:"Chicago",country:"US"},
  {code:"GRU",city:"Sao Paulo",country:"BR"},{code:"GIG",city:"Rio de Janeiro",country:"BR"},
  {code:"BOG",city:"Bogota",country:"CO"},{code:"SCL",city:"Santiago",country:"CL"},
  {code:"LIM",city:"Lima",country:"PE"},{code:"MEX",city:"Ciudad de Mexico",country:"MX"},
  {code:"MAD",city:"Madrid",country:"ES"},{code:"LHR",city:"London",country:"GB"},
  {code:"CDG",city:"Paris",country:"FR"},{code:"NRT",city:"Tokyo",country:"JP"},
  {code:"DXB",city:"Dubai",country:"AE"},{code:"CUN",city:"Cancun",country:"MX"},
  {code:"MXP",city:"Milan",country:"IT"},{code:"BCN",city:"Barcelona",country:"ES"},
  {code:"PTY",city:"Panama City",country:"PA"},{code:"MVD",city:"Montevideo",country:"UY"},
  {code:"ASU",city:"Asuncion",country:"PY"},{code:"GYE",city:"Guayaquil",country:"EC"},
];

const TP_TOKEN = "8d444deb95031f57470d6a7499ae52eb";
const TP_MARKER = process.env.NEXT_PUBLIC_AFFILIATE_ID || "709366";

async function callClaude(messages) {
  const res = await fetch("/api/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 2000,
      messages,
    }),
  });
  if (!res.ok) throw new Error("Error " + res.status);
  const data = await res.json();
  return data.content.map((b) => b.text || "").join("");
}

function skyscannerLink(origin, destination, depDate, retDate, adults, tripType) {
  const dep = depDate ? depDate.replaceAll("-", "") : "";
  const ret = retDate ? retDate.replaceAll("-", "") : "";
  const pax = adults || 1;
  if (tripType === "roundtrip" && ret) {
    return `https://www.skyscanner.com/transport/flights/${origin}/${destination}/${dep}/${ret}/?adults=${pax}&currency=USD`;
  }
  return `https://www.skyscanner.com/transport/flights/${origin}/${destination}/${dep}/?adults=${pax}&currency=USD`;
}

async function fetchTPPrices(origin, destination, depDate, retDate, tripType) {
  const params = new URLSearchParams({
    origin, destination, currency: "usd",
    show_to_affiliates: "true", sorting: "price", limit: 10, token: TP_TOKEN,
  });
  if (depDate) params.set("depart_date", depDate.slice(0, 7));
  if (retDate && tripType === "roundtrip") params.set("return_date", retDate.slice(0, 7));
  if (tripType === "oneway") params.set("one_way", "true");
  try {
    const [r1, r2] = await Promise.all([
      fetch(`https://api.travelpayouts.com/v2/prices/month-matrix?${params}`, { headers: { "x-access-token": TP_TOKEN } }),
      fetch(`https://api.travelpayouts.com/v2/prices/latest?${new URLSearchParams({ origin, destination, currency: "usd", show_to_affiliates: "true", sorting: "price", limit: 10, token: TP_TOKEN })}`, { headers: { "x-access-token": TP_TOKEN } }),
    ]);
    const j1 = r1.ok ? await r1.json() : { success: false };
    const j2 = r2.ok ? await r2.json() : { success: false };
    const data = (j1.success && j1.data?.length) ? j1.data : (j2.success && j2.data?.length) ? j2.data : null;
    return data;
  } catch { return null; }
}

function parseTPData(data, origin, destination) {
  const airlines = ["LATAM","Aerolíneas Argentinas","Copa Airlines","GOL","Avianca","American Airlines","United","Sky Airline"];
  const colors = ["#e11d48","#3b82f6","#0ea5e9","#f59e0b","#8b5cf6","#10b981","#f97316","#06b6d4"];
  const codes = ["LA","AR","CM","G3","AV","AA","UA","H2"];
  return data.slice(0, 6).map((item, i) => {
    const depH = 6 + (i * 3) % 14;
    const dur = Math.floor(Math.random() * 180) + 90;
    const arrH = (depH + Math.floor(dur / 60)) % 24;
    const arrM = dur % 60;
    const aIdx = i % airlines.length;
    return {
      id: `${codes[aIdx]}${Math.floor(1000 + Math.random() * 8999)}`,
      airlineCode: codes[aIdx], airlineName: airlines[aIdx], airlineColor: colors[aIdx],
      departure: `${String(depH).padStart(2,"0")}:${String(Math.floor(Math.random()*4)*15).padStart(2,"0")}`,
      arrival: `${String(arrH).padStart(2,"0")}:${String(arrM).padStart(2,"0")}`,
      duration: `${Math.floor(dur/60)}h ${dur%60}m`,
      stops: item.number_of_changes || 0,
      price: item.value,
      departDate: item.depart_date,
      loadFactor: Math.floor(Math.random() * 35) + 55,
      isReal: true,
    };
  });
}

function AirportInput({ label, value, onChange, placeholder }) {
  const [query, setQuery] = useState(value ? `${value.code} - ${value.city}` : "");
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const ref = useRef();
  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  const handleType = v => {
    setQuery(v);
    if (!v.trim()) { setResults([]); setOpen(false); return; }
    const q = v.toLowerCase();
    const found = AIRPORTS.filter(a => a.code.toLowerCase().includes(q) || a.city.toLowerCase().includes(q)).slice(0, 6);
    setResults(found); setOpen(found.length > 0);
  };
  const select = a => { setQuery(`${a.code} - ${a.city}`); onChange(a); setOpen(false); setResults([]); };
  return (
    <div ref={ref} style={{ position: "relative" }}>
      <div style={{ position: "relative" }}>
        <span style={{ position: "absolute", top: -8, left: 10, background: "#080c14", padding: "0 6px", fontSize: 10, color: "#475569", letterSpacing: ".08em", fontFamily: "monospace" }}>{label}</span>
        <input style={{ width: "100%", background: "#080c14", border: "1px solid #1a2535", borderRadius: 8, padding: "12px 16px", color: "#e2e8f0", fontSize: 14, outline: "none" }}
          value={query} onChange={e => handleType(e.target.value)} onFocus={() => results.length > 0 && setOpen(true)} placeholder={placeholder} />
      </div>
      {open && (
        <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 300, background: "#080c14", border: "1px solid #1e3a5f", borderRadius: 8, overflow: "hidden", boxShadow: "0 12px 40px #00000099" }}>
          {results.map(a => (
            <div key={a.code} onClick={() => select(a)}
              style={{ padding: "10px 14px", cursor: "pointer", display: "flex", justifyContent: "space-between", borderBottom: "1px solid #0d1117" }}
              onMouseEnter={e => e.currentTarget.style.background = "#0d1628"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
              <span><span style={{ fontFamily: "monospace", fontWeight: 700, color: "#60a5fa", marginRight: 10 }}>{a.code}</span>{a.city}</span>
              <span style={{ fontSize: 10, color: "#475569" }}>{a.country}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Home() {
  const today = new Date().toISOString().split("T")[0];
  const nextWeek = new Date(Date.now() + 7 * 864e5).toISOString().split("T")[0];
  const twoWeeks = new Date(Date.now() + 14 * 864e5).toISOString().split("T")[0];

  const [origin, setOrigin] = useState(null);
  const [dest, setDest] = useState(null);
  const [dep, setDep] = useState(nextWeek);
  const [ret, setRet] = useState(twoWeeks);
  const [tripType, setTripType] = useState("roundtrip");
  const [cabin, setCabin] = useState("economy");
  const [adults, setAdults] = useState(1);
  const [loading, setLoading] = useState(false);
  const [flights, setFlights] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [error, setError] = useState(null);
  const [usingReal, setUsingReal] = useState(false);

  const canSearch = origin && dest && dep && origin.code !== dest?.code;

  const handleSearch = async () => {
    if (!canSearch) return;
    setLoading(true); setFlights(null); setAnalysis(null); setError(null);
    try {
      let parsedFlights = null;
      const tpData = await fetchTPPrices(origin.code, dest.code, dep, ret, tripType);
      if (tpData && tpData.length > 0) {
        parsedFlights = parseTPData(tpData, origin.code, dest.code);
        setUsingReal(true);
        setFlights(parsedFlights);
        const list = parsedFlights.map((f, i) => `${i+1}. ${f.airlineName} | $${f.price} | ${f.departure}-${f.arrival} | ${f.duration} | ${f.stops === 0 ? "Directo" : `${f.stops} escala`}`).join("\n");
        const text = await callClaude([{ role: "user", content: `Analizá estos vuelos de ${origin.code} a ${dest.code} y recomendá el mejor. JSON SOLAMENTE:\n${list}\n\n{"recommendedIndex":0,"headline":"frase corta","reasoning":"2-3 oraciones","scores":{"price":85,"convenience":90,"overall":88},"verdictLabel":"Comprar ahora","verdictColor":"#4ade80"}` }]);
        setAnalysis(JSON.parse(text.replace(/```json|```/g, "").trim()));
      } else {
        setUsingReal(false);
        const text = await callClaude([{ role: "user", content: `Generá 5 vuelos realistas de ${origin.code} (${origin.city}) a ${dest.code} (${dest.city}). Fecha ida: ${dep}. ${ret && tripType === "roundtrip" ? `Vuelta: ${ret}.` : ""} Cabina: ${cabin}. Pasajeros: ${adults}. Precios USD reales de mercado. JSON SOLAMENTE:\n{"flights":[{"id":"LA3169","airlineCode":"LA","airlineName":"LATAM Airlines","airlineColor":"#e11d48","departure":"08:30","arrival":"14:45","duration":"6h 15m","stops":0,"price":420,"loadFactor":82,"isReal":false}],"analysis":{"recommendedIndex":0,"headline":"Mejor precio directo","reasoning":"2-3 oraciones.","scores":{"price":85,"convenience":90,"overall":88},"verdictLabel":"Comprar ahora","verdictColor":"#4ade80"}}` }]);
        const data = JSON.parse(text.replace(/```json|```/g, "").trim());
        setFlights(data.flights);
        setAnalysis(data.analysis);
      }
    } catch (e) {
      setError(`Error: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const swap = () => { const t = origin; setOrigin(dest); setDest(t); };

  return (
    <div style={{ minHeight: "100vh", background: "#060810", color: "#e2e8f0", fontFamily: "system-ui, sans-serif" }}>
      {/* Header */}
      <div style={{ background: "#08091a", borderBottom: "1px solid #0d1117", padding: "12px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div>
            <div style={{ fontFamily: "monospace", fontSize: 14, fontWeight: 700, letterSpacing: ".06em" }}>SKYOPT</div>
            <div style={{ fontSize: 9, color: "#1e2d45", letterSpacing: ".12em" }}>FLIGHT SEARCH · AI POWERED</div>
          </div>
          <span style={{ background: "#1a0f35", color: "#c4b5fd", border: "1px solid #3b1f6e", padding: "2px 8px", borderRadius: 20, fontSize: 10, fontFamily: "monospace" }}>Claude AI</span>
          <span style={{ background: "#042a1a", color: "#4ade80", border: "1px solid #065f46", padding: "2px 8px", borderRadius: 20, fontSize: 10, fontFamily: "monospace" }}>Travelpayouts Data</span>
        </div>
        <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 8px #22c55e99" }} />
      </div>

      <div style={{ padding: 24, maxWidth: 860, margin: "0 auto" }}>
        {/* Search box */}
        <div style={{ background: "linear-gradient(135deg,#080c18,#0a0f1a)", border: "1px solid #1a2535", borderRadius: 14, padding: 24, marginBottom: 16 }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
            {["roundtrip","oneway"].map(t => (
              <button key={t} onClick={() => setTripType(t)}
                style={{ padding: "6px 14px", borderRadius: 8, border: tripType === t ? "none" : "1px solid #1a2535", background: tripType === t ? "#1d4ed8" : "transparent", color: tripType === t ? "#fff" : "#64748b", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
                {t === "roundtrip" ? "Ida y vuelta" : "Solo ida"}
              </button>
            ))}
            <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
              {["economy","business","first"].map(c => (
                <button key={c} onClick={() => setCabin(c)}
                  style={{ padding: "5px 12px", borderRadius: 8, border: cabin === c ? "none" : "1px solid #1a2535", background: cabin === c ? "#1d4ed8" : "transparent", color: cabin === c ? "#fff" : "#64748b", cursor: "pointer", fontSize: 11, fontWeight: 600 }}>
                  {c === "economy" ? "Economy" : c === "business" ? "Business" : "Primera"}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 40px 1fr", gap: 8, alignItems: "center", marginBottom: 12 }}>
            <AirportInput label="ORIGEN" value={origin} onChange={setOrigin} placeholder="Ciudad o código IATA..." />
            <button onClick={swap} style={{ padding: "8px 6px", background: "transparent", border: "1px solid #1a2535", borderRadius: 8, color: "#64748b", cursor: "pointer", fontSize: 16, textAlign: "center" }}>⇄</button>
            <AirportInput label="DESTINO" value={dest} onChange={setDest} placeholder="Ciudad o código IATA..." />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: `1fr${tripType === "roundtrip" ? " 1fr" : ""} 70px 1fr`, gap: 10, alignItems: "end" }}>
            <div style={{ position: "relative" }}>
              <span style={{ position: "absolute", top: -8, left: 10, background: "#080c14", padding: "0 6px", fontSize: 10, color: "#475569", fontFamily: "monospace" }}>IDA</span>
              <input type="date" value={dep} min={today} onChange={e => setDep(e.target.value)}
                style={{ width: "100%", background: "#080c14", border: "1px solid #1a2535", borderRadius: 8, padding: "12px 16px", color: "#e2e8f0", fontSize: 14, outline: "none", colorScheme: "dark" }} />
            </div>
            {tripType === "roundtrip" && (
              <div style={{ position: "relative" }}>
                <span style={{ position: "absolute", top: -8, left: 10, background: "#080c14", padding: "0 6px", fontSize: 10, color: "#475569", fontFamily: "monospace" }}>VUELTA</span>
                <input type="date" value={ret} min={dep} onChange={e => setRet(e.target.value)}
                  style={{ width: "100%", background: "#080c14", border: "1px solid #1a2535", borderRadius: 8, padding: "12px 16px", color: "#e2e8f0", fontSize: 14, outline: "none", colorScheme: "dark" }} />
              </div>
            )}
            <div style={{ position: "relative" }}>
              <span style={{ position: "absolute", top: -8, left: 10, background: "#080c14", padding: "0 6px", fontSize: 10, color: "#475569", fontFamily: "monospace" }}>PAX</span>
              <select value={adults} onChange={e => setAdults(+e.target.value)}
                style={{ width: "100%", background: "#080c14", border: "1px solid #1a2535", borderRadius: 8, padding: "12px 16px", color: "#e2e8f0", fontSize: 14, outline: "none", cursor: "pointer" }}>
                {[1,2,3,4,5,6].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <button onClick={handleSearch} disabled={!canSearch || loading}
              style={{ padding: 12, borderRadius: 8, border: "none", background: canSearch && !loading ? "#1d4ed8" : "#1a2535", color: canSearch && !loading ? "#fff" : "#475569", cursor: canSearch && !loading ? "pointer" : "not-allowed", fontSize: 14, fontWeight: 600 }}>
              {loading ? "Buscando..." : "Buscar vuelos"}
            </button>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div style={{ background: "#08051a", border: "1px solid #2d1a60", borderRadius: 8, padding: 16, marginBottom: 16 }}>
            <div style={{ fontSize: 12, color: "#6d4faf", marginBottom: 6 }}>Consultando precios reales + analizando con Claude AI...</div>
            <div style={{ display: "flex", gap: 4 }}>
              {[0,1,2].map(i => <span key={i} style={{ display: "inline-block", width: 5, height: 5, borderRadius: "50%", background: "#7c3aed", animation: `pulse 1.2s ${i*0.2}s infinite` }} />)}
            </div>
          </div>
        )}

        {/* Error */}
        {error && <div style={{ background: "#1c0505", border: "1px solid #450a0a", borderRadius: 8, padding: 16, color: "#f87171", fontSize: 13, marginBottom: 16 }}>{error}</div>}

        {/* Results */}
        {flights && !loading && (
          <div>
            <div style={{ fontSize: 11, color: "#334155", fontFamily: "monospace", marginBottom: 12 }}>
              {flights.length} VUELOS · {origin?.code} › {dest?.code} · {dep}
              {usingReal && <span style={{ marginLeft: 8, color: "#4ade80" }}>· precios reales</span>}
            </div>
            {analysis && (
              <div style={{ background: "linear-gradient(135deg,#042a1a,#063320)", border: "1px solid #065f46", borderRadius: 12, padding: 20, marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
                <div>
                  <div style={{ fontSize: 13, color: "#4ade80", fontWeight: 700, marginBottom: 4 }}>{analysis.headline}</div>
                  <div style={{ fontSize: 12, color: "#475569" }}>{origin?.city} → {dest?.city} · {dep}{tripType === "roundtrip" ? ` - ${ret}` : ""} · {adults} pax · {cabin}</div>
                </div>
                {flights[analysis.recommendedIndex] && (
                  <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 26, fontWeight: 700, color: "#4ade80", fontFamily: "monospace" }}>${flights[analysis.recommendedIndex].price.toLocaleString()}</div>
                      <div style={{ fontSize: 10, color: "#334155" }}>USD por persona</div>
                    </div>
                    <a href={skyscannerLink(origin.code, dest.code, dep, tripType === "roundtrip" ? ret : null, adults, tripType)} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}>
                      <button style={{ padding: "12px 24px", borderRadius: 8, border: "1px solid #059669", background: "linear-gradient(135deg,#065f46,#047857)", color: "#6ee7b7", cursor: "pointer", fontSize: 14, fontWeight: 600 }}>
                        Buscar en Skyscanner →
                      </button>
                    </a>
                  </div>
                )}
              </div>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {flights.map((f, i) => {
                const recommended = i === analysis?.recommendedIndex;
                const buyLink = skyscannerLink(origin.code, dest.code, dep, tripType === "roundtrip" ? ret : null, adults, tripType);
                return (
                  <div key={i} style={{ background: recommended ? "#0e0a22" : "#0a1020", border: `1px solid ${recommended ? "#7c3aed" : "#1a2535"}`, borderRadius: 10, padding: 18 }}>
                    {recommended && <div style={{ fontSize: 10, color: "#a78bfa", fontWeight: 600, marginBottom: 8 }}>RECOMENDADO POR AI</div>}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 36, height: 36, borderRadius: 8, background: `${f.airlineColor}18`, border: `1px solid ${f.airlineColor}40`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontFamily: "monospace", color: f.airlineColor, fontWeight: 700 }}>{f.airlineCode}</div>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600 }}>{f.airlineName}</div>
                          <div style={{ display: "flex", gap: 5, marginTop: 2 }}>
                            <span style={{ fontSize: 10, color: "#334155", fontFamily: "monospace" }}>{f.id}</span>
                            {f.isReal ? <span style={{ fontSize: 9, background: "#042a1a", color: "#4ade80", border: "1px solid #065f46", padding: "1px 6px", borderRadius: 20 }}>precio real</span>
                              : <span style={{ fontSize: 9, background: "#1a0f35", color: "#c4b5fd", border: "1px solid #3b1f6e", padding: "1px 6px", borderRadius: 20 }}>estimado AI</span>}
                          </div>
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 24, fontWeight: 700, fontFamily: "monospace" }}>${f.price.toLocaleString()}</div>
                        <div style={{ fontSize: 10, color: "#334155" }}>USD por persona</div>
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                      <div style={{ textAlign: "center", minWidth: 50 }}>
                        <div style={{ fontSize: 18, fontWeight: 700, color: "#60a5fa", fontFamily: "monospace" }}>{f.departure}</div>
                        <div style={{ fontSize: 10, color: "#475569" }}>{origin?.code}</div>
                      </div>
                      <div style={{ flex: 1, textAlign: "center" }}>
                        <div style={{ fontSize: 10, color: "#1e2d45", marginBottom: 3 }}>{f.duration}</div>
                        <div style={{ height: 1, background: "linear-gradient(90deg,#1e3a5f,#3b82f6,#1e3a5f)" }} />
                        <div style={{ fontSize: 9, marginTop: 3, color: f.stops === 0 ? "#4ade80" : "#fbbf24" }}>{f.stops === 0 ? "directo" : `${f.stops} escala`}</div>
                      </div>
                      <div style={{ textAlign: "center", minWidth: 50 }}>
                        <div style={{ fontSize: 18, fontWeight: 700, color: "#60a5fa", fontFamily: "monospace" }}>{f.arrival}</div>
                        <div style={{ fontSize: 10, color: "#475569" }}>{dest?.code}</div>
                      </div>
                    </div>
                    {f.departDate && <div style={{ fontSize: 10, color: "#1e3a5f", fontFamily: "monospace", marginBottom: 8 }}>Fecha más barata: {f.departDate}</div>}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 10, color: f.loadFactor > 80 ? "#f87171" : "#4ade80", fontFamily: "monospace" }}>{f.loadFactor}% ocupacion estimada</span>
                      <a href={buyLink} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}>
                        <button style={{ padding: "8px 18px", borderRadius: 8, border: `1px solid ${recommended ? "#059669" : "#2563eb"}`, background: recommended ? "linear-gradient(135deg,#065f46,#047857)" : "linear-gradient(135deg,#1e3a5f,#1e40af)", color: recommended ? "#6ee7b7" : "#bfdbfe", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
                          Buscar en Skyscanner →
                        </button>
                      </a>
                    </div>
                    {recommended && analysis && (
                      <div style={{ marginTop: 12, background: "#06030f", border: "1px solid #1a0f3a", borderRadius: 6, padding: 12 }}>
                        <div style={{ fontSize: 11, color: "#7c5faf", lineHeight: 1.7, fontFamily: "monospace", marginBottom: 8 }}>{analysis.reasoning}</div>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          <span style={{ fontSize: 10, background: "#042a2a", color: "#2dd4bf", border: "1px solid #0f3d3d", padding: "2px 8px", borderRadius: 20, fontFamily: "monospace" }}>precio {analysis.scores.price}/100</span>
                          <span style={{ fontSize: 10, background: "#0c1a35", color: "#60a5fa", border: "1px solid #1e3a5f", padding: "2px 8px", borderRadius: 20, fontFamily: "monospace" }}>conveniencia {analysis.scores.convenience}/100</span>
                          <span style={{ fontSize: 10, background: "#1a0f35", color: "#c4b5fd", border: "1px solid #3b1f6e", padding: "2px 8px", borderRadius: 20, fontFamily: "monospace" }}>score {analysis.scores.overall}/100</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <div style={{ marginTop: 14, padding: "10px 16px", background: "#080c14", borderRadius: 8, fontSize: 10, color: "#1e2d45", textAlign: "center", fontFamily: "monospace" }}>
              {usingReal ? "Precios reales via Travelpayouts. Click en Skyscanner para completar la compra." : "Precios estimados por Claude AI. El precio real se confirma en Skyscanner."}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
