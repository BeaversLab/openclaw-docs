---
summary: "Référence CLI pour `openclaw pairing` (approuver/lister les demandes d'appariement)"
read_when:
  - Vous utilisez les DMs en mode d'appariement et devez approuver les expéditeurs
title: "pairing"
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

- Saisie du canal : passez-le par position (`pairing list telegram`) ou avec `--channel <channel>`.
- `pairing list` prend en charge `--account <accountId>` pour les canaux multi-comptes.
- `pairing approve` prend en charge `--account <accountId>` et `--notify`.
- Si un seul canal compatible avec l'appariement est configuré, `pairing approve <code>` est autorisé.

import en from "/components/footer/en.mdx";

<en />
