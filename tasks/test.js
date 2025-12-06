import axios from 'axios';

async function fetchData(url) {
    try {
        const response = await axios.get(url);
        return response;
    } catch (error) {
        throw new Error(`Error fetching data from ${url}: ${error}`);
    }
}