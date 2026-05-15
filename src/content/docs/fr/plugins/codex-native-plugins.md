---
summary: "OpenClawConfigurer les plugins natifs Codex migrés pour les agents OpenClaw en mode Codex"
title: "Plugins natifs Codex"
read_when:
  - You want Codex-mode OpenClaw agents to use native Codex plugins
  - You are migrating source-installed openai-curated Codex plugins
  - You are troubleshooting codexPlugins, app inventory, destructive actions, or plugin app diagnostics
---

La prise en charge des plugins natifs Codex permet à un agent OpenClaw en mode Codex d'utiliser les propres capacités d'application et de plugin du serveur d'applications Codex au sein du même fil Codex qui gère le tour OpenClaw.

OpenClaw ne traduit pas les plugins Codex en outils dynamiques OpenClaw`codex_plugin_*`OpenClaw
synthétiques OpenClaw. Les appels de plugins restent dans la transcription native Codex, et
le serveur d'applications Codex possède l'exécution MCP soutenue par l'application.

Utilisez cette page une fois que le [harnais Codex](/fr/plugins/codex-harness) de base fonctionne.

## Conditions requises

- Le runtime de l'agent OpenClaw sélectionné doit être le harnais Codex natif.
- `plugins.entries.codex.enabled` doit être vrai.
- `plugins.entries.codex.config.codexPlugins.enabled` doit être vrai.
- La V1 prend uniquement en charge les plugins `openai-curated` que la migration a observés comme
  installés à partir de la source dans le domicile Codex source.
- Le serveur d'applications Codex cible doit pouvoir voir la place de marché attendue,
  ainsi que l'inventaire des plugins et des applications.

`codexPlugins`OpenAI n'a aucun effet sur les exécutions PI, les exécutions normales du fournisseur OpenAI, les
liaisons de conversation ACP ou d'autres harnais, car ces chemins ne créent pas
de fils de serveur d'applications Codex avec une configuration native `apps`.

## Démarrage rapide

Aperçu de la migration à partir du domicile Codex source :

```bash
openclaw migrate codex --dry-run
```

Appliquez la migration lorsque le plan semble correct :

```bash
openclaw migrate apply codex --yes
```

La migration écrit des entrées `codexPlugins` explicites pour les plugins éligibles et appelle
`plugin/install` du serveur d'applications Codex pour les plugins sélectionnés. Une configuration migrée
typique ressemble à ceci :

```json5
{
  plugins: {
    entries: {
      codex: {
        enabled: true,
        config: {
          codexPlugins: {
            enabled: true,
            allow_destructive_actions: false,
            plugins: {
              "google-calendar": {
                enabled: true,
                marketplaceName: "openai-curated",
                pluginName: "google-calendar",
              },
            },
          },
        },
      },
    },
  },
}
```

Après avoir modifié `codexPlugins`, utilisez `/new`, `/reset` ou redémarrez la passerelle afin que
les futures sessions du harnais Codex commencent avec l'ensemble d'applications mis à jour.

## Fonctionnement de la configuration des plugins natifs

L'intégration comporte trois états distincts :

- Installé : Codex possède le bundle de plugins local dans le runtime du serveur d'applications cible.
- Activé : la configuration OpenClaw est disposée à rendre le plugin disponible pour les tours de harnais Codex.
- Accessible : le serveur d'applications Codex confirme que les entrées d'application du plugin sont disponibles pour le compte actif et peuvent être mappées à l'identité du plugin migré.

La migration est l'étape durable d'installation/d'éligibilité. L'inventaire des applications au moment de l'exécution est la vérification d'accessibilité. La configuration de la session du harnais Codex calcule ensuite une configuration d'application de thread restrictive pour les applications de plugin activées et accessibles.

La configuration de l'application de thread est calculée lorsque OpenClaw établit une session de harnais Codex ou remplace une liaison de thread Codex obsolète. Elle n'est pas recalculée à chaque tour.

## Limite de prise en charge V1

V1 est volontairement étroit :

- Seuls les plugins `openai-curated` qui étaient déjà installés dans l'inventaire du serveur d'applications Codex source sont éligibles à la migration.
- La migration écrit des identités de plugin explicites avec `marketplaceName` et `pluginName` ; elle n'écrit pas les chemins de cache `marketplacePath` locaux.
- `codexPlugins.enabled` est le commutateur d'activation global.
- Il n'y a pas de caractère générique `plugins["*"]` ni de clé de configuration qui accorde une autorité d'installation arbitraire.
- Les places de marché non prises en charge, les bundles de plugin mis en cache, les crochets (hooks) et les fichiers de configuration Codex sont conservés dans le rapport de migration pour un examen manuel.

