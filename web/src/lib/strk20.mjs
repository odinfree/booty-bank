const DECIMAL_PATTERN = /^(?:0|[1-9]\d*)(?:\.(\d+))?$/;
const STARKNET_FIELD_PRIME = (2n ** 251n) + (17n * (2n ** 192n)) + 1n;

export function parseTokenAmount(value, decimals) {
  const normalized = String(value).trim();
  const match = DECIMAL_PATTERN.exec(normalized);
  if (!match) throw new Error("ENTER A POSITIVE NUMBER.");
  const fraction = match[1] ?? "";
  if (fraction.length > decimals) throw new Error(`MAX ${decimals} DECIMALS.`);
  const [whole] = normalized.split(".");
  const raw = BigInt(whole) * (10n ** BigInt(decimals)) + BigInt(fraction.padEnd(decimals, "0") || "0");
  if (raw <= 0n) throw new Error("AMOUNT MUST BE ABOVE ZERO.");
  return `0x${raw.toString(16)}`;
}

export function formatTokenAmount(rawValue, decimals, maximumFractionDigits = 4) {
  const raw = BigInt(rawValue);
  const base = 10n ** BigInt(decimals);
  const whole = raw / base;
  const fraction = (raw % base).toString().padStart(decimals, "0").slice(0, maximumFractionDigits).replace(/0+$/, "");
  return fraction ? `${whole}.${fraction}` : whole.toString();
}

export function tokenBalancePercentage(rawValue, decimals, percentage) {
  if (!Number.isInteger(percentage) || percentage < 1 || percentage > 100) {
    throw new Error("CHOOSE A BALANCE PERCENTAGE FROM 1 TO 100.");
  }
  const raw = BigInt(rawValue);
  const selected = raw * BigInt(percentage) / 100n;
  if (selected <= 0n) throw new Error("BALANCE IS TOO LOW FOR THAT PERCENTAGE.");
  return formatTokenAmount(selected, decimals, decimals);
}

export function buildStrk20Action({ kind, token, amount, recipient, decimals }) {
  const rawAmount = parseTokenAmount(amount, decimals);
  if (kind === "deposit") return { type: "deposit", token, amount: rawAmount };
  const enteredRecipient = String(recipient ?? "").trim();
  const cleanRecipient = enteredRecipient.startsWith("0X") ? `0x${enteredRecipient.slice(2)}` : enteredRecipient;
  if (!/^0x[0-9a-fA-F]{1,64}$/.test(cleanRecipient)) throw new Error("ENTER A STARKNET ADDRESS.");
  const recipientValue = BigInt(cleanRecipient);
  if (recipientValue === 0n || recipientValue >= STARKNET_FIELD_PRIME) throw new Error("ENTER A STARKNET ADDRESS.");
  if (kind === "transfer") return { type: "transfer", token, amount: rawAmount, recipient: cleanRecipient };
  if (kind === "withdraw") return { type: "withdraw", token, amount: rawAmount, recipient: cleanRecipient };
  throw new Error("UNKNOWN PRIVATE ACTION.");
}
