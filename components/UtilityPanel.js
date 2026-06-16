import { fetchNearbyUtilities, fetchUtilitiesInBBox } from './OverpassService.js'
import { fetchRoutes } from './RouteService.js'

export default class UtilityPanel {
  constructor(containerId, mapView) {
    this.container = document.getElementById(containerId)
    this.mapView = mapView
    this.currentLat = null
    this.currentLon = null
    this.currentUtilities = []
    this.selectedAmenity = null
    this.freeRouteStart = null
    this.freeRouteEnd = null
    this.freeRouteMode = 'car'

    this.renderSelectMode()

    if (this.mapView.setUtilitySelectCallback) {
      this.mapView.setUtilitySelectCallback((item) => {
        if (!item) {
          this.renderVisibleOverview()
          return
        }

        this.showUtilityDetail(item)
      })
    }
  }

  renderSelectMode() {
    this.container.innerHTML = `
      <div class="weather-content">
        <h5>Bạn muốn tìm gì?</h5>

        <div class="amenity-grid">
          <button class="amenity-btn" data-type="hospital">🏥 Bệnh viện</button>
          <button class="amenity-btn" data-type="fuel">⛽ Cây xăng</button>
          <button class="amenity-btn" data-type="parking">🅿️ Bãi đỗ xe</button>
          <button class="amenity-btn" data-type="pharmacy">💊 Nhà thuốc</button>
          <button class="amenity-btn" data-type="atm">🏧 Cây ATM</button>
        </div>

        <p class="hint-text">Chọn loại tiện ích, sau đó chọn vị trí trên bản đồ.</p>
      </div>
    `

    this.container.querySelectorAll('.amenity-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.selectedAmenity = btn.dataset.type
        this.renderReadyMode()
        this.loadVisibleUtilities()
      })
    })
  }

  renderRadiusOptions(selectedRadius = '') {
  return `
    <option value="" ${selectedRadius === '' ? 'selected' : ''}>Chọn bán kính</option>
    <option value="500" ${selectedRadius === 500 ? 'selected' : ''}>500 m</option>
    <option value="1000" ${selectedRadius === 1000 ? 'selected' : ''}>1 km</option>
    <option value="2000" ${selectedRadius === 2000 ? 'selected' : ''}>2 km</option>
    <option value="3000" ${selectedRadius === 3000 ? 'selected' : ''}>3 km</option>
    <option value="5000" ${selectedRadius === 5000 ? 'selected' : ''}>5 km</option>
    <option value="7000" ${selectedRadius === 7000 ? 'selected' : ''}>7 km</option>
  `
}

  renderReadyMode() {
    this.container.innerHTML = `
      <div class="weather-content">
        <div class="panel-toolbar">
          <button id="backBtn" class="panel-btn">← Quay lại</button>
          <button id="reloadBtn" class="panel-btn">⟳ Tải lại</button>

          <select id="radiusSelect" class="radius-select">
            ${this.renderRadiusOptions()}
          </select>
        </div>

        <h5>${getTypeLabel(this.selectedAmenity)} gần vị trí đã chọn</h5>
        <p>Hãy chọn vị trí trên bản đồ hoặc dùng định vị.</p>
      </div>
    `

    this.bindToolbarEvents()
  }
  async loadVisibleUtilities() {
  if (!this.selectedAmenity) return

  this.container.innerHTML = `
    <div class="weather-content">
      <div class="panel-toolbar">
        <button id="backBtn" class="panel-btn">← Quay lại</button>
        <button id="reloadBtn" class="panel-btn">⟳ Tải lại</button>

        <select id="radiusSelect" class="radius-select">
          ${this.renderRadiusOptions()}
        </select>
      </div>

      <h5>${getTypeLabel(this.selectedAmenity)}</h5>
      <p>Đang tải các tiện ích trong vùng bản đồ hiện tại...</p>
    </div>
  `

  this.bindToolbarEvents()

  const bbox = this.mapView.getCurrentBBox()
  const utilities = await fetchUtilitiesInBBox(this.selectedAmenity, bbox)

  this.currentUtilities = utilities

  if (this.mapView.addUtilityMarkers) {
    this.mapView.addUtilityMarkers(utilities)
  }

  this.container.innerHTML = `
    <div class="weather-content">
      <div class="panel-toolbar">
        <button id="backBtn" class="panel-btn">← Quay lại</button>
        <button id="reloadBtn" class="panel-btn">⟳ Tải lại</button>

        <select id="radiusSelect" class="radius-select">
          ${this.renderRadiusOptions()}
        </select>
      </div>

      <h5>${getTypeLabel(this.selectedAmenity)} trên bản đồ</h5>
      <p>Đã hiển thị <strong>${utilities.length}</strong> địa điểm trong vùng bản đồ hiện tại.</p>
      <p class="hint-text">Chọn vị trí trên bản đồ hoặc dùng định vị để lọc theo bán kính.</p>
    </div>
  `

  this.bindToolbarEvents()
}

