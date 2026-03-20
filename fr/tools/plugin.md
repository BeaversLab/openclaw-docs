---
summary: "Plugins/extensions OpenClaw : découverte, configuration et sécurité"
read_when:
  - Ajout ou modification de plugins/extensions
  - Documentation des règles d'installation ou de chargement des plugins
  - Travailler avec des bundles de plugins compatibles Codex/Claude
title: "Plugins"
---

# Plugins (Extensions)

## Quick start (nouveau sur les plugins ?)

Un plugin est soit :

- un plugin **natif OpenClaw** (`openclaw.plugin.json` + module d'exécution), ou
- un **bundle** compatible (`.codex-plugin/plugin.json` ou `.claude-plugin/plugin.json`)

Les deux apparaissent sous `openclaw plugins`, mais seuls les plugins natifs OpenClaw exécutent
du code d'exécution en processus.

La plupart du temps, vous utiliserez des plugins lorsque vous voudrez une fonctionnalité qui n'est pas encore intégrée
dans le OpenClaw de base (ou si vous souhaitez garder les fonctionnalités optionnelles hors de votre installation
principale).

Accès rapide :

1. Voir ce qui est déjà chargé :

```bash
openclaw plugins list
```

2. Installer un plugin officiel (exemple : Voice Call) :

```bash
openclaw plugins install @openclaw/voice-call
```

Les spécifications Npm sont limitées au registre. Voir [règles d'installation](/fr/cli/plugins#install) pour
des détails sur l'épinglage, la limitation des préversions et les formats de spécification pris en charge.

3. Redémarrez le Gateway, puis configurez sous `plugins.entries.<id>.config`.

Voir [Voice Call](/fr/plugins/voice-call) pour un exemple concret de plugin.
Vous cherchez des listings tiers ? Voir [Plugins communautaires](/fr/plugins/community).
Vous avez besoin des détails de compatibilité des bundles ? Voir [Bundles de plugins](/fr/plugins/bundles).

Pour les bundles compatibles, installez à partir d'un répertoire local ou d'une archive :

```bash
openclaw plugins install ./my-bundle
openclaw plugins install ./my-bundle.tgz
```

Pour les installations depuis le marketplace Claude, listez d'abord le marketplace, puis installez par
le nom de l'entrée du marketplace :

```bash
openclaw plugins marketplace list <marketplace-name>
openclaw plugins install <plugin-name>@<marketplace-name>
```

OpenClaw résout les noms connus du marketplace Claude à partir de
`~/.claude/plugins/known_marketplaces.json`. Vous pouvez également passer une source
explicite de marketplace avec `--marketplace`.

## Callbacks de liaison de conversation

Les plugins qui lient une conversation peuvent désormais réagir lorsqu'une approbation est résolue.

Utilisez `api.onConversationBindingResolved(...)` pour recevoir un callback après qu'une requête de liaison
soit approuvée ou refusée :

```ts
export default {
  id: "my-plugin",
  register(api) {
    api.onConversationBindingResolved(async (event) => {
      if (event.status === "approved") {
        // A binding now exists for this plugin + conversation.
        console.log(event.binding?.conversationId);
        return;
      }

      // The request was denied; clear any local pending state.
      console.log(event.request.conversation.conversationId);
    });
  },
};
```

Champs de payload du callback :

- `status` : `"approved"` ou `"denied"`
- `decision` : `"allow-once"`, `"allow-always"`, ou `"deny"`
- `binding` : la liaison résolue pour les demandes approuvées
- `request` : le résumé de la demande d'origine, l'indice de détachement, l'identifiant de l'expéditeur et
  les métadonnées de la conversation

Ce rappel est une simple notification. Il ne modifie pas qui est autorisé à lier une
conversation et s'exécute après la fin du traitement de l'approbation principale.

## Modèle de capacité publique

Les capacités constituent le **modèle de plugin natif** public au sein de OpenClaw. Chaque
plugin natif OpenClaw s'enregistre auprès d'un ou plusieurs types de capacités :

| Capacité          | Méthode d'enregistrement                           | Plugins d'exemple           |
| ------------------- | --------------------------------------------- | ------------------------- |
| Inférence de texte      | `api.registerProvider(...)`                   | `openai`, `anthropic`     |
| Synthèse vocale              | `api.registerSpeechProvider(...)`             | `elevenlabs`, `microsoft` |
| Compréhension des médias | `api.registerMediaUnderstandingProvider(...)` | `openai`, `google`        |
| Génération d'images    | `api.registerImageGenerationProvider(...)`    | `openai`, `google`        |
| Recherche Web          | `api.registerWebSearchProvider(...)`          | `google`                  |
| Canal / messagerie | `api.registerChannel(...)`                    | `msteams`, `matrix`       |

Un plugin qui n'enregistre aucune capacité mais fournit des hooks, des outils ou
des services est un plugin **basé uniquement sur les hooks hérités**. Ce modèle reste entièrement pris en charge.

### Position sur la compatibilité externe

Le modèle de capacité est intégré au cœur du système et utilisé aujourd'hui par les plugins groupés/natifs,
mais la compatibilité des plugins externes nécessite encore une barre plus stricte que « il est
exporté, donc il est figé ».

Recommandations actuelles :

- **plugins externes existants :** maintenir le fonctionnement des intégrations basées sur des hooks ; traiter
  ceci comme la base de compatibilité
- **nouveaux plugins groupés/natifs :** préférer l'enregistrement explicite des capacités plutôt
  que les accès internes spécifiques aux fournisseurs ou les nouveaux conceptions basées uniquement sur les hooks
- **plugins externes adoptant l'enregistrement des capacités :** autorisé, mais considérer les
  surfaces d'assistance spécifiques aux capacités comme évolutives, sauf si la documentation marque explicitement un
  contrat comme stable

Règle pratique :

- les API d'enregistrement des capacités constituent la direction prévue
- les hooks hérités restent le chemin le plus sûr sans rupture pour les plugins externes pendant
  la transition
- les sous-chemins d'assistance exportés ne sont pas tous égaux ; privilégiez le contrat documenté étroit, et non les exportations d'assistance incidentes

### Formes de plugin

OpenClaw classifie chaque plugin chargé dans une forme en fonction de son comportement d'enregistrement réel (et pas seulement des métadonnées statiques) :

- **plain-capability** — enregistre exactement un type de capacité (par exemple un plugin provider-only comme `mistral`)
- **hybrid-capability** — enregistre plusieurs types de capacités (par exemple `openai` possède l'inférence de texte, la parole, la compréhension des médias et la génération d'images)
- **hook-only** — enregistre uniquement des hooks (typés ou personnalisés), aucune capacité, outil, commande ou service
- **non-capability** — enregistre des outils, commandes, services ou routes mais aucune capacité

Utilisez `openclaw plugins inspect <id>` pour voir la forme d'un plugin et la répartition de ses capacités. Consultez la [référence CLI](/fr/cli/plugins#inspect) pour plus de détails.

### Hooks hérités

Le hook `before_agent_start` reste pris en charge en tant que chemin de compatibilité pour les plugins hook-only. Les plugins réels hérités en dépendent toujours.

Direction :

- le maintenir fonctionnel
- le documenter comme hérité
- privilégier `before_model_resolve` pour le travail de substitution de model/provider
- privilégier `before_prompt_build` pour le travail de mutation de prompt
- supprimer uniquement après la baisse de l'utilisation réelle et que la couverture des fixtures prouve la sécurité de la migration

### Signaux de compatibilité

Lorsque vous exécutez `openclaw doctor` ou `openclaw plugins inspect <id>`, vous pouvez voir l'une de ces étiquettes :

| Signal                     | Signification                                                      |
| -------------------------- | ------------------------------------------------------------ |
| **config valid**           | La configuration s'analyse correctement et les plugins sont résolus                       |
| **compatibility advisory** | Le plugin utilise un modèle pris en charge mais ancien (par ex. `hook-only`) |
| **legacy warning**         | Le plugin utilise `before_agent_start`, qui est obsolète        |
| **hard error**             | La configuration n'est pas valide ou le plugin n'a pas pu être chargé                   |

Ni `hook-only` ni `before_agent_start` ne cassera votre plugin aujourd'hui — `hook-only` est consultatif, et `before_agent_start` ne déclenche qu'un avertissement. Ces signaux apparaissent également dans `openclaw status --all` et `openclaw plugins doctor`.

## Architecture

Le système de plugins de OpenClaw comporte quatre couches :

1. **Manifeste + découverte**
   OpenClaw trouve les plugins candidats à partir des chemins configurés, des racines de l'espace de travail,
   des racines d'extensions globales et des extensions groupées. La découverte lit les manifestes natifs
   `openclaw.plugin.json` ainsi que les manifestes de bundle pris en charge en premier.
2. **Activation + validation**
   Le noyau décide si un plugin découvert est activé, désactivé, bloqué ou
   sélectionné pour un emplacement exclusif tel que la mémoire.
3. **Chargement à l'exécution**
   Les plugins natifs OpenClaw sont chargés en processus via jiti et enregistrent
   les capacités dans un registre central. Les bundles compatibles sont normalisés en
   enregistrements de registre sans importer de code d'exécution.
4. **Consommation de surface**
   Le reste de OpenClaw lit le registre pour exposer les outils, les channels, la configuration du provider,
   les hooks, les routes HTTP, les commandes CLI et les services.

La limite de conception importante :

- la découverte + validation de la configuration doit fonctionner à partir des **métadonnées de manifeste/schéma**
  sans exécuter le code du plugin
- le comportement d'exécution natif provient du chemin `register(api)` du module du plugin

Cette division permet à OpenClaw de valider la configuration, d'expliquer les plugins manquants/désactivés et de
   générer des indices d'interface utilisateur/schéma avant que l'exécution complète ne soit active.

### Plugins de channel et l'outil de message partagé

Les plugins de channel n'ont pas besoin d'enregistrer un outil d'envoi/modification/réaction séparé pour
   les actions de chat normales. OpenClaw conserve un outil partagé `message` dans le noyau, et
   les plugins de channel possèdent la découverte et l'exécution spécifiques au channel derrière celui-ci.

La limite actuelle est :

- le noyau possède l'hôte de l'outil partagé `message`, le câblage des invites, la gestion de session/fil
   et la répartition de l'exécution
- les plugins de channel possèdent la découverte d'action délimitée, la découverte de capacités et tous
   fragments de schéma spécifiques au channel
- les plugins de channel exécutent l'action finale via leur adaptateur d'action

Pour les plugins de channel, la surface du SDK est
`ChannelMessageActionAdapter.describeMessageTool(...)`. Cet appel de découverte unifié
permet à un plugin de renvoyer ses actions visibles, ses capacités et ses contributions de schéma
ensemble pour que ces éléments ne se dispersent pas.

Le noyau transmet la portée d'exécution à cette étape de découverte. Les champs importants incluent :

- `accountId`
- `currentChannelId`
- `currentThreadTs`
- `currentMessageId`
- `sessionKey`
- `sessionId`
- `agentId`
- `requesterSenderId` entrant de confiance

C'est important pour les plugins sensibles au contexte. Un channel peut masquer ou exposer
les actions de message en fonction du compte actif, de la salle/fil/message actuel ou de
l'identité du demandeur de confiance sans coder en dur les branches spécifiques au channel dans
l'outil central `message`.

C'est pourquoi les modifications de routage de l'exécuteur intégré sont toujours un travail de plugin : l'exécuteur est
responsable de transmettre l'identité de la conversation/session actuelle dans la limite de découverte du plugin
afin que l'outil partagé `message` expose la surface appropriée détenue par le channel
pour le tour actuel.

Pour les assistants d'exécution détenus par le channel, les plugins groupés doivent conserver l'environnement
d'exécution à l'intérieur de leurs propres modules d'extension. Le cœur ne possède plus les environnements d'exécution des actions de message Discord,
Slack, Telegram ou WhatsApp sous `src/agents/tools`.
Nous ne publions pas de sous-chemins `plugin-sdk/*-action-runtime` distincts, et les plugins
groupés doivent importer leur propre code d'exécution local directement à partir de leurs
modules détenus par l'extension.

Pour les sondages spécifiquement, il existe deux chemins d'exécution :

- `outbound.sendPoll` est la base partagée pour les channels qui correspondent au modèle
  de sondage commun
- `actions.handleAction("poll")` est le chemin privilégié pour la sémantique de sondage
  spécifique au channel ou pour les paramètres de sondage supplémentaires

Le cœur diffère désormais l'analyse des sondages partagés jusqu'à ce que la répartition des sondages du plugin
refuse l'action, afin que les gestionnaires de sondages détenus par le plugin puissent accepter les champs de sondage
spécifiques au channel sans être bloqués par l'analyseur de sondage générique.

Voir [Pipeline de chargement](#load-pipeline) pour la séquence complète de démarrage.

## Modèle de propriété des capacités

OpenClaw considère un plugin natif comme la limite de propriété pour une **entreprise** ou une
**fonctionnalité**, et non comme un fourre-tout d'intégrations sans rapport.

Cela signifie :

- un plugin d'entreprise devrait généralement posséder toutes les surfaces orientées OpenClaw
  de cette entreprise
- un plugin de fonctionnalité devrait généralement posséder la surface complète de la fonctionnalité qu'il introduit
- les channels devraient consommer les capacités centrales partagées au lieu de réimplémenter
  le comportement du provider ad hoc

Exemples :

- le plugin intégré `openai` possède le comportement du fournisseur de modèle OpenAI et le comportement de OpenAI
  pour la parole + la compréhension des médias + la génération d'images
- le plugin intégré `elevenlabs` possède le comportement de parole ElevenLabs
- le plugin intégré `microsoft` possède le comportement de parole Microsoft
- le plugin intégré `google` possède le comportement du fournisseur de modèle Google ainsi que le comportement
  de compréhension des médias + génération d'images + recherche web de Google
- les plugins intégrés `minimax`, `mistral`, `moonshot` et `zai` possèdent leurs
  moteurs de compréhension des médias
- le plugin `voice-call` est un plugin de fonctionnalité : il possède le transport des appels, les outils,
  la CLI, les routes et le runtime, mais il consomme la capacité TTS/STT principale au lieu
  d'inventer une seconde pile de parole

L'état final prévu est :

- OpenAI réside dans un seul plugin même s'il couvre les modèles textuels, la parole, les images et
  les futures vidéos
- un autre fournisseur peut faire de même pour sa propre surface
- les channels se soucient peu de quel plugin fournisseur possède le fournisseur ; ils consomment le
  contrat de capacité partagée exposé par le cœur

Voici la distinction clé :

- **plugin** = limite de propriété
- **capacité** = contrat central que plusieurs plugins peuvent implémenter ou consommer

Ainsi, si OpenClaw ajoute un nouveau domaine tel que la vidéo, la première question n'est pas
« quel fournisseur doit coder en dur le traitement de la vidéo ? ». La première question est « quel est
le contrat de capacité vidéo centrale ? ». Une fois ce contrat existant, les plugins fournisseurs
peuvent s'y enregistrer et les plugins channel/fonctionnalité peuvent le consommer.

Si la capacité n'existe pas encore, la bonne démarche est généralement :

1. définir la capacité manquante dans le cœur
2. l'exposer via le API de plugin/runtime de manière typée
3. connecter les channels/fonctionnalités à cette capacité
4. laisser les plugins fournisseurs enregistrer leurs implémentations

Cela garde la propriété explicite tout en évitant un comportement central dépendant d'un
seul fournisseur ou d'un chemin de code spécifique à un plugin ponctuel.

### Superposition des capacités

Utilisez ce modèle mental pour décider où le code doit se trouver :

- **couche de capacité centrale** : orchestration partagée, stratégie, repli, règles de
  fusion de configuration, sémantique de livraison et contrats typés
- **vendor plugin layer** : API spécifiques aux fournisseurs, auth, catalogues de modèles, synthèse vocale, génération d'images, backends vidéo futurs, points de terminaison d'utilisation
- **channel/feature plugin layer** : intégration Slack/Discord/appels vocaux/etc. qui consomme les capacités principales et les présente sur une surface

Par exemple, le TTS suit cette forme :

- le cœur possède la stratégie TTS au moment de la réponse, l'ordre de repli, les préférences et la livraison via le canal
- `openai`, `elevenlabs` et `microsoft` possèdent les implémentations de synthèse
- `voice-call` consomme l'assistant d'exécution TTS téléphonique

Ce même modèle doit être privilégié pour les capacités futures.

### Exemple de plugin d'entreprise multi-capacités

Un plugin d'entreprise doit paraître cohérent de l'extérieur. Si OpenClaw dispose de contrats partagés pour les modèles, la parole, la compréhension des médias et la recherche Web, un fournisseur peut posséder toutes ses surfaces en un seul endroit :

```ts
import type { OpenClawPluginDefinition } from "openclaw/plugin-sdk";
import {
  buildOpenAISpeechProvider,
  createPluginBackedWebSearchProvider,
  describeImageWithModel,
  transcribeOpenAiCompatibleAudio,
} from "openclaw/plugin-sdk";

const plugin: OpenClawPluginDefinition = {
  id: "exampleai",
  name: "ExampleAI",
  register(api) {
    api.registerProvider({
      id: "exampleai",
      // auth/model catalog/runtime hooks
    });

    api.registerSpeechProvider(
      buildOpenAISpeechProvider({
        id: "exampleai",
        // vendor speech config
      }),
    );

    api.registerMediaUnderstandingProvider({
      id: "exampleai",
      capabilities: ["image", "audio", "video"],
      async describeImage(req) {
        return describeImageWithModel({
          provider: "exampleai",
          model: req.model,
          input: req.input,
        });
      },
      async transcribeAudio(req) {
        return transcribeOpenAiCompatibleAudio({
          provider: "exampleai",
          model: req.model,
          input: req.input,
        });
      },
    });

    api.registerWebSearchProvider(
      createPluginBackedWebSearchProvider({
        id: "exampleai-search",
        // credential + fetch logic
      }),
    );
  },
};

export default plugin;
```

Ce qui compte, ce n'est pas les noms exacts des assistants. La forme compte :

- un plugin possède la surface du fournisseur
- le cœur possède toujours les contrats de capacité
- les canaux et les plugins de fonctionnalités consomment les assistants `api.runtime.*`, et non le code du fournisseur
- les tests de contrat peuvent affirmer que le plugin a enregistré les capacités qu'il
  prétend posséder

### Exemple de capacité : compréhension vidéo

OpenClaw traite déjà la compréhension image/audio/vidéo comme une capacité partagée unique. Le même modèle de propriété s'y applique :

1. le cœur définit le contrat de compréhension des médias
2. les plugins fournisseurs enregistrent `describeImage`, `transcribeAudio` et
   `describeVideo` selon le cas
3. les canaux et les plugins de fonctionnalités consomment le comportement central partagé au lieu
   de se connecter directement au code du fournisseur

Cela évite d'intégrer les hypothèses vidéo d'un seul fournisseur dans le cœur. Le plugin possède la surface du fournisseur ; le cœur possède le contrat de capacité et le comportement de repli.

Si OpenClaw ajoute un nouveau domaine plus tard, tel que la génération vidéo, utilisez la même séquence à nouveau : définissez d'abord la capacité centrale, puis laissez les plugins fournisseurs enregistrer les implémentations correspondantes.

Besoin d'une liste de contrôle de déploiement concrète ? Consultez
[Capability Cookbook](/fr/tools/capability-cookbook).

## Bundles compatibles

OpenClaw reconnaît également deux structures de bundles externes compatibles :

- Bundles style Codex : `.codex-plugin/plugin.json`
- Bundles style Claude : `.claude-plugin/plugin.json` ou la disposition des composants Claude par défaut sans manifeste
- Bundles style Cursor : `.cursor-plugin/plugin.json`

Les entrées du marketplace Claude peuvent pointer vers l'un de ces bundles compatibles, ou vers des sources de plugins natives OpenClaw. OpenClaw résout d'abord l'entrée du marketplace, puis exécute le chemin d'installation normal pour la source résolue.

Ils sont affichés dans la liste des plugins comme `format=bundle`, avec un sous-type de `codex`, `claude`, ou `cursor` dans la sortie verbose/inspect.

Voir [Plugin bundles](/fr/plugins/bundles) pour les règles de détection exactes, le comportement de mappage et la matrice de support actuelle.

Aujourd'hui, OpenClaw considère ceux-ci comme des **capability packs** (packs de capacités), et non comme des plugins d'exécution natifs :

- pris en charge maintenant : `skills` groupés
- pris en charge maintenant : racines markdown Claude `commands/`, mappées dans le chargeur de compétences normal OpenClaw
- pris en charge maintenant : valeurs par défaut `settings.json` du bundle Claude pour les paramètres de l'agent Pi embarqué (avec les clés de substitution de shell assainies)
- pris en charge maintenant : configuration MCP du bundle, fusionnée dans les paramètres de l'agent Pi embarqué en tant que `mcpServers`, avec les outils MCP de bundle stdio pris en charge exposés lors des tours de l'agent Pi embarqué
- pris en charge maintenant : racines Cursor `.cursor/commands/*.md`, mappées dans le chargeur de compétences normal OpenClaw
- pris en charge maintenant : répertoires de hooks de bundle Codex qui utilisent la disposition hook-pack OpenClaw (`HOOK.md` + `handler.ts`/`handler.js`)
- détecté mais pas encore câblé : autres capacités de bundle déclarées telles que les agents, l'automatisation des hooks Claude, les métadonnées de règles/hooks Cursor, les métadonnées app/LSP, les styles de sortie

Cela signifie que l'installation, la découverte, la liste, les informations et l'activation des bundles fonctionnent toutes, et que les compétences de bundle, les compétences de commande Claude, les valeurs par défaut des paramètres de bundle Claude et les répertoires de hooks Codex compatibles se chargent lorsque le bundle est activé. Les serveurs MCP de bundle pris en charge peuvent également s'exécuter en tant que sous-processus pour les appels d'outil Pi embarqués lorsqu'ils utilisent un transport stdio pris en charge, mais les modules d'exécution de bundle ne sont pas chargés dans le processus.

La prise en charge des hooks de bundle est limitée au format normal du répertoire de hooks OpenClaw
(`HOOK.md` plus `handler.ts`/`handler.js` sous les racines de hooks déclarées).
Les runtimes de hooks shell/JSON spécifiques aux fournisseurs, y compris Claude `hooks.json`, sont
seulement détectés aujourd'hui et ne sont pas exécutés directement.

## Modèle d'exécution

Les plugins natifs OpenClaw s'exécutent **en cours de processus** avec le Gateway. Ils ne sont pas
sandboxed. Un plugin natif chargé a la même limite de confiance au niveau du processus que
le code core.

Implications :

- un plugin natif peut enregistrer des outils, des gestionnaires réseau, des hooks et des services
- un bogue de plugin natif peut planter ou déstabiliser la passerelle
- un plugin natif malveillant équivaut à une exécution de code arbitraire à l'intérieur
  du processus OpenClaw

Les bundles compatibles sont plus sûrs par défaut car OpenClaw les traite actuellement
comme des packs de métadonnées/contenu. Dans les versions actuelles, cela signifie principalement des compétences (skills) groupées.

Utilisez des listes d'autorisation et des chemins d'installation/chargement explicites pour les plugins non groupés. Traitez
les plugins de l'espace de travail comme du code de temps de développement, et non des valeurs par défaut de production.

Note importante sur la confiance :

- `plugins.allow` fait confiance aux **ids de plugin**, et non à la provenance de la source.
- Un plugin de l'espace de travail avec le même id qu'un plugin groupé masque intentionnellement
  la copie groupée lorsque ce plugin de l'espace de travail est activé/autorisé.
- Ceci est normal et utile pour le développement local, les tests de correctifs et les correctifs urgents (hotfixes).

## Plugins disponibles (officiels)

- Microsoft Teams est exclusivement disponible sous forme de plugin depuis le 15/01/2026 ; installez `@openclaw/msteams` si vous utilisez Teams.
- Mémoire (Core) — plugin de recherche de mémoire groupé (activé par défaut via `plugins.slots.memory`)
- Mémoire (LanceDB) — plugin de mémoire à long terme groupé (rappel/capture automatique ; définir `plugins.slots.memory = "memory-lancedb"`)
- [Voice Call](/fr/plugins/voice-call) — `@openclaw/voice-call`
- [Zalo Personal](/fr/plugins/zalouser) — `@openclaw/zalouser`
- [Matrix](/fr/channels/matrix) — `@openclaw/matrix`
- [Nostr](/fr/channels/nostr) — `@openclaw/nostr`
- [Zalo](/fr/channels/zalo) — `@openclaw/zalo`
- [Microsoft Teams](/fr/channels/msteams) — `@openclaw/msteams`
- Runtime du provider Anthropic — groupé sous `anthropic` (activé par défaut)
- Catalogue de provider BytePlus — groupé sous `byteplus` (activé par défaut)
- Catalogue de provider Cloudflare AI Gateway — groupé sous `cloudflare-ai-gateway` (activé par défaut)
- Recherche web Google + OAuth CLI Gemini — groupé sous `google` (la recherche web le charge automatiquement ; l'auth du provider reste optionnel)
- Runtime du provider GitHub Copilot — groupé sous `github-copilot` (activé par défaut)
- Catalogue de provider Hugging Face — groupé sous `huggingface` (activé par défaut)
- Runtime du provider Kilo Gateway — groupé sous `kilocode` (activé par défaut)
- Catalogue de provider Kimi Coding — groupé sous `kimi-coding` (activé par défaut)
- Catalogue de provider MiniMax + utilisation + OAuth — groupé sous `minimax` (activé par défaut ; possède `minimax` et `minimax-portal`)
- Capacités du provider Mistral — groupées sous `mistral` (activé par défaut)
- Catalogue de provider Model Studio — groupé sous `modelstudio` (activé par défaut)
- Runtime du provider Moonshot — groupé sous `moonshot` (activé par défaut)
- Catalogue de provider NVIDIA — groupé sous `nvidia` (activé par défaut)
- Provider de parole ElevenLabs — groupé sous `elevenlabs` (activé par défaut)
- Provider de parole Microsoft — groupé sous `microsoft` (activé par défaut ; l'entrée `edge` héritée est mappée ici)
- Runtime du provider OpenAI — groupé sous `openai` (activé par défaut ; possède à la fois `openai` et `openai-codex`)
- Capacités du provider OpenCode Go — groupées sous `opencode-go` (activé par défaut)
- Capacités du provider OpenCode Zen — groupées sous `opencode` (activé par défaut)
- Runtime du provider OpenRouter — groupé sous `openrouter` (activé par défaut)
- Catalogue de fournisseurs Qianfan — regroupé en tant que `qianfan` (activé par défaut)
- Qwen OAuth (auth fournisseur + catalogue) — regroupé en tant que `qwen-portal-auth` (activé par défaut)
- Catalogue de fournisseurs synthétique — regroupé en tant que `synthetic` (activé par défaut)
- Catalogue de fournisseurs Together — regroupé en tant que `together` (activé par défaut)
- Catalogue de fournisseurs Venice — regroupé en tant que `venice` (activé par défaut)
- Catalogue de fournisseurs Vercel IA Gateway — regroupé en tant que `vercel-ai-gateway` (activé par défaut)
- Catalogue de fournisseurs Volcengine — regroupé en tant que `volcengine` (activé par défaut)
- Catalogue de fournisseurs + usage Xiaomi — regroupé en tant que `xiaomi` (activé par défaut)
- Runtime du fournisseur Z.AI — regroupé en tant que `zai` (activé par défaut)
- Proxy Copilot (auth fournisseur) — pont local vers le Proxy Copilot VS Code ; distinct de la connexion appareil intégrée `github-copilot` (regroupé, désactivé par défaut)

Les plugins natifs OpenClaw sont des **modules TypeScript** chargés au moment de l'exécution via jiti.
**La validation de la configuration n'exécute pas le code du plugin** ; elle utilise le manifeste du plugin
et le schéma JSON à la place. Voir [Plugin manifest](/fr/plugins/manifest).

Les plugins natifs OpenClaw peuvent enregistrer des capacités et des surfaces :

**Capacités** (modèle de plugin public) :

- Fournisseurs d'inférence de texte (catalogues de modèles, authentification, hooks d'exécution)
- Fournisseurs de synthèse vocale
- Fournisseurs de compréhension multimédia
- Fournisseurs de génération d'images
- Fournisseurs de recherche web
- Connecteurs de canal / de messagerie

**Surfaces** (infrastructure de prise en charge) :

- Méthodes Gateway RPC et routes HTTP
- Outils d'agent
- Commandes CLI
- Services d'arrière-plan
- Moteurs de contexte
- Validation de configuration facultative
- **Skills** (en listant les répertoires `skills` dans le manifeste du plugin)
- **Commandes de réponse automatique** (s'exécutent sans invoquer l'agent IA)

Les plugins natifs OpenClaw s'exécutent in-process avec le Gateway (voir
[Modèle d'exécution](#execution-model) pour les implications de confiance).
Guide de création d'outils : [Outils d'agent de plugin](/fr/plugins/agent-tools).

Consider these registrations as des **revendications de capacités**. Un plugin n'est pas censé
s'introduire dans des éléments internes aléatoires et « juste faire en sorte que ça marche ». Il doit s'enregistrer
sur des surfaces explicites qu'OpenClaw comprend, valide et peut exposer
de manière cohérente dans la configuration, l'intégration, le statut, la documentation et le comportement d'exécution.

## Contrats et application des règles

La surface de l'API du plugin est intentionnellement typée et centralisée dans
`OpenClawPluginApi`. Ce contrat définit les points d'enregistrement pris en charge et
les helpers d'exécution sur lesquels un plugin peut s'appuyer.

Pourquoi c'est important :

- les auteurs de plugins disposent d'une norme interne stable
- le cœur peut rejeter la propriété en double, comme deux plugins enregistrant le même
  id de fournisseur
- le démarrage peut fournir des diagnostics exploitables pour les enregistrements malformés
- les tests de contrat peuvent appliquer la propriété des plugins groupés et empêcher la dérive silencieuse

Il existe deux niveaux d'application des règles :

1. **application de l'enregistrement à l'exécution**
   Le registre de plugins valide les enregistrements au chargement des plugins. Exemples :
   les id de fournisseur en double, les id de fournisseur de reconnaissance vocale en double et les enregistrements
   malformés produisent des diagnostics de plugin au lieu d'un comportement indéfini.
2. **tests de contrat**
   Les plugins groupés sont capturés dans les registres de contrats pendant les exécutions de tests afin que
   OpenClaw puisse affirmer explicitement la propriété. Aujourd'hui, cela est utilisé pour les fournisseurs de
   modèles, les fournisseurs de reconnaissance vocale, les fournisseurs de recherche web et la propriété
   des enregistrements groupés.

L'effet pratique est qu'OpenClaw sait, à l'avance, quel plugin possède quelle
surface. Cela permet au cœur et aux canaux de se composer de manière transparente car la propriété est
déclarée, typée et testable plutôt qu'implicite.

### Ce qui appartient à un contrat

Les bons contrats de plugins sont :

- typés
- petits
- spécifiques à la capacité
- possédés par le cœur
- réutilisables par plusieurs plugins
- consommables par les canaux/fonctionnalités sans connaissance du fournisseur

Les mauvais contrats de plugins sont :

- des stratégies spécifiques au fournisseur cachées dans le cœur
- des échappatoires ponctuelles pour plugins qui contournent le registre
- du code de canal accédant directement à une implémentation de fournisseur
- des objets d'exécution ad hoc qui ne font pas partie de `OpenClawPluginApi` ou
  `api.runtime`

En cas de doute, augmentez le niveau d'abstraction : définissez d'abord la capacité, puis
laissez les plugins s'y connecter.

## Limite d'exportation

OpenClaw exporte des capacités, pas des commodités de mise en œuvre.

Gardez l'enregistrement des capacités public. Supprimez les exportations d'assistants non contractuels :

- sous-chemins d'assistants spécifiques au plugin groupé
- sous-chemins de plomberie d'exécution non destinés à être une API publique
- assistants de commodité spécifiques au fournisseur
- assistants de configuration/onboarding qui sont des détails d'implémentation

## Inspection de plugin

Utilisez `openclaw plugins inspect <id>` pour une introspection approfondie du plugin. C'est la
commande canonique pour comprendre la forme d'un plugin et son comportement d'enregistrement.

```bash
openclaw plugins inspect openai
openclaw plugins inspect openai --json
```

Le rapport d'inspection affiche :

- identité, statut de chargement, source et racine
- forme du plugin (plain-capability, hybrid-capability, hook-only, non-capability)
- mode de capacité et capacités enregistrées
- hooks (typés et personnalisés), outils, commandes, services
- enregistrement de channel
- indicateurs de stratégie de configuration
- diagnostics
- si le plugin utilise le hook `before_agent_start` hérité
- métadonnées d'installation

La classification provient du comportement d'enregistrement réel, et pas seulement des
métadonnées statiques.

Les commandes de résumé restent axées sur le résumé :

- `plugins list` — inventaire compact
- `plugins status` — résumé opérationnel
- `doctor` — diagnostics axés sur les problèmes
- `plugins inspect` — détails approfondis

## Hooks d'exécution du fournisseur

Les plugins fournisseur ont désormais deux couches :

- métadonnées du manifeste : `providerAuthEnvVars` pour une recherche env-auth économique avant le
  chargement de l'exécution, plus `providerAuthChoices` pour des étiquettes onboarding/auth-choice
  économiques et des métadonnées d'indicateur CLI avant le chargement de l'exécution
- hooks au moment de la configuration : `catalog` / hérité `discovery`
- runtime hooks : `resolveDynamicModel`, `prepareDynamicModel`, `normalizeResolvedModel`, `capabilities`, `prepareExtraParams`, `wrapStreamFn`, `formatApiKey`, `refreshOAuth`, `buildAuthDoctorHint`, `isCacheTtlEligible`, `buildMissingAuthMessage`, `suppressBuiltInModel`, `augmentModelCatalog`, `isBinaryThinking`, `supportsXHighThinking`, `resolveDefaultThinkingLevel`, `isModernModelRef`, `prepareRuntimeAuth`, `resolveUsageAuth`, `fetchUsageSnapshot`

OpenClaw conserve toujours la boucle générique de l'agent, le basculement, la gestion des transcriptions et
la stratégie d'outil. Ces hooks sont la surface d'extension pour les comportements spécifiques au fournisseur sans
avoir besoin d'un transport d'inférence entièrement personnalisé.

Utilisez le manifeste `providerAuthEnvVars` lorsque le fournisseur possède des informations d'identification basées sur l'environnement
que les chemins génériques d'authentification/état/sélection de modèle devraient voir sans charger le runtime
du plugin. Utilisez le manifeste `providerAuthChoices` lorsque les surfaces CLI d'onboarding/choix d'authentification
doivent connaître l'identifiant de choix du fournisseur, les étiquettes de groupe et le câblage d'authentification
à un seul indicateur simple sans charger le runtime du fournisseur. Gardez le runtime du fournisseur
`envVars` pour les indications destinées aux opérateurs, telles que les étiquettes d'onboarding ou les variables de configuration
client-id/client-secret OAuth.

### Ordre et utilisation des hooks

Pour les plugins de modèle/fournisseur, OpenClaw appelle les hooks dans cet ordre approximatif.
La colonne "Quand utiliser" est le guide de décision rapide.

| #   | Hook                          | Ce qu'il fait                                                                             | Quand l'utiliser                                                                          |
| --- | ----------------------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| 1   | `catalog`                     | Publier la configuration du fournisseur dans `models.providers` lors de la génération `models.json`          | Le fournisseur possède un catalogue ou des URL de base par défaut                                         |
| —   | _(recherche de modèle intégrée)_     | OpenClaw essaie d'abord le chemin normal de registre/catalogue                                    | _(pas un hook de plugin)_                                                                |
| 2   | `resolveDynamicModel`         | Repli synchrone pour les identifiants de modèle appartenant au fournisseur qui ne sont pas encore dans le registre local                 | Le fournisseur accepte les identifiants de modèle en amont arbitraires                                        |
| 3   | `prepareDynamicModel`         | Échauffement asynchrone, puis `resolveDynamicModel` s'exécute à nouveau                                     | Le fournisseur a besoin des métadonnées réseau avant de résoudre les identifiants inconnus                         |
| 4   | `normalizeResolvedModel`      | Réécriture finale avant que le runner intégré n'utilise le modèle résolu                         | Le fournisseur a besoin de réécritures de transport mais utilise toujours un transport de base                    |
| 5   | `capabilities`                | Métadonnées de transcription/outillage appartenant au fournisseur et utilisées par la logique de base partagée                     | Le fournisseur a besoin des particularités de la transcription/de la famille de fournisseurs                                     |
| 6   | `prepareExtraParams`          | Normalisation des paramètres de requête avant les wrappers d'options de flux génériques                        | Le fournisseur a besoin de paramètres de requête par défaut ou d'un nettoyage des paramètres par fournisseur                  |
| 7   | `wrapStreamFn`                | Wrapper de flux après l'application des wrappers génériques                                        | Le fournisseur a besoin de wrappers d'en-têtes/corps de requête/compatibilité de modèle sans transport personnalisé |
| 8   | `formatApiKey`                | Formateur de profil d'authentification : le profil stocké devient la chaîne `apiKey` d'exécution               | Le fournisseur stocke des métadonnées d'authentification supplémentaires et a besoin d'une forme de jeton d'exécution personnalisée           |
| 9   | `refreshOAuth`                | Remplacement de rafraîchissement OAuth pour les points de terminaison de rafraîchissement personnalisés ou la stratégie d'échec de rafraîchissement            | Le fournisseur ne correspond pas aux rafraîchisseurs `pi-ai` partagés                                  |
| 10  | `buildAuthDoctorHint`         | Indication de réparation ajoutée lorsque le rafraîchissement OAuth échoue                                            | Le fournisseur a besoin d'une directive de réparation d'authentification appartenant au fournisseur après un échec de rafraîchissement             |
| 11  | `isCacheTtlEligible`          | Stratégie de cache de prompt pour les fournisseurs de proxy/backhaul                                         | Le fournisseur a besoin d'une limitation TTL de cache spécifique au proxy                                       |
| 12  | `buildMissingAuthMessage`     | Remplacement du message générique de récupération d'authentification manquante                                | Le fournisseur a besoin d'une indication de récupération d'authentification manquante spécifique au fournisseur                        |
| 13  | `suppressBuiltInModel`        | Suppression du modèle amont obsolète plus indication d'erreur utilisateur facultative                    | Le fournisseur doit masquer les lignes amont obsolètes ou les remplacer par une indication du fournisseur        |
| 14  | `augmentModelCatalog`         | Lignes de catalogue synthétiques/finales ajoutées après la découverte                                    | Le fournisseur a besoin de lignes de compatibilité avant synthétiques dans `models list` et les sélecteurs            |
| 15  | `isBinaryThinking`            | Activation/désactivation du raisonnement pour les fournisseurs à pensée binaire                                    | Le fournisseur expose uniquement l'activation/désactivation de la pensée binaire                                         |
| 16  | `supportsXHighThinking`       | Support de raisonnement `xhigh` pour les modèles sélectionnés                                            | Provider veut `xhigh` sur un seul sous-ensemble de models                                    |
| 17  | `resolveDefaultThinkingLevel` | Niveau `/think` par défaut pour une famille de model spécifique                                       | Provider possède la stratégie `/think` par défaut pour une famille de model                             |
| 18  | `isModernModelRef`            | Correspondance de model moderne pour les filtres de profil en direct et la sélection de smoke                        | Provider possède la correspondance de model préférée live/smoke                                    |
| 19  | `prepareRuntimeAuth`          | Échanger une information d'identification configurée contre le jeton/clé d'exécution réel juste avant l'inférence | Provider a besoin d'un échange de jetons ou d'une information d'identification de requête à courte durée de vie                    |
| 20  | `resolveUsageAuth`            | Résoudre les informations d'identification d'utilisation/facturation pour `/usage` et les surfaces d'état associées               | Provider a besoin d'un analyseur de jetons d'utilisation/quota personnalisé ou d'une information d'identification d'utilisation différente      |
| 21  | `fetchUsageSnapshot`          | Récupérer et normaliser les instantanés d'utilisation/quota spécifiques au provider après résolution de l'auth       | Provider a besoin d'un point de terminaison d'utilisation spécifique au provider ou d'un analyseur de payload                  |

Si le provider a besoin d'un protocole filaire entièrement personnalisé ou d'un exécuteur de requête personnalisé,
c'est une classe d'extension différente. Ces hooks sont pour le comportement du provider
qui s'exécute toujours sur la boucle d'inférence normale d'OpenClaw.

### Exemple de Provider

```ts
api.registerProvider({
  id: "example-proxy",
  label: "Example Proxy",
  auth: [],
  catalog: {
    order: "simple",
    run: async (ctx) => {
      const apiKey = ctx.resolveProviderApiKey("example-proxy").apiKey;
      if (!apiKey) {
        return null;
      }
      return {
        provider: {
          baseUrl: "https://proxy.example.com/v1",
          apiKey,
          api: "openai-completions",
          models: [{ id: "auto", name: "Auto" }],
        },
      };
    },
  },
  resolveDynamicModel: (ctx) => ({
    id: ctx.modelId,
    name: ctx.modelId,
    provider: "example-proxy",
    api: "openai-completions",
    baseUrl: "https://proxy.example.com/v1",
    reasoning: false,
    input: ["text"],
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
    contextWindow: 128000,
    maxTokens: 8192,
  }),
  prepareRuntimeAuth: async (ctx) => {
    const exchanged = await exchangeToken(ctx.apiKey);
    return {
      apiKey: exchanged.token,
      baseUrl: exchanged.baseUrl,
      expiresAt: exchanged.expiresAt,
    };
  },
  resolveUsageAuth: async (ctx) => {
    const auth = await ctx.resolveOAuthToken();
    return auth ? { token: auth.token } : null;
  },
  fetchUsageSnapshot: async (ctx) => {
    return await fetchExampleProxyUsage(ctx.token, ctx.timeoutMs, ctx.fetchFn);
  },
});
```

### Exemples intégrés

- Anthropic utilise `resolveDynamicModel`, `capabilities`, `buildAuthDoctorHint`,
  `resolveUsageAuth`, `fetchUsageSnapshot`, `isCacheTtlEligible`,
  `resolveDefaultThinkingLevel` et `isModernModelRef` car il possède la compatibilité avant
  de Claude 4.6, les indications de famille de provider, les conseils de réparation d'auth, l'intégration
  du point de terminaison d'utilisation, l'éligibilité du cache de prompt, et la stratégie de réflexion
  par défaut/adaptive de Claude.
- OpenAI utilise `resolveDynamicModel`, `normalizeResolvedModel` et
  `capabilities` ainsi que `buildMissingAuthMessage`, `suppressBuiltInModel`,
  `augmentModelCatalog`, `supportsXHighThinking` et `isModernModelRef`
  car il possède la compatibilité future GPT-5.4, la normalisation directe OpenAI
  `openai-completions` -> `openai-responses`, les indices d'authentification conscients de Codex,
  la suppression Spark, les lignes de liste synthétiques OpenAI et la stratégie de réflexion /
  de modèle en direct GPT-5.
- OpenRouter utilise `catalog` ainsi que `resolveDynamicModel` et
  `prepareDynamicModel` car le fournisseur est en mode transparent (pass-through) et peut exposer de nouveaux
  identifiants de modèle avant les mises à jour du catalogue statique de OpenClaw.
- GitHub Copilot utilise `catalog`, `auth`, `resolveDynamicModel` et
  `capabilities` ainsi que `prepareRuntimeAuth` et `fetchUsageSnapshot` car il
  nécessite une connexion appareil détenue par le fournisseur, le comportement de repli de modèle,
  les particularités des transcriptions Claude, un échange de jeton GitHub -> jeton Copilot,
  et un point de terminaison d'utilisation détenu par le fournisseur.
- OpenAI Codex utilise `catalog`, `resolveDynamicModel`,
  `normalizeResolvedModel`, `refreshOAuth` et `augmentModelCatalog` ainsi que
  `prepareExtraParams`, `resolveUsageAuth` et `fetchUsageSnapshot` car il
  fonctionne toujours sur les transports centraux OpenAI mais possède sa normalisation de transport/
  d'URL de base, sa stratégie de repli de rafraîchissement OAuth, son choix de transport par défaut,
  ses lignes de catalogue synthétiques Codex et son intégration au point de terminaison d'utilisation ChatGPT.
- Le CLI Google AI et le OAuth Gemini utilisent `resolveDynamicModel` et
  `isModernModelRef` car ils possèdent le repli de compatibilité future Gemini 3.1 et la
  correspondance des modèles modernes ; le CLI OAuth Gemini utilise également `formatApiKey`,
  `resolveUsageAuth` et `fetchUsageSnapshot` pour le formatage des jetons, l'analyse
  des jetons et le câblage du point de terminaison de quota.
- OpenRouter utilise `capabilities`, `wrapStreamFn` et `isCacheTtlEligible`
  pour garder les en-têtes de requête spécifiques au fournisseur, les métadonnées de routage, les correctifs de raisonnement
  et la stratégie de cache de prompt en dehors du cœur.
- Moonshot utilise `catalog` ainsi que `wrapStreamFn` car il utilise toujours le transport partagé
  OpenAI mais a besoin d'une normalisation de la charge utile de raisonnement détenue par le fournisseur.
- Kilocode utilise `catalog`, `capabilities`, `wrapStreamFn` et
  `isCacheTtlEligible` car il a besoin d'en-têtes de requête détenus par le fournisseur,
  d'une normalisation de la charge utile de raisonnement, d'indices de transcription Gemini et d'un blocage
  du TTL de cache Anthropic.
- Z.AI utilise `resolveDynamicModel`, `prepareExtraParams`, `wrapStreamFn`,
  `isCacheTtlEligible`, `isBinaryThinking`, `isModernModelRef`,
  `resolveUsageAuth` et `fetchUsageSnapshot` car il possède le basculement GLM-5,
  les valeurs par défaut `tool_stream`, l'UX de raisonnement binaire, la correspondance de modèle moderne et à la fois
  l'authentification d'utilisation et la récupération des quotas.
- Mistral, OpenCode Zen et OpenCode Go utilisent uniquement `capabilities` pour garder
  les particularités de transcription/outillage en dehors du cœur.
- Les fournisseurs groupés uniquement dans le catalogue, tels que `byteplus`, `cloudflare-ai-gateway`,
  `huggingface`, `kimi-coding`, `modelstudio`, `nvidia`, `qianfan`,
  `synthetic`, `together`, `venice`, `vercel-ai-gateway` et `volcengine`, utilisent
  uniquement `catalog`.
- Le portail Qwen utilise `catalog`, `auth` et `refreshOAuth`.
- MiniMax et Xiaomi utilisent `catalog` ainsi que des hooks d'utilisation car leur comportement `/usage`
  est détenu par le plugin même si l'inférence s'exécute toujours via les
  transports partagés.

## Pipeline de chargement

Au démarrage, OpenClaw fait大致 ceci :

1. découvrir les racines de plugins candidates
2. lire les manifests de bundle natifs ou compatibles et les métadonnées de package
3. rejeter les candidats non sûrs
4. normaliser la config du plugin (`plugins.enabled`, `allow`, `deny`, `entries`,
   `slots`, `load.paths`)
5. décider de l'activation pour chaque candidat
6. charger les modules natifs activés via jiti
7. appeler les hooks natifs `register(api)` et collecter les inscriptions dans le registre de plugins
8. exposer le registre aux surfaces de commandes/exécution

Les barrières de sécurité se produisent **avant** l'exécution du runtime. Les candidats sont bloqués
lorsque l'entrée s'échappe de la racine du plugin, que le chemin est accessible en écriture par tous, ou que la propriété
du chemin semble suspecte pour les plugins non groupés.

### Comportement privilégiant le manifeste

Le manifeste est la source de vérité du plan de contrôle. OpenClaw l'utilise pour :

- identifier le plugin
- découvrir les canaux/compétences/schémas de configuration déclarés ou les capacités du bundle
- valider `plugins.entries.<id>.config`
- augmenter les libellés/placeholders de l'interface de contrôle
- afficher les métadonnées d'installation/catalogue

Pour les plugins natifs, le module d'exécution est la partie du plan de données. Il enregistre
le comportement réel tel que les hooks, les outils, les commandes ou les flux provider.

### Ce que le chargeur met en cache

OpenClaw conserve des caches de processus courts pour :

- les résultats de découverte
- les données du registre de manifestes
- les registres de plugins chargés

Ces caches réduisent les démarrages en rafale et la surcharge des commandes répétées. Il est sûr
de les considérer comme des caches de performance à court terme, et non comme de la persistance.

##  assistants d'exécution

Les plugins peuvent accéder à certains assistants principaux via `api.runtime`. Pour le TTS :

```ts
const clip = await api.runtime.tts.textToSpeech({
  text: "Hello from OpenClaw",
  cfg: api.config,
});

const result = await api.runtime.tts.textToSpeechTelephony({
  text: "Hello from OpenClaw",
  cfg: api.config,
});

const voices = await api.runtime.tts.listVoices({
  provider: "elevenlabs",
  cfg: api.config,
});
```

Remarques :

- `textToSpeech` renvoie la charge utile de sortie TTS principale normale pour les surfaces de fichier/note vocale.
- Utilise la configuration principale `messages.tts` et la sélection de provider.
- Renvoie le tampon audio PCM + le taux d'échantillonnage. Les plugins doivent rééchantillonner/encoder pour les providers.
- `listVoices` est optionnel par provider. Utilisez-le pour les sélecteurs de voix ou les flux de configuration détenus par le fournisseur.
- Les listes de voix peuvent inclure des métadonnées plus riches telles que les paramètres régionaux, le genre et les balises de personnalité pour les sélecteurs conscients du provider.
- OpenAI et ElevenLabs prennent en charge la téléphonie aujourd'hui. Microsoft ne le fait pas.

Les plugins peuvent également enregistrer des fournisseurs de synthèse vocale via `api.registerSpeechProvider(...)`.

```ts
api.registerSpeechProvider({
  id: "acme-speech",
  label: "Acme Speech",
  isConfigured: ({ config }) => Boolean(config.messages?.tts),
  synthesize: async (req) => {
    return {
      audioBuffer: Buffer.from([]),
      outputFormat: "mp3",
      fileExtension: ".mp3",
      voiceCompatible: false,
    };
  },
});
```

Notes :

- Garder la stratégie TTS, le repli et la livraison des réponses dans le cœur.
- Utiliser les fournisseurs de synthèse vocale pour le comportement de synthèse appartenant au fournisseur.
- L'entrée Microsoft `edge` héritée est normalisée vers l'ID de fournisseur `microsoft`.
- Le modèle de propriété privilégié est orienté entreprise : un plugin fournisseur peut posséder des fournisseurs de texte, de synthèse vocale, d'image et de médias futurs, à mesure qu'OpenClaw ajoute ces contrats de capacité.

Pour la compréhension d'image/audio/vidéo, les plugins enregistrent un fournisseur de compréhension de média typé au lieu d'un sac générique de paires clé/valeur :

```ts
api.registerMediaUnderstandingProvider({
  id: "google",
  capabilities: ["image", "audio", "video"],
  describeImage: async (req) => ({ text: "..." }),
  transcribeAudio: async (req) => ({ text: "..." }),
  describeVideo: async (req) => ({ text: "..." }),
});
```

Notes :

- Garder l'orchestration, le repli, la configuration et le câblage de channel dans le cœur.
- Garder le comportement du fournisseur dans le plugin fournisseur.
- L'expansion additive doit rester typée : nouvelles méthodes facultatives, nouveaux champs de résultat facultatifs, nouvelles capacités facultatives.
- Si OpenClaw ajoute une nouvelle capacité telle que la génération vidéo plus tard, définissez d'abord le contrat de capacité de base, puis laissez les plugins fournisseurs s'enregistrer par rapport à celui-ci.

Pour les assistants d'exécution de compréhension de média, les plugins peuvent appeler :

```ts
const image = await api.runtime.mediaUnderstanding.describeImageFile({
  filePath: "/tmp/inbound-photo.jpg",
  cfg: api.config,
  agentDir: "/tmp/agent",
});

const video = await api.runtime.mediaUnderstanding.describeVideoFile({
  filePath: "/tmp/inbound-video.mp4",
  cfg: api.config,
});
```

Pour la transcription audio, les plugins peuvent utiliser soit l'exécution de compréhension de média soit l'ancien alias STT :

```ts
const { text } = await api.runtime.mediaUnderstanding.transcribeAudioFile({
  filePath: "/tmp/inbound-audio.ogg",
  cfg: api.config,
  // Optional when MIME cannot be inferred reliably:
  mime: "audio/ogg",
});
```

Notes :

- `api.runtime.mediaUnderstanding.*` est la surface partagée privilégiée pour la compréhension d'image/audio/vidéo.
- Utilise la configuration audio de compréhension de média de base (`tools.media.audio`) et l'ordre de repli des fournisseurs.
- Renvoie `{ text: undefined }` lorsqu'aucune sortie de transcription n'est produite (par exemple entrée ignorée/non prise en charge).
- `api.runtime.stt.transcribeAudioFile(...)` reste en tant qu'alias de compatibilité.

Les plugins peuvent également lancer des exécutions de sous-agent en arrière-plan via `api.runtime.subagent` :

```ts
const result = await api.runtime.subagent.run({
  sessionKey: "agent:main:subagent:search-helper",
  message: "Expand this query into focused follow-up searches.",
  provider: "openai",
  model: "gpt-4.1-mini",
  deliver: false,
});
```

Notes :

- `provider` et `model` sont des substitutions facultatives par exécution, et non des modifications de session persistantes.
- OpenClaw honore ces champs de substitution uniquement pour les appelants de confiance.
- Pour les exécutions de repli appartenant au plugin, les opérateurs doivent accepter avec `plugins.entries.<id>.subagent.allowModelOverride: true`.
- Utilisez `plugins.entries.<id>.subagent.allowedModels` pour restreindre les plugins de confiance à des cibles `provider/model` canoniques spécifiques, ou `"*"` pour autoriser explicitement n'importe quelle cible.
- Les exécutions de sous-agents de plugins non fiables fonctionnent toujours, mais les demandes de remplacement sont rejetées au lieu de revenir silencieusement à l'ancienne version.

Pour la recherche web, les plugins peuvent consommer le helper d'exécution partagé au lieu d'accéder au câblage de l'outil agent :

```ts
const providers = api.runtime.webSearch.listProviders({
  config: api.config,
});

const result = await api.runtime.webSearch.search({
  config: api.config,
  args: {
    query: "OpenClaw plugin runtime helpers",
    count: 5,
  },
});
```

Les plugins peuvent également enregistrer des providers de recherche web via
`api.registerWebSearchProvider(...)`.

Notes :

- Conservez la sélection du provider, la résolution des identifiants et la sémantique des requêtes partagées dans le cœur.
- Utilisez les providers de recherche web pour les transports de recherche spécifiques aux fournisseurs.
- `api.runtime.webSearch.*` est la surface partagée préférée pour les plugins de fonctionnalité/channel qui ont besoin d'un comportement de recherche sans dépendre du wrapper de l'outil agent.

## Routes HTTP du Gateway

Les plugins peuvent exposer des points de terminaison HTTP avec `api.registerHttpRoute(...)`.

```ts
api.registerHttpRoute({
  path: "/acme/webhook",
  auth: "plugin",
  match: "exact",
  handler: async (_req, res) => {
    res.statusCode = 200;
    res.end("ok");
    return true;
  },
});
```

Champs de route :

- `path` : chemin de route sous le serveur HTTP du Gateway.
- `auth` : requis. Utilisez `"gateway"` pour exiger l'authentification normale du Gateway, ou `"plugin"` pour l'authentification/la vérification de webhook gérée par le plugin.
- `match` : facultatif. `"exact"` (par défaut) ou `"prefix"`.
- `replaceExisting` : facultatif. Permet au même plugin de remplacer son propre enregistrement de route existant.
- `handler` : renvoyez `true` lorsque la route a traité la demande.

Notes :

- `api.registerHttpHandler(...)` est obsolète. Utilisez `api.registerHttpRoute(...)`.
- Les routes de plugin doivent déclarer `auth` explicitement.
- Les conflits exacts de `path + match` sont rejetés, sauf si `replaceExisting: true`, et un plugin ne peut pas remplacer la route d'un autre plugin.
- Les routes qui se chevauchent avec différents niveaux de `auth` sont rejetées. Gardez les chaînes de repli `exact`/`prefix` uniquement sur le même niveau d'authentification.

## Chemins d'importation du SDK de plugin

Utilisez les sous-chemins du SDK au lieu de l'importation monolithique `openclaw/plugin-sdk` lors
de la création de plugins :

- `openclaw/plugin-sdk/core` pour le plus petit contrat générique orienté plugin.
  Il transporte également de petits assistants d'assemblage tels que
  `definePluginEntry`, `defineChannelPluginEntry`, `defineSetupPluginEntry`,
  et `createChannelPluginBase` pour le câblage d'entrée de plugin inclus ou tiers.
- Sous-chemins de domaine tels que `openclaw/plugin-sdk/channel-config-helpers`,
  `openclaw/plugin-sdk/channel-config-schema`,
  `openclaw/plugin-sdk/channel-policy`,
  `openclaw/plugin-sdk/channel-runtime`,
  `openclaw/plugin-sdk/config-runtime`,
  `openclaw/plugin-sdk/agent-runtime`,
  `openclaw/plugin-sdk/lazy-runtime`,
  `openclaw/plugin-sdk/reply-history`,
  `openclaw/plugin-sdk/routing`,
  `openclaw/plugin-sdk/runtime-store` et
  `openclaw/plugin-sdk/directory-runtime` pour les assistants d'exécution/configuration partagés.
- Sous-chemins restreints de channel-core tels que `openclaw/plugin-sdk/discord-core`,
  `openclaw/plugin-sdk/telegram-core`, `openclaw/plugin-sdk/whatsapp-core`,
  et `openclaw/plugin-sdk/line-core` pour les primitives spécifiques au canal qui
  doivent rester plus petites que les barils d'assistants complets du canal.
- `openclaw/plugin-sdk/compat` reste une surface de migration héritée pour les anciens
  plugins externes. Les plugins inclus ne doivent pas l'utiliser, et les importations non-test émettent
  un avertissement d'obsolescence unique hors des environnements de test.
- Les internes des extensions incluses restent privés. Les plugins externes doivent utiliser uniquement
  les sous-chemins `openclaw/plugin-sdk/*`. Le code de test cœur OpenClaw peut utiliser les points
  d'entrée publics du dépôt sous `extensions/<id>/index.js`, `api.js`, `runtime-api.js`,
  `setup-entry.js`, et des fichiers à portée étroite tels que `login-qr-api.js`. N'importez jamais
  `extensions/<id>/src/*` depuis le cœur ou depuis une autre extension.
- Répartition des points d'entrée du dépôt :
  `extensions/<id>/api.js` est le baril d'assistants/types,
  `extensions/<id>/runtime-api.js` est le baril d'exécution uniquement,
  `extensions/<id>/index.js` est le point d'entrée du plugin inclus,
  et `extensions/<id>/setup-entry.js` est le point d'entrée du plugin de configuration.
- `openclaw/plugin-sdk/telegram` pour les types de plugins de canal Telegram et les assistants partagés orientés canal. Les internes de l'implémentation Telegram intégrée restent privés pour l'extension incluse.
- `openclaw/plugin-sdk/discord` pour les types de plugins de channel Discord et les helpers partagés orientés channel. Les internes de l'implémentation Discord intégrée restent privés pour l'extension groupée.
- `openclaw/plugin-sdk/slack` pour les types de plugins de channel Slack et les helpers partagés orientés channel. Les internes de l'implémentation Slack intégrée restent privés pour l'extension groupée.
- `openclaw/plugin-sdk/signal` pour les types de plugins de channel Signal et les helpers partagés orientés channel. Les internes de l'implémentation Signal intégrée restent privés pour l'extension groupée.
- `openclaw/plugin-sdk/imessage` pour les types de plugins de channel iMessage et les helpers partagés orientés channel. Les internes de l'implémentation iMessage intégrée restent privés pour l'extension groupée.
- `openclaw/plugin-sdk/whatsapp` pour les types de plugins de channel WhatsApp et les helpers partagés orientés channel. Les internes de l'implémentation WhatsApp intégrée restent privés pour l'extension groupée.
- `openclaw/plugin-sdk/line` pour les plugins de channel LINE.
- `openclaw/plugin-sdk/msteams` pour la surface du plugin Microsoft Teams groupé.
- Des sous-chemins supplémentaires spécifiques aux extensions groupées restent disponibles là où OpenClaw expose intentionnellement des helpers orientés extension :
  `openclaw/plugin-sdk/acpx`, `openclaw/plugin-sdk/bluebubbles`,
  `openclaw/plugin-sdk/feishu`, `openclaw/plugin-sdk/googlechat`,
  `openclaw/plugin-sdk/irc`, `openclaw/plugin-sdk/lobster`,
  `openclaw/plugin-sdk/matrix`,
  `openclaw/plugin-sdk/mattermost`, `openclaw/plugin-sdk/memory-core`,
  `openclaw/plugin-sdk/minimax-portal-auth`,
  `openclaw/plugin-sdk/nextcloud-talk`, `openclaw/plugin-sdk/nostr`,
  `openclaw/plugin-sdk/synology-chat`, `openclaw/plugin-sdk/test-utils`,
  `openclaw/plugin-sdk/tlon`, `openclaw/plugin-sdk/twitch`,
  `openclaw/plugin-sdk/voice-call`,
  `openclaw/plugin-sdk/zalo` et `openclaw/plugin-sdk/zalouser`.

## Résolution de la cible du channel

Les plugins de channel doivent posséder la sémantique de cible spécifique au channel. Gardez l'hôte sortant partagé générique et utilisez la surface de l'adaptateur de messagerie pour les règles du provider :

- `messaging.inferTargetChatType({ to })` décide si une cible normalisée
  doit être traitée comme `direct`, `group` ou `channel` avant la recherche dans l'annuaire.
- `messaging.targetResolver.looksLikeId(raw, normalized)` indique au cœur si une
  entrée doit passer directement à la résolution de type identifiant au lieu de la recherche dans l'annuaire.
- `messaging.targetResolver.resolveTarget(...)` est le repli du plugin lorsque
  le cœur a besoin d'une résolution finale propriétaire du fournisseur après normalisation ou après
  un échec de l'annuaire.
- `messaging.resolveOutboundSessionRoute(...)` gère la construction des routes de session
  spécifiques au fournisseur une fois la cible résolue.

Répartition recommandée :

- Utilisez `inferTargetChatType` pour les décisions de catégorie qui doivent avoir lieu avant
  la recherche de pairs/groupes.
- Utilisez `looksLikeId` pour les vérifications de type « traiter ceci comme un identifiant de cible explicite/natif ».
- Utilisez `resolveTarget` pour le repli de normalisation spécifique au fournisseur, et non pour
  une recherche étendue dans l'annuaire.
- Conservez les identifiants natifs du fournisseur tels que les identifiants de chat, de fil de discussion, JIDs, handles et identifiants de salle
  dans les valeurs `target` ou les paramètres spécifiques au fournisseur, et non dans les champs génériques du SDK.

## Annuaires basés sur la configuration

Les plugins qui dérivent des entrées d'annuaire à partir de la configuration doivent conserver cette logique dans le
plugin et réutiliser les assistants partagés de
`openclaw/plugin-sdk/directory-runtime`.

Utilisez ceci lorsqu'un canal a besoin de pairs/groupes basés sur la configuration, tels que :

- pairs en DM basés sur une liste verte (allowlist)
- mappages de canal/groupe configurés
- replis d'annuaire statique limités au compte

Les assistants partagés dans `directory-runtime` ne gèrent que les opérations génériques :

- filtrage des requêtes
- application des limites
- assistants de déduplication/normalisation
- construction de `ChannelDirectoryEntry[]`

L'inspection de compte spécifique au canal et la normalisation des identifiants doivent rester dans l'implémentation du plugin.

## Catalogues de fournisseurs

Les plugins de fournisseur peuvent définir des catalogues de modèles pour l'inférence avec
`registerProvider({ catalog: { run(...) { ... } } })`.

`catalog.run(...)` renvoie la même forme que OpenClaw écrit dans
`models.providers` :

- `{ provider }` pour une entrée de fournisseur
- `{ providers }` pour plusieurs entrées de fournisseur

Utilisez `catalog` lorsque le plugin possède des ids de modèle spécifiques au fournisseur, des URL de base par défaut ou des métadonnées de modèle protégées par authentification.

`catalog.order` contrôle le moment où le catalogue d'un plugin fusionne par rapport aux fournisseurs implicites intégrés de OpenClaw :

- `simple` : fournisseurs basés sur une clé API simple ou sur des variables d'environnement
- `profile` : fournisseurs qui apparaissent lorsque des profils d'authentification existent
- `paired` : fournisseurs qui synthétisent plusieurs entrées de fournisseurs connexes
- `late` : dernière passe, après les autres fournisseurs implicites

En cas de conflit de clés, les derniers fournisseurs l'emportent, les plugins peuvent donc remplacer intentionnellement une entrée de fournisseur intégrée avec le même id de fournisseur.

Compatibilité :

- `discovery` fonctionne toujours comme un alias hérité
- si `catalog` et `discovery` sont tous deux enregistrés, OpenClaw utilise `catalog`

Remarque de compatibilité :

- `openclaw/plugin-sdk` reste pris en charge pour les plugins externes existants.
- Les nouveaux plugins groupés et migrés doivent utiliser des sous-chemins spécifiques au canal ou à l'extension ; utilisez `core` ainsi que des sous-chemins de domaine explicites pour les surfaces génériques, et traitez `compat` comme réservé à la migration.
- Les sous-chemins spécifiques aux capacités tels que `image-generation`,
  `media-understanding` et `speech` existent car les plugins groupés/natifs les utilisent aujourd'hui. Leur présence ne signifie pas par elle-même que chaque assistant exporté est un contrat externe figé à long terme.

## Inspection en lecture seule du canal

Si votre plugin enregistre un canal, privilégiez l'implémentation de
`plugin.config.inspectAccount(cfg, accountId)` en plus de `resolveAccount(...)`.

Pourquoi :

- `resolveAccount(...)` est le chemin d'exécution. Il est supposé que les identifiants
  sont entièrement matérialisés et peut échouer rapidement lorsque les secrets requis sont manquants.
- Les chemins de commande en lecture seule tels que `openclaw status`, `openclaw status --all`,
  `openclaw channels status`, `openclaw channels resolve` et les flux de réparation
  du docteur/config ne devraient pas avoir besoin de matérialiser les identifiants
  d'exécution juste pour décrire la configuration.

Comportement `inspectAccount(...)` recommandé :

- Ne renvoyer que l'état descriptif du compte.
- Préserver `enabled` et `configured`.
- Inclure les champs de source/état des informations d'identification lorsque cela est pertinent, par exemple :
  - `tokenSource`, `tokenStatus`
  - `botTokenSource`, `botTokenStatus`
  - `appTokenSource`, `appTokenStatus`
  - `signingSecretSource`, `signingSecretStatus`
- Vous n'avez pas besoin de renvoyer les valeurs brutes des jetons juste pour signaler une disponibilité en lecture seule. Le renvoi de `tokenStatus: "available"` (et du champ source correspondant) suffit pour les commandes de type statut.
- Utilisez `configured_unavailable` lorsqu'une information d'identification est configurée via SecretRef mais n'est pas disponible dans le chemin de commande actuel.

Cela permet aux commandes en lecture seule de signaler « configuré mais indisponible dans ce chemin de commande » au lieu de planter ou de signaler incorrectement que le compte n'est pas configuré.

Note de performance :

- La découverte de plugins et les métadonnées du manifeste utilisent des caches en processus de courte durée pour réduire le travail de démarrage/rechargement par rafales.
- Définissez `OPENCLAW_DISABLE_PLUGIN_DISCOVERY_CACHE=1` ou `OPENCLAW_DISABLE_PLUGIN_MANIFEST_CACHE=1` pour désactiver ces caches.
- Ajustez les fenêtres de cache avec `OPENCLAW_PLUGIN_DISCOVERY_CACHE_MS` et `OPENCLAW_PLUGIN_MANIFEST_CACHE_MS`.

## Discovery & priorité

OpenClaw analyse, dans l'ordre :

1. Chemins de configuration

- `plugins.load.paths` (fichier ou répertoire)

2. Extensions de l'espace de travail

- `<workspace>/.openclaw/extensions/*.ts`
- `<workspace>/.openclaw/extensions/*/index.ts`

3. Extensions globales

- `~/.openclaw/extensions/*.ts`
- `~/.openclaw/extensions/*/index.ts`

4. Extensions groupées (livrées avec OpenClaw ; mixte activé par défaut/désactivé par défaut)

- `<openclaw>/extensions/*`

De nombreux plugins de fournisseur groupés sont activés par défaut pour que les catalogues de modèles/hooks d'exécution restent disponibles sans configuration supplémentaire. D'autres nécessitent toujours une activation explicite via `plugins.entries.<id>.enabled` ou `openclaw plugins enable <id>`.

Exemples de plugins groupés activés par défaut :

- `byteplus`
- `cloudflare-ai-gateway`
- `device-pair`
- `github-copilot`
- `huggingface`
- `kilocode`
- `kimi-coding`
- `minimax`
- `minimax`
- `modelstudio`
- `moonshot`
- `nvidia`
- `ollama`
- `openai`
- `openrouter`
- `phone-control`
- `qianfan`
- `qwen-portal-auth`
- `sglang`
- `synthetic`
- `talk-voice`
- `together`
- `venice`
- `vercel-ai-gateway`
- `vllm`
- `volcengine`
- `xiaomi`
- plugin de slot de mémoire actif (slot par défaut : `memory-core`)

Les plugins installés sont activés par défaut, mais peuvent être désactivés de la même manière.

Les plugins de l'espace de travail sont **désactivés par défaut**, sauf si vous les
activez explicitement ou les mettez sur liste blanche. C'est intentionnel : un dépôt
extrait ne doit pas devenir silencieusement du code de passerelle de production.

Notes de durcissement :

- Si `plugins.allow` est vide et que les plugins non empaquetés sont détectables, OpenClaw enregistre un avertissement de démarrage avec les identifiants et les sources des plugins.
- Les chemins candidats sont vérifiés pour la sécurité avant l'admission à la découverte. OpenClaw bloque les candidats lorsque :
  - l'entrée de l'extension résout en dehors de la racine du plugin (y compris les échappements de lien symbolique/traversée de chemin),
  - le chemin racine/source du plugin est accessible en écriture par tous,
  - la propriété du chemin est suspecte pour les plugins non empaquetés (le propriétaire POSIX n'est ni l'uid actuel ni root).
- Les plugins non empaquetés chargés sans provenance d'installation/chemin de chargement émettent un avertissement pour que vous puissiez épingler la confiance (`plugins.allow`) ou le suivi d'installation (`plugins.installs`).

Chaque plugin natif OpenClaw doit inclure un fichier `openclaw.plugin.json` dans sa
racine. Si un chemin pointe vers un fichier, la racine du plugin est le répertoire du fichier et
doit contenir le manifeste.

Les bundles compatibles peuvent plutôt fournir l'un des éléments suivants :

- `.codex-plugin/plugin.json`
- `.claude-plugin/plugin.json`
- `.cursor-plugin/plugin.json`

Les répertoires de bundles sont découverts à partir des mêmes racines que les plugins natifs.

Si plusieurs plugins résolvent vers le même identifiant, la première correspondance selon l'ordre ci-dessus l'emporte et les copies de priorité inférieure sont ignorées.

Cela signifie :

- les plugins de l'espace de travail masquent intentionnellement les plugins groupés avec le même identifiant
- `plugins.allow: ["foo"]` autorise le plugin `foo` actif par son identifiant, même lorsque la copie active provient de l'espace de travail au lieu de la racine de l'extension groupée
- si vous avez besoin d'un contrôle plus strict de la provenance, utilisez des chemins d'installation/chargement explicites et inspectez la source du plugin résolu avant de l'activer

### Règles d'activation

L'activation est résolue après la découverte :

- `plugins.enabled: false` désactive tous les plugins
- `plugins.deny` l'emporte toujours
- `plugins.entries.<id>.enabled: false` désactive ce plugin
- les plugins d'origine workspace sont désactivés par défaut
- les listes d'autorisation restreignent l'ensemble actif lorsque `plugins.allow` n'est pas vide
- les listes d'autorisation sont basées sur l'**identifiant**, et non sur la source
- les plugins groupés sont désactivés par défaut, sauf si :
  - l'identifiant groupé figure dans l'ensemble activé par défaut intégré, ou
  - vous l'activez explicitement, ou
  - la configuration du channel active implicitement le plugin channel groupé
- les emplacements exclusifs peuvent forcer l'activation du plugin sélectionné pour cet emplacement

Dans le cœur actuel, les identifiants groupés activés par défaut incluent les helpers local/provider ci-dessus ainsi que le plugin actif de l'emplacement mémoire.

### Packs de paquets

Un répertoire de plugins peut inclure un `package.json` avec `openclaw.extensions` :

```json
{
  "name": "my-pack",
  "openclaw": {
    "extensions": ["./src/safety.ts", "./src/tools.ts"],
    "setupEntry": "./src/setup-entry.ts"
  }
}
```

Chaque entrée devient un plugin. Si le pack répertorie plusieurs extensions, l'identifiant du plugin devient `name/<fileBase>`.

Si votre plugin importe des dépendances npm, installez-les dans ce répertoire afin que `node_modules` soit disponible (`npm install` / `pnpm install`).

Garantie de sécurité : chaque entrée `openclaw.extensions` doit rester à l'intérieur du répertoire du plugin après la résolution des liens symboliques. Les entrées qui s'échappent du répertoire du paquet sont rejetées.

Note de sécurité : `openclaw plugins install` installe les dépendances du plugin avec `npm install --ignore-scripts` (pas de scripts de cycle de vie). Gardez les arbres de dépendances des plugins « pur JS/TS » et évitez les paquets qui nécessitent des builds `postinstall`.

Optionnel : `openclaw.setupEntry` peut pointer vers un module léger dédié uniquement à la configuration.
Lorsque OpenClaw a besoin de surfaces de configuration pour un plugin de canal désactivé, ou
lorsqu'un plugin de canal est activé mais toujours non configuré, il charge `setupEntry`
au lieu de l'entrée complète du plugin. Cela allège le démarrage et la configuration
lorsque votre entrée principale du plugin connecte également des outils, des hooks ou d'autres codes
uniquement pour l'exécution.

Optionnel : `openclaw.startup.deferConfiguredChannelFullLoadUntilAfterListen`
peut permettre à un plugin de canal d'emprunter le même chemin `setupEntry` pendant la phase de
démarrage pré-écoute de la passerelle, même lorsque le canal est déjà configuré.

N'utilisez ceci que lorsque `setupEntry` couvre entièrement la surface de démarrage qui doit exister
avant que la passerelle ne commence à écouter. En pratique, cela signifie que l'entrée de configuration
doit enregistrer chaque capacité détenue par le canal dont dépend le démarrage, telles que :

- l'enregistrement du canal lui-même
- toutes les routes HTTP qui doivent être disponibles avant que la passerelle ne commence à écouter
- toutes les méthodes de passerelle, outils ou services qui doivent exister durant cette même fenêtre

Si votre entrée complète possède toujours une capacité requise pour le démarrage, n'activez pas
ce drapeau. Conservez le comportement par défaut du plugin et laissez OpenClaw charger l'entrée
complète pendant le démarrage.

Exemple :

```json
{
  "name": "@scope/my-channel",
  "openclaw": {
    "extensions": ["./index.ts"],
    "setupEntry": "./setup-entry.ts",
    "startup": {
      "deferConfiguredChannelFullLoadUntilAfterListen": true
    }
  }
}
```

### Métadonnées du catalogue de canaux

Les plugins de canal peuvent publier des métadonnées de configuration/découverte via `openclaw.channel` et
des indices d'installation via `openclaw.install`. Cela maintient le catalogue principal exempt de données.

Exemple :

```json
{
  "name": "@openclaw/nextcloud-talk",
  "openclaw": {
    "extensions": ["./index.ts"],
    "channel": {
      "id": "nextcloud-talk",
      "label": "Nextcloud Talk",
      "selectionLabel": "Nextcloud Talk (self-hosted)",
      "docsPath": "/channels/nextcloud-talk",
      "docsLabel": "nextcloud-talk",
      "blurb": "Self-hosted chat via Nextcloud Talk webhook bots.",
      "order": 65,
      "aliases": ["nc-talk", "nc"]
    },
    "install": {
      "npmSpec": "@openclaw/nextcloud-talk",
      "localPath": "extensions/nextcloud-talk",
      "defaultChoice": "npm"
    }
  }
}
```

OpenClaw peut également fusionner des **catalogues de canaux externes** (par exemple, un export
de registre MPM). Déposez un fichier JSON à l'un des emplacements suivants :

- `~/.openclaw/mpm/plugins.json`
- `~/.openclaw/mpm/catalog.json`
- `~/.openclaw/plugins/catalog.json`

Ou pointez `OPENCLAW_PLUGIN_CATALOG_PATHS` (ou `OPENCLAW_MPM_CATALOG_PATHS`) vers
un ou plusieurs fichiers JSON (délimités par des virgules/points-virgules/`PATH`). Chaque fichier doit
contenir `{ "entries": [ { "name": "@scope/pkg", "openclaw": { "channel": {...}, "install": {...} } } ] }`.

## ID de plugin

ID de plugins par défaut :

- Paquets de packages : `package.json` `name`
- Fichier autonome : nom de base du fichier (`~/.../voice-call.ts` → `voice-call`)

Si un plugin exporte `id`, OpenClaw l'utilise mais avertit s'il ne correspond pas à
l'id configuré.

## Modèle de registre

Les plugins chargés ne mutent pas directement les variables globales du cœur aléatoirement. Ils s'enregistrent dans un registre central de plugins.

Le registre suit :

- les enregistrements de plugins (identité, source, origine, statut, diagnostics)
- les outils
- les hooks legacy et les hooks typés
- les canaux
- les fournisseurs
- les gestionnaires RPC de passerelle
- les routes HTTP
- les registres CLI
- les services d'arrière-plan
- les commandes possédées par le plugin

Les fonctionnalités du cœur lisent ensuite à partir de ce registre au lieu de communiquer directement avec les modules de plugins. Cela maintient le chargement à sens unique :

- module de plugin -> enregistrement du registre
- runtime du cœur -> consommation du registre

Cette séparation est importante pour la maintenabilité. Cela signifie que la plupart des surfaces du cœur n'ont besoin que d'un point d'intégration : "lire le registre", et non "cas particulier pour chaque module de plugin".

## Configuration

```json5
{
  plugins: {
    enabled: true,
    allow: ["voice-call"],
    deny: ["untrusted-plugin"],
    load: { paths: ["~/Projects/oss/voice-call-extension"] },
    entries: {
      "voice-call": { enabled: true, config: { provider: "twilio" } },
    },
  },
}
```

Champs :

- `enabled` : interrupteur principal (par défaut : true)
- `allow` : liste d'autorisation (optionnel)
- `deny` : liste de refus (optionnel ; le refus l'emporte)
- `load.paths` : fichiers/répertoires de plugins supplémentaires
- `slots` : sélecteurs de slot exclusifs tels que `memory` et `contextEngine`
- `entries.<id>` : interrupteurs + configuration par plugin

Les modifications de la configuration **nécessitent un redémarrage de la passerelle**. Voir [Référence de configuration](/fr/configuration) pour le schéma de configuration complet.

Règles de validation (strictes) :

- Les ids de plugins inconnus dans `entries`, `allow`, `deny` ou `slots` sont des **erreurs**.
- Les clés `channels.<id>` inconnues sont des **erreurs** sauf si un manifeste de plugin déclare l'id du canal.
- La configuration native du plugin est validée à l'aide du schéma JSON intégré dans `openclaw.plugin.json` (`configSchema`).
- Les bundles compatibles n'exposent actuellement pas les schémas de configuration natifs OpenClaw.
- Si un plugin est désactivé, sa configuration est conservée et un **avertissement** est émis.

### Désactivé vs manquant vs invalide

Ces états sont intentionnellement différents :

- **désactivé** : le plugin existe, mais les règles d'activation l'ont éteint
- **manquant** : la configuration référence un id de plugin que la découverte n'a pas trouvé
- **invalide** : le plugin existe, mais sa configuration ne correspond pas au schéma déclaré

OpenClaw préserve la configuration des plugins désactivés, de sorte que leur réactivation n'est pas destructive.

## Emplacements de plugins (catégories exclusives)

Certaines catégories de plugins sont **exclusives** (une seule active à la fois). Utilisez `plugins.slots` pour sélectionner le plugin propriétaire de l'emplacement :

```json5
{
  plugins: {
    slots: {
      memory: "memory-core", // or "none" to disable memory plugins
      contextEngine: "legacy", // or a plugin id such as "lossless-claw"
    },
  },
}
```

Emplacements exclusifs pris en charge :

- `memory` : plugin de mémoire actif (`"none"` désactive les plugins de mémoire)
- `contextEngine` : plugin de moteur de contexte actif (`"legacy"` est la valeur par défaut intégrée)

Si plusieurs plugins déclarent `kind: "memory"` ou `kind: "context-engine"`, seul le plugin sélectionné se charge pour cet emplacement. Les autres sont désactivés avec des diagnostics. Déclarez `kind` dans votre [manifeste de plugin](/fr/plugins/manifest).

### Plugins de moteur de contexte

Les plugins de moteur de contexte sont propriétaires de l'orchestration du contexte de session pour l'ingestion, l'assemblage et la compactage. Inscrivez-les depuis votre plugin avec `api.registerContextEngine(id, factory)`, puis sélectionnez le moteur actif avec `plugins.slots.contextEngine`.

Utilisez ceci lorsque votre plugin doit remplacer ou étendre le pipeline de contexte par défaut plutôt que de simplement ajouter une recherche mémoire ou des crochets (hooks).

## Interface de contrôle (schéma + étiquettes)

L'interface de contrôle utilise `config.schema` (JSON Schema + `uiHints`) pour afficher de meilleurs formulaires.

OpenClaw augmente `uiHints` au moment de l'exécution en fonction des plugins découverts :

- Ajoute des étiquettes par plugin pour `plugins.entries.<id>` / `.enabled` / `.config`
- Fusionne les indices de champ de configuration optionnels fournis par le plugin sous :
  `plugins.entries.<id>.config.<field>`

Si vous souhaitez que les champs de configuration de votre plugin affichent de bonnes étiquettes/espaces réservés (et marquer les secrets comme sensibles), fournissez `uiHints` avec votre JSON Schema dans le manifeste du plugin.

Exemple :

```json
{
  "id": "my-plugin",
  "configSchema": {
    "type": "object",
    "additionalProperties": false,
    "properties": {
      "apiKey": { "type": "string" },
      "region": { "type": "string" }
    }
  },
  "uiHints": {
    "apiKey": { "label": "API Key", "sensitive": true },
    "region": { "label": "Region", "placeholder": "us-east-1" }
  }
}
```

## CLI

```bash
openclaw plugins list
openclaw plugins inspect <id>
openclaw plugins install <path>                 # copy a local file/dir into ~/.openclaw/extensions/<id>
openclaw plugins install ./extensions/voice-call # relative path ok
openclaw plugins install ./plugin.tgz           # install from a local tarball
openclaw plugins install ./plugin.zip           # install from a local zip
openclaw plugins install -l ./extensions/voice-call # link (no copy) for dev
openclaw plugins install @openclaw/voice-call   # install from npm
openclaw plugins install @openclaw/voice-call --pin # store exact resolved name@version
openclaw plugins update <id>
openclaw plugins update --all
openclaw plugins enable <id>
openclaw plugins disable <id>
openclaw plugins doctor
```

Consultez la [référence `openclaw plugins` CLI](/fr/cli/plugins) pour plus de détails sur chaque commande (règles d'installation, inspection de la sortie, installations à partir de la place de marché, désinstallation).

Les plugins peuvent également enregistrer leurs propres commandes de niveau supérieur (exemple : `openclaw voicecall`).

## API du plugin (aperçu)

Les plugins exportent soit :

- Une fonction : `(api) => { ... }`
- Un objet : `{ id, name, configSchema, register(api) { ... } }`

`register(api)` est l'endroit où les plugins attachent des comportements. Les enregistrements courants incluent :

- `registerTool`
- `registerHook`
- `on(...)` pour les hooks de cycle de vie typés
- `registerChannel`
- `registerProvider`
- `registerSpeechProvider`
- `registerMediaUnderstandingProvider`
- `registerWebSearchProvider`
- `registerHttpRoute`
- `registerCommand`
- `registerCli`
- `registerContextEngine`
- `registerService`

Dans la pratique, `register(api)` est également l'endroit où un plugin déclare la **propriété**.
Cette propriété doit correspondre clairement à :

- une surface fournisseur telle que OpenAI, ElevenLabs ou Microsoft
- une surface fonctionnalité telle qu'appel vocal

Évitez de diviser les capacités d'un même fournisseur sur plusieurs plugins non liés, sauf s'il existe une raison produit forte de le faire. La valeur par défaut doit être un plugin par fournisseur/fonctionnalité, avec des contrats de capacité principale séparant l'orchestration partagée du comportement spécifique au fournisseur.

## Ajout d'une nouvelle capacité

Lorsqu'un plugin a besoin d'un comportement qui ne correspond pas à la API actuelle, ne contournez pas le système de plugin avec un accès privé. Ajoutez la capacité manquante.

Séquence recommandée :

1. définir le contrat principal
   Décidez du comportement partagé que le principal doit posséder : stratégie, repli, fusion de configuration,
   cycle de vie, sémantique orientée canal, et forme de l'assistant d'exécution.
2. ajouter des surfaces d'enregistrement/exécution de plugin typées
   Étendez `OpenClawPluginApi` et/ou `api.runtime` avec la plus petite surface de capacité typée utile.
3. connecter le principal + les consommateurs de canal/fonctionnalité
   Les canaux et les plugins de fonctionnalité doivent consommer la nouvelle capacité via le principal,
   et non en important une implémentation fournisseur directement.
4. enregistrer les implémentations fournisseur
   Les plugins fournisseur enregistrent ensuite leurs backends par rapport à la capacité.
5. ajouter une couverture de contrat
   Ajoutez des tests afin que la propriété et la forme de l'enregistrement restent explicites au fil du temps.

C'est ainsi qu'OpenClaw reste opinionné sans être codé en dur selon la vision du monde d'un fournisseur. Voir le [Capability Cookbook](/fr/tools/capability-cookbook) pour une liste de fichiers concrète et un exemple travaillé.

### Liste de contrôle des capacités

Lorsque vous ajoutez une nouvelle capacité, l'implémentation doit généralement toucher ces surfaces ensemble :

- types de contrats principaux dans `src/<capability>/types.ts`
- assistant d'exécution/de runtime principal dans `src/<capability>/runtime.ts`
- surface d'enregistrement de l'API du plugin dans `src/plugins/types.ts`
- câblage du registre de plugins dans `src/plugins/registry.ts`
- exposition du runtime du plugin dans `src/plugins/runtime/*` lorsque les plugins de fonctionnalité/canal doivent le consommer
- assistants de capture/test dans `src/test-utils/plugin-registration.ts`
- assertions de propriété/contrat dans `src/plugins/contracts/registry.ts`
- documentation opérateur/plugin dans `docs/`

Si l'une de ces surfaces est manquante, c'est généralement un signe que la capacité n'est pas encore pleinement intégrée.

### Modèle de capacité

Modèle minimal :

```ts
// core contract
export type VideoGenerationProviderPlugin = {
  id: string;
  label: string;
  generateVideo: (req: VideoGenerationRequest) => Promise<VideoGenerationResult>;
};

// plugin API
api.registerVideoGenerationProvider({
  id: "openai",
  label: "OpenAI",
  async generateVideo(req) {
    return await generateOpenAiVideo(req);
  },
});

// shared runtime helper for feature/channel plugins
const clip = await api.runtime.videoGeneration.generateFile({
  prompt: "Show the robot walking through the lab.",
  cfg,
});
```

Modèle de test de contrat :

```ts
expect(findVideoGenerationProviderIdsForPlugin("openai")).toEqual(["openai"]);
```

Cela permet de garder la règle simple :

- le cœur possède le contrat de capacité + l'orchestration
- les plugins fournisseur possèdent les implémentations fournisseur
- les plugins de fonctionnalité/canal consomment les assistants d'exécution
- les tests de contrat gardent la propriété explicite

Les plugins de moteur de contexte peuvent également enregistrer un gestionnaire de contexte propriétaire du runtime :

```ts
export default function (api) {
  api.registerContextEngine("lossless-claw", () => ({
    info: { id: "lossless-claw", name: "Lossless Claw", ownsCompaction: true },
    async ingest() {
      return { ingested: true };
    },
    async assemble({ messages }) {
      return { messages, estimatedTokens: 0 };
    },
    async compact() {
      return { ok: true, compacted: false };
    },
  }));
}
```

Si votre moteur ne possède **pas** l'algorithme de compactage, gardez `compact()` implémenté et déléguez-le explicitement :

```ts
import { delegateCompactionToRuntime } from "openclaw/plugin-sdk/core";

export default function (api) {
  api.registerContextEngine("my-memory-engine", () => ({
    info: {
      id: "my-memory-engine",
      name: "My Memory Engine",
      ownsCompaction: false,
    },
    async ingest() {
      return { ingested: true };
    },
    async assemble({ messages }) {
      return { messages, estimatedTokens: 0 };
    },
    async compact(params) {
      return await delegateCompactionToRuntime(params);
    },
  }));
}
```

`ownsCompaction: false` ne revient pas automatiquement au compactage hérité. Si votre moteur est actif, sa méthode `compact()` gère toujours `/compact` et la récupération des dépassements.

Activez-le ensuite dans la configuration :

```json5
{
  plugins: {
    slots: {
      contextEngine: "lossless-claw",
    },
  },
}
```

## Crochets de plugin (Plugin hooks)

Les plugins peuvent enregistrer des crochets lors de l'exécution. Cela permet à un plugin de regrouper l'automatisation basée sur les événements sans installer de pack de crochets séparé.

### Exemple

```ts
export default function register(api) {
  api.registerHook(
    "command:new",
    async () => {
      // Hook logic here.
    },
    {
      name: "my-plugin.command-new",
      description: "Runs when /new is invoked",
    },
  );
}
```

Remarques :

- Enregistrez les crochets explicitement via `api.registerHook(...)`.
- Les règles d'éligibilité des crochets s'appliquent toujours (exigences OS/bins/env/config).
- Les crochets gérés par des plugins apparaissent dans `openclaw hooks list` avec `plugin:<id>`.
- Vous ne pouvez pas activer/désactiver les crochets gérés par des plugins via `openclaw hooks` ; activez/désactivez plutôt le plugin.

### Hooks du cycle de vie de l'agent (`api.on`)

Pour les hooks de cycle de vie d'exécution typés, utilisez `api.on(...)` :

```ts
export default function register(api) {
  api.on(
    "before_prompt_build",
    (event, ctx) => {
      return {
        prependSystemContext: "Follow company style guide.",
      };
    },
    { priority: 10 },
  );
}
```

Hooks importants pour la construction du prompt :

- `before_model_resolve` : s'exécute avant le chargement de la session (`messages` ne sont pas disponibles). Utilisez ceci pour remplacer de manière déterministe `modelOverride` ou `providerOverride`.
- `before_prompt_build` : s'exécute après le chargement de la session (`messages` sont disponibles). Utilisez ceci pour façonner l'entrée du prompt.
- `before_agent_start` : hook de compatibilité hérité. Préférez les deux hooks explicites ci-dessus.

Stratégie de hook appliquée par le cœur :

- Les opérateurs peuvent désactiver les hooks de modification de prompt par plugin via `plugins.entries.<id>.hooks.allowPromptInjection: false`.
- Lorsqu'il est désactivé, OpenClaw bloque `before_prompt_build` et ignore les champs de modification de prompt renvoyés par le `before_agent_start` hérité tout en préservant le `modelOverride` et le `providerOverride` hérités.

Champs de résultat `before_prompt_build` :

- `prependContext` : ajoute du texte au début du prompt utilisateur pour cette exécution. Idéal pour le contenu spécifique à un tour ou dynamique.
- `systemPrompt` : remplacement complet du prompt système.
- `prependSystemContext` : ajoute du texte au début du prompt système actuel.
- `appendSystemContext` : ajoute du texte à la fin du prompt système actuel.

Ordre de construction du prompt dans l'exécution intégrée (embedded runtime) :

1. Appliquer `prependContext` au prompt utilisateur.
2. Appliquer le remplacement `systemPrompt` lorsqu'il est fourni.
3. Appliquer `prependSystemContext + current system prompt + appendSystemContext`.

Notes sur la fusion et la priorité :

- Les gestionnaires de hooks s'exécutent par priorité (le plus élevé en premier).
- Pour les champs de contexte fusionnés, les valeurs sont concaténées dans l'ordre d'exécution.
- Les valeurs `before_prompt_build` sont appliquées avant les valeurs de repli `before_agent_start` héritées.

Conseils de migration :

- Déplacez les instructions statiques de `prependContext` vers `prependSystemContext` (ou `appendSystemContext`) afin que les fournisseurs puissent mettre en cache le contenu stable du préfixe système.
- Conservez `prependContext` pour le contexte dynamique par tour qui doit rester lié au message de l'utilisateur.

## Plugins de fournisseur (auth model)

Les plugins peuvent enregistrer des **fournisseurs de modèles** afin que les utilisateurs puissent effectuer la configuration OAuth ou par clé d'API à l'intérieur d'OpenClaw, afficher la configuration du fournisseur lors de l'intégration/sélection de modèles, et contribuer à la découverte implicite de fournisseurs.

Les plugins de fournisseur constituent la surface d'extension modulaire pour la configuration des fournisseurs de modèles. Ils ne sont plus simplement des "assistants OAuth".

### Cycle de vie du plugin de fournisseur

Un plugin de fournisseur peut participer à cinq phases distinctes :

1. **Authentification**
   `auth[].run(ctx)` effectue l'OAuth, la capture de clé d'API, le code d'appareil ou une configuration personnalisée et renvoie des profils d'authentification ainsi que des correctifs de configuration facultatifs.
2. **Configuration non interactive**
   `auth[].runNonInteractive(ctx)` gère `openclaw onboard --non-interactive` sans invite. Utilisez ceci lorsque le fournisseur a besoin d'une configuration sans tête personnalisée au-delà des chemins de clé d'API simples intégrés.
3. **Intégration de l'assistant**
   `wizard.setup` ajoute une entrée à `openclaw onboard`.
   `wizard.modelPicker` ajoute une entrée de configuration au sélecteur de modèle.
4. **Découverte implicite**
   `discovery.run(ctx)` peut contribuer automatiquement à la configuration du fournisseur lors de la résolution/énumération des modèles.
5. **Suivi après sélection**
   `onModelSelected(ctx)` s'exécute après qu'un modèle a été choisi. Utilisez ceci pour des tâches spécifiques au fournisseur telles que le téléchargement d'un modèle local.

Il s'agit de la répartition recommandée car ces phases ont des exigences de cycle de vie différentes :

- l'authentification est interactive et écrit les informations d'identification/configuration
- la configuration non interactive est pilotée par des indicateurs/variables d'environnement et ne doit pas inviter l'utilisateur
- les métadonnées de l'assistant sont statiques et orientées interface utilisateur
- la découverte doit être sûre, rapide et tolérante aux échecs
- les hooks post-sélection sont des effets secondaires liés au modèle choisi

### Contrat d'authentification du fournisseur

`auth[].run(ctx)` renvoie :

- `profiles` : profils d'authentification à écrire
- `configPatch` : modifications `openclaw.json` facultatives
- `defaultModel` : référence `provider/model` facultative
- `notes` : notes destinées à l'utilisateur facultatives

Le cœur (Core) ensuite :

1. écrit les profils d'authentification renvoyés
2. applique le câblage de la configuration du profil d'authentification
3. fusionne le correctif de configuration
4. applique facultativement le modèle par défaut
5. exécute le hook `onModelSelected` du fournisseur lorsque cela est approprié

Cela signifie qu'un plugin de fournisseur possède la logique de configuration spécifique au fournisseur, tandis que le cœur possède le chemin générique de persistance et de fusion de configuration.

### Contrat non interactif du fournisseur

`auth[].runNonInteractive(ctx)` est facultatif. Implémentez-le lorsque le fournisseur a besoin d'une configuration sans interface utilisateur qui ne peut pas être exprimée via les flux génériques intégrés de clés API.

Le contexte non interactif inclut :

- la configuration actuelle et de base
- options d'CLI d'intégration analysées
- assistants de journalisation et d'erreur d'exécution
- répertoires agent/workspace afin que le fournisseur puisse rendre l'auth persistante dans le même magasin étendu utilisé par le reste de l'intégration
- `resolveApiKey(...)` pour lire les clés du fournisseur à partir des indicateurs, des variables d'environnement ou des profils d'auth existants tout en respectant `--secret-input-mode`
- `toApiKeyCredential(...)` pour convertir une clé résolue en informations d'identification de profil d'auth avec le stockage approprié en texte brut vs référence secrète

Utilisez cette surface pour les fournisseurs tels que :

- runtimes compatibles OpenAI auto-hébergés qui nécessitent `--custom-base-url` + `--custom-model-id`
- vérification non interactive ou synthèse de configuration spécifique au fournisseur

Ne pas inviter à partir de `runNonInteractive`. Rejetez plutôt les entrées manquantes avec des erreurs exploitables.

### Métadonnées de l'assistant fournisseur

Les métadonnées d'auth/intégration du fournisseur peuvent résider dans deux couches :

- `providerAuthChoices` du manifeste : étiquettes peu coûteuses, regroupement, identifiants `--auth-choice` et métadonnées simples d'indicateur CLI disponibles avant le chargement de l'exécution
- `wizard.setup` / `auth[].wizard` d'exécution : comportement plus riche qui dépend du code du fournisseur chargé

Utilisez les métadonnées de manifeste pour les étiquettes/indicateurs statiques. Utilisez les métadonnées de l'assistant d'exécution lorsque la configuration dépend de méthodes d'auth dynamiques, du repli de méthode ou de la validation d'exécution.

`wizard.setup` contrôle l'apparence du fournisseur dans l'intégration groupée :

- `choiceId` : valeur de choix d'auth
- `choiceLabel` : étiquette de l'option
- `choiceHint` : indice court
- `groupId` : identifiant du groupe
- `groupLabel` : étiquette du groupe
- `groupHint` : indice du groupe
- `methodId` : méthode d'auth à exécuter
- `modelAllowlist` : stratégie facultative de liste d'autorisation post-authentification (`allowedKeys`, `initialSelections`, `message`)

`wizard.modelPicker` contrôle l'apparence d'un provider en tant qu'entrée « configurer maintenant » dans la sélection de modèle :

- `label`
- `hint`
- `methodId`

Lorsqu'un provider possède plusieurs méthodes d'authentification, l'assistant peut soit pointer vers une méthode explicite, soit laisser OpenClaw synthétiser des choix par méthode.

OpenClaw valide les métadonnées de l'assistant du provider lors de l'enregistrement du plugin :

- les identifiants de méthode d'authentification en double ou vides sont rejetés
- les métadonnées de l'assistant sont ignorées lorsque le provider n'a pas de méthodes d'authentification
- les liaisons `methodId` non valides sont rétrogradées en avertissements et reviennent aux méthodes d'authentification restantes du provider

### Contrat de Discovery du provider

`discovery.run(ctx)` renvoie l'un des éléments suivants :

- `{ provider }`
- `{ providers }`
- `null`

Utilisez `{ provider }` pour le cas courant où le plugin possède un identifiant de provider. Utilisez `{ providers }` lorsqu'un plugin découvre plusieurs entrées de provider.

Le contexte de Discovery inclut :

- la configuration actuelle
- répertoires agent/workspace
- env du processus
- un assistant pour résoudre la clé d'API du provider et une valeur de clé d'API sécurisée pour la découverte

La Discovery doit être :

- rapide
- au mieux
- sûre à ignorer en cas d'échec
- prudente concernant les effets secondaires

Elle ne doit pas dépendre de invites ou d'une configuration de longue durée.

### Ordre de Discovery

La Discovery du provider s'exécute en phases ordonnées :

- `simple`
- `profile`
- `paired`
- `late`

Utilisez :

- `simple` pour une découverte peu coûteuse uniquement pour l'environnement
- `profile` lorsque la découverte dépend des profils d'authentification
- `paired` pour les providers qui doivent coordonner avec une autre étape de découverte
- `late` pour les sondages coûteux ou sur le réseau local

La plupart des providers auto-hébergés devraient utiliser `late`.

### Bonnes limites de plugins de provider

Bon ajustement pour les plugins de provider :

- fournisseurs locaux/auto-hébergés avec des flux de configuration personnalisés
- connexion OAuth/code d'appareil spécifique au fournisseur
- découverte implicite des serveurs de modèle locaux
- effets secondaires après sélection tels que les tirages (pulls) de modèle

Moins adapté :

- fournisseurs triviales avec clé API uniquement qui ne diffèrent que par env var, l'URL de base et un modèle par défaut

Ceux-ci peuvent toujours devenir des plugins, mais le principal gain de modularité vient de l'extraction préalable des fournisseurs riches en comportement.

Enregistrez un fournisseur via `api.registerProvider(...)`. Chaque fournisseur expose une ou plusieurs méthodes d'authentification (OAuth, clé API, code d'appareil, etc.). Ces méthodes peuvent alimenter :

- `openclaw models auth login --provider <id> [--method <id>]`
- `openclaw onboard`
- entrées de configuration « fournisseur personnalisé » du sélecteur de modèle
- découverte implicite de fournisseur lors de la résolution/liste des modèles

Exemple :

```ts
api.registerProvider({
  id: "acme",
  label: "AcmeAI",
  auth: [
    {
      id: "oauth",
      label: "OAuth",
      kind: "oauth",
      run: async (ctx) => {
        // Run OAuth flow and return auth profiles.
        return {
          profiles: [
            {
              profileId: "acme:default",
              credential: {
                type: "oauth",
                provider: "acme",
                access: "...",
                refresh: "...",
                expires: Date.now() + 3600 * 1000,
              },
            },
          ],
          defaultModel: "acme/opus-1",
        };
      },
    },
  ],
  wizard: {
    setup: {
      choiceId: "acme",
      choiceLabel: "AcmeAI",
      groupId: "acme",
      groupLabel: "AcmeAI",
      methodId: "oauth",
    },
    modelPicker: {
      label: "AcmeAI (custom)",
      hint: "Connect a self-hosted AcmeAI endpoint",
      methodId: "oauth",
    },
  },
  discovery: {
    order: "late",
    run: async () => ({
      provider: {
        baseUrl: "https://acme.example/v1",
        api: "openai-completions",
        apiKey: "${ACME_API_KEY}",
        models: [],
      },
    }),
  },
});
```

Notes :

- `run` reçoit un `ProviderAuthContext` avec `prompter`, `runtime`, `openUrl`, `oauth.createVpsAwareHandlers`, `secretInputMode` et les aides/états `allowSecretRefPrompt`. Les flux d'onboarding/configuration peuvent utiliser ceux-ci pour respecter `--secret-input-mode` ou offrir la capture de secret-ref env/file/exec, tandis que `openclaw models auth` maintient une surface d'invite plus restreinte.
- `runNonInteractive` reçoit un `ProviderAuthMethodNonInteractiveContext` avec les aides `opts`, `agentDir`, `resolveApiKey` et `toApiKeyCredential` pour un onboarding sans interface (headless).
- Retournez `configPatch` lorsque vous devez ajouter des modèles par défaut ou une configuration de fournisseur.
- Retournez `defaultModel` pour que `--set-default` puisse mettre à jour les valeurs par défaut de l'agent.
- `wizard.setup` ajoute un choix de fournisseur aux surfaces d'onboarding telles que `openclaw onboard` / `openclaw setup --wizard`.
- `wizard.setup.modelAllowlist` permet au fournisseur de restreindre l'invite de liste d'autorisation (allowlist) des modèles de suivi lors de l'onboarding/configuration.
- `wizard.modelPicker` ajoute une entrée « configurer ce fournisseur » au sélecteur de modèle.
- `deprecatedProfileIds` permet au provider de gérer le nettoyage de `openclaw doctor` pour
  les ids de profils d'authentification retirés.
- `discovery.run` renvoie soit `{ provider }` pour l'id provider du plugin
  lui-même soit `{ providers }` pour la découverte multi-provider.
- `discovery.order` contrôle quand le provider s'exécute par rapport aux phases
  de découverte intégrées : `simple`, `profile`, `paired` ou `late`.
- `onModelSelected` est le hook post-sélection pour le travail de suivi
  spécifique au provider, tel que le tirage d'un model local.

### Enregistrer un channel de messagerie

Les plugins peuvent enregistrer des **channel plugins** qui se comportent comme les channels
  intégrés (WhatsApp, Telegram, etc.). La config du channel se trouve sous `channels.<id>` et est
  validée par votre code de plugin de channel.

```ts
const myChannel = {
  id: "acmechat",
  meta: {
    id: "acmechat",
    label: "AcmeChat",
    selectionLabel: "AcmeChat (API)",
    docsPath: "/channels/acmechat",
    blurb: "demo channel plugin.",
    aliases: ["acme"],
  },
  capabilities: { chatTypes: ["direct"] },
  config: {
    listAccountIds: (cfg) => Object.keys(cfg.channels?.acmechat?.accounts ?? {}),
    resolveAccount: (cfg, accountId) =>
      cfg.channels?.acmechat?.accounts?.[accountId ?? "default"] ?? {
        accountId,
      },
  },
  outbound: {
    deliveryMode: "direct",
    sendText: async () => ({ ok: true }),
  },
};

export default function (api) {
  api.registerChannel({ plugin: myChannel });
}
```

Notes :

- Mettez la config sous `channels.<id>` (pas `plugins.entries`).
- `meta.label` est utilisé pour les étiquettes dans les listes CLI/UI.
- `meta.aliases` ajoute des ids alternatifs pour la normalisation et les entrées CLI.
- `meta.preferOver` liste les ids de channel à sauter pour l'auto-activation lorsque les deux sont configurés.
- `meta.detailLabel` et `meta.systemImage` permettent aux UI d'afficher des étiquettes/icônes de channel plus riches.

### Hooks de configuration de channel

Répartition de configuration préférée :

- `plugin.setup` gère la normalisation, la validation des ids de compte et l'écriture de la config.
- `plugin.setupWizard` permet à l'hôte d'exécuter le flux commun de l'assistant tandis que le channel ne fournit que les descripteurs de statut, d'identifiants, de liste d'autorisation DM et d'accès au channel.

`plugin.setupWizard` est préférable pour les channels qui correspondent au modèle partagé :

- un sélecteur de compte piloté par `plugin.config.listAccountIds`
- étape optionnelle de pré-vérification/préparation avant l'invite (par exemple, travail d'installateur/d'amorçage)
- invite de raccourci d'environnement optionnelle pour les ensembles d'identifiants regroupés (par exemple, jetons de bot/application jumelés)
- une ou plusieurs invites d'identifiants, chaque étape écrivant soit via `plugin.setup.applyAccountConfig` soit via un correctif partiel détenu par le channel
- invites de texte non secrets facultatifs (par exemple, chemins CLI, URL de base, identifiants de compte)
- invites de liste d'autorisation d'accès aux canaux/groupes facultatives résolues par l'hôte
- résolution de liste d'autorisation DM facultative (par exemple `@username` -> identifiant numérique)
- note de fin facultative après la fin de la configuration

### Écrire un nouveau canal de messagerie (étape par étape)

Utilisez ceci lorsque vous souhaitez une **nouvelle surface de chat** (un « canal de messagerie »), et non un fournisseur de modèle.
La documentation du fournisseur de modèle se trouve sous `/providers/*`.

1. Choisir un identifiant + une forme de configuration

- Toute la configuration du canal se trouve sous `channels.<id>`.
- Privilégiez `channels.<id>.accounts.<accountId>` pour les configurations multi-comptes.

2. Définir les métadonnées du canal

- `meta.label`, `meta.selectionLabel`, `meta.docsPath`, `meta.blurb` contrôlent les listes CLI/UI.
- `meta.docsPath` doit pointer vers une page de documentation comme `/channels/<id>`.
- `meta.preferOver` permet à un plugin de remplacer un autre canal (l'activation automatique le privilégie).
- `meta.detailLabel` et `meta.systemImage` sont utilisés par les interfaces utilisateur pour le texte de détail/les icônes.

3. Implémenter les adaptateurs requis

- `config.listAccountIds` + `config.resolveAccount`
- `capabilities` (types de chat, médias, fils de discussion, etc.)
- `outbound.deliveryMode` + `outbound.sendText` (pour l'envoi basique)

4. Ajouter des adaptateurs facultatifs si nécessaire

- `setup` (validation + écritures de configuration), `setupWizard` (assistant propriétaire de l'hôte), `security` (stratégie DM), `status` (santé/diagnostiques)
- `gateway` (démarrage/arrêt/connexion), `mentions`, `threading`, `streaming`
- `actions` (actions de message), `commands` (comportement de commande native)

5. Enregistrer le canal dans votre plugin

- `api.registerChannel({ plugin })`

Exemple de configuration minimale :

```json5
{
  channels: {
    acmechat: {
      accounts: {
        default: { token: "ACME_TOKEN", enabled: true },
      },
    },
  },
}
```

Plugin de canal minimal (sortie uniquement) :

```ts
const plugin = {
  id: "acmechat",
  meta: {
    id: "acmechat",
    label: "AcmeChat",
    selectionLabel: "AcmeChat (API)",
    docsPath: "/channels/acmechat",
    blurb: "AcmeChat messaging channel.",
    aliases: ["acme"],
  },
  capabilities: { chatTypes: ["direct"] },
  config: {
    listAccountIds: (cfg) => Object.keys(cfg.channels?.acmechat?.accounts ?? {}),
    resolveAccount: (cfg, accountId) =>
      cfg.channels?.acmechat?.accounts?.[accountId ?? "default"] ?? {
        accountId,
      },
  },
  outbound: {
    deliveryMode: "direct",
    sendText: async ({ text }) => {
      // deliver `text` to your channel here
      return { ok: true };
    },
  },
};

export default function (api) {
  api.registerChannel({ plugin });
}
```

Chargez le plugin (répertoire des extensions ou `plugins.load.paths`), redémarrez la passerelle,
alors configurez `channels.<id>` dans votre configuration.

### Outils d'agent

Voir le guide dédié : [Plugin agent tools](/fr/plugins/agent-tools).

### Enregistrer une méthode RPC de passerelle

```ts
export default function (api) {
  api.registerGatewayMethod("myplugin.status", ({ respond }) => {
    respond(true, { ok: true });
  });
}
```

### Enregistrer les commandes CLI

```ts
export default function (api) {
  api.registerCli(
    ({ program }) => {
      program.command("mycmd").action(() => {
        console.log("Hello");
      });
    },
    { commands: ["mycmd"] },
  );
}
```

### Enregistrer les commandes de réponse automatique

Les plugins peuvent enregistrer des commandes slash personnalisées qui s'exécutent **sans invoquer
l'agent IA**. Ceci est utile pour les commandes de basculement, les vérifications de statut ou les actions rapides
qui n'ont pas besoin du traitement LLM.

```ts
export default function (api) {
  api.registerCommand({
    name: "mystatus",
    description: "Show plugin status",
    handler: (ctx) => ({
      text: `Plugin is running! Channel: ${ctx.channel}`,
    }),
  });
}
```

Contexte du gestionnaire de commande :

- `senderId` : L'ID de l'expéditeur (si disponible)
- `channel` : Le channel où la commande a été envoyée
- `isAuthorizedSender` : Si l'expéditeur est un utilisateur autorisé
- `args` : Arguments passés après la commande (si `acceptsArgs: true`)
- `commandBody` : Le texte complet de la commande
- `config` : La configuration actuelle de OpenClaw

Options de commande :

- `name` : Nom de la commande (sans le `/` au début)
- `nativeNames` : Alias de commande native optionnels pour les surfaces slash/menu. Utilisez `default` pour tous les providers natifs, ou des clés spécifiques au provider comme `discord`
- `description` : Texte d'aide affiché dans les listes de commandes
- `acceptsArgs` : Si la commande accepte des arguments (par défaut : false). Si false et que des arguments sont fournis, la commande ne correspondra pas et le message sera transmis aux autres gestionnaires
- `requireAuth` : S'il faut exiger un expéditeur autorisé (par défaut : true)
- `handler` : Fonction qui renvoie `{ text: string }` (peut être asynchrone)

Exemple avec autorisation et arguments :

```ts
api.registerCommand({
  name: "setmode",
  description: "Set plugin mode",
  acceptsArgs: true,
  requireAuth: true,
  handler: async (ctx) => {
    const mode = ctx.args?.trim() || "default";
    await saveMode(mode);
    return { text: `Mode set to: ${mode}` };
  },
});
```

Notes :

- Les commandes du plugin sont traitées **avant** les commandes intégrées et l'agent IA
- Les commandes sont enregistrées globalement et fonctionnent sur tous les channels
- Les noms de commande ne sont pas sensibles à la casse (`/MyStatus` correspond à `/mystatus`)
- Les noms de commande doivent commencer par une lettre et contenir uniquement des lettres, des chiffres, des traits d'union et des tirets du bas
- Noms de commandes réservés (tels que `help`, `status`, `reset`, etc.) ne peuvent pas être remplacés par des plugins
- L'enregistrement de commandes en double sur plusieurs plugins échouera avec une erreur de diagnostic

### Enregistrer les services d'arrière-plan

```ts
export default function (api) {
  api.registerService({
    id: "my-service",
    start: () => api.logger.info("ready"),
    stop: () => api.logger.info("bye"),
  });
}
```

## Conventions de dénomination

- Méthodes du Gateway : `pluginId.action` (exemple : `voicecall.status`)
- Outils : `snake_case` (exemple : `voice_call`)
- Commandes CLI : kebab ou camel, mais évitez les conflits avec les commandes principales

## Compétences

Les plugins peuvent fournir une compétence dans le dépôt (`skills/<name>/SKILL.md`).
Activez-la avec `plugins.entries.<id>.enabled` (ou d'autres portes de configuration) et assurez-vous
qu'elle est présente dans vos emplacements de compétences gérées/de l'espace de travail.

## Distribution (npm)

Empaquetage recommandé :

- Paquet principal : `openclaw` (ce dépôt)
- Plugins : paquets npm séparés sous `@openclaw/*` (exemple : `@openclaw/voice-call`)

Contrat de publication :

- Le `package.json` du plugin doit inclure `openclaw.extensions` avec un ou plusieurs fichiers d'entrée.
- Optionnel : `openclaw.setupEntry` peut pointer vers une entrée de configuration légère pour une configuration de canal désactivée ou non encore configurée.
- Optionnel : `openclaw.startup.deferConfiguredChannelFullLoadUntilAfterListen` peut permettre à un plugin de canal d'utiliser `setupEntry` lors du démarrage de la passerelle pré-écoute, mais seulement lorsque cette entrée de configuration couvre entièrement la surface critique au démarrage du plugin.
- Les fichiers d'entrée peuvent être `.js` ou `.ts` (jiti charge le TS à l'exécution).
- `openclaw plugins install <npm-spec>` utilise `npm pack`, extrait dans `~/.openclaw/extensions/<id>/` et l'active dans la configuration.
- Stabilité des clés de configuration : les packages étendus sont normalisés vers l'ID **non étendu** pour `plugins.entries.*`.

## Exemple de plugin : Appel vocal

Ce dépôt comprend un plugin d'appel vocal (Twilio ou repli sur journal) :

- Source : `extensions/voice-call`
- Compétence : `skills/voice-call`
- CLI : `openclaw voicecall start|status`
- Outil : `voice_call`
- RPC : `voicecall.start`, `voicecall.status`
- Config (twilio) : `provider: "twilio"` + `twilio.accountSid/authToken/from` (`statusCallbackUrl`, `twimlUrl` facultatifs)
- Config (dev) : `provider: "log"` (pas de réseau)

Voir [Voice Call](/fr/plugins/voice-call) et `extensions/voice-call/README.md` pour la configuration et l'utilisation.

## Notes de sécurité

Les plugins s'exécutent en cours de processus avec le Gateway (voir [Execution model](#execution-model)) :

- N'installez que des plugins en lesquels vous avez confiance.
- Préférez les listes d'autorisation `plugins.allow`.
- N'oubliez pas que `plugins.allow` est basé sur l'identifiant, donc un plugin d'espace de travail activé peut
  intentionnellement masquer un plugin intégré avec le même identifiant.
- Redémarrez le Gateway après les modifications.

## Test des plugins

Les plugins peuvent (et doivent) inclure des tests :

- Les plugins dans le dépôt peuvent conserver les tests Vitest sous `src/**` (exemple : `src/plugins/voice-call.plugin.test.ts`).
- Les plugins publiés séparément doivent exécuter leur propre CI (lint/build/test) et valider que `openclaw.extensions` pointe vers le point d'entrée construit (`dist/index.js`).

import en from "/components/footer/en.mdx";

<en />
