---
summary: "Location command for nodes (location.get), permission modes, and Android foreground behavior"
read_when:
  - Adding location node support or permissions UI
  - Designing Android location permissions or foreground behavior
title: "Location Command"
---

# Location command (nodes)

## TL;DR

- `location.get` is a node command (via `node.invoke`).
- Off by default.
- Android app settings use a selector: Off / While Using.
- Separate toggle: Precise Location.

## Why a selector (not just a switch)

OS permissions are multi-level. We can expose a selector in-app, but the OS still decides the actual grant.

- iOS/macOS may expose **While Using** or **Always** in system prompts/Settings.
- Android app currently supports foreground location only.
- Precise location is a separate grant (iOS 14+ “Precise”, Android “fine” vs “coarse”).

Le sélecteur de l'interface utilisateur détermine notre mode demandé ; l'octroi réel se trouve dans les paramètres du système d'exploitation.

## Modèle de paramètres

Par appareil de nœud :

- `location.enabledMode` : `off | whileUsing`
- `location.preciseEnabled` : booléen

Comportement de l'interface utilisateur :

- Sélectionner `whileUsing` demande la permission de premier plan.
- Si le système d'exploitation refuse le niveau demandé, revenir au niveau accordé le plus élevé et afficher le statut.

## Mapping des permissions (node.permissions)

Optionnel. Le nœud macOS signale `location` via la carte des permissions ; iOS/Android peut l'omettre.

## Commande : `location.get`

Appelé via `node.invoke`.

Paramètres (suggérés) :

```json
{
  "timeoutMs": 10000,
  "maxAgeMs": 15000,
  "desiredAccuracy": "coarse|balanced|precise"
}
```

Charge utile de réponse :

```json
{
  "lat": 48.20849,
  "lon": 16.37208,
  "accuracyMeters": 12.5,
  "altitudeMeters": 182.0,
  "speedMps": 0.0,
  "headingDeg": 270.0,
  "timestamp": "2026-01-03T12:34:56.000Z",
  "isPrecise": true,
  "source": "gps|wifi|cell|unknown"
}
```

Erreurs (codes stables) :

- `LOCATION_DISABLED` : le sélecteur est désactivé.
- `LOCATION_PERMISSION_REQUIRED` : permission manquante pour le mode demandé.
- `LOCATION_BACKGROUND_UNAVAILABLE` : l'application est en arrière-plan mais seule l'autorisation « Pendant l'utilisation » est accordée.
- `LOCATION_TIMEOUT` : aucun fixe obtenu à temps.
- `LOCATION_UNAVAILABLE` : échec du système / aucun fournisseur.

## Comportement en arrière-plan

- L'application Android refuse `location.get` lorsqu'elle est en arrière-plan.
- Gardez OpenClaw ouvert lors de la demande de localisation sur Android.
- D'autres plates-formes de nœuds peuvent différer.

## Intégration du modèle/de l'outil

- Surface de l'outil : l'outil `nodes` ajoute l'action `location_get` (nœud requis).
- CLI : `openclaw nodes location get --node <id>`.
- Recommandations pour l'agent : n'appeler que lorsque l'utilisateur a activé la localisation et comprend la portée.

## Texte UX (suggéré)

- Désactivé : « Le partage de la localisation est désactivé. »
- Pendant l'utilisation : « Uniquement lorsque OpenClaw est ouvert. »
- Précise : « Utiliser une localisation GPS précise. Désactiver pour partager une localisation approximative. »

import en from "/components/footer/en.mdx";

<en />
