---
summary: "Installer et utiliser les bundles Codex, Claude et Cursor en tant que plugins OpenClaw"
read_when:
  - You want to install a Codex, Claude, or Cursor-compatible bundle
  - You need to understand how OpenClaw maps bundle content into native features
  - You are debugging bundle detection or missing capabilities
title: "Ensembles de plugins"
---

OpenClaw peut installer des plugins à partir de trois écosystèmes externes : **Codex**, **Claude**
et **Cursor**. Ceux-ci sont appelés **ensembles** (bundles) — des packs de contenu et de métadonnées que
OpenClaw mappe vers des fonctionnalités natives telles que les compétences (skills), les hooks et les outils MCP.

<Info>Les ensembles (bundles) ne sont **pas** identiques aux plugins natifs OpenClaw. Les plugins natifs s'exécutent en cours de processus et peuvent enregistrer n'importe quelle fonctionnalité. Les ensembles sont des packs de contenu avec une sélectivité du mappage des fonctionnalités et une limite de confiance plus restreinte.</Info>

## Pourquoi les ensembles existent

De nombreux plugins utiles sont publiés aux formats Codex, Claude ou Cursor. Au lieu
'd'exiger des auteurs qu'ils les réécrivent en tant que plugins natifs OpenClaw, OpenClaw
détecte ces formats et mappe leur contenu pris en charge vers l'ensemble de fonctionnalités
natif. Cela signifie que vous pouvez installer un pack de commandes Claude ou un ensemble de compétences Codex
et l'utiliser immédiatement.

## Installer un ensemble

<Steps>
  <Step title="Installer à partir d'un répertoire, d'une archive ou d'une place de marché">
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

    Les bundles s'affichent en tant que `Format: bundle` avec un sous-type `codex`, `claude` ou `cursor`.

  </Step>

  <Step title="Redémarrer et utiliser">
    ```bash
    openclaw gateway restart
    ```

    Les fonctionnalités mappées (compétences, hooks, outils MCP, valeurs par défaut LSP) sont disponibles lors de la prochaine session.

  </Step>
</Steps>

## Ce que OpenClaw mappe depuis les bundles

Aujourd'hui, toutes les fonctionnalités des bundles ne s'exécutent pas dans OpenClaw. Voici ce qui fonctionne et ce qui est détecté mais pas encore connecté.

### Pris en charge actuellement

| Fonctionnalité          | Comment elle est mappée                                                                                                               | S'applique à     |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| Contenu des compétences | Les racines des compétences du bundle se chargent comme des compétences normales OpenClaw                                             | Tous les formats |
| Commandes               | `commands/` et `.cursor/commands/` traités comme des racines de compétences                                                           | Claude, Cursor   |
| Packs de hooks          | Dispositions `HOOK.md` + `handler.ts` de style OpenClaw                                                                               | Codex            |
| Outils MCP              | La configuration MCP du bundle est fusionnée dans les paramètres Pi intégrés ; les serveurs stdio et HTTP pris en charge sont chargés | Tous les formats |
| Serveurs LSP            | Claude `.lsp.json` et `lspServers` déclarés dans le manifeste fusionnés dans les valeurs par défaut LSP Pi intégrées                  | Claude           |
| Paramètres              | Claude `settings.json` importé en tant que valeurs par défaut Pi intégrées                                                            | Claude           |

#### Contenu des compétences

- les racines de compétence de bundle sont chargées comme des racines de compétence normales OpenClaw
- les racines `commands` Claude sont traitées comme des racines de compétence supplémentaires
- les racines `.cursor/commands` Cursor sont traitées comme des racines de compétence supplémentaires

Cela signifie que les fichiers de commandes markdown Claude fonctionnent via le chargeur de compétences normal OpenClaw. Le markdown de commandes Cursor fonctionne via le même chemin.

#### Packs de hooks

- les racines de hook de bundle ne fonctionnent **que** lorsqu'elles utilisent la disposition de pack de hooks normale OpenClaw. Aujourd'hui, c'est principalement le cas compatible Codex :
  - `HOOK.md`
  - `handler.ts` ou `handler.js`

#### MCP pour Pi

- les bundles activés peuvent contribuer à la configuration du serveur MCP
- OpenClaw fusionne la configuration MCP du bundle dans les paramètres Pi intégrés effectifs en tant que `mcpServers`
- OpenClaw expose les outils MCP de bundle pris en charge pendant les tours de l'agent Pi intégré en lançant des serveurs stdio ou en se connectant à des serveurs HTTP
- les profils de `coding` et `messaging` incluent les outils MCP du bundle par
  défaut ; utilisez `tools.deny: ["bundle-mcp"]` pour désactiver pour un agent ou une passerelle
- les paramètres Pi locaux au projet s'appliquent toujours après les valeurs par défaut du bundle, les paramètres de
  l'espace de travail peuvent donc remplacer les entrées MCP du bundle si nécessaire
