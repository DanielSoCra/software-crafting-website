import DeliverableCard from './DeliverableCard';
import type { Deliverable, DeliverableType } from '../../lib/types';
import { DELIVERABLE_TYPES, DELIVERABLE_LABELS } from '../../lib/types';

interface Props {
  company: string;
  deliverables: Deliverable[];
  questionnaireFormId: string | null;
  questionnaireStatus: string | null;
  clientSlug?: string;
}

const ICONS: Record<DeliverableType, string> = {
  'analysis': '🔍',
  'mood-board': '🎨',
  'brand-guide': '🎯',
  'website-preview': '🌐',
  'proposal': '📄',
};

function getDeliverableStatus(deliverables: Deliverable[], type: DeliverableType): 'pending' | 'published' | 'viewed' {
  const d = deliverables.find((d) => d.type === type);
  if (!d) return 'pending';
  return d.viewed_at ? 'viewed' : 'published';
}

function getQuestionnaireStatus(status: string | null): 'pending' | 'published' | 'viewed' {
  if (!status) return 'pending';
  if (status === 'completed') return 'viewed';
  if (status === 'sent' || status === 'in_progress') return 'published';
  return 'pending';
}

export default function Dashboard({ company, deliverables, questionnaireFormId, questionnaireStatus, clientSlug }: Props) {
  const clientParam = clientSlug ? `?client=${clientSlug}` : '';

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">{company}</h1>
      <p className="text-gray-500 text-sm mb-8">Projektübersicht</p>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <DeliverableCard
          title="Fragebogen"
          icon="📋"
          status={getQuestionnaireStatus(questionnaireStatus)}
          href={questionnaireFormId ? `/portal/questionnaire/${questionnaireFormId}` : '#'}
        />
        {DELIVERABLE_TYPES.map((type) => (
          <DeliverableCard
            key={type}
            title={DELIVERABLE_LABELS[type]}
            icon={ICONS[type]}
            status={getDeliverableStatus(deliverables, type)}
            href={`/portal/deliverables/${type}${clientParam}`}
          />
        ))}
        {/* Phase 2 placeholder */}
        <div className="bg-gray-50 border border-gray-200 border-dashed rounded-xl p-5 opacity-60">
          <div className="text-2xl mb-2">📁</div>
          <h3 className="font-semibold text-sm mb-1">Dateien</h3>
          <span className="text-xs text-gray-400">Bald verfügbar</span>
        </div>
      </div>
    </div>
  );
}
