---
summary: "Conception pour une extension Firecrawl optionnelle qui ajoute de la valeur de recherche/extraction sans câbler Firecrawl en dur dans les valeurs par défaut du cœur"
read_when:
  - Designing Firecrawl integration work
  - Evaluating web_search/web_fetch plugin seams
  - Deciding whether Firecrawl belongs in core or as an extension
title: "Firecrawl Extension Design"
---

# Firecrawl Extension Design

## Goal

Ship Firecrawl as an **opt-in extension** that adds:

- explicit Firecrawl tools for agents,
- optional Firecrawl-backed `web_search` integration,
- self-hosted support,
- stronger security defaults than the current core fallback path,

without pushing Firecrawl into the default setup/onboarding path.

## Why this shape

Recent Firecrawl issues/PRs cluster into three buckets:

1. **Release/schema drift**
   - Several releases rejected `tools.web.fetch.firecrawl` even though docs and runtime code supported it.
2. **Security hardening**
   - Current `fetchFirecrawlContent()` still posts to the Firecrawl endpoint with raw `fetch()`, while the main web-fetch path uses the SSRF guard.
3. **Product pressure**
   - Users want Firecrawl-native search/scrape flows, especially for self-hosted/private setups.
   - Maintainers explicitly rejected wiring Firecrawl deeply into core defaults, setup flow, and browser behavior.

That combination argues for an extension, not more Firecrawl-specific logic in the default core path.

## Design principles

- **Opt-in, vendor-scoped**: no auto-enable, no setup hijack, no default tool-profile widening.
- **Extension owns Firecrawl-specific config**: prefer plugin config over growing `tools.web.*` again.
- **Useful on day one**: works even if core `web_search` / `web_fetch` seams stay unchanged.
- **Security-first**: endpoint fetches use the same guarded networking posture as other web tools.
- **Self-hosted-friendly**: config + env fallback, explicit base URL, no hosted-only assumptions.

## Proposed extension

Plugin id: `firecrawl`

### MVP capabilities

Register explicit tools:

- `firecrawl_search`
- `firecrawl_scrape`

Optional later:

- `firecrawl_crawl`
- `firecrawl_map`

Ne **pas** ajouter l'automatisation du navigateur Firecrawl dans la première version. C'était la partie de la PR #32543 qui a attiré Firecrawl trop profondément dans le comportement du cœur et a soulevé le plus de préoccupations de maintenance.

## Forme de la configuration

Utiliser une configuration de portée de plugin :

```json5
{
  plugins: {
    entries: {
      firecrawl: {
        enabled: true,
        config: {
          apiKey: "FIRECRAWL_API_KEY",
          baseUrl: "https://api.firecrawl.dev",
          timeoutSeconds: 60,
          maxAgeMs: 172800000,
          proxy: "auto",
          storeInCache: true,
          onlyMainContent: true,
          search: {
            enabled: true,
            defaultLimit: 5,
            sources: ["web"],
            categories: [],
            scrapeResults: false,
          },
          scrape: {
            formats: ["markdown"],
            fallbackForWebFetchLikeUse: false,
          },
        },
      },
    },
  },
}
```

### Résolution des informations d'identification

Priorité :

1. `plugins.entries.firecrawl.config.apiKey`
2. `FIRECRAWL_API_KEY`

Priorité de l'URL de base :

1. `plugins.entries.firecrawl.config.baseUrl`
2. `FIRECRAWL_BASE_URL`
3. `https://api.firecrawl.dev`

### Pont de compatibilité

Pour la première version, l'extension peut également **lire** la configuration du cœur existante à `tools.web.fetch.firecrawl.*` en tant que source de secours pour que les utilisateurs existants n'aient pas besoin de migrer immédiatement.

Le chemin d'écriture reste local au plugin. Ne continuez pas à étendre les surfaces de configuration du cœur Firecrawl.

## Conception de l'outil

### `firecrawl_search`

Entrées :

- `query`
- `limit`
- `sources`
- `categories`
- `scrapeResults`
- `timeoutSeconds`

Comportement :

- Appelle Firecrawl `v2/search`
- Renvoie des objets de résultat normalisés compatibles avec OpenClaw :
  - `title`
  - `url`
  - `snippet`
  - `source`
  - `content` optionnel
- Enveloppe le contenu du résultat en tant que contenu externe non fiable
- La clé de cache inclut la requête + les paramètres pertinents du provider

Pourquoi un outil explicite d'abord :

- Fonctionne aujourd'hui sans changer `tools.web.search.provider`
- Évite les contraintes actuelles de schéma/chargeur
- Donne aux utilisateurs la valeur Firecrawl immédiatement

### `firecrawl_scrape`

Entrées :

- `url`
- `formats`
- `onlyMainContent`
- `maxAgeMs`
- `proxy`
- `storeInCache`
- `timeoutSeconds`

Comportement :

- Appelle Firecrawl `v2/scrape`
- Renvoie le markdown/texte plus les métadonnées :
  - `title`
  - `finalUrl`
  - `status`
  - `warning`
