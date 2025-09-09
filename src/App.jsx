import React, { useState } from "react";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import Game2048 from "./games/Game2048";
import Sudoku from "./games/Sudoku";
import Memory from "./games/Memory";
import "./styles/app.css";

export default function App() {
  const [activeGame, setActiveGame] = useState("home");

  return (
    <div className="app-container">
      <Navbar setActiveGame={setActiveGame} />

      <main className="main-content">
        {activeGame === "home" && (
          <div className="welcome">
            <h1>🎮 Welcome to GamesHub</h1>
            <p>Select a game from the navigation bar to start playing!</p>
          </div>
        )}
        {activeGame === "2048" && <Game2048 />}
        {activeGame === "sudoku" && <Sudoku />}
        {activeGame === "memory" && <Memory />}
      </main>

      <Footer />
    </div>
  );
}
