---
summary: "Surface du SDK expérimental pour les plugins qui remplacent l'exécuteur d'agent de bas niveau intégré"
title: "Plugins de harnais d'agent"
sidebarTitle: "Harnais d'agent"
read_when:
  - You are changing the embedded agent runtime or harness registry
  - You are registering an agent harness from a bundled or trusted plugin
  - You need to understand how the Codex plugin relates to model providers
---

Un **agent harness** est l'exécuteur de bas niveau pour un tour d'agent OpenClaw préparé. Ce n'est pas un fournisseur de modèle, ni un canal, ni un registre d'outils. Pour le modèle mental orienté utilisateur, voir [Agent runtimes](/fr/concepts/agent-runtimes).

Utilisez cette surface uniquement pour les plugins natifs regroupés ou de confiance. Le contrat est toujours expérimental car les types de paramètres reflètent intentionnellement le runner intégré actuel.

## Quand utiliser un harnais

Enregistrez un harnais d'agent lorsqu'une famille de modèles possède son propre runtime de session natif et que le transport du provider OpenClaw normal constitue la mauvaise abstraction.

Exemples :

- un serveur natif d'agent de codage qui possède les threads et la compaction
- un CLI local ou un démon qui doit diffuser des événements natifs de plan/raisonnement/outil
- un runtime de modèle qui a besoin de son propre identifiant de reprise en plus de la transcription de session OpenClaw

N'enregistrez **pas** un harness juste pour ajouter une nouvelle LLM API. Pour les API de modèle HTTP ou WebSocket normales, créez un [provider plugin](/fr/plugins/sdk-provider-plugins).

## Ce que le cœur possède toujours

Avant la sélection d'un harnais, OpenClaw a déjà résolu :

- provider et modèle
- état d'authentification du runtime
- niveau de réflexion et budget de contexte
- le fichier de transcription/session OpenClaw
- espace de travail, bac à sable et stratégie d'outils
- rappels de réponse de canal et rappels de diffusion
- stratégie de basculement de modèle et de changement de modèle en direct

Cette répartition est intentionnelle. Un harnais exécute une tentative préparée ; il ne choisit pas les providers, ne remplace pas la delivery par canal et ne change pas silencieusement de modèle.

La tentative préparée inclut également `params.runtimePlan`, un bundle de stratégies appartenant à OpenClaw pour les décisions d'exécution qui doivent rester partagées entre OpenClaw et les harness natifs :

- `runtimePlan.tools.normalize(...)` et
  `runtimePlan.tools.logDiagnostics(...)` pour la stratégie de schéma d'outils tenant compte du provider
- `runtimePlan.transcript.resolvePolicy(...)` pour la stratégie de nettoyage de transcription et
  de réparation des appels d'outils
- `runtimePlan.delivery.isSilentPayload(...)` pour la `NO_REPLY` partagée et la
  suppression de diffusion des médias
- `runtimePlan.outcome.classifyRunResult(...)` pour la classification de repli du model
- `runtimePlan.observability` pour les métadonnées de provider/model/harness résolus

Les harness peuvent utiliser le plan pour les décisions qui doivent correspondre au comportement de OpenClaw, mais doivent toujours le considérer comme un état de tentative appartenant à l'hôte. Ne le modifiez pas et ne l'utilisez pas pour changer de providers/models à l'intérieur d'un tour.

## Enregistrer un harness

**Importation :** `openclaw/plugin-sdk/agent-harness`

```typescript
import type { AgentHarness } from "openclaw/plugin-sdk/agent-harness";
import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";

const myHarness: AgentHarness = {
  id: "my-harness",
  label: "My native agent harness",

  supports(ctx) {
    return ctx.provider === "my-provider" ? { supported: true, priority: 100 } : { supported: false };
  },

  async runAttempt(params) {
    // Start or resume your native thread.
    // Use params.prompt, params.tools, params.images, params.onPartialReply,
    // params.onAgentEvent, and the other prepared attempt fields.
    return await runMyNativeTurn(params);
  },
};

export default definePluginEntry({
  id: "my-native-agent",
  name: "My Native Agent",
  description: "Runs selected models through a native agent daemon.",
  register(api) {
    api.registerAgentHarness(myHarness);
  },
});
```

