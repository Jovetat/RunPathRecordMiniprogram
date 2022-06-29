const fs = require('fs')
const path = require('path')

const express = require('express')
const router = express.Router()

router.get('/path',(req,res)=>{
    console.log('get:')
    const readpath = path.join(__dirname,'/LocalData',req.query.name + '.json')
    fs.readFile(readpath,'utf-8',(err,datastr)=>{
        if(err){
            console.log('读取文件失败' + err.message)
            res.send({
                status: 500,
                msg: '服务器内无此用户数据'
            })
        }
        else{
            console.log('文件读取成功')
            res.send({
                status: 200,
                msg: '服务器数据下载成功',
                data: datastr
            })
        }
    })
})
module.exports = router
