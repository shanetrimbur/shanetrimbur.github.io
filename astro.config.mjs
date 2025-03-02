import { defineConfig } from "astro/config";
import tailwind from "@astrojs/tailwind";

// https://astro.build/config
export default defineConfig({
  site: 'https://shanetrimbur.github.io',
  base: '/',
  integrations: [tailwind()],
  server: {
    host: '0.0.0.0',
    port: 4321
  }
});
