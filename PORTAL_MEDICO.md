# Portal del Médico — MediTurnos

Todo el código de abajo está **probado**: las migraciones, el seeder y los endpoints corrieron contra un PostgreSQL real, las pantallas se recorrieron en un navegador (login → dashboard → marcar atendido → pacientes → perfil → salir), `tsc` y `eslint` dan 0 errores y siguen pasando los tests existentes (19 de backend, 21 de frontend).

## Novedades de esta versión

1. **Login único.** El médico ya no tiene un login aparte: entra por la pantalla de siempre (`http://localhost:3000`) con su correo y contraseña, y el sistema lo lleva a `/medico/inicio`; el paciente sigue yendo a `/turnos/nuevo`. `POST /api/auth/login` devuelve ahora `rol` (`"paciente"` o `"medico"`). Se eliminó `POST /api/auth/medico/login` y `/medico/login` solo redirige al login. Se mantienen los mensajes de HU-02 (404 «El usuario no se encuentra registrado.», 401 «Correo electrónico o contraseña incorrectos.»).
2. **Inicio con filtro de fechas.** Flechas ← →, calendario y botón **Hoy**. `GET /api/medicos/dashboard?fecha=YYYY-MM-DD` (sin `fecha` = hoy; fecha inválida = 400). En **días anteriores** se consulta la agenda y se puede marcar atendido/pendiente (no reprogramar). En **días próximos** se puede **reprogramar** y dejar pendiente (no marcar atendido: el turno todavía no ocurrió). Hoy tiene todas las acciones.
3. **Perfil editable.** Botón *Editar días y horario*: el médico cambia **días de atención** (máx. 150 caracteres) y **horario y detalle** (máx. 255). `PATCH /api/medicos/perfil`. Nombre, correo, teléfono y matrícula siguen siendo de solo lectura (los gestiona un Administrativo). El consultorio que ven los pacientes sale del texto «Consultorio N° X» dentro del detalle.
4. **Pruebas:** 16 tests de integración nuevos en `backend/tests/integration/medico.api.test.ts` (login único, dashboard por fecha, perfil y reprogramación). No hay migraciones nuevas respecto de la versión anterior.

## Reprogramar turnos desde el Inicio turnos desde el Inicio

En cada turno de la agenda de hoy hay un botón **Reprogramar** (no aparece en turnos atendidos ni cancelados). Abre un modal para elegir nueva fecha y uno de los horarios libres del médico, y al confirmar el turno se mueve y la agenda se recarga.

- Endpoint nuevo: `PUT /api/turnos/:id/reprogramar-medico` con `{ "fecha": "YYYY-MM-DD", "hora": "HH:MM" }` (solo con token de médico).
- Reglas: el turno tiene que ser del médico (si no, 404); solo se reprograman turnos `confirmado` o `pendiente` (409 si es cancelado/atendido); no se acepta fecha pasada, hora fuera de la grilla, un horario de hoy que ya pasó, ni el mismo día y hora actuales (400); si el horario lo ocupa otro turno vigente, 409. **No rige la regla de 24 h** del paciente: es el médico quien reorganiza su agenda. El turno conserva su estado.
- Archivos de esta actualización: **nuevos** `backend/src/modules/turnos/turno.reprogramarMedico.ts` y `components/medico/ModalReprogramarMedico.tsx`; **reemplazar** `backend/src/modules/turnos/turno.routes.ts`, `lib/services/medicoService.ts` y `app/medico/inicio/page.tsx`. No hay migraciones nuevas.

## Credenciales de prueba

| Campo | Valor |
|---|---|
| Email | `roman.lopez@mediturnos.com` |
| Contraseña | `Medico123` |
| Pantalla de login | `http://localhost:3000` (el mismo login que el paciente) |

## Pasos exactos (en este orden)

**1. Copiar los archivos.** Podés usar el `.zip` que acompaña a este documento (mantiene las rutas: descomprimilo sobre la raíz del proyecto y aceptá reemplazar) o copiar cada archivo de abajo a su ruta. Las secciones están en el orden recomendado; cada archivo indica si es **NUEVO** o **REEMPLAZAR**.

**2. Aplicar migraciones** (desde `backend/`):

```bash
cd backend
npm run db:migrate
```

Aplica 3 migraciones: columnas del médico en `profesionales`, `obra_social` en `pacientes` y el nuevo CHECK de `estado` en `turnos`.

**3. Cargar el médico de prueba** (desde `backend/`). Ojo: **no uses `npm run db:seed`** (`seed:all`), porque vuelve a correr el seeder inicial de HU-03, que no es idempotente y falla por especialidades duplicadas. Corré solo el nuevo:

```bash
npx sequelize-cli db:seed --seed 20261101000000-demo-medico-roman-lopez.js
```

Es idempotente: si lo corrés de nuevo, actualiza al médico en vez de duplicarlo. Si tu base está vacía (nunca corriste el seeder de HU-03), corré antes `npx sequelize-cli db:seed --seed 20260830000000-demo-especialidades-profesionales.js`.

**4. Levantar todo:**

```bash
# terminal 1 (backend, puerto 4000)
cd backend && npm run dev

# terminal 2 (frontend, puerto 3000) — desde la raíz
npm run dev
```

No hace falta ninguna variable de entorno nueva.

**5. Probarlo.** Entrá a `http://localhost:3000` con las credenciales de arriba (te lleva solo a la vista del médico). Para ver datos en el dashboard necesitás un turno **de hoy** con el Dr. Román López (aparece en *Clínica Médica* al pedir un turno como paciente). Si el formulario de paciente no te deja elegir la fecha de hoy, insertalo directo (reemplazá el id del paciente si querés otro):

```sql
INSERT INTO turnos (paciente_id, especialidad_id, profesional_id, fecha, hora, estado, created_at, updated_at)
SELECT p.id, pr.especialidad_id, pr.id, CURRENT_DATE, '09:00', 'confirmado', NOW(), NOW()
FROM pacientes p, profesionales pr
WHERE pr.email = 'roman.lopez@mediturnos.com'
ORDER BY p.id LIMIT 1;

-- opcional: que el paciente tenga obra social
UPDATE pacientes SET obra_social = 'OSDE 210' WHERE id = (SELECT MIN(id) FROM pacientes);
```

**Deshacer** (si hace falta): `npx sequelize-cli db:seed:undo --seed 20261101000000-demo-medico-roman-lopez.js` y luego `npx sequelize-cli db:migrate:undo` tres veces.

## Decisiones que tomé (revisalas)

- **No hay registro de médicos**: ni endpoint público ni pantalla. Entran por el login común; un profesional sin credenciales cargadas se trata como «usuario no registrado».
- **Tokens separados**: el JWT del médico lleva `role: "medico"` y `profesionalId`; `requireDoctorAuth` rechaza tokens de paciente y `requireAuth` rechaza tokens de médico. En el frontend, la sesión del médico usa otra clave de `localStorage` (`mediturnos_medico_session`), así no se pisa con la del paciente.
- **`GET /api/medicos/pacientes`** lista pacientes con al menos un turno en estado **atendido**. Por eso aparece vacío hasta que el médico marque el primero. Devuelve además `totalVisitas`.
- **Dashboard**: `turnosHoy` cuenta todos los turnos del día (cualquier estado), y agregué `atendidos` a las métricas para que los números cierren. "Hoy" se calcula con hora de Argentina (UTC-3), igual que el resto del backend.
- **`PATCH /api/turnos/:id/estado`**: solo acepta `atendido` / `pendiente`; el turno tiene que ser del médico (si no, 404); un turno cancelado no se puede tocar (409) y no se puede marcar *atendido* un turno de fecha futura (400).
- **Cambios mínimos en el lado paciente** (necesarios para que los estados nuevos no rompan nada): `pendiente` se trata como turno vigente (se muestra en "Próximos" y se puede reprogramar/cancelar), un turno `atendido` ya no se puede cancelar, y al reprogramar el chequeo de horario ocupado ahora ignora solo los cancelados. Sin esto, un turno "pendiente" caería en un error 500 por el índice único o mostraría una etiqueta vacía.
- **Las vistas `app/medico/*` no existían en el zip**, así que las creé desde cero (no había datos mockeados que reemplazar).
- **`obra_social`** no se pide en el registro de pacientes (HU-01), así que queda `NULL` y la pantalla muestra "Sin obra social". Cuando quieras cargarla, es agregar el campo al formulario y al `Paciente.create`.
- No agregué tests nuevos; si querés, el siguiente paso natural es cubrir `loginMedico` y `PATCH /estado` en `backend/tests`.


---

# CÓDIGO — BACKEND

## 1. Migraciones (nuevas)

### `backend/migrations/20261101000000-add-medico-fields-to-profesionales.js` — NUEVO

```javascript
"use strict";

/**
 * Portal del Médico — datos de acceso y perfil profesional.
 *
 * Agrega a `profesionales`:
 *   - email:         único. Es el usuario con el que el médico inicia sesión.
 *   - password:      hash bcrypt (nunca texto plano).
 *   - matricula:     matrícula profesional.
 *   - telefono:      teléfono de contacto.
 *   - dias_atencion: días de atención en texto libre (ej: "Lunes a Viernes").
 *
 * Todas son NULLABLE a propósito: los profesionales que ya existen (seeder
 * de HU-03) no tienen credenciales hasta que un Administrativo les dé de
 * alta. PostgreSQL permite varios NULL en una columna UNIQUE, así que no
 * hay conflicto entre ellos.
 *
 * @type {import('sequelize-cli').Migration}
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.addColumn(
        "profesionales",
        "email",
        { type: Sequelize.STRING(255), allowNull: true },
        { transaction }
      );
      await queryInterface.addColumn(
        "profesionales",
        "password",
        { type: Sequelize.STRING(255), allowNull: true },
        { transaction }
      );
      await queryInterface.addColumn(
        "profesionales",
        "matricula",
        { type: Sequelize.STRING(30), allowNull: true },
        { transaction }
      );
      await queryInterface.addColumn(
        "profesionales",
        "telefono",
        { type: Sequelize.STRING(20), allowNull: true },
        { transaction }
      );
      await queryInterface.addColumn(
        "profesionales",
        "dias_atencion",
        { type: Sequelize.STRING(150), allowNull: true },
        { transaction }
      );

      await queryInterface.addConstraint("profesionales", {
        fields: ["email"],
        type: "unique",
        name: "profesionales_email_unique",
        transaction,
      });

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.removeConstraint(
        "profesionales",
        "profesionales_email_unique",
        { transaction }
      );
      for (const columna of [
        "dias_atencion",
        "telefono",
        "matricula",
        "password",
        "email",
      ]) {
        await queryInterface.removeColumn("profesionales", columna, {
          transaction,
        });
      }
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};
```

### `backend/migrations/20261101000001-add-obra-social-to-pacientes.js` — NUEVO

```javascript
"use strict";

/**
 * Portal del Médico — agrega `obra_social` a `pacientes`.
 *
 * Es NULLABLE: el formulario de registro actual (HU-01) no la pide, así que
 * los pacientes existentes y los nuevos quedan en NULL hasta que se cargue.
 * La pantalla "Mis pacientes" del médico muestra "Sin obra social" en ese caso.
 *
 * @type {import('sequelize-cli').Migration}
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("pacientes", "obra_social", {
      type: Sequelize.STRING(100),
      allowNull: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("pacientes", "obra_social");
  },
};
```

### `backend/migrations/20261101000002-extend-estado-turnos-check.js` — NUEVO

```javascript
"use strict";

/**
 * Portal del Médico — amplía los estados posibles de un turno.
 *
 * La restricción `turnos_estado_check` (migración 20261012000000) aceptaba
 * solo 'confirmado' y 'cancelado'. Ahora acepta además:
 *   - 'atendido':  el médico ya atendió al paciente.
 *   - 'pendiente': el médico lo dejó (o lo devolvió) a la espera de atención.
 *
 * El índice único parcial (profesional_id, fecha, hora) WHERE estado <>
 * 'cancelado' no cambia: 'atendido' y 'pendiente' siguen ocupando el horario.
 *
 * @type {import('sequelize-cli').Migration}
 */
module.exports = {
  async up(queryInterface) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.removeConstraint("turnos", "turnos_estado_check", {
        transaction,
      });
      await queryInterface.addConstraint("turnos", {
        fields: ["estado"],
        type: "check",
        where: {
          estado: ["confirmado", "cancelado", "atendido", "pendiente"],
        },
        name: "turnos_estado_check",
        transaction,
      });
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      // Antes de volver a la restricción original hay que migrar los datos
      // que ya no serían válidos.
      await queryInterface.sequelize.query(
        `UPDATE turnos SET estado = 'confirmado' WHERE estado IN ('atendido', 'pendiente');`,
        { transaction }
      );
      await queryInterface.removeConstraint("turnos", "turnos_estado_check", {
        transaction,
      });
      await queryInterface.addConstraint("turnos", {
        fields: ["estado"],
        type: "check",
        where: { estado: ["confirmado", "cancelado"] },
        name: "turnos_estado_check",
        transaction,
      });
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};
```

## 2. Seeder del médico de prueba (nuevo)

### `backend/seeders/20261101000000-demo-medico-roman-lopez.js` — NUEVO

```javascript
"use strict";

const bcrypt = require("bcrypt");

/**
 * Médico de prueba para el Portal del Médico.
 *
 *   Email:      roman.lopez@mediturnos.com
 *   Contraseña: Medico123
 *
 * Es idempotente: si el médico ya existe (por email o por nombre) lo
 * ACTUALIZA con todos sus datos; si no existe lo INSERTA. También crea la
 * especialidad "Clínica Médica" si todavía no está.
 *
 * Correrlo solo a él (el seeder inicial de HU-03 no es idempotente):
 *   npx sequelize-cli db:seed --seed 20261101000000-demo-medico-roman-lopez.js
 *
 * IMPORTANTE: solo para desarrollo. En un entorno real las credenciales las
 * da de alta un Administrativo.
 */

const MEDICO = {
  nombre: "Dr. Román López",
  email: "roman.lopez@mediturnos.com",
  password: "Medico123",
  matricula: "MP 28451",
  telefono: "3564 412345",
  diasAtencion: "Lunes a Viernes",
  info: "Atiende lunes a viernes de 8 a 14 hs. Consultorio N° 11.",
  especialidad: "Clínica Médica",
};

/** @type {import('sequelize-cli').Seeder} */
module.exports = {
  async up(queryInterface) {
    const { sequelize } = queryInterface;
    const now = new Date();
    const rounds = Number(process.env.BCRYPT_SALT_ROUNDS || 10);
    const passwordHash = await bcrypt.hash(MEDICO.password, rounds);

    const transaction = await sequelize.transaction();
    try {
      // 1) Especialidad (la crea si no existe).
      await sequelize.query(
        `INSERT INTO especialidades (nombre, created_at, updated_at)
         VALUES (:nombre, :now, :now)
         ON CONFLICT (nombre) DO NOTHING;`,
        { replacements: { nombre: MEDICO.especialidad, now }, transaction }
      );
      const [[especialidad]] = await sequelize.query(
        `SELECT id FROM especialidades WHERE nombre = :nombre;`,
        { replacements: { nombre: MEDICO.especialidad }, transaction }
      );

      // 2) Médico: actualiza si ya existe, inserta si no.
      const [existentes] = await sequelize.query(
        `SELECT id FROM profesionales
          WHERE email = :email OR nombre = :nombre
          ORDER BY (email = :email) DESC, id ASC
          LIMIT 1;`,
        {
          replacements: { email: MEDICO.email, nombre: MEDICO.nombre },
          transaction,
        }
      );

      const datos = {
        nombre: MEDICO.nombre,
        email: MEDICO.email,
        password: passwordHash,
        matricula: MEDICO.matricula,
        telefono: MEDICO.telefono,
        diasAtencion: MEDICO.diasAtencion,
        info: MEDICO.info,
        especialidadId: especialidad.id,
        now,
      };

      if (existentes.length > 0) {
        await sequelize.query(
          `UPDATE profesionales
              SET nombre = :nombre, email = :email, password = :password,
                  matricula = :matricula, telefono = :telefono,
                  dias_atencion = :diasAtencion, info = :info,
                  especialidad_id = :especialidadId, updated_at = :now
            WHERE id = :id;`,
          { replacements: { ...datos, id: existentes[0].id }, transaction }
        );
      } else {
        await sequelize.query(
          `INSERT INTO profesionales
             (nombre, email, password, matricula, telefono, dias_atencion,
              info, especialidad_id, created_at, updated_at)
           VALUES
             (:nombre, :email, :password, :matricula, :telefono, :diasAtencion,
              :info, :especialidadId, :now, :now);`,
          { replacements: datos, transaction }
        );
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface) {
    const { sequelize } = queryInterface;

    // Si el médico ya tiene turnos no se puede borrar (FK RESTRICT): en ese
    // caso solo se le quitan las credenciales para que no pueda iniciar sesión.
    const [filas] = await sequelize.query(
      `SELECT p.id, (SELECT COUNT(*) FROM turnos t WHERE t.profesional_id = p.id)::int AS turnos
         FROM profesionales p WHERE p.email = :email;`,
      { replacements: { email: MEDICO.email } }
    );
    const fila = filas[0];

    if (!fila) return;

    if (fila.turnos > 0) {
      await sequelize.query(
        `UPDATE profesionales SET email = NULL, password = NULL WHERE id = :id;`,
        { replacements: { id: fila.id } }
      );
    } else {
      await sequelize.query(`DELETE FROM profesionales WHERE id = :id;`, {
        replacements: { id: fila.id },
      });
    }
  },
};
```

## 3. Modelos (reemplazar)

### `backend/src/db/models/Profesional.ts` — REEMPLAZAR

```typescript
import {
  DataTypes,
  Model,
  type CreationOptional,
  type ForeignKey,
  type InferAttributes,
  type InferCreationAttributes,
  type NonAttribute,
} from "sequelize";
import { sequelize } from "../../config/database";
import { Especialidad } from "./Especialidad";

/**
 * Modelo Profesional (HU-03, subtarea "listado de médicos").
 * `info` guarda el texto libre de días/horario de atención y consultorio
 * (ej: "Atiende lunes y miércoles de 10 a 14 hs. Consultorio N° 7.").
 *
 * Portal del Médico: `email` (UNIQUE) + `password` (hash bcrypt) son las
 * credenciales con las que el médico inicia sesión. Son NULLABLE porque los
 * profesionales que no tienen acceso al portal no las tienen; el alta de
 * credenciales la hará un Administrativo. Nunca se expone `password`.
 */
export class Profesional extends Model<
  InferAttributes<Profesional>,
  InferCreationAttributes<Profesional>
> {
  declare id: CreationOptional<number>;
  declare nombre: string;
  declare info: string;
  declare especialidadId: ForeignKey<Especialidad["id"]>;
  declare email: CreationOptional<string | null>;
  declare password: CreationOptional<string | null>;
  declare matricula: CreationOptional<string | null>;
  declare telefono: CreationOptional<string | null>;
  declare diasAtencion: CreationOptional<string | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  // Asociación cargada con `include` (ver db/models/index.ts).
  declare Especialidad?: NonAttribute<Especialidad>;
}

Profesional.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    nombre: {
      type: DataTypes.STRING(150),
      allowNull: false,
    },
    info: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    especialidadId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "especialidad_id",
      references: {
        model: "especialidades",
        key: "id",
      },
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: true,
      unique: true,
    },
    password: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    matricula: {
      type: DataTypes.STRING(30),
      allowNull: true,
    },
    telefono: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    diasAtencion: {
      type: DataTypes.STRING(150),
      allowNull: true,
      field: "dias_atencion",
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: "created_at",
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: "updated_at",
    },
  },
  {
    sequelize,
    modelName: "Profesional",
    tableName: "profesionales",
    timestamps: true,
  }
);
```