renderRadiusRequiredMode() {
  this.container.innerHTML = `
    <div class="weather-content">
      <div class="panel-toolbar">
        <button id="backBtn" class="panel-btn">← Quay lại</button>
        <button id="reloadBtn" class="panel-btn">⟳ Tải lại</button>

        <select id="radiusSelect" class="radius-select">
          ${this.renderRadiusOptions()}
        </select>
      </div>

      <h5>${getTypeLabel(this.selectedAmenity)} gần vị trí đã chọn</h5>
      <p class="hint-text">Bạn đã chọn vị trí. Hãy chọn bán kính để bắt đầu tìm tiện ích.</p>
    </div>
  `

  this.bindToolbarEvents()
}

  async fetchUtilities(lat, lon) {
    this.currentLat = lat
    this.currentLon = lon

    if (!this.selectedAmenity) {
      this.renderSelectMode()
      return
    }

    const radiusValue = document.getElementById('radiusSelect')?.value

if (!radiusValue) {
  this.currentLat = lat
  this.currentLon = lon
  this.renderRadiusRequiredMode()
  return
}

const radius = Number(radiusValue)

    this.container.innerHTML = `
      <div class="weather-content">
        <div class="panel-toolbar">
          <button id="backBtn" class="panel-btn">← Quay lại</button>
          <button id="reloadBtn" class="panel-btn">⟳ Tải lại</button>

          <select id="radiusSelect" class="radius-select">
            ${this.renderRadiusOptions(radius)}
          </select>
        </div>

        <h5>Đang tìm ${getTypeLabel(this.selectedAmenity).toLowerCase()}...</h5>
        <p>Bán kính: ${formatRadius(radius)}</p>
      </div>
    `

    this.bindToolbarEvents()

    const utilities = await fetchNearbyUtilities(lat, lon, radius, this.selectedAmenity)

    const insideUtilities = utilities
      .filter(item => item.insideRadius)
      .sort((a, b) => a.distance - b.distance)

  this.renderUtilities(insideUtilities, radius)

  if (this.mapView.drawSearchRadius) {
    this.mapView.drawSearchRadius(lon, lat, radius)
  }

  if (this.mapView.addUtilityMarkers) {
    this.mapView.addUtilityMarkers(utilities)
  }

    return utilities
  }

  async fetchWeather(lat, lon) {
    return this.fetchUtilities(lat, lon)
  }

  renderUtilities(utilities, radius) {
    this.currentUtilities = utilities

    this.container.innerHTML = `
      <div class="weather-content">
        <div class="panel-toolbar">
          <button id="backBtn" class="panel-btn">← Quay lại</button>
          <button id="reloadBtn" class="panel-btn">⟳ Tải lại</button>

          <select id="radiusSelect" class="radius-select">
            ${this.renderRadiusOptions(radius)}
          </select>
        </div>

        <h5>${getTypeLabel(this.selectedAmenity)} gần vị trí đã chọn</h5>
        <p>Tìm thấy <strong>${utilities.length}</strong> địa điểm trong bán kính ${formatRadius(radius)}.</p>

        <div class="utility-list">
          ${utilities.map(item => `
            <div class="utility-item" data-id="${item.id}">
              <div>
                <strong>${item.name}</strong><br>
                <small>${item.address}</small><br>
                <span class="utility-distance">${formatDistance(item.distance)}</span>
              </div>
              <button class="route-btn" data-id="${item.id}">
                <div class="route-btn-icon">
                  <i class="bi bi-sign-turn-right-fill"></i>
                </div>

                <span>Đường đi</span>
              </button>
            </div>
          `).join('')}
        </div>
      </div>
    `

    this.bindToolbarEvents()
    this.bindUtilityItemEvents()
  }

  bindToolbarEvents() {
    document.getElementById('backBtn')?.addEventListener('click', () => {
      this.renderSelectMode()
    })

    document.getElementById('reloadBtn')?.addEventListener('click', () => {
      if (this.currentLat && this.currentLon) {
        this.fetchUtilities(this.currentLat, this.currentLon)
      }
    })

    document.getElementById('radiusSelect')?.addEventListener('change', () => {
    const radiusValue = document.getElementById('radiusSelect')?.value

    // Khi chọn lại "Chọn bán kính" = không lọc bán kính nữa
    if (!radiusValue) {
      if (this.mapView.clearRoutes) {
        this.mapView.clearRoutes()
      }

      if (this.mapView.clearSearchRadius) {
        this.mapView.clearSearchRadius()
      }

      if (this.mapView.clearUtilityHighlight) {
        this.mapView.clearUtilityHighlight()
      }

      this.currentLat = null
      this.currentLon = null

      this.loadVisibleUtilities()
      return
    }

    if (this.currentLat && this.currentLon) {
      this.fetchUtilities(this.currentLat, this.currentLon)
    }
  })
  }

  bindUtilityItemEvents() {
  this.container.querySelectorAll('.utility-item').forEach(itemEl => {
    itemEl.addEventListener('click', () => {
      const id = itemEl.dataset.id
      const isSelected = itemEl.classList.contains('selected')

      this.container.querySelectorAll('.utility-item').forEach(el => {
        el.classList.remove('selected')
      })

      if (this.mapView.clearUtilityHighlight) {
        this.mapView.clearUtilityHighlight()
      }

      if (isSelected) {
        return
      }

      itemEl.classList.add('selected')

      if (this.mapView.highlightUtilityMarker) {
        this.mapView.highlightUtilityMarker(id)
      }
    })

    itemEl.querySelector('.route-btn')?.addEventListener('click', e => {
      e.stopPropagation()

      const id = itemEl.dataset.id
      const place = this.currentUtilities.find(x => String(x.id) === String(id))

      if (place) {
        this.showRoutePanel(place)
      }
    })
  })
}

  showUtilityDetail(item) {
    this.container.innerHTML = `
      <div class="weather-content">
        <button id="backToOverview" class="panel-btn">← Quay lại</button>

        <div class="utility-list" style="margin-top: 14px;">
          <div class="utility-item selected" data-id="${item.id}">
            <div>
              <strong>${item.name}</strong><br>
              <small>${item.address || 'Chưa có địa chỉ'}</small><br>
              ${item.distance !== null && item.distance !== undefined
                ? `<span class="utility-distance">${formatDistance(item.distance)}</span>`
                : ''
              }
            </div>

            <button class="route-btn" id="detailRouteBtn" data-id="${item.id}">
              <div class="route-btn-icon">
                <i class="bi bi-sign-turn-right-fill"></i>
              </div>
              <span>Đường đi</span>
            </button>
          </div>
        </div>
      </div>
    `

    document.getElementById('backToOverview')?.addEventListener('click', () => {
      this.renderVisibleOverview()

      if (this.mapView.clearUtilityHighlight) {
        this.mapView.clearUtilityHighlight()
      }
    })

    document.getElementById('detailRouteBtn')?.addEventListener('click', () => {
      this.showRoutePanel(item)
    })
  }

  renderFreeRoutePanel() {
  this.freeRouteStart = null
  this.freeRouteEnd = null
  this.freeRouteMode = 'car'

  this.container.innerHTML = `
    <div class="route-detail-panel">
      <div class="route-place-header">
        <button id="backToUtilityHome" class="route-back-btn">←</button>

        <div>
          <h4>CHỈ ĐƯỜNG</h4>
          <p>Chọn điểm bắt đầu và điểm đến để tìm đường</p>
        </div>
      </div>

      <div class="free-route-box">
        <div class="free-route-row">
          <label>Điểm bắt đầu</label>

          <div class="free-route-actions">
            <button id="useGpsStartBtn" class="panel-btn">
              <i class="bi bi-crosshair"></i> Vị trí hiện tại
            </button>

            <button id="pickStartBtn" class="panel-btn">
              <i class="bi bi-geo-alt"></i> Chọn trên bản đồ
            </button>
          </div>

          <p id="startPointText" class="hint-text">Chưa chọn điểm bắt đầu</p>
        </div>

        <div class="free-route-row">
          <label>Điểm đến</label>

          <button id="pickEndBtn" class="panel-btn full-width">
            <i class="bi bi-flag"></i> Chọn điểm đến trên bản đồ
          </button>

          <p id="endPointText" class="hint-text">Chưa chọn điểm đến</p>
        </div>

        <div class="route-section-title">PHƯƠNG TIỆN</div>

        <div class="transport-tabs">
          <button class="transport-btn active" data-mode="car" title="Lái xe">
            <i class="bi bi-car-front-fill"></i>
          </button>

          <button class="transport-btn" data-mode="bus" title="Phương tiện công cộng">
            <i class="bi bi-bus-front-fill"></i>
          </button>

          <button class="transport-btn" data-mode="walk" title="Đi bộ">
            <i class="bi bi-person-walking"></i>
          </button>

          <button class="transport-btn" data-mode="bike" title="Xe đạp">
            <i class="bi bi-bicycle"></i>
          </button>
        </div>

        <button id="findFreeRouteBtn" class="find-route-btn">
          <i class="bi bi-signpost-2"></i> Tìm đường
        </button>

        <div id="freeRouteResult"></div>
      </div>
    </div>
  `

  document.getElementById('backToUtilityHome')?.addEventListener('click', () => {
    this.renderSelectMode()
  })

  this.bindFreeRouteEvents()
}

