---
summary: "Expose un point de terminaison HTTP /v1/responses compatible avec OpenResponses depuis le Gateway"
read_when:
  - Integrating clients that speak the OpenResponses API
  - You want item-based inputs, client tool calls, or SSE events
title: "OpenResponses API"
---

# OpenResponses API (HTTP)

Le Gateway d'OpenClaw peut servir un point de terminaison `POST /v1/responses` compatible OpenResponses.

Ce point de terminaison est **désactivé par défaut**. Activez-le d'abord dans la configuration.

- `POST /v1/responses`
- Même port que le Gateway (multiplexage WS + HTTP) : `http://<gateway-host>:<port>/v1/responses`

En coulisses, les requêtes sont exécutées en tant qu'exécution d'agent Gateway normale (même chemin de code que
`openclaw agent`), le routage/les autorisations/la configuration correspondent donc à votre Gateway.

## Authentification, sécurité et routage

Le comportement opérationnel correspond à [OpenAI Chat Completions](/en/gateway/openai-http-api) :

- utilisez `Authorization: Bearer <token>` avec la configuration d'authentification normale du Gateway
- traitez le point de terminaison comme un accès opérateur complet pour l'instance de la passerelle
- pour les modes d'authentification par secret partagé (`token` et `password`), ignorez les valeurs `x-openclaw-scopes` plus étroites déclarées par le porteur et rétablissez les paramètres par défaut complets de l'opérateur normaux
- pour les modes HTTP porteurs d'une identité de confiance (par exemple authentification proxy de confiance ou `gateway.auth.mode="none"`), honorez toujours les étendues d'opérateur déclarées sur la demande
- sélectionnez les agents avec `model: "openclaw"`, `model: "openclaw/default"`, `model: "openclaw/<agentId>"`, ou `x-openclaw-agent-id`
- utilisez `x-openclaw-model` lorsque vous souhaitez remplacer le modèle backend de l'agent sélectionné
- utilisez `x-openclaw-session-key` pour le routage explicite de session
- utilisez `x-openclaw-message-channel` lorsque vous souhaitez un contexte de canal d'entrée synthétique non par défaut

Matrice d'authentification :

- `gateway.auth.mode="token"` ou `"password"` + `Authorization: Bearer ...`
  - prouve la possession du secret partagé de l'opérateur de la passerelle
  - ignore les `x-openclaw-scopes` plus étroites
  - rétablit l'ensemble complet des étendues d'opérateur par défaut
  - traite les tours de chat sur ce point de terminaison comme des tours émetteur-propriétaire
- modes HTTP porteurs d'une identité de confiance (par exemple authentification proxy de confiance, ou `gateway.auth.mode="none"` sur une entrée privée)
  - honore l'en-tête `x-openclaw-scopes` déclaré
  - n'obtient la sémantique de propriétaire que lorsque `operator.admin` est réellement présent dans ces étendues déclarées

Activez ou désactivez ce point de terminaison avec `gateway.http.endpoints.responses.enabled`.

La même surface de compatibilité inclut également :

- `GET /v1/models`
- `GET /v1/models/{id}`
- `POST /v1/embeddings`
- `POST /v1/chat/completions`

Pour l'explication canonique de la manière dont les modèles ciblés par l'agent, `openclaw/default`, le passage direct des intégrations et les remplacements de modèle backend s'assemblent, consultez [OpenAI Chat Completions](/en/gateway/openai-http-api#agent-first-model-contract) et [Model list and agent routing](/en/gateway/openai-http-api#model-list-and-agent-routing).

## Comportement de session

Par défaut, le point de terminaison est **sans état par demande** (une nouvelle clé de session est générée à chaque appel).

Si la demande inclut une chaîne OpenResponses `user`, le Gateway dérive une clé de session stable à partir de celle-ci, afin que les appels répétés puissent partager une session d'agent.

## Format de la demande (pris en charge)

La demande suit l'OpenResponses API avec une entrée basée sur des éléments. Support actuel :

