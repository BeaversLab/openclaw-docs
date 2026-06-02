---
summary: "OpenClawInstaller, configurer et gérer les plugins OpenClaw"
read_when:
  - Installing or configuring plugins
  - Understanding plugin discovery and load rules
  - Working with Codex/Claude-compatible plugin bundles
title: "Plugins"
sidebarTitle: "Getting Started"
doc-schema-version: 1
---

Les plugins étendent OpenClaw avec des canaux, des fournisseurs de modèles, des harnais d'agents, des outils,
compétences, parole, transcription en temps réel, voix, compréhension des médias, génération,
récupération web, recherche web et autres capacités d'exécution.

Utilisez cette page lorsque vous souhaitez installer un plugin, redémarrer le Gateway, vérifier
que le runtime l'a chargé et résoudre les échecs courants de configuration. Pour des exemples
de commandes uniquement, consultez [Gérer les plugins](/fr/plugins/manage-plugins). Pour l'inventaire complet
généré des plugins intégrés, officiels externes et source uniquement, consultez
[Inventaire des plugins](/fr/plugins/plugin-inventory).

## Configuration requise

Avant d'installer un plugin, assurez-vous de disposer de :

- un checkout ou une installation OpenClaw avec la OpenClaw`openclaw`CLI CLI disponible
- un accès réseau à la source sélectionnée, telle que ClawHub, npm ou un hôte git
- toutes les identifiants, clés de configuration ou outils système spécifiques au plugin nommés
  par la documentation d'installation de ce plugin
- l'autorisation pour le Gateway qui sert vos canaux de recharger ou redémarrer

## Quick start

<Steps>
  <Step title="Trouver le plugin">
    Recherchez des packages de plugins publics sur [ClawHub](/fr/clawhub) :

    ```bash
    openclaw plugins search "calendar"
    ```

    ClawHub est la principale surface de découverte pour les plugins communautaires. Pendant

la phase de transition de lancement, les spécifications de package nues ordinaires s'installent toujours à partir de npm à moins
qu'elles ne correspondent à un identifiant de plugin officiel. Les spécifications de package brutes `@openclaw/*` qui correspondent
à des plugins intégrés utilisent la copie intégrée du build actuel de OpenClaw. Utilisez un
préfixe explicite lorsque vous avez besoin d'une source spécifique.

  </Step>

  <Step title="Installer le plugin">
    ```bash
    # From ClawHub.
    openclaw plugins install clawhub:<package>

    # From npm.
    openclaw plugins install npm:<package>

    # From git.
    openclaw plugins install git:github.com/<owner>/<repo>@<ref>

    # From a local development checkout.
    openclaw plugins install ./my-plugin
    openclaw plugins install --link ./my-plugin
    ```

    Traitez les installations de plugins comme l'exécution de code. Préférez les versions épinglées lorsque vous
    avez besoin d'installations de production reproductibles.

  </Step>

  <Step title="Configurer et activer">
    Configurez les paramètres spécifiques au plugin sous `plugins.entries.<id>.config`.
    Activez le plugin s'il n'est pas déjà activé :

    ```bash
    openclaw plugins enable <plugin-id>
    ```

    Si votre configuration utilise une liste `plugins.allow` restrictive, l'identifiant du plugin installé doit y être présent avant que le plugin puisse se charger. `openclaw plugins install` ajoute l'identifiant installé à une liste `plugins.allow` existante et supprime le même identifiant de `plugins.deny` afin que l'installation explicite puisse se charger après le redémarrage.

  </Step>

  <Step title="Laissez le Gateway se recharger">
    L'installation, la mise à jour ou la désinstallation du code du plugin nécessite un redémarrage du Gateway.
    Lorsqu'un Gateway géré est déjà en cours d'exécution avec le rechargement de la configuration
    activé, OpenClaw détecte l'enregistrement d'installation du plugin modifié et redémarre le
    Gateway automatiquement. Si le Gateway n'est pas géré ou si le rechargement est désactivé,
    redémarrez-le vous-même :

    ```bash
    openclaw gateway restart
    ```

    Les opérations d'activation et de désactivation mettent à jour la configuration et actualisent le registre à froid.
    Une inspection du runtime reste le chemin de vérification le plus clair pour les surfaces du runtime en direct.

  </Step>

  <Step title="Vérifier l'enregistrement du runtime">
    ```bash
    openclaw plugins inspect <plugin-id> --runtime --json
    ```

    Utilisez `--runtime`GatewayCLI lorsque vous devez prouver les outils, hooks, services, méthodes du Gateway ou commandes CLI enregistrés appartenant à un plugin. `inspect` simple est une vérification froide du manifeste et du registre.

  </Step>
