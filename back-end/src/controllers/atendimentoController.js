import Atendimento from "../models/Atendimento.js";
import Area from "../models/Area.js";

export const criarAtendimento = async (req, res) => {
  try {
    if (req.usuario.perfilAcesso !== 'supervisor' && req.usuario.perfilAcesso !== 'atendente') {
        return res.status(403).json({ message: "Acesso negado." });
    }
    const dadosParaSalvar = { ...req.body };

    // --- ATRIBUIÇÃO AUTOMÁTICA ---
    if (!dadosParaSalvar.atendente) {
        dadosParaSalvar.atendente = req.usuario.id;
    }

    if (!dadosParaSalvar.numeroProtocolo) {
        dadosParaSalvar.numeroProtocolo = `AUTO-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    }

    const novoAtendimento = new Atendimento({ ...dadosParaSalvar, criadoPor: req.usuario.id });
    await novoAtendimento.save();

    const populado = await Atendimento.findById(novoAtendimento._id)
      .populate('criadoPor', 'nomeCompleto')
      .populate('atendente', 'nomeCompleto');

    res.status(201).json(populado);
  } catch (error) {
    res.status(500).json({ message: "Erro ao criar", error });
  }
};

export const atualizarAtendimento = async (req, res) => {
  try {
    const { id } = req.params;
    const d = req.body; 

    const dadosFormatados = {
      tipoCliente: d.cliente || d.tipoCliente,
      categoriaAssunto: d.area || d.categoriaAssunto,
      descricaoDetalhada: d.descricao || d.descricaoDetalhada,
      nivelPrioridade: d.prioridade || d.nivelPrioridade,
      avanco: d.status || d.avanco,
      atendente: d.atendente,
      origem: d.origem
    };

    const atualizado = await Atendimento.findByIdAndUpdate(
      id,
      { $set: dadosFormatados }, 
      { new: true }
    ).populate('atendente', 'nomeCompleto');
    
    if (!atualizado) return res.status(404).json({ message: "Não encontrado" });
    res.json(atualizado);
  } catch (error) {
    res.status(500).json({ message: "Erro ao salvar", error });
  }
};

export const listarAtendimentos = async (req, res) => {
  try {
    const { id, perfilAcesso } = req.usuario;
    let filtro = {};
    if (perfilAcesso !== 'supervisor' && perfilAcesso !== 'atendente') {
        const areaVinculada = await Area.findOne({ usuarioId: id });
        if (!areaVinculada || !areaVinculada.areas || areaVinculada.areas.length === 0) return res.json([]); 
        filtro = { categoriaAssunto: { $in: areaVinculada.areas } };
    }
    const atendimentos = await Atendimento.find(filtro)
      .populate('criadoPor', 'nomeCompleto email')
      .populate('atendente', 'nomeCompleto')
      .sort({ createdAt: -1 });
    res.json(atendimentos);
  } catch (error) {
    res.status(500).json({ message: "Erro ao carregar chamados" });
  }
};

export const buscarAtendimento = async (req, res) => {
  try {
    const atendimento = await Atendimento.findById(req.params.id)
      .populate('criadoPor', 'nomeCompleto')
      .populate('atendente', 'nomeCompleto');
    if (!atendimento) return res.status(404).json({ message: "Não encontrado" });
    res.json(atendimento);
  } catch (error) {
    res.status(500).json({ message: "Erro ao buscar", error });
  }
};

export const deletarAtendimento = async (req, res) => {
  try {
    if (req.usuario.perfilAcesso !== 'supervisor') return res.status(403).json({ message: "Negado." });
    await Atendimento.findByIdAndDelete(req.params.id);
    res.json({ message: "Deletado" });
  } catch (error) {
    res.status(500).json({ message: "Erro ao deletar" });
  }
};