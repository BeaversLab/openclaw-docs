---
summary: "Manifest du plugin + exigences du schéma JSON (validation de configuration stricte)"
read_when:
  - You are building an OpenClaw plugin
  - You need to ship a plugin config schema or debug plugin validation errors
title: "Manifest du plugin"
---

Cette page concerne uniquement le **manifeste du plugin natif OpenClaw**.

Pour les dispositions de bundle compatibles, consultez [Plugin bundles](/fr/plugins/bundles).

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

Consultez le guide complet du système de plugins : [Plugins](/fr/tools/plugin).
Pour le model de capacité natif et les conseils actuels de compatibilité externe :
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

| Champ         | Obligatoire | Type       | Signification                                                                                                                                                                                                                               |
| ------------- | ----------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `rootPath`    | Oui         | `string`   | Chemin pointé vers l'objet de configuration propriétaire du plugin à inspecter, par exemple `plugins.entries.example.config`.                                                                                                               |
| `overlayPath` | Non         | `string`   | Chemin pointé à l'intérieur de la configuration racine dont l'objet doit se superposer à l'objet racine avant l'évaluation du signal. Utilisez ceci pour une configuration spécifique à une capacité telle que `image`, `video` ou `music`. |
| `required`    | Non         | `string[]` | Chemins en notation à points dans la configuration effective qui doivent avoir des valeurs configurées. Les chaînes ne doivent pas être vides ; les objets et les tableaux ne doivent pas être vides.                                       |
| `requiredAny` | Non         | `string[]` | Chemins en notation à points dans la configuration effective dont au moins un doit avoir une valeur configurée.                                                                                                                             |
| `mode`        | Non         | `object`   | Garde de mode de chaîne optionnelle dans la configuration effective. Utilisez ceci lorsque la disponibilité uniquement en configuration s'applique à un seul mode.                                                                          |

Chaque garde `mode` prend en charge :

| Champ        | Requis | Type       | Signification                                                                                 |
| ------------ | ------ | ---------- | --------------------------------------------------------------------------------------------- |
| `path`       | Non    | `string`   | Chemin en notation à points dans la configuration effective. La valeur par défaut est `mode`. |
| `default`    | Non    | `string`   | Valeur de mode à utiliser lorsque la configuration omet le chemin.                            |
| `allowed`    | Non    | `string[]` | Si présent, le signal ne passe que lorsque le mode effectif est l'une de ces valeurs.         |
| `disallowed` | Non    | `string[]` | Si présent, le signal échoue lorsque le mode effectif est l'une de ces valeurs.               |

Chaque entrée `authSignals` prend en charge :

| Champ             | Requis | Type     | Signification                                                                                                                                                                                                           |
| ----------------- | ------ | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `provider`        | Oui    | `string` | ID du provider à vérifier dans les profils d'authentification configurés.                                                                                                                                               |
| `providerBaseUrl` | Non    | `object` | Garde optionnelle qui fait que le signal ne compte que lorsque le provider configuré référencé utilise une URL de base autorisée. Utilisez ceci lorsqu'un alias d'authentification n'est valide que pour certaines API. |

Chaque garde `providerBaseUrl` prend en charge :

| Champ             | Requis | Type       | Signification                                                                                                                                                                        |
| ----------------- | ------ | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `provider`        | Oui    | `string`   | ID de configuration du provider dont le `baseUrl` doit être vérifié.                                                                                                                 |
| `defaultBaseUrl`  | Non    | `string`   | URL de base à supposer lorsque la configuration du provider omet `baseUrl`.                                                                                                          |
| `allowedBaseUrls` | Oui    | `string[]` | URLs de base autorisées pour ce signal d'authentification. Le signal est ignoré lorsque l'URL de base configurée ou par défaut ne correspond pas à l'une de ces valeurs normalisées. |

## Référence des métadonnées d'outil

`toolMetadata` utilise les mêmes formes `configSignals` et `authSignals` que
les métadonnées du fournisseur de génération, indexées par nom d'outil. `contracts.tools` déclare
la propriété. `toolMetadata`OpenClaw déclare une preuve de disponibilité peu coûteuse afin qu'OpenClaw puisse
éviter d'importer un runtime de plugin juste pour que sa fabrique d'outils renvoie `null`.

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

Si un outil n'a pas de `toolMetadata`OpenClaw, OpenClaw préserve le comportement existant et
charge le plugin propriétaire lorsque le contrat de l'outil correspond à la stratégie. Pour les outils
à chemin critique dont la fabrique dépend de l'authentification/de la configuration, les auteurs de plugins doivent déclarer
`toolMetadata` au lieu de faire importer le runtime par le cœur pour demander.

## Référence de providerAuthChoices

Chaque entrée `providerAuthChoices`OpenClaw décrit un choix d'intégration ou d'authentification.
OpenClaw lit cela avant le chargement du runtime du fournisseur.
Les listes de configuration des fournisseurs utilisent ces choix de manifeste, les choix de configuration
dérivés du descripteur et les métadonnées du catalogue d'installation sans charger le runtime du fournisseur.

| Champ                 | Obligatoire | Type                                                                  | Signification                                                                                                           |
| --------------------- | ----------- | --------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `provider`            | Oui         | `string`                                                              | Id du fournisseur auquel ce choix appartient.                                                                           |
| `method`              | Oui         | `string`                                                              | Id de la méthode d'authentification vers laquelle dispatcher.                                                           |
| `choiceId`            | Oui         | `string`                                                              | Id stable du choix d'authentification utilisé par les flux d'intégration et de CLI.                                     |
| `choiceLabel`         | Non         | `string`                                                              | Libellé面向 l'utilisateur. Si omis, OpenClaw revient à OpenClaw`choiceId`.                                              |
| `choiceHint`          | Non         | `string`                                                              | Texte d'aide court pour le sélecteur.                                                                                   |
| `assistantPriority`   | Non         | `number`                                                              | Les valeurs les plus basses sont triées plus tôt dans les sélecteurs interactifs pilotés par l'assistant.               |
| `assistantVisibility` | Non         | `"visible"` \| `"manual-only"`                                        | Masquer le choix dans les sélecteurs d'assistant tout en autorisant toujours la sélection manuelle via la CLI.          |
| `deprecatedChoiceIds` | Non         | `string[]`                                                            | Identifiants de choix obsolètes qui doivent rediriger les utilisateurs vers ce choix de remplacement.                   |
| `groupId`             | Non         | `string`                                                              | Identifiant de groupe facultatif pour regrouper les choix connexes.                                                     |
| `groupLabel`          | Non         | `string`                                                              | Libellé visible par l'utilisateur pour ce groupe.                                                                       |
| `groupHint`           | Non         | `string`                                                              | Texte d'aide court pour le groupe.                                                                                      |
| `optionKey`           | Non         | `string`                                                              | Clé d'option interne pour les flux d'authentification simple à un indicateur.                                           |
| `cliFlag`             | Non         | `string`                                                              | Nom de l'indicateur CLI , tel que `--openrouter-api-key`.                                                               |
| `cliOption`           | Non         | `string`                                                              | Forme complète de l'option CLI , telle que `--openrouter-api-key <key>`.                                                |
| `cliDescription`      | Non         | `string`                                                              | Description utilisée dans l'aide CLI.                                                                                   |
| `onboardingScopes`    | Non         | `Array<"text-inference" \| "image-generation" \| "music-generation">` | Surfaces d'onboarding dans lesquelles ce choix doit apparaître. Si omis, la valeur par défaut est `["text-inference"]`. |

## Référence de commandAliases

Utilisez `commandAliases` lorsqu'un plugin possède un nom de commande d'exécution que les utilisateurs peuvent
placer par erreur dans `plugins.allow` ou essayer d'exécuter en tant que commande racine CLI . OpenClaw
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
| `name`       | Oui         | `string`          | Nom de la commande qui appartient à ce plugin.                                            |
| `kind`       | Non         | `"runtime-slash"` | Marque l'alias comme une commande slash de chat plutôt que comme une commande racine CLI. |
| `cliCommand` | Non         | `string`          | Commande racine CLI connexe à suggérer pour les opérations CLI , si elle existe.          |

