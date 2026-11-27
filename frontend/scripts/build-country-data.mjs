/**
 * Gathers, for each country of the globe, what its fact sheet needs and rarely changes, for `make country-data`: its
 * currencies and languages (REST Countries) and the title of its Wikivoyage article in English and in French
 * (Wikidata).
 * Writes backend/internal/models/countries.json, which the backend embeds: it is also its list of valid country codes.
 * Run once or twice a year: REST Countries' free plan allows 1,000 requests a month, and this takes about ten. The
 * articles' text is not stored: the backend loads it live.
 */
import { readFileSync, writeFileSync } from 'node:fs'

import { WITHOUT_MAP } from './geo.mjs'

const SPARQL = 'https://query.wikidata.org/sparql'
// Wikimedia asks every client to name itself and give a way to reach its authors.
const USER_AGENT = 'TravelLarper/1.0 (https://github.com/Minatr/travel-larper)'
const COUNTRIES = new URL('../public/geo/countries.json', import.meta.url)
const OUTPUT = new URL('../../backend/internal/models/countries.json', import.meta.url)
const ENV_FILE = new URL('../../.env', import.meta.url)
const REST_COUNTRIES = 'https://api.restcountries.com/countries/v5'
// REST Countries' default page size: about ten pages for every country.
const PAGE_SIZE = 25
const LANGUAGES = ['en', 'fr']
// Codes whose item Wikidata does not find by ISO 3166-1 code (P297), given by hand: Kosovo has none, and NL is the
// code of the Kingdom of the Netherlands (with Aruba, Curaçao, Sint Maarten), which has no Wikivoyage article.
const ITEM_OVERRIDES = { NL: 'Q55', XK: 'Q1246' }

loadEnvFile()
const apiKey = process.env.RESTCOUNTRIES_API_KEY
if (!apiKey) {
  console.error('RESTCOUNTRIES_API_KEY is not set (.env): see .env.example')
  process.exit(1)
}

const codes = JSON.parse(readFileSync(COUNTRIES, 'utf8'))
  .features.map((feature) => feature.properties.code)
  .filter((code) => !WITHOUT_MAP.has(code))
  .sort()

const facts = await fetchFacts()
const languageNames = await fetchLanguageNames(new Set([...facts.values()].flatMap((country) => country.languages)))

// By Wikidata item, not by name: "Georgia" would find the US state.
const articles = new Map()
for (const row of await query(byCodeQuery(codes.filter((code) => !(code in ITEM_OVERRIDES))))) {
  keepBest(row.code.value, row)
}
for (const row of await query(byItemQuery(ITEM_OVERRIDES))) {
  keepBest(row.code.value, row)
}

const output = {}
const missing = { facts: [], en: [], fr: [] }
for (const code of codes) {
  const titles = articles.get(code)?.titles ?? {}
  const country = facts.get(code)
  if (country === undefined) {
    missing.facts.push(code)
  }
  output[code] = {
    currencies: country?.currencies ?? [],
    languages: (country?.languages ?? []).map((language) => ({
      code: language.code,
      names: languageNames.get(language.code) ?? { en: language.name, fr: language.name },
    })),
    wikivoyage: Object.fromEntries(LANGUAGES.map((language) => [language, titles[language] ?? null])),
  }
  for (const language of LANGUAGES) {
    if (output[code].wikivoyage[language] === null) {
      missing[language].push(code)
    }
  }
}
writeFileSync(OUTPUT, `${JSON.stringify(output, null, 2)}\n`)
console.log(`${codes.length} countries written`)
console.log(`unknown to REST Countries: ${missing.facts.join(' ') || 'none'}`)
for (const language of LANGUAGES) {
  console.log(`no ${language} article: ${missing[language].join(' ') || 'none'}`)
}

// The key lives in .env, like the backend's settings; a variable already set wins.
function loadEnvFile() {
  try {
    process.loadEnvFile(ENV_FILE)
  } catch {
    // No .env: the key may come from the environment.
  }
}

