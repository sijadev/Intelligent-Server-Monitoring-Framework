Scenario: Basic MCP Server Monitoring
Description: Simple monitoring setup for MCP servers

GIVEN MCP server discovery is active
WHEN new servers are detected on the network
THEN monitor server performance and collect metrics
AND generate alerts when servers become unavailable