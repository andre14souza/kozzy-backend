import mongoose from "mongoose";
import MensagemChat from "../models/MensagemChat.js";
import { Usuario } from "../models/Usuario.js";
import Atendimento from "../models/Atendimento.js";
import { emitToRoom, emitToAll } from "../socketManager.js";
import { getFileInfo } from "../middleware/upload.js";

// Helper: Limpa caminhos de ficheiros
const limparCaminhoAnexo = (anexo) => {
  if (!anexo || !anexo.caminho) return anexo;
  if (anexo.caminho.startsWith('http') || (anexo.url && anexo.url.startsWith('http'))) return anexo;
  const nomeArquivo = anexo.caminho.split(/[\\/]/).pop();
  anexo.caminho = `/uploads/${nomeArquivo}`;
  anexo.url = `/uploads/${nomeArquivo}`;
  return anexo;
};

/**
 * Lista todos os usuários disponíveis para chat na plataforma
 */
export const listarUsuariosChat = async (req, res) => {
  try {
    const usuarioLogadoId = req.usuario.id;
    const usuarios = await Usuario.find({ _id: { $ne: usuarioLogadoId } })
      .select("_id nomeCompleto email perfilAcesso fotoPerfil cargo departamento statusPresenca")
      .sort({ nomeCompleto: 1 });

    res.json(usuarios);
  } catch (error) {
    console.error("Erro ao listar usuários para chat:", error);
    res.status(500).json({ message: "Erro ao listar usuários", error });
  }
};

/**
 * Lista resumo de conversas do usuário logado (contatos recentes + não lidas)
 */
export const listarConversas = async (req, res) => {
  try {
    const usuarioId = new mongoose.Types.ObjectId(req.usuario.id);

    // 1. Mensagens diretas em que o usuário participou
    const mensagens = await MensagemChat.find({
      $or: [
        { remetente: usuarioId },
        { destinatario: usuarioId }
      ]
    })
      .populate("remetente", "_id nomeCompleto fotoPerfil cargo")
      .populate("destinatario", "_id nomeCompleto fotoPerfil cargo")
      .populate("chamado", "_id numeroProtocolo nomeCliente assuntoEspecifico nivelPrioridade avanco")
      .sort({ createdAt: -1 });

    // Agrupa por contato direto
    const conversasMap = new Map();

    for (const msg of mensagens) {
      if (msg.tipoCanal === 'geral') continue;

      const outroUsuario = msg.remetente._id.toString() === usuarioId.toString()
        ? msg.destinatario
        : msg.remetente;

      if (!outroUsuario || !outroUsuario._id) continue;
      const outroId = outroUsuario._id.toString();

      if (!conversasMap.has(outroId)) {
        conversasMap.set(outroId, {
          contato: outroUsuario,
          ultimaMensagem: {
            texto: msg.texto || (msg.chamado ? `Chamado #${msg.chamado.numeroProtocolo}` : 'Anexo'),
            data: msg.createdAt,
            remetenteId: msg.remetente._id,
            lida: msg.lida
          },
          naoLidas: 0
        });
      }

      // Incrementa não lidas se foi enviada para o usuário logado e ainda não foi lida
      if (msg.destinatario && msg.destinatario._id.toString() === usuarioId.toString() && !msg.lida) {
        conversasMap.get(outroId).naoLidas += 1;
      }
    }

    // 2. Informações do Canal Geral
    const ultimaMensagemGeral = await MensagemChat.findOne({ tipoCanal: 'geral' })
      .populate("remetente", "_id nomeCompleto fotoPerfil")
      .populate("chamado", "_id numeroProtocolo")
      .sort({ createdAt: -1 });

    const totalNaoLidasGeral = await MensagemChat.countDocuments({
      tipoCanal: 'geral',
      remetente: { $ne: usuarioId },
      lidaPor: { $ne: usuarioId }
    });

    const conversasArray = Array.from(conversasMap.values());

    res.json({
      canalGeral: {
        id: 'geral',
        nome: 'Canal Geral da Equipe',
        tipo: 'geral',
        ultimaMensagem: ultimaMensagemGeral ? {
          texto: ultimaMensagemGeral.texto || (ultimaMensagemGeral.chamado ? `Chamado #${ultimaMensagemGeral.chamado.numeroProtocolo}` : 'Anexo'),
          autor: ultimaMensagemGeral.remetente?.nomeCompleto || 'Equipe',
          data: ultimaMensagemGeral.createdAt
        } : null,
        naoLidas: totalNaoLidasGeral
      },
      conversas: conversasArray
    });
  } catch (error) {
    console.error("Erro ao listar conversas:", error);
    res.status(500).json({ message: "Erro ao listar conversas", error });
  }
};

