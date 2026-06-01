import express from "express";
import {
  criarAtendimento,
  listarAtendimentos,
  buscarAtendimento,
  atualizarAtendimento,
  deletarAtendimento,
  adicionarComentario,
  criarSubChamado,
  obterEstatisticas,
  getChamadosHoje
} from "../controllers/atendimentoController.js";
import { autenticar } from "../middleware/authMiddleware.js";
import { upload } from "../middleware/upload.js";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Atendimentos
 *   description: CRUD de atendimentos
 */

/**
 * @swagger
 * /api/atendimentos:
 *   post:
 *     summary: Cria um novo atendimento
 *     tags: [Atendimentos]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               numeroProtocolo:
 *                 type: string
 *                 example: "ATD-00123"
 *               tipoCliente:
 *                 type: string
 *                 enum: [entregador, cliente_final, loja_estabelecimento]
 *                 example: "cliente_final"
 *               nomeCliente:
 *                 type: string
 *                 example: "João da Bike"
 *               categoriaAssunto:
 *                 type: string
 *                 example: "Problemas de Entrega"
 *               hora:
 *                 type: string
 *                 example: "14:30"
 *               descricaoDetalhada:
 *                 type: string
 *                 example: "Cliente relatou que o pedido não chegou no prazo."
 *     responses:
 *       201:
 *         description: Atendimento criado com sucesso
 */
/**
 * @swagger
 * /api/atendimentos/estatisticas:
 *   get:
 *     summary: Retorna estatísticas de atendimentos para o dashboard
 *     tags: [Atendimentos]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Estatísticas retornadas com sucesso
 */
router.get("/estatisticas", autenticar, obterEstatisticas);

router.post("/", autenticar, upload.single('anexo'), criarAtendimento);

/**
 * @swagger
 * /api/atendimentos:
 *   get:
 *     summary: Lista todos os atendimentos (de acordo com as áreas do usuário)
 *     tags: [Atendimentos]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista retornada com sucesso
 */
router.get("/", autenticar, listarAtendimentos);

/**
 * @swagger
 * /api/atendimentos/hoje:
 *   get:
 *     summary: Lista apenas os chamados criados hoje (com base no fuso horário local de Brasília)
 *     tags: [Atendimentos]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de chamados de hoje retornada com sucesso
 */
router.get("/hoje", autenticar, getChamadosHoje);

/**
 * @swagger
 * /api/atendimentos/{id}:
 *   get:
 *     summary: Busca um atendimento pelo ID
 *     tags: [Atendimentos]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Atendimento encontrado
 */
router.get("/:id", autenticar, buscarAtendimento);

/**
 * @swagger
 * /api/atendimentos/{id}:
 *   put:
 *     summary: Atualiza um atendimento existente
 *     tags: [Atendimentos]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               descricaoDetalhada:
 *                 type: string
 *               nomeCliente:
 *                 type: string
 *               avanco:
 *                 type: string
 *                 enum: [aberto, em andamento, concluido]
 *     responses:
 *       200:
 *         description: Atendimento atualizado
 */
router.put("/:id", autenticar, atualizarAtendimento);

/**
 * @swagger
 * /api/atendimentos/{id}:
 *   delete:
 *     summary: Deleta um atendimento
 *     tags: [Atendimentos]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Atendimento removido
 */
router.delete("/:id", autenticar, deletarAtendimento);

/**
 * @swagger
 * /api/atendimentos/{id}/comentarios:
 *   post:
 *     summary: Adiciona um comentário a um atendimento
 *     tags: [Atendimentos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               mensagem:
 *                 type: string
 *     responses:
 *       201:
 *         description: Comentário adicionado com sucesso
 *       400:
 *         description: É necessário enviar uma mensagem ou um anexo
 *       404:
 *         description: Chamado não encontrado
 */
router.post("/:id/comentarios", autenticar, upload.single('anexo'), adicionarComentario);

/**
 * @swagger
 * /api/atendimentos/{id}/subchamados:
 *   post:
 *     summary: Cria um sub-chamado vinculado a um chamado principal
 *     tags: [Atendimentos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               tipoCliente:
 *                 type: string
 *               categoriaAssunto:
 *                 type: string
 *               assuntoEspecifico:
 *                 type: string
 *               descricaoDetalhada:
 *                 type: string
 *               nivelPrioridade:
 *                 type: string
 *     responses:
 *       201:
 *         description: Sub-chamado criado com sucesso
 */
router.post("/:id/subchamados", autenticar, upload.single('anexo'), criarSubChamado);

export default router;
