import "dotenv/config.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import http from "http";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";
import axios from "axios";

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
                query: z.string().describe("The search query. This string is passed to external search services. Thus, SearXNG supports syntax of each search service. For example, `site:github.com SearXNG` is a valid query for Google. However, if simply the query above is passed to any search engine which does not filter its results based on this syntax, you might not get the results you wanted"),
                language: z.string().optional().default("es").describe("Code of the search language, e.g. 'en', 'es'"),
                engines: z.array(z.enum(["brave", "duckduckgo", "startpage", "wikidata", "wikipedia"])).optional().default(["brave", "duckduckgo", "startpage"]).describe("Specifies the active search engines to use"),
                time_range: z.enum(["day", "month", "year"]).optional().default("month").describe("Time range of search for engines which support it"),
                max_results: z.number().optional().default(20).describe("Max number of results")
            },
        },
        async ({ query, language, engines, time_range, max_results }) => {
            const params = new URLSearchParams({
                q: query,
                format: "json",
                language,
                engines: engines.join(","),
                time_range,
            });
            const response = await axios.post(`${SEARXNG_URL}/search`, params);
            const results = (response.data.results || []).slice(0, max_results);

            const formatted = results.map((result, index) => [
                `[${index + 1}] ${result.title}`,
                `URL: ${result.url}`,
                result.engine ? `ENGINE: ${result.engine}` : "",
                result.content ? `SUMMARY: ${result.content}` : "",
            ].filter(Boolean).join("\n")).join("\n\n---\n\n");

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

