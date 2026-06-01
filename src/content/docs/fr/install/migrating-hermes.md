---
summary: "Passer de Hermes à OpenClaw avec un import prévisualisé et réversible"
read_when:
  - You are coming from Hermes and want to keep your model config, prompts, memory, and skills
  - You want to know what OpenClaw imports automatically and what stays archive-only
  - You need a clean, scripted migration path (CI, fresh laptop, automation)
title: "Migration depuis Hermes"
---

OpenClaw importe l'état de Hermes via un fournisseur de migration inclus. Le fournisseur prévisualise tout changement d'état, masque les secrets dans les plans et rapports, et crée une sauvegarde vérifiée avant l'application.

<Note>Les importations nécessitent une installation fraîche de OpenClaw. Si vous avez déjà un état local OpenClaw, réinitialisez d'abord la configuration, les identifiants, les sessions et l'espace de travail, ou utilisez `openclaw migrate` directement avec `--overwrite` après avoir examiné le plan.</Note>

## Deux méthodes d'importation

<Tabs>
  <Tab title="Assistant de configuration">
    La méthode la plus rapide. L'assistant détecte Hermes dans `~/.hermes` et affiche un aperçu avant l'application.

    ```bash
    openclaw onboard --flow import
    ```

    Ou pointez vers une source spécifique :

    ```bash
    openclaw onboard --import-from hermes --import-source ~/.hermes
    ```

  </Tab>
  <Tab title="CLICLI">
    Utilisez `openclaw migrate` pour les exécutions scriptées ou reproductibles. Consultez [`openclaw migrate`](/fr/cli/migrate) pour la référence complète.

    ```bash
    openclaw migrate hermes --dry-run    # preview only
    openclaw migrate apply hermes --yes  # apply with confirmation skipped
    ```

    Ajoutez `--from <path>` lorsque Hermes réside en dehors de `~/.hermes`.

  </Tab>
</Tabs>

## Ce qui est importé

