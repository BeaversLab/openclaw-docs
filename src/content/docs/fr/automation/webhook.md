---
summary: "Entrée webhook pour le réveil et les exécutions d'agent isolées"
read_when:
  - Adding or changing webhook endpoints
  - Wiring external systems into OpenClaw
title: "Webhooks"
---

# Webhooks

Le Gateway peut exposer un petit point de terminaison HTTP webhook pour des déclencheurs externes.

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

Notes :

- `hooks.token` est requis lorsque `hooks.enabled=true`.
- `hooks.path` est défini par défaut sur `/hooks`.

## Auth

Chaque requête doit inclure le jeton du hook. Privilégiez les en-têtes :

- `Authorization: Bearer <token>` (recommandé)
- `x-openclaw-token: <token>`
- Les jetons de chaîne de requête sont rejetés (`?token=...` renvoie `400`).
- Traiter les détenteurs de `hooks.token` comme des appelants de confiance totale pour la surface d'entrée du hook sur cette passerelle. Le contenu de la charge utile du hook n'est toujours pas fiable, mais ce n'est pas une frontière d'authentification non-propriétaire distincte.

## Points de terminaison

### `POST /hooks/wake`

Charge utile :

```json
{ "text": "System line", "mode": "now" }
```

- `text` **requis** (chaîne) : La description de l'événement (par exemple, « Nouvel e-mail reçu »).
- `mode` facultatif (`now` | `next-heartbeat`) : S'il faut déclencher un battement de cœur immédiat (par défaut `now`) ou attendre la prochaine vérification périodique.

Effet :

- Met en file d'attente un événement système pour la **session** principale
- Si `mode=now`, déclenche un battement de cœur immédiat

### `POST /hooks/agent`

Charge utile :

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

- `message` **requis** (chaîne) : L'invite ou le message que l'agent doit traiter.
- `name` facultatif (chaîne) : Nom lisible par l'homme pour le hook (par exemple, « GitHub »), utilisé comme préfixe dans les résumés de session.
- `agentId` facultatif (chaîne) : Achemine ce hook vers un agent spécifique. Les ID inconnus reviennent à l'agent par défaut. Lorsqu'il est défini, le hook s'exécute en utilisant l'espace de travail et la configuration de l'agent résolu.
- `sessionKey` facultatif (chaîne) : La clé utilisée pour identifier la session de l'agent. Par défaut, ce champ est rejeté sauf si `hooks.allowRequestSessionKey=true`.
- `wakeMode` facultatif (`now` | `next-heartbeat`) : S'il faut déclencher un battement de cœur immédiat (par défaut `now`) ou attendre la prochaine vérification périodique.
- `deliver` facultatif (booléen) : Si `true`, la réponse de l'agent sera envoyée au channel de messagerie. La valeur par défaut est `true`. Les réponses qui ne sont que des accusés de réception de battement de cœur sont automatiquement ignorées.
- `channel` optionnel (chaîne) : Le canal de messagerie pour la livraison. Canaux principaux : `last`, `whatsapp`, `telegram`, `discord`, `slack`, `signal`, `imessage`, `irc`, `googlechat`, `line`. Canaux d'extension (plugins) : `msteams`, `mattermost` et autres. La valeur par défaut est `last`.
- `to` optionnel (chaîne) : L'identifiant du destinataire pour le canal (par exemple, numéro de téléphone pour WhatsApp/Signal, ID de chat pour Telegram, ID de canal pour Discord/Slack/Mattermost (plugin), ID de conversation pour Microsoft Teams). La valeur par défaut est le dernier destinataire de la session principale.
- `model` optionnel (chaîne) : Remplacement du model (par exemple `anthropic/claude-sonnet-4-6` ou un alias). Doit figurer dans la liste des models autorisés si une restriction est appliquée.
- `thinking` optionnel (chaîne) : Remplacement du niveau de réflexion (par exemple `low`, `medium`, `high`).
- `timeoutSeconds` optionnel (nombre) : Durée maximale de l'exécution de l'agent en secondes.

Effet :

- Exécute un tour d'agent **isolé** (sa propre clé de session)
- Publie toujours un résumé dans la session **principale**
- Si `wakeMode=now`, déclenche un heartbeat immédiat

## Politique de clé de session (rupture de compatibilité)

Les remplacements de payload `/hooks/agent` `sessionKey` sont désactivés par défaut.

- Recommandé : définir une `hooks.defaultSessionKey` fixe et désactiver les remplacements de requête.
- Optionnel : autoriser les remplacements de requête uniquement lorsque nécessaire, et restreindre les préfixes.

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

Configuration de compatibilité (ancien comportement) :

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

