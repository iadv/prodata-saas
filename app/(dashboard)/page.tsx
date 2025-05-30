import { Button } from '@/components/ui/button';
import { ArrowRight, CreditCard, Database, Sparkles } from 'lucide-react';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 sm:py-32">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,139,0,0.1),transparent)]" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="lg:grid lg:grid-cols-12 lg:gap-x-16 lg:items-center">
            <div className="col-span-6 max-w-2xl lg:max-w-none">
              <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl lg:text-6xl">
                Unlock the Answers Hiding in Your Operations Data
                <span className="block mt-2 text-orange-500">Your Data Knows Why — If You Can Decode It.</span>
              </h1>
              <p className="mt-6 text-lg leading-8 text-gray-600">
                Factory teams are flooded with production data, quality logs, maintenance systems, and ERP exports — but can't answer why performance dips or downtime happens.
                Prodata connects the dots and delivers detailed, root-cause reports automatically — no BI dashboard guesswork, no manual wrangling.
              </p>
              <div className="mt-10 flex items-center gap-x-6">
                <a
                  href="https://www.getprodata.com/sign-up"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button className="bg-orange-500 hover:bg-orange-600 text-white rounded-full text-lg px-8 py-6 inline-flex items-center justify-center shadow-lg hover:shadow-xl transition-all duration-200">
                    Try it now
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </a>
              </div>
            </div>
            <div className="col-span-6 mt-16 lg:mt-0">
              <div className="relative w-full h-auto rounded-2xl bg-gray-50 shadow-2xl overflow-hidden">
                <img 
                  src="/presentation6.gif"
                  alt="Data presentation animation"
                  className="w-full h-auto object-contain"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-3">
            <div className="relative">
              <div className="absolute -inset-x-2 -inset-y-4 z-0 bg-orange-50/50 rounded-3xl transform rotate-1 lg:rotate-2" />
              <div className="relative">
                <div className="inline-flex items-center justify-center p-3 bg-orange-100 rounded-2xl">
                  <Sparkles className="h-6 w-6 text-orange-600" />
                </div>
                <h2 className="mt-6 text-xl font-semibold text-gray-900">
                  Real Root-Cause Reporting, Not Just Dashboards
                </h2>
                <p className="mt-4 text-base text-gray-600 leading-relaxed">
                  Most tools give you KPIs. We give you explanations.
                  Prodata's AI agent analyzes structured data across machines, lines, and shifts to generate detailed reports — explaining why performance changed, not just what changed.
                </p>
              </div>
            </div>

            <div className="relative">
              <div className="absolute -inset-x-2 -inset-y-4 z-0 bg-orange-50/50 rounded-3xl transform -rotate-1" />
              <div className="relative">
                <div className="inline-flex items-center justify-center p-3 bg-orange-100 rounded-2xl">
                  <Database className="h-6 w-6 text-orange-600" />
                </div>
                <h2 className="mt-6 text-xl font-semibold text-gray-900">
                  Hours Back, Every Week
                </h2>
                <p className="mt-4 text-base text-gray-600 leading-relaxed">
                  Manual Excel exports. Endless meetings. "Gut-feel" conclusions. Sound familiar?
                  We automate anomaly detection, reporting, and shift-based comparisons so your engineers and supervisors focus on fixing problems — not formatting spreadsheets.
                </p>
              </div>
            </div>

            <div className="relative">
              <div className="absolute -inset-x-2 -inset-y-4 z-0 bg-orange-50/50 rounded-3xl transform rotate-1 lg:-rotate-2" />
              <div className="relative">
                <div className="inline-flex items-center justify-center p-3 bg-orange-100 rounded-2xl">
                  <CreditCard className="h-6 w-6 text-orange-600" />
                </div>
                <h2 className="mt-6 text-xl font-semibold text-gray-900">
                  Works With Your Stack — And Your Reality
                </h2>
                <p className="mt-4 text-base text-gray-600 leading-relaxed">
                  Whether your data sits in SAP, MES, quality systems, or SQL tables — we work with it directly.
                  On-prem, hybrid, or cloud — Prodata plugs in securely and configures around your workflows, not the other way around.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Differentiator Section */}
      <section className="py-24 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="lg:grid lg:grid-cols-2 lg:gap-12 lg:items-center">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">
                What Sets Prodata Apart
              </h2>
              <div className="mt-6 space-y-6">
                <p className="text-lg text-gray-600 leading-relaxed">
                  Unlike AI tools that summarize dashboards or guess based on text, Prodata can handle multiple sources of real structured data: production logs, line-by-line output, temperature profiles, sensor traces, and more — generating detailed, multi-layered reports trusted by engineers and ops managers alike.
                </p>
                <p className="text-lg text-gray-600 leading-relaxed">
                  Other platforms show "green/red" charts. We show you why line 3 dropped yield by 7% last week, and what made it bounce back yesterday.
                </p>
              </div>
            </div>
            <div className="mt-12 lg:mt-0">
              <div className="relative rounded-2xl bg-orange-50 p-8">
                <div className="absolute inset-0 bg-gradient-to-r from-orange-500/5 to-orange-500/30 rounded-2xl transform -rotate-1" />
                <div className="relative">
                  <h3 className="text-2xl font-semibold text-gray-900">
                    Ready to Take the Guesswork Out of Your Ops?
                  </h3>
                  <p className="mt-4 text-lg text-gray-600">
                    Talk to your data like an engineer — get the root cause, not just a KPI.
                  </p>
                  <div className="mt-8">
                    <a
                      href="https://www.getprodata.com/sign-up"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button className="bg-orange-500 hover:bg-orange-600 text-white rounded-full text-lg px-8 py-6 inline-flex items-center justify-center shadow-lg hover:shadow-xl transition-all duration-200">
                        Get Started
                        <ArrowRight className="ml-2 h-5 w-5" />
                      </Button>
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}