---
summary: "Référence CLI pour `openclaw migrate` (importer l'état depuis un autre système d'agent)"
read_when:
  - You want to migrate from Hermes or another agent system into OpenClaw
  - You are adding a plugin-owned migration provider
title: "Migrer"
---

# `openclaw migrate`

Importez l'état depuis un autre système d'agent via un provider de migration possédé par un plugin. Les providers inclus couvrent [Claude](/fr/install/migrating-claude) et [Hermes](/fr/install/migrating-hermes) ; les plugins tiers peuvent enregistrer des providers supplémentaires.

<Tip>Pour des procédures pas à pas destinées aux utilisateurs, consultez [Migrer depuis Claude](/fr/install/migrating-claude) et [Migrer depuis Hermes](/fr/install/migrating-hermes). Le [hub de migration](/fr/install/migrating) répertorie tous les chemins.</Tip>

## Commandes

```bash
openclaw migrate list
openclaw migrate claude --dry-run
openclaw migrate hermes --dry-run
openclaw migrate hermes
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
  Génère le plan et quitte sans modifier l'état.
</ParamField>
<ParamField path="--from <path>" type="string">
  Remplace le répertoire de l'état source. Hermes utilise par défaut `~/.hermes`.
</ParamField>
<ParamField path="--include-secrets" type="boolean">
  Importe les identifiants pris en charge. Désactivé par défaut.
</ParamField>
<ParamField path="--overwrite" type="boolean">
  Autorise apply à remplacer les cibles existantes lorsque le plan signale des conflits.
</ParamField>
<ParamField path="--yes" type="boolean">
  Ignore l'invite de confirmation. Requis en mode non interactif.
</ParamField>
<ParamField path="--no-backup" type="boolean">
  Ignore la sauvegarde pre-apply. Nécessite `--force` lorsqu'un état local OpenClaw existe.
</ParamField>
<ParamField path="--force" type="boolean">
  Requis en plus de `--no-backup` lorsque apply refuserait sinon d'ignorer la sauvegarde.
</ParamField>
<ParamField path="--json" type="boolean">
  Affiche le plan ou le résultat d'apply en JSON. Avec `--json` et sans `--yes`, apply affiche le plan et ne mute pas l'état.
</ParamField>

## Modèle de sécurité

`openclaw migrate` privilégie la prévisualisation.

<AccordionGroup>
  <Accordion title="Aperçu avant application">
    Le provider renvoie un plan détaillé avant tout changement, y compris les conflits, les éléments ignorés et les éléments sensibles. Les plans JSON, les sorties d'application et les rapports de migration censurent les clés imbriquées ressemblant à des secrets, telles que les clés d'API, les jetons, les en-têtes d'autorisation, les cookies et les mots de passe.

    `openclaw migrate apply <provider>` prévisualise le plan et invite à confirmer avant de modifier l'état, sauf si `--yes` est défini. En mode non interactif, l'application nécessite `--yes`.

  </Accordion>
  <Accordion title="Sauvegardes">
    Apply crée et vérifie une sauvegarde OpenClaw avant d'appliquer la migration. Si aucun état local OpenClaw n'existe encore, l'étape de sauvegarde est ignorée et la migration peut continuer. Pour ignorer une sauvegarde lorsque l'état existe, passez à la fois `--no-backup` et `--force`.
  </Accordion>
  <Accordion title="Conflits">
    Apply refuse de continuer si le plan contient des conflits. Examinez le plan, puis réexécutez avec `--overwrite` si le remplacement des cibles existantes est intentionnel. Les providers peuvent toujours créer des sauvegardes au niveau de l'élément pour les fichiers écrasés dans le répertoire du rapport de migration.
  </Accordion>
  <Accordion title="Secrets">
    Les secrets ne sont jamais importés par défaut. Utilisez `--include-secrets` pour importer les identifiants pris en charge.
  </Accordion>
</AccordionGroup>

## Provider Claude

Le provider Claude inclus détecte l'état de Claude Code à `~/.claude` par défaut. Utilisez `--from <path>` pour importer un dossier d'accueil ou une racine de projet Claude Code spécifique.

<Tip>Pour un guide pas à pas destiné à l'utilisateur, voir [Migrer depuis Claude](/fr/install/migrating-claude).</Tip>

### Ce que Claude importe

- Projet `CLAUDE.md` et `.claude/CLAUDE.md` dans l'espace de travail de l'agent OpenClaw.
- Utilisateur `~/.claude/CLAUDE.md` ajouté à l'espace de travail `USER.md`.
- Définitions de serveur MCP à partir du projet `.mcp.json`, de Claude Code `~/.claude.json` et de Claude Desktop `claude_desktop_config.json`.
- Répertoires de compétences Claude qui incluent `SKILL.md`.
- Fichiers Markdown de commandes Claude convertis en compétences OpenClaw avec invocation manuelle uniquement.

### Archive et état de révision manuelle

Les hooks Claude, les autorisations, les valeurs par défaut de l'environnement, la mémoire locale, les règles avec portée de chemin, les sous-agents, les caches, les plans et l'historique du projet sont conservés dans le rapport de migration ou signalés comme éléments de révision manuelle. OpenClaw n'exécute pas les hooks, ne copie pas les listes d'autorisation larges et n'importe pas automatiquement l'état des identifiants OAuth/Bureau.

## Fournisseur Hermes

Le fournisseur Hermes inclus détecte l'état à `~/.hermes` par défaut. Utilisez `--from <path>` lorsque Hermes se trouve ailleurs.

### Ce que Hermes importe

- Configuration par défaut du modèle à partir de `config.yaml`.
- Fournisseurs de modèles configurés et points de terminaison personnalisés compatibles OpenAI à partir de `providers` et `custom_providers`.
- Définitions de serveur MCP à partir de `mcp_servers` ou `mcp.servers`.
- `SOUL.md` et `AGENTS.md` dans l'espace de travail de l'agent OpenClaw.
- `memories/MEMORY.md` et `memories/USER.md` ajoutés aux fichiers de mémoire de l'espace de travail.
- Valeurs par défaut de la configuration de la mémoire pour la mémoire fichier de OpenClaw, plus des éléments d'archive ou de révision manuelle pour les fournisseurs de mémoire externes tels que Honcho.
- Compétences qui incluent un fichier `SKILL.md` sous `skills/<name>/`.
- Valeurs de configuration par compétence à partir de `skills.config`.
- Clés API prises en charge à partir de `.env`, uniquement avec `--include-secrets`.

### Clés `.env` prises en charge

`OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `OPENROUTER_API_KEY`, `GOOGLE_API_KEY`, `GEMINI_API_KEY`, `GROQ_API_KEY`, `XAI_API_KEY`, `MISTRAL_API_KEY`, `DEEPSEEK_API_KEY`.

