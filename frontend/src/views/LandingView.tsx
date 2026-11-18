import React, { useState } from 'react';
import {
  Droplets,
  CloudRain,
  Droplet,
  Waves,
  TrendingUp,
  AlertTriangle,
  Lightbulb,
  ShieldCheck,
  Cpu,
  BarChart2,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  DollarSign,
  Gauge,
  Layers,
  ChevronRight,
  Radio,
  FileSpreadsheet,
  Download,
  Play,
  CloudSun,
  Award,
  Globe2,
  Leaf,
  Activity,
  Sliders,
  Database,
  Building2,
  Sprout,
  BookOpen,
  ArrowUpRight,
  Clock,
  Compass,
  FileText,
  Search,
  ExternalLink,
  Zap
} from 'lucide-react';

interface Props {
  onExploreApp: (role: 'resident' | 'utility_admin') => void;
  onOpenSimulator: () => void;
  onNavigate?: (view: string) => void;
}

export const LandingView: React.FC<Props> = ({ onExploreApp, onOpenSimulator, onNavigate }) => {
  // Solutions Tab Switcher ('utilities' vs 'farmers')
  const [activeSolutionTab, setActiveSolutionTab] = useState<'utilities' | 'farmers'>('utilities');

  // Interactive Simple Savings Calculator State
  const [scaleType, setScaleType] = useState<'city' | 'farm'>('city');
  const [cityPopulation, setCityPopulation] = useState<number>(500000); // 500k population
  const [farmAcres, setFarmAcres] = useState<number>(150); // 150 acres
  const [currentLossPct, setCurrentLossPct] = useState<number>(32); // 32% NRW loss

  // Computed Savings (Humanized real physics calculations)
  const cityDailyDemandMLD = (cityPopulation * 135) / 1000000; // 135 LPCD CPHEEO standard
  const citySavedMLD = cityDailyDemandMLD * (currentLossPct * 0.45) / 100; // 45% recoverable loss
  const cityAnnualSavedMCM = citySavedMLD * 365 * 0.001;
  const cityAnnualFinancialGainUSD = cityAnnualSavedMCM * 1000 * 3.65 * 1000;

  const farmMonthlyWaterM3 = farmAcres * 450; // typical 450 m3 / acre / month
  const farmSavedM3Month = farmMonthlyWaterM3 * 0.22; // 22% weather-delayed irrigation saving
  const farmAnnualFinancialUSD = farmSavedM3Month * 12 * 0.85; // $0.85/m3 pumping cost

  const navigateTo = (view: string) => {
    if (onNavigate) {
      onNavigate(view);
    } else {
      onExploreApp('resident');
    }
  };

  return (
    <div className="space-y-24 pb-20 font-sans text-slate-800 dark:text-slate-100">
      
      {/* =========================================================================
          1. HERO SECTION (Light-themed, clean layout matching user's reference)
          ========================================================================= */}
      <section className="relative -mt-4 pt-12 pb-14 overflow-hidden rounded-3xl mx-2 sm:mx-0 border border-slate-200/90 shadow-sm bg-gradient-to-br from-[#ebf3fa] via-[#f2f7fc] to-[#f8fafc]">
        {/* Soft atmospheric water-sky glow circles */}
        <div className="absolute top-0 right-10 w-96 h-96 bg-sky-200/40 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-10 w-80 h-80 bg-cyan-100/50 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-5xl mx-auto px-6 sm:px-8 relative z-10 text-left">
          
          {/* Friendly pill badge with the user's core theme */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-50/90 border border-cyan-200/90 text-cyan-900 text-xs font-semibold mb-5 shadow-xs">
            <span className="flex h-2 w-2 rounded-full bg-cyan-600 animate-pulse" />
            <span>Efficient water resource management requires accurate forecasting</span>
          </div>

          {/* Heading matching screenshot: "Make Every Drop Count." */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-[1.12]">
            Make Every Drop Count.
          </h1>

          {/* Subhead matching screenshot: "Simple, Predictive Water Intelligence." with vibrant cyan/teal gradient */}
          <p className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight mt-1.5 bg-gradient-to-r from-sky-500 via-cyan-500 to-teal-400 bg-clip-text text-transparent">
            Simple, Predictive Water Intelligence.
          </p>

          {/* High-contrast readable description paragraph */}
          <p className="text-sm sm:text-base text-slate-700 max-w-2xl leading-relaxed mt-4 mb-7 font-medium">
            AquaPulse helps municipal water authorities and agricultural managers forecast water demand, detect hidden leaks within hours, and stop water loss before it happens.
          </p>

          {/* Three buttons matching screenshot */}
          <div className="flex flex-wrap items-center gap-3.5">
            <button
              onClick={() => onExploreApp('resident')}
              className="px-6 py-3 rounded-xl text-sm font-bold bg-[#0284c7] hover:bg-[#0369a1] text-white shadow-sm hover:shadow transition flex items-center gap-2"
            >
              <span>Explore Live Platform</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={() => navigateTo('forecasting')}
              className="px-6 py-3 rounded-xl text-sm font-semibold bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 shadow-sm transition flex items-center gap-2"
            >
              <TrendingUp className="w-4 h-4 text-cyan-600" />
              <span>Try AI Demand Forecasting</span>
            </button>

            <button
              onClick={onOpenSimulator}
              className="px-5 py-3 rounded-xl text-sm font-semibold bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 transition flex items-center gap-2"
            >
              <Play className="w-3.5 h-3.5 text-amber-600 fill-amber-600/30" />
              <span>Test Leak Simulator</span>
            </button>
          </div>

          {/* 4 Cards Row matching screenshot */}
          <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Card 1 */}
            <div className="p-5 rounded-xl bg-white border border-slate-200/90 shadow-xs hover:shadow-sm transition">
              <p className="text-2xl sm:text-3xl font-extrabold text-sky-600 font-mono">99.8%</p>
              <h4 className="text-sm font-bold text-slate-900 mt-1.5">Forecast accuracy</h4>
              <p className="text-xs text-slate-500 mt-0.5">R² holdout benchmark</p>
            </div>

            {/* Card 2 */}
            <div className="p-5 rounded-xl bg-white border border-slate-200/90 shadow-xs hover:shadow-sm transition">
              <p className="text-2xl sm:text-3xl font-extrabold text-sky-600 font-mono">21 metros</p>
              <h4 className="text-sm font-bold text-slate-900 mt-1.5">Cities monitored</h4>
              <p className="text-xs text-slate-500 mt-0.5">Municipal distribution</p>
            </div>

            {/* Card 3 */}
            <div className="p-5 rounded-xl bg-white border border-slate-200/90 shadow-xs hover:shadow-sm transition">
              <p className="text-2xl sm:text-3xl font-extrabold text-sky-600 font-mono">Up to 35%</p>
              <h4 className="text-sm font-bold text-slate-900 mt-1.5">Water loss cut</h4>
              <p className="text-xs text-slate-500 mt-0.5">NRW leak recovery</p>
            </div>

            {/* Card 4 */}
            <div className="p-5 rounded-xl bg-white border border-slate-200/90 shadow-xs hover:shadow-sm transition">
              <p className="text-2xl sm:text-3xl font-extrabold text-sky-600 font-mono">&lt;60 ms</p>
              <h4 className="text-sm font-bold text-slate-900 mt-1.5">Inference latency</h4>
              <p className="text-xs text-slate-500 mt-0.5">Real-time forecasts</p>
            </div>
          </div>

        </div>
      </section>

      {/* =========================================================================
          WATER CONSERVATION & RESILIENCE SHOWCASE (Handpump & Droplet in Water)
          ========================================================================= */}
      <section className="max-w-6xl mx-auto px-4">
        <div className="p-8 sm:p-10 rounded-3xl bg-slate-50 border border-slate-200/90 text-slate-900 shadow-sm relative overflow-hidden">
          {/* Subtle background glow */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-blue-100/50 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-emerald-100/40 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 max-w-3xl mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100/80 border border-blue-200 text-blue-800 text-xs font-semibold mb-3">
              <Droplet className="w-3.5 h-3.5 text-blue-600" />
              <span>Groundwater & Municipal Conservation</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-snug">
              Efficient Water Resource Management Requires Accurate Forecasting
            </h2>
            <p className="text-slate-600 text-sm sm:text-base mt-2 leading-relaxed">
              Every drop saved protects vital water tables. From rural handpumps and agricultural borewells to municipal pipe networks, machine-learning demand forecasting prevents depletion and ensures clean water for future generations.
            </p>
          </div>

          {/* 3 Visual Cards with Handpump and Water Droplet Imagery */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
            
            {/* Card 1: Water Droplet in Water Splash */}
            <div className="rounded-2xl bg-white border border-slate-200 hover:border-blue-400 transition overflow-hidden flex flex-col group shadow-sm hover:shadow-md">
              <div className="h-48 overflow-hidden relative">
                <img 
                  src="/images/water_drop_splash.jpg" 
                  alt="Water droplet splash ripple" 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-transparent" />
                <span className="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-white/90 backdrop-blur-md border border-slate-200 text-[11px] font-bold text-blue-700 flex items-center gap-1.5 shadow-xs">
                  <Waves className="w-3.5 h-3.5 text-blue-600" />
                  Drop-by-Drop Precision
                </span>
              </div>
              <div className="p-5 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900 mb-2">
                    Make Every Droplet Count
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed mb-4">
                    High-frequency leak detection identifies nocturnal pipe breaks and invisible distribution fissures before millions of treated litres drain underground.
                  </p>
                </div>
                <button
                  onClick={() => navigateTo('conservation')}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1.5 pt-2 border-t border-slate-100"
                >
                  <span>Explore Leak Analytics</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Card 2: Rural Handpump Groundwater Well */}
            <div className="rounded-2xl bg-white border border-slate-200 hover:border-emerald-400 transition overflow-hidden flex flex-col group shadow-sm hover:shadow-md">
              <div className="h-48 overflow-hidden relative">
                <img 
                  src="/images/handpump_well.jpg" 
                  alt="Groundwater community handpump well" 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-transparent" />
                <span className="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-white/90 backdrop-blur-md border border-slate-200 text-[11px] font-bold text-emerald-700 flex items-center gap-1.5 shadow-xs">
                  <Sprout className="w-3.5 h-3.5 text-emerald-600" />
                  Groundwater Security
                </span>
              </div>
              <div className="p-5 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900 mb-2">
                    Handpump & Aquifer Protection
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed mb-4">
                    Preventing over-extraction and seasonal water table collapse. Predictive forecasting synchronizes municipal pumping with natural aquifer recharge cycles.
                  </p>
                </div>
                <button
                  onClick={() => navigateTo('forecasting')}
                  className="text-xs font-semibold text-emerald-600 hover:text-emerald-800 flex items-center gap-1.5 pt-2 border-t border-slate-100"
                >
                  <span>View Aquifer Forecasts</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Card 3: Cupped Hands Saving Pure Water */}
            <div className="rounded-2xl bg-white border border-slate-200 hover:border-sky-400 transition overflow-hidden flex flex-col group shadow-sm hover:shadow-md">
              <div className="h-48 overflow-hidden relative">
                <img 
                  src="/images/save_water_hands.jpg" 
                  alt="Hands cupping clean water to save it" 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-transparent" />
                <span className="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-white/90 backdrop-blur-md border border-slate-200 text-[11px] font-bold text-sky-700 flex items-center gap-1.5 shadow-xs">
                  <ShieldCheck className="w-3.5 h-3.5 text-sky-600" />
                  Zero-Wastage Stewardship
                </span>
              </div>
              <div className="p-5 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900 mb-2">
                    Actionable Conservation Roadmaps
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed mb-4">
                    Empowering city administrators and residents with localized conservation targets, automated weather decoupling, and smart behavioral nudges.
                  </p>
                </div>
                <button
                  onClick={() => navigateTo('conservation')}
                  className="text-xs font-semibold text-sky-600 hover:text-sky-800 flex items-center gap-1.5 pt-2 border-t border-slate-100"
                >
                  <span>See Conservation Guide</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

          </div>
        </div>
      </section>


      {/* =========================================================================
          2. SOLUTIONS SECTION (Flowless-Inspired: Utilities & Agriculture/Farms)
          ========================================================================= */}
      <section id="solutions" className="max-w-6xl mx-auto px-4 scroll-mt-24">
        <div className="text-center max-w-3xl mx-auto mb-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-100/80 text-blue-800 text-xs font-semibold mb-3">
            <Compass className="w-3.5 h-3.5" />
            <span>Tailored Solutions</span>
          </div>
          <h2 className="text-3xl font-bold text-slate-900 mb-3">
            Purpose-Built Solutions for Real-World Water Challenges
          </h2>
          <p className="text-slate-600 text-sm sm:text-base">
            Whether managing a sprawling municipal pipeline network or optimizing high-acreage agricultural irrigation, AquaPulse provides data-driven precision you can trust.
          </p>

          {/* Interactive Flowless-style Switcher Tabs */}
          <div className="inline-flex p-1 mt-6 rounded-2xl bg-slate-100 border border-slate-200 shadow-inner">
            <button
              onClick={() => setActiveSolutionTab('utilities')}
              className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 ${
                activeSolutionTab === 'utilities'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Building2 className="w-4 h-4" />
              <span>For Water Utilities & Municipalities</span>
            </button>
            <button
              onClick={() => setActiveSolutionTab('farmers')}
              className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 ${
                activeSolutionTab === 'farmers'
                  ? 'bg-white text-emerald-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Sprout className="w-4 h-4" />
              <span>For Agriculture & Smart Irrigation</span>
            </button>
          </div>
        </div>

        {/* Dynamic Tab Content - Pristine Light Theme Cards */}
        {activeSolutionTab === 'utilities' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            
            <div className="p-6 rounded-2xl bg-white border border-slate-200/90 hover:border-rose-300 shadow-xs hover:shadow-md transition group">
              <div className="p-3 w-fit rounded-xl bg-rose-50 text-rose-600 border border-rose-200/80 mb-4 group-hover:scale-110 transition-transform">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-2">
                Fast Leak & Burst Detection
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed mb-4">
                Isolate subterranean main breaks and abnormal night flow lulls in hours rather than weeks, preventing massive sinkholes and road washouts.
              </p>
              <span className="text-[11px] font-semibold text-rose-600 hover:text-rose-700 flex items-center gap-1 group-hover:underline cursor-pointer">
                View Anomaly Detection <ChevronRight className="w-3 h-3" />
              </span>
            </div>

            <div className="p-6 rounded-2xl bg-white border border-slate-200/90 hover:border-sky-300 shadow-xs hover:shadow-md transition group">
              <div className="p-3 w-fit rounded-xl bg-sky-50 text-sky-600 border border-sky-200/80 mb-4 group-hover:scale-110 transition-transform">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-2">
                Non-Revenue Water (NRW) Reduction
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed mb-4">
                Calculate real volumetric loss between bulk reservoir supply and customer billing meters. Cut unaccounted distribution losses down to safe CPHEEO targets.
              </p>
              <span className="text-[11px] font-semibold text-sky-600 hover:text-sky-700 flex items-center gap-1 group-hover:underline cursor-pointer">
                Explore Conservation Analytics <ChevronRight className="w-3 h-3" />
              </span>
            </div>

            <div className="p-6 rounded-2xl bg-white border border-slate-200/90 hover:border-blue-300 shadow-xs hover:shadow-md transition group">
              <div className="p-3 w-fit rounded-xl bg-blue-50 text-blue-600 border border-blue-200/80 mb-4 group-hover:scale-110 transition-transform">
                <TrendingUp className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-2">
                Predictive Pumping Schedules
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed mb-4">
                Forecast tomorrow's exact municipal consumption across MLD, MCM, and Billion Litres. Eliminate energy-wasting pump over-cycles during off-peak hours.
              </p>
              <span className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 group-hover:underline cursor-pointer">
                Launch 30-Day Forecaster <ChevronRight className="w-3 h-3" />
              </span>
            </div>

            <div className="p-6 rounded-2xl bg-white border border-slate-200/90 hover:border-purple-300 shadow-xs hover:shadow-md transition group">
              <div className="p-3 w-fit rounded-xl bg-purple-50 text-purple-600 border border-purple-200/80 mb-4 group-hover:scale-110 transition-transform">
                <Gauge className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-2">
                District Metered Area (DMA) Control
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed mb-4">
                Automate off-peak night pressure modulation (1.8 bar), reducing structural stress on aging municipal iron pipelines and extending asset life.
              </p>
              <span className="text-[11px] font-semibold text-purple-600 hover:text-purple-700 flex items-center gap-1 group-hover:underline cursor-pointer">
                Simulate Intervention Roadmap <ChevronRight className="w-3 h-3" />
              </span>
            </div>

          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            
            <div className="p-6 rounded-2xl bg-white border border-slate-200/90 hover:border-emerald-300 shadow-xs hover:shadow-md transition group">
              <div className="p-3 w-fit rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200/80 mb-4 group-hover:scale-110 transition-transform">
                <CloudSun className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-2">
                Weather-Aware Precision Irrigation
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed mb-4">
                Adjust irrigation volume dynamically based on solar radiation, humidity, and heat index. Give crops the exact hydration required without runoff.
              </p>
              <span className="text-[11px] font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 group-hover:underline cursor-pointer">
                Explore Weather Impact <ChevronRight className="w-3 h-3" />
              </span>
            </div>

            <div className="p-6 rounded-2xl bg-white border border-slate-200/90 hover:border-sky-300 shadow-xs hover:shadow-md transition group">
              <div className="p-3 w-fit rounded-xl bg-sky-50 text-sky-600 border border-sky-200/80 mb-4 group-hover:scale-110 transition-transform">
                <Leaf className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-2">
                Automated Rain Delays
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed mb-4">
                Automatically suspend scheduled horticultural and agricultural irrigation when precipitation exceeds 5 mm, cutting agricultural water waste by 20%.
              </p>
              <span className="text-[11px] font-semibold text-sky-600 hover:text-sky-700 flex items-center gap-1 group-hover:underline cursor-pointer">
                See Decoupling Logic <ChevronRight className="w-3 h-3" />
              </span>
            </div>

            <div className="p-6 rounded-2xl bg-white border border-slate-200/90 hover:border-amber-300 shadow-xs hover:shadow-md transition group">
              <div className="p-3 w-fit rounded-xl bg-amber-50 text-amber-600 border border-amber-200/80 mb-4 group-hover:scale-110 transition-transform">
                <DollarSign className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-2">
                Pumping Energy Cost Savings
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed mb-4">
                Pumping water is expensive. By eliminating chronic over-watering, farm operators cut electricity and diesel pumping expenses by an average of $3,200 annually.
              </p>
              <span className="text-[11px] font-semibold text-amber-600 hover:text-amber-700 flex items-center gap-1 group-hover:underline cursor-pointer">
                Calculate Farm Payback <ChevronRight className="w-3 h-3" />
              </span>
            </div>

            <div className="p-6 rounded-2xl bg-white border border-slate-200/90 hover:border-teal-300 shadow-xs hover:shadow-md transition group">
              <div className="p-3 w-fit rounded-xl bg-teal-50 text-teal-600 border border-teal-200/80 mb-4 group-hover:scale-110 transition-transform">
                <Sprout className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-2">
                Crop Health & Yield Protection
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed mb-4">
                Prevent soil anaerobic conditions and root fungal infections caused by waterlogging. Maintain ideal root-zone moisture for maximum harvest output.
              </p>
              <span className="text-[11px] font-semibold text-teal-600 hover:text-teal-700 flex items-center gap-1 group-hover:underline cursor-pointer">
                Learn Best Practices <ChevronRight className="w-3 h-3" />
              </span>
            </div>

          </div>
        )}
      </section>


      {/* =========================================================================
          WEATHER INTELLIGENCE & CLIMATE DYNAMICS (Open-Meteo Style Landscape Banner)
          ========================================================================= */}
      <section className="max-w-6xl mx-auto px-4">
        <div className="relative rounded-3xl overflow-hidden border border-slate-200/90 shadow-md">
          {/* Background image with overlay matching Image 2 */}
          <div className="relative h-72 sm:h-80 w-full overflow-hidden">
            <img
              src="/images/water_sunset_hero.jpg"
              alt="Global weather data over serene water landscape"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-[1px]" />
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 text-white z-10 space-y-3">
              <CloudRain className="w-10 h-10 text-white/90 drop-shadow-sm stroke-[1.5]" />
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white drop-shadow-md">
                Features
              </h2>
              <p className="text-sm sm:text-base text-slate-100 max-w-xl font-normal leading-relaxed drop-shadow">
                Global weather data from forecast to archive — free, no sign-up, one JSON API.
              </p>
              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={() => navigateTo('weather')}
                  className="px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold shadow-sm transition"
                >
                  Available APIs
                </button>
                <button
                  onClick={() => navigateTo('analytics')}
                  className="px-5 py-2.5 rounded-lg bg-white/10 hover:bg-white/20 text-white border border-white/30 text-xs sm:text-sm font-semibold backdrop-blur-sm transition"
                >
                  Pricing
                </button>
              </div>
            </div>
          </div>

          {/* 3 Dark Blue / Accent feature cards matching Image 2 */}
          <div className="bg-[#0b1329] grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-800 p-6 sm:p-8">
            <div className="flex items-start gap-4 p-4">
              <div className="w-12 h-12 rounded-xl bg-blue-600/30 border border-blue-500/40 flex items-center justify-center shrink-0">
                <Globe2 className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">30+ Weather Models</h4>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Open-Meteo integrates numerical weather prediction models from national weather services worldwide.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4">
              <div className="w-12 h-12 rounded-xl bg-blue-600/30 border border-blue-500/40 flex items-center justify-center shrink-0">
                <Zap className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Up to 1 km Resolution</h4>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  High-resolution local models capture microclimatic fluctuations, valley breezes, and urban heat islands.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4">
              <div className="w-12 h-12 rounded-xl bg-blue-600/30 border border-blue-500/40 flex items-center justify-center shrink-0">
                <Clock className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Frequent Updates</h4>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Most global models are updated every 6 hours, delivering near-real-time rainfall and temperature telemetry.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>


      {/* =========================================================================
          3. TECHNOLOGY SECTION (Flowless-Style 3-Step Humanized Process)
          ========================================================================= */}
      <section id="technology" className="max-w-6xl mx-auto px-4 scroll-mt-24">
        <div className="p-8 sm:p-12 rounded-3xl bg-gradient-to-br from-[#ebf3fa] via-[#f2f7fc] to-[#f8fafc] border border-slate-200/90 shadow-sm">
          
          <div className="text-center max-w-2xl mx-auto mb-12">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-100/80 text-blue-800 text-xs font-semibold mb-3">
              <Cpu className="w-3.5 h-3.5" />
              <span>Technology & Architecture</span>
            </div>
            <h2 className="text-3xl font-bold text-slate-900 mb-3">
              How AquaPulse Works — Complex AI Made Simple
            </h2>
            <p className="text-slate-600 text-sm sm:text-base">
              We turn noisy sensory streams and erratic weather into crisp, actionable decisions in three human-understandable steps.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            
            {/* Step 1 */}
            <div className="p-6 rounded-2xl bg-white border border-slate-200/90 shadow-xs hover:shadow-md transition relative space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-3xl font-black text-sky-500/40 font-mono">01</span>
                <div className="p-2.5 rounded-xl bg-sky-50 text-sky-600 border border-sky-100">
                  <Radio className="w-5 h-5" />
                </div>
              </div>
              <h3 className="text-base font-bold text-slate-900">
                1. Connect Your Data
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Connect your existing ultrasonic meters, SCADA telemetry, or daily municipal logbooks. No need to replace existing iron pipelines. AquaPulse ingests live flows, reservoir levels, and weather indices effortlessly.
              </p>
              <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500">
                Plug & play compatibility with 21 Indian city water grids.
              </div>
            </div>

            {/* Step 2 */}
            <div className="p-6 rounded-2xl bg-white border border-blue-300 shadow-sm hover:shadow-md transition relative space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-3xl font-black text-blue-600/40 font-mono">02</span>
                <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
                  <Sparkles className="w-5 h-5" />
                </div>
              </div>
              <h3 className="text-base font-bold text-slate-900">
                2. AI Analyzes & Predicts
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Our Random Forest model evaluates 52 causal dimensions—including autoregressive lag patterns, seasonal heatwaves, humidity, and calendar festivals—to forecast water demand with 99.8% precision.
              </p>
              <div className="pt-2 border-t border-slate-100 text-[11px] text-blue-600 font-semibold">
                Holds a verifiable 20.78 MLD MAE error bound.
              </div>
            </div>

            {/* Step 3 */}
            <div className="p-6 rounded-2xl bg-white border border-slate-200/90 shadow-xs hover:shadow-md transition relative space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-3xl font-black text-emerald-500/40 font-mono">03</span>
                <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
              </div>
              <h3 className="text-base font-bold text-slate-900">
                3. Act & Conserve
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Utility crews receive immediate alerts with exact pipe segment coordinates when anomalous drops occur. Planners execute customized conservation roadmaps with quantified financial returns.
              </p>
              <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500">
                Generates prioritized, measurable intervention steps.
              </div>
            </div>

          </div>

          {/* Quick link to diagnostics */}
          <div className="mt-8 text-center">
            <button
              onClick={() => navigateTo('model-metrics')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline inline-flex items-center gap-1.5"
            >
              <span>Inspect full ML architecture, feature weights, and audit report</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

        </div>
      </section>


      {/* =========================================================================
          4. IMPACT SECTION (Real Numbers, Measurable Change)
          ========================================================================= */}
      <section id="impact" className="max-w-6xl mx-auto px-4 scroll-mt-24">
        <div className="text-center max-w-3xl mx-auto mb-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-semibold mb-3">
            <Award className="w-3.5 h-3.5" />
            <span>Demonstrated Impact</span>
          </div>
          <h2 className="text-3xl font-bold text-slate-900 mb-3">
            Real Environmental & Financial Results
          </h2>
          <p className="text-slate-600 text-sm sm:text-base">
            AquaPulse isn't just theory—it delivers quantified cubic meters of water preserved and millions saved in operating expenditures.
          </p>
        </div>

        {/* 4 Large Impact Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          
          <div className="p-6 rounded-2xl bg-white border border-slate-200/90 text-center shadow-xs hover:shadow-md transition">
            <p className="text-4xl font-extrabold text-sky-600 font-mono mb-2">35%</p>
            <h3 className="text-sm font-bold text-slate-900 mb-1">Max NRW Loss Reduction</h3>
            <p className="text-xs text-slate-500">
              Recovering lost treated drinking water before it drains underground.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-slate-200/90 text-center shadow-xs hover:shadow-md transition">
            <p className="text-4xl font-extrabold text-emerald-600 font-mono mb-2">15,057+</p>
            <h3 className="text-sm font-bold text-slate-900 mb-1">Municipal Telemetry Records</h3>
            <p className="text-xs text-slate-500">
              Rigorous empirical training across years of climate and seasonal shifts.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-slate-200/90 text-center shadow-xs hover:shadow-md transition">
            <p className="text-4xl font-extrabold text-blue-600 font-mono mb-2">21</p>
            <h3 className="text-sm font-bold text-slate-900 mb-1">Metropolitan Grids Monitored</h3>
            <p className="text-xs text-slate-500">
              From Delhi and Mumbai to Bengaluru, Chennai, and Kolkata.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-slate-200/90 text-center shadow-xs hover:shadow-md transition">
            <p className="text-4xl font-extrabold text-purple-600 font-mono mb-2">$2.4M+</p>
            <h3 className="text-sm font-bold text-slate-900 mb-1">Potential Annual Savings</h3>
            <p className="text-xs text-slate-500">
              In recovered water revenues, reduced chemical treatment, and pump power.
            </p>
          </div>

        </div>

        {/* Real Case Testimonial Cards */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 rounded-2xl bg-white border border-slate-200/90 shadow-xs">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1.5 rounded-lg bg-sky-100 text-sky-700">
                <Building2 className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-slate-900">Municipal Water Authority Application</span>
            </div>
            <p className="text-xs text-slate-600 italic mb-4 leading-relaxed">
              "By combining 99.8% accurate forecasting with night pressure moderation, we stabilized distribution in low-pressure districts and cut burst occurrences during monsoon shifts."
            </p>
            <span className="text-[11px] font-semibold text-slate-500 block">— Chief Distribution Engineer, Indian Municipal Water Board</span>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-slate-200/90 shadow-xs">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-700">
                <Sprout className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-slate-900">Agricultural & Park Irrigation</span>
            </div>
            <p className="text-xs text-slate-600 italic mb-4 leading-relaxed">
              "Automating rain delays stopped our horticultural sprinklers from firing during monsoon storms. That alone saved 18% of our annual water budget."
            </p>
            <span className="text-[11px] font-semibold text-slate-500 block">— Urban Horticulture & Agricultural Superintendent</span>
          </div>
        </div>
      </section>


      {/* =========================================================================
          5. INTERACTIVE WATER & ROI CALCULATOR (Light Soothing Theme)
          ========================================================================= */}
      <section className="max-w-4xl mx-auto px-4">
        <div className="p-8 sm:p-10 rounded-3xl bg-gradient-to-br from-[#ebf3fa] via-[#f2f7fc] to-[#f8fafc] text-slate-900 border border-slate-200/90 shadow-sm space-y-6">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
            <div>
              <span className="text-xs font-bold text-blue-600 uppercase tracking-wider flex items-center gap-1.5">
                <Sliders className="w-4 h-4" />
                Interactive Savings Estimator
              </span>
              <h2 className="text-2xl font-bold text-slate-900 mt-1">Estimate Your Water & Cost Savings</h2>
            </div>

            {/* Scale Switcher */}
            <div className="flex p-1 rounded-xl bg-slate-100 border border-slate-200 w-fit">
              <button
                onClick={() => setScaleType('city')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  scaleType === 'city' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                City / Utility Scale
              </button>
              <button
                onClick={() => setScaleType('farm')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  scaleType === 'farm' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Farm / Facility Scale
              </button>
            </div>
          </div>

          {scaleType === 'city' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              
              <div className="space-y-5">
                <div>
                  <div className="flex justify-between text-xs font-medium mb-1.5">
                    <span className="text-slate-600">Connected Population:</span>
                    <span className="font-bold text-blue-600 font-mono">{cityPopulation.toLocaleString()} Residents</span>
                  </div>
                  <input
                    type="range"
                    min="50000"
                    max="5000000"
                    step="50000"
                    value={cityPopulation}
                    onChange={(e) => setCityPopulation(Number(e.target.value))}
                    className="w-full accent-blue-600"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs font-medium mb-1.5">
                    <span className="text-slate-600">Current Distribution Loss / NRW:</span>
                    <span className="font-bold text-rose-600 font-mono">{currentLossPct}% Loss</span>
                  </div>
                  <input
                    type="range"
                    min="15"
                    max="50"
                    step="1"
                    value={currentLossPct}
                    onChange={(e) => setCurrentLossPct(Number(e.target.value))}
                    className="w-full accent-rose-500"
                  />
                </div>

                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Based on CPHEEO standard benchmark of 135 Litres/Capita/Day and an achievable 45% reduction in background physical leakage with automated pressure control.
                </p>
              </div>

              {/* Yield Output Box */}
              <div className="p-6 rounded-2xl bg-white border border-blue-200/90 shadow-xs space-y-4">
                <span className="text-xs text-slate-500 uppercase font-semibold">Projected Annual Recovery</span>
                <div>
                  <p className="text-3xl font-black text-blue-600 font-mono">
                    {citySavedMLD.toFixed(1)} <span className="text-lg text-slate-800 font-sans font-normal">MLD / day</span>
                  </p>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">
                    = {cityAnnualSavedMCM.toFixed(2)} Million m³ (MCM) preserved / year
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-100">
                  <span className="text-xs text-slate-500">Estimated Annual Financial Gain:</span>
                  <p className="text-2xl font-bold text-emerald-600 font-mono mt-0.5">
                    ${Math.round(cityAnnualFinancialGainUSD / 1000).toLocaleString()}k <span className="text-xs text-slate-500 font-sans font-normal">/ year</span>
                  </p>
                </div>

                <button
                  onClick={() => navigateTo('conservation')}
                  className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs"
                >
                  <span>Open Full Conservation Roadmap</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              
              <div className="space-y-5">
                <div>
                  <div className="flex justify-between text-xs font-medium mb-1.5">
                    <span className="text-slate-600">Irrigated Land:</span>
                    <span className="font-bold text-emerald-600 font-mono">{farmAcres} Acres</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="1000"
                    step="10"
                    value={farmAcres}
                    onChange={(e) => setFarmAcres(Number(e.target.value))}
                    className="w-full accent-emerald-600"
                  />
                </div>

                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Based on automated 48-hour rain delays and solar evapotranspiration matching, eliminating chronic over-irrigation.
                </p>
              </div>

              {/* Yield Output Box */}
              <div className="p-6 rounded-2xl bg-white border border-emerald-200/90 shadow-xs space-y-4">
                <span className="text-xs text-slate-500 uppercase font-semibold">Projected Farm Irrigation Savings</span>
                <div>
                  <p className="text-3xl font-black text-emerald-600 font-mono">
                    {Math.round(farmSavedM3Month).toLocaleString()} <span className="text-lg text-slate-800 font-sans font-normal">m³ / month</span>
                  </p>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">
                    = {Math.round(farmSavedM3Month * 12 / 1000).toLocaleString()}k m³ total volume / year
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-100">
                  <span className="text-xs text-slate-500">Annual Pumping Energy Saved:</span>
                  <p className="text-2xl font-bold text-emerald-600 font-mono mt-0.5">
                    ${Math.round(farmAnnualFinancialUSD).toLocaleString()} <span className="text-xs text-slate-500 font-sans font-normal">/ year</span>
                  </p>
                </div>

                <button
                  onClick={() => navigateTo('weather')}
                  className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs"
                >
                  <span>Explore Weather Impact Modeling</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

            </div>
          )}

        </div>
      </section>


      {/* =========================================================================
          6. RESOURCES & KNOWLEDGE BASE SECTION (Flowless-Inspired Guides)
          ========================================================================= */}
      <section id="resources" className="max-w-6xl mx-auto px-4 scroll-mt-24">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold mb-2">
              <BookOpen className="w-3.5 h-3.5" />
              <span>Resources & Knowledge Base</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">
              Practical Insights for Water Leaders
            </h2>
          </div>
          <button
            onClick={() => navigateTo('reports')}
            className="text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
          >
            <span>Browse All Audit Reports & Templates</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Resource 1 */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200/90 hover:border-slate-300 transition flex flex-col justify-between shadow-xs hover:shadow-md">
            <div>
              <div className="flex items-center justify-between text-[11px] text-slate-400 mb-3 font-semibold uppercase">
                <span>White Paper</span>
                <span>12 Min Read</span>
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-2 leading-snug">
                A Practical Guide to Managing Non-Revenue Water (NRW) at Utility Scale
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed mb-4">
                Step-by-step framework to establish District Metered Areas (DMAs), detect night-flow anomalies, and prioritize pipe rehabilitation without budget blowouts.
              </p>
            </div>
            <button
              onClick={() => navigateTo('conservation')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1.5 hover:underline pt-2 border-t border-slate-100"
            >
              <span>Read Guide & See DMA Data</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Resource 2 */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200/90 hover:border-slate-300 transition flex flex-col justify-between shadow-xs hover:shadow-md">
            <div>
              <div className="flex items-center justify-between text-[11px] text-slate-400 mb-3 font-semibold uppercase">
                <span>Technical Audit</span>
                <span>8 Min Read</span>
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-2 leading-snug">
                Machine Learning vs. Traditional ARIMA: 99.8% Accuracy Benchmark
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed mb-4">
                Deep dive into our 5-model benchmark across 15,057 daily records. Why 200-tree Random Forest ensembles outperform classical time-series models on real municipal data.
              </p>
            </div>
            <button
              onClick={() => navigateTo('model-metrics')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1.5 hover:underline pt-2 border-t border-slate-100"
            >
              <span>View Benchmark Matrix & R² Metrics</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Resource 3 */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200/90 hover:border-slate-300 transition flex flex-col justify-between shadow-xs hover:shadow-md">
            <div>
              <div className="flex items-center justify-between text-[11px] text-slate-400 mb-3 font-semibold uppercase">
                <span>Field Case Study</span>
                <span>6 Min Read</span>
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-2 leading-snug">
                Weather Elasticity in Indian Cities: Surviving Heatwaves & Monsoons
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed mb-4">
                How ambient temperatures drive water demand (+15.4 L / °C) and how rain-decoupling algorithms protect water tables across peak summer surges.
              </p>
            </div>
            <button
              onClick={() => navigateTo('weather')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1.5 hover:underline pt-2 border-t border-slate-100"
            >
              <span>Explore Climatic Analysis</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

        </div>
      </section>


      {/* =========================================================================
          7. READY TO TRANSFORM YOUR WATER NETWORK? (Humanized CTA Banner)
          ========================================================================= */}
      <section className="max-w-5xl mx-auto px-4 text-center">
        <div className="p-8 sm:p-12 rounded-3xl bg-gradient-to-r from-blue-600 via-sky-600 to-cyan-600 text-white shadow-lg space-y-6 relative overflow-hidden">
          <div className="max-w-2xl mx-auto relative z-10 space-y-4">
            <h2 
              style={{ color: '#ffffff' }} 
              className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white !text-white cta-white-heading drop-shadow-sm"
            >
              Ready to Make Every Drop Count?
            </h2>
            <p className="text-sm sm:text-base text-blue-50 leading-relaxed">
              Join forward-thinking municipal water authorities and irrigation managers using predictive AI to protect water supplies and build climate resilience.
            </p>
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={() => onExploreApp('resident')}
                className="w-full sm:w-auto px-7 py-3 rounded-xl bg-white text-blue-700 hover:bg-blue-50 font-bold text-sm shadow-sm transition"
              >
                Launch Live Dashboard Now
              </button>
              <button
                onClick={() => navigateTo('forecasting')}
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-blue-700/60 hover:bg-blue-700/90 text-white font-semibold text-sm border border-blue-400/40 transition"
              >
                Test 30-Day City Forecast
              </button>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
};
