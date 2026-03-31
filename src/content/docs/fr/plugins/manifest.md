---
summary: "Manifest de plugin + Exigences de schéma JSON (validation de configuration stricte)"
read_when:
  - You are building an OpenClaw plugin
  - You need to ship a plugin config schema or debug plugin validation errors
title: "Manifeste de plugin"
---

# Manifeste de plugin (openclaw.plugin.)

Cette page concerne uniquement le **manifeste de plugin natif OpenClaw**.

Pour les dispositions de bundle compatibles, voir [Plugin bundles](/en/plugins/bundles).

Les formats de bundle compatibles utilisent des fichiers de manifeste différents :

- Codex bundle : `.codex-plugin/plugin.json`
- Claude bundle : `.claude-plugin/plugin.json` ou la mise en page par défaut du composant Claude sans manifeste
- Bundle Cursor : `.cursor-plugin/plugin.json`

OpenClaw détecte également automatiquement ces structures de bundle, mais elles ne sont pas validées par rapport au schéma `openclaw.plugin.json` décrit ici.

Pour les bundles compatibles, OpenClaw lit actuellement les métadonnées du bundle ainsi que les racines de compétences déclarées, les racines de commandes Claude, les valeurs par défaut des bundles `settings.json` Claude, et les packs de hooks pris en charge, lorsque la disposition correspond aux attentes du runtime OpenClaw.

Chaque plugin natif OpenClaw **doit** inclure un fichier `openclaw.plugin.json` à la
**racine du plugin**. OpenClaw utilise ce manifeste pour valider la configuration
**sans exécuter le code du plugin**. Les manifestes manquants ou invalides sont considérés comme
des erreurs de plugin et bloquent la validation de la configuration.

