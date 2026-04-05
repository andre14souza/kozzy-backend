export const atualizarAtendimento = async (req, res) => {
  try {
    const { id } = req.params;
    const d = req.body;

    const dadosFormatados = {
      tipoCliente: d.cliente || d.tipoCliente,
      categoriaAssunto: d.area || d.categoriaAssunto,
      
      // ✅ CORREÇÃO: O controlador agora reconhece o assunto e prepara-o para salvar
      assuntoEspecifico: d.categoria || d.assuntoEspecifico || d.assunto,
      
      descricaoDetalhada: d.descricao || d.descricaoDetalhada,
      nivelPrioridade: d.prioridade || d.nivelPrioridade,
      avanco: d.status || d.avanco,
      atendente: d.atendente || null,
      solucao: d.solucao || "",
      origem: d.origem
    };

    const atualizado = await Atendimento.findByIdAndUpdate(
      id,
      { $set: dadosFormatados }, 
      { new: true }
    ).populate('atendente', 'nomeCompleto');
    
    if (!atualizado) return res.status(404).json({ message: "Chamado não encontrado" });
    res.json(atualizado);
  } catch (error) {
    res.status(500).json({ message: "Erro interno ao salvar", error });
  }
};