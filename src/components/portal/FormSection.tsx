import type { FormSection as FormSectionType, AussageItem, FrageItem } from '../../lib/types';

const colorMap: Record<string, { border: string; bg: string; heading: string }> = {
  teal:   { border: 'border-teal-600',   bg: 'bg-teal-50',    heading: 'text-teal-600' },
  indigo: { border: 'border-indigo-600', bg: 'bg-indigo-50',  heading: 'text-indigo-600' },
  purple: { border: 'border-purple-600', bg: 'bg-purple-50',  heading: 'text-purple-600' },
  gray:   { border: 'border-gray-500',   bg: 'bg-gray-50',    heading: 'text-gray-600' },
  pink:   { border: 'border-pink-500',   bg: 'bg-pink-50',    heading: 'text-pink-500' },
};

interface Props {
  section: FormSectionType;
  answers: Record<string, string | string[]>;
  onChange: (key: string, value: string | string[]) => void;
  readOnly: boolean;
}

function renderRadioField(frage: FrageItem, value: string | string[], onChange: (key: string, value: string | string[]) => void, readOnly: boolean) {
  const selected = typeof value === 'string' ? value : '';
  return (
    <div className="space-y-2">
      {(frage.options ?? []).map((opt) => (
        <label key={opt} className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="radio"
            name={frage.key}
            value={opt}
            checked={selected === opt}
            onChange={() => onChange(frage.key, opt)}
            disabled={readOnly}
            className="accent-teal-600"
          />
          {opt}
        </label>
      ))}
    </div>
  );
}

function renderCheckboxField(frage: FrageItem, value: string | string[], onChange: (key: string, value: string | string[]) => void, readOnly: boolean) {
  const selected = Array.isArray(value) ? value : value ? [value] : [];
  return (
    <div className="space-y-2">
      {(frage.options ?? []).map((opt) => (
        <label key={opt} className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            value={opt}
            checked={selected.includes(opt)}
            onChange={(e) => {
              const next = e.target.checked
                ? [...selected, opt]
                : selected.filter((s) => s !== opt);
              onChange(frage.key, next);
            }}
            disabled={readOnly}
            className="accent-teal-600"
          />
          {opt}
        </label>
      ))}
    </div>
  );
}

export default function FormSection({ section, answers, onChange, readOnly }: Props) {
  const colors = colorMap[section.color] ?? colorMap.gray;

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
      <h3 className={`text-base font-semibold mb-4 pb-2 border-b-2 ${colors.border} ${colors.heading}`}>
        {section.title}
      </h3>

      {section.items.map((item, i) => {
        if (item.type === 'aussage') {
          const aussage = item as AussageItem;
          return (
            <div key={i} className={`${colors.bg} rounded-lg p-4 mb-4 text-sm leading-relaxed`}>
              <p>{aussage.text}</p>
              {aussage.escape && (
                <p className="mt-2 text-gray-500 italic text-sm">{aussage.escape}</p>
              )}
            </div>
          );
        }

        const frage = item as FrageItem;
        const value = answers[frage.key] ?? '';

        return (
          <div key={frage.key} className="mb-4">
            <label className="block text-sm font-medium mb-1">
              {frage.label}
              {frage.required && <span className="text-red-500 ml-1">*</span>}
            </label>

            {frage.field === 'textarea' ? (
              <textarea
                value={typeof value === 'string' ? value : ''}
                onChange={(e) => onChange(frage.key, e.target.value)}
                placeholder={frage.placeholder}
                readOnly={readOnly}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-y focus:outline-none focus:ring-2 focus:ring-teal-500 read-only:bg-gray-50"
              />
            ) : frage.field === 'select' ? (
              <select
                value={typeof value === 'string' ? value : ''}
                onChange={(e) => onChange(frage.key, e.target.value)}
                disabled={readOnly}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="">{frage.placeholder ?? 'Bitte wählen...'}</option>
                {(frage.options ?? []).map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            ) : frage.field === 'radio' ? (
              renderRadioField(frage, value, onChange, readOnly)
            ) : frage.field === 'checkbox' ? (
              renderCheckboxField(frage, value, onChange, readOnly)
            ) : (
              <input
                type={frage.field === 'email' ? 'email' : frage.field === 'url' ? 'url' : 'text'}
                value={typeof value === 'string' ? value : ''}
                onChange={(e) => onChange(frage.key, e.target.value)}
                placeholder={frage.placeholder}
                readOnly={readOnly}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 read-only:bg-gray-50"
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
