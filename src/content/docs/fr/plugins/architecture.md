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
  Ceci est la **référence de l'architecture approfondie**. Pour des guides pratiques, consultez : - [Install and use plugins](/en/tools/plugin) — guide utilisateur - [Getting Started](/en/plugins/building-plugins) — premier tutoriel sur les plugins - [Channel Plugins](/en/plugins/sdk-channel-plugins) — créer un canal de messagerie - [Provider Plugins](/en/plugins/sdk-provider-plugins) — créer un
  provider de modèle - [SDK Overview](/en/plugins/sdk-overview) — carte d'importation et API
</Info>

Cette page couvre l'architecture interne du système de plugins OpenClaw.

## Modèle de capacité publique

Les capacités constituent le modèle **de plugin natif** public au sein de OpenClaw. Chaque
plugin natif OpenClaw s'enregistre pour un ou plusieurs types de capacités :

| Capacité                    | Méthode d'enregistrement                         | Plugins exemples                     |
| --------------------------- | ------------------------------------------------ | ------------------------------------ |
| Inférence de texte          | `api.registerProvider(...)`                      | `openai`, `anthropic`                |
| Backend d'inférence CLI     | `api.registerCliBackend(...)`                    | `openai`, `anthropic`                |
| Synthèse vocale             | `api.registerSpeechProvider(...)`                | `elevenlabs`, `microsoft`            |
| Transcription en temps réel | `api.registerRealtimeTranscriptionProvider(...)` | `openai`                             |
| Voix en temps réel          | `api.registerRealtimeVoiceProvider(...)`         | `openai`                             |
| Compréhension des médias    | `api.registerMediaUnderstandingProvider(...)`    | `openai`, `google`                   |
| Génération d'images         | `api.registerImageGenerationProvider(...)`       | `openai`, `google`, `fal`, `minimax` |
| Génération de musique       | `api.registerMusicGenerationProvider(...)`       | `google`, `minimax`                  |
| Génération de vidéo         | `api.registerVideoGenerationProvider(...)`       | `qwen`                               |
| Récupération Web            | `api.registerWebFetchProvider(...)`              | `firecrawl`                          |
| Recherche Web               | `api.registerWebSearchProvider(...)`             | `google`                             |
| Canal / messagerie          | `api.registerChannel(...)`                       | `msteams`, `matrix`                  |

Un plugin qui n'enregistre aucune capacité mais fournit des hooks, des outils ou des services est un plugin **legacy hook-only** (uniquement hooks historique). Ce modèle est toujours entièrement pris en charge.

### Position sur la compatibilité externe

Le modèle de capacité est intégré au cœur et utilisé par les plugins intégrés/natifs aujourd'hui, mais la compatibilité des plugins externes nécessite encore une barre plus stricte que « il est exporté, donc il est figé ».

Recommandations actuelles :

- **existing external plugins:** keep hook-based integrations working; treat
  this as the compatibility baseline
- **new bundled/native plugins:** prefer explicit capability registration over
  vendor-specific reach-ins or new hook-only designs
- **external plugins adopting capability registration:** allowed, but treat the
  capability-specific helper surfaces as evolving unless docs explicitly mark a
  contract as stable

Practical rule:

- capability registration APIs are the intended direction
- legacy hooks remain the safest no-breakage path for external plugins during
  the transition
- exported helper subpaths are not all equal; prefer the narrow documented
  contract, not incidental helper exports

### Plugin shapes

OpenClaw classifies every loaded plugin into a shape based on its actual
registration behavior (not just static metadata):

- **plain-capability** -- registers exactly one capability type (for example a
  provider-only plugin like `mistral`)
- **hybrid-capability** -- registers multiple capability types (for example
  `openai` owns text inference, speech, media understanding, and image
  generation)
- **hook-only** -- registers only hooks (typed or custom), no capabilities,
  tools, commands, or services
- **non-capability** -- registers tools, commands, services, or routes but no
  capabilities

Utilisez `openclaw plugins inspect <id>` pour voir la forme et la décomposition
en capacités d'un plugin. Consultez la [référence de la CLI](/en/cli/plugins#inspect) pour plus de détails.

### Legacy hooks

The `before_agent_start` hook remains supported as a compatibility path for
hook-only plugins. Legacy real-world plugins still depend on it.

Direction:

- keep it working
- document it as legacy
- prefer `before_model_resolve` for model/provider override work
- prefer `before_prompt_build` for prompt mutation work
- remove only after real usage drops and fixture coverage proves migration safety

### Compatibility signals

When you run `openclaw doctor` or `openclaw plugins inspect <id>`, you may see
one of these labels:

| Signal                       | Meaning                                                                          |
| ---------------------------- | -------------------------------------------------------------------------------- |
| **config valid**             | Config parses fine and plugins resolve                                           |
| **compatibility advisory**   | Le plugin utilise un modèle pris en charge mais plus ancien (p. ex. `hook-only`) |
| **avertissement d'obsolète** | Le plugin utilise `before_agent_start`, qui est obsolète                         |
| **erreur bloquante**         | La configuration n'est pas valide ou le plugin n'a pas pu être chargé            |

Ni `hook-only` ni `before_agent_start` ne cassera votre plugin pour l'instant --
`hook-only` est purement indicatif, et `before_agent_start` ne déclenche qu'un avertissement. Ces
signaux apparaissent également dans `openclaw status --all` et `openclaw plugins doctor`.

## Aperçu de l'architecture

Le système de plugins d'OpenClaw comporte quatre couches :

1. **Manifeste + découverte**
   OpenClaw trouve les plugins candidats à partir des chemins configurés, des racines de l'espace de travail,
   des racines d'extensions globales et des extensions groupées. La découverte lit d'abord les manifestes natifs
   `openclaw.plugin.json` ainsi que les manifestes de bundles pris en charge.
2. **Activation + validation**
   Le cœur décide si un plugin découvert est activé, désactivé, bloqué ou
   sélectionné pour un emplacement exclusif tel que la mémoire.
3. **Chargement à l'exécution**
   Les plugins natifs OpenClaw sont chargés en processus via jiti et enregistrent
   les capacités dans un registre central. Les bundles compatibles sont normalisés en
   enregistrements de registre sans importer de code d'exécution.
4. **Consommation de surface**
   Le reste d'OpenClaw lit le registre pour exposer les outils, canaux, configuration du provider,
   hooks, routes HTTP, commandes CLI et services.

Pour le CLI des plugins spécifiquement, la découverte des commandes racines est divisée en deux phases :

- les métadonnées au moment de l'analyse proviennent de `registerCli(..., { descriptors: [...] })`
- le véritable module de CLI du plugin peut rester différé et s'enregistrer lors de la première invocation

Cela permet de garder le code CLI possédé par le plugin à l'intérieur du plugin tout en laissant OpenClaw
réserver les noms de commandes racines avant l'analyse.

La limite de conception importante :

- la découverte + validation de la configuration doit fonctionner à partir des **métadonnées de manifeste/schéma**
  sans exécuter le code du plugin
- le comportement natif à l'exécution provient du chemin `register(api)` du module du plugin

Cette division permet à OpenClaw de valider la configuration, d'expliquer les plugins manquants/désactivés et de
construire des indices UI/schéma avant que l'exécution complète ne soit active.

### Plugins de canal et l'outil de message partagé

Les plugins de canal n'ont pas besoin d'enregistrer un outil d'envoi/modification/réaction séparé pour
les actions de chat normales. OpenClaw conserve un outil `message` partagé dans le cœur, et
les plugins de canal possèdent la découverte et l'exécution spécifiques au canal derrière celui-ci.

La limite actuelle est :

- le cœur possède l'hôte de l'outil `message` partagé, le câblage des invites, la gestion de session/discussion
  et la répartition de l'exécution
- les plugins de canal possèdent la découverte des actions délimitées, la découverte des capacités et tous
  les fragments de schéma spécifiques au canal
- les plugins de canal possèdent la grammaire de conversation de session spécifique au fournisseur, telle que
  la manière dont les identifiants de conversation encodent les identifiants de discussion ou héritent des conversations parentes
- les plugins de canal exécutent l'action finale via leur adaptateur d'action

Pour les plugins de canal, la surface du SDK est
`ChannelMessageActionAdapter.describeMessageTool(...)`. Cet appel de découverte unifié
permet à un plugin de renvoyer ses actions visibles, ses capacités et ses contributions de schéma
ensemble pour que ces éléments ne se dispersent pas.

Le cœur transmet la portée d'exécution lors de cette étape de découverte. Les champs importants incluent :

- `accountId`
- `currentChannelId`
- `currentThreadTs`
- `currentMessageId`
- `sessionKey`
- `sessionId`
- `agentId`
- entrant de confiance `requesterSenderId`

Cela est important pour les plugins sensibles au contexte. Un canal peut masquer ou exposer
les actions de message en fonction du compte actif, de la salle/discussion/message actuel, ou
de l'identité du demandeur de confiance sans coder en dur les branches spécifiques au canal dans l'outil
`message` du cœur.

C'est pourquoi les modifications de routage du runner intégré sont encore un travail de plugin : le runner est
responsable de la transmission de l'identité de chat/session actuelle dans les limites de la découverte du plugin
afin que l'outil `message` partagé expose la bonne surface possédée par le canal
pour le tour actuel.

Pour les assistants d'exécution possédés par le canal, les plugins groupés doivent conserver l'environnement d'exécution à l'intérieur de leurs propres modules d'extension. Le cœur ne possède plus les environnements d'exécution d'action de message pour Discord, Slack, Telegram ou WhatsApp sous `src/agents/tools`. Nous ne publions pas de sous-chemins `plugin-sdk/*-action-runtime` distincts, et les plugins groupés doivent importer leur propre code d'environnement d'exécution local directement à partir de leurs modules possédés par l'extension.

La même limite s'applique généralement aux coutures du SDK nommées par le fournisseur : le cœur ne doit pas importer de barils de commodité spécifiques au canal pour Slack, Discord, Signal, WhatsApp ou des extensions similaires. Si le cœur a besoin d'un comportement, il doit soit consommer le barrel `api.ts` / `runtime-api.ts` du plugin groupé, soit transformer le besoin en une capacité générique étroite dans le SDK partagé.

Pour les sondages spécifiquement, il existe deux chemins d'exécution :

