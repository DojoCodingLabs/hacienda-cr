/**
 * Money value object using decimal.js for precise monetary arithmetic.
 * Prevents floating-point errors in financial calculations.
 */

import { Decimal } from "decimal.js";

/**
 * Money represents a monetary amount with exact precision.
 * Uses decimal.js internally to avoid floating-point errors.
 */
export class Money {
  private readonly value: Decimal;

  private constructor(value: Decimal) {
    this.value = value;
  }

  /**
   * Create a Money instance from a number.
   * Uses Decimal constructor to avoid floating-point representation issues.
   */
  static fromNumber(value: number): Money {
    return new Money(new Decimal(value));
  }

  /**
   * Create a Money instance from a string.
   * Preferred for exact decimal values (e.g., "123.45").
   */
  static fromString(value: string): Money {
    return new Money(new Decimal(value));
  }

  /**
   * Add another Money value to this one.
   * Returns a new Money instance (immutable).
   */
  plus(other: Money): Money {
    return new Money(this.value.plus(other.value));
  }

  /**
   * Subtract another Money value from this one.
   * Returns a new Money instance (immutable).
   */
  minus(other: Money): Money {
    return new Money(this.value.minus(other.value));
  }

  /**
   * Multiply this Money value by a number.
   * Returns a new Money instance (immutable).
   */
  times(multiplier: number): Money {
    return new Money(this.value.times(multiplier));
  }

  /**
   * Divide this Money value by a number.
   * Returns a new Money instance (immutable).
   */
  dividedBy(divisor: number): Money {
    return new Money(this.value.dividedBy(divisor));
  }

  /**
   * Get the numeric value.
   * Use with caution - only for final output, not intermediate calculations.
   */
  toNumber(): number {
    return this.value.toNumber();
  }

  /**
   * Get the exact string representation.
   * Preferred for serialization and display.
   */
  toString(): string {
    return this.value.toString();
  }

  /**
   * Get the value with a fixed number of decimal places.
   */
  toFixed(dp: number): string {
    return this.value.toFixed(dp);
  }

  /**
   * Check if this Money value equals another.
   */
  equals(other: Money): boolean {
    return this.value.equals(other.value);
  }

  /**
   * Check if this Money value is greater than another.
   */
  greaterThan(other: Money): boolean {
    return this.value.greaterThan(other.value);
  }

  /**
   * Check if this Money value is less than another.
   */
  lessThan(other: Money): boolean {
    return this.value.lessThan(other.value);
  }

  /**
   * Check if this Money value is zero.
   */
  isZero(): boolean {
    return this.value.isZero();
  }

  /**
   * Check if this Money value is positive.
   */
  isPositive(): boolean {
    return this.value.isPositive();
  }

  /**
   * Check if this Money value is negative.
   */
  isNegative(): boolean {
    return this.value.isNegative();
  }

  /**
   * Get the absolute value.
   */
  abs(): Money {
    return new Money(this.value.abs());
  }

  /**
   * Round to a specific number of decimal places.
   * Uses Decimal's toDecimalPlaces with ROUND_HALF_UP.
   */
  round(dp: number): Money {
    return new Money(this.value.toDecimalPlaces(dp));
  }
}

/**
 * Zero money constant.
 */
export const ZERO = Money.fromNumber(0);
