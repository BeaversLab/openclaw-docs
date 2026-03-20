---
summary: "Webhook ingress for wake and isolated agent runs"
read_when:
  - Ajout ou modification de points de terminaison webhook
  - Câblage de systèmes externes dans OpenClaw
title: "Webhooks"
---

# Webhooks

Gateway peut exposer un petit point de terminaison HTTP webhook pour des déclencheurs externes.

## Activer

```json5
{
  hooks: {
    enabled: true,
    token: "shared-secret",
    path: "/hooks",
    // Optional: restrict explicit `agentId` routing to this allowlist.
    // Omit or include "*" to allow any agent.
    // Set [] to deny all explicit `agentId` routing.
    allowedAgentIds: ["hooks", "main"],
  },
}
```

Notes :

- `hooks.token` est requis lorsque `hooks.enabled=true`.
- `hooks.path` est `/hooks` par défaut.

## Auth

Chaque requête doit inclure le jeton de hook. Privilégiez les en-têtes :

- `Authorization: Bearer <token>` (recommandé)
- `x-openclaw-token: <token>`
- Les jetons de chaîne de requête sont rejetés (`?token=...` renvoie `400`).
- Traitez les détenteurs de `hooks.token` comme des appelants de confiance totale pour la surface d'entrée du hook sur cette passerelle. Le contenu de la charge utile du hook n'est toujours pas fiable, mais il ne s'agit pas d'une limite d'authentification distincte pour les non-propriétaires.

## Points de terminaison

### `POST /hooks/wake`

Charge utile :

```json
{ "text": "System line", "mode": "now" }
```

- `text` **obligatoire** (chaîne) : La description de l'événement (par exemple, « Nouvel e-mail reçu »).
- `mode` facultatif (`now` | `next-heartbeat`) : Déclenche ou non un battement de cœur immédiat (par défaut `now`) ou attend la prochaine vérification périodique.

Effet :

- Met en file d'attente un événement système pour la session **principale**
- Si `mode=now`, déclenche un battement de cœur immédiat

### `POST /hooks/agent`

Charge utile :

```json
{
  "message": "Run this",
  "name": "Email",
  "agentId": "hooks",
  "sessionKey": "hook:email:msg-123",
  "wakeMode": "now",
  "deliver": true,
  "channel": "last",
  "to": "+15551234567",
  "model": "openai/gpt-5.2-mini",
  "thinking": "low",
  "timeoutSeconds": 120
}
```

- `message` **obligatoire** (chaîne) : L'invite ou le message pour l'agent à traiter.
- `name` facultatif (chaîne) : Nom lisible par l'homme pour le hook (par exemple, « GitHub »), utilisé comme préfixe dans les résumés de session.
- `agentId` facultatif (chaîne) : Achemine ce hook vers un agent spécifique. Les ID inconnus reviennent à l'agent par défaut. Lorsqu'il est défini, le hook s'exécute en utilisant l'espace de travail et la configuration de l'agent résolu.
- `sessionKey` facultatif (chaîne) : La clé utilisée pour identifier la session de l'agent. Par défaut, ce champ est rejeté sauf si `hooks.allowRequestSessionKey=true`.
- `wakeMode` facultatif (`now` | `next-heartbeat`) : Déclenche ou non un battement de cœur immédiat (par défaut `now`) ou attend la prochaine vérification périodique.
- `deliver` facultatif (booléen) : Si `true`, la réponse de l'agent sera envoyée au channel de messagerie. Par défaut : `true`. Les réponses qui sont uniquement des accusés de réception de battement de cœur sont automatiquement ignorées.
- `channel` facultatif (chaîne) : Le channel de messagerie pour la livraison. Parmi : `last`, `whatsapp`, `telegram`, `discord`, `slack`, `mattermost` (plugin), `signal`, `imessage`, `msteams`. Par défaut : `last`.
- `to` facultatif (chaîne) : L'identifiant du destinataire pour le channel (par exemple, numéro de téléphone pour WhatsApp/Signal, ID de chat pour Telegram, ID de channel pour Discord/Slack/Mattermost (plugin), ID de conversation pour MS Teams). Par défaut : le dernier destinataire de la session principale.
- `model` facultatif (chaîne) : Remplacement du model (par exemple, `anthropic/claude-3-5-sonnet` ou un alias). Doit être dans la liste des models autorisés si restreint.
- `thinking` facultatif (chaîne) : Remplacement du niveau de réflexion (par exemple, `low`, `medium`, `high`).
- `timeoutSeconds` facultatif (nombre) : Durée maximale de l'exécution de l'agent en secondes.

Effet :

- Exécute un tour d'agent **isolé** (sa propre clé de session)
- Publie toujours un résumé dans la session **principale**
- Si `wakeMode=now`, déclenche un battement de cœur immédiat

## Stratégie de clé de session (rupture de compatibilité)

Les remplacements de payload `sessionKey` `/hooks/agent` sont désactivés par défaut.

- Recommandé : définissez un `hooks.defaultSessionKey` fixe et gardez les remplacements de requête désactivés.
- Optionnel : autorisez les remplacements de requête uniquement si nécessaire, et restreignez les préfixes.

Configuration recommandée :

```json5
{
  hooks: {
    enabled: true,
    token: "${OPENCLAW_HOOKS_TOKEN}",
    defaultSessionKey: "hook:ingress",
    allowRequestSessionKey: false,
    allowedSessionKeyPrefixes: ["hook:"],
  },
}
```

Configuration de compatibilité (comportement hérité) :

```json5
{
  hooks: {
    enabled: true,
    token: "${OPENCLAW_HOOKS_TOKEN}",
    allowRequestSessionKey: true,
    allowedSessionKeyPrefixes: ["hook:"], // strongly recommended
  },
}
```