## Référence de l'activation

Utilisez `activation` lorsque le plugin peut facilement déclarer quels événements du plan de contrôle doivent l'inclure dans un plan d'activation/chargement.

Ce bloc est des métadonnées du planificateur, et non une API de cycle de vie. Il n'enregistre pas le comportement d'exécution, ne remplace pas `register(...)` et ne garantit pas que le code du plugin a déjà été exécuté. Le planificateur d'activation utilise ces champs pour restreindre les plugins candidats avant de revenir aux métadonnées de propriété du manifeste existantes telles que `providers`, `channels`, `commandAliases`, `setup.providers`, `contracts.tools` et les hooks.

Préférez les métadonnées les plus restreintes qui décrivent déjà la propriété. Utilisez `providers`, `channels`, `commandAliases`, les descripteurs de configuration ou `contracts` lorsque ces champs expriment la relation. Utilisez `activation` pour des indices supplémentaires du planificateur qui ne peuvent être représentés par ces champs de propriété. Utilisez `cliBackends` de premier niveau pour les alias d'exécution CLI tels que `claude-cli`, `my-cli` ou `google-gemini-cli` ; `activation.onAgentHarnesses` est uniquement destiné aux identifiants de harnais d'agent intégré qui n'ont pas déjà de champ de propriété.

Ce bloc est uniquement des métadonnées. Il n'enregistre pas le comportement d'exécution et ne remplace pas `register(...)`, `setupEntry` ou d'autres points d'entrée d'exécution/plugin. Les consommateurs actuels l'utilisent comme un indice de restriction avant le chargement plus large des plugins, donc l'absence de métadonnées d'activation hors démarrage ne coûte généralement que des performances ; cela ne devrait pas modifier la correction tant que les replis de propriété du manifeste existent toujours.

Chaque plugin doit définir `activation.onStartup` intentionnellement. Définissez-le sur `true`
uniquement lorsque le plugin doit s'exécuter lors du démarrage du Gateway. Définissez-le sur `false` lorsque
le plugin est inactif au démarrage et doit être chargé uniquement par des déclencheurs plus ciblés.
L'omission de `onStartup` ne charge plus implicitement le plugin au démarrage ; utilisez des
métadonnées d'activation explicites pour le démarrage, le channel, la configuration, le agent-harness, la mémoire ou
d'autres déclencheurs d'activation plus ciblés.

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

| Champ              | Obligatoire | Type                                                 | Signification                                                                                                                                                                                                                                       |
| ------------------ | ----------- | ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `onStartup`        | Non         | `boolean`                                            | Activation explicite au démarrage du Gateway. Chaque plugin doit définir cela. `true` importe le plugin lors du démarrage ; `false` le garde en chargement différé au démarrage sauf si un autre déclencheur correspondant nécessite le chargement. |
| `onProviders`      | Non         | `string[]`                                           | Identifiants de fournisseur qui doivent inclure ce plugin dans les plans d'activation/chargement.                                                                                                                                                   |
| `onAgentHarnesses` | Non         | `string[]`                                           | Identifiants du runtime harnais d'agent intégré qui doivent inclure ce plugin dans les plans d'activation/chargement. Utilisez `cliBackends` de premier niveau pour les alias de backend CLI.                                                       |
| `onCommands`       | Non         | `string[]`                                           | Identifiants de commande qui doivent inclure ce plugin dans les plans d'activation/chargement.                                                                                                                                                      |
| `onChannels`       | Non         | `string[]`                                           | Identifiants de channel qui doivent inclure ce plugin dans les plans d'activation/chargement.                                                                                                                                                       |
| `onRoutes`         | Non         | `string[]`                                           | Types de routes qui doivent inclure ce plugin dans les plans d'activation/chargement.                                                                                                                                                               |
| `onConfigPaths`    | Non         | `string[]`                                           | Chemins de configuration relatifs à la racine qui doivent inclure ce plugin dans les plans de démarrage/chargement lorsque le chemin est présent et non explicitement désactivé.                                                                    |
| `onCapabilities`   | Non         | `Array<"provider" \| "channel" \| "tool" \| "hook">` | Indicateurs de capacités larges utilisés pour la planification de l'activation du plan de contrôle. Préférez les champs plus ciblés lorsque cela est possible.                                                                                      |

Consommateurs actuels actifs :

- La planification du démarrage du Gateway utilise `activation.onStartup` pour l'import explicite au
  démarrage
- la planification du CLI déclenchée par commande revient à l'ancien
  `commandAliases[].cliCommand` ou `commandAliases[].name`
- la planification du démarrage de l'exécution de l'agent utilise `activation.onAgentHarnesses` pour
  les harnais intégrés et `cliBackends[]` de premier niveau pour les alias d'exécution CLI
- la planification de la configuration/déclenchement par canal revient à la propriété de l'ancien `channels[]`
  lorsque les métadonnées d'activation explicite du canal sont manquantes
- la planification du plugin de démarrage utilise `activation.onConfigPaths` pour les surfaces de configuration racine hors canal
  telles que le bloc `browser` du plugin de navigateur groupé
- la planification de la configuration/exécution déclenchée par fournisseur revient à l'ancien
  `providers[]` et à la propriété de `cliBackends[]` de premier niveau lorsque les métadonnées
  d'activation explicite du fournisseur sont manquantes

Les diagnostics du planificateur peuvent distinguer les indices d'activation explicite de la
rétrogradation de propriété du manifeste. Par exemple, `activation-command-hint` signifie que
`activation.onCommands` a correspondu, tandis que `manifest-command-alias` signifie que le
planificateur a plutôt utilisé la propriété `commandAliases`. Ces étiquettes de raison sont destinées
aux diagnostics et tests de l'hôte ; les auteurs de plugins doivent continuer à déclarer les métadonnées
qui décrivent le mieux la propriété.

## référence qaRunners

Utilisez `qaRunners` lorsqu'un plugin contribue un ou plusieurs runners de transport sous
la racine partagée `openclaw qa`. Gardez ces métadonnées légères et statiques ; l'exécution
du plugin possède toujours l'inscription CLI réelle via une surface légère
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

| Champ         | Requis | Type     | Ce que cela signifie                                                                  |
| ------------- | ------ | -------- | ------------------------------------------------------------------------------------- |
| `commandName` | Oui    | `string` | Sous-commande montée sous `openclaw qa`, par exemple `matrix`.                        |
| `description` | Non    | `string` | Texte d'aide de repli utilisé lorsque l'hôte partagé a besoin d'une commande de stub. |

## référence setup

Utilisez `setup` lorsque les surfaces de configuration et d'onboarding ont besoin de métadonnées appartenant au plugin et légères
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

Le niveau supérieur `cliBackends` reste valide et continue à décrire les backends d'inférence CLI. `setup.cliBackends` est la surface descripteurs spécifique à la configuration pour les flux de plan de contrôle/configuration qui doivent rester uniquement des métadonnées.

Lorsqu'ils sont présents, `setup.providers` et `setup.cliBackends` sont la surface de recherche privilégiée basée d'abord sur les descripteurs pour la découverte de la configuration. Si le descripteur ne fait que restreindre le plugin candidat et que la configuration nécessite encore des hooks d'exécution plus riches au moment de la configuration, définissez `requiresRuntime: true` et conservez `setup-api` comme chemin d'exécution de repli.

OpenClaw inclut également `setup.providers[].envVars` dans les recherches génériques d'authentification de fournisseur et de variables d'environnement. `providerAuthEnvVars` reste pris en charge via un adaptateur de compatibilité pendant la période d'obsolescence, mais les plugins non regroupés qui l'utilisent toujours reçoivent un diagnostic de manifeste. Les nouveaux plugins doivent placer les métadonnées d'environnement de configuration/statut sur `setup.providers[].envVars`.

