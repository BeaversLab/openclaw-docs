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

N'enregistrez **pas** un harnais simplement pour ajouter une nouvelle LLM API. Pour les API de modèle HTTP ou WebSocket normales, créez un [plugin de fournisseur](/en/plugins/sdk-provider-plugins).

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

Les échecs forcés du harnais de plug-in se manifestent par des échecs d'exécution. En mode `auto`, OpenClaw peut revenir au PI lorsque le harnais de plug-in sélectionné échoue avant qu'un tour n'ait produit d'effets secondaires. Définissez `OPENCLAW_AGENT_HARNESS_FALLBACK=none` ou `embeddedHarness.fallback: "none"` pour faire de ce retour un échec définitif.

Le plug-in Codex inclus enregistre `codex` comme identifiant de son harnais. Le cœur traite cela comme un identifiant de harnais de plug-in ordinaire ; les alias spécifiques à Codex appartiennent à la configuration du plug-in ou de l'opérateur, et non au sélecteur d'exécution partagé.

## Association fournisseur et harnais

La plupart des harnais doivent également enregistrer un fournisseur. Le fournisseur rend les références de modèle, le statut d'authentification, les métadonnées du modèle et la sélection `/model` visibles pour le reste de OpenClaw. Le harnais réclame ensuite ce fournisseur dans `supports(...)`.

Le plug-in Codex inclus suit ce modèle :

- id fournisseur : `codex`
- réf. de modèle utilisateur : `codex/gpt-5.4`, `codex/gpt-5.2`, ou un autre modèle renvoyé par le serveur d'application Codex
- id harnais : `codex`
- auth : disponibilité synthétique du fournisseur, car le harnais Codex possède la connexion/session native Codex
- requête app-server : OpenClaw envoie l'id de modèle brut à Codex et laisse le harnais parler au protocole natif du serveur d'application

Le plug-in Codex est additif. Les références simples `openai/gpt-*` restent des références de fournisseur OpenAI et continuent d'utiliser le chemin normal du fournisseur OpenClaw. Sélectionnez `codex/gpt-*` lorsque vous souhaitez une authentification gérée par Codex, une découverte de modèle Codex, des fils natifs et une exécution par le serveur d'application Codex. `/model` peut basculer parmi les modèles Codex renvoyés par le serveur d'application Codex sans exiger d'identifiants de fournisseur OpenAI.

Pour la configuration de l'opérateur, les exemples de préfixes de modèle et les configurations spécifiques à Codex, consultez [Codex Harness](/en/plugins/codex-harness).

OpenClaw nécessite le serveur d'application Codex `0.118.0` ou plus récent. Le plug-in Codex vérifie la poignée de main d'initialisation du serveur d'application et bloque les serveurs plus anciens ou sans version afin que OpenClaw ne s'exécute que contre la surface de protocole avec laquelle il a été testé.

### Mode de harnais Codex natif

Le harnais `codex` inclus est le mode Codex natif pour les tours d'agent OpenClaw intégrés. Activez d'abord le plugin `codex` inclus, et incluez `codex` dans `plugins.allow` si votre configuration utilise une liste d'autorisation restrictive. Il est différent de `openai-codex/*` :

- `openai-codex/*` utilise ChatGPT/Codex OAuth via le chemin normal du fournisseur OpenClaw.
- `codex/*` utilise le fournisseur Codex inclus et achemine le tour via le serveur d'application Codex.

Lorsque ce mode est exécuté, Codex possède l'identifiant du thread natif, le comportement de reprise, la compaction et l'exécution du serveur d'application. OpenClaw possède toujours le canal de chat, le miroir de transcription visible, la stratégie d'outil, les approbations, la livraison des médias et la sélection de session. Utilisez `embeddedHarness.runtime: "codex"` avec `embeddedHarness.fallback: "none"` lorsque vous devez prouver que le chemin du serveur d'application Codex est utilisé et que le repli PI ne masque pas un harnais natif défectueux.

## Désactiver le repli PI

