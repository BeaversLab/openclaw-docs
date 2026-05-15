---
summary: "OpenClawConfigurez Codex Computer Use pour les agents OpenClaw en mode Codex"
title: "Codex Computer Use"
read_when:
  - You want Codex-mode OpenClaw agents to use Codex Computer Use
  - You are deciding between Codex Computer Use, PeekabooBridge, and direct cua-driver MCP
  - You are deciding between Codex Computer Use and a direct cua-driver MCP setup
  - You are configuring computerUse for the bundled Codex plugin
  - You are troubleshooting /codex computer-use status or install
---

Computer Use est un plugin MCP natif de Codex pour le contrôle du bureau local. OpenClaw
ne fournit pas l'application de bureau, n'exécute pas d'actions de bureau lui-même et ne contourne pas
les autorisations de Codex. Le plugin inclus OpenClaw`codex` prépare uniquement le serveur d'application Codex :
il active la prise en charge des plugins Codex, trouve ou installe le plugin configuré Codex
Computer Use, vérifie que le serveur MCP `computer-use` est disponible, et
permet ensuite à Codex de posséder les appels d'outils MCP natifs lors des tours en mode Codex.

Utilisez cette page lorsqu'OpenClaw utilise déjà le harnais natif Codex. Pour la
configuration de l'exécution elle-même, voir [Codex harness](OpenClaw/en/plugins/codex-harness).

## OpenClaw.app et Peekaboo

L'intégration Peekaboo d'OpenClaw.app est distincte de Codex Computer Use. L'application
macOS peut héberger un socket PeekabooBridge afin que la CLI OpenClawPeekaboomacOS`peekaboo`CLIPeekaboo puisse réutiliser les
autorisations locales d'accessibilité et d'enregistrement d'écran de l'application pour les propres
outils d'automatisation de Peekaboo. Ce pont n'installe ni ne mandate Codex Computer Use, et
Codex Computer Use n'appelle pas via le socket PeekabooBridge.

Utilisez [Peekaboo bridge](Peekaboo/en/platforms/mac/peekabooOpenClawPeekabooCLIOpenClaw) lorsque vous souhaitez qu'OpenClaw.app soit
un hôte sensible aux autorisations pour l'automatisation CLI Peekaboo. Utilisez cette page lorsqu'un
agent OpenClaw en mode Codex doit disposer du plugin MCP `computer-use` natif de Codex
disponible avant le début du tour.

## Application iOS

L'application iOS est distincte de Codex Computer Use. Elle n'installe pas ni ne met en proxy le serveur MCP `computer-use` de Codex et ce n'est pas un backend de contrôle de bureau. Au lieu de cela, l'application iOS se connecte en tant que nœud OpenClaw et expose des capacités mobiles via des commandes de nœud telles que `canvas.*`, `camera.*`, `screen.*`, `location.*` et `talk.*`.

Utilisez [iOS](/fr/platforms/ios) lorsque vous souhaitez qu'un agent pilote un nœud iPhone via la passerelle. Utilisez cette page lorsqu'un agent en mode Codex doit contrôler le bureau macOS local via le plugin natif Computer Use de Codex.

## MCP cua-driver direct

Codex Computer Use n'est pas le seul moyen d'exposer le contrôle du bureau. Si vous souhaitez que les runtimes gérés par OpenClaw appellent directement le pilote de TryCua, utilisez le serveur `cua-driver mcp` en amont via le registre MCP de OpenClaw au lieu du flux spécifique à la marketplace Codex.

Après avoir installé `cua-driver`, demandez-lui la commande OpenClaw :

```bash
cua-driver mcp-config --client openclaw
```

ou enregistrez le serveur stdio vous-même :

```bash
openclaw mcp set cua-driver '{"command":"cua-driver","args":["mcp"]}'
```

Ce chemin maintient la surface de l'outil MCP en amont intacte, y compris les schémas du pilote et les réponses MCP structurées. Utilisez-le lorsque vous souhaitez que le pilote CUA soit disponible en tant que serveur MCP OpenClaw normal. Utilisez la configuration Codex Computer Use sur cette page lorsque le serveur d'application Codex doit posséder l'installation du plugin, les rechargements MCP et les appels d'outils natifs au sein des tours en mode Codex.

