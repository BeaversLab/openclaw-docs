---
summary: "Analyse de la localisation entrante du canal (Telegram + WhatsApp) et champs de contexte"
read_when:
  - Adding or modifying channel location parsing
  - Using location context fields in agent prompts or tools
title: "Analyse de la localisation du canal"
---

# Analyse de la localisation du canal

OpenClaw normalise les localisations partagées depuis les canaux de discussion en :

- du texte lisible par l'homme ajouté au corps entrant, et
- des champs structurés dans la charge utile du contexte de réponse automatique.

Actuellement pris en charge :

- **Telegram** (épingles de localisation + lieux + localisations en direct)
- **WhatsApp** (locationMessage + liveLocationMessage)
- **Matrix** (`m.location` avec `geo_uri`)

## Formatage du texte

Les localisations sont affichées sous forme de lignes conviviales sans parenthèses :

- Épingle :
  - `📍 48.858844, 2.294351 ±12m`
- Lieu nommé :
  - `📍 Eiffel Tower — Champ de Mars, Paris (48.858844, 2.294351 ±12m)`
- Partage en direct :
  - `🛰 Live location: 48.858844, 2.294351 ±12m`

Si le canal inclut une légende/commentaire, il est ajouté à la ligne suivante :

```
📍 48.858844, 2.294351 ±12m
Meet here
```

## Champs de contexte

Lorsqu'une localisation est présente, ces champs sont ajoutés à `ctx` :

- `LocationLat` (nombre)
- `LocationLon` (nombre)
- `LocationAccuracy` (nombre, mètres ; facultatif)
- `LocationName` (chaîne ; facultatif)
- `LocationAddress` (chaîne ; facultatif)
- `LocationSource` (`pin | place | live`)
- `LocationIsLive` (booléen)

## Notes sur le canal

- **Telegram** : les lieux correspondent à `LocationName/LocationAddress` ; les localisations en direct utilisent `live_period`.
- **WhatsApp** : `locationMessage.comment` et `liveLocationMessage.caption` sont ajoutés comme ligne de légende.
- **Matrix** : `geo_uri` est analysé comme une localisation épinglée ; l'altitude est ignorée et `LocationIsLive` est toujours faux.

import fr from '/components/footer/fr.mdx';

<fr />
