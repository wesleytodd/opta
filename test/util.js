'use strict'
const { suite, test } = require('mocha')
const assert = require('assert')
const utils = require('../utils')

suite('utils', () => {
  suite('promptModule', async () => {
    test('take options and run assertions and return output', async () => {
      let calledWhen = false
      let calledDefault = false
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
      }, {
        name: 'example3',
        message: 'example three:',
        type: 'input',
        when: (answers, whenDefault, allInput) => {
          calledWhen = true
          assert.strictEqual(answers.example, 'test input')
          assert.strictEqual(answers.example2, undefined)
          assert.strictEqual(answers.additionalInput, undefined)
          assert.strictEqual(whenDefault, true)
          assert.strictEqual(allInput.additionalInput, 'input')
          return false
        }
      }, {
        name: 'example4',
        message: 'example four:',
        type: 'input',
        when: (answers, whenDefault, allInput) => {
          assert.strictEqual(whenDefault, false)
          return false
        }
      }, {
        name: 'example5',
        message: 'example five:',
        type: 'input',
        default: (answers, allInput) => {
          calledDefault = true
          assert.strictEqual(answers.example, 'test input')
          assert.strictEqual(answers.additionalInput, undefined)
          assert.strictEqual(allInput.additionalInput, 'input')
          return 'example5 default'
        }
      }]

      const pm = utils.test.promptModule({
        assertCount: 2,
        prompts: {
          example: 'test input',
          example2: {
            value: 'example2 test input',
            assert: (p) => {
              assert.deepStrictEqual(p, prompts[1])
            }
          },
          example3: {
            whenContext: {
              additionalInput: 'input'
            }
          },
          example4: {
            whenDefault: false
          },
          example5: {
            defaultContext: {
              additionalInput: 'input'
            }
          }
        }
      })()

      const output = await pm(prompts)

      assert(calledWhen, 'example3 when not called')
      assert(calledDefault, 'example5 default not called')
      assert.deepStrictEqual(output, {
        example: 'test input',
        example5: 'example5 default'
      })
    })
  })
})
