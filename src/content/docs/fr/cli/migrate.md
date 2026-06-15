---
summary: "CLIRéférence CLI pour `openclaw migrate` (importer l'état d'un autre système d'agent)"
read_when:
  - You want to migrate from Hermes or another agent system into OpenClaw
  - You are adding a plugin-owned migration provider
title: "Migrer"
---

# `openclaw migrate`

Importez l'état depuis un autre système d'agent via un provider de migration appartenant à un plugin. Les providers inclus couvrent l'état CLI de Codex, [Claude](CLI/en/install/migrating-claude) et [Hermes](/fr/install/migrating-hermes) ; les plugins tiers peuvent enregistrer des providers supplémentaires.

<Tip>Pour des procédures pas à pas destinées aux utilisateurs, voir [Migrating from Claude](/fr/install/migrating-claude) et [Migrating from Hermes](/fr/install/migrating-hermes). Le [hub de migration](/fr/install/migrating) répertorie tous les chemins.</Tip>

## Commandes

```bash
openclaw migrate list
openclaw migrate claude --dry-run
openclaw migrate codex --dry-run
openclaw migrate codex --skill gog-vault77-google-workspace
openclaw migrate codex --plugin google-calendar --dry-run
openclaw migrate codex --plugin google-calendar --verify-plugin-apps --dry-run
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
  Nom d'un fournisseur de migration enregistré, par exemple `hermes`. Exécutez `openclaw migrate list` pour voir les fournisseurs installés.
</ParamField>
<ParamField path="--dry-run" type="boolean">
  Génère le plan et quitte sans modifier l'état.
</ParamField>
<ParamField path="--from <path>" type="string">
  Remplace le répertoire de l'état source. Hermes par défaut est `~/.hermes`.
</ParamField>
<ParamField path="--include-secrets" type="boolean">
  Importe les identifiants pris en charge sans demander. L'application interactive demande avant d'importer les identifiants d'authentification détectés, avec oui sélectionné par défaut ; l'application non interactive `--yes` nécessite `--include-secrets` pour les importer.
</ParamField>
<ParamField path="--no-auth-credentials" type="boolean">
  Ignore l'importation des identifiants d'authentification, y compris l'invite interactive.
</ParamField>
<ParamField path="--overwrite" type="boolean">
  Autorise l'application à remplacer les cibles existantes lorsque le plan signale des conflits.
</ParamField>
<ParamField path="--yes" type="boolean">
  Ignore l'invite de confirmation. Requis en mode non interactif.
</ParamField>
<ParamField path="--skill <name>" type="string">
  Sélectionne un élément de copie de compétence par nom de compétence ou ID d'élément. Répétez l'indicateur pour migrer plusieurs compétences. Si omis, les migrations Codex interactives affichent un sélecteur de cases à cocher et les migrations non interactives conservent toutes les compétences planifiées.
</ParamField>
<ParamField path="--plugin <name>" type="string">
  Sélectionne un élément d'installation de plugin Codex par nom de plugin ou ID d'élément. Répétez l'indicateur pour migrer plusieurs plugins Codex. Si omis, les migrations Codex interactives affichent un sélecteur de cases à cocher natif de plugin Codex et les migrations non interactives conservent tous les plugins planifiés. Cela s'applique uniquement aux plugins Codex installés à la source
  `openai-curated` découverts par l'inventaire du serveur d'application Codex.
</ParamField>
<ParamField path="--verify-plugin-apps" type="boolean">
  Codex uniquement. Force une nouvelle traversée `app/list` du serveur d'application Codex source avant de planifier l'activation des plugins natifs. Désactivé par défaut pour accélérer la planification de la migration.
</ParamField>
<ParamField path="--no-backup" type="boolean">
  Ignore la sauvegarde avant application. Nécessite `--force`OpenClaw lorsque l'état local OpenClaw existe.
</ParamField>
<ParamField path="--force" type="boolean">
  Requis avec `--no-backup` lorsque l'application refuserait autrement d'ignorer la sauvegarde.
</ParamField>
<ParamField path="--json" type="boolean">
  Affiche le plan ou le résultat de l'application au format JSON. Avec `--json` et sans `--yes`, l'application affiche le plan et ne modifie pas l'état.
</ParamField>

## Modèle de sécurité

`openclaw migrate` privilégie d'abord l'aperçu.

<AccordionGroup>
  <Accordion title="Aperçu avant application">
    Le provider renvoie un plan détaillé avant tout changement, y compris les conflits, les éléments ignorés et les éléments sensibles. Les plans JSON, la sortie d'application et les rapports de migration masquent les clés imbriquées ressemblant à des secrets, telles que les clés API, les jetons, les en-têtes d'autorisation, les cookies et les mots de passe.

    `openclaw migrate apply <provider>` prévisualise le plan et demande confirmation avant de modifier l'état, sauf si `--yes` est défini. En mode non interactif, l'application nécessite `--yes`.

  </Accordion>
  <Accordion title="Sauvegardes">
    Apply crée et vérifie une sauvegarde OpenClaw avant d'appliquer la migration. Si aucun état local OpenClaw n'existe encore, l'étape de sauvegarde est ignorée et la migration peut continuer. Pour ignorer une sauvegarde lorsque l'état existe, transmettez à la fois `--no-backup` et `--force`.
  </Accordion>
  <Accordion title="Conflits">
    Apply refuse de continuer si le plan contient des conflits. Consultez le plan, puis réexécutez avec `--overwrite` si le remplacement des cibles existantes est intentionnel. Les providers peuvent toujours créer des sauvegardes au niveau de l'élément pour les fichiers écrasés dans le répertoire du rapport de migration.
  </Accordion>
  <Accordion title="Secrets">
    L'application interactive demande s'il faut importer les informations d'authentification détectées, « oui » étant sélectionné par défaut. Utilisez `--no-auth-credentials` pour les ignorer, ou utilisez `--include-secrets` pour une importation d'informations d'authentification sans surveillance avec `--yes`.
  </Accordion>
</AccordionGroup>

## Provider Claude

Le provider Claude intégré détecte l'état de Claude Code à `~/.claude` par défaut. Utilisez `--from <path>` pour importer un domicile Claude Code ou une racine de projet spécifique.

<Tip>Pour une procédure pas à pas destinée aux utilisateurs, voir [Migrating from Claude](/fr/install/migrating-claude).</Tip>

### Ce que Claude importe

- Projet `CLAUDE.md` et `.claude/CLAUDE.md` dans l'espace de travail de l'agent OpenClaw.
- Utilisateur `~/.claude/CLAUDE.md` ajouté à l'espace de travail `USER.md`.
- Définitions de serveur MCP à partir du projet `.mcp.json`, de Claude Code `~/.claude.json` et de Claude Desktop `claude_desktop_config.json`.
- Répertoires de compétences Claude qui incluent `SKILL.md`.
- Fichiers Markdown de commandes Claude convertis en compétences OpenClaw avec invocation manuelle uniquement.

### Archive et état de révision manuelle

Les hooks Claude, les autorisations, les valeurs par défaut de l'environnement, la mémoire locale, les règles avec portée de chemin, les sous-agents, les caches, les plans et l'historique du projet sont conservés dans le rapport de migration ou signalés comme éléments de révision manuelle. OpenClaw n'exécute pas les hooks, ne copie pas les listes d'autorisation larges et n'importe pas automatiquement l'état des identifiants OAuth/Bureau.

## Provider Codex

Le provider Codex intégré détecte l'état du Codex CLI à `~/.codex` par défaut, ou
à `CODEX_HOME` lorsque cette variable d'environnement est définie. Utilisez `--from <path>` pour
inventorier un domicile Codex spécifique.

Utilisez ce provider lorsque vous passez au harnais Codex OpenClaw et que vous souhaitez
promouvoir délibérément des assets personnels utiles du Codex CLI. Les lancements locaux du serveur d'application Codex
utilisent un `CODEX_HOME` par agent, ils ne lisent donc pas votre
`~/.codex` personnel par défaut. Le processus normal `HOME` est toujours hérité, Codex peut donc voir les entrées partagées du marché de compétences/plugins `$HOME/.agents/*` et
les sous-processus peuvent trouver la configuration et les jetons du domicile de l'utilisateur.

L'exécution de `openclaw migrate codex` dans un terminal interactif prévisualise le plan complet, puis ouvre des sélecteurs de cases à cocher avant la confirmation finale de l'application. Les éléments de copie de compétences sont d'abord demandés. Utilisez `Toggle all on` ou `Toggle all off` pour une sélection en masse. Appuyez sur Espace pour activer/désactiver les lignes, ou sur Entrée pour activer la ligne en surbrillance et continuer. Les compétences planifiées commencent cochées, les compétences en conflit commencent décochées, et `Skip for now` ignore les copies de compétences pour cette exécution tout en continuant vers la sélection des plugins. Lorsque les plugins Codex sélectionnés installés à la source sont migrables et que `--plugin` n'a pas été fourni, la migration demande ensuite l'activation des plugins Codex natifs par nom de plugin. Les éléments de plugin commencent cochés, sauf si la configuration du plugin Codex OpenClaw cible possède déjà ce plugin. Les plugins cibles existants commencent décochés et affichent un indicateur de conflit tel que `conflict: plugin exists` ; choisissez `Toggle all off` pour ne migrer aucun plugin Codex natif lors de cette exécution, ou `Skip for now` pour arrêter avant d'appliquer. Pour les exécutions scriptées ou exactes, passez `--skill <name>` une fois par compétence, par exemple :

```bash
openclaw migrate codex --dry-run --skill gog-vault77-google-workspace
openclaw migrate apply codex --yes --skill gog-vault77-google-workspace
```

Utilisez `--plugin <name>` pour limiter de manière non interactive la migration des plugins Codex natifs à un ou plusieurs plugins sélectionnés installés à la source :

```bash
openclaw migrate codex --dry-run --plugin google-calendar
openclaw migrate apply codex --yes --plugin google-calendar
```

### Ce que Codex importe

- Répertoires de compétences Codex CLI sous `$CODEX_HOME/skills`, à l'exclusion du cache `.system` de Codex.
- AgentSkills personnels sous `$HOME/.agents/skills`, copiés dans l'espace de travail de l'agent OpenClaw actuel lorsque vous souhaitez une propriété par agent.
- Les plugins Codex installés par source `openai-curated` découverts via Codex
  app-server `plugin/list`. La planification lit `plugin/read` pour chaque plugin
  installé activé. Les plugins pris en charge par l'application nécessitent que la réponse du compte
  app-server Codex source soit un compte d'abonnement ChatGPT ; les réponses de compte non-ChatGPT ou manquantes
  sont ignorées avec `codex_subscription_required`. Par défaut,
  la migration n'appelle pas la source `app/list`, donc les plugins pris en charge par l'application qui franchissent
  la barrière du compte sont planifiés sans vérification de l'accessibilité de l'application source, et
  les échecs de transport de recherche de compte sont ignorés avec `codex_account_unavailable`. Passez
  `--verify-plugin-apps` lorsque vous souhaitez que la migration force une nouvelle capture instantanée de la source
  `app/list` et exige que chaque application détenue soit présente, activée et
  accessible avant de planifier l'activation native. Dans ce mode, les échecs de transport de recherche de compte
  aboutissent à la vérification de l'inventaire des applications sources. La capture instantanée de l'inventaire des
  applications sources est conservée en mémoire pour le processus actuel ; elle n'est pas écrite dans la sortie de
  migration ou la configuration cible. Les plugins désactivés, les détails de plugin illisibles, les comptes sources
  soumis à un abonnement, et, lorsque la vérification est demandée, les applications manquantes, désactivées,
  inaccessibles ou les échecs de l'inventaire des applications sources deviennent des éléments ignorés manuellement
  avec des raisons typées au lieu d'entrées de configuration cible.
  Apply appelle app-server `plugin/install` pour chaque plugin éligible sélectionné,
  même si l'app-server cible signale déjà que ce plugin est installé et activé.
  Les plugins Codex migrés ne sont utilisables que dans les sessions qui sélectionnent le harnais Codex natif ;
  ils ne sont pas exposés aux exécutions du provider OpenClaw,
  aux liaisons de conversation ACP ou aux autres harnais.

### État Codex en revue manuelle

Codex `config.toml`, `hooks/hooks.json` natifs, les places de marché non sélectionnées, les
bundles de plugins mis en cache qui ne sont pas des plugins installés par source sélectionnés, et les plugins installés
par source qui échouent à la barrière de l'abonnement source ne sont pas activés automatiquement.
Lorsque `--verify-plugin-apps` est défini, les plugins qui échouent à la barrière de l'inventaire des
applications source sont également ignorés. Ils sont copiés ou signalés dans le rapport de migration pour
un examen manuel.

Pour les plugins modérés installés à partir de la source et migrés, apply écrit :

- `plugins.entries.codex.enabled: true`
- `plugins.entries.codex.config.codexPlugins.enabled: true`
- `plugins.entries.codex.config.codexPlugins.allow_destructive_actions: true`
- une entrée de plugin explicite avec `marketplaceName: "openai-curated"` et
  `pluginName` pour chaque plugin sélectionné

La migration n'écrit jamais `plugins["*"]` et ne stocke jamais les chemins de cache local du marketplace.
Les échecs d'abstraction côté source sont signalés sur les éléments manuels avec des
raisons typées telles que `codex_subscription_required`, `codex_account_unavailable`,
`plugin_disabled`, ou `plugin_read_unavailable`. Avec `--verify-plugin-apps`,
les échecs d'inventaire d'application source peuvent également apparaître comme `app_inaccessible`,
`app_disabled`, `app_missing`, ou `app_inventory_unavailable`. Les plugins ignorés
ne sont pas écrits dans la configuration cible.
Les installations nécessitant une authentification côté cible sont signalées sur l'élément de plugin concerné avec
`status: "skipped"`, `reason: "auth_required"`, et des identifiants d'application nettoyés.
Leurs entrées de configuration explicites sont écrites désactivées jusqu'à ce que vous les autorisiez à nouveau et
les activiez. Les autres échecs d'installation sont des résultats `error` limités à l'élément.

La configuration du plugin natif Codex accepte également les identités du marché `openai-bundled` et
`openai-primary-runtime` de première partie, mais la migration ne
découvre pas automatiquement ni ne les installe depuis l'état source.

La disponibilité des applications/plugins côté OpenAI provient toujours du compte Codex
connecté et des contrôles des applications de l'espace de travail. Voir
[Using Codex with your ChatGPT plan](https://help.openai.com/en/articles/11369540-using-codex-with-your-chatgpt-plan)
pour un aperçu des comptes et des contrôles d'espace de travail de OpenAI, puis utilisez
[Native Codex plugins](/fr/plugins/codex-native-plugins#manual-first-party-marketplace-entries)
pour les entrées manuelles du marché de première partie.

Si l'inventaire des plugins du serveur d'applications Codex est indisponible lors de la planification, la migration
revient aux éléments de conseil du bundle mis en cache au lieu d'échouer toute la
migration.

## Provider Hermes

Le provider Hermes inclus détecte l'état à `~/.hermes` par défaut. Utilisez `--from <path>` lorsque Hermes réside ailleurs.

### Ce que Hermes importe

- Configuration du modèle par défaut depuis `config.yaml`.
- Providers de modèles configurés et points de terminaison personnalisés compatibles avec OpenAI depuis `providers` et `custom_providers`.
- Définitions de serveur MCP depuis `mcp_servers` ou `mcp.servers`.
- `SOUL.md` et `AGENTS.md` dans l'espace de travail de l'agent OpenClaw.
- `memories/MEMORY.md` et `memories/USER.md` ajoutés aux fichiers de mémoire de l'espace de travail.
- Valeurs par défaut de la configuration de la mémoire pour la mémoire de fichiers OpenClaw, ainsi que les éléments d'archive ou de révision manuelle pour les fournisseurs de mémoire externe tels que Honcho.
- Compétences incluant un fichier `SKILL.md` sous `skills/<name>/`.
- Valeurs de configuration par compétence issues de `skills.config`.
- Informations d'identification OpenAI OpenCode OAuth issues d'OpenCode `auth.json` lorsque la migration interactive des informations d'identification est acceptée, ou lorsque `--include-secrets` est défini. Les entrées OAuth Hermes `auth.json` sont un état hérité signalé pour une réauthentification OpenAI manuelle ou une réparation via le docteur.
- Clés et jetons API pris en charge issus d'`.env` Hermes et d'OpenCode `auth.json` lorsque la migration interactive des informations d'identification est acceptée, ou lorsque `--include-secrets` est défini.

### Clés `.env` prises en charge

- `AI_GATEWAY_API_KEY`
- `ALIBABA_API_KEY`
- `ANTHROPIC_API_KEY`
- `ARCEEAI_API_KEY`
- `CEREBRAS_API_KEY`
- `CHUTES_API_KEY`
- `CLOUDFLARE_AI_GATEWAY_API_KEY`
- `COPILOT_GITHUB_TOKEN`
- `DASHSCOPE_API_KEY`
- `DEEPINFRA_API_KEY`
- `DEEPSEEK_API_KEY`
- `FIREWORKS_API_KEY`
- `GEMINI_API_KEY`
- `GH_TOKEN`
- `GITHUB_TOKEN`
- `GLM_API_KEY`
- `GOOGLE_API_KEY`
- `GROQ_API_KEY`
- `HF_TOKEN`
- `HUGGINGFACE_HUB_TOKEN`
- `KILOCODE_API_KEY`
- `KIMICODE_API_KEY`
- `KIMI_API_KEY`
- `MINIMAX_API_KEY`
- `MINIMAX_CODING_API_KEY`
- `MISTRAL_API_KEY`
- `MODELSTUDIO_API_KEY`
- `MOONSHOT_API_KEY`
- `NVIDIA_API_KEY`
- `OPENAI_API_KEY`
- `OPENCODE_API_KEY`
- `OPENCODE_GO_API_KEY`
- `OPENCODE_ZEN_API_KEY`
- `OPENROUTER_API_KEY`
- `QIANFAN_API_KEY`
- `QWEN_API_KEY`
- `TOGETHER_API_KEY`
- `VENICE_API_KEY`
- `XAI_API_KEY`
- `XIAOMI_API_KEY`
- `ZAI_API_KEY`
- `Z_AI_API_KEY`

### État d'archive uniquement

L'état Hermes que OpenClaw ne peut pas interpréter en toute sécurité est copié dans le rapport de migration pour un examen manuel, mais il n'est pas chargé dans la configuration ou les informations d'identification actives de OpenClaw. Cela préserve l'état opaque ou non sécurisé sans prétendre que OpenClaw peut l'exécuter ou lui faire confiance automatiquement :

- `plugins/`
- `sessions/`
- `logs/`
- `cron/`
- `mcp-tokens/`
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

Au moment de l'exécution, le plugin appelle `api.registerMigrationProvider(...)`. Le fournisseur implémente `detect`, `plan` et `apply`. Le cœur gère l'orchestration CLI, la politique de sauvegarde, les invites, la sortie JSON et la vérification préalable des conflits. Le cœur transmet le plan examiné à `apply(ctx, plan)`, et les fournisseurs peuvent reconstruire le plan uniquement lorsque cet argument est absent pour des raisons de compatibilité.

Les plugins de fournisseur peuvent utiliser `openclaw/plugin-sdk/migration` pour la construction d'éléments et les comptes récapitulatifs, ainsi que `openclaw/plugin-sdk/migration-runtime` pour les copies de fichiers tenant compte des conflits, les copies de rapports d'archive uniquement, les wrappers de configuration-exécution mis en cache et les rapports de migration.

## Intégration Onboarding

Onboarding peut proposer la migration lorsqu'un fournisseur détecte une source connue. `openclaw onboard --flow import` et `openclaw setup --wizard --import-from hermes` utilisent le même fournisseur de migration de plugin et affichent toujours un aperçu avant l'application.

<Note>Les importations Onboarding nécessitent une installation OpenClaw fraîche. Réinitialisez la configuration, les informations d'identification, les sessions et l'espace de travail d'abord si vous avez déjà un état local. Les importations de type sauvegarde-et-remplacement ou fusion sont des fonctionnalités réservées aux installations existantes.</Note>

## Connexes

- [Migrating from Hermes](/fr/install/migrating-hermes) : guide pas à pas pour l'utilisateur.
- [Migrating from Claude](/fr/install/migrating-claude) : guide pas à pas pour l'utilisateur.
- [Migrating](/fr/install/migrating) : déplacer OpenClaw vers une nouvelle machine.
- [Doctor](/fr/gateway/doctor) : vérification de l'état de santé après avoir appliqué une migration.
- [Plugins](/fr/tools/plugin) : installation et enregistrement de plugins.
