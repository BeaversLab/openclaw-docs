---
summary: "Espacio de trabajo del agente: ubicación, diseño y estrategia de respaldo"
read_when:
  - You need to explain the agent workspace or its file layout
  - You want to back up or migrate an agent workspace
title: "Espacio de trabajo del agente"
sidebarTitle: "Espacio de trabajo del agente"
---

El espacio de trabajo es el hogar del agente. Es el único directorio de trabajo utilizado para las herramientas de archivos y para el contexto del espacio de trabajo. Manténgalo privado y trátelo como memoria.

Esto es independiente de `~/.openclaw/`, que almacena la configuración, las credenciales y las sesiones.

<Warning>
El espacio de trabajo es el **cwd predeterminado**, no un sandbox estricto. Las herramientas resuelven las rutas relativas con respecto al espacio de trabajo, pero las rutas absolutas aún pueden alcanzar otros lugares en el host a menos que se habilite el sandbox. Si necesitas aislamiento, usa [`agents.defaults.sandbox`](/es/gateway/sandboxing) (y/o configuración de sandbox por agente).

Cuando se habilita el sandbox y `workspaceAccess` no es `"rw"`, las herramientas operan dentro de un espacio de trabajo de espacio aislado bajo `~/.openclaw/sandboxes`, no en tu espacio de trabajo del host.

</Warning>

## Ubicación predeterminada

- Predeterminado: `~/.openclaw/workspace`
- Si `OPENCLAW_PROFILE` está establecido y no es `"default"`, el valor predeterminado pasa a ser `~/.openclaw/workspace-<profile>`.
- Anular en `~/.openclaw/openclaw.json`:

```json5
{
  agents: {
    defaults: {
      workspace: "~/.openclaw/workspace",
    },
  },
}
```

`openclaw onboard`, `openclaw configure` o `openclaw setup` crearán el espacio de trabajo y sembrarán los archivos de inicio (bootstrap) si faltan.

<Note>Las copias semilla del entorno protegido (sandbox) solo aceptan archivos regulares dentro del espacio de trabajo; se ignoran los alias de enlaces simbólicos/enlaces duros que resuelven fuera del espacio de trabajo de origen.</Note>

Si ya administra los archivos del espacio de trabajo usted mismo, puede desactivar la creación de archivos de inicio:

```json5
{ agents: { defaults: { skipBootstrap: true } } }
```

## Carpetas adicionales del espacio de trabajo

Las instalaciones anteriores pueden haber creado `~/openclaw`. Mantener varios directorios de espacio de trabajo puede causar una deriva de estado o autenticación confusa, porque solo un espacio de trabajo está activo a la vez.

<Note>
**Recomendación:** mantenga un solo espacio de trabajo activo. Si ya no usa las carpetas adicionales, archívelas o muévalas a la Papelera (por ejemplo `trash ~/openclaw`). Si mantiene intencionalmente múltiples espacios de trabajo, asegúrese de que `agents.defaults.workspace` apunte al activo.

`openclaw doctor` advierte cuando detecta directorios de espacio de trabajo adicionales.

</Note>

## Mapa de archivos del espacio de trabajo

Estos son los archivos estándar que OpenClaw espera dentro del espacio de trabajo:

