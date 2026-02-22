/**
 * In-memory transport pair for testing MCP server/client interactions.
 *
 * Creates two linked transports where messages sent on one side
 * appear as received on the other side.
 */

import type { JSONRPCMessage } from "@modelcontextprotocol/sdk/types.js";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";

export class InMemoryTransport implements Transport {
  onclose?: () => void;
  onerror?: (error: Error) => void;
  onmessage?: (message: JSONRPCMessage) => void;
  sessionId?: string;

  private _otherTransport?: InMemoryTransport;

  /**
   * Link this transport to another transport.
   * Messages sent on one will be received on the other.
   */
  link(other: InMemoryTransport): void {
    this._otherTransport = other;
    other._otherTransport = this;
  }

  async start(): Promise<void> {
    // Nothing to do
  }

  async send(message: JSONRPCMessage): Promise<void> {
    if (!this._otherTransport) {
      throw new Error("Transport not linked");
    }
    // Deliver message to the other side asynchronously
    const other = this._otherTransport;
    // Use queueMicrotask to simulate async delivery
    queueMicrotask(() => {
      other.onmessage?.(message);
    });
  }

  async close(): Promise<void> {
    this.onclose?.();
    this._otherTransport?.onclose?.();
  }
}

/**
 * Create a linked pair of in-memory transports for testing.
 *
 * @returns A tuple of [clientTransport, serverTransport]
 */
export function createLinkedTransports(): [InMemoryTransport, InMemoryTransport] {
  const client = new InMemoryTransport();
  const server = new InMemoryTransport();
  client.link(server);
  return [client, server];
}
