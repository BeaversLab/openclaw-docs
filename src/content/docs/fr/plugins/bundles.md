---
summary: "Installer les bundles compatibles Codex, Claude et Cursor en tant que plugins OpenClaw"
read_when:
  - You want to install a Codex, Claude, or Cursor-compatible bundle
  - You need to know which bundle features OpenClaw executes
  - You are debugging bundle detection, MCP tools, LSP defaults, or missing capabilities
title: "Bundles de plugins"
doc-schema-version: 1
---

Les bundles de plugins permettent à OpenClaw de réutiliser les dispositions de plugins compatibles Codex, Claude et Cursor sans les charger en tant que modules d'exécution natifs OpenClaw. Utilisez cette page lorsque vous disposez d'un bundle existant et que vous devez l'installer, vérifier comment OpenClaw l'a classé, et comprendre quelles parties deviennent des compétences, des hooks, des outils MCP, des paramètres ou des diagnostics OpenClaw.

<Info>Les bundles ne sont pas des plugins natifs OpenClaw. Les plugins natifs s'exécutent en processus et peuvent enregistrer directement les capacités OpenClaw. Les bundles sont des packs de contenu et de métadonnées que OpenClaw mappe sélectivement vers les surfaces prises en charge.</Info>

## Choisir le bon format de plugin

Utilisez un bundle lorsque vous possédez déjà un package compatible Codex, Claude ou Cursor
et que vous souhaitez que OpenClaw mappe son contenu pris en charge en compétences, packs de hooks,
outils MCP, paramètres ou valeurs par défaut LSP sans le réécrire en tant que plugin natif.
Créez un plugin natif OpenClaw lorsque l'intégration doit enregistrer un canal,
fournisseur, service, route HTTP, méthode GatewayCLI, commande CLI propriétaire du plugin, ou
une autre capacité d'exécution.

| Besoin                                                                                                                              | Utiliser     |
| ----------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| Réutiliser des compétences, du markdown de commande, une configuration MCP ou des valeurs par défaut LSP d'un écosystème compatible | Bundle       |
| Exécuter du code d'exécution de plugin arbitraire dans OpenClaw                                                                     | Plugin natif |
| Publier une capacité complète OpenClaw                                                                                              | Plugin natif |
| Porter un pack de commandes Claude ou Cursor existant                                                                               | Bundle       |

Voir [Building plugins](/fr/plugins/building-plugins) pour la création de plugins natifs
et [Plugins](/fr/tools/plugin) pour le flux d'installation principal.

## Installer et vérifier un bundle

<Steps>
  <Step title="Installer le bundle">
    Installer à partir d'un répertoire local, d'une archive ou d'une source de marketplace prise en charge :

    ```bash
    # Local directory
    openclaw plugins install ./my-bundle

    # Archive
    openclaw plugins install ./my-bundle.tgz

    # Claude marketplace
    openclaw plugins marketplace list <marketplace-name>
    openclaw plugins install <plugin-name>@<marketplace-name>
    ```

  </Step>

  <Step title="Vérifier la détection">
    ```bash
    openclaw plugins list
    openclaw plugins inspect <id>
    ```

    Un bundle compatible apparaît avec `Format: bundle` et un sous-type `codex`, `claude`
    ou `cursor`.

  </Step>

  <Step title="Redémarrer la Gateway">
    ```bash
    openclaw gateway restart
    ```

    L'installation ou la mise à jour du code du plugin nécessite le redémarrage de la Gateway.

  </Step>
</Steps>

## Ce que OpenClaw mappe depuis les bundles

Toutes les fonctionnalités des bundles ne s'exécutent pas encore dans OpenClaw aujourd'hui. OpenClaw mappe le contenu pris en charge
vers des surfaces natives et signale le contenu détecté uniquement dans les diagnostics de plugin.

### Pris en charge actuellement

