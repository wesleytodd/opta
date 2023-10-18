'use strict'
const { suite, test, beforeEach } = require('mocha')
const path = require('path')
const fs = require('fs').promises
const assert = require('assert')
const pkg = require('../package.json')
const opta = require('..')
const utils = require('../utils')

const FIX = path.join(__dirname, 'fixtures')
const TMP = path.join(FIX, '__tmp')

suite(pkg.name, () => {
  beforeEach(async () => {
    try {
      await fs.rm(TMP, { recursive: true })
    } catch (e) {}
    await fs.mkdir(TMP, { recursive: true })
  })

  test('collect basic input', async () => {
    const values = await utils.test.e2e({
      opta,
      optaOpts: {
        options: {
          foo: true,
          bar: true
        }
      },
      promptModuleOpts: {
        assertCount: 1,
        prompts: {
          foo: {
            value: 'foo',
            assert: (p) => {
              assert.strictEqual(p.name, 'foo')
              assert.strictEqual(p.message, 'foo:')
              assert.strictEqual(p.type, 'input')
              assert.strictEqual(p.when, false)
            }
          },
          bar: {
            value: 'bar',
            assert: (p) => {
              assert.strictEqual(p.name, 'bar')
              assert.strictEqual(p.message, 'bar:')
              assert.strictEqual(p.type, 'input')
              assert.strictEqual(p.when, true)
            }
          }
        }
      },
      cliArgs: ['--foo', 'foo'],
      values: { baz: 'baz' }
    })

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
      promptModule: utils.test.promptModule({
        assertCount: 2,
        prompts: {
          foo: {
            assert: (p) => {
              assert.strictEqual(p.name, 'foo')
              assert.strictEqual(p.default, 'foo')
            }
          },
          bar: {
            value: 'bar!',
            assert: (p) => {
              assert.strictEqual(p.name, 'bar')
              assert.strictEqual(p.default, 'bar')
            }
          }
        }
      })
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
      promptModule: utils.test.promptModule({
        assertCount: 1,
        prompts: {
          bar: 'bar'
        }
      })
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
          default: (input, opts) => {
            // Fake load git remote origin
            return remote
          }
        }
      },
      promptModule: utils.test.promptModule({
        assertCount: 1,
        prompts: {
          remoteOrigin: {
            assert: (p) => {
              assert.strictEqual(p.name, 'remoteOrigin')
              assert.strictEqual(p.message, 'remote origin:')
              assert.strictEqual(p.type, 'input')
              assert.strictEqual(p.default, remote)
            }
          }
        }
      })
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
      promptModule: utils.test.promptModule({
        assertCount: 2,
        prompts: {
          name: {
            value: 'tmp',
            assert: (p) => {
              assert.strictEqual(p.name, 'name')
              assert.strictEqual(p.message, 'name:')
              assert.strictEqual(p.type, 'input')
              assert.strictEqual(p.default, '__tmp')
            }
          },
          repository: {
            assert: (p) => {
              assert.strictEqual(p.name, 'repository')
              assert.strictEqual(p.message, 'repository:')
              assert.strictEqual(p.type, 'input')
              assert.strictEqual(p.default, remote)
            }
          }
        }
      })
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
      promptModule: utils.test.promptModule({
        assertCount: 2,
        prompts: {
          name: '@scope/tmp',
          repository: {
            defaultContext: { name: '@scope/tmp' }
          }
        }
      })
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
      promptModule: utils.test.promptModule({
        assertCount: 2,
        prompts: {
          foo: {
            assert: (p) => {
              assert.strictEqual(p.name, 'foo')
            }
          },
          bar: {
            assert: (p) => {
              assert.strictEqual(p.name, 'bar')
            }
          }
        }
      })
    })

    await opts.prompt(['FooBar'])()
  })

  test('recompute only on dirty state', async () => {
    const opts = opta({
      options: {
        foo: true,
        bar: true
      },
      promptModule: utils.test.promptModule({
        assertCount: 1,
        prompts: {
          bar: 'bar'
        }
      })
    })
    const obj1 = opts.values()
    opts.cli()(['--foo=foo'])
    const obj2 = opts.values()
    await opts.prompt()()
    const obj3 = opts.values()
    opts.overrides({ baz: 'baz' })
    const obj4 = opts.values()
    const obj5 = opts.values()

    assert(obj1 !== obj2)
    assert(obj2 !== obj3)
    assert(obj3 !== obj4)
    assert(obj4 === obj5)
    // Normalize path
    const root = path.join(__dirname, '..')
    obj5.$0 = path.relative(root, obj5.$0)
    assert.deepStrictEqual(obj5, {
      // yargs adds these top two
      $0: path.relative(root, process.argv[1]),
      _: [],
      foo: 'foo',
      bar: 'bar',
      baz: 'baz'
    })
  })

  test('default functions which return undefined', async () => {
    const opts = opta({
      options: {
        foo: {
          default: () => undefined
        },
        bar: {
          default: async () => undefined
        }
      },
      promptModule: utils.test.promptModule({
        assertCount: 2
      })
    })

    await opts.prompt()()
    const o = opts.values()
    assert.strictEqual(o.foo, undefined)
    assert.strictEqual(o.bar, undefined)
  })

  test('run without a promptModule override', async () => {
    const opts = opta({
      options: {
        foo: {
          prompt: false
        }
      }
    })

    await opts.prompt()()
    const o = opts.values()
    assert.strictEqual(o.foo, undefined)
  })
})
