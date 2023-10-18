# opta

**We all have choices to make**

[![NPM Version](https://img.shields.io/npm/v/opta.svg)](https://npmjs.org/package/opta)
[![NPM Downloads](https://img.shields.io/npm/dm/opta.svg)](https://npmjs.org/package/opta)
[![test](https://github.com/wesleytodd/opta/workflows/Test/badge.svg)](https://github.com/wesleytodd/opta/actions?query=workflow%3ATest)
[![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg)](https://github.com/standard/standard)

Collect user input from cli flags, interactive prompts, and JS input.

## Usage

```
$ npm i opta
```

```javascript
const opta = require('opta')

// Create an opta instance
const opts = opta({
  options: {
    time: {
      type: 'number'
    },
    hello: {
      default: 'hello'
    },
    world: {
      default: 'world'
    }
  }
})

// .cli() returns an instance of yargs,
// configured with the options
const yargsInstance = opts.cli()

// Will set the appropriate values as
// configured on the yargs instance
yargsInstance(process.argv.slice(2))

// Set some overrides. These will take precedence,
// but also will prevent `.prompt()` from asking
// the user
opts.overrides(overrides)

// Set detauls. These will be used as
// defaults when prompting, and fill in
// values not specified in other ways
opts.defaults(defaults)

// Display prompts using inquirer, will
// populate values with input from user
const promptor = opts.prompt()
await promptor()

// Get the values after cli, overrides,
// and prompt input
const values = opts.values()

// An example of using the values
setTimeout(() => {
  console.log(`${values.hello} ${values.world}`)
}, values.time)
```

## Composition of options

One of the primary focuses of `opta` is to enable easy composition of inputs
across projects.  If a project exports it's `opta` instance, another can simply
combine their `options` parameters like this:

```javascript
const opta = require('opta')

// Project One exports a key `opts` which is
// an instance of `opta`, along with it's other functionality
const projectOne = require('project-one')

// My Project which wants to expose functionality from
// Project One can simply merge `opts.options` into the
// options passed to my instance
const myOpts = opta({
  options: {
    ...projectOne.opts.options,
    myOptions: true,
    // You can also simply override the options descriptor
    // from `projectOne.opts`.  In this example we disable
    // the prompt but leave the rest alone
    projectOneOpt: {
      ...projectOne.opts.options.projectOneOpt,
      prompt: false
    }
  }
})

// Now when we call .cli(), .prompt(), and .values()
// we will get options from both the composed options
// and our projects
await myOpts.prompt()
const vals = myOpts.values()
console.log(vals) // all options from both Project and My Project
```

## Prompt Testing

Testing user input can be difficult. This package exports a test helper which can mimic different behaviors of users interacting
with prompts without dealing with the complicated work to actually handle user input. Here is an example:

```javascript
const test = require('node:test');
const assert = require('node:assert')
const opta = require('opta')
const optaUtils = require('opta/utils')

test('some test', async (t) => {
  const opts = opta({
    options: {
      foo: true,
      bar: true
    },
    // Create a promptModule mock
    promptModule: optaUtils.test.promptModule({
      // Will assert that two prompts were displayed
      assertCount: 2,
      prompts: {
        foo: {
          // Set a value as if it was user input
          value: 'foo',
          
          // Assert some things about the prompt config
          // which is passed on to inquirer
          assert: (p) =>{
            assert.strictEqual(p.name, 'foo')
            assert.strictEqual(p.message, 'foo:')
            assert.strictEqual(p.type, 'input')
            assert.strictEqual(p.when, true)
          },

          // Setup a context object which is passed to the prompt
          // default if it is a function
          defaultContext: {}
        },

        // Or more simply, just set value directly
        bar: 'bar'
      }
    })
  })

  // Run the opta prompts
  await opts.prompt()()
  const values = opts.values({ baz: 'baz' })
  assert.deepStrictEqual(values, {
    foo: 'foo',
    bar: 'bar',
    baz: 'baz'
  })
})
```