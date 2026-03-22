import { defineConfig } from "astro/config";
import sanity from "@sanity/astro";
import react from "@astrojs/react";
import vercel from "@astrojs/vercel";
import tailwindcss from "@tailwindcss/vite";
import sitemap from "@astrojs/sitemap";

export default defineConfig({
  site: "https://moderndayroof.com",
  adapter: vercel(),
  integrations: [
    sitemap(),
    sanity({
      projectId: "cy8sc3xd",
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
