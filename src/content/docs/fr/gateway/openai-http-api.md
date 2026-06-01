---
summary: "Exposer un point de terminaison HTTP /v1/chat/completions compatible OpenAI depuis le Gateway"
read_when:
  - Integrating tools that expect OpenAI Chat Completions
title: "Complétions de chat OpenAI"
---

Le OpenClaw d'Gateway peut servir un petit point de terminaison de complétions de chat compatible OpenAI.

Ce point de terminaison est **désactivé par défaut**. Activez-le d'abord dans la configuration.

- `POST /v1/chat/completions`
- Même port que le Gateway (multiplexage WS + HTTP) : `http://<gateway-host>:<port>/v1/chat/completions`

Lorsque la surface HTTP compatible Gateway du OpenAI est activée, elle sert également :

- `GET /v1/models`
- `GET /v1/models/{id}`
- `POST /v1/embeddings`
- `POST /v1/responses`

En coulisses, les requêtes sont exécutées en tant qu'exécution d'agent Gateway normale (même chemin de code que `openclaw agent`), donc le routage/les autorisations/la configuration correspondent à votre Gateway.

## Authentification

Utilise la configuration d'authentification de la passerelle.

Chemins d'authentification HTTP courants :

- authentification par secret partagé (`gateway.auth.mode="token"` ou `"password"`) :
  `Authorization: Bearer <token-or-password>`
- authentification HTTP de confiance porteur d'identité (`gateway.auth.mode="trusted-proxy"`) :
  acheminer via le mandataire (proxy) configuré prenant en compte l'identité et laisser ce dernier injecter les
  en-têtes d'identité requis
- authentification ouverte pour entrée privée (`gateway.auth.mode="none"`) :
  aucun en-tête d'authentification requis

Notes :

- Lorsque `gateway.auth.mode="token"`, utilisez `gateway.auth.token` (ou `OPENCLAW_GATEWAY_TOKEN`).
- Lorsque `gateway.auth.mode="password"`, utilisez `gateway.auth.password` (ou `OPENCLAW_GATEWAY_PASSWORD`).
- Lorsque `gateway.auth.mode="trusted-proxy"`, la requête HTTP doit provenir d'une
  source de mandataire (proxy) de confiance configurée ; les mandataires de bouclage (loopback) sur le même hôte nécessitent un `gateway.auth.trustedProxy.allowLoopback = true` explicite.
- Les appelants internes sur le même hôte qui contournent le mandataire peuvent utiliser
  `gateway.auth.password` / `OPENCLAW_GATEWAY_PASSWORD` comme solution de repli
  directe locale. Toute preuve d'en-tête `Forwarded`, `X-Forwarded-*` ou `X-Real-IP`
  maintient la requête sur le chemin du mandataire de confiance à la place.
- Si `gateway.auth.rateLimit` est configuré et que trop d'échecs d'authentification se produisent, le point de terminaison renvoie `429` avec `Retry-After`.

## Limite de sécurité (important)

Traitez ce point de terminaison comme une surface d'**accès opérateur complet** pour l'instance de passerelle.

- L'authentification HTTP par porteur ici n'est pas un modèle de portée étroit par utilisateur.
- Un jeton/mot de passe Gateway valide pour ce point de terminaison doit être traité comme une information d'identification de propriétaire/opérateur.
- Les requêtes passent par le même chemin d'agent du plan de contrôle que les actions de l'opérateur de confiance.
- Il n'y a pas de limite d'outil distincte non-propriétaire/par-utilisateur sur ce point de terminaison ; une fois qu'un appelant réussit l'authentification Gateway ici, OpenClaw traite cet appelant comme un opérateur de confiance pour cette passerelle.
- Pour les modes d'authentification par secret partagé (`token` et `password`), le point de terminaison restaure les valeurs par défaut complètes de l'opérateur normal, même si l'appelant envoie un en-tête `x-openclaw-scopes` plus restreint.
- Les modes HTTP porteurs d'une identité de confiance (par exemple authentification proxy de confiance ou `gateway.auth.mode="none"`) honorent `x-openclaw-scopes` lorsqu'il est présent et retombent sinon sur l'ensemble de portées par défaut de l'opérateur normal.
- Si la stratégie de l'agent cible autorise les outils sensibles, ce point de terminaison peut les utiliser.
- Gardez ce point de terminaison uniquement en bouclage/tailnet/entrée privée ; ne l'exposez pas directement à l'Internet public.

