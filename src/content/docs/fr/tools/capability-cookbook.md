---
summary: "Guide du contributeur pour ajouter une nouvelle capacité partagée au système de plugins OpenClaw"
read_when:
  - Adding a new core capability and plugin registration surface
  - Deciding whether code belongs in core, a vendor plugin, or a feature plugin
  - Wiring a new runtime helper for channels or tools
title: "Ajout de capacités (Guide du contributeur)"
sidebarTitle: "Ajout de capacités"
---

# Ajout de capacités

<Info>Ceci est un **guide pour les contributeurs** destiné aux développeurs du cœur d'OpenClaw. Si vous créez un plugin externe, consultez plutôt [Création de plugins](/en/plugins/building-plugins) .</Info>

Utilisez ceci lorsque OpenClaw a besoin d'un nouveau domaine tel que la génération d'images,
la génération de vidéos, ou une future zone fonctionnalité supportée par un fournisseur.

La règle :

- plugin = limite de propriété
- capacité = contrat partagé du cœur

Cela signifie que vous ne devriez pas commencer par connecter directement un fournisseur à un channel ou un tool.
Commencez par définir la capacité.

## Quand créer une capacité

Créez une nouvelle capacité lorsque toutes ces conditions sont vraies :

1. plus d'un fournisseur pourrait plausiblement l'implémenter
2. les channels, tools, ou plugins de fonctionnalité devraient la consommer sans se soucier
   du fournisseur
3. le cœur doit posséder le comportement de repli, la politique, la configuration ou le comportement de livraison

Si le travail est propre au fournisseur et qu'aucun contrat partagé n'existe encore, arrêtez-vous et définissez
le contrat d'abord.

## La séquence standard

1. Définissez le contrat typé du cœur.
2. Ajoutez l'enregistrement de plugin pour ce contrat.
3. Ajoutez un assistant d'exécution (runtime helper) partagé.
4. Connectez un vrai plugin fournisseur comme preuve.
5. Déplacez les consommateurs de fonctionnalités/channels vers l'assistant d'exécution.
6. Ajoutez des tests de contrat.
7. Documentez la configuration orientée opérateur et le modèle de propriété.

## Quoi mettre où

Cœur (Core) :

- types de requête/réponse
- registre de providers + résolution
- comportement de repli (fallback)
- schéma de configuration plus métadonnées de documentation `title` / `description` propagées sur les nœuds d'objet imbriqué, de caractère générique, d'élément de tableau et de composition
- interface de l'assistant d'exécution

Plugin fournisseur :

- appels à l'API du fournisseur
- gestion de l'authentification fournisseur
- normalisation des requêtes spécifiques au fournisseur
- enregistrement de l'implémentation de la capacité

Plugin de fonctionnalité/channel :

- appelle `api.runtime.*` ou le helper `plugin-sdk/*-runtime` correspondant
- n'appelle jamais directement une implémentation de fournisseur

## Liste de fichiers

Pour une nouvelle capacité, prévoyez de toucher ces zones :

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

La génération d'images suit la structure standard :

1. le cœur définit `ImageGenerationProvider`
2. le cœur expose `registerImageGenerationProvider(...)`
3. le cœur expose `runtime.imageGeneration.generate(...)`
4. les plugins `openai`, `google`, `fal` et `minimax` enregistrent des implémentations prises en charge par les fournisseurs
5. les futurs fournisseurs peuvent enregistrer le même contrat sans modifier les channels/tools

La clé de configuration est distincte du routage de l'analyse d'image :

- `agents.defaults.imageModel` = analyser les images
- `agents.defaults.imageGenerationModel` = générer les images

Gardez-les séparés afin que la repli et la politique restent explicites.

## Liste de vérification de la révision

Avant de publier une nouvelle capacité, vérifiez :

- aucun channel/tool n'importe directement le code du fournisseur
- le helper d'exécution est le chemin partagé
- au moins un test de contrat affirme la propriété groupée
- la documentation de configuration nomme la nouvelle clé de modèle/config
- la documentation du plugin explique la limite de propriété

Si une PR ignore la couche de capacité et code en dur le comportement du fournisseur dans un
channel/tool, renvoyez-la et définissez d'abord le contrat.
