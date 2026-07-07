# Neon Dash

A fast-paced reflex and pattern matching arcade game built with React, TypeScript, Tailwind CSS, and Framer Motion.

Match the glowing target shape before time runs out. Build combos, climb levels, and chase the highest score in this neon-soaked survival challenge.

![Neon Dash Screenshot](https://via.placeholder.com/800x500/18181b/22d3ee?text=NEON+DASH+GAMEPLAY)

## 🎮 How to Play

### Objective
Survive as long as possible by correctly matching the highlighted **TARGET** shape. The longer you last, the higher your score.

### Controls
- **Mouse/Touch**: Click the three shape buttons at the bottom that match the glowing target displayed above the playfield.
- **Keyboard**:
  - `1` — Select Circle
  - `2` — Select Square  
  - `3` — Select Triangle
  - `Space` or `Enter` — Pause / Resume
  - `R` — Restart from Game Over screen

### Core Mechanics

1. **Target Matching**
   - A large glowing shape appears at the top (the **TARGET**).
   - Quickly tap the matching shape button below.
   - Correct match = points, combo increase, and particle explosion.
   - Wrong match = combo reset, time penalty.

2. **Combo & Multiplier System**
   - Consecutive correct answers build your **combo**.
   - Higher combos increase your **multiplier** (up to **x5**).
   - Long combos can trigger **Power-ups** that give bonus time.

3. **Progression**
   - Score enough points to **level up**.
   - Each level increases difficulty and grants **+8 seconds** to the timer.

4. **Time Management**
   - You start with 60 seconds.
   - The timer counts down relentlessly.
   - Misses subtract time.
   - Level-ups and power-ups add time.

### How to Win
- There is **no final boss or "win" screen** — it's an endless high-score chase.
- **Win by achieving the highest score possible.**
- Top scores are automatically saved in your browser (localStorage).
- Try to beat your personal best and climb the in-game leaderboard.

**Pro Tips for High Scores:**
- Stay calm and develop muscle memory for the 1-2-3 keys.
- Don't rush on the last few seconds — accuracy matters more than speed when the timer is low.
- Chain combos aggressively — the x5 multiplier is extremely powerful.
- Use the visual feedback (glowing target + particles) to stay in rhythm.

### How to Lose
The game ends when:
- The **timer reaches zero**.
- You fail to keep the momentum going.

Game Over screen shows your final score, level reached, and updated high score list.

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm

### Installation

```bash
# Clone the repository (or unzip the project)
git clone <your-repo-url>
cd neon-dash

# Install dependencies
npm install
```

### Running the Game

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

Open http://localhost:5173 to play.

## 🛠️ Tech Stack

- **React 19** + TypeScript
- **Vite** — lightning fast build tool
- **Tailwind CSS v4** — utility-first styling
- **Framer Motion** — smooth animations
- **Lucide React** — beautiful icons
- Canvas 2D API for particle effects
- Web Audio API for retro synth sounds

## 📁 Project Structure

```
├── index.html
├── README.md
├── package.json
├── src/
│   ├── App.tsx          # Main game logic and UI
│   ├── main.tsx
│   ├── index.css
│   └── utils/
│       └── cn.ts        # Class name utility
├── public/
└── dist/                # Production build output
```

## 🎨 Game Features

- Real-time particle explosions with physics
- Dynamic neon glow effects
- Procedural synth sound effects (can be muted)
- Persistent high score leaderboard
- Responsive design (works on mobile)
- Keyboard + mouse support
- Pause functionality
- Retro-futuristic cyberpunk aesthetic with scanlines

## 📈 Scoring System

- Base points per correct hit: **10**
- Multiplied by current multiplier (1x–5x)
- Bonus points on level-ups
- Longer survival = higher final score

## Contributing

Feel free to open issues or submit pull requests to improve the game!

## License

MIT License — feel free to use this project for learning or as a base for your own games.

---

**Made with ❤️ for instant arcade fun.**

Press **ENTER** on the title screen to begin your run. How high can you score?
```

The README has been created with detailed instructions on how to play, win (high score chasing), and lose (timer reaches zero). It also includes full setup instructions. 

You can now run the project locally with `npm run dev` and view the full game!