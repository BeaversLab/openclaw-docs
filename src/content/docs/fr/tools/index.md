---
summary: "Aperçu des outils et plugins d'OpenClaw : ce que l'agent peut faire et comment l'étendre"
read_when:
  - You want to understand what tools OpenClaw provides
  - You need to configure, allow, or deny tools
  - You are deciding between built-in tools, skills, and plugins
title: "Outils et plugins"
---

Tout ce que l'agent fait au-delà de la génération de texte se fait par le biais d'**outils**.
Les outils sont le moyen par lequel l'agent lit les fichiers, exécute des commandes, navigue sur le Web, envoie
messages et interagit avec les appareils.

## Outils, compétences et plugins

OpenClaw possède trois couches qui fonctionnent ensemble :

<Steps>
  <Step title="Les outils sont ce que l'agent appelle">
    Un outil est une fonction typée que l'agent peut invoquer (par ex. `exec`, `browser`,
    `web_search`, `message`). OpenClaw est fourni avec un ensemble d'**outils intégrés** et
    les plugins peuvent en enregistrer d'autres.

    L'agent perçoit les outils comme des définitions de fonctions structurées envoyées à l'API du modèle API.

  </Step>

  <Step title="Les compétences enseignent à l'agent quand et comment">
    Une compétence est un fichier markdown (`SKILL.md`) injecté dans le système d'invite (prompt).
    Les compétences fournissent à l'agent du contexte, des contraintes et des instructions étape par étape pour
    utiliser les outils efficacement. Les compétences résident dans votre espace de travail, dans des dossiers partagés,
    ou sont livrées dans des plugins.

    [Référence des compétences](/fr/tools/skills) | [Créer des compétences](/fr/tools/creating-skills)

  </Step>

  <Step title="Les plugins regroupent le tout">
    Un plugin est un package capable d'enregistrer n'importe quelle combinaison de capacités :
    canaux, fournisseurs de modèles, outils, compétences, parole, transcription en temps réel,
    voix en temps réel, compréhension des médias, génération d'images, génération de vidéo,
    récupération Web, recherche Web, et plus encore. Certains plugins sont **principaux** (livrés avec
    OpenClaw), d'autres sont **externes** (publiés sur npm par la communauté).

    [Installer et configurer des plugins](/fr/tools/plugin) | [Créer le vôtre](/fr/plugins/building-plugins)

  </Step>
</Steps>

## Outils intégrés

Ces outils sont fournis avec OpenClaw et sont disponibles sans installer de plugins :

