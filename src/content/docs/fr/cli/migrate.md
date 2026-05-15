---
summary: "CLIRéférence CLI pour `openclaw migrate` (importer l'état depuis un autre système d'agent)"
read_when:
  - You want to migrate from Hermes or another agent system into OpenClaw
  - You are adding a plugin-owned migration provider
title: "Migrer"
---

# `openclaw migrate`

Importez l'état depuis un autre système d'agent via un provider de migration appartenant à un plugin. Les providers intégrés couvrent l'état de la CLI Codex, [Claude](CLI/en/install/migrating-claude) et [Hermes](/fr/install/migrating-hermes) ; les plugins tiers peuvent enregistrer des providers supplémentaires.

<Tip>Pour des guides pas à pas destinés aux utilisateurs, consultez [Migrer depuis Claude](/fr/install/migrating-claude) et [Migrer depuis Hermes](/fr/install/migrating-hermes). Le [hub de migration](/fr/install/migrating) répertorie tous les chemins.</Tip>

## Commandes

```bash
openclaw migrate list
openclaw migrate claude --dry-run
openclaw migrate codex --dry-run
openclaw migrate codex --skill gog-vault77-google-workspace
openclaw migrate codex --plugin google-calendar --dry-run
openclaw migrate hermes --dry-run
openclaw migrate hermes
openclaw migrate apply codex --yes --skill gog-vault77-google-workspace
openclaw migrate apply codex --yes --plugin google-calendar
openclaw migrate apply codex --yes
openclaw migrate apply claude --yes
openclaw migrate apply hermes --yes
openclaw migrate apply hermes --include-secrets --yes
openclaw onboard --flow import
openclaw onboard --import-from claude --import-source ~/.claude
openclaw onboard --import-from hermes --import-source ~/.hermes
```

<ParamField path="<provider>" type="string">
  Nom d'un provider de migration enregistré, par exemple `hermes`. Exécutez `openclaw migrate list` pour voir les providers installés.
</ParamField>
<ParamField path="--dry-run" type="boolean">
  Générer le plan et quitter sans modifier l'état.
</ParamField>
<ParamField path="--from <path>" type="string">
  Remplacer le répertoire d'état source. Hermes utilise par défaut `~/.hermes`.
</ParamField>
<ParamField path="--include-secrets" type="boolean">
  Importer les identifiants pris en charge. Désactivé par défaut.
</ParamField>
<ParamField path="--overwrite" type="boolean">
  Autoriser apply à remplacer les cibles existantes lorsque le plan signale des conflits.
</ParamField>
<ParamField path="--yes" type="boolean">
  Ignorer l'invite de confirmation. Requis en mode non interactif.
</ParamField>
<ParamField path="--skill <name>" type="string">
  Sélectionner un élément de copie de compétence par nom de compétence ou identifiant d'élément. Répétez l'option pour migrer plusieurs compétences. Si omis, les migrations interactives Codex affichent un sélecteur de cases à cocher et les migrations non interactives conservent toutes les compétences planifiées.
</ParamField>
<ParamField path="--plugin <name>" type="string">
  Sélectionner un élément d'installation de plugin Codex par nom de plugin ou identifiant d'élément. Répétez l'option pour migrer plusieurs plugins Codex. Si omis, les migrations interactives Codex affichent un sélecteur de cases à cocher natif des plugins Codex et les migrations non interactives conservent tous les plugins planifiés. Cela s'applique uniquement aux plugins Codex installés à la
  source `openai-curated` découverts par l'inventaire du serveur d'application Codex.
</ParamField>
<ParamField path="--no-backup" type="boolean">
  Ignorer la sauvegarde pré-apply. Nécessite `--force` lorsqu'un état local OpenClaw existe.
</ParamField>
<ParamField path="--force" type="boolean">
  Requis en plus de `--no-backup` lorsqu'apply refuserait sinon d'ignorer la sauvegarde.
</ParamField>
<ParamField path="--json" type="boolean">
  Afficher le plan ou le résultat de l'apply au format JSON. Avec `--json` et sans `--yes`, apply affiche le plan et ne modifie pas l'état.
