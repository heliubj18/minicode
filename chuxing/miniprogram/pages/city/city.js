const app = getApp()

Page({
  data: {
    cities: ['北京', '上海', '广州', '深圳', '成都'],
    searchValue: '',
    filteredCities: ['北京', '上海', '广州', '深圳', '成都']
  },

  onLoad() {},

  onSearchInput(e) {
    const value = e.detail.value.trim()
    if (!value) {
      this.setData({
        searchValue: '',
        filteredCities: this.data.cities
      })
      return
    }
    const filtered = this.data.cities.filter(c => c.indexOf(value) !== -1)
    this.setData({
      searchValue: value,
      filteredCities: filtered
    })
  },

  onSelectCity(e) {
    const city = e.currentTarget.dataset.city
    // 通过 eventChannel 或直接设置上一页数据
    const pages = getCurrentPages()
    const prevPage = pages[pages.length - 2]
    if (prevPage) {
      prevPage.loadWeather(city)
    }
    wx.navigateBack()
  },

  onBack() {
    wx.navigateBack()
  }
})
