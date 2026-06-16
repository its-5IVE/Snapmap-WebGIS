import Map from 'ol/Map.js'
import View from 'ol/View.js'
import TileLayer from 'ol/layer/Tile.js'
import VectorLayer from 'ol/layer/Vector.js'
import VectorSource from 'ol/source/Vector.js'
import XYZ from 'ol/source/XYZ.js'
import Overlay from 'ol/Overlay.js'
import { fromLonLat, toLonLat, transformExtent } from 'ol/proj.js'
import ScaleLine from 'ol/control/ScaleLine.js'
import Feature from 'ol/Feature.js'
import GeoJSON from 'ol/format/GeoJSON.js'
import CircleGeom from 'ol/geom/Circle.js'
import { Style, Fill, Stroke } from 'ol/style.js'
import { CONFIG } from '../main.js'

export default class MapView {
    constructor(targetId) {
        this.targetId = targetId
        this.map = null
        this.osmLayer = null
        this.topoLayer = null
        this.markerLayer = null
        this.locationOverlay = null
        this.pickerOverlay = null
        this.currentLayer = 'osm'
        this.onPickModeChange = null
        this.onLocationSelect = null
        this.isPickingMode = false
        this.watchId = null
        this.isLocating = false
        this.utilityOverlays = []
        this.radiusFeature = null
        this.onUtilitySelect = null
        this.onMoveEnd = null
        this.routeLayer = null
        this.onRouteSelect = null
        this.currentRoutes = []
        this.routeStartMarker = null
        this.routeEndMarker = null
        this.routePickMode = null
    }

    async init() {
        this.setupLayers()
        this.setupMap()
        this.setupEventListeners()
        this.addCoordinateDisplay()
    }

    setupLayers() {
        // OSM Layer
        this.osmLayer = new TileLayer({
            source: new XYZ({
                url: 'https://{a-c}.tile.openstreetmap.org/{z}/{x}/{y}.png'
            })
        })

        // Topography Layer
        this.topoLayer = new TileLayer({
            source: new XYZ({
                url: 'https://{a-c}.tile.opentopomap.org/{z}/{x}/{y}.png'
            }),
            visible: false
        })
        this.routeLayer = new VectorLayer({
            source: new VectorSource(),
            zIndex: 8
        })

        // Marker Vector Layer
        const markerSource = new VectorSource()
        this.markerLayer = new VectorLayer({
            source: markerSource,
            zIndex: 10
        })
    }

    setupMap() {
        this.map = new Map({
            target: this.targetId,
            layers: [this.osmLayer, this.topoLayer, this.routeLayer, this.markerLayer],
            view: new View({
                center: fromLonLat(CONFIG.DEFAULT_CENTER),
                zoom: CONFIG.DEFAULT_ZOOM
            }),
            controls: [new ScaleLine({ units: 'metric' })]
        })
    }

    setupEventListeners() {
    this.map.on('click', (e) => {
        // Click vào tuyến đường
        let clickedRouteId = null

        this.map.forEachFeatureAtPixel(e.pixel, (feature) => {
            if (feature.get('routeId')) {
                clickedRouteId = feature.get('routeId')
                return true
            }
        })

        if (clickedRouteId) {
            this.selectRoute(clickedRouteId)
            return
        }

        const coords = e.coordinate
        const lonLat = toLonLat(coords)

        // Chọn điểm bắt đầu / điểm đến cho chức năng Chỉ đường
        if (this.routePickCallback && this.routePickMode) {
            const type = this.routePickMode
            const cb = this.routePickCallback

            this.setRouteMarker(type, lonLat[0], lonLat[1])

            this.routePickCallback = null
            this.routePickMode = null

            if (this.isPickingMode) {
                this.togglePickMode()
            }

            cb(lonLat[1], lonLat[0])
            return
        }

        // Nếu không ở chế độ chọn điểm thì không làm gì thêm
        if (!this.isPickingMode) return

        // Chọn điểm để tìm tiện ích theo bán kính
        if (this.onLocationSelect) {
            this.onLocationSelect(lonLat[1], lonLat[0])

            this.togglePickMode()
            this.addPickerMarker(lonLat[0], lonLat[1])
            this.flyTo(lonLat[0], lonLat[1], 15)
        }
    })

    this.map.on('moveend', () => {
        if (this.onMoveEnd) {
            this.onMoveEnd()
        }
    })
}
    startRoutePick(type, callback) {
    this.routePickMode = type
    this.routePickCallback = callback

    if (!this.isPickingMode) {
        this.togglePickMode()
    }
}

    addCoordinateDisplay() {
        this.map.on('pointermove', (e) => {
            const lonLat = toLonLat(e.coordinate)
            const badge = document.getElementById('coord-badge')
            if (badge) {
                badge.style.display = 'block'
                badge.textContent = `${lonLat[1].toFixed(5)}°N  ${lonLat[0].toFixed(5)}°E`
            }
        })
    }

    addPickerMarker(lon, lat) {
        this.removePickerMarker()

        const el = document.createElement('div')
        el.className = 'picker-marker'

        this.pickerOverlay = new Overlay({
            position: fromLonLat([lon, lat]),
            positioning: 'center-center',
            element: el,
            stopEvent: false
        })

        this.map.addOverlay(this.pickerOverlay)
}

