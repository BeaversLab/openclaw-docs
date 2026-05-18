---
summary: "Manifeste de plugin + exigences de schéma JSON (validation de configuration stricte)"
read_when:
  - You are building an OpenClaw plugin
  - You need to ship a plugin config schema or debug plugin validation errors
title: "Manifeste de plugin"
---

Cette page concerne uniquement le **manifeste du plugin natif OpenClaw**.

Pour les dispositions de bundle compatibles, voir [Plugin bundles](/fr/plugins/bundles).

Les formats de bundle compatibles utilisent des fichiers manifeste différents :

- Codex bundle : `.codex-plugin/plugin.json`
- Claude bundle : `.claude-plugin/plugin.json` ou la disposition de composant Claude par défaut
  sans manifeste
- Cursor bundle : `.cursor-plugin/plugin.json`

OpenClaw détecte également automatiquement ces dispositions de bundle, mais elles ne sont pas validées
par rapport au schéma `openclaw.plugin.json` décrit ici.

Pour les bundles compatibles, OpenClaw lit actuellement les métadonnées du bundle ainsi que les racines
de compétences déclarées, les racines de commandes Claude, les valeurs par défaut du bundle Claude `settings.json`,
les valeurs par défaut du LSP du bundle Claude et les packs de hooks pris en charge lorsque la disposition correspond
aux attentes du runtime OpenClaw.

Chaque plugin natif OpenClaw **doit** inclure un fichier `openclaw.plugin.json` dans la
**racine du plugin**. OpenClaw utilise ce manifeste pour valider la configuration
**sans exécuter le code du plugin**. Les manifestes manquants ou invalides sont traités comme
des erreurs de plugin et bloquent la validation de la configuration.

Voir le guide complet du système de plugins : [Plugins](/fr/tools/plugin).
Pour le modèle de capacité natif et les directives actuelles de compatibilité externe :
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
- instantanés statiques de propriété des capacités (`contracts`)
- Métadonnées du runner QA que l'hôte partagé `openclaw qa` peut inspecter
- les métadonnées de configuration spécifiques au canal fusionnées dans le catalogue et les surfaces de validation

**Ne l'utilisez pas pour :** enregistrer le comportement d'exécution, déclarer les points d'entrée de code,
ou les métadonnées d'installation npm. Cela appartient à votre code de plugin et `package.json`.

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

