import { Client } from "@notionhq/client";

const notion = new Client({
  auth: process.env.NOTION_TOKEN,
});

function setCORS(res) {
  res.setHeader("Access-Control-Allow-Origin",  "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Max-Age",       "86400");
}

export default async function handler(req, res) {
  setCORS(res);

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).end();

  const { pageId } = req.query;

  if (!pageId) {
    return res.status(400).json({ error: "pageId manquant" });
  }

  try {
    // Re-fetch la page Notion pour obtenir une URL signée fraîche
    const page = await notion.pages.retrieve({ page_id: pageId });
    const prop = page.properties?.["M15"];

    if (!prop?.files || prop.files.length === 0) {
      return res.status(404).json({ error: "Pas d'image M15 pour ce trade" });
    }

    const file = prop.files[0];
    let imageUrl = null;

    if (file.type === "file")     imageUrl = file.file.url;
    if (file.type === "external") imageUrl = file.external.url;

    if (!imageUrl) {
      return res.status(404).json({ error: "URL image introuvable" });
    }

    // Fetch l'image et la streame au client
    const imageRes = await fetch(imageUrl);

    if (!imageRes.ok) {
      return res.status(502).json({ error: "Impossible de fetcher l'image depuis Notion" });
    }

    const contentType = imageRes.headers.get("content-type") || "image/png";
    res.setHeader("Content-Type", contentType);
    // Cache 50 minutes (URLs Notion expirent à 60 min)
    res.setHeader("Cache-Control", "public, max-age=3000");

    const buffer = await imageRes.arrayBuffer();
    res.status(200).send(Buffer.from(buffer));

  } catch (error) {
    return res.status(500).json({ error: error.message ?? "Erreur inconnue" });
  }
}
