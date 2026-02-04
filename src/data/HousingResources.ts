import axios from 'axios';

const apiKey = import.meta.env.RAPID_API_KEY;

type Location = {
    lat: string;
    long: string;
    rad: string;
}

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


export default async function HousingResources() {
    const position = await getUserLocation();
    const location: Location = {
        lat: position.coords.latitude.toString(),
        long: position.coords.longitude.toString(),
        rad: '1.4'
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
        const response = await axios.request(query);
        return response.data;
    } catch (error) {
        console.error('Error fetching housing resources:', error);
        throw error;
    }

};