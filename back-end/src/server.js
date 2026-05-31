import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { connectDB } from "./config/db.js";
import usuarioRoutes from "./routes/usuarioRoutes.js";
import atendimentoRoutes from "./routes/atendimentoRoutes.js";
import areaRoutes from "./routes/areaRoutes.js";
import { swaggerDocs } from "./swagger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();
const app = express();

// 💥 NOVO: ESSENCIAL PARA AMBIENTES PROXY (RENDER). Diz ao Express para confiar no cabeçalho HTTPS
app.set('trust proxy', 1); 
app.use(cookieParser());
// Middlewares
app.use(cors({
  origin: [/vercel.app$/], // Isso aceita qualquer link que termine em .vercel.app
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// COOKIE-PARSER ANTES DAS ROTAS (corrigido antes)
app.use(cookieParser()); 

// EXPOR A PASTA UPLOADS ESTATICAMENTE
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));
app.get('/api/test-cookie', (req, res) => {
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