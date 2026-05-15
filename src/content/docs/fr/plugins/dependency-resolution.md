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

- les dépendances d'exécution résident dans le `dependencies` du package de plugin ou
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

- les packages npm s'installent sous npm`~/.openclaw/npm`
- les packages git sont clonés sous `~/.openclaw/git`
- les installations local/path/archive sont copiées ou référencées sans réparation des dépendances

les installations npm s'exécutent dans la racine npm avec :

```bash
cd ~/.openclaw/npm
npm install --omit=dev --omit=peer --legacy-peer-deps --ignore-scripts --no-audit --no-fund
```

`openclaw plugins install npm-pack:<path.tgz>`npmnpmOpenClawnpm utilise cette même racine npm gérée
pour une archive tar locale de npm-pack. OpenClaw lit les métadonnées npm de l'archive, l'ajoute
à la racine gérée en tant que dépendance `file:`npm copiée, exécute l'installation npm normale,
et vérifie ensuite les métadonnées du fichier de verrouillage installé avant de faire confiance au plugin.
Ceci est destiné à la validation de packages et aux preuves de version candidate, où un
artefact de pack local doit se comporter comme l'artefact de registre qu'il simule.

npm peut hisser les dépendances transitives vers npm`~/.openclaw/npm/node_modules`OpenClawnpmnpmnpm à côté
du package de plugins. OpenClaw analyse la racine gérée de npm avant de faire confiance à
l'installation et utilise npm pour supprimer les packages gérés par npm lors de la désinstallation, afin que les dépendances d'exécution hissées restent dans la limite de nettoyage gérée.

Les plugins qui importent `openclaw/plugin-sdk/*` déclarent `openclaw`OpenClawnpmnpmnpmnpmOpenClaw comme dépendance pair.
OpenClaw n'autorise pas npm à installer une copie de registre distincte du
package hôte dans la racine gérée, car les packages hôtes obsolètes peuvent affecter la résolution de pairs
npm lors des installations ultérieures de plugins. Les installations gérées de npm ignorent la résolution/matérialisation
de pairs npm pour la racine partagée et OpenClaw réaffirme les liens
locaux du plugin `node_modules/openclaw` pour les packages installés qui déclarent
l'hôte comme pair après l'installation, la mise à jour ou la désinstallation.

Les installations git clonent ou actualisent le référentiel, puis exécutent :

```bash
npm install --omit=dev --ignore-scripts --no-audit --no-fund
```

Le plugin installé se charge ensuite depuis ce répertoire de package, de sorte que la résolution
`node_modules` locale et parente fonctionne de la même manière que pour un package
Node normal.

## Plugins locaux

Les plugins locaux sont traités comme des répertoires contrôlés par le développeur. OpenClaw n'exécute
pas OpenClaw`npm install`, `pnpm install`, ou de réparation de dépendances pour eux. Si un plugin
local a des dépendances, installez-les dans ce plugin avant de le charger.

Les plugins locaux tiers TypeScript peuvent utiliser le chemin d'urgence Jiti. Les plugins
JavaScript empaquetés et les plugins internes groupés se chargent via
import/require natif au lieu de Jiti.

## Démarrage et rechargement

Le démarrage et le rechargement de la configuration de Gateway n'installent jamais les dépendances des plugins. Ils lisent
les enregistrements d'installation des plugins, calculent le point d'entrée et le chargent.

Si une dépendance est manquante lors de l'exécution, le plugin échoue à se charger et l'erreur
devrait orienter l'opérateur vers une correction explicite :

```bash
openclaw plugins update <id>
openclaw plugins install <source>
openclaw doctor --fix
```

`doctor --fix` peut nettoyer l'état des dépendances héritées générées par OpenClaw et récupérer les plugins téléchargeables manquants dans les enregistrements d'installation locaux lorsque la configuration y fait référence. Doctor ne répare pas les dépendances d'un plugin local déjà installé.

## Plugins regroupés

Les plugins regroupés légers et critiques pour le cœur sont fournis dans OpenClaw. Ils ne doivent pas avoir d'arbre de dépendances d'exécution volumineux ou être déplacés vers un package téléchargeable sur ClawHub/npm.

Pour la liste actuelle générée des plugins livrés dans le package principal, installés en externe ou restés en mode source uniquement, consultez [Inventaire des plugins](/fr/plugins/plugin-inventory).

Les manifestes des plugins regroupés ne doivent pas demander la mise en scène des dépendances. Les fonctionnalités de plugin volumineuses ou optionnelles doivent être empaquetées sous forme de plugin normal et installées via le même chemin npm/git/ClawHub que les plugins tiers.

Dans les extraits de source, OpenClaw traite le référentiel comme un monorepo pnpm. Après `pnpm install`, les plugins regroupés sont chargés à partir de `extensions/<id>` afin que les dépendances de l'espace de travail local au package soient disponibles et que les modifications soient prises en compte directement. Le développement sur extrait de source est réservé à pnpm ; un `npm install` simple à la racine du référentiel n'est pas une méthode prise en charge pour préparer les dépendances des plugins regroupés.

| Forme d'installation               | Emplacement du plugin regroupé                       | Propriétaire de la dépendance                                                           |
| ---------------------------------- | ---------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `npm install -g openclaw`          | Arbre d'exécution construit à l'intérieur du package | Package OpenClaw et flux explicites d'installation/mise à jour/doctor de plugin         |
| Extraction Git plus `pnpm install` | Packages de l'espace de travail `extensions/<id>`    | L'espace de travail pnpm, y compris les dépendances propres de chaque package de plugin |
| `openclaw plugins install ...`     | Racine de plugin gérée npm/git/ClawHub               | Le flux d'installation/mise à jour du plugin                                            |

## Nettoyage des héritages

Les anciennes versions d'OpenClaw généraient les racines de dépendances des plugins regroupés au démarrage ou lors de la réparation du docteur. Le nettoyage actuel du docteur supprime ces répertoires et liens symboliques obsolètes lorsque OpenClaw`--fix` est utilisé, y compris les anciennes racines `plugin-runtime-deps`, les liens symboliques de packages globaux de préfixe Node qui pointent vers des cibles `plugin-runtime-deps` élaguées, les manifestes `.openclaw-runtime-deps*`, les `node_modules` de plugin générés, les répertoires de phase d'installation et les magasins pnpm locaux aux packages. Le postinstall conditionné supprime également ces liens symboliques globaux avant d'élaguer les racines cibles héritées afin que les mises à niveau ne laissent pas d'imports de packages ESM en suspens.

Ces chemins ne sont que des débris hérités. Les nouvelles installations ne devraient pas les créer.
