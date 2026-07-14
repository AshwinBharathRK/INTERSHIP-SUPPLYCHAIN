// Dynamic Theme Configuration for Aurora Forge digital twin
export const THEMES = {
  "neon-aurora": {
    name: "Neon Aurora",
    className: "theme-neon-aurora",
    C: {
      cyan: "hsl(195, 100%, 43%)",
      cyanDim: "hsla(195, 100%, 43%, 0.12)",
      green: "hsl(145, 80%, 45%)",
      amber: "hsl(35, 95%, 55%)",
      blue: "hsl(205, 95%, 50%)",
      red: "hsl(355, 90%, 58%)",
      neutral: "hsl(215, 16%, 45%)",
      grid: "rgba(148, 163, 184, 0.12)",
      tooltipBg: "hsl(0, 0%, 100%)",
    },
    RGB: {
      cyan: [0, 172, 219],
      green: [23, 206, 99],
      amber: [255, 153, 25],
      blue: [19, 133, 236],
      red: [239, 68, 68],
      neutral: [98, 117, 140],
      violet: [133, 77, 255],
      land: [240, 244, 248],
      border: [200, 210, 220],
    }
  },
  "cyberpunk-dusk": {
    name: "Cyberpunk Dusk",
    className: "theme-cyberpunk",
    C: {
      cyan: "hsl(325, 100%, 55%)", // magenta
      cyanDim: "hsla(325, 100%, 55%, 0.12)",
      green: "hsl(160, 80%, 45%)",
      amber: "hsl(30, 95%, 50%)",
      blue: "hsl(195, 100%, 43%)", // cyan
      red: "hsl(355, 90%, 58%)",
      neutral: "hsl(280, 15%, 50%)",
      grid: "rgba(216, 180, 254, 0.15)",
      tooltipBg: "hsl(0, 0%, 100%)",
    },
    RGB: {
      cyan: [255, 25, 140], // hot pink/magenta
      green: [23, 206, 145], // teal
      amber: [255, 128, 0], // orange
      blue: [0, 172, 219], // cyan
      red: [239, 68, 68],
      neutral: [135, 110, 145],
      violet: [133, 77, 255],
      land: [245, 240, 250],
      border: [220, 210, 235],
    }
  },
  "emerald-matrix": {
    name: "Emerald Matrix",
    className: "theme-matrix",
    C: {
      cyan: "hsl(142, 76%, 36%)",
      cyanDim: "hsla(142, 76%, 36%, 0.12)",
      green: "hsl(145, 95%, 45%)",
      amber: "hsl(45, 95%, 50%)",
      blue: "hsl(190, 90%, 40%)",
      red: "hsl(360, 85%, 55%)",
      neutral: "hsl(145, 10%, 50%)",
      grid: "rgba(74, 222, 128, 0.15)",
      tooltipBg: "hsl(0, 0%, 100%)",
    },
    RGB: {
      cyan: [22, 163, 74], // green
      green: [6, 223, 78],
      amber: [245, 195, 10],
      blue: [10, 160, 180],
      red: [230, 50, 50],
      neutral: [115, 140, 125],
      violet: [133, 77, 255],
      land: [240, 248, 242],
      border: [210, 230, 215],
    }
  },
  "solar-flare": {
    name: "Solar Flare",
    className: "theme-solar",
    C: {
      cyan: "hsl(18, 95%, 50%)",
      cyanDim: "hsla(18, 95%, 50%, 0.12)",
      green: "hsl(145, 75%, 45%)",
      amber: "hsl(32, 95%, 50%)",
      blue: "hsl(40, 95%, 45%)",
      red: "hsl(0, 85%, 55%)",
      neutral: "hsl(25, 15%, 52%)",
      grid: "rgba(251, 146, 60, 0.15)",
      tooltipBg: "hsl(0, 0%, 100%)",
    },
    RGB: {
      cyan: [249, 85, 6], // orange
      green: [29, 200, 95],
      amber: [249, 135, 6],
      blue: [225, 165, 5],
      red: [239, 68, 68],
      neutral: [150, 125, 115],
      violet: [133, 77, 255],
      land: [252, 245, 240],
      border: [235, 220, 210],
    }
  }
};

let activeThemeKey = localStorage.getItem("aurora-theme") || "neon-aurora";
if (!THEMES[activeThemeKey]) activeThemeKey = "neon-aurora";

export const getActiveThemeKey = () => activeThemeKey;
export const setActiveThemeKey = (key) => {
  if (THEMES[key]) {
    activeThemeKey = key;
    localStorage.setItem("aurora-theme", key);
  }
};

// Dynamic Proxies to automatically resolve colors based on the active theme key
export const C = new Proxy({}, {
  get(target, prop) {
    const theme = THEMES[activeThemeKey] || THEMES["neon-aurora"];
    return theme.C[prop];
  }
});

export const RGB = new Proxy({}, {
  get(target, prop) {
    const theme = THEMES[activeThemeKey] || THEMES["neon-aurora"];
    return theme.RGB[prop];
  }
});

export const severityColor = new Proxy({}, {
  get(target, prop) {
    const colors = C;
    if (prop === "info") return colors.blue;
    if (prop === "success") return colors.green;
    if (prop === "warning") return colors.amber;
    if (prop === "critical") return colors.red;
    return undefined;
  }
});

export const statusColor = new Proxy({}, {
  get(target, prop) {
    const colors = C;
    if (prop === "healthy") return colors.green;
    if (prop === "low") return colors.amber;
    if (prop === "critical") return colors.red;
    return undefined;
  }
});

export const chartTooltipStyle = new Proxy({
  border: "1px solid rgba(148,163,184,0.18)",
  borderRadius: 10,
  fontSize: 12,
  color: "hsl(222, 47%, 11%)",
  boxShadow: "0 10px 30px rgba(15, 23, 42, 0.08)",
}, {
  get(target, prop) {
    if (prop === "backgroundColor") {
      const theme = THEMES[activeThemeKey] || THEMES["neon-aurora"];
      return theme.C.tooltipBg;
    }
    return target[prop];
  }
});
