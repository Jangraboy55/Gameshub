// src/games/Sudoku.jsx
import React, { useEffect, useRef, useState } from "react";

/**
 * Sudoku.jsx - Pro version
 * Paste to: src/games/Sudoku.jsx
 *
 * Features:
 * - Generator (backtracking)
 * - Solver (backtracking)
 * - Difficulty: Easy / Medium / Hard
 * - Timer with pause/resume
 * - Hints, Validate, Solve, Notes (pencil mode)
 * - Persistent save/load via localStorage
 * - Simple scoring & dashboard
 */

const STORAGE_KEY = "gameshub_sudoku_v1";

function makeEmptyGrid() {
  return Array.from({ length: 9 }, () => Array(9).fill(0));
}

function cloneGrid(g) {
  return g.map((r) => r.slice());
}

// Backtracking solver/generator
function findEmpty(grid) {
  for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) if (!grid[r][c]) return [r, c];
  return null;
}

function isValid(grid, r, c, val) {
  // row/col check
  for (let i = 0; i < 9; i++) {
    if (grid[r][i] === val) return false;
    if (grid[i][c] === val) return false;
  }
  const br = Math.floor(r / 3) * 3;
  const bc = Math.floor(c / 3) * 3;
  for (let i = br; i < br + 3; i++) for (let j = bc; j < bc + 3; j++) if (grid[i][j] === val) return false;
  return true;
}

function shuffleArray(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function solveGrid(grid) {
  const pos = findEmpty(grid);
  if (!pos) return true;
  const [r, c] = pos;
  for (let n = 1; n <= 9; n++) {
    if (isValid(grid, r, c, n)) {
      grid[r][c] = n;
      if (solveGrid(grid)) return true;
      grid[r][c] = 0;
    }
  }
  return false;
}

function generateFullSolution() {
  const grid = makeEmptyGrid();
  const order = [];
  // fill diagonal boxes first for better randomness
  const numbers = [1,2,3,4,5,6,7,8,9];
  for (let box = 0; box < 9; box++) {
    order.push(...shuffleArray(numbers));
  }
  // backtracking fill
  function fill(grid) {
    const pos = findEmpty(grid);
    if (!pos) return true;
    const [r, c] = pos;
    for (const n of shuffleArray([1,2,3,4,5,6,7,8,9])) {
      if (isValid(grid, r, c, n)) {
        grid[r][c] = n;
        if (fill(grid)) return true;
        grid[r][c] = 0;
      }
    }
    return false;
  }
  fill(grid);
  return grid;
}

function removeCells(grid, difficulty = "medium") {
  // difficulty -> number of cells removed
  let removeCount = 40;
  if (difficulty === "easy") removeCount = 36; // easier: more clues
  if (difficulty === "medium") removeCount = 46;
  if (difficulty === "hard") removeCount = 54;
  const g = cloneGrid(grid);
  const cells = [];
  for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) cells.push([r, c]);
  const shuffled = shuffleArray(cells);
  let removed = 0;
  for (const [r,c] of shuffled) {
    if (removed >= removeCount) break;
    const backup = g[r][c];
    g[r][c] = 0;
    // For production you should check uniqueness — this version focuses on solvable puzzle
    removed++;
  }
  return g;
}

function formatTime(sec) {
  const mm = Math.floor(sec / 60).toString().padStart(2, "0");
  const ss = Math.floor(sec % 60).toString().padStart(2, "0");
  return `${mm}:${ss}`;
}

// Score formula (simple): base points - time penalty - mistake penalty
function computeScore(difficulty, timeSec, mistakes) {
  let base = 1000;
  if (difficulty === "easy") base = 1200;
  if (difficulty === "medium") base = 1500;
  if (difficulty === "hard") base = 2000;
  const timePenalty = Math.floor(timeSec / 5);
  const mistakePenalty = mistakes * 50;
  return Math.max(0, base - timePenalty - mistakePenalty);
}

