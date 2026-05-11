---
summary: "Référence CLI pour `openclaw devices` (appareil association + rotation/révocation de jeton)"
read_when:
  - You are approving device pairing requests
  - You need to rotate or revoke device tokens
title: "Appareils"
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

La sortie de la demande en attente affiche l'accès demandé à côté de l'accès approuvé actuel de l'appareil lorsque celui-ci est déjà associé. Cela rend les mises à niveau de portée/rôle explicites plutôt que de donner l'impression que l'association a été perdue.

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

<Note>Si un appareil tente à nouveau de s'appairer avec des détails d'authentification modifiés (rôle, portées ou clé publique), OpenClaw remplace l'entrée en attente précédente et émet un nouveau `requestId`. Exécutez `openclaw devices list` juste avant l'approbation pour utiliser l'ID actuel.</Note>

Si l'appareil est déjà associé et demande des portées plus étendues ou un rôle plus étendu, OpenClaw conserve l'approbation existante et crée une nouvelle demande de mise à niveau en attente. Consultez les colonnes `Requested` vs `Approved` dans `openclaw devices list` ou utilisez `openclaw devices approve --latest` pour prévisualiser la mise à niveau exacte avant de l'approuver.

Si le Gateway est explicitement configuré avec
`gateway.nodes.pairing.autoApproveCidrs`, les premières demandes `role: node` provenant
d'adresses IP clientes correspondantes peuvent être approuvées avant qu'elles n'apparaissent dans cette liste. Cette stratégie
est désactivée par défaut et ne s'applique jamais aux clients opérateurs/navigateurs ou aux demandes
de mise à niveau.

```
openclaw devices approve
openclaw devices approve <requestId>
openclaw devices approve --latest
```

### `openclaw devices reject <requestId>`

Rejeter une demande d'appairage d'appareil en attente.

```
openclaw devices reject <requestId>
```

### `openclaw devices rotate --device <id> --role <role> [--scope <scope...>]`

Faire pivoter un jeton d'appareil pour un rôle spécifique (en mettant éventuellement à jour les portées).
Le rôle cible doit déjà exister dans le contrat d'appairage approuvé de cet appareil ;
la rotation ne peut pas créer un nouveau rôle non approuvé.
Si vous omettez `--scope`, les reconnexions ultérieures avec le jeton pivoté stocké réutilisent les
portées approuvées mises en cache de ce jeton. Si vous transmettez des valeurs `--scope` explicites, celles-ci
deviennent l'ensemble de portées stocké pour les futures reconnexions avec jeton mis en cache.
Les appelants d'appareil appairé non-administrateurs ne peuvent faire pivoter que leur **propre** jeton d'appareil.
L'ensemble de portées du jeton cible doit rester dans les portées d'opérateur propres de la session de l'appelant ;
la rotation ne peut pas créer ou préserver un jeton d'opérateur plus large que celui
que l'appelant possède déjà.

```
openclaw devices rotate --device <deviceId> --role operator --scope operator.read --scope operator.write
```

Renvoie les métadonnées de rotation au format JSON. Si l'appelant fait pivoter son propre jeton tout en
étant authentifié avec ce jeton d'appareil, la réponse inclut également le jeton de remplacement
afin que le client puisse le conserver avant de se reconnecter. Les rotations partagées/administrateur
ne renvoient pas le jeton bearer.

### `openclaw devices revoke --device <id> --role <role>`

Révoquer un jeton d'appareil pour un rôle spécifique.

Les appelants d'appareil appairé non-administrateurs ne peuvent révoquer que leur **propre** jeton d'appareil.
La révocation du jeton d'un autre appareil nécessite `operator.admin`.
L'ensemble de portées du jeton cible doit également s'inscrire dans les portées d'opérateur propres de la session de l'appelant ;
les appelants avec uniquement un appairage ne peuvent pas révoquer les jetons d'opérateur administrateur/écriture.

```
openclaw devices revoke --device <deviceId> --role node
```

