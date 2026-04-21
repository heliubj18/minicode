App({
  globalData: {
    amapKey: '***',

    // 模拟司机数据
    driver: {
      name: '张师傅',
      rating: 4.9,
      trips: 12580,
      car: '丰田卡罗拉',
      plate: '京A·12345',
      color: '白色',
      phone: '138****8888'
    },

    // 价格配置
    pricing: {
      base: 13,       // 起步价
      perKm: 2.3,     // 每公里
      badWeatherRate: 1.2  // 恶劣天气加价系数
    },

    // 恶劣天气关键词
    badWeatherKeywords: ['雷阵雨', '暴雨', '大雨', '中雨', '大雪', '暴雪', '冰雹'],

    // 天气模拟数据
    weatherDB: {
      '北京': {
        city: '北京', temp: 22, weather: '晴', humidity: 35, wind: '北风 3级', icon: '☀️',
        forecast: [
          { day: '明天', weather: '多云', icon: '⛅', tempHigh: 24, tempLow: 14 },
          { day: '后天', weather: '小雨', icon: '🌧️', tempHigh: 19, tempLow: 12 },
          { day: '周四', weather: '阴', icon: '☁️', tempHigh: 20, tempLow: 13 },
          { day: '周五', weather: '晴', icon: '☀️', tempHigh: 25, tempLow: 15 },
          { day: '周六', weather: '多云', icon: '⛅', tempHigh: 23, tempLow: 14 },
        ]
      },
      '上海': {
        city: '上海', temp: 26, weather: '多云', humidity: 68, wind: '东南风 2级', icon: '⛅',
        forecast: [
          { day: '明天', weather: '阴', icon: '☁️', tempHigh: 27, tempLow: 20 },
          { day: '后天', weather: '小雨', icon: '🌧️', tempHigh: 24, tempLow: 19 },
          { day: '周四', weather: '中雨', icon: '🌧️', tempHigh: 22, tempLow: 18 },
          { day: '周五', weather: '多云', icon: '⛅', tempHigh: 26, tempLow: 19 },
          { day: '周六', weather: '晴', icon: '☀️', tempHigh: 28, tempLow: 20 },
        ]
      },
      '广州': {
        city: '广州', temp: 30, weather: '雷阵雨', humidity: 82, wind: '南风 2级', icon: '⛈️',
        forecast: [
          { day: '明天', weather: '多云', icon: '⛅', tempHigh: 32, tempLow: 24 },
          { day: '后天', weather: '晴', icon: '☀️', tempHigh: 33, tempLow: 25 },
          { day: '周四', weather: '雷阵雨', icon: '⛈️', tempHigh: 30, tempLow: 24 },
          { day: '周五', weather: '小雨', icon: '🌧️', tempHigh: 29, tempLow: 23 },
          { day: '周六', weather: '多云', icon: '⛅', tempHigh: 31, tempLow: 24 },
        ]
      },
      '深圳': {
        city: '深圳', temp: 29, weather: '晴', humidity: 75, wind: '南风 3级', icon: '☀️',
        forecast: [
          { day: '明天', weather: '多云', icon: '⛅', tempHigh: 31, tempLow: 25 },
          { day: '后天', weather: '雷阵雨', icon: '⛈️', tempHigh: 28, tempLow: 24 },
          { day: '周四', weather: '小雨', icon: '🌧️', tempHigh: 27, tempLow: 23 },
          { day: '周五', weather: '晴', icon: '☀️', tempHigh: 30, tempLow: 24 },
          { day: '周六', weather: '晴', icon: '☀️', tempHigh: 31, tempLow: 25 },
        ]
      },
      '成都': {
        city: '成都', temp: 20, weather: '阴', humidity: 70, wind: '微风', icon: '☁️',
        forecast: [
          { day: '明天', weather: '小雨', icon: '🌧️', tempHigh: 19, tempLow: 14 },
          { day: '后天', weather: '阴', icon: '☁️', tempHigh: 21, tempLow: 15 },
          { day: '周四', weather: '多云', icon: '⛅', tempHigh: 23, tempLow: 16 },
          { day: '周五', weather: '晴', icon: '☀️', tempHigh: 25, tempLow: 17 },
          { day: '周六', weather: '多云', icon: '⛅', tempHigh: 22, tempLow: 15 },
        ]
      }
    },

    // 当前天气（首页加载时设置）
    currentWeather: null
  },

  onLaunch() {
    this.globalData.systemInfo = wx.getSystemInfoSync()
    // 默认使用北京天气
    this.globalData.currentWeather = this.globalData.weatherDB['北京']
  },

  // 根据经纬度匹配最近城市天气
  matchWeather(lat, lng) {
    const cities = [
      { name: '北京', lat: 39.9, lng: 116.4 },
      { name: '上海', lat: 31.2, lng: 121.5 },
      { name: '广州', lat: 23.1, lng: 113.3 },
      { name: '深圳', lat: 22.5, lng: 114.1 },
      { name: '成都', lat: 30.6, lng: 104.1 },
    ]
    let nearest = '北京'
    let minDist = Infinity
    cities.forEach(c => {
      const dist = Math.abs(c.lat - lat) + Math.abs(c.lng - lng)
      if (dist < minDist) { minDist = dist; nearest = c.name }
    })
    this.globalData.currentWeather = this.globalData.weatherDB[nearest]
    return this.globalData.currentWeather
  },

  // 判断是否恶劣天气
  isBadWeather() {
    const w = this.globalData.currentWeather
    if (!w) return false
    return this.globalData.badWeatherKeywords.some(k => w.weather.indexOf(k) !== -1)
  },

  // 计算预估价格
  calcPrice(distanceKm) {
    const p = this.globalData.pricing
    let price = p.base + distanceKm * p.perKm
    if (this.isBadWeather()) {
      price *= p.badWeatherRate
    }
    return Math.round(price * 10) / 10
  }
})
