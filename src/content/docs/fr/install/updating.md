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

Voir [Canaux de développement](/fr/install/development-channels) pour la sémantique des canaux.

## Basculer entre les installations npm et git

Utilisez les canaux lorsque vous souhaitez changer le type d'installation. Le programme de mise à jour conserve votre
état, votre configuration, vos identifiants et votre espace de travail dans `~/.openclaw` ; il ne modifie que
l'installation du code OpenClaw utilisée par le CLI et la passerelle.

```bash
# npm package install -> editable git checkout
openclaw update --channel dev

# git checkout -> npm package install
openclaw update --channel stable
```

Exécutez d'abord avec `--dry-run` pour prévisualiser le basculement exact du mode d'installation :

```bash
openclaw update --channel dev --dry-run
openclaw update --channel stable --dry-run
```

Le canal `dev` assure une extraction git, la construit et installe le CLI global
à partir de cette extraction. Les canaux `stable` et `beta` utilisent des installations de packages. Si la
passerelle est déjà installée, `openclaw update` actualise les métadonnées du service
et le redémarre, sauf si vous passez `--no-restart`.

## Alternative : réexécuter l'installeur

```bash
curl -fsSL https://openclaw.ai/install.sh | bash
```

Ajoutez `--no-onboard` pour ignorer l'onboarding. Pour forcer un type d'installation spécifique via
l'installateur, passez `--install-method git --no-onboard` ou
`--install-method npm --no-onboard`.

Si `openclaw update` échoue après la phase d'installation du paquet npm, relancez
l'installateur. L'installateur n'appelle pas l'ancien outil de mise à jour ; il exécute l'installation
globale du paquet directement et peut récupérer une installation npm partiellement mise à jour.

```bash
curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method npm
```

Pour figer la récupération à une version spécifique ou à une balise de distribution (dist-tag), ajoutez `--version` :

```bash
curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method npm --version <version-or-dist-tag>
```

## Alternative : npm, pnpm ou bun manuel

```bash
npm i -g openclaw@latest
```

Préférez `openclaw update` pour les installations supervisées car il peut coordonner l'échange
de paquets avec le service Gateway en cours d'exécution. Si vous mettez à jour manuellement alors qu'un
Gateway géré est en cours d'exécution, redémarrez le Gateway immédiatement après la fin du gestionnaire
de paquets afin que l'ancien processus ne continue pas à servir à partir des fichiers
de paquets remplacés.

Lorsque `openclaw update` gère une installation globale npm, il installe la cible dans
un préfixe npm temporaire, vérifie l'inventaire `dist` du paquet, puis échange
l'arborescence de paquets propre dans le véritable préfixe global. Cela évite à npm de superposer un
nouveau paquet sur des fichiers obsolètes de l'ancien paquet. Si la commande d'installation échoue,
OpenClaw réessaie une fois avec `--omit=optional`. Cette nouvelle tentative aide les hôtes où les dépendances
optionnelles natives ne peuvent pas être compilées, tout en gardant l'échec original visible
si la solution de secours échoue également.

```bash
pnpm add -g openclaw@latest
```

```bash
bun add -g openclaw@latest
```

### Sujets avancés sur l'installation npm

<AccordionGroup>
  <Accordion title="Arborescence de packages en lecture seule"OpenClawOpenClawnpmGatewayOpenClawLinuxnpm>
    OpenClaw traite les installations globales packagées comme étant en lecture seule lors de l'exécution, même lorsque le répertoire global des packages est accessible en écriture par l'utilisateur actuel. Les installations de packages de plugins résident dans les racines npm/git détenues par OpenClaw sous le répertoire de configuration utilisateur, et le démarrage de la Gateway ne modifie pas l'arborescence des packages OpenClaw.

    Certaines configurations npm sous Linux installent les packages globaux dans des répertoires détenus par root, tels que `/usr/lib/node_modules/openclaw`OpenClaw. OpenClaw prend en charge cette disposition car les commandes d'installation/de mise à jour de plugins écrivent en dehors de ce répertoire global de packages.

  </Accordion>
  <Accordion title="Unités systemd renforcées"OpenClaw>
    Accordez à OpenClaw un accès en écriture à ses racines de configuration/état afin que les installations explicites de plugins, les mises à jour de plugins et le nettoyage du doctor puissent conserver leurs modifications :

    ```ini
    ReadWritePaths=/var/lib/openclaw /home/openclaw/.openclaw /tmp
    ```

  </Accordion>
  <Accordion title="Vérification préalable de l'espace disque"OpenClaw>
    Avant les mises à jour de packages et les installations explicites de plugins, OpenClaw tente une vérification de l'espace disque au mieux pour le volume cible. Un espace faible produit un avertissement avec le chemin vérifié, mais ne bloque pas la mise à jour car les quotas de système de fichiers, les instantanés et les volumes réseau peuvent changer après la vérification. L'installation réelle du gestionnaire de packages et la vérification post-installation restent autoritaires.
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

Le Gateway enregistre également un indice de mise à jour au démarrage (désactivez avec `update.checkOnStart: false`).
Pour une rétrogradation ou une récupération après incident, définissez `OPENCLAW_NO_AUTO_UPDATE=1` dans l'environnement du Gateway pour bloquer l'application automatique même lorsque `update.auto.enabled` est configuré. Les indices de mise à jour au démarrage peuvent toujours s'exécuter sauf si `update.checkOnStart` est également désactivé.

Les mises à jour du gestionnaire de packages demandées via le gestionnaire de plan de contrôle du Gateway en direct
forcent un redémarrage de mise à jour sans délai ni temps de recharge après l'échange de packages. Cela
évite de laisser un ancien processus en mémoire assez longtemps pour charger paresseusement des blocs
depuis une arborescence de packages qui a déjà été remplacée. Le shell Gateway`openclaw update`
reste le chemin privilégié pour les installations supervisées car il peut arrêter et
redémarrer le service autour de la mise à jour.

## Après la mise à jour

<Steps>

### Exécuter le doctor

```bash
openclaw doctor
```

Migre la configuration, audite les stratégies DM et vérifie la santé du Gateway. Détails : [Doctor](/fr/gateway/doctor)

### Redémarrer le Gateway

```bash
openclaw gateway restart
```

### Vérifier

```bash
openclaw health
```

</Steps>

## Annulation (Rollback)

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
- Consultez : [Dépannage](/fr/gateway/troubleshooting)
- Demandez sur Discord : [https://discord.gg/clawd](https://discord.gg/clawd)

## Connexes

- [Vue d'ensemble de l'installation](/fr/install) : toutes les méthodes d'installation.
- [Doctor](/fr/gateway/doctor) : vérifications de santé après les mises à jour.
- [Migration](/fr/install/migrating) : guides de migration pour les versions majeures.
