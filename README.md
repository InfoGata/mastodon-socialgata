# Mastodon Plugin for SocialGata

A SocialGata plugin that provides access to Mastodon's public timeline, trending topics, and user profiles.

## Features

- Browse the public timeline from mastodon.social
- View trending hashtags
- Browse posts by hashtag
- Search for posts
- View user profiles and their posts
- Read post threads with replies
- No authentication required

## Installation

### From URL (Recommended)

Install the plugin in SocialGata by providing the manifest URL:
```
https://cdn.jsdelivr.net/gh/InfoGata/mastodon-socialgata@latest/manifest.json
```

### Manual Installation

1. Clone this repository
2. Install dependencies: `npm install`
3. Build: `npm run build`
4. In SocialGata, add the plugin from the `dist/` folder

## Development

### Prerequisites

- Node.js 18+
- npm

### Setup

```bash
npm install
```

### Build

```bash
npm run build
```

### Output

- `dist/index.js` - Main plugin script

## Plugin API Methods

| Method | Description |
|--------|-------------|
| `onGetFeed` | Get public timeline with pagination |
| `onGetUser` | Get a user's profile and statuses |
| `onGetTrendingTopics` | Get trending hashtags |
| `onGetTrendingTopicFeed` | Get posts for a specific hashtag |
| `onSearch` | Search for statuses |
| `onGetComments` | Get thread context (replies) |
| `onGetPlatformType` | Returns "microblog" |

## Limitations

- Currently connects to mastodon.social only
- Read-only access (no authentication/posting)
- Some federated content may not be available

## License

MIT
