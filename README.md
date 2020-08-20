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