// Every country, page after page: currencies (ISO 4217) and languages (BCP 47, with their English name), by ISO code.
async function fetchFacts() {
  const byCode = new Map()
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const fields = 'codes.alpha_2,currencies,languages'
    const url = `${REST_COUNTRIES}?response_fields=${fields}&limit=${PAGE_SIZE}&offset=${offset}`
    // In a header rather than the URL, so that the key never lands in a log.
    const response = await fetch(url, { headers: { Authorization: `Bearer ${apiKey}`, 'User-Agent': USER_AGENT } })
    if (!response.ok) {
      console.error(`REST Countries failed (HTTP ${response.status})`)
      process.exit(1)
    }
    const { data } = await response.json()
    for (const country of data.objects) {
      byCode.set(country.codes.alpha_2, {
        currencies: (country.currencies ?? []).map((currency) => currency.code).filter(Boolean),
        // The English name too: browsers do not know every language's (Zimbabwe's Chibarwe, bwg).
        languages: (country.languages ?? [])
          .filter((language) => language.bcp47)
          .map((language) => ({ code: language.bcp47, name: language.name ?? language.bcp47 })),
      })
    }
    if (!data.meta.more) {
      return byCode
    }
  }
}

// A code can match several items (a former state, a dependency): the one with the most articles wins.
function keepBest(code, row) {
  const titles = Object.fromEntries(
    LANGUAGES.filter((language) => row[language]).map((language) => [language, row[language].value]),
  )
  const current = articles.get(code)
  if (current === undefined || Object.keys(titles).length > Object.keys(current.titles).length) {
    articles.set(code, { titles })
  }
}

function articleClauses() {
  return LANGUAGES.map(
    (language) =>
      `OPTIONAL { ?${language}Page schema:about ?item; schema:isPartOf <https://${language}.wikivoyage.org/>; ` +
      `schema:name ?${language} }`,
  ).join('\n')
}

function byCodeQuery(countryCodes) {
  const values = countryCodes.map((code) => `"${code}"`).join(' ')
  // Without the states that no longer exist (P576, dissolved), which may still carry an ISO code.
  return `SELECT ?code ?en ?fr WHERE {
    VALUES ?code { ${values} }
    ?item wdt:P297 ?code .
    FILTER NOT EXISTS { ?item wdt:P576 [] }
    ${articleClauses()}
  }`
}

// A name for each language in English and in French, from Wikidata, by ISO 639 code: browsers do not know every
// language's (Zimbabwe's Chibarwe, bwg), and REST Countries names them in English only. Its own English name when
// Wikidata has none.
async function fetchLanguageNames(languages) {
  const byCode = new Map([...languages].map((language) => [language.code, language.name]))
  const values = [...byCode.keys()].map((code) => `"${code}"`).join(' ')
  const rows = await query(`SELECT ?code ?en ?fr WHERE {
    VALUES ?code { ${values} }
    { ?language wdt:P218 ?code } UNION { ?language wdt:P219 ?code } UNION { ?language wdt:P220 ?code }
    OPTIONAL { ?language rdfs:label ?en FILTER(LANG(?en) = "en") }
    OPTIONAL { ?language rdfs:label ?fr FILTER(LANG(?fr) = "fr") }
  }`)
  const names = new Map()
  for (const row of rows) {
    const code = row.code.value
    // A code can match several items: the first with both names wins.
    if (names.has(code) && names.get(code).complete) {
      continue
    }
    const fallback = byCode.get(code)
    names.set(code, {
      complete: Boolean(row.en && row.fr),
      en: row.en?.value ?? fallback,
      fr: row.fr?.value ?? row.en?.value ?? fallback,
    })
  }
  return new Map([...names].map(([code, { en, fr }]) => [code, { en, fr }]))
}

function byItemQuery(overrides) {
  const values = Object.entries(overrides)
    .map(([code, item]) => `("${code}" wd:${item})`)
    .join(' ')
  return `SELECT ?code ?en ?fr WHERE {
    VALUES (?code ?item) { ${values} }
    ${articleClauses()}
  }`
}

async function query(sparql) {
  const response = await fetch(SPARQL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/sparql-results+json',
      'User-Agent': USER_AGENT,
    },
    body: new URLSearchParams({ query: sparql }),
  })
  if (!response.ok) {
    console.error(`Wikidata query failed (HTTP ${response.status})`)
    process.exit(1)
  }
  return (await response.json()).results.bindings
}
