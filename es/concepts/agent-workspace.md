---
summary: "Espacio de trabajo del agente: ubicación, diseño y estrategia de copia de seguridad"
read_when:
  - Necesitas explicar el espacio de trabajo del agente o su diseño de archivos
  - Quieres hacer una copia de seguridad o migrar un espacio de trabajo del agente
title: "Espacio de trabajo del agente"
---

# Espacio de trabajo del agente

El espacio de trabajo es el hogar del agente. Es el único directorio de trabajo que se utiliza para
las herramientas de archivos y para el contexto del espacio de trabajo. Mantenlo privado y trátalo como memoria.

Esto es independiente de `~/.openclaw/`, que almacena la configuración, las credenciales y
las sesiones.

**Importante:** el espacio de trabajo es el **cwd predeterminado**, no un sandbox (entorno aislado) estricto. Las herramientas
resuelven las rutas relativas con respecto al espacio de trabajo, pero las rutas absolutas aún pueden alcanzar
otros lugares en el host a menos que se habilite el aislamiento. Si necesitas aislamiento, utiliza
[`agents.defaults.sandbox`](/es/gateway/sandboxing) (y/o configuración de sandbox por agente).
Cuando el aislamiento está habilitado y `workspaceAccess` no es `"rw"`, las herramientas operan
dentro de un espacio de trabajo de aislamiento bajo `~/.openclaw/sandboxes`, no en tu espacio de trabajo del host.

## Ubicación predeterminada

- Predeterminado: `~/.openclaw/workspace`
- Si `OPENCLAW_PROFILE` está configurado y no es `"default"`, el valor predeterminado se convierte en
  `~/.openclaw/workspace-<profile>`.
- Anular en `~/.openclaw/openclaw.json`:

```json5
{
  agent: {
    workspace: "~/.openclaw/workspace",
  },
}
```

`openclaw onboard`, `openclaw configure` o `openclaw setup` crearán el
espacio de trabajo y sembrarán los archivos de inicio si faltan.
Las copias de semilla de sandbox solo aceptan archivos regulares dentro del espacio de trabajo; los alias de enlace simbólico/enlace duro
que resuelven fuera del espacio de trabajo de origen se ignoran.

Si ya gestionas los archivos del espacio de trabajo tú mismo, puedes desactivar la
creación de archivos de inicio:

```json5
{ agent: { skipBootstrap: true } }
```

## Carpetas adicionales del espacio de trabajo

Las instalaciones anteriores pueden haber creado `~/openclaw`. Mantener varios directorios
de espacio de trabajo puede causar una desviación de estado o autenticación confusa, porque solo
un espacio de trabajo está activo a la vez.

**Recomendación:** mantén un solo espacio de trabajo activo. Si ya no utilizas las
carpetas adicionales, archívalas o muévelas a la Papelera (por ejemplo, `trash ~/openclaw`).
Si mantienes intencionalmente varios espacios de trabajo, asegúrate de que
`agents.defaults.workspace` apunte al activo.

`openclaw doctor` advierte cuando detecta directorios de espacio de trabajo adicionales.

## Mapa de archivos del espacio de trabajo (qué significa cada archivo)

Estos son los archivos estándar que OpenClaw espera dentro del espacio de trabajo:

- `AGENTS.md`
  - Instrucciones de operación para el agente y cómo debe usar la memoria.
  - Cargado al inicio de cada sesión.
  - Buen lugar para reglas, prioridades y detalles de "cómo comportarse".

- `SOUL.md`
  - Personalidad, tono y límites.
  - Cargado en cada sesión.

- `USER.md`
  - Quién es el usuario y cómo dirigirse a él.
  - Cargado en cada sesión.

- `IDENTITY.md`
  - El nombre, la vibra y el emoji del agente.
  - Creado/actualizado durante el ritual de arranque (bootstrap).

- `TOOLS.md`
  - Notas sobre tus herramientas locales y convenciones.
  - No controla la disponibilidad de herramientas; es solo una guía.

- `HEARTBEAT.md`
  - Lista de verificación pequeña opcional para ejecuciones de latido.
  - Manténla breve para evitar el consumo de tokens.

- `BOOT.md`
  - Lista de verificación de inicio opcional que se ejecuta al reiniciar el gateway cuando los enlaces internos están habilitados.
  - Manténla breve; usa la herramienta de mensaje para envíos salientes.

- `BOOTSTRAP.md`
  - Ritual de primera ejecución única.
  - Solo se crea para un espacio de trabajo completamente nuevo.
  - Bórralo después de que se complete el ritual.

- `memory/YYYY-MM-DD.md`
  - Registro de memoria diaria (un archivo por día).
  - Se recomienda leer hoy + ayer al inicio de la sesión.

- `MEMORY.md` (opcional)
  - Memoria a largo plazo curada.
  - Solo cargar en la sesión principal privada (no en contextos compartidos/grupales).

