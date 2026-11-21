import React, { useEffect, useMemo, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import { C, METRICS, YEARS, colorFor, fillExpression, fmtEur, fmtPct } from './metrics.js';

const DATA = './data/';

// ---------- data ----------
function useData() {
  const [data, setData] = useState(null);
  useEffect(() => {
    Promise.all(['towns', 'stations', 'line', 'context'].map((n) => fetch(`${DATA}${n}.geojson`).then((r) => r.json()))).then(
      ([towns, stations, line, context]) => {
        towns.features.forEach((f) => {
          const p = f.properties;
          p.rent_chg = p.rent_2015 && p.rent_2024 ? (p.rent_2024 / p.rent_2015 - 1) * 100 : null;
          p.inc_chg = p.inc_2015 && p.inc_2024 ? (p.inc_2024 / p.inc_2015 - 1) * 100 : null;
        });
        setData({ towns, stations, line, context });
      }
    );
  }, []);
  return data;
}

// ---------- map ----------
function MapView({ data, metric, year, selected, onSelect }) {
  const box = useRef(null);
  const mapRef = useRef(null);
  const tipRef = useRef(null);
  const selectRef = useRef(onSelect);
  selectRef.current = onSelect;

  useEffect(() => {
    if (!data || mapRef.current) return;
    const map = new maplibregl.Map({
      container: box.current,
      style: {
        version: 8,
        sources: {
          context: { type: 'geojson', data: data.context },
          towns: { type: 'geojson', data: data.towns, promoteId: 'muni5' },
          line: { type: 'geojson', data: data.line },
          stations: { type: 'geojson', data: data.stations, promoteId: 'stop_id' },
        },
        layers: [
          { id: 'sea', type: 'background', paint: { 'background-color': C.bg } },
          { id: 'context', type: 'fill', source: 'context', paint: { 'fill-color': C.land, 'fill-outline-color': C.bg } },
          { id: 'towns-fill', type: 'fill', source: 'towns', paint: { 'fill-color': fillExpression(metric, year) } },
          { id: 'towns-edge', type: 'line', source: 'towns', paint: { 'line-color': C.bg, 'line-width': 1.2 } },
          {
            id: 'towns-hover',
            type: 'line',
            source: 'towns',
            paint: { 'line-color': C.ink, 'line-width': ['case', ['boolean', ['feature-state', 'hover'], false], 1.5, 0] },
          },
          {
            id: 'towns-selected',
            type: 'line',
            source: 'towns',
            paint: { 'line-color': C.ink, 'line-width': ['case', ['boolean', ['feature-state', 'selected'], false], 3, 0] },
          },
          { id: 'line', type: 'line', source: 'line', paint: { 'line-color': C.ink, 'line-width': 2 } },
          {
            id: 'stations',
            type: 'circle',
            source: 'stations',
            paint: {
              'circle-radius': ['interpolate', ['linear'], ['zoom'], 9, 3.5, 12, 6],
              'circle-color': C.bg,
              'circle-stroke-color': C.ink,
              'circle-stroke-width': 1.6,
            },
          },
        ],
      },
      bounds: [
        [1.47, 41.165],
        [2.235, 41.475],
      ],
      fitBoundsOptions: { padding: { top: 24, bottom: 24, left: 24, right: 56 } },
      attributionControl: false,
      dragRotate: false,
      pitchWithRotate: false,
    });
    map.touchZoomRotate.disableRotation();
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    mapRef.current = map;
    const zoomClass = () => box.current && box.current.classList.toggle('far', map.getZoom() < 9.2);
    map.on('zoom', zoomClass);
    map.on('load', zoomClass);

    // station badges: minutes to Sants
    data.stations.features.forEach((f) => {
      const el = document.createElement('div');
      el.className = 'badge';
      el.textContent = f.properties.stop_name === 'Barcelona-Sants' ? 'Sants' : `${f.properties.min_to_sants}′`;
      new maplibregl.Marker({ element: el, anchor: 'bottom', offset: [0, -7] }).setLngLat(f.geometry.coordinates).addTo(map);
    });

    let hover = null;
    const tip = tipRef.current;
    map.on('mousemove', 'towns-fill', (e) => {
      const f = e.features[0];
      if (hover !== null) map.setFeatureState({ source: 'towns', id: hover }, { hover: false });
      hover = f.id;
      map.setFeatureState({ source: 'towns', id: hover }, { hover: true });
      map.getCanvas().style.cursor = 'pointer';
      tip.dataset.id = f.id;
      tip.style.display = 'block';
      tip.style.left = e.point.x + 14 + 'px';
      tip.style.top = e.point.y + 14 + 'px';
      tip.dispatchEvent(new CustomEvent('town', { detail: f.id }));
    });
    map.on('mouseleave', 'towns-fill', () => {
      if (hover !== null) map.setFeatureState({ source: 'towns', id: hover }, { hover: false });
      hover = null;
      map.getCanvas().style.cursor = '';
      tip.style.display = 'none';
    });
    map.on('mouseenter', 'stations', () => (map.getCanvas().style.cursor = 'pointer'));
    map.on('click', (e) => {
      const st = map.queryRenderedFeatures(e.point, { layers: ['stations'] })[0];
      if (st) return selectRef.current(st.properties.muni_code || null, st.properties.stop_id);
      const t = map.queryRenderedFeatures(e.point, { layers: ['towns-fill'] })[0];
      selectRef.current(t ? t.id : null, null);
    });
    return () => map.remove();
  }, [data]);

  // recolor on metric / year
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const apply = () => map.setPaintProperty('towns-fill', 'fill-color', fillExpression(metric, year));
    map.isStyleLoaded() ? apply() : map.once('load', apply);
  }, [metric, year]);

  // selected outline
  const prevSel = useRef(null);
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const apply = () => {
      if (prevSel.current) map.setFeatureState({ source: 'towns', id: prevSel.current }, { selected: false });
      if (selected) map.setFeatureState({ source: 'towns', id: selected }, { selected: true });
      prevSel.current = selected;
    };
    map.isStyleLoaded() ? apply() : map.once('load', apply);
  }, [selected]);

  return (
    <div className="map-wrap">
      <div ref={box} className="map" aria-label="Map of the R2 Sud corridor" />
      <Tooltip tipRef={tipRef} data={data} metric={metric} year={year} />
      <Legend metric={metric} />
    </div>
  );
}

