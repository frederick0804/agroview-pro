import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import {
  Sun, Cloud, CloudRain, CloudSnow, Wind, Droplets,
  Thermometer, MapPin, Sparkles, Send, Bot, User,
  AlertTriangle, CheckCircle2, Loader2,
} from "lucide-react";

// ─── Weather simulation ───────────────────────────────────────────────────────

type WeatherCondition = "soleado" | "nublado" | "lluvia" | "viento" | "nevada";

interface WeatherState {
  condition: WeatherCondition;
  temp: number;
  humidity: number;
  windSpeed: number;
  sector: string;
}

const DEFAULT_WEATHER_SECTOR = "Quito, Ecuador";

const WEATHER_CONFIGS: Record<WeatherCondition, {
  Icon: React.FC<{ className?: string }>;
  label: string;
  bg: string;
  iconColor: string;
  tempRange: [number, number];
}> = {
  soleado: { Icon: Sun,        label: "Soleado",  bg: "from-amber-50 to-orange-50",   iconColor: "text-amber-500", tempRange: [22, 32] },
  nublado: { Icon: Cloud,      label: "Nublado",  bg: "from-slate-50 to-gray-100",    iconColor: "text-slate-400", tempRange: [14, 22] },
  lluvia:  { Icon: CloudRain,  label: "Lluvia",   bg: "from-blue-50 to-sky-100",      iconColor: "text-blue-500",  tempRange: [10, 18] },
  viento:  { Icon: Wind,       label: "Ventoso",  bg: "from-teal-50 to-cyan-50",      iconColor: "text-teal-500",  tempRange: [12, 20] },
  nevada:  { Icon: CloudSnow,  label: "Nevada",   bg: "from-sky-50 to-indigo-50",     iconColor: "text-sky-400",   tempRange: [0, 8]   },
};

function randomBetween(a: number, b: number) {
  return Math.round(a + Math.random() * (b - a));
}

function generateWeather(sectorHint?: string): WeatherState {
  const conditions: WeatherCondition[] = ["soleado", "nublado", "lluvia", "viento"];
  const condition = conditions[Math.floor(Math.random() * conditions.length)];
  const cfg = WEATHER_CONFIGS[condition];
  return {
    condition,
    temp:      randomBetween(...cfg.tempRange),
    humidity:  randomBetween(40, 90),
    windSpeed: randomBetween(5, 45),
    sector:    sectorHint || DEFAULT_WEATHER_SECTOR,
  };
}

// ─── Chat simulation ──────────────────────────────────────────────────────────

interface ChatMessage {
  id: string;
  role: "bot" | "user";
  text: string;
  typing?: boolean;
}

type CultivationVerdict = "recomendado" | "precaucion" | "no_recomendado";

function getCultivationVerdict(w: WeatherState): CultivationVerdict {
  if (w.condition === "lluvia" && w.humidity > 75) return "precaucion";
  if (w.condition === "nevada" || w.temp < 5) return "no_recomendado";
  if (w.windSpeed > 35) return "precaucion";
  if (w.condition === "soleado" && w.temp >= 18 && w.temp <= 30) return "recomendado";
  return "precaucion";
}

function buildInitialMessage(w: WeatherState): string {
  const verdict = getCultivationVerdict(w);
  const cond = WEATHER_CONFIGS[w.condition].label.toLowerCase();

  if (verdict === "recomendado") {
    return `¡Buenos días! Analizando las condiciones actuales en **${w.sector}**:\n\n🌡️ ${w.temp}°C · 💧 ${w.humidity}% humedad · 🌬️ ${w.windSpeed} km/h\n\n✅ **Las condiciones son favorables para cultivar hoy.** El clima ${cond} con temperatura óptima y viento moderado favorece el trabajo en campo y el crecimiento de los cultivos. Te recomiendo aprovechar la mañana para labores de siembra o trasplante.\n\n¿Tienes alguna consulta sobre tus cultivos?`;
  }
  if (verdict === "precaucion") {
    return `Hola, revisé el clima en **${w.sector}**:\n\n🌡️ ${w.temp}°C · 💧 ${w.humidity}% humedad · 🌬️ ${w.windSpeed} km/h\n\n⚠️ **Procede con precaución.** Las condiciones ${cond} podrían afectar algunas labores. Evita el riego excesivo si hay lluvia próxima y protege los cultivos más sensibles al viento.\n\n¿En qué puedo ayudarte hoy?`;
  }
  return `Revisé las condiciones en **${w.sector}**:\n\n🌡️ ${w.temp}°C · 💧 ${w.humidity}% humedad · 🌬️ ${w.windSpeed} km/h\n\n❌ **No recomiendo cultivar hoy.** Las condiciones actuales (${cond}, ${w.temp}°C) representan un riesgo para los cultivos. Es mejor esperar una mejora climática antes de realizar labores en campo.\n\n¿Necesitas información sobre protección de cultivos?`;
}