- `outbound.sendPoll` est la base partagée pour les canaux qui correspondent au modèle de sondage commun
- `actions.handleAction("poll")` est le chemin privilégié pour la sémantique de sondage spécifique au canal ou les paramètres de sondage supplémentaires

Le cœur diffère désormais l'analyse des sondages partagés jusqu'à ce que la répartition des sondages du plugin refuse l'action, afin que les gestionnaires de sondage possédés par le plugin puissent accepter des champs de sondage spécifiques au canal sans être bloqués par l'analyseur de sondage générique au préalable.

Consultez la section [Load pipeline](#load-pipeline) pour la séquence complète de démarrage.

## Modèle de propriété des capacités

OpenClaw considère un plugin natif comme la limite de propriété pour une **entreprise** ou une **fonctionnalité**, et non comme un ensemble hétéroclite d'intégrations sans rapport.

Cela signifie :

- un plugin d'entreprise doit généralement posséder toutes les interfaces de cette entreprise orientées vers OpenClaw
- un plugin de fonctionnalité doit généralement posséder la surface complète de la fonctionnalité qu'il introduit
- les canaux doivent consommer les capacités partagées du cœur au lieu de réimplémenter le comportement du fournisseur ad hoc

Exemples :

- le plugin groupé `openai` possède le comportement du fournisseur de modèle OpenAI et les comportements de parole + voix en temps réel + compréhension des médias + génération d'images d'OpenAI
- le plugin groupé `elevenlabs` possède le comportement de parole ElevenLabs
- le plugin groupé `microsoft` possède le comportement de parole Microsoft
- le plugin groupé `google` possède le comportement du fournisseur de modèle Google ainsi que le comportement de compréhension des médias, de génération d'images et de recherche web de Google
- le plugin groupé `firecrawl` possède le comportement de récupération web Firecrawl
- les plugins groupés `minimax`, `mistral`, `moonshot` et `zai` possèdent leurs backends de compréhension des médias
- le plugin groupé `qwen` possède le comportement de fournisseur de texte Qwen ainsi que les comportements de compréhension des médias et de génération vidéo
- le plugin `voice-call` est un plugin de fonctionnalité : il possède le transport des appels, les outils, la CLI, les routes et le pontage de flux média Twilio, mais il consomme les capacités partagées de parole, de transcription en temps réel et de voix en temps réel au lieu d'importer directement des plugins de fournisseurs

L'état final prévu est :

- OpenAI vit dans un seul plugin même s'il couvre les modèles de texte, la parole, les images et la future vidéo
- un autre fournisseur peut faire de même pour sa propre surface
- les canaux ne se soucient pas de quel plugin fournisseur possède le fournisseur ; ils consomment le contrat de capacité partagée exposé par le cœur

C'est là la distinction clé :

- **plugin** = frontière de propriété
- **capacité** = contrat de base que plusieurs plugins peuvent implémenter ou consommer

Ainsi, si OpenClaw ajoute un nouveau domaine tel que la vidéo, la première question n'est pas « quel fournisseur doit coder en dur le traitement de la vidéo ? ». La première question est « quel est le contrat de capacité vidéo de base ? ». Une fois que ce contrat existe, les plugins fournisseurs peuvent s'enregistrer dessus et les plugins de canal/fonctionnalité peuvent le consommer.

Si la capacité n'existe pas encore, la bonne démarche est généralement :

1. définir la capacité manquante dans le cœur
2. l'exposer via l'API de plugin / le runtime de manière typée
3. connecter les canaux/fonctionnalités à cette capacité
4. laisser les plugins fournisseurs enregistrer des implémentations

Cela garde la propriété explicite tout en évitant un comportement central qui dépend d'un seul fournisseur ou d'un chemin de code spécifique à un plugin ponctuel.

### Superposition des capacités

Utilisez ce modèle mental pour décider où le code doit se trouver :

- **couche de capacité centrale** : orchestration partagée, politique, repli, règles de fusion de configuration, sémantique de livraison et contrats typés
- **vendor plugin layer** : API spécifiques aux fournisseurs, auth, catalogues de modèles, synthèse
  vocale, génération d'images, futurs backends vidéo, points de terminaison d'utilisation
- **channel/feature plugin layer** : intégration Slack/Slack/appels vocaux/etc.
  qui consomme les capacités principales et les présente sur une surface

Par exemple, le TTS suit cette forme :

- le cœur possède la politique TTS au moment de la réponse, l'ordre de repli, les préférences et la livraison par channel
- `openai`, `elevenlabs` et `microsoft` possèdent les implémentations de synthèse
- `voice-call` consomme l'assistant d'exécution TTS téléphonique

Ce même modèle devrait être privilégié pour les futures capacités.

### Exemple de plugin d'entreprise multi-capacités

Un plugin d'entreprise doit paraître cohérent de l'extérieur. Si OpenClaw dispose de contrats
partagés pour les modèles, la parole, la transcription en temps réel, la voix en temps réel, la compréhension
média, la génération d'images, la génération vidéo, la récupération web et la recherche web,
un fournisseur peut posséder toutes ses surfaces en un seul endroit :

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
- les channels et les plugins de fonctionnalité consomment les assistants `api.runtime.*`, et non le code du fournisseur
- les tests de contrat peuvent affirmer que le plugin a enregistré les capacités
  qu'il prétend posséder

### Exemple de capacité : compréhension vidéo

OpenClaw traite déjà la compréhension image/audio/vidéo comme une capacité
partagée. Le même modèle de propriété s'y applique :

1. le cœur définit le contrat de compréhension média
2. les plugins fournisseur enregistrent `describeImage`, `transcribeAudio` et
   `describeVideo` selon le cas
3. les channels et les plugins de fonctionnalité consomment le comportement principal partagé au lieu de
   se connecter directement au code du fournisseur

Cela évite d'intégrer les hypothèses vidéo d'un fournisseur dans le cœur. Le plugin possède
la surface du fournisseur ; le cœur possède le contrat de capacité et le comportement de repli.

La génération vidéo utilise déjà cette même séquence : le cœur possède le contrat de capacité
typé et l'assistant d'exécution, et les plugins fournisseur enregistrent
les implémentations `api.registerVideoGenerationProvider(...)`.

Besoin d'une liste de contrôle concrète pour le déploiement ? Consultez
le [Capability Cookbook](/en/tools/capability-cookbook).

## Contrats et application

La surface de l'API des plugins est intentionnellement typée et centralisée dans `OpenClawPluginApi`. Ce contrat définit les points d'enregistrement pris en charge et les assistants d'exécution dont un plugin peut dépendre.

Pourquoi c'est important :

- les auteurs de plugins bénéficient d'une norme interne stable
- le cœur (core) peut rejeter la propriété en double, telle que deux plugins enregistrant le même identifiant de provider
- le démarrage peut fournir des diagnostics exploitables pour les enregistrements malformés
- les tests de contrat peuvent appliquer la propriété des plugins groupés et empêcher une dérive silencieuse

Il existe deux niveaux d'application :

1. **application de l'enregistrement à l'exécution**
   Le registre de plugins valide les enregistrements lors du chargement des plugins. Exemples :
   les identifiants de provider en double, les identifiants de provider vocale en double et les enregistrements
   malformés produisent des diagnostics de plugin plutôt qu'un comportement indéfini.
2. **tests de contrat**
   Les plugins groupés sont capturés dans des registres de contrat lors des exécutions de tests afin que
   OpenClaw puisse affirmer explicitement la propriété. Aujourd'hui, cela est utilisé pour les model
   providers, les speech providers, les web search providers et la propriété des enregistrements
   groupés.

L'effet pratique est que OpenClaw sait, à l'avance, quel plugin possède quelle
surface. Cela permet au cœur et aux channels de se composer de manière transparente car la propriété est
déclarée, typée et testable plutôt qu'implicite.

### Ce qui appartient à un contrat

Les bons contrats de plugins sont :

- typés
- petits
- spécifiques à la capacité (capability)
- détenus par le cœur (core)
- réutilisables par plusieurs plugins
- consommables par les channels/fonctionnalités sans connaissance du fournisseur

Les mauvais contrats de plugins sont :

- des stratégies spécifiques à un fournisseur cachées dans le cœur
- des échappatoires ponctuelles pour plugins qui contournent le registre
- du code de channel accédant directement à une implémentation de fournisseur
- des objets d'exécution ad hoc qui ne font pas partie de `OpenClawPluginApi` ou
  `api.runtime`

En cas de doute, augmentez le niveau d'abstraction : définissez d'abord la capacité, puis
laissez les plugins s'y connecter.

## Modèle d'exécution

Les plugins natifs OpenClaw s'exécutent **in-process** avec la Gateway. Ils ne sont pas
sandboxed. Un plugin natif chargé a la même limite de confiance au niveau du processus que
le code du cœur.

Implications :

- un plugin natif peut enregistrer des outils, des gestionnaires réseau, des hooks et des services
- un bug de plugin natif peut planter ou déstabiliser la passerelle
- un plugin natif malveillant équivaut à une exécution de code arbitraire à l'intérieur
  du processus OpenClaw

Les bundles compatibles sont plus sûrs par défaut car OpenClaw les traite actuellement comme des packs de métadonnées/contenu. Dans les versions actuelles, cela signifie principalement des compétences groupées (bundled skills).

Utilisez des listes d'autorisation (allowlists) et des chemins d'installation/chargement explicites pour les plugins non groupés. Traitez les plugins de l'espace de travail (workspace) comme du code de développement, et non comme des valeurs par défaut de production.

Pour les noms de packages groupés dans l'espace de travail, gardez l'identifiant du plugin ancré dans le nom npm : `@openclaw/<id>` par défaut, ou un suffixe typé approuvé tel que `-provider`, `-plugin`, `-speech`, `-sandbox` ou `-media-understanding` lorsque le package expose intentionnellement un rôle de plugin plus étroit.

Note importante sur la confiance :

- `plugins.allow` fait confiance aux **identifiants de plugin**, et non à la provenance de la source.
- Un plugin de l'espace de travail (workspace) portant le même identifiant qu'un plugin groupé remplace intentionnellement la copie groupée lorsque ce plugin de l'espace de travail est activé/autorisé.
- Ceci est normal et utile pour le développement local, les tests correctifs (patch testing) et les correctifs urgents (hotfixes).

## Limite d'exportation

OpenClaw exporte des capacités, et non des commodités de mise en œuvre.

Gardez l'enregistrement des capacités public. Réduisez les exportations d'assistants non contractuels :

- sous-chemins d'assistants spécifiques aux plugins groupés
- sous-chemins de plomberie d'exécution (runtime plumbing) non destinés à être une API publique
- assistants de commodité spécifiques aux fournisseurs
- assistants de configuration/onboarding qui sont des détails de mise en œuvre

Certains sous-chemins d'assistants de plugins groupés restent toujours dans la carte d'exportation du SDK générée pour la compatibilité et la maintenance des plugins groupés. Les exemples actuels incluent `plugin-sdk/feishu`, `plugin-sdk/feishu-setup`, `plugin-sdk/zalo`, `plugin-sdk/zalo-setup` et plusieurs coutures `plugin-sdk/matrix*`. Traitez-les comme des exportations réservées de détails de mise en œuvre, et non comme le modèle SDK recommandé pour les nouveaux plugins tiers.

## Pipeline de chargement

Au démarrage, OpenClaw fait globalement ceci :

1. découvrir les racines de plugins candidates
2. lire les manifests natifs ou compatibles et les métadonnées des packages
3. rejeter les candidats non sûrs
4. normaliser la config du plugin (`plugins.enabled`, `allow`, `deny`, `entries`,
   `slots`, `load.paths`)
5. décider de l'activation pour chaque candidat
6. charger les modules natifs activés via jiti
7. appeler les hooks natifs `register(api)` (ou `activate(api)` — un alias hérité) et collecter les inscriptions dans le registre de plugins
8. exposer le registre aux surfaces de commandes/runtime

<Note>`activate` est un alias hérité pour `register` — le chargeur résout celui qui est présent (`def.register ?? def.activate`) et l'appelle au même moment. Tous les plugins groupés utilisent `register` ; privilégiez `register` pour les nouveaux plugins.</Note>

Les barrières de sécurité se produisent **avant** l'exécution du runtime. Les candidats sont bloqués
lorsque le point d'entrée sort de la racine du plugin, que le chemin est accessible en écriture par tous, ou que la
propriété du chemin semble suspecte pour les plugins non groupés.

### Comportement prioritaire au manifeste

Le manifeste est la source de vérité du plan de contrôle. OpenClaw l'utilise pour :

- identifier le plugin
- découvrir les canaux/compétences/schémas de config déclarés ou les capacités groupées
- valider `plugins.entries.<id>.config`
- augmenter les étiquettes/espaces réservés de l'interface utilisateur de contrôle
- afficher les métadonnées d'installation/catalogue

Pour les plugins natifs, le module runtime est la partie du plan de données. Il enregistre
le comportement réel tel que les hooks, les outils, les commandes ou les flux provider.

### Ce que le chargeur met en cache

OpenClaw conserve des caches de processus courts pour :

- les résultats de découverte
- les données du registre de manifeste
- les registres de plugins chargés

Ces caches réduisent la surcharge des démarrages en rafale et des commandes répétées. Il est sûr
de les considérer comme des caches de performance à court terme, et non comme de la persistance.

Note de performance :

- Définissez `OPENCLAW_DISABLE_PLUGIN_DISCOVERY_CACHE=1` ou
  `OPENCLAW_DISABLE_PLUGIN_MANIFEST_CACHE=1` pour désactiver ces caches.
- Ajustez les fenêtres de cache avec `OPENCLAW_PLUGIN_DISCOVERY_CACHE_MS` et
  `OPENCLAW_PLUGIN_MANIFEST_CACHE_MS`.

## Modèle de registre

Les plugins chargés ne modifient pas directement des globales de cœur aléatoires. Ils s'inscrivent dans un
registre central de plugins.

Le registre suit :

- les enregistrements de plugins (identité, source, origine, statut, diagnostics)
- les outils
- les hooks hérités et les hooks typés
- les canaux
- les providers
- gestionnaires RPC de passerelle
- routes HTTP
- registres CLI
- services d'arrière-plan
- commandes détenues par le plugin

Les fonctionnalités principales lisent ensuite ce registre au lieu de communiquer directement avec les modules de plugin. Cela maintient le chargement unidirectionnel :

- module de plugin -> enregistrement du registre
- runtime principal -> consommation du registre

Cette séparation est importante pour la maintenabilité. Cela signifie que la plupart des surfaces principales n'ont besoin que d'un point d'intégration : "lire le registre", et non "traiter chaque module de plugin comme un cas particulier".

## Rappels de liaison de conversation

Les plugins qui lient une conversation peuvent réagir lorsqu'une approbation est résolue.

Utilisez `api.onConversationBindingResolved(...)` pour recevoir un rappel après qu'une demande de liaison a été approuvée ou refusée :

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
- `request` : le résumé de la demande originale, l'indice de détachement, l'ID de l'expéditeur et les métadonnées de la conversation

Ce rappel est uniquement une notification. Il ne modifie pas qui est autorisé à lier une conversation et s'exécute après la fin du traitement de l'approbation principale.

## Hooks d'exécution du fournisseur

Les plugins de fournisseur ont maintenant deux couches :

- métadonnées du manifeste : `providerAuthEnvVars` pour une recherche rapide d'auth par env du provider
  avant le chargement à l'exécution, `providerAuthAliases` pour les variantes de provider qui partagent
  l'auth, `channelEnvVars` pour une recherche rapide de configuration/env de channel avant le chargement
  à l'exécution, plus `providerAuthChoices` pour des étiquettes rapides d'onboarding/choix d'auth et
  les métadonnées des indicateurs de la CLI avant le chargement à l'exécution
- hooks de configuration : `catalog` / ancien `discovery` plus `applyConfigDefaults`
- runtime hooks : `normalizeModelId`, `normalizeTransport`,
  `normalizeConfig`,
  `applyNativeStreamingUsageCompat`, `resolveConfigApiKey`,
  `resolveSyntheticAuth`, `resolveExternalAuthProfiles`,
  `shouldDeferSyntheticProfileAuth`,
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

OpenClaw possède toujours la boucle d'agent générique, le basculement (failover), la gestion des transcriptions et
la politique de tool (tool policy). Ces hooks constituent la surface d'extension pour les comportements spécifiques au fournisseur sans
avoir besoin d'un transport d'inférence entièrement personnalisé.

Utilisez le manifeste `providerAuthEnvVars` lorsque le provider dispose d'informations d'identification basées sur des variables d'environnement
que les chemins génériques d'authentification/état/sélection de modèle doivent voir sans charger le runtime
du plugin. Utilisez le manifeste `providerAuthAliases` lorsqu'un identifiant de provider doit réutiliser
les variables d'environnement, les profils d'authentification, l'authentification basée sur la configuration et le choix d'onboarding
API-key d'un autre identifiant de provider. Utilisez le manifeste `providerAuthChoices` lorsque les interfaces CLI d'onboarding/choix d'authentification
doivent connaître l'identifiant de choix, les étiquettes de groupe et le câblage d'authentification simple à un indicateur
du provider sans charger son runtime. Gardez le `envVars` du runtime du provider
pour les indications destinées aux opérateurs, telles que les étiquettes d'onboarding ou les variables de configuration
du client-id/client-secret OAuth.

Utilisez manifest `channelEnvVars` lorsqu'un channel a une authentification ou une configuration basée sur l'environnement que le repli générique de l'environnement du shell, les vérifications de configuration/d'état ou les invites de configuration devraient voir sans charger le runtime du channel.

### Ordre et utilisation des hooks

Pour les plugins de modèle/provider, OpenClaw appelle les hooks dans cet ordre approximatif. La colonne « Quand utiliser » sert de guide de décision rapide.

| #   | Hook                              | Ce qu'il fait                                                                                                                                                                         | Quand l'utiliser                                                                                                                                                                                                                    |
| --- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `catalog`                         | Publier la configuration du provider dans `models.providers` lors de la génération `models.json`                                                                                      | Le provider possède un catalogue ou des valeurs par défaut d'URL de base                                                                                                                                                            |
| 2   | `applyConfigDefaults`             | Appliquer les valeurs par défaut de configuration globale possédées par le provider lors de la matérialisation de la configuration                                                    | Les valeurs par défaut dépendent du mode d'authentification, de l'environnement ou de la sémantique de la famille de modèles du provider                                                                                            |
| --  | _(recherche de modèle intégrée)_  | OpenClaw essaie d'abord le chemin normal de registre/catalogue                                                                                                                        | _(pas un hook de plugin)_                                                                                                                                                                                                           |
| 3   | `normalizeModelId`                | Normaliser les alias d'identifiant de modèle hérités ou en aperçu avant la recherche                                                                                                  | Le provider gère le nettoyage des alias avant la résolution du modèle canonique                                                                                                                                                     |
| 4   | `normalizeTransport`              | Normaliser la famille de provider `api` / `baseUrl` avant l'assemblage du modèle générique                                                                                            | Le provider gère le nettoyage du transport pour les ids de provider personnalisés dans la même famille de transport                                                                                                                 |
| 5   | `normalizeConfig`                 | Normaliser `models.providers.<id>` avant la résolution runtime/provider                                                                                                               | Le provider a besoin d'un nettoyage de configuration qui doit résider avec le plugin ; les assistants de la famille Google groupés servent également de filet de sécurité pour les entrées de configuration Google prises en charge |
| 6   | `applyNativeStreamingUsageCompat` | Appliquer les réécritures de compatibilité d'utilisation de diffusion en continu native aux providers de configuration                                                                | Provider a besoin de correctifs de métadonnées d'utilisation du streaming natif piloté par le point de terminaison                                                                                                                  |
| 7   | `resolveConfigApiKey`             | Résoudre l'auth env-marker pour les fournisseurs de configuration avant le chargement de l'auth runtime                                                                               | Le provider dispose d'une résolution de clé API par marqueur d'environnement appartenant au provider ; `amazon-bedrock` dispose également ici d'un résolveur de marqueur d'environnement AWS intégré                                |
| 8   | `resolveSyntheticAuth`            | Exposer l'auth local/auto-hébergé ou basé sur la configuration sans persister le texte en clair                                                                                       | Provider peut fonctionner avec un marqueur d'identification synthétique/local                                                                                                                                                       |
| 9   | `resolveExternalAuthProfiles`     | Superposer les profils d'authentification externe appartenant au provider ; le `persistence` par défaut est `runtime-only` pour les identifiants appartenant à la CLI/à l'application | Provider réutilise les identifiants d'auth externe sans persister les jetons d'actualisation copiés                                                                                                                                 |
| 10  | `shouldDeferSyntheticProfileAuth` | Abaisser les espaces réservés de profil synthétique stockés derrière l'auth env/config                                                                                                | Provider stocke des profils d'espace réservé synthétiques qui ne doivent pas l'emporter en priorité                                                                                                                                 |
| 11  | `resolveDynamicModel`             | Synchrone de repli pour les IDs de modèle appartenant au fournisseur non encore présents dans le registre local                                                                       | Provider accepte les ID de modèle en amont arbitraires                                                                                                                                                                              |
| 12  | `prepareDynamicModel`             | Préchauffage asynchrone, puis `resolveDynamicModel` s'exécute à nouveau                                                                                                               | Provider a besoin des métadonnées réseau avant de résoudre les ID inconnus                                                                                                                                                          |
| 13  | `normalizeResolvedModel`          | Réécriture finale avant que le runner intégré n'utilise le modèle résolu                                                                                                              | Provider a besoin de réécritures de transport mais utilise toujours un transport de base                                                                                                                                            |
| 14  | `contributeResolvedModelCompat`   | Contribuer aux drapeaux de compatibilité pour les modèles fournisseurs derrière un autre transport compatible                                                                         | Provider reconnaît ses propres modèles sur les transports proxy sans reprendre le contrôle du fournisseur                                                                                                                           |
| 15  | `capabilities`                    | Métadonnées de transcription/outillage appartenant au fournisseur utilisées par la logique de base partagée                                                                           | Provider a besoin de particularités de transcription/famille de fournisseurs                                                                                                                                                        |
| 16  | `normalizeToolSchemas`            | Normaliser les schémas d'outils avant que le runner intégré ne les voie                                                                                                               | Provider a besoin d'un nettoyage de schéma de famille de transport                                                                                                                                                                  |
| 17  | `inspectToolSchemas`              | Exposer les diagnostics de schéma appartenant au fournisseur après normalisation                                                                                                      | Provider souhaite des avertissements de mots-clés sans enseigner de règles spécifiques au fournisseur au noyau                                                                                                                      |
| 18  | `resolveReasoningOutputMode`      | Sélectionner le contrat de sortie de raisonnement natif ou balisé                                                                                                                     | Le provider a besoin d'un raisonnement balisé et d'une sortie finale au lieu de champs natifs                                                                                                                                       |
| 19  | `prepareExtraParams`              | Normalisation des paramètres de requête avant les wrappers génériques d'options de flux                                                                                               | Le provider a besoin de paramètres de requête par défaut ou d'un nettoyage des paramètres spécifiques au provider                                                                                                                   |
| 20  | `createStreamFn`                  | Remplacer entièrement le chemin de flux normal par un transport personnalisé                                                                                                          | Le provider a besoin d'un protocole filaire personnalisé, pas seulement d'un wrapper                                                                                                                                                |
| 21  | `wrapStreamFn`                    | Wrapper de flux après l'application des wrappers génériques                                                                                                                           | Le provider a besoin de wrappers de compatibilité pour les en-têtes/corps/model de requête sans transport personnalisé                                                                                                              |
| 22  | `resolveTransportTurnState`       | Attacher les en-têtes de transport ou métadonnées natifs par tour                                                                                                                     | Le provider souhaite que les transports génériques envoient l'identité de tour native au provider                                                                                                                                   |
| 23  | `resolveWebSocketSessionPolicy`   | Attacher les en-têtes WebSocket natifs ou la politique de refroidissement de session                                                                                                  | Le provider souhaite que les transports WS génériques ajustent les en-têtes de session ou la politique de repli                                                                                                                     |
| 24  | `formatApiKey`                    | Formateur de profil d'authentification : le profil stocké devient la chaîne `apiKey` au runtime                                                                                       | Le provider stocke des métadonnées d'auth supplémentaires et a besoin d'une forme de jeton d'exécution personnalisée                                                                                                                |
| 25  | `refreshOAuth`                    | OAuth refresh override for custom refresh endpoints or refresh-failure policy                                                                                                         | Le provider ne correspond pas aux rafraîchisseurs partagés `pi-ai`                                                                                                                                                                  |
| 26  | `buildAuthDoctorHint`             | Indice de réparation ajouté lorsque le rafraîchissement OAuth échoue                                                                                                                  | Le provider a besoin de conseils de réparation d'auth appartenant au provider après un échec de rafraîchissement                                                                                                                    |
| 27  | `matchesContextOverflowError`     | Correspondance de dépassement de fenêtre contextuelle appartenant au provider                                                                                                         | Le provider a des erreurs brutes de dépassement que les heuristiques génériques manqueraient                                                                                                                                        |
| 28  | `classifyFailoverReason`          | Classification des motifs de basculement appartenant au provider                                                                                                                      | Le provider peut mapper les erreurs brutes API/transport à limite de taux/surcharge/etc.                                                                                                                                            |
| 29  | `isCacheTtlEligible`              | Politique de cache de prompt pour les providers proxy/backhaul                                                                                                                        | Le provider a besoin d'une restriction TTL de cache spécifique au proxy                                                                                                                                                             |
| 30  | `buildMissingAuthMessage`         | Remplacement du message générique de récupération d'auth manquante                                                                                                                    | Le provider a besoin d'un indice de récupération d'auth manquante spécifique au provider                                                                                                                                            |
| 31  | `suppressBuiltInModel`            | Suppression du modèle amont obsolète plus indicateur d'erreur facultatif pour l'utilisateur                                                                                           | Le fournisseur doit masquer les lignes amont obsolètes ou les remplacer par un indicateur de fournisseur                                                                                                                            |
| 32  | `augmentModelCatalog`             | Lignes de catalogue synthétiques/finales ajoutées après la découverte                                                                                                                 | Le fournisseur a besoin de lignes de compatibilité ascendante synthétiques dans `models list` et les sélecteurs                                                                                                                     |
| 33  | `isBinaryThinking`                | Interrupteur de raisonnement on/off pour les fournisseurs à pensée binaire                                                                                                            | Le fournisseur expose uniquement la pensée binaire on/off                                                                                                                                                                           |
| 34  | `supportsXHighThinking`           | `xhigh` prise en charge du raisonnement pour les modèles sélectionnés                                                                                                                 | Le fournisseur souhaite `xhigh` sur un seul sous-ensemble de modèles                                                                                                                                                                |
| 35  | `resolveDefaultThinkingLevel`     | Niveau `/think` par défaut pour une famille de modèles spécifique                                                                                                                     | Le fournisseur possède la stratégie `/think` par défaut pour une famille de modèles                                                                                                                                                 |
| 36  | `isModernModelRef`                | Correspondance de modèle moderne pour les filtres de profil en direct et la sélection de test                                                                                         | Le fournisseur possède la correspondance de modèle préféré en direct/test                                                                                                                                                           |
| 37  | `prepareRuntimeAuth`              | Échanger une information d'identification configurée contre le jeton/clé de runtime réel juste avant l'inférence                                                                      | Le fournisseur a besoin d'un échange de jetons ou d'une information d'identification de demande à courte durée de vie                                                                                                               |
| 38  | `resolveUsageAuth`                | Résoudre les identifiants d'utilisation/facturation pour `/usage` et les surfaces d'état associées                                                                                    | Le fournisseur a besoin d'un analyseur de jetons d'utilisation/quota personnalisé ou d'une information d'identification d'utilisation différente                                                                                    |
| 39  | `fetchUsageSnapshot`              | Récupérer et normaliser les instantanés d'utilisation/quota spécifiques au fournisseur après la résolution de l'authentification                                                      | Le fournisseur a besoin d'un point de terminaison d'utilisation spécifique au fournisseur ou d'un analyseur de payload                                                                                                              |
| 40  | `createEmbeddingProvider`         | Construire un adaptateur d'intégration détenu par le fournisseur pour la mémoire/recherche                                                                                            | Le comportement d'intégration de la mémoire appartient au plugin du fournisseur                                                                                                                                                     |
| 41  | `buildReplayPolicy`               | Renvoyer une stratégie de relecture contrôlant la gestion des transcriptions pour le fournisseur                                                                                      | Le fournisseur a besoin d'une stratégie de transcription personnalisée (par exemple, suppression du bloc de raisonnement)                                                                                                           |
| 42  | `sanitizeReplayHistory`           | Réécrire l'historique de relecture après le nettoyage générique de la transcription                                                                                                   | Le fournisseur a besoin de réécritures de relecture spécifiques au fournisseur au-delà des helpers de compactage partagés                                                                                                           |
| 43  | `validateReplayTurns`             | Validation finale ou remodelage du tour de relecture avant le runner intégré                                                                                                          | Le transport de provider nécessite une validation de tour plus stricte après la sanitation générique                                                                                                                                |
| 44  | `onModelSelected`                 | Exécuter les effets secondaires post-sélection appartenant au provider                                                                                                                | Le provider a besoin de télémétrie ou d'état appartenant au provider lorsqu'un modèle devient actif                                                                                                                                 |

`normalizeModelId`, `normalizeTransport` et `normalizeConfig` vérifient d'abord le
plugin fournisseur correspondant, puis passent aux autres plugins fournisseurs capables d'utiliser des hooks
jusqu'à ce que l'un d'eux modifie réellement l'id du modèle ou le transport/config. Cela permet
de maintenir les shims de fournisseur alias/compat fonctionnels sans exiger que l'appelant sache quel
plugin intégré possède la réécriture. Si aucun hook de fournisseur ne réécrit une entrée de configuration
de la famille Google prise en charge, le normaliseur de configuration Google intégré applique toujours
ce nettoyage de compatibilité.

Si le provider a besoin d'un protocole filaire entièrement personnalisé ou d'un exécuteur de requête personnalisé, c'est une classe d'extension différente. Ces hooks concernent le comportement du provider qui s'exécute toujours sur la boucle d'inférence normale d'OpenClaw.

### Exemple de provider

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
  les indications de famille de fournisseur, les conseils de réparation d'auth, l'intégration de l'endpoint d'utilisation,
  l'éligibilité du cache de prompt, les valeurs par défaut de configuration conscientes de l'auth, la stratégie
  de réflexion par défaut/adaptive de Claude, et le façonnage de flux spécifique à Anthropic pour
  les headers bêta, `/fast` / `serviceTier`, et `context1m`.
- Les assistants de flux spécifiques à Claude d'Anthropic restent pour l'instant dans la jonction publique `api.ts` / `contract-api.ts` du plugin groupé. Cette surface de package exporte `wrapAnthropicProviderStream`, `resolveAnthropicBetas`, `resolveAnthropicFastMode`, `resolveAnthropicServiceTier` et les constructeurs de wrapper Anthropic de niveau inférieur, au lieu d'élargir le SDK générique autour des règles d'en-tête bêta d'un seul fournisseur.
- OpenAI utilise `resolveDynamicModel`, `normalizeResolvedModel` et `capabilities` ainsi que `buildMissingAuthMessage`, `suppressBuiltInModel`, `augmentModelCatalog`, `supportsXHighThinking` et `isModernModelRef`, car il possède la compatibilité ascendante GPT-5.4, la normalisation directe `openai-completions` -> `openai-responses` d'OpenAI, les indices d'authentiation Codex-aware, la suppression Spark, les lignes de liste synthétiques OpenAI et la stratégie de réflexion / modèle en direct GPT-5 ; la famille de flux `openai-responses-defaults` possède les wrappers natifs partagés OpenAI Responses pour les en-têtes d'attribution, `/fast`/`serviceTier`, la verbosité du texte, la recherche web Codex native, le façonnage de payload compatible raisonnement et la gestion du contexte Responses.
- OpenRouter utilise `catalog` ainsi que `resolveDynamicModel` et `prepareDynamicModel`, car le fournisseur est un canal passant et peut exposer de nouveaux identifiants de modèle avant les mises à jour du catalogue statique d'OpenClaw ; il utilise également `capabilities`, `wrapStreamFn` et `isCacheTtlEligible` pour garder les en-têtes de demande spécifiques au fournisseur, les métadonnées de routage, les correctifs de raisonnement et la stratégie de cache de invites hors du cœur. Sa stratégie de relecture provient de la famille `passthrough-gemini`, tandis que la famille de flux `openrouter-thinking` possède l'injection de raisonnement proxy et les sauts de modèle non pris en charge / `auto`.
- GitHub Copilot utilise `catalog`, `auth`, `resolveDynamicModel`, et
  `capabilities` plus `prepareRuntimeAuth` et `fetchUsageSnapshot` car il
  a besoin d'une connexion appareil propriétaire du provider, du comportement de repli de model, des particularités des
  transcriptions Claude, d'un échange de jeton GitHub -> jeton Copilot, et d'un point de terminaison d'utilisation
  propriétaire du provider.
- OpenAI Codex utilise `catalog`, `resolveDynamicModel`,
  `normalizeResolvedModel`, `refreshOAuth`, et `augmentModelCatalog` plus
  `prepareExtraParams`, `resolveUsageAuth`, et `fetchUsageSnapshot` car il
  fonctionne toujours sur les transports OpenAI de base mais possède sa propre normalisation du transport/de l'URL de base,
  sa politique de repli de rafraîchissement OpenAI, son choix de transport par défaut,
  ses lignes de catalogue Codex synthétiques et l'intégration du point de terminaison d'utilisation ChatGPT ; il
  partage la même famille de flux `openai-responses-defaults` que OAuth direct.
- Google AI Studio et CLI OAuth utilisent `resolveDynamicModel`,
  `buildReplayPolicy`, `sanitizeReplayHistory`,
  `resolveReasoningOutputMode`, `wrapStreamFn`, et `isModernModelRef` car la
  famille de relecture `google-gemini` gère le repli de compatibilité avant Gemini 3.1,
  la validation de relecture native Gemini, le nettoyage de relecture bootstrap, le mode
  de raisonnement-sortie balisé, et la correspondance des modèles modernes, tandis que la
  famille de flux `google-thinking` gère la normalisation de la charge utile de réflexion Gemini ;
  CLI OAuth utilise également `formatApiKey`, `resolveUsageAuth`, et
  `fetchUsageSnapshot` pour le formatage des jetons, l'analyse des jetons et le câblage du point de terminaison
  de quota.
- Anthropic Vertex utilise `buildReplayPolicy` via la
  famille de relecture `anthropic-by-model` afin que le nettoyage de relecture spécifique à Claude reste
  limité aux identifiants Claude plutôt qu'à chaque transport `anthropic-messages`.
- Amazon Bedrock utilise `buildReplayPolicy`, `matchesContextOverflowError`,
  `classifyFailoverReason` et `resolveDefaultThinkingLevel` car il possède la
  classification des erreurs de limitation d'accès (throttle), de non-préparation et de dépassement de contexte spécifique à Bedrock
  pour le trafic Anthropic-sur-Bedrock ; sa stratégie de réessai partage toujours la même
  garde `anthropic-by-model` pour Claude uniquement.
- OpenRouter, Kilocode, Opencode et Opencode Go utilisent `buildReplayPolicy`
  via la famille de réessai `passthrough-gemini` car ils mandataires (proxy) les modèles
  Gemini via des transports compatibles OpenAI et ont besoin d'une assainissement
  des signatures de pensée Gemini sans validation de réessai Gemini native ou
  réécritures d'amorçage (bootstrap).
- MiniMax utilise `buildReplayPolicy` via la
  famille de réessai `hybrid-anthropic-openai` car un fournisseur possède à la fois
  la sémantique de message Anthropic et la sémantique compatible OpenAI ; il maintient
  la suppression des blocs de pensée (thinking-block) Claude uniquement du côté Anthropic tout en remplaçant le
  mode de sortie de raisonnement par natif, et la famille de flux `minimax-fast-mode` possède
  les réécritures de modèle en mode rapide sur le chemin de flux partagé.
- Moonshot utilise `catalog` plus `wrapStreamFn` car il utilise toujours le transport
  partagé OpenAI mais a besoin d'une normalisation de la charge utile de pensée (thinking payload) propriétaire au fournisseur ; la
  famille de flux `moonshot-thinking` mappe la configuration plus l'état `/think` sur sa
  charge utile de pensée binaire native.
- Kilocode utilise `catalog`, `capabilities`, `wrapStreamFn` et
  `isCacheTtlEligible` car il a besoin d'en-têtes de requête propriétaires au fournisseur,
  d'une normalisation de la charge utile de raisonnement, d'indices de transcription Gemini et d'un contrôle de TTL
  de cache Anthropic ; la famille de flux `kilocode-thinking` maintient l'injection de pensée Kilo
  sur le chemin de flux de proxy partagé tout en ignorant `kilo/auto` et
  d'autres ids de modèle proxy qui ne prennent pas en charge les charges utiles de raisonnement explicites.
- Z.AI utilise `resolveDynamicModel`, `prepareExtraParams`, `wrapStreamFn`,
  `isCacheTtlEligible`, `isBinaryThinking`, `isModernModelRef`,
  `resolveUsageAuth` et `fetchUsageSnapshot` car il possède le basculement (fallback) vers GLM-5,
  les valeurs par défaut `tool_stream`, l'UX de pensée binaire, la correspondance de modèle moderne, ainsi que
  l'authentification d'utilisation et la récupération des quotas ; la famille de flux `tool-stream-default-on`
  maintient l'enveloppe `tool_stream` activée par défaut en dehors du code de "glue" écrit à la main pour chaque provider.
- xAI utilise `normalizeResolvedModel`, `normalizeTransport`,
  `contributeResolvedModelCompat`, `prepareExtraParams`, `wrapStreamFn`,
  `resolveSyntheticAuth`, `resolveDynamicModel` et `isModernModelRef`
  car il possède la normalisation native du transport xAI Responses, la réécriture des alias mode rapide Grok,
  le `tool_stream` par défaut, le nettoyage strict des outils / des payloads de raisonnement,
  la réutilisation de l'authentification de secours pour les outils détenus par le plugin, la résolution de modèle Grok
  compatible avec les versions futures, et les correctifs de compatibilité détenus par le provider tels que le profil de schéma d'outil xAI,
  les mots-clés de schéma non pris en charge, le `web_search` natif, et le décodage
  des arguments d'appel d'outil d'entités HTML.
- Mistral, OpenCode Zen et OpenCode Go utilisent uniquement `capabilities` pour garder
  les particularités de transcription/d'outillage en dehors du cœur.
- Les providers groupés catalogue uniquement tels que `byteplus`, `cloudflare-ai-gateway`,
  `huggingface`, `kimi-coding`, `nvidia`, `qianfan`,
  `synthetic`, `together`, `venice`, `vercel-ai-gateway` et `volcengine` utilisent
  uniquement `catalog`.
- Qwen utilise `catalog` pour son provider de texte ainsi que les enregistrements partagés de compréhension média
  et de génération vidéo pour ses surfaces multimodales.
- MiniMax et Xiaomi utilisent `catalog` ainsi que des hooks d'utilisation car leur comportement `/usage`
  est propriétaire du plugin même si l'inférence s'exécute toujours via les
  transports partagés.

## Helpers d'exécution

Les plugins peuvent accéder à certains helpers principaux via `api.runtime`. Pour le TTS :

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

- `textToSpeech` renvoie la charge utile de sortie TTS principale normale pour les surfaces de fichiers/notes vocales.
- Utilise la configuration `messages.tts` principale et la sélection du provider.
- Renvoie le tampon audio PCM + le taux d'échantillonnage. Les plugins doivent rééchantillonner/encoder pour les providers.
- `listVoices` est optionnel par provider. Utilisez-le pour les sélecteurs de voix ou les flux de configuration propriétaires du vendeur.
- Les listes de voix peuvent inclure des métadonnées plus riches telles que les paramètres régionaux, le genre et les étiquettes de personnalité pour les sélecteurs conscients des providers.
- OpenAI et ElevenLabs prennent en charge la téléphonie aujourd'hui. Microsoft ne le fait pas.

Les plugins peuvent également enregistrer des providers de synthèse vocale via `api.registerSpeechProvider(...)`.

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

- Conservez la stratégie, le repli et la livraison des réponses TTS dans le cœur.
- Utilisez les providers de reconnaissance vocale pour le comportement de synthèse propre au fournisseur.
- L'entrée `edge` héritée de Microsoft est normalisée vers l'id de provider `microsoft`.
- Le modèle de propriété privilégié est orienté entreprise : un plugin fournisseur peut posséder
  des providers de texte, de reconnaissance vocale, d'image et de futurs médias, à mesure que OpenClaw ajoute ces
  contrats de capacité.

Pour la compréhension d'image/audio/vidéo, les plugins enregistrent un provider
de compréhension de média typé au lieu d'un sac générique clé/valeur :

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

- Gardez l'orchestration, le repli, la configuration et le câblage de canal dans le cœur.
- Gardez le comportement du fournisseur dans le plugin provider.
- L'expansion additive doit rester typée : nouvelles méthodes optionnelles, nouveaux champs de
  résultat optionnels, nouvelles capacités optionnelles.
- La génération vidéo suit déjà le même modèle :
  - le cœur possède le contrat de capacité et l'helper d'exécution
  - les plugins de vendeur enregistrent `api.registerVideoGenerationProvider(...)`
  - les plugins de fonctionnalités/channel consomment `api.runtime.videoGeneration.*`

Pour les helpers d'exécution de compréhension de média, les plugins peuvent appeler :

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

Pour la transcription audio, les plugins peuvent utiliser soit l'exécution de compréhension de média
soit l'alias STT plus ancien :

```ts
const { text } = await api.runtime.mediaUnderstanding.transcribeAudioFile({
  filePath: "/tmp/inbound-audio.ogg",
  cfg: api.config,
  // Optional when MIME cannot be inferred reliably:
  mime: "audio/ogg",
});
```

Notes :

- `api.runtime.mediaUnderstanding.*` est la surface partagée préférée pour
  la compréhension d'image/audio/vidéo.
- Utilise la configuration audio principale de compréhension des médias (`tools.media.audio`) et l'ordre de repli des providers.
- Renvoie `{ text: undefined }` lorsqu'aucune sortie de transcription n'est produite (par exemple entrée ignorée/non prise en charge).
- `api.runtime.stt.transcribeAudioFile(...)` reste un alias de compatibilité.

Les plugins peuvent également lancer des exécutions de sous-agents en arrière-plan via `api.runtime.subagent` :

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

- `provider` et `model` sont des remplacements optionnels par exécution, et non des modifications persistantes de session.
- OpenClaw ne respecte ces champs de substitution que pour les appelants de confiance.
- Pour les exécutions de repli propriétaires du plugin, les opérateurs doivent opter pour `plugins.entries.<id>.subagent.allowModelOverride: true`.
- Utilisez `plugins.entries.<id>.subagent.allowedModels` pour restreindre les plugins de confiance à des `provider/model` canoniques spécifiques, ou `"*"` pour autoriser explicitement n'importe quelle cible.
- Les exécutions de sous-agents par des plugins non approuvés fonctionnent toujours, mais les demandes de substitution sont rejetées au lieu de passer silencieusement en mode repli.

Pour la recherche web, les plugins peuvent utiliser l'assistant d'exécution partagé au lieu
d'accéder au câblage de l'outil de l'agent :

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

- Gardez la sélection du provider, la résolution des identifiants et la sémantique des requêtes partagées dans le cœur.
- Utilisez les providers de recherche web pour les transports de recherche spécifiques aux fournisseurs.
- `api.runtime.webSearch.*` est la surface partagée préférée pour les plugins de fonctionnalités/channel qui ont besoin d'un comportement de recherche sans dépendre du wrapper de l'outil de l'agent.

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

- `generate(...)` : générer une image en utilisant la chaîne de providers de génération d'images configurée.
- `listProviders(...)` : lister les providers de génération d'images disponibles et leurs capacités.

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

- `path` : chemin de routage sous le serveur HTTP du Gateway.
- `auth` : requis. Utilisez `"gateway"` pour exiger l'authentification Gateway normale, ou `"plugin"` pour une authentification gérée par le plugin/vérification de webhook.
- `match` : optionnel. `"exact"` (par défaut) ou `"prefix"`.
- `replaceExisting` : optionnel. Permet au même plugin de remplacer son propre enregistrement de route existant.
- `handler` : renvoyer `true` lorsque la route a traité la requête.

Notes :

- `api.registerHttpHandler(...)` a été supprimé et provoquera une erreur de chargement de plugin. Utilisez plutôt `api.registerHttpRoute(...)`.
- Les routes de plugin doivent déclarer `auth` explicitement.
- Les conflits exacts de `path + match` sont rejetés, sauf si `replaceExisting: true`, et un plugin ne peut pas remplacer la route d'un autre plugin.
- Les routes qui se chevauchent avec différents niveaux de `auth` sont rejetées. Gardez les chaînes de secours `exact`/`prefix` uniquement sur le même niveau d'authentification.
- Les routes `auth: "plugin"` ne reçoivent **pas** automatiquement les portées d'exécution de l'opérateur. Elles sont destinées aux webhooks gérés par le plugin/vérification de signature, et non aux appels d'assistance privilégiés du Gateway.
- Les routes `auth: "gateway"` s'exécutent dans une portée d'exécution de requête Gateway, mais cette portée est intentionnellement conservatrice :
  - l'authentification bearer par secret partagé (`gateway.auth.mode = "token"` / `"password"`) maintient les portées d'exécution des routes de plugin liées à `operator.write`, même si l'appelant envoie `x-openclaw-scopes`
  - les modes HTTP porteurs d'identité de confiance (par exemple `trusted-proxy` ou `gateway.auth.mode = "none"` sur une entrée privée) honorent `x-openclaw-scopes` uniquement lorsque l'en-tête est explicitement présent
  - si `x-openclaw-scopes` est absent sur ces demandes de route de plugin porteuses d'identité, la portée d'exécution revient à `operator.write`
- Règle pratique : ne supposez pas qu'une route de plugin avec authentification passerelle est une surface d'administration implicite. Si votre route nécessite un comportement réservé aux administrateurs, exigez un mode d'authentification porteur d'identité et documentez le contrat explicite de l'en-tête `x-openclaw-scopes`.

## Chemins d'import du Plugin SDK

Utilisez les sous-chemins du SDK plutôt que l'import monolithique `openclaw/plugin-sdk` lors de
la rédaction de plugins :

- `openclaw/plugin-sdk/plugin-entry` pour les primitives d'enregistrement de plugins.
- `openclaw/plugin-sdk/core` pour le contrat générique partagé orienté plugin.
- `openclaw/plugin-sdk/config-schema` pour le schéma Zod `openclaw.json` racine
  export (`OpenClawSchema`).
- Primitives de canal stables tels que `openclaw/plugin-sdk/channel-setup`,
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
  `openclaw/plugin-sdk/secret-input`, et
  `openclaw/plugin-sdk/webhook-ingress` pour le câblage partagé de configuration, d'authentification, de réponse et de webhook. `channel-inbound` est le domicile partagé pour le debounce, la correspondance de mentions, les assistants de stratégie de mentions entrantes, le formatage d'enveloppe et les assistants de contexte d'enveloppe entrante.
  `channel-setup` est le point de configuration étroit à installation facultative.
  `setup-runtime` est la surface de configuration sûre pour l'exécution utilisée par `setupEntry` /
  le démarrage différé, y compris les adaptateurs de correctifs de configuration sûrs pour l'importation.
  `setup-adapter-runtime` est le point d'adaptateur de configuration de compte conscient de l'environnement.
  `setup-tools` est le petit point d'assistance CLI/archive/docs (`formatCliCommand`,
  `detectBinary`, `extractArchive`, `resolveBrewExecutable`, `formatDocsLink`,
  `CONFIG_DIR`).
