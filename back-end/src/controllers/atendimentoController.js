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

// Helper: Limpa caminhos de ficheiros guardados no banco para o formato padrão /uploads/nome
const limparCaminhoAnexo = (anexo) => {
  if (!anexo || !anexo.caminho) return anexo;
  // Extrai apenas o nome do arquivo, prevenindo caminhos absolutos como C:\... ou /home/...
  const nomeArquivo = anexo.caminho.split(/[\\/]/).pop();
  anexo.caminho = `/uploads/${nomeArquivo}`;
  anexo.url = `/uploads/${nomeArquivo}`;
  return anexo;
};

export const criarAtendimento = async (req, res) => {
  try {
    if (req.usuario.perfilAcesso !== 'supervisor' && req.usuario.perfilAcesso !== 'atendente') {
        return res.status(403).json({ message: "Acesso negado." });
    }
    
    const dadosParaSalvar = { ...req.body };
    
    if (dadosParaSalvar.anexo) {
      dadosParaSalvar.anexo = limparCaminhoAnexo(dadosParaSalvar.anexo);
    }
    
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
        url: `/uploads/${req.file.filename}`, // Para o frontend usar caminho relativo
        mimetype: req.file.mimetype
      };
    }

    const novoAtendimento = new Atendimento({ ...dadosParaSalvar, criadoPor: req.usuario.id });
    await novoAtendimento.save();

    // Se o frontend injetar chamadoPai pela rota padrão, atrela bidirecionalmente
    if (dadosParaSalvar.chamadoPai) {
      await Atendimento.findByIdAndUpdate(dadosParaSalvar.chamadoPai, { $push: { subChamados: novoAtendimento._id } });
    }

    const populado = await Atendimento.findById(novoAtendimento._id)
      .populate('criadoPor', 'nomeCompleto')
      .populate('atendente', 'nomeCompleto')
      .populate('comentarios.usuario', 'nomeCompleto');

    res.status(201).json(populado);
  } catch (error) {
    res.status(500).json({ message: "Erro ao criar atendimento", error });
  }
};

