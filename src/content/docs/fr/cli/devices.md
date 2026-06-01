---
summary: "CLIRéférence CLI pour `openclaw devices` (appareillage des appareils + rotation/révocation de jetons)"
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

Lorsque vous êtes authentifié avec un jeton d'appareil apparié, les appelants non-administrateurs peuvent
supprimer uniquement la ligne de **leur propre** appareil. La suppression d'un autre appareil nécessite
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

Approuver une demande d'appareillage d'appareil en attente par `requestId` exact. Si `requestId`
est omis ou si `--latest`OpenClaw est passé, OpenClaw affiche uniquement la demande en attente
sélectionnée et quitte ; relancez l'approbation avec l'ID de demande exact après avoir vérifié
les détails.

<Note>Si un appareil réessaie de s'apparier avec des détails d'authentification modifiés (rôle, portées ou clé publique), OpenClaw remplace l'entrée en attente précédente et émet un nouveau OpenClaw`requestId`. Exécutez `openclaw devices list` juste avant l'approbation pour utiliser l'ID actuel.</Note>

Si l'appareil est déjà apparié et demande des portées plus étendues ou un rôle plus étendu,
OpenClaw conserve l'approbation existante en place et crée une nouvelle demande de mise à niveau
en attente. Consultez les colonnes OpenClaw`Requested` vs `Approved` dans `openclaw devices list`
ou utilisez `openclaw devices approve --latest` pour prévisualiser la mise à niveau exacte avant
de l'approuver.

Si le Gateway est explicitement configuré avec
Gateway`gateway.nodes.pairing.autoApproveCidrs`, les demandes de première `role: node` provenant
des adresses IP clientes correspondantes peuvent être approuvées avant d'apparaître dans cette liste. Cette stratégie
est désactivée par défaut et ne s'applique jamais aux clients opérateurs/navigateurs ni aux demandes de mise à niveau.

L'approbation des rôles de nœud ou d'autres appareils non-opérateurs nécessite `operator.admin`.
`operator.pairing` est suffisant pour les approbations d'appareils opérateurs uniquement lorsque les
portées opérateurs demandées restent dans les propres portées de l'appelant. Voir
[Operator scopes](/fr/gateway/operator-scopes) pour les vérifications au moment de l'approbation.

```
openclaw devices approve
openclaw devices approve <requestId>
openclaw devices approve --latest
```

## Paperclip / `openclaw_gateway` première approbation d'exécution

Lorsqu'un nouvel agent Paperclip se connecte via l'adaptateur `openclaw_gateway` pour la première fois, le Gateway peut nécessiter une approbation d'appariement d'appareil unique avant que les exécutions ne puissent réussir. Si Paperclip signale `openclaw_gateway_pairing_required`, approuvez l'appareil en attente et réessayez.

Pour les passerelles locales, prévisualisez la dernière demande en attente :

```bash
openclaw devices approve --latest
```

L'aperçu imprime la commande exacte `openclaw devices approve <requestId>`. Vérifiez les détails de la demande, puis réexécutez cette commande avec l'ID de la demande pour l'approuver.

Pour les passerelles distantes ou les identifiants explicites, transmettez les mêmes options lors de la prévisualisation et de l'approbation :

```bash
openclaw devices approve --latest --url <gateway-ws-url> --token <gateway-token>
```

Pour éviter d'avoir à réapprouver après des redémarrages, conservez une clé d'appareil persistante dans la configuration de l'adaptateur Paperclip au lieu de générer une nouvelle identité éphémère à chaque exécution :

```json
{
  "adapterConfig": {
    "devicePrivateKeyPem": "<ed25519-private-key-pkcs8-pem>"
  }
}
```

Si l'approbation échoue continuellement, exécutez d'abord `openclaw devices list` pour confirmer qu'une demande en attente existe.

### `openclaw devices reject <requestId>`

Rejeter une demande d'appariement d'appareil en attente.

```
openclaw devices reject <requestId>
```

### `openclaw devices rotate --device <id> --role <role> [--scope <scope...>]`

Faire pivoter un jeton d'appareil pour un rôle spécifique (en mettant à jour les portées si nécessaire).
Le rôle cible doit déjà exister dans le contrat d'appariement approuvé de cet appareil ;
la rotation ne peut pas créer un nouveau rôle non approuvé.
Si vous omettez `--scope`, les reconnexions ultérieures avec le jeton pivoté stocké réutilisent les
portées approuvées mises en cache de ce jeton. Si vous transmettez des valeurs `--scope` explicites, celles-ci
deviennent l'ensemble de portées stocké pour les reconnexions futures avec jeton mis en cache.
Les appelants d'appareils appariés non-administrateurs ne peuvent faire pivoter que leur **propre** jeton d'appareil.
L'ensemble de portées du jeton cible doit rester dans les propres portées opérateur de la session de l'appelant ;
la rotation ne peut pas créer ou préserver un jeton opérateur plus large que ce
que l'appelant possède déjà.

```
openclaw devices rotate --device <deviceId> --role operator --scope operator.read --scope operator.write
```

Renvoie les métadonnées de rotation au format JSON. Si l'appelant fait tourner son propre jeton alors qu'il est authentifié avec ce jeton d'appareil, la réponse inclut également le jeton de remplacement afin que le client puisse le conserver avant de se reconnecter. Les rotations partagées/administrateur ne renvoient pas le jeton de porteur.

