const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
require('dotenv').config();
console.log("📌 DATABASE_URL:", process.env.DATABASE_URL); // DEBUG

const app = express();

// Configurar CORS para permitir solicitudes desde localhost y producción
app.use(cors({
  origin: ['http://localhost:3000', 'https://mi-frontend.vercel.app'], // Reemplaza con tu URL real en Vercel
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));

app.use(express.json());

// Configurar conexión a PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});


pool.connect()
    .then(() => console.log("✅ Conexión a PostgreSQL exitosa"))
    .catch(err => console.error("❌ Error conectando a PostgreSQL:", err));

// Ruta de prueba para verificar conexión a la base de datos
app.get('/test-db', async (req, res) => {
    try {
        const result = await pool.query('SELECT NOW()');
        res.json({ message: "Conexión a la base de datos exitosa", time: result.rows[0] });
    } catch (error) {
        console.error("❌ Error en la consulta:", error);
        res.status(500).json({ message: 'Error conectando a la base de datos', error });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});
