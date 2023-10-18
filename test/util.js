'use strict'
const { suite, test } = require('mocha')
const assert = require('assert')
const utils = require('../utils')

suite('utils', () => {
  suite('promptModule', async () => {
    test('take options and run assertions and return output', async () => {
      const prompts = [{
        name: 'example',
        message: 'example:',
        type: 'input',
        when: true
      }, {
        name: 'example2',
        message: 'example two:',
        type: 'input',
        when: false
      }]

      const pm = utils.test.promptModule({
        assertCount: 1,
        prompts: {
          example: 'test input',
          example2: {
            value: 'example2 test input',
            assert: (p) => {
              assert.deepStrictEqual(p, prompts[1])
            }
          }
        }
      })()

      const output = await pm(prompts)

      assert.deepStrictEqual(output, {
        example: 'test input'
      })
    })
  })
})
