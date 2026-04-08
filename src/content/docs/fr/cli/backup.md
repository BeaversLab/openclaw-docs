---
summary: "Référence CLI pour `openclaw backup` (créer des archives de sauvegarde locales)"
read_when:
  - You want a first-class backup archive for local OpenClaw state
  - You want to preview which paths would be included before reset or uninstall
title: "backup"
---

# `openclaw backup`

Crée une archive de sauvegarde locale pour l'état, la configuration, les profils d'authentification, les identifiants canal/fournisseur, les sessions d'OpenClaw et, en option, les espaces de travail.

```bash
openclaw backup create
openclaw backup create --output ~/Backups
openclaw backup create --dry-run --json
openclaw backup create --verify
openclaw backup create --no-include-workspace
openclaw backup create --only-config
openclaw backup verify ./2026-03-09T00-00-00.000Z-openclaw-backup.tar.gz
```

## Notes

- L'archive comprend un fichier `manifest.json` avec les chemins source résolus et la structure de l'archive.
- La sortie par défaut est une archive `.tar.gz` horodatée dans le répertoire de travail actuel.
- Si le répertoire de travail actuel se trouve dans une arborescence source sauvegardée, OpenClaw revient par défaut à votre répertoire personnel pour l'emplacement de l'archive.
- Les fichiers d'archive existants ne sont jamais écrasés.
- Les chemins de sortie situés dans les arborescences d'état/espaces de travail source sont rejetés pour éviter l'auto-inclusion.
- `openclaw backup verify <archive>` valide que l'archive contient exactement un manifeste racine, rejette les chemins d'archive de type traversée et vérifie que chaque charge utile déclarée dans le manifeste existe dans le fichier tar.
- `openclaw backup create --verify` exécute cette validation immédiatement après l'écriture de l'archive.
- `openclaw backup create --only-config` sauvegarde uniquement le fichier de configuration JSON actif.

## Ce qui est sauvegardé

`openclaw backup create` planifie les sources de sauvegarde à partir de votre installation locale OpenClaw :

- Le répertoire d'état renvoyé par le résolveur d'état local d'OpenClaw, généralement `~/.openclaw`
- Le chemin du fichier de configuration actif
- Le répertoire résolu `credentials/` lorsqu'il existe en dehors du répertoire d'état
- Répertoires d'espace de travail découverts à partir de la configuration actuelle, sauf si vous passez `--no-include-workspace`

Les profils d'authentification de modèle font déjà partie du répertoire d'état sous
`agents/<agentId>/agent/auth-profiles.json`, ils sont donc normalement couverts par
l'entrée de sauvegarde de l'état.

Si vous utilisez `--only-config`, OpenClaw ignore l'état, le répertoire des identifiants et la découverte des espaces de travail, et archive uniquement le chemin du fichier de configuration actif.

OpenClaw canonise les chemins avant de construire l'archive. Si la configuration, le
dossier des identifiants ou un espace de travail se trouve déjà dans le répertoire d'état,
ils ne sont pas dupliqués en tant que sources de sauvegarde de niveau supérieur distinctes. Les chemins manquants sont
ignorés.

La charge utile de l'archive stocke le contenu des fichiers de ces arbres sources, et le `manifest.json` intégré enregistre les chemins sources absolus résolus ainsi que la disposition de l'archive utilisée pour chaque élément.

## Comportement en cas de configuration invalide

`openclaw backup` contourne intentionnellement la pré-vérification normale de la configuration afin de pouvoir toujours aider lors de la récupération. Comme la découverte des espaces de travail dépend d'une configuration valide, `openclaw backup create` échoue désormais rapidement lorsque le fichier de configuration existe mais est invalide et que la sauvegarde de l'espace de travail est toujours activée.

Si vous souhaitez toujours une sauvegarde partielle dans cette situation, relancez :

```bash
openclaw backup create --no-include-workspace
```

Cela maintient l'état, la configuration et le répertoire des identifiants externes dans le périmètre tout en
ignorant entièrement la découverte des espaces de travail.

Si vous avez seulement besoin d'une copie du fichier de configuration lui-même, `--only-config` fonctionne également lorsque la configuration est malformée car il ne repose pas sur l'analyse de la configuration pour la découverte des espaces de travail.

## Taille et performances

OpenClaw n'impose pas de taille maximale de sauvegarde intégrée ni de limite de taille par fichier.

Les limites pratiques proviennent de la machine locale et du système de fichiers de destination :

- Espace disponible pour l'écriture temporaire de l'archive plus l'archive finale
- Temps nécessaire pour parcourir de grands arbres d'espace de travail et les compresser dans un `.tar.gz`
- Temps pour rescanner l'archive si vous utilisez `openclaw backup create --verify` ou exécutez `openclaw backup verify`
- Comportement du système de fichiers sur le chemin de destination. OpenClaw privilégie une étape de publication par liens durs sans écrasement et revient à une copie exclusive lorsque les liens durs ne sont pas pris en charge

Les grands espaces de travail sont généralement le principal facteur de taille de l'archive. Si vous souhaitez une sauvegarde plus petite ou plus rapide, utilisez `--no-include-workspace`.

Pour la plus petite archive, utilisez `--only-config`.
