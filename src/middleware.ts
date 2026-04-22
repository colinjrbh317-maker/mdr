import { defineMiddleware } from "astro:middleware";

export const onRequest = defineMiddleware(async ({ url, redirect, request }, next) => {
  // Redirect WordPress search and post ID query params
  if (url.searchParams.has('s') || url.searchParams.has('p')) {
    return redirect('/', 301);
  }

  const response = await next();

  // For landing pages, set a geo cookie from Vercel edge headers so the
  // client-side location swap can personalize the headline without a flash.
  if (url.pathname.startsWith("/lp/")) {
    const city = request.headers.get("x-vercel-ip-city");
    if (city) {
      const decoded = decodeURIComponent(city);
      const safe = decoded.replace(/[^a-zA-Z .'-]/g, "").trim().slice(0, 40);
      if (safe) {
        response.headers.append(
          "Set-Cookie",
          `mdr_geo_city=${encodeURIComponent(safe)}; Path=/; Max-Age=3600; SameSite=Lax`
        );
      }
    }
  }

  return response;
});
