import { Prisma } from "@prisma/client";
import { Router } from "express";
import { badRequest, sendError } from "../lib/http.js";
import { prisma } from "../lib/prisma.js";
import { enumValue, integerParam, optionalInteger, optionalText, requiredText, sanitizeText } from "../lib/validation.js";

const router = Router();

const formStatuses = ["Rascunho", "Em preenchimento", "Pendente de documento", "Completo", "Em revisao", "Validado", "Aprovado"] as const;

type ChecklistInput = {
  item?: unknown;
  obrigatorio?: unknown;
  completo?: unknown;
  documentoExigido?: unknown;
  observacoes?: unknown;
};

function toBigIntOrNull(value: number | null) {
  return value === null ? null : BigInt(value);
}

function assertJsonObject(value: unknown, field: string): Prisma.InputJsonObject {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw badRequest(`${field} deve ser um objeto JSON.`);
  }
  return value as Prisma.InputJsonObject;
}

function parseChecklist(value: unknown) {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) throw badRequest("checklist deve ser uma lista.");

  return value.map((item: ChecklistInput) => ({
    item: requiredText(item.item, "checklist.item", 220),
    obrigatorio: item.obrigatorio !== false,
    completo: item.completo === true,
    documento_exigido: item.documentoExigido === true,
    observacoes: optionalText(item.observacoes, 500),
  }));
}

function serializeResponse(item: Awaited<ReturnType<typeof prisma.respostas_formularios.findFirst>>) {
  if (!item) return null;
  return {
    id: Number(item.id),
    cicloIcmsId: item.ciclo_icms_id ? Number(item.ciclo_icms_id) : null,
    municipioId: item.municipio_id ? Number(item.municipio_id) : null,
    formularioCodigo: item.formulario_codigo,
    usuarioId: item.usuario_id ? Number(item.usuario_id) : null,
    status: item.status,
    respostaJson: item.resposta_json,
    criadoEm: item.criado_em,
    atualizadoEm: item.atualizado_em,
  };
}

router.get("/api/icms/formularios/respostas", async (req, res) => {
  try {
    const cicloIcmsId = optionalInteger(req.query.cicloIcmsId, "cicloIcmsId", { min: 1 });
    const respostas = await prisma.respostas_formularios.findMany({
      where: cicloIcmsId ? { ciclo_icms_id: BigInt(cicloIcmsId) } : undefined,
      orderBy: [{ atualizado_em: "desc" }],
    });

    return res.json({ resultados: respostas.map((item) => serializeResponse(item)) });
  } catch (error) {
    return sendError(res, error, "Nao foi possivel carregar os formularios.");
  }
});

router.delete("/api/icms/formularios/respostas", async (req, res) => {
  try {
    const cicloIcmsId = optionalInteger(req.query.cicloIcmsId, "cicloIcmsId", { min: 1 });
    const usuarioId = optionalInteger(req.query.usuarioId, "usuarioId", { min: 1 });
    if (!cicloIcmsId) throw badRequest("cicloIcmsId e obrigatorio para limpar os formularios.");

    const resultado = await prisma.$transaction(async (tx) => {
      const respostas = await tx.respostas_formularios.findMany({
        where: { ciclo_icms_id: BigInt(cicloIcmsId) },
        select: { id: true, formulario_codigo: true },
      });
      const respostaIds = respostas.map((item) => item.id);

      if (respostaIds.length) {
        await tx.checklists_formularios.deleteMany({
          where: { resposta_formulario_id: { in: respostaIds } },
        });
        await tx.respostas_formularios.deleteMany({
          where: { id: { in: respostaIds } },
        });
      }

      await tx.historico_alteracoes.create({
        data: {
          usuario_id: toBigIntOrNull(usuarioId),
          entidade: "respostas_formularios",
          entidade_id: null,
          acao: "LIMPAR_FORMULARIOS_CICLO",
          depois_json: {
            cicloIcmsId,
            formulariosRemovidos: respostas.map((item) => item.formulario_codigo),
            totalRemovido: respostas.length,
          },
        },
      });

      return { totalRemovido: respostas.length };
    });

    return res.json({
      mensagem: "Dados dos formularios do ciclo limpos com sucesso.",
      resultado: {
        cicloIcmsId,
        respostasRemovidas: resultado.totalRemovido,
      },
    });
  } catch (error) {
    return sendError(res, error, "Nao foi possivel limpar os dados dos formularios.");
  }
});

