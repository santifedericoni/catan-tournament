const pool = require("../models/db");

// Agregar un participante a un torneo
const addParticipante = async (req, res) => {
  try {
    const { torneoId, nombre, email } = req.body;
    const result = await pool.query(
      "INSERT INTO participantes (torneo_id, nombre, email) VALUES ($1, $2, $3) RETURNING *",
      [torneoId, nombre, email]
    );
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ message: "Error agregando participante", error });
  }
};

// Obtener todos los participantes de un torneo
const getParticipantesByTorneo = async (req, res) => {
  try {
    const { torneoId } = req.params;
    const result = await pool.query(
      "SELECT * FROM participantes WHERE torneo_id = $1",
      [torneoId]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ message: "Error obteniendo participantes", error });
  }
};

module.exports = {
  addParticipante,
  getParticipantesByTorneo,
};
