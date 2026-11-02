// Public links for the Vercel storefront, no backend database needed.
export default function handler(req, res) {
  res.status(200).json({ telegram: "", x: "", telegramSupport: "" });
}
