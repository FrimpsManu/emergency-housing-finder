import axios from 'axios';

const apiKey = import.meta.env.VITE_RAPID_API_KEY;

type Location = {
    lat: string;
    lng: string;
    radius: string;
}

export type Shelter = {
    name: string;
    address: string;
    city: string;
    state: string;
    zip_code: string;
    location: string; // "lat,lng" format
    phone_number: string;
    email_address: string;
    fax_number: string;
    official_website: string;
    twitter: string;
    facebook: string;
    instagram: string;
    description: string;
    photo_urls: string[];
    update_datetime: string;
}

export type HousingResourcesResponse = Shelter[];

export default async function HousingResources(location: Location): Promise<HousingResourcesResponse> {
    const query = {
        method: "GET",
        url: "https://homeless-shelter.p.rapidapi.com/location",
        params: location,
        headers: {
            'x-rapidapi-key': apiKey,
            'x-rapidapi-host': 'homeless-shelter.p.rapidapi.com'
        }
    };

    try {
        const response = await axios.request<HousingResourcesResponse>(query);
        return response.data;
    } catch (error) {
        console.error('Error fetching housing resources:', error);
        throw error;
    }
}