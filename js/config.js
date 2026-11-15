/**
 * SKY CRED — configuration.
 *
 * The WeatherAPI key is injected here from the project .env file.
 * NOTE (PRD NFR — Security): a frontend-only API key is NOT a secure secret;
 * it is publicly visible in the browser and must never be treated as one.
 * WeatherAPI free-tier keys are designed for client-side use.
 */
window.SKYCRED_CONFIG = {
  WEATHER_API_KEY: "bb611f2d0bb8497886d85545261411",
  WEATHER_API_BASE: "https://api.weatherapi.com/v1",
  DEFAULT_CITY: "Mumbai",
  POPULAR_CITIES: [
    "Mumbai",
    "Delhi",
    "Bengaluru",
    "Hyderabad",
    "Chennai",
    "Kolkata",
    "Pune",
    "Ahmedabad",
    "New York",
    "London"
  ]
};
