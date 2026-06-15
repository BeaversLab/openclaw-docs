---
summary: "Manifest du plugin + exigences du schéma JSON (validation de configuration stricte)"
read_when:
  - You are building an OpenClaw plugin
  - You need to ship a plugin config schema or debug plugin validation errors
title: "Manifest du plugin"
---

Cette page concerne uniquement le **manifeste du plugin natif OpenClaw**.

Pour les dispositions de bundle compatibles, voir [Plugin bundles](/fr/plugins/bundles).

Les formats de bundle compatibles utilisent des fichiers manifeste différents :

- Bundle Codex : `.codex-plugin/plugin.json`
- Bundle Claude : `.claude-plugin/plugin.json` ou la disposition du composant Claude par défaut
  sans manifeste
- Bundle Cursor : `.cursor-plugin/plugin.json`

OpenClaw détecte également automatiquement ces dispositions de bundle, mais elles ne sont pas validées
par rapport au schéma `openclaw.plugin.json` décrit ici.

Pour les bundles compatibles, OpenClaw lit actuellement les métadonnées du bundle ainsi que les racines de compétences déclarées,
les racines de commandes Claude, les valeurs par défaut du `settings.json` du bundle Claude,
les valeurs par défaut du LSP du bundle Claude et les packs de hooks pris en charge lorsque la disposition correspond
aux attentes du runtime OpenClaw.

Chaque plugin natif OpenClaw **doit** inclure un fichier `openclaw.plugin.json` dans la
**racine du plugin**. OpenClaw utilise ce manifeste pour valider la configuration
**sans exécuter le code du plugin**. Les manifestes manquants ou invalides sont traités comme
des erreurs de plugin et bloquent la validation de la configuration.

