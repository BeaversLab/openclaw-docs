---
summary: "Dépannage de l'appairage de nœud, des exigences de premier plan, des autorisations et des échecs de tool"
read_when:
  - Node is connected but camera/canvas/screen/exec tools fail
  - You need the node pairing versus approvals mental model
title: "Dépannage de nœud"
---

# Dépannage de nœud

Utilisez cette page lorsqu'un nœud est visible dans l'état mais que les tools du nœud échouent.

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

- Le nœud est connecté et appairé pour le rôle `node`.
- `nodes describe` inclut la capacité que vous appelez.
- Les approbations Exec affichent le mode/liste d'autorisation attendu.

## Exigences de premier plan

`canvas.*`, `camera.*` et `screen.*` sont uniquement au premier plan sur les nœuds iOS/Android.

Vérification rapide et correctif :

```bash
openclaw nodes describe --node <idOrNameOrIp>
openclaw nodes canvas snapshot --node <idOrNameOrIp>
openclaw logs --follow
```

Si vous voyez `NODE_BACKGROUND_UNAVAILABLE`, amenez l'application du nœud au premier plan et réessayez.

## Matrice des autorisations

| Capacité                     | iOS                                               | Android                                                 | Application de nœud macOS             | Code d'échec typique           |
| ---------------------------- | ------------------------------------------------- | ------------------------------------------------------- | ------------------------------------- | ------------------------------ |
| `camera.snap`, `camera.clip` | Caméra (+ micro pour l'audio du clip)             | Caméra (+ micro pour l'audio du clip)                   | Caméra (+ micro pour l'audio du clip) | `*_PERMISSION_REQUIRED`        |
| `screen.record`              | Enregistrement d'écran (+ micro en option)        | Invite de capture d'écran (+ micro en option)           | Enregistrement d'écran                | `*_PERMISSION_REQUIRED`        |
| `location.get`               | Pendant l'utilisation ou Toujours (selon le mode) | Localisation en premier plan/arrière-plan selon le mode | Autorisation de localisation          | `LOCATION_PERMISSION_REQUIRED` |
| `system.run`                 | n/a (chemin de l'hôte du nœud)                    | n/a (chemin de l'hôte du nœud)                          | Approbations Exec requises            | `SYSTEM_RUN_DENIED`            |

## Appairage par rapport aux approbations

Il s'agit de différentes portes :

1. **Appareil appairé** : ce nœud peut-il se connecter à la passerelle ?
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

- `NODE_BACKGROUND_UNAVAILABLE` → l'application est en arrière-plan ; amenez-la au premier plan.
- `CAMERA_DISABLED` → bascule de caméra désactivée dans les paramètres du nœud.
- `*_PERMISSION_REQUIRED` → permission OS manquante/refusée.
- `LOCATION_DISABLED` → le mode de localisation est désactivé.
- `LOCATION_PERMISSION_REQUIRED` → le mode de localisation demandé n'a pas été accordé.
- `LOCATION_BACKGROUND_UNAVAILABLE` → l'application est en arrière-plan mais seule la permission « Pendant l'utilisation » existe.
- `SYSTEM_RUN_DENIED: approval required` → la requête d'exécution nécessite une approbation explicite.
- `SYSTEM_RUN_DENIED: allowlist miss` → commande bloquée par le mode liste autorisée.
  Sur les hôtes de nœud Windows, les formulaires d'enveloppe de shell comme `cmd.exe /c ...` sont traités comme des absences de la liste autorisée en
  mode liste autorisée, sauf s'ils sont approuvés via le flux de demande.

## Boucle de récupération rapide

```bash
openclaw nodes status
openclaw nodes describe --node <idOrNameOrIp>
openclaw approvals get --node <idOrNameOrIp>
openclaw logs --follow
```

Si toujours bloqué :

- Approuver à nouveau le jumelage de l'appareil.
- Rouvrir l'application de nœud (premier plan).
- Accorder à nouveau les permissions OS.
- Recréer/ajuster la politique d'approbation d'exécution.

Connexes :

- [/nodes/index](/fr/nodes/index)
- [/nodes/camera](/fr/nodes/camera)
- [/nodes/location-command](/fr/nodes/location-command)
- [/tools/exec-approvals](/fr/tools/exec-approvals)
- [/gateway/pairing](/fr/gateway/pairing)
