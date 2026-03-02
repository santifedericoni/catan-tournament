import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Divider,
} from '@mui/material';
import { useSocket } from '../../hooks/useSocket';

// ─── Constants ──────────────────────────────────────────────────────────────
const TIMER_SECONDS = 120;
const ROLL_ANIMATION_MS = 800;
const ROLL_TICK_MS = 60; // how fast the numbers cycle during animation

// ─── Dice SVG ────────────────────────────────────────────────────────────────
const DOT_POSITIONS: Record<number, [number, number][]> = {
  1: [[50, 50]],
  2: [[28, 28], [72, 72]],
  3: [[28, 28], [50, 50], [72, 72]],
  4: [[28, 28], [72, 28], [28, 72], [72, 72]],
  5: [[28, 28], [72, 28], [50, 50], [28, 72], [72, 72]],
  6: [[28, 22], [72, 22], [28, 50], [72, 50], [28, 78], [72, 78]],
};

function DieFace({ value, rolling }: { value: number; rolling: boolean }) {
  const dots = DOT_POSITIONS[value] ?? [];
  return (
    <Box
      sx={{
        width: 72,
        height: 72,
        borderRadius: 2.5,
        bgcolor: rolling ? 'primary.dark' : 'background.paper',
        border: '2px solid',
        borderColor: rolling ? 'primary.main' : 'divider',
        boxShadow: rolling
          ? '0 0 20px 6px rgba(212,160,23,0.45)'
          : '0 3px 8px rgba(0,0,0,0.3)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        transition: 'background-color 0.15s, border-color 0.15s, box-shadow 0.15s',
        // Spin animation: rotate Y axis like a physical die flipping
        animation: rolling ? 'diceFlip 0.18s linear infinite' : 'none',
        '@keyframes diceFlip': {
          '0%':   { transform: 'rotateY(0deg) scale(1.08)' },
          '25%':  { transform: 'rotateY(90deg) scale(0.92)' },
          '50%':  { transform: 'rotateY(180deg) scale(1.06)' },
          '75%':  { transform: 'rotateY(270deg) scale(0.94)' },
          '100%': { transform: 'rotateY(360deg) scale(1.08)' },
        },
        perspective: '200px',
      }}
    >
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 100 100"
        style={{ opacity: rolling ? 0.7 : 1, transition: 'opacity 0.1s' }}
      >
        {dots.map(([cx, cy], i) => (
          <circle
            key={i}
            cx={cx}
            cy={cy}
            r={9}
            fill={rolling ? 'rgba(255,255,255,0.9)' : 'currentColor'}
            opacity={0.9}
          />
        ))}
      </svg>
    </Box>
  );
}

// ─── Histogram ───────────────────────────────────────────────────────────────
// Theoretical probabilities for sums 2–12 with 2d6
const THEORETICAL_PROBS = [1, 2, 3, 4, 5, 6, 5, 4, 3, 2, 1].map((n) => n / 36);

