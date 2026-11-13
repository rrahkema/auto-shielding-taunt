# Automated Shielding Taunt

A small quality-of-life module for **Foundry Virtual Tabletop** and the **Pathfinder 2e** system.

Automated Shielding Taunt takes care of the repetitive effect management associated with the Guardian's Shielding Taunt feat, allowing you to focus on the encounter instead of manually applying effects.

## Features

- **Automatic Raise a Shield:** Automatically applies the Raise a Shield effect to your Guardian when using Shielding Taunt.
- **Automatic Taunt:** Applies the Taunt effect to your selected enemies.
- **Group Taunt Support:** Automatically detects whether your Guardian has the Group Taunt feat, allowing you to taunt up to three enemies instead of one.
- **Smart Target Selection:** If you have selected more targets than your feat allows, a selection dialog lets you choose which enemies to affect.
- **Visual Target Identification:** Displays token images and names in the selection dialog. Hovering over a target pings its position on the canvas.
- **Automatic Effect Management:** Keeps track of previously taunted enemies and manages outdated Taunt effects when your targets change.
- **GM-Side Processing:** Uses SocketLib to process Taunt effect application through the GM client.

## Requirements

The following software and modules are required:

| Requirement | Version |
|---|---|
| Foundry Virtual Tabletop | v14 |
| Pathfinder 2e System | Required |
| SocketLib | Required |

## Installation

### Install through Foundry VTT

1. Open Foundry Virtual Tabletop.
2. Navigate to **Add-on Modules**.
3. Select **Install Module**.
4. Paste the following Manifest URL into the Manifest URL field:

   `https://raw.githubusercontent.com/rrahkema/auto-shielding-taunt/main/module.json`

5. Click **Install**.
6. Enable **Automated Shielding Taunt** in your world's Module Management settings.

Make sure SocketLib is installed and enabled as well.

### Manual Installation

Alternatively, you can download the latest release from the [GitHub Releases](https://github.com/rrahkema/auto-shielding-taunt/releases) page and install it manually.

## Usage

Once installed and enabled, the module works automatically.

1. Select the enemy tokens you want to target.
2. Use the **Shielding Taunt** feat from your Guardian.
3. The module automatically applies Raise a Shield to your Guardian and Taunt to your selected enemies.
4. If you have selected more enemies than your feat allows, a selection dialog will appear so you can choose your targets.

### Target Limits

- **Shielding Taunt:** One enemy.
- **Shielding Taunt + Group Taunt:** Up to three enemies.

If no enemies are selected, the module will still apply Raise a Shield, but no Taunt effects will be applied.

### Effect Management

The module keeps track of enemies previously taunted by your Guardian. When changing targets, it manages existing Taunt effects to ensure that the number of active targets stays within the permitted limit.

Taunt effects are created with the appropriate Guardian context and initiative information for Pathfinder 2e's effect handling.

## Troubleshooting

**Nothing happens when I use Shielding Taunt?**

- Make sure Automated Shielding Taunt is enabled.
- Verify that SocketLib is installed and enabled.
- Ensure you are using the Shielding Taunt feat from the Pathfinder 2e system.

**Taunt effects are not being applied?**

- Make sure the GM is connected to the session.
- Check that your intended targets are selected on the canvas.
- Verify that the targeted tokens have associated actors.

## Compatibility

| Component | Supported Version |
|---|---|
| Foundry VTT | v14 |
| Pathfinder 2e | Required |
| SocketLib | Required |

## Feedback & Issues

Found a bug, have a suggestion, or want to request an improvement?

Feel free to open an issue on the [GitHub Issues](https://github.com/rrahkema/auto-shielding-taunt/issues) page.

Contributions and feedback are welcome!
