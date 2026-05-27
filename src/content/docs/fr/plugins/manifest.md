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
Pour le modèle de capacités natif et les directives actuelles de compatibilité externe :
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

| Champ                                | Obligatoire | Type                             | Signification                                                                                                                                                                                                                                                                                                                                            |
| ------------------------------------ | ----------- | -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`                                 | Oui         | `string`                         | Identifiant canonique du plugin. C'est l'identifiant utilisé dans `plugins.entries.<id>`.                                                                                                                                                                                                                                                                |
| `configSchema`                       | Oui         | `object`                         | Schéma JSON en ligne pour la configuration de ce plugin.                                                                                                                                                                                                                                                                                                 |
| `enabledByDefault`                   | Non         | `true`                           | Marque un plugin groupé comme activé par défaut. Omettez-le ou définissez une valeur autre que `true` pour laisser le plugin désactivé par défaut.                                                                                                                                                                                                       |
| `enabledByDefaultOnPlatforms`        | Non         | `string[]`                       | Marque un plugin groupé comme activé par défaut uniquement sur les plateformes Node.js listées, par exemple `["darwin"]`. La configuration explicite prime toujours.                                                                                                                                                                                     |
| `legacyPluginIds`                    | Non         | `string[]`                       | Identifiants obsolètes qui sont normalisés vers cet identifiant de plugin canonique.                                                                                                                                                                                                                                                                     |
| `autoEnableWhenConfiguredProviders`  | Non         | `string[]`                       | Identifiants de provider qui doivent activer automatiquement ce plugin lorsque l'auth, la config ou les références de modèle les mentionnent.                                                                                                                                                                                                            |
| `kind`                               | Non         | `"memory"` \| `"context-engine"` | Déclare un type de plugin exclusif utilisé par `plugins.slots.*`.                                                                                                                                                                                                                                                                                        |
| `channels`                           | Non         | `string[]`                       | Identifiants de canal détenus par ce plugin. Utilisés pour la découverte et la validation de la configuration.                                                                                                                                                                                                                                           |
| `providers`                          | Non         | `string[]`                       | Identifiants de provider détenus par ce plugin.                                                                                                                                                                                                                                                                                                          |
| `providerCatalogEntry`               | Non         | `string`                         | Chemin de module léger de catalogue de providers, relatif à la racine du plugin, pour les métadonnées de catalogue de providers délimitées au manifeste qui peuvent être chargées sans activer le runtime complet du plugin.                                                                                                                             |
| `modelSupport`                       | Non         | `object`                         | Métadonnées de famille de modèles abrégées détenues par le manifeste, utilisées pour charger automatiquement le plugin avant l'exécution.                                                                                                                                                                                                                |
| `modelCatalog`                       | Non         | `object`                         | Métadonnées déclaratives du catalogue de modèles pour les providers détenus par ce plugin. Il s'agit du contrat du plan de contrôle pour le listing en lecture seule futur, l'onboarding, les sélecteurs de modèles, les alias et la suppression sans charger le runtime du plugin.                                                                      |
| `modelPricing`                       | Non         | `object`                         | Stratégie de recherche de tarification externe détenue par le provider. Utilisez-la pour exclure les providers locaux/auto-hébergés des catalogues de tarification distants ou pour mapper les références de providers aux identifiants de catalogue OpenRouter/LiteLLM sans coder en dur les identifiants de providers dans le cœur.                    |
| `modelIdNormalization`               | Non         | `object`                         | Nettoyage des alias/préfixes d'identifiant de modèle détenu par le provider qui doit s'exécuter avant le chargement du runtime du provider.                                                                                                                                                                                                              |
| `providerEndpoints`                  | Non         | `object[]`                       | Métadonnées d'hôte/endpoint baseUrl détenues par le manifeste pour les routes de providers que le cœur doit classer avant le chargement du runtime du provider.                                                                                                                                                                                          |
| `providerRequest`                    | Non         | `object`                         | Métadonnées peu coûteuses de famille de providers et de compatibilité des requêtes utilisées par la stratégie de requête générique avant le chargement du runtime du provider.                                                                                                                                                                           |
| `cliBackends`                        | Non         | `string[]`                       | Identifiants de backend d'inférence CLI détenus par ce plugin. Utilisés pour l'auto-activation au démarrage à partir de références de configuration explicites.                                                                                                                                                                                          |
| `syntheticAuthRefs`                  | Non         | `string[]`                       | Références de backend de provider ou CLI dont le hook d'authentification synthétique détenu par le plugin doit être sondé lors de la découverte à froid des modèles avant le chargement du runtime.                                                                                                                                                      |
| `nonSecretAuthMarkers`               | Non         | `string[]`                       | Valeurs de clé d'API API d'espace réservé détenues par le plugin groupé qui représentent un état d'identification local non secret, OAuth ou ambiant.                                                                                                                                                                                                    |
| `commandAliases`                     | Non         | `object[]`                       | Noms de commandes détenus par ce plugin qui doivent produire une configuration et des diagnostics CLI conscients du plugin avant le chargement du runtime.                                                                                                                                                                                               |
| `providerAuthEnvVars`                | Non         | `Record<string, string[]>`       | Métadonnées d'environnement de compatibilité obsolètes pour la recherche d'authentification/de statut de provider. Préférez `setup.providers[].envVars` pour les nouveaux plugins ; OpenClaw lit encore ceci pendant la période de dépréciation.                                                                                                         |
| `providerAuthAliases`                | Non         | `Record<string, string>`         | Identifiants de providers qui doivent réutiliser un autre identifiant de provider pour la recherche d'authentification, par exemple un provider de codage qui partage la clé d'API API du provider de base et les profils d'authentification.                                                                                                            |
| `channelEnvVars`                     | Non         | `Record<string, string[]>`       | Métadonnées d'environnement de canal peu coûteuses que OpenClaw peut inspecter sans charger le code du plugin. Utilisez-les pour la configuration de canal pilotée par l'environnement ou les surfaces d'authentification que les assistants génériques de démarrage/configuration doivent voir.                                                         |
| `providerAuthChoices`                | Non         | `object[]`                       | Métadonnées de choix d'authentification peu coûteuses pour les sélecteurs d'intégration, la résolution de provider préféré et le câblage simple des indicateurs CLI.                                                                                                                                                                                     |
| `activation`                         | Non         | `object`                         | Métadonnées du planificateur d'activation peu coûteuses pour le démarrage, le provider, la commande, le canal, l'itinéraire et le chargement déclenché par des capacités. Métadonnées uniquement ; le runtime du plugin possède toujours le comportement réel.                                                                                           |
| `setup`                              | Non         | `object`                         | Descripteurs de configuration/intégration peu coûteux que les surfaces de découverte et de configuration peuvent inspecter sans charger le runtime du plugin.                                                                                                                                                                                            |
| `qaRunners`                          | Non         | `object[]`                       | Descripteurs de lanceur QA peu coûteux utilisés par l'hôte partagé `openclaw qa` avant le chargement du runtime du plugin.                                                                                                                                                                                                                               |
| `contracts`                          | Non         | `object`                         | Instantané statique de la propriété des capacités pour les hooks d'authentification externes, les embeddings, la parole, la transcription en temps réel, la voix en temps réel, la compréhension des médias, la génération d'images, la génération de musique, la génération de vidéo, la récupération web, la recherche web et la propriété des outils. |
| `mediaUnderstandingProviderMetadata` | Non         | `Record<string, object>`         | Valeurs par défaut peu coûteuses pour la compréhension des médias pour les ids de provider déclarés dans `contracts.mediaUnderstandingProviders`.                                                                                                                                                                                                        |
| `imageGenerationProviderMetadata`    | Non         | `Record<string, object>`         | Métadonnées d'authentification peu coûteuses pour la génération d'images pour les ids de provider déclarés dans `contracts.imageGenerationProviders`, y compris les alias d'authentification propres aux providers et les gardes d'URL de base.                                                                                                          |
| `videoGenerationProviderMetadata`    | Non         | `Record<string, object>`         | Métadonnées d'authentification peu coûteuses pour la génération de vidéo pour les ids de provider déclarés dans `contracts.videoGenerationProviders`, y compris les alias d'authentification propres aux providers et les gardes d'URL de base.                                                                                                          |
| `musicGenerationProviderMetadata`    | Non         | `Record<string, object>`         | Métadonnées d'authentification peu coûteuses pour la génération de musique pour les ids de provider déclarés dans `contracts.musicGenerationProviders`, y compris les alias d'authentification propres aux providers et les gardes d'URL de base.                                                                                                        |
| `toolMetadata`                       | Non         | `Record<string, object>`         | Métadonnées de disponibilité peu coûteuses pour les outils détenus par le plugin déclarés dans `contracts.tools`. À utiliser lorsqu'un outil ne doit pas charger le runtime tant qu'aucune preuve de configuration, d'environnement ou d'authentification n'existe.                                                                                      |
| `channelConfigs`                     | Non         | `Record<string, object>`         | Métadonnées de configuration de canal détenues par le manifeste, fusionnées dans les surfaces de découverte et de validation avant le chargement du runtime.                                                                                                                                                                                             |
| `skills`                             | Non         | `string[]`                       | Répertoires de compétences à charger, relatifs à la racine du plugin.                                                                                                                                                                                                                                                                                    |
| `name`                               | Non         | `string`                         | Nom du plugin lisible par l'homme.                                                                                                                                                                                                                                                                                                                       |
| `description`                        | Non         | `string`                         | Résumé court affiché dans les surfaces du plugin.                                                                                                                                                                                                                                                                                                        |
| `version`                            | Non         | `string`                         | Version du plugin à titre informatif.                                                                                                                                                                                                                                                                                                                    |
| `uiHints`                            | Non         | `Record<string, object>`         | Libellés d'interface utilisateur, textes de substitution et indicateurs de sensibilité pour les champs de configuration.                                                                                                                                                                                                                                 |

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

| Champ                  | Obligatoire | Type       | Signification                                                                                                                                                                                                   |
| ---------------------- | ----------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `aliases`              | Non         | `string[]` | Identifiants de provider supplémentaires qui doivent être comptés comme des alias d'authentification statique pour le provider de génération.                                                                   |
| `authProviders`        | Non         | `string[]` | Identifiants de provider dont les profils d'authentification configurés doivent être comptés comme une authentification pour ce provider de génération.                                                         |
| `configSignals`        | Non         | `object[]` | Signaux de disponibilité peu coûteux basés uniquement sur la configuration pour les providers locaux ou auto-hébergés qui peuvent être configurés sans profils d'authentification ni variables d'environnement. |
| `authSignals`          | Non         | `object[]` | Signaux d'authentification explicites. Lorsqu'ils sont présents, ils remplacent l'ensemble de signaux par défaut de l'identifiant du fournisseur, `aliases`, et `authProviders`.                                |
| `referenceAudioInputs` | Non         | `boolean`  | Génération de vidéo uniquement. Définissez sur `true` lorsque le provider accepte des ressources audio de référence ; sinon `video_generate` masque les paramètres de référence audio.                          |

Chaque entrée `configSignals` prend en charge :

| Champ         | Obligatoire | Type       | Signification                                                                                                                                                                                                                       |
| ------------- | ----------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `rootPath`    | Oui         | `string`   | Chemin en pointillés vers l'objet de configuration propriétaire du plugin à inspecter, par exemple `plugins.entries.example.config`.                                                                                                |
| `overlayPath` | Non         | `string`   | Chemin en pointillés dans la configuration racine dont l'objet doit se superposer à l'objet racine avant d'évaluer le signal. Utilisez ceci pour une configuration spécifique à une capacité telle que `image`, `video` ou `music`. |
| `required`    | Non         | `string[]` | Chemins en pointillés dans la configuration effective qui doivent avoir des valeurs configurées. Les chaînes ne doivent pas être vides ; les objets et les tableaux ne doivent pas être vides.                                      |
| `requiredAny` | Non         | `string[]` | Chemins en pointillés dans la configuration effective où au moins l'un d'eux doit avoir une valeur configurée.                                                                                                                      |
| `mode`        | Non         | `object`   | Garde de mode de chaîne optionnel dans la configuration effective. Utilisez ceci lorsque la disponibilité basée uniquement sur la configuration s'applique à un seul mode.                                                          |

Chaque garde `mode` prend en charge :

| Champ        | Obligatoire | Type       | Signification                                                                          |
| ------------ | ----------- | ---------- | -------------------------------------------------------------------------------------- |
| `path`       | Non         | `string`   | Chemin en pointillés dans la configuration effective. La valeur par défaut est `mode`. |
| `default`    | Non         | `string`   | Valeur de mode à utiliser lorsque la configuration omet le chemin.                     |
| `allowed`    | Non         | `string[]` | Si présent, le signal ne passe que lorsque le mode effectif est l'une de ces valeurs.  |
| `disallowed` | Non         | `string[]` | Si présent, le signal échoue lorsque le mode effectif est l'une de ces valeurs.        |

Chaque entrée `authSignals` prend en charge :

| Champ             | Obligatoire | Type     | Signification                                                                                                                                                                                                     |
| ----------------- | ----------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `provider`        | Oui         | `string` | Id du provider à vérifier dans les profils d'auth configurés.                                                                                                                                                     |
| `providerBaseUrl` | Non         | `object` | Garde facultative qui fait en sorte que le signal ne compte que lorsque le provider configuré référencé utilise une URL de base autorisée. À utiliser lorsqu'un alias d'auth n'est valide que pour certaines API. |

Chaque garde `providerBaseUrl` prend en charge :

| Champ             | Obligatoire | Type       | Signification                                                                                                                                                            |
| ----------------- | ----------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `provider`        | Oui         | `string`   | Id de config du provider dont `baseUrl` doit être vérifié.                                                                                                               |
| `defaultBaseUrl`  | Non         | `string`   | URL de base à supposer lorsque la config du provider omet `baseUrl`.                                                                                                     |
| `allowedBaseUrls` | Oui         | `string[]` | URLs de base autorisées pour ce signal d'auth. Le signal est ignoré lorsque l'URL de base configurée ou par défaut ne correspond pas à l'une de ces valeurs normalisées. |

## Référence des métadonnées de tool

`toolMetadata` utilise les mêmes formes `configSignals` et `authSignals` que
les métadonnées du provider de génération, indexées par nom de tool. `contracts.tools` déclare
la propriété. `toolMetadata` déclare une preuve de disponibilité bon marché afin que OpenClaw puisse
éviter d'importer un runtime de plugin juste pour que sa factory de tool renvoie `null`.

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

Si un tool n'a pas de `toolMetadata`, OpenClaw conserve le comportement existant et
charge le plugin propriétaire lorsque le contrat du tool correspond à la stratégie. Pour les tools
sur le chemin critique dont la factory dépend de l'auth/config, les auteurs de plugins devraient déclarer
`toolMetadata` au lieu de faire importer le runtime par le core pour demander.

## Référence de providerAuthChoices

Chaque entrée `providerAuthChoices` décrit un choix d'onboarding ou d'auth.
OpenClaw lit cela avant le chargement du runtime du provider.
Les listes de configuration du provider utilisent ces choix de manifeste, les choix de configuration dérivés des descripteurs
et les métadonnées du catalogue d'installation sans charger le runtime du provider.

| Champ                 | Obligatoire | Type                                                                  | Signification                                                                                                           |
| --------------------- | ----------- | --------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `provider`            | Oui         | `string`                                                              | ID du provider auquel ce choix appartient.                                                                              |
| `method`              | Oui         | `string`                                                              | ID de la méthode d'auth vers laquelle dispatcher.                                                                       |
| `choiceId`            | Oui         | `string`                                                              | ID stable du choix d'auth utilisé par les flux d'onboarding et de CLI.                                                  |
| `choiceLabel`         | Non         | `string`                                                              | Libellé destiné à l'utilisateur. Si omis, OpenClaw utilise par défaut `choiceId`.                                       |
| `choiceHint`          | Non         | `string`                                                              | Texte d'aide court pour le sélecteur.                                                                                   |
| `assistantPriority`   | Non         | `number`                                                              | Les valeurs inférieures sont triées plus tôt dans les sélecteurs interactifs pilotés par l'assistant.                   |
| `assistantVisibility` | Non         | `"visible"` \| `"manual-only"`                                        | Masquer le choix dans les sélecteurs de l'assistant tout en permettant toujours une sélection CLI manuelle.             |
| `deprecatedChoiceIds` | Non         | `string[]`                                                            | IDs de choix hérités qui doivent rediriger les utilisateurs vers ce choix de remplacement.                              |
| `groupId`             | Non         | `string`                                                              | ID de groupe facultatif pour regrouper les choix associés.                                                              |
| `groupLabel`          | Non         | `string`                                                              | Libellé destiné à l'utilisateur pour ce groupe.                                                                         |
| `groupHint`           | Non         | `string`                                                              | Texte d'aide court pour le groupe.                                                                                      |
| `optionKey`           | Non         | `string`                                                              | Clé d'option interne pour les flux d'auth à un seul indicateur simple.                                                  |
| `cliFlag`             | Non         | `string`                                                              | Nom de l'indicateur CLI, tel que `--openrouter-api-key`.                                                                |
| `cliOption`           | Non         | `string`                                                              | Forme complète de l'option CLI, telle que `--openrouter-api-key <key>`.                                                 |
| `cliDescription`      | Non         | `string`                                                              | Description utilisée dans l'aide de la CLI.                                                                             |
| `onboardingScopes`    | Non         | `Array<"text-inference" \| "image-generation" \| "music-generation">` | Surfaces d'onboarding dans lesquelles ce choix doit apparaître. Si omis, la valeur par défaut est `["text-inference"]`. |

## Référence de commandAliases

Utilisez `commandAliases` lorsqu'un plugin possède un nom de commande d'exécution que les utilisateurs peuvent
mettre par erreur dans `plugins.allow` ou essayer d'exécuter en tant que commande racine de la CLI. OpenClaw
utilise ces métadonnées pour les diagnostics sans importer le code d'exécution du plugin.

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

| Champ        | Obligatoire | Type              | Signification                                                                                           |
| ------------ | ----------- | ----------------- | ------------------------------------------------------------------------------------------------------- |
| `name`       | Oui         | `string`          | Nom de la commande qui appartient à ce plugin.                                                          |
| `kind`       | Non         | `"runtime-slash"` | Marque l'alias comme une commande de type slash de chat plutôt que comme une commande racine de la CLI. |
| `cliCommand` | Non         | `string`          | Commande racine de la CLI associée à suggérer pour les opérations de la CLI, si elle existe.            |

## Référence d'activation

Utilisez `activation` lorsque le plugin peut facilement déclarer quels événements du plan de contrôle
doivent l'inclure dans un plan d'activation/chargement.

Ce bloc est des métadonnées de planificateur, pas une API de cycle de vie. Il n'enregistre pas
le comportement d'exécution, ne remplace pas `register(...)` et ne promet pas que
le code du plugin a déjà été exécuté. Le planificateur d'activation utilise ces champs pour
restreindre les plugins candidats avant de revenir aux métadonnées de propriété du manifeste existantes
telles que `providers`, `channels`, `commandAliases`, `setup.providers`,
`contracts.tools` et les hooks.

Privilégiez les métadonnées les plus étroites décrivant déjà la propriété. Utilisez
`providers`, `channels`, `commandAliases`, les descripteurs de configuration ou `contracts`
lorsque ces champs expriment la relation. Utilisez `activation` pour des indices
supplémentaires de planification qui ne peuvent pas être représentés par ces champs de propriété.
Utilisez `cliBackends` de premier niveau pour les alias d'exécution CLI tels que `claude-cli`,
`my-cli` ou `google-gemini-cli` ; `activation.onAgentHarnesses` est uniquement pour
les identifiants de harnais d'agent intégré qui n'ont pas déjà de champ de propriété.

Ce bloc contient uniquement des métadonnées. Il n'enregistre pas de comportement d'exécution et ne
remplace pas `register(...)`, `setupEntry` ou d'autres points d'entrée de plugin/runtime.
Les consommateurs actuels l'utilisent comme indice de réduction avant le chargement plus large des plugins, donc
l'absence de métadonnées d'activation hors démarrage ne coûte généralement que des performances ; cela
ne devrait pas modifier la correction tant que les replis de propriété du manifeste existent encore.

Chaque plugin doit définir `activation.onStartup` intentionnellement. Définissez-le sur `true`
uniquement lorsque le plugin doit s'exécuter lors du démarrage du Gateway. Définissez-le sur `false` lorsque
le plugin est inactif au démarrage et ne doit être chargé que par des déclencheurs plus étroits.
Omettre `onStartup` ne charge plus implicitement le plugin au démarrage ; utilisez des métadonnées
d'activation explicites pour le démarrage, le canal, la configuration, le harnais d'agent, la mémoire ou
d'autres déclencheurs d'activation plus étroits.

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

| Champ              | Obligatoire | Type                                                 | Signification                                                                                                                                                                                                                                    |
| ------------------ | ----------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `onStartup`        | Non         | `boolean`                                            | Activation explicite au démarrage du Gateway. Chaque plugin doit définir cela. `true` importe le plugin lors du démarrage ; `false` le laisse en mode paresseux au démarrage sauf si un autre déclencheur correspondant nécessite le chargement. |
| `onProviders`      | Non         | `string[]`                                           | Identifiants de fournisseur qui doivent inclure ce plugin dans les plans d'activation/chargement.                                                                                                                                                |
| `onAgentHarnesses` | Non         | `string[]`                                           | Identifiants du runtime du harnais d'agent intégré qui doivent inclure ce plugin dans les plans d'activation/chargement. Utilisez `cliBackends` de premier niveau pour les alias du backend CLI.                                                 |
| `onCommands`       | Non         | `string[]`                                           | Identifiants de commande qui doivent inclure ce plugin dans les plans d'activation/chargement.                                                                                                                                                   |
| `onChannels`       | Non         | `string[]`                                           | Identifiants de canal qui doivent inclure ce plugin dans les plans d'activation/chargement.                                                                                                                                                      |
| `onRoutes`         | Non         | `string[]`                                           | Types de routes qui doivent inclure ce plugin dans les plans d'activation/chargement.                                                                                                                                                            |
| `onConfigPaths`    | Non         | `string[]`                                           | Chemins de configuration relatifs à la racine qui doivent inclure ce plugin dans les plans de démarrage/chargement lorsque le chemin est présent et n'est pas explicitement désactivé.                                                           |
| `onCapabilities`   | Non         | `Array<"provider" \| "channel" \| "tool" \| "hook">` | Indications de capacités générales utilisées par la planification de l'activation du plan de contrôle. Préférez des champs plus étroits lorsque cela est possible.                                                                               |

Consommateurs actuels en direct :

- La planification du démarrage de la Gateway utilise `activation.onStartup` pour l'import explicite
  au démarrage
- la planification du CLI déclenchée par commande revient à l'ancien
  `commandAliases[].cliCommand` ou `commandAliases[].name`
- la planification du démarrage du runtime agent utilise `activation.onAgentHarnesses` pour
  les harnais intégrés et `cliBackends[]` de premier niveau pour les alias du runtime CLI
- la planification de configuration/canal déclenchée par le canal revient à l'ancienne
  propriété `channels[]` lorsque les métadonnées d'activation explicite du canal sont manquantes
- la planification des plugins de démarrage utilise `activation.onConfigPaths` pour les surfaces de configuration racine
  non canalisées telles que le bloc `browser` du plugin navigateur groupé
- la planification de configuration/runtime déclenchée par le fournisseur revient à l'ancien
  `providers[]` et à la propriété `cliBackends[]` de premier niveau lorsque les métadonnées
  d'activation explicite du fournisseur sont manquantes

Les diagnostics du planificateur peuvent distinguer les indices d'activation explicite du repli de propriété du manifeste. Par exemple, `activation-command-hint` signifie que `activation.onCommands` a correspondu, tandis que `manifest-command-alias` signifie que le planificateur a utilisé la propriété `commandAliases` à la place. Ces étiquettes de raison sont destinées aux diagnostics de l'hôte et aux tests ; les auteurs de plugins doivent continuer à déclarer les métadonnées qui décrivent le mieux la propriété.

## Référence qaRunners

Utilisez `qaRunners` lorsqu'un plugin contribue un ou plusieurs runners de transport sous la racine partagée `openclaw qa`. Gardez ces métadonnées peu coûteuses et statiques ; le runtime du plugin possède toujours l'inscription CLI réelle via une surface `runtime-api.ts` légère qui exporte `qaRunnerCliRegistrations`.

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

## Référence de configuration

Utilisez `setup` lorsque les surfaces de configuration et d'onboarding ont besoin de métadonnées bon marché appartenant au plugin avant le chargement du runtime.

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

Le `cliBackends` de premier niveau reste valide et continue de décrire les backends d'inférence CLI. `setup.cliBackends` est la surface de descripteur spécifique à la configuration pour les flux de plan de contrôle/configuration qui doivent rester uniquement des métadonnées.

Lorsqu'ils sont présents, `setup.providers` et `setup.cliBackends` sont la surface de recherche privilégiée basée sur le descripteur pour la découverte de la configuration. Si le descripteur ne fait que restreindre le plugin candidat et que la configuration a toujours besoin de crochets de runtime plus riches au moment de la configuration, définissez `requiresRuntime: true` et conservez `setup-api` en place comme chemin d'exécution de repli.

OpenClaw inclut également OpenClaw`setup.providers[].envVars` dans l'auth générique du provider et les recherches de variables d'environnement. `providerAuthEnvVars` reste pris en charge via un adaptateur de compatibilité pendant la période de dépréciation, mais les plugins non groupés qui l'utilisent encore reçoivent un diagnostic de manifeste. Les nouveaux plugins doivent placer les métadonnées d'environnement de configuration/d'état sur `setup.providers[].envVars`.

OpenClaw peut également déduire des choix de configuration simples à partir de OpenClaw`setup.providers[].authMethods` lorsqu aucune entrée de configuration n'est disponible, ou lorsque `setup.requiresRuntime: false` déclare que l'exécution de la configuration est inutile. Les entrées explicites `providerAuthChoices`CLI restent préférées pour les étiquettes personnalisées, les indicateurs CLI, la portée de l'onboarding et les métadonnées de l'assistant.

Définissez `requiresRuntime: false`OpenClaw uniquement lorsque ces descripteurs sont suffisants pour la surface de configuration. OpenClaw traite `false` explicite comme un contrat de descripteur uniquement et n'exécutera pas `setup-api` ou `openclaw.setupEntry`OpenClaw pour la recherche de configuration. Si un plugin à descripteur uniquement expédie toujours l'une de ces entrées d'exécution de configuration, OpenClaw signale un diagnostic additif et continue de l'ignorer. `requiresRuntime` omis conserve le comportement de repli hérité afin que les plugins existants qui ont ajouté des descripteurs sans l'indicateur ne se brisent pas.

Étant donné que la recherche de configuration peut exécuter le code `setup-api` détenu par le plugin, les valeurs normalisées `setup.providers[].id` et `setup.cliBackends[]` doivent rester uniques parmi les plugins découverts. Une propriété ambiguë échoue fermement au lieu de choisir un gagnant en fonction de l'ordre de découverte.

Lorsque l'exécution de la configuration a lieu, les diagnostics du registre de configuration signalent une dérive des descripteurs si `setup-api`CLI enregistre un provider ou un backend CLI que les descripteurs du manifeste ne déclarent pas, ou si un descripteur n'a pas d'enregistrement d'exécution correspondant. Ces diagnostics sont additifs et ne rejettent pas les plugins hérités.

### référence setup.providers

| Champ          | Obligatoire | Type       | Signification                                                                                                                                 |
| -------------- | ----------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`           | Oui         | `string`   | Identifiant du provider exposé lors de la configuration ou de l'onboarding. Gardez les identifiants normalisés uniques à l'échelle mondiale.  |
| `authMethods`  | Non         | `string[]` | Identifiants des méthodes de configuration/authentification que ce provider prend en charge sans charger le runtime complet.                  |
| `envVars`      | Non         | `string[]` | Variables d'environnement que les interfaces génériques de configuration/état peuvent vérifier avant le chargement du runtime du plugin.      |
| `authEvidence` | Non         | `object[]` | Vérifications locales peu coûteuses de preuve d'authentification pour les providers qui peuvent s'authentifier via des marqueurs non secrets. |

