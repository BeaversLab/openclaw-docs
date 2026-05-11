---
summary: "Surface du SDK expérimental pour les plugins qui remplacent l'exécuteur d'agent de bas niveau intégré"
title: "Plugins de harnais d'agent"
sidebarTitle: "Harnais d'agent"
read_when:
  - You are changing the embedded agent runtime or harness registry
  - You are registering an agent harness from a bundled or trusted plugin
  - You need to understand how the Codex plugin relates to model providers
---

Un **harnais d'agent** est l'exécuteur de bas niveau pour un tour d'agent OpenClaw préparé. Ce n'est pas un provider de modèle, ni un canal, ni un registre d'outils. Pour le modèle mental orienté utilisateur, voir [Runtimes d'agent](/fr/concepts/agent-runtimes).

Utilisez cette surface uniquement pour les plugins natifs regroupés ou de confiance. Le contrat est toujours expérimental car les types de paramètres reflètent intentionnellement le runner intégré actuel.

## Quand utiliser un harnais

Enregistrez un harnais d'agent lorsqu'une famille de modèles possède son propre runtime de session natif et que le transport du provider OpenClaw normal constitue la mauvaise abstraction.

Exemples :

- un serveur natif d'agent de codage qui possède les threads et la compaction
- un CLI local ou un démon qui doit diffuser des événements natifs de plan/raisonnement/outil
- un runtime de modèle qui a besoin de son propre identifiant de reprise en plus de la transcription de session OpenClaw

N'enregistrez **pas** un harnais simplement pour ajouter une nouvelle LLM API. Pour les API de modèle HTTP ou WebSocket normales, créez un [plugin de provider](/fr/plugins/sdk-provider-plugins).

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

La tentative préparée inclut également `params.runtimePlan`, un bundle de stratégies détenu par OpenClaw pour les décisions d'exécution qui doivent rester partagées entre les harnais PI et natifs :

- `runtimePlan.tools.normalize(...)` et
  `runtimePlan.tools.logDiagnostics(...)` pour la stratégie de schéma d'outils tenant compte du provider
- `runtimePlan.transcript.resolvePolicy(...)` pour la stratégie de nettoyage de transcription et
  de réparation des appels d'outils
- `runtimePlan.delivery.isSilentPayload(...)` pour la `NO_REPLY` partagée et la
  suppression de diffusion des médias
- `runtimePlan.outcome.classifyRunResult(...)` pour la classification de repli du model
- `runtimePlan.observability` pour les métadonnées de provider/model/harness résolus

Les harness peuvent utiliser le plan pour les décisions qui doivent correspondre au comportement de PI, mais
doivent toujours le considérer comme un état de tentative appartenant à l'hôte. Ne le modifiez pas et ne l'utilisez pas pour
changer de providers/models au cours d'un tour.

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

1. L'identifiant de harness enregistré d'une session existante l'emporte, de sorte que les modifications de config/env ne
   basculent pas à chaud cette transcription vers un autre runtime.
2. `OPENCLAW_AGENT_RUNTIME=<id>` force un harness enregistré avec cet identifiant pour
   les sessions qui ne sont pas déjà épinglées.
3. `OPENCLAW_AGENT_RUNTIME=pi` force le harness PI intégré.
4. `OPENCLAW_AGENT_RUNTIME=auto` demande aux harness enregistrés s'ils prennent en charge le
   provider/model résolu.
5. Si aucun harness enregistré ne correspond, OpenClaw utilise PI, sauf si le repli PI est
   désactivé.

Les échecs de harness de plugin apparaissent comme des échecs d'exécution. En mode `auto`, le repli PI n'est
utilisé que si aucun harness de plugin enregistré ne prend en charge le
provider/model résolu. Une fois qu'un harness de plugin a revendiqué une exécution, OpenClaw ne
rejoue pas ce même tour via PI, car cela peut modifier la sémantique d'auth/runtime
ou dupliquer les effets secondaires.

L'identifiant du harness sélectionné est conservé avec l'identifiant de session après une exécution intégrée.
Les sessions héritées créées avant l'épinglage des harness sont traitées comme épinglées à PI une fois qu'elles
ont un historique de transcription. Utilisez une session nouvelle/réinitialisée lors du passage de PI à un
harness de plugin natif. `/status` affiche les identifiants de harness non par défaut tels que `codex`
à côté de `Fast` ; PI reste masqué car c'est le chemin de compatibilité par défaut.
Si le harness sélectionné est surprenant, activez la journalisation de débogage `agents/harness` et
inspectez l'enregistrement structuré `agent harness selected` de la passerelle. Il comprend
l'identifiant du harness sélectionné, la raison de la sélection, la politique de runtime/repli, et, en
mode `auto`, le résultat de la prise en charge de chaque candidat de plugin.

Le plugin Codex inclus enregistre `codex` comme identifiant de harnais. Core le considère comme un identifiant de harnais de plugin ordinaire ; les alias spécifiques à Codex appartiennent à la configuration du plugin ou de l'opérateur, et non au sélecteur d'exécution partagé.

## Association fournisseur et harnais

