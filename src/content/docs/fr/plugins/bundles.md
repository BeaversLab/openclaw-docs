---
summary: "Installer et utiliser les bundles Codex, Claude et Cursor en tant que plugins OpenClaw"
read_when:
  - You want to install a Codex, Claude, or Cursor-compatible bundle
  - You need to understand how OpenClaw maps bundle content into native features
  - You are debugging bundle detection or missing capabilities
title: "Bundles de plugins"
---

# Bundles de plugins

OpenClaw peut installer des plugins à partir de trois écosystèmes externes : **Codex**, **Claude**, et **Cursor**. Ils sont appelés **bundles** — des packs de contenu et de métadonnées que OpenClaw mappe vers des fonctionnalités natives telles que les compétences, les hooks et les outils MCP.

<Info>Les bundles ne sont **pas** les mêmes que les plugins natifs OpenClaw. Les plugins natifs s'exécutent en processus et peuvent enregistrer n'importe quelle capacité. Les bundles sont des packs de contenu avec une sélectivité du mappage des fonctionnalités et une limite de confiance plus étroite.</Info>

## Pourquoi les bundles existent

De nombreux plugins utiles sont publiés dans les formats Codex, Claude ou Cursor. Au lieu d'exiger des auteurs qu'ils les réécrivent en tant que plugins natifs OpenClaw, OpenClaw détecte ces formats et mappe leur contenu pris en charge vers l'ensemble de fonctionnalités natives. Cela signifie que vous pouvez installer un pack de commandes Claude ou un bundle de compétences Codex et l'utiliser immédiatement.

## Installer un bundle

<Steps>
  <Step title="Install from a directory, archive, or marketplace">
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

    Les bundles s'affichent comme `Format: bundle` avec un sous-type de `codex`, `claude` ou `cursor`.

  </Step>

  <Step title="Redémarrer et utiliser">
    ```bash
    openclaw gateway restart
    ```

    Les fonctionnalités mappées (compétences, hooks, outils MCP) sont disponibles dans la prochaine session.

  </Step>
</Steps>

## Ce que OpenClaw mappe depuis les bundles

Aujourd'hui, toutes les fonctionnalités des bundles ne s'exécutent pas dans OpenClaw. Voici ce qui fonctionne et ce qui est détecté mais pas encore connecté.

### Pris en charge actuellement

| Fonctionnalité          | Comment elle est mappée                                                                                                                 | S'applique à     |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| Contenu des compétences | Les racines des compétences du bundle se chargent comme des compétences normales OpenClaw                                               | Tous les formats |
| Commandes               | `commands/` et `.cursor/commands/` traités comme des racines de compétences                                                             | Claude, Cursor   |
| Packs de hooks          | Mises en page `HOOK.md` + `handler.ts` de style OpenClaw                                                                                | Codex            |
| Outils MCP              | Configuration MCP du bundle fusionnée dans les paramètres Pi intégrés ; serveurs stdio pris en charge lancés en tant que sous-processus | Tous les formats |
| Paramètres              | `settings.json` de Claude importé en tant que valeurs par défaut intégrées de Pi                                                        | Claude           |

### Détecté mais non exécuté

Ces éléments sont reconnus et affichés dans les diagnostics, mais OpenClaw ne les exécute pas :

- Claude `agents`, `hooks.json` automation, `lspServers`, `outputStyles`
- Cursor `.cursor/agents`, `.cursor/hooks.json`, `.cursor/rules`
- Métadonnées inline/app Codex au-delà du rapport des fonctionnalités

## Formats de bundle

