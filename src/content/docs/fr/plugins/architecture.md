---
summary: "Plugin internals: capability model, ownership, contracts, load pipeline, and runtime helpers"
read_when:
  - Building or debugging native OpenClaw plugins
  - Understanding the plugin capability model or ownership boundaries
  - Working on the plugin load pipeline or registry
  - Implementing provider runtime hooks or channel plugins
title: "Plugin internals"
sidebarTitle: "Internes"
---

This is the **deep architecture reference** for the OpenClaw plugin system. For practical guides, start with one of the focused pages below.

<CardGroup cols={2}>
  <Card title="Install and use plugins" icon="plug" href="/fr/tools/plugin">
    End-user guide for adding, enabling, and troubleshooting plugins.
  </Card>
  <Card title="Créer des plugins" icon="rocket" href="/fr/plugins/building-plugins">
    Tutoriel sur le premier plugin avec le plus petit manifeste fonctionnel.
  </Card>
  <Card title="Plugins de channel" icon="comments" href="/fr/plugins/sdk-channel-plugins">
    Créer un plugin de channel de messagerie.
  </Card>
  <Card title="Plugins de provider" icon="microchip" href="/fr/plugins/sdk-provider-plugins">
    Créer un plugin de model provider.
  </Card>
  <Card title="Présentation du SDK" icon="book" href="/fr/plugins/sdk-overview">
    Carte d'import et référence de l'API API.
  </Card>
</CardGroup>

## Modèle de capacité publique

Les capacités constituent le modèle de **plugin natif** public au sein de OpenClaw. Chaque plugin natif OpenClaw s'enregistre auprès d'un ou plusieurs types de capacités :

| Capacité                    | Méthode d'enregistrement                         | Exemples de plugins                           |
| --------------------------- | ------------------------------------------------ | --------------------------------------------- |
| Inférence de texte          | `api.registerProvider(...)`                      | `openai`, `anthropic`                         |
| Backend d'inférence CLI     | `api.registerCliBackend(...)`                    | `openai`, `anthropic`                         |
| Intégrations                | `api.registerEmbeddingProvider(...)`             | Plugins vectoriels détenus par le fournisseur |
| Synthèse vocale             | `api.registerSpeechProvider(...)`                | `elevenlabs`, `microsoft`                     |
| Transcription en temps réel | `api.registerRealtimeTranscriptionProvider(...)` | `openai`                                      |
| Voix en temps réel          | `api.registerRealtimeVoiceProvider(...)`         | `openai`                                      |
| Compréhension des médias    | `api.registerMediaUnderstandingProvider(...)`    | `openai`, `google`                            |
| Source des transcriptions   | `api.registerTranscriptSourceProvider(...)`      | `discord`                                     |
| Génération d'images         | `api.registerImageGenerationProvider(...)`       | `openai`, `google`, `fal`, `minimax`          |
| Génération de musique       | `api.registerMusicGenerationProvider(...)`       | `google`, `minimax`                           |
| Génération de vidéo         | `api.registerVideoGenerationProvider(...)`       | `qwen`                                        |
| Récupération Web            | `api.registerWebFetchProvider(...)`              | `firecrawl`                                   |
| Recherche Web               | `api.registerWebSearchProvider(...)`             | `google`                                      |
| Canal / messagerie          | `api.registerChannel(...)`                       | `msteams`, `matrix`                           |
| Découverte de Gateway       | `api.registerGatewayDiscoveryService(...)`       | `bonjour`                                     |

<Note>Un plugin qui n'enregistre aucune capacité mais fournit des hooks, des outils, des services de découverte ou des services en arrière-plan est un plugin **legacy hook-only**. Ce modèle est toujours entièrement pris en charge.</Note>

### Position en matière de compatibilité externe

Le model de capacité est intégré au cœur et utilisé par les plugins fournis/natifs aujourd'hui, mais la compatibilité des plugins externes nécessite toujours une barre plus stricte que « il est exporté, donc il est figé. »

