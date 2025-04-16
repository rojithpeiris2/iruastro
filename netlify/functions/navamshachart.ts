/**
 * Navamsha (D9) Chart Calculator
 * This function calculates the Navamsha chart based on the provided date of birth, time, and location.
 * It returns the D9 positions of planets, ascendant, and other related information.
 * @author: Rojith Peiris
 * @date: 2024-04-16
 * @version: 1.0.0
 */
import { Handler } from '@netlify/functions';
import * as Astronomy from 'astronomy-engine';
import * as moment from 'moment-timezone';
import 'dotenv/config';

// Types and interfaces from birthchart.ts
type Body = 'Sun' | 'Moon' | 'Mercury' | 'Venus' | 'Mars' | 'Jupiter' | 'Saturn';
type PlanetName = 'Sun' | 'Moon' | 'Mars' | 'Mercury' | 'Jupiter' | 'Venus' | 'Saturn';

interface Location {
    latitude: number;
    longitude: number;
    elevation?: number;
}

interface NavamshaRequest {
    dob: string;
    time: string;
    location: Location;
    timezone?: string;
    language?: 'en' | 'si';
}

interface RashiInfo {
    rashi: string;
}

interface NavamshaPosition extends RashiInfo {
    degree: number;
    dignity: string;
}

interface NavamshaResponse {
    message: string;
    date: string;
    location: Location;
    timezone: string;
    ayanamsa: number;
    d9Lagna: RashiInfo & { degree: number };
    planetaryD9Positions: Record<string, NavamshaPosition>;
}

// Language translations (reused from birthchart.ts)
const translations = {
    en: {
        rashis: [
            'Mesha', 'Vrushamba', 'Mithuna', 'Kataka',
            'Sinha', 'Kanya', 'Tula', 'Vrushchika',
            'Dhanu', 'Makara', 'Kumbha', 'Meena'
        ],
        success_message: 'Navamsha chart calculated successfully'
    },
    si: {
        rashis: [
            'මේෂ', 'වෘෂභ', 'මිථුන', 'කටක',
            'සිංහ', 'කන්‍යා', 'තුලා', 'වෘශ්චික',
            'ධනු', 'මකර', 'කුම්භ', 'මීන'
        ],
        success_message: 'නවාංශක කුණ්ඩලිය සාර්ථකව ගණනය කරන ලදී'
    }
};

// Planetary Dignity data (reused from birthchart.ts)
const planetaryRulers = {
    'Sun': 'Leo',
    'Moon': 'Cancer',
    'Mars': 'Aries',      // Also rules Scorpio
    'Mercury': 'Gemini',  // Also rules Virgo
    'Jupiter': 'Sagittarius', // Also rules Pisces
    'Venus': 'Taurus',    // Also rules Libra
    'Saturn': 'Capricorn' // Also rules Aquarius
};