Matrice d'authentification :

- `gateway.auth.mode="token"` ou `"password"` + `Authorization: Bearer ...`
  - prouve la possession du secret partagé de l'opérateur de la passerelle
  - ignore `x-openclaw-scopes` plus restreint
  - restaure l'ensemble complet des portées par défaut de l'opérateur :
    `operator.admin`, `operator.approvals`, `operator.pairing`,
    `operator.read`, `operator.talk.secrets`, `operator.write`
  - traite les tours de discussion sur ce point de terminaison comme des tours émetteur-propriétaire
- modes HTTP porteurs d'une identité de confiance (par exemple authentification proxy de confiance, ou `gateway.auth.mode="none"` sur une entrée privée)
  - authentifier une identité de confiance externe ou une limite de déploiement
  - honorent `x-openclaw-scopes` lorsque l'en-tête est présent
  - revenir à l'ensemble normal des portées par défaut de l'opérateur lorsque l'en-tête est absent
  - ne perdent la sémantique de propriétaire que lorsque l'appelant restreint explicitement les portées et omet `operator.admin`

Voir [Sécurité](/fr/gateway/security) et [Accès à distance](/fr/gateway/remote).

## Quand utiliser ce point de terminaison

Utilisez `/v1/chat/completions` lorsque vous intégrez des outils ou un backend côté application de confiance avec une passerelle existante et que vous pouvez conserver en toute sécurité les identifiants d'opérateur de la passerelle.

- Préférez cette solution à l'ajout d'un nouveau canal intégré lorsque votre intégration n'est qu'une autre surface opérateur/client pour la même passerelle.
- Pour les clients mobiles natifs qui se connectent directement à une passerelle distante, privilégiez [WebChat](WebChat/en/web/webchatGateway) ou le [Protocole Gateway](/fr/gateway/protocol) et implémentez le flux d'amorçage d'appareil jumelé/jeton d'appareil afin que l'appareil n'ait pas besoin d'un jeton/mot de passe HTTP partagé.
- Créez plutôt un plugin de canal lorsque vous intégrez un réseau de messagerie externe avec ses propres utilisateurs, salles, livraison de webhook ou transport sortant. Voir [Création de plugins](/fr/plugins/building-plugins).

## Contrat de modèle centré sur l'agent

OpenClaw considère le champ OpenAI OpenClawOpenAI`model` comme une **cible d'agent**, et non comme un identifiant brut de modèle de fournisseur.

- `model: "openclaw"` route vers l'agent par défaut configuré.
- `model: "openclaw/default"` route également vers l'agent par défaut configuré.
- `model: "openclaw/<agentId>"` route vers un agent spécifique.

En-têtes de requête optionnels :

- `x-openclaw-model: <provider/model-or-bare-id>` remplace le modèle backend pour l'agent sélectionné.
- `x-openclaw-agent-id: <agentId>` reste pris en charge en tant que remplacement de compatibilité.
- `x-openclaw-session-key: <sessionKey>` contrôle entièrement le routage de session.
- `x-openclaw-message-channel: <channel>` définit le contexte de canal d'entrée synthétique pour les invites et stratégies tenant compte du canal.

Alias de compatibilité toujours acceptés :

- `model: "openclaw:<agentId>"`
- `model: "agent:<agentId>"`

## Activation du point de terminaison

Définissez `gateway.http.endpoints.chatCompletions.enabled` sur `true` :

