import { describe, expect, it } from 'vitest'
import pkg from '../../package.json'

describe('Orbis branding', () => {
  it('has package name and productName set to Orbis', () => {
    expect(pkg.name).toBe('orbis')
    expect(pkg.productName).toBe('Orbis')
  })
})