Le pilote de CUA est spécifique à macOS et nécessite toujours les autorisations macOS locales que son application demande, telles que l'accessibilité et l'enregistrement d'écran. OpenClaw n'installe pas `cua-driver`, n'accorde pas ces autorisations et ne contourne pas le modèle de sécurité du pilote en amont.

## Configuration rapide

Définissez `plugins.entries.codex.config.computerUse` lorsque les tours en mode Codex doivent avoir Computer Use disponible avant qu'un fil ne commence :

```json5
{
  plugins: {
    entries: {
      codex: {
        enabled: true,
        config: {
          computerUse: {
            autoInstall: true,
          },
        },
      },
    },
  },
  agents: {
    defaults: {
      model: "openai/gpt-5.5",
    },
  },
}
```

Avec cette configuration, OpenClaw vérifie le serveur d'application Codex avant chaque tour de mode Codex.
Si Computer Use est manquant mais que le serveur d'application Codex a déjà découvert une
place de marché installable, OpenClaw demande au serveur d'application Codex d'installer ou de réactiver
le plugin et de recharger les serveurs MCP. Sur macOS, lorsqu'aucune place de marché correspondante n'est
enregistrée et que le bundle d'application Codex standard existe, OpenClaw essaie également
d'enregistrer la place de marché Codex groupée à partir de
`/Applications/Codex.app/Contents/Resources/plugins/openai-bundled` avant
d'échouer. Si la configuration ne parvient toujours pas à rendre le serveur MCP disponible, le tour échoue
avant le début du fil de discussion.

Après avoir modifié la configuration de Computer Use, utilisez `/new` ou `/reset` dans le chat concerné
avant de tester si un fil de discussion Codex existant a déjà commencé.

## Commandes

Utilisez les commandes `/codex computer-use` à partir de n'importe quelle interface de chat où l'interface de commande
`codex` est disponible. Il s'agit de commandes de chat/exécution OpenClaw,
non de sous-commandes CLI `openclaw codex ...` :

```text
/codex computer-use status
/codex computer-use install
/codex computer-use install --source <marketplace-source>
/codex computer-use install --marketplace-path <path>
/codex computer-use install --marketplace <name>
```

`status` est en lecture seule. Il n'ajoute pas de sources de place de marché, n'installe pas de plugins ou
n'active pas la prise en charge des plugins Codex.

`install` active la prise en charge des plugins du serveur d'application Codex, ajoute éventuellement une source de
place de marché configurée, installe ou réactive le plugin configuré via le serveur d'application
Codex, recharge les serveurs MCP et vérifie que le serveur MCP expose des outils.

## Choix de la place de marché

OpenClaw utilise la même API de serveur d'application que Codex lui-même expose. Les
champs de la place de marché choisissent l'endroit où Codex doit trouver `computer-use`.

| Champ                          | À utiliser quand                                                                                | Support d'installation                                                      |
| ------------------------------ | ----------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Aucun champ de place de marché | Vous voulez que le serveur d'application Codex utilise les places de marché qu'il connaît déjà. | Oui, lorsque le serveur d'application renvoie une place de marché locale.   |
| `marketplaceSource`            | Vous disposez d'une source de place de marché Codex que le serveur d'application peut ajouter.  | Oui, pour `/codex computer-use install` explicite.                          |
| `marketplacePath`              | Vous connaissez déjà le chemin du fichier local de la place de marché sur l'hôte.               | Oui, pour l'installation explicite et l'auto-installation au début du tour. |
| `marketplaceName`              | Vous souhaitez sélectionner une marketplace déjà enregistrée par son nom.                       | Oui uniquement si la marketplace sélectionnée dispose d'un chemin local.    |

Les récents domiciles Codex peuvent avoir besoin d'un court instant pour amorcer leurs marketplaces officielles.
Lors de l'installation, OpenClaw interroge `plugin/list` pendant
`marketplaceDiscoveryTimeoutMs` millisecondes au maximum. La valeur par défaut est de 60 secondes.

Si plusieurs marketplaces connues contiennent Computer Use, OpenClaw préfère
`openai-bundled`, puis `openai-curated`, puis `local`. Les correspondances ambiguës inconnues
échouent en mode fermé et vous demandent de définir `marketplaceName` ou `marketplacePath`.

