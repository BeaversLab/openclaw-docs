---
summary: "Expose un point de terminaison HTTP /v1/chat/completions compatible OpenAI depuis le Gateway"
read_when:
  - Integrating tools that expect OpenAI Chat Completions
title: "OpenAI chat completions"
---

Le OpenClaw d'Gateway peut servir un petit point de terminaison de complétions de chat compatible OpenAI.

Ce point de terminaison est **désactivé par défaut**. Activez-le d'abord dans la configuration.

- `POST /v1/chat/completions`
- Même port que la passerelle (multiplexage WS + HTTP) : `http://<gateway-host>:<port>/v1/chat/completions`

Lorsque la surface HTTP compatible Gateway du OpenAI est activée, elle sert également :

- `GET /v1/models`
- `GET /v1/models/{id}`
- `POST /v1/embeddings`
- `POST /v1/responses`

En coulisses, les requêtes sont exécutées en tant que processus d'agent de passerelle normal (même chemin de code que `openclaw agent`), donc le routage/les autorisations/la configuration correspondent à ceux de votre passerelle.

## Authentification

Utilise la configuration d'authentification de la passerelle.

Chemins d'authentification HTTP courants :

- authentification par secret partagé (`gateway.auth.mode="token"` ou `"password"`) :
  `Authorization: Bearer <token-or-password>`
- authentification HTTP de confiance portant une identité (`gateway.auth.mode="trusted-proxy"`) :
  acheminez via le proxy configuré tenant compte de l'identité et laissez-le injecter les
  en-têtes d'identité requis
- authentification ouverte d'entrée privée (`gateway.auth.mode="none"`) :
  aucun en-tête d'authentification requis

Notes :

- Lorsque `gateway.auth.mode="token"`, utilisez `gateway.auth.token` (ou `OPENCLAW_GATEWAY_TOKEN`).
- Lorsque `gateway.auth.mode="password"`, utilisez `gateway.auth.password` (ou `OPENCLAW_GATEWAY_PASSWORD`).
- Lorsque `gateway.auth.mode="trusted-proxy"`, la requête HTTP doit provenir d'une
  source de proxy de confiance configurée ; les proxies de bouclage sur le même hôte nécessitent une `gateway.auth.trustedProxy.allowLoopback = true` explicite.
- Les appelants internes sur le même hôte qui contournent le proxy peuvent utiliser
  `gateway.auth.password` / `OPENCLAW_GATEWAY_PASSWORD` comme solution de repli
  directe locale. Toute preuve d'en-tête `Forwarded`, `X-Forwarded-*`, ou `X-Real-IP`
  garde la requête sur le chemin du proxy de confiance à la place.
- Si `gateway.auth.rateLimit` est configuré et que trop d'échecs d'authentification se produisent, le point de terminaison renvoie `429` avec `Retry-After`.

## Limite de sécurité (important)

Traitez ce point de terminaison comme une surface d'**accès opérateur complet** pour l'instance de passerelle.

- L'authentification HTTP par porteur ici n'est pas un modèle de portée étroit par utilisateur.
- Un jeton/mot de passe Gateway valide pour ce point de terminaison doit être traité comme une information d'identification de propriétaire/opérateur.
- Les requêtes passent par le même chemin d'agent du plan de contrôle que les actions de l'opérateur de confiance.
- Il n'y a pas de limite d'outil distincte non-propriétaire/par-utilisateur sur ce point de terminaison ; une fois qu'un appelant réussit l'authentification Gateway ici, OpenClaw traite cet appelant comme un opérateur de confiance pour cette passerelle.
- Pour les modes d'authentification à secret partagé (`token` et `password`), le point de terminaison restaure les paramètres par défaut complets de l'opérateur normal, même si l'appelant envoie un en-tête `x-openclaw-scopes` plus restreint.
- Les modes HTTP porteurs d'identité de confiance (par exemple authentification par proxy de confiance ou `gateway.auth.mode="none"`) honorent `x-openclaw-scopes` lorsqu'il est présent et, sinon, reviennent à l'ensemble des portées par défaut de l'opérateur normal.
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
- modes HTTP porteurs d'identité de confiance (par exemple authentification par proxy de confiance, ou `gateway.auth.mode="none"` sur ingress privé)
  - authentifier une identité de confiance externe ou une limite de déploiement
  - honorent `x-openclaw-scopes` lorsque l'en-tête est présent
  - revenir à l'ensemble normal des portées par défaut de l'opérateur lorsque l'en-tête est absent
  - ne perdent la sémantique de propriétaire que lorsque l'appelant restreint explicitement les portées et omet `operator.admin`

Voir [Sécurité](/fr/gateway/security) et [Accès à distance](/fr/gateway/remote).

## Contrat de modèle centré sur l'agent

