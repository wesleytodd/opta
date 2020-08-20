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
  let promptInput = null

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
    overrides: (_overrides) => {
      overrides = Object.assign({}, overrides, _overrides)
      return instance
    },
    defaults: (_defaults) => {
      defaults = Object.assign({}, defaults, _defaults)
      return instance
    },
    values
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

      cli.option((o.flag && o.flag.key) || key, {
        description: o.description,
        type: o.type,
        coerce,
        ...o.flag
      })
    }

    // After options so that builder has the options setup
    cli.usage(opts.usage || '$0', opts.commandDescription || 'A CLI created with opta', builder)

    return (argv) => {
      cliInput = cli.parse(argv)
      return instance
    }
  }

  function prompt (builder) {
    const promptor = createPromptModule()

    let prompts = []
    for (const key of optionKeys) {
      const o = options[key]
      if (!o || o.prompt === false) {
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

      let _default = defaults[key] || prompt.default
      if (typeof _default === 'function') {
        _default = async (ans) => {
          if (prompt.default) {
            // @TODO wat to do?
          }

          return defaults[key](
            Object.assign(
              {},
              defaults,
              cliInput,
              ans,
              overrides
            )
          )
        }
      }

      const cliSet = cliInput && typeof cliInput[key] !== 'undefined'
      const overrideSet = overrides && typeof overrides[key] !== 'undefined'

      const defaultPrompt = {
        name: key,
        type: type,
        message: `${o.description || key}:`,
        default: _default,
        when: !cliSet && !overrideSet,
        filter: o.filter,
        validate: o.validate
      }

      // Use default or merge default with config
      if (o.prompt === true) {
        prompts.push(defaultPrompt)
      } else {
        prompts.push({
          ...defaultPrompt,
          ...prompt
        })
      }
    }

    if (typeof builder === 'function') {
      prompts = builder(prompts)
    }

    return async () => {
      promptInput = await promptor(prompts)
      return instance
    }
  }

  function values (_overrides) {
    return Object.assign({}, defaults, cliInput, promptInput, overrides, _overrides)
  }

  return instance
}
