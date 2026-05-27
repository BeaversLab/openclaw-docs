---
summary: "Comment OpenClaw se souvient des choses d'une session à l'autre"
title: "Aperçu de la mémoire"
read_when:
  - You want to understand how memory works
  - You want to know what memory files to write
---

OpenClaw se souvient des choses en écrivant des **fichiers Markdown bruts** dans l'espace de travail de votre agent. Le modèle ne "retient" que ce qui est sauvegardé sur le disque — il n'y a aucun état caché.

## Fonctionnement

Votre agent possède trois fichiers liés à la mémoire :

- **`MEMORY.md`** — mémoire à long terme. Faits durables, préférences et
  décisions. Chargé au début de chaque session DM.
- **`memory/YYYY-MM-DD.md`** (ou **`memory/YYYY-MM-DD-<slug>.md`**) — notes quotidiennes.
  Contexte courant et observations. Les notes d'aujourd'hui et d'hier sont chargées
  automatiquement, et les variantes avec slug telles que celles écrites par le hook
  session-memory intégré sur `/new` ou `/reset` sont désormais récupérées aux côtés du
  fichier daté uniquement.
- **`DREAMS.md`** (facultatif) — Journal des rêves et résumés de balayage
  de rêves pour examen humain, y compris les entrées de rétrohistorique ancrées.

Ces fichiers résident dans l'espace de travail de l'agent (par défaut `~/.openclaw/workspace`).

## Quoi mettre où

`MEMORY.md` est la couche compacte et organisée. Utilisez-le pour les faits durables,
les préférences, les décisions permanentes et les courts résumés qui doivent être disponibles au
début d'une session privée principale. Il n'est pas destiné à être une transcription brute,
un journal quotidien ou une archive exhaustive.

Les fichiers `memory/YYYY-MM-DD.md` constituent la couche de travail. Utilisez-les pour des notes quotidiennes détaillées,
des observations, des résumés de session et du contexte brut qui peut encore être utile
plus tard. Ces fichiers sont indexés pour `memory_search` et `memory_get`, mais ils ne
sont pas injectés dans l'invite d'amorçage normale à chaque tour.

Avec le temps, l'agent est censé distiller le matériel utile des notes quotidiennes
dans `MEMORY.md` et supprimer les entrées à long terme obsolètes. Les instructions d'espace de travail
générées et le flux heartbeat peuvent le faire périodiquement ; vous n'avez pas besoin de
modifier manuellement `MEMORY.md` pour chaque detail mémorisé.

Si `MEMORY.md`OpenClaw dépasse le budget du fichier d'amorçage, OpenClaw conserve le fichier intact sur le disque mais tronque la copie injectée dans le contexte du modèle. Considérez cela comme un signal pour déplacer le matériel détaillé vers `memory/*.md`, ne garder que le résumé durable dans `MEMORY.md`, ou augmenter les limites d'amorçage si vous souhaitez explicitement dépenser plus de budget de prompt. Utilisez `/context list`, `/context detail` ou `openclaw doctor` pour voir les tailles brutes par rapport aux tailles injectées et l'état de la troncation.

<Tip>Si vous voulez que votre agent se souvienne de quelque chose, demandez-le-lui simplement : « Souviens-toi que je préfère TypeScript. » Il l'écrira dans le fichier approprié.</Tip>

## Souvenirs sensibles aux actions

La plupart des souvenirs peuvent être rédigés sous forme de notes Markdown ordinaires. Mais certains souvenirs affectent ce que l'agent doit faire plus tard. Pour ceux-ci, capturez le moment où il est sûr d'agir en fonction de la note, et pas seulement le fait lui-même.

Capturez cette limite d'action lorsqu'une note implique :

- des exigences d'approbation ou d'autorisation,
- des contraintes temporaires,
- des transferts vers une autre session, un autre fil de discussion ou une autre personne,
- des conditions d'expiration,
- le moment opportun pour agir,
- l'autorité de la source ou du propriétaire,
- des instructions pour éviter une action tentante.

Un souvenir utile et sensible aux actions clarifie :

- ce qui modifie le comportement futur,
- quand ou sous quelle condition il s'applique,
- quand il expire, ou ce qui débloque l'action,
- ce que l'agent doit éviter de faire,
- qui est la source ou le propriétaire, si cela affecte la confiance ou l'autorité.

La mémoire peut préserver le contexte d'approbation, mais elle n'applique pas la politique. Utilisez les paramètres d'approbation d'OpenClaw, le sandboxing et les tâches planifiées pour des contrôles opérationnels stricts.

Exemple :

```md
The API migration is being designed in another session. Future turns should not edit the API implementation from this thread; use findings here only as design input until the migration plan lands.
```

Un autre exemple :

