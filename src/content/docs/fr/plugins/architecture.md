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

| Capacité                    | Méthode d'enregistrement                         | Exemples de plugins                  |
| --------------------------- | ------------------------------------------------ | ------------------------------------ |
| Inférence de texte          | `api.registerProvider(...)`                      | `openai`, `anthropic`                |
| Backend d'inférence CLI     | `api.registerCliBackend(...)`                    | `openai`, `anthropic`                |
| Synthèse vocale             | `api.registerSpeechProvider(...)`                | `elevenlabs`, `microsoft`            |
| Transcription en temps réel | `api.registerRealtimeTranscriptionProvider(...)` | `openai`                             |
| Voix en temps réel          | `api.registerRealtimeVoiceProvider(...)`         | `openai`                             |
| Compréhension des médias    | `api.registerMediaUnderstandingProvider(...)`    | `openai`, `google`                   |
| Génération d'images         | `api.registerImageGenerationProvider(...)`       | `openai`, `google`, `fal`, `minimax` |
| Génération de musique       | `api.registerMusicGenerationProvider(...)`       | `google`, `minimax`                  |
| Génération de vidéos        | `api.registerVideoGenerationProvider(...)`       | `qwen`                               |
| Récupération web            | `api.registerWebFetchProvider(...)`              | `firecrawl`                          |
| Recherche web               | `api.registerWebSearchProvider(...)`             | `google`                             |
| Canal / messagerie          | `api.registerChannel(...)`                       | `msteams`, `matrix`                  |
| Gateway discovery           | `api.registerGatewayDiscoveryService(...)`       | `bonjour`                            |

<Note>Un plugin qui n'enregistre aucune capacité mais fournit des hooks, des outils, des services de découverte ou des services d'arrière-plan est un plugin **legacy hook-only**. Ce modèle est toujours entièrement pris en charge.</Note>

### Posture de compatibilité externe

Le modèle de capacité est intégré au cœur et utilisé aujourd'hui par les plugins groupés/natifs, mais la compatibilité des plugins externes nécessite encore une barre plus stricte que « il est exporté, donc il est figé ».

| Situation du plugin                                      | Conseils                                                                                                                                                               |
| -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Plugins externes existants                               | Maintenir le fonctionnement des intégrations basées sur des hooks ; c'est la ligne de base de compatibilité.                                                           |
| Nouveaux plugins groupés/natifs                          | Privilégier l'enregistrement explicite des capacités plutôt que les interventions spécifiques aux fournisseurs ou les nouveaux modèles basés uniquement sur des hooks. |
| Plugins externes adoptant l'enregistrement des capacités | Autorisé, mais considérez les surfaces d'assistance spécifiques aux capacités comme évolutives, sauf si la documentation les marque comme stables.                     |

L'enregistrement des capacités est la direction prévue. Les hooks traditionnels restent le chemin le plus sûr sans rupture pour les plugins externes pendant la transition. Les sous-chemins d'assistance exportés ne sont pas tous égaux — préférez les contrats documentés étroits aux exportations d'assistance incidentes.

### Formes de plugins

OpenClaw classe chaque plugin chargé dans une forme en fonction de son comportement d'enregistrement réel (et pas seulement des métadonnées statiques) :

<AccordionGroup>
  <Accordion title="plain-capability">Enregistre exactement un type de capacité (par exemple un plugin provider uniquement comme `mistral`).</Accordion>
  <Accordion title="hybrid-capability">Enregistre plusieurs types de fonctionnalités (par exemple, `openai` possède l'inférence de texte, la parole, la compréhension des médias et la génération d'images).</Accordion>
  <Accordion title="hook-only">Enregistre uniquement des hooks (typés ou personnalisés), aucune fonctionnalité, outil, commande ou service.</Accordion>
  <Accordion title="non-capability">Enregistre des outils, commandes, services ou routes mais aucune fonctionnalité.</Accordion>
</AccordionGroup>

Utilisez `openclaw plugins inspect <id>` pour voir la forme d'un plugin et la répartition de ses fonctionnalités. Voir la [référence CLI](/fr/cli/plugins#inspect) pour plus de détails.

### Hooks hérités

