---
summary: "Comment l'application macOS signale les états de santé de la passerelle/Baileys"
read_when:
  - Debugging mac app health indicators
title: "Health Checks"
---

# Health Checks sur macOS

Comment voir si le channel lié est en bonne santé depuis l'application de la barre de menus.

## Barre de menus

- Le point d'état reflète désormais la santé de Baileys :
  - Vert : lié + socket ouvert récemment.
  - Orange : connexion/nouvelle tentative.
  - Rouge : déconnecté ou échec de la sonde.
- La ligne secondaire affiche « linked · auth 12m » ou indique la raison de l'échec.
- L'élément de menu « Run Health Check » déclenche une sonde à la demande.

## Paramètres

- L'onglet General comprend une carte Health affichant : l'âge de l'auth liée, le chemin/nombre du session-store, l'heure de la dernière vérification, le dernier code d'erreur/statut, et les boutons pour Run Health Check / Reveal Logs.
- Utilise un instantané mis en cache pour que l'interface se charge instantanément et se replie gracieusement hors ligne.
- L'**onglet Channels** affiche l'état du channel + les contrôles pour WhatsApp/Telegram (QR de connexion, déconnexion, sonde, dernière déconnexion/erreur).

## Fonctionnement de la sonde

- L'application exécute `openclaw health --json` via `ShellExecutor` toutes les ~60 s et à la demande. La sonde charge les identifiants et signale l'état sans envoyer de messages.
- Mettre en cache séparément le dernier bon instantané et la dernière erreur pour éviter le scintillement ; afficher l'horodatage de chacun.

## En cas de doute

- Vous pouvez toujours utiliser le flux CLI dans [Santé de la Gateway](/fr/gateway/health) (`openclaw status`, `openclaw status --deep`, `openclaw health --json`) et suivre `/tmp/openclaw/openclaw-*.log` pour `web-heartbeat` / `web-reconnect`.

import fr from "/components/footer/fr.mdx";

<fr />
