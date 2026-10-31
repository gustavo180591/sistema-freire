# Sistema Freire 🎓

**Plataforma de gestión académica, administrativa y financiera para instituciones educativas.**

![SvelteKit](https://img.shields.io/badge/SvelteKit-2-FF3E00?logo=svelte&logoColor=white)
![Svelte](https://img.shields.io/badge/Svelte-5-FF3E00?logo=svelte&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?logo=postgresql&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-6-2D3748?logo=prisma&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-06B6D4?logo=tailwindcss&logoColor=white)

> Proyecto desarrollado por [Gustavo Faccendini](https://github.com/gustavo180591), Analista Programador y desarrollador Full Stack.

## 🎯 El problema que resuelve

La administración académica suele distribuir información entre planillas, documentación y procesos manuales. Sistema Freire centraliza la gestión institucional y brinda vistas diferenciadas para los perfiles que participan de su operación.

## ✨ Módulos del proyecto

Los siguientes módulos tienen representación en las rutas y/o en el modelo de datos del repositorio:

| Área                      | Alcance                                                                             |
| ------------------------- | ----------------------------------------------------------------------------------- |
| Académica                 | Carreras, materias, planes de estudio, correlatividades, comisiones e inscripciones |
| Alumnos y docentes        | Legajos, estados, asignaciones y vistas específicas                                 |
| Asistencia y evaluaciones | Registros de asistencia, calificaciones, evaluaciones y mesas de examen             |
| Gestión documental        | Documentos asociados a personas y procesos institucionales                          |
| Finanzas                  | Cargos, pagos, becas, recibos, movimientos, acuerdos de pago y reportes             |
| Administración            | Usuarios, roles, permisos, auditoría y configuración                                |
| Seguimiento               | Dashboard, reportes e indicadores operativos                                        |

La presencia de un módulo en el código no implica que todas sus funcionalidades estén habilitadas para cualquier usuario: el acceso depende de autenticación, permisos y configuración institucional.

## 🧱 Arquitectura y stack

- **Aplicación web:** SvelteKit 2, Svelte 5 y TypeScript.
- **UI:** Tailwind CSS 4, componentes reutilizables y vistas responsive.
- **Servidor:** rutas, cargas y acciones de SvelteKit.
- **Persistencia:** PostgreSQL + Prisma ORM 6.
- **Acceso:** Auth.js para SvelteKit y modelo de usuarios, roles y permisos.
- **Calidad:** ESLint, Prettier, Vitest y Playwright configurados.
- **Entorno:** Docker Compose y adaptador Node.js.

```text
src/routes/       Rutas públicas, autenticación y áreas protegidas
src/lib/          Lógica reutilizable, componentes y servicios
prisma/           Esquema y migraciones de la base de datos
docs/             Decisiones técnicas, auditorías y documentación
```

## 🚀 Instalación para desarrollo

**Requisitos:** Node.js compatible con el proyecto, npm, PostgreSQL y las variables de entorno necesarias para autenticación y base de datos.

1. Cloná el repositorio e instalá las dependencias:

   ```bash
   git clone https://github.com/gustavo180591/sistema-freire.git
   cd sistema-freire
   npm ci
   ```

2. Prepará la configuración local a partir de `.env.example`:

   ```bash
   cp .env.example .env
   ```

   Completá **únicamente con credenciales locales** los valores requeridos, incluida `DATABASE_URL`. No publiques archivos con contraseñas ni claves reales.

3. Configurá una base de datos **de desarrollo** e inicializá Prisma:

   ```bash
   npx prisma generate
   npx prisma migrate dev
   ```

   > Revisá el estado de las migraciones antes de ejecutarlas. No uses comandos que modifiquen la base de producción sin respaldo y plan de despliegue.

4. Levantá la aplicación:

   ```bash
   npm run dev
   ```

La aplicación requiere datos y usuarios de prueba apropiados para explorar áreas protegidas. No se publican credenciales de acceso.

## ✅ Calidad y verificaciones disponibles

```bash
npm run check
npm run lint
npm run build
npm run test:unit -- --run
npm run test:e2e
```

Son **comandos disponibles** en el proyecto; esta documentación no certifica resultados de ejecución ni cobertura completa.

## 🖼️ Capturas y demostración

Las capturas de las vistas institucionales se incorporarán cuando estén disponibles **imágenes autorizadas, con datos de prueba y sin información personal**. No se publica un usuario de demostración ni un entorno productivo.

## 📚 Documentación complementaria

- [Modelo curricular](CURRICULAR_IMPLEMENTATION.md)
- [Arquitectura de roles](docs/ARCHITECTURE_ROLES.md)
- [Guía de entrega y operación](docs/SYSTEM_HANDOVER_GUIDE.md)

## 🔐 Uso responsable

El código es una referencia técnica del proyecto. Para reutilizarlo en una institución es necesario revisar licencias, configuración, autorizaciones, migraciones, seguridad y tratamiento de datos.

---

**Desarrollo:** [Gustavo Faccendini](https://github.com/gustavo180591) · [LinkedIn](https://www.linkedin.com/in/gustavo-faccendini-9a209816b/)
