---
title: "Crear habilidades"
summary: "Construye y prueba habilidades personalizadas del espacio de trabajo con SKILL.md"
read_when:
  - You are creating a new custom skill in your workspace
  - You need a quick starter workflow for SKILL.md-based skills
---

# Crear habilidades

Las habilidades enseñan al agente cómo y cuándo utilizar las herramientas. Cada habilidad es un directorio
que contiene un archivo `SKILL.md` con frontmatter YAML e instrucciones en markdown.

Para obtener información sobre cómo se cargan y priorizan las habilidades, consulte [Habilidades](/en/tools/skills).

## Crear tu primera habilidad

<Steps>
  <Step title="Crear el directorio de la habilidad">
    Las habilidades residen en tu espacio de trabajo. Crea una nueva carpeta:

    ```bash
    mkdir -p ~/.openclaw/workspace/skills/hello-world
    ```

  </Step>

  <Step title="Escribir SKILL.md">
    Crea `SKILL.md` dentro de ese directorio. El frontmatter define los metadatos
    y el cuerpo markdown contiene las instrucciones para el agente.

    ```markdown
    ---
    name: hello_world
    description: A simple skill that says hello.
    ---

    # Hello World Skill

    When the user asks for a greeting, use the `echo` tool to say
    "Hello from your custom skill!".
    ```

  </Step>

  <Step title="Añadir herramientas (opcional)">
    Puedes definir esquemas de herramientas personalizados en el frontmatter o instruir al agente
    para que use herramientas del sistema existentes (como `exec` o `browser`). Las habilidades también pueden
    distribuirse dentro de complementos junto con las herramientas que documentan.

  </Step>

  <Step title="Cargar la habilidad">
    Inicia una nueva sesión para que OpenClaw reconozca la habilidad:

    ```bash
    # From chat
    /new

    # Or restart the gateway
    openclaw gateway restart
    ```

    Verifica que la habilidad se haya cargado:

    ```bash
    openclaw skills list
    ```

  </Step>

  <Step title="Probarla">
    Envía un mensaje que debería activar la habilidad:

    ```bash
    openclaw agent --message "give me a greeting"
    ```

    O simplemente chatea con el agente y pide un saludo.

  </Step>
</Steps>

## Referencia de metadatos de habilidad

El frontmatter YAML admite estos campos:

| Campo                               | Obligatorio | Descripción                                       |
| ----------------------------------- | ----------- | ------------------------------------------------- |
| `name`                              | Sí          | Identificador único (snake_case)                  |
| `description`                       | Sí          | Descripción de una línea que se muestra al agente |
| `metadata.openclaw.os`              | No          | Filtro de SO (`["darwin"]`, `["linux"]`, etc.)    |
| `metadata.openclaw.requires.bins`   | No          | Binarios requeridos en PATH                       |
| `metadata.openclaw.requires.config` | No          | Claves de configuración requeridas                |

## Mejores prácticas

- **Sea conciso** — instruya al modelo sobre _qué_ hacer, no sobre cómo ser una IA
- **Seguridad ante todo** — si su habilidad usa `exec`, asegúrese de que los mensajes no permitan la inyección de comandos arbitrarios desde entradas que no son confiables
- **Pruebe localmente** — use `openclaw agent --message "..."` para probar antes de compartir
- **Use ClawHub** — navegue y contribuya con habilidades en [ClawHub](https://clawhub.com)

## Ubicación de las habilidades

| Ubicación                       | Precedencia | Alcance                             |
| ------------------------------- | ----------- | ----------------------------------- |
| `\<workspace\>/skills/`         | La más alta | Por agente                          |
| `~/.openclaw/skills/`           | Media       | Compartida (todos los agentes)      |
| Incluida (enviada con OpenClaw) | La más baja | Global                              |
| `skills.load.extraDirs`         | La más baja | Carpetas compartidas personalizadas |

## Relacionado

- [Referencia de habilidades](/en/tools/skills) — reglas de carga, precedencia y filtrado
- [Configuración de habilidades](/en/tools/skills-config) — esquema de configuración `skills.*`
- [ClawHub](/en/tools/clawhub) — registro público de habilidades
- [Creación de complementos](/en/plugins/building-plugins) — los complementos pueden incluir habilidades