- Les sous-chemins de domaine tels que `openclaw/plugin-sdk/channel-config-helpers`,
  `openclaw/plugin-sdk/allow-from`,
  `openclaw/plugin-sdk/channel-config-schema`,
  `openclaw/plugin-sdk/telegram-command-config`,
  `openclaw/plugin-sdk/channel-policy`,
  `openclaw/plugin-sdk/approval-gateway-runtime`,
  `openclaw/plugin-sdk/approval-handler-adapter-runtime`,
  `openclaw/plugin-sdk/approval-handler-runtime`,
  `openclaw/plugin-sdk/approval-runtime`,
  `openclaw/plugin-sdk/config-runtime`,
  `openclaw/plugin-sdk/infra-runtime`,
  `openclaw/plugin-sdk/agent-runtime`,
  `openclaw/plugin-sdk/lazy-runtime`,
  `openclaw/plugin-sdk/reply-history`,
  `openclaw/plugin-sdk/routing`,
  `openclaw/plugin-sdk/status-helpers`,
  `openclaw/plugin-sdk/text-runtime`,
  `openclaw/plugin-sdk/runtime-store`, et
  `openclaw/plugin-sdk/directory-runtime` pour les assistants d'exécution/config partagés.
  `telegram-command-config` est la jonction publique étroite pour la normalisation/validation
  des commandes personnalisées Telegram et reste disponible même si la surface
  du contrat Telegram groupé est temporairement indisponible.
  `text-runtime` est la jonction partagée pour texte/markdown/journalisation, incluant
  le nettoyage du texte visible par l'assistant, les assistants de rendus/découpages markdown,
  les assistants de rédaction, les helpers de balises directives et les utilitaires de texte sécurisé.