<AccordionGroup>
  <Accordion title="AGENTS.md - instrucciones de operación">Instrucciones de operación para el agente y cómo debe usar la memoria. Se cargan al inicio de cada sesión. Buen lugar para reglas, prioridades y detalles sobre "cómo comportarse".</Accordion>
  <Accordion title="SOUL.md - personalidad y tono">Personalidad, tono y límites. Se cargan en cada sesión. Guía: [guía de personalidad de SOUL.md](/es/concepts/soul).</Accordion>
  <Accordion title="USER.md - quién es el usuario">Quién es el usuario y cómo dirigirse a él. Se carga en cada sesión.</Accordion>
  <Accordion title="IDENTITY.md - nombre, vibra, emoji">El nombre, vibra y emoji del agente. Creado/actualizado durante el ritual de arranque.</Accordion>
  <Accordion title="TOOLS.md - convenciones de herramientas locales">Notas sobre tus herramientas locales y convenciones. No controla la disponibilidad de herramientas; es solo orientación.</Accordion>
  <Accordion title="HEARTBEAT.md - lista de verificación de latido">Pequeña lista de verificación opcional para ejecuciones de latido. Mantenla corta para evitar quemar tokens.</Accordion>
  <Accordion title="BOOT.md - lista de verificación de inicio">Lista de verificación de inicio opcional que se ejecuta automáticamente al reiniciar el gateway (cuando los [ganchos internos](/es/automation/hooks) están habilitados). Mantenla corta; usa la herramienta de mensaje para envíos salientes.</Accordion>
  <Accordion title="BOOTSTRAP.md - first-run ritual">Ritual de primera ejecución única. Solo se crea para un espacio de trabajo completamente nuevo. Elimínelo después de que se complete el ritual.</Accordion>
  <Accordion title="memory/YYYY-MM-DD.md - daily memory log">Registro de memoria diaria (un archivo por día). Se recomienda leer hoy + ayer al iniciar la sesión.</Accordion>
  <Accordion title="MEMORY.md - curated long-term memory (optional)">
    Memoria a largo plazo curada: hechos duraderos, preferencias, decisiones y resúmenes cortos. Mantenga registros detallados en `memory/YYYY-MM-DD.md` para que las herramientas de memoria puedan recuperarlos bajo demanda sin inyectarlos en cada mensaje. Cargue `MEMORY.md` solo en la sesión privada principal (no en contextos compartidos o grupales). Consulte [Memory](/es/concepts/memory) para
    conocer el flujo de trabajo y el vaciado automático de memoria.
  </Accordion>
  <Accordion title="skills/ - workspace skills (optional)">Habilidades específicas del espacio de trabajo. Ubicación de habilidades de mayor precedencia para ese espacio de trabajo. Anula las habilidades del agente del proyecto, las habilidades del agente personal, las habilidades administradas, las habilidades empaquetadas y `skills.load.extraDirs` cuando los nombres colisionan.</Accordion>
  <Accordion title="canvas/ - Canvas UI files (optional)">Archivos de interfaz de usuario de Canvas para visualizaciones de nodos (por ejemplo `canvas/index.html`).</Accordion>
</AccordionGroup>

<Note>
  Si falta algún archivo de arranque, OpenClaw inyecta un marcador de "archivo faltante" en la sesión y continúa. Los archivos de arranque grandes se truncan al inyectarse; ajuste los límites con `agents.defaults.bootstrapMaxChars` (predeterminado: 20000) y `agents.defaults.bootstrapTotalMaxChars` (predeterminado: 60000). `openclaw setup` puede recrear los valores predeterminados faltantes sin
  sobrescribir los archivos existentes.
</Note>

## Qué NO está en el espacio de trabajo

Estos residen bajo `~/.openclaw/` y NO deben enviarse al repositorio del espacio de trabajo:

- `~/.openclaw/openclaw.json` (config)
- `~/.openclaw/agents/<agentId>/agent/auth-profiles.json` (perfiles de autenticación de modelos: OAuth + claves API)
- `~/.openclaw/agents/<agentId>/agent/codex-home/` (cuenta de tiempo de ejecución de Codex por agente, configuración, habilidades, complementos y estado de subproceso nativo)
- `~/.openclaw/credentials/` (estado del canal/proveedor más datos de importación de OAuth heredados)
- `~/.openclaw/agents/<agentId>/sessions/` (transcripciones de sesión + metadatos)
- `~/.openclaw/skills/` (habilidades administradas)

Si necesita migrar sesiones o configuraciones, cópielas por separado y manténgalas fuera del control de versiones.

## Copia de seguridad de Git (recomendado, privado)

Trate el espacio de trabajo como memoria privada. Colóquelo en un repositorio git **privado** para que se haga una copia de seguridad y se pueda recuperar.

Ejecute estos pasos en la máquina donde se ejecuta el Gateway (es donde reside el espacio de trabajo).

