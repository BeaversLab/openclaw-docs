---
summary: "Plan: Add OpenResponses /v1/responses endpoint and deprecate chat completions cleanly"
read_when:
  - Conception ou mise en œuvre du support de la passerelle `/v1/responses`
  - Planification de la migration à partir de la compatibilité Chat Completions
owner: "openclaw"
status: "draft"
last_updated: "2026-01-19"
title: "Plan de passerelle OpenResponses Gateway"
---

# Plan d'intégration de la passerelle OpenResponses Gateway

## Contexte

La passerelle OpenClaw Gateway expose actuellement un endpoint minimal de complétion de chat compatible OpenAI à
`/v1/chat/completions` (voir [OpenAI Chat Completions](/fr/gateway/openai-http-api)).

Open Responses est une norme d'inférence ouverte basée sur l'API Responses de OpenAI API. Elle est conçue
pour les flux de travail agentic et utilise des entrées basées sur des éléments ainsi que des événements de diffusion sémantique. La spécification OpenResponses
définit `/v1/responses`, et non `/v1/chat/completions`.

## Objectifs

- Ajouter un endpoint `/v1/responses` qui adhère à la sémantique OpenResponses.
- Conserver Chat Completions comme une couche de compatibilité facile à désactiver et à supprimer éventuellement.
- Standardiser la validation et l'analyse avec des schémas isolés et réutilisables.

## Non-objectifs

- Parité complète des fonctionnalités OpenResponses lors de la première phase (images, fichiers, outils hébergés).
- Remplacer la logique d'exécution de l'agent interne ou l'orchestration des outils.
- Modifier le comportement existant de `/v1/chat/completions` au cours de la première phase.

## Résumé de la recherche

Sources : OpenAPI OpenResponses, site de spécification OpenResponses et article de blog Hugging Face.

Points clés extraits :

- `POST /v1/responses` accepte les champs `CreateResponseBody` tels que `model`, `input` (chaîne ou
  `ItemParam[]`), `instructions`, `tools`, `tool_choice`, `stream`, `max_output_tokens` et
  `max_tool_calls`.
- `ItemParam` est une union discriminée de :
  - Éléments `message` avec les rôles `system`, `developer`, `user`, `assistant`
  - `function_call` et `function_call_output`
  - `reasoning`
  - `item_reference`
- Les réponses réussies renvoient un `ResponseResource` avec `object: "response"`, `status`, et
  `output`.
- Le streaming utilise des événements sémantiques tels que :
  - `response.created`, `response.in_progress`, `response.completed`, `response.failed`
  - `response.output_item.added`, `response.output_item.done`
  - `response.content_part.added`, `response.content_part.done`
  - `response.output_text.delta`, `response.output_text.done`
- La spécification exige :
  - `Content-Type: text/event-stream`
  - `event:` doit correspondre au champ `type` JSON
  - l'événement terminal doit être `[DONE]` littéral
- Les éléments de raisonnement peuvent exposer `content`, `encrypted_content`, et `summary`.
- Les exemples HF incluent `OpenResponses-Version: latest` dans les requêtes (en-tête optionnel).

## Architecture proposée

- Ajouter `src/gateway/open-responses.schema.ts` contenant uniquement des schémas Zod (pas d'imports de passerelle).
- Ajouter `src/gateway/openresponses-http.ts` (ou `open-responses-http.ts`) pour `/v1/responses`.
- Garder `src/gateway/openai-http.ts` intact en tant qu'adaptateur de compatibilité hérité.
- Ajouter la config `gateway.http.endpoints.responses.enabled` (par défaut `false`).
- Garder `gateway.http.endpoints.chatCompletions.enabled` indépendant ; permettre aux deux points de terminaison d'être
  basculés séparément.
- Émettre un avertissement au démarrage lorsque Chat Completions est activé pour signaler son statut hérité.

## Chemin de dépréciation pour Chat Completions

- Maintenir des limites de module strictes : aucun type de schéma partagé entre responses et chat completions.
- Rendre Chat Completions optionnel par configuration afin qu'il puisse être désactivé sans modification de code.
- Mettre à jour la documentation pour étiqueter Chat Completions comme hérité une fois `/v1/responses` est stable.
- Étape future optionnelle : mapper les requêtes Chat Completions vers le gestionnaire Responses pour un chemin de suppression plus simple.

## Sous-ensemble de prise en charge Phase 1

- Accepter `input` comme chaîne ou `ItemParam[]` avec des rôles de message et `function_call_output`.
- Extrayez les messages système et développeur dans `extraSystemPrompt`.
- Utilisez le `user` ou le `function_call_output` le plus récent comme message actuel pour les exécutions d'agent.
- Rejetez les parties de contenu non prises en charge (image/fichier) avec `invalid_request_error`.
- Renvoyez un seul message assistant avec le contenu `output_text`.
- Renvoyez `usage` avec des valeurs mises à zéro jusqu'à ce que la comptabilisation des jetons soit connectée.

## Stratégie de validation (sans SDK)

- Implémentez des schémas Zod pour le sous-ensemble pris en charge de :
  - `CreateResponseBody`
  - `ItemParam` + unions de parties de contenu de message
  - `ResponseResource`
  - Formes d'événements de streaming utilisées par la passerelle
- Conservez les schémas dans un module unique et isolé pour éviter toute dérive et permettre une future génération de code.

## Implémentation du streaming (Phase 1)

- Lignes SSE avec à la fois `event:` et `data:`.
- Séquence requise (minimum viable) :
  - `response.created`
  - `response.output_item.added`
  - `response.content_part.added`
  - `response.output_text.delta` (répéter si nécessaire)
  - `response.output_text.done`
  - `response.content_part.done`
  - `response.completed`
  - `[DONE]`

## Tests et plan de vérification

- Ajoutez une couverture de bout en bout pour `/v1/responses` :
  - Authentification requise
  - Forme de réponse non en flux continu
  - Ordre des événements de flux et `[DONE]`
  - Routage de session avec les en-têtes et `user`
- Gardez `src/gateway/openai-http.test.ts` inchangé.
- Manuel : curl vers `/v1/responses` avec `stream: true` et vérifiez l'ordre des événements et le terminal
  `[DONE]`.

## Mises à jour de la documentation (suite)

- Ajoutez une nouvelle page de documentation pour l'utilisation et les exemples `/v1/responses`.
- Mettez à jour `/gateway/openai-http-api` avec une note de compatibilité et un pointeur vers `/v1/responses`.

import fr from "/components/footer/fr.mdx";

<fr />
