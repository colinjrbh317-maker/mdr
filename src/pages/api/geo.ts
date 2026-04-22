import type { APIRoute } from "astro";

export const prerender = false;

export const GET: APIRoute = ({ request }) => {
  const city = request.headers.get("x-vercel-ip-city") || "";
  const region = request.headers.get("x-vercel-ip-country-region") || "";
  const country = request.headers.get("x-vercel-ip-country") || "";

  const decoded = city ? decodeURIComponent(city) : "";
  const safeCity = decoded.replace(/[^a-zA-Z .'-]/g, "").trim().slice(0, 40);

  return new Response(
    JSON.stringify({ city: safeCity, region, country }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=300, s-maxage=300",
      },
    }
  );
};