| Champ                                | Obligatoire | Type                             | Signification                                                                                                                                                                                                                                                                                                                               |
| ------------------------------------ | ----------- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`                                 | Oui         | `string`                         | Identifiant canonique du plugin. C'est l'identifiant utilisé dans `plugins.entries.<id>`.                                                                                                                                                                                                                                                   |
| `configSchema`                       | Oui         | `object`                         | Schéma JSON en ligne pour la configuration de ce plugin.                                                                                                                                                                                                                                                                                    |
| `enabledByDefault`                   | Non         | `true`                           | Marque un plugin groupé comme activé par défaut. Omettez-le ou définissez une valeur autre que `true` pour laisser le plugin désactivé par défaut.                                                                                                                                                                                          |
| `enabledByDefaultOnPlatforms`        | Non         | `string[]`                       | Marque un plugin groupé comme activé par défaut uniquement sur les plateformes Node.js listées, par exemple `["darwin"]`. La configuration explicite prime toujours.                                                                                                                                                                        |
| `legacyPluginIds`                    | Non         | `string[]`                       | Identifiants obsolètes qui sont normalisés vers cet identifiant de plugin canonique.                                                                                                                                                                                                                                                        |
| `autoEnableWhenConfiguredProviders`  | Non         | `string[]`                       | Identifiants de provider qui doivent activer automatiquement ce plugin lorsque l'auth, la config ou les références de modèle les mentionnent.                                                                                                                                                                                               |
| `kind`                               | Non         | `"memory"` \| `"context-engine"` | Déclare un type de plugin exclusif utilisé par `plugins.slots.*`.                                                                                                                                                                                                                                                                           |
| `channels`                           | Non         | `string[]`                       | Identifiants de canal détenus par ce plugin. Utilisés pour la découverte et la validation de la configuration.                                                                                                                                                                                                                              |
| `providers`                          | Non         | `string[]`                       | Identifiants de provider détenus par ce plugin.                                                                                                                                                                                                                                                                                             |
| `providerCatalogEntry`               | Non         | `string`                         | Chemin de module léger de catalogue de providers, relatif à la racine du plugin, pour les métadonnées de catalogue de providers délimitées au manifeste qui peuvent être chargées sans activer le runtime complet du plugin.                                                                                                                |
| `modelSupport`                       | Non         | `object`                         | Métadonnées de famille de modèles abrégées détenues par le manifeste, utilisées pour charger automatiquement le plugin avant l'exécution.                                                                                                                                                                                                   |
| `modelCatalog`                       | Non         | `object`                         | Métadonnées déclaratives du catalogue de modèles pour les providers détenus par ce plugin. Il s'agit du contrat du plan de contrôle pour le listing en lecture seule futur, l'onboarding, les sélecteurs de modèles, les alias et la suppression sans charger le runtime du plugin.                                                         |
| `modelPricing`                       | Non         | `object`                         | Stratégie de recherche de tarification externe détenue par le provider. Utilisez-la pour exclure les providers locaux/auto-hébergés des catalogues de tarification distants ou pour mapper les références de providers aux identifiants de catalogue OpenRouter/LiteLLM sans coder en dur les identifiants de providers dans le cœur.       |
| `modelIdNormalization`               | Non         | `object`                         | Nettoyage des alias/préfixes d'identifiant de modèle détenu par le provider qui doit s'exécuter avant le chargement du runtime du provider.                                                                                                                                                                                                 |
| `providerEndpoints`                  | Non         | `object[]`                       | Métadonnées d'hôte/endpoint baseUrl détenues par le manifeste pour les routes de providers que le cœur doit classer avant le chargement du runtime du provider.                                                                                                                                                                             |
| `providerRequest`                    | Non         | `object`                         | Métadonnées peu coûteuses de famille de providers et de compatibilité des requêtes utilisées par la stratégie de requête générique avant le chargement du runtime du provider.                                                                                                                                                              |
| `cliBackends`                        | Non         | `string[]`                       | Identifiants de backend d'inférence CLI détenus par ce plugin. Utilisés pour l'auto-activation au démarrage à partir de références de configuration explicites.                                                                                                                                                                             |
| `syntheticAuthRefs`                  | Non         | `string[]`                       | Références de backend de provider ou CLI dont le hook d'authentification synthétique détenu par le plugin doit être sondé lors de la découverte à froid des modèles avant le chargement du runtime.                                                                                                                                         |
| `nonSecretAuthMarkers`               | Non         | `string[]`                       | Valeurs de clé d'API API d'espace réservé détenues par le plugin groupé qui représentent un état d'identification local non secret, OAuth ou ambiant.                                                                                                                                                                                       |
| `commandAliases`                     | Non         | `object[]`                       | Noms de commandes détenus par ce plugin qui doivent produire une configuration et des diagnostics CLI conscients du plugin avant le chargement du runtime.                                                                                                                                                                                  |
| `providerAuthEnvVars`                | Non         | `Record<string, string[]>`       | Métadonnées d'environnement de compatibilité obsolètes pour la recherche d'authentification/de statut de provider. Préférez `setup.providers[].envVars` pour les nouveaux plugins ; OpenClaw lit encore ceci pendant la période de dépréciation.                                                                                            |
| `providerAuthAliases`                | Non         | `Record<string, string>`         | Identifiants de providers qui doivent réutiliser un autre identifiant de provider pour la recherche d'authentification, par exemple un provider de codage qui partage la clé d'API API du provider de base et les profils d'authentification.                                                                                               |
| `channelEnvVars`                     | Non         | `Record<string, string[]>`       | Métadonnées d'environnement de canal peu coûteuses que OpenClaw peut inspecter sans charger le code du plugin. Utilisez-les pour la configuration de canal pilotée par l'environnement ou les surfaces d'authentification que les assistants génériques de démarrage/configuration doivent voir.                                            |
| `providerAuthChoices`                | Non         | `object[]`                       | Métadonnées de choix d'authentification peu coûteuses pour les sélecteurs d'intégration, la résolution de provider préféré et le câblage simple des indicateurs CLI.                                                                                                                                                                        |
| `activation`                         | Non         | `object`                         | Métadonnées du planificateur d'activation peu coûteuses pour le démarrage, le provider, la commande, le canal, l'itinéraire et le chargement déclenché par des capacités. Métadonnées uniquement ; le runtime du plugin possède toujours le comportement réel.                                                                              |
| `setup`                              | Non         | `object`                         | Descripteurs de configuration/intégration peu coûteux que les surfaces de découverte et de configuration peuvent inspecter sans charger le runtime du plugin.                                                                                                                                                                               |
| `qaRunners`                          | Non         | `object[]`                       | Descripteurs de lanceur QA peu coûteux utilisés par l'hôte partagé `openclaw qa` avant le chargement du runtime du plugin.                                                                                                                                                                                                                  |
| `contracts`                          | Non         | `object`                         | Instantané statique de la propriété des capacités pour les crochets d'authentification externes, la parole, la transcription en temps réel, la voix en temps réel, la compréhension des médias, la génération d'images, la génération de musique, la génération de vidéo, la récupération Web, la recherche Web et la propriété des outils. |
| `mediaUnderstandingProviderMetadata` | Non         | `Record<string, object>`         | Valeurs par défaut peu coûteuses pour la compréhension des médias pour les ids de provider déclarés dans `contracts.mediaUnderstandingProviders`.                                                                                                                                                                                           |
| `imageGenerationProviderMetadata`    | Non         | `Record<string, object>`         | Métadonnées d'authentification peu coûteuses pour la génération d'images pour les ids de provider déclarés dans `contracts.imageGenerationProviders`, y compris les alias d'authentification propres aux providers et les gardes d'URL de base.                                                                                             |
| `videoGenerationProviderMetadata`    | Non         | `Record<string, object>`         | Métadonnées d'authentification peu coûteuses pour la génération de vidéo pour les ids de provider déclarés dans `contracts.videoGenerationProviders`, y compris les alias d'authentification propres aux providers et les gardes d'URL de base.                                                                                             |
| `musicGenerationProviderMetadata`    | Non         | `Record<string, object>`         | Métadonnées d'authentification peu coûteuses pour la génération de musique pour les ids de provider déclarés dans `contracts.musicGenerationProviders`, y compris les alias d'authentification propres aux providers et les gardes d'URL de base.                                                                                           |
| `toolMetadata`                       | Non         | `Record<string, object>`         | Métadonnées de disponibilité peu coûteuses pour les outils détenus par le plugin déclarés dans `contracts.tools`. À utiliser lorsqu'un outil ne doit pas charger le runtime tant qu'aucune preuve de configuration, d'environnement ou d'authentification n'existe.                                                                         |
| `channelConfigs`                     | Non         | `Record<string, object>`         | Métadonnées de configuration de canal détenues par le manifeste, fusionnées dans les surfaces de découverte et de validation avant le chargement du runtime.                                                                                                                                                                                |
| `skills`                             | Non         | `string[]`                       | Répertoires de compétences à charger, relatifs à la racine du plugin.                                                                                                                                                                                                                                                                       |
| `name`                               | Non         | `string`                         | Nom du plugin lisible par l'homme.                                                                                                                                                                                                                                                                                                          |
| `description`                        | Non         | `string`                         | Résumé court affiché dans les surfaces du plugin.                                                                                                                                                                                                                                                                                           |
| `version`                            | Non         | `string`                         | Version du plugin à titre informatif.                                                                                                                                                                                                                                                                                                       |
| `uiHints`                            | Non         | `Record<string, object>`         | Libellés d'interface utilisateur, textes de substitution et indicateurs de sensibilité pour les champs de configuration.                                                                                                                                                                                                                    |

## Référence des métadonnées du provider de génération

Les champs de métadonnées du provider de génération décrivent les signaux d'authentification statique pour les providers déclarés dans la liste `contracts.*GenerationProviders` correspondante. OpenClaw lit ces champs avant le chargement du runtime du provider afin que les outils principaux puissent décider si un provider de génération est disponible sans importer chaque plugin de provider.

Utilisez ces champs uniquement pour des faits déclaratifs peu coûteux. Le transport, les transformations de requête, l'actualisation des jetons, la validation des informations d'identification et le comportement de génération réel restent dans le runtime du plugin.

```json
{
  "contracts": {
    "imageGenerationProviders": ["example-image"]
  },
  "imageGenerationProviderMetadata": {
    "example-image": {
      "aliases": ["example-image-oauth"],
      "authProviders": ["example-image"],
      "configSignals": [
        {
          "rootPath": "plugins.entries.example-image.config",
          "overlayPath": "image",
          "mode": {
            "path": "mode",
            "default": "local",
            "allowed": ["local"]
          },
          "requiredAny": ["workflow", "workflowPath"],
          "required": ["promptNodeId"]
        }
      ],
      "authSignals": [
        {
          "provider": "example-image"
        },
        {
          "provider": "example-image-oauth",
          "providerBaseUrl": {
            "provider": "example-image",
            "defaultBaseUrl": "https://api.example.com/v1",
            "allowedBaseUrls": ["https://api.example.com/v1"]
          }
        }
      ]
    }
  }
}
```

Chaque entrée de métadonnées prend en charge :

| Champ           | Obligatoire | Type       | Signification                                                                                                                                                                                                   |
| --------------- | ----------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `aliases`       | Non         | `string[]` | Identifiants de provider supplémentaires qui doivent être comptés comme des alias d'authentification statique pour le provider de génération.                                                                   |
| `authProviders` | Non         | `string[]` | Identifiants de provider dont les profils d'authentification configurés doivent être comptés comme une authentification pour ce provider de génération.                                                         |
| `configSignals` | Non         | `object[]` | Signaux de disponibilité peu coûteux basés uniquement sur la configuration pour les providers locaux ou auto-hébergés qui peuvent être configurés sans profils d'authentification ni variables d'environnement. |
| `authSignals`   | Non         | `object[]` | Signaux d'authentification explicites. Lorsqu'ils sont présents, ils remplacent l'ensemble de signaux par défaut de l'identifiant du fournisseur, `aliases`, et `authProviders`.                                |

Chaque entrée `configSignals` prend en charge :

| Champ         | Obligatoire | Type       | Signification                                                                                                                                                                                                                                    |
| ------------- | ----------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `rootPath`    | Oui         | `string`   | Chemin en notation pointée vers l'objet de configuration propriétaire du plugin à inspecter, par exemple `plugins.entries.example.config`.                                                                                                       |
| `overlayPath` | Non         | `string`   | Chemin en notation pointée dans la configuration racine dont l'objet doit se superposer à l'objet racine avant d'évaluer le signal. Utilisez ceci pour une configuration spécifique à une fonctionnalité telle que `image`, `video`, ou `music`. |
| `required`    | Non         | `string[]` | Chemins en notation pointée dans la configuration effective qui doivent avoir des valeurs configurées. Les chaînes ne doivent pas être vides ; les objets et les tableaux ne doivent pas être vides.                                             |
| `requiredAny` | Non         | `string[]` | Chemins en notation pointée dans la configuration effective où au moins un doit avoir une valeur configurée.                                                                                                                                     |
| `mode`        | Non         | `object`   | Garde de mode de chaîne optionnel dans la configuration effective. Utilisez ceci lorsque la disponibilité basée uniquement sur la configuration s'applique à un seul mode.                                                                       |

Chaque garde `mode` prend en charge :

| Champ        | Requis | Type       | Signification                                                                                |
| ------------ | ------ | ---------- | -------------------------------------------------------------------------------------------- |
| `path`       | Non    | `string`   | Chemin en notation pointée dans la configuration effective. La valeur par défaut est `mode`. |
| `default`    | Non    | `string`   | Valeur du mode à utiliser lorsque la configuration omet le chemin.                           |
| `allowed`    | Non    | `string[]` | Si présent, le signal réussit uniquement lorsque le mode effectif est l'une de ces valeurs.  |
| `disallowed` | Non    | `string[]` | Si présent, le signal échoue lorsque le mode effectif est l'une de ces valeurs.              |

Chaque entrée `authSignals` prend en charge :

| Champ             | Requis | Type     | Signification                                                                                                                                                                                               |
| ----------------- | ------ | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `provider`        | Oui    | `string` | Identifiant du fournisseur à vérifier dans les profils d'authentification configurés.                                                                                                                       |
| `providerBaseUrl` | Non    | `object` | Garde facultative qui ne compte le signal que lorsque le provider configuré référencé utilise une URL de base autorisée. À utiliser lorsqu'un alias d'authentification n'est valide que pour certaines API. |

Chaque garde `providerBaseUrl` prend en charge :

| Champ             | Obligatoire | Type       | Signification                                                                                                                                                                        |
| ----------------- | ----------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `provider`        | Oui         | `string`   | ID de configuration du provider dont le `baseUrl` doit être vérifié.                                                                                                                 |
| `defaultBaseUrl`  | Non         | `string`   | URL de base à supposer lorsque la configuration du provider omet `baseUrl`.                                                                                                          |
| `allowedBaseUrls` | Oui         | `string[]` | URLs de base autorisées pour ce signal d'authentification. Le signal est ignoré lorsque l'URL de base configurée ou par défaut ne correspond pas à l'une de ces valeurs normalisées. |

## Référence des métadonnées de l'outil

`toolMetadata` utilise les mêmes structures `configSignals` et `authSignals` que les métadonnées du provider de génération, indexées par le nom de l'outil. `contracts.tools` déclare la propriété. `toolMetadata` déclare une preuve de disponibilité peu coûteuse pour qu'OpenClaw puisse éviter d'importer un runtime de plugin simplement pour que sa fabrique d'outils renvoie `null`.

```json
{
  "providerAuthEnvVars": {
    "example": ["EXAMPLE_API_KEY"]
  },
  "contracts": {
    "tools": ["example_search"]
  },
  "toolMetadata": {
    "example_search": {
      "authSignals": [
        {
          "provider": "example"
        }
      ],
      "configSignals": [
        {
          "rootPath": "plugins.entries.example.config",
          "overlayPath": "search",
          "required": ["apiKey"]
        }
      ]
    }
  }
}
```

Si un outil n'a pas de `toolMetadata`, OpenClaw préserve le comportement existant et charge le plugin propriétaire lorsque le contrat de l'outil correspond à la stratégie. Pour les outils sur le chemin critique dont la fabrique dépend de l'authentification/la configuration, les auteurs de plugins doivent déclarer `toolMetadata` au lieu de faire importer le runtime par le cœur pour demander.

## Référence de providerAuthChoices

Chaque entrée `providerAuthChoices` décrit un choix d'intégration (onboarding) ou d'authentification. OpenClaw lit ceci avant le chargement du runtime du provider. Les listes de configuration des providers utilisent ces choix de manifeste, les choix de configuration dérivés des descripteurs et les métadonnées du catalogue d'installation sans charger le runtime du provider.

| Champ                 | Obligatoire | Type                                                                  | Signification                                                                                                                           |
| --------------------- | ----------- | --------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `provider`            | Oui         | `string`                                                              | ID du provider auquel ce choix appartient.                                                                                              |
| `method`              | Oui         | `string`                                                              | ID de la méthode d'authentification vers laquelle dispatcher.                                                                           |
| `choiceId`            | Oui         | `string`                                                              | ID de choix d'authentification stable utilisé par les flux onboarding et CLI.                                                           |
| `choiceLabel`         | Non         | `string`                                                              | Libellé destiné à l'utilisateur. Si omis, OpenClaw revient par défaut à `choiceId`.                                                     |
| `choiceHint`          | Non         | `string`                                                              | Texte d'aide court pour le sélecteur.                                                                                                   |
| `assistantPriority`   | Non         | `number`                                                              | Les valeurs les plus basses sont triées en premier dans les sélecteurs interactifs pilotés par l'assistant.                             |
| `assistantVisibility` | Non         | `"visible"` \| `"manual-only"`                                        | Masquer le choix dans les sélecteurs de l'assistant tout en autorisant toujours la sélection manuelle via CLI.                          |
| `deprecatedChoiceIds` | Non         | `string[]`                                                            | Identifiants de choix hérités qui doivent rediriger les utilisateurs vers ce choix de remplacement.                                     |
| `groupId`             | Non         | `string`                                                              | ID de groupe facultatif pour regrouper les choix connexes.                                                                              |
| `groupLabel`          | Non         | `string`                                                              | Libellé destiné à l'utilisateur pour ce groupe.                                                                                         |
| `groupHint`           | Non         | `string`                                                              | Texte d'aide court pour le groupe.                                                                                                      |
| `optionKey`           | Non         | `string`                                                              | Clé d'option interne pour les flux d'authentification simples à un indicateur.                                                          |
| `cliFlag`             | Non         | `string`                                                              | Nom de l'indicateur CLI, tel que `--openrouter-api-key`.                                                                                |
| `cliOption`           | Non         | `string`                                                              | Forme complète de l'option CLI, telle que `--openrouter-api-key <key>`.                                                                 |
| `cliDescription`      | Non         | `string`                                                              | Description utilisée dans l'aide CLI.                                                                                                   |
| `onboardingScopes`    | Non         | `Array<"text-inference" \| "image-generation" \| "music-generation">` | Interfaces d'intégration (onboarding) dans lesquelles ce choix doit apparaître. Si omis, la valeur par défaut est `["text-inference"]`. |

## Référence commandAliases

Utilisez `commandAliases` lorsqu'un plugin possède un nom de commande d'exécution que les utilisateurs peuvent
placer par erreur dans `plugins.allow` ou essayer d'exécuter en tant que commande racine du CLI. OpenClaw
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
| `kind`       | Non         | `"runtime-slash"` | Marque l'alias comme une commande slash de chat plutôt que comme une commande racine du CLI. |
| `cliCommand` | Non         | `string`          | Commande racine associée du CLI à suggérer pour les opérations du CLI, si elle existe.       |

## référence d'activation

Utilisez `activation` lorsque le plugin peut déclarer à peu de frais quels événements du plan de contrôle
doivent l'inclure dans un plan d'activation/chargement.

Ce bloc est des métadonnées de planificateur, et non une API de cycle de vie. Il n'enregistre pas
le comportement d'exécution, ne remplace pas `register(...)` et ne promet pas que
le code du plugin a déjà été exécuté. Le planificateur d'activation utilise ces champs pour
réduire la liste des plugins candidats avant de revenir aux métadonnées de propriété
du manifeste existant telles que `providers`, `channels`, `commandAliases`, `setup.providers`,
`contracts.tools` et les hooks.

Privilégiez les métadonnées les plus étroites qui décrivent déjà la propriété. Utilisez
`providers`, `channels`, `commandAliases`, les descripteurs de configuration, ou `contracts`
lorsque ces champs expriment la relation. Utilisez `activation` pour des indices de planificateur
supplémentaires qui ne peuvent être représentés par ces champs de propriété.
Utilisez `cliBackends` de premier niveau pour les alias de runtime CLI tels que `claude-cli`,
`my-cli`, ou `google-gemini-cli` ; `activation.onAgentHarnesses` est uniquement pour
les ids de harnais d'agent intégré qui n'ont pas déjà de champ de propriété.

Ce bloc contient uniquement des métadonnées. Il n'enregistre pas le comportement à l'exécution et ne remplace pas `register(...)`, `setupEntry` ou d'autres points d'entrée de plugin/runtime. Les consommateurs actuels l'utilisent comme indice de réduction avant le chargement plus large des plugins, donc l'absence de métadonnées d'activation hors démarrage ne coûte généralement que des performances ; cela ne devrait pas modifier la correction tant que les replis de propriété de manifeste existent encore.

Chaque plugin doit définir `activation.onStartup` intentionnellement. Définissez-le sur `true` uniquement lorsque le plugin doit s'exécuter pendant le démarrage du Gateway. Définissez-le sur `false` lorsque le plugin est inactif au démarrage et ne doit être chargé que par des déclencheurs plus restreints. Omettre `onStartup` ne charge plus implicitement le plugin au démarrage ; utilisez des métadonnées d'activation explicites pour le démarrage, le channel, la config, le harnais d'agent, la mémoire ou d'autres déclencheurs d'activation plus restreints.

```json
{
  "activation": {
    "onStartup": false,
    "onProviders": ["openai"],
    "onCommands": ["models"],
    "onChannels": ["web"],
    "onRoutes": ["gateway-webhook"],
    "onConfigPaths": ["browser"],
    "onCapabilities": ["provider", "tool"]
  }
}
```

| Champ              | Obligatoire | Type                                                 | Signification                                                                                                                                                                                                                             |
| ------------------ | ----------- | ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `onStartup`        | Non         | `boolean`                                            | Activation explicite au démarrage du Gateway. Chaque plugin doit définir cela. `true` importe le plugin pendant le démarrage ; `false` le garde en paresseux au démarrage sauf si un autre déclencheur correspondant exige le chargement. |
| `onProviders`      | Non         | `string[]`                                           | Identifiants de fournisseur qui doivent inclure ce plugin dans les plans d'activation/chargement.                                                                                                                                         |
| `onAgentHarnesses` | Non         | `string[]`                                           | Identifiants de runtime de harnais d'agent embarqué qui doivent inclure ce plugin dans les plans d'activation/chargement. Utilisez `cliBackends` de premier niveau pour les alias de backend CLI.                                         |
| `onCommands`       | Non         | `string[]`                                           | Identifiants de commande qui doivent inclure ce plugin dans les plans d'activation/chargement.                                                                                                                                            |
| `onChannels`       | Non         | `string[]`                                           | Identifiants de channel qui doivent inclure ce plugin dans les plans d'activation/chargement.                                                                                                                                             |
| `onRoutes`         | Non         | `string[]`                                           | Types de routes qui doivent inclure ce plugin dans les plans d'activation/chargement.                                                                                                                                                     |
| `onConfigPaths`    | Non         | `string[]`                                           | Chemins de configuration relatifs à la racine qui doivent inclure ce plugin dans les plans de démarrage/chargement lorsque le chemin est présent et non explicitement désactivé.                                                          |
| `onCapabilities`   | Non         | `Array<"provider" \| "channel" \| "tool" \| "hook">` | Indicateurs généraux de capacités utilisés par la planification de l'activation du plan de contrôle. Privilégiez les champs plus restreints si possible.                                                                                  |

Consommateurs actuels en direct :

- La planification du démarrage du Gateway utilise Gateway`activation.onStartup` pour l'importation explicite au démarrage
- la planification du CLI déclenchée par commande revient à l'ancien CLI`commandAliases[].cliCommand` ou `commandAliases[].name`
- la planification du démarrage du runtime agent utilise `activation.onAgentHarnesses` pour les harnais intégrés et `cliBackends[]`CLI de premier niveau pour les alias du runtime CLI
- la planification de configuration/canal déclenchée par le canal revient à la propriété de l'ancien `channels[]` lorsque les métadonnées d'activation explicite du canal sont manquantes
- la planification du plugin de démarrage utilise `activation.onConfigPaths` pour les surfaces de configuration racine hors canal telles que le bloc `browser` du plugin navigateur groupé
- la planification de configuration/runtime déclenchée par le provider revient à l'ancien `providers[]` et à la propriété de `cliBackends[]` de premier niveau lorsque les métadonnées d'activation explicite du provider sont manquantes

Les diagnostics du planificateur peuvent distinguer les indices d'activation explicite de la solution de repli de propriété du manifeste. Par exemple, `activation-command-hint` signifie que `activation.onCommands` a correspondu, tandis que `manifest-command-alias` signifie que le planificateur a utilisé la propriété `commandAliases` à la place. Ces libellés de raison sont destinés aux diagnostics et tests de l'hôte ; les auteurs de plugins doivent continuer à déclarer les métadonnées qui décrivent le mieux la propriété.

## Référence qaRunners

Utilisez `qaRunners` lorsqu'un plugin contribue un ou plusieurs transport runners sous la racine partagée `openclaw qa`CLI. Gardez ces métadonnées peu coûteuses et statiques ; le runtime du plugin possède toujours l'inscription réelle du CLI via une surface légère `runtime-api.ts` qui exporte `qaRunnerCliRegistrations`.

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

| Champ         | Requis | Type     | Signification                                                                      |
| ------------- | ------ | -------- | ---------------------------------------------------------------------------------- |
| `commandName` | Oui    | `string` | Sous-commande montée sous `openclaw qa`, par exemple `matrix`.                     |
| `description` | Non    | `string` | Texte d'aide de repli utilisé lorsque l'hôte partagé a besoin d'une commande stub. |

## référence de configuration

Utilisez `setup` lorsque les surfaces de configuration et d'intégration ont besoin de métadonnées bon marché appartenant au plugin
avant le chargement de l'exécution.

```json
{
  "setup": {
    "providers": [
      {
        "id": "openai",
        "authMethods": ["api-key"],
        "envVars": ["OPENAI_API_KEY"],
        "authEvidence": [
          {
            "type": "local-file-with-env",
            "fileEnvVar": "OPENAI_CREDENTIALS_FILE",
            "requiresAllEnv": ["OPENAI_PROJECT"],
            "credentialMarker": "openai-local-credentials",
            "source": "openai local credentials"
          }
        ]
      }
    ],
    "cliBackends": ["openai-cli"],
    "configMigrations": ["legacy-openai-auth"],
    "requiresRuntime": false
  }
}
```

`cliBackends` de premier niveau reste valide et continue à décrire les backends d'inférence CLI.
`setup.cliBackends` est la surface de descripteur spécifique à la configuration pour
les flux de contrôle/configuration qui doivent rester uniquement basés sur les métadonnées.

Lorsqu'ils sont présents, `setup.providers` et `setup.cliBackends` sont la surface de recherche
par descripteur privilégiée pour la découverte de la configuration. Si le descripteur ne
cible que le plugin candidat et que la configuration a encore besoin de crochets d'exécution plus riches
au moment de la configuration, définissez `requiresRuntime: true` et gardez `setup-api` en place en tant que
chemin d'exécution de repli.

OpenClaw inclut également `setup.providers[].envVars` dans les recherches génériques d'authentification
et de variables d'environnement du provider. `providerAuthEnvVars` reste pris en charge via un adaptateur
de compatibilité pendant la période de dépréciation, mais les plugins non groupés qui l'utilisent encore
reçoivent un diagnostic de manifeste. Les nouveaux plugins doivent placer les métadonnées d'environnement
de configuration/statut sur `setup.providers[].envVars`.

OpenClaw peut également dériver des choix de configuration simples à partir de `setup.providers[].authMethods`
lorsqu'aucune entrée de configuration n'est disponible, ou lorsque `setup.requiresRuntime: false`
déclare l'exécution de la configuration inutile. Les entrées explicites `providerAuthChoices` restent
privilégiées pour les étiquettes personnalisées, les indicateurs CLI, la portée de l'intégration et les métadonnées de l'assistant.

Définissez `requiresRuntime: false` uniquement lorsque ces descripteurs sont suffisants pour la surface de configuration. OpenClaw traite `false` explicite comme un contrat basé uniquement sur des descripteurs et n'exécutera pas `setup-api` ou `openclaw.setupEntry` pour la recherche de configuration. Si un plugin basé uniquement sur des descripteurs inclut toujours l'une de ces entrées d'exécution de configuration, OpenClaw signale un diagnostic additif et continue à l'ignorer. `requiresRuntime` omis conserve le comportement de repli hérité afin que les plugins existants qui ont ajouté des descripteurs sans l'indicateur ne cassent pas.

Étant donné que la recherche de configuration peut exécuter du code `setup-api` appartenant au plugin, les valeurs `setup.providers[].id` et `setup.cliBackends[]` normalisées doivent rester uniques pour l'ensemble des plugins découverts. En cas d'appartenance ambiguë, le système échoue fermement au lieu de choisir un gagnant selon l'ordre de découverte.

Lorsque l'exécution de la configuration a lieu, les diagnostics du registre de configuration signalent une dérive des descripteurs si `setup-api` enregistre un provider ou un backend CLI que les descripteurs du manifeste ne déclarent pas, ou si un descripteur n'a pas d'enregistrement d'exécution correspondant. Ces diagnostics sont additifs et ne rejettent pas les plugins hérités.

### Référence de setup.providers

| Champ          | Requis | Type       | Signification                                                                                                                                |
| -------------- | ------ | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`           | Oui    | `string`   | Id du provider exposé lors de la configuration ou de l'onboarding. Gardez les ids normalisés uniques globalement.                            |
| `authMethods`  | Non    | `string[]` | Ids des méthodes de configuration/auth prises en charge par ce provider sans charger l'exécution complète.                                   |
| `envVars`      | Non    | `string[]` | Variables d'environnement que les surfaces de configuration/statut génériques peuvent vérifier avant le chargement de l'exécution du plugin. |
| `authEvidence` | Non    | `object[]` | Vérifications locales peu coûteuses de preuve d'auth pour les providers pouvant s'authentifier via des marqueurs non secrets.                |

