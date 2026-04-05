import Atendimento from "../models/Atendimento.js";
import Area from "../models/Area.js";

export const criarAtendimento = async (req, res) => {
  try {
    if (req.usuario.perfilAcesso !== 'supervisor' && req.usuario.perfilAcesso !== 'atendente') {
        return res.status(403).json({ message: "Acesso negado." });
    }
    
    const dadosParaSalvar = { ...req.body };
    
    if (!dadosParaSalvar.numeroProtocolo) {
        dadosParaSalvar.numeroProtocolo = `AUTO-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    }

    // Garante que se o atendente vier vazio, é o próprio criador
    if (!dadosParaSalvar.atendente) {
        dadosParaSalvar.atendente = req.usuario.id;
    }

    const novoAtendimento = new Atendimento({ ...dadosParaSalvar, criadoPor: req.usuario.id });
    await novoAtendimento.save();

    const populado = await Atendimento.findById(novoAtendimento._id)
      .populate('criadoPor', 'nomeCompleto')
      .populate('atendente', 'nomeCompleto');

    res.status(201).json(populado);
  } catch (error) {
    res.status(500).json({ message: "Erro ao criar atendimento", error });
  }
};

export const atualizarAtendimento = async (req, res) => {
  try {
    const { id } = req.params;
    const d = req.body; 

    // ✅ MAPEAMENTO SEGURO: Liga os nomes do Front aos nomes do Banco
    // Utilizando atribuição dinâmica para permitir atualizações parciais (ex: do Kanban)
    // Sem sobrescrever campos existentes com vazio/nulo caso não sejam enviados.
    const dadosFormatados = {};
    
    if (d.cliente || d.tipoCliente) dadosFormatados.tipoCliente = d.cliente || d.tipoCliente;
    if (d.area || d.categoriaAssunto) dadosFormatados.categoriaAssunto = d.area || d.categoriaAssunto;
    if (d.categoria || d.assuntoEspecifico || d.assunto) dadosFormatados.assuntoEspecifico = d.categoria || d.assuntoEspecifico || d.assunto;
    if (d.descricao || d.descricaoDetalhada) dadosFormatados.descricaoDetalhada = d.descricao || d.descricaoDetalhada;
    if (d.prioridade || d.nivelPrioridade) dadosFormatados.nivelPrioridade = d.prioridade || d.nivelPrioridade;
    if (d.status || d.avanco) dadosFormatados.avanco = d.status || d.avanco;
    
    if (d.atendente !== undefined) dadosFormatados.atendente = d.atendente || null;
    if (d.solucao !== undefined) dadosFormatados.solucao = d.solucao;
    if (d.origem !== undefined) dadosFormatados.origem = d.origem;

    // ✅ CORREÇÃO: Utiliza o $set com os dados formatados limpos
    const atualizado = await Atendimento.findByIdAndUpdate(
      id,
      { $set: dadosFormatados }, 
      { new: true }
    ).populate('atendente', 'nomeCompleto');
    
    if (!atualizado) return res.status(404).json({ message: "Chamado não encontrado" });
    res.json(atualizado);
  } catch (error) {
    console.error("ERRO AO SALVAR:", error);
    res.status(500).json({ message: "Erro interno ao salvar" });
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
    if (req.usuario.perfilAcesso !== 'supervisor') return res.status(403).json({ message: "Acesso negado." });
    await Atendimento.findByIdAndDelete(req.params.id);
    res.json({ message: "Chamado deletado com sucesso" });
  } catch (error) {
    res.status(500).json({ message: "Erro ao deletar chamado" });
  }
};