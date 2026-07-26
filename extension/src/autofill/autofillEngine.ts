import type { CandidateProfile, ScanResult } from "../types";

function findElement(fieldId: string): HTMLElement | null {
  return document.getElementById(fieldId) ||
    document.querySelector<HTMLElement>(`[name="${CSS.escape(fieldId)}"]`);
}

function setNativeValue(element: HTMLElement, value: string): void {
  if (element instanceof HTMLInputElement) {
    const setter = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype, "value"
    )?.set;
    setter?.call(element, value);
  } else if (element instanceof HTMLTextAreaElement) {
    const setter = Object.getOwnPropertyDescriptor(
      HTMLTextAreaElement.prototype, "value"
    )?.set;
    setter?.call(element, value);
  } else if (element instanceof HTMLSelectElement) {
    element.value = value;
  } else if (element.isContentEditable) {
    element.textContent = value;
  }

  element.dispatchEvent(new Event("input", { bubbles: true }));
  element.dispatchEvent(new Event("change", { bubbles: true }));
  element.dispatchEvent(new Event("blur", { bubbles: true }));
}

export function autofill(scan: ScanResult, profile: CandidateProfile): number {
  let filled = 0;

  for (const field of scan.fields) {
    if (field.canonicalField === "unknown" || field.canonicalField === "resume") continue;
    const value = profile[field.canonicalField as keyof CandidateProfile];
    if (!value) continue;

    const element = findElement(field.id);
    if (!element) continue;

    setNativeValue(element, String(value));
    element.dataset.ariaFilled = "true";
    filled += 1;
  }

  return filled;
}