</Steps>

## Configuration

### Choisir une source d'installation

| Source       | Utiliser quand                                                                                                     | Exemple                                                        |
| ------------ | ------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------- |
| ClawHub      | Vous voulez la découverte, les analyses, les métadonnées de version et les conseils d'installation natifs OpenClaw | `openclaw plugins install clawhub:<package>`                   |
| npm          | Vous avez besoin des workflows directs de registre npm ou de dist-tag                                              | `openclaw plugins install npm:<package>`                       |
| git          | Vous avez besoin d'une branche, d'une balise ou d'un commit d'un dépôt                                             | `openclaw plugins install git:github.com/<owner>/<repo>@<ref>` |
| chemin local | Vous développez ou testez un plugin sur la même machine                                                            | `openclaw plugins install --link ./my-plugin`                  |
| marketplace  | Vous installez un plugin marketplace compatible Claude                                                             | `openclaw plugins install <plugin> --marketplace <source>`     |

Les spécifications de package nues ont un comportement de compatibilité spécial. Si le nom nu correspond
à un identifiant de plugin intégré, OpenClaw utilise cette source intégrée. S'il correspond à un
identifiant de plugin externe officiel, OpenClaw utilise le catalogue de packages officiel. Les autres
spécifications de package nues ordinaires s'installent via npm pendant la phase de transition de lancement. Les spécifications de package brutes
`@openclaw/*` qui correspondent à des plugins intégrés résolvent également vers la
copie intégrée avant le repli vers npm. Utilisez `npm:@openclaw/<plugin>@<version>` lorsque
vous voulez explicitement le package externe npm au lieu de la copie
intégrée détenue par l'image. Utilisez `clawhub:`, `npm:`, `git:` ou `npm-pack:` lorsque vous avez besoin
d'une sélection déterministe de la source. Consultez [`openclaw plugins`](/fr/cli/plugins#install)
pour le contrat complet de la commande.

Pour les installations npm, les spécifications de package non épinglées et `@latest` choisissent le dernier package stable qui annonce une compatibilité avec cette version de OpenClaw. Si la dernière version actuelle de npm déclare une `openclaw.compat.pluginApi` plus récente ou un `openclaw.install.minHostVersion`, OpenClaw analyse les versions de package stables plus anciennes et installe la plus récente qui convient. Les versions exactes et les balises de canal explicites telles que `@beta` restent épinglées au package sélectionné et échouent en cas d'incompatibilité.

### Configurer la stratégie de plugin

La forme de configuration commune du plugin est :

```json5
{
  plugins: {
    enabled: true,
    allow: ["voice-call"],
    deny: ["untrusted-plugin"],
    load: { paths: ["~/Projects/oss/voice-call-plugin"] },
    slots: { memory: "memory-core" },
    entries: {
      "voice-call": { enabled: true, config: { provider: "twilio" } },
    },
  },
}
```

Règles de stratégie clés :

- `plugins.enabled: false` désactive tous les plugins et ignore le travail de découverte/chargement
  des plugins. Les références de plugin obsolètes sont inactives tant que cela est actif ; réactivez
  les plugins avant d'exécuter le nettoyage du docteur lorsque vous souhaitez que les identifiants obsolètes soient supprimés.
- `plugins.deny` prime sur l'autorisation et l'activation par plugin.
- `plugins.allow` est une liste d'autorisation exclusive. Les outils détenus par des plugins en dehors de
  la liste d'autorisation restent indisponibles, même lorsque `tools.allow` inclut `"*"`.
- `plugins.entries.<id>.enabled: false` désactive un plugin tout en préservant sa
  configuration.
