import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Divider,
  Grid,
} from '@mui/material';
import { useSocket } from '../../hooks/useSocket';
import { useTranslation } from '../../hooks/useTranslation';

// ─── Constants ──────────────────────────────────────────────────────────────
const TIMER_SECONDS = 120;
const ROLL_ANIMATION_MS = 800;
const ROLL_TICK_MS = 60;

// ─── Dice SVG ────────────────────────────────────────────────────────────────
const DOT_POSITIONS: Record<number, [number, number][]> = {
  1: [[50, 50]],
  2: [[28, 28], [72, 72]],
  3: [[28, 28], [50, 50], [72, 72]],
  4: [[28, 28], [72, 28], [28, 72], [72, 72]],
  5: [[28, 28], [72, 28], [50, 50], [28, 72], [72, 72]],
  6: [[28, 22], [72, 22], [28, 50], [72, 50], [28, 78], [72, 78]],
};

function DieFace({ value, rolling, size = 72 }: { value: number; rolling: boolean; size?: number }) {
  const dots = DOT_POSITIONS[value] ?? [];
  return (
    <Box
      sx={{
        width: size,
        height: size,
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
        flexShrink: 0,
        transition: 'background-color 0.15s, border-color 0.15s, box-shadow 0.15s',
        animation: rolling ? 'diceFlip 0.18s linear infinite' : 'none',
        '@keyframes diceFlip': {
          '0%':   { transform: 'rotateY(0deg) scale(1.08)' },
          '25%':  { transform: 'rotateY(90deg) scale(0.92)' },
          '50%':  { transform: 'rotateY(180deg) scale(1.06)' },
          '75%':  { transform: 'rotateY(270deg) scale(0.94)' },
          '100%': { transform: 'rotateY(360deg) scale(1.08)' },
        },
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
const THEORETICAL_PROBS = [1, 2, 3, 4, 5, 6, 5, 4, 3, 2, 1].map((n) => n / 36);

function DiceHistogram({ counts, timesOne, timesMany, theoreticalCurve }: { counts: number[]; timesOne: string; timesMany: string; theoreticalCurve: string }) {
  const labels = Array.from({ length: 11 }, (_, i) => i + 2);
  const total = counts.reduce((a, b) => a + b, 0);
  const maxCount = Math.max(...counts, 1);

  const W = 300;
  const H = 120;
  const barW = W / 11;
  const pad = 2;
  const maxTheoretical = Math.max(...THEORETICAL_PROBS);
  const curvePoints = THEORETICAL_PROBS.map((p, i) => {
    const x = i * barW + barW / 2;
    const y = H - (p / maxTheoretical) * H;
    return `${x},${y}`;
  }).join(' ');

  return (
    <Box>
      <Box sx={{ position: 'relative' }}>
        <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ overflow: 'visible', display: 'block' }}>
          {labels.map((n, i) => {
            const count = counts[i];
            const barH = Math.max((count / maxCount) * H, count > 0 ? 4 : 0);
            const x = i * barW + pad;
            const y = H - barH;
            const isHot = n === 7;
            const isWarm = n === 6 || n === 8;
            const fill = isHot ? '#f44336' : isWarm ? '#ff9800' : '#1976d2';
            return (
              <g key={n}>
                <title>{`${n}: ${count} ${count === 1 ? timesOne : timesMany}`}</title>
                <rect
                  x={x} y={y}
                  width={barW - pad * 2} height={barH}
                  fill={fill} opacity={count === 0 ? 0.12 : 0.85} rx={2}
                  style={{ transition: 'height 0.45s cubic-bezier(0.34,1.4,0.64,1), y 0.45s cubic-bezier(0.34,1.4,0.64,1)' }}
                />
                {count > 0 && (
                  <text x={i * barW + barW / 2} y={y - 3} textAnchor="middle" fontSize={8} fill="currentColor" opacity={0.6}>
                    {count}
                  </text>
                )}
              </g>
            );
          })}
          {total >= 3 && (
            <polyline
              points={curvePoints}
              fill="none"
              stroke="rgba(255,255,255,0.45)"
              strokeWidth={1.5}
              strokeDasharray="3 2"
            />
          )}
          <line x1={0} y1={H} x2={W} y2={H} stroke="currentColor" strokeOpacity={0.15} strokeWidth={1} />
        </svg>
      </Box>

      <Box sx={{ display: 'flex', mt: '2px' }}>
        {labels.map((n) => (
          <Typography key={n} variant="caption" sx={{ flex: 1, textAlign: 'center', fontSize: '0.58rem', color: 'text.secondary', lineHeight: 1 }}>
            {n}
          </Typography>
        ))}
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5, alignItems: 'center' }}>
        {total >= 3 && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box component="span" sx={{ display: 'inline-block', width: 16, borderTop: '1.5px dashed rgba(255,255,255,0.45)', verticalAlign: 'middle' }} />
            <Typography variant="caption" sx={{ fontSize: '0.58rem', color: 'text.disabled' }}>{theoreticalCurve}</Typography>
          </Box>
        )}
        {total > 0 && (
          <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.6rem', ml: 'auto' }}>
            {total} {total !== 1 ? timesMany : timesOne}
          </Typography>
        )}
      </Box>
    </Box>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
interface SeatInfo {
  seatNumber: number;
  userId?: string;
  guestPlayerId?: string;
  displayName: string;
}

interface TableGameToolsProps {
  tournamentId: string;
  tableId: string;
  seats: SeatInfo[];
  currentUserId?: string;
}

export function TableGameTools({ tournamentId, tableId, seats, currentUserId }: TableGameToolsProps) {
  const { on, emit } = useSocket(tournamentId);
  const { t } = useTranslation();

  // ── Turn state ──────────────────────────────────────────────────────────────
  const [activeSeatNumber, setActiveSeatNumber] = useState(1);
  const [rolledThisTurn, setRolledThisTurn] = useState(false);

  const sortedSeats = [...seats].sort((a, b) => a.seatNumber - b.seatNumber);
  const mySeat = sortedSeats.find((s) => s.userId && s.userId === currentUserId);
  const isMyTurn = !!mySeat && mySeat.seatNumber === activeSeatNumber;
  const activePlayer = sortedSeats.find((s) => s.seatNumber === activeSeatNumber);

  const handlePassTurn = () => {
    if (!isMyTurn || !rolledThisTurn) return;
    const nextSeat = (activeSeatNumber % sortedSeats.length) + 1;
    emit('table_turn_state', { tournamentId, tableId, activeSeatNumber: nextSeat, rolledThisTurn: false });
  };

  const [dice, setDice] = useState<[number, number]>([1, 1]);
  const [displayDice, setDisplayDice] = useState<[number, number]>([1, 1]);
  const [rolling, setRolling] = useState(false);
  const [hasRolled, setHasRolled] = useState(false);
  const [counts, setCounts] = useState<number[]>(Array(11).fill(0));
  const rollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rollTickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [timeLeft, setTimeLeft] = useState(TIMER_SECONDS);
  const [timerRunning, setTimerRunning] = useState(false);
  const timerStartedAtRef = useRef<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const alertPlayedRef = useRef(false);

  // Three short alarm beeps at 30s remaining
  const playAlertSound = useCallback(() => {
    try {
      const ctx = new AudioContext();
      const beepCount = 3;
      const beepDuration = 0.18;
      const beepGap = 0.12;
      for (let i = 0; i < beepCount; i++) {
        const t = ctx.currentTime + i * (beepDuration + beepGap);
        const gain = ctx.createGain();
        gain.connect(ctx.destination);
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.55, t + 0.01);
        gain.gain.setValueAtTime(0.55, t + beepDuration - 0.02);
        gain.gain.linearRampToValueAtTime(0, t + beepDuration);
        const osc = ctx.createOscillator();
        osc.type = 'square';
        osc.frequency.setValueAtTime(1050, t);
        osc.connect(gain);
        osc.start(t);
        osc.stop(t + beepDuration);
        if (i === beepCount - 1) osc.onended = () => ctx.close();
      }
    } catch {
      // Web Audio API not available
    }
  }, []);

  // Strident alarm when turn ends (0s)
  const playEndSound = useCallback(() => {
    try {
      const ctx = new AudioContext();
      const beepCount = 5;
      const beepDuration = 0.15;
      const beepGap = 0.08;
      for (let i = 0; i < beepCount; i++) {
        const t = ctx.currentTime + i * (beepDuration + beepGap);
        const gain = ctx.createGain();
        gain.connect(ctx.destination);
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.75, t + 0.008);
        gain.gain.setValueAtTime(0.75, t + beepDuration - 0.015);
        gain.gain.linearRampToValueAtTime(0, t + beepDuration);
        const osc = ctx.createOscillator();
        osc.type = 'sawtooth';
        // Alternates between two tones for more strident feel
        osc.frequency.setValueAtTime(i % 2 === 0 ? 1400 : 1100, t);
        osc.connect(gain);
        osc.start(t);
        osc.stop(t + beepDuration);
        if (i === beepCount - 1) osc.onended = () => ctx.close();
      }
    } catch {
      // Web Audio API not available
    }
  }, []);

  const stopInterval = () => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
  };

  const startCountdown = useCallback((startedAt: number) => {
    stopInterval();
    timerStartedAtRef.current = startedAt;
    alertPlayedRef.current = false;
    setTimerRunning(true);
    intervalRef.current = setInterval(() => {
      const remaining = Math.max(0, TIMER_SECONDS - Math.floor((Date.now() - startedAt) / 1000));
      setTimeLeft(remaining);
      if (remaining === 30 && !alertPlayedRef.current) {
        alertPlayedRef.current = true;
        playAlertSound();
      }
      if (remaining === 0) { stopInterval(); setTimerRunning(false); playEndSound(); }
    }, 250);
  }, [playAlertSound, playEndSound]);

  useEffect(() => {
    const unsubDice = on('table_dice_roll', (raw) => {
      const data = raw as { tableId: string; dice1: number; dice2: number };
      if (data.tableId !== tableId) return;
      setRolling(true);
      if (rollTickRef.current) clearInterval(rollTickRef.current);
      if (rollTimeoutRef.current) clearTimeout(rollTimeoutRef.current);
      rollTickRef.current = setInterval(() => {
        setDisplayDice([Math.ceil(Math.random() * 6), Math.ceil(Math.random() * 6)]);
      }, ROLL_TICK_MS);
      rollTimeoutRef.current = setTimeout(() => {
        if (rollTickRef.current) clearInterval(rollTickRef.current);
        setDisplayDice([data.dice1, data.dice2]);
        setDice([data.dice1, data.dice2]);
        setHasRolled(true);
        setRolling(false);
        setCounts((prev) => { const next = [...prev]; next[data.dice1 + data.dice2 - 2] += 1; return next; });
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
      stopInterval(); setTimerRunning(false); setTimeLeft(TIMER_SECONDS); timerStartedAtRef.current = null; alertPlayedRef.current = false;
    });

    const unsubTurn = on('table_turn_state', (raw) => {
      const data = raw as { tableId: string; activeSeatNumber: number; rolledThisTurn: boolean };
      if (data.tableId !== tableId) return;
      setActiveSeatNumber(data.activeSeatNumber);
      setRolledThisTurn(data.rolledThisTurn);
    });

    return () => { unsubDice(); unsubStart(); unsubReset(); unsubTurn(); };
  }, [on, tableId, startCountdown]);

  useEffect(() => () => {
    stopInterval();
    if (rollTimeoutRef.current) clearTimeout(rollTimeoutRef.current);
    if (rollTickRef.current) clearInterval(rollTickRef.current);
  }, []);

  const handleRoll = () => {
    if (rolling || !isMyTurn || rolledThisTurn) return;
    const d1 = Math.ceil(Math.random() * 6);
    const d2 = Math.ceil(Math.random() * 6);
    emit('table_dice_roll', { tournamentId, tableId, dice1: d1, dice2: d2 });
    emit('table_turn_state', { tournamentId, tableId, activeSeatNumber, rolledThisTurn: true });
  };

  // Register a physical dice result (no animation, just counts the number)
  const handleManualResult = (sum: number) => {
    setCounts((prev) => { const next = [...prev]; next[sum - 2] += 1; return next; });
    setHasRolled(true);
    setDice([1, 1]); // reset display dice to neutral (physical roll)
    setDisplayDice([1, 1]);
  };

  const handleTimerStart = () => {
    if (timerRunning || timeLeft === 0) return;
    emit('table_timer_start', { tournamentId, tableId, startedAt: Date.now() });
  };

  const handleTimerReset = () => {
    emit('table_timer_reset', { tournamentId, tableId });
  };

  const mins = String(Math.floor(timeLeft / 60)).padStart(2, '0');
  const secs = String(timeLeft % 60).padStart(2, '0');
  const timerColor = timeLeft <= 30 ? 'error.main' : timeLeft <= 60 ? 'warning.main' : 'text.primary';
  const total = hasRolled ? dice[0] + dice[1] : null;

  const SECTION_LABEL = { color: 'text.secondary', fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase' as const, fontSize: '0.7rem', mb: 1, display: 'block' };

  return (
    <Card variant="outlined" sx={{ mt: 0 }}>
      <CardContent sx={{ p: '20px !important' }}>
        <Grid container spacing={3} alignItems="flex-start">

          {/* ── Timer ── */}
          <Grid item xs={12} sm={4}>
            <Typography variant="caption" sx={SECTION_LABEL}>{t.tableGameTools.timer}</Typography>
            <Typography
              variant="h2"
              fontWeight={700}
              color={timerColor}
              sx={{ fontVariantNumeric: 'tabular-nums', letterSpacing: 4, transition: 'color 0.5s', lineHeight: 1, mb: 1.5 }}
            >
              {mins}:{secs}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button size="small" variant="contained" onClick={handleTimerStart} disabled={timerRunning || timeLeft === 0}>
                {t.tableGameTools.start}
              </Button>
              <Button size="small" variant="outlined" onClick={handleTimerReset}>
                {t.tableGameTools.reset}
              </Button>
            </Box>
          </Grid>

          <Divider orientation="vertical" flexItem sx={{ mx: 1, display: { xs: 'none', sm: 'block' } }} />
          <Divider sx={{ width: '100%', display: { xs: 'block', sm: 'none' } }} />

          {/* ── Dice ── */}
          <Grid item xs={12} sm>
            <Typography variant="caption" sx={SECTION_LABEL}>{t.tableGameTools.dice}</Typography>

            {/* Turn indicator */}
            {sortedSeats.length > 0 && (
              <Box sx={{ mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box
                  sx={{
                    px: 1.5, py: 0.4,
                    borderRadius: 2,
                    bgcolor: isMyTurn ? 'primary.main' : 'action.selected',
                    color: isMyTurn ? 'primary.contrastText' : 'text.secondary',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    transition: 'background-color 0.3s',
                  }}
                >
                  {isMyTurn ? t.tableGameTools.yourTurn : `${t.tableGameTools.turnOf} ${activePlayer?.displayName ?? '?'}`}
                </Box>
              </Box>
            )}

            {/* App dice */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1.5 }}>
              <DieFace value={displayDice[0]} rolling={rolling} />
              <DieFace value={displayDice[1]} rolling={rolling} />
              <Box sx={{ minWidth: 40 }}>
                {total !== null && !rolling && (
                  <Typography variant="h5" fontWeight={700} color="primary.main">= {total}</Typography>
                )}
              </Box>
            </Box>
            <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
              <Button
                variant="contained"
                size="small"
                onClick={handleRoll}
                disabled={rolling || !isMyTurn || rolledThisTurn}
                title={!isMyTurn ? t.tableGameTools.waitYourTurn : undefined}
              >
                {rolling ? t.tableGameTools.rolling : t.tableGameTools.rollDice}
              </Button>
              {isMyTurn && rolledThisTurn && (
                <Button variant="outlined" size="small" onClick={handlePassTurn}>
                  {t.tableGameTools.passTurn}
                </Button>
              )}
            </Box>

            <Divider sx={{ mb: 1.5 }} />

            {/* Manual entry */}
            <Typography variant="caption" sx={{ ...SECTION_LABEL, mb: 0.75 }}>
              {t.tableGameTools.loadPhysical}
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {Array.from({ length: 11 }, (_, i) => i + 2).map((n) => {
                const isHot = n === 7;
                const isWarm = n === 6 || n === 8;
                return (
                  <Button
                    key={n}
                    size="small"
                    variant="outlined"
                    onClick={() => handleManualResult(n)}
                    sx={{
                      minWidth: 36,
                      px: 0.5,
                      py: 0.25,
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      borderColor: isHot ? 'error.main' : isWarm ? 'warning.main' : 'divider',
                      color: isHot ? 'error.main' : isWarm ? 'warning.main' : 'text.primary',
                      '&:hover': {
                        bgcolor: isHot ? 'error.main' : isWarm ? 'warning.main' : 'primary.main',
                        color: 'white',
                        borderColor: 'transparent',
                      },
                    }}
                  >
                    {n}
                  </Button>
                );
              })}
            </Box>
          </Grid>

          <Divider orientation="vertical" flexItem sx={{ mx: 1, display: { xs: 'none', sm: 'block' } }} />
          <Divider sx={{ width: '100%', display: { xs: 'block', sm: 'none' } }} />

          {/* ── Roll History ── */}
          <Grid item xs={12} sm={5}>
            <Typography variant="caption" sx={SECTION_LABEL}>{t.tableGameTools.rollHistory}</Typography>
            <DiceHistogram
              counts={counts}
              timesOne={t.tableGameTools.timesOne}
              timesMany={t.tableGameTools.timesMany}
              theoreticalCurve={t.tableGameTools.theoreticalCurve}
            />
          </Grid>

        </Grid>
      </CardContent>
    </Card>
  );
}
