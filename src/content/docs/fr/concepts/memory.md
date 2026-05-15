---
summary: "OpenClawComment OpenClaw se souvient des choses d'une session à l'autre"
title: "Vue d'ensemble de la mémoire"
read_when:
  - You want to understand how memory works
  - You want to know what memory files to write
---

OpenClaw se souvient des choses en écrivant des **fichiers Markdown bruts** dans l'espace de travail de votre agent. Le modèle ne "retient" que ce qui est sauvegardé sur le disque — il n'y a aucun état caché.

## Fonctionnement

Votre agent possède trois fichiers liés à la mémoire :

- **`MEMORY.md`** — mémoire à long terme. Faits durables, préférences et décisions. Chargé au début de chaque session DM.
- **`memory/YYYY-MM-DD.md`** — notes quotidiennes. Contexte courant et observations. Les notes d'aujourd'hui et d'hier sont chargées automatiquement.
- **`DREAMS.md`** (facultatif) — journal de rêve et résumés de balayage de rêve pour examen humain, y compris les entrées de rétrohistorique ancrées.

Ces fichiers résident dans l'espace de travail de l'agent (par défaut `~/.openclaw/workspace`).

## Quoi mettre où

`MEMORY.md` est la couche compacte et curatoriale. Utilisez-le pour les faits durables, les préférences, les décisions permanentes et les courts résumés qui doivent être disponibles au début d'une session privée principale. Il n'est pas destiné à être une transcription brute, un journal quotidien ou une archive exhaustive.

Les fichiers `memory/YYYY-MM-DD.md` constituent la couche de travail. Utilisez-les pour des notes quotidiennes détaillées, des observations, des résumés de session et du contexte brut qui peut encore être utile plus tard. Ces fichiers sont indexés pour `memory_search` et `memory_get`, mais ils ne sont pas injectés dans le prompt d'amorçage normal à chaque tour.

Au fil du temps, l'agent est censé distiller le matériel utile des notes quotidiennes dans `MEMORY.md` et supprimer les entrées à long terme obsolètes. Les instructions de l'espace de travail générées et le flux de heartbeat peuvent le faire périodiquement ; vous n'avez pas besoin d'éditer manuellement `MEMORY.md` pour chaque détail mémorisé.

Si `MEMORY.md`OpenClaw dépasse le budget du fichier d'amorçage, OpenClaw conserve le fichier intact sur le disque mais tronque la copie injectée dans le contexte du modèle. Traitez cela comme un signal pour déplacer le matériel détaillé vers `memory/*.md`, ne conserver que le résumé durable dans `MEMORY.md`, ou augmenter les limites d'amorçage si vous souhaitez explicitement dépenser plus de budget de prompt. Utilisez `/context list`, `/context detail` ou `openclaw doctor` pour voir les tailles brutes par rapport aux tailles injectées et l'état de la troncation.

<Tip>Si vous voulez que votre agent se souvienne de quelque chose, demandez-le-lui simplement : « Souviens-toi que je préfère TypeScript. » Il l'écrira dans le fichier approprié.</Tip>

## Engagements déduits

Certains suivis futurs ne sont pas des faits durables. Si vous mentionnez un entretien
demain, la mémoire utile peut être « faire un point après l'entretien », et non « stocker
cela pour toujours dans `MEMORY.md` ».

Les [engagements](/fr/concepts/commitments) sont des mémoires de suivi opt-in, à courte durée de vie,
pour ce cas. OpenClaw les déduit dans un processus d'arrière-plan caché, les limite au
même agent et channel, et livre les points de contrôle échus par le biais du heartbeat.
Les rappels explicites utilisent toujours les [tâches planifiées](/fr/automation/cron-jobs).

## Outils de mémoire

L'agent dispose de deux outils pour travailler avec la mémoire :

- **`memory_search`** — trouve des notes pertinentes via une recherche sémantique, même lorsque
  le libellé diffère de l'original.
- **`memory_get`** — lit un fichier de mémoire ou une plage de lignes spécifique.

Les deux outils sont fournis par le plugin de mémoire actif (par défaut : `memory-core`).

## Plugin compagnon Memory Wiki

