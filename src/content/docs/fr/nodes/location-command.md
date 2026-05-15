---
summary: "Commande de localisation pour les nœuds (location.get), modes d'autorisation et comportement en premier plan Android"
read_when:
  - Adding location node support or permissions UI
  - Designing Android location permissions or foreground behavior
title: "Location command"
---

## TL;DR

- `location.get` est une commande de nœud (via `node.invoke`).
- Désactivé par défaut.
- Les paramètres de l'application Android utilisent un sélecteur : Désactivé / Pendant l'utilisation.
- Interrupteur séparé : Localisation précise.

## Pourquoi un sélecteur (et pas seulement un interrupteur)

Les autorisations de l'OS sont à plusieurs niveaux. Nous pouvons exposer un sélecteur dans l'application, mais l'OS décide toujours de l'octroi réel.

- iOS/macOS peuvent exposer **Pendant l'utilisation** ou **Toujours** dans les invites système/Paramètres.
- L'application Android prend actuellement en charge uniquement la localisation au premier plan.
- La localisation précise est une autorisation distincte (iOS 14+ « Précise », Android « fine » vs « grossière »).

Le sélecteur de l'interface utilisateur définit notre mode demandé ; l'octroi réel réside dans les paramètres de l'OS.

## Modèle de paramètres

Par appareil nœud :

- `location.enabledMode` : `off | whileUsing`
- `location.preciseEnabled` : bool

Comportement de l'interface utilisateur :

- La sélection de `whileUsing` demande l'autorisation au premier plan.
- Si l'OS refuse le niveau demandé, revenez au niveau le plus élevé accordé et affichez le statut.

## Mappage des autorisations (node.permissions)

Facultatif. Le nœud macOS signale `location` via la carte des autorisations ; iOS/Android peuvent l'omettre.

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
- `LOCATION_PERMISSION_REQUIRED` : autorisation manquante pour le mode demandé.
- `LOCATION_BACKGROUND_UNAVAILABLE` : l'application est en arrière-plan mais seul « Pendant l'utilisation » est autorisé.
- `LOCATION_TIMEOUT` : aucune localisation dans le temps imparti.
- `LOCATION_UNAVAILABLE` : défaillance du système / aucun fournisseur.

## Comportement en arrière-plan

- L'application Android refuse `location.get` lorsqu'elle est en arrière-plan.
- Gardez OpenClaw ouvert lors de la demande de localisation sur Android.
- Les autres plateformes de nœuds peuvent différer.

## Intégration du modèle/outillage

- Surface de l'outil : l'outil `nodes` ajoute l'action `location_get` (nœud requis).
- CLI : `openclaw nodes location get --node <id>`.
- Directives pour l'agent : appeler uniquement lorsque l'utilisateur a activé la localisation et comprend la portée.

## Texte de l'interface utilisateur (suggéré)

- Désactivé : « Le partage de la localisation est désactivé. »
- Pendant l'utilisation : « Uniquement lorsque OpenClaw est ouvert. »
- Précise : « Utiliser la localisation GPS précise. Désactiver pour partager une localisation approximative. »

## Connexes

- [Analyse de la position du canal](/fr/channels/location)
- [Capture photo](/fr/nodes/camera)
- [Mode discussion](/fr/nodes/talk)
