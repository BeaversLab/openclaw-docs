---
summary: "Invoquer un seul tool directement via le point de terminaison HTTP du Gateway"
read_when:
  - Calling tools without running a full agent turn
  - Building automations that need tool policy enforcement
title: "Outil d'appel API"
---

# Outil d'appel (HTTP)

Le OpenClaw de Gateway expose un point de terminaison HTTP simple pour invoquer un seul tool directement. Il est toujours activé et utilise l'authentification Gateway ainsi que la politique de tool, mais les appelants qui transmettent l'authentification Bearer Gateway sont traités comme des opérateurs de confiance pour cette gateway.

- `POST /tools/invoke`
- Même port que le Gateway (multiplexage WS + HTTP) : `http://<gateway-host>:<port>/tools/invoke`

La taille maximale par défaut de la charge utile est de 2 Mo.

## Authentification

Utilise la configuration d'auth du Gateway. Envoyer un jeton porteur :

- `Authorization: Bearer <token>`

Remarques :

- Lorsque `gateway.auth.mode="token"`, utilisez `gateway.auth.token` (ou `OPENCLAW_GATEWAY_TOKEN`).
- Lorsque `gateway.auth.mode="password"`, utilisez `gateway.auth.password` (ou `OPENCLAW_GATEWAY_PASSWORD`).
- Si `gateway.auth.rateLimit` est configuré et que trop d'échecs d'auth se produisent, le point de terminaison renvoie `429` avec `Retry-After`.
- Traitez ces identifiants comme un secret d'opérateur à accès complet pour cette gateway. Ce n'est pas un jeton API délimité pour un rôle `/tools/invoke` plus restreint.

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

- `tool` (chaîne, requis) : nom du tool à invoquer.
- `action` (chaîne, facultatif) : mappé dans les args si le schéma du tool prend en charge `action` et que la charge utile des args l'a omis.
- `args` (objet, facultatif) : arguments spécifiques au tool.
- `sessionKey` (chaîne, facultatif) : clé de session cible. Si omis ou `"main"`, le Gateway utilise la clé de session principale configurée (respecte `session.mainKey` et l'agent par défaut, ou `global` dans la portée globale).
- `dryRun` (booléen, facultatif) : réservé pour une utilisation future ; actuellement ignoré.

## Politique + comportement de routage

La disponibilité des tools est filtrée par la même chaîne de politiques utilisée par les agents Gateway :

- `tools.profile` / `tools.byProvider.profile`
- `tools.allow` / `tools.byProvider.allow`
- `agents.<id>.tools.allow` / `agents.<id>.tools.byProvider.allow`
- politiques de groupe (si la clé de session correspond à un groupe ou un canal)
- politique de sous-agent (lors de l'invocation avec une clé de session de sous-agent)

Si un tool n'est pas autorisé par la stratégie, le point de terminaison renvoie **404**.

Notes importantes sur les limites :

- `POST /tools/invoke` se trouve dans le même compartiment d'opérateur de confiance que d'autres API HTTP Gateway telles que `/v1/chat/completions`, `/v1/responses` et `/api/channels/*`.
- Les approbations d'exécution sont des garde-fous pour l'opérateur, et non une limite d'autorisation distincte pour ce point de terminaison HTTP. Si un tool est accessible ici via l'authentification Gateway + la politique de tool, `/tools/invoke` n'ajoute pas de prompt d'approbation supplémentaire par appel.
- Ne partagez pas les identifiants Bearer Gateway avec des appelants non fiables. Si vous avez besoin d'une séparation entre les limites de confiance, exécutez des gateways séparées (et idéalement des utilisateurs/hôtes OS distincts).

Le HTTP du Gateway applique également une liste de refus stricte par défaut (même si la stratégie de session autorise l'outil) :

- `cron`
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

Pour aider les stratégies de groupe à résoudre le contexte, vous pouvez définir de manière facultative :

- `x-openclaw-message-channel: <channel>` (exemple : `slack`, `telegram`)
- `x-openclaw-account-id: <accountId>` (lorsque plusieurs comptes existent)

## Réponses

- `200` → `{ ok: true, result }`
- `400` → `{ ok: false, error: { type, message } }` (demande non valide ou erreur d'entrée de l'outil)
- `401` → non autorisé
- `429` → auth limitée par le taux (`Retry-After` défini)
- `404` → outil non disponible (non trouvé ou non autorisé)
- `405` → méthode non autorisée
- `500` → `{ ok: false, error: { type, message } }` (erreur inattendue d'exécution de l'outil ; message nettoyé)

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

import fr from "/components/footer/fr.mdx";

<fr />
