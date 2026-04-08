---
summary: "Internes du plugin : modèle de capacité, propriété, contrats, pipeline de chargement et helpers d'exécution"
read_when:
  - Building or debugging native OpenClaw plugins
  - Understanding the plugin capability model or ownership boundaries
  - Working on the plugin load pipeline or registry
  - Implementing provider runtime hooks or channel plugins
title: "Internes du plugin"
sidebarTitle: "Internes"
---

# Internal des plugins

<Info>
  This is the **deep architecture reference**. For practical guides, see: - [Install and use plugins](/en/tools/plugin) — user guide - [Getting Started](/en/plugins/building-plugins) — first plugin tutorial - [Channel Plugins](/en/plugins/sdk-channel-plugins) — build a messaging channel - [Provider Plugins](/en/plugins/sdk-provider-plugins) — build a model provider - [SDK
  Overview](/en/plugins/sdk-overview) — import map and registration API
</Info>

Cette page couvre l'architecture interne du système de plugins OpenClaw.

## Modèle de capacité publique

Les capacités constituent le modèle **de plugin natif** public au sein de OpenClaw. Chaque
plugin natif OpenClaw s'enregistre pour un ou plusieurs types de capacités :

| Capacité               | Méthode d'enregistrement                         | Plugins exemples                     |
| ---------------------- | ------------------------------------------------ | ------------------------------------ |
| Inférence de texte     | `api.registerProvider(...)`                      | `openai`, `anthropic`                |
| Speech                 | `api.registerSpeechProvider(...)`                | `elevenlabs`, `microsoft`            |
| Realtime transcription | `api.registerRealtimeTranscriptionProvider(...)` | `openai`                             |
| Realtime voice         | `api.registerRealtimeVoiceProvider(...)`         | `openai`                             |
| Media understanding    | `api.registerMediaUnderstandingProvider(...)`    | `openai`, `google`                   |
| Image generation       | `api.registerImageGenerationProvider(...)`       | `openai`, `google`, `fal`, `minimax` |
| Music generation       | `api.registerMusicGenerationProvider(...)`       | `google`, `minimax`                  |
| Video generation       | `api.registerVideoGenerationProvider(...)`       | `qwen`                               |
| Web fetch              | `api.registerWebFetchProvider(...)`              | `firecrawl`                          |
| Web search             | `api.registerWebSearchProvider(...)`             | `google`                             |
| Channel / messaging    | `api.registerChannel(...)`                       | `msteams`, `matrix`                  |

A plugin that registers zero capabilities but provides hooks, tools, or
services is a **legacy hook-only** plugin. That pattern is still fully supported.

### External compatibility stance

The capability model is landed in core and used by bundled/native plugins
today, but external plugin compatibility still needs a tighter bar than "it is
exported, therefore it is frozen."

Current guidance:

- **existing external plugins:** keep hook-based integrations working; treat
  this as the compatibility baseline
- **nouveaux plugins groupés/natifs :** privilégier l'enregistrement explicite de capacités plutôt que
  les interventions spécifiques aux fournisseurs ou de nouvelles conceptions basées uniquement sur des hooks
- **plugins externes adoptant l'enregistrement de capacités :** autorisé, mais considérer les
  surfaces d'assistance spécifiques aux capacités comme évolutives, sauf si la documentation marque explicitement un
  contrat comme stable

Règle pratique :

- les API d'enregistrement des capacités sont la direction prévue
- les hooks hérités restent le chemin le plus sûr sans rupture pour les plugins externes pendant
  la transition
- les sous-chemins d'assistance exportés ne sont pas tous égaux ; privilégier le contrat documenté étroit,
  et non les exportations d'assistance incidentes

### Formes de plugins

OpenClaw classe chaque plugin chargé dans une forme basée sur son comportement d'enregistrement réel
(et pas seulement sur les métadonnées statiques) :

- **plain-capability** -- enregistre exactement un type de capacité (par exemple un
  plugin fournisseur uniquement comme `mistral`)
