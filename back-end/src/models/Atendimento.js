import mongoose from "mongoose";

const AtendimentoSchema = new mongoose.Schema({
  numeroProtocolo: {
    type: String,
    required: true,
    unique: true
  },
  tipoCliente: {
    type: String,
    enum: ["entregador","vendedor", "cliente","interno","supervisor","gerente"],
    required: true
  },
  categoriaAssunto: {
    type: String,
    enum: [
      "Logistica",
      "Contas a Pagar",
      "Contas a Receber",
      "Compras",
      "T.I",
      "Comercial"
    ],
    required: true
  },
  dataAtendimento: {
    type: Date,
    default: Date.now
  },
  origem: { 
    type: String, 
    enum: ['whatsapp', 'email'], // Opcional: trava para ser só esses dois
    default: 'email'             // Se não vier nada, salva como email
  },
  hora: {
    type: String,
    required: true
  },
  descricaoDetalhada: {
    type: String,
    required: true
  },
  nivelPrioridade: {
    type: String,
    enum: ["Baixa Prioridade", "Média Prioridade", "Alta Prioridade", "Urgente"],
    default: "Média Prioridade"
  },
  avanco: {
    type: String,
    enum: ["aberto", "em andamento", "concluido"],
    default: "aberto"
  },
  criadoPor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Usuario",
    required: true
  },
  dataConclusao: {
    type: Date 
  },
  horaConclusao: {
    type: String 
  }
});

export default mongoose.model("Atendimento", AtendimentoSchema);
