---
summary: "Manifest du plugin + exigences du schéma JSON (validation stricte de la configuration)"
read_when:
  - You are building an OpenClaw plugin
  - You need to ship a plugin config schema or debug plugin validation errors
title: "Manifest du plugin"
---

# Manifeste de plugin (openclaw.plugin.)

Cette page concerne uniquement le **manifeste de plugin natif OpenClaw**.

Pour les mises en page de bundle compatibles, consultez [Plugin bundles](/en/plugins/bundles).

Les formats de bundle compatibles utilisent des fichiers de manifeste différents :

- Bundle Codex : `.codex-plugin/plugin.json`
- Bundle Claude : `.claude-plugin/plugin.json` ou la structure de composant Claude par défaut
  sans manifeste
- Bundle Cursor : `.cursor-plugin/plugin.json`

OpenClaw détecte automatiquement ces structures de bundle, mais elles ne sont pas validées
contre le schéma `openclaw.plugin.json` décrit ici.

Pour les bundles compatibles, OpenClaw lit actuellement les métadonnées du bundle ainsi que les racines de compétences (skills) déclarées,
les racines de commandes Claude, les valeurs par défaut du bundle `settings.json` de Claude,
les valeurs par défaut LSP du bundle Claude, et les packs de hooks pris en charge lorsque la structure correspond
aux attentes d'exécution de OpenClaw.

Chaque plugin natif OpenClaw **doit** inclure un fichier `openclaw.plugin.json` dans la
**racine du plugin**. OpenClaw utilise ce manifeste pour valider la configuration
**sans exécuter le code du plugin**. Les manifestes manquants ou invalides sont traités comme
des erreurs de plugin et bloquent la validation de la configuration.

