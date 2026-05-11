---
summary: "Manifest du plugin + exigences du schéma JSON (validation stricte de la configuration)"
read_when:
  - You are building an OpenClaw plugin
  - You need to ship a plugin config schema or debug plugin validation errors
title: "Manifest du plugin"
---

Cette page concerne uniquement le **manifeste du plugin natif OpenClaw**.

Pour les dispositions de bundle compatibles, voir [Plugin bundles](/fr/plugins/bundles).

Les formats de bundle compatibles utilisent des fichiers manifeste différents :

- Bundle Codex : `.codex-plugin/plugin.json`
- Bundle Claude : `.claude-plugin/plugin.json` ou la disposition par défaut des composants Claude
  sans manifeste
- Bundle Cursor : `.cursor-plugin/plugin.json`

OpenClaw détecte également automatiquement ces dispositions de bundle, mais elles ne sont pas validées
par rapport au schéma `openclaw.plugin.json` décrit ici.

Pour les bundles compatibles, OpenClaw lit actuellement les métadonnées du bundle ainsi que les racines de compétences
déclarées, les racines de commandes Claude, les valeurs par défaut `settings.json` des bundles Claude,
les valeurs par défaut LSP des bundles Claude, et les packs de hooks pris en charge lorsque la disposition correspond
aux attentes du runtime OpenClaw.

Chaque plugin natif OpenClaw **doit** inclure un fichier `openclaw.plugin.json` dans la
**racine du plugin**. OpenClaw utilise ce manifeste pour valider la configuration
**sans exécuter le code du plugin**. Les manifestes manquants ou invalides sont traités comme
des erreurs de plugin et bloquent la validation de la configuration.

