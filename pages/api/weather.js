export default async function handler(req, res) {
  const { lat, lon, city } = req.query

  if (!lat && !lon && !city) {
    return res.status(400).json({ error: 'Provide lat/lon or city' })
  }

  try {
    let latitude = lat
    let longitude = lon

    if (city && (!lat || !lon)) {
      const geoRes = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=pt`
      )
      const geoData = await geoRes.json()
      if (!geoData.results || geoData.results.length === 0) {
        return res.status(404).json({ error: 'City not found' })
      }
      latitude = geoData.results[0].latitude
      longitude = geoData.results[0].longitude
    }

    const weatherRes = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,weather_code&timezone=auto`
    )
    const data = await weatherRes.json()
    const temp = data.current.temperature_2m
    const humidity = data.current.relative_humidity_2m
    const weatherCode = data.current.weather_code

    let coolingDamageMultiplier = 1.0
    let message = 'Temperatura externa estável'
    let severity = 'normal'

    if (temp > 35) {
      coolingDamageMultiplier = 2.0
      message = 'CRÍTICO: Núcleo de refrigeração comprometido!'
      severity = 'critical'
    } else if (temp > 30) {
      coolingDamageMultiplier = 1.5
      message = 'Perigo: Superaquecimento iminente'
      severity = 'danger'
    } else if (temp > 25) {
      coolingDamageMultiplier = 1.3
      message = 'Alerta: Aquecimento detectado'
      severity = 'warning'
    }

    const weatherNames = {
      0: 'Céu limpo', 1: 'Parcialmente limpo', 2: 'Parcialmente nublado', 3: 'Nublado',
      45: 'Neblina', 48: 'Neblina gelada', 51: 'Garoa leve', 53: 'Garoa', 55: 'Garoa forte',
      61: 'Chuva leve', 63: 'Chuva', 65: 'Chuva forte', 71: 'Neve leve', 73: 'Neve',
      80: 'Pancadas de chuva', 95: 'Tempestade', 96: 'Tempestade com granizo'
    }

    res.status(200).json({
      temperature: temp,
      humidity,
      weatherCode,
      weatherName: weatherNames[weatherCode] || 'Desconhecido',
      coolingDamageMultiplier,
      message,
      severity
    })
  } catch (error) {
    res.status(500).json({ error: 'Falha ao buscar dados climáticos' })
  }
}
