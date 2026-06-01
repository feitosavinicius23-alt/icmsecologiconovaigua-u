import { Router } from "express";
import { auditarRequisitosLegais } from "../services/calculoIqsmma.service.js";

const router = Router();

router.get("/api/icms/iqsmma/auditoria/:cicloId", async (req, res) => {
  try {
    const cicloIcmsId = Number(req.params.cicloId);
    if (!Number.isInteger(cicloIcmsId)) return res.status(400).json({ erro: "cicloId invalido." });
    const resultado = await auditarRequisitosLegais(cicloIcmsId);
    return res.status(200).json({ resultado });
  } catch (error) {
    return res.status(422).json({
      erro: "Nao foi possivel executar a auditoria institucional do IQSMMA.",
      detalhes: error instanceof Error ? error.message : "Erro desconhecido.",
    });
  }
});

export default router;
