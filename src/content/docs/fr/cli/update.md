---
summary: "Référence CLI pour `openclaw update` (mise à jour sécurisée des sources + redémarrage automatique de la passerelle)"
read_when:
  - You want to update a source checkout safely
  - You are debugging `openclaw update` output or options
  - You need to understand `--update` shorthand behavior
title: "Mise à jour"
---

# `openclaw update`

Mettre à jour OpenClaw en toute sécurité et basculer entre les canaux stable/beta/dev.

Si vous avez installé via **npm/pnpm/bun** (installation globale, sans métadonnées git),
les mises à jour se font via le flux du gestionnaire de paquets dans [Mise à jour](/fr/install/updating).

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

- `--no-restart` : ignorer le redémarrage du service Gateway après une mise à jour réussie. Les mises à jour du gestionnaire de paquets qui redémarrent le Gateway vérifient que le service redémarré signale la version mise à jour attendue avant que la commande ne réussisse.
- `--channel <stable|beta|dev>` : définir le canal de mise à jour (git + npm ; persisté dans la configuration).
- `--tag <dist-tag|version|spec>` : remplacer la cible du paquet pour cette mise à jour uniquement. Pour les installations de paquets, `main` correspond à `github:openclaw/openclaw#main`.
- `--dry-run` : prévisualiser les actions de mise à jour prévues (canal/tag/cible/flux de redémarrage) sans écrire la configuration, installer, synchroniser les plugins ou redémarrer.
- `--json` : imprime du JSON `UpdateRunResult` lisible par la machine, y compris
  `postUpdate.plugins.warnings` lorsque des plugins gérés corrompus ou non chargeables nécessitent
  une réparation après la réussite de la mise à jour du cœur, les détails de repli du plugin du channel bêta
  lorsqu'un plugin n'a pas de version bêta, et `postUpdate.plugins.integrityDrifts`
  lorsqu'une dérive d'artefact de plugin npm est détectée lors de la synchronisation des plugins post-mise à jour.
- `--timeout <seconds>` : délai d'attente par étape (par défaut 1800s).
- `--yes` : ignorer les invites de confirmation (par exemple confirmation de rétrogradation).

`openclaw update` n'a pas de drapeau `--verbose`. Utilisez `--dry-run` pour prévisualiser
les actions planifiées de canal/balise/installation/redémarrage, `--json` pour des résultats
lisibles par machine, et `openclaw update status --json` lorsque vous avez uniquement besoin des détails du canal
et de disponibilité. Si vous déboguez les journaux du Gateway lors d'une mise à jour,
la verbosité de la console et le niveau de journalisation fichier sont distincts : Gateway `--verbose` affecte
la sortie terminal/WebSocket, tandis que les journaux fichier nécessitent `logging.level: "debug"` ou
`"trace"` dans la configuration. Voir [Journalisation du Gateway](/fr/gateway/logging).

<Note>En mode Nix (`OPENCLAW_NIX_MODE=1`), les exécutions mutantes de `openclaw update` sont désactivées. Mettez plutôt à jour la source Nix ou l'entrée flake pour cette installation ; pour nix-openclaw, utilisez le [Quick Start](https://github.com/openclaw/nix-openclaw#quick-start) basé sur l'agent. `openclaw update status` et `openclaw update --dry-run` restent en lecture seule.</Note>

<Warning>Les rétrogradations nécessitent une confirmation car les anciennes versions peuvent casser la configuration.</Warning>

## `update status`

Affiche le canal de mise à jour actif + la balise/branche/SHA git (pour les checkouts source), ainsi que la disponibilité de la mise à jour.

```bash
openclaw update status
openclaw update status --json
openclaw update status --timeout 10
```

Options :

- `--json` : imprime l'état JSON lisible par machine.
- `--timeout <seconds>` : délai d'attente pour les vérifications (par défaut 3s).

## `update wizard`

Flux interactif pour choisir un canal de mise à jour et confirmer s'il faut redémarrer le Gateway
après la mise à jour (par défaut, redémarrage). Si vous sélectionnez `dev` sans un checkout git, il
propose d'en créer un.

