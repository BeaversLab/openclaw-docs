---
summary: "Moteur de contexte : assemblage de contexte plugable, compactage et cycle de vie des sous-agents"
read_when:
  - You want to understand how OpenClaw assembles model context
  - You are switching between the legacy engine and a plugin engine
  - You are building a context engine plugin
title: "Moteur de contexte"
sidebarTitle: "Moteur de contexte"
---

Un **context engine** (moteur de contexte) contrôle la manière dont OpenClaw construit le contexte du modèle pour chaque exécution : quels messages inclure, comment résumer l'historique ancien et comment gérer le contexte entre les limites des sous-agents.

OpenClaw est fourni avec un moteur `legacy` intégré et l'utilise par défaut — la plupart des utilisateurs n'ont jamais besoin de le modifier. N'installez et ne sélectionnez un moteur de plugin que lorsque vous souhaitez un comportement d'assemblage, de compactage ou de rappel inter-session différent.

## Quick start

<Steps>
  <Step title="Vérifier quel moteur est actif">
    ```bash
    openclaw doctor
    # or inspect config directly:
    cat ~/.openclaw/openclaw.json | jq '.plugins.slots.contextEngine'
    ```
  </Step>
  <Step title="Installer un moteur de plugin">
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
  <Step title="Revenir à l'ancien système (facultatif)">
    Définissez `contextEngine` sur `"legacy"` (ou supprimez entièrement la clé — `"legacy"` est la valeur par défaut).
  </Step>
</Steps>

## Fonctionnement

Chaque fois que OpenClaw exécute une invite de modèle, le moteur de contexte intervient à quatre points du cycle de vie :

<AccordionGroup>
  <Accordion title="1. Ingérer">Appelé lorsqu'un nouveau message est ajouté à la session. Le moteur peut stocker ou indexer le message dans son propre magasin de données.</Accordion>
  <Accordion title="2. Assemble">Appelé avant chaque exécution de modèle. Le moteur renvoie un ensemble ordonné de messages (et un `systemPromptAddition` facultatif) qui tiennent dans le budget de jetons.</Accordion>
  <Accordion title="3. Compact">Appelé lorsque la fenêtre de contexte est pleine ou lorsque l'utilisateur exécute `/compact`. Le moteur résume l'historique plus ancien pour libérer de l'espace.</Accordion>
  <Accordion title="4. After turn">Appelé après l'achèvement d'une exécution. Le moteur peut rendre l'état persistant, déclencher une compression en arrière-plan ou mettre à jour des index.</Accordion>
</AccordionGroup>

Pour le harnais Codex non-ACP fourni, OpenClaw applique le même cycle de vie en projetant le contexte assemblé dans les instructions développeur de Codex et l'invite du tour actuel. Codex conserve toujours son propre historique de thread natif et son propre compacteur.

### Cycle de vie du sous-agent (facultatif)

OpenClaw appelle deux points d'ancrage facultatifs du cycle de vie du sous-agent :

<ParamField path="prepareSubagentSpawn" type="method">
  Prépare l'état du contexte partagé avant le début d'une exécution enfant. Le point d'ancrage reçoit les clés de session parent/enfant, `contextMode` (`isolated` ou `fork`), les id/fichiers de transcription disponibles et un TTL facultatif. S'il renvoie un handle de restauration, OpenClaw l'appelle lorsque le lancement échoue après une préparation réussie.
</ParamField>
<ParamField path="onSubagentEnded" type="method">
  Nettoie lorsqu'une session de sous-agent se termine ou est nettoyée.
</ParamField>

### Ajout de prompt système

La méthode `assemble` peut renvoyer une chaîne `systemPromptAddition`. OpenClaw la préfixe au prompt système pour l'exécution. Cela permet aux moteurs d'injecter des directives de rappel dynamiques, des instructions de récupération ou des indications contextuelles sans nécessiter de fichiers d'espace de travail statiques.

## Le moteur hérité