bindFreeRouteEvents() {
  document.getElementById('useGpsStartBtn')?.addEventListener('click', () => {
    this.mapView.startLocate(
      (lat, lon) => {
        this.freeRouteStart = { lat, lon }
        this.mapView.setRouteMarker('start', lon, lat)
        this.refreshFreeRouteIfReady()
        document.getElementById('startPointText').textContent =
          `Vị trí hiện tại: ${lat.toFixed(5)}, ${lon.toFixed(5)}`
        this.refreshFreeRouteIfReady()
      },
      () => {
        document.getElementById('freeRouteResult').innerHTML =
          `<p class="hint-text">Không thể lấy vị trí hiện tại.</p>`
      }
    )
  })

  document.getElementById('pickStartBtn')?.addEventListener('click', () => {
    this.mapView.startRoutePick('start', (lat, lon) => {
      this.freeRouteStart = { lat, lon }
      document.getElementById('startPointText').textContent =
        `Điểm bắt đầu: ${lat.toFixed(5)}, ${lon.toFixed(5)}`
    })
  })

  document.getElementById('pickEndBtn')?.addEventListener('click', () => {
    this.mapView.startRoutePick('end', (lat, lon) => {
      this.freeRouteEnd = { lat, lon }
      document.getElementById('endPointText').textContent =
        `Điểm đến: ${lat.toFixed(5)}, ${lon.toFixed(5)}`
        this.refreshFreeRouteIfReady()
    })
  })

  this.container.querySelectorAll('.transport-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      this.container.querySelectorAll('.transport-btn').forEach(b => {
        b.classList.remove('active')
      })

      btn.classList.add('active')
      this.freeRouteMode = btn.dataset.mode
    })
  })

  document.getElementById('findFreeRouteBtn')?.addEventListener('click', () => {
    this.findFreeRoute()
  })
}

