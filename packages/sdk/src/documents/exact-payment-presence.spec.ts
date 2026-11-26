/**
 * MedioPago presence matrix for every current exact family (Anexos v4.4:194).
 *
 * MedioPago is required unless the governing sale condition is 02, 08 or 10.
 * When present it carries 1–4 allocations that must reconcile with the total;
 * when absent (or empty) the calculated summary and the XML omit the node, and
 * the XML still validates against both vendored XSD generations.
 */
import { describe, expect, it } from "vitest";
import {
  ExactFeInputSchema,
  ExactTeInputSchema,
  ExactFecInputSchema,
  ExactFecForeignServiceIva13InputSchema,
  ExactFecUsedPersonalGoodsNonSubjectInputSchema,
  ExactFecUsedPersonalGoodsNonSubjectCalculatedSchema,
  ExactNcTotalInputSchema,
  ExactNcPartialInputSchema,
  ExactNdInputSchema,
  ExactFeReplacementInputSchema,
  type ExactFeInput,
  type ExactTeInput,
  type ExactFecInput,
  type ExactFecForeignServiceIva13Input,
  type ExactFecUsedPersonalGoodsNonSubjectInput,
  type ExactNcTotalInput,
  type ExactNcPartialInput,
  type ExactNdInput,
  type ExactFeReplacementInput,
} from "@dojocoding/hacienda-shared";
import { exactNcFixture } from "../__fixtures__/exact-nc.js";
import { exactTeFixture } from "../__fixtures__/exact-te.js";
import { exactFecFixture } from "../__fixtures__/exact-fec.js";
import { exactFecForeignServiceIva13Fixture } from "../__fixtures__/exact-fec-foreign-service.js";
import { exactFecUsedPersonalGoodsNonSubjectFixture } from "../__fixtures__/exact-fec-used-personal.js";
import { exactNdFixture } from "../__fixtures__/exact-nd.js";
import {
  exactNcPartialFixture,
  exactFeReplacementFixture,
} from "../__fixtures__/exact-credit-extensions.js";
import {
  validateAgainstXsd,
  SCHEMA_GENERATIONS,
  type SchemaGeneration,
} from "../__testing__/xsd.js";
import { calculateExactFe } from "../tax/exact-fe.js";
import { calculateExactTe } from "../tax/exact-te.js";
import { calculateExactFec } from "../tax/exact-fec.js";
import { calculateExactFecForeignServiceIva13 } from "../tax/exact-fec-foreign-service.js";
import { calculateExactFecUsedPersonalGoodsNonSubject } from "../tax/exact-fec-used-personal.js";
import { calculateExactNcTotal } from "../tax/exact-nc.js";
import { calculateExactNcPartial } from "../tax/exact-nc-partial.js";
import { calculateExactNd } from "../tax/exact-nd.js";
import { calculateExactFeReplacement } from "../tax/exact-fe-replacement.js";
import { buildExactFacturaXml } from "./exact-fe-builder.js";
import { buildExactTiqueteXml } from "./exact-te-builder.js";
import { buildExactFacturaCompraXml } from "./exact-fec-builder.js";
import { buildExactFacturaCompraForeignServiceIva13Xml } from "./exact-fec-foreign-service-builder.js";
import { buildExactFacturaCompraUsedPersonalGoodsNonSubjectXml } from "./exact-fec-used-personal-builder.js";
import { buildExactNotaCreditoTotalXml } from "./exact-nc-builder.js";
import { buildExactNotaCreditoPartialXml } from "./exact-nc-partial-builder.js";
import { buildExactNotaDebitoXml } from "./exact-nd-builder.js";
import { buildExactFacturaReplacementXml } from "./exact-fe-replacement-builder.js";

const PRESENCE_MESSAGE = "Payment allocation is required unless the sale condition is 02, 08 or 10";
const EXEMPT = ["02", "08", "10"] as const;

