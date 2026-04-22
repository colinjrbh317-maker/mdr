import { defineMiddleware } from "astro:middleware";

export const onRequest = defineMiddleware(async ({ url, redirect }, next) => {
  // Redirect WordPress search and post ID query params
  if (url.searchParams.has('s') || url.searchParams.has('p')) {
    return redirect('/', 301);
  }
  return next();
});