Voir le guide complet du système de plugins : [Plugins](/fr/tools/plugin).
Pour le modèle de capacité natif et les recommandations actuelles de compatibilité externe :
[Capability model](/fr/plugins/architecture#public-capability-model).

## Que fait ce fichier

`openclaw.plugin.json` sont les métadonnées que OpenClaw lit **avant de charger votre
code de plugin**. Tout ce qui suit doit être suffisamment léger pour être inspecté sans démarrer
le runtime du plugin.

**Utilisez-le pour :**

- l'identité du plugin, la validation de la configuration et les indications pour l'interface de configuration
- les métadonnées d'authentification, d'intégration et de configuration (alias, activation automatique, env vars du provider, choix d'authentification)
- les indications d'activation pour les surfaces du plan de contrôle
- la propriété abrégée de famille de modèles
- les instantanés statiques de propriété des capacités (`contracts`)
- les métadonnées du runner QA que l'hôte `openclaw qa` partagé peut inspecter
- les métadonnées de configuration spécifiques au canal fusionnées dans le catalogue et les surfaces de validation

**Ne l'utilisez pas pour :** enregistrer le comportement d'exécution, déclarer les points d'entrée du code, ou les métadonnées d'installation npm. Celles-ci appartiennent au code de votre plugin et `package.json`.

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
  "modelIdNormalization": {
    "providers": {
      "openrouter": {
        "prefixWhenBare": "openrouter"
      }
    }
  },
  "providerEndpoints": [
    {
      "endpointClass": "openrouter",
      "hostSuffixes": ["openrouter.ai"]
    }
  ],
  "providerRequest": {
    "providers": {
      "openrouter": {
        "family": "openrouter"
      }
    }
  },
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

| Champ                                | Obligatoire | Type                             | Signification                                                                                                                                                                                                                                                                                                                                    |
| ------------------------------------ | ----------- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `id`                                 | Oui         | `string`                         | Identifiant canonique du plugin. C'est l'identifiant utilisé dans `plugins.entries.<id>`.                                                                                                                                                                                                                                                        |
| `configSchema`                       | Oui         | `object`                         | Schéma JSON en ligne pour la configuration de ce plugin.                                                                                                                                                                                                                                                                                         |
| `enabledByDefault`                   | Non         | `true`                           | Marque un plugin groupé comme activé par défaut. Omettez-le ou définissez une valeur autre que `true` pour laisser le plugin désactivé par défaut.                                                                                                                                                                                               |
| `legacyPluginIds`                    | Non         | `string[]`                       | Identifiants hérités qui sont normalisés vers cet identifiant canonique de plugin.                                                                                                                                                                                                                                                               |
| `autoEnableWhenConfiguredProviders`  | Non         | `string[]`                       | Identifiants de provider qui doivent activer automatiquement ce plugin lorsque l'authentification, la configuration ou les références de modèle les mentionnent.                                                                                                                                                                                 |
| `kind`                               | Non         | `"memory"` \| `"context-engine"` | Déclare un type de plugin exclusif utilisé par `plugins.slots.*`.                                                                                                                                                                                                                                                                                |
| `channels`                           | Non         | `string[]`                       | Identifiants de canal possédés par ce plugin. Utilisés pour la découverte et la validation de la configuration.                                                                                                                                                                                                                                  |
| `providers`                          | Non         | `string[]`                       | Identifiants de provider possédés par ce plugin.                                                                                                                                                                                                                                                                                                 |
| `providerDiscoveryEntry`             | Non         | `string`                         | Chemin du module léger de découverte de provider, relatif à la racine du plugin, pour les métadonnées du catalogue de provider limitées au manifeste qui peuvent être chargées sans activer le runtime complet du plugin.                                                                                                                        |
| `modelSupport`                       | Non         | `object`                         | Métadonnées abrégées de famille de modèles possédées par le manifeste, utilisées pour charger automatiquement le plugin avant l'exécution.                                                                                                                                                                                                       |
| `modelCatalog`                       | Non         | `object`                         | Métadonnées déclaratives du catalogue de modèles pour les providers possédés par ce plugin. Il s'agit du contrat du plan de contrôle pour le futur listing en lecture seule, l'intégration, les sélecteurs de modèles, les alias et la suppression sans charger le runtime du plugin.                                                            |
| `modelPricing`                       | Non         | `object`                         | Stratégie de recherche de tarification externe propriétaire du fournisseur. Utilisez-la pour exclure les fournisseurs locaux/auto-hébergés des catalogues de tarification distants ou pour mapper les références de fournisseur aux identifiants du catalogue OpenRouter/LiteLLM sans coder en dur les identifiants de fournisseur dans le core. |
| `modelIdNormalization`               | Non         | `object`                         | Nettoyage des alias/préfixes d'ID de modèle propriétaire du fournisseur qui doit s'exécuter avant le chargement du runtime du fournisseur.                                                                                                                                                                                                       |
| `providerEndpoints`                  | Non         | `object[]`                       | Métadonnées d'hôte/baseUrl de point de terminaison propriétaires du manifeste pour les routes de fournisseur que le core doit classer avant le chargement du runtime du fournisseur.                                                                                                                                                             |
| `providerRequest`                    | Non         | `object`                         | Métadonnées peu coûteuses de famille de fournisseur et de compatibilité des demandes utilisées par la stratégie de demande générique avant le chargement du runtime du fournisseur.                                                                                                                                                              |
| `cliBackends`                        | Non         | `string[]`                       | Identifiants de backend d'inférence CLI détenus par ce plugin. Utilisés pour l'auto-activation au démarrage à partir de références de configuration explicites.                                                                                                                                                                                  |
| `syntheticAuthRefs`                  | Non         | `string[]`                       | Références de backend de fournisseur ou CLI dont le hook d'authentification synthétique propriétaire du plugin doit être sondé lors de la découverte à froid des modèles avant le chargement du runtime.                                                                                                                                         |
| `nonSecretAuthMarkers`               | Non         | `string[]`                       | Valeurs de clé d'API de substitution propriétaires du plugin groupé qui représentent un état d'identification local, OAuth ou ambiant non secret.                                                                                                                                                                                                |
| `commandAliases`                     | Non         | `object[]`                       | Noms de commandes détenus par ce plugin qui doivent produire une configuration et des diagnostics CLI compatibles avec les plugins avant le chargement du runtime.                                                                                                                                                                               |
| `providerAuthEnvVars`                | Non         | `Record<string, string[]>`       | Métadonnées d'environnement de compatibilité obsolètes pour la recherche d'authentification/état du fournisseur. Privilégiez `setup.providers[].envVars` pour les nouveaux plugins ; OpenClaw lit toujours ceci pendant la fenêtre de dépréciation.                                                                                              |
| `providerAuthAliases`                | Non         | `Record<string, string>`         | Identifiants de fournisseur qui doivent réutiliser un autre identifiant de fournisseur pour la recherche d'authentification, par exemple un fournisseur de codage qui partage la clé d'API et les profils d'authentification du fournisseur de base.                                                                                             |
| `channelEnvVars`                     | Non         | `Record<string, string[]>`       | Métadonnées d'environnement de canal bon marché qu'OpenClaw peut inspecter sans charger le code du plugin. Utilisez ceci pour la configuration de canal pilotée par l'environnement ou les surfaces d'authentification que les assistants de démarrage/configuration génériques devraient voir.                                                  |
| `providerAuthChoices`                | Non         | `object[]`                       | Métadonnées de choix d'authentification bon marché pour les sélecteurs d'intégration, la résolution du fournisseur préféré et le câblage simple des indicateurs CLI.                                                                                                                                                                             |
| `activation`                         | Non         | `object`                         | Métadonnées du planificateur d'activation bon marché pour le chargement déclenché par le fournisseur, la commande, le canal, l'itinéraire et la capacité. Métadonnées uniquement ; l'exécution du plugin possède toujours le comportement réel.                                                                                                  |
| `setup`                              | Non         | `object`                         | Descripteurs de configuration/intégration bon marché que les surfaces de découverte et de configuration peuvent inspecter sans charger l'exécution du plugin.                                                                                                                                                                                    |
| `qaRunners`                          | Non         | `object[]`                       | Descripteurs de runner QA bon marché utilisés par l'hôte `openclaw qa` partagé avant le chargement de l'exécution du plugin.                                                                                                                                                                                                                     |
| `contracts`                          | Non         | `object`                         | Instantané de capacité groupée statique pour les crochets d'authentification externes, la parole, la transcription en temps réel, la voix en temps réel, la compréhension des médias, la génération d'images, la génération de musique, la génération de vidéo, la récupération Web, la recherche Web et la propriété des outils.                |
| `mediaUnderstandingProviderMetadata` | Non         | `Record<string, object>`         | Valeurs par défaut de compréhension des médias bon marché pour les identifiants de fournisseur déclarés dans `contracts.mediaUnderstandingProviders`.                                                                                                                                                                                            |
| `channelConfigs`                     | Non         | `Record<string, object>`         | Métadonnées de configuration de canal possédées par le manifeste fusionnées dans les surfaces de découverte et de validation avant le chargement de l'exécution.                                                                                                                                                                                 |
| `skills`                             | Non         | `string[]`                       | Répertoires de compétences à charger, relatifs à la racine du plugin.                                                                                                                                                                                                                                                                            |
| `name`                               | Non         | `string`                         | Nom du plugin lisible par l'homme.                                                                                                                                                                                                                                                                                                               |
| `description`                        | Non         | `string`                         | Résumé court affiché dans les surfaces du plugin.                                                                                                                                                                                                                                                                                                |
| `version`                            | Non         | `string`                         | Version du plugin informative.                                                                                                                                                                                                                                                                                                                   |
| `uiHints`                            | Non         | `Record<string, object>`         | Étiquettes d'interface utilisateur, espaces réservés et indices de sensibilité pour les champs de configuration.                                                                                                                                                                                                                                 |

## référence providerAuthChoices

Chaque entrée `providerAuthChoices` décrit un choix d'onboarding ou d'authentification.
OpenClaw lit cela avant le chargement du runtime du fournisseur.
Les listes de configuration du fournisseur utilisent ces choix de manifeste, les choix de configuration dérivés des descripteurs
et les métadonnées du catalogue d'installation sans charger le runtime du fournisseur.

| Champ                 | Obligatoire | Type                                            | Signification                                                                                                          |
| --------------------- | ----------- | ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `provider`            | Oui         | `string`                                        | ID du fournisseur auquel ce choix appartient.                                                                          |
| `method`              | Oui         | `string`                                        | ID de la méthode d'authentification vers laquelle dispatcher.                                                          |
| `choiceId`            | Oui         | `string`                                        | ID stable du choix d'authentification utilisé par les flux d'onboarding et CLI.                                        |
| `choiceLabel`         | Non         | `string`                                        | Libellé destiné à l'utilisateur. Si omis, OpenClaw revient à `choiceId`.                                               |
| `choiceHint`          | Non         | `string`                                        | Texte d'aide court pour le sélecteur.                                                                                  |
| `assistantPriority`   | Non         | `number`                                        | Les valeurs inférieures trient plus tôt dans les sélecteurs interactifs pilotés par l'assistant.                       |
| `assistantVisibility` | Non         | `"visible"` \| `"manual-only"`                  | Masquer le choix des sélecteurs de l'assistant tout en permettant toujours la sélection manuelle via CLI.              |
| `deprecatedChoiceIds` | Non         | `string[]`                                      | IDs de choix hérités qui doivent rediriger les utilisateurs vers ce choix de remplacement.                             |
| `groupId`             | Non         | `string`                                        | ID de groupe optionnel pour regrouper les choix associés.                                                              |
| `groupLabel`          | Non         | `string`                                        | Libellé destiné à l'utilisateur pour ce groupe.                                                                        |
| `groupHint`           | Non         | `string`                                        | Texte d'aide court pour le groupe.                                                                                     |
| `optionKey`           | Non         | `string`                                        | Clé d'option interne pour les flux d'authentification simples à un seul indicateur.                                    |
| `cliFlag`             | Non         | `string`                                        | Nom de l'indicateur CLI, tel que `--openrouter-api-key`.                                                               |
| `cliOption`           | Non         | `string`                                        | Forme complète de l'option CLI, telle que `--openrouter-api-key <key>`.                                                |
| `cliDescription`      | Non         | `string`                                        | Description utilisée dans l'aide de la CLI.                                                                            |
| `onboardingScopes`    | Non         | `Array<"text-inference" \| "image-generation">` | Surfaces d'onboarding sur lesquelles ce choix doit apparaître. Si omis, la valeur par défaut est `["text-inference"]`. |

## Référence de commandAliases

Utilisez `commandAliases` lorsqu'un plugin possède un nom de commande d'exécution que les utilisateurs
peuvent mettre par erreur dans `plugins.allow` ou essayer d'exécuter comme une commande racine de la CLI. OpenClaw
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

| Champ        | Obligatoire | Type              | Signification                                                                                |
| ------------ | ----------- | ----------------- | -------------------------------------------------------------------------------------------- |
| `name`       | Oui         | `string`          | Nom de la commande qui appartient à ce plugin.                                               |
| `kind`       | Non         | `"runtime-slash"` | Indique que l'alias est une commande slash de chat plutôt qu'une commande racine de la CLI.  |
| `cliCommand` | Non         | `string`          | Commande racine de la CLI connexes à suggérer pour les opérations de la CLI, si elle existe. |

## Référence d'activation

Utilisez `activation` lorsque le plugin peut facilement déclarer quels événements du plan de contrôle
doivent l'inclure dans un plan d'activation/chargement.

Ce bloc est une métadonnée du planificateur, et non une API de cycle de vie. Il n'enregistre pas
le comportement d'exécution, ne remplace pas `register(...)` et ne garantit pas que
le code du plugin a déjà été exécuté. Le planificateur d'activation utilise ces champs pour
réduire la liste des plugins candidats avant de revenir aux métadonnées de propriété du manifeste existantes
telles que `providers`, `channels`, `commandAliases`, `setup.providers`,
`contracts.tools` et les hooks.

Préférez les métadonnées les plus étroites qui décrivent déjà la propriété. Utilisez `providers`, `channels`, `commandAliases`, les descripteurs de configuration ou `contracts` lorsque ces champs expriment la relation. Utilisez `activation` pour des indices de planificateur supplémentaires qui ne peuvent pas être représentés par ces champs de propriété. Utilisez `cliBackends` de niveau supérieur pour les alias d'exécution CLI tels que `claude-cli`, `codex-cli` ou `google-gemini-cli` ; `activation.onAgentHarnesses` est uniquement destiné aux ids de harnais d'agent intégré qui n'ont pas déjà de champ de propriété.

Ce bloc contient uniquement des métadonnées. Il n'enregistre pas le comportement d'exécution et ne remplace pas `register(...)`, `setupEntry` ou d'autres points d'entrée de plugin/d'exécution. Les consommateurs actuels l'utilisent comme un indice de rétrécissement avant le chargement plus large des plugins, donc l'absence de métadonnées d'activation ne coûte généralement qu'en termes de performance ; cela ne devrait pas modifier la correction tant que les solutions de repli de propriété de manifeste héritées existent encore.

```json
{
  "activation": {
    "onProviders": ["openai"],
    "onCommands": ["models"],
    "onChannels": ["web"],
    "onRoutes": ["gateway-webhook"],
    "onConfigPaths": ["browser"],
    "onCapabilities": ["provider", "tool"]
  }
}
```

| Champ              | Obligatoire | Type                                                 | Signification                                                                                                                                                                              |
| ------------------ | ----------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `onProviders`      | Non         | `string[]`                                           | Ids de fournisseurs qui doivent inclure ce plugin dans les plans d'activation/chargement.                                                                                                  |
| `onAgentHarnesses` | Non         | `string[]`                                           | Ids d'exécution de harnais d'agent intégré qui doivent inclure ce plugin dans les plans d'activation/chargement. Utilisez `cliBackends` de niveau supérieur pour les alias de backend CLI. |
| `onCommands`       | Non         | `string[]`                                           | Ids de commandes qui doivent inclure ce plugin dans les plans d'activation/chargement.                                                                                                     |
| `onChannels`       | Non         | `string[]`                                           | Ids de canaux qui doivent inclure ce plugin dans les plans d'activation/chargement.                                                                                                        |
| `onRoutes`         | Non         | `string[]`                                           | Types de routes qui doivent inclure ce plugin dans les plans d'activation/chargement.                                                                                                      |
| `onConfigPaths`    | Non         | `string[]`                                           | Chemins de configuration relatifs à la racine qui doivent inclure ce plugin dans les plans de démarrage/chargement lorsque le chemin est présent et non explicitement désactivé.           |
| `onCapabilities`   | Non         | `Array<"provider" \| "channel" \| "tool" \| "hook">` | Indications générales de capacités utilisées par la planification de l'activation du plan de contrôle. Préférez des champs plus précis lorsque cela est possible.                          |

Consommateurs actifs actuels :

- la planification du CLI déclenchée par commande revient à l'ancien
  `commandAliases[].cliCommand` ou `commandAliases[].name`
- la planification du démarrage de l'exécution de l'agent utilise `activation.onAgentHarnesses` pour
  les harnais intégrés et `cliBackends[]` de premier niveau pour les alias d'exécution CLI
- la planification de configuration/de canal déclenchée par canal revient à l'ancienne propriété
  `channels[]` lorsque les métadonnées d'activation de canal explicites sont manquantes
- la planification des plugins de démarrage utilise `activation.onConfigPaths` pour les surfaces de configuration
  racine non-canal telles que le bloc `browser` du plugin navigateur groupé
- la planification de configuration/d'exécution déclenchée par le fournisseur revient à l'ancien
  `providers[]` et à la propriété `cliBackends[]` de premier niveau lorsque les métadonnées d'activation du fournisseur
  explicites sont manquantes

Les diagnostics du planificateur peuvent distinguer les indices d'activation explicites du repli de propriété du manifeste.
Par exemple, `activation-command-hint` signifie que `activation.onCommands` a correspondu, tandis que `manifest-command-alias` signifie que
le planificateur a plutôt utilisé la propriété `commandAliases`. Ces étiquettes de raison sont destinées aux
diagnostics et tests de l'hôte ; les auteurs de plugins doivent continuer à déclarer les métadonnées
décrivant le mieux la propriété.

## référence qaRunners

Utilisez `qaRunners` lorsqu'un plugin contribue un ou plusieurs runners de transport sous
la racine `openclaw qa` partagée. Gardez ces métadonnées légères et statiques ; l'exécution
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
| `description` | Non         | `string` | Texte d'aide de repli utilisé lorsque l'hôte partagé a besoin d'une commande fictive. |

## référence de configuration

Utilisez `setup` lorsque les surfaces de configuration et d'onboarding ont besoin de métadonnées bon marché appartenant au plugin avant le chargement du runtime.

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

Le `cliBackends` de niveau supérieur reste valide et continue à décrire les backends d'inférence CLI. `setup.cliBackends` est la surface descripteurs spécifique à la configuration pour les flux de plan de contrôle/configuration qui doivent rester uniquement des métadonnées.

Lorsqu'ils sont présents, `setup.providers` et `setup.cliBackends` sont la surface de recherche privilégiée basée d'abord sur les descripteurs pour la découverte de la configuration. Si le descripteur ne réduit que le plugin candidat et que la configuration a encore besoin de hooks de runtime plus riches au moment de la configuration, définissez `requiresRuntime: true` et gardez `setup-api` en place comme chemin d'exécution de repli.

OpenClaw inclut également `setup.providers[].envVars` dans les recherches génériques d'authentification de provider et de variables d'environnement. `providerAuthEnvVars` reste pris en charge via un adaptateur de compatibilité pendant la période d'obsolescence, mais les plugins non groupés qui l'utilisent encore reçoivent un diagnostic de manifeste. Les nouveaux plugins doivent placer les métadonnées d'environnement de configuration/statut sur `setup.providers[].envVars`.

OpenClaw peut également dériver des choix de configuration simples à partir de `setup.providers[].authMethods` lorsqu'aucune entrée de configuration n'est disponible, ou lorsque `setup.requiresRuntime: false` déclare le runtime de configuration inutile. Les entrées explicites `providerAuthChoices` restent privilégiées pour les étiquettes personnalisées, les indicateurs CLI, la portée de l'onboarding et les métadonnées de l'assistant.

Définissez `requiresRuntime: false` uniquement lorsque ces descripteurs sont suffisants pour la surface de configuration. OpenClaw traite le `false` explicite comme un contrat de descripteur uniquement et n'exécutera pas `setup-api` ou `openclaw.setupEntry` pour la recherche de configuration. Si un plugin à descripteur uniquement expédie toujours l'une de ces entrées de runtime de configuration, OpenClaw signale un diagnostic additif et continue à l'ignorer. L'omission de `requiresRuntime` conserve le comportement de repli hérité afin que les plugins existants qui ont ajouté des descripteurs sans l'indicateur ne se cassent pas.

Étant donné que la recherche de configuration (setup lookup) peut exécuter du code `setup-api` détenu par le plugin, les valeurs `setup.providers[].id` et `setup.cliBackends[]` normalisées doivent rester uniques parmi les plugins découverts. Une propriété ambiguë échoue de manière fermée (fails closed) au lieu de sélectionner un gagnant selon l'ordre de découverte.

Lorsque le runtime d'installation (setup runtime) s'exécute, les diagnostics du registre d'installation signalent une dérive des descripteurs si `setup-api` enregistre un provider ou un backend CLI que les descripteurs du manifeste ne déclarent pas, ou si un descripteur n'a pas d'enregistrement correspondant au runtime. Ces diagnostics sont additifs et ne rejettent pas les plugins hérités (legacy).

### référence setup.providers

| Champ         | Obligatoire | Type       | Signification                                                                                                                                     |
| ------------- | ----------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`          | Oui         | `string`   | Id de fournisseur (provider id) exposé lors de l'installation ou de l'intégration (onboarding). Conservez les ids normalisés uniques globalement. |
| `authMethods` | Non         | `string[]` | Ids des méthodes d'installation/authentification que ce fournisseur prend en charge sans charger le runtime complet.                              |
| `envVars`     | Non         | `string[]` | Variables d'environnement que les surfaces d'installation/statut génériques peuvent vérifier avant le chargement du runtime du plugin.            |

### champs d'installation (setup fields)

| Champ              | Obligatoire | Type       | Signification                                                                                                                                                                                        |
| ------------------ | ----------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `providers`        | Non         | `object[]` | Descripteurs d'installation du fournisseur exposés lors de l'installation et de l'intégration (onboarding).                                                                                          |
| `cliBackends`      | Non         | `string[]` | Ids de backend au moment de l'installation utilisés pour la recherche d'installation prioritaire aux descripteurs (descriptor-first setup lookup). Conservez les ids normalisés uniques globalement. |
| `configMigrations` | Non         | `string[]` | Ids de migration de configuration détenus par la surface d'installation de ce plugin.                                                                                                                |
| `requiresRuntime`  | Non         | `boolean`  | Indique si l'installation nécessite toujours l'exécution du `setup-api` après la recherche du descripteur.                                                                                           |

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

| Champ         | Type       | Signification                                          |
| ------------- | ---------- | ------------------------------------------------------ |
| `label`       | `string`   | Libellé du champ destiné à l'utilisateur.              |
| `help`        | `string`   | Texte d'aide court.                                    |
| `tags`        | `string[]` | Balises UI facultatives.                               |
| `advanced`    | `boolean`  | Marque le champ comme avancé.                          |
| `sensitive`   | `boolean`  | Marque le champ comme secret ou sensible.              |
| `placeholder` | `string`   | Texte d'espace réservé pour les entrées de formulaire. |

## référence des contrats

Utilisez `contracts` uniquement pour les métadonnées statiques de propriété des capacités qu'OpenClaw peut
lire sans importer le runtime du plugin.

```json
{
  "contracts": {
    "agentToolResultMiddleware": ["pi", "codex"],
    "externalAuthProviders": ["acme-ai"],
    "speechProviders": ["openai"],
    "realtimeTranscriptionProviders": ["openai"],
    "realtimeVoiceProviders": ["openai"],
    "memoryEmbeddingProviders": ["local"],
    "mediaUnderstandingProviders": ["openai", "openai-codex"],
    "imageGenerationProviders": ["openai"],
    "videoGenerationProviders": ["qwen"],
    "webFetchProviders": ["firecrawl"],
    "webSearchProviders": ["gemini"],
    "migrationProviders": ["hermes"],
    "tools": ["firecrawl_search", "firecrawl_scrape"]
  }
}
```

Chaque liste est facultative :

| Champ                            | Type       | Signification                                                                                       |
| -------------------------------- | ---------- | --------------------------------------------------------------------------------------------------- |
| `embeddedExtensionFactories`     | `string[]` | IDs d'usine d'extension d'application serveur Codex, actuellement `codex-app-server`.               |
| `agentToolResultMiddleware`      | `string[]` | IDs d'exécution pour lesquels un plugin groupé peut enregistrer un intergiciel de résultat d'outil. |
| `externalAuthProviders`          | `string[]` | IDs de provider dont ce plugin possède le hook de profil d'authentification externe.                |
| `speechProviders`                | `string[]` | IDs de provider de synthèse vocale que ce plugin possède.                                           |
| `realtimeTranscriptionProviders` | `string[]` | IDs de provider de transcription en temps réel que ce plugin possède.                               |
| `realtimeVoiceProviders`         | `string[]` | IDs de provider de voix en temps réel que ce plugin possède.                                        |
| `memoryEmbeddingProviders`       | `string[]` | IDs de provider d'intégration de mémoire que ce plugin possède.                                     |
| `mediaUnderstandingProviders`    | `string[]` | IDs de provider de compréhension multimédia que ce plugin possède.                                  |
| `imageGenerationProviders`       | `string[]` | IDs de provider de génération d'images que ce plugin possède.                                       |
| `videoGenerationProviders`       | `string[]` | IDs de provider de génération de vidéos que ce plugin possède.                                      |
| `webFetchProviders`              | `string[]` | IDs de provider de récupération Web que ce plugin possède.                                          |
| `webSearchProviders`             | `string[]` | IDs de provider de recherche Web que ce plugin possède.                                             |
| `migrationProviders`             | `string[]` | IDs de provider d'importation que ce plugin possède pour `openclaw migrate`.                        |
| `tools`                          | `string[]` | Noms des outils d'agent dont ce plugin est propriétaire pour les vérifications de contrat groupées. |

`contracts.embeddedExtensionFactories` est conservé pour les fabriques d'extension uniquement serveur d'application Codex groupées. Les transformations de résultats d'outils groupées doivent déclarer `contracts.agentToolResultMiddleware` et s'inscrire avec `api.registerAgentToolResultMiddleware(...)` à la place. Les plugins externes ne peuvent pas inscrire de middleware de résultat d'outil car la jointure peut réécrire la sortie de l'outil à haute confiance avant que le modèle ne la voie.

Les plugins de fournisseur qui implémentent `resolveExternalAuthProfiles` doivent déclarer `contracts.externalAuthProviders`. Les plugins sans la déclaration s'exécutent toujours via une solution de repli de compatibilité obsolète, mais cette solution est plus lente et sera supprimée après la période de migration.

Les fournisseurs d'intégration de mémoire groupés doivent déclarer `contracts.memoryEmbeddingProviders` pour chaque ID d'adaptateur qu'ils exposent, y compris les adaptateurs intégrés tels que `local`. Les chemins CLI autonomes utilisent ce contrat de manifeste pour charger uniquement le plugin propriétaire avant que l'exécution complète du Gateway n'ait enregistré les fournisseurs.

## Référence de mediaUnderstandingProviderMetadata

Utilisez `mediaUnderstandingProviderMetadata` lorsqu'un fournisseur de compréhension de média possède des modèles par défaut, une priorité de repli d'authentification automatique ou une prise en charge native de documents dont les assistants principaux génériques ont besoin avant le chargement de l'exécution. Les clés doivent également être déclarées dans `contracts.mediaUnderstandingProviders`.

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

Chaque entrée de fournisseur peut inclure :

| Champ                  | Type                                | Signification                                                                                                    |
| ---------------------- | ----------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `capabilities`         | `("image" \| "audio" \| "video")[]` | Capacités multimédia exposées par ce fournisseur.                                                                |
| `defaultModels`        | `Record<string, string>`            | Valeurs par défaut de capacité vers modèle utilisées lorsque la configuration ne spécifie pas de modèle.         |
| `autoPriority`         | `Record<string, number>`            | Les numéros inférieurs sont triés plus tôt pour le repli automatique des fournisseurs basé sur les identifiants. |
| `nativeDocumentInputs` | `"pdf"[]`                           | Entrées de documents natives prises en charge par le fournisseur.                                                |

## Référence de channelConfigs

Utilisez `channelConfigs` lorsqu'un plugin de canal a besoin de métadonnées de configuration bon marché avant le chargement de l'exécution. La découverte de la configuration/du statut du canal en lecture seule peut utiliser ces métadonnées directement pour les canaux externes configurés lorsqu'aucune entrée de configuration n'est disponible, ou lorsque `setup.requiresRuntime: false` déclare l'exécution de la configuration inutile.

`channelConfigs` correspond à des métadonnées de manifeste de plugin, et non à une nouvelle section de configuration utilisateur de niveau supérieur. Les utilisateurs configurent toujours les instances de canal sous `channels.<channel-id>`. OpenClaw lit les métadonnées du manifeste pour décider quel plugin possède ce canal configuré avant l'exécution du code runtime du plugin.

Pour un plugin de canal, `configSchema` et `channelConfigs` décrivent différents chemins :

- `configSchema` valide `plugins.entries.<plugin-id>.config`
- `channelConfigs.<channel-id>.schema` valide `channels.<channel-id>`

Les plugins non groupés qui déclarent `channels[]` doivent également déclarer les entrées correspondantes `channelConfigs`. Sans elles, OpenClaw peut toujours charger le plugin, mais le schéma de configuration à chemin froid, la configuration et les surfaces de l'interface utilisateur de contrôle ne peuvent pas connaître la forme de l'option détenue par le canal avant l'exécution du plugin.

`channelConfigs.<channel-id>.commands.nativeCommandsAutoEnabled` et `nativeSkillsAutoEnabled` peuvent déclarer des valeurs par défaut statiques `auto` pour les vérifications de configuration de commande qui s'exécutent avant le chargement de l'exécution du canal. Les canaux groupés peuvent également publier les mêmes valeurs par défaut via `package.json#openclaw.channel.commands` aux côtés de leurs autres métadonnées de catalogue de canal détenues par le package.

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
      "commands": {
        "nativeCommandsAutoEnabled": true,
        "nativeSkillsAutoEnabled": true
      },
      "preferOver": ["matrix-legacy"]
    }
  }
}
```

Chaque entrée de canal peut inclure :

| Champ         | Type                     | Signification                                                                                                                                |
| ------------- | ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `schema`      | `object`                 | Schéma JSON pour `channels.<id>`. Requis pour chaque entrée de configuration de canal déclarée.                                              |
| `uiHints`     | `Record<string, object>` | Étiquettes d'interface utilisateur/espaces réservés/indications de sensibilité facultatifs pour cette section de configuration de canal.     |
| `label`       | `string`                 | Étiquette de canal fusionnée dans les surfaces du sélecteur et d'inspection lorsque les métadonnées d'exécution ne sont pas prêtes.          |
| `description` | `string`                 | Courte description du canal pour les surfaces d'inspection et de catalogue.                                                                  |
| `commands`    | `object`                 | Valeurs par défaut automatiques pour les commandes natives et les compétences natives pour les vérifications de configuration pré-execution. |
| `preferOver`  | `string[]`               | Identifiants de plugin hérités ou de moindre priorité que ce canal devrait dépasser dans les interfaces de sélection.                        |

### Remplacer un autre plugin de canal

Utilisez `preferOver` lorsque votre plugin est le propriétaire préféré pour un identifiant de canal qu'un autre plugin peut également fournir. Les cas courants sont un identifiant de plugin renommé, un plugin autonome qui remplace un plugin groupé, ou un fork maintenu qui conserve le même identifiant de canal pour la compatibilité de la configuration.

```json
{
  "id": "acme-chat",
  "channels": ["chat"],
  "channelConfigs": {
    "chat": {
      "schema": {
        "type": "object",
        "additionalProperties": false,
        "properties": {
          "webhookUrl": { "type": "string" }
        }
      },
      "preferOver": ["chat"]
    }
  }
}
```

Lorsque `channels.chat` est configuré, OpenClaw prend en compte à la fois l'identifiant du canal et l'identifiant du plugin préféré. Si le plugin de moindre priorité n'a été sélectionné que parce qu'il est groupé ou activé par défaut, OpenClaw le désactive dans la configuration d'exécution effective afin qu'un seul plugin possède le canal et ses outils. La sélection explicite de l'utilisateur l'emporte toujours : si l'utilisateur active explicitement les deux plugins, OpenClaw préserve ce choix et signale des diagnostics de canal/out en double au lieu de modifier silencieusement l'ensemble de plugins demandé.

Gardez `preferOver` limité aux identifiants de plugin qui peuvent vraiment fournir le même canal. Ce n'est pas un champ de priorité général et il ne renomme pas les clés de configuration utilisateur.

## référence modelSupport

Utilisez `modelSupport` lorsque OpenClaw doit déduire votre plugin de fournisseur à partir d'identifiants de modèle abrégés comme `gpt-5.5` ou `claude-sonnet-4.6` avant le chargement de l'exécution du plugin.

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
- si un plugin non groupé et un plugin groupé correspondent tous les deux, le plugin non groupé l'emporte
- l'ambiguïté restante est ignorée jusqu'à ce que l'utilisateur ou la configuration spécifie un fournisseur

Champs :

| Champ           | Type       | Signification                                                                                          |
| --------------- | ---------- | ------------------------------------------------------------------------------------------------------ |
| `modelPrefixes` | `string[]` | Préfixes correspondant avec `startsWith` par rapport aux identifiants de modèle abrégés.               |
| `modelPatterns` | `string[]` | Sources Regex correspondant aux identifiants abrégés de modèle après suppression du suffixe de profil. |

## Référence de modelCatalog

Utilisez `modelCatalog` lorsque OpenClaw doit connaître les métadonnées du modèle de fournisseur avant
le chargement du runtime du plugin. Il s'agit de la source détenue par le manifeste pour les lignes de catalogue fixes, les alias de fournisseur, les règles de suppression et le mode de découverte. L'actualisation du runtime appartient toujours au code du fournisseur, mais le manifeste indique au cœur quand le runtime est requis.

```json
{
  "providers": ["openai"],
  "modelCatalog": {
    "providers": {
      "openai": {
        "baseUrl": "https://api.openai.com/v1",
        "api": "openai-responses",
        "models": [
          {
            "id": "gpt-5.4",
            "name": "GPT-5.4",
            "input": ["text", "image"],
            "reasoning": true,
            "contextWindow": 256000,
            "maxTokens": 128000,
            "cost": {
              "input": 1.25,
              "output": 10,
              "cacheRead": 0.125
            },
            "status": "available",
            "tags": ["default"]
          }
        ]
      }
    },
    "aliases": {
      "azure-openai-responses": {
        "provider": "openai",
        "api": "azure-openai-responses"
      }
    },
    "suppressions": [
      {
        "provider": "azure-openai-responses",
        "model": "gpt-5.3-codex-spark",
        "reason": "not available on Azure OpenAI Responses"
      }
    ],
    "discovery": {
      "openai": "static"
    }
  }
}
```

Champs de premier niveau :

| Champ          | Type                                                     | Signification                                                                                                                                              |
| -------------- | -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `providers`    | `Record<string, object>`                                 | Lignes de catalogue pour les identifiants de fournisseurs détenus par ce plugin. Les clés doivent également apparaître dans `providers` de premier niveau. |
| `aliases`      | `Record<string, object>`                                 | Alias de fournisseur qui doivent correspondre à un fournisseur détenu pour la planification du catalogue ou de la suppression.                             |
| `suppressions` | `object[]`                                               | Lignes de modèle provenant d'une autre source que ce plugin supprime pour une raison spécifique au fournisseur.                                            |
| `discovery`    | `Record<string, "static" \| "refreshable" \| "runtime">` | Si le catalogue du fournisseur peut être lu à partir des métadonnées du manifeste, actualisé dans le cache ou nécessite un runtime.                        |

`aliases` participe à la recherche de propriété du fournisseur pour la planification du catalogue de modèles.
Les cibles d'alias doivent être des fournisseurs de premier niveau détenus par le même plugin. Lorsqu'une
liste filtrée par fournisseur utilise un alias, OpenClaw peut lire le manifeste propriétaire et
appliquer les remplacements d'alias API/URL de base sans charger le runtime du fournisseur.

`suppressions` est le remplacement statique privilégié pour les hooks `suppressBuiltInModel` du runtime du fournisseur.
Les entrées de suppression sont honorées uniquement lorsque le fournisseur est détenu par le plugin ou déclaré comme une clé `modelCatalog.aliases` qui
cible un fournisseur détenu. Les hooks de suppression du runtime s'exécutent toujours comme solution de repli de compatibilité dépréciée pour les plugins qui n'ont pas migré.

Champs du fournisseur :

| Champ     | Type                     | Signification                                                                           |
| --------- | ------------------------ | --------------------------------------------------------------------------------------- |
| `baseUrl` | `string`                 | URL de base par défaut facultative pour les modèles de ce catalogue de fournisseur.     |
| `api`     | `ModelApi`               | Adaptateur d'API par défaut facultatif pour les modèles de ce catalogue de fournisseur. |
| `headers` | `Record<string, string>` | En-têtes statiques facultatifs qui s'appliquent à ce catalogue de provider.             |
| `models`  | `object[]`               | Lignes de model requises. Les lignes sans `id` sont ignorées.                           |

Champs du model :

| Champ           | Type                                                           | Signification                                                                                                    |
| --------------- | -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `id`            | `string`                                                       | Identifiant de model local au provider, sans le préfixe `provider/`.                                             |
| `name`          | `string`                                                       | Nom d'affichage facultatif.                                                                                      |
| `api`           | `ModelApi`                                                     | Remplacement facultatif de l'API par model.                                                                      |
| `baseUrl`       | `string`                                                       | Remplacement facultatif de l'URL de base par model.                                                              |
| `headers`       | `Record<string, string>`                                       | En-têtes statiques facultatifs par model.                                                                        |
| `input`         | `Array<"text" \| "image" \| "document" \| "audio" \| "video">` | Modalités acceptées par le model.                                                                                |
| `reasoning`     | `boolean`                                                      | Si le model expose un comportement de raisonnement.                                                              |
| `contextWindow` | `number`                                                       | Fenêtre de contexte native du provider.                                                                          |
| `contextTokens` | `number`                                                       | Plafond de contexte effectif au runtime facultatif lorsqu'il diffère de `contextWindow`.                         |
| `maxTokens`     | `number`                                                       | Nombre maximal de jetons de sortie lorsque connu.                                                                |
| `cost`          | `object`                                                       | Tarification facultative en USD par million de jetons, incluant facultatif `tieredPricing`.                      |
| `compat`        | `object`                                                       | Indicateurs de compatibilité facultatifs correspondant à la compatibilité de la configuration de model OpenClaw. |
| `status`        | `"available"` \| `"preview"` \| `"deprecated"` \| `"disabled"` | Statut de listing. Supprimer uniquement lorsque la ligne ne doit pas apparaître du tout.                         |
| `statusReason`  | `string`                                                       | Raison facultative affichée avec le statut non disponible.                                                       |
| `replaces`      | `string[]`                                                     | Anciens identifiants de modèle locaux au fournisseur que ce modèle remplace.                                     |
| `replacedBy`    | `string`                                                       | Identifiant de modèle local au fournisseur de remplacement pour les lignes obsolètes.                            |
| `tags`          | `string[]`                                                     | Balises stables utilisées par les sélecteurs et les filtres.                                                     |

Ne mettez pas de données exclusivement d'exécution dans `modelCatalog`. Si un fournisseur a besoin de l'état du compte, d'une requête API ou de la découverte de processus locaux pour connaître l'ensemble complet des modèles, déclarez ce fournisseur comme `refreshable` ou `runtime` dans `discovery`.

## Référence modelIdNormalization

Utilisez `modelIdNormalization` pour un nettoyage d'identifiant de modèle possédé par le fournisseur et peu coûteux qui doit se produire avant le chargement du runtime du fournisseur. Cela permet de conserver des alias tels que les noms de modèle courts, les identifiants hérités locaux au fournisseur et les règles de préfixe de proxy dans le manifeste du plugin propriétaire plutôt que dans les tables centrales de sélection de modèle.

```json
{
  "providers": ["anthropic", "openrouter"],
  "modelIdNormalization": {
    "providers": {
      "anthropic": {
        "aliases": {
          "sonnet-4.6": "claude-sonnet-4-6"
        }
      },
      "openrouter": {
        "prefixWhenBare": "openrouter"
      }
    }
  }
}
```

Champs du fournisseur :

| Champ                                | Type                    | Signification                                                                                                          |
| ------------------------------------ | ----------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `aliases`                            | `Record<string,string>` | Alias d'identifiant de modèle exacts insensibles à la casse. Les valeurs sont renvoyées telles qu'elles sont écrites.  |
| `stripPrefixes`                      | `string[]`              | Préfixes à supprimer avant la recherche d'alias, utiles pour la duplication héritée de fournisseur/modèle.             |
| `prefixWhenBare`                     | `string`                | Préfixe à ajouter lorsque l'identifiant de modèle normalisé ne contient pas déjà `/`.                                  |
| `prefixWhenBareAfterAliasStartsWith` | `object[]`              | Règles de préfixe d'identifiant nu conditionnelles après la recherche d'alias, indexées par `modelPrefix` et `prefix`. |

## Référence providerEndpoints

Utilisez `providerEndpoints` pour la classification des points de terminaison que la stratégie de requête générique doit connaître avant le chargement du runtime du fournisseur. Le cœur possède toujours la signification de chaque `endpointClass` ; les manifestes de plugin possèdent les métadonnées de l'hôte et de l'URL de base.

Champs du point de terminaison :

| Champ                          | Type       | Signification                                                                                                                                          |
| ------------------------------ | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `endpointClass`                | `string`   | Classe de point de terminaison centrale connue, telle que `openrouter`, `moonshot-native` ou `google-vertex`.                                          |
| `hosts`                        | `string[]` | Noms d'hôte exacts qui correspondent à la classe de point de terminaison.                                                                              |
| `hostSuffixes`                 | `string[]` | Suffixes d'hôte qui correspondent à la classe de point de terminaison. Préfixez avec `.` pour une correspondance uniquement sur le suffixe de domaine. |
| `baseUrls`                     | `string[]` | URLs de base HTTP(S) normalisées exactes qui correspondent à la classe de point de terminaison.                                                        |
| `googleVertexRegion`           | `string`   | Région Google Vertex statique pour les hôtes globaux exacts.                                                                                           |
| `googleVertexRegionHostSuffix` | `string`   | Suffixe à supprimer des hôtes correspondants pour exposer le préfixe de région Google Vertex.                                                          |

## Référence de providerRequest

Utilisez `providerRequest` pour des métadonnées de compatibilité de demande peu coûteuses dont la politique de demande générique a besoin sans charger le runtime du provider. Gardez la réécriture de payload spécifique au comportement dans les hooks du runtime du provider ou dans les helpers de famille de provider partagés.

```json
{
  "providers": ["vllm"],
  "providerRequest": {
    "providers": {
      "vllm": {
        "family": "vllm",
        "openAICompletions": {
          "supportsStreamingUsage": true
        }
      }
    }
  }
}
```

Champs du provider :

| Champ                 | Type         | Signification                                                                                                         |
| --------------------- | ------------ | --------------------------------------------------------------------------------------------------------------------- |
| `family`              | `string`     | Libellé de famille de provider utilisé par les décisions génériques de compatibilité des demandes et les diagnostics. |
| `compatibilityFamily` | `"moonshot"` | Bucket de compatibilité de famille de provider facultatif pour les helpers de demande partagés.                       |
| `openAICompletions`   | `object`     | Drapeaux de demande de complétions compatibles avec OpenAI, actuellement `supportsStreamingUsage`.                    |

## Référence de modelPricing

Utilisez `modelPricing` lorsqu'un provider a besoin d'un comportement de tarification du plan de contrôle avant le chargement du runtime. Le cache de tarification du Gateway lit ces métadonnées sans importer le code du runtime du provider.

```json
{
  "providers": ["ollama", "openrouter"],
  "modelPricing": {
    "providers": {
      "ollama": {
        "external": false
      },
      "openrouter": {
        "openRouter": {
          "passthroughProviderModel": true
        },
        "liteLLM": false
      }
    }
  }
}
```

Champs du provider :

| Champ        | Type              | Signification                                                                                                                     |
| ------------ | ----------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `external`   | `boolean`         | Définissez `false` pour les providers locaux/auto-hébergés qui ne doivent jamais récupérer la tarification OpenRouter ou LiteLLM. |
| `openRouter` | `false \| object` | Mappage de recherche de tarification OpenRouter. `false` désactive la recherche OpenRouter pour ce provider.                      |
| `liteLLM`    | `false \| object` | Mappage de recherche des tarifs LiteLLM. `false` désactive la recherche LiteLLM pour ce fournisseur.                              |

Champs sources :

| Champ                      | Type               | Signification                                                                                                                                                  |
| -------------------------- | ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `provider`                 | `string`           | ID du fournisseur de catalogue externe lorsqu'il diffère de l'ID du fournisseur OpenClaw, par exemple `z-ai` pour un fournisseur `zai`.                        |
| `passthroughProviderModel` | `boolean`          | Traite les ID de modèle contenant une barre oblique comme des références fournisseur/modèle imbriquées, utile pour les fournisseurs proxy tels que OpenRouter. |
| `modelIdTransforms`        | `"version-dots"[]` | Variantes d'ID de modèle supplémentaires du catalogue externe. `version-dots` essaie des ID de version pointés comme `claude-opus-4.6`.                        |

### Index des fournisseurs OpenClaw

L'index des fournisseurs OpenClaw est des métadonnées d'aperçu détenues par OpenClaw pour les fournisseurs dont les plugins peuvent ne pas encore être installés. Il ne fait pas partie d'un manifeste de plugin. Les manifestes de plugin restent l'autorité pour le plugin installé. L'index des fournisseurs est le contrat de repli interne que les futures surfaces de sélection de modèle pour les fournisseurs installables et pré-installés consommeront lorsqu'un plugin de fournisseur n'est pas installé.

Ordre d'autorité du catalogue :

1. Configuration utilisateur.
2. Manifeste du plugin installé `modelCatalog`.
3. Cache du catalogue de modèles à partir de l'actualisation explicite.
4. Lignes d'aperçu de l'index des fournisseurs OpenClaw.

L'index des fournisseurs ne doit pas contenir de secrets, d'état activé, de hooks d'exécution ou de données de modèle spécifiques à un compte en direct. Ses catalogues d'aperçu utilisent la même forme de ligne de fournisseur `modelCatalog` que les manifestes de plugin, mais doivent rester limités aux métadonnées d'affichage stables, sauf si les champs de l'adaptateur d'exécution tels que `api`, `baseUrl`, la tarification ou les indicateurs de compatibilité sont intentionnellement maintenus alignés avec le manifeste du plugin installé. Les fournisseurs avec une découverte `/models` en direct doivent écrire des lignes actualisées via le chemin du cache explicite du catalogue de modèles au lieu de passer des appels API normaux de liste ou d'intégration aux fournisseurs.

Les entrées de l'index de fournisseurs peuvent également contenir des métadonnées de plugin installable pour les fournisseurs dont le plugin a été déplacé hors du cœur ou n'est pas encore installé pour une autre raison. Ces métadonnées reflètent le modèle du catalogue de canaux : le nom du package, la spécification d'installation npm, l'intégrité attendue et les étiquettes de choix d'authentification simples suffisent pour afficher une option d'installation. Une fois le plugin installé, son manifeste prévaut et l'entrée de l'index de fournisseurs est ignorée pour ce fournisseur.

Les clés de fonctionnalités de niveau supérieur héritées sont obsolètes. Utilisez `openclaw doctor --fix` pour déplacer `speechProviders`, `realtimeTranscriptionProviders`, `realtimeVoiceProviders`, `mediaUnderstandingProviders`, `imageGenerationProviders`, `videoGenerationProviders`, `webFetchProviders` et `webSearchProviders` sous `contracts` ; le chargement normal du manifeste ne traite plus ces champs de niveau supérieur comme une propriété de fonctionnalité.

## Manifeste par rapport à package.

Les deux fichiers servent des objectifs différents :

| Fichier                | Utilisez-le pour                                                                                                                                                                                |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `openclaw.plugin.json` | La découverte, la validation de la configuration, les métadonnées de choix d'authentification et les indices de l'interface utilisateur qui doivent exister avant l'exécution du code du plugin |
| `package.json`         | Les métadonnées npm, l'installation des dépendances et le bloc `openclaw` utilisé pour les points d'entrée, la porte d'installation, la configuration ou les métadonnées du catalogue           |

Si vous n'êtes pas sûr de l'appartenance d'une métadonnée, utilisez cette règle :

- si OpenClaw doit le savoir avant de charger le code du plugin, mettez-le dans `openclaw.plugin.json`
- s'il s'agit du conditionnement, des fichiers d'entrée ou du comportement d'installation npm, mettez-le dans `package.json`

### champs package. qui affectent la découverte

Certaines métadonnées de plugin pré-exécution résident intentionnellement dans `package.json` sous le bloc `openclaw` au lieu de `openclaw.plugin.json`.

Exemples importants :

| Champ                                                             | Ce que cela signifie                                                                                                                                                                                                                                      |
| ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `openclaw.extensions`                                             | Déclare les points d'entrée des plugins natifs. Doit rester à l'intérieur du répertoire du package du plugin.                                                                                                                                             |
| `openclaw.runtimeExtensions`                                      | Déclare les points d'entrée d'exécution JavaScript construits pour les packages installés. Doit rester à l'intérieur du répertoire du package du plugin.                                                                                                  |
| `openclaw.setupEntry`                                             | Point d'entrée léger, uniquement pour la configuration, utilisé lors de l'intégration (onboarding), du démarrage différé du canal et de la découverte de l'état du canal SecretRef en lecture seule. Doit rester dans le répertoire du package du plugin. |
| `openclaw.runtimeSetupEntry`                                      | Déclare le point d'entrée de configuration JavaScript compilé pour les packages installés. Doit rester dans le répertoire du package du plugin.                                                                                                           |
| `openclaw.channel`                                                | Métadonnées de catalogue de canal peu coûteuses telles que les étiquettes, les chemins de documentation, les alias et le texte de sélection.                                                                                                              |
| `openclaw.channel.commands`                                       | Métadonnées statiques de commande native et de compétence native auto-défaut utilisées par la configuration, l'audit et les surfaces de liste de commandes avant le chargement du runtime du canal.                                                       |
| `openclaw.channel.configuredState`                                | Métadonnées de vérificateur d'état configuré léger qui peuvent répondre à « une configuration sans environnement existe-t-elle déjà ? » sans charger le runtime complet du canal.                                                                         |
| `openclaw.channel.persistedAuthState`                             | Métadonnées de vérificateur d'authentification persistante légère qui peuvent répondre à « quelque chose est-il déjà connecté ? » sans charger le runtime complet du canal.                                                                               |
| `openclaw.install.npmSpec` / `openclaw.install.localPath`         | Conseils d'installation/mise à jour pour les plugins regroupés (bundled) et publiés en externe.                                                                                                                                                           |
| `openclaw.install.defaultChoice`                                  | Chemin d'installation préféré lorsque plusieurs sources d'installation sont disponibles.                                                                                                                                                                  |
| `openclaw.install.minHostVersion`                                 | Version minimale prise en charge de l'hôte OpenClaw, utilisant un plancher semver tel que `>=2026.3.22`.                                                                                                                                                  |
| `openclaw.install.expectedIntegrity`                              | Chaîne d'intégrité de dist npm attendue, telle que `sha512-...` ; les flux d'installation et de mise à jour vérifient l'artefact récupéré par rapport à celle-ci.                                                                                         |
| `openclaw.install.allowInvalidConfigRecovery`                     | Permet un chemin de récupération étroit de réinstallation de plugin regroupé lorsque la configuration est invalide.                                                                                                                                       |
| `openclaw.startup.deferConfiguredChannelFullLoadUntilAfterListen` | Permet aux surfaces de canal de configuration uniquement de se charger avant le plugin de canal complet lors du démarrage.                                                                                                                                |

Les métadonnées du manifeste déterminent quels choix de fournisseur/canal/configuration apparaissent dans
l'intégration (onboarding) avant le chargement du runtime. `package.json#openclaw.install` indique
à l'intégration comment récupérer ou activer ce plugin lorsque l'utilisateur choisit l'une de ces
options. Ne déplacez pas les conseils d'installation dans `openclaw.plugin.json`.

