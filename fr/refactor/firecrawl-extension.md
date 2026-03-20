---
summary: "Conception pour une extension Firecrawl optionnelle qui ajoute de la valeur de recherche/extraction sans câbler Firecrawl dans les valeurs par défaut du cœur"
read_when:
  - Conception du travail d'intégration Firecrawl
  - Évaluation des interfaces de plugin web_search/web_fetch
  - Décider si Firecrawl appartient au cœur ou en tant qu'extension
title: "Conception de l'extension Firecrawl"
---

# Conception de l'extension Firecrawl

## Objectif

Livrer Firecrawl en tant qu'**extension optionnelle** qui ajoute :

- des outils Firecrawl explicites pour les agents,
- une intégration `web_search` optionnelle basée sur Firecrawl,
- le support de l'auto-hébergement,
- des paramètres de sécurité plus robustes que le chemin de repli actuel du cœur,

sans imposer Firecrawl dans la configuration par défaut ou le parcours d'onboarding.

## Pourquoi cette forme

Les problèmes/PR récents sur Firecrawl se regroupent en trois catégories :

1. **Dérive de version/de schéma**
   - Plusieurs versions ont rejeté `tools.web.fetch.firecrawl` alors que la documentation et le code d'exécution le prenaient en charge.
2. **Renforcement de la sécurité**
   - Le `fetchFirecrawlContent()` actuel envoie toujours des requêtes au point de terminaison Firecrawl avec des `fetch()` brutes, alors que le chemin principal de web-fetch utilise la garde SSRF.
3. **Pression produit**
   - Les utilisateurs veulent des flux de recherche/extraction natifs Firecrawl, surtout pour les configurations auto-hébergées/privées.
   - Les mainteneurs ont explicitement rejeté le câblage profond de Firecrawl dans les valeurs par défaut du cœur, le flux de configuration et le comportement du navigateur.

Cette combinaison plaide pour une extension, et non pour plus de logique spécifique à Firecrawl dans le chemin par défaut du cœur.

## Principes de conception

- **Optionnel, limité au fournisseur** : pas d'activation automatique, pas de détournement de la configuration, pas d'élargissement du profil d'outil par défaut.
- **L'extension possède la configuration spécifique à Firecrawl** : préférer la configuration du plugin plutôt que d'étendre `tools.web.*` encore une fois.
- **Utile dès le premier jour** : fonctionne même si les interfaces `web_search` / `web_fetch` du cœur restent inchangées.
- **Sécurité avant tout** : les récupérations de points de terminaison utilisent la même posture réseau gardée que les autres outils web.
- **Adapté à l'auto-hébergement** : configuration + repli env, URL de base explicite, aucune hypothèse hébergée uniquement.

## Extension proposée

ID de plugin : `firecrawl`

### Capacités MVP

Enregistrer les outils explicites :

- `firecrawl_search`
- `firecrawl_scrape`

Optionnel plus tard :

- `firecrawl_crawl`
- `firecrawl_map`

N'ajoutez **pas** l'automatisation du navigateur Firecrawl dans la première version. C'était la partie de la PR #32543 qui a trop intégré Firecrawl dans le comportement du cœur et a soulevé le plus de préoccupations de maintenance.

## Structure de la configuration

Utiliser une configuration portée par le plugin :

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

Pour la première version, l'extension peut également **lire** la configuration existante du cœur à `tools.web.fetch.firecrawl.*` comme source de secours pour que les utilisateurs existants n'aient pas besoin de migrer immédiatement.

Le chemin d'écriture reste local au plugin. Ne continuez pas à étendre les surfaces de configuration de cœur Firecrawl.

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
  - optionnel `content`
- Enveloppe le contenu du résultat en tant que contenu externe non approuvé
- La clé de cache inclut la requête + les paramètres de fournisseur pertinents

Pourquoi un outil explicite d'abord :

- Fonctionne aujourd'hui sans changer `tools.web.search.provider`
- Évite les contraintes actuelles de schéma/chargeur
- Donne aux utilisateurs la valeur de Firecrawl immédiatement

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
- Renvoie le markdown/le texte plus les métadonnées :
  - `title`
  - `finalUrl`
  - `status`
  - `warning`
- Enveloppe le contenu extrait de la même manière que `web_fetch`
- Partage la sémantique de cache avec les attentes de l'outil web lorsque cela est pratique

Pourquoi un outil de scraping explicite :

- Contourne le bug de commande `Readability -> Firecrawl -> basic HTML cleanup` non résolu dans le `web_fetch` central
- Donne aux utilisateurs un chemin déterministe « toujours utiliser Firecrawl » pour les sites lourds en JS protégés par des bots

