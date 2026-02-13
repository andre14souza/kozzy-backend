import Atendimento from "../models/Atendimento.js";
import Area from "../models/Area.js";

// Criar atendimento
export const criarAtendimento = async (req, res) => {
  try {
    if (req.usuario.perfilAcesso !== 'supervisor' && req.usuario.perfilAcesso !== 'atendente') {
        return res.status(403).json({ message: "Acesso negado." });
    }

    const dadosParaSalvar = { ...req.body };

    // LÓGICA DE PROTOCOLO AUTOMÁTICO
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

// Listar atendimentos
export const listarAtendimentos = async (req, res) => {
  try {
    const { id, perfilAcesso } = req.usuario;
    let filtro = {};

    // Se for Cliente, filtra por área. Supervisor e Atendente veem tudo.
    if (perfilAcesso !== 'supervisor' && perfilAcesso !== 'atendente') {
        const areaVinculada = await Area.findOne({ usuarioId: id });
        if (!areaVinculada || !areaVinculada.areas || areaVinculada.areas.length === 0) {
            return res.json([]); 
        }
        filtro = { categoriaAssunto: { $in: areaVinculada.areas } };
    }

    const atendimentos = await Atendimento.find(filtro)
      .populate('criadoPor', 'nomeCompleto email')
      .populate('atendente', 'nomeCompleto email') // Traz os dados do atendente escalado
      .sort({ createdAt: -1 });

    res.json(atendimentos);
  } catch (error) {
    res.status(500).json({ message: "Erro ao listar atendimentos", error });
  }
};

// Buscar atendimento específico
export const buscarAtendimento = async (req, res) => {
  try {
    const atendimento = await Atendimento.findById(req.params.id)
      .populate('criadoPor', 'nomeCompleto')
      .populate('atendente', 'nomeCompleto');
    
    if (!atendimento) return res.status(404).json({ message: "Atendimento não encontrado" });

    // Permissão: Supervisor e Atendente acessam. Outros verificam área.
    if (req.usuario.perfilAcesso !== 'supervisor' && req.usuario.perfilAcesso !== 'atendente') {
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

// Atualizar atendimento (CORREÇÃO DO PROBLEMA 1 e 2)
export const atualizarAtendimento = async (req, res) => {
  try {
    const atendimentoOriginal = await Atendimento.findById(req.params.id);
    if (!atendimentoOriginal) return res.status(404).json({ message: "Não encontrado" });

    const isSupervisor = req.usuario.perfilAcesso === 'supervisor';
    const isResponsavel = 
        atendimentoOriginal.criadoPor.toString() === req.usuario.id || 
        (atendimentoOriginal.atendente && atendimentoOriginal.atendente.toString() === req.usuario.id);

    // 1. Bloqueio de Segurança
    if (!isSupervisor && !isResponsavel) {
        return res.status(403).json({ message: "Sem permissão para alterar este chamado." });
    }

    // 2. Se for Atendente (e dono), ele SÓ altera o status (avanco)
    if (!isSupervisor && isResponsavel) {
        const apenasStatus = { avanco: req.body.avanco };
        const atualizado = await Atendimento.findByIdAndUpdate(req.params.id, apenasStatus, { new: true })
            .populate('atendente', 'nomeCompleto');
        return res.json(atualizado);
    }

    // 3. Se for Supervisor, permite alterar tudo (inclusive o novo atendente)
    // O segredo é o .populate no final para o Front-end receber o nome atualizado
    const atendimentoAtualizado = await Atendimento.findByIdAndUpdate(
      req.params.id,
      req.body, // Aqui o Front envia { atendente: "ID_DO_NOVO_ATENDENTE" }
      { new: true }
    ).populate('atendente', 'nomeCompleto');
    
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
    if (!atendimento) return res.status(404).json({ message: "Não encontrado" });
    res.json({ message: "Deletado com sucesso" });
  } catch (error) {
    res.status(500).json({ message: "Erro ao deletar atendimento", error });
  }
};