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
  Ceci est la **référence de l'architecture approfondie**. Pour des guides pratiques, voir : - [Installer et utiliser des plugins](/en/tools/plugin) — guide utilisateur - [Getting Started](/en/plugins/building-plugins) — premier tutoriel de plugin - [Channel Plugins](/en/plugins/sdk-channel-plugins) — créer un canal de messagerie - [Provider Plugins](/en/plugins/sdk-provider-plugins) — créer un
  provider de model - [SDK Overview](/en/plugins/sdk-overview) — carte d'importation et API d'enregistrement
</Info>

Cette page couvre l'architecture interne du système de plugins OpenClaw.

## Modèle de capacité publique

Les capacités constituent le modèle **de plugin natif** public au sein de OpenClaw. Chaque
plugin natif OpenClaw s'enregistre pour un ou plusieurs types de capacités :

| Capacité                 | Méthode d'enregistrement                      | Plugins exemples          |
| ------------------------ | --------------------------------------------- | ------------------------- |
| Inférence de texte       | `api.registerProvider(...)`                   | `openai`, `anthropic`     |
| Backend d'inférence CLI  | `api.registerCliBackend(...)`                 | `openai`, `anthropic`     |
| Synthèse vocale          | `api.registerSpeechProvider(...)`             | `elevenlabs`, `microsoft` |
| Compréhension des médias | `api.registerMediaUnderstandingProvider(...)` | `openai`, `google`        |
| Génération d'images      | `api.registerImageGenerationProvider(...)`    | `openai`, `google`        |
| Recherche Web            | `api.registerWebSearchProvider(...)`          | `google`                  |
| Canal / messagerie       | `api.registerChannel(...)`                    | `msteams`, `matrix`       |

Un plugin qui n'enregistre aucune capacité mais fournit des hooks, des outils ou des services est un plugin **legacy hook-only** (à hooks uniquement). Ce modèle est toujours entièrement pris en charge.

### Position sur la compatibilité externe

Le modèle de capacité est intégré au cœur et utilisé par les plugins groupés/natifs aujourd'hui, mais la compatibilité des plugins externes nécessite encore une barre plus stricte que "il est exporté, donc il est figé."

Recommandations actuelles :

- **plugins externes existants :** assurer le bon fonctionnement des intégrations basées sur des hooks ; traiter cela comme la base de compatibilité
- ** nouveaux plugins groupés/natifs :** privilégier l'enregistrement explicite des capacités plutôt que
  les extensions spécifiques aux fournisseurs ou les nouvelles conceptions basées uniquement sur des hooks
- ** plugins externes adoptant l'enregistrement des capacités :** autorisé, mais considérer les
  surfaces d'assistance spécifiques aux capacités comme évolutives, sauf si la documentation marque explicitement un
  contrat comme stable

Règle pratique :

- les API d'enregistrement des capacités constituent la direction prévue
- les hooks hérités restent le chemin le plus sûr sans rupture pour les plugins externes pendant
  la transition
- les sous-chemins d'assistance exportés ne sont pas tous égaux ; privilégier le contrat documenté
  étroit, et non les exportations d'assistance incidentes

### Formes de plugins

OpenClaw classe chaque plugin chargé dans une forme en fonction de son comportement d'enregistrement réel (et pas seulement des métadonnées statiques) :

- ** plain-capability ** -- enregistre exactement un type de capacité (par exemple un
  plugin provider uniquement comme `mistral`)
