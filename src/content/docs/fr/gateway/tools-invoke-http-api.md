---
summary: "Invoquer un seul tool directement via le point de terminaison HTTP du Gateway"
read_when:
  - Calling tools without running a full agent turn
  - Building automations that need tool policy enforcement
title: "Outil d'appel API"
---

# Outil d'appel (HTTP)

La passerelle d'OpenClaw expose un simple point de terminaison HTTP pour invoquer directement un seul outil. Elle est toujours activée et utilise l'authentification de la passerelle ainsi que la politique d'outil. Comme la surface `/v1/*` compatible avec OpenAI, l'authentification porteur par secret partagé est traitée comme un accès opérateur de confiance pour l'ensemble de la passerelle.

- `POST /tools/invoke`
- Même port que la passerelle (multiplexage WS + HTTP) : `http://<gateway-host>:<port>/tools/invoke`

La taille maximale par défaut de la charge utile est de 2 Mo.

## Authentification

Utilise la configuration d'authentification du Gateway.

Chemins d'authentification HTTP courants :

- authentification par secret partagé (`gateway.auth.mode="token"` ou `"password"`) :
  `Authorization: Bearer <token-or-password>`
- authentification HTTP de confiance porteur d'identité (`gateway.auth.mode="trusted-proxy"`) :
  acheminez via le proxy configuré prenant en compte l'identité et laissez-le injecter les
  en-têtes d'identité requis
- authentification ouverte pour entrée privée (`gateway.auth.mode="none"`) :
  aucun en-tête d'authentification requis

Notes :

- Lors de l'utilisation de `gateway.auth.mode="token"`, utilisez `gateway.auth.token` (ou `OPENCLAW_GATEWAY_TOKEN`).
- Lors de l'utilisation de `gateway.auth.mode="password"`, utilisez `gateway.auth.password` (ou `OPENCLAW_GATEWAY_PASSWORD`).
- Lors de l'utilisation de `gateway.auth.mode="trusted-proxy"`, la requête HTTP doit provenir d'une
  source proxy de confiance configurée et non en boucle locale (non-loopback) ; les proxies en boucle locale sur le même hôte ne
  satisfont pas ce mode.
- Si `gateway.auth.rateLimit` est configuré et que trop d'échecs d'authentification se produisent, le point de terminaison renvoie `429` avec `Retry-After`.

## Limite de sécurité (important)

Traitez ce point de terminaison comme une surface d'**accès opérateur complet** pour l'instance de la passerelle.

- L'authentification HTTP bearer ici n'est pas un modèle d'étendue étroit par utilisateur.
- Un jeton/mot de passe Gateway valide pour ce point de terminaison doit être traité comme un identifiant de propriétaire/opérateur.
- Pour les modes d'authentification par secret partagé (`token` et `password`), le point de terminaison rétablit les paramètres par défaut d'opérateur complet normaux même si l'appelant envoie un en-tête `x-openclaw-scopes` plus étroit.
- L'authentification par secret partagé traite également les appels directs d'outils sur ce point de terminaison comme des tours d'envoyeur propriétaire.
- Les modes HTTP de confiance porteurs d'identité (par exemple authentification proxy de confiance ou `gateway.auth.mode="none"` sur une entrée privée) honorent `x-openclaw-scopes` lorsqu'il est présent et retombent sinon sur l'ensemble d'étendues par défaut de l'opérateur normal.
- Gardez ce point de terminaison uniquement en boucle locale/tailnet/entrée privée ; ne l'exposez pas directement à l'Internet public.

Matrice d'authentification :

- `gateway.auth.mode="token"` ou `"password"` + `Authorization: Bearer ...`
  - prouve la possession du secret d'opérateur partagé de la passerelle
  - ignore `x-openclaw-scopes` plus étroit
  - restaure l'ensemble complet de la portée de l'opérateur par défaut :
    `operator.admin`, `operator.approvals`, `operator.pairing`,
    `operator.read`, `operator.talk.secrets`, `operator.write`
  - traite les appels directs de tools sur ce point de terminaison comme des tours owner-sender