function Tooltip({ tipRef, data, metric, year }) {
  const [id, setId] = useState(null);
  useEffect(() => {
    const el = tipRef.current;
    const h = (e) => setId(e.detail);
    el.addEventListener('town', h);
    return () => el.removeEventListener('town', h);
  }, []);
  const f = data && id ? data.towns.features.find((t) => t.properties.muni5 === id) : null;
  const m = METRICS[metric];
  const v = f ? f.properties[m.field(year)] : null;
  return (
    <div ref={tipRef} className="tip" style={{ display: 'none' }}>
      {f && (
        <>
          <b>{f.properties.name}</b>
          <span>
            {m.short}
            {m.byYear ? `, ${year}` : ''}: {v == null ? 'no data' : m.fmt(v)}
          </span>
        </>
      )}
    </div>
  );
}

function Legend({ metric }) {
  const m = METRICS[metric];
  return (
    <div className="legend">
      <div className="legend-title">{m.short}</div>
      {m.legend.map((l, i) => (
        <div key={l} className="legend-row">
          <i style={{ background: m.colors[i] }} />
          {l}
        </div>
      ))}
      <div className="legend-row">
        <i className="legend-line" />
        Rodalies R2 Sud
      </div>
      <div className="legend-row">
        <i className="legend-dot" />
        Station, minutes to Sants
      </div>
    </div>
  );
}

