
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Pizza, Calculator, UtensilsCrossed, Scale, Factory, Coffee, MessageCircle, 
  Settings, ChevronDown, ChevronUp, Info, Send, Sparkles, Image as ImageIcon, 
  Wand2, Wheat, Droplets, FlaskConical, Thermometer, Share2, Copy, CheckCircle2,
  Clock, Trash2, Plus, Minus, Moon, Sun, Key, Loader2, X
} from 'lucide-react';
import { PRESETS, PRODUCTION_SCALES } from './constants';
import { DoughCalculatorState, CalculationResults, RecipePreset, Ingredient, YeastType } from './types';
import { GeminiService } from './geminiService';

// --- UI Components ---

const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = "" }) => (
  <div className={`bg-slate-800/50 border border-slate-700/50 backdrop-blur-xl rounded-[2rem] overflow-hidden shadow-2xl transition-all duration-300 ${className}`}>
    {children}
  </div>
);

const Badge: React.FC<{ children: React.ReactNode; className?: string; variant?: 'default' | 'secondary' | 'warning' | 'info' | 'success' }> = ({ children, className = "", variant = "default" }) => {
  const styles = {
    default: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    secondary: 'bg-slate-700/50 text-slate-300 border-slate-600/50',
    warning: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    info: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    success: 'bg-green-500/20 text-green-400 border-green-500/30',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${styles[variant]} ${className}`}>
      {children}
    </span>
  );
};

const PreciseControl: React.FC<{
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (val: number) => void;
  accentColor?: string;
  icon?: React.ReactNode;
}> = ({ label, value, min, max, step = 1, unit = "", onChange, accentColor = "bg-orange-500", icon }) => {
  const increment = () => onChange(Math.min(max, Number((value + step).toFixed(2))));
  const decrement = () => onChange(Math.max(min, Number((value - step).toFixed(2))));

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-end">
        <div className="flex items-center gap-2">
          {icon && <span className="opacity-60 scale-75">{icon}</span>}
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{label}</label>
        </div>
        <span className="text-xl font-black text-slate-200 tabular-nums">
          {value}{unit}
        </span>
      </div>
      <div className="flex items-center gap-3 bg-slate-900/60 p-1.5 rounded-2xl border border-slate-700/50">
        <button 
          onClick={decrement}
          aria-label={`Diminuer ${label}`}
          className="p-2 hover:bg-slate-700 rounded-xl transition-colors text-slate-400 hover:text-white active:scale-90"
        >
          <Minus className="w-4 h-4" />
        </button>
        <div className="flex-1 px-1">
          <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={(e) => onChange(parseFloat(e.target.value))}
            className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-orange-500"
          />
        </div>
        <button 
          onClick={increment}
          aria-label={`Augmenter ${label}`}
          className="p-2 hover:bg-slate-700 rounded-xl transition-colors text-slate-400 hover:text-white active:scale-90"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

const MainTabs: React.FC<{
  value: string;
  onValueChange: (val: string) => void;
  options: { id: string; label: string; icon: React.ReactNode }[];
}> = ({ value, onValueChange, options }) => (
  <div className="flex bg-slate-900/80 p-1 rounded-2xl border border-slate-700/50 shadow-inner overflow-x-auto scrollbar-hide">
    {options.map((opt) => (
      <button
        key={opt.id}
        onClick={() => onValueChange(opt.id)}
        className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${
          value === opt.id 
            ? 'bg-orange-500 text-white shadow-lg' 
            : 'text-slate-500 hover:text-slate-200 hover:bg-slate-800'
        }`}
      >
        {opt.icon}
        <span className="hidden sm:inline">{opt.label}</span>
      </button>
    ))}
  </div>
);

// --- Main Application ---

const DEFAULT_STATE: DoughCalculatorState = {
  numberOfPizzas: 4,
  doughWeightPerBall: 250,
  hydration: 60,
  salt: 3,
  yeast: 0.1,
  yeastType: 'dry',
  oil: 0,
  sugar: 0,
  includeResidue: true,
  ambientTemp: 22,
  flourTemp: 21,
  baseTemp: 60,
  targetDinnerTime: "20:00",
  totalFermentationHours: 24,
};

