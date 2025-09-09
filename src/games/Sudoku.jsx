import React, { useState, useEffect } from "react";
import "../styles/sudoku.css";

// Sudoku puzzle generator (predefined boards for simplicity)
const puzzles = {
  easy: [
    "53..7....6..195....98....6.8...6...34..8.3..17...2...6.6....28....419..5....8..79",
  ],
  medium: [
    "6..874...1..9..7.2...1....9.92.4...73..8.3..25...9.74.3....4...4.1..9..6...327..5",
  ],
  hard: [
    ".....6....59.....82....8....45........3........6..3.54...325..6..................",
  ],
};

// Convert string puzzle into grid
function parsePuzzle(puzzle) {
  return puzzle.split("").map((val) => (val === "." ? "" : val));
}

export default function Sudoku() {
  const [difficulty, setDifficulty] = useState("easy");
  const [board, setBoard] = useState(parsePuzzle(puzzles["easy"][0]));
  const [selectedCell, setSelectedCell] = useState(null);
  const [mistakes, setMistakes] = useState(0);
  const [timer, setTimer] = useState(0);
  const [score, setScore] = useState(0);

  // Timer
  useEffect(() => {
    const interval = setInterval(() => {
      setTimer((t) => t + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Start new game
  const startNewGame = (level) => {
    setDifficulty(level);
    setBoard(parsePuzzle(puzzles[level][0]));
    setMistakes(0);
    setTimer(0);
    setScore(0);
    setSelectedCell(null);
  };

  // Handle cell input
  const handleInput = (value) => {
    if (selectedCell === null) return;
    let newBoard = [...board];
    if (newBoard[selectedCell] === "") {
      newBoard[selectedCell] = value;
      setBoard(newBoard);
      setScore(score + 10); // reward score
    } else {
      setMistakes(mistakes + 1); // count mistakes
      setScore(score - 5);
    }
  };

  return (
    <div className="sudoku-container">
      <h2>🧩 Sudoku ({difficulty.toUpperCase()})</h2>

      {/* Dashboard */}
      <div className="dashboard">
        <p>⏱ Time: {Math.floor(timer / 60)}:{timer % 60}</p>
        <p>⭐ Score: {score}</p>
        <p>❌ Mistakes: {mistakes}</p>
      </div>

      {/* Board */}
      <div className="sudoku-board">
        {board.map((cell, i) => (
          <div
            key={i}
            className={`cell ${selectedCell === i ? "selected" : ""}`}
            onClick={() => setSelectedCell(i)}
          >
            {cell}
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="controls">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
          <button key={num} onClick={() => handleInput(num.toString())}>
            {num}
          </button>
        ))}
      </div>

      {/* New Game */}
      <div className="new-game">
        <button onClick={() => startNewGame("easy")}>Easy</button>
        <button onClick={() => startNewGame("medium")}>Medium</button>
        <button onClick={() => startNewGame("hard")}>Hard</button>
      </div>
    </div>
  );
      }
