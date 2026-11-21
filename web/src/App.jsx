import React, { useEffect, useMemo, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import { C, FIND, METRICS, YEARS, colorFor, fillExpression, fits, fmtEur, fmtPct } from './metrics.js';
import { T, initialLang, rememberLang } from './i18n.js';

const DATA = './data/';
const BCN = [2.172, 41.414];
const SEA = [1.93, 41.205];

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
class NorthArrow {
  constructor(label) {
    this.label = label;
  }
  onAdd() {
    const el = document.createElement('div');
    el.className = 'maplibregl-ctrl north';
    el.setAttribute('role', 'img');
    el.setAttribute('aria-label', this.label);
    el.innerHTML =
      '<svg viewBox="0 0 24 40" width="18" height="30" aria-hidden="true">' +
      '<text x="12" y="9" text-anchor="middle">N</text>' +
      '<path d="M12 13 L17 33 L12 29.5 Z" fill="currentColor"/>' +
      '<path d="M12 13 L7 33 L12 29.5 Z" fill="none" stroke="currentColor" stroke-width="1"/>' +
      '</svg>';
    this.el = el;
    return el;
  }
  onRemove() {
    this.el.remove();
  }
}

function label(map, lngLat, cls, text) {
  const el = document.createElement('div');
  el.className = cls;
  el.textContent = text;
  return new maplibregl.Marker({ element: el, anchor: 'center' }).setLngLat(lngLat).addTo(map);
}

function MapView({ data, metric, year, selected, onSelect, lang, dimmed, filtering }) {
  const t = T[lang];
  const box = useRef(null);
  const mapRef = useRef(null);
  const tipRef = useRef(null);
  const seaRef = useRef(null);
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
          { id: 'sea', type: 'background', paint: { 'background-color': C.sea } },
          { id: 'context', type: 'fill', source: 'context', paint: { 'fill-color': C.paper } },
          { id: 'context-edge', type: 'line', source: 'context', paint: { 'line-color': '#dcdbd5', 'line-width': 0.5 } },
          {
            id: 'towns-fill',
            type: 'fill',
            source: 'towns',
            paint: {
              'fill-color': fillExpression(metric, year),
              'fill-opacity': ['case', ['boolean', ['feature-state', 'dim'], false], 0.16, 1],
              'fill-opacity-transition': { duration: 250 },
            },
          },
          { id: 'towns-edge', type: 'line', source: 'towns', paint: { 'line-color': C.paper, 'line-width': 1 } },
          {
            id: 'towns-hover',
            type: 'line',
            source: 'towns',
            paint: { 'line-color': C.ink, 'line-width': ['case', ['boolean', ['feature-state', 'hover'], false], 1, 0] },
          },
          {
            id: 'towns-selected',
            type: 'line',
            source: 'towns',
            paint: { 'line-color': C.ink, 'line-width': ['case', ['boolean', ['feature-state', 'selected'], false], 2, 0] },
          },
          { id: 'line-casing', type: 'line', source: 'line', paint: { 'line-color': C.paper, 'line-width': 4.5 } },
          { id: 'line', type: 'line', source: 'line', paint: { 'line-color': C.ink, 'line-width': 1.4 } },
          {
            id: 'stations',
            type: 'circle',
            source: 'stations',
            paint: {
              'circle-radius': ['interpolate', ['linear'], ['zoom'], 9, ['case', ['==', ['get', 'stop_name'], 'Barcelona-Sants'], 4.5, 3], 12, ['case', ['==', ['get', 'stop_name'], 'Barcelona-Sants'], 7, 5]],
              'circle-color': ['case', ['==', ['get', 'stop_name'], 'Barcelona-Sants'], C.ink, C.paper],
              'circle-stroke-color': C.ink,
              'circle-stroke-width': 1.2,
            },
          },
        ],
      },
      bounds: [
        [1.47, 41.165],
        [2.235, 41.475],
      ],
      fitBoundsOptions: { padding: { top: 24, bottom: 24, left: 24, right: 40 } },
      attributionControl: false,
      dragRotate: false,
      pitchWithRotate: false,
    });
    map.touchZoomRotate.disableRotation();
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    map.addControl(new maplibregl.ScaleControl({ maxWidth: 90, unit: 'metric' }), 'bottom-right');
    map.addControl(new NorthArrow(t.north), 'bottom-right');
    mapRef.current = map;
    // town names appear once the reader zooms in from the opening view
    let base = null;
    const zoomClass = () => {
      if (!box.current) return;
      if (base === null) base = map.getZoom();
      const z = map.getZoom();
      box.current.classList.toggle('far', z < 9.1);
      box.current.classList.toggle('near', z >= Math.max(base + 0.6, 10.2));
    };
    map.on('zoom', zoomClass);
    map.on('load', zoomClass);

    // station badges: minutes to Sants
    data.stations.features.forEach((f) => {
      if (f.properties.stop_name === 'Barcelona-Sants') return;
      const el = document.createElement('div');
      el.className = 'badge';
      el.textContent = `${f.properties.min_to_sants}′`;
      new maplibregl.Marker({ element: el, anchor: 'bottom', offset: [0, -6] }).setLngLat(f.geometry.coordinates).addTo(map);
    });
    // town names when zoomed in; Barcelona always
    data.towns.features.forEach((f) => {
      const p = f.properties;
      if (p.name === 'Barcelona') return;
      label(map, [p.lx, p.ly], 'place', p.name);
    });
    label(map, BCN, 'place city', 'Barcelona');
    const sants = document.createElement('div');
    sants.className = 'place sants';
    sants.textContent = 'Sants';
    const s = data.stations.features.find((f) => f.properties.stop_name === 'Barcelona-Sants');
    if (s) new maplibregl.Marker({ element: sants, anchor: 'left', offset: [9, 0] }).setLngLat(s.geometry.coordinates).addTo(map);
    seaRef.current = label(map, SEA, 'place sea', t.sea);

    let hover = null;
    const tip = tipRef.current;
    map.on('mousemove', 'towns-fill', (e) => {
      const f = e.features[0];
      if (hover !== null) map.setFeatureState({ source: 'towns', id: hover }, { hover: false });
      hover = f.id;
      map.setFeatureState({ source: 'towns', id: hover }, { hover: true });
      map.getCanvas().style.cursor = 'pointer';
      tip.style.display = 'block';
      const w = box.current.clientWidth;
      const left = e.point.x + 14;
      tip.style.left = (left + 200 > w ? e.point.x - 14 - tip.offsetWidth : left) + 'px';
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
      const tf = map.queryRenderedFeatures(e.point, { layers: ['towns-fill'] })[0];
      selectRef.current(tf ? tf.id : null, null);
    });
    return () => map.remove();
  }, [data]);

  const whenReady = (fn) => {
    const map = mapRef.current;
    if (!map) return;
    map.isStyleLoaded() ? fn(map) : map.once('load', () => fn(map));
  };

  // recolor on metric / year
  useEffect(() => whenReady((map) => map.setPaintProperty('towns-fill', 'fill-color', fillExpression(metric, year))), [metric, year]);

  // finder: fade towns outside the filters
  useEffect(
    () =>
      whenReady((map) =>
        data.towns.features.forEach((f) => map.setFeatureState({ source: 'towns', id: f.properties.muni5 }, { dim: dimmed.has(f.properties.muni5) }))
      ),
    [dimmed]
  );

  // language-dependent map text
  useEffect(() => {
    if (seaRef.current) seaRef.current.getElement().textContent = t.sea;
  }, [lang]);

  // selected outline
  const prevSel = useRef(null);
  useEffect(
    () =>
      whenReady((map) => {
        if (prevSel.current) map.setFeatureState({ source: 'towns', id: prevSel.current }, { selected: false });
        if (selected) map.setFeatureState({ source: 'towns', id: selected }, { selected: true });
        prevSel.current = selected;
      }),
    [selected]
  );

  return (
    <div className="map-wrap">
      <div ref={box} className="map" aria-label={t.mapLabel} />
      <Tooltip tipRef={tipRef} data={data} metric={metric} year={year} lang={lang} />
      <Legend metric={metric} lang={lang} filtering={filtering} />
      <div className="watermark" aria-hidden="true">
        <img src="./gW.png" alt="" width="18" height="18" />
        <span>galeanoworks.com</span>
      </div>
    </div>
  );
}

