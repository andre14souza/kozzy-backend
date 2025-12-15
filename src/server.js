import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import { connectDB } from "./config/db.js";
import usuarioRoutes from "./routes/usuarioRoutes.js";
import atendimentoRoutes from "./routes/atendimentoRoutes.js";
import areaRoutes from "./routes/areaRoutes.js";
import { swaggerDocs } from "./swagger.js";



dotenv.config();
const app = express();

// Middlewares
app.use(cors({
  origin: '*', // Temporário: libera para qualquer um. Depois trocaremos pela URL da Vercel.
  credentials: true, // Importante para seus cookies/sessão
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(cookieParser());
app.use("/api/atendimentos", atendimentoRoutes);
app.use("/api/areas", areaRoutes);

// Conexão ao banco
connectDB();

// Rotas
app.use("/api/usuarios", usuarioRoutes);

// Rota padrão
app.get("/", (req, res) => res.send("API rodando com sucesso!"));
swaggerDocs(app);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
