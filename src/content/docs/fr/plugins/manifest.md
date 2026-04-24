---
summary: "Plugin manifest + JSON schema requirements (strict config validation)"
read_when:
  - You are building an OpenClaw plugin
  - You need to ship a plugin config schema or debug plugin validation errors
title: "Manifeste de plugin"
---

# Manifeste de plugin (openclaw.plugin.)

Cette page concerne uniquement le **manifeste de plugin natif OpenClaw**.

Pour les dispositions de bundle compatibles, voir [Plugin bundles](/fr/plugins/bundles).

Les formats de bundle compatibles utilisent des fichiers de manifeste différents :

- Codex bundle : `.codex-plugin/plugin.json`
- Claude bundle : `.claude-plugin/plugin.json` ou la disposition par défaut du composant Claude
  sans manifeste
- Cursor bundle : `.cursor-plugin/plugin.json`

OpenClaw détecte automatiquement ces dispositions de bundle également, mais elles ne sont pas validées
contre le schéma `openclaw.plugin.json` décrit ici.

Pour les bundles compatibles, OpenClaw lit actuellement les métadonnées du bundle ainsi que les racines de compétences (skill roots) déclarées,
les racines de commandes Claude, les valeurs par défaut du `settings.json` du bundle Claude,
les valeurs par défaut LSP du bundle Claude, et les packs de hooks pris en charge lorsque la disposition correspond
aux attentes du runtime OpenClaw.

Chaque plugin natif OpenClaw **doit** inclure un fichier `openclaw.plugin.json` à la
**racine du plugin**. OpenClaw utilise ce manifeste pour valider la configuration
**sans exécuter le code du plugin**. Les manifestes manquants ou invalides sont traités comme
des erreurs de plugin et bloquent la validation de la configuration.

