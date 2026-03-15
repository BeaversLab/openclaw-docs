---
summary: "Manifest de plugin + exigences de schéma JSON (validation de configuration stricte)"
read_when:
  - You are building a OpenClaw plugin
  - You need to ship a plugin config schema or debug plugin validation errors
title: "Manifeste de plugin"
---

# Manifeste de plugin (openclaw.plugin.)

Chaque plugin **doit** inclure un fichier `openclaw.plugin.json` dans la **racine du plugin**.
OpenClaw utilise ce manifeste pour valider la configuration **sans exécuter le code
du plugin**. Les manifestes manquants ou invalides sont traités comme des erreurs de plugin et bloquent
la validation de la configuration.

Voir le guide complet du système de plugins : [Plugins](/fr/tools/plugin).

## Champs obligatoires

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

Clés obligatoires :

- `id` (chaîne) : identifiant canonique du plugin.
- `configSchema` (objet) : Schéma JSON pour la configuration du plugin (en ligne).

Clés optionnelles :

- `kind` (chaîne) : type de plugin (exemples : `"memory"`, `"context-engine"`).
- `channels` (tableau) : identifiants de channel enregistrés par ce plugin (exemple : `["matrix"]`).
- `providers` (tableau) : identifiants de provider enregistrés par ce plugin.
- `skills` (tableau) : répertoires de compétences à charger (relatifs à la racine du plugin).
- `name` (chaîne) : nom d'affichage du plugin.
- `description` (chaîne) : résumé court du plugin.
- `uiHints` (objet) : étiquettes de champs de configuration / espaces réservés / indicateurs sensibles pour le rendu de l'interface utilisateur.
- `version` (chaîne) : version du plugin (informatif).

## Exigences du schéma JSON

- **Chaque plugin doit fournir un schéma JSON**, même s'il n'accepte aucune configuration.
- Un schéma vide est acceptable (par exemple, `{ "type": "object", "additionalProperties": false }`).
- Les schémas sont validés au moment de la lecture/écriture de la configuration, et non au moment de l'exécution.

## Comportement de validation

- Les clés `channels.*` inconnues sont des **erreurs**, sauf si l'identifiant de channel est déclaré par
  un manifeste de plugin.
- `plugins.entries.<id>`, `plugins.allow`, `plugins.deny` et `plugins.slots.*`
  doivent référencer des ids de plugins **découvrables**. Les ids inconnus sont des **erreurs**.
- Si un plugin est installé mais possède un manifeste ou un schéma cassé ou manquant,
  la validation échoue et Doctor signale l'erreur du plugin.
- Si la configuration d'un plugin existe mais que le plugin est **désactivé**, la configuration est conservée et
  un **avertissement** est affiché dans Doctor + les journaux.

## Remarques

- Le manifeste est **requis pour tous les plugins**, y compris pour les chargements depuis le système de fichiers local.
- L'exécution charge toujours le module du plugin séparément ; le manifeste sert uniquement
  à la découverte + validation.
- Les types de plugins exclusifs sont sélectionnés via `plugins.slots.*`.
  - `kind: "memory"` est sélectionné par `plugins.slots.memory`.
  - `kind: "context-engine"` est sélectionné par `plugins.slots.contextEngine`
    (par défaut : `legacy` intégré).
- Si votre plugin dépend de modules natifs, documentez les étapes de construction et les
  exigences de liste d'autorisation du gestionnaire de packages (par exemple, pnpm `allow-build-scripts`
  - `pnpm rebuild <package>`).

import fr from '/components/footer/fr.mdx';

<fr />