`authEvidence`API est destiné aux marqueurs d'identification locaux appartenant au provider qui peuvent être vérifiés sans charger de code d'exécution. Ces vérifications doivent rester légères et locales : pas d'appels réseau, pas de lectures de trousseau ou de gestionnaire de secrets, pas de commandes shell et pas de sondes d'API provider.

Entrées de preuves prises en charge :

| Champ              | Obligatoire | Type       | Signification                                                                                                                            |
| ------------------ | ----------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `type`             | Oui         | `string`   | Actuellement `local-file-with-env`.                                                                                                      |
| `fileEnvVar`       | Non         | `string`   | Variable d'environnement contenant un chemin de fichier d'identification explicite.                                                      |
| `fallbackPaths`    | Non         | `string[]` | Chemins de fichiers d'identification locaux vérifiés lorsque `fileEnvVar` est absent ou vide. Prend en charge `${HOME}` et `${APPDATA}`. |
| `requiresAnyEnv`   | Non         | `string[]` | Au moins une variable d'environnement listée doit être non vide pour que la preuve soit valide.                                          |
| `requiresAllEnv`   | Non         | `string[]` | Chaque variable d'environnement listée doit être non vide pour que la preuve soit valide.                                                |
| `credentialMarker` | Oui         | `string`   | Marqueur non secret renvoyé lorsque la preuve est présente.                                                                              |
| `source`           | Non         | `string`   | Libellé de source orienté utilisateur pour la sortie d'authentification/statut.                                                          |

