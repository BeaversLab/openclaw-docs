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
  Ceci est la **référence approfondie de l'architecture**. Pour les guides pratiques, voir : - [Installer et utiliser des plugins](/en/tools/plugin) — guide utilisateur - [Getting Started](/en/plugins/building-plugins) — premier tutoriel de plugin - [Plugins de canal](/en/plugins/sdk-channel-plugins) — créer un canal de messagerie - [Plugins de fournisseur](/en/plugins/sdk-provider-plugins) —
  créer un fournisseur de modèle - [Présentation du SDK](/en/plugins/sdk-overview) — carte d'importation et API d'enregistrement
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

- **plain-capability** -- enregistre exactement un type de capacité (par exemple un
  plugin uniquement fournisseur comme `mistral`)
- **hybrid-capability** -- enregistre plusieurs types de capacités (par exemple
  `openai` possède l'inférence de texte, la parole, la compréhension multimédia et la
  génération d'images)
- **hook-only** -- enregistre uniquement des hooks (typés ou personnalisés), aucune capacité,
  outil, commande ou service
- **non-capability** -- enregistre des outils, commandes, services ou itinéraires mais aucune
  capacité

Utilisez `openclaw plugins inspect <id>` pour voir la forme d'un plugin et la répartition de ses
capacités. Voir la [référence CLI](/en/cli/plugins#inspect) pour les détails.

### Legacy hooks

Le hook `before_agent_start` reste pris en charge en tant que chemin de compatibilité pour
les plugins basés uniquement sur des hooks. Les plugins réels hérités en dépendent encore.

Direction :

- le garder fonctionnel
- le documenter comme obsolète (legacy)
- privilégiez `before_model_resolve` pour le travail de remplacement de modèle/fournisseur
- préférez `before_prompt_build` pour le travail de mutation de prompt
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

Ni `hook-only` ni `before_agent_start` ne briseront votre plugin aujourd'hui --
`hook-only` est consultatif, et `before_agent_start` ne déclenche qu'un avertissement. Ces
signaux apparaissent également dans `openclaw status --all` et `openclaw plugins doctor`.

## Vue d'ensemble de l'architecture

Le système de plugins OpenClaw possède quatre couches :

1. **Manifeste + découverte**
   OpenClaw trouve les plugins candidats à partir des chemins configurés, des racines de l'espace de travail,
   des racines d'extensions globales et des extensions groupées. La découverte lit les manifestes natifs
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

Pour le plugin CLI spécifiquement, la découverte des commandes racines est divisée en deux phases :

- les métadonnées au moment de l'analyse proviennent de `registerCli(..., { descriptors: [...] })`
- le vrai module de plugin CLI peut rester paresseux et s'enregistrer lors de la première invocation

Cela permet de garder le code CLI appartenant au plugin à l'intérieur du plugin tout en laissant OpenClaw
réserver les noms de commandes racines avant l'analyse.

La limite de conception importante :

- la découverte + la validation de la configuration doivent fonctionner à partir des **métadonnées de manifeste/schéma**
  sans exécuter le code du plugin
- le comportement d'exécution natif provient du chemin `register(api)` du module du plugin

Cette division permet à OpenClaw de valider la configuration, d'expliquer les plugins manquants/désactivés et de
construire des indices d'interface utilisateur/schéma avant que le runtime complet ne soit actif.

### Plugins de channel et l'outil de message partagé

Les plugins de channel n'ont pas besoin d'enregistrer un outil d'envoi/modification/réaction séparé pour
les actions de chat normales. OpenClaw conserve un outil `message` partagé dans le cœur, et
les plugins de channel possèdent la découverte et l'exécution spécifiques au channel derrière celui-ci.

La limite actuelle est :

- le cœur possède l'hôte de l'outil `message` partagé, le câblage du prompt, la gestion de livre
  de session/thread et la répartition de l'exécution
- les plugins de channel possèdent la découverte d'actions délimitées, la découverte des capacités et tous
  les fragments de schéma spécifiques au channel
- les plugins de channel possèdent la grammaire de conversation de session spécifique au provider, telle que la façon dont les identifiants de conversation encodent les identifiants de thread ou héritent des conversations parentes
- les plugins de channel exécutent l'action finale via leur adaptateur d'action

Pour les plugins de channel, la surface du SDK est `ChannelMessageActionAdapter.describeMessageTool(...)`. Cet appel de découverte unifié permet à un plugin de renvoyer ses actions visibles, ses capacités et ses contributions de schéma ensemble, afin que ces éléments ne se dispersent pas.

Core transmet la portée d'exécution (runtime scope) à cette étape de découverte. Les champs importants incluent :

- `accountId`
- `currentChannelId`
- `currentThreadTs`
- `currentMessageId`
- `sessionKey`
- `sessionId`
- `agentId`
- `requesterSenderId` entrant approuvé

C'est important pour les plugins sensibles au contexte. Un channel peut masquer ou exposer des actions de message en fonction du compte actif, de la salle/thread/message actuel, ou de l'identité du demandeur approuvé, sans coder en dur des branches spécifiques au channel dans l'outil `message` de Core.

C'est pourquoi les modifications de routage du embedded-runner relèvent encore du travail du plugin : le runner est responsable de la transmission de l'identité de chat/session actuelle vers la limite de découverte du plugin, afin que l'outil partagé `message` expose la bonne surface appartenant au channel pour le tour actuel.

Pour les assistants d'exécution appartenant au channel, les plugins groupés doivent conserver l'environnement d'exécution dans leurs propres modules d'extension. Core ne possède plus les environnements d'exécution des actions de message de Discord, Slack, Telegram ou WhatsApp sous `src/agents/tools`. Nous ne publions pas de sous-chemins `plugin-sdk/*-action-runtime` séparés, et les plugins groupés doivent importer leur propre code d'exécution local directement depuis leurs modules appartenant à l'extension.

Pour les sondages (polls) spécifiquement, il existe deux chemins d'exécution :

- `outbound.sendPoll` est la base partagée pour les channels qui correspondent au modèle de sondage commun
- `actions.handleAction("poll")` est le chemin privilégié pour les sémantiques de sondage spécifiques au channel ou les paramètres de sondage supplémentaires

Le cœur diffère désormais l'analyse partagée des sondages (polls) jusqu'à ce que la répartition des sondages par le plugin rejette l'action, afin que les gestionnaires de sondages détenus par le plugin puissent accepter les champs de sondage spécifiques au channel sans être bloqués au préalable par l'analyseur de sondages générique.

Voir [Load pipeline](#load-pipeline) pour la séquence complète de démarrage.

## Modèle de propriété des capacités

OpenClaw considère un plugin natif comme la limite de propriété pour une **entreprise** ou une **fonctionnalité**, et non comme un fourre-tout d'intégrations sans rapport.

Cela signifie :

- un plugin d'entreprise devrait généralement posséder toutes les surfaces orientées vers OpenClaw de cette entreprise
- un plugin de fonctionnalité devrait généralement posséder la surface complète de la fonctionnalité qu'il introduit
- les channels devraient consommer les capacités fondamentales partagées au lieu de réimplémenter le comportement du provider ad hoc

Exemples :

- le plugin intégré `openai` possède le comportement de provider de modèle OpenAI ainsi que les comportements de OpenAI pour la synthèse vocale, la compréhension des médias et la génération d'images
- le plugin intégré `elevenlabs` possède le comportement vocal ElevenLabs
- le plugin intégré `microsoft` possède le comportement vocal Microsoft
- le plugin intégré `google` possède le comportement de provider de modèle Google, ainsi que les comportements de compréhension des médias, de génération d'images et de recherche web de Google
- les plugins intégrés `minimax`, `mistral`, `moonshot` et `zai` possèdent leurs backends de compréhension des médias respectifs
- le plugin `voice-call` est un plugin de fonctionnalité : il possède le transport d'appel, les outils, la CLI, les routes et l'exécution (runtime), mais il consomme la capacité fondamentale TTS/STT au lieu d'inventer une seconde pile vocale

L'état final prévu est :

- OpenAI réside dans un seul plugin même s'il couvre les modèles textuels, la parole, les images et la future vidéo
- un autre fournisseur peut faire de même pour sa propre surface
- les channels se soucient peu de quel plugin fournisseur possède le provider ; ils consomment le contrat de capacité partagée exposé par le cœur

Voici la distinction clé :

- **plugin** = limite de propriété
- **capacité** = contrat fondamental que plusieurs plugins peuvent implémenter ou consommer

Ainsi, si OpenClaw ajoute un nouveau domaine tel que la vidéo, la première question n'est pas
« quel provider devrait coder en dur la gestion vidéo ? ». La première question est « quel est
le contrat de base de la capacité vidéo ? ». Une fois ce contrat établi, les plugins fournisseurs
peuvent s'y enregistrer et les plugins de canal/fonctionnalité peuvent le consommer.

Si la capacité n'existe pas encore, la bonne démarche est généralement :

1. définir la capacité manquante dans le cœur
2. l'exposer via l'API de plugin / le runtime de manière typée
3. connecter les canaux/fonctionnalités à cette capacité
4. laisser les plugins fournisseurs enregistrer des implémentations

Cela garde la propriété explicite tout en évitant un comportement central qui dépend d'un
seul fournisseur ou d'un chemin de code spécifique à un plugin ponctuel.

### Superposition des capacités

Utilisez ce modèle mental pour décider où le code doit se trouver :

- **couche de capacité centrale** : orchestration partagée, politique, repli, règles de
  fusion de configuration, sémantique de livraison et contrats typés
- **couche de plugin fournisseur** : API spécifiques aux fournisseurs, auth, catalogues de modèles, synthèse
  vocale, génération d'images, futurs backend vidéo, points de terminaison d'utilisation
- **couche de plugin de canal/fonctionnalité** : intégration Slack/Discord/appel-voice/etc.
  qui consomme les capacités centrales et les présente sur une surface

Par exemple, le TTS suit cette forme :

- le cœur possède la politique TTS au moment de la réponse, l'ordre de repli, les préférences et la livraison par canal
- `openai`, `elevenlabs` et `microsoft` possèdent les implémentations de synthèse
- `voice-call` consomme l'assistant d'exécution TTS téléphonique

Ce même modèle devrait être privilégié pour les capacités futures.

### Exemple de plugin d'entreprise multi-capacité

Un plugin d'entreprise doit paraître cohérent de l'extérieur. Si OpenClaw a des contrats
partagés pour les modèles, la parole, la compréhension des médias et la recherche web, un fournisseur peut
posséder toutes ses surfaces en un seul endroit :

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
- les canaux et les plugins de fonctionnalité consomment les assistants `api.runtime.*`, pas le code fournisseur
- les tests de contrat peuvent affirmer que le plugin a enregistré les capacités qu'il
  prétend posséder

### Exemple de capacité : compréhension vidéo

OpenClaw traite déjà la compréhension d'image/audio/vidéo comme une capacité
partagée unique. Le même modèle de propriété s'applique ici :

1. le cœur définit le contrat de compréhension des médias
2. les plugins fournisseur enregistrent `describeImage`, `transcribeAudio` et
   `describeVideo` selon le cas
3. les canaux et les plugins de fonctionnalités consomment le comportement central partagé au lieu de
   se connecter directement au code fournisseur

Cela évite d'intégrer les hypothèses vidéo d'un fournisseur dans le cœur. Le plugin possède
la surface fournisseur ; le cœur possède le contrat de capacité et le comportement de secours.

Si OpenClaw ajoute un nouveau domaine plus tard, tel que la génération vidéo, utilisez la même
séquence à nouveau : définissez d'abord la capacité centrale, puis laissez les plugins fournisseur
enregistrer des implémentations pour celle-ci.

Besoin d'une liste de contrôle de déploiement concrète ? Consultez
[Capability Cookbook](/en/tools/capability-cookbook).

## Contrats et application

La surface de l'API du plugin est intentionnellement typée et centralisée dans
`OpenClawPluginApi`. Ce contrat définit les points d'enregistrement pris en charge et
les assistants d'exécution sur lesquels un plugin peut s'appuyer.

Pourquoi c'est important :

- les auteurs de plugins disposent d'une norme interne stable unique
- le cœur peut rejeter la propriété en double, telle que deux plugins enregistrant le même
  identifiant fournisseur
- le démarrage peut afficher des diagnostics exploitables pour les enregistrements malformés
- les tests de contrat peuvent appliquer la propriété des groupés et empêcher une dérive silencieuse

Il existe deux niveaux d'application :

1. **application de l'enregistrement à l'exécution**
   Le registre de plugins valide les enregistrements au chargement des plugins. Exemples :
   les identifiants fournisseurs en double, les identifiants fournisseurs de parole en double et les enregistrements
   malformés produisent des diagnostics de plugin au lieu d'un comportement indéfini.
2. **tests de contrat**
   Les plugins groupés sont capturés dans des registres de contrats lors des tests afin que
   OpenClaw puisse affirmer explicitement la propriété. Aujourd'hui, cela est utilisé pour les
   fournisseurs de modèles, les fournisseurs de parole, les fournisseurs de recherche Web et la propriété
   des enregistrements groupés.

L'effet pratique est que OpenClaw sait, à l'avance, quel plugin possède quelle
surface. Cela permet au cœur et aux canaux de se composer de manière transparente car la propriété est
déclarée, typée et testable plutôt qu'implicite.

### Ce qui appartient à un contrat

Les bons contrats de plugins sont :

- typés
- petits
- spécifiques à une capacité
- détenus par le cœur
- réutilisables par plusieurs plugins
- consommables par les canaux/fonctionnalités sans connaissance du fournisseur

Les mauvais contrats de plugins sont :

- stratégie spécifique au fournisseur cachée dans le cœur
- échappatoires ponctuelles de plugin qui contournent le registre
- code de channel accédant directement à une implémentation fournisseur
- objets d'exécution ad hoc qui ne font pas partie de `OpenClawPluginApi` ou
  `api.runtime`

En cas de doute, augmentez le niveau d'abstraction : définissez d'abord la capacité,
puis laissez les plugins s'y connecter.

## Modèle d'exécution

Les plugins natifs OpenClaw s'exécutent **in-process** avec le Gateway. Ils ne sont pas
sandboxed. Un plugin natif chargé a la même limite de confiance au niveau du processus que
le code core.

Implications :

- un plugin natif peut enregistrer des outils, des gestionnaires réseau, des hooks et des services
- un bug de plugin natif peut planter ou déstabiliser la passerelle
- un plugin natif malveillant est équivalent à une exécution de code arbitraire à l'intérieur
  du processus OpenClaw

Les bundles compatibles sont plus sûrs par défaut car OpenClaw les traite actuellement
comme des packs de métadonnées/contenu. Dans les versions actuelles, cela signifie principalement des
compétences groupées.

Utilisez des listes blanches et des chemins d'installation/chargement explicites pour les plugins non groupés. Traitez
les plugins de l'espace de travail comme du code de développement, et non par défaut de production.

Pour les noms de packages de l'espace de travail groupés, gardez l'identifiant du plugin ancré dans le nom
npm : `@openclaw/<id>` par défaut, ou un suffixe typé approuvé tel que
`-provider`, `-plugin`, `-speech`, `-sandbox`, ou `-media-understanding` lorsque
le package expose intentionnellement un rôle de plugin plus restreint.

Note importante sur la confiance :

- `plugins.allow` fait confiance aux **identifiants de plugin**, pas à la provenance de la source.
- Un plugin de l'espace de travail avec le même identifiant qu'un plugin groupé masque intentionnellement
  la copie groupée lorsque ce plugin de l'espace de travail est activé/autorisé.
- C'est normal et utile pour le développement local, les tests de correctifs et les correctifs rapides.

## Limite d'exportation

OpenClaw exporte des capacités, et non des commodités de mise en œuvre.

Gardez l'enregistrement des capacités public. Supprimez les exportations d'assistance non contractuelles :

- sous-chemins d'assistance spécifiques aux plugins groupés
- sous-chemins de plomberie d'exécution non destinés à être une API publique
- assistants de commodité spécifiques aux fournisseurs
- assistants de configuration/intégration qui sont des détails de mise en œuvre

## Pipeline de chargement

Au démarrage, OpenClaw fait grossièrement ceci :

1. découvrir les racines candidates des plugins
2. lire les manifests de bundle natifs ou compatibles et les métadonnées de package
3. rejeter les candidats non sécurisés
4. normaliser la configuration du plugin (`plugins.enabled`, `allow`, `deny`, `entries`,
   `slots`, `load.paths`)
5. décider de l'activation pour chaque candidat
6. charger les modules natifs activés via jiti
7. appeler les hooks natifs `register(api)` (ou `activate(api)` — un alias hérité) et collecter les enregistrements dans le registre de plugins
8. exposer le registre aux surfaces de commandes/d'exécution

<Note>`activate` est un alias hérité pour `register` — le chargeur résout celui qui est présent (`def.register ?? def.activate`) et l'appelle au même moment. Tous les plugins groupés utilisent `register` ; préférez `register` pour les nouveaux plugins.</Note>

Les portes de sécurité ont lieu **avant** l'exécution. Les candidats sont bloqués
lorsque le point d'entrée s'échappe de la racine du plugin, que le chemin est accessible en écriture par tous, ou que la
propriété du chemin semble suspecte pour les plugins non groupés.

### Comportement prioritaire au manifeste

Le manifeste est la source de vérité du plan de contrôle. OpenClaw l'utilise pour :

- identifier le plugin
- découvrir les canaux/compétences/schémas de configuration déclarés ou les capacités du bundle
- valider `plugins.entries.<id>.config`
- augmenter les étiquettes/espaces réservés de l'interface utilisateur de contrôle
- afficher les métadonnées d'installation/de catalogue

Pour les plugins natifs, le module d'exécution est la partie du plan de données. Il enregistre
le comportement réel tel que les hooks, les outils, les commandes ou les flux du provider.

### Ce que le chargeur met en cache

OpenClaw conserve des caches de processus courts pour :

- les résultats de découverte
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

Les plugins chargés ne modifient pas directement les globales du cœur aléatoires. Ils s'enregistrent dans un
registre central de plugins.

Le registre suit :

- enregistrements de plugins (identité, source, origine, état, diagnostics)
- outils
- hooks hérités et hooks typés
- canaux
- fournisseurs
- gestionnaires RPC de passerelle
- routes HTTP
- inscripteurs CLI
- services d'arrière-plan
- commandes appartenant au plugin

Les fonctionnalités principales lisent ensuite ce registre au lieu de communiquer directement avec les modules de plugin.
Cela maintient le chargement à sens unique :

- module de plugin -> inscription au registre
- runtime principal -> consommation du registre

Cette séparation est importante pour la maintenabilité. Cela signifie que la plupart des surfaces principales n'ont besoin
d'un seul point d'intégration : « lire le registre », et non « cas particulier pour chaque module de
plugin ».

## Rappels de liaison de conversation

Les plugins qui lient une conversation peuvent réagir lorsqu'une approbation est résolue.

Utilisez `api.onConversationBindingResolved(...)` pour recevoir un rappel après qu'une demande de liaison
est approuvée ou refusée :

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

- `status` : `"approved"` ou `"denied"`
- `decision` : `"allow-once"`, `"allow-always"` ou `"deny"`
- `binding` : la liaison résolue pour les demandes approuvées
- `request` : le résumé de la demande originale, l'indicateur de détachement, l'ID de l'expéditeur et
  les métadonnées de la conversation

Ce rappel est uniquement une notification. Il ne modifie pas qui est autorisé à lier une
conversation et s'exécute après la fin de la gestion de l'approbation principale.

## Hooks du runtime du fournisseur

Les plugins fournisseurs ont désormais deux couches :

- métadonnées du manifeste : `providerAuthEnvVars` pour une recherche d'auth-env peu coûteuse avant
  le chargement du runtime, plus `providerAuthChoices` pour des étiquettes d'onboarding/choix d'auth peu coûteuses
  et les métadonnées des indicateurs CLI avant le chargement du runtime
- hooks au moment de la configuration : `catalog` / hérité `discovery`
- runtime hooks : `resolveDynamicModel`, `prepareDynamicModel`, `normalizeResolvedModel`, `capabilities`, `prepareExtraParams`, `wrapStreamFn`, `formatApiKey`, `refreshOAuth`, `buildAuthDoctorHint`, `isCacheTtlEligible`, `buildMissingAuthMessage`, `suppressBuiltInModel`, `augmentModelCatalog`, `isBinaryThinking`, `supportsXHighThinking`, `resolveDefaultThinkingLevel`, `isModernModelRef`, `prepareRuntimeAuth`, `resolveUsageAuth`, `fetchUsageSnapshot`

OpenClaw possède toujours la boucle d'agent générique, le basculement (failover), la gestion des transcriptions et la stratégie d'outil. Ces hooks constituent la surface d'extension pour les comportements spécifiques aux fournisseurs sans avoir besoin d'un transport d'inférence entièrement personnalisé.

Utilisez `providerAuthEnvVars` dans le manifeste lorsque le fournisseur possède des identifiants basés sur des variables d'environnement que les chemins génériques d'authentification/état/sélecteur de model devraient voir sans charger le runtime du plugin. Utilisez `providerAuthChoices` dans le manifeste lorsque les surfaces de CLI/choix d'authentification de la OAuth devraient connaître l'id de choix, les étiquettes de groupe et le câblage d'authentification simple à un indicateur du fournisseur, sans charger le runtime du fournisseur. Conservez `envVars` dans le runtime du fournisseur pour les indications destinées aux opérateurs, telles que les étiquettes d'intégration (onboarding) ou les variables de configuration du client-id/client-secret OAuth.

### Ordre et utilisation des hooks

Pour les plugins de model/fournisseur, OpenClaw appelle les hooks dans cet ordre approximatif. La colonne « Quand utiliser » est le guide de décision rapide.

| #   | Hook                            | Ce qu'il fait                                                                                                                                       | Quand l'utiliser                                                                                                                                |
| --- | ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `catalog`                       | Publie la configuration du fournisseur dans `models.providers` lors de la génération `models.json`                                                  | Le fournisseur possède un catalogue ou des URL par défaut                                                                                       |
| --  | _(recherche de model intégrée)_ | OpenClaw essaie d'abord le chemin normal de registre/catalogue                                                                                      | _(pas un hook de plugin)_                                                                                                                       |
| 2   | `resolveDynamicModel`           | Repli synchrone pour les id de model appartenant au fournisseur qui ne sont pas encore dans le registre local                                       | Le fournisseur accepte les id de model en amont arbitraires                                                                                     |
| 3   | `prepareDynamicModel`           | Préchauffage asynchrone, puis `resolveDynamicModel` s'exécute à nouveau                                                                             | Le fournisseur a besoin des métadonnées réseau avant de résoudre les identifiants inconnus                                                      |
| 4   | `normalizeResolvedModel`        | Réécriture finale avant que le moteur intégré n'utilise le model résolu                                                                             | Le fournisseur a besoin de réécritures de transport mais utilise toujours un transport principal                                                |
| 5   | `capabilities`                  | Métadonnées de transcription/outillage appartenant au fournisseur, utilisées par la logique principale partagée                                     | Le fournisseur a besoin de particularités de transcription/famille de fournisseurs                                                              |
| 6   | `prepareExtraParams`            | Normalisation des paramètres de requête avant les wrappers génériques d'options de flux                                                             | Le fournisseur a besoin de paramètres de requête par défaut ou d'un nettoyage des paramètres par fournisseur                                    |
| 7   | `wrapStreamFn`                  | Wrapper de flux après l'application des wrappers génériques                                                                                         | Le fournisseur a besoin de wrappers d'en-têtes/corps/model de requête compatibles sans transport personnalisé                                   |
| 8   | `formatApiKey`                  | Formateur de profil d'authentification : le profil stocké devient la chaîne `apiKey` lors de l'exécution                                            | Le fournisseur stocke des métadonnées d'authentification supplémentaires et a besoin d'une forme de jeton d'exécution personnalisée             |
| 9   | `refreshOAuth`                  | Remplacement du rafraîchissement OAuth pour les points de terminaison de rafraîchissement personnalisés ou la politique d'échec de rafraîchissement | Le fournisseur ne correspond pas aux rafraîchisseurs partagés `pi-ai`                                                                           |
| 10  | `buildAuthDoctorHint`           | Indice de réparation ajouté lorsque le rafraîchissement OAuth échoue                                                                                | Le fournisseur a besoin de conseils de réparation d'authentification appartenant au fournisseur après un échec de rafraîchissement              |
| 11  | `isCacheTtlEligible`            | Stratégie de cache de prompt pour les fournisseurs de proxy/backhaul                                                                                | Le fournisseur a besoin d'une gestion TTL de cache spécifique au proxy                                                                          |
| 12  | `buildMissingAuthMessage`       | Remplacement du message générique de récupération d'authentification manquante                                                                      | Le fournisseur a besoin d'un indice de récupération d'authentification manquante spécifique au fournisseur                                      |
| 13  | `suppressBuiltInModel`          | Suppression des models en amont obsolètes plus indice d'erreur utilisateur facultatif                                                               | Le fournisseur doit masquer les lignes en amont obsolètes ou les remplacer par un indice fournisseur                                            |
| 14  | `augmentModelCatalog`           | Lignes de catalogue synthétiques/finales ajoutées après la découverte                                                                               | Le fournisseur a besoin de lignes de compatibilité ascendante synthétiques dans `models list` et les sélecteurs                                 |
| 15  | `isBinaryThinking`              | Activation/désactivation du raisonnement pour les fournisseurs à pensée binaire                                                                     | Le fournisseur expose uniquement l'activation/désactivation de la pensée binaire                                                                |
| 16  | `supportsXHighThinking`         | Support du raisonnement `xhigh` pour les models sélectionnés                                                                                        | Le fournisseur veut `xhigh` sur un seul sous-ensemble de modèles                                                                                |
| 17  | `resolveDefaultThinkingLevel`   | Niveau `/think` par défaut pour une famille de modèles spécifique                                                                                   | Le fournisseur possède la stratégie `/think` par défaut pour une famille de modèles                                                             |
| 18  | `isModernModelRef`              | Correspondance de modèle moderne pour les filtres de profil en direct et la sélection de fumée                                                      | Le fournisseur possède la correspondance de modèle préféré en direct/fumée                                                                      |
| 19  | `prepareRuntimeAuth`            | Échanger une information d'identification configurée contre le jeton/clé de runtime réel juste avant l'inférence                                    | Le fournisseur a besoin d'un échange de jeton ou d'une information d'identification de demande à courte durée de vie                            |
| 20  | `resolveUsageAuth`              | Résoudre les informations d'identification d'utilisation/facturation pour `/usage` et les surfaces d'état associées                                 | Le fournisseur a besoin d'une analyse personnalisée de jeton d'utilisation/quota ou d'une information d'identification d'utilisation différente |
| 21  | `fetchUsageSnapshot`            | Récupérer et normaliser les instantanés d'utilisation/quota spécifiques au fournisseur après la résolution de l'authentification                    | Le fournisseur a besoin d'un point de terminaison d'utilisation spécifique au fournisseur ou d'un analyseur de charge utile                     |

Si le fournisseur a besoin d'un protocole filaire entièrement personnalisé ou d'un exécuteur de demande personnalisé,
c'est une classe d'extension différente. Ces crochets sont pour le comportement du fournisseur
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
  `resolveDefaultThinkingLevel` et `isModernModelRef` car il possède la compatibilité avant
  Claude 4.6, les indications de famille de fournisseur, les conseils de réparation d'auth,
  l'intégration du point de terminaison d'utilisation, l'éligibilité du cache de
  prompt, et la stratégie de pensée par défaut/adaptative de Claude.
- OpenAI utilise `resolveDynamicModel`, `normalizeResolvedModel` et
  `capabilities` ainsi que `buildMissingAuthMessage`, `suppressBuiltInModel`,
  `augmentModelCatalog`, `supportsXHighThinking` et `isModernModelRef`
  car il possède la compatibilité avant GPT-5.4, la normalisation directe OpenAI
  `openai-completions` -> `openai-responses`, les indices d'authentiation Codex-aware,
  la suppression Spark, les lignes de liste synthétiques OpenAI et la stratégie de réflexion /
  de modèle en direct GPT-5.
- OpenRouter utilise `catalog` ainsi que `resolveDynamicModel` et
  `prepareDynamicModel` car le provider est un pass-through et peut exposer de nouveaux
  ids de modèle avant les mises à jour du catalogue statique d'OpenClaw ; il utilise également
  `capabilities`, `wrapStreamFn` et `isCacheTtlEligible` pour garder
  les en-têtes de requête spécifiques au provider, les métadonnées de routage, les correctifs de raisonnement et la
  stratégie de cache de prompt en dehors du cœur.
- GitHub Copilot utilise `catalog`, `auth`, `resolveDynamicModel` et
  `capabilities` ainsi que `prepareRuntimeAuth` et `fetchUsageSnapshot` car il
  a besoin d'une connexion d'appareil propriétaire du provider, d'un comportement de repli de modèle, des particularités de
  transcription Claude, d'un échange de jeton GitHub -> jeton Copilot et d'un endpoint d'utilisation
  propriétaire du provider.
- OpenAI Codex utilise `catalog`, `resolveDynamicModel`,
  `normalizeResolvedModel`, `refreshOAuth` et `augmentModelCatalog` ainsi que
  `prepareExtraParams`, `resolveUsageAuth` et `fetchUsageSnapshot` car il
  fonctionne toujours sur les transports de base OpenAI mais possède sa propre normalisation transport/URL de base,
  la stratégie de repli de rafraîchissement OAuth, le choix de transport par défaut,
  les lignes de catalogue synthétiques Codex et l'intégration de l endpoint d'utilisation ChatGPT.
- Google AI Studio et Gemini CLI OAuth utilisent `resolveDynamicModel` et `isModernModelRef` car ils possèdent la compatibilité descendante Gemini 3.1 et la correspondance des modèles modernes ; Gemini CLI OAuth utilise également `formatApiKey`, `resolveUsageAuth` et `fetchUsageSnapshot` pour le formatage des jetons, l'analyse des jetons et le câblage du point de terminaison de quota.
- Moonshot utilise `catalog` ainsi que `wrapStreamFn` car il utilise toujours le transport partagé OpenAI mais a besoin d'une normalisation de la charge utile de raisonnement appartenant au fournisseur.
- Kilocode utilise `catalog`, `capabilities`, `wrapStreamFn` et `isCacheTtlEligible` car il a besoin d'en-têtes de requête appartenant au fournisseur, d'une normalisation de la charge utile de raisonnement, d'indices de transcription Gemini et du contrôle de la durée de vie du cache Anthropic.
- Z.AI utilise `resolveDynamicModel`, `prepareExtraParams`, `wrapStreamFn`, `isCacheTtlEligible`, `isBinaryThinking`, `isModernModelRef`, `resolveUsageAuth` et `fetchUsageSnapshot` car il possède la rétrocompatibilité GLM-5, les valeurs par défaut `tool_stream`, l'UX de raisonnement binaire, la correspondance des modèles modernes, ainsi que l'authentification d'utilisation et la récupération des quotas.
- Mistral, OpenCode Zen et OpenCode Go utilisent uniquement `capabilities` pour garder les particularités de transcription/outillage hors du cœur.
- Les fournisseurs groupés uniquement dans le catalogue, tels que `byteplus`, `cloudflare-ai-gateway`, `huggingface`, `kimi-coding`, `modelstudio`, `nvidia`, `qianfan`, `synthetic`, `together`, `venice`, `vercel-ai-gateway` et `volcengine`, n'utilisent que `catalog`.
- MiniMax et Xiaomi utilisent `catalog` ainsi que des hooks d'utilisation car leur comportement `/usage` est propriétaire du plugin, bien que l'inférence s'exécute toujours via les transports partagés.

## Runtime helpers

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
- Utilise la configuration `messages.tts` principale et la sélection du provider.
- Renvoie le tampon audio PCM + le taux d'échantillonnage. Les plugins doivent rééchantillonner/encoder pour les providers.
- `listVoices` est optionnel par provider. Utilisez-le pour les sélecteurs de voix ou les flux de configuration appartenant au fournisseur.
- Les listes de voix peuvent inclure des métadonnées plus riches telles que les paramètres régionaux, le genre et les balises de personnalité pour les sélecteurs conscients du provider.
- OpenAI et ElevenLabs prennent en charge la téléphonie aujourd'hui. Microsoft non.

Les plugins peuvent également enregistrer des providers de reconnaissance vocale via `api.registerSpeechProvider(...)`.

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

- Gardez la politique TTS, le repli (fallback) et la livraison des réponses dans le core.
- Utilisez les providers de reconnaissance vocale pour le comportement de synthèse appartenant au fournisseur.
- L'entrée `edge` Microsoft héritée est normalisée vers l'ID de provider `microsoft`.
- Le modèle de propriété préféré est orienté entreprise : un plugin fournisseur peut posséder des providers de texte, de reconnaissance vocale, d'image et de futurs médias, car OpenClaw ajoute ces contrats de capacité.

Pour la compréhension d'image/audio/vidéo, les plugins enregistrent un provider de compréhension de média typé au lieu d'un sac générique de paires clé/valeur :

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

- Gardez l'orchestration, le repli (fallback), la configuration et le câblage des canaux dans le core.
- Gardez le comportement du fournisseur dans le plugin du provider.
- L'extension additive doit rester typée : nouvelles méthodes optionnelles, nouveaux champs de résultat optionnels, nouvelles capacités optionnelles.
- Si OpenClaw ajoute une nouvelle capacité telle que la génération vidéo plus tard, définissez d'abord le contrat de capacité central, puis laissez les plugins fournisseurs s'enregistrer par rapport à celui-ci.

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
- Utilise la configuration audio de compréhension de média centrale (`tools.media.audio`) et l'ordre de repli (fallback) des providers.
- Renvoie `{ text: undefined }` lorsqu'aucune sortie de transcription n'est produite (par exemple entrée ignorée/non prise en charge).
- `api.runtime.stt.transcribeAudioFile(...)` reste en tant qu'alias de compatibilité.

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

- `provider` et `model` sont des redéfinitions facultatives par exécution, et non des modifications persistantes de session.
- OpenClaw honore uniquement ces champs de redéfinition pour les appelants de confiance.
- Pour les exécutions de repli appartenant au plugin, les opérateurs doivent opter pour `plugins.entries.<id>.subagent.allowModelOverride: true`.
- Utilisez `plugins.entries.<id>.subagent.allowedModels` pour restreindre les plugins de confiance à des cibles `provider/model` canoniques spécifiques, ou `"*"` pour autoriser explicitement n'importe quelle cible.
- Les exécutions de sous-agents par des plugins non fiables fonctionnent toujours, mais les demandes de redéfinition sont rejetées au lieu de revenir silencieusement.

Pour la recherche web, les plugins peuvent utiliser la helper d'exécution partagé au lieu
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

- Conservez la sélection du provider, la résolution des identifiants et la sémantique des requêtes partagées dans le cœur.
- Utilisez les providers de recherche web pour les transports de recherche spécifiques aux fournisseurs.
- `api.runtime.webSearch.*` est la surface partagée préférée pour les plugins de fonctionnalités/canal qui ont besoin d'un comportement de recherche sans dépendre du wrapper de l'outil de l'agent.

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
- `auth` : requis. Utilisez `"gateway"` pour exiger l'authentification normale de la passerelle, ou `"plugin"` pour l'authentification gérée par le plugin/vérification des webhooks.
- `match` : facultatif. `"exact"` (par défaut) ou `"prefix"`.
- `replaceExisting` : facultatif. Permet au même plugin de remplacer sa propre inscription de route existante.
- `handler` : renvoie `true` lorsque la route a géré la demande.

Notes :

- `api.registerHttpHandler(...)` a été supprimé et provoquera une erreur de chargement de plugin. Utilisez plutôt `api.registerHttpRoute(...)`.
- Les routes de plugins doivent déclarer `auth` explicitement.
- Les conflits exacts de `path + match` sont rejetés, sauf si `replaceExisting: true`, et un plugin ne peut pas remplacer la route d'un autre plugin.
- Les routes qui se chevauchent avec différents niveaux `auth` sont rejetées. Gardez les chaînes de repli `exact`/`prefix` uniquement sur le même niveau d'authentification.

## Chemins d'importation du SDK de plugin

Utilisez les sous-chemins du SDK au lieu de l'importation monolithique `openclaw/plugin-sdk` lors
de la création de plugins :

- `openclaw/plugin-sdk/plugin-entry` pour les primitives d'enregistrement de plugins.
- `openclaw/plugin-sdk/core` pour le contrat générique partagé orienté plugin.
- Primitives de channel stables telles que `openclaw/plugin-sdk/channel-setup`,
  `openclaw/plugin-sdk/channel-pairing`,
  `openclaw/plugin-sdk/channel-contract`,
  `openclaw/plugin-sdk/channel-feedback`,
  `openclaw/plugin-sdk/channel-inbound`,
  `openclaw/plugin-sdk/channel-lifecycle`,
  `openclaw/plugin-sdk/channel-reply-pipeline`,
  `openclaw/plugin-sdk/command-auth`,
  `openclaw/plugin-sdk/secret-input` et
  `openclaw/plugin-sdk/webhook-ingress` pour le câblage partagé de configuration/authentification/réponse/webhook.
  `channel-inbound` est le foyer partagé pour le debounce, la correspondance des mentions,
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
  Le nouveau code doit plutôt importer les primitives plus étroites.
- Les internes de l'extension groupée restent privés. Les plugins externes doivent utiliser uniquement
  les sous-chemins `openclaw/plugin-sdk/*`. Le code de test/principal d'OpenClaw peut utiliser les points
  d'entrée publics du dépôt sous la racine d'un package de plugin tels que `index.js`, `api.js`,
  `runtime-api.js`, `setup-entry.js`, et des fichiers à portée limitée tels que
  `login-qr-api.js`. N'importez jamais `src/*` d'un package de plugin à partir du code principal ou d'une
  autre extension.
- Répartition du point d'entrée du dépôt :
  `<plugin-package-root>/api.js` est le baril d'aide/types,
  `<plugin-package-root>/runtime-api.js` est le baril d'exécution uniquement,
  `<plugin-package-root>/index.js` est le point d'entrée du plugin groupé,
  et `<plugin-package-root>/setup-entry.js` est le point d'entrée du plugin de configuration.
- Il ne reste aucun sous-chemin public groupé marqué par un channel. Les assistants spécifiques au channel et
  les coutures d'exécution se trouvent sous `<plugin-package-root>/api.js` et `<plugin-package-root>/runtime-api.js` ;
  le contrat public du SDK consiste plutôt en primitives partagées génériques.

Note de compatibilité :

- Évitez le baril racine `openclaw/plugin-sdk` pour le nouveau code.
- Privilégiez d'abord les primitives stables et étroites. Les nouveaux sous-chemins setup/pairing/reply/
  feedback/contract/inbound/threading/command/secret-input/webhook/infra/
  allowlist/status/message-tool constituent le contrat prévu pour les nouveaux travaux
  de plugins groupés et externes.
  L'analyse/correspondance de la cible appartient à `openclaw/plugin-sdk/channel-targets`.
  Les portails d'action de message et les assistants d'identifiant de message de réaction appartiennent à
  `openclaw/plugin-sdk/channel-actions`.
- Les barils d'assistants spécifiques aux extensions groupées ne sont pas stables par défaut. Si un
  assistant n'est nécessaire que pour une extension groupée, gardez-le derrière la couture locale
  `api.js` ou `runtime-api.js` de l'extension au lieu de le promouvoir dans
  `openclaw/plugin-sdk/<extension>`.
- Les nouvelles coutures d'assistants partagés doivent être génériques, et non marquées par un channel. L'analyse partagée de la cible
  appartient à `openclaw/plugin-sdk/channel-targets` ; les internes spécifiques au channel
  restent derrière la couture locale `api.js` ou `runtime-api.js`
  du plugin propriétaire.
- Les sous-chemins spécifiques aux capacités tels que `image-generation`,
  `media-understanding` et `speech` existent car les plugins groupés/natifs les utilisent
  aujourd'hui. Leur présence ne signifie pas en soi que chaque assistant exporté est un
  contrat externe gelé à long terme.

## Schémas d'outils de message

Les plugins doivent posséder les contributions de schéma `describeMessageTool(...)` spécifiques au canal.
Gardez les champs spécifiques au fournisseur dans le plugin, et non dans le cœur partagé.

Pour les fragments de schéma portables partagés, réutilisez les assistants génériques exportés via
`openclaw/plugin-sdk/channel-actions` :

- `createMessageToolButtonsSchema()` pour les charges utiles de style grille de boutons
- `createMessageToolCardSchema()` pour les charges utiles de cartes structurées

Si une forme de schéma n'a de sens que pour un seul fournisseur, définissez-la dans les sources propres de ce plugin
au lieu de la promouvoir dans le SDK partagé.

## Résolution de cible de canal

Les plugins de canal doivent posséder la sémantique de cible spécifique au canal. Gardez l'hôte sortant partagé
générique et utilisez la surface de l'adaptateur de messagerie pour les règles du fournisseur :

- `messaging.inferTargetChatType({ to })` décide si une cible normalisée
  doit être traitée comme `direct`, `group` ou `channel` avant la recherche dans l'annuaire.
- `messaging.targetResolver.looksLikeId(raw, normalized)` indique au cœur si une
  entrée doit passer directement à une résolution de type identifiant au lieu d'une recherche dans l'annuaire.
- `messaging.targetResolver.resolveTarget(...)` est le repli du plugin lorsque
  le cœur a besoin d'une résolution finale possédée par le fournisseur après normalisation ou après
  un échec de l'annuaire.
- `messaging.resolveOutboundSessionRoute(...)` est propriétaire de la construction de route de session spécifique au fournisseur
  une fois la cible résolue.

Répartition recommandée :

- Utilisez `inferTargetChatType` pour les décisions de catégorie qui doivent se produire avant
  de rechercher les pairs/groupes.
- Utilisez `looksLikeId` pour les vérifications « traiter ceci comme un identifiant de cible explicite/natif ».
- Utilisez `resolveTarget` pour le repli de normalisation spécifique au fournisseur, et non pour
  une recherche large dans l'annuaire.
- Gardez les identifiants natifs du fournisseur tels que les identifiants de chat, les identifiants de fil de discussion, les JID, les handles et les identifiants
  de salle dans les valeurs `target` ou les paramètres spécifiques au fournisseur, et non dans les champs génériques du SDK.

## Annuaires basés sur la configuration

Les plugins qui dérivent des entrées de répertoire à partir de la configuration doivent conserver cette logique dans le
plugin et réutiliser les assistants partagés de
`openclaw/plugin-sdk/directory-runtime`.

Utilisez ceci lorsqu'un channel a besoin de pairs/groupes basés sur la configuration, tels que :

- pairs DM basés sur une liste d'autorisation
- cartes de channel/groupe configurées
- alternatives de répertoire statique limitées au compte

Les assistants partagés dans `directory-runtime` ne gèrent que les opérations génériques :

- filtrage des requêtes
- application de la limite
- assistants de déduplication/normalisation
- construction de `ChannelDirectoryEntry[]`

L'inspection de compte spécifique au channel et la normalisation des identifiants doivent rester dans
l'implémentation du plugin.

## Catalogues de provider

Les plugins provider peuvent définir des catalogues de model pour l'inférence avec
`registerProvider({ catalog: { run(...) { ... } } })`.

`catalog.run(...)` renvoie la même forme que OpenClaw écrit dans
`models.providers` :

- `{ provider }` pour une entrée provider
- `{ providers }` pour plusieurs entrées provider

Utilisez `catalog` lorsque le plugin possède des identifiants de model spécifiques au provider, des URL de base
par défaut, ou des métadonnées de model protégées par authentification.

`catalog.order` contrôle le moment où le catalogue d'un plugin fusionne par rapport aux
providers implicites intégrés de OpenClaw :

- `simple` : providers simples avec clé API ou pilotés par env
- `profile` : providers qui apparaissent lorsque des profils d'auth existent
- `paired` : providers qui synthétisent plusieurs entrées provider liées
- `late` : dernière passe, après les autres providers implicites

Les providers ultérieurs l'emportent en cas de collision de clé, donc les plugins peuvent intentionnellement remplacer une
entrée provider intégrée avec le même identifiant provider.

Compatibilité :

- `discovery` fonctionne toujours comme un alias hérité
- si `catalog` et `discovery` sont tous deux enregistrés, OpenClaw utilise `catalog`

## Inspection de channel en lecture seule

Si votre plugin enregistre un channel, privilégiez l'implémentation de
`plugin.config.inspectAccount(cfg, accountId)` avec `resolveAccount(...)`.

Pourquoi :

- `resolveAccount(...)` est le chemin d'exécution. Il est autorisé à supposer que les identifiants
  sont entièrement matérialisés et peut échouer rapidement lorsque les secrets requis sont manquants.
- Les chemins de commande en lecture seule tels que `openclaw status`, `openclaw status --all`,
  `openclaw channels status`, `openclaw channels resolve`, et les flux de réparation
  doctor/config ne devraient pas avoir besoin de matérialiser les identifiants d'exécution juste pour
  décrire la configuration.

Comportement recommandé pour `inspectAccount(...)` :

- Ne renvoyer que l'état descriptif du compte.
- Préserver `enabled` et `configured`.
- Inclure les champs de source/statut des identifiants lorsque cela est pertinent, tels que :
  - `tokenSource`, `tokenStatus`
  - `botTokenSource`, `botTokenStatus`
  - `appTokenSource`, `appTokenStatus`
  - `signingSecretSource`, `signingSecretStatus`
- Vous n'avez pas besoin de renvoyer les valeurs brutes des jetons juste pour signaler la disponibilité
  en lecture seule. Renvoyer `tokenStatus: "available"` (et le champ source correspondant)
  est suffisant pour les commandes de type statut.
- Utilisez `configured_unavailable` lorsqu'un identifiant est configuré via SecretRef mais
  indisponible dans le chemin de commande actuel.

Cela permet aux commandes en lecture seule de signaler « configuré mais indisponible dans ce chemin
de commande » au lieu de planter ou de signaler incorrectement que le compte n'est pas configuré.

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

Chaque entrée devient un plugin. Si le pack répertorie plusieurs extensions, l'id du plugin
devient `name/<fileBase>`.

Si votre plugin importe des deps npm, installez-les dans ce répertoire afin
que `node_modules` soit disponible (`npm install` / `pnpm install`).

Garde-fou de sécurité : chaque entrée `openclaw.extensions` doit rester à l'intérieur du répertoire
du plugin après la résolution des liens symboliques. Les entrées qui s'échappent du répertoire du package sont
rejetées.

Note de sécurité : `openclaw plugins install` installe les dépendances du plugin avec
`npm install --omit=dev --ignore-scripts` (pas de scripts de cycle de vie, pas de dépendances de développement à l'exécution). Gardez les arbres de dépendances des plugins "en JS/TS pur" et évitez les packages qui nécessitent des compilations `postinstall`.

Optionnel : `openclaw.setupEntry` peut pointer vers un module léger de configuration uniquement.
Lorsque OpenClaw a besoin de surfaces de configuration pour un plugin de canal désactivé, ou
lorsqu'un plugin de canal est activé mais toujours non configuré, il charge `setupEntry`
au lieu du point d'entrée complet du plugin. Cela rend le démarrage et la configuration plus légers
lorsque votre point d'entrée principal du plugin câble également des outils, des hooks ou d'autres codes
d'exécution uniquement.

Optionnel : `openclaw.startup.deferConfiguredChannelFullLoadUntilAfterListen`
peut permettre à un plugin de canal d'emprunter le même chemin `setupEntry` pendant la phase de
démarrage pré-écoute de la passerelle, même lorsque le canal est déjà configuré.

Utilisez ceci uniquement lorsque `setupEntry` couvre entièrement la surface de démarrage qui doit exister
avant que la passerelle ne commence à écouter. En pratique, cela signifie que le point d'entrée de configuration
doit enregistrer chaque capacité possédée par le canal dont dépend le démarrage, telles que :

- l'enregistrement du canal lui-même
- toutes les routes HTTP qui doivent être disponibles avant que la passerelle ne commence à écouter
- toutes les méthodes, outils ou services de passerelle qui doivent exister pendant cette même fenêtre

Si votre entrée complète possède toujours une capacité de démarrage requise, n'activez pas
ce drapeau. Conservez le plugin sur le comportement par défaut et laissez OpenClaw charger l'
entrée complète pendant le démarrage.

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
des indices d'installation via `openclaw.install`. Cela maintient le catalogue principal sans données.

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

OpenClaw peut également fusionner des **catalogues de canaux externes** (par exemple, un export
de registre MPM). Déposez un fichier JSON à l'un des emplacements suivants :

- `~/.openclaw/mpm/plugins.json`
- `~/.openclaw/mpm/catalog.json`
- `~/.openclaw/plugins/catalog.json`

Ou pointez `OPENCLAW_PLUGIN_CATALOG_PATHS` (ou `OPENCLAW_MPM_CATALOG_PATHS`) vers
un ou plusieurs fichiers JSON (délimités par des virgules, des points-virgules ou `PATH`). Chaque fichier doit
contenir `{ "entries": [ { "name": "@scope/pkg", "openclaw": { "channel": {...}, "install": {...} } } ] }`. L'analyseur accepte également `"packages"` ou `"plugins"` comme alias de clé hérités pour la clé `"entries"`.

## Plugins de moteur de contexte

Les plugins de moteur de contexte possèdent l'orchestration du contexte de session pour l'ingestion, l'assemblage
et la compactage. Enregistrez-les depuis votre plugin avec
`api.registerContextEngine(id, factory)`, puis sélectionnez le moteur actif avec
`plugins.slots.contextEngine`.

Utilisez ceci lorsque votre plugin doit remplacer ou étendre le pipeline de contexte par défaut
plutôt que d'ajouter simplement une recherche de mémoire ou des hooks.

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

## Ajout d'une nouvelle fonctionnalité

Lorsqu'un plugin a besoin d'un comportement qui ne correspond pas à la API actuelle, ne contournez pas
le système de plugins par un accès privé. Ajoutez la fonctionnalité manquante.

Séquence recommandée :

1. définir le contrat principal
   Décidez du comportement partagé que le cœur devrait posséder : stratégie, repli, fusion de configuration,
   cycle de vie, sémantique orientée canal, et forme de l'aide d'exécution.
2. ajouter des surfaces d'enregistrement/exécution de plugins typées
   Étendez `OpenClawPluginApi` et/ou `api.runtime` avec la plus petite surface
   de capacité typée utile.
3. connecter le cœur + consommateurs canal/fonctionnalité
   Les canaux et les plugins de fonctionnalité devraient consommer la nouvelle capacité via le cœur,
   et non en important une implémentation fournisseur directement.
4. enregistrer les implémentations fournisseur
   Les plugins fournisseur enregistrent ensuite leurs backends sur la capacité.
5. ajouter une couverture de contrat
   Ajoutez des tests pour que la propriété et la forme de l'enregistrement restent explicites dans le temps.

C'est ainsi que OpenClaw reste opiniâtre sans devenir codé en dur selon la vision du monde
d'un seul fournisseur. Voir le [Capabilité Cookbook](/en/tools/capability-cookbook)
pour une liste de contrôle de fichiers concrète et un exemple travaillé.

### Liste de contrôle des fonctionnalités

Lorsque vous ajoutez une nouvelle fonctionnalité, l'implémentation doit généralement toucher ces
surfaces ensemble :

- types de contrat principal dans `src/<capability>/types.ts`
- aide d'exécution/runner principal dans `src/<capability>/runtime.ts`
- surface d'enregistrement de l'API de plugin dans `src/plugins/types.ts`
- câblage du registre de plugins dans `src/plugins/registry.ts`
- exposition au runtime du plugin dans `src/plugins/runtime/*` lorsque les plugins de fonctionnalité/channel
  doivent le consommer
- helpers de capture/test dans `src/test-utils/plugin-registration.ts`
- assertions de propriété/contrat dans `src/plugins/contracts/registry.ts`
- documentation opérateur/plugin dans `docs/`

Si l'une de ces surfaces manque, c'est généralement un signe que la capacité n'est
pas encore totalement intégrée.

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
- les plugins vendor possèdent les implémentations vendor
- les plugins de fonctionnalité/channel consomment les helpers d'exécution
- les tests de contrat rendent la propriété explicite
