/**
 * Máquina de estados de entrega y evaluación de plazos.
 */

import { checkBusinessDayDeadline } from "../calendar/index.js";
import {
  type StoredDocument,
  type DeliverySituation,
  type DeliveryState,
  type Obligation,
  type DeadlineEvaluation,
  InvalidTransitionError,
  ClaveSituationMismatchError,
  type DocumentStore,
  type SendResult,
  isValidTransition,
  DEFAULT_DEADLINE_BUSINESS_DAYS,
  DELIVERY_SITUATION_FROM_DIGIT,
  DIGIT_FROM_DELIVERY_SITUATION,
  VALID_TRANSITIONS,
} from "./types.js";

export {
  DEFAULT_DEADLINE_BUSINESS_DAYS,
  DELIVERY_SITUATION_FROM_DIGIT,
  DIGIT_FROM_DELIVERY_SITUATION,
  VALID_TRANSITIONS,
  isValidTransition,
};

/** Extrae la situación del dígito de la clave (posición 39, 0-indexed: 38). */
export function situationFromClave(clave: string): DeliverySituation {
  const digit = clave.length > 38 ? (clave[38] as string) : "1";
  const situation = DELIVERY_SITUATION_FROM_DIGIT[digit];
  return situation ?? "normal";
}

/** Verifica que la situación de la clave coincide con la del documento. */
export function assertClaveSituationMatch(clave: string, situation: DeliverySituation): void {
  const claveSituation = situationFromClave(clave);
  if (claveSituation !== situation) {
    throw new ClaveSituationMismatchError(clave, claveSituation, situation);
  }
}

/** Crea la obligación para una situación. */
export function createObligation(
  situation: DeliverySituation,
  provisionalReference?: string,
): Obligation {
  const deadlineDays = DEFAULT_DEADLINE_BUSINESS_DAYS[situation];

  switch (situation) {
    case "normal":
      return {
        type: "normal",
        description: "Envío inmediato en el mismo acto de generación",
      };
    case "sin_internet":
      return {
        type: "sin_internet",
        description: `Transmisión dentro de ${deadlineDays} días hábiles desde la generación (Reglamento 44739-H art. 21)`,
        deadlineBusinessDays: deadlineDays,
      };
    case "contingencia":
      if (!provisionalReference) {
        throw new Error("Situación 'contingencia' requiere provisionalReference");
      }
      return {
        type: "contingencia",
        description: `Sustituye comprobante provisional ${provisionalReference}; transmisión dentro de ${deadlineDays} días hábiles desde que la contingencia se superó (Reglamento 44739-H art. 21)`,
        deadlineBusinessDays: deadlineDays,
        provisionalReference,
      };
  }
}

/** Valida que la situación y la referencia provisional sean consistentes. */
export function validateSituationReference(
  situation: DeliverySituation,
  provisionalReference?: string,
): void {
  if (situation === "sin_internet" && provisionalReference) {
    throw new Error("Situación 'sin_internet' no debe referenciar un comprobante provisional");
  }
  if (situation === "contingencia" && !provisionalReference) {
    throw new Error(
      "Situación 'contingencia' debe referenciar el comprobante provisional que sustituye",
    );
  }
}

/** Crea un documento listo para persistir en el outbox. */
export interface CreateStoredDocumentOptions {
  xml: string;
  clave: string;
  situation: DeliverySituation;
  generatedAt?: Date;
  deadlineBusinessDays?: number;
  provisionalReference?: string;
}

export function createStoredDocument(options: CreateStoredDocumentOptions): StoredDocument {
  const {
    xml,
    clave,
    situation,
    generatedAt = new Date(),
    deadlineBusinessDays,
    provisionalReference,
  } = options;

  assertClaveSituationMatch(clave, situation);
  validateSituationReference(situation, provisionalReference);

  const days = deadlineBusinessDays ?? DEFAULT_DEADLINE_BUSINESS_DAYS[situation];

  const obligation = createObligation(situation, provisionalReference);

  return {
    xml,
    clave,
    situation,
    generatedAt: generatedAt.toISOString(),
    deadlineBusinessDays: days,
    state: "FIRMADO",
    transitions: [
      {
        from: "FIRMADO",
        to: "FIRMADO",
        at: generatedAt.toISOString(),
        reason: "Documento generado y firmado",
      },
    ],
    obligation,
    provisionalReference,
    attempts: 0,
  };
}

