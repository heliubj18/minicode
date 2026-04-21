const app = getApp()

Page({
  data: {
    latitude: 39.908823,
    longitude: 116.397470,
    markers: [],
    polyline: [],
    scale: 14,

    startLat: 0, startLng: 0,
    endLat: 0, endLng: 0,
    startName: '', endName: '',

    price: 0,
    distance: 0,
    duration: 0,

    // calling / arriving / riding / finished
    stage: 'calling',
    stageText: '正在为您呼叫快车...',
    driver: null,
    remainTime: '',
    remainDist: '',
    countdown: 0,
    rotateAngle: 0
  },

  _routePoints: [],
  _moveIndex: 0,
  _moveTimer: null,
  _rotateTimer: null,

  onLoad(options) {
    const startLat = parseFloat(options.startLat)
    const startLng = parseFloat(options.startLng)
    const endLat = parseFloat(options.endLat)
    const endLng = parseFloat(options.endLng)

    this.setData({
      startLat, startLng, endLat, endLng,
      startName: decodeURIComponent(options.startName || ''),
      endName: decodeURIComponent(options.endName || ''),
      price: parseFloat(options.price || 0),
      distance: parseInt(options.distance || 0),
      duration: parseInt(options.duration || 0),
      latitude: startLat,
      longitude: startLng,
      driver: app.globalData.driver
    })

    this.initMarkers()
    this.fetchRoute()
    this.startCalling()
  },

  onUnload() {
    if (this._moveTimer) clearInterval(this._moveTimer)
    if (this._rotateTimer) clearInterval(this._rotateTimer)
  },

  initMarkers() {
    this.setData({
      markers: [
        {
          id: 1,
          latitude: this.data.startLat,
          longitude: this.data.startLng,
          width: 24, height: 24,
          callout: { content: '上车点', display: 'ALWAYS', fontSize: 12, borderRadius: 4, padding: 6, bgColor: '#07c160', color: '#fff' }
        },
        {
          id: 2,
          latitude: this.data.endLat,
          longitude: this.data.endLng,
          width: 24, height: 24,
          callout: { content: '目的地', display: 'ALWAYS', fontSize: 12, borderRadius: 4, padding: 6, bgColor: '#fa5151', color: '#fff' }
        }
      ]
    })
  },

  fetchRoute() {
    wx.request({
      url: 'https://restapi.amap.com/v3/direction/driving',
      data: {
        key: app.globalData.amapKey,
        origin: `${this.data.startLng},${this.data.startLat}`,
        destination: `${this.data.endLng},${this.data.endLat}`,
        strategy: 0
      },
      success: (res) => {
        if (res.data && res.data.status === '1' && res.data.route && res.data.route.paths.length > 0) {
          const path = res.data.route.paths[0]
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
          this._routePoints = points
          this.showRoute(points)
        } else {
          this.fallbackRoute()
        }
      },
      fail: () => {
        this.fallbackRoute()
      }
    })
  },

  fallbackRoute() {
    const steps = 20
    const points = []
    for (let i = 0; i <= steps; i++) {
      const t = i / steps
      const offsetLat = (i > 0 && i < steps) ? (Math.random() - 0.5) * 0.003 : 0
      const offsetLng = (i > 0 && i < steps) ? (Math.random() - 0.5) * 0.003 : 0
      points.push({
        latitude: this.data.startLat + (this.data.endLat - this.data.startLat) * t + offsetLat,
        longitude: this.data.startLng + (this.data.endLng - this.data.startLng) * t + offsetLng
      })
    }
    this._routePoints = points
    this.showRoute(points)
  },

  showRoute(points) {
    this.setData({
      polyline: [{ points, color: '#4A90D9', width: 6, arrowLine: true }]
    })
    const mapCtx = wx.createMapContext('tripMap')
    mapCtx.includePoints({
      points: [
        { latitude: this.data.startLat, longitude: this.data.startLng },
        { latitude: this.data.endLat, longitude: this.data.endLng }
      ],
      padding: [120, 60, 350, 60]
    })
  },

  // 阶段1：呼叫中
  startCalling() {
    this.setData({ stage: 'calling', stageText: '正在为您呼叫快车...' })
    let angle = 0
    this._rotateTimer = setInterval(() => {
      angle += 10
      this.setData({ rotateAngle: angle })
    }, 50)
    setTimeout(() => {
      clearInterval(this._rotateTimer)
      this.startArriving()
    }, 3000)
  },

  // 阶段2：司机前往
  startArriving() {
    this.setData({ stage: 'arriving', stageText: '司机正在前往', countdown: 3 })

    const driverStart = {
      lat: this.data.startLat + (Math.random() - 0.5) * 0.016,
      lng: this.data.startLng + (Math.random() - 0.5) * 0.016
    }
    this.addDriverMarker(driverStart.lat, driverStart.lng)

    const steps = 10
    const latStep = (this.data.startLat - driverStart.lat) / steps
    const lngStep = (this.data.startLng - driverStart.lng) / steps
    let step = 0

    this._moveTimer = setInterval(() => {
      step++
      this.updateDriverMarker(
        driverStart.lat + latStep * step,
        driverStart.lng + lngStep * step
      )
      this.setData({ countdown: Math.max(1, Math.ceil((steps - step) * 0.5)) })

      if (step >= steps) {
        clearInterval(this._moveTimer)
        setTimeout(() => this.startRiding(), 500)
      }
    }, 500)
  },

  // 阶段3：行程中
  startRiding() {
    this.setData({ stage: 'riding', stageText: '行程中' })

    if (this._routePoints.length === 0) {
      setTimeout(() => this.finishTrip(), 5000)
      return
    }

    const totalPoints = this._routePoints.length
    const maxSteps = 30
    const stepSize = Math.max(1, Math.floor(totalPoints / maxSteps))
    this._moveIndex = 0

    this._moveTimer = setInterval(() => {
      this._moveIndex += stepSize
      if (this._moveIndex >= totalPoints) {
        this._moveIndex = totalPoints - 1
        clearInterval(this._moveTimer)
        setTimeout(() => this.finishTrip(), 500)
      }

      const point = this._routePoints[this._moveIndex]
      this.updateDriverMarker(point.latitude, point.longitude)

      const progress = this._moveIndex / totalPoints
      const remainDist = this.data.distance * (1 - progress)
      const remainTime = this.data.duration * (1 - progress)

      this.setData({
        remainDist: remainDist >= 1000
          ? `${(remainDist / 1000).toFixed(1)}公里`
          : `${Math.round(remainDist)}米`,
        remainTime: `${Math.max(1, Math.ceil(remainTime / 60))}分钟`,
        latitude: point.latitude,
        longitude: point.longitude
      })
    }, 300)
  },

  // 阶段4：已到达
  finishTrip() {
    this.setData({ stage: 'finished', stageText: '已到达目的地' })
    this.updateDriverMarker(this.data.endLat, this.data.endLng)
  },

  addDriverMarker(lat, lng) {
    const markers = this.data.markers.concat([{
      id: 3,
      latitude: lat,
      longitude: lng,
      width: 28, height: 28,
      callout: { content: '司机', display: 'ALWAYS', fontSize: 11, borderRadius: 4, padding: 4, bgColor: '#4A90D9', color: '#fff' }
    }])
    this.setData({ markers })
  },

  updateDriverMarker(lat, lng) {
    const markers = this.data.markers.map(m => {
      if (m.id === 3) return { ...m, latitude: lat, longitude: lng }
      return m
    })
    this.setData({ markers })
  },

  onPay() {
    wx.showToast({ title: '支付成功', icon: 'success', duration: 1500 })
    setTimeout(() => wx.navigateBack(), 1500)
  },

  onCancel() {
    if (this._moveTimer) clearInterval(this._moveTimer)
    if (this._rotateTimer) clearInterval(this._rotateTimer)
    wx.navigateBack()
  },

  onCallDriver() {
    wx.showModal({
      title: '联系司机',
      content: `${this.data.driver.name} ${this.data.driver.phone}`,
      confirmText: '确定'
    })
  }
})
