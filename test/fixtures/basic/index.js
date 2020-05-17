'use strict'
const opta = require('../../..')

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

async function run (overrides) {
  opts.overrides(overrides)
  await opts.prompt()()
  const values = opts.values()
  setTimeout(() => {
    console.log(`${values.hello} ${values.world}`)
  }, values.time)
}

run.cli = (argv = process.argv) => {
  opts.cli()(argv.slice(2))
  run()
}

module.exports = run