| Situation des plugins                                    | Recommandations                                                                                                                                                               |
| -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Plugins externes existants                               | Maintenir le fonctionnement des intégrations basées sur des hooks ; c'est la ligne de base de compatibilité.                                                                  |
| Nouveaux plugins fournis/natifs                          | Privilégier l'enregistrement explicite des capacités par rapport aux interventions spécifiques aux fournisseurs ou aux nouvelles conceptions basées uniquement sur des hooks. |
| Plugins externes adoptant l'enregistrement des capacités | Autorisé, mais considérez les surfaces d'assistance spécifiques aux capacités comme évolutives, sauf si la documentation les marque comme stables.                            |

L'enregistrement des capacités est la direction prévue. Les hooks hérités restent le chemin le plus sûr sans rupture pour les plugins externes pendant la transition. Les sous-chemins d'assistance exportés ne sont pas tous égaux — préférez les contrats documentés étroits aux exportations d'assistance incidentes.

### Formes de plugins

OpenClaw classe chaque plugin chargé dans une forme basée sur son comportement d'enregistrement réel (et pas seulement les métadonnées statiques) :

<AccordionGroup>
  <Accordion title="plain-capability">Enregistre exactement un type de capacité (par exemple un plugin provider-only comme `mistral`).</Accordion>
  <Accordion title="hybrid-capability">Enregistre plusieurs types de capacités (par exemple `openai` possède l'inférence de texte, la parole, la compréhension des médias et la génération d'images).</Accordion>
  <Accordion title="hook-only">Enregistre uniquement des hooks (typés ou personnalisés), aucune capacité, outil, commande ou service.</Accordion>
  <Accordion title="non-capability">Enregistre des outils, commandes, services ou routes mais aucune capacité.</Accordion>
</AccordionGroup>

Utilisez `openclaw plugins inspect <id>` pour voir la forme d'un plugin et la répartition de ses capacités. Voir la [référence CLI](/fr/cli/plugins#inspect) pour plus de détails.

### Hooks hérités

Le hook `before_agent_start` reste pris en charge en tant que chemin de compatibilité pour les plugins basés uniquement sur des hooks. Les plugins réels existants dépendent toujours de celui-ci.

Direction :

- garder en fonctionnement
- documenter comme hérité
- privilégiez `before_model_resolve` pour le travail de substitution de model/provider
- privilégiez `before_prompt_build` pour le travail de mutation de prompt
- supprimer uniquement après la baisse de l'utilisation réelle et que la couverture des fixtures prouve la sécurité de la migration

### Signaux de compatibilité

Lorsque vous exécutez `openclaw doctor` ou `openclaw plugins inspect <id>`, vous pouvez voir l'une de ces étiquettes :

| Signal                           | Signification                                                            |
| -------------------------------- | ------------------------------------------------------------------------ |
| **config valide**                | La configuration est analysée correctement et les plugins sont résolus   |
| **avis de compatibilité**        | Le plugin utilise un modèle pris en charge mais ancien (ex. `hook-only`) |
| **avertissement d'obsolescence** | Le plugin utilise `before_agent_start`, qui est déconseillé              |
| **erreur bloquante**             | La configuration est invalide ou le plugin n'a pas pu être chargé        |

Ni `hook-only` ni `before_agent_start` ne briseront votre plugin aujourd'hui : `hook-only` est consultatif, et `before_agent_start` ne déclenche qu'un avertissement. Ces signaux apparaissent également dans `openclaw status --all` et `openclaw plugins doctor`.

## Aperçu de l'architecture

Le système de plugins de OpenClaw comporte quatre couches :

