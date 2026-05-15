---
summary: "OpenClawComment OpenClaw gère en toute sécurité l'accès aux fichiers locaux et pourquoi l'assistant Python fs-safe est désactivé par défaut"
read_when:
  - Changing file access, archive extraction, workspace storage, or plugin filesystem helpers
title: "Opérations sécurisées sur les fichiers"
---

OpenClaw utilise [OpenClaw`@openclaw/fs-safe`](https://github.com/openclaw/fs-safe) pour les opérations locales sur les fichiers sensibles sur le plan de la sécurité : lectures/écritures bornées à la racine, remplacement atomique, extraction d'archives, espaces de travail temporaires, état JSON et gestion des fichiers secrets.

L'objectif est une **garde-fou de bibliothèque** cohérente pour le code de confiance OpenClaw qui reçoit des noms de chemin non fiables. Ce n'est pas un bac à sable. Les autorisations du système de fichiers de l'hôte, les utilisateurs du système d'exploitation, les conteneurs et la stratégie de l'agent/tool définissent toujours le rayon d'impact réel.

## Par défaut : pas d'assistant Python

OpenClaw désactive par défaut (**off**) l'assistant Python POSIX fs-safe.

Pourquoi :

- la passerelle ne doit pas lancer de sidecar Python persistant sauf si un opérateur l'a explicitement choisi ;
- de nombreuses installations n'ont pas besoin du durcissement supplémentaire contre la mutation du répertoire parent ;
- la désactivation de Python rend le comportement du package/runtime plus prévisible sur les environnements de bureau, Docker, CI et d'applications groupées.

OpenClaw ne modifie que la valeur par défaut. Si vous définissez explicitement un mode, fs-safe le respecte :

```bash
# Default OpenClaw behavior: Node-only fs-safe fallbacks.
OPENCLAW_FS_SAFE_PYTHON_MODE=off

# Opt into the helper when available, falling back if unavailable.
OPENCLAW_FS_SAFE_PYTHON_MODE=auto

# Fail closed if the helper cannot start.
OPENCLAW_FS_SAFE_PYTHON_MODE=require

# Optional explicit interpreter.
OPENCLAW_FS_SAFE_PYTHON=/usr/bin/python3
```

Les noms génériques fs-safe fonctionnent également : `FS_SAFE_PYTHON_MODE` et `FS_SAFE_PYTHON`.

## Ce qui reste protégé sans Python

Avec l'assistant désactivé, OpenClaw utilise toujours les chemins Node de fs-safe pour :

- rejeter les échappements de chemin relatif tels que `..`, les chemins absolus et les séparateurs de chemin où seuls les noms sont autorisés ;
- résoudre les opérations via un handle racine de confiance au lieu de vérifications `path.resolve(...).startsWith(...)` ad hoc ;
- refuser les modèles de liens symboliques et de liens durs sur les API qui exigent cette stratégie ;
- ouvrir des fichiers avec des vérifications d'identité lorsque l'API renvoie ou consomme le contenu des fichiers ;
- les écritures temporaires frères atomiques pour les fichiers d'état/de configuration ;
- les limites d'octets pour les lectures et l'extraction d'archives ;
- les modes privés pour les fichiers secrets et d'état lorsque l'API les exige.

Ces protections couvrent le modèle de menace normal d'OpenClaw : code de passerielle de confiance gérant des entrées de chemin de modèle/plugin/channel non fiables au sein d'une même limite d'opérateur de confiance.

## Ce qu'ajoute Python

Sur POSIX, l'assistant facultatif de fs-safe conserve un processus Python persistant et utilise des opérations de système de fichiers relatives aux descripteurs de fichiers pour les mutations de répertoires parents telles que renommer, supprimer, créer un répertoire, stat/liste, et certains chemins d'écriture.

Cela réduit les fenêtres de course du même UID où un autre processus pourrait échanger un répertoire parent entre la validation et la mutation. C'est une défense en profondeur pour les hôtes où des processus locaux non fiables peuvent modifier les mêmes répertoires dans lesquels OpenClaw opère.

Si votre déploiement présente ce risque et que l'existence de Python est garantie, utilisez :

```bash
OPENCLAW_FS_SAFE_PYTHON_MODE=require
```

Utilisez `require` plutôt que `auto` lorsque l'assistant fait partie de votre posture de sécurité ; `auto` revient intentionnellement à un comportement uniquement Node si l'assistant n'est pas disponible.

## Recommandations pour les plugins et le cœur

- L'accès aux fichiers orienté plugin devrait passer par les assistants `openclaw/plugin-sdk/*`, et non par `fs` brut, lorsqu'un chemin provient d'un message, d'une sortie de modèle, d'une configuration ou d'une entrée de plugin.
- Le code central devrait utiliser les enveloppeurs fs-safe locaux sous `src/infra/*` afin que la politique de processus d'OpenClaw soit appliquée de manière cohérente.
- L'extraction d'archives devrait utiliser les assistants d'archive fs-safe avec des limites explicites de taille, de nombre d'entrées, de lien et de destination.
- Les secrets devraient utiliser les assistants de secrets d'OpenClaw ou les assistants de secrets/état privé fs-safe ; ne créez pas de vérifications de mode manuelles autour de `fs.writeFile`.
- Si vous avez besoin d'une isolation contre les utilisateurs locaux hostiles, ne comptez pas uniquement sur fs-safe. Faites fonctionner des passerelles distinctes sous des utilisateurs/hôtes OS distincts ou utilisez le bac à sable (sandboxing).

Connexes : [Sécurité](/fr/gateway/security), [Bac à sable](/fr/gateway/sandboxing), [Approbations d'exécution](/fr/tools/exec-approvals), [Secrets](/fr/gateway/secrets).
