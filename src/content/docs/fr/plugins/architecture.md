---
summary: "Plugin internals: capability model, ownership, contracts, load pipeline, and runtime helpers"
read_when:
  - Building or debugging native OpenClaw plugins
  - Understanding the plugin capability model or ownership boundaries
  - Working on the plugin load pipeline or registry
  - Implementing provider runtime hooks or channel plugins
title: "Plugin Internals"
sidebarTitle: "Internals"
---

# Plugin Internals

<Info>
  This is the **deep architecture reference**. For practical guides, see: - [Install and use plugins](/en/tools/plugin) — user guide - [Getting Started](/en/plugins/building-plugins) — first plugin tutorial - [Channel Plugins](/en/plugins/sdk-channel-plugins) — build a messaging channel - [Provider Plugins](/en/plugins/sdk-provider-plugins) — build a model provider - [SDK
  Overview](/en/plugins/sdk-overview) — import map and registration API
</Info>

This page covers the internal architecture of the OpenClaw plugin system.

## Public capability model

Capabilities are the public **native plugin** model inside OpenClaw. Every
native OpenClaw plugin registers against one or more capability types:

| Capability             | Registration method                              | Example plugins                      |
| ---------------------- | ------------------------------------------------ | ------------------------------------ |
| Text inference         | `api.registerProvider(...)`                      | `openai`, `anthropic`                |
| CLI inference backend  | `api.registerCliBackend(...)`                    | `openai`, `anthropic`                |
| Speech                 | `api.registerSpeechProvider(...)`                | `elevenlabs`, `microsoft`            |
| Realtime transcription | `api.registerRealtimeTranscriptionProvider(...)` | `openai`                             |
| Realtime voice         | `api.registerRealtimeVoiceProvider(...)`         | `openai`                             |
| Media understanding    | `api.registerMediaUnderstandingProvider(...)`    | `openai`, `google`                   |
| Image generation       | `api.registerImageGenerationProvider(...)`       | `openai`, `google`, `fal`, `minimax` |
| Music generation       | `api.registerMusicGenerationProvider(...)`       | `google`, `minimax`                  |
| Video generation       | `api.registerVideoGenerationProvider(...)`       | `qwen`                               |
| Web fetch              | `api.registerWebFetchProvider(...)`              | `firecrawl`                          |
| Recherche Web          | `api.registerWebSearchProvider(...)`             | `google`                             |
| Canal / messagerie     | `api.registerChannel(...)`                       | `msteams`, `matrix`                  |

Un plugin qui n'enregistre aucune capacité mais fournit des hooks, des outils ou
services est un plugin **hook-only legacy**. Ce modèle reste entièrement pris en charge.

### Posture de compatibilité externe

Le modèle de capacité est intégré au cœur du système et utilisé aujourd'hui par les plugins
inclus/natifs, mais la compatibilité des plugins externes nécessite toujours une barre plus
stricte que "il est exporté, donc il est figé."

Recommandations actuelles :

- **plugins externes existants :** maintenir le fonctionnement des intégrations basées sur
  des hooks ; traiter cela comme la base de compatibilité
- **nouveaux plugins inclus/natifs :** préférer l'enregistrement explicite des capacités
  plutôt que les atteintes spécifiques aux fournisseurs ou les nouvelles conceptions hook-only
- **plugins externes adoptant l'enregistrement des capacités :** autorisé, mais considérer
  les surfaces d'assistance spécifiques aux capacités comme évolutives, sauf si la documentation
  marque explicitement un contrat comme stable

Règle pratique :

- les API d'enregistrement des capacités sont la direction prévue
- les hooks legacy restent le chemin le plus sûr sans rupture pour les plugins externes
  pendant la transition
- les sous-chemins d'assistance exportés ne sont pas tous égaux ; privilégier le contrat
  documenté étroit, pas les exportations d'assistance incidentes

### Formes de plugins

OpenClaw classe chaque plugin chargé dans une forme en fonction de son comportement
d'enregistrement réel (et pas seulement des métadonnées statiques) :

- **plain-capability** -- enregistre exactement un type de capacité (par exemple un
  plugin provider-only comme `mistral`)