- **hybrid-capability** -- enregistre plusieurs types de capacités (par exemple
  `openai` possède l'inférence de texte, la parole, la compréhension des médias et la génération
  d'images)
- **hook-only** -- n'enregistre que des hooks (typés ou personnalisés), aucune capacité,
  outil, commande ou service
- **non-capability** -- enregistre des outils, commandes, services ou itinéraires mais aucune
  capacité

Utilisez `openclaw plugins inspect <id>` pour voir la forme d'un plugin et la répartition de ses capacités.
Voir [CLI reference](/en/cli/plugins#inspect) pour les détails.

### Hooks hérités

Le hook `before_agent_start` reste pris en charge en tant que chemin de compatibilité pour
les plugins basés uniquement sur des hooks. Les plugins hérités du monde réel en dépendent encore.

Direction :

- le garder fonctionnel
- le documenter comme hérité
- privilégier `before_model_resolve` pour le travail de substitution de model/provider
- privilégier `before_prompt_build` pour le travail de mutation de prompt
- ne supprimer qu'après la baisse de l'utilisation réelle et que la couverture des fixtures prouve la sécurité de la migration

### Signaux de compatibilité

Lorsque vous exécutez `openclaw doctor` ou `openclaw plugins inspect <id>`, vous pouvez voir
l'une de ces étiquettes :

| Signal                    | Signification                                                                |
| ------------------------- | ---------------------------------------------------------------------------- |
| **config valide**         | La configuration s'analyse correctement et les plugins sont résolus          |
| **avis de compatibilité** | Le plugin utilise un modèle pris en charge mais ancien (par ex. `hook-only`) |
| **avertissement hérité**  | Le plugin utilise `before_agent_start`, qui est obsolète                     |
| **erreur irrécupérable**  | La configuration n'est pas valide ou le plugin n'a pas pu être chargé        |

Ni `hook-only` ni `before_agent_start` ne briseront votre plugin aujourd'hui --
`hook-only` est consultatif, et `before_agent_start` ne déclenche qu'un avertissement. Ces
signaux apparaissent également dans `openclaw status --all` et `openclaw plugins doctor`.

## Aperçu de l'architecture

Le système de plugins de OpenClaw comporte quatre couches :

1. **Manifeste + découverte**
   OpenClaw trouve les plugins candidats dans les chemins configurés, les racines de l'espace de travail,
   les racines d'extensions globales et les extensions groupées. La découverte lit les manifestes natifs
   `openclaw.plugin.json` ainsi que les manifestes de bundles pris en charge en premier.
2. **Activation + validation**
   Le cœur décide si un plugin découvert est activé, désactivé, bloqué ou
   sélectionné pour un emplacement exclusif tel que la mémoire.
3. **Chargement de l'exécution**
   Les plugins natifs OpenClaw sont chargés en processus via jiti et enregistrent
   les capacités dans un registre central. Les bundles compatibles sont normalisés en
   enregistrements de registre sans importer le code d'exécution.
4. **Consommation de surface**
   Le reste de OpenClaw lit le registre pour exposer les outils, les canaux, la configuration du
   provider, les hooks, les routes HTTP, les commandes CLI et les services.

Pour le CLI des plugins spécifiquement, la découverte des commandes racines est divisée en deux phases :

- les métadonnées au moment de l'analyse proviennent de `registerCli(..., { descriptors: [...] })`
- le vrai module de CLI du plugin peut rester paresseux et s'enregistrer lors de la première invocation

Cela permet de garder le code CLI appartenant au plugin à l'intérieur du plugin tout en laissant OpenClaw
réserver les noms de commandes racines avant l'analyse.

La limite de conception importante :

- la découverte + validation de configuration devrait fonctionner à partir des **métadonnées de manifeste/schéma**
  sans exécuter le code du plugin
- le comportement d'exécution natif provient du chemin `register(api)` du module du plugin

Cette division permet à OpenClaw de valider la configuration, d'expliquer les plugins manquants/désactivés et de
construire des indices d'interface utilisateur/schéma avant que l'exécution complète ne soit active.

### Plugins de canal et l'outil de message partagé

Les plugins de canal n'ont pas besoin d'enregistrer un outil d'envoi/modification/réaction séparé pour
les actions de chat normales. OpenClaw conserve un outil `message` partagé dans le cœur, et
les plugins de canal possèdent la découverte et l'exécution spécifiques au canal derrière celui-ci.

La limite actuelle est :

- le cœur possède l'hôte shared `message` tool, le câblage des invites, la gestion de session/thread et la répartition de l'exécution
- les plugins de canal possèdent la découverte d'actions délimitée, la découverte de capacités et tous les fragments de schéma spécifiques au canal
- les plugins de canal possèdent la grammaire de conversation de session spécifique au fournisseur, telle que la manière dont les identifiants de conversation encodent les identifiants de thread ou héritent des conversations parentes
- les plugins de canal exécutent l'action finale via leur adaptateur d'action

Pour les plugins de canal, la surface du SDK est `ChannelMessageActionAdapter.describeMessageTool(...)`. Cet appel de découverte unifié permet à un plugin de renvoyer ses actions visibles, ses capacités et ses contributions de schéma ensemble, afin que ces éléments ne se dispersent pas.

Le cœur transmet la portée d'exécution à cette étape de découverte. Les champs importants incluent :

- `accountId`
- `currentChannelId`
- `currentThreadTs`
- `currentMessageId`
- `sessionKey`
- `sessionId`
- `agentId`
- inbound `requesterSenderId` de confiance

Cela est important pour les plugins sensibles au contexte. Un canal peut masquer ou exposer des actions de message en fonction du compte actif, de la salle/thread/message actuel, ou de l'identité du demandeur de confiance, sans coder en dur des branches spécifiques au canal dans l'`message` tool central.

C'est pourquoi les modifications de routage de l'exécuteur intégré restent un travail de plugin : l'exécuteur est responsable de la transmission de l'identité de chat/session actuelle dans la limite de découverte du plugin, afin que l'`message` tool partagé expose la bonne surface détenue par le canal pour le tour actuel.

Pour les assistants d'exécution détenus par le canal, les plugins groupés doivent conserver l'environnement d'exécution à l'intérieur de leurs propres modules d'extension. Le cœur ne possède plus les environnements d'exécution d'action de message Discord, Slack, Telegram ou WhatsApp sous `src/agents/tools`. Nous ne publions pas de sous-chemins `plugin-sdk/*-action-runtime` séparés, et les plugins groupés doivent importer leur propre code d'exécution local directement à partir de leurs modules détenus par l'extension.

La même limite s'applique généralement aux jonctions du SDK nommées par fournisseur : le cœur ne doit pas importer de modules de commodité spécifiques aux channels pour Slack, Discord, Signal,
WhatsApp, ou des extensions similaires. Si le cœur a besoin d'un comportement, il doit soit consommer le module `api.ts` / `runtime-api.ts` du plugin groupé, soit promouvoir ce besoin en une capacité générique et restreinte dans le SDK partagé.

Pour les sondages (polls) spécifiquement, il existe deux chemins d'exécution :

- `outbound.sendPoll` est la base commune pour les channels qui correspondent au modèle
  de sondage courant
- `actions.handleAction("poll")` est le chemin privilégié pour les sémantiques de sondage
  spécifiques au channel ou pour les paramètres de sondage supplémentaires

Le cœur reporte désormais l'analyse partagée des sondages jusqu'à ce que l'envoi de sondage du plugin décline l'action, ce qui permet aux gestionnaires de sondage détenus par le plugin d'accepter des champs de sondage spécifiques au channel sans être bloqués au préalable par l'analyseur de sondage générique.

Voir [Load pipeline](#load-pipeline) pour la séquence complète de démarrage.

## Modèle de propriété des capacités

OpenClaw considère un plugin natif comme la limite de propriété pour une **entreprise** ou une
**fonctionnalité**, et non comme un fourre-tout d'intégrations sans rapport.

Cela signifie :

- un plugin d'entreprise devrait généralement posséder toutes les interfaces de cette entreprise orientées vers OpenClaw
- un plugin de fonctionnalité devrait généralement posséder la surface complète de la fonctionnalité qu'il introduit
- les channels devraient consommer les capacités partagées du cœur au lieu de réimplémenter
  le comportement du provider ad hoc

Exemples :

- le plugin groupé `openai` possède le comportement de model-provider OpenAI et le comportement OpenAI
  speech + realtime-voice + media-understanding + image-generation
- le plugin groupé `elevenlabs` possède le comportement speech ElevenLabs
- le plugin groupé `microsoft` possède le comportement speech Microsoft
- le plugin groupé `google` possède le comportement de model-provider Google ainsi que les comportements Google
  media-understanding + image-generation + web-search
- le plugin groupé `firecrawl` possède le comportement web-fetch Firecrawl
- les plugins groupés `minimax`, `mistral`, `moonshot` et `zai` possèdent leurs
  backends media-understanding
- le plugin `qwen` intégré possède le comportement du fournisseur de texte Qwen ainsi que
  les comportements de compréhension des médias et de génération vidéo
- le plugin `voice-call` est un plugin de fonctionnalité : il possède le transport d'appel, les outils,
  la CLI, les routes et le pont de flux média Twilio, mais il consomme la parole partagée
  ainsi que les capacités de transcription en temps réel et de voix en temps réel au lieu de
  importer directement des plugins fournisseurs

L'état final prévu est :

- OpenAI réside dans un seul plugin même s'il couvre les modèles de texte, la parole, les images et
  la future vidéo
- un autre fournisseur peut faire de même pour sa propre surface
- les canaux ne se soucient pas de quel plugin fournisseur possède le fournisseur ; ils consomment le
  contrat de capacité partagée exposé par le cœur

C'est la distinction clé :

- **plugin** = limite de propriété
- **capacité** = contrat central que plusieurs plugins peuvent implémenter ou consommer

Ainsi, si OpenClaw ajoute un nouveau domaine tel que la vidéo, la première question n'est pas
« quel fournisseur doit coder en dur la gestion de la vidéo ? ». La première question est « quel est
le contrat de capacité vidéo central ? ». Une fois ce contrat existant, les plugins fournisseurs
peuvent s'y enregistrer et les plugins de canal/fonctionnalité peuvent le consommer.

Si la capacité n'existe pas encore, la bonne action est généralement :

1. définir la capacité manquante dans le cœur
2. l'exposer via l'API de plugin/runtime de manière typée
3. connecter les canaux/fonctionnalités à cette capacité
4. laisser les plugins fournisseurs enregistrer des implémentations

Cela garde la propriété explicite tout en évitant un comportement central qui dépend d'un
seul fournisseur ou d'un chemin de code spécifique à un plugin unique.

### Superposition des capacités

Utilisez ce modèle mental pour décider où le code appartient :

- **couche de capacité centrale** : orchestration partagée, politique, repli, règles de
  fusion de configuration, sémantique de livraison et contrats typés
- **couche de plugin fournisseur** : API spécifiques aux fournisseurs, auth, catalogues de modèles, synthèse
  vocale, génération d'images, backends vidéo futurs, points de terminaison d'utilisation
- **couche de plugin de canal/fonctionnalité** : intégration Slack/Discord/appel-vocal/etc.
  qui consomme les capacités centrales et les présente sur une surface

Par exemple, le TTS suit cette forme :

- le cœur possède la politique TTS de temps de réponse, l'ordre de repli, les préférences et la livraison par canal
- `openai`, `elevenlabs` et `microsoft` possèdent des implémentations de synthèse
- `voice-call` consomme l'assistant d'exécution TTS téléphonique

Ce même modèle devrait être privilégié pour les futures capacités.

### Exemple de plugin d'entreprise multi-capacités

Un plugin d'entreprise doit paraître cohérent de l'extérieur. Si OpenClaw dispose de contrats partagés pour les modèles, la parole, la transcription en temps réel, la voix en temps réel, la compréhension des médias, la génération d'images, la génération de vidéo, la récupération web et la recherche web, un fournisseur peut posséder toutes ses surfaces en un seul endroit :

```ts
import type { OpenClawPluginDefinition } from "openclaw/plugin-sdk/plugin-entry";
import { describeImageWithModel, transcribeOpenAiCompatibleAudio } from "openclaw/plugin-sdk/media-understanding";

const plugin: OpenClawPluginDefinition = {
  id: "exampleai",
  name: "ExampleAI",
  register(api) {
    api.registerProvider({
      id: "exampleai",
      // auth/model catalog/runtime hooks
    });

    api.registerSpeechProvider({
      id: "exampleai",
      // vendor speech config — implement the SpeechProviderPlugin interface directly
    });

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
- les tests de contrat peuvent affirmer que le plugin a enregistré les capacités
  qu'il prétend posséder

### Exemple de capacité : compréhension vidéo

OpenClaw traite déjà la compréhension d'image/audio/vidéo comme une capacité partagée unique. Le même modèle de propriété s'y applique :

1. le cœur définit le contrat de compréhension des médias
2. les plugins de fournisseur enregistrent `describeImage`, `transcribeAudio` et
   `describeVideo` selon le cas
3. les canaux et les plugins de fonctionnalités consomment le comportement central partagé au lieu de
   se connecter directement au code du fournisseur

Cela évite d'intégrer les hypothèses vidéo d'un seul fournisseur dans le cœur. Le plugin possède la surface du fournisseur ; le cœur possède le contrat de capacité et le comportement de repli.

La génération vidéo utilise déjà cette même séquence : le cœur possède le contrat de capacité typé et l'assistant d'exécution, et les plugins de fournisseur enregistrent des implémentations `api.registerVideoGenerationProvider(...)` par rapport à celui-ci.

Besoin d'une liste de contrôle de déploiement concrète ? Voir
[Capability Cookbook](/en/tools/capability-cookbook).

## Contrats et application

La surface API du plugin est intentionnellement typée et centralisée dans
`OpenClawPluginApi`. Ce contrat définit les points d'enregistrement pris en charge et les assistants d'exécution sur lesquels un plugin peut s'appuyer.

Pourquoi c'est important :

- les auteurs de plugins obtiennent une norme interne stable unique
- le cœur peut rejeter la propriété en double telle que l'enregistrement du même
  identifiant de fournisseur par deux plugins
- le démarrage peut afficher des diagnostics exploitables pour les enregistrements mal formés
- les tests de contrat peuvent appliquer la propriété des plugins groupés et empêcher la dérive silencieuse

Il existe deux niveaux d'application :

1. **application de l'inscription à l'exécution**
   Le registre de plugins valide les inscriptions lors du chargement des plugins. Exemples :
   les identifiants de provider en double, les identifiants de provider vocal en double et les
   inscriptions malformées produisent des diagnostics de plugin au lieu d'un comportement indéfini.
2. **tests de contrat**
   Les plugins groupés sont capturés dans les registres de contrats lors des exécutions de tests afin que
   OpenClaw puisse affirmer explicitement la propriété. Aujourd'hui, cela est utilisé pour les providers de modèle,
   les providers vocaux, les providers de recherche Web et la propriété des inscriptions groupées.

L'effet pratique est que OpenClaw sait, à l'avance, quel plugin possède quelle
surface. Cela permet au core et aux channels de composer de manière transparente car la propriété est
déclarée, typée et testable plutôt qu'implicite.

### Ce qui appartient à un contrat

Les bons contrats de plugin sont :

- typés
- petits
- spécifiques à la capacité
- détenus par le core
- réutilisables par plusieurs plugins
- consommables par les channels/fonctionnalités sans connaissance du fournisseur

Les mauvais contrats de plugin sont :

- stratégie spécifique au fournisseur cachée dans le core
- échappatoires ponctuelles pour plugins qui contournent le registre
- code de channel accédant directement à une implémentation de fournisseur
- objets d'exécution ad hoc qui ne font pas partie de `OpenClawPluginApi` ou
  `api.runtime`

En cas de doute, augmentez le niveau d'abstraction : définissez d'abord la capacité, puis
laissez les plugins s'y connecter.

## Modèle d'exécution

Les plugins natifs OpenClaw s'exécutent **in-process** avec le Gateway. Ils ne sont pas
sandboxés. Un plugin natif chargé a la même limite de confiance au niveau du processus que
le code core.

Implications :

- un plugin natif peut inscrire des outils, des gestionnaires réseau, des hooks et des services
- un bogue de plugin natif peut planter ou déstabiliser la passerelle
- un plugin natif malveillant équivaut à une exécution de code arbitraire à l'intérieur
  du processus OpenClaw

Les bundles compatibles sont plus sûrs par défaut car OpenClaw les traite actuellement
comme des packs de métadonnées/contenu. Dans les versions actuelles, cela signifie principalement les compétences groupées.

Utilisez des listes d'autorisation et des chemins d'installation/chargement explicites pour les plugins non groupés. Traitez
les plugins de l'espace de travail comme du code de développement, pas par défaut pour la production.

Pour les noms de packages de workspace regroupés, conservez l'identifiant du plugin ancré dans le nom npm : `@openclaw/<id>` par défaut, ou un suffixe typé approuvé tel que `-provider`, `-plugin`, `-speech`, `-sandbox` ou `-media-understanding` lorsque le package expose intentionnellement un rôle de plugin plus étroit.

Note importante sur la confiance :

- `plugins.allow` fait confiance aux **identifiants de plugin**, et non à la provenance de la source.
- Un plugin de workspace avec le même identifiant qu'un plugin regroupé remplace intentionnellement la copie regroupée lorsque ce plugin de workspace est activé/autorisé.
- Ceci est normal et utile pour le développement local, les tests de correctifs et les correctifs urgents.

## Limite d'exportation

OpenClaw exporte des capacités, et non des commodités de mise en œuvre.

Gardez l'enregistrement des capacités public. Réduisez les exports d'assistance non contractuels :

- sous-chemins d'assistance spécifiques aux plugins regroupés
- sous-chemins de plomberie d'exécution non destinés à être une API publique
- assistants de commodité spécifiques aux vendeurs
- assistants de configuration/onboarding qui sont des détails de mise en œuvre

Certains sous-chemins d'assistance de plugins regroupés demeurent encore dans la carte d'export SDK générée pour la compatibilité et la maintenance des plugins regroupés. Les exemples actuels incluent `plugin-sdk/feishu`, `plugin-sdk/feishu-setup`, `plugin-sdk/zalo`, `plugin-sdk/zalo-setup` et plusieurs jointures `plugin-sdk/matrix*`. Traitez-les comme des exports de détails de mise en œuvre réservés, et non comme le modèle SDK recommandé pour les nouveaux plugins tiers.

## Pipeline de chargement

Au démarrage, OpenClaw fait ceci, en gros :

1. découvrir les racines candidates de plugins
2. lire les manifests natifs ou compatibles et les métadonnées de package
3. rejeter les candidats non sécurisés
4. normaliser la config du plugin (`plugins.enabled`, `allow`, `deny`, `entries`, `slots`, `load.paths`)
5. décider de l'activation pour chaque candidat
6. charger les modules natifs activés via jiti
7. appeler les hooks natifs `register(api)` (ou `activate(api)` — un alias legacy) et collecter les enregistrements dans le registre de plugins
8. exposer le registre aux surfaces de commandes/d'exécution

<Note>`activate` est un alias historique pour `register` — le chargeur résout celui qui est présent (`def.register ?? def.activate`) et l'appelle au même moment. Tous les plugins intégrés utilisent `register` ; préférez `register` pour les nouveaux plugins.</Note>

Les barrières de sécurité se produisent **avant** l'exécution du runtime. Les candidats sont bloqués lorsque l'entrée sort de la racine du plugin, que le chemin est accessible en écriture par tous, ou que la propriété du chemin semble suspecte pour les plugins non intégrés.

### Comportement basé d'abord sur le manifeste

Le manifeste est la source de vérité du plan de contrôle. OpenClaw l'utilise pour :

- identifier le plugin
- découvrir les canaux/compétences/schémas de configuration déclarés ou les capacités du bundle
- valider `plugins.entries.<id>.config`
- augmenter les étiquettes/espaces réservés de l'interface utilisateur de contrôle
- afficher les métadonnées d'installation/catalogue

Pour les plugins natifs, le module d'exécution est la partie du plan de données. Il enregistre le comportement réel tel que les hooks, les outils, les commandes ou les flux du provider.

### Ce que le chargeur met en cache

OpenClaw conserve des caches en processus de courte durée pour :

- les résultats de découverte
- les données du registre de manifeste
- les registres de plugins chargés

Ces caches réduisent la surcharge de démarrage en rafale et des commandes répétées. Il est prudent de les considérer comme des caches de performance à courte durée de vie, et non comme de la persistance.

Note de performance :

- Définissez `OPENCLAW_DISABLE_PLUGIN_DISCOVERY_CACHE=1` ou
  `OPENCLAW_DISABLE_PLUGIN_MANIFEST_CACHE=1` pour désactiver ces caches.
- Ajustez les fenêtres de cache avec `OPENCLAW_PLUGIN_DISCOVERY_CACHE_MS` et
  `OPENCLAW_PLUGIN_MANIFEST_CACHE_MS`.

## Modèle de registre

Les plugins chargés ne modifient pas directement les variables globales principales aléatoires. Ils s'inscrivent dans un registre central de plugins.

Le registre suit :

- les enregistrements de plugins (identité, source, origine, statut, diagnostics)
- les outils
- les hooks historiques et les hooks typés
- les canaux
- les providers
- les gestionnaires de passerelle RPC
- les routes HTTP
- les registraires CLI
- les services d'arrière-plan
- les commandes détenues par le plugin

Les fonctionnalités principales lisent ensuite ce registre au lieu de communiquer directement avec les modules de plugins. Cela maintient le chargement à sens unique :

- module de plugin -> enregistrement dans le registre
- runtime principal -> consommation du registre

Cette séparation est importante pour la maintenabilité. Cela signifie que la plupart des surfaces principales n'ont besoin que d'un point d'intégration : « lire le registre », et non « cas particulier pour chaque module de plugin ».

## Rappels de liaison de conversation

Les plugins qui lient une conversation peuvent réagir lorsqu'une approbation est résolue.

Utilisez `api.onConversationBindingResolved(...)` pour recevoir un rappel après qu'une demande de liaison est approuvée ou refusée :

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

Champs de la charge utile du rappel :

- `status` : `"approved"` ou `"denied"`
- `decision` : `"allow-once"`, `"allow-always"`, ou `"deny"`
- `binding` : la liaison résolue pour les demandes approuvées
- `request` : le résumé de la demande originale, l'indice de détachement, l'identifiant de l'expéditeur et les métadonnées de la conversation

Ce rappel est une simple notification. Il ne modifie pas qui est autorisé à lier une conversation, et il s'exécute après la fin du traitement de l'approbation principale.

## Hooks d'exécution du fournisseur

Les plugins de fournisseur ont désormais deux couches :

- métadonnées de manifeste : `providerAuthEnvVars` pour une recherche auth-env peu coûteuse avant le chargement de l'exécution, plus `providerAuthChoices` pour les étiquettes d'onboarding/choix d'authentification et les métadonnées de drapeau CLI peu coûteuses avant le chargement de l'exécution
- hooks de configuration : `catalog` / ancien `discovery` plus `applyConfigDefaults`
- runtime hooks : `normalizeModelId`, `normalizeTransport`,
  `normalizeConfig`,
  `applyNativeStreamingUsageCompat`, `resolveConfigApiKey`,
  `resolveSyntheticAuth`, `shouldDeferSyntheticProfileAuth`,
  `resolveDynamicModel`, `prepareDynamicModel`, `normalizeResolvedModel`,
  `contributeResolvedModelCompat`, `capabilities`,
  `normalizeToolSchemas`, `inspectToolSchemas`,
  `resolveReasoningOutputMode`, `prepareExtraParams`, `createStreamFn`,
  `wrapStreamFn`, `resolveTransportTurnState`,
  `resolveWebSocketSessionPolicy`, `formatApiKey`, `refreshOAuth`,
  `buildAuthDoctorHint`, `matchesContextOverflowError`,
  `classifyFailoverReason`, `isCacheTtlEligible`,
  `buildMissingAuthMessage`, `suppressBuiltInModel`, `augmentModelCatalog`,
  `isBinaryThinking`, `supportsXHighThinking`,
  `resolveDefaultThinkingLevel`, `isModernModelRef`, `prepareRuntimeAuth`,
  `resolveUsageAuth`, `fetchUsageSnapshot`, `createEmbeddingProvider`,
  `buildReplayPolicy`,
  `sanitizeReplayHistory`, `validateReplayTurns`, `onModelSelected`

OpenClaw possède toujours la boucle d'agent générique, le basculement (failover), la gestion des transcriptions et la politique d'outil. Ces hooks constituent la surface d'extension pour les comportements spécifiques au fournisseur sans avoir besoin d'un transport d'inférence entièrement personnalisé.

Utilisez le manifeste `providerAuthEnvVars` lorsque le fournisseur possède des informations d'identification basées sur l'environnement que les chemins d'authentification, de statut ou de sélecteur de modèle génériques doivent voir sans charger le runtime du plugin. Utilisez le manifeste `providerAuthChoices` lorsque les surfaces CLI d'intégration/choix d'auth doivent connaître l'identifiant de choix du fournisseur, les étiquettes de groupe et le câblage d'auth simple à un indicateur sans charger le runtime du fournisseur. Conservez le `envVars` du runtime du fournisseur pour les indications destinées aux opérateurs, telles que les étiquettes d'intégration ou les variables de configuration client-id/client-secret OAuth.

### Ordre et utilisation des hooks

Pour les plugins de OpenClaw/fournisseur, OpenClaw appelle les hooks dans cet ordre approximatif.
La colonne « Quand utiliser » est le guide de décision rapide.

| #   | Hook                              | Ce qu'il fait                                                                                                                                       | Quand utiliser                                                                                                                                                                                                                      |
| --- | --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `catalog`                         | Publier la configuration du fournisseur dans `models.providers` lors de la génération `models.json`                                                 | Le fournisseur possède un catalogue ou des URL par défaut                                                                                                                                                                           |
| 2   | `applyConfigDefaults`             | Appliquer les valeurs par défaut de configuration globale détenues par le fournisseur lors de la matérialisation de la configuration                | Les valeurs par défaut dépendent du mode d'authentification, de l'environnement ou de la sémantique de la famille de modèles du fournisseur                                                                                         |
| --  | _(recherche de modèle intégrée)_  | OpenClaw essaie d'abord le chemin normal du registre/catalogue                                                                                      | _(pas un hook de plugin)_                                                                                                                                                                                                           |
| 3   | `normalizeModelId`                | Normaliser les alias d'ID de modèle hérités ou en aperçu avant la recherche                                                                         | Le fournisseur gère le nettoyage des alias avant la résolution du modèle canonique                                                                                                                                                  |
| 4   | `normalizeTransport`              | Normaliser les `api` / `baseUrl` de la famille du fournisseur avant l'assemblage du modèle générique                                                | Le fournisseur gère le nettoyage du transport pour les ID de fournisseur personnalisés dans la même famille de transport                                                                                                            |
| 5   | `normalizeConfig`                 | Normaliser `models.providers.<id>` avant la résolution du runtime/fournisseur                                                                       | Le fournisseur a besoin d'un nettoyage de configuration qui doit résider avec le plugin ; les helpers groupés de la famille Google servent également de filet de sécurité pour les entrées de configuration Google prises en charge |
| 6   | `applyNativeStreamingUsageCompat` | Appliquer les réécritures de compatibilité d'utilisation du streaming natif aux fournisseurs de configuration                                       | Le fournisseur a besoin de corrections de métadonnées d'utilisation du streaming natif pilotées par le point de terminaison                                                                                                         |
| 7   | `resolveConfigApiKey`             | Résoudre l'authentification par marqueur d'environnement pour les fournisseurs de configuration avant le chargement de l'authentification runtime   | Le fournisseur dispose d'une résolution de clé API par marqueur d'environnement propre au fournisseur ; `amazon-bedrock` dispose également ici d'un résolveur intégré pour les marqueurs d'environnement AWS                        |
| 8   | `resolveSyntheticAuth`            | Rendre visible l'authentification locale/auto-hébergée ou basée sur la configuration sans persister le texte en clair                               | Le fournisseur peut fonctionner avec un marqueur d'identification synthétique/local                                                                                                                                                 |
| 9   | `shouldDeferSyntheticProfileAuth` | Abaisser les espaces réservés de profil synthétique stockés derrière une authentification basée sur l'environnement/la configuration                | Le fournisseur stocke des profils d'espace réservé synthétiques qui ne doivent pas avoir la priorité                                                                                                                                |
| 10  | `resolveDynamicModel`             | Fallback synchrone pour les ID de modèle détenus par le fournisseur qui ne sont pas encore dans le registre local                                   | Le provider accepte des identifiants de modèle en amont arbitraires                                                                                                                                                                 |
| 11  | `prepareDynamicModel`             | Préchauffage asynchrone, puis `resolveDynamicModel` s'exécute à nouveau                                                                             | Le provider a besoin des métadonnées réseau avant de résoudre les identifiants inconnus                                                                                                                                             |
| 12  | `normalizeResolvedModel`          | Réécriture finale avant que le runner intégré n'utilise le modèle résolu                                                                            | Le provider a besoin de réécritures de transport mais utilise toujours un transport de base                                                                                                                                         |
| 13  | `contributeResolvedModelCompat`   | Contribuer aux drapeaux de compatibilité pour les modèles fournisseurs derrière un autre transport compatible                                       | Le provider reconnaît ses propres modèles sur les transports proxy sans prendre le pas sur le provider                                                                                                                              |
| 14  | `capabilities`                    | Métadonnées de retranscription/outillage appartenant au provider utilisées par la logique de base partagée                                          | Le provider a besoin de particularités de retranscription/famille de providers                                                                                                                                                      |
| 15  | `normalizeToolSchemas`            | Normaliser les schémas d'outils avant que le runner intégré ne les voie                                                                             | Le provider a besoin d'un nettoyage de schéma de la famille de transport                                                                                                                                                            |
| 16  | `inspectToolSchemas`              | Afficher les diagnostics de schéma appartenant au provider après normalisation                                                                      | Le provider souhaite des avertissements de mots-clés sans enseigner de règles spécifiques au provider au core                                                                                                                       |
| 17  | `resolveReasoningOutputMode`      | Sélectionner le contrat de sortie de raisonnement natif ou balisé                                                                                   | Le provider a besoin d'une sortie de raisonnement/finale balisée au lieu de champs natifs                                                                                                                                           |
| 18  | `prepareExtraParams`              | Normalisation des paramètres de requête avant les wrappers d'options de flux génériques                                                             | Le provider a besoin de paramètres de requête par défaut ou d'un nettoyage des paramètres par provider                                                                                                                              |
| 19  | `createStreamFn`                  | Remplacer entièrement le chemin de flux normal par un transport personnalisé                                                                        | Le provider a besoin d'un protocole filaire personnalisé, pas seulement d'un wrapper                                                                                                                                                |
| 20  | `wrapStreamFn`                    | Wrapper de flux après l'application des wrappers génériques                                                                                         | Le provider a besoin de wrappers de compatibilité d'en-têtes/corps/modèle de requête sans transport personnalisé                                                                                                                    |
| 21  | `resolveTransportTurnState`       | Attacher les en-têtes ou métadonnées de transport natifs par tour                                                                                   | Le provider souhaite que les transports génériques envoient l'identité de tour native du provider                                                                                                                                   |
| 22  | `resolveWebSocketSessionPolicy`   | Attacher les en-têtes WebSocket natifs ou la politique de refroidissement de session                                                                | Le provider souhaite que les transports WS génériques ajustent les en-têtes de session ou la politique de repli                                                                                                                     |
| 23  | `formatApiKey`                    | Formateur de profil d'authentification : le profil stocké devient la chaîne d'exécution `apiKey`                                                    | Le provider stocke des métadonnées d'auth supplémentaires et a besoin d'une forme de token d'exécution personnalisée                                                                                                                |
| 24  | `refreshOAuth`                    | Remplacement du rafraîchissement OAuth pour les points de terminaison de rafraîchissement personnalisés ou la stratégie d'échec de rafraîchissement | Le provider ne correspond pas aux rafraîchisseurs partagés `pi-ai`                                                                                                                                                                  |
| 25  | `buildAuthDoctorHint`             | Indication de réparation ajoutée lorsque le rafraîchissement OAuth échoue                                                                           | Le provider nécessite des directives de réparation d'auth possédées par le provider après un échec de rafraîchissement                                                                                                              |
| 26  | `matchesContextOverflowError`     | Correspondance de dépassement de fenêtre de contexte possédée par le provider                                                                       | Le provider a des erreurs brutes de dépassement que les heuristiques génériques manqueraient                                                                                                                                        |
| 27  | `classifyFailoverReason`          | Classification du motif de basculement possédée par le provider                                                                                     | Le provider peut mapper les erreurs brutes API/transport à limite de taux/surcharge/etc.                                                                                                                                            |
| 28  | `isCacheTtlEligible`              | Stratégie de cache de prompt pour les providers proxy/backhaul                                                                                      | Le provider nécessite une porte TTL de cache spécifique au proxy                                                                                                                                                                    |
| 29  | `buildMissingAuthMessage`         | Remplacement du message générique de récupération d'auth manquante                                                                                  | Le provider nécessite une indication de récupération d'auth manquante spécifique au provider                                                                                                                                        |
| 30  | `suppressBuiltInModel`            | Suppression de modèle amont obsolète plus indication d'erreur utilisateur facultative                                                               | Le provider doit masquer les lignes amont obsolètes ou les remplacer par une indication de fournisseur                                                                                                                              |
| 31  | `augmentModelCatalog`             | Lignes de catalogue synthétiques/finales ajoutées après la découverte                                                                               | Le provider nécessite des lignes de rétrocompatibilité synthétiques dans `models list` et les sélecteurs                                                                                                                            |
| 32  | `isBinaryThinking`                | Commutateur de raisonnement on/off pour les providers à pensée binaire                                                                              | Le provider expose uniquement la pensée binaire on/off                                                                                                                                                                              |
| 33  | `supportsXHighThinking`           | Support de raisonnement `xhigh` pour les modèles sélectionnés                                                                                       | Le provider souhaite `xhigh` uniquement sur un sous-ensemble de modèles                                                                                                                                                             |
| 34  | `resolveDefaultThinkingLevel`     | Niveau `/think` par défaut pour une famille de modèles spécifique                                                                                   | Le provider possède la stratégie `/think` par défaut pour une famille de modèles                                                                                                                                                    |
| 35  | `isModernModelRef`                | Correspondance de modèle moderne pour les filtres de profil en direct et la sélection de smoke                                                      | Le provider possède la correspondance de modèle préféré live/smoke                                                                                                                                                                  |
| 36  | `prepareRuntimeAuth`              | Échanger une information d'identification configurée contre le token/clé d'exécution réel juste avant l'inférence                                   | Le fournisseur a besoin d'un échange de jetons ou d'informations d'identification de requête éphémères                                                                                                                              |
| 37  | `resolveUsageAuth`                | Résoudre les informations d'identification d'utilisation/de facturation pour `/usage` et les surfaces d'état associées                              | Le fournisseur a besoin d'un analyseur personnalisé de jetons d'utilisation/quota ou d'informations d'identification d'utilisation différentes                                                                                      |
| 38  | `fetchUsageSnapshot`              | Récupérer et normaliser les instantanés d'utilisation/quota spécifiques au fournisseur après résolution de l'authentification                       | Le fournisseur a besoin d'un point de terminaison d'utilisation ou d'un analyseur de charge utile spécifique au fournisseur                                                                                                         |
| 39  | `createEmbeddingProvider`         | Construire un adaptateur d'intégration détenu par le fournisseur pour la mémoire/recherche                                                          | Le comportement d'intégration de la mémoire appartient au plugin du fournisseur                                                                                                                                                     |
| 40  | `buildReplayPolicy`               | Renvoyer une stratégie de relecture contrôlant le traitement des transcripts pour le fournisseur                                                    | Le fournisseur a besoin d'une stratégie de transcript personnalisée (par exemple, suppression des blocs de réflexion)                                                                                                               |
| 41  | `sanitizeReplayHistory`           | Réécrire l'historique de relecture après le nettoyage générique du transcript                                                                       | Le fournisseur a besoin de réécritures de relecture spécifiques au fournisseur au-delà des helpers de compactage partagés                                                                                                           |
| 42  | `validateReplayTurns`             | Validation ou remodelage final du tour de relecture avant le moteur intégré                                                                         | Le transport du fournisseur a besoin d'une validation de tour plus stricte après la désinfection générique                                                                                                                          |
| 43  | `onModelSelected`                 | Exécuter les effets secondaires après sélection détenus par le fournisseur                                                                          | Le fournisseur a besoin de télémétrie ou d'état détenu par le fournisseur lorsqu'un modèle devient actif                                                                                                                            |

`normalizeModelId`, `normalizeTransport`, et `normalizeConfig` vérifient d'abord le
plugin fournisseur correspondant, puis passent aux autres plugins fournisseurs capables de hooks
jusqu'à ce que l'un modifie réellement l'id de modèle ou le transport/config. Cela permet
de garder les shims de fournisseur alias/compat fonctionnels sans obliger l'appelant à savoir quel
plugin groupé possède la réécriture. Si aucun hook fournisseur ne réécrit une entrée de config
de la famille Google prise en charge, le normaliseur de config Google groupé applique toujours
ce nettoyage de compatibilité.

Si le fournisseur a besoin d'un protocole filaire entièrement personnalisé ou d'un exécuteur de requête personnalisé,
c'est une classe d'extension différente. Ces hooks sont pour le comportement du fournisseur
qui s'exécute toujours sur la boucle d'inférence normale d'OpenClaw.

### Exemple de fournisseur

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
  `resolveDefaultThinkingLevel`, `applyConfigDefaults`, `isModernModelRef`,
  et `wrapStreamFn` car il possède la compatibilité avant de Claude 4.6,
  les indications de famille de provider, les conseils de réparation d'authentification,
  l'intégration du point de terminaison d'utilisation, l'éligibilité au cache de prompt,
  les configurations par défaut conscientes de l'authentification, la stratégie de
  pensée par défaut/adaptive de Claude, et la mise en forme de flux spécifique à
  Anthropic pour les en-têtes bêta, `/fast` / `serviceTier`, et `context1m`.
- Les assistants de flux spécifiques à Claude de Anthropic restent pour l'instant
  dans la couture publique `api.ts` / `contract-api.ts` du plugin groupé.
  Cette surface de package exporte `wrapAnthropicProviderStream`, `resolveAnthropicBetas`,
  `resolveAnthropicFastMode`, `resolveAnthropicServiceTier`, et les constructeurs de wrapper de
  bas niveau Anthropic au lieu d'élargir le SDK générique autour des règles
  d'en-tête bêta d'un seul provider.
- OpenAI utilise `resolveDynamicModel`, `normalizeResolvedModel`, et
  `capabilities` ainsi que `buildMissingAuthMessage`, `suppressBuiltInModel`,
  `augmentModelCatalog`, `supportsXHighThinking`, et `isModernModelRef`
  car il possède la compatibilité avant de GPT-5.4, la normalisation directe OpenAI
  `openai-completions` -> `openai-responses`, les indications d'authentification
  conscientes de Codex, la suppression Spark, les lignes de liste synthétiques OpenAI,
  et la stratégie de pensée GPT-5 / de model en direct ; la famille de flux `openai-responses-defaults` possède
  les wrappers de réponses natifs OpenAI partagés pour les en-têtes d'attribution,
  `/fast`/`serviceTier`, la verbosité du texte, la recherche web Codex native,
  la mise en forme de payload compatible raisonnement, et la gestion du contexte des réponses.
- OpenRouter utilise `catalog` ainsi que `resolveDynamicModel` et `prepareDynamicModel` car le provider est transparent (pass-through) et peut exposer de nouveaux IDs de model avant la mise à jour du catalogue statique d'OpenClaw ; il utilise également `capabilities`, `wrapStreamFn` et `isCacheTtlEligible` pour garder les en-têtes de requête spécifiques au provider, les métadonnées de routage, les correctifs de raisonnement et la stratégie de prompt-cache en dehors du cœur. Sa stratégie de relecture provient de la famille `passthrough-gemini`, tandis que la famille de flux `openrouter-thinking` possède l'injection de raisonnement proxy et les sauts pour les modèles non pris en charge / `auto`.
- GitHub Copilot utilise `catalog`, `auth`, `resolveDynamicModel` et `capabilities` ainsi que `prepareRuntimeAuth` et `fetchUsageSnapshot` car il a besoin d'une connexion appareil propriétaire au provider, d'un comportement de repli de model, de particularités des transcriptions Claude, d'un échange de jeton GitHub vers jeton Copilot et d'un point de terminaison d'utilisation propriétaire au provider.
- OpenAI Codex utilise `catalog`, `resolveDynamicModel`, `normalizeResolvedModel`, `refreshOAuth` et `augmentModelCatalog` ainsi que `prepareExtraParams`, `resolveUsageAuth` et `fetchUsageSnapshot` car il fonctionne toujours sur les transports OpenAI centraux mais possède sa propre normalisation de l'URL de base/de transport, sa stratégie de repli de rafraîchissement OAuth, son choix de transport par défaut, ses lignes de catalogue Codex synthétiques et son intégration au point de terminaison d'utilisation ChatGPT ; il partage la même famille de flux `openai-responses-defaults` qu'OpenAI direct.
- Google AI Studio et Gemini CLI OAuth utilisent `resolveDynamicModel`,
  `buildReplayPolicy`, `sanitizeReplayHistory`,
  `resolveReasoningOutputMode`, `wrapStreamFn` et `isModernModelRef` car la
  famille de rejeu `google-gemini` possède la compatibilité future de Gemini 3.1,
  la validation native du rejeu Gemini, le nettoyage du rejeu d'amorçage, le mode de
  sortie de raisonnement balisé et la correspondance des modèles modernes, tandis que la
  famille de flux `google-thinking` possède la normalisation des charges utiles de réflexion Gemini ;
  Gemini CLI OAuth utilise également `formatApiKey`, `resolveUsageAuth` et
  `fetchUsageSnapshot` pour le formatage des jetons, l'analyse des jetons et le câblage
  du endpoint de quota.
- Anthropic Vertex utilise `buildReplayPolicy` via la
  famille de rejeu `anthropic-by-model` afin que le nettoyage du rejeu spécifique à Claude
  reste limité aux identifiants Claude plutôt qu'à chaque transport `anthropic-messages`.
- Amazon Bedrock utilise `buildReplayPolicy`, `matchesContextOverflowError`,
  `classifyFailoverReason` et `resolveDefaultThinkingLevel` car il possède
  la classification des erreurs de limitation/non prêt/débordement de contexte spécifique à Bedrock
  pour le trafic Anthropic-sur-Bedrock ; sa politique de rejeu partage toujours la même
  garde `anthropic-by-model` réservée à Claude.
- OpenRouter, Kilocode, Opencode et Opencode Go utilisent `buildReplayPolicy`
  via la famille de rejeu `passthrough-gemini` car ils mandattent des modèles
  Gemini via des transports compatibles OpenAI et ont besoin du nettoyage des
  signatures de pensée Gemini sans validation de rejeu Gemini native ou
  réécritures d'amorçage.
- MiniMax utilise `buildReplayPolicy` via la
  famille de rejeu `hybrid-anthropic-openai` car un fournisseur possède à la fois les
  sémantiques de message Anthropic et compatibles OpenAI ; il conserve le rejet des blocs de pensée
  réservés à Claude du côté Anthropic tout en remplaçant le mode de sortie
  de raisonnement par natif, et la famille de flux `minimax-fast-mode` possède
  les réécritures de modèle en mode rapide sur le chemin de flux partagé.
- Moonshot utilise `catalog` ainsi que `wrapStreamFn` car il utilise toujours le transport partagé Moonshot mais a besoin d'une normalisation de la charge utile de raisonnement (thinking payload) appartenant au fournisseur ; la famille de flux `moonshot-thinking` mappe la configuration ainsi que l'état `/think` sur sa charge utile de raisonnement binaire native.
- Kilocode utilise `catalog`, `capabilities`, `wrapStreamFn` et `isCacheTtlEligible` car il a besoin d'en-têtes de requête appartenant au fournisseur, d'une normalisation de la charge utile de raisonnement, d'indices de transcription Gemini et d'une régulation de la durée de vie (TTL) du cache Anthropic ; la famille de flux `kilocode-thinking` maintient l'injection de réflexion Kilo sur le chemin du flux de proxy partagé tout en ignorant `kilo/auto` et autres identifiants de modèle proxy qui ne prennent pas en charge les charges utiles de raisonnement explicites.
- Z.AI utilise `resolveDynamicModel`, `prepareExtraParams`, `wrapStreamFn`, `isCacheTtlEligible`, `isBinaryThinking`, `isModernModelRef`, `resolveUsageAuth` et `fetchUsageSnapshot` car il gère le repli GLM-5, les valeurs par défaut `tool_stream`, l'UX de raisonnement binaire, la correspondance de modèle moderne et l'authentification d'utilisation ainsi que la récupération des quotas ; la famille de flux `tool-stream-default-on` maintient le wrapper `tool_stream` activé par défaut en dehors de la colle (glue) écrite à la main pour chaque fournisseur.
- xAI utilise `normalizeResolvedModel`, `normalizeTransport`, `contributeResolvedModelCompat`, `prepareExtraParams`, `wrapStreamFn`, `resolveSyntheticAuth`, `resolveDynamicModel` et `isModernModelRef` car il gère la normalisation du transport natif des réponses xAI, les réécritures d'alias en mode rapide Grok, le `tool_stream` par défaut, le nettoyage strict des outils (strict-tool) et des charges utiles de raisonnement, la réutilisation de l'authentification de repli pour les outils appartenant au plugin, la résolution de modèle Grok à compatibilité ascendante, et les correctifs de compatibilité appartenant au fournisseur tels que le profil de schéma d'outil xAI, les mots-clés de schéma non pris en charge, `web_search` natif, et le décodage des arguments d'appel d'outil d'entités HTML.
- Mistral, OpenCode Zen et OpenCode Go utilisent `capabilities` uniquement pour
  garder les particularités de transcription/outillage hors du cœur.
- Les fournisseurs groupés uniquement dans le catalogue tels que `byteplus`, `cloudflare-ai-gateway`,
  `huggingface`, `kimi-coding`, `nvidia`, `qianfan`,
  `synthetic`, `together`, `venice`, `vercel-ai-gateway` et `volcengine` utilisent
  `catalog` uniquement.
- Qwen utilise `catalog` pour son fournisseur de texte ainsi que des enregistrements partagés de compréhension de média
  et de génération vidéo pour ses surfaces multimodales.
- MiniMax et Xiaomi utilisent `catalog` ainsi que des crochets d'utilisation (usage hooks) car leur comportement `/usage`
  est propriétaire du plugin bien que l'inférence s'exécute toujours via les
  transports partagés.

## Assistants d'exécution

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

Notes :

- `textToSpeech` renvoie la charge utile de sortie TTS principale normale pour les surfaces de fichier/note vocale.
- Utilise la configuration `messages.tts` principale et la sélection du fournisseur.
- Renvoie le tampon audio PCM + le taux d'échantillonnage. Les plugins doivent rééchantillonner/encoder pour les fournisseurs.
- `listVoices` est optionnel par fournisseur. Utilisez-le pour les sélecteurs de voix ou les flux de configuration propriétaires du fournisseur.
- Les listes de voix peuvent inclure des métadonnées plus riches telles que les paramètres régionaux, le genre et les étiquettes de personnalité pour les sélecteurs conscients du fournisseur.
- OpenAI et ElevenLabs prennent en charge la téléphonie aujourd'hui. Microsoft non.

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

- Garder la stratégie, le repli et la livraison de réponse TTS dans le cœur.
- Utiliser les fournisseurs de synthèse pour le comportement de synthèse propriétaire du fournisseur.
- L'entrée `edge` Microsoft héritée est normalisée vers l'identifiant de fournisseur `microsoft`.
- Le modèle de propriété privilégié est orienté entreprise : un plugin fournisseur peut posséder
  des fournisseurs de texte, de synthèse vocale, d'image et de média futur à mesure que OpenClaw ajoute ces
  contrats de capacité.

Pour la compréhension d'image/audio/vidéo, les plugins enregistrent un provider de compréhension média typé au lieu d'un sac générique de clé/valeur :

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

- Garder l'orchestration, le repli (fallback), la configuration et le câblage de channel dans le cœur.
- Garder le comportement fournisseur dans le plugin provider.
- L'expansion additive doit rester typée : nouvelles méthodes facultatives, nouveaux champs de résultat facultatifs, nouvelles capacités facultatives.
- La génération vidéo suit déjà le même modèle :
  - le cœur possède le contrat de capacité et le helper d'exécution
  - les plugins fournisseur enregistrent `api.registerVideoGenerationProvider(...)`
  - les plugins de fonctionnalité/channel consomment `api.runtime.videoGeneration.*`

Pour les helpers d'exécution de compréhension média, les plugins peuvent appeler :

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

Pour la transcription audio, les plugins peuvent utiliser soit l'exécution de compréhension média soit l'ancien alias STT :

```ts
const { text } = await api.runtime.mediaUnderstanding.transcribeAudioFile({
  filePath: "/tmp/inbound-audio.ogg",
  cfg: api.config,
  // Optional when MIME cannot be inferred reliably:
  mime: "audio/ogg",
});
```

Notes :

- `api.runtime.mediaUnderstanding.*` est la surface partagée préférée pour la compréhension d'image/audio/vidéo.
- Utilise la configuration audio de compréhension média du cœur (`tools.media.audio`) et l'ordre de repli des providers.
- Renvoie `{ text: undefined }` lorsqu'aucune sortie de transcription n'est produite (par exemple entrée ignorée/non prise en charge).
- `api.runtime.stt.transcribeAudioFile(...)` reste un alias de compatibilité.

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

- `provider` et `model` sont des substitutions facultatives par exécution, et non des modifications persistantes de session.
- OpenClaw n'honore ces champs de substitution que pour les appelants de confiance.
- Pour les exécutions de repli appartenant au plugin, les opérateurs doivent opter pour `plugins.entries.<id>.subagent.allowModelOverride: true`.
- Utilisez `plugins.entries.<id>.subagent.allowedModels` pour restreindre les plugins de confiance à des cibles `provider/model` canoniques spécifiques, ou `"*"` pour autoriser explicitement n'importe quelle cible.
- Les exécutions de sous-agent de plugin non approuvées fonctionnent toujours, mais les demandes de substitution sont rejetées au lieu de replier silencieusement.

Pour la recherche web, les plugins peuvent consommer le helper d'exécution partagé au lieu d'accéder au câblage de l'outil de l'agent :

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

Les plugins peuvent également enregistrer des providers de recherche web via `api.registerWebSearchProvider(...)`.

Notes :

- Garder la sélection de provider, la résolution des informations d'identification et la sémantique de requête partagée dans le cœur.
- Utiliser les providers de recherche web pour les transports de recherche spécifiques aux fournisseurs.
- `api.runtime.webSearch.*` est la surface partagée préférée pour les plugins de fonctionnalités/canaux qui ont besoin d'un comportement de recherche sans dépendre du wrapper d'outil de l'agent.

### `api.runtime.imageGeneration`

```ts
const result = await api.runtime.imageGeneration.generate({
  config: api.config,
  args: { prompt: "A friendly lobster mascot", size: "1024x1024" },
});

const providers = api.runtime.imageGeneration.listProviders({
  config: api.config,
});
```

- `generate(...)` : générer une image à l'aide de la chaîne de providers de génération d'images configurée.
- `listProviders(...)` : lister les providers de génération d'images disponibles et leurs capacités.

## Routes HTTP Gateway

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

- `path` : chemin de route sous le serveur HTTP Gateway.
- `auth` : obligatoire. Utilisez `"gateway"` pour exiger l'authentification normale Gateway, ou `"plugin"` pour l'authentification/la vérification de webhook gérée par le plugin.
- `match` : facultatif. `"exact"` (par défaut) ou `"prefix"`.
- `replaceExisting` : facultatif. Permet au même plugin de remplacer son propre enregistrement de route existant.
- `handler` : renvoie `true` lorsque la route a traité la requête.

Remarques :

- `api.registerHttpHandler(...)` a été supprimé et provoquera une erreur de chargement de plugin. Utilisez plutôt `api.registerHttpRoute(...)`.
- Les routes de plugin doivent déclarer `auth` explicitement.
- Les conflits exacts de `path + match` sont rejetés, sauf si `replaceExisting: true`, et un plugin ne peut pas remplacer la route d'un autre plugin.
- Les routes qui se chevauchent avec des niveaux `auth` différents sont rejetées. Gardez les chaînes de repli `exact`/`prefix` uniquement sur le même niveau d'authentification.
- Les routes `auth: "plugin"` ne reçoivent **pas** automatiquement les portées d'exécution de l'opérateur. Elles sont destinées à la vérification des webhooks/signatures gérée par le plugin, et non aux appels aux helpers privilégiés du Gateway.
- Les routes `auth: "gateway"` s'exécutent dans une portée d'exécution de requête Gateway, mais cette portée est intentionnellement conservatrice :
  - l'authentification par porteur de secret partagé (`gateway.auth.mode = "token"` / `"password"`) maintient les étendues d'exécution des itinéraires de plugins épinglées à `operator.write`, même si l'appelant envoie `x-openclaw-scopes`
  - les modes HTTP porteurs d'identité de confiance (par exemple `trusted-proxy` ou `gateway.auth.mode = "none"` sur une entrée privée) honorent `x-openclaw-scopes` uniquement lorsque l'en-tête est explicitement présent
  - si `x-openclaw-scopes` est absent lors de ces demandes d'itinéraire de plugins porteurs d'identité, l'étendue d'exécution revient à `operator.write`
- Règle pratique : ne supposez pas qu'un itinéraire de plugin d'authentification de passerelle est une surface d'administration implicite. Si votre itinéraire nécessite un comportement réservé aux administrateurs, exigez un mode d'authentification porteur d'identité et documentez le contrat explicite de l'en-tête `x-openclaw-scopes`.

## Chemins d'importation du SDK de plugin

Utilisez les sous-chemins du SDK au lieu de l'importation monolithique `openclaw/plugin-sdk` lors de
la création de plugins :

- `openclaw/plugin-sdk/plugin-entry` pour les primitives d'enregistrement de plugins.
- `openclaw/plugin-sdk/core` pour le contrat générique partagé orienté plugin.
- `openclaw/plugin-sdk/config-schema` pour le schéma Zod racine `openclaw.json`
  export (`OpenClawSchema`).
- Primitives de channel stables tels que `openclaw/plugin-sdk/channel-setup`,
  `openclaw/plugin-sdk/setup-runtime`,
  `openclaw/plugin-sdk/setup-adapter-runtime`,
  `openclaw/plugin-sdk/setup-tools`,
  `openclaw/plugin-sdk/channel-pairing`,
  `openclaw/plugin-sdk/channel-contract`,
  `openclaw/plugin-sdk/channel-feedback`,
  `openclaw/plugin-sdk/channel-inbound`,
  `openclaw/plugin-sdk/channel-lifecycle`,
  `openclaw/plugin-sdk/channel-reply-pipeline`,
  `openclaw/plugin-sdk/command-auth`,
  `openclaw/plugin-sdk/secret-input` et
  `openclaw/plugin-sdk/webhook-ingress` pour le câblage partagé de configuration/auth/réponse/webhook.
  `channel-inbound` est le foyer partagé pour le debounce, la correspondance de mentions,
  le formatage d'enveloppe et les assistants de contexte d'enveloppe entrante.
  `channel-setup` est la jointure de configuration étroite à installation facultative.
  `setup-runtime` est la surface de configuration sécurisée au runtime utilisée par `setupEntry` /
  le démarrage différé, y compris les adaptateurs de correctifs de configuration sécurisés pour l'importation.
  `setup-adapter-runtime` est la jointure d'adaptateur de configuration de compte consciente de l'environnement.
  `setup-tools` est la petite jointure d'assistance CLI/archive/docs (`formatCliCommand`,
  `detectBinary`, `extractArchive`, `resolveBrewExecutable`, `formatDocsLink`,
  `CONFIG_DIR`).
- Les sous-chemins de domaine tels que `openclaw/plugin-sdk/channel-config-helpers`,
  `openclaw/plugin-sdk/allow-from`,
  `openclaw/plugin-sdk/channel-config-schema`,
  `openclaw/plugin-sdk/telegram-command-config`,
  `openclaw/plugin-sdk/channel-policy`,
  `openclaw/plugin-sdk/approval-runtime`,
  `openclaw/plugin-sdk/config-runtime`,
  `openclaw/plugin-sdk/infra-runtime`,
  `openclaw/plugin-sdk/agent-runtime`,
  `openclaw/plugin-sdk/lazy-runtime`,
  `openclaw/plugin-sdk/reply-history`,
  `openclaw/plugin-sdk/routing`,
  `openclaw/plugin-sdk/status-helpers`,
  `openclaw/plugin-sdk/text-runtime`,
  `openclaw/plugin-sdk/runtime-store` et
  `openclaw/plugin-sdk/directory-runtime` pour les assistants d'exécution/de configuration partagés.
  `telegram-command-config` est la jonction publique étroite pour la normalisation/validation
  des commandes personnalisées Telegram et reste disponible même si la surface de contrat
  Telegram intégrée est temporairement indisponible.
  `text-runtime` est la jonction partagée pour le texte/markdown/journalisation, incluant
  le nettoyage du texte visible par l'assistant, les assistants de rendus/découpages markdown,
  les assistants de rédaction, les assistants de balises de directive et les utilitaires de texte sécurisé.
- Les jonctions de channel spécifiques à l'approbation devraient préférer un contrat `approvalCapability`
  sur le plugin. Le cœur lit ensuite l'authentification, la livraison, le rendu et le comportement
  de routage natif de l'approbation via cette seule capacité au lieu de mélanger
  le comportement d'approbation dans des champs de plugin non liés.
- `openclaw/plugin-sdk/channel-runtime` est obsolète et ne reste qu'en tant que
  shim de compatibilité pour les anciens plugins. Le nouveau code devrait plutôt importer les primitives
  génériques plus étroites, et le code du dépôt ne devrait pas ajouter de nouveaux import du shim.
- Les internes des extensions groupées restent privés. Les plugins externes ne doivent utiliser que
  les sous-chemins `openclaw/plugin-sdk/*`. Le code de cœur/test OpenClaw peut utiliser les points d'entrée publics
  du dépôt sous une racine de package de plugin telle que `index.js`, `api.js`,
  `runtime-api.js`, `setup-entry.js`, et des fichiers à portée étroite tels que
  `login-qr-api.js`. N'importez jamais `src/*` d'un package de plugin à partir du cœur ou d'une
  autre extension.
- Répartition du point d'entrée du dépôt :
  `<plugin-package-root>/api.js` est le module d'aide/types,
  `<plugin-package-root>/runtime-api.js` est le module d'exécution uniquement,
  `<plugin-package-root>/index.js` est le point d'entrée du plugin groupé,
  et `<plugin-package-root>/setup-entry.js` est le point d'entrée du plugin de configuration.
- Exemples actuels de providers groupés :
  - Anthropic utilise `api.js` / `contract-api.js` pour les aides de flux Claude telles
    que `wrapAnthropicProviderStream`, les aides d'en-tête bêta, et le `service_tier`
    parsing.
  - OpenAI utilise `api.js` pour les builders de provider, les aides de modèle par défaut, et
    les builders de provider en temps réel.
  - OpenRouter utilise `api.js` pour son builder de provider ainsi que les aides d'onboarding/
    de configuration, tandis que `register.runtime.js` peut toujours réexporter les aides génériques
    `plugin-sdk/provider-stream` pour une utilisation locale au dépôt.
- Les points d'entrée publics chargés par la façade préfèrent l'instantané actif de la configuration d'exécution
  lorsqu'il existe, puis reviennent au fichier de configuration résolu sur le disque lorsque
  OpenClaw ne dessert pas encore d'instantané d'exécution.
- Les primitives partagées génériques restent le contrat public SDK préféré. Un petit
  ensemble de compatibilité réservé de points d'aide de channel groupés existe
  toujours. Traitez-les comme des points de maintenance/compatibilité groupés, et non comme de nouvelles
  cibles d'importation tierces ; les nouveaux contrats inter-channels doivent toujours atterrir sur
  les sous-chemins génériques `plugin-sdk/*` ou les modules locaux `api.js` /
  `runtime-api.js` du plugin.

Note de compatibilité :

- Évitez le module racine `openclaw/plugin-sdk` pour le nouveau code.
- Privilégiez d'abord les primitives étroites et stables. Les nouveaux sous-chemins setup/pairing/reply/
  feedback/contract/inbound/threading/command/secret-input/webhook/infra/
  allowlist/status/message-tool constituent le contrat prévu pour les nouveaux
  travaux de plugins groupés et externes.
  Le parsing/correspondance de cible appartient à `openclaw/plugin-sdk/channel-targets`.
  Les portes d'action de message et les aides d'ID de message de réaction appartiennent à
  `openclaw/plugin-sdk/channel-actions`.
- Les modules d'assistance (helper barrels) spécifiques aux extensions regroupées ne sont pas stables par défaut. Si une assistance n'est nécessaire que par une extension regroupée, gardez-la derrière la couture locale `api.js` ou `runtime-api.js` de l'extension au lieu de la promouvoir dans `openclaw/plugin-sdk/<extension>`.
- Les nouvelles coutures d'assistance partagées doivent être génériques, et non associées à une marque de channel. L'analyse de cible partagée appartient à `openclaw/plugin-sdk/channel-targets`; les éléments internes spécifiques au channel restent derrière la couture locale `api.js` ou `runtime-api.js` du plugin propriétaire.
- Les sous-chemins spécifiques aux capacités tels que `image-generation`, `media-understanding` et `speech` existent car les plugins regroupés/natifs les utilisent aujourd'hui. Leur présence ne signifie pas en soi que chaque assistance exportée est un contrat externe figé à long terme.

## Schémas de l'outil de message

Les plugins doivent posséder les contributions de schéma `describeMessageTool(...)` spécifiques au channel. Gardez les champs spécifiques au provider dans le plugin, et non dans le cœur partagé.

Pour les fragments de schéma portables partagés, réutilisez les assistants génériques exportés via `openclaw/plugin-sdk/channel-actions` :

- `createMessageToolButtonsSchema()` pour les charges utiles de style grille de boutons
- `createMessageToolCardSchema()` pour les charges utiles de cartes structurées

Si une forme de schéma n'a de sens que pour un seul provider, définissez-la dans la source propre de ce plugin au lieu de la promouvoir dans le SDK partagé.

## Résolution de cible de channel

Les plugins de channel doivent posséder la sémantique de cible spécifique au channel. Gardez l'hôte sortant partagé générique et utilisez la surface de l'adaptateur de messagerie pour les règles du provider :

- `messaging.inferTargetChatType({ to })` décide si une cible normalisée doit être traitée comme `direct`, `group` ou `channel` avant la recherche dans l'annuaire.
- `messaging.targetResolver.looksLikeId(raw, normalized)` indique au cœur si une entrée doit passer directement à une résolution de type id au lieu d'une recherche dans l'annuaire.
- `messaging.targetResolver.resolveTarget(...)` est le repli du plugin lorsque le cœur a besoin d'une résolution finale détenue par le provider après normalisation ou après un échec de l'annuaire.
- `messaging.resolveOutboundSessionRoute(...)` est responsable de la construction de route de session spécifique au provider une fois la cible résolue.

Répartition recommandée :

- Utilisez `inferTargetChatType` pour les décisions de catégorie qui doivent se produire avant
  la recherche de pairs/groupes.
- Utilisez `looksLikeId` pour les vérifications de type « traiter ceci comme un id de cible explicite/native ».
- Utilisez `resolveTarget` pour la repli de normalisation spécifique au provider, non pour
  une recherche large dans l'annuaire.
- Conservez les ids natifs du provider tels que les ids de chat, de fil de discussion, JIDs, handles et d'IDs de salle
  dans les valeurs `target` ou les paramètres spécifiques au provider, et non dans les champs génériques du SDK.

## Répertoires basés sur la configuration

Les plugins qui dérivent des entrées d'annuaire à partir de la configuration doivent conserver cette logique dans le
plugin et réutiliser les assistants partagés de
`openclaw/plugin-sdk/directory-runtime`.

Utilisez ceci lorsqu'un canal a besoin de pairs/groupes basés sur la configuration, tels que :

- pairs DM pilotés par liste d'autorisation (allowlist)
- mappages de canal/groupe configurés
- replis d'annuaire statique limités au compte

Les assistants partagés dans `directory-runtime` ne gèrent que les opérations génériques :

- filtrage des requêtes
- application de la limite
- assistants de déduplication/normalisation
- construction de `ChannelDirectoryEntry[]`

L'inspection de compte et la normalisation des ids spécifiques au canal doivent rester dans l'
implémentation du plugin.

## Catalogues de providers

Les plugins de provider peuvent définir des catalogues de modèles pour l'inférence avec
`registerProvider({ catalog: { run(...) { ... } } })`.

`catalog.run(...)` renvoie la même forme que OpenClaw écrit dans
`models.providers` :

- `{ provider }` pour une entrée de provider
- `{ providers }` pour plusieurs entrées de provider

Utilisez `catalog` lorsque le plugin possède des ids de modèle spécifiques au provider, des valeurs par défaut d'URL de base
ou des métadonnées de modèle protégées par authentification.

`catalog.order` contrôle quand le catalogue d'un plugin fusionne par rapport aux
providers implicites intégrés de OpenClaw :

- `simple` : providers basés sur une clé API simple ou pilotés par l'environnement
- `profile` : providers qui apparaissent lorsque des profils d'authentification existent
- `paired` : providers qui synthétisent plusieurs entrées de provider liées
- `late` : dernière passe, après les autres providers implicites

Les providers ultérieurs gagnent en cas de collision de clé, les plugins peuvent donc remplacer intentionnellement une
entrée de provider intégrée avec le même id de provider.

Compatibilité :

- `discovery` fonctionne toujours comme un alias hérité
- si `catalog` et `discovery` sont tous deux enregistrés, OpenClaw utilise `catalog`

## Inspection de channel en lecture seule

Si votre plugin enregistre un channel, il est préférable d'implémenter
`plugin.config.inspectAccount(cfg, accountId)` ainsi que `resolveAccount(...)`.

Pourquoi :

- `resolveAccount(...)` est le chemin d'exécution. Il est autorisé à supposer que les informations d'identification
  sont entièrement matérialisées et peut échouer rapidement lorsque les secrets requis sont manquants.
- Les chemins de commande en lecture seule tels que `openclaw status`, `openclaw status --all`,
  `openclaw channels status`, `openclaw channels resolve`, et les flux de réparation
  doctor/config ne devraient pas avoir besoin de matérialiser les informations d'identification d'exécution juste pour
  décrire la configuration.

Comportement recommandé pour `inspectAccount(...)` :

- Ne renvoyer que l'état descriptif du compte.
- Conserver `enabled` et `configured`.
- Inclure les champs de source/statut des informations d'identification lorsque cela est pertinent, tels que :
  - `tokenSource`, `tokenStatus`
  - `botTokenSource`, `botTokenStatus`
  - `appTokenSource`, `appTokenStatus`
  - `signingSecretSource`, `signingSecretStatus`
- Vous n'avez pas besoin de renvoyer les valeurs brutes des jetons juste pour signaler la disponibilité
  en lecture seule. Ren `tokenStatus: "available"` (et le champ source
  correspondant) est suffisant pour les commandes de type statut.
- Utilisez `configured_unavailable` lorsqu'une information d'identification est configurée via SecretRef mais
  indisponible dans le chemin de commande actuel.

Cela permet aux commandes en lecture seule de signaler "configuré mais indisponible dans ce chemin de
commande" au lieu de planter ou de signaler incorrectement que le compte n'est pas configuré.

## Packs de paquets

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

Chaque entrée devient un plugin. Si le pack répertorie plusieurs extensions, l'id du plugin
devient `name/<fileBase>`.

Si votre plugin importe des dépendances npm, installez-les dans ce répertoire afin que `node_modules` soit disponible (`npm install` / `pnpm install`).

Garantie de sécurité : chaque entrée `openclaw.extensions` doit rester à l'intérieur du répertoire du plugin après la résolution des liens symboliques. Les entrées qui s'échappent du répertoire du package sont rejetées.

Note de sécurité : `openclaw plugins install` installe les dépendances des plugins avec `npm install --omit=dev --ignore-scripts` (pas de scripts de cycle de vie, pas de dépendances de développement à l'exécution). Gardez les arbres de dépendances des plugins « pur JS/TS » et évitez les packages qui nécessitent des builds `postinstall`.

Optionnel : `openclaw.setupEntry` peut pointer vers un module léger de configuration uniquement. Lorsque OpenClaw a besoin de surfaces de configuration pour un plugin de canal désactivé, ou lorsqu'un plugin de canal est activé mais toujours non configuré, il charge `setupEntry` au lieu de l'entrée complète du plugin. Cela allège le démarrage et la configuration lorsque votre entrée principale du plugin connecte également des outils, des hooks ou d'autres codes uniquement à l'exécution.

Optionnel : `openclaw.startup.deferConfiguredChannelFullLoadUntilAfterListen` peut permettre à un plugin de canal d'emprunter le même chemin `setupEntry` pendant la phase de démarrage avant écoute de la passerelle, même lorsque le canal est déjà configuré.

Utilisez ceci uniquement lorsque `setupEntry` couvre entièrement la surface de démarrage qui doit exister avant que la passerelle ne commence à écouter. En pratique, cela signifie que l'entrée de configuration doit enregistrer chaque capacité détenue par le canal dont le démarrage dépend, telles que :

- l'enregistrement du canal lui-même
- toutes les routes HTTP qui doivent être disponibles avant que la passerelle ne commence à écouter
- toutes les méthodes, outils ou services de passerelle qui doivent exister durant cette même fenêtre

Si votre entrée complète possède toujours une capacité de démarrage requise, n'activez pas ce drapeau. Conservez le plugin sur le comportement par défaut et laissez OpenClaw charger l'entrée complète lors du démarrage.

Les canals regroupés (bundled) peuvent également publier des assistants de surface de contrat de configuration uniquement que le cœur peut consulter avant le chargement complet de l'exécution du canal. La surface actuelle de promotion de la configuration est :

- `singleAccountKeysToMove`
- `namedAccountPromotionKeys`
- `resolveSingleAccountPromotionTarget(...)`

Core utilise cette surface lorsqu'il doit promouvoir une configuration de canal héritée à compte unique en `channels.<id>.accounts.*` sans charger l'entrée complète du plugin. Matrix est l'exemple groupé actuel : il ne déplace que les clés d'auth/bootstrap dans un compte nommé promu lorsque des comptes nommés existent déjà, et il peut préserver une clé de compte par défaut configurée non canonique au lieu de toujours créer `accounts.default`.

Ces adaptateurs de correctifs de configuration gardent la découverte de surface de contrat groupée paresseuse. Le temps d'importation reste léger ; la surface de promotion n'est chargée qu'à la première utilisation au lieu de réintégrer le démarrage du canal groupé lors de l'importation du module.

Lorsque ces surfaces de démarrage incluent des méthodes RPC de passerelle, gardez-les sur un préfixe spécifique au plugin. Les espaces de noms d'administration Core (`config.*`, `exec.approvals.*`, `wizard.*`, `update.*`) restent réservés et résolvent toujours vers `operator.admin`, même si un plugin demande une portée plus étroite.

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

Les plugins de canal peuvent annoncer des métadonnées de configuration/découverte via `openclaw.channel` et des indices d'installation via `openclaw.install`. Cela garde les données du catalogue Core exemptes de données.

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
      "localPath": "<bundled-plugin-local-path>",
      "defaultChoice": "npm"
    }
  }
}
```

Champs `openclaw.channel` utiles au-delà de l'exemple minimal :

- `detailLabel` : étiquette secondaire pour des surfaces de catalogue/statut plus riches
- `docsLabel` : remplacer le texte du lien pour le lien de documentation
- `preferOver` : ids de plugin/canal de priorité inférieure que cette entrée de catalogue devrait surpasser
- `selectionDocsPrefix`, `selectionDocsOmitLabel`, `selectionExtras` : contrôles de copie de surface de sélection
- `markdownCapable` : marque le canal comme capable de gérer le markdown pour les décisions de formatage sortant
- `exposure.configured` : masquer le canal des surfaces de liste des canaux configurés lorsqu'il est réglé sur `false`
- `exposure.setup` : masquer le canal des sélecteurs de configuration/installation interactifs lorsqu'il est réglé sur `false`
- `exposure.docs` : marquer le canal comme interne/privé pour les surfaces de navigation de la documentation
- `showConfigured` / `showInSetup` : alias hérités toujours acceptés pour compatibilité ; préférez `exposure`
- `quickstartAllowFrom` : active le channel pour le flux de démarrage rapide standard `allowFrom`
- `forceAccountBinding` : nécessite une liaison de compte explicite même lorsqu'un seul compte existe
- `preferSessionLookupForAnnounceTarget` : privilégiez la recherche de session lors de la résolution des cibles d'annonce

OpenClaw peut également fusionner des **catalogues de channels externes** (par exemple, un export de registre MPM). Déposez un fichier JSON à l'un des emplacements suivants :

- `~/.openclaw/mpm/plugins.json`
- `~/.openclaw/mpm/catalog.json`
- `~/.openclaw/plugins/catalog.json`

Ou pointez `OPENCLAW_PLUGIN_CATALOG_PATHS` (ou `OPENCLAW_MPM_CATALOG_PATHS`) vers
un ou plusieurs fichiers JSON (délimités par des virgules, des points-virgules ou `PATH`). Chaque fichier doit
contenir `{ "entries": [ { "name": "@scope/pkg", "openclaw": { "channel": {...}, "install": {...} } } ] }`. L'analyseur accepte également `"packages"` ou `"plugins"` comme alias hérités pour la clé `"entries"`.

## Plugins de moteur de contexte

Les plugins de moteur de contexte possèdent l'orchestration du contexte de session pour l'ingestion, l'assemblage
et la compactage. Enregistrez-les depuis votre plugin avec
`api.registerContextEngine(id, factory)`, puis sélectionnez le moteur actif avec
`plugins.slots.contextEngine`.

Utilisez ceci lorsque votre plugin doit remplacer ou étendre le pipeline de contexte par défaut
plutôt que d'ajouter simplement une recherche mémoire ou des hooks.

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

Si votre moteur ne possède **pas** l'algorithme de compactage, gardez `compact()`
implémenté et déléguez-le explicitement :

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

## Ajouter une nouvelle capacité

Lorsqu'un plugin a besoin d'un comportement qui ne correspond pas à la API actuelle, ne contournez pas
le système de plugins avec une intervention privée. Ajoutez la capacité manquante.

Séquence recommandée :

1. définir le contrat principal
   Décidez du comportement partagé que le principal doit posséder : stratégie, repli, fusion de configuration,
   cycle de vie, sémantique orientée channel et forme de l'aide d'exécution.
2. ajouter des surfaces d'enregistrement/d'exécution de plugin typées
   Étendez `OpenClawPluginApi` et/ou `api.runtime` avec la plus petite surface
   de capacité typée utile.
3. connecter le cœur + consommateurs de canal/fonctionnalité
   Les canaux et les plugins de fonctionnalité devraient consommer la nouvelle capacité par le cœur,
   et non en important directement une implémentation de fournisseur.
4. enregistrer les implémentations de fournisseur
   Les plugins de fournisseur enregistrent ensuite leurs backends par rapport à la capacité.
5. ajouter la couverture du contrat
   Ajoutez des tests pour que la propriété et la forme de l'enregistrement restent explicites au fil du temps.

C'est ainsi que OpenClaw reste opiniâtre sans devenir codé en dur selon la vision du monde d'un
fournisseur. Consultez le [Capability Cookbook](/en/tools/capability-cookbook)
pour une liste de fichiers concrète et un exemple travaillé.

### Liste de contrôle des capacités

Lorsque vous ajoutez une nouvelle capacité, l'implémentation doit généralement toucher ces
surfaces ensemble :

- types de contrat de base dans `src/<capability>/types.ts`
- assistant d'exécution/de runtime de base dans `src/<capability>/runtime.ts`
- surface d'enregistrement de l'API du plugin dans `src/plugins/types.ts`
- câblage du registre de plugins dans `src/plugins/registry.ts`
- exposition du runtime du plugin dans `src/plugins/runtime/*` lorsque les plugins de fonctionnalité/canal
  ont besoin de le consommer
- assistants de capture/test dans `src/test-utils/plugin-registration.ts`
- assertions de propriété/de contrat dans `src/plugins/contracts/registry.ts`
- docs opérateur/plugin dans `docs/`

Si l'une de ces surfaces est manquante, c'est généralement un signe que la capacité n'est
pas encore entièrement intégrée.

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
const clip = await api.runtime.videoGeneration.generate({
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
- les plugins de fournisseur possèdent les implémentations de fournisseur
- les plugins de fonctionnalité/canal consomment les assistants d'exécution
- les tests de contrat gardent la propriété explicite
