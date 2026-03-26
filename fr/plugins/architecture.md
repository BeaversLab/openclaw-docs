---
summary: "Internalisation de l'architecture de plugin : modèle de capacité, propriété, contrats, pipeline de chargement, assistants d'exécution"
read_when:
  - Building or debugging native OpenClaw plugins
  - Understanding the plugin capability model or ownership boundaries
  - Working on the plugin load pipeline or registry
  - Implementing provider runtime hooks or channel plugins
title: "Architecture de plugin"
---

# Architecture de plugin

Cette page couvre l'architecture interne du système de plugins OpenClaw. Pour la configuration, la découverte et la configuration orientées utilisateur, voir [Plugins](/fr/tools/plugin).

## Modèle de capacité publique

Les capacités constituent le modèle **de plugin natif** public au sein de OpenClaw. Chaque plugin natif OpenClaw s'inscrit auprès d'un ou plusieurs types de capacités :

| Capacité                 | Méthode d'inscription                         | Exemples de plugins       |
| ------------------------ | --------------------------------------------- | ------------------------- |
| Inférence de texte       | `api.registerProvider(...)`                   | `openai`, `anthropic`     |
| Synthèse vocale          | `api.registerSpeechProvider(...)`             | `elevenlabs`, `microsoft` |
| Compréhension des médias | `api.registerMediaUnderstandingProvider(...)` | `openai`, `google`        |
| Génération d'images      | `api.registerImageGenerationProvider(...)`    | `openai`, `google`        |
| Recherche Web            | `api.registerWebSearchProvider(...)`          | `google`                  |
| Canal / Messagerie       | `api.registerChannel(...)`                    | `msteams`, `matrix`       |

Un plugin qui n'enregistre aucune capacité mais fournit des hooks, des outils ou des services est un plugin **legacy hook-only**. Ce modèle reste entièrement pris en charge.

### Position sur la compatibilité externe

Le modèle de capacité est intégré dans le cœur et utilisé par les plugins groupés/natifs aujourd'hui, mais la compatibilité des plugins externes nécessite encore une barre plus stricte que « il est exporté, donc il est figé ».

Recommandations actuelles :

- **plugins externes existants :** maintenir le fonctionnement des intégrations basées sur des hooks ; traiter ceci comme la ligne de base de compatibilité
- **nouveaux plugins groupés/natifs :** préférer l'inscription explicite des capacités plutôt que les extensions spécifiques aux fournisseurs ou les nouveaux modèles basés uniquement sur des hooks
- **plugins externes adoptant l'inscription des capacités :** autorisé, mais considérer les surfaces d'assistant spécifiques aux capacités comme évolutives, sauf si la documentation marque explicitement un contrat comme stable

Règle pratique :

- les API d'enregistrement des capacités sont la direction prévue
- les hooks historiques restent le chemin le plus sûr sans rupture pour les plugins externes pendant la transition
- les sous-chemins d'assistance exportés ne sont pas tous égaux ; privilégiez le contrat documenté étroit, et non les exportations d'assistance incidentes

### Formes de plugins

OpenClaw classe chaque plugin chargé dans une forme basée sur son comportement d'enregistrement réel (et pas seulement les métadonnées statiques) :

- **plain-capability** -- enregistre exactement un type de capacité (par exemple un plugin provider-only comme `mistral`)
- **hybrid-capability** -- enregistre plusieurs types de capacités (par exemple `openai` possède l'inférence de texte, la parole, la compréhension des médias et la génération d'images)
- **hook-only** -- enregistre uniquement des hooks (typés ou personnalisés), aucune capacité, outil, commande ou service
- **non-capability** -- enregistre des outils, commandes, services ou routes mais aucune capacité

Utilisez `openclaw plugins inspect <id>` pour voir la forme d'un plugin et la répartition de ses capacités. Voir la [référence CLI](/fr/cli/plugins#inspect) pour plus de détails.

### Hooks historiques

Le hook `before_agent_start` reste pris en charge comme chemin de compatibilité pour les plugins hook-only. Les plugins réels hérités en dépendent toujours.

Direction :

- le garder fonctionnel
- le documenter comme hérité
- privilégier `before_model_resolve` pour le travail de remplacement de modèle/provider
- privilégier `before_prompt_build` pour le travail de mutation de prompt
- supprimer uniquement après la baisse de l'utilisation réelle et que la couverture des fixtures prouve la sécurité de la migration

### Signaux de compatibilité

Lorsque vous exécutez `openclaw doctor` ou `openclaw plugins inspect <id>`, vous pouvez voir l'une de ces étiquettes :

| Signal                     | Signification                                                                |
| -------------------------- | ---------------------------------------------------------------------------- |
| **config valid**           | La configuration s'analyse correctement et les plugins sont résolus          |
| **compatibility advisory** | Le plugin utilise un modèle pris en charge mais ancien (par ex. `hook-only`) |
| **legacy warning**         | Le plugin utilise `before_agent_start`, qui est obsolète                     |
| **hard error**             | La configuration n'est pas valide ou le plugin a échoué à se charger         |

Ni `hook-only` ni `before_agent_start` ne casseront votre plugin aujourd'hui --
`hook-only` est consultatif, et `before_agent_start` ne déclenche qu'un avertissement. Ces
signaux apparaissent également dans `openclaw status --all` et `openclaw plugins doctor`.

## Vue d'ensemble de l'architecture

Le système de plugins de OpenClaw comporte quatre couches :

1. **Manifeste + découverte**
   OpenClaw trouve les plugins candidats à partir des chemins configurés, des racines de l'espace de travail,
   des racines d'extension globales et des extensions groupées. La découverte lit les manifestes natifs
   `openclaw.plugin.json` ainsi que les manifestes de groupement pris en charge en premier.
2. **Activation + validation**
   Le cœur décide si un plugin découvert est activé, désactivé, bloqué ou
   sélectionné pour un emplacement exclusif tel que la mémoire.
3. **Chargement du runtime**
   Les plugins natifs OpenClaw sont chargés en processus via jiti et enregistrent
   les capacités dans un registre central. Les groupements compatibles sont normalisés en
   enregistrements de registre sans importer de code de runtime.
4. **Consommation de surface**
   Le reste de OpenClaw lit le registre pour exposer les outils, les canaux, la configuration du provider,
   les hooks, les routes HTTP, les commandes CLI et les services.

La limite de conception importante :

- la découverte + validation de la configuration doit fonctionner à partir des **métadonnées de manifeste/schéma**
  sans exécuter le code du plugin
- le comportement du runtime natif provient du chemin `register(api)` du module du plugin

Cette division permet à OpenClaw de valider la configuration, d'expliquer les plugins manquants/désactivés et de
construire des indices d'interface utilisateur/schéma avant que le runtime complet ne soit actif.

### Plugins de canal et l'outil de message partagé

Les plugins de canal n'ont pas besoin d'enregistrer un outil d'envoi/modification/réaction distinct pour
les actions de chat normales. OpenClaw conserve un outil `message` partagé dans le cœur, et
les plugins de canal possèdent la découverte et l'exécution spécifiques au canal derrière celui-ci.