OpenClaw traite le champ OpenAI `model` comme une **cible d'agent**, et non comme un identifiant brut de model de provider.

- `model: "openclaw"` achemine vers l'agent par défaut configuré.
- `model: "openclaw/default"` achemine également vers l'agent par défaut configuré.
- `model: "openclaw/<agentId>"` achemine vers un agent spécifique.

En-têtes de demande facultatifs :

- `x-openclaw-model: <provider/model-or-bare-id>` remplace le model backend pour l'agent sélectionné.
- `x-openclaw-agent-id: <agentId>` reste pris en charge en tant que substitution de compatibilité.
- `x-openclaw-session-key: <sessionKey>` contrôle entièrement le routage des sessions.
- `x-openclaw-message-channel: <channel>` définit le contexte de canal d'entrée synthétique pour les invites et les stratégies tenant compte du canal.

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

Par défaut, le point de terminaison est **sans état par demande** (une nouvelle clé de session est générée à chaque appel).

Si la requête inclut une chaîne OpenAI `user`, le Gateway en dérive une clé de session stable, permettant ainsi aux appels répétés de partager une session d'agent.

## Pourquoi cette interface est importante

Il s'agit de l'ensemble de compatité le plus impactant pour les interfaces et les outils auto-hébergés :

- La plupart des configurations Open WebUI, LobeChat et LibreChat s'attendent à `/v1/models`.
- De nombreux systèmes RAG s'attendent à `/v1/embeddings`.
- Les clients de chat OpenAI existants peuvent généralement commencer avec `/v1/chat/completions`.
- Les clients plus natifs aux agents préfèrent de plus en plus `/v1/responses`.

## Liste des modèles et routage des agents

<AccordionGroup>
  <Accordion title="Que retourne `/v1/models` ?">
    Une liste de cibles d'agent OpenClaw.

    Les identifiants retournés sont des entrées `openclaw`, `openclaw/default` et `openclaw/<agentId>`.
    Utilisez-les directement comme valeurs OpenAI `model`.

  </Accordion>
  <Accordion title="`/v1/models` liste-t-il les agents ou les sous-agents ?">
    Il liste les cibles d'agent de premier niveau, pas les modèles de fournisseur backend ni les sous-agents.

    Les sous-agents restent une topologie d'exécution interne. Ils n'apparaissent pas comme pseudo-modèles.

  </Accordion>
  <Accordion title="Pourquoi `openclaw/default` est-il inclus ?">
    `openclaw/default` est l'alias stable pour l'agent par défaut configuré.

    Cela signifie que les clients peuvent continuer à utiliser un identifiant prévisible, même si l'identifiant réel de l'agent par défaut change entre les environnements.

  </Accordion>
  <Accordion title="Comment puis-je remplacer le modèle backend ?">
    Utilisez `x-openclaw-model`.

    Exemples :
    `x-openclaw-model: openai/gpt-5.4`
    `x-openclaw-model: gpt-5.5`

    Si vous l'omettez, l'agent sélectionné s'exécute avec son choix de modèle configuré normalement.

  </Accordion>
  <Accordion title="Comment les embeddings s'intègrent-ils à ce contrat ?">
    `/v1/embeddings` utilise les mêmes identifiants `model` d'agent cible.

    Utilisez `model: "openclaw/default"` ou `model: "openclaw/<agentId>"`.
    Lorsque vous avez besoin d'un modèle d'intégration spécifique, envoyez-le dans `x-openclaw-model`.
    Sans cet en-tête, la demande est transmise à la configuration d'intégration normale de l'agent sélectionné.

  </Accordion>
</AccordionGroup>

## Streaming (SSE)

Définissez `stream: true` pour recevoir les événements envoyés par le serveur (SSE) :

- `Content-Type: text/event-stream`
- Chaque ligne d'événement est `data: <json>`
- Le flux se termine par `data: [DONE]`

## Contrat d'outil de chat

`/v1/chat/completions` prend en charge un sous-ensemble d'outils de fonction compatible avec les clients Chat OpenAI courants.

### Champs de demande pris en charge

- `tools` : tableau de `{ "type": "function", "function": { ... } }`
- `tool_choice` : `"auto"`, `"none"`
- `messages[*].role: "tool"` les tours de suivi
- `messages[*].tool_call_id` pour lier les résultats des outils à un appel d'outil antérieur
- `max_completion_tokens` : nombre ; limite par appel pour le nombre total de jetons de complétion (jetons de raisonnement inclus). Nom de champ actuel des Complétions de chat OpenAI ; préféré lorsque `max_completion_tokens` et `max_tokens` sont envoyés.
- `max_tokens` : nombre ; alias hérité accepté pour la rétrocompatibilité. Ignoré lorsque `max_completion_tokens` est également présent.
- `temperature` : nombre ; température d'échantillonnage de meilleure approximation transmise au fournisseur en amont via le channel des paramètres de flux de l'agent.
- `top_p` : nombre ; échantillonnage de noyau de meilleure approximation transmis au fournisseur en amont via le channel des paramètres de flux de l'agent.

