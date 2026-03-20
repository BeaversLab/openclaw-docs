---
summary: "Context engine: pluggable context assembly, compaction, and subagent lifecycle"
read_when:
  - Vous voulez comprendre comment OpenClaw assemble le contexte du modèle
  - Vous passez du moteur legacy à un moteur de plugin
  - Vous créez un plugin de moteur de contexte
title: "Moteur de contexte"
---

# Moteur de contexte

Un **context engine** contrôle la manière dont OpenClaw construit le contexte du modèle pour chaque exécution.
Il décide quels messages inclure, comment résumer l'historique ancien et comment
gérer le contexte à travers les frontières des sous-agents.

OpenClaw est fourni avec un moteur `legacy` intégré. Les plugins peuvent enregistrer
des moteurs alternatifs qui remplacent le cycle de vie du moteur de contexte actif.

## Quick start

Vérifiez quel moteur est actif :

```bash
openclaw doctor
# or inspect config directly:
cat ~/.openclaw/openclaw.json | jq '.plugins.slots.contextEngine'
```

### Installation d'un plugin de moteur de contexte

Les plugins de moteur de contexte sont installés comme n'importe quel autre plugin OpenClaw. Installez
d'abord, puis sélectionnez le moteur dans l'emplacement (slot) :

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

Chaque fois que OpenClaw exécute une invite de modèle, le moteur de contexte intervient à
quatre points du cycle de vie :

1. **Ingest** (Ingestion) — appelé lorsqu'un nouveau message est ajouté à la session. Le moteur
   peut stocker ou indexer le message dans son propre magasin de données.
2. **Assemble** (Assemblage) — appelé avant chaque exécution de modèle. Le moteur renvoie un ensemble
   ordonné de messages (et un `systemPromptAddition` facultatif) qui tiennent
   dans le budget de jetons.
3. **Compact** (Compression) — appelé lorsque la fenêtre de contexte est pleine, ou lorsque l'utilisateur exécute
   `/compact`. Le moteur résume l'historique ancien pour libérer de l'espace.
4. **After turn** (Après le tour) — appelé après la fin d'une exécution. Le moteur peut rendre l'état persistant,
   déclencher une compression en arrière-plan ou mettre à jour les index.

### Cycle de vie des sous-agents (facultatif)

OpenClaw appelle actuellement un hook de cycle de vie des sous-agents :

- **onSubagentEnded** — nettoyage lorsqu'une session de sous-agent se termine ou est nettoyée.

Le hook `prepareSubagentSpawn` fait partie de l'interface pour une utilisation future, mais
le runtime ne l'invoque pas encore.

### Ajout de l'invite système

La méthode `assemble` peut renvoyer une chaîne `systemPromptAddition`. OpenClaw
préfixe cela au prompt système pour l'exécution. Cela permet aux moteurs d'injecter
des directives de rappel dynamiques, des instructions de récupération ou des indices contextuels
sans nécessiter de fichiers d'espace de travail statiques.

## Le moteur hérité

Le moteur `legacy` intégré préserve le comportement original d'OpenClaw :

