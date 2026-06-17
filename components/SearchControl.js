export default class SearchControl {
    constructor(containerId, mapView, weatherPanel) {
        this.containerId = containerId
        this.mapView = mapView
        this.weatherPanel = weatherPanel
        this.debounceTimer = null
        this.init()
    }

    init() {
        const container = document.getElementById(this.containerId)
        if (!container) {
            console.error(`Container #${this.containerId} not found`)
            return
        }

        // Thêm class cho container
        container.className = 'search-container'

        container.innerHTML = `
      <div class="search-wrapper">
        <i class="bi bi-search"></i>
        <input type="text" id="search-input" placeholder="Tìm kiếm địa điểm, phường, xã, thành phố..." autocomplete="off">
        <button id="search-clear" style="display: none;"><i class="bi bi-x-lg"></i></button>
      </div>
      <ul class="search-results" id="search-results"></ul>
    `

        this.searchInput = document.getElementById('search-input')
        this.searchResults = document.getElementById('search-results')
        this.clearBtn = document.getElementById('search-clear')

        if (!this.searchInput) {
            console.error('Search input not found')
            return
        }

        this.setupEventListeners()
        console.log('SearchControl initialized successfully')
    }

    setupEventListeners() {
        this.searchInput.addEventListener('input', (e) => {
            clearTimeout(this.debounceTimer)
            const val = e.target.value.trim()
            if (this.clearBtn) {
                this.clearBtn.style.display = val ? 'block' : 'none'
            }
            if (!val) {
                if (this.searchResults) {
                    this.searchResults.style.display = 'none'
                }
                return
            }
            this.debounceTimer = setTimeout(() => this.searchPlaces(val), 470)
        })

        if (this.clearBtn) {
            this.clearBtn.addEventListener('click', () => {
                this.searchInput.value = ''
                if (this.searchResults) {
                    this.searchResults.style.display = 'none'
                }
                this.clearBtn.style.display = 'none'
                this.searchInput.focus()
            })
        }

        document.addEventListener('click', (e) => {
            const searchContainer = document.querySelector('.search-container')
            if (searchContainer && !searchContainer.contains(e.target)) {
                if (this.searchResults) {
                    this.searchResults.style.display = 'none'
                }
            }
        })

        // Enter key search
        this.searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault()
                const val = this.searchInput.value.trim()
                if (val) {
                    this.searchPlaces(val)
                }
            }
        })
    }

    async searchPlaces(query) {
        if (!query.trim()) {
            if (this.searchResults) {
                this.searchResults.style.display = 'none'
            }
            return
        }

        try {
            const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&addressdetails=1&limit=8&accept-language=vi&countrycodes=vn`
            const res = await fetch(url, {
                headers: { 'User-Agent': 'WeatherDashboard/1.0' }
            })

            if (!res.ok) throw new Error()
            const data = await res.json()
            this.renderSearchResults(data)
        } catch (err) {
            console.warn('Search error:', err)
            if (this.searchResults) {
                this.searchResults.innerHTML = '<li style="justify-content:center;"><i class="bi bi-exclamation-triangle"></i> Lỗi tìm kiếm</li>'
                this.searchResults.style.display = 'block'
            }
        }
    }

    renderSearchResults(results) {
        if (!this.searchResults) return

        if (!results.length) {
            this.searchResults.innerHTML = '<li><i class="bi bi-geo-alt"></i> Không tìm thấy địa điểm</li>'
            this.searchResults.style.display = 'block'
            return
        }

        this.searchResults.innerHTML = ''
        results.forEach(place => {
            const li = document.createElement('li')
            const displayName = place.display_name.split(',')[0] || place.name
            const sub = place.address?.city || place.address?.town || place.address?.district || ''

            li.innerHTML = `
        <i class="bi bi-pin-map-fill"></i>
        <span class="result-name">${this.escapeHtml(displayName)}</span>
        <span class="result-detail">${this.escapeHtml(sub)}</span>
      `

            li.addEventListener('click', async () => {
                const lon = parseFloat(place.lon)
                const lat = parseFloat(place.lat)
                if (!isNaN(lon) && !isNaN(lat)) {
                    // Clear existing markers
                    if (this.mapView.clearMarkers) {
                        this.mapView.clearMarkers()
                    }

                    // Fly to location
                    this.mapView.flyTo(lon, lat, 15)

                    // Fetch weather
                    await this.weatherPanel.fetchWeather(lat, lon)

                    // Update input
                    this.searchInput.value = displayName

                    // Hide results
                    this.searchResults.style.display = 'none'
                    if (this.clearBtn) {
                        this.clearBtn.style.display = 'block'
                    }

                    this.showToast(`📍 ${displayName}`, 1500)
                }
            })

            this.searchResults.appendChild(li)
        })
        this.searchResults.style.display = 'block'
    }

    escapeHtml(text) {
        const div = document.createElement('div')
        div.textContent = text
        return div.innerHTML
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