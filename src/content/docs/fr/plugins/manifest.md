---
summary: "Manifest de plugin + exigences du schéma JSON (validation de configuration stricte)"
read_when:
  - You are building an OpenClaw plugin
  - You need to ship a plugin config schema or debug plugin validation errors
title: "Manifest de plugin"
---

# Manifeste de plugin (openclaw.plugin.)

Cette page concerne uniquement le **manifeste de plugin natif OpenClaw**.

Pour les dispositions de bundle compatibles, consultez [Plugin bundles](/fr/plugins/bundles).

Les formats de bundle compatibles utilisent des fichiers de manifeste différents :

- Codex bundle : `.codex-plugin/plugin.json`
- Claude bundle : `.claude-plugin/plugin.json` ou la disposition des composants Claude par défaut
  sans manifeste
- Cursor bundle : `.cursor-plugin/plugin.json`

OpenClaw détecte automatiquement ces dispositions de bundle également, mais elles ne sont pas validées
contre le schéma `openclaw.plugin.json` décrit ici.

Pour les bundles compatibles, OpenClaw lit actuellement les métadonnées du bundle ainsi que les racines de compétences déclarées,
les racines de commandes Claude, les valeurs par défaut du bundle `settings.json` Claude,
les valeurs par défaut LSP du bundle Claude et les packs de hooks pris en charge lorsque la disposition correspond
aux attentes du runtime OpenClaw.

Chaque plugin natif OpenClaw **doit** inclure un fichier `openclaw.plugin.json` dans la
**racine du plugin**. OpenClaw utilise ce manifeste pour valider la configuration
**sans exécuter le code du plugin**. Les manifestes manquants ou non valides sont traités comme
des erreurs de plugin et bloquent la validation de la configuration.

