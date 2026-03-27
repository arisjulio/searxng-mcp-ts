# SearXNG MCP Server

An MCP server that gives AI assistants (Claude, Cursor, etc.) the ability to search the web and read pages, powered by a [SearXNG](https://github.com/searxng/searxng) instance you control.

## Tools

### `web_search`

Search the web via SearXNG. Returns titles, URLs, engine source, and summaries.

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `query` | string | yes | — | Search query. Supports engine-specific syntax (e.g. `site:github.com SearXNG`). |
| `language` | string | no | `es` | Language code for results (e.g. `en`, `es`). |
| `engines` | string[] | no | `["brave", "duckduckgo", "startpage"]` | Engines to query. Options: `brave`, `duckduckgo`, `startpage`, `wikidata`, `wikipedia`. |
| `time_range` | string | no | `month` | Filter by recency. Options: `day`, `month`, `year`. |
| `max_results` | number | no | `20` | Maximum number of results to return. |

## Prerequisites

- Docker + Docker Compose
- A running SearXNG instance with JSON format enabled (see [SearXNG docs](https://docs.searxng.org/))

## Setup

### 1. Clone the repo

```bash
git clone https://github.com/arisjulio/searxng-mcp-ts
cd searxng-mcp-ts
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env`.

### 3. Deployment

This option uses a Tailscale sidecar so the server is reachable anywhere on your private Tailscale network without exposing ports publicly.

1. Get a Tailscale auth key from [tailscale.com/settings/keys](https://login.tailscale.com/admin/settings/keys) (reusable, ephemeral recommended).

2. Add it to `.env`:
   ```env
   TS_AUTHKEY=tskey-auth-xxxxx
   ```

3. Copy and start the compose file:
   ```bash
   cp compose.example.yml compose.yml
   docker compose up -d
   ```

The server will be reachable at `http://searxng-mcp:<PORT>/mcp` from any device on your tailnet (the hostname is set by `hostname:` in the compose file).

### 4. Verify it's running

```bash
curl http://searxng-mcp:<PORT>/health
# {"status":"ok"}
```

## Connect your MCP client

The server uses the [Streamable HTTP transport](https://modelcontextprotocol.io/docs/concepts/transports) on `POST /mcp`.
