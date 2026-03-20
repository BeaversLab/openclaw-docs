---
summary: "Référence CLI pour `openclaw devices` (appareillage des appareils + rotation/révocation de jeton)"
read_when:
  - Vous approuvez les demandes d'appareillage d'appareils
  - Vous devez faire tourner ou révoquer les jetons d'appareil
title: "devices"
---

# `openclaw devices`

Gérer les demandes d'appareillage d'appareils et les jetons étendus aux appareils.

## Commandes

### `openclaw devices list`

Lister les demandes d'appareillage en attente et les appareils appairés.

```
openclaw devices list
openclaw devices list --json
```

### `openclaw devices remove <deviceId>`

Supprimer une entrée d'appareil appairé.

```
openclaw devices remove <deviceId>
openclaw devices remove <deviceId> --json
```

### `openclaw devices clear --yes [--pending]`

Effacer les appareils appairés en bloc.

```
openclaw devices clear --yes
openclaw devices clear --yes --pending
openclaw devices clear --yes --pending --json
```

### `openclaw devices approve [requestId] [--latest]`

Approuver une demande d'appareillage d'appareil en attente. Si `requestId` est omis, OpenClaw
approuve automatiquement la demande en attente la plus récente.

```
openclaw devices approve
openclaw devices approve <requestId>
openclaw devices approve --latest
```

### `openclaw devices reject <requestId>`

Rejeter une demande d'appareillage d'appareil en attente.

```
openclaw devices reject <requestId>
```

### `openclaw devices rotate --device <id> --role <role> [--scope <scope...>]`

Faire tourner un jeton d'appareil pour un rôle spécifique (mise à jour optionnelle des étendues).

```
openclaw devices rotate --device <deviceId> --role operator --scope operator.read --scope operator.write
```

### `openclaw devices revoke --device <id> --role <role>`

Révoquer un jeton d'appareil pour un rôle spécifique.

```
openclaw devices revoke --device <deviceId> --role node
```

## Options communes

- `--url <url>` : URL WebSocket Gateway (par défaut `gateway.remote.url` lorsque configuré).
- `--token <token>` : jeton Gateway (si requis).
- `--password <password>` : mot de passe Gateway (authentification par mot de passe).
- `--timeout <ms>` : délai d'expiration RPC.
- `--json` : sortie JSON (recommandé pour les scripts).

Remarque : lorsque vous définissez `--url`, la CLI ne revient pas aux identifiants de configuration ou d'environnement.
Passez `--token` ou `--password` explicitement. L'absence d'identifiants explicites constitue une erreur.

## Notes

- La rotation de jeton renvoie un nouveau jeton (sensible). Traitez-le comme un secret.
- Ces commandes nécessitent l'étendue `operator.pairing` (ou `operator.admin`).
- `devices clear` est intentionnellement limité par `--yes`.
- Si l'étendue d'appareillage n'est pas disponible sur le local loopback (et qu'aucun `--url` explicite n'est passé), la liste/approbation peut utiliser un secours d'appareillage local.

## Liste de contrôle pour la récupération de dérive de jeton

Utilisez ceci lorsque l'interface de contrôle ou d'autres clients échouent continuellement avec `AUTH_TOKEN_MISMATCH` ou `AUTH_DEVICE_TOKEN_MISMATCH`.

1. Confirmer la source actuelle du jeton de passerelle :

```bash
openclaw config get gateway.auth.token
```

2. Lister les appareils associés et identifier l'ID de l'appareil concerné :

```bash
openclaw devices list
```

3. Faire tourner le jeton d'opérateur pour l'appareil concerné :

```bash
openclaw devices rotate --device <deviceId> --role operator
```

4. Si la rotation ne suffit pas, supprimer l'association périmée et approuver à nouveau :

```bash
openclaw devices remove <deviceId>
openclaw devices list
openclaw devices approve <requestId>
```

5. Réessayer la connexion client avec le jeton/mot de passe partagé actuel.

Connexe :

- [Dépannage de l'authentification du tableau de bord](/fr/web/dashboard#if-you-see-unauthorized-1008)
- [Dépannage de la Gateway](/fr/gateway/troubleshooting#dashboard-control-ui-connectivity)

import en from "/components/footer/en.mdx";

<en />