```json5
{
  gateway: {
    http: {
      endpoints: {
        chatCompletions: { enabled: true },
      },
    },
  },
}
```

## Désactivation du point de terminaison

Définissez `gateway.http.endpoints.chatCompletions.enabled` sur `false` :

```json5
{
  gateway: {
    http: {
      endpoints: {
        chatCompletions: { enabled: false },
      },
    },
  },
}
```

## Comportement de la session

Par défaut, le point de terminaison est **sans état par requête** (une nouvelle clé de session est générée à chaque appel).

Si la requête inclut une chaîne OpenAI OpenAI`user`Gateway, la Gateway dérive une clé de session stable à partir de celle-ci, permettant ainsi aux appels répétés de partager une session d'agent.

Pour les applications personnalisées, l'option par défaut la plus sûre consiste à réutiliser la même valeur `user`OpenClaw par fil de conversation. Évitez les identifiants au niveau du compte, sauf si vous souhaitez explicitement que plusieurs conversations ou appareils partagent une session OpenClaw. Utilisez `x-openclaw-session-key` lorsque vous avez besoin d'un contrôle de routage explicite sur plusieurs clients ou fils.

## Pourquoi cette surface est importante

Il s'agit de l'ensemble de compatibilité le plus impactant pour les interfaces et les outils auto-hébergés :

- La plupart des configurations Open WebUI, LobeChat et LibreChat s'attendent à `/v1/models`.
- De nombreux systèmes RAG s'attendent à `/v1/embeddings`.
- Les clients de chat OpenAI existants peuvent généralement démarrer avec OpenAI`/v1/chat/completions`.
- Les clients plus natifs aux agents préfèrent de plus en plus `/v1/responses`.

## Liste des modèles et routage des agents

<AccordionGroup>
  <Accordion title="Que renvoie `/v1/models` ?"OpenClaw>
    Une liste de cibles d'agents OpenClaw.

    Les ids renvoyés sont des entrées `openclaw`, `openclaw/default` et `openclaw/<agentId>`OpenAI.
    Utilisez-les directement comme valeurs OpenAI `model`.

  </Accordion>
  <Accordion title="Est-ce que `/v1/models` liste les agents ou les sous-agents ?">
    Il liste les cibles d'agents de premier niveau, et non les modèles de fournisseurs backend ni les sous-agents.

    Les sous-agents restent une topologie d'exécution interne. Ils n'apparaissent pas comme pseudo-modèles.

  </Accordion>
  <Accordion title="Pourquoi `openclaw/default` est-il inclus ?">
    `openclaw/default` est l'alias stable pour l'agent par défaut configuré.

    Cela signifie que les clients peuvent continuer à utiliser un id prévisible même si l' véritable id de l'agent par défaut change entre les environnements.

  </Accordion>
  <Accordion title="Comment remplacer le modèle backend ?">
    Utilisez `x-openclaw-model`.

    Exemples :
    `x-openclaw-model: openai/gpt-5.4`
    `x-openclaw-model: gpt-5.5`

    Si vous l'omettez, l'agent sélectionné s'exécute avec son choix de modèle configuré normalement.

  </Accordion>
  <Accordion title="Comment les embeddings s'intègrent-ils à ce contrat ?">
    `/v1/embeddings` utilise les mêmes ids de cibles d'agents `model`.

    Utilisez `model: "openclaw/default"` ou `model: "openclaw/<agentId>"`.
    Lorsque vous avez besoin d'un modèle d'embedding spécifique, envoyez-le dans `x-openclaw-model`.
    Sans cet en-tête, la requête est transmise à la configuration d'embedding normale de l'agent sélectionné.

  </Accordion>
</AccordionGroup>

## Streaming (SSE)

Définissez `stream: true` pour recevoir les Server-Sent Events (SSE) :

- `Content-Type: text/event-stream`
- Chaque ligne d'événement est `data: <json>`
- Le flux se termine par `data: [DONE]`

## Contrat d'outil de chat