Lorsque l'un des champs de limite de jetons est défini, la valeur est transmise au fournisseur amont via le canal de paramètres de flux de l'agent. Le nom réel du champ filaire envoyé au fournisseur amont est choisi par le transport du fournisseur : `max_completion_tokens`OpenAI pour les points de termination de la famille OpenAI, et `max_tokens` pour les fournisseurs qui n'acceptent que le nom hérité (tel que Mistral et Chutes). Les champs d'échantillonnage (`temperature`, `top_p`) suivent le même canal de paramètres de flux ; le backend Codex Responses basé sur ChatGPT les supprime côté serveur puisqu'il utilise un échantillonnage fixe.

### Variantes non prises en charge

Le point de terminaison renvoie `400 invalid_request_error` pour les variantes d'outils non prises en charge, notamment :

- `tools` non-tableau
- entrées d'outil non-fonction
- `tool.function.name` manquant
- variantes `tool_choice` telles que `allowed_tools` et `custom`
- `tool_choice: "required"` (pas encore appliqué à l'exécution ; sera pris en charge une fois l'application stricte implémentée)
- `tool_choice: { "type": "function", "function": { "name": "..." } }` (même raisonnement que `required`)
- valeurs `tool_choice.function.name` qui ne correspondent pas au `tools` fourni

### Forme de la réponse de l'outil en non-streaming

Lorsque l'agent décide d'appeler des outils, la réponse utilise :

- `choices[0].finish_reason = "tool_calls"`
- entrées `choices[0].message.tool_calls[]` avec :
  - `id`
  - `type: "function"`
  - `function.name`
  - `function.arguments` (chaîne JSON)

Les commentaires de l'assistant avant l'appel de l'outil sont renvoyés dans `choices[0].message.content` (possiblement vide).

### Forme de la réponse de l'outil en streaming

Lorsque `stream: true`, les appels d'outils sont émis sous forme de blocs SSE incrémentiels :

- delta de rôle assistant initial
- deltas de commentaires assistant facultatifs
- un ou plusieurs blocs `delta.tool_calls` transportant l'identité de l'outil et des fragments d'arguments
- bloc final avec `finish_reason: "tool_calls"`
- `data: [DONE]`

Si `stream_options.include_usage=true`, un bloc d'utilisation final est émis avant `[DONE]`.

### Boucle de suivi des outils

Après avoir reçu `tool_calls`, le client doit exécuter la ou les fonction(s) demandée(s) et envoyer une requête de suivi qui inclut :

- le message d'appel d'outil de l'assistant précédent
- un ou plusieurs messages `role: "tool"` avec `tool_call_id` correspondants

Cela permet à l'exécution de l'agent du Gateway de poursuivre la même boucle de raisonnement et de produire la réponse finale de l'assistant.

## Configuration rapide d'Open WebUI

Pour une connexion de base à Open WebUI :

- URL de base : `http://127.0.0.1:18789/v1`
- URL de base Docker sur macOS : DockermacOS`http://host.docker.internal:18789/v1`
- Clé API : votre jeton bearer du Gateway
- Modèle : `openclaw/default`

Comportement attendu :

- `GET /v1/models` doit lister `openclaw/default`
- Open WebUI doit utiliser `openclaw/default` comme identifiant du modèle de chat
- Si vous souhaitez un fournisseur/modèle de backend spécifique pour cet agent, définissez le modèle par défaut normal de l'agent ou envoyez `x-openclaw-model`

Test rapide :

```bash
curl -sS http://127.0.0.1:18789/v1/models \
  -H 'Authorization: Bearer YOUR_TOKEN'
```

Si cela renvoie `openclaw/default`, la plupart des configurations d'Open WebUI peuvent se connecter avec la même URL de base et le même jeton.

## Exemples

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

- `/v1/models`OpenClaw renvoie les cibles d'agent OpenClaw, et non les catalogues bruts des fournisseurs.
- `openclaw/default` est toujours présent, de sorte qu'un identifiant stable fonctionne sur différents environnements.
- Les substitutions de fournisseur/modèle backend doivent se trouver dans `x-openclaw-model`OpenAI, et non dans le champ `model` d'OpenAI.
- `/v1/embeddings` prend en charge `input` sous forme de chaîne ou de tableau de chaînes.

## Connexes

- [Référence de configuration](/fr/gateway/configuration-reference)
- [OpenAI](OpenAI/en/providers/openai)
