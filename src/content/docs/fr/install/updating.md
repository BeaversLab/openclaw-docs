---
summary: "OpenClawMise à jour sécurisée d'OpenClaw (installation globale ou source), plus stratégie de retour en arrière"
read_when:
  - Updating OpenClaw
  - Something breaks after an update
title: "Mise à jour"
---

Gardez OpenClaw à jour.

## Recommandé : `openclaw update`

Le moyen le plus rapide de mettre à jour. Il détecte votre type d'installation (npm ou git), récupère la dernière version, exécute npm`openclaw doctor` et redémarre la passerelle.

```bash
openclaw update
```

Pour changer de canal ou cibler une version spécifique :

```bash
openclaw update --channel beta
openclaw update --channel dev
openclaw update --dry-run   # preview without applying
```

`openclaw update` n'accepte pas `--verbose`. Pour le diagnostic de mise à jour, utilisez
`--dry-run` pour prévisualiser les actions planifiées, `--json` pour des résultats structurés, ou
`openclaw update status --json` pour inspecter l'état du canal et de la disponibilité. Le
programme d'installation possède son propre indicateur `--verbose`, mais cet indicateur ne fait pas partie de
`openclaw update`.

`--channel beta` préfère la version bêta, mais l'exécution revient à la version stable/la plus récente lorsque
l'étiquette bêta est manquante ou plus ancienne que la dernière version stable. Utilisez `--tag beta`npm
si vous souhaitez l'étiquette de distribution bêta npm brute pour une mise à jour ponctuelle du package.

Utilisez `--channel dev`GitHub pour une extraction GitHub `main` persistante et mouvante. Pour les mises à jour de packages, `--tag main` correspond à `github:openclaw/openclaw#main`GitHubnpm pour une exécution, et les spécifications de source GitHub/git sont empaquetées dans une archive temporaire avant l'installation npm intermédiaire.

Pour les plugins gérés, le repli sur la bêta-channel est un avertissement : la mise à jour du cœur peut toujours réussir pendant qu'un plugin utilise sa version par défaut/dernière enregistrée car aucune bêta de plugin n'est disponible.

Voir [Canaux de développement](/fr/install/development-channels) pour la sémantique des canaux.

## Changer entre les installations npm et git

Utilisez les canaux lorsque vous souhaitez changer le type d'installation. Le programme de mise à jour conserve votre état, votre configuration, vos identifiants et votre espace de travail dans `~/.openclaw`OpenClawCLI ; il ne modifie que l'installation du code OpenClaw utilisée par le CLI et la Gateway.

```bash
# npm package install -> editable git checkout
openclaw update --channel dev

# git checkout -> npm package install
openclaw update --channel stable
```

Exécutez d'abord avec `--dry-run` pour prévisualiser le changement exact de mode d'installation :

```bash
openclaw update --channel dev --dry-run
openclaw update --channel stable --dry-run
```

Le canal `dev`CLI assure une extraction git, la construit et installe le CLI global à partir de cette extraction. Les canaux `stable` et `beta` utilisent des installations de packages. Si la Gateway est déjà installée, `openclaw update` actualise les métadonnées du service et le redémarre, sauf si vous passez `--no-restart`.

Pour les installations de packages avec un service Gateway géré, Gateway`openclaw update` cible la racine du package utilisée par ce service. Si la commande shell `openclaw` provient d'une installation différente, le programme de mise à jour affiche les deux racines et le chemin Node du service géré. La mise à jour du package utilise le gestionnaire de packages qui possède la racine du service et vérifie le Node du service géré par rapport au moteur de publication cible avant de remplacer le package.

## Alternative : réexécuter le programme d'installation

```bash
curl -fsSL https://openclaw.ai/install.sh | bash
```

Ajoutez `--no-onboard` pour ignorer l'onboarding. Pour forcer un type d'installation spécifique via le programme d'installation, passez `--install-method git --no-onboard` ou `--install-method npm --no-onboard`.

Si `openclaw update` échoue après la phase d'installation du paquet npm, relancez
l'installateur. L'installateur n'appelle pas l'ancien outil de mise à jour ; il exécute directement
l'installation globale du paquet et peut récupérer une installation npm partiellement mise à jour.

```bash
curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method npm
```

Pour figer la récupération à une version spécifique ou à un balise de distribution (dist-tag), ajoutez `--version` :

