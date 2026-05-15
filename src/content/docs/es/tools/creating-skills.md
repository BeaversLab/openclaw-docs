---
summary: "Construye y prueba habilidades personalizadas del espacio de trabajo con SKILL.md"
title: "Creación de habilidades"
read_when:
  - You are creating a new custom skill in your workspace
  - You need a quick starter workflow for SKILL.md-based skills
---

Las habilidades enseñan al agente cómo y cuándo usar las herramientas. Cada habilidad es un directorio
que contiene un archivo `SKILL.md` con frontmatter YAML e instrucciones en markdown.

Para obtener información sobre cómo se cargan y priorizan las habilidades, consulte [Habilidades](/es/tools/skills).

## Crea tu primera habilidad

<Steps>
  <Step title="Crear el directorio de la habilidad">
    Las habilidades residen en tu espacio de trabajo. Crea una nueva carpeta:

    ```bash
    mkdir -p ~/.openclaw/workspace/skills/hello-world
    ```

  </Step>

  <Step title="Escribir SKILL.md">
    Cree `SKILL.md` dentro de ese directorio. Los metadatos del frontmatter definen
    y el cuerpo de markdown contiene instrucciones para el agente.

    ```markdown
    ---
    name: hello-world
    description: A simple skill that says hello.
    ---

    # Hello World Skill

    When the user asks for a greeting, use the `echo` tool to say
    "Hello from your custom skill!".
    ```

    Use guiones (hyphen-case) con letras minúsculas, dígitos y guiones para la habilidad
    `name`. Mantenga el nombre de la carpeta y el frontmatter `name` alineados.

  </Step>

  <Step title="Añadir herramientas (opcional)">
    Puede definir esquemas de herramientas personalizados en el frontmatter o instruir al agente
    para que utilice herramientas del sistema existentes (como `exec` o `browser`). Las habilidades también pueden
    incluirse dentro de complementos junto con las herramientas que documentan.

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

## Referencia de metadatos de habilidades

El frontmatter YAML admite estos campos:

| Campo                               | Obligatorio | Descripción                                                          |
| ----------------------------------- | ----------- | -------------------------------------------------------------------- |
| `name`                              | Sí          | Identificador único que utiliza letras minúsculas, dígitos y guiones |
| `description`                       | Sí          | Descripción de una línea que se muestra al agente                    |
| `metadata.openclaw.os`              | No          | Filtro de sistema operativo (`["darwin"]`, `["linux"]`, etc.)        |
| `metadata.openclaw.requires.bins`   | No          | Binarios requeridos en PATH                                          |
| `metadata.openclaw.requires.config` | No          | Claves de configuración requeridas                                   |

## Mejores prácticas

- **Sé conciso** — indica al modelo _qué_ hacer, no cómo ser una IA
- **Seguridad ante todo** — si su habilidad utiliza `exec`, asegúrese de que los mensajes no permitan la inyección de comandos arbitrarios desde entradas que no son confiables
- **Probar localmente** — use `openclaw agent --message "..."` para probar antes de compartir
- **Use ClawHub** — navegue y contribuya con habilidades en [ClawHub](https://clawhub.ai)

## Dónde residen las habilidades

| Ubicación                       | Precedencia | Ámbito                              |
| ------------------------------- | ----------- | ----------------------------------- |
| `\<workspace\>/skills/`         | La más alta | Por agente                          |
| `\<workspace\>/.agents/skills/` | Alta        | Por agente del espacio de trabajo   |
| `~/.agents/skills/`             | Media       | Perfil de agente compartido         |
| `~/.openclaw/skills/`           | Media       | Compartido (todos los agentes)      |
| Incluido (enviado con OpenClaw) | Baja        | Global                              |
| `skills.load.extraDirs`         | La más baja | Carpetas compartidas personalizadas |

## Relacionado

- [Referencia de habilidades](/es/tools/skills) — reglas de carga, precedencia y bloqueo
- [Configuración de habilidades](/es/tools/skills-config) — esquema de configuración de `skills.*`
- [ClawHub](/es/clawhub) — registro público de habilidades
- [Construcción de complementos](/es/plugins/building-plugins) — los complementos pueden incluir habilidades