export default function Sudoku() {
  // persistent state
  const saved = (() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) { return null; }
  })();

  const [puzzle, setPuzzle] = useState(saved?.puzzle || null); // starting puzzle (clues)
  const [solution, setSolution] = useState(saved?.solution || null); // full solved grid
  const [board, setBoard] = useState(saved?.board || null); // current user board
  const [locked, setLocked] = useState(saved?.locked || null); // bool grid for original clues
  const [difficulty, setDifficulty] = useState(saved?.difficulty || "medium");
  const [time, setTime] = useState(saved?.time || 0);
  const [running, setRunning] = useState(saved?.running ?? false);
  const [mistakes, setMistakes] = useState(saved?.mistakes || 0);
  const [hintsLeft, setHintsLeft] = useState(saved?.hintsLeft ?? 3);
  const [notesMode, setNotesMode] = useState(false);
  const [notesGrid, setNotesGrid] = useState(saved?.notesGrid || Array.from({length:9}, ()=>Array.from({length:9}, ()=>new Set())));
  const timerRef = useRef(null);
  const selectionRef = useRef([0,0]); // r,c selected
  const [selected, setSelected] = useState([0,0]); // UI selected cell

  // init on mount if no saved puzzle
  useEffect(() => {
    if (!puzzle || !solution || !board) {
      newGame(difficulty);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // timer effect
  useEffect(() => {
    if (running) {
      timerRef.current = setInterval(() => setTime((t) => t + 1), 1000);
    } else {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    return () => clearInterval(timerRef.current);
  }, [running]);

  // autosave
  useEffect(() => {
    try {
      const payload = {
        puzzle, solution, board, locked, difficulty, time, running, mistakes, hintsLeft,
        notesGrid: notesGrid.map(row => row.map(s => Array.from(s)))
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch (e) {}
  }, [puzzle, solution, board, locked, difficulty, time, running, mistakes, hintsLeft, notesGrid]);

  // helpers
  function newGame(level = "medium") {
    // generate full solution
    const full = generateFullSolution(); // backtracking full
    const sol = cloneGrid(full);
    // remove cells according to difficulty
    const start = removeCells(sol, level);
    const lockedGrid = start.map((row) => row.map((v) => v !== 0));
    const userBoard = cloneGrid(start);
    setPuzzle(start);
    setSolution(sol);
    setBoard(userBoard);
    setLocked(lockedGrid);
    setDifficulty(level);
    setTime(0);
    setRunning(true);
    setMistakes(0);
    setHintsLeft(3);
    setNotesGrid(Array.from({length:9}, ()=>Array.from({length:9}, ()=>new Set())));
    setSelected([0,0]);
  }

  function handleSelect(r,c) {
    setSelected([r,c]);
    selectionRef.current = [r,c];
  }

  function handleInput(num) {
    const [r,c] = selected;
    if (locked?.[r]?.[c]) return; // cannot change clue
    if (notesMode) {
      // toggle note
      const ng = notesGrid.map(row => row.map(s => new Set(s)));
      if (ng[r][c].has(num)) ng[r][c].delete(num);
      else ng[r][c].add(num);
      setNotesGrid(ng);
      return;
    }
    const nb = cloneGrid(board);
    // record mistake if wrong
    if (solution && num !== solution[r][c]) {
      setMistakes(m => m + 1);
    }
    nb[r][c] = num;
    setBoard(nb);
  }

  function handleClear() {
    const [r,c] = selected;
    if (locked?.[r]?.[c]) return;
    const nb = cloneGrid(board);
    nb[r][c] = 0;
    setBoard(nb);
    const ng = notesGrid.map(row => row.map(s => new Set(s)));
    ng[r][c].clear();
    setNotesGrid(ng);
  }

  function validateBoard() {
    if (!solution) return false;
    let ok = true;
    for (let r=0;r<9;r++){
      for (let c=0;c<9;c++){
        if (board[r][c] !== 0 && board[r][c] !== solution[r][c]) {
          ok = false;
        }
      }
    }
    return ok;
  }

  function revealHint() {
    if (!solution || hintsLeft <= 0) return;
    // find an empty or wrong cell
    for (let r=0;r<9;r++){
      for (let c=0;c<9;c++){
        if (locked[r][c]) continue;
        if (board[r][c] !== solution[r][c]) {
          const nb = cloneGrid(board);
          nb[r][c] = solution[r][c];
          setBoard(nb);
          setHintsLeft(h => h - 1);
          // small penalty for hint
          setMistakes(m => m + 1);
          return;
        }
      }
    }
  }

  function solveNow() {
    if (!solution) return;
    setBoard(cloneGrid(solution));
    setRunning(false);
  }

  function checkComplete() {
    // all filled and match solution
    if (!solution) return false;
    for (let r=0;r<9;r++) for (let c=0;c<9;c++) if (board[r][c] !== solution[r][c]) return false;
    return true;
  }

  useEffect(() => {
    if (checkComplete()) {
      setRunning(false);
      // compute score
      const score = computeScore(difficulty, time, mistakes);
      // show alert (you can improve with modal)
      setTimeout(() => {
        alert(`Puzzle completed!\nTime: ${formatTime(time)}\nMistakes: ${mistakes}\nScore: ${score}`);
      }, 200);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [board]);

  // keyboard / number input support (desktop)
  useEffect(() => {
    function onKey(e) {
      if (e.key >= "1" && e.key <= "9") {
        handleInput(Number(e.key));
      } else if (e.key === "Backspace" || e.key === "Delete" || e.key === "0") {
        handleClear();
      } else if (e.key === " ") {
        setNotesMode(n => !n);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, board, notesMode, solution]);

  // UI helpers
  function cellDisplay(r,c) {
    const val = board?.[r]?.[c] || 0;
    return val === 0 ? "" : val;
  }

  function cellClass(r,c) {
    const base = locked?.[r]?.[c] ? "cell locked" : "cell";
    const sel = selected[0] === r && selected[1] === c ? " selected" : "";
    let wrong = "";
    if (solution && board[r][c] !== 0 && board[r][c] !== solution[r][c]) wrong = " wrong";
    return base + sel + wrong;
  }

  // quick dashboard values
  const currentScore = computeScore(difficulty, time, mistakes);

  return (
    <div className="sudoku card">
      <div className="sudoku-header">
        <div>
          <h3>Sudoku — Pro</h3>
          <div className="muted">Difficulty: <strong>{difficulty}</strong> · Time: {formatTime(time)} · Mistakes: {mistakes}</div>
        </div>
        <div className="sudoku-controls">
          <select value={difficulty} onChange={(e)=> newGame(e.target.value)}>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
          <button className="btn" onClick={() => { setRunning((r)=>!r); }}> {running? "Pause":"Resume"} </button>
          <button className="btn" onClick={() => newGame(difficulty)}>New</button>
          <button className="btn" onClick={revealHint} disabled={hintsLeft<=0}>Hint ({hintsLeft})</button>
          <button className="btn ghost" onClick={solveNow}>Solve</button>
        </div>
      </div>

      <div className="sudoku-body">
        <div className="board" role="grid" aria-label="Sudoku board">
          {board?.map((row, r) => (
            <div key={r} className="board-row" role="row">
              {row.map((_, c) => (
                <div key={c}
                     role="gridcell"
                     className={cellClass(r,c)}
                     onClick={()=>handleSelect(r,c)}
                >
                  {locked?.[r]?.[c] ? <div className="clue">{puzzle[r][c]}</div> : (
                    <div className="cell-inner">
                      <div className="cell-val">{cellDisplay(r,c)}</div>
                      {notesGrid[r][c].size>0 && (
                        <div className="notes">
                          {Array.from(notesGrid[r][c]).slice(0,9).map(n => <span key={n}>{n}</span>)}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>

        <div className="side-panel">
          <div className="keypad">
            <div className="row">
              {[1,2,3].map(n=> <button key={n} className="num" onClick={()=>handleInput(n)}>{n}</button>)}
            </div>
            <div className="row">
              {[4,5,6].map(n=> <button key={n} className="num" onClick={()=>handleInput(n)}>{n}</button>)}
            </div>
            <div className="row">
              {[7,8,9].map(n=> <button key={n} className="num" onClick={()=>handleInput(n)}>{n}</button>)}
            </div>
            <div className="row">
              <button className="num ghost" onClick={handleClear}>Clear</button>
              <button className={`num ${notesMode? 'active':''}`} onClick={()=>setNotesMode(n=>!n)}>{notesMode? 'Notes':'Notes'}</button>
            </div>
          </div>

          <div className="panel">
            <h4>Dashboard</h4>
            <p>Time: {formatTime(time)}</p>
            <p>Mistakes: {mistakes}</p>
            <p>Score (est): {currentScore}</p>
            <div style={{marginTop:8}}>
              <button className="btn" onClick={()=>{ setBoard(cloneGrid(puzzle)); setRunning(false); }}>Reset to Start</button>
              <button className="btn ghost" onClick={()=>{ localStorage.removeItem(STORAGE_KEY); alert('Save cleared'); }}>Clear Save</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
  }