```bash
curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method npm --version <version-or-dist-tag>
```

## Alternative : npm, pnpm ou bun manuels

```bash
npm i -g openclaw@latest
```

Privilégiez `openclaw update` pour les installations supervisées car il peut coordonner l'échange
de paquets avec le service Gateway en cours d'exécution. Si vous mettez à jour manuellement sur une
installation supervisée, arrêtez le Gateway géré avant le démarrage du gestionnaire de paquets.
Les gestionnaires de paquets remplacent les fichiers sur place, et un Gateway en cours d'exécution pourrait sinon essayer
de charger des fichiers principaux ou de plugins alors que l'arborescence des paquets est temporairement à moitié échangée.
Redémarrez le Gateway après la fin du gestionnaire de paquets pour que le service prenne en
compte la nouvelle installation.

Pour une installation système globale appartenant au root sous Linux, si `openclaw update` échoue avec
`EACCES` et que vous récupérez avec le npm système, gardez le Gateway arrêté pendant le
remplacement manuel du paquet. Utilisez les mêmes indicateurs de profil `openclaw` ou l'environnement
que vous utilisez normalement pour ce Gateway. Remplacez `/usr/bin/npm` par le npm système
qui possède le préfixe global appartenant au root sur votre hôte :

```bash
openclaw gateway stop
sudo /usr/bin/npm i -g openclaw@latest
openclaw gateway install --force
openclaw gateway restart
```

Ensuite, vérifiez le service :

```bash
openclaw --version
curl -fsS http://127.0.0.1:18789/readyz
openclaw plugins list --json
openclaw gateway status --deep --json
openclaw doctor --lint --json
```

Lorsque `openclaw update`npmnpm gère une installation npm globale, il installe d'abord la cible dans
un préfixe npm temporaire, vérifie l'inventaire `dist`npmOpenClaw empaqueté, puis échange
l'arborescence de paquets propre dans le vrai préfixe global. Cela évite à npm de superposer un
nouveau paquet sur des fichiers périmés de l'ancien paquet. Si la commande d'installation échoue,
OpenClaw réessaie une fois avec `--omit=optional`. Cette nouvelle tentative aide les hôtes où les dépendances
optionnelles natives ne peuvent pas être compilées, tout en gardant l'échec d'origine visible
si la solution de secours échoue également.

Les commandes de mise à jour npm gérées par OpenClaw et de mise à jour de plugin effacent également la mise en quarantaine OpenClawnpmnpm`min-release-age`npmnpm pour le processus npm enfant. npm peut signaler cette
politique comme une date limite `before`OpenClawOpenClaw dérivée ; les deux sont utiles pour les politiques générales de mise en quarantaine de la chaîne d'approvisionnement,
mais une mise à jour explicite d'OpenClaw signifie « installer la version
sélectionnée d'OpenClaw maintenant ».

```bash
pnpm add -g openclaw@latest
```

```bash
bun add -g openclaw@latest
```

### Rubriques avancées sur l'installation npm

<AccordionGroup>
  <Accordion title="Read-only package tree"OpenClawOpenClawnpmGatewayOpenClawLinuxnpm>
    OpenClaw traite les installations globales empaquetées comme en lecture seule lors de l'exécution, même lorsque le répertoire global des paquets est accessible en écriture par l'utilisateur actuel. Les installations de paquets de plugins résident dans les racines npm/git détenues par OpenClaw sous le répertoire de configuration de l'utilisateur, et le démarrage de la Gateway ne modifie pas l'arborescence des paquets OpenClaw.

    Certaines configurations npm sous Linux installent des paquets globaux dans des répertoires détenus par root, tels que `/usr/lib/node_modules/openclaw`OpenClaw. OpenClaw prend en charge cette disposition car les commandes d'installation/de mise à jour de plugins écrivent en dehors de ce répertoire global de paquets.

  </Accordion>
  <Accordion title="Hardened systemd units"OpenClaw>
    Accordez à OpenClaw un accès en écriture à ses racines de configuration/état afin que les installations de plugins explicites, les mises à jour de plugins et le nettoyage du docteur puissent conserver leurs modifications :

    ```ini
    ReadWritePaths=/var/lib/openclaw /home/openclaw/.openclaw /tmp
    ```

  </Accordion>
  <Accordion title="Disk-space preflight"OpenClaw>
    Avant les mises à jour des packages et les installations explicites de plugins, OpenClaw tente une vérification de l'espace disque au mieux pour le volume cible. Un espace faible produit un avertissement avec le chemin vérifié, mais ne bloque pas la mise à jour car les quotas de système de fichiers, les instantanés et les volumes réseau peuvent changer après la vérification. L'installation réelle du gestionnaire de packages et la vérification post-installation restent autoritaires.
  </Accordion>