Le moteur `legacy` intégré préserve le comportement original d'OpenClaw :

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

| Membre             | Genre     | Objet                                                                          |
| ------------------ | --------- | ------------------------------------------------------------------------------ |
| `info`             | Propriété | Identifiant, nom, version du moteur et s'il possède la compactification        |
| `ingest(params)`   | Méthode   | Stocker un message unique                                                      |
| `assemble(params)` | Méthode   | Construire le contexte pour une exécution de modèle (renvoie `AssembleResult`) |
| `compact(params)`  | Méthode   | Résumer/réduire le contexte                                                    |

`assemble` renvoie un `AssembleResult` avec :

<ParamField path="messages" type="Message[]" required>
  Les messages ordonnés à envoyer au modèle.
</ParamField>
<ParamField path="estimatedTokens" type="number" required>
  L'estimation par le moteur du nombre total de jetons dans le contexte assemblé. OpenClaw l'utilise pour les décisions de seuil de compactification et les rapports de diagnostic.
</ParamField>
<ParamField path="systemPromptAddition" type="string">
  Ajouté au début du prompt système.
</ParamField>

`compact` renvoie un `CompactResult`. Lorsque la compactification fait pivoter la transcription active, `result.sessionId` et `result.sessionFile` identifient la session successeur que la prochaine nouvelle tentative ou tour doit utiliser.

Membres facultatifs :

