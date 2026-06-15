---
summary: "OpenClawConfigurer les plugins natifs Codex migrés pour les agents OpenClaw en mode Codex"
title: "Plugins natifs Codex"
read_when:
  - You want Codex-mode OpenClaw agents to use native Codex plugins
  - You are configuring first-party Codex plugin marketplaces
  - You are troubleshooting codexPlugins, app inventory, destructive actions, or plugin app diagnostics
---

La prise en charge des plugins natifs Codex permet à un agent OpenClaw en mode Codex d'utiliser les propres capacités d'application et de plugin du serveur d'applications Codex au sein du même fil Codex qui gère le tour OpenClaw.

OpenClaw ne traduit pas les plugins Codex en outils dynamiques OpenClaw`codex_plugin_*`OpenClaw
OpenClaw synthétiques. Les appels de plugins restent dans la transcription native Codex, et
le serveur d'applications Codex possède l'exécution MCP soutenue par l'application.

Utilisez cette page une fois que le [harnais Codex](/fr/plugins/codex-harness) de base fonctionne.

## Conditions requises

- Le runtime de l'agent OpenClaw sélectionné doit être le harnais Codex natif.
- `plugins.entries.codex.enabled` doit être vrai.
- `plugins.entries.codex.config.codexPlugins.enabled` doit être vrai.
- V1 prend en charge les places de marché de plugins Codex de première partie : `openai-curated`,
  `openai-bundled` et `openai-primary-runtime`.
- La migration découvre automatiquement uniquement les plugins `openai-curated` qu'elle a observés comme
  installés depuis la source dans le domicile Codex source.
- Le serveur d'applications Codex cible doit être en mesure de voir la place de marché attendue,
  le plugin et l'inventaire des applications.

`codexPlugins`OpenClawOpenAI n'a aucun effet sur les exécutions OpenClaw, les exécutions normales du fournisseur OpenAI, les
liaisons de conversation ACP ou d'autres harnais car ces chemins ne créent pas
de fils de discussion du serveur d'applications Codex avec la configuration native `apps`.

