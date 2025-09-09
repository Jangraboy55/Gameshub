import React, { useEffect, useState, useCallback, useRef } from "react";

/**
 * Game2048.jsx
 * - Paste this file to: src/games/Game2048.jsx
 * - Works with the supplied global styles; also add the CSS snippet below into src/styles/app.css
 *
 * Features:
 * - 4x4 board, standard 2048 rules
 * - Arrow keys + mobile swipe (touch) controls
 * - Restart, Undo, Save to localStorage, Highscore
 * - Basic tile animations using CSS classes
 */

// ---------- Utility helpers ----------
const SIZE = 4;
const STORAGE_KEY = "gameshub_2048_v1";

function emptyBoard() {
  return Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
}

function cloneBoard(board) {
  return board.map((r) => r.slice());
}

function addRandomTile(board) {
  const empties = [];
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (board[r][c] === 0) empties.push([r, c]);
    }
  }
  if (!empties.length) return board;
  const [r, c] = empties[Math.floor(Math.random() * empties.length)];
  board[r][c] = Math.random() < 0.9 ? 2 : 4;
  return board;
}

function boardEquals(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function rotateRight(mat) {
  const n = mat.length;
  const out = emptyBoard();
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      out[c][n - 1 - r] = mat[r][c];
    }
  }
  return out;
}

// slide left with merges; returns {board, scoreGained}
function slideLeftWithScore(board) {
  const n = board.length;
  let score = 0;
  const out = board.map((row) => {
    const filtered = row.filter((x) => x !== 0);
    const newRow = [];
    for (let i = 0; i < filtered.length; i++) {
      if (i + 1 < filtered.length && filtered[i] === filtered[i + 1]) {
        const merged = filtered[i] * 2;
        newRow.push(merged);
        score += merged;
        i++; // skip next
      } else {
        newRow.push(filtered[i]);
      }
    }
    while (newRow.length < n) newRow.push(0);
    return newRow;
  });
  return { board: out, scoreGained: score };
}

function moveBoard(board, direction) {
  // direction: 0=left,1=up,2=right,3=down (like earlier)
  let mat = cloneBoard(board);
  // rotate board so that move becomes left
  for (let i = 0; i < direction; i++) mat = rotateRight(mat);
  const { board: slid, scoreGained } = slideLeftWithScore(mat);
  // rotate back
  let res = cloneBoard(slid);
  for (let i = 0; i < (4 - direction) % 4; i++) res = rotateRight(res);
  return { board: res, scoreGained };
}

function hasMoves(board) {
  // if any empty or any adjacent equal
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (board[r][c] === 0) return true;
      if (c + 1 < SIZE && board[r][c] === board[r][c + 1]) return true;
      if (r + 1 < SIZE && board[r][c] === board[r + 1][c]) return true;
    }
  }
  return false;
}