- `hooks.presets: ["gmail"]` active le mappage intégré de Gmail.
- `hooks.mappings` vous permet de définir `match`, `action` et des modèles dans la configuration.
- `hooks.transformsDir` + `transform.module` charge un module JS/TS pour une logique personnalisée.
  - `hooks.transformsDir` (si défini) doit rester dans la racine des transformations sous votre répertoire de configuration OpenClaw (généralement `~/.openclaw/hooks/transforms`).
  - `transform.module` doit être résolu dans le répertoire effectif des transformations (les chemins de traversée/échappement sont rejetés).
- Utilisez `match.source` pour conserver un point de terminaison d'ingestion générique (routage basé sur la charge utile).
- Les transformations TS nécessitent un chargeur TS (par exemple `bun` ou `tsx`) ou `.js` précompilé à l'exécution.
- Définissez `deliver: true` + `channel`/`to` sur les mappages pour router les réponses vers une surface de chat
  (`channel` par défaut est `last` et revient à WhatsApp).
- `agentId` route le hook vers un agent spécifique ; les ID inconnus reviennent à l'agent par défaut.
- `hooks.allowedAgentIds` restreint le routage explicite `agentId`. Omettez-le (ou incluez `*`) pour autoriser n'importe quel agent. Définissez `[]` pour refuser le routage explicite `agentId`.
- `hooks.defaultSessionKey` définit la session par défaut pour les exécutions de l'agent de hook lorsqu'aucune clé explicite n'est fournie.
- `hooks.allowRequestSessionKey` contrôle si les charges utiles `/hooks/agent` peuvent définir `sessionKey` (par défaut : `false`).
- `hooks.allowedSessionKeyPrefixes` restreint facultativement les valeurs explicites `sessionKey` des charges utiles de requête et des mappages.
- `allowUnsafeExternalContent: true` désactive le wrapper de sécurité de contenu externe pour ce hook
  (dangereux ; uniquement pour les sources internes de confiance).
- `openclaw webhooks gmail setup` écrit la configuration `hooks.gmail` pour `openclaw webhooks gmail run`.
  Voir [Gmail Pub/Sub](/fr/automation/gmail-pubsub) pour le flux complet de surveillance Gmail.

## Réponses

- `200` pour `/hooks/wake`
- `200` pour `/hooks/agent` (exécution asynchrone acceptée)
- `401` en cas d'échec de l'authentification
- `429` après des échecs d'authentification répétés du même client (vérifiez `Retry-After`)
- `400` en cas de charge utile non valide
- `413` en cas de charges utiles trop volumineuses

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

Ajoutez `model` à la charge utile de l'agent (ou au mappage) pour remplacer le modèle pour cette exécution :

```bash
curl -X POST http://127.0.0.1:18789/hooks/agent \
  -H 'x-openclaw-token: SECRET' \
  -H 'Content-Type: application/json' \
  -d '{"message":"Summarize inbox","name":"Email","model":"openai/gpt-5.2-mini"}'
```

Si vous appliquez `agents.defaults.models`, assurez-vous que le modèle de substitution y est inclus.

```bash
curl -X POST http://127.0.0.1:18789/hooks/gmail \
  -H 'Authorization: Bearer SECRET' \
  -H 'Content-Type: application/json' \
  -d '{"source":"gmail","messages":[{"from":"Ada","subject":"Hello","snippet":"Hi"}]}'
```

## Sécurité

- Gardez les points de terminaison des hooks derrière boucle locale (loopback), tailnet ou un proxy inverse de confiance.
- Utilisez un jeton de hook dédié ; ne réutilisez pas les jetons d'authentification de la passerelle.
- Privilégiez un agent de hook dédié avec des `tools.profile` strictes et un bac à sable (sandboxing) pour que l'entrée du hook ait un rayon d'impact plus restreint.
- Les échecs d'authentification répétés sont limités par taux par adresse client pour ralentir les tentatives de force brute.
- Si vous utilisez le routage multi-agent, définissez `hooks.allowedAgentIds` pour limiter la sélection explicite de `agentId`.
- Conservez `hooks.allowRequestSessionKey=false` à moins que vous n'ayez besoin de sessions sélectionnées par l'appelant.
- Si vous activez la `sessionKey` de la requête, restreignez `hooks.allowedSessionKeyPrefixes` (par exemple, `["hook:"]`).
- Évitez d'inclure des payloads bruts sensibles dans les journaux des webhooks.
- Les charges utiles des hooks sont traitées comme non fiables et enveloppées avec des limites de sécurité par défaut.
  Si vous devez désactiver cela pour un hook spécifique, définissez `allowUnsafeExternalContent: true`
  dans le mappage de ce hook (dangereux).