OpenClaw peut également dériver des choix de configuration simples à partir de `setup.providers[].authMethods` lorsqu'aucune entrée de configuration n'est disponible, ou lorsque `setup.requiresRuntime: false` déclare l'exécution de la configuration inutile. Les entrées explicites `providerAuthChoices` restent préférées pour les étiquettes personnalisées, les indicateurs CLI, la portée de l'onboarding et les métadonnées de l'assistant.

Définissez `requiresRuntime: false` uniquement lorsque ces descripteurs sont suffisants pour la surface de configuration. OpenClaw traite `false` explicite comme un contrat de descripteur uniquement et n'exécutera pas `setup-api` ou `openclaw.setupEntry` pour la recherche de configuration. Si un plugin basé uniquement sur des descripteurs expédie toujours l'une de ces entrées d'exécution de configuration, OpenClaw signale un diagnostic additif et continue à l'ignorer. `requiresRuntime` omis conserve le comportement de repli hérité afin que les plugins existants qui ont ajouté des descripteurs sans l'indicateur ne se brisent pas.

Étant donné que la recherche de configuration (setup lookup) peut exécuter du code `setup-api` appartenant au plugin, les valeurs `setup.providers[].id` et `setup.cliBackends[]` normalisées doivent rester uniques pour l'ensemble des plugins découverts. En cas d'appartenance ambiguë, le système échoue de manière sécurisée (fails closed) plutôt que de choisir un gagnant en fonction de l'ordre de découverte.

Lorsque le runtime de configuration s'exécute, les diagnostics du registre de configuration signalent une dérive des descripteurs si `setup-api` enregistre un provider ou un backend CLI que les descripteurs du manifeste ne déclarent pas, ou si un descripteur ne correspond à aucune inscription runtime. Ces diagnostics sont cumulatifs et ne rejettent pas les plugins hérités.

### référence setup.providers

| Champ          | Obligatoire | Type       | Signification                                                                                                                            |
| -------------- | ----------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `id`           | Oui         | `string`   | Id du provider exposé lors de la configuration ou de l'onboarding. Gardez les ids normalisés uniques globalement.                        |
| `authMethods`  | Non         | `string[]` | Ids des méthodes de configuration/auth prises en charge par ce provider sans charger le runtime complet.                                 |
| `envVars`      | Non         | `string[]` | Variables d'environnement que les surfaces de configuration/statut génériques peuvent vérifier avant le chargement du runtime du plugin. |
| `authEvidence` | Non         | `object[]` | Vérifications locales peu coûteuses de preuve d'auth pour les providers pouvant s'authentifier via des marqueurs non secrets.            |

`authEvidence` est destiné aux marqueurs d'identification locaux appartenant au provider qui peuvent être vérifiés sans charger de code runtime. Ces vérifications doivent rester peu coûteuses et locales : aucun appel réseau, aucune lecture de trousseau ou de gestionnaire de secrets, aucune commande shell, et aucune sonde d'API.

Entrées de preuve prises en charge :

| Champ              | Obligatoire | Type       | Signification                                                                                                                      |
| ------------------ | ----------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `type`             | Oui         | `string`   | Actuellement `local-file-with-env`.                                                                                                |
| `fileEnvVar`       | Non         | `string`   | Variable d'environnement contenant un chemin de fichier d'identité explicite.                                                      |
| `fallbackPaths`    | Non         | `string[]` | Chemins de fichiers d'identité locaux vérifiés lorsque `fileEnvVar` est absent ou vide. Prend en charge `${HOME}` et `${APPDATA}`. |
| `requiresAnyEnv`   | Non         | `string[]` | Au moins une env var listée doit être non vide pour que la preuve soit valide.                                                     |
| `requiresAllEnv`   | Non         | `string[]` | Chaque env var listée doit être non vide pour que la preuve soit valide.                                                           |
| `credentialMarker` | Oui         | `string`   | Marqueur non secret renvoyé lorsque la preuve est présente.                                                                        |
| `source`           | Non         | `string`   | Libellé de source visible par l'utilisateur pour la sortie d'authentification/état.                                                |

### champs de configuration

| Champ              | Obligatoire | Type       | Signification                                                                                                                                                                      |
| ------------------ | ----------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `providers`        | Non         | `object[]` | Descripteurs de configuration du fournisseur exposés lors de la configuration et de l'intégration.                                                                                 |
| `cliBackends`      | Non         | `string[]` | Identifiants backend au moment de la configuration utilisés pour la recherche de configuration basée sur les descripteurs. Gardez les identifiants normalisés uniques globalement. |
| `configMigrations` | Non         | `string[]` | Identifiants de migration de configuration appartenant à la surface de configuration de ce plugin.                                                                                 |
| `requiresRuntime`  | Non         | `boolean`  | Indique si la configuration nécessite encore l'exécution de `setup-api` après la recherche du descripteur.                                                                         |

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
| `tags`        | `string[]` | Balises d'interface utilisateur facultatives.        |
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

Chaque liste est facultative :

| Champ                            | Type       | Signification                                                                                                                                                |
| -------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `embeddedExtensionFactories`     | `string[]` | Identifiants de fabrique d'extension de serveur d'application Codex, actuellement `codex-app-server`.                                                        |
| `agentToolResultMiddleware`      | `string[]` | Identifiants d'exécution pour lesquels un plugin groupé peut enregistrer un intergiciel de résultat d'outil.                                                 |
| `externalAuthProviders`          | `string[]` | Identifiants de provider dont ce plugin possède le hook de profil d'authentification externe.                                                                |
| `embeddingProviders`             | `string[]` | Identifiants de provider d'intégration générale dont ce plugin dispose pour une utilisation réutilisable de l'intégration de vecteurs, y compris la mémoire. |
| `speechProviders`                | `string[]` | Identifiants de provider de synthèse vocale dont ce plugin dispose.                                                                                          |
| `realtimeTranscriptionProviders` | `string[]` | Identifiants de provider de transcription en temps réel dont ce plugin dispose.                                                                              |
| `realtimeVoiceProviders`         | `string[]` | Identifiants de provider de voix en temps réel dont ce plugin dispose.                                                                                       |
| `memoryEmbeddingProviders`       | `string[]` | Identifiants de provider d'intégration spécifiques à la mémoire obsolètes dont ce plugin dispose.                                                            |
| `mediaUnderstandingProviders`    | `string[]` | Identifiants de provider de compréhension multimédia dont ce plugin dispose.                                                                                 |
| `transcriptSourceProviders`      | `string[]` | Identifiants de provider de source de transcription dont ce plugin dispose.                                                                                  |
| `imageGenerationProviders`       | `string[]` | Identifiants de provider de génération d'images dont ce plugin dispose.                                                                                      |
| `videoGenerationProviders`       | `string[]` | Identifiants de provider de génération de vidéos dont ce plugin dispose.                                                                                     |
| `webFetchProviders`              | `string[]` | Identifiants de provider de récupération Web dont ce plugin dispose.                                                                                         |
| `webSearchProviders`             | `string[]` | Identifiants de provider de recherche Web dont ce plugin dispose.                                                                                            |
| `migrationProviders`             | `string[]` | Identifiants de provider d'importation dont ce plugin dispose pour `openclaw migrate`.                                                                       |
| `gatewayMethodDispatch`          | `string[]` | Droit réservé pour les itinéraires HTTP de plugin authentifiés qui distribuent les méthodes Gateway en processus.                                            |
| `tools`                          | `string[]` | Noms d'outils d'agent dont ce plugin dispose.                                                                                                                |

`contracts.embeddedExtensionFactories` est conservé pour les fabriques d'extensions Codex groupées (app-server-only). Les transformations de résultats d'outils groupées doivent déclarer `contracts.agentToolResultMiddleware` et s'inscrire avec `api.registerAgentToolResultMiddleware(...)` à la place. Les plugins externes ne peuvent pas inscrire de middleware de résultats d'outils car la seam peut réécrire la sortie de l'outil à haute confiance avant que le model ne la voie.

