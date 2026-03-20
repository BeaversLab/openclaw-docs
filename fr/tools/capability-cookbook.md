---
summary: "Livre de recettes pour ajouter une nouvelle capacité partagée à OpenClaw"
read_when:
  - Ajout d'une nouvelle capacité principale et d'une surface d'enregistrement de plugin
  - Décider si le code appartient au cœur, à un plugin fournisseur ou à un plugin de fonctionnalité
  - Câblage d'un nouvel assistant d'exécution pour les channels ou les tools
title: "Livre de recettes sur les capacités"
---

# Livre de recettes sur les capacités

Utilisez ceci quand OpenClaw a besoin d'un nouveau domaine tel que la génération d'images, la
génération de vidéos, ou une future zone de fonctionnalités prise en charge par un fournisseur.

La règle :

- plugin = limite de propriété
- capability = contrat principal partagé

Cela signifie que vous ne devriez pas commencer par câbler directement un fournisseur dans un channel ou un
tool. Commencez par définir la capacité.

## Quand créer une capacité

Créez une nouvelle capacité lorsque tous ces points sont vrais :

1. plus d'un fournisseur pourrait plausiblement l'implémenter
2. les channels, tools ou plugins de fonctionnalités devraient la consommer sans se soucier
   du fournisseur
3. le cœur doit posséder le comportement de repli, la stratégie, la configuration ou le comportement de livraison

Si le travail est propre au fournisseur et qu'aucun contrat partagé n'existe encore, arrêtez-vous et définissez
le contrat d'abord.

## La séquence standard

1. Définissez le contrat principal typé.
2. Ajoutez l'enregistrement de plugin pour ce contrat.
3. Ajoutez un assistant d'exécution partagé.
4. Câblez un vrai plugin fournisseur comme preuve.
5. Déplacez les consommateurs de fonctionnalités/channels vers l'assistant d'exécution.
6. Ajoutez des tests de contrat.
7. Documentez la configuration et le modèle de propriété destinés à l'opérateur.

## Quoi mettre où

Cœur :

- types de requête/réponse
- registre de providers + résolution
- comportement de repli
- schéma de configuration et étiquettes/aide
- surface de l'assistant d'exécution

Plugin fournisseur :

- appels d'API fournisseur
- gestion de l'auth fournisseur
- normalisation des requêtes spécifiques au fournisseur
- enregistrement de l'implémentation de la capacité

Plugin de fonctionnalité/channel :

- appelle `api.runtime.*` ou l'assistant `plugin-sdk/*-runtime` correspondant
- n'appelle jamais directement une implémentation de fournisseur

## Liste de contrôle des fichiers

Pour une nouvelle capacité, prévoyez de toucher à ces domaines :

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
4. les plugins `openai` et `google` enregistrent des implémentations prises en charge par le fournisseur
5. les futurs fournisseurs peuvent enregistrer le même contrat sans modifier les channels/tools

La clé de configuration est distincte du routage de l'analyse visuelle :

- `agents.defaults.imageModel` = analyser les images
- `agents.defaults.imageGenerationModel` = générer des images

Conservez-les séparés afin que la repli et la politique restent explicites.

## Liste de vérification pour la révision

Avant de publier une nouvelle capacité, vérifiez :

- aucun channel/tool n'importe directement le code du fournisseur
- le helper d'exécution est le chemin partagé
- au moins un test de contrat affirme la possession groupée
- la documentation de configuration nomme la nouvelle clé model/config
- la documentation du plugin explique la limite de possession

Si une PR ignore la couche de capacité et encode en dur le comportement du fournisseur dans un
channel/tool, renvoyez-la et définissez d'abord le contrat.

import fr from "/components/footer/fr.mdx";

<fr />
