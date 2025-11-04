# Product Poster Creator

Create polished 16:10 listing posters directly in the browser. The app never uploads assets to a backend—image selection, layout generation, and downloads all happen locally.

## Features

- **Drag-and-drop photo layout** with automatic placement and manual adjustments.
- **Structured form** for title, price, description, and location (with quick-pick areas for Dubai and Abu Dhabi).
- **Clipboard-ready exports**: downloading the poster also copies a formatted text summary.
- **Bilingual interface** supporting English and Portuguese.
- **Customizable look** powered by Tailwind CSS and shadcn/ui components.

## Getting Started

```bash
git clone https://github.com/imissapixel/product-poster-creator.git
cd product-poster-creator
npm install
npm run dev
```

Visit <http://localhost:5173> to use the app. Node.js ≥ 18 is recommended (install via [nvm](https://github.com/nvm-sh/nvm)).

### Available Scripts

| Command            | Description                             |
| ------------------ | --------------------------------------- |
| `npm run dev`      | Start the Vite development server.      |
| `npm run build`    | Produce an optimized production bundle. |
| `npm run preview`  | Preview the production build locally.   |
| `npm run lint`     | Run ESLint across the TypeScript code.  |

## Project Structure

```
src/
  components/       Reusable UI and feature components
  contexts/         React context providers (language, theme, reset)
  lib/              Utilities, constants, layout helpers
  pages/            Route-level components (React Router)
  assets/           Static assets (if required)
```

Key implementation details:

- **`ListingPreview`** renders the live poster preview.
- **`ImageGenerator`** mirrors the preview logic to create the downloadable JPEG.
- **`LanguageContext`** holds English and Portuguese translations; add strings here when introducing new UI text.

## Browser Support & Privacy

All processing is performed locally in the browser. Because no uploads occur, clearing the browser cache or closing the tab removes any data.

## Contributing

Pull requests are welcome. Please run `npm run lint` and `npm run build` before submitting changes.

## License

Distributed under the [MIT License](./LICENSE). See the license file for details.
