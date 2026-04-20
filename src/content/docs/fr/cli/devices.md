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

Lorsque vous êtes authentifié avec un jeton de périphérique apparié, les appelants non-administrateurs peuvent
supprimer uniquement **leur propre** entrée de périphérique. La suppression d'un autre périphérique nécessite
`operator.admin`.

```
openclaw devices remove <deviceId>
openclaw devices remove <deviceId> --json
```

### `openclaw devices clear --yes [--pending]`

Effacer les périphériques appariés en masse.

```
openclaw devices clear --yes
openclaw devices clear --yes --pending
openclaw devices clear --yes --pending --json
```

### `openclaw devices approve [requestId] [--latest]`

Approuver une demande d'appareil en attente par exact `requestId`. Si `requestId` est omis ou que `--latest` est passé, OpenClaw imprime uniquement la demande en attente sélectionnée et quitte ; relancez l'approbation avec l'ID exact de la demande après avoir vérifié les détails.

Remarque : si un appareil réessaie l'appairage avec des détails d'authentification modifiés (rôle/portées/clé publique), OpenClaw remplace l'entrée en attente précédente et émet un nouveau `requestId`. Exécutez `openclaw devices list` juste avant l'approbation pour utiliser l'ID actuel.

```
openclaw devices approve
openclaw devices approve <requestId>
openclaw devices approve --latest
```

### `openclaw devices reject <requestId>`

Rejeter une demande d'appareillement de périphérique en attente.

```
openclaw devices reject <requestId>
```

### `openclaw devices rotate --device <id> --role <role> [--scope <scope...>]`

Faire tourner un jeton d'appareil pour un rôle spécifique (en mettant éventuellement à jour les portées). Le rôle cible doit déjà exister dans le contrat d'appairage approuvé de cet appareil ; la rotation ne peut pas créer un nouveau rôle non approuvé. Si vous omettez `--scope`, les reconnexions ultérieures avec le jeton tourné stocké réutilisent les portées approuvées en cache de ce jeton. Si vous passez des valeurs explicites `--scope`, celles-ci deviennent l'ensemble de portées stockées pour les reconnexions futures avec jeton en cache. Les appelants d'appareil jumelés non administrateurs ne peuvent faire tourner que leur **propre** jeton d'appareil. De plus, toutes les valeurs explicites `--scope` doivent rester dans les portées d'opérateur propres à la session de l'appelant ; la rotation ne peut pas créer un jeton d'opérateur plus large que celui que l'appelant possède déjà.

```
openclaw devices rotate --device <deviceId> --role operator --scope operator.read --scope operator.write
```

Renvoie la nouvelle charge utile du jeton au format JSON.

### `openclaw devices revoke --device <id> --role <role>`

Révoquer un jeton de périphérique pour un rôle spécifique.

Les appelants d'appareil jumelés non administrateurs ne peuvent révoquer que leur **propre** jeton d'appareil. La révocation du jeton d'un autre appareil nécessite `operator.admin`.

```
openclaw devices revoke --device <deviceId> --role node
```

Renvoie le résultat de la révocation au format JSON.

## Options communes

- `--url <url>` : URL WebSocket de la passerelle (par défaut `gateway.remote.url` lorsque configuré).
- `--token <token>` : Jeton de la passerelle (si requis).
- `--password <password>` : Mot de passe de la passerelle (authentification par mot de passe).
- `--timeout <ms>` : Délai d'attente RPC.
- `--json` : Sortie JSON (recommandé pour les scripts).

Remarque : lorsque vous définissez `--url`, l'interface de ligne de commande ne revient pas aux informations d'identification de configuration ou d'environnement. Passez `--token` ou `--password` explicitement. L'absence d'informations d'identification explicites est une erreur.

## Notes

- La rotation des jetons renvoie un nouveau jeton (sensible). Traitez-le comme un secret.
- Ces commandes nécessitent la portée `operator.pairing` (ou `operator.admin`).
- La rotation des jetons reste dans le jeu de rôles d'appariement approuvés et la ligne de base de portée approuvée
  pour cet appareil. Une entrée de jeton mise en cache résiduelle n'accorde pas de nouvelle
  cible de rotation.
- Pour les sessions de jetons d'appareils appariés, la gestion inter-appareils est réservée aux administrateurs :
  `remove`, `rotate` et `revoke` sont exclusifs à l'appareil, sauf si l'appelant dispose de
  `operator.admin`.
- `devices clear` est intentionnellement protégé par `--yes`.
- Si la portée de couplage n'est pas disponible sur le local loopback (et qu'aucun `--url` explicite n'est passé), l'approbation/liste peut utiliser un mode secours de couplage local.
- `devices approve` nécessite un ID de demande explicite avant la génération de jetons ; l'omission de `requestId` ou le passage de `--latest` permet uniquement de prévisualiser la demande en attente la plus récente.

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

Notes :

- La priorité normale d'authentification de reconnexion est d'abord le jeton/mot de passe partagé explicite, puis `deviceToken` explicite, puis le jeton d'appareil stocké, puis le jeton d'amorçage.
- La récupération de `AUTH_TOKEN_MISMATCH` de confiance peut temporairement envoyer à la fois le jeton partagé et le jeton d'appareil stocké ensemble pour la nouvelle tentative limitée unique.

Connexes :

- [Dépannage de l'authentification du tableau de bord](/fr/web/dashboard#if-you-see-unauthorized-1008)
- [Dépannage du Gateway](/fr/gateway/troubleshooting#dashboard-control-ui-connectivity)
