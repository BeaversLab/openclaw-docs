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
    Une Skill est un fichier Markdown (`SKILL.md`) injecté dans le prompt système.
    Les Skills fournissent à l'agent du contexte, des contraintes et des conseils étape par étape pour
    utiliser les outils efficacement. Les Skills résident dans votre espace de travail, dans des dossiers partagés,
    ou sont livrées dans des plugins.

    [Référence des Skills](/fr/tools/skills) | [Créer des Skills](/fr/tools/creating-skills)

  </Step>

  <Step title="Les Plugins regroupent le tout">
    Un plugin est un package qui peut enregistrer n'importe quelle combinaison de capacités :
    canaux, fournisseurs de modèles, outils, Skills, parole, transcription en temps réel,
    voix en temps réel, compréhension des médias, génération d'images, génération de vidéo,
    récupération Web, recherche Web, et plus encore. Certains plugins sont **core** (livrés avec
    OpenClaw), d'autres sont **externes** (publiés sur npm par la communauté).

    [Installer et configurer les plugins](/fr/tools/plugin) | [Créer le vôtre](/fr/plugins/building-plugins)

  </Step>
</Steps>

## Outils intégrés

Ces outils sont livrés avec OpenClaw et sont disponibles sans installer de plugins :

| Outil                                      | Ce qu'il fait                                                                                | Page                                                                  |
| ------------------------------------------ | -------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| `exec` / `process`                         | Exécuter des commandes shell, gérer les processus en arrière-plan                            | [Exec](/fr/tools/exec), [Approbations Exec](/fr/tools/exec-approvals) |
| `code_execution`                           | Exécuter une analyse Python distante sandboxed                                               | [Exécution de code](/fr/tools/code-execution)                         |
| `browser`                                  | Contrôler un navigateur Chromium (navigation, clic, capture d'écran)                         | [Navigateur](/fr/tools/browser)                                       |
| `web_search` / `x_search` / `web_fetch`    | Rechercher sur le web, rechercher des publications X, récupérer le contenu de la page        | [Web](/fr/tools/web), [Récupération Web](/fr/tools/web-fetch)         |
| `read` / `write` / `edit`                  | Entrées/Sorties de fichiers dans l'espace de travail                                         |                                                                       |
| `apply_patch`                              | Correctifs de fichiers multi-parties                                                         | [Appliquer un patch](/fr/tools/apply-patch)                           |
| `message`                                  | Envoyer des messages sur tous les canaux                                                     | [Envoi d'agent](/fr/tools/agent-send)                                 |
| `canvas`                                   | Nœud de pilotage Canvas (présent, éval, instantané)                                          |                                                                       |
| `nodes`                                    | Découvrir et cibler les appareils appariés                                                   |                                                                       |
| `cron` / `gateway`                         | Gérer les tâches planifiées ; inspecter, corriger, redémarrer ou mettre à jour la passerelle |                                                                       |
| `image` / `image_generate`                 | Analyser ou générer des images                                                               | [Génération d'images](/fr/tools/image-generation)                     |
| `music_generate`                           | Générer des pistes musicales                                                                 | [Génération de musique](/fr/tools/music-generation)                   |
| `video_generate`                           | Générer des vidéos                                                                           | [Génération de vidéo](/fr/tools/video-generation)                     |
| `tts`                                      | Conversion synthèse vocale ponctuelle                                                        | [TTS](/fr/tools/tts)                                                  |
| `sessions_*` / `subagents` / `agents_list` | Gestion de session, statut et orchestration des sous-agents                                  | [Sous-agents](/fr/tools/subagents)                                    |
| `session_status`                           | Relecture légère de style `/status` et remplacement du modèle de session                     | [Outils de session](/fr/concepts/session-tool)                        |

Pour le travail sur les images, utilisez `image` pour l'analyse et `image_generate` pour la génération ou l'édition. Si vous ciblez `openai/*`, `google/*`, `fal/*` ou un autre fournisseur d'images non défini par défaut, configurez d'abord la clé d'authentification/API de ce fournisseur.

Pour le travail musical, utilisez `music_generate`. Si vous ciblez `google/*`, `minimax/*` ou un autre fournisseur de musique non défini par défaut, configurez d'abord la clé d'authentification/API de ce fournisseur.

Pour le travail vidéo, utilisez `video_generate`. Si vous ciblez `qwen/*` ou un autre fournisseur vidéo non défini par défaut, configurez d'abord la clé d'authentification/API de ce fournisseur.

Pour la génération audio pilotée par un workflow, utilisez `music_generate` lorsqu'un plugin tel que ComfyUI l'enregistre. Cela est distinct de `tts`, qui est la synthèse vocale.

`session_status` est l'outil de statut/lecture léger dans le groupe des sessions. Il répond aux questions de type `/status` sur la session en cours et peut éventuellement définir une substitution de model par session ; `model=default` efface cette substitution. Comme `/status`, il peut remplir les compteurs de jetons/cache épars et l'étiquette du model d'exécution actif à partir de la dernière entrée d'utilisation de la transcription.

`gateway` est l'outil d'exécution réservé au propriétaire pour les opérations de passerelle :

- `config.schema.lookup` pour un sous-arbre de configuration à portée de chemin avant les modifications
- `config.get` pour l'instantané de la configuration actuelle + le hachage
- `config.patch` pour les mises à jour partielles de la configuration avec redémarrage
- `config.apply` uniquement pour le remplacement complet de la configuration
- `update.run` pour la mise à jour explicite de soi-même + redémarrage

Pour les modifications partielles, préférez `config.schema.lookup` puis `config.patch`. Utilisez `config.apply` uniquement lorsque vous remplacez intentionnellement l'intégralité de la configuration. L'outil refuse également de modifier `tools.exec.ask` ou `tools.exec.security` ; les alias `tools.bash.*` hérités sont normalisés vers les mêmes chemins d'exécution protégés.

### Outils fournis par le plugin

Les plugins peuvent enregistrer des outils supplémentaires. Voici quelques exemples :

- [Diffs](/fr/tools/diffs%%) — visualiseur et rendu de diffs
- [Tâche LLM](/fr/tools/llm-task) — étape LLM JSON uniquement pour la sortie structurée
- [Lobster](/fr/tools/lobster) — runtime de flux de travail typé avec approbations reprises
- [Génération de musique](/fr/tools/music-generation) — outil `music_generate` partagé avec fournisseurs basés sur des workflows
- [OpenProse](/fr/prose) — orchestration de workflow en priorité markdown
- [Tokenjuice](/fr/tools/tokenjuice) — résultats d'outil `exec` et `bash` compacts et bruyants

## Configuration des outils

### Listes d'autorisation et de refus

Contrôlez les outils que l'agent peut appeler via `tools.allow` / `tools.deny` dans
la configuration. Le refus l'emporte toujours sur l'autorisation.

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

| Profil      | Ce qu'il inclut                                                                                                                                   |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `full`      | Aucune restriction (identique à non défini)                                                                                                       |
| `coding`    | `group:fs`, `group:runtime`, `group:web`, `group:sessions`, `group:memory`, `cron`, `image`, `image_generate`, `music_generate`, `video_generate` |
| `messaging` | `group:messaging`, `sessions_list`, `sessions_history`, `sessions_send`, `session_status`                                                         |
| `minimal`   | `session_status` uniquement                                                                                                                       |

Les profils `coding` et `messaging` autorisent également les outils MCP de bundle configurés
sous la clé de plugin `bundle-mcp`. Ajoutez `tools.deny: ["bundle-mcp"]` lorsque vous
souhaitez qu'un profil conserve ses outils intégrés normaux mais masque tous les outils MCP configurés.
Le profil `minimal` n'inclut pas les outils MCP de bundle.

### Groupes d'outils

Utilisez les raccourcis `group:*` dans les listes d'autorisation/refus :

| Groupe             | Outils                                                                                                    |
| ------------------ | --------------------------------------------------------------------------------------------------------- |
| `group:runtime`    | exec, process, code_execution (`bash` est accepté comme alias pour `exec`)                                |
| `group:fs`         | read, write, edit, apply_patch                                                                            |
| `group:sessions`   | sessions_list, sessions_history, sessions_send, sessions_spawn, sessions_yield, subagents, session_status |
| `group:memory`     | memory_search, memory_get                                                                                 |
| `group:web`        | web_search, x_search, web_fetch                                                                           |
| `group:ui`         | browser, canvas                                                                                           |
| `group:automation` | cron, gateway                                                                                             |
| `group:messaging`  | message                                                                                                   |
| `group:nodes`      | nodes                                                                                                     |
| `group:agents`     | agents_list                                                                                               |
| `group:media`      | image, image_generate, music_generate, video_generate, tts                                                |
| `group:openclaw`   | Tous les outils intégrés OpenClaw (exclut les outils de plugins)                                          |

`sessions_history` renvoie une vue de rappel bornée et filtrée pour la sécurité. Il supprime
les balises de réflexion, l'échafaudage `<relevant-memories>`, les charges utiles XML d'appels d'outils en
texte brut (y compris `<tool_call>...</tool_call>`,
`<function_call>...</function_call>`, `<tool_calls>...</tool_calls>`,
`<function_calls>...</function_calls>` et les blocs d'appels d'outils tronqués),
l'échafaudage d'appels d'outils rétrogradé, les jetons de contrôle de modèle ASCII/pleine largeur fuités
et les XML d'appels d'outils MiniMax malformés du texte de l'assistant, puis applique
la rétractation/troncation et d'éventuels espaces réservés de ligne surdimensionnée au lieu d'agir
comme une vidée de transcription brute.

### Restrictions spécifiques au fournisseur

Utilisez `tools.byProvider` pour restreindre les outils pour des fournisseurs spécifiques sans
modifier les valeurs par défaut globales :

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
