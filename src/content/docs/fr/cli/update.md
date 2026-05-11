---
summary: "Référence CLI pour `openclaw update` (mise à jour sécurisée des sources + redémarrage automatique de la passerelle)"
read_when:
  - You want to update a source checkout safely
  - You need to understand `--update` shorthand behavior
title: "Mise à jour"
---

# `openclaw update`

Mettre à jour OpenClaw en toute sécurité et basculer entre les canaux stable/beta/dev.

Si vous avez installé via **npm/pnpm/bun** (installation globale, sans métadonnées git),
les mises à jour se font via le flux du gestionnaire de packages dans [Mise à jour](/fr/install/updating).

## Utilisation

```bash
openclaw update
openclaw update status
openclaw update wizard
openclaw update --channel beta
openclaw update --channel dev
openclaw update --tag beta
openclaw update --tag main
openclaw update --dry-run
openclaw update --no-restart
openclaw update --yes
openclaw update --json
openclaw --update
```

## Options

- `--no-restart` : ignorer le redémarrage du service Gateway après une mise à jour réussie. Les mises à jour du gestionnaire de packages qui redémarrent le Gateway vérifient que le service redémarré signale la version mise à jour attendue avant que la commande ne réussisse.
- `--channel <stable|beta|dev>` : définir le canal de mise à jour (git + npm ; persisté dans la configuration).
- `--tag <dist-tag|version|spec>` : remplacer la cible du package pour cette mise à jour uniquement. Pour les installations de packages, `main` correspond à `github:openclaw/openclaw#main`.
- `--dry-run` : prévisualiser les actions de mise à jour planifiées (canal/tag/cible/flux de redémarrage) sans écrire la configuration, installer, synchroniser les plugins ou redémarrer.
- `--json` : afficher du JSON `UpdateRunResult` lisible par machine, y compris
  `postUpdate.plugins.integrityDrifts` lorsqu'une dérive d'artefact de plugin npm est
  détectée lors de la synchronisation des plugins après mise à jour.
- `--timeout <seconds>` : délai d'attente par étape (par défaut 1800 s).
- `--yes` : ignorer les invites de confirmation (par exemple confirmation de rétrogradation).

<Warning>Les rétrogradations nécessitent une confirmation car les anciennes versions peuvent casser la configuration.</Warning>

## `update status`

Afficher le canal de mise à jour actif + l'étiquette/branche/SHA git (pour les installations source), ainsi que la disponibilité des mises à jour.

```bash
openclaw update status
openclaw update status --json
openclaw update status --timeout 10
```

Options :

- `--json` : afficher le JSON d'état lisible par machine.
- `--timeout <seconds>` : délai d'attente pour les vérifications (par défaut 3 s).

## `update wizard`

Flux interactif pour choisir un canal de mise à jour et confirmer s'il faut redémarrer le Gateway
après la mise à jour (par défaut, redémarrage). Si vous sélectionnez `dev` sans un git checkout, il
propose d'en créer un.

Options :

- `--timeout <seconds>` : délai d'attente pour chaque étape de mise à jour (par défaut `1800`)

## Ce qu'il fait

Lorsque vous changez de canal explicitement (`--channel ...`), OpenClaw aligne également la
méthode d'installation :

- `dev` → assure un checkout git (par défaut : `~/openclaw`, remplacé par `OPENCLAW_GIT_DIR`),
  le met à jour, et installe le CLI global depuis ce checkout.
- `stable` → installe depuis npm en utilisant `latest`.
- `beta` → préfère le dist-tag npm `beta`, mais revient à `latest` si la version bêta est
  manquante ou plus ancienne que la version stable actuelle.

