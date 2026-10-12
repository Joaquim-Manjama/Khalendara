# Frontend deployment

Set `VITE_BACKEND_URL` in your frontend hosting provider's build environment:

```env
VITE_BACKEND_URL=https://api.example.com
```

All authentication, user, and event requests use this base URL. A trailing slash is optional. Include any API base path if your deployment uses one, for example `https://example.com/api`.

For local development, copy `.env.example` to `.env.local`. Leave the value empty to keep using the Vite proxy to `http://localhost:8080`. You can also set an explicit backend URL to test cross-origin requests.

Vite embeds this value at build time. Restart the development server after changing an env file; rebuild and redeploy to change a production URL. `VITE_` variables are public browser configuration, so never put secrets in them.

Build with `npm run build` and publish `dist`. Configure your static host to serve `index.html` for app routes such as `/home` and `/login`, while leaving assets and any proxied API routes alone. Vite's development/preview proxies are not included in the built files.

For a separate frontend/backend origin, the backend must allow the frontend origin through credentialed CORS. API requests keep `credentials: 'include'`. Use HTTPS and compatible cookie settings; `SameSite=Lax` does not support cross-site fetch authentication between unrelated domains. For the simplest cookie setup, serve the API under the frontend origin using a reverse proxy.

# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])

```

You can also install [eslint-plugin-react-x](https://npmx.dev/package/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://npmx.dev/package/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])

```