- Enveloppe le contenu extrait de la même manière que `web_fetch`
- Partage la sémantique de cache avec les attentes de l'outil web lorsque cela est pratique

Pourquoi un outil de scraping explicite :

- Contourne le bogue de classement `Readability -> Firecrawl -> basic HTML cleanup` non résolu dans le `web_fetch` principal
- Offre aux utilisateurs un chemin déterministe « toujours utiliser Firecrawl » pour les sites lourds en JS ou protégés par des bots

## Ce que l'extension ne doit pas faire

- Pas d'ajout automatique de `browser`, `web_search` ou `web_fetch` à `tools.alsoAllow`
- Aucune étape d'onboarding par défaut dans `openclaw setup`
- Aucun cycle de vie de session de navigateur spécifique à Firecrawl dans le cœur
- Aucun changement de la sémantique de repli `web_fetch` intégrée dans le MVP de l'extension

## Plan de phase

### Phase 1 : extension uniquement, aucune modification du schéma principal

Implémenter :

- `extensions/firecrawl/`
- schéma de configuration du plugin
- `firecrawl_search`
- `firecrawl_scrape`
- tests pour la résolution de la configuration, la sélection du point de terminaison, la mise en cache, la gestion des erreurs et l'utilisation du garde SSRF

Cette phase suffit pour fournir une valeur réelle à l'utilisateur.

### Phase 2 : intégration facultative du provider `web_search`

Prendre en charge `tools.web.search.provider = "firecrawl"` uniquement après avoir corrigé deux contraintes principales :

1. `src/plugins/web-search-providers.ts` doit charger les plugins de provider de recherche web configurés/installés au lieu d'une liste groupée codée en dur.
2. `src/config/types.tools.ts` et `src/config/zod-schema.agent-runtime.ts` doivent cesser de coder en dur l'énumération des providers d'une manière qui bloque les ids enregistrés par les plugins.

Forme recommandée :

- garder les providers intégrés documentés,
- autoriser n'importe quel id de provider de plugin enregistré lors de l'exécution,
- valider la configuration spécifique au provider via le plugin du provider ou un sac de provider générique.

### Phase 3 : point de suture (seam) de provider `web_fetch` facultatif

Ne le faire que si les mainteneurs souhaitent que les backends de récupération spécifiques aux fournisseurs participent à `web_fetch`.

Ajout principal nécessaire :

- `registerWebFetchProvider` ou point de suture (seam) de backend de récupération équivalent

Sans ce point de suture (seam), l'extension doit garder `firecrawl_scrape` comme un outil explicite plutôt que d'essayer de patcher le `web_fetch` intégré.

## Exigences de sécurité

L'extension doit traiter Firecrawl comme un **point de terminaison configuré par l'opérateur de confiance**, mais durcir tout de même le transport :

- Utilisez une récupération (fetch) protégée par SSRF pour l'appel au point de terminaison Firecrawl, et non `fetch()` brut
- Préservez la compatibilité auto-hébergée/réseau privé en utilisant la même stratégie de point de terminaison trusted-web-tools utilisée ailleurs
- Ne jamais journaliser la clé API
- Gardez la résolution du point de terminaison/URL de base explicite et prévisible
- Traitez le contenu renvoyé par Firecrawl comme un contenu externe non fiable

Cela reflète l'intention derrière les PR de durcissement SSRF sans supposer que Firecrawl est une surface multi-locataire hostile.

## Pourquoi pas une compétence (skill)

Le dépôt a déjà clos une PR de compétence Firecrawl en faveur de la distribution ClawHub. Cela convient pour les workflows de prompts installés par l'utilisateur en option, mais cela ne résout pas :

- la disponibilité déterministe de l'outil,
- la gestion de la configuration/des identifiants de niveau fournisseur,
- la prise en charge des points de terminaison auto-hébergés,
- le cache,
- des sorties typées stables,
- l'examen de sécurité sur le comportement réseau.

Cela appartient à une extension, et non à une compétence basée uniquement sur un prompt.

## Critères de succès

- Les utilisateurs peuvent installer/activer une extension et obtenir une recherche/un scraping Firecrawl fiable sans toucher aux valeurs par défaut du cœur.
- Le Firecrawl auto-hébergé fonctionne avec un repli config/env.
- Les récupérations (fetchs) des points de terminaison de l'extension utilisent une mise en réseau gardée.
- Aucun nouveau comportement d'intégration/défaut central spécifique à Firecrawl.
- Le cœur peut ensuite adopter les interfaces (seams) `web_search` / `web_fetch` natives aux plugins sans redessiner l'extension.

## Ordre d'implémentation recommandé

1. Construire `firecrawl_scrape`
2. Construire `firecrawl_search`
3. Ajouter de la documentation et des exemples
4. Si souhaité, généralisez le chargement du fournisseur `web_search` afin que l'extension puisse prendre en charge `web_search`
5. Ensuite seulement, envisagez une vraie interface de fournisseur `web_fetch`

import fr from "/components/footer/fr.mdx";

<fr />
