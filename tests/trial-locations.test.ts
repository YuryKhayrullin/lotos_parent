import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { PublicBranch } from '../lib/booking-v2'
import { trialLocations } from '../lib/trial-locations'

const parus: PublicBranch = {
  id: 'parus-in-crm',
  name: 'СК «ПАРУС»',
  city: 'Москва',
  address: 'Москва, Привольная улица, 42',
  metro: null,
  timeZone: 'Europe/Moscow',
  photoUrl: null,
  arrivalText: null,
  bookingEnabled: false,
  tariffs: [],
  offers: [
    {
      category: 'swimming',
      title: 'Плавание',
      published: true,
      minAgeMonths: null,
      maxAgeMonths: null,
      conditions: '',
      trialPriceMinor: '120000',
      currency: 'RUB',
    },
  ],
}

test('trial directory displays the club locations offline with no eligible intake', () => {
  const locations = trialLocations([])
  assert.equal(locations.length, 8)
  assert.equal(new Set(locations.map((location) => location.photoUrl)).size, 8)
  assert.ok(locations.every((location) => location.offers.every((offer) => offer.branchId === null)))
})

test('only the verified venue and published direction can submit, even if scheduling is disabled', () => {
  const duplicateDistrict = { ...parus, id: 'different-crm-branch', name: 'Жулебино', address: 'Жулебино' }
  const findParus = (branches: PublicBranch[]) => trialLocations(branches).find((b) => b.id === 'parus')!
  assert.deepEqual(
    findParus([parus, duplicateDistrict]).offers.map((offer) => offer.branchId),
    ['parus-in-crm', null],
  )
  assert.ok(
    findParus([{ ...parus, address: 'Привольная улица 42А' }]).offers.every((offer) => !offer.branchId),
  )
  assert.ok(
    findParus([parus, { ...parus, id: 'duplicate-at-same-address' }]).offers.every(
      (offer) => !offer.branchId,
    ),
  )
})