### `backend/src/db/models/Paciente.ts` — REEMPLAZAR

```typescript
import {
  DataTypes,
  Model,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
} from "sequelize";
import { sequelize } from "../../config/database";

/**
 * Modelo Paciente (HU-01).
 *
 * Restricciones a nivel de base de datos (no solo en la app):
 * - dni: UNIQUE
 * - email: UNIQUE
 * La contraseña se guarda siempre hasheada (ver src/utils/password.ts);
 * este modelo nunca debe recibir ni exponer la contraseña en texto plano.
 */
export class Paciente extends Model<
  InferAttributes<Paciente>,
  InferCreationAttributes<Paciente>
> {
  declare id: CreationOptional<number>;
  declare nombre: string;
  declare apellido: string;
  declare dni: string;
  declare fechaNacimiento: string;
  declare email: string;
  declare telefono: string;
  declare password: string;
  declare obraSocial: CreationOptional<string | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

Paciente.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    nombre: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    apellido: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    dni: {
      type: DataTypes.STRING(8),
      allowNull: false,
      unique: true,
    },
    fechaNacimiento: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      field: "fecha_nacimiento",
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
    },
    telefono: {
      type: DataTypes.STRING(20),
      allowNull: false,
    },
    password: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    obraSocial: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: "obra_social",
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: "created_at",
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: "updated_at",
    },
  },
  {
    sequelize,
    modelName: "Paciente",
    tableName: "pacientes",
    timestamps: true,
  }
);
```

### `backend/src/db/models/Turno.ts` — REEMPLAZAR

```typescript
import {
  DataTypes,
  Model,
  type CreationOptional,
  type ForeignKey,
  type InferAttributes,
  type InferCreationAttributes,
  type NonAttribute,
} from "sequelize";
import { sequelize } from "../../config/database";
import { Especialidad } from "./Especialidad";
import { Profesional } from "./Profesional";
import { Paciente } from "./Paciente";
import {
  ESTADOS_TURNO,
  type EstadoTurno,
} from "../../modules/turnos/turno.constants";

/**
 * Modelo Turno (HU-03).
 *
 * `pacienteId` es NULLABLE a propósito: todavía no existe sesión/login
 * real (HU-02 sigue sin backend de autenticación), así que por ahora no
 * hay forma de saber qué paciente está pidiendo el turno. El campo ya
 * apunta con FK real a `pacientes` para no tener que migrar la tabla
 * de nuevo el día que exista el login: ahí simplemente se empieza a
 * completar.
 *
 * El índice único parcial (profesional_id, fecha, hora) WHERE estado <>
 * 'cancelado' -ver migración 20261012000000-add-estado-to-turnos- es lo
 * que garantiza a nivel de base de datos que no se pueda reservar un
 * horario ocupado ni duplicar un turno vigente en el mismo horario.
 *
 * `estado` (HU-04 / HU-05): "confirmado" por defecto, "cancelado" cuando
 * el paciente lo cancela. Portal del Médico: el médico lo puede pasar a
 * "atendido" o dejarlo "pendiente" (ver turno.constants.ts).
 */
export class Turno extends Model<
  InferAttributes<Turno>,
  InferCreationAttributes<Turno>
> {
  declare id: CreationOptional<number>;
  declare pacienteId: ForeignKey<Paciente["id"]> | null;
  declare especialidadId: ForeignKey<Especialidad["id"]>;
  declare profesionalId: ForeignKey<Profesional["id"]>;
  declare fecha: string;
  declare hora: string;
  declare estado: CreationOptional<EstadoTurno>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  // Asociaciones cargadas con `include` (ver db/models/index.ts). Solo
  // existen cuando la consulta las pide, por ejemplo en "Mis turnos".
  declare Especialidad?: NonAttribute<Especialidad>;
  declare Profesional?: NonAttribute<Profesional>;
  declare Paciente?: NonAttribute<Paciente>;
}

Turno.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    pacienteId: {
      type: DataTypes.INTEGER,
      allowNull: true, // TODO: pasar a obligatorio cuando exista sesión real (HU-02).
      field: "paciente_id",
      references: {
        model: "pacientes",
        key: "id",
      },
    },
    especialidadId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "especialidad_id",
      references: {
        model: "especialidades",
        key: "id",
      },
    },
    profesionalId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "profesional_id",
      references: {
        model: "profesionales",
        key: "id",
      },
    },
    fecha: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    hora: {
      type: DataTypes.STRING(5), // formato "HH:MM"
      allowNull: false,
    },
    estado: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "confirmado",
      validate: {
        isIn: [ESTADOS_TURNO as unknown as string[]],
      },
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: "created_at",
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: "updated_at",
    },
  },
  {
    sequelize,
    modelName: "Turno",
    tableName: "turnos",
    timestamps: true,
  }
);
```

## 4. Constantes de estado (reemplazar)

### `backend/src/modules/turnos/turno.constants.ts` — REEMPLAZAR

```typescript
/**
 * Horarios posibles por día. Centralizado acá porque es el backend el
 * que decide la disponibilidad real (ver TODO histórico: antes esto
 * vivía como MOCK en el frontend).
 *
 * TODO: si en el futuro cada profesional tiene una grilla horaria propia
 * (en vez de una única lista fija para todos), esto se reemplaza por una
 * tabla "Agenda" por profesional. Por ahora, siguiendo el alcance
 * definido en la consigna de HU-03, alcanza con esta lista fija.
 */
export const HORARIOS_POSIBLES = [
  "08:00",
  "09:00",
  "09:30",
  "10:00",
  "10:30",
  "11:00",
  "11:30",
  "14:00",
  "14:30",
  "15:00",
  "16:00",
  "16:30",
];

/**
 * Estados posibles de un turno (HU-04 los muestra, HU-05 cancela, el
 * Portal del Médico marca "atendido"/"pendiente").
 * Deben coincidir con el CHECK de la migración
 * 20261101000002-extend-estado-turnos-check.
 */
export const ESTADOS_TURNO = [
  "confirmado",
  "cancelado",
  "atendido",
  "pendiente",
] as const;

export type EstadoTurno = (typeof ESTADOS_TURNO)[number];

/** Estados que el médico puede asignar con PATCH /api/turnos/:id/estado. */
export const ESTADOS_ASIGNABLES_POR_MEDICO = ["atendido", "pendiente"] as const;

export type EstadoAsignablePorMedico =
  (typeof ESTADOS_ASIGNABLES_POR_MEDICO)[number];

/**
 * Estados de un turno que todavía puede gestionar el paciente (cancelar o
 * reprogramar): no está cancelado ni ya atendido.
 */
export const ESTADOS_VIGENTES: readonly EstadoTurno[] = [
  "confirmado",
  "pendiente",
];


/** Estado de un turno cancelado (HU-05). */
export const ESTADO_CANCELADO: EstadoTurno = "cancelado";

/** Estado de un turno ya atendido por el médico. */
export const ESTADO_ATENDIDO: EstadoTurno = "atendido";
```

## 5. Utilidades y tipos de Express

### `backend/src/utils/jwt.ts` — REEMPLAZAR

```typescript
import jwt, { type SignOptions } from "jsonwebtoken";
import { env } from "../config/env";

export interface SessionTokenPayload {
  pacienteId: number;
  email: string;
}

/**
 * Payload del JWT del médico. Es distinto al del paciente (tiene
 * `profesionalId` y `role`) para que un token de un tipo de usuario no
 * sirva en las rutas del otro.
 */
export interface DoctorTokenPayload {
  profesionalId: number;
  email: string;
  role: "medico";
}

/**
 * Genera el JWT que se entrega al loguearse. Es lo único que identifica
 * al paciente en los pedidos siguientes (por ejemplo, al solicitar un
 * turno en HU-03).
 */
export function signSessionToken(payload: SessionTokenPayload): string {
  return jwt.sign(payload, env.jwt.secret, {
    // El tipo de jsonwebtoken exige un formato tipo "8h" / "30m"; viene de .env.
    expiresIn: env.jwt.expiresIn as SignOptions["expiresIn"],
  });
}

/**
 * Verifica y decodifica el JWT recibido en el header Authorization.
 * Lanza si el token es inválido o expiró (lo captura el middleware).
 */
export function verifySessionToken(token: string): SessionTokenPayload {
  return jwt.verify(token, env.jwt.secret) as SessionTokenPayload;
}

/** JWT del médico (Portal del Médico). */
export function signDoctorToken(
  payload: Omit<DoctorTokenPayload, "role">
): string {
  return jwt.sign({ ...payload, role: "medico" }, env.jwt.secret, {
    expiresIn: env.jwt.expiresIn as SignOptions["expiresIn"],
  });
}

/**
 * Verifica el JWT de un médico. Lanza si el token es inválido, expiró o no
 * es un token de médico (por ejemplo, uno de paciente).
 */
export function verifyDoctorToken(token: string): DoctorTokenPayload {
  const payload = jwt.verify(token, env.jwt.secret) as Partial<DoctorTokenPayload>;
  if (payload.role !== "medico" || typeof payload.profesionalId !== "number") {
    throw new Error("Token de médico inválido.");
  }
  return payload as DoctorTokenPayload;
}
```

### `backend/src/utils/fecha.ts` — NUEVO

```typescript
/**
 * Fecha de hoy en formato YYYY-MM-DD según la hora de Argentina (UTC-3),
 * no la del servidor (que suele estar en UTC). Misma convención que
 * turno.validator.ts y turno.cancelar.ts.
 */
export function hoyArgentina(): string {
  return new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString().slice(0, 10);
}
```

### `backend/src/types/express/index.d.ts` — REEMPLAZAR

```typescript
// Extiende el Request de Express para que los controladores puedan leer
// `req.pacienteId`, que carga el middleware requireAuth (ver
// src/middlewares/requireAuth.ts) después de validar el JWT, y
// `req.profesionalId`, que carga requireDoctorAuth (Portal del Médico).
import "express";

declare global {
  namespace Express {
    interface Request {
      pacienteId?: number;
      profesionalId?: number;
    }
  }
}

export {};
```

## 6. Middlewares

### `backend/src/middlewares/requireDoctorAuth.ts` — NUEVO

```typescript
import type { NextFunction, Request, Response } from "express";
import { verifyDoctorToken } from "../utils/jwt";
import { HttpError } from "../utils/httpError";

/**
 * Middleware de autenticación del Portal del Médico.
 *
 * Lee el JWT del header `Authorization: Bearer <token>`, comprueba que sea
 * un token de MÉDICO (un token de paciente se rechaza) y deja el id del
 * profesional en `req.profesionalId`. Nunca se confía en un id que venga en
 * el body o en la URL.
 */
export function requireDoctorAuth(
  req: Request,
  _res: Response,
  next: NextFunction
) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    return next(HttpError.unauthorized("Debe iniciar sesión para continuar."));
  }

  const token = header.slice("Bearer ".length).trim();

  try {
    const payload = verifyDoctorToken(token);
    req.profesionalId = payload.profesionalId;
    next();
  } catch {
    next(
      HttpError.unauthorized(
        "La sesión expiró o no es válida. Inicie sesión nuevamente."
      )
    );
  }
}
```

### `backend/src/middlewares/requireAuth.ts` — REEMPLAZAR

```typescript
import type { NextFunction, Request, Response } from "express";
import { verifySessionToken } from "../utils/jwt";
import { HttpError } from "../utils/httpError";

/**
 * Middleware de autenticación (HU-02 + HU-03).
 *
 * Lee el JWT del header `Authorization: Bearer <token>`, lo valida y, si
 * es correcto, deja el id del paciente en `req.pacienteId` para que el
 * controlador lo use (por ejemplo, al crear un turno). No confía en
 * ningún dato de identidad que venga en el body de la request.
 */
export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    return next(HttpError.unauthorized("Debe iniciar sesión para continuar."));
  }

  const token = header.slice("Bearer ".length).trim();

  try {
    const payload = verifySessionToken(token);
    // Un token de médico no trae pacienteId: no debe servir acá.
    if (typeof payload.pacienteId !== "number") {
      throw new Error("Token sin pacienteId.");
    }
    req.pacienteId = payload.pacienteId;
    next();
  } catch {
    next(HttpError.unauthorized("La sesión expiró o no es válida. Inicie sesión nuevamente."));
  }
}
```

## 7. Login del médico (módulo auth)

### `backend/src/modules/auth/auth.types.ts` — REEMPLAZAR

```typescript
import type { PublicPatient } from "../pacientes/paciente.types";

export interface LoginInput {
  email: string;
  password: string;
}

export type LoginField = keyof LoginInput;

export type LoginErrors = Partial<Record<LoginField, string>>;

/** Datos públicos del médico que devuelve el login (nunca la contraseña). */
export interface PublicDoctor {
  id: number;
  nombre: string;
  email: string;
  especialidad: string;
}

/** Resultado del login único: según el rol, trae al paciente o al médico. */
export type LoginResult =
  | { rol: "paciente"; paciente: PublicPatient; token: string }
  | { rol: "medico"; medico: PublicDoctor; token: string };
```

### `backend/src/modules/auth/auth.service.ts` — REEMPLAZAR

```typescript
import { Especialidad, Paciente, Profesional } from "../../db/models";
import { comparePassword } from "../../utils/password";
import { HttpError } from "../../utils/httpError";
import { signDoctorToken, signSessionToken } from "../../utils/jwt";
import type { LoginInput, LoginResult } from "./auth.types";
import type { PublicPatient } from "../pacientes/paciente.types";

function toPublicPatient(paciente: Paciente): PublicPatient {
  return {
    id: paciente.id,
    nombre: paciente.nombre,
    apellido: paciente.apellido,
    dni: paciente.dni,
    fechaNacimiento: paciente.fechaNacimiento,
    email: paciente.email,
    telefono: paciente.telefono,
    createdAt: paciente.createdAt.toISOString(),
  };
}

export const MENSAJE_USUARIO_NO_REGISTRADO =
  "El usuario no se encuentra registrado.";
export const MENSAJE_CREDENCIALES_INCORRECTAS =
  "Correo electrónico o contraseña incorrectos.";

/**
 * Inicio de sesión ÚNICO para pacientes y médicos (HU-02 + Portal del Médico).
 *
 * Con el mismo correo y contraseña entra cualquiera de los dos; la respuesta
 * trae `rol` ("paciente" o "medico") para que el frontend sepa a qué vista
 * llevarlo. Los médicos no se registran solos (los da de alta un
 * Administrativo), así que solo se buscan por las credenciales ya cargadas.
 *
 * Criterios de HU-02, que se mantienen:
 * - Correo que no existe ni como paciente ni como médico -> 404
 *   "El usuario no se encuentra registrado."
 * - Correo existente con contraseña incorrecta -> 401
 *   "Correo electrónico o contraseña incorrectos."
 * - Credenciales correctas -> datos públicos (nunca la contraseña) + JWT.
 *   El JWT es de paciente o de médico según el rol, y cada uno solo sirve en
 *   sus propias rutas.
 */
export async function login(input: LoginInput): Promise<LoginResult> {
  const email = input.email.toLowerCase();

  const paciente = await Paciente.findOne({ where: { email } });

  if (paciente && (await comparePassword(input.password, paciente.password))) {
    const token = signSessionToken({
      pacienteId: paciente.id,
      email: paciente.email,
    });
    return { rol: "paciente", paciente: toPublicPatient(paciente), token };
  }

  const profesional = await Profesional.findOne({
    where: { email },
    include: [{ model: Especialidad, attributes: ["id", "nombre"] }],
  });

  // Un profesional sin credenciales cargadas (email/password NULL) no puede
  // iniciar sesión: se lo trata como si el correo no fuera de un médico.
  const tieneCredenciales = Boolean(
    profesional && profesional.email && profesional.password
  );

  if (
    profesional &&
    profesional.email &&
    profesional.password &&
    (await comparePassword(input.password, profesional.password))
  ) {
    const token = signDoctorToken({
      profesionalId: profesional.id,
      email: profesional.email,
    });
    return {
      rol: "medico",
      medico: {
        id: profesional.id,
        nombre: profesional.nombre,
        email: profesional.email,
        especialidad: profesional.Especialidad?.nombre ?? "",
      },
      token,
    };
  }

  if (paciente || tieneCredenciales) {
    throw HttpError.unauthorized(MENSAJE_CREDENCIALES_INCORRECTAS);
  }

  throw HttpError.notFound(MENSAJE_USUARIO_NO_REGISTRADO);
}
```

### `backend/src/modules/auth/auth.controller.ts` — REEMPLAZAR

```typescript
import type { NextFunction, Request, Response } from "express";
import { validateLoginInput } from "./auth.validator";
import { login } from "./auth.service";
import { HttpError } from "../../utils/httpError";

/**
 * POST /api/auth/login — login único de pacientes y médicos.
 *
 * 1. Valida que vengan correo y contraseña.
 * 2. Busca el correo entre pacientes y, si no, entre médicos con acceso.
 *    No existe en ninguno -> 404; existe pero la contraseña no coincide -> 401.
 * 3. Credenciales correctas -> 200 con `rol` ("paciente" | "medico"), los
 *    datos públicos (`paciente` o `medico`) y el JWT correspondiente.
 */
export async function loginHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { errors, data } = validateLoginInput(req.body);

    if (Object.keys(errors).length > 0) {
      throw HttpError.badRequest("Datos inválidos.", errors);
    }

    const resultado = await login(data);
    res.status(200).json({
      message: "Inicio de sesión exitoso.",
      ...resultado,
    });
  } catch (error) {
    next(error);
  }
}
```

### `backend/src/modules/auth/auth.routes.ts` — REEMPLAZAR

```typescript
import { Router } from "express";

import { loginHandler } from "./auth.controller";

export const authRouter = Router();

// Login único: pacientes y médicos entran por acá (la respuesta trae el rol).
authRouter.post("/login", loginHandler);
```

## 8. Módulo médicos (nuevo)

### `backend/src/modules/medicos/medico.types.ts` — NUEVO

```typescript
import type { EstadoTurno } from "../turnos/turno.constants";

/** Paciente tal como lo ve el médico dentro de un turno. */
export interface PacienteDeTurno {
  id: number;
  nombre: string;
  apellido: string;
  dni: string;
  obraSocial: string | null;
  telefono: string;
}

/** Turno de la agenda del día del médico. */
export interface TurnoDelDia {
  id: number;
  fecha: string; // YYYY-MM-DD
  hora: string; // HH:MM
  estado: EstadoTurno;
  paciente: PacienteDeTurno | null;
}

export interface MetricasDelDia {
  /** Todos los turnos de la fecha consultada (cualquier estado). */
  turnosHoy: number;
  confirmados: number;
  pendientes: number;
  cancelados: number;
  atendidos: number;
}

export interface DashboardMedico {
  fecha: string; // YYYY-MM-DD del día consultado (por defecto, hoy)
  hoy: string; // YYYY-MM-DD de hoy (hora de Argentina), para que la pantalla sepa si es pasado/futuro
  metricas: MetricasDelDia;
  turnos: TurnoDelDia[];
}

/** Paciente único que el médico ya atendió. */
export interface PacienteAtendido {
  id: number;
  nombre: string;
  apellido: string;
  dni: string;
  obraSocial: string | null;
  telefono: string;
  ultimaVisita: string; // YYYY-MM-DD
  totalVisitas: number;
}

export interface PerfilMedico {
  id: number;
  nombre: string;
  email: string;
  matricula: string | null;
  telefono: string | null;
  diasAtencion: string | null;
  info: string;
  especialidad: {
    id: number;
    nombre: string;
  };
}

/** Datos que el médico puede editar de su perfil. */
export interface ActualizarPerfilInput {
  diasAtencion: string;
  info: string;
}
```