`authEvidence` est destiné aux marqueurs d'identification locaux appartenant au provider qui peuvent être vérifiés sans charger de code de runtime. Ces vérifications doivent rester peu coûteuses et locales : aucun appel réseau, aucune lecture de trousseau ou de gestionnaire de secrets, aucune commande shell, et aucune sonde d'API de provider.

Entrées de preuve prises en charge :

| Champ              | Requis | Type       | Signification                                                                                                                            |
| ------------------ | ------ | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `type`             | Oui    | `string`   | Actuellement `local-file-with-env`.                                                                                                      |
| `fileEnvVar`       | Non    | `string`   | Variable d'environnement contenant un chemin explicite vers un fichier d'identification.                                                 |
| `fallbackPaths`    | Non    | `string[]` | Chemins de fichiers d'identification locaux vérifiés lorsque `fileEnvVar` est absent ou vide. Prend en charge `${HOME}` et `${APPDATA}`. |
| `requiresAnyEnv`   | Non    | `string[]` | Au moins une variable d'environnement listée doit être non vide pour que la preuve soit valide.                                          |
| `requiresAllEnv`   | Non    | `string[]` | Chaque variable d'environnement listée doit être non vide pour que la preuve soit valide.                                                |
| `credentialMarker` | Oui    | `string`   | Marqueur non secret renvoyé lorsque la preuve est présente.                                                                              |
| `source`           | Non    | `string`   | Libellé de source orienté utilisateur pour la sortie d'authentification/état.                                                            |

