const express = require("express");
const router = express.Router();
const participantesController = require("../controllers/participantes.controller");

// Endpoints
router.post("/", participantesController.addParticipante);
router.get("/:torneoId", participantesController.getParticipantesByTorneo);

module.exports = router;