- Les jonctions de channel spécifiques à l'approbation devraient privilégier un contrat `approvalCapability`
  sur le plugin. Le lit central lit ensuite l'authentification, la livraison, le rendu,
  le routage natif et le comportement du gestionnaire natif différé via cette capacité unique
  au lieu de mélanger le comportement d'approbation dans des champs de plugin non liés.
- `openclaw/plugin-sdk/channel-runtime` est obsolète et ne reste qu'une
  couche de compatibilité pour les anciens plugins. Le nouveau code devrait plutôt importer
  les primitives génériques plus étroites, et le code du dépôt ne devrait pas ajouter de nouveaux
  imports de cette couche.
- Les internes des extensions groupées restent privés. Les plugins externes ne doivent utiliser que
  les sous-chemins `openclaw/plugin-sdk/*`. Le code cœur/test de OpenClaw peut utiliser les points d'entrée
  publics du dépôt sous une racine de package de plugin telle que `index.js`, `api.js`,
  `runtime-api.js`, `setup-entry.js`, et des fichiers à portée étroite tels que
  `login-qr-api.js`. N'importez jamais le `src/*` d'un package de plugin depuis le cœur ou depuis
  une autre extension.
- Répartition du point d'entrée du dépôt :
  `<plugin-package-root>/api.js` est le module utilitaire/types,
  `<plugin-package-root>/runtime-api.js` est le module d'exécution uniquement,
  `<plugin-package-root>/index.js` est le point d'entrée du plugin groupé,
  et `<plugin-package-root>/setup-entry.js` est le point d'entrée du plugin de configuration.
