// ActivationWizard — top-of-page setup checklist.
//
// Renders ONLY when at least one activation step is missing. When the
// stack is fully activated this component returns null so the editor
// isn't pestered. Server component, zero client JS.

import { CheckCircle2, Circle, AlertTriangle } from 'lucide-react'
import type { ActivationReport, ActivationStep } from '@/lib/seo/activation-status'

export function ActivationWizard({ report }: { report: ActivationReport }) {
  if (report.fullyActivated) return null

  return (
    <div className="bg-white border border-portal-border rounded-lg overflow-hidden" style={{ borderLeft: '3px solid var(--color-portal-amber)' }}>
      <div className="bg-portal-bg px-4 py-3 border-b border-portal-border">
        <div className="flex items-center gap-2">
          <AlertTriangle size={14} className="text-portal-amber" />
          <strong className="text-[13px] text-portal-text">
            Activate the SEO stack — {report.blockerCount} step{report.blockerCount === 1 ? '' : 's'} remaining
          </strong>
        </div>
        <p className="text-[11px] text-portal-sub mt-1 leading-relaxed">
          Most SEO pages render the right shells even before activation, but data + AI features stay
          dormant until each box is checked. Run the steps in order — later steps depend on earlier ones.
        </p>
      </div>
      <ol className="divide-y divide-portal-border">
        {report.steps.map((s, i) => <Row key={s.key} step={s} index={i + 1} />)}
      </ol>
    </div>
  )
}

function Row({ step, index }: { step: ActivationStep; index: number }) {
  const Icon = step.status === 'ok'      ? CheckCircle2
             : step.status === 'missing' ? Circle
             :                             Circle
  const iconClass = step.status === 'ok'      ? 'text-portal-green'
                  : step.status === 'missing' ? 'text-portal-amber'
                  :                             'text-portal-sub'
  const titleClass = step.status === 'ok' ? 'text-portal-sub line-through' : 'text-portal-text'

  return (
    <li className="px-4 py-3 flex items-start gap-3">
      <div className="flex items-center gap-2 mt-0.5 shrink-0">
        <span className="text-[10px] font-bold uppercase tracking-wider text-portal-sub w-4">{index}.</span>
        <Icon size={16} className={iconClass} />
      </div>
      <div className="flex-1 min-w-0">
        <div className={`text-[13px] font-bold ${titleClass}`}>{step.title}</div>
        <p className="text-[12px] text-portal-sub mt-0.5 leading-relaxed">{step.description}</p>
        {step.action && (
          <div className="mt-1.5 text-[12px]">
            <strong className="text-portal-amber">▸ {step.action.label}</strong>
            {step.action.hint && (
              <span className="text-portal-sub ml-1.5">— {step.action.hint}</span>
            )}
          </div>
        )}
      </div>
    </li>
  )
}