<AccordionGroup>
  <Accordion title="Bundles Codex">
    Marqueurs : `.codex-plugin/plugin.json`

    Contenu facultatif : `skills/`, `hooks/`, `.mcp.json`, `.app.json`

    Les bundles Codex conviennent le mieux à OpenClaw lorsqu'ils utilisent des racines de compétences et des répertoires de packs de hooks style OpenClaw (`HOOK.md` + `handler.ts`).

  </Accordion>

  <Accordion title="Bundles Claude">
    Deux modes de détection :

    - **Basé sur un manifeste :** `.claude-plugin/plugin.json`
    - **Sans manifeste :** disposition Claude par défaut (`skills/`, `commands/`, `agents/`, `hooks/`, `.mcp.json`, `settings.json`)

    Comportements spécifiques à Claude :

    - `commands/` est traité comme du contenu de compétence
    - `settings.json` est importé dans les paramètres Pi intégrés (les clés de remplacement de shell sont assainies)
    - `.mcp.json` expose les outils stdio pris en charge au Pi intégré
    - `hooks/hooks.json` est détecté mais n'est pas exécuté
    - Les chemins de composants personnalisés dans le manifeste sont additifs (ils étendent les valeurs par défaut, ne les remplacent pas)

  </Accordion>

  <Accordion title="Cursor bundles">
    Marqueurs : `.cursor-plugin/plugin.json`

    Contenu facultatif : `skills/`, `.cursor/commands/`, `.cursor/agents/`, `.cursor/rules/`, `.cursor/hooks.json`, `.mcp.json`

    - `.cursor/commands/` est traité comme du contenu de skill
    - `.cursor/rules/`, `.cursor/agents/` et `.cursor/hooks.json` sont en détection uniquement

  </Accordion>
</AccordionGroup>

## Priorité de détection

OpenClaw vérifie d'abord le format du plugin natif :

1. `openclaw.plugin.json` ou `package.json` valide avec `openclaw.extensions` — traité comme **plugin natif**
2. Marqueurs de bundle (`.codex-plugin/`, `.claude-plugin/`, ou disposition Claude/Cursor par défaut) — traité comme **bundle**

Si un répertoire contient les deux, OpenClaw utilise le chemin natif. Cela empêche
les packages en double format d'être partiellement installés en tant que bundles.

## Sécurité

Les bundles ont une limite de confiance plus étroite que les plugins natifs :

- OpenClaw ne charge **pas** des modules d'exécution de bundle arbitraires en cours de processus
- Les chemins des Skills et des hook-packs doivent rester à l'intérieur de la racine du plugin (vérification des limites)
- Les fichiers de paramètres sont lus avec les mêmes vérifications de limites
- Les serveurs MCP stdio pris en charge peuvent être lancés en tant que sous-processus

Cela rend les bundles plus sûrs par défaut, mais vous devez toujours traiter les bundles
tiers comme du contenu de confiance pour les fonctionnalités qu'ils exposent.

## Dépannage

<AccordionGroup>
  <Accordion title="Bundle is detected but capabilities do not run">
    Exécutez `openclaw plugins inspect <id>`. Si une capacité est listée mais marquée comme
non connectée, c'est une limite du produit — et non une installation cassée.
  </Accordion>

<Accordion title="Les fichiers de commandes Claude n'apparaissent pas">Assurez-vous que le bundle est activé et que les fichiers markdown se trouvent dans une racine `commands/` ou `skills/` détectée.</Accordion>

<Accordion title="Les paramètres Claude ne s'appliquent pas">Seuls les paramètres Pi intégrés de `settings.json` sont pris en charge. OpenClaw ne traite pas les paramètres des bundles comme des correctifs de configuration bruts.</Accordion>

  <Accordion title="Les hooks Claude ne s'exécutent pas">
    `hooks/hooks.json` est en mode détection uniquement. Si vous avez besoin de hooks exécutables, utilisez la
    disposition hook-pack d'OpenClaw ou livrez un plugin natif.
  </Accordion>
</AccordionGroup>

## Connexes

- [Installer et configurer les plugins](/en/tools/plugin)
- [Créer des plugins](/en/plugins/building-plugins) — créer un plugin natif
- [Manifeste de plugin](/en/plugins/manifest) — schéma de manifeste natif
