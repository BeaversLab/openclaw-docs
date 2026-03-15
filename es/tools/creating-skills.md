---
title: "Crear Habilidades"
summary: "Construye y prueba habilidades personalizadas del espacio de trabajo con SKILL.md"
read_when:
  - You are creating a new custom skill in your workspace
  - You need a quick starter workflow for SKILL.md-based skills
---

# Crear Habilidades Personalizadas 🛠

OpenClaw está diseñado para ser fácilmente extensible. Las "Habilidades" ("Skills") son la forma principal de añadir nuevas capacidades a tu asistente.

## ¿Qué es una Habilidad?

Una habilidad es un directorio que contiene un archivo `SKILL.md` (que proporciona instrucciones y definiciones de herramientas al LLM) y opcionalmente algunos scripts o recursos.

## Paso a Paso: Tu Primera Habilidad

### 1. Crear el Directorio

Las habilidades residen en tu espacio de trabajo, usualmente en `~/.openclaw/workspace/skills/`. Crea una nueva carpeta para tu habilidad:

```bash
mkdir -p ~/.openclaw/workspace/skills/hello-world
```

### 2. Definir el `SKILL.md`

Crea un archivo `SKILL.md` en ese directorio. Este archivo usa frontmatter YAML para metadatos y Markdown para instrucciones.

```markdown
---
name: hello_world
description: A simple skill that says hello.
---

# Hello World Skill

When the user asks for a greeting, use the `echo` tool to say "Hello from your custom skill!".
```

### 3. Añadir Herramientas (Opcional)

Puedes definir herramientas personalizadas en el frontmatter o instruir al agente para que use herramientas del sistema existentes (como `bash` o `browser`).

### 4. Actualizar OpenClaw

Pide a tu agente que "actualice habilidades" ("refresh skills") o reinicia el gateway. OpenClaw descubrirá el nuevo directorio e indexará el `SKILL.md`.

## Mejores Prácticas

- **Sé Conciso**: Instruye al modelo sobre _qué_ hacer, no sobre cómo ser una IA.
- **Seguridad Primero**: Si tu habilidad usa `bash`, asegúrate de que los prompts no permitan la inyección de comandos arbitrarios desde entradas de usuario no confiables.
- **Prueba Localmente**: Usa `openclaw agent --message "use my new skill"` para probar.

## Habilidades Compartidas

También puedes explorar y contribuir con habilidades a [ClawHub](https://clawhub.com).

import es from "/components/footer/es.mdx";

<es />
