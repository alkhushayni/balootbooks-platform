const JOIN_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // 32 chars, excludes ambiguous 0/O/1/I/L
const JOIN_CODE_LENGTH = 8;

export function generateJoinCode(length: number = JOIN_CODE_LENGTH): string {
  const randomValues = new Uint32Array(length);
  crypto.getRandomValues(randomValues);
  return Array.from(randomValues, (value) => JOIN_CODE_ALPHABET[value % JOIN_CODE_ALPHABET.length]).join(
    ""
  );
}