Options :

- `--timeout <seconds>` : délai d'attente pour chaque étape de mise à jour (par défaut `1800`)

## Ce qu'il fait

Lorsque vous changez de canal explicitement (`--channel ...`), OpenClaw maintient également la
méthode d'installation alignée :

- `dev` → assure une extraction git (par défaut : `~/openclaw`, remplacé par `OPENCLAW_GIT_DIR`),
  la met à jour, et installe le CLI global à partir de cette extraction.
- `stable` → installe à partir de npm en utilisant `latest`.
- `beta` → préfère le dist-tag npm `beta`, mais revient à `latest` lorsque la version bêta est
  manquante ou plus ancienne que la version stable actuelle.

Le programme de mise à jour automatique du cœur Gateway (lorsqu'il est activé via la configuration) lance le chemin de mise à jour de la CLI
en dehors du gestionnaire de requêtes du Gateway en direct. Les mises à jour du gestionnaire de paquets
`update.run` du plan de contrôle utilisent également un transfert de service géré au lieu de remplacer l'arborescence des paquets
à l'intérieur du processus Gateway en direct. Le Gateway démarre un assistant détaché, quitte,
et l'assistant exécute le chemin normal de la CLI `openclaw update --yes --json` à partir
de l'extérieur de l'arborescence des processus du Gateway. Si ce transfert n'est pas disponible, `update.run`
renvoie une réponse structurée avec la commande shell sûre à exécuter manuellement.

Pour les installations par gestionnaire de paquets, `openclaw update` résout la version cible du paquet avant d'invoquer le gestionnaire de paquets. Les installations globales npm utilisent une installation par étapes : OpenClaw installe le nouveau paquet dans un préfixe npm temporaire, vérifie l'inventaire `dist` empaqueté à cet endroit, puis échange cette arborescence de paquets propre avec le préfixe global réel. Si la vérification échoue, les opérations de diagnostic post-mise à jour, de synchronisation des plugins et de redémarrage ne s'exécutent pas depuis l'arborescence suspecte. Même lorsque la version installée correspond déjà à la cible, la commande actualise l'installation globale du paquet, puis exécute la synchronisation des plugins, une actualisation des complétions des commandes principales et le travail de redémarrage. Cela permet de garder les sidecars empaquetés et les enregistrements de plugins détenus par le channel alignés avec la build OpenClaw installée, tout en laissant les reconstructions complètes des complétions des commandes de plugins aux exécutions explicites de `openclaw completion --write-state`.

Lorsqu'un service Gateway géré localement est installé et que le redémarrage est activé, les mises à jour du gestionnaire de packages arrêtent le service en cours avant de remplacer l'arborescence des packages, actualisent ensuite les métadonnées du service à partir de l'installation mise à jour, redémarrent le service et vérifient que le Gateway redémarré signale la version attendue avant de signaler `Gateway: restarted and verified.`. Sur macOS, la vérification post-mise à jour vérifie également que le LaunchAgent est chargé/en cours d'exécution pour le profil actif et que le port de bouclage configuré est sain. Si le plist est installé mais que launchd ne le supervise pas, OpenClaw ré-amorce automatiquement le LaunchAgent, puis réexécute les vérifications de disponibilité de l'état/version/. Un nouvel amorçage charge directement la tâche RunAtLoad, de sorte que la récupération de mise à jour n'`kickstart -k` pas immédiatement le Gateway nouvellement généré. Si le Gateway ne devient toujours pas sain, la commande se termine avec un code non nul et imprime le chemin du journal de redémarrage ainsi que des instructions explicites pour redémarrer, réinstaller et restaurer le package. Si le redémarrage ne peut pas s'exécuter, la commande imprime `Gateway: restart skipped (...)` ou `Gateway: restart failed: ...` avec un indice `openclaw gateway restart` manuel. Avec `--no-restart`, le remplacement du package s'exécute toujours, mais le service géré n'est ni arrêté ni redémarré, de sorte que le Gateway en cours d'exécution peut conserver l'ancien code jusqu'à ce que vous le redémarriez manuellement.

### Forme de la réponse du plan de contrôle

Lorsque `update.run` est invoqué via le plan de contrôle du Gateway sur une installation via gestionnaire de packages, le gestionnaire signale le début du transfert séparément de la mise à jour CLI qui se poursuit après la fermeture du Gateway :

- `ok: true`, `result.status: "skipped"`,
  `result.reason: "managed-service-handoff-started"` et
  `handoff.status: "started"` signifient que le Gateway a créé le transfert de service géré
  et programmé son propre redémarrage afin que l'assistant détaché puisse exécuter
  `openclaw update --yes --json` en dehors du processus de service en direct.
- `ok: false`, `result.reason: "managed-service-handoff-unavailable"`, et
  `handoff.status: "unavailable"`OpenClaw indiquent qu'OpenClaw n'a pas pu trouver de limite
  de service superviseur pour un transfert sécurisé. La réponse inclut
  `handoff.command`Gateway, la commande shell à exécuter depuis l'extérieur de la Gateway.
- `ok: false`, `result.reason: "managed-service-handoff-failed"`Gateway signifie que la
  Gateway a tenté de créer le transfert mais n'a pas pu lancer l'assistant détaché.

La charge utile `sentinel`GatewayCLI est toujours écrite avant que la Gateway ne se ferme, et le transfert
CLI met à jour la même sentinelle de redémarrage une fois les contrôles de santé post-redémarrage
du service géré terminés. Pendant le transfert, la sentinelle peut porter
`stats.reason: "restart-health-pending"`GatewayCLI sans continuation de succès ; la
Gateway redémarrée continue de l'interroger et ne déclenche la continuation qu'après que la CLI
a vérifié la santé du service et réécrit la sentinelle avec le résultat final `ok`.
`openclaw status` et `openclaw status --all` affichent une ligne `Update restart`
tant que cette sentinelle est en attente ou a échoué, et `update.status` renvoie la
dernière sentinelle mise en cache.

## Flux de récupération Git

### Sélection du canal

- `stable` : récupérer la dernière balise non-bêta, puis construire et diagnostiquer.
- `beta` : préférer la dernière balise `-beta`, mais revenir à la dernière balise stable quand la bêta est manquante ou plus ancienne.
- `dev` : récupérer `main`, puis récupérer et rebaser.

### Étapes de mise à jour

<Steps>
  <Step title="Vérifier l'arbre de travail propre">Nécessite aucune modification non commitée.</Step>
  <Step title="Changer de canal">Bascule vers le canal sélectionné (balise ou branche).</Step>
  <Step title="Récupérer en amont">Dev uniquement.</Step>
  <Step title="Préflight build (dev only)">
    Exécute la build TypeScript dans un worktree temporaire. Si la pointe échoue, remonte jusqu'à 10 commits pour trouver le commit le plus récent qui puisse être buildé. Définissez `OPENCLAW_UPDATE_PREFLIGHT_LINT=1` pour également exécuter le lint lors de cette pré-vérification ; le lint s'exécute en mode série contraint car les hôtes de mise à jour utilisateur sont souvent plus petits que les
    runners CI.
  </Step>
  <Step title="Rebase">Effectue un rebase sur le commit sélectionné (dev uniquement).</Step>
  <Step title="Installer les dépendances">Utilise le gestionnaire de paquets du dépôt. Pour les checkouts pnpm, l'updater amorce `pnpm` à la demande (via `corepack` d'abord, puis un `npm install pnpm@11` de secours temporaire) au lieu d'exécuter `npm run build` dans un espace de travail pnpm.</Step>
  <Step title="Construire l'interface de contrôle">Construit la passerelle et l'interface de contrôle.</Step>
  <Step title="Exécuter le docteur">`openclaw doctor` s'exécute comme vérification finale de mise à jour sûre.</Step>
  <Step title="Synchroniser les plugins">Synchronise les plugins vers le channel actif. Dev utilise les plugins groupés ; stable et bêta utilisent npm. Met à jour les installations de plugins suivies.</Step>