### `openclaw devices revoke --device <id> --role <role>`

Révoque un jeton d'appareil pour un rôle spécifique.

Les appelants d'appareils appariés non-administrateurs ne peuvent révoquer que leur **propre** jeton d'appareil. La révocation du jeton d'un autre appareil nécessite `operator.admin`. L'ensemble des portées du jeton cible doit également correspondre aux portées d'opérateur de la session de l'appelant ; les appelants avec appariement uniquement ne peuvent pas révoquer les jetons d'opérateur administrateur/écriture.

```
openclaw devices revoke --device <deviceId> --role node
```

Renvoie le résultat de la révocation au format JSON.

## Options communes

- `--url <url>` : URL WebSocket du Gateway (par défaut `gateway.remote.url` lorsque configuré).
- `--token <token>` : Jeton du Gateway (si requis).
- `--password <password>` : Mot de passe du Gateway (authentification par mot de passe).
- `--timeout <ms>` : Délai d'attente RPC.
- `--json` : Sortie JSON (recommandé pour les scripts).

<Warning>Lorsque vous définissez `--url`, le CLI n'utilise pas les identifiants de configuration ou d'environnement par défaut. Passez `--token` ou `--password` explicitement. L'absence d'identifiants explicites constitue une erreur.</Warning>

## Notes

- La rotation des jetons renvoie un nouveau jeton (sensible). Traitez-le comme un secret.
- Ces commandes nécessitent la portée `operator.pairing` (ou `operator.admin`). Certaines approbations nécessitent également que l'appelant détienne les portées d'opérateur que l'appareil cible créerait ou hériterait. Les rôles d'appareil non-opérateur nécessitent `operator.admin` ; voir [Portées d'opérateur](/fr/gateway/operator-scopes).
- `gateway.nodes.pairing.autoApproveCidrs` est une stratégie optionnelle du Gateway pour l'appariement d'appareils de nœuds frais uniquement ; elle ne modifie pas l'autorité d'approbation du CLI.
- La rotation et la révocation des jetons restent dans l'ensemble des rôles d'appariement approuvés et la ligne de base des portées approuvées pour cet appareil. Une entrée de jeton en cache errante n'accorde pas de cible de gestion de jetons.
- Pour les sessions de jetons d'appareils appairés, la gestion inter-appareils est réservée aux administrateurs :
  `remove`, `rotate` et `revoke` sont réservés à l'appareil lui-même, sauf si l'appelant dispose de
  `operator.admin`.
- La mutation des jetons est également contenue dans la portée de l'appelant : une session d'appareil uniquement ne peut pas
  faire pivoter ou révoquer un jeton qui transporte actuellement `operator.admin` ou
  `operator.write`.
- `devices clear` est intentionnellement verrouillé par `--yes`.
- Si la portée d'appariement n'est pas disponible sur la boucle locale (local loopback) et qu'aucun `--url` explicite n'est passé, la liste/approbation peut utiliser un repli d'appariement local.
- `devices approve` nécessite un ID de demande explicite avant la création de jetons ; l'omission de `requestId` ou le passage de `--latest` ne permet que de prévisualiser la plus récente demande en attente.

## Liste de vérification pour la récupération de dérive de jeton

Utilisez ceci lorsque l'interface de contrôle (Control UI) ou d'autres clients continuent d'échouer avec `AUTH_TOKEN_MISMATCH`, `AUTH_DEVICE_TOKEN_MISMATCH` ou `AUTH_SCOPE_MISMATCH`.

1. Confirmez la source actuelle du jeton de la passerelle :

```bash
openclaw config get gateway.auth.token
```

2. Listez les appareils appairés et identifiez l'ID de l'appareil affecté :

```bash
openclaw devices list
```

3. Faites pivoter le jeton d'opérateur pour l'appareil affecté :

```bash
openclaw devices rotate --device <deviceId> --role operator
```

4. Si la rotation ne suffit pas, supprimez l'appariement obsolète et approuvez à nouveau :

```bash
openclaw devices remove <deviceId>
openclaw devices list
openclaw devices approve <requestId>
```

5. Réessayez la connexion client avec le jeton/mot de passe partagé actuel.

Notes :

- La priorité normale d'authentification de reconnexion est d'abord le jeton/mot de passe partagé explicite, puis `deviceToken` explicite, puis le jeton d'appareil stocké, et enfin le jeton d'amorçage.
- La récupération de `AUTH_TOKEN_MISMATCH` de confiance peut temporairement envoyer ensemble le jeton partagé et le jeton d'appareil stocké pour la seule tentative de nouvelle connexion limitée.
- `AUTH_SCOPE_MISMATCH` signifie que le jeton d'appareil a été reconnu mais ne transporte pas l'ensemble de portées demandé ; corrigez le contrat d'approbation d'appariement/portée avant de modifier l'authentification de la passerelle partagée.

Connexes :

- [Dépannage de l'authentification du tableau de bord](/fr/web/dashboard#if-you-see-unauthorized-1008)
- [Dépannage du Gateway](Gateway/en/gateway/troubleshooting#dashboard-control-ui-connectivity)

## Connexes

- [Référence CLI](CLI/en/cli)
- [Nœuds](/fr/nodes)