Voir le guide complet du système de plugins : [Plugins](/en/tools/plugin).
Pour le modèle de capacités natif et les conseils actuels de compatibilité externe :
[Modèle de capacités](/en/plugins/architecture#public-capability-model).

## À quoi sert ce fichier

`openclaw.plugin.json` sont les métadonnées que OpenClaw lit avant de charger votre
code de plugin.

Utilisez-le pour :

- identité du plugin
- validation de la configuration
- métadonnées d'authentification et d'intégration (onboarding) qui doivent être disponibles sans démarrer l'exécution du plugin
  runtime
- instantanés de propriété de capacité statique utilisés pour le câblage de compatibilité groupé et la couverture de contrat
- indices de l'interface de configuration

Ne l'utilisez pas pour :

- enregistrement du comportement à l'exécution
- déclaration des points d'entrée du code
- npm install metadata

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
  "cliBackends": ["openrouter-cli"],
  "providerAuthEnvVars": {
    "openrouter": ["OPENROUTER_API_KEY"]
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

| Champ                 | Obligatoire | Type                             | Signification                                                                                                                                                     |
| --------------------- | ----------- | -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`                  | Oui         | `string`                         | Identifiant canonique du plugin. C'est l'identifiant utilisé dans `plugins.entries.<id>`.                                                                         |
| `configSchema`        | Oui         | `object`                         | Schéma JSON en ligne pour la configuration de ce plugin.                                                                                                          |
| `enabledByDefault`    | Non         | `true`                           | Marque un plugin groupé comme activé par défaut. Omettez-le ou définissez une valeur autre que `true` pour laisser le plugin désactivé par défaut.                |
| `kind`                | Non         | `"memory"` \| `"context-engine"` | Déclare un type de plugin exclusif utilisé par `plugins.slots.*`.                                                                                                 |
| `channels`            | Non         | `string[]`                       | Identifiants de canal appartenant à ce plugin. Utilisés pour la découverte et la validation de la configuration.                                                  |
| `providers`           | Non         | `string[]`                       | Identifiants de fournisseur détenus par ce plugin.                                                                                                                |
| `cliBackends`         | Non         | `string[]`                       | Identifiants du backend d'inférence CLI appartenant à ce plugin. Utilisés pour l'auto-activation au démarrage à partir de références de configuration explicites. |
| `providerAuthEnvVars` | Non         | `Record<string, string[]>`       | Métadonnées bon marché d'authentification de fournisseur (provider-auth env) que OpenClaw peut inspecter sans charger le code du plugin.                          |
| `providerAuthChoices` | Non         | `object[]`                       | Métadonnées d'auth-choice économiques pour les sélecteurs d'onboarding, la résolution preferred-provider et le câblage simple des drapeaux CLI.                   |
| `contracts`           | Non         | `object`                         | Instantané statique des capacités groupées pour la parole, la compréhension des médias, la génération d'images, la recherche web et la propriété d'outil.         |
| `skills`              | Non         | `string[]`                       | Répertoires de compétences à charger, relatifs à la racine du plugin.                                                                                             |
| `name`                | Non         | `string`                         | Nom du plugin lisible par l'homme.                                                                                                                                |
| `description`         | Non         | `string`                         | Résumé court affiché dans les surfaces du plugin.                                                                                                                 |
| `version`             | Non         | `string`                         | Version du plugin à titre d'information.                                                                                                                          |
| `uiHints`             | Non         | `Record<string, object>`         | Libellés de l'interface utilisateur, espaces réservés et indications de sensibilité pour les champs de configuration.                                             |

## Référence de providerAuthChoices

Chaque entrée `providerAuthChoices` décrit un choix d'onboarding ou d'authentification.
OpenClaw lit cela avant le chargement du runtime du provider.

| Champ              | Requis | Type                                            | Signification                                                                                              |
| ------------------ | ------ | ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `provider`         | Oui    | `string`                                        | ID du provider auquel ce choix appartient.                                                                 |
| `method`           | Oui    | `string`                                        | ID de la méthode d'authentification vers laquelle dispatcher.                                              |
| `choiceId`         | Oui    | `string`                                        | ID stable du choix d'authentification utilisé par les flux d'onboarding et de CLI.                         |
| `choiceLabel`      | Non    | `string`                                        | Libellé destiné à l'utilisateur. Si omis, OpenClaw revient à `choiceId`.                                   |
| `choiceHint`       | Non    | `string`                                        | Texte d'aide court pour le sélecteur.                                                                      |
| `groupId`          | Non    | `string`                                        | ID de groupe facultatif pour regrouper les choix connexes.                                                 |
| `groupLabel`       | Non    | `string`                                        | Libellé destiné à l'utilisateur pour ce groupe.                                                            |
| `groupHint`        | Non    | `string`                                        | Texte d'aide court pour le groupe.                                                                         |
| `optionKey`        | Non    | `string`                                        | Clé d'option interne pour les flux d'authentification simple à un indicateur.                              |
| `cliFlag`          | Non    | `string`                                        | Nom de l'indicateur CLI, tel que `--openrouter-api-key`.                                                   |
| `cliOption`        | Non    | `string`                                        | Forme complète de l'option CLI, telle que `--openrouter-api-key <key>`.                                    |
| `cliDescription`   | Non    | `string`                                        | Description utilisée dans l'aide de la CLI.                                                                |
| `onboardingScopes` | Non    | `Array<"text-inference" \| "image-generation">` | Surfaces d'onboarding où ce choix doit apparaître. Si omis, la valeur par défaut est `["text-inference"]`. |

## Référence uiHints

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

Chaque indice de champ peut inclure :

| Champ         | Type       | Signification                                                  |
| ------------- | ---------- | -------------------------------------------------------------- |
| `label`       | `string`   | Libellé du champ destiné à l'utilisateur.                      |
| `help`        | `string`   | Texte d'aide court.                                            |
| `tags`        | `string[]` | Balises d'interface utilisateur facultatives.                  |
| `advanced`    | `boolean`  | Marque le champ comme avancé.                                  |
| `sensitive`   | `boolean`  | Marque le champ comme secret ou sensible.                      |
| `placeholder` | `string`   | Texte de substitution pour les champs de saisie du formulaire. |

## référence des contrats

Utilisez `contracts` uniquement pour les métadonnées statiques de propriété des fonctionnalités qu'OpenClaw peut lire sans importer le runtime du plugin.

```json
{
  "contracts": {
    "speechProviders": ["openai"],
    "mediaUnderstandingProviders": ["openai", "openai-codex"],
    "imageGenerationProviders": ["openai"],
    "webSearchProviders": ["gemini"],
    "tools": ["firecrawl_search", "firecrawl_scrape"]
  }
}
```

Chaque liste est facultative :

| Champ                         | Type       | Ce que cela signifie                                                                        |
| ----------------------------- | ---------- | ------------------------------------------------------------------------------------------- |
| `speechProviders`             | `string[]` | Identifiants de provider vocaux que ce plugin possède.                                      |
| `mediaUnderstandingProviders` | `string[]` | Identifiants des fournisseurs de compréhension des médias que ce plugin possède.            |
| `imageGenerationProviders`    | `string[]` | Identifiants des fournisseurs de génération d'images que ce plugin possède.                 |
| `webSearchProviders`          | `string[]` | Identifiants de provider de recherche Web possédés par ce plugin.                           |
| `tools`                       | `string[]` | Noms des outils d'agent que ce plugin possède pour les vérifications de contrat regroupées. |

Les éléments de premier niveau `speechProviders`, `mediaUnderstandingProviders` et
`imageGenerationProviders` sont obsolètes. Utilisez `openclaw doctor --fix` pour les
déplacer sous `contracts`; le chargement normal du manifeste ne les traite
plus comme une propriété de capacité.

## Manifeste par rapport à package.

Les deux fichiers ont des fonctions différentes :

| Fichier                | Utilisez-le pour                                                                                                                                                              |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `openclaw.plugin.json` | Discovery, validation de la configuration, métadonnées de choix d'authentification et indices d'interface utilisateur qui doivent exister avant l'exécution du code du plugin |
| `package.json`         | métadonnées npm, installation des dépendances et le bloc `openclaw` utilisé pour les points d'entrée et la configuration ou les métadonnées du catalogue                      |

Si vous n'êtes pas sûr de l'emplacement d'une métadonnée, utilisez cette règle :

- si OpenClaw doit le savoir avant de charger le code du plugin, mettez-le dans `openclaw.plugin.json`
- s'il s'agit de l'empaquetage, des fichiers d'entrée ou du comportement de npm install, mettez-le dans `package.json`

## JSON Schema requirements

- **Chaque plugin doit fournir un schéma JSON**, même s'il n'accepte aucune configuration.
- Un schéma vide est acceptable (par exemple, `{ "type": "object", "additionalProperties": false }`).
- Les schémas sont validés lors de la lecture/écriture de la configuration, et non lors de l'exécution.

## Comportement de validation

- Les clés `channels.*` inconnues sont des **erreurs**, sauf si l'id de canal est déclaré par
  un manifeste de plugin.
- `plugins.entries.<id>`, `plugins.allow`, `plugins.deny` et `plugins.slots.*`
  doivent référencer des identifiants de plugin **découvrables**. Les identifiants inconnus sont des **erreurs**.
- Si un plugin est installé mais qu'il a un manifeste ou un schéma manquant ou endommagé,
  la validation échoue et Doctor signale l'erreur du plugin.
- Si la configuration du plugin existe mais que le plugin est **désactivé**, la configuration est conservée et un **avertissement** est affiché dans Doctor + les journaux.

Voir [Référence de la configuration](/en/gateway/configuration) pour le schéma `plugins.*` complet.

## Notes

- Le manifeste est **requis pour les plugins natifs OpenClaw**, y compris pour les chargements depuis le système de fichiers local.
- Le Runtime charge toujours le module du plugin séparément ; le manifeste sert uniquement à la découverte et à la validation.
- Seuls les champs de manifeste documentés sont lus par le chargeur de manifeste. Évitez d'ajouter des clés personnalisées de premier niveau ici.
- `providerAuthEnvVars` est le chemin de métadonnées peu coûteux pour les sondes d'authentification, la validation des marqueurs d'environnement et les surfaces d'authentification de fournisseur similaires qui ne devraient pas démarrer le runtime du plugin juste pour inspecter les noms d'environnement.
- `providerAuthChoices` est le chemin de métadonnées peu coûteux pour les sélecteurs de choix d'authentification,
  la résolution `--auth-choice`, le mappage du provider préféré, et l'enregistrement simple de l'indicateur d'onboarding CLI
  avant le chargement du runtime du provider. Pour les métadonnées de l'assistant d'exécution
  qui nécessitent du code de provider, consultez
  [Provider runtime hooks](/en/plugins/architecture#provider-runtime-hooks).
- Les types de plugins exclusifs sont sélectionnés via `plugins.slots.*`.
  - `kind: "memory"` est sélectionné par `plugins.slots.memory`.
  - `kind: "context-engine"` est sélectionné par `plugins.slots.contextEngine`
    (par défaut : `legacy` intégré).
- `channels`, `providers`, `cliBackends` et `skills` peuvent être omis lorsqu'un plugin n'en a pas besoin.
- Si votre plugin dépend de modules natifs, documentez les étapes de construction et toutes les exigences de liste d'autorisation du gestionnaire de paquets (par exemple, pnpm `allow-build-scripts`
  - `pnpm rebuild <package>`).