### champs de configuration

| Champ              | Obligatoire | Type       | Signification                                                                                                                                                                         |
| ------------------ | ----------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `providers`        | Non         | `object[]` | Descripteurs de configuration du provider exposés lors de la configuration et de l'intégration.                                                                                       |
| `cliBackends`      | Non         | `string[]` | Identifiants de backend au moment de la configuration utilisés pour la recherche de configuration basée sur les descripteurs. Gardez les identifiants normalisés uniques globalement. |
| `configMigrations` | Non         | `string[]` | Identifiants de migration de configuration appartenant à la surface de configuration de ce plugin.                                                                                    |
| `requiresRuntime`  | Non         | `boolean`  | Indique si la configuration nécessite toujours l'exécution de `setup-api` après la recherche du descripteur.                                                                          |

## référence uiHints

`uiHints` est une carte des noms de champs de configuration vers de petits conseils de rendu.

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

Chaque conseil de champ peut inclure :

| Champ         | Type       | Signification                                                   |
| ------------- | ---------- | --------------------------------------------------------------- |
| `label`       | `string`   | Libellé du champ destiné à l'utilisateur.                       |
| `help`        | `string`   | Texte d'aide court.                                             |
| `tags`        | `string[]` | Balises d'interface utilisateur (UI) facultatives.              |
| `advanced`    | `boolean`  | Indique que le champ est avancé.                                |
| `sensitive`   | `boolean`  | Marque le champ comme secret ou sensible.                       |
| `placeholder` | `string`   | Texte d'espace réservé pour les champs de saisie de formulaire. |

## référence des contrats

