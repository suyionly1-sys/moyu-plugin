# Moyu Timer

A discreet Obsidian plugin that sits in the **bottom-right status bar** and tracks your real hourly wage by timing how much you slack off at work. Click the status bar to open the full panel.

---

**Moyu Timer** -- Obsidian 右下角状态栏计时器，帮你算清真实时薪。摸鱼多久、副业多久、实际时薪多少，一目了然。

## Features

- **Status bar timer** -- a tiny timer lives in the bottom-right corner of Obsidian; click it to open the full panel
- **Two modes** -- "Slack off" and "Side gig" with independent timers
- **Real-time wage calculation** -- see your actual hourly rate based on effective work time
- **Goal tracking** -- set a target hourly rate and see how much slack time you have left
- **Quick log** -- add or subtract time with +5m / +30m / manual entry
- **Water break reminder** -- configurable reminder with a lock screen that can't be dismissed until the countdown ends
- **History & trend chart** -- archive daily data and view a SVG trend chart
- **Chinese / English** -- one-click language toggle inside the panel

## Install

### From Obsidian Community Plugins

Search "Moyu Timer" in Settings > Community Plugins > Browse.

### Manual

1. Download `main.js`, `manifest.json`, `styles.css` from the [latest release](https://github.com/suyionly1-sys/moyu-plugin/releases)
2. Create folder `your-vault/.obsidian/plugins/moyu-plugin/`
3. Copy the 3 files into it
4. Enable the plugin in Settings > Community Plugins

## Usage

Click the timer in the bottom-right status bar to open the panel. Click the coffee/zap icons to start timing. Use Cmd/Ctrl+P to search for "Moyu" commands.

## Build

```bash
npm install
npm run build
```

## License

MIT

---

by [innerpure](https://innerpure.cn)
