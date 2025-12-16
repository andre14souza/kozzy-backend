import Atendimento from "../models/Atendimento.js";
import Area from "../models/Area.js";

// Criar atendimento
export const criarAtendimento = async (req, res) => {
  try {
    // Só permite criar se for Supervisor ou Atendente
    if (req.usuario.perfilAcesso !== 'supervisor' && req.usuario.perfilAcesso !== 'atendente') {
        return res.status(403).json({ message: "Acesso negado. Você não tem permissão para abrir chamados." });
    }

    const novoAtendimento = new Atendimento({
      ...req.body,
      criadoPor: req.usuario.id,
    });
    await novoAtendimento.save();
    res.status(201).json(novoAtendimento);
    
  } catch (error) {
    console.error("❌ ERRO AO SALVAR:", error);
    res.status(500).json({ message: "Erro ao criar atendimento", error });
  }
};

// Listar atendimentos do usuário logado conforme áreas de acesso
export const listarAtendimentos = async (req, res) => {
  try {
    const { id, perfilAcesso } = req.usuario; // Dados vindos do Token JWT

    let filtro = {};

    // --- LÓGICA DE SEGURANÇA VISUAL ---
    
    // CASO 1: Se NÃO for Supervisor, aplicamos o filtro de área
    if (perfilAcesso !== 'supervisor') {
        const areaVinculada = await Area.findOne({ usuarioId: id });

        // Se o funcionário não tiver nenhuma área vinculada, ele não vê nada
        if (!areaVinculada || !areaVinculada.areas || areaVinculada.areas.length === 0) {
            return res.json([]); 
        }

        // Aplica o filtro: Só traz chamados onde a categoriaAssunto está nas áreas dele
        filtro = { categoriaAssunto: { $in: areaVinculada.areas } };
    }
    
    // CASO 2: Se for Supervisor, o 'filtro' continua vazio {}, ou seja, busca tudo.

    const atendimentos = await Atendimento.find(filtro)
      .populate('criadoPor', 'nomeCompleto email') // Traz o nome do usuário
      .sort({ createdAt: -1 });

    res.json(atendimentos);
  } catch (error) {
    console.error("Erro ao listar:", error);
    res.status(500).json({ message: "Erro ao listar atendimentos", error });
  }
};

// Buscar atendimento específico
export const buscarAtendimento = async (req, res) => {
  try {
    const atendimento = await Atendimento.findById(req.params.id).populate('criadoPor', 'nomeCompleto');
    
    if (!atendimento) return res.status(404).json({ message: "Atendimento não encontrado" });

    // Se não for supervisor, verifica se ele tem acesso àquela área específica
    if (req.usuario.perfilAcesso !== 'supervisor') {
        const areaVinculada = await Area.findOne({ usuarioId: req.usuario.id });
        if (!areaVinculada || !areaVinculada.areas.includes(atendimento.categoriaAssunto)) {
             return res.status(403).json({ message: "Você não tem acesso a este chamado." });
        }
    }

    res.json(atendimento);
  } catch (error) {
    res.status(500).json({ message: "Erro ao buscar atendimento", error });
  }
};

// Atualizar atendimento
export const atualizarAtendimento = async (req, res) => {
  try {
    // Trava de perfil
    if (req.usuario.perfilAcesso !== 'supervisor' && req.usuario.perfilAcesso !== 'atendente') {
        return res.status(403).json({ message: "Acesso negado para edição." });
    }

    const atendimentoAtualizado = await Atendimento.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!atendimentoAtualizado)
      return res.status(404).json({ message: "Atendimento não encontrado" });
    
    res.json(atendimentoAtualizado);
  } catch (error) {
    res.status(500).json({ message: "Erro ao atualizar atendimento", error });
  }
};

// Deletar atendimento
export const deletarAtendimento = async (req, res) => {
  try {
    if (req.usuario.perfilAcesso !== 'supervisor') {
        return res.status(403).json({ message: "Apenas supervisores podem deletar." });
    }

    const atendimento = await Atendimento.findByIdAndDelete(req.params.id);
    if (!atendimento)
      return res.status(404).json({ message: "Atendimento não encontrado" });
    res.json({ message: "Atendimento deletado com sucesso" });
  } catch (error) {
    res.status(500).json({ message: "Erro ao deletar atendimento", error });
  }
};
