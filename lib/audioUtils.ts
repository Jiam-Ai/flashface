/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

/**
 * Decodes a base64-encoded string into a Uint8Array.
 * This is necessary for handling audio data from the Gemini API.
 * @param base64 The base64-encoded string.
 * @returns A Uint8Array containing the decoded binary data.
 */
export function decode(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}
