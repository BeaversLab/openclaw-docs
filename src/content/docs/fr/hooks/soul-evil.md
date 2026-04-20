---
summary: "Crochet SOUL Evil (échange SOUL.md avec SOUL_EVIL.md)"
read_when:
  - You want to enable or tune the SOUL Evil hook
  - You want a purge window or random-chance persona swap
title: "Crochet SOUL Evil"
---

# Crochet SOUL Evil

Le crochet SOUL Evil remplace le contenu **injecté** `SOUL.md` par `SOUL_EVIL.md` durant une fenêtre de purge ou au hasard. Il ne modifie **pas** les fichiers sur le disque.

## Fonctionnement

Lorsque `agent:bootstrap` s'exécute, le crochet peut remplacer le contenu `SOUL.md` en mémoire avant que le prompt système ne soit assemblé. Si `SOUL_EVIL.md` est manquant ou vide, OpenClaw enregistre un avertissement et conserve le `SOUL.md` normal.

Les exécutions de sous-agents n'incluent **pas** `SOUL.md` dans leurs fichiers d'amorçage, donc ce crochet n'a aucun effet sur les sous-agents.

## Activation

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

**Priorité :** la fenêtre de purge prime sur le hasard.

**Fuseau horaire :** utilise `agents.defaults.userTimezone` s'il est défini ; sinon le fuseau horaire de l'hôte.

## Notes

- Aucun fichier n'est écrit ou modifié sur le disque.
- Si `SOUL.md` n'est pas dans la liste d'amorçage, le crochet ne fait rien.

## Voir aussi

- [Crochets](/fr/hooks)