interface Payment {
  tipoMedioPago: string;
  totalMedioPago: string;
}
/** Mutable view of the fields this matrix edits; families differ only in where they live. */
interface ConditionHolder {
  condicionVenta: string;
  plazoCredito?: string;
  condicionVentaOtros?: string;
  medioPago?: Payment[];
}
interface Family {
  name: string;
  /** Sale conditions each family's own validation admits. */
  conditions: readonly string[];
  make: () => object;
  /** Object carrying the governing sale condition. */
  condition: (source: object) => ConditionHolder;
  /** Object carrying the document's own payment allocation. */
  payments: (source: object) => ConditionHolder;
  parse: (source: object) => { success: boolean; error?: { issues: readonly Issue[] } };
  calculate: (source: object) => {
    resumenFactura: { medioPago?: readonly Payment[]; totalComprobante: string };
  };
  build: (source: object) => string;
  xsd: string;
  /** XSD generations whose code catalogs admit the family (default: both). */
  generations?: readonly SchemaGeneration[];
}
interface Issue {
  path: readonly PropertyKey[];
  message: string;
}

const self = (source: object) => source as ConditionHolder;
const original = (source: object) => (source as { original: ConditionHolder }).original;
const replacement = (source: object) => (source as { replacement: ConditionHolder }).replacement;

// Every FE sale condition the generated catalog admits (09/11 are REP-only).
const FE_CONDITIONS = [
  "01",
  "02",
  "03",
  "04",
  "05",
  "06",
  "07",
  "08",
  "10",
  "12",
  "14",
  "15",
  "99",
];
// TE, total/partial NC and ND additionally exclude the FE-only 12.
const NON_FE_ONLY = FE_CONDITIONS.filter((code) => code !== "12");

const FAMILIES: readonly Family[] = [
  {
    name: "FE",
    conditions: FE_CONDITIONS,
    make: () => exactNcFixture().original,
    condition: self,
    payments: self,
    parse: (s) => ExactFeInputSchema.safeParse(s),
    calculate: (s) => calculateExactFe(s as ExactFeInput),
    build: (s) => buildExactFacturaXml(s as ExactFeInput),
    xsd: "FacturaElectronica_V4.4.xsd",
  },
  {
    name: "FE replacement",
    conditions: FE_CONDITIONS,
    make: () => exactFeReplacementFixture(),
    condition: replacement,
    payments: replacement,
    parse: (s) => ExactFeReplacementInputSchema.safeParse(s),
    calculate: (s) => calculateExactFeReplacement(s as ExactFeReplacementInput),
    build: (s) => buildExactFacturaReplacementXml(s as ExactFeReplacementInput),
    xsd: "FacturaElectronica_V4.4.xsd",
    // Reference code 16 (rejected-document replacement) exists only in 2026.
    generations: ["2026"],
  },
  {
    name: "TE",
    conditions: NON_FE_ONLY,
    make: () => exactTeFixture(),
    condition: self,
    payments: self,
    parse: (s) => ExactTeInputSchema.safeParse(s),
    calculate: (s) => calculateExactTe(s as ExactTeInput),
    build: (s) => buildExactTiqueteXml(s as ExactTeInput),
    xsd: "TiqueteElectronico_V4.4.xsd",
  },
  {
    name: "NC total",
    conditions: NON_FE_ONLY,
    make: () => exactNcFixture(),
    condition: original,
    payments: original,
    parse: (s) => ExactNcTotalInputSchema.safeParse(s),
    calculate: (s) => calculateExactNcTotal(s as ExactNcTotalInput),
    build: (s) => buildExactNotaCreditoTotalXml(s as ExactNcTotalInput),
    xsd: "NotaCreditoElectronica_V4.4.xsd",
  },
  {
    name: "NC partial",
    conditions: NON_FE_ONLY,
    make: () => exactNcPartialFixture(),
    condition: original,
    payments: self,
    parse: (s) => ExactNcPartialInputSchema.safeParse(s),
    calculate: (s) => calculateExactNcPartial(s as ExactNcPartialInput),
    build: (s) => buildExactNotaCreditoPartialXml(s as ExactNcPartialInput),
    xsd: "NotaCreditoElectronica_V4.4.xsd",
  },
  {
    name: "ND",
    conditions: NON_FE_ONLY,
    make: () => exactNdFixture(),
    condition: original,
    payments: self,
    parse: (s) => ExactNdInputSchema.safeParse(s),
    calculate: (s) => calculateExactNd(s as ExactNdInput),
    build: (s) => buildExactNotaDebitoXml(s as ExactNdInput),
    xsd: "NotaDebitoElectronica_V4.4.xsd",
  },
  {
    name: "FEC",
    conditions: ["01", "02"],
    make: () => exactFecFixture(),
    condition: self,
    payments: self,
    parse: (s) => ExactFecInputSchema.safeParse(s),
    calculate: (s) => calculateExactFec(s as ExactFecInput),
    build: (s) => buildExactFacturaCompraXml(s as ExactFecInput),
    xsd: "FacturaElectronicaCompra_V4.4.xsd",
  },
  {
    name: "FEC foreign service",
    conditions: ["01", "02"],
    make: () => exactFecForeignServiceIva13Fixture(),
    condition: self,
    payments: self,
    parse: (s) => ExactFecForeignServiceIva13InputSchema.safeParse(s),
    calculate: (s) => calculateExactFecForeignServiceIva13(s as ExactFecForeignServiceIva13Input),
    build: (s) =>
      buildExactFacturaCompraForeignServiceIva13Xml(s as ExactFecForeignServiceIva13Input),
    xsd: "FacturaElectronicaCompra_V4.4.xsd",
  },
];