### `POST /hooks/<name>` (mappé)

Les noms de hooks personnalisés sont résolus via `hooks.mappings` (voir la configuration). Un mappage peut transformer des payloads arbitraires en actions `wake` ou `agent`, avec des modèles ou des transformations de code optionnels.

Options de mappage (résumé) :

- `hooks.presets: ["gmail"]` active le mappage Gmail intégré.
- `hooks.mappings` vous permet de définir `match`, `action` et des modèles dans la configuration.
- `hooks.transformsDir` + `transform.module` charge un module JS/TS pour une logique personnalisée.
  - `hooks.transformsDir` (si défini) doit rester dans la racine des transformations sous votre répertoire de configuration OpenClaw (généralement `~/.openclaw/hooks/transforms`).
  - `transform.module` doit être résolu dans le répertoire effectif des transformations (les chemins de traversée/échappement sont rejetés).
- Utilisez `match.source` pour conserver un point de terminaison d'ingestion générique (routage piloté par le payload).
- Les transformations TS nécessitent un chargeur TS (ex. `bun` ou `tsx`) ou du `.js` précompilé à l'exécution.
- Définissez `deliver: true` + `channel`/`to` sur les mappages pour acheminer les réponses vers une surface de chat
  (`channel` par défaut est `last` et revient à WhatsApp).
- `agentId` achemine le hook vers un agent spécifique ; les ID inconnus reviennent à l'agent par défaut.
- `hooks.allowedAgentIds` restreint le routage explicite `agentId`. Omettez-le (ou incluez `*`) pour autoriser n'importe quel agent. Définissez `[]` pour refuser le routage explicite `agentId`.
- `hooks.defaultSessionKey` définit la session par défaut pour les exécutions d'agent de hook lorsque aucune clé explicite n'est fournie.
- `hooks.allowRequestSessionKey` contrôle si les payloads `/hooks/agent` peuvent définir `sessionKey` (par défaut : `false`).
- `hooks.allowedSessionKeyPrefixes` limite facultativement les valeurs explicites `sessionKey` des payloads de requête et des mappages.
- `allowUnsafeExternalContent: true` désactive le wrapper de sécurité de contenu externe pour ce hook
  (dangereux ; uniquement pour les sources internes de confiance).
- `openclaw webhooks gmail setup` écrit la config `hooks.gmail` pour `openclaw webhooks gmail run`.
  Consultez [Gmail Pub/Sub](/fr/automation/gmail-pubsub) pour le flux complet de surveillance Gmail.

## Réponses

- `200` pour `/hooks/wake`
- `200` pour `/hooks/agent` (exécution asynchrone acceptée)
- `401` en cas d'échec de l'authentification
- `429` après des échecs d'authentification répétés du même client (vérifiez `Retry-After`)
- `400` en cas de payload invalide
- `413` en cas de payloads trop volumineux

## Exemples

```bash
curl -X POST http://127.0.0.1:18789/hooks/wake \
  -H 'Authorization: Bearer SECRET' \
  -H 'Content-Type: application/json' \
  -d '{"text":"New email received","mode":"now"}'
```

```bash
curl -X POST http://127.0.0.1:18789/hooks/agent \
  -H 'x-openclaw-token: SECRET' \
  -H 'Content-Type: application/json' \
  -d '{"message":"Summarize inbox","name":"Email","wakeMode":"next-heartbeat"}'
```

### Utiliser un modèle différent

Ajoutez `model` au payload de l'agent (ou au mappage) pour remplacer le modèle pour cette exécution :

```bash
curl -X POST http://127.0.0.1:18789/hooks/agent \
  -H 'x-openclaw-token: SECRET' \
  -H 'Content-Type: application/json' \
  -d '{"message":"Summarize inbox","name":"Email","model":"openai/gpt-5.2-mini"}'
```

Si vous appliquez `agents.defaults.models`, assurez-vous que le modèle de remplacement y est inclus.

```bash
curl -X POST http://127.0.0.1:18789/hooks/gmail \
  -H 'Authorization: Bearer SECRET' \
  -H 'Content-Type: application/json' \
  -d '{"source":"gmail","messages":[{"from":"Ada","subject":"Hello","snippet":"Hi"}]}'
```

## Sécurité

- Gardez les points de terminaison des hooks derrière une boucle locale, un tailnet ou un proxy inverse de confiance.
- Utilisez un jeton de hook dédié ; ne réutilisez pas les jetons d'authentification de la passerelle.
- Préférez un agent de hook dédié avec des `tools.profile` strictes et de la sandboxing afin que l'entrée du hook ait un rayon d'impact plus limité.
- Les échecs d'authentification répétés sont limités par taux par adresse client pour ralentir les tentatives de force brute.
- Si vous utilisez le routage multi-agent, définissez `hooks.allowedAgentIds` pour limiter la sélection explicite `agentId`.
- Conservez `hooks.allowRequestSessionKey=false` à moins que vous ne nécessitiez des sessions sélectionnées par l'appelant.
- Si vous activez la `sessionKey` de la requête, restreignez `hooks.allowedSessionKeyPrefixes` (par exemple, `["hook:"]`).
- Évitez d'inclure des payloads bruts sensibles dans les journaux de webhooks.
- Les payloads de hook sont traités comme non fiables et enveloppés avec des limites de sécurité par défaut.
  Si vous devez désactiver cela pour un hook spécifique, définissez `allowUnsafeExternalContent: true`
  dans le mappage de ce hook (dangereux).

import en from "/components/footer/en.mdx";

<en />