### champs de configuration

| Champ              | Requis | Type       | Signification                                                                                                                                                                     |
| ------------------ | ------ | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `providers`        | Non    | `object[]` | Descripteurs de configuration du provider exposés lors de la configuration et de l'onboarding.                                                                                    |
| `cliBackends`      | Non    | `string[]` | Identifiants backend au moment de la configuration, utilisés pour la recherche de configuration basée sur le descripteur. Gardez les identifiants normalisés uniques globalement. |
| `configMigrations` | Non    | `string[]` | Identifiants de migration de configuration possédés par la surface de configuration de ce plugin.                                                                                 |
| `requiresRuntime`  | Non    | `boolean`  | Indique si la configuration nécessite encore l'exécution de `setup-api` après la recherche du descripteur.                                                                        |

## Référence uiHints

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
| `tags`        | `string[]` | Balises UI optionnelles.                              |
| `advanced`    | `boolean`  | Marque le champ comme avancé.                         |
| `sensitive`   | `boolean`  | Marque le champ comme secret ou sensible.             |
| `placeholder` | `string`   | Texte de remplacement pour les entrées de formulaire. |

## Référence des contrats

Utilisez `contracts` uniquement pour les métadonnées statiques de propriété des capacités qu'OpenClaw peut
lire sans importer le runtime du plugin.