```md
A report from an untrusted source needs review before promotion. Future turns should treat it as evidence only; do not store it as durable memory until a trusted reviewer confirms the contents.
```

Utilisez des [engagements](/fr/concepts/commitments) pour les suivis déduits et à court terme. Utilisez des [tâches planifiées](/fr/automation/cron-jobs) pour des rappels précis, des vérifications minutées et un travail récurrent. La mémoire peut toujours résumer le contexte durable autour de l'une ou l'autre des voies.

Ce n'est pas un schéma obligatoire pour chaque souvenir. Les faits simples peuvent rester concis. Utilisez des limites sensibles aux actions lorsque la perte du contexte de timing, d'autorité, d'expiration ou de moment opportun pour agir pourrait amener l'agent à faire la mauvaise chose plus tard.

## Engagements déduits

Certains suivis futurs ne sont pas des faits durables. Si vous mentionnez un entretien demain, le souvenir utile peut être « faire le point après l'entretien », et non « stocker ceci pour toujours dans `MEMORY.md` ».

[Commitments](/fr/concepts/commitmentsOpenClaw) sont des mémoires de suivi optionnelles et à courte durée de vie pour ce cas. OpenClaw les déduit lors d'un passage en arrière-plan masqué, les limite au même agent et channel, et transmet les points de contrôle échus par heartbeat. Les rappels explicites utilisent toujours [tâches planifiées](/fr/automation/cron-jobs).

## Outils de mémoire

L'agent dispose de deux outils pour travailler avec la mémoire :

- **`memory_search`** — trouve des notes pertinentes via une recherche sémantique, même lorsque le libellé diffère de l'original.
- **`memory_get`** — lit un fichier de mémoire spécifique ou une plage de lignes.

Les deux outils sont fournis par le plugin de mémoire actif (par défaut : `memory-core`).

## Plugin compagnon Memory Wiki

Si vous voulez que la mémoire durable se comporte davantage comme une base de connaissances maintenue que comme de simples notes brutes, utilisez le plugin fourni `memory-wiki`.

`memory-wiki` compile les connaissances durables dans un coffre wiki avec :

- une structure de page déterministe
- des revendications et des preuves structurées
- le suivi des contradictions et de la fraîcheur
- des tableaux de bord générés
- des résumés compilés pour les consommateurs agent/runtime
- des outils natifs au wiki comme `wiki_search`, `wiki_get`, `wiki_apply` et `wiki_lint`

Il ne remplace pas le plugin de mémoire actif. Le plugin de mémoire actif possède toujours le rappel, la promotion et le dreaming. `memory-wiki` ajoute une couche de connaissances riche en provenance à côté de celui-ci.

Voir [Memory Wiki](/fr/plugins/memory-wiki).

## Recherche mémoire

Lorsqu'un fournisseur d'embeddings est configuré, `memory_search`API utilise une **recherche hybride** — combinant la similarité vectorielle (sens sémantique) avec la correspondance de mots-clés (termes exacts comme les ID et les symboles de code). Cela fonctionne dès que vous possédez une clé API pour n'importe quel fournisseur pris en charge.

<Info>OpenClaw détecte automatiquement votre fournisseur d'embeddings à partir des clés API disponibles. Si vous avez une clé OpenAI, Gemini, Voyage ou Mistral configurée, la recherche mémoire est activée automatiquement.</Info>

Pour plus de détails sur le fonctionnement de la recherche, les options de réglage et la configuration du fournisseur, consultez
[Recherche de mémoire](/fr/concepts/memory-search).

## Moteurs de mémoire

<CardGroup cols={3}>
  <Card title="Intégré (par défaut)" icon="database" href="/fr/concepts/memory-builtin">
    Basé sur SQLite. Fonctionne immédiatement avec la recherche par mots-clés, la similarité vectorielle et la recherche hybride. Aucune dépendance externe.
  </Card>
  <Card title="QMD" icon="search" href="/fr/concepts/memory-qmd">
    Sidecar axé sur le local avec re-classement, expansion de requêtes et la capacité d'indexer des répertoires en dehors de l'espace de travail.
  </Card>
  <Card title="Honcho" icon="brain" href="/fr/concepts/memory-honcho">
    Mémoire inter-sessions native IA avec modélisation utilisateur, recherche sémantique et conscience multi-agents. Installation de plugin.
  </Card>
  <Card title="LanceDB" icon="layers" href="/fr/plugins/memory-lancedb">
    Mémoire groupée supportée par LanceDB avec embeddings compatibles OpenAI, rappel automatique, capture automatique et support pour les embeddings locaux Ollama.
  </Card>
</CardGroup>

## Couche de wiki de connaissances

