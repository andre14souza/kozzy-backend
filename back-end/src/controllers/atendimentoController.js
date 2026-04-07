import Atendimento from "../models/Atendimento.js";
import Area from "../models/Area.js";

const calcularDataLimite = (prioridade) => {
  const horas = {
    'Urgente': 4,
    'Alta Prioridade': 24,
    'Média Prioridade': 48,
    'Baixa Prioridade': 72
  };
  const horasAdicionais = horas[prioridade] || 48;
  const dataLimite = new Date();
  dataLimite.setHours(dataLimite.getHours() + horasAdicionais);
  return dataLimite;
};

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

    dadosParaSalvar.dataLimite = calcularDataLimite(dadosParaSalvar.nivelPrioridade || 'Média Prioridade');

    if (req.file) {
      dadosParaSalvar.anexo = {
        nomeOriginal: req.file.originalname,
        caminho: `/uploads/${req.file.filename}`,
        mimetype: req.file.mimetype
      };
    }

    const novoAtendimento = new Atendimento({ ...dadosParaSalvar, criadoPor: req.usuario.id });
    await novoAtendimento.save();

    const populado = await Atendimento.findById(novoAtendimento._id)
      .populate('criadoPor', 'nomeCompleto')
      .populate('atendente', 'nomeCompleto')
      .populate('comentarios.usuario', 'nomeCompleto');

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
    if (d.nomeCliente !== undefined) dadosFormatados.nomeCliente = d.nomeCliente;
    if (d.area || d.categoriaAssunto) dadosFormatados.categoriaAssunto = d.area || d.categoriaAssunto;
    if (d.categoria || d.assuntoEspecifico || d.assunto) dadosFormatados.assuntoEspecifico = d.categoria || d.assuntoEspecifico || d.assunto;
    if (d.descricao || d.descricaoDetalhada) dadosFormatados.descricaoDetalhada = d.descricao || d.descricaoDetalhada;
    if (d.prioridade || d.nivelPrioridade) dadosFormatados.nivelPrioridade = d.prioridade || d.nivelPrioridade;
    if (d.status || d.avanco) dadosFormatados.avanco = d.status || d.avanco;
    
    if (d.atendente !== undefined) dadosFormatados.atendente = d.atendente || null;
    if (d.solucao !== undefined) dadosFormatados.solucao = d.solucao;
    if (d.origem !== undefined) dadosFormatados.origem = d.origem;

    const atendimentoExistente = await Atendimento.findById(id);
    if (!atendimentoExistente) return res.status(404).json({ message: "Chamado não encontrado" });

    // Recalcula o SLA apenas se a prioridade foi alterada
    if (dadosFormatados.nivelPrioridade && dadosFormatados.nivelPrioridade !== atendimentoExistente.nivelPrioridade) {
      dadosFormatados.dataLimite = calcularDataLimite(dadosFormatados.nivelPrioridade);
    }

    // ✅ CORREÇÃO: Utiliza o $set com os dados formatados limpos
    const atualizado = await Atendimento.findByIdAndUpdate(
      id,
      { $set: dadosFormatados }, 
      { new: true }
    )
      .populate('atendente', 'nomeCompleto')
      .populate('comentarios.usuario', 'nomeCompleto');
    
    if (!atualizado) return res.status(404).json({ message: "Chamado não encontrado" });
    res.json(atualizado);
  } catch (error) {
    console.error("ERRO AO SALVAR:", error);
    res.status(500).json({ message: "Erro interno ao salvar" });
  }
};

// Helper: rejeita valores inúteis vindos da query string
const isValid = (val) => val !== undefined && val !== null && val !== '' && val !== 'todos';