async refreshFreeRouteIfReady() {
  if (!this.freeRouteStart || !this.freeRouteEnd) {
    if (this.mapView.clearRoutes) {
      this.mapView.clearRoutes()
    }
    return
  }

  const routes = await fetchRoutes(
    this.freeRouteStart.lat,
    this.freeRouteStart.lon,
    this.freeRouteEnd.lat,
    this.freeRouteEnd.lon,
    this.freeRouteMode
  )

  if (!routes.length) return

  this.currentRoutes = routes
  this.currentRouteMode = this.freeRouteMode

  this.mapView.drawRoutes(routes, routes[0].id)

  const resultBox = document.getElementById('freeRouteResult')
  if (resultBox) {
    resultBox.innerHTML = `
      <div class="route-list">
        ${routes.map((route, index) => `
          <div class="route-option ${index === 0 ? 'selected' : ''}" data-id="${route.id}">
            <div class="route-option-info">
              <strong>${getRouteTitle(route, index)}</strong>
              <span>${estimateRouteTime(route.distance, this.freeRouteMode)} · ${formatDistance(route.distance)}</span>
            </div>

            <button class="route-detail-small-btn" data-id="${route.id}" title="Lộ trình chi tiết">
              <i class="bi bi-list-ul"></i>
            </button>
          </div>
        `).join('')}
      </div>
    `

    this.bindFreeRouteResultEvents(routes)
  }
}

