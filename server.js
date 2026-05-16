const express = require('express')
const cors = require('cors')

const Log = require('../logging_middleware/logger')

const app = express()

app.use(cors())
app.use(express.json())

app.get('/', async (req, res) => {

  await Log(
    'backend',
    'info',
    'route',
    'Root route accessed'
  )

  res.json({
    message: 'Backend Running'
  })
})

app.listen(5000, () => {
  console.log('Server started on port 5000')
})