export const criarSubChamado = async (req, res) => {
  try {
    if (req.usuario.perfilAcesso !== 'supervisor' && req.usuario.perfilAcesso !== 'atendente') {
        return res.status(403).json({ message: "Acesso negado." });
    }
    
    const { id: paiId } = req.params;
    const atendimentoExistente = await Atendimento.findById(paiId);
    if (!atendimentoExistente) return res.status(404).json({ message: "Chamado Pai não encontrado" });

    const dadosParaSalvar = { ...req.body };
    
    if (dadosParaSalvar.anexo) {
      dadosParaSalvar.anexo = limparCaminhoAnexo(dadosParaSalvar.anexo);
    }
    
    // Herda as informações do cliente do chamado pai caso não tenham sido enviadas na requisição
    if (!dadosParaSalvar.tipoCliente) {
        dadosParaSalvar.tipoCliente = atendimentoExistente.tipoCliente;
    }
    if (!dadosParaSalvar.nomeCliente && atendimentoExistente.nomeCliente) {
        dadosParaSalvar.nomeCliente = atendimentoExistente.nomeCliente;
    }
    
    if (!dadosParaSalvar.numeroProtocolo) {
        // Formato para sub-chamados pode herdar o do pai e anexar um sufixo
        dadosParaSalvar.numeroProtocolo = `${atendimentoExistente.numeroProtocolo}-SUB-${Math.floor(Math.random() * 1000)}`;
    }

    if (!dadosParaSalvar.atendente) {
        dadosParaSalvar.atendente = req.usuario.id;
    }

    dadosParaSalvar.dataLimite = calcularDataLimite(dadosParaSalvar.nivelPrioridade || 'Média Prioridade');
    dadosParaSalvar.chamadoPai = paiId;

    if (req.file) {
      dadosParaSalvar.anexo = {
        nomeOriginal: req.file.originalname,
        caminho: `/uploads/${req.file.filename}`,
        url: `/uploads/${req.file.filename}`,
        mimetype: req.file.mimetype
      };
    }

    const novoSubChamado = new Atendimento({ ...dadosParaSalvar, criadoPor: req.usuario.id });
    await novoSubChamado.save();

    // Atualiza o chamado pai (Composite) com a nova "Folha"
    await Atendimento.findByIdAndUpdate(paiId, { $push: { subChamados: novoSubChamado._id } });

    const populado = await Atendimento.findById(novoSubChamado._id)
      .populate('criadoPor', 'nomeCompleto')
      .populate('atendente', 'nomeCompleto')
      .populate('comentarios.usuario', 'nomeCompleto');

    res.status(201).json(populado);
  } catch (error) {
    res.status(500).json({ message: "Erro ao criar sub-chamado", error });
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
    
    let prioridadeRaw = d.prioridade || d.nivelPrioridade;
    if (prioridadeRaw) {
      prioridadeRaw = prioridadeRaw.trim();
      // Normalização para os valores do Schema
      if (/^baixa/i.test(prioridadeRaw)) prioridadeRaw = "Baixa Prioridade";
      else if (/^m[ée]dia/i.test(prioridadeRaw)) prioridadeRaw = "Média Prioridade";
      else if (/^alta/i.test(prioridadeRaw)) prioridadeRaw = "Alta Prioridade";
      else if (/urgente/i.test(prioridadeRaw)) prioridadeRaw = "Urgente";

      const prioridadesPermitidas = ["Baixa Prioridade", "Média Prioridade", "Alta Prioridade", "Urgente"];
      if (!prioridadesPermitidas.includes(prioridadeRaw)) {
        return res.status(400).json({ message: `Prioridade inválida: ${d.prioridade || d.nivelPrioridade}. Valores permitidos: Baixa Prioridade, Média Prioridade, Alta Prioridade, Urgente` });
      }
      dadosFormatados.nivelPrioridade = prioridadeRaw;
    }

    if (d.status || d.avanco) dadosFormatados.avanco = d.status || d.avanco;
    
    if (d.atendente !== undefined) dadosFormatados.atendente = d.atendente || null;
    if (d.solucao !== undefined) dadosFormatados.solucao = d.solucao;
    if (d.origem !== undefined) dadosFormatados.origem = d.origem;

    if (req.file) {
      dadosFormatados.anexo = {
        nomeOriginal: req.file.originalname,
        caminho: `/uploads/${req.file.filename}`,
        url: `/uploads/${req.file.filename}`,
        mimetype: req.file.mimetype
      };
    } else if (d.anexo !== undefined) {
      dadosFormatados.anexo = d.anexo ? limparCaminhoAnexo(d.anexo) : null;
    }

    const atendimentoExistente = await Atendimento.findById(id);
    if (!atendimentoExistente) return res.status(404).json({ message: "Chamado não encontrado" });

    // ✅ VERIFICAÇÃO DE PERMISSÃO PARA EDIÇÃO
    const ehSupervisor = req.usuario.perfilAcesso === 'supervisor';
    const ehAtendenteResponsavel = atendimentoExistente.atendente && atendimentoExistente.atendente.toString() === req.usuario.id.toString();
    const ehCriador = atendimentoExistente.criadoPor && atendimentoExistente.criadoPor.toString() === req.usuario.id.toString();
    const estaAssumindo = !atendimentoExistente.atendente && dadosFormatados.atendente === req.usuario.id;

    if (!ehSupervisor && !ehAtendenteResponsavel && !ehCriador && !estaAssumindo) {
      return res.status(403).json({ message: "Acesso negado. Apenas o supervisor, o criador ou o atendente responsável podem editar este chamado." });
    }

    // Recalcula o SLA apenas se a prioridade foi alterada
    if (dadosFormatados.nivelPrioridade && dadosFormatados.nivelPrioridade !== atendimentoExistente.nivelPrioridade) {
      dadosFormatados.dataLimite = calcularDataLimite(dadosFormatados.nivelPrioridade);
    }

    // ✅ CORREÇÃO: Utiliza o $set com os dados formatados limpos
    // Isto garante que não interferimos com a estrutura de árvore do Composite (chamadoPai/subChamados)
    // caso não sejam enviados na request.
    const atualizado = await Atendimento.findByIdAndUpdate(
      id,
      { $set: dadosFormatados }, 
      { new: true }
    )
      .populate('criadoPor', 'nomeCompleto')
      .populate('atendente', 'nomeCompleto')
      .populate('comentarios.usuario', 'nomeCompleto')
      .populate('subChamados', 'numeroProtocolo assuntoEspecifico avanco nivelPrioridade');
    
    if (!atualizado) return res.status(404).json({ message: "Chamado não encontrado" });
    
    res.json(atualizado);
  } catch (error) {
    console.error("ERRO AO ATUALIZAR ATENDIMENTO:", error);
    res.status(400).json({ message: error.message || "Erro interno ao salvar" });
  }
};

