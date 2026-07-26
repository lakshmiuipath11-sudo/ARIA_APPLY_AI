import type { ScanResult, ScannedField } from "../types";
import { classifyField } from "../extractor/fieldExtractor";

const selectors = [
  "input:not([type='hidden'])",
  "textarea",
  "select",
  "[contenteditable='true']"
].join(",");

function normalize(text?: string | null): string {
  return (text ?? "").replace(/\s+/g, " ").trim();
}

function getLabel(element: HTMLElement): string {
  const id = element.getAttribute("id");
  if (id) {
    const explicit = document.querySelector(`label[for="${CSS.escape(id)}"]`);
    if (explicit) return normalize(explicit.textContent);
  }

  const wrapped = element.closest("label");
  if (wrapped) return normalize(wrapped.textContent);

  const ariaLabelledBy = element.getAttribute("aria-labelledby");
  if (ariaLabelledBy) {
    return normalize(
      ariaLabelledBy
        .split(/\s+/)
        .map(value => document.getElementById(value)?.textContent ?? "")
        .join(" ")
    );
  }

  return "";
}

function getContext(element: HTMLElement): string {
  const container = element.closest(
    ".form-group, .field, .question, [role='group'], fieldset, section, li, div"
  );
  return normalize(container?.textContent).slice(0, 300);
}

function fieldId(element: HTMLElement, index: number): string {
  return (
    element.getAttribute("id") ||
    element.getAttribute("name") ||
    `aria-field-${index}`
  );
}

function getOptions(element: HTMLElement): string[] | undefined {
  if (!(element instanceof HTMLSelectElement)) return undefined;
  return Array.from(element.options)
    .map(option => normalize(option.textContent))
    .filter(Boolean);
}

export function scanDocument(): ScanResult {
  const elements = Array.from(document.querySelectorAll<HTMLElement>(selectors));

  const fields: ScannedField[] = elements
    .filter(element => {
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      return rect.width > 0 && rect.height > 0 && style.visibility !== "hidden";
    })
    .map((element, index) => {
      const tag = element.tagName.toLowerCase();
      const inputType =
        element instanceof HTMLInputElement ? element.type : tag;
      const name = normalize(element.getAttribute("name"));
      const label = getLabel(element);
      const placeholder = normalize(element.getAttribute("placeholder"));
      const ariaLabel = normalize(element.getAttribute("aria-label"));
      const context = getContext(element);
      const classification = classifyField({
        tag, inputType, name, label, placeholder, ariaLabel, context
      });

      return {
        id: fieldId(element, index),
        tag,
        inputType,
        name,
        label,
        placeholder,
        ariaLabel,
        context,
        required: element.hasAttribute("required") ||
          element.getAttribute("aria-required") === "true",
        options: getOptions(element),
        canonicalField: classification.field,
        confidence: classification.confidence
      };
    });

  return {
    url: location.href,
    title: document.title,
    scannedAt: new Date().toISOString(),
    fields
  };
}
