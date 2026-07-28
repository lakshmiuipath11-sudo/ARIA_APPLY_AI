import type {
  CandidateProfile,
  ScanResult
} from "../types";

function findElement(
  fieldId: string
): HTMLElement | null {
  return (
    document.getElementById(fieldId) ||
    document.querySelector<HTMLElement>(
      `[name="${CSS.escape(fieldId)}"]`
    )
  );
}

function dispatchEvents(
  element: HTMLElement
): void {
  element.dispatchEvent(
    new Event("input", {
      bubbles: true
    })
  );

  element.dispatchEvent(
    new Event("change", {
      bubbles: true
    })
  );

  element.dispatchEvent(
    new Event("blur", {
      bubbles: true
    })
  );
}

function normalizeValue(
  value: unknown
): string {
  if (
    value === null ||
    value === undefined
  ) {
    return "";
  }

  return String(value).trim();
}

function setInputValue(
  element: HTMLInputElement,
  value: string
): boolean {
  const type =
    element.type.toLowerCase();

  if (
    type === "checkbox" ||
    type === "radio"
  ) {
    const normalized =
      value.toLowerCase();

    const shouldCheck = [
      "true",
      "yes",
      "y",
      "1",
      "checked"
    ].includes(normalized);

    element.checked = shouldCheck;
    dispatchEvents(element);

    return true;
  }

  if (type === "file") {
    return false;
  }

  const setter =
    Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value"
    )?.set;

  setter?.call(element, value);
  dispatchEvents(element);

  return true;
}

function setTextAreaValue(
  element: HTMLTextAreaElement,
  value: string
): boolean {
  const setter =
    Object.getOwnPropertyDescriptor(
      HTMLTextAreaElement.prototype,
      "value"
    )?.set;

  setter?.call(element, value);
  dispatchEvents(element);

  return true;
}

function setSelectValue(
  element: HTMLSelectElement,
  value: string
): boolean {
  const normalized =
    value.toLowerCase();

  const exactOption =
    Array.from(element.options).find(
      option =>
        option.value.toLowerCase() ===
          normalized ||
        option.text
          .trim()
          .toLowerCase() === normalized
    );

  if (exactOption) {
    element.value = exactOption.value;
    dispatchEvents(element);

    return true;
  }

  const partialOption =
    Array.from(element.options).find(
      option =>
        option.text
          .trim()
          .toLowerCase()
          .includes(normalized) ||
        normalized.includes(
          option.text
            .trim()
            .toLowerCase()
        )
    );

  if (partialOption) {
    element.value =
      partialOption.value;

    dispatchEvents(element);

    return true;
  }

  return false;
}

function setContentEditableValue(
  element: HTMLElement,
  value: string
): boolean {
  if (!element.isContentEditable) {
    return false;
  }

  element.textContent = value;
  dispatchEvents(element);

  return true;
}

function setNativeValue(
  element: HTMLElement,
  value: string
): boolean {
  if (
    element instanceof
    HTMLInputElement
  ) {
    return setInputValue(
      element,
      value
    );
  }

  if (
    element instanceof
    HTMLTextAreaElement
  ) {
    return setTextAreaValue(
      element,
      value
    );
  }

  if (
    element instanceof
    HTMLSelectElement
  ) {
    return setSelectValue(
      element,
      value
    );
  }

  return setContentEditableValue(
    element,
    value
  );
}

export function autofill(
  scan: ScanResult,
  profile: CandidateProfile
): number {
  let filled = 0;

  for (const field of scan.fields) {
    if (
      field.canonicalField ===
        "unknown" ||
      field.canonicalField ===
        "resume"
    ) {
      continue;
    }

    const value =
      profile[
        field.canonicalField as
          keyof CandidateProfile
      ];

    const normalizedValue =
      normalizeValue(value);

    if (!normalizedValue) {
      continue;
    }

    const element =
      findElement(field.id);

    if (!element) {
      continue;
    }

    const wasFilled =
      setNativeValue(
        element,
        normalizedValue
      );

    if (!wasFilled) {
      continue;
    }

    element.dataset.ariaFilled =
      "true";

    filled += 1;
  }

  return filled;
}
