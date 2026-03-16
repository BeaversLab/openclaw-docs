---
summary: "Manifest de plugin + exigences de schéma JSON (validation de configuration stricte)"
read_when:
  - You are building a OpenClaw plugin
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

OpenClaw détecte également automatiquement ces dispositions de bundle, mais elles ne sont pas validées
contre le schéma `openclaw.plugin.json` décrit ici.

Pour les bundles compatibles, OpenClaw lit actuellement les métadonnées du bundle ainsi que les racines de compétences déclarées,
les racines de commandes Claude, les valeurs par défaut du bundle Claude `settings.json`, et
les packs de hooks pris en charge lorsque la disposition correspond aux attentes d'exécution de OpenClaw.

Chaque plugin natif OpenClaw **doit** inclure un fichier `openclaw.plugin.json` dans la
**racine du plugin**. OpenClaw utilise ce manifeste pour valider la configuration
**sans exécuter le code du plugin**. Les manifestes manquants ou invalides sont traités comme
des erreurs de plugin et bloquent la validation de la configuration.

Voir le guide complet du système de plugins : [Plugins](/fr/tools/plugin).

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

- `id` (string) : identifiant canonique du plugin.
- `configSchema` (object) : Schéma JSON pour la configuration du plugin (en ligne).

Clés facultatives :

- `kind` (string) : genre de plugin (exemples : `"memory"`, `"context-engine"`).
- `channels` (array) : identifiants de channel enregistrés par ce plugin (exemple : `["matrix"]`).
- `providers` (array) : identifiants de provider enregistrés par ce plugin.
- `skills` (array) : répertoires de compétences à charger (relatifs à la racine du plugin).
- `name` (string) : nom d'affichage du plugin.
- `description` (string) : court résumé du plugin.
- `uiHints` (object) : étiquettes/espaces réservés/indicateurs sensibles des champs de configuration pour le rendu de l'interface utilisateur.
- `version` (string) : version du plugin (informatif).

## Exigences du schéma JSON

- **Chaque plugin doit inclure un schéma JSON**, même s'il n'accepte aucune configuration.
- Un schéma vide est acceptable (par exemple, `{ "type": "object", "additionalProperties": false }`).
- Les schémas sont validés au moment de la lecture/écriture de la configuration, et non à l'exécution.

## Comportement de validation

- Les clés `channels.*` inconnues sont des **erreurs**, sauf si l'identifiant de canal est déclaré par
  un manifeste de plugin.
- `plugins.entries.<id>`, `plugins.allow`, `plugins.deny` et `plugins.slots.*`
  doivent référencer des identifiants de plugin **découvrables**. Les identifiants inconnus sont des **erreurs**.
- Si un plugin est installé mais possède un manifeste ou un schéma manquant ou corrompu,
  la validation échoue et Doctor signale l'erreur du plugin.
- Si la configuration du plugin existe mais que le plugin est **désactivé**, la configuration est conservée et
  un **avertissement** est affiché dans Doctor + les journaux.

## Notes

- Le manifeste est **requis pour les plugins natifs OpenClaw**, y compris pour les chargements depuis le système de fichiers local.
- L'exécution charge toujours le module du plugin séparément ; le manifeste sert uniquement
  à la découverte + validation.
- Les types de plugins exclusifs sont sélectionnés via `plugins.slots.*`.
  - `kind: "memory"` est sélectionné par `plugins.slots.memory`.
  - `kind: "context-engine"` est sélectionné par `plugins.slots.contextEngine`
    (par défaut : `legacy` intégré).
- Si votre plugin dépend de modules natifs, documentez les étapes de construction et toutes
  les exigences de liste blanche du gestionnaire de paquets (par exemple, pnpm `allow-build-scripts`
  - `pnpm rebuild <package>`).

import fr from "/components/footer/fr.mdx";

<fr />
