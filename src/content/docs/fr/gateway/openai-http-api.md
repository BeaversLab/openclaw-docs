---
summary: "Expose un point de terminaison HTTP /v1/chat/completions compatible OpenAI depuis le Gateway"
read_when:
  - Integrating tools that expect OpenAI Chat Completions
title: "OpenAI chat completions"
---

La passerelle d'OpenClaw peut servir un petit point de terminaison de complétions de chat compatible avec OpenAI.

Ce point de terminaison est **désactivé par défaut**. Activez-le d'abord dans la configuration.

- `POST /v1/chat/completions`
- Même port que la passerelle (multiplexage WS + HTTP) : `http://<gateway-host>:<port>/v1/chat/completions`

Lorsque la surface HTTP compatible OpenAI de la passerelle est activée, elle sert également :

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
  source de proxy de confiance non bouclage configurée ; les proxys en boucle sur le même hôte ne
  satisfont pas ce mode.
- Si `gateway.auth.rateLimit` est configuré et que trop d'échecs d'authentification se produisent, le point de terminaison renvoie `429` avec `Retry-After`.

## Limite de sécurité (important)

Traitez ce point de terminaison comme une surface d'**accès complet opérateur** pour l'instance de la passerelle.

- L'authentification par porteur HTTP ici n'est pas un modèle à portée étroite par utilisateur.
- Un jeton/mot de passe de passerelle valide pour ce point de terminaison doit être traité comme une information d'identification de propriétaire/opérateur.
- Les requêtes passent par le même chemin d'agent du plan de contrôle que les actions de l'opérateur de confiance.
- Il n'y a pas de limite d'outil distincte non propriétaire/par utilisateur sur ce point de terminaison ; une fois qu'un appelant a passé l'authentification Gateway ici, OpenClaw traite cet appelant comme un opérateur de confiance pour cette passerelle.
- Pour les modes d'authentification par secret partagé (`token` et `password`), le point de terminaison restaure les paramètres par défaut complets de l'opérateur, même si l'appelant envoie un en-tête `x-openclaw-scopes` plus restreint.
- Les modes HTTP porteurs d'une identité de confiance (par exemple authentification par proxy de confiance ou `gateway.auth.mode="none"`) honorent le `x-openclaw-scopes` lorsqu'il est présent et, sinon, reviennent à l'ensemble normal des étendues par défaut de l'opérateur.
- Si la stratégie de l'agent cible autorise les outils sensibles, ce point de terminaison peut les utiliser.
- Gardez ce point de terminaison uniquement en boucle locale/tailnet/accès privé privé ; ne l'exposez pas directement à l'Internet public.

Matrice d'authentification :

- `gateway.auth.mode="token"` ou `"password"` + `Authorization: Bearer ...`
  - prouve la possession du secret d'opérateur de passerelle partagé
  - ignore les `x-openclaw-scopes` plus restreints
  - restaure l'ensemble complet des étendues par défaut de l'opérateur :
    `operator.admin`, `operator.approvals`, `operator.pairing`,
    `operator.read`, `operator.talk.secrets`, `operator.write`
  - traite les tours de conversation sur ce point de terminaison comme des tours d'expéditeur-propriétaire
- modes HTTP porteurs d'une identité de confiance (par exemple authentification par proxy de confiance, ou `gateway.auth.mode="none"` sur un accès privé)
  - authentifie une identité de confiance externe ou une limite de déploiement
  - honore le `x-openclaw-scopes` lorsque l'en-tête est présent
  - revient à l'ensemble normal des étendues par défaut de l'opérateur lorsque l'en-tête est absent
  - ne perd la sémantique de propriétaire que lorsque l'appelant réduit explicitement les étendues et omet `operator.admin`

Voir [Sécurité](/fr/gateway/security) et [Accès à distance](/fr/gateway/remote).

## Contrat de modèle d'abord par agent

OpenClaw traite le champ OpenAI `model` comme une **cible d'agent**, et non comme un identifiant de modèle de fournisseur brut.

- `model: "openclaw"` achemine vers l'agent par défaut configuré.
- `model: "openclaw/default"` achemine également vers l'agent par défaut configuré.
- `model: "openclaw/<agentId>"` achemine vers un agent spécifique.