Consultez le guide complet du système de plugins : [Plugins](/fr/tools/plugin).
Pour le modèle de capacité natif et les conseils actuels de compatibilité externe :
[Capability model](/fr/plugins/architecture#public-capability-model).

## À quoi sert ce fichier

`openclaw.plugin.json` contient les métadonnées que OpenClaw lit avant de charger votre
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
- métadonnées de runner QA bon marché que l'hôte `openclaw qa` partagé peut inspecter
  avant le chargement du runtime du plugin
- métadonnées de configuration spécifiques au canal qui doivent fusionner dans les surfaces de catalogue et de validation
  sans charger le runtime
- indices de l'interface utilisateur de configuration

Ne pas l'utiliser pour :

- enregistrer le comportement d'exécution
- déclaration des points d'entrée du code
- métadonnées d'installation de npm

Cela appartient à votre code de plugin et `package.json`.

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

| Champ                               | Obligatoire | Type                             | Signification                                                                                                                                                                                                                                                                                     |
| ----------------------------------- | ----------- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`                                | Oui         | `string`                         | ID canonique du plugin. C'est l'ID utilisé dans `plugins.entries.<id>`.                                                                                                                                                                                                                           |
| `configSchema`                      | Oui         | `object`                         | Schéma JSON en ligne pour la configuration de ce plugin.                                                                                                                                                                                                                                          |
| `enabledByDefault`                  | Non         | `true`                           | Indique qu'un plugin groupé est activé par défaut. Omettez-le ou définissez une valeur autre que `true` pour laisser le plugin désactivé par défaut.                                                                                                                                              |
| `legacyPluginIds`                   | Non         | `string[]`                       | ID hérités qui sont normalisés vers cet ID de plugin canonique.                                                                                                                                                                                                                                   |
| `autoEnableWhenConfiguredProviders` | Non         | `string[]`                       | ID de fournisseur qui doivent activer automatiquement ce plugin lorsque l'authentification, la configuration ou les références de modèle les mentionnent.                                                                                                                                         |
| `kind`                              | Non         | `"memory"` \| `"context-engine"` | Déclare un type de plugin exclusif utilisé par `plugins.slots.*`.                                                                                                                                                                                                                                 |
| `channels`                          | Non         | `string[]`                       | ID de canal possédés par ce plugin. Utilisés pour la découverte et la validation de la configuration.                                                                                                                                                                                             |
| `providers`                         | Non         | `string[]`                       | ID de fournisseur possédés par ce plugin.                                                                                                                                                                                                                                                         |
| `modelSupport`                      | Non         | `object`                         | Métadonnées abrégées de famille de modèles possédées par le manifeste, utilisées pour charger automatiquement le plugin avant l'exécution.                                                                                                                                                        |
| `providerEndpoints`                 | Non         | `object[]`                       | Métadonnées d'hôte/URL de base du point de terminaison appartenant au manifeste pour les itinéraires du fournisseur que le cœur doit classer avant le chargement du runtime du fournisseur.                                                                                                       |
| `cliBackends`                       | Non         | `string[]`                       | Identifiants du backend d'inférence CLI appartenant à ce plugin. Utilisés pour l'auto-activation au démarrage à partir de références de configuration explicites.                                                                                                                                 |
| `syntheticAuthRefs`                 | Non         | `string[]`                       | Références du backend du fournisseur ou de la CLI dont le hook d'authentification synthétique appartenant au plugin doit être sondé lors de la découverte à froid des modèles avant le chargement du runtime.                                                                                     |
| `nonSecretAuthMarkers`              | Non         | `string[]`                       | Valeurs de clé d'API de substitution appartenant au plugin groupé qui représentent un état d'identification non secret local, OAuth ou ambiant.                                                                                                                                                   |
| `commandAliases`                    | Non         | `object[]`                       | Noms de commandes appartenant à ce plugin qui doivent produire une configuration et des diagnostics CLI conscients du plugin avant le chargement du runtime.                                                                                                                                      |
| `providerAuthEnvVars`               | Non         | `Record<string, string[]>`       | Métadonnées d'environnement d'authentification de fournisseur peu coûteuses que OpenClaw peut inspecter sans charger le code du plugin.                                                                                                                                                           |
| `providerAuthAliases`               | Non         | `Record<string, string>`         | Identifiants de fournisseurs qui doivent réutiliser un autre identifiant de fournisseur pour la recherche d'authentification, par exemple un fournisseur de codage qui partage la clé d'API et les profils d'authentification du fournisseur de base.                                             |
| `channelEnvVars`                    | Non         | `Record<string, string[]>`       | Métadonnées d'environnement de canal peu coûteuses que OpenClaw peut inspecter sans charger le code du plugin. Utilisez ceci pour la configuration de canal pilotée par l'environnement ou les surfaces d'authentification que les assistants génériques de démarrage/configuration doivent voir. |
| `providerAuthChoices`               | Non         | `object[]`                       | Métadonnées de choix d'authentification peu coûteuses pour les sélecteurs d'intégration, la résolution de fournisseur préféré et le câblage simple des drapeaux CLI.                                                                                                                              |
| `activation`                        | Non         | `object`                         | Indices d'activation peu coûteux pour le provider, la commande, le canal, l'itinéraire et le chargement déclenché par des capacités. Métadonnées uniquement ; le runtime du plugin possède toujours le comportement réel.                                                                         |
| `setup`                             | Non         | `object`                         | Descripteurs de configuration/d'intégration peu coûteux que les surfaces de découverte et de configuration peuvent inspecter sans charger le runtime du plugin.                                                                                                                                   |
| `qaRunners`                         | Non         | `object[]`                       | Descripteurs de coureurs QA peu coûteux utilisés par l'hôte partagé `openclaw qa` avant le chargement du runtime du plugin.                                                                                                                                                                       |
| `contracts`                         | Non         | `object`                         | Instantané statique groupé des capacités pour la parole, la transcription en temps réel, la voix en temps réel, la compréhension des médias, la génération d'images, la génération de musique, la génération de vidéo, la récupération Web, la recherche Web et la propriété des outils.          |
| `channelConfigs`                    | Non         | `Record<string, object>`         | Métadonnées de configuration de canal détenues par le manifeste, fusionnées dans les surfaces de découverte et de validation avant le chargement du runtime.                                                                                                                                      |
| `skills`                            | Non         | `string[]`                       | Répertoires de compétences à charger, relatifs à la racine du plugin.                                                                                                                                                                                                                             |
| `name`                              | Non         | `string`                         | Nom du plugin lisible par l'homme.                                                                                                                                                                                                                                                                |
| `description`                       | Non         | `string`                         | Résumé court affiché dans les surfaces du plugin.                                                                                                                                                                                                                                                 |
| `version`                           | Non         | `string`                         | Version informationnelle du plugin.                                                                                                                                                                                                                                                               |
| `uiHints`                           | Non         | `Record<string, object>`         | Étiquettes d'interface utilisateur, espaces réservés et indices de sensibilité pour les champs de configuration.                                                                                                                                                                                  |

## Référence de providerAuthChoices

Chaque entrée `providerAuthChoices` décrit un choix d'intégration ou d'authentification.
OpenClaw lit cela avant le chargement du runtime du provider.

| Champ                 | Requis | Type                                            | Signification                                                                                                           |
| --------------------- | ------ | ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `provider`            | Oui    | `string`                                        | ID du provider auquel ce choix appartient.                                                                              |
| `method`              | Oui    | `string`                                        | ID de la méthode d'authentification vers laquelle dispatcher.                                                           |
| `choiceId`            | Oui    | `string`                                        | ID stable du choix d'authentification utilisé par les flux d'intégration et de CLI.                                     |
| `choiceLabel`         | Non    | `string`                                        | Libellé destiné à l'utilisateur. Si omis, OpenClaw utilise par défaut `choiceId`.                                       |
| `choiceHint`          | Non    | `string`                                        | Texte d'aide court pour le sélecteur.                                                                                   |
| `assistantPriority`   | Non    | `number`                                        | Les valeurs les plus faibles sont triées en premier dans les sélecteurs interactifs pilotés par l'assistant.            |
| `assistantVisibility` | Non    | `"visible"` \| `"manual-only"`                  | Masquer le choix dans les sélecteurs de l'assistant tout en autorisant toujours la sélection manuelle via CLI.          |
| `deprecatedChoiceIds` | Non    | `string[]`                                      | Identifiants de choix obsolètes qui doivent rediriger les utilisateurs vers ce choix de remplacement.                   |
| `groupId`             | Non    | `string`                                        | Identifiant de groupe optionnel pour regrouper les choix liés.                                                          |
| `groupLabel`          | Non    | `string`                                        | Libellé destiné à l'utilisateur pour ce groupe.                                                                         |
| `groupHint`           | Non    | `string`                                        | Texte d'aide court pour le groupe.                                                                                      |
| `optionKey`           | Non    | `string`                                        | Clé d'option interne pour les flux d'authentification simple à un indicateur.                                           |
| `cliFlag`             | Non    | `string`                                        | Nom de l'indicateur CLI, tel que `--openrouter-api-key`.                                                                |
| `cliOption`           | Non    | `string`                                        | Forme complète de l'option CLI, telle que `--openrouter-api-key <key>`.                                                 |
| `cliDescription`      | Non    | `string`                                        | Description utilisée dans l'aide CLI.                                                                                   |
| `onboardingScopes`    | Non    | `Array<"text-inference" \| "image-generation">` | Surfaces d'onboarding dans lesquelles ce choix doit apparaître. Si omis, la valeur par défaut est `["text-inference"]`. |

## commandAliases référence

Utilisez `commandAliases` lorsqu'un plugin possède un nom de commande d'exécution que les utilisateurs peuvent
par erreur mettre dans `plugins.allow` ou essayer d'exécuter comme une commande racine CLI. OpenClaw
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

| Champ        | Obligatoire | Type              | Signification                                                                             |
| ------------ | ----------- | ----------------- | ----------------------------------------------------------------------------------------- |
| `name`       | Oui         | `string`          | Nom de la commande appartenant à ce plugin.                                               |
| `kind`       | Non         | `"runtime-slash"` | Marque l'alias comme une commande slash de chat plutôt que comme une commande racine CLI. |
| `cliCommand` | Non         | `string`          | Commande racine CLI connexe à suggérer pour les opérations CLI, si elle existe.           |

## référence d'activation

Utilisez `activation` lorsque le plugin peut facilement déclarer quels événements du plan de contrôle
devraient l'activer ultérieurement.

## référence qaRunners

Utilisez `qaRunners` lorsqu'un plugin contribue avec un ou plusieurs runners de transport sous
la racine `openclaw qa` partagée. Gardez ces métadonnées légères et statiques ; le runtime
du plugin possède toujours l'enregistrement CLI réel via une surface `runtime-api.ts` légère
qui exporte `qaRunnerCliRegistrations`.

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

| Champ         | Obligatoire | Type     | Signification                                                                             |
| ------------- | ----------- | -------- | ----------------------------------------------------------------------------------------- |
| `commandName` | Oui         | `string` | Sous-commande montée sous `openclaw qa`, par exemple `matrix`.                            |
| `description` | Non         | `string` | Texte d'aide de repli utilisé lorsque l'hôte partagé a besoin d'une commande vide (stub). |

Ce bloc est constitué uniquement de métadonnées. Il n'enregistre pas le comportement d'exécution, et ne remplace
pas `register(...)`, `setupEntry` ou d'autres points d'entrée runtime/plugin.
Les consommateurs actuels l'utilisent comme indice de réduction avant le chargement plus large du plugin, donc
l'absence de métadonnées d'activation coûte généralement seulement en termes de performance ; elle ne devrait
pas changer la correction tant que les replis de propriété de manifeste hérités existent encore.

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
| `onProviders`    | Non         | `string[]`                                           | Identifiants de fournisseur qui doivent activer ce plugin lorsqu'ils sont demandés.            |
| `onCommands`     | Non         | `string[]`                                           | Identifiants de commande qui doivent activer ce plugin.                                        |
| `onChannels`     | Non         | `string[]`                                           | Identifiants de canal qui doivent activer ce plugin.                                           |
| `onRoutes`       | Non         | `string[]`                                           | Types de routes qui doivent activer ce plugin.                                                 |
| `onCapabilities` | Non         | `Array<"provider" \| "channel" \| "tool" \| "hook">` | Indices larges de capacités utilisés par la planification de l'activation du plan de contrôle. |

Consommateurs en direct actuels :

- la planification CLI déclenchée par commande revient à l'ancien
  `commandAliases[].cliCommand` ou `commandAliases[].name`
- le setup/la planification déclenchés par le channel reviennent à la propriété héritée `channels[]` lorsque les métadonnées d'activation explicites du channel sont manquantes
- le setup/la planification déclenchés par le provider reviennent à la propriété héritée `providers[]` et de premier niveau `cliBackends[]` lorsque les métadonnées d'activation explicites du provider sont manquantes

## référence du setup

Utilisez `setup` lorsque les surfaces de setup et d'onboarding ont besoin de métadonnées bon marché possédées par le plugin avant le chargement du runtime.

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

`cliBackends` de premier niveau reste valide et continue de décrire les backends d'inférence CLI. `setup.cliBackends` est la surface descripteur spécifique au setup pour les flux de plan de contrôle/setup qui doivent rester uniquement des métadonnées.

Lorsqu'ils sont présents, `setup.providers` et `setup.cliBackends` sont la surface de recherche prioritaire basée sur le descripteur pour la découverte du setup. Si le descripteur ne fait que restreindre le plugin candidat et que le setup nécessite toujours des hooks de runtime plus riches au moment du setup, définissez `requiresRuntime: true` et gardez `setup-api` en place comme chemin d'exécution de secours.

Parce que la recherche de setup peut exécuter du code `setup-api` possédé par le plugin, les valeurs normalisées `setup.providers[].id` et `setup.cliBackends[]` doivent rester uniques parmi les plugins découverts. Une propriété ambiguë échoue fermement au lieu de choisir un gagnant en fonction de l'ordre de découverte.

### référence de setup.providers

| Champ         | Obligatoire | Type       | Signification                                                                                                                    |
| ------------- | ----------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `id`          | Oui         | `string`   | Id du provider exposé lors du setup ou de l'onboarding. Gardez les ids normalisés uniques globalement.                           |
| `authMethods` | Non         | `string[]` | Ids des méthodes de setup/auth pris en charge par ce provider sans charger le runtime complet.                                   |
| `envVars`     | Non         | `string[]` | Variables d'environnement que les surfaces de setup/statut génériques peuvent vérifier avant le chargement du runtime du plugin. |

### champs du setup

| Champ              | Obligatoire | Type       | Signification                                                                                                                                                                       |
| ------------------ | ----------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `providers`        | Non         | `object[]` | Descripteurs de setup du provider exposés lors du setup et de l'onboarding.                                                                                                         |
| `cliBackends`      | Non         | `string[]` | Identifiants de backend au moment de la configuration utilisés pour la recherche de configuration basée sur le descripteur. Gardez les identifiants normalisés uniques globalement. |
| `configMigrations` | Non         | `string[]` | Identifiants de migration de configuration possédés par la surface de configuration de ce plugin.                                                                                   |
| `requiresRuntime`  | Non         | `boolean`  | Indique si la configuration nécessite toujours l'exécution de `setup-api` après la recherche du descripteur.                                                                        |

## référence uiHints

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
| `placeholder` | `string`   | Texte de substitution pour les entrées de formulaire. |

## référence contracts

Utilisez `contracts` uniquement pour les métadonnées statiques de propriété des capacités qu'OpenClaw peut
lire sans importer le runtime du plugin.

```json
{
  "contracts": {
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

| Champ                            | Type       | Signification                                                                                       |
| -------------------------------- | ---------- | --------------------------------------------------------------------------------------------------- |
| `speechProviders`                | `string[]` | Identifiants de provider de synthèse vocale dont ce plugin est propriétaire.                        |
| `realtimeTranscriptionProviders` | `string[]` | Identifiants de provider de transcription en temps réel dont ce plugin est propriétaire.            |
| `realtimeVoiceProviders`         | `string[]` | Identifiants de provider de voix en temps réel dont ce plugin est propriétaire.                     |
| `mediaUnderstandingProviders`    | `string[]` | Identifiants de provider de compréhension de média dont ce plugin est propriétaire.                 |
| `imageGenerationProviders`       | `string[]` | Identifiants de provider de génération d'images dont ce plugin est propriétaire.                    |
| `videoGenerationProviders`       | `string[]` | Identifiants de provider de génération de vidéos dont ce plugin est propriétaire.                   |
| `webFetchProviders`              | `string[]` | Identifiants de provider de récupération web dont ce plugin est propriétaire.                       |
| `webSearchProviders`             | `string[]` | Identifiants des providers de recherche Web dont ce plugin est propriétaire.                        |
| `tools`                          | `string[]` | Noms des outils d'agent dont ce plugin est propriétaire pour les vérifications de contrat groupées. |

## Référence channelConfigs

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

| Champ         | Type                     | Signification                                                                                                                       |
| ------------- | ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| `schema`      | `object`                 | Schéma JSON pour `channels.<id>`. Requis pour chaque entrée de configuration de canal déclarée.                                     |
| `uiHints`     | `Record<string, object>` | Étiquettes d'interface utilisateur/espaces réservés/indices sensibles facultatifs pour cette section de configuration de canal.     |
| `label`       | `string`                 | Étiquette de canal fusionnée dans les surfaces de sélection et d'inspection lorsque les métadonnées d'exécution ne sont pas prêtes. |
| `description` | `string`                 | Courte description du canal pour les surfaces d'inspection et de catalogue.                                                         |
| `preferOver`  | `string[]`               | Identifiants de plugin hérités ou de moindre priorité que ce canal devrait devancer dans les surfaces de sélection.                 |

## Référence modelSupport

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

- les références `provider/model` explicites utilisent les métadonnées du manifeste `providers` propriétaire
- `modelPatterns` l'emportent sur `modelPrefixes`
- si un plugin non groupé et un plugin groupé correspondent tous les deux, le plugin non groupé gagne
- l'ambiguïté restante est ignorée jusqu'à ce que l'utilisateur ou la configuration spécifie un provider

Champs :

| Champ           | Type       | Signification                                                                                          |
| --------------- | ---------- | ------------------------------------------------------------------------------------------------------ |
| `modelPrefixes` | `string[]` | Préfixes correspondant avec `startsWith` aux identifiants de modèle abrégés.                           |
| `modelPatterns` | `string[]` | Sources Regex correspondant aux identifiants de modèle abrégés après suppression du suffixe de profil. |

Les clés de fonctionnalité de niveau supérieur héritées sont obsolètes. Utilisez `openclaw doctor --fix` pour
déplacer `speechProviders`, `realtimeTranscriptionProviders`,
`realtimeVoiceProviders`, `mediaUnderstandingProviders`,
`imageGenerationProviders`, `videoGenerationProviders`,
`webFetchProviders` et `webSearchProviders` sous `contracts` ; le
chargement normal du manifeste ne traite plus ces champs de niveau supérieur comme une
propriété de fonctionnalité.

## Manifeste par rapport à package.

Les deux fichiers servent à des tâches différentes :

| Fichier                | Utilisé pour                                                                                                                                                                              |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `openclaw.plugin.json` | Discovery, validation de la configuration, métadonnées de choix d'authentification et indices de l'interface utilisateur qui doivent exister avant l'exécution du code du plugin          |
| `package.json`         | Métadonnées npm, installation des dépendances et le bloc `openclaw` utilisé pour les points d'entrée, le verrouillage de l'installation, la configuration ou les métadonnées du catalogue |

Si vous n'êtes pas sûr de l'appartenance d'une métadonnée, utilisez cette règle :

- si OpenClaw doit le connaître avant le chargement du code du plugin, placez-le dans `openclaw.plugin.json`
- s'il s'agit du packaging, des fichiers d'entrée ou du comportement de l'installation npm, placez-le dans `package.json`

### Champs package. affectant la découverte

Certaines métadonnées de plugin pré-runtime vivent intentionnellement dans `package.json` sous le
bloc `openclaw` au lieu de `openclaw.plugin.json`.

Exemples importants :

| Champ                                                             | Signification                                                                                                                                                                            |
| ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `openclaw.extensions`                                             | Déclare les points d'entrée du plugin natif.                                                                                                                                             |
| `openclaw.setupEntry`                                             | Point d'entrée léger de configuration uniquement utilisé lors de l'intégration et du démarrage différé du channel.                                                                       |
| `openclaw.channel`                                                | Métadonnées de catalogue de channel économique comme les étiquettes, les chemins de documentation, les alias et le texte de sélection.                                                   |
| `openclaw.channel.configuredState`                                | Métadonnées de vérificateur d'état configuré léger qui peut répondre « une configuration uniquement par environnement existe-t-elle déjà ? » sans charger le runtime complet du channel. |
| `openclaw.channel.persistedAuthState`                             | Métadonnées de vérificateur d'authentification persistante légère qui peut répondre « quelque chose est-il déjà connecté ? » sans charger le runtime complet du channel.                 |
| `openclaw.install.npmSpec` / `openclaw.install.localPath`         | Conseils d'installation/de mise à jour pour les plugins groupés et publiés en externe.                                                                                                   |
| `openclaw.install.defaultChoice`                                  | Chemin d'installation préféré lorsque plusieurs sources d'installation sont disponibles.                                                                                                 |
| `openclaw.install.minHostVersion`                                 | Version hôte OpenClaw minimale prise en charge, utilisant un plancher semver comme `>=2026.3.22`.                                                                                        |
| `openclaw.install.allowInvalidConfigRecovery`                     | Permet un chemin de récupération étroit pour la réinstallation de plugin groupé lorsque la configuration est invalide.                                                                   |
| `openclaw.startup.deferConfiguredChannelFullLoadUntilAfterListen` | Permet aux surfaces de canal configuration uniquement de se charger avant le plugin de canal complet lors du démarrage.                                                                  |

`openclaw.install.minHostVersion` est appliqué lors de l'installation et du chargement du registre du manifeste. Les valeurs invalides sont rejetées ; les plus récentes mais valides ignorent le plugin sur les hôtes plus anciens.

`openclaw.install.allowInvalidConfigRecovery` est volontairement étroit. Il ne rend pas les configurations cassées arbitraires installables. Aujourd'hui, il permet uniquement aux flux d'installation de récupérer de pannes spécifiques de mise à niveau de plugin groupé obsolète, telles qu'un chemin de plugin groupé manquant ou une entrée `channels.<id>` obsolète pour ce même plugin groupé. Les erreurs de configuration sans rapport bloquent toujours l'installation et redirigent les opérateurs vers `openclaw doctor --fix`.

`openclaw.channel.persistedAuthState` sont les métadonnées de package pour un minuscule module de vérification :

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

Utilisez-le lorsque les flux de configuration, de diagnostic ou d'état configuré ont besoin d'une sonde d'authentification oui/non peu coûteuse avant le chargement du plugin de canal complet. L'export cible doit être une petite fonction qui lit uniquement l'état persistant ; ne l'acheminez pas par le canon d'exécution du canal complet.

`openclaw.channel.configuredState` suit la même forme pour les vérifications de configuration peu coûteuses basées uniquement sur l'environnement :

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

Utilisez-le lorsqu'un canal peut répondre à l'état configuré à partir de variables d'environnement ou d'autres petites entrées hors exécution. Si la vérification nécessite une résolution complète de la configuration ou l'exécution réelle du canal, conservez plutôt cette logique dans le hook `config.hasConfiguredState` du plugin.

## Exigences du schéma JSON

- **Chaque plugin doit fournir un schéma JSON**, même s'il n'accepte aucune configuration.
- Un schéma vide est acceptable (par exemple, `{ "type": "object", "additionalProperties": false }`).
- Les schémas sont validés au moment de la lecture/écriture de la configuration, et non lors de l'exécution.

## Comportement de validation

- Les clés `channels.*` inconnues sont des **erreurs**, sauf si l'id de canal est déclaré par un manifeste de plugin.
- `plugins.entries.<id>`, `plugins.allow`, `plugins.deny` et `plugins.slots.*`
  doivent référencer des ids de plugin **découvrables**. Les ids inconnus sont des **erreurs**.
- Si un plugin est installé mais possède un manifeste ou un schéma cassé ou manquant,
  la validation échoue et Doctor signale l'erreur du plugin.
- Si la configuration du plugin existe mais que le plugin est **désactivé**, la configuration est conservée et
  un **avertissement** est affiché dans Doctor + les journaux.

Consultez [Référence de configuration](/fr/gateway/configuration) pour le schéma complet `plugins.*`.

## Remarques

- Le manifeste est **requis pour les plugins natifs OpenClaw**, y compris pour les chargements depuis le système de fichiers local.
- Le runtime charge toujours le module du plugin séparément ; le manifeste sert uniquement
  pour la découverte + la validation.
- Les manifestes natifs sont analysés avec JSON5, donc les commentaires, les virgules de fin et
  les clés non entre guillemets sont acceptés tant que la valeur finale est toujours un objet.
- Seuls les champs de manifeste documentés sont lus par le chargeur de manifeste. Évitez d'ajouter
  des clés de niveau supérieur personnalisées ici.
- `providerAuthEnvVars` est le chemin de métadonnées économique pour les sondes d'authentification, la validation des marqueurs d'environnement
  et les surfaces d'authentification de fournisseur similaires qui ne devraient pas démarrer le runtime du plugin
  juste pour inspecter les noms d'environnement.
- `providerAuthAliases` permet aux variantes de fournisseur de réutiliser les variables d'environnement d'authentification,
  les profils d'authentification, l'authentification par configuration et le choix d'onboarding de clé API
  d'un autre fournisseur sans coder en dur cette relation dans le cœur.
- `providerEndpoints` permet aux plugins de fournisseur de posséder des métadonnées simples de correspondance d'hôte/URL de base
  de point de terminaison. Utilisez-le uniquement pour les classes de points de terminaison que le cœur prend déjà en charge ;
  le plugin possède toujours le comportement d'exécution.
- `syntheticAuthRefs` est le chemin de métadonnées économique pour les hooks d'authentification synthétiques
  possédés par le fournisseur qui doivent être visibles pour la découverte de modèle à froid avant que le registre
  d'exécution n'existe. Ne listez que les références dont le fournisseur d'exécution ou le backend CLI implémente réellement
  `resolveSyntheticAuth`.
- `nonSecretAuthMarkers` est le chemin de métadonnées économique pour les clés API
  de substitution possédées par le plugin groupé, telles que local, OAuth ou les marqueurs d'informations d'identification ambiants.
  Le cœur les traite comme non secrets pour l'affichage de l'authentification et les audits de secrets sans
  coder en dur le fournisseur propriétaire.
- `channelEnvVars` est le chemin de métadonnées économique pour le repli shell-env, les invites de configuration et les surfaces de channel similaires qui ne devraient pas démarrer le runtime du plugin juste pour inspecter les noms d'env.
- `providerAuthChoices` est le chemin de métadonnées économique pour les sélecteurs de choix d'auth, la résolution `--auth-choice`, le mapping du provider préféré, et l'enregistrement des drapeaux CLI d'onboarding simple avant le chargement du runtime du provider. Pour les métadonnées de l'assistant d'exécution nécessitant le code du provider, voir [Provider runtime hooks](/fr/plugins/architecture#provider-runtime-hooks).
- Les types de plugins exclusifs sont sélectionnés via `plugins.slots.*`.
  - `kind: "memory"` est sélectionné par `plugins.slots.memory`.
  - `kind: "context-engine"` est sélectionné par `plugins.slots.contextEngine`
    (par défaut : `legacy` intégré).
- `channels`, `providers`, `cliBackends` et `skills` peuvent être omis lorsqu'un plugin n'en a pas besoin.
- Si votre plugin dépend de modules natifs, documentez les étapes de construction et toutes les exigences de liste d'autorisation du gestionnaire de paquets (par exemple, pnpm `allow-build-scripts`
  - `pnpm rebuild <package>`).

## Connexes

- [Création de plugins](/fr/plugins/building-plugins) — démarrer avec les plugins
- [Architecture des plugins](/fr/plugins/architecture) — architecture interne
- [Présentation du SDK](/fr/plugins/sdk-overview) — référence du SDK de plugin
