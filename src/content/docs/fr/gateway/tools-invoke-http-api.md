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

Utilise la configuration d'auth du Gateway. Envoyer un jeton porteur :

- `Authorization: Bearer <token>`

Remarques :

- Lorsque `gateway.auth.mode="token"`, utilisez `gateway.auth.token` (ou `OPENCLAW_GATEWAY_TOKEN`).
- Lorsque `gateway.auth.mode="password"`, utilisez `gateway.auth.password` (ou `OPENCLAW_GATEWAY_PASSWORD`).
- Si `gateway.auth.rateLimit` est configuré et que trop d'échecs d'authentification se produisent, le point de terminaison renvoie `429` avec `Retry-After`.

## Limite de sécurité (important)

Traitez ce point de terminaison comme une surface d'**accès opérateur complet** pour l'instance de la passerelle.

- L'authentification porteur HTTP ici n'est pas un modèle étendu par utilisateur.
- Un jeton/mot de passe valide de la passerelle pour ce point de terminaison doit être traité comme une information d'identification de propriétaire/opérateur.
- Pour les modes d'authentification par secret partagé (`token` et `password`), le point de terminaison restaure les valeurs par défaut complètes de l'opérateur, même si l'appelant envoie un en-tête `x-openclaw-scopes` plus restrictif.
- L'authentification par secret partagé traite également les invocations directes d'outils sur ce point de terminaison comme des tours d'envoyeur-propriétaire.
- Les modes HTTP porteurs d'identité de confiance (par exemple, l'authentification par proxy de confiance ou `gateway.auth.mode="none"` sur une entrée privée) honorent toujours les étendues d'opérateur déclarées dans la requête.
- Gardez ce point de terminaison uniquement en boucle locale/tailnet/entrée privée ; ne l'exposez pas directement à l'internet public.

Matrice d'authentification :

- `gateway.auth.mode="token"` ou `"password"` + `Authorization: Bearer ...`
  - prouve la possession du secret d'opérateur partagé de la passerelle
  - ignore `x-openclaw-scopes` plus restrictif
  - restaure l'ensemble complet des étendues d'opérateur par défaut
  - traite les invocations directes d'outils sur ce point de terminaison comme des tours d'envoyeur-propriétaire
- modes HTTP porteurs d'identité de confiance (par exemple, authentification par proxy de confiance, ou `gateway.auth.mode="none"` sur une entrée privée)
  - authentifier une identité ou une limite de déploiement externe de confiance
  - respecter l'en-tête `x-openclaw-scopes` déclaré
  - n'obtenir la sémantique de propriétaire que lorsque `operator.admin` est réellement présent dans ces portées déclarées

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
- `action` (chaîne, facultatif) : mappé vers args si le schéma de l'outil prend en charge `action` et que la charge utile args l'a omis.
- `args` (objet, facultatif) : arguments spécifiques à l'outil.
- `sessionKey` (chaîne, facultatif) : clé de session cible. Si omis ou `"main"`, le Gateway utilise la clé de session principale configurée (respecte `session.mainKey` et l'agent par défaut, ou `global` dans la portée globale).
- `dryRun` (booléen, facultatif) : réservé pour une utilisation future ; actuellement ignoré.

## Stratégie + comportement de routage

La disponibilité des outils est filtrée par la même chaîne de stratégies utilisée par les agents du Gateway :

- `tools.profile` / `tools.byProvider.profile`
- `tools.allow` / `tools.byProvider.allow`
- `agents.<id>.tools.allow` / `agents.<id>.tools.byProvider.allow`
- stratégies de groupe (si la clé de session correspond à un groupe ou un canal)
- stratégie de sous-agent (lors de l'appel avec une clé de session de sous-agent)

Si un outil n'est pas autorisé par la stratégie, le point de terminaison renvoie **404**.

Notes importantes sur les limites :

- Les approbations d'exécution sont des garde-fous pour l'opérateur, et non une limite d'autorisation distincte pour ce point de terminaison HTTP. Si un outil est accessible ici via l'authentification Gateway + la stratégie d'outil, `/tools/invoke` n'ajoute pas de demande d'approbation supplémentaire par appel.
- Ne partagez pas les identifiants bearer du Gateway avec des appelants non fiables. Si vous avez besoin d'une séparation entre les limites de confiance, exécutez des passerelles distinctes (et idéalement des utilisateurs/hôtes OS distincts).

Le Gateway HTTP applique également une liste de refus stricte par défaut (même si la stratégie de session autorise l'outil) :

- `exec` — exécution directe de commande (surface RCE)
- `spawn` — création arbitraire de processus enfant (surface RCE)
- `shell` — exécution de commande shell (surface RCE)
- `fs_write` — mutation de fichier arbitraire sur l'hôte
- `fs_delete` — suppression de fichier arbitraire sur l'hôte
- `fs_move` — déplacement/renommage de fichier arbitraire sur l'hôte
- `apply_patch` — l'application de correctif peut réécrire des fichiers arbitraires
- `sessions_spawn` — orchestration de session ; le lancement d'agents à distance constitue une exécution de code à distance (RCE)
- `sessions_send` — injection de message inter-session
- `cron` — plan de contrôle d'automatisation persistant
- `gateway` — plan de contrôle de la passerelle ; empêche la reconfiguration via HTTP
- `nodes` — le relais de commande de nœud peut atteindre system.run sur les hôtes appairés
- `whatsapp_login` — configuration interactive nécessitant un scan QR de terminal ; fige sur HTTP

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

Pour aider les stratégies de groupe à résoudre le contexte, vous pouvez définir facultativement :

- `x-openclaw-message-channel: <channel>` (exemple : `slack`, `telegram`)
- `x-openclaw-account-id: <accountId>` (lorsque plusieurs comptes existent)

## Réponses

- `200` → `{ ok: true, result }`
- `400` → `{ ok: false, error: { type, message } }` (requête non valide ou erreur de saisie de l'outil)
- `401` → non autorisé
- `429` → auth limitée par débit (`Retry-After` défini)
- `404` → outil non disponible (non trouvé ou non autorisé)
- `405` → méthode non autorisée
- `500` → `{ ok: false, error: { type, message } }` (erreur d'exécution d'outil inattendue ; message assaini)

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
