import Atendimento from "../models/Atendimento.js";
import Area from "../models/Area.js";

export const criarAtendimento = async (req, res) => {
  try {
    if (req.usuario.perfilAcesso !== 'supervisor' && req.usuario.perfilAcesso !== 'atendente') {
        return res.status(403).json({ message: "Acesso negado." });
    }
    const dadosParaSalvar = { ...req.body };
    if (!dadosParaSalvar.numeroProtocolo) {
        const timestamp = Date.now();
        const aleatorio = Math.floor(Math.random() * 1000);
        dadosParaSalvar.numeroProtocolo = `AUTO-${timestamp}-${aleatorio}`;
    }
    const novoAtendimento = new Atendimento({ ...dadosParaSalvar, criadoPor: req.usuario.id });
    await novoAtendimento.save();
    res.status(201).json(novoAtendimento);
  } catch (error) {
    res.status(500).json({ message: "Erro ao criar atendimento", error });
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
    if (req.usuario.perfilAcesso !== 'supervisor' && req.usuario.perfilAcesso !== 'atendente') {
        const areaVinculada = await Area.findOne({ usuarioId: req.usuario.id });
        if (!areaVinculada || !areaVinculada.areas.includes(atendimento.categoriaAssunto)) {
             return res.status(403).json({ message: "Sem acesso." });
        }
    }
    res.json(atendimento);
  } catch (error) {
    res.status(500).json({ message: "Erro ao buscar", error });
  }
};

export const atualizarAtendimento = async (req, res) => {
  try {
    const chamado = await Atendimento.findById(req.params.id);
    if (!chamado) return res.status(404).json({ message: "Não encontrado" });

    const isSupervisor = req.usuario.perfilAcesso === 'supervisor';
    const isResponsavel = chamado.criadoPor.toString() === req.usuario.id || 
                         (chamado.atendente && chamado.atendente.toString() === req.usuario.id);

    if (!isSupervisor && !isResponsavel) return res.status(403).json({ message: "Sem permissão." });

    if (!isSupervisor && isResponsavel) {
        const apenasStatus = { avanco: req.body.status || req.body.avanco };
        const atualizado = await Atendimento.findByIdAndUpdate(req.params.id, apenasStatus, { new: true });
        return res.json(atualizado);
    }

    const atualizado = await Atendimento.findByIdAndUpdate(req.params.id, req.body, { new: true })
      .populate('atendente', 'nomeCompleto');
    res.json(atualizado);
  } catch (error) {
    res.status(500).json({ message: "Erro ao atualizar" });
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