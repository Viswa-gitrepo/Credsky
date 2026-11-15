/**
 * SKY CRED — WeatherAPI client (FR-10, FR-08).
 *
 * Wraps https://api.weatherapi.com/v1/current.json and maps every
 * failure mode to a user-facing error kind:
 *
 *   validation   — empty/whitespace input (no API call is made)
 *   cityNotFound — invalid or unknown city (HTTP 400 / code 1006)
 *   apiKey       — missing, invalid or disabled key (401 / 403)
 *   rateLimit    — quota exhausted (HTTP 429 / code 2009)
 *   network      — DNS / offline / connection failure
 *   server       — WeatherAPI unavailable (5xx)
 *   unexpected   — malformed or unrecognisable response
 *   aborted      — request superseded by a newer one (never shown to user)
 */
(function (global) {
  "use strict";

  var config = global.SKYCRED_CONFIG;

  function ApiError(kind, message, details) {
    var err = new Error(message);
    err.name = "ApiError";
    err.kind = kind;
    err.details = details || null;
    return err;
  }

  /**
   * Fetch current weather for a city.
   * @param {string} city        city name (required, non-empty)
   * @param {AbortSignal} [signal] optional abort signal
   * @returns {Promise<{data: object, raw: string}>} parsed JSON + raw text
   */
  function fetchCurrentWeather(city, signal) {
    var query = String(city == null ? "" : city).trim();

    if (!query) {
      return Promise.reject(ApiError("validation", "Please enter a city name."));
    }

    var url =
      config.WEATHER_API_BASE +
      "/current.json?key=" + encodeURIComponent(config.WEATHER_API_KEY) +
      "&q=" + encodeURIComponent(query);

    return fetch(url, { signal: signal, method: "GET" })
      .catch(function (err) {
        // fetch() rejects on network failure / offline / CORS.
        if (err && err.name === "AbortError") throw err;
        throw ApiError(
          "network",
          "You appear to be offline. Check your internet connection and try again.",
          err
        );
      })
      .then(function (response) {
        return response.text().then(function (raw) {
          var payload = null;
          try {
            payload = JSON.parse(raw);
          } catch (parseErr) {
            payload = null;
          }

          if (!response.ok) {
            throw mapHttpError(response.status, payload, raw);
          }

          if (!payload || !payload.location || !payload.current) {
            throw ApiError(
              "unexpected",
              "Received an unexpected response from the weather service.",
              raw
            );
          }

          return { data: payload, raw: raw };
        });
      });
  }

  function mapHttpError(status, payload, raw) {
    var apiCode = payload && payload.error && payload.error.code;
    var apiMessage = (payload && payload.error && payload.error.message) || "";

    switch (status) {
      case 400:
        // 1006: No matching location found.
        return ApiError("cityNotFound", "City not found. Please check the spelling and try again.", apiMessage);
      case 401:
      case 403:
        return ApiError("apiKey", "API configuration error. The weather service key is invalid or inactive.", apiMessage);
      case 429:
        return ApiError("rateLimit", "Too many requests. The weather service is rate-limiting us — please try again shortly.", apiMessage);
      default:
        if (status >= 500 && status < 600) {
          return ApiError("server", "The weather service is temporarily unavailable. Please try again.", apiMessage);
        }
        // Some WeatherAPI plan/quota errors arrive as 400 with special codes.
        if (apiCode === 2009) {
          return ApiError("rateLimit", "Too many requests. The weather service is rate-limiting us — please try again shortly.", apiMessage);
        }
        if (apiCode === 2007 || apiCode === 2008) {
          return ApiError("apiKey", "API configuration error. The weather service key is invalid or inactive.", apiMessage);
        }
        return ApiError("unexpected", "Received an unexpected response from the weather service.", raw);
    }
  }

  global.SKYCRED_API = {
    fetchCurrentWeather: fetchCurrentWeather,
    ApiError: ApiError
  };
})(window);
