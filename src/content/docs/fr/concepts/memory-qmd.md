---
summary: "Side-car de recherche local-first avec BM25, vecteurs, re-classement et expansion de requête"
title: "Moteur de mémoire QMD"
read_when:
  - You want to set up QMD as your memory backend
  - You want advanced memory features like reranking or extra indexed paths
---

[QMD](https://github.com/tobi/qmd) est un sidecar de recherche axé sur le local qui s'exécute
aux côtés de OpenClaw. Il combine BM25, la recherche vectorielle et le reranking dans un seul
binaire, et peut indexer du contenu au-delà de vos fichiers de mémoire d'espace de travail.

## Ce qu'il ajoute par rapport au intégré

- **Re-classement et expansion de requête** pour une meilleure rappel.
- **Indexer des répertoires supplémentaires** -- docs de projet, notes d'équipe, n'importe quoi sur le disque.
- **Indexer les transcripts de session** -- rappeler les conversations précédentes.
- **Entièrement local** -- fonctionne avec le package d'exécution optionnel node-llama-cpp et
  télécharge automatiquement les modèles GGUF.
- **Repli automatique** -- si QMD n'est pas disponible, OpenClaw revient sans transition au
  moteur intégré.

## Getting started

### Prérequis

- Installez QMD : `npm install -g @tobilu/qmd` ou `bun install -g @tobilu/qmd`
- Build SQLite qui permet les extensions (`brew install sqlite` sur macOS).
- QMD doit être sur le `PATH` de la passerelle.
- macOS et Linux fonctionnent immédiatement. Windows est mieux pris en charge via WSL2.

### Activer

```json5
{
  memory: {
    backend: "qmd",
  },
}
```

OpenClaw crée un domicile QMD autonome sous
`~/.openclaw/agents/<agentId>/qmd/` et gère le cycle de vie du side-car
automatiquement -- les collections, mises à jour et exécutions d'embedding sont gérées pour vous.
Il privilégie les formes actuelles de collection QMD et de requête MCP, mais revient toujours aux
indicateurs de modèle de collection alternatifs et aux anciens noms d'outil MCP si nécessaire.
La réconciliation au démarrage recrée également les collections gérées obsolètes selon leurs
modèles canoniques lorsqu'une ancienne collection QMD portant le même nom est encore
présente.

## Fonctionnement du side-car

- OpenClaw crée des collections à partir de vos fichiers de mémoire d'espace de travail et de tout
  `memory.qmd.paths` configuré, puis exécute `qmd update` lorsque le gestionnaire QMD est
  ouvert et périodiquement par la suite (par défaut toutes les 5 minutes). Ces actualisations
  s'exécutent via des sous-processus QMD, et non via une analyse du système de fichiers en cours de processus. Les modes
  sémantiques exécutent également `qmd embed`.
- La collection d'espace de travail par défaut suit `MEMORY.md` ainsi que l'arborescence `memory/`.
  Le `memory.md` en minuscules n'est pas indexé en tant que fichier mémoire racine.
- Le scanner propre de QMD ignore les chemins cachés et les répertoires de dépendances/compilation courants tels que `.git`, `.cache`, `node_modules`, `vendor`, `dist` et
  `build`. Le démarrage de Gateway n'initialise pas QMD par défaut, donc le démarrage à froid
  évite d'importer le runtime de mémoire ou de créer l'observateur de longue durée avant
  que la mémoire ne soit utilisée pour la première fois.
- Si vous souhaitez tout de même une actualisation au démarrage de la passerelle, définissez
  `memory.qmd.update.startup` sur `idle` ou `immediate`. L'actualisation au démarrage optionnelle
  utilise un chemin de sous-processus QMD à usage unique au lieu de créer l'observateur
  complet de longue durée en cours de processus.
- Les recherches utilisent le `searchMode` configuré (par défaut : `search` ; prend également en charge
  `vsearch` et `query`). `search` est en BM25 uniquement, donc OpenClaw ignore les sondages de préparation des vecteurs sémantiques et la maintenance des plongements (embeddings) dans ce mode. Si un mode échoue, OpenClaw réessaie avec `qmd query`.
- Avec les versions de QMD qui prennent en charge les filtres multi-collections, OpenClaw regroupe les collections de même source en un seul appel de recherche QMD. Les anciennes versions de QMD conservent le repli compatible par collection.
- Si QMD échoue entièrement, OpenClaw revient au moteur SQLite intégré.
  Les tentatives répétées de tours de chat se mettent en pause brièvement après un échec d'ouverture pour qu'un
  binaire manquant ou une dépendance sidecar cassée ne crée pas une tempête de nouvelles tentatives ;
  `openclaw memory status` et les sondes CLI ponctuelles vérifient toujours QMD directement.

<Info>La première recherche peut être lente -- QMD télécharge automatiquement les modèles GGUF (~2 Go) pour le reranking et l'expansion de requête lors de la première exécution de `qmd query`.</Info>

## Performances et compatibilité de la recherche

OpenClaw maintient le chemin de recherche QMD compatible avec les installations QMD actuelles et plus anciennes.

Au démarrage, OpenClaw vérifie le texte d'aide QMD installé une fois par gestionnaire. Si le
binaire annonce la prise en charge de plusieurs filtres de collection, OpenClaw recherche toutes
les collections de même source avec une seule commande :

```bash
qmd search "router notes" --json -n 10 -c memory-root-main -c memory-dir-main
```

Cela évite de démarrer un sous-processus QMD pour chaque collection de mémoire durable.
Les collections de transcriptions de session restent dans leur propre groupe source, les recherches mixtes
`memory` + `sessions` fournissent donc toujours au diviseur de résultats des entrées provenant des deux
sources.

Les anciennes versions de QMD n'acceptent qu'un seul filtre de collection. Lorsque OpenClaw détecte l'une de
ces versions, il conserve le chemin de compatibilité et recherche chaque collection
séparément avant de fusionner et de dédupliquer les résultats.

Pour inspecter manuellement le contrat installé, exécutez :

```bash
qmd --help | grep -i collection
```

L'aide actuelle de QMD indique que les filtres de collection peuvent cibler une ou plusieurs collections.
L'ancienne aide décrit généralement une seule collection.

## Remplacements de modèle

Les variables d'environnement de modèle QMD sont transmises sans modification depuis le processus
de la passerelle, vous pouvez donc régler QMD globalement sans ajouter de nouvelle configuration OpenClaw :

```bash
export QMD_EMBED_MODEL="hf:Qwen/Qwen3-Embedding-0.6B-GGUF/Qwen3-Embedding-0.6B-Q8_0.gguf"
export QMD_RERANK_MODEL="/absolute/path/to/reranker.gguf"
export QMD_GENERATE_MODEL="/absolute/path/to/generator.gguf"
```

Après avoir modifié le modèle d'intégration, relancez les intégrations pour que l'index corresponde au nouvel espace vectoriel.

## Indexation de chemins supplémentaires

Pointez QMD vers des répertoires supplémentaires pour les rendre recherchables :

```json5
{
  memory: {
    backend: "qmd",
    qmd: {
      paths: [{ name: "docs", path: "~/notes", pattern: "**/*.md" }],
    },
  },
}
```

Les extraits de chemins supplémentaires apparaissent sous la forme `qmd/<collection>/<relative-path>` dans les résultats de recherche. `memory_get` comprend ce préfixe et lit à partir de la racine de collection correcte.

## Indexation des transcriptions de session

Activez l'indexation des sessions pour rappeler les conversations précédentes :

```json5
{
  memory: {
    backend: "qmd",
    qmd: {
      sessions: { enabled: true },
    },
  },
}
```

Les transcriptions sont exportées sous forme de tours Utilisateur/Assistant nettoyés dans une collection QMD dédiée sous `~/.openclaw/agents/<id>/qmd/sessions/`.

## Portée de la recherche

Par défaut, les résultats de recherche QMD sont affichés dans les sessions directes et de canal (pas les groupes). Configurez `memory.qmd.scope` pour modifier cela :

```json5
{
  memory: {
    qmd: {
      scope: {
        default: "deny",
        rules: [{ action: "allow", match: { chatType: "direct" } }],
      },
    },
  },
}
```

Lorsque la portée refuse une recherche, OpenClaw enregistre un avertissement avec le canal dérivé et le type de chat afin que les résultats vides soient plus faciles à déboguer.

## Citations

Lorsque `memory.citations` est `auto` ou `on`, les extraits de recherche incluent un
pied de page `Source: <path#line>`. Définissez `memory.citations = "off"` pour omettre le pied de page
tout en transmettant toujours le chemin en interne à l'agent.

## Quand l'utiliser

Choisissez QMD lorsque vous avez besoin de :

- Un reclassement pour des résultats de meilleure qualité.
- Pour rechercher de la documentation de projet ou des notes en dehors de l'espace de travail.
- Pour rappeler les conversations des sessions passées.
- Une recherche entièrement locale sans clés API.

Pour des configurations plus simples, le [moteur intégré](/fr/concepts/memory-builtin) fonctionne bien
sans dépendances supplémentaires.

## Dépannage

**QMD introuvable ?** Assurez-vous que le binaire se trouve dans le `PATH` de la passerelle. Si OpenClaw
fonctionne en tant que service, créez un lien symbolique :
`sudo ln -s ~/.bun/bin/qmd /usr/local/bin/qmd`.

Si `qmd --version` fonctionne dans votre shell mais qu'OpenClaw signale toujours `spawn qmd ENOENT`, le processus de la passerelle a probablement un `PATH` différent de celui de votre shell interactif. Épinglez le binaire explicitement :

```json5
{
  memory: {
    backend: "qmd",
    qmd: {
      command: "/absolute/path/to/qmd",
    },
  },
}
```

Utilisez `command -v qmd` dans l'environnement où QMD est installé, puis revérifiez avec `openclaw memory status --deep`.

**Première recherche très lente ?** QMD télécharge les modèles GGUF lors de la première utilisation. Préchauffez avec `qmd query "test"` en utilisant les mêmes répertoires XDG que OpenClaw.

**Plusieurs sous-processus QMD lors de la recherche ?** Mettez à jour QMD si possible. OpenClaw utilise un seul processus pour les recherches multi-collections de même source uniquement lorsque le QMD installé annonce la prise en charge de plusieurs filtres `-c` ; sinon, il conserve l'ancienne solution de repli par collection pour la correction.

**QMD en BM25 uniquement essaie-t-il toujours de construire llama.cpp ?** Définissez `memory.qmd.searchMode = "search"`. OpenClaw traite ce mode comme purement lexical, n'exécute pas les sondes de statut vectoriel QMD ni la maintenance des embeddings, et laisse les vérifications de préparation sémantique aux configurations `vsearch` ou `query`.

**La recherche expire-t-elle ?** Augmentez `memory.qmd.limits.timeoutMs` (par défaut : 4000 ms).
Définissez sur `120000` pour du matériel plus lent.

**Résultats vides dans les discussions de groupe ?** Vérifiez `memory.qmd.scope` -- la valeur par défaut n'autorise que les sessions directes et de channel.

**La recherche de mémoire racine est soudainement devenue trop large ?** Redémarrez la passerelle ou attendez la prochaine réconciliation au démarrage. OpenClaw recrée les collections gérées obsolètes selon les modèles canoniques OpenClaw`MEMORY.md` et `memory/` lorsqu'il détecte un conflit de noms.

**Les dépôts temporaires visibles dans l'espace de travail provoquent-ils des `ENAMETOOLONG`OpenClaw ou un indexation cassée ?** Le parcours QMD suit actuellement le comportement du scanner QMD sous-jacent plutôt que les règles de lien symbolique intégrées d'OpenClaw. Conservez les extractions temporaires de monorepôtres dans des répertoires cachés comme `.tmp/` ou en dehors des racines QMD indexées jusqu'à ce que QMD expose un parcours sécurisé contre les cycles ou des contrôles d'exclusion explicites.

## Configuration

Pour la surface de configuration complète (`memory.qmd.*`), les modes de recherche, les intervalles de mise à jour,
les règles de portée et tous les autres paramètres, consultez la
[référence de configuration de la mémoire](/fr/reference/memory-config).

## Connexes

- [Aperçu de la mémoire](/fr/concepts/memory)
- [Moteur de mémoire intégré](/fr/concepts/memory-builtin)
- [Mémoire Honcho](/fr/concepts/memory-honcho)
