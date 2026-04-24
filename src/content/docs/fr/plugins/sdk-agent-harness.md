---
title: "Plugins de harnais d'agent"
sidebarTitle: "Harnais d'agent"
summary: "Surface de SDK expérimentale pour les plugins qui remplacent l'exécuteur d'agent embarqué de bas niveau"
read_when:
  - You are changing the embedded agent runtime or harness registry
  - You are registering an agent harness from a bundled or trusted plugin
  - You need to understand how the Codex plugin relates to model providers
---

# Plugins de harnais d'agent

Un **harnais d'agent** est l'exécuteur de bas niveau pour un tour d'agent OpenClaw préparé. Ce n'est pas un fournisseur de modèle, pas un canal et pas un registre d'outils.

N'utilisez cette surface que pour les plugins natifs regroupés ou approuvés. Le contrat est toujours expérimental car les types de paramètres reflètent intentionnellement l'exécuteur intégré actuel.

## Quand utiliser un harnais

Enregistrez un harnais d'agent lorsqu'une famille de modèles possède son propre moteur d'exécution de session natif et que le transport de fournisseur normal OpenClaw constitue une mauvaise abstraction.

Exemples :

- un serveur d'agent de codage natif qui possède les threads et la compaction
- un CLI local ou un démon qui doit diffuser des événements natifs de plan/raisonnement/outil
- un moteur de modèle qui a besoin de son propre identifiant de reprise en plus de la transcription de session OpenClaw

N'enregistrez **pas** un harnais simplement pour ajouter une nouvelle LLM API. Pour les API de modèle HTTP ou
WebSocket normales, créez un [provider plugin](/fr/plugins/sdk-provider-plugins).

## Ce que le cœur possède toujours

Avant qu'un harnais soit sélectionné, OpenClaw a déjà résolu :

- le fournisseur et le modèle
- l'état d'authentification au moment de l'exécution
- le niveau de réflexion et le budget de contexte
- le fichier de transcription/session OpenClaw
- l'espace de travail, le bac à sable et la stratégie d'outils
- les rappels de réponse de canal et les rappels de diffusion en continu
- la politique de basculement de modèle et de basculement en direct de modèle

Cette division est intentionnelle. Un harnais exécute une tentative préparée ; il ne choisit pas les fournisseurs, ne remplace pas la livraison par canal et ne bascule pas silencieusement les modèles.

## Enregistrer un harnais

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

OpenClaw choisit un harnais après la résolution du fournisseur/modèle :

1. `OPENCLAW_AGENT_RUNTIME=<id>` force un harnais enregistré avec cet identifiant.
2. `OPENCLAW_AGENT_RUNTIME=pi` force le harnais PI intégré.
3. `OPENCLAW_AGENT_RUNTIME=auto` demande aux harnais enregistrés s'ils prennent en charge le fournisseur/modèle résolu.
4. Si aucun harnais enregistré ne correspond, OpenClaw utilise PI sauf si la bascule vers PI est désactivée.

Les échecs de harnais de plugin se manifestent par des échecs d'exécution. En mode `auto`, le repli PI n'est
utilisé que lorsqu'aucun harnais de plugin enregistré ne prend en charge le provider/model
résolu. Une fois qu'un harnais de plugin a revendiqué une exécution, OpenClaw ne rejoue
pas ce même tour via PI, car cela peut modifier la sémantique d'auth/runtime
ou dupliquer les effets secondaires.

Le plugin Codex groupé enregistre `codex` comme identifiant de son harnais. Le Core le traite
comme un identifiant de harnais de plugin ordinaire ; les alias spécifiques à Codex appartiennent au plugin
ou à la configuration de l'opérateur, et non au sélecteur d'exécution partagé.

## Association fournisseur et harnais

La plupart des harnais doivent également enregistrer un provider. Le provider rend les références de modèle,
le statut d'auth, les métadonnées du modèle et la sélection `/model` visibles par le reste
de OpenClaw. Le harnais revendique ensuite ce provider dans `supports(...)`.

Le plug-in Codex inclus suit ce modèle :