Voir le guide complet du système de plugins : [Plugins](/fr/tools/plugin).
Pour le modèle de capacité natif et les conseils actuels de compatibilité externe :
[Capability model](/fr/plugins/architecture#public-capability-model).

## À quoi sert ce fichier

`openclaw.plugin.json` sont les métadonnées qu'OpenClaw lit avant de charger votre
code de plugin.

Utilisez-le pour :

- identité du plugin
- validation de la configuration
- métadonnées d'authentification et d'intégration (onboarding) qui doivent être disponibles sans démarrer l'exécution du plugin
  runtime
- indices d'activation bon marché que les surfaces du plan de contrôle peuvent inspecter avant que le runtime
  ne les charge
- descripteurs de configuration bon marché que les surfaces de configuration/onboarding peuvent inspecter avant
  que le runtime ne les charge
- métadonnées d'alias et d'activation automatique qui doivent être résolues avant le chargement du runtime du plugin
- métadonnées de propriété de famille de modèles abrégées qui doivent activer automatiquement le
  plugin avant le chargement du runtime
- instantanés statiques de propriété des capacités utilisés pour le câblage de compatibilité groupé et
  la couverture contractuelle
- métadonnées bon marché du lanceur QA que l'hôte `openclaw qa` partagé peut inspecter
  avant le chargement du runtime du plugin
- métadonnées de configuration spécifiques au canal qui doivent fusionner dans les surfaces de catalogue et de validation
  sans charger le runtime
- indices de l'interface utilisateur de configuration

Ne pas l'utiliser pour :

- enregistrer le comportement d'exécution
- déclaration des points d'entrée du code
- métadonnées d'installation de npm

Celles-ci appartiennent à votre code de plugin et `package.json`.

## Exemple minimal

```json
{
  "id": "voice-call",
  "configSchema": {
    "type": "object",
    "additionalProperties": false,
    "properties": {}
  }
}
```

## Exemple complet

```json
{
  "id": "openrouter",
  "name": "OpenRouter",
  "description": "OpenRouter provider plugin",
  "version": "1.0.0",
  "providers": ["openrouter"],
  "modelSupport": {
    "modelPrefixes": ["router-"]
  },
  "providerEndpoints": [
    {
      "endpointClass": "xai-native",
      "hosts": ["api.x.ai"]
    }
  ],
  "cliBackends": ["openrouter-cli"],
  "syntheticAuthRefs": ["openrouter-cli"],
  "providerAuthEnvVars": {
    "openrouter": ["OPENROUTER_API_KEY"]
  },
  "providerAuthAliases": {
    "openrouter-coding": "openrouter"
  },
  "channelEnvVars": {
    "openrouter-chatops": ["OPENROUTER_CHATOPS_TOKEN"]
  },
  "providerAuthChoices": [
    {
      "provider": "openrouter",
      "method": "api-key",
      "choiceId": "openrouter-api-key",
      "choiceLabel": "OpenRouter API key",
      "groupId": "openrouter",
      "groupLabel": "OpenRouter",
      "optionKey": "openrouterApiKey",
      "cliFlag": "--openrouter-api-key",
      "cliOption": "--openrouter-api-key <key>",
      "cliDescription": "OpenRouter API key",
      "onboardingScopes": ["text-inference"]
    }
  ],
  "uiHints": {
    "apiKey": {
      "label": "API key",
      "placeholder": "sk-or-v1-...",
      "sensitive": true
    }
  },
  "configSchema": {
    "type": "object",
    "additionalProperties": false,
    "properties": {
      "apiKey": {
        "type": "string"
      }
    }
  }
}
```

## Référence des champs de premier niveau

| Champ                                | Obligatoire | Type                             | Signification                                                                                                                                                                                                                                                                                                                                      |
| ------------------------------------ | ----------- | -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`                                 | Oui         | `string`                         | Identifiant canonique du plugin. C'est l'identifiant utilisé dans `plugins.entries.<id>`.                                                                                                                                                                                                                                                          |
| `configSchema`                       | Oui         | `object`                         | Schéma JSON en ligne pour la configuration de ce plugin.                                                                                                                                                                                                                                                                                           |
| `enabledByDefault`                   | Non         | `true`                           | Marque un plugin bundle comme activé par défaut. Omettez-le, ou définissez une valeur autre que `true`, pour laisser le plugin désactivé par défaut.                                                                                                                                                                                               |
| `legacyPluginIds`                    | Non         | `string[]`                       | ID hérités qui sont normalisés vers cet ID de plugin canonique.                                                                                                                                                                                                                                                                                    |
| `autoEnableWhenConfiguredProviders`  | Non         | `string[]`                       | ID de fournisseur qui doivent activer automatiquement ce plugin lorsque l'authentification, la configuration ou les références de modèle les mentionnent.                                                                                                                                                                                          |
| `kind`                               | Non         | `"memory"` \| `"context-engine"` | Déclare un type de plugin exclusif utilisé par `plugins.slots.*`.                                                                                                                                                                                                                                                                                  |
| `channels`                           | Non         | `string[]`                       | ID de canal possédés par ce plugin. Utilisés pour la découverte et la validation de la configuration.                                                                                                                                                                                                                                              |
| `providers`                          | Non         | `string[]`                       | ID de fournisseur possédés par ce plugin.                                                                                                                                                                                                                                                                                                          |
| `modelSupport`                       | Non         | `object`                         | Métadonnées abrégées de famille de modèles possédées par le manifeste, utilisées pour charger automatiquement le plugin avant l'exécution.                                                                                                                                                                                                         |
| `providerEndpoints`                  | Non         | `object[]`                       | Métadonnées d'hôte/URL de base du point de terminaison appartenant au manifeste pour les itinéraires du fournisseur que le cœur doit classer avant le chargement du runtime du fournisseur.                                                                                                                                                        |
| `cliBackends`                        | Non         | `string[]`                       | Identifiants du backend d'inférence CLI appartenant à ce plugin. Utilisés pour l'auto-activation au démarrage à partir de références de configuration explicites.                                                                                                                                                                                  |
| `syntheticAuthRefs`                  | Non         | `string[]`                       | Références du backend du fournisseur ou de la CLI dont le hook d'authentification synthétique appartenant au plugin doit être sondé lors de la découverte à froid des modèles avant le chargement du runtime.                                                                                                                                      |
| `nonSecretAuthMarkers`               | Non         | `string[]`                       | Valeurs de clé d'API de substitution appartenant au plugin groupé qui représentent un état d'identification non secret local, OAuth ou ambiant.                                                                                                                                                                                                    |
| `commandAliases`                     | Non         | `object[]`                       | Noms de commandes appartenant à ce plugin qui doivent produire une configuration et des diagnostics CLI conscients du plugin avant le chargement du runtime.                                                                                                                                                                                       |
| `providerAuthEnvVars`                | Non         | `Record<string, string[]>`       | Métadonnées d'environnement d'authentification de fournisseur peu coûteuses que OpenClaw peut inspecter sans charger le code du plugin.                                                                                                                                                                                                            |
| `providerAuthAliases`                | Non         | `Record<string, string>`         | Identifiants de fournisseurs qui doivent réutiliser un autre identifiant de fournisseur pour la recherche d'authentification, par exemple un fournisseur de codage qui partage la clé d'API et les profils d'authentification du fournisseur de base.                                                                                              |
| `channelEnvVars`                     | Non         | `Record<string, string[]>`       | Métadonnées d'environnement de canal peu coûteuses que OpenClaw peut inspecter sans charger le code du plugin. Utilisez ceci pour la configuration de canal pilotée par l'environnement ou les surfaces d'authentification que les assistants génériques de démarrage/configuration doivent voir.                                                  |
| `providerAuthChoices`                | Non         | `object[]`                       | Métadonnées de choix d'authentification peu coûteuses pour les sélecteurs d'intégration, la résolution de fournisseur préféré et le câblage simple des drapeaux CLI.                                                                                                                                                                               |
| `activation`                         | Non         | `object`                         | Indices d'activation peu coûteux pour le provider, la commande, le canal, l'itinéraire et le chargement déclenché par des capacités. Métadonnées uniquement ; le runtime du plugin possède toujours le comportement réel.                                                                                                                          |
| `setup`                              | Non         | `object`                         | Descripteurs de configuration/d'intégration peu coûteux que les surfaces de découverte et de configuration peuvent inspecter sans charger le runtime du plugin.                                                                                                                                                                                    |
| `qaRunners`                          | Non         | `object[]`                       | Descripteurs de runners QA peu coûteux utilisés par l'hôte partagé `openclaw qa` avant le chargement du runtime du plugin.                                                                                                                                                                                                                         |
| `contracts`                          | Non         | `object`                         | Instantané statique des capacités groupées pour les crochets d'authentification externe, la reconnaissance vocale, la transcription en temps réel, la voix en temps réel, la compréhension des médias, la génération d'images, la génération de musique, la génération de vidéo, la récupération web, la recherche web et la propriété des outils. |
| `mediaUnderstandingProviderMetadata` | Non         | `Record<string, object>`         | Valeurs par défaut peu coûteuses pour la compréhension des médias pour les ids de provider déclarés dans `contracts.mediaUnderstandingProviders`.                                                                                                                                                                                                  |
| `channelConfigs`                     | Non         | `Record<string, object>`         | Métadonnées de configuration de canal détenues par le manifeste, fusionnées dans les surfaces de découverte et de validation avant le chargement du runtime.                                                                                                                                                                                       |
| `skills`                             | Non         | `string[]`                       | Répertoires de compétences à charger, relatifs à la racine du plugin.                                                                                                                                                                                                                                                                              |
| `name`                               | Non         | `string`                         | Nom du plugin lisible par l'homme.                                                                                                                                                                                                                                                                                                                 |
| `description`                        | Non         | `string`                         | Résumé court affiché dans les surfaces du plugin.                                                                                                                                                                                                                                                                                                  |
| `version`                            | Non         | `string`                         | Version d'information du plugin.                                                                                                                                                                                                                                                                                                                   |
| `uiHints`                            | Non         | `Record<string, object>`         | Libellés d'interface utilisateur, espaces réservés et indicateurs de sensibilité pour les champs de configuration.                                                                                                                                                                                                                                 |

## Référence de providerAuthChoices

Chaque entrée `providerAuthChoices` décrit un choix d'onboarding ou d'authentification.
OpenClaw lit cela avant le chargement du runtime du provider.

| Champ                 | Obligatoire | Type                                            | Signification                                                                                                           |
| --------------------- | ----------- | ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `provider`            | Oui         | `string`                                        | Id du provider auquel ce choix appartient.                                                                              |
| `method`              | Oui         | `string`                                        | Id de la méthode d'authentification vers laquelle dispatcher.                                                           |
| `choiceId`            | Oui         | `string`                                        | Id stable du choix d'authentification utilisé par les flux d'onboarding et de CLI.                                      |
| `choiceLabel`         | Non         | `string`                                        | Libellé orienté utilisateur. Si omis, OpenClaw revient à `choiceId`.                                                    |
| `choiceHint`          | Non         | `string`                                        | Texte d'aide court pour le sélecteur.                                                                                   |
| `assistantPriority`   | Non         | `number`                                        | Les valeurs inférieures sont triées plus tôt dans les sélecteurs interactifs pilotés par l'assistant.                   |
| `assistantVisibility` | Non         | `"visible"` \| `"manual-only"`                  | Masquer le choix des sélecteurs d'assistant tout en autorisant toujours la sélection manuelle via la CLI.               |
| `deprecatedChoiceIds` | Non         | `string[]`                                      | Ids de choix hérités qui doivent rediriger les utilisateurs vers ce choix de remplacement.                              |
| `groupId`             | Non         | `string`                                        | Id de groupe facultatif pour regrouper les choix connexes.                                                              |
| `groupLabel`          | Non         | `string`                                        | Libellé orienté utilisateur pour ce groupe.                                                                             |
| `groupHint`           | Non         | `string`                                        | Texte d'aide court pour le groupe.                                                                                      |
| `optionKey`           | Non         | `string`                                        | Clé d'option interne pour les flux d'authentification simples à un indicateur.                                          |
| `cliFlag`             | Non         | `string`                                        | Nom de l'indicateur CLI, tel que `--openrouter-api-key`.                                                                |
| `cliOption`           | Non         | `string`                                        | Forme complète de l'option CLI, telle que `--openrouter-api-key <key>`.                                                 |
| `cliDescription`      | Non         | `string`                                        | Description utilisée dans l'aide CLI.                                                                                   |
| `onboardingScopes`    | Non         | `Array<"text-inference" \| "image-generation">` | Surfaces d'onboarding dans lesquelles ce choix doit apparaître. Si omis, la valeur par défaut est `["text-inference"]`. |

## Référence commandAliases

Utilisez `commandAliases` lorsqu'un plugin possède un nom de commande d'exécution que les utilisateurs
peuvent mettre par erreur dans `plugins.allow` ou essayer d'exécuter comme une commande racine CLI. OpenClaw
utilise ces métadonnées pour le diagnostic sans importer le code d'exécution du plugin.

```json
{
  "commandAliases": [
    {
      "name": "dreaming",
      "kind": "runtime-slash",
      "cliCommand": "memory"
    }
  ]
}
```

| Champ        | Obligatoire | Type              | Signification                                                                      |
| ------------ | ----------- | ----------------- | ---------------------------------------------------------------------------------- |
| `name`       | Oui         | `string`          | Nom de commande appartenant à ce plugin.                                           |
| `kind`       | Non         | `"runtime-slash"` | Marque l'alias comme une commande slash de chat plutôt qu'une commande racine CLI. |
| `cliCommand` | Non         | `string`          | Commande racine CLI connexe à suggérer pour les opérations CLI, si elle existe.    |

## Référence activation

Utilisez `activation` lorsque le plugin peut déclarer facilement quels événements du plan de contrôle
doivent l'activer ultérieurement.

## Référence qaRunners

Utilisez `qaRunners` lorsqu'un plugin contribue avec un ou plusieurs runners de transport sous
la racine `openclaw qa` partagée. Gardez ces métadonnées légères et statiques ; le runtime
du plugin possède toujours l'enregistrement CLI réel via une surface légère
`runtime-api.ts` qui exporte `qaRunnerCliRegistrations`.

```json
{
  "qaRunners": [
    {
      "commandName": "matrix",
      "description": "Run the Docker-backed Matrix live QA lane against a disposable homeserver"
    }
  ]
}
```

| Champ         | Obligatoire | Type     | Signification                                                                         |
| ------------- | ----------- | -------- | ------------------------------------------------------------------------------------- |
| `commandName` | Oui         | `string` | Sous-commande montée sous `openclaw qa`, par exemple `matrix`.                        |
| `description` | Non         | `string` | Texte d'aide de repli utilisé lorsque l'hôte partagé a besoin d'une commande de stub. |

Ce bloc est des métadonnées uniquement. Il n'enregistre pas le comportement d'exécution et ne remplace pas `register(...)`, `setupEntry`, ou d'autres points d'entrée d'exécution/plugin. Les consommateurs actuels l'utilisent comme indice de réduction avant le chargement plus large des plugins, donc l'absence de métadonnées d'activation ne coûte généralement que des performances ; elle ne devrait pas changer la correction tant que les replis de propriété de manifeste hérités existent encore.

```json
{
  "activation": {
    "onProviders": ["openai"],
    "onCommands": ["models"],
    "onChannels": ["web"],
    "onRoutes": ["gateway-webhook"],
    "onCapabilities": ["provider", "tool"]
  }
}
```

| Champ            | Obligatoire | Type                                                 | Signification                                                                                  |
| ---------------- | ----------- | ---------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `onProviders`    | Non         | `string[]`                                           | Identifiants de provider qui doivent activer ce plugin lorsqu'ils sont demandés.               |
| `onCommands`     | Non         | `string[]`                                           | Identifiants de commande qui doivent activer ce plugin.                                        |
| `onChannels`     | Non         | `string[]`                                           | Identifiants de channel qui doivent activer ce plugin.                                         |
| `onRoutes`       | Non         | `string[]`                                           | Types de routes qui doivent activer ce plugin.                                                 |
| `onCapabilities` | Non         | `Array<"provider" \| "channel" \| "tool" \| "hook">` | Indices larges de capacités utilisés par la planification de l'activation du plan de contrôle. |

Consommateurs actifs actuels :

- la planification CLI déclenchée par commande revient à l'ancien `commandAliases[].cliCommand` ou `commandAliases[].name`
- la planification setup/channel déclenchée par channel revient à l'ancienne `channels[]`
  propriété lorsque les métadonnées d'activation de canal explicites sont manquantes
- la planification setup/runtime déclenchée par provider revient à l'ancien
  `providers[]` et à la propriété de premier niveau `cliBackends[]` lorsque les métadonnées d'activation de provider explicites sont manquantes

## référence setup

Utilisez `setup` lorsque les surfaces de configuration et d'intégration ont besoin de métadonnées peu coûteuses appartenant au plugin avant le chargement de l'exécution.

```json
{
  "setup": {
    "providers": [
      {
        "id": "openai",
        "authMethods": ["api-key"],
        "envVars": ["OPENAI_API_KEY"]
      }
    ],
    "cliBackends": ["openai-cli"],
    "configMigrations": ["legacy-openai-auth"],
    "requiresRuntime": false
  }
}
```

Le `cliBackends` de premier niveau reste valide et continue à décrire les backends d'inférence CLI. `setup.cliBackends` est la surface de descripteur spécifique au setup pour les flux de contrôle/setup qui doivent rester des métadonnées uniquement.

Lorsqu'ils sont présents, `setup.providers` et `setup.cliBackends` sont la surface de recherche privilégiée basée sur le descripteur pour la découverte de la configuration. Si le descripteur ne fait que restreindre le plugin candidat et que la configuration nécessite encore des hooks d'exécution plus riches au moment de la configuration, définissez `requiresRuntime: true` et gardez `setup-api` en place en tant que chemin d'exécution de secours.

Étant donné que la recherche de configuration peut exécuter du code `setup-api` appartenant au plugin, les valeurs normalisées `setup.providers[].id` et `setup.cliBackends[]` doivent rester uniques parmi les plugins découverts. Une propriété ambiguë échoue de manière fermée au lieu de choisir un gagnant selon l'ordre de découverte.

### référence de setup.providers

| Champ         | Obligatoire | Type       | Signification                                                                                                                            |
| ------------- | ----------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `id`          | Oui         | `string`   | Id du fournisseur exposé lors de la configuration ou de l'intégration. Gardez les ids normalisés uniques globalement.                    |
| `authMethods` | Non         | `string[]` | Ids des méthodes de configuration/authentification que ce fournisseur prend en charge sans charger le runtime complet.                   |
| `envVars`     | Non         | `string[]` | Variables d'environnement que les surfaces de configuration/statut génériques peuvent vérifier avant le chargement du runtime du plugin. |

### champs de setup

| Champ              | Obligatoire | Type       | Signification                                                                                                                                                     |
| ------------------ | ----------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `providers`        | Non         | `object[]` | Descripteurs de configuration du fournisseur exposés lors de la configuration et de l'intégration.                                                                |
| `cliBackends`      | Non         | `string[]` | Ids de backend au moment de la configuration utilisés pour la recherche de configuration basée sur le descripteur. Gardez les ids normalisés uniques globalement. |
| `configMigrations` | Non         | `string[]` | Ids de migration de configuration appartenant à la surface de configuration de ce plugin.                                                                         |
| `requiresRuntime`  | Non         | `boolean`  | Indique si la configuration nécessite encore l'exécution de `setup-api` après la recherche du descripteur.                                                        |

## référence de uiHints

`uiHints` est une carte des noms de champs de configuration vers de petits indices de rendu.

```json
{
  "uiHints": {
    "apiKey": {
      "label": "API key",
      "help": "Used for OpenRouter requests",
      "placeholder": "sk-or-v1-...",
      "sensitive": true
    }
  }
}
```

Chaque indice de champ peut inclure :

| Champ         | Type       | Signification                                         |
| ------------- | ---------- | ----------------------------------------------------- |
| `label`       | `string`   | Libellé du champ orienté utilisateur.                 |
| `help`        | `string`   | Texte d'aide court.                                   |
| `tags`        | `string[]` | Balises UI facultatives.                              |
| `advanced`    | `boolean`  | Marque le champ comme avancé.                         |
| `sensitive`   | `boolean`  | Marque le champ comme secret ou sensible.             |
| `placeholder` | `string`   | Texte d'espace réservé pour les champs de formulaire. |

## référence des contrats

Utilisez `contracts` uniquement pour les métadonnées statiques de propriété des capacités qu'OpenClaw peut
lire sans importer le runtime du plugin.

```json
{
  "contracts": {
    "embeddedExtensionFactories": ["pi"],
    "externalAuthProviders": ["acme-ai"],
    "speechProviders": ["openai"],
    "realtimeTranscriptionProviders": ["openai"],
    "realtimeVoiceProviders": ["openai"],
    "mediaUnderstandingProviders": ["openai", "openai-codex"],
    "imageGenerationProviders": ["openai"],
    "videoGenerationProviders": ["qwen"],
    "webFetchProviders": ["firecrawl"],
    "webSearchProviders": ["gemini"],
    "tools": ["firecrawl_search", "firecrawl_scrape"]
  }
}
```

Chaque liste est facultative :

| Champ                            | Type       | Signification                                                                                        |
| -------------------------------- | ---------- | ---------------------------------------------------------------------------------------------------- |
| `embeddedExtensionFactories`     | `string[]` | Identifiants d'exécution intégrés pour lesquels un plugin groupé peut enregistrer des fabriques.     |
| `externalAuthProviders`          | `string[]` | Identifiants des providers dont le hook de profil d'authentification externe appartient à ce plugin. |
| `speechProviders`                | `string[]` | Identifiants des providers de synthèse vocale dont ce plugin est propriétaire.                       |
| `realtimeTranscriptionProviders` | `string[]` | Identifiants des providers de transcription en temps réel dont ce plugin est propriétaire.           |
| `realtimeVoiceProviders`         | `string[]` | Identifiants des providers de voix en temps réel dont ce plugin est propriétaire.                    |
| `mediaUnderstandingProviders`    | `string[]` | Identifiants des providers de compréhension de média dont ce plugin est propriétaire.                |
| `imageGenerationProviders`       | `string[]` | Identifiants des providers de génération d'images dont ce plugin est propriétaire.                   |
| `videoGenerationProviders`       | `string[]` | Identifiants des providers de génération de vidéos dont ce plugin est propriétaire.                  |
| `webFetchProviders`              | `string[]` | Identifiants des providers de récupération web dont ce plugin est propriétaire.                      |
| `webSearchProviders`             | `string[]` | Identifiants des providers de recherche web dont ce plugin est propriétaire.                         |
| `tools`                          | `string[]` | Noms d'outils d'agent dont ce plugin est propriétaire pour les vérifications de contrat groupé.      |

Les plugins provider qui implémentent `resolveExternalAuthProfiles` doivent déclarer
`contracts.externalAuthProviders`. Les plugins sans la déclaration s'exécutent toujours
via un mécanisme de compatibilité obsolète, mais ce mécanisme est plus lent et
sera supprimé après la période de migration.

## Référence de mediaUnderstandingProviderMetadata

Utilisez `mediaUnderstandingProviderMetadata` lorsqu'un provider de compréhension de média possède des modèles par défaut, une priorité de repli d'auth automatique, ou une prise en charge native de document dont les assistants de base génériques ont besoin avant le chargement de l'exécution. Les clés doivent également être déclarées dans `contracts.mediaUnderstandingProviders`.

```json
{
  "contracts": {
    "mediaUnderstandingProviders": ["example"]
  },
  "mediaUnderstandingProviderMetadata": {
    "example": {
      "capabilities": ["image", "audio"],
      "defaultModels": {
        "image": "example-vision-latest",
        "audio": "example-transcribe-latest"
      },
      "autoPriority": {
        "image": 40
      },
      "nativeDocumentInputs": ["pdf"]
    }
  }
}
```

Chaque entrée de provider peut inclure :

| Champ                  | Type                                | Signification                                                                                                                |
| ---------------------- | ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `capabilities`         | `("image" \| "audio" \| "video")[]` | Capacités multimédia exposées par ce provider.                                                                               |
| `defaultModels`        | `Record<string, string>`            | Valeurs par défaut de capacité vers modèle utilisées lorsque la configuration ne spécifie pas de modèle.                     |
| `autoPriority`         | `Record<string, number>`            | Les nombres plus bas sont triés en premier pour le repli automatique du provider basé sur les informations d'identification. |
| `nativeDocumentInputs` | `"pdf"[]`                           | Entrées de document natives prises en charge par le provider.                                                                |

## Référence de channelConfigs

Utilisez `channelConfigs` lorsqu'un plugin de canal a besoin de métadonnées de configuration bon marché avant le chargement de l'exécution.

```json
{
  "channelConfigs": {
    "matrix": {
      "schema": {
        "type": "object",
        "additionalProperties": false,
        "properties": {
          "homeserverUrl": { "type": "string" }
        }
      },
      "uiHints": {
        "homeserverUrl": {
          "label": "Homeserver URL",
          "placeholder": "https://matrix.example.com"
        }
      },
      "label": "Matrix",
      "description": "Matrix homeserver connection",
      "preferOver": ["matrix-legacy"]
    }
  }
}
```

Chaque entrée de canal peut inclure :

| Champ         | Type                     | Signification                                                                                                                            |
| ------------- | ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `schema`      | `object`                 | Schéma JSON pour `channels.<id>`. Requis pour chaque entrée de configuration de canal déclarée.                                          |
| `uiHints`     | `Record<string, object>` | Labels d'interface utilisateur, espaces réservés ou indications de sensibilité facultatifs pour cette section de configuration de canal. |
| `label`       | `string`                 | Label de canal fusionné dans les surfaces de sélection et d'inspection lorsque les métadonnées d'exécution ne sont pas prêtes.           |
| `description` | `string`                 | Courte description du canal pour les surfaces d'inspection et de catalogue.                                                              |
| `preferOver`  | `string[]`               | Identifiants de plugin hérités ou de priorité inférieure que ce canal devrait dépasser dans les surfaces de sélection.                   |

## Référence de modelSupport

Utilisez `modelSupport` lorsque OpenClaw doit déduire votre plugin de provider à partir d'identifiants de modèle abrégés comme `gpt-5.4` ou `claude-sonnet-4.6` avant le chargement de l'exécution du plugin.

```json
{
  "modelSupport": {
    "modelPrefixes": ["gpt-", "o1", "o3", "o4"],
    "modelPatterns": ["^computer-use-preview"]
  }
}
```

OpenClaw applique cette priorité :

- les références explicites `provider/model` utilisent les métadonnées du manifeste `providers` propriétaire
- `modelPatterns` l'emporte sur `modelPrefixes`
- si un plugin non groupé et un plugin groupé correspondent tous les deux, le plugin
  non groupé l'emporte
- l'ambiguïté restante est ignorée jusqu'à ce que l'utilisateur ou la configuration spécifie un provider

Champs :

| Champ           | Type       | Signification                                                                                         |
| --------------- | ---------- | ----------------------------------------------------------------------------------------------------- |
| `modelPrefixes` | `string[]` | Préfixes correspondants avec `startsWith` par rapport aux identifiants abrégés de model.              |
| `modelPatterns` | `string[]` | Sources regex correspondant aux identifiants abrégés de model après suppression du suffixe de profil. |

Les clés de capacité de premier niveau héritées sont dépréciées. Utilisez `openclaw doctor --fix` pour
déplacer `speechProviders`, `realtimeTranscriptionProviders`,
`realtimeVoiceProviders`, `mediaUnderstandingProviders`,
`imageGenerationProviders`, `videoGenerationProviders`,
`webFetchProviders`, et `webSearchProviders` sous `contracts` ; le
chargement normal du manifeste ne traite plus ces champs de premier niveau comme une
propriété de capacité.

## Manifeste versus package.

Les deux fichiers servent des objectifs différents :

| Fichier                | Utilisé pour                                                                                                                                                                            |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `openclaw.plugin.json` | Discovery, validation de configuration, métadonnées de choix d'auth, et indices d'interface utilisateur qui doivent exister avant l'exécution du code du plugin                         |
| `package.json`         | métadonnées npm, installation des dépendances, et le bloc `openclaw` utilisé pour les points d'entrée, les conditions d'installation, la configuration, ou les métadonnées du catalogue |

Si vous n'êtes pas sûr de l'appartenance d'une métadonnée, utilisez cette règle :

- si OpenClaw doit le connaître avant le chargement du code du plugin, mettez-le dans `openclaw.plugin.json`
- s'il s'agit du conditionnement, des fichiers d'entrée, ou du comportement d'installation npm, mettez-le dans `package.json`

### champs package. affectant la discovery

Certaines métadonnées de plugin pré-exécution résident intentionnellement dans `package.json` sous le
bloc `openclaw` au lieu de `openclaw.plugin.json`.

Exemples importants :

| Champ                                                             | Signification                                                                                                                                                                                                                                    |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `openclaw.extensions`                                             | Déclare les points d'entrée natifs des plugins. Doit rester dans le répertoire du package du plugin.                                                                                                                                             |
| `openclaw.runtimeExtensions`                                      | Déclare les points d'entrée d'exécution JavaScript compilés pour les packages installés. Doit rester dans le répertoire du package du plugin.                                                                                                    |
| `openclaw.setupEntry`                                             | Point d'entrée léger uniquement pour la configuration, utilisé lors de l'intégration, du démarrage différé du channel, et de la découverte du statut du channel en lecture seule/SecretRef. Doit rester dans le répertoire du package du plugin. |
| `openclaw.runtimeSetupEntry`                                      | Déclare le point d'entrée de configuration JavaScript compilé pour les packages installés. Doit rester dans le répertoire du package du plugin.                                                                                                  |
| `openclaw.channel`                                                | Métadonnées bon marché du catalogue de channel telles que les étiquettes, les chemins de documentation, les alias et la copie de sélection.                                                                                                      |
| `openclaw.channel.configuredState`                                | Métadonnées du vérificateur d'état configuré léger qui peuvent répondre « une configuration env-only existe-t-elle déjà ? » sans charger le runtime complet du channel.                                                                          |
| `openclaw.channel.persistedAuthState`                             | Métadonnées du vérificateur d'authentification persistante légère qui peuvent répondre « quelque chose est-il déjà connecté ? » sans charger le runtime complet du channel.                                                                      |
| `openclaw.install.npmSpec` / `openclaw.install.localPath`         | Indices d'installation/mise à jour pour les plugins regroupés et publiés en externe.                                                                                                                                                             |
| `openclaw.install.defaultChoice`                                  | Chemin d'installation préféré lorsque plusieurs sources d'installation sont disponibles.                                                                                                                                                         |
| `openclaw.install.minHostVersion`                                 | Version minimale prise en charge de l'hôte OpenClaw, utilisant un seuil semver comme `>=2026.3.22`.                                                                                                                                              |
| `openclaw.install.expectedIntegrity`                              | Chaîne d'intégrité de dist npm attendue, telle que `sha512-...` ; les flux d'installation et de mise à jour vérifient l'artefact récupéré par rapport à celle-ci.                                                                                |
| `openclaw.install.allowInvalidConfigRecovery`                     | Permet un chemin de récupération étroit de réinstallation de plugin groupé lorsque la configuration n'est pas valide.                                                                                                                            |
| `openclaw.startup.deferConfiguredChannelFullLoadUntilAfterListen` | Permet aux surfaces de channel uniquement de configuration de se charger avant le plugin de channel complet lors du démarrage.                                                                                                                   |

Les métadonnées du manifeste déterminent quels choix provider/channel/setup apparaissent dans
l'intégration avant le chargement du runtime. `package.json#openclaw.install` indique
à l'intégration comment récupérer ou activer ce plugin lorsque l'utilisateur choisit l'une de ces
options. Ne déplacez pas les indices d'installation dans `openclaw.plugin.json`.

`openclaw.install.minHostVersion` est appliqué lors de l'installation et du chargement du registre de manifestes. Les valeurs invalides sont rejetées ; les valeurs plus récentes mais valides ignorent le plugin sur les hôtes plus anciens.

L'épinglage exact de la version npm se trouve déjà dans `npmSpec`, par exemple `"npmSpec": "@wecom/wecom-openclaw-plugin@1.2.3"`. Associez-le à `expectedIntegrity` lorsque vous souhaitez que les flux de mise à jour échouent de manière sécurisée si l'artefact npm récupéré ne correspond plus à la version épinglée. L'intégration interactive offre des spécifications de registre npm de confiance, y compris les noms de packages nus et les balises de distribution. Lorsque `expectedIntegrity` est présent, les flux d'installation/mise à jour l'appliquent ; lorsqu'il est omis, la résolution du registre est enregistrée sans épinglage d'intégrité.

Les plugins de channel doivent fournir `openclaw.setupEntry` lorsque l'état, la liste de canaux ou les analyses SecretRef doivent identifier les comptes configurés sans charger le runtime complet. L'entrée de configuration doit exposer les métadonnées du channel ainsi que les adaptateurs de configuration, d'état et de secrets sécurisés pour la configuration ; gardez les clients réseau, les écouteurs de passerelle et les runtimes de transport dans le point d'entrée principal de l'extension.

Les champs du point d'entrée d'exécution ne remplacent pas les vérifications des limites du package pour les champs du point d'entrée source. Par exemple, `openclaw.runtimeExtensions` ne peut pas rendre un chemin `openclaw.extensions` échappé chargeable.

`openclaw.install.allowInvalidConfigRecovery` est volontairement restrictif. Il ne permet pas d'installer des configurations brisées arbitraires. Actuellement, il permet uniquement aux flux d'installation de récupérer de pannes spécifiques de mise à niveau de plugin groupé obsolète, telles qu'un chemin de plugin groupé manquant ou une entrée `channels.<id>` obsolète pour ce même plugin groupé. Les erreurs de configuration non liées bloquent toujours l'installation et redirigent les opérateurs vers `openclaw doctor --fix`.

`openclaw.channel.persistedAuthState` correspond aux métadonnées de package pour un minuscule module de vérification :

```json
{
  "openclaw": {
    "channel": {
      "id": "whatsapp",
      "persistedAuthState": {
        "specifier": "./auth-presence",
        "exportName": "hasAnyWhatsAppAuth"
      }
    }
  }
}
```

Utilisez-le lorsque les flux de configuration, de diagnostic ou d'état configuré nécessitent une sonde d'authentification oui/non peu coûteuse avant le chargement complet du plugin de canal. L'export cible doit être une petite fonction qui lit uniquement l'état persistant ; ne l'acheminez pas par le canon d'exécution complet du canal.

`openclaw.channel.configuredState` suit la même structure pour les vérifications de configuration basées uniquement sur l'environnement et peu coûteuses :

```json
{
  "openclaw": {
    "channel": {
      "id": "telegram",
      "configuredState": {
        "specifier": "./configured-state",
        "exportName": "hasTelegramConfiguredState"
      }
    }
  }
}
```

Utilisez-le lorsqu'un channel peut répondre à l'état configuré à partir de variables d'environnement ou d'autres petites entrées non liées à l'exécution. Si la vérification nécessite une résolution complète de la configuration ou le véritable channel d'exécution, gardez cette logique dans le hook du plugin `config.hasConfiguredState` à la place.

## Priorité de découverte (identifiants de plugin en double)

OpenClaw découvre les plugins à partir de plusieurs racines (regroupés, installation globale, espace de travail, chemins sélectionnés explicitement par la configuration). Si deux découvertes partagent le même `id`, seul le manifeste ayant la **priorité la plus élevée** est conservé ; les doublons de priorité inférieure sont supprimés au lieu d'être chargés à côté.

Priorité, de la plus élevée à la plus basse :

1. **Sélectionné par la configuration** — un chemin explicitement épinglé dans `plugins.entries.<id>`
2. **Regroupé (Bundled)** — plugins livrés avec OpenClaw
3. **Installation globale** — plugins installés dans la racine des plugins globaux OpenClaw
4. **Espace de travail** — plugins découverts par rapport à l'espace de travail actuel

Implications :

- Une copie forkée ou obsolète d'un plugin regroupé située dans l'espace de travail ne masquera pas la version regroupée.
- Pour réellement remplacer un plugin regroupé par un plugin local, épinglez-le via `plugins.entries.<id>` afin qu'il gagne par priorité plutôt que de s'appuyer sur la découverte de l'espace de travail.
- Les suppressions de doublons sont consignées afin que Doctor et les diagnostics de démarrage puissent pointer vers la copie supprimée.

## Exigences du schéma JSON

- **Chaque plugin doit fournir un schéma JSON**, même s'il n'accepte aucune configuration.
- Un schéma vide est acceptable (par exemple, `{ "type": "object", "additionalProperties": false }`).
- Les schémas sont validés au moment de la lecture/écriture de la configuration, et non lors de l'exécution.

## Comportement de validation

- Les clés `channels.*` inconnues sont des **erreurs**, sauf si l'identifiant du channel est déclaré par un manifeste de plugin.
- `plugins.entries.<id>`, `plugins.allow`, `plugins.deny` et `plugins.slots.*` doivent référencer des identifiants de plugin **découvrables**. Les identifiants inconnus sont des **erreurs**.
- Si un plugin est installé mais possède un manifeste ou un schéma cassé ou manquant, la validation échoue et Doctor signale l'erreur du plugin.
- Si la configuration d'un plugin existe mais que le plugin est **désactivé**, la configuration est conservée et un **avertissement** est affiché dans Doctor + les journaux.

Voir [Référence de configuration](/fr/gateway/configuration) pour le schéma complet `plugins.*`.

## Notes

- Le manifeste est **requis pour les plugins natifs OpenClaw**, y compris pour les chargements depuis le système de fichiers local.
- Le runtime charge toujours le module de plugin séparément ; le manifeste sert uniquement à la découverte + validation.
- Les manifestes natifs sont analysés avec JSON5, donc les commentaires, les virgules finales et les clés non entre guillemets sont acceptés tant que la valeur finale reste un objet.
- Seuls les champs de manifeste documentés sont lus par le chargeur de manifeste. Évitez d'ajouter des clés de niveau supérieur personnalisées ici.
- `providerAuthEnvVars` est le chemin de métadonnées léger pour les sondes d'authentification, la validation des marqueurs d'environnement et les surfaces d'authentification de fournisseur similaires qui ne doivent pas démarrer le runtime du plugin juste pour inspecter les noms d'environnement.
- `providerAuthAliases` permet aux variantes de fournisseur de réutiliser les variables d'environnement d'authentification, les profils d'authentification, l'authentification soutenue par la configuration et le choix d'intégration de clé API d'un autre fournisseur sans coder en dur cette relation dans le cœur.
- `providerEndpoints` permet aux plugins de fournisseur de posséder de simples métadonnées de correspondance d'hôte/baseUrl de point de terminaison. Utilisez-le uniquement pour les classes de point de terminaison déjà prises en charge par le cœur ; le plugin possède toujours le comportement d'exécution.
- `syntheticAuthRefs` est le chemin de métadonnées léger pour les crochets d'authentification synthétiques détenus par le fournisseur qui doivent être visibles pour la découverte de modèles à froid avant l'existence du registre d'exécution. Ne listez que les références dont le fournisseur d'exécution ou le backend CLI implémente réellement `resolveSyntheticAuth`.
- `nonSecretAuthMarkers` est le chemin de métadonnées léger pour les clés API d'espace réservé détenues par le plugin groupé, telles que les marqueurs d'informations d'identification locaux, OAuth ou ambiants. Le cœur les traite comme des non-secrets pour l'affichage de l'authentification et les audits de secrets sans coder en dur le fournisseur propriétaire.
- `channelEnvVars` est le chemin de métadonnées léger pour le repli d'environnement shell, les invites de configuration et les surfaces de canal similaires qui ne doivent pas démarrer le runtime du plugin juste pour inspecter les noms d'environnement. Les noms d'environnement sont des métadonnées, pas une activation par eux-mêmes : le statut, l'audit, la validation de livraison cron et d'autres surfaces en lecture seule appliquent toujours la confiance du plugin et la politique d'activation effective avant de traiter une variable d'environnement comme un canal configuré.
- `providerAuthChoices` est le chemin de métadonnées simplifié pour les sélecteurs de choix d'authentification,
  la résolution `--auth-choice`, le mappage du provider préféré et l'enregistrement simple des indicateurs CLI pour l'onboarding
  avant le chargement du runtime du provider. Pour les métadonnées de l'assistant d'exécution
  qui nécessitent du code provider, consultez
  [Provider runtime hooks](/fr/plugins/architecture#provider-runtime-hooks).
- Les types de plugins exclusifs sont sélectionnés via `plugins.slots.*`.
  - `kind: "memory"` est sélectionné par `plugins.slots.memory`.
  - `kind: "context-engine"` est sélectionné par `plugins.slots.contextEngine`
    (par défaut : `legacy` intégré).
- `channels`, `providers`, `cliBackends` et `skills` peuvent être omis lorsqu'un
  plugin n'en a pas besoin.
- Si votre plugin dépend de modules natifs, documentez les étapes de construction et les exigences de liste d'autorisation
  du gestionnaire de paquets (par exemple, pnpm `allow-build-scripts`
  - `pnpm rebuild <package>`).

## Connexes

- [Building Plugins](/fr/plugins/building-plugins) — démarrer avec les plugins
- [Plugin Architecture](/fr/plugins/architecture) — architecture interne
- [SDK Overview](/fr/plugins/sdk-overview) — référence du SDK de plugin
