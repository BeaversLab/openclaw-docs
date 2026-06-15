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
  Préparer l'état du contexte partagé avant le début d'une exécution enfant. Le hook reçoit les clés de session parent/enfant, `contextMode` (`isolated` ou `fork`), les identifiants/fichiers de transcription disponibles et une TTL facultative. S'il renvoie un handle de rollback, OpenClaw l'appelle lorsque le lancement échoue après une préparation réussie. Les lancements natifs de sous-agents qui
  demandent `lightContext` et se résolvent en `contextMode="isolated"` ignorent intentionnellement ce hook, de sorte que l'enfant démarre à partir du contexte d'amorçage léger sans état pré-lancement géré par le moteur de contexte.
</ParamField>
<ParamField path="onSubagentEnded" type="method">
  Nettoyer lorsqu'une session de sous-agent se termine ou est supprimée.
</ParamField>

### Ajout de prompt système

La méthode `assemble` peut renvoyer une chaîne `systemPromptAddition`. OpenClaw la préfixe au système de prompt pour l'exécution. Cela permet aux moteurs d'injecter des directives de rappel dynamiques, des instructions de récupération ou des indications contextuelles sans nécessiter de fichiers d'espace de travail statiques.

## Le moteur hérité

Le moteur intégré `legacy` préserve le comportement original de OpenClaw :

