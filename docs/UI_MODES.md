# UI Modes Documentation

## Overview

The IPA Chat React application now supports multiple UI modes that can be controlled via URL parameters. This allows for flexible deployment scenarios while preserving user preferences.

## Architecture

The application uses a **multi-level configuration hierarchy**:

1. **URL Parameters** (Highest Priority) - Temporary overrides for deployment context
2. **User Preferences** (Medium Priority) - Stored in localStorage via Settings UI  
3. **Application Defaults** (Lowest Priority) - Fallback system defaults

## Supported UI Modes

### 1. Full Mode (Default)
- **URL**: `/?ui=full` or no parameter
- **Description**: Shows all toolbar buttons based on user preferences
- **Use Case**: Normal application usage

### 2. Simplified Mode
- **URL**: `/?ui=simplified` or `/?simplified=true`
- **Description**: Shows only Build Mode and Settings buttons
- **Use Case**: Educational environments, reduced complexity

### 3. Minimal Mode
- **URL**: `/?ui=minimal` or `/?simplified=minimal`
- **Description**: Shows only Settings button
- **Use Case**: Focused single-purpose usage

### 4. Kiosk Mode
- **URL**: `/?ui=kiosk` or `/?toolbar=none`
- **Description**: Hides entire toolbar for distraction-free experience
- **Use Case**: Public displays, embedded applications
- **Special Feature**: Press `Ctrl+Shift+S` to access Settings

### 5. Custom Toolbar
- **URL**: `/?toolbar=button1,button2,button3`
- **Description**: Show only specified toolbar buttons
- **Available Buttons**: `build`, `search`, `edit`, `game`, `settings`, `setupwizard`
- **Examples**:
  - `/?toolbar=build,settings` - Build and Settings only
  - `/?toolbar=build,edit,settings` - Build, Edit, and Settings
  - `/?toolbar=game,settings` - Game and Settings only

## URL Parameter Reference

| Parameter | Values | Description |
|-----------|--------|-------------|
| `ui` | `full`, `simplified`, `minimal`, `kiosk` | Predefined UI modes |
| `simplified` | `true`, `minimal` | Legacy simplified mode support |
| `toolbar` | `none` or comma-separated button list | Custom toolbar configuration |
| `config` | example filename | Load example configuration (works with UI modes) |

## Combining Parameters

UI modes can be combined with example configurations:

```
/?ui=simplified&config=example1    # Simplified UI with Example 1 content
/?ui=kiosk&config=example-minimal  # Kiosk mode with minimal example
/?toolbar=build,settings&config=example2  # Custom toolbar with Example 2
```

## Implementation Details

### Key Functions

- `getUIMode()` - Parses URL parameters and determines active UI mode
- `getToolbarConfigForMode()` - Applies UI mode overrides to user preferences
- `effectiveToolbarConfig` - Final configuration used for rendering

### User Preference Preservation

- URL parameters are **temporary overrides** only
- User's localStorage settings remain unchanged
- Settings UI always shows user's actual preferences
- Removing URL parameters returns to user preferences

### Development Debugging

In development mode, console logs show:
- 🎨 UI Mode: Current active mode
- 🔧 User Toolbar Config: User's saved preferences  
- ✅ Effective Toolbar Config: Final configuration being used

## Use Cases

### Educational Deployment
```html
<iframe src="https://yourapp.com/?ui=simplified&config=example1"></iframe>
```

### Kiosk Installation
```
https://yourapp.com/?ui=kiosk&config=example-minimal
```

### Embedded Widget
```html
<iframe src="https://yourapp.com/?ui=minimal&toolbar=build"></iframe>
```

### Custom Training Environment
```
https://yourapp.com/?toolbar=build,edit,settings&config=example3
```

## Testing

A test page is available at `/ui-mode-test.html` with links to test all UI modes and combinations.

## Backward Compatibility

- All existing functionality remains unchanged
- Legacy `simplified` parameter still supported
- User preferences and Settings UI work as before
- Example configurations no longer contain `toolbarConfig` (cleaned up)

## Future Enhancements

Potential future additions:
- UI mode presets in Settings UI
- URL parameter validation and error handling
- Additional UI modes (e.g., `compact`, `mobile`)
- Theme integration with UI modes
