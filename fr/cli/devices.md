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

La sortie de la demande en attente inclut le rôle et les portées demandés afin que les approbations puissent être examinées avant que vous n'approuviez.

### `openclaw devices remove <deviceId>`

Supprimer une entrée d'appareil couplé.

```
openclaw devices remove <deviceId>
openclaw devices remove <deviceId> --json
```

### `openclaw devices clear --yes [--pending]`

Effacer les appareils couplés en masse.

```
openclaw devices clear --yes
openclaw devices clear --yes --pending
openclaw devices clear --yes --pending --json
```

### `openclaw devices approve [requestId] [--latest]`

Approuver une demande d'appariement d'appareil en attente. Si `requestId` est omis, OpenClaw approuve automatiquement la demande en attente la plus récente.

Remarque : si un appareil réessaie l'appariement avec des détails d'authentification modifiés (rôle/portées/clé publique), OpenClaw remplace l'entrée en attente précédente et émet un nouveau `requestId`. Exécutez `openclaw devices list` juste avant l'approbation pour utiliser l'ID actuel.

```
openclaw devices approve
openclaw devices approve <requestId>
openclaw devices approve --latest
```

### `openclaw devices reject <requestId>`

Rejeter une demande d'appariement d'appareil en attente.

```
openclaw devices reject <requestId>
```

### `openclaw devices rotate --device <id> --role <role> [--scope <scope...>]`

Faire pivoter un jeton d'appareil pour un rôle spécifique (en mettant à jour les portées de manière facultative).

```
openclaw devices rotate --device <deviceId> --role operator --scope operator.read --scope operator.write
```

### `openclaw devices revoke --device <id> --role <role>`

Révoquer un jeton d'appareil pour un rôle spécifique.

```
openclaw devices revoke --device <deviceId> --role node
```

## Options communes

- `--url <url>` : URL WebSocket du Gateway (par défaut `gateway.remote.url` lorsque configuré).
- `--token <token>` : Jeton du Gateway (si requis).
- `--password <password>` : Mot de passe du Gateway (authentification par mot de passe).
- `--timeout <ms>` : Délai d'attente RPC.
- `--json` : Sortie JSON (recommandé pour les scripts).

Remarque : lorsque vous définissez `--url`, le CLI ne revient pas aux identifiants de configuration ou d'environnement. Passez `--token` ou `--password` explicitement. L'absence d'identifiants explicites est une erreur.

## Notes

- La rotation des jetons renvoie un nouveau jeton (sensible). Traitez-le comme un secret.
- Ces commandes nécessitent la portée `operator.pairing` (ou `operator.admin`).
- `devices clear` est intentionnellement restreint par `--yes`.
- Si la portée d'appariement n'est pas disponible sur la boucle locale (et qu'aucun `--url` explicite n'est passé), la liste/approbation peut utiliser un secours d'appariement local.

## Liste de contrôle de la récupération de la dérive des jetons

Utilisez ceci lorsque l'interface de contrôle ou d'autres clients continuent d'échouer avec `AUTH_TOKEN_MISMATCH` ou `AUTH_DEVICE_TOKEN_MISMATCH`.

1. Confirmer la source actuelle du jeton de passerelle :

```bash
openclaw config get gateway.auth.token
```

2. Lister les appareils appariés et identifier l'ID de l'appareil concerné :

```bash
openclaw devices list
```

3. Faire tourner le jeton d'opérateur pour l'appareil concerné :

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

Connexes :

- [Dépannage de l'auth Dashboard](/fr/web/dashboard#if-you-see-unauthorized-1008)
- [Dépannage du Gateway](/fr/gateway/troubleshooting#dashboard-control-ui-connectivity)

import fr from "/components/footer/fr.mdx";

<fr />