- les catalogues d'outils MCP du bundle sont triés de manière déterministe avant l'enregistrement, donc
  les modifications de l'ordre en amont `listTools()` ne perturbent pas les blocs d'outils du cache de prompt

##### Transports

Les serveurs MCP peuvent utiliser le transport stdio ou HTTP :

**Stdio** lance un processus enfant :

```json
{
  "mcp": {
    "servers": {
      "my-server": {
        "command": "node",
        "args": ["server.js"],
        "env": { "PORT": "3000" }
      }
    }
  }
}
```

**HTTP** se connecte à un serveur MCP en cours d'exécution via `sse` par défaut, ou `streamable-http` si demandé :

```json
{
  "mcp": {
    "servers": {
      "my-server": {
        "url": "http://localhost:3100/mcp",
        "transport": "streamable-http",
        "headers": {
          "Authorization": "Bearer ${MY_SECRET_TOKEN}"
        },
        "connectionTimeoutMs": 30000
      }
    }
  }
}
```

- `transport` peut être défini sur `"streamable-http"` ou `"sse"` ; en cas d'omission, OpenClaw utilise `sse`
- `type: "http"` est une forme aval native CLI ; utilisez `transport: "streamable-http"` dans la configuration OpenClaw. `openclaw mcp set` et `openclaw doctor --fix` normalisent l'alias commun.
- seuls les schémas d'URL `http:` et `https:` sont autorisés
- les valeurs `headers` prennent en charge l'interpolation `${ENV_VAR}`
- une entrée de serveur avec à la fois `command` et `url` est rejetée
- les informations d'identification de l'URL (userinfo et paramètres de requête) sont expurgées des descriptions d'outils et des journaux
- `connectionTimeoutMs` remplace le délai de connexion par défaut de 30 secondes pour
  les transports stdio et HTTP

##### Nommage des outils

OpenClaw enregistre les outils MCP du bundle avec des noms sécurisés pour le fournisseur sous la forme
`serverName__toolName`. Par exemple, un serveur avec la clé `"vigil-harbor"` exposant un
outil `memory_search` s'enregistre en tant que `vigil-harbor__memory_search`.

- les caractères en dehors de `A-Za-z0-9_-` sont remplacés par `-`
- les fragments qui commenceraient par une non-lettre reçoivent un préfixe de lettre, donc les clés de serveur numériques telles que `12306` deviennent des préfixes d'outil sécurisés pour le provider
- les préfixes de serveur sont plafonnés à 30 caractères
- les noms complets des outils sont plafonnés à 64 caractères
- les noms de serveur vides reviennent par défaut à `mcp`
- les noms nettoyés en collision sont distingués par des suffixes numériques
- l'ordre final des outils exposés est déterministe par nom sécurisé pour garder les tours Pi répétés stables dans le cache
- le filtrage de profil traite tous les outils d'un serveur MCP de bundle comme appartenant au plugin `bundle-mcp`, donc les listes d'autorisation et de refus de profil peuvent inclure soit des noms d'outil exposés individuels soit la clé de plugin `bundle-mcp`

#### Paramètres Pi intégrés

- Le `settings.json` de Claude est importé comme paramètres Pi intégrés par défaut lorsque le bundle est activé
- OpenClaw nettoie les clés de remplacement du shell avant de les appliquer

Clés nettoyées :

- `shellPath`
- `shellCommandPrefix`

#### LSP Pi intégré

- les bundles Claude activés peuvent contribuer à la configuration du serveur LSP
- OpenClaw charge `.lsp.json` plus tous les chemins `lspServers` déclarés dans le manifeste
- la configuration LSP du bundle est fusionnée dans les paramètres par défaut du LSP Pi intégré effectif
- seuls les serveurs LSP pris en charge basés sur stdio sont exécutables aujourd'hui ; les transports non pris en charge apparaissent toujours dans `openclaw plugins inspect <id>`

### Détectés mais non exécutés

Ceux-ci sont reconnus et affichés dans les diagnostics, mais OpenClaw ne les exécute pas :

- `agents` de Claude, automation `hooks.json`, `outputStyles`
- `.cursor/agents` de Cursor, `.cursor/hooks.json`, `.cursor/rules`
- métadonnées inline/app de Codex au-delà du rapport de fonctionnalités

## Formats de bundle