`openclaw.install.minHostVersion` est appliqué lors de l'installation et du chargement du registre du manifeste.
Les valeurs invalides sont rejetées ; les plus récentes mais valides ignorent le
plugin sur les hôtes plus anciens.

Le versioning exact de npm réside déjà dans `npmSpec`, par exemple
`"npmSpec": "@wecom/wecom-openclaw-plugin@1.2.3"`. Les entrées officielles de catalogue externe
doivent associer des spécifications exactes à `expectedIntegrity` afin que les flux de mise à jour échouent
fermément si l'artefact npm récupéré ne correspond plus à la version épinglée.
L'intégration interactive propose toujours des spécifications npm de registre de confiance, y compris les noms de package seuls
et les dist-tags, pour des raisons de compatibilité. Les diagnostics du catalogue peuvent
distinguer les sources exactes, flottantes, épinglées par intégrité, à intégrité manquante, avec inadéquation du nom de package,
et à choix par défaut invalides. Ils avertissent également lorsque
`expectedIntegrity` est présent mais qu'il n'y a aucune source npm valide à laquelle il peut se raccorder.
Lorsque `expectedIntegrity` est présent,
les flux d'installation/de mise à jour l'appliquent ; lorsqu'il est omis, la résolution du registre est
enregistrée sans épinglage d'intégrité.

