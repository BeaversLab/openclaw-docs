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

```
openclaw devices approve
openclaw devices approve <requestId>
openclaw devices approve --latest
```

## Paperclip / Approbation de la première exécution de `openclaw_gateway`

Lorsqu'un nouvel agent Paperclip se connecte via l'adaptateur `openclaw_gateway` pour la première fois, le Gateway peut exiger une approbation unique de l'appareil avant que les exécutions puissent réussir. Si Paperclip signale `openclaw_gateway_pairing_required`, approuvez l'appareil en attente et réessayez.

Pour les passerelles locales, prévisualisez la dernière demande en attente :

```bash
openclaw devices approve --latest
```

L'aperçu imprime la commande exacte `openclaw devices approve <requestId>`. Vérifiez les détails de la demande, puis réexécutez cette commande avec l'ID de demande pour l'approuver.

Pour les passerelles distantes ou les identifiants explicites, transmettez les mêmes options lors de la prévisualisation et de l'approbation :

```bash
openclaw devices approve --latest --url <gateway-ws-url> --token <gateway-token>
```

Pour éviter d'avoir à réapprouver après les redémarrages, conservez une clé d'appareil persistante dans la configuration de l'adaptateur Paperclip au lieu de générer une nouvelle identité éphémère à chaque exécution :

```json
{
  "adapterConfig": {
    "devicePrivateKeyPem": "<ed25519-private-key-pkcs8-pem>"
  }
}
```

Si l'approbation continue d'échouer, exécutez d'abord `openclaw devices list` pour confirmer qu'une demande en attente existe.

### `openclaw devices reject <requestId>`

Rejeter une demande d'appariement d'appareil en attente.

```
openclaw devices reject <requestId>
```

### `openclaw devices rotate --device <id> --role <role> [--scope <scope...>]`

Faire pivoter un jeton d'appareil pour un rôle spécifique (en mettant à jour les étendues facultativement).
Le rôle cible doit déjà exister dans le contrat d'appariement approuvé de cet appareil ;
la rotation ne peut pas créer un nouveau rôle non approuvé.
Si vous omettez `--scope`, les reconnexions ultérieures avec le jeton pivoté stocké réutilisent les
étendues approuvées en cache de ce jeton. Si vous transmettez des valeurs `--scope` explicites, celles-ci
deviennent l'ensemble d'étendues stocké pour les futures reconnexions avec jeton en cache.
Les appelants d'appareil apparié non-administrateurs ne peuvent faire pivoter que leur **propre** jeton d'appareil.
L'ensemble d'étendues du jeton cible doit rester dans les étendues d'opérateur propres de la session de l'appelant ;
la rotation ne peut pas créer ou conserver un jeton d'opérateur plus large que celui
que l'appelant possède déjà.

```
openclaw devices rotate --device <deviceId> --role operator --scope operator.read --scope operator.write
```

Renvoie les métadonnées de rotation au format JSON. Si l'appelant fait pivoter son propre jeton tout en
étant authentifié avec ce jeton d'appareil, la réponse inclut également le jeton de remplacement
afin que le client puisse le conserver avant de se reconnecter. Les rotations partagées/administratives
ne répercutent pas le jeton porteur.

### `openclaw devices revoke --device <id> --role <role>`

Révoquer un jeton d'appareil pour un rôle spécifique.

Les appelants d'appareil jumelé non-administrateurs peuvent révoquer uniquement leur **propre** jeton d'appareil.
La révocation du jeton d'un autre appareil nécessite `operator.admin`.
L'ensemble des portées de jeton cibles doit également s'inscrire dans les portées d'opérateur propres à la session de l'appelant ; les appelants jumelés uniquement ne peuvent pas révoquer les jetons d'opérateur d'administration/d'écriture.

```
openclaw devices revoke --device <deviceId> --role node
```

Renvoie le résultat de la révocation au format JSON.

## Options courantes

