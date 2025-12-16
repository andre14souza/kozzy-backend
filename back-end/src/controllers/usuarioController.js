import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { Usuario } from "../models/Usuario.js";
import Area from "../models/Area.js";
export const criarUsuario = async (req, res) => {
  try {
    const { nomeCompleto, email, senha, perfilAcesso } = req.body;

    const existe = await Usuario.findOne({ email });
    if (existe) return res.status(400).json({ message: "Email já cadastrado." });

    const hash = await bcrypt.hash(senha, 10);

    // 1. Cria o Usuário
    const novoUsuario = new Usuario({
      nomeCompleto,
      email,
      senha: hash,
      perfilAcesso,
    });

    const usuarioSalvo = await novoUsuario.save();

    // 2. AUTOMATIZAÇÃO DA ÁREA
    // Se o perfil NÃO for 'supervisor' nem 'atendente', assumimos que o perfil É o nome da área (ex: 'Logistica')
    if (perfilAcesso !== 'supervisor' && perfilAcesso !== 'atendente') {
        
        // --- MAPA DE CORREÇÃO ---
        // Chave (minúsculo) : Valor Correto no Banco (Chamados)
        const mapaDeAreas = {
            'logistica': 'Logistica',
            'logística': 'Logistica',
            'ti': 'T.I',
            't.i': 'T.I',
            't.i.': 'T.I',
            'financeiro': 'Financeiro',
            'comercial': 'Comercial',
            'compras': 'Compra', // Atenção se é "Compra" ou "Compras" no seu banco
            'compra': 'Compra',
            'contas a pagar': 'Contas a Pagar',
            'contas a receber': 'Contas a Receber',
            'rh': 'RH'
        };

        // Tenta achar no mapa usando minúsculo. Se não achar, usa o original capitalizado.
        const termoBusca = perfilAcesso.toLowerCase().trim();
        
        let nomeAreaCorreto = mapaDeAreas[termoBusca];

        // Fallback: Se não estiver no mapa, tenta apenas capitalizar a primeira letra
        if (!nomeAreaCorreto) {
            nomeAreaCorreto = perfilAcesso.charAt(0).toUpperCase() + perfilAcesso.slice(1);
        }

        const novaArea = new Area({
            usuarioId: usuarioSalvo._id,
            areas: [nomeAreaCorreto] 
        });
        
        await novaArea.save();
        console.log(`✅ Usuário criado: ${nomeCompleto}. Área vinculada: ${nomeAreaCorreto}`);
    }

    res.status(201).json({ message: "Usuário criado com sucesso!", usuario: usuarioSalvo });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao criar usuário", error });
  }
};

export const listarUsuarios = async (req, res) => {
  try {
    const usuarios = await Usuario.find().select("-senha");
    res.json(usuarios);
  } catch (error) {
    res.status(500).json({ message: "Erro ao listar usuários", error });
  }
};

export const buscarUsuario = async (req, res) => {
  try {
    const usuario = await Usuario.findById(req.params.id).select("-senha");
    if (!usuario) return res.status(404).json({ message: "Usuário não encontrado." });
    res.json(usuario);
  } catch (error) {
    res.status(500).json({ message: "Erro ao buscar usuário", error });
  }
};

export const atualizarUsuario = async (req, res) => {
  try {
    const { nomeCompleto, email, perfilAcesso } = req.body;
    const usuario = await Usuario.findByIdAndUpdate(
      req.params.id,
      { nomeCompleto, email, perfilAcesso },
      { new: true }
    ).select("-senha");

    if (!usuario) return res.status(404).json({ message: "Usuário não encontrado." });
    res.json({ message: "Usuário atualizado com sucesso", usuario });
  } catch (error) {
    res.status(500).json({ message: "Erro ao atualizar usuário", error });
  }
};

export const deletarUsuario = async (req, res) => {
  try {
    const usuario = await Usuario.findByIdAndDelete(req.params.id);
    if (!usuario) return res.status(404).json({ message: "Usuário não encontrado." });
    res.json({ message: "Usuário deletado com sucesso" });
  } catch (error) {
    res.status(500).json({ message: "Erro ao deletar usuário", error });
  }
};

export const login = async (req, res) => {
  try {
    const { email, senha } = req.body;
    const usuario = await Usuario.findOne({ email });
    if (!usuario) return res.status(400).json({ message: "Usuário não encontrado." });

    const senhaCorreta = await bcrypt.compare(senha, usuario.senha);
    if (!senhaCorreta) return res.status(400).json({ message: "Senha incorreta." });

    // 2. BUSCAR AS ÁREAS DO USUÁRIO
    const areaVinculada = await Area.findOne({ usuarioId: usuario._id });
    const listaAreas = areaVinculada ? areaVinculada.areas : [];

    const token = jwt.sign(
      { id: usuario._id, perfilAcesso: usuario.perfilAcesso },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.cookie("token", token, {
      httpOnly: true,
      secure: false, 
      sameSite: "lax",
      maxAge: 60 * 60 * 1000,
    });

    res.json({
      message: "Login realizado com sucesso!",
      token: token,
      usuario: {
        id: usuario._id,
        nomeCompleto: usuario.nomeCompleto,
        email: usuario.email,
        perfilAcesso: usuario.perfilAcesso,
        areas: listaAreas // <--- 3. ENVIAR AS ÁREAS PARA O FRONT
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Erro no login", error });
  }
};

export const logout = async (req, res) => {
  res.clearCookie("token");
  res.json({ message: "Logout realizado com sucesso." });
};
