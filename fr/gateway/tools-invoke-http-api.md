---
summary: "Invoquer un seul outil directement via le point de terminaison HTTP du Gateway"
read_when:
  - Appel d'outils sans exécuter un tour complet d'agent
  - Création d'automatisations nécessitant l'application de la stratégie d'outil
title: "API d'appel d'outils"
---

# Appel d'outils (HTTP)

Le OpenClaw d'Gateway expose un point de terminaison HTTP simple pour invoquer directement un seul outil. Il est toujours activé, mais protégé par l'authentification du Gateway et la stratégie d'outil.

- `POST /tools/invoke`
- Même port que le Gateway (multiplexage WS + HTTP) : `http://<gateway-host>:<port>/tools/invoke`

La taille maximale par défaut de la charge utile est de 2 Mo.

## Authentification

Utilise la configuration d'authentification du Gateway. Envoyez un jeton de porteur :

- `Authorization: Bearer <token>`

Notes :

- Quand `gateway.auth.mode="token"`, utilisez `gateway.auth.token` (ou `OPENCLAW_GATEWAY_TOKEN`).
- Quand `gateway.auth.mode="password"`, utilisez `gateway.auth.password` (ou `OPENCLAW_GATEWAY_PASSWORD`).
- Si `gateway.auth.rateLimit` est configuré et qu'il y a trop d'échecs d'authentification, le point de terminaison renvoie `429` avec `Retry-After`.

## Corps de la requête

```json
{
  "tool": "sessions_list",
  "action": "json",
  "args": {},
  "sessionKey": "main",
  "dryRun": false
}
```

Champs :

- `tool` (chaîne, requis) : nom de l'outil à invoquer.
- `action` (chaîne, facultatif) : mappé dans les arguments si le schéma de l'outil prend en charge `action` et que la charge utile des arguments l'a omis.
- `args` (objet, facultatif) : arguments spécifiques à l'outil.
- `sessionKey` (chaîne, facultatif) : clé de session cible. Si omis ou `"main"`, le Gateway utilise la clé de session principale configurée (respecte `session.mainKey` et l'agent par défaut, ou `global` dans la portée globale).
- `dryRun` (booléen, facultatif) : réservé pour une utilisation future ; actuellement ignoré.

## Stratégie + comportement de routage

La disponibilité des outils est filtrée par la même chaîne de stratégies que celle utilisée par les agents du Gateway :

- `tools.profile` / `tools.byProvider.profile`
- `tools.allow` / `tools.byProvider.allow`
- `agents.<id>.tools.allow` / `agents.<id>.tools.byProvider.allow`
- stratégies de groupe (si la clé de session correspond à un groupe ou un canal)
- stratégie de sous-agent (lors de l'invocation avec une clé de session de sous-agent)

Si un tool n'est pas autorisé par la stratégie, le point de terminaison renvoie **404**.

Le HTTP du Gateway applique également une liste de refus stricte par défaut (même si la stratégie de session autorise le tool) :

- `sessions_spawn`
- `sessions_send`
- `gateway`
- `whatsapp_login`

Vous pouvez personnaliser cette liste de refus via `gateway.tools` :

```json5
{
  gateway: {
    tools: {
      // Additional tools to block over HTTP /tools/invoke
      deny: ["browser"],
      // Remove tools from the default deny list
      allow: ["gateway"],
    },
  },
}
```

Pour aider les stratégies de groupe à résoudre le contexte, vous pouvez éventuellement définir :

- `x-openclaw-message-channel: <channel>` (exemple : `slack`, `telegram`)
- `x-openclaw-account-id: <accountId>` (lorsque plusieurs comptes existent)

## Réponses

- `200` → `{ ok: true, result }`
- `400` → `{ ok: false, error: { type, message } }` (demande non valide ou erreur d'entrée du tool)
- `401` → non autorisé
- `429` → auth limité par débit (`Retry-After` défini)
- `404` → tool non disponible (non trouvé ou non autorisé)
- `405` → méthode non autorisée
- `500` → `{ ok: false, error: { type, message } }` (erreur inattendue d'exécution du tool ; message nettoyé)

## Exemple

```bash
curl -sS http://127.0.0.1:18789/tools/invoke \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "tool": "sessions_list",
    "action": "json",
    "args": {}
  }'
```

import en from "/components/footer/en.mdx";

<en />
