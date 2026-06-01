import { Router } from "express";
import { sendError } from "../lib/http.js";
import { integerParam } from "../lib/validation.js";
import { auditarRequisitosLegais } from "../services/calculoIqsmma.service.js";

const router = Router();

router.get("/api/icms/iqsmma/auditoria/:cicloId", async (req, res) => {
  try {
    const cicloIcmsId = integerParam(req.params.cicloId, "cicloId", { min: 1 });
    const resultado = await auditarRequisitosLegais(cicloIcmsId);
    return res.status(200).json({ resultado });
  } catch (error) {
    return sendError(res, error, "Nao foi possivel executar a auditoria institucional do IQSMMA.", 422);
  }
});

export default router;