## Marketplace macOS groupée

Les versions récentes du bureau Codex incluent Computer Use ici :

```text
/Applications/Codex.app/Contents/Resources/plugins/openai-bundled/plugins/computer-use
```

Lorsque `computerUse.autoInstall` est vrai et qu'aucune marketplace contenant
`computer-use` n'est enregistrée, OpenClaw tente d'ajouter automatiquement la racine standard de la
marketplace groupée :

```text
/Applications/Codex.app/Contents/Resources/plugins/openai-bundled
```

Vous pouvez également l'enregistrer explicitement depuis un shell avec Codex :

```bash
codex plugin marketplace add /Applications/Codex.app/Contents/Resources/plugins/openai-bundled
```

Si vous utilisez un chemin d'application Codex non standard, définissez `computerUse.marketplacePath` sur un
chemin de fichier local vers la marketplace ou exécutez `/codex computer-use install --source
<marketplace-source>` une fois.

## Limite du catalogue distant

Le serveur d'application Codex peut lister et lire des entrées de catalogue uniquement distantes, mais il ne prend pas
actuellement en charge les `plugin/install` distantes. Cela signifie que `marketplaceName` peut
sélectionner une marketplace uniquement distante pour les vérifications de statut, mais les installations et les réactivations
nécessitent toujours une marketplace locale via `marketplaceSource` ou `marketplacePath`.

Si le statut indique que le plugin est disponible dans une marketplace Codex distante mais que l'installation
distance n'est pas prise en charge, exécutez l'installation avec une source ou un chemin local :

```text
/codex computer-use install --source <marketplace-source>
/codex computer-use install --marketplace-path <path>
```

## Référence de configuration

| Champ                           | Par défaut     | Signification                                                                                              |
| ------------------------------- | -------------- | ---------------------------------------------------------------------------------------------------------- |
| `enabled`                       | déduit         | Exiger Computer Use. Vrai par défaut lorsqu'un autre champ Computer Use est défini.                        |
| `autoInstall`                   | faux           | Installer ou réactiver à partir des marketplaces déjà découvertes au début du tour.                        |
| `marketplaceDiscoveryTimeoutMs` | 60000          | Durée d'attente de l'installation pour la découverte de la marketplace par le serveur d'application Codex. |
| `marketplaceSource`             | unset          | Chaîne source transmise au serveur d'application Codex `marketplace/add`.                                  |
| `marketplacePath`               | unset          | Chemin d'accès au fichier local du marketplace Codex contenant le plugin.                                  |
| `marketplaceName`               | unset          | Nom du marketplace Codex enregistré à sélectionner.                                                        |
| `pluginName`                    | `computer-use` | Nom du plugin du marketplace Codex.                                                                        |
| `mcpServerName`                 | `computer-use` | Nom du serveur MCP exposé par le plugin installé.                                                          |

L'auto-installation au début du tour refuse intentionnellement les valeurs configurées `marketplaceSource`.
L'ajout d'une nouvelle source est une opération de configuration explicite, utilisez donc
`/codex computer-use install --source <marketplace-source>` une fois, puis laissez
`autoInstall` gérer les réactivations futures à partir des marketplaces locaux découverts.
L'auto-installation au début du tour peut utiliser un `marketplacePath` configuré, car il s'agit
déjà d'un chemin local sur l'hôte.

## Ce que OpenClaw vérifie

OpenClaw signale en interne une raison de configuration stable et formate le statut visible par l'utilisateur
pour le chat :

