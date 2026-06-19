import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap-icons/font/bootstrap-icons.css'
import './style.css'
import MapView from './components/MapView.js'
import UtilityPanel from './components/UtilityPanel.js'
import SearchControl from './components/SearchControl.js'
import MapControls from './components/MapControls.js'

// Configuration
export const CONFIG = {
  DEFAULT_CENTER: [105.8412, 21.0285],
  DEFAULT_ZOOM: 14
}

class SnapApp {
  constructor() {
    this.app = document.getElementById('app')
    this.mapView = null
    this.utilityPanel = null
    this.searchControl = null
    this.mapControls = null
    this.isPickingMode = false
  }

  async init() {
    this.renderLayout()

    // Đợi một chút để DOM render xong
    await new Promise(resolve => setTimeout(resolve, 100))

    await this.initializeComponents()
    this.setupEventListeners()

    console.log('App initialized successfully')
  }

  renderLayout() {
  this.app.innerHTML = `
    <header>
      <img src=".\\img\\Design_logo_image.png" class="header-logo" alt="SNAP MAP">
      <div class="header-title">SNAP <span>Map</span></div>
      
      <div class="ms-auto header-actions">
        <button class="btn-notify">
          <i class="bi bi-info-circle"></i>
          <span class="badge-dot"></span>
        </button>
      </div>
    </header>

    <div id="map-container">
      <div id="map"></div>
      <div id="search-container"></div>


      <div id="weather-panel"></div>
      <div id="layer-toggle"></div>
      <div id="map-controls"></div>
      <div id="coord-badge"></div>
      <div id="status-toast"></div>
    </div>
  `
}

  async initializeComponents() {
    // Initialize map
    this.mapView = new MapView('map')
    await this.mapView.init()

    // Initialize weather panel
    this.utilityPanel = new UtilityPanel('weather-panel', this.mapView)

    // Initialize search control
    this.searchControl = new SearchControl('search-container', this.mapView, this.utilityPanel)

    // Initialize map controls
    this.mapControls = new MapControls('map-controls', 'layer-toggle', this.mapView, this.utilityPanel)

    // Set callbacks
    this.mapView.setPickModeCallback((isActive) => {
      this.isPickingMode = isActive
      const btn = document.getElementById('pick-location-btn')
      if (btn) {
        if (isActive) btn.classList.add('active')
        else btn.classList.remove('active')
      }
    })

    this.mapView.setLocationSelectCallback(async (lat, lon) => {
  if (this.isPickingMode) {
    await this.utilityPanel.fetchUtilities(lat, lon)
    this.showToast(`📍 Đang tìm tiện ích quanh vị trí đã chọn`, 2000)
  }
})

}
  setupEventListeners() {
    const notifyBtn = document.querySelector('.btn-notify')
    if (notifyBtn) {
      notifyBtn.addEventListener('click', () => {
        this.showToast('🔔 Tính năng đang phát triển', 1500)
      })
    }
  }

  showToast(msg, duration = 2800) {
    const toast = document.getElementById('status-toast')
    if (toast) {
      toast.textContent = msg
      toast.classList.add('show')
      setTimeout(() => toast.classList.remove('show'), duration)
    }
  }
}

// Initialize app
const app = new SnapApp()

window.snapApp = app

app.init()

export default app