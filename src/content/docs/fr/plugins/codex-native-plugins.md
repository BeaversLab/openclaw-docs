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
OpenClaw synthétiques. Les appels de plugins restent dans la transcription Codex native, et
Codex app-server possède l'exécution MCP soutenue par l'application.

Utilisez cette page une fois que le [harnais Codex](/fr/plugins/codex-harness) de base fonctionne.

## Conditions requises

- Le runtime de l'agent OpenClaw sélectionné doit être le harnais Codex natif.
- `plugins.entries.codex.enabled` doit être true.
- `plugins.entries.codex.config.codexPlugins.enabled` doit être true.
- V1 prend en charge uniquement les plugins `openai-curated` que la migration a observés comme
  installés via la source dans le domicile Codex source.
- Le serveur d'applications Codex cible doit pouvoir voir la place de marché attendue,
  ainsi que l'inventaire des plugins et des applications.

`codexPlugins`OpenAI n'a aucun effet sur les exécutions PI, les exécutions normales du fournisseur OpenAI, les
liaisons de conversation ACP ou d'autres harnais car ces chemins ne créent pas de
threads Codex app-server avec une configuration native `apps`.

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
`plugin/install` de Codex app-server pour les plugins sélectionnés. Une configuration typique
migrée ressemble à ceci :

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

Après avoir modifié `codexPlugins`, utilisez `/new`, `/reset` ou redémarrez la passerelle afin que
les futures sessions du harnais Codex commencent avec l'ensemble d'applications mis à jour.

## Fonctionnement de la configuration des plugins natifs

L'intégration possède trois états distincts :

- Installé : Codex possède le bundle de plugins local dans le runtime app-server cible.
- Activé : La configuration OpenClaw est disposée à rendre le plugin disponible pour les
  tours de harnais Codex.
- Accessible : Codex app-server confirme que les entrées d'application du plugin sont disponibles
  pour le compte actif et peuvent être mappées à l'identité du plugin migré.

La migration est l'étape durable d'installation/d'éligibilité. Lors de la planification, OpenClaw lit les détails du OpenClaw`plugin/read` Codex source et vérifie que la réponse du compte du serveur d'application Codex source est un compte d'abonnement ChatGPT. Les réponses de compte non ChatGPT ou manquantes ignorent les plugins pris en charge par l'application avec `codex_subscription_required`. Par défaut, la migration n'appelle pas le `app/list` source ; les plugins sources pris en charge par l'application qui franchissent la barrière du compte sont planifiés sans vérification de l'accessibilité de l'application source, et les échecs de transport de recherche de compte sont ignorés avec `codex_account_unavailable`. Avec `--verify-plugin-apps`, la migration prend un instantané frais du `app/list` source et exige que chaque application détenue soit présente, activée et accessible avant de planifier l'activation native. Dans ce mode, les échecs de transport de recherche de compte aboutissent à la barrière de l'inventaire des applications source. L'inventaire des applications au moment de l'exécution est la vérification de l'accessibilité de la session cible après la migration. La configuration de session du harnais Codex calcule ensuite une configuration restrictive d'application de thread pour les applications de plugin activées et accessibles.

La configuration de l'application de thread est calculée lorsqu'OpenClaw établit une session de harnais Codex ou remplace une liaison de thread Codex périmée. Elle n'est pas recalculée à chaque tour.

## Limite de prise en charge V1

V1 est volontairement restreint :

- Seuls les plugins `openai-curated` qui étaient déjà installés dans l'inventaire du serveur d'application Codex source sont éligibles à la migration.
- Les plugins sources pris en charge par l'application doivent franchir la barrière d'abonnement au moment de la migration. `--verify-plugin-apps` ajoute la barrière de l'inventaire des applications source. Les comptes soumis à la barrière d'abonnement, ainsi qu'en mode de vérification, les applications source inaccessibles, désactivées ou manquantes, ou les échecs d'actualisation de l'inventaire des applications source, sont signalés comme éléments manuels ignorés au lieu d'entrées de configuration activées. Les détails illisibles du plugin sont ignorés avant la barrière de l'inventaire des applications source.
- La migration écrit les identités explicites des plugins avec `marketplaceName` et `pluginName` ; elle n'écrit pas les chemins du cache local `marketplacePath`.
- `codexPlugins.enabled` est le commutateur global d'activation.
- Il n'y a pas de caractère générique `plugins["*"]` ni de clé de configuration qui accorde une autorité d'installation arbitraire.
- Les places de marché non prises en charge, les bundles de plugins mis en cache, les hooks et les fichiers de configuration Codex sont conservés dans le rapport de migration pour un examen manuel.

## Inventaire et propriété des applications

OpenClaw lit l'inventaire des applications Codex via le `app/list` du serveur d'applications, le met en cache pendant une heure, et actualise les entrées obsolètes ou manquantes de manière asynchrone. Le cache est uniquement en mémoire ; le redémarrage de la CLI ou de la passerelle le supprime, et OpenClaw le reconstruit à partir de la prochaine lecture `app/list`.

La migration et l'exécution utilisent des clés de cache distinctes :

- La vérification de la migration source utilise le répertoire d'accueil Codex source et les options de démarrage du serveur d'applications source. Cela ne s'exécute que lorsque `--verify-plugin-apps` est défini, et force un nouveau parcours source `app/list` pour cette exécution de planification.
- La configuration de l'exécution cible utilise l'identité du serveur d'applications Codex de l'agent cible lorsqu'il construit la configuration de l'application de thread Codex. L'activation du plug-in invalide cette clé de cache cible, puis l'actualise de force après `plugin/install`.

Une application de plug-in n'est exposée que si OpenClaw peut la faire correspondre au plug-in migré via une propriété stable :

