# Coast Commuter Map, web version

Interactive map of rent, household income and train time along Rodalies R2 Sud, 2015 to 2024. A Galeano Works study.

Built with React, Vite and MapLibre GL. The map data is in `public/data/` (GeoJSON exported from `work/coast_joined.gpkg`).

- `npm install` once, then `npm run dev` to preview locally
- `npm run build` writes the publishable site to `dist/`

The build uses relative paths, so `dist/` works from any folder, for example galeanoworks.com/maps/coast-commuter/.