Le hook `before_agent_start` reste pris en charge en tant que chemin de compatibilité pour les plugins basés uniquement sur des hooks. Les plugins réels existants en dépendent toujours.

Direction :

- le maintenir opérationnel
- le documenter comme obsolète
- préférer `before_model_resolve` pour le travail de remplacement de model/provider
- préférer `before_prompt_build` pour le travail de mutation de prompt
- supprimer uniquement après la baisse de l'usage réel et que la couverture par des fixtures prouve la sécurité de la migration

### Signaux de compatibilité

Lorsque vous exécutez `openclaw doctor` ou `openclaw plugins inspect <id>`, vous pouvez voir l'une de ces étiquettes :

| Signal                           | Signification                                                                |
| -------------------------------- | ---------------------------------------------------------------------------- |
| **config valide**                | La config est correctement analysée et les plugins sont résolus              |
| **avis de compatibilité**        | Le plugin utilise un modèle pris en charge mais ancien (par ex. `hook-only`) |
| **avertissement d'obsolescence** | Le plugin utilise `before_agent_start`, qui est déprécié                     |
| **erreur fatale**                | La configuration n'est pas valide ou le plugin a échoué à charger            |

Ni `hook-only` ni `before_agent_start` ne briseront votre plugin aujourd'hui : `hook-only` est consultatif et `before_agent_start` ne déclenche qu'un avertissement. Ces signaux apparaissent également dans `openclaw status --all` et `openclaw plugins doctor`.

## Vue d'ensemble de l'architecture

Le système de plugins de OpenClaw possède quatre couches :

<Steps>
  <Step title="Manifeste + découverte">OpenClaw trouve les plugins candidats dans les chemins configurés, les racines de l'espace de travail, les racines globales des plugins et les plugins groupés. La découverte lit d'abord les manifestes natifs `openclaw.plugin.json` ainsi que les manifestes de bundles pris en charge.</Step>
  <Step title="Activation + validation">Le cœur décide si un plugin découvert est activé, désactivé, bloqué ou sélectionné pour un emplacement exclusif tel que la mémoire.</Step>
  <Step title="Chargement de l'exécution">Les plugins natifs OpenClaw sont chargés dans le processus via jiti et enregistrent les capacités dans un registre central. Les bundles compatibles sont normalisés en enregistrements de registre sans importer le code d'exécution.</Step>
  <Step title="Consommation de surface">Le reste de OpenClaw lit le registre pour exposer les outils, les canaux, la configuration du provider, les hooks, les routes HTTP, les commandes CLI et les services.</Step>
</Steps>

Pour le CLI des plugins spécifiquement, la découverte des commandes racines est divisée en deux phases :

- les métadonnées de l'analyse proviennent de `registerCli(..., { descriptors: [...] })`
- le vrai module de CLI du plugin peut rester paresseux et s'enregistrer lors de la première invocation

Cela maintient le code CLI détenue par le plugin à l'intérieur du plugin tout en permettant à OpenClaw de réserver les noms de commandes racines avant l'analyse.

La limite de conception importante :

- la validation du manifeste/config devrait fonctionner à partir des **métadonnées de manifeste/schéma** sans exécuter le code du plugin
- la découverte des capacités natives peut charger le code d'entrée de plugin de confiance pour construire un instantané de registre non activant
- le comportement d'exécution natif provient du chemin `register(api)` du module de plugin avec `api.registrationMode === "full"`

Cette division permet à OpenClaw de valider la configuration, d'expliquer les plugins manquants ou désactivés, et de générer des indices d'interface/schéma avant que le runtime complet ne soit actif.

### Instantané des métadonnées du plugin et table de recherche

Le démarrage du Gateway construit un `PluginMetadataSnapshot` pour l'instantané de la configuration actuelle. L'instantané est basé sur les métadonnées uniquement : il stocke l'index des plugins installés, le registre des manifestes, les diagnostics de manifeste, les cartes de propriétaires, un normalisateur d'ID de plugin et les enregistrements de manifestes. Il ne contient pas les modules de plugin chargés, les SDK de fournisseur, le contenu des packages ou les exportations du runtime.