`/v1/chat/completions`OpenAI prend en charge un sous-ensemble d'outils de fonctions compatible avec les clients Chat OpenAI courants.

### Champs de demande pris en charge

- `tools` : tableau de `{ "type": "function", "function": { ... } }`
- `tool_choice` : `"auto"`, `"none"`
- tours de suivi `messages[*].role: "tool"`
- `messages[*].tool_call_id` pour lier les résultats de l'outil à un appel d'outil précédent
- `max_completion_tokens` : nombre ; limite par appel pour le nombre total de jetons de complétion (jetons de raisonnement inclus). Nom de champ actuel des complétions de chat OpenAI ; préféré lorsque `max_completion_tokens` et `max_tokens` sont tous deux envoyés.
- `max_tokens` : nombre ; alias hérité accepté pour la rétrocompatibilité. Ignoré lorsque `max_completion_tokens` est également présent.
- `temperature` : nombre ; température d'échantillonnage au mieux transmise au fournisseur en amont via le channel de paramètres de flux de l'agent.
- `top_p` : nombre ; échantillonnage de noyau au mieux transmis au fournisseur en amont via le channel de paramètres de flux de l'agent.
- `frequency_penalty` : nombre ; pénalité de fréquence au mieux transmise au fournisseur amont via le canal de paramètres de flux de l'agent. Plage validée : -2.0 à 2.0. Renvoie `400 invalid_request_error` pour les valeurs hors plage.
- `presence_penalty` : nombre ; pénalité de présence au mieux transmise au fournisseur amont via le canal de paramètres de flux de l'agent. Plage validée : -2.0 à 2.0. Renvoie `400 invalid_request_error` pour les valeurs hors plage.
- `seed` : nombre (entier) ; germe (seed) au mieux transmis au fournisseur amont via le canal de paramètres de flux de l'agent. Renvoie `400 invalid_request_error` pour les valeurs non entières.

Lorsqu'un champ de limite de jetons est défini, la valeur est transmise au fournisseur amont via le canal de paramètres de flux de l'agent. Le nom réel du champ de protocole envoyé au fournisseur amont est choisi par le transport du fournisseur : `max_completion_tokens`OpenAI pour les points de terminaison de la famille OpenAI, et `max_tokens` pour les fournisseurs qui n'acceptent que le nom hérité (tel que Mistral et Chutes). Les champs d'échantillonnage (`temperature`, `top_p`, `frequency_penalty`, `presence_penalty`, `seed`) suivent le même canal de paramètres de flux ; le backend Codex Responses basé sur ChatGPT les supprime côté serveur car il utilise un échantillonnage fixe.

### Variantes non prises en charge

Le point de terminaison renvoie `400 invalid_request_error` pour les variantes d'outils non prises en charge, notamment :

- `tools` non tableau
- entrées d'outil non-fonction
- `tool.function.name` manquant
- variantes `tool_choice` telles que `allowed_tools` et `custom`
- `tool_choice: "required"` (pas encore appliqué lors de l'exécution ; sera pris en charge une fois l'application stricte implémentée)
- `tool_choice: { "type": "function", "function": { "name": "..." } }` (même raisonnement que `required`)
- valeurs `tool_choice.function.name` qui ne correspondent pas aux `tools` fournies

### Forme de la réponse outil en non-streaming

Lorsque l'agent décide d'appeler des outils, la réponse utilise :

- `choices[0].finish_reason = "tool_calls"`
- entrées `choices[0].message.tool_calls[]` avec :
  - `id`
  - `type: "function"`
  - `function.name`
  - `function.arguments` (chaîne JSON)

Les commentaires de l'assistant avant l'appel d'outil sont renvoyés dans `choices[0].message.content` (possiblement vide).

### Forme de la réponse outil en streaming

Lors du `stream: true`, les appels d'outils sont émis sous forme de blocs SSE incrémentiels :

