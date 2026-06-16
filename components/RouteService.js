export async function fetchRoutes(
    startLat,
    startLon,
    endLat,
    endLon,
    mode = 'car'
) {

    const profileMap = {
        car: 'driving',
        bike: 'cycling',
        walk: 'walking',
        bus: 'driving'
    }

    const profile = profileMap[mode] || 'driving'

    const url =
        `https://router.project-osrm.org/route/v1/${profile}/` +
        `${startLon},${startLat};${endLon},${endLat}` +
        `?overview=full&geometries=geojson&alternatives=true&steps=true`

    const response = await fetch(url)
    const data = await response.json()

    if (!data.routes || data.routes.length === 0) {
        return []
    }

    return data.routes.map((route, index) => ({
        id: `route-${index}`,

        distance: Math.round(route.distance),

        duration: Math.round(route.duration / 60),

        geometry: route.geometry,

        steps:
    route.legs?.[0]?.steps?.map(step => ({
        type: step.maneuver?.type,
        modifier: step.maneuver?.modifier,
        road: step.name,
        distance: Math.round(step.distance)
    })) || []
    }))
}