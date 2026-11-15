# SKY CRED ☁️

> Check the sky's credit score before you step out.

A lightweight weather application that lets users search any city, view its
current conditions, and understand what they mean through simple, contextual
recommendations. Built with vanilla HTML, CSS and JavaScript per the PRD —
no frameworks, no backend, no mock data.

## Features

- **Live weather (FR-01 / FR-10)** — fetches Mumbai's weather automatically on
  launch via [WeatherAPI.com](https://www.weatherapi.com/) `/v1/current.json`.
- **City search (FR-02)** — search by button or <kbd>Enter</kbd>; empty input is
  blocked; the input retains the searched city.
- **Popular cities (FR-03)** — clickable chips for Mumbai, Delhi, Bengaluru,
  Hyderabad, Chennai, Kolkata, Pune, Ahmedabad, New York and London with a
  selected-state highlight, synced with the search box.
- **Weather card (FR-04)** — temperature in °C, wind in km/h, condition icon
  matching the API condition, local time in the city's timezone. All values are
  dynamically populated — nothing is hardcoded.
- **Weather personality (FR-05)** — rule-based interpretation with defined
  thresholds and priority order:
  | Priority | Rule | Personality |
  |---|---|---|
  | 1 | rain / drizzle / thunder | Rain Check |
  | 2 | snow or temp ≤ 10 °C | Freeze Frame |
  | 3 | temp ≥ 35 °C or UV ≥ 8 | Sun Alert |
  | 4 | wind ≥ 35 km/h | Breezy Mode |
  | 5 | temp 18–32 °C | Perfect Day |
  | 6 | anything else | Perfect Day |
- **Metrics (FR-06)** — primary cards for Humidity (%), Wind (km/h), UV index,
  plus cloud coverage, visibility, pressure, wind speed, °F and last-updated.
- **JSON viewer (FR-07)** — Formatted / Raw tabs with copy-to-clipboard.
- **Error handling (FR-08)** — distinct states for empty input, city not found,
  invalid API key, rate limit, offline, server unavailable and unexpected
  responses — each with a Retry action. Stale responses can never overwrite
  newer results (request sequence + abort).
- **Responsive (FR-09)** — desktop, laptop, tablet and mobile layouts with no
  horizontal overflow.
- **Accessible** — keyboard navigation, ARIA labels, live-region announcements,
  reduced-motion support.

## Getting started

1. Copy `.env.example` to `.env` and add your WeatherAPI.com key:
   ```
   WEATHER_API_KEY=your_key
   ```
2. The key is injected into `js/config.js` (a frontend-only key is **not** a
   secure secret — see the PRD's security note).
3. Open `index.html` in a browser, or serve statically:
   ```
   npx serve .
   ```

## Deploy (Vercel)

The project deploys as a static site. Push to GitHub and import the repo at
[vercel.com/new](https://vercel.com/new), or deploy via the Vercel API.

## Project structure

```
credsky/
├── index.html          # markup for all UI states
├── css/styles.css      # styles + responsive breakpoints
├── js/
│   ├── config.js       # API key, endpoints, popular cities
│   ├── api.js          # WeatherAPI client + error mapping
│   ├── personality.js  # weather interpretation engine (FR-05)
│   └── app.js          # state machine + DOM rendering
├── vercel.json         # static hosting config + security headers
└── .env.example        # environment variable template
```

## Data attribution

Weather data by [WeatherAPI.com](https://www.weatherapi.com/).