function Tooltip({ tipRef, data, metric, year, lang }) {
  const [id, setId] = useState(null);
  useEffect(() => {
    const el = tipRef.current;
    const h = (e) => setId(e.detail);
    el.addEventListener('town', h);
    return () => el.removeEventListener('town', h);
  }, []);
  const f = data && id ? data.towns.features.find((x) => x.properties.muni5 === id) : null;
  const m = METRICS[metric];
  const tm = T[lang].metrics[metric];
  const v = f ? f.properties[m.field(year)] : null;
  return (
    <div ref={tipRef} className="tip" style={{ display: 'none' }}>
      {f && (
        <>
          <b>{f.properties.name}</b>
          <span>
            {tm.short}
            {m.byYear ? `, ${year}` : ''}: <strong>{v == null ? T[lang].noData : m.fmt(v, lang)}</strong>
          </span>
        </>
      )}
    </div>
  );
}

function Legend({ metric, lang, filtering }) {
  const m = METRICS[metric];
  const t = T[lang];
  return (
    <div className="legend">
      <div className="legend-title">
        {t.metrics[metric].short}
      </div>
      <div className="ramp">
        {m.colors.map((c) => (
          <i key={c} style={{ background: c }} />
        ))}
      </div>
      <div className="ramp-ticks">
        {m.breaks.map((b, i) => (
          <span key={b} style={{ left: `${((i + 1) / m.colors.length) * 100}%` }}>
            {m.tick(b, lang)}
          </span>
        ))}
      </div>
      <div className="legend-keys">
        <span>
          <i className="k-line" />
          {t.legendLine}
        </span>
        <span>
          <i className="k-dot" />
          {t.legendStation}
        </span>
      </div>
      {filtering && <div className="legend-dim">{t.legendDim}</div>}
    </div>
  );
}

