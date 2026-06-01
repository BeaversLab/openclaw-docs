---
summary: "OpenClawComment OpenClaw installe les packages de plugins et résout les dépendances des plugins"
read_when:
  - You are debugging plugin package installs
  - You are changing plugin startup, doctor, or package-manager install behavior
  - You are maintaining packaged OpenClaw installs or bundled plugin manifests
title: "Résolution des dépendances de plugins"
sidebarTitle: "Dépendances"
---

OpenClaw conserve le travail des dépendances de plugins au moment de l'installation/de la mise à jour. Le chargement à l'exécution
n'exécute pas les gestionnaires de packages, ne répare pas les arbres de dépendances, ni ne modifie le répertoire de
packages d'OpenClaw.

## Répartition des responsabilités

Les packages de plugins possèdent leur propre graphe de dépendances :

- les dépendances d'exécution résident dans le package de plugins `dependencies` ou
  `optionalDependencies`
- les importations SDK/core sont des importations homologues ou fournies par OpenClaw
- les plugins de développement locaux apportent leurs propres dépendances déjà installées
- les plugins npm et git sont installés dans les racines de packages détenues par OpenClaw

OpenClaw ne possède que le cycle de vie du plugin :

- découvrir la source du plugin
- installer ou mettre à jour le package lorsque cela est explicitement demandé
- enregistrer les métadonnées d'installation
- charger le point d'entrée du plugin
- échouer avec une erreur exploitable lorsque des dépendances sont manquantes

## Racines d'installation

OpenClaw utilise des racines stables par source :

- Les packages npm sont installés dans des projets par plugin sous
  `~/.openclaw/npm/projects/<encoded-package>`
- les packages git sont clonés sous `~/.openclaw/git`
- les installations local/path/archive sont copiées ou référencées sans réparation des dépendances

Les installations npm s'exécutent dans la racine du projet par plugin avec :

```bash
cd ~/.openclaw/npm/projects/<encoded-package>
npm install --omit=dev --omit=peer --legacy-peer-deps --ignore-scripts --no-audit --no-fund
```

`openclaw plugins install npm-pack:<path.tgz>` utilise cette même racine de projet npm par plugin
pour une archive tar locale npm-pack. OpenClaw lit les métadonnées npm
de l'archive tar, l'ajoute au projet géré en tant que dépendance `file:` copiée, exécute
l'installation npm normale, puis vérifie les métadonnées du lockfile installé avant
de faire confiance au plugin.
Ceci est prévu pour l'acceptation des packages et la preuve des candidats à la publication où
un artefact de pack local doit se comporter comme l'artefact de registre qu'il simule.

npm peut hisser les dépendances transitives dans le
`node_modules` du projet par plugin à côté du package du plugin. OpenClaw analyse la racine du projet
géré avant de faire confiance à l'installation et supprime ce projet lors de la désinstallation, de sorte que
les dépendances d'exécution hissées restent à l'intérieur des limites de nettoyage de ce plugin.

Les packages de plugin publiés npm peuvent inclure `npm-shrinkwrap.json`. npm utilise ce
lockfile publiable lors de l'installation, et la racine du projet OpenClaw géré par npm
la prend en charge via le chemin d'installation npm normal. Les packages de plugin
publiables appartenant à OpenClaw doivent inclure un shrinkwrap local au package généré à partir du
graphe de dépendances publié de ce package de plugin :

```bash
pnpm deps:shrinkwrap:generate
pnpm deps:shrinkwrap:check
```

Le générateur supprime `devDependencies` du plugin, applique la politique de remplacement de l'espace de travail et écrit `extensions/<id>/npm-shrinkwrap.json` pour chaque plugin `publishToNpm`. Les packages de plugins tiers peuvent également inclure un shrinkwrap ; OpenClaw ne l'exige pas pour les packages communautaires, mais npm le respectera lorsqu'il est présent.

Les packages de plugins OpenClaw détenus par npm peuvent également être publiés avec un `bundledDependencies` explicite. Le chemin de publication npm superpose la liste des noms des dépendances d'exécution, supprime les métadonnées de l'espace de travail réservées au développement du manifeste du package publié, exécute une installation npm sans script pour les dépendances d'exécution locales au package, puis empaquette ou publie l'archive du plugin avec ces fichiers de dépendance inclus. Les packages très natifs, y compris les runtimes Codex et ACP, se désactivent avec `openclaw.release.bundleRuntimeDependencies: false` ; ces packages envoient toujours leur shrinkwrap, mais npm résout les dépendances d'exécution lors de l'installation au lieu d'intégrer chaque binaire de plateforme dans l'archive du plugin. Le package racine `openclaw` n'inclut pas son arbre de dépendances complet.

