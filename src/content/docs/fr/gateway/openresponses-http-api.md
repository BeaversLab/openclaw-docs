---
summary: "Expose un point de terminaison HTTP /v1/responses compatible avec OpenResponses depuis le Gateway"
read_when:
  - Integrating clients that speak the OpenResponses API
  - You want item-based inputs, client tool calls, or SSE events
title: "OpenResponses API"
---

Le OpenClaw d'Gateway peut servir un point de terminaison `POST /v1/responses` compatible avec OpenResponses.

Ce point de terminaison est **désactivé par défaut**. Activez-le d'abord dans la configuration.

- `POST /v1/responses`
- Même port que la Gateway (multiplexage WS + HTTP) : `http://<gateway-host>:<port>/v1/responses`

En coulisses, les requêtes sont exécutées en tant qu'exécution d'agent Gateway normale (même chemin de code que `openclaw agent`), donc le routage/les permissions/la configuration correspondent à votre Gateway.

## Authentification, sécurité et routage

Le comportement opérationnel correspond à [OpenAI Chat Completions](/fr/gateway/openai-http-api) :

- utilisez le chemin d'authentification HTTP de la Gateway correspondant :
  - authentification par secret partagé (`gateway.auth.mode="token"` ou `"password"`) : `Authorization: Bearer <token-or-password>`
  - auth trusted-proxy (`gateway.auth.mode="trusted-proxy"`) : en-têtes de proxy conscients de l'identité provenant d'une source de proxy de confiance configurée ; les proxies de bouclage same-host nécessitent un `gateway.auth.trustedProxy.allowLoopback = true` explicite
  - trusted-proxy local direct fallback : les appelants same-host sans en-têtes `Forwarded`, `X-Forwarded-*` ou `X-Real-IP` peuvent utiliser `gateway.auth.password` / `OPENCLAW_GATEWAY_PASSWORD`
  - private-ingress open auth (`gateway.auth.mode="none"`) : aucun en-tête d'authentification
- considérer le point de terminaison comme un accès complet opérateur pour l'instance de passerelle
- pour les modes d'authentification à secret partagé (`token` et `password`), ignorez les valeurs `x-openclaw-scopes` plus étroites déclarées par le porteur et rétablissez les paramètres par défaut complets normaux de l'opérateur
- pour les modes HTTP porteurs d'une identité de confiance (par exemple authentification proxy de confiance ou `gateway.auth.mode="none"`), respectez `x-openclaw-scopes` si présent et sinon revenez à l'ensemble des étendues par défaut normales de l'opérateur
- sélectionnez les agents avec `model: "openclaw"`, `model: "openclaw/default"`, `model: "openclaw/<agentId>"` ou `x-openclaw-agent-id`
- utilisez `x-openclaw-model` lorsque vous souhaitez remplacer le modèle backend de l'agent sélectionné
- utilisez `x-openclaw-session-key` pour un routage de session explicite
- utilisez `x-openclaw-message-channel` lorsque vous souhaitez un contexte de canal d'ingress synthétique non par défaut

Matrice d'authentification :

- `gateway.auth.mode="token"` ou `"password"` + `Authorization: Bearer ...`
  - prouve la possession du secret partagé de l'opérateur de passerelle
  - ignore `x-openclaw-scopes` plus étroites
  - rétablit l'ensemble complet des étendues par défaut de l'opérateur :
    `operator.admin`, `operator.approvals`, `operator.pairing`,
    `operator.read`, `operator.talk.secrets`, `operator.write`
  - traite les tours de discussion sur ce point de terminaison comme des tours propriétaire-expéditeur
- modes HTTP porteurs d'une identité de confiance (par exemple authentification proxy de confiance, ou `gateway.auth.mode="none"` sur ingress privé)
  - respectez `x-openclaw-scopes` lorsque l'en-tête est présent
  - revient à l'ensemble des étendues par défaut normales de l'opérateur lorsque l'en-tête est absent
  - ne perdez la sémantique de propriétaire que lorsque l'appelant réduit explicitement les étendues et omet `operator.admin`

Activez ou désactivez ce point de terminaison avec `gateway.http.endpoints.responses.enabled`.

La même surface de compatibilité inclut également :

- `GET /v1/models`
- `GET /v1/models/{id}`
- `POST /v1/embeddings`
- `POST /v1/chat/completions`

Pour l'explication canonique de la manière dont les modèles ciblés par les agents, `openclaw/default`, le transfert d'embeddings et les substitutions de modèles backend s'articulent, consultez [OpenAI Chat Completions](/fr/gateway/openai-http-api#agent-first-model-contract) et [Model list and agent routing](/fr/gateway/openai-http-api#model-list-and-agent-routing).

## Comportement de la session

Par défaut, le point de terminaison est **sans état par requête** (une nouvelle clé de session est générée à chaque appel).

Si la requête inclut une chaîne `user` OpenResponses, le Gateway dérive une clé de session stable
d'elle-même, permettant ainsi aux appels répétés de partager une session d'agent.

## Forme de la requête (prise en charge)

La requête suit l'OpenResponses API avec une entrée basée sur des éléments. Prise en charge actuelle :

- `input` : chaîne ou tableau d'objets d'élément.
- `instructions` : fusionné dans le prompt système.
- `tools` : définitions d'outils client (fonctions outils).
- `tool_choice` : filtrer ou exiger des outils client.
- `stream` : active le streaming SSE.
- `max_output_tokens` : limite de sortie au mieux (dépend du fournisseur).
- `temperature` : température d'échantillonnage au mieux transmise au fournisseur. Ignoré par le backend Codex Responses basé sur ChatGPT, qui utilise un échantillonnage fixe côté serveur.
- `top_p` : échantillonnage de noyau au mieux transmis au fournisseur. Même mise en garde pour Codex Responses que `temperature`.
- `user` : routage de session stable.

