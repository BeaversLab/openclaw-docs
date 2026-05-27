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
de commandes uniquement, consultez [Gérer les plugins](/fr/plugins/manage-plugins). Pour l'inventaire complet généré
des plugins groupés, externes officiels et source uniquement, consultez
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

    ClawHub est la surface de découverte principale pour les plugins communautaires. Durant la
    période de transition de lancement, les spécifications de package nues classiques s'installent toujours depuis npm. Utilisez un
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

Les spécifications de package nues ont un comportement de compatibilité spécial. Si le nom nu correspond
à un identifiant de plugin groupé, OpenClaw utilise cette source groupée. S'il correspond à
un identifiant de plugin externe officiel, OpenClaw utilise le catalogue de packages officiel. Les autres
spécifications de package nues classiques s'installent via npm durant la transition de lancement. Utilisez
`clawhub:`, `npm:`, `git:` ou `npm-pack:` lorsque vous avez besoin d'une sélection de source
déterministe. Consultez [`openclaw plugins`](/fr/cli/plugins#install) pour le contrat complet de
commande.

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

Les deux formats apparaissent dans `openclaw plugins list`, `openclaw plugins inspect`,
`openclaw plugins enable` et `openclaw plugins disable`. Consultez
[Plugin bundles](/fr/plugins/bundles) pour la limite de compatibilité des bundles et
[Building plugins](/fr/plugins/building-plugins) pour la création de plugins natifs.

## Points d'ancrage de plugin

Les plugins peuvent enregistrer des points d'ancrage (hooks) au runtime, mais il existe deux API différentes avec
des rôles différents.

- Utilisez des points d'ancrage typés via `api.on(...)` pour les hooks de cycle de vie du runtime. C'est la
  surface préférée pour le middleware, les stratégies, la réécriture de messages, la mise en forme des invites,
  et le contrôle des outils (tools).
- Utilisez `api.registerHook(...)` uniquement lorsque vous souhaitez participer au système de hook interne décrit dans [Hooks](/fr/automation/hooks). Ceci est principalement pour les effets secondaires grossiers de commande/cycle de vie et la compatibilité avec l'automatisation de style HOOK existant.

Règle rapide :

- Si le gestionnaire a besoin de priorité, de sémantique de fusion, ou d'un comportement de blocage/annulation, utilisez les hooks de plugin typés.
- Si le gestionnaire réagit simplement à `command:new`, `command:reset`, `message:sent`, ou des événements grossiers similaires, `api.registerHook(...)` convient.

Les hooks internes gérés par le plugin apparaissent dans `openclaw hooks list` avec `plugin:<id>`. Vous ne pouvez pas les activer ou les désactiver via `openclaw hooks` ; activez ou désactivez plutôt le plugin.

## Vérifier la passerelle active

`openclaw plugins list` et le `openclaw plugins inspect`Gateway simple lisent la configuration à froid, le manifeste et l'état du registre. Ils ne prouvent pas qu'une passerelle déjà en cours d'exécution a importé le même code de plugin.

Lorsqu'un plugin semble installé mais que le trafic de chat en direct ne l'utilise pas :

```bash
openclaw gateway status --deep --require-rpc
openclaw plugins inspect <plugin-id> --runtime --json
openclaw gateway restart
```

Les passerelles gérées redémarrent automatiquement après les modifications d'installation, de mise à jour et de désinstallation de plugins qui altèrent la source du plugin. Sur les installations VPS ou conteneur, assurez-vous que tout redémarrage manuel cible l'enfant `openclaw gateway run` réel qui sert vos channels, et pas seulement un encapsuleur ou un superviseur.

## Dépannage

| Symptôme                                                                             | Vérifier                                                                                                                                                | Correctif                                                                                                                                  |
| ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Le plugin apparaît dans `plugins list` mais les hooks d'exécution ne s'exécutent pas | Utilisez `openclaw plugins inspect <id> --runtime --json`Gateway et confirmez la passerelle active avec `gateway status --deep --require-rpc`           | Redémarrez la passerelle en direct après l'installation, la mise à jour, la configuration ou les modifications de source                   |
| Des diagnostics de duplication de propriété de channel ou tool apparaissent          | Exécutez `openclaw plugins list --enabled --verbose`, inspectez chaque plugin suspect avec `--runtime --json`, et comparez la propriété du channel/tool | Désactivez un propriétaire, supprimez les installations obsolètes, ou utilisez `preferOver` du manifeste pour un remplacement intentionnel |
| La configuration indique qu'un plugin est manquant                                   | Consultez [Plugin inventory](/fr/plugins/plugin-inventory) pour savoir s'il est groupé, externe officiel, ou source uniquement                          | Installez le package externe, activez le plugin intégré ou supprimez la configuration obsolète                                             |
| La configuration n'est pas valide lors de l'installation                             | Lisez le message de validation et exécutez `openclaw doctor --fix` lorsqu'il pointe vers un état de plugin obsolète                                     | Doctor peut mettre en quarantaine la configuration de plugin invalide en désactivant l'entrée et en supprimant la charge utile invalide    |
| Le chemin du plugin est bloqué pour une propriété ou des autorisations suspectes     | Inspectez le diagnostic avant l'erreur de configuration                                                                                                 | Corrigez la propriété/les autorisations du système de fichiers, puis exécutez `openclaw plugins registry --refresh`                        |
| `OPENCLAW_NIX_MODE=1` bloque les commandes de cycle de vie                           | Confirmez que l'installation est gérée par Nix                                                                                                          | Modifiez la sélection des plugins dans la source Nix au lieu d'utiliser les commandes de modification de plugins                           |
| L'importation de la dépendance échoue lors de l'exécution                            | Vérifiez si le plugin a été installé via npm/git/ClawHub ou chargé depuis un chemin local                                                               | Exécutez `openclaw plugins update <id>`, réinstallez la source ou installez vous-même les dépendances locales du plugin                    |

Lorsque la configuration obsolète du plugin nomme encore un plugin de canal non découvrable,
le démarrage du Gateway ignore ce canal pris en charge par le plugin au lieu de bloquer chaque
autre canal. Exécutez `openclaw doctor --fix` pour supprimer les entrées obsolètes de plugin et de canal.
Les clés de canal inconnues sans preuve de plugin obsolète échouent toujours la
validation, les fautes de frappe restant donc visibles.

Pour un remplacement intentionnel de canal, le plugin préféré doit déclarer
`channelConfigs.<channel-id>.preferOver` avec l'identifiant du plugin hérité ou de priorité inférieure.
Si les deux plugins sont explicitement activés, OpenClaw conserve cette demande
et signale des diagnostics de canal ou d'outil en double au lieu de choisir en silence
un seul propriétaire.

Si un package installé signale qu'il `requires compiled runtime output for
TypeScript entry ...`, le package a été publié sans les fichiers JavaScript
nécessaires à OpenClaw lors de l'exécution. Mettez à jour ou réinstallez une fois que l'éditeur fournit
le JavaScript compilé, ou désinstallez/désactivez le plugin d'ici là.

### Propriété du chemin de plugin bloqué

Si les diagnostics du plugin indiquent
`blocked plugin candidate: suspicious ownership (... uid=1000, expected uid=0 or root)`
et que la validation de la configuration est suivie de `plugin present but blocked`OpenClawOpenClaw, OpenClaw a trouvé
des fichiers de plugin appartenant à un utilisateur Unix différent de celui du processus qui les charge. Conservez la configuration du plugin en place ; corrigez la propriété du système de fichiers ou exécutez
OpenClaw avec le même utilisateur que celui qui possède le répertoire d'état.

Pour les installations Docker, l'image officielle s'exécute en tant que Docker`node` (uid `1000`OpenClaw), donc les
répertoires de configuration et d'espace de travail OpenClaw montés en liaison sur l'hôte doivent normalement être
propriétés de l'uid `1000` :

```bash
sudo chown -R 1000:1000 /path/to/openclaw-config /path/to/openclaw-workspace
```

Si vous exécutez intentionnellement OpenClaw en tant que root, réparez plutôt la racine du plugin géré en
la définissant comme propriété de root :

```bash
sudo chown -R root:root /path/to/openclaw-config/npm
```

Après avoir corrigé la propriété, relancez `openclaw doctor --fix` ou
`openclaw plugins registry --refresh` pour que le registre persistant des plugins corresponde
aux fichiers corrigés.

### Configuration lente des outils de plugin

Si les tours de l'agent semblent bloqués lors de la préparation des outils, activez le journal de trace et
vérifiez les lignes de chronométrage de l'usine d'outils du plugin :

```bash
openclaw config set logging.level trace
openclaw logs --follow
```

Recherchez :

```text
[trace:plugin-tools] factory timings ...
```

Le résumé indique le temps total d'usine et les usines d'outils de plugin les plus lentes,
y compris l'identifiant du plugin, les noms des outils déclarés, la forme du résultat et si l'outil est
optionnel. Les lignes lentes sont promues en avertissements lorsqu'une seule usine prend au
moins 1 s ou que la préparation totale de l'usine d'outils du plugin prend au moins 5 s.

OpenClaw met en cache les résultats réussis de l'usine d'outils de plugin pour les résolutions répétées
avec le même contexte de requête effectif. La clé de cache inclut la configuration
effective du runtime, l'espace de travail, les identifiants agent/session, la stratégie de bac à sable, les paramètres du navigateur,
le contexte de livraison, l'identité du demandeur et l'état de propriété, de sorte que les usines qui
dépendent de ces champs de confiance sont réexécutées lorsque le contexte change. Si les durées
restent élevées, le plugin effectue peut-être un travail coûteux avant de renvoyer ses définitions d'outils.

Si un plugin domine le temps, inspectez ses enregistrements d'exécution :

```bash
openclaw plugins inspect <plugin-id> --runtime --json
```

Ensuite, mettez à jour, réinstallez ou désactivez ce plugin. Les auteurs de plugins devraient déplacer
le chargement des dépendances coûteuses derrière le chemin d'exécution de l'outil au lieu de le faire
à l'intérieur de l'usine d'outils.

Pour les racines de dépendances, la validation des métadonnées de package, les enregistrements de registre, le comportement de rechargement au démarrage et le nettoyage des versions obsolètes, consultez la section [Résolution des dépendances des plugins](/fr/plugins/dependency-resolution).

## Connexes

- [Gérer les plugins](/fr/plugins/manage-plugins) - exemples de commandes pour lister, installer, mettre à jour, désinstaller et publier
- [`openclaw plugins`](/fr/cli/plugins) - référence complète de la CLI
- [Inventaire des plugins](/fr/plugins/plugin-inventory) - liste générée des plugins intégrés et externes
- [Référence des plugins](/fr/plugins/reference) - pages de référence générées pour chaque plugin
- [Plugins communautaires](/fr/plugins/community) - découverte sur ClawHub et politique de PR pour la documentation
- [Résolution des dépendances des plugins](/fr/plugins/dependency-resolution) - racines d'installation, enregistrements de registre et limites d'exécution
- [Créer des plugins](/fr/plugins/building-plugins) - guide de création de plugins natifs
- [Présentation du SDK de plugin](/fr/plugins/sdk-overview) - enregistrement d'exécution, hooks et champs de l'API
- [Manifeste de plugin](/fr/plugins/manifest) - manifeste et métadonnées de package
