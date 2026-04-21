const app = getApp()

// 本地 POI 模拟数据（代码片段模式下高德API不可用时兜底）
const LOCAL_POIS = {
  '天安门': [
    { name: '天安门广场', address: '北京市东城区东长安街', lat: 39.908823, lng: 116.397470 },
    { name: '天安门城楼', address: '北京市东城区天安门', lat: 39.909187, lng: 116.397451 },
  ],
  '北京南站': [
    { name: '北京南站', address: '北京市丰台区永外大街车站路12号', lat: 39.865246, lng: 116.378517 },
  ],
  '首都国际机场': [
    { name: '北京首都国际机场', address: '北京市朝阳区', lat: 40.080111, lng: 116.584572 },
    { name: '首都机场T3航站楼', address: '北京市朝阳区', lat: 40.087813, lng: 116.604203 },
    { name: '首都机场T2航站楼', address: '北京市朝阳区', lat: 40.076345, lng: 116.589542 },
  ],
  '三里屯': [
    { name: '三里屯太古里', address: '北京市朝阳区三里屯路19号', lat: 39.933168, lng: 116.454868 },
    { name: '三里屯SOHO', address: '北京市朝阳区工体北路8号', lat: 39.933900, lng: 116.453770 },
  ],
  '国贸': [
    { name: '国贸商城', address: '北京市朝阳区建国门外大街1号', lat: 39.908560, lng: 116.460370 },
    { name: '国贸大厦', address: '北京市朝阳区建国门外大街1号', lat: 39.908938, lng: 116.461580 },
  ],
  '王府井': [
    { name: '王府井大街', address: '北京市东城区王府井大街', lat: 39.914580, lng: 116.410140 },
    { name: '王府井百货', address: '北京市东城区王府井大街255号', lat: 39.915120, lng: 116.410530 },
  ],
  '故宫': [
    { name: '故宫博物院', address: '北京市东城区景山前街4号', lat: 39.916345, lng: 116.397155 },
  ],
  '颐和园': [
    { name: '颐和园', address: '北京市海淀区新建宫门路19号', lat: 39.999130, lng: 116.275440 },
  ],
  '西单': [
    { name: '西单大悦城', address: '北京市西城区西单北大街131号', lat: 39.913450, lng: 116.371830 },
    { name: '西单商场', address: '北京市西城区西单北大街120号', lat: 39.912980, lng: 116.372100 },
  ],
  '中关村': [
    { name: '中关村广场', address: '北京市海淀区中关村大街', lat: 39.983460, lng: 116.316700 },
    { name: '中关村软件园', address: '北京市海淀区东北旺西路8号', lat: 40.041000, lng: 116.289200 },
  ],
  '望京': [
    { name: '望京SOHO', address: '北京市朝阳区阜通东大街', lat: 40.002170, lng: 116.479200 },
    { name: '望京西地铁站', address: '北京市朝阳区', lat: 39.998700, lng: 116.468300 },
  ],
  '大兴机场': [
    { name: '北京大兴国际机场', address: '北京市大兴区', lat: 39.509945, lng: 116.410507 },
  ],
  '北京西站': [
    { name: '北京西站', address: '北京市丰台区莲花池东路118号', lat: 39.894952, lng: 116.322056 },
  ],
  '北京站': [
    { name: '北京站', address: '北京市东城区毛家湾胡同甲13号', lat: 39.902780, lng: 116.427060 },
  ],
  '朝阳大悦城': [
    { name: '朝阳大悦城', address: '北京市朝阳区朝阳北路101号', lat: 39.921730, lng: 116.520640 },
  ],
}

Page({
  data: {
    keyword: '',
    results: [],
    searching: false,
    history: ['天安门', '北京南站', '首都国际机场', '三里屯', '国贸']
  },

  onLoad() {},

  onInput(e) {
    const keyword = e.detail.value.trim()
    this.setData({ keyword })
    if (keyword.length >= 1) {
      this.doSearch(keyword)
    } else {
      this.setData({ results: [], searching: false })
    }
  },

  // 搜索：先调高德API，失败则用本地数据
  doSearch(keyword) {
    this.setData({ searching: true })

    if (this._searchTimer) clearTimeout(this._searchTimer)
    this._searchTimer = setTimeout(() => {
      wx.request({
        url: 'https://restapi.amap.com/v3/place/text',
        data: {
          key: app.globalData.amapKey,
          keywords: keyword,
          city: '北京',
          citylimit: false,
          offset: 15,
          output: 'JSON'
        },
        success: (res) => {
          console.log('高德POI搜索返回:', JSON.stringify(res.data))
          if (res.data && res.data.status === '1' && res.data.pois && res.data.pois.length > 0) {
            const results = res.data.pois.map(poi => {
              const loc = poi.location.split(',')
              return {
                name: poi.name,
                address: poi.address || poi.cityname + poi.adname,
                lat: parseFloat(loc[1]),
                lng: parseFloat(loc[0])
              }
            })
            this.setData({ results, searching: false })
          } else {
            // API 返回空结果，尝试本地匹配
            this.fallbackLocalSearch(keyword)
          }
        },
        fail: (err) => {
          console.warn('高德API不可用，使用本地数据:', err)
          this.fallbackLocalSearch(keyword)
        }
      })
    }, 300)
  },

  // 本地模拟搜索
  fallbackLocalSearch(keyword) {
    const results = []
    for (const key in LOCAL_POIS) {
      if (key.indexOf(keyword) !== -1 || keyword.indexOf(key) !== -1) {
        LOCAL_POIS[key].forEach(poi => results.push(poi))
      }
    }
    this.setData({ results, searching: false })
  },

  onSelectResult(e) {
    const { name, lat, lng } = e.currentTarget.dataset
    this.goBackWithResult(name, lat, lng)
  },

  onSelectHistory(e) {
    const keyword = e.currentTarget.dataset.keyword
    this.setData({ keyword })
    this.doSearch(keyword)
  },

  goBackWithResult(name, lat, lng) {
    const pages = getCurrentPages()
    const prevPage = pages[pages.length - 2]
    if (prevPage) {
      prevPage._endPoint = { name, lat, lng }
    }
    wx.navigateBack()
  },

  onCancel() {
    wx.navigateBack()
  }
})