function DiceHistogram({ counts }: { counts: number[] }) {
  const labels = Array.from({ length: 11 }, (_, i) => i + 2);
  const total = counts.reduce((a, b) => a + b, 0);
  const maxCount = Math.max(...counts, 1);

  // SVG histogram dimensions
  const W = 280;
  const H = 100;
  const barCount = 11;
  const barW = W / barCount;
  const pad = 2;

  // Theoretical curve: scale so max theoretical == chart height
  const maxTheoretical = Math.max(...THEORETICAL_PROBS); // 6/36
  const curvePoints = THEORETICAL_PROBS.map((p, i) => {
    const x = i * barW + barW / 2;
    const y = H - (p / maxTheoretical) * H;
    return `${x},${y}`;
  }).join(' ');

  return (
    <Box>
      {/* SVG chart */}
      <Box sx={{ position: 'relative' }}>
        <svg
          width="100%"
          viewBox={`0 0 ${W} ${H}`}
          style={{ overflow: 'visible', display: 'block' }}
        >
          {/* Bars */}
          {labels.map((n, i) => {
            const count = counts[i];
            const heightPct = count / maxCount;
            const barH = Math.max(heightPct * H, count > 0 ? 4 : 0);
            const x = i * barW + pad;
            const y = H - barH;
            const isHot = n === 7;
            const isWarm = n === 6 || n === 8;
            const fill = isHot ? '#f44336' : isWarm ? '#ff9800' : '#1976d2';
            return (
              <g key={n}>
                <title>{`${n}: ${count} ${count === 1 ? 'vez' : 'veces'}`}</title>
                <rect
                  x={x}
                  y={y}
                  width={barW - pad * 2}
                  height={barH}
                  fill={fill}
                  opacity={count === 0 ? 0.12 : 0.85}
                  rx={2}
                  style={{ transition: 'height 0.45s cubic-bezier(0.34,1.4,0.64,1), y 0.45s cubic-bezier(0.34,1.4,0.64,1)' }}
                />
                {/* Count label above bar */}
                {count > 0 && (
                  <text
                    x={i * barW + barW / 2}
                    y={y - 3}
                    textAnchor="middle"
                    fontSize={8}
                    fill="currentColor"
                    opacity={0.6}
                  >
                    {count}
                  </text>
                )}
              </g>
            );
          })}

          {/* Theoretical Gaussian curve */}
          {total >= 3 && (
            <polyline
              points={curvePoints}
              fill="none"
              stroke="rgba(255,255,255,0.5)"
              strokeWidth={1.5}
              strokeDasharray="3 2"
            />
          )}

          {/* Axis line */}
          <line x1={0} y1={H} x2={W} y2={H} stroke="currentColor" strokeOpacity={0.15} strokeWidth={1} />
        </svg>
      </Box>

      {/* X-axis labels */}
      <Box sx={{ display: 'flex', mt: '2px' }}>
        {labels.map((n) => (
          <Typography
            key={n}
            variant="caption"
            sx={{ flex: 1, textAlign: 'center', fontSize: '0.58rem', color: 'text.secondary', lineHeight: 1 }}
          >
            {n}
          </Typography>
        ))}
      </Box>

      {/* Legend + total */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5, alignItems: 'center' }}>
        {total >= 3 && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box
              component="span"
              sx={{
                display: 'inline-block',
                width: 16,
                borderTop: '1.5px dashed rgba(255,255,255,0.5)',
                verticalAlign: 'middle',
              }}
            />
            <Typography variant="caption" sx={{ fontSize: '0.58rem', color: 'text.disabled' }}>
              curva teórica
            </Typography>
          </Box>
        )}
        {total > 0 && (
          <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.6rem', ml: 'auto' }}>
            {total} tiro{total !== 1 ? 's' : ''}
          </Typography>
        )}
      </Box>
    </Box>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
interface TableGameToolsProps {
  tournamentId: string;
  tableId: string;
}

