---
summary: "Livre de recettes pour ajouter une nouvelle capacité partagée à OpenClaw"
read_when:
  - Adding a new core capability and plugin registration surface
  - Deciding whether code belongs in core, a vendor plugin, or a feature plugin
  - Wiring a new runtime helper for channels or tools
title: "Livre de recettes des capacités"
---

# Livre de recettes des capacités

Utilisez ceci lorsqu'OpenClaw a besoin d'un nouveau domaine tel que la génération d'images, la génération vidéo, ou une future zone de fonctionnalités supportée par un fournisseur.

La règle :

- plugin = limite de propriété
- capacité = contrat central partagé

Cela signifie que vous ne devez pas commencer par connecter directement un fournisseur à un canal ou un outil. Commencez par définir la capacité.

## Quand créer une capacité

Créez une nouvelle capacité lorsque toutes les conditions suivantes sont remplies :

1. plus d'un fournisseur pourrait raisonnablement l'implémenter
2. les canaux, les outils ou les plugins de fonctionnalités devraient la consommer sans se soucier
   du fournisseur
3. le cœur (core) doit posséder le comportement de repli (fallback), la stratégie, la configuration ou le comportement de livraison

Si le travail est spécifique à un fournisseur et qu'aucun contrat partagé n'existe encore, arrêtez-vous et définissez
le contrat d'abord.

## La séquence standard

1. Définissez le contrat central typé.
2. Ajoutez l'enregistrement du plugin pour ce contrat.
3. Ajoutez une fonction d'aide runtime partagée.
4. Connectez un vrai plugin fournisseur comme preuve.
5. Déplacez les consommateurs de fonctionnalités/canaux vers la fonction d'aide runtime.
6. Ajoutez des tests de contrat.
7. Documentez la configuration orientée opérateur et le modèle de propriété.

## Quoi mettre où

Cœur (Core) :

- types requête/réponse
- registre + résolution de fournisseurs
- comportement de repli (fallback)
- schéma de configuration et étiquettes/aide
- surface de la fonction d'aide runtime

Plugin fournisseur :

- appels API du fournisseur
- gestion de l'authentification fournisseur
- normalisation des requêtes spécifiques au fournisseur
- enregistrement de l'implémentation de la capacité

Plugin de fonctionnalité/canal :

- appelle `api.runtime.*` ou la fonction d'aide `plugin-sdk/*-runtime` correspondante
- n'appelle jamais directement une implémentation de fournisseur

## Liste de contrôle des fichiers

Pour une nouvelle capacité, prévoyez de toucher ces domaines :

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
- un ou plusieurs `extensions/<vendor>/...`
- config/docs/tests

## Exemple : génération d'images

La génération d'images suit la forme standard :

1. core définit `ImageGenerationProvider`
2. core expose `registerImageGenerationProvider(...)`
3. core expose `runtime.imageGeneration.generate(...)`
4. les plugins `openai` et `google` enregistrent des implémentations prises en charge par un fournisseur
5. les futurs fournisseurs peuvent enregistrer le même contrat sans modifier les channels/tools

La clé de configuration est distincte du routage de l'analyse de vision :

- `agents.defaults.imageModel` = analyser les images
- `agents.defaults.imageGenerationModel` = générer des images

Gardez-les séparés pour que le repli et la politique restent explicites.

## Liste de vérification

Avant de publier une nouvelle capacité, vérifiez :

- aucun channel/tool n'importe directement le code du fournisseur
- le runtime helper est le chemin partagé
- au moins un test de contrat affirme la propriété groupée
- la documentation de configuration nomme la nouvelle clé model/config
- la documentation du plugin explique la limite de propriété

Si une PR ignore la couche de capacité et encode en dur le comportement du fournisseur dans un channel/tool, renvoyez-la et définissez d'abord le contrat.

import fr from "/components/footer/fr.mdx";

<fr />