- **Ingest** (Ingestion) : no-op (le gestionnaire de session gère directement la persistance des messages).
- **Assemble** (Assemblage) : pass-through (le pipeline existant sanitize → validate → limit
  dans le runtime gère l'assemblage du contexte).
- **Compact** (Compactage) : délègue au compactage par résumé intégré, qui crée
  un résumé unique des anciens messages et conserve les messages récents intacts.
- **After turn** (Après tour) : no-op.

Le moteur hérité n'enregistre pas d'outils et ne fournit pas de `systemPromptAddition`.

Lorsqu'aucun `plugins.slots.contextEngine` n'est défini (ou s'il est défini sur `"legacy"`), ce
moteur est utilisé automatiquement.

## Moteurs de plug-in

Un plug-in peut enregistrer un moteur de contexte en utilisant l'API du plug-in :

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

Activez-le ensuite dans la configuration :

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

| Membre             | Type     | Objectif                                                  |
| ------------------ | -------- | -------------------------------------------------------- |
| `info`             | Propriété | ID, nom, version du moteur et indique s'il possède le compactage |
| `ingest(params)`   | Méthode   | Stocker un seul message                                   |
| `assemble(params)` | Méthode   | Construire le contexte pour une exécution de modèle (renvoie `AssembleResult`) |
| `compact(params)`  | Méthode   | Résumer/réduire le contexte                                 |

`assemble` renvoie un `AssembleResult` avec :

- `messages` — les messages ordonnés à envoyer au modèle.
- `estimatedTokens` (requis, `number`) — l'estimation par le moteur du nombre
total de jetons dans le contexte assemblé. OpenClaw l'utilise pour les décisions
de seuil de compactage et les rapports de diagnostic.
- `systemPromptAddition` (facultatif, `string`) — ajouté avant le prompt système.

Membres facultatifs :

| Membre                         | Type   | Objectif                                                                                                         |
| ------------------------------ | ------ | --------------------------------------------------------------------------------------------------------------- |
| `bootstrap(params)`            | Méthode | Initialiser l'état du moteur pour une session. Appelé une fois lorsque le moteur voit une session pour la première fois (par exemple, historique importé). |
| `ingestBatch(params)`          | Méthode | Ingérer un tour complet sous forme de lot. Appelé après l'exécution d'un run, avec tous les messages de ce tour à la fois.     |
| `afterTurn(params)`            | Méthode | Travail de cycle de vie post-exécution (persister l'état, déclencher la compactage en arrière-plan).                                         |
| `prepareSubagentSpawn(params)` | Méthode | Configurer l'état partagé pour une session enfant.                                                                        |
| `onSubagentEnded(params)`      | Méthode | Nettoyer après la fin d'un sous-agent.                                                                                 |
| `dispose()`                    | Méthode | Libérer les ressources. Appelé lors de l'arrêt de la passerelle ou du rechargement du plugin — pas par session.                           |

### ownsCompaction

`ownsCompaction` contrôle si l'auto-compactation intégrée de Pi reste activée pour l'exécution :

- `true` — le moteur possède le comportement de compactage. OpenClaw désactive l'auto-compactation intégrée de Pi pour cette exécution, et l'implémentation `compact()` du moteur est responsable de `/compact`, de la compactation de récupération de débordement et de toute compactation proactive qu'il souhaite effectuer dans `afterTurn()`.
- `false` ou non défini — l'auto-compactation intégrée de Pi peut toujours s'exécuter pendant l'exécution du prompt, mais la méthode `compact()` du moteur actif est toujours appelée pour `/compact` et la récupération de débordement.

`ownsCompaction: false` ne signifie **pas** que OpenClaw revient automatiquement au chemin de compactage du moteur hérité.

Cela signifie qu'il existe deux modèles de plugins valides :

- **Mode propriétaire** — implémentez votre propre algorithme de compactage et définissez `ownsCompaction: true`.
- **Mode délégation** — définissez `ownsCompaction: false` et faites en sorte que `compact()` appelle `delegateCompactionToRuntime(...)` depuis `openclaw/plugin-sdk/core` pour utiliser le comportement de compactage intégré de OpenClaw.

Un `compact()` no-op n'est pas sûr pour un moteur non-propriétaire actif car il désactive le chemin de compactage normal `/compact` et de récupération de débordement pour cet emplacement de moteur.

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

L'emplacement est exclusif lors de l'exécution — un seul moteur de contexte enregistré est
résolu pour une exécution ou une opération de compactage donnée. Les autres plugins
`kind: "context-engine"` activés peuvent toujours charger et exécuter leur code
d'enregistrement ; `plugins.slots.contextEngine` ne sélectionne que l'ID de moteur enregistré
que OpenClaw résout lorsqu'il a besoin d'un moteur de contexte.

## Relation avec le compactage et la mémoire

- Le **compactage** est une responsabilité du moteur de contexte. Le moteur hérité
  délègue au résumé intégré de OpenClaw. Les moteurs de plugins peuvent implémenter
  n'importe quelle stratégie de compactage (résumés DAG, récupération vectorielle, etc.).
- Les **plugins de mémoire** (`plugins.slots.memory`) sont distincts des moteurs de contexte.
  Les plugins de mémoire fournissent la recherche/récupération ; les moteurs de contexte contrôlent ce que
  le modèle voit. Ils peuvent fonctionner ensemble — un moteur de contexte pourrait utiliser les données
  d'un plugin de mémoire lors de l'assemblage.
- Le **nettoyage de session** (suppression des anciens résultats d'outils en mémoire) s'exécute toujours
  indépendamment du moteur de contexte actif.

## Conseils

- Utilisez `openclaw doctor` pour vérifier que votre moteur se charge correctement.
- Si vous changez de moteur, les sessions existantes continuent avec leur historique actuel.
  Le nouveau moteur prend en charge les futures exécutions.
- Les erreurs du moteur sont enregistrées et affichées dans les diagnostics. Si un moteur de plugin
  échoue à s'enregistrer ou si l'ID du moteur sélectionné ne peut pas être résolu, OpenClaw
  ne revient pas automatiquement à l'ancien comportement ; les exécutions échouent jusqu'à ce que vous corrigiez le plugin ou
  que vous basculiez `plugins.slots.contextEngine` sur `"legacy"`.
- Pour le développement, utilisez `openclaw plugins install -l ./my-engine` pour lier un
  répertoire de plugins local sans copie.

Voir aussi : [Compactage](/fr/concepts/compaction), [Contexte](/fr/concepts/context),
[Plugins](/fr/tools/plugin), [Manifeste du plugin](/fr/plugins/manifest).

import en from "/components/footer/en.mdx";

<en />