router.get("/api/icms/formularios/dashboard/:cicloId", async (req, res) => {
  try {
    const cicloIcmsId = integerParam(req.params.cicloId, "cicloId", { min: 1 });
    const [respostas, documentos, pendenciasObrigatorias] = await Promise.all([
      prisma.respostas_formularios.findMany({
        where: { ciclo_icms_id: BigInt(cicloIcmsId) },
        select: { formulario_codigo: true, status: true, atualizado_em: true },
      }),
      prisma.documentos_evidencias.count({ where: { ciclo_icms_id: BigInt(cicloIcmsId) } }),
      prisma.checklists_formularios.count({
        where: {
          obrigatorio: true,
          completo: false,
          resposta_formulario_id: {
            in: await prisma.respostas_formularios
              .findMany({ where: { ciclo_icms_id: BigInt(cicloIcmsId) }, select: { id: true } })
              .then((items) => items.map((item) => item.id)),
          },
        },
      }),
    ]);

    const completos = respostas.filter((item) => item.status === "Completo" || item.status === "Validado" || item.status === "Aprovado").length;

    return res.json({
      resultado: {
        cicloIcmsId,
        formulariosPreenchidos: respostas.length,
        formulariosCompletos: completos,
        documentosRegistrados: documentos,
        pendenciasObrigatorias,
        percentualConclusao: respostas.length ? Math.round((completos / respostas.length) * 100) : 0,
        modulos: respostas.map((item) => ({
          formularioCodigo: item.formulario_codigo,
          status: item.status,
          atualizadoEm: item.atualizado_em,
        })),
      },
    });
  } catch (error) {
    return sendError(res, error, "Nao foi possivel consolidar o dashboard dos formularios.");
  }
});

router.get("/api/icms/formularios/respostas/:codigo", async (req, res) => {
  try {
    const formularioCodigo = requiredText(req.params.codigo, "codigo", 100);
    const cicloIcmsId = optionalInteger(req.query.cicloIcmsId, "cicloIcmsId", { min: 1 });
    const resposta = await prisma.respostas_formularios.findFirst({
      where: {
        formulario_codigo: formularioCodigo,
        ...(cicloIcmsId ? { ciclo_icms_id: BigInt(cicloIcmsId) } : {}),
      },
      orderBy: { atualizado_em: "desc" },
    });

    return res.json({ resultado: serializeResponse(resposta) });
  } catch (error) {
    return sendError(res, error, "Nao foi possivel carregar o formulario.");
  }
});

