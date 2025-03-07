const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Rutas
const torneosRoutes = require("./routes/torneos.routes");
const participantesRoutes = require("./routes/participantes.routes");

app.use("/torneos", torneosRoutes);
app.use("/participantes", participantesRoutes);

module.exports = app;
