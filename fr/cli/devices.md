---
summary: "Référence CLI pour `openclaw devices` (appareil association + rotation/révocation de jeton)"
read_when:
  - You are approving device pairing requests
  - You need to rotate or revoke device tokens
title: "appareils"
---

# `openclaw devices`

Gérer les demandes d'association d'appareils et les jetons d'étendue d'appareil.

## Commandes

### `openclaw devices list`

Lister les demandes d'association en attente et les appareils associés.

```
openclaw devices list
openclaw devices list --json
```

### `openclaw devices remove <deviceId>`

Supprimer une entrée d'appareil associé.

```
openclaw devices remove <deviceId>
openclaw devices remove <deviceId> --json
```

### `openclaw devices clear --yes [--pending]`

Effacer les appareils associés en masse.

```
openclaw devices clear --yes
openclaw devices clear --yes --pending
openclaw devices clear --yes --pending --json
```

### `openclaw devices approve [requestId] [--latest]`

Approuver une demande d'association d'appareil en attente. Si `requestId` est omis, OpenClaw
approuve automatiquement la demande en attente la plus récente.

```
openclaw devices approve
openclaw devices approve <requestId>
openclaw devices approve --latest
```

### `openclaw devices reject <requestId>`

Rejeter une demande d'association d'appareil en attente.

```
openclaw devices reject <requestId>
```

### `openclaw devices rotate --device <id> --role <role> [--scope <scope...>]`

Faire pivoter un jeton d'appareil pour un rôle spécifique (mise à jour facultative des étendues).

```
openclaw devices rotate --device <deviceId> --role operator --scope operator.read --scope operator.write
```

### `openclaw devices revoke --device <id> --role <role>`

Révoquer un jeton d'appareil pour un rôle spécifique.

```
openclaw devices revoke --device <deviceId> --role node
```

## Options communes

- `--url <url>` : URL WebSocket Gateway (par défaut `gateway.remote.url` lorsque configuré).
- `--token <token>` : Jeton Gateway (si requis).
- `--password <password>` : Mot de passe Gateway (authentification par mot de passe).
- `--timeout <ms>` : Délai d'attente RPC.
- `--json` : Sortie JSON (recommandé pour les scripts).

Remarque : lorsque vous définissez `--url`, la CLI ne revient pas aux identifiants de configuration ou d'environnement.
Passez `--token` ou `--password` explicitement. L'absence d'identifiants explicites constitue une erreur.

## Notes

- La rotation du jeton renvoie un nouveau jeton (sensible). Traitez-le comme un secret.
- Ces commandes nécessitent l'étendue `operator.pairing` (ou `operator.admin`).
- `devices clear` est intentionnellement protégé par `--yes`.
- Si l'étendue d'association n'est pas disponible sur le local loopback (et qu'aucun `--url` explicite n'est passé), la liste/approbation peut utiliser un secours d'association locale.

## Liste de contrôle pour la récupération de dérive de jeton

Utilisez ceci lorsque l'interface de contrôle ou d'autres clients continuent d'échouer avec `AUTH_TOKEN_MISMATCH` ou `AUTH_DEVICE_TOKEN_MISMATCH`.

1. Confirmer la source actuelle du jeton de passerelle :

```bash
openclaw config get gateway.auth.token
```

2. Lister les appareils appariés et identifier l'identifiant de l'appareil concerné :

```bash
openclaw devices list
```

3. Faire pivoter le jeton d'opérateur pour l'appareil concerné :

```bash
openclaw devices rotate --device <deviceId> --role operator
```

4. Si la rotation ne suffit pas, supprimer l'appariement obsolète et approuver à nouveau :

```bash
openclaw devices remove <deviceId>
openclaw devices list
openclaw devices approve <requestId>
```

5. Réessayer la connexion client avec le jeton/mot de passe partagé actuel.

Connexe :

- [Dépannage de l'authentification du tableau de bord](/fr/web/dashboard#if-you-see-unauthorized-1008)
- [Gateway troubleshooting](/fr/gateway/troubleshooting#dashboard-control-ui-connectivity)

import fr from "/components/footer/fr.mdx";

<fr />