export function TableGameTools({ tournamentId, tableId }: TableGameToolsProps) {
  const { on, emit } = useSocket(tournamentId);

  // Dice state
  // displayDice cycles randomly during animation; dice holds the final values
  const [dice, setDice] = useState<[number, number]>([1, 1]);
  const [displayDice, setDisplayDice] = useState<[number, number]>([1, 1]);
  const [rolling, setRolling] = useState(false);
  const [hasRolled, setHasRolled] = useState(false);
  const [counts, setCounts] = useState<number[]>(Array(11).fill(0));
  const rollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rollTickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Timer state
  const [timeLeft, setTimeLeft] = useState(TIMER_SECONDS);
  const [timerRunning, setTimerRunning] = useState(false);
  const timerStartedAtRef = useRef<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Timer helpers ──
  const stopInterval = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const startCountdown = useCallback((startedAt: number) => {
    stopInterval();
    timerStartedAtRef.current = startedAt;
    setTimerRunning(true);
    intervalRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startedAt) / 1000);
      const remaining = Math.max(0, TIMER_SECONDS - elapsed);
      setTimeLeft(remaining);
      if (remaining === 0) {
        stopInterval();
        setTimerRunning(false);
      }
    }, 250);
  }, []);

  // ── Socket listeners ──
  useEffect(() => {
    const unsubDice = on('table_dice_roll', (raw) => {
      const data = raw as { tableId: string; dice1: number; dice2: number };
      if (data.tableId !== tableId) return;

      // Start cycling animation
      setRolling(true);
      if (rollTickRef.current) clearInterval(rollTickRef.current);
      if (rollTimeoutRef.current) clearTimeout(rollTimeoutRef.current);

      rollTickRef.current = setInterval(() => {
        setDisplayDice([
          Math.ceil(Math.random() * 6),
          Math.ceil(Math.random() * 6),
        ]);
      }, ROLL_TICK_MS);

      // After animation: snap to final values
      rollTimeoutRef.current = setTimeout(() => {
        if (rollTickRef.current) clearInterval(rollTickRef.current);
        setDisplayDice([data.dice1, data.dice2]);
        setDice([data.dice1, data.dice2]);
        setHasRolled(true);
        setRolling(false);
        setCounts((prev) => {
          const next = [...prev];
          next[data.dice1 + data.dice2 - 2] += 1;
          return next;
        });
      }, ROLL_ANIMATION_MS);
    });

    const unsubStart = on('table_timer_start', (raw) => {
      const data = raw as { tableId: string; startedAt: number };
      if (data.tableId !== tableId) return;
      startCountdown(data.startedAt);
    });

    const unsubReset = on('table_timer_reset', (raw) => {
      const data = raw as { tableId: string };
      if (data.tableId !== tableId) return;
      stopInterval();
      setTimerRunning(false);
      setTimeLeft(TIMER_SECONDS);
      timerStartedAtRef.current = null;
    });

    return () => {
      unsubDice();
      unsubStart();
      unsubReset();
    };
  }, [on, tableId, startCountdown]);

  useEffect(() => () => {
    stopInterval();
    if (rollTimeoutRef.current) clearTimeout(rollTimeoutRef.current);
    if (rollTickRef.current) clearInterval(rollTickRef.current);
  }, []);

  // ── Actions ──
  const handleRoll = () => {
    if (rolling) return;
    const d1 = Math.ceil(Math.random() * 6);
    const d2 = Math.ceil(Math.random() * 6);
    emit('table_dice_roll', { tournamentId, tableId, dice1: d1, dice2: d2 });
  };

  const handleTimerStart = () => {
    if (timerRunning || timeLeft === 0) return;
    emit('table_timer_start', { tournamentId, tableId, startedAt: Date.now() });
  };

  const handleTimerReset = () => {
    emit('table_timer_reset', { tournamentId, tableId });
  };

  // ── Display ──
  const mins = String(Math.floor(timeLeft / 60)).padStart(2, '0');
  const secs = String(timeLeft % 60).padStart(2, '0');
  const timerColor =
    timeLeft <= 30 ? 'error.main' : timeLeft <= 60 ? 'warning.main' : 'text.primary';
  const total = hasRolled ? dice[0] + dice[1] : null;

  return (
    <Card variant="outlined" sx={{ mt: 2 }}>
      <CardContent sx={{ p: '16px !important' }}>

        {/* ── Timer ── */}
        <Box sx={{ textAlign: 'center', mb: 2 }}>
          <Typography variant="caption" color="text.secondary" display="block" mb={0.5} fontWeight={600} letterSpacing={1} textTransform="uppercase">
            Timer
          </Typography>
          <Typography
            variant="h3"
            fontWeight={700}
            color={timerColor}
            sx={{ fontVariantNumeric: 'tabular-nums', letterSpacing: 4, transition: 'color 0.5s' }}
          >
            {mins}:{secs}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center', mt: 1 }}>
            <Button size="small" variant="contained" onClick={handleTimerStart} disabled={timerRunning || timeLeft === 0}>
              Iniciar
            </Button>
            <Button size="small" variant="outlined" onClick={handleTimerReset}>
              Reset
            </Button>
          </Box>
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* ── Dice ── */}
        <Box sx={{ textAlign: 'center', mb: 2 }}>
          <Typography variant="caption" color="text.secondary" display="block" mb={1} fontWeight={600} letterSpacing={1} textTransform="uppercase">
            Dados
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mb: 1 }}>
            <DieFace value={displayDice[0]} rolling={rolling} />
            <DieFace value={displayDice[1]} rolling={rolling} />
          </Box>
          <Box sx={{ minHeight: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {total !== null && !rolling && (
              <Typography variant="h5" fontWeight={700} color="primary.main">
                = {total}
              </Typography>
            )}
          </Box>
          <Button variant="contained" onClick={handleRoll} disabled={rolling} sx={{ mt: 0.5 }}>
            {rolling ? 'Tirando...' : 'Tirar dados'}
          </Button>
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* ── Histogram ── */}
        <Box>
          <Typography variant="caption" color="text.secondary" display="block" mb={1} fontWeight={600} letterSpacing={1} textTransform="uppercase">
            Historial de tiros
          </Typography>
          <DiceHistogram counts={counts} />
        </Box>

      </CardContent>
    </Card>
  );
}
