/**
 * Lightweight, dependency-free ObjectId used by the HTTP data client.
 *
 * The official MongoDB driver cannot run in the app's serverless runtime
 * (no raw TCP/TLS sockets), so the app talks to a small self-hosted API
 * instead and only needs to represent/serialise ObjectId values.
 */
const HEX_24 = /^[0-9a-fA-F]{24}$/;

export class ObjectId {
  private readonly value: string;

  constructor(id?: string | ObjectId) {
    if (id instanceof ObjectId) {
      this.value = id.value;
      return;
    }
    if (typeof id === "string") {
      if (!HEX_24.test(id)) throw new Error(`Invalid ObjectId: ${id}`);
      this.value = id.toLowerCase();
      return;
    }
    this.value = ObjectId.generateHex();
  }

  static isValid(id: unknown): boolean {
    if (id instanceof ObjectId) return true;
    return typeof id === "string" && HEX_24.test(id);
  }

  private static generateHex(): string {
    const bytes = crypto.getRandomValues(new Uint8Array(12));
    const seconds = Math.floor(Date.now() / 1000);
    bytes[0] = (seconds >>> 24) & 0xff;
    bytes[1] = (seconds >>> 16) & 0xff;
    bytes[2] = (seconds >>> 8) & 0xff;
    bytes[3] = seconds & 0xff;
    return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  }

  toString(): string {
    return this.value;
  }

  toHexString(): string {
    return this.value;
  }

  toJSON(): { $oid: string } {
    return { $oid: this.value };
  }

  equals(other: ObjectId | string): boolean {
    return this.value === String(other);
  }
}

export type Doc = { _id: ObjectId } & Record<string, unknown>;