```json
{
  "contracts": {
    "agentToolResultMiddleware": ["pi", "codex"],
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

| Champ                            | Type       | Signification                                                                                                                                       |
| -------------------------------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `embeddedExtensionFactories`     | `string[]` | Identifiants de fabrique d'extension app-server Codex, actuellement `codex-app-server`.                                                             |
| `agentToolResultMiddleware`      | `string[]` | Identifiants d'exécution pour lesquels un plugin groupé peut enregistrer un middleware de résultat d'outil.                                         |
| `externalAuthProviders`          | `string[]` | Identifiants de provider dont ce plugin possède le hook de profil d'authentification externe.                                                       |
| `embeddingProviders`             | `string[]` | Identifiants de provider d'embedding général que ce plugin possède pour une utilisation réutilisable d'embedding vectoriel en dehors de la mémoire. |
| `speechProviders`                | `string[]` | Identifiants de provider de parole que ce plugin possède.                                                                                           |
| `realtimeTranscriptionProviders` | `string[]` | Identifiants de provider de transcription en temps réel que ce plugin possède.                                                                      |
| `realtimeVoiceProviders`         | `string[]` | Identifiants de provider de voix en temps réel que ce plugin possède.                                                                               |
| `memoryEmbeddingProviders`       | `string[]` | Identifiants de provider d'embedding de mémoire que ce plugin possède.                                                                              |
| `mediaUnderstandingProviders`    | `string[]` | Identifiants de provider de compréhension des médias que ce plugin possède.                                                                         |
| `meetingNotesSourceProviders`    | `string[]` | Identifiants de provider source de notes de réunion que ce plugin possède.                                                                          |
| `imageGenerationProviders`       | `string[]` | Identifiants de provider de génération d'images que ce plugin possède.                                                                              |
| `videoGenerationProviders`       | `string[]` | Identifiants de provider de génération de vidéo que ce plugin possède.                                                                              |
| `webFetchProviders`              | `string[]` | Identifiants de provider de récupération web que ce plugin possède.                                                                                 |
| `webSearchProviders`             | `string[]` | Identifiants de provider de recherche web que ce plugin possède.                                                                                    |
| `migrationProviders`             | `string[]` | Identifiants de provider d'importation que ce plugin possède pour `openclaw migrate`.                                                               |
| `gatewayMethodDispatch`          | `string[]` | Droit réservé pour les routes HTTP authentifiées du plugin qui distribuent les méthodes du Gateway en processus.                                    |
| `tools`                          | `string[]` | Noms d'outils d'agent que ce plugin possède.                                                                                                        |

`contracts.embeddedExtensionFactories` est conservé pour les fabriques d'extensions de serveur d'application Codex groupées uniquement. Les transformations de résultats d'outils groupées doivent déclarer `contracts.agentToolResultMiddleware` et s'inscrire avec `api.registerAgentToolResultMiddleware(...)` à la place. Les plugins externes ne peuvent pas inscrire de middleware de résultat d'outil car la jointure peut réécrire la sortie de l'outil à haute confiance avant que le modèle ne la voie.

Les inscriptions d'exécution `api.registerTool(...)` doivent correspondre à `contracts.tools`. La découverte d'outils utilise cette liste pour charger uniquement les exécutions de plugins qui peuvent posséder les outils demandés.

Les fournisseurs de plugins qui implémentent `resolveExternalAuthProfiles` doivent déclarer `contracts.externalAuthProviders`. Les plugins sans la déclaration s'exécutent toujours via un mode de compatibilité obsolète, mais ce mode est plus lent et sera supprimé après la période de migration.

Les fournisseurs d'intégration de mémoire groupés doivent déclarer `contracts.memoryEmbeddingProviders` pour chaque identifiant d'adaptateur qu'ils exposent, y compris les adaptateurs intégrés tels que `local`CLI. Les chemins CLI autonomes utilisent ce contrat de manifeste pour charger uniquement le plugin propriétaire avant que le runtime complet du Gateway ait enregistré les fournisseurs.

Les fournisseurs d'intégration généraux doivent déclarer `contracts.embeddingProviders` pour chaque adaptateur enregistré avec `api.registerEmbeddingProvider(...)`. Utilisez le contrat général lorsque les vecteurs sont destinés à être consommés par plusieurs fonctionnalités, outils ou plugins. Conservez `contracts.memoryEmbeddingProviders` pour les adaptateurs dont la forme et le cycle de vie sont spécifiques à l'indexation de mémoire OpenClaw.

`contracts.gatewayMethodDispatch` accepte actuellement `"authenticated-request"`. C'est une porte d'hygiène d'API pour les routes HTTP de plugins natifs qui distribuent intentionnellement des méthodes du plan de contrôle du Gateway en processus, et non un bac à sable contre les plugins natifs malveillants. Utilisez-le uniquement pour les surfaces groupées/opérateurs étroitement examinées qui nécessitent déjà une authentification HTTP du Gateway.

## Référence de mediaUnderstandingProviderMetadata

Utilisez `mediaUnderstandingProviderMetadata` lorsqu'un fournisseur de compréhension multimédia possède des modèles par défaut, une priorité de repli d'authentification automatique ou une prise en charge native des documents dont les assistants principaux génériques ont besoin avant le chargement de l'exécution. Les clés doivent également être déclarées dans `contracts.mediaUnderstandingProviders`.

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

| Champ                  | Type                                | Signification                                                                                                  |
| ---------------------- | ----------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `capabilities`         | `("image" \| "audio" \| "video")[]` | Capacités multimédia exposées par ce fournisseur.                                                              |
| `defaultModels`        | `Record<string, string>`            | Correspondances capacité-modèle utilisées par défaut lorsque la configuration ne spécifie pas de modèle.       |
| `autoPriority`         | `Record<string, number>`            | Les nombres plus bas sont triés en premier pour le repli automatique du fournisseur basé sur les identifiants. |
| `nativeDocumentInputs` | `"pdf"[]`                           | Entrées de documents natives prises en charge par le fournisseur.                                              |

## Référence channelConfigs

Utilisez `channelConfigs` lorsqu'un plugin de canal a besoin de métadonnées de configuration légères avant le chargement de l'exécution. La découverte de la configuration/de l'état du canal en lecture seule peut utiliser directement ces métadonnées pour les canaux externes configurés lorsqu'aucune entrée de configuration n'est disponible, ou lorsque `setup.requiresRuntime: false` déclare l'exécution de la configuration inutile.

`channelConfigs` correspond aux métadonnées du manifeste du plugin, et non à une nouvelle section de configuration utilisateur de niveau supérieur. Les utilisateurs configurent toujours les instances de canal sous `channels.<channel-id>`. OpenClaw lit les métadonnées du manifeste pour décider quel plugin possède ce canal configuré avant l'exécution du code d'exécution du plugin.

Pour un plugin de canal, `configSchema` et `channelConfigs` décrivent différents chemins :

- `configSchema` valide `plugins.entries.<plugin-id>.config`
- `channelConfigs.<channel-id>.schema` valide `channels.<channel-id>`

Les plugins non groupés qui déclarent `channels[]` doivent également déclarer les entrées correspondantes dans `channelConfigs`. Sans elles, OpenClaw peut toujours charger le plugin, mais le schéma de configuration à froid, la configuration et les surfaces de l'interface utilisateur de contrôle ne peuvent pas connaître la forme de l选项 détenue par le canal jusqu'à ce que l'exécution du plugin ait lieu.

`channelConfigs.<channel-id>.commands.nativeCommandsAutoEnabled` et
`nativeSkillsAutoEnabled` peuvent déclarer des valeurs par défaut `auto` statiques pour les vérifications de configuration de commande
qui s'exécutent avant le chargement du runtime du canal. Les canals groupés peuvent également publier
les mêmes valeurs par défaut via `package.json#openclaw.channel.commands` aux côtés
des autres métadonnées du catalogue de canals détenues par leur package.

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

