import express from "express";
import {
  criarAtendimento,
  listarAtendimentos,
  buscarAtendimento,
  atualizarAtendimento,
  deletarAtendimento
} from "../controllers/atendimentoController.js";
import { autenticar } from "../middleware/authMiddleware.js";

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
router.post("/", autenticar, criarAtendimento);

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

export default router;