</ParamField>

## Modèle de sécurité

`openclaw migrate` est d'abord en aperçu.

<AccordionGroup>
  <Accordion title="Aperçu avant application">
    Le provider renvoie un plan détaillé avant tout changement, y compris les conflits, les éléments ignorés et les éléments sensibles. Les plans JSON, la sortie d'application et les rapports de migration masquent les clés imbriquées ressemblant à des secrets, telles que les clés API, les jetons, les en-têtes d'autorisation, les cookies et les mots de passe.

    `openclaw migrate apply <provider>` prévisualise le plan et invite avant de changer l'état, sauf si `--yes` est défini. En mode non interactif, l'application nécessite `--yes`.

  </Accordion>
  <Accordion title="Sauvegardes">
    L'application crée et vérifie une sauvegarde OpenClaw avant d'appliquer la migration. Si aucun état local OpenClaw n'existe encore, l'étape de sauvegarde est ignorée et la migration peut continuer. Pour ignorer une sauvegarde lorsque l'état existe, passez à la fois `--no-backup` et `--force`.
  </Accordion>
  <Accordion title="Conflits">
    L'application refuse de continuer si le plan contient des conflits. Examinez le plan, puis réexécutez avec `--overwrite` si le remplacement des cibles existantes est intentionnel. Les providers peuvent toujours écrire des sauvegardes au niveau de l'élément pour les fichiers écrasés dans le répertoire du rapport de migration.
  </Accordion>
  <Accordion title="Secrets">
    Les secrets ne sont jamais importés par défaut. Utilisez `--include-secrets` pour importer les identifiants pris en charge.
  </Accordion>
</AccordionGroup>

## Provider Claude

Le provider Claude inclus détecte l'état de Claude Code à `~/.claude` par défaut. Utilisez `--from <path>` pour importer un répertoire d'accueil ou une racine de projet Claude Code spécifique.

<Tip>Pour un guide pas à pas, voir [Migrating from Claude](/fr/install/migrating-claude).</Tip>

### Ce que Claude importe

- Projet `CLAUDE.md` et `.claude/CLAUDE.md` dans l'espace de travail de l'agent OpenClaw.
- Utilisateur `~/.claude/CLAUDE.md` ajouté à la fin de l'espace de travail `USER.md`.
- Définitions de serveur MCP à partir du projet `.mcp.json`, Claude Code `~/.claude.json` et Claude Desktop `claude_desktop_config.json`.
- Répertoires de compétences Claude qui incluent `SKILL.md`.
- Fichiers Markdown de commandes Claude convertis en compétences OpenClaw avec invocation manuelle uniquement.

### Archive et état de révision manuelle

Les hooks Claude, les autorisations, les valeurs par défaut de l'environnement, la mémoire locale, les règles avec portée de chemin, les sous-agents, les caches, les plans et l'historique du projet sont conservés dans le rapport de migration ou signalés comme éléments de révision manuelle. OpenClaw n'exécute pas les hooks, ne copie pas les listes d'autorisation larges et n'importe pas automatiquement l'état des identifiants OAuth/Bureau.

## Provider Codex

Le provider Codex intégré détecte l'état du Codex CLI CLI par défaut à `~/.codex`, ou
à `CODEX_HOME` lorsque cette variable d'environnement est définie. Utilisez `--from <path>` pour
inventorier un répertoire personnel Codex spécifique.

Utilisez ce provider lors du passage au harnais Codex OpenClaw et lorsque vous souhaitez
promouvoir délibérément des ressources personnelles utiles du Codex CLI. Les lancements locaux du serveur d'application Codex
utilisent des répertoires `CODEX_HOME` et `HOME` par agent, ils ne lisent donc pas
votre état personnel du Codex CLI par défaut.