La validation de configuration tenant compte des plugins, l'activation automatique au démarrage et l'amorçage des plugins du Gateway consomment cet instantané au lieu de reconstruire indépendamment les métadonnées de manifeste/d'index. `PluginLookUpTable` est dérivé du même instantané et ajoute le plan de plugin de démarrage pour la configuration runtime actuelle.

Après le démarrage, le Gateway conserve l'instantané des métadonnées actuelles en tant que produit runtime remplaçable. Les découvertes répétées de fournisseurs runtime peuvent emprunter cet instantané au lieu de reconstruire l'index installé et le registre des manifestes pour chaque passage de catalogue de fournisseur. L'instantané est effacé ou remplacé lors de l'arrêt du Gateway, des modifications de l'inventaire de configuration/plugins et des écritures de l'index installé ; les appelants reviennent au chemin froid de manifeste/index lorsqu aucun instantané actuel compatible n'existe. Les vérifications de compatibilité doivent inclure les racines de découverte de plugins telles que `plugins.load.paths` et l'espace de travail de l'agent par défaut, car les plugins de l'espace de travail font partie de la portée des métadonnées.

L'instantané et la table de recherche maintiennent les décisions répétées de démarrage sur le chemin rapide :

- propriété du canal
- démarrage différé du canal
- ids des plugins de démarrage
- propriété du backend du fournisseur et de la CLI
- configuration du fournisseur, alias de commande, fournisseur du catalogue de modèles, et propriété du contrat de manifeste
- validation du schéma de configuration du plugin et du schéma de configuration du canal
- décisions d'activation automatique au démarrage

La limite de sécurité est le remplacement de l'instantané, et non sa mutation. Reconstruisez l'instantané lorsque la configuration, l'inventaire des plugins, les enregistrements d'installation ou la stratégie d'index persistée changent. Ne le traitez pas comme un registre global mutable large et ne gardez pas d'instantanés historiques non bornés. Le chargement des plugins runtime reste séparé des instantanés de métadonnées afin qu'un état runtime obsolète ne puisse pas être masqué derrière un cache de métadonnées.

Certains appelants de cold path reconstruisent encore directement les registres de manifestes à partir de l'index persistant des plugins installés au lieu de recevoir un Gateway `PluginLookUpTable`. Ce chemin de repli maintient un petit cache mémoire borné indexé par l'index installé, la forme de la requête, la politique de configuration, les racines d'exécution et les signatures de fichiers manifeste/package. C'est un filet de sécurité de repli pour la reconstruction répétée de l'index, et non le chemin chaud privilégié du Gateway. Privilégiez le passage de la table de recherche actuelle ou d'un registre de manifestes explicite via les flux d'exécution lorsqu'un appelant en possède déjà un.

### Planification de l'activation

La planification de l'activation fait partie du plan de contrôle. Les appelants peuvent demander quels plugins sont pertinents pour une commande, un fournisseur, un canal, une route, un harnais d'agent ou une capacité spécifique avant de charger des registres d'exécution plus larges.

Le planificateur maintient le comportement actuel du manifeste compatible :

- Les champs `activation.*` sont des indications explicites du planificateur
- `providers`, `channels`, `commandAliases`, `setup.providers`, `contracts.tools`, et les hooks restent un repli de propriété du manifeste
- l'API du planificateur ids-only reste disponible pour les appelants existants
- l'API de plan rapporte des étiquettes de raison afin que les diagnostics puissent distinguer les indications explicites du repli de propriété

<Warning>Ne traitez pas `activation` comme un hook de cycle de vie ou un remplacement pour `register(...)`. Ce sont des métadonnées utilisées pour restreindre le chargement. Privilégiez les champs de propriété lorsqu'ils décrivent déjà la relation ; n'utilisez `activation` que pour les indications supplémentaires du planificateur.</Warning>

### Plugins de canal et l'outil de message partagé

Les plugins de canal n'ont pas besoin d'enregistrer un outil d'envoi/édition/réaction distinct pour les actions de chat normales. OpenClaw conserve un seul outil `message` partagé dans le cœur, et les plugins de canal possèdent la découverte et l'exécution spécifiques au canal derrière celui-ci.