- `input` : chaîne ou tableau d'objets d'élément.
- `instructions` : fusionné dans le système d'invite.
- `tools` : définitions d'outils client (outils de fonction).
- `tool_choice` : filtrer ou exiger des outils client.
- `stream` : active le streaming SSE.
- `max_output_tokens` : limite de sortie au mieux (dépend du fournisseur).
- `user` : routage de session stable.

Accepté mais **actuellement ignoré** :

- `max_tool_calls`
- `reasoning`
- `metadata`
- `store`
- `truncation`

Pris en charge :

- `previous_response_id` : OpenClaw réutilise la session de réponse précédente lorsque la demande reste dans le même périmètre d'agent/utilisateur/session-demandée.

## Éléments (entrée)

### `message`

Rôles : `system`, `developer`, `user`, `assistant`.

- `system` et `developer` sont ajoutés au système d'invite.
- L'élément `user` ou `function_call_output` le plus récent devient le « message actuel ».
- Les messages utilisateur/assistant précédents sont inclus en tant qu'historique pour le contexte.

### `function_call_output` (outils par tour)

Renvoyer les résultats des outils au modèle :

```json
{
  "type": "function_call_output",
  "call_id": "call_123",
  "output": "{\"temperature\": \"72F\"}"
}
```

### `reasoning` et `item_reference`

Accepté pour la compatibilité du schéma mais ignoré lors de la construction de l'invite.

## Outils (outils de fonction côté client)

Fournissez des outils avec `tools: [{ type: "function", function: { name, description?, parameters? } }]`.

Si l'agent décide d'appeler un outil, la réponse renvoie un élément de sortie `function_call`.
Vous envoyez ensuite une demande de suivi avec `function_call_output` pour continuer le tour.

## Images (`input_image`)

Prend en charge les sources base64 ou URL :

```json
{
  "type": "input_image",
  "source": { "type": "url", "url": "https://example.com/image.png" }
}
```

Types MIME autorisés (actuel) : `image/jpeg`, `image/png`, `image/gif`, `image/webp`, `image/heic`, `image/heif`.
Taille maximale (actuelle) : 10 Mo.

## Fichiers (`input_file`)

Prend en charge les sources base64 ou URL :

```json
{
  "type": "input_file",
  "source": {
    "type": "base64",
    "media_type": "text/plain",
    "data": "SGVsbG8gV29ybGQh",
    "filename": "hello.txt"
  }
}
```

Types MIME autorisés (actuel) : `text/plain`, `text/markdown`, `text/html`, `text/csv`,
`application/json`, `application/pdf`.

Taille maximale (actuelle) : 5 Mo.

Comportement actuel :

