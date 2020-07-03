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