### `backend/src/modules/medicos/medico.validator.ts` — NUEVO

```typescript
import type { ActualizarPerfilInput } from "./medico.types";

export const MAX_DIAS_ATENCION = 150;
export const MAX_INFO = 255; // largo de la columna profesionales.info

const FECHA_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/** true si es una fecha YYYY-MM-DD que existe en el calendario. */
export function esFechaValida(fecha: string): boolean {
  if (!FECHA_REGEX.test(fecha)) return false;
  const d = new Date(`${fecha}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === fecha;
}

/**
 * Valida el body de PATCH /api/medicos/perfil. Los dos campos son
 * obligatorios (no se puede dejar vacío cuándo atiende ni el detalle) y se
 * limitan al largo de su columna.
 */
export function validatePerfilInput(payload: unknown): {
  errors: Partial<Record<keyof ActualizarPerfilInput, string>>;
  data: ActualizarPerfilInput | null;
} {
  const errors: Partial<Record<keyof ActualizarPerfilInput, string>> = {};
  const body = (payload && typeof payload === "object" ? payload : {}) as Record<
    string,
    unknown
  >;

  const diasAtencion =
    typeof body.diasAtencion === "string" ? body.diasAtencion.trim() : "";
  const info = typeof body.info === "string" ? body.info.trim() : "";

  if (!diasAtencion) {
    errors.diasAtencion = "Ingrese los días de atención.";
  } else if (diasAtencion.length > MAX_DIAS_ATENCION) {
    errors.diasAtencion = `Los días de atención no pueden superar los ${MAX_DIAS_ATENCION} caracteres.`;
  }

  if (!info) {
    errors.info = "Ingrese el horario y detalle de atención.";
  } else if (info.length > MAX_INFO) {
    errors.info = `El horario y detalle no pueden superar los ${MAX_INFO} caracteres.`;
  }

  if (Object.keys(errors).length > 0) return { errors, data: null };
  return { errors, data: { diasAtencion, info } };
}
```

### `backend/src/modules/medicos/medico.service.ts` — NUEVO

```typescript
import { Especialidad, Paciente, Profesional, Turno } from "../../db/models";
import { HttpError } from "../../utils/httpError";
import { hoyArgentina } from "../../utils/fecha";
import { ESTADO_ATENDIDO } from "../turnos/turno.constants";
import type {
  ActualizarPerfilInput,
  DashboardMedico,
  MetricasDelDia,
  PacienteAtendido,
  PacienteDeTurno,
  PerfilMedico,
  TurnoDelDia,
} from "./medico.types";

const ATRIBUTOS_PACIENTE = [
  "id",
  "nombre",
  "apellido",
  "dni",
  "obraSocial",
  "telefono",
] as const;

function toPacienteDeTurno(paciente: Paciente): PacienteDeTurno {
  return {
    id: paciente.id,
    nombre: paciente.nombre,
    apellido: paciente.apellido,
    dni: paciente.dni,
    obraSocial: paciente.obraSocial ?? null,
    telefono: paciente.telefono,
  };
}

/**
 * Dashboard del médico: métricas y agenda de una fecha (por defecto HOY, en
 * hora de Argentina). Sirve para ver días anteriores y próximos.
 * Solo considera turnos del profesional autenticado (sale del JWT).
 */
export async function getDashboard(
  profesionalId: number,
  fechaConsultada?: string
): Promise<DashboardMedico> {
  const hoy = hoyArgentina();
  const fecha = fechaConsultada ?? hoy;

  const turnos = await Turno.findAll({
    where: { profesionalId, fecha },
    include: [{ model: Paciente, attributes: [...ATRIBUTOS_PACIENTE] }],
    order: [
      ["hora", "ASC"],
      ["id", "ASC"],
    ],
  });

  const metricas: MetricasDelDia = {
    turnosHoy: turnos.length,
    confirmados: 0,
    pendientes: 0,
    cancelados: 0,
    atendidos: 0,
  };

  for (const turno of turnos) {
    if (turno.estado === "confirmado") metricas.confirmados += 1;
    else if (turno.estado === "pendiente") metricas.pendientes += 1;
    else if (turno.estado === "cancelado") metricas.cancelados += 1;
    else if (turno.estado === "atendido") metricas.atendidos += 1;
  }

  const lista: TurnoDelDia[] = turnos.map((turno) => ({
    id: turno.id,
    fecha: turno.fecha,
    hora: turno.hora,
    estado: turno.estado,
    paciente: turno.Paciente ? toPacienteDeTurno(turno.Paciente) : null,
  }));

  return { fecha, hoy, metricas, turnos: lista };
}

/**
 * Pacientes únicos que el médico ya atendió (turnos en estado "atendido"),
 * con la fecha de su última visita y la cantidad de visitas. Ordenados del
 * más reciente al más antiguo.
 */
export async function getPacientesAtendidos(
  profesionalId: number
): Promise<PacienteAtendido[]> {
  const turnos = await Turno.findAll({
    where: { profesionalId, estado: ESTADO_ATENDIDO },
    include: [
      { model: Paciente, attributes: [...ATRIBUTOS_PACIENTE], required: true },
    ],
    // Ordenado de más reciente a más antiguo: la primera aparición de cada
    // paciente es su última visita.
    order: [
      ["fecha", "DESC"],
      ["hora", "DESC"],
      ["id", "DESC"],
    ],
  });

  const porPaciente = new Map<number, PacienteAtendido>();

  for (const turno of turnos) {
    if (!turno.Paciente) continue;

    const existente = porPaciente.get(turno.Paciente.id);
    if (existente) {
      existente.totalVisitas += 1;
      continue;
    }

    porPaciente.set(turno.Paciente.id, {
      ...toPacienteDeTurno(turno.Paciente),
      ultimaVisita: turno.fecha,
      totalVisitas: 1,
    });
  }

  return Array.from(porPaciente.values());
}

/** Datos personales y profesionales del médico autenticado. */
export async function getPerfil(profesionalId: number): Promise<PerfilMedico> {
  const profesional = await Profesional.findByPk(profesionalId, {
    include: [{ model: Especialidad, attributes: ["id", "nombre"] }],
  });

  if (!profesional || !profesional.email) {
    throw HttpError.notFound("No se encontró el perfil del médico.");
  }

  return {
    id: profesional.id,
    nombre: profesional.nombre,
    email: profesional.email,
    matricula: profesional.matricula ?? null,
    telefono: profesional.telefono ?? null,
    diasAtencion: profesional.diasAtencion ?? null,
    info: profesional.info,
    especialidad: {
      id: profesional.especialidadId,
      nombre: profesional.Especialidad?.nombre ?? "",
    },
  };
}

/**
 * Actualiza los días de atención y el horario/detalle del médico autenticado.
 * Solo se pueden cambiar esos dos campos; el resto del perfil lo gestiona un
 * Administrativo. Devuelve el perfil completo ya actualizado.
 */
export async function actualizarPerfil(
  profesionalId: number,
  input: ActualizarPerfilInput
): Promise<PerfilMedico> {
  const profesional = await Profesional.findByPk(profesionalId);

  if (!profesional || !profesional.email) {
    throw HttpError.notFound("No se encontró el perfil del médico.");
  }

  await profesional.update({
    diasAtencion: input.diasAtencion,
    info: input.info,
  });

  return getPerfil(profesionalId);
}
```

### `backend/src/modules/medicos/medico.controller.ts` — NUEVO

```typescript
import type { NextFunction, Request, Response } from "express";
import { HttpError } from "../../utils/httpError";
import {
  actualizarPerfil,
  getDashboard,
  getPacientesAtendidos,
  getPerfil,
} from "./medico.service";
import { esFechaValida, validatePerfilInput } from "./medico.validator";

function profesionalIdDe(req: Request): number {
  if (!req.profesionalId) {
    throw HttpError.unauthorized("Debe iniciar sesión para continuar.");
  }
  return req.profesionalId;
}

/**
 * GET /api/medicos/dashboard?fecha=YYYY-MM-DD -> métricas y turnos del día.
 * Sin `fecha` devuelve el día de hoy.
 */
export async function getDashboardHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const profesionalId = profesionalIdDe(req);

    const fecha = req.query.fecha;
    if (fecha !== undefined && (typeof fecha !== "string" || !esFechaValida(fecha))) {
      throw HttpError.badRequest("Seleccione una fecha válida.", {
        fecha: "Seleccione una fecha válida.",
      });
    }

    const dashboard = await getDashboard(profesionalId, fecha);
    res.status(200).json(dashboard);
  } catch (error) {
    next(error);
  }
}

/** GET /api/medicos/pacientes -> pacientes únicos atendidos. */
export async function getPacientesHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const pacientes = await getPacientesAtendidos(profesionalIdDe(req));
    res.status(200).json({ pacientes });
  } catch (error) {
    next(error);
  }
}

/** GET /api/medicos/perfil -> datos del médico autenticado. */
export async function getPerfilHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const perfil = await getPerfil(profesionalIdDe(req));
    res.status(200).json({ perfil });
  } catch (error) {
    next(error);
  }
}

/** PATCH /api/medicos/perfil -> actualiza días de atención y horario/detalle. */
export async function actualizarPerfilHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const profesionalId = profesionalIdDe(req);

    const { errors, data } = validatePerfilInput(req.body);
    if (!data) {
      throw HttpError.badRequest(Object.values(errors)[0] ?? "Datos inválidos.", errors);
    }

    const perfil = await actualizarPerfil(profesionalId, data);
    res.status(200).json({
      message: "Tus datos de atención se actualizaron correctamente.",
      perfil,
    });
  } catch (error) {
    next(error);
  }
}
```

### `backend/src/modules/medicos/medico.routes.ts` — NUEVO

```typescript
import { Router } from "express";
import { requireDoctorAuth } from "../../middlewares/requireDoctorAuth";
import {
  actualizarPerfilHandler,
  getDashboardHandler,
  getPacientesHandler,
  getPerfilHandler,
} from "./medico.controller";

export const medicoRouter = Router();

// Todo el Portal del Médico requiere un JWT de médico: el profesional sale
// del token, así que cada médico ve únicamente sus propios datos.
medicoRouter.use(requireDoctorAuth);

medicoRouter.get("/dashboard", getDashboardHandler);
medicoRouter.get("/pacientes", getPacientesHandler);
medicoRouter.get("/perfil", getPerfilHandler);
medicoRouter.patch("/perfil", actualizarPerfilHandler);
```

## 9. Módulo turnos

### `backend/src/modules/turnos/turno.estado.ts` — NUEVO

```typescript
import type { NextFunction, Request, Response } from "express";
import { Turno } from "../../db/models";
import { HttpError } from "../../utils/httpError";
import { hoyArgentina } from "../../utils/fecha";
import {
  ESTADO_CANCELADO,
  ESTADOS_ASIGNABLES_POR_MEDICO,
  type EstadoAsignablePorMedico,
} from "./turno.constants";
import type { MiTurno } from "./turno.types";

/**
 * Portal del Médico — cambiar el estado de un turno propio.
 *
 * PATCH /api/turnos/:id/estado   body: { "estado": "atendido" | "pendiente" }
 */

export const MENSAJE_ERROR_ESTADO =
  "No fue posible actualizar el estado del turno. Intente nuevamente.";

function esEstadoAsignable(valor: unknown): valor is EstadoAsignablePorMedico {
  return (
    typeof valor === "string" &&
    (ESTADOS_ASIGNABLES_POR_MEDICO as readonly string[]).includes(valor)
  );
}

/**
 * Reglas:
 * - Turno inexistente o de otro médico -> 404 (mismo mensaje, para no
 *   revelar si existe).
 * - Turno cancelado -> 409 (un turno cancelado no se reabre desde acá).
 * - Marcar "atendido" un turno de una fecha futura -> 400.
 * - Si ya está en ese estado, la operación es idempotente (200).
 */
export async function updateEstadoTurno(
  turnoId: number,
  profesionalId: number,
  estado: EstadoAsignablePorMedico
): Promise<Pick<MiTurno, "id" | "estado">> {
  const turno = await Turno.findByPk(turnoId);

  if (!turno || turno.profesionalId !== profesionalId) {
    throw HttpError.notFound(MENSAJE_ERROR_ESTADO);
  }

  if (turno.estado === ESTADO_CANCELADO) {
    throw HttpError.conflict("No se puede modificar un turno cancelado.");
  }

  if (estado === "atendido" && turno.fecha > hoyArgentina()) {
    throw HttpError.badRequest(
      "No se puede marcar como atendido un turno de una fecha futura."
    );
  }

  if (turno.estado !== estado) {
    await turno.update({ estado });
  }

  return { id: turno.id, estado: turno.estado };
}

export async function updateEstadoTurnoHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    if (!req.profesionalId) {
      throw HttpError.unauthorized("Debe iniciar sesión para continuar.");
    }

    const turnoId = Number(req.params.id);
    if (!Number.isInteger(turnoId) || turnoId <= 0) {
      throw HttpError.badRequest("ID de turno inválido.");
    }

    const estado = (req.body as { estado?: unknown } | undefined)?.estado;
    if (!esEstadoAsignable(estado)) {
      throw HttpError.badRequest(
        'El estado debe ser "atendido" o "pendiente".',
        { estado: 'El estado debe ser "atendido" o "pendiente".' }
      );
    }

    const turno = await updateEstadoTurno(turnoId, req.profesionalId, estado);
    res.status(200).json({
      message: "El estado del turno fue actualizado correctamente.",
      turno,
    });
  } catch (error) {
    next(error);
  }
}
```

### `backend/src/modules/turnos/turno.reprogramarMedico.ts` — NUEVO

```typescript
import type { NextFunction, Request, Response } from "express";
import { Op, UniqueConstraintError } from "sequelize";
import { Turno } from "../../db/models";
import { HttpError } from "../../utils/httpError";
import { hoyArgentina } from "../../utils/fecha";
import { ESTADOS_VIGENTES, HORARIOS_POSIBLES } from "./turno.constants";
import type { EstadoTurno } from "./turno.constants";

/**
 * Portal del Médico — reprogramar un turno de un paciente.
 *
 * PUT /api/turnos/:id/reprogramar-medico   body: { "fecha": "YYYY-MM-DD", "hora": "HH:MM" }
 *
 * A diferencia de la reprogramación del paciente (HU-06), acá NO rige la
 * regla de las 24 h de anticipación: es el médico quien reorganiza su agenda.
 */

export const MENSAJE_ERROR_REPROGRAMAR =
  "No fue posible reprogramar el turno. Intente nuevamente.";

const FECHA_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/** Hora actual de Argentina (UTC-3) en formato HH:MM. */
function horaActualArgentina(): string {
  return new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString().slice(11, 16);
}