- **Ingest** : pas d'opération (le gestionnaire de session gère directement la persistance des messages).
- **Assemble** : transmission directe (le pipeline existant sanitize → validate → limit dans le runtime gère l'assemblage du contexte).
- **Compact** : délègue à la compactification de résumé intégrée, qui crée un résumé unique des anciens messages et conserve les messages récents intacts.
- **After turn** : no-op.

Le moteur hérité n'enregistre pas d'outils et ne fournit pas de `systemPromptAddition`.

Lorsqu'aucun `plugins.slots.contextEngine` n'est défini (ou s'il est défini sur `"legacy"`), ce moteur est utilisé automatiquement.

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

La fabrique `ctx` inclut des valeurs `config`, `agentDir` et `workspaceDir`
facultatives afin que les plugins puissent initialiser l'état par agent ou par espace de travail avant l'exécution
du premier hook de cycle de vie.

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
  Les messages ordonnés à envoyer au modèle.
</ParamField>
<ParamField path="estimatedTokens" type="number" required>
  L'estimation par le moteur du nombre total de jetons dans le contexte assemblé. OpenClaw l'utilise pour les décisions de seuil de compactage et les rapports de diagnostic.
</ParamField>
<ParamField path="systemPromptAddition" type="string">
  Ajouté au début du système de prompt.
</ParamField>
<ParamField path="promptAuthority" type='"assembled" | "preassembly_may_overflow"'>
  Contrôle l'estimation des jetons que le runner utilise pour les précontrôles préventifs de dépassement. La valeur par défaut est `"assembled"`, ce qui signifie que seule l'estimation du prompt assemblé est vérifiée - approprié pour les moteurs qui renvoient un contexte fenêtré et autonome. Définissez sur `"preassembly_may_overflow"` uniquement lorsque votre vue assemblée peut masquer des risques
  de dépassement dans la transcription sous-jacente ; le runner prend alors le maximum de l'estimation assemblée et de l'estimation de l'historique de session pré-assemblée (non fenêtrée) pour décider s'il faut compacter préventivement. Dans tous les cas, les messages que vous renvoyez sont toujours ce que le modèle voit - `promptAuthority` n'affecte que le précontrôle.
</ParamField>

`compact` renvoie un `CompactResult`. Lorsque le compactage fait tourner la transcription active, `result.sessionId` et `result.sessionFile` identifient la session successeur que la prochaine tentative ou le prochain tour doit utiliser.

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

Les moteurs de contexte peuvent déclarer des exigences de capacités de l'hôte sur `info.hostRequirements`.
OpenClaw vérifie ces exigences avant de démarrer l'opération et échoue de manière sécurisée avec une erreur descriptive lorsque le runtime sélectionné ne peut pas les satisfaire.

Pour les exécutions d'agent, déclarez `assemble-before-prompt` lorsque le moteur doit contrôler le prompt réel du modèle via `assemble()` :

```ts
info: {
  id: "my-context-engine",
  name: "My Context Engine",
  hostRequirements: {
    "agent-run": {
      requiredCapabilities: ["assemble-before-prompt"],
      unsupportedMessage:
        "Use the native Codex or OpenClaw embedded runtime, or select the legacy context engine.",
    },
  },
}
```

Les exécutions de l'agent intégré Native Codex et OpenClaw satisfont OpenClaw`assemble-before-prompt`CLI.
Les backend CLI génériques ne le font pas, donc les moteurs qui l'exigent sont rejetés avant le
démarrage du processus CLI.

### Isolement des défaillances

OpenClaw isole le moteur de plugin sélectionné du chemin de réponse principal. Si un
moteur non-hérité est manquant, échoue à la validation du contrat, lance une exception lors de la création de la factory
ou lance une exception depuis une méthode de cycle de vie, OpenClaw met ce moteur en quarantaine
pour le processus Gateway actuel et rétrograde le travail du moteur de contexte vers le
moteur intégré `legacy`. L'erreur est enregistrée avec l'opération échouée afin que l'opérateur puisse réparer, mettre à jour ou désactiver le plugin sans que l'agent ne se
taise.

Les échecs des exigences de l'hôte sont différents : lorsqu'un moteur déclare qu'un environnement d'exécution
manque d'une capacité requise, OpenClaw échoue de manière fermée avant de démarrer l'exécution. Cela
protège les moteurs qui corrompraient l'état s'ils fonctionnaient sur un hôte non pris en charge.

### ownsCompaction

`ownsCompaction` contrôle si la compactage automatique intégré lors de la tentative du runtime OpenClaw reste activé pour l'exécution :

<AccordionGroup>
  <Accordion title="ownsCompaction: true">
    Le moteur est responsable du comportement de compactage. OpenClaw désactive l'auto-compactage intégré du runtime OpenClaw pour cette exécution, et l'implémentation `compact()` du moteur est responsable de `/compact`, du compactage de récupération de dépassement et de tout compactage proactif qu'il souhaite effectuer dans `afterTurn()`. OpenClaw peut toujours exécuter la sauvegarde de
    pré-dépassement ; lorsqu'il prédit que la transcription complète débordera, le chemin de récupération appelle `compact()` du moteur actif avant de soumettre une autre invite.
  </Accordion>
  <Accordion title="ownsCompaction: false or unset">L'auto-compactage intégré du runtime OpenClaw peut toujours s'exécuter pendant l'exécution de l'invite, mais la méthode `compact()` du moteur actif est toujours appelée pour `/compact` et la récupération de dépassement.</Accordion>
</AccordionGroup>

<Warning>`ownsCompaction: false` ne signifie **pas** que OpenClaw retourne automatiquement au chemin de compactage du moteur hérité.</Warning>

Cela signifie qu'il existe deux modèles de plugins valides :

<Tabs>
  <Tab title="Owning mode">Implémentez votre propre algorithme de compactage et définissez `ownsCompaction: true`.</Tab>
  <Tab title="Delegating mode">Définissez `ownsCompaction: false` et faites en sorte que `compact()` appelle `delegateCompactionToRuntime(...)` depuis `openclaw/plugin-sdk/core`OpenClaw pour utiliser le comportement de compactage intégré d'OpenClaw.</Tab>
</Tabs>

Un `compact()` vide est dangereux pour un moteur non propriétaire actif car il désactive le chemin de compactage normal `/compact` et de récupération par dépassement pour cet emplacement de moteur.

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
  L'emplacement est exclusif au moment de l'exécution - un seul moteur de contexte enregistré est résolu pour une exécution ou une opération de compactage donnée. D'autres plugins `kind: "context-engine"` activés peuvent toujours se charger et exécuter leur code d'enregistrement ; `plugins.slots.contextEngine`OpenClaw sélectionne uniquement l'identifiant du moteur enregistré qu'OpenClaw résout
  lorsqu'il a besoin d'un moteur de contexte.
</Note>

<Note>**Désinstallation du plugin :** lorsque vous désinstallez le plugin actuellement sélectionné comme `plugins.slots.contextEngine`OpenClaw, OpenClaw réinitialise l'emplacement à la valeur par défaut (`legacy`). Le même comportement de réinitialisation s'applique à `plugins.slots.memory`. Aucune modification manuelle de la configuration n'est requise.</Note>

## Relation avec la compaction et la mémoire

<AccordionGroup>
  <Accordion title="Compaction" OpenClaw>
    La compaction est une responsabilité du moteur de contexte. Le moteur hérité délègue à la résumé intégrée d'OpenClaw. Les moteurs de plug-in peuvent implémenter n'importe quelle stratégie de compaction (résumés DAG, récupération vectorielle, etc.).
  </Accordion>
  <Accordion title="Memory plugins">
    Les plugins de mémoire (`plugins.slots.memory`) sont distincts des moteurs de contexte. Les plugins de mémoire fournissent la recherche/récupération ; les moteurs de contexte contrôlent ce que le modèle voit. Ils peuvent travailler ensemble - un moteur de contexte peut utiliser les données du plugin de mémoire lors de l'assemblage. Les moteurs de plugin qui souhaitent le chemin d'invite de
    mémoire actuel devraient préférer `buildMemorySystemPromptAddition(...)` depuis `openclaw/plugin-sdk/core`, qui convertit les sections d'invite de mémoire actives en un `systemPromptAddition` prêt à être prépendu. Si un moteur a besoin d'un contrôle de plus bas niveau, il peut toujours tirer des lignes brutes de `openclaw/plugin-sdk/memory-host-core` via `buildActiveMemoryPromptSection(...)`.
  </Accordion>
  <Accordion title="Session pruning">Le nettoyage des anciens résultats d'outil en mémoire s'exécute toujours, quel que soit le moteur de contexte actif.</Accordion>
</AccordionGroup>

## Conseils

- Utilisez `openclaw doctor` pour vérifier que votre moteur se charge correctement.
- Si vous changez de moteur, les sessions existantes continuent avec leur historique actuel. Le nouveau moteur prend en charge les exécutions futures.
- Les erreurs du moteur sont journalisées et le moteur de plug-in sélectionné est mis en quarantaine pour le processus Gateway actuel. OpenClaw revient à `legacy` pour les tours utilisateur afin que les réponses puissent continuer, mais vous devriez toujours réparer, mettre à jour, désactiver ou désinstaller le plug-in défaillant.
- Pour le développement, utilisez `openclaw plugins install -l ./my-engine` pour lier un répertoire de plug-in local sans copie.

## Connexes

- [Compactage](/fr/concepts/compaction) - résumer les longues conversations
- [Contexte](/fr/concepts/context) - comment le contexte est construit pour les tours de l'agent
- [Architecture des plug-ins](/fr/plugins/architecture) - enregistrer les moteurs de contexte de plug-ins
- [Manifeste du plug-in](/fr/plugins/manifest) - champs du manifeste du plug-in
- [Plug-ins](/fr/tools/plugin) - vue d'ensemble des plug-ins
