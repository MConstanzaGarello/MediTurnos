# MediTurnos

Sistema web de gestión de turnos médicos.

Este repositorio contiene:

- **Frontend**: Next.js (App Router) — carpeta raíz (`app/`, `components/`, `lib/`).
- **Backend**: Node.js + Express + Sequelize + PostgreSQL — carpeta `backend/`.

Actualmente está implementada de punta a punta la **HU-01 — Registro de paciente**
(formulario → validaciones frontend → API backend → validaciones backend →
PostgreSQL → paciente registrado). Las demás historias de usuario todavía no
están implementadas.

## 1. Requisitos

- Node.js 20 o superior.
- npm.
- PostgreSQL 14 o superior (local o accesible por red).

## 2. Instalación de dependencias

Hay dos proyectos npm independientes: el frontend (raíz) y el backend
(`backend/`).

```bash
# Frontend
npm install

# Backend
cd backend
npm install
cd ..
```

## 3. Configuración de variables de entorno

### Frontend (raíz del proyecto)

```bash
cp env.local.example .env.local
```

Contiene la URL del backend:

```
NEXT_PUBLIC_API_URL=http://localhost:4000
```

### Backend (`backend/`)

```bash
cd backend
cp .env.example .env
```

Completá `backend/.env` con los datos de tu PostgreSQL local:

```
PORT=4000
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000

DB_HOST=127.0.0.1
DB_PORT=5432
DB_NAME=mediturnos
DB_USER=postgres
DB_PASSWORD=postgres

BCRYPT_SALT_ROUNDS=10
```

`backend/.env` **no se sube al repositorio** (está en `.gitignore`); solo se
versiona `backend/.env.example` como plantilla.

## 4. Configuración de PostgreSQL

Asegurate de tener un servidor PostgreSQL corriendo y accesible con las
credenciales que pusiste en `backend/.env`.

## 5. Creación de la base de datos

Desde `backend/`:

```bash
npm run db:create
```

Esto crea la base `mediturnos` (o el nombre que hayas puesto en `DB_NAME`)
usando `sequelize-cli`.

## 6. Ejecución de las migraciones

Todavía desde `backend/`:

```bash
npm run db:migrate
```

Esto crea la tabla `pacientes` con las columnas `id, nombre, apellido, dni,
fecha_nacimiento, email, telefono, password, created_at, updated_at`, y las
restricciones `UNIQUE` sobre `dni` y `email`.

Para revertir la última migración: `npm run db:migrate:undo`.

## 7. Ejecución del backend

Desde `backend/`:

```bash
npm run dev
```

El servidor queda escuchando en **http://localhost:4000**.

Podés verificar que está vivo con:

```bash
curl http://localhost:4000/health
```

## 8. Ejecución del frontend

Desde la raíz del proyecto:

```bash
npm run dev
```

La app queda disponible en **http://localhost:3000**.

## 9. Cómo probar el registro (HU-01)

1. Con el backend (`:4000`) y el frontend (`:3000`) corriendo, abrí
   `http://localhost:3000`.
2. Completá el formulario de registro con datos válidos y hacé click en
   "Registrarme".
3. El botón muestra "Registrando..." mientras se procesa.
4. Si todo es válido, se muestra la pantalla de "¡Registro exitoso!" y el
   paciente queda guardado en PostgreSQL (tabla `pacientes`, con la
   contraseña hasheada con bcrypt, nunca en texto plano).
