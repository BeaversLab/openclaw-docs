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

Ces fichiers résident dans l'espace de travail (`agents.defaults.workspace`, par défaut
`~/.openclaw/workspace`). Voir [Agent workspace](/en/concepts/agent-workspace) pour la disposition complète.

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

Lorsqu'une session est **proche de la compactage automatique**, OpenClaw déclenche un **tour silencieux
et agentique** qui rappelle au model d'écrire une mémoire durable **avant** que
le contexte ne soit compacté. Les invites par défaut indiquent explicitement que le model _peut répondre_,
mais généralement `NO_REPLY` est la bonne réponse pour que l'utilisateur ne voie jamais ce tour.
Le plugin de mémoire actif possède la stratégie d'invite/chemin pour ce vidage ; par
défaut, le plugin `memory-core` écrit dans le fichier quotidien canonique sous
`memory/YYYY-MM-DD.md`.

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

- **Seuil souple** : le vidage se déclenche lorsque l'estimation de jetons de la session dépasse
  `contextWindow - reserveTokensFloor - softThresholdTokens`.
- **Silencieux** par défaut : les invites incluent `NO_REPLY`, donc rien n'est transmis.
- **Deux invites** : une invite utilisateur plus une invite système ajoutent le rappel.
- **Un vidage par cycle de compactage** (suivi dans `sessions.json`).
- **L'espace de travail doit être accessible en écriture** : si la session s'exécute en mode sandboxé avec
  `workspaceAccess: "ro"` ou `"none"`, le vidage est ignoré.

Pour le cycle de vie complet du compactage, voir
[Gestion de session + compactage](/en/reference/session-management-compaction).

## Recherche de mémoire vectorielle

OpenClaw peut créer un petit index vectoriel sur `MEMORY.md` et `memory/*.md` afin que
les requêtes sémantiques puissent trouver des notes connexes même lorsque la formulation diffère. La recherche hybride
(BM25 + vecteur) est disponible pour combiner la correspondance sémantique avec des recherches de mots-clés exactes.

Les identifiants des adaptateurs de recherche mémoire proviennent du plugin de mémoire actif. Le plugin par défaut `memory-core` inclut des intégrations pour OpenAI, Gemini, Voyage, Mistral, Ollama et les modèles GGUF locaux, ainsi qu'un backend QMD annexe optionnel pour des fonctionnalités avancées de récupération et de post-traitement comme le reclassement de diversité MMR et la décroissance temporelle.

Pour la référence complète de la configuration, y compris la configuration du provider d'intégration, le backend QMD, le réglage de la recherche hybride, la mémoire multimodale et tous les paramètres de configuration, voir [Référence de la configuration de la mémoire](/en/reference/memory-config).