Le moteur de mise à jour automatique du Gateway (lorsqu'il est activé via la configuration) réutilise ce même chemin de mise à jour.

Pour les installations via gestionnaire de paquets, `openclaw update` résout la version cible du
paquet avant d'invoquer le gestionnaire de paquets. Les installations globales npm utilisent une installation
étapée : OpenClaw installe le nouveau paquet dans un préfixe npm temporaire, vérifie
l'inventaire `dist` empaqueté à cet endroit, puis échange cet arbre de paquets propre avec le
préfixe global réel. Si la vérification échoue, le médecin post-mise à jour, la synchronisation des plugins et
les tâches de redémarrage ne s'exécutent pas depuis l'arbre suspect. Même lorsque la version installée
correspond déjà à la cible, la commande rafraîchit l'installation globale du paquet,
exécute ensuite la synchronisation des plugins, un rafraîchissement de la complétion des commandes principales et les tâches de redémarrage. Cela
maintient les sidecars empaquetés et les enregistrements de plugins détenus par le canal alignés avec le
build OpenClaw installé tout en laissant les reconstructions complètes de la complétion des commandes de plugins aux
exécutions explicites de `openclaw completion --write-state`.

## Flux Git checkout

### Sélection du canal

- `stable` : checkout de la dernière balise non-bêta, puis build et doctor.
- `beta` : préférer la dernière balise `-beta`, mais revenir à la dernière balise stable si la bêta est manquante ou plus ancienne.
- `dev` : checkout de `main`, puis fetch et rebase.

### Étapes de la mise à jour

<Steps>
  <Step title="Vérifier la arborescence de travail propre">Nécessite aucune modification non commitée.</Step>
  <Step title="Changer de canal">Bascule vers le canal sélectionné (balise ou branche).</Step>
  <Step title="Récupérer en amont">Dev uniquement.</Step>
  <Step title="Pré-build (dev uniquement)">Exécute lint et le build TypeScript dans un worktree temporaire. Si le pointeur échoue, il remonte jusqu'à 10 commits pour trouver le build propre le plus récent.</Step>
  <Step title="Rebase">Effectue un rebase sur le commit sélectionné (dev uniquement).</Step>
  <Step title="Installer les dépendances">Utilise le gestionnaire de paquets du dépôt. Pour les checkouts pnpm, l'updater effectue un bootstrap de `pnpm` à la demande (via `corepack` d'abord, puis un repli temporaire `npm install pnpm@10`) au lieu d'exécuter `npm run build` dans un espace de travail pnpm.</Step>
  <Step title="Construire l'interface de contrôle">Construit la passerelle et l'interface de contrôle.</Step>
  <Step title="Exécuter le docteur">`openclaw doctor` s'exécute comme vérification finale de mise à jour sécurisée.</Step>
  <Step title="Synchroniser les plugins">Synchronise les plugins avec le channel actif. Dev utilise les plugins inclus ; stable et beta utilisent npm. Met à jour les plugins installés via npm.</Step>
</Steps>

<Warning>Si une mise à jour de plugin npm épinglée de manière exacte correspond à un artefact dont l'intégrité diffère de l'enregistrement d'installation stocké, `openclaw update` abandonne cette mise à jour d'artefact de plugin au lieu de l'installer. Réinstallez ou mettez à jour le plugin explicitement uniquement après avoir vérifié que vous faites confiance au nouvel artefact.</Warning>

<Note>
Les échecs de synchronisation des plugins après mise à jour font échouer le résultat de la mise à jour et arrêtent les travaux de redémarrage ultérieurs. Corrigez l'erreur d'installation ou de mise à jour du plugin, puis réexécutez `openclaw update`.

Lorsque le Gateway mis à jour démarre, les dépendances d'exécution des plugins inclus activés sont mises en scène avant l'activation du plugin. Les redémarrages déclenchés par la mise à jour drainent toute mise en scène active des dépendances d'exécution avant la fermeture du Gateway, de sorte que les redémarrages du service-manager n'interrompent pas une installation npm en cours.

Si le bootstrap pnpm échoue toujours, l'updater s'arrête prématurément avec une erreur spécifique au gestionnaire de paquets au lieu d'essayer `npm run build` dans le checkout.

</Note>

## Raccourci `--update`

`openclaw --update` est réécrit en `openclaw update` (utile pour les shells et les scripts de lancement).

## Connexes

- `openclaw doctor` (propose d'exécuter la mise à jour en premier sur les extraits git)
- [Canaux de développement](/fr/install/development-channels)
- [Mise à jour](/fr/install/updating)
- [Référence CLI](/fr/cli)
