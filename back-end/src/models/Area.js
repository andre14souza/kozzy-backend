import mongoose from "mongoose";

const areaEnum = [
  "Logistica",
  "Contas a Pagar",
  "Contas a Receber",
  "Compras",
  "T.I",
  "Comercial"
];

const areaSchema = new mongoose.Schema({
  usuarioId: {
    type: String,
    required: true,
  },
  areas: {
    type: [String],
    enum: areaEnum,
    required: true,
  },
});

export default mongoose.model("Area", areaSchema);
