---
summary: "Référence CLI pour `openclaw system` (événements système, heartbeat, présence)"
read_when:
  - Vous souhaitez mettre en file d'attente un événement système sans créer de tâche cron
  - Vous devez activer ou désactiver les heartbeats
  - Vous souhaitez inspecter les entrées de présence système
title: "system"
---

# `openclaw system`

Helpers de niveau système pour le Gateway : mettre en file d'attente des événements système, contrôler les heartbeats,
et voir la présence.

## Commandes courantes

```bash
openclaw system event --text "Check for urgent follow-ups" --mode now
openclaw system heartbeat enable
openclaw system heartbeat last
openclaw system presence
```

## `system event`

Met en file d'attente un événement système sur la session **main**. Le prochain heartbeat l'injectera
comme une ligne `System:` dans l'invite. Utilisez `--mode now` pour déclencher le heartbeat
immédiatement ; `next-heartbeat` attend le prochain tick programmé.

Indicateurs :

- `--text <text>` : texte de l'événement système requis.
- `--mode <mode>` : `now` ou `next-heartbeat` (par défaut).
- `--json` : sortie lisible par machine.

## `system heartbeat last|enable|disable`

Contrôles de heartbeat :

- `last` : afficher le dernier événement de heartbeat.
- `enable` : réactiver les heartbeats (à utiliser s'ils ont été désactivés).
- `disable` : mettre en pause les heartbeats.

Indicateurs :

- `--json` : sortie lisible par machine.

## `system presence`

Lister les entrées de présence système actuelles que le Gateway connaît (nœuds,
instances et lignes d'état similaires).

Indicateurs :

- `--json` : sortie lisible par machine.

## Notes

- Nécessite un Gateway en cours d'exécution accessible via votre configuration actuelle (locale ou distante).
- Les événements système sont éphémères et ne sont pas persistants après redémarrage.

import fr from "/components/footer/fr.mdx";

<fr />
