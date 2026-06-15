---
summary: "Désinstaller complètement OpenClaw (CLI, service, état, espace de travail)"
read_when:
  - You want to remove OpenClaw from a machine
  - The gateway service is still running after uninstall
title: "Désinstaller"
---

Deux chemins :

- **Chemin facile** si `openclaw` est toujours installé.
- **Suppression manuelle du service** si le CLI a disparu mais que le service est toujours en cours d'exécution.

## Chemin facile (CLI toujours installé)

Recommandé : utilisez le programme de désinstallation intégré :

```bash
openclaw uninstall
```

Lors de l'utilisation de la CLI, la suppression de l'état préserve les répertoires de l'espace de travail configurés, sauf si vous sélectionnez également `--workspace`.

Non interactif (automatisation / npx) :

```bash
openclaw uninstall --all --yes --non-interactive
npx -y openclaw uninstall --all --yes --non-interactive
```

Étapes manuelles (même résultat) :

1. Arrêtez le service de passerelle :

```bash
openclaw gateway stop
```

2. Désinstallez le service de passerelle (launchd/systemd/schtasks) :

```bash
openclaw gateway uninstall
```

3. Supprimez l'état + la configuration :

```bash
rm -rf "${OPENCLAW_STATE_DIR:-$HOME/.openclaw}"
```

Si vous avez défini `OPENCLAW_CONFIG_PATH` sur un emplacement personnalisé en dehors du répertoire d'état, supprimez également ce fichier.
Si vous souhaitez conserver un espace de travail à l'intérieur du répertoire d'état, tel que `~/.openclaw/workspace`, déplacez-le avant d'exécuter `rm -rf` ou supprimez sélectivement le contenu de l'état.

4. Supprimez votre espace de travail (optionnel, supprime les fichiers de l'agent) :

```bash
rm -rf ~/.openclaw/workspace
```

5. Supprimez l'installation de la CLI (choisissez celle que vous avez utilisée) :

```bash
npm rm -g openclaw
pnpm remove -g openclaw
bun remove -g openclaw
```

6. Si vous avez installé l'application macOS :

```bash
rm -rf /Applications/OpenClaw.app
```

Notes :

- Si vous avez utilisé des profils (`--profile` / `OPENCLAW_PROFILE`), répétez l'étape 3 pour chaque répertoire d'état (ceux par défaut sont `~/.openclaw-<profile>`).
- En mode distant, le répertoire d'état réside sur l'**hôte de la passerelle**, exécutez donc également les étapes 1 à 4 sur celui-ci.

## Suppression manuelle du service (CLI non installée)

Utilisez cette méthode si le service de passerelle continue de fonctionner mais que `openclaw` est manquant.

### macOS (launchd)

L'étiquette par défaut est `ai.openclaw.gateway` (ou `ai.openclaw.<profile>` ; l'ancien `com.openclaw.*` peut encore exister) :

```bash
launchctl bootout gui/$UID/ai.openclaw.gateway
rm -f ~/Library/LaunchAgents/ai.openclaw.gateway.plist
```

Si vous avez utilisé un profil, remplacez l'étiquette et le nom du plist par `ai.openclaw.<profile>`. Supprimez tous les plists hérités `com.openclaw.*` s'ils sont présents.

### Linux (unité utilisateur systemd)

Le nom d'unité par défaut est `openclaw-gateway.service` (ou `openclaw-gateway-<profile>.service`) :

```bash
systemctl --user disable --now openclaw-gateway.service
rm -f ~/.config/systemd/user/openclaw-gateway.service
systemctl --user daemon-reload
```

### Windows (Tâche planifiée)

Le nom de tâche par défaut est `OpenClaw Gateway` (ou `OpenClaw Gateway (<profile>)`).
Le script de tâche réside sous votre répertoire d'état.

```powershell
schtasks /Delete /F /TN "OpenClaw Gateway"
Remove-Item -Force "$env:USERPROFILE\.openclaw\gateway.cmd"
```

Si vous avez utilisé un profil, supprimez le nom de tâche correspondant et `~\.openclaw-<profile>\gateway.cmd`.

## Installation normale vs extraction des sources

### Installation normale (install.sh / npm / pnpm / bun)

Si vous avez utilisé `https://openclaw.ai/install.sh` ou `install.ps1`, la CLI a été installée avec `npm install -g openclaw@latest`.
Supprimez-la avec `npm rm -g openclaw` (ou `pnpm remove -g` / `bun remove -g` si vous l'avez installée de cette manière).

### Checkout source (git clone)

Si vous exécutez depuis un checkout de dépôt (`git clone` + `openclaw ...` / `bun run openclaw ...`) :

1. Désinstallez le service passerelle **avant** de supprimer le dépôt (utilisez la voie facile ci-dessus ou la suppression manuelle du service).
2. Supprimez le répertoire du dépôt.
3. Supprimez l'état + l'espace de travail comme indiqué ci-dessus.

## Connexes

- [Vue d'ensemble de l'installation](/fr/install)
- [Guide de migration](/fr/install/migrating)