| Fonctionnalité                          | Comment cela est mappé                                                                                                                 | S'applique à         |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | -------------------- |
| Contenu des compétences (Skill content) | Les racines de compétences des bundles se chargent comme des compétences OpenClaw normales                                             | Tous les formats     |
| Commandes                               | `commands/` et `.cursor/commands/` sont traités comme des racines de compétences                                                       | Claude, Cursor       |
| Packs de hooks                          | Les dispositions `HOOK.md` et `handler.ts` ou `handler.js` de style OpenClaw                                                           | Principalement Codex |
| Outils MCP                              | La configuration MCP du bundle fusionne avec les paramètres Pi intégrés ; les serveurs stdio et HTTP pris en charge se chargent        | Tous les formats     |
| Serveurs LSP                            | Le `.lsp.json` de Claude et les `lspServers` déclarés dans le manifeste fusionnent avec les valeurs LSP par défaut du Pi intégré       | Claude               |
| Paramètres                              | Les `settings.json` de Claude sont importés comme valeurs par défaut du Pi intégré après suppression des clés de remplacement du shell | Claude               |

### Contenu des compétences (Skill content)

Les racines de compétences des bundles se chargent comme des racines de compétences OpenClaw normales. Les `commands/` de Claude et
les `.cursor/commands/` de Cursor se chargent via le même chemin.

### Packs de hooks

Les racines de hooks des bundles s'exécutent **uniquement** lorsqu'elles utilisent la disposition de pack de hooks normale de OpenClaw :
`HOOK.md` avec `handler.ts` ou `handler.js`. Aujourd'hui, c'est principalement le
cas compatible Codex.

### Outils MCP

Les bundles activés peuvent contribuer à la configuration du serveur MCP pour le Pi intégré en tant que `mcpServers`.
Les serveurs stdio et HTTP pris en charge peuvent exposer des outils lors des tours du Pi intégré. Les profils d'outil `coding` et `messaging` incluent les outils MCP du bundle par défaut ; utilisez
`tools.deny: ["bundle-mcp"]` pour désactiver cette option pour un agent ou une Gateway.

### Paramètres du Pi intégré

Les `settings.json` Claude sont importés en tant que paramètres par défaut du Pi intégré lorsque le bundle est
activé. OpenClaw supprime les clés de remplacement du shell avant de les appliquer.

### LSP du Pi intégré

Les `.lsp.json` Claude et les `lspServers` déclarés dans le manifeste fusionnent avec les valeurs par défaut du LSP
du Pi intégré. Les serveurs LSP pris en charge utilisant stdio peuvent s'exécuter.

### Détecté mais non exécuté

OpenClaw les signale dans les diagnostics mais ne les exécute pas :

- Claude `agents`, `hooks/hooks.json`, `outputStyles`
- Cursor `.cursor/agents`, `.cursor/hooks.json`, `.cursor/rules`
- Application Codex ou métadonnées en ligne

## Formats et détection de bundles

OpenClaw vérifie les marqueurs de plugins natifs avant les marqueurs de bundles. Un répertoire contenant
`openclaw.plugin.json` ou une entrée `openclaw.extensions` `package.json` valide est
traité comme un plugin natif, même s'il contient également des fichiers de bundle. Cela empêche
les packages en double format d'être partiellement chargés via le chemin des bundles.

Après la détection native, OpenClaw reconnaît ces mises en page de bundles :

<AccordionGroup>
  <Accordion title="Bundles Codex">
    Marqueur : `.codex-plugin/plugin.json`

    Contenu mappé pris en charge : rapports de capacité `skills/`, `hooks/`, `.mcp.json` et `.app.json`.

    Les bundles Codex conviennent le mieux à OpenClaw lorsqu'ils utilisent des racines de compétences et des répertoires de packs de hooks style OpenClaw.

  </Accordion>

  <Accordion title="Claude bundles">
    Modes de détection :

    - **Basé sur un manifeste :** `.claude-plugin/plugin.json`
    - **Sans manifeste :** disposition Claude par défaut avec `skills/`, `commands/`,
      `agents/`, `hooks/hooks.json`, `.mcp.json`, `.lsp.json`, ou
      `settings.json`

    Contenu mappé pris en charge : `skills/`, `commands/`, `settings.json`,
    `.mcp.json`, `.lsp.json`, `mcpServers` déclarés dans le manifeste, et
    `lspServers` déclarés dans le manifeste.

    Contenu uniquement détecté : `agents`, `hooks/hooks.json` et `outputStyles`.

  </Accordion>

  <Accordion title="Cursor bundles">
    Marqueur : `.cursor-plugin/plugin.json`

    Contenu mappé pris en charge : `skills/`, `.cursor/commands/` et `.mcp.json`.

    Contenu uniquement détecté : `.cursor/agents`, `.cursor/hooks.json` et
    `.cursor/rules`.

  </Accordion>
