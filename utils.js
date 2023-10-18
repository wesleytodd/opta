'use strict'
const assert = require('assert')

/**
 * Helper for testing prompts
 *
 * @param {promptModuleOptions} opts
 * @returns {Object.<string, string>} results of the prompts
 *
 * @callback promptCallback
 * @param {{name: string, when: boolean, default: (string|function)}} prompt - the prompt object
 * @throws {Error} Used to test prompt settings, so throw your errors
 *
 * @typedef promptOptions
 * @type {Object}
 * @property {?string} value - value to return from prompt
 * @property {?promptCallback} assert - function to assert within
 * @property {?any} defaultContext - context object passed to default function
 *
 * @typedef promptModuleOptions
 * @type {Object}
 * @property {(boolean|number)} assertCount - count of prompts to assert were asked
 * @property {(Object.<string, promptOptions>|Object.<string, string>)} prompts - Set of prompts
 */
function promptModule (opts = {}) {
  // option defaults
  opts.assertCount = opts.assertCount || false
  opts.prompts = opts.prompts || {}

  return () => {
    return async function doPrompts (prompts = []) {
      // Set defaults from prompts
      const out = await Promise.all(prompts.map(async (p) => {
        // If when is false, dont "ask" or set a return
        if (!p.when) {
          return []
        }
        const promptOpts = opts.prompts[p.name] || {}

        // Handle default values, even async functions
        let ret = typeof p.default === 'function' ? p.default(promptOpts.defaultContext || {}) : p.default
        if (ret && typeof ret.then === 'function') {
          ret = await ret
        }
        p.default = ret

        // If we have prompt values/assertions run them
        if (promptOpts) {
          // Run assertions
          if (promptOpts.assert) {
            promptOpts.assert(p)
          }

          // assign return value
          ret = typeof promptOpts === 'string' ? promptOpts : promptOpts.value || ret
        }

        return [p.name, ret]
      }))

      const output = out.reduce((obj, [key, value]) => {
        // Empty means not asked
        if (!key) {
          return obj
        }
        return { ...obj, [key]: value }
      }, {})

      if (opts.assertCount !== false) {
        const num = Object.keys(output).length
        assert.strictEqual(num, opts.assertCount, `Incorrect number of prompts asked ${num}, expected ${opts.assertCount}`)
      }

      return output
    }
  }
}

/**
 * Utility helpers for working with Opta
 * @module opta/utils
 */
module.exports = {
  test: {
    promptModule
  }
}