Les plugins de npm doivent fournir `openclaw.setupEntry` lorsque l'état, la liste de canaux,
ou les analyses SecretRef doivent identifier les comptes configurés sans charger l'intégralité du
runtime. L'entrée de configuration doit exposer les métadonnées du canal ainsi que les adaptateurs de configuration sûrs pour le setup,
le statut et les secrets ; gardez les clients réseau, les écouteurs de passerelle et les
runtimes de transport dans le point d'entrée principal de l'extension.

Les champs du point d'entrée d'exécution ne remplacent pas les vérifications des limites des packages pour les champs
du point d'entrée source. Par exemple, `openclaw.runtimeExtensions` ne peut pas rendre un chemin
`openclaw.extensions` échappé chargeable.

`openclaw.install.allowInvalidConfigRecovery` est volontairement étroit. Il ne
permet pas d'installer des configurations arbitrairement cassées. Aujourd'hui, il ne permet aux flux
d'installation de récupérer que de certaines pannes de mise à niveau obsolètes de plugins groupés, telles qu'un
chemin de plugin groupé manquant ou une entrée `channels.<id>` obsolète pour ce même
plugin groupé. Les erreurs de configuration non liées bloquent toujours l'installation et redirigent les opérateurs
vers `openclaw doctor --fix`.

