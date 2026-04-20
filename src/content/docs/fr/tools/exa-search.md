---
summary: "Recherche Exa AI -- recherche neurale et par mots-clés avec extraction de contenu"
read_when:
  - You want to use Exa for web_search
  - You need an EXA_API_KEY
  - You want neural search or content extraction
title: "Recherche Exa"
---

# Recherche Exa

OpenClaw prend en charge [Exa AI](https://exa.ai/) en tant que fournisseur `web_search`. Exa
offre des modes de recherche neurale, par mots-clés et hybride avec une extraction
de contenu intégrée (highlights, text, résumés).

## Obtenir une clé API

<Steps>
  <Step title="Créer un compte">
    Inscrivez-vous sur [exa.ai](https://exa.ai/) et générez une clé API à partir de votre
    tableau de bord.
  </Step>
  <Step title="Stocker la clé">
    Définissez `EXA_API_KEY` dans l'environnement Gateway, ou configurez via :

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

**Alternative d'environnement :** définissez `EXA_API_KEY` dans l'environnement Gateway.
Pour une installation de passerelle, placez-la dans `~/.openclaw/.env`.

## Paramètres de l'outil

| Paramètre     | Description                                                                          |
| ------------- | ------------------------------------------------------------------------------------ |
| `query`       | Requête de recherche (requis)                                                        |
| `count`       | Résultats à renvoyer (1-100)                                                         |
| `type`        | Mode de recherche : `auto`, `neural`, `fast`, `deep`, `deep-reasoning`, ou `instant` |
| `freshness`   | Filtre temporel : `day`, `week`, `month`, ou `year`                                  |
| `date_after`  | Résultats après cette date (YYYY-MM-DD)                                              |
| `date_before` | Résultats avant cette date (YYYY-MM-DD)                                              |
| `contents`    | Options d'extraction de contenu (voir ci-dessous)                                    |

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

| Option Contenu | Type                                                                  | Description                          |
| -------------- | --------------------------------------------------------------------- | ------------------------------------ |
| `text`         | `boolean \| { maxCharacters }`                                        | Extraire le texte complet de la page |
| `highlights`   | `boolean \| { maxCharacters, query, numSentences, highlightsPerUrl }` | Extraire les phrases clés            |
| `summary`      | `boolean \| { query }`                                                | Résumé généré par l'IA               |

### Modes de recherche

| Mode             | Description                               |
| ---------------- | ----------------------------------------- |
| `auto`           | Exa choisit le meilleur mode (par défaut) |
| `neural`         | Recherche sémantique basée sur le sens    |
| `fast`           | Recherche rapide par mots-clés            |
| `deep`           | Recherche approfondie complète            |
| `deep-reasoning` | Recherche approfondie avec raisonnement   |
| `instant`        | Résultats les plus rapides                |

## Notes

- Si aucune option `contents` n'est fournie, Exa utilise par défaut `{ highlights: true }`
  afin que les résultats incluent des extraits de phrases clés
- Les résultats préservent les champs `highlightScores` et `summary` de la réponse de l'API Exa
  lorsque disponibles
- Les descriptions des résultats sont résolues d'abord à partir des highlight, puis du résumé, puis
  du texte complet — selon ce qui est disponible
- `freshness` et `date_after`/`date_before` ne peuvent pas être combinés — utilisez un seul
  mode de filtre temporel
- Jusqu'à 100 résultats peuvent être renvoyés par requête (sous réserve des limites
  du type de recherche Exa)
- Les résultats sont mis en cache pendant 15 minutes par défaut (configurable via
  `cacheTtlMinutes`)
- Exa est une intégration officielle de l'API avec des réponses JSON structurées

## Connexes

- [Aperçu de la recherche Web](/fr/tools/web) -- tous les fournisseurs et détection automatique
- [Recherche Brave](/fr/tools/brave-search) -- résultats structurés avec filtres de pays/langue
- [Recherche Perplexity](/fr/tools/perplexity-search) -- résultats structurés avec filtrage par domaine
