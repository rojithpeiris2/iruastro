/**
 * Planetary Transit Calculator
 * Calculates planetary transits and aspects for a given date range without birth chart dependencies
 * @author: Rojith Peiris
 * @date: 2024-04-16
 * @version: 1.0.0
 */
import { Handler } from '@netlify/functions';
import * as Astronomy from 'astronomy-engine';
import moment from 'moment-timezone';
import 'dotenv/config';

interface TransitRequest {
    startDate: string;
    endDate: string;
    location: {
        latitude: number;
        longitude: number;
        elevation?: number;
        timezone?: string;  // Added timezone parameter
    };
    language?: 'en' | 'si';
    planets?: string[];
}

interface TransitEvent {
    planet: string;
    eventType: 'ingress' | 'aspect' | 'retrograde' | 'direct';
    date: string;
    degree: number;
    rashi: string;
    aspect?: {
        type: string;
        planet: string;
        degree: number;
    };
    isRetrograde?: boolean;
}

interface TransitResponse {
    message: string;
    transits: TransitEvent[];
}

type AspectType = 'conjunction' | 'opposition' | 'trine' | 'square' | 'sextile';

const translations = {
    en: {
        rashis: [
            'Mesha', 'Vrushamba', 'Mithuna', 'Kataka',
            'Sinha', 'Kanya', 'Tula', 'Vrushchika',
            'Dhanu', 'Makara', 'Kumbha', 'Meena'
        ],
        aspects: {
            'conjunction': 'Conjunction',
            'opposition': 'Opposition',
            'trine': 'Trine',
            'square': 'Square',
            'sextile': 'Sextile'
        },
        messages: {
            success: 'Transits calculated successfully'
        }
    },
    si: {
        rashis: [
            'මේෂ', 'වෘෂභ', 'මිථුන', 'කටක',
            'සිංහ', 'කන්‍යා', 'තුලා', 'වෘශ්චික',
            'ධනු', 'මකර', 'කුම්භ', 'මීන'
        ],
        aspects: {
            'conjunction': 'යුති',
            'opposition': 'අෂ්ටම',
            'trine': 'ත්‍රිකෝණ',
            'square': 'චතුරස්‍ර',
            'sextile': 'ෂඩෂ්ටක'
        },
        messages: {
            success: 'සංක්‍රාන්ති ගණනය කර ඇත'
        }
    }
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

function getRashi(eclipticLongitude: number, ayanamsa: number, language: string = 'en'): string {
    const siderealLong = ((eclipticLongitude % 360) + 360) % 360;
    const rashiIndex = Math.floor(siderealLong / 30);
    return getRashiName(rashiIndex, language);
}

function calculatePlanetaryPosition(planet: string, dateTime: Date, ayanamsa: number): {
    longitude: number;
    siderealLongitude: number;
} {
    const vector = Astronomy.GeoVector(planet as Astronomy.Body, dateTime, true);
    const ecliptic = Astronomy.Ecliptic(vector);
    const normalizedLong = ((ecliptic.elon % 360) + 360) % 360;
    const siderealLong = ((normalizedLong - ayanamsa + 360) % 360);
    
    return {
        longitude: normalizedLong,
        siderealLongitude: siderealLong
    };
}

function checkAspect(deg1: number, deg2: number): AspectType | null {
    const angle = Math.abs(deg1 - deg2);
    const orb = 8; // Allowing 8 degree orb for aspects

    if (Math.abs(angle) < orb || Math.abs(angle - 360) < orb) return 'conjunction';
    if (Math.abs(angle - 180) < orb) return 'opposition';
    if (Math.abs(angle - 120) < orb) return 'trine';
    if (Math.abs(angle - 90) < orb) return 'square';
    if (Math.abs(angle - 60) < orb) return 'sextile';
    
    return null;
}

function validateToken(event: any): boolean {
    const authHeader = event.headers.authorization || event.headers.Authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return false;
    }
    const token = authHeader.split(' ')[1];
    return token === process.env.IRUASTRO_ACCESS_TOKEN;
}

