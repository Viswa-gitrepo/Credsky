/**
 * SKY CRED — weather personality engine (FR-05).
 *
 * Translates raw weather conditions into a simple, understandable
 * recommendation using temperature, condition and wind speed.
 *
 * Rules are evaluated in a strict PRIORITY ORDER so overlapping
 * conditions always resolve deterministically:
 *   1. Rain / drizzle / thunderstorms  -> Rain Check
 *   2. Snow or very cold temperatures  -> Freeze Frame
 *   3. Very hot temperature / high UV  -> Sun Alert
 *   4. Strong winds                    -> Breezy Mode
 *   5. Pleasant band                   -> Perfect Day
 *   6. Anything else                   -> Perfect Day (mild default)
 */
(function (global) {
  "use strict";

  var THRESHOLDS = {
    FREEZE_MAX_C: 10,   // at or below -> very cold
    SUN_MIN_C: 35,      // at or above -> very hot
    SUN_UV_MIN: 8,      // at or above -> very high UV
    WIND_MAX_KPH: 35,   // at or above -> strong winds
    PERFECT_MIN_C: 18,  // pleasant band
    PERFECT_MAX_C: 32
  };

  var PERSONALITIES = {
    "Rain Check": {
      title: "Rain Check",
      description: "Carry an umbrella before stepping out."
    },
    "Freeze Frame": {
      title: "Freeze Frame",
      description: "Bone-chilling cold. Bundle up tight."
    },
    "Sun Alert": {
      title: "Sun Alert",
      description: "Stay hydrated and avoid excessive sun exposure."
    },
    "Breezy Mode": {
      title: "Breezy Mode",
      description: "Expect strong winds. Dress accordingly."
    },
    "Perfect Day": {
      title: "Perfect Day",
      description: "Great weather to step outside."
    }
  };

  // WeatherAPI condition codes that indicate rain / drizzle / thunder.
  var RAIN_CODES = [
    1063, // patchy rain possible
    1072, // patchy sleet possible
    1150, 1153, 1168, 1174, // drizzle
    1180, 1183, 1186, 1189, 1192, 1195, 1198, 1201, // rain
    1240, 1243, 1246, // showers
    1273, 1276, 1279, 1282 // thunder
  ];

  // Condition codes that indicate snow / ice (treated as very cold).
  var SNOW_CODES = [
    1066, 1069, // patchy snow / sleet
    1114, 1117, // blowing snow / blizzard
    1204, 1207, 1210, 1213, 1216, 1219, 1222, 1225,
    1237, 1249, 1252, 1255, 1258, 1261, 1264,
    1279, 1282
  ];

  function matchesCodes(code, list) {
    return list.indexOf(code) !== -1;
  }

  // Exposed for the animated background scene selection (app.js).
  function isRainy(code, text) {
    return matchesCodes(code, RAIN_CODES) ||
      /rain|drizzle|shower|thunder|sleet/i.test(text || "");
  }

  function isSnowy(code, text) {
    return matchesCodes(code, SNOW_CODES) ||
      /snow|blizzard|ice|freez/i.test(text || "");
  }

  function classify(input) {
    var tempC = input.tempC;
    var code = input.conditionCode;
    var windKph = input.windKph;
    var uv = input.uv;
    var text = (input.conditionText || "").toLowerCase();

    var rainy = isRainy(code, text);
    var snowy = isSnowy(code, text);

    // 1. Rain beats everything.
    if (rainy) return PERSONALITIES["Rain Check"];

    // 2. Snow / very cold.
    if (snowy || tempC <= THRESHOLDS.FREEZE_MAX_C) {
      return PERSONALITIES["Freeze Frame"];
    }

    // 3. Very hot or very high UV.
    if (tempC >= THRESHOLDS.SUN_MIN_C || uv >= THRESHOLDS.SUN_UV_MIN) {
      return PERSONALITIES["Sun Alert"];
    }

    // 4. Strong winds.
    if (windKph >= THRESHOLDS.WIND_MAX_KPH) {
      return PERSONALITIES["Breezy Mode"];
    }

    // 5. Pleasant band.
    if (tempC >= THRESHOLDS.PERFECT_MIN_C && tempC <= THRESHOLDS.PERFECT_MAX_C) {
      return PERSONALITIES["Perfect Day"];
    }

    // 6. Mild default.
    return PERSONALITIES["Perfect Day"];
  }

  global.SKYCRED_PERSONALITY = {
    THRESHOLDS: THRESHOLDS,
    PERSONALITIES: PERSONALITIES,
    classify: classify,
    isRainy: isRainy,
    isSnowy: isSnowy
  };
})(window);