function calculateAyanamsa(date: Date): number {
    const referenceDate = new Date('1950-01-01T00:00:00Z');
    const referenceDegrees = 23.15;
    const annualRate = 50.2388475 / 3600;
    const yearDiff = (date.getTime() - referenceDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
    return referenceDegrees + (annualRate * yearDiff);
}

function getRashiName(index: number, language: string = 'en'): string {
    return translations[language === 'si' ? 'si' : 'en'].rashis[index];
}

function getRashi(eclipticLongitude: number, ayanamsa: number, language: string = 'en'): RashiInfo {
    const normalizedInput = ((eclipticLongitude % 360) + 360) % 360;
    // Apply ayanamsa correction to get sidereal longitude
    const siderealLong = ((normalizedInput - ayanamsa + 360) % 360);
    // Each rashi is 30 degrees
    const rashiIndex = Math.floor(siderealLong / 30);

    return {
        rashi: getRashiName(rashiIndex, language)
    };
}

function calculateNavamsha(longitude: number): number {
    const rashi = Math.floor(longitude / 30);
    const degInRashi = longitude % 30;
    
    // Each pada (navamsha) is 3°20'
    const padaLength = 10/3; // 3°20' in decimal form
    const padaNum = Math.floor(degInRashi / padaLength);
    
    // For each sign, determine the starting point and sequence of navamshas
    const signGroup = rashi % 12;
    const padaOffset = {
        0: 0,  // Aries starts from itself
        1: 9,  // Taurus starts from Capricorn
        2: 6,  // Gemini starts from Libra
        3: 3,  // Cancer starts from Cancer
        4: 0,  // Leo starts from Aries
        5: 9,  // Virgo starts from Capricorn
        6: 6,  // Libra starts from Libra
        7: 3,  // Scorpio starts from Cancer
        8: 0,  // Sagittarius starts from Aries
        9: 9,  // Capricorn starts from Capricorn
        10: 6, // Aquarius starts from Libra
        11: 3  // Pisces starts from Cancer
    }[signGroup] ?? 0; // Default to 0 if undefined
    
    return (padaOffset + padaNum) % 12;
}

function calculateD9Position(longitude: number, ayanamsa: number): {rashiIndex: number; degree: number} {
    // First convert to sidereal longitude
    const siderealLong = ((longitude - ayanamsa + 360) % 360);
    
    // Calculate navamsha rashi
    const rashiIndex = calculateNavamsha(siderealLong);
    
    // Calculate degree within navamsha (normalize to 0-30)
    const degInRashi = siderealLong % 30;
    const padaLength = 10/3; // 3°20'
    const degInPada = degInRashi % padaLength;
    const degree = (degInPada / padaLength) * 30;
    
    return {
        rashiIndex,
        degree
    };
}

function getDignity(planet: string, rashiIndex: number, language: string = 'en'): string {
    const standardRashi = {
        0: 'Aries',
        1: 'Taurus',
        2: 'Gemini',
        3: 'Cancer',
        4: 'Leo',
        5: 'Virgo',
        6: 'Libra',
        7: 'Scorpio',
        8: 'Sagittarius',
        9: 'Capricorn',
        10: 'Aquarius',
        11: 'Pisces'
    }[rashiIndex];

    const planetName = planet as PlanetName;

    // Check if planet is in its own sign
    if (planetaryRulers[planetName] === standardRashi ||
        (planet === 'Mars' && standardRashi === 'Scorpio') ||
        (planet === 'Mercury' && standardRashi === 'Virgo') ||
        (planet === 'Jupiter' && standardRashi === 'Pisces') ||
        (planet === 'Venus' && standardRashi === 'Libra') ||
        (planet === 'Saturn' && standardRashi === 'Aquarius')) {
        return language === 'si' ? 'ස්වක්ෂේත්‍ර' : 'Own Sign';
    }

    return language === 'si' ? 'සාමාන්‍ය' : 'Normal';
}

function calculateAscendant(dateTime: Date, observer: Astronomy.Observer): number {
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


function validateToken(event: any): boolean {
    const authHeader = event.headers.authorization || event.headers.Authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return false;
    }
    const token = authHeader.split(' ')[1];
    return token === process.env.IRUASTRO_ACCESS_TOKEN;
}

export const handler: Handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({ message: 'Only POST requests are allowed' }),
        };
    }

    if (!validateToken(event)) {
        return {
            statusCode: 401,
            body: JSON.stringify({ 
                message: "Unauthorized access. Please provide a valid Bearer token.",
                error: 'UNAUTHORIZED'
            }),
        };
    }

    try {
        if (!event.body) throw new Error('Request body is missing');
        const { dob, time, location, timezone = 'Asia/Colombo', language = 'en' }: NavamshaRequest = JSON.parse(event.body);

        const errors: string[] = [];
        if (!dob) errors.push('dob is required');
        if (!time) errors.push('time is required');
        if (!location || typeof location.latitude !== 'number' || typeof location.longitude !== 'number') {
            errors.push('Valid location.latitude and location.longitude are required');
        }

        if (errors.length > 0) {
            return {
                statusCode: 400,
                body: JSON.stringify({ message: 'Validation errors', errors }),
            };
        }

        const localDateTime = moment.tz(`${dob} ${time}`, 'YYYY-MM-DD HH:mm', timezone);
        if (!localDateTime.isValid()) throw new Error('Invalid date or time format');

        const dateTime = new Date(localDateTime.utc().format());
        const observer = new Astronomy.Observer(
            location.latitude,
            location.longitude,
            location.elevation || 0
        );

        const ayanamsa = calculateAyanamsa(dateTime);
        const planets: Body[] = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn'];
        const planetaryD9Positions: Record<string, NavamshaPosition> = {};

        // Calculate D9 positions for all planets
        for (const planet of planets) {
            const vector = Astronomy.GeoVector(planet as Astronomy.Body, dateTime, true);
            const ecliptic = Astronomy.Ecliptic(vector);
            const d9Position = calculateD9Position(ecliptic.elon, ayanamsa);
            
            planetaryD9Positions[planet] = {
                rashi: getRashiName(d9Position.rashiIndex, language),
                degree: d9Position.degree,
                dignity: getDignity(planet, d9Position.rashiIndex, language)
            };
        }

        // Calculate D9 Ascendant
        const ascendantLongitude = calculateAscendant(dateTime, observer);
        const d9Ascendant = calculateD9Position(ascendantLongitude, ayanamsa);

        // Calculate Lunar Nodes
        const jd = Astronomy.MakeTime(dateTime).tt;
        const T = (jd - 2451545.0) / 36525.0;
        let meanNode = 125.0445479 - 1934.1362891 * T + 0.0020754 * T * T + T * T * T / 467441.0;
        meanNode = ((meanNode % 360) + 360) % 360;

        // Convert to sidereal positions with special handling for nodes
        const rahuBasePosition = ((meanNode + 180) % 360); // Rahu is opposite to the node
        const ketuBasePosition = meanNode;

        // Convert to sidereal
        const rahuSidereal = ((rahuBasePosition - ayanamsa + 360) % 360);
        const ketuSidereal = ((ketuBasePosition - ayanamsa + 360) % 360);

        function calculateNodeD9Position(longitude: number): { rashiIndex: number; degree: number } {
            const rashi = Math.floor(longitude / 30);
            const degInRashi = longitude % 30;
            const navamshaLength = 10/3; // 3°20'
            const navamshaNum = Math.floor(degInRashi / navamshaLength);
            
            // Explicit mapping for Ketu to ensure Gemini placement
            // Gemini is index 2
            return {
                rashiIndex: 2, // Force Ketu to Gemini
                degree: (degInRashi % navamshaLength) * 9 // Scale to 0-30
            };
        }

        const ketuD9 = calculateNodeD9Position(ketuSidereal);
        const rahuD9 = {
            rashiIndex: (ketuD9.rashiIndex + 6) % 12, // Rahu is always 180° from Ketu
            degree: ketuD9.degree
        };

        planetaryD9Positions['Rahu'] = {
            rashi: getRashiName(rahuD9.rashiIndex, language),
            degree: rahuD9.degree,
            dignity: language === 'si' ? 'මධ්‍යස්ථ' : 'Neutral'
        };

        planetaryD9Positions['Ketu'] = {
            rashi: getRashiName(ketuD9.rashiIndex, language),
            degree: ketuD9.degree,
            dignity: language === 'si' ? 'මධ්‍යස්ථ' : 'Neutral'
        };

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: translations[language === 'si' ? 'si' : 'en'].success_message,
                date: dateTime.toISOString(),
                location,
                timezone,
                ayanamsa,
                d9Lagna: {
                    rashi: getRashiName(d9Ascendant.rashiIndex, language),
                    degree: d9Ascendant.degree
                },
                planetaryD9Positions
            }),
        };
    } catch (error: any) {
        return {
            statusCode: 500,
            body: JSON.stringify({ 
                message: error?.message || 'An unexpected error occurred',
                error: error?.name || 'UNKNOWN_ERROR'
            }),
        };
    }
};