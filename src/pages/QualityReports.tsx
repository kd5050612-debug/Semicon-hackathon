import { useState, useRef, useEffect, useMemo } from 'react';
import { Download, Share2, Layers, CheckCircle2, AlertTriangle, Activity, BarChart3 } from 'lucide-react';
import { getInspectionRecords, subscribeToInspectionRecords, type InspectionRecord } from '@/lib/inspectionStore';

const SAMPLE_RESTORED =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuBpqTS3Fi3pT3OPi-0Y5tCw4iIOP5H8EUfUe-efGBkeQjhThJI9h3xhrO4dLltDz1GfHZg56E_u9m5UATiPs8jlmAR8qT1zLkDC_oCe_wMqp7ftC3aDIISlhqowWidm_rsB4wj7h5PaQX36PUTAq2dN2yg4y6RJLJI6MCiGRGWQ2hKgvHScv2qlEhm0pLiyOcWTSNAo7GaUpDrAP6T4mnPqc54KBQa2BsHib5REUeMKO93TsYM0B0mN';
const SAMPLE_SOURCE =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuCWhJXqX0DbLTY_Q3PDHmoZyWII3VBOAWnX9msxLEEPU4kxovI4X3nhuZ8-tYnOc_cD9zs3A2NrQO2T8w2h5CJrkbA-YeZnp2GvLq85y-Wh8I3n5Zp8_9QGwa00nKAF4QB56bxYO-PJ18g87ktFRwTmvXkE-8O0W1eSS08qmKUmPF4WYtoEKwEo9BZWMG-Jl9JwLluNY6H0J5Cxu9Tm1RiEFqOCZOWWOzyy4BbljxTmwfTVwtRTenkT';

const sampleReport: InspectionRecord = {
  id: 'IMG_2847',
  filename: 'sample-sem-capture.png',
  scanName: 'Production A',
  wafer: 'Wafer A-12',
  batch: 'Production A',
  scanMode: 'standard',
  status: 'Passed',
  defects: 0,
  createdAt: new Date(Date.now() - 120000).toISOString(),
  durationMs: 247000,
  model: 'SRCNN_Baseline.pth',
  device: 'cpu',
  sourceImage: SAMPLE_SOURCE,
  restoredImage: SAMPLE_RESTORED,
  inputShape: [512, 512],
  outputShape: [1024, 1024],
  metrics: {
    qualityScore: 99.2,
    psnr: 38.4,
    ssim: 0.987,
    lpips: 0.031,
    surface: 98,
    edges: 99,
    fineDetail: 96,
    noiseFloor: 94,
  },
};

const toTitleCase = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

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

const formatDuration = (durationMs: number) => {
  if (durationMs < 1000) return `${Math.round(durationMs)} ms`;

  const seconds = Math.round(durationMs / 1000);
  if (seconds < 60) return `${seconds}s`;

  const minutes = Math.floor(seconds / 60);
  return `${minutes}m ${seconds % 60}s`;
};

const formatShape = (shape?: [number, number]) => (shape ? shape.join('x') : '-');