## Ce que l'extension ne doit pas faire

- Pas d'ajout automatique de `browser`, `web_search`, ou `web_fetch` à `tools.alsoAllow`
- Pas d'étape d'onboarding par défaut dans `openclaw setup`
- Aucun cycle de vie de session de navigateur spécifique à Firecrawl dans le cœur
- Aucun changement à la sémantique de repli `web_fetch` intégrée dans le MVP de l'extension

## Plan de phase

### Phase 1 : extension uniquement, aucune modification du schéma central

Mettre en œuvre :

- `extensions/firecrawl/`
- schéma de configuration du plugin
- `firecrawl_search`
- `firecrawl_scrape`
- tests pour la résolution de configuration, la sélection du point de terminaison, la mise en cache, la gestion des erreurs et l'utilisation du garde SSRF

Cette phase suffit pour apporter une véritable valeur à l'utilisateur.

### Phase 2 : intégration facultative du fournisseur `web_search`

Prendre en charge `tools.web.search.provider = "firecrawl"` uniquement après avoir corrigé deux contraintes centrales :

1. `src/plugins/web-search-providers.ts` doit charger les plugins de fournisseurs de recherche web configurés/installés au lieu d'une liste groupée en dur.
2. `src/config/types.tools.ts` et `src/config/zod-schema.agent-runtime.ts` doivent cesser de coder en dur l'énumération des fournisseurs d'une manière qui bloque les identifiants enregistrés par les plugins.

Forme recommandée :

- garder les fournisseurs intégrés documentés,
- autoriser tout identifiant de fournisseur de plugin enregistré lors de l'exécution,
- valider la configuration spécifique au fournisseur via le plugin du fournisseur ou un sac générique de fournisseur.

### Phase 3 : jointure de fournisseur `web_fetch` facultative

Faites cela uniquement si les mainteneurs veulent que les backends de récupération spécifiques aux fournisseurs participent à `web_fetch`.

Ajout central nécessaire :

- `registerWebFetchProvider` ou jointure équivalente de backend de récupération

Sans cette jointure, l'extension doit conserver `firecrawl_scrape` comme un outil explicite plutôt que d'essayer de corriger le `web_fetch` intégré.

## Exigences de sécurité

L'extension doit traiter Firecrawl comme un **point de terminaison configuré par l'opérateur de confiance**, mais renforcer nonetheless le transport :

- Utilisez une récupération (fetch) protégée par SSRF pour l'appel au point de terminaison Firecrawl, et non un `fetch()` brut
- Préservez la compatibilité auto-hébergée/réseau privé en utilisant la même stratégie de point de terminaison trusted-web-tools qu'ailleurs
- Ne jamais journaliser la clé API
- Garder la résolution du point de terminaison/URL de base explicite et prévisible
- Traitez le contenu renvoyé par Firecrawl comme un contenu externe non approuvé

Cela reflète l'intention derrière les PR de durcissement SSRF sans supposer que Firecrawl est une surface multi-locataire hostile.

## Pourquoi pas une compétence (skill)

Le dépôt a déjà fermé une PR de compétence Firecrawl au profit de la distribution via ClawHub. Cela convient aux workflows d'invite installés par l'utilisateur en option, mais cela ne résout pas :

- la disponibilité déterministe des outils,
- la gestion de la configuration/des identifiants de niveau fournisseur,
- la prise en charge des points de terminaison auto-hébergés,
- la mise en cache,
- des sorties typées stables,
- l'examen de sécurité du comportement réseau.

Ceci doit être une extension, et non une compétence basée uniquement sur une invite.

## Critères de succès

- Les utilisateurs peuvent installer/activer une seule extension et obtenir une recherche/extraction Firecrawl fiable sans toucher aux valeurs par défaut du noyau.
- Firecrawl auto-hébergé fonctionne avec un repli de configuration/env.
- Les récupérations (fetches) des points de terminaison de l'extension utilisent un réseau protégé.
- Aucun nouveau comportement d'intégration/défaut spécifique à Firecrawl dans le noyau.
- Le noyau peut plus tard adopter des interfaces (seams) `web_search` / `web_fetch` natives aux plugins sans redessiner l'extension.

## Ordre d'implémentation recommandé

1. Construire `firecrawl_scrape`
2. Construire `firecrawl_search`
3. Ajouter de la documentation et des exemples
4. Si souhaité, généraliser le chargement du fournisseur `web_search` afin que l'extension puisse prendre en charge `web_search`
5. Ensuite seulement, envisager une véritable interface (seam) de fournisseur `web_fetch`

import fr from "/components/footer/fr.mdx";

<fr />