- `--url <url>` : URL WebSocket du Gateway (par défaut `gateway.remote.url` lorsqu'il est configuré).
- `--token <token>` : jeton du Gateway (si requis).
- `--password <password>` : mot de passe du Gateway (authentification par mot de passe).
- `--timeout <ms>` : délai d'attente RPC.
- `--json` : sortie JSON (recommandé pour les scripts).

<Warning>Lorsque vous définissez `--url`, la CLI n'utilise pas les informations d'identification de configuration ou d'environnement en secours. Passez `--token` ou `--password` explicitement. L'absence d'informations d'identification explicites constitue une erreur.</Warning>

## Remarques

- La rotation des jetons renvoie un nouveau jeton (sensible). Traitez-le comme un secret.
- Ces commandes nécessitent la portée `operator.pairing` (ou `operator.admin`). Certaines
  approbations nécessitent également que l'appelant détienne les portées d'opérateur que l'appareil
  cible créerait ou hériterait ; voir [Operator scopes](/fr/gateway/operator-scopes).
- `gateway.nodes.pairing.autoApproveCidrs` est une stratégie Gateway optionnelle pour
  le jumelage d'appareils de nœuds frais uniquement ; elle ne modifie pas l'autorité d'approbation CLI.
- La rotation et la révocation de jetons restent dans l'ensemble de rôles de jumelage approuvés et
  la ligne de base de portée approuvée pour cet appareil. Une entrée de jeton mise en cache orpheline ne
  confère pas une cible de gestion de jetons.
- Pour les sessions de jetons d'appareil jumelés, la gestion inter-appareils est réservée aux administrateurs :
  `remove`, `rotate` et `revoke` sont limités à soi-même, sauf si l'appelant dispose de
  `operator.admin`.
- La mutation de jeton est également contenue dans la portée de l'appelant : une session d'appariement uniquement ne peut pas faire pivoter ou révoquer un jeton qui porte actuellement `operator.admin` ou `operator.write`.
- `devices clear` est intentionnellement conditionné par `--yes`.
- Si la portée d'appariement est indisponible sur la boucle locale (local loopback) (et qu'aucun `--url` explicite n'est passé), la liste/l'approbation peut utiliser un repli d'appariement local.
- `devices approve` nécessite un ID de demande explicite avant la création de jetons ; l'omission de `requestId` ou le passage de `--latest` ne permet de prévisualiser que la plus récente demande en attente.

## Liste de vérification pour la récupération de dérive de jeton

Utilisez ceci lorsque l'interface utilisateur de contrôle (Control UI) ou d'autres clients continuent d'échouer avec `AUTH_TOKEN_MISMATCH`, `AUTH_DEVICE_TOKEN_MISMATCH` ou `AUTH_SCOPE_MISMATCH`.

1. Confirmer la source actuelle du jeton de passerelle :

```bash
openclaw config get gateway.auth.token
```

2. Lister les appareils appariés et identifier l'ID de l'appareil concerné :

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

5. Réessayer la connexion du client avec le jeton/mot de passe partagé actuel.

Notes :

- La priorité normale d'authentification de reconnexion est d'abord le jeton/mot de passe partagé explicite, puis `deviceToken` explicite, puis le jeton d'appareil stocké, puis le jeton d'amorçage.
- La récupération de `AUTH_TOKEN_MISMATCH` de confiance peut temporairement envoyer à la fois le jeton partagé et le jeton d'appareil stocké ensemble pour la seule tentative de reconnexion limitée.
- `AUTH_SCOPE_MISMATCH` signifie que le jeton de l'appareil a été reconnu mais ne porte pas l'ensemble de portées demandé ; corrigez le contrat d'appariement/approbation de portée avant de modifier l'authentification de passerelle partagée.

Connexes :

- [Dépannage de l'authentification du tableau de bord](/fr/web/dashboard#if-you-see-unauthorized-1008)
- [Dépannage du Gateway](/fr/gateway/troubleshooting#dashboard-control-ui-connectivity)

## Connexes

- [Référence de la CLI](/fr/cli)
- [Nœuds](/fr/nodes)
