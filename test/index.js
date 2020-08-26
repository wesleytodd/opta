'use strict'
const { suite, test, beforeEach } = require('mocha')
const path = require('path')
const fs = require('fs').promises
const assert = require('assert')
const pkg = require('../package.json')
const opta = require('..')

const FIX = path.join(__dirname, 'fixtures')
const TMP = path.join(FIX, '__tmp')

suite(pkg.name, () => {
  beforeEach(async () => {
    try {
      await fs.rmdir(TMP, { recursive: true })
    } catch (e) {}
    await fs.mkdir(TMP, { recursive: true })
  })

  test('collect basic input', async () => {
    const opts = opta({
      options: {
        foo: true,
        bar: true
      },
      promptModule: () => {
        return async (prompts) => {
          assert.strictEqual(prompts[0].name, 'foo')
          assert.strictEqual(prompts[0].message, 'foo:')
          assert.strictEqual(prompts[0].type, 'input')
          assert.strictEqual(prompts[0].when, false)

          assert.strictEqual(prompts[1].name, 'bar')
          assert.strictEqual(prompts[1].message, 'bar:')
          assert.strictEqual(prompts[1].type, 'input')
          assert.strictEqual(prompts[1].when, true)

          return {
            bar: 'bar'
          }
        }
      }
    })

    opts.cli()(['--foo', 'foo'])
    await opts.prompt()()
    const values = opts.values({ baz: 'baz' })
    assert.strictEqual(values.foo, 'foo')
    assert.strictEqual(values.bar, 'bar')
    assert.strictEqual(values.baz, 'baz')
  })

  test('set defaults', async () => {
    const opts = opta({
      options: {
        foo: {
          default: 'foo'
        },
        bar: true,
        baz: {
          prompt: false
        }
      },
      defaults: {
        baz: 'baz'
      },
      promptModule: () => {
        return async (prompts) => {
          assert.strictEqual(prompts[0].name, 'foo')
          assert.strictEqual(prompts[0].default, 'foo')

          assert.strictEqual(prompts[1].name, 'bar')
          assert.strictEqual(prompts[1].default, 'bar')

          return {
            bar: 'bar!'
          }
        }
      }
    })

    opts.defaults({
      bar: 'bar'
    })
    await opts.prompt()()
    const values = opts.values()
    assert.strictEqual(values.foo, 'foo')
    assert.strictEqual(values.bar, 'bar!')
    assert.strictEqual(values.baz, 'baz')
  })

  test('work without calling .cli()', async () => {
    const opts = opta({
      options: {
        foo: true,
        bar: true
      },
      promptModule: () => {
        return async () => {
          return {
            bar: 'bar'
          }
        }
      }
    })

    opts.overrides({
      foo: 'foo'
    })
    await opts.prompt()()
    const values = opts.values()
    assert.strictEqual(values.foo, 'foo')
    assert.strictEqual(values.bar, 'bar')
  })

  test('complicated example', async () => {
    const remote = 'git@github.com:wesleytodd/opta.git'
    const createGit = opta({
      options: {
        cwd: {
          prompt: false,
          default: process.cwd()
        },
        remoteOrigin: {
          description: 'remote origin',
          default: async (input, opts) => {
            // Ensure we get the input including defaults
            assert.strictEqual(opts.cwd, TMP)
            // Fake load git remote origin
            return remote
          }
        }
      },
      promptModule: () => {
        return async (prompts) => {
          assert.strictEqual(prompts[0].name, 'remoteOrigin')
          assert.strictEqual(prompts[0].message, 'remote origin:')
          assert.strictEqual(prompts[0].type, 'input')
          assert.strictEqual(typeof prompts[0].default, 'function')

          return {
            remoteOrigin: await prompts[0].default({})
          }
        }
      }
    })
    createGit.cli()(['--cwd', TMP])
    await createGit.prompt()()
    const gitValues = createGit.values()
    assert.strictEqual(gitValues.cwd, TMP)
    assert.strictEqual(gitValues.remoteOrigin, remote)

    const createPkgJson = opta({
      options: {
        cwd: {
          prompt: false,
          default: process.cwd()
        },
        name: {
          default: (input, opts) => {
            return path.basename(opts.cwd)
          }
        },
        repository: true
      },
      promptModule: () => {
        return async (prompts) => {
          assert.strictEqual(prompts[0].name, 'name')
          assert.strictEqual(prompts[0].message, 'name:')
          assert.strictEqual(prompts[0].type, 'input')
          assert.strictEqual(await prompts[0].default(), '__tmp')

          assert.strictEqual(prompts[1].name, 'repository')
          assert.strictEqual(prompts[1].message, 'repository:')
          assert.strictEqual(prompts[1].type, 'input')
          assert.strictEqual(prompts[1].default, remote)

          return {
            name: 'tmp',
            repository: remote
          }
        }
      }
    })
    createPkgJson.cli()(['--cwd', TMP])
    await createPkgJson.prompt((prompts) => {
      for (const p of prompts) {
        // Set default repository as if we had
        // loaded it from the existing package or git
        if (p.name === 'repository') {
          p.default = remote
        }
      }
      return prompts
    })()
    const pkgJsonValues = createPkgJson.values()
    assert.strictEqual(pkgJsonValues.cwd, TMP)
    assert.strictEqual(pkgJsonValues.name, 'tmp')
    assert.strictEqual(pkgJsonValues.repository, remote)

    const createPkg = opta({
      options: {
        ...createPkgJson.options,
        ...createGit.options,
        remoteOrigin: false
      },
      promptModule: () => {
        return async (prompts) => {
          return {
            name: '@scope/tmp',
            repository: await prompts[1].default({ name: '@scope/tmp' })
          }
        }
      }
    })
    createPkg.cli()(['--cwd', TMP])
    await createPkg.prompt((prompts) => {
      for (const p of prompts) {
        if (p.name === 'repository') {
          p.default = (ans) => `git@github.com:wesleytodd/${ans.name.replace('@', '').replace('/', '-')}.git`
        }
      }
      return prompts
    })()
    const pkgValues = createPkg.values()
    assert.strictEqual(pkgValues.cwd, TMP)
    assert.strictEqual(pkgValues.name, '@scope/tmp')
    assert.strictEqual(pkgValues.repository, 'git@github.com:wesleytodd/scope-tmp.git')
  })

  test('option groups in prompts', async () => {
    const opts = opta({
      options: {
        foo: {
          group: 'FooBar'
        },
        bar: {
          group: 'FooBar'
        },
        baz: true
      },
      promptModule: () => {
        return async (prompts) => {
          assert.strictEqual(prompts.length, 2)
          assert.strictEqual(prompts[0].name, 'foo')
          assert.strictEqual(prompts[1].name, 'bar')
          return { }
        }
      }
    })

    await opts.prompt(['FooBar'])()
  })
})
