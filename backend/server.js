const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Configurar conexión a PostgreSQL
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

pool.connect()
    .then(() => console.log("✅ Conexión a PostgreSQL exitosa"))
    .catch(err => console.error("❌ Error conectando a PostgreSQL:", err));

// Ruta de prueba
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

