---
title: "Mémoire"
summary: "Fonctionnement de la mémoire OpenClaw (fichiers de l'espace de travail + vidage automatique de la mémoire)"
read_when:
  - You want the memory file layout and workflow
  - You want to tune the automatic pre-compaction memory flush
---

# Mémoire

La mémoire OpenClaw est du **Markdown simple dans l'espace de travail de l'agent**. Les fichiers constituent la source de vérité ; le model ne "se souvient" que de ce qui est écrit sur le disque.

Les outils de recherche de mémoire sont fournis par le plugin de mémoire actif (par défaut :
`memory-core`). Désactivez les plugins de mémoire avec `plugins.slots.memory = "none"`.

## Fichiers de mémoire (Markdown)

La disposition de l'espace de travail par défaut utilise deux couches de mémoire :

- `memory/YYYY-MM-DD.md`
  - Journal quotidien (ajout uniquement).
  - Lecture d'aujourd'hui + d'hier au début de la session.
- `MEMORY.md` (facultatif)
  - Mémoire à long terme organisée.
  - Si `MEMORY.md` et `memory.md` existent tous les deux à la racine de l'espace de travail, OpenClaw les charge tous les deux (dédupliqués par realpath, donc les liens symboliques pointant vers le même fichier ne sont pas injectés deux fois).
  - **Charger uniquement dans la session principale privée** (jamais dans les contextes de groupe).

Ces fichiers se trouvent sous l'espace de travail (`agents.defaults.workspace`, par défaut
`~/.openclaw/workspace`). Voir [Espace de travail de l'agent](/fr/concepts/agent-workspace) pour la disposition complète.

## Outils de mémoire

OpenClaw expose deux outils orientés agent pour ces fichiers Markdown :

- `memory_search` -- rappel sémantique sur les extraits indexés.
- `memory_get` -- lecture ciblée d'un fichier/plage de lignes Markdown spécifique.

`memory_get` dégrade désormais gracieusement lorsqu'un fichier n'existe pas (par exemple,
le journal quotidien d'aujourd'hui avant la première écriture). Le gestionnaire intégré et le backend QMD
retournent tous deux `{ text: "", path }` au lieu de lever `ENOENT`, permettant aux agents de
gérer « rien d'enregistré pour l'instant » et de continuer leur flux de travail sans envelopper l'appel d'outil dans une logique try/catch.

## Quand écrire la mémoire

- Les décisions, les préférences et les faits durables vont dans `MEMORY.md`.
- Les notes quotidiennes et le contexte en cours vont dans `memory/YYYY-MM-DD.md`.
- Si quelqu'un dit « souviens-toi de ceci », notez-le (ne le gardez pas en RAM).
- Ce domaine est encore en évolution. Il aide de rappeler au model de stocker les mémoires ; il saura quoi faire.
- Si vous voulez que quelque chose reste, **demandez au bot de l'écrire** dans la mémoire.

## Vidange automatique de la mémoire (ping pré-compaction)

Lorsqu'une session est **proche de l'auto-compaction**, OpenClaw déclenche un **tour
agentique silencieux** qui rappelle au model d'écrire une mémoire durable **avant** que
le contexte ne soit compacté. Les invites par défaut indiquent explicitement que le model _peut répondre_,
mais généralement `NO_REPLY` est la réponse correcte afin que l'utilisateur ne voie jamais ce tour.

Ceci est contrôlé par `agents.defaults.compaction.memoryFlush` :

```json5
{
  agents: {
    defaults: {
      compaction: {
        reserveTokensFloor: 20000,
        memoryFlush: {
          enabled: true,
          softThresholdTokens: 4000,
          systemPrompt: "Session nearing compaction. Store durable memories now.",
          prompt: "Write any lasting notes to memory/YYYY-MM-DD.md; reply with NO_REPLY if nothing to store.",
        },
      },
    },
  },
}
```

Détails :

- **Seuil souple** : la vidange se déclenche lorsque l'estimation de jetons de session dépasse
  `contextWindow - reserveTokensFloor - softThresholdTokens`.
- **Silencieux** par défaut : les invites incluent `NO_REPLY` donc rien n'est délivré.
- **Deux invites** : une invite utilisateur plus une invite système ajoutent le rappel.
- **Une vidange par cycle de compactage** (suivi dans `sessions.json`).
- **L'espace de travail doit être inscriptible** : si la session s'exécute dans un bac à sable avec
  `workspaceAccess: "ro"` ou `"none"`, la vidange est ignorée.

Pour le cycle de vie complet du compactage, consultez
[Gestion de session + compactage](/fr/reference/session-management-compaction).

## Recherche de mémoire vectorielle

OpenClaw peut construire un petit index vectoriel sur `MEMORY.md` et `memory/*.md` afin que
les requêtes sémantiques puissent trouver des notes connexes même si le vocabulaire diffère. La recherche hybride
(BM25 + vecteur) est disponible pour combiner la correspondance sémantique avec des recherches de mots-clés
exactes.

La recherche mémoire prend en charge plusieurs providers d'intégration (OpenAI, Gemini, Voyage,
Mistral, Ollama et les modèles GGUF locaux), un backend sidecar QMD facultatif pour
la récupération avancée, et des fonctionnalités de post-traitement comme le réordonnancement de diversité MMR
et la décroissance temporelle.

Pour la référence de configuration complète -- y compris la configuration du provider d'intégration, le backend
QMD, le réglage de la recherche hybride, la mémoire multimodale et toutes les options de configuration -- consultez
[Référence de configuration de la mémoire](/fr/reference/memory-config).

import fr from "/components/footer/fr.mdx";

<fr />
