// Brand tokens, taken from galeanoworks.com site.css
export const C = {
  ink: '#1c1c1c',
  body: '#3d3d3d',
  muted: '#787878',
  rule: '#e4e4e4',
  bg: '#fafaf7',
  accent: '#ff4a45',
  land: '#e9e8e2',
  nodata: '#d6d5cf',
};

const CORAL = ['#fde4e2', '#f9b3ae', '#f47c75', '#e2423c', '#a3201c'];
const GREY = ['#eceae4', '#cdcbc4', '#a3a19b', '#6f6d68', '#3a3936'];

export const YEARS = [2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024];

const eur = (v) => '€' + Math.round(v).toLocaleString('en-US');
const pct = (v, d = 1) => v.toFixed(d) + '%';

// Fixed breaks so colors mean the same thing in every year of the slider.
export const METRICS = {
  rti: {
    label: 'Rent-to-income',
    short: 'Rent as % of income',
    note: 'A year of average rent as a share of average household net income.',
    field: (y) => `rti_${y}`,
    breaks: [21, 23, 25, 27],
    legend: ['under 21%', '21 to 23%', '23 to 25%', '25 to 27%', '27% or more'],
    colors: CORAL,
    fmt: (v) => pct(v),
    byYear: true,
  },
  rent: {
    label: 'Monthly rent',
    short: 'Average monthly rent',
    note: 'Average rent on new contracts registered with Incasòl, annual average.',
    field: (y) => `rent_${y}`,
    breaks: [550, 700, 850, 1000],
    legend: ['under €550', '€550 to 700', '€700 to 850', '€850 to 1,000', '€1,000 or more'],
    colors: CORAL,
    fmt: eur,
    byYear: true,
  },
  inc: {
    label: 'Household income',
    short: 'Household net income',
    note: 'Average net income per household per year, INE.',
    field: (y) => `inc_${y}`,
    breaks: [30000, 35000, 40000, 45000],
    legend: ['under €30k', '€30k to 35k', '€35k to 40k', '€40k to 45k', '€45k or more'],
    colors: GREY,
    fmt: eur,
    byYear: true,
  },
  chg: {
    label: 'Rent change',
    short: 'Rent change, 2015 to 2024',
    note: 'Change in average monthly rent between 2015 and 2024.',
    field: () => 'rent_chg',
    breaks: [45, 50, 55, 65],
    legend: ['under +45%', '+45 to 50%', '+50 to 55%', '+55 to 65%', '+65% or more'],
    colors: CORAL,
    fmt: (v) => '+' + pct(v, 0),
    byYear: false,
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

export const fmtEur = eur;
export const fmtPct = pct;