`openclaw.channel.persistedAuthState` sont les métadonnées de package pour un minuscule module de
vérification :

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

Utilisez-le lorsque les flux de configuration, de diagnostic ou d'état configuré ont besoin d'une sonde d'authentification oui/non bon marché
avant le chargement complet du plugin de canal. L'export cible doit être une petite
fonction qui lit uniquement l'état persisté ; ne l'acheminez pas par le "barrel" complet du runtime du canal.

`openclaw.channel.configuredState` suit la même forme pour les vérifications peu coûteuses configurées uniquement via l'environnement :

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

Utilisez-le lorsqu'un canal peut répondre à l'état configuré à partir de l'environnement ou d'autres petites entrées non-exécution. Si la vérification nécessite une résolution complète de la configuration ou le véritable canal d'exécution, gardez cette logique dans le hook du plugin `config.hasConfiguredState` à la place.

## Priorité de découverte (doublons d'ids de plugin)

OpenClaw découvre les plugins à partir de plusieurs racines (groupés, installation globale, espace de travail, chemins explicitement sélectionnés par la configuration). Si deux découvertes partagent le même `id`, seul le manifeste de la **plus haute priorité** est conservé ; les doublons de priorité inférieure sont abandonnés au lieu d'être chargés à côté.

Priorité, de la plus élevée à la plus basse :

