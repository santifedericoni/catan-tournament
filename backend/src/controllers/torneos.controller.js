const pool = require("../models/db");

// Obtener todos los torneos
const getTorneos = async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM torneos");
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ message: "Error obteniendo torneos", error });
  }
};

// Crear un torneo
const createTorneo = async (req, res) => {
  try {
    const { nombre, fecha } = req.body;
    const result = await pool.query(
      "INSERT INTO torneos (nombre, fecha) VALUES ($1, $2) RETURNING *",
      [nombre, fecha]
    );
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ message: "Error creando torneo", error });
  }
};

// Obtener un torneo por ID
const getTorneoById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query("SELECT * FROM torneos WHERE id = $1", [id]);
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ message: "Error obteniendo torneo", error });
  }
};

// Actualizar un torneo
const updateTorneo = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, fecha } = req.body;
    const result = await pool.query(
      "UPDATE torneos SET nombre = $1, fecha = $2 WHERE id = $3 RETURNING *",
      [nombre, fecha, id]
    );
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ message: "Error actualizando torneo", error });
  }
};

// Eliminar un torneo
const deleteTorneo = async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query("DELETE FROM torneos WHERE id = $1", [id]);
    res.json({ message: "Torneo eliminado correctamente" });
  } catch (error) {
    res.status(500).json({ message: "Error eliminando torneo", error });
  }
};

module.exports = {
  getTorneos,
  createTorneo,
  getTorneoById,
  updateTorneo,
  deleteTorneo,
};