</Steps>

Sur le channel de mise à jour bêta, les installations de plugins suivies npm et ClawHub qui suivent
la ligne par défaut/dernière essaient d'abord une version de plugin `@beta`. Si le plugin n'a pas
de version bêta, OpenClaw revient à la spec par défaut/dernière enregistrée et signale
cela comme un avertissement. Pour les plugins npm, OpenClaw revient également lorsque le paquet
bêta existe mais échoue à la validation d'installation. Ces avertissements de retour de plugin ne
font pas échouer la mise à jour du cœur. Les versions exactes et les balises explicites ne sont
pas réécrites.

<Warning>Si une mise à jour exacte d'un plugin épinglé npm résout vers un artefact dont l'intégrité diffère de l'enregistrement d'installation stocké, npm`openclaw update` annule cette mise à jour de l'artefact du plugin au lieu de l'installer. Réinstallez ou mettez à jour le plugin explicitement uniquement après avoir vérifié que vous faites confiance au nouvel artefact.</Warning>

<Note>
Les échecs de synchronisation des plug-ins après la mise à jour, limités à un plug-in géré et que le chemin de synchronisation peut contourner (par exemple, un registre npm inaccessible pour un plug-in non essentiel), sont signalés sous forme d'avertissements après la réussite de la mise à jour principale. Le résultat JSON conserve le `status: "ok"` de mise à jour de premier niveau et signale `postUpdate.plugins.status: "warning"` avec les conseils `openclaw doctor --fix` et `openclaw plugins inspect <id> --runtime --json`. Les exceptions inattendues du programme de mise à jour ou de la synchronisation font toujours échouer le résultat de la mise à jour. Corrigez l'erreur d'installation ou de mise à jour du plug-in, puis réexécutez `openclaw doctor --fix` ou `openclaw update`.