1. **Sélectionné par la configuration** — un chemin explicitement épinglé dans `plugins.entries.<id>`
2. **Groupé (Bundled)** — plugins livrés avec OpenClaw
3. **Installation globale** — plugins installés dans la racine globale des plugins OpenClaw
4. **Espace de travail** — plugins découverts par rapport à l'espace de travail actuel

Implications :

- Une copie forkée ou obsolète d'un plugin groupé situé dans l'espace de travail ne masquera pas la version groupée.
- Pour réellement remplacer un plugin groupé par un local, épinglez-le via `plugins.entries.<id>` afin qu'il gagne par priorité plutôt que de compter sur la découverte de l'espace de travail.
- Les abandons de doublons sont enregistrés pour que Doctor et les diagnostics de démarrage puissent pointer vers la copie ignorée.

## Exigences du schéma JSON

- **Chaque plugin doit fournir un schéma JSON**, même s'il n'accepte aucune configuration.
- Un schéma vide est acceptable (par exemple, `{ "type": "object", "additionalProperties": false }`).
- Les schémas sont validés au moment de la lecture/écriture de la configuration, et non lors de l'exécution.

## Comportement de validation

- Les clés `channels.*` inconnues sont des **erreurs**, sauf si l'id de canal est déclaré par un manifeste de plugin.
- `plugins.entries.<id>`, `plugins.allow`, `plugins.deny` et `plugins.slots.*` doivent référencer des ids de plugin **découvrables**. Les ids inconnus sont des **erreurs**.
- Si un plugin est installé mais possède un manifeste ou un schéma cassé ou manquant, la validation échoue et Doctor signale l'erreur du plugin.
- Si la configuration d'un plugin existe mais que le plugin est **désactivé**, la configuration est conservée et un **avertissement** est affiché dans Doctor + les journaux.

