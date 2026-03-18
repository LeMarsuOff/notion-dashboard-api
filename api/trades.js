import { Client } from "@notionhq/client";

const notion = new Client({
  auth: process.env.NOTION_TOKEN,
});

// =========================
// Helpers
// =========================

function getProperty(properties, name) {
  return properties?.[name];
}

function getDate(properties, name) {
  const prop = getProperty(properties, name);
  return prop?.date?.start ?? null;
}

function getNumber(properties, name) {
  const prop = getProperty(properties, name);
  return prop?.number ?? null;
}

function getCheckbox(properties, name) {
  const prop = getProperty(properties, name);
  return prop?.checkbox ?? false;
}

function getSelectLike(properties, name) {
  const prop = getProperty(properties, name);

  // select
  if (prop?.select?.name) return prop.select.name;

  // status
  if (prop?.status?.name) return prop.status.name;

  // rich_text
  if (prop?.rich_text?.[0]?.plain_text) return prop.rich_text[0].plain_text;

  // title
  if (prop?.title?.[0]?.plain_text) return prop.title[0].plain_text;

  // formula string
  if (prop?.formula?.type === "string") return prop.formula.string ?? null;

  // formula number convertie en string si besoin
  if (prop?.formula?.type === "number" && prop.formula.number != null) {
    return String(prop.formula.number);
  }

  return null;
}

function getMultiSelect(properties, name) {
  const prop = getProperty(properties, name);
  if (!prop?.multi_select) return [];
  return prop.multi_select.map((item) => item.name);
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "GET") {
    return res.status(405).json({
      success: false,
      error: "Method not allowed",
    });
  }

  try {
    if (!process.env.NOTION_TOKEN) {
      return res.status(500).json({
        success: false,
        error: "NOTION_TOKEN manquant",
      });
    }

    if (!process.env.NOTION_DATABASE_ID) {
      return res.status(500).json({
        success: false,
        error: "NOTION_DATABASE_ID manquant",
      });
    }

    const allResults = [];
    let hasMore = true;
    let startCursor = undefined;

    while (hasMore) {
      const response = await notion.databases.query({
        database_id: process.env.NOTION_DATABASE_ID,
        start_cursor: startCursor,
        page_size: 100,
      });

      allResults.push(...response.results);
      hasMore = response.has_more;
      startCursor = response.next_cursor ?? undefined;
    }

    const trades = allResults.map((page) => {
      const p = page.properties;

      return {
        id: page.id,

        // =========================
        // Propriétés principales
        // =========================
        typeDeTrade: getSelectLike(p, "Type de trade"),
        pair: getSelectLike(p, "Pair"),
        resultatTp1: getSelectLike(p, "Résultat TP 1"),
        tpAtteints: getCheckbox(p, "TP atteints"),
        date: getDate(p, "Date"),
        heureDst: getSelectLike(p, "Heure DST"),
        min: getSelectLike(p, "Min"),
        order: getSelectLike(p, "Order"),

        // =========================
        // Bloc H4
        // =========================
        structureH4: getSelectLike(p, "Structure H4"),
        obstaclesH4: getSelectLike(p, "Obstacles H4"),

        // =========================
        // Bloc M15
        // =========================
        m15TypeDetail: getSelectLike(p, "M15 Type Détail"),
        structureM15: getSelectLike(p, "Structure M15"),
        obstaclesM15: getSelectLike(p, "Obstacles M15"),
        avantageM15: getSelectLike(p, "Avantage M15"),
        arriveeAuPe: getSelectLike(p, "Arrivée au PE"),

        // =========================
        // BE / RR
        // =========================
        beManagement: getMultiSelect(p, "BE Management"),
        rrMaxAtteint: getNumber(p, "RR max atteint"),
        rrTrailing: getNumber(p, "RR Trailing"),
        rrTp1: getNumber(p, "RR TP 1"),
        rrTpMinus27: getNumber(p, "RR TP -27"),
        rrReel: getNumber(p, "RR Réel"),
        commissions: getNumber(p, "Commissions"),

        // =========================
        // Bloc RR H4
        // =========================
        rrTpH4_071: getNumber(p, "RR TP H4 0.71"),
        rrTpH4_0: getNumber(p, "RR TP H4 0"),
        rrTpH4_Minus27: getNumber(p, "RR TP H4 -27"),

        // =========================
        // Autres propriétés
        // =========================
        badFeeling: getCheckbox(p, "Bad feeling"),

        jour: getSelectLike(p, "Jour"),
        jourUtc: getSelectLike(p, "Jour UTC"),
        jourFormule: getSelectLike(p, "Jour Formule"),
        sessionFormule: getSelectLike(p, "Session Formule"),
        session: getSelectLike(p, "Session"),
        moisFormule: getSelectLike(p, "Mois Formule"),
        anneeFormule: getSelectLike(p, "Année Formule"),
        annee: getSelectLike(p, "Année"),
        mois: getSelectLike(p, "Mois"),

        obM15Tp1: getNumber(p, "OB M15 TP 1"),
        pourcentageRisque: getNumber(p, "% Risqué"),

        rrMaxAtteintOb: getNumber(p, "RR max atteint OB"),

        // ⚠️ À vérifier :
        // remplace "Résultat OB" par le vrai type si besoin.
        // Si c'est un select/status, getSelectLike fonctionnera.
        // Si c'est une checkbox, remplace la ligne par getCheckbox(p, "Résultat OB")
        resultatOb: getSelectLike(p, "Résultat OB"),


        confirmation: getSelectLike(p, "Confirmation / Continuation"),

        m15Type: getSelectLike(p, "M15 Type"),
        type: getSelectLike(p, "Type"),
        flip: getSelectLike(p, "Flip ?"),
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
      error: error.message ?? "Erreur inconnue",
    });
  }
}