<AccordionGroup>
  <Accordion title="Codex bundles">
    Marqueurs : `.codex-plugin/plugin.json`

    Contenu facultatif : `skills/`, `hooks/`, `.mcp.json`, `.app.json`

    Les bundles Codex conviennent le mieux à OpenClaw lorsqu'ils utilisent des racines de compétences et des répertoires de packs de hooks de style OpenClaw (`HOOK.md` + `handler.ts`).

  </Accordion>

  <Accordion title="Claude bundles">
    Deux modes de détection :

    - **Basé sur un manifeste :** `.claude-plugin/plugin.json`
    - **Sans manifeste :** disposition Claude par défaut (`skills/`, `commands/`, `agents/`, `hooks/`, `.mcp.json`, `.lsp.json`, `settings.json`)

    Comportements spécifiques à Claude :

    - `commands/` est traité comme du contenu de compétence
    - `settings.json` est importé dans les paramètres Pi intégrés (les clés de remplacement du shell sont nettoyées)
    - `.mcp.json` expose les outils stdio pris en charge au Pi intégré
    - `.lsp.json` plus les chemins `lspServers` déclarés dans le manifeste sont chargés dans les valeurs par défaut du LSP du Pi intégré
    - `hooks/hooks.json` est détecté mais non exécuté
    - Les chemins de composants personnalisés dans le manifeste sont additifs (ils étendent les valeurs par défaut, ils ne les remplacent pas)

  </Accordion>

  <Accordion title="Cursor bundles">
    Marqueurs : `.cursor-plugin/plugin.json`

    Contenu facultatif : `skills/`, `.cursor/commands/`, `.cursor/agents/`, `.cursor/rules/`, `.cursor/hooks.json`, `.mcp.json`

    - `.cursor/commands/` est traité comme du contenu de compétence
    - `.cursor/rules/`, `.cursor/agents/` et `.cursor/hooks.json` sont en détection uniquement

  </Accordion>
</AccordionGroup>

## Priorité de détection

OpenClaw vérifie d'abord le format du plugin natif :

1. `openclaw.plugin.json` ou `package.json` valide avec `openclaw.extensions` — traité comme **plugin natif**
2. Marqueurs de bundle (`.codex-plugin/`, `.claude-plugin/`, ou disposition Claude/Cursor par défaut) — traité comme **bundle**

Si un répertoire contient les deux, OpenClaw utilise le chemin natif. Cela empêche
les packages à double format d'être partiellement installés en tant que bundles.

## Dépendances d'exécution et nettoyage

- Les bundles compatibles tiers ne bénéficient pas de la réparation au démarrage de `npm install`. Ils
  doivent être installés via `openclaw plugins install` et inclure tout
  c dont ils ont besoin dans le répertoire du plugin installé.
- Les plugins groupés détenus par OpenClaw sont soit fournis en version allégée dans le cœur,
  soit téléchargeables via l'installateur de plugins. Le démarrage de Gateway n'exécute jamais de
  gestionnaire de packages pour eux.
- `openclaw doctor --fix` supprime les anciens répertoires de dépendances intermédiaires et peut
  récupérer les plugins téléchargeables manquants dans l'index de plugins local lorsque
  la configuration y fait référence.

## Sécurité

Les bundles ont une limite de confiance plus étroite que les plugins natifs :

- OpenClaw ne charge **pas** de modules d'exécution de bundle arbitraires en processus
- Les chemins des Skills et des packs de hooks doivent rester à l'intérieur de la racine du plugin (vérification des limites)
- Les fichiers de paramètres sont lus avec les mêmes vérifications de limites
- Les serveurs MCP stdio pris en charge peuvent être lancés en tant que sous-processus

Cela rend les bundles plus sûrs par défaut, mais vous devez toujours traiter les bundles
tiers comme un contenu de confiance pour les fonctionnalités qu'ils exposent.

## Dépannage

<AccordionGroup>
  <Accordion title="Le bundle est détecté mais les capacités ne s'exécutent pas">
    Exécutez `openclaw plugins inspect <id>`. Si une capacité est listée mais marquée comme
    non connectée, c'est une limite du produit — et non une installation défaillante.
  </Accordion>

<Accordion title="Les fichiers de commande Claude n'apparaissent pas">Assurez-vous que le bundle est activé et que les fichiers markdown se trouvent à l'intérieur d'une racine détectée `commands/` ou `skills/`.</Accordion>

<Accordion title="Les paramètres Claude ne s'appliquent pas">Seuls les paramètres Pi intégrés de `settings.json` sont pris en charge. OpenClaw ne traite pas les paramètres des bundles comme des correctifs de configuration bruts.</Accordion>

  <Accordion title="Les hooks Claude ne s'exécutent pas">
    `hooks/hooks.json` est en détection uniquement. Si vous avez besoin de hooks exécutables, utilisez la
    disposition de pack de hooks OpenClaw ou fournissez un plugin natif.
  </Accordion>
</AccordionGroup>

## Connexes

- [Installer et configurer les plugins](/fr/tools/plugin)
- [Créer des plugins](/fr/plugins/building-plugins) — créer un plugin natif
- [Manifeste de plugin](/fr/plugins/manifest) — schéma de manifeste natif
