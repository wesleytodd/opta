'use strict'

// Poor version of lazyrequire
let __yargs
function useYargs () {
  __yargs = __yargs || require('yargs/yargs')
  return __yargs
}
let __inquirer
function useInquirer () {
  __inquirer = __inquirer || require('inquirer')
  return __inquirer
}

module.exports = function (opts = {}) {
  const options = opts.options || {}
  const optionKeys = Object.keys(options)
  const createCLIModule = opts.cliModule || useYargs()
  const createPromptModule = opts.promptModule || useInquirer().createPromptModule
  const optionDefauts = opts.defaults || {}
  let defaults = {}
  let overrides = null
  let cliInput = null
  let promptInput = {}

  // Only recompute values when changed
  let isDirty = true
  let currentState = {}

  // Process options
  for (const key of optionKeys) {
    let d = options[key]

    // Coerce falsy
    if (!d) {
      options[key] = false
      continue
    }

    // Coerce boolean true
    if (d === true) {
      d = options[key] = {
        description: key
      }
    }

    // Coerce strings
    if (typeof d === 'string') {
      d = options[key] = {
        description: d
      }
    }

    // Defaults
    const def = optionDefauts[key] || d.default
    if (typeof def !== 'undefined') {
      defaults[key] = def
    }
  }

  const instance = {
    options,
    cli,
    prompt,
    overrides: mergeWith('overrides'),
    defaults: mergeWith('defaults'),
    values
  }

  function mergeWith (type) {
    return (_vals) => {
      // Strip out undefined
      const vals = Object.entries(_vals).reduce((obj, [key, val]) => {
        if (typeof val !== 'undefined') {
          obj[key] = val
        }
        return obj
      }, {})

      // Set based on type
      switch (type) {
        case 'overrides':
          overrides = Object.assign({}, overrides, vals)
          break
        case 'defaults':
          defaults = Object.assign({}, defaults, vals)
          break
        case 'promptInput':
          promptInput = Object.assign({}, promptInput, vals)
          break
      }

      // Mark dirty
      isDirty = true
    }
  }

  function cli (builder) {
    const cli = createCLIModule()

    for (const key of optionKeys) {
      const o = options[key]
      if (o.flag === false) {
        continue
      }
      const flag = o.flag || {}

      // Coerce in yargs is basically filter then validate from inquirer
      let coerce = flag.coerce
      if (!coerce && (o.filter || o.validate)) {
        coerce = (val) => {
          let v = val
          if (typeof o.filter === 'function') {
            v = o.filter(v)
          }
          if (typeof o.validate === 'function') {
            const valid = o.validate(v)
            if (valid === true) {
              return v
            }
            if (valid === false) {
              throw new Error(`Invalid input: ${v}`)
            }
            if (typeof valid === 'string') {
              throw new Error(valid)
            }
          }
        }
      }

      // Handle default as functions, augment with entire options
      const __default = flag.default
      let _default = __default
      if (typeof _default === 'function') {
        _default = (ans) => {
          return __default(ans, values(ans))
        }
      }

      cli.option(flag.key || key, {
        description: o.description,
        type: o.type,
        group: o.group,
        default: _default,
        coerce,
        ...o.flag
      })
    }

    // After options so that builder has the options setup
    cli.usage(opts.usage || '$0', opts.commandDescription || 'A CLI created with opta', builder)

    function parse (argv) {
      cliInput = cli.parse(argv)
      isDirty = true
      return instance
    }
    parse.cli = cli
    return parse
  }

  function prompt (opts) {
    // Prompt options
    let builder = (p) => p
    let createPromptor = createPromptModule
    let groups = null
    if (typeof opts === 'function') {
      builder = opts
    } else if (Array.isArray(opts)) {
      groups = opts
    } else if (opts) {
      builder = opts.builder || builder
      createPromptor = opts.promptor || createPromptor
      groups = opts.groups || groups
    }

    const promptor = createPromptor()

    let prompts = []
    for (const key of optionKeys) {
      const o = options[key]
      if (!o || o.prompt === false) {
        continue
      }

      // If we passed `groups` filter out prompts not in the group
      const g = o.group || (o.prompt && o.prompt.group)
      if (groups && (!g || !groups.includes(g))) {
        continue
      }

      const prompt = o.prompt || {}
      const type = prompt.type || (() => {
        switch (o.type) {
          case 'boolean':
            return 'confirm'
          case 'number':
            return 'number'
          case 'array':
            return 'list'
        }
        return 'input'
      })()

      // Handle message as function, augment with entire options
      let _message = prompt.message
      if (typeof prompt.message === 'function') {
        _message = (ans) => {
          return prompt.message(ans, values(ans))
        }
      } else if (!_message) {
        _message = `${o.description || key}:`
      }

      // Handle default as functions, augment with entire options
      const defaultFromRoot = typeof prompt.default === 'undefined'
      const __default = !defaultFromRoot ? prompt.default : defaults[key]
      let _default = __default
      if (typeof _default === 'function') {
        _default = (ans) => {
          let ret = __default(ans, values(ans))
          if (ret && typeof ret.then === 'function') {
            // Resolve promise
            ret = ret.then((val) => {
              // If the default came from the root of the options object,
              // ensure we assign it so undefined's are preserved
              if (val === undefined && defaultFromRoot) {
                defaults[key] = val
              }
              return val
            })
          } else if (ret === undefined && defaultFromRoot) {
            // See above on undefineds from the root options object
            defaults[key] = ret
          }
          return ret
        }
      }

      // Handle whe, augment with our logic and entire options
      const cliSet = cliInput && typeof cliInput[key] !== 'undefined'
      const overrideSet = overrides && typeof overrides[key] !== 'undefined'
      const promptSet = promptInput && typeof promptInput[key] !== 'undefined'
      let _when = prompt.when
      if (typeof prompt.when === 'function') {
        _when = (input) => {
          return prompt.when(input, !cliSet && !overrideSet && !promptSet, values(input))
        }
      } else if (typeof prompt.when === 'undefined') {
        _when = !cliSet && !overrideSet && !promptSet
      }

      const defaultPrompt = {
        name: key,
        type,
        message: _message,
        default: _default,
        when: _when,
        filter: o.filter,
        validate: o.validate
      }

      // Use default or merge default with config
      if (o.prompt === true) {
        prompts.push(defaultPrompt)
      } else {
        prompts.push({
          ...defaultPrompt,
          ...prompt,
          message: _message,
          default: _default,
          when: _when
        })
      }
    }

    // Run builder
    prompts = builder(prompts)

    return async () => {
      mergeWith('promptInput')(await promptor(prompts))
      return instance
    }
  }

  function values (_overrides) {
    if (isDirty) {
      currentState = Object.assign({}, defaults, cliInput, promptInput, overrides)
      isDirty = false
    }
    if (_overrides) {
      return Object.assign({}, currentState, _overrides)
    }
    return currentState
  }

  return instance
}