- `plugins.load.paths` ajoute des fichiers ou répertoires de plugins locaux explicites.
- Les plugins d'origine de l'espace de travail sont désactivés par défaut ; activez-les explicitement ou ajoutez-les à une liste d'autorisation avant d'utiliser le code local de l'espace de travail.
- Les plugins groupés suivent leurs métadonnées intégrées par défaut activé/désactivé, sauf si la configuration les remplace explicitement.
- `plugins.slots.<slot>` choisit un plugin pour les catégories exclusives telles que les moteurs de mémoire et de contexte. La sélection par slot force l'activation du plugin sélectionné pour ce slot en comptant comme une activation explicite ; il peut être chargé même s'il devait autrement être sur option. `plugins.deny` et `plugins.entries.<id>.enabled: false` le bloquent toujours.
- Les plugins sur option groupés peuvent s'activer automatiquement lorsque la configuration nomme l'une de leurs surfaces détenues, telle qu'une référence provider/model, une configuration de channel, un backend CLI ou un runtime de harnais d'agent.
- Le routage de la famille Codex d'OpenAI maintient les frontières entre le fournisseur et le plugin d'exécution séparées : les références de modèle Codex héritées sont une configuration héritée réparée par le médecin, tandis que le plugin groupé `codex` possède le runtime du serveur d'application Codex pour les références d'agent canoniques `openai/*`, `agentRuntime.id: "codex"` explicites, et les références héritées `codex/*`.

Exécutez `openclaw doctor` ou `openclaw doctor --fix` lorsque la validation de la configuration signale des identifiants de plugin obsolètes, des inadéquations de liste d'autorisation/tool, ou des chemins de plugin groupés hérités.

## Comprendre les formats de plugins

OpenClaw reconnaît deux formats de plugins :

| Format                | Comment il se charge                                                                        | Utiliser quand                                                                                     |
| --------------------- | ------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Plugin natif OpenClaw | `openclaw.plugin.json` plus un module d'exécution chargé dans le processus                  | Vous installez ou créez des capacités d'exécution spécifiques à OpenClaw                           |
| Bundle compatible     | Mise en page de plugin Codex, Claude ou Cursor mappée dans l'inventaire de plugins OpenClaw | Vous réutilisez des compétences, des commandes, des hooks ou des métadonnées de bundle compatibles |

Les deux formats apparaissent dans `openclaw plugins list`, `openclaw plugins inspect`, `openclaw plugins enable`, et `openclaw plugins disable`. Consultez [Plugin bundles](/fr/plugins/bundles) pour la limite de compatibilité des bundles et [Building plugins](/fr/plugins/building-plugins) pour la création de plugins natifs.

## Hooks de plugin

Les plugins peuvent enregistrer des hooks lors de l'exécution, mais il existe deux API différentes avec
des fonctions différentes.

- Utilisez des hooks typés via `api.on(...)` pour les hooks du cycle de vie d'exécution. C'est l'interface préférée pour le middleware, les stratégies, la réécriture de messages, la mise en forme des invites, et le contrôle des outils.
- Utilisez `api.registerHook(...)` uniquement lorsque vous souhaitez participer au système de hooks interne décrit dans [Hooks](/fr/automation/hooks). Ceci est principalement pour les effets secondaires grossiers de commande/cycle de vie et la compatibilité avec l'automation de style HOOK existante.

Règle rapide :

- Si le gestionnaire a besoin d'une priorité, d'une sémantique de fusion, ou d'un comportement de blocage/annulation, utilisez
  les hooks de plugin typés.
- Si le gestionnaire réagit simplement à `command:new`, `command:reset`, `message:sent`, ou des événements grossiers similaires, `api.registerHook(...)` convient.

Les hooks internes gérés par des plugins apparaissent dans `openclaw hooks list` avec `plugin:<id>`. Vous ne pouvez pas les activer ou les désactiver via `openclaw hooks` ; activez ou désactivez plutôt le plugin.

## Vérifier le Gateway actif

`openclaw plugins list` et le `openclaw plugins inspect` simple lisent la configuration à froid, le manifeste et l'état du registre. Ils ne prouvent pas qu'un Gateway déjà en cours d'exécution a importé le même code de plugin.

Lorsqu'un plugin apparaît installé mais que le trafic de discussion en direct ne l'utilise pas :

