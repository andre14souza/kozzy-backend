import express from "express";
import {
  criarUsuario,
  listarUsuarios,
  listarAtendentes,
  buscarUsuario,
  atualizarUsuario,
  deletarUsuario,
  login,
  logout,
  atualizarPerfil,
  uploadFotoPerfil,
} from "../controllers/usuarioController.js";
import { autenticar } from "../middleware/authMiddleware.js";
import { upload } from "../middleware/upload.js";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Usuários
 *   description: Endpoints de autenticação e gerenciamento de usuários
 */

/**
 * @swagger
 * /api/usuarios/register:
 *   post:
 *     summary: Registra um novo usuário
 *     tags: [Usuários]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nomeCompleto:
 *                 type: string
 *                 example: "Eduardo Reis"
 *               email:
 *                 type: string
 *                 example: "eduardo@teste.com"
 *               senha:
 *                 type: string
 *                 example: "123456"
 *               perfilAcesso:
 *                 type: string
 *                 enum: [atendente, supervisor]
 *     responses:
 *       201:
 *         description: Usuário criado com sucesso
 */
router.post("/register", criarUsuario);

/**
 * @swagger
 * /api/usuarios/login:
 *   post:
 *     summary: Faz login e retorna um token JWT
 *     tags: [Usuários]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 example: "eduardo@teste.com"
 *               senha:
 *                 type: string
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: Login bem-sucedido
 */
router.post("/login", login);

/**
 * @swagger
 * /api/usuarios:
 *   get:
 *     summary: Lista todos os usuários
 *     tags: [Usuários]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista retornada com sucesso
 */
router.get("/", autenticar, listarUsuarios);

/**
 * @swagger
 * /api/usuarios/atendentes:
 *   get:
 *     summary: Lista apenas os usuários que podem assumir chamados (atendente/supervisor)
 *     tags: [Usuários]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista retornada com sucesso
 */
router.get("/atendentes", autenticar, listarAtendentes);

/**
 * @swagger
 * /api/usuarios/{id}:
 *   get:
 *     summary: Busca um usuário por ID
 *     tags: [Usuários]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Usuário encontrado
 */
router.get("/:id", autenticar, buscarUsuario);

/**
 * @swagger
 * /api/usuarios/perfil:
 *   put:
 *     summary: Atualiza o perfil do próprio usuário (nome, email, senha)
 *     tags: [Usuários]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nome:
 *                 type: string
 *               email:
 *                 type: string
 *               senha:
 *                 type: string
 *     responses:
 *       200:
 *         description: Perfil atualizado
 */
router.put("/perfil", autenticar, upload.single("foto"), atualizarPerfil);

/**
 * @swagger
 * /api/usuarios/{id}/foto:
 *   put:
 *     summary: Faz upload da foto de perfil de um usuário
 *     tags: [Usuários]
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
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               foto:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Foto de perfil atualizada com sucesso
 */
router.put("/:id/foto", autenticar, upload.single("foto"), uploadFotoPerfil);

/**
 * @swagger
 * /api/usuarios/{id}:
 *   put:
 *     summary: Atualiza os dados de um usuário
 *     tags: [Usuários]
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
 *               nomeCompleto:
 *                 type: string
 *               email:
 *                 type: string
 *               perfilAcesso:
 *                 type: string
 *     responses:
 *       200:
 *         description: Usuário atualizado
 */
router.put("/:id", autenticar, upload.single("foto"), atualizarUsuario);

/**
 * @swagger
 * /api/usuarios/{id}:
 *   delete:
 *     summary: Exclui um usuário
 *     tags: [Usuários]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Usuário removido
 */
router.delete("/:id", autenticar, deletarUsuario);

/**
 * @swagger
 * /api/usuarios/logout:
 *   post:
 *     summary: Faz logout e invalida o token JWT
 *     tags: [Usuários]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logout bem-sucedido
 */
router.post("/logout", autenticar, logout);

export default router;
