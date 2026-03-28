---
summary: "Internal des plugins : modèle de capacités, propriété, contrats, pipeline de chargement et assistants d'exécution"
read_when:
  - Building or debugging native OpenClaw plugins
  - Understanding the plugin capability model or ownership boundaries
  - Working on the plugin load pipeline or registry
  - Implementing provider runtime hooks or channel plugins
title: "Internal des plugins"
sidebarTitle: "Internal"
---

# Internal des plugins

<Info>
  Ceci est la **référence approfondie de l'architecture**. Pour les guides pratiques, consultez : - [Installer et utiliser des plugins](/fr/tools/plugin) — guide de l'utilisateur - [Getting Started](/fr/plugins/building-plugins) — premier tutoriel sur les plugins - [Channel Plugins](/fr/plugins/sdk-channel-plugins) — créer un canal de messagerie - [Provider
  Plugins](/fr/plugins/sdk-provider-plugins) — créer un provider de modèle - [SDK Overview](/fr/plugins/sdk-overview) — carte d'importation et API d'enregistrement
</Info>

Cette page couvre l'architecture interne du système de plugins OpenClaw.

## Modèle de capacité publique

Les capacités constituent le modèle **de plugin natif** public au sein de OpenClaw. Chaque
plugin natif OpenClaw s'enregistre pour un ou plusieurs types de capacités :

| Capacité                 | Méthode d'enregistrement                      | Plugins exemples          |
| ------------------------ | --------------------------------------------- | ------------------------- |
| Inférence de texte       | `api.registerProvider(...)`                   | `openai`, `anthropic`     |
| Synthèse vocale          | `api.registerSpeechProvider(...)`             | `elevenlabs`, `microsoft` |
| Compréhension des médias | `api.registerMediaUnderstandingProvider(...)` | `openai`, `google`        |
| Génération d'images      | `api.registerImageGenerationProvider(...)`    | `openai`, `google`        |
| Recherche Web            | `api.registerWebSearchProvider(...)`          | `google`                  |
| Canal / messagerie       | `api.registerChannel(...)`                    | `msteams`, `matrix`       |

Un plugin qui n'enregistre aucune capacité mais fournit des hooks, des outils ou
des services est un plugin **uniquement de hooks hérités**. Ce modèle est toujours entièrement pris en charge.

### Position sur la compatibilité externe

Le modèle de capacités est intégré au cœur et utilisé par les plugins groupés/natifs
aujourd'hui, mais la compatibilité des plugins externes nécessite encore une barre plus stricte que « il est
exporté, donc il est figé ».

Conseils actuels :

- **existing external plugins :** keep hook-based integrations working; treat
  this as the compatibility baseline
- **new bundled/native plugins :** prefer explicit capability registration over
  vendor-specific reach-ins or new hook-only designs
- **external plugins adopting capability registration :** allowed, but treat the
  capability-specific helper surfaces as evolving unless docs explicitly mark a
  contract as stable

Practical rule :

- capability registration APIs are the intended direction
- legacy hooks remain the safest no-breakage path for external plugins during
  the transition
- exported helper subpaths are not all equal; prefer the narrow documented
  contract, not incidental helper exports

### Plugin shapes

OpenClaw classifies every loaded plugin into a shape based on its actual
registration behavior (not just static metadata) :

- **plain-capability** -- registers exactly one capability type (for example a
  provider-only plugin like `mistral`)
- **hybrid-capability** -- registers multiple capability types (for example
  `openai` owns text inference, speech, media understanding, and image
  generation)
- **hook-only** -- registers only hooks (typed or custom), no capabilities,
  tools, commands, or services
- **non-capability** -- registers tools, commands, services, or routes but no
  capabilities

