import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://example.com",
  build: {
    // The whole stylesheet is a few KB — inline it so there's no
    // render-blocking CSS request on the mobile in-app browser.
    inlineStylesheets: "always",
  },
});