- Exemples actuels de providers groupés :
  - Anthropic utilise `api.js` / `contract-api.js` pour les utilitaires de flux Claude tels
    que `wrapAnthropicProviderStream`, les utilitaires d'en-tête bêta, et l'analyse `service_tier`.
  - OpenAI utilise `api.js` pour les constructeurs de provider, les utilitaires de model par défaut, et
    les constructeurs de provider en temps réel.
  - OpenRouter utilise `api.js` pour son constructeur de provider ainsi que pour les utilitaires d'onboarding/configuration,
    tandis que `register.runtime.js` peut toujours réexporter des utilitaires génériques
    `plugin-sdk/provider-stream` pour une utilisation locale dans le dépôt.
- Les points d'entrée publics chargés par la façade privilégient l'instantané de configuration d'exécution actif
  lorsqu'il existe, puis reviennent au fichier de configuration résolu sur disque lorsque
  OpenClaw ne fournit pas encore d'instantané d'exécution.
- Les primitives partagées génériques restent le contrat public SDK préféré. Un petit
  ensemble de compatibilité réservé de points d'assemblage (seams) d'utilitaires groupés et marqués par channel existe
  toujours. Traitez-les comme des points d'assemblage de maintenance/compatibilité groupés, et non comme de nouvelles
  cibles d'importation pour des tiers ; les nouveaux contrats inter-channel doivent toujours aboutir sur
  des sous-chemins génériques `plugin-sdk/*` ou les modules locaux du plugin `api.js` /
  `runtime-api.js`.

