---
summary: "Référence CLI pour `openclaw pairing` (approuver/lister les demandes d'appariement)"
read_when:
  - You’re using pairing-mode DMs and need to approve senders
title: "appariement"
---

# `openclaw pairing`

Approuver ou inspecter les demandes d'appariement DM (pour les channels qui prennent en charge l'appariement).

Connexe :

- Flux d'appariement : [Appariement](/fr/channels/pairing)

## Commandes

```bash
openclaw pairing list telegram
openclaw pairing list --channel telegram --account work
openclaw pairing list telegram --json

openclaw pairing approve telegram <code>
openclaw pairing approve --channel telegram --account work <code> --notify
```

## Notes

- Saisie du channel : transmettez-la par position (`pairing list telegram`) ou avec `--channel <channel>`.
- `pairing list` prend en charge `--account <accountId>` pour les channels multi-comptes.
- `pairing approve` prend en charge `--account <accountId>` et `--notify`.
- Si un seul channel compatible avec l'appariement est configuré, `pairing approve <code>` est autorisé.

import fr from '/components/footer/fr.mdx';

<fr />
