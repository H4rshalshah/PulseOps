'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import TerminalText from '@/components/ui/TerminalText';
import { Clipboard, FileDown, Loader2 } from 'lucide-react';
import { incidentsApi } from '@/lib/api';
import { toast } from '@/hooks/useToast';
import type { SituationReport } from '@/lib/types';

interface SituationReportProps {
  incidentId: string;
}

export default function SituationReportComponent({ incidentId }: SituationReportProps) {
  const [report, setReport] = useState<SituationReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(false);

  // Note: Report is NOT auto-generated on mount — user clicks "Generate Report" button
  // This prevents unnecessary API calls on every page visit

  const generateReport = async () => {
    try {
      setLoading(true);
      const data = await incidentsApi.generateSituationReport(incidentId);
      setReport(data);
      setGenerated(true);
    } catch {
      toast.error('Failed to generate situation report');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (report) {
      const text = JSON.stringify(report, null, 2);
      navigator.clipboard.writeText(text);
      toast.success('Report copied to clipboard');
    }
  };

  return (
    <div className="bg-pulseops-bg border border-pulseops-border rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-pulseops-border bg-pulseops-surface">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-pulseops-danger rounded-full" />
          <span className="text-sm font-mono text-pulseops-muted">Situation Report</span>
        </div>
        <div className="flex items-center gap-2">
          {report && (
            <>
              <motion.button
                onClick={copyToClipboard}
                className="p-1.5 rounded hover:bg-pulseops-border text-pulseops-muted hover:text-pulseops-text transition-colors"
                whileHover={{ scale: 1.1 }}
              >
                <Clipboard size={14} />
              </motion.button>
            </>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4 font-mono text-sm">
        {loading ? (
          <div className="flex items-center gap-3 py-8 justify-center">
            <Loader2 size={20} className="text-pulseops-cyan animate-spin" />
            <span className="text-pulseops-muted">Generating situation report...</span>
          </div>
        ) : report ? (
          <AnimatePresence mode="wait">
            <motion.div
              key={incidentId}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-4"
            >
              {/* Summary */}
              <div>
                <div className="text-pulseops-cyan mb-1">$ ./analyze --incident={incidentId.substring(0, 8)}</div>
                <TerminalText
                  text={`[${new Date(report.generatedAt).toLocaleString()}] Analysis complete.`}
                  speed={20}
                />
              </div>

              <div className="space-y-3 mt-4">
                {/* Affected Services */}
                <Section title="Affected Services">
                  {report.affectedServices.map((svc, i) => (
                    <div key={i} className="text-pulseops-danger">✗ {svc}</div>
                  ))}
                </Section>

                {/* Recent Deployments */}
                <Section title="Recent Deployments (2h)">
                  {report.recentDeployments.length === 0 ? (
                    <div className="text-pulseops-muted">No recent deployments found</div>
                  ) : (
                    report.recentDeployments.map((commit, i) => (
                      <div key={i} className="flex items-start gap-2 text-pulseops-text">
                        <span className="text-pulseops-muted">{commit.sha}</span>
                        <span className="text-pulseops-warning">|</span>
                        <span className="truncate">{commit.message}</span>
                      </div>
                    ))
                  )}
                </Section>

                {/* Error Rate */}
                <Section title="Error Rate (30min)">
                  <div className="flex items-center gap-4 text-pulseops-text">
                    <span className="text-pulseops-muted">Current:</span>
                    <span className="text-pulseops-danger">
                      {report.errorRateData[report.errorRateData.length - 1]?.rate.toFixed(1)}%
                    </span>
                    <span className="text-pulseops-muted">| Avg:</span>
                    <span className="text-pulseops-warning">
                      {(report.errorRateData.reduce((a, b) => a + b.rate, 0) / report.errorRateData.length).toFixed(1)}%
                    </span>
                  </div>
                </Section>

                {/* Similar Incidents */}
                <Section title="Similar Past Incidents">
                  {report.similarPastIncidents.length === 0 ? (
                    <div className="text-pulseops-muted">No similar incidents found</div>
                  ) : (
                    report.similarPastIncidents.slice(0, 3).map((inc, i) => (
                      <div key={i} className="text-pulseops-text">• {inc.title}</div>
                    ))
                  )}
                </Section>

                {/* Recommended Actions */}
                <Section title="Recommended Actions">
                  {report.recommendedActions.map((action, i) => (
                    <div key={i} className="text-pulseops-success">→ {action}</div>
                  ))}
                </Section>
              </div>
            </motion.div>
          </AnimatePresence>
        ) : (
          <div className="text-center py-8">
            <p className="text-pulseops-muted">Click generate to create a situation report</p>
            <motion.button
              onClick={generateReport}
              className="mt-3 px-4 py-2 bg-pulseops-cyan/10 text-pulseops-cyan border border-pulseops-cyan/20 rounded-lg text-sm hover:bg-pulseops-cyan/20 transition-colors"
              whileHover={{ scale: 1.02 }}
            >
              Generate Report
            </motion.button>
          </div>
        )}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-pulseops-muted mb-1"># {title}</div>
      <div className="ml-4 space-y-0.5">{children}</div>
    </div>
  );
}