- id du provider : `codex`
- références de modèle utilisateur : `codex/gpt-5.4`, `codex/gpt-5.2`, ou un autre modèle renvoyé
  par le serveur d'application Codex
- id du harnais : `codex`
- auth : disponibilité synthétique du fournisseur, car le harnais Codex possède la connexion/session native Codex
- requête app-server : OpenClaw envoie l'id de modèle brut à Codex et laisse le harnais parler au protocole natif du serveur d'application

Le plugin Codex est additif. Les références `openai/gpt-*` simples restent des références
provider OpenAI et continuent d'utiliser le chemin provider OpenClaw normal. Sélectionnez `codex/gpt-*`
lorsque vous souhaitez une auth gérée par Codex, la découverte de modèles Codex, les threads natifs et
l'exécution par le serveur d'application Codex. `/model` peut basculer entre les modèles Codex renvoyés
par le serveur d'application Codex sans nécessiter d'identifiants provider OpenAI.

Pour la configuration de l'opérateur, les exemples de préfixes de modèle et les configurations Codex exclusives, consultez
[Codex Harness](/fr/plugins/codex-harness).

OpenClaw nécessite le serveur d'application Codex `0.118.0` ou plus récent. Le plugin Codex vérifie
la poignée de main d'initialisation du serveur d'application et bloque les serveurs plus anciens ou sans version afin que
OpenClaw ne s'exécute que contre la surface de protocole avec laquelle il a été testé.

### Middleware de résultat d'outil du serveur d'application Codex

Les plugins groupés peuvent également attacher un middleware spécifique au serveur d'application Codex `tool_result`
via `api.registerCodexAppServerExtensionFactory(...)` lorsque leur
manifeste déclare `contracts.embeddedExtensionFactories: ["codex-app-server"]`.
C'est la jointure de plugin de confiance pour les transformations asynchrones des résultats d'outils qui doivent
s'exécuter dans le harnais Codex natif avant que la sortie de l'outil ne soit projetée en retour
dans la transcription OpenClaw.

### Mode de harnais Codex natif

Le harnais `codex` groupé est le mode Codex natif pour les tours d'agent OpenClaw
embarqués. Activez d'abord le plugin `codex` groupé, et incluez `codex` dans
`plugins.allow` si votre configuration utilise une liste d'autorisation restrictive. Il est différent
de `openai-codex/*` :

- `openai-codex/*` utilise ChatGPT/Codex OAuth via le chemin normal du fournisseur OpenClaw.
- `codex/*` utilise le fournisseur Codex groupé et achemine le tour via le serveur
  d'application Codex.

Lorsque ce mode s'exécute, Codex possède l'identifiant du fil natif, le comportement de reprise,
la compactage et l'exécution du serveur d'application. OpenClaw possède toujours le canal de discussion,
le miroir de transcription visible, la politique d'outil, les approbations, la livraison des médias et la sélection
de session. Utilisez `embeddedHarness.runtime: "codex"` avec
`embeddedHarness.fallback: "none"` lorsque vous devez prouver que seul le chemin
du serveur d'application Codex peut revendiquer l'exécution. Cette configuration n'est qu'une garde de sélection :
les échecs du serveur d'application Codex échouent déjà directement au lieu de réessayer via PI.

## Désactiver le repli PI

Par défaut, OpenClaw exécute les agents embarqués avec `agents.defaults.embeddedHarness`
défini à `{ runtime: "auto", fallback: "pi" }`. En mode `auto`, les harnais de plugins
enregistrés peuvent revendiquer une paire fournisseur/modèle. Si aucun ne correspond, OpenClaw revient par défaut
à PI.

Définissez `fallback: "none"` lorsque vous souhaitez que l'échec de la sélection du harnais de plugin entraîne un échec
au lieu d'utiliser PI. Les échecs des harnais de plugin sélectionnés échouent déjà brutalement. Cela
ne bloque pas un `runtime: "pi"` ou un `OPENCLAW_AGENT_RUNTIME=pi` explicite.

Pour les exécutions embarquées Codex uniquement :

