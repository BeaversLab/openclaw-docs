---
summary: "Outils de recherche et d'extraction Tavily"
read_when:
  - You want Tavily-backed web search
  - You need a Tavily API key
  - You want Tavily as a web_search provider
  - You want content extraction from URLs
title: "Tavily"
---

[Tavily](https://tavily.com) est une API de recherche conçue pour les applications dIA. OpenClaw lexpose de deux manières :

- en tant que provider `web_search` pour l'outil de recherche générique
- en tant qu'outils de plugin explicites : `tavily_search` et `tavily_extract`

Tavily renvoie des résultats structurés optimisés pour la consommation par LLM, avec une profondeur de recherche configurable, un filtrage par sujet et par domaine, des résumés de réponses générés par l'IA, et une extraction de contenu à partir d'URL (y compris les pages rendues en JavaScript).

| Propriété      | Valeur                                |
| -------------- | ------------------------------------- |
| ID du plugin   | `tavily`                              |
| Auth           | `TAVILY_API_KEY` ou config `apiKey`   |
| URL de base    | `https://api.tavily.com` (par défaut) |
| Outils groupés | `tavily_search`, `tavily_extract`     |

## Getting started

<Steps>
  <Step title="Obtenir une clé API">
    Créez un compte Tavily sur [tavily.com](https://tavily.com), puis générez une clé API dans le tableau de bord.
  </Step>
  <Step title="Configurer le plugin et le provider">
    ```json5
    {
      plugins: {
        entries: {
          tavily: {
            enabled: true,
            config: {
              webSearch: {
                apiKey: "tvly-...", // optional if TAVILY_API_KEY is set
                baseUrl: "https://api.tavily.com",
              },
            },
          },
        },
      },
      tools: {
        web: {
          search: {
            provider: "tavily",
          },
        },
      },
    }
    ```
  </Step>
  <Step title="Vérifier les exécutions de recherche">
    Déclenchez une `web_search` depuis n'importe quel agent, ou appelez `tavily_search` directement.
  </Step>
</Steps>

<Tip>Choisir Tavily lors de l'intégration (onboarding) ou `openclaw configure --section web` active automatiquement le plugin Tavily inclus.</Tip>

## Référence de l'outil

### `tavily_search`

Utilisez ceci lorsque vous souhaitez des contrôles de recherche spécifiques à Tavily au lieu de `web_search` générique.

| Paramètre         | Type               | Contraintes / par défaut                  | Description                                                     |
| ----------------- | ------------------ | ----------------------------------------- | --------------------------------------------------------------- |
| `query`           | string             | requis                                    | Chaîne de requête de recherche. Ne dépassez pas 400 caractères. |
| `search_depth`    | énumération        | `basic` (par défaut), `advanced`          | `advanced` est plus lent mais plus pertinent.                   |
| `topic`           | enum               | `general` (par défaut), `news`, `finance` | Filtrer par famille de sujets.                                  |
| `max_results`     | entier             | 1-20                                      | Nombre de résultats.                                            |
| `include_answer`  | booléen            | default `false`                           | Inclure un résumé de réponse généré par l'IA de Tavily.         |
| `time_range`      | enum               | `day`, `week`, `month`, `year`            | Filtrer les résultats par récence.                              |
| `include_domains` | tableau de chaînes | (aucun)                                   | Inclure uniquement les résultats de ces domaines.               |
| `exclude_domains` | tableau de chaînes | (aucun)                                   | Exclure les résultats de ces domaines.                          |

Compromis sur la profondeur de recherche :

| Profondeur | Vitesse     | Pertinence    | Idéal pour                                        |
| ---------- | ----------- | ------------- | ------------------------------------------------- |
| `basic`    | Plus rapide | Élevé         | Requêtes à usage général (par défaut).            |
| `advanced` | Plus lent   | Le plus élevé | Recherche de précision et vérification des faits. |

### `tavily_extract`

Utilisez ceci pour extraire du contenu propre d'une ou plusieurs URL. Prend en charge les pages rendues via JavaScript et prend en charge le découpage axé sur la requête pour une extraction ciblée.

| Paramètre           | Type               | Contraintes / défaut             | Description                                                                           |
| ------------------- | ------------------ | -------------------------------- | ------------------------------------------------------------------------------------- |
| `urls`              | tableau de chaînes | requis, 1-20                     | URLs à partir desquelles extraire du contenu.                                         |
| `query`             | string             | (facultatif)                     | Réorganiser les extraits extraits par pertinence pour cette requête.                  |
| `extract_depth`     | enum               | `basic` (par défaut), `advanced` | Utilisez `advanced` pour les pages lourdes en JS, les SPA ou les tableaux dynamiques. |
| `chunks_per_source` | entier             | 1-5 ; **nécessite `query`**      | Segments retournés par URL. Erreur si défini sans `query`.                            |
| `include_images`    | booléen            | par défaut `false`               | Inclure les URL d'image dans les résultats.                                           |

Compromis de profondeur d'extraction :

| Profondeur | Quand utiliser                                  |
| ---------- | ----------------------------------------------- |
| `basic`    | Pages simples. Essayez ceci d'abord.            |
| `advanced` | SPA rendus par JS, contenu dynamique, tableaux. |

<Tip>Regroupez des listes d'URL plus importantes en plusieurs appels `tavily_extract` (maximum 20 par requête). Utilisez `query` plus `chunks_per_source` pour obtenir uniquement le contenu pertinent au lieu des pages complètes.</Tip>

## Choisir le bon outil

| Besoin                                        | Outil            |
| --------------------------------------------- | ---------------- |
| Recherche Web rapide, pas d'options spéciales | `web_search`     |
| Recherche avec profondeur, sujet, réponses IA | `tavily_search`  |
| Extraire le contenu d'URL spécifiques         | `tavily_extract` |

<Note>The generic `web_search` tool with Tavily as provider supports `query` and `count` (up to 20 results). For Tavily-specific controls (`search_depth`, `topic`, `include_answer`, domain filters, time range), use `tavily_search` instead.</Note>

## Configuration avancée

<AccordionGroup>
  <Accordion title="APIOrdre de résolution de la clé API"API>
    Le client Tavily recherche sa clé API dans cet ordre :

    1. `plugins.entries.tavily.config.webSearch.apiKey` (résolu via SecretRefs).
    2. `TAVILY_API_KEY` depuis l'environnement de la passerelle.

    `tavily_extract` génère une erreur de configuration si aucun n'est présent.

  </Accordion>

<Accordion title="URL de base personnalisée">Remplacez `plugins.entries.tavily.config.webSearch.baseUrl` si vous placez Tavily derrière un proxy. La valeur par défaut est `https://api.tavily.com`.</Accordion>

  <Accordion title="`chunks_per_source` nécessite `query`">
    `tavily_extract` rejette les appels qui passent `chunks_per_source` sans `query`. Tavily classe les extraits par pertinence de la requête, le paramètre est donc sans signification sans cette dernière.
  </Accordion>
</AccordionGroup>

## Connexes

<CardGroup cols={2}>
  <Card title="Vue d'ensemble de la recherche Web" href="/fr/tools/web" icon="magnifying-glass">
    Tous les fournisseurs et règles de détection automatique.
  </Card>
  <Card title="FirecrawlFirecrawl" href="/fr/tools/firecrawl" icon="fire">
    Recherche plus scraping avec extraction de contenu.
  </Card>
  <Card title="Exa Search" href="/fr/tools/exa-search" icon="binoculars">
    Recherche neuronale avec extraction de contenu.
  </Card>
  <Card title="Configuration" href="/fr/gateway/configuration" icon="gear">
    Schéma de configuration complet pour les entrées de plugin et le routage des tools.
  </Card>
</CardGroup>
