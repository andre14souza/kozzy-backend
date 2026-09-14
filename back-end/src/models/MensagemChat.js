import mongoose from "mongoose";

const AnexoChatSchema = new mongoose.Schema({
  nomeOriginal: { type: String },
  caminho: { type: String },
  url: { type: String },
  mimetype: { type: String }
}, { _id: false });

const MensagemChatSchema = new mongoose.Schema({
  remetente: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Usuario",
    required: true
  },
  destinatario: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Usuario",
    default: null
  },
  tipoCanal: {
    type: String,
    enum: ["direto", "geral"],
    default: "direto"
  },
  texto: {
    type: String,
    default: ""
  },
  chamado: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Atendimento",
    default: null
  },
  anexos: {
    type: [AnexoChatSchema],
    default: []
  },
  lida: {
    type: Boolean,
    default: false
  },
  lidaPor: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "Usuario"
  }],
  dataEnvio: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

export default mongoose.model("MensagemChat", MensagemChatSchema);