Note de compatibilité :

- Évitez le module racine `openclaw/plugin-sdk` pour le nouveau code.
- Privilégiez d'abord les primitives stables étroites. Les nouveaux sous-chemins setup/pairing/reply/
  feedback/contract/inbound/threading/command/secret-input/webhook/infra/
  allowlist/status/message-tool constituent le contrat prévu pour les nouveaux
  travaux de plugin groupés et externes.
  L'analyse/correspondance de la cible appartient à `openclaw/plugin-sdk/channel-targets`.
  Les portes d'action de message et les utilitaires d'ID de message de réaction appartiennent à
  `openclaw/plugin-sdk/channel-actions`.
- Les modules d'utilitaires spécifiques aux extensions groupées ne sont pas stables par défaut. Si un
  utilitaire n'est nécessaire que par une extension groupée, gardez-le derrière le point d'assemblage (seam)
  local `api.js` ou `runtime-api.js` de l'extension au lieu de le promouvoir dans
  `openclaw/plugin-sdk/<extension>`.
- Les nouvelles coutures d'assistants partagés doivent être génériques, et non spécifiques à un channel. L'analyse de cible partagée appartient à `openclaw/plugin-sdk/channel-targets` ; les internes spécifiques au channel restent derrière la couture locale `api.js` ou `runtime-api.js` du plugin propriétaire.
- Les sous-chemins spécifiques aux capacités tels que `image-generation`, `media-understanding` et `speech` existent parce que les plugins groupés/natifs les utilisent aujourd'hui. Leur présence ne signifie pas par elle-même que chaque assistant exporté est un contrat externe gelé à long terme.

