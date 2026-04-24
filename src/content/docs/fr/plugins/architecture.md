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
  This is the **deep architecture reference**. For practical guides, see: - [Install and use plugins](/fr/tools/plugin) — user guide - [Getting Started](/fr/plugins/building-plugins) — first plugin tutorial - [Channel Plugins](/fr/plugins/sdk-channel-plugins) — build a messaging channel - [Provider Plugins](/fr/plugins/sdk-provider-plugins) — build a model provider - [SDK
  Overview](/fr/plugins/sdk-overview) — import map and registration API
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

Use `openclaw plugins inspect <id>` to see a plugin's shape and capability
breakdown. See [CLI reference](/fr/cli/plugins#inspect) for details.

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
   OpenClaw trouve les plugins candidats dans les chemins configurés, les racines de l'espace de travail,
   les racines globales des plugins et les plugins groupés. La découverte lit les fichiers manifeste natifs
   `openclaw.plugin.json` ainsi que les fichiers manifeste de group pris en charge en premier.
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

See [Load pipeline](#load-pipeline) for the full startup sequence.

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

Need a concrete rollout checklist? See
[Capability Cookbook](/fr/tools/capability-cookbook).

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
- hooks d'exécution : `normalizeModelId`, `normalizeTransport`,
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
  `resolveThinkingProfile`, `isBinaryThinking`, `supportsXHighThinking`,
  `resolveDefaultThinkingLevel`, `isModernModelRef`, `prepareRuntimeAuth`,
  `resolveUsageAuth`, `fetchUsageSnapshot`, `createEmbeddingProvider`,
  `buildReplayPolicy`,
  `sanitizeReplayHistory`, `validateReplayTurns`, `onModelSelected`

OpenClaw possède toujours la boucle d'agent générique, le basculement (failover), la gestion des transcriptions et la politique de tool (tool policy). Ces hooks constituent la surface d'extension pour les comportements spécifiques au fournisseur sans avoir besoin d'un transport d'inférence entièrement personnalisé.

Utilisez le manifeste `providerAuthEnvVars` lorsque le provider dispose d'identifiants basés sur des variables d'environnement que les chemins génériques d'authentification/état/sélection de modèle doivent voir sans charger le runtime du plugin. Utilisez le manifeste `providerAuthAliases` lorsqu'un id de provider doit réutiliser les variables d'environnement, les profils d'authentification, l'authentification basée sur la configuration et le choix d'intégration (onboarding) de clé API d'un autre id de provider. Utilisez le manifeste `providerAuthChoices` lorsque les surfaces CLI d'intégration/choix d'authentification doivent connaître l'id de choix du provider, les étiquettes de groupe et le câblage d'authentification à un seul indicateur simple sans charger le runtime du provider. Gardez le runtime du provider `envVars` pour les indices destinés aux opérateurs, tels que les étiquettes d'intégration ou les variables de configuration du client-id/secret-client OAuth.

Utilisez le manifeste `channelEnvVars` lorsqu'un canal dispose d'une authentification ou d'une configuration pilotée par l'environnement que le repli générique d'environnement de shell, les vérifications de configuration/état ou les invites de configuration doivent voir sans charger le runtime du canal.

### Ordre et utilisation des hooks

Pour les plugins de modèle/provider, OpenClaw appelle les hooks dans cet ordre approximatif. La colonne "Quand l'utiliser" est le guide de décision rapide.

| #   | Hook                              | Ce qu'il fait                                                                                                                                                                            | Quand l'utiliser                                                                                                                                                                                                                             |
| --- | --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `catalog`                         | Publiez la configuration du provider dans `models.providers` lors de la génération `models.json`                                                                                         | Le provider possède un catalogue ou des valeurs par défaut d'URL de base                                                                                                                                                                     |
| 2   | `applyConfigDefaults`             | Appliquer les valeurs par défaut de configuration globale détenues par le provider lors de la matérialisation de la configuration                                                        | Les valeurs par défaut dépendent du mode d'authentification, de l'environnement ou de la sémantique de la famille de modèles du provider                                                                                                     |
| --  | _(recherche de modèle intégré)_   | OpenClaw essaie d'abord le chemin normal du registre/catalogue                                                                                                                           | _(pas un hook de plugin)_                                                                                                                                                                                                                    |
| 3   | `normalizeModelId`                | Normaliser les alias d'id de modèle hérités ou de prévisualisation avant la recherche                                                                                                    | Le provider est responsable du nettoyage des alias avant la résolution du modèle canonique                                                                                                                                                   |
| 4   | `normalizeTransport`              | Normalisez la famille de providers `api` / `baseUrl` avant l'assemblage du modèle générique                                                                                              | Le provider est responsable du nettoyage du transport pour les ids de providers personnalisés dans la même famille de transport                                                                                                              |
| 5   | `normalizeConfig`                 | Normalisez `models.providers.<id>` avant la résolution du runtime/du provider                                                                                                            | Le fournisseur a besoin d'un nettoyage de la configuration qui devrait résider avec le plugin ; les assistants groupés de la famille Google servent également de filet de sécurité pour les entrées de configuration Google prises en charge |
| 6   | `applyNativeStreamingUsageCompat` | Appliquer les réécritures de compatibilité d'utilisation du streaming natif aux fournisseurs de configuration                                                                            | Le fournisseur a besoin de corrections de métadonnées d'utilisation du streaming natif pilotées par le point de terminaison                                                                                                                  |
| 7   | `resolveConfigApiKey`             | Résoudre l'authentification par marqueur d'environnement pour les fournisseurs de configuration avant le chargement de l'authentification à l'exécution                                  | Le provider possède une résolution de clé API avec marqueur d'environnement propriétaire du provider ; `amazon-bedrock` possède également ici un résolveur de marqueur d'environnement AWS intégré                                           |
| 8   | `resolveSyntheticAuth`            | Présenter l'authentification locale/auto-hébergée ou basée sur la configuration sans persister de texte en clair                                                                         | Le fournisseur peut fonctionner avec un marqueur d'identification synthétique/local                                                                                                                                                          |
| 9   | `resolveExternalAuthProfiles`     | Superposition des profils d'authentification externe propriétaires du provider ; le `persistence` par défaut est `runtime-only` pour les identifiants appartenant à la CLI/l'application | Le provider réutilise les identifiants d'authentification externe sans conserver les jetons d'actualisation copiés ; déclarez `contracts.externalAuthProviders` dans le manifeste                                                            |
| 10  | `shouldDeferSyntheticProfileAuth` | Abaisser les espaces réservés de profil synthétique stockés derrière l'authentification basée sur l'environnement/la configuration                                                       | Le fournisseur stocke des profils espaces réservés synthétiques qui ne doivent pas prévaloir                                                                                                                                                 |
| 11  | `resolveDynamicModel`             | Synchronisation de repli pour les identifiants de modèle appartenant au fournisseur non encore présents dans le registre local                                                           | Le fournisseur accepte les identifiants de modèle en amont arbitraires                                                                                                                                                                       |
| 12  | `prepareDynamicModel`             | Préchauffage asynchrone, puis `resolveDynamicModel` s'exécute à nouveau                                                                                                                  | Le fournisseur a besoin de métadonnées réseau avant de résoudre les identifiants inconnus                                                                                                                                                    |
| 13  | `normalizeResolvedModel`          | Réécriture finale avant que le runner intégré n'utilise le modèle résolu                                                                                                                 | Le fournisseur a besoin de réécritures de transport mais utilise toujours un transport principal                                                                                                                                             |
| 14  | `contributeResolvedModelCompat`   | Fournir des indicateurs de compatibilité pour les modèles fournisseurs derrière un autre transport compatible                                                                            | Le fournisseur reconnaît ses propres modèles sur les transports de proxy sans prendre le contrôle du fournisseur                                                                                                                             |
| 15  | `capabilities`                    | Métadonnées de transcription/outillage appartenant au fournisseur utilisées par la logique principale partagée                                                                           | Le fournisseur a besoin de particularités de la transcription/de la famille de fournisseurs                                                                                                                                                  |
| 16  | `normalizeToolSchemas`            | Normaliser les schémas d'outils avant que le runner intégré ne les voie                                                                                                                  | Le fournisseur a besoin d'un nettoyage des schémas de la famille de transport                                                                                                                                                                |
| 17  | `inspectToolSchemas`              | Fournir des diagnostics de schéma appartenant au fournisseur après normalisation                                                                                                         | Le fournisseur souhaite des avertissements de mots-clés sans enseigner de règles spécifiques au fournisseur au cœur du système                                                                                                               |
| 18  | `resolveReasoningOutputMode`      | Sélectionner le contrat de sortie de raisonnement natif ou balisé                                                                                                                        | Le fournisseur a besoin d'une sortie de raisonnement/finale balisée au lieu des champs natifs                                                                                                                                                |
| 19  | `prepareExtraParams`              | Normalisation des paramètres de requête avant les wrappers d'options de flux génériques                                                                                                  | Le fournisseur a besoin de paramètres de requête par défaut ou d'un nettoyage de paramètres par fournisseur                                                                                                                                  |
| 20  | `createStreamFn`                  | Remplacer entièrement le chemin de flux normal par un transport personnalisé                                                                                                             | Le fournisseur a besoin d'un protocole filaire personnalisé, et pas seulement d'un wrapper                                                                                                                                                   |
| 21  | `wrapStreamFn`                    | Wrapper de flux après l'application des wrappers génériques                                                                                                                              | Le fournisseur a besoin de wrappers de compatibilité pour les en-têtes/corps de requête/model sans transport personnalisé                                                                                                                    |
| 22  | `resolveTransportTurnState`       | Attacher les en-têtes ou métadonnées de transport natifs par tour                                                                                                                        | Le fournisseur souhaite que les transports génériques envoient l'identité de tour native du fournisseur                                                                                                                                      |
| 23  | `resolveWebSocketSessionPolicy`   | Attacher les en-têtes WebSocket natifs ou la politique de refroidissement de session                                                                                                     | Le fournisseur souhaite que les transports WS génériques ajustent les en-têtes de session ou la politique de secours                                                                                                                         |
| 24  | `formatApiKey`                    | Auth-profile formatter: stored profile becomes the runtime `apiKey` string                                                                                                               | Le fournisseur stocke des métadonnées d'authentification supplémentaires et a besoin d'une forme de jeton d'exécution personnalisée                                                                                                          |
| 25  | `refreshOAuth`                    | Remplacement de rafraîchissement OAuth pour les points de terminaison de rafraîchissement personnalisés ou la politique d'échec de rafraîchissement                                      | Provider does not fit the shared `pi-ai` refreshers                                                                                                                                                                                          |
| 26  | `buildAuthDoctorHint`             | Indication de réparation ajoutée lorsque le rafraîchissement OAuth échoue                                                                                                                | Le fournisseur a besoin de conseils de réparation d'authentification appartenant au fournisseur après un échec de rafraîchissement                                                                                                           |
| 27  | `matchesContextOverflowError`     | Correspondance de dépassement de fenêtre de contexte appartenant au fournisseur                                                                                                          | Le fournisseur a des erreurs brutes de dépassement que les heuristiques génériques manqueraient                                                                                                                                              |
| 28  | `classifyFailoverReason`          | Classification des raisons de basculement appartenant au fournisseur                                                                                                                     | Le fournisseur peut mapper les erreurs brutes API/transport vers limite de taux/surcharge/etc.                                                                                                                                               |
| 29  | `isCacheTtlEligible`              | Stratégie de cache de prompt pour les fournisseurs de proxy/backhaul                                                                                                                     | Le fournisseur a besoin d'une porte TTL de cache spécifique au proxy                                                                                                                                                                         |
| 30  | `buildMissingAuthMessage`         | Remplacement du message générique de récupération d'authentification manquante                                                                                                           | Le fournisseur a besoin d'une indication de récupération d'authentification manquante spécifique au fournisseur                                                                                                                              |
| 31  | `suppressBuiltInModel`            | Suppression du modèle amont obsolète plus indication d'erreur utilisateur facultative                                                                                                    | Le fournisseur doit masquer les lignes amont obsolètes ou les remplacer par une indication du fournisseur                                                                                                                                    |
| 32  | `augmentModelCatalog`             | Lignes de catalogue synthétiques/finales ajoutées après la découverte                                                                                                                    | Provider needs synthetic forward-compat rows in `models list` and pickers                                                                                                                                                                    |
| 33  | `resolveThinkingProfile`          | Niveau `/think` défini spécifique au modèle, étiquettes d'affichage et valeur par défaut                                                                                                 | Le provider expose une échelle de réflexion (thinking ladder) personnalisée ou une étiquette binaire pour les modèles sélectionnés                                                                                                           |
| 34  | `isBinaryThinking`                | Hook de compatibilité pour l'interrupteur de raisonnement marche/arrêt                                                                                                                   | Le provider expose uniquement la réflexion binaire marche/arrêt                                                                                                                                                                              |
| 35  | `supportsXHighThinking`           | Hook de compatibilité du support de raisonnement `xhigh`                                                                                                                                 | Le provider souhaite `xhigh` uniquement sur un sous-ensemble de models                                                                                                                                                                       |
| 36  | `resolveDefaultThinkingLevel`     | Hook de compatibilité du niveau `/think` par défaut                                                                                                                                      | Le provider possède la stratégie `/think` par défaut pour une famille de models                                                                                                                                                              |
| 37  | `isModernModelRef`                | Correspondance de modèle moderne pour les filtres de profil en direct et la sélection de smoke                                                                                           | Le provider possède la correspondance de modèle préféré live/smoke                                                                                                                                                                           |
| 38  | `prepareRuntimeAuth`              | Échanger une information d'identification configurée contre le jeton/clé de runtime réel juste avant l'inférence                                                                         | Le provider a besoin d'un échange de jeton ou d'une informations d'identification de demande à court terme                                                                                                                                   |
| 39  | `resolveUsageAuth`                | Résoudre les informations d'identification d'utilisation/facturation pour `/usage` et les surfaces d'état associées                                                                      | Le provider a besoin d'une analyse personnalisée des jetons d'utilisation/quota ou d'une information d'identification d'utilisation différente                                                                                               |
| 40  | `fetchUsageSnapshot`              | Récupérer et normaliser les instantanés d'utilisation/quota spécifiques au provider après la résolution de l'authentification                                                            | Le provider a besoin d'un point de terminaison d'utilisation spécifique au provider ou d'un analyseur de payload                                                                                                                             |
| 41  | `createEmbeddingProvider`         | Créer un adaptateur d'incorporation (embedding) détenu par le provider pour la mémoire/recherche                                                                                         | Le comportement d'incorporation de la mémoire appartient au plugin provider                                                                                                                                                                  |
| 42  | `buildReplayPolicy`               | Renvoyer une stratégie de relecture contrôlant la gestion des transcriptions pour le provider                                                                                            | Le provider a besoin d'une stratégie de transcription personnalisée (par exemple, suppression des blocs de réflexion)                                                                                                                        |
| 43  | `sanitizeReplayHistory`           | Réécrire l'historique de relecture après le nettoyage générique de la transcription                                                                                                      | Le provider a besoin de réécritures de relecture spécifiques au provider au-delà des assistants de compactage partagés                                                                                                                       |
| 44  | `validateReplayTurns`             | Validation ou remodelage final du tour de relecture avant le runner intégré                                                                                                              | Le transport du provider a besoin d'une validation de tour plus stricte après la sanitation générique                                                                                                                                        |
| 45  | `onModelSelected`                 | Exécuter les effets secondaires post-sélection détenus par le provider                                                                                                                   | Le provider a besoin de télémétrie ou d'état détenu par le provider lorsqu'un model devient actif                                                                                                                                            |

`normalizeModelId`, `normalizeTransport`, et `normalizeConfig` vérifient d'abord le
plugin provider correspondant, puis passent aux autres plugins provider capables de hooks
jusqu'à ce que l'un change réellement l'id du model ou le transport/config. Cela permet
aux shims de provider alias/compat de fonctionner sans que l'appelant ait besoin de savoir quel
plugin groupé possède la réécriture. Si aucun hook de provider ne réécrit une entrée de config
de la famille Google prise en charge, le normaliseur de config Google groupé applique toujours
ce nettoyage de compatibilité.

Si le provider a besoin d'un protocole filaire entièrement personnalisé ou d'un exécuteur de requête personnalisé,
c'est une classe d'extension différente. Ces hooks sont destinés au comportement du provider
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
  `resolveThinkingProfile`, `applyConfigDefaults`, `isModernModelRef`,
  et `wrapStreamFn` car il possède la compatibilité avant Claude 4.6,
  les indices de famille de provider, les conseils de réparation d'auth, l'intégration de point de terminaison d'utilisation,
  l'éligibilité du cache de prompt, les valeurs par défaut de config conscientes de l'auth, la politique
  de réflexion par défaut/adaptive de Claude, et le façonnage de flux spécifique à Anthropic pour
  les en-têtes bêta, `/fast` / `serviceTier`, et `context1m`.
- Les assistants de flux spécifiques à Claude d'Anthropic restent pour l'instant dans la couture
  publique `api.ts` / `contract-api.ts` propre du plugin groupé. Cette surface de package
  exporte `wrapAnthropicProviderStream`, `resolveAnthropicBetas`,
  `resolveAnthropicFastMode`, `resolveAnthropicServiceTier`, et les constructeurs de wrapper
  Anthropic de niveau inférieur au lieu d'élargir le SDK générique autour des règles d'en-tête
  bêta d'un provider.
- OpenAI utilise `resolveDynamicModel`, `normalizeResolvedModel` et
  `capabilities` ainsi que `buildMissingAuthMessage`, `suppressBuiltInModel`,
  `augmentModelCatalog`, `resolveThinkingProfile` et `isModernModelRef`
  car il possède la compatibilité future GPT-5.4, la normalisation directe OpenAI
  `openai-completions` -> `openai-responses`, les indices d'authentification
  compatibles Codex, la suppression Spark, les lignes de liste synthétiques OpenAI et la stratégie de réflexion /
  de modèle en direct GPT-5 ; la famille de flux `openai-responses-defaults` possède les
  enveloppes Responses natives OpenAI partagées pour les en-têtes d'attribution,
  `/fast`/`serviceTier`, la verbosité du texte, la recherche web Codex native,
  le formatage de charge utile compatible avec le raisonnement et la gestion du contexte Responses.
- OpenRouter utilise `catalog` ainsi que `resolveDynamicModel` et
  `prepareDynamicModel` car le provider est un canal passant et peut exposer de nouveaux
  ids de modèle avant les mises à jour du catalogue statique d'OpenClaw ; il utilise également
  `capabilities`, `wrapStreamFn` et `isCacheTtlEligible` pour garder
  les en-têtes de requête spécifiques au provider, les métadonnées de routage, les correctifs de raisonnement et la
  stratégie de cache de prompt en dehors du cœur. Sa stratégie de relecture provient de la
  famille `passthrough-gemini`, tandis que la famille de flux `openrouter-thinking`
  possède l'injection de raisonnement proxy et les sauts de modèle non pris en charge / `auto`.
- GitHub Copilot utilise `catalog`, `auth`, `resolveDynamicModel` et
  `capabilities` ainsi que `prepareRuntimeAuth` et `fetchUsageSnapshot` car il
  a besoin d'une connexion appareil propriétaire au provider, du comportement de repli de modèle, des particularités de transcription
  Claude, d'un échange de jeton GitHub -> jeton Copilot et d'un point de terminaison d'utilisation propriétaire au provider.
- OpenAI Codex utilise `catalog`, `resolveDynamicModel`,
  `normalizeResolvedModel`, `refreshOAuth`, et `augmentModelCatalog` ainsi que
  `prepareExtraParams`, `resolveUsageAuth`, et `fetchUsageSnapshot` car il
  s'exécute toujours sur les transports OpenAI principaux mais possède sa propre normalisation du transport/de l'URL de base, sa politique de repli de rafraîchissement OAuth, son choix de transport par défaut,
  ses lignes de catalogue Codex synthétiques et son intégration au point de terminaison d'utilisation ChatGPT ; il
  partage la même famille de flux `openai-responses-defaults` que le OpenAI direct.
- Google AI Studio et le OAuth CLI Gemini utilisent `resolveDynamicModel`,
  `buildReplayPolicy`, `sanitizeReplayHistory`,
  `resolveReasoningOutputMode`, `wrapStreamFn`, et `isModernModelRef` car la
  famille de relecture `google-gemini` gère le repli de compatibilité avant Gemini 3.1,
  la validation de relecture native Gemini, le nettoyage de l'amorçage de relecture, le mode
  de sortie de raisonnement étiqueté et la correspondance des modèles modernes, tandis que la
  famille de flux `google-thinking` gère la normalisation de la charge utile de réflexion Gemini ;
  l'OAuth OAuth Gemini utilise également `formatApiKey`, `resolveUsageAuth`, et
  `fetchUsageSnapshot` pour le formatage des jetons, l'analyse des jetons et le câblage du point de terminaison de quota.
- Anthropic Vertex utilise `buildReplayPolicy` via la
  famille de relecture `anthropic-by-model` afin que le nettoyage de relecture spécifique à Claude reste
  limité aux identifiants Claude plutôt qu'à chaque transport `anthropic-messages`.
- Amazon Bedrock utilise `buildReplayPolicy`, `matchesContextOverflowError`,
  `classifyFailoverReason`, et `resolveThinkingProfile` car il possède
  une classification des erreurs d'étranglement/non prêt/dépassement de contexte spécifique à Bedrock
  pour le trafic Anthropic sur Bedrock ; sa politique de relecture partage toujours la même
  garde `anthropic-by-model` Claude-only.
- OpenRouter, Kilocode, Opencode et Opencode Go utilisent `buildReplayPolicy`
  via la famille de replay `passthrough-gemini` car ils utilisent un proxy pour les modèles
  Gemini via des transports compatibles OpenAI et ont besoin d'une
  nettoyage des signatures de pensée Gemini sans validation de replay Gemini native ou
  réécritures de bootstrap.
- MiniMax utilise `buildReplayPolicy` via la
  famille de replay `hybrid-anthropic-openai` car un provider possède à la fois les
  sémantiques de message Anthropic et celles compatibles OpenAI ; il conserve la suppression des blocs de pensée
  réservés à Claude du côté Anthropic tout en remettant le mode de sortie de raisonnement
  en natif, et la famille de flux `minimax-fast-mode` gère les
  réécritures de modèle en mode rapide sur le chemin de flux partagé.
- Moonshot utilise `catalog`, `resolveThinkingProfile` et `wrapStreamFn` car il utilise toujours le transport partagé
  OpenAI mais a besoin d'une normalisation de la charge utile de pensée appartenant au provider ; la
  famille de flux `moonshot-thinking` mappe la configuration plus l'état `/think` sur sa
  charge utile de pensée binaire native.
- Kilocode utilise `catalog`, `capabilities`, `wrapStreamFn` et
  `isCacheTtlEligible` car il a besoin d'en-têtes de requête appartenant au provider,
  d'une normalisation de la charge utile de raisonnement, d'indices de transcription Gemini et d'une limitation du
  cache-TTL Anthropic ; la famille de flux `kilocode-thinking` maintient l'injection de pensée
  Kilo sur le chemin de flux de proxy partagé tout en sautant `kilo/auto` et
  d'autres ids de modèle de proxy qui ne prennent pas en charge les charges utiles de raisonnement explicites.
- Z.AI utilise `resolveDynamicModel`, `prepareExtraParams`, `wrapStreamFn`,
  `isCacheTtlEligible`, `resolveThinkingProfile`, `isModernModelRef`,
  `resolveUsageAuth` et `fetchUsageSnapshot` car il possède le repli GLM-5, les valeurs par défaut `tool_stream`, l'UX de pensée binaire, la correspondance des modèles modernes, ainsi que l'authentification d'utilisation et la récupération des quotas ; la famille de flux `tool-stream-default-on` maintient le wrapper `tool_stream` activé par défaut en dehors de la colle écrite à la main par fournisseur.
- xAI utilise `normalizeResolvedModel`, `normalizeTransport`,
  `contributeResolvedModelCompat`, `prepareExtraParams`, `wrapStreamFn`,
  `resolveSyntheticAuth`, `resolveDynamicModel` et `isModernModelRef`
  car il possède la normalisation native du transport des réponses xAI, les réécritures d'alias en mode rapide Grok, le `tool_stream` par défaut, le nettoyage des payloads strict-tool / reasoning, la réutilisation de l'authentification de repli pour les outils appartenant au plugin, la résolution de modèle Grok compatible avec les versions ultérieures, et les correctifs de compatibilité appartenant au fournisseur tels que le profil de schéma d'outil xAI, les mots-clés de schéma non pris en charge, le `web_search` natif et le décodage des arguments d'appel d'outil d'entités HTML.
- Mistral, OpenCode Zen et OpenCode Go utilisent uniquement `capabilities` pour garder
  les particularités de transcription/d'outillage hors du cœur.
- Les fournisseurs groupés uniquement dans le catalogue tels que `byteplus`, `cloudflare-ai-gateway`,
  `huggingface`, `kimi-coding`, `nvidia`, `qianfan`,
  `synthetic`, `together`, `venice`, `vercel-ai-gateway` et `volcengine` utilisent
  uniquement `catalog`.
- Qwen utilise `catalog` pour son fournisseur de texte ainsi que les enregistrements partagés de compréhension de média et de génération vidéo pour ses surfaces multimodales.
- MiniMax et Xiaomi utilisent `catalog` ainsi que des hooks d'utilisation car leur comportement `/usage` est la propriété du plugin, bien que l'inférence s'exécute toujours via les transports partagés.

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
- Utilise la configuration principale `messages.tts` et la sélection du provider.
- Renvoie le tampon audio PCM + le taux d'échantillonnage. Les plugins doivent rééchantillonner/encoder pour les providers.
- `listVoices` est optionnel par provider. Utilisez-le pour les sélecteurs de voix ou les flux de configuration possédés par le fournisseur.
- Les listes de voix peuvent inclure des métadonnées plus riches telles que les paramètres régionaux, le genre et les balises de personnalité pour les sélecteurs conscients du provider.
- OpenAI et ElevenLabs prennent en charge la téléphonie aujourd'hui. Microsoft non.

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

- Gardez la politique, le repli et la livraison de réponses TTS dans le cœur.
- Utilisez les providers de parole pour le comportement de synthèse possédé par le fournisseur.
- L'entrée `edge` Microsoft héritée est normalisée vers l'id de provider `microsoft`.
- Le modèle de propriété préféré est orienté entreprise : un plugin fournisseur peut posséder les providers de texte, de parole, d'image et de futurs médias à mesure qu'OpenClaw ajoute ces contrats de capacité.

Pour la compréhension d'image/audio/vidéo, les plugins enregistrent un provider de compréhension de média typé au lieu d'un sac générique clé/valeur :

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

- Gardez l'orchestration, le repli, la configuration et le câblage de channel dans le cœur.
- Gardez le comportement du fournisseur dans le plugin provider.
- L'extension additive doit rester typée : nouvelles méthodes optionnelles, nouveaux champs de résultat optionnels, nouvelles capacités optionnelles.
- La génération vidéo suit déjà le même modèle :
  - le cœur possède le contrat de capacité et le helper d'exécution
  - les plugins fournisseur enregistrent `api.registerVideoGenerationProvider(...)`
  - les plugins de fonctionnalité/channel consomment `api.runtime.videoGeneration.*`

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

Pour la transcription audio, les plugins peuvent utiliser soit le runtime de compréhension de média soit l'alias STT plus ancien :

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
- OpenClaw honore ces champs de substitution uniquement pour les appelants de confiance.
- Pour les exécutions de repli appartenant au plugin, les opérateurs doivent opter pour `plugins.entries.<id>.subagent.allowModelOverride: true`.
- Utilisez `plugins.entries.<id>.subagent.allowedModels` pour restreindre les plugins de confiance à des cibles `provider/model` canoniques spécifiques, ou `"*"` pour autoriser explicitement n'importe quelle cible.
- Les exécutions de sous-agent de plugin non approuvés fonctionnent toujours, mais les demandes de substitution sont rejetées au lieu de passer silencieusement en repli.

Pour la recherche Web, les plugins peuvent utiliser l'assistant d'exécution partagé au lieu
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

Les plugins peuvent également enregistrer des providers de recherche Web via
`api.registerWebSearchProvider(...)`.

Notes :

- Conservez la sélection du provider, la résolution des informations d'identification et la sémantique des demandes partagées dans le cœur.
- Utilisez des providers de recherche Web pour les transports de recherche spécifiques aux fournisseurs.
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

- `generate(...)` : générer une image en utilisant la chaîne de fournisseurs de génération d'images configurée.
- `listProviders(...)` : lister les fournisseurs de génération d'images disponibles et leurs capacités.

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
- `auth` : obligatoire. Utilisez `"gateway"` pour exiger l'authentification normale du Gateway, ou `"plugin"` pour l'authentification gérée par le plugin/la vérification webhook.
- `match` : optionnel. `"exact"` (par défaut) ou `"prefix"`.
- `replaceExisting` : optionnel. Permet au même plugin de remplacer son propre enregistrement de route existant.
- `handler` : renvoyez `true` lorsque la route a géré la demande.

Notes :

- `api.registerHttpHandler(...)` a été supprimé et provoquera une erreur de chargement de plugin. Utilisez plutôt `api.registerHttpRoute(...)`.
- Les routes de plugin doivent déclarer `auth` explicitement.
- Les conflits exacts de `path + match` sont rejetés, sauf si `replaceExisting: true`, et un plugin ne peut pas remplacer la route d'un autre plugin.
- Les routes superposées avec différents niveaux de `auth` sont rejetées. Maintenez les chaînes de retour (fallthrough) `exact`/`prefix` uniquement sur le même niveau d'authentification.
- Les routes `auth: "plugin"` ne reçoivent **pas** automatiquement les scopes d'exécution de l'opérateur. Elles sont destinées aux webhooks/vérifications de signature gérés par le plugin, et non aux appels aux assistants privilégiés du Gateway.
- Les routes `auth: "gateway"` s'exécutent dans un scope d'exécution de requête Gateway, mais ce scope est intentionnellement conservateur :
  - l'authentification bearer par secret partagé (`gateway.auth.mode = "token"` / `"password"`) maintient les scopes d'exécution des routes de plugin épinglés à `operator.write`, même si l'appelant envoie `x-openclaw-scopes`
  - les modes HTTP porteurs d'identité de confiance (par exemple `trusted-proxy` ou `gateway.auth.mode = "none"` sur une entrée privée) honorent `x-openclaw-scopes` uniquement lorsque l'en-tête est explicitement présent
  - si `x-openclaw-scopes` est absent sur ces demandes de route de plugin porteuses d'identité, le scope d'exécution revient à `operator.write`
- Règle pratique : ne supposez pas qu'une route de plugin d'authentification de passerelle est une surface administrative implicite. Si votre route nécessite un comportement réservé aux administrateurs, exigez un mode d'authentification porteur d'identité et documentez le contrat d'en-tête explicite `x-openclaw-scopes`.

## Chemins d'import du SDK de plugin

Utilisez les sous-chemins du SDK au lieu de l'import monolithique `openclaw/plugin-sdk` lors de la création de plugins :

- `openclaw/plugin-sdk/plugin-entry` pour les primitives d'enregistrement de plugins.
- `openclaw/plugin-sdk/core` pour le contrat générique partagé orienté plugin.
- `openclaw/plugin-sdk/config-schema` pour l'export du schéma Zod `openclaw.json` racine (`OpenClawSchema`).
- Primitives de channel stables telles que `openclaw/plugin-sdk/channel-setup`, `openclaw/plugin-sdk/setup-runtime`, `openclaw/plugin-sdk/setup-adapter-runtime`, `openclaw/plugin-sdk/setup-tools`, `openclaw/plugin-sdk/channel-pairing`, `openclaw/plugin-sdk/channel-contract`, `openclaw/plugin-sdk/channel-feedback`, `openclaw/plugin-sdk/channel-inbound`, `openclaw/plugin-sdk/channel-lifecycle`, `openclaw/plugin-sdk/channel-reply-pipeline`, `openclaw/plugin-sdk/command-auth`, `openclaw/plugin-sdk/secret-input` et `openclaw/plugin-sdk/webhook-ingress` pour le câblage partagé de configuration/authentification/réponse/webhook. `channel-inbound` est le foyer partagé pour le debounce, la correspondance de mentions, les aides de stratégie de mention entrante, le formatage d'enveloppe et les aides de contexte d'enveloppe entrante. `channel-setup` est la jointure de configuration étroite en installation facultative. `setup-runtime` est la surface de configuration sûre à l'exécution utilisée par `setupEntry` / le démarrage différé, y compris les adaptateurs de correctifs de configuration sécurisés pour l'importation. `setup-adapter-runtime` est la jointure d'adaptateur de configuration de compte consciente de l'environnement. `setup-tools` est la petite jointure d'aide CLI/archive/docs (`formatCliCommand`, `detectBinary`, `extractArchive`, `resolveBrewExecutable`, `formatDocsLink`, `CONFIG_DIR`).
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
  `openclaw/plugin-sdk/directory-runtime` pour les helpers d'exécution et de configuration partagés.
  `telegram-command-config` est la jonction publique étroite pour la normalisation/validation des commandes personnalisées Telegram et reste disponible même si la surface de contrat Telegram groupée est temporairement indisponible.
  `text-runtime` est la jonction partagée pour le texte/markdown/journalisation, incluant le nettoyage du texte visible par l'assistant, les helpers de rendu/découpage markdown, les helpers de rédaction, les helpers de balises de directive et les utilitaires de texte sécurisé.
- Les jonctions de canal spécifiques à l'approbation devraient préférer un contrat `approvalCapability`
  sur le plugin. Le cœur lit ensuite l'authentification, la livraison, le rendu, le routage natif et le comportement du gestionnaire natif différé via cette seule capacité
  au lieu de mélanger le comportement d'approbation dans des champs de plugin sans rapport.
- `openclaw/plugin-sdk/channel-runtime` est obsolète et ne reste qu'en tant que
  shim de compatibilité pour les anciens plugins. Le nouveau code devrait plutôt importer les primitives génériques plus étroites, et le code du dépôt ne devrait pas ajouter de nouveaux imports du
  shim.
- Les internals des extensions groupées restent privés. Les plugins externes ne doivent utiliser que
  les sous-chemins `openclaw/plugin-sdk/*`. Le code de test/cœur OpenClaw peut utiliser les points d'entrée publics du dépôt sous une racine de package de plugin telle que `index.js`, `api.js`,
  `runtime-api.js`, `setup-entry.js`, et des fichiers à portée étroite tels que
  `login-qr-api.js`. N'importez jamais `src/*` d'un package de plugin à partir du cœur ou d'une
  autre extension.
- Répartition du point d'entrée du dépôt :
  `<plugin-package-root>/api.js` est le module regroupant les helpers/types,
  `<plugin-package-root>/runtime-api.js` est le module d'exécution uniquement,
  `<plugin-package-root>/index.js` est le point d'entrée du plugin groupé,
  et `<plugin-package-root>/setup-entry.js` est le point d'entrée du plugin de configuration.
- Exemples actuels de providers groupés :
  - Anthropic utilise `api.js` / `contract-api.js` pour les helpers de flux Claude tels
    que `wrapAnthropicProviderStream`, les helpers d'en-tête bêta, et l'analyse
    `service_tier`.
  - OpenAI utilise `api.js` pour les constructeurs de providers, les helpers de modèle par défaut, et
    les constructeurs de providers en temps réel.
  - OpenRouter utilise `api.js` pour son constructeur de provider ainsi que les helpers d'intégration/
    de configuration, tandis que `register.runtime.js` peut toujours réexporter des helpers génériques
    `plugin-sdk/provider-stream` pour une utilisation locale au dépôt.
- Les points d'entrée publics chargés par la façade privilégient l'instantané de configuration d'exécution actif
  lorsqu'il existe, puis reviennent au fichier de configuration résolu sur le disque lorsque
  OpenClaw ne sert pas encore d'instantané d'exécution.
- Les primitives partagées génériques restent le contrat public SDK privilégié. Un petit
  ensemble de compatibilité réservé de points de soudure d'aides marqués par canal groupé
  existe toujours. Traitez-les comme des points de soudure de maintenance/de compatibilité groupés, et non comme de nouvelles
  cibles d'importation tierces ; les nouveaux contrats inter-canaux doivent toujours atterrir sur
  les sous-chemins génériques `plugin-sdk/*` ou les modules `api.js` /
  `runtime-api.js` locaux au plugin.

Note de compatibilité :

- Évitez le module racine `openclaw/plugin-sdk` pour le nouveau code.
- Privilégiez d'abord les primitives stables étroites. Les nouveaux sous-chemins setup/pairing/reply/
  feedback/contract/inbound/threading/command/secret-input/webhook/infra/
  allowlist/status/message-tool constituent le contrat prévu pour les nouveaux
  travaux de plugins groupés et externes.
  L'analyse/le ciblage appartient à `openclaw/plugin-sdk/channel-targets`.
  Les portails d'action de message et les helpers d'ID de message de réaction appartiennent à
  `openclaw/plugin-sdk/channel-actions`.
- Les barils d'assistant spécifiques aux extensions groupées ne sont pas stables par défaut. Si un assistant n'est nécessaire que pour une extension groupée, gardez-le derrière la couture locale `api.js` ou `runtime-api.js` de l'extension au lieu de le promouvoir dans `openclaw/plugin-sdk/<extension>`.
- Les nouvelles coutures d'assistant partagées doivent être génériques, et non marquées par un canal. L'analyse de cible partagée appartient à `openclaw/plugin-sdk/channel-targets` ; les spécificités internes du canal restent derrière la couture locale `api.js` ou `runtime-api.js` du plugin propriétaire.
- Les sous-chemins spécifiques aux capacités tels que `image-generation`, `media-understanding` et `speech` existent car les plugins groupés/natifs les utilisent aujourd'hui. Leur présence ne signifie pas par elle-même que chaque assistant exporté est un contrat externe figé à long terme.

## Schémas d'outil de message

Les plugins doivent posséder les contributions de schéma `describeMessageTool(...)` spécifiques au canal pour les primitives non-message telles que les réactions, les lectures et les sondages. La présentation d'envoi partagée doit utiliser le contrat générique `MessagePresentation` au lieu des champs de bouton, de composant, de bloc ou de carte natifs du provider. Consultez [Présentation des messages](/fr/plugins/message-presentation) pour le contrat, les règles de repli, le mappage des providers et la liste de contrôle pour les auteurs de plugins.

Les plugins capables d'envoyer déclarent ce qu'ils peuvent restituer via les capacités de message :

- `presentation` pour les blocs de présentation sémantique (`text`, `context`, `divider`, `buttons`, `select`)
- `delivery-pin` pour les demandes de livraison épinglée

Le cœur décide s'il faut restituer la présentation nativement ou la dégrader en texte. N'exposez pas de solutions de repli d'interface utilisateur natives du provider à partir de l'outil de message générique. Les assistants SDK obsolètes pour les schémas natifs hérités restent exportés pour les plugins tiers existants, mais les nouveaux plugins ne devraient pas les utiliser.

## Résolution de cible de canal

Les plugins de canal doivent posséder la sémantique de cible spécifique au canal. Gardez l'hôte sortant partagé générique et utilisez la surface de l'adaptateur de messagerie pour les règles du provider :

- `messaging.inferTargetChatType({ to })` détermine si une cible normalisée doit être traitée comme `direct`, `group` ou `channel` avant la recherche dans le répertoire.
- `messaging.targetResolver.looksLikeId(raw, normalized)` indique au cœur si une entrée doit passer directement à la résolution de type identifiant au lieu de la recherche dans le répertoire.
- `messaging.targetResolver.resolveTarget(...)` est le repli du plugin lorsque le cœur a besoin d'une résolution finale détenue par le provider après normalisation ou après un échec du répertoire.
- `messaging.resolveOutboundSessionRoute(...)` gère la construction des routes de session spécifiques au provider une fois la cible résolue.

Répartition recommandée :

- Utilisez `inferTargetChatType` pour les décisions de catégorie qui doivent se produire avant la recherche de pairs/groupes.
- Utilisez `looksLikeId` pour les vérifications « traiter ceci comme un identifiant de cible explicite/natif ».
- Utilisez `resolveTarget` pour le repli de normalisation spécifique au provider, et non pour une recherche large dans le répertoire.
- Conservez les identifiants natifs du provider tels que les identifiants de chat, de fil, JIDs, handles et identifiants de salle dans les valeurs `target` ou les paramètres spécifiques au provider, et non dans les champs génériques du SDK.

## Répertoires basés sur la configuration

Les plugins qui dérivent des entrées de répertoire à partir de la configuration doivent conserver cette logique dans le plugin et réutiliser les assistants partagés de `openclaw/plugin-sdk/directory-runtime`.

Utilisez ceci lorsqu'un canal a besoin de pairs/groupes basés sur la configuration, tels que :

- pairs de DM pilotés par liste blanche
- cartes de canal/groupe configurées
- replis de répertoire statique limités au compte

Les assistants partagés dans `directory-runtime` ne gèrent que les opérations génériques :

- filtrage des requêtes
- application des limites
- assistants de déduplication/normalisation
- construction de `ChannelDirectoryEntry[]`

L'inspection de compte spécifique au canal et la normalisation des identifiants doivent rester dans l'implémentation du plugin.

## Catalogues de fournisseurs

Les plugins de provider peuvent définir des catalogues de modèles pour l'inférence avec `registerProvider({ catalog: { run(...) { ... } } })`.

`catalog.run(...)` renvoie la même forme que OpenClaw écrit dans `models.providers` :

- `{ provider }` pour une entrée de provider
- `{ providers }` pour plusieurs entrées de provider

Utilisez `catalog` lorsque le plugin possède des ids de model spécifiques au provider, des URL de base par défaut, ou des métadonnées de model protégées par auth.

`catalog.order` contrôle quand le catalogue d'un plugin fusionne par rapport aux providers implicites intégrés de OpenClaw :

- `simple` : providers simples avec clé API ou pilotés par env
- `profile` : providers qui apparaissent lorsque des profils d'auth existent
- `paired` : providers qui synthétisent plusieurs entrées de provider associées
- `late` : dernière passe, après les autres providers implicites

Les providers ultérieurs l'emportent en cas de collision de clé, donc les plugins peuvent intentionnellement remplacer une entrée de provider intégrée avec le même id de provider.

Compatibilité :

- `discovery` fonctionne toujours comme un alias hérité
- si `catalog` et `discovery` sont tous deux enregistrés, OpenClaw utilise `catalog`

## Inspection de canal en lecture seule

Si votre plugin enregistre un canal, privilégiez l'implémentation de `plugin.config.inspectAccount(cfg, accountId)` avec `resolveAccount(...)`.

Pourquoi :

- `resolveAccount(...)` est le chemin d'exécution. Il est permis de supposer que les identifiants sont entièrement matérialisés et peut échouer rapidement lorsque les secrets requis sont manquants.
- Les chemins de commande en lecture seule tels que `openclaw status`, `openclaw status --all`, `openclaw channels status`, `openclaw channels resolve`, et les flux de réparation doctor/config ne devraient pas avoir besoin de matérialiser les identifiants d'exécution juste pour décrire la configuration.

Comportement recommandé pour `inspectAccount(...)` :

- Ne renvoyez que l'état descriptif du compte.
- Préservez `enabled` et `configured`.
- Incluez les champs de source/statut des identifiants lorsque cela est pertinent, tels que :
  - `tokenSource`, `tokenStatus`
  - `botTokenSource`, `botTokenStatus`
  - `appTokenSource`, `appTokenStatus`
  - `signingSecretSource`, `signingSecretStatus`
- Vous n'avez pas besoin de renvoyer les valeurs brutes des jetons juste pour signaler une disponibilité en lecture seule. Renoyer `tokenStatus: "available"` (et le champ source correspondant) suffit pour les commandes de type statut.
- Utilisez `configured_unavailable` lorsqu'une identifiant est configuré via SecretRef mais indisponible dans le chemin de commande actuel.

Cela permet aux commandes en lecture seule de signaler « configuré mais indisponible dans ce chemin de commande » au lieu de planter ou de signaler incorrectement que le compte n'est pas configuré.

## Paquets de plugins

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

Garantie de sécurité : chaque entrée `openclaw.extensions` doit rester à l'intérieur du répertoire du plugin après la résolution des liens symboliques. Les entrées qui s'échappent du répertoire du paquet sont rejetées.

Note de sécurité : `openclaw plugins install` installe les dépendances des plugins avec `npm install --omit=dev --ignore-scripts` (pas de scripts de cycle de vie, pas de dépendances de développement à l'exécution). Gardez les arbres de dépendances des plugins « pur JS/TS » et évitez les paquets qui nécessitent des builds `postinstall`.

Optionnel : `openclaw.setupEntry` peut pointer vers un module léger de configuration uniquement. Lorsque OpenClaw a besoin de surfaces de configuration pour un plugin de canal désactivé, ou lorsqu'un plugin de canal est activé mais toujours non configuré, il charge `setupEntry` à la place de l'entrée complète du plugin. Cela rend le démarrage et la configuration plus légers lorsque votre entrée principale du plugin câble également des outils, des crochets ou d'autres codes d'exécution uniquement.

Optionnel : `openclaw.startup.deferConfiguredChannelFullLoadUntilAfterListen` peut permettre à un plugin de canal d'opter pour le même chemin `setupEntry` pendant la phase de démarrage pré-écoute de la passerelle, même lorsque le canal est déjà configuré.

N'utilisez ceci que lorsque `setupEntry` couvre entièrement la surface de démarrage qui doit exister avant que la passerelle ne commence à écouter. En pratique, cela signifie que l'entrée de configuration doit enregistrer chaque capacité détenue par le canal dont dépend le démarrage, telle que :

- l'enregistrement du canal lui-même
- toutes les routes HTTP qui doivent être disponibles avant que la passerelle ne commence à écouter
- toutes les méthodes, outils ou services de passerine qui doivent exister durant cette même fenêtre

Si votre entrée complète possède toujours des capacités de démarrage requises, n'activez
pas ce drapeau. Conservez le plugin sur le comportement par défaut et laissez OpenClaw charger l'entrée complète pendant le démarrage.

Les canaux groupés peuvent également publier des helpers de surface de contrat de configuration uniquement que le cœur
peut consulter avant le chargement complet de l'environnement d'exécution du canal. La surface actuelle de
promotion de la configuration est :

- `singleAccountKeysToMove`
- `namedAccountPromotionKeys`
- `resolveSingleAccountPromotionTarget(...)`

Le cœur utilise cette surface lorsqu'il doit promouvoir une configuration de canal à compte unique héritée
dans `channels.<id>.accounts.*` sans charger l'entrée complète du plugin.
Matrix est l'exemple groupé actuel : il ne déplace que les clés d'auth/bootstrap dans un
compte promu nommé lorsque des comptes nommés existent déjà, et il peut préserver une
clé de compte par défaut configurée non canonique au lieu de toujours créer
`accounts.default`.

Ces adaptateurs de correctif de configuration maintiennent la découverte de la surface de contrat groupée paresseuse. Le temps
d'importation reste léger ; la surface de promotion n'est chargée qu'à la première utilisation au lieu de
ré-entrer dans le démarrage du canal groupé lors de l'importation du module.

Lorsque ces surfaces de démarrage incluent des méthodes de passerelle RPC, gardez-les sur un
préfixe spécifique au plugin. Les espaces de noms d'administration du cœur (`config.*`,
`exec.approvals.*`, `wizard.*`, `update.*`) restent réservés et résolvent toujours
à `operator.admin`, même si un plugin demande une portée plus étroite.

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
des indices d'installation via `openclaw.install`. Cela garde le catalogue principal exempt de données.

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
- `preferOver` : ids de plugin/canal de priorité inférieure que cette entrée de catalogue devrait dépasser
- `selectionDocsPrefix`, `selectionDocsOmitLabel`, `selectionExtras` : contrôles de copie de la surface de sélection
- `markdownCapable` : marque le channel comme compatible markdown pour les décisions de formatage sortant
- `exposure.configured` : masque le channel des surfaces de liste des channels configurés lorsqu'il est défini sur `false`
- `exposure.setup` : masque le channel des sélecteurs de configuration/installation interactifs lorsqu'il est défini sur `false`
- `exposure.docs` : marque le channel comme interne/privé pour les surfaces de navigation de la documentation
- `showConfigured` / `showInSetup` : alias hérités toujours acceptés pour compatibilité ; privilégiez `exposure`
- `quickstartAllowFrom` : active le channel dans le flux de `allowFrom` de démarrage rapide standard
- `forceAccountBinding` : nécessite une liaison de compte explicite même lorsqu'un seul compte existe
- `preferSessionLookupForAnnounceTarget` : privilégier la recherche de session lors de la résolution des cibles d'annonce

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
plutôt que de simplement ajouter une recherche mémoire ou des hooks.

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

## Ajout d'une nouvelle capacité

Lorsqu'un plugin a besoin d'un comportement qui ne correspond pas à l'API actuelle, ne contournez pas
le système de plugins par un accès privé. Ajoutez la capacité manquante.

Séquence recommandée :

1. définir le contrat principal
   Décidez du comportement partagé que le cœur doit posséder : stratégie, repli, fusion de configuration,
   cycle de vie, sémantique orientée channel, et forme des assistants d'exécution.
2. ajouter des surfaces d'enregistrement/exécution de plugin typées
   Étendez `OpenClawPluginApi` et/ou `api.runtime` avec la plus petite surface
   de capacité typée utile.
3. connecter le cœur et les consommateurs de channel/fonctionnalité
   Les plugins de channel et de fonctionnalité doivent consommer la nouvelle capacité via le cœur,
   et non en important directement une implémentation de fournisseur.
4. enregistrer les implémentations de fournisseur
   Les plugins de fournisseur enregistrent ensuite leurs backends pour la capacité.
5. ajouter une couverture de contrat
   Ajoutez des tests pour que la propriété et la forme de l'enregistrement restent explicites dans le temps.

C'est ainsi que OpenClaw reste opinionné sans devenir codé en dur selon la vision du monde
d'un seul fournisseur. Consultez le [Capability Cookbook](/fr/tools/capability-cookbook)
pour une liste de fichiers concrète et un exemple travaillé.

### Liste de contrôle des capacités

Lorsque vous ajoutez une nouvelle capacité, l'implémentation doit généralement toucher à ces
surfaces ensemble :

- types de contrat principal dans `src/<capability>/types.ts`
- assistant d'exécution/runner principal dans `src/<capability>/runtime.ts`
- surface d'enregistrement de l'API du plugin dans `src/plugins/types.ts`
- câblage du registre de plugins dans `src/plugins/registry.ts`
- exposition de l'exécution du plugin dans `src/plugins/runtime/*` lorsque les plugins
  de fonctionnalité/channel doivent la consommer
- assistants de capture/test dans `src/test-utils/plugin-registration.ts`
- assertions de propriété/contrat dans `src/plugins/contracts/registry.ts`
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
- les plugins de fournisseur possèdent les implémentations de fournisseur
- les plugins de fonctionnalité/channel consomment les assistants d'exécution
- les tests de contrat maintiennent la propriété explicite
