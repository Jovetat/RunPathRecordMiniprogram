// pages/list/list.js
var util = require('../../utils/util.js');
Page({

    /**
     * 页面的初始数据
     */
    data: {
        userInfo: {},
        hasUserInfo: false,
        canIUseGetUserProfile: false,                               // 用于判断用户是否为低版本小程序
        sort_mode: [
            {
                id: 0,
                name: '开始时间(顺序)',
                attribute: 'start_time',
                isorder: true
            },
            {
                id: 1,
                name: '开始时间(逆序)',
                attribute: 'start_time',
                isorder: false
            },
            {
                id: 2,
                name: '持续时间(顺序)',
                attribute: 'timing',
                isorder: true
            },
            {
                id: 3,
                name: '持续时间(逆序)',
                attribute: 'timing',
                isorder: false
            },
            {
                id: 4,
                name: '持续路程(顺序)',
                attribute: 'trip',
                isorder: true
            },
            {
                id: 5,
                name: '持续路程(逆序)',
                attribute: 'trip',
                isorder: false
            }
        ],
        sort_index: 0,
        mapSetting: {
            scale: 18,                              // 缩放级别3~20
            enableOverlooking: true,                // 俯视
            skew: 30,                               // 倾斜角度
            enableRotate: true,                     // 是否支持旋转
            showLocation: true
        },
        view_height: 300,                           // 地图 view 高度
        view_duration: 1000,                        // view 动画间隔时间
        points_duration: 3000,                       // point 动画间隔时间(10的倍数)
        markers: [
            {
                id: 0,
                latitude: 0,
                longitude: 0,
                iconPath: '/image/icon/chidouren.png',
                alpha: 0.8,
                rotate: 0,
                width: 28,
                height: 28
            }
        ],
        polyline: [],
        maplatitude: 0,                             // 动态显示标点
        maplongitde: 0,
        dynamic_pol: [],                            // 动态输出路径数据
        viewAni: undefined,
    },

    /**
     * 生命周期函数--监听页面加载
     */
    onLoad(options) {
        if (wx.getUserProfile) {
            this.setData({
                canIUseGetUserProfile: true
            })
        }
        this.readLocalData()
        this.animationInit()
    },
    
    // 页面切换到当前页面
    onTabItemTap(e){
        this.readLocalData()
    },

    // 开始时同步本地数据
    readLocalData(){   
        try{
            let pol = wx.getStorageSync('polyline')
            if(pol){
                console.log('数据同步成功')
                pol = JSON.parse(pol)
                pol = this.timeIsShowData(pol)
                this.setData({ polyline: pol })
            }
        }
        catch(e){
            console(e)
        }
    },

    // 动态显示路径
    showPathRecord(event){
        const pol = this.data.polyline
        const index = pol.findIndex(s => s.start_time == event.currentTarget.dataset.id)
        if(pol[index].isShow){
            this.breakAnimation()
            this.viewAnimation(false,()=>{
                pol[index].isShow = false
                this.setData({
                    polyline: pol,
                    dynamic_pol: [],
                    maplatitude: 0,
                    maplongitde: 0,
                })
            })
        }
        else{
            let dynamic_pol = []
            dynamic_pol.push(this.deepClone(pol[index]))
            const colorList = this.objTransformArr(dynamic_pol[0].colorList)
            const points = this.deepClone(dynamic_pol[0].points)
            dynamic_pol[0].points = []
            dynamic_pol[0].colorList = colorList
            const mar = this.data.markers
            mar[0].latitude = points[0].latitude
            mar[0].longitude = points[0].longitude

            pol[index].isShow = true
            this.setData({
                polyline: pol,
                dynamic_pol: dynamic_pol,
                maplatitude: points[0].latitude,
                maplongitde: points[0].longitude,
                markers: mar
            })
            this.viewAnimation(true,()=>{
                this.moveAnimation(points)
            })
        }    
    },

    // 动态显示view
    viewAnimation(isShow,callback){
        if(isShow){
            this.animation.height(this.data.view_height).step()
            this.setData({ viewAni: this.animation.export() })
        }
        else{
            this.animation.height(-this.data.view_height).step()
            this.setData({ viewAni: this.animation.export() })
            this.map = undefined
        }
        if(callback){
            setTimeout(()=>{
                callback()
            },this.data.view_duration + 800)
        }
    },

    // 动态移动
    moveAnimation(points){
        const component = wx.createSelectorQuery().in(this).select("#pathmap");
        this.map = wx.createMapContext('pathmap', component)
        const point_arr = this.objTransformArr(points)
        this.map.moveAlong({
            markerId: 0,
            path: point_arr,
            autoRotate: true,
            duration: this.data.points_duration*point_arr.length,
            success:()=>{
                console.log('动画结束')
                this.map = undefined
                clearInterval(this.point_timer)
            },
            fail: (res)=>{
                console.log(res)
            }
        })

        let i = 1
        let pol = this.data.dynamic_pol
        pol[0].points.push(point_arr[0])
        this.point_timer = setInterval(()=>{
            this.map.moveToLocation({
                longitude: point_arr[i].longitude,
                latitude: point_arr[i].latitude
            })
            pol[0].points.push(points[i])
            this.setData({ dynamic_pol: pol })
            i++
            if(i === point_arr.length){
                clearInterval(this.point_timer)
            }
        },this.data.points_duration)
    },

    breakAnimation(){
        this.map = undefined
        clearInterval(this.point_timer)
    },

    // 删除跑步记录
    deletePathData(event){
        wx.showModal({
            title: '提示',
            content: '是否删除该记录?',
            cancelText: '取消',
            cancelColor: '#046865',
            confirmText: '确定',
            confirmColor: '#E53D00',
            success: (res)=>{
                if(res.confirm){
                    this.deleteRecord(event.currentTarget.dataset.id)
                }
            }
        })
    },

    deleteRecord(id){
        const pol = this.data.polyline
        pol.splice(pol.findIndex(s => s.start_time == id),1)
        this.setData({ polyline: pol })
        wx.setStorage({
            key: 'polyline',
            data: JSON.stringify(pol),
            success:()=>{
                wx.showToast({
                    title: '删除成功',
                    icon: 'none'
                })
            }
        })
    },

    // 向服务区上传数据
    upLoadData(){
        if(this.data.polyline.length > 0){
            const pol = JSON.stringify(this.data.polyline)
            wx.showLoading({
                title: '正在上传服务器数据',
            })
            wx.request({
                url: 'http://127.0.0.1/path',
                data:{
                    name: this.data.userInfo.nickName,
                    poldata: pol
                },
                header: {
                    "Content-Type": "application/x-www-form-urlencoded"
                },
                timeout: 100000,
                method: 'POST',
                success:(res)=>{
                    if(res.statusCode == '200'){
                        wx.showToast({
                            title: res.data.msg,
                            icon: 'none'
                        })
                    }
                },
                fail: (err)=>{
                    wx.showToast({
                        title: '服务器未启动' + err.errMsg,
                        icon: 'none'
                    })
                }
            })
        }
        else{
            wx.showToast({
                title: '暂无数据可上传',
                icon: 'none'
            })
        }
    },

    // 向服务器下载数据
    downLoadData(){
        wx.showLoading({
            title: '正在下载服务器数据',
        })
        wx.request({
            url: 'http://127.0.0.1/path',
            data:{
                name: this.data.userInfo.nickName
            },
            timeout: 100000,
            method: 'GET',
            dataType: 'json',
            success:(res)=>{
                if(res.statusCode == '200'){
                    wx.showToast({
                        title: res.data.msg,
                        icon: 'none'
                    })
                    let pol = JSON.parse(res.data.data)
                    pol = this.timeIsShowData(pol)
                    this.setData({ polyline: pol })
                    this.addLocalData()
                }
            },
            fail: (err)=>{
                wx.showToast({
                    title: '服务器未启动' + err.errMsg,
                    icon: 'none'
                })
            }
        })
    },

    // 将数据存储到本地
    addLocalData(){
        const data = JSON.stringify(this.data.polyline)
        wx.setStorage({
            key: 'polyline',
            data: data,
            success:()=>{
            }
        })
    },

    // 为 polyline 添加 list_time 时间属性、isShow 判断渲染地图属性
    timeIsShowData(pol){
        pol.map((item)=>{
            item.list_time = util.timeFormat(item.start_time,'Y/M/D h:m')
            item.isShow = false
        })
        return pol
    },

    // 排序，attribute 表示排序属性，isorder 表示顺序
    listSortBindtap(event){
        this.setData({ sort_index: event.detail.value })
        const mode = this.data.sort_mode.find(s => s.id == event.detail.value)
        let pol = this.data.polyline
        if(mode.isorder){
            pol.sort((a,b)=>{
                return a[mode.attribute] - b[mode.attribute]
            })
        }
        else{
            pol.sort((a,b)=>{
                return b[mode.attribute] - a[mode.attribute]
            })
        }
        console.log(pol)
        this.setData({ polyline: pol })        
    },

    getUserProfile(e) {
        wx.getUserProfile({
            desc: '同步用户数据', // 声明获取用户个人信息后的用途，后续会展示在弹窗中，请谨慎填写
            success: (res) => {
                console.log(res)
                this.setData({
                    userInfo: res.userInfo,
                    hasUserInfo: true
                })
            }
        })
    },

    // 动画初始化
    animationInit(){
        this.animation = wx.createAnimation({
            duration: this.data.view_duration,
            timingFunction: 'ease-out',
            delay: 0
        })
    },

    // 深拷贝
    deepClone(item){
        const target = item.constrcutor === Array ? [] : {}
        for(let dic in item){
            if(item.hasOwnProperty(dic)){
                if(item[dic] && typeof item[dic] === 'object'){
                    target[dic] = item[dic].constrcutor === Array ? [] : {}
                    target[dic] = this.deepClone(item[dic]) // 递归
                }
                else{
                    target[dic] = item[dic]
                }
            }
        }
        return target
    },

    // 将对象转换为数组
    objTransformArr(obj){
        let arr = []
        for(let dic in obj){
            arr.push(obj[dic])
        }
        return arr
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