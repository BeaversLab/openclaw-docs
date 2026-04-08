---
title: "Moteur de mémoire QMD"
summary: "Sidecar de recherche local-first avec BM25, vecteurs, reranking et expansion de requête"
read_when:
  - You want to set up QMD as your memory backend
  - You want advanced memory features like reranking or extra indexed paths
---

# Moteur de mémoire QMD

[QMD](https://github.com/tobi/qmd) est un sidecar de recherche local-first qui fonctionne
aux côtés d'OpenClaw. Il combine BM25, la recherche vectorielle et le reranking dans un seul
binaire, et peut indexer du contenu au-delà de vos fichiers de mémoire d'espace de travail.

## Ce qu'il ajoute par rapport à l'intégré

- **Reranking et expansion de requête** pour une meilleur rappel.
- **Indexer des répertoires supplémentaires** -- documentation du projet, notes d'équipe, n'importe quoi sur le disque.
- **Indexer les transcripts de session** -- rappeler les conversations précédentes.
- **Entièrement local** -- fonctionne via Bun + node-llama-cpp, télécharge automatiquement les modèles GGUF.
- **Repli automatique** -- si QMD est indisponible, OpenClaw revient au
  moteur intégré de manière transparente.

## Getting started

### Prérequis

- Installez QMD : `npm install -g @tobilu/qmd` ou `bun install -g @tobilu/qmd`
- Build SQLite qui autorise les extensions (`brew install sqlite` sur macOS).
- QMD doit être dans le `PATH` de la passerelle.
- macOS et Linux fonctionnent hors de la boîte. Windows est mieux pris en charge via WSL2.

### Activer

```json5
{
  memory: {
    backend: "qmd",
  },
}
```

OpenClaw crée un domicile QMD autonome sous
`~/.openclaw/agents/<agentId>/qmd/` et gère le cycle de vie du sidecar
automatiquement -- les collections, mises à jour et exécutions d'embeddings sont gérées pour vous.
Il privilégie les formes actuelles de collection QMD et de requête MCP, mais revient encore aux
anciens drapeaux de collection `--mask` et aux anciens noms d'outils MCP si nécessaire.

## Fonctionnement du sidecar

- OpenClaw crée des collections à partir de vos fichiers de mémoire d'espace de travail et de tout
  `memory.qmd.paths` configuré, puis exécute `qmd update` + `qmd embed` au démarrage
  et périodiquement (par défaut toutes les 5 minutes).
- L'actualisation au démarrage s'exécute en arrière-plan afin de ne pas bloquer le démarrage du chat.
- Les recherches utilisent le `searchMode` configuré (par défaut : `search` ; prend également en charge
  `vsearch` et `query`). Si un mode échoue, OpenClaw réessaie avec `qmd query`.
- Si QMD échoue totalement, OpenClaw revient au moteur SQLite intégré.

<Info>La première recherche peut être lente -- QMD télécharge automatiquement les modèles GGUF (~2 Go) pour le reranking et l'expansion de requête lors de la première exécution `qmd query`.</Info>

## Remplacements de modèle

Les variables d'environnement de modèle QMD sont transmises telles quelles par le processus de la passerelle,
vous pouvez donc régler QMD globalement sans ajouter de nouvelle configuration OpenClaw :

```bash
export QMD_EMBED_MODEL="hf:Qwen/Qwen3-Embedding-0.6B-GGUF/Qwen3-Embedding-0.6B-Q8_0.gguf"
export QMD_RERANK_MODEL="/absolute/path/to/reranker.gguf"
export QMD_GENERATE_MODEL="/absolute/path/to/generator.gguf"
```

Après avoir changé le modèle d'embeddings, relancez les embeddings pour que l'index corresponde au
nouvel espace vectoriel.

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

Les extraits de chemins supplémentaires apparaissent comme `qmd/<collection>/<relative-path>` dans
les résultats de recherche. `memory_get` comprend ce préfixe et lit à partir de la racine de
collection correcte.

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

Par défaut, les résultats de recherche QMD ne sont affichés que dans les sessions DM (pas dans les groupes ou les channels). Configurez `memory.qmd.scope` pour modifier ceci :

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

Lorsque la portée refuse une recherche, OpenClaw enregistre un avertissement avec le channel et le type de chat dérivés afin que les résultats vides soient plus faciles à déboguer.

## Citations

Lorsque `memory.citations` est `auto` ou `on`, les extraits de recherche incluent un pied de page `Source: <path#line>`. Définissez `memory.citations = "off"` pour omettre le pied de page tout en transmettant toujours le chemin en interne à l'agent.

## Quand l'utiliser

Choisissez QMD lorsque vous avez besoin de :

- Reclassement pour des résultats de meilleure qualité.
- Pour rechercher des documents de projet ou des notes en dehors de l'espace de travail.
- Pour rappeler les conversations des sessions passées.
- Recherche entièrement locale sans clés API.

Pour des configurations plus simples, le [moteur intégré](/en/concepts/memory-builtin) fonctionne bien sans dépendances supplémentaires.

## Dépannage

**QMD introuvable ?** Assurez-vous que le binaire est sur le `PATH` de la passerelle. Si OpenClaw s'exécute en tant que service, créez un lien symbolique :
`sudo ln -s ~/.bun/bin/qmd /usr/local/bin/qmd`.

**Première recherche très lente ?** QMD télécharge les modèles GGUF lors de la première utilisation. Préchauffez avec `qmd query "test"` en utilisant les mêmes répertoires XDG que OpenClaw.

**La recherche expire ?** Augmentez `memory.qmd.limits.timeoutMs` (par défaut : 4000 ms).
Définissez sur `120000` pour du matériel plus lent.

**Résultats vides dans les discussions de groupe ?** Vérifiez `memory.qmd.scope` -- la valeur par défaut n'autorise que les sessions DM.

**Dépôts temporaires visibles dans l'espace de travail provoquant `ENAMETOOLONG` ou un indexation cassée ?**
Le parcours QMD suit actuellement le comportement du scanner QMD sous-jacent plutôt que les règles de liens symboliques intégrés de OpenClaw. Conservez les extraits temporaires de monorepo dans des répertoires cachés comme `.tmp/` ou en dehors des racines QMD indexées jusqu'à ce que QMD expose un parcours sans cycle ou des contrôles d'exclusion explicites.

## Configuration

Pour la surface de configuration complète (`memory.qmd.*`), les modes de recherche, les intervalles de mise à jour,
les règles de portée et tous les autres paramètres, consultez la
[référence de configuration de la mémoire](/en/reference/memory-config).
