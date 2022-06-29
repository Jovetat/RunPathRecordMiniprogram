const fs = require('fs')
const path = require('path')

const express = require('express')
const router = express.Router()

router.post('/path',(req,res)=>{
    console.log('post:')
    const readpath = path.join(__dirname,'/LocalData',req.body.name + '.json')
    
    fs.writeFile(readpath,req.body.poldata,(err)=>{
        if(err){
            res.send({
                status: 500,                // 状态的描述
                msg: '数据写入服务器失败' + err.message
            })
        }
        else{
            res.send({
                status: 200,                // 状态的描述
                msg: '数据上传服务器成功'
            })
        }
    })
})


module.exports = router