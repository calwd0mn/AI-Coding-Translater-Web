import assert from 'node:assert/strict'
import test from 'node:test'
import { getCorsOptions, getListenHost, getListenPort } from './server-options'

test('getListenPort uses configured port when provided', () => {
  assert.equal(getListenPort({ PORT: '3002' }), 3002)
})

test('getListenPort falls back to 3001 for missing or invalid values', () => {
  assert.equal(getListenPort({}), 3001)
  assert.equal(getListenPort({ PORT: 'abc' }), 3001)
})

test('getListenHost uses configured host for Android device access', () => {
  assert.equal(getListenHost({ HOST: '0.0.0.0' }), '0.0.0.0')
})

test('getListenHost leaves host undefined when not configured', () => {
  assert.equal(getListenHost({}), undefined)
})

test('getCorsOptions allows Capacitor app origins during development', () => {
  assert.deepEqual(getCorsOptions(), {
    origin: true,
  })
})
