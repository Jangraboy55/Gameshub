import React, { useState } from "react";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import Game2048 from "./games/Game2048";
import Memory from "./games/Memory";
import "./styles/app.css";

export default function App() {
  const [activeGame, setActiveGame] = useState("home");

  const renderGame = () => {
    switch (activeGame) {
      case "2048":
        return <Game2048 />;
      case "memory":
        return <Memory />;
      default:
        return (
          <div className="home">
            <h1>🎮 Welcome to GamesHub</h1>
            <p>Select a game from the menu to start playing!</p>
          </div>
        );
    }
  };

  return (
    <div className="app-container">
      <Navbar setActiveGame={setActiveGame} />
      <main className="game-section">{renderGame()}</main>
      <Footer />
    </div>
  );
}
