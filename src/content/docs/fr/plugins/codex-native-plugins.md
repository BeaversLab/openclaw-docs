---
summary: "OpenClawConfigurer les plugins Codex natifs migrés pour les agents OpenClaw en mode Codex"
title: "Plugins Codex natifs"
read_when:
  - You want Codex-mode OpenClaw agents to use native Codex plugins
  - You are migrating source-installed openai-curated Codex plugins
  - You are troubleshooting codexPlugins, app inventory, destructive actions, or plugin app diagnostics
---

La prise en charge des plugins natifs Codex permet à un agent OpenClaw en mode Codex d'utiliser les propres capacités d'application et de plugin du serveur d'applications Codex au sein du même fil Codex qui gère le tour OpenClaw.

OpenClaw ne traduit pas les plugins Codex en outils dynamiques synthétiques OpenClaw`codex_plugin_*`OpenClaw
d'OpenClaw. Les appels de plugins restent dans la transcription Codex native, et
le serveur d'applications Codex possède l'exécution MCP prise en charge par l'application.

Utilisez cette page une fois que le [harnais Codex](/fr/plugins/codex-harness) de base fonctionne.

## Conditions requises

- Le runtime de l'agent OpenClaw sélectionné doit être le harnais Codex natif.
- `plugins.entries.codex.enabled` doit être vrai.
- `plugins.entries.codex.config.codexPlugins.enabled` doit être vrai.
- V1 prend uniquement en charge les plugins `openai-curated` que la migration a observés comme
  installés via la source dans le domicile Codex source.
- Le serveur d'applications Codex cible doit pouvoir voir la place de marché attendue,
  ainsi que l'inventaire des plugins et des applications.

`codexPlugins`OpenAI n'a aucun effet sur les exécutions PI, les exécutions normales du fournisseur OpenAI, les
liaisons de conversation ACP ou d'autres harnais car ces chemins ne créent pas
de fils de discussion du serveur d'applications Codex avec la configuration native `apps`.

## Démarrage rapide

Aperçu de la migration à partir du domicile Codex source :

```bash
openclaw migrate codex --dry-run
```

Utilisez la vérification stricte de l'application source lorsque vous souhaitez que la migration vérifie l'accessibilité
de l'application source avant de planifier l'activation du plugin natif :