const QUICK_QUESTIONS = [
  "¿Qué cultivo puedo sembrar hoy?",
  "¿Cómo protejo del viento?",
  "¿Cuándo regar?",
  "¿Hay riesgo de heladas?",
];

function generateBotResponse(question: string, weather: WeatherState): string {
  const q = question.toLowerCase();
  const { condition, temp, humidity, windSpeed, sector } = weather;
  const verdict = getCultivationVerdict(weather);

  if (q.includes("sembrar") || q.includes("cultivar") || q.includes("plantar")) {
    if (verdict === "recomendado")
      return `En ${sector} con ${temp}°C y clima ${WEATHER_CONFIGS[condition].label.toLowerCase()}, las condiciones son ideales para sembrar cultivos de temporada media como tomate, pimiento o lechugas. Aprovecha las horas de la mañana (7–11am) para mayor eficiencia.`;
    if (verdict === "precaucion")
      return `Con las condiciones actuales en ${sector}, puedes sembrar cultivos resistentes como papa o zanahoria, pero evita especies delicadas. Monitorea la humedad del suelo antes de sembrar.`;
    return `No es recomendable sembrar hoy en ${sector} dadas las condiciones de ${temp}°C y ${WEATHER_CONFIGS[condition].label.toLowerCase()}. Espera al menos 24–48 horas para mejores condiciones.`;
  }

  if (q.includes("viento") || q.includes("proteg")) {
    if (windSpeed > 30)
      return `Con vientos de ${windSpeed} km/h en ${sector}, instala mallas cortaviento en los sectores más expuestos, asegura tutores en plantas altas y pospón las labores de pulverización para evitar deriva de productos.`;
    return `Los vientos actuales de ${windSpeed} km/h en ${sector} son moderados. Como medida preventiva, refuerza los tutores de cultivos en espaldera y verifica el anclaje de coberturas plásticas.`;
  }

  if (q.includes("regar") || q.includes("riego")) {
    if (condition === "lluvia" || humidity > 75)
      return `Con ${humidity}% de humedad relativa y precipitaciones en ${sector}, suspende el riego hoy. El suelo ya cuenta con humedad suficiente; regar en estas condiciones podría generar encharcamiento y problemas de hongos radiculares.`;
    if (temp > 28)
      return `Con ${temp}°C en ${sector}, el riego es prioritario. Riega en la mañana temprano (antes de las 9am) o al atardecer (después de las 6pm) para minimizar la evaporación. Aumenta la frecuencia un 20% respecto al programa habitual.`;
    return `Las condiciones en ${sector} permiten mantener el programa de riego normal. Con ${humidity}% de humedad y ${temp}°C, un riego cada 2–3 días según el tipo de cultivo es adecuado.`;
  }

  if (q.includes("helada") || q.includes("fría") || q.includes("frio") || q.includes("frío")) {
    if (temp < 5)
      return `⚠️ Alerta de helada en ${sector}. Con ${temp}°C hay riesgo real. Aplica cobertura plástica o agrotextil esta noche, activa el riego antiheladas si dispones del sistema, y retira el agua estancada en acequias para evitar daño por expansión.`;
    if (temp < 12)
      return `La temperatura en ${sector} (${temp}°C) se acerca a rangos críticos para cultivos sensibles. Prepara coberturas por si la temperatura baja en la noche, especialmente para cultivos tropicales o en floración.`;
    return `No hay riesgo de heladas en ${sector} con ${temp}°C. Las temperaturas están dentro de rangos seguros para la mayoría de los cultivos en esta época.`;
  }

  if (q.includes("plagas") || q.includes("enfermedad") || q.includes("hongo")) {
    if (humidity > 70 && (condition === "lluvia" || condition === "nublado"))
      return `⚠️ Alta probabilidad de hongos con ${humidity}% de humedad en ${sector}. Revisa la aparición de Botrytis, mildiu y antracnosis. Aplica fungicida preventivo en cultivos susceptibles y mejora la ventilación entre plantas si es posible.`;
    return `Con ${humidity}% de humedad en ${sector} las condiciones son controlables. Mantén el monitoreo preventivo de plagas (trips, ácaros en clima seco; pulgones en cambios bruscos) y asegura buena circulación de aire en el follaje.`;
  }

  if (q.includes("clima") || q.includes("pronóstico") || q.includes("mañana")) {
    return `El clima actual en **${sector}** es ${WEATHER_CONFIGS[condition].label.toLowerCase()} con ${temp}°C, ${humidity}% de humedad y vientos a ${windSpeed} km/h. Para los próximos días se esperan condiciones similares con pequeñas variaciones. Te recomiendo revisar el INAMHI para mayor precisión.`;
  }

  // Fallback genérico
  return `En **${sector}** con las condiciones actuales (${temp}°C, ${WEATHER_CONFIGS[condition].label.toLowerCase()}, ${humidity}% humedad), te recomiendo monitorear tus cultivos de cerca. ¿Tienes una consulta más específica sobre siembra, riego, plagas o protección climática?`;
}