Les plugins qui importent `openclaw/plugin-sdk/*` déclarent `openclaw`OpenClawnpmnpmnpmnpmOpenClaw comme dépendance pair (peer). OpenClaw ne permet pas à npm d'installer une copie distincte du registre du package hôte dans un projet géré, car les packages hôtes obsolètes peuvent affecter la résolution des pairs npm à l'intérieur de ce plugin. Les installations gérées par npm ignorent la résolution/matérialisation des pairs npm et OpenClaw réaffirme les liens `node_modules/openclaw` locaux au plugin pour les packages installés qui déclarent l'hôte comme pair après l'installation ou la mise à jour.

Les installations git clonent ou actualisent le dépôt, puis exécutent :

```bash
npm install --omit=dev --ignore-scripts --no-audit --no-fund
```

Le plugin installé se charge ensuite depuis ce répertoire de package, donc la résolution `node_modules` locale au package et parente fonctionne de la même manière que pour un package Node normal.

## Plugins locaux

Les plugins locaux sont traités comme des répertoires contrôlés par le développeur. OpenClaw n'exécute pas `npm install`, `pnpm install`, ni de réparation de dépendances pour eux. Si un plugin local a des dépendances, installez-les dans ce plugin avant de le charger.

Les plugins locaux tiers TypeScript peuvent utiliser le chemin d'urgence Jiti. Les plugins JavaScript empaquetés et les plugins internes regroupés sont chargés via un import/require natif au lieu de Jiti.

## Démarrage et rechargement

Le démarrage de Gateway et le rechargement de la configuration n'installent jamais les dépendances des plugins. Ils lisent les enregistrements d'installation des plugins, calculent le point d'entrée et le chargent.

Si une dépendance est manquante lors de l'exécution, le plugin échoue à se charger et l'erreur doit indiquer à l'opérateur une solution explicite :

```bash
openclaw plugins update <id>
openclaw plugins install <source>
openclaw doctor --fix
```

`doctor --fix` peut nettoyer l'état des dépendances héritées générées par OpenClaw et récupérer les plugins téléchargeables manquants dans les enregistrements d'installation locaux lorsque la configuration les référence. Doctor ne répare pas les dépendances pour un plugin local déjà installé.

## Plugins regroupés

Les plugins regroupés légers et critiques pour le cœur sont fournis dans le cadre de OpenClaw. Ils ne doivent pas avoir d'arbre de dépendances d'exécution volumineux, ou être déplacés vers un package téléchargeable sur ClawHub/npm.

Pour la liste générée actuelle des plugins qui sont livrés dans le package principal, installés en externe ou qui restent uniquement au niveau source, voir [Plugin inventory](/fr/plugins/plugin-inventory).

Les manifestes de plugins regroupés ne doivent pas demander de mise en place de dépendances. Les fonctionnalités de plugins volumineuses ou optionnelles doivent être empaquetées en tant que plugin normal et installées via le même chemin npm/git/ClawHub que les plugins tiers.

Dans les extraits de source, OpenClaw traite le référentiel comme un monorepo pnpm. Après `pnpm install`, les plugins regroupés sont chargés à partir de `extensions/<id>` afin que les dépendances de l'espace de travail locales au package soient disponibles et que les modifications soient prises en compte directement. Le développement sur l'extrait de source est réservé à pnpm ; le `npm install` simple à la racine du référentiel n'est pas une méthode prise en charge pour préparer les dépendances des plugins regroupés.

| Forme d'installation             | Emplacement du plugin regroupé                       | Propriétaire de la dépendance                                                                |
| -------------------------------- | ---------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `npm install -g openclaw`        | Arbre d'exécution construit à l'intérieur du package | Le package OpenClaw et les flux d'installation/mise à jour/réparation explicites des plugins |
| Git checkout plus `pnpm install` | Packages de l'espace de travail `extensions/<id>`    | L'espace de travail pnpm, y compris les dépendances propres de chaque package de plugin      |
| `openclaw plugins install ...`   | Racine de projet géré npm/git/ClawHub                | Le flux d'installation/mise à jour des plugins                                               |

## Nettoyage de l'héritage

Les anciennes versions de OpenClaw généraient des racines de dépendances de plugins groupés au démarrage ou pendant la réparation du doctor. Le nettoyage actuel du doctor supprime ces répertoires et liens symboliques obsolètes lorsque `--fix` est utilisé, y compris les anciennes racines `plugin-runtime-deps`, les liens symboliques de packages globaux avec préfixe Node qui pointent vers des cibles `plugin-runtime-deps` élaguées, les manifestes `.openclaw-runtime-deps*`, les `node_modules` de plugins générés, les répertoires de l'étape d'installation et les magasins pnpm locaux aux packages. Le postinstall conditionné supprime également ces liens symboliques globaux avant d'élaguer les racines cibles héritées afin que les mises à niveau ne laissent pas d'imports de packages ESM en suspens.

Les anciennes installations npm utilisaient également une racine npm`~/.openclaw/npm/node_modules`npm partagée.
Les flux d'installation, de mise à jour, de désinstallation et de diagnostic actuels reconnaissent toujours cette ancienne racine plate uniquement pour la récupération et le nettoyage. Les nouvelles installations npm devraient créer des racines de projet par plugin à la place.