```bash
openclaw migrate codex --dry-run --verify-plugin-apps
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
            allow_destructive_actions: true,
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

Après avoir modifié `codexPlugins`, les nouvelles conversations Codex récupèrent automatiquement
l'ensemble d'applications mis à jour. Utilisez `/new` ou `/reset` pour actualiser la conversation actuelle.
Un redémarrage de la passerelle n'est pas requis pour les modifications d'activation ou de désactivation de plugins.

## Gérer les plugins depuis le chat

Utilisez `/codex plugins` lorsque vous souhaitez inspecter ou modifier les plugins Codex natifs configurés
à partir du même chat où vous faites fonctionner le harnais Codex :

```text
/codex plugins
/codex plugins list
/codex plugins disable google-calendar
/codex plugins enable google-calendar
```

`/codex plugins` est un alias pour `/codex plugins list`. La sortie de liste affiche
les clés de plugin configurées, l'état on/off, le nom du plugin Codex et la place de marché
provenant de `plugins.entries.codex.config.codexPlugins.plugins`.

`enable` et `disable` n'écrivent que dans la configuration OpenClaw à
`~/.openclaw/openclaw.json` ; ils ne modifient pas `~/.codex/config.toml` ni n'installent
de nouveaux plugins Codex. Seul le propriétaire ou un client de passerelle avec la
portée `operator.admin` peut modifier l'état des plugins.

L'activation d'un plugin configuré active également l'interrupteur global
`codexPlugins.enabled`. Si le plugin a été écrit désactivé parce que
la migration a renvoyé `auth_required`, réautorisez l'application dans Codex avant de l'activer
dans OpenClaw.

## Fonctionnement de la configuration des plugins natifs

L'intégration possède trois états distincts :

- Installé : Codex possède le bundle de plugin local dans le runtime du serveur d'application cible.
- Activé : La configuration OpenClaw est disposée à rendre le plugin disponible pour les tours
  du harnais Codex.
- Accessible : Le serveur d'application Codex confirme que les entrées d'application du plugin sont disponibles
  pour le compte actif et peuvent être mappées à l'identité du plugin migré.

La migration est l'étape durable d'installation/d'éligibilité. Lors de la planification, OpenClaw
lit les détails du `plugin/read` Codex source et vérifie que la réponse de compte du
serveur d'application Codex source est un compte d'abonnement ChatGPT. Les réponses de compte non-ChatGPT
ou manquantes ignorent les plugins sauvegardés par une application avec
`codex_subscription_required`. Par défaut, la migration n'appelle pas le `app/list` source ;
les plugins source sauvegardés par une application qui passent la porte de compte sont planifiés
sans vérification de l'accessibilité de l'application source, et les échecs de transport de recherche de compte
sont ignorés avec `codex_account_unavailable`. Avec `--verify-plugin-apps`,
la migration prend un instantané frais du `app/list` source et exige que chaque application détenue
soit présente, activée et accessible avant de planifier l'activation native. Dans
ce mode, les échecs de transport de recherche de compte aboutissent à la porte
de source de l'inventaire d'applications. L'inventaire d'applications au moment de l'exécution est la vérification d'accessibilité
de la session cible après la migration. La configuration de session du harnais Codex calcule ensuite une configuration
restrictive d'application de thread pour les applications de plugin activées et accessibles.

La configuration de l'application de thread est calculée lorsqu'OpenClaw établit une session de harnais Codex ou remplace une liaison de thread Codex obsolète. Elle n'est pas recalculée à chaque tour, donc OpenClaw`/codex plugins enable` et `/codex plugins disable` affectent les nouvelles conversations Codex. Utilisez `/new` ou `/reset` lorsque la conversation actuelle doit récupérer l'ensemble d'applications mis à jour.

## Limite de prise en charge V1

La V1 est volontairement restreinte :

- Seuls les plugins `openai-curated` qui étaient déjà installés dans l'inventaire du serveur d'application Codex source sont éligibles à la migration.
- Les plugins source pris en charge par une application doivent franchir la porte d'abonnement lors de la migration. `--verify-plugin-apps` ajoute la porte d'inventaire des applications source. Les comptes soumis à un abonnement, ainsi qu'en mode vérification, les applications source inaccessibles, désactivées, manquantes ou les échecs d'actualisation de l'inventaire des applications source sont signalés comme éléments manuels ignorés au lieu d'entrées de configuration activées. Les détails des plugins illisibles sont ignorés avant la porte d'inventaire des applications source.
- La migration écrit des identités de plugins explicites avec `marketplaceName` et `pluginName` ; elle n'écrit pas les chemins du cache `marketplacePath` local.
- `codexPlugins.enabled` est le commutateur d'activation global.
- Il n'y a pas de caractère générique `plugins["*"]` ni de clé de configuration qui accorde une autorité d'installation arbitraire.
- Les places de marché non prises en charge, les bundles de plugins mis en cache, les hooks et les fichiers de configuration Codex sont conservés dans le rapport de migration pour un examen manuel.

## Inventaire des applications et propriété

OpenClaw lit l'inventaire des applications Codex via le OpenClaw`app/list`CLIOpenClaw du serveur d'application, le met en cache pendant une heure et actualise les entrées obsolètes ou manquantes de manière asynchrone. Le cache n'est qu'en mémoire ; le redémarrage de l'CLI ou de la passerelle le supprime, et OpenClaw le reconstruit à partir de la prochaine lecture `app/list`.

La migration et l'exécution utilisent des clés de cache distinctes :

- La vérification de la migration source utilise le répertoire d'accueil Codex source et les options de démarrage du serveur d'application source. Cela ne s'exécute que lorsque `--verify-plugin-apps` est défini, et force un nouveau parcours du `app/list` source pour cette exécution de planification.
- La configuration du runtime cible utilise l'identité du serveur d'applications Codex de l'agent cible lorsqu'il
  construit la configuration de l'application de thread Codex. L'activation du plugin invalide cette clé de
  cache cible puis la force à s'actualiser après `plugin/install`.

Une application de plugin est exposée uniquement lorsque OpenClaw peut la faire correspondre au plugin
migré via une propriété stable :

- id d'application exact à partir des détails du plugin
- nom de serveur MCP connu
- métadonnées uniques et stables

La propriété par nom d'affichage uniquement ou ambiguë est exclue jusqu'à ce que la prochaine actualisation
de l'inventaire prouve la propriété.

## Configuration de l'application de thread

OpenClaw injecte un correctif `config.apps` restrictif pour le thread Codex :
`_default` est désactivé et seules les applications appartenant à des plugins migrés activés sont
activées.

OpenClaw définit le `destructive_enabled` au niveau de l'application à partir de la stratégie globale effective ou
par plugin `allow_destructive_actions` et laisse Codex appliquer
les métadonnées de tool destructrices à partir des annotations de tool d'application natives. La configuration de
l'application `_default` est désactivée avec `open_world_enabled: false`. Les applications de plugin activées
sont émises avec `open_world_enabled: true` ; OpenClaw n'expose pas de
bouton de stratégie de monde ouvert distinct pour les plugins et ne maintient pas de listes de refus de noms de
tool destructeurs par plugin.

Le mode d'approbation des tool est automatique par défaut pour les applications de plugin afin que les tool de
lecture non destructrices puissent s'exécuter sans interface utilisateur d'approbation dans le même thread. Les tool destructrices restent
contrôlées par la stratégie `destructive_enabled` de chaque application.

## Stratégie d'action destructive

Les sollicitations de plugins destructives sont autorisées par défaut pour les plugins Codex
migrés, tandis que les schémas non sécurisés et la propriété ambiguë échouent toujours en mode fermé :

- Le `allow_destructive_actions` global est défini par défaut sur `true`.
- Le `allow_destructive_actions` par plugin remplace la stratégie globale pour ce
  plugin.
- Lorsque la stratégie est `false`, OpenClaw renvoie un refus déterministe.
- Lorsque la stratégie est `true`, OpenClaw accepte automatiquement uniquement les schémas sûrs qu'il peut associer à
  une réponse d'approbation, telle qu'un champ d'approbation booléen.
- Identité de plugin manquante, propriété ambiguë, un id de tour manquant, un mauvais id de tour ou un schéma d'élicitation non sécurisé refuse au lieu de demander.

## Dépannage

**`auth_required` :** la migration a installé le plugin, mais l'une de ses applications a encore besoin d'authentification. L'entrée de plugin explicite est écrite comme désactivée jusqu'à ce que vous la réautorisez et l'activiez.

**`app_inaccessible`, `app_disabled` ou `app_missing` :**
la migration n'a pas installé le plugin car l'inventaire des applications Codex source n'a pas affiché toutes les applications détenues comme présentes, activées et accessibles alors que `--verify-plugin-apps` était défini. Réautorisez ou activez l'application dans Codex, puis relancez la migration avec `--verify-plugin-apps`.

**`app_inventory_unavailable` :** la migration n'a pas installé le plugin car
une vérification stricte de l'application source a été demandée et l'actualisation de l'inventaire des applications Codex source a échoué. Corrigez l'accès au serveur d'applications Codex source ou réessayez sans `--verify-plugin-apps` si vous acceptez le plan plus rapide limité au compte.

**`codex_subscription_required` :** la migration n'a pas installé le plugin
pris en charge par l'application car le compte du serveur d'applications Codex source n'était pas connecté avec un compte d'abonnement ChatGPT. Connectez-vous à l'application Codex avec l'authentification par abonnement, puis relancez la migration.

**`codex_account_unavailable` :** la migration n'a pas installé le plugin pris en charge par l'application car le compte du serveur d'applications Codex source n'a pas pu être lu. Corrigez l'authentification du serveur d'applications Codex source ou relancez avec `--verify-plugin-apps` si vous souhaitez que l'inventaire des applications source décide de l'éligibilité lorsque la recherche de compte échoue.

**`marketplace_missing` ou `plugin_missing` :** le serveur d'applications Codex cible ne peut pas voir la place de marché ou le plugin `openai-curated` attendu. Relancez la migration sur le runtime cible ou inspectez l'état du plugin du serveur d'applications Codex.

**`app_inventory_missing` ou `app_inventory_stale` :** l'état de préparation de l'application provenait d'un cache vide ou obsolète. OpenClaw planifie une actualisation asynchrone et exclut les applications de plugin jusqu'à ce que la propriété et l'état de préparation soient connus.

**`app_ownership_ambiguous` :** l'inventaire des applications correspondait uniquement par nom d'affichage, donc l'application n'est pas exposée au fil Codex.

**Configuration modifiée mais l'agent ne voit pas le plugin :** utilisez `/codex plugins
list` to confirm the configured state, then use `/new` or `/reset`. Les
liaisons de thread Codex existantes conservent la configuration de l'application
avec laquelle elles ont commencé jusqu'à ce qu'OpenClaw
établisse une nouvelle session de harnais ou remplace une liaison obsolète.

**Action destructrice refusée :** vérifiez les valeurs globales et par plugin
de `allow_destructive_actions`. Même lorsque la stratégie est définie sur true,
les schémas d'incitation non sécurisés et l'identité ambiguë du plugin échouent
toujours en mode fermé.

## Connexes

- [Harnais Codex](/fr/plugins/codex-harness)
- [Référence du harnais Codex](/fr/plugins/codex-harness-reference)
- [Runtime du harnais Codex](/fr/plugins/codex-harness-runtime)
- [Référence de la configuration](/fr/gateway/configuration-reference#codex-harness-plugin-config)
- [Migrer CLI](/fr/cli/migrate)