La limite actuelle est :

- le cœur possède l'hôte de l'outil `message` partagé, le câblage des invites, la tenue de livre de
  session/thread, et la répartition de l'exécution
- les plugins de canal possèdent la découverte d'actions délimitées, la découverte de capacités et tous
  fragments de schéma spécifiques au canal
- les plugins de canal exécutent l'action finale via leur adaptateur d'action

Pour les plugins de channel, la surface du SDK est
`ChannelMessageActionAdapter.describeMessageTool(...)`. Cet appel de découverte unifié
permet à un plugin de renvoyer ses actions visibles, ses capacités et ses contributions de schéma
ensemble, afin que ces éléments ne divergent pas.

Core transmet la portée d'exécution à cette étape de découverte. Les champs importants incluent :

- `accountId`
- `currentChannelId`
- `currentThreadTs`
- `currentMessageId`
- `sessionKey`
- `sessionId`
- `agentId`
- inbound de confiance `requesterSenderId`

Cela est important pour les plugins sensibles au contexte. Un channel peut masquer ou exposer
des actions de message en fonction du compte actif, de la salle/fil/message actuel, ou
de l'identité du demandeur de confiance, sans coder en dur les branches spécifiques au channel dans
l'outil Core `message`.

C'est pourquoi les modifications de routage de l'exécuteur intégré restent un travail de plugin : l'exécuteur est
responsable de la transmission de l'identité de chat/session actuelle dans la limite de découverte du plugin
afin que l'outil partagé `message` expose la bonne surface
propriété du channel pour le tour actuel.

Pour les assistants d'exécution propriétaires du channel, les plugins groupés doivent conserver le runtime
d'exécution dans leurs propres modules d'extension. Core ne possède plus les runtimes d'action de message
Discord, Slack, Telegram ou WhatsApp sous `src/agents/tools`.
Nous ne publions pas de sous-chemins `plugin-sdk/*-action-runtime` séparés, et les plugins
groupés doivent importer leur propre code d'exécution local directement à partir de leurs
modules propriétaires de l'extension.

Pour les sondages spécifiquement, il existe deux chemins d'exécution :

- `outbound.sendPoll` est la base partagée pour les channels qui correspondent au model
  de sondage commun
- `actions.handleAction("poll")` est le chemin privilégié pour la sémantique
  de sondage spécifique au channel ou pour les paramètres de sondage supplémentaires

Core diffère désormais l'analyse des sondages partagés jusqu'à ce que l'envoi des sondages du plugin refuse
l'action, afin que les gestionnaires de sondage propriétaires du plugin puissent accepter les champs de sondage
spécifiques au channel sans être bloqués d'abord par l'analyseur de sondage générique.

