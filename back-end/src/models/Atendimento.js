import mongoose from "mongoose";

const AtendimentoSchema = new mongoose.Schema({
  numeroProtocolo: { type: String, required: true, unique: true },
  tipoCliente: {
    type: String,
    enum: ["entregador", "vendedor", "cliente", "interno", "supervisor", "gerente"],
    required: true
  },
  categoriaAssunto: {
    type: String,
    enum: ["Logistica", "Contas a Pagar", "Contas a Receber", "Compras", "T.I", "Comercial"],
    required: true
  },
  // ✅ CORREÇÃO: Coluna do Assunto adicionada! Sem isto o banco não guarda nada.
  assuntoEspecifico: { 
    type: String, 
    required: true 
  },
  dataAtendimento: { type: Date, default: Date.now },
  origem: { type: String, enum: ['whatsapp', 'email'], default: 'email' },
  hora: { type: String, required: true },
  descricaoDetalhada: { type: String, required: true },
  nivelPrioridade: {
    type: String,
    enum: ["Baixa Prioridade", "Média Prioridade", "Alta Prioridade", "Urgente"],
    default: "Média Prioridade"
  },
  dataLimite: { type: Date },
  avanco: {
    type: String,
    enum: ["aberto", "em andamento", "concluido", "encerrado"],
    default: "aberto"
  },
  // ✅ CORREÇÃO: Coluna de solução garantida aqui
  solucao: { type: String, default: "" }, 
  criadoPor: { type: mongoose.Schema.Types.ObjectId, ref: "Usuario", required: true },
  atendente: { type: mongoose.Schema.Types.ObjectId, ref: "Usuario", default: null },
  dataConclusao: { type: Date },
  horaConclusao: { type: String },
  anexo: {
    nomeOriginal: { type: String },
    caminho: { type: String },
    mimetype: { type: String }
  },
  comentarios: [{
    usuario: { type: mongoose.Schema.Types.ObjectId, ref: "Usuario", required: true },
    mensagem: { type: String },
    anexo: {
      nomeOriginal: { type: String },
      caminho: { type: String },
      mimetype: { type: String }
    },
    dataCriacao: { type: Date, default: Date.now }
  }]
}, { timestamps: true });

export default mongoose.model("Atendimento", AtendimentoSchema);