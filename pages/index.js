import { useState, useRef, useEffect } from 'react';
import Head from 'next/head';
import { AIRPORTS, buildAffiliateLink, formatDuration } from '../lib/airports';

// ── Styles ────────────────────────────────────────────────────────────────────
const S = {
  badge: (variant) => {
    const variants = {
      green:  'bg:#052e16;color:#4ade80;border:1px solid #14532d',
      purple: 'bg:#1a0f35;color:#c4b5fd;border:1px solid #3b1f6e',
      blue:   'bg:#0c1a35;color:#60a5fa;border:1px solid #1e3a5f',
      teal:   'bg:#042a2a;color:#2dd4bf;border:1px solid #0f3d3d',
      orange: 'bg:#1c0e00;color:#fb923c;border:1px solid #431400',
      gray:   'bg:#161c27;color:#94a3b8;border:1px solid #2a3441',
      real:   'bg:#042a1a;color:#4ade80;border:1px solid #065f46',
      ai:     'bg:#1a0f35;color:#c4b5fd;border:1px solid #3b1f6e',
    };
    return variants[variant] || variants.gray;
  }
};

// ── AI Search (via server-side API route) ─────────────────────────────────────
async function searchFlightsAI(from, to, fromCity, toCity, dep, ret, adults, cabin) {
  const prompt = `Generá 5 vuelos realistas de ${from} (${fromCity}) a ${to} (${toCity}).
Fecha ida: ${dep}. ${ret ? `Vuelta: ${ret}.` : 'Solo ida.'} Cabina: ${cabin}. Pasajeros: ${adults}.
Usá aerolineas reales que operan esa ruta. Precios de mercado actuales en USD.

Respondé SOLO con JSON valido:
{
  "flights": [{
    "id": "LA3169",
    "airlineCode": "LA",
    "airlineName": "LATAM Airlines",
    "airlineColor": "#e11d48",
    "departure": "08:30",
    "arrival": "14:45",
    "duration": "6h 15m",
    "stops": 0,
    "stopCity": null,
    "price": 420,
    "loadFactor": 82,
    "returnDeparture": "19:00",
    "returnArrival": "23:55",
    "returnDuration": "4h 55m",
    "returnStops": 0
  }],
  "analysis": {
    "recommendedIndex": 0,
    "verdict": "buy_now",
    "verdictLabel": "Comprar ahora",
    "verdictColor": "#4ade80",
    "headline": "Mejor precio directo del dia",
    "reasoning": "Explicacion de 2-3 oraciones.",
    "trap": null,
    "scores": { "price": 85, "convenience": 90, "overall": 88 }
  }
}`;

  const res = await fetch('/api/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt }),
  });
  if (!res.ok) throw new Error(`Error ${res.status}`);
  return res.json();
}

