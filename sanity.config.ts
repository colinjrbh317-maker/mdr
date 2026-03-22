import { defineConfig } from "sanity";
import { structureTool } from "sanity/structure";
import { presentationTool } from "sanity/presentation";
import { schemaTypes } from "./src/sanity/schemaTypes";
import { structure } from "./src/sanity/structure";
import { resolve } from "./src/sanity/resolve";

export default defineConfig({
  name: "modern-day-roofing",
  title: "Modern Day Roofing",
  projectId: "cy8sc3xd",
  dataset: "production",
  plugins: [
    structureTool({ structure }),
    presentationTool({
      previewUrl: "http://localhost:4321",
      resolve,
    }),
  ],
  schema: {
    types: schemaTypes,
  },
});