## Schémas de l'outil de message

Les plugins doivent posséder les contributions de schéma `describeMessageTool(...)` spécifiques au channel. Gardez les champs spécifiques au provider dans le plugin, et non dans le cœur partagé.

Pour les fragments de schéma portables partagés, réutilisez les assistants génériques exportés via `openclaw/plugin-sdk/channel-actions` :

- `createMessageToolButtonsSchema()` pour les payloads de style grille de boutons
- `createMessageToolCardSchema()` pour les payloads de cartes structurées

Si une forme de schéma n'a de sens que pour un seul provider, définissez-la dans la source de ce plugin au lieu de la promouvoir dans le SDK partagé.

## Résolution de cible de channel

Les plugins de channel doivent posséder la sémantique de cible spécifique au channel. Gardez l'hôte sortant partagé générique et utilisez la surface de l'adaptateur de messagerie pour les règles du provider :

- `messaging.inferTargetChatType({ to })` décide si une cible normalisée doit être traitée comme `direct`, `group` ou `channel` avant la recherche de répertoire.
- `messaging.targetResolver.looksLikeId(raw, normalized)` indique au cœur si une entrée doit passer directement à une résolution de type identifiant au lieu d'une recherche de répertoire.
- `messaging.targetResolver.resolveTarget(...)` est le repli du plugin lorsque le cœur a besoin d'une résolution finale détenue par le provider après normalisation ou après un échec de répertoire.
- `messaging.resolveOutboundSessionRoute(...)` possède la construction de routes de session spécifiques au provider une fois la cible résolue.

Répartition recommandée :

- Utilisez `inferTargetChatType` pour les décisions de catégorie qui doivent se produire avant la recherche de pairs/groupes.
- Utilisez `looksLikeId` pour les vérifications de type « traiter ceci comme un identifiant de cible explicite/natif ».
- Utilisez `resolveTarget` pour le repli de normalisation spécifique au provider, et non pour une recherche large de répertoire.
- Conservez les identifiants natifs du provider tels que les identifiants de chat, de thread, les JIDs, les handles et les identifiants de salle dans les valeurs `target` ou les paramètres spécifiques au provider, et non dans les champs SDK génériques.

## Répertoires basés sur la configuration

Les plugins qui dérivent des entrées de répertoire à partir de la configuration doivent conserver cette logique dans le
plugin et réutiliser les helpers partagés de
`openclaw/plugin-sdk/directory-runtime`.

Utilisez ceci lorsqu'un channel a besoin de pairs/groupes basés sur la configuration, tels que :

- pairs DM basés sur une liste blanche
- maps de canal/groupe configurés
- replis d'annuaire statique limités au compte

Les helpers partagés dans `directory-runtime` ne gèrent que les opérations génériques :

- filtrage des requêtes
- application de la limite
- helpers de déduplication/normalisation
- construire `ChannelDirectoryEntry[]`

L'inspection de compte spécifique au channel et la normalisation des ID doivent rester dans l'implémentation
du plugin.

## Catalogues de provider

Les plugins provider peuvent définir des catalogues de modèles pour l'inférence avec
`registerProvider({ catalog: { run(...) { ... } } })`.

`catalog.run(...)` renvoie la même forme que OpenClaw écrit dans
`models.providers` :

- `{ provider }` pour une entrée provider
- `{ providers }` pour plusieurs entrées provider

Utilisez `catalog` lorsque le plugin possède des IDs de modèle spécifiques au provider, des valeurs par défaut d'URL de base
ou des métadonnées de modèle protégées par authentification.

`catalog.order` contrôle le moment où le catalogue d'un plugin fusionne par rapport aux providers implicites intégrés de OpenClaw :

- `simple` : providers avec clé API simple ou pilotés par l'environnement
- `profile` : providers qui apparaissent lorsque des profils d'authentification existent
- `paired` : providers qui synthétisent plusieurs entrées de provider liées
- `late` : dernière passe, après les autres providers implicites

Les providers ultérieurs l'emportent en cas de collision de clé, les plugins peuvent donc intentionnellement remplacer une
entrée de provider intégrée avec le même ID de provider.

Compatibilité :

- `discovery` fonctionne toujours comme un alias historique
- si `catalog` et `discovery` sont tous deux enregistrés, OpenClaw utilise `catalog`

## Inspection en lecture seule du canal

Si votre plugin enregistre un channel, privilégiez l'implémentation de
`plugin.config.inspectAccount(cfg, accountId)` ainsi que `resolveAccount(...)`.

Pourquoi :

- `resolveAccount(...)` est le chemin d'exécution. Il est supposé que les informations d'identification
  sont entièrement matérialisées et peut échouer rapidement lorsque les secrets requis sont manquants.
- Les chemins de commande en lecture seule tels que `openclaw status`, `openclaw status --all`,
  `openclaw channels status`, `openclaw channels resolve`, et les flux de réparation doctor/config
  ne devraient pas avoir besoin de matérialiser les informations d'identification d'exécution juste pour
  décrire la configuration.

Comportement recommandé pour `inspectAccount(...)` :

- Ne renvoyez que l'état descriptif du compte.
- Préservez `enabled` et `configured`.
- Incluez les champs de source/statut des informations d'identification lorsque cela est pertinent, tels que :
  - `tokenSource`, `tokenStatus`
  - `botTokenSource`, `botTokenStatus`
  - `appTokenSource`, `appTokenStatus`
  - `signingSecretSource`, `signingSecretStatus`
- Vous n'avez pas besoin de renvoyer les valeurs brutes des jetons simplement pour signaler la disponibilité en lecture seule.
  Renvoyer `tokenStatus: "available"` (et le champ source correspondant) suffit pour les commandes de type statut.
- Utilisez `configured_unavailable` lorsqu'une identifiant est configuré via SecretRef mais
  indisponible dans le chemin de commande actuel.

Cela permet aux commandes en lecture seule de signaler « configuré mais indisponible dans ce chemin
de commande » au lieu de planter ou de signaler incorrectement que le compte n'est pas configuré.

## Packs de paquets

Un répertoire de plugin peut inclure un `package.json` avec `openclaw.extensions` :

```json
{
  "name": "my-pack",
  "openclaw": {
    "extensions": ["./src/safety.ts", "./src/tools.ts"],
    "setupEntry": "./src/setup-entry.ts"
  }
}
```

Chaque entrée devient un plugin. Si le pack liste plusieurs extensions, l'identifiant du plugin
devient `name/<fileBase>`.

Si votre plugin importe des dépendances npm, installez-les dans ce répertoire afin que
`node_modules` soit disponible (`npm install` / `pnpm install`).

