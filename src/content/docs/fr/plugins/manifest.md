---
summary: "Manifeste de plugin + exigences du schéma JSON (validation de configuration stricte)"
read_when:
  - You are building an OpenClaw plugin
  - You need to ship a plugin config schema or debug plugin validation errors
title: "Manifeste de plugin"
---

# Manifeste de plugin (openclaw.plugin.)

Cette page concerne uniquement le **manifeste de plugin natif OpenClaw**.

Pour les dispositions de bundle compatibles, voir [Plugin bundles](/en/plugins/bundles).

Les formats de bundle compatibles utilisent des fichiers de manifeste différents :

- Bundle Codex : `.codex-plugin/plugin.json`
- Bundle Claude : `.claude-plugin/plugin.json` ou la disposition par défaut des composants Claude
  sans manifeste
- Bundle Cursor : `.cursor-plugin/plugin.json`

OpenClaw détecte automatiquement ces dispositions de bundle, mais elles ne sont pas validées
contre le schéma `openclaw.plugin.json` décrit ici.

Pour les bundles compatibles, OpenClaw lit actuellement les métadonnées du bundle ainsi que les racines de compétences déclarées,
les racines de commandes Claude, les valeurs par défaut du bundle `settings.json` de Claude,
les valeurs par défaut LSP du bundle Claude et les packs de hooks pris en charge lorsque la disposition correspond
aux attentes du runtime OpenClaw.

Chaque plugin natif OpenClaw **doit** inclure un fichier `openclaw.plugin.json` dans le
**racine du plugin**. OpenClaw utilise ce manifeste pour valider la configuration
**sans exécuter le code du plugin**. Les manifestes manquants ou invalides sont traités comme
des erreurs de plugin et bloquent la validation de la configuration.