function findPreciseTransitTime(planet: string, startTime: Date, endTime: Date, ayanamsa: number): Date | null {
    const iterations = 48; // Check every 15 minutes (24 hours * 4)
    let currentTime = new Date(startTime);
    const timeStep = (endTime.getTime() - startTime.getTime()) / iterations;

    let prevRashi = -1;
    let prevSiderealLong = -1;
    
    for (let i = 0; i <= iterations; i++) {
        const position = calculatePlanetaryPosition(planet, currentTime, ayanamsa);
        const siderealLong = position.siderealLongitude;
        const currentRashi = Math.floor(siderealLong / 30);

        if (prevRashi !== -1 && currentRashi !== prevRashi) {
            // Found transition point, now refine to second precision
            const refinedStart = new Date(currentTime.getTime() - timeStep);
            const refinedEnd = currentTime;
            
            // Binary search for more precise time with interpolation
            let left = refinedStart.getTime();
            let right = refinedEnd.getTime();
            
            while (right - left > 1000) { // 1 second precision
                const mid = new Date((left + right) / 2);
                const midPosition = calculatePlanetaryPosition(planet, mid, ayanamsa);
                const midRashi = Math.floor(midPosition.siderealLongitude / 30);
                
                // Use interpolation to get even more precise position
                const ratio = (30 - (prevSiderealLong % 30)) / ((midPosition.siderealLongitude % 30) - (prevSiderealLong % 30));
                const interpolatedTime = new Date(refinedStart.getTime() + (mid.getTime() - refinedStart.getTime()) * ratio);
                const interpolatedPosition = calculatePlanetaryPosition(planet, interpolatedTime, ayanamsa);
                
                if (Math.floor(interpolatedPosition.siderealLongitude / 30) === prevRashi) {
                    left = mid.getTime();
                    prevSiderealLong = interpolatedPosition.siderealLongitude;
                } else {
                    right = mid.getTime();
                }
            }
            
            // Final verification and fine-tuning
            const finalTime = new Date(right);
            const finalPosition = calculatePlanetaryPosition(planet, finalTime, ayanamsa);
            
            // Additional check to ensure we're at exact transition point (0 degrees of new sign)
            const degrees = finalPosition.siderealLongitude % 30;
            if (degrees > 29.99 || degrees < 0.01) {
                return finalTime;
            } else {
                // Fine-tune to get closer to exact 0 degrees
                const adjustment = degrees < 15 ? -degrees : (30 - degrees);
                const adjustedTime = new Date(finalTime.getTime() + (adjustment / (30 / timeStep)));
                return adjustedTime;
            }
        }

        prevRashi = currentRashi;
        prevSiderealLong = siderealLong;
        currentTime = new Date(currentTime.getTime() + timeStep);
    }

    return null;
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
        const { startDate, endDate, location, language = 'en', planets = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'] }: TransitRequest = JSON.parse(event.body);

        const errors: string[] = [];
        if (!startDate) errors.push('startDate is required');
        if (!endDate) errors.push('endDate is required');
        if (!location || typeof location.latitude !== 'number' || typeof location.longitude !== 'number') {
            errors.push('Valid location with latitude and longitude is required');
        }

        // Default to the timezone based on longitude if not provided
        const timezone = location.timezone || moment.tz.guess();
        
        if (!moment.tz.zone(timezone)) {
            errors.push('Invalid timezone provided');
        }

        if (errors.length > 0) {
            return {
                statusCode: 400,
                body: JSON.stringify({ message: 'Validation errors', errors }),
            };
        }

        // Convert dates to the specified timezone
        const startDateTime = moment.tz(startDate, timezone).toDate();
        const endDateTime = moment.tz(endDate, timezone).toDate();
        
        if (!startDateTime || !endDateTime || startDateTime >= endDateTime) {
            throw new Error('Invalid date range');
        }

        const observer: Astronomy.Observer = {
            latitude: location.latitude,
            longitude: location.longitude,
            height: location.elevation || 0
        };

        const transits: TransitEvent[] = [];
        const ayanamsa = calculateAyanamsa(startDateTime);

        // Calculate daily positions and check for transits
        let currentMoment = moment.tz(startDateTime, timezone);
        const endMoment = moment.tz(endDateTime, timezone);

        while (currentMoment.isSameOrBefore(endMoment)) {
            const dateTime = currentMoment.toDate();
            const nextDay = currentMoment.clone().add(1, 'day').toDate();

            // Calculate positions for current and next day
            const currentPositions: Record<string, { longitude: number; siderealLongitude: number }> = {};
            const nextDayPositions: Record<string, { longitude: number; siderealLongitude: number }> = {};
            
            for (const planet of planets) {
                // Get current position
                currentPositions[planet] = calculatePlanetaryPosition(planet, dateTime, ayanamsa);

                // Get next day position
                nextDayPositions[planet] = calculatePlanetaryPosition(planet, nextDay, ayanamsa);

                // Check for rashi changes (sign transitions)
                const currentRashi = getRashi(currentPositions[planet].siderealLongitude, ayanamsa, language);
                const nextRashi = getRashi(nextDayPositions[planet].siderealLongitude, ayanamsa, language);

                if (currentRashi !== nextRashi) {
                    const preciseTime = findPreciseTransitTime(planet, dateTime, nextDay, ayanamsa);
                    if (preciseTime) {
                        const precisePosition = calculatePlanetaryPosition(planet, preciseTime, ayanamsa);
                        transits.push({
                            planet,
                            eventType: 'ingress',
                            date: moment.tz(preciseTime, timezone).format(),  // Format in correct timezone
                            degree: precisePosition.siderealLongitude,
                            rashi: nextRashi
                        });
                    }
                }

                // Check retrograde status for all planets except Sun and Moon
                if (planet !== 'Sun' && planet !== 'Moon') {
                    // Calculate daily motion
                    let dailyMotion = nextDayPositions[planet].siderealLongitude - currentPositions[planet].siderealLongitude;
                    if (dailyMotion > 180) dailyMotion -= 360;
                    if (dailyMotion < -180) dailyMotion += 360;
                    
                    const isRetrograde = dailyMotion < 0;

                    // Get previous day's position to detect station points
                    const prevDay = currentMoment.clone().subtract(1, 'day').toDate();
                    const prevPosition = calculatePlanetaryPosition(planet, prevDay, ayanamsa).siderealLongitude;
                    
                    let prevDailyMotion = currentPositions[planet].siderealLongitude - prevPosition;
                    if (prevDailyMotion > 180) prevDailyMotion -= 360;
                    if (prevDailyMotion < -180) prevDailyMotion += 360;
                    
                    const wasRetrograde = prevDailyMotion < 0;

                    // Detect station points (direction changes)
                    if (isRetrograde !== wasRetrograde) {
                        transits.push({
                            planet,
                            eventType: isRetrograde ? 'retrograde' : 'direct',
                            date: currentMoment.tz(timezone).format(),  // Format in correct timezone
                            degree: currentPositions[planet].siderealLongitude,
                            rashi: currentRashi,
                            isRetrograde
                        });
                    }
                }
            }

            // Check for aspects between planets
            for (let i = 0; i < planets.length; i++) {
                for (let j = i + 1; j < planets.length; j++) {
                    const planet1 = planets[i];
                    const planet2 = planets[j];
                    
                    const currentAspect = checkAspect(currentPositions[planet1].siderealLongitude, currentPositions[planet2].siderealLongitude);
                    const nextAspect = checkAspect(nextDayPositions[planet1].siderealLongitude, nextDayPositions[planet2].siderealLongitude);
                    
                    // Only record when aspects form or break
                    if (currentAspect !== nextAspect && currentAspect) {
                        const lang = language === 'si' ? 'si' : 'en';
                        transits.push({
                            planet: planet1,
                            eventType: 'aspect',
                            date: currentMoment.tz(timezone).format(),  // Format in correct timezone
                            degree: currentPositions[planet1].siderealLongitude,
                            rashi: getRashi(currentPositions[planet1].siderealLongitude, ayanamsa, language),
                            aspect: {
                                type: translations[lang].aspects[currentAspect],
                                planet: planet2,
                                degree: currentPositions[planet2].siderealLongitude
                            }
                        });
                    }
                }
            }

            currentMoment = currentMoment.add(1, 'day');
        }

        // Sort transits by date
        transits.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: translations[language === 'si' ? 'si' : 'en'].messages.success,
                transits
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
}