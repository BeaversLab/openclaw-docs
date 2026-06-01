---
summary: "Guide du contributeur pour l'ajout d'une nouvelle capacité partagée au système de plugins OpenClaw"
read_when:
  - Adding a new core capability and plugin registration surface
  - Deciding whether code belongs in core, a vendor plugin, or a feature plugin
  - Wiring a new runtime helper for channels or tools
title: "Ajout de capacités (guide du contributeur)"
sidebarTitle: "Ajout de capacités"
---

<Info>This is a **contributor guide** for OpenClaw core developers. If you are building an external plugin, see [Building plugins](/fr/plugins/building-plugins) instead. For the deep architecture reference (capability model, ownership, load pipeline, runtime helpers), see [Plugin internals](/fr/plugins/architecture).</Info>

Utilisez ceci lorsqu'OpenClaw a besoin d'un nouveau domaine partagé tel que les embeddings, la
génération d'images, la génération vidéo, ou une future zone de fonctionnalités supportée par un fournisseur.

La règle :

- **plugin** = limite de propriété
- **capacité** = contrat central partagé

Ne commencez pas par connecter directement un fournisseur à un canal ou à un outil. Commencez par définir la capacité.

## Quand créer une capacité

Créez une nouvelle capacité lorsque **tous** les éléments suivants sont vrais :

1. Plus d'un fournisseur pourrait raisonnablement l'implémenter.
2. Les canaux, les outils ou les plugins de fonctionnalités devraient la consommer sans se soucier du fournisseur.
3. Le cœur doit posséder le comportement de repli, la stratégie, la configuration ou la livraison.

Si le travail est spécifique à un fournisseur et qu'aucun contrat partagé n'existe encore, arrêtez-vous et définissez d'abord le contrat.

## La séquence standard

1. Définissez le contrat central typé.
2. Ajoutez l'enregistrement du plugin pour ce contrat.
3. Ajoutez un assistant d'exécution partagé.
4. Connectez un vrai plugin fournisseur comme preuve.
5. Déplacez les consommateurs de fonctionnalités/canaux vers l'assistant d'exécution.
6. Ajoutez des tests de contrat.
7. Documentez la configuration orientée opérateur et le modèle de propriété.

## Quoi mettre où

**Cœur :**

- Types de requête/réponse.
- Registre de fournisseurs + résolution.
- Comportement de repli.
- Schéma de configuration avec métadonnées de documentation `title` / `description` propagées sur les objets imbriqués, les caractères génériques, les éléments de tableau et les nœuds de composition.
- Surface de l'assistant d'exécution.

**Plugin fournisseur :**

- Appels à l'API du fournisseur.
- Gestion de l'authentification du fournisseur.
- Normalisation des requêtes spécifiques au fournisseur.
- Enregistrement de l'implémentation de la capacité.

**Plugin de fonctionnalité/canal :**

- Appelle `api.runtime.*` ou la fonction auxiliaire `plugin-sdk/*-runtime` correspondante.
- N'appelle jamais directement une implémentation fournisseur.

## Interfaces du fournisseur et du harnais

Utilisez les **hooks fournisseur** lorsque le comportement relève du contrat du provider de modèle plutôt que de la boucle générique de l'agent. Les exemples incluent les paramètres de requête spécifiques au fournisseur après la sélection du transport, la préférence de profil d'authentification, les superpositions de prompt (prompt overlays) et le routage de repli de suivi après le basculement de modèle/profil.

Utilisez les **hooks de harnais d'agent** lorsque le comportement relève de l'exécution d'un tour (runtime). Les harnais peuvent classer les résultats de tentative réussis mais inutilisables, tels que les réponses vides, uniquement raisonnées ou uniquement planifiées, afin que la politique de repli de modèle externe puisse prendre la décision de nouvelle tentative.

Gardez les deux interfaces étroites :

- Le cœur (Core) possède la politique de retry/fallback.
- Les plugins fournisseur possèdent les indices de requête/auth/routage spécifiques au fournisseur.
- Les plugins de harnais possèdent la classification des tentatives spécifique à l'exécution.
- Les plugins tiers retournent des indices, et non des mutations directes de l'état du cœur.

## Liste de contrôle des fichiers

Pour une nouvelle capacité, attendez-vous à toucher ces zones :

- `src/<capability>/types.ts`
- `src/<capability>/...registry/runtime.ts`
- `src/plugins/types.ts`
- `src/plugins/registry.ts`
- `src/plugins/captured-registration.ts`
- `src/plugins/contracts/registry.ts`
- `src/plugins/runtime/types-core.ts`
- `src/plugins/runtime/index.ts`
- `src/plugin-sdk/<capability>.ts`
- `src/plugin-sdk/<capability>-runtime.ts`
- Un ou plusieurs packages de plugins groupés.
- Config, docs, tests.

## Exemple pratique : génération d'images

La génération d'images suit la forme standard :

1. Le cœur définit `ImageGenerationProvider`.
2. Le cœur expose `registerImageGenerationProvider(...)`.
3. Le cœur expose `runtime.imageGeneration.generate(...)`.
4. Les plugins `openai`, `google`, `fal` et `minimax` enregistrent des implémentations soutenues par un fournisseur.
5. Les futurs fournisseurs enregistrent le même contrat sans modifier les canaux/outils.

La clé de configuration est intentionnellement séparée du routage d'analyse visuelle :

- `agents.defaults.imageModel` analyse les images.
- `agents.defaults.imageGenerationModel` génère des images.

Gardez-les séparés afin que le repli et la politique restent explicites.

## Fournisseurs d'embeddings

Utilisez `embeddingProviders` pour les fournisseurs d'embeddings vectoriels réutilisables. Ce contrat
est volontairement plus large que la mémoire : les outils, la recherche, la récupération, les importateurs, ou
les plugins de fonctionnalités futurs peuvent consommer des embeddings sans dépendre du moteur
de mémoire.

Memory search can consume generic `embeddingProviders`. The older
`memoryEmbeddingProviders` contract is deprecated compatibility while existing
memory-specific providers migrate; new reusable embedding providers should use
`embeddingProviders`.

## Liste de vérification pour la révision

Avant de publier une nouvelle capacité, vérifiez :

- Aucun channel/tool n'importe directement de code fournisseur.
- L'assistant d'exécution est le chemin partagé.
- Au moins un test de contrat affirme la propriété groupée.
- La documentation de configuration nomme la nouvelle clé de model/config.
- La documentation des plugins explique la limite de propriété.

Si une PR ignore la couche de capacité et encode en dur le comportement du fournisseur dans un channel/tool, renvoyez-la et définissez d'abord le contrat.

## Connexes

- [Plugin internals](/fr/plugins/architecture) — capability model, ownership, load pipeline, runtime helpers.
- [Building plugins](/fr/plugins/building-plugins) — first-plugin tutorial.
- [SDK overview](/fr/plugins/sdk-overview) — import map and registration API reference.
- [Creating skills](/fr/tools/creating-skills) — companion contributor surface.
