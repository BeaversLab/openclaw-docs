---
summary: "npmOpenClawExplication en langage clair et technique du npm shrinkwrap dans les versions d'OpenClaw"
read_when:
  - You want to know what npm shrinkwrap means in an OpenClaw release
  - You are reviewing package lockfiles, dependency changes, or supply-chain risk
  - You are validating root or plugin npm packages before publishing
title: "npmnpm shrinkwrap"
---

Les extraits de code source d'OpenClaw utilisent OpenClaw`pnpm-lock.yaml`OpenClawnpm. Les packages npm OpenClaw publiés
utilisent `npm-shrinkwrap.json`npm, le fichier de verrouillage des dépendances publiable par npm, de sorte que
les installations de packages utilisent le graphe de dépendances examiné lors de la publication.

## La version simplifiée

Shrinkwrap est un reçu pour l'arborescence des dépendances qui accompagne un package npm.
Il indique à npm quelles versions exactes de packages transitifs installer.

Pour les versions d'OpenClaw, cela signifie :

- le package publié ne demande pas à npm d'inventer un nouveau graphe de dépendances au
  moment de l'installation ;
- les modifications de dépendances sont plus faciles à examiner car elles apparaissent dans un fichier de verrouillage ;
- la validation de la publication peut tester le même graphe que les utilisateurs installeront ;
- les surprises liées à la taille du package ou aux dépendances natives sont plus faciles à repérer avant
  la publication.

Shrinkwrap n'est pas un bac à sable. Il ne rend pas une dépendance sûre par lui-même, et
il ne remplace pas l'isolation de l'hôte, `openclaw security audit`, la
provenance du package, ou les tests de fumée de l'installation.

Le modèle mental simplifié :

| Fichier               | Où cela compte                     | Ce que cela signifie                            |
| --------------------- | ---------------------------------- | ----------------------------------------------- |
| `pnpm-lock.yaml`      | Extraction du code source OpenClaw | Graphe de dépendances du mainteneur             |
| `npm-shrinkwrap.json` | Package npm publié                 | Graphe d'installation npm pour les utilisateurs |
| `package-lock.json`   | Applications npm locales           | Pas le contrat de publication OpenClaw          |

## Pourquoi OpenClaw l'utilise

OpenClaw est une passerelle, un hôte de plugins, un routeur de modèle et un environnement d'exécution d'agent. Une installation
par défaut peut affecter le temps de démarrage, l'utilisation du disque, les téléchargements de packages natifs et
l'exposition à la chaîne d'approvisionnement.

Shrinkwrap donne à l'examen de la publication une limite stable :

- les réviseurs peuvent voir les mouvements des dépendances transitives ;
- les validateurs de packages peuvent rejeter une dérive inattendue du fichier de verrouillage ;
- l'acceptation des paquets peut tester les installations avec le graphe qui sera livré ;
- les paquets de plugins peuvent transporter leur propre graphe de dépendances verrouillé au lieu de
  s'appuyer sur le paquet racine pour posséder les dépendances propres aux plugins.

L'objectif n'est pas « plus de fichiers de verrouillage ». L'objectif est des installations de publication
reproductibles avec une propriété claire.

## Détails techniques

Le paquet `openclaw` npm racine et les paquets de plugins OpenClaw appartenant à npm incluent
`npm-shrinkwrap.json` lors de leur publication. Les paquets de plugins adaptés appartenant à OpenClaw
peuvent également être publiés avec `bundledDependencies` explicite, afin que leurs fichiers de
dépendances d'exécution soient transportés dans l'archive du plugin au lieu de dépendre uniquement de
la résolution au moment de l'installation.

Maintenez la limite comme suit :

```bash
pnpm deps:shrinkwrap:generate
pnpm deps:shrinkwrap:check
```

Le générateur résout le format de verrou publiable de npm mais rejette les versions de
paquets générées qui ne sont pas déjà présentes dans `pnpm-lock.yaml`. Cela permet de garder
intacte la limite d'âge, de remplacement et de révision correctifs des dépendances pnpm.

Utilisez les commandes racine uniquement lorsque vous rafraîchissez intentionnellement le paquet racine
sans toucher aux paquets de plugins :

```bash
pnpm deps:shrinkwrap:root:generate
pnpm deps:shrinkwrap:root:check
```

Examinez ces fichiers comme sensibles à la sécurité :

- `pnpm-lock.yaml`
- `npm-shrinkwrap.json`
- charges utiles de dépendances de plugin groupées
- toute différence `package-lock.json`

Les validateurs de paquets OpenClaw exigent un shrinkwrap dans les nouvelles archives de paquets racines.
Le chemin de publication du plugin npm vérifie le shrinkwrap local du plugin, installe
les dépendances groupées locales au paquet, puis compresse ou publie. Les validateurs
de paquets rejettent `package-lock.json` pour les paquets OpenClaw publiés.

Pour inspecter un paquet racine publié :

```bash
npm pack openclaw@<version> --json --pack-destination /tmp/openclaw-pack
tar -tf /tmp/openclaw-pack/openclaw-<version>.tgz | grep '^package/npm-shrinkwrap.json$'
```

Pour inspecter un paquet de plugin appartenant à OpenClaw :

```bash
npm pack @openclaw/discord@<version> --json --pack-destination /tmp/openclaw-plugin-pack
tar -tf /tmp/openclaw-plugin-pack/openclaw-discord-<version>.tgz | grep '^package/npm-shrinkwrap.json$'
tar -tf /tmp/openclaw-plugin-pack/openclaw-discord-<version>.tgz | grep '^package/node_modules/'
```

Arrière-plan : [npm-shrinkwrap.](https://docs.npmjs.com/cli/v11/configuring-npm/npm-shrinkwrap-json).
