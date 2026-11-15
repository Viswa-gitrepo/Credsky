/**
 * SKY CRED — application controller.
 *
 * State machine:  loading -> success | error
 * Implements FR-01 … FR-09 of the PRD:
 *   - Default city Mumbai fetched on launch (FR-01, FR-10)
 *   - Search via button and Enter key, empty input blocked client-side (FR-02)
 *   - Popular-city chips with selected highlight (FR-03)
 *   - Weather card + metrics + personality, all dynamic (FR-04, FR-05, FR-06)
 *   - Formatted / raw JSON viewer with copy (FR-07)
 *   - Error handling with Retry, stale-response protection (FR-08)
 */
(function (global) {
  "use strict";

  var config = global.SKYCRED_CONFIG;
  var api = global.SKYCRED_API;
  var personality = global.SKYCRED_PERSONALITY;

  // ---------- DOM refs ----------
  var els = {
    form: document.getElementById("search-form"),
    input: document.getElementById("city-input"),
    searchBtn: document.getElementById("search-btn"),
    chips: document.getElementById("city-chips"),
    errorPanel: document.getElementById("error-panel"),
    errorTitle: document.getElementById("error-title"),
    errorMessage: document.getElementById("error-message"),
    retryBtn: document.getElementById("retry-btn"),
    loadingPanel: document.getElementById("loading-panel"),
    weatherCard: document.getElementById("weather-card"),
    locationName: document.getElementById("location-name"),
    locationRegion: document.getElementById("location-region"),
    localTime: document.getElementById("local-time"),
    conditionIcon: document.getElementById("condition-icon"),
    tempC: document.getElementById("temp-c"),
    conditionText: document.getElementById("condition-text"),
    feelsLike: document.getElementById("feels-like"),
    personality: document.getElementById("personality"),
    personalityTitle: document.getElementById("personality-title"),
    personalityDesc: document.getElementById("personality-desc"),
    humidity: document.getElementById("humidity"),
    windKph: document.getElementById("wind-kph"),
    uvIndex: document.getElementById("uv-index"),
    cloud: document.getElementById("cloud"),
    visibility: document.getElementById("visibility"),
    pressure: document.getElementById("pressure"),
    windMpS: document.getElementById("wind-mp-s"),
    tempF: document.getElementById("temp-f"),
    lastUpdated: document.getElementById("last-updated"),
    jsonOutput: document.getElementById("json-output"),
    tabFormatted: document.getElementById("tab-formatted"),
    tabRaw: document.getElementById("tab-raw"),
    copyBtn: document.getElementById("copy-json"),
    srStatus: document.getElementById("sr-status")
  };

  // ---------- State ----------
  var state = {
    selectedCity: null,   // display name of the last successful/attempted city
    weather: null,        // parsed API payload
    rawJson: null,        // raw API response text
    jsonView: "formatted",
    requestSeq: 0,        // monotonically increasing; guards stale responses
    abortController: null
  };

  // ---------- Helpers ----------
  function normalize(name) {
    return String(name || "").trim().toLowerCase();
  }

  function announce(message) {
    els.srStatus.textContent = message;
  }

  function show(element) { element.classList.remove("hidden"); }
  function hide(element) { element.classList.add("hidden"); }

  function setLoading(isLoading) {
    if (isLoading) {
      show(els.loadingPanel);
      hide(els.weatherCard);
      hide(els.errorPanel);
      els.searchBtn.disabled = true;
      els.searchBtn.textContent = "Searching…";
    } else {
      hide(els.loadingPanel);
      els.searchBtn.disabled = false;
      els.searchBtn.textContent = "Search";
    }
  }

  // ---------- Renderers ----------
  function renderChips() {
    els.chips.innerHTML = "";
    config.POPULAR_CITIES.forEach(function (city) {
      var chip = document.createElement("button");
      chip.type = "button";
      chip.className = "city-chip";
      chip.textContent = city;
      chip.dataset.city = city;
      chip.setAttribute("aria-pressed", "false");
      chip.addEventListener("click", function () {
        els.input.value = city; // FR-03.3 sync search input
        loadWeather(city);
      });
      els.chips.appendChild(chip);
    });
  }

  function markSelectedChip(city) {
    var wanted = normalize(city);
    Array.prototype.forEach.call(els.chips.children, function (chip) {
      var isSelected = normalize(chip.dataset.city) === wanted;
      chip.classList.toggle("selected", isSelected);
      chip.setAttribute("aria-pressed", String(isSelected));
    });
  }

  function renderWeather(data) {
    var loc = data.location;
    var cur = data.current;

    els.locationName.textContent = loc.name;
    els.locationRegion.textContent =
      [loc.region, loc.country].filter(Boolean).join(", ") || "—";
    els.localTime.textContent = "Local time: " + (loc.localtime || "—");

    var iconUrl = "https:" + cur.condition.icon;
    els.conditionIcon.src = iconUrl;
    els.conditionIcon.alt = "Icon for " + cur.condition.text;

    els.tempC.textContent = Math.round(cur.temp_c) + "°C";
    els.conditionText.textContent = cur.condition.text;
    els.feelsLike.textContent = "Feels like " + Math.round(cur.feelslike_c) + "°C";

    var result = personality.classify({
      tempC: cur.temp_c,
      conditionCode: cur.condition.code,
      conditionText: cur.condition.text,
      windKph: cur.wind_kph,
      uv: cur.uv,
      isDay: cur.is_day
    });
    els.personalityTitle.textContent = result.title;
    els.personalityDesc.textContent = result.description;
    els.personality.dataset.personality = result.title;

    els.humidity.textContent = cur.humidity;
    els.windKph.textContent = cur.wind_kph;
    els.uvIndex.textContent = cur.uv;

    els.cloud.textContent = (cur.cloud || 0) + "%";
    els.visibility.textContent = (cur.vis_km != null ? cur.vis_km : "—") + " km";
    els.pressure.textContent = (cur.pressure_mb != null ? cur.pressure_mb : "—") + " mb";
    els.windMpS.textContent = (cur.wind_kph / 3.6).toFixed(1) + " m/s";
    els.tempF.textContent = Math.round(cur.temp_f) + "°F";
    els.lastUpdated.textContent = cur.last_updated || "—";

    renderJson();
    show(els.weatherCard);
  }

  function renderJson() {
    if (!state.weather) {
      els.jsonOutput.textContent = "No data yet. Weather will appear here after the first API response.";
      return;
    }
    if (state.jsonView === "raw") {
      els.jsonOutput.textContent = state.rawJson;
    } else {
      els.jsonOutput.textContent = JSON.stringify(state.weather, null, 2);
    }
  }

  function renderError(err) {
    var titles = {
      validation: "Empty search",
      cityNotFound: "City not found",
      apiKey: "API configuration error",
      rateLimit: "Temporary service error",
      network: "Network unavailable",
      server: "Service unavailable",
      unexpected: "Unexpected error"
    };

    els.errorTitle.textContent = titles[err.kind] || "Something went wrong";
    els.errorMessage.textContent = err.message;
    show(els.errorPanel);
    hide(els.weatherCard);
    hide(els.loadingPanel);
    announce(els.errorTitle.textContent + ". " + err.message);
  }

  // ---------- Data flow ----------
  function loadWeather(city) {
    var query = String(city || "").trim();

    // FR-02.4: empty input must not trigger an API request.
    if (!query) {
      renderError(api.ApiError("validation", "Please enter a city name before searching."));
      return;
    }

    // FR-08: cancel any in-flight request so stale responses can never
    // overwrite newer search results.
    state.requestSeq += 1;
    if (state.abortController) state.abortController.abort();
    state.abortController = new AbortController();

    var seq = state.requestSeq;
    state.selectedCity = query;
    els.input.value = query; // FR: input retains the searched city
    markSelectedChip(query);
    setLoading(true);
    announce("Fetching weather for " + query);

    api.fetchCurrentWeather(query, state.abortController.signal)
      .then(function (result) {
        if (seq !== state.requestSeq) return; // stale — ignore
        state.weather = result.data;
        state.rawJson = result.raw;
        state.selectedCity = result.data.location.name;
        els.input.value = result.data.location.name;
        markSelectedChip(result.data.location.name);
        setLoading(false);
        renderWeather(result.data);
        announce("Weather updated for " + result.data.location.name);
      })
      .catch(function (err) {
        if (seq !== state.requestSeq) return; // superseded — ignore
        if (err && err.name === "AbortError") return;
        setLoading(false);
        renderError(err);
      });
  }

  // ---------- Events ----------
  els.form.addEventListener("submit", function (event) {
    event.preventDefault(); // never reload the page
    loadWeather(els.input.value);
  });

  els.retryBtn.addEventListener("click", function () {
    loadWeather(state.selectedCity || config.DEFAULT_CITY);
  });

  els.tabFormatted.addEventListener("click", function () {
    state.jsonView = "formatted";
    els.tabFormatted.classList.add("active");
    els.tabFormatted.setAttribute("aria-selected", "true");
    els.tabRaw.classList.remove("active");
    els.tabRaw.setAttribute("aria-selected", "false");
    renderJson();
  });

  els.tabRaw.addEventListener("click", function () {
    state.jsonView = "raw";
    els.tabRaw.classList.add("active");
    els.tabRaw.setAttribute("aria-selected", "true");
    els.tabFormatted.classList.remove("active");
    els.tabFormatted.setAttribute("aria-selected", "false");
    renderJson();
  });

  els.copyBtn.addEventListener("click", function () {
    var text = els.jsonOutput.textContent || "";
    function done() {
      els.copyBtn.textContent = "Copied!";
      setTimeout(function () { els.copyBtn.textContent = "Copy"; }, 1500);
    }
    if (global.navigator.clipboard && global.navigator.clipboard.writeText) {
      global.navigator.clipboard.writeText(text).then(done).catch(function () {
        legacyCopy(text); done();
      });
    } else {
      legacyCopy(text); done();
    }
  });

  function legacyCopy(text) {
    var ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand("copy"); } catch (e) { /* noop */ }
    document.body.removeChild(ta);
  }

  // ---------- Init (FR-01) ----------
  renderChips();
  els.input.value = config.DEFAULT_CITY;
  loadWeather(config.DEFAULT_CITY);
})(window);
