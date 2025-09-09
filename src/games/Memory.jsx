// src/games/Memory.jsx
import React, { useEffect, useMemo, useState, useRef } from "react";

/**
 * Memory.jsx - Pro 2-card matching game
 * Paste to: src/games/Memory.jsx
 *
 * Features:
 * - Configurable pair count (default 8 pairs => 16 cards)
 * - Shuffle + stable keys
 * - Flip animation, match detection
 * - Moves counter, timer, matched counter
 * - Best result saved to localStorage (by pair count)
 * - Restart, Reveal All (hint), Auto-save paused state
 */

const STORAGE_PREFIX = "gameshub_memory_v1_";

// small icon set (emoji) — you can replace with URLs if you want images
const DEFAULT_ICONS = ["🍎","🍌","🍒","🍇","🍉","🥝","🍓","🥥","🍍","🍑","🍋","🍊","🍐","🥭","🍈","🍏"];

function shuffleArray(a) {
  const arr = a.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function makeDeck(pairs = 8, icons = DEFAULT_ICONS) {
  const chosen = icons.slice(0);
  if (pairs > chosen.length) {
    // duplicate icons if needed (rare)
    while (chosen.length < pairs) chosen.push(...DEFAULT_ICONS);
  }
  const pick = chosen.slice(0, pairs);
  const deck = shuffleArray([...pick, ...pick]).map((val, idx) => ({
    id: `${Date.now()}_${idx}_${Math.random().toString(36).slice(2,6)}`,
    val,
    flipped: false,
    matched: false,
  }));
  return deck;
}

export default function Memory({ pairs = 8 }) {
  // load best from storage
  const storageKey = STORAGE_PREFIX + pairs;
  const saved = (() => {
    try {
      const raw = localStorage.getItem(storageKey);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  })();

  const [deck, setDeck] = useState(() => saved?.deck || makeDeck(pairs));
  const [moves, setMoves] = useState(() => saved?.moves || 0);
  const [matchedCount, setMatchedCount] = useState(() => saved?.matchedCount || 0);
  const [opened, setOpened] = useState([]); // indexes of currently opened cards
  const [running, setRunning] = useState(() => saved?.running ?? true);
  const [time, setTime] = useState(() => saved?.time || 0);
  const [best, setBest] = useState(() => saved?.best || { leastMoves: null, bestTime: null });
  const timerRef = useRef(null);
  const lockRef = useRef(false); // to avoid multi-click during check

  // start timer
  useEffect(() => {
    if (running) {
      timerRef.current = setInterval(() => setTime(t => t + 1), 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [running]);

  // auto-save
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify({
        deck, moves, matchedCount, time, running, best
      }));
    } catch (e) {}
  }, [deck, moves, matchedCount, time, running, best, storageKey]);

  // keyboard support (1..9 to flip by index in small screens is optional)
  useEffect(() => {
    function onKey(e) {
      if (e.key === " " ) setRunning(r => !r);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // handle opening a card
  function flipCard(idx) {
    if (lockRef.current) return;
    setDeck(prev => {
      if (prev[idx].flipped || prev[idx].matched) return prev;
      const nd = prev.map(card => ({...card}));
      nd[idx].flipped = true;
      return nd;
    });

    setOpened(prev => {
      const next = [...prev, idx];
      if (next.length === 2) {
        // evaluate
        setMoves(m => m + 1);
        lockRef.current = true;
        setTimeout(() => evaluatePair(next), 350);
      }
      return next;
    });
  }

  function evaluatePair(indices) {
    setDeck(prev => {
      const a = prev[indices[0]];
      const b = prev[indices[1]];
      const nd = prev.map(card => ({...card}));
      if (a.val === b.val) {
        nd[indices[0]].matched = true;
        nd[indices[1]].matched = true;
        setMatchedCount(m => m + 1);
      } else {
        nd[indices[0]].flipped = false;
        nd[indices[1]].flipped = false;
      }
      return nd;
    });
    setOpened([]);
    lockRef.current = false;
  }

  // when completed
  useEffect(() => {
    if (matchedCount === pairs) {
      setRunning(false);
      // update best
      setBest(prev => {
        const newBest = {...prev};
        if (prev.leastMoves === null || moves < prev.leastMoves || (moves === prev.leastMoves && time < prev.bestTime)) {
          newBest.leastMoves = moves;
          newBest.bestTime = time;
        }
        // store best separately too
        try { localStorage.setItem(storageKey+"_best", JSON.stringify(newBest)); } catch(e){}
        return newBest;
      });
      // small celebration (could be modal)
      setTimeout(() => alert(`🎉 Completed! Moves: ${moves}, Time: ${formatTime(time)}`), 200);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchedCount]);

  // helpers
  function formatTime(sec) {
    const m = Math.floor(sec/60).toString().padStart(2,'0');
    const s = (sec%60).toString().padStart(2,'0');
    return `${m}:${s}`;
  }

  function restart(newPairs = pairs) {
    setDeck(makeDeck(newPairs));
    setOpened([]);
    setMoves(0);
    setTime(0);
    setMatchedCount(0);
    setRunning(true);
    lockRef.current = false;
  }

  function revealAllTemporary(ms = 1200) {
    // show all then hide those not matched
    setDeck(prev => prev.map(c => ({...c, flipped: true})));
    setTimeout(() => {
      setDeck(prev => prev.map(c => ({...c, flipped: c.matched ? true : false})));
    }, ms);
  }

  // nice derived grid columns
  const cols = useMemo(() => (pairs <= 6 ? 3 : pairs <= 8 ? 4 : pairs <= 10 ? 5 : 6), [pairs]);

  return (
    <div className="memory card">
      <div className="memory-header">
        <div>
          <h3>Memory Match — Pro</h3>
          <div className="muted">Find pairs — Tap to flip. Space to pause/resume.</div>
        </div>
        <div className="memory-stats">
          <div className="score-box">
            <div className="score-label">Moves</div>
            <div className="score-value">{moves}</div>
          </div>
          <div className="score-box">
            <div className="score-label">Time</div>
            <div className="score-value">{formatTime(time)}</div>
          </div>
          <div className="score-box">
            <div className="score-label">Matched</div>
            <div className="score-value">{matchedCount}/{pairs}</div>
          </div>
        </div>
      </div>

      <div className="memory-controls">
        <button className="btn" onClick={() => restart(pairs)}>Restart</button>
        <button className="btn ghost" onClick={() => revealAllTemporary(1000)}>Reveal</button>
        <button className="btn" onClick={() => setRunning(r => !r)}>{running ? "Pause" : "Resume"}</button>
        <select value={pairs} onChange={(e) => { restart(Number(e.target.value)); }}>
          <option value={4}>4 pairs</option>
          <option value={6}>6 pairs</option>
          <option value={8}>8 pairs</option>
          <option value={10}>10 pairs</option>
        </select>
      </div>

      <div className="deck-wrap" style={{ "--cols": cols }}>
        <div className="deck-grid" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
          {deck.map((card, idx) => (
            <div
              key={card.id}
              className={`card-item ${card.flipped ? "flipped" : ""} ${card.matched ? "matched" : ""}`}
              onClick={() => {
                if (!running) return;
                if (card.flipped || card.matched) return;
                flipCard(idx);
              }}
              role="button"
              aria-label={`card ${idx}`}
            >
              <div className="card-inner">
                <div className="card-front">?</div>
                <div className="card-back">{card.val}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="memory-footer">
        <div>Best Moves: {best.leastMoves ?? "-"}</div>
        <div>Best Time: {best.bestTime != null ? formatTime(best.bestTime) : "-"}</div>
      </div>
    </div>
  );
  }