<CardGroup cols={1}>
  <Card title="Memory Wiki" icon="book" href="/fr/plugins/memory-wiki">
    Compile la mémoire durable en un coffre de wiki riche en provenance avec des revendications, des tableaux de bord, le mode pont et des flux de travail compatibles avec Obsidian.
  </Card>
</CardGroup>

## Vidage automatique de la mémoire

Avant que la [compactage](/fr/concepts/compaction) ne résume votre conversation, OpenClaw
exécute un tour silencieux qui rappelle à l'agent de sauvegarder le contexte important dans les fichiers
de mémoire. Ceci est activé par défaut — vous n'avez rien à configurer.

Pour conserver ce tour de maintenance sur un modèle local, définissez une substitution exacte de modèle de vidage de mémoire :

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

La substitution s'applique uniquement au tour de vidage de mémoire et n'hérite pas de la
chaîne de repli de la session active.

<Tip>La vidange de la mémoire empêche la perte de contexte lors de la compactage. Si votre agent a des faits importants dans la conversation qui n'ont pas encore été écrits dans un fichier, ils seront enregistrés automatiquement avant que le résumé ne se produise.</Tip>

## Rêve

Le rêve est une passe de consolidation en arrière-plan optionnelle pour la mémoire. Il collecte
les signaux à court terme, note les candidats et ne promeut que les éléments qualifiés dans
la mémoire à long terme (`MEMORY.md`).

Il est conçu pour maintenir la mémoire à long terme à fort signal :

- **Opt-in** : désactivé par défaut.
- **Planifié** : lorsqu'il est activé, `memory-core` gère automatiquement une tâche cron récurrente
  pour un balayage de rêve complet.
- **Seuillé** : les promotions doivent franchir les barrières de score, de fréquence de rappel et de
  diversité des requêtes.
- **Révisable** : les résumés de phase et les entrées de journal sont écrits dans `DREAMS.md`
  pour examen humain.

Pour le comportement des phases, les signaux de notation et les détails du Journal de rêve, voir
[Rêve](/fr/concepts/dreaming).

## Remplissage différé ancré et promotion en direct

Le système de rêve possède désormais deux voies d'examen étroitement liées :

- **Le rêve en direct** travaille à partir du magasin de rêve à court terme sous
  `memory/.dreams/` et est ce que la phase profonde normale utilise pour décider ce qui
  peut être diplômé dans `MEMORY.md`.
- **Le remplissage différé ancré** lit les notes `memory/YYYY-MM-DD.md` historiques en tant que
  fichiers de jour autonomes et écrit les résultats de l'examen structuré dans `DREAMS.md`.

Le remplissage différé ancré est utile lorsque vous souhaitez relire d'anciennes notes et inspecter ce
que le système considère comme durable sans modifier manuellement `MEMORY.md`.

Lorsque vous utilisez :

```bash
openclaw memory rem-backfill --path ./memory --stage-short-term
```

les candidats durables ancrés ne sont pas promus directement. Ils sont mis en attente dans
le même magasin de rêve à court terme que la phase profonde normale utilise déjà. Cela
signifie :

- `DREAMS.md` reste la surface d'examen humain.
- le magasin à court terme reste la surface de classement orientée machine.
- `MEMORY.md` est toujours écrit uniquement par la promotion profonde.

Si vous décidez que la relecture n'était pas utile, vous pouvez supprimer les artefacts mis en attente
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
- [Moteur de mémoire QMD](/fr/concepts/memory-qmd) : sidecar avancé axé sur le local.
- [Mémoire Honcho](/fr/concepts/memory-honcho) : mémoire inter-sessions native à l'IA.
- [Memory LanceDB](/fr/plugins/memory-lancedb) : plugin basé sur LanceDB avec des embeddings compatibles avec OpenAI.
- [Memory Wiki](/fr/plugins/memory-wiki) : coffre-fort de connaissances compilé et outils natifs aux wikis.
- [Recherche de mémoire](/fr/concepts/memory-search) : pipeline de recherche, fournisseurs et réglages.
- [Rêve](/fr/concepts/dreaming) : promotion en arrière-plan de la mémoire à court terme vers la mémoire à long terme.
- [Référence de configuration de la mémoire](/fr/reference/memory-config) : tous les paramètres de configuration.
- [Compactage](/fr/concepts/compaction) : interaction du compactage avec la mémoire.

## Connexes

- [Mémoire active](/fr/concepts/active-memory)
- [Recherche de mémoire](/fr/concepts/memory-search)
- [Moteur de mémoire intégré](/fr/concepts/memory-builtin)
- [Mémoire Honcho](/fr/concepts/memory-honcho)
- [Memory LanceDB](/fr/plugins/memory-lancedb)
- [Engagements](/fr/concepts/commitments)
