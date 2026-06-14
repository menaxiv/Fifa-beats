import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Trophy, Star, BarChart3, ChevronRight,
  Zap, Users, Target, CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';

// ── Interactive prediction demo ────────────────────────────────────────────
const DEMO_MATCH = {
  home: { name: 'Argentina', flag: 'https://flagcdn.com/w40/ar.png', short: 'ARG' },
  away: { name: 'Francia', flag: 'https://flagcdn.com/w40/fr.png', short: 'FRA' },
  tournament: 'FIFA World Cup 2026',
  stage: 'Fase de grupos · Grupo J',
  venue: 'MetLife Stadium, New York',
};

function PredictionDemo() {
  const navigate = useNavigate();
  const [home, setHome] = useState(2);
  const [away, setAway] = useState(1);

  const winner =
    home > away ? DEMO_MATCH.home.name :
    home < away ? DEMO_MATCH.away.name :
    'Empate';

  return (
    <div className="relative rounded-2xl border bg-card shadow-2xl overflow-hidden">
      {/* Shimmer top bar */}
      <div className="h-1 w-full bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500" />

      <div className="p-5 space-y-4">
        {/* Tournament badge */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">{DEMO_MATCH.stage}</span>
          <Badge variant="outline" className="text-xs">🏆 {DEMO_MATCH.tournament}</Badge>
        </div>

        {/* Teams + score inputs */}
        <div className="flex items-center gap-3">
          {/* Home */}
          <div className="flex-1 flex flex-col items-center gap-2">
            <img src={DEMO_MATCH.home.flag} alt={DEMO_MATCH.home.name}
              className="h-8 rounded-sm shadow-sm" />
            <span className="text-sm font-bold">{DEMO_MATCH.home.short}</span>
            <Input
              type="number" min={0} max={20} value={home}
              onChange={(e) => setHome(Math.max(0, Math.min(20, Number(e.target.value))))}
              className="text-center text-2xl font-bold h-14 w-full [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
            />
          </div>

          <div className="text-muted-foreground font-bold text-xl mt-8">–</div>

          {/* Away */}
          <div className="flex-1 flex flex-col items-center gap-2">
            <img src={DEMO_MATCH.away.flag} alt={DEMO_MATCH.away.name}
              className="h-8 rounded-sm shadow-sm" />
            <span className="text-sm font-bold">{DEMO_MATCH.away.short}</span>
            <Input
              type="number" min={0} max={20} value={away}
              onChange={(e) => setAway(Math.max(0, Math.min(20, Number(e.target.value))))}
              className="text-center text-2xl font-bold h-14 w-full [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
            />
          </div>
        </div>

        {/* Live prediction feedback */}
        <div className="rounded-lg bg-muted px-4 py-3 space-y-1 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Ganador predicho</span>
            <span className="font-semibold">{winner}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">
              {home === away ? 'Marcador exacto' : 'Ganador correcto'}
            </span>
            <span className="font-bold text-green-600">
              {home === away ? '+10 pts' : '+5 pts'}
            </span>
          </div>
        </div>

        <Button
          className="w-full gap-2 font-semibold"
          onClick={() => navigate('/register')}
        >
          Confirmar predicción
          <ChevronRight className="h-4 w-4" />
        </Button>
        <p className="text-xs text-center text-muted-foreground">
          Crea tu cuenta gratis para guardarla
        </p>
      </div>
    </div>
  );
}

// ── Section: How it works ──────────────────────────────────────────────────
const STEPS = [
  {
    icon: Target,
    title: 'Predice el marcador',
    description:
      'Antes de cada partido ingresa tu predicción exacta. Tienes hasta 1 hora antes del pitazo inicial.',
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
  },
  {
    icon: Zap,
    title: 'Gana puntos',
    description:
      'Marcador exacto → +10 pts. Ganador correcto → +5 pts. Los puntos se acreditan automáticamente al finalizar.',
    color: 'text-yellow-500',
    bg: 'bg-yellow-500/10',
  },
  {
    icon: BarChart3,
    title: 'Sube en el ranking',
    description:
      'Compite contra todos los participantes en el ranking global en tiempo real. ¿Llegas al top 10?',
    color: 'text-green-500',
    bg: 'bg-green-500/10',
  },
];

// ── Section: Stats ─────────────────────────────────────────────────────────
const STATS = [
  { label: 'Partidos', value: '72', sub: 'fase de grupos' },
  { label: 'Equipos', value: '48', sub: 'naciones' },
  { label: 'Puntos máx.', value: '720', sub: 'si aciertas todo' },
  { label: 'Arranque', value: '11 Jun', sub: '2026' },
];

// ── Section: Points table ──────────────────────────────────────────────────
const POINTS = [
  { result: 'Marcador exacto', pts: '+10', icon: '🎯', variant: 'default' as const },
  { result: 'Ganador / empate correcto', pts: '+5', icon: '✅', variant: 'secondary' as const },
  { result: 'Predicción incorrecta', pts: '−2', icon: '❌', variant: 'destructive' as const },
];

// ── Main component ─────────────────────────────────────────────────────────
export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header className="fixed top-0 inset-x-0 z-50 h-16 border-b bg-background/80 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto h-full px-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <Trophy className="h-6 w-6 text-yellow-500" />
            <span className="text-xl font-bold tracking-tight">Beats</span>
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#como-funciona" className="hover:text-foreground transition-colors">Cómo funciona</a>
            <a href="#puntos" className="hover:text-foreground transition-colors">Puntuación</a>
          </nav>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/login">Iniciar sesión</Link>
            </Button>
            <Button size="sm" asChild>
              <Link to="/register">Registrarse gratis</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* ── Hero ───────────────────────────────────────────────────────── */}
      <section className="pt-16 min-h-screen flex items-center relative overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-yellow-500/5 pointer-events-none" />
        <div className="absolute top-1/4 right-0 w-96 h-96 bg-yellow-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-6xl mx-auto px-4 py-20 grid md:grid-cols-2 gap-12 items-center relative">
          {/* Left — copy */}
          <div className="space-y-6">
            <Badge variant="outline" className="gap-1.5 py-1 px-3 text-sm">
              <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
              FIFA World Cup 2026 — 72 partidos
            </Badge>

            <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight leading-[1.1]">
              Predice.
              <br />
              <span className="text-yellow-500">Compite.</span>
              <br />
              Gana.
            </h1>

            <p className="text-lg text-muted-foreground leading-relaxed max-w-md">
              El juego de predicciones del Mundial 2026. Adivina marcadores, acumula puntos y demuestra
              que eres el más pillo.
            </p>

            {/* Stats pills */}
            <div className="flex flex-wrap gap-2">
              {STATS.map((s) => (
                <div key={s.label} className="flex items-center gap-2 rounded-full border bg-muted/50 px-3 py-1.5 text-sm">
                  <span className="font-bold tabular-nums">{s.value}</span>
                  <span className="text-muted-foreground">{s.label}</span>
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button size="lg" className="gap-2 font-semibold text-base" asChild>
                <Link to="/register">
                  Crear cuenta gratis
                  <ChevronRight className="h-5 w-5" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link to="/login">Ya tengo cuenta</Link>
              </Button>
            </div>

            <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2">
              <span className="flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                Gratis
              </span>
              <span className="flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                Sin tarjeta
              </span>
              <span className="flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                Puntos iniciales incluidos
              </span>
            </div>
          </div>

          {/* Right — interactive demo */}
          <div className="w-full max-w-sm mx-auto">
            <p className="text-xs text-center text-muted-foreground mb-3 font-medium uppercase tracking-wider">
              Demo — prueba la predicción
            </p>
            <PredictionDemo />
          </div>
        </div>
      </section>

      {/* ── Divider ─────────────────────────────────────────────────────── */}
      <div className="border-y bg-muted/30">
        <div className="max-w-6xl mx-auto px-4 py-6 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {STATS.map((s) => (
            <div key={s.label}>
              <p className="text-3xl font-extrabold tabular-nums">{s.value}</p>
              <p className="text-sm text-muted-foreground">{s.label}</p>
              <p className="text-xs text-muted-foreground">{s.sub}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── How it works ────────────────────────────────────────────────── */}
      <section id="como-funciona" className="py-24 px-4">
        <div className="max-w-6xl mx-auto space-y-12">
          <div className="text-center space-y-3">
            <h2 className="text-3xl md:text-4xl font-bold">Cómo funciona</h2>
            <p className="text-muted-foreground max-w-lg mx-auto">
              Tres pasos para empezar a competir en el torneo de predicciones más grande del año.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {STEPS.map((step, i) => (
              <Card key={step.title} className="relative overflow-hidden">
                <CardContent className="p-6 space-y-4">
                  <div className={`inline-flex items-center justify-center h-12 w-12 rounded-xl ${step.bg}`}>
                    <step.icon className={`h-6 w-6 ${step.color}`} />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-muted-foreground">PASO {i + 1}</span>
                    </div>
                    <h3 className="text-lg font-bold">{step.title}</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">{step.description}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ── Points system ────────────────────────────────────────────────── */}
      <section id="puntos" className="py-24 px-4 bg-muted/30">
        <div className="max-w-4xl mx-auto space-y-12">
          <div className="text-center space-y-3">
            <h2 className="text-3xl md:text-4xl font-bold">Sistema de puntos</h2>
            <p className="text-muted-foreground max-w-lg mx-auto">
              Cada nueva cuenta empieza con 50 puntos de bienvenida. Apuesta con sabiduría.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            {POINTS.map((p) => (
              <Card key={p.result} className="text-center">
                <CardContent className="p-6 space-y-3">
                  <div className="text-4xl">{p.icon}</div>
                  <p className="text-sm text-muted-foreground">{p.result}</p>
                  <p className={`text-3xl font-extrabold tabular-nums ${
                    p.pts.startsWith('+') ? 'text-green-600' : 'text-destructive'
                  }`}>{p.pts}</p>
                  <p className="text-xs text-muted-foreground">puntos</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="rounded-xl border bg-card p-6 flex flex-col sm:flex-row items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-yellow-500/10 flex items-center justify-center shrink-0">
              <Star className="h-6 w-6 text-yellow-500" />
            </div>
            <div className="flex-1 text-center sm:text-left">
              <p className="font-semibold">Bono de bienvenida: 50 puntos</p>
              <p className="text-sm text-muted-foreground">
                Todos los usuarios nuevos reciben 50 puntos automáticamente al registrarse.
              </p>
            </div>
            <Button asChild>
              <Link to="/register">Reclamar ahora</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ── CTA final ────────────────────────────────────────────────────── */}
      <section className="py-24 px-4">
        <div className="max-w-2xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-yellow-500/10 mx-auto">
            <Trophy className="h-8 w-8 text-yellow-500" />
          </div>
          <h2 className="text-4xl font-extrabold">¿Listo para el reto?</h2>
          <p className="text-muted-foreground text-lg">
            El Mundial 2026 ya empezó. Regístrate ahora, predice todos los partidos que quedan
            y trepa al ranking.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button size="lg" className="gap-2 font-semibold text-base" asChild>
              <Link to="/register">
                Crear cuenta gratis
                <ChevronRight className="h-5 w-5" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link to="/login">Iniciar sesión</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="border-t bg-muted/30 mt-auto">
        <div className="max-w-6xl mx-auto px-4 py-10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              <span className="font-bold tracking-tight">Beats</span>
              <span className="text-muted-foreground text-sm ml-2">
                Predicciones deportivas
              </span>
            </div>

            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <Link to="/login" className="hover:text-foreground transition-colors">Iniciar sesión</Link>
              <Link to="/register" className="hover:text-foreground transition-colors">Registrarse</Link>
              <a href="#como-funciona" className="hover:text-foreground transition-colors">Cómo funciona</a>
            </div>
          </div>

          <Separator className="my-6" />

          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
            <p>© 2026 Beats · Todos los derechos reservados</p>
            <p className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              Datos oficiales · FIFA World Cup 2026
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
