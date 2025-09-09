import React from "react";

export default function Navbar({ setActiveGame }) {
  return (
    <nav className="navbar">
      <h2 className="logo">GamesHub</h2>
      <ul>
        <li onClick={() => setActiveGame("home")}>🏠 Home</li>
        <li onClick={() => setActiveGame("2048")}>🔢 2048</li>
        <li onClick={() => setActiveGame("sudoku")}>🧩 Sudoku</li>
        <li onClick={() => setActiveGame("memory")}>🃏 Memory</li>
      </ul>
    </nav>
  );
}