<Steps>
  <Step title="Manifest + discovery">OpenClaw trouve les plugins candidats à partir des chemins configurés, des racines de l'espace de travail, des racines globales des plugins et des plugins groupés. La découverte lit d'abord les manifests natifs `openclaw.plugin.json` ainsi que les manifests de bundles pris en charge.</Step>
  <Step title="Enablement + validation">Le cœur décide si un plugin découvert est activé, désactivé, bloqué ou sélectionné pour un emplacement exclusif tel que la mémoire.</Step>
  <Step title="Runtime loading">Les plugins natifs OpenClaw sont chargés dans le processus et enregistrent leurs capacités dans un registre central. Le JavaScript empaqueté se charge via `require` natif ; le TypeScript source local tiers est le repli d'urgence Jiti. Les bundles compatibles sont normalisés en enregistrements de registre sans importer de code d'exécution.</Step>
  <Step title="Surface consumption">Le reste de OpenClaw lit le registre pour exposer les outils, canaux, configuration du fournisseur, hooks, routes HTTP, commandes CLI et services.</Step>
</Steps>

Pour le CLI des plugins spécifiquement, la découverte des commandes racine est divisée en deux phases :

- les métadonnées au moment de l'analyse proviennent de `registerCli(..., { descriptors: [...] })`
- le vrai module du plugin CLI peut rester paresseux et s'enregistrer lors de la première invocation

Cela maintient le code CLI détenue par le plugin à l'intérieur du plugin tout en permettant à OpenClaw de réserver les noms des commandes racines avant l'analyse.

La limite de conception importante :

- la validation du manifeste/config doit fonctionner à partir des **métadonnées de manifeste/schéma** sans exécuter le code du plugin
- la découverte des capacités natives peut charger le code d'entrée de confiance du plugin pour construire un instantané de registre non activant
- le comportement d'exécution natif provient du chemin `register(api)` du module de plugin avec `api.registrationMode === "full"`

Cette séparation permet à OpenClaw de valider la configuration, d'expliquer les plugins manquants/désactivés et de construire des indices d'interface/schéma avant que l'exécution complète ne soit active.

### Instantané des métadonnées du plugin et table de recherche

Le démarrage de Gateway construit un `PluginMetadataSnapshot` pour l'instantané de la configuration actuelle. L'instantané contient uniquement des métadonnées : il stocke l'index des plugins installés, le registre des manifests, les diagnostics de manifeste, les cartes de propriétaires, un normalisateur d'ID de plugin et les enregistrements de manifeste. Il ne contient pas les modules de plugin chargés, les SDK de provider, le contenu des packages ou les exportations d'exécution.

La validation de configuration tenant compte des plugins, l'activation automatique au démarrage et l'amorçage des plugins Gateway consomment cet instantané au lieu de reconstruire indépendamment les métadonnées de manifeste/index. `PluginLookUpTable` est dérivé du même instantané et ajoute le plan de plugin de démarrage pour la configuration d'exécution actuelle.

Après le démarrage, le Gateway conserve l'instantané des métadonnées actuelles en tant que produit d'exécution remplaçable. La découverte répétée du provider à l'exécution peut emprunter cet instantané au lieu de reconstruire l'index installé et le registre des manifestes pour chaque passage de catalogue de provider. L'instantané est effacé ou remplacé lors de l'arrêt du Gateway, des modifications de l'inventaire de configuration/plugins et des écritures de l'index installé ; les appelants reviennent au chemin froid de manifeste/index lorsqu'aucun instantané actuel compatible n'existe. Les vérifications de compatibilité doivent inclure les racines de découverte de plugins telles que `plugins.load.paths` et l'espace de travail de l'agent par défaut, car les plugins de l'espace de travail font partie de la portée des métadonnées.

L'instantané et la table de recherche maintiennent les décisions répétées de démarrage sur le chemin rapide :

- propriété de channel
- démarrage différé de channel
- ids de plugin de démarrage
- propriété du backend provider et CLI
- configuration du provider, alias de commande, provider du catalogue de modèles et propriété du contrat manifeste
- validation du schéma de configuration du plugin et du schéma de configuration du channel
- décisions d'auto-activation au démarrage

