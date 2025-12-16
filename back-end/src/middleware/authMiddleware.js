import jwt from "jsonwebtoken";

export const autenticar = (req, res, next) => {
const authHeader = req.headers.authorization;
  // SE não achou no cookie, tenta pegar do Header (padrão do Swagger)
 if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: "Acesso negado. Token não encontrado no Header." });
  }

  const token = authHeader.split(' ')[1]; // Pega o token após "Bearer "

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.usuario = decoded;
    next();
  } catch (err) {
    res.status(400).json({ message: "Token inválido." });
  }
};