/** Set the governing sale condition together with the companion facts it requires. */
function withCondition(family: Family, code: string): object {
  const source = family.make();
  const holder = family.condition(source);
  holder.condicionVenta = code;
  delete holder.plazoCredito;
  delete holder.condicionVentaOtros;
  if (code === "02" || code === "10") holder.plazoCredito = "30";
  if (code === "99") holder.condicionVentaOtros = "Condición sintética de prueba";
  return source;
}
function withoutPayments(family: Family, code: string, empty = false): object {
  const source = withCondition(family, code);
  const holder = family.payments(source);
  if (empty) holder.medioPago = [];
  else delete holder.medioPago;
  return source;
}
function presenceIssues(result: ReturnType<Family["parse"]>): Issue[] {
  return (result.error?.issues ?? []).filter((issue) => issue.message === PRESENCE_MESSAGE);
}
function paymentNodes(xml: string): number {
  return xml.match(/<MedioPago>/g)?.length ?? 0;
}

describe.each(FAMILIES.map((family) => [family.name, family] as const))(
  "MedioPago presence: %s",
  (_name, family) => {
    const required = family.conditions.filter(
      (code) => !(EXEMPT as readonly string[]).includes(code),
    );
    const exempt = family.conditions.filter((code) => (EXEMPT as readonly string[]).includes(code));

    it("keeps the fixture's allocation valid under every admitted condition", () => {
      for (const code of family.conditions) {
        const result = family.parse(withCondition(family, code));
        expect(result.error?.issues ?? [], code).toEqual([]);
      }
    });

    it.each(required)("requires an allocation for non-exempt condition %s", (code) => {
      for (const empty of [false, true]) {
        const source = withoutPayments(family, code, empty);
        const result = family.parse(source);
        expect(result.success).toBe(false);
        expect(presenceIssues(result).length).toBeGreaterThan(0);
        expect(() => family.calculate(source)).toThrow(PRESENCE_MESSAGE);
        expect(() => family.build(source)).toThrow(PRESENCE_MESSAGE);
      }
    });

    it.each(exempt)("accepts omission and emits no MedioPago for exempt condition %s", (code) => {
      for (const empty of [false, true]) {
        const source = withoutPayments(family, code, empty);
        expect(family.parse(source).error?.issues ?? []).toEqual([]);
        const calculated = family.calculate(source);
        expect(calculated.resumenFactura.medioPago).toBeUndefined();
        const xml = family.build(source);
        expect(paymentNodes(xml)).toBe(0);
        expect(xml).toContain(
          `<TotalComprobante>${calculated.resumenFactura.totalComprobante}</TotalComprobante>`,
        );
        for (const generation of family.generations ?? SCHEMA_GENERATIONS) {
          const result = validateAgainstXsd(xml, family.xsd, {
            allowMissingSignature: true,
            generation,
          });
          expect(result.errors, `${code} ${generation}`).toBe("");
          expect(result.valid).toBe(true);
        }
      }
    });

    it.each(exempt)("still reconciles a supplied allocation for exempt condition %s", (code) => {
      const source = withCondition(family, code);
      const supplied = family.calculate(source);
      expect(supplied.resumenFactura.medioPago?.length).toBe(1);
      expect(paymentNodes(family.build(source))).toBe(1);
      const holder = family.payments(source);
      holder.medioPago = [{ tipoMedioPago: "01", totalMedioPago: "1" }];
      expect(() => family.calculate(source)).toThrow(/payment allocation must equal invoice total/);
    });

    it("caps a supplied allocation at four entries", () => {
      for (const code of family.conditions.slice(0, 2)) {
        const source = withCondition(family, code);
        const holder = family.payments(source);
        holder.medioPago = Array.from({ length: 5 }, () => ({
          tipoMedioPago: "01",
          totalMedioPago: "1",
        }));
        const result = family.parse(source);
        expect(result.success).toBe(false);
        expect(
          result.error?.issues.some(
            (issue) => issue.path.includes("medioPago") && issue.message !== PRESENCE_MESSAGE,
          ),
        ).toBe(true);
      }
    });
  },
);