Les inscriptions Runtime `api.registerTool(...)` doivent correspondre à `contracts.tools`. La découverte d'outils utilise cette liste pour charger uniquement les runtimes de plugin qui peuvent posséder les outils demandés.

Les providers de plugins qui implémentent `resolveExternalAuthProfiles` doivent déclarer `contracts.externalAuthProviders` ; les hooks d'auth externe non déclarés sont ignorés.

Les providers d'intégration généraux doivent déclarer `contracts.embeddingProviders` pour chaque adaptateur enregistré avec `api.registerEmbeddingProvider(...)`. Utilisez le contrat général pour la génération de vecteurs réutilisable, y compris les providers consommés par la recherche de mémoire. `contracts.memoryEmbeddingProviders` est une compatibilité spécifique à la mémoire déconseillée et ne reste que pendant que les providers existants migrent vers la seam de provider d'intégration générique.

`contracts.gatewayMethodDispatch` accepte actuellement `"authenticated-request"`. Il s'agit d'une porte de contrôle d'hygiène de l'API pour les routes HTTP de plugins natifs qui répartissent intentionnellement les méthodes du plan de contrôle du Gateway en cours de processus, et non d'un bac à sable contre les plugins natifs malveillants. Utilisez-le uniquement pour les surfaces groupées/opérateur étroitement examinées qui nécessitent déjà une authentification HTTP du Gateway.

## Référence de mediaUnderstandingProviderMetadata

Utilisez `mediaUnderstandingProviderMetadata` lorsqu'un provider de compréhension de média possède des modèles par défaut, une priorité de repli d'auth automatique ou une prise en charge native de documents dont les assistants principaux génériques ont besoin avant le chargement du runtime. Les clés doivent également être déclarées dans `contracts.mediaUnderstandingProviders`.

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
| `capabilities`         | `("image" \| "audio" \| "video")[]` | Capacités multimédias exposées par ce provider.                                                                              |
| `defaultModels`        | `Record<string, string>`            | Valeurs par défaut de capacité vers modèle utilisées lorsque la configuration ne spécifie pas de modèle.                     |
| `autoPriority`         | `Record<string, number>`            | Les nombres plus bas sont triés en premier pour la repli automatique du provider basé sur les informations d'identification. |
| `nativeDocumentInputs` | `"pdf"[]`                           | Entrées de document natives prises en charge par le provider.                                                                |

## Référence de channelConfigs

Utilisez `channelConfigs` lorsqu'un plugin de channel a besoin de métadonnées de configuration bon marché avant le chargement du runtime. La découverte de la configuration/du statut du channel en lecture seule peut utiliser directement ces métadonnées pour les channels externes configurés lorsqu'aucune entrée de configuration n'est disponible, ou lorsque `setup.requiresRuntime: false` déclare le runtime de configuration inutile.

`channelConfigs` sont des métadonnées de manifeste de plugin, et non une nouvelle section de configuration utilisateur de niveau supérieur. Les utilisateurs configurent toujours les instances de channel sous `channels.<channel-id>`. OpenClaw lit les métadonnées du manifeste pour décider quel plugin possède ce channel configuré avant l'exécution du code du runtime du plugin.

Pour un plugin de channel, `configSchema` et `channelConfigs` décrivent différents chemins :

- `configSchema` valide `plugins.entries.<plugin-id>.config`
- `channelConfigs.<channel-id>.schema` valide `channels.<channel-id>`

Les plugins non groupés qui déclarent `channels[]` doivent également déclarer des entrées `channelConfigs` correspondantes. Sans elles, OpenClaw peut toujours charger le plugin, mais le schéma de configuration à froid, la configuration et les surfaces de l'interface utilisateur de contrôle ne peuvent pas connaître la forme de l'option détenue par le channel tant que le runtime du plugin ne s'est pas exécuté.

`channelConfigs.<channel-id>.commands.nativeCommandsAutoEnabled` et
`nativeSkillsAutoEnabled` peuvent déclarer des valeurs par défaut `auto` statiques pour les vérifications de configuration de commande qui s'exécutent avant le chargement du runtime du channel. Les channels groupés peuvent également publier les mêmes valeurs par défaut via `package.json#openclaw.channel.commands` aux côtés de leurs autres métadonnées de catalogue de channel détenues par le package.

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

| Champ         | Type                     | Signification                                                                                                                              |
| ------------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `schema`      | `object`                 | Schéma JSON pour `channels.<id>`. Requis pour chaque entrée de configuration de channel déclarée.                                          |
| `uiHints`     | `Record<string, object>` | Étiquettes d'interface utilisateur, espaces réservés et indications sensibles facultatifs pour cette section de configuration de channel.  |
| `label`       | `string`                 | Étiquette de channel fusionnée dans les surfaces de sélection et d'inspection lorsque les métadonnées d'exécution ne sont pas prêtes.      |
| `description` | `string`                 | Courte description du channel pour les surfaces d'inspection et de catalogue.                                                              |
| `commands`    | `object`                 | Valeurs par défaut automatiques pour les commandes natives et les compétences natives pour les vérifications de configuration pré-runtime. |
| `preferOver`  | `string[]`               | Identifiants de plugin hérités ou de priorité inférieure que ce channel doit dépasser dans les surfaces de sélection.                      |

### Remplacer un autre plugin de channel

Utilisez `preferOver` lorsque votre plugin est le propriétaire privilégié pour un identifiant de channel qu'un autre plugin peut également fournir. Les cas courants sont un identifiant de plugin renommé, un plugin autonome qui remplace un plugin groupé, ou un fork maintenu qui conserve le même identifiant de channel pour la compatibilité de la configuration.

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

Lorsque `channels.chat` est configuré, OpenClaw prend en compte à la fois l'identifiant du channel et l'identifiant du plugin privilégié. Si le plugin de priorité inférieure n'a été sélectionné que parce qu'il est groupé ou activé par défaut, OpenClaw le désactive dans la configuration d'exécution effective afin qu'un seul plugin possède le channel et ses outils. La sélection explicite de l'utilisateur l'emporte toujours : si l'utilisateur active explicitement les deux plugins, OpenClaw préserve ce choix et signale des diagnostics de channel/out en double au lieu de modifier silencieusement l'ensemble de plugins demandé.

Gardez `preferOver` limité aux identifiants de plugin qui peuvent vraiment fournir le même channel. Ce n'est pas un champ de priorité général et il ne renomme pas les clés de configuration utilisateur.

## Référence modelSupport

Utilisez `modelSupport` lorsque OpenClaw doit déduire votre plugin de provider à partir d'identifiants de model abrégés comme `gpt-5.5` ou `claude-sonnet-4.6` avant le chargement de l'exécution du plugin.

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

| Champ           | Type       | Signification                                                                                           |
| --------------- | ---------- | ------------------------------------------------------------------------------------------------------- |
| `modelPrefixes` | `string[]` | Préfixes correspondant à `startsWith` par rapport aux identifiants de modèles abrégés.                  |
| `modelPatterns` | `string[]` | Sources Regex correspondant aux identifiants de modèles abrégés après suppression du suffixe de profil. |

Les entrées `modelPatterns` sont compilées via `compileSafeRegex`, qui rejette
les motifs contenant des répétitions imbriquées (par exemple `(a+)+$`). Les motifs qui échouent
la vérification de sécurité sont silencieusement ignorés, tout comme les regex syntaxiquement invalides.
Gardez les motifs simples et évitez les quantificateurs imbriqués.

## référence modelCatalog

Utilisez `modelCatalog` lorsque OpenClaw doit connaître les métadonnées du modèle de provider avant
le chargement du runtime du plugin. Il s'agit de la source appartenant au manifeste pour les lignes de catalogue
fixes, les alias de provider, les règles de suppression et le mode de découverte. L'actualisation du runtime
appartient toujours au code runtime du provider, mais le manifeste indique au cœur quand le runtime
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