| Champ         | Type                     | Signification                                                                                                                                          |
| ------------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `schema`      | `object`                 | Schéma JSON pour `channels.<id>`. Requis pour chaque entrée de configuration de canal déclarée.                                                        |
| `uiHints`     | `Record<string, object>` | Étiquettes d'interface utilisateur/espaces réservés/indications de sensibilité facultatifs pour cette section de configuration de canal.               |
| `label`       | `string`                 | Étiquette de canal fusionnée dans les surfaces de sélection et d'inspection lorsque les métadonnées d'exécution ne sont pas prêtes.                    |
| `description` | `string`                 | Courte description du canal pour les surfaces d'inspection et de catalogue.                                                                            |
| `commands`    | `object`                 | Valeurs par défaut automatiques statiques pour les commandes natives et les compétences natives pour les vérifications de configuration pré-exécution. |
| `preferOver`  | `string[]`               | Identifiants de plugin hérités ou de moindre priorité que ce canal devrait dépasser dans les surfaces de sélection.                                    |

### Remplacement d'un autre plugin de canal

Utilisez `preferOver` lorsque votre plugin est le propriétaire privilégié pour un identifiant de canal qu'un
autre plugin peut également fournir. Les cas courants sont un identifiant de plugin renommé, un plugin autonome
qui remplace un plugin groupé, ou un fork maintenu qui conserve le même identifiant de canal pour la compatibilité de la configuration.

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

Lorsque `channels.chat` est configuré, OpenClaw considère à la fois l'identifiant du canal et
l'identifiant du plugin privilégié. Si le plugin de moindre priorité n'a été sélectionné que parce
qu'il est groupé ou activé par défaut, OpenClaw le désactive dans la configuration d'exécution effective
afin qu'un seul plugin possède le canal et ses outils. La sélection explicite de l'utilisateur l'emporte toujours :
si l'utilisateur active explicitement les deux plugins, OpenClaw
préserve ce choix et signale des diagnostics de canal/tool en double au lieu de
changer silencieusement l'ensemble de plugins demandé.

Gardez `preferOver` limité aux ids de plugins qui peuvent vraiment fournir le même channel.
Ce n'est pas un champ de priorité général et il ne renomme pas les clés de configuration utilisateur.

## Référence modelSupport

Utilisez `modelSupport` quand OpenClaw doit déduire votre plugin de provider à partir
d'ids de modèle abrégés comme `gpt-5.5` ou `claude-sonnet-4.6` avant le chargement
du runtime du plugin.

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
- `modelPatterns` l'emportent sur `modelPrefixes`
- si un plugin non groupé et un plugin groupé correspondent tous les deux, le plugin
  non groupé gagne
- l'ambiguïté restante est ignorée jusqu'à ce que l'utilisateur ou la configuration spécifie un provider

Champs :

| Champ           | Type       | Signification                                                                                    |
| --------------- | ---------- | ------------------------------------------------------------------------------------------------ |
| `modelPrefixes` | `string[]` | Préfixes correspondants avec `startsWith` aux ids de modèles abrégés.                            |
| `modelPatterns` | `string[]` | Sources regex correspondantes aux ids de modèles abrégés après suppression du suffixe de profil. |

## Référence modelCatalog

Utilisez `modelCatalog` quand OpenClaw doit connaître les métadonnées des modèles de provider avant
le chargement du runtime du plugin. C'est la source détenue par le manifeste pour les lignes
de catalogue fixes, les alias de provider, les règles de suppression et le mode de découverte. L'actualisation
du runtime appartient toujours au code du runtime du provider, mais le manifeste indique au cœur quand le runtime
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

| Champ            | Type                                                     | Signification                                                                                                                                                |
| ---------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `providers`      | `Record<string, object>`                                 | Lignes de catalogue pour les ids de providers possédés par ce plugin. Les clés doivent également apparaître dans `providers` de niveau supérieur.            |
| `aliases`        | `Record<string, object>`                                 | Alias de provider qui doivent être résolus vers un provider possédé pour la planification du catalogue ou de la suppression.                                 |
| `suppressions`   | `object[]`                                               | Lignes de modèle d'une autre source que ce plugin supprime pour une raison spécifique au provider.                                                           |
| `discovery`      | `Record<string, "static" \| "refreshable" \| "runtime">` | Indique si le catalogue du fournisseur peut être lu depuis les métadonnées du manifeste, actualisé dans le cache ou s'il nécessite une exécution (runtime).  |
| `runtimeAugment` | `boolean`                                                | Définissez `true` uniquement lorsque le runtime du fournisseur doit ajouter des lignes au catalogue après la planification du manifeste/de la configuration. |