## Politique de sélection

OpenClaw choisit un harness après la résolution du provider/model :

1. La stratégie d'exécution (runtime policy) délimitée au modèle prime.
2. La stratégie d'exécution délimitée au provider vient ensuite.
3. `auto` demande aux harness enregistrés s'ils prennent en charge le
   provider/modèle résolu.
4. Si aucun harness enregistré ne correspond, OpenClaw utilise son runtime embarqué.

Les échecs de harness de plugin apparaissent comme des échecs d'exécution. En mode `auto`, le repli embarqué n'est utilisé que lorsqu'aucun harness de plugin enregistré ne prend en charge le provider/model résolu. Une fois qu'un harness de plugin a revendiqué une exécution, OpenClaw ne rejoue pas ce même tour via un autre runtime car cela peut changer la sémantique d'auth/runtime ou dupliquer les effets secondaires.

Les épinglages d'exécution (runtime pins) pour toute la session ou tout l'agent sont ignorés lors de la sélection. Cela
inclut les valeurs obsolètes de session `agentHarnessId`, `agents.defaults.agentRuntime`,
`agents.list[].agentRuntime`, et `OPENCLAW_AGENT_RUNTIME`. `/status` montre l'exécution
effective sélectionnée à partir de la route provider/modèle.
Si le harness sélectionné est surprenant, activez la journalisation de débogage `agents/harness` et
inspectez l'enregistrement structuré `agent harness selected` de la passerelle. Il inclut
l'identifiant du harness sélectionné, la raison de la sélection, la stratégie de repli d'exécution, et, en
mode `auto`, le résultat de prise en charge de chaque candidat plugin.

Le plugin Codex groupé enregistre `codex` comme identifiant de son harness. Le cœur le traite
comme un identifiant de harness de plugin ordinaire ; les alias spécifiques à Codex appartiennent au plugin
ou à la configuration de l'opérateur, et non au sélecteur d'exécution partagé.

## Association provider et harness

La plupart des harnais devraient également enregistrer un fournisseur. Le fournisseur rend les références de modèle, le statut d'authentification, les métadonnées du modèle et la sélection `/model` visibles par le reste d'OpenClaw. Le harnais réclame ensuite ce fournisseur dans `supports(...)`.

Le plugin Codex inclus suit ce modèle :

- références de modèle utilisateur préférées : `openai/gpt-5.5`
- références de compatibilité : les anciennes références `codex/gpt-*` restent acceptées, mais les
  nouvelles configurations ne devraient pas les utiliser comme références de fournisseur/modèle normales
- id de harnais : `codex`
- auth : disponibilité synthétique du fournisseur, car le harnais Codex possède la
  connexion/session native Codex
- requête app-server : OpenClaw envoie l'id de modèle brut à Codex et laisse le
  harnais parler au protocole natif de l'app-server

Le plugin Codex est additif. Les simples références d'agent `openai/gpt-*` sur le fournisseur officiel OpenAI sélectionnent le harnais Codex par défaut. Les anciennes références `codex/gpt-*`
sélectionnent toujours le fournisseur et le harnais Codex pour la compatibilité.

Pour la configuration de l'opérateur, les exemples de préfixes de modèle et les configurations exclusives à Codex, voir [Codex Harness](/fr/plugins/codex-harness).

OpenClaw nécessite l'app-server Codex `0.125.0` ou plus récent. Le plugin Codex vérifie
la poignée de main (handshake) d'initialisation de l'app-server et bloque les serveurs plus anciens ou sans version afin qu'OpenClaw
n'exécute que contre la surface de protocole avec laquelle il a été testé. Le
plancher `0.125.0` inclut la prise en charge native de la charge utile du hook MCP qui est arrivée dans
Codex `0.124.0`, tout en épinglant OpenClaw à la ligne stable plus récente testée.

