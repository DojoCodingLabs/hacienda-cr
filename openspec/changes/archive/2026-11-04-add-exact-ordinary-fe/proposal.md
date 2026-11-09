# Add exact decimal ordinary FE API

## Why

The legacy number DTO cannot preserve valid five-decimal schema maxima through
JSON, calculation and XML. A focused additive public contract is needed before
an application can stop rejecting valid precise inputs.

## What changes

Add strict decimal-string shared input/calculated schemas and SDK BigInt
calculation/XML APIs for an explicitly named ordinary domestic FE case: IVA 01,
rate 08/13%, service/goods, amount or percent discounts and explicit completely
allocated payments/currency. Preserve all legacy number API behavior.

## Impact

Shared and SDK additive exports; independent Python Decimal/native XSD and
installed artifact checks. No special regimes, family rewrite, CLI/MCP money
migration or production activation. Publication occurred separately as v0.6.0
and is outside this implementation scope.
