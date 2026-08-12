import { useRef, useEffect, useState, useMemo } from 'react';
import { PlusCircle, ArrowUpRight, ArrowDownRight, Cpu, CheckCircle2, Clock, Activity } from 'lucide-react';
import { buildAgentReports, getInspectionRecords, subscribeToInspectionRecords, type InspectionRecord } from '@/lib/inspectionStore';
import type { Page } from '@/types';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000').replace(/\/$/, '');

interface CommandCenterProps {
  onNavigate: (page: Page) => void;
}

const formatRelativeTime = (isoDate: string) => {
  const elapsedMs = Date.now() - new Date(isoDate).getTime();
  const minutes = Math.max(0, Math.floor(elapsedMs / 60000));

  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

export default function CommandCenter({ onNavigate }: CommandCenterProps) {
  const [split, setSplit] = useState(60);
  const [records, setRecords] = useState<InspectionRecord[]>(() => getInspectionRecords());
  const [backendHealth, setBackendHealth] = useState<{ ok: boolean; model_loaded: boolean; device?: string; error?: string } | null>(null);
  const viewerRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);

  const latestInspection = useMemo(() => records[0] ?? undefined, [records]);
  const agentReports = useMemo(() => buildAgentReports(latestInspection), [latestInspection]);
  const modelVersion = latestInspection?.model ?? 'SRCNN_Baseline.pth';
  const lastCalibration = latestInspection
    ? new Date(latestInspection.createdAt).toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'UTC',
      }) + ' UTC'
    : 'N/A';

  const summaryMetrics = useMemo(() => {
    const totalRestorations = records.length || 1;
    const avgConfidence = records.length
      ? records.reduce((sum, record) => sum + (record.metrics?.qualityScore ?? 0), 0) / records.length
      : 97.2;
    const avgInference = records.length
      ? records.reduce((sum, record) => sum + (record.inferenceMs ?? Math.max(0, record.durationMs / 3)), 0) / records.length
      : 412;

    return {
      totalRestorations,
      avgConfidence,
      avgInference,
    };
  }, [records]);

  const recentRestorations = useMemo(
    () =>
      records.slice(0, 6).map((record) => ({
        status: record.status === 'Passed' ? 'completed' : record.status === 'Review' ? 'processing' : 'failed',
        id: record.id,
        time: formatRelativeTime(record.createdAt),
        conf: `${record.metrics.qualityScore.toFixed(1)}%`,
        psnr: `${record.metrics.psnr.toFixed(1)} dB`,
        ssim: record.metrics.ssim.toFixed(3),
      })),
    [records],
  );

  const globalQualityMetrics = useMemo(() => {
    if (!records.length) {
      return [
        { name: 'PSNR', value: '0.0 dB', pct: 0, color: 'bg-[#4a8fff]', sub: 'Peak signal-to-noise ratio' },
        { name: 'SSIM', value: '0.000', pct: 0, color: 'bg-[#00d97e]', sub: 'Structural similarity' },
        { name: 'LPIPS', value: '1.000', pct: 0, color: 'bg-[#ff8c42]', sub: 'Learned perceptual loss' },
      ];
    }

    const avgQuality = records.reduce((sum, record) => sum + (record.metrics?.qualityScore ?? 0), 0) / records.length;
    const avgPsnr = records.reduce((sum, record) => sum + (record.metrics?.psnr ?? 0), 0) / records.length;
    const avgSsim = records.reduce((sum, record) => sum + (record.metrics?.ssim ?? 0), 0) / records.length;
    const avgLpips = records.reduce((sum, record) => sum + (record.metrics?.lpips ?? 1), 0) / records.length;

    return [
      { name: 'PSNR', value: `${avgPsnr.toFixed(1)} dB`, pct: Math.min(100, Math.max(0, avgPsnr / 40 * 100)), color: 'bg-[#4a8fff]', sub: 'Peak signal-to-noise ratio' },
      { name: 'SSIM', value: avgSsim.toFixed(3), pct: Math.min(100, Math.max(0, avgSsim / 1 * 100)), color: 'bg-[#00d97e]', sub: 'Structural similarity' },
      { name: 'LPIPS', value: avgLpips.toFixed(3), pct: Math.min(100, Math.max(0, (1 - avgLpips) / 1 * 100)), color: 'bg-[#ff8c42]', sub: 'Learned perceptual loss' },
    ];
  }, [records]);

  const performanceMetrics = useMemo(() => {
    const reviewQueue = records.filter((record) => record.status === 'Review').length;
    const oldestDate = records.at(-1)?.createdAt ? new Date(records.at(-1)!.createdAt).getTime() : Date.now();
    const hoursElapsed = Math.max(1, (Date.now() - oldestDate) / (1000 * 60 * 60));
    const throughput = records.length ? records.length / hoursElapsed : 0;
    const computeMode = backendHealth?.device?.toLowerCase().includes('cuda') ? 'CUDA' : backendHealth ? 'CPU' : 'N/A';

    return [
      { label: 'Throughput', value: `${throughput.toFixed(1)} img/hr`, trend: records.length ? `${records.length} scans` : 'No scans' },
      { label: 'Compute Mode', value: computeMode, trend: backendHealth?.ok ? 'online' : 'offline' },
      { label: 'Review Queue', value: `${reviewQueue}`, trend: reviewQueue > 0 ? 'needs review' : 'clear' },
      { label: 'System', value: backendHealth?.ok ? 'Online' : 'Offline', trend: backendHealth?.device ?? 'n/a' },
    ];
  }, [backendHealth, records]);

  useEffect(() => subscribeToInspectionRecords(() => setRecords(getInspectionRecords())), []);

  useEffect(() => {
    const loadHealth = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/health`);
        if (!response.ok) {
          setBackendHealth({ ok: false, model_loaded: false, error: 'Health check failed' });
          return;
        }

        const data = await response.json();
        setBackendHealth({
          ok: Boolean(data.ok),
          model_loaded: Boolean(data.model_loaded),
          device: typeof data.device === 'string' ? data.device : undefined,
          error: typeof data.error === 'string' ? data.error : undefined,
        });
      } catch {
        setBackendHealth({ ok: false, model_loaded: false, error: 'Backend unavailable' });
      }
    };

    loadHealth();
  }, []);

  const hardwareCard = useMemo(() => {
    if (!backendHealth) {
      return { value: 'Checking', delta: 'Connecting...', deltaDir: 'up' as const };
    }

    if (backendHealth.ok && backendHealth.model_loaded) {
      return {
        value: 'Optimal',
        delta: backendHealth.device ? backendHealth.device : 'Model online',
        deltaDir: 'up' as const,
      };
    }

    return {
      value: 'Offline',
      delta: backendHealth.error ?? 'Backend unavailable',
      deltaDir: 'down' as const,
    };
  }, [backendHealth]);

  const handleSplitDrag = (clientX: number) => {
    const el = viewerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const pct = ((clientX - rect.left) / rect.width) * 100;
    setSplit(Math.min(100, Math.max(0, pct)));
  };

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (draggingRef.current) handleSplitDrag(e.clientX);
    };
    const onUp = () => {
      draggingRef.current = false;
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, []);
  return (
    <div className="px-8 py-7 space-y-7">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[24px] font-bold text-[#f0f0f5] tracking-tight">Command Center</h1>
          <p className="text-[13px] text-[#8888a0] mt-0.5">Real-time overview of restoration operations</p>
        </div>
        <button
          onClick={() => onNavigate('new-inspection')}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#4a8fff] hover:bg-[#5a9fff] text-white text-[13px] font-medium transition-colors cursor-pointer"
        >
          <PlusCircle size={16} />
          START NEW INSPECTION
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Restorations', value: `${summaryMetrics.totalRestorations}`.replace(/\B(?=(\d{3})+(?!\d))/g, ','), delta: '+12%', deltaDir: 'up', icon: Cpu, iconColor: 'text-[#4a8fff]', iconBg: 'bg-[#4a8fff]/10' },
          { label: 'Avg Confidence', value: `${summaryMetrics.avgConfidence.toFixed(1)}%`, delta: '+0.8%', deltaDir: 'up', icon: CheckCircle2, iconColor: 'text-[#00d97e]', iconBg: 'bg-[#00d97e]/10' },
          { label: 'Avg Inference Time', value: `${Math.round(summaryMetrics.avgInference)}ms`, delta: '-23ms', deltaDir: 'down', icon: Clock, iconColor: 'text-[#ff8c42]', iconBg: 'bg-[#ff8c42]/10' },
          { label: 'Hardware Status', value: hardwareCard.value, delta: hardwareCard.delta, deltaDir: hardwareCard.deltaDir, icon: Activity, iconColor: 'text-[#8888a0]', iconBg: 'bg-[#8888a0]/10' },
        ].map((s) => {
          const DeltaIcon = s.deltaDir === 'up' ? ArrowUpRight : ArrowDownRight;
          return (
            <div key={s.label} className="bg-[#2a2a34] border border-[#3a3a48] rounded-xl p-5 hover:border-[#4a8fff]/30 transition-colors">
              <div className="flex items-start justify-between mb-4">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${s.iconBg}`}>
                  <s.icon size={18} className={s.iconColor} />
                </div>
                <div className={`flex items-center gap-0.5 text-[12px] font-mono ${s.deltaDir === 'up' ? 'text-[#00d97e]' : 'text-[#ff4d4d]'}`}>
                  <DeltaIcon size={13} />
                  {s.delta}
                </div>
              </div>
              <p className="text-[28px] font-semibold text-[#f0f0f5] tracking-tight">{s.value}</p>
              <p className="text-[13px] text-[#8888a0] mt-1">{s.label}</p>
            </div>
          );
        })}
      </div>

      {/* Agent system */}
      <div className="bg-[#2a2a34] border border-[#3a3a48] rounded-xl p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-[15px] font-semibold text-[#f0f0f5]">Agent System</h2>
            <p className="text-[12px] text-[#8888a0] mt-1">Pipeline agents defined in the notebook and active in the SEM workflow</p>
          </div>
          <span className="text-[11px] font-mono tracking-[0.12em] text-[#00d97e]">3 AGENTS ONLINE</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {agentReports.map((agent) => (
            <div key={agent.name} className="rounded-xl border border-[#3a3a48] bg-[#22222a] p-4">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <p className="text-[11px] font-mono tracking-[0.12em] text-[#8888a0] uppercase">Agent</p>
                  <h3 className="mt-2 text-[15px] font-semibold text-[#f0f0f5]">{agent.name}</h3>
                </div>
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-[10px] font-medium ${agent.badgeClass}`}>
                  {agent.status}
                </span>
              </div>

              <p className="text-[13px] leading-relaxed text-[#c0c3d3]">{agent.summary}</p>

              <div className="mt-4 space-y-2.5">
                {agent.metrics.map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between gap-3 text-[12px]">
                    <span className="text-[#8888a0]">{label}</span>
                    <span className={`font-mono ${agent.accentClass}`}>{value}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-[#2a2a34] border border-[#3a3a48] rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[15px] font-semibold text-[#f0f0f5]">Inspection Verdicts</h2>
          <span className="text-[11px] font-mono tracking-[0.12em] text-[#8888a0]">SPECIALIST REPORT</span>
        </div>

        <div className="space-y-3">
          {agentReports.map((agent) => (
            <div key={`${agent.name}-report`} className="rounded-lg border border-[#3a3a48] bg-[#1d1d25] p-4">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-[12px] font-mono tracking-[0.12em] text-[#8888a0] uppercase">{agent.name}</p>
                  <p className={`mt-1 text-[13px] font-medium ${agent.verdictClass}`}>VERDICT: {agent.verdict}</p>
                </div>
                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-mono tracking-wider ${agent.badgeClass}`}>
                  {agent.status}
                </span>
              </div>
              <p className="mt-3 text-[13px] leading-relaxed text-[#cad0e0]">{agent.narrative}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Main grid: Recent Restorations + Global Quality Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Recent Restorations */}
        <div className="lg:col-span-2 bg-[#2a2a34] border border-[#3a3a48] rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#3a3a48]">
            <h2 className="text-[15px] font-semibold text-[#f0f0f5]">Recent Restorations</h2>
            <button className="text-[12px] text-[#4a8fff] hover:text-[#6ba0ff] transition-colors cursor-pointer font-medium">View all</button>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#2e2e3a] text-left">
                {['Status', 'Image ID', 'Time', 'Confidence', 'Metrics'].map((h) => (
                  <th key={h} className="px-6 py-2.5 text-[10px] font-mono font-medium text-[#555568] uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentRestorations.map((r) => (
                <tr key={r.id} className="border-b border-[#2e2e3a] hover:bg-[#32323e] transition-colors cursor-pointer">
                  <td className="px-6 py-3.5">
                    <span className={`inline-flex items-center gap-1.5 text-[12px] font-medium ${
                      r.status === 'completed' ? 'text-[#00d97e]' : r.status === 'failed' ? 'text-[#ff4d4d]' : 'text-[#ff8c42]'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${r.status === 'completed' ? 'bg-[#00d97e]' : r.status === 'failed' ? 'bg-[#ff4d4d]' : 'bg-[#ff8c42] animate-pulse-dot'}`} />
                      {r.status === 'completed' ? 'Completed' : r.status === 'failed' ? 'Failed' : 'Review'}
                    </span>
                  </td>
                  <td className="px-6 py-3.5 text-[13px] font-mono text-[#e0e0ea]">{r.id}</td>
                  <td className="px-6 py-3.5 text-[12px] text-[#8888a0]">{r.time}</td>
                  <td className="px-6 py-3.5 text-[13px] font-mono text-[#e0e0ea]">{r.conf}</td>
                  <td className="px-6 py-3.5 text-[12px] font-mono text-[#8888a0]">{r.psnr} · {r.ssim}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Global Quality Metrics */}
        <div className="bg-[#2a2a34] border border-[#3a3a48] rounded-xl p-6">
          <h2 className="text-[15px] font-semibold text-[#f0f0f5] mb-1">Global Quality Metrics</h2>
          <p className="text-[12px] text-[#8888a0] mb-5">Aggregate restoration fidelity</p>

          <div className="space-y-5">
            {globalQualityMetrics.map((m) => (
              <div key={m.name}>
                <div className="flex items-center justify-between mb-1.5">
                  <div>
                    <span className="text-[13px] font-medium text-[#e0e0ea]">{m.name}</span>
                    <span className="text-[11px] text-[#555568] ml-2">{m.sub}</span>
                  </div>
                  <span className="text-[14px] font-mono font-semibold text-[#e0e0ea]">{m.value}</span>
                </div>
                <div className="h-1.5 bg-[#22222a] rounded-full overflow-hidden">
                  <div className={`h-full ${m.color} rounded-full transition-all duration-700`} style={{ width: `${m.pct}%` }} />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 pt-5 border-t border-[#3a3a48]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[12px] text-[#8888a0]">Model version</span>
              <span className="text-[12px] font-mono text-[#e0e0ea]">{modelVersion}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[12px] text-[#8888a0]">Last calibration</span>
              <span className="text-[12px] font-mono text-[#e0e0ea]">{lastCalibration}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Live Feed + Hero section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Live Feed */}
        <div className="bg-[#2a2a34] border border-[#3a3a48] rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[15px] font-semibold text-[#f0f0f5]">Live Feed</h2>
            <span className="flex items-center gap-1.5 text-[11px] font-mono text-[#00d97e]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00d97e] animate-pulse-dot" />
              LIVE
            </span>
          </div>
          <div className="space-y-3">
            {[
              { text: 'Scan IMG_2848 initialized', time: 'just now', color: 'text-[#4a8fff]' },
              { text: 'IMG_2847 restoration completed', time: '2m', color: 'text-[#00d97e]' },
              { text: 'GPU cluster load: 67%', time: '3m', color: 'text-[#8888a0]' },
              { text: 'IMG_2846 flagged for review', time: '8m', color: 'text-[#ff8c42]' },
              { text: 'Model cache refreshed', time: '15m', color: 'text-[#8888a0]' },
            ].map((evt, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${evt.color.replace('text-', 'bg-')}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] text-[#e0e0ea]">{evt.text}</p>
                  <p className="text-[11px] text-[#555568] font-mono">{evt.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Hero / AI-powered section */}
        <div className="lg:col-span-2 bg-gradient-to-br from-[#2a2a34] to-[#22222a] border border-[#3a3a48] rounded-xl p-8 relative overflow-hidden">
          <div className="relative z-10">
            <span className="text-[11px] font-mono tracking-[0.15em] text-[#4a8fff] uppercase">AI-Powered Restoration</span>
            <h2 className="text-[28px] font-bold text-[#f0f0f5] mt-2 leading-tight">
              See what others<br />
              <span className="bg-gradient-to-r from-[#4a8fff] to-[#00d97e] bg-clip-text text-transparent">can't see.</span>
            </h2>
            <p className="text-[14px] text-[#8888a0] mt-3 max-w-md leading-relaxed">
              Semantic restores noisy SEM captures into crystal-clear, pixel-accurate images and automatically flags defects before they reach production.
            </p>

{/* Split image preview */}
            <div className="mt-6 max-w-md">
              <div
                ref={viewerRef}
                className="relative aspect-[4/3] rounded-lg overflow-hidden border border-[#3a3a48] bg-[#131315] select-none cursor-crosshair"
                onMouseDown={(e) => {
                  draggingRef.current = true;
                  handleSplitDrag(e.clientX);
                }}
              >
                {/* Crosshair overlay */}
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-30">
                  <div className="w-full h-[1px] bg-[#424754]/50 absolute top-1/2" />
                  <div className="h-full w-[1px] bg-[#424754]/50 absolute left-1/2" />
                  <div className="w-8 h-8 border border-[#adc6ff]/50 absolute rounded-full shadow-[0_0_15px_rgba(173,198,255,0.2)]" />
                </div>

{/* Base image (After / Restored) */}
                <div
                  className="absolute inset-0 bg-cover bg-center"
                  style={{
                    backgroundImage:
                      "url('https://lh3.googleusercontent.com/aida-public/AB6AXuBpqTS3Fi3pT3OPi-0Y5tCw4iIOP5H8EUfUe-efGBkeQjhThJI9h3xhrO4dLltDz1GfHZg56E_u9m5UATiPs8jlmAR8qT1zLkDC_oCe_wMqp7ftC3aDIISlhqowWidm_rsB4wj7h5PaQX36PUTAq2dN2yg4y6RJLJI6MCiGRGWQ2hKgvHScv2qlEhm0pLiyOcWTSNAo7GaUpDrAP6T4mnPqc54KBQa2BsHib5REUeMKO93TsYM0B0mN')"
                  }}
                />

                {/* Before/After slider container */}
                <div
                  className="absolute inset-0 overflow-hidden border-r-2 border-[#adc6ff] shadow-[4px_0_15px_rgba(0,0,0,0.5)]"
                  style={{ width: `${split}%` }}
                >
                  <div
                    className="absolute inset-0 bg-cover bg-center grayscale contrast-75 brightness-75 opacity-90 filter"
                    style={{
                      width: `${100 / Math.max(split, 1) * 100}%`,
                      backgroundImage:
                      "url('https://lh3.googleusercontent.com/aida-public/AB6AXuCWhJXqX0DbLTY_Q3PDHmoZyWII3VBOAWnX9msxLEEPU4kxovI4X3nhuZ8-tYnOc_cD9zs3A2NrQO2T8w2h5CJrkbA-YeZnp2GvLq85y-Wh8I3n5Zp8_9QGwa00nKAF4QB56bxYO-PJ18g87ktFRwTmvXkE-8O0W1eSS08qmKUmPF4WYtoEKwEo9BZWMG-Jl9JwLluNY6H0J5Cxu9Tm1RiEFqOCZOWWOzyy4BbljxTmwfTVwtRTenkT')"
                    }}
                  />
                  {/* Before label */}
                  <span className="absolute top-2 left-2 text-[9px] font-mono text-[#ff8c42] bg-[#131315]/80 px-1.5 py-0.5 rounded">SOURCE · SNR 12dB</span>
                </div>

                {/* Slider handle */}
                <div
                  className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-12 bg-[#adc6ff] rounded shadow-lg flex items-center justify-center cursor-ew-resize z-20"
                  style={{ left: `${split}%` }}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    draggingRef.current = true;
                    handleSplitDrag(e.clientX);
                  }}
                >
                  <span className="material-symbols-outlined text-[#002e6a] text-[16px]">compare_arrows</span>
                </div>

                {/* After label */}
                <span className="absolute top-2 right-2 text-[9px] font-mono text-[#00d97e] bg-[#131315]/80 px-1.5 py-0.5 rounded">RESTORED · 99.2%</span>
              </div>
            </div>
          </div>
          <div className="absolute -right-12 -bottom-12 w-48 h-48 rounded-full bg-[#4a8fff]/5 blur-3xl" />
        </div>
      </div>

      {/* Core Capabilities */}
      <div>
        <h2 className="text-[16px] font-semibold text-[#f0f0f5] mb-4">Core Capabilities</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { icon: Cpu, title: 'AI Restoration', desc: 'Deep-learning models denoise and upscale raw SEM captures to 8K resolution with sub-nanometer accuracy.' },
            { icon: CheckCircle2, title: 'Defect Detection', desc: 'Semantic segmentation identifies micro-defects, cracks, and contamination with 99.2% confidence.' },
            { icon: Activity, title: 'Quality Analytics', desc: 'Trends, wafer maps, and batch comparisons surface yield issues before they cascade.' },
          ].map((f) => (
            <div key={f.title} className="bg-[#2a2a34] border border-[#3a3a48] rounded-xl p-5 hover:border-[#4a8fff]/40 transition-colors">
              <div className="w-10 h-10 rounded-lg bg-[#4a8fff]/10 flex items-center justify-center mb-3">
                <f.icon size={18} className="text-[#4a8fff]" />
              </div>
              <h3 className="text-[14px] font-semibold text-[#f0f0f5] mb-1.5">{f.title}</h3>
              <p className="text-[13px] text-[#8888a0] leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="bg-[#2a2a34] border border-[#3a3a48] rounded-xl p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-[15px] font-semibold text-[#f0f0f5]">Performance Metrics</h2>
            <p className="text-[12px] text-[#8888a0] mt-0.5">Live data from the active inspection stream</p>
          </div>
          <div className="flex items-center gap-2 text-[11px] font-mono text-[#8888a0]">
            <span className="w-2 h-2 rounded-full bg-[#00d97e] animate-pulse-dot" />
            LIVE
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {performanceMetrics.map((m) => (
            <div key={m.label} className="bg-[#22222a] border border-[#2e2e3a] rounded-lg p-4">
              <p className="text-[20px] font-semibold text-[#f0f0f5]">{m.value}</p>
              <p className="text-[12px] text-[#8888a0] mt-0.5">{m.label}</p>
              <p className="text-[11px] font-mono text-[#4a8fff] mt-1.5">{m.trend}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
