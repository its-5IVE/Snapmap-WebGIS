export default class WeatherPanel {
    constructor(containerId, mapView) {
        this.containerId = containerId
        this.mapView = mapView
        this.apiKey = 'b4e2fd52e42c4f4f6cec3264bcbc255c' // Replace with your key
        this.hourlyOffset = 0
    }

    async fetchWeather(lat, lon) {
        const container = document.getElementById(this.containerId)
        if (!container) return

        container.innerHTML = `
      <div class="weather-loading">
        <div class="spinner"></div>
        Đang tải dữ liệu thời tiết...
      </div>
    `

        try {
            const weatherData = await this.getWeatherData(lat, lon)
            this.renderWeather(weatherData)
            await this.reverseGeocodeAndUpdateHeader(lat, lon)
            this.mapView.setLocationMarker(lon, lat)
        } catch (error) {
            console.error('Weather fetch error:', error)
            this.renderMockWeather(lat, lon)
        }
    }

    async getWeatherData(lat, lon) {
        const [currentRes, forecastRes] = await Promise.all([
            fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${this.apiKey}&units=metric&lang=vi`),
            fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${this.apiKey}&units=metric&lang=vi&cnt=8`)
        ])

        if (!currentRes.ok) throw new Error('Weather API failed')

        const current = await currentRes.json()
        const forecast = await forecastRes.json()

        return this.parseWeatherData(current, forecast)
    }

    parseWeatherData(current, forecast) {
        const hourly = (forecast.list || []).slice(0, 8).map(item => ({
            time: new Date(item.dt * 1000).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false }),
            temp: Math.round(item.main.temp),
            icon: this.owmIconToEmoji(item.weather[0]?.icon)
        }))

        return {
            city: current.name || 'Địa điểm',
            temp: Math.round(current.main.temp),
            feelsLike: Math.round(current.main.feels_like),
            desc: current.weather[0]?.description || '',
            icon: this.owmIconToEmoji(current.weather[0]?.icon),
            wind: (current.wind?.speed || 0).toFixed(1),
            humidity: current.main.humidity,
            pressure: Math.round((current.main.pressure || 1013) * 0.750062),
            hourly
        }
    }

    owmIconToEmoji(icon) {
        if (!icon) return '🌡️'
        const id = icon.replace('d', '').replace('n', '')
        const map = {
            '01': '☀️', '02': '⛅', '03': '☁️', '04': '☁️',
            '09': '🌧', '10': '🌦', '11': '⛈', '13': '❄️', '50': '🌫'
        }
        return map[id] || '🌡️'
    }

    getMockWeather(lat, lon) {
        const now = new Date()
        const hourly = Array.from({ length: 8 }, (_, i) => {
            const h = new Date(now.getTime() + i * 3600000)
            const temps = [27, 28, 28, 28, 28, 27, 26, 25]
            const icons = ['⛅', '⛅', '☁️', '☀️', '☀️', '☀️', '⛅', '🌙']
            return {
                time: h.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false }),
                temp: temps[i],
                icon: icons[i]
            }
        })

        let cityHint = 'Vị trí đã chọn'
        if (lat > 20.8 && lat < 21.3) cityHint = 'Hà Nội'
        else if (lat < 10.9) cityHint = 'Cần Thơ'
        else if (lat > 16 && lat < 17) cityHint = 'Đà Nẵng'

        return {
            city: cityHint,
            temp: 28,
            feelsLike: 32,
            desc: 'Ít mây, nắng nhẹ',
            icon: '⛅',
            wind: '1.2',
            humidity: 68,
            pressure: 760,
            hourly
        }
    }

    renderMockWeather(lat, lon) {
        const data = this.getMockWeather(lat, lon)
        this.renderWeather(data)
        this.showToast('Sử dụng dữ liệu mô phỏng', 2000)
    }

    renderWeather(data) {
        const container = document.getElementById(this.containerId)
        if (!container) return

        const hourlyHTML = data.hourly.map(h => `
      <div class="hour-item">
        <div class="hour-time">${h.time}</div>
        <div class="hour-icon">${h.icon}</div>
        <div class="hour-temp">+${h.temp}°C</div>
      </div>
    `).join('')

        container.innerHTML = `
      <div class="panel-header">
        <div class="panel-city" id="panel-city-name">${data.city}</div>
        <div class="panel-info-btn" title="Nguồn OWM + Nominatim">
          <i class="bi bi-info"></i>
        </div>
      </div>
      <div class="panel-main">
        <div class="temp-big">+${data.temp}°C</div>
        <div class="weather-icon-main">${data.icon}</div>
        <div class="weather-desc">
          <div class="desc-text">${this.capitalizeFirst(data.desc)}</div>
          <div class="feels-like">Cảm giác +${data.feelsLike}°C</div>
        </div>
      </div>
      <div class="panel-stats">
        <div class="stat-item">
          <i class="bi bi-wind"></i>
          <span>${data.wind} m/s</span>
        </div>
        <div class="stat-item">
          <i class="bi bi-droplet"></i>
          <span>${data.humidity}%</span>
        </div>
        <div class="stat-item">
          <i class="bi bi-speedometer2"></i>
          <span>${data.pressure} mmHg</span>
        </div>
      </div>
      <div class="hourly-section">
        <div class="hourly-scroll-wrapper">
          <button class="scroll-btn" onclick="window.scrollHourly(-1)">
            <i class="bi bi-chevron-left"></i>
          </button>
          <div class="hourly-track">
            <div class="hourly-items" id="hourly-items">${hourlyHTML}</div>
          </div>
          <button class="scroll-btn" onclick="window.scrollHourly(1)">
            <i class="bi bi-chevron-right"></i>
          </button>
        </div>
      </div>
    `

        // Setup scroll handler
        window.scrollHourly = (dir) => {
            const items = document.getElementById('hourly-items')
            if (!items) return
            const count = items.children.length
            const vis = 6
            const maxOff = Math.max(0, count - vis)
            this.hourlyOffset = Math.min(maxOff, Math.max(0, this.hourlyOffset + dir))
            items.style.transform = `translateX(-${(100 / vis) * this.hourlyOffset}%)`
        }
    }

    async reverseGeocodeAndUpdateHeader(lat, lon) {
        try {
            const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=vi&addressdetails=1&zoom=18`
            const res = await fetch(url, { headers: { 'User-Agent': 'WeatherDashboard/1.0' } })
            if (!res.ok) throw new Error()
            const data = await res.json()
            const addr = data.address || {}

            const ward = addr.quarter || addr.suburb || addr.neighbourhood || addr.village || null
            const district = addr.city_district || addr.district || addr.county || null
            const city = addr.city || addr.town || addr.state || null

            let locationName = ward || district || city || 'Vị trí đã chọn'
            const parts = [ward, district, city].filter(Boolean)
            const fullAddress = parts.slice(0, 3).join(', ') || (data.display_name?.split(',')[0] || locationName)

            const headerLoc = document.getElementById('header-location-text')
            if (headerLoc) headerLoc.textContent = fullAddress

            const panelCity = document.getElementById('panel-city-name')
            if (panelCity) panelCity.textContent = locationName

            return fullAddress
        } catch (e) {
            console.warn('Reverse geocoding error:', e)
            const headerLoc = document.getElementById('header-location-text')
            if (headerLoc) headerLoc.textContent = `${lat.toFixed(4)}°, ${lon.toFixed(4)}°`
            return null
        }
    }

    capitalizeFirst(s) {
        return s ? s[0].toUpperCase() + s.slice(1) : ''
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