export const listarAtendimentos = async (req, res) => {
  try {
    const { id, perfilAcesso } = req.usuario;
    const { status, prioridade, cliente, area, origem, atendente, dataInicio, dataFim } = req.query;

    // ─── 1. Construção dinâmica do filtro ────────────────────────────────────
    let filtroQuery = {};

    if (isValid(status))     filtroQuery.avanco          = status;
    if (isValid(prioridade)) filtroQuery.nivelPrioridade  = prioridade;
    if (isValid(cliente))    filtroQuery.tipoCliente      = cliente;
    if (isValid(origem))     filtroQuery.origem           = origem;
    if (isValid(atendente))  filtroQuery.atendente        = atendente; // ObjectId enviado pelo frontend

    // Filtro por área (pode ser sobrescrito pela regra de segurança abaixo)
    if (isValid(area))       filtroQuery.categoriaAssunto = area;

    // Intervalo de datas sobre dataAtendimento
    if (isValid(dataInicio) || isValid(dataFim)) {
      filtroQuery.dataAtendimento = {};
      if (isValid(dataInicio)) {
        filtroQuery.dataAtendimento.$gte = new Date(dataInicio);
      }
      if (isValid(dataFim)) {
        const fim = new Date(dataFim);
        fim.setHours(23, 59, 59, 999);
        filtroQuery.dataAtendimento.$lte = fim;
      }
    }

    // ─── 2. Regra estrita de segurança (controlo de acesso por área) ─────────
    if (perfilAcesso !== 'supervisor' && perfilAcesso !== 'atendente') {
      const areaVinculada = await Area.findOne({ usuarioId: id });

      if (!areaVinculada || !areaVinculada.areas || areaVinculada.areas.length === 0) {
        return res.json([]);
      }

      const restricaoSeguranca = { categoriaAssunto: { $in: areaVinculada.areas } };

      if (isValid(area)) {
        // Combina o filtro de área pedido com a restrição de segurança via $and,
        // garantindo que o utilizador nunca vê fora das suas áreas permitidas.
        delete filtroQuery.categoriaAssunto;
        filtroQuery.$and = [
          restricaoSeguranca,
          { categoriaAssunto: area }
        ];
      } else {
        // Sem filtro de área na query: aplica apenas a restrição de segurança.
        filtroQuery.categoriaAssunto = restricaoSeguranca.categoriaAssunto;
      }
    }

    // ─── 3. Execução da query ────────────────────────────────────────────────
    const atendimentos = await Atendimento.find(filtroQuery)
      .populate('criadoPor', 'nomeCompleto email')
      .populate('atendente', 'nomeCompleto')
      .populate('comentarios.usuario', 'nomeCompleto')
      .sort({ createdAt: -1 });

    res.json(atendimentos);
  } catch (error) {
    console.error("ERRO AO LISTAR ATENDIMENTOS:", error);
    res.status(500).json({ message: "Erro ao carregar chamados" });
  }
};

export const buscarAtendimento = async (req, res) => {
  try {
    const atendimento = await Atendimento.findById(req.params.id)
      .populate('criadoPor', 'nomeCompleto')
      .populate('atendente', 'nomeCompleto')
      .populate('comentarios.usuario', 'nomeCompleto');
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

export const adicionarComentario = async (req, res) => {
  try {
    const { id } = req.params;
    const { mensagem } = req.body;

    if (!mensagem && !req.file) {
      return res.status(400).json({ message: "É necessário enviar uma mensagem ou um anexo." });
    }

    const novoComentario = {
      usuario: req.usuario.id,
      mensagem: mensagem || "Anexo enviado"
    };

    if (req.file) {
      novoComentario.anexo = {
        nomeOriginal: req.file.originalname,
        caminho: `/uploads/${req.file.filename}`,
        mimetype: req.file.mimetype
      };
    }

    const atendimentoAtualizado = await Atendimento.findByIdAndUpdate(
      id,
      {
        $push: { comentarios: novoComentario }
      },
      { new: true }
    )
      .populate('criadoPor', 'nomeCompleto')
      .populate('atendente', 'nomeCompleto')
      .populate('comentarios.usuario', 'nomeCompleto');

    if (!atendimentoAtualizado) {
      return res.status(404).json({ message: "Chamado não encontrado" });
    }

    res.status(201).json(atendimentoAtualizado);
  } catch (error) {
    res.status(500).json({ message: "Erro ao adicionar comentário", error });
  }
};