---
summary: "Analyse de la localisation entrante du channel (Telegram + WhatsApp) et champs de contexte"
read_when:
  - Ajout ou modification de l'analyse de la localisation du channel
  - Utilisation des champs de contexte de localisation dans les invites ou outils de l'agent
title: "Analyse de la localisation du Channel"
---

# Analyse de la localisation du channel

OpenClaw normalise les localisations partagées depuis les channels de discussion en :

- du texte lisible par l'homme ajouté au corps entrant, et
- des champs structurés dans la charge utile du contexte de réponse automatique.

Actuellement pris en charge :

- **Telegram** (épingles de localisation + lieux + localisations en direct)
- **WhatsApp** (locationMessage + liveLocationMessage)
- **Matrix** (`m.location` avec `geo_uri`)

## Formatage du texte

Les localisations sont rendues sous forme de lignes conviviales sans parenthèses :

- Épingle :
  - `📍 48.858844, 2.294351 ±12m`
- Lieu nommé :
  - `📍 Eiffel Tower — Champ de Mars, Paris (48.858844, 2.294351 ±12m)`
- Partage en direct :
  - `🛰 Live location: 48.858844, 2.294351 ±12m`

Si le channel comprend une légende/commentaire, il est ajouté à la ligne suivante :

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

## Notes sur le channel

- **Telegram** : les lieux correspondent à `LocationName/LocationAddress` ; les localisations en direct utilisent `live_period`.
- **WhatsApp** : `locationMessage.comment` et `liveLocationMessage.caption` sont ajoutés comme ligne de légende.
- **Matrix** : `geo_uri` est analysé comme une localisation d'épingle ; l'altitude est ignorée et `LocationIsLive` est toujours faux.

import en from "/components/footer/en.mdx";

<en />
