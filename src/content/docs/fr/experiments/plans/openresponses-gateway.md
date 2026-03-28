---
summary: "Plan : Ajouter le point de terminaison /v1/responses OpenResponses et déprécier proprement chat completions"
read_when:
  - Designing or implementing `/v1/responses` gateway support
  - Planning migration from Chat Completions compatibility
owner: "openclaw"
status: "brouillon"
last_updated: "2026-01-19"
title: "OpenResponses Gateway Plan"
---

# Plan d'intégration OpenResponses Gateway

## Contexte

Le OpenClaw Gateway expose actuellement un point de terminaison minimal compatible Chat Completions OpenAI à
`/v1/chat/completions` (voir [Chat Completions OpenAI](/fr/gateway/openai-http-api)).

Open Responses est une norme d'inférence ouverte basée sur l'OpenAI des Réponses API. Elle est conçue
pour les flux de travail d'agents et utilise des entrées basées sur des éléments ainsi que des événements de flux sémantiques. La spécification OpenResponses
définit `/v1/responses`, et non `/v1/chat/completions`.

## Objectifs

- Ajouter un point de terminaison `/v1/responses` qui adhère à la sémantique OpenResponses.
- Conserver Chat Completions comme une couche de compatibilité facile à désactiver et à supprimer éventuellement.
- Standardiser la validation et l'analyse avec des schémas isolés et réutilisables.

## Hors objectifs

- Parité complète des fonctionnalités OpenResponses lors de la première phase (images, fichiers, outils hébergés).
- Remplacer la logique d'exécution de l'agent interne ou l'orchestration des outils.
- Modifier le comportement `/v1/chat/completions` existant lors de la première phase.

## Résumé de la recherche

Sources : OpenResponses OpenAPI, site de spécification OpenResponses, et l'article de blog Hugging Face.

Points clés extraits :

- `POST /v1/responses` accepte les champs `CreateResponseBody` tels que `model`, `input` (chaîne ou
  `ItemParam[]`), `instructions`, `tools`, `tool_choice`, `stream`, `max_output_tokens`, et
  `max_tool_calls`.
- `ItemParam` est une union discriminée de :
  - Éléments `message` avec les rôles `system`, `developer`, `user`, `assistant`
  - `function_call` et `function_call_output`
  - `reasoning`
  - `item_reference`
- Les réponses réussies renvoient un `ResponseResource` avec des éléments `object: "response"`, `status` et
  `output`.
- Le streaming utilise des événements sémantiques tels que :
  - `response.created`, `response.in_progress`, `response.completed`, `response.failed`
  - `response.output_item.added`, `response.output_item.done`
  - `response.content_part.added`, `response.content_part.done`
  - `response.output_text.delta`, `response.output_text.done`
- La spécification exige :
  - `Content-Type: text/event-stream`
  - `event:` doit correspondre au champ JSON `type`
  - l'événement terminal doit être littéral `[DONE]`
- Les éléments de raisonnement peuvent exposer `content`, `encrypted_content` et `summary`.
- Les exemples HF incluent `OpenResponses-Version: latest` dans les requêtes (en-tête optionnel).

## Architecture proposée

- Ajouter `src/gateway/open-responses.schema.ts` contenant uniquement des schémas Zod (pas d'importations de passerelle).
- Ajouter `src/gateway/openresponses-http.ts` (ou `open-responses-http.ts`) pour `/v1/responses`.
- Conserver `src/gateway/openai-http.ts` intact en tant qu'adaptateur de compatité hérité.
- Ajouter la configuration `gateway.http.endpoints.responses.enabled` (par défaut `false`).
- Garder `gateway.http.endpoints.chatCompletions.enabled` indépendant ; autoriser l'activation des deux points de terminaison
  séparément.
- Émettre un avertissement au démarrage lorsque Chat Completions est activé pour signaler son statut hérité.

## Chemine de dépréciation pour Chat Completions

- Maintenir des limites de module strictes : aucun type de schéma partagé entre les réponses et les complétions de chat.
- Rendre les complétions de chat optionnelles via la configuration afin qu'elles puissent être désactivées sans modification du code.
- Mettre à jour la documentation pour étiqueter les complétions de chat comme obsolètes une fois `/v1/responses` est stable.
- Étape future facultative : mapper les demandes de complétions de chat vers le gestionnaire de réponses pour un chemin de suppression plus simple.

## Sous-ensemble pris en charge Phase 1

- Accepter `input` comme chaîne ou `ItemParam[]` avec des rôles de message et `function_call_output`.
- Extraire les messages système et développeur dans `extraSystemPrompt`.
- Utiliser le `user` ou le `function_call_output` le plus récent comme message actuel pour les exécutions d'agent.
- Rejeter les parties de contenu non prises en charge (image/fichier) avec `invalid_request_error`.
- Renvoyer un seul message assistant avec le contenu `output_text`.
- Renvoyer `usage` avec des valeurs mises à zéro jusqu'à ce que la comptabilisation des jetons soit connectée.

## Stratégie de validation (sans SDK)

- Implémenter des schémas Zod pour le sous-ensemble pris en charge de :
  - `CreateResponseBody`
  - `ItemParam` + unions de parties de contenu de message
  - `ResponseResource`
  - Formes d'événements de streaming utilisées par la passerelle
- Garder les schémas dans un module unique et isolé pour éviter la dérive et permettre une génération de code future.

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

## Plan de tests et de vérification

- Ajouter une couverture e2e pour `/v1/responses` :
  - Authentification requise
  - Forme de réponse non-stream
  - Ordre des événements de flux et `[DONE]`
  - Routage de session avec des en-têtes et `user`
- Garder `src/gateway/openai-http.test.ts` inchangé.
- Manuel : curl vers `/v1/responses` avec `stream: true` et vérifier l'ordre des événements et le terminal `[DONE]`.

## Mises à jour de la documentation (Suite)

- Ajouter une nouvelle page de documentation pour l'utilisation et les exemples de `/v1/responses`.
- Mettre à jour `/gateway/openai-http-api` avec une note d'obsolètes et un pointeur vers `/v1/responses`.
