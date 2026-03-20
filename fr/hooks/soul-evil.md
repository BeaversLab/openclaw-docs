---
summary: "SOUL Evil hook (swap SOUL.md with SOUL_EVIL.md)"
read_when:
  - Vous souhaitez activer ou régler le hook SOUL Evil
  - Vous souhaitez une fenêtre de purge ou un échange de personnalité aléatoire
title: "SOUL Evil Hook"
---

# SOUL Evil Hook

Le hook SOUL Evil remplace le contenu `SOUL.md` **injecté** par `SOUL_EVIL.md` durant
une fenêtre de purge ou par hasard. Il ne modifie **pas** les fichiers sur le disque.

## Fonctionnement

Lorsque `agent:bootstrap` s'exécute, le hook peut remplacer le contenu `SOUL.md` en mémoire
avant que le prompt système ne soit assemblé. Si `SOUL_EVIL.md` est manquant ou vide,
OpenClaw enregistre un avertissement et conserve le `SOUL.md` normal.

Les exécutions de sous-agents n'incluent **pas** `SOUL.md` dans leurs fichiers d'amorçage, donc ce hook
n'a aucun effet sur les sous-agents.

## Activer

```bash
openclaw hooks enable soul-evil
```

Ensuite, définissez la configuration :

```json
{
  "hooks": {
    "internal": {
      "enabled": true,
      "entries": {
        "soul-evil": {
          "enabled": true,
          "file": "SOUL_EVIL.md",
          "chance": 0.1,
          "purge": { "at": "21:00", "duration": "15m" }
        }
      }
    }
  }
}
```

Créez `SOUL_EVIL.md` à la racine de l'espace de travail de l'agent (à côté de `SOUL.md`).

## Options

- `file` (chaîne) : nom de fichier SOUL alternatif (par défaut : `SOUL_EVIL.md`)
- `chance` (nombre 0–1) : chance aléatoire par exécution d'utiliser `SOUL_EVIL.md`
- `purge.at` (HH:mm) : début de la purge quotidienne (horloge 24 heures)
- `purge.duration` (durée) : longueur de la fenêtre (ex. `30s`, `10m`, `1h`)

**Priorité :** la fenêtre de purge l'emporte sur le hasard.

**Fuseau horaire :** utilise `agents.defaults.userTimezone` si défini ; sinon le fuseau horaire de l'hôte.

## Notes

- Aucun fichier n'est écrit ou modifié sur le disque.
- Si `SOUL.md` n'est pas dans la liste d'amorçage, le hook ne fait rien.

## Voir aussi

- [Hooks](/fr/hooks)

import en from "/components/footer/en.mdx";

<en />