/**
 * Lista histórico de mensagens entre o usuário logado e outro usuário ou canal geral
 */
export const listarMensagens = async (req, res) => {
  try {
    const { contatoId } = req.params;
    const usuarioId = req.usuario.id;

    let filtro = {};

    if (contatoId === 'geral') {
      filtro = { tipoCanal: 'geral' };
    } else {
      filtro = {
        tipoCanal: 'direto',
        $or: [
          { remetente: usuarioId, destinatario: contatoId },
          { remetente: contatoId, destinatario: usuarioId }
        ]
      };
    }

    const mensagens = await MensagemChat.find(filtro)
      .populate("remetente", "_id nomeCompleto email fotoPerfil cargo departamento perfilAcesso")
      .populate("destinatario", "_id nomeCompleto email fotoPerfil cargo")
      .populate("chamado", "_id numeroProtocolo tipoCliente nomeCliente categoriaAssunto assuntoEspecifico nivelPrioridade avanco dataAtendimento hora descricaoDetalhada solucao")
      .sort({ createdAt: 1 })
      .limit(200);

    const mensagensProcessadas = mensagens.map(msg => {
      const obj = msg.toObject();
      if (obj.anexos && Array.isArray(obj.anexos)) {
        obj.anexos = obj.anexos.map(limparCaminhoAnexo);
      }
      return obj;
    });

    res.json(mensagensProcessadas);
  } catch (error) {
    console.error("Erro ao listar mensagens:", error);
    res.status(500).json({ message: "Erro ao listar mensagens", error });
  }
};

/**
 * Envia uma mensagem no chat (direta ou canal geral, suporta chamado e anexos)
 */