// ─── Component ────────────────────────────────────────────────────────────────

interface WeatherChatWidgetProps {
  sectorHint?: string;
}

export function WeatherChatWidget({ sectorHint }: WeatherChatWidgetProps) {
  const [weather, setWeather] = useState<WeatherState>(() => generateWeather(sectorHint));
  const [now, setNow] = useState(new Date());
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [botTyping, setBotTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setWeather(generateWeather(sectorHint));
  }, [sectorHint]);

  // Clock tick
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Initial bot greeting
  useEffect(() => {
    setMessages([]);
    const timer = setTimeout(() => {
      setMessages([{
        id: "init",
        role: "bot",
        text: buildInitialMessage(weather),
      }]);
    }, 600);
    return () => clearTimeout(timer);
  }, [weather]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, botTyping]);

  const sendMessage = (text: string) => {
    if (!text.trim() || botTyping) return;
    const userMsg: ChatMessage = { id: String(Date.now()), role: "user", text: text.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setBotTyping(true);

    const delay = 900 + Math.random() * 800;
    setTimeout(() => {
      const response = generateBotResponse(text, weather);
      setMessages(prev => [...prev, { id: String(Date.now() + 1), role: "bot", text: response }]);
      setBotTyping(false);
    }, delay);
  };

  const verdict = getCultivationVerdict(weather);
  const cfg = WEATHER_CONFIGS[weather.condition];
  const WeatherIcon = cfg.Icon;

  const verdictConfig = {
    recomendado:    { icon: CheckCircle2,  color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-200", label: "Recomendado cultivar" },
    precaucion:     { icon: AlertTriangle, color: "text-amber-600",   bg: "bg-amber-50 border-amber-200",     label: "Proceder con precaución" },
    no_recomendado: { icon: AlertTriangle, color: "text-rose-600",    bg: "bg-rose-50 border-rose-200",       label: "No recomendado hoy" },
  }[verdict];
  const VerdictIcon = verdictConfig.icon;

  const timeStr = now.toLocaleTimeString("es-EC", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone: "America/Guayaquil",
  });
  const dateStr = now.toLocaleDateString("es-EC", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "America/Guayaquil",
  });

  // Render markdown-ish bold (**text**)
  const renderText = (text: string) =>
    text.split(/(\*\*[^*]+\*\*)/).map((part, i) =>
      part.startsWith("**") && part.endsWith("**")
        ? <strong key={i}>{part.slice(2, -2)}</strong>
        : <span key={i}>{part}</span>
    );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
      {/* ── Weather panel ── */}
      <div className={cn(
        "lg:col-span-2 rounded-xl border border-border overflow-hidden bg-gradient-to-br",
        cfg.bg,
      )}>
        {/* Date & time header */}
        <div className="px-4 pt-4 pb-2">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-2xl font-bold tabular-nums text-foreground tracking-tight">{timeStr}</p>
              <p className="text-xs text-muted-foreground capitalize mt-0.5">{dateStr}</p>
            </div>
            <div className={cn("p-2.5 rounded-xl bg-white/60 backdrop-blur-sm border border-white/80 shadow-sm")}>
              <WeatherIcon className={cn("w-7 h-7", cfg.iconColor)} />
            </div>
          </div>
        </div>

        {/* Location */}
        <div className="flex items-center gap-1.5 px-4 pb-3">
          <MapPin className="w-3 h-3 text-muted-foreground" />
          <span className="text-xs text-muted-foreground font-medium">{weather.sector}</span>
          <span className="text-xs text-muted-foreground/50 mx-1">·</span>
          <span className="text-xs font-semibold text-foreground">{cfg.label}</span>
        </div>

        {/* Main temp */}
        <div className="px-4 pb-3">
          <span className="text-5xl font-bold text-foreground tabular-nums">{weather.temp}°</span>
          <span className="text-lg text-muted-foreground ml-1">C</span>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-0 border-t border-white/50 divide-x divide-white/50">
          {[
            { Icon: Droplets,    label: "Humedad",   value: `${weather.humidity}%` },
            { Icon: Wind,        label: "Viento",    value: `${weather.windSpeed} km/h` },
            { Icon: Thermometer, label: "Sensación", value: `${weather.temp - 2}°C` },
          ].map(({ Icon, label, value }) => (
            <div key={label} className="flex flex-col items-center py-3 px-2 bg-white/30 backdrop-blur-sm">
              <Icon className="w-3.5 h-3.5 text-muted-foreground mb-1" />
              <p className="text-[10px] text-muted-foreground">{label}</p>
              <p className="text-xs font-semibold text-foreground">{value}</p>
            </div>
          ))}
        </div>

        {/* Verdict */}
        <div className={cn("mx-3 my-3 flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium", verdictConfig.bg)}>
          <VerdictIcon className={cn("w-3.5 h-3.5 shrink-0", verdictConfig.color)} />
          <span className={verdictConfig.color}>{verdictConfig.label}</span>
        </div>
      </div>

      {/* ── Chat panel ── */}
      <div className="lg:col-span-3 bg-card rounded-xl border border-border flex flex-col overflow-hidden" style={{ minHeight: 320 }}>
        {/* Header */}
        <div className="flex items-center gap-2.5 px-4 py-3 border-b border-border bg-muted/30 shrink-0">
          <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center shrink-0">
            <Sparkles className="w-3.5 h-3.5 text-primary-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-foreground">AgroAI</p>
            <p className="text-[10px] text-muted-foreground">Asistente agronómico inteligente</p>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] text-emerald-600 font-medium">En línea</span>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3" style={{ maxHeight: 260 }}>
          {messages.map(msg => (
            <div key={msg.id} className={cn("flex gap-2", msg.role === "user" ? "flex-row-reverse" : "flex-row")}>
              <div className={cn(
                "w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5",
                msg.role === "bot" ? "bg-primary/10" : "bg-primary",
              )}>
                {msg.role === "bot"
                  ? <Bot className="w-3 h-3 text-primary" />
                  : <User className="w-3 h-3 text-primary-foreground" />
                }
              </div>
              <div className={cn(
                "max-w-[80%] rounded-xl px-3 py-2 text-xs leading-relaxed",
                msg.role === "bot"
                  ? "bg-muted text-foreground rounded-tl-none"
                  : "bg-primary text-primary-foreground rounded-tr-none",
              )}>
                {msg.role === "bot"
                  ? <span className="whitespace-pre-line">{renderText(msg.text)}</span>
                  : msg.text
                }
              </div>
            </div>
          ))}

          {botTyping && (
            <div className="flex gap-2">
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                <Bot className="w-3 h-3 text-primary" />
              </div>
              <div className="bg-muted rounded-xl rounded-tl-none px-3 py-2">
                <Loader2 className="w-3.5 h-3.5 text-muted-foreground animate-spin" />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick questions */}
        {messages.length <= 1 && !botTyping && (
          <div className="px-4 pb-2 flex flex-wrap gap-1.5 shrink-0">
            {QUICK_QUESTIONS.map(q => (
              <button
                key={q}
                onClick={() => sendMessage(q)}
                className="text-[10px] px-2.5 py-1 rounded-full border border-primary/30 text-primary hover:bg-primary/10 transition-colors font-medium"
              >
                {q}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <div className="px-3 py-2.5 border-t border-border bg-background shrink-0">
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") sendMessage(input); }}
              placeholder="Pregunta sobre clima, cultivos, riego…"
              disabled={botTyping}
              className="flex-1 text-xs bg-muted rounded-lg px-3 py-2 outline-none border border-transparent focus:border-primary/40 transition-colors placeholder:text-muted-foreground/50 disabled:opacity-50"
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || botTyping}
              className="p-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
