// Brand tokens, taken from galeanoworks.com site.css
export const C = {
  ink: '#1c1c1c',
  body: '#3d3d3d',
  muted: '#787878',
  rule: '#e4e4e4',
  bg: '#fafaf7',
  accent: '#ff4a45',
  paper: '#fafaf7',
  sea: '#eceeec',
  nodata: '#e2e1dc',
};

const CORAL = ['#fde4e2', '#f9b3ae', '#f47c75', '#e2423c', '#a3201c'];
const GREY = ['#ecebe6', '#cfcdc6', '#a6a49e', '#73716c', '#3d3c39'];

export const YEARS = [2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024];

// number formatting per language
export const fmtEur = (v, lang = 'en') =>
  lang === 'es' ? Math.round(v).toLocaleString('es-ES') + '\u00a0€' : '€' + Math.round(v).toLocaleString('en-US');
export const fmtPct = (v, d = 1, lang = 'en') =>
  lang === 'es' ? v.toFixed(d).replace('.', ',') + '\u00a0%' : v.toFixed(d) + '%';
const fmtK = (v, lang) => (lang === 'es' ? Math.round(v / 1000) + '\u00a0mil\u00a0€' : '€' + Math.round(v / 1000) + 'k');

// Numeric set-up of each measure. Labels and notes live in i18n.js.
// Fixed breaks so colors mean the same thing in every year of the slider.
export const METRICS = {
  rti: {
    field: (y) => `rti_${y}`,
    breaks: [21, 23, 25, 27],
    colors: CORAL,
    fmt: (v, l) => fmtPct(v, 1, l),
    tick: (v, l) => fmtPct(v, 0, l),
    byYear: true,
  },
  rent: {
    field: (y) => `rent_${y}`,
    breaks: [550, 700, 850, 1000],
    colors: CORAL,
    fmt: fmtEur,
    tick: fmtEur,
    byYear: true,
  },
  inc: {
    field: (y) => `inc_${y}`,
    breaks: [30000, 35000, 40000, 45000],
    colors: GREY,
    fmt: fmtEur,
    tick: fmtK,
    byYear: true,
  },
  chg: {
    field: () => 'rent_chg',
    breaks: [45, 50, 55, 65],
    colors: CORAL,
    fmt: (v, l) => '+' + fmtPct(v, 0, l),
    tick: (v, l) => '+' + fmtPct(v, 0, l),
    byYear: false,
    period: '2015–24',
  },
  med: {
    field: () => 'sv_apt',
    breaks: [550, 650, 750, 825],
    colors: CORAL,
    fmt: fmtEur,
    tick: fmtEur,
    byYear: false,
    period: '2022',
  },
};

export function colorFor(metric, value) {
  const m = METRICS[metric];
  if (value === null || value === undefined || Number.isNaN(value)) return C.nodata;
  let i = 0;
  while (i < m.breaks.length && value >= m.breaks[i]) i++;
  return m.colors[i];
}

export function fillExpression(metric, year) {
  const m = METRICS[metric];
  const field = m.field(year);
  const step = ['step', ['to-number', ['get', field]], m.colors[0]];
  m.breaks.forEach((b, i) => step.push(b, m.colors[i + 1]));
  return ['case', ['==', ['typeof', ['get', field]], 'number'], step, C.nodata];
}

// Budget and commute finder. Rent is the 2024 average for new contracts,
// minutes are the fastest weekday morning train to Barcelona-Sants.
export const FIND = { rentMin: 600, rentMax: 1400, rentStep: 50, minMin: 10, minMax: 60, minStep: 5, frequent: 8 };

export function fits(p, f) {
  if (f.rent < FIND.rentMax && !(p.rent_2024 <= f.rent)) return false;
  const anyTime = f.minutes >= FIND.minMax;
  if (p.min_to_sants == null) return anyTime && !f.frequent;
  if (!anyTime && p.min_to_sants > f.minutes) return false;
  if (f.frequent && p.min_to_sants > 0 && !(p.trains_7_to_9am >= FIND.frequent)) return false;
  return true;
}