`aliases` participe à la recherche de propriétaire du fournisseur pour la planification du catalogue de modèles.
Les cibles d'alias doivent être des fournisseurs de niveau supérieur appartenant au même plugin. Lorsqu'une
liste filtrée par fournisseur utilise un alias, OpenClaw peut lire le manifeste propriétaire et
appliquer les substitutions d'alias de l'API/de l'URL de base sans charger le runtime du fournisseur.
Les alias n'étendent pas les listings de catalogue non filtrés ; les listes larges émettent uniquement les
lignes du fournisseur canonique propriétaire.

`suppressions` remplace l'ancien hook de runtime du fournisseur `suppressBuiltInModel`.
Les entrées de suppression sont honorées uniquement lorsque le fournisseur est détenu par le plugin ou
déclaré comme une clé `modelCatalog.aliases` qui cible un fournisseur détenu. Les hooks
de suppression de runtime ne sont plus appelés lors de la résolution du modèle.

Champs du fournisseur :

| Champ     | Type                     | Signification                                                                         |
| --------- | ------------------------ | ------------------------------------------------------------------------------------- |
| `baseUrl` | `string`                 | URL de base par défaut facultative pour les modèles de ce catalogue de fournisseur.   |
| `api`     | `ModelApi`               | Adaptateur API par défaut facultatif pour les modèles de ce catalogue de fournisseur. |
| `headers` | `Record<string, string>` | En-têtes statiques facultatifs qui s'appliquent à ce catalogue de fournisseur.        |
| `models`  | `object[]`               | Lignes de modèle requises. Les lignes sans `id` sont ignorées.                        |

Champs du modèle :

| Champ           | Type                                                           | Signification                                                                                                     |
| --------------- | -------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `id`            | `string`                                                       | Identifiant de modèle local au fournisseur, sans le préfixe `provider/`.                                          |
| `name`          | `string`                                                       | Nom d'affichage facultatif.                                                                                       |
| `api`           | `ModelApi`                                                     | Substitution de l'API facultative par modèle.                                                                     |
| `baseUrl`       | `string`                                                       | Substitution facultative de l'URL de base par modèle.                                                             |
| `headers`       | `Record<string, string>`                                       | En-têtes statiques facultatifs par modèle.                                                                        |
| `input`         | `Array<"text" \| "image" \| "document" \| "audio" \| "video">` | Modalités acceptées par le modèle.                                                                                |
| `reasoning`     | `boolean`                                                      | Indique si le modèle expose un comportement de raisonnement.                                                      |
| `contextWindow` | `number`                                                       | Fenêtre contextuelle native du fournisseur.                                                                       |
| `contextTokens` | `number`                                                       | Plafond de contexte effectif facultatif à l'exécution s'il diffère de `contextWindow`.                            |
| `maxTokens`     | `number`                                                       | Nombre maximum de jetons de sortie lorsque connu.                                                                 |
| `cost`          | `object`                                                       | Prix facultatif en USD par million de jetons, incluant un `tieredPricing` facultatif.                             |
| `compat`        | `object`                                                       | Indicateurs de compatibilité facultatifs correspondant à la compatibilité de la configuration de modèle OpenClaw. |
| `status`        | `"available"` \| `"preview"` \| `"deprecated"` \| `"disabled"` | Statut de la liste. Supprimer uniquement lorsque la ligne ne doit pas apparaître du tout.                         |
| `statusReason`  | `string`                                                       | Raison facultative affichée avec le statut non disponible.                                                        |
| `replaces`      | `string[]`                                                     | Anciens identifiants de modèle locaux au fournisseur que ce modèle remplace.                                      |
| `replacedBy`    | `string`                                                       | Identifiant de modèle local au fournisseur de remplacement pour les lignes obsolètes.                             |
| `tags`          | `string[]`                                                     | Étiquettes stables utilisées par les sélecteurs et les filtres.                                                   |

Champs de suppression :

| Champ                      | Type       | Signification                                                                                                                   |
| -------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `provider`                 | `string`   | Identifiant du fournisseur pour la ligne en amont à supprimer. Doit être détenu par ce plugin ou déclaré comme un alias détenu. |
| `model`                    | `string`   | Identifiant de modèle local au fournisseur à supprimer.                                                                         |
| `reason`                   | `string`   | Message optionnel affiché lorsque la ligne supprimée est demandée directement.                                                  |
| `when.baseUrlHosts`        | `string[]` | Liste optionnelle des hôtes d'URL de base effectifs du provider requis avant que la suppression ne s'applique.                  |
| `when.providerConfigApiIn` | `string[]` | Liste optionnelle des valeurs exactes de configuration du provider `api` requises avant que la suppression ne s'applique.       |

Ne mettez pas de données d'exécution uniquement dans `modelCatalog`. Utilisez `static` uniquement lorsque les lignes du manifeste sont suffisamment complètes pour que les listes filtrées par provider et les surfaces de sélecteur puissent ignorer la découverte du registre/d'exécution. Utilisez `refreshable` lorsque les lignes du manifeste sont des amorces ou compléments utiles mais qu'un actualisation/cache peut ajouter plus de lignes plus tard ; les lignes actualisables ne sont pas autoritaires par elles-mêmes. Utilisez `runtime` lorsque OpenClaw doit charger l'exécution du provider pour connaître la liste.

## référence de modelIdNormalization

Utilisez `modelIdNormalization` pour un nettoyage d'identifiant de modèle appartenant au provider peu coûteux qui doit se produire avant le chargement de l'exécution du provider. Cela permet de conserver des alias tels que des noms de modèle courts, des identifiants hérités locaux au provider et des règles de préfixe de proxy dans le manifeste du plugin propriétaire plutôt que dans les tables centrales de sélection de modèle.

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
| `aliases`                            | `Record<string,string>` | Alias exacts d'identifiant de modèle insensibles à la casse. Les valeurs sont renvoyées telles qu'elles sont écrites.  |
| `stripPrefixes`                      | `string[]`              | Préfixes à supprimer avant la recherche d'alias, utiles pour la duplication héritée de provider/modèle.                |
| `prefixWhenBare`                     | `string`                | Préfixe à ajouter lorsque l'identifiant de modèle normalisé ne contient pas déjà `/`.                                  |
| `prefixWhenBareAfterAliasStartsWith` | `object[]`              | Règles de préfixe d'identifiant nu conditionnelles après la recherche d'alias, indexées par `modelPrefix` et `prefix`. |

## référence de providerEndpoints

Utilisez `providerEndpoints` pour la classification des points de terminaison dont la stratégie de demande générique doit avoir connaissance avant le chargement du runtime du fournisseur. Le cœur conserve toujours la signification de chaque `endpointClass` ; les manifestes de plugin possèdent les métadonnées de l'hôte et de l'URL de base.

Champs du point de terminaison :

| Champ                          | Type       | Signification                                                                                                                                       |
| ------------------------------ | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `endpointClass`                | `string`   | Classe de point de terminaison principale connue, telle que `openrouter`, `moonshot-native` ou `google-vertex`.                                     |
| `hosts`                        | `string[]` | Noms d'hôte exacts qui correspondent à la classe de point de terminaison.                                                                           |
| `hostSuffixes`                 | `string[]` | Suffixes d'hôte qui correspondent à la classe de point de terminaison. Préfixez avec `.` pour une correspondance par suffixe de domaine uniquement. |
| `baseUrls`                     | `string[]` | URLs de base HTTP(S) normalisées exactes qui correspondent à la classe de point de terminaison.                                                     |
| `googleVertexRegion`           | `string`   | Région statique Google Vertex pour les hôtes globaux exacts.                                                                                        |
| `googleVertexRegionHostSuffix` | `string`   | Suffixe à supprimer des hôtes correspondants pour exposer le préfixe de région Google Vertex.                                                       |

## Référence providerRequest

Utilisez `providerRequest` pour les métadonnées de compatibilité de demande peu coûteuses dont la stratégie de demande générique a besoin sans charger le runtime du fournisseur. Conservez la réécriture de la charge utile spécifique au comportement dans les hooks du runtime du fournisseur ou les helpers partagés de la famille de fournisseurs.

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

| Champ                 | Type         | Signification                                                                                                                |
| --------------------- | ------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| `family`              | `string`     | Libellé de la famille de fournisseurs utilisé par les décisions génériques de compatibilité des demandes et les diagnostics. |
| `compatibilityFamily` | `"moonshot"` | Bucket de compatibilité de famille de fournisseurs facultatif pour les helpers de demande partagés.                          |
| `openAICompletions`   | `object`     | Indicateurs de demande de complétion compatibles avec OpenAI, actuellement `supportsStreamingUsage`.                         |

## Référence modelPricing

Utilisez `modelPricing` lorsqu'un provider a besoin d'un comportement de tarification du plan de contrôle avant le chargement du runtime. Le cache de tarification du Gateway lit ces métadonnées sans importer le code runtime du provider.

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
| `openRouter` | `false \| object` | Mapping de recherche de tarification OpenRouter. `false` désactive la recherche OpenRouter pour ce provider.                      |
| `liteLLM`    | `false \| object` | Mapping de recherche de tarification LiteLLM. `false` désactive la recherche LiteLLM pour ce provider.                            |

