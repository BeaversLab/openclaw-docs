---
summary: "Référence CLI pour `openclaw pairing` (approuver/lister les demandes d'appariement)"
read_when:
  - You’re using pairing-mode DMs and need to approve senders
title: "appariement"
---

# `openclaw pairing`

Approuver ou inspecter les demandes d'appariement DM (pour les channels qui prennent en charge l'appariement).

Connexe :

- Flux de couplage : [Couplage](/en/channels/pairing)

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

## Notes

- Saisie du channel : passez-le positionnellement (`pairing list telegram`) ou avec `--channel <channel>`.
- `pairing list` prend en charge `--account <accountId>` pour les channels multi-comptes.
- `pairing approve` prend en charge `--account <accountId>` et `--notify`.
- Si un seul channel compatible avec le couplage est configuré, `pairing approve <code>` est autorisé.
