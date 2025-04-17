import * as Astronomy from 'astronomy-engine';
import * as moment from 'moment-timezone';

export interface Location {
    latitude: number;
    longitude: number;
    elevation?: number;
}

export function calculateAyanamsa(date: Date): number {
    const referenceDate = new Date('1950-01-01T00:00:00Z');
    const referenceDegrees = 23.15;
    const annualRate = 50.2388475 / 3600;
    const yearDiff = (date.getTime() - referenceDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
    return referenceDegrees + (annualRate * yearDiff);
}

export function calculateAscendant(dateTime: Date, observer: Astronomy.Observer): number {
    const gst = Astronomy.SiderealTime(dateTime);
    const lst = (gst + (observer.longitude / 15));
    let lstDeg = ((lst * 15) % 360 + 360) % 360;
    const lat = observer.latitude * Math.PI / 180;
    const lstRad = lstDeg * Math.PI / 180;
    const obliquityRad = 23.4367 * Math.PI / 180;
    const sinLst = Math.sin(lstRad);
    const cosLst = Math.cos(lstRad);
    const tanLat = Math.tan(lat);

    let ascendant = Math.atan2(
        cosLst,
        -(sinLst * Math.cos(obliquityRad) + tanLat * Math.sin(obliquityRad))
    );

    ascendant = ascendant * 180 / Math.PI;
    return ((ascendant + 360) % 360);
}

export function calculatePlanetaryPositions(dateTime: Date, location: Location) {
    const ayanamsa = calculateAyanamsa(dateTime);
    const planets: ('Sun' | 'Moon' | 'Mercury' | 'Venus' | 'Mars' | 'Jupiter' | 'Saturn')[] = 
        ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn'];

    const planetaryPositions: Record<string, number> = {};
    const planetaryZodiacSigns: Record<string, string> = {};
    
    // Calculate planetary positions
    for (const planet of planets) {
        const vector = Astronomy.GeoVector(planet as Astronomy.Body, dateTime, true);
        const ecliptic = Astronomy.Ecliptic(vector);
        const position = ((ecliptic.elon - ayanamsa + 360) % 360);
        planetaryPositions[planet] = position;
        planetaryZodiacSigns[planet] = getZodiacSign(position);
    }

    // Calculate Ascendant
    const observer: Astronomy.Observer = {
        latitude: location.latitude,
        longitude: location.longitude,
        height: location.elevation || 0
    };
    
    const ascendantLongitude = calculateAscendant(dateTime, observer);
    const siderealAscendant = ((ascendantLongitude - ayanamsa + 360) % 360);
    planetaryPositions['Ascendant'] = siderealAscendant;
    planetaryZodiacSigns['Ascendant'] = getZodiacSign(siderealAscendant);

    return {
        planetaryPositions,
        planetaryZodiacSigns
    };
}

export function getZodiacSign(position: number): string {
    const zodiacSigns = [
        'Aries', 'Taurus', 'Gemini', 'Cancer', 
        'Leo', 'Virgo', 'Libra', 'Scorpio', 
        'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'
    ];
    const normalizedPosition = ((position % 360) + 360) % 360;
    const signIndex = Math.floor(normalizedPosition / 30);
    return zodiacSigns[signIndex];
}

export function parseDateTime(dob: string, time: string, timezone: string = 'Asia/Colombo'): Date {
    const localDateTime = moment.tz(`${dob} ${time}`, 'YYYY-MM-DD HH:mm', timezone);
    if (!localDateTime.isValid()) {
        throw new Error('Invalid date or time format');
    }
    return new Date(localDateTime.utc().format());
}

export function getRashi(longitude: number): number {
    const normalizedLongitude = ((longitude % 360) + 360) % 360;
    return Math.floor(normalizedLongitude / 30);
}

export function getHouse(longitude: number, ascendantLongitude: number): number {
    const normalizedLongitude = ((longitude % 360) + 360) % 360;
    const normalizedAscendant = ((ascendantLongitude % 360) + 360) % 360;
    let house = Math.floor(((normalizedLongitude - normalizedAscendant + 360) % 360) / 30) + 1;
    return house;
}

export function getHouseFromMoon(moonPosition: number, planetPosition: number): number {
    const houses = Math.floor((planetPosition - moonPosition + 360) / 30) % 12 + 1;
    return houses;
}