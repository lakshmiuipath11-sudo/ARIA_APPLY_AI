import type { CanonicalField } from "../types";

interface FieldSignals {
  tag: string;
  inputType: string;
  name: string;
  label: string;
  placeholder: string;
  ariaLabel: string;
  context: string;
}

const rules: Array<{ field: CanonicalField; patterns: RegExp[] }> = [
  { field: "firstName", patterns: [/first[\s_-]*name/i, /given[\s_-]*name/i] },
  { field: "lastName", patterns: [/last[\s_-]*name/i, /surname/i, /family[\s_-]*name/i] },
  { field: "fullName", patterns: [/full[\s_-]*name/i, /^name$/i] },
  { field: "email", patterns: [/e-?mail/i] },
  { field: "phone", patterns: [/phone/i, /mobile/i, /contact[\s_-]*number/i] },
  { field: "city", patterns: [/\bcity\b/i, /current[\s_-]*location/i] },
  { field: "country", patterns: [/\bcountry\b/i, /nationality/i] },
  { field: "linkedin", patterns: [/linkedin/i] },
  { field: "github", patterns: [/github/i] },
  { field: "portfolio", patterns: [/portfolio/i, /personal[\s_-]*website/i] },
  { field: "currentCompany", patterns: [/current[\s_-]*(company|employer)/i, /organization/i] },
  { field: "designation", patterns: [/designation/i, /job[\s_-]*title/i, /current[\s_-]*role/i] },
  { field: "experienceYears", patterns: [/years?.*experience/i, /total.*experience/i] },
  { field: "noticePeriod", patterns: [/notice[\s_-]*period/i, /availability/i] },
  { field: "currentSalary", patterns: [/current.*(salary|compensation|ctc)/i] },
  { field: "expectedSalary", patterns: [/expected.*(salary|compensation|ctc)/i] },
  { field: "skills", patterns: [/\bskills?\b/i, /technolog/i] },
  { field: "coverLetter", patterns: [/cover[\s_-]*letter/i, /why.*(join|apply)/i] },
  { field: "resume", patterns: [/resume/i, /\bcv\b/i] }
];

export function classifyField(signals: FieldSignals): {
  field: CanonicalField;
  confidence: number;
} {
  if (signals.inputType === "email") return { field: "email", confidence: 0.99 };
  if (signals.inputType === "tel") return { field: "phone", confidence: 0.99 };
  if (signals.inputType === "file") return { field: "resume", confidence: 0.85 };

  const weightedText = [
    signals.label,
    signals.ariaLabel,
    signals.name,
    signals.placeholder,
    signals.context
  ].join(" | ");

  for (const rule of rules) {
    const matchIndex = rule.patterns.findIndex(pattern => pattern.test(weightedText));
    if (matchIndex >= 0) {
      const labelMatch = rule.patterns.some(pattern =>
        pattern.test(`${signals.label} ${signals.ariaLabel}`)
      );
      return {
        field: rule.field,
        confidence: labelMatch ? 0.94 : 0.78
      };
    }
  }

  return { field: "unknown", confidence: 0.2 };
}