Utilisez `contracts` uniquement pour les métadonnées statiques de propriété des capacités que OpenClaw peut
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
    "gatewayMethodDispatch": ["authenticated-request"],
    "tools": ["firecrawl_search", "firecrawl_scrape"]
  }
}
```

Chaque liste est facultative :

| Champ                            | Type       | Signification                                                                                                               |
| -------------------------------- | ---------- | --------------------------------------------------------------------------------------------------------------------------- |
| `embeddedExtensionFactories`     | `string[]` | Ids des fabriques d'extension de serveur d'application Codex, actuellement `codex-app-server`.                              |
| `agentToolResultMiddleware`      | `string[]` | Ids d'exécution pour lesquels un plugin groupé peut enregistrer un middleware de résultat d'outil.                          |
| `externalAuthProviders`          | `string[]` | Ids de provider dont le hook de profil d'authentification externe appartient à ce plugin.                                   |
| `speechProviders`                | `string[]` | Ids de provider de synthèse vocale dont ce plugin est propriétaire.                                                         |
| `realtimeTranscriptionProviders` | `string[]` | Ids de provider de transcription en temps réel dont ce plugin est propriétaire.                                             |
| `realtimeVoiceProviders`         | `string[]` | Ids de provider de voix en temps réel dont ce plugin est propriétaire.                                                      |
| `memoryEmbeddingProviders`       | `string[]` | Ids de provider d'intégration de mémoire dont ce plugin est propriétaire.                                                   |
| `mediaUnderstandingProviders`    | `string[]` | Ids de provider de compréhension multimédia dont ce plugin est propriétaire.                                                |
| `imageGenerationProviders`       | `string[]` | Ids de provider de génération d'images dont ce plugin est propriétaire.                                                     |
| `videoGenerationProviders`       | `string[]` | Ids de provider de génération de vidéos dont ce plugin est propriétaire.                                                    |
| `webFetchProviders`              | `string[]` | Ids de provider de récupération Web dont ce plugin est propriétaire.                                                        |
| `webSearchProviders`             | `string[]` | Identifiants de provider de recherche Web appartenant à ce plugin.                                                          |
| `migrationProviders`             | `string[]` | Identifiants de provider d'importation appartenant à ce plugin pour `openclaw migrate`.                                     |
| `gatewayMethodDispatch`          | `string[]` | Droit réservé pour les itinéraires HTTP de plugin authentifiés qui répartissent les méthodes Gateway en cours de processus. |
| `tools`                          | `string[]` | Noms d'outil d'agent possédés par ce plugin.                                                                                |

`contracts.embeddedExtensionFactories` est conservé pour les factories d'extension
Codex groupées et réservées au serveur d'application. Les transformations de résultats d'outil groupées doivent
déclarer `contracts.agentToolResultMiddleware` et s'inscrire auprès de
`api.registerAgentToolResultMiddleware(...)` à la place. Les plugins externes ne peuvent pas
inscrire de middleware de résultat d'outil car la couture peut réécrire la sortie d'outil
à haute confiance avant que le model ne la voie.

Les enregistrements d'exécution `api.registerTool(...)` doivent correspondre à `contracts.tools`.
La découverte d'outils utilise cette liste pour charger uniquement les runtimes de plugin qui peuvent posséder les
outils demandés.

Les plugins fournisseur qui implémentent `resolveExternalAuthProfiles` doivent déclarer
`contracts.externalAuthProviders`. Les plugins sans la déclaration s'exécutent toujours
via un fallback de compatibilité obsolète, mais ce fallback est plus lent et
sera supprimé après la fenêtre de migration.

Les fournisseurs d'intégration de mémoire regroupés doivent déclarer
`contracts.memoryEmbeddingProviders` pour chaque identifiant d'adaptateur qu'ils exposent, y compris
les adaptateurs intégrés tels que `local`CLI. Les chemins CLI autonomes utilisent ce contrat
de manifeste pour charger uniquement le plugin propriétaire avant que le runtime complet Gateway ait
enregistré les fournisseurs.

`contracts.gatewayMethodDispatch` accepte actuellement
`"authenticated-request"`. Il s'agit d'une barrière d'hygiène API pour les routes HTTP natives des plugins
qui répartissent intentionnellement les méthodes du plan de contrôle Gateway en processus, et non
un bac à sable contre les plugins natifs malveillants. Utilisez-le uniquement pour les surfaces regroupées/opérateur
étroitement examinées qui nécessitent déjà une authentification HTTP Gateway.

## Référence de mediaUnderstandingProviderMetadata

Utilisez `mediaUnderstandingProviderMetadata` lorsqu'un fournisseur de compréhension de média possède
des modèles par défaut, une priorité de repli d'auth automatique ou une prise en charge native des documents dont
les helpers génériques du noyau ont besoin avant le chargement du runtime. Les clés doivent également être déclarées dans
`contracts.mediaUnderstandingProviders`.

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

| Champ                  | Type                                | Signification                                                                                                      |
| ---------------------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `capabilities`         | `("image" \| "audio" \| "video")[]` | Capacités média exposées par ce fournisseur.                                                                       |
| `defaultModels`        | `Record<string, string>`            | Correspondance capacité-modèle par défaut utilisée lorsque la configuration ne spécifie pas de modèle.             |
| `autoPriority`         | `Record<string, number>`            | Les nombres inférieurs sont triés en premier pour le repli automatique des fournisseurs basé sur les identifiants. |
| `nativeDocumentInputs` | `"pdf"[]`                           | Entrées de documents natives prises en charge par le fournisseur.                                                  |

## Référence de channelConfigs

Utilisez `channelConfigs` lorsqu'un plugin de canal a besoin de métadonnées de configuration peu coûteuses avant
le chargement du runtime. La découverte de la configuration/du statut du canal en lecture seule peut utiliser ces métadonnées
directement pour les canaux externes configurés lorsqu'aucune entrée de configuration n'est disponible, ou
lorsque `setup.requiresRuntime: false` déclare le runtime de configuration inutile.

`channelConfigs` sont des métadonnées de manifeste de plugin, et non une nouvelle section de configuration utilisateur de niveau supérieur. Les utilisateurs configurent toujours les instances de canal sous `channels.<channel-id>`. OpenClaw lit les métadonnées du manifeste pour décider quel plugin possède ce canal configuré avant l'exécution du code d'exécution du plugin.

Pour un plugin de canal, `configSchema` et `channelConfigs` décrivent différents chemins :

- `configSchema` valide `plugins.entries.<plugin-id>.config`
- `channelConfigs.<channel-id>.schema` valide `channels.<channel-id>`

Les plugins non groupés qui déclarent `channels[]` doivent également déclarer des entrées `channelConfigs` correspondantes. Sans elles, OpenClaw peut toujours charger le plugin, mais le schéma de configuration à froid, la configuration et les surfaces de l'interface utilisateur de contrôle ne peuvent pas connaître la forme de l'option détenue par le canal tant que le runtime du plugin ne s'est pas exécuté.

`channelConfigs.<channel-id>.commands.nativeCommandsAutoEnabled` et `nativeSkillsAutoEnabled` peuvent déclarer des valeurs par défaut statiques `auto` pour les vérifications de configuration de commande qui s'exécutent avant le chargement du runtime du canal. Les canaux groupés peuvent également publier les mêmes valeurs par défaut via `package.json#openclaw.channel.commands` aux côtés de leurs autres métadonnées de catalogue de canal détenues par le package.

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
| `uiHints`     | `Record<string, object>` | Étiquettes d'interface utilisateur, espaces réservés et indications de sensibilité facultatifs pour cette section de configuration de canal. |
| `label`       | `string`                 | Étiquette de canal fusionnée dans les surfaces de sélecteur et d'inspection lorsque les métadonnées d'exécution ne sont pas prêtes.          |
| `description` | `string`                 | Courte description du canal pour les surfaces d'inspection et de catalogue.                                                                  |
| `commands`    | `object`                 | Valeurs par défaut automatiques pour les commandes natives et les compétences natives pour les vérifications de configuration pré-runtime.   |
| `preferOver`  | `string[]`               | Identifiants de plugin hérités ou de priorité inférieure que ce canal devrait dépasser dans les surfaces de sélection.                       |

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

Lorsque `channels.chat` est configuré, OpenClaw considère à la fois l'identifiant du canal et l'identifiant du plugin préféré. Si le plugin de priorité inférieure n'a été sélectionné que parce qu'il est groupé ou activé par défaut, OpenClaw le désactive dans la configuration d'exécution effective afin qu'un seul plugin possède le canal et ses outils. La sélection explicite de l'utilisateur prime toujours : si l'utilisateur active explicitement les deux plugins, OpenClaw préserve ce choix et signale des diagnostics de canal/out en double au lieu de modifier silencieusement l'ensemble de plugins demandé.

Gardez `preferOver` limité aux identifiants de plugin qui peuvent vraiment fournir le même canal. Ce n'est pas un champ de priorité général et il ne renomme pas les clés de configuration utilisateur.

## Référence modelSupport

Utilisez `modelSupport` lorsque OpenClaw doit déduire votre plugin de fournisseur à partir d'identifiants de modèle abrégés comme `gpt-5.5` ou `claude-sonnet-4.6` avant le chargement du runtime du plugin.

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

| Champ           | Type       | Signification                                                                                                                            |
| --------------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `modelPrefixes` | `string[]` | Préfixes correspondant à `startsWith` par rapport aux identifiants de modèle abrégés.                                                    |
| `modelPatterns` | `string[]` | Sources d'expressions régulières mises en correspondance avec les identifiants de modèle abrégés après suppression du suffixe de profil. |

## Référence modelCatalog

Utilisez `modelCatalog`OpenClaw lorsqu'OpenClaw doit connaître les métadonnées du modèle du fournisseur avant de charger le runtime du plugin. Il s'agit de la source détenue par le manifeste pour les lignes de catalogue fixes, les alias de fournisseur, les règles de suppression et le mode de découverte. L'actualisation du runtime appartient toujours au code du fournisseur, mais le manifeste indique au cœur quand le runtime est requis.

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

| Champ          | Type                                                     | Signification                                                                                                                                           |
| -------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `providers`    | `Record<string, object>`                                 | Lignes de catalogue pour les identifiants de fournisseurs détenus par ce plugin. Les clés doivent également apparaître au niveau supérieur `providers`. |
| `aliases`      | `Record<string, object>`                                 | Alias de fournisseur qui doivent être résolus vers un fournisseur détenu pour la planification du catalogue ou de la suppression.                       |
| `suppressions` | `object[]`                                               | Lignes de modèle provenant d'une autre source que ce plugin supprime pour une raison spécifique au fournisseur.                                         |
| `discovery`    | `Record<string, "static" \| "refreshable" \| "runtime">` | Indique si le catalogue du fournisseur peut être lu à partir des métadonnées du manifeste, actualisé dans le cache, ou s'il nécessite un runtime.       |

