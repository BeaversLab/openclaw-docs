---
summary: "Plugin manifest + JSON schema requirements (strict config validation)"
read_when:
  - Vous créez un plugin OpenClaw
  - Vous devez fournir un schéma de configuration de plugin ou déboguer les erreurs de validation du plugin
title: "Plugin Manifest"
---

# Plugin manifest (openclaw.plugin.)

Cette page concerne uniquement le **manifeste de plugin natif OpenClaw**.

Pour les dispositions de bundle compatibles, voir [Plugin bundles](/fr/plugins/bundles).

Les formats de bundle compatibles utilisent des fichiers manifeste différents :

- Codex bundle : `.codex-plugin/plugin.json`
- Claude bundle : `.claude-plugin/plugin.json` ou la disposition de composant Claude par défaut
  sans manifeste
- Cursor bundle : `.cursor-plugin/plugin.json`

OpenClaw détecte automatiquement ces dispositions de bundle, mais elles ne sont pas validées
contre le schéma `openclaw.plugin.json` décrit ici.

Pour les bundles compatibles, OpenClaw lit actuellement les métadonnées du bundle ainsi que les racines de compétences déclarées, les racines de commandes Claude, les `settings.json` par défaut du bundle Claude, et les packs de hooks pris en charge lorsque la disposition correspond aux attentes du runtime OpenClaw.

Chaque plugin natif OpenClaw **doit** inclure un fichier `openclaw.plugin.json` dans la
**racine du plugin**. OpenClaw utilise ce manifeste pour valider la configuration
**sans exécuter le code du plugin**. Les manifestes manquants ou invalides sont traités comme
des erreurs de plugin et bloquent la validation de la configuration.

Voir le guide complet du système de plugins : [Plugins](/fr/tools/plugin).
Pour le modèle de capacité natif et les recommandations actuelles de compatibilité externe :
[Capability model](/fr/tools/plugin#public-capability-model).

## Champs requis

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

Clés requises :

- `id` (chaîne) : identifiant canonique du plugin.
- `configSchema` (objet) : Schéma JSON pour la configuration du plugin (en ligne).

Clés optionnelles :

- `kind` (chaîne) : type de plugin (exemples : `"memory"`, `"context-engine"`).
- `channels` (tableau) : identifiants de canal enregistrés par ce plugin (capacité de canal ; exemple : `["matrix"]`).
- `providers` (tableau) : identifiants de fournisseur enregistrés par ce plugin (capacité d'inférence de texte).
- `providerAuthEnvVars` (objet) : variables d'environnement d'authenturation indexées par l'identifiant du fournisseur. À utiliser lorsque OpenClaw doit résoudre les identifiants du fournisseur à partir de l'environnement sans charger d'abord le runtime du plugin.
- `providerAuthChoices` (tableau) : métadonnées légères d'intégration/choix d'authentification indexées par fournisseur + méthode d'authentification. À utiliser lorsque OpenClaw doit afficher un fournisseur dans les sélecteurs de choix d'authentification, la résolution du fournisseur préféré et l'aide CLI sans charger d'abord le runtime du plugin.
- `skills` (tableau) : répertoires de compétences à charger (relatifs à la racine du plugin).
- `name` (chaîne) : nom d'affichage du plugin.
- `description` (chaîne) : résumé court du plugin.
- `uiHints` (objet) : étiquettes/emplacements d'entrée/indicateurs sensibles des champs de configuration pour le rendu de l'interface utilisateur.
- `version` (chaîne) : version du plugin (informatif).

### forme `providerAuthChoices`

Chaque entrée peut déclarer :

- `provider` : identifiant du fournisseur
- `method` : identifiant de la méthode d'authentification
- `choiceId` : identifiant stable d'intégration/choix d'authentification
- `choiceLabel` / `choiceHint` : étiquette du sélecteur + indice court
- `groupId` / `groupLabel` / `groupHint` : métadonnées de regroupement pour l'intégration
- `optionKey` / `cliFlag` / `cliOption` / `cliDescription` : câblage optionnel à un indicateur CLI pour les flux d'authentification simples tels que les clés API

Exemple :

```json
{
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
      "cliDescription": "OpenRouter API key"
    }
  ]
}
```

## Exigences du schéma JSON

- **Chaque plugin doit fournir un schéma JSON**, même s'il n'accepte aucune configuration.
- Un schéma vide est acceptable (par exemple, `{ "type": "object", "additionalProperties": false }`).
- Les schémas sont validés au moment de la lecture/écriture de la configuration, et non au moment de l'exécution.

## Comportement de validation

- Les clés `channels.*` inconnues sont des **erreurs**, sauf si l'identifiant de canal est déclaré par un manifeste de plugin.
- `plugins.entries.<id>`, `plugins.allow`, `plugins.deny` et `plugins.slots.*` doivent faire référence à des identifiants de plugin **découvrables**. Les identifiants inconnus sont des **erreurs**.
- Si un plugin est installé mais qu'il a un manifeste ou un schéma cassé ou manquant,
  la validation échoue et Doctor signale l'erreur du plugin.
- Si la configuration du plugin existe mais que le plugin est **désactivé**, la configuration est conservée et
  un **avertissement** est affiché dans Doctor + les journaux.

Consultez la [Référence de configuration](/fr/configuration) pour le schéma `plugins.*` complet.

## Remarques

- Le manifeste est **requis pour les plugins natifs OpenClaw**, y compris pour les chargements du système de fichiers local.
- L'exécution (Runtime) charge toujours le module de plugin séparément ; le manifeste sert uniquement pour
  la découverte + la validation.
- `providerAuthEnvVars` est le chemin de métadonnées léger pour les sondes d'authentification, la validation
  des marqueurs d'environnement, et les surfaces d'authentification de fournisseur similaires qui ne devraient pas
  lancer l'exécution du plugin juste pour inspecter les noms d'environnement.
- `providerAuthChoices` est le chemin de métadonnées léger pour les sélecteurs de choix d'authentification,
  la résolution `--auth-choice`, le mapping de fournisseur préféré, et l'enregistrement simple de l'indicateur CLI
  d'onboarding avant le chargement de l'exécution du fournisseur. Pour les métadonnées de l'assistant d'exécution
  qui nécessitent le code du fournisseur, consultez
  [Crochets d'exécution du fournisseur](/fr/tools/plugin#provider-runtime-hooks).
- Les types de plugins exclusifs sont sélectionnés via `plugins.slots.*`.
  - `kind: "memory"` est sélectionné par `plugins.slots.memory`.
  - `kind: "context-engine"` est sélectionné par `plugins.slots.contextEngine`
    (par défaut : `legacy` intégré).
- Si votre plugin dépend de modules natifs, documentez les étapes de construction et toute
  exigence de liste d'autorisation du gestionnaire de packages (par exemple, pnpm `allow-build-scripts`
  - `pnpm rebuild <package>`).

import fr from "/components/footer/fr.mdx";

<fr />
