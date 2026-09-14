const JOIN_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // 32 chars, excludes ambiguous 0/O/1/I/L
const JOIN_CODE_LENGTH = 8;

export function generateJoinCode(length: number = JOIN_CODE_LENGTH): string {
  const randomValues = new Uint32Array(length);
  crypto.getRandomValues(randomValues);
  return Array.from(randomValues, (value) => JOIN_CODE_ALPHABET[value % JOIN_CODE_ALPHABET.length]).join(
    ""
  );
}

// Same underlying secure random source as generateJoinCode(), grouped into the "SEC-ABC-1234"
// shape requested for admin-provisioned sections. This still writes to classes.join_code - the
// column that already powers student enrollment redemption (redeem_class_join_code) - rather than
// a separate access_code column, since a class can only ever have one valid redemption token.
const SECTION_CODE_LETTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ"; // excludes ambiguous O/I
const SECTION_CODE_DIGITS = "23456789"; // excludes ambiguous 0/1

export function generateSectionAccessCode(): string {
  const letterValues = new Uint32Array(3);
  const digitValues = new Uint32Array(4);
  crypto.getRandomValues(letterValues);
  crypto.getRandomValues(digitValues);

  const letters = Array.from(
    letterValues,
    (value) => SECTION_CODE_LETTERS[value % SECTION_CODE_LETTERS.length]
  ).join("");
  const digits = Array.from(
    digitValues,
    (value) => SECTION_CODE_DIGITS[value % SECTION_CODE_DIGITS.length]
  ).join("");

  return `SEC-${letters}-${digits}`;
}
