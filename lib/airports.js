// lib/airports.js

export const AIRPORTS = [
  {code:"EZE",city:"Buenos Aires",country:"AR",skyId:"EZE",entityId:"95673583"},
  {code:"AEP",city:"Buenos Aires",country:"AR",skyId:"AEP",entityId:"95673551"},
  {code:"MIA",city:"Miami",country:"US",skyId:"MIA",entityId:"95673641"},
  {code:"JFK",city:"New York",country:"US",skyId:"JFK",entityId:"95565058"},
  {code:"LAX",city:"Los Angeles",country:"US",skyId:"LAX",entityId:"95673640"},
  {code:"ORD",city:"Chicago",country:"US",skyId:"ORD",entityId:"95673618"},
  {code:"GRU",city:"Sao Paulo",country:"BR",skyId:"GRU",entityId:"95673625"},
  {code:"GIG",city:"Rio de Janeiro",country:"BR",skyId:"GIG",entityId:"95673622"},
  {code:"BOG",city:"Bogota",country:"CO",skyId:"BOG",entityId:"95673600"},
  {code:"SCL",city:"Santiago",country:"CL",skyId:"SCL",entityId:"95673661"},
  {code:"LIM",city:"Lima",country:"PE",skyId:"LIM",entityId:"95673639"},
  {code:"MEX",city:"Ciudad de Mexico",country:"MX",skyId:"MEX",entityId:"95673644"},
  {code:"MAD",city:"Madrid",country:"ES",skyId:"MAD",entityId:"95565051"},
  {code:"LHR",city:"London",country:"GB",skyId:"LHR",entityId:"95565050"},
  {code:"CDG",city:"Paris",country:"FR",skyId:"CDG",entityId:"95565049"},
  {code:"NRT",city:"Tokyo",country:"JP",skyId:"NRT",entityId:"95673718"},
  {code:"DXB",city:"Dubai",country:"AE",skyId:"DXB",entityId:"95673609"},
  {code:"CUN",city:"Cancun",country:"MX",skyId:"CUN",entityId:"95673605"},
  {code:"MXP",city:"Milan",country:"IT",skyId:"MXP",entityId:"95565055"},
  {code:"BCN",city:"Barcelona",country:"ES",skyId:"BCN",entityId:"95565047"},
  {code:"PTY",city:"Panama City",country:"PA",skyId:"PTY",entityId:"95673655"},
  {code:"MVD",city:"Montevideo",country:"UY",skyId:"MVD",entityId:"95673648"},
  {code:"ASU",city:"Asuncion",country:"PY",skyId:"ASU",entityId:"95673595"},
  {code:"GYE",city:"Guayaquil",country:"EC",skyId:"GYE",entityId:"95673621"},
];

export function buildAffiliateLink(from, to, dep, ret, adults, cabin) {
  const affiliateId = process.env.NEXT_PUBLIC_AFFILIATE_ID || 'skyopt_aff';
  const cabinMap = { economy: 'M', business: 'C', first: 'F' };
  const base = `https://www.kiwi.com/en/search/results/${from}-${to}/${dep}/${ret || 'no-return'}`;
  const params = new URLSearchParams({
    adults,
    cabinClass: cabinMap[cabin] || 'M',
    currency: 'USD',
    affilid: affiliateId,
  });
  return `${base}?${params}`;
}

export function formatDuration(minutes) {
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}
