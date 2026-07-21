const OPEN_METEO_URL = 'https://api.open-meteo.com/v1/forecast'
const CACHE_TTL_MS = 5 * 60 * 1000
const cache = new Map()

function coordinate(value, fallback, minimum, maximum, label) {
  const number = value === undefined || value === null || value === '' ? fallback : Number(value)
  if (!Number.isFinite(number) || number < minimum || number > maximum) {
    throw Object.assign(new Error(`Invalid ${label} parameter`), { statusCode: 400 })
  }
  return number
}

function timezone(value) {
  const result = String(value || 'Asia/Shanghai')
  if (!/^[A-Za-z0-9_+\/-]{1,64}$/.test(result)) {
    throw Object.assign(new Error('Invalid timezone parameter'), { statusCode: 400 })
  }
  return result
}

function requestUrl(options) {
  const latitude = coordinate(options.latitude, 30.2741, -90, 90, 'latitude')
  const longitude = coordinate(options.longitude, 120.1551, -180, 180, 'longitude')
  const timeZone = timezone(options.timezone)
  const query = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    current: 'temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,wind_direction_10m',
    daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max',
    timezone: timeZone,
    forecast_days: '4'
  })
  return {
    cacheKey: `${latitude},${longitude},${timeZone}`,
    url: `${OPEN_METEO_URL}?${query.toString()}`
  }
}

export async function getWeatherForecast(options = {}) {
  const request = requestUrl(options)
  const cached = cache.get(request.cacheKey)
  if (cached && Date.now() - cached.createdAt < CACHE_TTL_MS) return cached.payload

  let response
  try {
    response = await fetch(request.url, {
      headers: { Accept: 'application/json', 'User-Agent': 'dejaos-host-prototype/0.1' },
      signal: AbortSignal.timeout(12000)
    })
  } catch (error) {
    const message = error && error.name === 'TimeoutError' ? 'Weather service request timed out' : 'Failed to connect to the weather service'
    throw Object.assign(new Error(message), { statusCode: 502, cause: error })
  }
  if (!response.ok) {
    throw Object.assign(new Error(`Weather service returned HTTP ${response.status}`), { statusCode: 502 })
  }
  const payload = await response.json()
  if (!payload || !payload.current || !payload.daily) {
    throw Object.assign(new Error('Invalid weather service response'), { statusCode: 502 })
  }
  cache.set(request.cacheKey, { createdAt: Date.now(), payload })
  return payload
}

export { requestUrl }
