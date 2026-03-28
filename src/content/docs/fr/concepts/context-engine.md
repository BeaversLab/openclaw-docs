---
summary: "Moteur de contexte : assemblage de contexte enfichable, compactage et cycle de vie des sous-agents"
read_when:
  - You want to understand how OpenClaw assembles model context
  - You are switching between the legacy engine and a plugin engine
  - You are building a context engine plugin
title: "Moteur de contexte"
---

# Moteur de contexte

Un **moteur de contexte** contrôle la manière dont OpenClaw construit le contexte du modèle pour chaque exécution.
Il décide quels messages inclure, comment résumer l'historique ancien et comment
gérer le contexte à travers les limites des sous-agents.

OpenClaw est livré avec un moteur `legacy` intégré. Les plugins peuvent enregistrer
des moteurs alternatifs qui remplacent le cycle de vie du moteur de contexte actif.

## Quick start

Vérifiez quel moteur est actif :

```bash
openclaw doctor
# or inspect config directly:
cat ~/.openclaw/openclaw.json | jq '.plugins.slots.contextEngine'
```

### Installation d'un plugin de moteur de contexte

Les plugins de moteur de contexte sont installés comme n'importe quel autre plugin OpenClaw. Installez-
d'abord, puis sélectionnez le moteur dans l'emplacement :

```bash
# Install from npm
openclaw plugins install @martian-engineering/lossless-claw

# Or install from a local path (for development)
openclaw plugins install -l ./my-context-engine
```

Activez ensuite le plugin et sélectionnez-le comme moteur actif dans votre configuration :

```json5
// openclaw.json
{
  plugins: {
    slots: {
      contextEngine: "lossless-claw", // must match the plugin's registered engine id
    },
    entries: {
      "lossless-claw": {
        enabled: true,
        // Plugin-specific config goes here (see the plugin's docs)
      },
    },
  },
}
```

Redémarrez la passerelle après l'installation et la configuration.

Pour revenir au moteur intégré, définissez `contextEngine` sur `"legacy"` (ou
supprimez entièrement la clé — `"legacy"` est la valeur par défaut).

## Fonctionnement

Chaque fois que OpenClaw exécute une invite de modèle, le moteur de contexte participe à
quatre points du cycle de vie :

1. **Ingestion (Ingest)** — appelé lorsqu'un nouveau message est ajouté à la session. Le moteur
   peut stocker ou indexer le message dans son propre magasin de données.
2. **Assemblage (Assemble)** — appelé avant chaque exécution de modèle. Le moteur renvoie un ensemble
   ordonné de messages (et un `systemPromptAddition` facultatif) qui tiennent dans
   la limite de jetons.
3. **Compactage (Compact)** — appelé lorsque la fenêtre de contexte est pleine, ou lorsque l'utilisateur exécute
   `/compact`. Le moteur résume l'historique ancien pour libérer de l'espace.
4. **Après le tour (After turn)** — appelé après la fin d'une exécution. Le moteur peut persister l'état,
   déclencher un compactage en arrière-plan ou mettre à jour les index.

### Cycle de vie des sous-agents (facultatif)

OpenClaw appelle actuellement un point d'ancrage (hook) de cycle de vie des sous-agents :

- **onSubagentEnded** — nettoyer lorsqu'une session de sous-agent se termine ou est balayée.

Le point d'ancrage `prepareSubagentSpawn` fait partie de l'interface pour une utilisation future, mais
le runtime ne l'invoque pas encore.

### Ajout d'invite système

La méthode `assemble` peut renvoyer une chaîne `systemPromptAddition`. OpenClaw
préfixe cela au prompt système pour l'exécution. Cela permet aux moteurs d'injecter
des directives de rappel dynamiques, des instructions de récupération ou des indices
sensibles au contexte sans nécessiter de fichiers d'espace de travail statiques.

## Le moteur hérité

Le moteur intégré `legacy` préserve le comportement original de OpenClaw :