```bash
openclaw gateway status --deep --require-rpc
openclaw plugins inspect <plugin-id> --runtime --json
openclaw gateway restart
```

Les gérés Gateway redémarrent automatiquement après l'installation, la mise à jour et la désinstallation de plugins qui modifient la source du plugin. Sur les installations VPS ou conteneur, assurez-vous que tout redémarrage manuel cible le processus enfant `openclaw gateway run` réel qui dessert vos channels, et non seulement un wrapper ou un superviseur.

## Dépannage

| Symptôme                                                                             | Vérifier                                                                                                                                                  | Correction                                                                                                                                 |
| ------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Le plugin apparaît dans `plugins list` mais les hooks d'exécution ne s'exécutent pas | Utilisez `openclaw plugins inspect <id> --runtime --json` et confirmez le Gateway actif avec `gateway status --deep --require-rpc`                        | Redémarrez le Gateway en direct après l'installation, la mise à jour, la configuration ou les modifications de la source                   |
| Les diagnostics de doublon de propriété de channel ou tool apparaissent              | Exécutez `openclaw plugins list --enabled --verbose`, inspectez chaque plugin suspect avec `--runtime --json` et comparez la propriété des channels/tools | Désactivez un propriétaire, supprimez les installations obsolètes, ou utilisez `preferOver` du manifeste pour un remplacement intentionnel |
| La configuration indique qu'un plugin est manquant                                   | Vérifiez l'[inventaire des plugins](/fr/plugins/plugin-inventory) pour savoir s'il est groupé, externe officiel ou source uniquement                      | Installez le package externe, activez le plugin groupé, ou supprimez la configuration obsolète                                             |
| La configuration est invalide pendant l'installation                                 | Lisez le message de validation et exécutez `openclaw doctor --fix` lorsqu'il indique un état obsolète du plugin                                           | Doctor peut mettre en quarantaine une configuration de plugin invalide en désactivant l'entrée et en supprimant la charge utile invalide   |
| Le chemin du plugin est bloqué pour une propriété ou des permissions suspectes       | Inspectez le diagnostic avant l'erreur de configuration                                                                                                   | Corrigez la propriété/les autorisations du système de fichiers, puis exécutez `openclaw plugins registry --refresh`                        |
| `OPENCLAW_NIX_MODE=1` bloque les commandes de cycle de vie                           | Confirmez que l'installation est gérée par Nix                                                                                                            | Modifiez la sélection de plugins dans la source Nix au lieu d'utiliser les commandes de modification de plugins                            |
| L'importation de dépendances échoue lors de l'exécution                              | Vérifiez si le plugin a été installé via npm/git/ClawHub ou chargé à partir d'un chemin local                                                             | Exécutez `openclaw plugins update <id>`, réinstallez la source, ou installez vous-même les dépendances locales du plugin                   |

Lorsque la configuration obsolète du plugin nomme toujours un plugin de channel qui n'est plus découvrible, le démarrage du Gateway ignore ce channel pris en charge par un plugin au lieu de bloquer tous les autres channels. Exécutez `openclaw doctor --fix` pour supprimer les entrées obsolètes du plugin et du channel. Les clés de channel inconnues sans preuve de plugin obsolète échouent toujours à la validation, de sorte que les fautes de frappe restent visibles.

Pour un remplacement intentionnel de channel, le plugin préféré doit déclarer `channelConfigs.<channel-id>.preferOver` avec l'ID du plugin hérité ou de priorité inférieure. Si les deux plugins sont explicitement activés, OpenClaw conserve cette demande et signale des diagnostics de channel ou tool en double au lieu de choisir silencieusement un seul propriétaire.

Si un paquet installé indique qu'il `requires compiled runtime output for TypeScript entry ...`, le paquet a été publié sans les fichiers JavaScript dont OpenClaw a besoin lors de l'exécution. Mettez à jour ou réinstallez une fois que l'éditeur a fourni le JavaScript compilé, ou désactivez/désinstallez le plugin jusqu'à ce moment.

### Propriété du chemin de plugin bloquée