</AccordionGroup>

Les chemins des composants du manifeste Claude sont additifs. La déclaration de chemins personnalisés étend les chemins par défaut existant dans le bundle au lieu de les remplacer.

## Référence de configuration MCP

Les outils MCP de bundle utilisent la clé de plugin synthétique `bundle-mcp`Gateway pour le filtrage de profil.
Pour refuser pour un agent ou un Gateway, refusez cette clé :

```json5
{
  tools: {
    deny: ["bundle-mcp"],
  },
}
```

Les paramètres Pi intégrés locaux au projet s'appliquent toujours après les valeurs par défaut du bundle, de sorte que les paramètres de l'espace de travail peuvent remplacer les entrées MCP du bundle si nécessaire.

### Structure de configuration MCP

Les fichiers MCP de bundle peuvent utiliser soit `mcpServers`, `servers`, soit une carte de serveur de premier niveau. Les serveurs Stdio lancent un processus enfant :

```json
{
  "mcpServers": {
    "my-server": {
      "command": "node",
      "args": ["server.js"],
      "env": { "PORT": "3000" }
    }
  }
}
```

Les serveurs HTTP se connectent via `sse` par défaut, ou `streamable-http` sur demande :

```json
{
  "mcpServers": {
    "my-server": {
      "url": "http://localhost:3100/mcp",
      "transport": "streamable-http",
      "headers": {
        "Authorization": "Bearer local-dev-token"
      },
      "connectionTimeoutMs": 30000
    }
  }
}
```

Règles :

- `transport` peut être `"sse"` ou `"streamable-http"`OpenClaw. Si omis, OpenClaw
  utilise `sse`.
- `type: "http"`CLI est un alias aval natif de la CLI. Préférez
  `transport: "streamable-http"` dans la configuration du bundle ; `openclaw mcp set` et
  `openclaw doctor --fix` normalisent l'alias.
- Seules les URL `http:` et `https:` sont prises en charge.
- `headers` doit être un objet JSON avec des valeurs compatibles avec des chaînes.
- Une entrée de serveur avec `command` est traitée comme stdio. Une entrée de serveur avec `url`
  et sans commande est traitée comme HTTP.
- Les identifiants de l'URL, y compris les informations utilisateur et les paramètres de requête, sont expurgés des descriptions
  d'outils et des journaux.
- `connectionTimeoutMs` remplace le délai de connexion par défaut de 30 secondes pour
  les transports stdio et HTTP.

Pour la sécurité du démarrage stdio, les entrées de variables d'environnement non prises en charge sont ignorées
avec des diagnostics au lieu d'être transmises aveuglément.

### Chemins MCP et noms d'outils

La configuration MCP basée sur des fichiers est résolue par rapport au fichier bundle qui l'a
déclarée. Les valeurs relatives explicites `command`, `args`, `cwd` et `workingDirectory`
sont développées par rapport au répertoire de ce fichier. La configuration du bundle Claude peut également utiliser
`${CLAUDE_PLUGIN_ROOT}` pour faire référence à la racine du bundle.

OpenClaw enregistre les outils MCP du bundle avec des noms sécurisés pour le provider :

```text
serverName__toolName
```

Règles de nommage :

- Les caractères en dehors de `A-Za-z0-9_-` deviennent `-`.
- Les préfixes de serveur doivent commencer par une lettre ; les clés de serveur numériques reçoivent un préfixe `mcp-`.
- Les noms de serveur vides reviennent à `mcp`.
- Les préfixes de serveur sont limités à 30 caractères.
- Les noms complets des outils sont limités à 64 caractères.
- Les noms nettoyés en collision reçoivent des suffixes numériques.
- Les outils exposés sont triés de manière déterministe par nom sécurisé afin que les tours Pi répétés
  conservent des blocs d'outils stables.
