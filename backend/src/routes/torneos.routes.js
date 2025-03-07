const express = require("express");
const router = express.Router();
const torneosController = require("../controllers/torneos.controller");

// Endpoints
router.get("/", torneosController.getTorneos);
router.post("/", torneosController.createTorneo);
router.get("/:id", torneosController.getTorneoById);
router.put("/:id", torneosController.updateTorneo);
router.delete("/:id", torneosController.deleteTorneo);

module.exports = router;