export default function App() {
  const [calculator, setCalculator] = useState<DoughCalculatorState>(() => {
    const saved = localStorage.getItem('pizzeo_v2_state');
    if (saved) {
      try { return { ...DEFAULT_STATE, ...JSON.parse(saved) }; } catch (e) { return DEFAULT_STATE; }
    }
    return DEFAULT_STATE;
  });

  useEffect(() => {
    localStorage.setItem('pizzeo_v2_state', JSON.stringify(calculator));
  }, [calculator]);

  const [activePreset, setActivePreset] = useState<string | null>(null);
  const [activeScale, setActiveScale] = useState<string>('artisanal');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const [copied, setCopied] = useState(false);
  
  const [aiPanelOpen, setAiPanelOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: 'user' | 'ai'; content: string }[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  const gemini = useMemo(() => new GeminiService(), []);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const calculations = useMemo((): CalculationResults => {
    const { 
      numberOfPizzas, doughWeightPerBall, hydration, salt, yeast, yeastType, oil, sugar, 
      includeResidue, ambientTemp, flourTemp, baseTemp, targetDinnerTime, totalFermentationHours 
    } = calculator;
    
    let totalDoughWeight = numberOfPizzas * doughWeightPerBall;
    if (includeResidue) totalDoughWeight *= 1.03;
    
    // T_eau = T_base - (T_ambiante + T_farine)
    const idealWaterTemp = baseTemp - (flourTemp + ambientTemp);
    
    // Planning
    const [hours, minutes] = targetDinnerTime.split(':').map(Number);
    const dinnerDate = new Date(); dinnerDate.setHours(hours, minutes, 0, 0);
    const startDate = new Date(dinnerDate.getTime() - totalFermentationHours * 60 * 60 * 1000);
    const takeOutDate = new Date(dinnerDate.getTime() - 3 * 60 * 60 * 1000);

    const h = hydration / 100;
    const s = salt / 100;
    const o = oil / 100;
    const sug = sugar / 100;
    
    // Yeast scaling logic
    const yeastFactor = yeast / 100;
    const facteur = 1 + h + s + yeastFactor + o + sug;
    const flourWeight = totalDoughWeight / facteur;
    
    const waterWeight = flourWeight * h;
    const saltWeight = flourWeight * s;
    const oilWeight = flourWeight * o;
    const sugarWeight = flourWeight * sug;
    
    // Exact yeast weights
    const dryYeastWeight = yeastType === 'dry' ? (flourWeight * yeastFactor) : (flourWeight * yeastFactor / 3);
    const freshYeastWeight = yeastType === 'fresh' ? (flourWeight * yeastFactor) : (flourWeight * yeastFactor * 3);
    
    const ingredientsTable: Ingredient[] = [
      { ingredient: 'Farine', quantite: flourWeight, pourcentage: 100, note: 'Base' },
      { ingredient: 'Eau', quantite: waterWeight, pourcentage: hydration, note: `${hydration}%` },
      { ingredient: 'Sel', quantite: saltWeight, pourcentage: salt, note: `${salt}%` },
      { 
        ingredient: yeastType === 'dry' ? 'Levure Sèche' : 'Levure Fraîche', 
        quantite: yeastType === 'dry' ? dryYeastWeight : freshYeastWeight, 
        pourcentage: yeast, 
        note: yeastType.toUpperCase() 
      },
    ];
    if (oil > 0) ingredientsTable.push({ ingredient: 'Huile', quantite: oilWeight, pourcentage: oil, note: `${oil}%` });
    if (sugar > 0) ingredientsTable.push({ ingredient: 'Sucre', quantite: sugarWeight, pourcentage: sugar, note: `${sugar}%` });

    return {
      totalDoughWeight,
      totalPercentage: 100 + hydration + salt + yeast + oil + sugar,
      facteur, flourWeight, waterWeight, waterVolume: waterWeight,
      saltWeight, dryYeastWeight, freshYeastWeight, oilWeight, sugarWeight,
      useKg: flourWeight >= 1000, productionNote: hydration > 75 ? "⚠️ Haute Hydratation" : "",
      idealWaterTemp,
      startTime: startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + " (" + startDate.toLocaleDateString([], { weekday: 'short' }) + ")",
      takeOutTime: takeOutDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      ingredientsTable,
      // Fix: Provided explicit mapping for nombrePizzas as it was missing from scope
      debugInfo: { nombrePizzas: numberOfPizzas, poidsBoule: doughWeightPerBall, poidsTotal: totalDoughWeight, hydratation: h, sel: s, levure: yeastFactor, huile: o, sucre: sug, facteur }
    };
  }, [calculator]);

  const updateCalculator = (key: keyof DoughCalculatorState, value: any) => {
    setCalculator(prev => ({ ...prev, [key]: value }));
    if (activePreset && ['hydration', 'salt', 'yeast', 'oil', 'sugar'].includes(key)) setActivePreset(null);
    if (['numberOfPizzas', 'doughWeightPerBall'].includes(key)) setActiveScale('custom');
  };

  // Fix: Added missing helper functions to handle scale and preset applications
  const applyScale = (scaleId: string) => {
    const scale = PRODUCTION_SCALES.find(s => s.id === scaleId);
    if (scale) {
      setCalculator(prev => ({
        ...prev,
        numberOfPizzas: scale.pizzas,
        doughWeightPerBall: scale.weightPerBall
      }));
      setActiveScale(scaleId);
    }
  };

  const applyPreset = (preset: RecipePreset) => {
    setCalculator(prev => ({
      ...prev,
      hydration: preset.hydration,
      salt: preset.salt,
      yeast: preset.yeast,
      oil: preset.oil,
      sugar: preset.sugar
    }));
  };

  const toggleYeastType = () => {
    const newType: YeastType = calculator.yeastType === 'dry' ? 'fresh' : 'dry';
    const newValue = newType === 'fresh' ? calculator.yeast * 3 : calculator.yeast / 3;
    setCalculator(prev => ({ ...prev, yeastType: newType, yeast: Number(newValue.toFixed(2)) }));
  };

  const copyRecipe = () => {
    const yeastLabel = calculator.yeastType === 'dry' ? 'Levure Sèche' : 'Levure Fraîche';
    const text = `🍕 Pizzeo - ${activePreset || 'Custom'}\nUnits: ${calculator.numberOfPizzas} x ${calculator.doughWeightPerBall}g\nTotal: ${(calculations.totalDoughWeight/1000).toFixed(2)}kg\n\nIngrédients:\n- Farine: ${(calculations.flourWeight).toFixed(0)}g\n- Eau: ${(calculations.waterWeight).toFixed(0)}g\n- Sel: ${(calculations.saltWeight).toFixed(1)}g\n- ${yeastLabel}: ${(calculator.yeastType === 'dry' ? calculations.dryYeastWeight : calculations.freshYeastWeight).toFixed(2)}g\n\nT° Eau Idéale: ${calculations.idealWaterTemp.toFixed(1)}°C\nStart: ${calculations.startTime}`;
    navigator.clipboard.writeText(text);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;
    const msg = inputValue; setMessages(p => [...p, { role: 'user', content: msg }]);
    setInputValue(''); setIsThinking(true); setAuthError(null);
    try {
      const res = await gemini.askPizzeo(msg);
      setMessages(p => [...p, { role: 'ai', content: res }]);
    } catch (e: any) {
      if (e?.message?.includes("403")) setAuthError("Sélectionnez une clé API valide.");
      else setMessages(p => [...p, { role: 'ai', content: "Erreur technique." }]);
    } finally { setIsThinking(false); }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-900 text-slate-100 font-sans selection:bg-orange-500/30">
      
      {/* Header */}
      <header className="pt-16 pb-12 px-4 text-center relative">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-orange-500/10 blur-[100px] -z-10 rounded-full" />
        <div className="flex flex-col items-center gap-6 group">
          <div 
            onClick={() => setAiPanelOpen(true)}
            className="w-24 h-24 rounded-full bg-slate-900 border-4 border-orange-500 flex items-center justify-center cursor-pointer shadow-[0_0_20px_rgba(249,115,22,0.4)] transition-all hover:scale-110 active:scale-95"
          >
            <Pizza className="w-12 h-12 text-orange-500" />
          </div>
          <div>
            <h1 className="text-5xl font-black tracking-tighter glow-text">Pizzeo</h1>
            <p className="text-[10px] font-black text-orange-400 tracking-[0.4em] uppercase opacity-80 mt-1">Calculate. Bake. Perfection.</p>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-5xl mx-auto px-4 pb-24 space-y-16">
        
        {authError && (
          <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-2xl flex items-center justify-between text-xs font-bold text-red-200 animate-pulse">
            <div className="flex items-center gap-3"><Key className="w-4 h-4" /> {authError}</div>
            <button onClick={() => gemini.askPizzeo("test")} className="underline">Choisir Clé</button>
          </div>
        )}

        {/* Section 1: Production */}
        <section className="space-y-8">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-xl font-black flex items-center gap-3"><Factory className="w-5 h-5 text-orange-500" /> 1. PRODUCTION</h2>
            <div className="flex items-center gap-3 bg-slate-800/50 p-1.5 rounded-xl border border-slate-700/50">
               <span className="text-[9px] font-black text-slate-500 uppercase">Perte 3%</span>
               <button 
                  onClick={() => updateCalculator('includeResidue', !calculator.includeResidue)}
                  className={`w-10 h-5 rounded-full p-1 transition-all ${calculator.includeResidue ? 'bg-orange-500' : 'bg-slate-700'}`}
               >
                  <div className={`w-3 h-3 bg-white rounded-full transition-all ${calculator.includeResidue ? 'translate-x-5' : 'translate-x-0'}`} />
               </button>
            </div>
          </div>
          
          <Card className="p-8 space-y-10">
            <MainTabs value={activeScale} onValueChange={applyScale} options={PRODUCTION_SCALES.map(s => ({ id: s.id, label: s.name, icon: s.icon }))} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              <PreciseControl label="Nombre de Pizzas" value={calculator.numberOfPizzas} min={1} max={500} onChange={(v) => updateCalculator('numberOfPizzas', v)} />
              <PreciseControl label="Poids par Boule (g)" value={calculator.doughWeightPerBall} min={150} max={1000} step={10} onChange={(v) => updateCalculator('doughWeightPerBall', v)} />
            </div>
            <div className="bg-slate-900/60 p-8 rounded-3xl border border-slate-700/50 text-center space-y-2">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Masse Totale Corrigée</p>
              <p className="text-5xl font-black text-orange-400 tabular-nums">{(calculations.totalDoughWeight/1000).toFixed(2)}kg</p>
            </div>
          </Card>
        </section>

        {/* Section 2: Formulation */}
        <section className="space-y-8">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-xl font-black flex items-center gap-3"><UtensilsCrossed className="w-5 h-5 text-orange-500" /> 2. FORMULATION</h2>
            <button 
              onClick={toggleYeastType}
              className="flex items-center bg-slate-800 p-1 rounded-xl border border-slate-700 text-[9px] font-black uppercase overflow-hidden"
            >
              <span className={`px-3 py-1.5 rounded-lg transition-all ${calculator.yeastType === 'dry' ? 'bg-orange-500 text-white' : 'text-slate-500'}`}>Sèche</span>
              <span className={`px-3 py-1.5 rounded-lg transition-all ${calculator.yeastType === 'fresh' ? 'bg-orange-500 text-white' : 'text-slate-500'}`}>Fraîche</span>
            </button>
          </div>

          <Card className="p-8 space-y-10">
            <div className="flex flex-wrap gap-3">
              {PRESETS.map(p => (
                <button key={p.name} onClick={() => { applyPreset(p); setActivePreset(p.name); }} className={`px-4 py-2.5 rounded-xl text-[10px] font-black border transition-all ${activePreset === p.name ? 'bg-orange-500 border-orange-500 text-white' : 'bg-slate-800/50 border-slate-700 text-slate-500 hover:text-slate-200'}`}>
                  {p.name}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
              <div className="lg:col-span-2 space-y-10">
                <PreciseControl label="Hydratation" value={calculator.hydration} min={50} max={90} step={0.5} unit="%" onChange={(v) => updateCalculator('hydration', v)} accentColor="bg-blue-500" icon={<Droplets className="w-5 h-5 text-blue-500" />} />
                <button onClick={() => setShowAdvanced(!showAdvanced)} className="w-full py-4 rounded-2xl bg-slate-800/30 border border-slate-700/50 text-[10px] font-black uppercase text-slate-500 hover:text-orange-400 transition-all">
                  {showAdvanced ? 'Masquer Avancé' : 'Réglages Fins (Sel, Levure...)'}
                </button>
                {showAdvanced && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in slide-in-from-top-4 duration-500">
                    <PreciseControl label="Sel" value={calculator.salt} min={1} max={5} step={0.1} unit="%" onChange={(v) => updateCalculator('salt', v)} />
                    <PreciseControl label={`Levure (${calculator.yeastType})`} value={calculator.yeast} min={0.01} max={5} step={0.01} unit="%" onChange={(v) => updateCalculator('yeast', v)} />
                  </div>
                )}
              </div>
              <div className="p-6 bg-slate-900/60 rounded-3xl border border-blue-500/20 space-y-6">
                <div className="flex items-center gap-2 text-[10px] font-black text-blue-400 uppercase"><Thermometer className="w-4 h-4" /> Température Eau</div>
                <PreciseControl label="T° Farine" value={calculator.flourTemp} min={5} max={35} onChange={(v) => updateCalculator('flourTemp', v)} unit="°C" />
                <PreciseControl label="T° Ambiante" value={calculator.ambientTemp} min={5} max={40} onChange={(v) => updateCalculator('ambientTemp', v)} unit="°C" />
                <div className="pt-4 border-t border-slate-800 text-center">
                   <p className="text-[9px] font-black text-blue-500/50 uppercase mb-1">Eau Idéale</p>
                   <p className="text-4xl font-black text-blue-400 tabular-nums">{calculations.idealWaterTemp.toFixed(1)}°C</p>
                </div>
              </div>
            </div>
          </Card>
        </section>

        {/* Section 3: Results */}
        <section className="space-y-8">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-xl font-black flex items-center gap-3"><Calculator className="w-5 h-5 text-orange-500" /> 3. RÉSULTATS</h2>
            <button onClick={copyRecipe} className="flex items-center gap-2 px-5 py-2.5 bg-orange-500 hover:bg-orange-600 rounded-xl text-[10px] font-black uppercase transition-all shadow-lg active:scale-90">
              {copied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />} {copied ? 'Copié' : 'Copier'}
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card className="p-8 space-y-6">
              <div className="p-6 bg-orange-500/10 rounded-3xl border border-orange-500/30 flex justify-between items-end">
                <div><p className="text-[10px] font-black text-orange-500 uppercase mb-1">Farine</p><p className="text-5xl font-black text-orange-400 tabular-nums">{calculations.flourWeight.toFixed(0)}g</p></div>
                <Badge variant="warning">Base 100%</Badge>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-5 bg-slate-900/50 rounded-2xl border border-slate-800"><p className="text-[9px] font-black text-slate-500 uppercase mb-2">Eau</p><p className="text-2xl font-black text-blue-400 tabular-nums">{calculations.waterWeight.toFixed(0)}g</p></div>
                <div className="p-5 bg-slate-900/50 rounded-2xl border border-slate-800"><p className="text-[9px] font-black text-slate-500 uppercase mb-2">Levure</p><p className="text-2xl font-black text-amber-400 tabular-nums">{(calculator.yeastType === 'dry' ? calculations.dryYeastWeight : calculations.freshYeastWeight).toFixed(2)}g</p></div>
              </div>
            </Card>

            <Card className="p-8 bg-slate-900/40">
               <div className="flex items-center justify-between mb-8">
                  <h4 className="text-[10px] font-black text-indigo-400 uppercase flex items-center gap-2"><Moon className="w-4 h-4" /> Planning Fermentation</h4>
                  <input type="time" value={calculator.targetDinnerTime} onChange={(e) => updateCalculator('targetDinnerTime', e.target.value)} className="bg-slate-800 border-none rounded-lg text-xs font-bold p-2" />
               </div>
               <div className="space-y-6 border-l-2 border-slate-800 ml-2 pl-6">
                  <div className="relative"><div className="absolute -left-[31px] top-1 w-3 h-3 rounded-full bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.5)]" /><p className="text-[9px] font-black text-slate-500 uppercase">Commencer à</p><p className="text-lg font-black text-slate-100">{calculations.startTime}</p></div>
                  <div className="relative"><div className="absolute -left-[31px] top-1 w-3 h-3 rounded-full bg-blue-500" /><p className="text-[9px] font-black text-slate-500 uppercase">Sortie Frigo</p><p className="text-lg font-black text-slate-100">{calculations.takeOutTime}</p></div>
                  <div className="relative"><div className="absolute -left-[31px] top-1 w-3 h-3 rounded-full bg-green-500" /><p className="text-[9px] font-black text-slate-500 uppercase">Dégustation</p><p className="text-lg font-black text-slate-100">{calculator.targetDinnerTime}</p></div>
               </div>
            </Card>
          </div>
        </section>

        {/* Support */}
        <div className="flex justify-center pt-12">
          <a href="https://wa.me/2250555323890" target="_blank" className="group flex flex-col items-center gap-4 bg-slate-800/50 p-10 rounded-[2.5rem] border-2 border-orange-500/20 hover:border-orange-500 transition-all text-center max-w-md w-full shadow-2xl">
            <div className="flex gap-4"><MessageCircle className="w-10 h-10 text-green-400" /><Coffee className="w-10 h-10 text-orange-400" /></div>
            <p className="text-2xl font-black">Un petit café ? 🍕☕</p>
            <p className="text-xs text-slate-400 font-medium">Soutenez Pizzeo pour garder l'outil gratuit et sans pub.</p>
          </a>
        </div>

      </main>

      {/* Floating AI Button */}
      <div className="fixed bottom-8 right-8 z-[100]">
        <button onClick={() => setAiPanelOpen(true)} className="w-16 h-16 bg-orange-500 text-white rounded-full shadow-2xl flex items-center justify-center transition-all hover:scale-110 active:scale-90"><Sparkles className="w-7 h-7" /></button>
      </div>

      {/* AI Panel */}
      {aiPanelOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="w-full max-w-3xl bg-slate-900 rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col h-[80vh] border border-slate-700/50">
            <div className="p-8 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-orange-500 flex items-center justify-center shadow-lg"><Pizza className="w-7 h-7 text-white" /></div>
                <div><h2 className="text-lg font-black uppercase">Pizzeo AI</h2><p className="text-[9px] text-green-500 font-black tracking-widest uppercase">Assistant Neuronale</p></div>
              </div>
              <button onClick={() => setAiPanelOpen(false)} className="p-3 text-slate-500 hover:text-white transition-colors"><X className="w-6 h-6" /></button>
            </div>
            <div ref={scrollRef} className="flex-1 p-8 overflow-y-auto space-y-8 scrollbar-thin">
              {messages.length === 0 && <div className="h-full flex items-center justify-center text-slate-600 font-black uppercase text-[10px] tracking-[0.4em]">Prêt pour l'analyse...</div>}
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] p-6 rounded-3xl text-sm font-medium leading-relaxed shadow-lg ${m.role === 'user' ? 'bg-orange-500 text-white rounded-tr-none' : 'bg-slate-800 text-slate-100 rounded-tl-none'}`}>{m.content}</div>
                </div>
              ))}
              {isThinking && <div className="flex justify-start"><Loader2 className="w-6 h-6 text-orange-500 animate-spin" /></div>}
            </div>
            <div className="p-8 bg-slate-800/20 border-t border-slate-800">
              <div className="flex items-center gap-3 bg-slate-950 p-2 rounded-2xl border border-slate-700">
                <input type="text" value={inputValue} onChange={(e) => setInputValue(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()} placeholder="Une question ?" className="flex-1 bg-transparent border-none px-4 py-3 text-sm" />
                <button onClick={handleSendMessage} className="p-4 bg-orange-500 text-white rounded-xl shadow-lg"><Send className="w-5 h-5" /></button>
              </div>
            </div>
          </div>
        </div>
      )}
      <style>{`
        .glow-text { text-shadow: 0 0 30px rgba(249, 115, 22, 0.4); }
        .scrollbar-thin::-webkit-scrollbar { width: 4px; }
        .scrollbar-thin::-webkit-scrollbar-thumb { background: #334155; border-radius: 10px; }
        input[type=range]::-webkit-slider-thumb {
          -webkit-appearance: none;
          height: 24px; width: 24px;
          border-radius: 50%;
          background: #ffffff;
          border: 3px solid #f97316;
          cursor: pointer;
        }
      `}</style>
    </div>
  );
}
