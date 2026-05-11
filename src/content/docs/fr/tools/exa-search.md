---
summary: "Recherche Exa AI -- recherche neurale et par mots-clés avec extraction de contenu"
read_when:
  - You want to use Exa for web_search
  - You need an EXA_API_KEY
  - You want neural search or content extraction
title: "Recherche Exa"
---

OpenClaw prend en charge [Exa AI](https://exa.ai/) en tant que `web_search` provider. Exa
offre des modes de recherche neurale, par mots-clés et hybride avec extraction de
contenu intégrée (surbrillances, texte, résumés).

## Obtenir une clé API

<Steps>
  <Step title="Créer un compte">
    Inscrivez-vous sur [exa.ai](https://exa.ai/) et générez une clé API depuis votre
    tableau de bord.
  </Step>
  <Step title="Stocker la clé">
    Définissez `EXA_API_KEY` dans l'environnement du Gateway ou configurez via :

    ```bash
    openclaw configure --section web
    ```

  </Step>
</Steps>

## Config

```json5
{
  plugins: {
    entries: {
      exa: {
        config: {
          webSearch: {
            apiKey: "exa-...", // optional if EXA_API_KEY is set
          },
        },
      },
    },
  },
  tools: {
    web: {
      search: {
        provider: "exa",
      },
    },
  },
}
```

**Alternative d'environnement :** définissez `EXA_API_KEY` dans l'environnement du Gateway.
Pour une installation de passerelle, placez-la dans `~/.openclaw/.env`.

## Paramètres de l'outil

<ParamField path="query" type="string" required>
  Requête de recherche.
</ParamField>

<ParamField path="count" type="number">
  Résultats à renvoyer (1–100).
</ParamField>

<ParamField path="type" type="'auto' | 'neural' | 'fast' | 'deep' | 'deep-reasoning' | 'instant'">
  Mode de recherche.
</ParamField>

<ParamField path="freshness" type="'day' | 'week' | 'month' | 'year'">
  Filtre de temps.
</ParamField>

<ParamField path="date_after" type="string">
  Résultats après cette date (`YYYY-MM-DD`).
</ParamField>

<ParamField path="date_before" type="string">
  Résultats avant cette date (`YYYY-MM-DD`).
</ParamField>

<ParamField path="contents" type="object">
  Options d'extraction de contenu (voir ci-dessous).
</ParamField>

### Extraction de contenu

Exa peut renvoyer du contenu extrait en plus des résultats de recherche. Passez un objet `contents`
pour activer :

```javascript
await web_search({
  query: "transformer architecture explained",
  type: "neural",
  contents: {
    text: true, // full page text
    highlights: { numSentences: 3 }, // key sentences
    summary: true, // AI summary
  },
});
```

| Option Contenus | Type                                                                  | Description                          |
| --------------- | --------------------------------------------------------------------- | ------------------------------------ |
| `text`          | `boolean \| { maxCharacters }`                                        | Extraire le texte complet de la page |
| `highlights`    | `boolean \| { maxCharacters, query, numSentences, highlightsPerUrl }` | Extraire les phrases clés            |
| `summary`       | `boolean \| { query }`                                                | Résumé généré par l'IA               |

### Modes de recherche

| Mode             | Description                               |
| ---------------- | ----------------------------------------- |
| `auto`           | Exa choisit le meilleur mode (par défaut) |
| `neural`         | Recherche sémantique basée sur le sens    |
| `fast`           | Recherche par mots-clés rapide            |
| `deep`           | Recherche approfondie exhaustive          |
| `deep-reasoning` | Recherche approfondie avec raisonnement   |
| `instant`        | Résultats les plus rapides                |

## Notes

- Si aucune option `contents` n'est fournie, Exa utilise par défaut `{ highlights: true }`
  afin que les résultats incluent des extraits de phrases clés
- Les résultats préservent les champs `highlightScores` et `summary` de la réponse de l'API Exa
  lorsqu'ils sont disponibles
- Les descriptions des résultats sont d'abord extraites des highlights, puis du résumé, puis
  du texte complet — selon ce qui est disponible
- `freshness` et `date_after`/`date_before` ne peuvent pas être combinés — utilisez un seul
  mode de filtrage temporel
- Jusqu'à 100 résultats peuvent être renvoyés par requête (sous réserve des limites
  de type de recherche Exa)
- Les résultats sont mis en cache pendant 15 minutes par défaut (configurable via
  `cacheTtlMinutes`)
- Exa est une intégration officielle de l'API avec des réponses JSON structurées

## Connexes

- [Aperçu de la recherche Web](/fr/tools/web) -- tous les fournisseurs et détection automatique
- [Recherche Brave](/fr/tools/brave-search) -- résultats structurés avec filtres de pays/langue
- [Recherche Perplexity](/fr/tools/perplexity-search) -- résultats structurés avec filtrage de domaine
