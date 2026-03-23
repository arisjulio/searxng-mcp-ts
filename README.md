# SearXNG MCP Server

An MCP server that gives AI assistants (Claude, Cursor, etc.) the ability to search the web and read pages, powered by a [SearXNG](https://github.com/searxng/searxng) instance you control.

## Tools

| Tool | Description |
|------|-------------|
| `web_search` | Search the web via SearXNG. Returns titles, URLs, and summaries. |
| `visit_page` | Fetch a URL and extract readable text (strips nav, scripts, etc). |

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