Si vous voulez que la mémoire durable se comporte plus comme une base de connaissances entretenue que
comme de simples notes brutes, utilisez le plugin inclus `memory-wiki`.

`memory-wiki` compile les connaissances durables dans un coffre wiki avec :

- une structure de page déterministe
- des affirmations et des preuves structurées
- le suivi des contradictions et de la fraîcheur
- des tableaux de bord générés
- des résumés compilés pour les consommateurs agent/runtime
- des outils natifs au wiki comme `wiki_search`, `wiki_get`, `wiki_apply` et `wiki_lint`

Il ne remplace pas le plugin de mémoire actif. Le plugin de mémoire actif possède toujours
le rappel, la promotion et le rêve. `memory-wiki` ajoute une couche de connaissances riche en provenance
à côté de celui-ci.

Voir [Memory Wiki](/fr/plugins/memory-wiki).

## Recherche dans la mémoire

Lorsqu'un provider d'embeddings est configuré, `memory_search` utilise une **recherche
hybride** — combinant la similarité vectorielle (signification sémantique) avec la correspondance de mots-clés
(termes exacts comme les ID et les symboles de code). Cela fonctionne dès que vous disposez
d'une clé API pour n'importe quel provider pris en charge.

<Info>OpenClaw détecte automatiquement votre fournisseur d'embeddings à partir des clés API disponibles. Si vous avez une clé OpenAI, Gemini, Voyage ou Mistral configurée, la recherche de mémoire est activée automatiquement.</Info>

Pour plus de détails sur le fonctionnement de la recherche, les options de réglage et la configuration du fournisseur, consultez
[Memory Search](/fr/concepts/memory-search).

## Moteurs de mémoire

<CardGroup cols={3}>
  <Card title="Intégré (par défaut)" icon="base de données" href="/fr/concepts/memory-builtin">
    Basé sur SQLite. Fonctionne immédiatement avec la recherche par mots-clés, la similarité vectorielle et la recherche hybride. Aucune dépendance supplémentaire.
  </Card>
  <Card title="QMD" icon="recherche" href="/fr/concepts/memory-qmd">
    Sidecar local en priorité avec reranking, expansion de requêtes et la capacité d'indexer des répertoires en dehors de l'espace de travail.
  </Card>
  <Card title="Honcho" icon="cerveau" href="/fr/concepts/memory-honcho">
    Mémoire inter-sessions native IA avec modélisation utilisateur, recherche sémantique et conscience multi-agents. Installation du plugin.
  </Card>
  <Card title="LanceDB" icon="couches" href="/fr/plugins/memory-lancedb">
    Mémoire fournie avec LanceDB, embeddings compatibles OpenAI, rappel automatique, capture automatique et support d'embeddings Ollama locaux.
  </Card>
</CardGroup>

## Couche de wiki de connaissances

<CardGroup cols={1}>
  <Card title="Memory Wiki" icon="livre" href="/fr/plugins/memory-wiki">
    Compile la mémoire durable en un coffre wiki riche en provenance avec des revendications, des tableaux de bord, le mode pont et des flux de travail compatibles avec Obsidian.
  </Card>
</CardGroup>

## Vidage automatique de la mémoire

Avant que la [compaction](/fr/concepts/compactionOpenClaw) ne résume votre conversation, OpenClaw
exécute un tour silencieux qui rappelle à l'agent d'enregistrer le contexte important dans les fichiers
de mémoire. Cette fonction est activée par défaut — vous n'avez rien à configurer.

Pour conserver ce tour de maintenance sur un modèle local, définissez une substitution exacte de modèle
pour la vidange de la mémoire (memory-flush) :

```json
{
  "agents": {
    "defaults": {
      "compaction": {
        "memoryFlush": {
          "model": "ollama/qwen3:8b"
        }
      }
    }
  }
}
```

La substitution s'applique uniquement au tour de vidange de la mémoire et n'hérite pas de la
chaîne de repli (fallback chain) de la session active.

<Tip>La vidange de la mémoire empêche la perte de contexte lors de la compaction. Si votre agent possède des faits importants dans la conversation qui n'ont pas encore été écrits dans un fichier, ils seront enregistrés automatiquement avant que le résumé ne soit effectué.</Tip>

