export default class MapControls {
    constructor(controlsId, layerToggleId, mapView, weatherPanel) {
        this.controlsId = controlsId
        this.layerToggleId = layerToggleId
        this.mapView = mapView
        this.weatherPanel = weatherPanel
        this.init()
    }

    init() {
        this.renderControls()
        this.renderLayerToggle()
        this.setupEventListeners()
    }

    renderControls() {
        const container = document.getElementById(this.controlsId)
        if (!container) return

        container.innerHTML = `
      <button id="zoom-in-btn" class="map-ctrl-btn" title="Phóng to">
        <i class="bi bi-plus-lg"></i>
      </button>
      <button id="zoom-out-btn" class="map-ctrl-btn" title="Thu nhỏ">
        <i class="bi bi-dash-lg"></i>
      </button>
      <button id="pick-location-btn" class="map-ctrl-btn" title="Chọn vị trí trên bản đồ">
        <i class="bi bi-geo-alt"></i>
      </button>
      <button id="map-locate-btn" class="map-ctrl-btn" title="Định vị vị trí của bạn">
        <i class="bi bi-crosshair2 locate-icon"></i>
      </button>
      <button id="compass-btn" class="map-ctrl-btn" title="Hướng Bắc">
        <i class="bi bi-compass"></i>
      </button>
      <button id="clear-map-btn" class="map-ctrl-btn" title="Xóa thao tác">
        <i class="bi bi-x-lg"></i>
</button>
    `
    }

    renderLayerToggle() {
        const container = document.getElementById(this.layerToggleId)
        if (!container) return

        container.innerHTML = `
      <button id="btn-osm" class="layer-btn active">
        <span class="layer-dot"></span> Bản đồ
      </button>
      <button id="btn-topo" class="layer-btn">
        <span class="layer-dot"></span> Địa hình
      </button>
    `
    }

    setupEventListeners() {
    // Zoom controls
    const zoomInBtn = document.getElementById('zoom-in-btn')
    const zoomOutBtn = document.getElementById('zoom-out-btn')

    if (zoomInBtn) {
        zoomInBtn.addEventListener('click', () => this.mapView.zoomIn())
    }

    if (zoomOutBtn) {
        zoomOutBtn.addEventListener('click', () => this.mapView.zoomOut())
    }

    // Pick location button
    const pickBtn = document.getElementById('pick-location-btn')

    if (pickBtn) {
        pickBtn.addEventListener('click', () => {
            this.mapView.togglePickMode()

            const isActive = this.mapView.isPickingMode

            if (isActive) {
                if (this.mapView.isLocatingActive()) this.mapView.stopLocate()

                const locateBtn = document.getElementById('map-locate-btn')
                if (locateBtn) locateBtn.classList.remove('active')

                this.showToast('🔍 Chọn một điểm bất kỳ trên bản đồ để tìm tiện ích', 3000)
            } else {
                this.showToast('Đã thoát chế độ chọn vị trí', 1500)
            }
        })
    }

    // Locate button
    const locateBtn = document.getElementById('map-locate-btn')

    if (locateBtn) {
        locateBtn.addEventListener('click', () => this.toggleLocate())
    }

    // Compass button
    const compassBtn = document.getElementById('compass-btn')

    if (compassBtn) {
        compassBtn.addEventListener('click', () => this.mapView.resetNorth())
    }

    // Clear button
    const clearBtn = document.getElementById('clear-map-btn')

    if (clearBtn) {
        clearBtn.addEventListener('click', () => {

            clearBtn.classList.add('clear-active')

            this.mapView.clearSnapLayers()

            if (this.weatherPanel.resetPanel) {
                this.weatherPanel.resetPanel()
            }

            this.showToast('🧹 Đã xóa thao tác trên bản đồ', 1800)

            setTimeout(() => {
                clearBtn.classList.remove('clear-active')
            }, 200)

        })
    }

    // Layer toggle
    const osmBtn = document.getElementById('btn-osm')
    const topoBtn = document.getElementById('btn-topo')

    if (osmBtn) {
        osmBtn.addEventListener('click', () => {
            this.mapView.setLayer('osm')
            osmBtn.classList.add('active')
            if (topoBtn) topoBtn.classList.remove('active')
        })
    }

    if (topoBtn) {
        topoBtn.addEventListener('click', () => {
            this.mapView.setLayer('topo')
            topoBtn.classList.add('active')
            if (osmBtn) osmBtn.classList.remove('active')
        })
    }
}
}