- identifiant exact de l'application à partir des détails du plug-in
- nom connu du serveur MCP
- métadonnées uniques et stables

La propriété basée uniquement sur le nom d'affichage ou ambiguë est exclue jusqu'à ce que le prochain rafraîchissement de l'inventaire prouve la propriété.

## Configuration de l'application de thread

OpenClaw injecte un correctif `config.apps` restrictif pour le thread Codex : `_default` est désactivé et seules les applications détenues par des plug-ins migrés activés sont activées.

OpenClaw définit la OpenClaw`destructive_enabled` au niveau de l'application à partir de la stratégie `allow_destructive_actions` globale effective ou par plugin, et permet à Codex d'appliquer les métadonnées de tool destructif issues des annotations de tool d'application natives. La configuration d'application `_default` est désactivée avec `open_world_enabled: false`. Les applications de plugin activées sont émises avec `open_world_enabled: true`OpenClaw ; OpenClaw n'expose pas de bouton distinct de stratégie de monde ouvert pour les plugins et ne maintient pas de listes de refus de noms de tool destructifs par plugin.

Le mode d'approbation des tools est automatique par défaut pour les applications de plugin, afin que les tools de lecture non destructifs puissent s'exécuter sans interface utilisateur d'approbation dans le même fil. Les tools destructifs restent contrôlés par la stratégie `destructive_enabled` de chaque application.

## Stratégie d'action destructive

Les sollicitations de plugin destructives sont autorisées par défaut pour les plugins Codex migrés, tandis que les schémas non sécurisés et la propriété ambiguë échouent toujours de manière fermée :

- Le `allow_destructive_actions` global est défini par défaut sur `true`.
- Le `allow_destructive_actions` par plugin remplace la stratégie globale pour ce plugin.
- Lorsque la stratégie est `false`OpenClaw, OpenClaw retourne un refus déterministe.
- Lorsque la stratégie est `true`OpenClaw, OpenClaw accepte automatiquement uniquement les schémas sécurisés qu'il peut mapper à une réponse d'approbation, comme un champ d'approbation booléen.
- L'identité de plugin manquante, la propriété ambiguë, un identifiant de tour manquant, un identifiant de tour incorrect ou un schéma de sollicitation non sécurisé entraînent un refus au lieu d'une invite.

## Dépannage

**`auth_required` :** la migration a installé le plugin, mais l'une de ses applications a toujours besoin d'une authentification. L'entrée explicite du plugin est écrite comme désactivée jusqu'à ce que vous la réautorisez et l'activiez.

**`app_inaccessible`, `app_disabled` ou `app_missing` :** la migration n'a pas installé le plugin car l'inventaire des applications Codex source ne montrait pas toutes les applications détenues comme présentes, activées et accessibles lorsque `--verify-plugin-apps` était défini. Réautorisez ou activez l'application dans Codex, puis relancez la migration avec `--verify-plugin-apps`.

**`app_inventory_unavailable` :** la migration n'a pas installé le plugin car
une vérification stricte de l'application source a été demandée et que
l'actualisation de l'inventaire des applications Codex source a échoué. Corrigez
l'accès au serveur d'applications Codex source ou réessayez sans
`--verify-plugin-apps` si vous acceptez le plan plus rapide limité au
compte.

**`codex_subscription_required` :** la migration n'a pas installé le plugin
prenant en charge l'application car le compte du serveur d'applications Codex
source n'était pas connecté avec un compte d'abonnement ChatGPT. Connectez-vous à
l'application Codex avec l'authentification d'abonnement, puis relancez la
migration.

**`codex_account_unavailable` :** la migration n'a pas installé le plugin
prenant en charge l'application car le compte du serveur d'applications Codex
source n'a pas pu être lu. Corrigez l'authentification du serveur d'applications
Codex source ou relancez avec `--verify-plugin-apps` si vous souhaitez que
l'inventaire des applications source décide de l'éligibilité lorsque la recherche
de compte échoue.

**`marketplace_missing` ou `plugin_missing` :** le serveur
d'applications Codex cible ne peut pas voir la place de marché `openai-curated` ou le plugin attendu. Relancez la
migration sur le runtime cible ou inspectez l'état des plugins du serveur
d'applications Codex.

**`app_inventory_missing` ou `app_inventory_stale`OpenClaw :** l'état de
préparation de l'application provenait d'un cache vide ou obsolète. OpenClaw
planifie une actualisation asynchrone et exclut les applications de plugin jusqu'à
ce que la propriété et l'état de préparation soient connus.

**`app_ownership_ambiguous` :** l'inventaire des applications n'a fait
une correspondance que sur le nom d'affichage, l'application n'est donc pas
exposée au fil Codex.

**La configuration a changé mais l'agent ne peut pas voir le plugin :**
utilisez `/new`, `/reset`OpenClaw, ou redémarrez la passerelle. Les liaisons de fil Codex existantes conservent la configuration de
l'application avec laquelle elles ont commencé jusqu'à ce qu'OpenClaw établisse une
nouvelle session de harnais ou remplace une liaison obsolète.

**L'action destructrice est refusée :** vérifiez les valeurs globales et par
plugin de `allow_destructive_actions`. Même lorsque la stratégie est vraie, les
schémas d'élicitation non sécurisés et l'identité ambiguë du plugin échouent
toujours de manière fermée.

## Connexes

- [Harnais Codex](/fr/plugins/codex-harness)
- [Référence du harnais Codex](/fr/plugins/codex-harness-reference)
- [Runtime du harnais Codex](/fr/plugins/codex-harness-runtime)
- [Référence de la configuration](/fr/gateway/configuration-reference#codex-harness-plugin-config)
- [Migrer la CLI](/fr/cli/migrate)