export const enviarMensagem = async (req, res) => {
  try {
    const remetenteId = req.usuario.id;
    const { destinatario, tipoCanal, texto, chamadoId } = req.body;

    const isGeral = tipoCanal === 'geral' || destinatario === 'geral';

    if (!isGeral && !destinatario) {
      return res.status(400).json({ message: "Destinatário não informado." });
    }

    if (!texto && !chamadoId && (!req.files || req.files.length === 0) && !req.file) {
      return res.status(400).json({ message: "Mensagem vazia." });
    }

    const anexos = [];
    const arquivos = req.files && req.files.length > 0 ? req.files : (req.file ? [req.file] : []);
    for (const arq of arquivos) {
      anexos.push(limparCaminhoAnexo(getFileInfo(arq)));
    }

    const novaMensagem = new MensagemChat({
      remetente: remetenteId,
      destinatario: isGeral ? null : destinatario,
      tipoCanal: isGeral ? 'geral' : 'direto',
      texto: texto || '',
      chamado: chamadoId || null,
      anexos: anexos,
      lida: false,
      lidaPor: isGeral ? [remetenteId] : []
    });

    await novaMensagem.save();

    const populada = await MensagemChat.findById(novaMensagem._id)
      .populate("remetente", "_id nomeCompleto email fotoPerfil cargo departamento perfilAcesso")
      .populate("destinatario", "_id nomeCompleto email fotoPerfil cargo")
      .populate("chamado", "_id numeroProtocolo tipoCliente nomeCliente categoriaAssunto assuntoEspecifico nivelPrioridade avanco dataAtendimento hora descricaoDetalhada solucao");

    const nomeRemetente = populada.remetente?.nomeCompleto || "Colega de equipe";
    const fotoRemetente = populada.remetente?.fotoPerfil || "";

    // 🔔 Disparo de Socket.io em tempo real
    if (isGeral) {
      emitToRoom('chat:geral', 'chat:mensagem_recebida', populada);
      // Notificação broadcast para todos conectados (exceto o próprio remetente)
      emitToAll('notificacao:nova', {
        id: `chat-${populada._id}`,
        tipo: populada.chamado ? 'chamado_compartilhado' : 'mensagem_chat',
        titulo: populada.chamado ? 'Chamado compartilhado no Canal Geral' : 'Nova mensagem no Canal Geral',
        mensagem: populada.chamado 
          ? `${nomeRemetente} compartilhou o chamado #${populada.chamado.numeroProtocolo} (${populada.chamado.assuntoEspecifico || populada.chamado.categoriaAssunto})`
          : `${nomeRemetente}: ${populada.texto ? populada.texto.slice(0, 60) : '📎 Anexo enviado'}`,
        autor: nomeRemetente,
        fotoAutor: fotoRemetente,
        chamadoId: populada.chamado?._id || null,
        numeroProtocolo: populada.chamado?.numeroProtocolo || null,
        nomeCliente: populada.chamado?.nomeCliente || null,
        assunto: populada.chamado?.assuntoEspecifico || null,
        prioridade: populada.chamado?.nivelPrioridade || null,
        status: populada.chamado?.avanco || null,
        chatOrigem: 'geral',
        timestamp: new Date().toISOString(),
        lida: false
      });
    } else {
      // Envia para o destinatário e para o remetente (para sincronizar em tempo real)
      emitToRoom(`user:${destinatario}`, 'chat:mensagem_recebida', populada);
      emitToRoom(`user:${remetenteId}`, 'chat:mensagem_recebida', populada);

      // Notificação pessoal para o destinatário
      emitToRoom(`user:${destinatario}`, 'notificacao:nova', {
        id: `chat-${populada._id}`,
        tipo: populada.chamado ? 'chamado_compartilhado' : 'mensagem_chat',
        titulo: populada.chamado ? 'Chamado compartilhado com você' : `Mensagem de ${nomeRemetente}`,
        mensagem: populada.chamado
          ? `${nomeRemetente} enviou o chamado #${populada.chamado.numeroProtocolo} para você`
          : `${populada.texto ? populada.texto.slice(0, 70) : '📎 Enviou um anexo'}`,
        autor: nomeRemetente,
        fotoAutor: fotoRemetente,
        chamadoId: populada.chamado?._id || null,
        numeroProtocolo: populada.chamado?.numeroProtocolo || null,
        nomeCliente: populada.chamado?.nomeCliente || null,
        assunto: populada.chamado?.assuntoEspecifico || null,
        prioridade: populada.chamado?.nivelPrioridade || null,
        status: populada.chamado?.avanco || null,
        remetenteId: remetenteId,
        chatOrigem: 'direto',
        timestamp: new Date().toISOString(),
        lida: false
      });
    }

    res.status(201).json(populada);
  } catch (error) {
    console.error("Erro ao enviar mensagem:", error);
    res.status(500).json({ message: "Erro ao enviar mensagem", error });
  }
};

/**
 * Marca mensagens de uma conversa como lidas
 */
export const marcarComoLidas = async (req, res) => {
  try {
    const { contatoId } = req.params;
    const usuarioId = req.usuario.id;

    if (contatoId === 'geral') {
      await MensagemChat.updateMany(
        { tipoCanal: 'geral', lidaPor: { $ne: usuarioId } },
        { $push: { lidaPor: usuarioId } }
      );
    } else {
      await MensagemChat.updateMany(
        {
          remetente: contatoId,
          destinatario: usuarioId,
          lida: false
        },
        { $set: { lida: true } }
      );

      // Notifica o outro usuário que suas mensagens foram lidas
      emitToRoom(`user:${contatoId}`, 'chat:mensagens_lidas', {
        leitorId: usuarioId,
        contatoId: contatoId
      });
    }

    res.json({ message: "Mensagens marcadas como lidas" });
  } catch (error) {
    console.error("Erro ao marcar mensagens como lidas:", error);
    res.status(500).json({ message: "Erro ao marcar como lidas", error });
  }
};