- **Ingest** (Ingérer) : no-op (le gestionnaire de session gère directement la persistance des messages).
- **Assemble** (Assembler) : pass-through (le pipeline existant sanitize → validate → limit
  dans le runtime gère l'assemblage du contexte).
- **Compact** (Compacter) : délègue à la compaction de résumé intégrée, qui crée
  un seul résumé des anciens messages et garde les messages récents intacts.
- **After turn** (Après le tour) : no-op.

Le moteur hérité n'enregistre pas d'outils ou ne fournit pas de `systemPromptAddition`.

Quand aucun `plugins.slots.contextEngine` n'est défini (ou s'il est défini à `"legacy"`), ce
moteur est utilisé automatiquement.

## Moteurs de plugin

Un plugin peut enregistrer un moteur de contexte en utilisant l'API de plugin :

```ts
export default function register(api) {
  api.registerContextEngine("my-engine", () => ({
    info: {
      id: "my-engine",
      name: "My Context Engine",
      ownsCompaction: true,
    },

    async ingest({ sessionId, message, isHeartbeat }) {
      // Store the message in your data store
      return { ingested: true };
    },

    async assemble({ sessionId, messages, tokenBudget }) {
      // Return messages that fit the budget
      return {
        messages: buildContext(messages, tokenBudget),
        estimatedTokens: countTokens(messages),
        systemPromptAddition: "Use lcm_grep to search history...",
      };
    },

    async compact({ sessionId, force }) {
      // Summarize older context
      return { ok: true, compacted: true };
    },
  }));
}
```

Puis activez-le dans la configuration :

```json5
{
  plugins: {
    slots: {
      contextEngine: "my-engine",
    },
    entries: {
      "my-engine": {
        enabled: true,
      },
    },
  },
}
```

### L'interface ContextEngine

Membres requis :

| Membre             | Genre     | Objectif                                                                       |
| ------------------ | --------- | ------------------------------------------------------------------------------ |
| `info`             | Propriété | Id du moteur, nom, version, et s'il possède la compaction                      |
| `ingest(params)`   | Méthode   | Stocker un seul message                                                        |
| `assemble(params)` | Méthode   | Construire le contexte pour une exécution de modèle (renvoie `AssembleResult`) |
| `compact(params)`  | Méthode   | Résumer/réduire le contexte                                                    |

`assemble` renvoie un `AssembleResult` avec :

- `messages` — les messages ordonnés à envoyer au modèle.
- `estimatedTokens` (requis, `number`) — l'estimation par le moteur du total
  de jetons dans le contexte assemblé. OpenClaw utilise cela pour les décisions
  de seuil de compaction et les rapports de diagnostic.
- `systemPromptAddition` (optionnel, `string`) — ajouté avant le prompt système.

Membres optionnels :

