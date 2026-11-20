import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { execFileSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { load } from 'js-yaml'

const [version, flag, repository] = process.argv.slice(2)
assert.match(version ?? '', /^\d+\.\d+\.\d+$/, 'pass the three-part release version')
const architectures = [
  { arch: 'arm64', zip: `Orbis-${version}-arm64-mac.zip` },
  { arch: 'x64', zip: `Orbis-${version}-mac.zip` },
]
const assets = architectures.flatMap(({ arch, zip }) => [
  `Orbis-${version}-${arch}.dmg`,
  `Orbis-${version}-${arch}.dmg.blockmap`,
  zip,
  `${zip}.blockmap`,
])
assets.push('latest-mac.yml')

function digest(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex')
}

function validate(directory, published = false) {
  for (const asset of assets) {
    assert(existsSync(join(directory, asset)), `missing ${asset}`)
    assert(readFileSync(join(directory, asset)).length > 0, `empty ${asset}`)
  }
  const manifest = load(readFileSync(join(directory, 'latest-mac.yml'), 'utf8'))
  assert.equal(manifest.version, version)
  const files = new Map(manifest.files.map((file) => [file.url, file]))
  for (const { zip } of architectures) {
    const file = files.get(zip)
    assert(file, `latest-mac.yml does not reference ${zip}`)
    const bytes = readFileSync(join(directory, zip))
    assert.equal(file.size, bytes.length, `wrong size in latest-mac.yml for ${zip}`)
    assert.equal(
      file.sha512,
      createHash('sha512').update(bytes).digest('base64'),
      `wrong SHA-512 for ${zip}`,
    )
  }
  const sums =
    assets.map((asset) => `${digest(join(directory, asset))}  ${asset}`).join('\n') + '\n'
  if (published) {
    assert.equal(readFileSync(join(directory, 'SHA256SUMS.txt'), 'utf8'), sums)
  } else {
    writeFileSync(join(directory, 'SHA256SUMS.txt'), sums)
  }
  console.log(
    `${published ? 'Published' : 'Built'} assets verified: ${assets.join(', ')}, SHA256SUMS.txt`,
  )
}

if (flag === undefined) {
  validate('release')
} else {
  assert.equal(flag, '--published')
  assert.match(repository ?? '', /^[^/]+\/[^/]+$/)
  const directory = join(tmpdir(), `orbis-release-${version}-${process.pid}`)
  mkdirSync(directory, { recursive: true })
  try {
    execFileSync(
      'gh',
      ['release', 'download', `v${version}`, '--repo', repository, '--dir', directory],
      { stdio: 'inherit' },
    )
    const unwanted = readdirSync(directory).filter(
      (name) => !assets.includes(name) && name !== 'SHA256SUMS.txt',
    )
    assert.deepEqual(unwanted, [], `unexpected release assets: ${unwanted.join(', ')}`)
    validate(directory, true)
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
}