<AccordionGroup>
  <Accordion title="Configuration du modèle">
    - Sélection du modèle par défaut depuis Hermes `config.yaml`OpenAI.
    - Fournisseurs de modèles configurés et points de terminaison personnalisés compatibles OpenAI depuis `providers` et `custom_providers`.

  </Accordion>
  <Accordion title="Serveurs MCP">
    Définitions de serveurs MCP depuis `mcp_servers` ou `mcp.servers`.
  </Accordion>
  <Accordion title="Fichiers de l'espace de travail">
    - `SOUL.md` et `AGENTS.md`OpenClaw sont copiés dans l'espace de travail de l'agent OpenClaw.
    - `memories/MEMORY.md` et `memories/USER.md`OpenClaw sont **ajoutés** aux fichiers de mémoire OpenClaw correspondants au lieu de les écraser.

  </Accordion>
  <Accordion title="Configuration de la mémoire">
    La configuration de mémoire par défaut concerne la mémoire de fichier OpenClaw. Les fournisseurs de mémoire externes tels que Honcho sont enregistrés en tant qu'éléments d'archive ou de révision manuelle afin que vous puissiez les déplacer délibérément.
  </Accordion>
  <Accordion title="Skills">
    Les Skills avec un fichier `SKILL.md` sous `skills/<name>/` sont copiées, ainsi que les valeurs de configuration par skill depuis `skills.config`.
  </Accordion>
  <Accordion title="Auth credentials">
    Le `openclaw migrate`OAuth interactif demande avant d'importer les identifiants d'authentification, avec « oui » sélectionné par défaut. Les importations acceptées incluent les identifiants OAuth pris en charge de Hermes `auth.json`OpenAIOAuth, les identifiants OAuth OpenCode OpenAI d'OpenCode `auth.json`GitHub, les entrées OpenCode et GitHub Copilot d'OpenCode `auth.json`, et les [clés `.env` prises en charge](/fr/cli/migrate#supported-env-keys). Utilisez `--include-secrets` pour l'importation d'identifiants `openclaw migrate` non interactive, `--no-auth-credentials` pour l'ignorer, ou l'onboarding `--import-secrets` lors de l'importation depuis l'assistant de configuration.
  </Accordion>
</AccordionGroup>

## Ce qui reste en archive uniquement

Le fournisseur copie ces éléments dans le répertoire du rapport de migration pour examen manuel, mais ne les charge **pas** dans la configuration ou les identifiants OpenClaw actifs :

- `plugins/`
- `sessions/`
- `logs/`
- `cron/`
- `mcp-tokens/`
- `state.db`

OpenClaw refuse d'exécuter ou de faire confiance à cet état automatiquement, car les formats et les hypothèses de confiance peuvent dériver entre les systèmes. Déplacez manuellement ce dont vous avez besoin après avoir passé en revue l'archive.

## Flux recommandé

<Steps>
  <Step title="Preview the plan">
    ```bash
    openclaw migrate hermes --dry-run
    ```

    Le plan répertorie tout ce qui va changer, y compris les conflits, les éléments ignorés et tout élément sensible. La sortie du plan masque les clés imbriquées ressemblant à des secrets.

  </Step>
  <Step title="Appliquer avec sauvegarde">
    ```bash
    openclaw migrate apply hermes --yes
    ```OpenClaw

    OpenClaw crée et vérifie une sauvegarde avant d'appliquer. Cet exemple non interactif importe l'état non secret. Exécutez sans `--yes` pour répondre à l'invite d'identification, ou ajoutez `--include-secrets` pour inclure les identifiants pris en charge lors des exécutions sans surveillance.

  </Step>
  <Step title="Exécuter le docteur">
    ```bash
    openclaw doctor
    ```

    [Doctor](/fr/gateway/doctor) réapplique toutes les migrations de configuration en attente et vérifie les problèmes introduits lors de l'importation.

  </Step>
  <Step title="Redémarrer et vérifier">
    ```bash
    openclaw gateway restart
    openclaw status
    ```

    Confirmez que la passerelle est en bonne santé et que votre modèle, mémoire et compétences importés sont chargés.

  </Step>
</Steps>

## Gestion des conflits

Apply refuse de continuer lorsque le plan signale des conflits (un fichier ou une valeur de configuration existe déjà à la cible).

<Warning>Réexécutez avec `--overwrite` uniquement lorsque le remplacement de la cible existant est intentionnel. Les fournisseurs peuvent toujours écrire des sauvegardes au niveau de l'élément pour les fichiers écrasés dans le répertoire du rapport de migration.</Warning>

Pour une nouvelle installation d'OpenClaw, les conflits sont inhabituels. Ils apparaissent généralement lorsque vous réexécutez l'importation sur une configuration qui possède déjà des modifications utilisateur.

Si un conflit survient en cours d'application (par exemple, une course inattendue sur un fichier de configuration), Hermes marque les éléments de configuration dépendants restants comme `skipped` avec la raison `blocked by earlier apply conflict` au lieu de les écrire partiellement. Le rapport de migration enregistre chaque élément bloqué afin que vous puissiez résoudre le conflit d'origine et réexécuter l'importation.

## Secrets

Le mode interactif `openclaw migrate` demande s'il faut importer les identifiants d'authentification détectés, avec oui sélectionné par défaut.

- Accepter l'invite importe les informations d'identification OAuth prises en charge de Hermes OAuth`auth.json`OpenAIOAuth, les informations d'identification OAuth OpenCode OpenAI d'OpenCode `auth.json`GitHub, les entrées OpenCode et GitHub Copilot d'OpenCode `auth.json`, et les [clés `.env` prises en charge](/fr/cli/migrate#supported-env-keys).
- Utilisez `--no-auth-credentials` ou choisissez no à l'invite pour importer uniquement l'état non secret.
- Utilisez `--include-secrets` lors d'une exécution non surveillée avec `--yes`.
- Utilisez onboarding `--import-secrets` lors de l'importation d'informations d'identification à partir de l'assistant de configuration.
- Pour les informations d'identification gérées par SecretRef, configurez la source SecretRef une fois l'importation terminée.

## Sortie JSON pour l'automatisation

```bash
openclaw migrate hermes --dry-run --json
openclaw migrate apply hermes --json --yes
```

Avec `--json` et sans `--yes`, apply imprime le plan et ne modifie pas l'état. C'est le mode le plus sûr pour les CI et les scripts partagés.

## Dépannage

<AccordionGroup>
  <Accordion title="Apply refuses with conflicts">Inspectez la sortie du plan. Chaque conflit identifie le chemin source et la cible existante. Décidez pour chaque élément de passer, de modifier la cible, ou de réexécuter avec `--overwrite`.</Accordion>
  <Accordion title="Hermes lives outside ~/.hermes">Passez `--from /actual/path`CLI (CLI) ou `--import-source /actual/path` (onboarding).</Accordion>
  <Accordion title="Onboarding refuses to import on an existing setup">Les importations via l'assistant de configuration nécessitent une nouvelle installation. Réinitialisez soit l'état et relancez la configuration, soit utilisez `openclaw migrate apply hermes` directement, qui prend en charge `--overwrite` et le contrôle explicite des sauvegardes.</Accordion>
  <Accordion title="APILes clés API n'ont pas été importées">
    L'importation interactive `openclaw migrate`API n'importe les clés API que si vous acceptez l'invite d'identification. Les exécutions non interactives `--yes` nécessitent `--include-secrets` ; les importations d'onboarding nécessitent `--import-secrets`. Seules les [clés `.env` prises en charge](/fr/cli/migrate#supported-env-keys) sont reconnues ; les autres variables dans `.env` sont
    ignorées.
  </Accordion>
</AccordionGroup>

## Connexes

- [`openclaw migrate`](/fr/cli/migrateCLI) : référence complète de la CLI, contrat de plugin et formes JSON.
- [Onboarding](/fr/cli/onboard) : flux de l'assistant et indicateurs non interactifs.
- [Migrating](/fr/install/migratingOpenClaw) : déplacer une installation OpenClaw entre machines.
- [Doctor](/fr/gateway/doctor) : vérification de l'état de santé après la migration.
- [Agent workspace](/fr/concepts/agent-workspace) : emplacement où résident `SOUL.md`, `AGENTS.md` et les fichiers de mémoire.
