---
title: "Création de Skills"
summary: "Créez et testez des skills d'espace de travail personnalisés avec SKILL.md"
read_when:
  - You are creating a new custom skill in your workspace
  - You need a quick starter workflow for SKILL.md-based skills
---

# Créer des Skills personnalisés 🛠

OpenClaw est conçu pour être facilement extensible. Les « Skills » constituent le moyen principal d'ajouter de nouvelles capacités à votre assistant.

## Qu'est-ce qu'un Skill ?

Un skill est un répertoire contenant un fichier `SKILL.md` (qui fournit des instructions et des définitions d'outils au LLM) et éventuellement des scripts ou des ressources.

## Étape par étape : Votre premier Skill

### 1. Créer le répertoire

Les Skills résident dans votre espace de travail, généralement `~/.openclaw/workspace/skills/`. Créez un nouveau dossier pour votre skill :

```bash
mkdir -p ~/.openclaw/workspace/skills/hello-world
```

### 2. Définir le `SKILL.md`

Créez un fichier `SKILL.md` dans ce répertoire. Ce fichier utilise l'en-tête YAML pour les métadonnées et le Markdown pour les instructions.

```markdown
---
name: hello_world
description: A simple skill that says hello.
---

# Hello World Skill

When the user asks for a greeting, use the `echo` tool to say "Hello from your custom skill!".
```

### 3. Ajouter des outils (Facultatif)

Vous pouvez définir des outils personnalisés dans l'en-tête ou demander à l'agent d'utiliser les outils système existants (comme `bash` ou `browser`).

### 4. Actualiser OpenClaw

Demandez à votre agent d'« actualiser les skills » ou redémarrez la passerelle. OpenClaw découvrira le nouveau répertoire et indexera le `SKILL.md`.

## Bonnes pratiques

- **Soyez concis** : Indiquez au modèle _quoi_ faire, pas comment être une IA.
- **Sécurité d'abord** : Si votre skill utilise `bash`, assurez-vous que les invites n'autorisent pas l'injection arbitraire de commandes provenant d'une entrée utilisateur non fiable.
- **Tester localement** : Utilisez `openclaw agent --message "use my new skill"` pour tester.

## Skills partagés

Vous pouvez également parcourir et contribuer aux skills sur [ClawHub](https://clawhub.com).

import fr from '/components/footer/fr.mdx';

<fr />