Champs de premier niveau :

| Champ            | Type                                                     | Signification                                                                                                                                             |
| ---------------- | -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `providers`      | `Record<string, object>`                                 | Lignes de catalogue pour les identifiants de provider possédés par ce plugin. Les clés doivent également apparaître dans `providers` de premier niveau.   |
| `aliases`        | `Record<string, object>`                                 | Alias de provider qui doivent être résolus vers un provider possédé pour la planification du catalogue ou de la suppression.                              |
| `suppressions`   | `object[]`                                               | Lignes de modèle provenant d'une autre source que ce plugin supprime pour une raison spécifique au provider.                                              |
| `discovery`      | `Record<string, "static" \| "refreshable" \| "runtime">` | Indique si le catalogue du provider peut être lu à partir des métadonnées du manifeste, actualisé dans le cache, ou s'il nécessite un runtime.            |
| `runtimeAugment` | `boolean`                                                | Définissez `true` uniquement lorsque le runtime du provider doit ajouter des lignes de catalogue après la planification du manifeste/de la configuration. |

`aliases` participe à la recherche de propriété du provider pour la planification du catalogue de modèles.
Les cibles d'alias doivent être des providers de premier niveau détenus par le même plugin. Lorsqu'une
liste filtrée par provider utilise un alias, OpenClaw peut lire le manifeste propriétaire et
appliquer les remplacements d'alias d'API/d'URL de base sans charger le runtime du provider.
Les alias ne développent pas les listes de catalogue non filtrées ; les listes larges émettent uniquement les
lignes du provider canonique propriétaire.

`suppressions` remplace l'ancien hook de runtime du provider `suppressBuiltInModel`.
Les entrées de suppression sont honorées uniquement lorsque le provider est détenu par le plugin ou
déclaré comme une clé `modelCatalog.aliases` qui cible un provider détenu. Les hooks
de suppression de runtime ne sont plus appelés lors de la résolution du modèle.

Champs du provider :

| Champ     | Type                     | Signification                                                                        |
| --------- | ------------------------ | ------------------------------------------------------------------------------------ |
| `baseUrl` | `string`                 | URL de base par défaut facultative pour les modèles de ce catalogue de provider.     |
| `api`     | `ModelApi`               | Adaptateur d'API par défaut facultatif pour les modèles de ce catalogue de provider. |
| `headers` | `Record<string, string>` | En-têtes statiques facultatifs qui s'appliquent à ce catalogue de provider.          |
| `models`  | `object[]`               | Lignes de modèles requises. Les lignes sans `id` sont ignorées.                      |

Champs du modèle :

| Champ           | Type                                                           | Signification                                                                                                    |
| --------------- | -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `id`            | `string`                                                       | ID de modèle local au provider, sans le préfixe `provider/`.                                                     |
| `name`          | `string`                                                       | Nom d'affichage facultatif.                                                                                      |
| `api`           | `ModelApi`                                                     | Remplacement d'API facultatif par modèle.                                                                        |
| `baseUrl`       | `string`                                                       | Remplacement d'URL de base facultatif par modèle.                                                                |
| `headers`       | `Record<string, string>`                                       | En-têtes statiques facultatifs par modèle.                                                                       |
| `input`         | `Array<"text" \| "image" \| "document" \| "audio" \| "video">` | Modalités que le modèle accepte.                                                                                 |
| `reasoning`     | `boolean`                                                      | Indique si le modèle expose un comportement de raisonnement.                                                     |
| `contextWindow` | `number`                                                       | Fenêtre de contexte native du fournisseur.                                                                       |
| `contextTokens` | `number`                                                       | Plafond effectif optionnel du contexte d'exécution s'il diffère de `contextWindow`.                              |
| `maxTokens`     | `number`                                                       | Nombre maximum de jetons en sortie si connu.                                                                     |
| `cost`          | `object`                                                       | Tarification optionnelle en USD par million de jetons, incluant le `tieredPricing` optionnel.                    |
| `compat`        | `object`                                                       | Indicateurs de compatibilité optionnels correspondant à la compatibilité de la configuration du modèle OpenClaw. |
| `status`        | `"available"` \| `"preview"` \| `"deprecated"` \| `"disabled"` | Statut de l'affichage. Supprimer uniquement lorsque la ligne ne doit pas apparaître du tout.                     |
| `statusReason`  | `string`                                                       | Raison optionnelle affichée avec le statut non disponible.                                                       |
| `replaces`      | `string[]`                                                     | Anciens identifiants de modèle locaux au fournisseur que ce modèle remplace.                                     |
| `replacedBy`    | `string`                                                       | Identifiant de modèle local au fournisseur de remplacement pour les lignes obsolètes.                            |
| `tags`          | `string[]`                                                     | Balises stables utilisées par les sélecteurs et les filtres.                                                     |

Champs de suppression :

| Champ                      | Type       | Signification                                                                                                                   |
| -------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `provider`                 | `string`   | Identifiant du fournisseur pour la ligne en amont à supprimer. Doit être détenu par ce plugin ou déclaré comme un alias détenu. |
| `model`                    | `string`   | Identifiant de modèle local au fournisseur à supprimer.                                                                         |
| `reason`                   | `string`   | Message optionnel affiché lorsque la ligne supprimée est demandée directement.                                                  |
| `when.baseUrlHosts`        | `string[]` | Liste facultative des hôtes d'URL de base effectifs du provider requis avant que la suppression ne s'applique.                  |
| `when.providerConfigApiIn` | `string[]` | Liste facultative des valeurs exactes de la configuration du provider `api` requises avant que la suppression ne s'applique.    |

Ne placez pas de données exclusives à l'exécution dans `modelCatalog`. Utilisez `static` uniquement lorsque les lignes du manifeste sont suffisamment complètes pour que les listes filtrées par provider et les surfaces de sélecteur puissent ignorer la découverte du registre/runtime. Utilisez `refreshable` lorsque les lignes du manifeste sont des graines ou compléments listables utiles, mais qu'une actualisation ou un cache peut ajouter d'autres lignes plus tard ; les lignes actualisables ne sont pas autonomes. Utilisez `runtime` lorsque OpenClaw doit charger le runtime du provider pour connaître la liste.

## Référence modelIdNormalization

Utilisez `modelIdNormalization` pour un nettoyage économique de l'ID de modèle propriétaire du provider qui doit se produire avant le chargement du runtime du provider. Cela permet de conserver les alias tels que les noms de modèle courts, les ID locaux hérités du provider et les règles de préfixe de proxy dans le manifeste du plugin propriétaire plutôt que dans les tables de sélection de modèle principales.

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

| Champ                                | Type                    | Signification                                                                                                 |
| ------------------------------------ | ----------------------- | ------------------------------------------------------------------------------------------------------------- |
| `aliases`                            | `Record<string,string>` | Alias exacts d'ID de modèle insensibles à la casse. Les valeurs sont renvoyées telles qu'elles sont écrites.  |
| `stripPrefixes`                      | `string[]`              | Préfixes à supprimer avant la recherche d'alias, utiles pour les duplications de provider/modèle héritées.    |
| `prefixWhenBare`                     | `string`                | Préfixe à ajouter lorsque l'ID de modèle normalisé ne contient pas déjà `/`.                                  |
| `prefixWhenBareAfterAliasStartsWith` | `object[]`              | Règles conditionnelles de préfixe d'ID nu après la recherche d'alias, indexées par `modelPrefix` et `prefix`. |

## Référence providerEndpoints

Utilisez `providerEndpoints` pour la classification des points de terminaison que la politique de demande générique doit connaître avant le chargement du runtime du provider. Le cœur possède toujours la signification de chaque `endpointClass` ; les manifestes de plugin possèdent les métadonnées de l'hôte et de l'URL de base.

