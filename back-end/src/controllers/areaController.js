import Area from "../models/Area.js";

// Criar associação de áreas a um usuário
export const criarArea = async (req, res) => {
  try {
    const { usuarioId, areas } = req.body;

    const novaArea = new Area({ usuarioId, areas });
    await novaArea.save();

    res.status(201).json(novaArea);
  } catch (error) {
    res.status(500).json({ message: "Erro ao criar áreas", error });
  }
};

//bumbum 

// Listar todas as áreas cadastradas
export const listarAreas = async (req, res) => {
  try {
    const areas = await Area.find();
    res.json(areas);
  } catch (error) {
    res.status(500).json({ message: "Erro ao listar áreas", error });
  }
};

// Buscar áreas de um usuário
export const buscarAreasPorUsuario = async (req, res) => {
  try {
    const { usuarioId } = req.params;
    const area = await Area.findOne({ usuarioId });

    if (!area) return res.status(404).json({ message: "Usuário sem áreas atribuídas" });

    res.json(area);
  } catch (error) {
    res.status(500).json({ message: "Erro ao buscar áreas", error });
  }
};

// Atualizar áreas de um usuário
export const atualizarAreas = async (req, res) => {
  try {
    const { usuarioId } = req.params;
    const { areas } = req.body;

    const areaAtualizada = await Area.findOneAndUpdate(
      { usuarioId },
      { areas },
      { new: true }
    );

    if (!areaAtualizada) return res.status(404).json({ message: "Usuário não encontrado" });

    res.json(areaAtualizada);
  } catch (error) {
    res.status(500).json({ message: "Erro ao atualizar áreas", error });
  }
};

// Deletar registro de áreas de um usuário
export const deletarAreas = async (req, res) => {
  try {
    const { usuarioId } = req.params;
    const area = await Area.findOneAndDelete({ usuarioId });

    if (!area) return res.status(404).json({ message: "Usuário não encontrado" });

    res.json({ message: "Áreas removidas com sucesso" });
  } catch (error) {
    res.status(500).json({ message: "Erro ao deletar áreas", error });
  }
};
