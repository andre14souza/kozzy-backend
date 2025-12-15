import jwt from "jsonwebtoken";

export const autenticar = (req, res, next) => {
  let token = req.cookies.token;

  // SE não achou no cookie, tenta pegar do Header (padrão do Swagger)
  if (!token && req.headers.authorization) {
    const parts = req.headers.authorization.split(' ');
    if (parts.length === 2 && parts[0] === 'Bearer') {
      token = parts[1];
    }
  }

  if (!token) return res.status(401).json({ message: "Acesso negado. Token não encontrado." });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.usuario = decoded;
    next();
  } catch (err) {
    res.status(400).json({ message: "Token inválido." });
  }
};