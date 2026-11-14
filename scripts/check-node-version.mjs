import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const expected = fs.readFileSync(path.join(root, '.nvmrc'), 'utf8').trim()
const actual = process.versions.node
const [expectedMajor, expectedMinor, expectedPatch] = expected.split('.').map(Number)
const [actualMajor, actualMinor, actualPatch] = actual.split('.').map(Number)
const compatible =
  actualMajor === expectedMajor &&
  (actualMinor > expectedMinor || (actualMinor === expectedMinor && actualPatch >= expectedPatch))

if (!compatible) {
  console.error(
    `Node.js ${expectedMajor}.${expectedMinor}.${expectedPatch}+ required; current version is ${actual}.`,
  )
  console.error('Activate .nvmrc or use the project Node.js 22 runtime before running npm commands.')
  process.exit(1)
}

console.log(`Node.js ${actual} active (project baseline ${expected})`)