- **hybrid-capability** -- enregistre plusieurs types de capacités (par exemple
  `openai` possède l'inférence de texte, la parole, la compréhension des médias
  et la génération d'images)
- **hook-only** -- n'enregistre que des hooks (typés ou personnalisés), aucune capacité,
  outil, commande ou service
- **non-capability** -- enregistre des outils, commandes, services ou routes mais aucune
  capacité

Utilisez `openclaw plugins inspect <id>` pour voir la forme d'un plugin et la répartition de ses
capacités. Voir la [référence CLI](/en/cli/plugins#inspect) pour plus de détails.

### Hooks legacy

Le hook `before_agent_start` reste pris en charge en tant que chemin de compatibilité pour les plugins basés uniquement sur des hooks. Les plugins existants dépendent encore de lui.

Direction :

- garder le fonctionnement
- documenter comme obsolète
- préférer `before_model_resolve` pour le travail de substitution de model/provider
- préférer `before_prompt_build` pour le travail de mutation de prompt
- supprimer uniquement après la baisse de l'utilisation réelle et que la couverture des fixtures prouve la sécurité de la migration

### Signaux de compatibilité

Lorsque vous exécutez `openclaw doctor` ou `openclaw plugins inspect <id>`, vous pouvez voir
l'une de ces étiquettes :

| Signal                           | Signification                                                            |
| -------------------------------- | ------------------------------------------------------------------------ |
| **config valide**                | La config est analysée correctement et les plugins sont résolus          |
| **avis de compatibilité**        | Le plugin utilise un modèle pris en charge mais ancien (ex. `hook-only`) |
| **avertissement d'obsolescence** | Le plugin utilise `before_agent_start`, qui est obsolète                 |
| **erreur critique**              | La config est invalide ou le plugin a échoué à charger                   |

Ni `hook-only` ni `before_agent_start` ne cassera votre plugin aujourd'hui --
`hook-only` est un avis, et `before_agent_start` ne déclenche qu'un avertissement. Ces
signaux apparaissent également dans `openclaw status --all` et `openclaw plugins doctor`.

## Aperçu de l'architecture

Le système de plugins d'OpenClaw possède quatre couches :

1. **Manifeste + découverte**
   OpenClaw trouve les plugins candidats à partir des chemins configurés, des racines de l'espace de travail,
   des racines d'extensions globales et des extensions groupées. La découverte lit les manifestes natifs
   `openclaw.plugin.json` ainsi que les manifestes groupés pris en charge en premier.
2. **Activation + validation**
   Le cœur décide si un plugin découvert est activé, désactivé, bloqué, ou
   sélectionné pour un emplacement exclusif tel que la mémoire.
3. **Chargement de l'exécution**
   Les plugins natifs OpenClaw sont chargés dans le processus via jiti et enregistrent
   les capacités dans un registre central. Les bundles compatibles sont normalisés en
   enregistrements de registre sans importer le code d'exécution.
4. **Consommation de surface**
   Le reste d'OpenClaw lit le registre pour exposer les outils, les canaux, la configuration du provider,
   les hooks, les routes HTTP, les commandes CLI et les services.

Pour le plugin CLI spécifiquement, la découverte des commandes racines est divisée en deux phases :

- les métadonnées au moment de l'analyse proviennent de `registerCli(..., { descriptors: [...] })`
- le vrai module de plugin CLI peut rester paresseux et s'enregistrer lors de la première invocation

Cela maintient le code CLI appartenant au plugin à l'intérieur du plugin tout en permettant à OpenClaw de réserver les noms de commandes racines avant l'analyse.

La limite de conception importante :

- la découverte + la validation de la configuration doivent fonctionner à partir des **métadonnées de manifeste/schéma** sans exécuter le code du plugin
- le comportement d'exécution natif provient du chemin `register(api)` du module du plugin

Cette division permet à OpenClaw de valider la configuration, d'expliquer les plugins manquants/désactivés et de construire des indices d'interface/schéma avant que l'exécution complète ne soit active.

### Plugins de canal et l'outil de message partagé

Les plugins de canal n'ont pas besoin d'enregistrer un outil d'envoi/modification/réaction distinct pour les actions de chat normales. OpenClaw conserve un outil `message` partagé dans le cœur, et les plugins de canal possèdent la découverte et l'exécution spécifiques au canal derrière celui-ci.

La limite actuelle est :

- le cœur possède l'hôte de l'outil `message` partagé, le câblage des invites, la tenue de livres de session/fil et la répartition de l'exécution
- les plugins de canal possèdent la découverte d'actions délimitées, la découverte de capacités et tous les fragments de schéma spécifiques au canal
- les plugins de canal possèdent la grammaire de conversation de session spécifique au fournisseur, telle que la manière dont les identifiants de conversation encodent les identifiants de fil ou héritent des conversations parentes
- les plugins de canal exécutent l'action finale via leur adaptateur d'action

Pour les plugins de canal, la surface du SDK est `ChannelMessageActionAdapter.describeMessageTool(...)`. Cet appel de découverte unifié permet à un plugin de renvoyer ses actions visibles, ses capacités et ses contributions de schéma ensemble afin que ces pièces ne se dispersent pas.

Lorsqu'un paramètre d'outil de message spécifique à un canal transporte une source média telle qu'un chemin local ou une URL média distante, le plugin doit également renvoyer `mediaSourceParams` à partir de `describeMessageTool(...)`. Le cœur utilise cette liste explicite pour appliquer la normalisation des chemins du bac à sable et les indices d'accès média sortant sans coder en dur les noms de paramètres appartenant au plugin. Préférez les cartes délimitées par action là-bas, pas une liste plate à l'échelle du canal, afin qu'un paramètre média uniquement pour le profil ne soit pas normalisé sur des actions non liées comme `send`.

Le cœur transmet la portée d'exécution à cette étape de découverte. Les champs importants incluent :

- `accountId`
- `currentChannelId`
- `currentThreadTs`
- `currentMessageId`
- `sessionKey`
- `sessionId`
- `agentId`
- `requesterSenderId` entrant de confiance

C'est important pour les plugins sensibles au contexte. Un channel peut masquer ou exposer des actions de message en fonction du compte actif, de la salle/discussion/message actuel, ou de l'identité du demandeur de confiance sans coder en dur les branches spécifiques au channel dans l'`message` central.

C'est pourquoi les modifications de routage de l'exécuteur intégré (embedded-runner) restent un travail de plugin : l'exécuteur est responsable de la transmission de l'identité de la conversation/session actuelle dans les limites de découverte du plugin, afin que l'`message` partagé expose la bonne surface appartenant au channel pour le tour actuel.

Pour les assistants d'exécution appartenant au channel, les plugins groupés doivent conserver le runtime d'exécution dans leurs propres modules d'extension. Le cœur ne possède plus les runtimes d'actions de message Discord, Slack, Telegram ou WhatsApp sous `src/agents/tools`. Nous ne publions pas de sous-chemins `plugin-sdk/*-action-runtime` séparés, et les plugins groupés doivent importer leur propre code d'exécution local directement à partir de leurs modules détenus par l'extension.

La même limite s'applique généralement aux coutures (seams) du SDK nommées par le provider : le cœur ne doit pas importer de barils de commodité spécifiques au channel pour Slack, Discord, Signal, WhatsApp ou des extensions similaires. Si le cœur a besoin d'un comportement, il doit soit consommer le propre `api.ts` / `runtime-api.ts` du plugin groupé, soit promouvoir le besoin en une capacité générique étroite dans le SDK partagé.

Pour les sondages (polls) spécifiquement, il y a deux chemins d'exécution :

- `outbound.sendPoll` est la base partagée pour les channels qui correspondent au modèle de sondage commun
- `actions.handleAction("poll")` est le chemin privilégié pour la sémantique de sondage spécifique au channel ou les paramètres de sondage supplémentaires

Le cœur diffère maintenant l'analyse de sondage partagée jusqu'à ce que l'expédition de sondage du plugin refuse l'action, afin que les gestionnaires de sondage appartenant au plugin puissent accepter des champs de sondage spécifiques au channel sans être bloqués d'abord par l'analyseur de sondage générique.

Voir [Pipeline de chargement](#load-pipeline) pour la séquence complète de démarrage.

## Modèle de propriété des capacités

OpenClaw traite un plugin natif comme la limite de propriété pour une **entreprise** ou une **fonctionnalité**, et non comme un sac fourre-tout d'intégrations sans rapport.

Cela signifie :

- un plugin d'entreprise devrait généralement posséder toutes les surfaces orientées OpenClaw de cette entreprise
- un plugin de fonctionnalité devrait généralement posséder l'ensemble de la surface de la fonctionnalité qu'il introduit
- les canaux devraient consommer les capacités centrales partagées au lieu de réimplémenter le comportement du fournisseur ad hoc

Exemples :

- le plugin inclus `openai` possède le comportement de fournisseur de modèle OpenAI et le comportement OpenAI speech + realtime-voice + media-understanding + image-generation
- le plugin inclus `elevenlabs` possède le comportement de parole ElevenLabs
- le plugin inclus `microsoft` possède le comportement de parole Microsoft
- le plugin inclus `google` possède le comportement de fournisseur de modèle Google ainsi que les comportements Google media-understanding + image-generation + web-search
- le plugin inclus `firecrawl` possède le comportement de récupération web Firecrawl
- les plugins inclus `minimax`, `mistral`, `moonshot` et `zai` possèdent leurs backends de compréhension de média
- le plugin inclus `qwen` possède le comportement de fournisseur de texte Qwen ainsi que les comportements media-understanding et video-generation
- le plugin `voice-call` est un plugin de fonctionnalité : il possède le transport d'appel, les outils, le CLI, les routes et le pont de flux média Twilio, mais il consomme les capacités partagées speech + realtime-transcription et realtime-voice au lieu d'importer directement les plugins des fournisseurs

L'état final prévu est le suivant :

- OpenAI réside dans un seul plugin même s'il couvre les modèles textuels, la parole, les images et la future vidéo
- un autre fournisseur peut faire de même pour sa propre zone de surface
- les canaux ne se soucient pas de quel plugin fournisseur possède le fournisseur ; ils consomment le contrat de capacité partagée exposé par le cœur

Voici la distinction clé :

- **plugin** = limite de propriété
- **capability** = contrat central que plusieurs plugins peuvent implémenter ou consommer

Ainsi, si OpenClaw ajoute un nouveau domaine tel que la vidéo, la première question n'est pas « quel fournisseur doit coder en dur la gestion de la vidéo ? ». La première question est « quel est le contrat de capacité vidéo central ? ». Une fois ce contrat établi, les plugins des fournisseurs peuvent s'y enregistrer et les plugins de canal/fonctionnalité peuvent le consommer.

Si la capacité n'existe pas encore, la bonne approche est généralement :

1. définir la capacité manquante dans le cœur
2. l'exposer via l'API de plugin / le runtime de manière typée
3. connecter les canaux/fonctionnalités à cette capacité
4. laisser les plugins de fournisseur enregistrer les implémentations

Cela garde la propriété explicite tout en évitant un comportement central qui dépend d'un
fournisseur unique ou d'un chemin de code spécifique à un plugin ponctuel.

### Superposition des capacités

Utilisez ce modèle mental pour décider où le code doit se trouver :

- **couche de capacité centrale** : orchestration partagée, stratégie, repli, règles de fusion
  de configuration, sémantique de livraison et contrats typés
- **couche de plugin fournisseur** : APIs spécifiques aux fournisseurs, authentification, catalogues de modèles,
  synthèse vocale, génération d'images, futurs backends vidéo, points de terminaison d'utilisation
- **couche de plugin de canal/fonctionnalité** : intégration Slack/Discord/appel vocal/etc.
  qui consomme les capacités centrales et les présente sur une surface

Par exemple, le TTS suit cette forme :

- le cœur possède la stratégie TTS de temps de réponse, l'ordre de repli, les préférences et la livraison par canal
- `openai`, `elevenlabs` et `microsoft` possèdent les implémentations de synthèse
- `voice-call` consomme l'assistant d'exécution TTS téléphonique

Ce même modèle devrait être privilégié pour les futures capacités.

### Exemple de plugin d'entreprise à capacités multiples

Un plugin d'entreprise doit paraître cohérent de l'extérieur. Si OpenClaw dispose de contrats
partagés pour les modèles, la parole, la transcription en temps réel, la voix en temps réel,
la compréhension des médias, la génération d'images, la génération vidéo, la récupération web et la recherche web,
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
- les canaux et les plugins de fonctionnalité consomment les assistants `api.runtime.*`, pas le code fournisseur
- les tests de contrat peuvent affirmer que le plugin a enregistré les capacités
  qu'il prétend posséder

### Exemple de capacité : compréhension vidéo

OpenClaw traite déjà la compréhension d'image/audio/vidéo comme une capacité
partagée. Le même modèle de propriété s'y applique :

1. le cœur définit le contrat de compréhension des médias
2. les plugins de fournisseur enregistrent `describeImage`, `transcribeAudio` et
   `describeVideo` selon le cas
3. les canaux et les plugins de fonctionnalités consomment le comportement central partagé au lieu de
   se connecter directement au code du fournisseur

Cela évite d'intégrer les hypothèses vidéo d'un fournisseur dans le cœur. Le plugin possède
la surface du fournisseur ; le cœur possède le contrat de capacité et le comportement de repli.

La génération vidéo utilise déjà cette même séquence : le cœur possède le contrat
de capacité typé et le helper d'exécution, et les plugins de fournisseur enregistrent
les implémentations `api.registerVideoGenerationProvider(...)` correspondantes.

Besoin d'une liste de vérification concrète pour le déploiement ? Voir
[Capability Cookbook](/en/tools/capability-cookbook).

## Contrats et application

La surface de l'API du plugin est intentionnellement typée et centralisée dans
`OpenClawPluginApi`. Ce contrat définit les points d'enregistrement pris en charge et
les helpers d'exécution sur lesquels un plugin peut s'appuyer.

Pourquoi c'est important :

- les auteurs de plugins disposent d'une norme interne stable
- le cœur peut rejeter la propriété en double, comme deux plugins enregistrant le même
  id de fournisseur
- le démarrage peut fournir des diagnostics exploitables pour les enregistrements malformés
- les tests de contrat peuvent appliquer la propriété des plugins groupés et empêcher la dérive silencieuse

Il existe deux niveaux d'application :

1. **application lors de l'enregistrement à l'exécution**
   Le registre de plugins valide les enregistrements lors du chargement des plugins. Exemples :
   les ids de fournisseur en double, les ids de fournisseur vocaux en double et les enregistrements
   malformés produisent des diagnostics de plugin au lieu d'un comportement indéfini.
2. **tests de contrat**
   Les plugins groupés sont capturés dans des registres de contrat lors des tests afin que
   OpenClaw puisse affirmer explicitement la propriété. Aujourd'hui, cela est utilisé pour les
   fournisseurs de modèles, les fournisseurs vocaux, les fournisseurs de recherche Web et la propriété
   des enregistrements groupés.

L'effet pratique est que OpenClaw sait, à l'avance, quel plugin possède quelle
surface. Cela permet au cœur et aux canaux de se composer de manière transparente car la propriété est
déclarée, typée et testable plutôt qu'implicite.

### Ce qui appartient à un contrat

Les bons contrats de plugins sont :

- typés
- petits
- spécifiques à la capacité
- détenus par le cœur
- réutilisables par plusieurs plugins
- consommables par les canaux/fonctionnalités sans connaissance du fournisseur

Les mauvais contrats de plugins sont :

- stratégies spécifiques au fournisseur cachées dans le cœur
- échappatoires ponctuelles pour plugins qui contournent le registre
- code de canal accédant directement à une implémentation de fournisseur
- des objets d'exécution ad hoc qui ne font pas partie de `OpenClawPluginApi` ou
  `api.runtime`

En cas de doute, augmentez le niveau d'abstraction : définissez d'abord la capacité, puis
laissez les plugins s'y connecter.

## Modèle d'exécution

Les plugins natifs OpenClaw s'exécutent **en cours de processus** avec le Gateway. Ils ne sont pas
sandboxed. Un plugin natif chargé a la même frontière de confiance au niveau du processus que
le code cœur.

Implications :

- un plugin natif peut enregistrer des outils, des gestionnaires réseau, des hooks et des services
- un bug dans un plugin natif peut planter ou déstabiliser la passerelle
- un plugin natif malveillant équivaut à une exécution de code arbitraire à l'intérieur
  du processus OpenClaw

Les bundles compatibles sont plus sûrs par défaut car OpenClaw les traite actuellement
comme des packs de métadonnées/contenu. Dans les versions actuelles, cela signifie principalement des compétences
bundlées.

Utilisez des listes d'autorisation et des chemins d'installation/chargement explicites pour les plugins non inclus. Traitez
les plugins de l'espace de travail comme du code de temps de développement, pas des valeurs par défaut de production.

Pour les noms de packages de l'espace de travail inclus, gardez l'identifiant du plugin ancré dans le nom
npm : `@openclaw/<id>` par défaut, ou un suffixe typé approuvé tel que
`-provider`, `-plugin`, `-speech`, `-sandbox` ou `-media-understanding` lorsque
le package expose intentionnellement un rôle de plugin plus étroit.

Note importante sur la confiance :

- `plugins.allow` fait confiance aux **identifiants de plugin**, pas à la provenance de la source.
- Un plugin de l'espace de travail avec le même identifiant qu'un plugin inclus masque intentionnellement
  la copie incluse lorsque ce plugin de l'espace de travail est activé/autorisé.
- Ceci est normal et utile pour le développement local, les tests de correctifs et les correctifs à chaud.

## Limite d'exportation

OpenClaw exporte des capacités, pas des commodités de mise en œuvre.

Gardez l'enregistrement des capacités public. Réduisez les exportations d'assistance non contractuelles :

- sous-chemins d'assistance spécifiques aux plugins inclus
- sous-chemins de plomberie d'exécution non destinés à être une API publique
- assistants de commodité spécifiques aux fournisseurs
- assistants de configuration/onboarding qui sont des détails de mise en œuvre

Certains sous-chemins d'assistance de plugin groupé (bundled-plugin) subsistent encore dans la carte d'export du SDK généré pour la compatibilité et la maintenance des plugins groupés. Les exemples actuels incluent `plugin-sdk/feishu`, `plugin-sdk/feishu-setup`, `plugin-sdk/zalo`, `plugin-sdk/zalo-setup` et plusieurs `plugin-sdk/matrix*` seams. Traitez-les comme des exportations de détails d'implémentation réservés, et non comme le modèle SDK recommandé pour les nouveaux plugins tiers.

## Pipeline de chargement

Au démarrage, OpenClaw fait à peu près ceci :

1. découvrir les racines candidates des plugins
2. lire les manifestes natifs ou compatibles des bundles et les métadonnées des packages
3. rejeter les candidats non sûrs
4. normaliser la configuration du plugin (`plugins.enabled`, `allow`, `deny`, `entries`,
   `slots`, `load.paths`)
5. décider de l'activation pour chaque candidat
6. charger les modules natifs activés via jiti
7. appeler les hooks natifs `register(api)` (ou `activate(api)` — un alias hérité) et collecter les enregistrements dans le registre de plugins
8. exposer le registre aux surfaces de commandes/runtime

<Note>`activate` est un alias hérité pour `register` — le chargeur résout celui qui est présent (`def.register ?? def.activate`) et l'appelle au même moment. Tous les plugins groupés utilisent `register` ; privilégiez `register` pour les nouveaux plugins.</Note>

Les barrières de sécurité se produisent **avant** l'exécution du runtime. Les candidats sont bloqués lorsque le point d'entrée échappe à la racine du plugin, que le chemin est accessible en écriture par tous, ou que la propriété du chemin semble suspecte pour les plugins non groupés.

### Comportement prioritaire au manifeste

Le manifeste est la source de vérité du plan de contrôle. OpenClaw l'utilise pour :

- identifier le plugin
- découvrir les canaux/compétences/schémas de configuration déclarés ou les capacités du bundle
- valider `plugins.entries.<id>.config`
- augmenter les étiquettes/espaces réservés de l'interface utilisateur de contrôle
- afficher les métadonnées d'installation/catalogue
- préserver les descripteurs d'activation et de configuration peu coûteux sans charger le runtime du plugin

Pour les plugins natifs, le module runtime est la partie du plan de données. Il enregistre le comportement réel tel que les hooks, les outils, les commandes ou les flux du provider.

Les blocs de manifeste facultatifs `activation` et `setup` restent sur le plan de contrôle.
Ce sont des descripteurs de métadonnées uniquement pour la planification de l'activation et la découverte de la configuration ;
ils ne remplacent pas l'enregistrement à l'exécution, `register(...)` ou `setupEntry`.
Les premiers consommateurs d'activation en direct utilisent désormais les indices de commande, de channel et de provider du manifeste
pour réduire le chargement des plugins avant la matérialisation plus large du registre :

- Le chargement CLI se limite aux plugins qui possèdent la commande principale demandée
- la configuration du channel/résolution du plugin se limite aux plugins qui possèdent l'identifiant
  channel demandé
- la configuration explicite du provider/résolution à l'exécution se limite aux plugins qui possèdent l'identifiant
  provider demandé

La découverte de la configuration privilégie désormais les identifiants possédés par le descripteur, tels que `setup.providers` et
`setup.cliBackends`, pour réduire les plugins candidats avant de revenir à
`setup-api` pour les plugins qui ont encore besoin de hooks d'exécution au moment de la configuration. Si plus d'un
plugin découvert réclame le même identifiant normalisé de provider de configuration ou de backend CLI,
la recherche de configuration refuse le propriétaire ambigu au lieu de s'appuyer sur l'ordre de découverte.

### Ce que le chargeur met en cache

OpenClaw conserve des caches en processus de courte durée pour :

- les résultats de la découverte
- les données du registre de manifeste
- les registres de plugins chargés

Ces caches réduisent les pics de démarrage et la charge des commandes répétées. Il est sûr de les considérer comme des caches de performance à court terme, et non comme de la persistance.

Note de performance :

- Définissez `OPENCLAW_DISABLE_PLUGIN_DISCOVERY_CACHE=1` ou
  `OPENCLAW_DISABLE_PLUGIN_MANIFEST_CACHE=1` pour désactiver ces caches.
- Ajustez les fenêtres de cache avec `OPENCLAW_PLUGIN_DISCOVERY_CACHE_MS` et
  `OPENCLAW_PLUGIN_MANIFEST_CACHE_MS`.

## Modèle de registre

Les plugins chargés ne modifient pas directement les globales centrales aléatoires. Ils s'inscrivent dans un registre central de plugins.

Le registre suit :

- les enregistrements de plugins (identité, source, origine, statut, diagnostics)
- les outils
- les hooks hérités et les hooks typés
- les channels
- les providers
- les gestionnaires RPC de la passerelle
- les routes HTTP
- les registraires CLI
- les services d'arrière-plan
- les commandes possédées par des plugins

Les fonctionnalités principales lisent ensuite ce registre au lieu de communiquer directement avec les modules de plugins.
Cela maintient le chargement à sens unique :

- module de plugin -> enregistrement dans le registre
- exécution principale -> consommation du registre

Cette séparation est importante pour la maintenabilité. Cela signifie que la plupart des surfaces centrales n'ont besoin que d'un seul point d'intégration : « lire le registre », et non « créer un cas particulier pour chaque module de plugin ».

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
- `request` : le résumé de la demande originale, l'indice de détachement, l'identifiant de l'expéditeur et
  les métadonnées de la conversation

Ce rappel est uniquement une notification. Il ne modifie pas qui est autorisé à lier une conversation, et il s'exécute après la fin du traitement de l'approbation centrale.

## Crochets d'exécution du fournisseur

Les plugins de fournisseur ont désormais deux couches :

- métadonnées de manifeste : `providerAuthEnvVars` pour une recherche rapide de l'auth d'environnement du fournisseur
  avant le chargement de l'exécution, `providerAuthAliases` pour les variantes de fournisseur qui partagent
  l'auth, `channelEnvVars` pour une recherche rapide de l'environnement/configuration du canal avant le chargement
  de l'exécution, plus `providerAuthChoices` pour des étiquettes rapides d'onboarding/choix d'auth et
  des métadonnées d'indicateur CLI avant le chargement de l'exécution
- crochets de configuration : `catalog` / ancien `discovery` plus `applyConfigDefaults`
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

OpenClaw possède toujours la boucle d'agent générique, le basculement (failover), la gestion des transcriptions et la politique de tool (tool policy). Ces hooks constituent la surface d'extension pour les comportements spécifiques au fournisseur sans avoir besoin d'un transport d'inférence entièrement personnalisé.

Utilisez le manifeste `providerAuthEnvVars` lorsque le provider dispose d'identifiants basés sur des variables d'environnement que les chemins génériques d'authentification/état/sélection de modèle doivent voir sans charger le runtime du plugin. Utilisez le manifeste `providerAuthAliases` lorsqu'un id de provider doit réutiliser les variables d'environnement, les profils d'authentification, l'authentification basée sur la configuration et le choix d'onboarding de clé API d'un autre id de provider. Utilisez le manifeste `providerAuthChoices` lorsque les surfaces CLI d'onboarding/choix d'authentification doivent connaître l'id de choix, les étiquettes de groupe et le câblage d'authentification simple à un indicateur du provider sans charger le runtime du provider. Gardez le runtime du provider `envVars` pour les indications destinées aux opérateurs, telles que les étiquettes d'onboarding ou les variables de configuration du client-id/secret-client OAuth.

Utilisez le manifeste `channelEnvVars` lorsqu'un canal dispose d'une authentification ou d'une configuration pilotée par l'environnement que le repli générique de l'environnement du shell, les vérifications de configuration/état ou les invites de configuration doivent voir sans charger le runtime du canal.

### Ordre et utilisation des hooks

Pour les plugins de modèle/provider, OpenClaw appelle les hooks dans cet ordre approximatif. La colonne "Quand l'utiliser" est le guide de décision rapide.

| #   | Hook                              | Ce qu'il fait                                                                                                                                                                          | Quand l'utiliser                                                                                                                                                                                                                             |
| --- | --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `catalog`                         | Publier la configuration du provider dans `models.providers` lors de la génération `models.json`                                                                                       | Le provider possède un catalogue ou des valeurs par défaut d'URL de base                                                                                                                                                                     |
| 2   | `applyConfigDefaults`             | Appliquer les valeurs par défaut de configuration globale détenues par le provider lors de la matérialisation de la configuration                                                      | Les valeurs par défaut dépendent du mode d'authentification, de l'environnement ou de la sémantique de la famille de modèles du provider                                                                                                     |
| --  | _(recherche de modèle intégré)_   | OpenClaw essaie d'abord le chemin normal du registre/catalogue                                                                                                                         | _(pas un hook de plugin)_                                                                                                                                                                                                                    |
| 3   | `normalizeModelId`                | Normaliser les alias d'id de modèle hérités ou de prévisualisation avant la recherche                                                                                                  | Le provider est responsable du nettoyage des alias avant la résolution du modèle canonique                                                                                                                                                   |
| 4   | `normalizeTransport`              | Normaliser `api` / `baseUrl` de la famille de providers avant l'assemblage du modèle générique                                                                                         | Le provider est responsable du nettoyage du transport pour les ids de providers personnalisés dans la même famille de transport                                                                                                              |
| 5   | `normalizeConfig`                 | Normaliser `models.providers.<id>` avant la résolution du runtime/provider                                                                                                             | Le fournisseur a besoin d'un nettoyage de la configuration qui devrait résider avec le plugin ; les assistants groupés de la famille Google servent également de filet de sécurité pour les entrées de configuration Google prises en charge |
| 6   | `applyNativeStreamingUsageCompat` | Appliquer les réécritures de compatibilité d'utilisation du streaming natif aux fournisseurs de configuration                                                                          | Le fournisseur a besoin de corrections de métadonnées d'utilisation du streaming natif pilotées par le point de terminaison                                                                                                                  |
| 7   | `resolveConfigApiKey`             | Résoudre l'authentification par marqueur d'environnement pour les fournisseurs de configuration avant le chargement de l'authentification à l'exécution                                | Le fournisseur possède une résolution de clé API par marqueur d'environnement ; `amazon-bedrock` dispose également d'un résolveur intégré pour les marqueurs d'environnement AWS ici                                                         |
| 8   | `resolveSyntheticAuth`            | Présenter l'authentification locale/auto-hébergée ou basée sur la configuration sans persister de texte en clair                                                                       | Le fournisseur peut fonctionner avec un marqueur d'identification synthétique/local                                                                                                                                                          |
| 9   | `resolveExternalAuthProfiles`     | Superposer les profils d'authentification externe appartenant au fournisseur ; le `persistence` par défaut est `runtime-only` pour les identifiants appartenant à la CLI/l'application | Le fournisseur réutilise les identifiants d'authentification externe sans persister les jetons d'actualisation copiés                                                                                                                        |
| 10  | `shouldDeferSyntheticProfileAuth` | Abaisser les espaces réservés de profil synthétique stockés derrière l'authentification basée sur l'environnement/la configuration                                                     | Le fournisseur stocke des profils espaces réservés synthétiques qui ne doivent pas prévaloir                                                                                                                                                 |
| 11  | `resolveDynamicModel`             | Synchronisation de repli pour les identifiants de modèle appartenant au fournisseur non encore présents dans le registre local                                                         | Le fournisseur accepte les identifiants de modèle en amont arbitraires                                                                                                                                                                       |
| 12  | `prepareDynamicModel`             | Préchauffage asynchrone, puis `resolveDynamicModel` s'exécute à nouveau                                                                                                                | Le fournisseur a besoin de métadonnées réseau avant de résoudre les identifiants inconnus                                                                                                                                                    |
| 13  | `normalizeResolvedModel`          | Réécriture finale avant que le runner intégré n'utilise le modèle résolu                                                                                                               | Le fournisseur a besoin de réécritures de transport mais utilise toujours un transport principal                                                                                                                                             |
| 14  | `contributeResolvedModelCompat`   | Fournir des indicateurs de compatibilité pour les modèles fournisseurs derrière un autre transport compatible                                                                          | Le fournisseur reconnaît ses propres modèles sur les transports de proxy sans prendre le contrôle du fournisseur                                                                                                                             |
| 15  | `capabilities`                    | Métadonnées de transcription/outillage appartenant au fournisseur utilisées par la logique principale partagée                                                                         | Le fournisseur a besoin de particularités de la transcription/de la famille de fournisseurs                                                                                                                                                  |
| 16  | `normalizeToolSchemas`            | Normaliser les schémas d'outils avant que le runner intégré ne les voie                                                                                                                | Le fournisseur a besoin d'un nettoyage des schémas de la famille de transport                                                                                                                                                                |
| 17  | `inspectToolSchemas`              | Fournir des diagnostics de schéma appartenant au fournisseur après normalisation                                                                                                       | Le fournisseur souhaite des avertissements de mots-clés sans enseigner de règles spécifiques au fournisseur au cœur du système                                                                                                               |
| 18  | `resolveReasoningOutputMode`      | Sélectionner le contrat de sortie de raisonnement natif ou balisé                                                                                                                      | Le fournisseur a besoin d'une sortie de raisonnement/finale balisée au lieu des champs natifs                                                                                                                                                |
| 19  | `prepareExtraParams`              | Normalisation des paramètres de requête avant les wrappers d'options de flux génériques                                                                                                | Le fournisseur a besoin de paramètres de requête par défaut ou d'un nettoyage de paramètres par fournisseur                                                                                                                                  |
| 20  | `createStreamFn`                  | Remplacer entièrement le chemin de flux normal par un transport personnalisé                                                                                                           | Le fournisseur a besoin d'un protocole filaire personnalisé, et pas seulement d'un wrapper                                                                                                                                                   |
| 21  | `wrapStreamFn`                    | Wrapper de flux après l'application des wrappers génériques                                                                                                                            | Le fournisseur a besoin de wrappers de compatibilité pour les en-têtes/corps de requête/model sans transport personnalisé                                                                                                                    |
| 22  | `resolveTransportTurnState`       | Attacher les en-têtes ou métadonnées de transport natifs par tour                                                                                                                      | Le fournisseur souhaite que les transports génériques envoient l'identité de tour native du fournisseur                                                                                                                                      |
| 23  | `resolveWebSocketSessionPolicy`   | Attacher les en-têtes WebSocket natifs ou la politique de refroidissement de session                                                                                                   | Le fournisseur souhaite que les transports WS génériques ajustent les en-têtes de session ou la politique de secours                                                                                                                         |
| 24  | `formatApiKey`                    | Formateur de profil d'authentification : le profil stocké devient la chaîne d'exécution `apiKey`                                                                                       | Le fournisseur stocke des métadonnées d'authentification supplémentaires et a besoin d'une forme de jeton d'exécution personnalisée                                                                                                          |
| 25  | `refreshOAuth`                    | Remplacement de rafraîchissement OAuth pour les points de terminaison de rafraîchissement personnalisés ou la politique d'échec de rafraîchissement                                    | Le fournisseur ne correspond pas aux rafraîchisseurs partagés `pi-ai`                                                                                                                                                                        |
| 26  | `buildAuthDoctorHint`             | Indication de réparation ajoutée lorsque le rafraîchissement OAuth échoue                                                                                                              | Le fournisseur a besoin de conseils de réparation d'authentification appartenant au fournisseur après un échec de rafraîchissement                                                                                                           |
| 27  | `matchesContextOverflowError`     | Correspondance de dépassement de fenêtre de contexte appartenant au fournisseur                                                                                                        | Le fournisseur a des erreurs brutes de dépassement que les heuristiques génériques manqueraient                                                                                                                                              |
| 28  | `classifyFailoverReason`          | Classification des raisons de basculement appartenant au fournisseur                                                                                                                   | Le fournisseur peut mapper les erreurs brutes API/transport vers limite de taux/surcharge/etc.                                                                                                                                               |
| 29  | `isCacheTtlEligible`              | Stratégie de cache de prompt pour les fournisseurs de proxy/backhaul                                                                                                                   | Le fournisseur a besoin d'une porte TTL de cache spécifique au proxy                                                                                                                                                                         |
| 30  | `buildMissingAuthMessage`         | Remplacement du message générique de récupération d'authentification manquante                                                                                                         | Le fournisseur a besoin d'une indication de récupération d'authentification manquante spécifique au fournisseur                                                                                                                              |
| 31  | `suppressBuiltInModel`            | Suppression du modèle amont obsolète plus indication d'erreur utilisateur facultative                                                                                                  | Le fournisseur doit masquer les lignes amont obsolètes ou les remplacer par une indication du fournisseur                                                                                                                                    |
| 32  | `augmentModelCatalog`             | Lignes de catalogue synthétiques/finales ajoutées après la découverte                                                                                                                  | Le fournisseur a besoin de lignes de compatibilité future synthétiques dans `models list` et les sélecteurs                                                                                                                                  |
| 33  | `isBinaryThinking`                | Bascule de raisonnement on/off pour les fournisseurs à pensée binaire                                                                                                                  | Le fournisseur expose uniquement la pensée binaire on/off                                                                                                                                                                                    |
| 34  | `supportsXHighThinking`           | Support du raisonnement `xhigh` pour les modèles sélectionnés                                                                                                                          | Le fournisseur veut `xhigh` uniquement sur un sous-ensemble de modèles                                                                                                                                                                       |
| 35  | `resolveDefaultThinkingLevel`     | Niveau `/think` par défaut pour une famille de modèles spécifique                                                                                                                      | Le fournisseur possède la stratégie `/think` par défaut pour une famille de modèles                                                                                                                                                          |
| 36  | `isModernModelRef`                | Correspondance de modèle moderne pour les filtres de profil en direct et la sélection smoke                                                                                            | Le fournisseur possède la correspondance de modèle préférée en direct/smoke                                                                                                                                                                  |
| 37  | `prepareRuntimeAuth`              | Échanger une information d'identification configurée contre le jeton/clé d'exécution réel juste avant l'inférence                                                                      | Le fournisseur a besoin d'un échange de jetons ou d'une information d'identification de requête à courte durée de vie                                                                                                                        |
| 38  | `resolveUsageAuth`                | Résoudre les informations d'identification d'utilisation/facturation pour `/usage` et les surfaces d'état associées                                                                    | Le fournisseur a besoin d'une analyse personnalisée de jetons d'utilisation/quota ou d'une information d'identification d'utilisation différente                                                                                             |
| 39  | `fetchUsageSnapshot`              | Récupérer et normaliser les instantanés d'utilisation/quota spécifiques au fournisseur une fois l'authentification résolue                                                             | Le fournisseur a besoin d'un point de terminaison d'utilisation spécifique au fournisseur ou d'un analyseur de payload                                                                                                                       |
| 40  | `createEmbeddingProvider`         | Créer un adaptateur d'intégration détenu par le fournisseur pour la mémoire/recherche                                                                                                  | Le comportement d'intégration de la mémoire appartient au plugin du fournisseur                                                                                                                                                              |
| 41  | `buildReplayPolicy`               | Renvoyer une stratégie de relecture contrôlant la gestion des transcriptions pour le fournisseur                                                                                       | Le fournisseur a besoin d'une stratégie de transcription personnalisée (par exemple, suppression des blocs de réflexion)                                                                                                                     |
| 42  | `sanitizeReplayHistory`           | Réécrire l'historique de relecture après le nettoyage générique de la transcription                                                                                                    | Le fournisseur a besoin de réécritures de relecture spécifiques au fournisseur au-delà des assistants de compactage partagés                                                                                                                 |
| 43  | `validateReplayTurns`             | Validation ou remodelage final du tour de relecture avant le lanceur intégré                                                                                                           | Le transport du fournisseur a besoin d'une validation plus stricte du tour après la désinfection générique                                                                                                                                   |
| 44  | `onModelSelected`                 | Exécuter les effets secondaires post-sélection appartenant au fournisseur                                                                                                              | Le fournisseur a besoin de télémétrie ou d'un état appartenant au fournisseur lorsqu'un modèle devient actif                                                                                                                                 |

`normalizeModelId`, `normalizeTransport`, et `normalizeConfig` vérifient d'abord le
plugin de fournisseur correspondant, puis passent aux autres plugins de fournisseur capables d'utiliser des hooks
jusqu'à ce que l'un d'eux modifie réellement l'identifiant du modèle ou le transport/config. Cela permet
de maintenir le fonctionnement des shims d'alias/compatibilité du fournisseur sans obliger l'appelant à savoir quel
plugin groupé possède la réécriture. Si aucun hook de fournisseur ne réécrit une entrée de configuration
de la famille Google prise en charge, le normaliseur de configuration Google groupé applique toujours
ce nettoyage de compatibilité.

Si le fournisseur a besoin d'un protocole filaire entièrement personnalisé ou d'un exécuteur de requêtes personnalisé,
c'est une classe différente d'extension. Ces hooks sont destinés au comportement du fournisseur
qui s'exécute toujours sur la boucle d'inférence normale de OpenClaw.

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
  et `wrapStreamFn` car il possède la compatibilité avant Claude 4.6,
  les indices de famille de fournisseur, les conseils de réparation d'authentification, l'intégration du point de terminaison d'utilisation,
  l'éligibilité du cache de prompt, les valeurs par défaut de configuration conscientes de l'authentification, la stratégie
  de réflexion par défaut/adaptative Claude, et le remodelage de flux spécifique à Anthropic pour
  les en-têtes bêta, `/fast` / `serviceTier`, et `context1m`.
- Les assistants de flux spécifiques à Claude d'Anthropic restent pour l'instant dans la propre jonction publique `api.ts` / `contract-api.ts` du plugin groupé. Cette surface de package exporte `wrapAnthropicProviderStream`, `resolveAnthropicBetas`, `resolveAnthropicFastMode`, `resolveAnthropicServiceTier`, et les constructeurs de wrapper Anthropic de niveau inférieur au lieu d'élargir le SDK générique autour des règles d'en-tête bêta d'un seul fournisseur.
- OpenAI utilise `resolveDynamicModel`, `normalizeResolvedModel` et `capabilities` ainsi que `buildMissingAuthMessage`, `suppressBuiltInModel`, `augmentModelCatalog`, `supportsXHighThinking` et `isModernModelRef` car il possède la compatibilité ascendante GPT-5.4, la normalisation directe OpenAI `openai-completions` -> `openai-responses`, les indices d'authentiation conscients de Codex, la suppression de Spark, les lignes de liste synthétiques OpenAI et la stratégie de réflexion / de modèle en direct GPT-5 ; la famille de flux `openai-responses-defaults` possède les wrappers de réponses natifs partagés OpenAI pour les en-têtes d'attribution, `/fast`/`serviceTier`, la verbosité du texte, la recherche web Codex native, le formatage de charge utile compatible avec le raisonnement et la gestion du contexte des réponses.
- OpenRouter utilise `catalog` ainsi que `resolveDynamicModel` et `prepareDynamicModel` car le fournisseur est un canal de transit et peut exposer de nouveaux identifiants de modèle avant les mises à jour du catalogue statique d'OpenClaw ; il utilise également `capabilities`, `wrapStreamFn` et `isCacheTtlEligible` pour garder les en-têtes de demande spécifiques au fournisseur, les métadonnées de routage, les correctifs de raisonnement et la stratégie de cache de demande en dehors du cœur. Sa stratégie de relecture provient de la famille `passthrough-gemini`, tandis que la famille de flux `openrouter-thinking` possède l'injection de raisonnement par proxy et les sauts de modèle non pris en charge / `auto`.
- GitHub Copilot utilise `catalog`, `auth`, `resolveDynamicModel` et
  `capabilities` ainsi que `prepareRuntimeAuth` et `fetchUsageSnapshot` car il
  nécessite une connexion appareil propriétaire du provider, un comportement de repli de model, les particularités des transcriptions Claude,
  un échange de jeton GitHub -> jeton Copilot et un point de terminisation d'utilisation propriétaire du provider.
- OpenAI Codex utilise `catalog`, `resolveDynamicModel`,
  `normalizeResolvedModel`, `refreshOAuth` et `augmentModelCatalog` ainsi que
  `prepareExtraParams`, `resolveUsageAuth` et `fetchUsageSnapshot` car il
  fonctionne toujours sur les transports principaux OpenAI mais possède sa propre normalisation du transport/de l'URL de base, sa politique de repli de rafraîchissement OAuth, son choix de transport par défaut,
  ses lignes de catalogue Codex synthétiques et son intégration du point de terminaison d'utilisation ChatGPT ; il
  partage la même famille de flux `openai-responses-defaults` que l'OpenAI direct.
- Le Google AI Studio et l'OAuth Gemini CLI utilisent `resolveDynamicModel`,
  `buildReplayPolicy`, `sanitizeReplayHistory`,
  `resolveReasoningOutputMode`, `wrapStreamFn` et `isModernModelRef` car la
  famille de replay `google-gemini` possède le repli de compatibilité avant Gemini 3.1,
  la validation native du replay Gemini, le nettoyage du replay d'amorçage, le mode
  de sortie de raisonnement balisé et la correspondance des modèles modernes, tandis que la
  famille de flux `google-thinking` possède la normalisation de la charge utile de réflexion Gemini ;
  l'OAuth Gemini CLI utilise également `formatApiKey`, `resolveUsageAuth` et
  `fetchUsageSnapshot` pour le formatage des jetons, l'analyse des jetons et le câblage du
  point de terminaison de quota.
- Anthropic Vertex utilise `buildReplayPolicy` via la
  famille de replay `anthropic-by-model` afin que le nettoyage du replay spécifique à Claude reste
  limité aux identifiants Claude plutôt qu'à chaque transport `anthropic-messages`.
- Amazon Bedrock utilise `buildReplayPolicy`, `matchesContextOverflowError`,
  `classifyFailoverReason` et `resolveDefaultThinkingLevel` car il possède
  la classification des erreurs de limitation (throttle), de non-préparation et de dépassement de contexte spécifique à Bedrock
  pour le trafic Anthropic-sur-Bedrock ; sa politique de relecture partage toujours la même
  garde `anthropic-by-model` réservée à Claude.
- OpenRouter, Kilocode, Opencode et Opencode Go utilisent `buildReplayPolicy`
  via la famille de relecture `passthrough-gemini` car ils font passer par proxy des modèles
  Gemini via des transports compatibles OpenAI et ont besoin d'un nettoyage des signatures de pensée
  sans validation de relecture native Gemini ni
  réécritures d'amorçage (bootstrap).
- MiniMax utilise `buildReplayPolicy` via la
  famille de relecture `hybrid-anthropic-openai` car un provider possède à la fois
  la sémantique de message Anthropic et la sémantique compatible OpenAI ; il conserve la suppression des blocs de pensée réservée à Claude
  du côté Anthropic tout en remplaçant le mode
  de sortie du raisonnement par le mode natif, et la famille de flux `minimax-fast-mode` possède
  les réécritures de modèle en mode rapide sur le chemin de flux partagé.
- Moonshot utilise `catalog` ainsi que `wrapStreamFn` car il utilise toujours le transport
  OpenAI partagé mais a besoin d'une normalisation de la charge utile de pensée appartenant au provider ; la
  famille de flux `moonshot-thinking` mappe la configuration plus l'état `/think` sur sa
  charge utile de pensée binaire native.
- Kilocode utilise `catalog`, `capabilities`, `wrapStreamFn` et
  `isCacheTtlEligible` car il a besoin d'en-têtes de requête appartenant au provider,
  d'une normalisation de la charge utile de raisonnement, d'indications de transcription Gemini et de contrôle du TTL de cache
  Anthropic ; la famille de flux `kilocode-thinking` conserve l'injection de pensée Kilo
  sur le chemin de flux proxy partagé tout en ignorant `kilo/auto` et
  d'autres ids de modèles proxy qui ne prennent pas en charge les charges utiles de raisonnement explicites.
- Z.AI utilise `resolveDynamicModel`, `prepareExtraParams`, `wrapStreamFn`,
  `isCacheTtlEligible`, `isBinaryThinking`, `isModernModelRef`,
  `resolveUsageAuth` et `fetchUsageSnapshot` car il possède le repli GLM-5,
  les valeurs par défaut `tool_stream`, l'UX de pensée binaire, la correspondance des modèles modernes, ainsi que
  l'authentification d'utilisation et la récupération des quotas ; la famille de flux `tool-stream-default-on`
  garde le wrapper `tool_stream` activé par défaut hors de la colle écrite à la main par fournisseur.
- xAI utilise `normalizeResolvedModel`, `normalizeTransport`,
  `contributeResolvedModelCompat`, `prepareExtraParams`, `wrapStreamFn`,
  `resolveSyntheticAuth`, `resolveDynamicModel` et `isModernModelRef`
  car il possède la normalisation native du transport xAI Responses, les réécritures d'alias mode rapide Grok,
  le `tool_stream` par défaut, le nettoyage strict des outils / des payloads de raisonnement,
  la réutilisation de l'authentification de repli pour les outils appartenant au plugin, la résolution de modèle Grok
  compatible avec l'avenir, et les correctifs de compatibilité appartenant au fournisseur tels que le profil de schéma d'outil xAI,
  les mots-clés de schéma non pris en charge, le `web_search` natif, et le décodage des arguments
  d'appel d'outil d'entités HTML.
- Mistral, OpenCode Zen et OpenCode Go n'utilisent `capabilities` que pour
  garder les particularités de transcription/d'outillage hors du cœur.
- Les fournisseurs groupés uniquement dans le catalogue tels que `byteplus`, `cloudflare-ai-gateway`,
  `huggingface`, `kimi-coding`, `nvidia`, `qianfan`,
  `synthetic`, `together`, `venice`, `vercel-ai-gateway` et `volcengine` utilisent
  uniquement `catalog`.
- Qwen utilise `catalog` pour son fournisseur de texte ainsi que les enregistrements partagés
  de compréhension des médias et de génération vidéo pour ses surfaces multimodales.
- MiniMax et Xiaomi utilisent `catalog` ainsi que des hooks d'utilisation car leur comportement `/usage` est propriétaire du plugin, bien que l'inférence s'exécute toujours via les transports partagés.

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

- `textToSpeech` renvoie la charge utile de sortie TTS principale normale pour les surfaces de fichier/note vocale.
- Utilise la configuration `messages.tts` principale et la sélection du fournisseur.
- Renvoie le tampon audio PCM + le taux d'échantillonnage. Les plugins doivent rééchantillonner/encoder pour les fournisseurs.
- `listVoices` est optionnel par fournisseur. Utilisez-le pour les sélecteurs de voix ou les flux de configuration propriétaires au fournisseur.
- Les listes de voix peuvent inclure des métadonnées plus riches telles que les paramètres régionaux, le genre et les étiquettes de personnalité pour les sélecteurs conscients du fournisseur.
- OpenAI et ElevenLabs prennent en charge la téléphonie aujourd'hui. Microsoft non.

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

- Garder la stratégie, le repli et la livraison de réponses TTS dans le cœur.
- Utiliser les fournisseurs de reconnaissance vocale pour le comportement de synthèse propriétaire au fournisseur.
- L'entrée `edge` Microsoft héritée est normalisée vers l'id de fournisseur `microsoft`.
- Le modèle de propriété privilégié est orienté entreprise : un plugin fournisseur peut posséder les fournisseurs de texte, de parole, d'image et de futurs médias, car OpenClaw ajoute ces contrats de capacité.

Pour la compréhension d'image/audio/vidéo, les plugins enregistrent un fournisseur de compréhension de média typé au lieu d'un sac générique clé/valeur :

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

- Garder l'orchestration, le repli, la configuration et le câblage de canal dans le cœur.
- Garder le comportement fournisseur dans le plugin fournisseur.
- L'expansion additive doit rester typée : nouvelles méthodes optionnelles, nouveaux champs de résultat optionnels, nouvelles capacités optionnelles.
- La génération vidéo suit déjà le même modèle :
  - le cœur possède le contrat de capacité et le helper d'exécution
  - les plugins fournisseur enregistrent `api.registerVideoGenerationProvider(...)`
  - les plugins de fonctionnalité/canal consomment `api.runtime.videoGeneration.*`

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

- `provider` et `model` sont des redéfinitions optionnelles par exécution, et non des modifications persistantes de session.
- OpenClaw ne respecte ces champs de redéfinition que pour les appelants de confiance.
- Pour les exécutions de repli appartenant au plugin, les opérateurs doivent opter pour `plugins.entries.<id>.subagent.allowModelOverride: true`.
- Utilisez `plugins.entries.<id>.subagent.allowedModels` pour restreindre les plugins de confiance à des cibles `provider/model` canoniques spécifiques, ou `"*"` pour autoriser explicitement n'importe quelle cible.
- Les exécutions de sous-agent de plugin non approuvés fonctionnent toujours, mais les demandes de redéfinition sont rejetées au lieu de passer silencieusement en repli.

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

- Conservez la sélection du provider, la résolution des informations d'identification et la sémantique des requêtes partagées dans le core.
- Utilisez les providers de recherche web pour les transports de recherche spécifiques aux fournisseurs.
- `api.runtime.webSearch.*` est la surface partagée préférée pour les plugins de fonctionnalité/canal qui ont besoin d'un comportement de recherche sans dépendre du wrapper de l'outil de l'agent.

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

- `path` : chemin de la route sous le serveur HTTP Gateway.
- `auth` : obligatoire. Utilisez `"gateway"` pour exiger l'authentification normale du Gateway, ou `"plugin"` pour l'authentification gérée par le plugin/la vérification du webhook.
- `match` : optionnel. `"exact"` (par défaut) ou `"prefix"`.
- `replaceExisting` : optionnel. Permet au même plugin de remplacer son propre enregistrement de route existant.
- `handler` : renvoyez `true` lorsque la route a traité la demande.

Notes :

- `api.registerHttpHandler(...)` a été supprimé et provoquera une erreur de chargement de plugin. Utilisez plutôt `api.registerHttpRoute(...)`.
- Les routes de plugin doivent déclarer `auth` explicitement.
- Les conflits exacts de `path + match` sont rejetés, sauf si `replaceExisting: true`, et un plugin ne peut pas remplacer la route d'un autre plugin.
- Les routes qui se chevauchent avec différents niveaux de `auth` sont rejetées. Gardez les chaînes de secours `exact`/`prefix` uniquement au même niveau d'authentification.
- Les routes `auth: "plugin"` ne reçoivent **pas** automatiquement les scopes d'exécution de l'opérateur. Elles sont destinées aux webhooks gérés par le plugin/vérification de signature, et non aux appels d'assistance privilégiés du Gateway.
- Les routes `auth: "gateway"` s'exécutent dans une scope d'exécution de demande du Gateway, mais cette scope est intentionnellement conservatrice :
  - l'authentification du porteur par secret partagé (`gateway.auth.mode = "token"` / `"password"`) maintient les scopes d'exécution des routes de plugin épinglés à `operator.write`, même si l'appelant envoie `x-openclaw-scopes`
  - les modes HTTP porteurs d'identité de confiance (par exemple `trusted-proxy` ou `gateway.auth.mode = "none"` sur une entrée privée) honorent `x-openclaw-scopes` uniquement lorsque l'en-tête est explicitement présent
  - si `x-openclaw-scopes` est absent sur ces demandes de route de plugin porteuses d'identité, la scope d'exécution revient à `operator.write`
- Règle pratique : ne supposez pas qu'une route de plugin d'authentification de passerelle (gateway-auth) est une surface d'administration implicite. Si votre route nécessite un comportement réservé aux administrateurs, exigez un mode d'authentification porteur d'identité et documentez le contrat d'en-tête explicite `x-openclaw-scopes`.

## Chemins d'import du SDK de plugin

Utilisez les sous-chemins du SDK au lieu de l'import monolithique `openclaw/plugin-sdk` lors de la rédaction de plugins :

- `openclaw/plugin-sdk/plugin-entry` pour les primitives d'enregistrement de plugins.
- `openclaw/plugin-sdk/core` pour le contrat générique partagé orienté plugin.
- `openclaw/plugin-sdk/config-schema` pour l'export du schéma Zod racine `openclaw.json` (`OpenClawSchema`).
- Primitives de canal stables telles que `openclaw/plugin-sdk/channel-setup`, `openclaw/plugin-sdk/setup-runtime`, `openclaw/plugin-sdk/setup-adapter-runtime`, `openclaw/plugin-sdk/setup-tools`, `openclaw/plugin-sdk/channel-pairing`, `openclaw/plugin-sdk/channel-contract`, `openclaw/plugin-sdk/channel-feedback`, `openclaw/plugin-sdk/channel-inbound`, `openclaw/plugin-sdk/channel-lifecycle`, `openclaw/plugin-sdk/channel-reply-pipeline`, `openclaw/plugin-sdk/command-auth`, `openclaw/plugin-sdk/secret-input` et `openclaw/plugin-sdk/webhook-ingress` pour le câblage partagé de configuration/authentification/réponse/webhook. `channel-inbound` est le foyer partagé pour le débounce, la correspondance de mentions, les assistants de stratégie de mention entrante, le formatage d'enveloppe et les assistants de contexte d'enveloppe entrante. `channel-setup` est la jointure de configuration étroite à installation facultative. `setup-runtime` est la surface de configuration sécurisée à l'exécution utilisée par `setupEntry` / le démarrage différé, y compris les adaptateurs de correctifs de configuration sécurisés pour l'importation. `setup-adapter-runtime` est la jointure d'adaptateur de configuration de compte consciente de l'environnement. `setup-tools` est la petite jointure d'assistance CLI/archive/docs (`formatCliCommand`, `detectBinary`, `extractArchive`, `resolveBrewExecutable`, `formatDocsLink`, `CONFIG_DIR`).
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
  `openclaw/plugin-sdk/runtime-store` et
  `openclaw/plugin-sdk/directory-runtime` pour les helpers d'exécution/configuration partagés.
  `telegram-command-config` est l'interface publique étroite pour la normalisation/validation des commandes personnalisées Telegram et reste disponible même si la surface de contrat Telegram groupée est temporairement indisponible.
  `text-runtime` est l'interface partagée pour le texte/markdown/journalisation, incluant le nettoyage du texte visible par l'assistant, les helpers de rendu/découpage markdown, les helpers de rédaction, les helpers de balises de directive et les utilitaires de texte sécurisé.
- Les interfaces spécifiques aux canaux d'approbation devraient préférer un contrat `approvalCapability` sur le plugin. Le lit noyau lit ensuite l'authentification, la livraison, le rendu, le routage natif et le comportement du gestionnaire natif paresseux via cette seule capacité, au lieu de mélanger le comportement d'approbation dans des champs de plugin non liés.
- `openclaw/plugin-sdk/channel-runtime` est obsolète et ne reste qu'en tant que shim de compatibilité pour les anciens plugins. Le nouveau code devrait plutôt importer les primitives génériques plus étroites, et le code du repo ne devrait pas ajouter de nouveaux importations du shim.
- Les internes des extensions groupées restent privés. Les plugins externes ne doivent utiliser que les sous-chemins `openclaw/plugin-sdk/*`. Le code de test/noyau OpenClaw peut utiliser les points d'entrée publics du repo sous une racine de package de plugin telle que `index.js`, `api.js`,
  `runtime-api.js`, `setup-entry.js`, et des fichiers à portée étroite tels que
  `login-qr-api.js`. N'importez jamais `src/*` d'un package de plugin depuis le noyau ou depuis
  une autre extension.
- Répartition du point d'entrée du dépôt :
  `<plugin-package-root>/api.js` est le module d'aide/types,
  `<plugin-package-root>/runtime-api.js` est le module exclusif au runtime,
  `<plugin-package-root>/index.js` est le point d'entrée du plugin groupé,
  et `<plugin-package-root>/setup-entry.js` est le point d'entrée du plugin de configuration.
- Exemples actuels de providers groupés :
  - Anthropic utilise `api.js` / `contract-api.js` pour les aides de flux Claude telles
    que `wrapAnthropicProviderStream`, les aides d'en-tête bêta, et l'analyse `service_tier`.
  - OpenAI utilise `api.js` pour les constructeurs de provider, les aides de modèle par défaut, et
    les constructeurs de provider en temps réel.
  - OpenRouter utilise `api.js` pour son constructeur de provider ainsi que les aides d'intégration/
    configuration, tandis que `register.runtime.js` peut toujours réexporter des aides génériques
    `plugin-sdk/provider-stream` pour une utilisation locale dans le dépôt.
- Les points d'entrée publics chargés par la façade préfèrent l'instantané actif de la configuration d'exécution
  lorsqu'il existe, puis reviennent au fichier de configuration résolu sur le disque lorsque
  OpenClaw ne sert pas encore d'instantané d'exécution.
- Les primitives partagées génériques restent le contrat public du SDK privilégié. Un petit ensemble
  réservé de compatibilité de points d'assise d'aides marqués channel groupés existe
  toujours. Considérez-les comme des points d'assise de maintenance/de compatibilité groupés, et non comme de nouvelles
  cibles d'importation tierces ; les nouveaux contrats inter-canal doivent toujours atterrir sur
  les sous-chemins génériques `plugin-sdk/*` ou les modules `api.js` /
  `runtime-api.js` locaux au plugin.

Note de compatibilité :

- Évitez le module racine `openclaw/plugin-sdk` pour le nouveau code.
- Privilégiez d'abord les primitives stables étroites. Les nouveaux sous-chemins setup/pairing/reply/
  feedback/contract/inbound/threading/command/secret-input/webhook/infra/
  allowlist/status/message-tool constituent le contrat prévu pour les nouveaux
  travaux de plugins groupés et externes.
  L'analyse/correspondance des cibles appartient à `openclaw/plugin-sdk/channel-targets`.
  Les portes d'action de message et les aides d'ID de message de réaction appartiennent à
  `openclaw/plugin-sdk/channel-actions`.
- Les barils d'assistants spécifiques aux extensions groupées ne sont pas stables par défaut. Si un assistant n'est nécessaire que pour une extension groupée, gardez-le derrière la jointure `api.js` ou `runtime-api.js` locale de l'extension au lieu de le promouvoir dans `openclaw/plugin-sdk/<extension>`.
- Les nouvelles jointures d'assistants partagés doivent être génériques, et non marquées par un channel. L'analyse de cible partagée appartient à `openclaw/plugin-sdk/channel-targets` ; les éléments internes spécifiques au channel restent derrière la jointure locale `api.js` ou `runtime-api.js` du plugin propriétaire.
- Les sous-chemins spécifiques aux capacités tels que `image-generation`, `media-understanding` et `speech` existent parce que les plugins groupés/natifs les utilisent aujourd'hui. Leur présence ne signifie pas par elle-même que chaque assistant exporté est un contrat externe figé à long terme.

## Schémas d'outils de message

Les plugins doivent posséder les contributions de schéma `describeMessageTool(...)` spécifiques au channel. Gardez les champs spécifiques au provider dans le plugin, et non dans le cœur partagé.

Pour les fragments de schéma portables partagés, réutilisez les assistants génériques exportés via `openclaw/plugin-sdk/channel-actions` :

- `createMessageToolButtonsSchema()` pour les charges utiles de style grille de boutons
- `createMessageToolCardSchema()` pour les charges utiles de cartes structurées

Si une forme de schéma n'a de sens que pour un seul provider, définissez-la dans la source propre de ce plugin au lieu de la promouvoir dans le SDK partagé.

## Résolution de cible de channel

Les plugins de channel doivent posséder la sémantique de cible spécifique au channel. Gardez l'hôte sortant partagé générique et utilisez la surface de l'adaptateur de messagerie pour les règles du provider :

- `messaging.inferTargetChatType({ to })` décide si une cible normalisée doit être traitée comme `direct`, `group` ou `channel` avant la recherche dans l'annuaire.
- `messaging.targetResolver.looksLikeId(raw, normalized)` indique au cœur si une entrée doit passer directement à une résolution de type id au lieu d'une recherche dans l'annuaire.
- `messaging.targetResolver.resolveTarget(...)` est le repli du plugin lorsque le cœur a besoin d'une résolution finale appartenant au provider après normalisation ou après un échec de l'annuaire.
- `messaging.resolveOutboundSessionRoute(...)` possède la construction de route de session spécifique au provider une fois la cible résolue.

Répartition recommandée :

- Utilisez `inferTargetChatType` pour les décisions de catégorie qui doivent se produire avant
  la recherche de pairs/groupes.
- Utilisez `looksLikeId` pour les vérifications de type « traiter ceci comme un ID cible explicite/natif ».
- Utilisez `resolveTarget` pour la repli de normalisation spécifique au provider, et non pour
  une recherche large dans l'annuaire.
- Conservez les IDs natifs du provider tels que les IDs de chat, les IDs de fil, les JIDs, les handles et les IDs
  de salle dans les valeurs `target` ou les paramètres spécifiques au provider, et non dans les champs génériques du SDK.

## Annaires basés sur la configuration

Les plugins qui dérivent des entrées d'annuaire à partir de la configuration doivent conserver cette logique dans le
plugin et réutiliser les assistants partagés de
`openclaw/plugin-sdk/directory-runtime`.

Utilisez ceci lorsqu'un canal a besoin de pairs/groupes basés sur la configuration, tels que :

- pairs DM pilotés par liste blanche
- cartes de canal/groupe configurées
- replis d'annuaire statique limités au compte

Les assistants partagés dans `directory-runtime` ne gèrent que les opérations génériques :

- filtrage des requêtes
- application de la limite
- assistants de déduplication/normalisation
- construction de `ChannelDirectoryEntry[]`

L'inspection de compte spécifique au canal et la normalisation des IDs doivent rester dans l'
implémentation du plugin.

## Catalogues de providers

Les plugins de provider peuvent définir des catalogues de modèles pour l'inférence avec
`registerProvider({ catalog: { run(...) { ... } } })`.

`catalog.run(...)` renvoie la même forme que OpenClaw écrit dans
`models.providers` :

- `{ provider }` pour une entrée de provider
- `{ providers }` pour plusieurs entrées de provider

Utilisez `catalog` lorsque le plugin possède des IDs de modèle spécifiques au provider, des URL de base par défaut,
ou des métadonnées de modèle protégées par authentification.

`catalog.order` contrôle quand le catalogue d'un plugin fusionne par rapport aux providers implicites intégrés de OpenClaw :

- `simple` : providers simples avec clé API ou pilotés par env
- `profile` : providers qui apparaissent lorsque des profils d'authentification existent
- `paired` : providers qui synthétisent plusieurs entrées de provider connexes
- `late` : dernière passe, après les autres providers implicites

Les providers ultérieurs gagnent en cas de collision de clé, donc les plugins peuvent intentionnellement remplacer une
entrée de provider intégrée avec le même ID de provider.

Compatibilité :

- `discovery` fonctionne toujours comme un alias hérité
- si `catalog` et `discovery` sont tous deux enregistrés, OpenClaw utilise `catalog`

## Inspection en lecture seule du channel

Si votre plugin enregistre un channel, il est préférable d'implémenter
`plugin.config.inspectAccount(cfg, accountId)` en plus de `resolveAccount(...)`.

Pourquoi :

- `resolveAccount(...)` est le chemin d'exécution. Il est supposé que les informations d'identification
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
  en lecture seule. Renvoyer `tokenStatus: "available"` (et le champ source correspondant)
  suffit pour les commandes de type statut.
- Utilisez `configured_unavailable` lorsqu'une information d'identification est configurée via SecretRef mais
  indisponible dans le chemin de commande actuel.

Cela permet aux commandes en lecture seule de signaler « configuré mais indisponible dans ce chemin de
commande » au lieu de planter ou de signaler incorrectement que le compte n'est pas configuré.

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

Chaque entrée devient un plugin. Si le pack répertorie plusieurs extensions, l'identifiant du plugin
devient `name/<fileBase>`.

Si votre plugin importe des dépendances npm, installez-les dans ce répertoire afin que `node_modules` soit disponible (`npm install` / `pnpm install`).

Garantie de sécurité : chaque entrée `openclaw.extensions` doit rester à l'intérieur du répertoire du plugin après la résolution des liens symboliques. Les entrées qui s'échappent du répertoire du package sont rejetées.

Note de sécurité : `openclaw plugins install` installe les dépendances du plugin avec `npm install --omit=dev --ignore-scripts` (pas de scripts de cycle de vie, pas de dépendances de développement au moment de l'exécution). Gardez les arbres de dépendances des plugins « pure JS/TS » et évitez les packages qui nécessitent des constructions `postinstall`.

Optionnel : `openclaw.setupEntry` peut pointer vers un module léger de configuration uniquement. Lorsque OpenClaw a besoin de surfaces de configuration pour un plugin de canal désactivé, ou lorsqu'un plugin de canal est activé mais toujours non configuré, il charge `setupEntry` au lieu de l'entrée complète du plugin. Cela rend le démarrage et la configuration plus légers lorsque votre entrée principale du plugin connecte également des outils, des hooks ou d'autres codes uniquement pour l'exécution.

Optionnel : `openclaw.startup.deferConfiguredChannelFullLoadUntilAfterListen` peut permettre à un plugin de canal d'emprunter le même chemin `setupEntry` pendant la phase de démarrage pré-écoute de la passerelle, même lorsque le canal est déjà configuré.

N'utilisez ceci que lorsque `setupEntry` couvre entièrement la surface de démarrage qui doit exister avant que la passerelle ne commence à écouter. En pratique, cela signifie que l'entrée de configuration doit enregistrer chaque capacité détenue par le canal dont le démarrage dépend, par exemple :

- l'enregistrement du canal lui-même
- toutes les routes HTTP qui doivent être disponibles avant que la passerelle ne commence à écouter
- toutes les méthodes, outils ou services de passerelle qui doivent exister durant cette même fenêtre

Si votre entrée complète possède toujours une capacité de démarrage requise, n'activez pas ce drapeau. Conservez le plugin sur le comportement par défaut et laissez OpenClaw charger l'entrée complète pendant le démarrage.

Les canals groupés peuvent également publier des assistants de surface de contrat de configuration uniquement que le cœur peut consulter avant le chargement de l'exécution complète du canal. La surface actuelle de promotion de la configuration est :

- `singleAccountKeysToMove`
- `namedAccountPromotionKeys`
- `resolveSingleAccountPromotionTarget(...)`

Le noyau utilise cette surface lorsqu'il doit promouvoir une configuration de canal héritée à compte unique vers `channels.<id>.accounts.*` sans charger l'entrée complète du plugin. Matrix est l'exemple actuel groupé : il ne déplace que les clés d'authentification/d'amorçage vers un compte nommé promu lorsque des comptes nommés existent déjà, et il peut préserver une clé de compte par défaut configurée non canonique au lieu de toujours créer `accounts.default`.

Ces adaptateurs de correctifs de configuration gardent la découverte de la surface de contrat groupée paresseuse. Le temps d'importation reste léger ; la surface de promotion n'est chargée qu'à la première utilisation au lieu de ré-entrer dans le démarrage du canal groupé lors de l'importation du module.

Lorsque ces surfaces de démarrage incluent des méthodes RPC de passerelle, gardez-les sur un préfixe spécifique au plugin. Les espaces de noms d'administration du noyau (`config.*`, `exec.approvals.*`, `wizard.*`, `update.*`) restent réservés et résolvent toujours vers `operator.admin`, même si un plugin demande une portée plus étroite.

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

Les plugins de canal peuvent publier des métadonnées de configuration/découverte via `openclaw.channel` et des indices d'installation via `openclaw.install`. Cela maintient les données du catalogue principal libres.

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
- `preferOver` : identifiants de plugin/canal de priorité inférieure que cette entrée de catalogue devrait surpasser
- `selectionDocsPrefix`, `selectionDocsOmitLabel`, `selectionExtras` : contrôles de copie pour la surface de sélection
- `markdownCapable` : marque le canal comme compatible markdown pour les décisions de formatage sortant
- `exposure.configured` : masque le canal des surfaces de liste des canaux configurés lorsqu'il est défini sur `false`
- `exposure.setup` : masque le canal des sélecteurs de configuration/interactifs lorsqu'il est défini sur `false`
- `exposure.docs` : marque le canal comme interne/privé pour les surfaces de navigation de la documentation
- `showConfigured` / `showInSetup` : les alias hérités sont toujours acceptés pour compatibilité ; préférez `exposure`
- `quickstartAllowFrom` : active le channel pour le flux de démarrage rapide `allowFrom` standard
- `forceAccountBinding` : exiger une liaison de compte explicite même lorsqu'un seul compte existe
- `preferSessionLookupForAnnounceTarget` : préférer la recherche de session lors de la résolution des cibles d'annonce

OpenClaw peut également fusionner des **catalogues de canaux externes** (par exemple, un export de registre MPM). Déposez un fichier JSON à l'un des emplacements suivants :

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
plutôt que de simplement ajouter une recherche mémoire ou des crochets (hooks).

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

Lorsqu'un plugin a besoin d'un comportement qui ne correspond pas à la API actuelle, ne contournez pas
le système de plugins avec un accès privé. Ajoutez la capacité manquante.

Séquence recommandée :

1. définir le contrat principal
   Décidez du comportement partagé que le cœur doit posséder : stratégie, repli, fusion de configuration,
   cycle de vie, sémantique orientée channel et forme de l'aide d'exécution.
2. ajouter des surfaces d'inscription/d'exécution de plugin typées
   Étendez `OpenClawPluginApi` et/ou `api.runtime` avec la plus petite surface
   de capacité typée utile.
3. connecter le cœur et les consommateurs de canaux/fonctionnalités
   Les plugins de canaux et de fonctionnalités devraient consommer la nouvelle capacité via le cœur,
   et non en important directement une implémentation de fournisseur.
4. enregistrer les implémentations des fournisseurs
   Les plugins de fournisseurs enregistrent ensuite leurs backends par rapport à la capacité.
5. ajouter une couverture de contrat
   Ajoutez des tests pour que la propriété et la forme de l'enregistrement restent explicites dans le temps.

C'est ainsi que OpenClaw reste opinionné sans être codé en dur selon la vision du monde d'un
provider. Consultez le [Capability Cookbook](/en/tools/capability-cookbook)
pour une liste de fichiers concrète et un exemple travaillé.

### Liste de contrôle des capacités

Lorsque vous ajoutez une nouvelle capacité, l'implémentation doit généralement toucher ces
surfaces ensemble :

- types de contrats principaux dans `src/<capability>/types.ts`
- assistant d'exécution/runtime principal dans `src/<capability>/runtime.ts`
- surface d'enregistrement de API du plugin dans `src/plugins/types.ts`
- câblage du registre de plugins dans `src/plugins/registry.ts`
- exposition du runtime du plugin dans `src/plugins/runtime/*` lorsque les plugins de fonctionnalités/canaux
  doivent la consommer
- assistants de capture/test dans `src/test-utils/plugin-registration.ts`
- assertions de propriété/de contrat dans `src/plugins/contracts/registry.ts`
- documentation opérateur/plugin dans `docs/`

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
- les plugins de fournisseurs possèdent les implémentations des fournisseurs
- les plugins de fonctionnalités/canaux consomment les assistants d'exécution
- les tests de contrat gardent la propriété explicite