async findFreeRoute() {
  const resultBox = document.getElementById('freeRouteResult')

  if (!this.freeRouteStart || !this.freeRouteEnd) {
    resultBox.innerHTML = `
      <p class="hint-text">Bạn cần chọn đủ điểm bắt đầu và điểm đến.</p>
    `
    return
  }

  resultBox.innerHTML = `
    <p class="hint-text">Đang tìm tuyến đường...</p>
  `

  const routes = await fetchRoutes(
    this.freeRouteStart.lat,
    this.freeRouteStart.lon,
    this.freeRouteEnd.lat,
    this.freeRouteEnd.lon,
    this.freeRouteMode
  )

  if (!routes.length) {
    resultBox.innerHTML = `
      <p class="hint-text">Không tìm được tuyến đường phù hợp.</p>
    `
    return
  }

  this.currentRoutes = routes
  this.currentRouteMode = this.freeRouteMode

  this.mapView.drawRoutes(routes, routes[0].id)

  resultBox.innerHTML = `
    <div class="route-list">
      ${routes.map((route, index) => `
        <div class="route-option ${index === 0 ? 'selected' : ''}" data-id="${route.id}">
          <div class="route-option-info">
            <strong>${getRouteTitle(route, index)}</strong>
            <span>${estimateRouteTime(route.distance, this.freeRouteMode)} · ${formatDistance(route.distance)}</span>
          </div>

          <button class="route-detail-small-btn" data-id="${route.id}" title="Lộ trình chi tiết">
            <i class="bi bi-list-ul"></i>
          </button>
        </div>
      `).join('')}
    </div>
  `

  this.bindFreeRouteResultEvents(routes)
}

bindFreeRouteResultEvents(routes) {
  this.container.querySelectorAll('.route-option').forEach(option => {
    option.addEventListener('click', () => {
      const id = option.dataset.id

      this.container.querySelectorAll('.route-option').forEach(el => {
        el.classList.remove('selected')
      })

      option.classList.add('selected')
      this.mapView.drawRoutes(routes, id)
    })
  })

  this.container.querySelectorAll('.route-detail-small-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault()
      e.stopPropagation()

      const id = btn.dataset.id
      const route = routes.find(r => r.id === id)

      if (!route) return

      this.showFreeRouteDetailPanel(route)
    })
  })
}

