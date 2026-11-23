# Smart Energy Management System

Interactive results site for the IoT + ML smart energy project (solar PV, 1.2 kWh battery, utility grid, LSTM forecasting).

Built with Next.js 15 (static export), React 19, Tailwind CSS 4, Motion and Recharts.

## Run locally

```bash
npm install
npm run dev        # http://localhost:3000
```

## Build

```bash
npm run build      # static site in ./out
```

## Deploy on Render

1. Push this folder to a GitHub repository.
2. On Render: New > Blueprint, pick the repository. `render.yaml` creates a free static site.
   (Or New > Static Site with build command `npm ci && npm run build` and publish directory `out`.)

## Data

- `src/data/hourly.json`: 744 hourly readings (simulated month), with energy-flow columns derived from `smart_meter_clean.csv`.
- `src/data/lstm.json`: test-set predictions from the three LSTM models trained in the Colab notebook.
- `public/data/smart_meter_clean.csv`: the dataset, downloadable from the site footer.

Names on the page: edit `TEAM` and `GUIDE` at the top of `src/components/Dashboard.tsx`.
