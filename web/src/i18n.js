// All visible text, English and Spanish. The language choice is shared with
// galeanoworks.com through the same localStorage key and #es hash.
export const KEY = 'gw-lang';

export function initialLang() {
  if (location.hash === '#es' || location.hash === '#en') return location.hash.slice(1);
  try {
    const s = localStorage.getItem(KEY);
    if (s === 'es' || s === 'en') return s;
  } catch (e) {}
  const nav = (navigator.language || 'en').toLowerCase();
  return nav.indexOf('es') === 0 ? 'es' : 'en';
}

export function rememberLang(l) {
  try {
    localStorage.setItem(KEY, l);
  } catch (e) {}
  try {
    history.replaceState(null, '', l === 'es' ? '#es' : location.pathname + location.search);
  } catch (e) {}
}

const CAL = 'https://calendly.com/sebastian-galeanoworks';

export const T = {
  en: {
    title: 'Coast Commuter Map · Galeano Works',
    back: '← Destination services',
    backHref: '../../destination-services.html',
    eyebrow: 'Coast Commuter Map · Rodalies R2 Sud',
    h1: 'What a commute to Barcelona costs along the coast',
    lede: 'Rent, household income and train time for the 13 towns along the Rodalies R2 Sud, from Sant Vicenç de Calders to Barcelona, 2015 to 2024.',
    measure: 'Measure',
    year: 'Year',
    metrics: {
      rti: { label: 'Rent to income', short: 'Rent as a share of income', note: 'A year of average rent as a share of average household net income.' },
      rent: { label: 'Rent', short: 'Average monthly rent', note: 'Average rent on new contracts registered with Incasòl, annual average.' },
      inc: { label: 'Income', short: 'Household net income', note: 'Average net income per household per year, INE.' },
      chg: { label: 'Rent change', short: 'Rent change, 2015 to 2024', note: 'Change in average monthly rent between 2015 and 2024.' },
      med: {
        label: 'Median, apartments',
        short: 'Median apartment rent, 2022',
        note: 'Median monthly rent of apartments across all leases declared on 2022 tax returns (Ministry of Housing, SERPAVI). A different source from the averages: it includes older leases, so it runs lower.',
      },
    },
    legendLine: 'Rodalies R2 Sud',
    legendStation: 'Station, fastest train to Sants (min)',
    legendDim: 'Faded towns are outside your filters',
    noData: 'no data',
    sea: 'Mar Mediterrània',
    mapLabel: 'Map of the R2 Sud corridor',
    loading: 'Loading map…',
    choose: 'Choose a town…',
    chooseSr: 'Choose a town',
    // finder
    findTitle: 'Find a town that fits',
    findRent: (v) => (v == null ? 'Any rent' : `Rent up to ${v} a month`),
    findMin: (v) => (v == null ? 'Any train time' : `Fastest train to Sants up to ${v} min`),
    findFreq: 'At least 8 trains between 7 and 9am',
    findCount: (n, t) => (n === t ? `All ${t} towns fit` : n === 0 ? 'No town fits these filters' : `${n} of ${t} towns fit`),
    findNote: 'Rent is the 2024 average for new contracts, which is what a newcomer is likely to pay. Train time is the fastest scheduled weekday morning train to Barcelona-Sants.',
    reset: 'Reset',
    // intro
    introTitle: 'What the map shows',
    findings: [
      ['Same train, €511 apart.', ' The fastest morning trains reach Sants in 35 minutes from both Sitges and Vilanova i la Geltrú. In 2024, new leases averaged €1,306 a month in Sitges and €795 in Vilanova, which also has more morning trains, 13 against 11. Counting apartments only, the gap is smaller but still there: medians of €844 and €647 in 2022.'],
      ['Closer can cost less.', ' Viladecans is 15 minutes out at €865 a month. Castelldefels, at 21 minutes, averages €1,163.'],
      ['Service thins past Vilanova.', ' Cubelles, Cunit and Calafell get 4 trains between 7 and 9am, against 11 to 16 closer in. El Vendrell keeps 12, through the Sant Vicenç de Calders junction.'],
      ['Sitges spends the largest share of income on rent:', ' 28.7% in 2024, above Barcelona at 27.6%.'],
      ['Rent outpaced income in all 13 towns.', ' Sitges (+73%) and Calafell (+70%) rose fastest since 2015: the priciest town on the line and one of the cheapest.'],
    ],
    caveat:
      'Averages are of new contracts registered with Incasòl, so a few expensive leases can raise them in towns with a high-end segment, such as Sitges and Castelldefels. Counting apartments only, with 2022 medians from tax returns, both still rent above Barcelona.',
    whyTitle: 'Why this map',
    why: 'Catalonia publishes a lot of housing and transport data, but it is scattered across agencies and hard to read. This map distills it into small, useful pieces to help guide your decisions.',
    // detail
    noStation: 'No R2 Sud station in this municipality.',
    destStation: 'Destination station',
    stationLine: (m, n) => `Fastest train ${m} min to Sants · ${n} trains 7 to 9am`,
    rentY: (y) => `Rent, ${y}`,
    month: 'a month',
    income: 'Household income',
    yearNet: 'a year, net',
    rti: 'Rent to income',
    rank: (n, t) => (n === 1 ? `Highest of ${t}` : `${n}${['th', 'st', 'nd', 'rd'][(n % 100 > 10 && n % 100 < 14) || n % 10 > 3 ? 0 : n % 10]} of ${t}`),
    since: (name, r, i) => `From 2015 to 2024, average rent in ${name} rose ${r}% and household income ${i}%.`,
    idxTitle: 'Rent and income since 2015 (2015 = 100)',
    idxRent: 'Rent',
    idxInc: 'Income',
    medTitle: 'Median rent, all leases, 2022',
    apts: 'Apartments',
    houses: 'Houses',
    medNote: (s, name) => `Bars show the middle half of leases. Houses are ${s}% of rentals in ${name}.`,
    scatterTitle: (s) => `${s}, against train time to Sants`,
    scatterAxis: 'fastest train to Barcelona-Sants, minutes',
    // contact
    ctaText: 'Weighing towns for a move to the Barcelona area?',
    ctaCall: 'Schedule a call',
    ctaCallHref: CAL,
    ctaMail: 'Email',
    foot:
      'Data: Generalitat de Catalunya, Incasòl rental bonds (annual average of new contracts); Ministry of Housing, SERPAVI (2022 medians from tax returns); INE household income atlas; Renfe GTFS (fastest weekday morning train arriving at Barcelona-Sants, November 2026); ICGC municipal boundaries. Sant Pere de Ribes has no R2 Sud station.',
    credit: 'A Galeano Works study · galeanoworks.com',
    north: 'North',
  },
  es: {
    title: 'Mapa R2 Sud · Galeano Works',
    back: '← Servicios de destino',
    backHref: '../../destination-services.html#es',
    eyebrow: 'Mapa R2 Sud · Rodalies',
    h1: 'Lo que cuesta vivir en la costa y trabajar en Barcelona',
    lede: 'Alquiler, renta de los hogares y tiempo en tren en los 13 municipios a lo largo de la Rodalies R2 Sud, de Sant Vicenç de Calders a Barcelona, de 2015 a 2024.',
    measure: 'Indicador',
    year: 'Año',
    metrics: {
      rti: { label: 'Alquiler / renta', short: 'Alquiler sobre la renta', note: 'Un año de alquiler medio como porcentaje de la renta neta media por hogar.' },
      rent: { label: 'Alquiler', short: 'Alquiler medio mensual', note: 'Alquiler medio de los contratos nuevos registrados en el Incasòl, media anual.' },
      inc: { label: 'Renta', short: 'Renta neta por hogar', note: 'Renta neta media anual por hogar, INE.' },
      chg: { label: 'Variación', short: 'Variación del alquiler, 2015 a 2024', note: 'Variación del alquiler medio mensual entre 2015 y 2024.' },
      med: {
        label: 'Mediana, pisos',
        short: 'Alquiler mediano de pisos, 2022',
        note: 'Alquiler mensual mediano de los pisos en todos los contratos declarados en el IRPF de 2022 (Ministerio de Vivienda, SERPAVI). Es una fuente distinta de las medias: incluye contratos antiguos, por eso sale más bajo.',
      },
    },
    legendLine: 'Rodalies R2 Sud',
    legendStation: 'Estación, tren más rápido a Sants (min)',
    legendDim: 'Los municipios atenuados quedan fuera de sus filtros',
    noData: 'sin datos',
    sea: 'Mar Mediterrània',
    mapLabel: 'Mapa del corredor de la R2 Sud',
    loading: 'Cargando el mapa…',
    choose: 'Elija un municipio…',
    chooseSr: 'Elija un municipio',
    findTitle: 'Encuentre un municipio a su medida',
    findRent: (v) => (v == null ? 'Cualquier alquiler' : `Alquiler hasta ${v} al mes`),
    findMin: (v) => (v == null ? 'Cualquier tiempo en tren' : `Tren más rápido a Sants, hasta ${v} min`),
    findFreq: 'Al menos 8 trenes entre las 7 y las 9',
    findCount: (n, t) => (n === t ? `Encajan los ${t} municipios` : n === 0 ? 'Ningún municipio encaja con estos filtros' : `Encajan ${n} de ${t} municipios`),
    findNote: 'El alquiler es la media de 2024 en contratos nuevos, que es lo que probablemente pagará quien llega. El tiempo en tren es el del tren programado más rápido de un día laborable por la mañana hasta Barcelona-Sants.',
    reset: 'Restablecer',
    introTitle: 'Lo que muestra el mapa',
    findings: [
      ['El mismo tren, 511 € de diferencia.', ' Los trenes más rápidos de la mañana llegan a Sants en 35 minutos tanto desde Sitges como desde Vilanova i la Geltrú. En 2024, los contratos nuevos tuvieron una media de 1306 € al mes en Sitges y 795 € en Vilanova, que además tiene más trenes por la mañana, 13 frente a 11. Contando solo pisos, la diferencia es menor pero se mantiene: medianas de 844 € y 647 € en 2022.'],
      ['Más cerca puede salir más barato.', ' Viladecans está a 15 minutos, con 865 € al mes. Castelldefels, a 21 minutos, tiene una media de 1163 €.'],
      ['Más allá de Vilanova hay menos trenes.', ' Cubelles, Cunit y Calafell tienen 4 trenes entre las 7 y las 9, frente a 11 a 16 más cerca de Barcelona. El Vendrell mantiene 12, por el enlace de Sant Vicenç de Calders.'],
      ['Sitges dedica al alquiler la mayor parte de la renta:', ' el 28,7 % en 2024, por encima de Barcelona, con el 27,6 %.'],
      ['El alquiler subió más que la renta en los 13 municipios.', ' Sitges (+73 %) y Calafell (+70 %) son los que más subieron desde 2015: el municipio más caro de la línea y uno de los más baratos.'],
    ],
    caveat:
      'Las medias son de los contratos nuevos registrados en el Incasòl, así que unos pocos alquileres caros pueden elevarlas en municipios con un segmento alto, como Sitges y Castelldefels. Contando solo pisos, con las medianas de 2022 del IRPF, los dos siguen por encima de Barcelona.',
    whyTitle: 'Por qué este mapa',
    why: 'Cataluña publica muchos datos sobre vivienda y transporte, pero están repartidos entre organismos y cuesta leerlos. Este mapa los resume en piezas pequeñas y útiles para orientar sus decisiones.',
    noStation: 'Este municipio no tiene estación de la R2 Sud.',
    destStation: 'Estación de destino',
    stationLine: (m, n) => `Tren más rápido ${m} min a Sants · ${n} trenes de 7 a 9`,
    rentY: (y) => `Alquiler, ${y}`,
    month: 'al mes',
    income: 'Renta del hogar',
    yearNet: 'al año, neta',
    rti: 'Alquiler / renta',
    rank: (n, t) => (n === 1 ? `La más alta de ${t}` : `${n}.ª de ${t}`),
    since: (name, r, i) => `De 2015 a 2024, el alquiler medio en ${name} subió un ${r}\u00a0% y la renta de los hogares un ${i}\u00a0%.`,
    idxTitle: 'Alquiler y renta desde 2015 (2015 = 100)',
    idxRent: 'Alquiler',
    idxInc: 'Renta',
    medTitle: 'Alquiler mediano, todos los contratos, 2022',
    apts: 'Pisos',
    houses: 'Casas',
    medNote: (s, name) => `Las barras muestran la mitad central de los contratos. Las casas son el ${s}\u00a0% de los alquileres en ${name}.`,
    scatterTitle: (s) => `${s}, frente al tiempo en tren a Sants`,
    scatterAxis: 'tren más rápido a Barcelona-Sants, minutos',
    ctaText: '¿Pensando en mudarse a Barcelona?',
    ctaCall: 'Agendar una llamada',
    ctaCallHref: CAL,
    ctaMail: 'Correo',
    foot:
      'Datos: Generalitat de Catalunya, fianzas de alquiler del Incasòl (media anual de contratos nuevos); Ministerio de Vivienda, SERPAVI (medianas de 2022 del IRPF); INE, Atlas de distribución de renta de los hogares; Renfe GTFS (tren más rápido de un día laborable por la mañana con llegada a Barcelona-Sants, noviembre de 2026); ICGC, límites municipales. Sant Pere de Ribes no tiene estación de la R2 Sud.',
    credit: 'Un estudio de Galeano Works · galeanoworks.com',
    north: 'Norte',
  },
};