function esFechaReal(fecha: string): boolean {
  if (!FECHA_REGEX.test(fecha)) return false;
  const d = new Date(`${fecha}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === fecha;
}

export interface TurnoReprogramadoMedico {
  id: number;
  fecha: string;
  hora: string;
  estado: EstadoTurno;
}

/**
 * Reglas:
 * - Turno inexistente o de otro médico -> 404 (mismo mensaje en ambos casos).
 * - Turno cancelado o ya atendido -> 409.
 * - Fecha inválida/anterior a hoy, u horario fuera de la grilla -> 400.
 * - Hoy con un horario que ya pasó -> 400.
 * - Mismo día y horario que el actual -> 400.
 * - Horario ocupado por otro turno vigente -> 409.
 */
export async function reprogramarTurnoComoMedico(
  turnoId: number,
  profesionalId: number,
  fecha: string,
  hora: string
): Promise<TurnoReprogramadoMedico> {
  const turno = await Turno.findByPk(turnoId);

  if (!turno || turno.profesionalId !== profesionalId) {
    throw HttpError.notFound(MENSAJE_ERROR_REPROGRAMAR);
  }

  if (!ESTADOS_VIGENTES.includes(turno.estado)) {
    throw HttpError.conflict(
      "Solo se pueden reprogramar turnos confirmados o pendientes."
    );
  }

  if (!esFechaReal(fecha)) {
    throw HttpError.badRequest("Seleccione una fecha válida.", {
      fecha: "Seleccione una fecha válida.",
    });
  }

  const hoy = hoyArgentina();
  if (fecha < hoy) {
    throw HttpError.badRequest("No se puede reprogramar a una fecha pasada.", {
      fecha: "No se puede reprogramar a una fecha pasada.",
    });
  }

  if (!HORARIOS_POSIBLES.includes(hora)) {
    throw HttpError.badRequest("Seleccione un horario disponible.", {
      hora: "Seleccione un horario disponible.",
    });
  }

  if (fecha === hoy && hora <= horaActualArgentina()) {
    throw HttpError.badRequest("Ese horario de hoy ya pasó.", {
      hora: "Ese horario de hoy ya pasó.",
    });
  }

  if (turno.fecha === fecha && turno.hora === hora) {
    throw HttpError.badRequest("El turno ya está en ese día y horario.");
  }

  const ocupado = await Turno.findOne({
    where: {
      id: { [Op.ne]: turno.id },
      profesionalId,
      fecha,
      hora,
      estado: { [Op.ne]: "cancelado" },
    },
  });

  if (ocupado) {
    throw HttpError.conflict("El horario seleccionado ya no se encuentra disponible.");
  }

  try {
    await turno.update({ fecha, hora });
  } catch (error) {
    // Segunda barrera: el índice único parcial de la base ante una carrera.
    if (error instanceof UniqueConstraintError) {
      throw HttpError.conflict("El horario seleccionado ya no se encuentra disponible.");
    }
    throw error;
  }

  return { id: turno.id, fecha: turno.fecha, hora: turno.hora, estado: turno.estado };
}

export async function reprogramarTurnoMedicoHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    if (!req.profesionalId) {
      throw HttpError.unauthorized("Debe iniciar sesión para continuar.");
    }

    const turnoId = Number(req.params.id);
    if (!Number.isInteger(turnoId) || turnoId <= 0) {
      throw HttpError.badRequest("ID de turno inválido.");
    }

    const body = (req.body ?? {}) as { fecha?: unknown; hora?: unknown };
    const fecha = typeof body.fecha === "string" ? body.fecha.trim() : "";
    const hora = typeof body.hora === "string" ? body.hora.trim() : "";

    if (!fecha || !hora) {
      const errors: Record<string, string> = {};
      if (!fecha) errors.fecha = "Seleccione una fecha válida.";
      if (!hora) errors.hora = "Seleccione un horario disponible.";
      throw HttpError.badRequest(Object.values(errors)[0], errors);
    }

    const turno = await reprogramarTurnoComoMedico(
      turnoId,
      req.profesionalId,
      fecha,
      hora
    );

    res.status(200).json({
      message: "El turno fue reprogramado correctamente.",
      turno,
    });
  } catch (error) {
    next(error);
  }
}
```

### `backend/src/modules/turnos/turno.routes.ts` — REEMPLAZAR

```typescript
import { Router } from "express";
import {
  createTurnoHandler,
  getHorariosDisponibilidadHandler,
  getMisTurnosHandler,
  reprogramarTurnoHandler,
} from "./turno.controller";
import { requireAuth } from "../../middlewares/requireAuth";
import { cancelTurnoHandler } from "./turno.cancelar";
import { requireDoctorAuth } from "../../middlewares/requireDoctorAuth";
import { updateEstadoTurnoHandler } from "./turno.estado";
import { reprogramarTurnoMedicoHandler } from "./turno.reprogramarMedico";

export const turnoRouter = Router();

// Consultar especialidades/profesionales/horarios es público (no hace
// falta estar logueado para mirar disponibilidad).
turnoRouter.get("/horarios-disponibles", getHorariosDisponibilidadHandler);

// HU-04: turnos del paciente logueado. Requiere sesión: el paciente sale
// del JWT, así que cada uno ve únicamente los suyos.
turnoRouter.get("/mis-turnos", requireAuth, getMisTurnosHandler);

// Pedir un turno sí requiere sesión: el paciente sale del JWT, no del body.
turnoRouter.post("/", requireAuth, createTurnoHandler);

// HU-05: cancelar un turno propio (también requiere sesión).
turnoRouter.patch("/:id/cancelar", requireAuth, cancelTurnoHandler);

// HU-06: reprogramar un turno propio (el paciente sale del JWT).
turnoRouter.put("/:id/reprogramar", requireAuth, reprogramarTurnoHandler);

// Portal del Médico: el médico marca un turno propio como atendido/pendiente
// (el médico sale del JWT de médico, no del body).
turnoRouter.patch("/:id/estado", requireDoctorAuth, updateEstadoTurnoHandler);

// Portal del Médico: el médico reprograma un turno de su agenda (sin la regla
// de 24 h del paciente). El médico sale del JWT de médico.
turnoRouter.put("/:id/reprogramar-medico", requireDoctorAuth, reprogramarTurnoMedicoHandler);
```

### `backend/src/modules/turnos/turno.cancelar.ts` — REEMPLAZAR

```typescript
import type { NextFunction, Request, Response } from "express";
import { Turno } from "../../db/models";
import { HttpError } from "../../utils/httpError";
import { ESTADO_ATENDIDO, ESTADO_CANCELADO } from "./turno.constants";
import type { MiTurno } from "./turno.types";

/**
 * HU-05 — Cancelar turno.
 *
 * Servicio + controlador de la cancelación. Para liberar el horario no hace
 * falta tocar nada más: el turno queda en estado "cancelado" y tanto
 * getHorariosDisponibilidad como createTurno (turno.service.ts) y el índice
 * único parcial de la base ignoran los turnos cancelados.
 */

/** Mensaje exacto de HU-05 para cualquier falla al cancelar. */
export const MENSAJE_ERROR_CANCELAR =
  "No fue posible cancelar el turno. Intente nuevamente.";

/**
 * Misma lógica que turno.validator.ts: fecha anterior al día actual, tomando
 * como "hoy" la fecha de Argentina (UTC-3) y no la de UTC.
 */
function isFechaPasada(fecha: string): boolean {
  const hoyAR = new Date(Date.now() - 3 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
  return fecha < hoyAR;
}

/**
 * Cancela un turno del paciente autenticado.
 * - Turno inexistente o de otro paciente -> 404 (mismo mensaje en los dos
 *   casos, para no revelar si el turno existe).
 * - Turno ya cancelado o ya atendido por el médico -> 409.
 * - Turno con fecha anterior al día actual -> 400.
 */
export async function cancelTurno(
  turnoId: number,
  pacienteId: number
): Promise<Pick<MiTurno, "id" | "estado">> {
  const turno = await Turno.findByPk(turnoId);

  if (!turno || turno.pacienteId !== pacienteId) {
    throw HttpError.notFound(MENSAJE_ERROR_CANCELAR);
  }

  if (turno.estado === ESTADO_CANCELADO || turno.estado === ESTADO_ATENDIDO) {
    throw HttpError.conflict(MENSAJE_ERROR_CANCELAR);
  }

  if (isFechaPasada(turno.fecha)) {
    throw HttpError.badRequest(MENSAJE_ERROR_CANCELAR);
  }

  await turno.update({ estado: ESTADO_CANCELADO });

  return { id: turno.id, estado: turno.estado };
}

/**
 * PATCH /api/turnos/:id/cancelar (protegido por requireAuth)
 *
 * El paciente sale del JWT (req.pacienteId), nunca del body ni de la URL.
 * Devuelve 200 con el mensaje exacto de la consigna.
 */
export async function cancelTurnoHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    if (!req.pacienteId) {
      throw HttpError.unauthorized("Debe iniciar sesión para continuar.");
    }

    const turnoId = Number(req.params.id);
    if (!Number.isInteger(turnoId) || turnoId <= 0) {
      throw HttpError.badRequest(MENSAJE_ERROR_CANCELAR);
    }

    const turno = await cancelTurno(turnoId, req.pacienteId);
    res.status(200).json({
      message: "Turno cancelado correctamente.",
      turno,
    });
  } catch (error) {
    next(error);
  }
}
```

### `backend/src/modules/turnos/turno.service.ts` — REEMPLAZAR

```typescript
import { Op, UniqueConstraintError } from "sequelize";
import { Especialidad, Profesional, Turno } from "../../db/models";
import { HttpError } from "../../utils/httpError";
import {
  ESTADO_CANCELADO,
  ESTADOS_VIGENTES,
  HORARIOS_POSIBLES,
} from "./turno.constants";
import type {
  HorarioDisponibilidad,
  MiTurno,
  PublicTurno,
  TurnoCreateInput,
} from "./turno.types";

function toPublicTurno(turno: Turno): PublicTurno {
  return {
    id: turno.id,
    especialidadId: turno.especialidadId,
    profesionalId: turno.profesionalId,
    pacienteId: turno.pacienteId as number,
    fecha: turno.fecha,
    hora: turno.hora,
    createdAt: turno.createdAt.toISOString(),
  };
}

/**
 * Horarios posibles para un profesional en una fecha, marcando cuáles ya
 * están ocupados. Si no hay ningún horario libre, el frontend es quien
 * debe mostrar "No hay horarios disponibles." (criterio de HU-03).
 */
export async function getHorariosDisponibilidad(
  profesionalId: number,
  fecha: string
): Promise<HorarioDisponibilidad[]> {
  const turnosDelDia = await Turno.findAll({
    where: { profesionalId, fecha, estado: { [Op.ne]: ESTADO_CANCELADO } },
  });
  const ocupados = new Set(turnosDelDia.map((t) => t.hora));

  return HORARIOS_POSIBLES.map((hora) => ({
    hora,
    ocupado: ocupados.has(hora),
  }));
}

/**
 * Registra un turno para el paciente autenticado (`pacienteId` viene del
 * JWT verificado por requireAuth, nunca del cliente).
 * 1. Verifica que el horario siga disponible (no lo haya tomado otro
 *    paciente entre que el frontend cargó la lista y confirmó).
 * 2. Persiste en PostgreSQL.
 * También confía en la restricción UNIQUE de la base (profesional_id,
 * fecha, hora) como segunda barrera ante condiciones de carrera.
 */
export async function createTurno(
  input: TurnoCreateInput,
  pacienteId: number
): Promise<PublicTurno> {
  const yaExiste = await Turno.findOne({
    where: {
      profesionalId: input.profesionalId,
      fecha: input.fecha,
      hora: input.hora,
      estado: { [Op.ne]: ESTADO_CANCELADO },
    },
  });

  if (yaExiste) {
    throw HttpError.conflict("No fue posible solicitar el turno. Intente nuevamente.");
  }

  try {
    const turno = await Turno.create({
      especialidadId: input.especialidadId,
      profesionalId: input.profesionalId,
      fecha: input.fecha,
      hora: input.hora,
      pacienteId,
    });

    return toPublicTurno(turno);
  } catch (error) {
    if (error instanceof UniqueConstraintError) {
      throw HttpError.conflict(
        "No fue posible solicitar el turno. Intente nuevamente."
      );
    }
    throw error;
  }
}

function toMiTurno(turno: Turno): MiTurno {
  return {
    id: turno.id,
    fecha: turno.fecha,
    hora: turno.hora,
    estado: turno.estado,
    especialidad: {
      id: turno.especialidadId,
      nombre: turno.Especialidad?.nombre ?? "",
    },
    profesional: {
      id: turno.profesionalId,
      nombre: turno.Profesional?.nombre ?? "",
      info: turno.Profesional?.info ?? "",
    },
  };
}

/**
 * HU-04 — Consultar mis turnos.
 *
 * Devuelve SOLO los turnos del paciente indicado (`pacienteId` sale del
 * JWT verificado por requireAuth, nunca de la URL ni del body), con la
 * especialidad y el profesional de cada uno, ordenados por fecha y hora
 * ascendente (criterio: "Los turnos deberán mostrarse ordenados por
 * fecha"). Si no tiene turnos devuelve una lista vacía: el mensaje "No
 * posee turnos programados." lo muestra el frontend.
 */
export async function getTurnosDelPaciente(pacienteId: number): Promise<MiTurno[]> {
  const turnos = await Turno.findAll({
    where: { pacienteId },
    include: [
      { model: Especialidad, attributes: ["id", "nombre"] },
      { model: Profesional, attributes: ["id", "nombre", "info"] },
    ],
    order: [
      ["fecha", "ASC"],
      ["hora", "ASC"],
      ["id", "ASC"],
    ],
  });

  return turnos.map(toMiTurno);
}

/**
 * HU-06 — Reprogramar turno.
 */
export async function reprogramarTurno(
  turnoId: number,
  pacienteId: number,
  nuevaFecha: string,
  nuevaHora: string
): Promise<PublicTurno> {
  const turno = await Turno.findOne({ where: { id: turnoId, pacienteId } });

  if (!turno) {
    throw HttpError.notFound("El turno no existe o no te pertenece.");
  }

  if (!ESTADOS_VIGENTES.includes(turno.estado)) {
    throw HttpError.badRequest("Solo se pueden reprogramar turnos confirmados.");
  }

  const fechaTurnoOriginal = new Date(`${turno.fecha}T${turno.hora}:00-03:00`);
  const ahora = new Date();
  const horasDiferencia = (fechaTurnoOriginal.getTime() - ahora.getTime()) / (1000 * 60 * 60);

  if (horasDiferencia < 24) {
    throw HttpError.badRequest("Solo se pueden reprogramar turnos con al menos 24 horas de anticipación.");
  }

  const ocupado = await Turno.findOne({
    where: {
      profesionalId: turno.profesionalId,
      fecha: nuevaFecha,
      hora: nuevaHora,
      estado: { [Op.ne]: ESTADO_CANCELADO },
    },
  });

  if (ocupado) {
    throw HttpError.conflict("El horario seleccionado ya no se encuentra disponible.");
  }

  turno.fecha = nuevaFecha;
  turno.hora = nuevaHora;
  await turno.save();

  return toPublicTurno(turno);
}
```

## 10. App

### `backend/src/app.ts` — REEMPLAZAR

```typescript
import express from "express";
import cors from "cors";
import { env } from "./config/env";
import { pacienteRouter } from "./modules/pacientes/paciente.routes";
import { authRouter } from "./modules/auth/auth.routes";
import { especialidadRouter } from "./modules/especialidades/especialidad.routes";
import { profesionalRouter } from "./modules/profesionales/profesional.routes";
import { turnoRouter } from "./modules/turnos/turno.routes";
import { medicoRouter } from "./modules/medicos/medico.routes";
import { notFoundHandler } from "./middlewares/notFound";
import { errorHandler } from "./middlewares/errorHandler";

export function createApp() {
  const app = express();

  app.use(cors({ origin: env.corsOrigin }));
  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.status(200).json({ status: "ok" });
  });

  app.use("/api/pacientes", pacienteRouter);
  app.use("/api/auth", authRouter);
  app.use("/api/especialidades", especialidadRouter);
  app.use("/api/profesionales", profesionalRouter);
  app.use("/api/turnos", turnoRouter);
  app.use("/api/medicos", medicoRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
```

## 10b. Pruebas de integración (nuevas)

### `backend/tests/integration/medico.api.test.ts` — NUEVO

```typescript
/**
 * Portal del Médico — pruebas de integración: login único (paciente y
 * médico), dashboard por fecha, edición del perfil y reprogramación.
 *
 * Corren contra la API real (Express + middlewares + Sequelize) y la base
 * PostgreSQL de prueba creada con las migraciones (ver globalSetup.js).
 */

import request from "supertest";
import { createApp } from "../../src/app";
import { Especialidad, Paciente, Profesional, Turno, sequelize } from "../../src/db/models";
import { hashPassword } from "../../src/utils/password";
import { signSessionToken } from "../../src/utils/jwt";

const app = createApp();

const PASS_MEDICO = "Medico123";
const PASS_PACIENTE = "Paciente123!";

let medicoToken: string;
let pacienteToken: string;
let especialidad: Especialidad;
let medico: Profesional;
let otroMedico: Profesional;
let paciente: Paciente;

function fechaAR(offsetDias: number): string {
  return new Date(Date.now() - 3 * 60 * 60 * 1000 + offsetDias * 86400000)
    .toISOString()
    .slice(0, 10);
}

beforeAll(async () => {
  await sequelize.query(
    "TRUNCATE turnos, profesionales, especialidades, pacientes RESTART IDENTITY CASCADE"
  );

  especialidad = await Especialidad.create({ nombre: "Clínica Médica" });
  medico = await Profesional.create({
    nombre: "Dr. Román López",
    info: "Atiende lunes a viernes de 8 a 14 hs. Consultorio N° 11.",
    especialidadId: especialidad.id,
    email: "roman@test.com",
    password: await hashPassword(PASS_MEDICO),
    matricula: "MP 28451",
    telefono: "3564 412345",
    diasAtencion: "Lunes a Viernes",
  });
  // Profesional SIN credenciales: no puede iniciar sesión.
  otroMedico = await Profesional.create({
    nombre: "Dra. Sin Acceso",
    info: "Atiende martes.",
    especialidadId: especialidad.id,
  });
  paciente = await Paciente.create({
    nombre: "Ana",
    apellido: "Pérez",
    dni: "30111222",
    fechaNacimiento: "1990-05-10",
    email: "ana@test.com",
    telefono: "3564123456",
    password: await hashPassword(PASS_PACIENTE),
  });
  pacienteToken = signSessionToken({ pacienteId: paciente.id, email: paciente.email });

  const login = await request(app)
    .post("/api/auth/login")
    .send({ email: "roman@test.com", password: PASS_MEDICO });
  medicoToken = login.body.token;

  await Turno.bulkCreate([
    { pacienteId: paciente.id, especialidadId: especialidad.id, profesionalId: medico.id, fecha: fechaAR(-3), hora: "09:00", estado: "atendido" },
    { pacienteId: paciente.id, especialidadId: especialidad.id, profesionalId: medico.id, fecha: fechaAR(0), hora: "09:00", estado: "confirmado" },
    { pacienteId: paciente.id, especialidadId: especialidad.id, profesionalId: medico.id, fecha: fechaAR(2), hora: "10:00", estado: "confirmado" },
    { pacienteId: paciente.id, especialidadId: especialidad.id, profesionalId: medico.id, fecha: fechaAR(2), hora: "11:00", estado: "confirmado" },
    { pacienteId: paciente.id, especialidadId: especialidad.id, profesionalId: otroMedico.id, fecha: fechaAR(0), hora: "09:00", estado: "confirmado" },
  ]);
});

afterAll(async () => {
  await sequelize.close();
});

describe("POST /api/auth/login — login único", () => {
  it("un paciente entra y recibe rol 'paciente'", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "ana@test.com", password: PASS_PACIENTE });
    expect(res.status).toBe(200);
    expect(res.body.rol).toBe("paciente");
    expect(res.body.paciente.email).toBe("ana@test.com");
    expect(res.body.paciente.password).toBeUndefined();
    expect(res.body.token).toEqual(expect.any(String));
  });

  it("un médico entra por el mismo endpoint y recibe rol 'medico'", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "Roman@Test.com", password: PASS_MEDICO });
    expect(res.status).toBe(200);
    expect(res.body.rol).toBe("medico");
    expect(res.body.medico).toMatchObject({
      id: medico.id,
      nombre: "Dr. Román López",
      especialidad: "Clínica Médica",
    });
    expect(res.body.medico.password).toBeUndefined();
  });

  it("correo que no existe -> 404", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "nadie@test.com", password: "x" });
    expect(res.status).toBe(404);
    expect(res.body.message).toBe("El usuario no se encuentra registrado.");
  });

  it("contraseña incorrecta (médico o paciente) -> 401", async () => {
    for (const email of ["roman@test.com", "ana@test.com"]) {
      const res = await request(app).post("/api/auth/login").send({ email, password: "mala" });
      expect(res.status).toBe(401);
      expect(res.body.message).toBe("Correo electrónico o contraseña incorrectos.");
    }
  });

  it("el token de médico no sirve en rutas de paciente y viceversa", async () => {
    const a = await request(app).get("/api/turnos/mis-turnos").set("Authorization", `Bearer ${medicoToken}`);
    expect(a.status).toBe(401);
    const b = await request(app).get("/api/medicos/dashboard").set("Authorization", `Bearer ${pacienteToken}`);
    expect(b.status).toBe(401);
  });

  it("ya no existe un login especial de médico", async () => {
    const res = await request(app)
      .post("/api/auth/medico/login")
      .send({ email: "roman@test.com", password: PASS_MEDICO });
    expect(res.status).toBe(404);
  });
});

describe("GET /api/medicos/dashboard?fecha=", () => {
  const auth = () => ({ Authorization: `Bearer ${medicoToken}` });

  it("sin fecha devuelve hoy", async () => {
    const res = await request(app).get("/api/medicos/dashboard").set(auth());
    expect(res.status).toBe(200);
    expect(res.body.fecha).toBe(fechaAR(0));
    expect(res.body.hoy).toBe(fechaAR(0));
    expect(res.body.turnos).toHaveLength(1);
    expect(res.body.metricas.turnosHoy).toBe(1);
  });

  it("una fecha anterior devuelve los turnos de ese día", async () => {
    const res = await request(app).get(`/api/medicos/dashboard?fecha=${fechaAR(-3)}`).set(auth());
    expect(res.status).toBe(200);
    expect(res.body.fecha).toBe(fechaAR(-3));
    expect(res.body.metricas.atendidos).toBe(1);
    expect(res.body.turnos[0].paciente.apellido).toBe("Pérez");
  });

  it("una fecha futura devuelve los turnos de ese día, ordenados por hora, y solo los del médico", async () => {
    const res = await request(app).get(`/api/medicos/dashboard?fecha=${fechaAR(2)}`).set(auth());
    expect(res.body.turnos.map((t: { hora: string }) => t.hora)).toEqual(["10:00", "11:00"]);
    expect(res.body.metricas.confirmados).toBe(2);
  });

  it("fecha inválida -> 400", async () => {
    for (const f of ["hola", "2026-02-31", "2026-1-1"]) {
      const res = await request(app).get(`/api/medicos/dashboard?fecha=${f}`).set(auth());
      expect(res.status).toBe(400);
    }
  });
});

describe("PATCH /api/medicos/perfil", () => {
  const auth = () => ({ Authorization: `Bearer ${medicoToken}` });

  it("actualiza días de atención y horario/detalle", async () => {
    const res = await request(app)
      .patch("/api/medicos/perfil")
      .set(auth())
      .send({ diasAtencion: "  Martes y Jueves ", info: "Atiende de 9 a 13 hs. Consultorio N° 4." });
    expect(res.status).toBe(200);
    expect(res.body.perfil.diasAtencion).toBe("Martes y Jueves");
    expect(res.body.perfil.info).toBe("Atiende de 9 a 13 hs. Consultorio N° 4.");

    const get = await request(app).get("/api/medicos/perfil").set(auth());
    expect(get.body.perfil.diasAtencion).toBe("Martes y Jueves");
    // Lo demás no se toca.
    expect(get.body.perfil.matricula).toBe("MP 28451");
  });

  it("campos vacíos o demasiado largos -> 400 y no cambia nada", async () => {
    const vacio = await request(app).patch("/api/medicos/perfil").set(auth()).send({ diasAtencion: " ", info: "" });
    expect(vacio.status).toBe(400);
    expect(vacio.body.errors).toEqual({
      diasAtencion: "Ingrese los días de atención.",
      info: "Ingrese el horario y detalle de atención.",
    });

    const largo = await request(app)
      .patch("/api/medicos/perfil")
      .set(auth())
      .send({ diasAtencion: "Lunes", info: "x".repeat(256) });
    expect(largo.status).toBe(400);

    const get = await request(app).get("/api/medicos/perfil").set(auth());
    expect(get.body.perfil.diasAtencion).toBe("Martes y Jueves");
  });

  it("sin token de médico -> 401", async () => {
    const res = await request(app)
      .patch("/api/medicos/perfil")
      .set("Authorization", `Bearer ${pacienteToken}`)
      .send({ diasAtencion: "Lunes", info: "x" });
    expect(res.status).toBe(401);
  });
});

describe("PUT /api/turnos/:id/reprogramar-medico", () => {
  const auth = () => ({ Authorization: `Bearer ${medicoToken}` });

  it("reprograma un turno futuro y conserva el estado", async () => {
    const turno = await Turno.findOne({ where: { profesionalId: medico.id, fecha: fechaAR(2), hora: "10:00" } });
    const res = await request(app)
      .put(`/api/turnos/${turno!.id}/reprogramar-medico`)
      .set(auth())
      .send({ fecha: fechaAR(5), hora: "14:00" });
    expect(res.status).toBe(200);
    expect(res.body.turno).toMatchObject({ fecha: fechaAR(5), hora: "14:00", estado: "confirmado" });
  });

  it("horario ocupado -> 409", async () => {
    const turno = await Turno.findOne({ where: { profesionalId: medico.id, fecha: fechaAR(2), hora: "11:00" } });
    const res = await request(app)
      .put(`/api/turnos/${turno!.id}/reprogramar-medico`)
      .set(auth())
      .send({ fecha: fechaAR(5), hora: "14:00" });
    expect(res.status).toBe(409);
  });

  it("turno de otro médico -> 404", async () => {
    const ajeno = await Turno.findOne({ where: { profesionalId: otroMedico.id } });
    const res = await request(app)
      .put(`/api/turnos/${ajeno!.id}/reprogramar-medico`)
      .set(auth())
      .send({ fecha: fechaAR(5), hora: "15:00" });
    expect(res.status).toBe(404);
  });
});
```

---

# CÓDIGO — FRONTEND

## 11. Login único y compatibilidad del lado paciente (reemplazar)

### `app/page.tsx` — REEMPLAZAR

```tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import RegisterForm from "@/components/patient/RegisterForm";
import {
  login,
  LoginError,
  type AuthenticatedPatient,
} from "@/lib/services/authService";
import { saveSession } from "@/lib/auth/session";
import { saveMedicoSession } from "@/lib/auth/medicoSession";
import { useSessionMedico } from "@/lib/auth/useSessionMedico";

export default function Home() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"login" | "registro">("login");

  // Si ya hay una sesión de médico abierta, lo lleva directo a su vista.
  const sessionMedico = useSessionMedico();
  useEffect(() => {
    if (sessionMedico) {
      router.replace("/medico/inicio");
    }
  }, [sessionMedico, router]);

  // --- HU-02: Inicio de sesión ---
  const [loginForm, setLoginForm] = useState({
    email: "",
    password: "",
  });

  const [loginErrors, setLoginErrors] = useState<{
    email?: string;
    password?: string;
  }>({});

  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginSubmitError, setLoginSubmitError] = useState<string | null>(
    null
  );
  const [loggedInPatient, setLoggedInPatient] =
    useState<AuthenticatedPatient | null>(null);

  const handleLoginChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    setLoginForm({
      ...loginForm,
      [name]: value,
    });

    if (loginErrors[name as "email" | "password"]) {
      setLoginErrors({
        ...loginErrors,
        [name]: undefined,
      });
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginSubmitError(null);

    const newErrors: { email?: string; password?: string } = {};

    if (!loginForm.email) {
      newErrors.email = "Este campo es obligatorio.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(loginForm.email)) {
      newErrors.email = "Ingresa un correo electrónico válido.";
    }

    if (!loginForm.password) {
      newErrors.password = "Este campo es obligatorio.";
    }

    setLoginErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      return;
    }

    setIsLoggingIn(true);
    try {
      const resultado = await login(loginForm.email, loginForm.password);

      // Mismo login para todos: el rol decide a qué vista va cada uno.
      if (resultado.rol === "medico") {
        saveMedicoSession(resultado.token, {
          id: resultado.medico.id,
          nombre: resultado.medico.nombre,
          email: resultado.medico.email,
          especialidad: resultado.medico.especialidad,
        });
        router.push("/medico/inicio");
        return;
      }

      const { paciente, token } = resultado;
      saveSession(token, {
        id: paciente.id,
        nombre: paciente.nombre,
        apellido: paciente.apellido,
        email: paciente.email,
      });
      setLoggedInPatient(paciente);
      router.push("/turnos/nuevo");
    } catch (error) {
      if (error instanceof LoginError) {
        setLoginSubmitError(error.message);
      } else {
        setLoginSubmitError(
          "Ocurrió un error inesperado. Intentá nuevamente."
        );
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white">MediTurnos</h1>
          <p className="text-slate-400 mt-2">Gestión de turnos médicos</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl">

          <div className="flex mb-6 border-b border-slate-800">
            <button
              type="button"
              onClick={() => setActiveTab("login")}
              className={`flex-1 pb-3 text-sm font-semibold transition ${
                activeTab === "login"
                  ? "text-cyan-400 border-b-2 border-cyan-400"
                  : "text-slate-400"
              }`}
            >
              Iniciar Sesión
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("registro")}
              className={`flex-1 pb-3 text-sm font-semibold transition ${
                activeTab === "registro"
                  ? "text-cyan-400 border-b-2 border-cyan-400"
                  : "text-slate-400"
              }`}
            >
              Registrarse
            </button>
          </div>

          {activeTab === "login" ? (
            loggedInPatient ? (
              <div className="text-center" role="status">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400 text-2xl">
                  ✓
                </div>
                <h2 className="text-2xl font-semibold text-white mb-2">
                  ¡Bienvenido/a, {loggedInPatient.nombre}!
                </h2>
                <p className="text-slate-400 text-sm">
                  Iniciaste sesión correctamente.
                </p>
              </div>
            ) : (
              <>
                <h2 className="text-2xl font-semibold text-white mb-2">
                  Iniciar sesión
                </h2>

                <p className="text-slate-400 text-sm mb-6">
                  Ingresá con tu correo y contraseña.
                </p>

                <form
                  onSubmit={handleLoginSubmit}
                  className="space-y-4"
                  noValidate
                >
                  <div>
                    <label className="block text-sm text-slate-300 mb-1">
                      Correo electrónico
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={loginForm.email}
                      onChange={handleLoginChange}
                      placeholder="Ingresá tu correo electrónico"
                      className={`w-full rounded-lg bg-slate-800 border px-4 py-3 text-white outline-none focus:border-cyan-400 ${
                        loginErrors.email
                          ? "border-red-500"
                          : "border-slate-700"
                      }`}
                    />
                    {loginErrors.email && (
                      <p className="text-red-500 text-xs mt-1">
                        {loginErrors.email}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm text-slate-300 mb-1">
                      Contraseña
                    </label>
                    <input
                      type="password"
                      name="password"
                      value={loginForm.password}
                      onChange={handleLoginChange}
                      placeholder="Ingresá tu contraseña"
                      className={`w-full rounded-lg bg-slate-800 border px-4 py-3 text-white outline-none focus:border-cyan-400 ${
                        loginErrors.password
                          ? "border-red-500"
                          : "border-slate-700"
                      }`}
                    />
                    {loginErrors.password && (
                      <p className="text-red-500 text-xs mt-1">
                        {loginErrors.password}
                      </p>
                    )}
                  </div>

                  {loginSubmitError && (
                    <div
                      role="alert"
                      className="rounded-lg border border-red-800/60 bg-red-950/40 px-4 py-3 text-sm text-red-300"
                    >
                      {loginSubmitError}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isLoggingIn}
                    className="w-full bg-cyan-500 hover:bg-cyan-400 disabled:bg-cyan-800 disabled:cursor-not-allowed text-slate-950 font-semibold rounded-lg py-3 mt-2 transition"
                  >
                    {isLoggingIn ? "Ingresando..." : "Ingresar"}
                  </button>
                </form>
              </>
            )
          ) : (
            <RegisterForm />
          )}
        </div>
      </div>
    </main>
  );
}
```

### `lib/services/authService.ts` — REEMPLAZAR

```typescript
import type { AuthenticatedMedico } from "@/lib/types/medico";

export interface AuthenticatedPatient {
  id: number;
  nombre: string;
  apellido: string;
  dni: string;
  fechaNacimiento: string;
  email: string;
  telefono: string;
  createdAt: string;
}

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ??
  "http://localhost:4000";

export class LoginError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "LoginError";
    this.status = status;
  }
}

/**
 * Login ÚNICO de pacientes y médicos (HU-02 + Portal del Médico).
 * El backend devuelve:
 * - 404 -> "El usuario no se encuentra registrado."
 * - 401 -> "Correo electrónico o contraseña incorrectos."
 * - 200 -> `rol` ("paciente" | "medico"), los datos públicos (nunca la
 *   contraseña) y un JWT que identifica la sesión. Según el rol, la
 *   pantalla guarda la sesión de paciente (lib/auth/session.ts) o la de
 *   médico (lib/auth/medicoSession.ts) y lleva a su vista.
 */
export type LoginResult =
  | { rol: "paciente"; paciente: AuthenticatedPatient; token: string }
  | { rol: "medico"; medico: AuthenticatedMedico; token: string };

export async function login(
  email: string,
  password: string
): Promise<LoginResult> {
  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
  } catch {
    throw new LoginError(
      0,
      "No se pudo conectar con el servidor. Verificá tu conexión e intentá nuevamente."
    );
  }

  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const body = (payload ?? {}) as { message?: string };
    throw new LoginError(
      response.status,
      body.message ?? "Ocurrió un error al iniciar sesión."
    );
  }

  const body = (payload ?? {}) as {
    rol?: string;
    paciente?: AuthenticatedPatient;
    medico?: AuthenticatedMedico;
    token?: string;
  };

  if (body.token && body.rol === "medico" && body.medico) {
    return { rol: "medico", medico: body.medico, token: body.token };
  }
  if (body.token && body.rol === "paciente" && body.paciente) {
    return { rol: "paciente", paciente: body.paciente, token: body.token };
  }

  throw new LoginError(response.status, "Respuesta inesperada del servidor.");
}
```

### `lib/types/turno.ts` — REEMPLAZAR

```typescript
/**
 * Tipos compartidos para solicitar un turno (HU-03) y consultar los
 * turnos del paciente (HU-04).
 */

export interface Especialidad {
  id: number;
  nombre: string;
}

export interface Profesional {
  id: number;
  nombre: string;
  info: string;
  especialidadId: number;
}

export interface HorarioDisponibilidad {
  hora: string;
  ocupado: boolean;
}

export interface TurnoCreatePayload {
  especialidadId: number;
  profesionalId: number;
  fecha: string; // YYYY-MM-DD
  hora: string; // HH:MM
}

export interface TurnoResponse {
  id: number;
  especialidadId: number;
  profesionalId: number;
  pacienteId: number | null;
  fecha: string;
  hora: string;
  createdAt: string;
}

export type TurnoCreateField = "especialidad" | "profesional" | "fecha" | "hora";

export type TurnoCreateErrors = Partial<Record<TurnoCreateField, string>>;

export interface ApiErrorResponse {
  message: string;
  errors?: TurnoCreateErrors;
}

/** Estados posibles de un turno (ver backend/src/modules/turnos/turno.constants.ts). */
export type EstadoTurno =
  | "confirmado"
  | "cancelado"
  | "atendido"
  | "pendiente";

/**
 * Turno tal como lo devuelve GET /api/turnos/mis-turnos (HU-04), con la
 * especialidad y el profesional ya resueltos.
 */
export interface MiTurno {
  id: number;
  fecha: string; // YYYY-MM-DD
  hora: string; // HH:MM
  estado: EstadoTurno;
  especialidad: {
    id: number;
    nombre: string;
  };
  profesional: {
    id: number;
    nombre: string;
    info: string;
  };
}
```

### `lib/turnos/misTurnos.ts` — REEMPLAZAR

```typescript
/**
 * HU-04 — Consultar mis turnos.
 *
 * Lógica pura (sin React ni fetch) de la pantalla "Mis turnos": mensajes
 * de los criterios de aceptación, orden, separación por pestañas y
 * formateo. Está separada para poder probarla con pruebas unitarias
 * (ver lib/turnos/misTurnos.test.ts).
 */

import type { EstadoTurno, MiTurno } from "@/lib/types/turno";

/** Criterio HU-04: "Si el paciente no posee turnos registrados". */
export const MENSAJE_SIN_TURNOS = "No posee turnos programados.";

/** Criterio HU-04: "Si ocurre un error al consultar la información". */
export const MENSAJE_ERROR_TURNOS = "No fue posible obtener los turnos.";

export const MENSAJE_SIN_CANCELADOS = "No posee turnos cancelados.";

export type PestanaTurnos = "proximos" | "cancelados";

export const PESTANAS: { id: PestanaTurnos; label: string }[] = [
  { id: "proximos", label: "Próximos" },
  { id: "cancelados", label: "Cancelados" },
];

export const ETIQUETA_ESTADO: Record<EstadoTurno, string> = {
  confirmado: "Confirmado",
  cancelado: "Cancelado",
  atendido: "Atendido",
  pendiente: "Pendiente",
};

const MESES_CORTOS = [
  "ENE",
  "FEB",
  "MAR",
  "ABR",
  "MAY",
  "JUN",
  "JUL",
  "AGO",
  "SEP",
  "OCT",
  "NOV",
  "DIC",
];

/** Fecha de hoy en formato YYYY-MM-DD, según la hora local del navegador. */
export function hoyISO(ahora: Date = new Date()): string {
  const y = ahora.getFullYear();
  const m = String(ahora.getMonth() + 1).padStart(2, "0");
  const d = String(ahora.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Ordena por fecha y hora ascendente (criterio: "Los turnos deberán
 * mostrarse ordenados por fecha"). No modifica el arreglo recibido.
 * Las fechas YYYY-MM-DD y horas HH:MM se pueden comparar como texto.
 */
export function ordenarTurnos(turnos: MiTurno[]): MiTurno[] {
  return [...turnos].sort((a, b) => {
    if (a.fecha !== b.fecha) return a.fecha < b.fecha ? -1 : 1;
    if (a.hora !== b.hora) return a.hora < b.hora ? -1 : 1;
    return a.id - b.id;
  });
}

/**
 * Separa los turnos en las pestañas de la pantalla, ya ordenados:
 * - Próximos: confirmados o pendientes de hoy en adelante (los turnos
 *   programados). "Pendiente" es un turno que el médico dejó a la espera.
 * - Cancelados: los que el paciente canceló (HU-05), de cualquier fecha.
 *
 * Los confirmados con fecha pasada no se muestran acá: corresponden al
 * Historial de turnos (HU-07).
 */
export function clasificarTurnos(
  turnos: MiTurno[],
  hoy: string = hoyISO()
): Record<PestanaTurnos, MiTurno[]> {
  const ordenados = ordenarTurnos(turnos);
  return {
    proximos: ordenados.filter(
      (t) => (t.estado === "confirmado" || t.estado === "pendiente") && t.fecha >= hoy
    ),
    cancelados: ordenados.filter((t) => t.estado === "cancelado"),
  };
}

/** Mensaje a mostrar cuando una pestaña no tiene turnos. */
export function mensajeSinTurnos(pestana: PestanaTurnos): string {
  return pestana === "proximos" ? MENSAJE_SIN_TURNOS : MENSAJE_SIN_CANCELADOS;
}

/** "2026-10-14" -> "14/10/2026" (sin pasar por Date, para evitar corrimientos de zona horaria). */
export function formatearFecha(fecha: string): string {
  const [y, m, d] = fecha.split("-");
  return `${d}/${m}/${y}`;
}

/** "2026-10-14" -> { dia: "14", mes: "OCT" } para el recuadro de la tarjeta. */
export function partesFecha(fecha: string): { dia: string; mes: string } {
  const [, m, d] = fecha.split("-");
  return { dia: String(Number(d)), mes: MESES_CORTOS[Number(m) - 1] ?? "" };
}

/**
 * Saca el consultorio del texto libre del profesional
 * ("Atiende lunes... Consultorio N° 7." -> "Consultorio N° 7").
 * Devuelve null si el texto no lo menciona.
 */
export function extraerConsultorio(info: string): string | null {
  const match = info.match(/Consultorio\s+N°\s*\d+/i);
  return match ? match[0] : null;
}
```

### `components/turnos/TurnoCard.tsx` — REEMPLAZAR

```tsx
// HU-04 — Tarjeta de un turno en "Mis turnos".
// Muestra los datos del criterio de aceptación: especialidad, profesional,
// fecha, horario y estado.
//
// `acciones` es el lugar para los botones de cada turno: HU-05 (Cancelar)
// y HU-06 (Reprogramar) los pasan desde la página sin tocar esta tarjeta.

import type { ReactNode } from "react";
import type { MiTurno } from "@/lib/types/turno";
import {
  ETIQUETA_ESTADO,
  extraerConsultorio,
  formatearFecha,
  partesFecha,
} from "@/lib/turnos/misTurnos";

const ESTILO_ESTADO: Record<MiTurno["estado"], string> = {
  confirmado: "bg-emerald-500/10 text-emerald-400",
  cancelado: "bg-red-500/10 text-red-400",
  atendido: "bg-cyan-500/10 text-cyan-400",
  pendiente: "bg-amber-500/10 text-amber-400",
};

interface TurnoCardProps {
  turno: MiTurno;
  acciones?: ReactNode;
}

export function TurnoCard({ turno, acciones }: TurnoCardProps) {
  const { dia, mes } = partesFecha(turno.fecha);
  const consultorio = extraerConsultorio(turno.profesional.info);
  const cancelado = turno.estado === "cancelado";

  return (
    <article
      data-testid="turno-card"
      className={
        "bg-slate-900 border border-slate-800 rounded-2xl p-5 flex items-center gap-5 " +
        (cancelado ? "opacity-70" : "")
      }
    >
      <div
        className="w-14 h-14 shrink-0 rounded-xl border border-slate-700 bg-slate-950 flex flex-col items-center justify-center"
        aria-label={formatearFecha(turno.fecha)}
      >
        <span className="text-white text-lg font-bold leading-none">{dia}</span>
        <span className="text-cyan-400 text-[10px] font-semibold tracking-wider mt-1">
          {mes}
        </span>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="text-white font-semibold">{turno.profesional.nombre}</h3>
          <span
            className={
              "text-xs font-semibold rounded-md px-2 py-0.5 " + ESTILO_ESTADO[turno.estado]
            }
          >
            {ETIQUETA_ESTADO[turno.estado]}
          </span>
        </div>
        <p className="text-slate-400 text-sm mt-1">{turno.especialidad.nombre}</p>
        <p className="text-slate-500 text-sm mt-1 flex flex-wrap gap-x-4 gap-y-1">
          <span>
            📅 {formatearFecha(turno.fecha)}
          </span>
          <span>🕒 {turno.hora} hs</span>
          {consultorio && <span>📍 {consultorio}</span>}
        </p>
      </div>

      {acciones && <div className="flex items-center gap-2 shrink-0">{acciones}</div>}
    </article>
  );
}
```

### `app/turnos/mis-turnos/page.tsx` — REEMPLAZAR

```tsx
"use client";

// HU-04 — Consultar mis turnos.
// HU-05 — Cancelar turno.
// HU-06 — Reprogramar turno.

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PatientShell } from "@/components/layout/PatientShell";
import { TurnoCard } from "@/components/turnos/TurnoCard";
import ModalReprogramar from "@/components/turnos/ModalReprogramar";
import { clearSession } from "@/lib/auth/session";
import { useSessionPatient } from "@/lib/auth/useSessionPatient";
import {
  cancelarTurno,
  getMisTurnos,
  TurnoRequestError,
} from "@/lib/services/turnoService";
import {
  clasificarTurnos,
  MENSAJE_ERROR_TURNOS,
  mensajeSinTurnos,
  PESTANAS,
  type PestanaTurnos,
} from "@/lib/turnos/misTurnos";
import type { MiTurno } from "@/lib/types/turno";

/**
 * Devuelve la fecha actual en formato YYYY-MM-DD,
 * utilizando la fecha local del navegador.
 */
function hoyISO(): string {
  const hoy = new Date();
  const anio = hoy.getFullYear();
  const mes = String(hoy.getMonth() + 1).padStart(2, "0");
  const dia = String(hoy.getDate()).padStart(2, "0");

  return `${anio}-${mes}-${dia}`;
}

export default function MisTurnosPage() {
  const router = useRouter();
  const sessionPatient = useSessionPatient();

  const [turnos, setTurnos] = useState<MiTurno[]>([]);
  const [cargando, setCargando] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [pestana, setPestana] = useState<PestanaTurnos>("proximos");
  const [recarga, setRecarga] = useState(0);

  const [cancelandoId, setCancelandoId] = useState<number | null>(null);
  const [errorCancelar, setErrorCancelar] = useState("");
  const [mensajeCancelar, setMensajeCancelar] = useState("");

  // HU-06: turno que se está reprogramando (abre el modal).
  const [turnoAReprogramar, setTurnoAReprogramar] = useState<MiTurno | null>(null);

  const cerrarSesionYSalir = useCallback(() => {
    clearSession();
    router.replace("/");
  }, [router]);

  /**
   * Actualiza la lista después de cancelar un turno.
   * No activa la pantalla de carga completa.
   */
  const cargarTurnos = useCallback(() => {
    setRecarga((n) => n + 1);
  }, []);

  function reintentar() {
    setCargando(true);
    setErrorMsg("");
    cargarTurnos();
  }

  // Verifica la sesión y consulta los turnos del paciente.
  useEffect(() => {
    if (sessionPatient === undefined) return;

    if (sessionPatient === null) {
      router.replace("/");
      return;
    }

    let vigente = true;

    getMisTurnos()
      .then((data) => {
        if (!vigente) return;

        setTurnos(data);
        setErrorMsg("");
      })
      .catch((err) => {
        if (!vigente) return;

        if (err instanceof TurnoRequestError && err.status === 401) {
          cerrarSesionYSalir();
          return;
        }

        setErrorMsg(MENSAJE_ERROR_TURNOS);
      })
      .finally(() => {
        if (vigente) {
          setCargando(false);
        }
      });

    return () => {
      vigente = false;
    };
  }, [sessionPatient, router, cerrarSesionYSalir, recarga]);

  const porPestana = useMemo(
    () => clasificarTurnos(turnos),
    [turnos]
  );

  const turnosVisibles = porPestana[pestana];

  /**
   * Botones de cada turno confirmado con fecha de hoy en adelante:
   * - HU-06: "Reprogramar" abre el modal para elegir nueva fecha y horario.
   * - HU-05: "Cancelar" pide confirmación y cancela el turno.
   */
  function renderAcciones(turno: MiTurno) {
    if (
      (turno.estado !== "confirmado" && turno.estado !== "pendiente") ||
      turno.fecha < hoyISO()
    ) {
      return null;
    }

    const procesando = cancelandoId === turno.id;

    async function manejarCancelacion() {
      const confirmar = window.confirm(
        "¿Está seguro de que desea cancelar este turno?"
      );

      if (!confirmar) return;

      setCancelandoId(turno.id);
      setErrorCancelar("");
      setMensajeCancelar("");

      try {
        await cancelarTurno(turno.id);

        setMensajeCancelar("Turno cancelado correctamente.");
        cargarTurnos();
      } catch (error) {
        if (
          error instanceof TurnoRequestError &&
          error.status === 401
        ) {
          cerrarSesionYSalir();
          return;
        }

        setErrorCancelar(
          error instanceof TurnoRequestError
            ? error.message
            : "No fue posible cancelar el turno. Intente nuevamente."
        );
      } finally {
        setCancelandoId(null);
      }
    }

    return (
      <>
        <button
          type="button"
          onClick={() => {
            setMensajeCancelar("");
            setErrorCancelar("");
            setTurnoAReprogramar(turno);
          }}
          disabled={cancelandoId !== null}
          className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-700 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          Reprogramar
        </button>
        <button
        type="button"
        onClick={manejarCancelacion}
        disabled={cancelandoId !== null}
        className="rounded-lg border border-red-500/40 px-3 py-2 text-sm font-medium text-red-400 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {procesando ? "Cancelando..." : "Cancelar"}
      </button>
      </>
    );
  }

  if (!sessionPatient) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <p className="text-slate-500 text-sm">
          Verificando sesión...
        </p>
      </div>
    );
  }

  return (
    <PatientShell
      paciente={sessionPatient}
      onCerrarSesion={cerrarSesionYSalir}
    >
      <main className="flex-1 px-8 py-8">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-white">
              Mis Turnos
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Gestioná tus turnos médicos
            </p>
          </div>

          <Link
            href="/turnos/nuevo"
            className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold rounded-lg px-4 py-2.5 text-sm transition"
          >
            + Nuevo Turno
          </Link>
        </div>

        {/* Pestañas por estado */}
        <div
          role="tablist"
          aria-label="Filtrar turnos"
          className="inline-flex gap-1 bg-slate-900 border border-slate-800 rounded-xl p-1 mt-6"
        >
          {PESTANAS.map((p) => {
            const activa = pestana === p.id;

            return (
              <button
                key={p.id}
                type="button"
                role="tab"
                aria-selected={activa}
                onClick={() => setPestana(p.id)}
                className={
                  "flex items-center gap-2 rounded-lg px-4 py-2 text-sm transition " +
                  (activa
                    ? "bg-cyan-500 text-slate-950 font-semibold"
                    : "text-slate-300 hover:bg-slate-800")
                }
              >
                {p.label}

                <span
                  className={
                    "text-xs rounded-full px-2 py-0.5 " +
                    (activa
                      ? "bg-slate-950/20"
                      : "bg-slate-800 text-slate-400")
                  }
                >
                  {cargando || errorMsg
                    ? "–"
                    : porPestana[p.id].length}
                </span>
              </button>
            );
          })}
        </div>

        <section
          className="mt-6 space-y-3 max-w-4xl"
          aria-live="polite"
        >
          {mensajeCancelar && (
            <p role="status" className="text-emerald-400 text-sm">
              {mensajeCancelar}
            </p>
          )}

          {errorCancelar && (
            <p role="alert" className="text-red-400 text-sm">
              {errorCancelar}
            </p>
          )}

          {cargando ? (
            <p className="text-slate-500 text-sm">
              Cargando turnos...
            </p>
          ) : errorMsg ? (
            <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-6">
              <p className="text-red-400 text-sm">{errorMsg}</p>

              <button
                type="button"
                onClick={reintentar}
                className="mt-3 text-sm text-slate-200 border border-slate-700 hover:border-cyan-500/60 rounded-lg px-4 py-2 transition"
              >
                Reintentar
              </button>
            </div>
          ) : turnosVisibles.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center">
              <p className="text-slate-300">
                {mensajeSinTurnos(pestana)}
              </p>

              {pestana === "proximos" && (
                <Link
                  href="/turnos/nuevo"
                  className="inline-block mt-4 text-sm text-cyan-400 hover:text-cyan-300"
                >
                  Solicitar un turno
                </Link>
              )}
            </div>
          ) : (
            turnosVisibles.map((turno) => (
              <TurnoCard
                key={turno.id}
                turno={turno}
                acciones={renderAcciones(turno)}
              />
            ))
          )}
        </section>

        {turnoAReprogramar && (
          <ModalReprogramar
            turno={turnoAReprogramar}
            onClose={() => setTurnoAReprogramar(null)}
            onSuccess={() => {
              setTurnoAReprogramar(null);
              cargarTurnos();
            }}
          />
        )}
      </main>
    </PatientShell>
  );
}
```

## 12. Tipos, sesión y servicio del médico (nuevos)

### `lib/types/medico.ts` — NUEVO

```typescript
import type { EstadoTurno } from "@/lib/types/turno";

/** Médico autenticado, tal como lo devuelve POST /api/auth/medico/login. */
export interface AuthenticatedMedico {
  id: number;
  nombre: string;
  email: string;
  especialidad: string;
}

export interface PacienteDeTurno {
  id: number;
  nombre: string;
  apellido: string;
  dni: string;
  obraSocial: string | null;
  telefono: string;
}

export interface TurnoDelDia {
  id: number;
  fecha: string; // YYYY-MM-DD
  hora: string; // HH:MM
  estado: EstadoTurno;
  paciente: PacienteDeTurno | null;
}

export interface MetricasDelDia {
  turnosHoy: number;
  confirmados: number;
  pendientes: number;
  cancelados: number;
  atendidos: number;
}

export interface DashboardMedico {
  fecha: string; // YYYY-MM-DD del día consultado
  hoy: string; // YYYY-MM-DD de hoy (hora de Argentina)
  metricas: MetricasDelDia;
  turnos: TurnoDelDia[];
}

export interface PacienteAtendido extends PacienteDeTurno {
  ultimaVisita: string; // YYYY-MM-DD
  totalVisitas: number;
}

export interface PerfilMedico {
  id: number;
  nombre: string;
  email: string;
  matricula: string | null;
  telefono: string | null;
  diasAtencion: string | null;
  info: string;
  especialidad: {
    id: number;
    nombre: string;
  };
}

/** Estados que el médico puede asignar a un turno. */
export type EstadoAsignable = "atendido" | "pendiente";

/** Lo que el médico puede editar de su perfil. */
export interface ActualizarPerfilInput {
  diasAtencion: string;
  info: string;
}
```

### `lib/auth/medicoSession.ts` — NUEVO

```typescript
/**
 * Sesión del médico (Portal del Médico), persistida en localStorage.
 *
 * Usa una clave PROPIA ("mediturnos_medico_session"), distinta a la del
 * paciente ("mediturnos_session", ver lib/auth/session.ts), para que las dos
 * sesiones no se pisen ni se mezclen: el token de un médico nunca se envía
 * en las pantallas del paciente y viceversa.
 */

export interface SessionMedico {
  id: number;
  nombre: string;
  email: string;
  especialidad: string;
}

export const MEDICO_STORAGE_KEY = "mediturnos_medico_session";

interface StoredMedicoSession {
  token: string;
  medico: SessionMedico;
}

export function saveMedicoSession(token: string, medico: SessionMedico): void {
  if (typeof window === "undefined") return;
  const data: StoredMedicoSession = { token, medico };
  window.localStorage.setItem(MEDICO_STORAGE_KEY, JSON.stringify(data));
}

export function getMedicoSession(): StoredMedicoSession | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(MEDICO_STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredMedicoSession;
  } catch {
    return null;
  }
}

export function getMedicoToken(): string | null {
  return getMedicoSession()?.token ?? null;
}

export function clearMedicoSession(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(MEDICO_STORAGE_KEY);
}
```

### `lib/auth/useSessionMedico.ts` — NUEVO

```typescript
"use client";

import { useMemo, useSyncExternalStore } from "react";
import {
  MEDICO_STORAGE_KEY,
  type SessionMedico,
} from "@/lib/auth/medicoSession";

/**
 * Lee el médico logueado de localStorage (ver lib/auth/medicoSession.ts) sin
 * romper la hidratación de Next.js. Mismo contrato que useSessionPatient:
 * - `undefined` mientras se hidrata.
 * - `null` si no hay sesión.
 * - el médico si hay sesión.
 */
function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}

export function useSessionMedico(): SessionMedico | null | undefined {
  const raw = useSyncExternalStore(
    subscribe,
    () => window.localStorage.getItem(MEDICO_STORAGE_KEY),
    () => undefined
  );

  return useMemo(() => {
    if (raw === undefined) return undefined;
    if (raw === null) return null;
    try {
      return (JSON.parse(raw) as { medico: SessionMedico }).medico ?? null;
    } catch {
      return null;
    }
  }, [raw]);
}
```

### `lib/auth/useRequireMedico.ts` — NUEVO

```typescript
"use client";

import { useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { clearMedicoSession, type SessionMedico } from "@/lib/auth/medicoSession";
import { useSessionMedico } from "@/lib/auth/useSessionMedico";

// El médico entra por el mismo login que el paciente (la pantalla inicial).
export const LOGIN_PATH = "/";

/**
 * Guarda de las pantallas del Portal del Médico.
 * - Si no hay sesión de médico, redirige al login (/).
 * - `cerrarSesion` borra la sesión del médico (no toca la del paciente) y
 *   vuelve al login (/). También se usa cuando la API responde 401 (token
 *   vencido o inválido).
 *
 * `medico` es `undefined` mientras se hidrata y `null` si no hay sesión:
 * en ambos casos la página debe mostrar "Verificando sesión...".
 */
export function useRequireMedico(): {
  medico: SessionMedico | null | undefined;
  cerrarSesion: () => void;
} {
  const router = useRouter();
  const medico = useSessionMedico();

  const cerrarSesion = useCallback(() => {
    clearMedicoSession();
    router.replace(LOGIN_PATH);
  }, [router]);

  useEffect(() => {
    if (medico === null) {
      router.replace(LOGIN_PATH);
    }
  }, [medico, router]);

  return { medico, cerrarSesion };
}
```

### `lib/services/medicoService.ts` — NUEVO

```typescript
import type {
  ActualizarPerfilInput,
  DashboardMedico,
  EstadoAsignable,
  PacienteAtendido,
  PerfilMedico,
} from "@/lib/types/medico";
import type { EstadoTurno } from "@/lib/types/turno";
import { getMedicoToken } from "@/lib/auth/medicoSession";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ??
  "http://localhost:4000";

const MENSAJE_SIN_CONEXION =
  "No se pudo conectar con el servidor. Verificá tu conexión e intentá nuevamente.";

/**
 * Error de cualquier pedido del Portal del Médico. `status` 0 = sin conexión;
 * 401 = sesión inválida o vencida (la pantalla debe cerrar la sesión).
 */
export class MedicoRequestError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "MedicoRequestError";
    this.status = status;
  }
}

async function parseJsonSafe(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

/**
 * Hace un pedido a la API usando SIEMPRE el JWT del médico (clave de sesión
 * propia, ver lib/auth/medicoSession.ts) y devuelve el JSON ya parseado.
 */
async function medicoRequest<T>(
  path: string,
  init: { method?: string; body?: unknown } = {}
): Promise<T> {
  const token = getMedicoToken();
  if (!token) {
    throw new MedicoRequestError(401, "Debe iniciar sesión para continuar.");
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: init.method ?? "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        ...(init.body !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
      cache: "no-store",
    });
  } catch {
    throw new MedicoRequestError(0, MENSAJE_SIN_CONEXION);
  }

  const payload = await parseJsonSafe(response);

  if (!response.ok) {
    const body = (payload ?? {}) as { message?: string };
    throw new MedicoRequestError(
      response.status,
      body.message ?? "Ocurrió un error al procesar el pedido."
    );
  }

  return (payload ?? {}) as T;
}

/**
 * GET /api/medicos/dashboard[?fecha=YYYY-MM-DD]: métricas y turnos del día.
 * Sin fecha devuelve hoy; con fecha, un día anterior o próximo.
 */
export async function getDashboard(fecha?: string): Promise<DashboardMedico> {
  const query = fecha ? `?fecha=${encodeURIComponent(fecha)}` : "";
  return medicoRequest<DashboardMedico>(`/api/medicos/dashboard${query}`);
}

/** GET /api/medicos/pacientes: pacientes únicos atendidos. */
export async function getPacientes(): Promise<PacienteAtendido[]> {
  const body = await medicoRequest<{ pacientes?: PacienteAtendido[] }>(
    "/api/medicos/pacientes"
  );
  return body.pacientes ?? [];
}

/** GET /api/medicos/perfil: datos del médico autenticado. */
export async function getPerfil(): Promise<PerfilMedico> {
  const body = await medicoRequest<{ perfil?: PerfilMedico }>("/api/medicos/perfil");
  if (!body.perfil) {
    throw new MedicoRequestError(500, "Respuesta inesperada del servidor.");
  }
  return body.perfil;
}

/** PATCH /api/medicos/perfil: edita días de atención y horario/detalle. */
export async function actualizarPerfil(
  input: ActualizarPerfilInput
): Promise<PerfilMedico> {
  const body = await medicoRequest<{ perfil?: PerfilMedico }>("/api/medicos/perfil", {
    method: "PATCH",
    body: input,
  });
  if (!body.perfil) {
    throw new MedicoRequestError(500, "Respuesta inesperada del servidor.");
  }
  return body.perfil;
}

/** PUT /api/turnos/:id/reprogramar-medico: mueve un turno propio a otra fecha/hora. */
export async function reprogramarTurnoMedico(
  turnoId: number,
  fecha: string,
  hora: string
): Promise<{ id: number; fecha: string; hora: string; estado: EstadoTurno }> {
  const body = await medicoRequest<{
    turno?: { id: number; fecha: string; hora: string; estado: EstadoTurno };
  }>(`/api/turnos/${turnoId}/reprogramar-medico`, {
    method: "PUT",
    body: { fecha, hora },
  });
  if (!body.turno) {
    throw new MedicoRequestError(500, "Respuesta inesperada del servidor.");
  }
  return body.turno;
}

/** PATCH /api/turnos/:id/estado: marca un turno propio como atendido/pendiente. */
export async function actualizarEstadoTurno(
  turnoId: number,
  estado: EstadoAsignable
): Promise<{ id: number; estado: EstadoTurno }> {
  const body = await medicoRequest<{ turno?: { id: number; estado: EstadoTurno } }>(
    `/api/turnos/${turnoId}/estado`,
    { method: "PATCH", body: { estado } }
  );
  if (!body.turno) {
    throw new MedicoRequestError(500, "Respuesta inesperada del servidor.");
  }
  return body.turno;
}
```

## 13. Layout y componentes (nuevos)

### `components/layout/DoctorShell.tsx` — NUEVO

```tsx
"use client";

// Estructura común de las pantallas del Portal del Médico: menú lateral +
// barra superior con el nombre real del médico (de su sesión) y "Salir".
// Mismo estilo que PatientShell para que las dos áreas se vean parte de la
// misma aplicación.

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import type { SessionMedico } from "@/lib/auth/medicoSession";

interface NavItem {
  label: string;
  href: string;
}

const NAV_ITEMS: NavItem[] = [
  { label: "Inicio", href: "/medico/inicio" },
  { label: "Mis Pacientes", href: "/medico/pacientes" },
  { label: "Mi Perfil", href: "/medico/perfil" },
];

interface DoctorShellProps {
  medico: SessionMedico;
  onCerrarSesion: () => void;
  children: ReactNode;
}

export function DoctorShell({ medico, onCerrarSesion, children }: DoctorShellProps) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-slate-950 flex">
      {/* Sidebar (menú principal) */}
      <aside className="w-60 shrink-0 border-r border-slate-800 bg-slate-900/40 flex flex-col">
        <div className="h-16 flex items-center gap-2 px-5 border-b border-slate-800">
          <span className="w-7 h-7 rounded-full bg-cyan-500 flex items-center justify-center text-slate-950">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-4 h-4"
            >
              <path d="M11 2v2" />
              <path d="M5 2v2" />
              <path d="M5 3H4a2 2 0 0 0-2 2v4a6 6 0 0 0 12 0V5a2 2 0 0 0-2-2h-1" />
              <path d="M8 15a6 6 0 0 0 12 0v-3" />
              <circle cx="20" cy="10" r="2" />
            </svg>
          </span>
          <div className="leading-tight">
            <span className="block text-white font-semibold tracking-wide text-sm">
              MEDITURNOS
            </span>
            <span className="block text-cyan-400 text-[10px] font-semibold tracking-wider">
              PORTAL MÉDICO
            </span>
          </div>
        </div>

        <nav aria-label="Menú principal" className="flex-1 px-3 py-4 space-y-1">
          {NAV_ITEMS.map((item) => {
            const activo = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={activo ? "page" : undefined}
                className={
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm " +
                  (activo
                    ? "bg-cyan-500 text-slate-950 font-semibold"
                    : "text-slate-300 hover:bg-slate-800")
                }
              >
                <span
                  className={
                    "w-1.5 h-1.5 rounded-full " + (activo ? "bg-slate-950" : "bg-slate-600")
                  }
                />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Columna principal */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-slate-800 flex items-center justify-end px-8 gap-4">
          <span className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-300 text-sm">
            🩺
          </span>
          <div className="text-right leading-tight">
            <span className="block text-slate-200 text-sm">{medico.nombre}</span>
            {medico.especialidad && (
              <span className="block text-slate-500 text-xs">{medico.especialidad}</span>
            )}
          </div>
          <button
            type="button"
            onClick={onCerrarSesion}
            className="text-slate-500 hover:text-red-400 text-xs transition"
          >
            Salir
          </button>
        </header>

        {children}
      </div>
    </div>
  );
}
```

### `components/medico/ModalReprogramarMedico.tsx` — NUEVO

```tsx
"use client";

// Portal del Médico — modal para reprogramar el turno de un paciente.
// Los horarios libres salen del mismo endpoint público que usa el paciente
// (GET /api/turnos/horarios-disponibles), consultado para el médico logueado.

import { useEffect, useState } from "react";
import { getHorariosDisponibilidad } from "@/lib/services/turnoService";
import {
  MedicoRequestError,
  reprogramarTurnoMedico,
} from "@/lib/services/medicoService";
import { formatearFecha, hoyISO } from "@/lib/turnos/misTurnos";
import type { TurnoDelDia } from "@/lib/types/medico";
import type { HorarioDisponibilidad } from "@/lib/types/turno";

interface ModalReprogramarMedicoProps {
  turno: TurnoDelDia;
  profesionalId: number;
  onClose: () => void;
  /** Se llama después de reprogramar con éxito (la pantalla recarga la agenda). */
  onSuccess: () => void;
  /** Se llama si la API responde 401 (sesión vencida). */
  onSesionInvalida: () => void;
}

/** Hora local del navegador en formato HH:MM. */
function horaActual(): string {
  const ahora = new Date();
  return `${String(ahora.getHours()).padStart(2, "0")}:${String(
    ahora.getMinutes()
  ).padStart(2, "0")}`;
}

export default function ModalReprogramarMedico({
  turno,
  profesionalId,
  onClose,
  onSuccess,
  onSesionInvalida,
}: ModalReprogramarMedicoProps) {
  const [fecha, setFecha] = useState("");
  const [hora, setHora] = useState("");
  // Horarios cargados para una fecha puntual; se descartan si la fecha cambió.
  const [cargados, setCargados] = useState<{
    fecha: string;
    lista: HorarioDisponibilidad[];
  } | null>(null);
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);

  const horarios = cargados && cargados.fecha === fecha ? cargados.lista : [];
  const cargandoHorarios = fecha !== "" && !(cargados && cargados.fecha === fecha);
  const hoy = hoyISO();

  useEffect(() => {
    if (!fecha) return;

    let vigente = true;
    getHorariosDisponibilidad(profesionalId, fecha)
      .then((lista) => {
        if (vigente) setCargados({ fecha, lista });
      })
      .catch(() => {
        if (vigente) setError("Error al cargar los horarios.");
      });

    return () => {
      vigente = false;
    };
  }, [fecha, profesionalId]);

  function cambiarFecha(nueva: string) {
    setFecha(nueva);
    setHora("");
    setError("");
  }

  async function confirmar() {
    setError("");
    setGuardando(true);
    try {
      await reprogramarTurnoMedico(turno.id, fecha, hora);
      onSuccess();
    } catch (err) {
      if (err instanceof MedicoRequestError && err.status === 401) {
        onSesionInvalida();
        return;
      }
      setError(
        err instanceof MedicoRequestError
          ? err.message
          : "No fue posible reprogramar el turno. Intente nuevamente."
      );
    } finally {
      setGuardando(false);
    }
  }

  const paciente = turno.paciente
    ? `${turno.paciente.apellido}, ${turno.paciente.nombre}`
    : "el paciente";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="titulo-reprogramar-medico"
      className="fixed inset-0 bg-slate-950/80 flex items-center justify-center p-4 z-50"
    >
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <h2 id="titulo-reprogramar-medico" className="text-xl font-bold text-white mb-2">
          Reprogramar turno
        </h2>
        <p className="text-sm text-slate-400 mb-6">
          Turno de {paciente}: {formatearFecha(turno.fecha)} a las {turno.hora} hs.
        </p>

        <div className="space-y-4">
          <div>
            <label htmlFor="reprogramar-fecha" className="block text-sm text-slate-300 mb-1">
              Nueva fecha
            </label>
            <input
              id="reprogramar-fecha"
              type="date"
              value={fecha}
              min={hoy}
              onChange={(e) => cambiarFecha(e.target.value)}
              className="w-full rounded-lg bg-slate-800 border border-slate-700 px-4 py-3 text-white outline-none focus:border-cyan-400"
            />
          </div>

          {cargandoHorarios && !error && (
            <p className="text-slate-500 text-sm" role="status">
              Cargando horarios...
            </p>
          )}

          {horarios.length > 0 && (
            <div>
              <span className="block text-sm text-slate-300 mb-1">Nuevo horario</span>
              <div className="grid grid-cols-3 gap-2">
                {horarios.map((h) => {
                  const pasado = fecha === hoy && h.hora <= horaActual();
                  const deshabilitado = h.ocupado || pasado;
                  return (
                    <button
                      key={h.hora}
                      type="button"
                      disabled={deshabilitado}
                      onClick={() => setHora(h.hora)}
                      className={`py-2 text-xs rounded-lg border transition ${
                        hora === h.hora
                          ? "bg-cyan-500 border-cyan-500 text-slate-950 font-semibold"
                          : deshabilitado
                          ? "border-slate-800 text-slate-600 line-through cursor-not-allowed"
                          : "border-slate-700 text-slate-300 hover:border-cyan-500/60"
                      }`}
                    >
                      {h.hora}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {error && (
            <p role="alert" className="text-red-400 text-sm">
              {error}
            </p>
          )}

          <div className="flex gap-3 mt-8">
            <button
              type="button"
              onClick={onClose}
              disabled={guardando}
              className="flex-1 py-3 rounded-lg text-slate-300 hover:bg-slate-800 transition"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={!fecha || !hora || guardando}
              onClick={confirmar}
              className="flex-1 bg-cyan-500 hover:bg-cyan-400 disabled:bg-cyan-800 disabled:cursor-not-allowed text-slate-950 font-semibold rounded-lg py-3 transition"
            >
              {guardando ? "Guardando..." : "Confirmar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
```

## 14. Pantallas del médico

### `app/medico/page.tsx` — NUEVO

```tsx
import { redirect } from "next/navigation";

// /medico no tiene contenido propio: lleva al dashboard (que a su vez
// redirige al login si no hay sesión de médico).
export default function MedicoIndexPage() {
  redirect("/medico/inicio");
}
```

### `app/medico/login/page.tsx` — REEMPLAZAR

```tsx
import { redirect } from "next/navigation";

// Ya no hay un login especial para médicos: entran por el mismo login que los
// pacientes (la pantalla inicial) y el sistema los lleva a su vista. Esta ruta
// queda solo para que los enlaces viejos no den error.
export default function MedicoLoginRedirectPage() {
  redirect("/");
}
```

### `app/medico/inicio/page.tsx` — NUEVO

```tsx
"use client";

// Portal del Médico — dashboard: métricas del día y agenda de hoy.

import { useCallback, useEffect, useMemo, useState } from "react";
import { DoctorShell } from "@/components/layout/DoctorShell";
import ModalReprogramarMedico from "@/components/medico/ModalReprogramarMedico";
import { useRequireMedico } from "@/lib/auth/useRequireMedico";
import {
  actualizarEstadoTurno,
  getDashboard,
  MedicoRequestError,
} from "@/lib/services/medicoService";
import { ETIQUETA_ESTADO } from "@/lib/turnos/misTurnos";
import type {
  DashboardMedico,
  EstadoAsignable,
  MetricasDelDia,
  TurnoDelDia,
} from "@/lib/types/medico";
import type { EstadoTurno } from "@/lib/types/turno";

const MENSAJE_ERROR_DASHBOARD = "No fue posible obtener la agenda del día.";

/** Suma (o resta) días a una fecha YYYY-MM-DD sin pasar por la zona horaria. */
function sumarDias(fecha: string, dias: number): string {
  const [y, m, d] = fecha.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + dias)).toISOString().slice(0, 10);
}

const ESTILO_ESTADO: Record<EstadoTurno, string> = {
  confirmado: "bg-emerald-500/10 text-emerald-400",
  cancelado: "bg-red-500/10 text-red-400",
  atendido: "bg-cyan-500/10 text-cyan-400",
  pendiente: "bg-amber-500/10 text-amber-400",
};

/** Recalcula las métricas a partir de la lista (se usa al cambiar un estado). */
function calcularMetricas(turnos: TurnoDelDia[]): MetricasDelDia {
  const metricas: MetricasDelDia = {
    turnosHoy: turnos.length,
    confirmados: 0,
    pendientes: 0,
    cancelados: 0,
    atendidos: 0,
  };
  for (const t of turnos) {
    if (t.estado === "confirmado") metricas.confirmados += 1;
    else if (t.estado === "pendiente") metricas.pendientes += 1;
    else if (t.estado === "cancelado") metricas.cancelados += 1;
    else if (t.estado === "atendido") metricas.atendidos += 1;
  }
  return metricas;
}

/** "2026-11-02" -> "Lunes, 2 de noviembre" (sin pasar por UTC para evitar corrimientos). */
function fechaLarga(fecha: string): string {
  const [y, m, d] = fecha.split("-").map(Number);
  const texto = new Date(y, m - 1, d).toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

interface TarjetaMetrica {
  clave: keyof MetricasDelDia;
  titulo: string;
  color: string;
}

const TARJETAS: TarjetaMetrica[] = [
  { clave: "turnosHoy", titulo: "Turnos hoy", color: "text-white" }, // "Turnos del día" si no es hoy
  { clave: "confirmados", titulo: "Confirmados", color: "text-emerald-400" },
  { clave: "pendientes", titulo: "Pendientes", color: "text-amber-400" },
  { clave: "atendidos", titulo: "Atendidos", color: "text-cyan-400" },
  { clave: "cancelados", titulo: "Cancelados", color: "text-red-400" },
];

export default function MedicoInicioPage() {
  const { medico, cerrarSesion } = useRequireMedico();

  // Día que se está mirando. "" = hoy (lo resuelve el servidor, hora de Argentina).
  const [fechaSel, setFechaSel] = useState("");
  const [dashboard, setDashboard] = useState<DashboardMedico | null>(null);
  const [cargando, setCargando] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [recarga, setRecarga] = useState(0);

  const [actualizandoId, setActualizandoId] = useState<number | null>(null);
  const [errorEstado, setErrorEstado] = useState("");

  // Turno que se está reprogramando (abre el modal) y aviso de éxito.
  const [turnoAReprogramar, setTurnoAReprogramar] = useState<TurnoDelDia | null>(null);
  const [mensajeOk, setMensajeOk] = useState("");

  useEffect(() => {
    if (!medico) return;

    let vigente = true;

    getDashboard(fechaSel || undefined)
      .then((data) => {
        if (!vigente) return;
        setDashboard(data);
        setErrorMsg("");
      })
      .catch((err) => {
        if (!vigente) return;
        if (err instanceof MedicoRequestError && err.status === 401) {
          cerrarSesion();
          return;
        }
        setErrorMsg(MENSAJE_ERROR_DASHBOARD);
      })
      .finally(() => {
        if (vigente) setCargando(false);
      });

    return () => {
      vigente = false;
    };
  }, [medico, cerrarSesion, recarga, fechaSel]);

  /** Cambia el día que se mira (anterior, próximo, "Hoy" o elegido en el calendario). */
  const irAFecha = useCallback((fecha: string) => {
    setFechaSel(fecha);
    setCargando(true);
    setErrorMsg("");
    setErrorEstado("");
    setMensajeOk("");
  }, []);

  const reintentar = useCallback(() => {
    setCargando(true);
    setErrorMsg("");
    setRecarga((n) => n + 1);
  }, []);

  const alReprogramar = useCallback(() => {
    setTurnoAReprogramar(null);
    setMensajeOk("El turno fue reprogramado correctamente.");
    setErrorEstado("");
    // Recarga la agenda: si el turno se movió a otro día, deja de figurar hoy.
    setRecarga((n) => n + 1);
  }, []);

  const cambiarEstado = useCallback(
    async (turno: TurnoDelDia, estado: EstadoAsignable) => {
      setActualizandoId(turno.id);
      setErrorEstado("");
      setMensajeOk("");

      try {
        const actualizado = await actualizarEstadoTurno(turno.id, estado);
        setDashboard((prev) => {
          if (!prev) return prev;
          const turnos = prev.turnos.map((t) =>
            t.id === actualizado.id ? { ...t, estado: actualizado.estado } : t
          );
          return { ...prev, turnos, metricas: calcularMetricas(turnos) };
        });
      } catch (err) {
        if (err instanceof MedicoRequestError && err.status === 401) {
          cerrarSesion();
          return;
        }
        setErrorEstado(
          err instanceof MedicoRequestError
            ? err.message
            : "No fue posible actualizar el estado del turno. Intente nuevamente."
        );
      } finally {
        setActualizandoId(null);
      }
    },
    [cerrarSesion]
  );

  const metricas = useMemo(
    () => dashboard?.metricas ?? null,
    [dashboard]
  );

  // Día mostrado respecto de hoy: define qué acciones tiene cada turno.
  const fechaMostrada = dashboard?.fecha ?? fechaSel;
  const hoy = dashboard?.hoy ?? "";
  const esHoy = Boolean(dashboard) && fechaMostrada === hoy;
  const esPasado = Boolean(dashboard) && fechaMostrada < hoy;
  const esFuturo = Boolean(dashboard) && fechaMostrada > hoy;

  if (!medico) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <p className="text-slate-500 text-sm">Verificando sesión...</p>
      </div>
    );
  }

  return (
    <DoctorShell medico={medico} onCerrarSesion={cerrarSesion}>
      <main className="flex-1 px-8 py-8">
        <h1 className="text-2xl font-bold text-white">Hola, {medico.nombre}</h1>
        <p className="text-slate-400 text-sm mt-1">
          {!dashboard
            ? "Agenda"
            : esHoy
            ? `Agenda de hoy · ${fechaLarga(dashboard.fecha)}`
            : `Agenda del ${fechaLarga(dashboard.fecha)}`}
          {esPasado && (
            <span className="ml-2 rounded-md bg-slate-800 px-2 py-0.5 text-xs text-slate-400">
              Día anterior
            </span>
          )}
          {esFuturo && (
            <span className="ml-2 rounded-md bg-cyan-500/10 px-2 py-0.5 text-xs text-cyan-400">
              Día próximo
            </span>
          )}
        </p>

        {/* Selector de fecha: días anteriores y próximos */}
        <div
          role="group"
          aria-label="Elegir día"
          className="mt-5 flex flex-wrap items-center gap-2"
        >
          <button
            type="button"
            aria-label="Día anterior"
            onClick={() => irAFecha(sumarDias(fechaMostrada, -1))}
            disabled={!dashboard}
            className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-300 transition hover:bg-slate-700 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            ←
          </button>
          <label htmlFor="filtro-fecha" className="sr-only">
            Fecha de la agenda
          </label>
          <input
            id="filtro-fecha"
            type="date"
            value={fechaMostrada}
            onChange={(e) => {
              if (e.target.value) irAFecha(e.target.value);
            }}
            className="rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400"
          />
          <button
            type="button"
            aria-label="Día siguiente"
            onClick={() => irAFecha(sumarDias(fechaMostrada, 1))}
            disabled={!dashboard}
            className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-300 transition hover:bg-slate-700 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            →
          </button>
          <button
            type="button"
            onClick={() => irAFecha("")}
            disabled={!dashboard || esHoy}
            className="rounded-lg bg-cyan-500 px-3 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Hoy
          </button>
        </div>

        {cargando ? (
          <p className="text-slate-500 text-sm mt-8" role="status">
            Cargando agenda...
          </p>
        ) : errorMsg ? (
          <div
            role="alert"
            className="mt-8 rounded-lg border border-red-800/60 bg-red-950/40 px-4 py-4 text-sm text-red-300 flex items-center justify-between gap-4"
          >
            <span>{errorMsg}</span>
            <button
              type="button"
              onClick={reintentar}
              className="rounded-lg border border-red-500/40 px-3 py-1.5 text-red-300 hover:bg-red-500/10 transition"
            >
              Reintentar
            </button>
          </div>
        ) : (
          dashboard &&
          metricas && (
            <>
              {/* Métricas del día */}
              <section
                aria-label="Métricas del día"
                className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4 mt-6"
              >
                {TARJETAS.map((t) => (
                  <div
                    key={t.clave}
                    className="bg-slate-900 border border-slate-800 rounded-2xl p-5"
                  >
                    <p className="text-slate-400 text-sm">
                      {t.clave === "turnosHoy" && !esHoy ? "Turnos del día" : t.titulo}
                    </p>
                    <p className={`text-3xl font-bold mt-2 ${t.color}`}>
                      {metricas[t.clave]}
                    </p>
                  </div>
                ))}
              </section>

              {/* Turnos de hoy */}
              <section aria-label="Turnos del día" className="mt-8">
                <h2 className="text-lg font-semibold text-white mb-3">
                  {esHoy ? "Turnos de hoy" : "Turnos del día"}
                </h2>

                {mensajeOk && (
                  <div
                    role="status"
                    className="mb-3 rounded-lg border border-emerald-800/60 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-300"
                  >
                    {mensajeOk}
                  </div>
                )}

                {errorEstado && (
                  <div
                    role="alert"
                    className="mb-3 rounded-lg border border-red-800/60 bg-red-950/40 px-4 py-3 text-sm text-red-300"
                  >
                    {errorEstado}
                  </div>
                )}

                {dashboard.turnos.length === 0 ? (
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-slate-400 text-sm">
                    {esHoy
                      ? "No tenés turnos programados para hoy."
                      : "No tenés turnos en este día."}
                  </div>
                ) : (
                  <ul className="space-y-3">
                    {dashboard.turnos.map((turno) => {
                      const ocupado = actualizandoId === turno.id;
                      const cancelado = turno.estado === "cancelado";

                      return (
                        <li
                          key={turno.id}
                          data-testid="turno-del-dia"
                          className={
                            "bg-slate-900 border border-slate-800 rounded-2xl p-5 flex items-center gap-5 " +
                            (cancelado ? "opacity-70" : "")
                          }
                        >
                          <div className="w-16 shrink-0 text-center">
                            <span className="text-white text-lg font-bold">
                              {turno.hora}
                            </span>
                            <span className="block text-slate-500 text-[10px] tracking-wider">
                              HS
                            </span>
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="text-white font-semibold">
                                {turno.paciente
                                  ? `${turno.paciente.apellido}, ${turno.paciente.nombre}`
                                  : "Paciente sin asignar"}
                              </h3>
                              <span
                                className={
                                  "text-xs font-semibold rounded-md px-2 py-0.5 " +
                                  ESTILO_ESTADO[turno.estado]
                                }
                              >
                                {ETIQUETA_ESTADO[turno.estado]}
                              </span>
                            </div>
                            {turno.paciente && (
                              <p className="text-slate-500 text-sm mt-1 flex flex-wrap gap-x-4 gap-y-1">
                                <span>DNI {turno.paciente.dni}</span>
                                <span>
                                  {turno.paciente.obraSocial ?? "Sin obra social"}
                                </span>
                                <span>📞 {turno.paciente.telefono}</span>
                              </p>
                            )}
                          </div>

                          {!cancelado && (
                            <div className="flex items-center gap-2 shrink-0">
                              {/* Reprogramar: hoy y días próximos (no tiene sentido en el pasado). */}
                              {!esPasado && turno.estado !== "atendido" && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setMensajeOk("");
                                    setErrorEstado("");
                                    setTurnoAReprogramar(turno);
                                  }}
                                  disabled={actualizandoId !== null}
                                  className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-700 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  Reprogramar
                                </button>
                              )}
                              {/* Atendido: hoy y días anteriores (no se atiende un turno futuro). */}
                              {!esFuturo && turno.estado !== "atendido" && (
                                <button
                                  type="button"
                                  onClick={() => cambiarEstado(turno, "atendido")}
                                  disabled={actualizandoId !== null}
                                  className="rounded-lg bg-cyan-500 hover:bg-cyan-400 px-3 py-2 text-sm font-semibold text-slate-950 transition disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  {ocupado ? "Guardando..." : "Marcar atendido"}
                                </button>
                              )}
                              {turno.estado !== "pendiente" && (
                                <button
                                  type="button"
                                  onClick={() => cambiarEstado(turno, "pendiente")}
                                  disabled={actualizandoId !== null}
                                  className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-700 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  {ocupado ? "Guardando..." : "Dejar pendiente"}
                                </button>
                              )}
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}

              </section>
            </>
          )
        )}
      </main>

      {turnoAReprogramar && (
        <ModalReprogramarMedico
          turno={turnoAReprogramar}
          profesionalId={medico.id}
          onClose={() => setTurnoAReprogramar(null)}
          onSuccess={alReprogramar}
          onSesionInvalida={cerrarSesion}
        />
      )}
    </DoctorShell>
  );
}
```

### `app/medico/pacientes/page.tsx` — NUEVO

```tsx
"use client";

// Portal del Médico — historial de pacientes atendidos.

import { useCallback, useEffect, useMemo, useState } from "react";
import { DoctorShell } from "@/components/layout/DoctorShell";
import { useRequireMedico } from "@/lib/auth/useRequireMedico";
import { getPacientes, MedicoRequestError } from "@/lib/services/medicoService";
import { formatearFecha } from "@/lib/turnos/misTurnos";
import type { PacienteAtendido } from "@/lib/types/medico";

const MENSAJE_ERROR_PACIENTES = "No fue posible obtener la lista de pacientes.";

/** Normaliza para buscar sin importar mayúsculas ni tildes. */
function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

export default function MedicoPacientesPage() {
  const { medico, cerrarSesion } = useRequireMedico();

  const [pacientes, setPacientes] = useState<PacienteAtendido[]>([]);
  const [cargando, setCargando] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [recarga, setRecarga] = useState(0);
  const [busqueda, setBusqueda] = useState("");

  useEffect(() => {
    if (!medico) return;

    let vigente = true;

    getPacientes()
      .then((data) => {
        if (!vigente) return;
        setPacientes(data);
        setErrorMsg("");
      })
      .catch((err) => {
        if (!vigente) return;
        if (err instanceof MedicoRequestError && err.status === 401) {
          cerrarSesion();
          return;
        }
        setErrorMsg(MENSAJE_ERROR_PACIENTES);
      })
      .finally(() => {
        if (vigente) setCargando(false);
      });

    return () => {
      vigente = false;
    };
  }, [medico, cerrarSesion, recarga]);

  const reintentar = useCallback(() => {
    setCargando(true);
    setErrorMsg("");
    setRecarga((n) => n + 1);
  }, []);

  const visibles = useMemo(() => {
    const q = normalizar(busqueda.trim());
    if (!q) return pacientes;
    return pacientes.filter((p) =>
      normalizar(`${p.apellido} ${p.nombre} ${p.dni}`).includes(q)
    );
  }, [pacientes, busqueda]);

  if (!medico) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <p className="text-slate-500 text-sm">Verificando sesión...</p>
      </div>
    );
  }

  return (
    <DoctorShell medico={medico} onCerrarSesion={cerrarSesion}>
      <main className="flex-1 px-8 py-8">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-white">Mis Pacientes</h1>
            <p className="text-slate-400 text-sm mt-1">
              Pacientes que ya atendiste
            </p>
          </div>

          {!cargando && !errorMsg && pacientes.length > 0 && (
            <div>
              <label htmlFor="buscar-paciente" className="sr-only">
                Buscar paciente
              </label>
              <input
                id="buscar-paciente"
                type="search"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar por nombre o DNI"
                className="w-72 rounded-lg bg-slate-800 border border-slate-700 px-4 py-2.5 text-sm text-white outline-none focus:border-cyan-400"
              />
            </div>
          )}
        </div>

        {cargando ? (
          <p className="text-slate-500 text-sm mt-8" role="status">
            Cargando pacientes...
          </p>
        ) : errorMsg ? (
          <div
            role="alert"
            className="mt-8 rounded-lg border border-red-800/60 bg-red-950/40 px-4 py-4 text-sm text-red-300 flex items-center justify-between gap-4"
          >
            <span>{errorMsg}</span>
            <button
              type="button"
              onClick={reintentar}
              className="rounded-lg border border-red-500/40 px-3 py-1.5 text-red-300 hover:bg-red-500/10 transition"
            >
              Reintentar
            </button>
          </div>
        ) : pacientes.length === 0 ? (
          <div className="mt-8 bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-slate-400 text-sm">
            Todavía no atendiste pacientes. Cuando marques un turno como
            atendido, el paciente va a aparecer acá.
          </div>
        ) : visibles.length === 0 ? (
          <div className="mt-8 bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-slate-400 text-sm">
            No se encontraron pacientes con esa búsqueda.
          </div>
        ) : (
          <div className="mt-6 bg-slate-900 border border-slate-800 rounded-2xl overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-400 border-b border-slate-800">
                  <th scope="col" className="px-5 py-3 font-medium">Paciente</th>
                  <th scope="col" className="px-5 py-3 font-medium">DNI</th>
                  <th scope="col" className="px-5 py-3 font-medium">Obra social</th>
                  <th scope="col" className="px-5 py-3 font-medium">Última visita</th>
                  <th scope="col" className="px-5 py-3 font-medium text-right">Visitas</th>
                </tr>
              </thead>
              <tbody>
                {visibles.map((p) => (
                  <tr
                    key={p.id}
                    data-testid="paciente-row"
                    className="border-b border-slate-800/60 last:border-b-0"
                  >
                    <td className="px-5 py-4 text-white font-medium">
                      {p.apellido}, {p.nombre}
                    </td>
                    <td className="px-5 py-4 text-slate-300">{p.dni}</td>
                    <td className="px-5 py-4 text-slate-300">
                      {p.obraSocial ?? "Sin obra social"}
                    </td>
                    <td className="px-5 py-4 text-slate-300">
                      {formatearFecha(p.ultimaVisita)}
                    </td>
                    <td className="px-5 py-4 text-slate-300 text-right">
                      {p.totalVisitas}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </DoctorShell>
  );
}
```

### `app/medico/perfil/page.tsx` — NUEVO

```tsx
"use client";

// Portal del Médico — perfil. Los datos personales y la matrícula los gestiona
// un Administrativo (solo lectura); el médico puede editar sus días de
// atención y su horario/detalle.

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { DoctorShell } from "@/components/layout/DoctorShell";
import { useRequireMedico } from "@/lib/auth/useRequireMedico";
import {
  actualizarPerfil,
  getPerfil,
  MedicoRequestError,
} from "@/lib/services/medicoService";
import { extraerConsultorio } from "@/lib/turnos/misTurnos";
import type { PerfilMedico } from "@/lib/types/medico";

const MENSAJE_ERROR_PERFIL = "No fue posible obtener tu perfil.";
const NO_INFORMADO = "No informado";
const MAX_DIAS_ATENCION = 150;
const MAX_INFO = 255;

interface ErroresEdicion {
  diasAtencion?: string;
  info?: string;
}

function iniciales(nombre: string): string {
  // Ignora el título ("Dr.", "Dra.") para que "Dr. Román López" sea "RL".
  const partes = nombre
    .replace(/^(dr|dra)\.?\s+/i, "")
    .split(/\s+/)
    .filter(Boolean);
  return partes
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

function Dato({ etiqueta, children }: { etiqueta: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-slate-500 text-xs uppercase tracking-wider">{etiqueta}</dt>
      <dd className="text-slate-200 text-sm mt-1">{children}</dd>
    </div>
  );
}

export default function MedicoPerfilPage() {
  const { medico, cerrarSesion } = useRequireMedico();

  const [perfil, setPerfil] = useState<PerfilMedico | null>(null);
  const [cargando, setCargando] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [recarga, setRecarga] = useState(0);

  // Edición de días de atención y horario/detalle.
  const [editando, setEditando] = useState(false);
  const [form, setForm] = useState({ diasAtencion: "", info: "" });
  const [erroresForm, setErroresForm] = useState<ErroresEdicion>({});
  const [errorGuardar, setErrorGuardar] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [mensajeOk, setMensajeOk] = useState("");

  useEffect(() => {
    if (!medico) return;

    let vigente = true;

    getPerfil()
      .then((data) => {
        if (!vigente) return;
        setPerfil(data);
        setErrorMsg("");
      })
      .catch((err) => {
        if (!vigente) return;
        if (err instanceof MedicoRequestError && err.status === 401) {
          cerrarSesion();
          return;
        }
        setErrorMsg(MENSAJE_ERROR_PERFIL);
      })
      .finally(() => {
        if (vigente) setCargando(false);
      });

    return () => {
      vigente = false;
    };
  }, [medico, cerrarSesion, recarga]);

  const reintentar = useCallback(() => {
    setCargando(true);
    setErrorMsg("");
    setRecarga((n) => n + 1);
  }, []);

  const empezarEdicion = useCallback(() => {
    if (!perfil) return;
    setForm({ diasAtencion: perfil.diasAtencion ?? "", info: perfil.info });
    setErroresForm({});
    setErrorGuardar("");
    setMensajeOk("");
    setEditando(true);
  }, [perfil]);

  const cancelarEdicion = useCallback(() => {
    setEditando(false);
    setErroresForm({});
    setErrorGuardar("");
  }, []);

  const guardar = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setErrorGuardar("");

      const diasAtencion = form.diasAtencion.trim();
      const info = form.info.trim();
      const errores: ErroresEdicion = {};

      if (!diasAtencion) {
        errores.diasAtencion = "Ingresá los días de atención.";
      } else if (diasAtencion.length > MAX_DIAS_ATENCION) {
        errores.diasAtencion = `No puede superar los ${MAX_DIAS_ATENCION} caracteres.`;
      }
      if (!info) {
        errores.info = "Ingresá el horario y detalle de atención.";
      } else if (info.length > MAX_INFO) {
        errores.info = `No puede superar los ${MAX_INFO} caracteres.`;
      }

      setErroresForm(errores);
      if (Object.keys(errores).length > 0) return;

      setGuardando(true);
      try {
        const actualizado = await actualizarPerfil({ diasAtencion, info });
        setPerfil(actualizado);
        setEditando(false);
        setMensajeOk("Tus datos de atención se actualizaron correctamente.");
      } catch (err) {
        if (err instanceof MedicoRequestError && err.status === 401) {
          cerrarSesion();
          return;
        }
        setErrorGuardar(
          err instanceof MedicoRequestError
            ? err.message
            : "No fue posible guardar los cambios. Intentá nuevamente."
        );
      } finally {
        setGuardando(false);
      }
    },
    [form, cerrarSesion]
  );

  if (!medico) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <p className="text-slate-500 text-sm">Verificando sesión...</p>
      </div>
    );
  }

  return (
    <DoctorShell medico={medico} onCerrarSesion={cerrarSesion}>
      <main className="flex-1 px-8 py-8">
        <h1 className="text-2xl font-bold text-white">Mi Perfil</h1>
        <p className="text-slate-400 text-sm mt-1">
          Tus datos personales y profesionales
        </p>

        {cargando ? (
          <p className="text-slate-500 text-sm mt-8" role="status">
            Cargando perfil...
          </p>
        ) : errorMsg ? (
          <div
            role="alert"
            className="mt-8 rounded-lg border border-red-800/60 bg-red-950/40 px-4 py-4 text-sm text-red-300 flex items-center justify-between gap-4"
          >
            <span>{errorMsg}</span>
            <button
              type="button"
              onClick={reintentar}
              className="rounded-lg border border-red-500/40 px-3 py-1.5 text-red-300 hover:bg-red-500/10 transition"
            >
              Reintentar
            </button>
          </div>
        ) : (
          perfil && (
            <div className="mt-6 max-w-3xl space-y-6">
              <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex items-center gap-5">
                <span
                  aria-hidden="true"
                  className="w-16 h-16 rounded-full bg-cyan-500 text-slate-950 text-xl font-bold flex items-center justify-center"
                >
                  {iniciales(perfil.nombre)}
                </span>
                <div>
                  <h2 className="text-xl font-semibold text-white">{perfil.nombre}</h2>
                  <p className="text-cyan-400 text-sm mt-1">
                    {perfil.especialidad.nombre}
                  </p>
                </div>
              </section>

              <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                <h2 className="text-white font-semibold mb-4">Datos personales</h2>
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <Dato etiqueta="Nombre">{perfil.nombre}</Dato>
                  <Dato etiqueta="Correo electrónico">{perfil.email}</Dato>
                  <Dato etiqueta="Teléfono">{perfil.telefono ?? NO_INFORMADO}</Dato>
                </dl>
              </section>

              {mensajeOk && (
                <div
                  role="status"
                  className="rounded-lg border border-emerald-800/60 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-300"
                >
                  {mensajeOk}
                </div>
              )}

              <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                <div className="flex items-center justify-between gap-4 mb-4">
                  <h2 className="text-white font-semibold">Datos profesionales</h2>
                  {!editando && (
                    <button
                      type="button"
                      onClick={empezarEdicion}
                      className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm font-medium text-slate-300 transition hover:bg-slate-700 hover:text-white"
                    >
                      Editar días y horario
                    </button>
                  )}
                </div>

                {editando ? (
                  <form onSubmit={guardar} noValidate className="space-y-4">
                    <div>
                      <label htmlFor="perfil-dias" className="block text-sm text-slate-300 mb-1">
                        Días de atención
                      </label>
                      <input
                        id="perfil-dias"
                        type="text"
                        value={form.diasAtencion}
                        maxLength={MAX_DIAS_ATENCION}
                        onChange={(e) => {
                          setForm((f) => ({ ...f, diasAtencion: e.target.value }));
                          setErroresForm((er) => ({ ...er, diasAtencion: undefined }));
                        }}
                        placeholder="Ej: Lunes a Viernes"
                        className={`w-full rounded-lg bg-slate-800 border px-4 py-3 text-white outline-none focus:border-cyan-400 ${
                          erroresForm.diasAtencion ? "border-red-500" : "border-slate-700"
                        }`}
                      />
                      {erroresForm.diasAtencion && (
                        <p className="text-red-500 text-xs mt-1">{erroresForm.diasAtencion}</p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="perfil-info" className="block text-sm text-slate-300 mb-1">
                        Horario y detalle
                      </label>
                      <textarea
                        id="perfil-info"
                        rows={4}
                        value={form.info}
                        maxLength={MAX_INFO}
                        onChange={(e) => {
                          setForm((f) => ({ ...f, info: e.target.value }));
                          setErroresForm((er) => ({ ...er, info: undefined }));
                        }}
                        placeholder="Ej: Atiende lunes a viernes de 8 a 14 hs. Consultorio N° 11."
                        className={`w-full rounded-lg bg-slate-800 border px-4 py-3 text-white outline-none focus:border-cyan-400 resize-none ${
                          erroresForm.info ? "border-red-500" : "border-slate-700"
                        }`}
                      />
                      <div className="flex justify-between gap-4 mt-1">
                        <p className="text-slate-500 text-xs">
                          Para que los pacientes vean tu consultorio, incluí el texto
                          «Consultorio N° 11» (con tu número).
                        </p>
                        <span className="text-slate-500 text-xs shrink-0">
                          {form.info.length}/{MAX_INFO}
                        </span>
                      </div>
                      {erroresForm.info && (
                        <p className="text-red-500 text-xs mt-1">{erroresForm.info}</p>
                      )}
                    </div>

                    {errorGuardar && (
                      <div
                        role="alert"
                        className="rounded-lg border border-red-800/60 bg-red-950/40 px-4 py-3 text-sm text-red-300"
                      >
                        {errorGuardar}
                      </div>
                    )}

                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={cancelarEdicion}
                        disabled={guardando}
                        className="rounded-lg px-4 py-2.5 text-slate-300 hover:bg-slate-800 transition disabled:opacity-50"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        disabled={guardando}
                        className="rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:bg-cyan-800 disabled:cursor-not-allowed px-4 py-2.5 font-semibold text-slate-950 transition"
                      >
                        {guardando ? "Guardando..." : "Guardar cambios"}
                      </button>
                    </div>
                  </form>
                ) : (
                  <dl className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <Dato etiqueta="Especialidad">{perfil.especialidad.nombre}</Dato>
                    <Dato etiqueta="Matrícula">{perfil.matricula ?? NO_INFORMADO}</Dato>
                    <Dato etiqueta="Días de atención">
                      {perfil.diasAtencion ?? NO_INFORMADO}
                    </Dato>
                    <Dato etiqueta="Consultorio">
                      {extraerConsultorio(perfil.info) ?? NO_INFORMADO}
                    </Dato>
                    <div className="sm:col-span-2">
                      <Dato etiqueta="Horario y detalle">{perfil.info}</Dato>
                    </div>
                  </dl>
                )}
              </section>

              <p className="text-slate-600 text-xs">
                Para modificar tu nombre, correo, teléfono o matrícula comunicate con Administración.
              </p>
            </div>
          )
        )}
      </main>
    </DoctorShell>
  );
}
```