L'exécution de `openclaw migrate codex` dans un terminal interactif prévisualise le plan
complet, puis ouvre des sélecteurs de cases à cocher avant la confirmation finale de l'application. Les éléments de copie de compétences sont demandés en premier. Utilisez `Toggle all on` ou `Toggle all off` pour une sélection
en masse ; les compétences planifiées commencent cochées, les compétences en conflit commencent décochées, et
`Skip for now` ignore les copies de compétences pour cette exécution tout en continuant vers la sélection
de plugins. Lorsque les plugins Codex curatorés installés par la source sont migrables et
que `--plugin` n'a pas été fourni, la migration demande ensuite l'activation des plugins natifs Codex
par nom de plugin. Les éléments de plugins
commencent cochés sauf si la configuration du plugin Codex cible OpenClaw possède déjà ce
plugin. Les plugins cibles existants commencent décochés et affichent un indicateur de conflit tel que
`conflict: plugin exists` ; choisissez `Toggle all off` pour ne migrer aucun plugin natif Codex
lors de cette exécution, ou `Skip for now` pour arrêter avant l'application. Pour les exécutions scriptées ou
exactes, passez `--skill <name>` une fois par compétence, par exemple :

```bash
openclaw migrate codex --dry-run --skill gog-vault77-google-workspace
openclaw migrate apply codex --yes --skill gog-vault77-google-workspace
```

Utilisez `--plugin <name>` pour limiter de manière non interactive la migration des plugins natifs Codex
à un ou plusieurs plugins curatorés installés par la source :

```bash
openclaw migrate codex --dry-run --plugin google-calendar
openclaw migrate apply codex --yes --plugin google-calendar
```

### Ce que Codex importe

- Répertoires de compétences Codex CLI sous CLI`$CODEX_HOME/skills`, à l'exclusion du cache
  `.system` de Codex.
- AgentSkills personnels sous `$HOME/.agents/skills`OpenClaw, copiés dans l'espace de travail de
  l'agent OpenClaw actuel lorsque vous souhaitez une propriété par agent.
- Plugins Codex installés à partir de la source `openai-curated` découverts via le
  serveur d'application Codex `plugin/list`. Apply appelle le serveur d'application
  `plugin/install`OpenAI pour chaque plugin sélectionné, même si le serveur d'application
  cible signale déjà que ce plugin est installé et activé. Les plugins Codex migrés
  ne sont utilisables que dans les sessions qui sélectionnent le harnais natif Codex ;
  ils ne sont pas exposés à Pi, aux exécutions normales du fournisseur OpenAI, aux
  liaisons de conversation ACP ou à d'autres harnais.

### État Codex en revue manuelle

Les `config.toml` de Codex, les `hooks/hooks.json` natives, les
places de marché non modérées et les bundles de plugins mis en cache qui ne sont
pas des plugins modérés installés à partir de la source ne sont pas activés
automatiquement. Ils sont copiés ou signalés dans le rapport de migration pour
une revue manuelle.

Pour les plugins modérés installés à partir de la source et migrés, apply écrit :

- `plugins.entries.codex.enabled: true`
- `plugins.entries.codex.config.codexPlugins.enabled: true`
- `plugins.entries.codex.config.codexPlugins.allow_destructive_actions: false`
- une entrée de plugin explicite avec `marketplaceName: "openai-curated"` et
  `pluginName` pour chaque plugin sélectionné

La migration n'écrit jamais `plugins["*"]` et ne stocke jamais les chemins du
cache de la place de marché locale. Les installations nécessitant une authentification
sont signalées sur l'élément de plugin concerné avec `status: "skipped"`,
`reason: "auth_required"` et des identifiants d'application nettoyés. Leurs
entrées de configuration explicites sont écrites désactivées jusqu'à ce que vous les
réautorisiez et les activiez. Les autres échecs d'installation sont des résultats
`error` limités à l'élément.

Si l'inventaire des plugins du serveur d'application Codex n'est pas disponible lors
de la planification, la migration se rabat sur les éléments consultatifs des bundles
mis en cache au lieu d'échouer l'ensemble de la migration.

## Fournisseur Hermes

Le fournisseur Hermes inclus détecte l'état à `~/.hermes` par défaut.
Utilisez `--from <path>` lorsque Hermes se trouve ailleurs.

### Ce que Hermes importe

