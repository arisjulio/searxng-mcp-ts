import "dotenv/config.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import http from "http";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";
import axios from "axios";
import * as cheerio from "cheerio";

const SEARXNG_URL = process.env.SEARXNG_URL;
const PORT = process.env.PORT;

/**
 * @param {McpServer} server
 */
function registerTools(server) {
    server.registerTool(
        "web_search",
        {
            description: "Search the web by a query using SearXNG",
            inputSchema: {
                query: z.string().describe("Search query."),
                language: z.string().optional().default("es").describe("Code of the search language, e.g. 'en', 'es'"),
                max_results: z.number().optional().default(20).describe("Max number of results")
            },
        },
        async ({ query, language, max_results }) => {
            const params = new URLSearchParams({ q: query, format: "json", language });
            const response = await axios.post(`${SEARXNG_URL}/search`, params);
            const results = (response.data.results || []).slice(0, max_results);

            const formatted = results.map((result, index) => [
                `[${index + 1}] ${result.title}`,
                `URL: ${result.url}`,
                result.content ? `Summary: ${result.content}` : "",
            ].filter(Boolean).join("\n")).join("\n\n");

            return {
                content: [
                    {
                        type: "text",
                        text: formatted || "No results found."
                    },
                ],
            };
        }
    );

    server.registerTool(
        "visit_page",
        {
            description: "Fetch the HTML of a URL and attempt to extract clean text",
            inputSchema: {
                url: z.url().describe("URL to visit"),
                raw: z.boolean().optional().default(false).describe("Return raw HTML instead of attempting to extract text"),
            },
        },
        async ({ url, raw }) => {
            const response = await axios.get(url, {
                headers: {
                    "User-Agent": "Mozilla/5.0 (compatible; MCPBot/1.0; +https://github.com/arisjulio",
                    "Accept-Language": "es-419,es;q=0.9"
                },
                timeout: 15000,
                maxContentLength: 5 * 1000 * 1000 // 5MB
            });

            if (raw) return { content: [{ type: "text", text: response.data }] };

            const $ = cheerio.load(response.data);
            $("script, style, noscript, nav, footer, header, aside, iframe, svg").remove();

            const title = $("title").text().trim();
            const body = $("body").text().replace(/\s+/g, " ").trim();
            const text = `Title: ${title}\n\n${body}`.slice(0, 20000) // Cap to 20K chars

            return { content: [{ type: "text", text }] };
        }
    );
}

const app = http.createServer(async (req, res) => {
    if (req.method === "POST" && req.url === "/mcp") {
        console.log("POST /mcp");
        const server = new McpServer({ name: "searxng-mcp", version: "1.0.0" });

        registerTools(server);

        const transport = new StreamableHTTPServerTransport({
            sessionIdGenerator: undefined // stateless
        });

        res.on("close", () => transport.close());
        await server.connect(transport);
        await transport.handleRequest(req, res);
        return;
    }

    if (req.method === "GET" && req.url === "/health") {
        console.log("GET /health");
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({ status: "ok" }));
        return;
    }

    res.writeHead(404);
    res.end("Not found");
});

app.listen(PORT, () => {
    console.log(`SearXNG MCP Server listening in port ${PORT}`);
});

