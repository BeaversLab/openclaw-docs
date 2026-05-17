---
summary: "Mettre à jour OpenClaw en toute sécurité (installation globale ou source), plus stratégie de retour en arrière"
read_when:
  - Updating OpenClaw
  - Something breaks after an update
title: "Mise à jour"
---

Gardez OpenClaw à jour.

## Recommandé : `openclaw update`

Le moyen le plus rapide de mettre à jour. Il détecte votre type d'installation (npm ou git), récupère la dernière version, exécute `openclaw doctor` et redémarre la passerelle.

```bash
openclaw update
```

Pour changer de canal ou cibler une version spécifique :

```bash
openclaw update --channel beta
openclaw update --channel dev
openclaw update --tag main
openclaw update --dry-run   # preview without applying
```

`openclaw update` n'accepte pas `--verbose`. Pour le diagnostic de mise à jour, utilisez
`--dry-run` pour prévisualiser les actions planifiées, `--json` pour les résultats structurés ou
`openclaw update status --json` pour inspecter l'état du canal et de la disponibilité. L'installeur
possède son propre indicateur `--verbose`, mais cet indicateur ne fait pas partie de
`openclaw update`.

`--channel beta` préfère la version bêta, mais l'exécution revient à stable/latest lorsque
l'étiquette bêta est manquante ou plus ancienne que la dernière version stable. Utilisez `--tag beta`
si vous souhaitez le dist-tag bêta brut npm pour une mise à jour ponctuelle du package.

Pour les plugins gérés, le repli sur le canal bêta est un avertissement : la mise à jour du cœur peut
encore réussir pendant qu'un plugin utilise sa version par défaut/dernière enregistrée car aucune
version bêta de plugin n'est disponible.

Voir [Canaux de développement](/fr/install/development-channels) pour la sémantique des canaux.

## Changer entre les installations npm et git

Utilisez les canaux lorsque vous souhaitez changer le type d'installation. Le programme de mise à jour conserve votre
état, votre configuration, vos informations d'identification et votre espace de travail dans `~/.openclaw` ; il ne modifie
que l'installation du code OpenClaw utilisée par le CLI et le gateway.

```bash
# npm package install -> editable git checkout
openclaw update --channel dev

# git checkout -> npm package install
openclaw update --channel stable
```

Exécutez d'abord avec `--dry-run` pour prévisualiser le changement exact du mode d'installation :

```bash
openclaw update --channel dev --dry-run
openclaw update --channel stable --dry-run
```

Le canal `dev` assure une extraction git, la construit, et installe le CLI global
à partir de cette extraction. Les canaux `stable` et `beta` utilisent des installations de packages. Si le
gateway est déjà installé, `openclaw update` actualise les métadonnées du service
et le redémarre sauf si vous passez `--no-restart`.

## Alternative : réexécuter l'installateur

```bash
curl -fsSL https://openclaw.ai/install.sh | bash
```

Ajoutez `--no-onboard` pour sauter l'onboarding. Pour forcer un type d'installation spécifique via
l'installateur, passez `--install-method git --no-onboard` ou
`--install-method npm --no-onboard`.

Si `openclaw update` échoue après la phase d'installation du package npm, réexécutez
l'installateur. L'installateur n'appelle pas l'ancien programme de mise à jour ; il exécute directement l'installation du
package global et peut récupérer une installation npm partiellement mise à jour.

```bash
curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method npm
```

Pour figer la récupération à une version spécifique ou un dist-tag, ajoutez `--version` :

```bash
curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method npm --version <version-or-dist-tag>
```

## Alternative : npm, pnpm ou bun manuels

```bash
npm i -g openclaw@latest
```

Privilégiez `openclaw update` pour les installations supervisées car il peut coordonner l'échange
de packages avec le service Gateway en cours d'exécution. Si vous mettez à jour manuellement alors qu'un
Gateway géré est en cours d'exécution, redémarrez le Gateway immédiatement après que le gestionnaire de
packages a terminé afin que l'ancien processus ne continue pas à servir des fichiers de packages remplacés.

Lorsque `openclaw update` gère une installation globale npm, il installe d'abord la cible dans
un préfixe temporaire npm, vérifie l'inventaire `dist` empaqueté, puis échange
l'arborescence de paquets propre avec le vrai préfixe global. Cela évite que npm ne superpose un
nouveau paquet sur des fichiers obsolètes de l'ancien paquet. Si la commande d'installation échoue,
OpenClaw réessaie une fois avec `--omit=optional`. Cette nouvelle tentative aide les hôtes où les dépendances
optionnelles natives ne peuvent pas être compilées, tout en gardant l'échec original visible
si la solution de repli échoue également.

