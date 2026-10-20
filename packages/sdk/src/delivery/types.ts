/**
 * Tipos para el módulo de entrega (outbox y máquina de estados).
 */

/** Situación del comprobante según el Reglamento 44739-H. */
export type DeliverySituation = "normal" | "contingencia" | "sin_internet";

/** Estado de entrega de un comprobante. */
export type DeliveryState =
  "FIRMADO" | "PENDIENTE" | "ENVIADO" | "ACEPTADO" | "RECHAZADO" | "ALMACENADO" | "VENCIDO";

/** Obligación asociada a cada situación. */
export type Obligation =
  | { type: "normal"; description: string }
  | { type: "sin_internet"; description: string; deadlineBusinessDays: number }
  | {
      type: "contingencia";
      description: string;
      provisionalReference: string;
      deadlineBusinessDays: number;
    };

/** Transición de estado registrada. */
export interface TransitionRecord {
  from: DeliveryState;
  to: DeliveryState;
  at: string; // ISO 8601
  reason?: string;
}

/** Documento persistido en el outbox. */
export interface StoredDocument {
  /** XML firmado del comprobante. */
  xml: string;
  /** Clave numérica de 50 dígitos. */
  clave: string;
  /** Situación del comprobante. */
  situation: DeliverySituation;
  /** Fecha de generación (ISO 8601). */
  generatedAt: string;
  /** Plazo en días hábiles. */
  deadlineBusinessDays: number;
  /** Estado actual de entrega. */
  state: DeliveryState;
  /** Historial de transiciones. */
  transitions: TransitionRecord[];
  /** Obligación asociada a la situación. */
  obligation: Obligation;
  /** Referencia al comprobante provisional (solo contingencia). */
  provisionalReference?: string;
  /** Último error de envío (si aplica). */
  lastError?: string;
  /** Intentos de envío. */
  attempts: number;
}

/** Interfaz del almacén de comprobantes (outbox). */
export interface DocumentStore {
  /** Persiste un documento nuevo. */
  persist(doc: StoredDocument): Promise<void>;
  /** Lee un documento por su clave. */
  get(clave: string): Promise<StoredDocument | null>;
  /** Lista documentos en estados pendientes de reintento. */
  listPending(): Promise<StoredDocument[]>;
  /** Transiciona el estado de un documento. */
  transition(clave: string, from: DeliveryState, to: DeliveryState, reason?: string): Promise<void>;
  /** Actualiza campos del documento (error, attempts, etc.). */
  update(clave: string, patch: Partial<StoredDocument>): Promise<void>;
  /** Consulta el estado de entrega de un documento. */
  getState(clave: string): Promise<DeliveryState | null>;
}

/** Opciones para el almacén de archivo. */
export interface FileStoreOptions {
  /** Directorio base para el almacén. */
  baseDir: string;
  /** Retención en días (default: 5 años = 1825 días). */
  retentionDays?: number;
}

/** Resultado de evaluación de plazo. */
export interface DeadlineEvaluation {
  /** Si el plazo venció. */
  expired: boolean;
  /** Estado resultante (VENCIDO si expired, estado actual si no). */
  state: DeliveryState;
  /** Día hábil en que venció (si expired). */
  expiredOnBusinessDay?: number;
  /** Días hábiles restantes (si no expired). */
  remainingBusinessDays?: number;
  /** Fecha límite calculada. */
  deadline: Date;
}

/** Opciones para submitAndWait con persistencia. */
export interface DeliverySubmitAndWaitOptions {
  /** Si persistir el documento antes de enviar. */
  persist?: boolean;
  /** Almacén personalizado (usa el del SDK si no se provee). */
  store?: DocumentStore;
  /** Reanudar documentos pendientes del almacén al iniciar. */
  resumePending?: boolean;
  /** Plazo en días hábiles para documentos sin internet/contingencia. */
  deadlineBusinessDays?: number;
  /** Callback para notificar cambios de estado. */
  onStateChange?: (clave: string, from: DeliveryState, to: DeliveryState) => void;
}

/** Opciones para crear un documento almacenado. */
export interface CreateStoredDocumentOptions {
  xml: string;
  clave: string;
  situation: DeliverySituation;
  generatedAt?: Date;
  deadlineBusinessDays?: number;
  provisionalReference?: string;
}

/** Resultado de un intento de envío. */
export type SendResult =
  | { type: "success"; state: "ENVIADO"; response: unknown }
  | { type: "success"; state: "ACEPTADO"; response: unknown }
  | { type: "rejected"; state: "RECHAZADO"; response: unknown; reason: string }
  | { type: "link_down"; state: "ALMACENADO"; error: Error }
  | { type: "ambiguous"; state: "PENDIENTE"; error: Error };

/** Error de transición inválida. */
export class InvalidTransitionError extends Error {
  constructor(
    public readonly clave: string,
    public readonly from: DeliveryState,
    public readonly to: DeliveryState,
  ) {
    super(`Transición inválida: ${clave} de ${from} a ${to}`);
    this.name = "InvalidTransitionError";
  }
}

/** Error de situación inmutable. */
export class ImmutableSituationError extends Error {
  constructor(public readonly clave: string) {
    super(`Situación inmutable: no se puede cambiar la situación de ${clave}`);
    this.name = "ImmutableSituationError";
  }
}

/** Error de inconsistencia clave-situación. */
export class ClaveSituationMismatchError extends Error {
  constructor(
    public readonly clave: string,
    public readonly claveSituation: DeliverySituation,
    public readonly docSituation: DeliverySituation,
  ) {
    super(`Clave y situación no coinciden: clave=${claveSituation}, documento=${docSituation}`);
    this.name = "ClaveSituationMismatchError";
  }
}

/** Transiciones válidas de la máquina de estados. */
export const VALID_TRANSITIONS: Record<DeliveryState, DeliveryState[]> = {
  FIRMADO: ["PENDIENTE"],
  PENDIENTE: ["ENVIADO", "ALMACENADO"],
  ENVIADO: ["ACEPTADO", "RECHAZADO"],
  ACEPTADO: [],
  RECHAZADO: [],
  ALMACENADO: ["ENVIADO", "VENCIDO"],
  VENCIDO: [],
};

/** Situaciones por dígito de la clave. */
export const DELIVERY_SITUATION_FROM_DIGIT: Record<string, DeliverySituation> = {
  "1": "normal",
  "2": "contingencia",
  "3": "sin_internet",
};

/** Dígito de la clave por situación. */
export const DIGIT_FROM_DELIVERY_SITUATION: Record<DeliverySituation, string> = {
  normal: "1",
  contingencia: "2",
  sin_internet: "3",
};

/** Plazos por defecto del reglamento (días hábiles). */
export const DEFAULT_DEADLINE_BUSINESS_DAYS: Record<DeliverySituation, number> = {
  normal: 0, // envío inmediato
  sin_internet: 2, // art. 21
  contingencia: 2, // art. 21
};

/** Verifica si una transición es válida. */
export function isValidTransition(from: DeliveryState, to: DeliveryState): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}
