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
les actions planifiées de channel/tag/installation/redémarrage, `--json` pour des résultats
lisibles par la machine, et `openclaw update status --json` lorsque vous avez uniquement besoin des détails du channel et
de la disponibilité. Si vous déboguez les journaux Gateway autour d'une mise à jour,
la verbosité de la console et le niveau de journalisation fichier sont séparés : Gateway `--verbose` affecte
la sortie terminal/WebSocket, tandis que les journaux fichiers nécessitent `logging.level: "debug"` ou
`"trace"` dans la configuration. Voir [Journalisation Gateway](/fr/gateway/logging).

<Note>En mode Nix (`OPENCLAW_NIX_MODE=1`), les exécutions mutantes de `openclaw update` sont désactivées. Mettez plutôt à jour la source Nix ou l'entrée flake pour cette installation ; pour nix-openclaw, utilisez le [Quick Start](https://github.com/openclaw/nix-openclaw#quick-start) centré sur l'agent. `openclaw update status` et `openclaw update --dry-run` restent en lecture seule.</Note>

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

Le moteur de mise à jour automatique du cœur de Gateway (lorsqu'il est activé via la configuration) lance le chemin de mise à jour du CLI
en dehors du gestionnaire de requêtes en direct du Gateway. Les mises à jour du gestionnaire de paquets `update.run` du plan de contrôle
forcent un redémarrage de mise à jour sans report ni temps d'attente après l'échange des paquets,
car l'ancien processus Gateway peut encore avoir des blocs en mémoire pointant vers
des fichiers supprimés par le nouveau paquet.

Pour les installations via gestionnaire de paquets, `openclaw update` résout la version cible du
paquet avant d'invoquer le gestionnaire de paquets. Les installations globales npm utilisent une
installation par étapes : OpenClaw installe le nouveau paquet dans un préfixe npm temporaire, vérifie
l'inventaire `dist` empaqueté à cet endroit, puis échange cet arbre de paquets propre dans le
préfixe global réel. Si la vérification échoue, les tâches de diagnostic post-mise à jour, de synchronisation des plugins
et de redémarrage ne s'exécutent pas à partir de l'arbre suspect. Même lorsque la version installée
correspond déjà à la cible, la commande actualise l'installation du paquet global,
exécute ensuite la synchronisation des plugins, une actualisation de la complétion des commandes principales, et les tâches de redémarrage. Cela
maintient les sidecars empaquetés et les enregistrements de plugins détenus par le channel alignés avec le
build OpenClaw installé tout en laissant les reconstructions complètes de la complétion des commandes de plugins aux
exécutions explicites de `openclaw completion --write-state`.

Lorsqu'un service Gateway géré localement est installé et que le redémarrage est activé, les mises à jour du gestionnaire de paquets arrêtent le service en cours avant de remplacer l'arborescence des paquets, puis actualisent les métadonnées du service à partir de l'installation mise à jour, redémarrant le service, et vérifient que le Gateway redémarré signale la version attendue avant de signaler le succès. Sur macOS, la vérification post-mise à jour vérifie également que le LaunchAgent est chargé/en cours d'exécution pour le profil actif et que le port de bouclage configuré est sain. Si le plist est installé mais que launchd ne le supervise pas, OpenClaw ré-amorce automatiquement le LaunchAgent, puis réexécute les vérifications de disponibilité de santé/version/ canal. Un nouvel amorçage charge directement la tâche RunAtLoad, la récupération de mise à jour ne GatewayGatewaymacOSOpenClaw`kickstart -k`GatewayGateway donc pas immédiatement le Gateway nouvellement spawned. Si le Gateway ne devient toujours pas sain, la commande se termine avec un code non nul et imprime le chemin du journal de redémarrage ainsi que des instructions explicites de redémarrage, de réinstallation et de retour de version du paquet. Avec `--no-restart`Gateway, le remplacement du paquet s'exécute toujours, mais le service géré n'est pas arrêté ou redémarré, le Gateway en cours d'exécution peut donc conserver l'ancien code jusqu'à ce que vous le redémarriez manuellement.

## Flux de checkout Git

### Sélection du canal

- `stable` : faire le checkout de la dernière balise non bêta, puis construire et faire un doctor.
- `beta` : préférer la dernière balise `-beta`, mais revenir à la dernière balise stable lorsque la bêta est manquante ou plus ancienne.
- `dev` : faire le checkout de `main`, puis récupérer et faire un rebase.

### Étapes de mise à jour

<Steps>
  <Step title="Vérifier la propre arborescence de travail">Nécessite aucun changement non validé.</Step>
  <Step title="Changer de canal">Bascule vers le canal sélectionné (balise ou branche).</Step>
  <Step title="Récupérer en amont">Dev uniquement.</Step>
  <Step title="Préflight build (dev uniquement)">
    Exécute la build TypeScript dans un arbre de travail temporaire. Si la pointe échoue, remonte jusqu'à 10 commits pour trouver le commit le plus récent qui peut être buildé. Définissez `OPENCLAW_UPDATE_PREFLIGHT_LINT=1` pour exécuter également le lint pendant cette pré-vérification ; le lint s'exécute en mode série contraint car les hôtes de mise à jour utilisateur sont souvent plus petits que
    les runners CI.
  </Step>
  <Step title="Rebase">Effectue un rebase sur le commit sélectionné (dev uniquement).</Step>
  <Step title="Installer les dépendances">Utilise le gestionnaire de paquets du dépôt. Pour les checkouts pnpm, le programme de mise à jour amorce `pnpm` à la demande (via `corepack` d'abord, puis un repli temporaire `npm install pnpm@11`) au lieu d'exécuter `npm run build` dans un espace de travail pnpm.</Step>
  <Step title="Build Control UI">Build la passerelle et l'interface utilisateur de contrôle.</Step>
  <Step title="Exécuter doctor">`openclaw doctor` s'exécute en tant que vérification finale de mise à jour sécurisée.</Step>
  <Step title="Synchroniser les plugins">Synchronise les plugins avec le canal actif. Dev utilise les plugins groupés ; stable et bêta utilisent npm. Met à jour les installations de plugins suivies.</Step>
</Steps>

Sur le channel de mise à jour bêta, les installations de plugins suivis via npm et ClawHub qui suivent
la ligne par défaut/dernière version essaient d'abord une version de plugin `@beta`. Si le plugin n'a pas
de version bêta, OpenClaw revient à la spec par défaut/dernière version enregistrée et signale
cela sous forme d'avertissement. Pour les plugins npm, OpenClaw revient également lorsque le paquet
bêta existe mais échoue à la validation d'installation. Ces avertissements de repli de plugin
ne font pas échouer la mise à jour du cœur. Les versions exactes et les balises explicites ne sont
pas réécrites.

<Warning>Si une mise à jour de plugin npm épinglée exacte résout en un artefact dont l'intégrité diffère de l'enregistrement d'installation stocké, `openclaw update` abandonne cette mise à jour d'artefact de plugin au lieu de l'installer. Réinstallez ou mettez à jour le plugin explicitement uniquement après avoir vérifié que vous faites confiance au nouvel artefact.</Warning>

<Note>
Les échecs de synchronisation des plugins après mise à jour, limités à un plugin géré et que le chemin de synchronisation peut contourner (par exemple, un registre npm inaccessible pour un plugin non essentiel), sont signalés sous forme d'avertissements après la réussite de la mise à jour du cœur. Le résultat JSON conserve le `status: "ok"` de mise à jour de premier niveau et signale `postUpdate.plugins.status: "warning"` avec des conseils `openclaw doctor --fix` et `openclaw plugins inspect <id> --runtime --json`. Les exceptions inattendues du programme de mise à jour ou de la synchronisation font toujours échouer le résultat de la mise à jour. Corrigez l'erreur d'installation ou de mise à jour du plugin, puis relancez `openclaw doctor --fix` ou `openclaw update`.

Après l'étape de synchronisation par plugin, `openclaw update` exécute une passe obligatoire de **post-convergence du cœur** avant le redémarrage de la passerelle : elle répare les charges utiles de plugins configurés manquantes, valide chaque enregistrement d'installation suivi _actif_ sur le disque, et vérifie statiquement que son `package.json` est analysable (et que tout `main` déclaré explicitement existe). Les échecs de cette passe — et un instantané de configuration OpenClaw invalide — renvoient `postUpdate.plugins.status: "error"` et basculent le `status` de mise à jour de premier niveau sur `"error"`, de sorte que `openclaw update` se ferme avec un code non nul et que la passerelle n'est _pas_ redémarrée avec un ensemble de plugins non vérifié. L'erreur comprend des lignes `postUpdate.plugins.warnings[].guidance` structurées pointant vers `openclaw doctor --fix` et `openclaw plugins inspect <id> --runtime --json` pour le suivi. Les entrées de plugins désactivés et les enregistrements qui ne sont pas des cibles de synchronisation officielles liées à une source de confiance sont ignorés ici, reflétant la politique `skipDisabledPlugins` utilisée par la vérification des charges utiles manquantes, de sorte qu'un enregistrement de plugin désactivé obsolète ne peut pas bloquer une mise à jour autrement valide.

Lorsque la Gateway mise à jour démarre, le chargement des plugins est en mode vérification uniquement : le démarrage n'exécute pas les gestionnaires de packages ni ne modifie les arbres de dépendances. Les redémarrages `update.run` du gestionnaire de packages contournent la différance d'inactivité normale et le temps de refroidissement de redémarrage une fois l'arborescence des packages échangée, afin que l'ancien processus ne puisse pas continuer à charger paresseusement des chunks supprimés.

Si l'amorçage pnpm échoue toujours, le programme de mise à jour s'arrête prématurément avec une erreur spécifique au gestionnaire de packages au lieu d'essayer `npm run build` à l'intérieur de l'extraction.

</Note>

## Raccourci `--update`

`openclaw --update` se réécrit en `openclaw update` (utile pour les shells et les scripts de lancement).

## Connexes

- `openclaw doctor` (propose d'exécuter la mise à jour en premier sur les extraits git)
- [Canaux de développement](/fr/install/development-channels)
- [Mise à jour](/fr/install/updating)
- [Référence CLI](CLI/en/cli)
