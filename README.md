
# 🎮 PONG — Neon Glass Edition

A modern remake of the classic Pong built with **HTML5 Canvas**, featuring:
- Minimalist **neon-glass** inspired design.
- Rounded paddle corners.
- **Sound effects** for paddle hits, wall bounces, and scoring.
- **Countdown (3-2-1)** before each serve.
- **Pause/Resume** with the spacebar (overlay included).
- Custom player names before each match.
- Local **2-player controls**.

---

## 🚀 Controls

- **Player 1:** `W` (up) / `S` (down)  
- **Player 2:** `↑` / `↓`  
- **Spacebar:** Pause / Resume  

---

## 🖼️ Screenshots

![Landing](./assets/Landing%20Screen.png)
![Gameplay](./assets/Gameplay.png)
  


---

## 🛠️ Tech Stack

- **HTML5 Canvas** for rendering.  
- **Vanilla JavaScript** for game logic & animation.  
- **CSS3** with glassmorphism and gradient effects.  
- **Web Audio API** for sound effects.  
- **Docker** for packaging & easy deployment (e.g. Hugging Face Spaces).  

---

## 📦 Run Locally

### Option 1: Open with VS Code Live Server (recommended)
1. Install the **Live Server** extension in VS Code.  
2. Right-click `index.html` → **"Open with Live Server"**.  
3. Open in your browser at [http://localhost:5500](http://localhost:5500).

### Option 2: Simple Python HTTP Server
```bash
# Python 3
python -m http.server 8000