La limite actuelle est :

- le cœur possède l'hôte de l'outil `message` partagé, le câblage des invites, la tenue de livres de session/fil et la répartition de l'exécution
- les plugins de canal possèdent la découverte d'actions délimitées, la découverte des capacités et tous les fragments de schéma spécifiques au canal
- les plugins de canal possèdent la grammaire de conversation de session spécifique au fournisseur, telle que la manière dont les identifiants de conversation encodent les identifiants de fil ou héritent des conversations parentes
- les plugins de canal exécutent l'action finale via leur adaptateur d'action

Pour les plugins de canal, la surface du SDK est `ChannelMessageActionAdapter.describeMessageTool(...)`. Cet appel de découverte unifié permet à un plugin de renvoyer ses actions visibles, ses capacités et ses contributions de schéma ensemble, afin que ces éléments ne se dispersent pas.

Lorsqu'un paramètre d'outil de message spécifique au canal transporte une source multimédia telle qu'un chemin local ou une URL multimédia distante, le plugin doit également renvoyer `mediaSourceParams` depuis `describeMessageTool(...)`. Le cœur utilise cette liste explicite pour appliquer la normalisation des chemins du bac à sable et les indices d'accès aux médias sortants sans coder en dur les noms de paramètres possédés par le plugin. Privilégiez les cartes portées sur l'action, et non une liste plate unique à l'échelle du canal, afin qu'un paramètre multimédia réservé au profil ne soit pas normalisé sur des actions sans rapport comme `send`.

Le cœur transmet la portée d'exécution à cette étape de découverte. Les champs importants incluent :

- `accountId`
- `currentChannelId`
- `currentThreadTs`
- `currentMessageId`
- `sessionKey`
- `sessionId`
- `agentId`
- entrant de confiance `requesterSenderId`

Cela est important pour les plugins sensibles au contexte. Un canal peut masquer ou exposer des actions de message en fonction du compte actif, de la salle/fil/message actuel, ou de l'identité du demandeur de confiance, sans coder en dur des branches spécifiques au canal dans l'outil central `message`.

C'est pourquoi les modifications de routage de l'exécuteur intégré restent un travail de plugin : l'exécuteur est responsable de la transmission de l'identité de chat/session actuelle dans la limite de découverte du plugin, afin que l'outil partagé `message` expose la bonne surface possédée par le canal pour le tour actuel.

Pour les assistants d'exécution appartenant aux canaux, les plugins groupés doivent conserver l'environnement d'exécution dans leurs propres modules d'extension. Le cœur ne possède plus les environnements d'exécution d'actions de message pour Discord, Slack, Telegram ou WhatsApp sous `src/agents/tools`. Nous ne publions pas de sous-chemins `plugin-sdk/*-action-runtime` séparés, et les plugins groupés doivent importer leur propre code d'exécution local directement à partir de leurs modules détenus par l'extension.

La même limite s'applique généralement aux jonctions du SDK nommées par le fournisseur : le cœur ne doit pas importer de barils de commodité spécifiques au canal pour Slack, Discord, Signal, WhatsApp ou des extensions similaires. Si le cœur a besoin d'un comportement, il doit soit consommer le barrel `api.ts` / `runtime-api.ts` du plugin groupé, soit promouvoir le besoin en une capacité générique étroite dans le SDK partagé.

Les plugins groupés suivent la même règle. Le `runtime-api.ts` d'un plugin groupé ne doit pas réexporter sa propre façade `openclaw/plugin-sdk/<plugin-id>` marquée. Ces façades marquées restent des shims de compatibilité pour les plugins externes et les anciens consommateurs, mais les plugins groupés doivent utiliser des exportations locales ainsi que des sous-chemins de SDK génériques étroits tels que `openclaw/plugin-sdk/channel-policy`, `openclaw/plugin-sdk/runtime-store` ou `openclaw/plugin-sdk/webhook-ingress`. Le nouveau code ne doit pas ajouter de façades SDK spécifiques à l'identifiant du plugin, sauf si la limite de compatibilité pour un écosystème externe existant l'exige.

Pour les sondages specifically, il existe deux chemins d'exécution :

