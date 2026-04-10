import { Client } from "@notionhq/client";

const notion = new Client({
  auth: process.env.NOTION_TOKEN,
});

function getProperty(properties, name) {
  return properties?.[name];
}

function getFileUrl(properties, name) {
  const prop = getProperty(properties, name);
  if (!prop?.files || prop.files.length === 0) return null;
  const file = prop.files[0];
  if (file.type === "file")     return file.file.url;
  if (file.type === "external") return file.external.url;
  return null;
}

function setCORS(res) {
  res.setHeader("Access-Control-Allow-Origin",  "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Max-Age",       "86400");
}

// GET /api/image?id=PAGE_ID
// Retourne les 3 URLs d'images pour un trade. Appelé en lazy loading
// depuis le dashboard quand l'utilisateur clique sur 📷.
export default async function handler(req, res) {
  setCORS(res);

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET")
    return res.status(405).json({ success: false, error: "Method not allowed" });

  const { id } = req.query;
  if (!id)
    return res.status(400).json({ success: false, error: "Paramètre 'id' manquant" });

  try {
    if (!process.env.NOTION_TOKEN)
      return res.status(500).json({ success: false, error: "NOTION_TOKEN manquant" });

    // Un seul appel Notion → ~300-500ms
    const page = await notion.pages.retrieve({ page_id: id });
    const p    = page.properties;

    return res.status(200).json({
      success:  true,
      m15Image: getFileUrl(p, "M15 Before") || getFileUrl(p, "M15") || null,
      h4Before: getFileUrl(p, "H4 Before") || null,
      m15After: getFileUrl(p, "M15 After")  || null,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error:   error.message ?? "Erreur inconnue",
    });
  }
}
