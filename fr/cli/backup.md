---
summary: "Référence CLI pour `openclaw backup` (créer des archives de sauvegarde locales)"
read_when:
  - You want a first-class backup archive for local OpenClaw state
  - You want to preview which paths would be included before reset or uninstall
title: "backup"
---

# `openclaw backup`

Créer une archive de sauvegarde locale pour l'état OpenClaw, la configuration, les identifiants, les sessions et, facultativement, les espaces de travail.

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
- Le répertoire OAuth / identifiants
- Les répertoires d'espaces de travail découverts à partir de la configuration actuelle, sauf si vous passez `--no-include-workspace`

Si vous utilisez `--only-config`, OpenClaw ignore l'état, les identifiants et la découverte des espaces de travail et archive uniquement le chemin du fichier de configuration actif.

OpenClaw canonise les chemins avant de créer l'archive. Si la configuration, les identifiants ou un espace de travail résident déjà dans le répertoire d'état, ils ne sont pas dupliqués en tant que sources de sauvegarde de premier niveau distinctes. Les chemins manquants sont ignorés.

La charge utile de l'archive stocke le contenu des fichiers de ces arborescences sources, et le `manifest.json` intégré enregistre les chemins source absolus résolus ainsi que la disposition de l'archive utilisée pour chaque élément.

## Comportement en cas de configuration invalide

`openclaw backup` contourne intentionnellement la pré-vérification de configuration normale afin de pouvoir encore aider lors de la récupération. Étant donné que la découverte des espaces de travail dépend d'une configuration valide, `openclaw backup create` échoue désormais rapidement lorsque le fichier de configuration existe mais est invalide et que la sauvegarde de l'espace de travail est toujours activée.

Si vous souhaitez tout de même une sauvegarde partielle dans cette situation, relancez :

```bash
openclaw backup create --no-include-workspace
```

Cela garde l'état, la configuration et les informations d'identification dans la portée tout en ignorant totalement la découverte de l'espace de travail.

Si vous avez seulement besoin d'une copie du fichier de configuration lui-même, `--only-config` fonctionne également lorsque la configuration est malformée car il ne repose pas sur l'analyse de la configuration pour la découverte de l'espace de travail.

## Taille et performance

OpenClaw n'impose pas de taille de sauvegarde maximale intégrée ni de limite de taille par fichier.

Les limites pratiques proviennent de la machine locale et du système de fichiers de destination :

- Espace disponible pour l'écriture temporaire de l'archive ainsi que pour l'archive finale
- Temps nécessaire pour parcourir les grandes arborescences d'espaces de travail et les compresser dans un `.tar.gz`
- Temps pour rescanner l'archive si vous utilisez `openclaw backup create --verify` ou exécutez `openclaw backup verify`
- Comportement du système de fichiers au chemin de destination. OpenClaw préfère une étape de publication par lien physique sans écrasement et revient à une copie exclusive lorsque les liens physiques ne sont pas pris en charge

Les espaces de travail volumineux sont généralement le facteur principal de la taille de l'archive. Si vous souhaitez une sauvegarde plus petite ou plus rapide, utilisez `--no-include-workspace`.

Pour la plus petite archive, utilisez `--only-config`.

import fr from "/components/footer/fr.mdx";

<fr />
