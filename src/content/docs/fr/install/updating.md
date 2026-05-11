---
summary: "Mise à jour sécurisée d'OpenClaw (installation globale ou source), plus stratégie de retour en arrière"
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

`--channel beta` privilégie la version bêta, mais l'exécution revient à stable/latest lorsque
le tag bêta est manquant ou plus ancien que la dernière version stable. Utilisez `--tag beta`
si vous souhaitez le dist-tag bêta brut npm pour une mise à jour ponctuelle de package.

Voir [Canaux de développement](/fr/install/development-channels) pour la sémantique des canaux.

## Basculer entre les installations npm et git

Utilisez les canaux lorsque vous souhaitez changer le type d'installation. Le programme de mise à jour conserve votre
état, votre configuration, vos identifiants et votre espace de travail dans `~/.openclaw` ; il modifie uniquement
l'installation du code OpenClaw utilisée par le CLI et la passerelle.

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

Le canal `dev` assure une extraction git, la construit et installe le CLI global
à partir de cette extraction. Les canaux `stable` et `beta` utilisent des installations de packages. Si la
passerelle est déjà installée, `openclaw update` actualise les métadonnées du service
et la redémarre sauf si vous passez `--no-restart`.

## Alternative : relancer l'installateur

```bash
curl -fsSL https://openclaw.ai/install.sh | bash
```

Ajoutez `--no-onboard` pour ignorer l'intégration. Pour forcer un type d'installation spécifique via
l'installateur, passez `--install-method git --no-onboard` ou
`--install-method npm --no-onboard`.

Si `openclaw update` échoue après la phase d'installation du package npm, relancez
l'installateur. L'installateur n'appelle pas l'ancien programme de mise à jour ; il exécute directement l'installation
du package global et peut récupérer une installation npm partiellement mise à jour.

```bash
curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method npm
```

Pour figer la récupération sur une version ou un dist-tag spécifique, ajoutez `--version` :

```bash
curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method npm --version <version-or-dist-tag>
```

## Alternative : npm, pnpm ou bun manuels

```bash
npm i -g openclaw@latest
```

Lorsque `openclaw update` gère une installation globale npm, il installe d'abord la cible dans
un préfixe npm temporaire, vérifie l'inventaire `dist` empaqueté, puis échange
l'arborescence de paquets propre contre le préfixe global réel. Cela évite à npm de superposer un
nouveau paquet aux fichiers obsolètes de l'ancien paquet. Si la commande d'installation échoue,
OpenClaw réessaie une fois avec `--omit=optional`. Cette nouvelle tentative aide les hôtes où les dépendances
optionnelles natives ne peuvent pas être compilées, tout en gardant l'échec original visible
si la solution de secourt échoue également.

```bash
pnpm add -g openclaw@latest
```

```bash
bun add -g openclaw@latest
```

### Rubriques avancées sur l'installation npm