// ---------- finder ----------
function Finder({ towns, find, setFind, matches, onSelect, selected, lang }) {
  const t = T[lang];
  const anyRent = find.rent >= FIND.rentMax;
  const anyTime = find.minutes >= FIND.minMax;
  const active = !anyRent || !anyTime || find.frequent;
  const list = towns
    .map((f) => f.properties)
    .filter((p) => matches.has(p.muni5))
    .sort((a, b) => a.rent_2024 - b.rent_2024);
  return (
    <section className="finder" aria-labelledby="finder-title">
      <div className="finder-head">
        <h2 id="finder-title">{t.findTitle}</h2>
        {active && (
          <button type="button" className="link" onClick={() => setFind({ rent: FIND.rentMax, minutes: FIND.minMax, frequent: false })}>
            {t.reset}
          </button>
        )}
      </div>
      <label className="range">
        <span>{t.findRent(anyRent ? null : fmtEur(find.rent, lang))}</span>
        <input
          type="range"
          min={FIND.rentMin}
          max={FIND.rentMax}
          step={FIND.rentStep}
          value={find.rent}
          onChange={(e) => setFind({ ...find, rent: +e.target.value })}
        />
      </label>
      <label className="range">
        <span>{t.findMin(anyTime ? null : find.minutes)}</span>
        <input
          type="range"
          min={FIND.minMin}
          max={FIND.minMax}
          step={FIND.minStep}
          value={find.minutes}
          onChange={(e) => setFind({ ...find, minutes: +e.target.value })}
        />
      </label>
      <label className="check">
        <input type="checkbox" checked={find.frequent} onChange={(e) => setFind({ ...find, frequent: e.target.checked })} />
        <span>{t.findFreq}</span>
      </label>
      <p className="count" aria-live="polite">
        {t.findCount(matches.size, towns.length)}
      </p>
      {active && list.length > 0 && (
        <ul className="matches">
          {list.map((p) => (
            <li key={p.muni5}>
              <button type="button" aria-pressed={selected === p.muni5} onClick={() => onSelect(p.muni5, null)}>
                <b>{p.name}</b>
                <span>
                  {fmtEur(p.rent_2024, lang)}
                  {p.min_to_sants ? ` · ${p.min_to_sants} min` : ''}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="fine">{t.findNote}</p>
    </section>
  );
}

// ---------- charts ----------
function Scatter({ towns, metric, year, selected, onSelect, lang, dimmed }) {
  const m = METRICS[metric];
  const t = T[lang];
  const pts = towns
    .map((f) => f.properties)
    .filter((p) => p.min_to_sants != null && p[m.field(year)] != null)
    .map((p) => ({ id: p.muni5, name: p.name, x: p.min_to_sants, y: p[m.field(year)] }));
  const W = 340, H = 220, L = 46, R = 12, T0 = 12, B = 34;
  const ys = pts.map((p) => p.y);
  let lo = Math.min(...ys), hi = Math.max(...ys);
  const pad = (hi - lo) * 0.12 || 1;
  lo -= pad;
  hi += pad;
  const X = (v) => L + (v / 60) * (W - L - R);
  const Y = (v) => T0 + (1 - (v - lo) / (hi - lo)) * (H - T0 - B);
  const ticks = [0, 1, 2, 3].map((i) => lo + ((hi - lo) * (i + 0.5)) / 4);
  const sel = pts.find((p) => p.id === selected);
  return (
    <figure className="chart">
      <figcaption>
        {t.scatterTitle(t.metrics[metric].short + (m.byYear ? `, ${year}` : ''))}
      </figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={t.scatterTitle(t.metrics[metric].short)}>
        {ticks.map((v) => (
          <g key={v}>
            <line x1={L} x2={W - R} y1={Y(v)} y2={Y(v)} stroke={C.rule} />
            <text x={L - 6} y={Y(v) + 3.5} textAnchor="end" className="ax">
              {m.tick(v, lang)}
            </text>
          </g>
        ))}
        {[0, 15, 30, 45, 60].map((v) => (
          <text key={v} x={X(v)} y={H - B + 15} textAnchor="middle" className="ax">
            {v}
          </text>
        ))}
        <text x={(L + W - R) / 2} y={H - 4} textAnchor="middle" className="ax">
          {t.scatterAxis}
        </text>
        {pts.map((p) => (
          <circle
            key={p.id}
            cx={X(p.x)}
            cy={Y(p.y)}
            r={p.id === selected ? 6.5 : 5}
            fill={colorFor(metric, p.y)}
            fillOpacity={dimmed.has(p.id) ? 0.2 : 1}
            stroke={p.id === selected ? C.ink : 'rgba(0,0,0,.25)'}
            strokeOpacity={dimmed.has(p.id) ? 0.3 : 1}
            strokeWidth={p.id === selected ? 1.6 : 0.6}
            className="dot"
            onClick={() => onSelect(p.id, null)}
          >
            <title>
              {p.name}: {m.fmt(p.y, lang)}, {p.x} min
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

function IndexChart({ p, year, lang }) {
  const t = T[lang];
  const W = 340, H = 150, L = 34, R = 84, T0 = 12, B = 24;
  const r = YEARS.map((y) => (p[`rent_${y}`] && p.rent_2015 ? (p[`rent_${y}`] / p.rent_2015) * 100 : null));
  const i = YEARS.map((y) => (p[`inc_${y}`] && p.inc_2015 ? (p[`inc_${y}`] / p.inc_2015) * 100 : null));
  const all = [...r, ...i].filter((v) => v != null);
  const lo = 95, hi = Math.max(180, Math.ceil(Math.max(...all) / 10) * 10);
  const X = (k) => L + (k / (YEARS.length - 1)) * (W - L - R);
  const Y = (v) => T0 + (1 - (v - lo) / (hi - lo)) * (H - T0 - B);
  const path = (a) => a.map((v, k) => (v == null ? '' : `${k === 0 || a[k - 1] == null ? 'M' : 'L'}${X(k)},${Y(v)}`)).join('');
  const k = YEARS.indexOf(year);
  let yR = r[9] != null ? Y(r[9]) : 0, yI = i[9] != null ? Y(i[9]) : 0;
  if (Math.abs(yI - yR) < 13) {
    const mid = (yR + yI) / 2, up = yR <= yI ? -1 : 1;
    yR = mid + 6.5 * up;
    yI = mid - 6.5 * up;
  }
  const pc = (v) => (lang === 'es' ? ` +${(v - 100).toFixed(0)}\u00a0%` : ` +${(v - 100).toFixed(0)}%`);
  return (
    <figure className="chart">
      <figcaption>{t.idxTitle}</figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={t.idxTitle}>
        {[100, 140, 180].filter((v) => v <= hi).map((v) => (
          <g key={v}>
            <line x1={L} x2={W - R} y1={Y(v)} y2={Y(v)} stroke={C.rule} />
            <text x={L - 6} y={Y(v) + 3.5} textAnchor="end" className="ax">{v}</text>
          </g>
        ))}
        <line x1={X(k)} x2={X(k)} y1={T0} y2={H - B} stroke={C.muted} strokeDasharray="2 3" strokeWidth="0.8" />
        <path d={path(i)} fill="none" stroke={C.muted} strokeWidth="1.5" />
        <path d={path(r)} fill="none" stroke={C.accent} strokeWidth="2" />
        {r[9] != null && <text x={X(9) + 6} y={yR + 4} className="end rent">{t.idxRent}{pc(r[9])}</text>}
        {i[9] != null && <text x={X(9) + 6} y={yI + 4} className="end inc">{t.idxInc}{pc(i[9])}</text>}
        {[0, 9].map((q) => (
          <text key={q} x={X(q)} y={H - 6} textAnchor="middle" className="ax">{YEARS[q]}</text>
        ))}
      </svg>
    </figure>
  );
}

function MedianBlock({ p, lang }) {
  const t = T[lang];
  const W = 340, L = 130, R = 14, max = 2500;
  const X = (v) => L + (Math.min(v, max) / max) * (W - L - R);
  const rows = [
    [t.apts, p.sv_apt, p.sv_apt_p25, p.sv_apt_p75, C.accent],
    [t.houses, p.sv_house, p.sv_house_p25, p.sv_house_p75, C.ink],
  ];
  return (
    <figure className="chart">
      <figcaption>{t.medTitle}</figcaption>
      <svg viewBox={`0 0 ${W} 78`} role="img" aria-label={`${t.medTitle}: ${t.apts} ${fmtEur(p.sv_apt, lang)}, ${t.houses} ${fmtEur(p.sv_house, lang)}`}>
        {[0, 1000, 2000].map((v) => (
          <g key={v}>
            <line x1={X(v)} x2={X(v)} y1={4} y2={60} stroke={C.rule} />
            <text x={X(v)} y={74} textAnchor="middle" className="ax">{fmtEur(v, lang)}</text>
          </g>
        ))}
        {rows.map(([lab, med, lo, hi, col], i) => {
          const y = 18 + i * 28;
          return (
            <g key={lab}>
              <text x={0} y={y + 4} className="ax lab">{lab}</text>
              <line x1={X(lo)} x2={X(hi)} y1={y} y2={y} stroke={col} strokeWidth="5" strokeLinecap="round" opacity="0.22" />
              <circle cx={X(med)} cy={y} r="4.5" fill={col} />
              <text x={L - 12} y={y + 4} textAnchor="end" className="ax val">{fmtEur(med, lang)}</text>
            </g>
          );
        })}
      </svg>
      <p className="fine">{t.medNote(lang === 'es' ? p.sv_house_share.toFixed(0) : p.sv_house_share.toFixed(0), p.name)}</p>
    </figure>
  );
}

// ---------- panel ----------
function Intro({ lang }) {
  const t = T[lang];
  return (
    <div className="intro">
      <h2>{t.introTitle}</h2>
      <ol className="findings">
        {t.findings.map(([b, rest]) => (
          <li key={b}>
            <b>{b}</b>
            {rest}
          </li>
        ))}
      </ol>
      <p className="fine">{t.caveat}</p>
    </div>
  );
}

function TownDetail({ p, data, year, station, rank, total, lang }) {
  const t = T[lang];
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
              <span>{s.stop_name === 'Barcelona-Sants' ? t.destStation : t.stationLine(s.min_to_sants, s.trains_7_to_9am)}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted small">{t.noStation}</p>
      )}
      <div className="stats">
        <div>
          <span>{t.rentY(year)}</span>
          <b>{v('rent') != null ? fmtEur(v('rent'), lang) : 'n/a'}</b>
          <em>{t.month}</em>
        </div>
        <div>
          <span>{t.income}</span>
          <b>{v('inc') != null ? fmtEur(v('inc'), lang) : 'n/a'}</b>
          <em>{t.yearNet}</em>
        </div>
        <div>
          <span>{t.rti}</span>
          <b>{v('rti') != null ? fmtPct(v('rti'), 1, lang) : 'n/a'}</b>
          <em>{rank ? t.rank(rank, total) : ''}</em>
        </div>
      </div>
      {p.sv_apt != null && <MedianBlock p={p} lang={lang} />}
      <IndexChart p={p} year={year} lang={lang} />
      {p.rent_chg != null && p.inc_chg != null && <p className="fine">{t.since(p.name, p.rent_chg.toFixed(0), p.inc_chg.toFixed(0))}</p>}
    </div>
  );
}

function Panel({ data, metric, year, selected, station, onSelect, lang, find, setFind, matches, dimmed }) {
  const t = T[lang];
  const towns = data.towns.features;
  const f = towns.find((x) => x.properties.muni5 === selected);
  const sorted = [...towns].map((x) => x.properties).filter((p) => p[`rti_${year}`] != null).sort((a, b) => b[`rti_${year}`] - a[`rti_${year}`]);
  return (
    <aside className="panel">
      <Finder towns={towns} find={find} setFind={setFind} matches={matches} onSelect={onSelect} selected={selected} lang={lang} />
      <label className="picker">
        <span className="sr">{t.chooseSr}</span>
        <select value={selected || ''} onChange={(e) => onSelect(e.target.value || null, null)}>
          <option value="">{t.choose}</option>
          {[...towns]
            .map((x) => x.properties)
            .sort((a, b) => a.name.localeCompare(b.name, 'ca'))
            .map((p) => (
              <option key={p.muni5} value={p.muni5}>
                {p.name}
              </option>
            ))}
        </select>
      </label>
      {f ? (
        <TownDetail p={f.properties} data={data} year={year} station={station} lang={lang} rank={sorted.findIndex((p) => p.muni5 === selected) + 1} total={sorted.length} />
      ) : (
        <Intro lang={lang} />
      )}
      <Scatter towns={towns} metric={metric} year={year} selected={selected} onSelect={onSelect} lang={lang} dimmed={dimmed} />
    </aside>
  );
}

// ---------- app ----------
export default function App() {
  const data = useData();
  const [lang, setLang] = useState(initialLang);
  const [metric, setMetric] = useState('rti');
  const [year, setYear] = useState(2024);
  const [selected, setSelected] = useState(null);
  const [station, setStation] = useState(null);
  const [find, setFind] = useState({ rent: FIND.rentMax, minutes: FIND.minMax, frequent: false });
  const t = T[lang];
  const m = METRICS[metric];
  const onSelect = (id, st) => {
    setSelected(id);
    setStation(st);
  };

  useEffect(() => {
    document.documentElement.lang = lang;
    document.title = t.title;
  }, [lang]);

  const switchLang = (l) => {
    setLang(l);
    rememberLang(l);
  };

  const matches = useMemo(() => {
    if (!data) return new Set();
    return new Set(data.towns.features.map((f) => f.properties).filter((p) => fits(p, find)).map((p) => p.muni5));
  }, [data, find]);
  const filtering = find.rent < FIND.rentMax || find.minutes < FIND.minMax || find.frequent;
  const dimmed = useMemo(() => {
    if (!data || !filtering) return new Set();
    return new Set(data.towns.features.map((f) => f.properties.muni5).filter((id) => !matches.has(id)));
  }, [data, matches, filtering]);

  return (
    <div className="app">
      <header className="top">
        <div className="bar">
          <a className="brand" href="https://galeanoworks.com" aria-label="Galeano Works">
            <img src="./gW.png" alt="" width="36" height="36" />
          </a>
          <a className="back" href={t.backHref}>
            {t.back}
          </a>
          <div className="lang" role="group" aria-label="Language">
            <button type="button" aria-pressed={lang === 'en'} onClick={() => switchLang('en')}>
              EN
            </button>
            <span aria-hidden="true">/</span>
            <button type="button" aria-pressed={lang === 'es'} onClick={() => switchLang('es')}>
              ES
            </button>
          </div>
        </div>
        <div className="eyebrow">{t.eyebrow}</div>
        <h1>{t.h1}</h1>
        <p className="lede">{t.lede}</p>
        <p className="why">
          <b>{t.whyTitle}.</b> {t.why}
        </p>
      </header>

      <div className="toolbar">
        <div className="tabs" role="group" aria-label={t.measure}>
          {Object.keys(METRICS).map((k) => (
            <button key={k} type="button" aria-pressed={metric === k} onClick={() => setMetric(k)}>
              {t.metrics[k].label}
            </button>
          ))}
        </div>
        <label className={'year' + (m.byYear ? '' : ' off')}>
          <span>{t.year}</span>
          <input type="range" min={2015} max={2024} step={1} value={year} onChange={(e) => setYear(+e.target.value)} disabled={!m.byYear} />
          <b>{m.byYear ? year : m.period}</b>
        </label>
      </div>
      <p className="note">{t.metrics[metric].note}</p>

      <main className="main">
        {data ? (
          <>
            <MapView data={data} metric={metric} year={year} selected={selected} onSelect={onSelect} lang={lang} dimmed={dimmed} filtering={filtering} />
            <Panel
              data={data}
              metric={metric}
              year={year}
              selected={selected}
              station={station}
              onSelect={onSelect}
              lang={lang}
              find={find}
              setFind={setFind}
              matches={matches}
              dimmed={dimmed}
            />
          </>
        ) : (
          <div className="loading">{t.loading}</div>
        )}
      </main>

      <section className="cta">
        <p>{t.ctaText}</p>
        <p className="cta-links">
          <a href={t.ctaCallHref} target="_blank" rel="noopener">
            {t.ctaCall}
          </a>
          <span aria-hidden="true">·</span>
          <a href="mailto:sebastian@galeanoworks.com?subject=Coast%20Commuter%20Map">{t.ctaMail}</a>
        </p>
      </section>

      <footer className="foot">
        <p>{t.foot}</p>
        <p className="credit">
          <a href="https://galeanoworks.com">{t.credit}</a>
        </p>
      </footer>
    </div>
  );
}