Champs de point de terminaison :

| Champ                          | Type       | Signification                                                                                                                                     |
| ------------------------------ | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `endpointClass`                | `string`   | Classe de point de terminaison principal connue, telle que `openrouter`, `moonshot-native` ou `google-vertex`.                                    |
| `hosts`                        | `string[]` | Noms d'hôte exacts qui correspondent à la classe de point de terminaison.                                                                         |
| `hostSuffixes`                 | `string[]` | Suffixes d'hôte qui correspondent à la classe de point de terminaison. Préfixez avec `.` pour une correspondance exclusive de suffixe de domaine. |
| `baseUrls`                     | `string[]` | URLs de base HTTP(S) normalisées exactes qui correspondent à la classe de point de terminaison.                                                   |
| `googleVertexRegion`           | `string`   | Région Google Vertex statique pour les hôtes globaux exacts.                                                                                      |
| `googleVertexRegionHostSuffix` | `string`   | Suffixe à supprimer des hôtes correspondants pour exposer le préfixe de région Google Vertex.                                                     |

## Référence providerRequest

Utilisez `providerRequest` pour les métadonnées de compatibilité de demande peu coûteuses dont la stratégie de demande générique a besoin sans charger le runtime du provider. Conservez la réécriture de charge utile spécifique au comportement dans les hooks du runtime du provider ou les helpers de famille de providers partagés.

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
| `compatibilityFamily` | `"moonshot"` | Bucket de compatibilité de famille de providers facultatif pour les helpers de demande partagés.                       |
| `openAICompletions`   | `object`     | Indicateurs de demande de complétions compatibles avec OpenAI, actuellement `supportsStreamingUsage`.                  |

## Référence secretProviderIntegrations

Utilisez `secretProviderIntegrations` lorsqu'un plugin peut publier un préréglage de provider exec SecretRef réutilisable. OpenClaw lit ces métadonnées avant le chargement du runtime du plugin, stocke la propriété du plugin dans `secrets.providers.<alias>.pluginIntegration` et laisse la résolution réelle des secrets au runtime SecretRef. Les préréglages sont exposés uniquement pour les plugins groupés et les plugins installés découverts à partir des racines d'installation de plugins gérées, telles que les installations git et ClawHub.

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

La clé de la carte est l'ID d'intégration. Si `providerAlias`OpenClaw est omis, OpenClaw utilise
l'ID d'intégration comme alias du provider SecretRef. Les alias de provider doivent correspondre
au modèle d'alias de provider SecretRef normal, par exemple `team-secrets` ou
`onepassword-work`.

Lorsqu'un opérateur sélectionne le préréglage, OpenClaw écrit une référence de provider comme suit :

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

Au démarrage/rechargement, OpenClaw résout ce provider en chargeant les métadonnées actuelles du
manifeste du plugin, en vérifiant que le plugin propriétaire est installé et actif, et
en matérialisant la commande exec à partir du manifeste. La désactivation ou la suppression du
plugin révoque le provider pour les SecretRefs actifs. Les opérateurs qui souhaitent une configuration
exec autonome peuvent toujours écrire manuellement des providers OpenClaw`command`/`args` directement.

Seuls les préréglages `source: "exec"` sont actuellement pris en charge. `command` doit
être `${node}`, et `args[0]` doit être un script de résolveur relatif à la racine du plugin `./`OpenClaw.
OpenClaw le matérialise au démarrage/rechargement vers l'exécutable Node actuel et
le chemin absolu du script dans le plugin. Les options Node telles que `--require`, `--import`,
`--loader`, `--env-file`, `--eval` et `--print` ne font pas partie du contrat de
préréglage du manifeste. Les opérateurs qui ont besoin de commandes non-Node peuvent configurer directement
des providers exec manuels autonomes.

OpenClaw dérive OpenClaw`trustedDirs` pour les préréglages de manifeste à partir de la racine du plugin et,
pour les préréglages `${node}`, du répertoire exécutable Node actuel. Les `trustedDirs`
créés par le manifeste sont ignorés. D'autres options de provider exec telles que `timeoutMs`,
`maxOutputBytes`, `jsonOnly`, `env`, `passEnv` et `allowInsecurePath` sont
transmises à la configuration normale du provider exec SecretRef.

## référence modelPricing

Utilisez `modelPricing` lorsqu'un fournisseur a besoin d'un comportement de tarification du plan de contrôle avant le chargement du runtime. Le cache de tarification du Gateway lit ces métadonnées sans importer le code runtime du fournisseur.

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
| `provider`                 | `string`           | ID de fournisseur de catalogue externe lorsqu'il diffère de l'ID de fournisseur OpenClaw, par exemple `z-ai` pour un fournisseur `zai`.                           |
| `passthroughProviderModel` | `boolean`          | Traiter les ID de modèle contenant des barres obliques comme des références fournisseur/modèle imbriquées, utile pour les fournisseurs proxy tels que OpenRouter. |
| `modelIdTransforms`        | `"version-dots"[]` | Variantes d'ID de modèle de catalogue externe supplémentaires. `version-dots` essaie les ID de version avec points comme `claude-opus-4.6`.                       |

### Index des fournisseurs OpenClaw

L'index des fournisseurs OpenClaw est des métadonnées d'aperçu appartenant à OpenClaw pour les fournisseurs dont les plugins ne sont peut-être pas encore installés. Il ne fait pas partie d'un manifeste de plugin. Les manifestes de plugin restent l'autorité pour les plugins installés. L'index des fournisseurs est le contrat de repli interne que les futures surfaces de fournisseur installable et de sélecteur de modèle pré-installation utiliseront lorsqu'un plugin de fournisseur n'est pas installé.

Ordre d'autorité du catalogue :

1. Configuration utilisateur.
2. Manifeste de plugin installé `modelCatalog`.
3. Cache du catalogue de modèles à partir d'une actualisation explicite.
4. Lignes d'aperçu de l'index de fournisseur OpenClaw.

L'index de fournisseur ne doit pas contenir de secrets, d'état activé, de crochets d'exécution (runtime hooks) ou de données de modèle spécifiques au compte en direct. Ses catalogues d'aperçu utilisent la même forme de ligne de fournisseur `modelCatalog` que les manifestes de plugin, mais doivent rester limités aux métadonnées d'affichage stables, sauf si les champs de l'adaptateur d'exécution tels que `api`, `baseUrl`, la tarification ou les indicateurs de compatibilité sont intentionnellement alignés avec le manifeste du plugin installé. Les fournisseurs avec une découverte `/models` en direct doivent écrire les lignes actualisées via le chemin de cache du catalogue de modèles explicite au lieu d'effectuer des appels d'API de fournisseur de liste normale ou d'intégration (onboarding).

Les entrées de l'index de fournisseur peuvent également contenir des métadonnées de plugin installable pour les fournisseurs dont le plugin a été déplacé hors du cœur (core) ou n'est pas encore installé par ailleurs. Ces métadonnées reflètent le modèle du catalogue de canaux : le nom du package, la spécification d'installation npm, l'intégrité attendue et les étiquettes de choix d'authentification peu coûteuses suffisent pour afficher une option de configuration installable. Une fois le plugin installé, son manifeste prime et l'entrée de l'index de fournisseur est ignorée pour ce fournisseur.

Les clés de capacités de niveau supérieur héritées sont déconseillées. Utilisez `openclaw doctor --fix` pour déplacer `speechProviders`, `realtimeTranscriptionProviders`, `realtimeVoiceProviders`, `mediaUnderstandingProviders`, `imageGenerationProviders`, `videoGenerationProviders`, `webFetchProviders` et `webSearchProviders` sous `contracts` ; le chargement normal des manifestes ne traite plus ces champs de niveau supérieur comme une propriété de capacité.

## Manifeste versus package.

Les deux fichiers servent des travaux différents :

