---
summary: "Analyse de la position entrante du canal (Telegram/WhatsApp/Matrix) et champs de contexte"
read_when:
  - Adding or modifying channel location parsing
  - Using location context fields in agent prompts or tools
title: "Analyse de la position du canal"
---

OpenClaw normalise les positions partagées des canaux de discussion en :

- un texte de coordonnées succinct ajouté au corps entrant, et
- des champs structurés dans la charge utile du contexte de réponse automatique. Les étiquettes, adresses et légendes/commentaires fournis par le canal sont restitués dans le prompt via le bloc JSON de métadonnées non fiables partagées, et non en ligne dans le corps de l'utilisateur.

Actuellement pris en charge :

- **Telegram** (épingles de position + lieux + positions en direct)
- **WhatsApp** (locationMessage + liveLocationMessage)
- **Matrix** (`m.location` avec `geo_uri`)

## Formatage du texte

Les positions sont restituées sous forme de lignes conviviales sans crochets :

- Épingle :
  - `📍 48.858844, 2.294351 ±12m`
- Lieu nommé :
  - `📍 48.858844, 2.294351 ±12m`
- Partage en direct :
  - `🛰 Live location: 48.858844, 2.294351 ±12m`

Si le canal inclut une étiquette, une adresse ou une légende/commentaire, il est conservé dans la charge utile du contexte et apparaît dans le prompt sous forme de JSON non fiable délimité :

````text
Location (untrusted metadata):
```
{
  "latitude": 48.858844,
  "longitude": 2.294351,
  "name": "Eiffel Tower",
  "address": "Champ de Mars, Paris",
  "caption": "Meet here"
}
```
````

## Champs de contexte

Lorsqu'une position est présente, ces champs sont ajoutés à `ctx` :

- `LocationLat` (nombre)
- `LocationLon` (nombre)
- `LocationAccuracy` (nombre, mètres ; facultatif)
- `LocationName` (chaîne ; facultatif)
- `LocationAddress` (chaîne ; facultatif)
- `LocationSource` (`pin | place | live`)
- `LocationIsLive` (booléen)
- `LocationCaption` (chaîne ; facultatif)

Le moteur de rendu du prompt traite `LocationName`, `LocationAddress` et `LocationCaption` comme des métadonnées non fiables et les sérialise via le même chemin JSON borné utilisé pour d'autres contextes de canal.

## Notes sur le canal

- **Telegram** : les lieux correspondent à `LocationName/LocationAddress` ; les positions en direct utilisent `live_period`.
- **WhatsApp** : `locationMessage.comment` et `liveLocationMessage.caption` remplissent `LocationCaption`.
- **Matrix** : `geo_uri` est analysé comme un emplacement d'épingle ; l'altitude est ignorée et `LocationIsLive` est toujours faux.

## Connexes

- [Commande de localisation (nœuds)](/fr/nodes/location-command)
- [Capture photo](/fr/nodes/camera)
- [Compréhension des médias](/fr/nodes/media-understanding)