| Outil                                      | Ce qu'il fait                                                                                | Page                                                                  |
| ------------------------------------------ | -------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| `exec` / `process`                         | Exécuter des commandes shell, gérer les processus d'arrière-plan                             | [Exec](/fr/tools/exec), [Approbations Exec](/fr/tools/exec-approvals) |
| `code_execution`                           | Exécuter une analyse Python distante en bac à sable (sandboxed)                              | [Exécution de code](/fr/tools/code-execution)                         |
| `browser`                                  | Contrôler un navigateur Chromium (navigation, clic, capture d'écran)                         | [Navigateur](/fr/tools/browser)                                       |
| `web_search` / `x_search` / `web_fetch`    | Rechercher sur le web, rechercher des publications X, récupérer le contenu de la page        | [Web](/fr/tools/web), [Récupération Web](/fr/tools/web-fetch)         |
| `read` / `write` / `edit`                  | E/S de fichiers dans l'espace de travail                                                     |                                                                       |
| `apply_patch`                              | Correctifs de fichiers multi-blocs                                                           | [Appliquer le correctif](/fr/tools/apply-patch)                       |
| `message`                                  | Envoyer des messages sur tous les canaux                                                     | [Envoi d'agent](/fr/tools/agent-send)                                 |
| `canvas`                                   | Piloter le Canvas de nœud (présenter, évaluer, capture instantanée)                          |                                                                       |
| `nodes`                                    | Découvrir et cibler les appareils couplés                                                    |                                                                       |
| `cron` / `gateway`                         | Gérer les tâches planifiées ; inspecter, corriger, redémarrer ou mettre à jour la passerelle |                                                                       |
| `image` / `image_generate`                 | Analyser ou générer des images                                                               | [Génération d'images](/fr/tools/image-generation)                     |
| `music_generate`                           | Générer des pistes musicales                                                                 | [Génération de musique](/fr/tools/music-generation)                   |
| `video_generate`                           | Générer des vidéos                                                                           | [Génération de vidéo](/fr/tools/video-generation)                     |
| `tts`                                      | Conversion texte-vers-parole en une seule passe (one-shot)                                   | [TTS](/fr/tools/tts)                                                  |
| `sessions_*` / `subagents` / `agents_list` | Gestion de session, état et orchestration de sous-agents                                     | [Sous-agents](/fr/tools/subagents)                                    |
| `session_status`                           | Lecture de style `/status` légère et remplacement du modèle de session                       | [Outils de session](/fr/concepts/session-tool)                        |

Pour le travail sur les images, utilisez `image` pour l'analyse et `image_generate` pour la génération ou l'édition. Si vous ciblez `openai/*`, `google/*`, `fal/*` ou un autre fournisseur d'images non par défaut, configurez d'abord la clé d'authentification/API de ce fournisseur.

Pour le travail musical, utilisez `music_generate`. Si vous ciblez `google/*`, `minimax/*` ou un autre fournisseur de musique non par défaut, configurez d'abord la clé d'authentification/API de ce fournisseur.

Pour le travail vidéo, utilisez `video_generate`. Si vous ciblez `qwen/*` ou un autre fournisseur vidéo non par défaut, configurez d'abord la clé d'authentification/API de ce fournisseur.

Pour la génération audio pilotée par flux de travail (workflow), utilisez `music_generate` lorsqu'un plugin tel que ComfyUI l'enregistre. Cela est distinct de `tts`, qui correspond à la synthèse vocale.

`session_status` est l'outil léger de statut et de lecture (readback) du groupe sessions. Il répond aux questions de style `/status` sur la session en cours et peut facultativement définir une substitution de modèle par session ; `model=default` efface cette substitution. Comme `/status`, il peut remplir les compteurs de jetons/cache épars et l'étiquette du modèle d'exécution actif à partir de la dernière entrée d'utilisation du transcript.

`gateway` est l'outil d'exécution réservé au propriétaire pour les opérations de passerelle :

- `config.schema.lookup` pour un sous-arbre de configuration délimité par un chemin avant les modifications
- `config.get` pour l'instantané de la configuration actuelle + le hachage
- `config.patch` pour les mises à jour partielles de la configuration avec redémarrage
- `config.apply` uniquement pour le remplacement complet de la configuration
- `update.run` pour une mise à jour explicite de soi-même + redémarrage

Pour des modifications partielles, préférez `config.schema.lookup` puis `config.patch`. Utilisez
`config.apply` uniquement lorsque vous remplacez intentionnellement l'intégralité de la configuration.
Pour une documentation plus générale sur la configuration, lisez [Configuration](/fr/gateway/configuration) et
[Configuration reference](/fr/gateway/configuration-reference).
L'outil refuse également de modifier `tools.exec.ask` ou `tools.exec.security` ;
les alias `tools.bash.*` obsolètes sont normalisés vers les mêmes chemins d'exécution protégés.

### Outils fournis par des plugins

Les plugins peuvent enregistrer des outils supplémentaires. Quelques exemples :

- [Diffs](/fr/tools/diffs) — visualiseur et rendu de différences
- [LLM Task](/fr/tools/llm-task) — étape LLM JSON uniquement pour une sortie structurée
- [Lobster](/fr/tools/lobster) — runtime de workflow typé avec approbations reprise
- [Music Generation](/fr/tools/music-generation) — outil `music_generate` partagé avec des fournisseurs basés sur des workflows
- [OpenProse](/fr/prose) — orchestration de workflow markdown-first
- [Tokenjuice](/fr/tools/tokenjuice) — résultats d'outil `exec` et `bash` compacts et bruités

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

OpenClaw échoue de manière sécurisée lorsqu'une liste d'autorisation explicite ne donne aucun outil appelable.
Par exemple, `tools.allow: ["query_db"]` ne fonctionne que si un plugin chargé enregistre
réellement `query_db`. Si aucun outil intégré, plugin ou MCP regroupé ne correspond à la
liste d'autorisation, l'exécution s'arrête avant l'appel au model au lieu de continuer en tant qu'exécution
text-only qui pourrait halluciner des résultats d'outils.

### Profils d'outils

`tools.profile` définit une liste d'autorisation de base avant que `allow`/`deny` ne soit appliqué.
Remplacement par agent : `agents.list[].tools.profile`.

| Profil      | Ce qu'il inclut                                                                                                                                   |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `full`      | Aucune restriction (identique à non défini)                                                                                                       |
| `coding`    | `group:fs`, `group:runtime`, `group:web`, `group:sessions`, `group:memory`, `cron`, `image`, `image_generate`, `music_generate`, `video_generate` |
| `messaging` | `group:messaging`, `sessions_list`, `sessions_history`, `sessions_send`, `session_status`                                                         |
| `minimal`   | `session_status` uniquement                                                                                                                       |

`coding` comprend des outils web légers (`web_search`, `web_fetch`, `x_search`)
mais pas l'outil complet de contrôle du navigateur. L'automatisation du navigateur peut piloter de vraies
sessions et des profils connectés, ajoutez-le donc explicitement avec
`tools.alsoAllow: ["browser"]` ou un
`agents.list[].tools.alsoAllow: ["browser"]` par agent.

Les profils `coding` et `messaging` permettent également les outils MCP de bundle configurés
sous la clé de plugin `bundle-mcp`. Ajoutez `tools.deny: ["bundle-mcp"]` lorsque vous
souhaitez qu'un profil conserve ses outils intégrés normaux mais masque tous les outils MCP configurés.
Le profil `minimal` n'inclut pas les outils MCP de bundle.

### Groupes d'outils

Utilisez les raccourcis `group:*` dans les listes d'autorisation/d'interdiction :

| Groupe             | Outils                                                                                                    |
| ------------------ | --------------------------------------------------------------------------------------------------------- |
| `group:runtime`    | exec, process, code_execution (`bash` est accepté comme un alias pour `exec`)                             |
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
| `group:openclaw`   | Tous les outils OpenClaw intégrés (exclut les outils de plugin)                                           |

`sessions_history` renvoie une vue de rappel délimitée et filtrée pour la sécurité. Il supprime les balises de réflexion, l'échafaudage `<relevant-memories>`, les charges utiles XML d'appel d'outil en texte brut (y compris `<tool_call>...</tool_call>`, `<function_call>...</function_call>`, `<tool_calls>...</tool_calls>`, `<function_calls>...</function_calls>` et les blocs d'appel d'outil tronqués), l'échafaudage d'appel d'outil rétrogradé, les jetons de contrôle de modèle ASCII/pleine largeur divulgués et le XML d'appel d'outil MiniMax malformé du texte de l'assistant, puis applique une rédaction/troncature et des espaces réservés éventuels pour les lignes trop volumineuses au lieu d'agir comme un vidage de transcription brut.

### Restrictions spécifiques au fournisseur

Utilisez `tools.byProvider` pour restreindre les outils pour des fournisseurs spécifiques sans modifier les paramètres globaux par défaut :

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
