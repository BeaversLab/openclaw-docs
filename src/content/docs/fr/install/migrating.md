---
summary: "Déplacer (migrer) une installation OpenClaw d'une machine à une autre"
read_when:
  - You are moving OpenClaw to a new laptop/server
  - You want to preserve sessions, auth, and channel logins (WhatsApp, etc.)
title: "Guide de migration"
---

# Migration de OpenClaw vers une nouvelle machine

Ce guide déplace une passerelle OpenClaw vers une nouvelle machine sans avoir à refaire l'onboarding.

## Ce qui est migré

Lorsque vous copiez le **répertoire d'état** (`~/.openclaw/` par défaut) et votre **espace de travail**, vous conservez :

- **Config** -- `openclaw.json` et tous les paramètres de la passerelle
- **Auth** -- par agent `auth-profiles.json` (clés API + OAuth), ainsi que tout état de canal/provider sous `credentials/`
- **Sessions** -- historique des conversations et état de l'agent
- **État du canal** -- connexion WhatsApp, session Telegram, etc.
- **Fichiers de l'espace de travail** -- `MEMORY.md`, `USER.md`, compétences et invites

<Tip>
Exécutez `openclaw status` sur l'ancienne machine pour confirmer le chemin de votre répertoire d'état.
Les profils personnalisés utilisent `~/.openclaw-<profile>/` ou un chemin défini via `OPENCLAW_STATE_DIR`.
</Tip>

## Étapes de migration

<Steps>
  <Step title="Arrêtez la passerelle et sauvegardez">
    Sur l'ancienne machine, arrêtez la passerelle afin que les fichiers ne changent pas en cours de copie, puis archivez :

    ```bash
    openclaw gateway stop
    cd ~
    tar -czf openclaw-state.tgz .openclaw
    ```

    Si vous utilisez plusieurs profils (p. ex. `~/.openclaw-work`), archivez-les séparément.

  </Step>

<Step title="Installez OpenClaw sur la nouvelle machine">[Installez](/fr/install) la CLI (et Node si nécessaire) sur la nouvelle machine. Ce n'est pas grave si l'onboarding crée un nouveau `~/.openclaw/` -- vous allez l'écraser ensuite.</Step>

  <Step title="Copiez le répertoire d'état et l'espace de travail">
    Transférez l'archive via `scp`, `rsync -a` ou un disque externe, puis extrayez :

    ```bash
    cd ~
    tar -xzf openclaw-state.tgz
    ```

    Assurez-vous que les répertoires cachés ont été inclus et que la propriété des fichiers correspond à l'utilisateur qui exécutera la passerelle.

  </Step>

  <Step title="Exécutez le docteur et vérifiez">
    Sur la nouvelle machine, exécutez [Doctor](/fr/gateway/doctor) pour appliquer les migrations de configuration et réparer les services :

    ```bash
    openclaw doctor
    openclaw gateway restart
    openclaw status
    ```

  </Step>
</Steps>

## Pièges courants

<AccordionGroup>
  <Accordion title="Inadéquation de profil ou de state-dir">
    Si l'ancienne passerelle utilisait `--profile` ou `OPENCLAW_STATE_DIR` et que la nouvelle ne le fait pas,
    les canaux apparaîtront déconnectés et les sessions seront vides.
    Lancez la passerelle avec le **même** profil ou state-dir que vous avez migré, puis réexécutez `openclaw doctor`.
  </Accordion>

  <Accordion title="Copier uniquement openclaw.">
    Le fichier de configuration seul ne suffit pas. Les profils d'authentification des modèles se trouvent sous
    `agents/<agentId>/agent/auth-profiles.json`, et l'état des canaux/fournisseurs se trouve
    toujours sous `credentials/`. Migrez toujours le répertoire d'état **entier**.
  </Accordion>

<Accordion title="Autorisations et propriété">Si vous avez copié en tant que root ou changé d'utilisateur, la passerelle risque de ne pas pouvoir lire les identifiants. Assurez-vous que le répertoire d'état et l'espace de travail appartiennent à l'utilisateur exécutant la passerelle.</Accordion>

<Accordion title="Mode distant">Si votre interface pointe vers une passerelle **distante**, l'hôte distant possède les sessions et l'espace de travail. Migrez l'hôte de la passerelle lui-même, et non votre ordinateur portable local. Voir [FAQ](/fr/help/faq#where-things-live-on-disk).</Accordion>

  <Accordion title="Secrets dans les sauvegardes">
    Le répertoire d'état contient les profils d'authentification, les identifiants des canaux et d'autres
    états de fournisseur.
    Stockez les sauvegardes chiffrées, évitez les canaux de transfert non sécurisés et faites tourner les clés si vous soupçonnez une exposition.
  </Accordion>
</AccordionGroup>

## Liste de vérification

Sur la nouvelle machine, confirmez :

- [ ] `openclaw status` indique que la passerelle est en cours d'exécution
- [ ] Les canaux sont toujours connectés (aucun ré-appairage nécessaire)
- [ ] Le tableau de bord s'ouvre et affiche les sessions existantes
- [ ] Les fichiers de l'espace de travail (mémoire, configurations) sont présents