describe("MedioPago presence: FEC used-personal goods", () => {
  // Governing condition is the literal 13, which is never exempt.
  const make = () =>
    exactFecUsedPersonalGoodsNonSubjectFixture() as ExactFecUsedPersonalGoodsNonSubjectInput & {
      medioPago?: Payment[];
    };

  it("rejects omission and an empty allocation", () => {
    for (const empty of [false, true]) {
      const source = make();
      if (empty) source.medioPago = [];
      else delete source.medioPago;
      const result = ExactFecUsedPersonalGoodsNonSubjectInputSchema.safeParse(source);
      expect(result.success).toBe(false);
      expect(result.error?.issues.some((issue) => issue.message === PRESENCE_MESSAGE)).toBe(true);
      expect(() => calculateExactFecUsedPersonalGoodsNonSubject(source)).toThrow(PRESENCE_MESSAGE);
      expect(() => buildExactFacturaCompraUsedPersonalGoodsNonSubjectXml(source)).toThrow(
        PRESENCE_MESSAGE,
      );
    }
  });

  it("keeps exactly one MedioPago node for the supplied allocation", () => {
    const source = make();
    expect(calculateExactFecUsedPersonalGoodsNonSubject(source).resumenFactura.medioPago).toEqual([
      { tipoMedioPago: "04", totalMedioPago: "100.00000" },
    ]);
    expect(paymentNodes(buildExactFacturaCompraUsedPersonalGoodsNonSubjectXml(source))).toBe(1);
  });

  it("calculated summary still requires at least one allocation", () => {
    const calculated = calculateExactFecUsedPersonalGoodsNonSubject(make());
    expect(ExactFecUsedPersonalGoodsNonSubjectCalculatedSchema.parse(calculated)).toEqual(
      calculated,
    );
    for (const medioPago of [undefined, []]) {
      const { medioPago: _supplied, ...rest } = calculated.resumenFactura;
      const summary = medioPago === undefined ? rest : { ...rest, medioPago };
      expect(
        ExactFecUsedPersonalGoodsNonSubjectCalculatedSchema.safeParse({
          ...calculated,
          resumenFactura: summary,
        }).success,
      ).toBe(false);
    }
  });
});