- Le contenu du fichier est décodé et ajouté au **prompt système**, et non au message utilisateur,
  il reste donc éphémère (non persistant dans l'historique de la session).
- Les PDF sont analysés pour en extraire du texte. Si peu de texte est trouvé, les premières pages sont pixellisées
  en images et transmises au model.

L'analyse PDF utilise la version legacy `pdfjs-dist` compatible avec Node (sans worker). La version moderne
PDF.js s'attend à des workers de navigateur ou des globaux DOM, elle n'est donc pas utilisée dans le Gateway.

Paramètres par défaut de récupération d'URL :

- `files.allowUrl` : `true`
- `images.allowUrl` : `true`
- `maxUrlParts` : `8` (total des parties `input_file` + `input_image` basées sur une URL par requête)
- Les requêtes sont protégées (résolution DNS, blocage des IP privées, limites de redirection, délais d'attente).
- Des listes d'autorisation de noms d'hôte (hostname allowlists) optionnelles sont prises en charge par type d'entrée (`files.urlAllowlist`, `images.urlAllowlist`).
  - Hôte exact : `"cdn.example.com"`
  - Sous-domaines génériques : `"*.assets.example.com"` (ne correspond pas au sommet de domaine)
  - Des listes d'autorisation vides ou omises signifient qu'il n'y a aucune restriction de nom d'hôte.
- Pour désactiver entièrement les récupérations basées sur des URL, définissez `files.allowUrl: false` et/ou `images.allowUrl: false`.

## Limites de fichiers et d'images (config)

Les valeurs par défaut peuvent être ajustées sous `gateway.http.endpoints.responses` :

```json5
{
  gateway: {
    http: {
      endpoints: {
        responses: {
          enabled: true,
          maxBodyBytes: 20000000,
          maxUrlParts: 8,
          files: {
            allowUrl: true,
            urlAllowlist: ["cdn.example.com", "*.assets.example.com"],
            allowedMimes: ["text/plain", "text/markdown", "text/html", "text/csv", "application/json", "application/pdf"],
            maxBytes: 5242880,
            maxChars: 200000,
            maxRedirects: 3,
            timeoutMs: 10000,
            pdf: {
              maxPages: 4,
              maxPixels: 4000000,
              minTextChars: 200,
            },
          },
          images: {
            allowUrl: true,
            urlAllowlist: ["images.example.com"],
            allowedMimes: ["image/jpeg", "image/png", "image/gif", "image/webp", "image/heic", "image/heif"],
            maxBytes: 10485760,
            maxRedirects: 3,
            timeoutMs: 10000,
          },
        },
      },
    },
  },
}
```

Valeurs par défaut en cas d'omission :

- `maxBodyBytes` : 20 Mo
- `maxUrlParts` : 8
- `files.maxBytes` : 5 Mo
- `files.maxChars` : 200 k
- `files.maxRedirects` : 3
- `files.timeoutMs` : 10 s
- `files.pdf.maxPages` : 4
- `files.pdf.maxPixels` : 4 000 000
- `files.pdf.minTextChars` : 200
- `images.maxBytes` : 10 Mo
- `images.maxRedirects` : 3
- `images.timeoutMs` : 10 s
- Les sources `input_image` HEIC/HEIF sont acceptées et normalisées en JPEG avant la transmission au provider.

Note de sécurité :

- Les listes d'autorisation d'URL sont appliquées avant la récupération et lors des redirections.
- L'autorisation d'un nom d'hôte ne contourne pas le blocage des IP privées/internes.
- Pour les passerelles exposées sur Internet, appliquez des contrôles de sortie réseau en plus des gardes au niveau de l'application.
  Voir [Sécurité](/en/gateway/security).

## Streaming (SSE)

Définissez `stream: true` pour recevoir les événements envoyés par le serveur (SSE) :

- `Content-Type: text/event-stream`
- Chaque ligne d'événement est `event: <type>` et `data: <json>`
- Le flux se termine par `data: [DONE]`

Types d'événements actuellement émis :

- `response.created`
- `response.in_progress`
- `response.output_item.added`
- `response.content_part.added`
- `response.output_text.delta`
- `response.output_text.done`
- `response.content_part.done`
- `response.output_item.done`
- `response.completed`
- `response.failed` (en cas d'erreur)

## Utilisation

`usage` est renseigné lorsque le provider sous-jacent signale les comptes de jetons.

## Erreurs

Les erreurs utilisent un objet JSON tel que :

```json
{ "error": { "message": "...", "type": "invalid_request_error" } }
```

Cas courants :

- `401` auth manquante/invalide
- `400` corps de requête invalide
- `405` mauvaise méthode

## Exemples

Non-streaming :

```bash
curl -sS http://127.0.0.1:18789/v1/responses \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: application/json' \
  -H 'x-openclaw-agent-id: main' \
  -d '{
    "model": "openclaw",
    "input": "hi"
  }'
```

Streaming :

```bash
curl -N http://127.0.0.1:18789/v1/responses \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: application/json' \
  -H 'x-openclaw-agent-id: main' \
  -d '{
    "model": "openclaw",
    "stream": true,
    "input": "hi"
  }'
```
