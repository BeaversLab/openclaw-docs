---
summary: "Moteur de contexte : assemblage de contexte plug-in, compactage et cycle de vie des sous-agents"
read_when:
  - You want to understand how OpenClaw assembles model context
  - You are switching between the legacy engine and a plugin engine
  - You are building a context engine plugin
title: "Moteur de contexte"
sidebarTitle: "Moteur de contexte"
---

Un **context engine** (moteur de contexte) contrôle la manière dont OpenClaw construit le contexte du modèle pour chaque exécution : quels messages inclure, comment résumer l'historique ancien et comment gérer le contexte entre les limites des sous-agents.

OpenClaw est fourni avec un moteur `legacy` intégré et l'utilise par défaut - la plupart des utilisateurs n'ont jamais besoin de le changer. N'installez et ne sélectionnez un moteur de plug-in que si vous souhaitez un comportement d'assemblage, de compactage ou de rappel inter-session différent.

## Quick start

<Steps>
  <Step title="Vérifier quel moteur est actif">
    ```bash
    openclaw doctor
    # or inspect config directly:
    cat ~/.openclaw/openclaw.json | jq '.plugins.slots.contextEngine'
    ```
  </Step>
  <Step title="Installer un moteur de plug-in">
    Les plugins de moteur de contexte sont installés comme n'importe quel autre plugin OpenClaw.

    <Tabs>
      <Tab title="Depuis npm">
        ```bash
        openclaw plugins install @martian-engineering/lossless-claw
        ```
      </Tab>
      <Tab title="Depuis un chemin local">
        ```bash
        openclaw plugins install -l ./my-context-engine
        ```
      </Tab>
    </Tabs>

  </Step>
  <Step title="Activer et sélectionner le moteur">
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

  </Step>
  <Step title="Revenir à l'ancienne version (optionnel)">
    Définissez `contextEngine` sur `"legacy"` (ou supprimez entièrement la clé - `"legacy"` est la valeur par défaut).
  </Step>
</Steps>

## Fonctionnement

Chaque fois que OpenClaw exécute une invite de modèle, le moteur de contexte intervient à quatre points du cycle de vie :

<AccordionGroup>
  <Accordion title="1. Ingérer">Appelé lorsqu'un nouveau message est ajouté à la session. Le moteur peut stocker ou indexer le message dans son propre magasin de données.</Accordion>
  <Accordion title="2. Assembler">Appelé avant chaque exécution de modèle. Le moteur renvoie un ensemble ordonné de messages (et un `systemPromptAddition` facultatif) qui s'inscrivent dans le budget de jetons.</Accordion>
  <Accordion title="3. Compact">Appelé lorsque la fenêtre de contexte est pleine ou lorsque l'utilisateur exécute `/compact`. Le moteur résume l'historique plus ancien pour libérer de l'espace.</Accordion>
  <Accordion title="4. After turn">Appelé après l'exécution. Le moteur peut rendre l'état persistant, déclencher une compaction en arrière-plan ou mettre à jour des index.</Accordion>
</AccordionGroup>

Pour le harnais Codex non-ACP fourni, OpenClaw applique le même cycle de vie en projetant le contexte assemblé dans les instructions développeur de Codex et l'invite du tour actuel. Codex conserve toujours son propre historique de thread natif et son propre compacteur.

### Cycle de vie du sous-agent (facultatif)

OpenClaw appelle deux points d'ancrage facultatifs du cycle de vie du sous-agent :

<ParamField path="prepareSubagentSpawn" type="method">
  Prépare l'état du contexte partagé avant le début d'une exécution enfant. Le hook reçoit les clés de session parent/enfant, `contextMode` (`isolated` ou `fork`), les identifiants/fichiers de transcription disponibles et une TTL facultative. S'il renvoie un handle de rollback, OpenClaw l'appelle si le lancement échoue après une préparation réussie.
</ParamField>
<ParamField path="onSubagentEnded" type="method">
  Nettoyer lorsqu'une session de sous-agent se termine ou est nettoyée.
</ParamField>

### Ajout de prompt système

