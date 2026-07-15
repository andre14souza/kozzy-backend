import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─── Cloudinary Configuration ──────────────────────────────────────────────
// Set CLOUDINARY_URL or individual CLOUDINARY_CLOUD_NAME / API_KEY / API_SECRET in .env
if (process.env.CLOUDINARY_URL || process.env.CLOUDINARY_CLOUD_NAME) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true
  });
}

// ─── Choose storage engine ─────────────────────────────────────────────────
let storageEngine;

const hasCloudinary = !!(process.env.CLOUDINARY_URL || process.env.CLOUDINARY_CLOUD_NAME);

if (hasCloudinary) {
  // Cloudinary storage — arquivos ficam na nuvem, acessíveis de qualquer máquina
  storageEngine = new CloudinaryStorage({
    cloudinary,
    params: async (req, file) => ({
      folder: "kozzy/attachments",
      // Preserva a extensão original
      format: undefined, // deixa o Cloudinary detectar automaticamente
      public_id: `${Date.now()}-${file.originalname.replace(/\s+/g, "_").replace(/\.[^/.]+$/, "")}`
    })
  });
  console.log("[Upload] Usando Cloudinary para armazenamento de arquivos.");
} else {
  // Fallback: disco local (ambiente de desenvolvimento sem .env configurado)
  const uploadDir = path.join(__dirname, "..", "..", "uploads");
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
  storageEngine = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
      const cleanOriginalName = file.originalname.replace(/\s+/g, "_");
      cb(null, Date.now() + "-" + cleanOriginalName);
    }
  });
  console.log("[Upload] Cloudinary não configurado. Usando armazenamento em disco local.");
}

// ─── Multer instance ───────────────────────────────────────────────────────
export const upload = multer({
  storage: storageEngine,
  limits: { fileSize: 20 * 1024 * 1024 } // 20 MB por arquivo
});

// Helper para extrair URL + nomeOriginal de um arquivo processado pelo Multer
// funciona tanto com Cloudinary (req.file.path = URL) como com disco local (req.file.filename)
export const getFileInfo = (file) => {
  if (!file) return null;
  const isCloudinary = !!(file.path && file.path.startsWith('http'));
  return {
    nomeOriginal: file.originalname,
    url: isCloudinary ? file.path : `/uploads/${file.filename}`,
    caminho: isCloudinary ? file.path : `/uploads/${file.filename}`,
    mimetype: file.mimetype
  };
};

