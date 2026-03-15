---
summary: "Commande de localisation pour les nœuds (location.get), modes d'autorisation et comportement en premier plan Android"
read_when:
  - Adding location node support or permissions UI
  - Designing Android location permissions or foreground behavior
title: "Commande de localisation"
---

# Commande de localisation (nœuds)

## TL;DR

- `location.get` est une commande de nœud (via `node.invoke`).
- Désactivé par défaut.
- Les paramètres de l'application Android utilisent un sélecteur : Désactivé / Pendant l'utilisation.
- Interrupteur séparé : Localisation précise.

## Pourquoi un sélecteur (pas seulement un interrupteur)

Les autorisations de l'OS sont à plusieurs niveaux. Nous pouvons exposer un sélecteur dans l'application, mais l'OS décide toujours de l'autorisation réelle.

- iOS/macOS peut exposer **Pendant l'utilisation** ou **Toujours** dans les invites système / Paramètres.
- L'application Android prend actuellement uniquement en charge la localisation en premier plan.
- La localisation précise est une autorisation distincte (iOS 14+ « Précise », Android « fine » vs « grossière »).

Le sélecteur dans l'interface utilisateur pilote le mode demandé ; l'autorisation réelle réside dans les paramètres de l'OS.

## Modèle des paramètres

Par appareil nœud :

- `location.enabledMode` : `off | whileUsing`
- `location.preciseEnabled` : booléen

Comportement de l'interface utilisateur :

- La sélection de `whileUsing` demande l'autorisation de premier plan.
- Si l'OS refuse le niveau demandé, revenez au niveau le plus élevé accordé et affichez le statut.

## Mappage des autorisations (node.permissions)

Optionnel. Le nœud macOS signale `location` via la carte des autorisations ; iOS/Android peuvent l'omettre.

## Commande : `location.get`

Appelée via `node.invoke`.

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
- `LOCATION_BACKGROUND_UNAVAILABLE` : l'application est en arrière-plan mais seule l'autorisation « Pendant l'utilisation » est accordée.
- `LOCATION_TIMEOUT` : aucune localisation trouvée à temps.
- `LOCATION_UNAVAILABLE` : échec du système / aucun fournisseur.

## Comportement en arrière-plan

- L'application Android refuse `location.get` lorsqu'elle est en arrière-plan.
- Gardez OpenClaw ouvert lors de la demande de localisation sur Android.
- Les autres plateformes de nœuds peuvent différer.

## Intégration modèle/outillage

- Surface de l'outil : le `nodes` tool ajoute l'action `location_get` (nœud requis).
- CLI : `openclaw nodes location get --node <id>`.
- Directives pour l'agent : appeler uniquement lorsque l'utilisateur a activé la localisation et comprend la portée.

## Copie UX (suggérée)

- Désactivé : « Le partage de la localisation est désactivé. »
- Pendant l'utilisation : « Uniquement lorsque OpenClaw est ouvert. »
- Précise : « Utiliser la localisation GPS précise. Désactiver pour partager la localisation approximative. »

import fr from '/components/footer/fr.mdx';

<fr />