    setLocationMarker(lon, lat) {
        if (this.locationOverlay) {
            this.locationOverlay.setPosition(fromLonLat([lon, lat]))
            return
        }

        const el = document.createElement('div')
        el.className = 'user-location-marker'

        this.locationOverlay = new Overlay({
            position: fromLonLat([lon, lat]),
            positioning: 'center-center',
            element: el,
            stopEvent: false
        })

        this.map.addOverlay(this.locationOverlay)
}

setRouteMarker(type, lon, lat) {
    const el = document.createElement('div')

    el.className = type === 'start'
        ? 'route-start-marker'
        : 'route-end-marker'

    el.innerHTML = type === 'start'
        ? '<i class="bi bi-record-circle-fill"></i>'
        : '<i class="bi bi-flag-fill"></i>'

    const overlay = new Overlay({
        position: fromLonLat([lon, lat]),
        positioning: 'center-center',
        element: el,
        stopEvent: false
    })

    if (type === 'start') {
        if (this.routeStartMarker) {
            this.map.removeOverlay(this.routeStartMarker)
        }

        this.routeStartMarker = overlay
    } else {
        if (this.routeEndMarker) {
            this.map.removeOverlay(this.routeEndMarker)
        }

        this.routeEndMarker = overlay
    }

    this.map.addOverlay(overlay)
}

    removeLocationMarker() {
        if (this.locationOverlay) {
            this.map.removeOverlay(this.locationOverlay)
            this.locationOverlay = null
        }
    }

    removePickerMarker() {
        if (this.pickerOverlay) {
            this.map.removeOverlay(this.pickerOverlay)
            this.pickerOverlay = null
        }
    }

    clearRoutePointMarkers() {
    if (this.routeStartMarker) {
        this.map.removeOverlay(this.routeStartMarker)
        this.routeStartMarker = null
    }

    if (this.routeEndMarker) {
        this.map.removeOverlay(this.routeEndMarker)
        this.routeEndMarker = null
    }
}

    clearMarkers() {
        this.removeLocationMarker()
        this.removePickerMarker()
        this.markerLayer.getSource().clear()
    }

    togglePickMode() {
        this.isPickingMode = !this.isPickingMode
        if (this.onPickModeChange) {
            this.onPickModeChange(this.isPickingMode)
        }
        const mapElement = this.map.getTargetElement()
        if (mapElement) {
            mapElement.style.cursor = this.isPickingMode ? 'crosshair' : ''
        }
    }

    setPickModeCallback(callback) {
        this.onPickModeChange = callback
    }

    setLocationSelectCallback(callback) {
        this.onLocationSelect = callback
    }

    flyTo(lon, lat, zoom = 15) {
        this.map.getView().animate({
            center: fromLonLat([lon, lat]),
            zoom: zoom,
            duration: 1000,
            easing: (t) => Math.sin(t * Math.PI / 2)
        })
    }

    setLayer(layerName) {
        this.currentLayer = layerName
        this.osmLayer.setVisible(layerName === 'osm')
        this.topoLayer.setVisible(layerName === 'topo')
    }

    resetNorth() {
        this.map.getView().animate({ rotation: 0, duration: 500 })
    }

    zoomIn() {
        const view = this.map.getView()
        view.animate({ zoom: view.getZoom() + 1, duration: 250 })
    }

    zoomOut() {
        const view = this.map.getView()
        view.animate({ zoom: view.getZoom() - 1, duration: 250 })
    }

    startLocate(onSuccess, onError) {
    if (!navigator.geolocation) {
        if (onError) onError('Trình duyệt không hỗ trợ định vị')
        return false
    }

    if (this.isPickingMode) this.togglePickMode()

    this.isLocating = true

    navigator.geolocation.getCurrentPosition(
        (pos) => {
            const { latitude: lat, longitude: lon } = pos.coords

            this.setLocationMarker(lon, lat)
            this.flyTo(lon, lat, 15)

            this.isLocating = false

            if (onSuccess) onSuccess(lat, lon)
        },
        (err) => {
            let msg = 'Không thể xác định vị trí'
            if (err.code === 1) msg = 'Bạn đã từ chối quyền truy cập vị trí'

            this.isLocating = false

            if (onError) onError(msg)
        },
        { enableHighAccuracy: true, timeout: 12000, maximumAge: 5000 }
    )

    return true
}

    stopLocate() {
        this.isLocating = false
        if (this.watchId) {
            navigator.geolocation.clearWatch(this.watchId)
            this.watchId = null
        }
    }

    isLocatingActive() {
        return this.isLocating
    }

    getMap() {
        return this.map
    }