Consulta [Memoria](/es/concepts/memory) para ver el flujo de trabajo y el vaciado automático de memoria.

- `skills/` (opcional)
  - Habilidades específicas del espacio de trabajo.
  - Anula las habilidades gestionadas/incluidas cuando los nombres colisionan.

- `canvas/` (opcional)
  - Archivos de la interfaz de usuario de Canvas para visualizaciones de nodos (por ejemplo, `canvas/index.html`).

Si falta algún archivo de arranque, OpenClaw inyecta un marcador de "archivo faltante" en
la sesión y continúa. Los archivos de arranque grandes se truncan al inyectarlos;
ajuste los límites con `agents.defaults.bootstrapMaxChars` (predeterminado: 20000) y
`agents.defaults.bootstrapTotalMaxChars` (predeterminado: 150000).
`openclaw setup` puede recrear los valores predeterminados faltantes sin sobrescribir los
archivos existentes.

## Qué NO hay en el espacio de trabajo

Estos residen en `~/.openclaw/` y NO se deben confirmar en el repositorio del espacio de trabajo:

- `~/.openclaw/openclaw.json` (configuración)
- `~/.openclaw/credentials/` (tokens de OAuth, claves de API)
- `~/.openclaw/agents/<agentId>/sessions/` (transcripciones de sesión + metadatos)
- `~/.openclaw/skills/` (habilidades administradas)

Si necesita migrar sesiones o configuración, cópielas por separado y manténgalas
fuera del control de versiones.

## Copia de seguridad de Git (recomendado, privado)

Trate el espacio de trabajo como memoria privada. Colóquelo en un repositorio git **privado** para que
esté respaldado y sea recuperable.

Ejecute estos pasos en la máquina donde se ejecuta el Gateway (es donde reside
el espacio de trabajo).

### 1) Inicializar el repositorio

Si git está instalado, los espacios de trabajo nuevos se inicializan automáticamente. Si este
espacio de trabajo aún no es un repositorio, ejecute:

```bash
cd ~/.openclaw/workspace
git init
git add AGENTS.md SOUL.md TOOLS.md IDENTITY.md USER.md HEARTBEAT.md memory/
git commit -m "Add agent workspace"
```

### 2) Agregar un remoto privado (opciones para principiantes)

Opción A: Interfaz web de GitHub

1. Cree un repositorio **privado** nuevo en GitHub.
2. No lo inicialice con un README (evita conflictos de fusión).
3. Copie la URL remota de HTTPS.
4. Agregue el remoto y haga push:

```bash
git branch -M main
git remote add origin <https-url>
git push -u origin main
```

Opción B: CLI de GitHub (`gh`)

```bash
gh auth login
gh repo create openclaw-workspace --private --source . --remote origin --push
```

Opción C: Interfaz web de GitLab

1. Cree un repositorio **privado** nuevo en GitLab.
2. No lo inicialice con un README (evita conflictos de fusión).
3. Copie la URL remota de HTTPS.
4. Agregue el remoto y haga push:

```bash
git branch -M main
git remote add origin <https-url>
git push -u origin main
```

### 3) Actualizaciones continuas

```bash
git status
git add .
git commit -m "Update memory"
git push
```

## No confirme secretos

Incluso en un repositorio privado, evite almacenar secretos en el espacio de trabajo:

- Claves de API, tokens de OAuth, contraseñas o credenciales privadas.
- Cualquier cosa bajo `~/.openclaw/`.
- Volcados en bruto de chats o archivos adjuntos confidenciales.

Si debe almacenar referencias confidenciales, use marcadores de posición y mantenga el
secreto real en otro lugar (gestor de contraseñas, variables de entorno o `~/.openclaw/`).

Inicio sugerido para `.gitignore`:

```gitignore
.DS_Store
.env
**/*.key
**/*.pem
**/secrets*
```

## Mover el espacio de trabajo a una nueva máquina

1. Clone el repositorio en la ruta deseada (predeterminado `~/.openclaw/workspace`).
2. Establezca `agents.defaults.workspace` en esa ruta en `~/.openclaw/openclaw.json`.
3. Ejecute `openclaw setup --workspace <path>` para crear los archivos que faltan.
4. Si necesita sesiones, copie `~/.openclaw/agents/<agentId>/sessions/` de la
   máquina antigua por separado.

## Notas avanzadas

- El enrutamiento multiagente puede utilizar diferentes espacios de trabajo por agente. Vea
  [Channel routing](/es/channels/channel-routing) para la configuración de enrutamiento.
- Si `agents.defaults.sandbox` está activado, las sesiones no principales pueden utilizar espacios de trabajo de espacio aislado
  por sesión bajo `agents.defaults.sandbox.workspaceRoot`.

import en from "/components/footer/en.mdx";

<en />
