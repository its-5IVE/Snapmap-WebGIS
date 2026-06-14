import { fetchNearbyUtilities, fetchUtilitiesInBBox } from './OverpassService.js'

export default class UtilityPanel {
  constructor(containerId, mapView) {
    this.container = document.getElementById(containerId)
    this.mapView = mapView
    this.currentLat = null
    this.currentLon = null
    this.currentUtilities = []
    this.selectedAmenity = null

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

  renderReadyMode() {
    this.container.innerHTML = `
      <div class="weather-content">
        <div class="panel-toolbar">
          <button id="backBtn" class="panel-btn">← Quay lại</button>
          <button id="reloadBtn" class="panel-btn">⟳ Tải lại</button>

          <select id="radiusSelect" class="radius-select">
            <option value="500">500 m</option>
            <option value="1000" selected>1 km</option>
            <option value="2000">2 km</option>
            <option value="3000">3 km</option>
            <option value="5000">5 km</option>
            <option value="7000">7 km</option>
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
          <option value="500">500 m</option>
          <option value="1000" selected>1 km</option>
          <option value="2000">2 km</option>
          <option value="3000">3 km</option>
          <option value="5000">5 km</option>
          <option value="7000">7 km</option>
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
          <option value="500">500 m</option>
          <option value="1000" selected>1 km</option>
          <option value="2000">2 km</option>
          <option value="3000">3 km</option>
          <option value="5000">5 km</option>
          <option value="7000">7 km</option>
        </select>
      </div>

      <h5>${getTypeLabel(this.selectedAmenity)} trên bản đồ</h5>
      <p>Đã hiển thị <strong>${utilities.length}</strong> địa điểm trong vùng bản đồ hiện tại.</p>
      <p class="hint-text">Chọn vị trí trên bản đồ hoặc dùng định vị để lọc theo bán kính.</p>
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

    const radius = Number(document.getElementById('radiusSelect')?.value || 1000)

    this.container.innerHTML = `
      <div class="weather-content">
        <div class="panel-toolbar">
          <button id="backBtn" class="panel-btn">← Quay lại</button>
          <button id="reloadBtn" class="panel-btn">⟳ Tải lại</button>

          <select id="radiusSelect" class="radius-select">
            <option value="500" ${radius === 500 ? 'selected' : ''}>500 m</option>
            <option value="1000" ${radius === 1000 ? 'selected' : ''}>1 km</option>
            <option value="2000" ${radius === 2000 ? 'selected' : ''}>2 km</option>
            <option value="3000" ${radius === 3000 ? 'selected' : ''}>3 km</option>
            <option value="5000" ${radius === 5000 ? 'selected' : ''}>5 km</option>
            <option value="7000" ${radius === 7000 ? 'selected' : ''}>7 km</option>
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
            <option value="500" ${radius === 500 ? 'selected' : ''}>500 m</option>
            <option value="1000" ${radius === 1000 ? 'selected' : ''}>1 km</option>
            <option value="2000" ${radius === 2000 ? 'selected' : ''}>2 km</option>
            <option value="3000" ${radius === 3000 ? 'selected' : ''}>3 km</option>
            <option value="5000" ${radius === 5000 ? 'selected' : ''}>5 km</option>
            <option value="7000" ${radius === 7000 ? 'selected' : ''}>7 km</option>
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

  renderVisibleOverview() {
  this.container.innerHTML = `
    <div class="weather-content">
      <div class="panel-toolbar">
        <button id="backBtn" class="panel-btn">← Quay lại</button>
        <button id="reloadBtn" class="panel-btn">⟳ Tải lại</button>

        <select id="radiusSelect" class="radius-select">
          <option value="500">500 m</option>
          <option value="1000" selected>1 km</option>
          <option value="2000">2 km</option>
          <option value="3000">3 km</option>
          <option value="5000">5 km</option>
          <option value="7000">7 km</option>
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

        <div class="route-section-title">HƯỚNG DẪN DI CHUYỂN</div>

        <div id="routeSummary" class="route-summary">
          <div class="route-time">${estimateTime(place.distance, 'car')}</div>
          <div class="route-distance">${formatDistance(place.distance)}</div>
        </div>

        <div class="transport-tabs">
          <button class="transport-btn active" data-mode="car" data-tooltip="Lái xe">
            <i class="bi bi-car-front-fill"></i>
          </button>
          <button class="transport-btn" data-mode="bus" data-tooltip="Phương tiện công cộng">
            <i class="bi bi-bus-front-fill"></i>
          </button>
          <button class="transport-btn" data-mode="walk" data-tooltip="Đi bộ">
            <i class="bi bi-person-walking"></i>
          </button>
          <button class="transport-btn" data-mode="bike" data-tooltip="Xe đạp">
            <i class="bi bi-bicycle"></i>
          </button>
        </div>

        <div id="routeSteps"></div>
      </div>
    `

    document.getElementById('backToDetail')?.addEventListener('click', () => {
      this.showUtilityDetail(place)
    })

    this.bindTransportEvents(place)
    this.renderRouteSteps('car', place)
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

  renderRouteResult(startLat, startLon, place, mode = 'car') {
    const distance = calculateDistance(startLat, startLon, place.lat, place.lon)

    document.getElementById('routeResultContainer').innerHTML = `
      <div class="route-section-title">HƯỚNG DẪN DI CHUYỂN</div>

      <div class="route-summary">
        <div class="route-time">${estimateTime(distance, mode)}</div>
        <div class="route-distance">${formatDistance(distance)}</div>
      </div>

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

      <div id="routeSteps"></div>
    `

    document.querySelectorAll('.transport-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.renderRouteResult(startLat, startLon, place, btn.dataset.mode)
      })
    })

    this.renderRouteSteps(mode, { ...place, distance })
  }

