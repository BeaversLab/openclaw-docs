---
summary: "Esquema y ejemplos de configuración de habilidades"
read_when:
  - Adding or modifying skills config
  - Adjusting bundled allowlist or install behavior
title: "Configuración de habilidades"
---

La mayor parte de la configuración del cargador/instalador de habilidades vive en `skills` en
`~/.openclaw/openclaw.json`. La visibilidad de habilidades específicas del agente vive en
`agents.defaults.skills` y `agents.list[].skills`.

```json5
{
  skills: {
    allowBundled: ["gemini", "peekaboo"],
    load: {
      extraDirs: ["~/Projects/agent-scripts/skills", "~/Projects/oss/some-skill-pack/skills"],
      allowSymlinkTargets: ["~/Projects/manager/skills"],
      watch: true,
      watchDebounceMs: 250,
    },
    install: {
      preferBrew: true,
      nodeManager: "npm", // npm | pnpm | yarn | bun (Gateway runtime still Node; bun not recommended)
      allowUploadedArchives: false,
    },
    workshop: {
      autonomous: {
        enabled: false,
      },
      approvalPolicy: "pending", // pending | auto
      maxPending: 50,
      maxSkillBytes: 40000,
    },
    entries: {
      "image-lab": {
        enabled: true,
        apiKey: { source: "env", provider: "default", id: "GEMINI_API_KEY" }, // or plaintext string
        env: {
          GEMINI_API_KEY: "GEMINI_KEY_HERE",
        },
      },
      peekaboo: { enabled: true },
      sag: { enabled: false },
    },
  },
}
```

Para la generación/edición de imágenes integrada, se prefiere `agents.defaults.imageGenerationModel`
más la herramienta central `image_generate`. `skills.entries.*` es solo para flujos de trabajo de habilidades
customizados o de terceros.

Si selecciona un proveedor/modelo de imagen específico, también configure la clave de
autenticación/API de ese proveedor. Ejemplos típicos: `GEMINI_API_KEY` o `GOOGLE_API_KEY` para
`google/*`, `OPENAI_API_KEY` para `openai/*`, y `FAL_KEY` para `fal/*`.

Ejemplos:

- Configuración nativa estilo Nano Banana Pro: `agents.defaults.imageGenerationModel.primary: "google/gemini-3-pro-image-preview"`
- Configuración nativa de fal: `agents.defaults.imageGenerationModel.primary: "fal/fal-ai/flux/dev"`

## Listas de permitidos de habilidades del agente

Use la configuración del agente cuando desee las mismas raíces de habilidades de máquina/espacio de trabajo, pero un
conjunto de habilidades visible diferente para cada agente.

```json5
{
  agents: {
    defaults: {
      skills: ["github", "weather"],
    },
    list: [
      { id: "writer" }, // inherits defaults -> github, weather
      { id: "docs", skills: ["docs-search"] }, // replaces defaults
      { id: "locked-down", skills: [] }, // no skills
    ],
  },
}
```

Reglas:

- `agents.defaults.skills`: lista de permitidos (allowlist) base compartida para los agentes que omiten
  `agents.list[].skills`.
- Omita `agents.defaults.skills` para dejar las habilidades sin restricciones de forma predeterminada.
- `agents.list[].skills`: conjunto final de habilidades explícito para ese agente; no se fusiona
  con los valores predeterminados.
- `agents.list[].skills: []`: no expone ninguna habilidad para ese agente.

## Campos

- Las raíces de habilidades integradas siempre incluyen `~/.openclaw/skills`, `~/.agents/skills`,
  `<workspace>/.agents/skills`, y `<workspace>/skills`.
- `allowBundled`: lista de permitidos (allowlist) opcional solo para habilidades **incluidas** (bundled). Cuando se establece, solo
  las habilidades incluidas en la lista son elegibles (las habilidades administradas, de agente y del espacio de trabajo no se ven afectadas).
- `load.extraDirs`: directorios de habilidades adicionales para escanear (menor precedencia).
- `load.allowSymlinkTargets`: directorios de destino reales de confianza en los que las carpetas de habilidades de workspace, project-agent o extra-dir con enlaces simbólicos pueden resolverse incluso cuando el enlace simbólico se encuentra fuera de esa raíz de destino. Use esto para diseños intencionales de repositorios hermanos, como `<workspace>/skills/manager -> ~/Projects/manager/skills`. Las raíces administradas `~/.openclaw/skills` y personales `~/.agents/skills` pueden seguir los enlaces simbólicos de directorios de habilidades de gestores de habilidades locales de manera predeterminada, pero cada `SKILL.md` todavía tiene que resolverse dentro de su propio directorio de habilidades.
- `load.watch`: vigila las carpetas de habilidades y actualiza la instantánea de habilidades (predeterminado: true).
- `load.watchDebounceMs`: tiempo de rebote para los eventos del observador de habilidades en milisegundos (predeterminado: 250).
- `install.preferBrew`: prefiere instaladores brew cuando estén disponibles (predeterminado: true).
- `install.nodeManager`: preferencia del instalador de node (`npm` | `pnpm` | `yarn` | `bun`, predeterminado: npm). Esto solo afecta las **instalaciones de habilidades**; el tiempo de ejecución de Gateway aún debe ser Node (no se recomienda Bun para WhatsApp/Telegram).
  - `openclaw setup --node-manager` es más estrecho y actualmente acepta `npm`, `pnpm` o `bun`. Configure `skills.install.nodeManager: "yarn"` manualmente si desea instalaciones de habilidades respaldadas por Yarn.