`aliases`OpenClawAPI participe à la recherche de propriété de fournisseur pour la planification du catalogue de modèles.
Les cibles d'alias doivent être des fournisseurs de premier niveau détenus par le même plugin. Lorsqu'une liste filtrée par fournisseur utilise un alias, OpenClaw peut lire le manifeste propriétaire et appliquer les remplacements d'alias d'API/URL de base sans charger le runtime du fournisseur.
Les alias n'étendent pas les listes de catalogue non filtrées ; les listes larges émettent uniquement les lignes du fournisseur canonique propriétaire.

`suppressions` remplace l'ancien hook de runtime du fournisseur `suppressBuiltInModel`.
Les entrées de suppression sont honorées uniquement lorsque le fournisseur est détenu par le plugin ou déclaré comme une clé `modelCatalog.aliases` ciblant un fournisseur détenu. Les hooks de suppression de runtime ne sont plus appelés lors de la résolution du modèle.

Champs du fournisseur :

| Champ     | Type                     | Signification                                                                         |
| --------- | ------------------------ | ------------------------------------------------------------------------------------- |
| `baseUrl` | `string`                 | URL de base par défaut facultative pour les modèles de ce catalogue de fournisseur.   |
| `api`     | `ModelApi`               | Adaptateur d'API par défaut facultatif pour les modèles de ce catalogue de providers. |
| `headers` | `Record<string, string>` | En-têtes statiques facultatifs qui s'appliquent à ce catalogue de providers.          |
| `models`  | `object[]`               | Lignes de modèle requises. Les lignes sans `id` sont ignorées.                        |

Champs du modèle :

| Champ           | Type                                                           | Signification                                                                                                     |
| --------------- | -------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `id`            | `string`                                                       | ID de modèle local au provider, sans le préfixe `provider/`.                                                      |
| `name`          | `string`                                                       | Nom d'affichage facultatif.                                                                                       |
| `api`           | `ModelApi`                                                     | Remplacement facultatif de l'API par modèle.                                                                      |
| `baseUrl`       | `string`                                                       | Remplacement facultatif de l'URL de base par modèle.                                                              |
| `headers`       | `Record<string, string>`                                       | En-têtes statiques facultatifs par modèle.                                                                        |
| `input`         | `Array<"text" \| "image" \| "document" \| "audio" \| "video">` | Modalités acceptées par le modèle.                                                                                |
| `reasoning`     | `boolean`                                                      | Si le modèle expose un comportement de raisonnement.                                                              |
| `contextWindow` | `number`                                                       | Fenêtre de contexte native du provider.                                                                           |
| `contextTokens` | `number`                                                       | Plafond de contexte d'exécution effectif facultatif lorsqu'il diffère de `contextWindow`.                         |
| `maxTokens`     | `number`                                                       | Jetons de sortie maximum lorsque connus.                                                                          |
| `cost`          | `object`                                                       | Tarification facultative en USD par million de jetons, incluant `tieredPricing` facultatif.                       |
| `compat`        | `object`                                                       | Indicateurs de compatibilité facultatifs correspondant à la compatibilité de la configuration du modèle OpenClaw. |
| `status`        | `"available"` \| `"preview"` \| `"deprecated"` \| `"disabled"` | Statut de liste. Supprimer uniquement lorsque la ligne ne doit pas apparaître du tout.                            |
| `statusReason`  | `string`                                                       | Raison facultative affichée avec le statut non disponible.                                                        |
| `replaces`      | `string[]`                                                     | Anciens identifiants de modèle locaux au provider que ce modèle remplace.                                         |
| `replacedBy`    | `string`                                                       | Identifiant de modèle local au provider de remplacement pour les lignes obsolètes.                                |
| `tags`          | `string[]`                                                     | Balises stables utilisées par les sélecteurs et les filtres.                                                      |

Champs de suppression :

| Champ                      | Type       | Signification                                                                                                                |
| -------------------------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `provider`                 | `string`   | Identifiant du provider pour la ligne en amont à supprimer. Doit être détenu par ce plugin ou déclaré comme un alias détenu. |
| `model`                    | `string`   | Identifiant de modèle local au provider à supprimer.                                                                         |
| `reason`                   | `string`   | Message facultatif affiché lorsque la ligne supprimée est demandée directement.                                              |
| `when.baseUrlHosts`        | `string[]` | Liste facultative des hôtes d'URL de base effectifs du provider requis avant que la suppression ne s'applique.               |
| `when.providerConfigApiIn` | `string[]` | Liste facultative des valeurs exactes de configuration de provider `api` requises avant que la suppression ne s'applique.    |

Ne placez pas de données d'exécution uniquement dans `modelCatalog`. Utilisez `static` uniquement lorsque les lignes du manifeste sont suffisamment complètes pour que les listes et les surfaces de sélection filtrées par provider puissent ignorer la découverte du registre/d'exécution. Utilisez `refreshable` lorsque les lignes du manifeste sont des germes ou des compléments listables utiles, mais qu'une actualisation ou un cache peut ajouter d'autres lignes ultérieurement ; les lignes actualisables ne sont pas autoritaires par elles-mêmes. Utilisez `runtime` lorsque OpenClaw doit charger l'exécution du provider pour connaître la liste.

## référence de modelIdNormalization

Utilisez `modelIdNormalization` pour le nettoyage d'identifiant de modèle détenu par le provider, qui doit avoir lieu avant le chargement de l'exécution du provider. Cela permet de conserver des alias tels que les noms de modèle courts, les identifiants hérités locaux au provider et les règles de préfixe de proxy dans le manifeste du plugin propriétaire plutôt que dans les tables de sélection de modèle principales.

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

Champs du provider :

| Champ                                | Type                    | Signification                                                                                                          |
| ------------------------------------ | ----------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `aliases`                            | `Record<string,string>` | Alias d'identifiant de modèle exact insensible à la casse. Les valeurs sont renvoyées telles qu'elles sont écrites.    |
| `stripPrefixes`                      | `string[]`              | Préfixes à supprimer avant la recherche d'alias, utiles pour la duplication de fournisseur/modèle héritée.             |
| `prefixWhenBare`                     | `string`                | Préfixe à ajouter lorsque l'identifiant de modèle normalisé ne contient pas déjà `/`.                                  |
| `prefixWhenBareAfterAliasStartsWith` | `object[]`              | Règles de préfixe d'identifiant nu conditionnelles après la recherche d'alias, indexées par `modelPrefix` et `prefix`. |

## Référence de providerEndpoints

Utilisez `providerEndpoints` pour la classification des points de terminaison que la stratégie de demande générique
doit connaître avant le chargement du runtime du fournisseur. Le cœur possède toujours la signification de chaque
`endpointClass` ; les manifestes de plugin possèdent les métadonnées de l'hôte et de l'URL de base.

Champs du point de terminaison :

| Champ                          | Type       | Signification                                                                                                                                          |
| ------------------------------ | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `endpointClass`                | `string`   | Classe de point de terminaison principale connue, telle que `openrouter`, `moonshot-native` ou `google-vertex`.                                        |
| `hosts`                        | `string[]` | Noms d'hôte exacts qui correspondent à la classe de point de terminaison.                                                                              |
| `hostSuffixes`                 | `string[]` | Suffixes d'hôte qui correspondent à la classe de point de terminaison. Préfixez avec `.` pour une correspondance uniquement sur le suffixe de domaine. |
| `baseUrls`                     | `string[]` | URL de base HTTP(S) normalisées exactes qui correspondent à la classe de point de terminaison.                                                         |
| `googleVertexRegion`           | `string`   | Région Google Vertex statique pour les hôtes globaux exacts.                                                                                           |
| `googleVertexRegionHostSuffix` | `string`   | Suffixe à supprimer des hôtes correspondants pour exposer le préfixe de région Google Vertex.                                                          |

## Référence de providerRequest

Utilisez `providerRequest` pour les métadonnées de compatibilité de demande peu coûteuses dont la stratégie de
demande générique a besoin sans charger le runtime du fournisseur. Conservez la réécriture de charge utile
spécifique au comportement dans les hooks du runtime du fournisseur ou les assistants partagés de famille de fournisseurs.

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

Champs du fournisseur :

| Champ                 | Type         | Signification                                                                                                           |
| --------------------- | ------------ | ----------------------------------------------------------------------------------------------------------------------- |
| `family`              | `string`     | Label de famille de fournisseur utilisé pour les décisions de compatibilité des requêtes génériques et les diagnostics. |
| `compatibilityFamily` | `"moonshot"` | Bucket de compatibilité de famille de fournisseurs optionnel pour les assistants de requête partagés.                   |
| `openAICompletions`   | `object`     | Drapeaux de requête de complétion compatibles OpenAI, actuellement `supportsStreamingUsage`.                            |

## Référence modelPricing

Utilisez `modelPricing` lorsqu'un fournisseur a besoin d'un comportement de tarification du plan de contrôle avant le chargement du runtime. Le cache de tarification du Gateway lit ces métadonnées sans importer le code d'exécution du fournisseur.

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

Champs du fournisseur :