### État archive uniquement

L'état Hermes qu'OpenClaw ne peut pas interpréter en toute sécurité est copié dans le rapport de migration pour un examen manuel, mais il n'est pas chargé dans la configuration ou les identifiants actifs d'OpenClaw. Cela préserve l'état opaque ou non sécurisé sans prétendre qu'OpenClaw peut l'exécuter ou lui faire confiance automatiquement :

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

Au moment de l'exécution, le plugin appelle `api.registerMigrationProvider(...)`. Le fournisseur implémente `detect`, `plan` et `apply`. Le cœur gère l'orchestration de la CLI, la politique de sauvegarde, les invites, la sortie JSON et la pré-vérification des conflits. Le cœur transmet le plan examiné à `apply(ctx, plan)`, et les fournisseurs peuvent reconstruire le plan uniquement lorsque cet argument est absent pour des raisons de compatibilité.

Les plugins de fournisseur peuvent utiliser `openclaw/plugin-sdk/migration` pour la construction d'éléments et les comptes récapitulatifs, ainsi que `openclaw/plugin-sdk/migration-runtime` pour les copies de fichiers tenant compte des conflits, les copies de rapport d'archive uniquement et les rapports de migration.

## Intégration Onboarding

L'intégration peut proposer une migration lorsqu'un fournisseur détecte une source connue. `openclaw onboard --flow import` et `openclaw setup --wizard --import-from hermes` utilisent tous deux le même fournisseur de migration de plugin et affichent toujours un aperçu avant l'application.

<Note>Les importations Onboarding nécessitent une installation fraîche d'OpenClaw. Réinitialisez la configuration, les identifiants, les sessions et l'espace de travail d'abord si vous disposez déjà d'un état local. Les importations de type sauvegarde-plus-écrasement ou fusion sont verrouillées par fonctionnalité pour les installations existantes.</Note>

## Connexes

- [Migrating from Hermes](/fr/install/migrating-hermes) : guide pas à pas pour l'utilisateur.
- [Migrating from Claude](/fr/install/migrating-claude) : guide pas à pas pour l'utilisateur.
- [Migrating](/fr/install/migrating) : déplacer OpenClaw vers une nouvelle machine.
- [Doctor](/fr/gateway/doctor) : vérification de l'état de santé après l'application d'une migration.
- [Plugins](/fr/tools/plugin) : installation et inscription des plugins.