La méthode `assemble` peut renvoyer une chaîne `systemPromptAddition`. OpenClaw la précède au prompt système pour l'exécution. Cela permet aux moteurs d'injecter des directives de rappel dynamiques, des instructions de récupération ou des indices contextuels sans nécessiter de fichiers d'espace de travail statiques.

## Le moteur hérité

Le moteur intégré `legacy` préserve le comportement original de OpenClaw :

- **Ingest** : pas d'opération (le gestionnaire de session gère directement la persistance des messages).
- **Assemble** : transmission directe (le pipeline existant sanitize → validate → limit dans le runtime gère l'assemblage du contexte).
- **Compact** : délègue à la compactification de résumé intégrée, qui crée un résumé unique des anciens messages et conserve les messages récents intacts.
- **After turn** : no-op.

Le moteur legacy n'enregistre pas d'outils et ne fournit pas de `systemPromptAddition`.

Quand aucun `plugins.slots.contextEngine` n'est défini (ou s'il est défini à `"legacy"`), ce moteur est utilisé automatiquement.

## Moteurs de plugin

Un plugin peut enregistrer un moteur de contexte en utilisant l'API du plugin :

```ts
import { buildMemorySystemPromptAddition } from "openclaw/plugin-sdk/core";

export default function register(api) {
  api.registerContextEngine("my-engine", (ctx) => ({
    info: {
      id: "my-engine",
      name: "My Context Engine",
      ownsCompaction: true,
    },

    async ingest({ sessionId, message, isHeartbeat }) {
      // Store the message in your data store
      return { ingested: true };
    },

    async assemble({ sessionId, messages, tokenBudget, availableTools, citationsMode }) {
      // Return messages that fit the budget
      return {
        messages: buildContext(messages, tokenBudget),
        estimatedTokens: countTokens(messages),
        systemPromptAddition: buildMemorySystemPromptAddition({
          availableTools: availableTools ?? new Set(),
          citationsMode,
        }),
      };
    },

    async compact({ sessionId, force }) {
      // Summarize older context
      return { ok: true, compacted: true };
    },
  }));
}
```

La fabrique `ctx` inclut des valeurs `config`, `agentDir` et `workspaceDir` facultatives
pour que les plugins puissent initialiser l'état par agent ou par espace de travail avant que
le premier hook de cycle de vie ne s'exécute.

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

| Membre             | Genre     | Objectif                                                                       |
| ------------------ | --------- | ------------------------------------------------------------------------------ |
| `info`             | Propriété | Identifiant, nom, version du moteur et indique s'il possède la compaction      |
| `ingest(params)`   | Méthode   | Stocker un seul message                                                        |
| `assemble(params)` | Méthode   | Construire le contexte pour une exécution de modèle (renvoie `AssembleResult`) |
| `compact(params)`  | Méthode   | Résumer/réduire le contexte                                                    |

`assemble` renvoie un `AssembleResult` avec :

<ParamField path="messages" type="Message[]" required>
  Les messages ordonnés à envoyer au model.
</ParamField>
<ParamField path="estimatedTokens" type="number" required>
  L'estimation par le moteur du nombre total de jetons dans le contexte assemblé. OpenClaw l'utilise pour les décisions de seuil de compactage et les rapports de diagnostic.
</ParamField>
<ParamField path="systemPromptAddition" type="string">
  Ajouté au début du prompt système.
</ParamField>
<ParamField path="promptAuthority" type='"assembled" | "preassembly_may_overflow"'>
  Contrôle quelle estimation de jetons le runner utilise pour les précontrôles préventifs de débordement. La valeur par défaut est `"assembled"`, ce qui signifie que seule l'estimation du prompt assemblé est vérifiée - approprié pour les moteurs qui renvoient un contexte fenêtré et autonome. Définissez à `"preassembly_may_overflow"` uniquement lorsque votre vue assemblée peut masquer des risques
  de débordement dans la transcription sous-jacente ; le runner prend alors le maximum de l'estimation assemblée et de l'estimation de l'historique de session pré-assemblage (non fenêtré) lors de la décision de procéder à un compactage préventif. Dans tous les cas, les messages que vous renvoyez sont toujours ce que le model voit - `promptAuthority` n'affecte que le précontrôle.