5. Si volvés a registrar el mismo DNI o el mismo correo, el backend
   responde `409` y el formulario muestra el error debajo del campo
   correspondiente ("Este DNI ya se encuentra registrado." / "Este correo
   ya se encuentra registrado.").

También podés probar la API directamente:

```bash
curl -i -X POST http://localhost:4000/api/pacientes/registro \
  -H "Content-Type: application/json" \
  -d '{
    "nombre": "María",
    "apellido": "González",
    "dni": "30123456",
    "fechaNacimiento": "1990-05-10",
    "email": "maria.gonzalez@gmail.com",
    "telefono": "011 3456-7890",
    "password": "Segura123",
    "confirmarPassword": "Segura123"
  }'
```

## 9.1 Cómo probar "Mis turnos" (HU-04)

1. Aplicá la migración nueva (agrega la columna `estado` a `turnos`):
   `cd backend && npm run db:migrate`.
2. Con backend y frontend corriendo, iniciá sesión y pedí uno o más turnos
   desde "Nuevo Turno".
3. Entrá a **Mis Turnos** desde el menú lateral
   (`http://localhost:3000/turnos/mis-turnos`).
4. Se listan solo tus turnos, ordenados por fecha, con especialidad,
   profesional, fecha, horario y estado. Pestañas: **Próximos**
   (confirmados de hoy en adelante) y **Cancelados**. Los turnos pasados
   quedan para el Historial (HU-07).
5. Sin turnos se muestra "No posee turnos programados."; si el backend no
   responde, "No fue posible obtener los turnos." con un botón Reintentar.

Por API:

```bash
curl -H "Authorization: Bearer <token del login>" http://localhost:4000/api/turnos/mis-turnos
```

## 9.2 Pruebas automáticas

```bash
# Backend (Jest + Supertest). Usa una base aparte: mediturnos_test
cd backend
npm test

# Frontend (Vitest)
cd ..
npm test
```

Las pruebas de integración del backend crean la base `mediturnos_test`
(o la de `DB_NAME_TEST`) y le aplican todas las migraciones desde cero, así
que no tocan tus datos de desarrollo. Necesitan PostgreSQL corriendo con
las credenciales de `backend/.env`.

## 10. URLs y puertos

| Servicio                | URL                              |
| ------------------------ | --------------------------------- |
| Frontend (Next.js)       | http://localhost:3000             |
| Backend (Express API)    | http://localhost:4000             |
| Endpoint de registro     | `POST /api/pacientes/registro`    |
| Mis turnos (HU-04)       | `GET /api/turnos/mis-turnos` (requiere sesión) |
| Health check del backend | `GET /health`                     |

## 11. Arquitectura

```
mediturnos/
├── app/                        # Next.js App Router (frontend)
│   ├── layout.tsx
│   ├── page.tsx                 # Pantalla de registro
│   └── globals.css
├── components/
│   └── patient/
│       ├── RegisterForm.tsx     # Formulario de registro (orquesta todo)
│       ├── FormField.tsx        # Input reutilizable (label + error)
│       ├── EmailField.tsx       # Email + sugerencias de dominio
│       └── PasswordRequirements.tsx
├── lib/
│   ├── types/patient.ts         # Tipos compartidos del formulario
│   ├── validation/
│   │   ├── patient.ts           # Reglas de validación (UX)
│   │   └── email-domains.ts     # Sugerencias de dominio de email
│   └── services/
│       └── patientService.ts    # Cliente HTTP hacia el backend
├── env.local.example
└── backend/                     # API REST (Node.js + Express + Sequelize)
    ├── src/
    │   ├── server.ts             # Punto de entrada
    │   ├── app.ts                # Configuración de Express
    │   ├── config/
    │   │   ├── env.ts            # Variables de entorno tipadas
    │   │   └── database.ts       # Instancia de Sequelize
    │   ├── db/models/
    │   │   ├── Paciente.ts       # Modelo Sequelize
    │   │   └── index.ts
    │   ├── modules/pacientes/
    │   │   ├── paciente.routes.ts
    │   │   ├── paciente.controller.ts
    │   │   ├── paciente.service.ts   # Reglas de negocio + acceso a datos
    │   │   ├── paciente.validator.ts # Validación del backend
    │   │   └── paciente.types.ts
    │   ├── middlewares/
    │   │   ├── errorHandler.ts
    │   │   └── notFound.ts
    │   └── utils/
    │       ├── httpError.ts
    │       └── password.ts       # Hash/compare con bcrypt
    ├── migrations/
    │   └── 20260828000000-create-pacientes.js
    ├── config/config.js          # Config de sequelize-cli
    ├── .sequelizerc
    └── .env.example
```

Separación de responsabilidades:

- **Frontend**: solo UI, validación de experiencia de usuario y llamado a
  la API (`lib/services/patientService.ts`). No accede a la base de datos.
- **Backend**: valida de nuevo todo el payload, aplica las reglas de
  negocio (unicidad de DNI/email, hash de contraseña) y es el único que
  habla con PostgreSQL.
- **Base de datos**: PostgreSQL con restricciones `UNIQUE` reales sobre
  `dni` y `email`, gestionada con migraciones de Sequelize (no hay SQL
  suelto fuera del proyecto).

## 12. Respuestas de la API

`POST /api/pacientes/registro`

| Caso                     | Status | Cuerpo                                                        |
| ------------------------- | ------ | -------------------------------------------------------------- |
| Registro exitoso          | 201    | `{ message, paciente }` (sin password)                         |
| Datos inválidos           | 400    | `{ message, errors: { campo: mensaje, ... } }`                 |
| DNI ya registrado         | 409    | `{ message: "Este DNI ya se encuentra registrado.", errors }`  |
| Email ya registrado       | 409    | `{ message: "Este correo ya se encuentra registrado.", errors }` |
| Error interno             | 500    | `{ message: "Ocurrió un error interno. Intente nuevamente más tarde." }` |

## 13. Qué queda preparado para las próximas historias de usuario

- Estructura modular en el backend (`src/modules/<entidad>/routes|controller|service|validator`)
  lista para agregar nuevos módulos (por ejemplo `turnos`, `medicos`) sin
  tocar el de pacientes.
- `createApp()` centraliza CORS, parseo de JSON y manejo de errores, así
  que agregar un router nuevo es una línea en `app.ts`.
- El modelo `Paciente` y su migración quedan listos para ser referenciados
  (FK) desde futuras entidades como `Turno`.
- Componentes de formulario (`FormField`, `PasswordRequirements`,
  `EmailField`) son genéricos y reutilizables para futuras pantallas
  (login, edición de perfil, etc.).
- `patientService.ts` establece el patrón para futuros servicios HTTP del
  frontend (manejo de errores tipado, `NEXT_PUBLIC_API_URL`).

## 14. Dependencias nuevas instaladas

**Backend** (proyecto nuevo, `backend/package.json`):

- `express`, `cors` — servidor HTTP y CORS.
- `sequelize`, `pg`, `pg-hstore` — ORM y driver de PostgreSQL.
- `bcrypt` — hash de contraseñas.
- `dotenv` — carga de variables de entorno.
- Dev: `typescript`, `ts-node-dev`, `sequelize-cli`, `@types/*`.

**Frontend**: no se agregaron dependencias nuevas (se usa `fetch` nativo).

## 15. Decisiones técnicas importantes

- Se creó un **backend Express separado** (`/backend`) en vez de usar Route
  Handlers de Next.js, porque el proyecto no tenía backend ni base de
  datos configurados y la consigna pide explícitamente Node.js + Express +
  PostgreSQL + Sequelize en ese caso, sin modificar el frontend Next.js
  existente.
- Las contraseñas se hashean con **bcrypt** (nunca se guardan ni se
  devuelven en texto plano).
- La verificación de DNI/email duplicados se hace primero con una consulta
  (`findOne`) y además está protegida por restricciones `UNIQUE` reales en
  PostgreSQL (creadas por migración), por si dos registros llegan casi al
  mismo tiempo.
- Las validaciones de formato (nombre, DNI, email, teléfono, contraseña)
  están duplicadas a propósito en frontend (`lib/validation/patient.ts`,
  para UX instantánea) y backend (`paciente.validator.ts`, obligatoria por
  seguridad) — el backend nunca confía en el frontend.
- Next.js 16 usa Route Handlers para APIs propias, pero como se decidió un
  backend Express independiente, no se tocó la carpeta `app/` para
  agregar rutas de API.

---

Generado originalmente con `create-next-app`. Para más información de
Next.js, ver la documentación oficial en `node_modules/next/dist/docs/`
(esta versión de Next.js incluye su propia documentación local).