Par défaut, OpenClaw exécute les agents intégrés avec `agents.defaults.embeddedHarness` défini à `{ runtime: "auto", fallback: "pi" }`. En mode `auto`, les harnais de plugin enregistrés peuvent revendiquer une paire fournisseur/modèle. Si aucun ne correspond, ou si un harnais de plugin sélectionné automatiquement échoue avant de produire une sortie, OpenClaw effectue un repli sur PI.

Définissez `fallback: "none"` lorsque vous devez prouver qu'un harnais de plugin est le seul runtime utilisé. Cela désactive le repli automatique sur PI ; cela ne bloque pas un `runtime: "pi"` ou un `OPENCLAW_AGENT_RUNTIME=pi` explicite.

Pour les exécutions intégrées Codex uniquement :

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

Si vous souhaitez que tout harnais de plugin enregistré revendique les modèles correspondants mais ne voulez jamais que OpenClaw effectue silencieusement un repli sur PI, gardez `runtime: "auto"` et désactivez le repli :

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

Les remplacements par agent utilisent la même forme :

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

`OPENCLAW_AGENT_RUNTIME` remplace toujours le runtime configuré. Utilisez
`OPENCLAW_AGENT_HARNESS_FALLBACK=none` pour désactiver le repli PI depuis
l'environnement.

```bash
OPENCLAW_AGENT_RUNTIME=codex \
OPENCLAW_AGENT_HARNESS_FALLBACK=none \
openclaw gateway run
```

Avec le repli désactivé, une session échoue rapidement lorsque le harness demandé n'est pas
enregistré, ne prend pas en charge le provider/model résolu, ou échoue avant
de produire les effets secondaires du tour. C'est intentionnel pour les déploiements Codex uniquement
et pour les tests en direct qui doivent prouver que le chemin app-server Codex est réellement utilisé.

Ce paramètre contrôle uniquement le harness d'agent intégré. Il ne désactive pas
le routage model spécifique au provider pour l'image, la vidéo, la musique, le TTS, le PDF ou autres.

## Sessions natives et miroir de transcription

Un harness peut conserver un id de session natif, un id de thread, ou un jeton de reprise côté daemon.
Gardez cette liaison explicitement associée à la session OpenClaw, et continuez
de mettre en miroir la sortie assistant/tool visible par l'utilisateur dans la transcription OpenClaw.

La transcription OpenClaw reste la couche de compatibilité pour :

- historique de session visible par le channel
- recherche et indexation de transcription
- retour au harness PI intégré lors d'un tour ultérieur
- comportement générique de `/new`, `/reset` et de suppression de session

Si votre harness stocke une liaison sidecar, implémentez `reset(...)` afin que OpenClaw puisse
la supprimer lorsque la session OpenClaw propriétaire est réinitialisée.

## Résultats de tool et média

Core construit la liste de tools OpenClaw et la transmet à la tentative préparée.
Lorsqu'un harness exécute un appel tool dynamique, renvoyez le résultat du tool via
la forme de résultat du harness au lieu d'envoyer des média channel vous-même.

Cela maintient les sorties de text, image, video, music, TTS, approval, et messaging-tool
sur le même chemin de livraison que les exécutions soutenues par PI.

## Limitations actuelles

- Le chemin d'importation public est générique, mais certains alias de type tentative/réseau portent encore
  des noms `Pi` pour la compatibilité.
- L'installation de harness tiers est expérimentale. Préférez les plugins provider
  jusqu'à ce que vous ayez besoin d'un runtime de session natif.
- Le changement de harness est pris en charge entre les tours. Ne changez pas de harness au
  milieu d'un tour après les tools natifs, les approbations, le texte de l'assistant, ou l'envoi
  de messages ont commencé.

## Connexes

- [Aperçu du SDK](/en/plugins/sdk-overview)
- [Assistants de Runtime](/en/plugins/sdk-runtime)
- [Plugins de fournisseur](/en/plugins/sdk-provider-plugins)
- [Codex Harness](/en/plugins/codex-harness)
- [Fournisseurs de modèles](/en/concepts/model-providers)
