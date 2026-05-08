# gw2-fashion

A community fashion / wardrobe builder for **Guild Wars 2**. Plan outfits, mix
and match skins across races, genders and professions, and keep your looks
saved locally in your browser.

> Unofficial fan project. Not affiliated with ArenaNet or NCSOFT.

## Features

- Build outfits with armor, weapon and dye combinations
- Filter the armory by race, gender and profession
- Skin tooltips and chat-code copy
- Optional GW2 API key import to pull characters from your account
- Local-first storage (IndexedDB) — your data stays in your browser
- Image upload to attach screenshots to outfits

## Tech

- [SvelteKit](https://svelte.dev/) (Svelte 5, runes)
- [Tailwind CSS v4](https://tailwindcss.com/)
- [`adapter-static`](https://svelte.dev/docs/kit/adapter-static) — pure SPA, no server required
- [`idb-keyval`](https://github.com/jakearchibald/idb-keyval) for local persistence

## Develop

```sh
pnpm install
pnpm dev
```

## Build

```sh
pnpm build
```

The static SPA is emitted to `build/`. Any static host works (Cloudflare Pages,
GitHub Pages, Netlify, S3, …).

## License

[MIT](./LICENSE) — see the license file for the trademark notice regarding
Guild Wars 2.
