// index.js
// 获取应用实例
const app = getApp()

Page({
    data: {
        maplongitde: 111.6616,
        maplatitude: 40.8544,
        polyline: [],
        mapSetting: {
            scale: 17,                              // 缩放级别3~20
            enableOverlooking: false,               // 俯视
            enableTraffic: false,                   // 实时路况
            skew: 0,                                // 倾斜角度
        },
        speed: 0,                               // m/s
        nowTrip: 0,                             // 行走的距离
        isrunning: false,                       // 判断正在跑
        last_longitde: 0,                       // 用于计算距离
        last_latitude: 0,
        distance: 20,                           // 大于这个距离加点
        start_time: 0,                          // 记录开始时间
        timing: 0,                              // 记录持续时间
        runTarget: 0,                           // 跑步目标
    },

    onLoad() {
        this.positionInit()
    },

    // 页面切换到当前页面
    onTabItemTap(e){
        this.positionInit()
    },

    // 位置初始化
    positionInit(callback){
        wx.getLocation({
            type: 'gcj02',
            altitude: true,
            isHighAccuracy: true,
            success:(res)=>{
                console.log('位置初始化成功')
                this.setData({
                    maplatitude: res.latitude,
                    maplongitde: res.longitude,
                })
                if(callback){ callback() }
            },
            fail:()=>{
                wx.showToast({
                    title: '获取当前位置失败',
                    icon: 'none'
                })
            }
        })
    },

    // 开始跑步
    startRunBindtap(e){
        this.isRunTarget(e,()=>{
            this.setData({
                mapSetting: {
                    scale: 19,
                    enableOverlooking: true,
                    enableTraffic: true,
                    skew: 40
                },
                isrunning: true,
                nowTrip: 0,
                start_time: Date.now(),
                timing: 0
            })
            this.addPolyline()
            this.startTiming()
            this.locationRefreshInit((result)=>{
                this.setData({
                    maplatitude: result.latitude,
                    maplongitde: result.longitude,
                    speed: result.speed >=0 ? result.speed.toFixed(1) : 0
                })
                this.addPoints(result.latitude,result.longitude)
            })
        })
    },

    isRunTarget(e,callback){
        if(e.target.dataset.istarget === 'true'){
            // 目标模式
            wx.showModal({
                title: '请输入您设定的目标：',
                confirmText: '开始',
                confirmColor: '#046865',
                cancelColor: '#E53D00',
                editable: true,
                success: (res)=>{
                    const tar = Number(res.content)
                    if(res.confirm && !isNaN(tar)){
                        this.setData({ runTarget: tar })
                        console.log('target:' + tar)
                        callback()
                    }
                    else if(isNaN(tar) && res.content){
                        wx.showToast({
                            title: '请输入纯数字',
                            icon: 'none'
                        })
                    }
                },
                fail: ()=>{
                    wx.showToast({
                        title: '目标获取失败',
                        icon: 'none'
                    })
                }
            })
        }
        else{
            // 普通模式
            wx.showModal({
                title: '随心模式',
                content: '准备开始跑步',
                confirmText: '开始',
                confirmColor: '#046865',
                cancelColor: '#E53D00',
                success: (res)=>{
                    if(res.confirm){
                        callback()
                    }
                }
            })
        }
    },
    
    // 动态位置刷新初始化
    locationRefreshInit(callback){
        const _this = this
        this.positionInit(()=>{
            this.setData({
                last_latitude: _this.data.maplatitude,
                last_longitde: _this.data.maplongitde
            })
            // 开启小程序进入前后台时均接收位置消息
            wx.startLocationUpdateBackground({
                type: 'gcj02',
                success: (res) => {
                    console.log('开启小程序进入前后台时均接收位置消息')
                    wx.onLocationChange((result) => {
                        if(callback){ callback(result) }
                    })
                },
                fail: ()=>{
                    console.log('error:开启小程序进入前后台时均接收位置消息失败')
                    wx.showToast({
                        title: '权限缺失',
                        icon: 'none'
                    })
                }
            })
        })
    },

    // 添加 polyline
    addPolyline(){
        let pol = this.data.polyline
        pol.push({
            points: [],
            colorList :['#F07F7F','#F09E7F','#F0B07F','#F0C37F','#F0D77F','#F0F07F','#CFF07F','#AEF07F',
            '#7FF083','#7FF0AF','#7FF0D4','#7FE4F0','#7FC6F0','#7FB0F0','#7F99F0','#7F81F0','#907FF0',
            '#A97FF0','#C47FF0','#E07FF0','#F07FEA','#F07FC3','#F07FA4','#F07F8A'],
            width: 5,
            arrowLine: true,
            trip: 0,
            start_time: Date.now()
        })
        this.setData({ polyline: pol })
    },

    // 添加路径点
    addPoints(latitude,longitude){
        let dis = this.getDistance(latitude,longitude,this.data.last_latitude,this.data.last_longitde)
        // let disnum = parseFloat(dis)
        if(dis> this.data.distance){
            console.log('添加点')
            const trip = parseFloat(this.data.nowTrip)
            console.log('trip:' + typeof trip + ';dis:' + typeof dis)
            const nowTrip = (trip + dis).toFixed(1)
            // toFixed return string
            let pol = this.data.polyline
            pol[pol.length-1].trip = nowTrip
            pol[pol.length-1].points.push({
                latitude:latitude,longitude:longitude
            })
            this.setData({
                polyline: pol,
                last_latitude: latitude,
                last_longitde: longitude,
                nowTrip: nowTrip
            })
            if(nowTrip >= this.data.runTarget && this.data.runTarget != 0){
                this.endFunction()
            }
        }
    },

    endRunBindtap(){
        wx.showModal({
            title: '提示',
            content: '是否结束跑步?',
            cancelText: '继续',
            cancelColor: '#046865',
            confirmText: '结束',
            confirmColor: '#E53D00',
            success: (res)=>{
                if(res.confirm){
                    this.endFunction()
                }
            }
        })
    },

    // 结束时触发
    endFunction(){
        console.log('end')
        this.setData({
            mapSetting: {
                scale: 17,
                enableOverlooking: false,
                enableTraffic: false,
                skew: 0
            },
            isrunning: false,
            runTarget: 0
        })
        wx.offLocationChange((result) => {
            console.log('动态监听位置变化结束')
        })
        this.endTiming()
        this.addLocalData()
        wx.vibrateShort({ type: 'light' })
    },

    // 将数据存储到本地
    addLocalData(){
        this.readLocalData((pol)=>{
            console.log(pol)
            pol.push(this.data.polyline[0])
            const data = JSON.stringify(pol)
            wx.setStorage({
                key: 'polyline',
                data: data,
                success:()=>{
                    wx.showToast({
                        title: '数据同步成功',
                        icon: 'none'
                    })
                    this.setData({ polyline:[] })
                }
            })
        })
    },

    // 同步本地数据
    readLocalData(callback){
        wx.getStorage({
            key: 'polyline',
            success: (res)=>{
                console.log('数据同步成功')
                let pol = JSON.parse(res.data)
                if(callback){ callback(pol) }
            },
            fail: ()=>{
                console.log('数据同步失败或无数据内容')
                let pol = []
                if(callback){ callback(pol) }
            }
        })        
    },

    // 开始计时
    startTiming(){
        this.runtimer = setInterval(()=>{
            const now = Date.now()
            const tim = ((now - this.data.start_time)/1000).toFixed(0)
            this.setData({
                timing: tim
            })
        },1000)
    },

    // 结束计时
    endTiming(callback){
        clearInterval(this.runtimer)
        let pol = this.data.polyline
        pol[pol.length-1].timing = this.data.timing
        this.setData({ polyline:pol })
    },

    getDistance(lat1, lng1, lat2, lng2) {
        // 位置没变时会输出 NaN
        const PI = Math.PI
        const EARTH_RADIUS = 6378137.0
        function getRad (d) {
            return d * PI / 180.0
        }
        let f = getRad((lat1 + lat2) / 2)
        let g = getRad((lat1 - lat2) / 2)
        let l = getRad((lng1 - lng2) / 2)
        let sg = Math.sin(g)
        let sl = Math.sin(l)
        let sf = Math.sin(f)
        let s, c, w, r, d, h1, h2
        let a = EARTH_RADIUS
        let fl = 1 / 298.257
        sg = sg * sg
        sl = sl * sl
        sf = sf * sf
        s = sg * (1 - sl) + (1 - sf) * sl
        c = (1 - sg) * (1 - sl) + sf * sl
        w = Math.atan(Math.sqrt(s / c))
        r = Math.sqrt(s * c) / w
        d = 2 * w * a
        h1 = (3 * r - 1) / 2 / c
        h2 = (3 * r + 1) / 2 / s
        return d * (1 + fl * (h1 * sf * (1 - sg) - h2 * (1 - sf) * sg))
    },

    /**
     * 生命周期函数--监听页面初次渲染完成
     */
    onReady() {

    },

    /**
     * 生命周期函数--监听页面显示
     */
    onShow() {

    },

    /**
     * 生命周期函数--监听页面隐藏
     */
    onHide() {

    },

    /**
     * 生命周期函数--监听页面卸载
     */
    onUnload() {

    },

    /**
     * 页面相关事件处理函数--监听用户下拉动作
     */
    onPullDownRefresh() {

    },

    /**
     * 页面上拉触底事件的处理函数
     */
    onReachBottom() {

    },

    /**
     * 用户点击右上角分享
     */
    onShareAppMessage() {

    }
})
