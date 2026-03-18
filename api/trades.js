import { Client } from "@notionhq/client";

const notion = new Client({
  auth: process.env.NOTION_TOKEN,
});

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    if (!process.env.NOTION_TOKEN) {
      return res.status(500).json({ error: "NOTION_TOKEN manquant" });
    }

    if (!process.env.NOTION_DATABASE_ID) {
      return res.status(500).json({ error: "NOTION_DATABASE_ID manquant" });
    }

    const response = await notion.databases.query({
      database_id: process.env.NOTION_DATABASE_ID,
    });

    const trades = response.results.map((page) => {
      const p = page.properties;

      return {
        id: page.id,

        date: p["Date"]?.date?.start ?? null,
        pair: p["Pair"]?.select?.name ?? null,
        resultatTp1: p["Résultat TP 1"]?.select?.name ?? null,
        heureDst: p["Heure DST"]?.select?.name ?? null,
        order: p["Order"]?.select?.name ?? null,
        obstaclesH4: p["Obstacles H4"]?.select?.name ?? null,
        m15TypeDetail: p["M15 type détail"]?.select?.name ?? null,
        obstaclesM15: p["Obstacles M15"]?.select?.name ?? null,
        rrMaxAtteint: p["RR max atteint"]?.select?.name ?? null,
        rrTp1: p["RR TP 1"]?.select?.name ?? null,
        rrTpMinus27: p["RR TP -27"]?.select?.name ?? null,
        rrTrailing: p["RR Trailing"]?.select?.name ?? null,
        beManagement: p["BE Management"]?.multi_select?.map((item) => item.name) ?? [],
      };
    });

    return res.status(200).json({
      success: true,
      count: trades.length,
      trades,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}