- Configuration du modèle par défaut à partir de `config.yaml`.
- Providers de modèles configurés et points de terminaison personnalisés compatibles avec OpenAI à partir de `providers` et `custom_providers`.
- Définitions de serveur MCP à partir de `mcp_servers` ou `mcp.servers`.
- `SOUL.md` et `AGENTS.md` dans l'espace de travail de l'agent OpenClaw.
- `memories/MEMORY.md` et `memories/USER.md` ajoutés aux fichiers de mémoire de l'espace de travail.
- Valeurs par défaut de configuration de la mémoire pour la mémoire de fichier OpenClaw, plus les éléments d'archive ou de révision manuelle pour les fournisseurs de mémoire externes tels que Honcho.
- Compétences qui incluent un fichier `SKILL.md` sous `skills/<name>/`.
- Valeurs de configuration par compétence à partir de `skills.config`.
- Clés API prises en charge à partir de `.env`, uniquement avec `--include-secrets`.

### Clés `.env` prises en charge

`OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `OPENROUTER_API_KEY`, `GOOGLE_API_KEY`, `GEMINI_API_KEY`, `GROQ_API_KEY`, `XAI_API_KEY`, `MISTRAL_API_KEY`, `DEEPSEEK_API_KEY`.

### État archive uniquement

L'état Hermes que OpenClaw ne peut pas interpréter en toute sécurité est copié dans le rapport de migration pour révision manuelle, mais il n'est pas chargé dans la configuration ou les informations d'identification actives de OpenClaw. Cela préserve l'état opaque ou non sécurisé sans prétendre que OpenClaw peut l'exécuter ou lui faire confiance automatiquement :

- `plugins/`
- `sessions/`
- `logs/`
- `cron/`
- `mcp-tokens/`
- `auth.json`
- `state.db`

### Après application

```bash
openclaw doctor
```

## Contrat de plugin

Les sources de migration sont des plugins. Un plugin déclare ses identifiants de fournisseur dans `openclaw.plugin.json` :

```json
{
  "contracts": {
    "migrationProviders": ["hermes"]
  }
}
```

Au moment de l'exécution, le plugin appelle `api.registerMigrationProvider(...)`. Le provider implémente `detect`, `plan` et `apply`. Le cœur gère l'orchestration de la CLI, la stratégie de sauvegarde, les invites, la sortie JSON et la vérification préalable des conflits. Le cœur transmet le plan révisé à `apply(ctx, plan)`, et les providers peuvent reconstruire le plan uniquement lorsque cet argument est absent pour des raisons de compatibilité.

Les plugins de provider peuvent utiliser `openclaw/plugin-sdk/migration` pour la construction d'éléments et les comptes de synthèse, ainsi que `openclaw/plugin-sdk/migration-runtime` pour les copies de fichiers sensibles aux conflits, les copies de rapport d'archive uniquement, les enveloppes de configuration-exécution mises en cache et les rapports de migration.

## Intégration Onboarding

L'onboarding peut proposer une migration lorsqu'un provider détecte une source connue. `openclaw onboard --flow import` et `openclaw setup --wizard --import-from hermes` utilisent le même provider de migration de plugin et affichent toujours un aperçu avant l'application.

<Note>Les importations Onboarding nécessitent une installation OpenClaw fraîche. Réinitialisez d'abord la configuration, les identifiants, les sessions et l'espace de travail si vous avez déjà un état local. Les importations de type sauvegarde-et-écrasement ou fusion sont verrouillées par fonctionnalité pour les installations existantes.</Note>

## Connexes

- [Migrating from Hermes](/fr/install/migrating-hermes%) : guide pas à pas pour l'utilisateur.
- [Migrating from Claude](/fr/install/migrating-claude%) : guide pas à pas pour l'utilisateur.
- [Migrating](/fr/install/migrating%) : déplacer OpenClaw vers une nouvelle machine.
- [Doctor](/fr/gateway/doctor%) : vérification de l'état de santé après l'application d'une migration.
- [Plugins](/fr/tools/plugin%) : installation et inscription des plugins.
