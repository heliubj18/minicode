const app = getApp()

Page({
  data: {
    // 地图
    latitude: 39.908823,
    longitude: 116.397470,
    markers: [],
    polyline: [],
    scale: 15,

    // 起终点
    startName: '正在定位...',
    startLat: 0,
    startLng: 0,
    endName: '',
    endLat: 0,
    endLng: 0,
    hasEnd: false,

    // 路线信息
    distance: 0,
    duration: 0,
    distanceText: '',
    durationText: '',
    price: 0,
    isBadWeather: false,

    // 天气
    weatherIcon: '',
    weatherText: '',
    weatherTip: '',

    // UI
    statusBarHeight: 0
  },

  onLoad() {
    const sysInfo = wx.getSystemInfoSync()
    this.setData({ statusBarHeight: sysInfo.statusBarHeight || 44 })
    this.getLocation()
    this.loadWeather()
  },

  onShow() {
    const pages = getCurrentPages()
    const current = pages[pages.length - 1]
    if (current._endPoint) {
      const end = current._endPoint
      this.setData({
        endName: end.name,
        endLat: end.lat,
        endLng: end.lng,
        hasEnd: true
      })
      current._endPoint = null
      this.updateMarkers()
      this.planRoute()
    }
  },

  getLocation() {
    wx.getLocation({
      type: 'gcj02',
      success: (res) => {
        this.setData({
          latitude: res.latitude,
          longitude: res.longitude,
          startLat: res.latitude,
          startLng: res.longitude
        })
        this.reverseGeocode(res.latitude, res.longitude)
        app.matchWeather(res.latitude, res.longitude)
        this.loadWeather()
      },
      fail: () => {
        this.setData({
          startLat: 39.908823,
          startLng: 116.397470,
          startName: '北京市东城区天安门'
        })
        this.updateMarkers()
      }
    })
  },

  reverseGeocode(lat, lng) {
    wx.request({
      url: 'https://restapi.amap.com/v3/geocode/regeo',
      data: {
        key: app.globalData.amapKey,
        location: `${lng},${lat}`,
        output: 'JSON'
      },
      success: (res) => {
        if (res.data && res.data.status === '1') {
          const addr = res.data.regeocode.formatted_address
          this.setData({ startName: addr || '当前位置' })
        } else {
          this.setData({ startName: '当前位置' })
        }
        this.updateMarkers()
      },
      fail: (err) => {
        console.warn('逆地理编码失败，使用默认地址:', err)
        this.setData({ startName: '当前位置' })
        this.updateMarkers()
      }
    })
  },

  loadWeather() {
    const weather = app.globalData.currentWeather
    if (!weather) return
    const bad = app.isBadWeather()
    this.setData({
      weatherIcon: weather.icon,
      weatherText: `${weather.weather} ${weather.temp}°C`,
      weatherTip: bad ? '建议提前叫车 · 预计加价20%' : '',
      isBadWeather: bad
    })
  },

  updateMarkers() {
    const markers = []
    if (this.data.startLat) {
      markers.push({
        id: 1,
        latitude: this.data.startLat,
        longitude: this.data.startLng,
        width: 24,
        height: 24,
        callout: {
          content: '上车点',
          display: 'ALWAYS',
          fontSize: 12,
          borderRadius: 4,
          padding: 6,
          bgColor: '#07c160',
          color: '#fff'
        }
      })
    }
    if (this.data.hasEnd) {
      markers.push({
        id: 2,
        latitude: this.data.endLat,
        longitude: this.data.endLng,
        width: 24,
        height: 24,
        callout: {
          content: '目的地',
          display: 'ALWAYS',
          fontSize: 12,
          borderRadius: 4,
          padding: 6,
          bgColor: '#fa5151',
          color: '#fff'
        }
      })
    }
    this.setData({ markers })
  },

  // 路线规划：高德API优先，失败则模拟
  planRoute() {
    if (!this.data.hasEnd) return
    const origin = `${this.data.startLng},${this.data.startLat}`
    const destination = `${this.data.endLng},${this.data.endLat}`

    wx.request({
      url: 'https://restapi.amap.com/v3/direction/driving',
      data: {
        key: app.globalData.amapKey,
        origin: origin,
        destination: destination,
        strategy: 0
      },
      success: (res) => {
        if (res.data && res.data.status === '1' && res.data.route && res.data.route.paths.length > 0) {
          const path = res.data.route.paths[0]
          this.applyRoute(path)
        } else {
          console.warn('路线规划API返回异常，使用模拟路线')
          this.fallbackRoute()
        }
      },
      fail: (err) => {
        console.warn('路线规划API不可用，使用模拟路线:', err)
        this.fallbackRoute()
      }
    })
  },

  // 应用真实路线数据
  applyRoute(path) {
    const distance = parseInt(path.distance)
    const duration = parseInt(path.duration)
    const distanceKm = distance / 1000
    const price = app.calcPrice(distanceKm)

    const points = []
    path.steps.forEach(step => {
      step.polyline.split(';').forEach(p => {
        const lnglat = p.split(',')
        points.push({
          longitude: parseFloat(lnglat[0]),
          latitude: parseFloat(lnglat[1])
        })
      })
    })

    this.setRouteData(distance, duration, price, points)
  },

  // 模拟路线（直线连接起终点，插值生成中间点）
  fallbackRoute() {
    const startLat = this.data.startLat
    const startLng = this.data.startLng
    const endLat = this.data.endLat
    const endLng = this.data.endLng

    // 计算直线距离（简易公式，米）
    const dLat = (endLat - startLat) * 111320
    const dLng = (endLng - startLng) * 111320 * Math.cos(startLat * Math.PI / 180)
    const straightDist = Math.sqrt(dLat * dLat + dLng * dLng)
    // 实际路程约为直线距离的1.4倍
    const distance = Math.round(straightDist * 1.4)
    const duration = Math.round(distance / 8) // 约30km/h
    const distanceKm = distance / 1000
    const price = app.calcPrice(distanceKm)

    // 生成折线点（简单插值 + 随机偏移模拟弯路）
    const steps = 20
    const points = []
    for (let i = 0; i <= steps; i++) {
      const t = i / steps
      const offsetLat = (i > 0 && i < steps) ? (Math.random() - 0.5) * 0.003 : 0
      const offsetLng = (i > 0 && i < steps) ? (Math.random() - 0.5) * 0.003 : 0
      points.push({
        latitude: startLat + (endLat - startLat) * t + offsetLat,
        longitude: startLng + (endLng - startLng) * t + offsetLng
      })
    }

    this.setRouteData(distance, duration, price, points)
  },

  setRouteData(distance, duration, price, points) {
    const distanceKm = distance / 1000
    this.setData({
      distance,
      duration,
      distanceText: distanceKm >= 1 ? `${distanceKm.toFixed(1)}公里` : `${distance}米`,
      durationText: duration >= 3600
        ? `${Math.floor(duration / 3600)}小时${Math.floor((duration % 3600) / 60)}分钟`
        : `${Math.max(1, Math.ceil(duration / 60))}分钟`,
      price,
      polyline: [{
        points: points,
        color: '#4A90D9',
        width: 6,
        arrowLine: true
      }]
    })

    // 调整视野
    const mapCtx = wx.createMapContext('tripMap')
    mapCtx.includePoints({
      points: [
        { latitude: this.data.startLat, longitude: this.data.startLng },
        { latitude: this.data.endLat, longitude: this.data.endLng }
      ],
      padding: [100, 60, 300, 60]
    })
  },

  onTapSearch() {
    wx.navigateTo({ url: '/pages/search/search' })
  },

  onRelocate() {
    this.getLocation()
  },

  onCallCar() {
    if (!this.data.hasEnd) {
      wx.showToast({ title: '请先选择目的地', icon: 'none' })
      return
    }
    wx.navigateTo({
      url: `/pages/trip/trip?startLat=${this.data.startLat}&startLng=${this.data.startLng}&endLat=${this.data.endLat}&endLng=${this.data.endLng}&startName=${encodeURIComponent(this.data.startName)}&endName=${encodeURIComponent(this.data.endName)}&price=${this.data.price}&distance=${this.data.distance}&duration=${this.data.duration}`
    })
  },

  onClearEnd() {
    this.setData({
      hasEnd: false,
      endName: '',
      endLat: 0,
      endLng: 0,
      distance: 0,
      duration: 0,
      price: 0,
      polyline: [],
      distanceText: '',
      durationText: ''
    })
    this.updateMarkers()
    this.setData({
      latitude: this.data.startLat,
      longitude: this.data.startLng,
      scale: 15
    })
  },

  onShareAppMessage() {
    return {
      title: '打车出行',
      path: '/pages/index/index'
    }
  }
})