| Champ        | Type              | Signification                                                                                                                        |
| ------------ | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `external`   | `boolean`         | Définissez `false` pour les fournisseurs locaux/auto-hébergés qui ne doivent jamais récupérer la tarification OpenRouter ou LiteLLM. |
| `openRouter` | `false \| object` | Mappage de recherche de tarification OpenRouter. `false` désactive la recherche OpenRouter pour ce fournisseur.                      |
| `liteLLM`    | `false \| object` | Mappage de recherche de tarification LiteLLM. `false` désactive la recherche LiteLLM pour ce fournisseur.                            |

Champs de la source :

| Champ                      | Type               | Signification                                                                                                                                                      |
| -------------------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `provider`                 | `string`           | Id de fournisseur de catalogue externe lorsqu'il diffère de l'id de fournisseur OpenClaw, par exemple `z-ai` pour un fournisseur `zai`.                            |
| `passthroughProviderModel` | `boolean`          | Traiter les ids de modèle contenant des barres obliques comme des références fournisseur/modèle imbriquées, utile pour les fournisseurs proxy tels que OpenRouter. |
| `modelIdTransforms`        | `"version-dots"[]` | Variantes d'ids de modèle de catalogue externe supplémentaires. `version-dots` essaie les ids de version avec points comme `claude-opus-4.6`.                      |

### Index des fournisseurs OpenClaw

L'Index des Fournisseurs OpenClaw est des métadonnées d'aperçu appartenant à OpenClaw pour les fournisseurs dont les plugins ne sont peut-être pas encore installés. Il ne fait pas partie d'un manifeste de plugin. Les manifestes de plugins restent l'autorité pour les plugins installés. L'Index des Fournisseurs est le contrat de repli interne que les futures surfaces de fournisseur installable et de sélecteur de modèle pré-installation consommeront lorsqu'un plugin de fournisseur n'est pas installé.

Ordre d'autorité du catalogue :

1. Configuration utilisateur.
2. Manifeste du plugin installé `modelCatalog`.
3. Cache du catalogue de modèles à partir d'une actualisation explicite.
4. Lignes d'aperçu de l'Index des Fournisseurs OpenClaw.

L'Index des Fournisseurs ne doit pas contenir de secrets, d'état activé, de hooks d'exécution ou de données de modèle spécifiques au compte en direct. Ses catalogues d'aperçu utilisent la même forme de ligne de fournisseur `modelCatalog` que les manifestes de plugin, mais doivent rester limités aux métadonnées d'affichage stables, à moins que les champs de l'adaptateur d'exécution tels que `api`, `baseUrl`, la tarification ou les indicateurs de compatibilité ne soient intentionnellement alignés avec le manifeste du plugin installé. Les fournisseurs avec une découverte `/models` en direct doivent écrire des lignes actualisées via le chemin du cache du catalogue de modèles explicite au lieu d'effectuer des appels d'API de fournisseur de liste ou d'intégration normaux.

Les entrées de l'Index des Fournisseurs peuvent également contenir des métadonnées de plugin installable pour les fournisseurs dont le plugin a été déplacé hors du cœur ou n'est pas autrement installé. Ces métadonnées reflètent le modèle du catalogue de canaux : le nom du package, la spécification d'installation npm, l'intégrité attendue et les étiquettes de choix d'authentification bon marché suffisent pour afficher une option de configuration installable. Une fois le plugin installé, son manifeste l'emporte et l'entrée de l'Index des Fournisseurs est ignorée pour ce fournisseur.

Les clés de fonctionnalité de niveau supérieur héritées sont obsolètes. Utilisez `openclaw doctor --fix` pour
déplacer `speechProviders`, `realtimeTranscriptionProviders`,
`realtimeVoiceProviders`, `mediaUnderstandingProviders`,
`imageGenerationProviders`, `videoGenerationProviders`,
`webFetchProviders` et `webSearchProviders` sous `contracts` ; le
chargement normal du manifeste ne traite plus ces champs de niveau supérieur comme une
propriété de fonctionnalité.

## Manifeste par rapport à package.

Les deux fichiers ont des rôles différents :

| Fichier                | Utilisé pour                                                                                                                                                                          |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `openclaw.plugin.json` | Discovery, validation de la configuration, métadonnées de choix d'authentification et indices d'interface utilisateur qui doivent exister avant l'exécution du code du plugin         |
| `package.json`         | Métadonnées npm, installation des dépendances et le bloc `openclaw` utilisé pour les points d'entrée, les conditions d'installation, la configuration ou les métadonnées du catalogue |

Si vous n'êtes pas sûr de l'emplacement d'une métadonnée, utilisez cette règle :

- si OpenClaw doit le connaître avant de charger le code du plugin, placez-le dans `openclaw.plugin.json`
- s'il s'agit du packaging, des fichiers d'entrée ou du comportement de l'installation npm, placez-le dans `package.json`

### Champs package. affectant la découverte

Certaines métadonnées de plugin pré-runtime résident intentionnellement dans `package.json` sous le
bloc `openclaw` au lieu de `openclaw.plugin.json`.
`openclaw.bundle` et `openclaw.bundle.json` ne sont pas des contrats de plugins OpenClaw ;
les plugins natifs doivent utiliser `openclaw.plugin.json` ainsi que les champs
`package.json#openclaw` pris en charge ci-dessous.

Exemples importants :

| Champ                                                                                      | Signification                                                                                                                                                                                                                                             |
| ------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `openclaw.extensions`                                                                      | Déclare les points d'entrée des plugins natifs. Doit rester à l'intérieur du répertoire du package du plugin.                                                                                                                                             |
| `openclaw.runtimeExtensions`                                                               | Déclare les points d'entrée d'exécution JavaScript compilés pour les packages installés. Doit rester à l'intérieur du répertoire du package du plugin.                                                                                                    |
| `openclaw.setupEntry`                                                                      | Point d'entrée léger, uniquement pour la configuration, utilisé lors de l'intégration (onboarding), du démarrage différé du canal et de la découverte de l'état/SecretRef en lecture seule du canal. Doit rester dans le répertoire du package du plugin. |
| `openclaw.runtimeSetupEntry`                                                               | Déclare le point d'entrée de configuration JavaScript compilé pour les packages installés. Nécessite `setupEntry`, doit exister et doit rester dans le répertoire du package du plugin.                                                                   |
| `openclaw.channel`                                                                         | Métadonnées légères du catalogue de canaux telles que les étiquettes, les chemins de documentation, les alias et le texte de sélection.                                                                                                                   |
| `openclaw.channel.commands`                                                                | Métadonnées par défaut automatiques pour les commandes natives et les compétences natives, utilisées par les surfaces de configuration, d'audit et de liste de commandes avant le chargement du runtime du canal.                                         |
| `openclaw.channel.configuredState`                                                         | Métadonnées légères du vérificateur d'état configuré capables de répondre « une configuration uniquement par environnement existe-t-elle déjà ? » sans charger le runtime complet du canal.                                                               |
| `openclaw.channel.persistedAuthState`                                                      | Métadonnées légères du vérificateur d'authentification persistante capables de répondre « quelque chose est-il déjà connecté ? » sans charger le runtime complet du canal.                                                                                |
| `openclaw.install.clawhubSpec` / `openclaw.install.npmSpec` / `openclaw.install.localPath` | Conseils d'installation/de mise à jour pour les plugins regroupés et publiés en externe.                                                                                                                                                                  |
| `openclaw.install.defaultChoice`                                                           | Chemin d'installation privilégié lorsque plusieurs sources d'installation sont disponibles.                                                                                                                                                               |
| `openclaw.install.minHostVersion`                                                          | Version minimale prise en charge de l'hôte OpenClaw, utilisant un plancher semver comme `>=2026.3.22` ou `>=2026.5.1-beta.1`.                                                                                                                             |
| `openclaw.install.expectedIntegrity`                                                       | Chaîne d'intégrité de dist npm attendue telle que `sha512-...` ; les flux d'installation et de mise à jour vérifient l'artefact récupéré par rapport à celle-ci.                                                                                          |
| `openclaw.install.allowInvalidConfigRecovery`                                              | Permet un chemin de récupération étroit de réinstallation de plugin regroupé lorsque la configuration est invalide.                                                                                                                                       |
| `openclaw.startup.deferConfiguredChannelFullLoadUntilAfterListen`                          | Permet aux surfaces de canal uniquement pour la configuration de se charger avant le plugin de canal complet lors du démarrage.                                                                                                                           |

Les métadonnées du manifeste déterminent quels choix de fournisseur/canal/configuration apparaissent lors de l'intégration (onboarding) avant le chargement du runtime. `package.json#openclaw.install` indique à l'intégration comment récupérer ou activer ce plugin lorsque l'utilisateur choisit l'une de ces options. Ne déplacez pas les conseils d'installation dans `openclaw.plugin.json`.

`openclaw.install.minHostVersion` est appliqué lors de l'installation et du chargement du registre de manifeste pour les sources de plugins non groupés. Les valeurs invalides sont rejetées ; les plus récentes mais valides ignorent les plugins externes sur les hôtes plus anciens. Les plugins source groupés sont supposés être co-versionnés avec la version de l'hôte.

Les métadonnées officielles d'installation à la demande doivent utiliser `clawhubSpec` lorsque le plugin est publié sur ClawHub ; le processus d'intégration le considère comme la source distante préférée et enregistre les faits d'artefact ClawHub après l'installation. `npmSpec` reste le repli de compatibilité pour les packages qui n'ont pas encore migré vers ClawHub.