<Steps>
  <Step title="Inicializar el repositorio">
    Si git está instalado, los espacios de trabajo nuevos se inicializan automáticamente. Si este espacio de trabajo aún no es un repositorio, ejecute:

    ```bash
    cd ~/.openclaw/workspace
    git init
    git add AGENTS.md SOUL.md TOOLS.md IDENTITY.md USER.md HEARTBEAT.md memory/
    git commit -m "Add agent workspace"
    ```

  </Step>
  <Step title="Agregar un control remoto privado">
    <Tabs>
      <Tab title="Interfaz web de GitHub">
        1. Cree un repositorio nuevo **privado** en GitHub.
        2. No lo inicialice con un README (evita conflictos de fusión).
        3. Copie la URL remota de HTTPS.
        4. Agregue el control remoto y haga push:

        ```bash
        git branch -M main
        git remote add origin <https-url>
        git push -u origin main
        ```
      </Tab>
      <Tab title="CLI de GitHub (gh)">
        ```bash
        gh auth login
        gh repo create openclaw-workspace --private --source . --remote origin --push
        ```
      </Tab>
      <Tab title="Interfaz web de GitLab">
        1. Cree un repositorio nuevo **privado** en GitLab.
        2. No lo inicialice con un README (evita conflictos de fusión).
        3. Copie la URL remota de HTTPS.
        4. Agregue el control remoto y haga push:

        ```bash
        git branch -M main
        git remote add origin <https-url>
        git push -u origin main
        ```
      </Tab>
    </Tabs>

  </Step>
  <Step title="Actualizaciones continuas">
    ```bash
    git status
    git add .
    git commit -m "Update memory"
    git push
    ```
  </Step>
</Steps>

## No confirme secretos

<Warning>
Incluso en un repositorio privado, evite almacenar secretos en el espacio de trabajo:

- Claves de API, tokens de OAuth, contraseñas o credenciales privadas.
- Cualquier cosa en `~/.openclaw/`.
- Volcados sin procesar de chats o archivos adjuntos confidenciales.

Si debe almacenar referencias confidenciales, use marcadores de posición y mantenga el secreto real en otro lugar (administrador de contraseñas, variables de entorno o `~/.openclaw/`).

</Warning>

Inicializador `.gitignore` sugerido:

```gitignore
.DS_Store
.env
**/*.key
**/*.pem
**/secrets*
```

## Mover el espacio de trabajo a una nueva máquina

<Steps>
  <Step title="Clonar el repositorio">
    Clona el repositorio en la ruta deseada (por defecto `~/.openclaw/workspace`).
  </Step>
  <Step title="Actualizar configuración">
    Establece `agents.defaults.workspace` en esa ruta en `~/.openclaw/openclaw.json`.
  </Step>
  <Step title="Sembrar archivos faltantes">
    Ejecuta `openclaw setup --workspace <path>` para sembrar cualquier archivo faltante.
  </Step>
  <Step title="Copiar sesiones (opcional)">
    Si necesitas las sesiones, copia `~/.openclaw/agents/<agentId>/sessions/` de la máquina antigua por separado.
  </Step>
</Steps>

## Notas avanzadas

- El enrutamiento multiagente puede utilizar diferentes espacios de trabajo por agente. Consulta [Enrutamiento de canales](/es/channels/channel-routing) para la configuración de enrutamiento.
- Si `agents.defaults.sandbox` está habilitado, las sesiones que no sean la principal pueden usar espacios de trabajo de sandbox por sesión bajo `agents.defaults.sandbox.workspaceRoot`.

## Relacionado

- [Heartbeat](/es/gateway/heartbeat) - archivo de espacio de trabajo HEARTBEAT.md
- [Sandboxing](/es/gateway/sandboxing) - acceso al espacio de trabajo en entornos con sandbox
- [Sesión](/es/concepts/session) - rutas de almacenamiento de sesiones
- [Órdenes permanentes](/es/automation/standing-orders) - instrucciones persistentes en archivos del espacio de trabajo
