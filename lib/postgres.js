import pkg from 'pg';
const { Pool } = pkg;

let db = null;

db = new Pool({
  host: "217.154.114.227",
  port: 9253,
  user: "admin",
  password: "pass123editmelol",
  database: "postgres_db"
});

db.connect()
  .then(() => console.log("✅ PostgreSQL conectado"))
  .catch(err => {
    console.log("⚠️  PostgreSQL no disponible, funcionando sin base de datos");
    db = null;
  });

export { db };