- `outbound.sendPoll` est la base partagée pour les canaux qui correspondent au modèle de sondage commun
- `actions.handleAction("poll")` est le chemin privilégié pour les sémantiques de sondage spécifiques au canal ou les paramètres de sondage supplémentaires

Le cœur diffère maintenant l'analyse des sondages partagés jusqu'à ce que la répartition des sondages du plugin refuse l'action, afin que les gestionnaires de sondages détenus par le plugin puissent accepter les champs de sondage spécifiques au canal sans être bloqués par l'analyseur de sondage générique.

Voir [Plugin architecture internals](/fr/plugins/architecture-internals) pour la séquence complète de démarrage.

## Modèle de propriété des capacités

OpenClaw considère un plugin natif comme la limite de propriété pour une **entreprise** ou une **fonctionnalité**, et non comme un sac d'intégrations sans rapport.

Cela signifie :

- un plugin d'entreprise devrait généralement posséder toutes les surfaces orientées OpenClaw de cette entreprise
- un plugin de fonctionnalité doit généralement posséder l'ensemble de la surface de fonctionnalité qu'il introduit
- les canaux doivent consommer les capacités centrales partagées au lieu de réimplémenter le comportement du fournisseur ad hoc

<AccordionGroup>
  <Accordion title="Fournisseur multi-capacité">
    `openai` possède l'inférence de texte, la parole, la voix en temps réel, la compréhension des médias et la génération d'images. `google` possède l'inférence de texte ainsi que la compréhension des médias, la génération d'images et la recherche web. `qwen` possède l'inférence de texte ainsi que la compréhension des médias et la génération vidéo.
  </Accordion>
  <Accordion title="Fournisseur à capacité unique">`elevenlabs` et `microsoft` possèdent la parole ; `firecrawl` possède le web-fetch ; `minimax` / `mistral` / `moonshot` / `zai` possèdent les backends de compréhension des médias.</Accordion>
  <Accordion title="Plugin de fonctionnalité">`voice-call` possède le transport des appels, les outils, CLI, les routes et le pontage de flux média Twilio, mais consomme les capacités partagées de parole, de transcription en temps réel et de voix en temps réel au lieu d'importer directement les plugins fournisseurs.</Accordion>
</AccordionGroup>

L'état final prévu est :

- OpenAI réside dans un seul plugin même s'il couvre les modèles de texte, la parole, les images et la future vidéo
- un autre fournisseur peut faire de même pour sa propre surface
- les canaux ne se soucient pas de quel plugin fournisseur possède le fournisseur ; ils consomment le contrat de capacité partagée exposé par le cœur

C'est là la distinction clé :

- **plugin** = frontière de propriété
- **capacité** = contrat central que plusieurs plugins peuvent implémenter ou consommer

Ainsi, si OpenClaw ajoute un nouveau domaine tel que la vidéo, la première question n'est pas « quel fournisseur doit coder en dur la gestion de la vidéo ? ». La première question est « quel est le contrat de capacité vidéo central ? ». Une fois ce contrat existant, les plugins fournisseurs peuvent s'y enregistrer et les plugins de canal/fonctionnalité peuvent le consommer.

Si la capacité n'existe pas encore, la bonne action est généralement :

<Steps>
  <Step title="Définir la capacité">Définir la capacité manquante dans le cœur.</Step>
  <Step title="Exposer via le SDK">L'exposer via l'API/runtime du plugin de manière typée.</Step>
  <Step title="Connecter les consommateurs">Connecter les canaux/fonctionnalités à cette capacité.</Step>
  <Step title="Implémentations des fournisseurs">Laisser les plugins de fournisseurs enregistrer des implémentations.</Step>
</Steps>

Cela garde la propriété explicite tout en évitant le comportement central qui dépend d'un seul fournisseur ou d'un chemin de code spécifique à un plugin ponctuel.

### Superposition des capacités

Utilisez ce modèle mental pour décider où le code appartient :

