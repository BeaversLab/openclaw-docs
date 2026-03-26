---
summary: "Manifeste de plugin + exigences du schéma JSON (validation de configuration stricte)"
read_when:
  - You are building an OpenClaw plugin
  - You need to ship a plugin config schema or debug plugin validation errors
title: "Manifeste de plugin"
---

# Manifeste de plugin (openclaw.plugin.)

Cette page concerne uniquement le **manifeste de plugin natif OpenClaw**.

Pour les dispositions de bundle compatibles, voir [Plugin bundles](/fr/plugins/bundles).

Les formats de bundle compatibles utilisent des fichiers de manifeste différents :

- Bundle Codex : `.codex-plugin/plugin.json`
- Bundle Claude : `.claude-plugin/plugin.json` ou la disposition de composant Claude par défaut
  sans manifeste
- Bundle Cursor : `.cursor-plugin/plugin.json`

OpenClaw détecte automatiquement ces dispositions de bundle également, mais elles ne sont pas validées
contre le schéma `openclaw.plugin.json` décrit ici.

Pour les bundles compatibles, OpenClaw lit actuellement les métadonnées du bundle ainsi que les racines de compétences déclarées,
les racines de commandes Claude, les valeurs par défaut du bundle Claude `settings.json`, et
les packs de hooks pris en charge lorsque la disposition correspond aux attentes d'exécution OpenClaw.

Chaque plugin natif OpenClaw **doit** inclure un fichier `openclaw.plugin.json` dans la
**racine du plugin**. OpenClaw utilise ce manifeste pour valider la configuration
**sans exécuter le code du plugin**. Les manifestes manquants ou invalides sont traités comme
des erreurs de plugin et bloquent la validation de la configuration.

Voir le guide complet du système de plugins : [Plugins](/fr/tools/plugin).
Pour le modèle de capacité natif et les directives actuelles de compatibilité externe :
[Capability model](/fr/plugins/architecture#public-capability-model).

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

Clés facultatives :

- `kind` (chaîne) : type de plugin (exemples : `"memory"`, `"context-engine"`).
- `channels` (tableau) : identifiants de channel enregistrés par ce plugin (capacité de channel ; exemple : `["matrix"]`).
- `providers` (tableau) : identifiants de provider enregistrés par ce plugin (capacité d'inférence de texte).
- `providerAuthEnvVars` (objet) : variables d'environnement d'authentiation indexées par l'identifiant du provider. Utilisez ceci
  lorsque OpenClaw doit résoudre les identifiants du provider à partir de l'environnement sans charger
  d'abord le runtime du plugin.
- `providerAuthChoices` (tableau) : métadonnées d'intégration légère/choix d'authentiation indexées par
  provider + méthode d'auth. Utilisez ceci lorsque OpenClaw doit afficher un provider dans
  les sélecteurs de choix d'auth, la résolution du provider préféré, et l'aide CLI sans
  charger d'abord le runtime du plugin.
- `skills` (tableau) : répertoires de compétences à charger (relatifs à la racine du plugin).
- `name` (chaîne) : nom d'affichage du plugin.
- `description` (chaîne) : résumé court du plugin.
- `uiHints` (objet) : étiquettes de champs de configuration / espaces réservés / indicateurs sensibles pour le rendu de l'interface utilisateur.
- `version` (chaîne) : version du plugin (informationnel).

### forme `providerAuthChoices`

Chaque entrée peut déclarer :

- `provider` : id du fournisseur
- `method` : id de la méthode d'authentification
- `choiceId` : id stable onboarding/auth-choice
- `choiceLabel` / `choiceHint` : étiquette du sélecteur + indice court
- `groupId` / `groupLabel` / `groupHint` : métadonnées de groupe onboarding bucket
- `optionKey` / `cliFlag` / `cliOption` / `cliDescription` : indicateur unique facultatif
  CLI wiring pour les flux d'authentification simples tels que les clés API

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

## Comportement de la validation

- Les clés `channels.*` inconnues sont des **erreurs**, sauf si l'id de channel est déclaré par
  un manifeste de plugin.
- `plugins.entries.<id>`, `plugins.allow`, `plugins.deny` et `plugins.slots.*`
  doivent référencer des ids de plugins **découvrables**. Les ids inconnus sont des **erreurs**.
- Si un plugin est installé mais possède un manifeste ou un schéma cassé ou manquant,
  la validation échoue et Doctor signale l'erreur du plugin.
- Si la configuration du plugin existe mais que le plugin est **désactivé**, la configuration est conservée et
  un **avertissement** est affiché dans Doctor + les journaux.

Voir [Configuration reference](/fr/configuration) pour le schéma complet `plugins.*`.

## Notes

- Le manifeste est **requis pour les plugins natifs OpenClaw**, y compris pour les chargements depuis le système de fichiers local.
- Le runtime charge toujours le module du plugin séparément ; le manifeste sert uniquement
  à la découverte et à la validation.
- `providerAuthEnvVars` est le chemin de métadonnées léger pour les sondes d'auth, la validation
  des marqueurs d'environnement et les surfaces similaires d'auth de provider qui ne doivent pas
  démarrer le runtime du plugin juste pour inspecter les noms d'environnement.
- `providerAuthChoices` est le chemin de métadonnées léger pour les sélecteurs de choix d'auth,
  la résolution `--auth-choice`, le mapping de provider préféré, et l'enregistrement simple
  de drapeau CLI d'onboarding avant le chargement du runtime du provider. Pour les métadonnées
  de l'assistant (wizard) d'exécution nécessitant le code du provider, voir
  [Provider runtime hooks](/fr/plugins/architecture#provider-runtime-hooks).
- Les types de plugins exclusifs sont sélectionnés via `plugins.slots.*`.
  - `kind: "memory"` est sélectionné par `plugins.slots.memory`.
  - `kind: "context-engine"` est sélectionné par `plugins.slots.contextEngine`
    (par défaut : `legacy` intégré).
- Si votre plugin dépend de modules natifs, documentez les étapes de build et les
  exigences de liste d'autorisation du gestionnaire de paquets (par exemple, pnpm `allow-build-scripts`
  - `pnpm rebuild <package>`).

import fr from "/components/footer/fr.mdx";

<fr />