La plupart des harnais doivent également enregistrer un fournisseur. Le fournisseur rend les références de modèle, le statut d'authentification, les métadonnées du modèle et la sélection `/model` visibles pour le reste d'OpenClaw. Le harnais réclame ensuite ce fournisseur dans `supports(...)`.

Le plugin Codex inclus suit ce modèle :

- références de modèle utilisateur préférées : `openai/gpt-5.5` plus
  `agentRuntime.id: "codex"`
- références de compatibilité : les anciennes références `codex/gpt-*` restent acceptées, mais les nouvelles
  configurations ne doivent pas les utiliser comme références de fournisseur/modèle normales
- identifiant de harnais : `codex`
- auth : disponibilité synthétique du fournisseur, car le harnais Codex possède la
  connexion/session native Codex
- requête app-server : OpenClaw envoie l'identifiant de modèle brut à Codex et laisse le
  harnais communiquer avec le protocole natif de l'app-server

Le plugin Codex est additif. Les simples références `openai/gpt-*` continuent d'utiliser le chemin normal du fournisseur OpenClaw, sauf si vous forcez le harnais Codex avec
`agentRuntime.id: "codex"`. Les anciennes références `codex/gpt-*` sélectionnent toujours le
fournisseur et le harnais Codex pour des raisons de compatibilité.

Pour la configuration de l'opérateur, les exemples de préfixes de modèle et les configurations exclusives à Codex, voir
[Codex Harness](/fr/plugins/codex-harness).

OpenClaw nécessite Codex app-server `0.125.0` ou plus récent. Le plugin Codex vérifie
la poignée de main d'initialisation de l'app-server et bloque les serveurs plus anciens ou sans version afin qu'OpenClaw ne fonctionne que contre la surface de protocole avec laquelle il a été testé. Le
plancher `0.125.0` inclut la prise en charge native de la charge utile du hook MCP qui a atterri dans
Codex `0.124.0`, tout en épinglant OpenClaw à la ligne stable plus récente testée.

### Intergiciel de résultats d'outils

Les plugins groupés peuvent attacher une intergiciel de résultats d'outil (tool-result middleware) neutre par rapport à l'exécution via
`api.registerAgentToolResultMiddleware(...)` lorsque leur manifeste déclare les
identifiants d'exécution ciblés dans `contracts.agentToolResultMiddleware`. Cette interface
fiable est destinée aux transformations asynchrones de résultats d'outil qui doivent s'exécuter avant que PI ou Codex n'alimente
la sortie de l'outil dans le modèle.

Les plugins groupés hérités peuvent toujours utiliser
`api.registerCodexAppServerExtensionFactory(...)` pour l'intergiciel
uniquement pour le serveur d'application Codex, mais les nouvelles transformations de résultats devraient utiliser l'API neutre par rapport à l'exécution.
Le hook `api.registerEmbeddedExtensionFactory(...)` réservé à Pi a été supprimé ;
les transformations de résultats d'outil Pi doivent utiliser l'intergiciel neutre par rapport à l'exécution.

### Classification des résultats de terminal

Les harnais natifs qui possèdent leur propre projection de protocole peuvent utiliser
`classifyAgentHarnessTerminalOutcome(...)` depuis
`openclaw/plugin-sdk/agent-harness-runtime` lorsqu'un tour achevé n'a produit aucun
texte d'assistant visible. L'assistant renvoie `empty`, `reasoning-only` ou
`planning-only` afin que la politique de repli de OpenClaw puisse décider s'il faut réessayer avec un
modèle différent. Il laisse intentionnellement non classifiés les erreurs d'invite, les tours en cours et
les réponses silencieuses intentionnelles telles que `NO_REPLY`.

### Mode de harnais Codex natif

Le harnais `codex` groupé est le mode Codex natif pour les tours d'agent OpenClaw
intégrés. Activez d'abord le plugin `codex` groupé, et incluez `codex` dans
`plugins.allow` si votre configuration utilise une liste d'autorisation restrictive. Les configurations natives de serveur d'application
devraient utiliser `openai/gpt-*` avec `agentRuntime.id: "codex"`.
Utilisez `openai-codex/*` pour l'OAuth Codex via PI à la place. Les références de modèle `codex/*`
héritées restent des alias de compatibilité pour le harnais natif.

Lorsque ce mode s'exécute, Codex possède l'identifiant du thread natif, le comportement de reprise,
la compactage et l'exécution de l'app-server. OpenClaw possède toujours le canal de discussion,
le miroir de la transcription visible, la politique d'outil, les approbations, la diffusion de médias et la sélection
de session. Utilisez `agentRuntime.id: "codex"` sans substitution `fallback`
lorsque vous devez prouver que seul le chemin de l'app-server Codex peut revendiquer l'exécution.
Les runtimes de plugins explicites échouent déjà de manière fermée par défaut. Définissez `fallback: "pi"`
uniquement lorsque vous souhaitez intentionnellement que PI gère la sélection de harnais manquante. Les échecs de
l'app-server Codex échouent déjà directement au lieu de réessayer via PI.

