// Public brand for the Vercel storefront, no backend database needed.
export default function handler(req, res) {
  res.setHeader("Cache-Control", "public, max-age=60");
  res.status(200).json({
    name: "MsopAPI",
    slug: "msopapi",
    siteUrl: "https://msopapi.vercel.app",
    apiBaseUrl: "https://msopapi.vercel.app/v1",
    apiOrigin: "https://msopapi.vercel.app",
    contactEmail: "info@msopapi.vercel.app"
  });
}
