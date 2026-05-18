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
que le runtime l'a chargé et résoudre les échecs de configuration courants. Pour des exemples
uniquement en ligne de commande, consultez [Gérer les plugins](Gateway/en/plugins/manage-plugins). Pour l'inventaire complet
généré des plugins groupés, externes officiels et source uniquement, consultez
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
  <Step title="Trouver le plugin"ClawHub>
    Recherchez des packages de plugins publics sur [ClawHub](/fr/clawhub) :

    ```bash
    openclaw plugins search "calendar"
    ```ClawHubnpm

    ClawHub est la surface de découverte principale pour les plugins communautaires. Pendant la
    période de lancement, les spécifications de package nues ordinaires s'installent toujours depuis npm. Utilisez un
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

  <Step title="Configurer et l'activer">
    Configurez les paramètres spécifiques au plugin sous `plugins.entries.<id>.config`.
    Activez le plugin s'il n'est pas déjà activé :

    ```bash
    openclaw plugins enable <plugin-id>
    ```

    Si votre configuration utilise une liste restrictive `plugins.allow`, l'identifiant du plugin
    installé doit y être présent avant que le plugin puisse être chargé.
    `openclaw plugins install` ajoute l'identifiant installé à une liste
    `plugins.allow` existante et supprime le même identifiant de `plugins.deny` afin que
    l'installation explicite puisse être chargée après redémarrage.

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

    Utilisez `--runtime` lorsque vous devez prouver les outils, hooks, services,
    méthodes du Gateway ou commandes CLI enregistrés et appartenant à un plugin. `inspect` simple est une vérification
    de manifeste et de registre à froid.

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