## Désactiver le repli PI

Par défaut, OpenClaw exécute les agents intégrés avec `agents.defaults.agentRuntime`
défini sur `{ id: "auto", fallback: "pi" }`. En mode `auto`, les harnais de plugins
enregistrés peuvent revendiquer une paire provider/model. Si aucune ne correspond, OpenClaw revient par défaut
à PI.

En mode `auto`, définissez `fallback: "none"` lorsque vous souhaitez que la sélection
de harnais de plugin manquant échoue au lieu d'utiliser PI. Les runtimes de plugins explicites tels que
`runtime: "codex"` échouent déjà de manière fermée par défaut, sauf si `fallback: "pi"` est
défini dans la même configuration ou la portée de substitution d'environnement. Les échecs de harnais de plugin
sélectionnés échouent toujours de manière brutale. Cela ne bloque pas un `runtime: "pi"` explicite ou
`OPENCLAW_AGENT_RUNTIME=pi`.

Pour les exécutions intégrées Codex uniquement :

```json
{
  "agents": {
    "defaults": {
      "model": "openai/gpt-5.5",
      "agentRuntime": {
        "id": "codex"
      }
    }
  }
}
```

Si vous souhaitez que tout harnais de plugin enregistré revendique les modèles correspondants mais ne voulez
jamais que OpenClaw revienne silencieusement à PI, gardez `runtime: "auto"` et désactivez
le repli :

```json
{
  "agents": {
    "defaults": {
      "agentRuntime": {
        "id": "auto",
        "fallback": "none"
      }
    }
  }
}
```

Les substitutions par agent utilisent la même forme :

```json
{
  "agents": {
    "defaults": {
      "agentRuntime": {
        "id": "auto",
        "fallback": "pi"
      }
    },
    "list": [
      {
        "id": "codex-only",
        "model": "openai/gpt-5.5",
        "agentRuntime": {
          "id": "codex",
          "fallback": "none"
        }
      }
    ]
  }
}
```

`OPENCLAW_AGENT_RUNTIME` remplace toujours le runtime configuré. Utilisez
`OPENCLAW_AGENT_HARNESS_FALLBACK=none` pour désactiver le repli PI depuis
l'environnement.

```bash
OPENCLAW_AGENT_RUNTIME=codex \
OPENCLAW_AGENT_HARNESS_FALLBACK=none \
openclaw gateway run
```

Avec le repli désactivé, une session échoue tôt lorsque le harnais demandé n'est pas
enregistré, ne prend pas en charge le provider/model résolu, ou échoue avant
de produire les effets secondaires du tour. C'est intentionnel pour les déploiements Codex uniquement
et pour les tests en direct qui doivent prouver que le chemin de l'app-server Codex est réellement utilisé.

Ce paramètre contrôle uniquement le harnais d'agent intégré. Il ne désactive pas
le routage de modèle spécifique au provider pour l'image, la vidéo, la musique, le TTS, le PDF ou d'autres.

## Sessions natives et miroir de transcription

Un harnais peut conserver un identifiant de session natif, un identifiant de thread ou un jeton de reprise côté démon.
Conservez cette liaison explicitement associée à la session OpenClaw, et continuez
de refléter la sortie assistant/tool visible par l'utilisateur dans la transcription OpenClaw.

La transcription OpenClaw reste la couche de compatibilité pour :

- historique des sessions visible par le channel
- recherche et indexation de transcriptions
- revenir au harnais PI intégré lors d'un tour ultérieur
- comportement générique `/new`, `/reset`, et de suppression de session

Si votre harnais stocke une liaison sidecar, implémentez `reset(...)` afin que OpenClaw puisse
l'effacer lorsque la session OpenClaw propriétaire est réinitialisée.

## Résultats de tools et de médias

Le cœur construit la liste de tools OpenClaw et la transmet à la tentative préparée.
Lorsqu'un harnais exécute un appel de tool dynamique, renvoyez le résultat du tool via
la forme de résultat du harnais au lieu d'envoyer vous-même des médias channel.

Cela permet de garder les sorties texte, image, vidéo, musique, TTS, approbation et tool de messagerie
sur le même chemin de livraison que les exécutions soutenues par PI.

## Limitations actuelles

- Le chemin d'importation public est générique, mais certains alias de type tentative/résumé portent toujours
  des noms `Pi` pour des raisons de compatibilité.
- L'installation de harnais tiers est expérimentale. Préférez les plugins provider
  jusqu'à ce que vous ayez besoin d'un environnement d'exécution de session natif.
- Le changement de harnais est pris en charge d'un tour à l'autre. Ne changez pas de harnais au
  milieu d'un tour après le démarrage des outils natifs, des approbations, du texte de l'assistant ou de l'envoi
  de messages.

## Connexes

- [Aperçu du SDK](/fr/plugins/sdk-overview)
- [Assistants d'exécution](/fr/plugins/sdk-runtime)
- [Plugins de provider](/fr/plugins/sdk-provider-plugins)
- [Harnais Codex](/fr/plugins/codex-harness)
- [Providers de modèles](/fr/concepts/model-providers)
