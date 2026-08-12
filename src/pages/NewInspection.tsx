import { useRef, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Cpu,
  Download,
  FileImage,
  Image as ImageIcon,
  Layers,
  Loader2,
  Play,
  UploadCloud,
  X,
  Zap,
} from 'lucide-react';
import { addInspectionRecords, createInspectionRecords } from '@/lib/inspectionStore';
import { restoreBatch, type RestoreErrorResult, type RestoreResult, type ScanMode } from '@/lib/modelApi';

type QueuedFile = {
  id: string;
  file: File;
  name: string;
  size: string;
  previewUrl?: string;
};

const isRestoreResult = (result: RestoreResult | RestoreErrorResult): result is RestoreResult =>
  'restored_image' in result;

const formatSize = (size: number) =>
  size > 1e6 ? `${(size / 1e6).toFixed(1)} MB` : `${Math.max(1, size / 1e3).toFixed(0)} KB`;

export default function NewInspection() {
  const [dragActive, setDragActive] = useState(false);
  const [files, setFiles] = useState<QueuedFile[]>([]);
  const [scanMode, setScanMode] = useState<ScanMode>('standard');
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<Array<RestoreResult | RestoreErrorResult>>([]);
  const [error, setError] = useState<string | null>(null);
  const [scanName, setScanName] = useState('');
  const [waferId, setWaferId] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const successfulResults = results.filter(isRestoreResult);
  const failedResults = results.filter((result): result is RestoreErrorResult => !isRestoreResult(result));
  const selectedResult = successfulResults[0];
  const selectedPreview = files.find((file) => file.previewUrl)?.previewUrl;

  const mapFiles = (list: FileList | null): QueuedFile[] =>
    Array.from(list ?? []).map((file) => ({
      id: `${file.name}-${file.lastModified}-${file.size}-${crypto.randomUUID()}`,
      file,
      name: file.name,
      size: formatSize(file.size),
      previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
    }));

  const addFiles = (list: FileList | null) => {
    const incoming = mapFiles(list);
    if (incoming.length === 0) return;
    setFiles((prev) => [...prev, ...incoming]);
    setResults([]);
    setError(null);
  };

  const revokePreview = (file: QueuedFile) => {
    if (file.previewUrl) URL.revokeObjectURL(file.previewUrl);
  };

  const clearFiles = () => {
    files.forEach(revokePreview);
    setFiles([]);
    setResults([]);
    setError(null);
    setProgress(0);
  };

  const removeFile = (id: string) => {
    setFiles((prev) => {
      const target = prev.find((file) => file.id === id);
      if (target) revokePreview(target);
      return prev.filter((file) => file.id !== id);
    });
    setResults([]);
    setError(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    addFiles(e.dataTransfer.files);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    addFiles(e.target.files);
    e.target.value = '';
  };

  const openFilePicker = () => {
    fileInputRef.current?.click();
  };

  const startScan = async () => {
    if (files.length === 0 || scanning) return;

    setScanning(true);
    setProgress(8);
    setError(null);
    setResults([]);
    const startedAt = Date.now();

    const interval = window.setInterval(() => {
      setProgress((current) => Math.min(92, current + (current < 50 ? 7 : 3)));
    }, 250);

    try {
      const response = await restoreBatch(
        files.map((queuedFile) => queuedFile.file),
        scanMode,
      );
      const successful = response.results.filter(isRestoreResult);
      const failed = response.results.filter((result) => !isRestoreResult(result));

      setResults(response.results);
      setProgress(100);

      if (response.results.length > 0) {
        addInspectionRecords(
          createInspectionRecords({
            results: response.results,
            scanMode,
            scanName,
            wafer: waferId,
            durationMs: Date.now() - startedAt,
          }),
        );
      }

      if (successful.length === 0) {
        const message = failed[0] && 'error' in failed[0] ? failed[0].error : 'Model did not return a restored image.';
        setError(message);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not reach the model backend.');
      setProgress(0);
    } finally {
      window.clearInterval(interval);
      setScanning(false);
    }
  };

  const progressLabel =
    progress < 25 ? 'Uploading assets' : progress < 75 ? 'Running SRCNN restoration' : 'Encoding restored outputs';

  return (
    <div className="px-8 py-7 space-y-6">
      <div>
        <h1 className="text-[24px] font-bold text-[#f0f0f5] tracking-tight">Initialize Scan</h1>
        <p className="text-[13px] text-[#8888a0] mt-0.5">Upload SEM captures and run the trained restoration model</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,.tiff,.tif,.png,.jpg,.jpeg,.npy"
            className="hidden"
            onChange={handleFileChange}
          />

          <div
            onClick={openFilePicker}
            onDragOver={(e) => {
              e.preventDefault();
              setDragActive(true);
            }}
            onDragEnter={(e) => {
              e.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-xl p-12 text-center transition-all duration-200 cursor-pointer min-h-[280px] flex flex-col items-center justify-center ${
              dragActive ? 'border-[#4a8fff] bg-[#4a8fff]/5' : 'border-[#3a3a48] bg-[#2a2a34] hover:border-[#4a8fff]/50'
            }`}
          >
            <div className="w-14 h-14 rounded-full bg-[#4a8fff]/10 flex items-center justify-center mb-4">
              <UploadCloud size={26} className="text-[#4a8fff]" />
            </div>
            <p className="text-[15px] font-medium text-[#e0e0ea]">Drop SEM images here</p>
            <p className="text-[13px] text-[#8888a0] mt-1">TIFF, PNG, JPEG, or NumPy .npy arrays</p>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                openFilePicker();
              }}
              className="mt-4 px-4 py-2 rounded-lg bg-[#22222a] border border-[#3a3a48] text-[12px] font-mono tracking-wider text-[#4a8fff] hover:border-[#4a8fff] transition-colors cursor-pointer"
            >
              BROWSE LOCAL FILES
            </button>
          </div>

          {files.length > 0 && (
            <div className="bg-[#2a2a34] border border-[#3a3a48] rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[14px] font-medium text-[#e0e0ea]">Queued Files ({files.length})</h3>
                <button onClick={clearFiles} className="text-[12px] text-[#8888a0] hover:text-[#ff4d4d] transition-colors cursor-pointer">
                  Clear all
                </button>
              </div>
              <div className="space-y-2">
                {files.map((file) => {
                  const result = results.find((item) => item.filename === file.name);
                  const restored = result && isRestoreResult(result);
                  const failed = result && !isRestoreResult(result);

                  return (
                    <div key={file.id} className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-[#22222a] border border-[#2e2e3a]">
                      <div className="flex items-center gap-3 min-w-0">
                        <FileImage size={16} className="text-[#4a8fff] shrink-0" />
                        <span className="text-[13px] text-[#e0e0ea] font-mono truncate">{file.name}</span>
                        <span className="text-[11px] text-[#555568] font-mono shrink-0">{file.size}</span>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        {restored && (
                          <span className="flex items-center gap-1 text-[11px] text-[#00d97e]">
                            <CheckCircle2 size={13} />
                            Restored
                          </span>
                        )}
                        {failed && (
                          <span className="flex items-center gap-1 text-[11px] text-[#ff4d4d]">
                            <AlertTriangle size={13} />
                            Failed
                          </span>
                        )}
                        <button onClick={() => removeFile(file.id)} className="text-[#8888a0] hover:text-[#ff4d4d] transition-colors cursor-pointer">
                          <X size={15} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {(scanning || progress === 100) && (
            <div className="bg-[#2a2a34] border border-[#3a3a48] rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                {scanning ? (
                  <Loader2 size={20} className="text-[#4a8fff] animate-spin" />
                ) : (
                  <CheckCircle2 size={20} className="text-[#00d97e]" />
                )}
                <span className="text-[14px] font-medium text-[#e0e0ea]">
                  {scanning ? progressLabel : 'Restoration complete'}
                </span>
              </div>
              <div className="h-2 bg-[#22222a] rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-[#4a8fff] to-[#6ba0ff] rounded-full transition-all duration-150" style={{ width: `${progress}%` }} />
              </div>
              <p className="text-[12px] font-mono text-[#8888a0] mt-2">{progress}% - Model backend connected</p>
            </div>
          )}

          {error && (
            <div className="bg-[#2a2a34] border border-[#ff4d4d]/40 rounded-xl p-5">
              <div className="flex items-start gap-3">
                <AlertTriangle size={18} className="text-[#ff4d4d] mt-0.5" />
                <div>
                  <h3 className="text-[14px] font-medium text-[#f0f0f5]">Backend Error</h3>
                  <p className="text-[12px] text-[#ffb4ab] mt-1">{error}</p>
                </div>
              </div>
            </div>
          )}

          {successfulResults.length > 0 && (
            <div className="bg-[#2a2a34] border border-[#3a3a48] rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-[14px] font-medium text-[#e0e0ea]">Restored Outputs</h3>
                  <p className="text-[12px] text-[#8888a0] mt-0.5">
                    {successfulResults.length} restored, {failedResults.length} failed
                  </p>
                </div>
                <span className="text-[11px] font-mono text-[#555568]">SRCNN_BASELINE</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {successfulResults.map((result) => (
                  <div key={result.filename} className="bg-[#22222a] border border-[#2e2e3a] rounded-lg overflow-hidden">
                    <div className="grid grid-cols-2 bg-[#131315]">
                      <img src={result.source_image} alt={`${result.filename} source`} className="w-full aspect-square object-contain border-r border-[#2e2e3a]" />
                      <img src={result.restored_image} alt={`${result.filename} restored`} className="w-full aspect-square object-contain" />
                    </div>
                    <div className="flex items-center justify-between gap-3 p-3">
                      <div className="min-w-0">
                        <p className="text-[12px] font-mono text-[#e0e0ea] truncate">{result.filename}</p>
                        <p className="text-[11px] text-[#8888a0]">
                          {result.input_shape.join('x')} to {result.output_shape.join('x')} on {result.device}
                        </p>
                        <p className="text-[10px] text-[#555568]">
                          {result.inference_ms ? `${result.inference_ms} ms inference` : 'Inference complete'}
                          {result.resized_for_speed ? ` - capped at ${result.max_input_dimension}px` : ''}
                        </p>
                      </div>
                      <a
                        href={result.restored_image}
                        download={`${result.filename.replace(/\.[^.]+$/, '')}_restored.png`}
                        className="w-9 h-9 rounded-lg bg-[#4a8fff]/10 border border-[#4a8fff]/30 text-[#4a8fff] flex items-center justify-center hover:bg-[#4a8fff]/20 transition-colors"
                      >
                        <Download size={16} />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-[#2a2a34] border border-[#3a3a48] rounded-xl p-5">
            <h3 className="text-[14px] font-medium text-[#e0e0ea] mb-3">Deploy Telemetry Data</h3>
            <div className="grid grid-cols-3 gap-3">
              {[
                { icon: ImageIcon, label: 'Images', value: files.length.toString() },
                { icon: Cpu, label: 'Model', value: selectedResult ? selectedResult.model : 'SRCNN' },
                { icon: Zap, label: 'Status', value: scanning ? 'Live' : successfulResults.length > 0 ? 'Done' : 'Idle' },
              ].map((item) => (
                <div key={item.label} className="bg-[#22222a] border border-[#2e2e3a] rounded-lg p-3 text-center min-w-0">
                  <item.icon size={16} className="text-[#4a8fff] mx-auto mb-1.5" />
                  <p className="text-[16px] font-semibold text-[#e0e0ea] truncate">{item.value}</p>
                  <p className="text-[11px] text-[#8888a0]">{item.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-[#2a2a34] border border-[#3a3a48] rounded-xl p-6 space-y-5">
          <div>
            <h3 className="text-[15px] font-semibold text-[#f0f0f5]">Asset Inspector</h3>
            <p className="text-[12px] text-[#8888a0] mt-0.5">Scan configuration</p>
          </div>

          <div className="aspect-square rounded-lg bg-[#22222a] border border-[#2e2e3a] overflow-hidden flex items-center justify-center">
            {selectedResult ? (
              <div className="grid grid-cols-2 w-full h-full">
                <img src={selectedResult.source_image} alt="Source preview" className="w-full h-full object-contain border-r border-[#2e2e3a]" />
                <img src={selectedResult.restored_image} alt="Restored preview" className="w-full h-full object-contain" />
              </div>
            ) : selectedPreview ? (
              <img src={selectedPreview} alt="Queued preview" className="w-full h-full object-contain" />
            ) : files.length > 0 ? (
              <div className="text-center">
                <Layers size={28} className="text-[#4a8fff] mx-auto mb-2" />
                <p className="text-[11px] font-mono text-[#8888a0]">{files.length} file(s) queued</p>
              </div>
            ) : (
              <div className="text-center">
                <ImageIcon size={28} className="text-[#555568] mx-auto mb-2" />
                <p className="text-[11px] font-mono text-[#555568]">No asset selected</p>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-[11px] font-mono tracking-wider text-[#8888a0] uppercase mb-1.5 block">Scan Name</label>
              <input
                value={scanName}
                onChange={(event) => setScanName(event.target.value)}
                placeholder="Production Batch A"
                className="w-full bg-[#22222a] border border-[#3a3a48] rounded-lg px-3 py-2.5 text-[13px] text-[#e0e0ea] placeholder:text-[#555568] focus:outline-none focus:border-[#4a8fff] transition-colors"
              />
            </div>
            <div>
              <label className="text-[11px] font-mono tracking-wider text-[#8888a0] uppercase mb-1.5 block">Wafer ID</label>
              <input
                value={waferId}
                onChange={(event) => setWaferId(event.target.value)}
                placeholder="WAF-2026-0147"
                className="w-full bg-[#22222a] border border-[#3a3a48] rounded-lg px-3 py-2.5 text-[13px] text-[#e0e0ea] placeholder:text-[#555568] focus:outline-none focus:border-[#4a8fff] transition-colors"
              />
            </div>
            <div>
              <label className="text-[11px] font-mono tracking-wider text-[#8888a0] uppercase mb-2 block">Scan Mode</label>
              <div className="space-y-2">
                {[
                  { id: 'rapid' as const, label: 'Rapid', desc: 'Fast preview - 384px input cap' },
                  { id: 'standard' as const, label: 'Standard', desc: 'Balanced pass - 512px input cap' },
                  { id: 'deep' as const, label: 'Deep Analysis', desc: 'Detail pass - 768px input cap' },
                ].map((mode) => (
                  <button
                    key={mode.id}
                    onClick={() => setScanMode(mode.id)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg border transition-all cursor-pointer ${
                      scanMode === mode.id
                        ? 'border-[#4a8fff] bg-[#4a8fff]/10'
                        : 'border-[#3a3a48] bg-[#22222a] hover:border-[#4a4a5a]'
                    }`}
                  >
                    <p className="text-[13px] font-medium text-[#e0e0ea]">{mode.label}</p>
                    <p className="text-[11px] text-[#8888a0] mt-0.5">{mode.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button
            onClick={startScan}
            disabled={scanning || files.length === 0}
            className="w-full flex items-center justify-center gap-2 bg-[#4a8fff] hover:bg-[#5a9fff] disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium text-[13px] tracking-wider py-3 rounded-lg transition-colors cursor-pointer"
          >
            {scanning ? <Loader2 size={15} className="animate-spin" /> : <Play size={15} />}
            {scanning ? 'RESTORING...' : 'INITIALIZE SCAN'}
          </button>
        </div>
      </div>
    </div>
  );
}
