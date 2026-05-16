async function Log(stack, level, pkg, message) {

  try {

    console.log({
      stack,
      level,
      package: pkg,
      message
    })

  } catch (error) {

    console.log('Logging failed')

  }

}

module.exports = Log