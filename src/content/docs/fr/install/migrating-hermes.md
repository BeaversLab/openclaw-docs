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
  <Tab title="CLI">
    Utilisez `openclaw migrate` pour des exécutions scriptées ou reproductibles. Consultez [`openclaw migrate`](/fr/cli/migrate) pour la référence complète.

    ```bash
    openclaw migrate hermes --dry-run    # preview only
    openclaw migrate apply hermes --yes  # apply with confirmation skipped
    ```

    Ajoutez `--from <path>` lorsque Hermes se trouve en dehors de `~/.hermes`.

  </Tab>
</Tabs>

## Ce qui est importé

<AccordionGroup>
  <Accordion title="Configuration du modèle">
    - Sélection du modèle par défaut depuis Hermes `config.yaml`.
    - Fournisseurs de modèles configurés et points de terminaison personnalisés compatibles OpenAI depuis `providers` et `custom_providers`.
  </Accordion>
  <Accordion title="Serveurs MCP">
    Définitions de serveurs MCP depuis `mcp_servers` ou `mcp.servers`.
  </Accordion>
  <Accordion title="Fichiers de l'espace de travail">
    - `SOUL.md` et `AGENTS.md` sont copiés dans l'espace de travail de l'agent OpenClaw.
    - `memories/MEMORY.md` et `memories/USER.md` sont **ajoutés** aux fichiers de mémoire OpenClaw correspondants au lieu de les écraser.
  </Accordion>
  <Accordion title="Configuration de la mémoire">
    La configuration de mémoire par défaut concerne la mémoire de fichier OpenClaw. Les fournisseurs de mémoire externes tels que Honcho sont enregistrés en tant qu'éléments d'archive ou de révision manuelle afin que vous puissiez les déplacer délibérément.
  </Accordion>
  <Accordion title="Skills">
    Les Skills avec un fichier `SKILL.md` sous `skills/<name>/` sont copiées, ainsi que les valeurs de configuration par skill depuis `skills.config`.
  </Accordion>
  <Accordion title="Clés API (optionnel)">
    Définissez `--include-secrets` pour importer les clés `.env` prises en charge : `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `OPENROUTER_API_KEY`, `GOOGLE_API_KEY`, `GEMINI_API_KEY`, `GROQ_API_KEY`, `XAI_API_KEY`, `MISTRAL_API_KEY`, `DEEPSEEK_API_KEY`. Sans cet indicateur, les secrets ne sont jamais copiés.
  </Accordion>
</AccordionGroup>

## Ce qui reste en archive uniquement

Le fournisseur copie ces éléments dans le répertoire du rapport de migration pour examen manuel, mais ne les charge **pas** dans la configuration ou les identifiants OpenClaw actifs :

- `plugins/`
- `sessions/`
- `logs/`
- `cron/`
- `mcp-tokens/`
- `auth.json`
- `state.db`

OpenClaw refuse d'exécuter ou de faire confiance à cet état automatiquement car les formats et les hypothèses de confiance peuvent dériver entre les systèmes. Déplacez manuellement ce dont vous avez besoin après avoir examiné l'archive.

## Flux recommandé

<Steps>
  <Step title="Apercevoir le plan">
    ```bash
    openclaw migrate hermes --dry-run
    ```

    Le plan liste tout ce qui va changer, y compris les conflits, les éléments ignorés et tout élément sensible. La sortie du plan masque les clés imbriquées ressemblant à des secrets.

  </Step>
  <Step title="Appliquer avec sauvegarde">
    ```bash
    openclaw migrate apply hermes --yes
    ```

    OpenClaw crée et vérifie une sauvegarde avant d'appliquer. Si vous avez besoin que les clés API soient importées, ajoutez `--include-secrets`.

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

    Confirmez que la passerelle est en bonne santé et que votre model, mémoire et compétences importés sont chargés.

  </Step>
</Steps>

## Gestion des conflits

Apply refuse de continuer si le plan signale des conflits (un fichier ou une valeur de configuration existe déjà à la cible).

<Warning>Ne relancez avec `--overwrite` que lorsque le remplacement de la cible existante est intentionnel. Les fournisseurs peuvent toujours écrire des sauvegardes au niveau de l'élément pour les fichiers écrasés dans le répertoire du rapport de migration.</Warning>

Pour une nouvelle installation de OpenClaw, les conflits sont inhabituels. Ils apparaissent généralement lorsque vous relancez l'importation sur une configuration qui contient déjà des modifications utilisateur.

Si un conflit survient en cours d'application (par exemple, une course inattendue sur un fichier de configuration), Hermes marque les éléments de configuration dépendants restants comme `skipped` avec la raison `blocked by earlier apply conflict` au lieu de les écrire partiellement. Le rapport de migration enregistre chaque élément bloqué afin que vous puissiez résoudre le conflit d'origine et relancer l'importation.

## Secrets

Les secrets ne sont jamais importés par défaut.

- Exécutez d'abord `openclaw migrate apply hermes --yes` pour importer l'état non secret.
- Si vous souhaitez également que les clés `.env` prises en charge soient copiées, relancez avec `--include-secrets`.
- Pour les identifiants gérés par SecretRef, configurez la source SecretRef une fois l'importation terminée.

## Sortie JSON pour l'automatisation

```bash
openclaw migrate hermes --dry-run --json
openclaw migrate apply hermes --json --yes
```

Avec `--json` et sans `--yes`, apply affiche le plan et ne modifie pas l'état. C'est le mode le plus sûr pour la CI et les scripts partagés.

## Dépannage

<AccordionGroup>
  <Accordion title="Apply refuse avec des conflits">Inspectez la sortie du plan. Chaque conflit identifie le chemin source et la cible existante. Décidez pour chaque élément de l'ignorer, de modifier la cible ou de réexécuter avec `--overwrite`.</Accordion>
  <Accordion title="Hermes réside en dehors de ~/.hermes">Passez `--from /actual/path` (CLI) ou `--import-source /actual/path` (onboarding).</Accordion>
  <Accordion title="Onboarding refuse d'importer sur une installation existante">Les imports Onboarding nécessitent une nouvelle installation. Réinitialisez l'état et relancez l'onboarding, ou utilisez `openclaw migrate apply hermes` directement, qui prend en charge `--overwrite` et le contrôle explicite des sauvegardes.</Accordion>
  <Accordion title="Les clés API n'ont pas été importées">`--include-secrets` est requis, et seules les clés listées ci-dessus sont reconnues. Les autres variables dans `.env` sont ignorées.</Accordion>
</AccordionGroup>

## Connexes

- [`openclaw migrate`](/fr/cli/migrate) : référence complète de la CLI, contrat de plugin et formes JSON.
- [Onboarding](/fr/cli/onboard) : flux de l'assistant et indicateurs non interactifs.
- [Migrating](/fr/install/migrating) : déplacer une installation OpenClaw entre machines.
- [Doctor](/fr/gateway/doctor) : vérification de l'état de santé après migration.
- [Espace de travail de l'agent](/fr/concepts/agent-workspace) : emplacement de `SOUL.md`, `AGENTS.md` et des fichiers de mémoire.
