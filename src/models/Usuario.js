import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";

const usuarioSchema = new mongoose.Schema({
  id: {
    type: String,
    default: uuidv4,
    unique: true,
  },
  nomeCompleto: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  senha: {
    type: String,
    required: true,
  },
  perfilAcesso: {
    type: String,
    enum: ["atendente", "supervisor", "Logistica", "Contas a Pagar", "Contas a Receber", "Compras", "T.I", "Comercial"],
    required: true,
  },
});

export const Usuario = mongoose.model("Usuario", usuarioSchema);