Voir le guide complet du système de plugins : [Plugins](/fr/tools/plugin).
Pour le modèle de capacité natif et les conseils actuels de compatibilité externe :
[Capability model](/fr/plugins/architecture#public-capability-model).

## Que fait ce fichier

`openclaw.plugin.json` est constitué des métadonnées que OpenClaw lit **avant de charger votre
code de plugin**. Tout ce qui suit doit être suffisamment léger pour être inspecté sans démarrer
le runtime du plugin.

**Utilisez-le pour :**

- l'identité du plugin, la validation de la configuration et les indications pour l'interface de configuration
- les métadonnées d'authentification, d'intégration et de configuration (alias, activation automatique, env vars du provider, choix d'authentification)
- les indications d'activation pour les surfaces du plan de contrôle
- la propriété abrégée de famille de modèles
- instantanés statiques de la propriété des capacités (`contracts`)
- métadonnées du runner QA que l'hôte partagé `openclaw qa` peut inspecter
- les métadonnées de configuration spécifiques au canal fusionnées dans le catalogue et les surfaces de validation

**Ne l'utilisez pas pour :** enregistrer le comportement d'exécution, déclarer des points d'entrée de code,
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
  "setup": {
    "providers": [
      {
        "id": "openrouter",
        "envVars": ["OPENROUTER_API_KEY"]
      }
    ]
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

| Champ                                | Obligatoire | Type                             | Signification                                                                                                                                                                                                                                                                                                                                                           |
| ------------------------------------ | ----------- | -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`                                 | Oui         | `string`                         | Identifiant canonique du plugin. C'est l'identifiant utilisé dans `plugins.entries.<id>`.                                                                                                                                                                                                                                                                               |
| `configSchema`                       | Oui         | `object`                         | Schéma JSON en ligne pour la configuration de ce plugin.                                                                                                                                                                                                                                                                                                                |
| `requiresPlugins`                    | Non         | `string[]`                       | Identifiants de plugins qui doivent également être installés pour que ce plugin soit efficace. Discovery maintient le plugin chargeable mais avertit lorsqu'un plugin requis est manquant.                                                                                                                                                                              |
| `enabledByDefault`                   | Non         | `true`                           | Marque un plugin groupé comme activé par défaut. Omettez-le ou définissez une valeur autre que `true` pour laisser le plugin désactivé par défaut.                                                                                                                                                                                                                      |
| `enabledByDefaultOnPlatforms`        | Non         | `string[]`                       | Marque un plugin groupé comme activé par défaut uniquement sur les plateformes Node.js listées, par exemple `["darwin"]`. La configuration explicite l'emporte.                                                                                                                                                                                                         |
| `legacyPluginIds`                    | Non         | `string[]`                       | Identifiants hérités qui sont normalisés vers cet identifiant de plugin canonique.                                                                                                                                                                                                                                                                                      |
| `autoEnableWhenConfiguredProviders`  | Non         | `string[]`                       | Identifiants de provider qui doivent activer automatiquement ce plugin lorsque l'authentification, la configuration ou les références de modèle les mentionnent.                                                                                                                                                                                                        |
| `kind`                               | Non         | `"memory"` \| `"context-engine"` | Déclare un type de plugin exclusif utilisé par `plugins.slots.*`.                                                                                                                                                                                                                                                                                                       |
| `channels`                           | Non         | `string[]`                       | Identifiants de canal détenus par ce plugin. Utilisés pour la découverte et la validation de la configuration.                                                                                                                                                                                                                                                          |
| `providers`                          | Non         | `string[]`                       | Identifiants de provider détenus par ce plugin.                                                                                                                                                                                                                                                                                                                         |
| `providerCatalogEntry`               | Non         | `string`                         | Chemin de module de catalogue de provider léger, relatif à la racine du plugin, pour les métadonnées de catalogue de provider limitées au manifeste qui peuvent être chargées sans activer l'environnement d'exécution complet du plugin.                                                                                                                               |
| `modelSupport`                       | Non         | `object`                         | Métadonnées abrégées de famille de modèle détenues par le manifeste, utilisées pour charger automatiquement le plugin avant l'exécution.                                                                                                                                                                                                                                |
| `modelCatalog`                       | Non         | `object`                         | Métadonnées de catalogue de modèles déclaratifs pour les providers possédés par ce plugin. Il s'agit du contrat du plan de contrôle pour le listing en lecture seule, l'intégration (onboarding), les sélecteurs de modèles, les alias et la suppression futurs, sans charger le runtime du plugin.                                                                     |
| `modelPricing`                       | Non         | `object`                         | Stratégie de recherche de tarification externe possédée par le provider. Utilisez-la pour exclure les providers locaux/auto-hébergés des catalogues de tarification distants ou pour mapper les références de provider aux identifiants de catalogue OpenRouter/LiteLLM sans coder en dur les identifiants de provider dans le cœur.                                    |
| `modelIdNormalization`               | Non         | `object`                         | Nettoyage des alias/préfixes d'identifiants de modèles possédé par le provider, qui doit s'exécuter avant le chargement du runtime du provider.                                                                                                                                                                                                                         |
| `providerEndpoints`                  | Non         | `object[]`                       | Métadonnées d'hôte/baseUrl de point de terminaison possédées par le manifeste pour les routes de provider que le cœur doit classer avant le chargement du runtime du provider.                                                                                                                                                                                          |
| `providerRequest`                    | Non         | `object`                         | Métadonnées de famille de provider et de compatibilité des requêtes à faible coût utilisées par la stratégie de requête générique avant le chargement du runtime du provider.                                                                                                                                                                                           |
| `secretProviderIntegrations`         | Non         | `Record<string, object>`         | Préréglages déclaratifs du fournisseur d'exécution SecretRef que les interfaces de configuration ou d'installation peuvent offrir sans coder en dur les intégrations spécifiques au fournisseur dans le cœur.                                                                                                                                                           |
| `cliBackends`                        | Non         | `string[]`                       | Identifiants de backend d'inférence CLI détenus par ce plugin. Utilisés pour l'auto-activation au démarrage à partir de références de configuration explicites.                                                                                                                                                                                                         |
| `syntheticAuthRefs`                  | Non         | `string[]`                       | Références de backend de fournisseur ou de CLI dont le hook d'authentification synthétique propriétaire du plugin doit être sondé lors de la découverte à froid de modèles avant le chargement de l'exécution.                                                                                                                                                          |
| `nonSecretAuthMarkers`               | Non         | `string[]`                       | Valeurs de clé d'API d'espace réservé appartenant au plugin groupé qui représentent un état d'identification local, OAuth ou ambiant non secret.                                                                                                                                                                                                                        |
| `commandAliases`                     | Non         | `object[]`                       | Noms de commandes appartenant à ce plugin qui doivent produire une configuration et des diagnostics CLI conscients du plugin avant le chargement de l'exécution.                                                                                                                                                                                                        |
| `providerAuthEnvVars`                | Non         | `Record<string, string[]>`       | Métadonnées d'environnement de compatibilité obsolètes pour la recherche d'authentification/état du provider. Préférez `setup.providers[].envVars` pour les nouveaux plugins ; OpenClaw lit encore ceci pendant la période d'obsolescence.                                                                                                                              |
| `providerAuthAliases`                | Non         | `Record<string, string>`         | Identifiants de provider qui doivent réutiliser un autre identifiant de provider pour la recherche d'authentification, par exemple un provider de codage qui partage la clé d'API du provider de base et les profils d'authentification.                                                                                                                                |
| `channelEnvVars`                     | Non         | `Record<string, string[]>`       | Métadonnées d'environnement de canal peu coûteuses que OpenClaw peut inspecter sans charger le code du plugin. Utilisez ceci pour la configuration de canal pilotée par l'environnement ou les surfaces d'authentification que les assistants génériques de démarrage/configuration devraient voir.                                                                     |
| `providerAuthChoices`                | Non         | `object[]`                       | Métadonnées de choix d'authentification peu coûteuses pour les sélecteurs d'onboarding, la résolution de provider préféré et le câblage simple des indicateurs CLI.                                                                                                                                                                                                     |
| `activation`                         | Non         | `object`                         | Métadonnées du planificateur d'activation peu coûteuses pour le démarrage, le provider, la commande, le canal, l'itinéraire et le chargement déclenché par les capacités. Métadonnées uniquement ; l'exécution du plugin possède toujours le comportement réel.                                                                                                         |
| `setup`                              | Non         | `object`                         | Descripteurs de configuration/onboarding peu coûteux que les surfaces de découverte et de configuration peuvent inspecter sans charger l'exécution du plugin.                                                                                                                                                                                                           |
| `qaRunners`                          | Non         | `object[]`                       | Descripteurs de runner QA peu coûteux utilisés par l'hôte partagé `openclaw qa` avant le chargement de l'exécution du plugin.                                                                                                                                                                                                                                           |
| `contracts`                          | Non         | `object`                         | Instantané statique de la propriété des capacités pour les hooks d'authentification externes, les embeddings, la reconnaissance vocale, la transcription en temps réel, la voix en temps réel, la compréhension multimédia, la génération d'images, la génération de musique, la génération de vidéo, la récupération web, la recherche web et la propriété des outils. |
| `mediaUnderstandingProviderMetadata` | Non         | `Record<string, object>`         | Valeurs par défaut économiques pour la compréhension multimédia pour les ids de provider déclarés dans `contracts.mediaUnderstandingProviders`.                                                                                                                                                                                                                         |
| `imageGenerationProviderMetadata`    | Non         | `Record<string, object>`         | Métadonnées d'authentification économiques pour la génération d'images pour les ids de provider déclarés dans `contracts.imageGenerationProviders`, y compris les alias d'authentification possédés par le provider et les gardes d'URL de base.                                                                                                                        |
| `videoGenerationProviderMetadata`    | Non         | `Record<string, object>`         | Métadonnées d'authentification économiques pour la génération de vidéo pour les ids de provider déclarés dans `contracts.videoGenerationProviders`, y compris les alias d'authentification possédés par le provider et les gardes d'URL de base.                                                                                                                        |
| `musicGenerationProviderMetadata`    | Non         | `Record<string, object>`         | Métadonnées d'authentification économiques pour la génération de musique pour les ids de provider déclarés dans `contracts.musicGenerationProviders`, y compris les alias d'authentification possédés par le provider et les gardes d'URL de base.                                                                                                                      |
| `toolMetadata`                       | Non         | `Record<string, object>`         | Métadonnées de disponibilité économiques pour les outils possédés par le plugin déclarés dans `contracts.tools`. À utiliser lorsqu'un outil ne doit pas charger le runtime sauf si une configuration, une variable d'environnement ou une preuve d'authentification existe.                                                                                             |
| `channelConfigs`                     | Non         | `Record<string, object>`         | Métadonnées de configuration de canal possédées par le manifeste, fusionnées dans les surfaces de découverte et de validation avant le chargement du runtime.                                                                                                                                                                                                           |
| `skills`                             | Non         | `string[]`                       | Répertoires de compétences à charger, relatifs à la racine du plugin.                                                                                                                                                                                                                                                                                                   |
| `name`                               | Non         | `string`                         | Nom du plugin lisible par l'homme.                                                                                                                                                                                                                                                                                                                                      |
| `description`                        | Non         | `string`                         | Résumé court affiché dans les surfaces du plugin.                                                                                                                                                                                                                                                                                                                       |
| `version`                            | Non         | `string`                         | Version informative du plugin.                                                                                                                                                                                                                                                                                                                                          |
| `uiHints`                            | Non         | `Record<string, object>`         | Étiquettes d'interface utilisateur, espaces réservés et indices de sensibilité pour les champs de configuration.                                                                                                                                                                                                                                                        |

## Référence des métadonnées du provider de génération

Les champs de métadonnées du fournisseur de génération décrivent des signaux d'auth statiques pour les providers déclarés dans la liste `contracts.*GenerationProviders`OpenClaw correspondante. OpenClaw lit ces champs avant le chargement du runtime du provider afin que les outils principaux puissent décider si un fournisseur de génération est disponible sans importer chaque plugin de provider.

Utilisez ces champs uniquement pour des faits déclaratifs peu coûteux. Le transport, les transformations de requêtes, l'actualisation des jetons, la validation des informations d'identification et le comportement de génération réel restent dans le runtime du plugin.

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

| Champ                  | Obligatoire | Type       | Signification                                                                                                                                                                                             |
| ---------------------- | ----------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `aliases`              | Non         | `string[]` | ID de fournisseurs supplémentaires qui doivent être considérés comme des alias d'auth statique pour le fournisseur de génération.                                                                         |
| `authProviders`        | Non         | `string[]` | ID de fournisseurs dont les profils d'auth configurés doivent être comptés comme une auth pour ce fournisseur de génération.                                                                              |
| `configSignals`        | Non         | `object[]` | Signaux de disponibilité basés uniquement sur la configuration et peu coûteux pour les fournisseurs locaux ou auto-hébergés qui peuvent être configurés sans profils d'auth ou variables d'environnement. |
| `authSignals`          | Non         | `object[]` | Signaux d'auth explicites. Lorsqu'ils sont présents, ils remplacent l'ensemble de signaux par défaut provenant de l'ID du provider, de `aliases` et de `authProviders`.                                   |
| `referenceAudioInputs` | Non         | `boolean`  | Génération vidéo uniquement. Définissez sur `true` lorsque le provider accepte des ressources audio de référence ; sinon, `video_generate` masque les paramètres de référence audio.                      |

Chaque entrée `configSignals` prend en charge :

| Champ            | Obligatoire | Type       | Signification                                                                                                                                                                                                                               |
| ---------------- | ----------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `rootPath`       | Oui         | `string`   | Chemin pointé vers l'objet de configuration propriétaire du plugin à inspecter, par exemple `plugins.entries.example.config`.                                                                                                               |
| `overlayPath`    | Non         | `string`   | Chemin pointé à l'intérieur de la configuration racine dont l'objet doit se superposer à l'objet racine avant l'évaluation du signal. Utilisez ceci pour une configuration spécifique à une capacité telle que `image`, `video` ou `music`. |
| `overlayMapPath` | Non         | `string`   | Chemin pointé à l'intérieur de la config racine dont les valeurs d'objet doivent chacune recouvrir l'objet racine. Utilisez ceci pour les cartes de comptes nommés telles que `accounts`, où tout compte configuré doit être éligible.      |
| `required`       | Non         | `string[]` | Chemins pointés à l'intérieur de la config effective qui doivent avoir des valeurs configurées. Les chaînes ne doivent pas être vides ; les objets et les tableaux ne doivent pas être vides.                                               |
| `requiredAny`    | Non         | `string[]` | Chemins pointés à l'intérieur de la config effective où au moins l'un d'eux doit avoir une valeur configurée.                                                                                                                               |
| `mode`           | Non         | `object`   | Garde de mode de chaîne optionnel à l'intérieur de la config effective. Utilisez ceci lorsque la disponibilité en configuration unique s'applique à un seul mode.                                                                           |

Chaque garde `mode` prend en charge :

| Champ        | Requis | Type       | Signification                                                                         |
| ------------ | ------ | ---------- | ------------------------------------------------------------------------------------- |
| `path`       | Non    | `string`   | Chemin pointé à l'intérieur de la config effective. Par défaut `mode`.                |
| `default`    | Non    | `string`   | Valeur de mode à utiliser lorsque la config omet le chemin.                           |
| `allowed`    | Non    | `string[]` | Si présent, le signal ne passe que lorsque le mode effectif est l'une de ces valeurs. |
| `disallowed` | Non    | `string[]` | Si présent, le signal échoue lorsque le mode effectif est l'une de ces valeurs.       |

Chaque entrée `authSignals` prend en charge :

| Champ             | Requis | Type     | Signification                                                                                                                                                                                                 |
| ----------------- | ------ | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `provider`        | Oui    | `string` | Id du fournisseur à vérifier dans les profils d'auth configurés.                                                                                                                                              |
| `providerBaseUrl` | Non    | `object` | Garde optionnel qui fait compter le signal uniquement lorsque le fournisseur configuré référencé utilise une URL de base autorisée. Utilisez ceci lorsqu'un alias d'auth n'est valide que pour certaines API. |

Chaque `providerBaseUrl` guard prend en charge :

| Champ             | Obligatoire | Type       | Signification                                                                                                                                                            |
| ----------------- | ----------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `provider`        | Oui         | `string`   | ID de la config du provider dont le `baseUrl` doit être vérifié.                                                                                                         |
| `defaultBaseUrl`  | Non         | `string`   | URL de base à supposer lorsque la config du provider omet `baseUrl`.                                                                                                     |
| `allowedBaseUrls` | Oui         | `string[]` | URLs de base autorisées pour ce signal d'auth. Le signal est ignoré lorsque l'URL de base configurée ou par défaut ne correspond pas à l'une de ces valeurs normalisées. |

## Référence des métadonnées de tool

`toolMetadata` utilise les mêmes formes `configSignals` et `authSignals` que
les métadonnées du provider de génération, indexées par le nom du tool. `contracts.tools` déclare
la propriété. `toolMetadata` déclare une preuve de disponibilité peu coûteuse afin que OpenClaw puisse
éviter d'importer un runtime de plugin simplement pour que sa fabrique de tools renvoie `null`.

```json
{
  "setup": {
    "providers": [
      {
        "id": "example",
        "envVars": ["EXAMPLE_API_KEY"]
      }
    ]
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

Si un tool n'a pas de `toolMetadata`, OpenClaw conserve le comportement existant et
charge le plugin propriétaire lorsque le contrat du tool correspond à la stratégie. Pour les tools
sur le chemin critique dont la fabrique dépend de l'auth/config, les auteurs de plugins doivent déclarer
`toolMetadata` au lieu de faire importer le runtime par le cœur pour le demander.

## Référence providerAuthChoices

Chaque entrée `providerAuthChoices` décrit un choix d'onboarding ou d'auth.
OpenClaw lit ceci avant le chargement du runtime du provider.
Les listes de configuration du provider utilisent ces choix de manifeste, les choix de configuration
dérivés du descripteur et les métadonnées du catalogue d'installation sans charger le runtime du provider.

| Champ                 | Obligatoire | Type                                                                  | Signification                                                                                                                |
| --------------------- | ----------- | --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `provider`            | Oui         | `string`                                                              | ID du provider auquel ce choix appartient.                                                                                   |
| `method`              | Oui         | `string`                                                              | ID de la méthode d'auth vers laquelle dispatcher.                                                                            |
| `choiceId`            | Oui         | `string`                                                              | ID stable de choix d'auth utilisé par les flux d'onboarding et de CLI.                                                       |
| `choiceLabel`         | Non         | `string`                                                              | Libellé visible par l'utilisateur. Si omis, OpenClaw revient à OpenClaw`choiceId`.                                           |
| `choiceHint`          | Non         | `string`                                                              | Texte d'aide court pour le sélecteur.                                                                                        |
| `assistantPriority`   | Non         | `number`                                                              | Les valeurs les plus faibles sont triées en premier dans les sélecteurs interactifs pilotés par l'assistant.                 |
| `assistantVisibility` | Non         | `"visible"` \| `"manual-only"`                                        | Masquer le choix dans les sélecteurs d'assistant tout en permettant toujours la sélection manuelle via CLI.                  |
| `deprecatedChoiceIds` | Non         | `string[]`                                                            | Identifiants de choix hérités qui doivent rediriger les utilisateurs vers ce choix de remplacement.                          |
| `groupId`             | Non         | `string`                                                              | Identifiant de groupe facultatif pour regrouper les choix connexes.                                                          |
| `groupLabel`          | Non         | `string`                                                              | Libellé visible par l'utilisateur pour ce groupe.                                                                            |
| `groupHint`           | Non         | `string`                                                              | Texte d'aide court pour le groupe.                                                                                           |
| `optionKey`           | Non         | `string`                                                              | Clé d'option interne pour les flux d'authentification simple à un indicateur.                                                |
| `cliFlag`             | Non         | `string`                                                              | Nom de l'indicateur CLI, tel que CLI`--openrouter-api-key`.                                                                  |
| `cliOption`           | Non         | `string`                                                              | Forme complète de l'option CLI, telle que CLI`--openrouter-api-key <key>`.                                                   |
| `cliDescription`      | Non         | `string`                                                              | Description utilisée dans l'aide CLI.                                                                                        |
| `onboardingScopes`    | Non         | `Array<"text-inference" \| "image-generation" \| "music-generation">` | Surfaces d'intégration (onboarding) dans lesquelles ce choix doit apparaître. Si omis, il par défaut à `["text-inference"]`. |

## référence commandAliases

Utilisez `commandAliases` lorsqu'un plugin possède un nom de commande d'exécution que les utilisateurs peuvent
mettre par erreur dans `plugins.allow`CLIOpenClaw ou essayer d'exécuter en tant que commande racine CLI. OpenClau
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

| Champ        | Requis | Type              | Signification                                                                         |
| ------------ | ------ | ----------------- | ------------------------------------------------------------------------------------- |
| `name`       | Oui    | `string`          | Nom de la commande qui appartient à ce plugin.                                        |
| `kind`       | Non    | `"runtime-slash"` | Indique que l'alias est une commande slash de chat plutôt qu'une commande racine CLI. |
| `cliCommand` | Non    | `string`          | Commande racine CLI connexe à suggérer pour les opérations CLI, si elle existe.       |

## référence d'activation

Utilisez `activation` lorsque le plugin peut facilement déclarer quels événements du plan de contrôle
doivent l'inclure dans un plan d'activation/chargement.

Ce bloc est des métadonnées de planificateur, et non une API de cycle de vie. Il n'enregistre pas
le comportement d'exécution, ne remplace pas `register(...)` et ne garantit pas que
le code du plugin a déjà été exécuté. Le planificateur d'activation utilise ces champs pour
réduire les plugins candidats avant de revenir aux métadonnées de propriété du manifeste existantes
telles que `providers`, `channels`, `commandAliases`, `setup.providers`,
`contracts.tools` et les hooks.

Préférez les métadonnées les plus étroites qui décrivent déjà la propriété. Utilisez
`providers`, `channels`, `commandAliases`, les descripteurs de configuration ou `contracts`
lorsque ces champs expriment la relation. Utilisez `activation` pour des indices supplémentaires du planificateur
qui ne peuvent pas être représentés par ces champs de propriété.
Utilisez `cliBackends` de niveau supérieur pour les alias d'exécution CLI tels que `claude-cli`,
`my-cli` ou `google-gemini-cli` ; `activation.onAgentHarnesses` est uniquement pour
les identifiants de harnais d'agent intégré qui n'ont pas déjà de champ de propriété.

Ce bloc contient uniquement des métadonnées. Il n'enregistre pas le comportement d'exécution et ne remplace pas
`register(...)`, `setupEntry` ou d'autres points d'entrée d'exécution/plugin.
Les consommateurs actuels l'utilisent comme un indice de réduction avant le chargement plus large des plugins, donc
l'absence de métadonnées d'activation hors démarrage ne coûte généralement que des performances ; elle
ne devrait pas changer la correction tant que les solutions de repli de propriété du manifeste existent encore.

Chaque plugin doit définir `activation.onStartup` intentionnellement. Définissez-le sur `true`
uniquement lorsque le plugin doit s'exécuter lors du démarrage de la Gateway. Définissez-le sur `false` lorsque
le plugin est inactif au démarrage et ne doit être chargé que par des déclencheurs plus restreints.
L'omission de `onStartup` ne charge plus implicitement le plugin au démarrage ; utilisez des métadonnées
d'activation explicites pour le démarrage, le channel, la configuration, le harnais d'agent (agent-harness), la mémoire ou
d'autres déclencheurs d'activation plus restreints.

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

| Champ              | Obligatoire | Type                                                 | Signification                                                                                                                                                                                                                                                             |
| ------------------ | ----------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `onStartup`        | Non         | `boolean`                                            | Activation explicite au démarrage de la Gateway. Chaque plugin doit définir cette valeur. `true` importe le plugin lors du démarrage ; `false` le garde en mode différé au démarrage (startup-lazy), sauf si un autre déclencheur correspondant nécessite son chargement. |
| `onProviders`      | Non         | `string[]`                                           | Identifiants de fournisseurs qui doivent inclure ce plugin dans les plans d'activation/chargement.                                                                                                                                                                        |
| `onAgentHarnesses` | Non         | `string[]`                                           | Identifiants du runtime du harnais d'agent intégré qui doivent inclure ce plugin dans les plans d'activation/chargement. Utilisez `cliBackends` de premier niveau pour les alias du backend CLI.                                                                          |
| `onCommands`       | Non         | `string[]`                                           | Identifiants de commandes qui doivent inclure ce plugin dans les plans d'activation/chargement.                                                                                                                                                                           |
| `onChannels`       | Non         | `string[]`                                           | Identifiants de canaux qui doivent inclure ce plugin dans les plans d'activation/chargement.                                                                                                                                                                              |
| `onRoutes`         | Non         | `string[]`                                           | Types de routes qui doivent inclure ce plugin dans les plans d'activation/chargement.                                                                                                                                                                                     |
| `onConfigPaths`    | Non         | `string[]`                                           | Chemins de configuration relatifs à la racine qui doivent inclure ce plugin dans les plans de démarrage/chargement lorsque le chemin est présent et n'est pas explicitement désactivé.                                                                                    |
| `onCapabilities`   | Non         | `Array<"provider" \| "channel" \| "tool" \| "hook">` | Indicateurs larges de capacités utilisés par la planification de l'activation du plan de contrôle. Préférez les champs plus restreints lorsque cela est possible.                                                                                                         |

Consommateurs actifs actuels :

- La planification du démarrage de la Gateway utilise `activation.onStartup` pour une importation
  explicite au démarrage
- la planification CLI déclenchée par commande revient à l'ancien
  CLI`commandAliases[].cliCommand` ou `commandAliases[].name`
- la planification du démarrage agent-runtime utilise `activation.onAgentHarnesses` pour
  les faisceaux intégrés et `cliBackends[]`CLI de premier niveau pour les alias d'exécution CLI
- la planification de configuration/canal déclenchée par le canal revient à l'ancienne `channels[]`
  en l'absence de métadonnées explicites d'activation du canal
- la planification des plugins de démarrage utilise `activation.onConfigPaths` pour les surfaces de configuration racine
  hors canal, telles que le bloc `browser` du plugin de navigateur groupé
- la planification de configuration/exécution déclenchée par le fournisseur revient à l'ancien
  `providers[]` et à la propriété `cliBackends[]` de premier niveau lorsque les métadonnées
  d'activation explicites du fournisseur sont manquantes

Les diagnostics du planificateur peuvent distinguer les indices d'activation explicite de la
repli vers la propriété du manifeste. Par exemple, `activation-command-hint` signifie
que `activation.onCommands` a correspondu, tandis que `manifest-command-alias` signifie que le
planificateur a plutôt utilisé la propriété `commandAliases`. Ces étiquettes de raison sont destinées
aux diagnostics et tests de l'hôte ; les auteurs de plugins doivent continuer à déclarer les métadonnées
qui décrivent le mieux la propriété.

## référence qaRunners

Utilisez `qaRunners` lorsqu'un plugin contribue avec un ou plusieurs runners de transport sous
la racine `openclaw qa`CLI partagée. Gardez ces métadonnées peu coûteuses et statiques ; l'exécution
du plugin possède toujours l'inscription CLI réelle via une surface `runtime-api.ts` légère
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

| Champ         | Obligatoire | Type     | Signification                                                                         |
| ------------- | ----------- | -------- | ------------------------------------------------------------------------------------- |
| `commandName` | Oui         | `string` | Sous-commande montée sous `openclaw qa`, par exemple `matrix`.                        |
| `description` | Non         | `string` | Texte d'aide de repli utilisé lorsque l'hôte partagé a besoin d'une commande fictive. |

## référence setup

Utilisez `setup` lorsque les surfaces de configuration et d'intégration ont besoin de métadonnées
appartenant au plugin et peu coûteuses avant le chargement de l'exécution.

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

Le `cliBackends`CLI de premier niveau reste valide et continue à décrire les backend d'inférence CLI. `setup.cliBackends` est la surface du descripteur spécifique à la configuration pour les flux de plan de contrôle/configuration qui doivent rester uniquement des métadonnées.

Lorsqu'ils sont présents, `setup.providers` et `setup.cliBackends` sont la surface de recherche privilégiée basée sur le descripteur pour la découverte de la configuration. Si le descripteur ne fait que restreindre le plugin candidat et que la configuration nécessite encore des hooks d'exécution plus riches au moment de la configuration, définissez `requiresRuntime: true` et gardez `setup-api` en place comme chemin d'exécution de secours.

OpenClaw inclut également OpenClaw`setup.providers[].envVars` dans les recherches d'authentification et de variables d'environnement génériques du provider. `providerAuthEnvVars` reste pris en charge via un adaptateur de compatibilité pendant la période de dépréciation, mais les plugins non groupés qui l'utilisent encore reçoivent un diagnostic de manifeste. Les nouveaux plugins doivent placer les métadonnées d'environnement de configuration/statut sur `setup.providers[].envVars`.

OpenClaw peut également dériver des choix de configuration simples à partir de OpenClaw`setup.providers[].authMethods` lorsqu aucune entrée de configuration n'est disponible, ou lorsque `setup.requiresRuntime: false` déclare l'exécution de la configuration inutile. Les entrées explicites `providerAuthChoices`CLI restent privilégiées pour les étiquettes personnalisées, les drapeaux CLI, la portée de l'onboarding et les métadonnées de l'assistant.

Définissez `requiresRuntime: false`OpenClaw uniquement lorsque ces descripteurs sont suffisants pour la surface de configuration. OpenClaw traite `false` explicite comme un contrat de descripteur uniquement et n'exécutera pas `setup-api` ou `openclaw.setupEntry`OpenClaw pour la recherche de configuration. Si un plugin basé uniquement sur des descripteurs expédie toujours l'une de ces entrées d'exécution de configuration, OpenClaw signale un diagnostic additif et continue à l'ignorer. L'omission de `requiresRuntime` conserve le comportement de repli hérité afin que les plugins existants qui ont ajouté des descripteurs sans le drapeau ne se brisent pas.

Étant donné que la recherche de configuration (setup lookup) peut exécuter du code `setup-api` appartenant au plugin, les valeurs `setup.providers[].id` et `setup.cliBackends[]` normalisées doivent rester uniques parmi les plugins découverts. Une propriété ambiguë échoue systématiquement au lieu de sélectionner un gagnant selon l'ordre de découverte.

Lorsque le runtime de configuration s'exécute, les diagnostics du registre de configuration signalent une dérive des descripteurs si `setup-api` enregistre un provider ou un backend CLI que les descripteurs du manifeste ne déclarent pas, ou si un descripteur n'a pas d'enregistrement de runtime correspondant. Ces diagnostics sont cumulatifs et ne rejettent pas les plugins hérités.

### Référence de setup.providers

| Champ          | Obligatoire | Type       | Signification                                                                                                                              |
| -------------- | ----------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `id`           | Oui         | `string`   | Identifiant du provider exposé lors de la configuration ou de l'onboarding. Gardez les identifiants normalisés globalement uniques.        |
| `authMethods`  | Non         | `string[]` | Identifiants des méthodes de configuration/authentification que ce provider prend en charge sans charger le runtime complet.               |
| `envVars`      | Non         | `string[]` | Variables d'environnement que les interfaces génériques de configuration/état peuvent vérifier avant le chargement du runtime du plugin.   |
| `authEvidence` | Non         | `object[]` | Vérifications locales peu coûteuses de preuves d'authentification pour les providers pouvant s'authentifier via des marqueurs non secrets. |

`authEvidence` est destiné aux marqueurs d'identification locaux appartenant au provider qui peuvent être vérifiés sans charger de code runtime. Ces vérifications doivent rester peu coûteuses et locales : aucun appel réseau, aucune lecture de trousseau ou de gestionnaire de secrets, aucune commande shell, et aucune sonde d'API du provider.

Entrées de preuves prises en charge :

| Champ              | Obligatoire | Type       | Signification                                                                                                                                  |
| ------------------ | ----------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `type`             | Oui         | `string`   | Actuellement `local-file-with-env`.                                                                                                            |
| `fileEnvVar`       | Non         | `string`   | Variable d'environnement contenant un chemin explicite vers un fichier d'identification.                                                       |
| `fallbackPaths`    | Non         | `string[]` | Chemins locaux vers les fichiers d'identification vérifiés lorsque `fileEnvVar` est absent ou vide. Prend en charge `${HOME}` et `${APPDATA}`. |
| `requiresAnyEnv`   | Non         | `string[]` | Au moins une variable d'environnement listée doit être non vide pour que la preuve soit valide.                                                |
| `requiresAllEnv`   | Non         | `string[]` | Chaque variable d'environnement listée doit être non vide pour que la preuve soit valide.                                                      |
| `credentialMarker` | Oui         | `string`   | Marqueur non secret renvoyé lorsque la preuve est présente.                                                                                    |
| `source`           | Non         | `string`   | Libellé de source visible par l'utilisateur pour la sortie d'authentification/état.                                                            |

### champs de configuration

| Champ              | Requis | Type       | Signification                                                                                                                                                                       |
| ------------------ | ------ | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `providers`        | Non    | `object[]` | Descripteurs de configuration du fournisseur exposés lors de la configuration et de l'intégration.                                                                                  |
| `cliBackends`      | Non    | `string[]` | Identifiants backend au moment de la configuration utilisés pour la recherche de configuration prioritaire par descripteur. Gardez les identifiants normalisés uniques globalement. |
| `configMigrations` | Non    | `string[]` | Identifiants de migration de configuration appartenant à la surface de configuration de ce plugin.                                                                                  |
| `requiresRuntime`  | Non    | `boolean`  | Indique si la configuration nécessite toujours l'exécution de `setup-api` après la recherche par descripteur.                                                                       |

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

| Champ         | Type       | Signification                                        |
| ------------- | ---------- | ---------------------------------------------------- |
| `label`       | `string`   | Libellé du champ visible par l'utilisateur.          |
| `help`        | `string`   | Texte d'aide court.                                  |
| `tags`        | `string[]` | Balises d'interface utilisateur optionnelles.        |
| `advanced`    | `boolean`  | Marque le champ comme avancé.                        |
| `sensitive`   | `boolean`  | Marque le champ comme secret ou sensible.            |
| `placeholder` | `string`   | Texte de remplacement pour les champs de formulaire. |

## référence des contrats

Utilisez `contracts` uniquement pour les métadonnées statiques de propriété des capacités que OpenClaw peut
lire sans importer le runtime du plugin.

```json
{
  "contracts": {
    "agentToolResultMiddleware": ["openclaw", "codex"],
    "externalAuthProviders": ["acme-ai"],
    "embeddingProviders": ["openai-compatible"],
    "speechProviders": ["openai"],
    "realtimeTranscriptionProviders": ["openai"],
    "realtimeVoiceProviders": ["openai"],
    "memoryEmbeddingProviders": ["local"],
    "mediaUnderstandingProviders": ["openai"],
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

Chaque liste est optionnelle :

| Champ                            | Type       | Signification                                                                                                                                            |
| -------------------------------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `embeddedExtensionFactories`     | `string[]` | Identifiants de fabrique d'extension Codex app-server, actuellement `codex-app-server`.                                                                  |
| `agentToolResultMiddleware`      | `string[]` | Identifiants d'exécution pour lesquels un plugin groupé peut enregistrer un intergiciel de résultats d'outil.                                            |
| `externalAuthProviders`          | `string[]` | Identifiants de provider dont le hook de profil d'authentification externe appartient à ce plugin.                                                       |
| `embeddingProviders`             | `string[]` | Identifiants de provider d'intégration généraux que ce plugin possède pour une utilisation réutilisable d'intégration vectorielle, y compris la mémoire. |
| `speechProviders`                | `string[]` | Identifiants de provider de synthèse vocale que ce plugin possède.                                                                                       |
| `realtimeTranscriptionProviders` | `string[]` | Identifiants de provider de transcription en temps réel que ce plugin possède.                                                                           |
| `realtimeVoiceProviders`         | `string[]` | Identifiants de provider de voix en temps réel que ce plugin possède.                                                                                    |
| `memoryEmbeddingProviders`       | `string[]` | Identifiants de provider d'intégration spécifiques à la mémoire obsolètes que ce plugin possède.                                                         |
| `mediaUnderstandingProviders`    | `string[]` | Identifiants de provider de compréhension multimédia que ce plugin possède.                                                                              |
| `transcriptSourceProviders`      | `string[]` | Identifiants de provider de source de transcription que ce plugin possède.                                                                               |
| `imageGenerationProviders`       | `string[]` | Identifiants de provider de génération d'images que ce plugin possède.                                                                                   |
| `videoGenerationProviders`       | `string[]` | Identifiants de provider de génération de vidéos que ce plugin possède.                                                                                  |
| `webFetchProviders`              | `string[]` | Identifiants de provider de récupération Web que ce plugin possède.                                                                                      |
| `webSearchProviders`             | `string[]` | Identifiants de provider de recherche Web que ce plugin possède.                                                                                         |
| `migrationProviders`             | `string[]` | Identifiants de provider d'importation que ce plugin possède pour `openclaw migrate`.                                                                    |
| `gatewayMethodDispatch`          | `string[]` | Droit réservé pour les routes HTTP de plugin authentifiées qui répartissent les méthodes Gateway en cours de processus.                                  |
| `tools`                          | `string[]` | Noms d'outils d'agent que ce plugin possède.                                                                                                             |

`contracts.embeddedExtensionFactories` est conservé pour les fabriques d'extensions uniquement serveur d'application Codex groupées. Les transformations de résultats d'outils groupées doivent déclarer `contracts.agentToolResultMiddleware` et s'enregistrer avec `api.registerAgentToolResultMiddleware(...)` à la place. Les plugins externes ne peuvent pas enregistrer de middleware de résultats d'outils car la couture peut réécrire la sortie de l'outil à haute confiance avant que le model ne la voie.

Les enregistrements d'exécution `api.registerTool(...)` doivent correspondre à `contracts.tools`. La découverte d'outils utilise cette liste pour charger uniquement les exécutions de plugin qui peuvent posséder les outils demandés.

Les plugins provider qui implémentent `resolveExternalAuthProfiles` doivent déclarer `contracts.externalAuthProviders` ; les hooks d'authentification externe non déclarés sont ignorés.

Les providers d'intégration généraux doivent déclarer `contracts.embeddingProviders` pour chaque adaptateur enregistré avec `api.registerEmbeddingProvider(...)`. Utilisez le contrat général pour la génération de vecteurs réutilisable, y compris les providers consommés par la recherche de mémoire. `contracts.memoryEmbeddingProviders` est une compatibilité spécifique à la mémoire déconseillée et ne reste que pendant que les providers existants migrent vers la couture du provider d'intégration générique.

`contracts.gatewayMethodDispatch` accepte actuellement `"authenticated-request"`APIGatewayGateway. Il s'agit d'une porte de contrôle d'hygiène de l'API pour les routes HTTP des plugins natifs qui distribuent intentionnellement des méthodes du plan de contrôle du Gateway en cours de processus, et non d'un bac à sable contre les plugins natifs malveillants. Utilisez-le uniquement pour les surfaces groupées/opérateur étroitement examinées qui nécessitent déjà une authentification HTTP du Gateway.

## Référence de mediaUnderstandingProviderMetadata

Utilisez `mediaUnderstandingProviderMetadata` lorsqu'un provider de compréhension de média possède des model par défaut, une priorité de repli d'authentification automatique ou une prise en charge native de documents dont les helpers principaux génériques ont besoin avant le chargement de l'exécution. Les clés doivent également être déclarées dans `contracts.mediaUnderstandingProviders`.

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

| Champ                  | Type                                | Signification                                                                                                         |
| ---------------------- | ----------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `capabilities`         | `("image" \| "audio" \| "video")[]` | Capacités multimédia exposées par ce provider.                                                                        |
| `defaultModels`        | `Record<string, string>`            | Valeurs par défaut de capacité vers model utilisées lorsque la configuration ne spécifie pas de model.                |
| `autoPriority`         | `Record<string, number>`            | Les nombres les plus bas sont triés en premier pour le basculement automatique du provider basé sur les identifiants. |
| `nativeDocumentInputs` | `"pdf"[]`                           | Entrées de document natives prises en charge par le provider.                                                         |

## Référence channelConfigs

Utilisez `channelConfigs` lorsqu'un plugin de channel a besoin de métadonnées de configuration bon marché avant le chargement du runtime. La découverte de la configuration/l'état du channel en lecture seule peut utiliser directement ces métadonnées pour les canaux externes configurés lorsqu'aucune entrée de configuration n'est disponible, ou lorsque `setup.requiresRuntime: false` déclare que le runtime de configuration est inutile.

`channelConfigs` sont des métadonnées de manifeste de plugin, et non une nouvelle section de configuration utilisateur de niveau supérieur. Les utilisateurs configurent toujours les instances de channel sous `channels.<channel-id>`. OpenClaw lit les métadonnées du manifeste pour décider quel plugin possède ce channel configuré avant l'exécution du code runtime du plugin.

Pour un plugin de channel, `configSchema` et `channelConfigs` décrivent différents chemins :

- `configSchema` valide `plugins.entries.<plugin-id>.config`
- `channelConfigs.<channel-id>.schema` valide `channels.<channel-id>`

Les plugins non regroupés qui déclarent `channels[]` doivent également déclarer des entrées `channelConfigs` correspondantes. Sans elles, OpenClaw peut toujours charger le plugin, mais le schéma de configuration à froid, la configuration et les surfaces de l'interface de contrôle ne peuvent pas connaître la forme de l_option détenue par le channel avant l'exécution du runtime du plugin.

`channelConfigs.<channel-id>.commands.nativeCommandsAutoEnabled` et `nativeSkillsAutoEnabled` peuvent déclarer des valeurs par défaut statiques `auto` pour les vérifications de configuration de commande qui s'exécutent avant le chargement du runtime du channel. Les can regroupés peuvent également publier les mêmes valeurs par défaut via `package.json#openclaw.channel.commands` aux côtés de leurs autres métadonnées de catalogue de channel détenues par le package.

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

Chaque entrée de channel peut inclure :

| Champ         | Type                     | Signification                                                                                                                                |
| ------------- | ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `schema`      | `object`                 | Schéma JSON pour `channels.<id>`. Requis pour chaque entrée de configuration de channel déclarée.                                            |
| `uiHints`     | `Record<string, object>` | Étiquettes d'interface utilisateur, espaces réservés et indications de sensibilité facultatifs pour cette section de configuration de canal. |
| `label`       | `string`                 | Étiquette de canal fusionnée dans les surfaces de sélecteur et d'inspection lorsque les métadonnées d'exécution ne sont pas prêtes.          |
| `description` | `string`                 | Courte description du canal pour les surfaces d'inspection et de catalogue.                                                                  |
| `commands`    | `object`                 | Valeurs par défaut automatiques des commandes natives et des compétences natives pour les vérifications de configuration avant exécution.    |
| `preferOver`  | `string[]`               | Identifiants de plugin hérités ou de priorité inférieure que ce canal doit surpasser dans les surfaces de sélection.                         |

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

Lorsque `channels.chat` est configuré, OpenClaw prend en compte à la fois l'identifiant du canal et l'identifiant du plugin préféré. Si le plugin de priorité inférieure n'a été sélectionné que parce qu'il est groupé ou activé par défaut, OpenClaw le désactive dans la configuration d'exécution effective afin qu'un seul plugin possède le canal et ses outils. La sélection explicite de l'utilisateur l'emporte toujours : si l'utilisateur active explicitement les deux plugins, OpenClaw préserve ce choix et signale des diagnostics de doublons de canal/outils au lieu de modifier silencieusement l'ensemble de plugins demandé.

Gardez `preferOver` limité aux identifiants de plugin qui peuvent réellement fournir le même canal. Ce n'est pas un champ de priorité général et il ne renomme pas les clés de configuration utilisateur.

## Référence de modelSupport

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
- `modelPatterns` bat `modelPrefixes`
- si un plugin non groupé et un plugin groupé correspondent tous les deux, le plugin non groupé
  l'emporte
- l'ambiguïté restante est ignorée jusqu'à ce que l'utilisateur ou la configuration spécifie un provider

Champs :

| Champ           | Type       | Signification                                                                                         |
| --------------- | ---------- | ----------------------------------------------------------------------------------------------------- |
| `modelPrefixes` | `string[]` | Préfixes correspondant à `startsWith` par rapport aux identifiants abrégés de model.                  |
| `modelPatterns` | `string[]` | Sources regex correspondant aux identifiants abrégés de model après suppression du suffixe de profil. |

Les entrées `modelPatterns` sont compilées via `compileSafeRegex`, qui rejette
les modèles contenant des répétitions imbriquées (par exemple `(a+)+$`). Les modèles qui échouent
à la vérification de sécurité sont ignorés silencieusement, comme le serait une regex syntaxiquement invalide.
Gardez les modèles simples et évitez les quantificateurs imbriqués.

## référence modelCatalog

Utilisez `modelCatalog` lorsque OpenClaw doit connaître les métadonnées du model de provider avant
le chargement du runtime du plugin. Il s'agit de la source détenue par le manifeste pour les lignes de
catalogue fixes, les alias de provider, les règles de suppression et le mode de découverte. L'actualisation
au runtime appartient toujours au code runtime du provider, mais le manifeste indique au cœur quand le runtime
est requis.

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

Champs de niveau supérieur :

| Champ            | Type                                                     | Signification                                                                                                                                            |
| ---------------- | -------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `providers`      | `Record<string, object>`                                 | Lignes de catalogue pour les identifiants de provider détenus par ce plugin. Les clés doivent également apparaître dans `providers` de niveau supérieur. |
| `aliases`        | `Record<string, object>`                                 | Alias de provider qui doivent résoudre vers un provider détenu pour la planification du catalogue ou de la suppression.                                  |
| `suppressions`   | `object[]`                                               | Lignes de model provenant d'une autre source que ce plugin supprime pour une raison spécifique au provider.                                              |
| `discovery`      | `Record<string, "static" \| "refreshable" \| "runtime">` | Indique si le catalogue du provider peut être lu à partir des métadonnées du manifeste, actualisé dans le cache, ou nécessite un runtime.                |
| `runtimeAugment` | `boolean`                                                | Définissez `true` uniquement lorsque le runtime du provider doit ajouter des lignes de catalogue après la planification du manifeste/config.             |

`aliases` participe à la recherche de propriétaire de provider pour la planification du catalogue de modèles.
Les cibles d'alias doivent être des providers de premier niveau appartenant au même plugin. Lorsqu'une
liste filtrée par provider utilise un alias, OpenClaw peut lire le manifeste propriétaire et
appliquer les remplacements d'alias API/URL de base sans charger le runtime du provider.
Les alias n'étendent pas les listes de catalogue non filtrées ; les listes larges émettent uniquement les
lignes du provider canonique propriétaire.

`suppressions` remplace l'ancien hook `suppressBuiltInModel` du runtime du provider.
Les entrées de suppression sont honorées uniquement lorsque le provider appartient au plugin ou
d'est déclaré comme une clé `modelCatalog.aliases` qui cible un provider détenu. Les hooks de
suppression du runtime ne sont plus appelés lors de la résolution du modèle.

Champs du provider :

| Champ     | Type                     | Signification                                                                       |
| --------- | ------------------------ | ----------------------------------------------------------------------------------- |
| `baseUrl` | `string`                 | URL de base par défaut facultative pour les modèles de ce catalogue de providers.   |
| `api`     | `ModelApi`               | Adaptateur API par défaut facultatif pour les modèles de ce catalogue de providers. |
| `headers` | `Record<string, string>` | En-têtes statiques facultatifs qui s'appliquent à ce catalogue de providers.        |
| `models`  | `object[]`               | Lignes de modèle requises. Les lignes sans `id` sont ignorées.                      |

Champs du modèle :

| Champ           | Type                                                           | Signification                                                                                                 |
| --------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `id`            | `string`                                                       | ID de modèle local au provider, sans le préfixe `provider/`.                                                  |
| `name`          | `string`                                                       | Nom d'affichage facultatif.                                                                                   |
| `api`           | `ModelApi`                                                     | Remplacement API par modèle facultatif.                                                                       |
| `baseUrl`       | `string`                                                       | Remplacement d'URL de base par modèle facultatif.                                                             |
| `headers`       | `Record<string, string>`                                       | En-têtes statiques par modèle facultatifs.                                                                    |
| `input`         | `Array<"text" \| "image" \| "document" \| "audio" \| "video">` | Modalités acceptées par le modèle.                                                                            |
| `reasoning`     | `boolean`                                                      | Indique si le modèle expose un comportement de raisonnement.                                                  |
| `contextWindow` | `number`                                                       | Fenêtre contextuelle native du provider.                                                                      |
| `contextTokens` | `number`                                                       | Limite effective optionnelle du contexte d'exécution lorsqu'elle diffère de `contextWindow`.                  |
| `maxTokens`     | `number`                                                       | Nombre maximal de jetons de sortie lorsque connu.                                                             |
| `cost`          | `object`                                                       | Tarification optionnelle en USD par million de jetons, incluant optionnellement `tieredPricing`.              |
| `compat`        | `object`                                                       | Drapeaux de compatibilité optionnels correspondant à la compatibilité de la configuration du modèle OpenClaw. |
| `status`        | `"available"` \| `"preview"` \| `"deprecated"` \| `"disabled"` | Statut de la liste. Ne supprimer que lorsque la ligne ne doit pas apparaître du tout.                         |
| `statusReason`  | `string`                                                       | Raison optionnelle affichée avec un statut non disponible.                                                    |
| `replaces`      | `string[]`                                                     | Anciens identifiants de modèle locaux au provider que ce modèle remplace.                                     |
| `replacedBy`    | `string`                                                       | Identifiant de modèle local au provider de remplacement pour les lignes obsolètes.                            |
| `tags`          | `string[]`                                                     | Étiquettes stables utilisées par les sélecteurs et les filtres.                                               |

Champs de suppression :

| Champ                      | Type       | Signification                                                                                                                |
| -------------------------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `provider`                 | `string`   | Identifiant du provider pour la ligne en amont à supprimer. Doit être détenu par ce plugin ou déclaré comme un alias détenu. |
| `model`                    | `string`   | Identifiant de modèle local au provider à supprimer.                                                                         |
| `reason`                   | `string`   | Message optionnel affiché lorsque la ligne supprimée est demandée directement.                                               |
| `when.baseUrlHosts`        | `string[]` | Liste facultative des hôtes d'URL de base effectifs du fournisseur requis avant que la suppression ne s'applique.            |
| `when.providerConfigApiIn` | `string[]` | Liste facultative de valeurs exactes de configuration du fournisseur `api` requises avant que la suppression ne s'applique.  |

Ne mettez pas de données d'exécution uniquement dans `modelCatalog`. Utilisez `static` uniquement lorsque les lignes du manifeste sont suffisamment complètes pour que les listes filtrées par fournisseur et les surfaces de sélecteur puissent ignorer la découverte du registre/d'exécution. Utilisez `refreshable` lorsque les lignes du manifeste sont des graines ou suppléments listables utiles, mais qu'une actualisation ou un cache peut ajouter d'autres lignes plus tard ; les lignes actualisables ne sont pas autocratiques par elles-mêmes. Utilisez `runtime` lorsque OpenClaw doit charger l'exécution du fournisseur pour connaître la liste.

## référence modelIdNormalization

Utilisez `modelIdNormalization` pour un nettoyage d'ID de modèle propriétaire du fournisseur peu coûteux qui doit se produire avant le chargement de l'exécution du fournisseur. Cela permet de conserver des alias tels que les noms de modèles courts, les ID hérités locaux au fournisseur et les règles de préfixe de proxy dans le manifeste du plugin propriétaire plutôt que dans les tables centrales de sélection de modèle.

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

| Champ                                | Type                    | Signification                                                                                                 |
| ------------------------------------ | ----------------------- | ------------------------------------------------------------------------------------------------------------- |
| `aliases`                            | `Record<string,string>` | Alias d'ID de modèle exacts insensibles à la casse. Les valeurs sont renvoyées telles qu'elles sont écrites.  |
| `stripPrefixes`                      | `string[]`              | Préfixes à supprimer avant la recherche d'alias, utiles pour la duplication héritée de fournisseur/modèle.    |
| `prefixWhenBare`                     | `string`                | Préfixe à ajouter lorsque l'ID de modèle normalisé ne contient pas déjà `/`.                                  |
| `prefixWhenBareAfterAliasStartsWith` | `object[]`              | Règles de préfixe d'ID nu conditionnelles après la recherche d'alias, indexées par `modelPrefix` et `prefix`. |

## référence providerEndpoints

Utilisez `providerEndpoints` pour la classification des points de terminaison que la politique de requête générique doit connaître avant le chargement de l'exécution du fournisseur. Le cœur possède toujours la signification de chaque `endpointClass` ; les manifestes du plugin possèdent les métadonnées de l'hôte et de l'URL de base.

Champs du point de terminaison :

| Champ                          | Type       | Signification                                                                                                                                          |
| ------------------------------ | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `endpointClass`                | `string`   | Classe de point de terminaison principal connue, telle que `openrouter`, `moonshot-native` ou `google-vertex`.                                         |
| `hosts`                        | `string[]` | Noms d'hôte exacts qui correspondent à la classe de point de terminaison.                                                                              |
| `hostSuffixes`                 | `string[]` | Suffixes d'hôte qui correspondent à la classe de point de terminaison. Préfixez avec `.` pour une correspondance uniquement sur le suffixe de domaine. |
| `baseUrls`                     | `string[]` | URLs de base HTTP(S) normalisées exactes qui correspondent à la classe de point de terminaison.                                                        |
| `googleVertexRegion`           | `string`   | Région Google Vertex statique pour les hôtes globaux exacts.                                                                                           |
| `googleVertexRegionHostSuffix` | `string`   | Suffixe à supprimer des hôtes correspondants pour révéler le préfixe de région Google Vertex.                                                          |

## référence providerRequest

Utilisez `providerRequest` pour les métadonnées de compatibilité de demande peu coûteuses dont la politique de demande générique a besoin sans charger le runtime du provider. Gardez la réécriture de la charge utile spécifique au comportement dans les hooks du runtime du provider ou les assistants de famille de providers partagés.

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

| Champ                 | Type         | Signification                                                                                                          |
| --------------------- | ------------ | ---------------------------------------------------------------------------------------------------------------------- |
| `family`              | `string`     | Libellé de famille de providers utilisé par les décisions génériques de compatibilité des demandes et les diagnostics. |
| `compatibilityFamily` | `"moonshot"` | Bucket de compatibilité de famille de providers facultatif pour les assistants de demande partagés.                    |
| `openAICompletions`   | `object`     | Indicateurs de demande de complétions compatibles avec OpenAI, actuellement `supportsStreamingUsage`.                  |

## référence secretProviderIntegrations

Utilisez `secretProviderIntegrations` lorsqu'un plugin peut publier une préréglage de fournisseur exec SecretRef réutilisable. OpenClaw lit ces métadonnées avant le chargement du runtime du plugin, stocke la propriété du plugin dans `secrets.providers.<alias>.pluginIntegration` et laisse la résolution réelle des secrets au runtime SecretRef. Les préréglages sont exposés uniquement pour les plugins groupés et les plugins installés découverts à partir des racines d'installation de plugins gérées, telles que les installations git et ClawHub.

```json
{
  "secretProviderIntegrations": {
    "secret-store": {
      "providerAlias": "team-secrets",
      "displayName": "Team secrets",
      "source": "exec",
      "command": "${node}",
      "args": ["./bin/resolve-secrets.mjs"]
    }
  }
}
```

La clé de la carte est l'ID d'intégration. Si `providerAlias` est omis, OpenClaw utilise
l'ID d'intégration comme alias du fournisseur SecretRef. Les alias de fournisseur doivent correspondre
au modèle d'alias normal du fournisseur SecretRef, par exemple `team-secrets` ou
`onepassword-work`.

Lorsqu'un opérateur sélectionne le préréglage, OpenClaw écrit une référence de fournisseur comme suit :

```json
{
  "secrets": {
    "providers": {
      "team-secrets": {
        "source": "exec",
        "pluginIntegration": {
          "pluginId": "acme-secrets",
          "integrationId": "secret-store"
        }
      }
    }
  }
}
```

Au démarrage/rechargement, OpenClaw résout ce fournisseur en chargeant les métadonnées actuelles du manifeste du plugin,
en vérifiant que le plugin propriétaire est installé et actif, et
en matérialisant la commande exec à partir du manifeste. La désactivation ou la suppression du
plugin révoque le fournisseur pour les SecretRefs actifs. Les opérateurs qui souhaitent une configuration exec autonome
peuvent toujours écrire manuellement des fournisseurs `command`/`args` directement.

Seuls les préréglages `source: "exec"` sont actuellement pris en charge. `command` doit être
`${node}`, et `args[0]` doit être un script de résolution relatif à la racine du plugin `./`.
OpenClaw le matérialise au démarrage/rechargement vers l'exécutable Node actuel et
le chemin absolu du script dans le plugin. Les options Node telles que `--require`, `--import`,
`--loader`, `--env-file`, `--eval` et `--print` ne font pas partie du contrat de préréglage du manifeste.
Les opérateurs qui ont besoin de commandes non-Node peuvent configurer directement des fournisseurs exec
manuels autonomes.

OpenClaw dérive `trustedDirs` pour les préréglages du manifeste à partir de la racine du plugin et,
pour les préréglages `${node}`, du répertoire exécutable Node actuel. Les `trustedDirs`
créés par le manifeste sont ignorés. D'autres options de fournisseur exec telles que `timeoutMs`,
`maxOutputBytes`, `jsonOnly`, `env`, `passEnv` et `allowInsecurePath` sont
transmises à la configuration normale du fournisseur exec SecretRef.

## Référence modelPricing

Utilisez `modelPricing` lorsqu'un fournisseur a besoin d'un comportement de tarification du plan de contrôle avant le chargement du runtime. Le cache de tarification du Gateway lit ces métadonnées sans importer le code du runtime du fournisseur.

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

| Champ                      | Type               | Signification                                                                                                                                                     |
| -------------------------- | ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `provider`                 | `string`           | ID de fournisseur du catalogue externe lorsqu'il diffère de l'ID du fournisseur OpenClaw, par exemple `z-ai` pour un fournisseur `zai`.                           |
| `passthroughProviderModel` | `boolean`          | Traiter les ID de modèle contenant des barres obliques comme des références fournisseur/modèle imbriquées, utile pour les fournisseurs proxy tels que OpenRouter. |
| `modelIdTransforms`        | `"version-dots"[]` | Variantes d'ID de modèle de catalogue externe supplémentaires. `version-dots` essaie les ID de version pointillés comme `claude-opus-4.6`.                        |

### Index des fournisseurs OpenClaw

L'Index des fournisseurs OpenClaw est des métadonnées d'aperçu appartenant à OpenClaw pour les fournisseurs dont les plugins ne sont peut-être pas encore installés. Il ne fait pas partie d'un manifeste de plugin. Les manifestes de plugin restent l'autorité du plugin installé. L'Index des fournisseurs est le contrat de secours interne que les futures surfaces de fournisseur installable et de sélecteur de modèle pré-installation consommeront lorsqu'un plugin de fournisseur n'est pas installé.

Ordre d'autorité du catalogue :

1. Configuration utilisateur.
2. Manifeste du plugin installé `modelCatalog`.
3. Cache du catalogue de modèles à partir d'une actualisation explicite.
4. Lignes d'aperçu de l'Index des Fournisseurs OpenClaw.

L'Index des Fournisseurs ne doit pas contenir de secrets, d'état activé, de hooks d'exécution ou de données de modèle en temps réel spécifiques au compte. Ses catalogues d'aperçu utilisent la même forme de ligne `modelCatalog` que les manifestes de plugin, mais doivent rester limités aux métadonnées d'affichage stables, sauf si les champs de l'adaptateur d'exécution tels que `api`, `baseUrl`, la tarification ou les indicateurs de compatibilité sont intentionnellement alignés avec le manifeste du plugin installé. Les fournisseurs avec une découverte `/models` en direct doivent écrire les lignes actualisées via le chemin du cache explicite du catalogue de modèles au lieu de faire des appels d'API de fournisseur de listing ou d'onboarding normaux.

Les entrées de l'Index des Fournisseurs peuvent également contenir des métadonnées de plugin installable pour les fournisseurs dont le plugin a été déplacé hors du noyau ou n'est pas encore installé par ailleurs. Ces métadonnées reflètent le modèle du catalogue de canal : le nom du package, la spécification d'installation npm, l'intégrité attendue et les étiquettes de choix d'auth bon marché suffisent pour afficher une option de configuration installable. Une fois le plugin installé, son manifeste prime et l'entrée de l'Index des Fournisseurs est ignorée pour ce fournisseur.

Les clés de fonctionnalité de premier niveau héritées sont obsolètes. Utilisez `openclaw doctor --fix` pour déplacer `speechProviders`, `realtimeTranscriptionProviders`, `realtimeVoiceProviders`, `mediaUnderstandingProviders`, `imageGenerationProviders`, `videoGenerationProviders`, `webFetchProviders` et `webSearchProviders` sous `contracts` ; le chargement normal des manifestes ne traite plus ces champs de premier niveau comme une propriété de fonctionnalité.

## Manifeste par rapport à package.

Les deux fichiers servent des travaux différents :

| Fichier                | Utilisez-le pour                                                                                                                                                                |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `openclaw.plugin.json` | Découverte, validation de configuration, métadonnées de choix d'auth et indices d'interface utilisateur qui doivent exister avant l'exécution du code du plugin                 |
| `package.json`         | Métadonnées npm, installation des dépendances et le bloc `openclaw` utilisé pour les points d'entrée, la porte d'installation, la configuration ou les métadonnées du catalogue |

Si vous n'êtes pas sûr de l'appartenance d'une métadonnée, utilisez cette règle :

- si OpenClaw doit le savoir avant le chargement du code du plugin, mettez-le dans `openclaw.plugin.json`
- s'il s'agit du conditionnement, des fichiers d'entrée ou du comportement de l'installation npm, mettez-le dans `package.json`

### champs package. qui affectent la découverte

Certaines métadonnées de plugin pré-exécution résident intentionnellement dans `package.json` sous le bloc
`openclaw` au lieu de `openclaw.plugin.json`.
`openclaw.bundle` et `openclaw.bundle.json` ne sont pas des contrats de plugin OpenClaw ;
les plugins natifs doivent utiliser `openclaw.plugin.json` plus les champs
`package.json#openclaw` pris en charge ci-dessous.

Exemples importants :

| Champ                                                                                      | Signification                                                                                                                                                                                                                              |
| ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `openclaw.extensions`                                                                      | Déclare les points d'entrée des plugins natifs. Doit rester dans le répertoire du package du plugin.                                                                                                                                       |
| `openclaw.runtimeExtensions`                                                               | Déclare les points d'entrée d'exécution JavaScript construits pour les packages installés. Doit rester dans le répertoire du package du plugin.                                                                                            |
| `openclaw.setupEntry`                                                                      | Point d'entrée léger uniquement pour la configuration utilisé lors de l'intégration, du démarrage différé du canal et de la découverte de l'état/SecretRef en lecture seule du canal. Doit rester dans le répertoire du package du plugin. |
| `openclaw.runtimeSetupEntry`                                                               | Déclare le point d'entrée de configuration JavaScript construit pour les packages installés. Nécessite `setupEntry`, doit exister et doit rester dans le répertoire du package du plugin.                                                  |
| `openclaw.channel`                                                                         | Métadonnées de catalogue de canal bon marché comme les étiquettes, les chemins de documentation, les alias et le texte de sélection.                                                                                                       |
| `openclaw.channel.commands`                                                                | Métadonnées de valeur par défaut automatique pour les commandes natives et compétences natives utilisées par la configuration, l'audit et les surfaces de liste de commandes avant le chargement de l'exécution du canal.                  |
| `openclaw.channel.configuredState`                                                         | Métadonnées du vérificateur d'état configuré léger qui peuvent répondre « la configuration env-only existe-t-elle déjà ? » sans charger l'exécution complète du canal.                                                                     |
| `openclaw.channel.persistedAuthState`                                                      | Métadonnées du vérificateur d'authentification persistante légère qui peuvent répondre « est-ce que quelque chose est déjà connecté ? » sans charger l'exécution complète du canal.                                                        |
| `openclaw.install.clawhubSpec` / `openclaw.install.npmSpec` / `openclaw.install.localPath` | Indices d'installation/de mise à jour pour les plugins groupés et publiés en externe.                                                                                                                                                      |
| `openclaw.install.defaultChoice`                                                           | Chemin d'installation préféré lorsque plusieurs sources d'installation sont disponibles.                                                                                                                                                   |
| `openclaw.install.minHostVersion`                                                          | Version minimale prise en charge de l'hôte OpenClaw, utilisant un plancher semver comme `>=2026.3.22` ou `>=2026.5.1-beta.1`.                                                                                                              |
| `openclaw.compat.pluginApi`                                                                | Plage minimale de l'OpenClaw de plugin API requise par ce paquet, utilisant un plancher semver comme `>=2026.5.27`.                                                                                                                        |
| `openclaw.install.expectedIntegrity`                                                       | Chaîne d'intégrité de dist npm attendue telle que `sha512-...` ; les flux d'installation et de mise à jour vérifient l'artefact récupéré par rapport à celle-ci.                                                                           |
| `openclaw.install.allowInvalidConfigRecovery`                                              | Permet un chemin de récupération étroit par réinstallation de plugin groupé lorsque la configuration est invalide.                                                                                                                         |
| `openclaw.startup.deferConfiguredChannelFullLoadUntilAfterListen`                          | Permet aux surfaces de channel de configuration d'exécution (setup-runtime) de se charger avant l'écoute, puis diffère le plugin channel entièrement configuré jusqu'à l'activation post-écoute.                                           |

Les métadonnées du manifeste déterminent quels choix de fournisseur/channel/setup apparaissent dans l'intégration avant le chargement de l'exécution. `package.json#openclaw.install` indique à l'intégration comment récupérer ou activer ce plugin lorsque l'utilisateur choisit l'une de ces options. Ne déplacez pas les indices d'installation dans `openclaw.plugin.json`.

`openclaw.install.minHostVersion` est appliqué lors de l'installation et du chargement du registre de manifeste pour les sources de plugins non groupés. Les valeurs invalides sont rejetées ; les plus récentes mais valides sautent les plugins externes sur les hôtes plus anciens. Les plugins sources groupés sont supposés être co-versionnés avec l'extraction de l'hôte.

`openclaw.compat.pluginApi` est appliqué lors de l'installation du paquet pour les sources de
plugins non regroupés. Utilisez-le pour la version minimale de l'API du SDK/runtime
OpenClawAPI contre laquelle le paquet a été construit. Il peut être plus strict que `minHostVersion` lorsqu'un
paquet de plugin nécessite une API plus récente mais conserve une indication d'installation inférieure pour d'autres
flux. Les versions officielles de OpenClawAPI synchronisent par défaut les planchers de l'API des plugins officiels existants
avec la version de publication de OpenClaw, mais les publications de plugins uniquement peuvent conserver
un plancher inférieur lorsque le paquet prend intentionnellement en charge les hôtes plus anciens. N'utilisez pas
la version du paquet seule comme contrat de compatibilité. `peerDependencies.openclaw`
reste les métadonnées du paquet npm ; OpenClaw utilise le contrat `openclaw.compat.pluginApi`
pour les décisions de compatibilité d'installation.

Les métadonnées officielles d'installation à la demande doivent utiliser `clawhubSpec` lorsque le plugin est
publié sur ClawHub ; l'onboarding considère cela comme la source distante préférée et
enregistre les faits d'artefact ClawHub après l'installation. `npmSpec` reste le repli de compatibilité
pour les paquets qui n'ont pas encore migré vers ClawHub.

Le verrouillage exact de la version npm réside déjà dans `npmSpec`, par exemple
`"npmSpec": "@wecom/wecom-openclaw-plugin@1.2.3"`. Les entrées officielles du catalogue externe
doivent associer des spécifications exactes à `expectedIntegrity` afin que les flux de mise à jour échouent
fermement si l'artefact npm récupéré ne correspond plus à la version verrouillée.
L'intégration interactive propose toujours des spécifications npm de registre de confiance, y compris les noms de
package seuls et les dist-tags, pour assurer la compatibilité. Les diagnostics du catalogue peuvent
distinguer les sources exactes, flottantes, verrouillées par intégrité, à intégrité manquante, présentant une inadéquation de nom de package,
et les sources de choix par défaut non valides. Ils avertissent également lorsque
`expectedIntegrity` est présent mais qu'il n'y a aucune source npm valide qu'il peut verrouiller.
Lorsque `expectedIntegrity` est présent,
les flux d'installation/de mise à jour l'appliquent ; lorsqu'il est omis, la résolution du registre est
enregistrée sans verrouillage d'intégrité.

Les plugins de canal doivent fournir `openclaw.setupEntry` lorsque l'état, la liste des canaux,
ou les analyses SecretRef doivent identifier les comptes configurés sans charger l'intégralité du
runtime. L'entrée de configuration doit exposer les métadonnées du canal ainsi que les adaptateurs de configuration,
d'état et de secrets sécurisés pour la configuration ; conserver les clients réseau, les écouteurs de passerelle et les
runtimes de transport dans le point d'entrée principal de l'extension.

Les champs du point d'entrée du runtime ne remplacent pas les contrôles de limite de package pour les champs
du point d'entrée source. Par exemple, `openclaw.runtimeExtensions` ne peut pas rendre un
chemin `openclaw.extensions` échappé chargeable.

`openclaw.install.allowInvalidConfigRecovery` est volontairement restrictif. Il ne
rend pas les configurations cassées arbitraires installables. Actuellement, il permet uniquement aux flux d'installation
de récupérer des échecs spécifiques de mise à niveau de plugin groupé obsolète, tels qu'un
chemin de plugin groupé manquant ou une entrée `channels.<id>` obsolète pour ce même
plugin groupé. Les erreurs de configuration non liées bloquent toujours l'installation et redirigent les opérateurs
vers `openclaw doctor --fix`.

`openclaw.channel.persistedAuthState` correspond aux métadonnées de package pour un minuscule module de
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

Utilisez-le lorsque les flux de configuration, de diagnostic (doctor), d'état (status) ou de présence en lecture seule nécessitent une sonde d'authentification oui/non bon marché avant le chargement complet du plugin de channel. L'état d'authentification persisté n'est pas l'état configuré du channel : n'utilisez pas ces métadonnées pour activer automatiquement les plugins, réparer les dépendances d'exécution ou décider si un runtime de channel doit être chargé. L'export cible doit être une petite fonction qui lit uniquement l'état persisté ; ne l'acheminez pas via le barrel complet du runtime du channel.

`openclaw.channel.configuredState` suit la même forme pour les vérifications configurées uniquement par env bon marché :

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

Utilisez-le lorsqu'un channel peut répondre à l'état configuré à partir de variables d'environnement ou d'autres petites entrées non liées au runtime. Si la vérification nécessite une résolution complète de la configuration ou le vrai runtime du channel, gardez cette logique dans le hook `config.hasConfiguredState` du plugin à la place.

## Priorité de découverte (identifiants de plugin en double)

OpenClaw détecte les plugins à partir de plusieurs racines. Pour l'ordre de analyse du système de fichiers brut, consultez [Plugin scan
order](/fr/gateway/configuration-reference#plugin-scan-order). Si deux découvertes partagent le même `id`, seul le manifeste de **priorité la plus élevée** est conservé ; les doublons de priorité inférieure sont supprimés au lieu d'être chargés à côté.

Priorité, de la plus élevée à la plus basse :

1. **Sélectionné par la configuration** — un chemin explicitement épinglé dans `plugins.entries.<id>`
2. **Groupé (Bundled)** — plugins livrés avec OpenClaw
3. **Installation globale** — plugins installés dans la racine des plugins OpenClaw globale
4. **Espace de travail (Workspace)** — plugins découverts par rapport à l'espace de travail actuel

Implications :

- Une copie forkée ou obsolète d'un plugin groupé situé dans l'espace de travail ne masquera pas la version groupée.
- Pour réellement remplacer un plugin groupé par un plugin local, épinglez-le via `plugins.entries.<id>` afin qu'il gagne par priorité plutôt que de s'appuyer sur la découverte de l'espace de travail.
- Les suppressions de doublons sont consignées afin que le diagnostic du Doctor et au démarrage puissent pointer vers la copie ignorée.
- Les remplacements de doublons sélectionnés par la configuration sont formulés comme des remplacements explicites dans les diagnostics, mais avertissent toujours pour que les forks obsolètes et les masquages accidentels restent visibles.

## Exigences du schéma JSON

- **Chaque plugin doit fournir un schéma JSON**, même s'il n'accepte aucune configuration.
- Un schéma vide est acceptable (par exemple, `{ "type": "object", "additionalProperties": false }`).
- Les schémas sont validés lors de la lecture/écriture de la configuration, et non lors de l'exécution.
- Lorsque vous étendez ou bifurquez un plugin groupé avec de nouvelles clés de configuration, mettez à jour le `openclaw.plugin.json` `configSchema` de ce plugin en même temps. Les schémas des plugins groupés sont stricts, donc l'ajout de `plugins.entries.<id>.config.myNewKey` dans la configuration utilisateur sans ajouter `myNewKey` à `configSchema.properties` sera rejeté avant le chargement du runtime du plugin.

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

- Les clés `channels.*` inconnues sont des **erreurs**, sauf si l'identifiant de canal est déclaré par un manifeste de plugin.
- `plugins.entries.<id>`, `plugins.allow`, `plugins.deny` et `plugins.slots.*` doivent référencer des identifiants de plugin **découvrables**. Les identifiants inconnus sont des **erreurs**.
- Si un plugin est installé mais possède un manifeste ou un schéma cassé ou manquant, la validation échoue et Doctor signale l'erreur du plugin.
- Si une configuration de plugin existe mais que le plugin est **désactivé**, la configuration est conservée et un **avertissement** est affiché dans Doctor + les journaux.

Voir [Référence de la configuration](/fr/gateway/configuration) pour le schéma complet `plugins.*`.

## Notes

- Le manifeste est **requis pour les plugins natifs OpenClaw**, y compris pour les chargements depuis le système de fichiers local. Le runtime charge toujours le module du plugin séparément ; le manifeste sert uniquement à la découverte + validation.
- Les manifestes natifs sont analysés avec JSON5, donc les commentaires, les virgules de fin et les clés non entre guillemets sont acceptés tant que la valeur finale reste un objet.
- Seuls les champs de manifeste documentés sont lus par le chargeur de manifeste. Évitez les clés personnalisées de niveau supérieur.
- `channels`, `providers`, `cliBackends` et `skills` peuvent tous être omis lorsqu'un plugin n'en a pas besoin.
- `providerCatalogEntry` doit rester léger et ne doit pas importer de code d'exécution étendu ; utilisez-le pour les métadonnées statiques du catalogue de provider ou des descripteurs de découverte étroits, et non pour l'exécution au moment de la requête.
- Les types de plugins exclusifs sont sélectionnés via `plugins.slots.*` : `kind: "memory"` via `plugins.slots.memory`, `kind: "context-engine"` via `plugins.slots.contextEngine` (par défaut `legacy`).
- Déclarez le type de plugin exclusif dans ce manifeste. L'entrée de runtime `OpenClawPluginDefinition.kind` est obsolète et ne reste qu'en guise de repli de compatibilité pour les plugins plus anciens.
- Les métadonnées de variable d'environnement (`setup.providers[].envVars`, `providerAuthEnvVars` obsolète, et `channelEnvVars`) sont purement déclaratives. Le statut, l'audit, la validation de livraison cron et d'autres surfaces en lecture seule appliquent toujours la confiance du plugin et la politique d'activation effective avant de considérer une variable d'environnement comme configurée.
- Pour les métadonnées de l'assistant d'exécution qui nécessitent du code de provider, consultez [Provider runtime hooks](/fr/plugins/architecture-internals#provider-runtime-hooks).
- Si votre plugin dépend de modules natifs, documentez les étapes de build et toutes les exigences de liste d'autorisation de gestionnaire de paquets (par exemple, pnpm `allow-build-scripts` + `pnpm rebuild <package>`).

## Connexes

<CardGroup cols={3}>
  <Card title="Création de plugins" href="/fr/plugins/building-plugins" icon="rocket">
    Getting started with plugins.
  </Card>
  <Card title="Architecture de plugin" href="/fr/plugins/architecture" icon="diagram-project">
    Architecture interne et modèle de capacité.
  </Card>
  <Card title="Aperçu du SDK" href="/fr/plugins/sdk-overview" icon="book">
    Référence du SDK de plugin et imports de sous-chemin.
  </Card>
</CardGroup>
