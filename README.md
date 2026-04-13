# Moyu Timer

An Obsidian plugin that tracks your real hourly wage by timing how much you slack off at work.

## Features

- **Status bar timer** - discreet timer in the status bar, click to open the full panel
- **Two modes** - "Slack off" and "Side gig" with independent timers
- **Real-time wage calculation** - see your actual hourly rate based on effective work time
- **Goal tracking** - set a target hourly rate and see how much slack time you have left
- **Quick log** - add or subtract time with +5m / +30m / manual entry
- **Water break reminder** - configurable reminder with a lock screen to make you actually drink water
- **History & trend chart** - archive daily data and view a SVG trend chart
- **i18n** - Chinese / English toggle

## Install

### From Obsidian Community Plugins (coming soon)

Search "Moyu Timer" in Settings > Community Plugins > Browse.

### Manual

1. Download `main.js`, `manifest.json`, `styles.css` from the [latest release](https://github.com/suyionly1-sys/moyu-plugin/releases)
2. Create folder `your-vault/.obsidian/plugins/moyu-plugin/`
3. Copy the 3 files into it
4. Enable the plugin in Settings > Community Plugins

## Usage

Click the timer in the status bar to open the panel. Click the coffee/zap icons to start timing. Use Cmd/Ctrl+P to search for "Moyu" commands.

## Build

```bash
npm install
npm run build
```

## License

MIT

---

by [innerpure](https://innerpure.cn)
