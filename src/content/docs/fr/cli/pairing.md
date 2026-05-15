---
summary: "Référence CLI pour `openclaw pairing` (approuver/lister les demandes d'appariement)"
read_when:
  - You're using pairing-mode DMs and need to approve senders
title: "Appairage"
---

# `openclaw pairing`

Approuver ou inspecter les demandes d'appariement DM (pour les channels qui prennent en charge l'appariement).

Connexe :

- Flux de jumelage : [Jumelage](/fr/channels/pairing)

## Commandes

```bash
openclaw pairing list telegram
openclaw pairing list --channel telegram --account work
openclaw pairing list telegram --json

openclaw pairing approve <code>
openclaw pairing approve telegram <code>
openclaw pairing approve --channel telegram --account work <code> --notify
```

## `pairing list`

Lister les demandes de couplage en attente pour un channel.

Options :

- `[channel]` : id de channel positionnel
- `--channel <channel>` : id de channel explicite
- `--account <accountId>` : id de compte pour les channels multi-comptes
- `--json` : sortie lisible par machine

Notes :

- Si plusieurs channels compatibles avec le couplage sont configurés, vous devez fournir un channel soit positionnellement, soit avec `--channel`.
- Les channels d'extension sont autorisés tant que l'id de channel est valide.

## `pairing approve`

Approuver un code de couplage en attente et autoriser cet expéditeur.

Utilisation :

- `openclaw pairing approve <channel> <code>`
- `openclaw pairing approve --channel <channel> <code>`
- `openclaw pairing approve <code>` lorsqu'un seul channel compatible avec le couplage est configuré

Options :

- `--channel <channel>` : id de channel explicite
- `--account <accountId>` : id de compte pour les channels multi-comptes
- `--notify` : envoyer une confirmation au demandeur sur le même channel

Amorçage du propriétaire :

- Si `commands.ownerAllowFrom` est vide lorsque vous approuvez un code de jumelage, OpenClaw enregistre également l'expéditeur approuvé en tant que propriétaire de la commande, à l'aide d'une entrée étendue au channel telle que `telegram:123456789`.
- Cela n'amorce que le premier propriétaire. Les approbations de jumelage ultérieures ne remplacent ni n'étendent `commands.ownerAllowFrom`.
- Le propriétaire de la commande est le compte de l'opérateur humain autorisé à exécuter les commandes réservées au propriétaire et à approuver les actions dangereuses telles que `/diagnostics`, `/export-trajectory`, `/config` et les approbations d'exécution.

## Notes

- Entrée du channel : passez-la par position (`pairing list telegram`) ou avec `--channel <channel>`.
- `pairing list` prend en charge `--account <accountId>` pour les canaux multi-comptes.
- `pairing approve` prend en charge `--account <accountId>` et `--notify`.
- Si un seul channel capable de jumelage est configuré, `pairing approve <code>` est autorisé.
- Si vous avez approuvé un expéditeur avant l'existence de cet amorçage, exécutez `openclaw doctor` ; il avertit lorsqu'aucun propriétaire de commande n'est configuré et affiche la commande `openclaw config set commands.ownerAllowFrom ...` pour le corriger.

## Connexes

- [Référence CLI](/fr/cli)
- [Jumelage de channel](/fr/channels/pairing)
