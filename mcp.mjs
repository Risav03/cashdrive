#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import axios from 'axios';

class CashDriveMCPServer {
  constructor() {
    this.server = new Server(
      {
        name: 'cash-drive-mcp',
        version: '0.1.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.baseURL = process.env.BASE_URL || 'http://localhost:3000';
    
    this.setupToolHandlers();
  }

  // Helper method to make requests
  async makeRequest(method, endpoint, data = null, params = null) {
    try {
      const config = {
        method,
        url: `${this.baseURL}${endpoint}`,
        headers: {
          'Content-Type': 'application/json',
        },
      };

      if (data) {
        config.data = data;
      }

      if (params) {
        config.params = params;
      }

      const response = await axios(config);
      return response.data;
    } catch (error) {
      if (error.response) {
        throw new McpError(
          ErrorCode.InternalError,
          `API Error: ${error.response.status} - ${error.response.data?.error || error.response.statusText}`
        );
      }
      throw new McpError(ErrorCode.InternalError, `Request failed: ${error.message}`);
    }
  }

  setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          // Marketplace Browsing
          {
            name: 'browse_marketplace',
            description: 'Browse marketplace listings with optional filtering',
            inputSchema: {
              type: 'object',
              properties: {
                search: {
                  type: 'string',
                  description: 'Search term for title, description, or tags',
                },
                tags: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Filter by specific tags',
                },
                status: {
                  type: 'string',
                  enum: ['active', 'inactive'],
                  description: 'Filter by listing status (default: active)',
                },
                sortBy: {
                  type: 'string',
                  enum: ['createdAt', 'price', 'views', 'title'],
                  description: 'Sort listings by field (default: createdAt)',
                },
                sortOrder: {
                  type: 'string',
                  enum: ['asc', 'desc'],
                  description: 'Sort order (default: desc)',
                },
                page: {
                  type: 'number',
                  description: 'Page number for pagination (default: 1)',
                },
                limit: {
                  type: 'number',
                  description: 'Number of results per page (default: 20)',
                },
              },
              required: [],
            },
          },
          {
            name: 'get_listing_details',
            description: 'Get detailed information about a marketplace listing',
            inputSchema: {
              type: 'object',
              properties: {
                listingId: {
                  type: 'string',
                  description: 'ID of the listing to get details for',
                },
                incrementView: {
                  type: 'boolean',
                  description: 'Whether to increment the view count (default: false)',
                },
              },
              required: ['listingId'],
            },
          },
          {
            name: 'get_available_tags',
            description: 'Get all available tags from marketplace listings',
            inputSchema: {
              type: 'object',
              properties: {},
              required: [],
            },
          },
          {
            name: 'search_listings',
            description: 'Search marketplace listings with advanced filtering',
            inputSchema: {
              type: 'object',
              properties: {
                query: {
                  type: 'string',
                  description: 'Search query for listings',
                },
                minPrice: {
                  type: 'number',
                  description: 'Minimum price filter',
                },
                maxPrice: {
                  type: 'number',
                  description: 'Maximum price filter',
                },
                tags: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Filter by tags',
                },
                sellerId: {
                  type: 'string',
                  description: 'Filter by specific seller ID',
                },
              },
              required: ['query'],
            },
          },
        ],
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          // Marketplace Browsing
          case 'browse_marketplace':
            return await this.browseMarketplace(args);
          case 'get_listing_details':
            return await this.getListingDetails(args);
          case 'get_available_tags':
            return await this.getAvailableTags(args);
          case 'search_listings':
            return await this.searchListings(args);

          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Unknown tool: ${name}`
            );
        }
      } catch (error) {
        if (error instanceof McpError) {
          throw error;
        }
        throw new McpError(
          ErrorCode.InternalError,
          `Tool execution failed: ${error.message}`
        );
      }
    });
  }

  // Marketplace Browsing Implementation
  async browseMarketplace({ search, tags, status = 'active', sortBy = 'createdAt', sortOrder = 'desc', page = 1, limit = 20 }) {
    const params = {
      status,
      sortBy,
      sortOrder,
      page,
      limit
    };

    if (search) params.search = search;
    if (tags && tags.length > 0) params.tags = tags.join(',');

    const data = await this.makeRequest('GET', '/api/listings', null, params);

    let response = `Marketplace Listings (Page ${data.pagination.current} of ${data.pagination.total}):\n`;
    response += `Found ${data.pagination.totalItems} total listings\n\n`;

    if (data.listings.length === 0) {
      response += 'No listings found matching your criteria.';
    } else {
      data.listings.forEach((listing, index) => {
        response += `${index + 1}. ${listing.title}\n`;
        response += `   Price: $${listing.price.toFixed(2)}\n`;
        response += `   Seller: ${listing.seller.name}\n`;
        response += `   Views: ${listing.views}\n`;
        response += `   Status: ${listing.status}\n`;
        if (listing.tags.length > 0) {
          response += `   Tags: ${listing.tags.join(', ')}\n`;
        }
        response += `   ID: ${listing._id}\n`;
        response += `   Description: ${listing.description.substring(0, 100)}${listing.description.length > 100 ? '...' : ''}\n\n`;
      });
    }

    return {
      content: [
        {
          type: 'text',
          text: response,
        },
      ],
    };
  }

  async getListingDetails({ listingId, incrementView = false }) {
    const params = incrementView ? { incrementView: 'true' } : {};
    const data = await this.makeRequest('GET', `/api/listings/${listingId}`, null, params);

    let response = `📦 ${data.title}\n`;
    response += `Price: $${data.price.toFixed(2)}\n`;
    response += `Seller: ${data.seller.name} (${data.seller.email})\n`;
    response += `Status: ${data.status}\n`;
    response += `Views: ${data.views}\n`;
    response += `Created: ${new Date(data.createdAt).toLocaleString()}\n`;
    response += `Updated: ${new Date(data.updatedAt).toLocaleString()}\n`;
    
    if (data.tags.length > 0) {
      response += `Tags: ${data.tags.join(', ')}\n`;
    }
    
    response += `\nDescription:\n${data.description}\n`;
    
    if (data.item) {
      response += `\nItem Details:\n`;
      response += `  Name: ${data.item.name}\n`;
      response += `  Type: ${data.item?.type}\n`;
      if (data.item.size) response += `  Size: ${this.formatFileSize(data.item.size)}\n`;
      if (data.item?.mimeType) response += `  MIME Type: ${data.item?.mimeType}\n`;
    }

    return {
      content: [
        {
          type: 'text',
          text: response,
        },
      ],
    };
  }

  async getAvailableTags() {
    const data = await this.makeRequest('GET', '/api/listings/tags');

    let response = `Available Tags (${data.length}):\n`;
    if (data.length === 0) {
      response += 'No tags found.';
    } else {
      data.forEach((tag, index) => {
        response += `${index + 1}. ${tag}\n`;
      });
    }

    return {
      content: [
        {
          type: 'text',
          text: response,
        },
      ],
    };
  }

  async searchListings({ query, minPrice, maxPrice, tags, sellerId }) {
    const params = {
      search: query,
      status: 'active',
      sortBy: 'createdAt',
      sortOrder: 'desc',
      limit: 50
    };

    if (tags && tags.length > 0) params.tags = tags.join(',');
    if (sellerId) params.sellerId = sellerId;

    const data = await this.makeRequest('GET', '/api/listings', null, params);

    // Filter by price range if specified
    let filteredListings = data.listings;
    if (minPrice !== undefined || maxPrice !== undefined) {
      filteredListings = data.listings.filter(listing => {
        if (minPrice !== undefined && listing.price < minPrice) return false;
        if (maxPrice !== undefined && listing.price > maxPrice) return false;
        return true;
      });
    }

    let response = `Search Results for "${query}":\n`;
    response += `Found ${filteredListings.length} matching listings\n\n`;

    if (filteredListings.length === 0) {
      response += 'No listings found matching your search criteria.';
    } else {
      filteredListings.forEach((listing, index) => {
        response += `${index + 1}. ${listing.title} - $${listing.price.toFixed(2)}\n`;
        response += `   Seller: ${listing.seller.name}\n`;
        response += `   Views: ${listing.views}\n`;
        if (listing.tags.length > 0) {
          response += `   Tags: ${listing.tags.join(', ')}\n`;
        }
        response += `   ID: ${listing._id}\n\n`;
      });
    }

    return {
      content: [
        {
          type: 'text',
          text: response,
        },
      ],
    };
  }

  // Helper methods
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Cash Drive MCP server running on stdio');
  }
}

const server = new CashDriveMCPServer();
server.run().catch(console.error);