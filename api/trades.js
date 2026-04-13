import { Client } from "@notionhq/client";

const notion = new Client({ auth: process.env.NOTION_TOKEN });

function getProperty(properties, name) { return properties?.[name]; }
function getDate(properties, name) { const prop = getProperty(properties, name); return prop?.date?.start ?? null; }
function getNumber(properties, name) { const prop = getProperty(properties, name); return prop?.number ?? null; }
function getCheckbox(properties, name) { const prop = getProperty(properties, name); return prop?.checkbox ?? false; }
function getSelectLike(properties, name) {
  const prop = getProperty(properties, name);
  if (prop?.select?.name) return prop.select.name;
  if (prop?.status?.name) return prop.status.name;
  if (prop?.rich_text?.[0]?.plain_text) return prop.rich_text[0].plain_text;
  if (prop?.title?.[0]?.plain_text) return prop.title[0].plain_text;
  if (prop?.formula?.type === "string") return prop.formula.string ?? null;
  if (prop?.formula?.type === "number" && prop.formula.number != null) return String(prop.formula.number);
  return null;
}
function getMultiSelect(properties, name) {
  const prop = getProperty(properties, name);
  if (!prop?.multi_select) return [];
  return prop.multi_select.map((item) => item.name);
}
function getFileUrl(properties, name) {
  const prop = getProperty(properties, name);
  if (!prop?.files || prop.files.length === 0) return null;
  const file = prop.files[0];
  if (file.type === "file") return file.file.url;
  if (file.type === "external") return file.external.url;
  return null;
}

function setCORS(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Max-Age", "86400");
}

export default async function handler(req, res) {
  setCORS(res);

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ success: false, error: "Method not allowed" });

  try {
    if (!process.env.NOTION_TOKEN) return res.status(500).json({ success: false, error: "NOTION_TOKEN manquant" });
    if (!process.env.NOTION_DATABASE_ID) return res.status(500).json({ success: false, error: "NOTION_DATABASE_ID manquant" });

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

        // ── Identification ──
        pair:              getSelectLike(p, "Pair"),          // "Pair" reste (colonne 43) — "Paire" est le titre affiché
        type:              getSelectLike(p, "Type"),
        positionType:      getSelectLike(p, "Position Type"), // ex "Type de trade"
        flip:              getSelectLike(p, "Flip ?"),
        tier:              getSelectLike(p, "Tier"),
        noTag:             getCheckbox(p,   "No-tag ?"),

        // ── Timing ──
        date:              getDate(p,       "Date"),
        heureDst:          getSelectLike(p, "--- DST---"),    // ex "Heure DST"
        heureUtc:          getSelectLike(p, "Heure UTC"),
        min:               getSelectLike(p, "Min"),
        timeUtc1:          getSelectLike(p, "Time (UTC +1)"),
        jour:              getSelectLike(p, "Jour"),
        jourUtc:           getSelectLike(p, "Jour UTC"),
        session:           getSelectLike(p, "Session"),
        sessionUtc:        getSelectLike(p, "Session UTC"),
        sessionUtcReco:    getSelectLike(p, "Session UTC (Recommandée)"),

        // ── Formules temporelles ──
        jourFormule:       getSelectLike(p, "Day Formula"),      // ex "Jour Formule"
        sessionFormule:    getSelectLike(p, "Session Formula"),   // ex "Session Formule"
        moisFormule:       getSelectLike(p, "Month Formula"),     // ex "Mois Formule"
        anneeFormule:      getSelectLike(p, "Year Formula"),      // ex "Année Formule"
        annee:             getSelectLike(p, "Year"),              // ex "Année"
        mois:              getSelectLike(p, "Month"),             // ex "Mois"

        // ── Setup H4 ──
        structureH4:       getSelectLike(p,  "H4 Structure"),     // ex "Structure H4"
        obstaclesH4:       getMultiSelect(p, "H4 Obstacles").length
                             ? getMultiSelect(p, "H4 Obstacles")
                             : getSelectLike(p, "H4 Obstacles"),  // ex "Obstacles H4"

        // ── Setup M15 ──
        m15Type:           getSelectLike(p,  "M15 Type"),
        m15TypeDetail:     getSelectLike(p,  "M15 Type Detailed"), // ex "M15 Type Détail"
        structureM15:      getSelectLike(p,  "M15 Structure "),    // espace en fin — respecte le nom Notion
        obstaclesM15:      getMultiSelect(p, "M15 Obstacles"),
        avantageM15:       getSelectLike(p,  "M15 Pros"),          // ex "Avantage M15"
        order:             getSelectLike(p,  "Order"),
        confirmation:      getSelectLike(p,  "Confirmation / Continunation"), // faute dans Notion conservée

        // ── Gestion du trade ──
        arriveeAuPe:       getSelectLike(p,  "Arrival to Entry"),  // ex "Arrivée au PE"
        beManagement:      getMultiSelect(p, "BE Management"),
        tp:                getSelectLike(p,  "TP"),
        risk:              getNumber(p,      "Risk"),
        pourcentageRisque: getNumber(p,      "% Risqué"),
        badFeeling:        getCheckbox(p,    "Bad feeling"),

        // ── Résultats ──
        positionResult:    getSelectLike(p, "Position Result"),    // ex "Résultat TP 1"
        resultatOb:        getSelectLike(p, "Résultat OB"),
        resultatMinus27:   getSelectLike(p, "Resultat -27"),
        resultatRr3:       getSelectLike(p, "Résultat RR 3"),

        // ── RR ──
        rrReel:            getNumber(p, "RR Réel"),
        rrTp1:             getNumber(p, "RR TP 1"),
        rrTpMinus27:       getNumber(p, "RR TP -27"),
        rrTp3:             getNumber(p, "RR TP 3"),
        rrTrailing:        getNumber(p, "RR Trailing"),
        rrMaxAtteint:      getNumber(p, "RR Max"),
        rrTpH4_071:        getNumber(p, "RR TP H4 0.71"),
        rrTpH4_0:          getNumber(p, "RR TP H4 0"),
        rrTpH4_Minus27:    getNumber(p, "RR TP H4 -27"),
        obM15Tp1:          getNumber(p, "OB M15 TP 1"),
        rrMaxAtteintOb:    getNumber(p, "RR max atteint OB"),

        // ── Scores ──
        scoreJour:         getNumber(p, "Score Jour"),
        scoreObstacles:    getNumber(p, "Score Obstacles"),
        scorePair:         getNumber(p, "Score Pair"),
        scoreSession:      getNumber(p, "Score Session"),
        scoreSetup:        getNumber(p, "Score Setup"),
        scoreTotal:        getNumber(p, "Score Total"),

        // ── Filtres ──
        filtresBase:       getSelectLike(p, "Filtres Base"),
        filtresGlobalsBe:  getSelectLike(p, "Filtres Globals BE"),
        filtresGlobalsSansBe: getSelectLike(p, "Filtres Globals Sans BE"),

        // ── Divers ──
        commissions:       getNumber(p,   "Commissions"),
        creationDate:      getDate(p,     "Creation Date"),
        notionUrl:         getSelectLike(p, "Notion URL"),

        // ── Screenshots ──
        m15Before:         getFileUrl(p, "M15 Before"),
        m15After:          getFileUrl(p, "M15 After"),
        h4Before:          getFileUrl(p, "H4 Before"),
        // Alias pour compatibilité dashboard existant
        m15Image:          getFileUrl(p, "M15 Before"),
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