### Middleware de résultats d'outils

Les plugins groupés peuvent attacher un middleware de résultats d'outils neutre vis-à-vis du runtime via `api.registerAgentToolResultMiddleware(...)` lorsque leur manifeste déclare les IDs de runtime ciblés dans `contracts.agentToolResultMiddleware`. Cette jonction de confiance est destinée aux transformations asynchrones de résultats d'outils qui doivent s'exécuter avant que OpenClaw ou Codex ne renvoie la sortie de l'outil dans le modèle.

Les plugins groupés hérités peuvent toujours utiliser `api.registerCodexAppServerExtensionFactory(...)` pour le middleware exclusif au serveur d'application Codex, mais les nouvelles transformations de résultats devraient utiliser l'API neutre vis-à-vis du runtime. Le hook `api.registerEmbeddedExtensionFactory(...)` exclusif à l'exécuteur embarqué a été supprimé ; les transformations de résultats d'outils embarquées doivent utiliser un middleware neutre vis-à-vis du runtime.

### Classification des résultats terminaux

Les harness natifs qui possèdent leur propre projection de protocole peuvent utiliser
`classifyAgentHarnessTerminalOutcome(...)` à partir de
`openclaw/plugin-sdk/agent-harness-runtime` lorsqu'un tour complété n'a produit aucun
texte d'assistant visible. L'assistant renvoie `empty`, `reasoning-only` ou
`planning-only` afin que la politique de repli de OpenClaw puisse décider s'il faut réessayer sur un
différent model. Il laisse intentionnellement non classés les erreurs de prompt, les tours en cours et
les réponses silencieuses intentionnelles telles que `NO_REPLY`.

### Mode de harness natif Codex

Le harness `codex` groupé est le mode natif Codex pour les tours d'agent
OpenClaw intégrés. Activez d'abord le plugin `codex` groupé, et incluez `codex` dans
`plugins.allow` si votre configuration utilise une liste d'autorisation restrictive. Les configurations de serveur d'application
natif doivent utiliser `openai/gpt-*` ; les tours d'agent OpenAI sélectionnent le harness Codex
par défaut. Les routes `openai-codex/*` héritées doivent être réparées avec
`openclaw doctor --fix`, et les références de model `codex/*` héritées restent des alias de
compatibilité pour le harness natif.

Lorsque ce mode s'exécute, Codex possède l'identifiant du thread natif, le comportement de reprise, la compactage et l'exécution du serveur d'application. OpenClaw possède toujours le canal de discussion, le miroir de transcript visible, la stratégie d'outil, les approbations, la livraison des médias et la sélection de session. Utilisez le provider/model `agentRuntime.id: "codex"` lorsque vous devez prouver que seul le chemin du serveur d'application Codex peut revendiquer l'exécution. Les runtimes de plugin explicites échouent en mode fermé ; les échecs de sélection du serveur d'application Codex et les échecs de runtime ne sont pas réessayés via un autre runtime.

## Rigueur de l'exécution

Par défaut, OpenClaw utilise la stratégie de runtime provider/model `auto` : les harnais de plugin enregistrés peuvent revendiquer une paire provider/model, et le runtime intégré gère le tour lorsqu'aucune ne correspond. Les références d'agent OpenAI sur le provider OpenAI officiel sont par défaut dirigées vers Codex. Utilisez un runtime de plugin provider/model explicite tel que `agentRuntime.id: "codex"` lorsque l'échec de la sélection du harnais doit provoquer un échec au lieu d'être acheminé via le runtime intégré. Les échecs de harnais de plugin sélectionnés échouent toujours de manière brutale. Cela ne bloque pas un provider/model `agentRuntime.id: "openclaw"` explicite.

Pour les exécutions intégrées Codex uniquement :

