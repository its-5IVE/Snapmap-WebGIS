export async function fetchNearbyUtilities(lat, lon, radius = 2000, amenity = 'hospital') {
  const query = `
    [out:json][timeout:25];
    (
      node["amenity"="${amenity}"](around:${radius},${lat},${lon});
      way["amenity"="${amenity}"](around:${radius},${lat},${lon});
      relation["amenity"="${amenity}"](around:${radius},${lat},${lon});
    );
    out center tags;
  `

  const response = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    body: query
  })

  const data = await response.json()

  return data.elements
  .map(item => {
    const itemLat = item.lat || item.center?.lat
    const itemLon = item.lon || item.center?.lon
    const distance = calculateDistance(lat, lon, itemLat, itemLon)

    return {
      id: `${item.type}-${item.id}`,
      name: item.tags?.name || 'Chưa có tên',
      type: item.tags?.amenity || amenity,
      lat: itemLat,
      lon: itemLon,
      address: getAddress(item.tags),
      distance: distance,
      insideRadius: distance <= radius
    }
  })
  .filter(item => item.lat && item.lon)
  .sort((a, b) => a.distance - b.distance)
}

export async function fetchUtilitiesInBBox(amenity, bbox) {
  const [south, west, north, east] = bbox

  const query = `
    [out:json][timeout:25];
    (
      node["amenity"="${amenity}"](${south},${west},${north},${east});
      way["amenity"="${amenity}"](${south},${west},${north},${east});
      relation["amenity"="${amenity}"](${south},${west},${north},${east});
    );
    out center tags;
  `

  const response = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    body: query
  })

  const data = await response.json()

  return data.elements
    .map(item => {
      const itemLat = item.lat || item.center?.lat
      const itemLon = item.lon || item.center?.lon

      return {
        id: `${item.type}-${item.id}`,
        name: item.tags?.name || 'Chưa có tên',
        type: item.tags?.amenity || amenity,
        lat: itemLat,
        lon: itemLon,
        address: getAddress(item.tags),
        distance: null,
        insideRadius: false
      }
    })
    .filter(item => item.lat && item.lon)
}

function getAddress(tags = {}) {
  const parts = [
    tags['addr:housenumber'],
    tags['addr:street'],
    tags['addr:suburb'],
    tags['addr:district'],
    tags['addr:city']
  ].filter(Boolean)

  return parts.length ? parts.join(', ') : 'Chưa có địa chỉ'
}

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000
  const toRad = value => value * Math.PI / 180

  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
    Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return Math.round(R * c)
}