// pages/api/image-proxy.js
export default async function handler(req, res) {
  const { url } = req.query;
  try {
    const response = await fetch(url);
    const buffer = await response.arrayBuffer();
    res.setHeader("Content-Type", response.headers.get("content-type"));
    res.setHeader("Cache-Control", "s-maxage=86400");
    res.send(Buffer.from(buffer));
  } catch (e) {
    //res.status(500).json({ error: "Error al cargar imagen" });
  }
}
