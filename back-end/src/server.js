import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser"; // Importante para ler o cookie
import { connectDB } from "./config/db.js";
import usuarioRoutes from "./routes/usuarioRoutes.js";
import atendimentoRoutes from "./routes/atendimentoRoutes.js";
import areaRoutes from "./routes/areaRoutes.js";
import { swaggerDocs } from "./swagger.js";

dotenv.config();
const app = express();

// Middlewares
app.use(cors({
  origin: 'https://kozzy-frontend.vercel.app', 
  credentials: true, // Essencial para enviar o cookie
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// 💥 CORREÇÃO PRINCIPAL: O COOKIE-PARSER PRECISA VIR ANTES DAS ROTAS!
app.use(cookieParser()); 

// Rotas: (Agora o cookie já foi lido)
app.use("/api/usuarios", usuarioRoutes);
app.use("/api/atendimentos", atendimentoRoutes);
app.use("/api/areas", areaRoutes);

// Conexão ao banco
connectDB();

// Rota padrão e Swagger
app.get("/", (req, res) => res.send("API rodando com sucesso!"));
swaggerDocs(app);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));