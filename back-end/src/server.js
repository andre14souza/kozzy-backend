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

// 💥 NOVO: ESSENCIAL PARA AMBIENTES PROXY (RENDER). Diz ao Express para confiar no cabeçalho HTTPS
app.set('trust proxy', 1); 

// Middlewares
app.use(cors({
  origin: 'https://kozzy-frontend.vercel.app', 
  credentials: true, 
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// COOKIE-PARSER ANTES DAS ROTAS (corrigido antes)
app.use(cookieParser()); 
app.get('/api/test-cookie', (req, res) => {
    // Retorna todos os cookies que o Express conseguiu ler
    res.json({ cookies: req.cookies, tokenPresent: !!req.cookies.token });
});
// Rotas: 
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