Si les diagnostics du plugin indiquent
`blocked plugin candidate: suspicious ownership (... uid=1000, expected uid=0 or root)`
et que la validation de la configuration suit avec `plugin present but blocked`, OpenClaw a trouvé
les fichiers du plugin appartenant à un utilisateur Unix différent de celui du processus qui les
charge. Conservez la configuration du plugin en place ; corrigez la propriété du système de fichiers ou exécutez
OpenClaw en tant que le même utilisateur qui possède le répertoire d'état.

Pour les installations Docker, l'image officielle s'exécute en tant que `node` (uid `1000`), donc les
répertoires de configuration et d'espace de travail OpenClaw montés en liaison sur l'hôte doivent normalement être
détenus par l'uid `1000` :

```bash
sudo chown -R 1000:1000 /path/to/openclaw-config /path/to/openclaw-workspace
```

Si vous exécutez intentionnellement OpenClaw en tant que root, réparez plutôt la racine du plugin géré avec la propriété root :

```bash
sudo chown -R root:root /path/to/openclaw-config/npm
```

Après avoir corrigé la propriété, relancez `openclaw doctor --fix` ou
`openclaw plugins registry --refresh` pour que le registre persistant des plugins corresponde
aux fichiers réparés.

### Configuration lente de l'outil de plugin

Si les tours de l'agent semblent bloquer lors de la préparation des outils, activez la journalisation de trace et vérifiez les lignes de synchronisation de la fabrique d'outils du plugin :

```bash
openclaw config set logging.level trace
openclaw logs --follow
```

Recherchez :

```text
[trace:plugin-tools] factory timings ...
```

Le résumé répertorie le temps total de la fabrique et les fabriques d'outils de plugin les plus lentes, y compris l'identifiant du plugin, les noms d'outils déclarés, la forme du résultat et si l'outil est facultatif. Les lignes lentes sont promues en avertissements lorsqu'une seule fabrique prend au moins 1 s ou que la préparation totale de la fabrique d'outils du plugin prend au moins 5 s.

OpenClaw met en cache les résultats réussis des fabriques d'outils de plug-in pour les résolutions répétées avec le même contexte de demande effectif. La clé de cache comprend la configuration d'exécution effective, l'espace de travail, les identifiants d'agent/de session, la stratégie de bac à sable, les paramètres du navigateur, le contexte de livraison, l'identité du demandeur et l'état de propriété. Ainsi, les fabriques qui dépendent de ces champs approuvés sont réexécutées lorsque le contexte change. Si les timings restent élevés, le plug-in effectue peut-être un travail coûteux avant de renvoyer ses définitions d'outils.

Si un plug-in domine le temps d'exécution, inspectez ses enregistrements d'exécution :

```bash
openclaw plugins inspect <plugin-id> --runtime --json
```

Ensuite, mettez à jour, réinstallez ou désactivez ce plug-in. Les auteurs de plug-ins devraient déplacer le chargement coûteux des dépendances derrière le chemin d'exécution de l'outil au lieu de le faire à l'intérieur de la fabrique d'outils.

Pour les racines de dépendances, la validation des métadonnées de package, les enregistrements du registre, le comportement
rechargement au démarrage, et le nettoyage des versions héritées, voir
[Résolution des dépendances de plugins](/fr/plugins/dependency-resolution).

## Connexes

- [Gérer les plugins](/fr/plugins/manage-plugins) - exemples de commandes pour lister, installer, mettre à jour, désinstaller et publier
- [`openclaw plugins`](/fr/cli/plugins) - référence complète de la CLI
- [Inventaire des plugins](/fr/plugins/plugin-inventory) - liste générée des plugins intégrés et externes
- [Référence des plugins](/fr/plugins/reference) - pages de référence générées par plugin
- [Plugins communautaires](/fr/plugins/community) - découverte ClawHub et politique de PR de documentation
- [Résolution des dépendances de plugins](/fr/plugins/dependency-resolution) - racines d'installation, enregistrements de registre et limites d'exécution
- [Créer des plugins](/fr/plugins/building-plugins) - guide de création de plugins natifs
- [Aperçu du SDK de plugin](/fr/plugins/sdk-overview) - enregistrement d'exécution, hooks et champs de API
- [Manifeste de plugin](/fr/plugins/manifest) - manifeste et métadonnées de package
