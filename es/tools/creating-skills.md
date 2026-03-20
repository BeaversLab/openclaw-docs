---
title: "Creación de habilidades"
summary: "Crea y prueba habilidades personalizadas del espacio de trabajo con SKILL.md"
read_when:
  - Estás creando una habilidad personalizada nueva en tu espacio de trabajo
  - Necesitas un flujo de trabajo de inicio rápido para habilidades basadas en SKILL.md
---

# Creación de habilidades personalizadas 🛠

OpenClaw está diseñado para ser fácilmente extensible. Las "habilidades" son la forma principal de agregar nuevas capacidades a tu asistente.

## ¿Qué es una habilidad?

Una habilidad es un directorio que contiene un archivo `SKILL.md` (que proporciona instrucciones y definiciones de herramientas al LLM) y, opcionalmente, algunos scripts o recursos.

## Paso a paso: tu primera habilidad

### 1. Crear el directorio

Las habilidades residen en tu espacio de trabajo, generalmente en `~/.openclaw/workspace/skills/`. Crea una nueva carpeta para tu habilidad:

```bash
mkdir -p ~/.openclaw/workspace/skills/hello-world
```

### 2. Definir el `SKILL.md`

Crea un archivo `SKILL.md` en ese directorio. Este archivo utiliza frontmatter de YAML para los metadatos y Markdown para las instrucciones.

```markdown
---
name: hello_world
description: A simple skill that says hello.
---

# Hello World Skill

When the user asks for a greeting, use the `echo` tool to say "Hello from your custom skill!".
```

### 3. Agregar herramientas (Opcional)

Puedes definir herramientas personalizadas en el frontmatter o instruir al agente para que use herramientas del sistema existentes (como `bash` o `browser`).

### 4. Actualizar OpenClaw

Pide a tu agente que "actualice las habilidades" o reinicia la puerta de enlace. OpenClaw descubrirá el nuevo directorio e indexará el `SKILL.md`.

## Mejores prácticas

- **Sé conciso**: Instruye al modelo sobre _qué_ hacer, no sobre cómo ser una IA.
- **Seguridad ante todo**: Si tu habilidad usa `bash`, asegúrate de que los prompts no permitan la inyección de comandos arbitrarios desde entradas de usuarios que no son de confianza.
- **Probar localmente**: Usa `openclaw agent --message "use my new skill"` para probar.

## Habilidades compartidas

También puedes explorar y contribuir con habilidades en [ClawHub](https://clawhub.com).

import es from "/components/footer/es.mdx";

<es />
