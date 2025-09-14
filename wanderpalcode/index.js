const { Tool, toolFromFunction } = require('@ibm-generative-ai/model-context-protocol');
const axios = require('axios');

async function searchHotels(q, check_in_date, check_out_date, api_key) {
    try {
        const response = await axios.get('https://serpapi.com/search', {
            params: {
                engine: 'google_hotels',
                q: q,
                check_in_date: check_in_date,
                check_out_date: check_out_date,
                api_key: api_key
            }
        });
        return response.data;
    } catch (error) {
        throw new Error(`Failed to call SerpApi: ${error.message}`);
    }
}

const tool = toolFromFunction(searchHotels);
tool.id = 'search-hotels';

module.exports = tool;