// ---------- charts ----------
function Scatter({ towns, metric, year, selected, onSelect }) {
  const m = METRICS[metric];
  const pts = towns
    .map((f) => f.properties)
    .filter((p) => p.min_to_sants != null && p[m.field(year)] != null)
    .map((p) => ({ id: p.muni5, name: p.name, x: p.min_to_sants, y: p[m.field(year)] }));
  const W = 340, H = 220, L = 46, R = 12, T = 12, B = 34;
  const ys = pts.map((p) => p.y);
  let lo = Math.min(...ys), hi = Math.max(...ys);
  const pad = (hi - lo) * 0.12 || 1;
  lo -= pad; hi += pad;
  const X = (v) => L + (v / 60) * (W - L - R);
  const Y = (v) => T + (1 - (v - lo) / (hi - lo)) * (H - T - B);
  const ticks = [0, 1, 2, 3].map((i) => lo + ((hi - lo) * (i + 0.5)) / 4);
  const tickFmt = (v) => (metric === 'rti' ? v.toFixed(0) + '%' : metric === 'chg' ? '+' + v.toFixed(0) + '%' : metric === 'inc' ? '€' + Math.round(v / 1000) + 'k' : '€' + Math.round(v));
  const sel = pts.find((p) => p.id === selected);
  return (
    <figure className="chart">
      <figcaption>
        {m.short}
        {m.byYear ? `, ${year}` : ''}, against train time to Sants
      </figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${m.short} against minutes to Barcelona-Sants`}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={L} x2={W - R} y1={Y(t)} y2={Y(t)} stroke={C.rule} />
            <text x={L - 6} y={Y(t) + 3.5} textAnchor="end" className="ax">
              {tickFmt(t)}
            </text>
          </g>
        ))}
        {[0, 15, 30, 45, 60].map((t) => (
          <text key={t} x={X(t)} y={H - B + 15} textAnchor="middle" className="ax">
            {t}
          </text>
        ))}
        <text x={(L + W - R) / 2} y={H - 4} textAnchor="middle" className="ax">
          minutes to Barcelona-Sants
        </text>
        {pts.map((p) => (
          <circle
            key={p.id}
            cx={X(p.x)}
            cy={Y(p.y)}
            r={p.id === selected ? 7 : 5.5}
            fill={colorFor(metric, p.y)}
            stroke={p.id === selected ? C.ink : C.muted}
            strokeWidth={p.id === selected ? 2 : 0.8}
            className="dot"
            onClick={() => onSelect(p.id, null)}
          >
            <title>
              {p.name}: {m.fmt(p.y)}, {p.x} min
            </title>
          </circle>
        ))}
        {sel && (
          <text x={X(sel.x) + (sel.x > 45 ? -10 : 10)} y={Y(sel.y) - 10} textAnchor={sel.x > 45 ? 'end' : 'start'} className="dot-label">
            {sel.name}
          </text>
        )}
      </svg>
    </figure>
  );
}

function IndexChart({ p, year }) {
  const W = 340, H = 150, L = 34, R = 78, T = 12, B = 24;
  const r = YEARS.map((y) => (p[`rent_${y}`] && p.rent_2015 ? (p[`rent_${y}`] / p.rent_2015) * 100 : null));
  const i = YEARS.map((y) => (p[`inc_${y}`] && p.inc_2015 ? (p[`inc_${y}`] / p.inc_2015) * 100 : null));
  const all = [...r, ...i].filter((v) => v != null);
  const lo = 95, hi = Math.max(180, Math.ceil(Math.max(...all) / 10) * 10);
  const X = (k) => L + (k / (YEARS.length - 1)) * (W - L - R);
  const Y = (v) => T + (1 - (v - lo) / (hi - lo)) * (H - T - B);
  const path = (a) => a.map((v, k) => (v == null ? '' : `${k === 0 || a[k - 1] == null ? 'M' : 'L'}${X(k)},${Y(v)}`)).join('');
  const k = YEARS.indexOf(year);
  // keep the two end labels at least 13px apart, rent above income
  let yR = r[9] != null ? Y(r[9]) : 0, yI = i[9] != null ? Y(i[9]) : 0;
  if (Math.abs(yI - yR) < 13) { const mid = (yR + yI) / 2, up = yR <= yI ? -1 : 1; yR = mid + 6.5 * up; yI = mid - 6.5 * up; }
  return (
    <figure className="chart">
      <figcaption>Rent and income since 2015 (2015 = 100)</figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Rent and household income growth since 2015">
        {[100, 140, 180].filter((t) => t <= hi).map((t) => (
          <g key={t}>
            <line x1={L} x2={W - R} y1={Y(t)} y2={Y(t)} stroke={C.rule} />
            <text x={L - 6} y={Y(t) + 3.5} textAnchor="end" className="ax">{t}</text>
          </g>
        ))}
        <line x1={X(k)} x2={X(k)} y1={T} y2={H - B} stroke={C.muted} strokeDasharray="3 3" />
        <path d={path(i)} fill="none" stroke={C.muted} strokeWidth="2" />
        <path d={path(r)} fill="none" stroke={C.accent} strokeWidth="2.5" />
        {r[9] != null && <text x={X(9) + 6} y={yR + 4} className="end rent">Rent +{(r[9] - 100).toFixed(0)}%</text>}
        {i[9] != null && <text x={X(9) + 6} y={yI + 4} className="end inc">Income +{(i[9] - 100).toFixed(0)}%</text>}
        {[0, 9].map((q) => (
          <text key={q} x={X(q)} y={H - 6} textAnchor="middle" className="ax">{YEARS[q]}</text>
        ))}
      </svg>
    </figure>
  );
}

// ---------- panel ----------
function Panel({ data, metric, year, selected, station, onSelect }) {
  const towns = data.towns.features;
  const f = towns.find((t) => t.properties.muni5 === selected);
  const sorted = [...towns].map((t) => t.properties).filter((p) => p[`rti_${year}`] != null).sort((a, b) => b[`rti_${year}`] - a[`rti_${year}`]);
  return (
    <aside className="panel">
      <label className="picker">
        <span className="sr">Choose a town</span>
        <select value={selected || ''} onChange={(e) => onSelect(e.target.value || null, null)}>
          <option value="">Choose a town…</option>
          {[...towns]
            .map((t) => t.properties)
            .sort((a, b) => a.name.localeCompare(b.name, 'ca'))
            .map((p) => (
              <option key={p.muni5} value={p.muni5}>{p.name}</option>
            ))}
        </select>
      </label>

      {f ? (
        <TownDetail p={f.properties} data={data} year={year} station={station} rank={sorted.findIndex((p) => p.muni5 === selected) + 1} total={sorted.length} />
      ) : (
        <Intro />
      )}

      <Scatter towns={towns} metric={metric} year={year} selected={selected} onSelect={onSelect} />
    </aside>
  );
}

function Intro() {
  return (
    <div className="intro">
      <h3>Click a town or a station</h3>
      <ul className="findings">
        <li><b>Sitges spends the largest share of income on rent:</b> 28.7% in 2024, above Barcelona at 27.6%.</li>
        <li><b>Sitges and Castelldefels rent for more than Barcelona,</b> at €1,306 and €1,163 a month against €1,147.</li>
        <li><b>Rent rose faster than household income in all 13 towns</b> between 2015 and 2024.</li>
      </ul>
      <p className="caveat">
        Rents are averages of new contracts registered with Incasòl. In towns with a high-end rental segment, such as Sitges and
        Castelldefels, a small number of expensive contracts can raise the average.
      </p>
    </div>
  );
}

function TownDetail({ p, data, year, station, rank, total }) {
  const sts = data.stations.features.map((s) => s.properties).filter((s) => s.muni_code === p.muni5);
  const v = (k) => p[`${k}_${year}`];
  return (
    <div className="detail">
      <div className="eyebrow">{p.comarca}</div>
      <h3>{p.name}</h3>
      {sts.length ? (
        <ul className="stations">
          {sts.map((s) => (
            <li key={s.stop_id} className={s.stop_id === station ? 'on' : ''}>
              <b>{s.stop_name}</b>
              <span>{s.stop_name === 'Barcelona-Sants' ? 'Destination station' : `${s.min_to_sants} min to Sants · ${s.trains_7_to_9am} trains 7 to 9am`}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted">No R2 Sud station in this municipality.</p>
      )}
      <div className="stats">
        <div><span>Rent, {year}</span><b>{v('rent') != null ? fmtEur(v('rent')) : 'n/a'}</b><em>a month</em></div>
        <div><span>Household income</span><b>{v('inc') != null ? fmtEur(v('inc')) : 'n/a'}</b><em>a year, net</em></div>
        <div><span>Rent-to-income</span><b>{v('rti') != null ? fmtPct(v('rti')) : 'n/a'}</b><em>{rank ? `${ordinal(rank)} of ${total}` : ''}</em></div>
      </div>
      <IndexChart p={p} year={year} />
      {p.rent_chg != null && p.inc_chg != null && (
        <p className="muted small">
          From 2015 to 2024, average rent in {p.name} rose {p.rent_chg.toFixed(0)}% and household income {p.inc_chg.toFixed(0)}%.
        </p>
      )}
    </div>
  );
}

const ordinal = (n) => (n === 1 ? 'Highest' : n + (['th', 'st', 'nd', 'rd'][(n % 100 > 10 && n % 100 < 14) || n % 10 > 3 ? 0 : n % 10]) + ' highest');

// ---------- app ----------
export default function App() {
  const data = useData();
  const [metric, setMetric] = useState('rti');
  const [year, setYear] = useState(2024);
  const [selected, setSelected] = useState(null);
  const [station, setStation] = useState(null);
  const onSelect = (id, st) => {
    setSelected(id);
    setStation(st);
  };
  const m = METRICS[metric];

  return (
    <div className="app">
      <header className="top">
        <a className="brand" href="https://galeanoworks.com" aria-label="Galeano Works home">
          <img src="./gW.png" alt="" width="40" height="40" />
        </a>
        <div className="titles">
          <a className="back" href="../../destination-services.html">&larr; Destination services</a>
          <div className="eyebrow">Coast Commuter Map · Rodalies R2 Sud</div>
          <h1>What a commute to Barcelona costs along the coast</h1>
          <p className="lede">Rent, household income and train time for the 13 towns from Sant Vicenç de Calders to Barcelona, 2015 to 2024.</p>
        </div>
      </header>

      <div className="toolbar">
        <div className="seg" role="group" aria-label="Measure">
          {Object.entries(METRICS).map(([k, v]) => (
            <button key={k} aria-pressed={metric === k} onClick={() => setMetric(k)}>{v.label}</button>
          ))}
        </div>
        <label className={'year' + (m.byYear ? '' : ' off')}>
          <span>Year</span>
          <input type="range" min={2015} max={2024} step={1} value={year} onChange={(e) => setYear(+e.target.value)} disabled={!m.byYear} />
          <b>{m.byYear ? year : '2015–24'}</b>
        </label>
      </div>
      <p className="note">{m.note}</p>

      <main className="main">
        {data ? (
          <>
            <MapView data={data} metric={metric} year={year} selected={selected} onSelect={onSelect} />
            <Panel data={data} metric={metric} year={year} selected={selected} station={station} onSelect={onSelect} />
          </>
        ) : (
          <div className="loading">Loading map…</div>
        )}
      </main>

      <footer className="foot">
        <p>
          Data: Generalitat de Catalunya, Incasòl rental bonds (annual average); INE household income atlas; Renfe GTFS (fastest weekday morning train arriving at Barcelona-Sants, November 2026); ICGC municipal boundaries.
          Sant Pere de Ribes has no R2 Sud station. Rent and income are averages, so a small number of high-end rentals or
          high-income households can raise them.
        </p>
        <p className="credit">
          <a href="https://galeanoworks.com">A Galeano Works study · galeanoworks.com</a>
        </p>
      </footer>
    </div>
  );
}