Les spécifications de package nues (bare package specs) ont un comportement de compatibilité spécial. Si le nom nu correspond à un identifiant de plugin groupé, OpenClaw utilise cette source groupée. S'il correspond à un identifiant de plugin externe officiel, OpenClaw utilise le catalogue de packages officiel. Les autres spécifications de package nues ordinaires sont installées via npm lors du basculement de lancement. Utilisez OpenClawOpenClawnpm`clawhub:`, `npm:`, `git:` ou `npm-pack:` lorsque vous avez besoin d'une sélection de source déterministe. Voir [`openclaw plugins`](/fr/cli/plugins#install) pour le contrat de commande complet.

### Configurer la stratégie de plugin

La forme de configuration de plugin courante est :

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

Règles clés de la stratégie :

- `plugins.enabled: false` désactive tous les plugins et ignore le travail de découverte/chargement
  des plugins. Les références de plugins obsolètes sont inertes tant que cela est actif ; réactivez
  les plugins avant d'exécuter le nettoyage du docteur lorsque vous souhaitez que les identifiants obsolètes soient supprimés.
- `plugins.deny` prime sur l'autorisation et l'activation par plugin.
- `plugins.allow` est une liste d'autorisation exclusive. Les outils détenus par des plugins en dehors de
  la liste d'autorisation restent indisponibles, même lorsque `tools.allow` inclut `"*"`.
- `plugins.entries.<id>.enabled: false` désactive un plugin tout en préservant sa
  configuration.
- `plugins.load.paths` ajoute des fichiers ou répertoires de plugins locaux explicites.
- Les plugins d'origine Workspace sont désactivés par défaut ; activez-les explicitement ou
  mettez-les sur la liste d'autorisation avant d'utiliser le code de l'espace de travail local.
- Les plugins groupés suivent leurs métadonnées intégrées par défaut activé/désactivé, à moins que
  la configuration ne les remplace explicitement.
- `plugins.slots.<slot>` choisit un plugin pour les catégories exclusives telles que
  les moteurs de mémoire et de contexte. La sélection d'emplacement force l'activation du plugin sélectionné
  pour cet emplacement en comptant comme une activation explicite ; il peut se charger même s'il
  devait autrement être optionnel. `plugins.deny` et
  `plugins.entries.<id>.enabled: false` le bloquent toujours.
- Les plugins groupés opt-in peuvent s'activer automatiquement lorsque la configuration nomme l'une de leurs surfaces détenues, telles qu'une référence fournisseur/modèle, une configuration de canal, un backend CLI, ou un runtime de harnais d'agent.
- Le routage Codex de la famille OpenAI garde les frontières entre le fournisseur et le plugin d'exécution séparées : `openai-codex/*` est une configuration de fournisseur OpenAI héritée, tandis que le plugin groupé `codex` possède le runtime du serveur d'application Codex pour les références d'agent `openai/*` canoniques, `agentRuntime.id: "codex"` explicites, et les références `codex/*` héritées.

Exécutez `openclaw doctor` ou `openclaw doctor --fix` lorsque la validation de la configuration signale des IDs de plugin périmés, des inadéquations de liste d'autorisation/tool, ou des chemins de plugin groupés hérités.

## Comprendre les formats de plugin

OpenClaw reconnaît deux formats de plugin :

| Format                | Comment il se charge                                                                        | À utiliser quand                                                                                   |
| --------------------- | ------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Plugin natif OpenClaw | `openclaw.plugin.json` plus un module d'exécution chargé dans le processus                  | Vous installez ou construisez des capacités d'exécution spécifiques à OpenClaw                     |
| Bundle compatible     | Mise en page de plugin Codex, Claude ou Cursor mappée dans l'inventaire de plugins OpenClaw | Vous réutilisez des compétences, des commandes, des hooks ou des métadonnées de bundle compatibles |

Les deux formats apparaissent dans `openclaw plugins list`, `openclaw plugins inspect`, `openclaw plugins enable` et `openclaw plugins disable`. Voir [Plugin bundles](/fr/plugins/bundles) pour la limite de compatibilité des bundles et [Building plugins](/fr/plugins/building-plugins) pour la création de plugins natifs.

## Vérifier le Gateway actif

`openclaw plugins list` et `openclaw plugins inspect` simples lisent la configuration à froid, le manifeste et l'état du registre. Ils ne prouvent pas qu'un Gateway déjà en cours d'exécution a importé le même code de plugin.

Lorsqu'un plugin semble installé mais que le trafic de discussion en direct ne l'utilise pas :

```bash
openclaw gateway status --deep --require-rpc
openclaw plugins inspect <plugin-id> --runtime --json
openclaw gateway restart
```

Les Gateways gérés redémarrent automatiquement après les modifications d'installation, de mise à jour et de désinstallation de plugins qui modifient la source du plugin. Sur les installations VPS ou en conteneur, assurez-vous que tout redémarrage manuel cible le processus enfant `openclaw gateway run` réel qui sert vos canaux, et non seulement un wrapper ou un superviseur.

## Dépannage

| Symptôme                                                                                                | Vérification                                                                                                                                             | Solution                                                                                                                                       |
| ------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Le plugin apparaît dans `plugins list` mais les crochets d'exécution (runtime hooks) ne s'exécutent pas | Utilisez `openclaw plugins inspect <id> --runtime --json` et confirmez le Gateway actif avec Gateway `gateway status --deep --require-rpc`               | Redémarrez le Gateway actif Gateway après l'installation, la mise à jour, la configuration ou les modifications de la source                   |
| Des diagnostics de propriété de canal ou d'outil en double apparaissent                                 | Exécutez `openclaw plugins list --enabled --verbose`, inspectez chaque plugin suspect avec `--runtime --json` et comparez la propriété des canaux/outils | Désactivez un propriétaire, supprimez les installations obsolètes ou utilisez `preferOver` dans le manifeste pour un remplacement intentionnel |
| La configuration indique qu'un plugin est manquant                                                      | Consultez [Inventaire des plugins](/fr/plugins/plugin-inventory) pour savoir s'il est groupé, externe officiel ou source unique                          | Installez le package externe, activez le plugin groupé ou supprimez la configuration obsolète                                                  |
| La configuration n'est pas valide lors de l'installation                                                | Lisez le message de validation et exécutez `openclaw doctor --fix` lorsqu'il pointe vers un état de plugin obsolète                                      | Le médecin peut mettre en quarantaine la configuration de plugin invalide en désactivant l'entrée et en supprimant la charge utile invalide    |
| Le chemin du plugin est bloqué en raison d'une propriété ou d'autorisations suspectes                   | Inspectez le diagnostic avant l'erreur de configuration                                                                                                  | Corrigez la propriété/les autorisations du système de fichiers, puis exécutez `openclaw plugins registry --refresh`                            |
| `OPENCLAW_NIX_MODE=1` bloque les commandes de cycle de vie                                              | Confirmez que l'installation est gérée par Nix                                                                                                           | Modifiez la sélection de plugins dans la source Nix au lieu d'utiliser les commandes de modification de plugin                                 |
| L'importation de la dépendance échoue lors de l'exécution                                               | Vérifiez si le plugin a été installé via npm/git/ClawHub ou chargé à partir d'un chemin local                                                            | Exécutez `openclaw plugins update <id>`, réinstallez la source ou installez vous-même les dépendances du plugin local                          |

Lorsque la configuration obsolète d'un plugin nomme toujours un plugin de canal qui n'est plus découvrable, le démarrage du Gateway ignore ce canal pris en charge par le plugin au lieu de bloquer tous les autres canaux. Exécutez `openclaw doctor --fix` pour supprimer les entrées obsolètes de plugins et de canaux. Les clés de canal inconnues sans preuve de plugin obsolète échouent toujours à la validation afin que les fautes de frappe restent visibles.

Pour un remplacement intentionnel de canal, le plugin préféré doit déclarer `channelConfigs.<channel-id>.preferOver` avec l'identifiant du plugin hérité ou de priorité inférieure. Si les deux plugins sont explicitement activés, OpenClaw conserve cette demande et signale des diagnostics de canal ou d'outil en double au lieu de choisir silencieusement un seul propriétaire.

Si un paquet installé indique qu'il `requires compiled runtime output for TypeScript entry ...`, le paquet a été publié sans les fichiers JavaScript dont OpenClaw a besoin lors de l'exécution. Mettez à jour ou réinstallez une fois que l'éditeur a fourni le JavaScript compilé, ou désinstallez/désactivez le plugin d'ici là.

### Propriétaire du chemin de plugin bloqué

Si les diagnostics du plugin indiquent `blocked plugin candidate: suspicious ownership (... uid=1000, expected uid=0 or root)` et que la validation de la configuration continue avec `plugin present but blocked`, OpenClaw a trouvé des fichiers de plugin appartenant à un utilisateur Unix différent du processus qui les charge. Conservez la configuration du plugin en place ; corrigez la propriété du système de fichiers ou exécutez OpenClaw en tant que même utilisateur que celui qui possède le répertoire d'état.

Pour les installations Docker, l'image officielle s'exécute en tant que `node` (uid `1000`), donc les répertoires de configuration et d'espace de travail OpenClaw montés en liaison sur l'hôte doivent normalement appartenir à l'uid `1000` :

```bash
sudo chown -R 1000:1000 /path/to/openclaw-config /path/to/openclaw-workspace
```

Si vous exécutez intentionnellement OpenClaw en tant que root, réparez plutôt la racine du plugin géré pour qu'elle appartienne à root :

```bash
sudo chown -R root:root /path/to/openclaw-config/npm
```

Après avoir corrigé la propriété, réexécutez `openclaw doctor --fix` ou `openclaw plugins registry --refresh` pour que le registre des plugins persistants corresponde aux fichiers réparés.

### Configuration lente des outils de plugin

Si les tours de l'agent semblent bloquer lors de la préparation des outils, activez le journal de trace et vérifiez les lignes de synchronisation de la fabrique d'outils du plugin :

```bash
openclaw config set logging.level trace
openclaw logs --follow
```

Recherchez :

```text
[trace:plugin-tools] factory timings ...
```

Le résumé liste le temps total d'usine et les usines d'outils de plugin les plus lentes, y compris l'identifiant du plugin, les noms d'outils déclarés, la forme du résultat et si l'outil est optionnel. Les lignes lentes sont promues en avertissements lorsqu'une seule usine prend au moins 1 s ou que la préparation totale de l'usine d'outils du plugin prend au moins 5 s.

OpenClaw met en cache les résultats réussis de l'usine d'outils de plugin pour des résolutions répétées avec le même contexte de demande effectif. La clé de cache inclut la configuration d'exécution effective, l'espace de travail, les identifiants d'agent/session, la stratégie de bac à sable, les paramètres du navigateur, le contexte de livraison, l'identité du demandeur et l'état de propriété, de sorte que les usines qui dépendent de ces champs de confiance sont réexécutées lorsque le contexte change. Si les durées restent élevées, le plugin peut effectuer un travail coûteux avant de renvoyer ses définitions d'outils.

Si un plugin domine le timing, inspectez ses enregistrements d'exécution :

```bash
openclaw plugins inspect <plugin-id> --runtime --json
```

Ensuite, mettez à jour, réinstallez ou désactivez ce plugin. Les auteurs de plugins devraient déplacer le chargement des dépendances coûteuses derrière le chemin d'exécution de l'outil au lieu de le faire à l'intérieur de l'usine d'outils.

Pour les racines de dépendances, la validation des métadonnées de package, les enregistrements de registre, le comportement de rechargement au démarrage et le nettoyage de l'héritage, consultez
[Résolution des dépendances de plugin](/fr/plugins/dependency-resolution).

## Connexes

- [Gérer les plugins](/fr/plugins/manage-plugins) - exemples de commandes pour lister, installer, mettre à jour, désinstaller et publier
- [`openclaw plugins`](/fr/cli/plugins) - référence complète de la CLI
- [Inventaire des plugins](/fr/plugins/plugin-inventory) - liste générée des plugins groupés et externes
- [Référence de plugin](/fr/plugins/reference) - pages de référence générées par plugin
- [Plugins communautaires](/fr/plugins/community) - découverte ClawHub et stratégie de PR de documentation
- [Résolution des dépendances de plugin](/fr/plugins/dependency-resolution) - racines d'installation, enregistrements de registre et limites d'exécution
- [Création de plugins](/fr/plugins/building-plugins) - guide de création de plugins natifs
- [Aperçu du SDK de plugin](/fr/plugins/sdk-overview) - enregistrement d'exécution, hooks et champs API
- [Manifeste de plugin](/fr/plugins/manifest) - manifeste et métadonnées de package