showFreeRouteDetailPanel(route) {
  this.container.innerHTML = `
    <div class="route-detail-panel">
      <div class="route-place-header">
        <button id="backToFreeRoute" class="route-back-btn">←</button>

        <div>
          <h4>${getRouteTitle(route, 0)}</h4>
          <p>${estimateRouteTime(route.distance, this.freeRouteMode)} · ${formatDistance(route.distance)}</p>
        </div>
      </div>

      <div class="route-section-title">CHI TIẾT LỘ TRÌNH</div>

      <div id="routeSteps"></div>
    </div>
  `

  document.getElementById('backToFreeRoute')?.addEventListener('click', () => {
    this.renderFreeRoutePanel()
  })

  this.renderRealRouteSteps(route)
}

  renderVisibleOverview() {
  this.container.innerHTML = `
    <div class="weather-content">
      <div class="panel-toolbar">
        <button id="backBtn" class="panel-btn">← Quay lại</button>
        <button id="reloadBtn" class="panel-btn">⟳ Tải lại</button>

        <select id="radiusSelect" class="radius-select">
          ${this.renderRadiusOptions()}
        </select>
      </div>

      <h5>${getTypeLabel(this.selectedAmenity)} trên bản đồ</h5>
      <p>Đã hiển thị <strong>${this.currentUtilities.length}</strong> địa điểm trong vùng bản đồ hiện tại.</p>
      <p class="hint-text">Chọn một điểm trên bản đồ để xem thông tin chi tiết.</p>
    </div>
  `

  this.bindToolbarEvents()
}

  showRoutePanel(place) {
  if (hasValidDistance(place)) {
    this.showDirectRoutePanel(place)
  } else {
    this.showRouteStartPanel(place)
  }
}

  showDirectRoutePanel(place) {
  this.container.innerHTML = `
    <div class="route-detail-panel">
      <div class="route-place-header">
        <button id="backToDetail" class="route-back-btn">←</button>

        <div>
          <h4>${place.name}</h4>
          <p>${place.address || 'Chưa có địa chỉ'}</p>
        </div>
      </div>

      <div id="routeResultContainer">
        <p class="hint-text">Đang tìm tuyến đường phù hợp...</p>
      </div>
    </div>
  `

  document.getElementById('backToDetail')?.addEventListener('click', () => {
    this.showUtilityDetail(place)
  })

  this.renderRouteResult(this.currentLat, this.currentLon, place, 'car')
}

  showRouteStartPanel(place) {
  this.container.innerHTML = `
    <div class="route-detail-panel">
      <div class="route-place-header">
        <button id="backToDetail" class="route-back-btn">←</button>

        <div>
          <h4>${place.name}</h4>
          <p>${place.address || 'Chưa có địa chỉ'}</p>
        </div>
      </div>

      <div class="route-section-title">CHỌN ĐIỂM XUẤT PHÁT</div>

      <div class="route-source-grid">
        <button id="gpsRouteBtn" class="route-source-btn">
          <i class="bi bi-crosshair"></i>
          <span>Vị trí hiện tại</span>
        </button>

        <button id="pickRouteBtn" class="route-source-btn">
          <i class="bi bi-geo-alt-fill"></i>
          <span>Chọn điểm bắt đầu</span>
        </button>
      </div>

      <div id="routeResultContainer" class="route-result-empty">
        Chọn điểm xuất phát để xem khoảng cách, thời gian và hướng dẫn di chuyển.
      </div>
    </div>
  `

  document.getElementById('backToDetail')?.addEventListener('click', () => {
    this.showUtilityDetail(place)
  })

  this.bindRouteEvents(place)
}

  async renderRouteResult(startLat, startLon, place, mode = 'car') {
  const box = document.getElementById('routeResultContainer')

  if (!box) return

  if (
    startLat == null || startLon == null ||
    place.lat == null || place.lon == null
  ) {
    box.innerHTML = `
      <p class="hint-text">
        Chưa có đủ tọa độ để tìm đường. Hãy chọn điểm bắt đầu hoặc dùng định vị.
      </p>
    `
    return
  }

  box.innerHTML = `
    <p class="hint-text">Đang tìm tuyến đường...</p>
  `

  try {
    const routes = await fetchRoutes(
      startLat,
      startLon,
      place.lat,
      place.lon,
      mode
    )

    console.log('ROUTES FROM OSRM:', routes)

    if (!routes.length) {
      box.innerHTML = `
        <p class="hint-text">
          Không tìm được tuyến đường phù hợp cho phương tiện này.
        </p>
      `
      return
    }

    this.currentRoutes = routes
    this.currentRouteMode = mode
    this.currentRoutePlace = place
    this.currentRouteStartLat = startLat
    this.currentRouteStartLon = startLon

    this.mapView.drawRoutes(routes, routes[0].id)

    box.innerHTML = `
      <div class="route-section-title">HƯỚNG DẪN DI CHUYỂN</div>

      <div class="transport-tabs">
        <button class="transport-btn ${mode === 'car' ? 'active' : ''}" data-mode="car" data-tooltip="Lái xe">
          <i class="bi bi-car-front-fill"></i>
        </button>

        <button class="transport-btn ${mode === 'bus' ? 'active' : ''}" data-mode="bus" data-tooltip="Phương tiện công cộng">
          <i class="bi bi-bus-front-fill"></i>
        </button>

        <button class="transport-btn ${mode === 'walk' ? 'active' : ''}" data-mode="walk" data-tooltip="Đi bộ">
          <i class="bi bi-person-walking"></i>
        </button>

        <button class="transport-btn ${mode === 'bike' ? 'active' : ''}" data-mode="bike" data-tooltip="Xe đạp">
          <i class="bi bi-bicycle"></i>
        </button>
      </div>

      <div class="route-list">
      ${routes.map((route, index) => `
        <div class="route-option ${index === 0 ? 'selected' : ''}" data-id="${route.id}">
          <div class="route-option-info">
            <strong>${getRouteTitle(route, index)}</strong>
            <span>${estimateRouteTime(route.distance, mode)} · ${formatDistance(route.distance)}</span>
          </div>

          <button class="route-detail-small-btn" data-id="${route.id}" title="Lộ trình chi tiết">
            <i class="bi bi-list-ul"></i>
          </button>
        </div>
      `).join('')}
      </div>

      <div id="routeSteps"></div>
    `

    this.bindRouteOptionEvents(routes)
    this.bindTransportModeEvents(startLat, startLon, place)

  } catch (error) {
    console.error('Lỗi gọi OSRM:', error)

    box.innerHTML = `
      <p class="hint-text">
        Lỗi tải tuyến đường từ OSRM. Kiểm tra mạng hoặc console.
      </p>
    `
  }
}

