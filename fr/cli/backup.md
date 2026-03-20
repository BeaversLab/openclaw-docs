---
summary: "Référence CLI pour `openclaw backup` (créer des archives de sauvegarde locales)"
read_when:
  - Vous souhaitez une archive de sauvegarde de premier ordre pour l'état local de OpenClaw
  - Vous souhaitez prévisualiser les chemins qui seraient inclus avant une réinitialisation ou une désinstallation
title: "backup"
---

# `openclaw backup`

Crée une archive de sauvegarde locale pour l'état, la configuration, les identifiants, les sessions de OpenClaw et, en option, les espaces de travail.

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

- L'archive comprend un fichier `manifest.json` contenant les chemins source résolus et la structure de l'archive.
- La sortie par défaut est une archive `.tar.gz` horodatée dans le répertoire de travail actuel.
- Si le répertoire de travail actuel se trouve dans une arborescence source sauvegardée, OpenClaw revient par défaut à votre répertoire personnel pour l'emplacement de l'archive.
- Les fichiers d'archive existants ne sont jamais écrasés.
- Les chemins de sortie situés dans les arborescences d'état ou d'espace de travail de la source sont rejetés pour éviter l'auto-inclusion.
- `openclaw backup verify <archive>` valide que l'archive contient exactement un manifeste racine, rejette les chemins d'archive de type traversée et vérifie que chaque charge utile déclarée dans le manifeste existe dans le tarball.
- `openclaw backup create --verify` exécute cette validation immédiatement après l'écriture de l'archive.
- `openclaw backup create --only-config` sauvegarde uniquement le fichier de configuration JSON actif.

## Ce qui est sauvegardé

`openclaw backup create` planifie les sources de sauvegarde à partir de votre installation locale de OpenClaw :

- Le répertoire d'état renvoyé par le résolveur d'état local de OpenClaw, généralement `~/.openclaw`
- Le chemin du fichier de configuration actif
- Le répertoire OAuth / identifiants
- Les répertoires d'espaces de travail découverts à partir de la configuration actuelle, sauf si vous passez `--no-include-workspace`

Si vous utilisez `--only-config`, OpenClaw ignore l'état, les identifiants et la découverte des espaces de travail, et archive uniquement le chemin du fichier de configuration actif.

OpenClaw canonise les chemins avant de créer l'archive. Si la configuration, les identifiants ou un espace de travail se trouvent déjà dans le répertoire d'état, ils ne sont pas dupliqués en tant que sources de sauvegarde de niveau supérieur distinctes. Les chemins manquants sont ignorés.

La charge utile de l'archive stocke le contenu des fichiers de ces arborescences sources, et le `manifest.json` intégré enregistre les chemins source absolus résolus ainsi que la structure de l'archive utilisée pour chaque ressource.

## Comportement en cas de configuration non valide

`openclaw backup` contourne intentionnellement la vérification préalable normale de la configuration afin qu'il puisse toujours aider lors de la récupération. Comme la découverte de l'espace de travail dépend d'une configuration valide, `openclaw backup create` échoue maintenant rapidement lorsque le fichier de configuration existe mais est invalide et que la sauvegarde de l'espace de travail est toujours activée.

Si vous souhaitez tout de même une sauvegarde partielle dans cette situation, relancez :

```bash
openclaw backup create --no-include-workspace
```

Cela permet de conserver l'état, la configuration et les informations d'identification tout en ignorant totalement la découverte de l'espace de travail.

Si vous avez uniquement besoin d'une copie du fichier de configuration lui-même, `--only-config` fonctionne également lorsque la configuration est malformée car il ne repose pas sur l'analyse de la configuration pour la découverte de l'espace de travail.

## Taille et performances

OpenClaw n'impose pas de taille maximale de sauvegarde intégrée ni de limite de taille par fichier.

Les limites pratiques proviennent de la machine locale et du système de fichiers de destination :

- Espace disponible pour l'écriture de l'archive temporaire plus l'archive finale
- Temps nécessaire pour parcourir les grands arbres d'espaces de travail et les compresser dans un `.tar.gz`
- Temps pour réanalyser l'archive si vous utilisez `openclaw backup create --verify` ou exécutez `openclaw backup verify`
- Comportement du système de fichiers sur le chemin de destination. OpenClaw privilégie une étape de publication par lien dur sans écrasement et revient à une copie exclusive lorsque les liens durs ne sont pas pris en charge

Les grands espaces de travail sont généralement le principal facteur de la taille de l'archive. Si vous souhaitez une sauvegarde plus petite ou plus rapide, utilisez `--no-include-workspace`.

Pour obtenir la plus petite archive, utilisez `--only-config`.

import en from "/components/footer/en.mdx";

<en />