```json
{
  "models": {
    "providers": {
      "openai": {
        "agentRuntime": {
          "id": "codex"
        }
      }
    }
  },
  "agents": {
    "defaults": {
      "model": "openai/gpt-5.5"
    }
  }
}
```

Si vous souhaitez un backend CLI pour un modèle canonique, placez le runtime sur cette entrée de modèle :

```json
{
  "agents": {
    "defaults": {
      "model": "anthropic/claude-opus-4-8",
      "models": {
        "anthropic/claude-opus-4-8": {
          "agentRuntime": {
            "id": "claude-cli"
          }
        }
      }
    }
  }
}
```

Les substitutions par agent utilisent la même forme avec portée de modèle :

```json
{
  "agents": {
    "list": [
      {
        "id": "codex-only",
        "model": "openai/gpt-5.5",
        "models": {
          "openai/gpt-5.5": {
            "agentRuntime": { "id": "codex" }
          }
        }
      }
    ]
  }
}
```

Les exemples d'exécution pour l'agent entier (hérités) comme celui-ci sont ignorés :

```json
{
  "agents": {
    "defaults": {
      "agentRuntime": {
        "id": "codex"
      }
    }
  }
}
```

Avec un runtime de plugin explicite, une session échoue tôt lorsque le harness demandé n'est pas enregistré, ne prend pas en charge le provider/model résolu, ou échoue avant de produire les effets secondaires du tour. C'est intentionnel pour les déploiements Codex uniquement et pour les tests en direct qui doivent prouver que le chemin du serveur d'application Codex est réellement utilisé.

Ce paramètre contrôle uniquement le harness de l'agent intégré. Il ne désactive pas le routage de modèle spécifique au provider pour l'image, la vidéo, la musique, le TTS, le PDF ou autres.

## Sessions natives et miroir de transcription

Un harness peut conserver un id de session natif, un id de fil, ou un jeton de reprise côté démon. Gardez cette liaison explicitement associée à la session OpenClaw, et continuez à réfléchir la sortie assistant/tool visible par l'utilisateur dans la transcription OpenClaw.

La transcription OpenClaw reste la couche de compatibilité pour :

- l'historique de session visible par le canal
- la recherche et l'indexation de transcription
- revenir au harnais intégré OpenClaw lors d'un tour ultérieur
- le comportement générique de `/new`, `/reset` et de suppression de session

Si votre harness stocke une liaison sidecar, implémentez `reset(...)` afin que OpenClaw puisse la effacer lorsque la session OpenClaw propriétaire est réinitialisée.

## Résultats d'outil et de média

Core construit la liste d'outils OpenClaw et la transmet à la tentative préparée.
Lorsqu'un harnais exécute un appel d'outil dynamique, renvoyez le résultat de l'outil via
la forme de résultat du harnais au lieu d'envoyer vous-même des médias channel.

Cela permet de garder les sorties de texte, d'image, de vidéo, de musique, de TTS, d'approbation et d'outil de messagerie sur le même chemin de livraison que les exécutions prises en charge par OpenClaw.

## Limitations actuelles

- Le chemin d'importation public est générique, mais certains alias de type tentative/résultat portent encore des noms hérités pour des raisons de compatibilité.
- L'installation de harnais tiers est expérimentale. Préférez les plugins provider
  jusqu'à ce que vous ayez besoin d'un runtime de session natif.
- Le changement de harnais est pris en charge entre les tours. Ne changez pas de harnais au
  milieu d'un tour après le début des outils natifs, des approbations, du texte de l'assistant ou de l'envoi
  de messages.

## Connexes

- [Aperçu du SDK](/fr/plugins/sdk-overview)
- [Assistants de Runtime](/fr/plugins/sdk-runtime)
- [Plugins de Provider](/fr/plugins/sdk-provider-plugins)
- [Harnais Codex](/fr/plugins/codex-harness)
- [Providers de Modèle](/fr/concepts/model-providers)
