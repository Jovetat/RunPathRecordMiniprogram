
const express = require('express')
const app = express()

// 如果要获取 URL-encoded 格式的请求体数据，必须配置中间件 app.use(express.urlencoded({ extended:false }))
app.use(express.json())
app.use(express.urlencoded({ extended: false }))

const pathget = require('./pathGetApiRouter.js')
const pathpost = require('./pathPostApiRouter.js')

app.use(pathget)
app.use(pathpost)

app.listen(80,()=>{
    console.log('server running at http://127.0.0.1')
})