    getCurrentLocationMarker() {
        return this.locationOverlay ? toLonLat(this.locationOverlay.getPosition()) : null
    }
    clearSnapLayers() {
    // Xóa marker tiện ích
    this.clearUtilityMarkers()

    // Xóa điểm chọn bất kỳ trên bản đồ
    this.removePickerMarker()
    this.clearRoutePointMarkers()

    // Xóa luôn điểm định vị GPS
    this.removeLocationMarker()

    // Xóa vòng tròn bán kính và các feature vector
    if (this.markerLayer) {
        this.markerLayer.getSource().clear()
    }

    this.radiusFeature = null
    this.utilityOverlays = []

    // Tắt định vị nếu đang bật
    if (this.isLocatingActive()) {
        this.stopLocate()
    }

    // Tắt chọn điểm nếu đang bật
    if (this.isPickingMode) {
        this.togglePickMode()
    }

    this.clearRoutes()
}

drawSearchRadius(lon, lat, radius) {
    if (this.radiusFeature) {
        this.markerLayer.getSource().removeFeature(this.radiusFeature)
        this.radiusFeature = null
    }

    this.radiusFeature = new Feature({
        geometry: new CircleGeom(fromLonLat([lon, lat]), radius)
    })

    this.radiusFeature.setStyle(
        new Style({
            fill: new Fill({
                color: 'rgba(26, 115, 232, 0.10)'
            }),
            stroke: new Stroke({
                color: 'rgba(26, 115, 232, 0.75)',
                width: 2
            })
        })
    )

    this.markerLayer.getSource().addFeature(this.radiusFeature)
}

clearUtilityMarkers() {
    this.utilityOverlays.forEach(overlay => {
        this.map.removeOverlay(overlay)
    })

    this.utilityOverlays = []
}

addUtilityMarkers(utilities) {
    this.clearUtilityMarkers()

    utilities.forEach(item => {
        const el = document.createElement('div')
        el.className = `amenity-map-marker amenity-${item.type} ${item.insideRadius ? 'inside-radius' : 'outside-radius'}`
        el.dataset.id = item.id
        el.innerHTML = `<span class="amenity-icon">${getAmenityIcon(item.type)}</span>`

        el.addEventListener('click', () => {

            const isSelected =
                el.classList.contains('selected')

            if (isSelected) {

                el.classList.remove('selected')

                if (this.onUtilitySelect) {
                    this.onUtilitySelect(null)
                }

                return
            }

            this.highlightUtilityMarker(item.id)

            if (this.onUtilitySelect) {
                this.onUtilitySelect(item)
            }
        })

        const overlay = new Overlay({
            position: fromLonLat([item.lon, item.lat]),
            positioning: 'center-center',
            element: el,
            stopEvent: false
        })

        overlay.utilityId = item.id

        this.utilityOverlays.push(overlay)
        this.map.addOverlay(overlay)
    })
}

highlightUtilityMarker(id) {
    this.utilityOverlays.forEach(overlay => {
        const el = overlay.getElement()

        if (String(overlay.utilityId) === String(id)) {
            el.classList.toggle('selected')
        } else {
            el.classList.remove('selected')
        }
    })
}

clearUtilityHighlight() {
  this.utilityOverlays.forEach(overlay => {
    const el = overlay.getElement()
    el.classList.remove('selected')
  })
}

setUtilitySelectCallback(callback) {
    this.onUtilitySelect = callback
}

getCurrentBBox() {
    const extent = this.map.getView().calculateExtent(this.map.getSize())
    const lonLatExtent = transformExtent(extent, 'EPSG:3857', 'EPSG:4326')

    const west = lonLatExtent[0]
    const south = lonLatExtent[1]
    const east = lonLatExtent[2]
    const north = lonLatExtent[3]

    return [south, west, north, east]
}
drawRoutes(routes, selectedRouteId = null) {
  if (!this.routeLayer) return

  const source = this.routeLayer.getSource()
  source.clear()

  const selectedId = selectedRouteId || routes[0]?.id

  // Vẽ tuyến phụ trước
  routes
    .filter(route => route.id !== selectedId)
    .forEach(route => {
      const feature = new GeoJSON().readFeature(route.geometry, {
        dataProjection: 'EPSG:4326',
        featureProjection: 'EPSG:3857'
      })

      feature.set('routeId', route.id)

      feature.setStyle(
        new Style({
          stroke: new Stroke({
            color: 'rgba(37, 99, 235, 0.35)',
            width: 5,
            lineDash: [10, 8]
          })
        })
      )

      source.addFeature(feature)
    })

  // Vẽ tuyến đang chọn sau cùng để nổi bật
  routes
    .filter(route => route.id === selectedId)
    .forEach(route => {
      const feature = new GeoJSON().readFeature(route.geometry, {
        dataProjection: 'EPSG:4326',
        featureProjection: 'EPSG:3857'
      })

      feature.set('routeId', route.id)

      feature.setStyle(
        new Style({
          stroke: new Stroke({
            color: '#2563eb',
            width: 7
          })
        })
      )

      source.addFeature(feature)
    })
}

clearRoutes() {
  if (this.routeLayer) {
    this.routeLayer.getSource().clear()
  }

  this.currentRoutes = []
  this.onRouteSelect = null
}

}

function getAmenityIcon(type) {
    const icons = {
        hospital: '🏥',
        atm: '🏧',
        parking: '🅿️',
        pharmacy: '⚕',
        fuel: '⛽'
    }

    return icons[type] || '•'

    
}

