(function createHttpWeatherMiniApp() {
  const WEATHER_PATH = '/weather?latitude=30.2741&longitude=120.1551&timezone=Asia%2FShanghai';
  const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  let root = null;
  let contextRef = null;
  let labels = null;
  let loading = false;
  let destroyed = false;

  function rounded(value, fallback) {
    const number = Number(value);
    return isFinite(number) ? Math.round(number) : fallback;
  }

  function weatherText(code) {
    const value = Number(code);
    if (value === 0) return 'Clear';
    if (value === 1) return 'Mostly Clear';
    if (value === 2) return 'Partly Cloudy';
    if (value === 3) return 'Overcast';
    if (value === 45 || value === 48) return 'Fog';
    if (value >= 51 && value <= 57) return 'Drizzle';
    if (value >= 61 && value <= 67) return 'Rain';
    if (value >= 71 && value <= 77) return 'Snow';
    if (value >= 80 && value <= 82) return 'Showers';
    if (value >= 85 && value <= 86) return 'Snow Showers';
    if (value >= 95) return 'Thunderstorm';
    return 'Unknown';
  }

  function windDirectionText(degrees) {
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const value = Number(degrees);
    if (!isFinite(value)) return '--';
    return directions[Math.round(((value % 360) + 360) % 360 / 45) % 8];
  }

  function dayText(dateText, index) {
    if (index === 0) return 'Today';
    if (index === 1) return 'Tomorrow';
    const date = new Date(String(dateText) + 'T12:00:00');
    return isNaN(date.getTime()) ? 'Day ' + (index + 1) : WEEKDAYS[date.getDay()];
  }

  function validatePayload(payload) {
    if (!payload || !payload.current || !payload.daily) throw new Error('Incomplete weather response');
    const daily = payload.daily;
    const arrays = [daily.time, daily.weather_code, daily.temperature_2m_max, daily.temperature_2m_min];
    if (arrays.some(function invalid(item) { return !Array.isArray(item) || item.length < 4; })) {
      throw new Error('Incomplete four-day forecast');
    }
  }

  function renderWeather(payload) {
    validatePayload(payload);
    const current = payload.current;
    const daily = payload.daily;
    const updateTime = String(current.time || '').slice(11, 16) || '--:--';
    const precipitation = rounded(current.precipitation, 0);

    labels.source.text('Open-Meteo.com · Updated ' + updateTime);
    labels.degree.text(rounded(current.temperature_2m, '--') + '°');
    labels.state.text(weatherText(current.weather_code) + ' · Feels ' + rounded(current.apparent_temperature, '--') + '°');
    labels.details.text('Wind ' + windDirectionText(current.wind_direction_10m) + ' ' + rounded(current.wind_speed_10m, '--') + ' km/h   Humidity ' + rounded(current.relative_humidity_2m, '--') + '%');

    for (let index = 0; index < 4; index += 1) {
      const probability = Array.isArray(daily.precipitation_probability_max)
        ? rounded(daily.precipitation_probability_max[index], '--')
        : '--';
      labels.days[index].text(dayText(daily.time[index], index));
      labels.temperatures[index].text(rounded(daily.temperature_2m_max[index], '--') + '/' + rounded(daily.temperature_2m_min[index], '--') + '°');
      labels.conditions[index].text(weatherText(daily.weather_code[index]));
      labels.rain[index].text('Rain ' + probability + '%');
    }
    labels.status.text('Live data updated · Precipitation ' + precipitation + ' mm');
  }

  function refreshWeather(showToast) {
    if (loading || !contextRef) return;
    loading = true;
    labels.status.text('Loading live weather data...');
    contextRef.http.getServiceJson(WEATHER_PATH, 12000).then(function onWeather(payload) {
      if (destroyed || !labels) return;
      renderWeather(payload);
      if (showToast) contextRef.toast('Weather updated');
      contextRef.logger.info('weather updated through host webapi');
    }).catch(function onWeatherError(error) {
      if (destroyed || !labels) return;
      const message = error && error.message ? error.message : String(error);
      labels.status.text('Load failed. Check the network and retry.');
      contextRef.toast('Weather request failed: ' + message);
      contextRef.logger.error('weather webapi request failed', error);
    }).then(function finishWeatherRequest() {
      loading = false;
    });
  }

  return {
    mount(context) {
      const ui = context.ui;
      contextRef = context;
      destroyed = false;
      labels = { days: [], temperatures: [], conditions: [], rain: [] };
      root = ui.view('root', context.root, 0, 0, 480, 764, ui.Theme.PAGE, 0);

      const hero = ui.view('hero', root, 20, 24, 440, 300, 0x286f9d, 24);
      ui.label('city', hero, 'Hangzhou · Live Weather', 24, 22, 300, 28, 15, ui.Theme.WHITE, true);
      labels.source = ui.label('source', hero, 'Open-Meteo.com · Waiting', 24, 53, 300, 24, 11, 0xc9e6f7, false);
      ui.image('icon', hero, context.app.icon, 360, 25, 40, 40);
      labels.degree = ui.label('degree', hero, '--°', 22, 102, 250, 100, 68, ui.Theme.WHITE, false);
      labels.state = ui.label('state', hero, 'Loading weather', 26, 210, 350, 30, 15, ui.Theme.WHITE, true);
      labels.details = ui.label('details', hero, 'Wind -- km/h   Humidity --%', 26, 248, 350, 22, 10, 0xc9e6f7, false);

      for (let index = 0; index < 4; index += 1) {
        const card = ui.card('forecast_' + index, root, 20 + index * 109, 342, 101, 132, 15);
        labels.days[index] = ui.label('forecast_day_' + index, card, index === 0 ? 'Today' : '--', 0, 10, 101, 20, 10, ui.Theme.MUTED, false, ui.ALIGN.CENTER);
        labels.temperatures[index] = ui.label('forecast_temp_' + index, card, '--/--°', 0, 35, 101, 31, 17, ui.Theme.INK, true, ui.ALIGN.CENTER);
        labels.conditions[index] = ui.label('forecast_desc_' + index, card, '--', 0, 71, 101, 20, 9, ui.Theme.MUTED, false, ui.ALIGN.CENTER);
        labels.rain[index] = ui.label('forecast_rain_' + index, card, 'Rain --%', 0, 99, 101, 20, 9, ui.Theme.MUTED, false, ui.ALIGN.CENTER);
      }

      ui.button('refresh', root, 'Refresh Weather', 155, 502, 170, 46, ui.Theme.BRAND, ui.Theme.WHITE, function onRefresh() {
        refreshWeather(true);
      }, 14, 13);
      labels.status = ui.label('status', root, 'Preparing weather request...', 20, 562, 440, 32, 11, ui.Theme.MUTED, false, ui.ALIGN.CENTER);

      refreshWeather(false);
      context.logger.info('weather mini app mounted with Host WebAPI proxy');
      return root;
    },

    show() { if (root) root.show(); },
    hide() { if (root) root.hide(); },
    unmount() {
      destroyed = true;
      root = null;
      labels = null;
      contextRef = null;
    }
  };
})()
