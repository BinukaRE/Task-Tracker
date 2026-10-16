import React, { useState, useEffect, useRef } from 'react';
import { useTasks } from '../../context/TaskContext';
import {
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  Circle,
  Timer,
  Coffee,
  Sparkles,
  Volume2,
  VolumeX,
  Target
} from 'lucide-react';

export default function PomodoroView() {
  const {
    tasks,
    activePomodoroTaskId,
    setActivePomodoroTaskId,
    logFocusTime,
    toggleSubtask,
    toggleTaskStatus,
  } = useTasks();

  const [mode, setMode] = useState('focus'); // 'focus' (25m) | 'shortBreak' (5m) | 'longBreak' (15m)
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [completedSessions, setCompletedSessions] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const activeTask = tasks.find((t) => t.id === activePomodoroTaskId) || tasks.find(t => t.status !== 'done') || tasks[0];

  const timerRef = useRef(null);

  // Mode durations
  const durations = {
    focus: 25 * 60,
    shortBreak: 5 * 60,
    longBreak: 15 * 60,
  };

  const switchMode = (newMode) => {
    setIsRunning(false);
    setMode(newMode);
    setTimeLeft(durations[newMode]);
  };

  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            handleTimerComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [isRunning, mode, activeTask]);

  const handleTimerComplete = () => {
    setIsRunning(false);

    if (mode === 'focus') {
      setCompletedSessions((prev) => prev + 1);
      // Log 25 minutes to task
      if (activeTask) {
        logFocusTime(activeTask.id, 25);
      }

      // Audio notification using Web Audio API synthesized chime
      if (soundEnabled) {
        playChime();
      }

      // Switch to short or long break
      if ((completedSessions + 1) % 4 === 0) {
        switchMode('longBreak');
      } else {
        switchMode('shortBreak');
      }
    } else {
      if (soundEnabled) {
        playChime();
      }
      switchMode('focus');
    }
  };

  const playChime = () => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.3); // A5
      gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.8);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.8);
    } catch (e) {
      console.log('Audio not supported or restricted');
    }
  };

  const toggleTimer = () => {
    setIsRunning(!isRunning);
  };

  const resetTimer = () => {
    setIsRunning(false);
    setTimeLeft(durations[mode]);
  };

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const progressPercent = ((durations[mode] - timeLeft) / durations[mode]) * 100;

  return (
    <div className="h-full flex-1 flex flex-col p-6 bg-slate-900/30 overflow-y-auto items-center justify-center">
      <div className="max-w-xl w-full space-y-6">
        {/* Mode Switcher Tabs */}
        <div className="flex items-center justify-center gap-2 p-1.5 rounded-2xl bg-slate-950/60 border border-slate-800/80 backdrop-blur-md">
          <button
            onClick={() => switchMode('focus')}
            className={`flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-semibold transition-all ${
              mode === 'focus'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Timer className="w-3.5 h-3.5" />
            <span>Focus (25m)</span>
          </button>
          <button
            onClick={() => switchMode('shortBreak')}
            className={`flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-semibold transition-all ${
              mode === 'shortBreak'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Coffee className="w-3.5 h-3.5" />
            <span>Short Break (5m)</span>
          </button>
          <button
            onClick={() => switchMode('longBreak')}
            className={`flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-semibold transition-all ${
              mode === 'longBreak'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Long Break (15m)</span>
          </button>
        </div>

        {/* Circular / Digital Display Card */}
        <div className="rounded-3xl border border-slate-800/80 bg-slate-950/60 backdrop-blur-xl p-8 flex flex-col items-center shadow-2xl relative overflow-hidden">
          {/* Background Ambient Glow */}
          <div
            className={`absolute -top-24 left-1/2 -translate-x-1/2 w-64 h-64 rounded-full blur-3xl opacity-20 pointer-events-none ${
              mode === 'focus' ? 'bg-indigo-500' : mode === 'shortBreak' ? 'bg-emerald-500' : 'bg-purple-500'
            }`}
          />

          {/* Sound toggle at top-right */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="absolute top-4 right-4 text-slate-400 hover:text-slate-200 p-2 rounded-lg bg-slate-900/60"
            title={soundEnabled ? 'Mute sound' : 'Unmute sound'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-rose-400" />}
          </button>

          {/* Big Time Display */}
          <div className="font-mono text-7xl font-extrabold tracking-tight text-slate-100 my-6">
            {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
          </div>

          {/* Progress Bar */}
          <div className="w-64 h-2 bg-slate-800/80 rounded-full overflow-hidden mb-6">
            <div
              className={`h-full transition-all duration-300 ${
                mode === 'focus' ? 'bg-indigo-500' : mode === 'shortBreak' ? 'bg-emerald-500' : 'bg-purple-500'
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* Controls */}
          <div className="flex items-center gap-4">
            <button
              onClick={resetTimer}
              className="p-3 rounded-2xl bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 transition-all"
              title="Reset Timer"
            >
              <RotateCcw className="w-5 h-5" />
            </button>

            <button
              onClick={toggleTimer}
              className={`px-8 py-3.5 rounded-2xl font-bold text-sm flex items-center gap-2 shadow-lg transition-all active:scale-95 text-white ${
                isRunning
                  ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/30'
                  : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/30'
              }`}
            >
              {isRunning ? (
                <>
                  <Pause className="w-5 h-5" />
                  <span>Pause</span>
                </>
              ) : (
                <>
                  <Play className="w-5 h-5 fill-current" />
                  <span>Start Focus</span>
                </>
              )}
            </button>
          </div>

          {/* Completed Sessions Indicator */}
          <div className="mt-6 flex items-center gap-2 text-xs text-slate-400 font-mono">
            <span>Sessions completed today:</span>
            <div className="flex gap-1.5">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className={`w-2.5 h-2.5 rounded-full ${
                    i < (completedSessions % 4 || (completedSessions > 0 && completedSessions % 4 === 0 ? 4 : 0))
                      ? 'bg-indigo-500'
                      : 'bg-slate-800 border border-slate-700'
                  }`}
                />
              ))}
            </div>
            <span className="font-bold text-slate-200">({completedSessions})</span>
          </div>
        </div>

        {/* Linked Task Card */}
        <div className="rounded-2xl border border-slate-800/80 bg-slate-950/60 backdrop-blur-md p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5 uppercase tracking-wider">
              <Target className="w-3.5 h-3.5 text-indigo-400" />
              Focusing on Task:
            </span>

            {/* Task selector dropdown */}
            <select
              value={activeTask?.id || ''}
              onChange={(e) => setActivePomodoroTaskId(e.target.value)}
              className="text-xs bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-2.5 py-1 focus:outline-none max-w-xs truncate"
            >
              {tasks.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title} ({t.category})
                </option>
              ))}
            </select>
          </div>

          {activeTask ? (
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-slate-100">{activeTask.title}</h4>
                <span className="text-xs font-mono text-indigo-400">
                  {activeTask.actualMinutes || 0}m logged
                </span>
              </div>

              {activeTask.description && (
                <p className="text-xs text-slate-400">{activeTask.description}</p>
              )}

              {/* Checklist */}
              {activeTask.subtasks && activeTask.subtasks.length > 0 && (
                <div className="pt-2 border-t border-slate-800/60 space-y-1.5">
                  <div className="text-[11px] font-medium text-slate-400">Checklist:</div>
                  {activeTask.subtasks.map((st) => (
                    <div
                      key={st.id}
                      onClick={() => toggleSubtask(activeTask.id, st.id)}
                      className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer hover:text-white"
                    >
                      {st.completed ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                      ) : (
                        <Circle className="w-3.5 h-3.5 text-slate-600 flex-shrink-0" />
                      )}
                      <span className={st.completed ? 'line-through text-slate-500' : ''}>
                        {st.title}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="text-xs text-slate-500 py-2">No active task selected.</div>
          )}
        </div>
      </div>
    </div>
  );
}
