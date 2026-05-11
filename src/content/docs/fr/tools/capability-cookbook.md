---
summary: "Guide du contributeur pour ajouter une nouvelle capacité partagée au système de plugins OpenClaw"
read_when:
  - Adding a new core capability and plugin registration surface
  - Deciding whether code belongs in core, a vendor plugin, or a feature plugin
  - Wiring a new runtime helper for channels or tools
title: "Ajout de capacités (guide du contributeur)"
sidebarTitle: "Ajout de capacités"
---

<Info>Ceci est un **guide du contributeur** pour les développeurs du cœur de OpenClaw. Si vous créez un plugin externe, consultez [Création de plugins](/fr/plugins/building-plugins) à la place.</Info>

Utilisez ceci lorsque OpenClaw a besoin d'un nouveau domaine tel que la génération d'images, la
génération vidéo, ou une future zone de fonctionnalités supportée par un fournisseur.

La règle :

- plugin = limite de propriété
- capacité = contrat central partagé

Cela signifie que vous ne devez pas commencer par connecter directement un fournisseur à un channel ou à un
tool. Commencez par définir la capacité.

## Quand créer une capacité

Créez une nouvelle capacité lorsque toutes les conditions suivantes sont remplies :

1. plus d'un fournisseur pourrait raisonnablement l'implémenter
2. les channels, tools, ou plugins de fonctionnalités devraient la consommer sans se soucier
   du fournisseur
3. le cœur doit posséder le comportement de repli, la stratégie, la configuration, ou la livraison

Si le travail est propre au fournisseur et qu'aucun contrat partagé n'existe encore, arrêtez-vous et définissez
le contrat d'abord.

## La séquence standard

1. Définissez le contrat central typé.
2. Ajoutez l'enregistrement de plugin pour ce contrat.
3. Ajoutez un assistant d'exécution (runtime helper) partagé.
4. Connectez un vrai plugin fournisseur comme preuve.
5. Déplacez les consommateurs de fonctionnalités/channels vers l'assistant d'exécution.
6. Ajoutez des tests de contrat.
7. Documentez la configuration orientée opérateur et le modèle de propriété.

## Quoi mettre où

Cœur (Core) :

- types requête/réponse
- registre + résolution de providers
- comportement de repli (fallback)
- schéma de configuration plus métadonnées de documentation propagées `title` / `description` sur les objets imbriqués, caractères génériques, éléments de tableau et nœuds de composition
- surface de l'assistant d'exécution

Plugin fournisseur :

- appels à l'API du fournisseur
- gestion de l'auth fournisseur
- normalisation des requêtes spécifiques au fournisseur
- enregistrement de l'implémentation de la capacité

Plugin de fonctionnalité/channel :

- appelle `api.runtime.*` ou l'assistant `plugin-sdk/*-runtime` correspondant
- n'appelle jamais directement une implémentation de fournisseur

## Points de jonction du fournisseur et du harnais

Utilisez les hooks de fournisseur lorsque le comportement appartient au contrat du fournisseur de modèle
plutôt qu'à la boucle générique de l'agent. Les exemples incluent les paramètres de requête
spécifiques au fournisseur après la sélection du transport, la préférence de profil d'auth, les superpositions de prompt (prompt overlays), et
le routage de repli de suivi après le basculement de modèle/profil.

Utilisez les crochets (hooks) du harnais d'agent lorsque le comportement appartient au runtime qui exécute un tour. Les harnais peuvent classer les résultats de tentative réussis mais inutilisables, tels que les réponses vides, raisonnement uniquement ou planification uniquement, afin que la politique de repli (fallback) du modèle externe puisse prendre la décision de nouvelle tentative.

Gardez les deux interfaces étroites :

- le cœur (core) possède la politique de retry/fallback
- les plugins de provider possèdent les indices de requête/d'auth/routage spécifiques au provider
- les plugins de harnais possèdent la classification des tentatives spécifique au runtime
- les plugins tiers renvoient des indices, pas des mutations directes de l'état du cœur

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
- un ou plusieurs packages de plugins groupés
- config/docs/tests

## Exemple : génération d'images

La génération d'images suit la forme standard :

1. le cœur définit `ImageGenerationProvider`
2. le cœur expose `registerImageGenerationProvider(...)`
3. le cœur expose `runtime.imageGeneration.generate(...)`
4. les plugins `openai`, `google`, `fal` et `minimax` enregistrent des implémentations soutenues par des fournisseurs
5. les fournisseurs futurs peuvent enregistrer le même contrat sans modifier les channels/tools

La clé de configuration est distincte du routage d'analyse de vision :

- `agents.defaults.imageModel` = analyser les images
- `agents.defaults.imageGenerationModel` = générer des images

Gardez-les séparés afin que le repli et la politique restent explicites.

## Liste de contrôle de révision

Avant de publier une nouvelle capacité, vérifiez :

- aucun channel/tool n'importe directement le code d'un fournisseur
- le helper d'exécution est le chemin partagé
- au moins un test de contrat affirme la propriété groupée
- la documentation de configuration nomme la nouvelle clé de modèle/config
- la documentation des plugins explique la limite de propriété

Si une PR ignore la couche de capacité et encode en dur le comportement du fournisseur dans un channel/tool, renvoyez-la et définissez d'abord le contrat.

## Connexes

- [Plugin](/fr/tools/plugin)
- [Création de compétences](/fr/tools/creating-skills)
- [Outils et plugins](/fr/tools)
