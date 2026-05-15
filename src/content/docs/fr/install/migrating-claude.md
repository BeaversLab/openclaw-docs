---
summary: "Transférer l'état local de Claude Code et Claude Desktop vers OpenClaw avec un import prévisualisé"
read_when:
  - You are coming from Claude Code or Claude Desktop and want to keep instructions, MCP servers, and skills
  - You need to understand what OpenClaw imports automatically and what stays archive-only
title: "Migration depuis Claude"
---

OpenClaw importe l'état local de Claude via le provider de migration Claude intégré. Le provider prévisualise chaque élément avant de modifier l'état, masque les secrets dans les plans et rapports, et crée une sauvegarde vérifiée avant l'application.

<Note>Les imports d'onboarding nécessitent une installation OpenClaw fraîche. Si vous avez déjà un état local OpenClaw, réinitialisez d'abord la configuration, les identifiants, les sessions et l'espace de travail, ou utilisez `openclaw migrate` directement avec `--overwrite` après avoir examiné le plan.</Note>

## Deux méthodes d'import

<Tabs>
  <Tab title="Assistant d'onboarding">
    L'assistant propose Claude lorsqu'il détecte un état local de Claude.

    ```bash
    openclaw onboard --flow import
    ```

    Ou pointez vers une source spécifique :

    ```bash
    openclaw onboard --import-from claude --import-source ~/.claude
    ```

  </Tab>
  <Tab title="CLI">
    Utilisez `openclaw migrate` pour les exécutions scriptées ou reproductibles. Consultez [`openclaw migrate`](/fr/cli/migrate) pour la référence complète.

    ```bash
    openclaw migrate claude --dry-run
    openclaw migrate apply claude --yes
    ```

    Ajoutez `--from <path>` pour importer un domicile Claude Code ou une racine de projet spécifique.

  </Tab>
</Tabs>

## Ce qui est importé

<AccordionGroup>
  <Accordion title="Instructions and memory">
    - Le contenu du projet `CLAUDE.md` et `.claude/CLAUDE.md` est copié ou ajouté à l'espace de travail de l'agent OpenClaw `AGENTS.md`.
    - Le contenu `~/.claude/CLAUDE.md` de l'utilisateur est ajouté à l'espace de travail `USER.md`.

  </Accordion>
  <Accordion title="Serveurs MCP">
    Les définitions de serveur MCP sont importées depuis le projet `.mcp.json`, Claude Code `~/.claude.json`, et Claude Desktop `claude_desktop_config.json` lorsqu'ils sont présents.
  </Accordion>
  <Accordion title="Skills and commands">
    - Les compétences Claude avec un fichier `SKILL.md` sont copiées dans le répertoire des compétences de l'espace de travail OpenClaw.
    - Les fichiers Markdown de commandes Claude sous `.claude/commands/` ou `~/.claude/commands/` sont convertis en compétences OpenClaw avec `disable-model-invocation: true`.

  </Accordion>
</AccordionGroup>

## Ce qui reste en archive uniquement

Le fournisseur copie ces éléments dans le rapport de migration pour examen manuel, mais ne les charge **pas** dans la configuration active de OpenClaw :

- Hooks Claude
- Autorisations et listes d'autorisation d'outils larges Claude
- Valeurs par défaut de l'environnement Claude
- `CLAUDE.local.md`
- `.claude/rules/`
- Sous-agents Claude sous `.claude/agents/` ou `~/.claude/agents/`
- Répertoires de cache, de plans et d'historique de projet de Claude Code
- Extensions Claude Desktop et identifiants stockés par le système d'exploitation

OpenClaw refuse d'exécuter des hooks, de faire confiance aux listes d'autorisation d'outils, ou de décoder automatiquement l'état des identifiants OAuth et Desktop opaques. Déplacez manuellement ce dont vous avez besoin après avoir examiné l'archive.

## Sélection de la source

Sans `--from`, OpenClaw inspecte le domicile Claude Code par défaut sur `~/.claude`, le fichier d'état `~/.claude.json` de Claude Code échantillonné, et la configuration MCP de Claude Desktop sur macOS.

