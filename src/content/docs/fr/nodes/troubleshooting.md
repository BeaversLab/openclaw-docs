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
2. **Stratégie de commande de nœud Gateway** : l'ID de commande RPC est-il autorisé par `gateway.nodes.allowCommands` / `denyCommands` et les valeurs par défaut de la plateforme ?
3. **Approbations Exec** : ce nœud peut-il exécuter une commande shell spécifique localement ?

Vérifications rapides :

```bash
openclaw devices list
openclaw nodes status
openclaw approvals get --node <idOrNameOrIp>
openclaw approvals allowlist add --node <idOrNameOrIp> "/usr/bin/uname"
```

Si l'appariement est manquant, approuvez d'abord l'appareil du nœud.
Si `nodes describe` manque une commande, vérifiez la stratégie de commande du nœud passerelle et si le nœud a réellement déclaré cette commande lors de la connexion.
Si l'appariement est correct mais que `system.run` échoue, corrigez les approbations/listes blanches d'exécution sur ce nœud.

L'appariement de nœud est une porte d'identité/confiance, et non une surface d'approbation par commande. Pour `system.run`, la stratégie par nœud réside dans le fichier d'approbations d'exécution de ce nœud (`openclaw approvals get --node ...`), et non dans l'enregistrement d'appariement de la passerelle.

## Codes d'erreur de nœud courants

- `NODE_BACKGROUND_UNAVAILABLE` → l'application est en arrière-plan ; passez-la au premier plan.
- `CAMERA_DISABLED` → le bouton de basculement de la caméra est désactivé dans les paramètres du nœud.
- `*_PERMISSION_REQUIRED` → autorisation OS manquante/refusée.
- `LOCATION_DISABLED` → le mode de localisation est désactivé.
- `LOCATION_PERMISSION_REQUIRED` → le mode de localisation demandé n'est pas accordé.
- `LOCATION_BACKGROUND_UNAVAILABLE` → l'application est en arrière-plan mais seule l'autorisation « Pendant l'utilisation » existe.
- `SYSTEM_RUN_DENIED: approval required` → la requête exec nécessite une approbation explicite.
- `SYSTEM_RUN_DENIED: allowlist miss` → commande bloquée par le mode liste blanche.
  Sur les hôtes de nœuds Windows, les formes d'enveloppe shell comme `cmd.exe /c ...` sont traitées comme des absences de liste blanche en
  mode liste blanche, sauf si elles sont approuvées via le flux de demande.

## Boucle de récupération rapide

```bash
openclaw nodes status
openclaw nodes describe --node <idOrNameOrIp>
openclaw approvals get --node <idOrNameOrIp>
openclaw logs --follow
```

Si vous êtes toujours bloqué :

- Réapprouver l'appariement de l'appareil.
- Rouvrir l'application de nœud (premier plan).
- Redonner les autorisations OS.
- Recréer/ajuster la stratégie d'approbation exec.

Connexes :

- [/nodes/index](/en/nodes/index)
- [/nodes/camera](/en/nodes/camera)
- [/nodes/location-command](/en/nodes/location-command)
- [/tools/exec-approvals](/en/tools/exec-approvals)
- [/gateway/pairing](/en/gateway/pairing)
