---
summary: "Référence CLI pour `openclaw system` (événements système, battement de cœur, présence)"
read_when:
  - You want to enqueue a system event without creating a cron job
  - You need to enable or disable heartbeats
  - You want to inspect system presence entries
title: "system"
---

# `openclaw system`

Aides de niveau système pour la Gateway : mettre en file d'attente des événements système, contrôler les battements de cœur,
et afficher la présence.

Toutes les sous-commandes `system` utilisent le Gateway RPC et acceptent les indicateurs client partagés :

- `--url <url>`
- `--token <token>`
- `--timeout <ms>`
- `--expect-final`

## Commandes courantes

```bash
openclaw system event --text "Check for urgent follow-ups" --mode now
openclaw system event --text "Check for urgent follow-ups" --url ws://127.0.0.1:18789 --token "$OPENCLAW_GATEWAY_TOKEN"
openclaw system heartbeat enable
openclaw system heartbeat last
openclaw system presence
```

## `system event`

Mettre en file d'attente un événement système sur la session **principale**. Le prochain battement de cœur (heartbeat) l'injectera
comme une ligne `System:` dans l'invite. Utilisez `--mode now` pour déclencher le battement de cœur
immédiatement ; `next-heartbeat` attend le prochain tick planifié.

Indicateurs :

- `--text <text>` : texte de l'événement système requis.
- `--mode <mode>` : `now` ou `next-heartbeat` (par défaut).
- `--json` : sortie lisible par machine.
- `--url`, `--token`, `--timeout`, `--expect-final` : indicateurs partagés Gateway RPC.

## `system heartbeat last|enable|disable`

Contrôles des battements de cœur :

- `last` : afficher le dernier événement de battement de cœur.
- `enable` : réactiver les battements de cœur (à utiliser s'ils ont été désactivés).
- `disable` : mettre en pause les battements de cœur.

Indicateurs :

- `--json` : sortie lisible par machine.
- `--url`, `--token`, `--timeout`, `--expect-final` : indicateurs partagés Gateway RPC.

## `system presence`

Lister les entrées de présence système actuelles connues du Gateway (nœuds,
instances et lignes de statut similaires).

Indicateurs :

- `--json` : sortie lisible par machine.
- `--url`, `--token`, `--timeout`, `--expect-final` : indicateurs partagés Gateway RPC.

## Notes

- Nécessite un Gateway en cours d'exécution accessible via votre configuration actuelle (locale ou distante).
- Les événements système sont éphémères et ne sont pas persistants après les redémarrages.
