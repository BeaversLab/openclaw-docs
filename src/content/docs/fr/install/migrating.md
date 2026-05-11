---
summary: "Centre de migration : importations inter-systèmes, transferts machine-à-machine et mises à jour de plugins"
read_when:
  - You are moving OpenClaw to a new laptop or server
  - You are coming from another agent system and want to keep state
  - You are upgrading an in-place plugin
title: "Guide de migration"
---

OpenClaw prend en charge trois chemins de migration : l'importation à partir d'un autre système d'agent, le déplacement d'une installation existante vers une nouvelle machine, et la mise à jour d'un plugin sur place.

## Importer à partir d'un autre système d'agent

Utilisez les providers de migration inclus pour importer des instructions, des serveurs MCP, des compétences, la configuration du modèle et (en option) des clés API dans OpenClaw. Les plans sont prévisualisés avant toute modification, les secrets sont masqués dans les rapports et l'application est soutenue par une sauvegarde vérifiée.

<CardGroup cols={2}>
  <Card title="Migration depuis Claude" href="/fr/install/migrating-claude" icon="brain">
    Importer l'état de Claude Code et Claude Desktop, y compris `CLAUDE.md`, les serveurs MCP, les compétences et les commandes de projet.
  </Card>
  <Card title="Migration depuis Hermes" href="/fr/install/migrating-hermes" icon="feather">
    Importer la configuration Hermes, les providers, les serveurs MCP, la mémoire, les compétences et les clés `.env` prises en charge.
  </Card>
</CardGroup>

Le point d'entrée CLI est [`openclaw migrate`](/fr/cli/migrate). L'intégration peut également proposer une migration lorsqu'elle détecte une source connue (`openclaw onboard --flow import`).

## Déplacer OpenClaw vers une nouvelle machine

Copiez le **répertoire d'état** (`~/.openclaw/` par défaut) et votre **espace de travail** pour préserver :

- **Config** — `openclaw.json` et tous les paramètres de passerelle.
- **Auth** — `auth-profiles.json` par agent (clés API plus OAuth), ainsi que tout état de canal ou de provider sous `credentials/`.
- **Sessions** — historique des conversations et état de l'agent.
- **État du canal** — connexion WhatsApp, session Telegram et similaires.
- **Fichiers de l'espace de travail** — `MEMORY.md`, `USER.md`, compétences et invites.

<Tip>
Exécutez `openclaw status` sur l'ancienne machine pour confirmer le chemin de votre répertoire d'état. Les profils personnalisés utilisent `~/.openclaw-<profile>/` ou un chemin défini via `OPENCLAW_STATE_DIR`.
</Tip>

### Étapes de la migration

<Steps>
  <Step title="Arrêter la passerelle et sauvegarder">
    Sur l'**ancienne** machine, arrêtez la passerelle pour éviter que les fichiers ne changent pendant la copie, puis archivez :

    ```bash
    openclaw gateway stop
    cd ~
    tar -czf openclaw-state.tgz .openclaw
    ```

    Si vous utilisez plusieurs profils (par exemple `~/.openclaw-work`), archivez-les chacun séparément.

  </Step>

<Step title="Installer OpenClaw sur la nouvelle machine">[Installez](/fr/install) le CLI (et Node si nécessaire) sur la nouvelle machine. Il n'y a aucun problème si l'onboarding crée un nouveau `~/.openclaw/`. Vous l'écraserez ensuite.</Step>

  <Step title="Copier le répertoire d'état et l'espace de travail">
    Transférez l'archive via `scp`, `rsync -a` ou un disque externe, puis extrayez :

    ```bash
    cd ~
    tar -xzf openclaw-state.tgz
    ```

    Assurez-vous que les répertoires cachés ont été inclus et que la propriété des fichiers correspond à l'utilisateur qui exécutera la passerelle.

  </Step>

  <Step title="Exécuter Doctor et vérifier">
    Sur la nouvelle machine, exécutez [Doctor](/fr/gateway/doctor) pour appliquer les migrations de configuration et réparer les services :

    ```bash
    openclaw doctor
    openclaw gateway restart
    openclaw status
    ```

  </Step>
</Steps>

### Pièges courants

<AccordionGroup>
  <Accordion title="Inadéquation de profil ou de répertoire d'état">
    Si l'ancienne passerelle utilisait `--profile` ou `OPENCLAW_STATE_DIR` et que la nouvelle ne les utilise pas, les canaux apparaîtront déconnectés et les sessions seront vides. Lancez la passerelle avec le **même** profil ou répertoire d'état que celui que vous avez migré, puis relancez `openclaw doctor`.
  </Accordion>

  <Accordion title="Copier uniquement openclaw.">
    Le fichier de configuration seul ne suffit pas. Les profils d'authentification de modèle se trouvent sous `agents/<agentId>/agent/auth-profiles.json`, et l'état des canaux et des fournisseurs se trouve sous `credentials/`. Migrez toujours le **répertoire d'état entier**.
  </Accordion>

<Accordion title="Autorisations et propriété">Si vous avez copié en tant que root ou changé d'utilisateur, la passerelle peut échouer à lire les identifiants. Assurez-vous que le répertoire d'état et l'espace de travail appartiennent à l'utilisateur exécutant la passerelle.</Accordion>

<Accordion title="Mode distant">Si votre interface pointe vers une passerelle **distante**, l'hôte distant possède les sessions et l'espace de travail. Migrez l'hôte de la passerelle lui-même, et non votre ordinateur portable local. Voir [FAQ](/fr/help/faq#where-things-live-on-disk).</Accordion>

  <Accordion title="Secrets dans les sauvegardes">
    Le répertoire d'état contient les profils d'authentification, les identifiants de canal et d'autres états du fournisseur. Stockez les sauvegardes chiffrées, évitez les canaux de transfert non sécurisés et faites pivoter les clés si vous soupçonnez une exposition.
  </Accordion>
</AccordionGroup>

### Liste de vérification

Sur la nouvelle machine, confirmez :

- [ ] `openclaw status` indique que la passerelle est en cours d'exécution.
- [ ] Les canaux sont toujours connectés (aucun nouvel appairage nécessaire).
- [ ] Le tableau de bord s'ouvre et affiche les sessions existantes.
- [ ] Les fichiers de l'espace de travail (mémoire, configurations) sont présents.

## Mettre à jour un plugin sur place

Les mises à jour de plugin sur place conservent le même identifiant de plugin et les mêmes clés de configuration, mais peuvent déplacer l'état sur disque vers la disposition actuelle. Les guides de mise à jour spécifiques aux plugins se trouvent à côté de leurs canaux :

- [Migration Matrix](/fr/channels/matrix-migration) : limites de récupération de l'état chiffré, comportement des instantanés automatiques et commandes de récupération manuelle.

## Connexes

- [`openclaw migrate`](/fr/cli/migrate) : référence CLI pour les imports inter-systèmes.
- [Vue d'ensemble de l'installation](/fr/install) : toutes les méthodes d'installation.
- [Docteur](/fr/gateway/doctor) : vérification de l'état de santé après migration.
- [Désinstallation](/fr/install/uninstall) : supprimer OpenClaw proprement.