export default function QualityReports() {
  const [activeTab, setActiveTab] = useState<'analysis' | 'metadata' | 'defects'>('analysis');
  const [showConfidenceMap, setShowConfidenceMap] = useState(false);
  const [split, setSplit] = useState(60);
  const [records, setRecords] = useState<InspectionRecord[]>(() => getInspectionRecords());
  const viewerRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);

  const report = useMemo(() => records.find((record) => record.restoredImage) ?? records[0] ?? sampleReport, [records]);
  const sourceImage = report.sourceImage ?? SAMPLE_SOURCE;
  const restoredImage = report.restoredImage ?? SAMPLE_RESTORED;
  const statusColor =
    report.status === 'Passed' ? 'text-[#00d97e]' : report.status === 'Review' ? 'text-[#ff8c42]' : 'text-[#ff4d4d]';

  const handleSplitDrag = (clientX: number) => {
    const el = viewerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const pct = ((clientX - rect.left) / rect.width) * 100;
    setSplit(Math.min(100, Math.max(0, pct)));
  };

  useEffect(() => subscribeToInspectionRecords(() => setRecords(getInspectionRecords())), []);

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
    <div className="px-8 py-7 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="text-[11px] font-mono text-[#8888a0] px-2 py-1 rounded bg-[#22222a] border border-[#3a3a48]">{report.id}</span>
            <span className={`flex items-center gap-1.5 text-[12px] ${statusColor}`}>
              {report.status === 'Passed' ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
              {report.status}
            </span>
          </div>
          <h1 className="text-[24px] font-bold text-[#f0f0f5] tracking-tight">Quality Report</h1>
          <p className="text-[13px] text-[#8888a0] mt-0.5">
            {report.wafer} - {report.batch} - Completed {formatRelativeTime(report.createdAt)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#22222a] border border-[#3a3a48] text-[13px] text-[#e0e0ea] hover:border-[#4a8fff] transition-colors cursor-pointer">
            <Share2 size={15} />
            Share
          </button>
          <a
            href={restoredImage}
            download={`${report.filename.replace(/\.[^.]+$/, '')}_report.png`}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#4a8fff] text-white text-[13px] font-medium hover:bg-[#5a9fff] transition-colors cursor-pointer"
          >
            <Download size={15} />
            Export
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 bg-[#2a2a34] border border-[#3a3a48] rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-[#3a3a48]">
            <span className="text-[13px] font-medium text-[#e0e0ea]">Image Comparison</span>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowConfidenceMap(!showConfidenceMap)}
                className={`text-[11px] font-mono tracking-wider px-2.5 py-1 rounded transition-colors cursor-pointer ${
                  showConfidenceMap ? 'bg-[#4a8fff]/20 text-[#4a8fff]' : 'text-[#8888a0] hover:text-[#e0e0ea]'
                }`}
              >
                CONFIDENCE MAP
              </button>
              <span className="text-[10px] font-mono text-[#555568]">DRAG TO COMPARE</span>
            </div>
          </div>

          <div
            ref={viewerRef}
            className="relative bg-[#131315] overflow-hidden select-none cursor-crosshair"
            style={{ minHeight: 420 }}
            onMouseDown={(e) => {
              draggingRef.current = true;
              handleSplitDrag(e.clientX);
            }}
          >
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-30">
              <div className="w-full h-[1px] bg-[#424754]/50 absolute top-1/2" />
              <div className="h-full w-[1px] bg-[#424754]/50 absolute left-1/2" />
              <div className="w-8 h-8 border border-[#adc6ff]/50 absolute rounded-full shadow-[0_0_15px_rgba(173,198,255,0.2)]" />
            </div>

            <div className="absolute top-4 left-4 font-mono text-[10px] text-[#adc6ff] bg-[#131315]/80 px-2 py-1 rounded backdrop-blur-sm z-20">
              {formatShape(report.inputShape)} SOURCE
            </div>
            <div className="absolute bottom-4 right-4 font-mono text-[10px] text-[#c2c6d6] bg-[#131315]/80 px-2 py-1 rounded backdrop-blur-sm z-20">
              {toTitleCase(report.scanMode)} MODE
            </div>

            <div
              className="absolute inset-0 bg-contain bg-center bg-no-repeat"
              style={{ backgroundImage: `url('${restoredImage}')` }}
            />

            <div
              className="absolute inset-0 overflow-hidden border-r-2 border-[#adc6ff] shadow-[4px_0_15px_rgba(0,0,0,0.5)]"
              style={{ width: `${split}%` }}
            >
              <div
                className="absolute inset-0 bg-contain bg-center bg-no-repeat grayscale contrast-75 brightness-75 opacity-90 filter"
                style={{
                  width: `${100 / Math.max(split, 1) * 100}%`,
                  backgroundImage: `url('${sourceImage}')`,
                }}
              />
              <div className="absolute top-4 left-4 bg-[#2a2a2c]/90 text-[#e5e1e4] font-mono text-[10px] px-2 py-1 rounded shadow-md backdrop-blur-md uppercase tracking-wider">
                Source
              </div>
            </div>

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

            <div className="absolute top-4 right-4 bg-[#2a2a2c]/90 text-[#adc6ff] font-mono text-[10px] px-2 py-1 rounded shadow-md backdrop-blur-md uppercase tracking-wider z-20">
              Restored Output
            </div>

            {showConfidenceMap && (
              <div
                className="absolute inset-0 pointer-events-none z-10"
                style={{
                  background:
                    'radial-gradient(circle at 50% 50%, rgba(78,222,163,0.25), transparent 70%), ' +
                    'radial-gradient(circle at 30% 40%, rgba(173,198,255,0.2), transparent 60%), ' +
                    'radial-gradient(circle at 70% 60%, rgba(255,183,134,0.2), transparent 55%)',
                }}
              />
            )}
          </div>
        </div>

        <div className="bg-[#2a2a34] border border-[#3a3a48] rounded-xl overflow-hidden">
          <div className="flex items-center gap-1 px-4 pt-3 border-b border-[#3a3a48]">
            {(['analysis', 'metadata', 'defects'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-2.5 text-[12px] font-medium capitalize transition-colors cursor-pointer ${
                  activeTab === tab
                    ? 'text-[#4a8fff] border-b-2 border-[#4a8fff] -mb-px'
                    : 'text-[#8888a0] hover:text-[#e0e0ea]'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="p-5">
            {activeTab === 'analysis' && (
              <div className="space-y-5">
                <div className="text-center py-2">
                  <p className={`text-[40px] font-bold ${statusColor}`}>{report.metrics.qualityScore.toFixed(1)}</p>
                  <p className="text-[12px] text-[#8888a0] mt-0.5">Overall Quality Score</p>
                </div>

                <div className="space-y-3">
                  <p className="text-[11px] font-mono tracking-wider text-[#8888a0] uppercase">Texture Recovery</p>
                  {[
                    { name: 'Surface', pct: report.metrics.surface, color: 'bg-[#00d97e]' },
                    { name: 'Edges', pct: report.metrics.edges, color: 'bg-[#4a8fff]' },
                    { name: 'Fine Detail', pct: report.metrics.fineDetail, color: 'bg-[#ff8c42]' },
                    { name: 'Noise Floor', pct: report.metrics.noiseFloor, color: 'bg-[#8888a0]' },
                  ].map((metric) => (
                    <div key={metric.name}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[12px] text-[#e0e0ea]">{metric.name}</span>
                        <span className="text-[11px] font-mono text-[#8888a0]">{metric.pct}%</span>
                      </div>
                      <div className="h-1.5 bg-[#22222a] rounded-full overflow-hidden">
                        <div className={`h-full ${metric.color} rounded-full transition-all duration-700`} style={{ width: `${metric.pct}%` }} />
                      </div>
                    </div>
                  ))}
                </div>

                <div>
                  <p className="text-[11px] font-mono tracking-wider text-[#8888a0] uppercase mb-2">Pixel Intensity</p>
                  <div className="flex items-end gap-0.5 h-20 px-1">
                    {[18, 28, 45, 58, 74, 88, 92, 80, 65, 48, 34, 24, 18, 12, 9, 6].map((height, index) => (
                      <div
                        key={index}
                        className="flex-1 bg-gradient-to-t from-[#4a8fff] to-[#6ba0ff] rounded-t-sm transition-all hover:from-[#5a9fff] hover:to-[#7bb0ff]"
                        style={{ height: `${height}%` }}
                      />
                    ))}
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-[9px] font-mono text-[#555568]">0</span>
                    <span className="text-[9px] font-mono text-[#555568]">255</span>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'metadata' && (
              <div className="space-y-2.5">
                {[
                  ['Scan ID', report.id],
                  ['File', report.filename],
                  ['Wafer ID', report.wafer],
                  ['Batch', report.batch],
                  ['Scan Mode', toTitleCase(report.scanMode)],
                  ['AI Model', report.model ?? '-'],
                  ['Device', report.device ?? '-'],
                  ['Duration', formatDuration(report.durationMs)],
                  ['Inference', report.inferenceMs ? `${report.inferenceMs} ms` : '-'],
                  ['Input', formatShape(report.inputShape)],
                  ['Output', formatShape(report.outputShape)],
                  ['Speed Cap', report.resizedForSpeed ? `${report.maxInputDimension}px` : 'Not applied'],
                ].map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between gap-3 py-2 px-3 rounded-lg bg-[#22222a] border border-[#2e2e3a]">
                    <span className="text-[12px] text-[#8888a0]">{key}</span>
                    <span className="text-[12px] font-mono text-[#e0e0ea] truncate">{value}</span>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'defects' && (
              <div className="text-center py-10">
                {report.defects === 0 ? (
                  <CheckCircle2 size={36} className="text-[#00d97e] mx-auto mb-3" />
                ) : (
                  <AlertTriangle size={36} className="text-[#ff8c42] mx-auto mb-3" />
                )}
                <p className="text-[14px] font-medium text-[#e0e0ea]">
                  {report.defects === 0 ? 'No defects detected' : `${report.defects} defect marker(s) require review`}
                </p>
                <p className="text-[12px] text-[#8888a0] mt-1">
                  Quality score {report.metrics.qualityScore.toFixed(1)} across {formatShape(report.outputShape)} restored output
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: Activity, label: 'PSNR', value: `${report.metrics.psnr.toFixed(1)} dB`, color: 'text-[#4a8fff]', bg: 'bg-[#4a8fff]/10' },
          { icon: BarChart3, label: 'SSIM', value: report.metrics.ssim.toFixed(3), color: 'text-[#00d97e]', bg: 'bg-[#00d97e]/10' },
          { icon: Layers, label: 'LPIPS', value: report.metrics.lpips.toFixed(3), color: 'text-[#ff8c42]', bg: 'bg-[#ff8c42]/10' },
          { icon: AlertTriangle, label: 'Defects', value: report.defects.toString(), color: 'text-[#8888a0]', bg: 'bg-[#8888a0]/10' },
        ].map((metric) => (
          <div key={metric.label} className="bg-[#2a2a34] border border-[#3a3a48] rounded-xl p-5">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${metric.bg}`}>
              <metric.icon size={18} className={metric.color} />
            </div>
            <p className="text-[24px] font-semibold text-[#f0f0f5]">{metric.value}</p>
            <p className="text-[12px] text-[#8888a0] mt-0.5">{metric.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