En-têtes de demande facultatifs :

- `x-openclaw-model: <provider/model-or-bare-id>` remplace le modèle backend pour l'agent sélectionné.
- `x-openclaw-agent-id: <agentId>` reste pris en charge en tant que remplacement de compatibilité.
- `x-openclaw-session-key: <sessionKey>` contrôle entièrement le routage de session.
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

Si la demande inclut une chaîne OpenAI `user`, le Gateway en dérive une clé de session stable, de sorte que les appels répétés peuvent partager une session d'agent.

## Pourquoi cette surface est importante

Il s'agit de l'ensemble de compatibilité le plus rentable pour les interfaces et les outils auto-hébergés :

- La plupart des configurations Open WebUI, LobeChat et LibreChat s'attendent à `/v1/models`.
- De nombreux systèmes RAG s'attendent à `/v1/embeddings`.
- Les clients de chat OpenAI existants peuvent généralement commencer avec `/v1/chat/completions`.
- Les clients plus natifs aux agents préfèrent de plus en plus `/v1/responses`.

## Liste des modèles et routage des agents

<AccordionGroup>
  <Accordion title="Que renvoie `/v1/models` ?">
    Une liste de cibles d'agent OpenClaw.

    Les identifiants renvoyés sont des entrées `openclaw`, `openclaw/default` et `openclaw/<agentId>`.
    Utilisez-les directement comme valeurs OpenAI `model`.

  </Accordion>
  <Accordion title="`/v1/models` liste-t-il les agents ou les sous-agents ?">
    Il répertorie les cibles d'agent de niveau supérieur, et non les modèles de fournisseur backend ni les sous-agents.

    Les sous-agents restent une topologie d'exécution interne. Ils n'apparaissent pas comme des pseudo-modèles.

  </Accordion>
  <Accordion title="Pourquoi `openclaw/default` est-il inclus ?">
    `openclaw/default` est l'alias stable pour l'agent par défaut configuré.

    Cela signifie que les clients peuvent continuer à utiliser un identifiant prévisible, même si l'identifiant réel de l'agent par défaut change entre les environnements.

  </Accordion>
  <Accordion title="Comment remplacer le modèle backend ?">
    Utilisez `x-openclaw-model`.

    Exemples :
    `x-openclaw-model: openai/gpt-5.4`
    `x-openclaw-model: gpt-5.5`

    Si vous l'omettez, l'agent sélectionné s'exécute avec son choix de modèle configuré normalement.

  </Accordion>
  <Accordion title="Comment les intégrations s'intègrent-elles à ce contrat ?">
    `/v1/embeddings` utilise les mêmes identifiants cibles d'agent `model`.

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

## Configuration rapide d'Open WebUI

Pour une connexion de base Open WebUI :

- URL de base : `http://127.0.0.1:18789/v1`
- Docker sur macOS URL de base : `http://host.docker.internal:18789/v1`
- Clé API : votre jeton de porteur Gateway
- Modèle : `openclaw/default`

Comportement attendu :

- `GET /v1/models` devrait lister `openclaw/default`
- Open WebUI devrait utiliser `openclaw/default` comme identifiant de modèle de chat
- Si vous souhaitez un fournisseur/modèle backend spécifique pour cet agent, définissez le modèle par défaut normal de l'agent ou envoyez `x-openclaw-model`

Test rapide :

```bash
curl -sS http://127.0.0.1:18789/v1/models \
  -H 'Authorization: Bearer YOUR_TOKEN'
```

Si cela renvoie `openclaw/default`, la plupart des configurations Open WebUI peuvent se connecter avec la même URL de base et le même jeton.

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

Créer des intégrations :

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

Notes :

- `/v1/models` renvoie les cibles d'agent OpenClaw, et non les catalogues bruts de fournisseurs.
- `openclaw/default` est toujours présent, donc un identifiant stable fonctionne dans tous les environnements.
- Les substitutions de fournisseur/model backend doivent être placées dans `x-openclaw-model`, et non dans le champ OpenAI `model`.
- `/v1/embeddings` prend en charge `input` sous forme de chaîne ou de tableau de chaînes.

## Connexe

- [Référence de configuration](/fr/gateway/configuration-reference)
- [OpenAI](/fr/providers/openai)