</ParamField>

`compact` renvoie un `CompactResult`. Lorsque le compactage fait pivoter la
transcription active, `result.sessionId` et `result.sessionFile` identifient la session
successeur que la prochaine réessai ou tour doit utiliser.

Membres optionnels :

| Membre                         | Genre   | Objectif                                                                                                                                                            |
| ------------------------------ | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `bootstrap(params)`            | Méthode | Initialiser l'état du moteur pour une session. Appelé une seule fois lorsque le moteur voit une session pour la première fois (par exemple, importer l'historique). |
| `ingestBatch(params)`          | Méthode | Ingérer un tour terminé sous forme de lot. Appelé après l'exécution d'un run, avec tous les messages de ce tour à la fois.                                          |
| `afterTurn(params)`            | Méthode | Travail de cycle de vie post-exécution (persister l'état, déclencher la compactation en arrière-plan).                                                              |
| `prepareSubagentSpawn(params)` | Méthode | Configurer l'état partagé pour une session enfant avant son début.                                                                                                  |
| `onSubagentEnded(params)`      | Méthode | Nettoyer après la fin d'un sous-agent.                                                                                                                              |
| `dispose()`                    | Méthode | Libérer les ressources. Appelé lors de l'arrêt de la passerelle ou du rechargement du plugin - pas par session.                                                     |

### Exigences de l'hôte

Les moteurs de contexte peuvent déclarer des exigences de capacité de l'hôte sur `info.hostRequirements`.
OpenClaw vérifie ces exigences avant de démarrer l'opération et échoue de manière sécurisée
avec une erreur descriptive lorsque le runtime sélectionné ne peut pas les satisfaire.

Pour les exécutions d'agent, déclarez `assemble-before-prompt` lorsque le moteur doit contrôler
le prompt réel du modèle via `assemble()` :

```ts
info: {
  id: "my-context-engine",
  name: "My Context Engine",
  hostRequirements: {
    "agent-run": {
      requiredCapabilities: ["assemble-before-prompt"],
      unsupportedMessage:
        "Use the native Codex or Pi embedded runtime, or select the legacy context engine.",
    },
  },
}
```

Les exécutions d'agent intégrées Native Codex et Pi satisfont `assemble-before-prompt`.
Les backends génériques CLI ne le font pas, donc les moteurs qui l'exigent sont rejetés avant le
démarrage du processus CLI.

### ownsCompaction

`ownsCompaction` contrôle si la compression automatique intégrée de Pi lors de la tentative reste activée pour l'exécution :

<AccordionGroup>
  <Accordion title="ownsCompaction: true">
    Le moteur est propriétaire du comportement de compression. OpenClaw désactive la compression automatique intégrée de Pi pour cette exécution, et l'implémentation `compact()` du moteur est responsable de `/compact`, de la compression de récupération de dépassement, et de toute compression proactive qu'il souhaite effectuer dans `afterTurn()`. OpenClaw peut toujours exécuter la sauvegarde de
    pré-dépassement avant le prompt ; lorsqu'il prédit que la transcription complète débordera, le chemin de récupération appelle le `compact()` du moteur actif avant de soumettre un autre prompt.
  </Accordion>
  <Accordion title="ownsCompaction: false or unset">La compression automatique intégrée de Pi peut toujours s'exécuter pendant l'exécution du prompt, mais la méthode `compact()` du moteur actif est toujours appelée pour `/compact` et la récupération de dépassement.</Accordion>
</AccordionGroup>

<Warning>`ownsCompaction: false` ne signifie **pas** que OpenClaw revient automatiquement au chemin de compression du moteur hérité.</Warning>

Cela signifie qu'il existe deux modèles de plugins valides :

<Tabs>
  <Tab title="Owning mode">Implémentez votre propre algorithme de compression et définissez `ownsCompaction: true`.</Tab>
  <Tab title="Delegating mode">Définissez `ownsCompaction: false` et faites en sorte que `compact()` appelle `delegateCompactionToRuntime(...)` depuis `openclaw/plugin-sdk/core` pour utiliser le comportement de compression intégré de OpenClaw.</Tab>
</Tabs>

Un `compact()` no-op n'est pas sûr pour un moteur non propriétaire actif car il désactive le chemin de compactage normal `/compact` et celui de récupération par dépassement pour cet emplacement de moteur.

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

<Note>
  L'emplacement est exclusif au moment de l'exécution - un seul moteur de contexte enregistré est résolu pour une exécution ou une opération de compactage donnée. Les autres plugins `kind: "context-engine"` activés peuvent toujours charger et exécuter leur code d'enregistrement ; `plugins.slots.contextEngine` sélectionne uniquement quel identifiant de moteur enregistré OpenClaw résout lorsqu'il a
  besoin d'un moteur de contexte.
</Note>

<Note>**Désinstallation du plugin :** lorsque vous désinstallez le plugin actuellement sélectionné comme `plugins.slots.contextEngine`, OpenClaw réinitialise l'emplacement à la valeur par défaut (`legacy`). Le même comportement de réinitialisation s'applique à `plugins.slots.memory`. Aucune modification manuelle de la configuration n'est requise.</Note>

## Relation avec le compactage et la mémoire

<AccordionGroup>
  <Accordion title="Compactage">Le compactage est une responsabilité du moteur de contexte. Le moteur hérité délègue au résumé intégré de OpenClaw. Les plugins de moteur peuvent implémenter n'importe quelle stratégie de compactage (résumés DAG, récupération vectorielle, etc.).</Accordion>
  <Accordion title="Plugins de mémoire">
    Les plugins de mémoire (`plugins.slots.memory`) sont distincts des moteurs de contexte. Les plugins de mémoire fournissent la recherche/récupération ; les moteurs de contexte contrôlent ce que le modèle voit. Ils peuvent travailler ensemble - un moteur de contexte pourrait utiliser les données d'un plugin de mémoire lors de l'assemblage. Les moteurs de plugin qui souhaitent utiliser le chemin
    d'invite de mémoire actif devraient préférer `buildMemorySystemPromptAddition(...)` depuis `openclaw/plugin-sdk/core`, qui convertit les sections d'invite de mémoire active en un `systemPromptAddition` prêt à être préfixé. Si un moteur a besoin d'un contrôle de plus bas niveau, il peut toujours récupérer des lignes brutes de `openclaw/plugin-sdk/memory-host-core` via
    `buildActiveMemoryPromptSection(...)`.
  </Accordion>
  <Accordion title="Élagage de session">Le rognage des anciens résultats d'outil en mémoire s'exécute toujours, quel que soit le moteur de contexte actif.</Accordion>
</AccordionGroup>

## Conseils

- Utilisez `openclaw doctor` pour vérifier que votre moteur se charge correctement.
- Si vous changez de moteur, les sessions existantes continuent avec leur historique actuel. Le nouveau moteur prend le relais pour les exécutions futures.
- Les erreurs du moteur sont consignées et affichées dans les diagnostics. Si un moteur de plugin échoue à s'enregistrer ou si l'identifiant du moteur sélectionné ne peut pas être résolu, OpenClaw ne revient pas automatiquement à l'ancien comportement ; les exécutions échouent jusqu'à ce que vous corrigiez le plugin ou que vous remettiez `plugins.slots.contextEngine` à `"legacy"`.
- Pour le développement, utilisez `openclaw plugins install -l ./my-engine` pour lier un répertoire de plugin local sans le copier.

## Connexes

- [Compaction](/fr/concepts/compaction) - résumer les longues conversations
- [Context](/fr/concepts/context) - comment le contexte est construit pour les tours de l'agent
- [Plugin Architecture](/fr/plugins/architecture) - enregistrer les plugins de moteur de contexte
- [Plugin manifest](/fr/plugins/manifest) - champs du manifeste de plugin
- [Plugins](/fr/tools/plugin) - aperçu des plugins