Voir le guide complet du système de plugins : [Plugins](/en/tools/plugin).
Pour le modèle de capacité natif et les conseils actuels de compatibilité externe :
[Capability model](/en/plugins/architecture#public-capability-model).

## À quoi sert ce fichier

`openclaw.plugin.json` correspond aux métadonnées que OpenClaw lit avant de charger votre
code de plugin.

Utilisez-le pour :

- identité du plugin
- validation de la configuration
- métadonnées d'authentification et d'intégration (onboarding) qui doivent être disponibles sans démarrer l'exécution du plugin
  runtime
- alias et métadonnées d'activation automatique qui doivent être résolues avant le chargement de l'exécution du plugin
- métadonnées de propriété abrégée de famille de modèle qui doivent activer automatiquement le
  plugin avant le chargement de l'exécution
- instantanés statiques de propriété des capacités utilisés pour le câblage de compatibilité groupé et
  la couverture des contrats
- métadonnées de configuration spécifiques au canal qui doivent fusionner dans le catalogue et les surfaces de validation
  sans charger l'exécution
- indices de l'interface utilisateur de configuration

Ne l'utilisez pas pour :

- enregistrer le comportement à l'exécution
- déclarer les points d'entrée de code
- métadonnées d'installation npm

Ils appartiennent à votre code de plugin et à `package.json`.

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
  "cliBackends": ["openrouter-cli"],
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

## Référence des champs de niveau supérieur

| Champ                               | Obligatoire | Type                             | Signification                                                                                                                                                                                                                                                                                         |
| ----------------------------------- | ----------- | -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`                                | Oui         | `string`                         | Identifiant canonique du plugin. C'est l'identifiant utilisé dans `plugins.entries.<id>`.                                                                                                                                                                                                             |
| `configSchema`                      | Oui         | `object`                         | Schéma JSON en ligne pour la configuration de ce plugin.                                                                                                                                                                                                                                              |
| `enabledByDefault`                  | Non         | `true`                           | Marque un plugin groupé comme activé par défaut. Omettez-le, ou définissez une valeur autre que `true`, pour laisser le plugin désactivé par défaut.                                                                                                                                                  |
| `legacyPluginIds`                   | Non         | `string[]`                       | Anciens identifiants qui sont normalisés vers cet identifiant canonique de plugin.                                                                                                                                                                                                                    |
| `autoEnableWhenConfiguredProviders` | Non         | `string[]`                       | Identifiants de fournisseurs qui doivent activer automatiquement ce plugin lorsque l'authentification, la configuration ou les références de modèle les mentionnent.                                                                                                                                  |
| `kind`                              | Non         | `"memory"` \| `"context-engine"` | Déclare un type de plugin exclusif utilisé par `plugins.slots.*`.                                                                                                                                                                                                                                     |
| `channels`                          | Non         | `string[]`                       | Identifiants de canaux possédés par ce plugin. Utilisés pour la découverte et la validation de la configuration.                                                                                                                                                                                      |
| `providers`                         | Non         | `string[]`                       | Identifiants de fournisseurs possédés par ce plugin.                                                                                                                                                                                                                                                  |
| `modelSupport`                      | Non         | `object`                         | Métadonnées de famille de modèles abrégées possédées par le manifeste utilisées pour charger automatiquement le plugin avant l'exécution.                                                                                                                                                             |
| `cliBackends`                       | Non         | `string[]`                       | IDs de backend d'inférence CLI détenus par ce plugin. Utilisés pour l'auto-activation au démarrage à partir de références de configuration explicites.                                                                                                                                                |
| `commandAliases`                    | Non         | `object[]`                       | Noms de commandes détenus par ce plugin qui doivent produire une configuration et des diagnostics CLI prenant en compte le plugin avant le chargement de l'exécution.                                                                                                                                 |
| `providerAuthEnvVars`               | Non         | `Record<string, string[]>`       | Métadonnées d'environnement d'authentification de fournisseur légères que OpenClaw peut inspecter sans charger le code du plugin.                                                                                                                                                                     |
| `providerAuthAliases`               | Non         | `Record<string, string>`         | Identifiants de fournisseurs qui doivent réutiliser l'identifiant d'un autre fournisseur pour la recherche d'authentification, par exemple un fournisseur de codage qui partage la clé API et les profils d'authentification du fournisseur de base.                                                  |
| `channelEnvVars`                    | Non         | `Record<string, string[]>`       | Métadonnées d'environnement de canal légères que OpenClaw peut inspecter sans charger le code du plugin. Utilisez ceci pour la configuration de canal pilotée par l'environnement ou les surfaces d'authentification que les assistants génériques de démarrage/configuration doivent voir.           |
| `providerAuthChoices`               | Non         | `object[]`                       | Métadonnées légères de choix d'authentification pour les sélecteurs d'intégration, la résolution de fournisseur préféré et le câblage simple des indicateurs CLI.                                                                                                                                     |
| `contracts`                         | Non         | `object`                         | Instantané groupé statique des capacités pour la reconnaissance vocale, la transcription en temps réel, la voix en temps réel, la compréhension des médias, la génération d'images, la génération de musique, la génération de vidéo, la récupération web, la recherche web et la propriété d'outils. |
| `channelConfigs`                    | Non         | `Record<string, object>`         | Métadonnées de configuration de canal détenues par le manifeste, fusionnées dans les surfaces de découverte et de validation avant le chargement de l'exécution.                                                                                                                                      |
| `skills`                            | Non         | `string[]`                       | Répertoires de compétences à charger, relatifs à la racine du plugin.                                                                                                                                                                                                                                 |
| `name`                              | Non         | `string`                         | Nom du plugin lisible par l'homme.                                                                                                                                                                                                                                                                    |
| `description`                       | Non         | `string`                         | Résumé court affiché dans les surfaces du plugin.                                                                                                                                                                                                                                                     |
| `version`                           | Non         | `string`                         | Version du plugin à titre informatif.                                                                                                                                                                                                                                                                 |
| `uiHints`                           | Non         | `Record<string, object>`         | Libellés d'interface utilisateur, espaces réservés et indices de sensibilité pour les champs de configuration.                                                                                                                                                                                        |

## Référence de providerAuthChoices

Chaque entrée `providerAuthChoices` décrit un choix d'intégration ou d'authentification.
OpenClaw lit cela avant le chargement du runtime du provider.

| Champ                 | Requis | Type                                            | Signification                                                                                                         |
| --------------------- | ------ | ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `provider`            | Oui    | `string`                                        | ID du provider auquel ce choix appartient.                                                                            |
| `method`              | Oui    | `string`                                        | ID de la méthode d'authentification vers laquelle répartir.                                                           |
| `choiceId`            | Oui    | `string`                                        | ID stable du choix d'authentification utilisé par les flux d'intégration et de CLI.                                   |
| `choiceLabel`         | Non    | `string`                                        | Libellé面向 utilisateur. S'il est omis, OpenClaw revient à `choiceId`.                                                |
| `choiceHint`          | Non    | `string`                                        | Texte d'aide court pour le sélecteur.                                                                                 |
| `assistantPriority`   | Non    | `number`                                        | Les valeurs les plus basses sont triées plus tôt dans les sélecteurs interactifs pilotés par l'assistant.             |
| `assistantVisibility` | Non    | `"visible"` \| `"manual-only"`                  | Masquer le choix des sélecteurs d'assistant tout en autorisant toujours la sélection manuelle de la CLI.              |
| `deprecatedChoiceIds` | Non    | `string[]`                                      | ID de choix hérités qui doivent rediriger les utilisateurs vers ce choix de remplacement.                             |
| `groupId`             | Non    | `string`                                        | ID de groupe facultatif pour regrouper les choix connexes.                                                            |
| `groupLabel`          | Non    | `string`                                        | Libellé面向 utilisateur pour ce groupe.                                                                               |
| `groupHint`           | Non    | `string`                                        | Texte d'aide court pour le groupe.                                                                                    |
| `optionKey`           | Non    | `string`                                        | Clé d'option interne pour les flux d'authentification simples à un seul indicateur.                                   |
| `cliFlag`             | Non    | `string`                                        | Nom de l'indicateur CLI, tel que `--openrouter-api-key`.                                                              |
| `cliOption`           | Non    | `string`                                        | Forme complète de l'option CLI, telle que `--openrouter-api-key <key>`.                                               |
| `cliDescription`      | Non    | `string`                                        | Description utilisée dans l'aide de la CLI.                                                                           |
| `onboardingScopes`    | Non    | `Array<"text-inference" \| "image-generation">` | Surfaces d'onboarding auxquels ce choix doit apparaître. Si omis, il prend par défaut la valeur `["text-inference"]`. |

## Référence de commandAliases

Utilisez `commandAliases` lorsqu'un plugin possède un nom de commande d'exécution que les utilisateurs
pourraient mettre par erreur dans `plugins.allow` ou essayer d'exécuter comme une commande racine CLI. OpenClaw
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

| Champ        | Obligatoire | Type              | Signification                                                                      |
| ------------ | ----------- | ----------------- | ---------------------------------------------------------------------------------- |
| `name`       | Oui         | `string`          | Nom de la commande qui appartient à ce plugin.                                     |
| `kind`       | Non         | `"runtime-slash"` | Marque l'alias comme une commande slash de chat plutôt qu'une commande racine CLI. |
| `cliCommand` | Non         | `string`          | Commande racine CLI connexe à suggérer pour les opérations CLI, si elle existe.    |

## Référence de uiHints

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

| Champ         | Type       | Signification                                                      |
| ------------- | ---------- | ------------------------------------------------------------------ |
| `label`       | `string`   | Libellé de champ destiné à l'utilisateur.                          |
| `help`        | `string`   | Texte d'aide court.                                                |
| `tags`        | `string[]` | Balises d'interface utilisateur optionnelles.                      |
| `advanced`    | `boolean`  | Marque le champ comme avancé.                                      |
| `sensitive`   | `boolean`  | Marque le champ comme secret ou sensible.                          |
| `placeholder` | `string`   | Texte de l'espace réservé pour les champs de saisie du formulaire. |

## Référence de contracts

Utilisez `contracts` uniquement pour les métadonnées statiques de propriété des capacités que OpenClaw peut
lire sans importer l'exécution du plugin.

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

Chaque liste est optionnelle :

| Champ                            | Type       | Signification                                                                               |
| -------------------------------- | ---------- | ------------------------------------------------------------------------------------------- |
| `speechProviders`                | `string[]` | Identifiants de fournisseur de synthèse vocale dont ce plugin est propriétaire.             |
| `realtimeTranscriptionProviders` | `string[]` | Identifiants de fournisseur de transcription en temps réel dont ce plugin est propriétaire. |
| `realtimeVoiceProviders`         | `string[]` | Identifiants de fournisseur de voix en temps réel dont ce plugin est propriétaire.          |
| `mediaUnderstandingProviders`    | `string[]` | Identifiants des fournisseurs de compréhension de média possédés par ce plugin.             |
| `imageGenerationProviders`       | `string[]` | Identifiants des fournisseurs de génération d'images possédés par ce plugin.                |
| `videoGenerationProviders`       | `string[]` | Identifiants des fournisseurs de génération de vidéo possédés par ce plugin.                |
| `webFetchProviders`              | `string[]` | Identifiants des fournisseurs de récupération Web possédés par ce plugin.                   |
| `webSearchProviders`             | `string[]` | Identifiants des fournisseurs de recherche Web possédés par ce plugin.                      |
| `tools`                          | `string[]` | Noms des outils d'agent possédés par ce plugin pour les vérifications de contrat groupé.    |

## référence channelConfigs

Utilisez `channelConfigs` lorsqu'un plugin de canal a besoin de métadonnées de configuration légères avant
le chargement du runtime.

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

| Champ         | Type                     | Signification                                                                                                                        |
| ------------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| `schema`      | `object`                 | Schéma JSON pour `channels.<id>`. Requis pour chaque entrée de configuration de canal déclarée.                                      |
| `uiHints`     | `Record<string, object>` | Labels d'interface utilisateur, espaces réservés et indices de sensibilité facultatifs pour cette section de configuration de canal. |
| `label`       | `string`                 | Label de canal intégré dans les surfaces de sélection et d'inspection lorsque les métadonnées d'exécution ne sont pas prêtes.        |
| `description` | `string`                 | Courte description du canal pour les surfaces d'inspection et de catalogue.                                                          |
| `preferOver`  | `string[]`               | Identifiants de plugin hérités ou de priorité inférieure que ce canal doit dépasser dans les surfaces de sélection.                  |

## référence modelSupport

Utilisez `modelSupport` lorsque OpenClaw doit déduire votre plugin de fournisseur à partir d'identifiants de modèle abrégés comme `gpt-5.4` ou `claude-sonnet-4.6` avant le chargement du runtime du plugin.

```json
{
  "modelSupport": {
    "modelPrefixes": ["gpt-", "o1", "o3", "o4"],
    "modelPatterns": ["^computer-use-preview"]
  }
}
```

OpenClaw applique cette priorité :

- les références `provider/model` explicites utilisent les métadonnées de manifeste `providers` propriétaire
- `modelPatterns` battent `modelPrefixes`
- si un plugin non groupé et un plugin groupé correspondent tous les deux, le plugin non groupé gagne
- l'ambiguïté restante est ignorée jusqu'à ce que l'utilisateur ou la configuration spécifie un provider

Champs :

| Champ           | Type       | Ce que cela signifie                                                                           |
| --------------- | ---------- | ---------------------------------------------------------------------------------------------- |
| `modelPrefixes` | `string[]` | Préfixes correspondants avec `startsWith` par rapport aux IDs de model abrégés.                |
| `modelPatterns` | `string[]` | Sources Regex correspondantes aux IDs de model abrégés après suppression du suffixe de profil. |

Les clés de capacité de niveau supérieur héritées sont obsolètes. Utilisez `openclaw doctor --fix` pour
déplacer `speechProviders`, `realtimeTranscriptionProviders`,
`realtimeVoiceProviders`, `mediaUnderstandingProviders`,
`imageGenerationProviders`, `videoGenerationProviders`,
`webFetchProviders` et `webSearchProviders` sous `contracts` ; le
chargement normal du manifeste ne traite plus ces champs de niveau supérieur comme une
propriété de capacité.

## Manifeste par rapport à package.

Les deux fichiers ont des rôles différents :

| Fichier                | Utilisé pour                                                                                                                                                                            |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `openclaw.plugin.json` | Discovery, validation de la configuration, métadonnées de choix d'authentification et indices d'interface utilisateur qui doivent exister avant l'exécution du code du plugin           |
| `package.json`         | métadonnées npm, installation des dépendances et le bloc `openclaw` utilisé pour les points d'entrée, les restrictions d'installation, la configuration ou les métadonnées du catalogue |

Si vous n'êtes pas sûr de l'emplacement d'une métadonnée, utilisez cette règle :

- si OpenClaw doit le connaître avant le chargement du code du plugin, placez-le dans `openclaw.plugin.json`
- s'il concerne le packaging, les fichiers d'entrée ou le comportement de l'installation npm, placez-le dans `package.json`

### champs package. affectant la discovery

Certaines métadonnées de plugin pré-exécution se trouvent intentionnellement dans `package.json` sous le
bloc `openclaw` au lieu de `openclaw.plugin.json`.

Exemples importants :

| Champ                                                             | Ce que cela signifie                                                                                                                                                     |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `openclaw.extensions`                                             | Déclare les points d'entrée natifs du plugin.                                                                                                                            |
| `openclaw.setupEntry`                                             | Point d'entrée léger, uniquement pour la configuration, utilisé lors de l'onboarding et du démarrage différé du channel.                                                 |
| `openclaw.channel`                                                | Métadonnées de catalogue de channel peu coûteuses telles que les libellés, les chemins de documentation, les alias et le texte de sélection.                             |
| `openclaw.channel.configuredState`                                | Métadonnées de vérificateur d'état configuré léger qui peut répondre « une configuration env-only existe-t-elle déjà ? » sans charger le runtime channel complet.        |
| `openclaw.channel.persistedAuthState`                             | Métadonnées de vérificateur d'authentification persistante légère qui peuvent répondre « quelque chose est-il déjà connecté ? » sans charger le runtime channel complet. |
| `openclaw.install.npmSpec` / `openclaw.install.localPath`         | Conseils d'installation/de mise à jour pour les plugins groupés et publiés en externe.                                                                                   |
| `openclaw.install.defaultChoice`                                  | Chemin d'installation préféré lorsque plusieurs sources d'installation sont disponibles.                                                                                 |
| `openclaw.install.minHostVersion`                                 | Version minimale prise en charge de l'hôte OpenClaw, utilisant un plancher semver comme `>=2026.3.22`.                                                                   |
| `openclaw.install.allowInvalidConfigRecovery`                     | Permet un chemin de récupération étroit de réinstallation de plugin groupé lorsque la configuration est invalide.                                                        |
| `openclaw.startup.deferConfiguredChannelFullLoadUntilAfterListen` | Permet aux surfaces channel uniquement de configuration de se charger avant le plugin channel complet lors du démarrage.                                                 |

`openclaw.install.minHostVersion` est appliqué lors de l'installation et du chargement du registre du manifeste. Les valeurs invalides sont rejetées ; les plus récentes mais valides ignorent le plugin sur les hôtes plus anciens.

`openclaw.install.allowInvalidConfigRecovery` est intentionnellement étroit. Il ne rend pas les configurations cassées arbitraires installables. Aujourd'hui, il permet uniquement aux flux d'installation de récupérer de certains échecs de mise à niveau de plugin groupé obsolète, tels qu'un chemin de plugin groupé manquant ou une entrée `channels.<id>` obsolète pour ce même plugin groupé. Les erreurs de configuration non liées bloquent toujours l'installation et redirigent les opérateurs vers `openclaw doctor --fix`.

`openclaw.channel.persistedAuthState` sont des métadonnées de package pour un minuscule module de vérificateur :

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

Utilisez-le lorsque les flux de configuration, de diagnostic ou d'état configuré ont besoin d'une sonde d'authentification oui/non bon marché avant le chargement du plugin channel complet. L'export cible doit être une petite fonction qui lit uniquement l'état persistant ; ne l'acheminez pas via le barrel du runtime channel complet.

`openclaw.channel.configuredState` suit la même forme pour les vérifications configurées env-only bon marché :

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

Utilisez-le lorsqu'un channel peut répondre à l'état configuré à partir de l'environnement ou d'autres petites entrées hors runtime. Si la vérification nécessite une résolution complète de la configuration ou le runtime channel réel, gardez cette logique dans le hook `config.hasConfiguredState` du plugin à la place.

## Exigences du schéma JSON

- **Chaque plugin doit fournir un JSON Schema**, même s'il n'accepte aucune configuration.
- Un schéma vide est acceptable (par exemple, `{ "type": "object", "additionalProperties": false }`).
- Les schémas sont validés au moment de la lecture/écriture de la configuration, et non à l'exécution.

## Comportement de validation

- Les clés `channels.*` inconnues sont des **erreurs**, sauf si l'identifiant du channel est déclaré par
  un manifeste de plugin.
- `plugins.entries.<id>`, `plugins.allow`, `plugins.deny` et `plugins.slots.*`
  doivent référencer des identifiants de plugin **découvrables**. Les identifiants inconnus sont des **erreurs**.
- Si un plugin est installé mais possède un manifeste ou un schéma cassé ou manquant,
  la validation échoue et Doctor signale l'erreur du plugin.
- Si la configuration du plugin existe mais que le plugin est **désactivé**, la configuration est conservée et
  un **avertissement** est affiché dans Doctor + les journaux.

Voir [Référence de la configuration](/en/gateway/configuration) pour le schéma complet `plugins.*`.

## Notes

- Le manifeste est **requis pour les plugins natifs OpenClaw**, y compris pour les chargements depuis le système de fichiers local.
- L'exécution charge toujours le module du plugin séparément ; le manifeste sert uniquement
  à la découverte + validation.
- Les manifestes natifs sont analysés avec JSON5, donc les commentaires, les virgules de fin et
  les clés non citées sont acceptés tant que la valeur finale est toujours un objet.
- Seuls les champs de manifeste documentés sont lus par le chargeur de manifeste. Évitez d'ajouter
  des clés personnalisées de niveau supérieur ici.
- `providerAuthEnvVars` est le chemin de métadonnées économique pour les sondes d'authentification, la validation
  des marqueurs d'environnement et les surfaces similaires d'authentification de provider qui ne devraient pas démarrer l'exécution
  du plugin juste pour inspecter les noms d'environnement.
- `providerAuthAliases` permet aux variantes de provider de réutiliser les variables d'environnement d'authentification,
  les profils d'authentification, l'authentification soutenue par la configuration et le choix d'onboarding de clé API
  d'un autre provider sans coder en dur cette relation dans le cœur.
- `channelEnvVars` est le chemin de métadonnées économique pour le repli vers l'environnement de shell,
  les invites de configuration et les surfaces similaires de channel qui ne devraient pas démarrer l'exécution
  du plugin juste pour inspecter les noms d'environnement.
- `providerAuthChoices` est le chemin de métadonnées peu coûteux pour les sélecteurs de choix d'authentification,
  la résolution `--auth-choice`, le mappage du fournisseur préféré et l'enregistrement simple de l'indicateur CLI d'onboarding avant le chargement du runtime du fournisseur. Pour les métadonnées de l'assistant d'exécution qui nécessitent du code de fournisseur, consultez
  [Provider runtime hooks](/en/plugins/architecture#provider-runtime-hooks).
- Les types de plugins exclusifs sont sélectionnés via `plugins.slots.*`.
  - `kind: "memory"` est sélectionné par `plugins.slots.memory`.
  - `kind: "context-engine"` est sélectionné par `plugins.slots.contextEngine`
    (par défaut : `legacy` intégré).
- `channels`, `providers`, `cliBackends` et `skills` peuvent être omis lorsqu'un
  plugin n'en a pas besoin.
- Si votre plugin dépend de modules natifs, documentez les étapes de génération et toutes les exigences de liste d'autorisation du gestionnaire de packages (par exemple, pnpm `allow-build-scripts`
  - `pnpm rebuild <package>`).

## Connexes

- [Building Plugins](/en/plugins/building-plugins) — démarrage avec les plugins
- [Plugin Architecture](/en/plugins/architecture) — architecture interne
- [SDK Overview](/en/plugins/sdk-overview) — référence du SDK de plugin
