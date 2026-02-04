# Lifting Companion

A minimal offline-capable web app for tracking workouts.

## Features

- **Lifting**: Log sets, reps, weight with effort indicators (🟢 easy, 🟡 medium, 🔴 hard)
- **Cardio**: Track running (with elevation), spinning, and rowing
- **History**: View all workouts organized by day
- **Trends**: See graphs of total weight lifted and distance traveled
- **Insights**: Get suggestions to increase weight based on easy effort patterns
- **Offline**: Works completely offline using service workers and local storage

## Usage

1. Open `index.html` in a web browser
2. For offline use, serve via HTTP (required for service workers):
  ```bash
  python3 -m http.server 8000