| Membre                         | Genre   | Objectif                                                                                                                                                      |
| ------------------------------ | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `bootstrap(params)`            | Méthode | Initialiser l'état du moteur pour une session. Appelé une fois lorsque le moteur voit une session pour la première fois (par exemple, importer l'historique). |
| `ingestBatch(params)`          | Méthode | Ingérer un tour complet sous forme de lot. Appelé après l'exécution, avec tous les messages de ce tour en une seule fois.                                     |
| `afterTurn(params)`            | Méthode | Travail de cycle de vie post-exécution (persister l'état, déclencher la compaction en arrière-plan).                                                          |
| `prepareSubagentSpawn(params)` | Méthode | Configurer l'état partagé pour une session enfant.                                                                                                            |
| `onSubagentEnded(params)`      | Méthode | Nettoyer après la fin d'un sous-agent.                                                                                                                        |
| `dispose()`                    | Méthode | Libérer les ressources. Appelé lors de l'arrêt de la passerelle ou du rechargement du plugin — pas par session.                                               |

### ownsCompaction

`ownsCompaction` contrôle si l'auto-compaction intégrée dans la tentative de Pi reste
activée pour l'exécution :

- `true` — le moteur possède le comportement de compaction. OpenClaw désactive l'auto-compaction intégrée
  de Pi pour cette exécution, et l'implémentation `compact()` du moteur est
  responsable de `/compact`, de la compaction de récupération de débordement et de toute compaction
  proactive qu'il souhaite effectuer dans `afterTurn()`.
- `false` ou non défini — l'auto-compaction intégrée de Pi peut toujours s'exécuter pendant l'exécution
  du prompt, mais la méthode `compact()` du moteur actif est toujours appelée pour
  `/compact` et la récupération de débordement.

`ownsCompaction: false` ne signifie **pas** que OpenClaw revient automatiquement au
chemin de compaction du moteur hérité.

Cela signifie qu'il existe deux modèles de plugin valides :

- **Mode propriétaire** — implémentez votre propre algorithme de compaction et définissez
  `ownsCompaction: true`.
- **Mode délégué** — définissez `ownsCompaction: false` et faites en sorte que `compact()` appelle
  `delegateCompactionToRuntime(...)` à partir de `openclaw/plugin-sdk/core` pour utiliser
  le comportement de compaction intégré de OpenClaw.

Un `compact()` sans effet est dangereux pour un moteur non propriétaire actif car il
désactive le chemin de compaction normal `/compact` et de récupération de débordement pour cet
emplacement de moteur.

## Référence de configuration

```json5
{
  plugins: {
    slots: {
      // Select the active context engine. Default: "legacy".
      // Set to a plugin id to use a plugin engine.
      contextEngine: "legacy",
    },
  },
}
```

Le slot est exclusif lors de l'exécution — un seul moteur de contexte enregistré est résolu pour une exécution ou une opération de compactage donnée. D'autres plugins `kind: "context-engine"` activés peuvent toujours charger et exécuter leur code d'enregistrement ; `plugins.slots.contextEngine` sélectionne uniquement l'identifiant du moteur enregistré que OpenClaw résout lorsqu'il a besoin d'un moteur de contexte.

## Relation avec le compactage et la mémoire

- Le **compactage** est une responsabilité du moteur de contexte. Le moteur hérité délègue à la résumé intégrée de OpenClaw. Les moteurs de plugin peuvent implémenter n'importe quelle stratégie de compactage (résumés DAG, récupération vectorielle, etc.).
- Les **plugins de mémoire** (`plugins.slots.memory`) sont distincts des moteurs de contexte. Les plugins de mémoire fournissent la recherche/récupération ; les moteurs de contexte contrôlent ce que le modèle voit. Ils peuvent travailler ensemble — un moteur de contexte pourrait utiliser les données d'un plugin de mémoire lors de l'assemblage.
- Le **nettoyage de session** (coupe des anciens résultats d'outils en mémoire) s'exécute toujours, quel que soit le moteur de contexte actif.

## Conseils

- Utilisez `openclaw doctor` pour vérifier que votre moteur se charge correctement.
- Si vous changez de moteur, les sessions existantes continuent avec leur historique actuel. Le nouveau moteur prend le relais pour les futures exécutions.
- Les erreurs du moteur sont journalisées et affichées dans les diagnostics. Si un moteur de plugin échoue à s'enregistrer ou si l'identifiant du moteur sélectionné ne peut pas être résolu, OpenClaw ne revient pas automatiquement à une version précédente ; les exécutions échouent jusqu'à ce que vous corrigiez le plugin ou que vous remettiez `plugins.slots.contextEngine` à `"legacy"`.
- Pour le développement, utilisez `openclaw plugins install -l ./my-engine` pour lier un répertoire de plugin local sans copier.

Voir aussi : [Compactage](/fr/concepts/compaction), [Contexte](/fr/concepts/context), [Plugins](/fr/tools/plugin), [Manifeste de plugin](/fr/plugins/manifest).