// ---------- Component ----------
export default function Game2048() {
  // state
  const [board, setBoard] = useState(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.board) return parsed.board;
      } catch (e) {}
    }
    const b = emptyBoard();
    addRandomTile(b);
    addRandomTile(b);
    return b;
  });

  const [score, setScore] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return parsed?.score || 0;
      }
    } catch (e) {}
    return 0;
  });

  const [highscore, setHighscore] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return parsed?.highscore || 0;
      }
    } catch (e) {}
    return 0;
  });

  const [gameOver, setGameOver] = useState(false);
  const [lastBoard, setLastBoard] = useState(null); // for undo
  const [lastScore, setLastScore] = useState(0);

  // animation trigger map: store key -> true when tile newly added or merged
  const [animMap, setAnimMap] = useState({}); // {r_c: 'new'|'merge'}

  // refs for touch handling
  const touchStartRef = useRef(null);

  // helper: save to localStorage
  const persist = useCallback(
    (b, sc, hs) => {
      try {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ board: b, score: sc, highscore: hs })
        );
      } catch (e) {}
    },
    []
  );

  // update persistent highscore if needed
  useEffect(() => {
    if (score > highscore) setHighscore(score);
  }, [score, highscore]);

  // persist whenever board/score/highscore change
  useEffect(() => {
    persist(board, score, highscore);
  }, [board, score, highscore, persist]);

  // keyboard controls
  useEffect(() => {
    function onKey(e) {
      const map = { ArrowLeft: 0, ArrowUp: 1, ArrowRight: 2, ArrowDown: 3 };
      if (map[e.key] !== undefined) {
        e.preventDefault();
        handleMove(map[e.key]);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [board, score]);

  // touch handlers for mobile swipe
  useEffect(() => {
    function onTouchStart(e) {
      const t = e.touches[0];
      touchStartRef.current = { x: t.clientX, y: t.clientY, time: Date.now() };
    }
    function onTouchEnd(e) {
      if (!touchStartRef.current) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - touchStartRef.current.x;
      const dy = t.clientY - touchStartRef.current.y;
      const adx = Math.abs(dx);
      const ady = Math.abs(dy);
      // threshold
      if (Math.max(adx, ady) < 20) return;
      if (adx > ady) {
        // horizontal
        if (dx > 0) handleMove(2); // right
        else handleMove(0); // left
      } else {
        // vertical
        if (dy > 0) handleMove(3); // down
        else handleMove(1); // up
      }
      touchStartRef.current = null;
    }
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchend", onTouchEnd);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [board, score]);

  // core move handler
  function handleMove(direction) {
    if (gameOver) return;
    const prev = cloneBoard(board);
    const prevScore = score;
    const { board: moved, scoreGained } = moveBoard(prev, direction);
    // if no change -> ignore
    if (boardEquals(prev, moved)) return;
    // add random tile
    addRandomTile(moved);
    // update animation map: detect newly added tile and merged tiles
    const newAnim = {};
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        if (prev[r][c] !== moved[r][c]) {
          // if moved from 0 to nonzero => new tile (but we added new tile after merge) => mark as 'new'
          if (prev[r][c] === 0 && moved[r][c] !== 0) newAnim[`${r}_${c}`] = "new";
          // if merged value (value > prev) mark merge (this catches merges)
          if (moved[r][c] > prev[r][c] && prev[r][c] !== 0) newAnim[`${r}_${c}`] = "merge";
        }
      }
    }
    setAnimMap(newAnim);
    setLastBoard(cloneBoard(prev));
    setLastScore(prevScore);
    setBoard(moved);
    setScore((s) => s + scoreGained);

    // check game over after small delay (to allow tile to appear)
    setTimeout(() => {
      if (!hasMoves(moved)) setGameOver(true);
    }, 120);
  }

  function restart() {
    const b = emptyBoard();
    addRandomTile(b);
    addRandomTile(b);
    setBoard(b);
    setScore(0);
    setGameOver(false);
    setLastBoard(null);
    setLastScore(0);
    setAnimMap({});
  }

  function undo() {
    if (!lastBoard) return;
    setBoard(cloneBoard(lastBoard));
    setScore(lastScore);
    setLastBoard(null);
    setLastScore(0);
    setGameOver(false);
  }

  function resetStorage() {
    localStorage.removeItem(STORAGE_KEY);
    restart();
    setHighscore(0);
  }

  // helper: get tile style class based on value
  function tileClass(val) {
    if (!val) return "tile tile-empty";
    if (val <= 4) return `tile tile-${val}`;
    // apply classes for powers
    return `tile tile-${val}`;
  }

  // format for accessibility
  const boardLabel = `2048 game board. Current score ${score}. High score ${highscore}.`;

  return (
    <div className="game-2048 card" role="region" aria-label={boardLabel}>
      <div className="game-header">
        <div>
          <h3>2048 — GamesHub Pro</h3>
          <div className="muted">Combine tiles to reach 2048. Use arrow keys or swipe.</div>
        </div>
        <div className="scoreboard">
          <div className="score-box">
            <div className="score-label">Score</div>
            <div className="score-value">{score}</div>
          </div>
          <div className="score-box">
            <div className="score-label">Best</div>
            <div className="score-value">{highscore}</div>
          </div>
        </div>
      </div>

      <div className="controls">
        <button className="btn" onClick={restart}>Restart</button>
        <button className="btn" onClick={undo} disabled={!lastBoard}>Undo</button>
        <button className="btn ghost" onClick={resetStorage}>Reset Save</button>
      </div>

      <div className="board-wrap">
        <div className="grid" aria-hidden={false}>
          {board.map((row, r) =>
            row.map((val, c) => {
              const key = `${r}_${c}`;
              const anim = animMap[key];
              return (
                <div
                  key={key}
                  className={`${tileClass(val)} ${anim ? "anim-" + anim : ""}`}
                >
                  {val !== 0 ? <span className="tile-val">{val}</span> : null}
                </div>
              );
            })
          )}
        </div>
      </div>

      {gameOver && (
        <div className="overlay">
          <div className="overlay-card">
            <h3>Game Over</h3>
            <p>Your score: {score}</p>
            <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 12 }}>
              <button className="btn" onClick={() => { restart(); }}>Play Again</button>
              <button className="btn ghost" onClick={() => { restart(); }}>Home</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
          }