```bash
pnpm add -g openclaw@latest
```

```bash
bun add -g openclaw@latest
```

### Sujets avancés d'installation npm

<AccordionGroup>
  <Accordion title="Read-only package tree">
    OpenClaw traite les installations globales empaquetées comme en lecture seule lors de l'exécution, même lorsque le répertoire global du paquet est inscriptible par l'utilisateur actuel. Les installations de paquets de plugins résident dans les racines OpenClawnpm/git appartenant à Gateway sous le répertoire de configuration de l'utilisateur, et le démarrage du OpenClaw ne modifie pas l'arborescence du paquet Linux.

    Certaines configurations npm OpenClaw installent des packages globaux dans des répertoires appartenant à root, tels que `/usr/lib/node_modules/openclaw`. OpenClaw prend en charge cette disposition car les commandes d'installation/mise à jour de plugins écrivent en dehors de ce répertoire global de packages.

  </Accordion>
  <Accordion title="Hardened systemd units">
    Accordez à OpenClaw un accès en écriture à ses racines de config/état afin que les installations de plugins explicites, les mises à jour de plugins et le nettoyage du docteur puissent persister leurs modifications :

    ```ini
    ReadWritePaths=/var/lib/openclaw /home/openclaw/.openclaw /tmp
    ```

  </Accordion>
  <Accordion title="Vérification préalable de l'espace disque"OpenClaw>
    Avant les mises à jour de paquets et les installations explicites de plugins, OpenClaw tente une vérification de l'espace disque au mieux pour le volume cible. Un espace faible produit un avertissement avec le chemin vérifié, mais ne bloque pas la mise à jour car les quotas de système de fichiers, les instantanés et les volumes réseau peuvent changer après la vérification. L'installation réelle par le gestionnaire de paquets et la vérification post-installation restent déterminantes.
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
| `beta`   | Vérifie toutes les `betaCheckIntervalHours` (par défaut : toutes les heures) et applique immédiatement.               |
| `dev`    | Pas d'application automatique. Utilisez `openclaw update` manuellement.                                               |

La passerelle enregistre également un indice de mise à jour au démarrage (désactivez avec `update.checkOnStart: false`).
Pour une rétrogradation ou une récupération d'incident, définissez `OPENCLAW_NO_AUTO_UPDATE=1` dans l'environnement de la passerelle pour bloquer les applications automatiques même lorsque `update.auto.enabled` est configuré. Les indices de mise à jour au démarrage peuvent toujours s'exécuter sauf si `update.checkOnStart` est également désactivé.

Les mises à jour du gestionnaire de paquets demandées via le gestionnaire de plan de contrôle du Gateway en direct
forcent un redémarrage de mise à jour non différé et sans refroidissement après l'échange de paquets. Cela
évite de laisser un ancien processus en mémoire assez longtemps pour charger paresseusement des blocs
depuis un arbre de paquets qui a déjà été remplacé. Le shell Gateway`openclaw update`
reste le chemin privilégié pour les installations supervisées car il peut arrêter et
redémarrer le service autour de la mise à jour.

## Après la mise à jour

<Steps>

### Exécuter le médecin

```bash
openclaw doctor
```

Migre la configuration, audit les stratégies DM et vérifie la santé de la passerelle. Détails : [Médecin](/fr/gateway/doctor)

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

- Exécutez à nouveau `openclaw doctor` et lisez attentivement la sortie.
- Pour `openclaw update --channel dev` sur les sources extraites, le programme de mise à jour amorce automatiquement `pnpm` si nécessaire. Si vous rencontrez une erreur d'amorçage pnpm/corepack, installez `pnpm` manuellement (ou réactivez `corepack`) et relancez la mise à jour.
- Consultez : [Dépannage](/fr/gateway/troubleshooting)
- Demandez sur Discord : [https://discord.gg/clawd](https://discord.gg/clawd)

## Connexes

- [Vue d'ensemble de l'installation](/fr/install) : toutes les méthodes d'installation.
- [Docteur](/fr/gateway/doctor) : vérifications de l'état de santé après les mises à jour.
- [Migration](/fr/install/migrating) : guides de migration pour les versions majeures.
