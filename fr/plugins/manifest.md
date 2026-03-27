---
summary: "Manifest du plugin + exigences du schéma JSON (validation stricte de la configuration)"
read_when:
  - You are building an OpenClaw plugin
  - You need to ship a plugin config schema or debug plugin validation errors
title: "Manifest du plugin"
---

# Manifeste de plugin (openclaw.plugin.)

Cette page concerne uniquement le **manifeste de plugin natif OpenClaw**.

Pour les structures de bundle compatibles, voir [Plugin bundles](/fr/plugins/bundles).

Les formats de bundle compatibles utilisent des fichiers de manifeste différents :

- Bundle Codex : `.codex-plugin/plugin.json`
- Bundle Claude : `.claude-plugin/plugin.json` ou la structure de composant Claude par défaut
  sans manifeste
- Bundle Cursor : `.cursor-plugin/plugin.json`

OpenClaw détecte automatiquement ces structures de bundle, mais elles ne sont pas validées
contre le schéma `openclaw.plugin.json` décrit ici.

Pour les bundles compatibles, OpenClaw lit actuellement les métadonnées du bundle ainsi que les racines de compétences déclarées,
les racines de commandes Claude, les valeurs par défaut `settings.json` des bundles Claude, et
les packs de hooks pris en charge lorsque la structure correspond aux attentes d'exécution de OpenClaw.

Chaque plugin natif OpenClaw **doit** inclure un fichier `openclaw.plugin.json` dans la
**racine du plugin**. OpenClaw utilise ce manifeste pour valider la configuration
**sans exécuter le code du plugin**. Les manifestes manquants ou invalides sont traités comme des erreurs de plugin et bloquent la validation de la configuration.