La limite de sécurité est le remplacement de l'instantané, et non la mutation. Reconstruisez l'instantané lorsque la configuration, l'inventaire des plugins, les enregistrements d'installation ou la stratégie d'index persistante changent. Ne le traitez pas comme un registre global modifiable large et ne conservez pas d'instantanés historiques non bornés. Le chargement des plugins au moment de l'exécution reste séparé des instantanés de métadonnées, afin qu'un état d'exécution périmé ne puisse pas être masqué derrière un cache de métadonnées.

La règle de cache est documentée dans [Plugin architecture internals](/fr/plugins/architecture-internals#plugin-cache-boundary) : les métadonnées de manifeste et de découverte sont fraîches, sauf si un appelant détient un instantané explicite, une table de recherche ou un registre de manifestes pour le flux actuel. Les caches de métadonnées cachés et les TTL d'horloge ne font pas partie du chargement des plugins. Seuls les caches de chargeur d'exécution, de module et d'artefact de dépendance peuvent persister après que le code ou les artefacts installés ont été réellement chargés.

Certains appelants de chemin froid reconstruisent encore directement les registres de manifestes à partir de l'index installé persistant des plugins au lieu de recevoir un Gateway `PluginLookUpTable`. Ce chemin reconstruit désormais le registre à la demande ; il est préférable de transmettre la table de recherche actuelle ou un registre de manifestes explicite via les flux d'exécution lorsqu'un appelant en possède déjà un.

### Planification de l'activation

La planification de l'activation fait partie du plan de contrôle. Les appelants peuvent demander quels plugins sont pertinents pour une commande, un provider, un channel, une route, un harnais d'agent ou une capacité spécifique avant de charger des registres d'exécution plus larges.

Le planificateur maintient le comportement actuel du manifeste compatible :

- Les champs `activation.*` sont des indications explicites pour le planificateur
- `providers`, `channels`, `commandAliases`, `setup.providers`, `contracts.tools` et les hooks restent un repli pour la propriété du manifeste
- l'API du planificateur ids-only reste disponible pour les appelants existants
- l'API du plan signale des étiquettes de raison afin que les diagnostics puissent distinguer les indications explicites du repli de propriété

<Warning>Ne traitez pas `activation` comme un hook de cycle de vie ou un remplacement pour `register(...)`. Ce sont des métadonnées utilisées pour restreindre le chargement. Privilégiez les champs de propriété lorsqu'ils décrivent déjà la relation ; utilisez `activation` uniquement pour des indications supplémentaires du planificateur.</Warning>

### Plugins de channel et l'outil de message partagé

Les plugins de canal n'ont pas besoin d'enregistrer un outil d'envoi/de modification/de réaction séparé pour les actions de chat normales. OpenClaw conserve un outil partagé OpenClaw`message` dans le cœur, et les plugins de canal possèdent la découverte et l'exécution spécifiques au canal en arrière-plan.

La limite actuelle est :

- le cœur possède l'hôte de l'outil partagé `message`, le câblage des invites, la tenue des registres de session/discussion et la répartition de l'exécution
- les plugins de channel possèdent la découverte des actions délimitées, la découverte des capacités et tous les fragments de schéma spécifiques au canal
- les plugins de channel possèdent la grammaire de conversation de session spécifique au fournisseur, telle que l'encodage des identifiants de fil dans les identifiants de conversation ou l'héritage des conversations parentes
- les plugins de channel exécutent l'action finale via leur adaptateur d'action

Pour les plugins de canal, la surface du SDK est `ChannelMessageActionAdapter.describeMessageTool(...)`. Cet appel de découverte unifié permet à un plugin de renvoyer ses actions visibles, ses capacités et ses contributions de schéma ensemble, afin que ces éléments ne se déconnectent pas.

Lorsqu'un paramètre d'outil de message spécifique à un canal contient une source média telle qu'un chemin local ou une URL média distante, le plugin doit également renvoyer `mediaSourceParams` depuis `describeMessageTool(...)`. Le cœur utilise cette liste explicite pour appliquer la normalisation des chemins du bac à sable et les indices d'accès aux médias sortants sans coder en dur les noms de paramètres appartenant au plugin. Privilégiez les cartes délimitées par les actions plutôt qu'une liste plate unique à l'échelle du canal, afin qu'un paramètre média réservé au profil ne soit pas normalisé sur des actions sans rapport telles que `send`.

Le cœur transmet la portée d'exécution à cette étape de découverte. Les champs importants incluent :

- `accountId`
- `currentChannelId`
- `currentThreadTs`
- `currentMessageId`
- `sessionKey`
- `sessionId`
- `agentId`
- inbound de confiance `requesterSenderId`

Cela est important pour les plugins sensibles au contexte. Un canal peut masquer ou exposer des actions de message en fonction du compte actif, de la salle/discussion/message actuel ou de l'identité du demandeur de confiance sans coder en dur des branches spécifiques au canal dans l'outil central `message`.

C'est pourquoi les modifications du routage du runner intégré sont toujours un travail de plugin : le runner est responsable de la transmission de l'identité de chat/session actuelle dans les limites de la découverte du plugin afin que l'outil partagé `message` expose la bonne surface appartenant au canal pour le tour actuel.

Pour les assistants d'exécution appartenant au canal, les plugins groupés doivent conserver l'environnement d'exécution dans leurs propres modules d'extension. Le cœur ne possède plus les environnements d'exécution d'actions de message de Discord, Slack, Telegram ou WhatsApp sous `src/agents/tools`. Nous ne publions pas de sous-chemins `plugin-sdk/*-action-runtime` séparés, et les plugins groupés doivent importer leur propre code d'exécution local directement à partir de leurs modules détenus par l'extension.

La même limite s'applique généralement aux coutures du SDK nommées par le provider : le cœur ne doit pas importer de barils de commodité spécifiques au canal pour Slack, Discord, Signal, WhatsApp ou des extensions similaires. Si le cœur a besoin d'un comportement, il doit soit consommer le propre barrel `api.ts` / `runtime-api.ts` du plugin groupé, soit promouvoir le besoin en une capacité générique étroite dans le SDK partagé.

Les plugins groupés suivent la même règle. Le `runtime-api.ts` d'un plugin groupé ne doit pas ré-exporter sa propre façade `openclaw/plugin-sdk/<plugin-id>` marquée. Ces façades marquées restent des shims de compatibilité pour les plugins externes et les anciens consommateurs, mais les plugins groupés doivent utiliser des exportations locales ainsi que des sous-chemins de SDK génériques étroits tels que `openclaw/plugin-sdk/channel-policy`, `openclaw/plugin-sdk/runtime-store` ou `openclaw/plugin-sdk/webhook-ingress`. Le nouveau code ne doit pas ajouter de façades de SDK spécifiques à un ID de plugin, sauf si la limite de compatibilité pour un écosystème externe existant l'exige.

Pour les sondages spécifiquement, il existe deux chemins d'exécution :

- `outbound.sendPoll` est la base partagée pour les canaux qui correspondent au modèle de polling commun
- `actions.handleAction("poll")` est le chemin privilégié pour les sémantiques de polling spécifiques au canal ou les paramètres de polling supplémentaires

Le cœur diffère désormais l'analyse du sondage partagé jusqu'à ce que la répartition du sondage du plugin décline l'action, afin que les gestionnaires de sondage détenus par le plugin puissent accepter les champs de sondage spécifiques au canal sans être bloqués par l'analyseur de sondage générique au préalable.

Voir [Plugin architecture internals](/fr/plugins/architecture-internals) pour la séquence complète de démarrage.

## Modèle de propriété des capacités

OpenClaw considère un plugin natif comme la limite de propriété pour une **entreprise** ou une **fonctionnalité**, et non comme un fourre-tout d'intégrations sans rapport.

Cela signifie :

- un plugin d'entreprise devrait généralement posséder toutes les interfaces de cette entreprise tournées vers OpenClaw
- un plugin de fonctionnalité devrait généralement posséder l'interface complète de la fonctionnalité qu'il introduit
- les canaux devraient consommer les capacités centrales partagées au lieu de réimplémenter le comportement du fournisseur (provider) ad hoc

<AccordionGroup>
  <Accordion title="Fournisseur multi-capacités">
    `openai` possède l'inférence de texte, la synthèse vocale, la voix en temps réel, la compréhension des médias et la génération d'images. `google` possède l'inférence de texte ainsi que la compréhension des médias, la génération d'images et la recherche web. `qwen` possède l'inférence de texte ainsi que la compréhension des médias et la génération vidéo.
  </Accordion>
  <Accordion title="Fournisseur mono-capacité">`elevenlabs` et `microsoft` possèdent la synthèse vocale ; `firecrawl` possède la récupération web (web-fetch) ; `minimax` / `mistral` / `moonshot` / `zai` possèdent les backends de compréhension des médias.</Accordion>
  <Accordion title="Plugin de fonctionnalité">`voice-call` possède le transport d'appel, les outils, le CLI, les routes et le pontage de flux média Twilio, mais consomme les capacités partagées de synthèse vocale, de transcription en temps réel et de voix en temps réel au lieu d'importer directement les plugins fournisseurs.</Accordion>
</AccordionGroup>

L'état final prévu est :

- OpenAI réside dans un seul plugin même s'il couvre les modèles textuels, la synthèse vocale, les images et la future vidéo
- un autre fournisseur peut faire de même pour sa propre surface fonctionnelle
- les channels se soucient peu du plugin fournisseur qui possède le provider ; ils consomment le contrat de capacité partagée exposé par le core

Voici la distinction clé :

- **plugin** = limite de propriété
- **capacité** = contrat central que plusieurs plugins peuvent implémenter ou consommer

Ainsi, si OpenClaw ajoute un nouveau domaine tel que la vidéo, la première question n'est pas « quel fournisseur doit coder en dur la gestion de la vidéo ? ». La première question est « quel est le contrat de capacité central pour la vidéo ? ». Une fois que ce contrat existe, les plugins fournisseurs peuvent s'y enregistrer et les plugins de fonctionnalités/canaux peuvent le consommer.

Si la capacité n'existe pas encore, la bonne approche est généralement :

<Steps>
  <Step title="Définir la capacité">Définir la capacité manquante dans le core.</Step>
  <Step title="Exposer via le SDK" API>
    L'exposer via l'API de plugin/runtime de manière typée.
  </Step>
  <Step title="Connecter les consommateurs">Connecter les canaux/fonctionnalités à cette capacité.</Step>
  <Step title="Implémentations fournisseurs">Laisser les plugins fournisseurs enregistrer des implémentations.</Step>
</Steps>

Cela permet de garder la propriété explicite tout en évitant un comportement central qui dépend d'un seul fournisseur ou d'un chemin de code spécifique à un plugin ponctuel.

### Superposition des capacités

Utilisez ce modèle mental pour décider où le code doit résider :

<Tabs>
  <Tab title="Couche de capacité centrale">Orchestration partagée, stratégie, repli, règles de fusion de configuration, sémantique de livraison et contrats typés.</Tab>
  <Tab title="Couche de plugin fournisseur">API spécifiques aux fournisseurs, authentification, catalogues de modèles, synthèse vocale, génération d'images, backends vidéo futurs, points de terminaison d'utilisation.</Tab>
  <Tab title="Channel/feature plugin layer" SlackDiscord>
    Intégration Slack/Discord/appel vocal/etc. qui consomme les capacités principales et les présente sur une surface.
  </Tab>
</Tabs>

Par exemple, le TTS suit cette forme :

- le cœur possède la politique TTS de temps de réponse, l'ordre de repli, les préférences et la diffusion par canal
- `openai`, `elevenlabs` et `microsoft` possèdent des implémentations de synthèse
- `voice-call` consomme l'assistant d'exécution TTS téléphonique

Ce même modèle devrait être privilégié pour les futures capacités.

### Exemple de plugin d'entreprise à capacités multiples

Un plugin d'entreprise doit paraître cohérent de l'extérieur. Si OpenClaw dispose de contrats partagés pour les modèles, la parole, la transcription en temps réel, la voix en temps réel, la compréhension des médias, la génération d'images, la génération de vidéos, la récupération web et la recherche web, un fournisseur peut posséder toutes ses surfaces en un seul endroit :

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

- un plugin possède la surface fournisseur
- le cœur possède toujours les contrats de capacité
- les canaux et les plugins de fonctionnalité consomment les assistants `api.runtime.*`, et non le code fournisseur
- les tests de contrat peuvent affirmer que le plugin a enregistré les capacités qu'il prétend posséder

### Exemple de capacité : compréhension vidéo

OpenClaw traite déjà la compréhension d'image/audio/vidéo comme une capacité partagée. Le même modèle de propriété s'y applique :

<Steps>
  <Step title="Core defines the contract">Le cœur définit le contrat de compréhension des médias.</Step>
  <Step title="Enregistrement des plugins fournisseurs">Les plugins fournisseurs enregistrent `describeImage`, `transcribeAudio` et `describeVideo` selon le cas.</Step>
  <Step title="Consumers use the shared behavior">Les canaux et les plugins de fonctionnalités consomment le comportement principal partagé au lieu de se connecter directement au code fournisseur.</Step>
</Steps>

Cela évite d'intégrer les hypothèses vidéo d'un fournisseur dans le cœur. Le plugin possède la surface du fournisseur ; le cœur possède le contrat de capacité et le comportement de repli.

La génération vidéo utilise déjà cette même séquence : le cœur possède le contrat de capacité typé et l'assistant d'exécution, et les plugins fournisseurs enregistrent des implémentations `api.registerVideoGenerationProvider(...)` par rapport à celui-ci.

Besoin d'une liste de contrôle concrète pour le déploiement ? Voir [Capability Cookbook](/fr/tools/capability-cookbook).

## Contrats et application des règles

La surface de l'API de plugin est intentionnellement typée et centralisée dans API`OpenClawPluginApi`. Ce contrat définit les points d'enregistrement pris en charge et les assistants d'exécution dont un plugin peut dépendre.

Pourquoi c'est important :

- les auteurs de plugins disposent d'une norme interne stable
- le cœur peut rejeter la propriété en double, telle que deux plugins enregistrant le même id fournisseur
- le démarrage peut afficher des diagnostics exploitables pour les enregistrements malformés
- les tests de contrat peuvent appliquer la propriété des plugins groupés et empêcher la dérive silencieuse

Il y a deux niveaux d'application des règles :

<AccordionGroup>
  <Accordion title="Runtime registration enforcement">Le registre de plugins valide les enregistrements lors du chargement des plugins. Exemples : les ids fournisseur en double, les ids fournisseur de reconnaissance vocale en double et les enregistrements malformés produisent des diagnostics de plugin au lieu d'un comportement indéfini.</Accordion>
  <Accordion title="Contract tests">Les plugins groupés sont capturés dans les registres de contrats lors des exécutions de tests afin qu'OpenClaw puisse déclarer explicitement la propriété. Aujourd'hui, cela est utilisé pour les fournisseurs de modèles, les fournisseurs de reconnaissance vocale, les fournisseurs de recherche Web et la propriété des enregistrements groupés.</Accordion>
</AccordionGroup>

L'effet pratique est qu'OpenClaw sait, à l'avance, quel plugin possède quelle surface. Cela permet au cœur et aux canaux de se composer de manière transparente car la propriété est déclarée, typée et testable plutôt qu'implicite.

### Ce qui appartient à un contrat

<Tabs>
  <Tab title="Good contracts">
    - typé
    - petit
    - spécifique à la capacité
    - détenu par le cœur
    - réutilisable par plusieurs plugins
    - consommable par les canaux/fonctionnalités sans connaissance du fournisseur

  </Tab>
  <Tab title="Mauvais contrats">
    - stratégie spécifique au fournisseur cachée dans le cœur
    - échappatoires ponctuelles pour plugins qui contournent le registre
    - code de canal accédant directement à une implémentation de fournisseur
    - objets d'exécution ad hoc qui ne font pas partie de `OpenClawPluginApi` ou `api.runtime`

  </Tab>
</Tabs>

En cas de doute, augmentez le niveau d'abstraction : définissez d'abord la capacité, puis laissez les plugins s'y connecter.

## Modèle d'exécution

Les plugins natifs OpenClaw s'exécutent **en cours de traitement** (in-process) avec le Gateway. Ils ne sont pas isolés (sandboxed). Un plugin natif chargé a la même limite de confiance au niveau du processus que le code cœur.

<Warning>Implications des plugins natifs : un plugin peut enregistrer des outils, des gestionnaires réseau, des hooks et des services ; un bug de plugin peut planter ou déstabiliser la passerelle ; et un plugin natif malveillant équivaut à une exécution de code arbitraire à l'intérieur du processus OpenClaw.</Warning>

Les bundles compatibles sont plus sûrs par défaut car OpenClaw les traite actuellement comme des packs de métadonnées/contenu. Dans les versions actuelles, cela signifie principalement des compétences groupées (bundled skills).

Utilisez des listes d'autorisation (allowlists) et des chemins d'installation/chargement explicites pour les plugins non groupés. Traitez les plugins de l'espace de travail comme du code de développement, et non comme des valeurs par défaut de production.

Pour les noms de packages d'espace de travail regroupés, gardez l'identifiant du plugin ancré dans le nom npm : npm`@openclaw/<id>` par défaut, ou un suffixe typé approuvé tel que `-provider`, `-plugin`, `-speech`, `-sandbox`, ou `-media-understanding` lorsque le package expose intentionnellement un rôle de plugin plus étroit.

<Note>
  **Note de confiance :** `plugins.allow` fait confiance aux **identifiants de plugin**, et non à la provenance de la source. Un plugin d'espace de travail avec le même identifiant qu'un plugin regroupé masque intentionnellement la copie regroupée lorsque ce plugin d'espace de travail est activé/autorisé. Ceci est normal et utile pour le développement local, les tests correctifs et les correctifs
  urgents. La confiance des plugins regroupés est résolue à partir de l'instantané de la source — le manifeste et le code sur le disque au moment du chargement — plutôt que des métadonnées d'installation. Un enregistrement d'installation corrompu ou substitué ne peut pas élargir silencieusement la surface de confiance d'un plugin regroupé au-delà de ce que la source réelle réclame.
</Note>

## Limite d'exportation

OpenClaw exporte des capacités, et non des commodités de mise en œuvre.

Gardez l'enregistrement des capacités public. Supprimez les exportations d'assistance non contractuelles :

- sous-chemins d'assistance spécifiques aux plugins groupés
- sous-chemins de plomberie d'exécution non destinés à être une API publique
- assistants de commodité spécifiques aux fournisseurs
- assistants de configuration/onboarding qui sont des détails de mise en œuvre

Les sous-chemins d'assistants de plugins regroupés réservés ont été retirés de la carte d'exportation du SDK généré. Gardez les assistants spécifiques au propriétaire à l'intérieur du package du plugin propriétaire ; promouvez uniquement le comportement d'hôte réutilisable vers des contrats de SDK génériques tels que `plugin-sdk/gateway-runtime`, `plugin-sdk/security-runtime` et `plugin-sdk/plugin-config-runtime`.

## Fonctionnement interne et référence

Pour le pipeline de chargement, le modèle de registre, les hooks d'exécution du fournisseur, les routes HTTP du Gateway, les schémas d'outil de message, la résolution de cible de canal, les catalogues de fournisseurs, les plugins du moteur de contexte et le guide pour ajouter une nouvelle capacité, voir [Plugin architecture internals](Gateway/en/plugins/architecture-internals).

## Connexes

- [Créer des plugins](/fr/plugins/building-plugins)
- [Manifeste du plugin](/fr/plugins/manifest)
- [Configuration du SDK de plugin](/fr/plugins/sdk-setup)