router.put("/api/icms/formularios/respostas/:codigo", async (req, res) => {
  try {
    const formularioCodigo = requiredText(req.params.codigo, "codigo", 100);
    const cicloIcmsId = optionalInteger(req.body.cicloIcmsId, "cicloIcmsId", { min: 1 });
    const municipioId = optionalInteger(req.body.municipioId, "municipioId", { min: 1 });
    const usuarioId = optionalInteger(req.body.usuarioId, "usuarioId", { min: 1 });
    const status = enumValue(req.body.status ?? "Rascunho", "status", formStatuses);
    const respostaJson = assertJsonObject(req.body.respostaJson ?? {}, "respostaJson");
    const checklist = parseChecklist(req.body.checklist);

    const resposta = await prisma.$transaction(async (tx) => {
      const existing = await tx.respostas_formularios.findFirst({
        where: {
          formulario_codigo: formularioCodigo,
          ciclo_icms_id: toBigIntOrNull(cicloIcmsId),
        },
      });

      const saved = existing
        ? await tx.respostas_formularios.update({
            where: { id: existing.id },
            data: {
              municipio_id: toBigIntOrNull(municipioId),
              usuario_id: toBigIntOrNull(usuarioId),
              status,
              resposta_json: respostaJson,
            },
          })
        : await tx.respostas_formularios.create({
            data: {
              ciclo_icms_id: toBigIntOrNull(cicloIcmsId),
              municipio_id: toBigIntOrNull(municipioId),
              formulario_codigo: formularioCodigo,
              usuario_id: toBigIntOrNull(usuarioId),
              status,
              resposta_json: respostaJson,
            },
          });

      await tx.checklists_formularios.deleteMany({ where: { resposta_formulario_id: saved.id } });
      if (checklist.length) {
        await tx.checklists_formularios.createMany({
          data: checklist.map((item) => ({ ...item, resposta_formulario_id: saved.id })),
        });
      }

      await tx.historico_alteracoes.create({
        data: {
          usuario_id: toBigIntOrNull(usuarioId),
          entidade: "respostas_formularios",
          entidade_id: saved.id,
          acao: existing ? "ATUALIZAR_RASCUNHO" : "CRIAR_RASCUNHO",
          depois_json: {
            formularioCodigo,
            status,
            checklistCompleto: checklist.filter((item) => item.completo).length,
            checklistTotal: checklist.length,
          },
        },
      });

      return saved;
    });

    return res.json({ mensagem: "Formulario salvo com sucesso.", resultado: serializeResponse(resposta) });
  } catch (error) {
    return sendError(res, error, "Nao foi possivel salvar o formulario.");
  }
});

router.get("/api/icms/formularios/:codigo/comentarios", async (req, res) => {
  try {
    const moduloCodigo = requiredText(req.params.codigo, "codigo", 80);
    const cicloIcmsId = optionalInteger(req.query.cicloIcmsId, "cicloIcmsId", { min: 1 });
    const comentarios = await prisma.comentarios_internos.findMany({
      where: {
        modulo_codigo: moduloCodigo,
        ...(cicloIcmsId ? { ciclo_icms_id: BigInt(cicloIcmsId) } : {}),
      },
      orderBy: { criado_em: "desc" },
      take: 20,
    });

    return res.json({
      resultados: comentarios.map((item) => ({
        id: Number(item.id),
        cicloIcmsId: item.ciclo_icms_id ? Number(item.ciclo_icms_id) : null,
        moduloCodigo: item.modulo_codigo,
        comentario: item.comentario,
        resolvido: item.resolvido,
        criadoEm: item.criado_em,
      })),
    });
  } catch (error) {
    return sendError(res, error, "Nao foi possivel carregar comentarios.");
  }
});

router.post("/api/icms/formularios/:codigo/comentarios", async (req, res) => {
  try {
    const moduloCodigo = requiredText(req.params.codigo, "codigo", 80);
    const cicloIcmsId = optionalInteger(req.body.cicloIcmsId, "cicloIcmsId", { min: 1 });
    const usuarioId = optionalInteger(req.body.usuarioId, "usuarioId", { min: 1 });
    const comentario = sanitizeText(req.body.comentario, 2000);
    if (!comentario) throw badRequest("comentario e obrigatorio.");

    const saved = await prisma.comentarios_internos.create({
      data: {
        ciclo_icms_id: toBigIntOrNull(cicloIcmsId),
        modulo_codigo: moduloCodigo,
        usuario_id: toBigIntOrNull(usuarioId),
        comentario,
      },
    });

    return res.status(201).json({
      mensagem: "Comentario registrado.",
      resultado: {
        id: Number(saved.id),
        comentario: saved.comentario,
        criadoEm: saved.criado_em,
      },
    });
  } catch (error) {
    return sendError(res, error, "Nao foi possivel registrar comentario.");
  }
});

export default router;
