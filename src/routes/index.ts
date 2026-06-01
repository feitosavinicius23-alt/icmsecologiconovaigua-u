import { Router } from "express";
import documentosEvidenciasRoutes from "./documentosEvidencias.routes.js";
import icmsEsgotoRoutes from "./icmsEsgoto.routes.js";
import icmsIqsmmaRoutes from "./icmsIqsmma.routes.js";
import icmsResiduosRoutes from "./icmsResiduos.routes.js";

const router = Router();

router.use(documentosEvidenciasRoutes);
router.use(icmsEsgotoRoutes);
router.use(icmsResiduosRoutes);
router.use(icmsIqsmmaRoutes);

export default router;
