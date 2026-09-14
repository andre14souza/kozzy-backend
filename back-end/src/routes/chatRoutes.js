import express from "express";
import {
  listarUsuariosChat,
  listarConversas,
  listarMensagens,
  enviarMensagem,
  marcarComoLidas
} from "../controllers/chatController.js";
import { autenticar } from "../middleware/authMiddleware.js";
import { upload } from "../middleware/upload.js";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Chat
 *   description: Endpoints de comunicação interna e compartilhamento de chamados
 */

router.get("/usuarios", autenticar, listarUsuariosChat);
router.get("/conversas", autenticar, listarConversas);
router.get("/mensagens/:contatoId", autenticar, listarMensagens);
router.post("/mensagens", autenticar, upload.array("anexos", 5), enviarMensagem);
router.put("/mensagens/lidas/:contatoId", autenticar, marcarComoLidas);

export default router;