Champs de la source :

| Champ                      | Type               | Signification                                                                                                                                                |
| -------------------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `provider`                 | `string`           | Id du provider du catalogue externe lorsqu'il diffère de l'id du provider OpenClaw, par exemple `z-ai` pour un provider `zai`.                               |
| `passthroughProviderModel` | `boolean`          | Traiter les ids de modèle contenant des barres obliques comme des références provider/modèle imbriquées, utile pour les providers proxy tels que OpenRouter. |
| `modelIdTransforms`        | `"version-dots"[]` | Variantes d'identifiants de modèle de catalogue externe supplémentaires. `version-dots` essaie les ids de version avec points comme `claude-opus-4.6`.       |

### Index des Fournisseurs OpenClaw

L'Index des Fournisseurs OpenClaw sont des métadonnées d'aperçu détenues par OpenClaw pour les providers dont les plugins peuvent ne pas encore être installés. Ce ne fait pas partie d'un manifeste de plugin. Les manifestes de plugin restent l'autorité du plugin installé. L'Index des Fournisseurs est le contrat de repli interne que les futures surfaces de provider installable et de sélecteur de modèle pré-installation consommeront lorsqu'un plugin de provider n'est pas installé.

Ordre d'autorité du catalogue :

1. Configuration utilisateur.
2. Manifeste du plugin installé `modelCatalog`.
3. Cache du catalogue de modèles issu d'une actualisation explicite.
4. Lignes d'aperçu de l'Index Fournisseur OpenClaw.

L'Index Fournisseur ne doit pas contenir de secrets, d'état activé, de hooks d'exécution ou de données de modèle spécifiques à un compte en direct. Ses catalogues d'aperçu utilisent la même forme de ligne `modelCatalog` provider que les manifests de plugin, mais doivent rester limités aux métadonnées d'affichage stables, à moins que les champs d'adaptateur d'exécution tels que `api`, `baseUrl`, la tarification ou les indicateurs de compatibilité ne soient intentionnellement alignés avec le manifest du plugin installé. Les providers avec une `/models` discovery en direct doivent écrire des lignes actualisées via le chemin de cache explicite du catalogue de modèles au lieu d'effectuer des appels normaux de listage ou d'onboarding aux APIs des providers.

Les entrées de l'Index Fournisseur peuvent également contenir des métadonnées de plugin installable pour les providers dont le plugin a été déplacé hors du cœur ou n'est pas encore installé par ailleurs. Ces métadonnées reflètent le modèle du catalogue channel : le nom du package, la spécification d'installation npm, l'intégrité attendue et les étiquettes d'auth-choice bon marché suffisent à afficher une option d'installation. Une fois le plugin installé, son manifest prévaut et l'entrée de l'Index Fournisseur est ignorée pour ce provider.

Les clés de capacité de niveau supérieur héritées sont obsolètes. Utilisez `openclaw doctor --fix` pour déplacer `speechProviders`, `realtimeTranscriptionProviders`, `realtimeVoiceProviders`, `mediaUnderstandingProviders`, `imageGenerationProviders`, `videoGenerationProviders`, `webFetchProviders` et `webSearchProviders` sous `contracts` ; le chargement normal du manifest ne traite plus ces champs de niveau supérieur comme une propriété de capacité.

## Manifest versus package.

Les deux fichiers servent des travaux différents :

| Fichier                | Utilisez-le pour                                                                                                                                                                       |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `openclaw.plugin.json` | Discovery, validation de configuration, métadonnées auth-choice et indices d'interface utilisateur qui doivent exister avant l'exécution du code du plugin                             |
| `package.json`         | Métadonnées npm, installation des dépendances et le bloc `openclaw` utilisé pour les points d'entrée, le verrouillage d'installation, la configuration ou les métadonnées du catalogue |

Si vous n'êtes pas sûr de l'appartenance d'une métadonnée, utilisez cette règle :

- si OpenClaw doit le savoir avant de charger le code du plugin, mettez-le dans OpenClaw`openclaw.plugin.json`
- s'il s'agit du conditionnement, des fichiers d'entrée ou du comportement de l'installation npm, mettez-le dans npm`package.json`

### champs package. qui affectent la découverte

Certaines métadonnées de plugin pré-exécution résident intentionnellement dans `package.json` sous le bloc
`openclaw` au lieu de `openclaw.plugin.json`.
`openclaw.bundle` et `openclaw.bundle.json`OpenClaw ne sont pas des contrats de plugin OpenClaw ;
les plugins natifs doivent utiliser `openclaw.plugin.json` ainsi que les champs
`package.json#openclaw` pris en charge ci-dessous.

Exemples importants :

| Champ                                                                                      | Signification                                                                                                                                                                                                                                      |
| ------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `openclaw.extensions`                                                                      | Déclare les points d'entrée des plugins natifs. Doit rester à l'intérieur du répertoire du package du plugin.                                                                                                                                      |
| `openclaw.runtimeExtensions`                                                               | Déclare les points d'entrée d'exécution JavaScript construits pour les packages installés. Doit rester à l'intérieur du répertoire du package du plugin.                                                                                           |
| `openclaw.setupEntry`                                                                      | Point d'entrée de configuration uniquement léger utilisé lors de l'onboarding, du démarrage différé du channel, et de la découverte du statut/SecretRef en lecture seule du channel. Doit rester à l'intérieur du répertoire du package du plugin. |
| `openclaw.runtimeSetupEntry`                                                               | Déclare le point d'entrée de configuration JavaScript construit pour les packages installés. Nécessite `setupEntry`, doit exister, et doit rester à l'intérieur du répertoire du package du plugin.                                                |
| `openclaw.channel`                                                                         | Métadonnées de catalogue de channel légères telles que les étiquettes, les chemins de documentation, les alias et le texte de sélection.                                                                                                           |
| `openclaw.channel.commands`                                                                | Métadonnées de prédéfinition automatique des commandes natives et des compétences natives utilisées par la configuration, l'audit et les surfaces de liste de commandes avant le chargement de l'exécution du channel.                             |
| `openclaw.channel.configuredState`                                                         | Métadonnées de vérificateur d'état configuré léger pouvant répondre à « une configuration uniquement env existe-t-elle déjà ? » sans charger l'exécution complète du channel.                                                                      |
| `openclaw.channel.persistedAuthState`                                                      | Métadonnées de vérificateur d'authentification persistante légère pouvant répondre à « quelque chose est-il déjà connecté ? » sans charger l'exécution complète du channel.                                                                        |
| `openclaw.install.clawhubSpec` / `openclaw.install.npmSpec` / `openclaw.install.localPath` | Conseils d'installation/de mise à jour pour les plugins groupés et publiés en externe.                                                                                                                                                             |
| `openclaw.install.defaultChoice`                                                           | Chemin d'installation préféré lorsque plusieurs sources d'installation sont disponibles.                                                                                                                                                           |
| `openclaw.install.minHostVersion`                                                          | Version minimale prise en charge de l'hôte OpenClaw, utilisant un plancher semver comme `>=2026.3.22` ou `>=2026.5.1-beta.1`.                                                                                                                      |
| `openclaw.install.expectedIntegrity`                                                       | Chaîne d'intégrité de dist npm attendue telle que `sha512-...` ; les flux d'installation et de mise à jour vérifient l'artefact récupéré par rapport à celle-ci.                                                                                   |
| `openclaw.install.allowInvalidConfigRecovery`                                              | Permet un chemin de récupération étroit pour la réinstallation des plugins groupés lorsque la configuration n'est pas valide.                                                                                                                      |
| `openclaw.startup.deferConfiguredChannelFullLoadUntilAfterListen`                          | Permet le chargement des surfaces de channel uniquement pour la configuration avant le plugin de channel complet lors du démarrage.                                                                                                                |

Les métadonnées du manifeste décident quels choix de provider/channel/setup apparaissent dans l'onboarding avant le chargement de l'exécution. `package.json#openclaw.install` indique à l'onboarding comment récupérer ou activer ce plugin lorsque l'utilisateur choisit l'une de ces options. Ne déplacez pas les conseils d'installation dans `openclaw.plugin.json`.

`openclaw.install.minHostVersion` est appliqué lors de l'installation et du chargement du registre du manifeste pour les sources de plugins non groupés. Les valeurs invalides sont rejetées ; les valeurs plus récentes mais valides ignorent les plugins externes sur les hôtes plus anciens. Les plugins sources groupés sont supposés être co-versionnés avec le checkout de l'hôte.