- modes HTTP transportant une identité de confiance (par exemple authentification par proxy de confiance, ou `gateway.auth.mode="none"` sur une entrée privée)
  - authentifier une identité externe de confiance ou une limite de déploiement
  - respecte `x-openclaw-scopes` lorsque l'en-tête est présent
  - revient à l'ensemble de la portée par défaut normale de l'opérateur lorsque l'en-tête est absent
  - ne perd la sémantique de propriétaire que lorsque l'appelant réduit explicitement les portées et omet `operator.admin`

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
- `action` (chaîne, facultatif) : mappé vers args si le schéma du tool prend en charge `action` et que la charge utile args l'a omis.
- `args` (objet, facultatif) : arguments spécifiques au tool.
- `sessionKey` (chaîne, facultatif) : clé de session cible. Si omis ou `"main"`, le Gateway utilise la clé de session principale configurée (respecte `session.mainKey` et l'agent par défaut, ou `global` dans la portée globale).
- `dryRun` (booléen, facultatif) : réservé pour une utilisation future ; actuellement ignoré.

## Politique + comportement de routage

La disponibilité des tools est filtrée par la même chaîne de politiques utilisée par les agents du Gateway :

- `tools.profile` / `tools.byProvider.profile`
- `tools.allow` / `tools.byProvider.allow`
- `agents.<id>.tools.allow` / `agents.<id>.tools.byProvider.allow`
- politiques de groupe (si la clé de session correspond à un groupe ou un channel)
- politique de sous-agent (lors de l'invocation avec une clé de session de sous-agent)

Si un tool n'est pas autorisé par la politique, le point de terminaison renvoie **404**.

Notes importantes sur les limites :

- Les approbations Exec sont des garde-fous pour l'opérateur, et non une limite d'autorisation distincte pour ce point de terminaison HTTP. Si un tool est accessible ici via l'authentification du Gateway + la politique de tool, `/tools/invoke` n'ajoute pas de invite d'approbation supplémentaire par appel.
- Ne partagez pas les identifiants bearer du Gateway avec des appelants non fiables. Si vous avez besoin d'une séparation entre les limites de confiance, exécutez des passerelles distinctes (et idéalement des utilisateurs/hôtes OS distincts).

Le HTTP du Gateway applique également une liste de refus stricte par défaut (même si la stratégie de session autorise le tool) :

- `exec` — exécution directe de commandes (surface RCE)
- `spawn` — création de processus enfants arbitraires (surface RCE)
- `shell` — exécution de commandes shell (surface RCE)
- `fs_write` — modification de fichiers arbitraires sur l'hôte
- `fs_delete` — suppression de fichiers arbitraires sur l'hôte
- `fs_move` — déplacement/renommage de fichiers arbitraires sur l'hôte
- `apply_patch` — l'application de correctifs peut réécrire des fichiers arbitraires
- `sessions_spawn` — orchestration de session ; le lancement d'agents à distance est une RCE
- `sessions_send` — injection de messages inter-sessions
- `cron` — plan de contrôle d'automatisation persistante
- `gateway` — plan de contrôle de passerelle ; empêche la reconfiguration via HTTP
- `nodes` — le relais de commande de nœud peut atteindre system.run sur les hôtes appariés
- `whatsapp_login` — configuration interactive nécessitant un scan QR terminal ; se bloque sur HTTP

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
- `400` → `{ ok: false, error: { type, message } }` (demande invalide ou erreur d'entrée du tool)
- `401` → non autorisé
- `429` → authentification limitée par taux (`Retry-After` défini)
- `404` → tool non disponible (non trouvé ou non autorisé)
- `405` → méthode non autorisée
- `500` → `{ ok: false, error: { type, message } }` (erreur d'exécution de tool inattendue ; message nettoyé)

## Exemple

```bash
curl -sS http://127.0.0.1:18789/tools/invoke \
  -H 'Authorization: Bearer secret' \
  -H 'Content-Type: application/json' \
  -d '{
    "tool": "sessions_list",
    "action": "json",
    "args": {}
  }'
```
