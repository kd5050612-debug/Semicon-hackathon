import { useEffect, useMemo, useState } from 'react';
import { Search, Filter, ChevronRight, CheckCircle2, AlertTriangle } from 'lucide-react';
import { getInspectionRecords, subscribeToInspectionRecords, type InspectionRecord } from '@/lib/inspectionStore';

type HistoryRow = {
  id: string;
  wafer: string;
  batch: string;
  defects: number;
  status: InspectionRecord['status'];
  time: string;
  mode: string;
  confidence: string;
  source: 'live' | 'sample';
};

const sampleRows: HistoryRow[] = [
  { id: 'IMG_2847', wafer: 'Wafer A-12', batch: 'Production A', defects: 0, status: 'Passed', time: '2m ago', mode: 'Standard', confidence: '99.2%', source: 'sample' },
  { id: 'IMG_2846', wafer: 'Wafer B-07', batch: 'Production A', defects: 2, status: 'Review', time: '8m ago', mode: 'Standard', confidence: '96.1%', source: 'sample' },
  { id: 'IMG_2845', wafer: 'Wafer A-12', batch: 'Production A', defects: 0, status: 'Passed', time: '15m ago', mode: 'Standard', confidence: '98.8%', source: 'sample' },
  { id: 'IMG_2844', wafer: 'Wafer C-03', batch: 'Production B', defects: 1, status: 'Review', time: '23m ago', mode: 'Deep', confidence: '98.7%', source: 'sample' },
  { id: 'IMG_2843', wafer: 'Wafer B-07', batch: 'Production A', defects: 0, status: 'Passed', time: '31m ago', mode: 'Rapid', confidence: '99.5%', source: 'sample' },
];

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

const recordToRow = (record: InspectionRecord): HistoryRow => ({
  id: record.id,
  wafer: record.wafer,
  batch: record.batch,
  defects: record.defects,
  status: record.status,
  time: formatRelativeTime(record.createdAt),
  mode: toTitleCase(record.scanMode),
  confidence: record.metrics.qualityScore > 0 ? `${record.metrics.qualityScore.toFixed(1)}%` : '-',
  source: 'live',
});

export default function History() {
  const [records, setRecords] = useState<InspectionRecord[]>(() => getInspectionRecords());
  const [query, setQuery] = useState('');

  useEffect(() => subscribeToInspectionRecords(() => setRecords(getInspectionRecords())), []);

  const rows = useMemo(() => {
    const liveRows = records.map(recordToRow);
    const allRows = liveRows.length > 0 ? liveRows : sampleRows;
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) return allRows;

    return allRows.filter((item) =>
      [item.id, item.wafer, item.batch, item.mode, item.status].some((value) => value.toLowerCase().includes(normalizedQuery)),
    );
  }, [records, query]);

  return (
    <div className="px-8 py-7 space-y-6">
      <div>
        <h1 className="text-[24px] font-bold text-[#f0f0f5] tracking-tight">Inspection History</h1>
        <p className="text-[13px] text-[#8888a0] mt-0.5">Browse and search completed restoration runs</p>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#555568]" />
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by ID, wafer, or batch..."
            className="w-full bg-[#22222a] border border-[#3a3a48] rounded-lg pl-9 pr-3 py-2.5 text-[13px] text-[#e0e0ea] placeholder:text-[#555568] focus:outline-none focus:border-[#4a8fff] transition-colors"
          />
        </div>
        <button className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-[#22222a] border border-[#3a3a48] text-[13px] text-[#e0e0ea] hover:border-[#4a8fff] transition-colors cursor-pointer">
          <Filter size={15} />
          Filter
        </button>
      </div>

      <div className="bg-[#2a2a34] border border-[#3a3a48] rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#3a3a48] text-left">
              {['Image ID', 'Wafer', 'Batch', 'Mode', 'Defects', 'Status', 'Confidence', 'Time', ''].map((heading) => (
                <th key={heading} className="px-5 py-3 text-[10px] font-mono font-medium text-[#555568] uppercase tracking-wider">{heading}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((item) => (
              <tr key={`${item.source}-${item.id}`} className="border-b border-[#2e2e3a] hover:bg-[#32323e] transition-colors cursor-pointer group">
                <td className="px-5 py-3.5 text-[13px] font-mono text-[#e0e0ea]">{item.id}</td>
                <td className="px-5 py-3.5 text-[13px] text-[#e0e0ea]">{item.wafer}</td>
                <td className="px-5 py-3.5 text-[13px] text-[#8888a0]">{item.batch}</td>
                <td className="px-5 py-3.5 text-[13px] text-[#8888a0]">{item.mode}</td>
                <td className="px-5 py-3.5 text-[13px] font-mono text-[#e0e0ea]">{item.defects}</td>
                <td className="px-5 py-3.5">
                  <span className={`inline-flex items-center gap-1.5 text-[12px] font-medium ${
                    item.status === 'Passed' ? 'text-[#00d97e]' :
                    item.status === 'Review' ? 'text-[#ff8c42]' : 'text-[#ff4d4d]'
                  }`}>
                    {item.status === 'Passed' ? <CheckCircle2 size={13} /> : <AlertTriangle size={13} />}
                    {item.status}
                  </span>
                </td>
                <td className="px-5 py-3.5 text-[13px] font-mono text-[#e0e0ea]">{item.confidence}</td>
                <td className="px-5 py-3.5 text-[12px] text-[#8888a0]">{item.time}</td>
                <td className="px-5 py-3.5">
                  <ChevronRight size={16} className="text-[#555568] group-hover:text-[#4a8fff] transition-colors" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {rows.length === 0 && (
          <div className="px-5 py-10 text-center">
            <p className="text-[13px] text-[#8888a0]">No inspections match the current search.</p>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <p className="text-[12px] text-[#8888a0]">
          Showing {rows.length} of {records.length > 0 ? records.length : sampleRows.length} inspections
        </p>
        <div className="flex items-center gap-2">
          <button className="px-3 py-1.5 rounded-lg bg-[#22222a] border border-[#3a3a48] text-[12px] text-[#8888a0] hover:text-[#e0e0ea] hover:border-[#4a8fff] transition-colors cursor-pointer">Previous</button>
          <button className="px-3 py-1.5 rounded-lg bg-[#4a8fff] text-white text-[12px] font-medium cursor-pointer">1</button>
          <button className="px-3 py-1.5 rounded-lg bg-[#22222a] border border-[#3a3a48] text-[12px] text-[#8888a0] hover:text-[#e0e0ea] hover:border-[#4a8fff] transition-colors cursor-pointer">Next</button>
        </div>
      </div>
    </div>
  );
}