L'épinglage exact de version npm réside déjà dans `npmSpec`, par exemple `"npmSpec": "@wecom/wecom-openclaw-plugin@1.2.3"`. Les entrées officielles du catalogue externe doivent associer des spécifications exactes à `expectedIntegrity` afin que les flux de mise à jour échouent fermement si l'artefact npm récupéré ne correspond plus à la version épinglée. L'intégration interactive offre toujours des spécifications npm de registre de confiance, y compris les noms de packages nus et les dist-tags, pour la compatibilité. Les diagnostics du catalogue peuvent distinguer les sources exactes, flottantes, épinglées par intégrité, à intégrité manquante, avec inadéquation du nom de package et à choix par défaut invalides. Ils avertissent également lorsque `expectedIntegrity` est présent mais qu'il n'y a aucune source npm valide à laquelle il peut s'attacher. Lorsque `expectedIntegrity` est présent, les flux d'installation/mise à jour l'appliquent ; lorsqu'il est omis, la résolution du registre est enregistrée sans épinglage d'intégrité.

Les plugins de canal doivent fournir `openclaw.setupEntry` lorsque l'état, la liste des canaux ou les analyses SecretRef doivent identifier les comptes configurés sans charger l'intégralité du runtime. L'entrée de configuration doit exposer les métadonnées du canal ainsi que les adaptateurs de configuration, d'état et de secrets sécurisés pour l'installation ; gardez les clients réseau, les écouteurs de passerelle et les runtimes de transport dans le point d'entrée principal de l'extension.

Les champs de point d'entrée d'exécution ne remplacent pas les vérifications de limites de package pour les champs de point d'entrée source. Par exemple, `openclaw.runtimeExtensions` ne peut pas rendre un chemin `openclaw.extensions` échappé chargeable.

`openclaw.install.allowInvalidConfigRecovery` est volontairement restreint. Il ne rend pas les configurations cassées arbitraires installables. Aujourd'hui, il permet uniquement aux flux d'installation de récupérer de certains échecs de mise à niveau de plugin groupé obsolètes, tels qu'un chemin de plugin groupé manquant ou une entrée `channels.<id>` obsolète pour ce même plugin groupé. Les erreurs de configuration non liées bloquent toujours l'installation et redirigent les opérateurs vers `openclaw doctor --fix`.

`openclaw.channel.persistedAuthState` sont des métadonnées de package pour un minuscule module de vérification :

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

Utilisez-le lorsque les flux de configuration, de diagnostic, d'état ou de présence en lecture seule ont besoin d'une sonde d'authentification oui/non peu coûteuse avant le chargement complet du plugin de canal. L'état d'authentification persisté n'est pas l'état configuré du canal : n'utilisez pas ces métadonnées pour activer automatiquement les plugins, réparer les dépendances d'exécution ou décider si un runtime de canal doit être chargé. L'export cible doit être une petite fonction qui lit uniquement l'état persisté ; ne l'acheminez pas par le baril complet du runtime du canal.

`openclaw.channel.configuredState` suit la même forme pour les vérifications configurées uniquement par environnement peu coûteuses :

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

Utilisez-le lorsqu'un canal peut répondre à l'état configuré à partir de variables d'environnement ou d'autres petites entrées non liées au runtime. Si la vérification nécessite une résolution complète de la configuration ou le vrai runtime du canal, gardez plutôt cette logique dans le hook `config.hasConfiguredState` du plugin.

## Priorité de découverte (identifiants de plugin en double)

OpenClaw découvre les plugins à partir de plusieurs racines. Pour l'ordre de scan du système de fichiers brut, voir [Ordre de scan des plugins](/fr/gateway/configuration-reference#plugin-scan-order). Si deux découvertes partagent le même `id`, seul le manifeste de **priorité la plus élevée** est conservé ; les doublons de priorité inférieure sont abandonnés au lieu d'être chargés à côté.

Priorité, de la plus élevée à la plus basse :

1. **Sélectionné par la configuration** — un chemin explicitement épinglé dans `plugins.entries.<id>`
2. **Groupé** — plugins livrés avec OpenClaw
3. **Installation globale** — plugins installés dans la racine globale des plugins OpenClaw
4. **Espace de travail** — plugins découverts relatifs à l'espace de travail actuel

Implications :

- Une copie bifurquée ou obsolète d'un plugin groupé située dans l'espace de travail ne masquera pas la version groupée.
- Pour réellement remplacer un plugin groupé par un plugin local, épinglez-le via `plugins.entries.<id>` pour qu'il l'emporte par priorité plutôt que de compter sur la découverte de l'espace de travail.
- Les doublons supprimés sont consignés afin que le Doctor et les diagnostics de démarrage puissent pointer vers la copie écartée.
- Les remplacements de doublons sélectionnés par la configuration sont présentés comme des remplacements explicites dans les diagnostics, mais avertissent toujours pour que les forks obsolètes et les ombres accidentelles restent visibles.

## Exigences du schéma JSON

- **Chaque plugin doit fournir un schéma JSON**, même s'il n'accepte aucune configuration.
- Un schéma vide est acceptable (par exemple, `{ "type": "object", "additionalProperties": false }`).
- Les schémas sont validés au moment de la lecture/écriture de la configuration, et non au moment de l'exécution.
- Lors de l'extension ou du fork d'un plugin groupé avec de nouvelles clés de configuration, mettez à jour le `openclaw.plugin.json` `configSchema` de ce plugin en même temps. Les schémas des plugins groupés sont stricts, donc l'ajout de `plugins.entries.<id>.config.myNewKey` dans la configuration utilisateur sans ajouter `myNewKey` à `configSchema.properties` sera rejeté avant le chargement du runtime du plugin.

Exemple d'extension de schéma :

```json
{
  "configSchema": {
    "type": "object",
    "additionalProperties": false,
    "properties": {
      "myNewKey": {
        "type": "string"
      }
    }
  }
}
```

## Comportement de la validation

- Les clés inconnues de `channels.*` sont des **erreurs**, sauf si l'identifiant de canal est déclaré par
  un manifeste de plugin.
- `plugins.entries.<id>`, `plugins.allow`, `plugins.deny` et `plugins.slots.*`
  doivent référencer des identifiants de plugin **découvrables**. Les identifiants inconnus sont des **erreurs**.
- Si un plugin est installé mais possède un manifeste ou un schéma cassé ou manquant,
  la validation échoue et le Doctor signale l'erreur du plugin.
- Si la configuration d'un plugin existe mais que le plugin est **désactivé**, la configuration est conservée et
  un **avertissement** est affiché dans le Doctor + les journaux.

Voir [Référence de configuration](/fr/gateway/configuration) pour le schéma complet de `plugins.*`.

## Notes

- Le manifeste est **requis pour les plugins natifs OpenClaw**, y compris pour les chargements depuis le système de fichiers local. Le runtime charge toujours le module du plugin séparément ; le manifeste sert uniquement à la découverte + validation.
- Les manifestes natifs sont analysés avec JSON5, donc les commentaires, les virgules de fin et les clés sans guillemets sont acceptés tant que la valeur finale reste un objet.
- Seuls les champs de manifeste documentés sont lus par le chargeur de manifeste. Évitez les clés personnalisées de niveau supérieur.
- `channels`, `providers`, `cliBackends` et `skills` peuvent tous être omis lorsqu'un plugin n'en a pas besoin.
- `providerCatalogEntry` doit rester léger et ne doit pas importer de code d'exécution volumineux ; utilisez-le pour les métadonnées statiques du catalogue de provider ou descripteurs de découverte étroits, et non pour l'exécution au moment de la requête. `providerDiscoveryEntry` est l'orthographe héritée et fonctionne toujours pour les plugins existants.
- Les types de plugins exclusifs sont sélectionnés via `plugins.slots.*` : `kind: "memory"` via `plugins.slots.memory`, `kind: "context-engine"` via `plugins.slots.contextEngine` (par défaut `legacy`).
- Déclarez le type de plugin exclusif dans ce manifeste. Le point d'entrée d'exécution `OpenClawPluginDefinition.kind` est obsolète et ne reste qu'en guise de solution de repli de compatibilité pour les plugins plus anciens.
- Les métadonnées des variables d'environnement (`setup.providers[].envVars`, `providerAuthEnvVars` obsolète, et `channelEnvVars`) sont purement déclaratives. Le statut, l'audit, la validation de la livraison cron et autres surfaces en lecture seule appliquent toujours la confiance du plugin et la politique d'activation effective avant de traiter une variable d'environnement comme configurée.
- Pour les métadonnées de l'assistant d'exécution qui nécessitent du code de provider, consultez [Provider runtime hooks](/fr/plugins/architecture-internals#provider-runtime-hooks).
- Si votre plugin dépend de modules natifs, documentez les étapes de construction et toutes les exigences de liste autorisée du gestionnaire de paquets (par exemple, pnpm `allow-build-scripts` + `pnpm rebuild <package>`).

## Connexes

<CardGroup cols={3}>
  <Card title="Building plugins" href="/fr/plugins/building-plugins" icon="rocket">
    Getting started with plugins.
  </Card>
  <Card title="Plugin architecture" href="/fr/plugins/architecture" icon="diagram-project">
    Internal architecture and capability model.
  </Card>
  <Card title="Vue d'ensemble du SDK" href="/fr/plugins/sdk-overview" icon="book">
    Référence du SDK de plugin et importations de sous-chemins.
  </Card>
</CardGroup>