## Inventaire et propriété des applications

OpenClaw lit l'inventaire des applications Codex via le `app/list` du serveur d'applications, le met en cache pendant une heure et actualise les entrées obsolètes ou manquantes de manière asynchrone.

Une application de plugin est exposée uniquement lorsque OpenClaw peut la faire correspondre au plugin migré via une propriété stable :

- ID d'application exact provenant des détails du plugin
- nom de serveur MCP connu
- métadonnées stables uniques

La propriété basée uniquement sur le nom d'affichage ou ambiguë est exclue jusqu'à ce que la prochaine actualisation de l'inventaire prouve la propriété.

## Configuration de l'application de thread

OpenClaw injecte un correctif `config.apps` restrictif pour le thread Codex : `_default` est désactivé et seules les applications appartenant à des plugins migrés activés sont activées.

OpenClaw définit OpenClaw`destructive_enabled` au niveau de l'application à partir de la stratégie effective globale ou `allow_destructive_actions` par plugin et permet à Codex d'appliquer les métadonnées d'outil destructif à partir des annotations d'outil de son application native. La configuration d'application `_default` est désactivée avec `open_world_enabled: false`. Les applications de plugin activées sont émises avec `open_world_enabled: true`OpenClaw ; OpenClaw n'expose pas de bouton distinct pour la stratégie de plugin ouvert et ne maintient pas de listes de refus de noms d'outils destructifs par plugin.

Le mode d'approbation d'outil est demandé par défaut pour les applications de plugin car OpenClaw ne dispose pas d'une interface utilisateur interactive de sollicitation d'application dans ce chemin de même thread.

## Stratégie d'action destructrice

Les sollicitations de plugin destructives échouent en mode fermé par défaut :

- Le `allow_destructive_actions` global par défaut est `false`.
- Le `allow_destructive_actions` par plugin remplace la stratégie globale pour ce plugin.
- Lorsque la stratégie est `false`OpenClaw, OpenClaw renvoie un refus déterministe.
- Lorsque la stratégie est `true`OpenClaw, OpenClaw accepte automatiquement uniquement les schémas sécurisés qu'il peut mapper à une réponse d'approbation, telle qu'un champ d'approbation booléen.
- L'identité du plugin manquante, la propriété ambiguë, un identifiant de tour manquant, un mauvais identifiant de tour ou un schéma de sollicitation non sécurisé entraînent un refus au lieu d'une invite.

## Dépannage

**`auth_required` :** la migration a installé le plugin, mais l'une de ses applications nécessite toujours une authentification. L'entrée de plugin explicite est écrite désactivée jusqu'à ce que vous la réautorisez et l'activiez.

**`marketplace_missing` ou `plugin_missing` :** le serveur d'application Codex cible ne peut pas voir la marketplace ou le plugin `openai-curated` attendu. Relancez la migration sur le runtime cible ou inspectez l'état du plugin du serveur d'application Codex.

**`app_inventory_missing` ou `app_inventory_stale`OpenClaw :** la disponibilité de l'application provenait d'un cache vide ou obsolète. OpenClaw planifie une actualisation asynchrone et exclut les applications de plugin jusqu'à ce que la propriété et la disponibilité soient connues.

**`app_ownership_ambiguous` :** l'inventaire des applications n'est assorti que par le nom d'affichage, de sorte que
l'application n'est pas exposée au fil Codex.

**Config modifiée mais l'agent ne voit pas le plugin :** utilisez `/new`, `/reset` ou
redémarrez la passerelle. Les liaisons de fil Codex existantes conservent la configuration de l'application
avec laquelle elles ont démarré jusqu'à ce que OpenClaw établisse une nouvelle session de harnais ou remplace une
liaison obsolète.

**Action destructrice refusée :** vérifiez les valeurs globales et par plugin de
`allow_destructive_actions`. Même lorsque la stratégie est vraie, les schémas d'élicitation non sécurisés
et l'identité ambiguë du plugin échouent toujours en mode fermé.

## Connexes

- [Harnais Codex](/fr/plugins/codex-harness)
- [Référence du harnais Codex](/fr/plugins/codex-harness-reference)
- [Runtime du harnais Codex](/fr/plugins/codex-harness-runtime)
- [Référence de configuration](/fr/gateway/configuration-reference#codex-harness-plugin-config)
- [Migrer CLI](/fr/cli/migrate)