| Fichier                | Utilisez-le pour                                                                                                                                                                |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `openclaw.plugin.json` | Découverte, validation de configuration, métadonnées de choix d'authentification et indices d'interface utilisateur qui doivent exister avant l'exécution du code du plugin     |
| `package.json`         | Métadonnées npm, installation des dépendances et le bloc `openclaw` utilisé pour les points d'entrée, la porte d'installation, la configuration ou les métadonnées du catalogue |

Si vous n'êtes pas sûr de l'appartenance d'une métadonnée, utilisez cette règle :

- si OpenClaw doit le connaître avant de charger le code du plugin, placez-le dans OpenClaw`openclaw.plugin.json`
- s'il s'agit du packaging, des fichiers d'entrée ou du comportement de npm install, placez-le dans npm`package.json`

### champs package. affectant la découverte

Certaines métadonnées de pré-exécution du plugin résident intentionnellement dans `package.json` sous le bloc
`openclaw` au lieu de `openclaw.plugin.json`.
`openclaw.bundle` et `openclaw.bundle.json`OpenClaw ne sont pas des contrats de plugin OpenClaw ;
les plugins natifs doivent utiliser `openclaw.plugin.json` ainsi que les champs
`package.json#openclaw` pris en charge ci-dessous.

Exemples importants :

| Champ                                                                                      | Signification                                                                                                                                                                                                                                        |
| ------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `openclaw.extensions`                                                                      | Déclare les points d'entrée des plugins natifs. Doit rester dans le répertoire du package du plugin.                                                                                                                                                 |
| `openclaw.runtimeExtensions`                                                               | Déclare les points d'entrée d'exécution JavaScript construits pour les packages installés. Doit rester dans le répertoire du package du plugin.                                                                                                      |
| `openclaw.setupEntry`                                                                      | Point d'entrée léger, réservé à la configuration, utilisé lors de l'intégration (onboarding), du démarrage différé du canal, et de la découverte du statut du canal/SecretRef en lecture seule. Doit rester dans le répertoire du package du plugin. |
| `openclaw.runtimeSetupEntry`                                                               | Déclare le point d'entrée de configuration JavaScript construit pour les packages installés. Nécessite `setupEntry`, doit exister et rester dans le répertoire du package du plugin.                                                                 |
| `openclaw.channel`                                                                         | Métadonnées de catalogue de canal peu coûteuses comme les étiquettes, les chemins de documentation, les alias et le texte de sélection.                                                                                                              |
| `openclaw.channel.commands`                                                                | Métadonnées de valeur par défaut automatique pour les commandes natives et les compétences natives, utilisées par la configuration, l'audit et les listes de commandes avant le chargement de l'exécution du canal.                                  |
| `openclaw.channel.configuredState`                                                         | Métadonnées de vérificateur d'état configuré léger capables de répondre à « une configuration environnementale existe-t-elle déjà ? » sans charger l'intégralité de l'exécution du canal.                                                            |
| `openclaw.channel.persistedAuthState`                                                      | Métadonnées de vérificateur d'authentification persistante légères capables de répondre à « quelque chose est-il déjà connecté ? » sans charger l'intégralité de l'exécution du canal.                                                               |
| `openclaw.install.clawhubSpec` / `openclaw.install.npmSpec` / `openclaw.install.localPath` | Indices d'installation/de mise à jour pour les plugins groupés et publiés en externe.                                                                                                                                                                |
| `openclaw.install.defaultChoice`                                                           | Chemin d'installation préféré lorsque plusieurs sources d'installation sont disponibles.                                                                                                                                                             |
| `openclaw.install.minHostVersion`                                                          | Version minimale prise en charge de l'hôte OpenClaw, utilisant un plancher semver comme `>=2026.3.22` ou `>=2026.5.1-beta.1`.                                                                                                                        |
| `openclaw.compat.pluginApi`                                                                | Plage de l'OpenClaw du plugin API minimale requise par ce paquet, utilisant un plancher semver comme `>=2026.5.27`.                                                                                                                                  |
| `openclaw.install.expectedIntegrity`                                                       | Chaîne d'intégrité de dist npm attendue, telle que `sha512-...` ; les flux d'installation et de mise à jour vérifient l'artefact récupéré par rapport à celle-ci.                                                                                    |
| `openclaw.install.allowInvalidConfigRecovery`                                              | Permet un chemin de récupération de réinstallation étroit pour les plugins groupés lorsque la configuration est invalide.                                                                                                                            |
| `openclaw.startup.deferConfiguredChannelFullLoadUntilAfterListen`                          | Permet aux surfaces du canal de configuration d'exécution (setup-runtime channel) de se charger avant l'écoute, puis diffère le plugin de canal entièrement configuré jusqu'à l'activation après l'écoute.                                           |

Les métadonnées du manifeste déterminent quels choix de fournisseur/canal/configuration apparaissent dans l'intégration avant le chargement du runtime. `package.json#openclaw.install` indique à l'intégration comment récupérer ou activer ce plugin lorsque l'utilisateur choisit l'une de ces options. Ne déplacez pas les indices d'installation dans `openclaw.plugin.json`.

`openclaw.install.minHostVersion` est appliqué lors de l'installation et du chargement du registre de manifeste pour les sources de plugins non groupés. Les valeurs invalides sont rejetées ; les valeurs plus récentes mais valides ignorent les plugins externes sur les hôtes plus anciens. Les plugins sources groupés sont supposés être co-versionnés avec l'extraction de l'hôte.

`openclaw.compat.pluginApi` est appliqué lors de l'installation du package pour les sources de plugins non groupés. Utilisez-le pour le plancher du SDK/d'exécution du plugin OpenClaw API contre lequel le package a été construit. Il peut être plus strict que `minHostVersion` lorsqu'un package de plugin nécessite une API plus récente mais conserve tout de même une indication d'installation inférieure pour d'autres flux. La publication officielle OpenClaw synchronise par défaut les planchers d'API de plugin officiels existants avec la version de publication OpenClaw, mais les publications de plugins uniquement peuvent conserver un plancher inférieur lorsque le package prend en charge intentionnellement des hôtes plus anciens. N'utilisez pas la version du package seule comme contrat de compatibilité. `peerDependencies.openclaw` reste les métadonnées du package npm ; OpenClaw utilise le contrat `openclaw.compat.pluginApi` pour les décisions de compatibilité d'installation.

Les métadonnées officielles d'installation à la demande doivent utiliser `clawhubSpec` lorsque le plugin est publié sur ClawHub ; l'intégration considère cela comme la source distante préférée et enregistre les faits d'artefact ClawHub après l'installation. `npmSpec` reste le repli de compatibilité pour les packages qui n'ont pas encore migré vers ClawHub.

L'épinglage exact de la version npm réside déjà dans npm`npmSpec`, par exemple
`"npmSpec": "@wecom/wecom-openclaw-plugin@1.2.3"`. Les entrées de catalogue externe officiel
doivent associer des spécifications exactes à `expectedIntegrity`npmnpm afin que les flux de mise à jour échouent
fermement si l'artefact npm récupéré ne correspond plus à la version épinglée.
L'intégration interactive offre toujours des spécifications npm de registre de confiance, y compris des noms
de package nus et des balises de distribution, pour la compatibilité. Les diagnostics de catalogue peuvent
distinguer les sources exactes, flottantes, épinglées par intégrité, à intégrité manquante, de non-concordance de nom de
package, et de choix par défaut invalides. Ils avertissent également lorsque
`expectedIntegrity`npm est présent mais qu'il n'y a pas de source npm valide à laquelle il peut s'attacher.
Lorsque `expectedIntegrity` est présent,
les flux d'installation/de mise à jour l'appliquent ; lorsqu'il est omis, la résolution du registre est
enregistrée sans épinglage d'intégrité.