Lorsque `--from` pointe vers une racine de projet, OpenClaw n'importe que les fichiers Claude de ce projet, tels que `CLAUDE.md`, `.claude/settings.json`, `.claude/commands/`, `.claude/skills/` et `.mcp.json`. Il ne lit pas votre domicile Claude global lors d'une importation de racine de projet.

## Flux recommandé

<Steps>
  <Step title="Prévisualiser le plan">
    ```bash
    openclaw migrate claude --dry-run
    ```

    Le plan répertorie tout ce qui va changer, y compris les conflits, les éléments ignorés et les valeurs sensibles masquées des champs MCP imbriqués `env` ou `headers`.

  </Step>
  <Step title="Appliquer avec sauvegarde">
    ```bash
    openclaw migrate apply claude --yes
    ```

    OpenClaw crée et vérifie une sauvegarde avant l'application.

  </Step>
  <Step title="Exécuter le docteur">
    ```bash
    openclaw doctor
    ```

    Le [Docteur](/fr/gateway/doctor) vérifie les problèmes de configuration ou d'état après l'importation.

  </Step>
  <Step title="Redémarrer et vérifier">
    ```bash
    openclaw gateway restart
    openclaw status
    ```

    Confirmez que la passerelle est en bonne santé et que vos instructions importées, serveurs MCP et compétences sont chargés.

  </Step>
</Steps>

## Gestion des conflits

L'application refuse de continuer lorsque le plan signale des conflits (un fichier ou une valeur de configuration existe déjà à la cible).

<Warning>Relancez avec `--overwrite` uniquement lorsque le remplacement de la cible existante est intentionnel. Les fournisseurs peuvent toujours créer des sauvegardes au niveau de l'élément pour les fichiers écrasés dans le répertoire du rapport de migration.</Warning>

Pour une nouvelle installation de OpenClaw, les conflits sont inhabituels. Ils apparaissent généralement lorsque vous relancez l'importation sur une configuration qui possède déjà des modifications utilisateur.

## Sortie JSON pour l'automatisation

```bash
openclaw migrate claude --dry-run --json
openclaw migrate apply claude --json --yes
```

Avec `--json` et sans `--yes`, l'application affiche le plan et ne modifie pas l'état. C'est le mode le plus sûr pour les scripts CI et partagés.

## Dépannage

<AccordionGroup>
  <Accordion title="L'état Claude réside en dehors de ~/.claude">Passez `--from /actual/path` (CLI) ou `--import-source /actual/path` (onboarding).</Accordion>
  <Accordion title="L'intégration refuse d'importer sur une configuration existante">Les importations via l'intégration nécessitent une nouvelle configuration. Réinitialisez l'état et relancez l'intégration, ou utilisez `openclaw migrate apply claude` directement, qui prend en charge `--overwrite` et le contrôle explicite des sauvegardes.</Accordion>
  <Accordion title="Les serveurs MCP de Claude Desktop n'ont pas été importés">Claude Desktop lit `claude_desktop_config.json` à partir d'un chemin spécifique à la plateforme. Pointez `--from` vers le répertoire de ce fichier si OpenClaw ne l'a pas détecté automatiquement.</Accordion>
  <Accordion title="Les commandes Claude sont devenues des compétences avec l'invocation du modèle désactivée">Par conception. Les commandes Claude sont déclenchées par l'utilisateur, donc OpenClaw les importe en tant que compétences avec `disable-model-invocation: true`. Modifiez les métadonnées de chaque compétence si vous souhaitez que l'agent les invoque automatiquement.</Accordion>
</AccordionGroup>

## Connexes

- [`openclaw migrate`](/fr/cli/migrate) : référence complète de la CLI, contrat du plugin et structures JSON.
- [Guide de migration](/fr/install/migrating) : tous les chemins de migration.
- [Migrer depuis Hermes](/fr/install/migrating-hermes) : l'autre chemin d'importation inter-systèmes.
- [Onboarding](/fr/cli/onboard) : flux de l'assistant et indicateurs non interactifs.
- [Doctor](/fr/gateway/doctor) : vérification de l'état de santé après migration.
- [Espace de travail de l'agent](/fr/concepts/agent-workspace) : où vivent `AGENTS.md`, `USER.md` et les compétences.
