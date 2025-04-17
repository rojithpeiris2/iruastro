import * as Astronomy from 'astronomy-engine';
import * as moment from 'moment-timezone';

export type PlanetName = 'Sun' | 'Moon' | 'Mars' | 'Mercury' | 'Jupiter' | 'Venus' | 'Saturn';


// Zodiac constants
export const RASHI_LENGTH = 30;
export const TOTAL_RASHIS = 12;

// House categories
export const KENDRAS = [1, 4, 7, 10];
export const TRIKONAS = [1, 5, 9];
export const DUSTHANAS = [6, 8, 12];


// Planetary dignity data
export const OWN_SIGNS: Partial<Record<PlanetName, readonly string[]>> = {
    'Mars': ['Aries', 'Scorpio'],
    'Mercury': ['Gemini', 'Virgo'],
    'Jupiter': ['Sagittarius', 'Pisces'],
    'Venus': ['Taurus', 'Libra'],
    'Saturn': ['Capricorn', 'Aquarius'],
    'Sun': ['Leo'],
    'Moon': ['Cancer']
} as const;

export const EXALTATION_SIGNS: Record<PlanetName, string> = {
    'Sun': 'Aries',
    'Moon': 'Taurus',
    'Mars': 'Capricorn',
    'Mercury': 'Virgo',
    'Jupiter': 'Cancer',
    'Venus': 'Pisces',
    'Saturn': 'Libra'
};

export const BENEFICS = ['Jupiter', 'Venus', 'Mercury', 'Moon'];

export function getRashi(longitude: number): number {
    const normalizedLongitude = ((longitude % 360) + 360) % 360;
    return Math.floor(normalizedLongitude / 30);
}

export function getHouse(longitude: number, ascendantLongitude: number): number {
    // Normalize both longitudes
    const normalizedLongitude = ((longitude % 360) + 360) % 360;
    const normalizedAscendant = ((ascendantLongitude % 360) + 360) % 360;
    
    // Calculate house by finding the distance from the ascendant
    let house = Math.floor(((normalizedLongitude - normalizedAscendant + 360) % 360) / 30) + 1;
    return house;
}

export function isInKendra(longitude: number, ascendantLongitude: number): boolean {
    const house = Math.floor(((longitude - ascendantLongitude + 360) % 360) / 30) + 1;
    return KENDRAS.includes(house);
}

export function isInTrikona(position: number): boolean {
    const house = Math.floor(position / RASHI_LENGTH) + 1;
    return TRIKONAS.includes(house);
}

export function isInOwnSign(planet: PlanetName, position: number): boolean {
    const rashi = Math.floor(((position % 360) + 360) % 360 / 30);
    const rashiName = [
        'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
        'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'
    ][rashi];
    const planetSigns = OWN_SIGNS[planet];
    return planetSigns ? planetSigns.includes(rashiName) : false;
}

export function isInExaltation(planet: PlanetName, position: number): boolean {
    const rashi = Math.floor(((position % 360) + 360) % 360 / 30);
    const rashiName = [
        'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
        'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'
    ][rashi];
    return EXALTATION_SIGNS[planet] === rashiName;
}

export function getHouseFromMoon(moonPosition: number, planetPosition: number): number {
    const houses = Math.floor((planetPosition - moonPosition + 360) / RASHI_LENGTH) % TOTAL_RASHIS + 1;
    return houses;
}

export function calculateAyanamsa(date: Date): number {
    const referenceDate = new Date('1950-01-01T00:00:00Z');
    const referenceDegrees = 23.15;
    const annualRate = 50.2388475 / 3600;
    const yearDiff = (date.getTime() - referenceDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
    return referenceDegrees + (annualRate * yearDiff);
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

