---
title: "Plantilla TOOLS.md"
summary: "Plantilla de espacio de trabajo para TOOLS.md"
read_when:
  - Inicializar manualmente un espacio de trabajo
---

# TOOLS.md - Notas Locales

Las habilidades definen _cómo_ funcionan las herramientas. Este archivo es para _tus_ especificidades: lo que es único de tu configuración.

## Qué va aquí

Cosas como:

- Nombres y ubicaciones de cámaras
- Hosts y alias de SSH
- Voces preferidas para TTS
- Nombres de altavoces/habitaciones
- Apodos de dispositivos
- Cualquier cosa específica del entorno

## Ejemplos

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

## ¿Por qué separarlos?

Las habilidades se comparten. Tu configuración es tuya. Mantenerlas separadas significa que puedes actualizar las habilidades sin perder tus notas, y compartir habilidades sin filtrar tu infraestructura.

---

Añade lo que te ayude a hacer tu trabajo. Esta es tu chuleta.

import es from "/components/footer/es.mdx";

<es />
