import { Handler } from '@netlify/functions';
import * as Astronomy from 'astronomy-engine';
import moment from 'moment-timezone';
import 'dotenv/config';

interface Location {
    latitude: number;
    longitude: number;
    elevation?: number;
}

interface DashaRequest {
    dob: string;
    time: string;
    location: Location;
    timezone?: string;
    language?: 'en' | 'si';
}

interface DashaPeriod {
    planet: string;
    startDate: string;
    endDate: string;
    antardasha?: DashaPeriod[];
}

interface DashaResponse {
    message: string;
    mainDasha: DashaPeriod[];
}

type PlanetName = 'Ketu' | 'Venus' | 'Sun' | 'Moon' | 'Mars' | 'Rahu' | 'Jupiter' | 'Saturn' | 'Mercury';

// Vimshottari Dasha periods in years
const dashaPeriods: Record<PlanetName, number> = {
    'Ketu': 7,
    'Venus': 20,
    'Sun': 6,
    'Moon': 10,
    'Mars': 7,
    'Rahu': 18,
    'Jupiter': 16,
    'Saturn': 19,
    'Mercury': 17
};

// Planet sequence in Vimshottari Dasha
const planetSequence: PlanetName[] = [
    'Ketu', 'Venus', 'Sun', 'Moon', 'Mars',
    'Rahu', 'Jupiter', 'Saturn', 'Mercury'
];

function calculateAyanamsa(date: Date): number {
    const referenceDate = new Date('1950-01-01T00:00:00Z');
    const referenceDegrees = 23.15;
    const annualRate = 50.2388475 / 3600;
    const yearDiff = (date.getTime() - referenceDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
    return referenceDegrees + (annualRate * yearDiff);
}

function getNakshatraLord(deg: number): PlanetName {
    const nakshatra = Math.floor(deg * 27 / 360);
    const lords: PlanetName[] = [
        'Ketu', 'Venus', 'Sun', 'Moon', 'Mars',
        'Rahu', 'Jupiter', 'Saturn', 'Mercury',
        'Ketu', 'Venus', 'Sun', 'Moon', 'Mars',
        'Rahu', 'Jupiter', 'Saturn', 'Mercury',
        'Ketu', 'Venus', 'Sun', 'Moon', 'Mars',
        'Rahu', 'Jupiter', 'Saturn', 'Mercury'
    ];
    return lords[nakshatra];
}

function calculateDashaPeriods(birthDate: Date, moonDegree: number): DashaPeriod[] {
    const birthMoment = moment.utc(birthDate);
    const totalCycle = 120; // Total years in Vimshottari Dasha cycle
    
    // Calculate the consumed portion of the current dasha
    const nakshatra = Math.floor(moonDegree * 27 / 360);
    const progressInNakshatra = (moonDegree * 27 / 360) % 1;
    const currentLord = getNakshatraLord(moonDegree);
    
    // Find start index in sequence
    const startIndex = planetSequence.indexOf(currentLord);
    const dashas: DashaPeriod[] = [];
    
    // Calculate remaining portion of current dasha
    let currentDate = birthMoment.clone();
    const remainingYears = dashaPeriods[currentLord] * (1 - progressInNakshatra);
    
    // Generate all dasha periods
    for (let i = 0; i < 9; i++) {
        const planetIndex = (startIndex + i) % 9;
        const planet = planetSequence[planetIndex];
        const periodYears = i === 0 ? remainingYears : dashaPeriods[planet];
        
        const startDate = currentDate.clone();
        const endDate = currentDate.clone().add(periodYears, 'years');
        
        dashas.push({
            planet,
            startDate: startDate.format('YYYY-MM-DD'),
            endDate: endDate.format('YYYY-MM-DD'),
            antardasha: calculateAntarDasha(startDate.toDate(), endDate.toDate(), planet)
        });
        
        currentDate = endDate;
    }
    
    return dashas;
}

function calculateAntarDasha(startDate: Date, endDate: Date, mahadashaLord: PlanetName): DashaPeriod[] {
    const startMoment = moment.utc(startDate);
    const totalPeriod = moment.utc(endDate).diff(startMoment, 'years', true);
    const antardasha: DashaPeriod[] = [];
    
    // Start from the Mahadasha lord in the sequence
    const startIndex = planetSequence.indexOf(mahadashaLord);
    let currentDate = startMoment.clone();
    
    for (let i = 0; i < 9; i++) {
        const planetIndex = (startIndex + i) % 9;
        const planet = planetSequence[planetIndex];
        const periodYears = (dashaPeriods[planet] / 120) * totalPeriod;
        
        const antarStartDate = currentDate.clone();
        const antarEndDate = currentDate.clone().add(periodYears, 'years');
        
        antardasha.push({
            planet,
            startDate: antarStartDate.format('YYYY-MM-DD'),
            endDate: antarEndDate.format('YYYY-MM-DD')
        });
        
        currentDate = antarEndDate;
    }
    
    return antardasha;
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
        const { dob, time, location, timezone = 'Asia/Colombo', language = 'en' }: DashaRequest = JSON.parse(event.body);

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
        
        // Calculate Moon's position
        const moonVector = Astronomy.GeoVector('Moon' as Astronomy.Body, dateTime, true);
        const moonEcliptic = Astronomy.Ecliptic(moonVector);
        const ayanamsa = calculateAyanamsa(dateTime);
        const moonSiderealLong = ((moonEcliptic.elon - ayanamsa + 360) % 360);

        // Calculate Vimshottari Dasha periods
        const dashaPeriods = calculateDashaPeriods(dateTime, moonSiderealLong);

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: language === 'si' ? 'දශා ගණනය සාර්ථකයි' : 'Dasha periods calculated successfully',
                mainDasha: dashaPeriods
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