bindRouteOptionEvents(routes) {
  this.container.querySelectorAll('.route-option').forEach(option => {
    option.addEventListener('click', () => {
      const id = option.dataset.id

      this.container.querySelectorAll('.route-option').forEach(el => {
        el.classList.remove('selected')
      })

      option.classList.add('selected')

      if (this.mapView.drawRoutes) {
        this.mapView.drawRoutes(routes, id)
      }
    })
  })

  this.container.querySelectorAll('.route-detail-small-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    e.preventDefault()
    e.stopPropagation()

    const id = btn.dataset.id
    const route = routes.find(r => r.id === id)

    if (!route) return

    if (this.mapView.drawRoutes) {
      this.mapView.drawRoutes(routes, id)
    }

    this.showRouteDetailPanel(route, routes)
  })
})
}

renderRouteListFromCurrent(selectedRouteId = null) {
  const routes = this.currentRoutes || []
  const mode = this.currentRouteMode || 'car'
  const place = this.currentRoutePlace

  if (!routes.length || !place) return

  const selectedId = selectedRouteId || routes[0].id

  if (this.mapView.drawRoutes) {
    this.mapView.drawRoutes(routes, selectedId)
  }

  this.container.innerHTML = `
    <div class="route-detail-panel">
      <div class="route-place-header">
        <button type="button" id="backToDetail" class="route-back-btn">←</button>

        <div>
          <h4>${place.name}</h4>
          <p>${place.address || 'Chưa có địa chỉ'}</p>
        </div>
      </div>

      <div id="routeResultContainer">
        <div class="route-section-title">HƯỚNG DẪN DI CHUYỂN</div>

        <div class="transport-tabs">
          <button class="transport-btn ${mode === 'car' ? 'active' : ''}" data-mode="car" data-tooltip="Lái xe">
            <i class="bi bi-car-front-fill"></i>
          </button>
          <button class="transport-btn ${mode === 'bus' ? 'active' : ''}" data-mode="bus" data-tooltip="Phương tiện công cộng">
            <i class="bi bi-bus-front-fill"></i>
          </button>
          <button class="transport-btn ${mode === 'walk' ? 'active' : ''}" data-mode="walk" data-tooltip="Đi bộ">
            <i class="bi bi-person-walking"></i>
          </button>
          <button class="transport-btn ${mode === 'bike' ? 'active' : ''}" data-mode="bike" data-tooltip="Xe đạp">
            <i class="bi bi-bicycle"></i>
          </button>
        </div>

        <div class="route-list">
          ${routes.map((route, index) => `
            <div class="route-option ${route.id === selectedId ? 'selected' : ''}" data-id="${route.id}">
              <div class="route-option-info">
                <strong>${getRouteTitle(route, index)}</strong>
                <span>${estimateRouteTime(route.distance, mode)} · ${formatDistance(route.distance)}</span>
              </div>

              <button class="route-detail-small-btn" data-id="${route.id}">
                <i class="bi bi-list-ul"></i>
              </button>
            </div>
          `).join('')}
        </div>

        <div id="routeSteps"></div>
      </div>
    </div>
  `

  document.getElementById('backToDetail')?.addEventListener('click', () => {
    this.showUtilityDetail(place)
  })

  this.bindRouteOptionEvents(routes)
  this.bindTransportModeEvents(
    this.currentRouteStartLat,
    this.currentRouteStartLon,
    place
  )
}

showRouteDetailPanel(route, routes) {
  this.container.innerHTML = `
    <div class="route-detail-panel">
      <div class="route-place-header">
        <button type="button" id="backToRoutes" class="route-back-btn">←</button>

        <div>
          <h4>${getRouteTitle(route, 0)}</h4>
          <p>${estimateRouteTime(route.distance, this.currentRouteMode || 'car')} · ${formatDistance(route.distance)}</p>
        </div>
      </div>

      <div id="routeResultContainer">
        <div class="route-section-title">CHI TIẾT LỘ TRÌNH</div>
        <div id="routeSteps"></div>
      </div>
    </div>
  `

  document.getElementById('backToRoutes')?.addEventListener('click', (e) => {
    e.preventDefault()
    e.stopPropagation()

    this.renderRouteListFromCurrent(route.id)
  })

  this.renderRealRouteSteps(route)
}

