import Atendimento from "../models/Atendimento.js";
import Area from "../models/Area.js";

// Criar atendimento
export const criarAtendimento = async (req, res) => {
  try {
    if (req.usuario.perfilAcesso !== 'supervisor' && req.usuario.perfilAcesso !== 'atendente') {
        return res.status(403).json({ message: "Acesso negado." });
    }

    // Criamos uma cópia dos dados para não alterar o req.body original
    const dadosParaSalvar = { ...req.body };

    // LÓGICA DE PROTOCOLO AUTOMÁTICO:
    // Se o numeroProtocolo estiver vazio ou não existir, geramos um
    if (!dadosParaSalvar.numeroProtocolo) {
        const timestamp = Date.now();
        const aleatorio = Math.floor(Math.random() * 1000);
        dadosParaSalvar.numeroProtocolo = `AUTO-${timestamp}-${aleatorio}`;
    }

    const novoAtendimento = new Atendimento({
      ...dadosParaSalvar,
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
    if (perfilAcesso !== 'supervisor' && perfilAcesso !== 'atendente') {
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
    const atendimento = await Atendimento.findById(req.params.id);
    
    if (!atendimento) {
        return res.status(404).json({ message: "Atendimento não encontrado" });
    }

    const isSupervisor = req.usuario.perfilAcesso === 'supervisor';
    const isResponsavel = 
        atendimento.criadoPor.toString() === req.usuario.id || 
        (atendimento.atribuidoA && atendimento.atribuidoA.toString() === req.usuario.id);

    // Bloqueia se não for supervisor e nem o responsável pelo chamado
    if (!isSupervisor && !isResponsavel) {
        return res.status(403).json({ message: "Você não tem permissão para alterar este chamado." });
    }

    // Se for atendente (e responsável), ele SÓ pode mudar o status (avanco)
    if (!isSupervisor && isResponsavel) {
        const apenasStatus = { avanco: req.body.avanco };
        const atualizado = await Atendimento.findByIdAndUpdate(req.params.id, apenasStatus, { new: true });
        return res.json(atualizado);
    }

    // Se for supervisor, permite atualizar tudo (incluindo o novo atendente)
    const atendimentoAtualizado = await Atendimento.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    
    res.json(atendimentoAtualizado);
  } catch (error) {
    console.error("Erro ao atualizar:", error);
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