Renvoie le résultat de la révocation au format JSON.

## Options courantes

- `--url <url>` : URL WebSocket du Gateway (par défaut `gateway.remote.url` lorsque configuré).
- `--token <token>` : Jeton du Gateway (si requis).
- `--password <password>` : Mot de passe du Gateway (authentification par mot de passe).
- `--timeout <ms>` : Délai d'attente RPC.
- `--json` : Sortie JSON (recommandé pour les scripts).

<Warning>Lorsque vous définissez `--url`, le CLI n'utilise pas les identifiants de la configuration ou de l'environnement en secours. Passez `--token` ou `--password` explicitement. L'absence d'identifiants explicites constitue une erreur.</Warning>

## Notes

- La rotation des jetons renvoie un nouveau jeton (sensible). Traitez-le comme un secret.
- Ces commandes requièrent la portée `operator.pairing` (ou `operator.admin`).
- `gateway.nodes.pairing.autoApproveCidrs` est une stratégie Gateway optionnelle pour
  l'appareil de nœud frais uniquement ; elle ne modifie pas l'autorité d'approbation du CLI.
- La rotation et la révocation de jetons restent dans l'ensemble de rôles d'appariement approuvés et
  la ligne de base de portée approuvée pour cet appareil. Une entrée de jeton mise en cache orpheline ne
  confère pas une cible de gestion de jetons.
- Pour les sessions de jetons d'appareils appariés, la gestion inter-appareils est réservée aux administrateurs :
  `remove`, `rotate` et `revoke` sont propres à l'appelant, sauf si celui-ci possède
  `operator.admin`.
- La mutation de jetons est également contenue dans la portée de l'appelant : une session d'appariement uniquement ne peut pas
  faire tourner ou révoquer un jeton qui porte actuellement `operator.admin` ou
  `operator.write`.
- `devices clear` est intentionnellement protégé par `--yes`.
- Si la portée d'appariement n'est pas disponible sur le local loopback (et qu'aucun `--url` explicite n'est passé), list/approve peut utiliser un secours d'appariement local.
- `devices approve` nécessite un ID de demande explicite avant la frappe de jetons ; l'omission de `requestId` ou le passage de `--latest` ne permet de prévisualiser que la demande en attente la plus récente.

## Liste de vérification de la récupération de dérive de jeton

Utilisez ceci lorsque l'interface utilisateur de contrôle ou d'autres clients échouent continuellement avec `AUTH_TOKEN_MISMATCH` ou `AUTH_DEVICE_TOKEN_MISMATCH`.

1. Confirmer la source actuelle du jeton de passerelle :

```bash
openclaw config get gateway.auth.token
```

2. Répertoriez les appareils appariés et identifiez l'ID de l'appareil concerné :

```bash
openclaw devices list
```

3. Faites pivoter le jeton d'opérateur pour l'appareil concerné :

```bash
openclaw devices rotate --device <deviceId> --role operator
```

4. Si la rotation ne suffit pas, supprimez l'appairement obsolète et approuvez à nouveau :

```bash
openclaw devices remove <deviceId>
openclaw devices list
openclaw devices approve <requestId>
```

5. Réessayez la connexion client avec le jeton/mot de passe partagé actuel.

Notes :

- La priorité d'authentification de reconnexion normale est d'abord le jeton/mot de passe partagé explicite, puis `deviceToken` explicite, puis le jeton d'appareil stocké, puis le jeton d'amorçage.
- La récupération `AUTH_TOKEN_MISMATCH` de confiance peut temporairement envoyer à la fois le jeton partagé et le jeton d'appareil stocké pour la nouvelle tentative limitée unique.

Connexes :

- [Dépannage de l'authentification du tableau de bord](/fr/web/dashboard#if-you-see-unauthorized-1008)
- [Dépannage du Gateway](/fr/gateway/troubleshooting#dashboard-control-ui-connectivity)

## Connexes

- [Référence de la CLI](/fr/cli)
- [Nœuds](/fr/nodes)
