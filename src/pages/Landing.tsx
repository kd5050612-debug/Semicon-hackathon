import { ArrowRight, ScanLine, Brain, BarChart3, ShieldCheck, Zap, Globe, Activity, Sparkles } from 'lucide-react';
import type { Page } from '@/types';

interface LandingProps {
  onEnter: (page: Page) => void;
}

const [heroVideoSrc] = Object.values(
  import.meta.glob('../../Video/*.mp4', {
    eager: true,
    query: '?url',
    import: 'default',
  })
) as string[];

const BLOOM_VIDEO_URL =
  'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260315_073750_51473149-4350-4920-ae24-c8214286f323.mp4';

export default function Landing({ onEnter }: LandingProps) {
  return (
    <div className="relative min-h-screen bg-[#1a1a1f] text-[#f0f0f5] overflow-x-hidden">
{/* Full-screen looping video background (z-0) */}
      <div className="fixed inset-0 z-0">
<video
          className="w-full h-full object-cover"
          src={BLOOM_VIDEO_URL}
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          aria-label="Bloom background video"
        >
          Your browser does not support the video tag.
        </video>
        {/* Subtle dark overlay for text legibility */}
        <div className="absolute inset-0 bg-[#0a0a0f]/40" />
      </div>

      {/* Floating content (z-10) */}
      <div className="relative z-10">
        {/* Nav */}
        <nav className="liquid-glass-strong flex items-center justify-between px-8 h-[56px] rounded-2xl mx-4 mt-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-sm overflow-hidden border border-white/10">
              <img src="/images/Image_1.jpeg" alt="Semantic" className="w-full h-full object-cover" />
            </div>
            <span className="text-[15px] font-bold tracking-[0.15em] uppercase">SEMANTIC</span>
          </div>
          <div className="flex items-center gap-6">
            <span className="text-[11px] font-mono tracking-[0.12em] text-[#8888a0] hidden sm:block">
              SYSTEM HEALTH: <span className="text-[#00d97e] animate-glow-pulse">OPTIMAL</span>
            </span>
            <button
              onClick={() => onEnter('command-center')}
              className="flex items-center gap-2 px-5 py-2 rounded-lg bg-white/15 hover:bg-white/25 text-white text-[13px] font-medium transition-all duration-150 hover:scale-105 active:scale-95 cursor-pointer"
            >
              Enter Platform
              <ArrowRight size={15} className="animate-icon-spin" />
            </button>
          </div>
        </nav>

        {/* Hero */}
        <section className="max-w-5xl mx-auto px-8 pt-20 pb-16 text-center">
          <div className="liquid-glass inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00d97e] animate-pulse-dot" />
            <span className="text-[11px] font-mono text-white/80 tracking-[0.12em]">AI-POWERED SEMICONDUCTOR IMAGE RESTORATION</span>
          </div>
          <h1 className="text-[48px] md:text-[64px] font-bold tracking-tight leading-[1.05] animate-fade-in-up">
            See what others
            <br />
            <span className="bg-gradient-to-r from-white via-white/80 to-white bg-clip-text text-transparent">can't see.</span>
          </h1>
          <p className="text-[17px] text-[#8888a0] mt-6 max-w-2xl mx-auto leading-relaxed">
            Semantic restores noisy SEM captures into crystal-clear, pixel-accurate images â€” and automatically flags defects before they reach production.
          </p>
          <div className="flex items-center justify-center gap-3 mt-8">
            <button
              onClick={() => onEnter('new-inspection')}
              className="liquid-glass-strong flex items-center gap-2 px-6 py-3 rounded-full text-white text-[14px] font-medium transition-all duration-150 hover:scale-105 active:scale-95 cursor-pointer"
            >
              Start New Inspection
              <ArrowRight size={16} />
            </button>
            <button
              onClick={() => onEnter('command-center')}
              className="liquid-glass flex items-center gap-2 px-6 py-3 rounded-full text-white text-[14px] font-medium transition-all duration-150 hover:scale-105 active:scale-95 cursor-pointer"
            >
              View Dashboard
              <Sparkles size={16} />
            </button>
          </div>

          {/* Hero video preview */}
          <div className="mt-12 max-w-3xl mx-auto">
            <div className="liquid-glass-strong relative aspect-video rounded-xl overflow-hidden shadow-2xl shadow-black/30">
<video
                src={heroVideoSrc}
                className="w-full h-full object-cover"
                autoPlay
                loop
                muted
                playsInline
                preload="auto"
                aria-label="Semiconductor inspection visualization"
              >
                Your browser does not support the video tag.
              </video>
            </div>
          </div>
        </section>

        {/* Feature cards */}
        <section className="max-w-6xl mx-auto px-8 pb-24">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              { icon: ScanLine, title: 'AI Restoration', desc: 'Deep-learning models denoise and upscale raw SEM captures to 8K resolution with sub-nanometer accuracy.' },
              { icon: Brain, title: 'Defect Detection', desc: 'Semantic segmentation identifies micro-defects, cracks, and contamination with 99.2% confidence.' },
              { icon: BarChart3, title: 'Quality Analytics', desc: 'Trends, wafer maps, and batch comparisons surface yield issues before they cascade.' },
              { icon: ShieldCheck, title: 'Audit Ready', desc: 'Every scan is logged with operator, timestamp, and model version for full traceability.' },
              { icon: Zap, title: 'Real-Time Scans', desc: 'Standard scans complete in under 5 minutes â€” no overnight queueing required.' },
              { icon: Globe, title: 'Cloud Sync', desc: 'Inspections sync to your secure cloud workspace and stream to team dashboards live.' },
            ].map((f, i) => (
              <div
                key={f.title}
                className="liquid-glass rounded-xl p-6 hover:bg-white/5 transition-all duration-150 hover:scale-105"
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                <div className="liquid-glass w-11 h-11 rounded-lg flex items-center justify-center mb-4">
                  <f.icon size={20} className="text-white/80 animate-float" />
                </div>
                <h3 className="text-[16px] font-semibold text-[#f0f0f5] mb-2">{f.title}</h3>
                <p className="text-[14px] text-[#8888a0] leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Performance strip */}
        <section className="max-w-6xl mx-auto px-8 pb-16">
          <div className="liquid-glass rounded-xl p-6">
            <div className="flex items-center gap-2 mb-5">
              <Activity size={16} className="text-[#00d97e] animate-glow-pulse" />
              <span className="text-[13px] font-medium text-[#e0e0ea]">Platform Performance</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Throughput', value: '342 img/hr' },
                { label: 'GPU Utilization', value: '67%' },
                { label: 'Uptime', value: '99.97%' },
                { label: 'Model Version', value: 'v3.2.1' },
              ].map((m) => (
                <div key={m.label} className="liquid-glass rounded-lg p-4">
                  <p className="text-[20px] font-semibold text-[#f0f0f5]">{m.value}</p>
                  <p className="text-[12px] text-[#8888a0] mt-0.5">{m.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-white/10 px-8 py-6">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <p className="text-[11px] text-[#555568] font-mono tracking-wider">SEMANTIC v3.2.1 Â· BUILD 20260805</p>
            <p className="text-[11px] text-[#555568]">Â© 2026 Semantic AI Systems</p>
          </div>
        </footer>
      </div>
    </div>
  );
}