  bindTransportEvents(place) {
  document.querySelectorAll('.transport-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.transport-btn').forEach(b => {
        b.classList.remove('active')
      })

      btn.classList.add('active')

      const mode = btn.dataset.mode

      document.getElementById('routeSummary').innerHTML = `
        <div class="route-time">${estimateTime(place.distance, mode)}</div>
        <div class="route-distance">${formatDistance(place.distance)}</div>
      `

      this.renderRouteSteps(mode, place)
    })
  })
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

  renderRouteSteps(mode, place) {
    const distance = place.distance || 500

    const steps = {
      car: [
        `↑ Đi thẳng khoảng ${Math.max(100, Math.round(distance * 0.35))}m`,
        '↱ Rẽ phải',
        `↑ Đi thẳng khoảng ${Math.max(100, Math.round(distance * 0.45))}m`,
        '↰ Rẽ trái',
        '↑ Đi thẳng đến nơi'
      ],

      walk: [
        `↑ Đi thẳng khoảng ${Math.max(80, Math.round(distance * 0.4))}m`,
        '↱ Rẽ phải',
        `↑ Đi tiếp khoảng ${Math.max(80, Math.round(distance * 0.4))}m`,
        '↰ Rẽ trái',
        '↑ Đi bộ đến nơi'
      ],

      bike: [
        `↑ Đi thẳng khoảng ${Math.max(120, Math.round(distance * 0.45))}m`,
        '↱ Rẽ phải',
        `↑ Đi tiếp khoảng ${Math.max(120, Math.round(distance * 0.35))}m`,
        '↰ Rẽ trái',
        '↑ Đi xe đạp đến nơi'
      ],

      bus: [
        '↑ Đi đến điểm dừng gần nhất',
        '↱ Rẽ phải',
        `↑ Di chuyển khoảng ${Math.max(150, Math.round(distance * 0.55))}m`,
        '↰ Rẽ trái',
        '↑ Đi tiếp đến nơi'
      ]
    }

    document.getElementById('routeSteps').innerHTML = `
      <div class="route-steps">
        ${steps[mode].map(step => `
          <div class="route-step">
            ${step}
          </div>
        `).join('')}
      </div>
    `
    
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
