import express from "express";
import {
  criarArea,
  listarAreas,
  buscarAreasPorUsuario,
  atualizarAreas,
  deletarAreas
} from "../controllers/areaController.js";
import { autenticar } from "../middleware/authMiddleware.js";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Áreas
 *   description: Controle das áreas e permissões dos usuários
 */

/**
 * @swagger
 * /api/areas:
 *   post:
 *     summary: Cadastra as áreas de um usuário
 *     tags: [Áreas]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               usuarioId:
 *                 type: string
 *                 example: "652af0dc1df2340dd0e0d001"
 *               areas:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["Suporte Técnico", "Financeiro"]
 *     responses:
 *       201:
 *         description: Áreas cadastradas
 */
router.post("/", autenticar, criarArea);

/**
 * @swagger
 * /api/areas:
 *   get:
 *     summary: Lista todas as áreas cadastradas
 *     tags: [Áreas]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de áreas retornada
 */
router.get("/", autenticar, listarAreas);

/**
 * @swagger
 * /api/areas/{usuarioId}:
 *   get:
 *     summary: Retorna as áreas de um usuário específico
 *     tags: [Áreas]
 *     parameters:
 *       - name: usuarioId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Áreas encontradas
 */
router.get("/:usuarioId", autenticar, buscarAreasPorUsuario);

/**
 * @swagger
 * /api/areas/{usuarioId}:
 *   put:
 *     summary: Atualiza as áreas de um usuário
 *     tags: [Áreas]
 *     parameters:
 *       - name: usuarioId
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
 *               areas:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["Comercial/Vendas", "Outros Assuntos"]
 *     responses:
 *       200:
 *         description: Áreas atualizadas
 */
router.put("/:usuarioId", autenticar, atualizarAreas);

/**
 * @swagger
 * /api/areas/{usuarioId}:
 *   delete:
 *     summary: Deleta as áreas de um usuário
 *     tags: [Áreas]
 *     parameters:
 *       - name: usuarioId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Áreas removidas
 */
router.delete("/:usuarioId", autenticar, deletarAreas);

export default router;
