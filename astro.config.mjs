import { defineConfig } from "astro/config";
import sanity from "@sanity/astro";
import react from "@astrojs/react";
import vercel from "@astrojs/vercel";
import tailwindcss from "@tailwindcss/vite";
import sitemap from "@astrojs/sitemap";

export default defineConfig({
  site: "https://moderndayroof.com",
  adapter: vercel({
    isr: {
      expiration: 60,
    },
  }),
  integrations: [
    sitemap({
      filter: (page) => !page.includes("/lp/"),
    }),
    sanity({
      projectId: "2rj2jdb4",
      dataset: "production",
      useCdn: false,
      studioBasePath: "/studio",
    }),
    react(),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});