Les métadonnées officielles d'installation à la demande doivent utiliser `clawhubSpec` lorsque le plugin est publié sur ClawHub ; l'onboarding considère cela comme la source distante préférée et enregistre les faits d'artefact ClawHub après l'installation. `npmSpec` reste le repli de compatibilité pour les packages qui n'ont pas encore migré vers ClawHub.

L'épinglage précis de la version npm réside déjà dans npm`npmSpec`, par exemple
`"npmSpec": "@wecom/wecom-openclaw-plugin@1.2.3"`. Les entrées de catalogue externe officielles
doivent associer des spécifications exactes à `expectedIntegrity`npmnpm afin que les flux de mise à jour échouent
fermement si l'artefact npm récupéré ne correspond plus à la version épinglée.
L'intégration interactive propose toujours des spécifications npm provenant de registres de confiance, y compris les noms
de package nus et les balises de distribution (dist-tags), pour la compatibilité. Les diagnostics du catalogue peuvent
distinguer les sources exactes, flottantes, épinglées par intégrité, à intégrité manquante, présentant une inadéquation de nom de package,
et les sources de choix par défaut non valides. Ils avertissent également lorsque
`expectedIntegrity`npm est présent mais qu'il n'y a aucune source npm valide à laquelle il peut s'attacher.
Lorsque `expectedIntegrity` est présent,
les flux d'installation/mise à jour l'appliquent ; lorsqu'il est omis, la résolution du registre est
enregistrée sans épinglage d'intégrité.

Les plugins de channel doivent fournir `openclaw.setupEntry` lorsque l'état, la liste de channel,
ou les analyses SecretRef doivent identifier les comptes configurés sans charger l'intégralité
du runtime. L'entrée de configuration doit exposer les métadonnées du channel ainsi que les adaptateurs de configuration,
d'état et de secrets sécurisés pour l'installation ; gardez les clients réseau, les écouteurs de passerelle et les
runtimes de transport dans le point d'entrée principal de l'extension.

Les champs de point d'entrée du runtime ne remplacent pas les vérifications de limites de package pour les champs
de point d'entrée source. Par exemple, `openclaw.runtimeExtensions` ne peut pas rendre un
chemin `openclaw.extensions` échappé chargeable.

`openclaw.install.allowInvalidConfigRecovery` est volontairement restreint. Il ne
rend pas les configurations cassées arbitraires installables. Actuellement, il permet uniquement aux flux
d'installation de récupérer d'échecs spécifiques de mise à niveau de plugin groupé obsolète, tels qu'un
chemin de plugin groupé manquant ou une entrée `channels.<id>` obsolète pour ce même
plugin groupé. Les erreurs de configuration non liées bloquent toujours l'installation et redirigent les opérateurs
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

Utilisez-le lorsque les flux de configuration, de diagnostic, d'état ou de présence en lecture seule nécessitent une sonde d'authentification oui/non bon marché avant le chargement complet du plugin de canal. L'état d'authentification persistant n'est pas l'état configuré du canal : n'utilisez pas ces métadonnées pour activer automatiquement les plugins, réparer les dépendances d'exécution ou décider si un runtime de canal doit être chargé. L'export cible doit être une petite fonction qui lit uniquement l'état persistant ; ne l'acheminez pas par le canon complet du runtime du canal.

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

Utilisez-le lorsqu'un canal peut répondre à l'état configuré à partir de variables d'environnement ou d'autres petites entrées non liées au runtime. Si la vérification nécessite une résolution complète de la configuration ou le vrai runtime du canal, gardez plutôt cette logique dans le hook `config.hasConfiguredState` du plugin.

## Priorité de découverte (identifiants de plugin en double)

OpenClaw découvre les plugins à partir de plusieurs racines. Pour l'ordre de scan du système de fichiers brut, voir [Ordre de scan des plugins](/fr/gateway/configuration-reference#plugin-scan-order). Si deux découvertes partagent le même `id`, seul le manifeste de **priorité la plus élevée** est conservé ; les doublons de priorité inférieure sont supprimés au lieu d'être chargés à côté.

Priorité, de la plus élevée à la plus basse :

1. **Sélectionné par la configuration** — un chemin explicitement épinglé dans `plugins.entries.<id>`
2. **Bundlé** — plugins livrés avec OpenClaw
3. **Installation globale** — plugins installés dans la racine des plugins globale OpenClaw
4. **Espace de travail** — plugins découverts relativement à l'espace de travail actuel

Implications :

- Une copie forkée ou obsolète d'un plugin inclus se trouvant dans l'espace de travail ne masquera pas la version incluse.
- Pour remplacer réellement un plugin inclus par un plugin local, épinglez-le via `plugins.entries.<id>` afin qu'il gagne par priorité plutôt que de s'appuyer sur la découverte de l'espace de travail.
- Les suppressions de doublons sont consignées pour que le Docteur et les diagnostics de démarrage puissent pointer vers la copie supprimée.
- Les remplacements de doublons sélectionnés par la configuration sont formulés comme des remplacements explicites dans les diagnostics, mais avertissent toujours afin que les forks obsolètes et les masquages accidentels restent visibles.

## Exigences du schéma JSON

- **Chaque plugin doit fournir un schéma JSON**, même s'il n'accepte aucune configuration.
- Un schéma vide est acceptable (par exemple, `{ "type": "object", "additionalProperties": false }`).
- Les schémas sont validés lors de la lecture/écriture de la configuration, et non lors de l'exécution.
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

## Comportement de validation

- Les clés `channels.*` inconnues sont des **erreurs**, sauf si l'identifiant de canal est déclaré par
  un manifeste de plugin.
- `plugins.entries.<id>`, `plugins.allow`, `plugins.deny` et `plugins.slots.*`
  doivent référencer des identifiants de plugins **découvrables**. Les identifiants inconnus sont des **erreurs**.
- Si un plugin est installé mais possède un manifeste ou un schéma cassé ou manquant,
  la validation échoue et Doctor signale l'erreur du plugin.
- Si la configuration d'un plugin existe mais que le plugin est **désactivé**, la configuration est conservée et
  un **avertissement** est affiché dans Doctor + les journaux.

Voir [Référence de configuration](/fr/gateway/configuration) pour le schéma complet `plugins.*`.

## Notes

- Le manifeste est **requis pour les plugins natifs OpenClaw**, y compris pour les chargements depuis le système de fichiers local. Le runtime charge toujours le module du plugin séparément ; le manifeste sert uniquement à la découverte + validation.
- Les manifestes natifs sont analysés avec JSON5, donc les commentaires, les virgules de fin et les clés sans guillemets sont acceptés tant que la valeur finale reste un objet.
- Seuls les champs de manifeste documentés sont lus par le chargeur de manifeste. Évitez les clés personnalisées de niveau supérieur.
- `channels`, `providers`, `cliBackends` et `skills` peuvent tous être omis lorsqu'un plugin n'en a pas besoin.
- `providerCatalogEntry` doit rester léger et ne doit pas importer de code d'exécution volumineux ; utilisez-le pour les métadonnées statiques du catalogue de providers ou des descripteurs de découverte étroits, et non pour l'exécution au moment de la requête. `providerDiscoveryEntry` est l'orthographe héritée et fonctionne toujours pour les plugins existants.
- Les types exclusifs de plugins sont sélectionnés via `plugins.slots.*` : `kind: "memory"` via `plugins.slots.memory`, `kind: "context-engine"` via `plugins.slots.contextEngine` (par défaut `legacy`).
- Déclarez le type exclusif de plugin dans ce manifeste. L'entrée d'exécution `OpenClawPluginDefinition.kind` est obsolète et ne reste qu'en repli de compatibilité pour les plugins plus anciens.
- Les métadonnées de variable d'environnement (`setup.providers[].envVars`, `providerAuthEnvVars` obsolète, et `channelEnvVars`) sont purement déclaratives. Le statut, l'audit, la validation de la livraison cron et d'autres surfaces en lecture seule appliquent toujours la politique de confiance du plugin et la politique d'activation effective avant de traiter une variable d'environnement comme configurée.
- Pour les métadonnées de l'assistant d'exécution nécessitant du code de fournisseur, consultez [Crochets d'exécution du fournisseur](/fr/plugins/architecture-internals#provider-runtime-hooks).
- Si votre plugin dépend de modules natifs, documentez les étapes de construction et toutes les exigences de liste d'autorisation du gestionnaire de paquets (par exemple, pnpm `allow-build-scripts` + `pnpm rebuild <package>`).

## Connexes

<CardGroup cols={3}>
  <Card title="Création de plugins" href="/fr/plugins/building-plugins" icon="rocket">
    Getting started avec les plugins.
  </Card>
  <Card title="Architecture des plugins" href="/fr/plugins/architecture" icon="diagram-project">
    Architecture interne et modèle de capacités.
  </Card>
  <Card title="Présentation du SDK" href="/fr/plugins/sdk-overview" icon="book">
    Référence du SDK de plugin et importations de sous-chemin.
  </Card>
</CardGroup>
