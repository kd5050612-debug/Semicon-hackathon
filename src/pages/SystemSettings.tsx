import { Cpu, Bell, Shield, Database, Monitor, ChevronRight } from 'lucide-react';

export default function SystemSettings() {
  const sections = [
    { icon: Cpu, title: 'AI Model Configuration', desc: 'Model version, confidence thresholds, and inference settings', value: 'Semantic v3.2.1' },
    { icon: Monitor, title: 'SEM Hardware', desc: 'Camera calibration, beam parameters, and stage control', value: 'GeminiSEM 560' },
    { icon: Database, title: 'Storage & Retention', desc: 'Data retention policies, backup schedules, and cloud sync', value: '30 days' },
    { icon: Bell, title: 'Notifications', desc: 'Alert preferences, email digests, and webhook integrations', value: '3 channels' },
    { icon: Shield, title: 'Security & Access', desc: 'User roles, API keys, and audit log configuration', value: '8 users' },
  ];

  return (
    <div className="px-8 py-7 space-y-6">
      <div>
        <h1 className="text-[24px] font-bold text-[#f0f0f5] tracking-tight">System Settings</h1>
        <p className="text-[13px] text-[#8888a0] mt-0.5">Configure hardware, models, and access control</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {sections.map((s) => (
          <div key={s.title} className="bg-[#2a2a34] border border-[#3a3a48] rounded-xl p-5 hover:border-[#4a8fff]/40 transition-colors cursor-pointer group">
            <div className="flex items-start gap-4">
              <div className="w-11 h-11 rounded-lg bg-[#4a8fff]/10 flex items-center justify-center flex-shrink-0">
                <s.icon size={20} className="text-[#4a8fff]" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h3 className="text-[15px] font-semibold text-[#f0f0f5]">{s.title}</h3>
                  <ChevronRight size={18} className="text-[#555568] group-hover:text-[#4a8fff] transition-colors" />
                </div>
                <p className="text-[13px] text-[#8888a0] mt-1">{s.desc}</p>
                <p className="text-[12px] font-mono text-[#4a8fff] mt-2">{s.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