Après l'étape de synchronisation par plug-in, `openclaw update` exécute une passe obligatoire de **convergence post-principale** avant le redémarrage de la passerelle : elle répare les charges utiles de plug-in configurées manquantes, valide chaque enregistrement d'installation suivi _actif_ sur le disque et vérifie statiquement que son `package.json` est analysable (et que tout `main` explicitement déclaré existe). Les échecs de cette passe — et un instantané de configuration OpenClaw invalide — renvoient `postUpdate.plugins.status: "error"` et basculent le `status` de mise à jour de premier niveau sur `"error"`, de sorte que `openclaw update` se ferme avec un code non nul et que la passerelle n'est _pas_ redémarrée avec un ensemble de plug-ins non vérifié. L'erreur comprend des lignes `postUpdate.plugins.warnings[].guidance` structurées pointant vers `openclaw doctor --fix` et `openclaw plugins inspect <id> --runtime --json` pour le suivi. Les entrées de plug-in désactivées et les enregistrements qui ne sont pas des cibles de synchronisation officielles liées à une source de confiance sont ignorés ici, reflétant la stratégie `skipDisabledPlugins` utilisée par la vérification des charges utiles manquantes, de sorte qu'un enregistrement de plug-in désactivé obsolète ne peut pas bloquer une mise à jour autrement valide.

Lorsque la passerelle Gateway mise à jour démarre, le chargement des plug-ins est en mode vérification uniquement : le démarrage n'exécute pas les gestionnaires de packages ni ne modifie les arbres de dépendances. Les redémarrages `update.run` du gestionnaire de packages sont transmis au chemin de service géré du CLI, de sorte que l'échange de packages a lieu en dehors de l'ancien processus de passerelle Gateway et que les vérifications d'état du service décident si la mise à jour peut être signalée comme terminée.

Si l'amorçage pnpm échoue toujours, le programme de mise à jour s'arrête prématurément avec une erreur spécifique au gestionnaire de packages au lieu d'essayer `npm run build` dans l'extraction.

</Note>

## Raccourci `--update`

`openclaw --update` est réécrit en `openclaw update` (utile pour les shells et les scripts de lanceur).

## Connexes

- `openclaw doctor` (propose de lancer d'abord la mise à jour sur les extraits git)
- [Canaux de développement](/fr/install/development-channels)
- [Mise à jour](/fr/install/updating)
- [Référence CLI](/fr/cli)
