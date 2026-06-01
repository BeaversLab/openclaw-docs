---
summary: "Manifeste de plugin + exigences de schéma JSON (validation de configuration stricte)"
read_when:
  - You are building an OpenClaw plugin
  - You need to ship a plugin config schema or debug plugin validation errors
title: "Manifeste de plugin"
---

Cette page concerne uniquement le **manifeste du plugin natif OpenClaw**.

Pour les structures de bundle compatibles, voir [Plugins bundles](/fr/plugins/bundles).

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
[Modèle de capacité](/fr/plugins/architecture#public-capability-model).

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

| Champ                                | Obligatoire | Type                             | Signification                                                                                                                                                                                                                                                                                                                                                |
| ------------------------------------ | ----------- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `id`                                 | Oui         | `string`                         | Identifiant canonique du plugin. C'est l'identifiant utilisé dans `plugins.entries.<id>`.                                                                                                                                                                                                                                                                    |
| `configSchema`                       | Oui         | `object`                         | Schéma JSON en ligne pour la configuration de ce plugin.                                                                                                                                                                                                                                                                                                     |
| `requiresPlugins`                    | Non         | `string[]`                       | Identifiants de plugins qui doivent également être installés pour que ce plugin soit efficace. Discovery maintient le plugin chargeable mais avertit lorsqu'un plugin requis est manquant.                                                                                                                                                                   |
| `enabledByDefault`                   | Non         | `true`                           | Marque un plugin groupé comme activé par défaut. Omettez-le, ou définissez une valeur autre que `true`, pour laisser le plugin désactivé par défaut.                                                                                                                                                                                                         |
| `enabledByDefaultOnPlatforms`        | Non         | `string[]`                       | Marque un plugin groupé comme activé par défaut uniquement sur les plateformes Node.js répertoriées, par exemple `["darwin"]`. La configuration explicite prime toujours.                                                                                                                                                                                    |
| `legacyPluginIds`                    | Non         | `string[]`                       | Identifiants hérités qui sont normalisés vers cet identifiant de plugin canonique.                                                                                                                                                                                                                                                                           |
| `autoEnableWhenConfiguredProviders`  | Non         | `string[]`                       | Identifiants de provider qui doivent activer automatiquement ce plugin lorsque l'authentification, la configuration ou les références de modèle les mentionnent.                                                                                                                                                                                             |
| `kind`                               | Non         | `"memory"` \| `"context-engine"` | Déclare un type de plugin exclusif utilisé par `plugins.slots.*`.                                                                                                                                                                                                                                                                                            |
| `channels`                           | Non         | `string[]`                       | Identifiants de canal détenus par ce plugin. Utilisés pour la découverte et la validation de la configuration.                                                                                                                                                                                                                                               |
| `providers`                          | Non         | `string[]`                       | Identifiants de provider détenus par ce plugin.                                                                                                                                                                                                                                                                                                              |
| `providerCatalogEntry`               | Non         | `string`                         | Chemin de module de catalogue de provider léger, relatif à la racine du plugin, pour les métadonnées de catalogue de provider limitées au manifeste qui peuvent être chargées sans activer l'environnement d'exécution complet du plugin.                                                                                                                    |
| `modelSupport`                       | Non         | `object`                         | Métadonnées abrégées de famille de modèle détenues par le manifeste, utilisées pour charger automatiquement le plugin avant l'exécution.                                                                                                                                                                                                                     |
| `modelCatalog`                       | Non         | `object`                         | Métadonnées de catalogue de modèles déclaratifs pour les providers possédés par ce plugin. Il s'agit du contrat du plan de contrôle pour le listing en lecture seule, l'intégration (onboarding), les sélecteurs de modèles, les alias et la suppression futurs, sans charger le runtime du plugin.                                                          |
| `modelPricing`                       | Non         | `object`                         | Stratégie de recherche de tarification externe possédée par le provider. Utilisez-la pour exclure les providers locaux/auto-hébergés des catalogues de tarification distants ou pour mapper les références de provider aux identifiants de catalogue OpenRouter/LiteLLM sans coder en dur les identifiants de provider dans le cœur.                         |
| `modelIdNormalization`               | Non         | `object`                         | Nettoyage des alias/préfixes d'identifiants de modèles possédé par le provider, qui doit s'exécuter avant le chargement du runtime du provider.                                                                                                                                                                                                              |
| `providerEndpoints`                  | Non         | `object[]`                       | Métadonnées d'hôte/baseUrl de point de terminaison possédées par le manifeste pour les routes de provider que le cœur doit classer avant le chargement du runtime du provider.                                                                                                                                                                               |
| `providerRequest`                    | Non         | `object`                         | Métadonnées de famille de provider et de compatibilité des requêtes à faible coût utilisées par la stratégie de requête générique avant le chargement du runtime du provider.                                                                                                                                                                                |
| `cliBackends`                        | Non         | `string[]`                       | Identifiants de backend d'inférence CLI possédés par ce plugin. Utilisés pour l'auto-activation au démarrage à partir de références de configuration explicites.                                                                                                                                                                                             |
| `syntheticAuthRefs`                  | Non         | `string[]`                       | Références de backend de provider ou CLI dont le hook d'authentification synthétique possédé par le plugin doit être sondé lors de la découverte à froid des modèles avant le chargement du runtime.                                                                                                                                                         |
| `nonSecretAuthMarkers`               | Non         | `string[]`                       | Valeurs de clé d'API API de substitution possédées par le plugin groupé qui représentent un état d'identification local non secret, OAuth ou ambiant.                                                                                                                                                                                                        |
| `commandAliases`                     | Non         | `object[]`                       | Noms de commandes possédés par ce plugin qui doivent produire une configuration et des diagnostics CLI conscients du plugin avant le chargement du runtime.                                                                                                                                                                                                  |
| `providerAuthEnvVars`                | Non         | `Record<string, string[]>`       | Métadonnées d'environnement de compatibilité obsolètes pour la recherche d'authentification/état du provider. Privilégiez `setup.providers[].envVars` pour les nouveaux plugins ; OpenClaw lit encore ceci pendant la fenêtre de dépréciation.                                                                                                               |
| `providerAuthAliases`                | Non         | `Record<string, string>`         | Identifiants de fournisseur qui doivent réutiliser un autre identifiant de fournisseur pour la recherche d'authentification, par exemple un fournisseur de codage qui partage la clé API du fournisseur de base et les profils d'authentification API.                                                                                                       |
| `channelEnvVars`                     | Non         | `Record<string, string[]>`       | Métadonnées d'environnement de canal peu coûteuses que OpenClaw peut inspecter sans charger le code du plugin. Utilisez ceci pour la configuration de canal pilotée par l'environnement ou les surfaces d'authentification que les aides génériques de démarrage/configuration devraient voir.                                                               |
| `providerAuthChoices`                | Non         | `object[]`                       | Métadonnées de choix d'authentification peu coûteuses pour les sélecteurs d'intégration, la résolution de fournisseur préféré et le câblage simple des drapeaux CLI.                                                                                                                                                                                         |
| `activation`                         | Non         | `object`                         | Métadonnées du planificateur d'activation peu coûteuses pour le démarrage, le fournisseur, la commande, le canal, l'itinéraire et le chargement déclenché par des capacités. Uniquement des métadonnées ; le runtime du plugin possède toujours le comportement réel.                                                                                        |
| `setup`                              | Non         | `object`                         | Descripteurs de configuration/intégration peu coûteux que les surfaces de découverte et de configuration peuvent inspecter sans charger le runtime du plugin.                                                                                                                                                                                                |
| `qaRunners`                          | Non         | `object[]`                       | Descripteurs de runner QA peu coûteux utilisés par l'hôte `openclaw qa` partagé avant le chargement du runtime du plugin.                                                                                                                                                                                                                                    |
| `contracts`                          | Non         | `object`                         | Instantané statique de la propriété des capacités pour les crochets d'authentification externe, les intégrations, la parole, la transcription en temps réel, la voix en temps réel, la compréhension des médias, la génération d'images, la génération de musique, la génération de vidéo, la récupération Web, la recherche Web et la propriété des outils. |
| `mediaUnderstandingProviderMetadata` | Non         | `Record<string, object>`         | Valeurs par défaut peu coûteuses pour la compréhension des médias pour les identifiants de fournisseur déclarés dans `contracts.mediaUnderstandingProviders`.                                                                                                                                                                                                |
| `imageGenerationProviderMetadata`    | Non         | `Record<string, object>`         | Métadonnées d'authentification de génération d'images peu coûteuses pour les identifiants de fournisseur déclarés dans `contracts.imageGenerationProviders`, y compris les alias d'authentification possédés par le fournisseur et les gardes d'URL de base.                                                                                                 |
| `videoGenerationProviderMetadata`    | Non         | `Record<string, object>`         | Métadonnées d'authentification de génération de vidéo peu coûteuses pour les identifiants de fournisseur déclarés dans `contracts.videoGenerationProviders`, y compris les alias d'authentification possédés par le fournisseur et les gardes d'URL de base.                                                                                                 |
| `musicGenerationProviderMetadata`    | Non         | `Record<string, object>`         | Métadonnées d'auth bon marché pour la génération de musique pour les ids de provider déclarés dans `contracts.musicGenerationProviders`, y compris les alias d'auth détenus par le provider et les gardes d'URL de base.                                                                                                                                     |
| `toolMetadata`                       | Non         | `Record<string, object>`         | Métadonnées de disponibilité bon marché pour les outils détenus par le plugin déclarés dans `contracts.tools`. À utiliser lorsqu'un outil ne doit pas charger le runtime sauf si une configuration, un env ou une preuve d'auth existe.                                                                                                                      |
| `channelConfigs`                     | Non         | `Record<string, object>`         | Métadonnées de configuration de channel détenues par le manifeste, fusionnées dans les surfaces de découverte et de validation avant le chargement du runtime.                                                                                                                                                                                               |
| `skills`                             | Non         | `string[]`                       | Répertoires de compétences à charger, relatifs à la racine du plugin.                                                                                                                                                                                                                                                                                        |
| `name`                               | Non         | `string`                         | Nom du plugin lisible par l'homme.                                                                                                                                                                                                                                                                                                                           |
| `description`                        | Non         | `string`                         | Résumé court affiché dans les surfaces du plugin.                                                                                                                                                                                                                                                                                                            |
| `version`                            | Non         | `string`                         | Version du plugin à titre informatif.                                                                                                                                                                                                                                                                                                                        |
| `uiHints`                            | Non         | `Record<string, object>`         | Étiquettes d'interface utilisateur, espaces réservés et indices de sensibilité pour les champs de configuration.                                                                                                                                                                                                                                             |

## Référence des métadonnées du provider de génération

Les champs de métadonnées du provider de génération décrivent des signaux d'auth statiques pour
les providers déclarés dans la liste `contracts.*GenerationProviders` correspondante.
OpenClaw lit ces champs avant le chargement du runtime du provider afin que les outils principaux puissent
décider si un provider de génération est disponible sans importer chaque
plugin de provider.

Utilisez ces champs uniquement pour des faits déclaratifs bon marché. Le transport, les
transformations de requête, le rafraîchissement des jetons, la validation des informations d'identification et le comportement de génération réel
restent dans le runtime du plugin.

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

| Champ                  | Obligatoire | Type       | Signification                                                                                                                                                                           |
| ---------------------- | ----------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `aliases`              | Non         | `string[]` | Ids de provider supplémentaires qui doivent compter comme des alias d'auth statiques pour le provider de génération.                                                                    |
| `authProviders`        | Non         | `string[]` | Ids de provider dont les profils d'auth configurés doivent compter comme une auth pour ce provider de génération.                                                                       |
| `configSignals`        | Non         | `object[]` | Signaux de disponibilité bon marché basés uniquement sur la configuration pour les providers locaux ou auto-hébergés qui peuvent être configurés sans profils d'auth ou env vars.       |
| `authSignals`          | Non         | `object[]` | Signaux d'authentification explicites. Lorsqu'ils sont présents, ils remplacent l'ensemble de signaux par défaut provenant de l'identifiant du provider, `aliases`, et `authProviders`. |
| `referenceAudioInputs` | Non         | `boolean`  | Génération de vidéo uniquement. Définissez sur `true` lorsque le provider accepte des ressources audio de référence ; sinon, `video_generate` masque les paramètres de référence audio. |

Chaque entrée `configSignals` prend en charge :

| Champ         | Obligatoire | Type       | Signification                                                                                                                                                                                                                                            |
| ------------- | ----------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `rootPath`    | Oui         | `string`   | Chemin en notation pointée vers l'objet de configuration détenu par le plugin à inspecter, par exemple `plugins.entries.example.config`.                                                                                                                 |
| `overlayPath` | Non         | `string`   | Chemin en notation pointée à l'intérieur de la configuration racine dont l'objet doit se superposer à l'objet racine avant l'évaluation du signal. Utilisez ceci pour une configuration spécifique à une capacité telle que `image`, `video` ou `music`. |
| `required`    | Non         | `string[]` | Chemins en notation pointée à l'intérieur de la configuration effective qui doivent avoir des valeurs configurées. Les chaînes ne doivent pas être vides ; les objets et les tableaux ne doivent pas être vides.                                         |
| `requiredAny` | Non         | `string[]` | Chemins en notation pointée à l'intérieur de la configuration effective dont au moins un doit avoir une valeur configurée.                                                                                                                               |
| `mode`        | Non         | `object`   | Garantie de mode de chaîne optionnelle à l'intérieur de la configuration effective. Utilisez ceci lorsque la disponibilité basée uniquement sur la configuration s'applique à un seul mode.                                                              |

Chaque garantie `mode` prend en charge :

| Champ        | Obligatoire | Type       | Ce que cela signifie                                                                                     |
| ------------ | ----------- | ---------- | -------------------------------------------------------------------------------------------------------- |
| `path`       | Non         | `string`   | Chemin en notation pointée à l'intérieur de la configuration effective. La valeur par défaut est `mode`. |
| `default`    | Non         | `string`   | Valeur de mode à utiliser lorsque la configuration omet le chemin.                                       |
| `allowed`    | Non         | `string[]` | Si présent, le signal réussit uniquement lorsque le mode effectif est l'une de ces valeurs.              |
| `disallowed` | Non         | `string[]` | Si présent, le signal échoue lorsque le mode effectif est l'une de ces valeurs.                          |

Chaque entrée `authSignals` prend en charge :

| Champ             | Obligatoire | Type     | Signification                                                                                                                                                                                            |
| ----------------- | ----------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `provider`        | Oui         | `string` | Id du provider à vérifier dans les profils d'auth configurés.                                                                                                                                            |
| `providerBaseUrl` | Non         | `object` | Garde optionnelle qui fait que le signal ne compte que lorsque le provider configuré référencé utilise une URL de base autorisée. À utiliser lorsqu'un alias d'auth n'est valide que pour certaines API. |

Chaque garde `providerBaseUrl` prend en charge :

| Champ             | Obligatoire | Type       | Signification                                                                                                                                                            |
| ----------------- | ----------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `provider`        | Oui         | `string`   | Id de config du provider dont le `baseUrl` doit être vérifié.                                                                                                            |
| `defaultBaseUrl`  | Non         | `string`   | URL de base à supposer lorsque la config du provider omet `baseUrl`.                                                                                                     |
| `allowedBaseUrls` | Oui         | `string[]` | URLs de base autorisées pour ce signal d'auth. Le signal est ignoré lorsque l'URL de base configurée ou par défaut ne correspond pas à l'une de ces valeurs normalisées. |

## Référence des métadonnées de l'outil

`toolMetadata` utilise les mêmes formes `configSignals` et `authSignals` que
les métadonnées du provider de génération, indexées par le nom de l'outil. `contracts.tools` déclare
la propriété. `toolMetadata` déclare des preuves de disponibilité peu coûteuses afin qu'OpenClaw puisse
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

Si un outil n'a pas de `toolMetadata`, OpenClaw conserve le comportement existant et
charge le plugin propriétaire lorsque le contrat de l'outil correspond à la stratégie. Pour les outils
du chemin critique dont la fabrique dépend de l'auth/config, les auteurs de plugins devraient déclarer
`toolMetadata` au lieu de faire importer le runtime par le cœur pour demander.

## Référence de providerAuthChoices

Chaque entrée `providerAuthChoices` décrit un choix d'onboarding ou d'auth.
OpenClaw lit ceci avant le chargement du runtime du provider.
Les listes de configuration du provider utilisent ces choix de manifeste, les choix de configuration
dérivés des descripteurs et les métadonnées du catalogue d'installation sans charger le runtime du provider.

| Champ                 | Obligatoire | Type                                                                  | Signification                                                                                               |
| --------------------- | ----------- | --------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `provider`            | Oui         | `string`                                                              | Id du provider auquel ce choix appartient.                                                                  |
| `method`              | Oui         | `string`                                                              | ID de la méthode d'authentification vers laquelle dispatcher.                                               |
| `choiceId`            | Oui         | `string`                                                              | ID de choix d'authentification stable utilisé par les flux d'intégration et de CLI.                         |
| `choiceLabel`         | Non         | `string`                                                              | Libellé destiné à l'utilisateur. Si omis, OpenClaw utilise par défaut `choiceId`.                           |
| `choiceHint`          | Non         | `string`                                                              | Texte d'aide court pour le sélecteur.                                                                       |
| `assistantPriority`   | Non         | `number`                                                              | Les valeurs inférieures sont triées en premier dans les sélecteurs interactifs pilotés par l'assistant.     |
| `assistantVisibility` | Non         | `"visible"` \| `"manual-only"`                                        | Masquer le choix dans les sélecteurs de l'assistant tout en autorisant la sélection manuelle via la CLI.    |
| `deprecatedChoiceIds` | Non         | `string[]`                                                            | ID de choix hérités qui doivent rediriger les utilisateurs vers ce choix de remplacement.                   |
| `groupId`             | Non         | `string`                                                              | ID de groupe optionnel pour regrouper les choix connexes.                                                   |
| `groupLabel`          | Non         | `string`                                                              | Libellé destiné à l'utilisateur pour ce groupe.                                                             |
| `groupHint`           | Non         | `string`                                                              | Texte d'aide court pour le groupe.                                                                          |
| `optionKey`           | Non         | `string`                                                              | Clé d'option interne pour les flux d'authentification simples à un seul indicateur.                         |
| `cliFlag`             | Non         | `string`                                                              | Nom de l'indicateur CLI, tel que `--openrouter-api-key`.                                                    |
| `cliOption`           | Non         | `string`                                                              | Forme complète de l'option CLI, telle que `--openrouter-api-key <key>`.                                     |
| `cliDescription`      | Non         | `string`                                                              | Description utilisée dans l'aide de la CLI.                                                                 |
| `onboardingScopes`    | Non         | `Array<"text-inference" \| "image-generation" \| "music-generation">` | Surfaces d'intégration où ce choix doit apparaître. Si omis, la valeur par défaut est `["text-inference"]`. |

## référence commandAliases

Utilisez `commandAliases` lorsqu'un plugin possède un nom de commande d'exécution que les utilisateurs
peuvent placer par erreur dans `plugins.allow` ou essayer d'exécuter en tant que commande racine de CLI. OpenClaw
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

| Champ        | Obligatoire | Type              | Signification                                                                                  |
| ------------ | ----------- | ----------------- | ---------------------------------------------------------------------------------------------- |
| `name`       | Oui         | `string`          | Nom de la commande qui appartient à ce plugin.                                                 |
| `kind`       | Non         | `"runtime-slash"` | Marque l'alias comme une commande slash de chat plutôt qu'une commande CLI racine.             |
| `cliCommand` | Non         | `string`          | Commande CLI racine associée à suggérer pour les opérations CLI, si une telle commande existe. |

## référence d'activation

Utilisez `activation` lorsque le plugin peut déclarer facilement quels événements du plan de contrôle
doivent l'inclure dans un plan d'activation/chargement.

Ce bloc est des métadonnées du planificateur, et non une API de cycle de vie. Il n'enregistre pas
le comportement d'exécution, ne remplace pas `register(...)` et ne garantit pas que
le code du plugin a déjà été exécuté. Le planificateur d'activation utilise ces champs pour
réduire la liste des plugins candidats avant de revenir aux métadonnées de propriété
du manifeste existant telles que `providers`, `channels`, `commandAliases`, `setup.providers`,
`contracts.tools` et les hooks.

Préférez les métadonnées les plus étroites qui décrivent déjà la propriété. Utilisez
`providers`, `channels`, `commandAliases`, les descripteurs de configuration ou `contracts`
lorsque ces champs expriment la relation. Utilisez `activation` pour des indices supplémentaires du planificateur
qui ne peuvent pas être représentés par ces champs de propriété.
Utilisez `cliBackends` de niveau supérieur pour les alias d'exécution CLI tels que `claude-cli`,
`my-cli` ou `google-gemini-cli` ; `activation.onAgentHarnesses` est uniquement pour
les identifiants de harnais d'agent intégré qui n'ont pas déjà de champ de propriété.

Ce bloc contient uniquement des métadonnées. Il n'enregistre pas le comportement à l'exécution et ne remplace pas `register(...)`, `setupEntry` ou d'autres points d'entrée de runtime/plugin. Les consommateurs actuels l'utilisent comme indication de réduction avant le chargement plus large des plugins, donc l'absence de métadonnées d'activation hors démarrage coûte généralement seulement en termes de performance ; cela ne devrait pas modifier la correction tant que les replis de propriété de manifeste existent encore.

Chaque plugin doit définir `activation.onStartup` intentionnellement. Définissez-le sur `true` uniquement lorsque le plugin doit s'exécuter pendant le démarrage du Gateway. Définissez-le sur `false` lorsque le plugin est inactif au démarrage et ne doit être chargé que par des déclencheurs plus restreints. L'omission de `onStartup` ne charge plus implicitement le plugin au démarrage ; utilisez des métadonnées d'activation explicites pour le démarrage, le canal, la configuration, le harnais d'agent, la mémoire ou d'autres déclencheurs d'activation plus restreints.

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
| `onStartup`        | Non         | `boolean`                                            | Activation explicite au démarrage du Gateway. Chaque plugin doit définir cela. `true` importe le plugin pendant le démarrage ; `false` le laisse en mode différé au démarrage, sauf si un autre déclencheur correspondant nécessite son chargement. |
| `onProviders`      | Non         | `string[]`                                           | Identifiants de fournisseur qui doivent inclure ce plugin dans les plans d'activation/chargement.                                                                                                                                                   |
| `onAgentHarnesses` | Non         | `string[]`                                           | Identifiants de runtime de harnais d'agent intégré qui doivent inclure ce plugin dans les plans d'activation/chargement. Utilisez `cliBackends` de premier niveau pour les alias de backend CLI.                                                    |
| `onCommands`       | Non         | `string[]`                                           | Identifiants de commande qui doivent inclure ce plugin dans les plans d'activation/chargement.                                                                                                                                                      |
| `onChannels`       | Non         | `string[]`                                           | Identifiants de canal qui doivent inclure ce plugin dans les plans d'activation/chargement.                                                                                                                                                         |
| `onRoutes`         | Non         | `string[]`                                           | Types de routes qui doivent inclure ce plugin dans les plans d'activation/chargement.                                                                                                                                                               |
| `onConfigPaths`    | Non         | `string[]`                                           | Chemins de configuration relatifs à la racine qui doivent inclure ce plugin dans les plans de démarrage/chargement lorsque le chemin est présent et n'est pas explicitement désactivé.                                                              |
| `onCapabilities`   | Non         | `Array<"provider" \| "channel" \| "tool" \| "hook">` | Indicateurs larges de capacités utilisés par la planification de l'activation du plan de contrôle. Privilégiez les champs plus étroits lorsque cela est possible.                                                                                   |

Consommateurs actifs actuels :

- La planification du démarrage du Gateway utilise `activation.onStartup` pour l'importation
  explicite au démarrage
- La planification CLI déclenchée par commande revient à l'ancien
  `commandAliases[].cliCommand` ou `commandAliases[].name`
- La planification du démarrage de l'exécution de l'agent utilise `activation.onAgentHarnesses` pour
  les faisceaux intégrés et `cliBackends[]` de premier niveau pour les alias d'exécution CLI
- La planification de configuration/de canal déclenchée par canal revient à l'ancienne propriété
  `channels[]` lorsque les métadonnées d'activation de canal explicites sont manquantes
- La planification des plugins de démarrage utilise `activation.onConfigPaths` pour les surfaces
  de configuration racine non-canal, telles que le bloc `browser` du plugin de navigateur groupé
- La planification de configuration/d'exécution déclenchée par fournisseur revient à l'ancienne
  propriété `providers[]` et `cliBackends[]` de premier niveau lorsque les métadonnées
  d'activation de fournisseur explicites sont manquantes

Les diagnostics du planificateur peuvent distinguer les indices d'activation explicite de la
repli sur la propriété du manifeste. Par exemple, `activation-command-hint` signifie
que `activation.onCommands` a correspondu, tandis que `manifest-command-alias` signifie que
le planificateur a utilisé la propriété `commandAliases` à la place. Ces étiquettes de raison sont destinées
aux diagnostics et tests de l'hôte ; les auteurs de plugins doivent continuer à déclarer les métadonnées
qui décrivent le mieux la propriété.

## référence qaRunners

Utilisez `qaRunners` lorsqu'un plugin contribue avec un ou plusieurs runners de transport sous
la racine `openclaw qa` partagée. Gardez ces métadonnées peu coûteuses et statiques ; l'exécution
du plugin possède toujours l'inscription CLI réelle via une surface
légère `runtime-api.ts` qui exporte `qaRunnerCliRegistrations`.

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

| Champ         | Obligatoire | Type     | Signification                                                                                 |
| ------------- | ----------- | -------- | --------------------------------------------------------------------------------------------- |
| `commandName` | Oui         | `string` | Sous-commande montée sous `openclaw qa`, par exemple `matrix`.                                |
| `description` | Non         | `string` | Texte d'aide de repli utilisé lorsque l'hôte partagé a besoin d'une commande de remplacement. |

## référence de configuration

Utilisez `setup` lorsque les surfaces de configuration et d'onboarding ont besoin de métadonnées bon marché appartenant au plugin
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

`cliBackends` de premier niveau reste valide et continue de décrire les backends d'inférence CLI. `setup.cliBackends` est la surface de descripteur spécifique à la configuration pour
les flux de plan de contrôle/configuration qui doivent rester uniquement des métadonnées.

Lorsqu'ils sont présents, `setup.providers` et `setup.cliBackends` sont la surface de recherche privilégiée en premier lieu par descripteur pour la découverte de la configuration. Si le descripteur ne fait
que restreindre le plugin candidat et que la configuration nécessite encore des hooks d'exécution plus riches au moment de la configuration,
définissez `requiresRuntime: true` et gardez `setup-api` en place en tant que
chemin d'exécution de repli.

OpenClaw inclut également `setup.providers[].envVars` dans les recherches génériques d'authentification de fournisseur et
de variables d'environnement. `providerAuthEnvVars` reste pris en charge via un adaptateur de compatibilité pendant la période d'obsolescence, mais les plugins non groupés qui l'utilisent encore
reçoivent un diagnostic de manifeste. Les nouveaux plugins doivent placer les métadonnées d'environnement de configuration/statut
sur `setup.providers[].envVars`.

OpenClaw peut également dériver des choix de configuration simples à partir de `setup.providers[].authMethods`
lorsqu'aucune entrée de configuration n'est disponible, ou lorsque `setup.requiresRuntime: false`
déclare l'exécution de configuration inutile. Les entrées `providerAuthChoices` explicites restent
privilégiées pour les étiquettes personnalisées, les indicateurs CLI, la portée de l'onboarding et les métadonnées de l'assistant.

Définissez `requiresRuntime: false`OpenClaw uniquement lorsque ces descripteurs sont suffisants pour la surface de configuration. OpenClaw traite `false` explicite comme un contrat basé uniquement sur les descripteurs et n'exécutera pas `setup-api` ou `openclaw.setupEntry`OpenClaw pour la recherche de configuration. Si un plugin basé uniquement sur des descripteurs inclut toujours l'une de ces entrées d'exécution de configuration, OpenClaw signale un diagnostic additif et continue de l'ignorer. `requiresRuntime` omis conserve le comportement de repli hérité afin que les plugins existants qui ont ajouté des descripteurs sans l'indicateur ne soient pas cassés.

Étant donné que la recherche de configuration peut exécuter du code `setup-api` appartenant au plugin, les valeurs normalisées `setup.providers[].id` et `setup.cliBackends[]` doivent rester uniques parmi les plugins découverts. Une propriété ambiguë entraîne un échec (fail closed) plutôt que de choisir un gagnant basé sur l'ordre de découverte.

Lorsque l'exécution de la configuration a lieu, les diagnostics du registre de configuration signalent une dérive des descripteurs si `setup-api`CLI enregistre un fournisseur ou un backend CLI que les descripteurs du manifeste ne déclarent pas, ou si un descripteur n'a pas d'enregistrement d'exécution correspondant. Ces diagnostics sont additifs et ne rejettent pas les plugins hérités.

### Référence de setup.providers

| Champ          | Obligatoire | Type       | Signification                                                                                                                                      |
| -------------- | ----------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`           | Oui         | `string`   | Identifiant du fournisseur exposé lors de la configuration ou de l'onboarding. Conservez les identifiants normalisés uniques globalement.          |
| `authMethods`  | Non         | `string[]` | Identifiants des méthodes de configuration/authentification que ce fournisseur prend en charge sans charger l'intégralité de l'exécution.          |
| `envVars`      | Non         | `string[]` | Variables d'environnement que les surfaces de configuration/statut génériques peuvent vérifier avant le chargement de l'exécution du plugin.       |
| `authEvidence` | Non         | `object[]` | Vérifications locales peu coûteuses des preuves d'authentification pour les fournisseurs qui peuvent s'authentifier via des marqueurs non secrets. |

`authEvidence`API est destiné aux marqueurs d'identification locaux appartenant au fournisseur qui peuvent être vérifiés sans charger de code d'exécution. Ces vérifications doivent rester peu coûteuses et locales : aucun appel réseau, aucune lecture de trousseau ou de gestionnaire de secrets, aucune commande shell et aucune sonde d'API du fournisseur.

Entrées d'éléments de preuve prises en charge :

| Champ              | Obligatoire | Type       | Signification                                                                                                                            |
| ------------------ | ----------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `type`             | Oui         | `string`   | Actuellement `local-file-with-env`.                                                                                                      |
| `fileEnvVar`       | Non         | `string`   | Variable d'environnement contenant un chemin de fichier d'identification explicite.                                                      |
| `fallbackPaths`    | Non         | `string[]` | Chemins de fichiers d'identification locaux vérifiés lorsque `fileEnvVar` est absent ou vide. Prend en charge `${HOME}` et `${APPDATA}`. |
| `requiresAnyEnv`   | Non         | `string[]` | Au moins une variable d'environnement listée doit être non vide pour que l'élément de preuve soit valide.                                |
| `requiresAllEnv`   | Non         | `string[]` | Chaque variable d'environnement listée doit être non vide pour que l'élément de preuve soit valide.                                      |
| `credentialMarker` | Oui         | `string`   | Marqueur non secret renvoyé lorsque l'élément de preuve est présent.                                                                     |
| `source`           | Non         | `string`   | Étiquette de source orientée utilisateur pour la sortie d'authentification/état.                                                         |

### champs de configuration

| Champ              | Obligatoire | Type       | Signification                                                                                                                                                                          |
| ------------------ | ----------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `providers`        | Non         | `object[]` | Descripteurs de configuration du fournisseur exposés lors de la configuration et de l'intégration.                                                                                     |
| `cliBackends`      | Non         | `string[]` | Identifiants de backend au moment de la configuration utilisés pour la recherche de configuration prioritaire par descripteur. Gardez les identifiants normalisés globalement uniques. |
| `configMigrations` | Non         | `string[]` | Identifiants de migration de configuration possédés par la surface de configuration de ce plugin.                                                                                      |
| `requiresRuntime`  | Non         | `boolean`  | Indique si la configuration nécessite toujours l'exécution de `setup-api` après la recherche par descripteur.                                                                          |

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

| Champ         | Type       | Signification                                                  |
| ------------- | ---------- | -------------------------------------------------------------- |
| `label`       | `string`   | Étiquette de champ orientée utilisateur.                       |
| `help`        | `string`   | Texte d'aide court.                                            |
| `tags`        | `string[]` | Balises d'interface utilisateur facultatives.                  |
| `advanced`    | `boolean`  | Marque le champ comme avancé.                                  |
| `sensitive`   | `boolean`  | Marque le champ comme secret ou sensible.                      |
| `placeholder` | `string`   | Texte de substitution pour les champs de saisie de formulaire. |

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

| Champ                            | Type       | Signification                                                                                                                                               |
| -------------------------------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `embeddedExtensionFactories`     | `string[]` | Identifiants de fabrique d'extension du serveur d'application Codex, actuellement `codex-app-server`.                                                       |
| `agentToolResultMiddleware`      | `string[]` | Identifiants d'exécution pour lesquels un plugin groupé peut enregistrer un middleware de résultats d'outil.                                                |
| `externalAuthProviders`          | `string[]` | Identifiants de provider dont le hook de profil d'authentification externe appartient à ce plugin.                                                          |
| `embeddingProviders`             | `string[]` | Identifiants de provider d'intégration générale que ce plugin possède pour une utilisation réutilisable de l'intégration vectorielle, y compris la mémoire. |
| `speechProviders`                | `string[]` | Identifiants de provider de synthèse vocale que ce plugin possède.                                                                                          |
| `realtimeTranscriptionProviders` | `string[]` | Identifiants de provider de transcription en temps réel que ce plugin possède.                                                                              |
| `realtimeVoiceProviders`         | `string[]` | Identifiants de provider de voix en temps réel que ce plugin possède.                                                                                       |
| `memoryEmbeddingProviders`       | `string[]` | Identifiants de provider d'intégration spécifique à la mémoire (obsolètes) que ce plugin possède.                                                           |
| `mediaUnderstandingProviders`    | `string[]` | Identifiants de provider de compréhension multimédia que ce plugin possède.                                                                                 |
| `transcriptSourceProviders`      | `string[]` | Identifiants de provider de source de transcription que ce plugin possède.                                                                                  |
| `imageGenerationProviders`       | `string[]` | Identifiants de provider de génération d'images que ce plugin possède.                                                                                      |
| `videoGenerationProviders`       | `string[]` | Identifiants de provider de génération de vidéos que ce plugin possède.                                                                                     |
| `webFetchProviders`              | `string[]` | Identifiants de provider de récupération Web que ce plugin possède.                                                                                         |
| `webSearchProviders`             | `string[]` | Identifiants de provider de recherche Web que ce plugin possède.                                                                                            |
| `migrationProviders`             | `string[]` | Importer les identifiants de provider que ce plugin possède pour `openclaw migrate`.                                                                        |
| `gatewayMethodDispatch`          | `string[]` | Droit réservé pour les itinéraires HTTP de plugin authentifiés qui distribuent les méthodes du Gateway en processus.                                        |
| `tools`                          | `string[]` | Noms des outils d'agent que ce plugin possède.                                                                                                              |

`contracts.embeddedExtensionFactories` est conservé pour les fabriques d'extension de serveur d'application Codex groupées uniquement. Les transformations de résultats d'outils groupées doivent déclarer `contracts.agentToolResultMiddleware` et s'inscrire avec `api.registerAgentToolResultMiddleware(...)` à la place. Les plugins externes ne peuvent pas inscrire de middleware de résultat d'outil car la jonction peut réécrire la sortie d'outil à haute confiance avant que le modèle ne la voie.

Les inscriptions d'exécution `api.registerTool(...)` doivent correspondre à `contracts.tools`.
La découverte d'outils utilise cette liste pour charger uniquement les environnements d'exécution de plugin qui peuvent posséder les outils demandés.

Les plugins de provider qui implémentent `resolveExternalAuthProfiles` doivent déclarer `contracts.externalAuthProviders` ; les crochets d'authentification externe non déclarés sont ignorés.

Les providers d'intégration généraux doivent déclarer `contracts.embeddingProviders` pour chaque adaptateur enregistré avec `api.registerEmbeddingProvider(...)`. Utilisez le contrat général pour la génération de vecteurs réutilisable, y compris les providers consommés par la recherche de mémoire. `contracts.memoryEmbeddingProviders` est une compatibilité spécifique à la mémoire obsolète et ne reste que pendant que les providers existants migrent vers la jonction de provider d'intégration générique.

`contracts.gatewayMethodDispatch` accepte actuellement `"authenticated-request"`. C'est une porte d'hygiène de API pour les itinéraires HTTP de plugin natifs qui distribuent intentionnellement les méthodes du plan de contrôle du Gateway en processus, et non un bac à sable contre les plugins natifs malveillants. Utilisez-le uniquement pour les surfaces groupées/opérateur étroitement examinées qui nécessitent déjà une authentification HTTP Gateway.

## Référence de mediaUnderstandingProviderMetadata

Utilisez `mediaUnderstandingProviderMetadata` lorsqu'un provider de compréhension de média possède des modèles par défaut, une priorité de repli d'auth automatique, ou une prise en charge native des documents dont les helpers principaux génériques ont besoin avant le chargement du runtime. Les clés doivent également être déclarées dans `contracts.mediaUnderstandingProviders`.

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

| Champ                  | Type                                | Signification                                                                                            |
| ---------------------- | ----------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `capabilities`         | `("image" \| "audio" \| "video")[]` | Capacités multimédia exposées par ce provider.                                                           |
| `defaultModels`        | `Record<string, string>`            | Correspondances capacité-modèle par défaut utilisées lorsque la configuration ne spécifie pas de modèle. |
| `autoPriority`         | `Record<string, number>`            | Les nombres plus bas trient plus tôt pour le repli automatique du provider basé sur les identifiants.    |
| `nativeDocumentInputs` | `"pdf"[]`                           | Entrées de documents natives prises en charge par le provider.                                           |

## référence channelConfigs

Utilisez `channelConfigs` lorsqu'un plugin de channel a besoin de métadonnées de configuration légères avant le chargement du runtime. La découverte de la configuration/l'état du channel en lecture seule peut utiliser directement ces métadonnées pour les canaux externes configurés lorsqu'aucune entrée de configuration n'est disponible, ou lorsque `setup.requiresRuntime: false` déclare le runtime de configuration inutile.

`channelConfigs` est une métadonnée de manifeste de plugin, et non une nouvelle section de configuration utilisateur de niveau supérieur. Les utilisateurs configurent toujours les instances de channel sous `channels.<channel-id>`. OpenClaw lit les métadonnées du manifeste pour décider quel plugin possède ce channel configuré avant l'exécution du code runtime du plugin.

Pour un plugin de channel, `configSchema` et `channelConfigs` décrivent différents chemins :

- `configSchema` valide `plugins.entries.<plugin-id>.config`
- `channelConfigs.<channel-id>.schema` valide `channels.<channel-id>`

Les plugins non groupés qui déclarent `channels[]` doivent également déclarer des entrées `channelConfigs` correspondantes. Sans elles, OpenClaw peut toujours charger le plugin, mais le schéma de configuration à froid, la configuration et les surfaces de l'interface utilisateur de contrôle ne peuvent pas connaître la forme de l option appartenant au channel avant l'exécution du runtime du plugin.

`channelConfigs.<channel-id>.commands.nativeCommandsAutoEnabled` et
`nativeSkillsAutoEnabled` peuvent déclarer des valeurs par défaut statiques `auto` pour les vérifications de configuration de commande
qui s'exécutent avant le chargement du runtime du channel. Les channels groupés peuvent également publier
les mêmes valeurs par défaut via `package.json#openclaw.channel.commands` aux côtés
des autres métadonnées du catalogue de channel dont ils sont propriétaires.

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
| `uiHints`     | `Record<string, object>` | Étiquettes d'interface utilisateur/espaces réservés/indications de sensibilité facultatifs pour cette section de configuration de channel.   |
| `label`       | `string`                 | Étiquette de channel fusionnée dans les surfaces de sélection et d'inspection lorsque les métadonnées d'exécution ne sont pas prêtes.        |
| `description` | `string`                 | Courte description du channel pour les surfaces d'inspection et de catalogue.                                                                |
| `commands`    | `object`                 | Valeurs par défaut automatiques natives pour les commandes et les compétences natives pour les vérifications de configuration pré-exécution. |
| `preferOver`  | `string[]`               | Identifiants de plugin hérités ou de priorité inférieure que ce channel devrait surpasser dans les surfaces de sélection.                    |

### Remplacer un autre plugin de channel

Utilisez `preferOver` lorsque votre plugin est le propriétaire privilégié pour un identifiant de channel qu'un
autre plugin peut également fournir. Les cas courants sont un identifiant de plugin renommé, un plugin
autonome qui remplace un plugin groupé, ou un fork maintenu qui conserve le même identifiant de channel
pour la compatibilité de la configuration.

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

Lorsque `channels.chat` est configuré, OpenClaw prend en compte à la fois l'identifiant du channel et
l'identifiant du plugin privilégié. Si le plugin de priorité inférieure n'a été sélectionné que parce qu'il
est groupé ou activé par défaut, OpenClaw le désactive dans la configuration d'exécution
effective afin qu'un seul plugin possède le channel et ses tools. La sélection explicite de l'utilisateur
l'emporte toujours : si l'utilisateur active explicitement les deux plugins, OpenClaw
conserve ce choix et signale des diagnostics de channel/tool en double au lieu de modifier
silencieusement l'ensemble de plugins demandé.

Gardez `preferOver` limité aux ids de plugins qui peuvent vraiment fournir le même canal.
Ce n'est pas un champ de priorité général et il ne renomme pas les clés de configuration utilisateur.

## Référence de modelSupport

Utilisez `modelSupport` quand OpenClaw doit déduire votre plugin de provider à partir d'ids de modèle abrégés comme `gpt-5.5` ou `claude-sonnet-4.6` avant le chargement du runtime du plugin.

```json
{
  "modelSupport": {
    "modelPrefixes": ["gpt-", "o1", "o3", "o4"],
    "modelPatterns": ["^computer-use-preview"]
  }
}
```

OpenClaw applique cette priorité :

- les références explicites `provider/model` utilisent les métadonnées du manifeste du `providers` propriétaire
- `modelPatterns` battent `modelPrefixes`
- si un plugin non groupé et un plugin groupé correspondent tous les deux, le plugin non groupé gagne
- l'ambiguïté restante est ignorée jusqu'à ce que l'utilisateur ou la configuration spécifie un provider

Champs :

| Champ           | Type       | Signification                                                                                 |
| --------------- | ---------- | --------------------------------------------------------------------------------------------- |
| `modelPrefixes` | `string[]` | Préfixes correspondant via `startsWith` avec les ids de modèle abrégés.                       |
| `modelPatterns` | `string[]` | Sources regex correspondant aux ids de modèle abrégés après suppression du suffixe de profil. |

Les entrées `modelPatterns` sont compilées via `compileSafeRegex`, qui rejette les modèles contenant des répétitions imbriquées (par exemple `(a+)+$`). Les modèles qui échouent à la vérification de sécurité sont ignorés silencieusement, tout comme les regex syntaxiquement invalides.
Gardez les modèles simples et évitez les quantificateurs imbriqués.

## Référence de modelCatalog

Utilisez `modelCatalog` quand OpenClaw doit connaître les métadonnées du modèle du provider avant le chargement du runtime du plugin. C'est la source détenue par le manifeste pour les lignes de catalogue fixes, les alias de provider, les règles de suppression et le mode de découverte. L'actualisation du runtime appartient toujours au code du runtime du provider, mais le manifeste indique au cœur quand le runtime est requis.

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

| Champ            | Type                                                     | Signification                                                                                                                                               |
| ---------------- | -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `providers`      | `Record<string, object>`                                 | Lignes de catalogue pour les ids de provider possédés par ce plugin. Les clés doivent également apparaître dans `providers` de niveau supérieur.            |
| `aliases`        | `Record<string, object>`                                 | Alias de fournisseur qui doivent correspondre à un fournisseur possédé pour la planification du catalogue ou de la suppression.                             |
| `suppressions`   | `object[]`                                               | Lignes de modèle provenant d'une autre source que ce plugin masque pour une raison spécifique au fournisseur.                                               |
| `discovery`      | `Record<string, "static" \| "refreshable" \| "runtime">` | Indique si le catalogue du fournisseur peut être lu à partir des métadonnées du manifeste, actualisé dans le cache ou s'il nécessite l'exécution (runtime). |
| `runtimeAugment` | `boolean`                                                | Définissez à `true` uniquement lorsque l'exécution du fournisseur doit ajouter des lignes au catalogue après la planification du manifeste/config.          |

`aliases` participe à la recherche de propriétaire du fournisseur pour la planification du catalogue de modèles.
Les cibles d'alias doivent être des fournisseurs de niveau supérieur possédés par le même plugin. Lorsqu'une
liste filtrée par fournisseur utilise un alias, OpenClaw peut lire le manifeste propriétaire et
appliquer les substitutions d'alias d'API/URL de base sans charger l'exécution du fournisseur.
Les alias ne développent pas les listes de catalogue non filtrées ; les listes larges émettent uniquement les
lignes du fournisseur canonique propriétaire.

`suppressions` remplace l'ancien hook d'exécution du fournisseur `suppressBuiltInModel`.
Les entrées de suppression sont honorées uniquement lorsque le fournisseur est possédé par le plugin ou
déclaré comme une clé `modelCatalog.aliases` ciblant un fournisseur possédé. Les hooks de
suppression à l'exécution ne sont plus appelés lors de la résolution du modèle.

Champs du fournisseur :

| Champ     | Type                     | Signification                                                                           |
| --------- | ------------------------ | --------------------------------------------------------------------------------------- |
| `baseUrl` | `string`                 | URL de base par défaut facultative pour les modèles de ce catalogue de fournisseur.     |
| `api`     | `ModelApi`               | Adaptateur d'API par défaut facultatif pour les modèles de ce catalogue de fournisseur. |
| `headers` | `Record<string, string>` | En-têtes statiques facultatifs qui s'appliquent à ce catalogue de fournisseur.          |
| `models`  | `object[]`               | Lignes de modèle requises. Les lignes sans `id` sont ignorées.                          |

Champs du modèle :

| Champ           | Type                                                           | Signification                                                                                                     |
| --------------- | -------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `id`            | `string`                                                       | ID de modèle local au fournisseur, sans le préfixe `provider/`.                                                   |
| `name`          | `string`                                                       | Nom d'affichage facultatif.                                                                                       |
| `api`           | `ModelApi`                                                     | Remplacement facultatif de l'API API par modèle.                                                                  |
| `baseUrl`       | `string`                                                       | Remplacement facultatif de l'URL de base par modèle.                                                              |
| `headers`       | `Record<string, string>`                                       | En-têtes statiques facultatifs par modèle.                                                                        |
| `input`         | `Array<"text" \| "image" \| "document" \| "audio" \| "video">` | Modalités acceptées par le modèle.                                                                                |
| `reasoning`     | `boolean`                                                      | Si le modèle expose un comportement de raisonnement.                                                              |
| `contextWindow` | `number`                                                       | Fenêtre de contexte native du fournisseur.                                                                        |
| `contextTokens` | `number`                                                       | Limite effective facultative du contexte d'exécution si elle diffère de `contextWindow`.                          |
| `maxTokens`     | `number`                                                       | Nombre maximum de jetons de sortie, si connu.                                                                     |
| `cost`          | `object`                                                       | Tarification facultative en USD par million de jetons, incluant un `tieredPricing` facultatif.                    |
| `compat`        | `object`                                                       | Indicateurs de compatibilité facultatifs correspondant à la compatibilité de la configuration du modèle OpenClaw. |
| `status`        | `"available"` \| `"preview"` \| `"deprecated"` \| `"disabled"` | Statut de liste. Supprimer uniquement lorsque la ligne ne doit pas apparaître du tout.                            |
| `statusReason`  | `string`                                                       | Raison facultative affichée avec le statut non disponible.                                                        |
| `replaces`      | `string[]`                                                     | Anciens ID de modèles locaux au fournisseur que ce modèle remplace.                                               |
| `replacedBy`    | `string`                                                       | ID de modèle de remplacement local au fournisseur pour les lignes obsolètes.                                      |
| `tags`          | `string[]`                                                     | Étiquettes stables utilisées par les sélecteurs et les filtres.                                                   |

Champs de suppression :

| Champ                      | Type       | Signification                                                                                                               |
| -------------------------- | ---------- | --------------------------------------------------------------------------------------------------------------------------- |
| `provider`                 | `string`   | Id du fournisseur pour la ligne en amont à supprimer. Doit être détenu par ce plugin ou déclaré comme un alias détenu.      |
| `model`                    | `string`   | Id de modèle local au fournisseur à supprimer.                                                                              |
| `reason`                   | `string`   | Message optionnel affiché lorsque la ligne supprimée est demandée directement.                                              |
| `when.baseUrlHosts`        | `string[]` | Liste optionnelle des hôtes d'URL de base effectifs du fournisseur requis avant que la suppression ne s'applique.           |
| `when.providerConfigApiIn` | `string[]` | Liste optionnelle de valeurs exactes `api` de configuration du fournisseur requises avant que la suppression ne s'applique. |

Ne mettez pas de données d'exécution uniquement dans `modelCatalog`. Utilisez `static` uniquement lorsque les lignes du manifeste sont suffisamment complètes pour que les listes filtrées par fournisseur et les surfaces de sélecteur ignorent la découverte du registre/runtime. Utilisez `refreshable` lorsque les lignes du manifeste sont des graines ou des compléments listables utiles, mais qu'une actualisation/cache peut ajouter d'autres lignes plus tard ; les lignes actualisables ne sont pas autonomes. Utilisez `runtime` lorsque OpenClaw doit charger le runtime du fournisseur pour connaître la liste.

## Référence modelIdNormalization

Utilisez `modelIdNormalization` pour un nettoyage peu coûteux des ID de modèle détenus par le fournisseur qui doit se produire avant le chargement du runtime du fournisseur. Cela permet de conserver des alias tels que des noms de modèle courts, des ID hérités locaux au fournisseur et des règles de préfixe de proxy dans le manifeste du plugin propriétaire plutôt que dans les tables de sélection de modèle principales.

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
| `aliases`                            | `Record<string,string>` | Alias exacts d'ID de modèle insensibles à la casse. Les valeurs sont renvoyées telles qu'elles sont écrites.  |
| `stripPrefixes`                      | `string[]`              | Préfixes à supprimer avant la recherche d'alias, utiles pour la duplication héritée de fournisseur/modèle.    |
| `prefixWhenBare`                     | `string`                | Préfixe à ajouter lorsque l'ID de modèle normalisé ne contient pas déjà `/`.                                  |
| `prefixWhenBareAfterAliasStartsWith` | `object[]`              | Règles conditionnelles de préfixe d'ID nu après la recherche d'alias, indexées par `modelPrefix` et `prefix`. |

## référence providerEndpoints

Utilisez `providerEndpoints` pour la classification des points de terminaison que la politique de demande générique
doit connaître avant le chargement du runtime du provider. Le cœur possède toujours la signification de chaque
`endpointClass` ; les manifestes de plugin possèdent les métadonnées de l'hôte et de l'URL de base.

Champs de point de terminaison :

| Champ                          | Type       | Signification                                                                                                                                      |
| ------------------------------ | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `endpointClass`                | `string`   | Classe de point de terminaison principale connue, telle que `openrouter`, `moonshot-native` ou `google-vertex`.                                    |
| `hosts`                        | `string[]` | Noms d'hôte exacts qui correspondent à la classe de point de terminaison.                                                                          |
| `hostSuffixes`                 | `string[]` | Suffixes d'hôte qui correspondent à la classe de point de terminaison. Préfixez avec `.` pour une correspondance de suffixe de domaine uniquement. |
| `baseUrls`                     | `string[]` | URL de base HTTP(S) normalisées exactes qui correspondent à la classe de point de terminaison.                                                     |
| `googleVertexRegion`           | `string`   | Région Google Vertex statique pour les hôtes globaux exacts.                                                                                       |
| `googleVertexRegionHostSuffix` | `string`   | Suffixe à supprimer des hôtes correspondants pour révéler le préfixe de région Google Vertex.                                                      |

## référence providerRequest

Utilisez `providerRequest` pour les métadonnées de compatibilité de demande peu coûteuses dont la politique de demande générique
a besoin sans charger le runtime du provider. Conservez la réécriture de charge utile spécifique au comportement
dans les hooks du runtime du provider ou les helpers partagés de la famille de providers.

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
| `compatibilityFamily` | `"moonshot"` | Bucket de compatibilité de famille de providers optionnel pour les helpers de demande partagés.                        |
| `openAICompletions`   | `object`     | Drapeaux de demande de complétions compatibles avec OpenAI, actuellement `supportsStreamingUsage`.                     |

## référence modelPricing

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
| `provider`                 | `string`           | ID du fournisseur du catalogue externe lorsqu'il diffère de l'ID du fournisseur OpenClaw, par exemple `z-ai` pour un fournisseur `zai`.                           |
| `passthroughProviderModel` | `boolean`          | Traiter les ID de modèle contenant des barres obliques comme des références fournisseur/modèle imbriquées, utile pour les fournisseurs proxy tels que OpenRouter. |
| `modelIdTransforms`        | `"version-dots"[]` | Variantes d'ID de modèle de catalogue externe supplémentaires. `version-dots` essaie les ID de version en pointillés comme `claude-opus-4.6`.                     |

### Index des fournisseurs OpenClaw

L'Index des fournisseurs OpenClaw est des métadonnées d'aperçu appartenant à OpenClaw pour les fournisseurs dont les plugins ne sont peut-être pas encore installés. Il ne fait pas partie d'un manifeste de plugin. Les manifestes de plugin restent l'autorité du plugin installé. L'Index des fournisseurs est le contrat de repli interne que les futures surfaces de fournisseur installable et de sélecteur de modèle pré-installation consommeront lorsqu'un plugin de fournisseur n'est pas installé.

Ordre d'autorité du catalogue :

1. Configuration de l'utilisateur.
2. Manifeste du plugin installé `modelCatalog`.
3. Cache du catalogue de modèles suite à une actualisation explicite.
4. Lignes d'aperçu de l'Index des Fournisseurs OpenClaw.

L'Index des Fournisseurs ne doit pas contenir de secrets, d'états activés, de hooks d'exécution, ou
données de modèle en temps réel spécifiques au compte. Ses catalogues d'aperçu utilisent la même
structure de ligne de fournisseur `modelCatalog` que les manifestes de plugin, mais doivent rester limités
aux métadonnées d'affichage stables, sauf si les champs de l'adaptateur d'exécution tels que `api`,
`baseUrl`, la tarification ou les indicateurs de compatibilité sont intentionnellement maintenus alignés avec
le manifeste du plugin installé. Les fournisseurs avec une découverte `/models` en temps réel doivent
écrire des lignes actualisées via le chemin explicite du cache du catalogue de modèles au lieu de
effectuer des appels API normaux de listing ou d'intégration des fournisseurs.

Les entrées de l'Index des Fournisseurs peuvent également contenir des métadonnées de plugin installable pour les fournisseurs
dont le plugin a été déplacé hors du cœur ou n'est pas encore installé par ailleurs. Ces
métadonnées reflètent le modèle du catalogue de canaux : le nom du package, la spec d'installation npm,
l'intégrité attendue et les étiquettes de choix d'auth bon marché suffisent à afficher une
option de configuration installable. Une fois le plugin installé, son manifeste prévaut et
l'entrée de l'Index des Fournisseurs est ignorée pour ce fournisseur.

Les clés de capacité de premier niveau héritées sont obsolètes. Utilisez `openclaw doctor --fix` pour
déplacer `speechProviders`, `realtimeTranscriptionProviders`,
`realtimeVoiceProviders`, `mediaUnderstandingProviders`,
`imageGenerationProviders`, `videoGenerationProviders`,
`webFetchProviders` et `webSearchProviders` sous `contracts` ; le
chargement normal du manifeste ne traite plus ces champs de premier niveau comme une propriété
de capacité.

## Manifeste par rapport à package.

Les deux fichiers servent des travaux différents :

| Fichier                | Utilisez-le pour                                                                                                                                                                |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `openclaw.plugin.json` | Découverte, validation de configuration, métadonnées de choix d'auth et indices d'interface utilisateur qui doivent exister avant l'exécution du code du plugin                 |
| `package.json`         | Métadonnées npm, installation des dépendances et le bloc `openclaw` utilisé pour les points d'entrée, la porte d'installation, la configuration ou les métadonnées du catalogue |

Si vous n'êtes pas sûr de l'appartenance d'une métadonnée, utilisez cette règle :

- si OpenClaw doit le savoir avant de charger le code du plugin, placez-le dans OpenClaw`openclaw.plugin.json`
- s'il s'agit du conditionnement, des fichiers d'entrée ou du comportement de l'installation npm, placez-le dans npm`package.json`

### champs package. qui affectent la découverte

Certaines métadonnées de pré-exécution du plugin résident intentionnellement dans `package.json` sous le bloc `openclaw` au lieu de `openclaw.plugin.json`.
`openclaw.bundle` et `openclaw.bundle.json`OpenClaw ne sont pas des contrats de plugin OpenClaw ;
les plugins natifs doivent utiliser `openclaw.plugin.json` plus les champs `package.json#openclaw` pris en charge ci-dessous.

Exemples importants :

| Champ                                                                                      | Signification                                                                                                                                                                                                                                      |
| ------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `openclaw.extensions`                                                                      | Déclare les points d'entrée des plugins natifs. Doit rester à l'intérieur du répertoire du package du plugin.                                                                                                                                      |
| `openclaw.runtimeExtensions`                                                               | Déclare les points d'entrée d'exécution JavaScript construits pour les packages installés. Doit rester à l'intérieur du répertoire du package du plugin.                                                                                           |
| `openclaw.setupEntry`                                                                      | Point d'entrée de configuration uniquement et léger utilisé lors de l'intégration, du démarrage différé du canal, et de la découverte du statut/SecretRef du canal en lecture seule. Doit rester à l'intérieur du répertoire du package du plugin. |
| `openclaw.runtimeSetupEntry`                                                               | Déclare le point d'entrée de configuration JavaScript construit pour les packages installés. Nécessite `setupEntry`, doit exister et doit rester à l'intérieur du répertoire du package du plugin.                                                 |
| `openclaw.channel`                                                                         | Métadonnées de catalogue de canal peu coûteuses telles que les étiquettes, les chemins de documentation, les alias et le texte de sélection.                                                                                                       |
| `openclaw.channel.commands`                                                                | Métadonnées par défaut automatiques des commandes natives et des compétences natives statiques utilisées par les surfaces de configuration, d'audit et de liste de commandes avant le chargement de l'exécution du canal.                          |
| `openclaw.channel.configuredState`                                                         | Métadonnées du vérificateur d'état configuré léger qui peuvent répondre « une configuration uniquement par environnement existe-t-elle déjà ? » sans charger l'exécution complète du canal.                                                        |
| `openclaw.channel.persistedAuthState`                                                      | Métadonnées du vérificateur d'authentification persistante légère qui peuvent répondre « quelque chose est-il déjà connecté ? » sans charger l'exécution complète du canal.                                                                        |
| `openclaw.install.clawhubSpec` / `openclaw.install.npmSpec` / `openclaw.install.localPath` | Indications d'installation/de mise à jour pour les plugins groupés et publiés en externe.                                                                                                                                                          |
| `openclaw.install.defaultChoice`                                                           | Chemin d'installation préféré lorsque plusieurs sources d'installation sont disponibles.                                                                                                                                                           |
| `openclaw.install.minHostVersion`                                                          | Version hôte OpenClaw minimale prise en charge, utilisant un plancher semver comme `>=2026.3.22` ou `>=2026.5.1-beta.1`.                                                                                                                           |
| `openclaw.compat.pluginApi`                                                                | Plage de l'OpenClaw du plugin API minimale requise par ce package, utilisant un plancher semver comme `>=2026.5.27`.                                                                                                                               |
| `openclaw.install.expectedIntegrity`                                                       | Chaîne d'intégrité de distribution npm attendue telle que `sha512-...` ; les flux d'installation et de mise à jour vérifient l'artefact récupéré par rapport à celle-ci.                                                                           |
| `openclaw.install.allowInvalidConfigRecovery`                                              | Autorise un chemin de récupération étroit de réinstallation des plugins groupés lorsque la configuration n'est pas valide.                                                                                                                         |
| `openclaw.startup.deferConfiguredChannelFullLoadUntilAfterListen`                          | Permet aux surfaces de channel de configuration d'exécution de se charger avant l'écoute, puis diffère le plugin channel entièrement configuré jusqu'à l'activation post-écoute.                                                                   |

Les métadonnées du manifeste déterminent quels choix de provider/channel/setup apparaissent dans l'onboarding avant le chargement du runtime. `package.json#openclaw.install` indique à l'onboarding comment récupérer ou activer ce plugin lorsque l'utilisateur choisit l'une de ces options. Ne déplacez pas les indications d'installation dans `openclaw.plugin.json`.

`openclaw.install.minHostVersion` est appliqué lors de l'installation et du chargement du registre de manifeste pour les sources de plugins non groupés. Les valeurs non valides sont rejetées ; les valeurs plus récentes mais valides ignorent les plugins externes sur les hôtes plus anciens. Les plugins source groupés sont supposés être co-versionnés avec le checkout de l'hôte.

`openclaw.compat.pluginApi`OpenClawAPI est appliqué lors de l'installation du package pour les sources de plugins non regroupés. Utilisez-le pour la version minimale de l'API du SDK/runtime du plugin OpenClaw contre laquelle le package a été construit. Il peut être plus strict que `minHostVersion`APIOpenClawAPIOpenClaw lorsqu'un package de plugin nécessite une API plus récente mais conserve tout de même une indication d'installation inférieure pour d'autres flux. Par défaut, la synchronisation des versions officielles d'OpenClaw augmente les versions minimales des API des plugins officiels existants vers la version de la version d'OpenClaw, mais les versions de plugins uniquement peuvent conserver une version minimale inférieure lorsque le package prend intentionnellement en charge des hôtes plus anciens. N'utilisez pas la version du package seul comme contrat de compatibilité. `peerDependencies.openclaw`npmOpenClaw reste les métadonnées du package npm ; OpenClaw utilise le contrat `openclaw.compat.pluginApi` pour les décisions de compatibilité d'installation.

Les métadonnées officielles d'installation à la demande doivent utiliser `clawhubSpec`ClawHubClawHub lorsque le plugin est publié sur ClawHub ; l'intégration considère cela comme la source distante préférée et enregistre les faits sur l'artefact ClawHub après l'installation. `npmSpec`ClawHub reste le repli de compatibilité pour les packages qui n'ont pas encore été migrés vers ClawHub.

L'épinglage précis de version npm réside déjà dans npm`npmSpec`, par exemple
`"npmSpec": "@wecom/wecom-openclaw-plugin@1.2.3"`. Les entrées de catalogue externe officielles
doivent associer des spécifications exactes à `expectedIntegrity`npmnpm afin que les flux de mise à jour échouent
closément si l'artefact npm récupéré ne correspond plus à la version épinglée.
L'intégration interactive propose toujours des spécifications npm de registre de confiance, y compris des noms de
package nus et des balises de distribution, pour la compatibilité. Les diagnostics du catalogue peuvent
distinguer les sources exactes, flottantes, épinglées par intégrité, à intégrité manquante, de non-concordance de nom de
package et de choix par défaut invalides. Ils avertissent également lorsque
`expectedIntegrity`npm est présent mais qu'il n'y a aucune source npm valide à laquelle il peut s'attacher.
Lorsque `expectedIntegrity` est présent,
les flux d'installation/mise à jour l'appliquent ; lorsqu'il est omis, la résolution du registre est
enregistrée sans épinglage d'intégrité.

Les plugins de channel doivent fournir `openclaw.setupEntry` lorsque l'état, la liste de canaux,
ou les analyses SecretRef doivent identifier les comptes configurés sans charger l'intégralité du
runtime. L'entrée de configuration doit exposer les métadonnées du channel ainsi que les adaptateurs de configuration, d'état et de secrets sûrs pour l'installation ; gardez les clients réseau, les écouteurs de passerelle et les
runtimes de transport dans le point d'entrée principal de l'extension.

Les champs de point d'entrée runtime ne remplacent pas les vérifications de limites de package pour les champs de
point d'entrée source. Par exemple, `openclaw.runtimeExtensions` ne peut pas rendre un
chemin `openclaw.extensions` échappé chargeable.

`openclaw.install.allowInvalidConfigRecovery` est volontairement restreint. Il ne
rend pas les configurations cassées arbitraires installables. Àujourd'hui, il permet uniquement aux flux d'installation
de récupérer après des échecs spécifiques de mise à niveau de plugin groupé obsolète, tels qu'un
chemin de plugin groupé manquant ou une entrée `channels.<id>` obsolète pour ce même
plugin groupé. Les erreurs de configuration non liées bloquent toujours l'installation et dirigent les opérateurs
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

Utilisez-le lorsque les flux de configuration, de diagnostic, d'état ou de présence en lecture seule nécessitent une sonde d'authentification oui/non bon marché avant le chargement complet du plugin channel. L'état d'authentification persisté n'est pas l'état configuré du channel : n'utilisez pas ces métadonnées pour activer automatiquement les plugins, réparer les dépendances d'exécution ou décider si un runtime channel doit être chargé. L'export cible doit être une petite fonction qui lit uniquement l'état persisté ; ne l'acheminez pas via le barrel complet du runtime channel.

`openclaw.channel.configuredState` suit la même structure pour les vérifications configurées uniquement par env bon marché :

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

Utilisez-le lorsqu'un channel peut répondre à l'état configuré à partir de l'environnement ou d'autres petites entrées non liées au runtime. Si la vérification nécessite une résolution complète de la configuration ou le vrai runtime channel, gardez cette logique dans le hook du plugin `config.hasConfiguredState` à la place.

## Priorité de découverte (doublons d'ids de plugin)

OpenClaw découvre les plugins à partir de plusieurs racines. Pour l'ordre de scan du système de fichiers brut, consultez [Ordre de scan des plugins](/fr/gateway/configuration-reference#plugin-scan-order). Si deux découvertes partagent le même `id`, seul le manifeste de la **plus haute priorité** est conservé ; les doublons de priorité inférieure sont supprimés au lieu d'être chargés à côté.

Priorité, du plus haut au plus bas :

1. **Sélectionné par la configuration** — un chemin explicitement épinglé dans `plugins.entries.<id>`
2. **Bundlé** — plugins livrés avec OpenClaw
3. **Installation globale** — plugins installés dans la racine des plugins OpenClaw globale
4. **Espace de travail** — plugins découverts relatifs à l'espace de travail actuel

Implications :

- Une copie forkée ou obsolète d'un plugin livré (bundled) située dans l'espace de travail ne masquera pas la version livrée.
- Pour remplacer réellement un plugin livré par un plugin local, épinglez-le via `plugins.entries.<id>` afin qu'il gagne par priorité plutôt que de s'appuyer sur la découverte de l'espace de travail.
- Les suppressions de doublons sont consignées afin que le Doctor et les diagnostics de démarrage puissent pointer vers la copie ignorée.
- Les remplacements de doublons sélectionnés par la configuration sont présentés comme des remplacements explicites dans les diagnostics, mais avertissent toujours pour que les forks obsolètes et les masques accidentels restent visibles.

## Exigences du schéma JSON

- **Chaque plugin doit fournir un schéma JSON**, même s'il n'accepte aucune configuration.
- Un schéma vide est acceptable (par exemple, `{ "type": "object", "additionalProperties": false }`).
- Les schémas sont validés lors de la lecture/écriture de la configuration, et non lors de l'exécution.
- Lors de l'extension ou du fork d'un plugin groupé avec de nouvelles clés de configuration, mettez à jour le `openclaw.plugin.json` `configSchema` de ce plugin en même temps. Les schémas des plugins groupés sont stricts, donc l'ajout de `plugins.entries.<id>.config.myNewKey` dans la configuration utilisateur sans ajouter `myNewKey` au `configSchema.properties` sera rejeté avant le chargement du runtime du plugin.

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

- Les clés `channels.*` inconnues constituent des **erreurs**, sauf si l'id de canal est déclaré par
  un manifeste de plugin.
- `plugins.entries.<id>`, `plugins.allow`, `plugins.deny` et `plugins.slots.*`
  doivent référencer des ids de plugin **détectables**. Les ids inconnus sont des **erreurs**.
- Si un plugin est installé mais possède un manifeste ou un schéma manquant ou cassé,
  la validation échoue et Doctor signale l'erreur du plugin.
- Si la configuration du plugin existe mais que le plugin est **désactivé**, la configuration est conservée et
  un **avertissement** est affiché dans Doctor + les journaux.

Consultez la [Référence de la configuration](/fr/gateway/configuration) pour le schéma complet `plugins.*`.

## Remarques

- Le manifeste est **requis pour les plugins natifs OpenClaw**, y compris pour les chargements depuis le système de fichiers local. Le runtime charge toujours le module du plugin séparément ; le manifeste sert uniquement à la découverte + validation.
- Les manifestes natifs sont analysés avec JSON5, donc les commentaires, les virgules de fin et les clés non entre guillemets sont acceptés tant que la valeur finale reste un objet.
- Seuls les champs de manifeste documentés sont lus par le chargeur de manifeste. Évitez les clés personnalisées de niveau supérieur.
- `channels`, `providers`, `cliBackends` et `skills` peuvent tous être omis lorsqu'un plugin n'en a pas besoin.
- `providerCatalogEntry` doit rester léger et ne doit pas importer de code d'exécution volumineux ; utilisez-le pour les métadonnées statiques du catalogue de fournisseurs ou des descripteurs de découverte étroits, et non pour l'exécution au moment de la requête.
- Les types de plugins exclusifs sont sélectionnés via `plugins.slots.*` : `kind: "memory"` via `plugins.slots.memory`, `kind: "context-engine"` via `plugins.slots.contextEngine` (par défaut `legacy`).
- Déclarez le type de plugin exclusif dans ce manifeste. L'entrée d'exécution `OpenClawPluginDefinition.kind` est obsolète et ne reste qu'en solution de repli de compatibilité pour les plugins plus anciens.
- Les métadonnées de variable d'environnement (`setup.providers[].envVars`, `providerAuthEnvVars` obsolète, et `channelEnvVars`) sont uniquement déclaratives. Les statuts, les audits, la validation de la livraison cron et d'autres surfaces en lecture seule appliquent toujours la confiance du plugin et la politique d'activation effective avant de traiter une variable d'environnement comme configurée.
- Pour les métadonnées de l'assistant d'exécution qui nécessitent du code de provider, consultez [Provider runtime hooks](/fr/plugins/architecture-internals#provider-runtime-hooks).
- Si votre plugin dépend de modules natifs, documentez les étapes de construction et toutes les exigences de liste d'autorisation du gestionnaire de packages (par exemple, pnpm `allow-build-scripts` + `pnpm rebuild <package>`).

## Connexes

<CardGroup cols={3}>
  <Card title="Construction de plugins" href="/fr/plugins/building-plugins" icon="rocket">
    Getting started avec les plugins.
  </Card>
  <Card title="Architecture des plugins" href="/fr/plugins/architecture" icon="diagram-project">
    Architecture interne et modèle de capacités.
  </Card>
  <Card title="Présentation du SDK" href="/fr/plugins/sdk-overview" icon="book">
    Référence du SDK de plugin et importations de sous-chemins.
  </Card>
</CardGroup>