Voir le guide complet du système de plugins : [Plugins](/fr/tools/plugin).
Pour le modèle de capacité natif et les directives actuelles de compatibilité externe :
[Capability model](/fr/plugins/architecture#public-capability-model).

## À quoi sert ce fichier

`openclaw.plugin.json` correspond aux métadonnées que OpenClaw lit avant de charger votre
code de plugin.

Utilisez-le pour :

- identité du plugin
- validation de la configuration
- métadonnées d'authentification et d'intégration (onboarding) qui doivent être disponibles sans démarrer l'exécution du plugin
  runtime
- indications de l'interface utilisateur de configuration

Ne l'utilisez pas pour :

- enregistrer le comportement à l'exécution
- déclarer les points d'entrée du code
- métadonnées d'installation npm

Ces éléments appartiennent à votre code de plugin et à `package.json`.

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

| Champ                 | Obligatoire | Type                             | Signification                                                                                                                                   |
| --------------------- | ----------- | -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`                  | Oui         | `string`                         | Identifiant canonique du plugin. C'est l'identifiant utilisé dans `plugins.entries.<id>`.                                                       |
| `configSchema`        | Oui         | `object`                         | Schéma JSON en ligne pour la configuration de ce plugin.                                                                                        |
| `enabledByDefault`    | Non         | `true`                           | Marque un plugin groupé comme activé par défaut. Omettez-le ou définissez une valeur non `true` pour laisser le plugin désactivé par défaut.    |
| `kind`                | Non         | `"memory"` \| `"context-engine"` | Déclare un type de plugin exclusif utilisé par `plugins.slots.*`.                                                                               |
| `channels`            | Non         | `string[]`                       | Identifiants de chaîne appartenant à ce plugin. Utilisés pour la découverte et la validation de la configuration.                               |
| `providers`           | Non         | `string[]`                       | Identifiants de provider appartenant à ce plugin.                                                                                               |
| `providerAuthEnvVars` | Non         | `Record<string, string[]>`       | Métadonnées d'environnement d'authentification provider peu coûteuses que OpenClaw peut inspecter sans charger le code du plugin.               |
| `providerAuthChoices` | Non         | `object[]`                       | Métadonnées d'auth-choice bon marché pour les sélecteurs d'onboarding, la résolution preferred-provider, et le câblage simple des drapeaux CLI. |
| `skills`              | Non         | `string[]`                       | Répertoires de compétences à charger, relatifs à la racine du plugin.                                                                           |
| `name`                | Non         | `string`                         | Nom du plugin lisible par l'homme.                                                                                                              |
| `description`         | Non         | `string`                         | Résumé court affiché dans les surfaces du plugin.                                                                                               |
| `version`             | Non         | `string`                         | Version du plugin informative.                                                                                                                  |
| `uiHints`             | Non         | `Record<string, object>`         | Étiquettes d'interface utilisateur, espaces réservés et indices de sensibilité pour les champs de configuration.                                |

## Référence providerAuthChoices

Chaque entrée `providerAuthChoices` décrit un choix d'onboarding ou d'authentification.
OpenClaw lit ceci avant le chargement du runtime du provider.

| Champ              | Obligatoire | Type                                            | Signification                                                                                                                  |
| ------------------ | ----------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `provider`         | Oui         | `string`                                        | ID du fournisseur auquel ce choix appartient.                                                                                  |
| `method`           | Oui         | `string`                                        | ID de la méthode d'authentification vers laquelle dispatcher.                                                                  |
| `choiceId`         | Oui         | `string`                                        | ID stable du choix d'authentification utilisé par les processus d'onboarding et de CLI.                                        |
| `choiceLabel`      | Non         | `string`                                        | Libellé visible par l'utilisateur. S'il est omis, OpenClaw revient à `choiceId`.                                               |
| `choiceHint`       | Non         | `string`                                        | Texte d'aide court pour le sélecteur.                                                                                          |
| `groupId`          | Non         | `string`                                        | ID de groupe facultatif pour regrouper les choix connexes.                                                                     |
| `groupLabel`       | Non         | `string`                                        | Libellé visible par l'utilisateur pour ce groupe.                                                                              |
| `groupHint`        | Non         | `string`                                        | Texte d'aide court pour le groupe.                                                                                             |
| `optionKey`        | Non         | `string`                                        | Clé d'option interne pour les flux d'authentification simples à un indicateur.                                                 |
| `cliFlag`          | Non         | `string`                                        | Nom de l'indicateur CLI, tel que `--openrouter-api-key`.                                                                       |
| `cliOption`        | Non         | `string`                                        | Forme complète de l'option CLI, telle que `--openrouter-api-key <key>`.                                                        |
| `cliDescription`   | Non         | `string`                                        | Description utilisée dans l'aide CLI.                                                                                          |
| `onboardingScopes` | Non         | `Array<"text-inference" \| "image-generation">` | Surfaces d'intégration dans lesquelles ce choix doit apparaître. S'il est omis, la valeur par défaut est `["text-inference"]`. |

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

| Champ         | Type       | Signification                                        |
| ------------- | ---------- | ---------------------------------------------------- |
| `label`       | `string`   | Libellé de champ visible par l'utilisateur.          |
| `help`        | `string`   | Texte d'aide court.                                  |
| `tags`        | `string[]` | Balises d'interface utilisateur facultatives.        |
| `advanced`    | `boolean`  | Marque le champ comme avancé.                        |
| `sensitive`   | `boolean`  | Marque le champ comme secret ou sensible.            |
| `placeholder` | `string`   | Texte de remplacement pour les champs de formulaire. |

## Manifeste par rapport à package.

Les deux fichiers ont des fonctions différentes :

| Fichier                | Utiliser pour                                                                                                                                                               |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `openclaw.plugin.json` | Découverte, validation de configuration, métadonnées de choix d'authentification et indices d'interface utilisateur qui doivent exister avant l'exécution du code du plugin |
| `package.json`         | Les métadonnées npm, l'installation des dépendances et le bloc `openclaw` utilisé pour les points d'entrée, la configuration ou les métadonnées du catalogue                |

Si vous n'êtes pas sûr de l'emplacement d'une métadonnée, utilisez cette règle :

- si OpenClaw doit le connaître avant de charger le code du plugin, placez-le dans `openclaw.plugin.json`
- s'il s'agit du packaging, des fichiers d'entrée ou du comportement d'installation npm, placez-le dans `package.json`

## Exigences du schéma JSON

- **Chaque plugin doit fournir un schéma JSON**, même s'il n'accepte aucune configuration.
- Un schéma vide est acceptable (par exemple, `{ "type": "object", "additionalProperties": false }`).
- Les schémas sont validés au moment de la lecture/écriture de la configuration, et non au moment de l'exécution.

## Comportement de la validation

- Les clés `channels.*` inconnues sont des **erreurs**, sauf si l'identifiant de channel est déclaré par
  un manifeste de plugin.
- `plugins.entries.<id>`, `plugins.allow`, `plugins.deny` et `plugins.slots.*`
  doivent référencer des identifiants de plugin **découvrables**. Les identifiants inconnus sont des **erreurs**.
- Si un plugin est installé mais possède un manifeste ou un schéma cassé ou manquant,
  la validation échoue et Doctor signale l'erreur du plugin.
- Si la configuration du plugin existe mais que le plugin est **désactivé**, la configuration est conservée et
  un **avertissement** est affiché dans Doctor + les journaux.

Voir [Configuration reference](/fr/gateway/configuration) pour le schéma `plugins.*` complet.

## Notes

- Le manifeste est **requis pour les plugins natifs OpenClaw**, y compris pour les chargements depuis le système de fichiers local.
- L'exécution charge toujours le module du plugin séparément ; le manifeste sert uniquement
  à la découverte + validation.
- Seuls les champs de manifeste documentés sont lus par le chargeur de manifeste. Évitez d'ajouter
  des clés de niveau supérieur personnalisées ici.
- `providerAuthEnvVars` est le chemin de métadonnées léger pour les sondes d'authentification, la validation
  des marqueurs d'environnement et les surfaces similaires d'auth provider qui ne doivent pas démarrer le runtime
  du plugin juste pour inspecter les noms d'environnement.
- `providerAuthChoices` est le chemin de métadonnées léger pour les sélecteurs de choix d'auth,
  la résolution `--auth-choice`, le mapping du provider préféré et l'enregistrement simple des indicateurs CLI d'onboarding
  avant le chargement du runtime du provider. Pour les métadonnées de l'assistant d'exécution
  nécessitant le code du provider, voir
  [Provider runtime hooks](/fr/plugins/architecture#provider-runtime-hooks).
- Les types de plugins exclusifs sont sélectionnés via `plugins.slots.*`.
  - `kind: "memory"` est sélectionné par `plugins.slots.memory`.
  - `kind: "context-engine"` est sélectionné par `plugins.slots.contextEngine`
    (par défaut : `legacy` intégré).
- `channels`, `providers` et `skills` peuvent être omis lorsqu'un plugin n'en
  a pas besoin.
- Si votre plugin dépend de modules natifs, documentez les étapes de construction et les
  exigences de la liste d'autorisation du gestionnaire de packages (par exemple, pnpm `allow-build-scripts`
  - `pnpm rebuild <package>`).

import fr from "/components/footer/fr.mdx";

<fr />