Voir [Load pipeline](#load-pipeline) pour la séquence complète de démarrage.

## Modèle de propriété des capacités

OpenClaw traite un plugin natif comme la frontière de responsabilité d'une **entreprise** ou d'une **fonctionnalité**, et non comme un sac fourre-tout d'intégrations sans lien.

Cela signifie :

- un plugin d'entreprise devrait généralement posséder toutes les interfaces orientées OpenClaw de cette entreprise
- un plugin de fonctionnalité devrait généralement posséder l'ensemble de la surface de la fonctionnalité qu'il introduit
- les canaux doivent consommer les capacités principales partagées au lieu de réimplémenter le comportement du fournisseur ad hoc

Exemples :

- le plugin inclus `openai` possède le comportement du fournisseur de modèle OpenAI ainsi que les comportements de synthèse vocale + compréhension des médias + génération d'images OpenAI
- le plugin inclus `elevenlabs` possède le comportement de synthèse vocale ElevenLabs
- le plugin inclus `microsoft` possède le comportement de synthèse vocale Microsoft
- le plugin inclus `google` possède le comportement du fournisseur de modèle Google ainsi que les comportements de compréhension des médias + génération d'images + recherche web Google
- les plugins inclus `minimax`, `mistral`, `moonshot` et `zai` possèdent leurs backends de compréhension des médias
- le plugin `voice-call` est un plugin de fonctionnalité : il possède le transport des appels, les outils, le CLI, les routes et l'exécution, mais il consomme la capacité principale TTS/STT au lieu d'inventer une seconde pile vocale

L'état final visé est :

- OpenAI réside dans un seul plugin même s'il couvre les modèles textuels, la voix, les images et la future vidéo
- un autre fournisseur peut faire de même pour sa propre surface
- les canaux ne se soucient pas de quel plugin fournisseur possède le fournisseur ; ils consomment le contrat de capacité partagée exposé par le cœur

C'est là la distinction clé :

- **plugin** = frontière de responsabilité
- **capacité** = contrat principal que plusieurs plugins peuvent implémenter ou consommer

Ainsi, si OpenClaw ajoute un nouveau domaine tel que la vidéo, la première question n'est pas « quel fournisseur devrait coder en dur la gestion de la vidéo ? ». La première question est « quel est le contrat de capacité vidéo principal ? ». Une fois que ce contrat existe, les plugins fournisseur peuvent s'enregistrer dessus et les plugins de canal/fonctionnalité peuvent le consommer.

Si la capacité n'existe pas encore, la bonne démarche est généralement :

1. définir la capacité manquante dans le cœur
2. l'exposer via l'API/plugin d'exécution de manière typée
3. connecter les canaux/fonctionnalités à cette capacité
4. let vendor plugins register implementations

This keeps ownership explicit while avoiding core behavior that depends on a
single vendor or a one-off plugin-specific code path.

### Capability layering

Use this mental model when deciding where code belongs:

- **core capability layer**: shared orchestration, policy, fallback, config
  merge rules, delivery semantics, and typed contracts
- **vendor plugin layer**: vendor-specific APIs, auth, model catalogs, speech
  synthesis, image generation, future video backends, usage endpoints
- **channel/feature plugin layer**: Slack/Discord/voice-call/etc. integration
  that consumes core capabilities and presents them on a surface

For example, TTS follows this shape:

- core owns reply-time TTS policy, fallback order, prefs, and channel delivery
- `openai`, `elevenlabs`, and `microsoft` own synthesis implementations
- `voice-call` consumes the telephony TTS runtime helper

That same pattern should be preferred for future capabilities.

### Multi-capability company plugin example

A company plugin should feel cohesive from the outside. If OpenClaw has shared
contracts for models, speech, media understanding, and web search, a vendor can
own all of its surfaces in one place:

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

What matters is not the exact helper names. The shape matters:

- one plugin owns the vendor surface
- core still owns the capability contracts
- channels and feature plugins consume `api.runtime.*` helpers, not vendor code
- contract tests can assert that the plugin registered the capabilities it
  claims to own

### Capability example: video understanding

OpenClaw already treats image/audio/video understanding as one shared
capability. The same ownership model applies there:

1. core defines the media-understanding contract
2. vendor plugins register `describeImage`, `transcribeAudio`, and
   `describeVideo` as applicable
3. channels and feature plugins consume the shared core behavior instead of
   wiring directly to vendor code

That avoids baking one provider's video assumptions into core. The plugin owns
the vendor surface; core owns the capability contract and fallback behavior.

Si OpenClaw ajoute un nouveau domaine plus tard, tel que la génération vidéo, utilisez la même
séquence à nouveau : définissez d'abord la capacité principale, puis laissez les plugins de fournisseurs
enregistrer des implémentations pour celle-ci.

Besoin d'une liste de vérification concrète pour le déploiement ? Voir
[Capability Cookbook](/fr/tools/capability-cookbook).

## Contrats et application

La surface de l'API des plugins est intentionnellement typée et centralisée dans
`OpenClawPluginApi`. Ce contrat définit les points d'enregistrement pris en charge et
les aides d'exécution sur lesquelles un plugin peut s'appuyer.

Pourquoi c'est important :

- les auteurs de plugins disposent d'une norme interne stable unique
- le cœur peut rejeter la propriété en double telle que deux plugins enregistrant le même
  id de fournisseur
- le démarrage peut afficher des diagnostics exploitables pour les enregistrements malformés
- les tests de contrat peuvent appliquer la propriété du plugin groupé et éviter une dérive silencieuse

Il y a deux niveaux d'application :

1. **application de l'enregistrement à l'exécution**
   Le registre de plugins valide les enregistrements au fur et à mesure du chargement des plugins. Exemples :
   les id de fournisseur en double, les id de fournisseur de parole en double et les enregistrements
   malformés produisent des diagnostics de plugin au lieu d'un comportement indéfini.
2. **tests de contrat**
   Les plugins groupés sont capturés dans des registres de contrat lors des exécutions de tests afin que
   OpenClaw puisse affirmer explicitement la propriété. Actuellement, cela est utilisé pour les fournisseurs de
   modèles, les fournisseurs de parole, les fournisseurs de recherche Web et la propriété d'enregistrement groupée.

L'effet pratique est que OpenClaw sait, à l'avance, quel plugin possède quelle
surface. Cela permet au cœur et aux chaînes de se composer de manière transparente car la propriété est
déclarée, typée et testable plutôt qu'implicite.

### Ce qui appartient à un contrat

Les bons contrats de plugins sont :

- typés
- petits
- spécifiques à la capacité
- détenus par le cœur
- réutilisables par plusieurs plugins
- consommables par les chaînes/fonctionnalités sans connaissance du fournisseur

Les mauvais contrats de plugins sont :

- une stratégie spécifique au fournisseur cachée dans le cœur
- des échappatoires de plugin ponctuelles qui contournent le registre
- du code de chaîne accédant directement à une implémentation de fournisseur
- des objets d'exécution ad hoc qui ne font pas partie de `OpenClawPluginApi` ou
  `api.runtime`

En cas de doute, augmentez le niveau d'abstraction : définissez d'abord la capacité, puis
laissez les plugins s'y connecter.

## Modèle d'exécution

Les plugins natifs OpenClaw s'exécutent **dans le même processus** que la Gateway. Ils ne sont pas
sandboxés. Un plugin natif chargé a la même limite de confiance au niveau du processus que
le code principal.

Implications :

- un plugin natif peut enregistrer des outils, des gestionnaires réseau, des hooks et des services
- un bug dans un plugin natif peut planter ou déstabiliser la passerelle
- un plugin natif malveillant est équivalent à une exécution de code arbitraire à l'intérieur
  du processus OpenClaw

Les bundles compatibles sont plus sûrs par défaut car OpenClaw les traite actuellement
comme des packs de métadonnées/contenu. Dans les versions actuelles, cela signifie principalement des compétences
bundlées.

Utilisez des listes d'autorisation (allowlists) et des chemins d'installation/chargement explicites pour les plugins non inclus. Traitez
les plugins de l'espace de travail comme du code de développement, et non comme des valeurs par défaut de production.

Note importante sur la confiance :

- `plugins.allow` fait confiance aux **identifiants de plugin**, et non à la provenance de la source.
- Un plugin de l'espace de travail ayant le même identifiant qu'un plugin inclus masque intentionnellement
  la copie incluse lorsque ce plugin de l'espace de travail est activé/autorisé.
- Ceci est normal et utile pour le développement local, les tests de correctifs et les correctifs urgents.

## Limite d'exportation

OpenClaw exporte des capacités, et non des commodités d'implémentation.

Gardez l'enregistrement des capacités public. Supprimez les exportations d'assistants non contractuels :

- sous-chemins d'assistants spécifiques aux plugins inclus
- sous-chemins de plomberie (plumbing) d'exécution non destinés à être une API publique
- assistants de commodité spécifiques aux fournisseurs
- assistants de configuration/onboarding qui sont des détails d'implémentation

## Pipeline de chargement

Au démarrage, OpenClaw fait globalement ceci :

1. découvrir les racines candidates des plugins
2. lire les manifestes natifs ou de bundles compatibles et les métadonnées des packages
3. rejeter les candidats non sécurisés
4. normaliser la config du plugin (`plugins.enabled`, `allow`, `deny`, `entries`,
   `slots`, `load.paths`)
5. décider de l'activation pour chaque candidat
6. charger les modules natifs activés via jiti
7. appeler les hooks natifs `register(api)` et collecter les enregistrements dans le registre de plugins
8. exposer le registre aux surfaces de commandes/d'exécution

Les barrières de sécurité se produisent **avant** l'exécution. Les candidats sont bloqués
lorsque le point d'entrée s'échappe de la racine du plugin, que le chemin est accessible en écriture par tous, ou que la
propriété du chemin semble suspecte pour les plugins non inclus.

### Comportement basé sur le manifeste

Le manifeste est la source de vérité du plan de contrôle. OpenClaw l'utilise pour :

- identifier le plugin
- découvrir les canaux/compétences/schémas de configuration déclarés ou les capacités du bundle
- valider `plugins.entries.<id>.config`
- augmenter les libellés/espaces réservés de l'interface de contrôle
- afficher les métadonnées d'installation/de catalogue

Pour les plugins natifs, le module d'exécution est la partie du plan de données. Il enregistre
le comportement réel tel que les hooks, les outils, les commandes ou les flux du provider.

### Ce que le chargeur met en cache

OpenClaw conserve des caches en processus de courte durée pour :

- les résultats de la découverte
- les données du registre de manifestes
- les registres de plugins chargés

Ces caches réduisent la surcharge de démarrage en rafale et les commandes répétées. Il est sûr
de les considérer comme des caches de performance à courte durée de vie, et non comme de la persistance.

Note de performance :

- Définissez `OPENCLAW_DISABLE_PLUGIN_DISCOVERY_CACHE=1` ou
  `OPENCLAW_DISABLE_PLUGIN_MANIFEST_CACHE=1` pour désactiver ces caches.
- Ajustez les fenêtres de cache avec `OPENCLAW_PLUGIN_DISCOVERY_CACHE_MS` et
  `OPENCLAW_PLUGIN_MANIFEST_CACHE_MS`.

## Modèle de registre

Les plugins chargés ne modifient pas directement des variables globales du cœur aléatoires. Ils s'enregistrent dans un
registre central de plugins.

Le registre suit :

- les enregistrements de plugins (identité, source, origine, statut, diagnostics)
- les outils
- les hooks hérités et les hooks typés
- les canaux
- les providers
- les gestionnaires RPC de la passerelle
- les routes HTTP
- les enregistreurs CLI
- les services d'arrière-plan
- les commandes détenues par le plugin

Les fonctionnalités principales lisent ensuite à partir de ce registre au lieu de communiquer directement avec les modules de
plugins. Cela maintient le chargement unidirectionnel :

- module de plugin -> enregistrement dans le registre
- runtime du cœur -> consommation du registre

Cette séparation est importante pour la maintenabilité. Cela signifie que la plupart des surfaces principales n'ont
besoin que d'un seul point d'intégration : "lire le registre", et non "gérer chaque cas particulier pour chaque module
de plugin".

## Rappels de liaison de conversation

Les plugins qui lient une conversation peuvent réagir lorsqu'une approbation est résolue.

Utilisez `api.onConversationBindingResolved(...)` pour recevoir un rappel après qu'une demande de
liaison est approuvée ou refusée :

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
- `request` : le résumé de la demande originale, l'indicateur de détachement, l'identifiant de l'expéditeur et
  les métadonnées de la conversation

Ce rappel est uniquement à titre de notification. Il ne modifie pas qui est autorisé à lier une
conversation, et il s'exécute après la fin du traitement de l'approbation principale.

## Crochets d'exécution du fournisseur

Les plugins de fournisseur ont désormais deux couches :

- métadonnées du manifeste : `providerAuthEnvVars` pour une recherche d'auth par env peu coûteuse avant
  le chargement de l'exécution, plus `providerAuthChoices` pour des étiquettes d'intégration/choix d'auth peu coûteuses
  et les métadonnées des indicateurs CLI avant le chargement de l'exécution
- crochets au moment de la configuration : `catalog` / l'ancien `discovery`
- crochets d'exécution : `resolveDynamicModel`, `prepareDynamicModel`, `normalizeResolvedModel`, `capabilities`, `prepareExtraParams`, `wrapStreamFn`, `formatApiKey`, `refreshOAuth`, `buildAuthDoctorHint`, `isCacheTtlEligible`, `buildMissingAuthMessage`, `suppressBuiltInModel`, `augmentModelCatalog`, `isBinaryThinking`, `supportsXHighThinking`, `resolveDefaultThinkingLevel`, `isModernModelRef`, `prepareRuntimeAuth`, `resolveUsageAuth`, `fetchUsageSnapshot`

OpenClaw possède toujours la boucle d'agent générique, le basculement, le traitement des transcriptions et
la stratégie d'outil. Ces crochets sont la surface d'extension pour les comportements spécifiques au fournisseur sans
avoir besoin d'un transport d'inférence entièrement personnalisé.

Utilisez le manifeste `providerAuthEnvVars` lorsque le fournisseur dispose d'identifiants basés sur l'environnement
que les chemins d'auth génériques/état/choix de modèle devraient voir sans charger le plugin
runtime. Utilisez le manifeste `providerAuthChoices` lorsque les surfaces CLI d'intégration/choix d'auth
doivent connaître l'identifiant de choix, les étiquettes de groupe et le câblage d'auth simple
d'un seul indicateur du fournisseur sans charger le runtime du fournisseur. Gardez le `envVars` du runtime du fournisseur
pour les indications destinées aux opérateurs, telles que les étiquettes d'intégration ou les variables de configuration
client-id/client-secret OAuth.

### Ordre et utilisation des crochets

Pour les plugins de modèle/fournisseur, OpenClaw appelle les crochets dans cet ordre approximatif.
La colonne « Quand utiliser » est le guide de décision rapide.

| #   | Hook                             | Ce qu'il fait                                                                                                                                       | Quand l'utiliser                                                                                                                              |
| --- | -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `catalog`                        | Publier la configuration du provider dans `models.providers` lors de la génération `models.json`                                                    | Le provider possède un catalogue ou des URL de base par défaut                                                                                |
| --  | _(recherche de modèle intégrée)_ | OpenClaw essaie d'abord le chemin normal du registre/catalogue                                                                                      | _(pas un hook de plugin)_                                                                                                                     |
| 2   | `resolveDynamicModel`            | Repli synchrone pour les IDs de modèle détenus par le provider non encore présents dans le registre local                                           | Le provider accepte des IDs de modèle amont arbitraires                                                                                       |
| 3   | `prepareDynamicModel`            | Préchauffage asynchrone, puis `resolveDynamicModel` s'exécute à nouveau                                                                             | Le provider a besoin de métadonnées réseau avant de résoudre les IDs inconnus                                                                 |
| 4   | `normalizeResolvedModel`         | Réécriture finale avant que le runner intégré n'utilise le modèle résolu                                                                            | Le provider a besoin de réécritures de transport mais utilise toujours un transport central                                                   |
| 5   | `capabilities`                   | Métadonnées de transcription/outillage détenues par le provider utilisées par la logique centrale partagée                                          | Le provider a besoin de particularités de transcription/famille de providers                                                                  |
| 6   | `prepareExtraParams`             | Normalisation des paramètres de requête avant les wrappers génériques d'options de flux                                                             | Le provider a besoin de paramètres de requête par défaut ou d'un nettoyage des paramètres par provider                                        |
| 7   | `wrapStreamFn`                   | Wrapper de flux après l'application des wrappers génériques                                                                                         | Le provider a besoin de wrappers d'en-têtes/corps/compatibilité de modèle de requête sans transport personnalisé                              |
| 8   | `formatApiKey`                   | Formateur de profil d'auth : le profil stocké devient la chaîne `apiKey` d'exécution                                                                | Le provider stocke des métadonnées d'auth supplémentaires et a besoin d'une forme de jeton d'exécution personnalisée                          |
| 9   | `refreshOAuth`                   | Remplacement de rafraîchissement OAuth pour les points de terminaison de rafraîchissement personnalisés ou la politique d'échec de rafraîchissement | Le provider ne correspond pas aux rafraîchisseurs `pi-ai` partagés                                                                            |
| 10  | `buildAuthDoctorHint`            | Indice de réparation ajouté lorsque le rafraîchissement OAuth échoue                                                                                | Le provider a besoin de conseils de réparation d'auth détenus par le provider après un échec de rafraîchissement                              |
| 11  | `isCacheTtlEligible`             | Stratégie de cache de prompt pour les providers proxy/backhaul                                                                                      | Le provider a besoin d'une porte de TTL de cache spécifique au proxy                                                                          |
| 12  | `buildMissingAuthMessage`        | Remplacement du message générique de récupération d'auth manquante                                                                                  | Le provider a besoin d'un indice de récupération d'auth manquante spécifique au provider                                                      |
| 13  | `suppressBuiltInModel`           | Suppression du modèle amont obsolète plus indication d'erreur utilisateur facultative                                                               | Le provider doit masquer les lignes amont obsolètes ou les remplacer par une indication de fournisseur                                        |
| 14  | `augmentModelCatalog`            | Lignes de catalogue synthétiques/finales ajoutées après la découverte                                                                               | Le provider a besoin de lignes de rétrocompatibilité synthétiques dans `models list` et les sélecteurs                                        |
| 15  | `isBinaryThinking`               | Interrupteur de raisonnement activé/désactivé pour les providers à pensée binaire                                                                   | Le provider n'expose que la pensée binaire activée/désactivée                                                                                 |
| 16  | `supportsXHighThinking`          | Support du raisonnement `xhigh` pour les modèles sélectionnés                                                                                       | Le provider souhaite `xhigh` uniquement sur un sous-ensemble de modèles                                                                       |
| 17  | `resolveDefaultThinkingLevel`    | Niveau `/think` par défaut pour une famille de modèles spécifique                                                                                   | Le provider possède la stratégie `/think` par défaut pour une famille de modèles                                                              |
| 18  | `isModernModelRef`               | Correspondance de modèle moderne pour les filtres de profil en direct et la sélection smoke                                                         | Le provider possède la correspondance du modèle préféré en direct/smoke                                                                       |
| 19  | `prepareRuntimeAuth`             | Échanger une information d'identification configurée contre le jeton/clé de runtime réel juste avant l'inférence                                    | Le provider a besoin d'un échange de jetons ou d'une informations d'identification de courte durée pour la requête                            |
| 20  | `resolveUsageAuth`               | Résoudre les informations d'identification d'utilisation/facturation pour `/usage` et les surfaces d'état associées                                 | Le provider a besoin d'un analyseur de jetons d'utilisation/quota personnalisé ou d'une information d'identification d'utilisation différente |
| 21  | `fetchUsageSnapshot`             | Récupérer et normaliser les instantanés d'utilisation/quota spécifiques au provider une fois l'authentification résolue                             | Le provider a besoin d'un point de terminaison d'utilisation spécifique au provider ou d'un analyseur de payload                              |

Si le provider a besoin d'un protocole filaire entièrement personnalisé ou d'un exécuteur de requête personnalisé,
c'est une classe d'extension différente. Ces hooks sont pour le comportement du provider
qui s'exécute toujours sur la boucle d'inférence normale d'OpenClaw.

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
  avant de Claude 4.6, les indications de famille de provider, les conseils de réparation d'authentification,
  l'intégration du point de terminaison d'utilisation, l'éligibilité au cache de prompt et la stratégie
  de réflexion par défaut/adaptive de Claude.
- OpenAI utilise `resolveDynamicModel`, `normalizeResolvedModel` et
  `capabilities` ainsi que `buildMissingAuthMessage`, `suppressBuiltInModel`,
  `augmentModelCatalog`, `supportsXHighThinking` et `isModernModelRef`
  car il possède la compatibilité avant de GPT-5.4, la normalisation directe OpenAI
  `openai-completions` -> `openai-responses`, les indications d'authentification
  compatibles Codex, la suppression de Spark, les lignes de liste synthétiques OpenAI et la stratégie
  de réflexion / de modèle en direct de GPT-5.
- OpenRouter utilise `catalog` ainsi que `resolveDynamicModel` et
  `prepareDynamicModel` car le provider est en mode transparent (pass-through) et peut exposer de nouveaux
  identifiants de modèle avant les mises à jour du catalogue statique d'OpenClaw ; il utilise également
  `capabilities`, `wrapStreamFn` et `isCacheTtlEligible` pour garder
  les en-têtes de requête spécifiques au provider, les métadonnées de routage, les correctifs de raisonnement et la
  stratégie de cache de prompt en dehors du cœur.
- GitHub Copilot utilise `catalog`, `auth`, `resolveDynamicModel` et
  `capabilities` ainsi que `prepareRuntimeAuth` et `fetchUsageSnapshot` car il
  a besoin d'une connexion appareil possédée par le provider, d'un comportement de repli de modèle,
  des particularités des transcriptions Claude, d'un échange de jeton GitHub -> jeton Copilot et d'un point
  de terminaison d'utilisation possédé par le provider.
- OpenAI Codex utilise `catalog`, `resolveDynamicModel`,
  `normalizeResolvedModel`, `refreshOAuth` et `augmentModelCatalog` plus
  `prepareExtraParams`, `resolveUsageAuth` et `fetchUsageSnapshot` car il
  fonctionne toujours sur les transports OpenAI de base mais possède sa propre normalisation du transport/de l'URL de base,
  sa politique de repli de rafraîchissement OAuth, son choix de transport par défaut,
  ses lignes de catalogue Codex synthétiques et son intégration au point de terminaison d'utilisation ChatGPT.
- Google AI Studio et le CLI OAuth Gemini utilisent `resolveDynamicModel` et
  `isModernModelRef` car ils possèdent le repli de compatibilité avant Gemini 3.1 et la correspondance des modèles modernes ;
  le CLI OAuth Gemini utilise également `formatApiKey`,
  `resolveUsageAuth` et `fetchUsageSnapshot` pour le formatage des jetons, l'analyse des jetons
  et le câblage du point de terminaison de quota.
- Moonshot utilise `catalog` plus `wrapStreamFn` car il utilise toujours le transport partagé
  OpenAI mais a besoin d'une normalisation de la charge utile de réflexion propre au provider.
- Kilocode utilise `catalog`, `capabilities`, `wrapStreamFn` et
  `isCacheTtlEligible` car il a besoin d'en-têtes de requête propres au provider,
  d'une normalisation de la charge utile de raisonnement, d'indices de transcription Gemini et d'un contrôle de TTL du cache Anthropic.
- Z.AI utilise `resolveDynamicModel`, `prepareExtraParams`, `wrapStreamFn`,
  `isCacheTtlEligible`, `isBinaryThinking`, `isModernModelRef`,
  `resolveUsageAuth` et `fetchUsageSnapshot` car il possède le repli GLM-5,
  les valeurs par défaut `tool_stream`, l'UX de réflexion binaire, la correspondance des modèles modernes et à la fois
  l'authentification d'utilisation + la récupération des quotas.
- Mistral, OpenCode Zen et OpenCode Go utilisent `capabilities` uniquement pour garder
  les particularités de transcription/outillage hors du cœur.
- Les providers groupés catalogue uniquement tels que `byteplus`, `cloudflare-ai-gateway`,
  `huggingface`, `kimi-coding`, `modelstudio`, `nvidia`, `qianfan`,
  `synthetic`, `together`, `venice`, `vercel-ai-gateway`, et `volcengine` utilisent
  uniquement `catalog`.
- Le portail Qwen utilise `catalog`, `auth`, et `refreshOAuth`.
- MiniMax et Xiaomi utilisent `catalog` plus des hooks d'utilisation car leur comportement `/usage`
  est propriétaire du plugin bien que l'inférence s'exécute toujours via les transports partagés.

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
- Utilise la configuration `messages.tts` principale et la sélection du provider.
- Renvoie un tampon audio PCM + taux d'échantillonnage. Les plugins doivent rééchantillonner/encoder pour les providers.
- `listVoices` est optionnel par provider. Utilisez-le pour les sélecteurs de voix ou les flux de configuration propriétaires du vendeur.
- Les listes de voix peuvent inclure des métadonnées plus riches telles que les paramètres régionaux, le sexe et les balises de personnalité pour les sélecteurs conscients du provider.
- OpenAI et ElevenLabs prennent en charge la téléphonie aujourd'hui. Microsoft ne le fait pas.

Les plugins peuvent également enregistrer des providers de parole via `api.registerSpeechProvider(...)`.

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
- Utilisez les providers de parole pour le comportement de synthèse propriétaire du vendeur.
- L'entrée `edge` Microsoft héritée est normalisée vers l'identifiant de provider `microsoft`.
- Le modèle de propriété préféré est orienté entreprise : un plugin vendeur peut posséder
  les providers de texte, parole, image et futurs médias à mesure que OpenClaw ajoute ces
  contrats de capacité.

Pour la compréhension d'image/audio/vidéo, les plugins enregistrent un provider
de compréhension de média typé au lieu d'un sac clé/valeur générique :

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
- L'expansion additive doit rester typée : nouvelles méthodes optionnelles, nouveaux champs de résultat optionnels, nouvelles capacités optionnelles.
- Si OpenClaw ajoute une nouvelle capacité telle que la génération vidéo plus tard, définissez d'abord le contrat de capacité principal, puis laissez les plugins de fournisseurs s'y enregistrer.

Pour les assistants d'exécution de compréhension des médias, les plugins peuvent appeler :

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

Pour la transcription audio, les plugins peuvent utiliser soit l'exécution de compréhension des médias soit l'ancien alias STT :

```ts
const { text } = await api.runtime.mediaUnderstanding.transcribeAudioFile({
  filePath: "/tmp/inbound-audio.ogg",
  cfg: api.config,
  // Optional when MIME cannot be inferred reliably:
  mime: "audio/ogg",
});
```

Notes :

- `api.runtime.mediaUnderstanding.*` est la surface partagée préférée pour la compréhension image/audio/vidéo.
- Utilise la configuration audio principale de compréhension des médias (`tools.media.audio`) et l'ordre de repli du provider.
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

- `provider` et `model` sont des substitutions optionnelles par exécution, et non des modifications persistantes de session.
- OpenClaw n'honore ces champs de substitution que pour les appelants de confiance.
- Pour les exécutions de repli appartenant au plugin, les opérateurs doivent opter pour `plugins.entries.<id>.subagent.allowModelOverride: true`.
- Utilisez `plugins.entries.<id>.subagent.allowedModels` pour restreindre les plugins de confiance à des cibles `provider/model` canoniques spécifiques, ou `"*"` pour autoriser explicitement n'importe quelle cible.
- Les exécutions de sous-agent de plugins non approuvés fonctionnent toujours, mais les demandes de substitution sont rejetées au lieu de revenir silencieusement.

Pour la recherche Web, les plugins peuvent consommer l'assistant d'exécution partagé au lieu d'accéder au câblage de l'outil agent :

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

Les plugins peuvent également enregistrer des providers de recherche Web via `api.registerWebSearchProvider(...)`.

Notes :

- Conservez la sélection du provider, la résolution des informations d'identification et la sémantique des requêtes partagées dans le core.
- Utilisez les providers de recherche Web pour les transports de recherche spécifiques aux fournisseurs.
- `api.runtime.webSearch.*` est la surface partagée préférée pour les plugins de fonctionnalités/canaux qui ont besoin d'un comportement de recherche sans dépendre de l'enveloppe de l'outil agent.

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
- `auth` : obligatoire. Utilisez `"gateway"` pour exiger l'authentification normale de la passerelle, ou `"plugin"` pour l'authentification gérée par le plugin/la vérification des webhooks.
- `match` : facultatif. `"exact"` (par défaut) ou `"prefix"`.
- `replaceExisting` : facultatif. Permet au même plugin de remplacer son propre enregistrement de route existant.
- `handler` : renvoie `true` lorsque la route a traité la requête.

Notes :

- `api.registerHttpHandler(...)` est obsolète. Utilisez `api.registerHttpRoute(...)`.
- Les routes de plugin doivent déclarer `auth` explicitement.
- Les conflits exacts de `path + match` sont rejetés, sauf si `replaceExisting: true`, et un plugin ne peut pas remplacer la route d'un autre plugin.
- Les routes se chevauchant avec différents niveaux `auth` sont rejetées. Gardez les chaînes de rebond `exact`/`prefix` uniquement sur le même niveau d'authentification.

## Chemins d'importation du SDK de plugin

Utilisez les sous-chemins du SDK au lieu de l'importation monolithique `openclaw/plugin-sdk` lors de
la création de plugins :

- `openclaw/plugin-sdk/plugin-entry` pour les primitives d'enregistrement de plugins.
- `openclaw/plugin-sdk/core` pour le contrat générique partagé orienté plugin.
- Primitives de canal stables telles que `openclaw/plugin-sdk/channel-setup`,
  `openclaw/plugin-sdk/channel-pairing`,
  `openclaw/plugin-sdk/channel-reply-pipeline`,
  `openclaw/plugin-sdk/secret-input`, et
  `openclaw/plugin-sdk/webhook-ingress` pour le câblage partagé de configuration/authentification/réponse/webhook.
- Sous-chemins de domaine tels que `openclaw/plugin-sdk/channel-config-helpers`,
  `openclaw/plugin-sdk/channel-config-schema`,
  `openclaw/plugin-sdk/channel-policy`,
  `openclaw/plugin-sdk/channel-runtime`,
  `openclaw/plugin-sdk/config-runtime`,
  `openclaw/plugin-sdk/agent-runtime`,
  `openclaw/plugin-sdk/lazy-runtime`,
  `openclaw/plugin-sdk/reply-history`,
  `openclaw/plugin-sdk/routing`,
  `openclaw/plugin-sdk/runtime-store`, et
  `openclaw/plugin-sdk/directory-runtime` pour les assistants d'exécution/configuration partagés.
- Réduisez les sous-chemins channel-core tels que `openclaw/plugin-sdk/discord-core`,
  `openclaw/plugin-sdk/telegram-core`, et `openclaw/plugin-sdk/whatsapp-core`
  pour les primitives spécifiques au channel qui doivent rester plus petites que les
  barils complets des assistants de channel.
- Les internes des extensions groupées restent privés. Les plugins externes doivent utiliser uniquement
  les sous-chemins `openclaw/plugin-sdk/*`. Le code de test/le OpenClaw principal peut utiliser les points d'entrée
  publics du dépôt sous `extensions/<id>/index.js`, `api.js`, `runtime-api.js`,
  `setup-entry.js`, et des fichiers à portée étroite tels que `login-qr-api.js`. N'importez
  jamais `extensions/<id>/src/*` depuis le cœur ou depuis une autre extension.
- Répartition des points d'entrée du dépôt :
  `extensions/<id>/api.js` est le baril d'assistants/types,
  `extensions/<id>/runtime-api.js` est le baril d'exécution uniquement,
  `extensions/<id>/index.js` est le point d'entrée du plugin groupé,
  et `extensions/<id>/setup-entry.js` est le point d'entrée du plugin de configuration.
- `openclaw/plugin-sdk/telegram` pour les types de plugins de channel Telegram et les assistants partagés orientés channel. Les internes de l'implémentation Telegram intégrée restent privés pour l'extension groupée.
- `openclaw/plugin-sdk/discord` pour les types de plugins de channel Discord et les assistants partagés orientés channel. Les internes de l'implémentation Discord intégrée restent privés pour l'extension groupée.
- `openclaw/plugin-sdk/slack` pour les types de plugins de channel Slack et les assistants partagés orientés channel. Les internes de l'implémentation Slack intégrée restent privés pour l'extension groupée.
- `openclaw/plugin-sdk/imessage` pour les types de plugins de channel iMessage et les assistants partagés orientés channel. Les internes de l'implémentation iMessage intégrée restent privés pour l'extension groupée.
- `openclaw/plugin-sdk/whatsapp` pour les types de plugins de channel WhatsApp et les assistants partagés orientés channel. Les internes de l'implémentation WhatsApp intégrée restent privés pour l'extension groupée.
- `openclaw/plugin-sdk/bluebubbles` reste public car il porte une petite surface d'assistant
  ciblée qui est partagée intentionnellement.

Note de compatibilité :

- Évitez le baril racine `openclaw/plugin-sdk` pour le nouveau code.
- Privilégiez d'abord les primitives stables étroites. Les nouveaux sous-chemins setup/pairing/reply/secret-input/webhook constituent le contrat prévu pour les nouveaux travaux de plugins intégrés et externes.
- Les barils d'aides (helper barrels) spécifiques aux extensions intégrées ne sont pas stables par défaut. Si une aide n'est nécessaire que pour une extension intégrée, gardez-la derrière la jointure `api.js` ou `runtime-api.js` locale de l'extension au lieu de la promouvoir dans `openclaw/plugin-sdk/<extension>`.
- Les sous-chemins spécifiques aux capacités tels que `image-generation`, `media-understanding` et `speech` existent parce que les plugins intégrés/natifs les utilisent aujourd'hui. Leur présence ne signifie pas par elle-même que chaque aide exportée est un contrat externe gelé à long terme.

## Schémas d'outil de message

Les plugins doivent posséder les contributions de schéma `describeMessageTool(...)` spécifiques au channel. Gardez les champs spécifiques au fournisseur dans le plugin, et non dans le cœur partagé.

Pour les fragments de schéma portables partagés, réutilisez les aides génériques exportées via `openclaw/plugin-sdk/channel-runtime` :

- `createMessageToolButtonsSchema()` pour les charges utiles de style grille de boutons
- `createMessageToolCardSchema()` pour les charges utiles de cartes structurées

Si une forme de schéma n'a de sens que pour un seul fournisseur, définissez-la dans la source propre de ce plugin au lieu de la promouvoir dans le SDK partagé.

## Résolution de la cible du channel

Les plugins de channel doivent posséder la sémantique de cible spécifique au channel. Gardez l'hôte sortant partagé générique et utilisez la surface de l'adaptateur de messagerie pour les règles du fournisseur :

- `messaging.inferTargetChatType({ to })` décide si une cible normalisée doit être traitée comme `direct`, `group` ou `channel` avant la recherche dans l'annuaire.
- `messaging.targetResolver.looksLikeId(raw, normalized)` indique au cœur si une entrée doit passer directement à une résolution de type identifiant au lieu d'une recherche dans l'annuaire.
- `messaging.targetResolver.resolveTarget(...)` est le repli du plugin lorsque le cœur a besoin d'une résolution finale possédée par le fournisseur après normalisation ou après un échec de l'annuaire.
- `messaging.resolveOutboundSessionRoute(...)` est propriétaire de la construction de route de session spécifique au fournisseur une fois la cible résolue.

Répartition recommandée :

- Utilisez `inferTargetChatType` pour les décisions de catégorie qui doivent se produire avant la recherche de pairs/groupes.
- Utilisez `looksLikeId` pour les vérifications de « traiter ceci comme un id de cible explicite/natif ».
- Utilisez `resolveTarget` pour le repli de normalisation spécifique au provider, non pour
  une recherche large dans l'annuaire.
- Gardez les ids natifs du provider tels que les ids de chat, les ids de fil, les JIDs, les handles et les ids
  de salle à l'intérieur des valeurs `target` ou des paramètres spécifiques au provider, et non dans les champs génériques du SDK.

## Annuaires basés sur la configuration

Les plugins qui dérivent des entrées d'annuaire à partir de la configuration doivent garder cette logique dans le
plugin et réutiliser les assistants partagés depuis
`openclaw/plugin-sdk/directory-runtime`.

Utilisez ceci lorsqu'un channel a besoin de pairs/groupes basés sur la configuration, tels que :

- pairs DM pilotés par liste d'autorisation
- cartes de channel/groupe configurées
- replis d'annuaire statique limités au compte

Les assistants partagés dans `directory-runtime` ne gèrent que les opérations génériques :

- filtrage des requêtes
- application de la limite
- assistants de déduplication/normalisation
- construction de `ChannelDirectoryEntry[]`

L'inspection de compte spécifique au channel et la normalisation des ids doivent rester dans
l'implémentation du plugin.

## Catalogues de providers

Les plugins de provider peuvent définir des catalogues de modèles pour l'inférence avec
`registerProvider({ catalog: { run(...) { ... } } })`.

`catalog.run(...)` renvoie la même forme que OpenClaw écrit dans
`models.providers` :

- `{ provider }` pour une entrée de provider unique
- `{ providers }` pour plusieurs entrées de provider

Utilisez `catalog` lorsque le plugin possède des ids de modèle spécifiques au provider, des URL de base
par défaut, ou des métadonnées de modèle protégées par authentification.

`catalog.order` contrôle quand le catalogue d'un plugin fusionne par rapport aux providers
implicites intégrés de OpenClaw :

- `simple` : providers simples par clé API ou pilotés par env
- `profile` : providers qui apparaissent lorsque des profils d'auth existent
- `paired` : providers qui synthétisent plusieurs entrées de provider liées
- `late` : dernière passe, après les autres providers implicites

Les providers ultérieurs gagnent en cas de collision de clé, donc les plugins peuvent intentionnellement remplacer une
entrée de provider intégrée avec le même id de provider.

Compatibilité :

- `discovery` fonctionne toujours comme un alias hérité
- si `catalog` et `discovery` sont tous deux enregistrés, OpenClaw utilise `catalog`

## Inspection de channel en lecture seule

Si votre plugin enregistre un channel, privilégiez l'implémentation de
`plugin.config.inspectAccount(cfg, accountId)` ainsi que `resolveAccount(...)`.

Pourquoi :

- `resolveAccount(...)` est le chemin d'exécution (runtime). Il est autorisé à supposer que les identifiants
  sont entièrement matérialisés et peut échouer rapidement lorsque les secrets requis sont manquants.
- Les chemins de commande en lecture seule tels que `openclaw status`, `openclaw status --all`,
  `openclaw channels status`, `openclaw channels resolve`, et les flux de réparation
  doctor/config ne devraient pas avoir besoin de matérialiser les identifiants d'exécution juste pour
  décrire la configuration.

Comportement recommandé pour `inspectAccount(...)` :

- Ne retourner que l'état descriptif du compte.
- Préservez `enabled` et `configured`.
- Incluez les champs de source/état des identifiants lorsque cela est pertinent, tels que :
  - `tokenSource`, `tokenStatus`
  - `botTokenSource`, `botTokenStatus`
  - `appTokenSource`, `appTokenStatus`
  - `signingSecretSource`, `signingSecretStatus`
- Vous n'avez pas besoin de retourner les valeurs brutes des jetons juste pour signaler la disponibilité
  en lecture seule. Retourner `tokenStatus: "available"` (et le champ source
  correspondant) est suffisant pour les commandes de type statut.
- Utilisez `configured_unavailable` lorsqu'un identifiant est configuré via SecretRef mais
  indisponible dans le chemin de commande actuel.

Cela permet aux commandes en lecture seule de signaler "configuré mais indisponible dans ce chemin de commande"
au lieu de planter ou de rapporter incorrectement que le compte n'est pas configuré.

## Paquets de paquets (Package packs)

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

Chaque entrée devient un plugin. Si le pack liste plusieurs extensions, l'id du plugin
devient `name/<fileBase>`.

Si votre plugin importe des deps npm, installez-les dans ce répertoire afin que
`node_modules` soit disponible (`npm install` / `pnpm install`).

Garde-fou de sécurité : chaque entrée `openclaw.extensions` doit rester dans le répertoire du plugin après la résolution des liens symboliques. Les entrées qui s'échappent du répertoire du package sont rejetées.

Note de sécurité : `openclaw plugins install` installe les dépendances du plugin avec `npm install --ignore-scripts` (pas de scripts de cycle de vie). Gardez les arbres de dépendances des plugins « pur JS/TS » et évitez les packages qui nécessitent des builds `postinstall`.

Optionnel : `openclaw.setupEntry` peut pointer vers un module léger de configuration uniquement. Lorsque OpenClaw a besoin de surfaces de configuration pour un channel plugin désactivé, ou lorsqu'un channel plugin est activé mais toujours non configuré, il charge `setupEntry` à la place de l'entrée complète du plugin. Cela allège le démarrage et la configuration lorsque votre entrée principale de plugin connecte également des outils, des hooks ou d'autres codes uniquement d'exécution.

Optionnel : `openclaw.startup.deferConfiguredChannelFullLoadUntilAfterListen` permet à un channel plugin de choisir le même chemin `setupEntry` pendant la phase de pré-écoute (pre-listen) du démarrage de la passerelle, même lorsque le channel est déjà configuré.

N'utilisez ceci que lorsque `setupEntry` couvre entièrement la surface de démarrage qui doit exister avant que la passerelle ne commence à écouter. En pratique, cela signifie que l'entrée de configuration doit enregistrer chaque capacité détenue par le channel dont le démarrage dépend, telle que :

- l'enregistrement du channel lui-même
- toutes les routes HTTP qui doivent être disponibles avant que la passerelle ne commence à écouter
- toutes les méthodes, outils ou services de passerelle qui doivent exister pendant cette même fenêtre

Si votre entrée complète possède toujours une capacité de démarrage requise, n'activez pas ce drapeau. Conservez le comportement par défaut du plugin et laissez OpenClaw charger l'entrée complète pendant le démarrage.

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

Les channel plugins peuvent publier des métadonnées de configuration/découverte via `openclaw.channel` et des indices d'installation via `openclaw.install`. Cela maintient le catalogue principal exempt de données.

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

OpenClaw peut également fusionner des **catalogues de channels externes** (par exemple, un export de registre MPM). Déposez un fichier JSON à l'un des emplacements suivants :

- `~/.openclaw/mpm/plugins.json`
- `~/.openclaw/mpm/catalog.json`
- `~/.openclaw/plugins/catalog.json`

Ou pointez `OPENCLAW_PLUGIN_CATALOG_PATHS` (ou `OPENCLAW_MPM_CATALOG_PATHS`) vers
un ou plusieurs fichiers JSON (délimités par des virgules, des points-virgules ou des `PATH`). Chaque fichier doit
contenir `{ "entries": [ { "name": "@scope/pkg", "openclaw": { "channel": {...}, "install": {...} } } ] }`.

## Plugins de moteur de contexte

Les plugins de moteur de contexte gèrent l'orchestration du contexte de session pour l'ingestion, l'assemblage
et la compactage. Enregistrez-les depuis votre plugin avec
`api.registerContextEngine(id, factory)`, puis sélectionnez le moteur actif avec
`plugins.slots.contextEngine`.

Utilisez ceci lorsque votre plugin doit remplacer ou étendre le pipeline de contexte par défaut
plutôt que de simplement ajouter une recherche dans la mémoire ou des hooks.

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

Si votre moteur ne possède **pas** l'algorithme de compactage, conservez `compact()`
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
le système de plugin avec un accès privé. Ajoutez la capacité manquante.

Séquence recommandée :

1. définir le contrat principal
   Décidez du comportement partagé que le cœur doit posséder : stratégie, repli, fusion de configuration,
   cycle de vie, sémantique orientée channel, et forme de l'aide d'exécution.
2. ajouter des surfaces d'enregistrement/exécution de plugin typées
   Étendez `OpenClawPluginApi` et/ou `api.runtime` avec la plus petite surface de capacité typée
   utile.
3. connecter le cœur + les consommateurs channel/fonctionnalité
   Les channels et les plugins de fonctionnalité devraient consommer la nouvelle capacité via le cœur,
   et non en important directement une implémentation de fournisseur.
4. enregistrer les implémentations de fournisseurs
   Les plugins de fournisseurs enregistrent ensuite leurs backends par rapport à la capacité.
5. ajouter une couverture de contrat
   Ajoutez des tests pour que la propriété et la forme de l'enregistrement restent explicites dans le temps.

C'est ainsi que OpenClaw reste opinionné sans devenir codé en dur pour la vision du monde
d'un seul fournisseur. Consultez le [Capability Cookbook](/fr/tools/capability-cookbook)
pour une liste de fichiers concrète et un exemple travaillé.

### Liste de contrôle des capacités

Lorsque vous ajoutez une nouvelle capacité, l'implémentation doit généralement toucher ces surfaces
ensemble :

- types de contrat principal dans `src/<capability>/types.ts`
- aide exécuteur/runtime principal dans `src/<capability>/runtime.ts`
- surface d'enregistrement de API de plugin dans `src/plugins/types.ts`
- câblage du registre de plugins dans `src/plugins/registry.ts`
- exposition du runtime du plugin dans `src/plugins/runtime/*` lorsque les plugins de fonctionnalité/channel ont besoin de le consommer
- assistants de capture/test dans `src/test-utils/plugin-registration.ts`
- assertions de propriété/contrat dans `src/plugins/contracts/registry.ts`
- documentation opérateur/plugin dans `docs/`

Si l'une de ces surfaces est manquante, c'est généralement un signe que la capacité n'est pas encore entièrement intégrée.

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
- les plugins de fonctionnalité/channel consomment les assistants d'exécution
- les tests de contrat gardent la propriété explicite

import fr from "/components/footer/fr.mdx";

<fr />
