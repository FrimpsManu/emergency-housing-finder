// In HousingResources.ts
import axios from 'axios';

const apiKey = import.meta.env.VITE_RAPID_API_KEY;
type Location = {
    lat: string;
    lng: string;
    radius: string;
}

export type Shelter = {
    id: string;
    name: string;
    address: string;
    city: string;
    state: string;
    zip: string;
    phone: string;
    latitude: number;
    longitude: number;
    distance: number;
}

export type HousingResourcesResponse = Shelter[];

function getUserLocation(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) {
      reject(new Error("Geolocation not supported"))
      return
    }

    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
    })
  })
}


export default async function HousingResources(): Promise<HousingResourcesResponse> {
    const position = await getUserLocation();
    const location: Location = {
        lat: position.coords.latitude.toString(),
        lng: position.coords.longitude.toString(),
        radius: '10'
    };

    const query = {
        method:"GET",
        url:"https://homeless-shelter.p.rapidapi.com/location",
        params: location,
        headers:{
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