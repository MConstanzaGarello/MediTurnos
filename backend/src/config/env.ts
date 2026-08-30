import dotenv from "dotenv";

dotenv.config();

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(
      `Falta la variable de entorno "${name}". Revisá backend/.env (ver backend/.env.example).`
    );
  }
  return value;
}

export const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT || 4000),
  corsOrigin: process.env.CORS_ORIGIN || "http://localhost:3000",
  bcryptSaltRounds: Number(process.env.BCRYPT_SALT_ROUNDS || 10),
  db: {
    host: required("DB_HOST", "127.0.0.1"),
    port: Number(process.env.DB_PORT || 5432),
    name: required("DB_NAME", "mediturnos"),
    user: required("DB_USER", "postgres"),
    password: process.env.DB_PASSWORD ?? "postgres",
    ssl: process.env.DB_SSL === "true",
  },
};