| Raison                       | Signification                                                                          | Étape suivante                                                              |
| ---------------------------- | -------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| `disabled`                   | `computerUse.enabled` résolu à faux.                                                   | Définissez `enabled` ou un autre champ Computer Use.                        |
| `marketplace_missing`        | Aucun marketplace correspondant n'était disponible.                                    | Configurez la source, le chemin ou le nom du marketplace.                   |
| `plugin_not_installed`       | Le marketplace existe, mais le plugin n'est pas installé.                              | Exécutez l'installation ou activez `autoInstall`.                           |
| `plugin_disabled`            | Le plugin est installé mais désactivé dans la configuration Codex.                     | Exécutez l'installation pour le réactiver.                                  |
| `remote_install_unsupported` | Le marketplace sélectionné est uniquement à distance.                                  | Utilisez `marketplaceSource` ou `marketplacePath`.                          |
| `mcp_missing`                | Le plugin est activé, mais le serveur MCP est indisponible.                            | Vérifiez les autorisations Codex Computer Use et du système d'exploitation. |
| `ready`                      | Le plugin et les outils MCP sont disponibles.                                          | Démarrez le tour en mode Codex.                                             |
| `check_failed`               | Une requête au serveur d'application Codex a échoué lors de la vérification du statut. | Vérifiez la connectivité et les journaux du serveur d'application.          |
| `auto_install_blocked`       | La configuration au début du tour devrait avoir besoin d'ajouter une nouvelle source.  | Exécutez d'abord l'installation explicite.                                  |

La sortie du chat inclut l'état du plugin, l'état du serveur MCP, la place de marché, les outils
lorsqu'ils sont disponibles, et le message spécifique pour l'étape de configuration en échec.

## macOS permissions

Computer Use est spécifique à macOS. Le serveur MCP appartenant à Codex peut avoir besoin d'autorisations du système d'exploitation local
avant de pouvoir inspecter ou contrôler des applications. Si OpenClaw indique que Computer Use
est installé mais que le serveur MCP n'est pas disponible, vérifiez d'abord la configuration Computer Use
côté Codex :

- Codex app-server est exécuté sur le même hôte où le contrôle du bureau doit
  avoir lieu.
- Le plugin Computer Use est activé dans la configuration Codex.
- Le serveur MCP `computer-use` apparaît dans le statut MCP de Codex app-server.
- macOS a accordé les autorisations requises pour l'application de contrôle du bureau.
- La session hôte actuelle peut accéder au bureau en cours de contrôle.

OpenClaw échoue intentionnellement de manière fermée lorsque `computerUse.enabled` est vrai. Un
tour en mode Codex ne doit pas continuer silencieusement sans les outils de bureau natifs
que la configuration exigeait.

## Dépannage

**Le statut indique non installé.** Exécutez `/codex computer-use install`. Si la
place de marché n'est pas découverte, passez `--source` ou `--marketplace-path`.

**Le statut indique installé mais désactivé.** Exécutez `/codex computer-use install` à nouveau.
L'installation de Codex app-server réécrit la configuration du plugin comme activé.

**Le statut indique que l'installation à distance n'est pas prise en charge.** Utilisez une source ou un
chemin de place de marché local. Les entrées de catalogue uniquement à distance peuvent être inspectées mais pas installées via l'API
de l'application serveur actuelle.

**Le statut indique que le serveur MCP n'est pas disponible.** Réexécutez l'installation une fois pour que les
serveurs MCP rechargent. S'il reste indisponible, corrigez l'application Codex Computer Use,
le statut MCP de Codex app-server, ou les autorisations macOS.

**Le statut ou une sonde expire sur `computer-use.list_apps`.** Le plugin et le serveur MCP
sont présents, mais le pont local Computer Use n'a pas répondu. Quittez ou
redémarrez Codex Computer Use, relancez Codex Desktop si nécessaire, puis réessayez dans une
nouvelle session OpenClaw.

**Un outil Computer Use indique `Native hook relay unavailable`OpenClawGatewayOpenClaw.** Le hook d'outil natif de Codex n'a pas pu atteindre un relais OpenClaw actif via le pont local ou la passerelle de secours Gateway. Démarrez une nouvelle session OpenClaw avec `/new` ou `/reset`. Si cela continue, redémarrez la passerelle afin que les anciens threads du serveur d'application et les enregistrements de hooks soient abandonnés, puis réessayez.

**L'installation automatique en début de tour refuse une source.** C'est intentionnel. Ajoutez la source avec un `/codex computer-use install --source <marketplace-source>` explicite d'abord, puis les installations automatiques futures en début de tour pourront utiliser la place de marché locale découverte.

## Connexes

- [Harnais Codex](/fr/plugins/codex-harness)
- [Pont Peekaboo](Peekaboo/en/platforms/mac/peekaboo)
- [Application iOS](iOS/en/platforms/ios)
