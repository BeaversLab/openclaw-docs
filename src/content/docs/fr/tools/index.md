---
summary: "Aperçu des outils et plugins d'OpenClaw : ce que l'agent peut faire et comment l'étendre"
read_when:
  - You want to understand what tools OpenClaw provides
  - You need to configure, allow, or deny tools
  - You are deciding between built-in tools, skills, and plugins
title: "Outils et Plugins"
---

# Outils et Plugins

Tout ce que fait l'agent au-delà de la génération de texte se fait par le biais d'**outils**.
Les outils sont le moyen par lequel l'agent lit les fichiers, exécute des commandes, navigue sur le Web, envoie
des messages et interagit avec les appareils.

## Outils, Skills et Plugins

OpenClaw possède trois couches qui fonctionnent ensemble :

<Steps>
  <Step title="Les outils sont ce que l'agent appelle">
    Un outil est une fonction typée que l'agent peut invoquer (par ex. `exec`, `browser`,
    `web_search`, `message`). OpenClaw fournit un ensemble d'**outils intégrés** et
    les plugins peuvent en enregistrer d'autres.

    L'agent perçoit les outils comme des définitions de fonctions structurées envoyées au model API.

  </Step>

  <Step title="Les Skills enseignent à l'agent quand et comment">
    Une Skill est un fichier markdown (`SKILL.md`) injecté dans le système de prompt.
    Les Skills fournissent à l'agent du contexte, des contraintes et des instructions étape par étape pour
    utiliser les outils efficacement. Les Skills résident dans votre espace de travail, dans des dossiers partagés,
    ou sont inclus dans des plugins.

    [Référence des Skills](/en/tools/skills) | [Créer des Skills](/en/tools/creating-skills)

  </Step>

  <Step title="Les plugins regroupent tout">
    Un plugin est un paquet qui peut enregistrer n'importe quelle combinaison de capacités :
    canaux, fournisseurs de model, outils, compétences, synthèse vocale, génération d'images, et plus encore.
    Certains plugins sont **principaux** (fournis avec OpenClaw), d'autres sont **externes**
    (publiés sur npm par la communauté).

    [Installer et configurer des plugins](/en/tools/plugin) | [Créer le vôtre](/en/plugins/building-plugins)

  </Step>
</Steps>

## Outils intégrés

Ces outils sont livrés avec OpenClaw et sont disponibles sans installer de plugins :

| Outil                                   | Ce qu'il fait                                                                         | Page                                            |
| --------------------------------------- | ------------------------------------------------------------------------------------- | ----------------------------------------------- |
| `exec` / `process`                      | Exécuter des commandes shell, gérer les processus en arrière-plan                     | [Exec](/en/tools/exec)                          |
| `code_execution`                        | Exécuter une analyse Python distante sandboxed                                        | [Code Execution](/en/tools/code-execution)      |
| `browser`                               | Contrôler un navigateur Chromium (navigation, clic, capture d'écran)                  | [Browser](/en/tools/browser)                    |
| `web_search` / `x_search` / `web_fetch` | Rechercher sur le web, rechercher des publications X, récupérer le contenu de la page | [Web](/en/tools/web)                            |
| `read` / `write` / `edit`               | Entrées/Sorties de fichiers dans l'espace de travail                                  |                                                 |
| `apply_patch`                           | Correctifs de fichiers multi-parties                                                  | [Appliquer le correctif](/en/tools/apply-patch) |
| `message`                               | Envoyer des messages sur tous les canaux                                              | [Envoi d'agent](/en/tools/agent-send)           |
| `canvas`                                | Nœud de pilotage Canvas (présent, éval, instantané)                                   |                                                 |
| `nodes`                                 | Découvrir et cibler les appareils appariés                                            |                                                 |
| `cron` / `gateway`                      | Gérer les tâches planifiées, redémarrer la passerelle                                 |                                                 |
| `image` / `image_generate`              | Analyser ou générer des images                                                        |                                                 |
| `sessions_*` / `agents_list`            | Gestion de session, sous-agents                                                       | [Sous-agents](/en/tools/subagents)              |

Pour le travail d'image, utilisez `image` pour l'analyse et `image_generate` pour la génération ou l'édition. Si vous ciblez `openai/*`, `google/*`, `fal/*` ou un autre fournisseur d'images non par défaut, configurez d'abord la clé d'auth/API de ce fournisseur.

### Outils fournis par des plugins

Les plugins peuvent enregistrer des outils supplémentaires. Quelques exemples :

- [Lobster](/en/tools/lobster) — runtime de workflow typé avec approbations reprises
- [Tâche LLM](/en/tools/llm-task) — étape LLM JSON uniquement pour une sortie structurée
- [Diffs](/en/tools/diffs) — visualiseur et rendu de diffs
- [OpenProse](/en/prose) — orchestration de workflow centrée sur le markdown

## Configuration des outils

### Listes d'autorisation et de refus

Contrôlez les outils que l'agent peut appeler via `tools.allow` / `tools.deny` dans
la configuration. La liste de refus l'emporte toujours sur la liste d'autorisation.

```json5
{
  tools: {
    allow: ["group:fs", "browser", "web_search"],
    deny: ["exec"],
  },
}
```

### Profils d'outils

`tools.profile` définit une liste d'autorisation de base avant que `allow`/`deny` ne soit appliqué.
Remplacement par agent : `agents.list[].tools.profile`.

| Profil      | Ce qu'il inclut                                      |
| ----------- | ---------------------------------------------------- |
| `full`      | Tous les outils (par défaut)                         |
| `coding`    | E/S de fichiers, runtime, sessions, mémoire, image   |
| `messaging` | Messagerie, liste/historique/envoi/statut de session |
| `minimal`   | `session_status` uniquement                          |

### Groupes d'outils

Utiliser les raccourcis `group:*` dans les listes d'autorisation/refus :

| Groupe             | Outils                                                                                                    |
| ------------------ | --------------------------------------------------------------------------------------------------------- |
| `group:runtime`    | exec, bash, process, code_execution                                                                       |
| `group:fs`         | read, write, edit, apply_patch                                                                            |
| `group:sessions`   | sessions_list, sessions_history, sessions_send, sessions_spawn, sessions_yield, subagents, session_status |
| `group:memory`     | memory_search, memory_get                                                                                 |
| `group:web`        | web_search, x_search, web_fetch                                                                           |
| `group:ui`         | browser, canvas                                                                                           |
| `group:automation` | cron, gateway                                                                                             |
| `group:messaging`  | message                                                                                                   |
| `group:nodes`      | nodes                                                                                                     |
| `group:openclaw`   | Tous les outils OpenClaw intégrés (exclut les outils de plugin)                                           |

### Restrictions spécifiques au fournisseur

Utilisez `tools.byProvider` pour restreindre les outils pour des fournisseurs spécifiques sans
changer les paramètres globaux par défaut :

```json5
{
  tools: {
    profile: "coding",
    byProvider: {
      "google-antigravity": { profile: "minimal" },
    },
  },
}
```