## Rêverie

La rêverie est une passe de consolidation en arrière-plan optionnelle pour la mémoire. Elle collecte
les signaux à court terme, note les candidats et ne promeut que les éléments qualifiés dans
la mémoire à long terme (`MEMORY.md`).

Elle est conçue pour maintenir un signal élevé dans la mémoire à long terme :

- **Opt-in** : désactivée par défaut.
- **Planifiée** : lorsqu'elle est activée, `memory-core` gère automatiquement une tâche cron récurrente
  pour un balayage complet de la rêverie.
- **Seuils** : les promotions doivent franchir les barrières de score, de fréquence de rappel et de
  diversité des requêtes.
- **Révisable** : les résumés de phase et les entrées de journal sont écrits dans `DREAMS.md`
  pour examen humain.

Pour le comportement des phases, les signaux de notation et les détails du Journal de Rêve, voir
[Rêverie](/fr/concepts/dreaming).

## Remplissage ancré et promotion en direct

Le système de rêverie possède désormais deux voies d'examen étroitement liées :

- **La rêverie en direct** (Live dreaming) fonctionne à partir du magasin de rêverie à court terme sous
  `memory/.dreams/` et c'est ce que la phase profonde normale utilise pour décider ce qui
  peut passer en `MEMORY.md`.
- **Le remplissage ancré** (Grounded backfill) lit les notes historiques `memory/YYYY-MM-DD.md` comme
  fichiers jour autonomes et écrit la sortie d'examen structurée dans `DREAMS.md`.

Le remplissage ancré est utile lorsque vous souhaitez rejouer d'anciennes notes et inspecter ce
que le système considère comme durable sans modifier manuellement `MEMORY.md`.

Lorsque vous utilisez :

```bash
openclaw memory rem-backfill --path ./memory --stage-short-term
```

les candidats durables ancrés ne sont pas promus directement. Ils sont mis en attente dans
le même magasin de rêverie à court terme que la phase profonde normale utilise déjà. Cela
signifie :

- `DREAMS.md` reste la surface de révision humaine.
- le stockage à court terme reste la surface de classement orientée machine.
- `MEMORY.md` n'est toujours écrit que par promotion profonde.

Si vous décidez que la relecture n'était pas utile, vous pouvez supprimer les artefacts mis en scène
sans toucher aux entrées de journal ordinaires ou à l'état de rappel normal :

```bash
openclaw memory rem-backfill --rollback
openclaw memory rem-backfill --rollback-short-term
```

## CLI

```bash
openclaw memory status          # Check index status and provider
openclaw memory search "query"  # Search from the command line
openclaw memory index --force   # Rebuild the index
```

## Pour aller plus loin

- [Moteur de mémoire intégré](/fr/concepts/memory-builtin) : backend SQLite par défaut.
- [Moteur de mémoire QMD](/fr/concepts/memory-qmd) : sidecar avancé prioritaire local.
- [Honcho memory](/fr/concepts/memory-honcho) : mémoire inter-sessions native IA.
- [Memory LanceDB](/fr/plugins/memory-lancedb) : plugin basé sur LanceDB avec des intégrations compatibles OpenAI.
- [Memory Wiki](/fr/plugins/memory-wiki) : coffre de connaissances compilé et outils natifs wiki.
- [Recherche mémoire](/fr/concepts/memory-search) : pipeline de recherche, fournisseurs et réglages.
- [Rêve](/fr/concepts/dreaming) : promotion en arrière-plan du rappel à court terme vers la mémoire à long terme.
- [Référence de configuration de la mémoire](/fr/reference/memory-config) : tous les paramètres de configuration.
- [Compaction](/fr/concepts/compaction) : interaction de la compaction avec la mémoire.

## Connexes

- [Mémoire active](/fr/concepts/active-memory)
- [Recherche mémoire](/fr/concepts/memory-search)
- [Moteur de mémoire intégré](/fr/concepts/memory-builtin)
- [Honcho memory](/fr/concepts/memory-honcho)
- [Memory LanceDB](/fr/plugins/memory-lancedb)
- [Engagements](/fr/concepts/commitments)
