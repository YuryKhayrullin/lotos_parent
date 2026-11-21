import type { BookingCategory, PublicBranch } from './booking-v2'

// Display names, addresses and photos: https://sportclublotos.ru/locations
const locations = [
  {
    id: 'azovsky',
    name: 'Fitzal Азовский',
    city: 'Москва',
    address: 'Азовская улица 24 к3',
    metro: 'Севастопольская / Каховская',
    aliases: ['Азовский Fitzal'],
    street: 'азовская',
  },
  {
    id: 'volna-olgino',
    name: 'СК «Волна» · Ольгино',
    city: 'Балашиха',
    address: 'мкр. Ольгино, Четвёртая улица 25',
    metro: 'МЦД-4 Ольгино',
    transit: 'mcd' as const,
    aliases: ['ВОЛНА'],
    street: 'четвертая',
  },
  {
    id: 'chertanovo',
    name: 'СК «Чертаново»',
    city: 'Москва',
    address: 'мкр. Северное Чертаново, корпус 806',
    metro: 'Чертановская',
    aliases: [],
    street: 'чертаново',
  },
  {
    id: 'fili-grad',
    name: 'Fusion Fitness Фили-град',
    city: 'Москва',
    address: 'Береговой проезд 5А, корпус 1',
    metro: 'Фили',
    aliases: ['Фили-град', 'Fusion Fitness'],
    street: 'береговой',
  },
  {
    id: 'parus',
    name: 'СК «Парус»',
    city: 'Москва',
    address: 'Привольная улица 42',
    metro: 'Жулебино',
    aliases: ['Жулебино'],
    street: 'привольная',
  },
  {
    id: 'moskvich',
    name: 'СК «Москвич»',
    city: 'Москва',
    address: 'Волгоградский проспект 46/15',
    metro: 'Текстильщики',
    aliases: ['Москвич'],
    street: 'волгоградский',
  },
  {
    id: 'volna-novokosino',
    name: 'СК «Волна» · Новокосино',
    city: 'Реутов',
    address: 'улица Г. И. Котовского 13А',
    metro: 'Новокосино',
    aliases: ['Реутов, СК Волна', 'СК Волна'],
    street: 'котовского',
  },
  {
    id: 'kuzminki',
    name: 'Школа циркового искусства',
    city: 'Москва',
    address: 'Волгоградский проспект 169 к2 ст2',
    metro: 'Кузьминки',
    aliases: ['Никулина'],
    street: 'волгоградский',
  },
]

const directions: ReadonlyArray<{ category: BookingCategory; title: string }> = [
  { category: 'swimming', title: 'Начальное плавание' },
  { category: 'synchronized_swimming', title: 'Синхронное плавание' },
]

export type TrialLocation = {
  id: string
  name: string
  city: string
  address: string
  metro: string
  transit: 'metro' | 'mcd'
  photoUrl: string
  searchText: string
  arrivalText: string | null
  offers: Array<{
    category: BookingCategory
    title: string
    trialPriceMinor: string | null
    minAgeMonths: number | null
    maxAgeMonths: number | null
    branchId: string | null
  }>
}

export function normalizeTrialSearch(value: string) {
  return value
    .toLowerCase()
    .replaceAll('ё', 'е')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
}

function houseNumbers(address: string) {
  return (
    address
      .toLowerCase()
      .replace(/(\d)\s*(?:корп(?:ус)?|к|ст|с)\.?\s*(?=\d)/g, '$1 ')
      .match(/\d+[а-яa-z]?/g) ?? []
  ).join(':')
}

export function trialLocations(branches: readonly PublicBranch[]): TrialLocation[] {
  return locations.map(({ id, name, city, address, metro, transit, aliases, street }) => {
    const names = [name, ...aliases].map(normalizeTrialSearch)
    const matches = branches.filter(
      (branch) =>
        names.includes(normalizeTrialSearch(branch.name)) &&
        normalizeTrialSearch(branch.city) === normalizeTrialSearch(city) &&
        normalizeTrialSearch(branch.address).includes(street) &&
        houseNumbers(branch.address) === houseNumbers(address),
    )
    // An informational card can always offer a call; submit only to a uniquely matched CRM branch and published offer.
    const crm = matches.length === 1 ? matches[0] : undefined
    return {
      id,
      name,
      city,
      address,
      metro,
      transit: transit ?? 'metro',
      photoUrl: `/pools/${id}.webp`,
      searchText: normalizeTrialSearch([name, city, address, metro, ...aliases].join(' ')),
      arrivalText: crm?.arrivalText ?? null,
      offers: directions.map(({ category, title }) => {
        const offer = crm?.offers.find((item) => item.category === category)
        return {
          category,
          title,
          trialPriceMinor: offer?.trialPriceMinor ?? null,
          minAgeMonths: offer?.minAgeMonths ?? null,
          maxAgeMonths: offer?.maxAgeMonths ?? null,
          branchId: offer ? (crm?.id ?? null) : null,
        }
      }),
    }
  })
}
