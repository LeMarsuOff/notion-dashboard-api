import { Client } from "@notionhq/client";

const notion = new Client({ 
  auth: process.env.NOTION_TOKEN,
  notionVersion: "2025-09-03"
});

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  try {
    const db = await notion.databases.retrieve({
      database_id: process.env.NOTION_DATABASE_ID,
    });
    return res.status(200).json({
      has_data_sources: !!db.data_sources,
      data_sources_count: db.data_sources?.length ?? 0,
      data_sources: db.data_sources ?? null,
      object: db.object,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message, code: error.code });
  }
}