bindTransportModeEvents(startLat, startLon, place) {
  this.container.querySelectorAll('.transport-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const mode = btn.dataset.mode
      this.renderRouteResult(startLat, startLon, place, mode)
    })
  })
}

renderRealRouteSteps(route) {
  const steps = route.steps.slice(0, 6)

  document.getElementById('routeSteps').innerHTML = `
    <div class="route-steps">
      ${steps.map(step => `
        <div class="route-step">
          ${translateManeuver(step.type, step.modifier)}
          <small>${formatDistance(step.distance)}</small>
        </div>
      `).join('')}
    </div>
  `
}

  bindRouteEvents(place) {
  document.getElementById('backToDetail')?.addEventListener('click', () => {
    this.showUtilityDetail(place)
  })

  document.getElementById('gpsRouteBtn')?.addEventListener('click', () => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const startLat = pos.coords.latitude
        const startLon = pos.coords.longitude

        if (this.mapView.setLocationMarker) {
          this.mapView.setLocationMarker(startLon, startLat)
        }

        this.renderRouteResult(startLat, startLon, place, 'car')
      },
      () => {
        document.getElementById('routeResultContainer').innerHTML = `
          <p class="hint-text">Không thể lấy vị trí hiện tại. Hãy thử chọn điểm trên bản đồ.</p>
        `
      }
    )
  })

  document.getElementById('pickRouteBtn')?.addEventListener('click', () => {
    document.getElementById('routeResultContainer').innerHTML = `
      <p class="hint-text">Hãy click một điểm trên bản đồ để chọn điểm xuất phát.</p>
    `

    if (this.mapView.startRoutePick) {
      this.mapView.startRoutePick((startLat, startLon) => {
        this.renderRouteResult(startLat, startLon, place, 'car')
      })
    }
  })
}

  resetPanel() {
    this.currentLat = null
    this.currentLon = null
    this.currentUtilities = []
    this.selectedAmenity = null

    this.renderSelectMode()
  }
}

function getTypeLabel(type) {
  const labels = {
    hospital: 'Bệnh viện',
    fuel: 'Cây xăng',
    parking: 'Bãi đỗ xe',
    pharmacy: 'Nhà thuốc',
    atm: 'Cây ATM'
  }

  return labels[type] || type
}

function formatRadius(radius) {
  return radius >= 1000 ? `${radius / 1000} km` : `${radius} m`
}

function formatDistance(distance) {
  return distance >= 1000
    ? `${(distance / 1000).toFixed(2)} km`
    : `${distance} m`
}

function estimateTime(distance, mode) {
  const speeds = {
    walk: 5,
    bike: 15,
    car: 35,
    bus: 25
  }

  const speed = speeds[mode] || 5
  const hours = (distance / 1000) / speed
  const minutes = Math.max(1, Math.round(hours * 60))

  return `${minutes} phút`
}
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2)

  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)))
}

function hasValidDistance(place) {
  return place.distance !== null &&
         place.distance !== undefined &&
         !Number.isNaN(Number(place.distance))
}

function translateManeuver(type, modifier) {
  if (type === 'arrive') return 'Đến nơi'
  if (modifier === 'left') return 'Rẽ trái'
  if (modifier === 'right') return 'Rẽ phải'
  if (modifier === 'straight') return 'Đi thẳng'
  if (type === 'depart') return 'Bắt đầu di chuyển'

  return 'Tiếp tục di chuyển'
}

function getRouteTitle(route, index) {
  const roadCount = {}

  route.steps.forEach(step => {
    const road = step.road

    if (!road || road.trim() === '') return

    roadCount[road] = (roadCount[road] || 0) + step.distance
  })

  const mainRoad = Object.entries(roadCount)
    .sort((a, b) => b[1] - a[1])[0]?.[0]

  if (mainRoad) {
    return `Qua ${mainRoad}`
  }

  if (index === 0) {
    return 'Tuyến đề xuất'
  }

  return `Tuyến thay thế ${index + 1}`
}

function estimateRouteTime(distance, mode) {
  const speeds = {
    car: 35,
    bus: 22,
    walk: 4.5,
    bike: 14
  }

  const speed = speeds[mode] || 35
  const hours = (distance / 1000) / speed
  const minutes = Math.max(1, Math.round(hours * 60))

  return `${minutes} phút`
}