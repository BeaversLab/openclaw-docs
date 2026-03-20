---
summary: "Espace de travail de l'agent : emplacement, structure et stratégie de sauvegarde"
read_when:
  - Vous devez expliquer l'espace de travail de l'agent ou sa structure de fichiers
  - Vous souhaitez sauvegarder ou migrer un espace de travail de l'agent
title: "Espace de travail de l'agent"
---

# Espace de travail de l'agent

L'espace de travail est le domicile de l'agent. C'est le seul répertoire de travail utilisé pour les outils de fichiers et le contexte de l'espace de travail. Gardez-le privé et traitez-le comme une mémoire.

Ceci est distinct de `~/.openclaw/`, qui stocke la configuration, les informations d'identification et les sessions.

**Important :** l'espace de travail est le **cwd par défaut**, et non un sandbox (bac à sable) strict. Les outils résolvent les chemins relatifs par rapport à l'espace de travail, mais les chemins absolus peuvent toujours atteindre d'autres endroits sur l'hôte, sauf si le sandboxing est activé. Si vous avez besoin d'isolement, utilisez [`agents.defaults.sandbox`](/fr/gateway/sandboxing) (et/ou la configuration de sandbox par agent).
Lorsque le sandboxing est activé et que `workspaceAccess` n'est pas `"rw"`, les outils opèrent à l'intérieur d'un espace de travail sandbox sous `~/.openclaw/sandboxes`, et non votre espace de travail hôte.

## Emplacement par défaut

- Par défaut : `~/.openclaw/workspace`
- Si `OPENCLAW_PROFILE` est défini et n'est pas `"default"`, le défaut devient
  `~/.openclaw/workspace-<profile>`.
- Remplacer dans `~/.openclaw/openclaw.json` :

```json5
{
  agent: {
    workspace: "~/.openclaw/workspace",
  },
}
```

`openclaw onboard`, `openclaw configure` ou `openclaw setup` créeront l'espace de travail et initialiseront les fichiers d'amorçage s'ils manquent.
Les copies de graines de Sandbox n'acceptent que les fichiers réguliers dans l'espace de travail ; les alias de lien symbolique/dur qui résolvent en dehors de l'espace de travail source sont ignorés.

Si vous gérez déjà les fichiers de l'espace de travail vous-même, vous pouvez désactiver la création de fichiers d'amorçage :

```json5
{ agent: { skipBootstrap: true } }
```

## Dossiers supplémentaires de l'espace de travail

Les anciennes installations peuvent avoir créé `~/openclaw`. Le fait de conserver plusieurs répertoires d'espace de travail peut entraîner une confusion de l'authentification ou une dérive de l'état, car un seul espace de travail est actif à la fois.

**Recommandation :** conservez un seul espace de travail actif. Si vous n'utilisez plus les dossiers supplémentaires, archivez-les ou déplacez-les dans la Corbeille (par exemple `trash ~/openclaw`).
Si vous conservez intentionnellement plusieurs espaces de travail, assurez-vous que `agents.defaults.workspace` pointe vers celui qui est actif.

`openclaw doctor` avertit lorsqu'il détecte des répertoires d'espace de travail supplémentaires.

## Cartographie des fichiers de l'espace de travail (signification de chaque fichier)

Voici les fichiers standard que OpenClaw attend dans l'espace de travail :

- `AGENTS.md`
  - Instructions opérationnelles pour l'agent et la manière dont il doit utiliser la mémoire.
  - Chargé au début de chaque session.
  - Bon endroit pour les règles, les priorités et les détails sur la « façon de se comporter ».

- `SOUL.md`
  - Personnalité, ton et limites.
  - Chargé à chaque session.

- `USER.md`
  - Qui est l'utilisateur et comment lui adresser la parole.
  - Chargé à chaque session.

- `IDENTITY.md`
  - Le nom, l'ambiance et l'emoji de l'agent.
  - Créé/mis à jour lors du rituel d'amorçage.

- `TOOLS.md`
  - Notes sur vos outils locaux et conventions.
  - Ne contrôle pas la disponibilité des outils ; il ne s'agit que de directives.

- `HEARTBEAT.md`
  - Petite liste de contrôle facultative pour les exécutions de battement de cœur.
  - Gardez-la courte pour éviter la surconsommation de jetons.

- `BOOT.md`
  - Liste de contrôle de démarrage facultative exécutée lors du redémarrage de la passerelle lorsque les crochets internes sont activés.
  - Gardez-la courte ; utilisez l'outil de message pour les envois sortants.

- `BOOTSTRAP.md`
  - Rituel de première exécution unique.
  - Créé uniquement pour un espace de travail entièrement nouveau.
  - Supprimez-le une fois le rituel terminé.

- `memory/YYYY-MM-DD.md`
  - Journal de mémoire quotidien (un fichier par jour).
  - Recommandé de lire aujourd'hui + hier au début de la session.

- `MEMORY.md` (facultatif)
  - Mémoire à long terme sélectionnée.
  - Charger uniquement dans la session principale privée (pas les contextes partagés/groupés).