Les plugins de channel doivent fournir `openclaw.setupEntry` lorsque l'état, la liste de channel,
ou les analyses SecretRef doivent identifier les comptes configurés sans charger l'intégralité du
runtime. L'entrée de configuration doit exposer les métadonnées du channel ainsi que les adaptateurs de configuration sûrs pour l'installation,
l'état et les secrets ; conservez les clients réseau, les écouteurs de passerelle et les
runtimes de transport dans le point d'entrée principal de l'extension.

Les champs de point d'entrée du runtime ne remplacent pas les vérifications de limites de package pour les champs de point d'entrée
de la source. Par exemple, `openclaw.runtimeExtensions` ne peut pas rendre un chemin
`openclaw.extensions` échappé chargeable.

`openclaw.install.allowInvalidConfigRecovery` est volontairement restreint. Il ne
rend pas les configurations cassées arbitraires installables. Aujourd'hui, il permet uniquement aux flux d'
installation de récupérer de échecs spécifiques de mise à niveau de plugin en bundle obsolète, tels qu'un
chemin de plugin en bundle manquant ou une entrée `channels.<id>` obsolète pour ce même
plugin en bundle. Les erreurs de configuration non liées bloquent toujours l'installation et redirigent les opérateurs
vers `openclaw doctor --fix`.

`openclaw.channel.persistedAuthState` sont les métadonnées de package pour un tiny checker
module :

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

Utilisez-le lorsque les flux de configuration, de diagnostic, d'état ou de présence en lecture seule nécessitent une sonde d'authentification oui/non peu coûteuse avant le chargement complet du plugin de canal. L'état d'authentification persisté n'est pas l'état configuré du canal : n'utilisez pas ces métadonnées pour activer automatiquement les plugins, réparer les dépendances d'exécution ou décider si un runtime de canal doit être chargé. L'export cible doit être une petite fonction qui lit uniquement l'état persisté ; ne l'acheminez pas via le barrel du runtime complet du canal.

`openclaw.channel.configuredState` suit la même structure pour les vérifications configurées uniquement par env peu coûteuses :

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

Utilisez-le lorsqu'un canal peut répondre à l'état configuré à partir de l'environnement ou d'autres petites entrées non liées à l'exécution. Si la vérification nécessite une résolution complète de la configuration ou le vrai runtime du canal, gardez plutôt cette logique dans le hook `config.hasConfiguredState` du plugin.

## Priorité de découverte (identifiants de plugin en double)

OpenClaw découvre les plugins à partir de plusieurs racines. Pour l'ordre de analyse du système de fichiers brut, voir [Ordre d'analyse des plugins](/fr/gateway/configuration-reference#plugin-scan-order). Si deux découvertes partagent le même `id`, seul le manifeste de **plus haute priorité** est conservé ; les doublons de priorité inférieure sont abandonnés au lieu d'être chargés à côté.

Priorité, du plus haut au plus bas :

1. **Sélectionné par la configuration** — un chemin explicitement épinglé dans `plugins.entries.<id>`
2. **Groupé (Bundled)** — plugins livrés avec OpenClaw
3. **Installation globale** — plugins installés dans la racine globale des plugins OpenClaw
4. **Espace de travail** — plugins découverts relativement à l'espace de travail actuel

Implications :

- Une copie forkée ou obsolète d'un plugin groupé située dans l'espace de travail ne masquera pas la version groupée.
- Pour réellement remplacer un plugin groupé par un plugin local, épinglez-le via `plugins.entries.<id>` afin qu'il gagne par priorité plutôt que de s'appuyer sur la découverte de l'espace de travail.
- Les abandons de doublons sont consignés pour que le diagnostic Doctor et de démarrage puisse pointer vers la copie supprimée.
- Les remplacements de doublons sélectionnés par la configuration sont présentés comme des remplacements explicites dans les diagnostics, mais avertissent toujours pour que les forks obsolètes et les masquages accidentels restent visibles.

## Exigences du schéma JSON

- **Chaque plugin doit fournir un schéma JSON**, même s'il n'accepte aucune configuration.
- Un schéma vide est acceptable (par exemple, `{ "type": "object", "additionalProperties": false }`).
- Les schémas sont validés au moment de la lecture/écriture de la configuration, et non au moment de l'exécution.
- Lors de l'extension ou de la duplication d'un plugin groupé avec de nouvelles clés de configuration, mettez à jour le `openclaw.plugin.json` `configSchema` de ce plugin en même temps. Les schémas des plugins groupés sont stricts, donc l'ajout de `plugins.entries.<id>.config.myNewKey` dans la configuration utilisateur sans ajouter `myNewKey` au `configSchema.properties` sera rejeté avant le chargement du runtime du plugin.

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

- Les clés `channels.*` inconnues sont des **erreurs**, sauf si l'identifiant de channel est déclaré par
  un manifeste de plugin.
- `plugins.entries.<id>`, `plugins.allow`, `plugins.deny` et `plugins.slots.*`
  doivent référencer des identifiants de plugin **découvrables**. Les identifiants inconnus sont des **erreurs**.
- Si un plugin est installé mais possède un manifeste ou un schéma cassé ou manquant,
  la validation échoue et Doctor signale l'erreur du plugin.
- Si la configuration d'un plugin existe mais que le plugin est **désactivé**, la configuration est conservée et
  un **avertissement** est affiché dans Doctor + les journaux.

Consultez [Référence de la configuration](/fr/gateway/configuration) pour le schéma complet de `plugins.*`.

## Notes

- Le manifeste est **requis pour les plugins natifs OpenClaw**, y compris pour les chargements depuis le système de fichiers local. Le runtime charge toujours le module du plugin séparément ; le manifeste sert uniquement à la découverte + validation.
- Les manifestes natifs sont analysés avec JSON5, donc les commentaires, les virgules finales et les clés non citées sont acceptés tant que la valeur finale reste un objet.
- Seuls les champs de manifeste documentés sont lus par le chargeur de manifeste. Évitez les clés personnalisées de premier niveau.
- `channels`, `providers`, `cliBackends` et `skills` peuvent tous être omis lorsqu'un plugin n'en a pas besoin.
- `providerCatalogEntry` doit rester léger et ne doit pas importer de code runtime étendu ; utilisez-le pour les métadonnées statiques du catalogue de provider ou des descripteurs de découverte étroits, et non pour l'exécution au moment de la requête.
- Les types de plug-in exclusifs sont sélectionnés via `plugins.slots.*` : `kind: "memory"` via `plugins.slots.memory`, `kind: "context-engine"` via `plugins.slots.contextEngine` (par défaut `legacy`).
- Déclarez le type de plug-in exclusif dans ce manifeste. L'entrée d'exécution `OpenClawPluginDefinition.kind` est obsolète et ne reste qu'une solution de repli de compatibilité pour les plug-in plus anciens.
- Les métadonnées de la variable d'environnement (`setup.providers[].envVars`, `providerAuthEnvVars` obsolète, et `channelEnvVars`) sont purement déclaratives. Les surfaces de statut, d'audit, de validation de la livraison cron et d'autres surfaces en lecture seule appliquent toujours la confiance du plug-in et la politique d'activation effective avant de considérer une variable d'environnement comme configurée.
- Pour les métadonnées de l'assistant d'exécution nécessitant du code de fournisseur, consultez [Provider runtime hooks](/fr/plugins/architecture-internals#provider-runtime-hooks).
- Si votre plug-in dépend de modules natifs, documentez les étapes de construction et toutes les exigences de liste blanche des gestionnaires de paquets (par exemple, pnpm `allow-build-scripts` + `pnpm rebuild <package>`).

## Connexes

<CardGroup cols={3}>
  <Card title="Building plugins" href="/fr/plugins/building-plugins" icon="rocket">
    Getting started with plugins.
  </Card>
  <Card title="Plugin architecture" href="/fr/plugins/architecture" icon="diagram-project">
    Architecture interne et modèle de capacité.
  </Card>
  <Card title="SDK overview" href="/fr/plugins/sdk-overview" icon="book">
    Référence du SDK de plug-in et des importations de sous-chemin.
  </Card>
</CardGroup>