<Tabs>
  <Tab title="Core capability layer">Orchestration partagée, stratégie, secours, règles de fusion de configuration, sémantique de livraison et contrats typés.</Tab>
  <Tab title="Vendor plugin layer">API spécifiques aux fournisseurs, authentification, catalogues de modèles, synthèse vocale, génération d'images, futurs backends vidéo, points de terminaison d'utilisation.</Tab>
  <Tab title="Channel/feature plugin layer">Intégration Slack/Discord/appel-voice/etc. qui consomme les capacités principales et les présente sur une surface.</Tab>
</Tabs>

Par exemple, le TTS suit cette forme :

- le cœur possède la stratégie TTS au moment de la réponse, l'ordre de secours, les préférences et la livraison par channel
- `openai`, `elevenlabs` et `microsoft` possèdent les implémentations de synthèse
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

- un plugin possède la surface du fournisseur
- le cœur possède toujours les contrats de capacité
- les canaux et les plugins de fonctionnalités consomment les assistants `api.runtime.*`, et non le code du fournisseur
- les tests de contrat peuvent affirmer que le plugin a enregistré les capacités qu'il prétend posséder

### Exemple de capacité : compréhension vidéo

OpenClaw considère déjà la compréhension d'image/audio/vidéo comme une capacité partagée. Le même modèle de propriété s'applique ici :

<Steps>
  <Step title="Core defines the contract">Core définit le contrat de compréhension des médias.</Step>
  <Step title="Vendor plugins register">Les plugins fournisseur enregistrent `describeImage`, `transcribeAudio` et `describeVideo` le cas échéant.</Step>
  <Step title="Consumers use the shared behavior">Les canaux et les plugins de fonctionnalités utilisent le comportement principal partagé au lieu de se connecter directement au code fournisseur.</Step>
</Steps>

Cela évite d'intégrer les hypothèses vidéo d'un fournisseur dans le cœur. Le plugin possède la surface fournisseur ; le cœur possède le contrat de capacité et le comportement de secours.

La génération de vidéo utilise déjà cette même séquence : le cœur possède le contrat de capacité typé et le helper d'exécution, et les plugins de vendeur enregistrent des implémentations `api.registerVideoGenerationProvider(...)` pour ce dernier.

Besoin d'une liste de vérification de déploiement concrète ? Voir [Capability Cookbook](/fr/tools/capability-cookbook).

## Contrats et application

La surface de API du plugin est intentionnellement typée et centralisée dans `OpenClawPluginApi`. Ce contrat définit les points d'enregistrement pris en charge et les helpers d'exécution sur lesquels un plugin peut s'appuyer.

Pourquoi c'est important :

- les auteurs de plugins bénéficient d'une norme interne stable unique
- le cœur peut rejeter la propriété en double, telle que deux plugins enregistrant le même id de fournisseur
- le démarrage peut afficher des diagnostics exploitables pour les enregistrements malformés
- les tests de contrat peuvent imposer la propriété du plugin groupé et empêcher une dérive silencieuse

Il existe deux niveaux d'application :

<AccordionGroup>
  <Accordion title="Runtime registration enforcement">Le registre de plugins valide les enregistrements lors du chargement des plugins. Exemples : les identifiants de provider en double, les identifiants de provider de reconnaissance vocale en double et les enregistrements malformés produisent des diagnostics de plugin plutôt qu'un comportement indéfini.</Accordion>
  <Accordion title="Contract tests">Les plugins groupés sont capturés dans des registres de contrats lors des tests afin qu'OpenClaw puisse affirmer explicitement la propriété. Aujourd'hui, cela est utilisé pour les providers de modèle, les providers de reconnaissance vocale, les providers de recherche Web et la propriété des enregistrements groupés.</Accordion>
</AccordionGroup>

L'effet pratique est qu'OpenClaw sait, à l'avance, quel plugin possède quelle surface. Cela permet au noyau et aux canaux de se composer de manière transparente car la propriété est déclarée, typée et testable plutôt qu'implicite.

### Ce qui appartient à un contrat

<Tabs>
  <Tab title="Good contracts">- typé - petit - spécifique à une capacité - détenu par le noyau - réutilisable par plusieurs plugins - consommable par les canaux/fonctionnalités sans connaissance du fournisseur</Tab>
  <Tab title="Bad contracts">- stratégie spécifique au fournisseur cachée dans le noyau - échappatoires de plugin ponctuelles qui contournent le registre - code de canaux accédant directement à une implémentation de fournisseur - objets d'exécution ad hoc qui ne font pas partie de `OpenClawPluginApi` ou `api.runtime`</Tab>