Consultez [Mémoire](/fr/concepts/memory) pour le flux de travail et le vidage automatique de la mémoire.

- `skills/` (facultatif)
  - Compétences spécifiques à l'espace de travail.
  - Remplace les compétences gérées/groupées lorsque les noms sont en conflit.

- `canvas/` (facultatif)
  - Fichiers d'interface utilisateur Canvas pour les affichages de nœuds (par exemple `canvas/index.html`).

Si un fichier d'amorçage est manquant, OpenClaw injecte un marqueur de « fichier manquant » dans la session et continue. Les fichiers d'amorçage volumineux sont tronqués lors de l'injection ; ajustez les limites avec `agents.defaults.bootstrapMaxChars` (par défaut : 20000) et `agents.defaults.bootstrapTotalMaxChars` (par défaut : 150000). `openclaw setup` peut recréer les valeurs par défaut manquantes sans écraser les fichiers existants.

## Ce qui n'est PAS dans l'espace de travail

Ces éléments se trouvent sous `~/.openclaw/` et ne doivent PAS être validés dans le dépôt de l'espace de travail :

- `~/.openclaw/openclaw.json` (configuration)
- `~/.openclaw/credentials/` (jetons OAuth, clés API)
- `~/.openclaw/agents/<agentId>/sessions/` (transcriptions de sessions + métadonnées)
- `~/.openclaw/skills/` (compétences gérées)

Si vous devez migrer des sessions ou des configurations, copiez-les séparément et gardez-les hors du contrôle de version.

## Sauvegarde Git (recommandée, privée)

Considérez l'espace de travail comme une mémoire privée. Placez-le dans un dépôt git **privé** afin qu'il soit sauvegardé et récupérable.

Exécutez ces étapes sur la machine où le Gateway s'exécute (c'est là que réside l'espace de travail).

### 1) Initialiser le dépôt

Si git est installé, les nouveaux espaces de travail sont initialisés automatiquement. Si cet espace de travail n'est pas encore un dépôt, exécutez :

```bash
cd ~/.openclaw/workspace
git init
git add AGENTS.md SOUL.md TOOLS.md IDENTITY.md USER.md HEARTBEAT.md memory/
git commit -m "Add agent workspace"
```

### 2) Ajouter un dépôt distant privé (options adaptées aux débutants)

Option A : Interface Web GitHub

1. Créez un nouveau dépôt **privé** sur GitHub.
2. Ne l'initialisez pas avec un README (évite les conflits de fusion).
3. Copiez l'URL distante HTTPS.
4. Ajoutez le dépôt distant et envoyez (push) :

```bash
git branch -M main
git remote add origin <https-url>
git push -u origin main
```

Option B : GitHub CLI (`gh`)

```bash
gh auth login
gh repo create openclaw-workspace --private --source . --remote origin --push
```

Option C : Interface Web GitLab

1. Créez un nouveau dépôt **privé** sur GitLab.
2. Ne l'initialisez pas avec un README (évite les conflits de fusion).
3. Copiez l'URL distante HTTPS.
4. Ajoutez le dépôt distant et envoyez (push) :

```bash
git branch -M main
git remote add origin <https-url>
git push -u origin main
```

### 3) Mises à jour continues

```bash
git status
git add .
git commit -m "Update memory"
git push
```

## Ne commitez pas de secrets

Même dans un dépôt privé, évitez de stocker des secrets dans l'espace de travail :

- Clés API, jetons OAuth, mots de passe ou informations d'identification privées.
- Tout ce qui se trouve sous `~/.openclaw/`.
- Sauvegardes brutes de discussions ou pièces jointes sensibles.

Si vous devez stocker des références sensibles, utilisez des espaces réservés et gardez le véritable secret ailleurs (gestionnaire de mots de passe, variables d'environnement ou `~/.openclaw/`).

Starter `.gitignore` suggéré :

```gitignore
.DS_Store
.env
**/*.key
**/*.pem
**/secrets*
```

## Déplacement de l'espace de travail vers une nouvelle machine

1. Clonez le dépôt vers le chemin souhaité (par défaut `~/.openclaw/workspace`).
2. Définissez `agents.defaults.workspace` sur ce chemin dans `~/.openclaw/openclaw.json`.
3. Exécutez `openclaw setup --workspace <path>` pour créer les fichiers manquants.
4. Si vous avez besoin des sessions, copiez `~/.openclaw/agents/<agentId>/sessions/` depuis l'ancienne
   machine séparément.

## Notes avancées

- Le routage multi-agent peut utiliser des espaces de travail différents par agent. Voir
  [Channel routing](/fr/channels/channel-routing) pour la configuration du routage.
- Si `agents.defaults.sandbox` est activé, les sessions non principales peuvent utiliser des espaces de travail
  de bac à sable par session sous `agents.defaults.sandbox.workspaceRoot`.

import fr from "/components/footer/fr.mdx";

<fr />
