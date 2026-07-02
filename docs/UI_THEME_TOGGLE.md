# UI Theme Toggle - Modo Claro/Oscuro

## Resumen

Se implementó un botón de alternancia de tema (modo claro/oscuro) en el sistema, permitiendo a los usuarios cambiar el entorno visual según su preferencia. La preferencia se mantiene al recargar la página mediante `localStorage`.

## Implementación

### Archivos Creados

1. **`tailwind.config.js`** - Configuración de TailwindCSS para dark mode con estrategia de clase
2. **`src/lib/utils/theme.ts`** - Utilidades de gestión de tema
3. **`src/lib/components/ui/ThemeToggle.svelte`** - Componente reutilizable de botón de tema
4. **`scripts/test-theme-toggle.ts`** - Script de validación de la implementación

### Archivos Modificados

1. **`src/routes/layout.css`** - Estilos CSS globales para compatibilidad con modo claro
2. **`src/routes/(app)/+layout.svelte`** - Integración del botón en layout principal de la app
3. **`src/routes/(auth)/login/+page.svelte`** - Integración del botón en página de login

## Cómo Funciona

### Estrategia de Tema

El sistema usa la estrategia de **clase CSS** de TailwindCSS:
- Cuando el tema es oscuro: `<html class="dark">`
- Cuando el tema es claro: `<html>` (sin clase `dark`)

### Funciones de Utilidad (`src/lib/utils/theme.ts`)

- **`getTheme()`**: Obtiene el tema actual desde `localStorage` o preferencia del sistema
- **`setTheme(theme)`**: Guarda el tema en `localStorage` y lo aplica
- **`applyTheme(theme)`**: Aplica la clase `dark` al elemento `<html>` según corresponda
- **`initTheme()`**: Inicializa el tema al cargar la página
- **`toggleTheme()`**: Alterna entre modo claro y oscuro

### Componente ThemeToggle

El componente `ThemeToggle.svelte` muestra:
- 🌙 "Oscuro" cuando está en modo oscuro
- ☀️ "Claro" cuando está en modo claro

El botón es responsive: muestra solo el emoji en mobile y emoji + texto en desktop.

### Persistencia

La preferencia del tema se guarda en `localStorage` con la clave `theme`. Los valores posibles son:
- `"light"` - Modo claro
- `"dark"` - Modo oscuro

Si no hay preferencia guardada, el sistema detecta la preferencia del sistema operativo (`prefers-color-scheme`).

## Ubicación del Botón

El botón de alternancia de tema está ubicado en:

1. **Layout principal de la app** (`src/routes/(app)/+layout.svelte`)
   - En el header, alineado a la derecha
   - Visible en todas las páginas autenticadas

2. **Página de login** (`src/routes/(auth)/login/+page.svelte`)
   - En la esquina superior derecha
   - Visible antes de autenticarse

## Estilos CSS para Modo Claro

Para evitar tener que modificar cada componente individualmente, se agregaron estilos CSS globales en `src/routes/layout.css` que sobrescriben las clases de modo oscuro cuando el elemento `<html>` no tiene la clase `dark`:

- Fondos oscuros (`bg-slate-950`, `bg-slate-900`, etc.) → Fondos claros
- Textos claros (`text-white`, `text-slate-300`, etc.) → Textos oscuros
- Bordes oscuros (`border-slate-800`, etc.) → Bordes claros
- Inputs → Fondo blanco con texto oscuro
- Estados hover → Adaptados para modo claro

Este enfoque permite que el sistema existente (diseñado originalmente para modo oscuro) funcione correctamente en modo claro sin modificar cada archivo.

## Pantallas Revisadas

Las siguientes pantallas fueron verificadas visualmente para asegurar legibilidad en ambos modos:

1. ✅ **Login** - Formulario de autenticación
2. ✅ **Dashboard** - Panel principal con métricas
3. ✅ **Alumnos** - Listado y gestión de alumnos
4. ✅ **Docentes** - Listado y gestión de docentes
5. ✅ **Finanzas** - Panel financiero
6. ✅ **Asistencia** - Gestión de asistencia
7. ✅ **Gestión documental** - Documentos de alumnos
8. ✅ **Reportes** - Reportes institucionales
9. ✅ **Configuración/Usuarios** - Gestión de usuarios

## Limitaciones

1. **Sin persistencia en backend**: La preferencia del tema no se guarda en la base de datos. Solo se usa `localStorage` localmente.
2. **Sin sincronización entre dispositivos**: Cada dispositivo mantiene su propia preferencia.
3. **Estilos CSS globales**: El modo claro se implementa mediante overrides CSS globales, no mediante clases `dark:` de Tailwind en cada componente. Esto es un compromiso para mantener el cambio mínimo.
4. **Sin preferencia por usuario**: No hay sistema de preferencias de usuario en backend aún.

## Comportamiento Esperado

### Al Cargar la Página

1. El sistema verifica `localStorage` para ver si hay una preferencia guardada
2. Si no hay preferencia, detecta la preferencia del sistema operativo
3. Aplica el tema correspondiente al elemento `<html>`
4. Evita parpadeo visual aplicando el tema lo antes posible

### Al Alternar el Tema

1. El usuario hace clic en el botón
2. El tema se alterna (claro ↔ oscuro)
3. La nueva preferencia se guarda en `localStorage`
4. La clase `dark` se agrega o remueve del elemento `<html>`
5. Los estilos CSS se actualizan inmediatamente

### Responsive

- **Desktop**: Muestra emoji + texto ("Oscuro" / "Claro")
- **Mobile**: Muestra solo el emoji (🌙 / ☀️)

## Validaciones

El script `scripts/test-theme-toggle.ts` valida:

1. ✅ Existe componente ThemeToggle
2. ✅ ThemeToggle se usa en layout principal
3. ✅ ThemeToggle se usa en login
4. ✅ Existen utilidades de tema
5. ✅ Se usa localStorage
6. ✅ Se aplica tema global al documento
7. ✅ No hay Prisma en UI
8. ✅ No se crearon endpoints
9. ✅ No hay nuevas migraciones
10. ✅ No se agregaron dependencias
11. ✅ No hay patrones prohibidos
12. ✅ Botón tiene labels claros
13. ✅ Hay manejo de carga inicial
14. ✅ Tailwind config tiene dark mode
15. ✅ CSS tiene overrides para modo claro

## Reglas Cumplidas

- ✅ No se agregaron dependencias nuevas
- ✅ No se crearon endpoints
- ✅ No se modificó schema
- ✅ No se crearon migraciones
- ✅ No se tocó Prisma
- ✅ No se usa base de datos para guardar el tema
- ✅ No se implementó sistema de preferencias en backend
- ✅ No se hizo rediseño completo del sistema
- ✅ El cambio es mínimo y enfocado

## Próximos Pasos (Opcionales)

Si se desea mejorar la implementación en el futuro:

1. Migrar de overrides CSS globales a clases `dark:` de Tailwind en cada componente
2. Implementar persistencia de preferencia en backend por usuario
3. Sincronizar preferencia entre dispositivos
4. Agregar más opciones de personalización (tamaño de fuente, contraste, etc.)
