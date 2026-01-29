import { Button } from '@/components/ui/button';
import { ArrowRight, CheckCircle2, Factory, HardDrive, Layers, Cpu, Zap, Activity, TrendingUp, XCircle } from 'lucide-react';
import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-white font-sans selection:bg-orange-100">
      {/* Background Grid Pattern */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
        <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-orange-500 opacity-20 blur-[100px]" />
      </div>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden z-10">
        <div className="max-w-[1400px] mx-auto px-6 sm:px-8 lg:px-12">
          <div className="lg:grid lg:grid-cols-12 lg:gap-20 items-center">
            <div className="lg:col-span-6 text-left">
              <div className="inline-flex items-center rounded-full px-4 py-1.5 text-sm font-medium text-orange-600 ring-1 ring-inset ring-orange-200 bg-orange-50/50 backdrop-blur-sm mb-10 transition-transform hover:scale-105 duration-300 cursor-default">
                The Physical AI Data Platform
              </div>
              <h1 className="text-6xl font-semibold tracking-tight text-gray-900 sm:text-7xl md:text-8xl leading-[0.95] mb-8">
                Real-world data for <span className="text-orange-600">real-world AI.</span>
              </h1>
              <p className="text-xl text-gray-600 leading-relaxed max-w-xl mb-12 font-light">
                ProData provides accurate, fresh, and production-ready datasets for Physical AI by collecting real-world data using proprietary hardware, automated pipelines, and direct access to environments.
              </p>
              <div className="flex flex-wrap gap-5">
                <Link href="/sign-up">
                  <Button className="rounded-full text-base font-medium px-10 py-7 h-auto bg-gray-900 hover:bg-gray-800 text-white shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
                    Start Collecting Data <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <Link href="/contact">
                  <Button variant="ghost" className="rounded-full text-base font-medium px-10 py-7 h-auto text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-all duration-300">
                    Talk to Sales
                  </Button>
                </Link>
              </div>
            </div>
            <div className="lg:col-span-6 mt-20 lg:mt-0 relative group perspective-1000">
              <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-white/20 bg-gray-50 transition-transform duration-500 group-hover:rotate-y-2 group-hover:rotate-x-2 transform-style-3d">
                <img
                  src="/hero-physical-ai.png"
                  alt="Physical AI Data Visualization"
                  className="w-full h-auto object-cover scale-105 group-hover:scale-110 transition-transform duration-700"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* The Problem Section */}
      <section className="py-32 bg-white relative z-10 border-t border-gray-100">
        <div className="max-w-[1400px] mx-auto px-6 sm:px-8 lg:px-12">
          <div className="max-w-3xl mb-20">
            <h2 className="text-orange-600 font-medium tracking-wider uppercase text-sm mb-4">The Problem</h2>
            <div className="text-4xl md:text-5xl font-semibold text-gray-900 tracking-tight leading-tight mb-6">
              Physical AI models fail because of data.
            </div>
            <p className="text-xl text-gray-500 font-light leading-relaxed max-w-2xl">
              For robotics, autonomy, and industrial AI, bad data means unusable models.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { title: "Synthetic data doesn't generalize", desc: "Simulations lack the chaos and noise of the real world." },
              { title: "Stale datasets", desc: "Open datasets don't reflect current, changing environments." },
              { title: "Messy sensor data", desc: "Unstructured logs take months to clean before training." },
              { title: "No real-world access", desc: "Developers lack access to factories and fields for collection." },
              { title: "Slow pipelines", desc: "Manual processing blocks iteration speed for months." },
            ].map((item, i) => (
              <div key={i} className="group p-8 rounded-2xl bg-gray-50/50 border border-transparent hover:border-orange-100 hover:bg-orange-50/30 transition-all duration-300 text-left">
                <XCircle className="w-8 h-8 text-orange-500 mb-6 opacity-80 group-hover:opacity-100 transition-opacity" strokeWidth={1.5} />
                <h3 className="text-xl font-medium text-gray-900 mb-3">{item.title}</h3>
                <p className="text-gray-500 leading-relaxed font-light">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Our Solution Section */}
      <section className="py-32 bg-white relative z-10 border-t border-gray-100">
        <div className="max-w-[1400px] mx-auto px-6 sm:px-8 lg:px-12">
          <div className="text-center max-w-3xl mx-auto mb-24">
            <h2 className="text-orange-600 font-medium tracking-wider uppercase text-sm mb-4">Our Solution</h2>
            <div className="text-4xl md:text-5xl font-semibold text-gray-900 tracking-tight leading-tight">
              The infrastructure layer for Physical AI.
            </div>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-12 relative">
            {/* Connecting Line (Desktop) */}
            <div className="hidden lg:block absolute top-[2.5rem] left-[10%] right-[10%] h-px bg-gradient-to-r from-transparent via-orange-200 to-transparent z-0" />

            {[
              { icon: Layers, title: "Collect", desc: "Real-world data from the field using proprietary hardware." },
              { icon: Cpu, title: "Automate", desc: "Automated acquisition pipelines and sensor sync." },
              { icon: CheckCircle2, title: "Process", desc: "Clean, structure, label, and version datasets automatically." },
              { icon: Zap, title: "Deliver", desc: "Training-ready data delivered fast to your models." },
            ].map((feature, i) => (
              <div key={i} className="relative z-10 bg-white pt-4 text-center group">
                <div className="w-20 h-20 mx-auto bg-white rounded-full border border-orange-100 shadow-sm flex items-center justify-center mb-8 group-hover:bg-orange-50 transition-colors duration-300">
                  <feature.icon className="h-8 w-8 text-orange-600" strokeWidth={1.5} />
                </div>
                <h3 className="text-2xl font-semibold text-gray-900 mb-4">{feature.title}</h3>
                <p className="text-gray-500 leading-relaxed px-4">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What Makes ProData Different */}
      <section className="py-32 bg-[#0A0A0B] text-white relative z-10 overflow-hidden">
        {/* Subtle dark pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:32px_32px] opacity-20" />

        <div className="max-w-[1400px] mx-auto px-6 sm:px-8 lg:px-12 relative">
          <div className="mb-24">
            <h2 className="text-4xl md:text-6xl font-semibold tracking-tight mb-6">
              What sets <span className="text-orange-500">ProData</span> apart.
            </h2>
            <p className="text-gray-400 text-xl font-light max-w-2xl">
              We don't just scrape the web. We build hardware, deploy to the edge, and capture ground truth.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-x-20 gap-y-16">
            <div className="space-y-16">
              {[
                {
                  icon: HardDrive,
                  color: "text-orange-500",
                  bg: "bg-orange-500/10",
                  title: "Proprietary Data-Collection Hardware",
                  desc: "We build purpose-designed hardware for Vision (RGB, depth), Motion, and Environmental sensing. This lets us capture high-signal, synchronized data—not generic logs."
                },
                {
                  icon: Factory,
                  color: "text-blue-400",
                  bg: "bg-blue-500/10",
                  title: "Access to Real-World Environments",
                  desc: "Direct access to factories, facilities, roads, and warehouses. We don't wait for customers to 'find data.' We have deployment-ready rigs and repeatable setups."
                }
              ].map((item, i) => (
                <div key={i} className="flex gap-8 group">
                  <div className={`flex-shrink-0 w-16 h-16 rounded-2xl ${item.bg} flex items-center justify-center`}>
                    <item.icon className={`h-8 w-8 ${item.color}`} strokeWidth={1.5} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-medium text-white mb-4 group-hover:text-orange-400 transition-colors">{item.title}</h3>
                    <p className="text-gray-400 leading-relaxed text-lg font-light">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-16">
              {[
                {
                  icon: Activity,
                  color: "text-purple-400",
                  bg: "bg-purple-500/10",
                  title: "Automated Acquisition & Prep",
                  desc: "End-to-end automation for sensor sync, metadata, alignment, and labeling. We turn months of cleaning into days of training."
                },
                {
                  icon: TrendingUp,
                  color: "text-green-400",
                  bg: "bg-green-500/10",
                  title: "Fresh, Accurate, Model-Ready",
                  desc: "Continuously updated datasets aligned with actual deployment conditions to improve model convergence and robustness."
                }
              ].map((item, i) => (
                <div key={i} className="flex gap-8 group">
                  <div className={`flex-shrink-0 w-16 h-16 rounded-2xl ${item.bg} flex items-center justify-center`}>
                    <item.icon className={`h-8 w-8 ${item.color}`} strokeWidth={1.5} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-medium text-white mb-4 group-hover:text-orange-400 transition-colors">{item.title}</h3>
                    <p className="text-gray-400 leading-relaxed text-lg font-light">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Who We Serve & Why Now */}
      <section className="py-32 bg-white relative z-10 border-t border-gray-100">
        <div className="max-w-[1400px] mx-auto px-6 sm:px-8 lg:px-12">
          <div className="grid lg:grid-cols-12 gap-20">
            <div className="lg:col-span-5">
              <h2 className="text-4xl font-semibold text-gray-900 mb-12 tracking-tight">Who We Serve</h2>
              <ul className="space-y-6">
                {[
                  "Robotics & Manipulation",
                  "Autonomous Systems",
                  "Industrial Automation",
                  "Edge AI & Embodied Intelligence",
                  "Simulation-to-Real Transfer",
                  "Safety-Critical AI Systems"
                ].map((item) => (
                  <li key={item} className="flex items-center text-xl text-gray-900 font-light group cursor-default">
                    <CheckCircle2 className="h-6 w-6 text-orange-600 mr-4 opacity-0 group-hover:opacity-100 transition-all -ml-10 group-hover:ml-0 duration-300" strokeWidth={2} />
                    <span className="group-hover:translate-x-2 transition-transform duration-300 border-b border-transparent group-hover:border-orange-200">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="lg:col-span-7">
              <div className="bg-orange-50 rounded-[2.5rem] p-12 lg:p-16 h-full border border-orange-100 relative overflow-hidden">
                <div className="relative z-10">
                  <h2 className="text-4xl font-semibold text-orange-900 mb-8 tracking-tight">Why Now?</h2>
                  <div className="space-y-8 text-xl text-orange-950/80 font-light leading-relaxed">
                    <p>
                      Physical AI is exploding, but models are advancing faster than real-world data pipelines.
                    </p>
                    <p>
                      Synthetic data alone is hitting limits. <strong className="font-semibold text-orange-900">Hardware + Data + Automation</strong> is the missing stack.
                    </p>
                    <p>
                      Everyone is building models. Almost no one is solving real-world data at scale.
                    </p>
                    <div className="pt-8">
                      <Link href="/sign-up">
                        <Button className="rounded-full bg-orange-900 text-white hover:bg-orange-800 px-10 py-7 text-lg shadow-lg hover:shadow-orange-900/20 transition-all duration-300">
                          Get Started Today
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
                {/* Decorative background circle */}
                <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-orange-200/40 rounded-full blur-3xl opacity-50" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer / Vision */}
      <footer className="bg-white border-t border-gray-100 pt-32 pb-16">
        <div className="max-w-[1400px] mx-auto px-6 sm:px-8 lg:px-12 text-center">
          <h2 className="text-5xl md:text-7xl font-semibold tracking-tighter mb-10 text-gray-900">
            From the field to the model.<br /><span className="text-gray-400">Done right.</span>
          </h2>
          <p className="text-2xl text-gray-500 font-light max-w-3xl mx-auto mb-16 leading-relaxed">
            The default data backbone for Physical AI—powering the next generation of robots, autonomous systems, and embodied intelligence.
          </p>
          <Link href="/sign-up">
            <Button className="rounded-full bg-orange-600 text-white hover:bg-orange-500 px-12 py-8 text-xl font-medium shadow-2xl hover:shadow-orange-500/30 transition-all duration-300 hover:-translate-y-1">
              Join ProData
            </Button>
          </Link>
          <div className="mt-32 pt-8 border-t border-gray-100 flex flex-col md:flex-row justify-between items-center text-sm text-gray-400 font-light">
            <div>© 2026 ProData Inc. All rights reserved.</div>
            <div className="flex gap-8 mt-4 md:mt-0">
              <span className="hover:text-gray-900 cursor-pointer transition-colors">Privacy</span>
              <span className="hover:text-gray-900 cursor-pointer transition-colors">Terms</span>
              <span className="hover:text-gray-900 cursor-pointer transition-colors">Twitter</span>
              <span className="hover:text-gray-900 cursor-pointer transition-colors">LinkedIn</span>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}