Voir le guide complet du système de plugins : [Plugins](/en/tools/plugin).
Pour le modèle de capacité natif et les directives actuelles de compatibilité externe :
[Capability model](/en/plugins/architecture#public-capability-model).

## À quoi sert ce fichier

`openclaw.plugin.json` sont les métadonnées que OpenClaw lit avant de charger votre
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

Celles-ci appartiennent à votre code de plugin et à `package.json`.

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

| Champ                               | Obligatoire | Type                             | Signification                                                                                                                                                                                                                                                                                       |
| ----------------------------------- | ----------- | -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`                                | Oui         | `string`                         | Identifiant canonique du plugin. Il s'agit de l'identifiant utilisé dans `plugins.entries.<id>`.                                                                                                                                                                                                    |
| `configSchema`                      | Oui         | `object`                         | Schéma JSON en ligne pour la configuration de ce plugin.                                                                                                                                                                                                                                            |
| `enabledByDefault`                  | Non         | `true`                           | Marque un plugin groupé comme activé par défaut. Omettez-le ou définissez une valeur autre que `true` pour laisser le plugin désactivé par défaut.                                                                                                                                                  |
| `legacyPluginIds`                   | Non         | `string[]`                       | Anciens identifiants qui sont normalisés vers cet identifiant canonique de plugin.                                                                                                                                                                                                                  |
| `autoEnableWhenConfiguredProviders` | Non         | `string[]`                       | Identifiants de fournisseurs qui doivent activer automatiquement ce plugin lorsque l'authentification, la configuration ou les références de modèle les mentionnent.                                                                                                                                |
| `kind`                              | Non         | `"memory"` \| `"context-engine"` | Déclare un type de plugin exclusif utilisé par `plugins.slots.*`.                                                                                                                                                                                                                                   |
| `channels`                          | Non         | `string[]`                       | Identifiants de canaux possédés par ce plugin. Utilisés pour la découverte et la validation de la configuration.                                                                                                                                                                                    |
| `providers`                         | Non         | `string[]`                       | Identifiants de fournisseurs possédés par ce plugin.                                                                                                                                                                                                                                                |
| `modelSupport`                      | Non         | `object`                         | Métadonnées de famille de modèles abrégées possédées par le manifeste utilisées pour charger automatiquement le plugin avant l'exécution.                                                                                                                                                           |
| `cliBackends`                       | Non         | `string[]`                       | IDs de backend d'inférence CLI détenus par ce plugin. Utilisés pour l'auto-activation au démarrage à partir de références de configuration explicites.                                                                                                                                              |
| `providerAuthEnvVars`               | Non         | `Record<string, string[]>`       | Métadonnées d'environnement d'authentification de fournisseur peu coûteuses que OpenClaw peut inspecter sans charger le code du plugin.                                                                                                                                                             |
| `channelEnvVars`                    | Non         | `Record<string, string[]>`       | Métadonnées d'environnement de canal peu coûteuses que OpenClaw peut inspecter sans charger le code du plugin. Utilisez ceci pour la configuration de canal pilotée par l'environnement ou les surfaces d'authentification que les assistants génériques de démarrage/configuration devraient voir. |
| `providerAuthChoices`               | Non         | `object[]`                       | Métadonnées de choix d'authentification peu coûteuses pour les sélecteurs d'intégration, la résolution de fournisseur préféré et le câblage simple des indicateurs CLI.                                                                                                                             |
| `contracts`                         | Non         | `object`                         | Instantané de capacité groupé statique pour la parole, la transcription en temps réel, la voix en temps réel, la compréhension des médias, la génération d'images, la génération de musique, la génération de vidéo, la récupération Web, la recherche Web et la propriété d'outil.                 |
| `channelConfigs`                    | Non         | `Record<string, object>`         | Métadonnées de configuration de canal détenues par le manifeste fusionnées dans les surfaces de découverte et de validation avant le chargement de l'exécution.                                                                                                                                     |
| `skills`                            | Non         | `string[]`                       | Répertoires de compétences à charger, relatifs à la racine du plugin.                                                                                                                                                                                                                               |
| `name`                              | Non         | `string`                         | Nom de plugin lisible par l'homme.                                                                                                                                                                                                                                                                  |
| `description`                       | Non         | `string`                         | Résumé court affiché dans les surfaces du plugin.                                                                                                                                                                                                                                                   |
| `version`                           | Non         | `string`                         | Version du plugin à titre informatif.                                                                                                                                                                                                                                                               |
| `uiHints`                           | Non         | `Record<string, object>`         | Libellés d'interface utilisateur, espaces réservés et indices de sensibilité pour les champs de configuration.                                                                                                                                                                                      |

## Référence providerAuthChoices

Chaque entrée `providerAuthChoices` décrit un choix d'intégration ou d'authentification.
OpenClaw lit ceci avant le chargement du runtime du fournisseur.

| Champ                 | Obligatoire | Type                                            | Signification                                                                                                     |
| --------------------- | ----------- | ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `provider`            | Oui         | `string`                                        | ID du fournisseur auquel ce choix appartient.                                                                     |
| `method`              | Oui         | `string`                                        | ID de la méthode d'authentification vers laquelle dispatcher.                                                     |
| `choiceId`            | Oui         | `string`                                        | ID stable du choix d'authentification utilisé par les flux d'intégration et CLI.                                  |
| `choiceLabel`         | Non         | `string`                                        | Libellé orienté utilisateur. Si omis, OpenClaw revient à `choiceId`.                                              |
| `choiceHint`          | Non         | `string`                                        | Court texte d'aide pour le sélecteur.                                                                             |
| `assistantPriority`   | Non         | `number`                                        | Les valeurs inférieures sont triées plus tôt dans les sélecteurs interactifs pilotés par l'assistant.             |
| `assistantVisibility` | Non         | `"visible"` \| `"manual-only"`                  | Masquer le choix des sélecteurs d'assistant tout en autorisant toujours la sélection manuelle via CLI.            |
| `deprecatedChoiceIds` | Non         | `string[]`                                      | IDs de choix hérités qui doivent rediriger les utilisateurs vers ce choix de remplacement.                        |
| `groupId`             | Non         | `string`                                        | ID de groupe optionnel pour regrouper les choix connexes.                                                         |
| `groupLabel`          | Non         | `string`                                        | Libellé orienté utilisateur pour ce groupe.                                                                       |
| `groupHint`           | Non         | `string`                                        | Court texte d'aide pour le groupe.                                                                                |
| `optionKey`           | Non         | `string`                                        | Clé d'option interne pour les flux d'authentification simples à un indicateur.                                    |
| `cliFlag`             | Non         | `string`                                        | Nom de l'indicateur CLI, tel que `--openrouter-api-key`.                                                          |
| `cliOption`           | Non         | `string`                                        | Forme complète de l'option CLI, telle que `--openrouter-api-key <key>`.                                           |
| `cliDescription`      | Non         | `string`                                        | Description utilisée dans l'aide CLI.                                                                             |
| `onboardingScopes`    | Non         | `Array<"text-inference" \| "image-generation">` | Surfaces d'intégration dans lesquelles ce choix doit apparaître. Si omis, il est par défaut `["text-inference"]`. |

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

| Champ         | Type       | Ce que cela signifie                                           |
| ------------- | ---------- | -------------------------------------------------------------- |
| `label`       | `string`   | Libellé du champ visible par l'utilisateur.                    |
| `help`        | `string`   | Texte d'aide court.                                            |
| `tags`        | `string[]` | Balises d'interface utilisateur facultatives.                  |
| `advanced`    | `boolean`  | Marque le champ comme avancé.                                  |
| `sensitive`   | `boolean`  | Marque le champ comme secret ou sensible.                      |
| `placeholder` | `string`   | Texte de remplacement pour les champs de saisie du formulaire. |

## référence des contrats

Utilisez `contracts` uniquement pour les métadonnées statiques de propriété des capacités que OpenClaw peut
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

| Champ                            | Type       | Ce que cela signifie                                                                      |
| -------------------------------- | ---------- | ----------------------------------------------------------------------------------------- |
| `speechProviders`                | `string[]` | Identifiants des fournisseurs de synthèse vocale appartenant à ce plugin.                 |
| `realtimeTranscriptionProviders` | `string[]` | Identifiants des fournisseurs de transcription en temps réel appartenant à ce plugin.     |
| `realtimeVoiceProviders`         | `string[]` | Identifiants des fournisseurs de voix en temps réel appartenant à ce plugin.              |
| `mediaUnderstandingProviders`    | `string[]` | Identifiants des fournisseurs de compréhension multimédia appartenant à ce plugin.        |
| `imageGenerationProviders`       | `string[]` | Identifiants des fournisseurs de génération d'images appartenant à ce plugin.             |
| `videoGenerationProviders`       | `string[]` | Identifiants des fournisseurs de génération de vidéos appartenant à ce plugin.            |
| `webFetchProviders`              | `string[]` | Identifiants des fournisseurs de récupération Web appartenant à ce plugin.                |
| `webSearchProviders`             | `string[]` | Identifiants des fournisseurs de recherche Web appartenant à ce plugin.                   |
| `tools`                          | `string[]` | Noms des outils d'agent que ce plugin possède pour les vérifications de contrat groupées. |

## référence channelConfigs

Utilisez `channelConfigs` lorsqu'un plugin de canal a besoin de métadonnées de configuration peu coûteuses avant
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

| Champ         | Type                     | Ce que cela signifie                                                                                                                   |
| ------------- | ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| `schema`      | `object`                 | Schéma JSON pour `channels.<id>`. Requis pour chaque entrée de configuration de canal déclarée.                                        |
| `uiHints`     | `Record<string, object>` | Libellés d'interface utilisateur, espaces réservés et indices de sensibilité facultatifs pour cette section de configuration de canal. |
| `label`       | `string`                 | Libellé du canal fusionné dans les surfaces de sélection et d'inspection lorsque les métadonnées d'exécution ne sont pas prêtes.       |
| `description` | `string`                 | Courte description du canal pour les surfaces d'inspection et de catalogue.                                                            |
| `preferOver`  | `string[]`               | Identifiants de plug-in hérités ou de priorité inférieure que ce canal doit devancer dans les surfaces de sélection.                   |

## Référence modelSupport

Utilisez `modelSupport` lorsque OpenClaw doit déduire votre plug-in de fournisseur à partir d'identifiants de modèle abrégés comme `gpt-5.4` ou `claude-sonnet-4.6` avant le chargement de l'exécution du plug-in.

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
- si un plug-in non groupé et un plug-in groupé correspondent tous les deux, le plug-in non groupé l'emporte
- l'ambiguïté restante est ignorée jusqu'à ce que l'utilisateur ou la configuration spécifie un fournisseur

Champs :

| Champ           | Type       | Signification                                                                                            |
| --------------- | ---------- | -------------------------------------------------------------------------------------------------------- |
| `modelPrefixes` | `string[]` | Préfixes correspondant avec `startsWith` aux identifiants de modèle abrégés.                             |
| `modelPatterns` | `string[]` | Sources regex correspondantes aux identifiants de modèle abrégés après suppression du suffixe de profil. |

Les clés de capacité de niveau supérieur héritées sont obsolètes. Utilisez `openclaw doctor --fix` pour déplacer `speechProviders`, `realtimeTranscriptionProviders`, `realtimeVoiceProviders`, `mediaUnderstandingProviders`, `imageGenerationProviders`, `videoGenerationProviders`, `webFetchProviders` et `webSearchProviders` sous `contracts` ; le chargement normal du manifeste ne traite plus ces champs de niveau supérieur comme une propriété de capacité.

## Manifeste versus package.

Les deux fichiers ont des fonctions différentes :

| Fichier                | À utiliser pour                                                                                                                                                                          |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `openclaw.plugin.json` | Discovery, la validation de la configuration, les métadonnées de choix d'authentification et les indices d'interface utilisateur qui doivent exister avant l'exécution du code du plugin |
| `package.json`         | Métadonnées npm, installation des dépendances et le bloc `openclaw` utilisé pour les points d'entrée, la limitation d'installation, la configuration ou les métadonnées du catalogue     |

Si vous n'êtes pas sûr de l'emplacement d'une métadonnée, utilisez cette règle :

- si OpenClaw doit le connaître avant de charger le code du plugin, placez-le dans `openclaw.plugin.json`
- s'il s'agit du packaging, des fichiers d'entrée ou du comportement d'installation npm, placez-le dans `package.json`

### Champs package. affectant la découverte

Certaines métadonnées de plugin pré-exécution résident intentionnellement dans `package.json` sous le bloc
`openclaw` au lieu de `openclaw.plugin.json`.

Exemples importants :

| Champ                                                             | Signification                                                                                                                                                                           |
| ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `openclaw.extensions`                                             | Déclare les points d'entrée du plugin natif.                                                                                                                                            |
| `openclaw.setupEntry`                                             | Point d'entrée léger de configuration uniquement utilisé lors de l'intégration et du démarrage différé du canal.                                                                        |
| `openclaw.channel`                                                | Métadonnées légères du catalogue de canaux telles que les étiquettes, les chemins de documentation, les alias et le texte de sélection.                                                 |
| `openclaw.channel.configuredState`                                | Métadonnées du vérificateur d'état configuré léger pouvant répondre à « la configuration uniquement de l'environnement existe-t-elle déjà ? » sans charger le runtime complet du canal. |
| `openclaw.channel.persistedAuthState`                             | Métadonnées du vérificateur d'authentification persistante légère pouvant répondre à « quelque chose est-il déjà connecté ? » sans charger le runtime complet du canal.                 |
| `openclaw.install.npmSpec` / `openclaw.install.localPath`         | Indices d'installation/de mise à jour pour les plugins groupés et publiés en externe.                                                                                                   |
| `openclaw.install.defaultChoice`                                  | Chemin d'installation préféré lorsque plusieurs sources d'installation sont disponibles.                                                                                                |
| `openclaw.install.minHostVersion`                                 | Version minimale prise en charge de l'hôte OpenClaw, utilisant un plancher semver comme `>=2026.3.22`.                                                                                  |
| `openclaw.install.allowInvalidConfigRecovery`                     | Permet un chemin de récupération étroit de réinstallation de plugin groupé lorsque la configuration n'est pas valide.                                                                   |
| `openclaw.startup.deferConfiguredChannelFullLoadUntilAfterListen` | Permet le chargement des surfaces de canal de configuration uniquement avant le plugin de canal complet lors du démarrage.                                                              |

`openclaw.install.minHostVersion` est appliqué lors de l'installation et du chargement du registre de manifestes. Les valeurs invalides sont rejetées ; les valeurs plus récentes mais valides entraînent l'ignorance du plugin sur les hôtes plus anciens.

`openclaw.install.allowInvalidConfigRecovery` est intentionnellement restreint. Il ne permet pas d'installer des configurations arbitrairement cassées. Aujourd'hui, il permet uniquement aux flux d'installation de récupérer de échecs spécifiques de mise à niveau de plugins groupés obsolètes, tels qu'un chemin de plugin groupé manquant ou une entrée `channels.<id>` obsolète pour ce même plugin groupé. Les erreurs de configuration non liées bloquent toujours l'installation et dirigent les opérateurs vers `openclaw doctor --fix`.

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

Utilisez-le lorsque les flux de configuration, de vérification (doctor) ou d'état configuré nécessitent une sonde d'authentification oui/non bon marché avant le chargement complet du plugin de channel. L'export cible doit être une petite fonction qui lit uniquement l'état persistant ; ne l'acheminez pas via le contexte d'exécution complet du channel.

`openclaw.channel.configuredState` suit la même forme pour les vérifications configurées uniquement par environnement bon marché :

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

Utilisez-le lorsqu'un channel peut répondre à l'état configuré à partir de l'environnement ou d'autres petites entrées hors exécution. Si la vérification nécessite une résolution complète de la configuration ou le véritable environnement d'exécution du channel, gardez plutôt cette logique dans le hook `config.hasConfiguredState` du plugin.

## Exigences du schéma JSON

- **Chaque plugin doit fournir un schéma JSON**, même s'il n'accepte aucune configuration.
- Un schéma vide est acceptable (par exemple, `{ "type": "object", "additionalProperties": false }`).
- Les schémas sont validés au moment de la lecture/écriture de la configuration, et non lors de l'exécution.

## Comportement de validation

- Les clés `channels.*` inconnues sont des **erreurs**, sauf si l'id du channel est déclaré par un manifeste de plugin.
- `plugins.entries.<id>`, `plugins.allow`, `plugins.deny` et `plugins.slots.*` doivent référencer des ids de plugin **découvrables**. Les ids inconnus sont des **erreurs**.
- Si un plugin est installé mais possède un manifeste ou un schéma cassé ou manquant, la validation échoue et Doctor signale l'erreur du plugin.
- Si la configuration du plugin existe mais que le plugin est **désactivé**, la configuration est conservée et un **avertissement** est affiché dans Doctor + les journaux.

Voir [Référence de configuration](/en/gateway/configuration) pour le schéma complet `plugins.*`.

## Notes

- Le manifeste est **requis pour les plugins natifs OpenClaw**, y compris pour les chargements depuis le système de fichiers local.
- Le runtime charge toujours le module du plugin séparément ; le manifeste sert uniquement à la découverte et à la validation.
- Les manifestes natifs sont analysés avec JSON5, donc les commentaires, les virgules de fin et les clés non entre guillemets sont acceptés tant que la valeur finale est toujours un objet.
- Seuls les champs de manifeste documentés sont lus par le chargeur de manifeste. Évitez d'ajouter des clés de niveau supérieur personnalisées ici.
- `providerAuthEnvVars` est le chemin de métadonnées léger pour les sondages d'authentification, la validation des marqueurs d'environnement et les surfaces similaires de fournisseur d'authentification qui ne devraient pas démarrer le runtime du plugin juste pour inspecter les noms d'environnement.
- `channelEnvVars` est le chemin de métadonnées léger pour le repli de l'environnement shell, les invites de configuration et les surfaces similaires de canal qui ne devraient pas démarrer le runtime du plugin juste pour inspecter les noms d'environnement.
- `providerAuthChoices` est le chemin de métadonnées léger pour les sélecteurs de choix d'authentification, la résolution `--auth-choice`, le mapping du fournisseur préféré et l'enregistrement simple de l'indicateur CLI d'intégration avant le chargement du runtime du fournisseur. Pour les métadonnées de l'assistant d'exécution qui nécessitent le code du fournisseur, consultez [Provider runtime hooks](/en/plugins/architecture#provider-runtime-hooks).
- Les types exclusifs de plugins sont sélectionnés via `plugins.slots.*`.
  - `kind: "memory"` est sélectionné par `plugins.slots.memory`.
  - `kind: "context-engine"` est sélectionné par `plugins.slots.contextEngine`
    (par défaut : `legacy` intégré).
- `channels`, `providers`, `cliBackends` et `skills` peuvent être omis lorsqu'un
  plugin n'en a pas besoin.
- Si votre plugin dépend de modules natifs, documentez les étapes de construction et toutes les exigences de liste d'autorisation du gestionnaire de packages (par exemple, pnpm `allow-build-scripts`
  - `pnpm rebuild <package>`).

## Connexes

- [Building Plugins](/en/plugins/building-plugins) — démarrer avec les plugins
- [Plugin Architecture](/en/plugins/architecture) — architecture interne
- [SDK Overview](/en/plugins/sdk-overview) — référence du Plugin SDK
