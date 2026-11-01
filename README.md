# ⚡ Sagar Gupta — 3D Interactive Developer Portfolio

An immersive, interactive 3D developer portfolio powered by **Three.js** and vanilla web technologies. Features smooth character-based exploration, camera following, path navigation, glassmorphism UI panels, post-processing bloom effects, and dynamic data binding from `config.json`.

---

## 🚀 Live Demo & Deployment

Targeted for instant static deployment on **Vercel** with zero build steps required.

---

## 🛠️ Tech Stack

- **3D Engine:** [Three.js](https://threejs.org/) (r158 via ES Module importmaps)
- **Post-Processing:** `EffectComposer`, `RenderPass`, `UnrealBloomPass`
- **Frontend Architecture:** Vanilla ES6+ JavaScript, CSS3 (Modern Glassmorphism), Semantic HTML5
- **Data Configuration:** Single-source `config.json` for all projects, skills, experience, and contact data
- **Hosting/Deployment:** Vercel Static Hosting (configured via `vercel.json`)

---

## ✨ Features

- **Personalized 3D Developer Avatar:** Animated character with walking and idle states, tech headphones, hoodie, and developer badge.
- **Dynamic Terrain & Path System:** Procedurally displaced ground mesh with math-driven curved path following (`getPathX`).
- **Interactive Camera Rig:** Smooth camera interpolation (lerp) tracking character motion with responsive mouse-look parallax on desktop.
- **Scroll & Touch Navigation:** Scroll wheel navigation and touch-gesture support with jump prevention.
- **Zone Progression System:** Visual zone indicator, progress bar, and active zone dot indicator updating across 9 zones:
  1. `Intro` (Terminal greeting, hero highlights)
  2. `About Me` (Bio, background, and personal focus)
  3. `Experience` (Google Student Ambassador 2026, GirlScript Summer of Code 2026, Google Summer of Code 2026)
  4. `Work & Community` (Open Source, Developer Community, Continuous Learning)
  5. `Projects` (ElevateCV AI, CareerVerse AI)
  6. `Skills` (Programming Languages, Frontend, Backend, Databases & ORM, AI & Emerging Tech, Developer Tools)
  7. `Education` (PW Institute of Innovation — Computer Science & Engineering)
  8. `Certifications & Recognition` (Google, GirlScript Foundation, IBM Skills Network, Georgia Tech)
  9. `Contact & Final Portal` (Direct links and verified credentials)
- **Performance Optimized:** Reduced geometry vertex load, pre-allocated vectors/colors in animation loop to prevent GC stalls, and responsive mobile bottom-sheet UI.
- **SEO Ready:** Open Graph metadata, Twitter Cards, author tags, and responsive viewport configuration.

---

## 📁 Project Structure

```
Sagar_Portfolio/
├── index.html        # Entry point HTML shell with importmaps & SEO metadata
├── script.js         # Core Three.js scene, character, physics raycaster & UI logic
├── style.css         # Responsive glassmorphism theme, animations & HUD styling
├── config.json       # Centralized personal info, projects, skills & contact links
├── vercel.json       # Deployment cache control & security headers
├── assets/           # 3D assets and model archives
└── README.md         # Project documentation
```

---

## 💻 Local Development

Run any standard local HTTP server in the project directory:

```bash
# Using Python
python3 -m http.server 8000

# Using Node (npx)
npx serve .
```

Open `http://localhost:8000` in your web browser.

---

## 👤 Author

**Sagar Gupta**  
*Software Developer & Open Source Contributor*  
- **GitHub:** [@SagarGupta-30](https://github.com/SagarGupta-30)  
- **LinkedIn:** [Sagar Gupta](https://linkedin.com/in/sagar-gupta-52626a381)  
- **Email:** [guptasagar0130@gmail.com](mailto:guptasagar0130@gmail.com)  