Accepté mais **actuellement ignoré** :

- `max_tool_calls`
- `reasoning`
- `metadata`
- `store`
- `truncation`

Pris en charge :

- `previous_response_id` : OpenClaw réutilise la session de réponse précédente lorsque la requête reste dans le même périmètre agent/utilisateur/session-demandée.

## Éléments (entrée)

### `message`

Rôles : `system`, `developer`, `user`, `assistant`.

- `system` et `developer` sont ajoutés au prompt système.
- L'élément `user` ou `function_call_output` le plus récent devient le « message actuel ».
- Les messages précédents de l'utilisateur/de l'assistant sont inclus sous forme d'historique pour le contexte.

### `function_call_output` (outils basés sur les tours)

Renvoyez les résultats des outils au modèle :

```json
{
  "type": "function_call_output",
  "call_id": "call_123",
  "output": "{\"temperature\": \"72F\"}"
}
```

### `reasoning` et `item_reference`

Acceptés pour la compatibilité du schéma mais ignorés lors de la construction du prompt.

## Outils (outils de fonction côté client)

Fournissez des outils avec `tools: [{ type: "function", function: { name, description?, parameters? } }]`.

Si l'agent décide d'appeler un outil, la réponse renvoie un élément de sortie `function_call`.
Vous envoyez ensuite une requête de suivi avec `function_call_output` pour continuer le tour.

## Images (`input_image`)

Prend en charge les sources base64 ou URL :

```json
{
  "type": "input_image",
  "source": { "type": "url", "url": "https://example.com/image.png" }
}
```

Types MIME autorisés (actuel) : `image/jpeg`, `image/png`, `image/gif`, `image/webp`, `image/heic`, `image/heif`.
Taille max. (actuelle) : 10 Mo.

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

Taille max. (actuelle) : 5 Mo.

Comportement actuel :

- Le contenu du fichier est décodé et ajouté au **prompt système**, et non au message de l'utilisateur,
  il reste donc éphémère (non conservé dans l'historique de session).
- Le texte du fichier décodé est encapsulé en tant que **contenu externe non approuvé** avant d'être ajouté,
  les octets du fichier sont donc traités comme des données et non comme des instructions de confiance.
- Le bloc injecté utilise des marqueurs de limite explicites comme
  `<<<EXTERNAL_UNTRUSTED_CONTENT id="...">>>` /
  `<<<END_EXTERNAL_UNTRUSTED_CONTENT id="...">>>` et inclut une
  ligne de métadonnées `Source: External`.
- Ce chemin d'entrée de fichier omet intentionnellement la longue bannière `SECURITY NOTICE:` pour
  préserver le budget du prompt ; les marqueurs de limite et les métadonnées restent en place.
- Les PDF sont d'abord analysés pour le texte. Si peu de texte est trouvé, les premières pages sont
  converties en images et transmises au modèle, et le bloc de fichier injecté utilise
  l'espace réservé `[PDF content rendered to images]`.

L'analyse PDF est fournie par le plugin `document-extract` inclus, qui utilise
`clawpdf` et son runtime PDFium WebAssembly empaqueté pour l'extraction de texte et
le rendu de page.

Valeurs par défaut de récupération d'URL :

- `files.allowUrl` : `true`
- `images.allowUrl` : `true`
- `maxUrlParts` : `8` (total des parties `input_file` et `input_image` basées sur une URL par requête)
- Les requêtes sont protégées (résolution DNS, blocage des IP privées, limites de redirection, délais d'attente).
- Des listes d'autorisation de noms d'hôte (hostname allowlists) optionnelles sont prises en charge par type d'entrée (`files.urlAllowlist`, `images.urlAllowlist`).
  - Hôte exact : `"cdn.example.com"`
  - Sous-domaines génériques : `"*.assets.example.com"` (ne correspond pas au domaine racine)
  - Les listes d'autorisation vides ou omises signifient qu'il n'y a aucune restriction de nom d'hôte.
- Pour désactiver entièrement les récupérations basées sur des URL, définissez `files.allowUrl: false` et/ou `images.allowUrl: false`.

## Limites de fichiers et d'images (configuration)

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
- Les sources `input_image` HEIC/HEIF sont acceptées lorsqu'un convertisseur système est disponible et sont normalisées en JPEG avant la livraison par le provider. Les convertisseurs pris en charge sont macOS `sips`, ImageMagick, GraphicsMagick ou ffmpeg.

Note de sécurité :

- Les listes d'autorisation d'URL sont appliquées avant la récupération et lors des sauts de redirection.
- L'autorisation d'un nom d'hôte ne contourne pas le blocage des IP privées/internes.
- Pour les passerelles exposées à Internet, appliquez des contrôles de sortie réseau en plus des gardes au niveau de l'application.
  Voir [Sécurité](/fr/gateway/security).

## Streaming (SSE)

Définissez `stream: true` pour recevoir les événements Server-Sent (SSE) :

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
OpenClaw normalise les alias courants de type OpenAI avant que ces compteurs n'atteignent
les surfaces de statut/session en aval, y compris `input_tokens` / `output_tokens`
et `prompt_tokens` / `completion_tokens`.

## Erreurs

Les erreurs utilisent un objet JSON comme suit :

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

## Connexes

- [complétions de chat OpenAI](/fr/gateway/openai-http-api)
- [OpenAI](/fr/providers/openai)
