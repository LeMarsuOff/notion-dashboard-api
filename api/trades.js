import { Client } from "@notionhq/client";

const notion = new Client({
  auth: process.env.NOTION_TOKEN,
});

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");

  try {
    const response = await notion.databases.query({
      database_id: process.env.NOTION_DATABASE_ID,
    });

    const trades = response.results.map((page) => {
      const p = page.properties;

      return {
        id: page.id,

        // 🟦 DATE
        date: p["Date"]?.date?.start ?? null,

        // 🟩 SELECT / TEXT
        typeTrade: p["Type de trade"]?.select?.name ?? null,
        pair: p["Pair"]?.select?.name ?? null,
        resultatTp1: p["Résultat TP 1"]?.select?.name ?? null,
        heureDst: p["Heure DST"]?.select?.name ?? null,
        order: p["Order"]?.select?.name ?? null,

        structureH4: p["Structure H4"]?.select?.name ?? null,
        obstaclesH4: p["Obstacles H4"]?.select?.name ?? null,

        m15TypeDetail: p["M15 Type Détail"]?.select?.name ?? null,
        structureM15: p["Structure M15"]?.select?.name ?? null,
        obstaclesM15: p["Obstacles M15"]?.select?.name ?? null,
        avantageM15: p["Avantage M15"]?.select?.name ?? null,

        arriveePE: p["Arrivée au PE"]?.select?.name ?? null,

        // 🟣 MULTI SELECT
        beManagement:
          p["BE Management"]?.multi_select?.map((x) => x.name) ?? [],

        // 🟡 NUMBERS
        rrMax: p["RR max atteint"]?.number ?? null,
        rrTrailing: p["RR Trailing"]?.number ?? null,
        rrTp1: p["RR TP 1"]?.number ?? null,
        rrTpMinus27: p["RR TP -27"]?.number ?? null,
        rrReel: p["RR Réel"]?.number ?? null,
        commissions: p["Commissions"]?.number ?? null,

        rrTpH4_071: p["RR TP H4 0.71"]?.number ?? null,
        rrTpH4_0: p["RR TP H4 0"]?.number ?? null,
        rrTpH4_27: p["RR TP H4 -27"]?.number ?? null,

        // 🟠 CHECKBOX
        tpAtteints: p["TP atteints"]?.checkbox ?? false,
        badFeeling: p["Bad feeling"]?.checkbox ?? false,
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