// Helper: rejeita valores inúteis vindos da query string
const isValid = (val) => val !== undefined && val !== null && val !== '' && val !== 'todos';

export const listarAtendimentos = async (req, res) => {
  try {
    const { id, perfilAcesso } = req.usuario;
    const { status, prioridade, cliente, area, origem, atendente, dataInicio, dataFim, numeroProtocolo, prioridadeMinima, apenasHoje } = req.query;

    // ─── 1. Construção dinâmica do filtro ────────────────────────────────────
    let filtroQuery = {};

    // Por padrão exibe apenas chamados raiz (sem pai)
    // Se o usuário procurou por algo exato (como um número de protocolo), ignora isso
    if (!isValid(numeroProtocolo)) {
      filtroQuery.chamadoPai = null;
    } else {
      filtroQuery.numeroProtocolo = numeroProtocolo; // Busca exata
    }

    if (isValid(status)) {
      filtroQuery.avanco = { $regex: new RegExp(`^${status}$`, 'i') };
    }
    
    if (prioridadeMinima === 'true') {
      filtroQuery.nivelPrioridade = { $in: ['Alta Prioridade', 'Urgente', 'Alta'] };
    } else if (isValid(prioridade)) {
      filtroQuery.nivelPrioridade = { $regex: new RegExp(`^${prioridade}$`, 'i') };
    }

    if (isValid(cliente)) {
      // Busca parcial e case-insensitive
      filtroQuery.tipoCliente = { $regex: cliente, $options: 'i' };
    }

    if (apenasHoje === 'true') {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);
      filtroQuery.createdAt = { $gte: startOfDay, $lte: endOfDay };
    }

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
    console.log("================ FILTRO DA QUERY (listarAtendimentos) ================");
    console.log(JSON.stringify(filtroQuery, null, 2));
    console.log("======================================================================");

    const atendimentos = await Atendimento.find(filtroQuery)
      .populate('criadoPor', 'nomeCompleto email')
      .populate('atendente', 'nomeCompleto')
      .populate('comentarios.usuario', 'nomeCompleto')
      .populate('subChamados')
      .sort({ createdAt: -1 });

    // ─── Proteção contra Referências Deletadas (Populate Null Guard) e Privacidade ───
    const atendimentosProcessados = atendimentos.map(atd => {
      const obj = atd.toObject();
      
      // Se criadoPor ou atendente (que tinha ID mas usuário foi apagado) vier nulo
      if (!obj.criadoPor) {
        obj.criadoPor = { nomeCompleto: 'Usuário Removido', email: 'removido@sistema' };
      }
      
      if (obj.comentarios && Array.isArray(obj.comentarios)) {
        obj.comentarios = obj.comentarios.filter(c => {
          if (!c.isPrivado) return true;
          const ehSupervisor = req.usuario.perfilAcesso === 'supervisor';
          const atendenteId = obj.atendente ? (obj.atendente._id ? obj.atendente._id.toString() : obj.atendente.toString()) : null;
          const ehAtendente = atendenteId === req.usuario.id;
          return ehSupervisor || ehAtendente;
        }).map(c => {
          if (!c.usuario) {
            c.usuario = { nomeCompleto: 'Usuário Removido' };
          }
          return c;
        });
      }
      
      // Normaliza caminhos de anexos para registos antigos
      if (obj.anexo) obj.anexo = limparCaminhoAnexo(obj.anexo);
      if (obj.comentarios) {
        obj.comentarios = obj.comentarios.map(c => {
          if (c.anexo) c.anexo = limparCaminhoAnexo(c.anexo);
          return c;
        });
      }

      return obj;
    });

    // Garante retorno de array puro
    res.json(Array.isArray(atendimentosProcessados) ? atendimentosProcessados : []);
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
      .populate('comentarios.usuario', 'nomeCompleto')
      .populate('subChamados', 'numeroProtocolo assuntoEspecifico avanco nivelPrioridade');
    if (!atendimento) return res.status(404).json({ message: "Não encontrado" });

    const atdObj = atendimento.toObject();

    console.log(`[GET /atendimentos/${req.params.id}] Buscando detalhes do chamado. Filtros de privacidade sendo aplicados.`);

    if (atdObj.comentarios && Array.isArray(atdObj.comentarios)) {
      atdObj.comentarios = atdObj.comentarios.filter(c => {
        if (!c.isPrivado) return true;
        const ehSupervisor = req.usuario.perfilAcesso === 'supervisor';
        const atendenteId = atdObj.atendente ? (atdObj.atendente._id ? atdObj.atendente._id.toString() : atdObj.atendente.toString()) : null;
        const ehAtendente = atendenteId === req.usuario.id;
        return ehSupervisor || ehAtendente;
      });
    }

    // Normaliza caminhos de anexos para registos antigos
    if (atdObj.anexo) atdObj.anexo = limparCaminhoAnexo(atdObj.anexo);
    if (atdObj.comentarios) {
      atdObj.comentarios = atdObj.comentarios.map(c => {
        if (c.anexo) c.anexo = limparCaminhoAnexo(c.anexo);
        return c;
      });
    }

    res.json(atdObj);
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
    const { mensagem, isPrivado } = req.body;

    if (!mensagem && !req.file) {
      return res.status(400).json({ message: "É necessário enviar uma mensagem ou um anexo." });
    }

    const novoComentario = {
      usuario: req.usuario.id,
      mensagem: mensagem || "Anexo enviado",
      isPrivado: isPrivado === true || isPrivado === 'true'
    };

    if (req.file) {
      novoComentario.anexo = {
        nomeOriginal: req.file.originalname,
        caminho: `/uploads/${req.file.filename}`,
        url: `/uploads/${req.file.filename}`,
        mimetype: req.file.mimetype
      };
    } else if (req.body.anexo) {
      novoComentario.anexo = limparCaminhoAnexo(req.body.anexo);
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

export const obterEstatisticas = async (req, res) => {
  try {
    const estatisticasStatus = await Atendimento.aggregate([
      {
        $group: {
          _id: "$avanco",
          total: { $sum: 1 }
        }
      }
    ]);

    const estatisticasArea = await Atendimento.aggregate([
      {
        $group: {
          _id: "$categoriaAssunto",
          total: { $sum: 1 }
        }
      }
    ]);

    res.json({
      porStatus: estatisticasStatus.map(s => ({ status: s._id, total: s.total })),
      porArea: estatisticasArea.map(a => ({ area: a._id, total: a.total }))
    });

  } catch (error) {
    console.error("ERRO AO OBTER ESTATÍSTICAS:", error);
    res.status(500).json({ message: "Erro ao gerar estatísticas", error });
  }
};