- `install.allowUploadedArchives`: permite a los clientes de Gateway de `operator.admin` de confianza instalar archivos zip privados preparados a través de `skills.upload.*` (predeterminado: false). Esto solo habilita la ruta del archivo cargado; las instalaciones normales de ClawHub no lo requieren.
- `workshop.autonomous.enabled`: permite a los agentes crear propuestas pendientes del Taller de habilidades (Skill Workshop) a partir de señales de conversación duraderas tras turnos exitosos (predeterminado: false). La creación de habilidades indicada por el usuario todavía pasa por el Taller de habilidades.
- `workshop.approvalPolicy`: política del ciclo de vida de la propuesta. `pending` requiere aprobación antes de las acciones de aplicar/rechazar/cuarentena iniciadas por el agente; `auto` permite esas acciones sin aprobación.
- `workshop.maxPending`: máximo de propuestas pendientes/en cuarentena retenidas por espacio de trabajo (predeterminado: 50).
- `workshop.maxSkillBytes`: tamaño máximo del cuerpo de la propuesta generado en bytes (predeterminado: 40000). Las descripciones de las propuestas también tienen un límite estricto de 160 bytes porque se pueden mostrar en el descubrimiento de habilidades y en listados de propuestas.
- `entries.<skillKey>`: anulaciones por habilidad.
- `agents.defaults.skills`: lista de permitidos (allowlist) de habilidades predeterminada opcional heredada por los agentes que omiten `agents.list[].skills`.
- `agents.list[].skills`: lista de permitidos (allowlist) final de habilidades opcional por agente; las listas explícitas reemplazan los valores predeterminados heredados en lugar de fusionarse.

## Repositorios hermanos enlazados simbólicamente

De forma predeterminada, las raíces de habilidades del espacio de trabajo, agente de proyecto, directorio adicional y agrupadas son límites de contención. Si una carpeta de habilidades en `<workspace>/skills` es un enlace simbólico que se resuelve fuera de `<workspace>/skills`, OpenClaw lo omite y registra `Skipping escaped skill path outside its configured root`.

Mantenga el diseño de enlaces simbólicos y permita solo la raíz de destino de confianza:

```json5
{
  skills: {
    load: {
      extraDirs: ["~/Projects/manager/skills"],
      allowSymlinkTargets: ["~/Projects/manager/skills"],
    },
  },
}
```

Con esta configuración, un enlace simbólico como `<workspace>/skills/manager -> ~/Projects/manager/skills` se acepta después de la resolución de realpath. `extraDirs` también escanea el repositorio hermano directamente, mientras que `allowSymlinkTargets` conserva la ruta del enlace simbólico para los diseños de habilidades de espacio de trabajo existentes. Los directorios administrados `~/.openclaw/skills` y personales `~/.agents/skills` ya aceptan enlaces simbólicos de directorios de habilidades porque esas raíces son superficies locales del administrador de habilidades propiedad del usuario; la contención `SKILL.md` por habilidad todavía se aplica. Mantenga las entradas de destino estrechas; no apunte a raíces amplias como `~` o `~/Projects` a menos que cada árbol de habilidades bajo esa raíz sea de confianza.

Campos por habilidad:

- `enabled`: establezca `false` para desactivar una habilidad incluso si está incluida/instalada.
- `env`: variables de entorno inyectadas para la ejecución del agente (solo si no están establecidas).
- `apiKey`: comodidad opcional para habilidades que declaran una variable de entorno principal.
  Admite cadena de texto sin formato u objeto SecretRef (`{ source, provider, id }`).

## Notas

- Las claves bajo `entries` se asignan al nombre de la habilidad de forma predeterminada. Si una habilidad define
  `metadata.openclaw.skillKey`, use esa clave en su lugar.
- La precedencia de carga es `<workspace>/skills` → `<workspace>/.agents/skills` →
  `~/.agents/skills` → `~/.openclaw/skills` → habilidades incluidas →
  `skills.load.extraDirs`.
- Los cambios en las habilidades se detectan en el siguiente turno del agente cuando el observador está habilitado.

### Habilidades en sandbox y variables de entorno

Cuando una sesión está **en sandbox**, los procesos de las habilidades se ejecutan dentro del backend de sandbox configurado. El sandbox **no** hereda el `process.env` del host.

<Warning>
  El `env` global y `skills.entries.<skill>.env`/`apiKey` se aplican solo a ejecuciones en el **host**. Dentro de un sandbox no tienen efecto, por lo que una habilidad que depende de `GEMINI_API_KEY` fallará con `apiKey not configured` a menos que se proporcione la variable al sandbox por separado.
</Warning>

Use una de:

- `agents.defaults.sandbox.docker.env` para el backend de Docker (o `agents.list[].sandbox.docker.env` por agente).
- Incorpore el entorno en su imagen de sandbox personalizada o entorno de sandbox remoto.

Para los sandboxes de Docker, los valores `sandbox.docker.env` configurados se convierten en variables de entorno explícitas del contenedor. Los usuarios con acceso al demonio de Docker pueden inspeccionarlos a través de los metadatos de Docker, por lo que debe usar un archivo secreto montado, una imagen personalizada u otra ruta de entrega cuando esta exposición no sea aceptable.

## Relacionado

<CardGroup cols={2}>
  <Card title="Habilidades" href="/es/tools/skills" icon="puzzle-piece">
    Qué son las habilidades y cómo se cargan.
  </Card>
  <Card title="Creación de habilidades" href="/es/tools/creating-skills" icon="hammer">
    Creación de paquetes de habilidades personalizados.
  </Card>
  <Card title="Comandos de barra" href="/es/tools/slash-commands" icon="terminal">
    Catálogo de comandos nativos y directivas de chat.
  </Card>
  <Card title="Referencia de configuración" href="/es/gateway/configuration-reference" icon="gear">
    Esquema completo de `skills` y `agents.skills`.
  </Card>
</CardGroup>
