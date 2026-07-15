import mongoose from "mongoose";

// Schema reutilizável para um único anexo
const AnexoSchema = new mongoose.Schema({
  nomeOriginal: { type: String },
  caminho: { type: String },
  url: { type: String },
  mimetype: { type: String }
}, { _id: false });

const AtendimentoSchema = new mongoose.Schema({
  numeroProtocolo: { type: String, required: true, unique: true },
  tipoCliente: {
    type: String,
    enum: ["entregador", "vendedor", "cliente", "interno", "supervisor", "gerente"],
    required: true
  },
  nomeCliente: { type: String, required: false },
  categoriaAssunto: {
    type: String,
    enum: ["Logistica", "Contas a Pagar", "Contas a Receber", "Compras", "T.I", "Comercial"],
    required: true
  },
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
  solucao: { type: String, default: "" }, 
  criadoPor: { type: mongoose.Schema.Types.ObjectId, ref: "Usuario", required: true },
  atendente: { type: mongoose.Schema.Types.ObjectId, ref: "Usuario", default: null },
  dataConclusao: { type: Date },
  horaConclusao: { type: String },
  // Campo legado (compatibilidade com registros antigos)
  anexo: AnexoSchema,
  // NOVO: múltiplos anexos por chamado
  anexos: { type: [AnexoSchema], default: [] },
  comentarios: [{
    usuario: { type: mongoose.Schema.Types.ObjectId, ref: "Usuario", required: true },
    mensagem: { type: String },
    anexo: AnexoSchema,
    isPrivado: { type: Boolean, default: false },
    dataCriacao: { type: Date, default: Date.now }
  }],
  chamadoPai: { type: mongoose.Schema.Types.ObjectId, ref: "Atendimento", default: null },
  subChamados: [{ type: mongoose.Schema.Types.ObjectId, ref: "Atendimento" }]
}, { timestamps: true });

export default mongoose.model("Atendimento", AtendimentoSchema);