Use `openclaw plugins inspect <id>` to see a plugin's shape and capability
breakdown. See [CLI reference](/fr/cli/plugins#inspect) for details.

### Legacy hooks

The `before_agent_start` hook remains supported as a compatibility path for
hook-only plugins. Legacy real-world plugins still depend on it.

Direction :

- keep it working
- document it as legacy
- prefer `before_model_resolve` for model/provider override work
- prefer `before_prompt_build` for prompt mutation work
- remove only after real usage drops and fixture coverage proves migration safety

### Compatibility signals

When you run `openclaw doctor` or `openclaw plugins inspect <id>`, you may see
one of these labels :

| Signal                        | Meaning                                                                           |
| ----------------------------- | --------------------------------------------------------------------------------- |
| **config valid**              | Config parses fine and plugins resolve                                            |
| **compatibility advisory**    | Le plugin utilise un modèle pris en charge mais plus ancien (par ex. `hook-only`) |
| **avertissement d'obsolètes** | Le plugin utilise `before_agent_start`, qui est obsolète                          |
| **erreur stricte**            | La configuration n'est pas valide ou le plugin n'a pas pu être chargé             |

Ni `hook-only` ni `before_agent_start` ne cassera votre plugin pour l'instant --
`hook-only` est consultatif, et `before_agent_start` ne déclenche qu'un avertissement. Ces
signaux apparaissent également dans `openclaw status --all` et `openclaw plugins doctor`.

## Aperçu de l'architecture

Le système de plugins de OpenClaw comporte quatre couches :

1. **Manifeste + découverte**
   OpenClaw trouve les plugins candidats à partir des chemins configurés, des racines de l'espace de travail,
   des racines d'extensions globales et des extensions groupées. La découverte lit les manifestes natifs
   `openclaw.plugin.json` ainsi que les manifestes de bundles pris en charge en premier.
2. **Activation + validation**
   Le cœur décide si un plugin découvert est activé, désactivé, bloqué ou
   sélectionné pour un emplacement exclusif tel que la mémoire.
3. **Chargement de l'exécution**
   Les plugins natifs OpenClaw sont chargés en processus via jiti et enregistrent
   les capacités dans un registre central. Les bundles compatibles sont normalisés en
   enregistrements de registre sans importer le code d'exécution.
4. **Consommation de surface**
   Le reste de OpenClaw lit le registre pour exposer les outils, les channels, la configuration du fournisseur,
   les hooks, les routes HTTP, les commandes CLI et les services.

La limite de conception importante :

- la découverte + la validation de la configuration doivent fonctionner à partir des **métadonnées de manifeste/schéma**
  sans exécuter le code du plugin
- le comportement d'exécution natif provient du chemin `register(api)` du module du plugin

Cette séparation permet à OpenClaw de valider la configuration, d'expliquer les plugins manquants/désactivés et de
créer des indices d'interface/schéma avant que l'exécution complète ne soit active.

### Plugins de channel et l'outil de message partagé

Les plugins de channel n'ont pas besoin d'enregistrer un outil d'envoi/modification/réaction séparé pour
les actions de chat normales. OpenClaw conserve un outil `message` partagé dans le cœur, et
les plugins de channel possèdent la découverte et l'exécution spécifiques au canal derrière celui-ci.

La limite actuelle est :

- le cœur possède l'hôte de l'outil `message` partagé, le câblage des invites, la gestion de session/discussion
  et la répartition de l'exécution
- les plugins de canal possèdent la découverte d'actions délimitées, la découverte de capacités et tous les fragments de schéma spécifiques au canal
- les plugins de canal exécutent l'action finale via leur adaptateur d'action

Pour les plugins de canal, la surface du SDK est `ChannelMessageActionAdapter.describeMessageTool(...)`. Cet appel de découverte unifié permet à un plugin de renvoyer ses actions visibles, ses capacités et ses contributions de schéma ensemble, afin que ces éléments ne se désynchronisent pas.

Core transmet la portée d'exécution à cette étape de découverte. Les champs importants incluent :

- `accountId`
- `currentChannelId`
- `currentThreadTs`
- `currentMessageId`
- `sessionKey`
- `sessionId`
- `agentId`
- `requesterSenderId` entrant de confiance

C'est important pour les plugins sensibles au contexte. Un channel peut masquer ou exposer des actions de message en fonction du compte actif, de la salle/fil/discussion actuel, ou de l'identité du demandeur de confiance sans coder en dur les branches spécifiques au channel dans l'outil `message` central.

C'est pourquoi les modifications du routage de l'exécuteur intégré (embedded-runner) sont toujours un travail de plugin : l'exécuteur est responsable de la transmission de l'identité de chat/session actuelle dans la limite de découverte du plugin afin que l'outil `message` partagé expose la surface appropriée détenue par le channel pour le tour actuel.

Pour les assistants d'exécution détenus par le canal, les plugins groupés doivent conserver le runtime d'exécution à l'intérieur de leurs propres modules d'extension. Le cœur ne possède plus les runtimes d'action de message pour Discord, Slack, Telegram ou WhatsApp sous `src/agents/tools`. Nous ne publions pas de sous-chemins `plugin-sdk/*-action-runtime` séparés, et les plugins groupés doivent importer leur propre code d'exécution local directement depuis leurs modules détenus par l'extension.

Pour les sondages spécifiquement, il existe deux chemins d'exécution :

- `outbound.sendPoll` est la base partagée pour les canaux qui correspondent au modèle de sondage commun
- `actions.handleAction("poll")` est le chemin privilégié pour la sémantique de sondage spécifique au canal ou pour les paramètres de sondage supplémentaires

Le cœur diffère désormais l'analyse partagée des sondages jusqu'à ce que la répartition des sondages par le plugin refuse l'action, afin que les gestionnaires de sondage détenus par le plugin puissent accepter les champs de sondage spécifiques au canal sans être bloqués par l'analyseur de sondage générique.

Voir [Load pipeline](#load-pipeline) pour la séquence complète de démarrage.

## Modèle de propriété des capacités

OpenClaw considère qu'un plugin natif est la limite de propriété pour une **entreprise** ou une **fonctionnalité**, et non un sac d'intégrations sans rapport.

Cela signifie :

- un plugin d'entreprise devrait généralement posséder toutes les surfaces orientées OpenClaw de cette entreprise
- un plugin de fonctionnalité devrait généralement posséder la surface complète de la fonctionnalité qu'il introduit
- les canaux devraient consommer les capacités centrales partagées au lieu de réimplémenter le comportement du provider ad hoc

Exemples :

- le plugin groupé `openai` possède le comportement de model-provider OpenAI ainsi que le comportement de synthèse vocale, de compréhension des médias et de génération d'images OpenAI
- le plugin groupé `elevenlabs` possède le comportement de synthèse vocale ElevenLabs
- le plugin groupé `microsoft` possède le comportement de synthèse vocale Microsoft
- le plugin fourni `google` possède le comportement du fournisseur de modèle Google ainsi que le comportement de la compréhension des médias, de la génération d'images et de la recherche web de Google
- les plugins fournis `minimax`, `mistral`, `moonshot` et `zai` possèdent leurs backends de compréhension des médias
- le plugin `voice-call` est un plugin de fonctionnalités : il possède le transport des appels, les outils, la CLI, les routes et le runtime, mais il consomme la capacité TTS/STT principale au lieu d'inventer une seconde pile vocale

L'état final prévu est le suivant :

- OpenAI réside dans un seul plugin même s'il couvre les modèles textuels, la parole, les images et la future vidéo
- un autre fournisseur peut faire de même pour sa propre surface
- les canaux ne se soucient pas de quel plugin fournisseur possède le provider ; ils consomment le contrat de capacité partagée exposé par le cœur

C'est là la distinction clé :

- **plugin** = limite de propriété
- **capability** = contrat principal que plusieurs plugins peuvent implémenter ou consommer

Ainsi, si OpenClaw ajoute un nouveau domaine tel que la vidéo, la première question n'est pas
« quel provider doit coder en dur la gestion de la vidéo ? ». La première question est « quel est
le contrat de capacité vidéo principal ? ». Une fois que ce contrat existe, les plugins fournisseurs
peuvent s'y enregistrer et les plugins de canal/fonctionnalités peuvent le consommer.

Si la capacité n'existe pas encore, la bonne action est généralement :

1. définir la capacité manquante dans le cœur
2. l'exposer via le plugin API/runtime de manière typée
3. connecter les canaux/fonctionnalités à cette capacité
4. laisser les plugins fournisseurs enregistrer des implémentations

Cela garde la propriété explicite tout en évitant le comportement central qui dépend d'un
seul fournisseur ou d'un chemin de code spécifique à un plugin ponctuel.

### Superposition de capacités

Utilisez ce modèle mental pour décider où le code doit se trouver :

- **core capability layer** : orchestration partagée, règles de fusion de configuration, politiques, repli, sémantique de livraison et contrats typés
- **vendor plugin layer** : API spécifiques aux fournisseurs, auth, catalogues de modèles, synthèse vocale, génération d'images, futurs backends vidéo, points de terminaison d'utilisation
- **channel/feature plugin layer** : intégration Slack/Discord/appel-voice/etc. qui consomme les capacités principales et les présente sur une surface

Par exemple, le TTS suit cette forme :

- le cœur possède la stratégie TTS au moment de la réponse, l'ordre de repli, les préférences et la livraison par channel
- `openai`, `elevenlabs` et `microsoft` possèdent des implémentations de synthèse
- `voice-call` consomme l'assistant d'exécution TTS téléphonique

Ce même modèle devrait être privilégié pour les futures capacités.

### Exemple de plugin d'entreprise multi-capacités

Un plugin d'entreprise doit paraître cohérent de l'extérieur. Si OpenClaw dispose de contrats partagés pour les modèles, la parole, la compréhension des médias et la recherche web, un fournisseur peut posséder l'ensemble de ses surfaces en un seul endroit :

```ts
import type { OpenClawPluginDefinition } from "openclaw/plugin-sdk";
import { buildOpenAISpeechProvider, createPluginBackedWebSearchProvider, describeImageWithModel, transcribeOpenAiCompatibleAudio } from "openclaw/plugin-sdk";

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

OpenClaw traite déjà la compréhension image/audio/vidéo comme une capacité partagée.
Le même modèle de propriété s'y applique :

1. le cœur définit le contrat de compréhension des médias
2. les plugins fournisseur enregistrent `describeImage`, `transcribeAudio` et
   `describeVideo` selon le cas
3. les canaux et les plugins de fonctionnalité consomment le comportement central partagé au lieu de se connecter directement au code fournisseur

Cela évite d'intégrer les hypothèses vidéo d'un provider dans le cœur. Le plugin possède la surface fournisseur ; le cœur possède le contrat de capacité et le comportement de repli.

Si OpenClaw ajoute un nouveau domaine plus tard, tel que la génération vidéo, utilisez la même séquence à nouveau : définissez d'abord la capacité centrale, puis laissez les plugins fournisseur enregistrer des implémentations.

Besoin d'une liste de vérification de déploiement concrète ? Voir
[Capability Cookbook](/fr/tools/capability-cookbook).

## Contrats et application

La surface API du plugin est intentionnellement typée et centralisée dans
`OpenClawPluginApi`. Ce contrat définit les points d'enregistrement pris en charge et les assistants d'exécution dont un plugin peut dépendre.

Pourquoi c'est important :

- les auteurs de plugins obtiennent une norme interne stable
- le cœur peut rejeter la propriété en double, comme deux plugins enregistrant le même
  id de provider
- le démarrage peut afficher des diagnostics exploitables pour les enregistrements malformés
- les tests de contrat peuvent appliquer la propriété des plugins groupés et empêcher une dérive silencieuse

Il existe deux niveaux d'application :

1. **application de l'enregistrement au moment de l'exécution**
   Le registre de plugins valide les enregistrements lors du chargement des plugins. Exemples :
   les ids de provider en double, les ids de provider de parole en double et les enregistrements
   malformés produisent des diagnostics de plugin au lieu d'un comportement indéfini.
2. **tests de contrat**
   Les plugins groupés sont capturés dans des registres de contrats lors des exécutions de tests afin que
   OpenClaw puisse affirmer explicitement la propriété. Actuellement, cela est utilisé pour les model
   providers, les speech providers, les web search providers, et la propriété des enregistrements groupés.

L'effet pratique est qu'OpenClaw sait, à l'avance, quel plugin possède quelle surface. Cela permet au cœur et aux canaux de se composer de manière transparente car la propriété est déclarée, typée et testable plutôt qu'implicite.

### Ce qui appartient à un contrat

Les bons contrats de plugins sont :

- typés
- petits
- spécifiques à une capacité
- détenus par le cœur
- réutilisables par plusieurs plugins
- consommables par les canaux/fonctionnalités sans connaissance du fournisseur

Les mauvais contrats de plugins sont :

- stratégies spécifiques au fournisseur cachées dans le cœur
- échappatoires de plugin ponctuelles qui contournent le registre
- code de canal accédant directement à une implémentation de fournisseur
- objets d'exécution ad hoc qui ne font pas partie de `OpenClawPluginApi` ou de `api.runtime`

En cas de doute, augmentez le niveau d'abstraction : définissez d'abord la capacité, puis laissez les plugins s'y connecter.

## Modèle d'exécution

Les plugins natifs OpenClaw s'exécutent **en cours de traitement** (in-process) avec le Gateway. Ils ne sont pas isolés (sandboxed). Un plugin natif chargé possède la même limite de confiance au niveau du processus que le code principal.

Implications :

- un plugin natif peut enregistrer des outils, des gestionnaires réseau, des hooks et des services
- un bogue dans un plugin natif peut planter ou déstabiliser la passerelle
- un plugin natif malveillant équivaut à une exécution de code arbitraire à l'intérieur du processus OpenClaw

Les bundles compatibles sont plus sûrs par défaut car OpenClaw les traite actuellement comme des packs de métadonnées/contenu. Dans les versions actuelles, cela signifie principalement des compétences groupées.

Utilisez des listes d'autorisation (allowlists) et des chemins d'installation/chargement explicites pour les plugins non groupés. Traitez les plugins de l'espace de travail comme du code de développement, et non comme des valeurs par défaut pour la production.

Pour les noms de packages d'espace de travail regroupés, conservez l'identifiant du plugin ancré dans le nom npm : `@openclaw/<id>` par défaut, ou un suffixe typé approuvé tel que `-provider`, `-plugin`, `-speech`, `-sandbox`, ou `-media-understanding` lorsque le package expose intentionnellement un rôle de plugin plus restreint.

Note importante sur la confiance :

- `plugins.allow` fait confiance aux **identifiants de plugin**, et non à la provenance de la source.
- Un plugin d'espace de travail avec le même identifiant qu'un plugin regroupé remplace intentionnellement la copie regroupée lorsque ce plugin d'espace de travail est activé/autorisé.
- C'est normal et utile pour le développement local, les tests correctifs et les correctifs urgents.

## Limite d'exportation

OpenClaw exporte des capacités, et non des commodités de mise en œuvre.

Gardez l'enregistrement des capacités public. Supprimez les exportations d'assistants non contractuels :

- sous-chemins d'assistance spécifiques aux plugins groupés
- sous-chemins de plomberie d'exécution non destinés à être une API publique
- assistants de commodité spécifiques aux fournisseurs
- assistants de configuration/d'intégration qui sont des détails de mise en œuvre

## Pipeline de chargement

Au démarrage, OpenClaw fait essentiellement ceci :

1. découvrir les racines candidates des plugins
2. lire les manifestes de bundles natifs ou compatibles et les métadonnées des packages
3. rejeter les candidats non sécurisés
4. normaliser la configuration du plugin (`plugins.enabled`, `allow`, `deny`, `entries`,
   `slots`, `load.paths`)
5. décider de l'activation pour chaque candidat
6. charger les modules natifs activés via jiti
7. appeler les hooks natifs `register(api)` et collecter les enregistrements dans le registre des plugins
8. exposer le registre aux surfaces de commandes/d'exécution

Les barrières de sécurité se produisent **avant** l'exécution du runtime. Les candidats sont bloqués lorsque l'entrée sort de la racine du plugin, que le chemin est accessible en écriture par tous, ou que la propriété du chemin semble suspecte pour les plugins non groupés.

### Comportement basé d'abord sur le manifeste

Le manifeste est la source de vérité du plan de contrôle. OpenClaw l'utilise pour :

- identifier le plugin
- découvrir les canaux/compétences/schémas de configuration déclarés ou les capacités groupées
- valider `plugins.entries.<id>.config`
- augmenter les étiquettes/espaces réservés de l'interface utilisateur de contrôle
- afficher les métadonnées d'installation/catalogue

Pour les plugins natifs, le module d'exécution est la partie du plan de données. Il enregistre le comportement réel tel que les hooks, les outils, les commandes ou les flux du provider.

### Ce que le chargeur met en cache

OpenClaw conserve des caches en cours de processus courts pour :

- les résultats de découverte
- les données du registre de manifestes
- les registres de plugins chargés

Ces caches réduisent la charge des démarrages en rafale et des commandes répétées. Il est sûr de les considérer comme des caches de performance à court terme, et non comme de la persistance.

Note de performance :

- Définissez `OPENCLAW_DISABLE_PLUGIN_DISCOVERY_CACHE=1` ou
  `OPENCLAW_DISABLE_PLUGIN_MANIFEST_CACHE=1` pour désactiver ces caches.
- Ajustez les fenêtres de cache avec `OPENCLAW_PLUGIN_DISCOVERY_CACHE_MS` et
  `OPENCLAW_PLUGIN_MANIFEST_CACHE_MS`.

## Modèle de registre

Les plugins chargés ne modifient pas directement les globales du cœur aléatoires. Ils s'inscrivent dans un registre central de plugins.

Le registre suit :

- les enregistrements de plugins (identité, source, origine, statut, diagnostics)
- les outils
- les hooks legacy et les hooks typés
- les canaux
- les fournisseurs
- les gestionnaires RPC de passerelle
- les routes HTTP
- les registraires CLI
- les services d'arrière-plan
- les commandes détenues par des plugins

Les fonctionnalités du cœur lisent ensuite ce registre au lieu de communiquer directement avec les modules de plugins. Cela maintient le chargement unidirectionnel :

- module de plugin -> enregistrement dans le registre
- runtime principal -> consommation du registre

Cette séparation est importante pour la maintenabilité. Cela signifie que la plupart des surfaces principales n'ont besoin que d'un seul point d'intégration : « lire le registre », et non « traiter chaque module de plugin comme un cas particulier ».

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
- `request` : le résumé de la demande originale, l'indicateur de détachement, l'identifiant de l'expéditeur et les métadonnées de la conversation

Ce rappel est uniquement une notification. Il ne modifie pas qui est autorisé à lier une conversation et s'exécute après la fin du traitement de l'approbation principale.

## Hooks d'exécution du fournisseur

Les plugins de fournisseur ont désormais deux couches :

- métadonnées du manifeste : `providerAuthEnvVars` pour une recherche d'auth-environnement peu coûteuse avant le chargement de l'exécution, ainsi que `providerAuthChoices` pour des étiquettes d'onboarding/choix d'authentification et des métadonnées de drapeau CLI peu coûteuses avant le chargement de l'exécution
- hooks de configuration : `catalog` / ancien `discovery`
- hooks d'exécution : `resolveDynamicModel`, `prepareDynamicModel`, `normalizeResolvedModel`, `capabilities`, `prepareExtraParams`, `wrapStreamFn`, `formatApiKey`, `refreshOAuth`, `buildAuthDoctorHint`, `isCacheTtlEligible`, `buildMissingAuthMessage`, `suppressBuiltInModel`, `augmentModelCatalog`, `isBinaryThinking`, `supportsXHighThinking`, `resolveDefaultThinkingLevel`, `isModernModelRef`, `prepareRuntimeAuth`, `resolveUsageAuth`, `fetchUsageSnapshot`

OpenClaw possède toujours la boucle d'agent générique, le basculement, la gestion des transcriptions et la stratégie d'outil. Ces hooks sont la surface d'extension pour les comportements spécifiques aux fournisseurs sans avoir besoin d'un transport d'inférence entièrement personnalisé.

Utilisez le manifeste `providerAuthEnvVars` lorsque le provider a des identifiants basés sur l'environnement que les chemins génériques d'auth/statut/sélection de modèle devraient voir sans charger le runtime du plugin. Utilisez le manifeste `providerAuthChoices` lorsque les surfaces CLI d'onboarding/choix d'auth devraient connaître l'identifiant de choix du provider, les étiquettes de groupe et le câblage d'auth simple à un seul indicateur sans charger le runtime du provider. Gardez le runtime du provider `envVars` pour les indications destinées aux opérateurs, telles que les étiquettes d'onboarding ou les variables de configuration du client-id/secret-client CLI.

### Ordre et utilisation des hooks

Pour les plugins de modèle/provider, OpenClaw appelle les hooks dans cet ordre approximatif. La colonne "Quand l'utiliser" est le guide de décision rapide.

| #   | Hook                             | Ce qu'il fait                                                                                                                                       | Quand l'utiliser                                                                                                                    |
| --- | -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `catalog`                        | Publier la configuration du provider dans `models.providers` lors de la génération `models.json`                                                    | Le provider possède un catalogue ou des URL de base par défaut                                                                      |
| --  | _(recherche de modèle intégrée)_ | OpenClaw essaie d'abord le chemin normal de registre/catalogue                                                                                      | _(pas un hook de plugin)_                                                                                                           |
| 2   | `resolveDynamicModel`            | Retour de synchronisation pour les identifiants de modèle possédés par le provider non encore présents dans le registre local                       | Le provider accepte des identifiants de modèle en amont arbitraires                                                                 |
| 3   | `prepareDynamicModel`            | Préchauffage asynchrone, puis `resolveDynamicModel` s'exécute à nouveau                                                                             | Le provider a besoin des métadonnées réseau avant de résoudre les identifiants inconnus                                             |
| 4   | `normalizeResolvedModel`         | Réécriture finale avant que le runner intégré n'utilise le modèle résolu                                                                            | Le provider a besoin de réécritures de transport mais utilise toujours un transport central                                         |
| 5   | `capabilities`                   | Métadonnées de transcription/d'outillage possédées par le provider utilisées par la logique centrale partagée                                       | Le provider a besoin de particularités de transcription/de famille de provider                                                      |
| 6   | `prepareExtraParams`             | Normalisation des paramètres de requête avant les wrappers d'options de flux génériques                                                             | Le provider a besoin de paramètres de requête par défaut ou d'un nettoyage de paramètres par provider                               |
| 7   | `wrapStreamFn`                   | Wrapper de flux après l'application des wrappers génériques                                                                                         | Le provider a besoin de wrappers d'en-têtes/corps/de modèle compatibles avec la requête sans transport personnalisé                 |
| 8   | `formatApiKey`                   | Formateur de profil d'authentification : le profil stocké devient la chaîne `apiKey` d'exécution                                                    | Le fournisseur stocke des métadonnées d'authentification supplémentaires et a besoin d'une forme personnalisée de jeton d'exécution |
| 9   | `refreshOAuth`                   | Remplacement de rafraîchissement OAuth pour les points de terminaison de rafraîchissement personnalisés ou la politique d'échec de rafraîchissement | Le fournisseur ne correspond pas aux rafraîchisseurs partagés `pi-ai`                                                               |
| 10  | `buildAuthDoctorHint`            | Indice de réparation ajouté lorsque le rafraîchissement OAuth échoue                                                                                | Le fournisseur a besoin de directives de réparation d'authentification owned par le fournisseur après un échec de rafraîchissement  |
| 11  | `isCacheTtlEligible`             | Stratégie de cache de prompt pour les fournisseurs proxy/backhaul                                                                                   | Le fournisseur a besoin d'une porte TTL de cache spécifique au proxy                                                                |
| 12  | `buildMissingAuthMessage`        | Remplacement du message générique de récupération d'authentification manquante                                                                      | Le fournisseur a besoin d'un indice de récupération d'authentification manquante spécifique au fournisseur                          |
| 13  | `suppressBuiltInModel`           | Suppression de modèle en amont obsolète plus indice d'erreur facultatif pour l'utilisateur                                                          | Le fournisseur doit masquer les lignes en amont obsolètes ou les remplacer par un indice de fournisseur                             |
| 14  | `augmentModelCatalog`            | Lignes de catalogue synthétiques/finales ajoutées après la découverte                                                                               | Le fournisseur a besoin de lignes de compatibilité future synthétiques dans `models list` et les sélecteurs                         |
| 15  | `isBinaryThinking`               | Commutateur de raisonnement on/off pour les fournisseurs à pensée binaire                                                                           | Le fournisseur expose uniquement la pensée binaire on/off                                                                           |
| 16  | `supportsXHighThinking`          | Support de raisonnement `xhigh` pour les modèles sélectionnés                                                                                       | Le fournisseur veut `xhigh` uniquement sur un sous-ensemble de modèles                                                              |
| 17  | `resolveDefaultThinkingLevel`    | Niveau `/think` par défaut pour une famille de modèles spécifique                                                                                   | Le fournisseur possède la politique `/think` par défaut pour une famille de modèles                                                 |
| 18  | `isModernModelRef`               | Correspondance de modèle moderne pour les filtres de profil en direct et la sélection smoke                                                         | Le fournisseur possède la correspondance de modèle préféré live/smoke                                                               |
| 19  | `prepareRuntimeAuth`             | Échanger une information d'identification configurée contre le jeton/clé d'exécution réel juste avant l'inférence                                   | Le fournisseur a besoin d'un échange de jeton ou d'une information d'identification de demande à courte durée de vie                |
| 20  | `resolveUsageAuth`               | Résoudre les identifiants d'utilisation/de facturation pour `/usage` et les surfaces d'état associées                                               | Le fournisseur a besoin d'une analyse personnalisée des jetons d'utilisation/de quota ou d'un identifiant d'utilisation différent   |
| 21  | `fetchUsageSnapshot`             | Récupérer et normaliser les instantanés d'utilisation/de quota spécifiques au fournisseur après la résolution de l'authentification                 | Le fournisseur a besoin d'un point de terminaison d'utilisation ou d'un analyseur de charge utile spécifique au fournisseur         |

Si le fournisseur a besoin d'un protocole filaire entièrement personnalisé ou d'un exécuteur de requête personnalisé,
c'est une classe d'extension différente. Ces hooks sont destinés au comportement du fournisseur
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
  `resolveDefaultThinkingLevel` et `isModernModelRef` car il possède la compatibilité ascendante de Claude
  4.6, les indications de famille de fournisseur, les conseils de réparation d'authentification, l'intégration
  du point de terminaison d'utilisation, l'éligibilité du cache d'invite et la politique de réflexion par défaut/adaptive
  de Claude.
- OpenAI utilise `resolveDynamicModel`, `normalizeResolvedModel` et
  `capabilities` ainsi que `buildMissingAuthMessage`, `suppressBuiltInModel`,
  `augmentModelCatalog`, `supportsXHighThinking` et `isModernModelRef`
  car il possède la compatibilité ascendante de GPT-5.4, la normalisation directe OpenAI
  `openai-completions` -> `openai-responses`, les indications d'authentification
  conscientes de Codex, la suppression de Spark, les lignes de liste synthétiques OpenAI et la politique de réflexion /
  de modèle en direct GPT-5.
- OpenRouter utilise `catalog` ainsi que `resolveDynamicModel` et
  `prepareDynamicModel` car le fournisseur est un relais et peut exposer de nouveaux
  identifiants de modèle avant les mises à jour du catalogue statique d'OpenClaw ; il utilise également
  `capabilities`, `wrapStreamFn` et `isCacheTtlEligible` pour garder
  les en-têtes de requête spécifiques au fournisseur, les métadonnées de routage, les correctifs de raisonnement et
  la politique de cache d'invite en dehors du cœur.
- GitHub Copilot utilise `catalog`, `auth`, `resolveDynamicModel` et
  `capabilities` ainsi que `prepareRuntimeAuth` et `fetchUsageSnapshot` car il
  a besoin d'une connexion de propriétaire de fournisseur (provider-owned), d'un comportement de repli de model, des particularités des transcription Claude, d'un échange de jeton GitHub vers Copilot et d'un point de terminaison d'utilisation propriétaire du fournisseur.
- OpenAI Codex utilise `catalog`, `resolveDynamicModel`,
  `normalizeResolvedModel`, `refreshOAuth` et `augmentModelCatalog` ainsi que
  `prepareExtraParams`, `resolveUsageAuth` et `fetchUsageSnapshot` car il
  fonctionne toujours sur les transports OpenAI centraux mais possède sa propre normalisation de l'URL de base/transport, sa stratégie de repli de rafraîchissement OpenAI, son choix de transport par défaut,
  des lignes de catalogue Codex synthétiques et l'intégration du point de terminaison d'utilisation ChatGPT.
- Google AI Studio et le CLI OAuth Gemini utilisent `resolveDynamicModel` et
  `isModernModelRef` car ils possèdent le repli de compatibilité avant Gemini 3.1 et la correspondance des models modernes ; le CLI OAuth Gemini utilise également `formatApiKey`,
  `resolveUsageAuth` et `fetchUsageSnapshot` pour le formatage des jetons, l'analyse
  des jetons et le câblage du point de terminaison de quota.
- Moonshot utilise `catalog` ainsi que `wrapStreamFn` car il utilise toujours le transport
  partagé OpenAI mais a besoin d'une normalisation de la charge utile de réflexion (thinking) propriétaire du fournisseur.
- Kilocode utilise `catalog`, `capabilities`, `wrapStreamFn` et
  `isCacheTtlEligible` car il a besoin d'en-têtes de requête propriétaires du fournisseur,
  d'une normalisation de la charge utile de raisonnement, d'indices de transcription Gemini et du contrôle de TTL de cache Anthropic.
- Z.AI utilise `resolveDynamicModel`, `prepareExtraParams`, `wrapStreamFn`, `isCacheTtlEligible`, `isBinaryThinking`, `isModernModelRef`, `resolveUsageAuth` et `fetchUsageSnapshot` car il possède le repli GLM-5, les valeurs par défaut `tool_stream`, l'UX de pensée binaire, la correspondance de modèle moderne, ainsi que l'authentification d'utilisation et la récupération des quotas.
- Mistral, OpenCode Zen et OpenCode Go utilisent uniquement `capabilities` pour garder les particularités de transcription/d'outillage hors du cœur.
- Les fournisseurs groupés uniquement dans le catalogue, tels que `byteplus`, `cloudflare-ai-gateway`, `huggingface`, `kimi-coding`, `modelstudio`, `nvidia`, `qianfan`, `synthetic`, `together`, `venice`, `vercel-ai-gateway` et `volcengine`, utilisent uniquement `catalog`.
- Le portail Qwen utilise `catalog`, `auth` et `refreshOAuth`.
- MiniMax et Xiaomi utilisent `catalog` ainsi que des hooks d'utilisation, car leur comportement `/usage` appartient au plugin, bien que l'inférence s'exécute toujours via les transports partagés.

## Assistances d'exécution

Les plugins peuvent accéder à certaines assistances du cœur via `api.runtime`. Pour le TTS :

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

- `textToSpeech` renvoie la charge utile de sortie TTS normale du cœur pour les surfaces de fichier/note vocale.
- Utilise la configuration de `messages.tts` du cœur et la sélection du fournisseur.
- Renvoie le tampon audio PCM + la fréquence d'échantillonnage. Les plugins doivent rééchantillonner/encoder pour les fournisseurs.
- `listVoices` est optionnel pour chaque fournisseur. Utilisez-le pour les sélecteurs de voix ou les flux de configuration détenus par le fournisseur.
- Les listes de voix peuvent inclure des métadonnées plus riches telles que les paramètres régionaux, le genre et les balises de personnalité pour les sélecteurs conscients du fournisseur.
- OpenAI et ElevenLabs prennent en charge la téléphonie aujourd'hui. Microsoft ne le fait pas.

Les plugins peuvent également enregistrer des fournisseurs de reconnaissance vocale via `api.registerSpeechProvider(...)`.

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
- Utiliser les fournisseurs de synthèse vocale pour le comportement de synthèse propriétaire au fournisseur.
- L'entrée Microsoft `edge` héritée est normalisée vers l'id de fournisseur `microsoft`.
- Le modèle de propriété préféré est orienté entreprise : un plugin fournisseur peut posséder des fournisseurs de texte, de parole, d'image et de futurs médias, car OpenClaw ajoute ces contrats de capacité.

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
- Garder le comportement du fournisseur dans le plugin de fournisseur.
- L'expansion additive doit rester typée : de nouvelles méthodes optionnelles, de nouveaux champs de résultat optionnels, de nouvelles capacités optionnelles.
- Si OpenClaw ajoute une nouvelle capacité telle que la génération vidéo plus tard, définissez d'abord le contrat de capacité central, puis laissez les plugins de fournisseurs s'y inscrire.

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

Pour la transcription audio, les plugins peuvent utiliser soit l'exécution de compréhension de média, soit l'ancien alias STT :

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
- Utilise la configuration audio de compréhension de média centrale (`tools.media.audio`) et l'ordre de repli des fournisseurs.
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

- `provider` et `model` sont des redéfinitions optionnelles par exécution, et non des modifications persistantes de session.
- OpenClaw ne respecte ces champs de redéfinition que pour les appelants de confiance.
- Pour les exécutions de repli possédées par un plugin, les opérateurs doivent opter pour `plugins.entries.<id>.subagent.allowModelOverride: true`.
- Utilisez `plugins.entries.<id>.subagent.allowedModels` pour restreindre les plugins de confiance à des cibles canoniques `provider/model` spécifiques, ou `"*"` pour autoriser explicitement n'importe quelle cible.
- Les exécutions de sous-agent de plugin non approuvés fonctionnent toujours, mais les demandes de redéfinition sont rejetées au lieu de replier silencieusement.

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

Les plugins peuvent également enregistrer des providers de recherche web via
`api.registerWebSearchProvider(...)`.

Notes :

- Gardez la sélection du provider, la résolution des identifiants et la sémantique des requêtes partagées dans le cœur.
- Utilisez les providers de recherche web pour les transports de recherche spécifiques aux fournisseurs.
- `api.runtime.webSearch.*` est la surface partagée préférée pour les plugins de fonctionnalité/de canal qui ont besoin d'un comportement de recherche sans dépendre du wrapper de l'outil de l'agent.

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

- `path` : chemin de la route sous le serveur HTTP du Gateway.
- `auth` : requis. Utilisez `"gateway"` pour exiger l'authentification normale du Gateway, ou `"plugin"` pour l'authentification gérée par le plugin / la vérification de webhook.
- `match` : optionnel. `"exact"` (par défaut) ou `"prefix"`.
- `replaceExisting` : optionnel. Permet au même plugin de remplacer son propre enregistrement de route existant.
- `handler` : renvoyez `true` lorsque la route a géré la requête.

Notes :

- `api.registerHttpHandler(...)` est obsolète. Utilisez `api.registerHttpRoute(...)`.
- Les routes des plugins doivent déclarer `auth` explicitement.
- Les conflits exacts de `path + match` sont rejetés sauf si `replaceExisting: true`, et un plugin ne peut pas remplacer la route d'un autre plugin.
- Les routes qui se chevauchent avec des niveaux `auth` différents sont rejetées. Gardez les chaînes de secours `exact`/`prefix` uniquement sur le même niveau d'authentification.

## Chemins d'importation du SDK de plugin

Utilisez les sous-chemins du SDK au lieu de l'import monolithique `openclaw/plugin-sdk` lors de la création de plugins :

- `openclaw/plugin-sdk/plugin-entry` pour les primitives d'enregistrement de plugins.
- `openclaw/plugin-sdk/core` pour le contrat générique partagé orienté plugin.
- Primitives de canal stables tels que `openclaw/plugin-sdk/channel-setup`,
  `openclaw/plugin-sdk/channel-pairing`,
  `openclaw/plugin-sdk/channel-contract`,
  `openclaw/plugin-sdk/channel-feedback`,
  `openclaw/plugin-sdk/channel-inbound`,
  `openclaw/plugin-sdk/channel-lifecycle`,
  `openclaw/plugin-sdk/channel-reply-pipeline`,
  `openclaw/plugin-sdk/command-auth`,
  `openclaw/plugin-sdk/secret-input` et
  `openclaw/plugin-sdk/webhook-ingress` pour le câblage partagé de configuration/authentification/réponse/webhook.
  `channel-inbound` est le domicile partagé pour le debounce, la correspondance des mentions,
  le formatage des enveloppes et les assistants de contexte d'enveloppe entrante.
- Sous-chemins de domaine tels que `openclaw/plugin-sdk/channel-config-helpers`,
  `openclaw/plugin-sdk/allow-from`,
  `openclaw/plugin-sdk/channel-config-schema`,
  `openclaw/plugin-sdk/channel-policy`,
  `openclaw/plugin-sdk/config-runtime`,
  `openclaw/plugin-sdk/infra-runtime`,
  `openclaw/plugin-sdk/agent-runtime`,
  `openclaw/plugin-sdk/lazy-runtime`,
  `openclaw/plugin-sdk/reply-history`,
  `openclaw/plugin-sdk/routing`,
  `openclaw/plugin-sdk/status-helpers`,
  `openclaw/plugin-sdk/runtime-store` et
  `openclaw/plugin-sdk/directory-runtime` pour les assistants partagés d'exécution/de configuration.
- `openclaw/plugin-sdk/channel-runtime` ne reste qu'en tant que shim de compatibilité.
  Le nouveau code devrait plutôt importer les primitives plus étroites.
- Les internes de l'extension regroupée restent privés. Les plugins externes ne doivent utiliser que
  les sous-chemins `openclaw/plugin-sdk/*`. Le code de test/noyau OpenClaw peut utiliser les points
  d'entrée publics du dépôt sous `extensions/<id>/index.js`, `api.js`, `runtime-api.js`,
  `setup-entry.js`, et des fichiers à portée étroite tels que `login-qr-api.js`. N'importez jamais
  `extensions/<id>/src/*` depuis le noyau ou depuis une autre extension.
- Séparation du point d'entrée du dépôt :
  `extensions/<id>/api.js` est le baril d'assistants/types,
  `extensions/<id>/runtime-api.js` est le baril d'exécution uniquement,
  `extensions/<id>/index.js` est le point d'entrée du plugin regroupé,
  et `extensions/<id>/setup-entry.js` est le point d'entrée du plugin de configuration.
- Il ne reste aucun sous-chemin public regroupé de marque de canal. Les assistants spécifiques au canal et
  les coutures d'exécution résident sous `extensions/<id>/api.js` et `extensions/<id>/runtime-api.js` ;
  le contrat public du SDK est plutôt constitué des primitives partagées génériques.

Remarque de compatibilité :

- Évitez le barrel racine `openclaw/plugin-sdk` pour le nouveau code.
- Privilégiez d'abord les primitives stables étroites. Les nouveaux sous-chemins setup/pairing/reply/
  feedback/contract/inbound/threading/command/secret-input/webhook/infra/
  allowlist/status/message-tool constituent le contrat prévu pour les nouveaux
  travaux de plugins groupés et externes.
  L'analyse et la correspondance des cibles appartiennent à `openclaw/plugin-sdk/channel-targets`.
  Les portes d'action de message et les assistants d'ID de message de réaction appartiennent à
  `openclaw/plugin-sdk/channel-actions`.
- Les assistants d'extension spécifiques groupés (barrels) ne sont pas stables par défaut. Si un
  assistant n'est nécessaire que pour une extension groupée, gardez-le derrière la couture locale `api.js` ou `runtime-api.js` de l'extension
  au lieu de le promouvoir dans `openclaw/plugin-sdk/<extension>`.
- Les barres groupées à l'image du channel restent privées à moins d'être ajoutées explicitement
  au contrat public.
- Les sous-chemins spécifiques aux capacités tels que `image-generation`,
  `media-understanding` et `speech` existent parce que les plugins groupés/natifs les utilisent
  aujourd'hui. Leur présence ne signifie pas par elle-même que chaque assistant exporté est un
  contrat externe gelé à long terme.

## Schémas de l'outil de message

Les plugins doivent posséder les contributions de schéma `describeMessageTool(...)` spécifiques au channel.
Gardez les champs spécifiques au provider dans le plugin, et non dans le cœur partagé.

Pour les fragments de schéma portables partagés, réutilisez les assistants génériques exportés via
`openclaw/plugin-sdk/channel-actions` :

- `createMessageToolButtonsSchema()` pour les charges utiles de style grille de boutons
- `createMessageToolCardSchema()` pour les charges utiles de cartes structurées

Si une forme de schéma n'a de sens que pour un seul provider, définissez-la dans la source propre
de ce plugin au lieu de la promouvoir dans le SDK partagé.

## Résolution de la cible du channel

Les plugins de channel doivent posséder la sémantique de cible spécifique au channel. Gardez l'hôte
sortant partagé générique et utilisez la surface de l'adaptateur de messagerie pour les règles du provider :

- `messaging.inferTargetChatType({ to })` décide si une cible normalisée
  doit être traitée comme `direct`, `group` ou `channel` avant la recherche dans l'annuaire.
- `messaging.targetResolver.looksLikeId(raw, normalized)` indique au cœur (core) si une entrée doit passer directement à la résolution de type identifiant au lieu de la recherche de répertoire.
- `messaging.targetResolver.resolveTarget(...)` est le repli du plugin lorsque le cœur a besoin d'une résolution finale détenue par le fournisseur après la normalisation ou après l'échec du répertoire.
- `messaging.resolveOutboundSessionRoute(...)` gère la construction de routes de session spécifiques au fournisseur une fois la cible résolue.

Répartition recommandée :

- Utilisez `inferTargetChatType` pour les décisions de catégorie qui doivent se produire avant la recherche de pairs/groupes.
- Utilisez `looksLikeId` pour les vérifications « traiter ceci comme un identifiant de cible explicite/natif ».
- Utilisez `resolveTarget` pour le repli de normalisation spécifique au fournisseur, et non pour une recherche large dans le répertoire.
- Conservez les identifiants natifs du fournisseur tels que les identifiants de chat, les identifiants de fil de discussion, les JIDs, les handles et les identifiants de salle dans les valeurs `target` ou les paramètres spécifiques au fournisseur, et non dans les champs génériques du SDK.

## Répertoires basés sur la configuration

Les plugins qui dérivent des entrées de répertoire à partir de la configuration doivent conserver cette logique dans le plugin et réutiliser les assistants partagés depuis `openclaw/plugin-sdk/directory-runtime`.

Utilisez ceci lorsqu'un canal a besoin de pairs/groupes basés sur la configuration, tels que :

- pairs DM basés sur une liste d'autorisation (allowlist)
- cartes de canal/groupe configurées
- replis de répertoire statique avec portée de compte

Les assistants partagés dans `directory-runtime` ne gèrent que les opérations génériques :

- filtrage des requêtes
- application de la limite
- assistants de déduplication/normalisation
- construction de `ChannelDirectoryEntry[]`

L'inspection de compte spécifique au canal et la normalisation des identifiants doivent rester dans l'implémentation du plugin.

## Catalogues de fournisseurs

Les plugins de fournisseur peuvent définir des catalogues de modèles pour l'inférence avec `registerProvider({ catalog: { run(...) { ... } } })`.

`catalog.run(...)` renvoie la même forme que OpenClaw écrit dans `models.providers` :

- `{ provider }` pour une entrée de fournisseur
- `{ providers }` pour plusieurs entrées de fournisseur

Utilisez `catalog` lorsque le plugin possède des identifiants de modèle spécifiques au fournisseur, des valeurs par défaut d'URL de base ou des métadonnées de modèle protégées par authentification.

`catalog.order` contrôle le moment où le catalogue d'un plugin fusionne par rapport aux fournisseurs implicites intégrés de OpenClaw :

- `simple` : fournisseurs basés sur une clé API simple ou des variables d'environnement
- `profile` : fournisseurs qui apparaissent lorsque des profils d'authentification existent
- `paired` : fournisseurs qui synthétisent plusieurs entrées de fournisseurs connexes
- `late` : dernière passe, après les autres fournisseurs implicites

En cas de collision de clés, les derniers fournisseurs l'emportent. Ainsi, les plugins peuvent volontairement remplacer une entrée de fournisseur intégrée avec le même identifiant de fournisseur.

Compatibilité :

- `discovery` fonctionne toujours comme un alias hérité
- si `catalog` et `discovery` sont tous deux enregistrés, OpenClaw utilise `catalog`

## Inspection de canal en lecture seule

Si votre plugin enregistre un canal, privilégiez l'implémentation de
`plugin.config.inspectAccount(cfg, accountId)` parallèlement à `resolveAccount(...)`.

Pourquoi :

- `resolveAccount(...)` est le chemin d'exécution. Il est autorisé à supposer que les informations d'identification
  sont entièrement matérialisées et peut échouer rapidement lorsque les secrets requis sont manquants.
- Les chemins de commande en lecture seule tels que `openclaw status`, `openclaw status --all`,
  `openclaw channels status`, `openclaw channels resolve`, et les flux de réparation doctor/config
  ne devraient pas avoir besoin de matérialiser les informations d'identification d'exécution juste pour
  décrire la configuration.

Comportement recommandé pour `inspectAccount(...)` :

- Ne renvoyez que l'état descriptif du compte.
- Conservez `enabled` et `configured`.
- Incluez les champs de source/statut des informations d'identification lorsque cela est pertinent, tels que :
  - `tokenSource`, `tokenStatus`
  - `botTokenSource`, `botTokenStatus`
  - `appTokenSource`, `appTokenStatus`
  - `signingSecretSource`, `signingSecretStatus`
- Vous n'avez pas besoin de renvoyer les valeurs brutes des jetons juste pour signaler la disponibilité
  en lecture seule. Renvoyer `tokenStatus: "available"` (et le champ source correspondant)
  est suffisant pour les commandes de type statut.
- Utilisez `configured_unavailable` lorsqu'une information d'identification est configurée via SecretRef mais
  indisponible dans le chemin de commande actuel.

Cela permet aux commandes en lecture seule de signaler « configuré mais indisponible dans ce chemin de commande » au lieu de planter ou de signaler incorrectement que le compte n'est pas configuré.

## Packs de packages

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

Chaque entrée devient un plugin. Si le pack liste plusieurs extensions, l'identifiant du plugin devient `name/<fileBase>`.

Si votre plugin importe des dépendances npm, installez-les dans ce répertoire afin que `node_modules` soit disponible (`npm install` / `pnpm install`).

Garantie de sécurité : chaque entrée `openclaw.extensions` doit rester à l'intérieur du répertoire du plugin après la résolution des liens symboliques. Les entrées qui s'échappent du répertoire du package sont rejetées.

Note de sécurité : `openclaw plugins install` installe les dépendances des plugins avec `npm install --ignore-scripts` (pas de scripts de cycle de vie). Gardez les arbres de dépendances des plugins « pure JS/TS » et évitez les packages qui nécessitent des builds `postinstall`.

Optionnel : `openclaw.setupEntry` peut pointer vers un module léger de configuration uniquement. Lorsque OpenClaw a besoin de surfaces de configuration pour un plugin de canal désactivé, ou lorsqu'un plugin de canal est activé mais toujours non configuré, il charge `setupEntry` au lieu de l'entrée complète du plugin. Cela rend le démarrage et la configuration plus légers lorsque votre entrée principale du plugin connecte également des outils, des hooks ou d'autres codes exclusivement liés à l'exécution.

Optionnel : `openclaw.startup.deferConfiguredChannelFullLoadUntilAfterListen` peut opter pour un plugin de canal afin qu'il emprunte le même chemin `setupEntry` pendant la phase de démarrage pré-écoute de la passerelle, même lorsque le canal est déjà configuré.

N'utilisez ceci que lorsque `setupEntry` couvre entièrement la surface de démarrage qui doit exister avant que la passerelle ne commence à écouter. En pratique, cela signifie que l'entrée de configuration doit enregistrer chaque capacité appartenant au canal dont le démarrage dépend, par exemple :

- l'enregistrement du canal lui-même
- toutes les routes HTTP qui doivent être disponibles avant que la passerelle ne commence à écouter
- toutes les méthodes de passerelle, outils ou services qui doivent exister pendant cette même fenêtre

Si votre entrée complète possède toujours une capacité de démarrage requise, n'activez pas ce drapeau. Conservez le plugin sur le comportement par défaut et laissez OpenClaw charger l'entrée complète pendant le démarrage.

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
des indices d'installation via `openclaw.install`. Cela permet de garder le catalogue principal exempt de données.

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

OpenClaw peut également fusionner des **catalogues de canaux externes** (par exemple, un export de
registre MPM). Déposez un fichier JSON à l'un des emplacements suivants :

- `~/.openclaw/mpm/plugins.json`
- `~/.openclaw/mpm/catalog.json`
- `~/.openclaw/plugins/catalog.json`

Ou pointez `OPENCLAW_PLUGIN_CATALOG_PATHS` (ou `OPENCLAW_MPM_CATALOG_PATHS`) vers
un ou plusieurs fichiers JSON (délimités par des virgules, des points-virgules ou `PATH`). Chaque fichier doit
contenir `{ "entries": [ { "name": "@scope/pkg", "openclaw": { "channel": {...}, "install": {...} } } ] }`.

## Plugins de moteur de contexte

Les plugins de moteur de contexte possèdent l'orchestration du contexte de session pour l'ingestion, l'assemblage
et la compactage. Enregistrez-les depuis votre plugin avec
`api.registerContextEngine(id, factory)`, puis sélectionnez le moteur actif avec
`plugins.slots.contextEngine`.

Utilisez ceci lorsque votre plugin doit remplacer ou étendre le pipeline de contexte par défaut
plutôt que de simplement ajouter une recherche mémoire ou des hooks.

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

Lorsqu'un plugin a besoin d'un comportement qui ne correspond pas à l'API actuelle, ne contournez pas
le système de plugins par un accès privé. Ajoutez la capacité manquante.

Séquence recommandée :

1. définir le contrat principal
   Décidez du comportement partagé dont le cœur doit être propriétaire : stratégie, repli, fusion de configuration,
   cycle de vie, sémantique orientée canal, et forme de l'aide d'exécution.
2. ajouter des surfaces d'enregistrement/runtime de plugin typées
   Étendez `OpenClawPluginApi` et/ou `api.runtime` avec la plus petite surface de capacité
   typée utile.
3. connecter le cœur + consommateurs de canal/fonctionnalité
   Les canaux et les plugins de fonctionnalité doivent consommer la nouvelle capacité via le cœur,
   et non en important directement une implémentation fournisseur.
4. enregistrer les implémentations fournisseur
   Les plugins fournisseur enregistrent ensuite leurs backends par rapport à la capacité.
5. ajouter une couverture de contrat
   Ajoutez des tests pour que la propriété et la forme de l'enregistrement restent explicites au fil du temps.

C'est ainsi qu'OpenClaw reste opinionné sans être figé dans la vision du monde d'un seul provider. Consultez le [Capability Cookbook](/fr/tools/capability-cookbook) pour une liste de contrôle concrète des fichiers et un exemple travaillé.

### Liste de contrôle des capacités

Lorsque vous ajoutez une nouvelle capacité, l'implémentation doit généralement toucher ces surfaces ensemble :

- types de contrat de base dans `src/<capability>/types.ts`
- assistant d'exécution/exécution de base dans `src/<capability>/runtime.ts`
- surface d'enregistrement de l'API du plugin dans `src/plugins/types.ts`
- câblage du registre de plugins dans `src/plugins/registry.ts`
- exposition de l'exécution du plugin dans `src/plugins/runtime/*` lorsque les plugins de fonctionnalité/canal
  ont besoin de la consommer
- assistants de capture/test dans `src/test-utils/plugin-registration.ts`
- assertions de propriété/contrat dans `src/plugins/contracts/registry.ts`
- documentation opérateur/plugin dans `docs/`

Si l'une de ces surfaces manque, c'est généralement un signe que la capacité n'est pas encore entièrement intégrée.

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

Cela garde la règle simple :

- le cœur possède le contrat de capacité + l'orchestration
- les plugins vendeurs possèdent les implémentations vendeurs
- les plugins de fonctionnalité/canal consomment les assistants d'exécution
- les tests de contrat gardent la propriété explicite