- Les listes blanches et listes noires de profil peuvent nommer soit des outils exposés individuels, soit la clé de plugin `bundle-mcp`.

## Paramètres Pi intégrés et valeurs par défaut LSP

Les bundles Claude activés peuvent contribuer des valeurs par défaut `settings.json` au runtime Pi intégré. OpenClaw applique ces paramètres avant les paramètres locaux au projet, puis nettoie les clés de remplacement du shell afin que les paramètres du bundle ou de l'espace de travail ne puissent pas modifier le comportement d'exécution du shell.

Clés nettoyées :

- `shellPath`
- `shellCommandPrefix`

Les bundles Claude activés peuvent également contribuer à la configuration du serveur LSP via `.lsp.json` ou `lspServers` déclaré dans le manifeste. OpenClaw fusionne ces entrées dans les valeurs par défaut LSP du Pi intégré. Les serveurs LSP pris en charge via stdio peuvent s'exécuter ; les entrées de serveur non prises en charge apparaissent toujours dans les diagnostics `openclaw plugins inspect <id>`.

## Dépendances d'exécution et nettoyage

Les bundles tiers compatibles ne bénéficient pas de réparation `npm install` au démarrage. Installez-les avec `openclaw plugins install` et incluez tous les fichiers d'exécution dont ils ont besoin dans le répertoire du plugin installé.

Les plugins groupés détenus par OpenClaw sont soit livrés en mode léger dans le cœur, soit téléchargeables via l'installateur de plugins. Le démarrage de Gateway n'exécute pas de gestionnaire de paquets pour eux. `openclaw doctor --fix` peut supprimer les anciens répertoires de dépendances intermédiaires et récupérer les plugins téléchargeables auxquels la configuration fait référence mais qui manquent dans l'index local des plugins.

## Limite de sécurité

Les bundles ont une limite d'exécution plus étroite que les plugins natifs :

- OpenClaw ne charge pas de modules d'exécution de bundle arbitraires dans le processus.
- Les racines de compétences, les chemins des packs de crochets, les fichiers de paramètres, les fichiers MCP et les fichiers LSP sont lus avec des vérifications des limites de la racine du plugin.
- Les packs de crochets de style OpenClaw doivent rester à l'intérieur de la racine du plugin.
- Les serveurs MCP stdio pris en charge peuvent toujours lancer des sous-processus.

Traitez les bundles tiers comme du contenu de confiance pour les fonctionnalités mappées qu'ils exposent, en particulier les serveurs MCP et les packs de crochets.

## Dépannage

| Symptôme                                                                   | Vérification                                                                                            | Correction                                                                                               |
| -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| La capacité est répertoriée mais ne s'exécute pas                          | Exécutez `openclaw plugins inspect <id>` et vérifiez s'il est marqué comme non connecté                 | Il s'agit d'une limite actuelle du produit, et non d'une installation défectueuse                        |
| Les fichiers de commande Claude n'apparaissent pas en tant que compétences | Vérifiez que les fichiers markdown sont à l'intérieur de `commands/` ou d'un chemin de commande déclaré | Déplacez les fichiers sous une racine `commands/` ou `skills/` détectée, activez le bundle et redémarrez |
| Le `settings.json` Claude ne s'applique pas                                | Vérifiez que le bundle est activé et inspectez les diagnostics                                          | Seuls les paramètres Pi intégrés sont importés ; les clés de remplacement du shell sont supprimées       |
| Les hooks Claude ne s'exécutent pas                                        | Vérifiez si le bundle n'a que `hooks/hooks.json`                                                        | Utilisez une disposition de pack de hooks OpenClaw ou fournissez un plugin natif                         |

## Connexes

- [Plugins](/fr/tools/plugin) - installer, configurer et dépanner les plugins
- [Gérer les plugins](/fr/plugins/manage-plugins) - exemples courants de CLI de plugin
- [Inventaire des plugins](/fr/plugins/plugin-inventory) - liste générée des plugins groupés et externes
- [Manifeste de plugin](/fr/plugins/manifest) - schéma de manifeste de plugin natif
- [Création de plugins](/fr/plugins/building-plugins) - créer un plugin natif
