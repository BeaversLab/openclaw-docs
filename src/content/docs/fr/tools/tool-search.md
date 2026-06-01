---
summary: "OpenClawRecherche d'outils : compacter les grands catalogues d'outils OpenClaw derrière la recherche, la description et l'appel"
title: "Recherche d'outils"
read_when:
  - You want OpenClaw agents to use a large tool catalog without adding every tool schema to the prompt
  - You want OpenClaw tools, MCP tools, and client tools exposed through one compact runtime surface
  - You are implementing or debugging tool discovery for OpenClaw runs
---

La recherche d'outils est une fonctionnalité expérimentale de l'exécution de l'agent OpenClaw. Elle offre aux agents un moyen compact de découvrir et d'appeler de vastes catalogues d'outils. C'est utile lorsque l'exécution dispose de nombreux outils disponibles, mais que le modèle n'en aura probablement besoin que de quelques-uns.

Cette page documente la recherche d'outils OpenClaw. Il ne s'agit pas de la recherche d'outils native Codex ni de la surface dynamic-tools. Le mode code natif Codex, la recherche d'outils, les outils dynamiques différés et les appels d'outils imbriqués sont des surfaces de harnais Codex stables et ne dépendent pas de `tools.toolSearch`.

Lorsqu'elle est activée pour les exécutions OpenClaw, le modèle reçoit par défaut un outil `tool_search_code`. Cet outil exécute un corps JavaScript court dans un sous-processus Node isolé avec un pont `openclaw.tools` :

```js
const hits = await openclaw.tools.search("create a GitHub issue");
const tool = await openclaw.tools.describe(hits[0].id);
return await openclaw.tools.call(tool.id, {
  title: "Crash on startup",
  body: "Steps to reproduce...",
});
```

Le catalogue peut inclure des outils OpenClaw, des outils de plug-in, des outils MCP et des outils fournis par le client. Le model ne voit pas chaque schéma complet à l'avance. Au lieu de cela, il recherche des descripteurs compacts, décrit un outil sélectionné lorsqu'il a besoin du schéma exact, et appelle cet outil via OpenClaw.

Les exécutions du harnais Codex ne reçoivent pas ces contrôles expérimentaux de Recherche d'outils OpenClaw. OpenClaw transmet les capacités du produit à Codex sous forme d'outils dynamiques, et Codex possède le mode de code natif stable, la recherche d'outils native, les outils dynamiques différés et les appels d'outils imbriqués.

## Déroulement d'un tour

Au moment de la planification, le runner intégré OpenClaw construit le catalogue effectif pour l'exécution :

1. Résoudre la stratégie d'outil active pour l'agent, le profil, le bac à sable et la session.
2. Lister les outils OpenClaw et de plug-in éligibles.
3. Lister les outils MCP éligibles via le runtime MCP de la session.
4. Ajouter les outils client éligibles fournis pour l'exécution actuelle.
5. Indexer les descripteurs compacts pour la recherche.
6. Exposer soit le pont de code OpenClaw, soit les outils de repli structurés au modèle.

Au moment de l'exécution, chaque appel de tool réel retourne à OpenClaw. L'environnement d'exécution Node isolé ne contient pas d'implémentations de plug-ins, d'objets client MCP ni de secrets. OpenClaw`openclaw.tools.call(...)`Gateway traverse le pont pour revenir vers la Gateway, où la stratégie normale, l'approbation, les hooks, la journalisation et la gestion des résultats s'appliquent toujours.

## Modes

`tools.toolSearch` possède deux modes orientés model :

- `code` : expose `tool_search_code`, le pont JavaScript compact par défaut.
- `tools` : expose `tool_search`, `tool_describe` et `tool_call` en tant que tools structurés simples pour les fournisseurs qui ne doivent pas recevoir de code.

Les deux modes utilisent le même catalogue et le même chemin d'exécution. La seule différence réside dans la forme que voit le model. Si l'environnement d'exécution actuel ne peut pas lancer le processus enfant en mode code Node isolé, le mode par défaut `code` revient au `tools` avant la compactage du catalogue.

Les deux modes sont expérimentaux. Privilégiez l'exposition directe des outils pour les petits catalogues d'outils OpenClaw, et privilégiez les surfaces stables natives Codex pour les exécutions de harnais Codex.

Il n'y a pas de configuration de sélection de source distincte. Lorsque Tool Search est activé, le catalogue inclut les tools éligibles OpenClaw, MCP et client après le filtrage normal de la stratégie.

## Pourquoi cela existe

Les grands catalogues sont utiles mais coûteux. Envoyer chaque schéma de tool au model augmente la taille de la requête, ralentit la planification et augmente la sélection accidentelle de tools.

Tool Search modifie la forme :

- tools directs : le model voit chaque schéma sélectionné avant le premier jeton
- mode code Tool Search : le model voit un tool de code compact et un contrat API court
- mode tools Tool Search : le model voit trois tools structurés de repli compacts
- pendant le tour : le model charge uniquement les schémas de tools dont il a réellement besoin

L'exposition directe des tools reste le bon choix par défaut pour les petits catalogues. Tool Search est idéal lorsqu'une exécution peut voir de nombreux tools, en particulier à partir de serveurs MCP ou d'tools d'application fournis par le client.

