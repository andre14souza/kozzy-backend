import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import path from "path";
import fs from "fs";
import http from "http";
import { Server } from "socket.io";
import { fileURLToPath } from "url";
import { connectDB } from "./config/db.js";
import usuarioRoutes from "./routes/usuarioRoutes.js";
import atendimentoRoutes from "./routes/atendimentoRoutes.js";
import areaRoutes from "./routes/areaRoutes.js";
import { swaggerDocs } from "./swagger.js";
import { setIO } from "./socketManager.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();
const app = express();

// Cria o servidor HTTP manualmente para poder usar com Socket.io
const httpServer = http.createServer(app);

// Origens permitidas (reutilizadas pelo CORS do Express e pelo Socket.io)
const allowedOrigins = [
  /vercel\.app$/,
  'http://localhost:4200',
  'http://localhost:3000'
];

// Inicializa o Socket.io
const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Registra a instância do io para uso nos controllers
setIO(io);

// Eventos de conexão
io.on('connection', (socket) => {
  console.log(`[Socket.io] Cliente conectado: ${socket.id}`);

  // Permite que o cliente entre em salas por userId (para notificações pessoais)
  socket.on('join:user', (userId) => {
    if (userId) {
      socket.join(`user:${userId}`);
      console.log(`[Socket.io] Socket ${socket.id} entrou na sala user:${userId}`);
    }
  });

  socket.on('disconnect', () => {
    console.log(`[Socket.io] Cliente desconectado: ${socket.id}`);
  });
});

// 💥 ESSENCIAL PARA AMBIENTES PROXY (RENDER). Diz ao Express para confiar no cabeçalho HTTPS
app.set('trust proxy', 1); 
app.use(cookieParser());

// Middlewares
app.use(cors({
  origin: allowedOrigins,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.use(express.json());
app.use(cookieParser()); 

// EXPOR A PASTA UPLOADS ESTATICAMENTE
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

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
httpServer.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT} (Socket.io ativo)`));