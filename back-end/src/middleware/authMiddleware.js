import jwt from "jsonwebtoken";

export const autenticar = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: "Acesso negado. Token não encontrado no Header." });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.usuario = decoded;
    next();
  } catch (err) {
    res.status(401).json({ message: "Token inválido ou expirado." });
  }
};

export const apenasSupervisor = (req, res, next) => {
  if (req.usuario?.perfilAcesso !== 'supervisor') {
    return res.status(403).json({ message: "Acesso negado. Apenas supervisores podem realizar esta ação." });
  }
  next();
};
