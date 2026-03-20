---
summary: "Dépannage de l'appairage des nœuds, des exigences de premier plan, des autorisations et des échecs des outils"
read_when:
  - Le nœud est connecté mais les outils de caméra/toile/écran/exec échouent
  - Vous avez besoin du modèle mental d'appairage versus approbations des nœuds
title: "Dépannage des nœuds"
---

# Dépannage des nœuds

Utilisez cette page lorsqu'un nœud est visible dans le statut mais que les outils du nœud échouent.

## Échelle de commande

```bash
openclaw status
openclaw gateway status
openclaw logs --follow
openclaw doctor
openclaw channels status --probe
```

Exécutez ensuite les vérifications spécifiques au nœud :

```bash
openclaw nodes status
openclaw nodes describe --node <idOrNameOrIp>
openclaw approvals get --node <idOrNameOrIp>
```

Signaux sains :

- Le nœud est connecté et apparié pour le rôle `node`.
- `nodes describe` inclut la capacité que vous appelez.
- Les approbations Exec affichent le mode/la liste d'autorisation attendus.

## Exigences de premier plan

`canvas.*`, `camera.*` et `screen.*` sont en premier plan uniquement sur les nœuds iOS/Android.

Vérification et correction rapides :

```bash
openclaw nodes describe --node <idOrNameOrIp>
openclaw nodes canvas snapshot --node <idOrNameOrIp>
openclaw logs --follow
```

Si vous voyez `NODE_BACKGROUND_UNAVAILABLE`, mettez l'application du nœud au premier plan et réessayez.

## Matrice des autorisations

| Capacité                   | iOS                                     | Android                                      | application de nœud macOS                | Code d'échec typique           |
| ---------------------------- | --------------------------------------- | -------------------------------------------- | ----------------------------- | ------------------------------ |
| `camera.snap`, `camera.clip` | Caméra (+ micro pour l'audio du clip)           | Caméra (+ micro pour l'audio du clip)                | Caméra (+ micro pour l'audio du clip) | `*_PERMISSION_REQUIRED`        |
| `screen.record`              | Enregistrement d'écran (+ micro en option)       | Invite de capture d'écran (+ micro en option)       | Enregistrement d'écran              | `*_PERMISSION_REQUIRED`        |
| `location.get`               | Pendant l'utilisation ou Toujours (dépend du mode) | Localisation Premier plan/Arrière-plan selon le mode | Autorisation de localisation           | `LOCATION_PERMISSION_REQUIRED` |
| `system.run`                 | n/a (chemin de l'hôte du nœud)                    | n/a (chemin de l'hôte du nœud)                         | Approbations Exec requises       | `SYSTEM_RUN_DENIED`            |

## Appairage versus approbations

Il s'agit de différentes portes :

1. **Appairage de l'appareil** : ce nœud peut-il se connecter à la passerelle ?
2. **Approbations Exec** : ce nœud peut-il exécuter une commande shell spécifique ?

Vérifications rapides :

```bash
openclaw devices list
openclaw nodes status
openclaw approvals get --node <idOrNameOrIp>
openclaw approvals allowlist add --node <idOrNameOrIp> "/usr/bin/uname"
```

Si l'appairage est manquant, approuvez d'abord l'appareil du nœud.
Si l'appairage est correct mais que `system.run` échoue, corrigez les approbations/listes d'autorisation Exec.

## Codes d'erreur de nœud courants

- `NODE_BACKGROUND_UNAVAILABLE` → l'application est en arrière-plan ; mettez-la au premier plan.
- `CAMERA_DISABLED` → le bouton de basculement de la caméra est désactivé dans les paramètres du nœud.
- `*_PERMISSION_REQUIRED` → autorisation OS manquante/refusée.
- `LOCATION_DISABLED` → le mode de localisation est désactivé.
- `LOCATION_PERMISSION_REQUIRED` → le mode de localisation demandé n'est pas accordé.
- `LOCATION_BACKGROUND_UNAVAILABLE` → l'application est en arrière-plan mais seule la autorisation « Pendant l'utilisation » existe.
- `SYSTEM_RUN_DENIED: approval required` → la requête exec nécessite une approbation explicite.
- `SYSTEM_RUN_DENIED: allowlist miss` → commande bloquée par le mode liste autorisée.
  Sur les hôtes de nœud Windows, les formes d'enveloppe de shell comme `cmd.exe /c ...` sont traitées comme des absences de liste autorisée en
  mode liste autorisée, sauf si elles sont approuvées via le flux de demande.

## Boucle de récupération rapide

```bash
openclaw nodes status
openclaw nodes describe --node <idOrNameOrIp>
openclaw approvals get --node <idOrNameOrIp>
openclaw logs --follow
```

Si toujours bloqué :

- Réapprouver l'appairage de l'appareil.
- Rouvrir l'application de nœud (premier plan).
- Accorder à nouveau les autorisations du système d'exploitation.
- Recréer/ajuster la politique d'approbation exec.

Connexes :

- [/nodes/index](/fr/nodes/index)
- [/nodes/camera](/fr/nodes/camera)
- [/nodes/location-command](/fr/nodes/location-command)
- [/tools/exec-approvals](/fr/tools/exec-approvals)
- [/gateway/pairing](/fr/gateway/pairing)

import en from "/components/footer/en.mdx";

<en />