L'accès Codex côté OpenAI, la disponibilité des applications et les contrôles d'application/plugin de l'espace de travail
proviennent du compte Codex connecté. Pour le compte OpenAI et le modèle d'administration,
voir [Utiliser Codex avec votre plan ChatGPT](OpenAIOpenAIhttps://help.openai.com/en/articles/11369540-using-codex-with-your-chatgpt-plan).

## Démarrage rapide

Aperçu de la migration depuis le domicile Codex source :

```bash
openclaw migrate codex --dry-run
```

Utilisez une vérification stricte de l'application source lorsque vous souhaitez que la migration vérifie l'accessibilité de l'application source
avant de planifier l'activation du plugin natif :

```bash
openclaw migrate codex --dry-run --verify-plugin-apps
```

Appliquez la migration lorsque le plan semble correct :

```bash
openclaw migrate apply codex --yes
```

La migration écrit des entrées `codexPlugins` explicites pour les plugins sélectionnés éligibles
et appelle `plugin/install` du serveur d'applications Codex pour les plugins sélectionnés. La configuration
explicite peut également référencer les places de marché intégrées et de première partie de l'exécution principale de Codex
lorsque l'inventaire du serveur d'applications cible expose ces applications de plugins. Une
configuration migrée typique ressemble à ceci :

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

Après avoir modifié `codexPlugins`, les nouvelles conversations Codex prennent automatiquement en compte
le jeu d'applications mis à jour. Utilisez `/new` ou `/reset` pour actualiser la conversation actuelle.
Un redémarrage de la passerelle n'est pas requis pour les modifications d'activation ou de désactivation des plugins.

## Entrées manuelles de place de marché de première partie

La migration écrit des entrées `openai-curated` pour les plugins installés à partir des sources éligibles.
Pour les plugins de première partie qui résident dans les places de marché intégrées ou de l'exécution principale
de Codex, ajoutez des entrées explicites après avoir confirmé que l'inventaire du serveur d'applications Codex cible
expose cette place de marché et ce plugin.

Utilisez la même structure de configuration pour chaque place de marché de première partie :

```json5
{
  plugins: {
    entries: {
      codex: {
        enabled: true,
        config: {
          codexPlugins: {
            enabled: true,
            plugins: {
              chrome: {
                enabled: true,
                marketplaceName: "openai-bundled",
                pluginName: "chrome",
              },
              documents: {
                enabled: true,
                marketplaceName: "openai-primary-runtime",
                pluginName: "documents",
              },
            },
          },
        },
      },
    },
  },
}
```

La clé sous `plugins` est la clé de configuration locale de OpenClaw. `pluginName` et
`marketplaceName` doivent correspondre exactement à l'inventaire du serveur d'applications Codex. Si le
plugin n'est pas répertorié dans `/codex plugins list` ou les diagnostics de l'application Codex, OpenClaw
conserve l'entrée configurée mais ne peut pas exposer ses applications aux tours Codex.

## Gérer les plugins à partir du chat

Utilisez `/codex plugins` lorsque vous souhaitez inspecter ou modifier les plugins Codex natifs configurés
à partir du même chat où vous utilisez le harnais Codex :

```text
/codex plugins
/codex plugins list
/codex plugins disable google-calendar
/codex plugins enable google-calendar
```

`/codex plugins` est un alias pour `/codex plugins list`. La sortie de la liste affiche
les clés de plugin configurées, l'état on/off, le nom du plugin Codex et la place de marché
à partir de `plugins.entries.codex.config.codexPlugins.plugins`.

`enable` et `disable` n'écrivent que dans la configuration de OpenClaw à
l'emplacement `~/.openclaw/openclaw.json` ; ils ne modifient pas `~/.codex/config.toml` ni n'installent
de nouveaux plugins Codex. Seul le propriétaire ou un client passerelle avec la
portée `operator.admin` peut modifier l'état des plugins.

L'activation d'un plugin configuré active également l'interrupteur global
`codexPlugins.enabled`. Si le plugin a été marqué comme désactivé parce que
la migration a renvoyé `auth_required`, réautorisez l'application dans Codex avant de l'activer
dans OpenClaw.

## Fonctionnement de la configuration des plugins natifs

L'intégration possède trois états distincts :

- Installé : Codex dispose du bundle de plugin local dans le runtime du serveur d'applications cible.
- Activé : La configuration OpenClaw est disposée à rendre le plugin disponible pour les tours
  du harnais Codex.
- Accessible : Le serveur d'applications Codex confirme que les entrées d'application du plugin sont disponibles
  pour le compte actif et peuvent être mappées à l'identité du plugin migré.

La migration est l'étape durable d'installation/d'éligibilité. Lors de la planification, OpenClaw
lit les détails du `plugin/read` Codex source et vérifie que la réponse du compte du serveur
d'applications Codex source est un compte d'abonnement ChatGPT. Les réponses de compte non-ChatGPT
ou manquantes ignorent les plugins pris en charge par l'application avec
`codex_subscription_required`. Par défaut, la migration n'appelle pas le
`app/list` source ; les plugins source pris en charge par l'application qui franchissent la porte du compte sont planifiés
sans vérification de l'accessibilité de l'application source, et les échecs de transport de recherche de compte
sont ignorés avec `codex_account_unavailable`. Avec `--verify-plugin-apps`,
la migration prend un instantané frais du `app/list` source et exige que chaque application détenue
soit présente, activée et accessible avant de planifier l'activation native. Dans
ce mode, les échecs de transport de recherche de compte sont transmis à la porte
de l'inventaire des applications source. L'inventaire des applications au moment de l'exécution est la vérification d'accessibilité
de la session cible après la migration. La configuration de session du harnais Codex calcule ensuite une configuration
d'application de thread restrictive pour les applications de plugin activées et accessibles.

La configuration de l'application de thread est calculée lorsque OpenClaw établit une session de harnais Codex
ou remplace une liaison de thread Codex périmée. Elle n'est pas recalculée à chaque tour, donc
`/codex plugins enable` et `/codex plugins disable` affectent les nouvelles conversations
Codex. Utilisez `/new` ou `/reset` lorsque la conversation actuelle doit reprendre
l'ensemble d'applications mis à jour.

## Limite de prise en charge V1

V1 est volontairement restreint :

- La configuration d'exécution accepte les identités de plug-in `openai-curated`, `openai-bundled` et
  `openai-primary-runtime`.
- Seuls les plug-ins `openai-curated` déjà installés dans l'inventaire du serveur d'applications Codex
  source sont éligibles à la migration pour une migration automatique.
- Les plug-ins source avec support applicatif doivent franchir la barrière d'abonnement au moment de la migration.
  `--verify-plugin-apps` ajoute la barrière de l'inventaire des applications source. Les comptes soumis à un abonnement,
  ainsi qu'en mode vérification, les applications source inaccessibles, désactivées, manquantes ou les échecs de rafraîchissement
  de l'inventaire des applications source sont signalés comme éléments manuels ignorés au lieu d'entrées de configuration activées.
  Les détails du plug-in illisibles sont ignorés avant la barrière de l'inventaire des applications source.
- La migration écrit des identités de plug-in explicites avec `marketplaceName` et
  `pluginName` ; elle n'écrit pas les chemins du cache local `marketplacePath`.
- `codexPlugins.enabled` est le commutateur d'activation global.
- Il n'y a pas de caractère générique `plugins["*"]` ni de clé de configuration qui accorde une autorité d'installation arbitraire.
- Les places de marché non prises en charge, les bundles de plug-in mis en cache, les hooks et les fichiers de configuration Codex
  sont conservés dans le rapport de migration pour examen manuel. Les plug-in de première partie fournis et principalement
  d'exécution peuvent toujours être ajoutés manuellement via une configuration explicite `codexPlugins`.

## Inventaire des applications et propriété

OpenClaw lit l'inventaire des applications Codex via le `app/list` du serveur d'applications, le met en cache pendant
une heure et actualise les entrées obsolètes ou manquantes de manière asynchrone. Le cache est
uniquement en mémoire ; le redémarrage de la CLI ou de la passerelle le supprime, et OpenClaw le reconstruit
lors de la prochaine lecture `app/list`.

La migration et l'exécution utilisent des clés de cache distinctes :

- La vérification de la migration source utilise le répertoire d'accueil Codex source et les options de démarrage
  du serveur d'applications source. Cela ne s'exécute que lorsque `--verify-plugin-apps` est défini, et cela
  force un nouveau parcours du `app/list` source pour cette exécution de planification.
- La configuration du runtime cible utilise l'identité du serveur d'application Codex de l'agent cible lorsqu'il génère la configuration de l'application du thread Codex. L'activation du plugin invalide cette clé de cache cible, puis la force à actualiser après `plugin/install`.

Une application de plugin n'est exposée que lorsque OpenClaw peut la faire correspondre au plugin migré via une propriété stable :

- ID exact de l'application à partir des détails du plugin
- nom connu du serveur MCP
- métadonnées stables uniques

Les propriétés basées uniquement sur le nom d'affichage ou ambiguës sont exclues jusqu'à ce que la prochaine actualisation de l'inventaire prouve la propriété.

## Configuration de l'application de thread

OpenClaw injecte un correctif `config.apps` restrictif pour le thread Codex : `_default` est désactivé et seules les applications appartenant aux plugins migrés activés sont activées.

OpenClaw définit le `destructive_enabled` au niveau de l'application à partir de la stratégie `allow_destructive_actions` effective globale ou par plugin, et laisse Codex appliquer les métadonnées d'outil destructeur à partir des annotations d'outil de son application native. La configuration d'application `_default` est désactivée avec `open_world_enabled: false`. Les applications de plugin activées sont émises avec `open_world_enabled: true` ; OpenClaw n'expose pas de bouton de stratégie de monde ouvert distinct pour les plugins et ne maintient pas de listes de refus de noms d'outils destructeurs par plugin.

Le mode d'approbation d'outil est automatique par défaut pour les applications de plugin, afin que les outils de lecture non destructeurs puissent s'exécuter sans interface utilisateur d'approbation dans le même thread. Les outils destructeurs restent contrôlés par la stratégie `destructive_enabled` de chaque application.

## Stratégie d'action destructrice

Les sollicitations de plugins destructeurs sont autorisées par défaut pour les plugins Codex migrés, tandis que les schémas non sécurisés et la propriété ambiguë échouent toujours en mode fermé :

- Le `allow_destructive_actions` global par défaut est `true`.
- Le `allow_destructive_actions` par plugin remplace la stratégie globale pour ce plugin.
- Lorsque la stratégie est `false`, OpenClaw renvoie un refus déterministe.
- Lorsque la stratégie est `true`, OpenClaw accepte automatiquement uniquement les schémas sécurisés qu'il peut mapper à une réponse d'approbation, comme un champ booléen d'approbation.
- L'identité du plugin est manquante, la propriété est ambiguë, un identifiant de tour est manquant, un identifiant de tour est incorrect ou un schéma d'élicitation non sûr entraîne un refus au lieu d'une invite.

## Dépannage

**`auth_required` :** la migration a installé le plugin, mais l'une de ses applications nécessite toujours une authentification. L'entrée de plugin explicite est écrite comme désactivée jusqu'à ce que vous l'autorisiez à nouveau et que vous l'activiez.

**`app_inaccessible`, `app_disabled` ou `app_missing` :**
la migration n'a pas installé le plugin car l'inventaire des applications Codex source n'indiquait pas toutes les applications détenues comme présentes, activées et accessibles alors que `--verify-plugin-apps` était défini. Réautorisez ou activez l'application dans Codex, puis relancez la migration avec `--verify-plugin-apps`.

**`app_inventory_unavailable` :** la migration n'a pas installé le plugin car
une vérification stricte de l'application source a été demandée et l'actualisation de l'inventaire des applications Codex source a échoué. Corrigez l'accès au serveur d'applications Codex source ou réessayez sans
`--verify-plugin-apps` si vous acceptez le plan plus rapide limité au compte.

**`codex_subscription_required` :** la migration n'a pas installé le plugin
pris en charge par l'application car le compte du serveur d'applications Codex source n'était pas connecté avec un compte d'abonnement ChatGPT. Connectez-vous à l'application Codex avec une authentification d'abonnement,
alors relancez la migration.

**`codex_account_unavailable` :** la migration n'a pas installé le plugin pris en charge par l'application
car le compte du serveur d'applications Codex source n'a pas pu être lu. Corrigez l'authentification du serveur d'applications Codex source ou relancez avec `--verify-plugin-apps` si vous souhaitez que l'inventaire des applications source décide de l'éligibilité lorsque la recherche du compte échoue.

**`marketplace_missing` ou `plugin_missing` :** le serveur d'applications Codex cible
ne peut pas voir la marketplace ou le plugin interne attendu. Relancez la migration
sur le runtime cible, inspectez l'état du plugin du serveur d'applications Codex, ou confirmez
que le `marketplaceName` explicite est l'un de `openai-curated`, `openai-bundled`, ou
`openai-primary-runtime`.

**`app_inventory_missing` ou `app_inventory_stale` :** l'état de préparation de l'application provenait d'un
cache vide ou obsolète. OpenClaw planifie une actualisation asynchrone et exclut les applications de plugin
jusqu'à ce que la propriété et l'état de préparation soient connus.

**`app_ownership_ambiguous` :** l'inventaire des applications n'est correspondu que par le nom d'affichage, donc l'application n'est pas exposée au fil Codex.

**Config modifiée mais l'agent ne voit pas le plugin :** utilisez `/codex plugins
list` to confirm the configured state, then use `/new` or `/reset`. Les
liaisons de fil Codex existantes conservent la configuration de l'application avec laquelle elles ont commencé jusqu'à ce qu'OpenClaw
établisse une nouvelle session de harnais ou remplace une liaison obsolète.

**Action destructrice refusée :** vérifiez les valeurs globales et par plugin
de `allow_destructive_actions` . Même lorsque la stratégie est vraie, les schémas d'incitation non sécurisés et l'identité de plugin ambiguë échouent toujours de manière fermée.

## Connexes

- [Harnais Codex](/fr/plugins/codex-harness)
- [Référence du harnais Codex](/fr/plugins/codex-harness-reference)
- [Runtime du harnais Codex](/fr/plugins/codex-harness-runtime)
- [Référence de la configuration](/fr/gateway/configuration-reference#codex-harness-plugin-config)
- [Migrer CLI](/fr/cli/migrate)