| Membre                         | Genre   | Objet                                                                                                                                                               |
| ------------------------------ | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `bootstrap(params)`            | Méthode | Initialiser l'état du moteur pour une session. Appelé une seule fois lorsque le moteur voit pour la première fois une session (par exemple, importer l'historique). |
| `ingestBatch(params)`          | Méthode | Ingérer un tour terminé par lot. Appelé après la fin d'une exécution, avec tous les messages de ce tour à la fois.                                                  |
| `afterTurn(params)`            | Méthode | Travail de cycle de vie post-exécution (persister l'état, déclencher la compactification en arrière-plan).                                                          |
| `prepareSubagentSpawn(params)` | Méthode | Configurez l'état partagé pour une session enfant avant son démarrage.                                                                                              |
| `onSubagentEnded(params)`      | Méthode | Nettoyez après la fin d'un sous-agent.                                                                                                                              |
| `dispose()`                    | Méthode | Libérez les ressources. Appelé lors de l'arrêt de la passerelle ou du rechargement du plugin — et non par session.                                                  |

### ownsCompaction

`ownsCompaction` contrôle si la compression automatique intégrée de Pi reste activée pour l'exécution :

<AccordionGroup>
  <Accordion title="ownsCompaction: true">
    Le moteur possède le comportement de compression. OpenClaw désactive la compression automatique intégrée de Pi pour cette exécution, et l'implémentation `compact()` du moteur est responsable de `/compact`, de la compression de récupération de dépassement, et de toute compression proactive qu'il souhaite effectuer dans `afterTurn()`. OpenClaw peut toujours exécuter la sauvegarde de dépassement
    pré-prompt ; lorsqu'il prédit que la transcription complète débordera, le chemin de récupération appelle le `compact()` du moteur actif avant de soumettre un autre prompt.
  </Accordion>
  <Accordion title="ownsCompaction: false or unset">La compression automatique intégrée de Pi peut toujours s'exécuter pendant l'exécution du prompt, mais la méthode `compact()` du moteur actif est toujours appelée pour `/compact` et la récupération de dépassement.</Accordion>
</AccordionGroup>

<Warning>`ownsCompaction: false` ne signifie **pas** qu'OpenClaw revient automatiquement au chemin de compression du moteur hérité.</Warning>

Cela signifie qu'il existe deux modèles de plugins valides :

<Tabs>
  <Tab title="Owning mode">Implémentez votre propre algorithme de compression et définissez `ownsCompaction: true`.</Tab>
  <Tab title="Delegating mode">Définissez `ownsCompaction: false` et faites en sorte que `compact()` appelle `delegateCompactionToRuntime(...)` depuis `openclaw/plugin-sdk/core` pour utiliser le comportement de compression intégré d'OpenClaw.</Tab>
</Tabs>

Un `compact()` sans effet est dangereux pour un moteur actif non propriétaire car il désactive le chemin de compression normal `/compact` et de récupération de dépassement pour cet emplacement de moteur.

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
  L'emplacement est exclusif lors de l'exécution — un seul moteur de contexte enregistré est résolu pour une exécution ou une opération de compactage donnée. D'autres plugins `kind: "context-engine"` activés peuvent toujours se charger et exécuter leur code d'enregistrement ; `plugins.slots.contextEngine` sélectionne uniquement l'identifiant du moteur enregistré qu'OpenClaw résout lorsqu'il a
  besoin d'un moteur de contexte.
</Note>

<Note>**Désinstallation du plugin :** lorsque vous désinstallez le plugin actuellement sélectionné comme `plugins.slots.contextEngine`, OpenClaw réinitialise l'emplacement à la valeur par défaut (`legacy`). Le même comportement de réinitialisation s'applique à `plugins.slots.memory`. Aucune modification manuelle de la configuration n'est requise.</Note>

## Relation avec le compactage et la mémoire

<AccordionGroup>
  <Accordion title="Compactage">Le compactage est une responsabilité du moteur de contexte. Le moteur hérité délègue à la résumé intégré d'OpenClaw. Les moteurs de plugin peuvent implémenter n'importe quelle stratégie de compactage (résumés DAG, récupération vectorielle, etc.).</Accordion>
  <Accordion title="Plugins de mémoire">
    Les plugins de mémoire (`plugins.slots.memory`) sont distincts des moteurs de contexte. Les plugins de mémoire fournissent la recherche/récupération ; les moteurs de contexte contrôlent ce que le modèle voit. Ils peuvent fonctionner ensemble — un moteur de contexte pourrait utiliser les données du plugin de mémoire lors de l'assemblage. Les moteurs de plugin qui souhaitent le chemin d'invite
    de mémoire actif devraient privilégier `buildMemorySystemPromptAddition(...)` depuis `openclaw/plugin-sdk/core`, qui convertit les sections d'invite de mémoire actives en un `systemPromptAddition` prêt à être préfixé. Si un moteur a besoin d'un contrôle de plus bas niveau, il peut toujours extraire des lignes brutes de `openclaw/plugin-sdk/memory-host-core` via
    `buildActiveMemoryPromptSection(...)`.
  </Accordion>
  <Accordion title="Élagage de session">Le nettoyage des anciens résultats d'outil en mémoire s'exécute toujours indépendamment du moteur de contexte actif.</Accordion>
</AccordionGroup>

## Conseils

- Utilisez `openclaw doctor` pour vérifier que votre moteur se charge correctement.
- Si vous changez de moteur, les sessions existantes continuent avec leur historique actuel. Le nouveau moteur prend en charge les futures exécutions.
- Les erreurs du moteur sont consignées et affichées dans les diagnostics. Si un moteur de plugin échoue à s'enregistrer ou si l'identifiant du moteur sélectionné ne peut pas être résolu, OpenClaw ne revient pas automatiquement à l'ancienne version ; les exécutions échouent jusqu'à ce que vous corrigiez le plugin ou que vous remettiez `plugins.slots.contextEngine` à `"legacy"`.
- Pour le développement, utilisez `openclaw plugins install -l ./my-engine` pour lier un répertoire de plugins local sans copie.

## Connexes

- [Compactage](/fr/concepts/compaction) — résumer les longues conversations
- [Contexte](/fr/concepts/context) — comment le contexte est construit pour les tours de l'agent
- [Architecture des plugins](/fr/plugins/architecture) — enregistrement des plugins de moteur de contexte
- [Manifeste du plugin](/fr/plugins/manifest) — champs du manifeste du plugin
- [Plugins](/fr/tools/plugin) — vue d'ensemble des plugins