// ── AirportInput ──────────────────────────────────────────────────────────────
function AirportInput({ label, value, onChange, placeholder }) {
  const [query, setQuery] = useState(value ? `${value.code} - ${value.city}` : '');
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const ref = useRef();

  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const handleType = v => {
    setQuery(v);
    if (!v.trim()) { setResults([]); setOpen(false); return; }
    const q = v.toLowerCase();
    const found = AIRPORTS.filter(a =>
      a.code.toLowerCase().includes(q) || a.city.toLowerCase().includes(q)
    ).slice(0, 6);
    setResults(found);
    setOpen(found.length > 0);
  };

  const select = a => {
    setQuery(`${a.code} - ${a.city}`);
    onChange(a);
    setOpen(false);
    setResults([]);
  };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <div style={{ position: 'relative' }}>
        <span style={{
          position: 'absolute', top: -8, left: 10,
          background: '#080c14', padding: '0 6px',
          fontSize: 10, color: '#475569', letterSpacing: '.08em',
          fontFamily: 'JetBrains Mono, monospace', zIndex: 1
        }}>{label}</span>
        <input
          value={query}
          onChange={e => handleType(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder={placeholder}
          style={{
            width: '100%', background: '#080c14', border: '1px solid #1a2535',
            borderRadius: 8, padding: '12px 16px', color: '#e2e8f0',
            fontFamily: 'Space Grotesk, sans-serif', fontSize: 14, outline: 'none'
          }}
        />
      </div>
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 300,
          background: '#080c14', border: '1px solid #1e3a5f', borderRadius: 8,
          overflow: 'hidden', boxShadow: '0 12px 40px #00000099'
        }}>
          {results.map(a => (
            <div key={a.code} onClick={() => select(a)}
              style={{
                padding: '10px 14px', cursor: 'pointer', display: 'flex',
                justifyContent: 'space-between', alignItems: 'center',
                borderBottom: '1px solid #0d1117', transition: 'background .1s'
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#0d1628'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <div>
                <span style={{ fontFamily: 'JetBrains Mono', fontSize: 13, fontWeight: 700, color: '#60a5fa', marginRight: 10 }}>{a.code}</span>
                <span style={{ fontSize: 13 }}>{a.city}</span>
              </div>
              <span style={{
                display: 'inline-flex', padding: '3px 9px', borderRadius: 20,
                fontSize: 10, fontFamily: 'JetBrains Mono', fontWeight: 500,
                background: '#161c27', color: '#94a3b8', border: '1px solid #2a3441'
              }}>{a.country}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── FlightCard ────────────────────────────────────────────────────────────────
function FlightCard({ flight, recommended, selected, onClick, analysis, from, to, dep, ret, adults, cabin }) {
  const [reasonOpen, setReasonOpen] = useState(false);
  const lfc = flight.loadFactor > 80 ? '#f87171' : flight.loadFactor < 60 ? '#fbbf24' : '#4ade80';

  return (
    <div onClick={onClick} style={{
      background: recommended ? '#0e0a22' : '#0a1020',
      border: `1px solid ${recommended ? '#7c3aed' : selected ? '#3b82f6' : '#1a2535'}`,
      borderRadius: 10, padding: 18, cursor: 'pointer', transition: 'all .2s',
    }}>
      {recommended && analysis && (
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 10, flexWrap: 'wrap' }}>
          <span style={{
            display: 'inline-flex', padding: '3px 9px', borderRadius: 20, fontSize: 10,
            fontFamily: 'JetBrains Mono', fontWeight: 500, letterSpacing: '.05em',
            background: '#1a0f35', color: '#c4b5fd', border: '1px solid #3b1f6e'
          }}>RECOMENDADO POR AI</span>
          <span style={{ fontSize: 11, color: '#a78bfa', fontWeight: 600 }}>{analysis.headline}</span>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 8, flexShrink: 0,
            background: `${flight.airlineColor}18`, border: `1px solid ${flight.airlineColor}40`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 10, fontFamily: 'JetBrains Mono', color: flight.airlineColor, fontWeight: 700
          }}>{flight.airlineCode}</div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{flight.airlineName}</div>
            <div style={{ display: 'flex', gap: 5, marginTop: 2, alignItems: 'center' }}>
              <span style={{ fontFamily: 'JetBrains Mono', fontSize: 10, color: '#334155' }}>{flight.id}</span>
              <span style={{
                display: 'inline-flex', padding: '2px 7px', borderRadius: 20, fontSize: 9,
                fontFamily: 'JetBrains Mono', background: '#042a1a', color: '#4ade80', border: '1px solid #065f46'
              }}>estimado AI</span>
            </div>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontFamily: 'JetBrains Mono', fontSize: 24, fontWeight: 700 }}>${flight.price.toLocaleString()}</div>
          <div style={{ fontSize: 10, color: '#334155' }}>USD · {cabin} · {adults} pax</div>
        </div>
      </div>

      {/* Route */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <div style={{ textAlign: 'center', minWidth: 50 }}>
          <div style={{ fontFamily: 'JetBrains Mono', fontSize: 18, fontWeight: 700, color: '#60a5fa' }}>{flight.departure}</div>
          <div style={{ fontSize: 10, color: '#475569' }}>{from}</div>
        </div>
        <div style={{ flex: 1, textAlign: 'center' }}>
          <div style={{ fontSize: 10, color: '#1e2d45', marginBottom: 3 }}>{flight.duration}</div>
          <div style={{ height: 1, background: 'linear-gradient(90deg,#1e3a5f,#3b82f6,#1e3a5f)' }} />
          <div style={{ fontSize: 9, marginTop: 3, color: flight.stops === 0 ? '#4ade80' : '#fbbf24' }}>
            {flight.stops === 0 ? 'directo' : flight.stopCity ? `1 escala (${flight.stopCity})` : `${flight.stops} escalas`}
          </div>
        </div>
        <div style={{ textAlign: 'center', minWidth: 50 }}>
          <div style={{ fontFamily: 'JetBrains Mono', fontSize: 18, fontWeight: 700, color: '#60a5fa' }}>{flight.arrival}</div>
          <div style={{ fontSize: 10, color: '#475569' }}>{to}</div>
        </div>
      </div>

      {/* Return */}
      {flight.returnDeparture && (
        <div style={{
          background: '#060e1e', border: '1px solid #0f1d35', borderRadius: 6,
          padding: '8px 12px', marginBottom: 10,
          display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap'
        }}>
          <span style={{ fontSize: 9, color: '#1e3a5f', fontFamily: 'JetBrains Mono', minWidth: 40 }}>VUELTA</span>
          <span style={{ fontFamily: 'JetBrains Mono', fontSize: 12, color: '#475569' }}>{flight.returnDeparture}</span>
          <span style={{ fontSize: 9, color: '#1e2d45' }}>—</span>
          <span style={{ fontFamily: 'JetBrains Mono', fontSize: 12, color: '#475569' }}>{flight.returnArrival}</span>
          <span style={{ fontSize: 10, color: '#1e2d45' }}>{flight.returnDuration}</span>
          <span style={{ fontSize: 9, color: flight.returnStops === 0 ? '#4ade80' : '#fbbf24' }}>
            {flight.returnStops === 0 ? 'directo' : `${flight.returnStops} escala`}
          </span>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <span style={{ fontSize: 10, color: lfc, fontFamily: 'JetBrains Mono' }}>{flight.loadFactor}% ocupacion estimada</span>
        {recommended && (
          <a href={buildAffiliateLink(from, to, dep, ret, adults, cabin)}
            target="_blank" rel="noopener noreferrer"
            style={{ textDecoration: 'none' }}
            onClick={e => e.stopPropagation()}>
            <button style={{
              background: 'linear-gradient(135deg,#065f46,#047857)', color: '#6ee7b7',
              border: '1px solid #059669', borderRadius: 8, padding: '8px 18px',
              fontSize: 12, fontFamily: 'Space Grotesk', fontWeight: 600, cursor: 'pointer'
            }}>Comprar en Kiwi.com →</button>
          </a>
        )}
      </div>

      {/* AI Analysis */}
      {recommended && analysis && (
        <div style={{ marginTop: 12 }}>
          <div style={{ background: '#06030f', border: '1px solid #1a0f3a', borderRadius: 6, padding: 12, marginBottom: 10 }}>
            <div
              onClick={e => { e.stopPropagation(); setReasonOpen(!reasonOpen); }}
              style={{ fontSize: 10, color: '#3d2470', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <span style={{
                display: 'inline-flex', padding: '2px 8px', borderRadius: 20, fontSize: 9,
                fontFamily: 'JetBrains Mono', background: '#1a0f35', color: '#c4b5fd', border: '1px solid #3b1f6e'
              }}>AI REASONING</span>
              <span>{reasonOpen ? 'ocultar' : 'ver razonamiento'}</span>
            </div>
            {reasonOpen && (
              <div style={{ fontSize: 11, color: '#7c5faf', lineHeight: 1.7, fontFamily: 'JetBrains Mono' }}>
                {analysis.reasoning}
                {analysis.trap && (
                  <div style={{ background: '#1c0a00', border: '1px solid #431400', borderRadius: 5, padding: '8px 10px', marginTop: 8 }}>
                    <span style={{ fontSize: 10, color: '#fb923c', fontFamily: 'JetBrains Mono', marginRight: 6 }}>ATENCION:</span>
                    <span style={{ fontSize: 11, color: '#fb923c' }}>{analysis.trap}</span>
                  </div>
                )}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {[
              { label: `precio ${analysis.scores.price}/100`, v: 'teal' },
              { label: `conveniencia ${analysis.scores.convenience}/100`, v: 'blue' },
              { label: `score ${analysis.scores.overall}/100`, v: 'purple' },
            ].map(({ label, v }) => (
              <span key={label} style={{
                display: 'inline-flex', padding: '3px 9px', borderRadius: 20, fontSize: 10,
                fontFamily: 'JetBrains Mono', fontWeight: 500,
                ...(v === 'teal' ? { background: '#042a2a', color: '#2dd4bf', border: '1px solid #0f3d3d' }
                  : v === 'blue' ? { background: '#0c1a35', color: '#60a5fa', border: '1px solid #1e3a5f' }
                  : { background: '#1a0f35', color: '#c4b5fd', border: '1px solid #3b1f6e' })
              }}>{label}</span>
            ))}
            <span style={{
              fontSize: 10, fontFamily: 'JetBrains Mono',
              color: analysis.verdictColor || '#94a3b8',
              border: `1px solid ${analysis.verdictColor || '#94a3b8'}33`,
              padding: '2px 8px', borderRadius: 20,
              background: `${analysis.verdictColor || '#94a3b8'}11`
            }}>{analysis.verdictLabel}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function Home() {
  const today = new Date().toISOString().split('T')[0];
  const nextWeek = new Date(Date.now() + 7 * 864e5).toISOString().split('T')[0];
  const twoWeeks = new Date(Date.now() + 14 * 864e5).toISOString().split('T')[0];

  const [origin, setOrigin] = useState(null);
  const [dest, setDest] = useState(null);
  const [dep, setDep] = useState(nextWeek);
  const [ret, setRet] = useState(twoWeeks);
  const [tripType, setTripType] = useState('roundtrip');
  const [cabin, setCabin] = useState('economy');
  const [adults, setAdults] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingLabel, setLoadingLabel] = useState('');
  const [flights, setFlights] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState(null);
  const [time, setTime] = useState('');

  useEffect(() => {
    const t = setInterval(() => {
      setTime(new Date().toLocaleTimeString('es-AR', { hour12: false }));
    }, 1000);
    setTime(new Date().toLocaleTimeString('es-AR', { hour12: false }));
    return () => clearInterval(t);
  }, []);

  const canSearch = origin && dest && dep && origin.code !== dest?.code;

  const handleSearch = async () => {
    if (!canSearch) return;
    setLoading(true); setFlights(null); setAnalysis(null); setSelected(null); setError(null);
    setLoadingLabel(`Claude buscando vuelos ${origin.code} › ${dest.code}...`);
    try {
      const data = await searchFlightsAI(
        origin.code, dest.code, origin.city, dest.city,
        dep, tripType === 'roundtrip' ? ret : null,
        adults, cabin
      );
      setFlights(data.flights);
      setAnalysis(data.analysis);
      setSelected(data.analysis.recommendedIndex);
    } catch (e) {
      setError(`Error: ${e.message}`);
    } finally {
      setLoading(false);
      setLoadingLabel('');
    }
  };

  const swap = () => { const t = origin; setOrigin(dest); setDest(t); };

  const btnStyle = (active) => ({
    padding: active ? '6px 14px' : '6px 14px',
    borderRadius: 8, border: active ? 'none' : '1px solid #1a2535',
    background: active ? '#1d4ed8' : 'transparent',
    color: active ? '#fff' : '#64748b',
    cursor: 'pointer', fontSize: 12,
    fontFamily: 'Space Grotesk, sans-serif', fontWeight: 600, transition: 'all .15s'
  });

  return (
    <>
      <Head>
        <title>SKYOPT — Buscador de vuelos con AI</title>
        <meta name="description" content="Buscá vuelos y dejá que la AI encuentre la mejor opción para vos." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div style={{ minHeight: '100vh', background: '#060810' }}>

        {/* Header */}
        <div style={{
          background: '#08091a', borderBottom: '1px solid #0d1117',
          padding: '12px 24px', display: 'flex', justifyContent: 'space-between',
          alignItems: 'center', flexWrap: 'wrap', gap: 8
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div>
              <div style={{ fontFamily: 'JetBrains Mono', fontSize: 14, fontWeight: 700, letterSpacing: '.06em' }}>SKYOPT</div>
              <div style={{ fontSize: 9, color: '#1e2d45', letterSpacing: '.12em' }}>FLIGHT SEARCH · AI POWERED</div>
            </div>
            <div style={{ height: 24, width: 1, background: '#0d1117' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{
                width: 7, height: 7, borderRadius: '50%', background: '#22c55e',
                display: 'inline-block', boxShadow: '0 0 8px #22c55e99',
                animation: 'pulse 1.5s infinite'
              }} />
              <span style={{ fontFamily: 'JetBrains Mono', fontSize: 10, color: '#22c55e' }}>LIVE</span>
            </div>
            <span style={{
              display: 'inline-flex', padding: '3px 9px', borderRadius: 20, fontSize: 10,
              fontFamily: 'JetBrains Mono', fontWeight: 500,
              background: '#1a0f35', color: '#c4b5fd', border: '1px solid #3b1f6e'
            }}>Claude AI</span>
          </div>
          <span style={{ fontFamily: 'JetBrains Mono', fontSize: 10, color: '#1e2d45' }}>{time} ART</span>
        </div>

        <div style={{ padding: 24, maxWidth: 860, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Search box */}
          <div style={{
            background: 'linear-gradient(135deg,#080c18,#0a0f1a)',
            border: '1px solid #1a2535', borderRadius: 14, padding: 24, position: 'relative', overflow: 'hidden'
          }}>
            {/* Trip type + cabin */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
              {['roundtrip', 'oneway'].map(t => (
                <button key={t} style={btnStyle(tripType === t)} onClick={() => setTripType(t)}>
                  {t === 'roundtrip' ? 'Ida y vuelta' : 'Solo ida'}
                </button>
              ))}
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {['economy', 'business', 'first'].map(c => (
                  <button key={c} style={{ ...btnStyle(cabin === c), fontSize: 11 }} onClick={() => setCabin(c)}>
                    {c === 'economy' ? 'Economy' : c === 'business' ? 'Business' : 'Primera'}
                  </button>
                ))}
              </div>
            </div>

            {/* Origin / Dest */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 40px 1fr', gap: 8, alignItems: 'center', marginBottom: 12 }}>
              <AirportInput label="ORIGEN" value={origin} onChange={setOrigin} placeholder="Ciudad o código IATA..." />
              <button onClick={swap} style={{
                ...btnStyle(false), padding: '8px 6px', fontSize: 16, textAlign: 'center'
              }}>⇄</button>
              <AirportInput label="DESTINO" value={dest} onChange={setDest} placeholder="Ciudad o código IATA..." />
            </div>

            {/* Dates + PAX + Search */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: tripType === 'roundtrip' ? '1fr 1fr 70px 1fr' : '1fr 70px 1fr',
              gap: 10, alignItems: 'end'
            }}>
              <div style={{ position: 'relative' }}>
                <span style={{
                  position: 'absolute', top: -8, left: 10, background: '#080c14',
                  padding: '0 6px', fontSize: 10, color: '#475569',
                  fontFamily: 'JetBrains Mono', letterSpacing: '.08em', zIndex: 1
                }}>IDA</span>
                <input type="date" value={dep} min={today} onChange={e => setDep(e.target.value)}
                  style={{
                    width: '100%', background: '#080c14', border: '1px solid #1a2535', borderRadius: 8,
                    padding: '12px 16px', color: '#e2e8f0', fontFamily: 'Space Grotesk', fontSize: 14,
                    outline: 'none', colorScheme: 'dark'
                  }} />
              </div>
              {tripType === 'roundtrip' && (
                <div style={{ position: 'relative' }}>
                  <span style={{
                    position: 'absolute', top: -8, left: 10, background: '#080c14',
                    padding: '0 6px', fontSize: 10, color: '#475569',
                    fontFamily: 'JetBrains Mono', letterSpacing: '.08em', zIndex: 1
                  }}>VUELTA</span>
                  <input type="date" value={ret} min={dep} onChange={e => setRet(e.target.value)}
                    style={{
                      width: '100%', background: '#080c14', border: '1px solid #1a2535', borderRadius: 8,
                      padding: '12px 16px', color: '#e2e8f0', fontFamily: 'Space Grotesk', fontSize: 14,
                      outline: 'none', colorScheme: 'dark'
                    }} />
                </div>
              )}
              <div style={{ position: 'relative' }}>
                <span style={{
                  position: 'absolute', top: -8, left: 10, background: '#080c14',
                  padding: '0 6px', fontSize: 10, color: '#475569',
                  fontFamily: 'JetBrains Mono', letterSpacing: '.08em', zIndex: 1
                }}>PAX</span>
                <select value={adults} onChange={e => setAdults(+e.target.value)}
                  style={{
                    width: '100%', background: '#080c14', border: '1px solid #1a2535', borderRadius: 8,
                    padding: '12px 16px', color: '#e2e8f0', fontFamily: 'Space Grotesk', fontSize: 14,
                    outline: 'none', cursor: 'pointer'
                  }}>
                  {[1, 2, 3, 4, 5, 6].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              <button
                onClick={handleSearch}
                disabled={!canSearch || loading}
                style={{
                  padding: 12, borderRadius: 8, border: 'none',
                  background: canSearch && !loading ? '#1d4ed8' : '#1a2535',
                  color: canSearch && !loading ? '#fff' : '#475569',
                  fontSize: 14, fontFamily: 'Space Grotesk', fontWeight: 600, cursor: canSearch && !loading ? 'pointer' : 'not-allowed'
                }}>
                {loading ? 'Buscando...' : 'Buscar vuelos'}
              </button>
            </div>

            {origin && dest && origin.code === dest?.code && (
              <div style={{ marginTop: 8, fontSize: 12, color: '#f87171' }}>Origen y destino no pueden ser iguales.</div>
            )}
          </div>

          {/* Loading */}
          {loading && (
            <div style={{ background: '#08051a', border: '1px solid #2d1a60', borderRadius: 8, padding: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span style={{
                  display: 'inline-flex', padding: '3px 9px', borderRadius: 20, fontSize: 10,
                  fontFamily: 'JetBrains Mono', background: '#1a0f35', color: '#c4b5fd', border: '1px solid #3b1f6e'
                }}>AI</span>
                <span style={{ fontSize: 12, color: '#6d4faf' }}>{loadingLabel}</span>
              </div>
              <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
                {[0, 200, 400].map(d => (
                  <span key={d} style={{
                    display: 'inline-block', width: 5, height: 5, borderRadius: '50%', background: '#7c3aed', margin: '0 2px',
                    animation: `thinking 1.2s infinite ${d}ms`
                  }} />
                ))}
                <span style={{ fontSize: 10, color: '#2d1560', marginLeft: 8, fontFamily: 'JetBrains Mono' }}>
                  analizando rutas, precios y conveniencia
                </span>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div style={{ background: '#1c0505', border: '1px solid #450a0a', borderRadius: 8, padding: 16, fontSize: 13, color: '#f87171' }}>
              {error}
            </div>
          )}

          {/* Results */}
          {flights && !loading && (
            <div style={{ animation: 'slideUp .35s ease forwards' }}>

              {/* Ticker */}
              <div style={{
                overflow: 'hidden', background: '#040608', padding: '7px 0', marginBottom: 16,
                borderRadius: 8, border: '1px solid #0d1117'
              }}>
                <div style={{ display: 'flex', width: 'max-content', animation: 'ticker 50s linear infinite' }}>
                  {[...flights, ...flights, ...flights].map((f, i) => (
                    <div key={i} style={{
                      padding: '0 28px', fontSize: 10, fontFamily: 'JetBrains Mono',
                      color: '#1e2d45', borderRight: '1px solid #0d1117', whiteSpace: 'nowrap'
                    }}>
                      {f.airlineCode} {f.id} {origin?.code}&gt;{dest?.code} {f.departure} ${f.price} {f.stops === 0 ? 'DIRECTO' : `${f.stops} ESC`}
                    </div>
                  ))}
                </div>
              </div>

              {/* Buy banner */}
              {analysis && flights[analysis.recommendedIndex] && (
                <div style={{
                  background: 'linear-gradient(135deg,#042a1a,#063320)',
                  border: '1px solid #065f46', borderRadius: 12, padding: 20, marginBottom: 16
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
                    <div>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4, flexWrap: 'wrap' }}>
                        <span style={{
                          display: 'inline-flex', padding: '3px 9px', borderRadius: 20, fontSize: 10,
                          fontFamily: 'JetBrains Mono', fontWeight: 500,
                          background: '#052e16', color: '#4ade80', border: '1px solid #14532d'
                        }}>MEJOR OPCION</span>
                        <span style={{ fontSize: 14, color: '#4ade80', fontWeight: 700 }}>{analysis.headline}</span>
                      </div>
                      <div style={{ fontSize: 12, color: '#475569' }}>
                        {origin?.city} ({origin?.code}) › {dest?.city} ({dest?.code}) · {dep}
                        {tripType === 'roundtrip' ? ` - ${ret}` : ''} · {adults} pax · {cabin}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontFamily: 'JetBrains Mono', fontSize: 26, fontWeight: 700, color: '#4ade80' }}>
                          ${flights[analysis.recommendedIndex].price.toLocaleString()}
                        </div>
                        <div style={{ fontSize: 10, color: '#334155' }}>USD por persona</div>
                      </div>
                      <a href={buildAffiliateLink(origin?.code, dest?.code, dep, tripType === 'roundtrip' ? ret : null, adults, cabin)}
                        target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
                        <button style={{
                          background: 'linear-gradient(135deg,#065f46,#047857)', color: '#6ee7b7',
                          border: '1px solid #059669', borderRadius: 8, padding: '12px 24px',
                          fontSize: 14, fontFamily: 'Space Grotesk', fontWeight: 600, cursor: 'pointer'
                        }}>Comprar en Kiwi.com →</button>
                      </a>
                    </div>
                  </div>
                </div>
              )}

              {/* Header */}
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 11, color: '#334155', fontFamily: 'JetBrains Mono' }}>
                  {flights.length} VUELOS · {origin?.code} › {dest?.code} · {dep}
                </span>
                <span style={{
                  display: 'inline-flex', padding: '3px 9px', borderRadius: 20, fontSize: 10,
                  fontFamily: 'JetBrains Mono', fontWeight: 500,
                  background: '#1a0f35', color: '#c4b5fd', border: '1px solid #3b1f6e'
                }}>analizado por Claude AI</span>
              </div>

              {/* Flight list */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {flights.map((f, i) => (
                  <FlightCard key={`${f.id}-${i}`} flight={f}
                    recommended={i === analysis?.recommendedIndex}
                    selected={selected === i}
                    onClick={() => setSelected(i)}
                    analysis={i === analysis?.recommendedIndex ? analysis : null}
                    from={origin?.code} to={dest?.code}
                    dep={dep} ret={tripType === 'roundtrip' ? ret : null}
                    adults={adults} cabin={cabin} />
                ))}
              </div>

              <div style={{
                marginTop: 14, padding: '10px 16px', background: '#080c14', borderRadius: 8,
                fontSize: 10, color: '#1e2d45', textAlign: 'center', fontFamily: 'JetBrains Mono'
              }}>
                Precios estimados por Claude AI. El precio real se confirma al completar la compra en Kiwi.com via Travelpayouts.
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