- **hybrid-capability** -- enregistre plusieurs types de capacités (par exemple,
  `openai` possède l'inférence de texte, la parole, la compréhension multimédia et la
  génération d'images)
- **hook-only** -- enregistre uniquement des hooks (typés ou personnalisés), aucune capacité,
  outil, commande ou service
- **non-capability** -- enregistre des outils, commandes, services ou itinéraires mais aucune
  capacité

Utilisez `openclaw plugins inspect <id>` pour voir la forme d'un plugin et le détail de ses
capacités. Voir la [référence CLI](/en/cli/plugins#inspect) pour plus de détails.

### Legacy hooks

Le hook `before_agent_start` reste pris en charge comme chemin de compatibilité pour
les plugins hook-only. Les plugins réels existants en dépendent toujours.

Direction :

- le garder fonctionnel
- le documenter comme obsolète (legacy)
- préférer `before_model_resolve` pour le travail de substitution de model/provider
- préférer `before_prompt_build` pour le travail de mutation de prompt
- supprimer uniquement après la baisse de l'utilisation réelle et la couverture des fixtures prouve la sécurité de la migration

### Signaux de compatibilité

Lorsque vous exécutez `openclaw doctor` ou `openclaw plugins inspect <id>`, vous pouvez voir
l'une de ces étiquettes :

| Signal                           | Signification                                                               |
| -------------------------------- | --------------------------------------------------------------------------- |
| **config valide**                | La configuration est analysée correctement et les plugins sont résolus      |
| **avis de compatibilité**        | Le plugin utilise un modèle pris en charge mais ancien (p. ex. `hook-only`) |
| **avertissement d'obsolèscence** | Le plugin utilise `before_agent_start`, qui est obsolète                    |
| **erreur fatale**                | La configuration n'est pas valide ou le plugin n'a pas pu être chargé       |

Ni `hook-only` ni `before_agent_start` ne cassera votre plugin aujourd'hui --
`hook-only` est un avis, et `before_agent_start` ne déclenche qu'un avertissement. Ces
signaux apparaissent également dans `openclaw status --all` et `openclaw plugins doctor`.

## Vue d'ensemble de l'architecture

Le système de plugins OpenClaw possède quatre couches :

1. **Manifeste + découverte**
   OpenClaw trouve les plugins candidats dans les chemins configurés, les racines de l'espace de travail,
   les racines d'extensions globales et les extensions groupées. La découverte lit les manifestes natifs
   `openclaw.plugin.json` ainsi que les manifestes de bundles pris en charge en premier.
2. **Activation + validation**
   Le Core décide si un plugin découvert est activé, désactivé, bloqué ou
   sélectionné pour un emplacement exclusif tel que la mémoire.
3. **Chargement du runtime**
   Les plugins natifs OpenClaw sont chargés en processus via jiti et enregistrent
   les capacités dans un registre central. Les bundles compatibles sont normalisés en
   enregistrements de registre sans importer de code de runtime.
4. **Consommation de surface**
   Le reste d'OpenClaw lit le registre pour exposer les outils, les canaux, la configuration du provider,
   les hooks, les routes HTTP, les commandes CLI et les services.

La limite de conception importante :

- la découverte + la validation de la configuration doivent fonctionner à partir des **métadonnées de manifeste/schéma**
  sans exécuter le code du plugin
- le comportement d'exécution natif provient du chemin `register(api)` du module du plugin

Cette division permet à OpenClaw de valider la configuration, d'expliquer les plugins manquants/désactivés et de
construire des indices d'interface/schéma avant que l'exécution complète ne soit active.

### Plugins de canal et l'outil de message partagé

Les plugins de canal n'ont pas besoin d'enregistrer un outil d'envoi/modification/réaction séparé pour
les actions de chat normales. OpenClaw conserve un outil partagé `message` dans le cœur, et
les plugins de canal possèdent la découverte et l'exécution spécifiques au canal derrière celui-ci.

La limite actuelle est :

- le cœur possède l'hôte de l'outil partagé `message`, le câblage des invites, la gestion de session/fil
  et la répartition de l'exécution
- les plugins de canal possèdent la découverte des actions délimitées, la découverte des capacités et tous
  fragments de schéma spécifiques au canal
- les plugins de canal exécutent l'action finale via leur adaptateur d'action

Pour les plugins de canal, la surface du SDK est
`ChannelMessageActionAdapter.describeMessageTool(...)`. Cet appel de découverte unifié
permet à un plugin de renvoyer ses actions visibles, ses capacités et ses contributions de schéma
d'ensemble afin que ces éléments ne se déphasent pas.

Le cœur transmet la portée d'exécution (runtime scope) lors de cette étape de découverte. Les champs importants incluent :

- `accountId`
- `currentChannelId`
- `currentThreadTs`
- `currentMessageId`
- `sessionKey`
- `sessionId`
- `agentId`
- `requesterSenderId` entrant approuvé

C'est important pour les plugins sensibles au contexte. Un channel peut masquer ou exposer des actions de message en fonction du compte actif, de la salle/discussion/message actuel ou de l'identité du demandeur de confiance, sans coder en dur les branches spécifiques au channel dans l'outil `message` central.

C'est pourquoi les modifications de routage du runner intégré constituent toujours un travail de plugin : le runner est responsable de la transmission de l'identité de chat/session actuelle vers la limite de découverte du plugin, afin que l'outil `message` partagé expose la bonne surface appartenant au channel pour le tour actuel.

Pour les assistants d'exécution appartenant aux canaux, les plugins groupés doivent conserver le runtime d'exécution à l'intérieur de leurs propres modules d'extension. Le noyau ne possède plus les runtimes d'action de message Discord, Slack, Telegram ou WhatsApp sous `src/agents/tools`. Nous ne publions pas de sous-chemins `plugin-sdk/*-action-runtime` séparés, et les plugins groupés doivent importer leur propre code d'exécution local directement à partir de leurs modules détenus par l'extension.

Pour les sondages spécifiquement, il existe deux chemins d'exécution :

- `outbound.sendPoll` est la base commune pour les canaux qui correspondent au modèle de sondage courant
- `actions.handleAction("poll")` est le chemin préféré pour la sémantique de sondage spécifique au canal ou les paramètres de sondage supplémentaires

Le noyau diffère désormais l'analyse des sondages partagés jusqu'à ce que la répartition des sondages du plugin refuse l'action, afin que les gestionnaires de sondage détenus par le plugin puissent accepter les champs de sondage spécifiques au canal sans être bloqués au préalable par l'analyseur de sondage générique.

Voir [Load pipeline](#load-pipeline) pour la séquence de démarrage complète.

## Modèle de propriété des capacités

OpenClaw considère un plugin natif comme la limite de propriété pour une **entreprise** ou une
**fonctionnalité**, et non comme un sac fourre-tout d'intégrations sans rapport.

Cela signifie :

- un plugin d'entreprise doit généralement posséder toutes les interfaces de cette entreprise orientées OpenClaw
- un plugin de fonctionnalité doit généralement posséder la surface complète de la fonctionnalité qu'il introduit
- les canaux doivent consommer des capacités centrales partagées au lieu de réimplémenter
  le comportement du fournisseur ad hoc

Exemples :

- le plugin `openai` inclus possède le comportement de fournisseur de modèle OpenAI et le comportement
  de synthèse vocale + compréhension des médias + génération d'images OpenAI
- le plugin `elevenlabs` inclus possède le comportement vocal ElevenLabs
- le plugin `microsoft` inclus possède le comportement vocal Microsoft
- le plugin `google` inclus possède le comportement de fournisseur de modèle Google ainsi que les comportements de compréhension des médias, de génération d'images et de recherche Web de Google
- les plugins `minimax`, `mistral`, `moonshot` et `zai` inclus possèdent leurs
  backends de compréhension des médias
- le plugin `voice-call` est un plugin de fonctionnalité : il possède le transport d'appel, les outils,
  la CLI, les routes et le runtime, mais il consomme la capacité TTS/STT principale au lieu de
  inventer une seconde pile vocale

L'état final prévu est :

- OpenAI réside dans un seul plugin même s'il couvre les modèles de texte, la voix, les images et
  la future vidéo
- un autre fournisseur peut faire de même pour sa propre surface
- les channels se soucient peu du plugin fournisseur qui possède le provider ; ils consomment le
  contrat de capacité partagée exposé par le cœur

Voici la distinction clé :

- **plugin** = limite de propriété
- **capability** = contrat principal que plusieurs plugins peuvent implémenter ou consommer

Ainsi, si OpenClaw ajoute un nouveau domaine tel que la vidéo, la première question n'est pas
« quel fournisseur devrait coder en dur la gestion de la vidéo ? ». La première question est « quel est
le contrat de capacité vidéo principal ? ». Une fois ce contrat existant, les plugins fournisseur
peuvent s'enregistrer dessus et les plugins channel/fonctionnalité peuvent le consommer.

Si la capacité n'existe pas encore, la bonne approche est généralement :

1. définir la capacité manquante dans le cœur
2. l'exposer via l'API/runtime du plugin de manière typée
3. connecter les channels/fonctionnalités à cette capacité
4. laisser les plugins fournisseur enregistrer des implémentations

Cela garde la propriété explicite tout en évitant un comportement central qui dépend d'un
seul fournisseur ou d'un chemin de code spécifique à un plugin ponctuel.

### Superposition des capacités

Utilisez ce modèle mental pour décider où le code doit se trouver :

- **couche de capacité principale** : orchestration partagée, politique, basculement, règles
  de fusion de configuration, sémantique de livraison et contrats typés
- **vendor plugin layer** : API spécifiques aux fournisseurs, auth, catalogues de models, synthèse vocale, génération d'images, backends vidéo futurs, points de terminaison d'utilisation
- **couche de plugin de canal/fonctionnalité** : intégration Slack/Discord/appel vocal/etc.
  qui consomme des capacités centrales et les présente sur une surface

Par exemple, le TTS suit cette forme :

- le cœur possède la stratégie de synthèse vocale au moment de la réponse, l'ordre de repli, les préférences et la diffusion via le canal
- `openai`, `elevenlabs` et `microsoft` possèdent les implémentations de synthèse
- `voice-call` consomme l'assistant d'exécution TTS téléphonique

Ce même modèle devrait être privilégié pour les futures capacités.

### Exemple de plugin d'entreprise à capacités multiples

Un plugin d'entreprise doit paraître cohérent de l'extérieur. Si OpenClaw dispose de contrats partagés pour les modèles, la parole, la compréhension des médias et la recherche Web, un fournisseur peut posséder toutes ses surfaces en un seul endroit :

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

- un seul plugin possède la surface du fournisseur
- le cœur possède toujours les contrats de capacité
- les canaux et les plugins de fonctionnalités consomment les assistants `api.runtime.*`, et non le code du fournisseur
- les tests de contrat peuvent vérifier que le plugin a enregistré les capacités
  qu'il prétend posséder

### Exemple de capacité : compréhension vidéo

OpenClaw traite déjà la compréhension d'image/audio/vidéo comme une capacité partagée. Le même modèle de propriété s'applique ici :

1. core définit le contrat de compréhension des médias
2. les plugins fournisseur enregistrent `describeImage`, `transcribeAudio` et
   `describeVideo` selon le cas
3. les canaux et les plugins de fonctionnalités consomment le comportement principal partagé au lieu
   de se connecter directement au code fournisseur

Cela évite d'intégrer les hypothèses vidéo d'un fournisseur dans le cœur. Le plugin possède
la surface fournisseur ; le cœur possède le contrat de capacité et le comportement de repli.

Si OpenClaw ajoute un nouveau domaine plus tard, tel que la génération vidéo, utilisez la même
séquence à nouveau : définissez d'abord la capacité principale, puis laissez les plugins fournisseur
enregistrer des implémentations.

Besoin d'une liste de contrôle concrète pour le déploiement ? Voir
[Capability Cookbook](/en/tools/capability-cookbook).

## Contrats et application

La surface de l'API des plugins est intentionnellement typée et centralisée dans
`OpenClawPluginApi`. Ce contrat définit les points d'enregistrement pris en charge et
les assistants d'exécution dont un plugin peut dépendre.

Pourquoi c'est important :

- les auteurs de plugins bénéficient d'une norme interne stable
- le cœur peut rejeter la propriété en double, par exemple deux plugins enregistrant le même
  identifiant provider
- le démarrage peut fournir des diagnostics exploitables pour les enregistrements malformés
- les tests de contrat peuvent appliquer la propriété des plugins groupés et empêcher les dérives silencieuses

Il existe deux niveaux d'application :

1. **application de l'enregistrement à l'exécution**
   Le registre de plugins valide les enregistrements lors du chargement des plugins. Exemples :
   les identifiants provider en double, les identifiants de provider vocale en double et les enregistrements
   malformés produisent des diagnostics de plugin au lieu d'un comportement indéfini.
2. **contract tests**
   Bundled plugins are captured in contract registries during test runs so
   OpenClaw can assert ownership explicitly. Today this is used for model
   providers, speech providers, web search providers, and bundled registration
   ownership.

The practical effect is that OpenClaw knows, up front, which plugin owns which
surface. That lets core and channels compose seamlessly because ownership is
declared, typed, and testable rather than implicit.

### What belongs in a contract

Good plugin contracts are:

- typed
- small
- capability-specific
- owned by core
- reusable by multiple plugins
- consumable by channels/features without vendor knowledge

Bad plugin contracts are:

- vendor-specific policy hidden in core
- one-off plugin escape hatches that bypass the registry
- channel code reaching straight into a vendor implementation
- des objets d'exécution ad hoc qui ne font pas partie de `OpenClawPluginApi` ou
  `api.runtime`

En cas de doute, augmentez le niveau d'abstraction : définissez d'abord la capacité, puis
laissez les plugins s'y connecter.

## Modèle d'exécution

Les plugins natifs OpenClaw s'exécutent **en cours de traitement** (in-process) avec le OpenClaw. Ils ne sont pas
sandboxed. Un plugin natif chargé a la même limite de confiance au niveau du processus que
le code central.

Implications :

- un plugin natif peut enregistrer des outils, des gestionnaires réseau, des hooks et des services
- un bogue dans un plugin natif peut planter ou déstabiliser la passerelle
- un plugin natif malveillant équivaut à une exécution de code arbitraire à l'intérieur
  du processus OpenClaw

Les bundles compatibles sont plus sûrs par défaut car OpenClaw les traite actuellement
comme des packs de métadonnées/contenu. Dans les versions actuelles, cela signifie principalement des compétences
regroupées.

Utilisez des listes d'autorisation et des chemins d'installation/chargement explicites pour les plugins non groupés. Traitez les plugins de l'espace de travail comme du code de développement, et non comme des valeurs par défaut de production.

Pour les noms de packages d'espace de travail groupés, gardez l'identifiant du plugin ancré dans le nom npm : `@openclaw/<id>` par défaut, ou un suffixe typé approuvé tel que `-provider`, `-plugin`, `-speech`, `-sandbox`, ou `-media-understanding` lorsque le package expose intentionnellement un rôle de plugin plus étroit.

Note importante sur la confiance :

- `plugins.allow` fait confiance aux **identifiants de plugin**, et non à la provenance de la source.
- Un plugin d'espace de travail portant le même identifiant qu'un plugin groupé remplace intentionnellement la copie groupée lorsque ce plugin d'espace de travail est activé/autorisé.
- C'est normal et utile pour le développement local, les tests correctifs et les correctifs urgents (hotfixes).

## Limite d'exportation

OpenClaw exporte des capacités, pas des commodités de mise en œuvre.

Gardez l'enregistrement des capacités public. Réduisez les exportations d'assistants non contractuels :

- sous-chemins d'assistants spécifiques aux plugins groupés
- sous-chemins de plomberie d'exécution non destinés à être une API publique
- assistants de commodité spécifiques aux fournisseurs
- assistants de configuration/onboarding qui sont des détails de mise en œuvre

## Pipeline de chargement

Au démarrage, OpenClaw fait grosso modo ceci :

1. découvrir les racines candidates de plugins
2. lire les manifestes de groupement natifs ou compatibles et les métadonnées de package
3. rejeter les candidats non sécurisés
4. normaliser la configuration du plugin (`plugins.enabled`, `allow`, `deny`, `entries`,
   `slots`, `load.paths`)
5. décider de l'activation pour chaque candidat
6. charger les modules natifs activés via jiti
7. appeler les `register(api)` natifs et collecter les enregistrements dans le registre de plugins
8. exposer le registre aux surfaces de commandes/au runtime

Les verrous de sécurité ont lieu **avant** l'exécution du runtime. Les candidats sont bloqués
lorsque l'entrée sort de la racine du plugin, que le chemin est accessible en écriture par tous,
ou que la propriété du chemin semble suspecte pour les plugins non regroupés.

### Comportement axé d'abord sur le manifeste

Le manifeste est la source de vérité du plan de contrôle. OpenClaw l'utilise pour :

- identifier le plugin
- découvrir les canaux/compétences/schémas de configuration déclarés ou les capacités du bundle
- valider `plugins.entries.<id>.config`
- augmenter les étiquettes/espaces réservés de l'interface utilisateur de contrôle
- afficher les métadonnées d'installation/de catalogue

Pour les plugins natifs, le module d'exécution est la partie du plan de données. Il enregistre
le comportement réel tel que les hooks, les outils, les commandes ou les flux du provider.

### Ce que le chargeur met en cache

OpenClaw conserve des caches en processus courts pour :

- les résultats de la découverte
- manifest registry data
- loaded plugin registries

These caches reduce bursty startup and repeated command overhead. They are safe
to think of as short-lived performance caches, not persistence.

Performance note:

- Set `OPENCLAW_DISABLE_PLUGIN_DISCOVERY_CACHE=1` or
  `OPENCLAW_DISABLE_PLUGIN_MANIFEST_CACHE=1` to disable these caches.
- Tune cache windows with `OPENCLAW_PLUGIN_DISCOVERY_CACHE_MS` and
  `OPENCLAW_PLUGIN_MANIFEST_CACHE_MS`.

## Registry model

Loaded plugins do not directly mutate random core globals. They register into a
central plugin registry.

The registry tracks:

- plugin records (identity, source, origin, status, diagnostics)
- tools
- legacy hooks and typed hooks
- channels
- providers
- gateway RPC handlers
- HTTP routes
- CLI registrars
- background services
- plugin-owned commands

Core features then read from that registry instead of talking to plugin modules
directly. This keeps loading one-way:

- module de plugin -> enregistrement du registre
- runtime principal -> consommation du registre

Cette séparation est importante pour la maintenabilité. Cela signifie que la plupart des surfaces du cœur n'ont besoin que d'un seul point d'intégration : "lire le registre", et non "traiter chaque module de plugin comme un cas particulier".

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
- `decision` : `"allow-once"`, `"allow-always"` ou `"deny"`
- `binding` : la liaison résolue pour les demandes approuvées
- `request` : le résumé de la demande originale, l'indice de détachement, l'ID de l'expéditeur et
  les métadonnées de la conversation

Ce rappel est uniquement à titre de notification. Il ne modifie pas qui est autorisé à lier une
conversation, et il s'exécute après la fin du traitement de l'approbation principale.

## Crochets d'exécution du fournisseur (Provider runtime hooks)

Les plugins de fournisseur ont désormais deux couches :

- métadonnées du manifeste : `providerAuthEnvVars` pour une recherche d'auth. d'environnement économique avant
  le chargement de l'exécution, plus `providerAuthChoices` pour des étiquettes d'onboarding/choix d'auth.
  économiques et des métadonnées de drapeau CLI avant le chargement de l'exécution
- crochets au moment de la configuration : `catalog` / `discovery` hérité
- crochets d'exécution : `resolveDynamicModel`, `prepareDynamicModel`, `normalizeResolvedModel`, `capabilities`, `prepareExtraParams`, `wrapStreamFn`, `formatApiKey`, `refreshOAuth`, `buildAuthDoctorHint`, `isCacheTtlEligible`, `buildMissingAuthMessage`, `suppressBuiltInModel`, `augmentModelCatalog`, `isBinaryThinking`, `supportsXHighThinking`, `resolveDefaultThinkingLevel`, `isModernModelRef`, `prepareRuntimeAuth`, `resolveUsageAuth`, `fetchUsageSnapshot`

OpenClaw possède toujours la boucle d'agent générique, le basculement, la gestion des transcriptions et la politique d'outil. Ces hooks constituent la surface d'extension pour les comportements spécifiques au fournisseur sans avoir besoin d'un transport d'inférence entièrement personnalisé.

Utilisez le manifeste `providerAuthEnvVars` lorsque le fournisseur dispose d'identifiants basés sur des variables d'environnement que les chemins d'authentification, d'état et de sélecteur de modèle génériques doivent voir sans charger le runtime du plugin. Utilisez le manifeste `providerAuthChoices` lorsque les interfaces de CLI et de choix d'authentification doivent connaître l'identifiant de choix, les étiquettes de groupe et le câblage d'authentification simple à un indicateur du fournisseur sans charger le runtime du fournisseur. Gardez le runtime du fournisseur `envVars` pour les indications destinées aux opérateurs, telles que les étiquettes d'intégration ou les variables de configuration du client id et du secret client OAuth.

### Ordre et utilisation des hooks

Pour les plugins de modèle ou de fournisseur, OpenClaw appelle les hooks dans cet ordre approximatif. La colonne "Quand utiliser" sert de guide rapide à la décision.

| #   | Hook                             | Ce qu'il fait                                                                                                                                       | Quand utiliser                                                                                                                      |
| --- | -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `catalog`                        | Publier la configuration du fournisseur dans `models.providers` lors de la génération `models.json`                                                 | Le fournisseur possède un catalogue ou des URL de base par défaut                                                                   |
| --  | _(recherche de modèle intégrée)_ | OpenClaw essaie d'abord le chemin normal du registre/catalogue                                                                                      | _(pas un hook de plugin)_                                                                                                           |
| 2   | `resolveDynamicModel`            | Retour de synchronisation pour les IDs de modèle possédés par le fournisseur et non encore présents dans le registre local                          | Le fournisseur accepte des IDs de modèle en amont arbitraires                                                                       |
| 3   | `prepareDynamicModel`            | Préchauffage asynchrone, puis `resolveDynamicModel` s'exécute à nouveau                                                                             | Le fournisseur a besoin de métadonnées réseau avant de résoudre les IDs inconnus                                                    |
| 4   | `normalizeResolvedModel`         | Réécriture finale avant que le runner intégré n'utilise le modèle résolu                                                                            | Le fournisseur a besoin de réécritures de transport mais utilise toujours un transport de base                                      |
| 5   | `capabilities`                   | Métadonnées de transcription/outillage détenues par le fournisseur et utilisées par la logique principale partagée                                  | Le fournisseur a besoin de particularités de la transcription/de la famille de fournisseurs                                         |
| 6   | `prepareExtraParams`             | Normalisation des paramètres de requête avant les wrappers d'options de flux génériques                                                             | Le fournisseur a besoin de paramètres de requête par défaut ou d'un nettoyage des paramètres par fournisseur                        |
| 7   | `wrapStreamFn`                   | Wrapper de flux après l'application des wrappers génériques                                                                                         | Le fournisseur a besoin de wrappers d'en-têtes/corps de requête/compatibilité de modèle sans transport personnalisé                 |
| 8   | `formatApiKey`                   | Formateur de profil d'authentification : le profil stocké devient la chaîne d'exécution `apiKey`                                                    | Le fournisseur stocke des métadonnées d'authentification supplémentaires et a besoin d'une forme de jeton d'exécution personnalisée |
| 9   | `refreshOAuth`                   | Remplacement de rafraîchissement OAuth pour les points de terminaison de rafraîchissement personnalisés ou la stratégie d'échec de rafraîchissement | Le fournisseur ne correspond pas aux rafraîchisseurs partagés `pi-ai`                                                               |
| 10  | `buildAuthDoctorHint`            | Repair hint appended when OAuth refresh fails                                                                                                       | Provider needs provider-owned auth repair guidance after refresh failure                                                            |
| 11  | `isCacheTtlEligible`             | Prompt-cache policy for proxy/backhaul providers                                                                                                    | Provider needs proxy-specific cache TTL gating                                                                                      |
| 12  | `buildMissingAuthMessage`        | Replacement for the generic missing-auth recovery message                                                                                           | Provider needs a provider-specific missing-auth recovery hint                                                                       |
| 13  | `suppressBuiltInModel`           | Stale upstream model suppression plus optional user-facing error hint                                                                               | Provider needs to hide stale upstream rows or replace them with a vendor hint                                                       |
| 14  | `augmentModelCatalog`            | Synthetic/final catalog rows appended after discovery                                                                                               | Provider needs synthetic forward-compat rows in `models list` and pickers                                                           |
| 15  | `isBinaryThinking`               | Interrupteur de raisonnement actif/inactif pour les fournisseurs à pensée binaire                                                                   | Le fournisseur expose uniquement l'activation/désactivation de la pensée binaire                                                    |
| 16  | `supportsXHighThinking`          | `xhigh` support du raisonnement pour les modèles sélectionnés                                                                                       | Le fournisseur souhaite `xhigh` uniquement sur un sous-ensemble de modèles                                                          |
| 17  | `resolveDefaultThinkingLevel`    | Niveau `/think` par défaut pour une famille de modèles spécifique                                                                                   | Le fournisseur possède la stratégie `/think` par défaut pour une famille de modèles                                                 |
| 18  | `isModernModelRef`               | Correspondance de modèle moderne pour les filtres de profil en direct et la sélection de smoke                                                      | Le fournisseur possède la correspondance de modèle privilégiée en direct/smoke                                                      |
| 19  | `prepareRuntimeAuth`             | Échanger une information d'identification configurée contre le jeton/clé de runtime réel juste avant l'inférence                                    | Le fournisseur a besoin d'un échange de jeton ou d'une information d'identification de demande à courte durée de vie                |
| 20  | `resolveUsageAuth`               | Résoudre les identifiants d'utilisation/de facturation pour `/usage` et les surfaces d'état associées                                               | Le provider a besoin d'une analyse personnalisée des jetons d'utilisation/quota ou d'un identifiant d'utilisation différent         |
| 21  | `fetchUsageSnapshot`             | Récupérer et normaliser les instantanés d'utilisation/quota spécifiques au provider après résolution de l'authentification                          | Le provider a besoin d'un point de terminaison d'utilisation ou d'un analyseur de payload spécifique au provider                    |

Si le provider a besoin d'un protocole filaire entièrement personnalisé ou d'un exécuteur de requête personnalisé,
c'est une classe d'extension différente. Ces hooks sont pour le comportement du provider
qui s'exécute toujours sur la boucle d'inférence normale de OpenClaw.

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
  `resolveDefaultThinkingLevel` et `isModernModelRef` car il possède la compatibilité
  future de Claude 4.6, les indicateurs de famille de provider, les conseils de réparation
  d'authentification, l'intégration du point de terminaison d'utilisation, l'éligibilité
  au cache de prompt et la politique de réflexion par défaut/adaptive de Claude.
- OpenAI utilise `resolveDynamicModel`, `normalizeResolvedModel` et
  `capabilities` ainsi que `buildMissingAuthMessage`, `suppressBuiltInModel`,
  `augmentModelCatalog`, `supportsXHighThinking` et `isModernModelRef`
  car il possède la compatibilité future de GPT-5.4, la normalisation directe OpenAI
  `openai-completions` -> `openai-responses`, les indications d'authentification
  conscientes de Codex, la suppression de Spark, les lignes de liste synthétiques OpenAI, et la stratégie de réflexion /
  de modèle dynamique GPT-5.
- OpenRouter utilise `catalog` plus `resolveDynamicModel` et
  `prepareDynamicModel` car le provider est en mode pass-through et peut exposer de
  nouveaux ids de model avant la mise à jour du catalogue statique d'OpenClaw ; il utilise également
  `capabilities`, `wrapStreamFn` et `isCacheTtlEligible` pour garder
  les en-têtes de requête spécifiques au provider, les métadonnées de routage, les correctifs de raisonnement et la
  stratégie de prompt-cache en dehors du cœur.
- GitHub Copilot utilise `catalog`, `auth`, `resolveDynamicModel` et
  `capabilities` plus `prepareRuntimeAuth` et `fetchUsageSnapshot` car il
  a besoin d'une connexion appareil propriétaire au provider, d'un comportement de repli de model, des
  particularités des transcriptions Claude, d'un échange de jeton GitHub -> jeton Copilot et d'un point de terminaison
  d'utilisation propriétaire au provider.
- OpenAI Codex utilise `catalog`, `resolveDynamicModel`,
  `normalizeResolvedModel`, `refreshOAuth` et `augmentModelCatalog` ainsi que
  `prepareExtraParams`, `resolveUsageAuth` et `fetchUsageSnapshot` car il
  fonctionne toujours sur les transports OpenAI mais possède sa propre normalisation du transport/de l'URL de base,
  sa stratégie de secours pour le rafraîchissement OAuth, son choix de transport par défaut,
  ses lignes de catalogue Codex synthétiques et son intégration au point de terminaison d'utilisation ChatGPT.
- Google AI Studio et Gemini CLI OAuth utilisent `resolveDynamicModel` et
  `isModernModelRef` car ils possèdent la compatibilité future (forward-compat) de Gemini 3.1 et
  la correspondance des models modernes ; le CLI OAuth OAuth Gemini utilise également `formatApiKey`,
  `resolveUsageAuth` et `fetchUsageSnapshot` pour le formatage des jetons, l'analyse
  des jetons et le câblage du point de terminaison de quota.
- Moonshot utilise `catalog` ainsi que `wrapStreamFn` car il utilise encore le transport
  partagé OpenAI mais a besoin d'une normalisation de la charge utile de réflexion (thinking) propre au provider.
- Kilocode utilise `catalog`, `capabilities`, `wrapStreamFn` et
  `isCacheTtlEligible` car il a besoin d'en-têtes de requête propres au provider,
  d'une normalisation de la charge utile de raisonnement, d'indices de transcription Gemini et d'un filtrage
  du TTL de cache Anthropic.
- Z.AI utilise `resolveDynamicModel`, `prepareExtraParams`, `wrapStreamFn`,
  `isCacheTtlEligible`, `isBinaryThinking`, `isModernModelRef`,
  `resolveUsageAuth` et `fetchUsageSnapshot` car il possède le repli GLM-5,
  les valeurs par défaut `tool_stream`, l'UX de pensée binaire, la correspondance de model moderne et à la fois
  l'authentification d'utilisation et la récupération des quotas.
- Mistral, OpenCode Zen et OpenCode Go utilisent uniquement `capabilities` pour garder
  les particularités de transcription/d'outillage hors du cœur.
- Les fournisseurs groupés en catalogue uniquement tels que `byteplus`, `cloudflare-ai-gateway`,
  `huggingface`, `kimi-coding`, `modelstudio`, `nvidia`, `qianfan`,
  `synthetic`, `together`, `venice`, `vercel-ai-gateway` et `volcengine` utilisent
  uniquement `catalog`.
- Le portail Qwen utilise `catalog`, `auth` et `refreshOAuth`.
- MiniMax et Xiaomi utilisent `catalog` ainsi que des hooks d'utilisation car leur comportement `/usage`
  est propriétaire du plugin même si l'inférence s'exécute toujours via les transports
  partagés.

## Helpers d'exécution

Les plugins peuvent accéder aux assistants principaux sélectionnés via `api.runtime`. Pour le TTS :

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

- `textToSpeech` renvoie la charge utile de sortie TTS principale normale pour les surfaces de fichier/de note vocale.
- Utilise la configuration principale `messages.tts` et la sélection de provider.
- Renvoie le tampon audio PCM + le taux d'échantillonnage. Les plugins doivent rééchantillonner/encoder pour les providers.
- `listVoices` est optionnel par provider. Utilisez-le pour les sélecteurs de voix ou les flux de configuration appartenant au fournisseur.
- Les listes de voix peuvent inclure des métadonnées plus riches telles que les paramètres régionaux, le genre et les balises de personnalité pour les sélecteurs compatibles avec les providers.
- OpenAI et ElevenLabs prennent en charge la téléphonie aujourd'hui. Microsoft non.

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

- Gardez la stratégie, le repli et la livraison de réponses TTS dans le cœur.
- Utilisez les providers de synthèse vocale pour le comportement de synthèse appartenant au fournisseur.
- L'entrée Microsoft `edge` est normalisée vers l'id de fournisseur `microsoft`.
- Le modèle de propriété privilégié est orienté entreprise : un plugin fournisseur peut posséder des fournisseurs de texte, de parole, d'image et de médias futurs à mesure qu'OpenClaw ajoute ces contrats de capacité.

Pour la compréhension d'image/audio/vidéo, les plugins enregistrent un provider de compréhension de média typé au lieu d'un sac générique de clé/valeur :

```ts
api.registerMediaUnderstandingProvider({
  id: "google",
  capabilities: ["image", "audio", "video"],
  describeImage: async (req) => ({ text: "..." }),
  transcribeAudio: async (req) => ({ text: "..." }),
  describeVideo: async (req) => ({ text: "..." }),
});
```

Remarques :

- Gardez l'orchestration, le repli, la configuration et le câblage de channel dans le cœur.
- Conserver le comportement du fournisseur dans le plugin provider.
- L'extension additive doit rester typée : nouvelles méthodes optionnelles, nouveaux champs de
  résultat optionnels, nouvelles capacités optionnelles.
- Si OpenClaw ajoute une nouvelle fonctionnalité telle que la génération vidéo plus tard, définissez d'abord le contrat de la fonctionnalité principale, puis laissez les plugins fournisseur s'enregistrer dessus.

Pour les assistants d'exécution de compréhension des médias, les plugins peuvent appeler :

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

Pour la transcription audio, les plugins peuvent utiliser soit le runtime de compréhension média, soit l'ancien alias STT :

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
- Utilise la configuration audio principale de compréhension des médias (`tools.media.audio`) et l'ordre de repli du provider.
- Renvoie `{ text: undefined }` lorsqu'aucune sortie de transcription n'est produite (par exemple, entrée ignorée/non prise en charge).
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

- `provider` et `model` sont des substitutions optionnelles par exécution, et non des modifications persistantes de la session.
- OpenClaw n'honore ces champs de substitution que pour les appelants de confiance.
- Pour les exécutions de repli détenues par des plugins, les opérateurs doivent opter avec `plugins.entries.<id>.subagent.allowModelOverride: true`.
- Utilisez `plugins.entries.<id>.subagent.allowedModels` pour restreindre les plugins de confiance à des cibles `provider/model` canoniques spécifiques, ou `"*"` pour autoriser explicitement n'importe quelle cible.
- Les exécutions de sous-agent de plugin non fiables fonctionnent toujours, mais les demandes de substitution sont rejetées au lieu de revenir silencieusement à une valeur par défaut.

Pour la recherche web, les plugins peuvent utiliser le helper d'exécution partagé au lieu d'accéder au câblage de l'agent tool :

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

Les plugins peuvent également enregistrer des fournisseurs de recherche web via
`api.registerWebSearchProvider(...)`.

Notes :

- Gardez la sélection du provider, la résolution des informations d'identification et la sémantique des requêtes partagées dans le core.
- Utilisez des fournisseurs de recherche web pour les transports de recherche spécifiques aux fournisseurs.
- `api.runtime.webSearch.*` est la surface partagée privilégiée pour les plugins de fonctionnalités/canaux qui ont besoin d'un comportement de recherche sans dépendre du wrapper de l'agent tool.

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

- `path` : chemin de routage sous le serveur HTTP de la passerelle.
- `auth` : requis. Utilisez `"gateway"` pour exiger l'authentification normale de la passerelle, ou `"plugin"` pour l'authentification gérée par le plugin / la vérification du webhook.
- `match` : facultatif. `"exact"` (par défaut) ou `"prefix"`.
- `replaceExisting` : facultatif. Permet au même plugin de remplacer son propre enregistrement de route existant.
- `handler` : renvoie `true` lorsque la route a traité la requête.

Notes :

- `api.registerHttpHandler(...)` est obsolète. Utilisez `api.registerHttpRoute(...)`.
- Les routes de plugins doivent déclarer `auth` explicitement.
- Les conflits exacts de `path + match` sont rejetés sauf si `replaceExisting: true`, et un plugin ne peut pas remplacer la route d'un autre plugin.
- Les itinéraires qui se chevauchent avec différents niveaux `auth` sont rejetés. Gardez les chaînes de repli `exact`/`prefix` uniquement sur le même niveau d'authentification.

## Chemins d'importation du Plugin SDK

Utilisez les sous-chemins du SDK plutôt que l'import monolithique `openclaw/plugin-sdk` lors de la rédaction de plugins :

- `openclaw/plugin-sdk/plugin-entry` pour les primitives d'enregistrement de plugins.
- `openclaw/plugin-sdk/core` pour le contrat générique partagé orienté plugin.
- Primitives de channel stables tels que `openclaw/plugin-sdk/channel-setup`,
  `openclaw/plugin-sdk/channel-pairing`,
  `openclaw/plugin-sdk/channel-contract`,
  `openclaw/plugin-sdk/channel-feedback`,
  `openclaw/plugin-sdk/channel-inbound`,
  `openclaw/plugin-sdk/channel-lifecycle`,
  `openclaw/plugin-sdk/channel-reply-pipeline`,
  `openclaw/plugin-sdk/command-auth`,
  `openclaw/plugin-sdk/secret-input` et
  `openclaw/plugin-sdk/webhook-ingress` pour le câblage partagé de configuration, d'authentification, de réponse et de webhook. `channel-inbound` est le foyer commun pour le debounce, la correspondance des mentions, le formatage des enveloppes et les assistants de contexte d'enveloppe entrante.
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
  `openclaw/plugin-sdk/directory-runtime` pour les helpers d'exécution/de configuration partagés.
- `openclaw/plugin-sdk/channel-runtime` ne reste qu'une compatibilité shim.
  Le nouveau code devrait importer les primitives plus étroites à la place.
- Les internes des extensions groupées restent privés. Les plugins externes ne doivent utiliser que les sous-chemins `openclaw/plugin-sdk/*`. Le code de test/ cœur d'OpenClaw peut utiliser les points d'entrée publics du dépôt sous `extensions/<id>/index.js`, `api.js`, `runtime-api.js`, `setup-entry.js`, et des fichiers à portée limitée tels que `login-qr-api.js`. N'importez jamais `extensions/<id>/src/*` depuis le cœur ou depuis une autre extension.
- Répartition du point d'entrée du dépôt :
  `extensions/<id>/api.js` est le baril d'aide/types,
  `extensions/<id>/runtime-api.js` est le barel d'exécution uniquement,
  `extensions/<id>/index.js` est le point d'entrée du plugin groupé,
  et `extensions/<id>/setup-entry.js` est le point d'entrée du plugin de configuration.
- Il ne reste plus de sous-chemins publics groupés avec la marque d'un channel. Les helpers spécifiques au channel et les points de couture du runtime se trouvent sous `extensions/<id>/api.js` et `extensions/<id>/runtime-api.js` ; le contrat public du SDK est constitué des primitives partagées génériques à la place.

Remarque de compatibilité :

- Évitez le barrel `openclaw/plugin-sdk` racine pour le nouveau code.
- Privilégiez d'abord les primitives stables étroites. Les nouveaux sous-chemins setup/pairing/reply/feedback/contract/inbound/threading/command/secret-input/webhook/infra/allowlist/status/message-tool constituent le contrat prévu pour les nouveaux travaux de plugins groupés et externes. L'analyse de cible et le matching appartiennent à `openclaw/plugin-sdk/channel-targets`. Les portes d'action de message et les helpers d'ID de message de réaction appartiennent à `openclaw/plugin-sdk/channel-actions`.
- Les modules utilitaires spécifiques aux extensions groupées ne sont pas stables par défaut. Si une aide n'est nécessaire que pour une extension groupée, gardez-la derrière la couture locale `api.js` ou `runtime-api.js` de l'extension au lieu de la promouvoir dans `openclaw/plugin-sdk/<extension>`.
- Les barres groupées marquées par le canal restent privées, sauf si elles sont explicitement rajoutées au contrat public.
- Les sous-chemins spécifiques aux fonctionnalités tels que `image-generation`,
  `media-understanding` et `speech` existent car les plugins groupés/natifs les utilisent
  aujourd'hui. Leur présence ne signifie pas par elle-même que chaque assistant exporté est un
  contrat externe figé à long terme.

## Schémas de tool de message

Les plugins doivent posséder les contributions de schéma `describeMessageTool(...)` spécifiques au channel. Gardez les champs spécifiques au provider dans le plugin, et non dans le cœur partagé.

Pour les fragments de schéma portables partagés, réutilisez les assistants génériques exportés via
`openclaw/plugin-sdk/channel-actions` :

- `createMessageToolButtonsSchema()` pour les payloads de style button-grid
- `createMessageToolCardSchema()` pour les charges utiles de cartes structurées

Si une forme de schéma n'a de sens que pour un provider, définissez-la dans la source de ce plugin au lieu de la promouvoir dans le SDK partagé.

## Résolution de la cible du canal

Les plugins de channel doivent posséder la sémantique cible spécifique au channel. Gardez l'hôte sortant partagé générique et utilisez la surface de l'adaptateur de messagerie pour les règles de provider :

- `messaging.inferTargetChatType({ to })` décide si une cible normalisée doit être traitée comme `direct`, `group`, ou `channel` avant la recherche dans le répertoire.
- `messaging.targetResolver.looksLikeId(raw, normalized)` indique au cœur si une
  entrée doit passer directement à une résolution de type identifiant au lieu d'une recherche de répertoire.
- `messaging.targetResolver.resolveTarget(...)` est le plugin de repli lorsque
  le cœur a besoin d'une résolution finale détenue par le fournisseur après la normalisation ou après
  un échec dans l'annuaire.
- `messaging.resolveOutboundSessionRoute(...)` possède la construction de route de session spécifique au provider une fois la cible résolue.

Fractionnement recommandé :

- Utilisez `inferTargetChatType` pour les décisions de catégorie qui doivent se produire avant la recherche de pairs/groupes.
- Utilisez `looksLikeId` pour les vérifications de "traiter ceci comme un ID cible explicite/natif".
- Utilisez `resolveTarget` pour la repli de normalisation spécifique au fournisseur, et non pour
  une recherche de répertoire étendue.
- Conservez les identifiants natifs du provider tels que les identifiants de chat, de fil de discussion, JIDs, handles et d'identifiants de salle dans des valeurs `target` ou des paramètres spécifiques au provider, et non dans les champs génériques du SDK.

## Répertoires basés sur la configuration

Les plugins qui dérivent des entrées de répertoire à partir de la configuration doivent conserver cette logique dans le
plugin et réutiliser les assistants partagés depuis
`openclaw/plugin-sdk/directory-runtime`.

Utilisez ceci lorsqu'un channel a besoin de pairs/groupes pris en charge par la configuration, tels que :

- pairs DM basés sur une liste verte
- cartes channel/group configurées
- répertoires statiques limités au compte

Les assistants partagés dans `directory-runtime` ne gèrent que les opérations génériques :

- filtrage des requêtes
- limitation de l'application
- helpers de déduplication/normalisation
- construction de `ChannelDirectoryEntry[]`

L'inspection spécifique au canal des comptes et la normalisation des identifiants doivent rester dans l'implémentation du plugin.

## Catalogues de fournisseurs

Les plugins de fournisseur peuvent définir des catalogues de modèles pour l'inférence avec
`registerProvider({ catalog: { run(...) { ... } } })`.

`catalog.run(...)` renvoie la même forme que OpenClaw écrit dans
`models.providers` :

- `{ provider }` pour une entrée de provider
- `{ providers }` pour plusieurs entrées de provider

Utilisez `catalog` lorsque le plugin possède des identifiants de model spécifiques au provider, des valeurs par défaut d'URL de base ou des métadonnées de model protégées par authentification.

`catalog.order` contrôle quand le catalogue d'un plugin fusionne par rapport aux fournisseurs implicites intégrés d'OpenClaw :

- `simple` : fournisseurs avec clé API simple ou basés sur des variables d'environnement
- `profile` : fournisseurs qui apparaissent lorsque des profils d'authentification existent
- `paired` : fournisseurs qui synthétisent plusieurs entrées de fournisseur connexes
- `late` : dernière passe, après les autres fournisseurs implicites

En cas de collision de clés, les providers les plus récents prévalent, ce qui permet aux plugins de remplacer intentionnellement une entrée de provider intégrée avec le même identifiant de provider.

Compatibilité :

- `discovery` fonctionne toujours comme un alias hérité
- si `catalog` et `discovery` sont tous deux enregistrés, OpenClaw utilise `catalog`

## Inspection de channel en lecture seule

Si votre plugin enregistre un channel, il est préférable d'implémenter `plugin.config.inspectAccount(cfg, accountId)` en parallèle à `resolveAccount(...)`.

Pourquoi :

- `resolveAccount(...)` est le chemin d'exécution. Il est autorisé à supposer que les informations d'identification
  sont entièrement matérialisées et peut échouer rapidement lorsque les secrets requis sont manquants.
- Les chemins de commande en lecture seule tels que `openclaw status`, `openclaw status --all`,
  `openclaw channels status`, `openclaw channels resolve`, et les flux de réparation
  doctor/config ne devraient pas avoir besoin de matérialiser les informations d'identification
  d'exécution juste pour décrire la configuration.

Comportement recommandé pour `inspectAccount(...)` :

- Retourner uniquement l'état descriptif du compte.
- Conservez `enabled` et `configured`.
- Incluez les champs de source/état des informations d'identification lorsque cela est pertinent, tels que :
  - `tokenSource`, `tokenStatus`
  - `botTokenSource`, `botTokenStatus`
  - `appTokenSource`, `appTokenStatus`
  - `signingSecretSource`, `signingSecretStatus`
- Il n'est pas nécessaire de renvoyer les valeurs brutes des jetons simplement pour signaler la disponibilité en lecture seule. Le renvoi de `tokenStatus: "available"` (et du champ source correspondant) suffit pour les commandes de type statut.
- Utilisez `configured_unavailable` lorsqu'un identifiant est configuré via SecretRef mais
  indisponible dans le chemin de commande actuel.

Cela permet aux commandes en lecture seule de signaler « configuré mais indisponible dans ce chemin de commande » au lieu de planter ou de signaler incorrectement que le compte n'est pas configuré.

## Paquets de packages

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

Chaque entrée devient un plugin. Si le pack liste plusieurs extensions, l'identifiant du plugin devient `name/<fileBase>`.

Si votre plugin importe des dépendances npm, installez-les dans ce répertoire afin que
`node_modules` soit disponible (`npm install` / `pnpm install`).

Garde-fou de sécurité : chaque entrée `openclaw.extensions` doit rester à l'intérieur du répertoire du plugin après la résolution des liens symboliques. Les entrées qui s'échappent du répertoire du package sont rejetées.

Note de sécurité : `openclaw plugins install` installe les dépendances des plugins avec `npm install --ignore-scripts` (pas de scripts de cycle de vie). Gardez les arbres de dépendances des plugins « pur JS/TS » et évitez les packages qui nécessitent des builds `postinstall`.

Optionnel : `openclaw.setupEntry` peut pointer vers un module léger dédié uniquement à la configuration.
Lorsque OpenClaw a besoin de surfaces de configuration pour un channel plugin désactivé, ou
lorsqu'un channel plugin est activé mais toujours non configuré, il charge `setupEntry`
à la place de l'entrée complète du plugin. Cela allège le démarrage et la configuration
lorsque votre entrée principale du plugin connecte également des outils, des hooks ou d'autres codes
d'exécution uniquement.

Optionnel : `openclaw.startup.deferConfiguredChannelFullLoadUntilAfterListen`
can opt a channel plugin into the same `setupEntry` path during the gateway's
pre-listen startup phase, even when the channel is already configured.

Utilisez ceci uniquement lorsque `setupEntry` couvre entièrement la surface de démarrage qui doit exister avant que la passerelle ne commence à écouter. En pratique, cela signifie que l'entrée de configuration doit enregistrer chaque capacité détenue par le canal dont le démarrage dépend, par exemple :

- l'enregistrement du channel lui-même
- toutes les routes HTTP qui doivent être disponibles avant que la passerule ne commence à écouter
- toutes les méthodes de passerelle, outils ou services qui doivent exister pendant cette même fenêtre

Si votre entrée complète possède toujours une capacité de démarrage requise, n'activez pas ce drapeau. Conservez le comportement par défaut du plugin et laissez OpenClaw charger l'entrée complète lors du démarrage.

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

Les plugins de canal peuvent publier des métadonnées de configuration/découverte via `openclaw.channel` et des indices d'installation via `openclaw.install`. Cela permet de garder le catalogue principal exempt de données.

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

OpenClaw peut également fusionner des **catalogues de canaux externes** (par exemple, un export de registre MPM). Déposez un fichier JSON à l'un des emplacements suivants :

- `~/.openclaw/mpm/plugins.json`
- `~/.openclaw/mpm/catalog.json`
- `~/.openclaw/plugins/catalog.json`

Ou pointez `OPENCLAW_PLUGIN_CATALOG_PATHS` (ou `OPENCLAW_MPM_CATALOG_PATHS`) vers
un ou plusieurs fichiers JSON (délimités par des virgules, des points-virgules ou des `PATH`). Chaque fichier doit
contenir `{ "entries": [ { "name": "@scope/pkg", "openclaw": { "channel": {...}, "install": {...} } } ] }`.

## Plugins de moteur de contexte

Les plugins de moteur de contexte sont responsables de l'orchestration du contexte de session pour l'ingestion, l'assemblage
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

Si votre moteur ne possède **pas** l'algorithme de compactage, conservez `compact()` implémenté et déléguez-le explicitement :

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
le système de plugins par une intervention privée. Ajoutez la capacité manquante.

Séquence recommandée :

1. définir le contrat central
   Décider des comportements partagés que le cœur doit posséder : stratégie, repli, fusion de configuration,
   cycle de vie, sémantique orientée channel, et forme de l'assistant d'exécution.
2. ajouter des surfaces d'inscription/d'exécution de plugins typées
   Étendre `OpenClawPluginApi` et/ou `api.runtime` avec la plus petite surface
   de capacité typée utile.
3. wire core + channel/feature consumers
   Channels and feature plugins should consume the new capability through core,
   not by importing a vendor implementation directly.
4. enregistrer les implémentations des vendeurs
   Les plugins de vendeurs enregistrent ensuite leurs backends pour la capacité.
5. ajouter une couverture de contrat
   Ajoutez des tests pour que la propriété et la structure d'inscription restent explicites au fil du temps.

C'est ainsi qu'OpenClaw reste opinionné sans devenir figé selon la vision du monde d'un seul provider. Consultez le [Capability Cookbook](/en/tools/capability-cookbook) pour une liste de fichiers concrète et un exemple détaillé.

### Liste de contrôle des fonctionnalités

Lorsque vous ajoutez une nouvelle capacité, l'implémentation doit généralement toucher ces surfaces ensemble :

- types de contrats principaux dans `src/<capability>/types.ts`
- assistant d'exécution/de runtime principal dans `src/<capability>/runtime.ts`
- surface d'enregistrement de l'API du plugin dans `src/plugins/types.ts`
- câblage du registre de plugins dans `src/plugins/registry.ts`
- exposition du runtime du plugin dans `src/plugins/runtime/*` lorsque les plugins de fonctionnalités/canaux
  doivent le consommer
- assistants de capture/test dans `src/test-utils/plugin-registration.ts`
- assertions de propriété/contrat dans `src/plugins/contracts/registry.ts`
- documentation opérateur/plugin dans `docs/`

Si l'une de ces surfaces est manquante, cela indique généralement que la fonctionnalité n'est pas encore entièrement intégrée.

### Modèle de fonctionnalité

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

Cela maintient la règle simple :

- le cœur possède le contrat de capacité + l'orchestration
- les plugins vendor possèdent des implémentations vendor
- feature/channel plugins consomment des assistants d'exécution
- les tests de contrat gardent la propriété explicite