Voir [Référence de la configuration](/fr/gateway/configuration) pour le schéma `plugins.*` complet.

## Remarques

- Le manifeste est **requis pour les plugins natifs OpenClaw**, y compris pour les chargements depuis le système de fichiers local. Le runtime charge toujours le module du plugin séparément ; le manifeste sert uniquement à la découverte et à la validation.
- Les manifestes natifs sont analysés avec JSON5, donc les commentaires, les virgules finales et les clés non entre guillemets sont acceptés tant que la valeur finale reste un objet.
- Seuls les champs de manifeste documentés sont lus par le chargeur de manifeste. Évitez les clés de niveau supérieur personnalisées.
- `channels`, `providers`, `cliBackends` et `skills` peuvent tous être omis lorsqu'un plugin n'en a pas besoin.
- `providerDiscoveryEntry` doit rester léger et ne doit pas importer de code runtime vaste ; utilisez-le pour les métadonnées statiques du catalogue de providers ou des descripteurs de découverte étroits, et non pour l'exécution au moment de la requête.
- Les types de plugins exclusifs sont sélectionnés via `plugins.slots.*` : `kind: "memory"` via `plugins.slots.memory`, `kind: "context-engine"` via `plugins.slots.contextEngine` (par défaut `legacy`).
- Les métadonnées de variables d'environnement (`setup.providers[].envVars`, obsolète `providerAuthEnvVars`, et `channelEnvVars`) sont purement déclaratives. L'état, l'audit, la validation de livraison cron et d'autres surfaces en lecture seule appliquent toujours la politique de confiance et d'activation effective du plugin avant de traiter une variable d'environnement comme configurée.
- Pour les métadonnées de l'assistant du runtime qui nécessitent du code de provider, voir [Crochets (hooks) du runtime du provider](/fr/plugins/architecture-internals#provider-runtime-hooks).
- Si votre plugin dépend de modules natifs, documentez les étapes de build et toutes les exigences de liste d'autorisation de gestionnaire de paquets (par exemple, pnpm `allow-build-scripts` + `pnpm rebuild <package>`).

## Connexes

<CardGroup cols={3}>
  <Card title="Création de plugins" href="/fr/plugins/building-plugins" icon="rocket">
    Getting started with plugins.
  </Card>
  <Card title="Architecture de plugin" href="/fr/plugins/architecture" icon="diagram-project">
    Architecture interne et model de capacité.
  </Card>
  <Card title="Aperçu du SDK" href="/fr/plugins/sdk-overview" icon="book">
    Référence du SDK de plugin et des sous-chemins d'importation.
  </Card>
</CardGroup>