/** Transiciona un documento a un nuevo estado. */
export function transitionDocument(
  doc: StoredDocument,
  to: DeliveryState,
  reason?: string,
): StoredDocument {
  const from = doc.state;

  if (!isValidTransition(from, to)) {
    throw new InvalidTransitionError(doc.clave, from, to);
  }

  const transition = {
    from,
    to,
    at: new Date().toISOString(),
    reason,
  };

  return {
    ...doc,
    state: to,
    transitions: [...doc.transitions, transition],
  };
}

/** Evalúa si el plazo de un documento ha vencido. */
export function evaluateDeadline(
  doc: StoredDocument,
  referenceDate: Date = new Date(),
): DeadlineEvaluation {
  if (doc.situation === "normal") {
    return {
      expired: false,
      state: doc.state,
      deadline: new Date(doc.generatedAt),
    };
  }

  const result = checkBusinessDayDeadline({
    businessDays: doc.deadlineBusinessDays,
    startDate: doc.generatedAt,
    referenceDate,
  });

  if (result.expired) {
    return {
      expired: true,
      state: "VENCIDO",
      expiredOnBusinessDay: result.expiredOnBusinessDay,
      deadline: result.deadline,
    };
  } else {
    return {
      expired: false,
      state: doc.state,
      remainingBusinessDays: result.remainingBusinessDays,
      deadline: result.deadline,
    };
  }
}

/** Determina el estado resultante de un envío según la respuesta. */

function makeSuccess(state: "ENVIADO" | "ACEPTADO", response: unknown): SendResult {
  return { type: "success", state, response };
}

function makeRejected(response: unknown, reason: string): SendResult {
  return { type: "rejected", state: "RECHAZADO", response, reason };
}

function makeLinkDown(error: Error): SendResult {
  return { type: "link_down", state: "ALMACENADO", error };
}

function makeAmbiguous(error: Error): SendResult {
  return { type: "ambiguous", state: "PENDIENTE", error };
}

export function classifySendResult(
  error: Error | null,
  httpStatus?: number,
  haciendaResponse?: { estado?: string; detalle?: string } | null,
): SendResult {
  if (!error && !haciendaResponse) {
    return makeSuccess("ENVIADO", haciendaResponse);
  }

  if (haciendaResponse) {
    const terminal = haciendaResponse.estado === "ACEPTADO" ? "ACEPTADO" : "RECHAZADO";
    if (terminal === "ACEPTADO") {
      return makeSuccess("ACEPTADO", haciendaResponse);
    } else {
      return makeRejected(haciendaResponse, haciendaResponse.detalle ?? "Rechazado por Hacienda");
    }
  }

  if (error && (httpStatus === undefined || httpStatus >= 500 || httpStatus === 0)) {
    return makeLinkDown(error);
  }

  if (httpStatus && httpStatus >= 400 && httpStatus < 500) {
    const err = error ?? new Error("Error de validación");
    return { type: "rejected", state: "RECHAZADO", response: null, reason: err.message };
  }

  return makeAmbiguous(error ?? new Error("Error desconocido"));
}

/** Reintenta documentos ALMACENADO cuando el enlace se restablece. */
export async function retryStoredDocuments(
  store: DocumentStore,
  sendFn: (doc: StoredDocument) => Promise<SendResult>,
  maxAttempts = 3,
): Promise<{ retried: number; succeeded: number; failed: number }> {
  const pending = await store.listPending();
  const stored = pending.filter((d: StoredDocument) => d.state === "ALMACENADO");

  let retried = 0;
  let succeeded = 0;
  let failed = 0;

  for (const doc of stored) {
    if (doc.attempts >= maxAttempts) continue;

    retried++;
    const result = await sendFn(doc);

    if (result.type === "success") {
      await store.transition(
        doc.clave,
        "ALMACENADO",
        "ENVIADO",
        "Reintento tras enlace restablecido",
      );
      succeeded++;
    } else if (result.type === "link_down") {
      await store.update(doc.clave, {
        attempts: doc.attempts + 1,
        lastError: result.error.message,
      });
      failed++;
    } else {
      await store.transition(
        doc.clave,
        "ALMACENADO",
        result.state,
        result.type === "rejected" ? result.reason : undefined,
      );
      failed++;
    }
  }

  return { retried, succeeded, failed };
}