</Tabs>

En cas de doute, augmentez le niveau d'abstraction : définissez d'abord la capacité, puis laissez les plugins s'y connecter.

## Modèle d'exécution

Les plugins natifs OpenClaw s'exécutent **en cours de traitement** (in-process) avec le Gateway. Ils ne sont pas isolés (sandboxed). Un plugin natif chargé a la même limite de confiance au niveau du processus que le code du noyau.

<Warning>
Implications :

- un plugin natif peut enregistrer des outils, des gestionnaires de réseau, des hooks et des services
- un bug dans un plugin natif peut planter ou déstabiliser la passerelle
- un plugin natif malveillant est équivalent à une exécution de code arbitraire à l'intérieur du processus OpenClaw
  </Warning>

Les bundles compatibles sont plus sûrs par défaut car OpenClaw les traite actuellement comme des packs de métadonnées/contenu. Dans les versions actuelles, cela signifie principalement des compétences groupées.

Utilisez des listes d'autorisation et des chemins d'installation/chargement explicites pour les plugins non groupés. Traitez les plugins de l'espace de travail comme du code de développement, et non comme des valeurs par défaut de production.

Pour les noms de packages groupés dans l'espace de travail, gardez l'identifiant du plugin ancré dans le nom npm : `@openclaw/<id>` par défaut, ou un suffixe typé approuvé tel que `-provider`, `-plugin`, `-speech`, `-sandbox`, ou `-media-understanding` lorsque le package expose intentionnellement un rôle de plugin plus étroit.

<Note>
**Note de confiance :**

- `plugins.allow` fait confiance aux **identifiants de plugin**, et non à la provenance de la source.
- Un plugin d'espace de travail avec le même identifiant qu'un plugin inclus remplace intentionnellement la copie incluse lorsque ce plugin d'espace de travail est activé/autorisé.
- C'est normal et utile pour le développement local, les tests de correctifs et les correctifs urgents.
- La confiance des plugins inclus est résolue à partir de l'instantané de la source — le manifeste et le code sur disque au moment du chargement — plutôt qu'à partir des métadonnées d'installation. Un enregistrement d'installation corrompu ou substitué ne peut pas élargir silencieusement la surface de confiance d'un plugin inclus au-delà de ce que la source réelle déclare.
  </Note>

## Limite d'exportation

OpenClaw exporte des capacités, et non des commodités de mise en œuvre.

Gardez l'enregistrement des capacités public. Supprimez les exportations d'assistance non contractuelles :

- sous-chemins d'assistance spécifiques aux plugins inclus
- sous-chemins de plomberie d'exécution non destinés à être une API publique
- assistants de commodité spécifiques aux fournisseurs
- des helpers d'intégration/onboarding qui sont des détails d'implémentation

Certains sous-chemins d'assistance de plugin groupé restent encore dans la carte d'exportation du SDK généré pour des raisons de compatibilité et de maintenance des plugins groupés. Les exemples actuels incluent `plugin-sdk/feishu`, `plugin-sdk/feishu-setup`, `plugin-sdk/zalo`, `plugin-sdk/zalo-setup`, `plugin-sdk/channel-config-schema-legacy`, et plusieurs `plugin-sdk/matrix*` zones de jonction. Considérez-les comme des exportations réservées obsolètes, et non comme le modèle SDK recommandé pour les nouveaux plugins tiers.

## Fonctionnement interne et référence

Pour le pipeline de chargement, le modèle de registre, les hooks d'exécution du provider, les routes HTTP du Gateway, les schémas d'outil de message, la résolution de cible de channel, les catalogues de provider, les plugins du moteur de contexte et le guide pour ajouter une nouvelle capacité, voir [Plugin architecture internals](/fr/plugins/architecture-internals).

## Connexes

- [Building plugins](/fr/plugins/building-plugins)
- [Plugin manifest](/fr/plugins/manifest)
- [Plugin SDK setup](/fr/plugins/sdk-setup)
