# Animated Status

A Vencord plugin that allows you to animate your Discord custom status by rotating through multiple status frames.

## Features

- 🔄 Rotate through multiple custom status messages
- 😀 Support for both Unicode and custom emojis (Nitro)
- ⏱️ Configurable timing for each frame
- 🎲 Optional randomization of status order
- 💾 Persistent storage of your animation configuration

## Usage

1. Enable the plugin in Settings → Plugins → Animated Status
2. Configure your animation frames:
   - **Status Text**: The text to display in your status
   - **Emoji Name**: A Unicode emoji (😀) or emoji name
   - **Emoji ID**: For Nitro users, the ID of a custom emoji
   - **Duration**: How long to show this frame (minimum 2900ms)
3. Add multiple frames to create your animation
4. Click "Save Animation" to apply changes

## Configuration Options

- **Default Duration**: Set the default duration for all frames (can be overridden per frame)
- **Randomize**: Enable to show frames in random order instead of sequential

## Example Animations

### Simple Text Rotation
```
Frame 1: "Working on a project" ⏱️ 5000ms
Frame 2: "Taking a break" ⏱️ 3000ms
Frame 3: "Back to coding!" ⏱️ 5000ms
```

### Emoji Animation
```
Frame 1: "Coding" 💻 ⏱️ 3000ms
Frame 2: "Coding" ⌨️ ⏱️ 3000ms
Frame 3: "Coding" 🖥️ ⏱️ 3000ms
```

## Notes

- The minimum duration for each frame is 2900ms to avoid rate limiting
- Custom emoji IDs (Nitro feature) can be found by typing `\:emoji_name:` in Discord
- The animation will automatically restart when the plugin is re-enabled or after saving changes

## Credits

Based on the [BetterDiscord Animated Status plugin](https://github.com/toluschr/BetterDiscord-Animated-Status) by toluschr and SirSlender.