- delta de rôle assistant initial
- deltas de commentaires assistant optionnels
- un ou plusieurs blocs `delta.tool_calls` transportant l'identité de l'outil et des fragments d'arguments
- bloc final avec `finish_reason: "tool_calls"`
- `data: [DONE]`

Si `stream_options.include_usage=true`, un bloc d'utilisation final est émis avant `[DONE]`.

### Boucle de suivi d'outil

Après avoir reçu `tool_calls`, le client doit exécuter la ou les fonction(s) demandée(s) et envoyer une demande de suivi comprenant :

- message d'appel d'outil de l'assistant précédent
- un ou plusieurs messages `role: "tool"` avec `tool_call_id` correspondants

Cela permet à l'exécution de l'agent du gateway de poursuivre la même boucle de raisonnement et de produire la réponse finale de l'assistant.

## Configuration rapide d'Open WebUI

Pour une connexion de base à Open WebUI :

- URL de base : `http://127.0.0.1:18789/v1`
- URL de base Docker sur macOS : `http://host.docker.internal:18789/v1`
- Clé API : votre jeton bearer Gateway
- Modèle : `openclaw/default`

Comportement attendu :

- `GET /v1/models` doit lister `openclaw/default`
- Open WebUI doit utiliser `openclaw/default` comme identifiant du model de chat
- Si vous souhaitez un provider/model de backend spécifique pour cet agent, définissez le model par défaut normal de l'agent ou envoyez `x-openclaw-model`

Test rapide :

```bash
curl -sS http://127.0.0.1:18789/v1/models \
  -H 'Authorization: Bearer YOUR_TOKEN'
```

Si cela renvoie `openclaw/default`, la plupart des configurations Open WebUI peuvent se connecter avec la même URL de base et le même jeton.

## Exemples

Session stable pour une conversation d'application :

```bash
curl -sS http://127.0.0.1:18789/v1/chat/completions \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "model": "openclaw/default",
    "user": "conv:YOUR_CONVERSATION_ID",
    "messages": [{"role":"user","content":"Summarize my tasks for today"}]
  }'
```

Réutilisez la même valeur `user` lors des appels ultérieurs pour cette conversation afin de continuer la même session d'agent.

Non-streaming :

```bash
curl -sS http://127.0.0.1:18789/v1/chat/completions \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "model": "openclaw/default",
    "messages": [{"role":"user","content":"hi"}]
  }'
```

Streaming :

```bash
curl -N http://127.0.0.1:18789/v1/chat/completions \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: application/json' \
  -H 'x-openclaw-model: openai/gpt-5.4' \
  -d '{
    "model": "openclaw/research",
    "stream": true,
    "messages": [{"role":"user","content":"hi"}]
  }'
```

Lister les modèles :

```bash
curl -sS http://127.0.0.1:18789/v1/models \
  -H 'Authorization: Bearer YOUR_TOKEN'
```

Récupérer un modèle :

```bash
curl -sS http://127.0.0.1:18789/v1/models/openclaw%2Fdefault \
  -H 'Authorization: Bearer YOUR_TOKEN'
```

Créer des embeddings :

```bash
curl -sS http://127.0.0.1:18789/v1/embeddings \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: application/json' \
  -H 'x-openclaw-model: openai/text-embedding-3-small' \
  -d '{
    "model": "openclaw/default",
    "input": ["alpha", "beta"]
  }'
```

Remarques :

- `/v1/models`OpenClaw renvoie les cibles d'agent OpenClaw, et non les catalogues bruts de provider.
- `openclaw/default` est toujours présent afin qu'un identifiant stable fonctionne dans tous les environnements.
- Les substitutions de provider/model de backend doivent être placées dans `x-openclaw-model`OpenAI, et non dans le champ `model` d'OpenAI.
- `/v1/embeddings` prend en charge `input` sous forme de chaîne ou de tableau de chaînes.

## Connexes

- [Référence de configuration](/fr/gateway/configuration-reference)
- [OpenAI](OpenAI/en/providers/openai)