```json
{
  "agents": {
    "defaults": {
      "model": "codex/gpt-5.4",
      "embeddedHarness": {
        "runtime": "codex",
        "fallback": "none"
      }
    }
  }
}
```

Si vous souhaitez que n'importe quel harnais de plugin enregistré revendique les modèles correspondants mais ne voulez
jamais que OpenClaw revienne silencieusement à PI, gardez `runtime: "auto"` et désactivez
le repli :

```json
{
  "agents": {
    "defaults": {
      "embeddedHarness": {
        "runtime": "auto",
        "fallback": "none"
      }
    }
  }
}
```

Les remplacements par agent utilisent la même structure :

```json
{
  "agents": {
    "defaults": {
      "embeddedHarness": {
        "runtime": "auto",
        "fallback": "pi"
      }
    },
    "list": [
      {
        "id": "codex-only",
        "model": "codex/gpt-5.4",
        "embeddedHarness": {
          "runtime": "codex",
          "fallback": "none"
        }
      }
    ]
  }
}
```

`OPENCLAW_AGENT_RUNTIME` remplace toujours le runtime configuré. Utilisez `OPENCLAW_AGENT_HARNESS_FALLBACK=none` pour désactiver le repli PI depuis l'environnement.

```bash
OPENCLAW_AGENT_RUNTIME=codex \
OPENCLAW_AGENT_HARNESS_FALLBACK=none \
openclaw gateway run
```

Avec le repli désactivé, une session échoue tôt lorsque le harness demandé n'est pas enregistré, ne prend pas en charge le provider/model résolu, ou échoue avant de produire les effets secondaires du tour. C'est intentionnel pour les déploiements Codex uniquement et pour les tests en direct qui doivent prouver que le chemin du app-server Codex est réellement utilisé.

Ce paramètre contrôle uniquement le harness d'agent intégré. Il ne désactive pas le routage de modèle spécifique au provider pour l'image, la vidéo, la musique, le TTS, le PDF ou autres.

## Sessions natives et miroir de transcription

Un harness peut conserver un id de session natif, un id de thread, ou un jeton de reprise côté démon. Gardez cette liaison explicitement associée à la session OpenClaw, et continuez à refléter la sortie assistant/tool visible par l'utilisateur dans la transcription OpenClaw.

La transcription OpenClaw reste la couche de compatibilité pour :

- historique de session visible par le channel
- recherche et indexation de transcription
- retour au harness PI intégré lors d'un tour ultérieur
- comportement générique de `/new`, `/reset`, et de suppression de session

Si votre harness stocke une liaison sidecar, implémentez `reset(...)` afin que OpenClaw puisse la supprimer lorsque la session OpenClaw propriétaire est réinitialisée.

## Résultats de tool et de média

Core construit la liste de tools OpenClaw et la passe dans la tentative préparée. Lorsqu'un harness exécute un appel de tool dynamique, renvoyez le résultat du tool via la structure de résultat du harness au lieu d'envoyer les médias du channel vous-même.

Cela maintient les sorties texte, image, vidéo, musique, TTS, approbation et tool de messagerie sur le même chemin de livraison que les exécutions soutenues par PI.

## Limitations actuelles

- Le chemin d'import public est générique, mais certains alias de type tentative/résultat portent encore des noms `Pi` pour la compatibilité.
- L'installation de harness tiers est expérimentale. Préférez les plugins de provider jusqu'à ce que vous ayez besoin d'un runtime de session natif.
- Le changement de harness est pris en charge entre les tours. Ne changez pas de harness au milieu d'un tour après que les outils natifs, les approbations, le texte de l'assistant ou les envois de messages ont commencé.

## Connexes

- [Aperçu du SDK](/fr/plugins/sdk-overview)
- [Assistants d'exécution](/fr/plugins/sdk-runtime)
- [Plugins de fournisseur](/fr/plugins/sdk-provider-plugins)
- [Codex Harness](/fr/plugins/codex-harness)
- [Fournisseurs de modèles](/fr/concepts/model-providers)