</AccordionGroup>

## Mise à jour automatique

La mise à jour automatique est désactivée par défaut. Activez-la dans `~/.openclaw/openclaw.json` :

```json5
{
  update: {
    channel: "stable",
    auto: {
      enabled: true,
      stableDelayHours: 6,
      stableJitterHours: 12,
      betaCheckIntervalHours: 1,
    },
  },
}
```

| Canal    | Comportement                                                                                                          |
| -------- | --------------------------------------------------------------------------------------------------------------------- |
| `stable` | Attend `stableDelayHours`, puis applique avec une gigue déterministe sur `stableJitterHours` (déploiement échelonné). |
| `beta`   | Vérifie chaque `betaCheckIntervalHours` (par défaut : toutes les heures) et applique immédiatement.                   |
| `dev`    | Pas d'application automatique. Utilisez `openclaw update` manuellement.                                               |

La passerelle enregistre également une indication de mise à jour au démarrage (désactivez avec `update.checkOnStart: false`).
Pour une rétrogradation ou une récupération d'incident, définissez `OPENCLAW_NO_AUTO_UPDATE=1` dans l'environnement de la passerelle pour bloquer les applications automatiques même lorsque `update.auto.enabled` est configuré. Les indications de mise à jour au démarrage peuvent toujours s'exécuter sauf si `update.checkOnStart` est également désactivé.

Les mises à jour du gestionnaire de paquets demandées via le gestionnaire de contrôle du Gateway en temps réel ne remplacent pas l'arborescence des paquets dans le processus Gateway en cours d'exécution. Sur les installations de services gérés, le Gateway lance un transfert détaché, quitte et laisse le chemin normal du GatewayGatewayGateway`openclaw update --yes --json` CLI arrêter le service, remplacer le paquet, actualiser les métadonnées du service, redémarrer, vérifier la version et l'accessibilité du Gateway, et récupérer un LaunchAgent macOS installé mais non chargé si possible. Si le Gateway ne peut pas effectuer ce transfert en toute sécurité, `update.run` signale une commande shell sécurisée au lieu d'exécuter le gestionnaire de paquets en processus.

## Après la mise à jour

<Steps>

### Exécuter le docteur

```bash
openclaw doctor
```

Migre la configuration, audite les stratégies DM et vérifie l'état du gateway. Détails : [Docteur](/fr/gateway/doctor)

### Redémarrer la passerelle

```bash
openclaw gateway restart
```

### Vérifier

```bash
openclaw health
```

</Steps>

## Retour en arrière

### Épingler une version (npm)

```bash
npm i -g openclaw@<version>
openclaw doctor
openclaw gateway restart
```

<Tip>`npm view openclaw version` affiche la version publiée actuelle.</Tip>

### Épingler un commit (source)

```bash
git fetch origin
git checkout "$(git rev-list -n 1 --before=\"2026-01-01\" origin/main)"
pnpm install && pnpm build
openclaw gateway restart
```

Pour revenir à la dernière version : `git checkout main && git pull`.

## Si vous êtes bloqué

- Exécutez `openclaw doctor` à nouveau et lisez attentivement la sortie.
- Pour `openclaw update --channel dev` sur les extraits de source, le programme de mise à jour amorce automatiquement `pnpm` si nécessaire. Si vous voyez une erreur d'amorçage pnpm/corepack, installez `pnpm` manuellement (ou réactivez `corepack`) et relancez la mise à jour.
- Vérifier : [Dépannage](/fr/gateway/troubleshooting)
- Demander sur Discord : [https://discord.gg/clawd](https://discord.gg/clawd)

## Connexes

- [Aperçu de l'installation](/fr/install) : toutes les méthodes d'installation.
- [Docteur](/fr/gateway/doctor) : vérifications de l'état après les mises à jour.
- [Migration](/fr/install/migrating) : guides de migration pour les versions majeures.