Garantie de sécurité : chaque entrée `openclaw.extensions` doit rester à l'intérieur du répertoire du plugin
après la résolution des liens symboliques. Les entrées qui s'échappent du répertoire du paquet sont
rejetées.

Note de sécurité : `openclaw plugins install` installe les dépendances du plugin avec
`npm install --omit=dev --ignore-scripts` (pas de scripts de cycle de vie, pas de dépendances de développement à l'exécution). Gardez les arbres de dépendances du plugin "pur JS/TS" et évitez les paquets qui nécessitent des builds `postinstall`.

Optionnel : `openclaw.setupEntry` peut pointer vers un module léger de configuration uniquement.
Lorsque OpenClaw a besoin de surfaces de configuration pour un plugin de canal désactivé, ou
lorsqu'un plugin de canal est activé mais toujours non configuré, il charge `setupEntry`
au lieu de l'entrée complète du plugin. Cela rend le démarrage et la configuration plus légers
lorsque votre entrée principale du plugin connecte également des outils, des hooks ou d'autres codes
uniquement d'exécution.

Optionnel : `openclaw.startup.deferConfiguredChannelFullLoadUntilAfterListen`
peut permettre à un plugin de canal d'emprunter le même chemin `setupEntry` pendant la phase de démarrage
pré-écoute de la passerelle, même lorsque le canal est déjà configuré.

N'utilisez ceci que lorsque `setupEntry` couvre entièrement la surface de démarrage qui doit exister avant que la passerelle ne commence à écouter. En pratique, cela signifie que l'entrée de configuration doit enregistrer chaque capacité détenue par le canal dont dépend le démarrage, telle que :

- l'enregistrement du canal lui-même
- toutes les routes HTTP qui doivent être disponibles avant que la passerelle ne commence à écouter
- toutes les méthodes, outils ou services de passerelle qui doivent exister pendant cette même fenêtre

Si votre entrée complète possède toujours une fonctionnalité de démarrage requise, n'activez pas ce drapeau. Conservez le comportement par défaut du plugin et laissez OpenClaw charger l'entrée complète lors du démarrage.

Les canals regroupés (bundled) peuvent également publier des assistants de surface de contrat de configuration uniquement que le cœur peut consulter avant le chargement de l'exécution complète du canal. La surface actuelle de promotion de la configuration est :

- `singleAccountKeysToMove`
- `namedAccountPromotionKeys`
- `resolveSingleAccountPromotionTarget(...)`

Le cœur utilise cette surface lorsqu'il doit promouvoir une configuration de canal à compte unique héritée en `channels.<id>.accounts.*` sans charger l'entrée complète du plugin. Matrix est l'exemple groupé actuel : il ne déplace que les clés d'authentification/d'amorçage dans un compte promu nommé lorsque des comptes nommés existent déjà, et il peut préserver une clé de compte par défaut configurée non canonique au lieu de toujours créer `accounts.default`.

Ces adaptateurs de correctifs de configuration maintiennent la découverte de la surface de contrat groupée paresseuse. Le temps d'importation reste léger ; la surface de promotion n'est chargée qu'à la première utilisation au lieu de ré-entrer dans le démarrage du channel groupé lors de l'importation du module.

Lorsque ces surfaces de démarrage incluent des méthodes RPC de la passerelle, gardez-les sur un préfixe spécifique au plugin. Les espaces de noms d'administration du cœur (`config.*`, `exec.approvals.*`, `wizard.*`, `update.*`) restent réservés et résolvent toujours vers `operator.admin`, même si un plugin demande une portée plus étroite.

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

### Métadonnées du catalogue de channels

Les plugins de canal peuvent publier des métadonnées de configuration/découverte via `openclaw.channel` et des indices d'installation via `openclaw.install`. Cela maintient le catalogue principal sans données.

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

- `detailLabel` : étiquette secondaire pour des surfaces de catalogue/état plus riches
- `docsLabel` : remplacer le texte du lien pour le lien vers la documentation
- `preferOver` : identifiants de plugin/canal de moindre priorité que cette entrée de catalogue doit dépasser
- `selectionDocsPrefix`, `selectionDocsOmitLabel`, `selectionExtras` : contrôles de copie de la surface de sélection
- `markdownCapable` : marque le canal comme compatible markdown pour les décisions de formatage sortant
- `exposure.configured` : masque le canal des surfaces de liste des canaux configurés lorsqu'il est défini sur `false`
- `exposure.setup` : masque le canal des sélecteurs de configuration interactive lorsqu'il est défini sur `false`
- `exposure.docs` : marquer le channel comme interne/privé pour les surfaces de navigation de la documentation
- `showConfigured` / `showInSetup` : alias obsolètes toujours acceptés pour la compatibilité ; privilégiez `exposure`
- `quickstartAllowFrom` : opter pour le channel dans le flux de démarrage rapide standard `allowFrom`
- `forceAccountBinding` : exiger une liaison de compte explicite même lorsqu'un seul compte existe
- `preferSessionLookupForAnnounceTarget` : privilégier la recherche de session lors de la résolution des cibles d'annonce

OpenClaw peut également fusionner des **catalogues de channels externes** (par exemple, un export de registre MPM). Déposez un fichier JSON à l'un des emplacements suivants :

- `~/.openclaw/mpm/plugins.json`
- `~/.openclaw/mpm/catalog.json`
- `~/.openclaw/plugins/catalog.json`

Ou pointez `OPENCLAW_PLUGIN_CATALOG_PATHS` (ou `OPENCLAW_MPM_CATALOG_PATHS`) vers
un ou plusieurs fichiers JSON (délimités par des virgules, des points-virgules ou `PATH`). Chaque fichier doit
contenir `{ "entries": [ { "name": "@scope/pkg", "openclaw": { "channel": {...}, "install": {...} } } ] }`. L'analyseur accepte également `"packages"` ou `"plugins"` comme alias obsolètes pour la clé `"entries"`.

## Plugins de moteur de contexte

Les plugins de moteur de contexte possèdent l'orchestration du contexte de session pour l'ingestion, l'assemblage
et la compactage. Enregistrez-les depuis votre plugin avec
`api.registerContextEngine(id, factory)`, puis sélectionnez le moteur actif avec
`plugins.slots.contextEngine`.

Utilisez ceci lorsque votre plugin doit remplacer ou étendre le pipeline de contexte par défaut
plutôt que d'ajouter simplement une recherche de mémoire ou des crochets (hooks).

```ts
import { buildMemorySystemPromptAddition } from "openclaw/plugin-sdk/core";

export default function (api) {
  api.registerContextEngine("lossless-claw", () => ({
    info: { id: "lossless-claw", name: "Lossless Claw", ownsCompaction: true },
    async ingest() {
      return { ingested: true };
    },
    async assemble({ messages, availableTools, citationsMode }) {
      return {
        messages,
        estimatedTokens: 0,
        systemPromptAddition: buildMemorySystemPromptAddition({
          availableTools: availableTools ?? new Set(),
          citationsMode,
        }),
      };
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
import { buildMemorySystemPromptAddition, delegateCompactionToRuntime } from "openclaw/plugin-sdk/core";

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
    async assemble({ messages, availableTools, citationsMode }) {
      return {
        messages,
        estimatedTokens: 0,
        systemPromptAddition: buildMemorySystemPromptAddition({
          availableTools: availableTools ?? new Set(),
          citationsMode,
        }),
      };
    },
    async compact(params) {
      return await delegateCompactionToRuntime(params);
    },
  }));
}
```

## Ajouter une nouvelle capacité

Lorsqu'un plugin a besoin d'un comportement qui ne correspond pas à l'API actuelle, ne contournez pas
le système de plugins avec un accès privé. Ajoutez la capacité manquante.

Séquence recommandée :

1. définir le contrat principal
   Décidez du comportement partagé que le cœur doit posséder : stratégie, repli, fusion de configuration,
   cycle de vie, sémantique orientée channel, et forme de l'aide d'exécution.
2. ajouter des surfaces d'exécution et d'enregistrement de plugins typés
   Étendez `OpenClawPluginApi` et/ou `api.runtime` avec la plus petite surface
   de capacité typée utile.
3. connecter le cœur + consommateurs de channel/fonctionnalités
   Les plugins de channel et de fonctionnalités doivent consommer la nouvelle capacité via le cœur,
   et non en important directement une implémentation de fournisseur.
4. enregistrer les implémentations de fournisseur
   Les plugins de fournisseur enregistrent ensuite leurs backends pour cette capacité.
5. ajouter une couverture de contrat
   Ajoutez des tests pour que la propriété et la forme de l'enregistrement restent explicites dans le temps.

C'est ainsi que OpenClaw reste opiniâtre sans devenir codé en dur selon la vision du monde
d'un seul provider. Consultez le [Capability Cookbook](/en/tools/capability-cookbook)
pour une liste de contrôle concrète des fichiers et un exemple travaillé.

### Liste de contrôle des capacités

Lorsque vous ajoutez une nouvelle capacité, l'implémentation doit généralement toucher ces
surfaces ensemble :

- types de contrat de base dans `src/<capability>/types.ts`
- assistant d'exécution/exécution de base dans `src/<capability>/runtime.ts`
- surface d'enregistrement de l'API du plugin dans `src/plugins/types.ts`
- câblage du registre de plugins dans `src/plugins/registry.ts`
- exposition de l'exécution du plugin dans `src/plugins/runtime/*` lorsque les plugins de fonctionnalité/channel
  ont besoin de le consommer
- assistants de capture/test dans `src/test-utils/plugin-registration.ts`
- assertions de propriété/contrat dans `src/plugins/contracts/registry.ts`
- documentation opérateur/plugin dans `docs/`

Si l'une de ces surfaces manque, c'est généralement un signe que la capacité n'est
pas encore entièrement intégrée.

### Modèle de capacité

Motif minimal :

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

Motif de test de contrat :

```ts
expect(findVideoGenerationProviderIdsForPlugin("openai")).toEqual(["openai"]);
```

Cela garde la règle simple :

- le cœur possède le contrat de capacité + l'orchestration
- les plugins de fournisseur possèdent les implémentations de fournisseur
- les plugins de fonctionnalité/channel consomment les assistants runtime
- les tests de contrat gardent la propriété explicite