## API

`openclaw.tools.search(query, options?)`

Recherche le catalogue effectif pour l'exécution actuelle. Les résultats sont compacts et sûrs à remettre dans le contexte du prompt.

```js
const hits = await openclaw.tools.search("calendar event", { limit: 5 });
```

`openclaw.tools.describe(id)`

Charge les métadonnées complètes pour un résultat de recherche, y compris le schéma d'entrée exact.

```js
const calendarCreate = await openclaw.tools.describe("mcp:calendar:create_event");
```

`openclaw.tools.call(id, args)`

Appelle un tool sélectionné via OpenClaw.

```js
await openclaw.tools.call(calendarCreate.id, {
  summary: "Planning",
  start: "2026-05-09T14:00:00Z",
});
```

Le mode de repli structuré expose les mêmes opérations que les tools :

- `tool_search`
- `tool_describe`
- `tool_call`

## Limite d'exécution

Le pont de code s'exécute dans un sous-processus Node éphémère. Le sous-processus démarre avec le mode de permission Node activé, un environnement vide, aucun accès système de fichiers ou réseau, et aucune autorisation de sous-processus ou de worker. OpenClaw applique un délai d'expiration temps réel du processus parent et tue le sous-processus à l'expiration, y compris après les continuations asynchrones.

L'exécution expose uniquement :

- `console.log`, `console.warn` et `console.error`
- `openclaw.tools.search`
- `openclaw.tools.describe`
- `openclaw.tools.call`

Le comportement normal de OpenClaw s'applique toujours aux appels finaux :

- stratégies d'autorisation et de refus de tool
- restrictions de tool par agent et par bac à sable
- stratégie d'outil de runtime du canal
- hooks d'approbation
- hooks de plugin `before_tool_call`
- identité de session, journaux et télémétrie

## Configuration

Activer la recherche d'outils pour les exécutions OpenClaw avec le pont de code par défaut :

```bash
openclaw config set tools.toolSearch true
```

JSON équivalent :

```json5
{
  tools: {
    toolSearch: true,
  },
}
```

Utiliser plutôt les outils de repli structurés pour les exécutions OpenClaw :

```json5
{
  tools: {
    toolSearch: {
      mode: "tools",
    },
  },
}
```

Ajuster le délai d'expiration du mode code et les limites de résultats de recherche :

```json5
{
  tools: {
    toolSearch: {
      mode: "code",
      codeTimeoutMs: 10000,
      searchDefaultLimit: 8,
      maxSearchLimit: 20,
    },
  },
}
```

Désactiver :

```json5
{
  tools: {
    toolSearch: false,
  },
}
```

## Prompt et télémétrie

Tool Search enregistre suffisamment de télémétrie pour la comparer à l'exposition directe des tools :

- nombre total d'octets sérialisés de tools et de prompt envoyés au harnais
- taille du catalogue et répartition par source
- comptes de recherche, description et appel
- appels de tool finaux exécutés via OpenClaw
- identifiants et sources des tools sélectionnés

Les journaux de session doivent permettre de répondre :

- combien de schémas de tools le model a vus au départ
- combien d'opérations de recherche et de description il a effectuées
- quel tool final a été appelé
- si le résultat provenait de OpenClaw, MCP ou d'un tool client

## Validation de bout en bout

Le runner E2E de la passerelle prouve les deux chemins avec l'exécution OpenClaw :

```bash
node --import tsx scripts/tool-search-gateway-e2e.ts
```

Il crée un faux plugin temporaire avec un grand catalogue d'outils, démarre le fournisseur mock OpenAI, démarre une Gateway une fois en mode direct et une fois avec la recherche d'outils activée, puis compare les charges utiles des requêtes du fournisseur et les journaux de session.

La régression prouve :

1. Le mode direct peut appeler l'outil du faux plugin.
2. La recherche d'outils peut appeler le même outil du faux plugin.
3. Le mode direct expose les schémas d'outils du faux plugin directement au fournisseur.
4. La recherche d'outils n'expose que le pont compact.
5. La charge utile de la requête de recherche d'outils est plus petite pour le grand faux catalogue.
6. Les journaux de session montrent les comptes d'appels d'outils attendus et la télémétrie des appels pontés.

## Comportement en cas d'échec

La recherche d'outils doit échouer de manière fermée :

- si un outil n'est pas dans la stratégie effective, la recherche ne doit pas le renvoyer
- si un outil sélectionné devient indisponible, `tool_call` doit échouer
- si la stratégie ou l'approbation bloque l'exécution, le résultat de l'appel doit signaler ce blocage au lieu de le contourner
- si le pont de code ne peut pas créer un runtime isolé, utilisez `mode: "tools"` ou désactivez la recherche d'outils pour ce déploiement

## Connexes

- [Outils et plugins](/fr/tools)
- [Bac à sable multi-agents et outils](/fr/tools/multi-agent-sandbox-tools)
- [Outil Exec](/fr/tools/exec)
- [Configuration des agents ACP](/fr/tools/acp-agents-setup)
- [Création de plugins](/fr/plugins/building-plugins)