<AccordionGroup>
  <Accordion title="Arborescence de paquets en lecture seule">
    OpenClaw traite les installations globales empaquetées comme étant en lecture seule lors de l'exécution, même lorsque le répertoire du paquet global est accessible en écriture par l'utilisateur actuel. Les dépendances d'exécution des plugins empaquetés sont placées dans un répertoire d'exécution accessible en écriture au lieu de modifier l'arborescence des paquets. Cela empêche `openclaw update` d'entrer en concurrence avec une passerelle en cours d'exécution ou un agent local qui répare les dépendances des plugins lors de la même installation.

    Certaines configurations Linux npm installent des paquets globaux dans des répertoires détenus par root, tels que `/usr/lib/node_modules/openclaw`. OpenClaw prend en charge cette disposition via le même chemin de mise en scène externe.

  </Accordion>
  <Accordion title="Unités systemd renforcées">
    Définissez un répertoire de mise en scène accessible en écriture qui est inclus dans `ReadWritePaths` :

    ```ini
    Environment=OPENCLAW_PLUGIN_STAGE_DIR=/var/lib/openclaw/plugin-runtime-deps
    ReadWritePaths=/var/lib/openclaw /home/openclaw/.openclaw /tmp
    ```

    `OPENCLAW_PLUGIN_STAGE_DIR` accepte également une liste de chemins. OpenClaw résout les dépendances d'exécution des plugins empaquetées de gauche à droite sur les racines répertoriées, traite les racines antérieures comme des couches préinstallées en lecture seule, et n'installe ou ne répare que dans la racine accessible en écriture finale :

    ```ini
    Environment=OPENCLAW_PLUGIN_STAGE_DIR=/opt/openclaw/plugin-runtime-deps:/var/lib/openclaw/plugin-runtime-deps
    ReadWritePaths=/var/lib/openclaw /home/openclaw/.openclaw /tmp
    ```

    Si `OPENCLAW_PLUGIN_STAGE_DIR` n'est pas défini, OpenClaw utilise `$STATE_DIRECTORY` lorsque systemd le fournit, puis revient à `~/.openclaw/plugin-runtime-deps`. L'étape de réparation traite cette mise en scène comme une racine de paquet locale détenue par OpenClaw et ignore le préfixe utilisateur npm et les paramètres globaux, donc la configuration npm d'installation globale ne redirige pas les dépendances des plugins empaquetés vers `~/node_modules` ou l'arborescence des paquets globaux.

  </Accordion>
  <Accordion title="Disk-space preflight">
    Avant les mises à jour des packages et les réparations des dépendances d'exécution groupées, OpenClaw tente une vérification de l'espace disque au mieux pour le volume cible. Un espace faible produit un avertissement avec le chemin vérifié, mais ne bloque pas la mise à jour car les quotas de système de fichiers, les instantanés et les volumes réseau peuvent changer après la vérification. L'installation npm réelle, la copie et la vérification post-installation restent autoritaires.
  </Accordion>
  <Accordion title="Bundled plugin runtime dependencies">
    Les installations packagées maintiennent les dépendances d'exécution des plugins groupés en dehors de l'arborescence de packages en lecture seule. Au démarrage et pendant `openclaw doctor --fix`, OpenClaw répare les dépendances d'exécution uniquement pour les plugins groupés qui sont actifs dans la configuration, actifs via la configuration de canal héritée, ou activés par leur défaut de manifeste groupé. L'état d'authentification de canal persisté seul ne déclenche pas la réparation des dépendances d'exécution au démarrage du Gateway.

    La désactivation explicite l'emporte. Un plugin ou canal désactivé ne voit pas ses dépendances d'exécution réparées simplement parce qu'il existe dans le package. Les plugins externes et les chemins de chargement personnalisés utilisent toujours `openclaw plugins install` ou `openclaw plugins update`.

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
| `dev`    | Aucune application automatique. Utilisez `openclaw update` manuellement.                                              |

Le gateway enregistre également un indice de mise à jour au démarrage (désactivez avec `update.checkOnStart: false`).
Pour une rétrogradation ou une récupération d'incident, définissez `OPENCLAW_NO_AUTO_UPDATE=1` dans l'environnement du gateway pour bloquer les applications automatiques même lorsque `update.auto.enabled` est configuré. Les indices de mise à jour au démarrage peuvent toujours s'exécuter sauf si `update.checkOnStart` est également désactivé.

## Après la mise à jour

<Steps>

### Exécuter le docteur

```bash
openclaw doctor
```

Migre la configuration, audite les politiques DM et vérifie l'état de la passerelle. Détails : [Doctor](/fr/gateway/doctor)

### Redémarrez la passerelle

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
- Pour `openclaw update --channel dev` sur les extraits de code source, le programme de mise à jour amorce automatiquement `pnpm` si nécessaire. Si vous voyez une erreur d'amorçage pnpm/corepack, installez `pnpm` manuellement (ou réactivez `corepack`) et relancez la mise à jour.
- Vérifier : [Dépannage](/fr/gateway/troubleshooting)
- Demandez sur Discord : [https://discord.gg/clawd](https://discord.gg/clawd)

## Connexes

- [Vue d'ensemble de l'installation](/fr/install) : toutes les méthodes d'installation.
- [Doctor](/fr/gateway/doctor) : vérifications de santé après les mises à jour.
- [Migration](/fr/install/migrating) : guides de migration pour les versions majeures.
