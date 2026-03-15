import { useState } from 'react'
import { Alert, SOAPDraft, ChecklistItem, AlertSeverity } from '../types'
import { SoapEditor } from './SoapEditor'
import { Checklist } from './Checklist'

interface Props {
  alerts: Alert[]
  soapDraft: SOAPDraft
  onSoapChange: (draft: SOAPDraft) => void
  checklist: ChecklistItem[]
  onChecklistToggle: (id: string) => void
}

type Tab = 'insights' | 'soap' | 'checklist'

const SEVERITY_STYLES: Record<AlertSeverity, { border: string; bg: string; badge: string; label: string }> = {
  critico: { border: 'border-red-300',    bg: 'bg-red-50',    badge: 'bg-red-100 text-red-800',    label: 'Crítico'  },
  aviso:   { border: 'border-amber-300',  bg: 'bg-amber-50',  badge: 'bg-amber-100 text-amber-800',  label: 'Aviso'    },
  info:    { border: 'border-blue-200',   bg: 'bg-blue-50',   badge: 'bg-blue-100 text-blue-800',   label: 'Info'     },
}

function AlertCard({ alert }: { alert: Alert }) {
  const style = SEVERITY_STYLES[alert.severity]
  return (
    <div className={`rounded-lg border ${style.border} ${style.bg} p-3`}>
      <div className="flex items-center justify-between gap-2 mb-1">
        <p className="text-sm font-medium text-stone-800">{alert.message}</p>
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${style.badge}`}>
          {style.label}
        </span>
      </div>
      {alert.detail && (
        <p className="text-xs text-stone-500">{alert.detail}</p>
      )}
      <p className="text-xs text-stone-400 mt-1 italic">Sugestão de apoio clínico</p>
    </div>
  )
}

export function InsightsPanel({ alerts, soapDraft, onSoapChange, checklist, onChecklistToggle }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('insights')

  const tabs: { id: Tab; label: string; badge?: number }[] = [
    { id: 'insights',  label: 'Insights',  badge: alerts.length > 0 ? alerts.length : undefined },
    { id: 'soap',      label: 'SOAP' },
    { id: 'checklist', label: 'Checklist', badge: checklist.filter(i => !i.done).length || undefined },
  ]

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex border-b border-stone-200 mb-4 shrink-0" role="tablist">
        {tabs.map(tab => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-stone-500 hover:text-stone-700'
            }`}
          >
            {tab.label}
            {tab.badge !== undefined && (
              <span className="min-w-[1.25rem] h-5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-semibold flex items-center justify-center px-1">
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        {activeTab === 'insights' && (
          <div className="space-y-3">
            {alerts.length === 0 ? (
              <p className="text-stone-400 text-sm text-center mt-6">
                Nenhum alerta detectado.
                <br />
                <span className="text-xs">Os alertas aparecem conforme a consulta avança.</span>
              </p>
            ) : (
              alerts.map(alert => <AlertCard key={alert.id} alert={alert} />)
            )}
          </div>
        )}

        {activeTab === 'soap' && (
          <SoapEditor draft={soapDraft} onChange={onSoapChange} />
        )}

        {activeTab === 'checklist' && (
          <Checklist items={checklist} onToggle={onChecklistToggle} />
        )}
      </div>
    </div>
  )
}
