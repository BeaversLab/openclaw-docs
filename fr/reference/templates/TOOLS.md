---
title: "Modèle TOOLS.md"
summary: "Modèle d'espace de travail pour TOOLS.md"
read_when:
  - Bootstrapping a workspace manually
---

# TOOLS.md - Notes locales

Les compétences définissent le fonctionnement des outils. Ce fichier est destiné à vos spécificités — les éléments uniques à votre configuration.

## Que mettre ici

Des choses comme :

- Noms et emplacements des caméras
- Hôtes et alias SSH
- Voix préférées pour la synthèse vocale
- Noms des haut-parleurs/pièces
- Surnoms des appareils
- Tout ce qui est spécifique à l'environnement

## Exemples

```markdown
### Cameras

- living-room → Main area, 180° wide angle
- front-door → Entrance, motion-triggered

### SSH

- home-server → 192.168.1.100, user: admin

### TTS

- Preferred voice: "Nova" (warm, slightly British)
- Default speaker: Kitchen HomePod
```

## Pourquoi séparer ?

Les compétences sont partagées. Votre configuration vous appartient. Les garder séparées signifie que vous pouvez mettre à jour les compétences sans perdre vos notes, et partager les compétences sans divulguer votre infrastructure.

---

Ajoutez tout ce qui vous aide à faire votre travail. C'est votre antisèche.

import fr from '/components/footer/fr.mdx';

<fr />
